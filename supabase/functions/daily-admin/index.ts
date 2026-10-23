// Editor of the daily tier lists (share-site/editeur-listes.html), admin only: every
// request carries a key whose SHA-256 is in private.admin_tokens (header x-admin-secret).
//   { action: "list", from, to } -> { days: [...], icons: { concept: url }, wishlist: [concept] }
//   { action: "save", day, list, translations } -> { ok }   (list: title, emoji, description, items, concepts, cover, regions, vote_regions)
//   { action: "delete", day } -> { ok }
//   { action: "move", from, to } -> { ok }   (swaps the two days when `to` already has a list)
//   { action: "generate", theme, count } -> { title, emoji, description, cover, cards: [{ label, emoji, concept }] }
//   { action: "cards", theme, count, existing } -> { cards: [{ label, emoji, concept }] }
//   { action: "concepts", theme, labels } -> { concepts }
//   { action: "translate", title, description, items } -> { en, es, el }   (items without their emoji)
//   { action: "ideas", count } -> { ideas: [{ title, emoji, description }] }
//   { action: "draw", theme, cards: [{ label, concept }] } -> { icons: { concept: url } }
//   { action: "check" } -> { styleRef }   (SHA-256 of the style picture, to check a deploy)
// A list with votes keeps its cards (votes are stored by position): only its texts,
// concepts and translations can change. Generations aren't charged: their cost goes to
// ai_costs with 0 credits, like the library redraws.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

import { normalizeConcept, uniqueConcepts } from "../ai-generate/concepts.ts";
import { addClaude, type CostKind, costRow, type Meter, newMeter } from "../ai-generate/costs.ts";
import { drawSheet, SheetError } from "../ai-generate/iconSheet.ts";
import { drawWithFallback, fillSheet } from "../ai-generate/sheet.ts";
import { STYLE_REF } from "../ai-generate/style-ref.ts";
import { cleanList, cleanTranslations, isDay, LANGS, sameItems, splitLabel } from "./lists.ts";

// The daily list is everyone's list of the day: the best model, a few requests a week.
const MODEL = "claude-opus-5-5";
const MAX_BODY = 64 * 1024;

const anthropic = new Anthropic(); // ANTHROPIC_API_KEY, an Edge Function secret
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info, x-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/** A refusal the editor shows as is. */
class Refused extends Error {}

/** One request with a JSON answer; its cost is written to ai_costs. */
async function ask(kind: CostKind, effort: string, system: string, user: string, schema: object, maxTokens: number) {
  const meter = newMeter();
  let ok = false;
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort, format: { type: "json_schema", schema } },
    } as never);
    addClaude(meter, (response as { model?: string }).model ?? MODEL, response.usage);
    if (response.stop_reason === "refusal") throw new Refused("L'IA a refusé ce thème.");
    const text = response.content.find((b: { type: string }) => b.type === "text") as { text: string } | undefined;
    if (!text) throw new Error("empty answer");
    const out = JSON.parse(text.text);
    ok = true;
    return out;
  } finally {
    await logCost(kind, meter, ok);
  }
}

async function logCost(kind: CostKind, meter: Meter, ok: boolean) {
  if (!meter.calls) return;
  const { error } = await db.from("ai_costs").insert(costRow(kind, meter, 0, ok));
  if (error) console.error("ai_costs", error.message);
}

const CARD = {
  type: "object",
  properties: { label: { type: "string" }, emoji: { type: "string" }, concept: { type: "string" } },
  required: ["label", "emoji", "concept"],
  additionalProperties: false,
};

const CARD_RULES = `Les cartes :
- en français, courtes (1 à 3 mots, 24 caractères maximum), sans article ni numérotation, avec la majuscule initiale ;
- toutes du thème, connues du grand public en France, assez variées pour que le classement fasse débat ;
- réparties sur toute l'échelle, du S au D : environ un quart de choix évidents pour le haut, la moitié de choix moyens ou discutables, et un quart de choix nettement faibles, décevants ou pénibles, mais reconnaissables ;
- sans doublon entre elles ni avec les cartes déjà présentes.
Pour chaque carte, donne un emoji qui la représente au mieux, et un « concept » : un nom anglais simple en kebab-case, au singulier (ex. "pizza", "hiking-boot"), désignant l'objet à dessiner comme icône. Une idée difficile à dessiner prend un objet qui la symbolise (« Grasse matinée » -> "bed") ; une personne réelle connue, son buste : "bust-" suivi de son prénom et de son nom ; une marque ou une œuvre, un objet générique évocateur, jamais un logo ; une couleur, une tache de peinture de la teinte ("khaki-paint-splash"). Un mot à plusieurs sens se lit dans le sens du thème et son concept le dit sans ambiguïté (« Orange » -> "orange-fruit" ou "orange-paint-splash"). Le concept est assez précis pour distinguer la carte des autres de la liste (« camembert-box » plutôt que « cheese » dans une liste de fromages). Si un concept de la bibliothèque déjà dessinée désigne exactement le même objet, reprends-le tel quel : son image existe déjà. Deux cartes n'ont jamais le même concept.`;

const STYLE = `La tier list du jour de l'application Tiercraft : chaque jour, tous les joueurs classent les mêmes cartes de S (meilleur) à D, puis comparent leur classement à la moyenne. Le titre est court (2 à 4 mots, 30 caractères au plus), sans emoji ; la description est une seule phrase très courte qui donne envie de classer, en tutoyant le joueur si elle s'adresse à lui (ex. « Le roi, c'est qui ? », « Celle qui tourne en boucle chez toi. », « La vraie question : l'ananas, S ou D ? »).`;

const GENERATE_SYSTEM = `Tu prépares ${STYLE}
On te donne un thème et un nombre de cartes. Donne le titre, un emoji pour la liste, la description, les cartes, et « cover » : l'indice (à partir de 0) de la carte la plus parlante, dont l'image représentera la liste sur l'accueil.
${CARD_RULES}`;

const CARDS_SYSTEM = `Tu complètes ${STYLE}
On te donne le thème, le nombre de cartes à proposer et les cartes déjà présentes.
${CARD_RULES}`;

const CONCEPTS_SYSTEM = `Tu choisis les icônes des cartes d'une tier list. On te donne le thème de la liste et des noms de cartes, dans l'ordre. Pour chaque carte, dans le même ordre, donne un « concept » en suivant ces règles :
${CARD_RULES.slice(CARD_RULES.indexOf("Pour chaque carte"))}`;

const TRANSLATE_SYSTEM = `Tu traduis ${STYLE}
On te donne le titre, la description et les noms des cartes en français. Traduis-les en anglais américain (en), en espagnol (es, en tutoyant) et en grec moderne (el, au pluriel de politesse εσείς), en gardant le ton, la brièveté (un nom de carte traduit reste court) et le même nombre de cartes, dans le même ordre. Un nom propre, une marque ou un titre d'œuvre prend le nom sous lequel il est connu dans le pays de la langue. Pas d'emoji. Un jeu de mots se remplace par un équivalent naturel plutôt que d'être traduit mot à mot.`;

const IDEAS_SYSTEM = `Tu proposes des thèmes pour ${STYLE}
Un bon thème parle à tout le monde (nourriture, objets du quotidien, animaux, souvenirs d'enfance, loisirs, saisons, fêtes, petites manies…), se classe en 10 à 12 cartes connues de tous, et fait débat. On te donne la date des jours à remplir et les titres déjà utilisés : ne les répète pas, ni de près. Tiens compte de la saison et des fêtes autour des dates en France.`;

const TRANSLATION = {
  type: "object",
  properties: { title: { type: "string" }, description: { type: "string" }, items: { type: "array", items: { type: "string" } } },
  required: ["title", "description", "items"],
  additionalProperties: false,
};

/** The library's concepts, shown to the AI so it reuses them (~3 tokens each). */
async function libraryHint() {
  const { data } = await db.from("card_icons").select("concept").not("image", "is", null).order("created_at", { ascending: false }).limit(800);
  return (data ?? []).map((r: { concept: string }) => r.concept).join(", ") || "vide";
}

/**
 * Rows of `table` whose `column` is in `values`, by slices: a long list doesn't fit a URL.
 * `drawn`: only the rows with an image (card_icons).
 */
async function inSlices<T>(table: string, select: string, column: string, values: string[], drawn = false): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < values.length; i += 150) {
    const q = db.from(table).select(select).in(column, values.slice(i, i + 150));
    const { data, error } = await (drawn ? q.not("image", "is", null) : q);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
  }
  return out;
}

async function votesOn(days: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const day of days) {
    const { count, error } = await db.from("daily_votes").select("day", { count: "exact", head: true }).eq("day", day);
    if (error) throw new Error(error.message);
    counts.set(day, count ?? 0);
  }
  return counts;
}

type Card = { label: string; emoji: string; concept: string };

/** Cards from the AI: trimmed, without duplicates of each other or of `existing`, with unique concepts. */
function cleanCards(raw: unknown, existing: string[], count: number): Card[] {
  const seen = new Set(existing.map((e) => e.toLowerCase()));
  const kept = ((Array.isArray(raw) ? raw : []) as Card[])
    .map((c) => ({ label: String(c.label ?? "").trim().slice(0, 40), emoji: String(c.emoji ?? "").trim().slice(0, 8), concept: String(c.concept ?? "") }))
    .filter((c) => c.label && !seen.has(c.label.toLowerCase()) && seen.add(c.label.toLowerCase()))
    .slice(0, count);
  const concepts = uniqueConcepts(kept);
  return kept.map((c, i) => ({ ...c, concept: concepts[i] }));
}

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const texts = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v : []).slice(0, n).map((s) => text(s, max));

async function list(from: string, to: string) {
  const { data: rows, error } = await db
    .from("daily_lists")
    .select("day, title, emoji, description, items, concepts, cover, regions, vote_regions")
    .gte("day", from)
    .lte("day", to)
    .order("day");
  if (error) throw new Error(error.message);
  const days = (rows ?? []).map((r: { day: string }) => r.day);
  const { data: tr, error: trError } = days.length
    ? await db.from("content_translations").select("key, lang, title, description, items").eq("kind", "daily").gte("key", from).lte("key", to)
    : { data: [], error: null };
  if (trError) throw new Error(trError.message);
  const votes = await votesOn(days);
  const concepts = [...new Set((rows ?? []).flatMap((r: { concepts: string[] | null }) => (r.concepts ?? []).filter(Boolean)))];
  const icons = await inSlices<{ concept: string; image: string }>("card_icons", "concept, image", "concept", concepts, true);
  const wished = await inSlices<{ concept: string }>("icon_wishlist", "concept", "concept", concepts);
  return {
    days: (rows ?? []).map((r: { day: string }) => ({
      ...r,
      votes: votes.get(r.day) ?? 0,
      translations: Object.fromEntries(
        ((tr ?? []) as { key: string; lang: string }[]).filter((t) => t.key === r.day).map(({ key: _k, lang, ...t }) => [lang, t]),
      ),
    })),
    icons: Object.fromEntries(icons.map((i) => [i.concept, i.image])),
    wishlist: wished.map((w) => w.concept),
  };
}

/** Concepts with no picture yet join the wishlist: the free cells of later sheets draw them. */
async function wish(concepts: string[], labels: Map<string, string>) {
  const named = [...new Set(concepts.filter(Boolean))];
  if (!named.length) return;
  const drawn = new Set((await inSlices<{ concept: string }>("card_icons", "concept", "concept", named, true)).map((r) => r.concept));
  const rows = named.filter((c) => !drawn.has(c)).map((concept) => ({ concept, label: labels.get(concept) ?? concept.replace(/-/g, " ") }));
  if (!rows.length) return;
  const { error } = await db.from("icon_wishlist").upsert(rows, { onConflict: "concept", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

async function save(day: unknown, rawList: unknown, rawTranslations: unknown) {
  const row = cleanList(day, (rawList ?? {}) as Record<string, unknown>);
  if (typeof row === "string") throw new Refused(row);
  const translations = cleanTranslations(rawTranslations, row.items.length);
  if (typeof translations === "string") throw new Refused(translations);
  const { data: old } = await db.from("daily_lists").select("items").eq("day", row.day).maybeSingle();
  if (old && !sameItems(old.items, row.items) && ((await votesOn([row.day])).get(row.day) ?? 0) > 0) {
    throw new Refused("Cette liste a déjà des votes : ses cartes ne peuvent plus changer (seuls les textes, concepts et traductions).");
  }
  const { error } = await db.from("daily_lists").upsert(row, { onConflict: "day" });
  if (error) throw new Error(error.message);
  for (const lang of LANGS) {
    const t = translations[lang];
    const q = t
      ? db.from("content_translations").upsert({ kind: "daily", key: row.day, lang, ...t, tiers: null, updated_at: new Date().toISOString() }, { onConflict: "kind,key,lang" })
      : db.from("content_translations").delete().eq("kind", "daily").eq("key", row.day).eq("lang", lang);
    const { error: e } = await q;
    if (e) throw new Error(e.message);
  }
  // The wishlist label is what the sheet draws: the English name, else the concept itself.
  const english = translations.en?.items;
  const labels = new Map((row.concepts ?? []).map((c, i) => [c, english ? splitLabel(english[i]).text : c.replace(/-/g, " ")]));
  await wish(row.concepts ?? [], labels);
}

async function remove(day: unknown) {
  if (!isDay(day)) throw new Refused("Date invalide.");
  if (((await votesOn([day])).get(day) ?? 0) > 0) throw new Refused("Cette liste a déjà des votes : elle ne peut plus être supprimée.");
  const { error } = await db.from("content_translations").delete().eq("kind", "daily").eq("key", day);
  if (error) throw new Error(error.message);
  const { error: e } = await db.from("daily_lists").delete().eq("day", day);
  if (e) throw new Error(e.message);
}

/** Moves a list to another day, swapping the two when that day already has one. */
async function move(from: unknown, to: unknown) {
  if (!isDay(from) || !isDay(to) || from === to) throw new Refused("Dates invalides.");
  const votes = await votesOn([from, to]);
  if ((votes.get(from) ?? 0) + (votes.get(to) ?? 0) > 0) throw new Refused("Une des deux listes a déjà des votes : elle reste à sa date.");
  const columns = "day, title, emoji, description, items, tiers, concepts, cover, regions, vote_regions";
  const { data: rows, error } = await db.from("daily_lists").select(columns).in("day", [from, to]);
  if (error) throw new Error(error.message);
  const a = rows?.find((r: { day: string }) => r.day === from);
  const b = rows?.find((r: { day: string }) => r.day === to);
  if (!a) throw new Refused("Rien à déplacer ce jour-là.");
  const { data: tr, error: trError } = await db.from("content_translations").select("key, lang, title, description, items, tiers").eq("kind", "daily").in("key", [from, to]);
  if (trError) throw new Error(trError.message);
  // Upserts in place, then only what is left over is deleted: a failure midway never loses a list.
  const moved = [{ ...a, day: to }, ...(b ? [{ ...b, day: from }] : [])];
  const { error: e1 } = await db.from("daily_lists").upsert(moved, { onConflict: "day" });
  if (e1) throw new Error(e1.message);
  const trMoved = (tr ?? []).map((t: { key: string }) => ({ ...t, kind: "daily", key: t.key === from ? to : from, updated_at: new Date().toISOString() }));
  if (trMoved.length) {
    const { error: e2 } = await db.from("content_translations").upsert(trMoved, { onConflict: "kind,key,lang" });
    if (e2) throw new Error(e2.message);
  }
  // Languages one list had and the other didn't: the stale row goes.
  for (const [day, src] of [[to, from], [from, to]] as const) {
    const langs = new Set((tr ?? []).filter((t: { key: string }) => t.key === src).map((t: { lang: string }) => t.lang));
    const stale = LANGS.filter((l) => !langs.has(l));
    if (stale.length) await db.from("content_translations").delete().eq("kind", "daily").eq("key", day).in("lang", stale);
  }
  if (!b) {
    const { error: e3 } = await db.from("daily_lists").delete().eq("day", from);
    if (e3) throw new Error(e3.message);
  }
}

/** Draws the cards' missing pictures in one sheet (spare cells draw the wishlist), into the shared library. */
async function draw(theme: string, raw: unknown) {
  const asked = (Array.isArray(raw) ? raw : []).slice(0, 20).map((c: { label?: unknown; concept?: unknown }) => ({
    label: text(c?.label, 40),
    concept: normalizeConcept(text(c?.concept, 40)),
  })).filter((c) => c.concept);
  const concepts = asked.map((c) => c.concept);
  const known = await inSlices<{ concept: string; image: string }>("card_icons", "concept, image", "concept", concepts, true);
  const urls = new Map(known.map((k) => [k.concept, k.image]));
  const missing = asked.filter((c, i) => !urls.has(c.concept) && concepts.indexOf(c.concept) === i).map((c) => ({ ...c, theme: theme || undefined }));
  if (missing.length) {
    const { data: wished } = await db.from("icon_wishlist").select("concept, label").order("created_at").limit(40);
    const labels = new Map((wished ?? []).map((w: { concept: string; label: string }) => [w.concept, w.label]));
    const pending = (wished ?? []).filter((w: { concept: string }) => !urls.has(w.concept) && !concepts.includes(w.concept));
    const plan = fillSheet(missing, pending as { concept: string; label: string; theme?: string }[]);
    const meter = newMeter();
    let tiles: (Uint8Array | null)[] = [];
    try {
      tiles = await drawWithFallback(plan, (cards) => drawSheet(cards, meter));
    } finally {
      await logCost("images", meter, tiles.some(Boolean));
    }
    const drawn: { concept: string; label: string; image: string }[] = [];
    await Promise.all(plan.map(async (card, i) => {
      const png = tiles[i];
      if (!png) return;
      // A name unique to this drawing ("-sticker": drawn with its white border), as in ai-generate.
      const path = `${card.concept}-${Date.now().toString(36)}-sticker.png`;
      const { error } = await db.storage.from("card-icons").upload(path, png, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
      if (error) return console.error("upload", card.concept, error.message);
      const image = db.storage.from("card-icons").getPublicUrl(path).data.publicUrl;
      drawn.push({ concept: card.concept, label: labels.get(card.concept) ?? card.label, image });
      urls.set(card.concept, image);
    }));
    if (drawn.length) {
      await db.from("card_icons").upsert(drawn, { onConflict: "concept", ignoreDuplicates: true });
      await db.from("card_icon_images").insert(drawn);
      await db.from("icon_wishlist").delete().in("concept", drawn.map((d) => d.concept));
    }
  }
  return { icons: Object.fromEntries(concepts.filter((c) => urls.has(c)).map((c) => [c, urls.get(c)])) };
}

async function handle(body: Record<string, unknown>) {
  const theme = text(body.theme, 80);
  switch (body.action) {
    case "list": {
      if (!isDay(body.from) || !isDay(body.to)) throw new Refused("Dates invalides.");
      return await list(body.from, body.to);
    }
    case "save":
      await save(body.day, body.list, body.translations);
      return { ok: true };
    case "delete":
      await remove(body.day);
      return { ok: true };
    case "move":
      await move(body.from, body.to);
      return { ok: true };
    case "generate": {
      if (!theme) throw new Refused("Donne un thème.");
      const count = Math.min(20, Math.max(4, Math.round(Number(body.count) || 12)));
      const out = await ask("words", "medium", GENERATE_SYSTEM, `Thème : ${theme}\nNombre de cartes : ${count}\nBibliothèque déjà dessinée : ${await libraryHint()}`, {
        type: "object",
        properties: {
          title: { type: "string" },
          emoji: { type: "string" },
          description: { type: "string" },
          cover: { type: "integer" },
          cards: { type: "array", items: CARD },
        },
        required: ["title", "emoji", "description", "cover", "cards"],
        additionalProperties: false,
      }, 6000);
      const cards = cleanCards(out.cards, [], count);
      if (!cards.length) throw new Refused("L'IA n'a proposé aucune carte.");
      const cover = Number(out.cover);
      return { title: text(out.title, 60), emoji: text(out.emoji, 8), description: text(out.description, 120), cover: cover >= 0 && cover < cards.length ? cover : 0, cards };
    }
    case "cards": {
      if (!theme) throw new Refused("Donne un thème.");
      const count = Math.min(20, Math.max(1, Math.round(Number(body.count) || 1)));
      const existing = texts(body.existing, 20, 40);
      const out = await ask("words", "low", CARDS_SYSTEM, `Thème : ${theme}\nNombre de cartes : ${count}\nCartes déjà présentes : ${existing.join(", ") || "aucune"}\nBibliothèque déjà dessinée : ${await libraryHint()}`, {
        type: "object",
        properties: { cards: { type: "array", items: CARD } },
        required: ["cards"],
        additionalProperties: false,
      }, 3000);
      return { cards: cleanCards(out.cards, existing, count) };
    }
    case "concepts": {
      const labels = texts(body.labels, 20, 40);
      if (!labels.length) throw new Refused("Aucune carte.");
      const out = await ask("words", "low", CONCEPTS_SYSTEM, `Thème : ${theme || "inconnu"}\nCartes : ${labels.join(" | ")}\nBibliothèque déjà dessinée : ${await libraryHint()}`, {
        type: "object",
        properties: { concepts: { type: "array", items: { type: "string" } } },
        required: ["concepts"],
        additionalProperties: false,
      }, 2000);
      const proposed = ((out.concepts ?? []) as unknown[]).map(String);
      return { concepts: uniqueConcepts(labels.map((label, i) => ({ label, concept: proposed[i] ?? "" }))) };
    }
    case "translate": {
      const items = texts(body.items, 20, 40);
      const title = text(body.title, 60);
      if (!title || !items.length) throw new Refused("Il faut un titre et des cartes.");
      const out = await ask("words", "low", TRANSLATE_SYSTEM, JSON.stringify({ title, description: text(body.description, 120), items }), {
        type: "object",
        properties: { en: TRANSLATION, es: TRANSLATION, el: TRANSLATION },
        required: ["en", "es", "el"],
        additionalProperties: false,
      }, 4000);
      for (const lang of LANGS) {
        if (!Array.isArray(out[lang]?.items) || out[lang].items.length !== items.length) throw new Refused(`La traduction ${lang.toUpperCase()} n'a pas le bon nombre de cartes : réessaie.`);
      }
      return out;
    }
    case "ideas": {
      const count = Math.min(10, Math.max(1, Math.round(Number(body.count) || 6)));
      const { data } = await db.from("daily_lists").select("title").order("day", { ascending: false }).limit(400);
      const used = (data ?? []).map((r: { title: string }) => r.title).join(", ");
      const dates = texts(body.days, 10, 10).join(", ") || "les prochains jours";
      const out = await ask("words", "low", IDEAS_SYSTEM, `Nombre de thèmes : ${count}\nJours à remplir : ${dates}\nTitres déjà utilisés : ${used}`, {
        type: "object",
        properties: {
          ideas: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, emoji: { type: "string" }, description: { type: "string" } },
              required: ["title", "emoji", "description"],
              additionalProperties: false,
            },
          },
        },
        required: ["ideas"],
        additionalProperties: false,
      }, 2000);
      return { ideas: (out.ideas ?? []).slice(0, count) };
    }
    case "draw":
      return await draw(theme, body.cards);
    case "check": {
      // After a deploy: the style picture shipped intact (compare with sha256 of the local STYLE_REF).
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(STYLE_REF));
      return { styleRef: [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("") };
    }
  }
  throw new Refused("Action inconnue.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const token = req.headers.get("x-admin-secret") ?? "";
  const { data: ok } = token.length >= 32 ? await db.rpc("admin_token_ok", { token }) : { data: false };
  if (ok !== true) return json({ error: "Clé admin refusée." }, 403);
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: "Requête trop grosse." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Requête illisible." }, 400);
  }
  try {
    return json(await handle(body));
  } catch (e) {
    if (e instanceof Refused) return json({ error: e.message }, 422);
    if (e instanceof SheetError) return json({ error: e.message === "busy" ? "Le dessin est surchargé, réessaie dans une minute." : "Le dessin a échoué." }, 502);
    if (e instanceof Anthropic.APIError) {
      console.error("anthropic", e.status, e.message);
      return json({ error: "L'IA est indisponible, réessaie." }, 502);
    }
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erreur serveur." }, 500);
  }
});

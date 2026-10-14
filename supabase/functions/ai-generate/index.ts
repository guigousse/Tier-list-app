// AI tier list generation, called by the app (the AI key never ships in the app).
//   { action: "words", deviceId, theme, count, existing } -> { cards: [{ label, emoji, concept }] }
//   { action: "icon", deviceId, label, concept }          -> { concept, svg, reused }  (SVG, older app versions)
//   { action: "icons", deviceId, cards: [{ label, concept, redraw? }], theme? } -> { icons: [{ concept, url }] }  (one Gemini sheet)
// Icons go to a shared library (table card_icons): a concept drawn once is reused
// by every player; a redrawn concept keeps its first image and adds the new one to
// card_icon_images, the history of every picture drawn. Per-device and global daily
// quotas (ai_allow) bound the bill.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

import { normalizeConcept, uniqueConcepts, withConcepts } from "./concepts.ts";
import { drawSheet, SheetError } from "./iconSheet.ts";
import { cardsToDraw, fillSheet } from "./sheet.ts";

// Models: change here to trade quality for cost (see docs/monetization-plan.md).
const WORDS_MODEL = "claude-opus-5-5";
const ICON_MODEL = "claude-opus-5-5";

const anthropic = new Anthropic(); // ANTHROPIC_API_KEY, an Edge Function secret
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Library concepts shown to the AI so it reuses them: ~3 tokens each, so a few hundred stay cheap. */
const LIBRARY_HINT = 500;

/** One request with a JSON answer; refusals and unparsable answers are errors. */
async function ask(model: string, effort: string, system: string, user: string, schema: object, maxTokens: number) {
  const params = {
    model,
    max_tokens: maxTokens,
    // Safety-classifier refusals are re-run server-side on Anthropic's recommended model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: user }],
    output_config: { effort, format: { type: "json_schema", schema } },
  };
  const response = await anthropic.beta.messages.create(params as never);
  if (response.stop_reason === "refusal") throw new Error("refused");
  const text = response.content.find((b: { type: string }) => b.type === "text") as { text: string } | undefined;
  if (!text) throw new Error("empty answer");
  return JSON.parse(text.text);
}

const WORDS_SYSTEM = `Tu remplis des tier lists pour l'application Tiercraft : les joueurs classent des cartes de S (meilleur) à D.
On te donne un thème et un nombre de cartes. Propose des cartes :
- en français, courtes (1 à 3 mots, 24 caractères maximum), sans article ni numérotation ;
- toutes du thème, connues du grand public, assez variées pour que le classement fasse débat ;
- sans doublon entre elles ni avec les cartes déjà présentes.
Pour chaque carte, donne aussi un emoji qui la représente, et un « concept » : un nom anglais simple en kebab-case (ex. "pizza", "hiking-boot", "rubber-duck") désignant l'objet à dessiner comme icône. Pour une idée difficile à dessiner, choisis un objet qui la symbolise (« Balade » -> "hiking-boot", « Grasse matinée » -> "bed"). Pour une marque, une personne ou une œuvre, choisis un objet générique évocateur, jamais un logo ni un visage réel.
Pour une couleur, une matière ou une notion purement visuelle, le concept montre la chose elle-même, pas un objet qui en a la couleur : une tache de peinture de cette teinte (« Kaki » -> "khaki-paint-splash", « Turquoise » -> "turquoise-paint-splash").
Un mot à plusieurs sens se lit dans le sens du thème, et son concept le dit sans ambiguïté, jamais le mot nu : « Rose » vaut "pink-paint-splash" parmi des couleurs et "rose-flower" parmi des fleurs ; « Orange » vaut "orange-paint-splash" ou "orange-fruit" ; « Avocat » vaut "avocado" ou "lawyer-gavel".
Concepts : au singulier, sans mot inutile (« pizza » et non « pizza-slice »). Si un concept de la bibliothèque déjà dessinée désigne exactement le même objet, dans le même sens, reprends-le tel quel : son icône est gratuite. Sinon, crée un concept assez précis pour que l'icône distingue la carte des autres de la liste (« camembert-box » plutôt que « cheese » dans une liste de fromages). Deux cartes de la liste n'ont jamais le même concept.
Si le thème est haineux, sexuel ou violent envers des personnes, renvoie une liste vide.`;

const WORDS_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, emoji: { type: "string" }, concept: { type: "string" } },
        required: ["label", "emoji", "concept"],
        additionalProperties: false,
      },
    },
  },
  required: ["cards"],
  additionalProperties: false,
};

const CONCEPTS_SYSTEM = `Tu choisis les icônes des cartes d'une tier list. On te donne le thème de la liste et des noms de cartes, dans l'ordre.
Pour chaque carte, donne un « concept » : un nom anglais simple en kebab-case, au singulier, désignant l'objet à dessiner, lu dans le sens du thème.
Un mot à plusieurs sens est dit sans ambiguïté : « Rose » parmi des couleurs -> "pink-paint-splash", parmi des fleurs -> "rose-flower". Une couleur ou une matière se montre en tache de peinture de la teinte, pas en objet de cette couleur. Une idée difficile à dessiner prend un objet qui la symbolise ; une marque, une personne ou une œuvre, un objet générique évocateur, jamais un logo ni un visage.
Si un concept de la bibliothèque déjà dessinée désigne le même objet dans le même sens, reprends-le tel quel.`;

const CONCEPTS_SCHEMA = {
  type: "object",
  properties: { concepts: { type: "array", items: { type: "string" } } },
  required: ["concepts"],
  additionalProperties: false,
};

/** The library's newest concepts, shown to the AI so it reuses them. */
async function libraryHint() {
  const { data } = await db.from("card_icons").select("concept").order("created_at", { ascending: false }).limit(LIBRARY_HINT);
  return (data ?? []).map((r: { concept: string }) => r.concept).join(", ") || "vide";
}

const ICON_SYSTEM = `Tu dessines des icônes vectorielles SVG pour les cartes d'une application de tier lists.
Style imposé, identique aux exemples :
- viewBox "0 0 100 100", dessin centré occupant environ 80 % de la surface, fond transparent ;
- illustration cartoon simple et lisible à 55 pixels : peu de formes, pas de petits détails ;
- contours foncés chauds stroke="#2A1B14" d'épaisseur 2 à 2,6, stroke-linejoin="round" stroke-linecap="round" ;
- aplats de couleurs vives, plus une ombre (teinte plus foncée) et un reflet (blanc ou teinte claire, opacity .3 à .8) par forme principale ;
- éléments autorisés uniquement : svg, g, path, circle, ellipse, rect, line, polyline, polygon, defs, linearGradient, radialGradient, stop, clipPath. Pas de texte, pas d'image, pas de style CSS, pas de script ;
- jamais de logo, de marque, de texte ni de visage de personne réelle : un objet générique.
Exemple « croissant » :
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#E9A24A" stroke="#2A1B14" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" d="M9 63 C10 52 18 44 28 44 C28 52 25 59 20 66 C15 69 10 67 9 63 Z"/>
<path fill="#E9A24A" stroke="#2A1B14" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" d="M91 63 C90 52 82 44 72 44 C72 52 75 59 80 66 C85 69 90 67 91 63 Z"/>
<path fill="#E39A40" stroke="#2A1B14" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" d="M22 50 C26 38 38 34 44 38 C44 50 40 60 32 66 C24 66 19 58 22 50 Z"/>
<path fill="#E39A40" stroke="#2A1B14" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" d="M78 50 C74 38 62 34 56 38 C56 50 60 60 68 66 C76 66 81 58 78 50 Z"/>
<path fill="#F0AE55" stroke="#2A1B14" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" d="M36 40 C36 28 64 28 64 40 C64 54 58 66 50 68 C42 66 36 54 36 40 Z"/>
<g fill="#C77A2A" opacity=".55"><path d="M50 68 C56 64 60 56 61 48 C58 56 54 62 50 64 Z"/><path d="M32 66 C38 62 41 55 42 48 C38 56 35 60 30 62 Z"/><path d="M68 66 C62 62 59 55 58 48 C62 56 65 60 70 62 Z"/></g>
<path fill="#FFD48C" opacity=".8" d="M42 36 C45 32 52 31 56 33 C51 33 46 35 43 39 Z"/>
<path fill="#FFD48C" opacity=".7" d="M27 45 C29 42 33 40 36 41 C33 42 30 44 28 48 Z"/></svg>
Exemple « rubber-duck » :
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#FFD23F" stroke="#2A1B14" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" d="M10 62 C10 48 26 48 40 54 C56 44 90 44 90 62 C90 80 74 88 50 88 C26 88 10 80 10 62 Z"/>
<path fill="#F2B21C" d="M14 70 C22 80 36 84 50 84 C66 84 80 80 88 66 C86 80 72 88 50 88 C30 88 16 82 14 70 Z"/>
<path fill="#F2B21C" stroke="#2A1B14" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" d="M50 60 C58 56 70 56 76 62 C70 68 58 70 50 66 Z"/>
<circle fill="#FFD23F" stroke="#2A1B14" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" cx="38" cy="34" r="20"/>
<path fill="#FF8A2B" stroke="#2A1B14" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" d="M54 30 C62 28 72 28 74 32 C72 38 62 40 54 38 Z"/>
<path fill="none" stroke="#2A1B14" stroke-width="1.6" d="M56 34 H70"/>
<circle fill="#2A1B14" cx="42" cy="28" r="3.2"/><circle fill="#FFFFFF" cx="43.2" cy="26.8" r="1.1"/>
<ellipse fill="#FF8A7A" opacity=".55" cx="32" cy="40" rx="4.5" ry="2.8"/>
<path fill="#FFF3B0" opacity=".8" d="M24 24 C28 18 36 15 42 16 C36 18 30 22 27 28 Z"/>
<g fill="#FFFFFF" stroke="#9FD3F2" stroke-width="1.4"><circle cx="16" cy="88" r="5"/><circle cx="84" cy="90" r="4"/><circle cx="92" cy="82" r="3"/></g></svg>`;

const ICON_SCHEMA = {
  type: "object",
  properties: { svg: { type: "string" } },
  required: ["svg"],
  additionalProperties: false,
};

const TAGS = new Set(["svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "defs", "lineargradient", "radialgradient", "stop", "clippath"]);
const ATTRS = new Set([
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "fx", "fy", "width", "height", "points",
  "fill", "stroke", "stroke-width", "stroke-linejoin", "stroke-linecap", "stroke-opacity", "stroke-dasharray", "fill-opacity", "fill-rule",
  "clip-rule", "opacity", "transform", "id", "offset", "stop-color", "stop-opacity", "gradientunits", "gradienttransform", "clip-path",
]);

/** Keeps only drawing elements and attributes (no script, link, style or text), or null. */
export function sanitize(svg: string): string | null {
  const start = svg.indexOf("<svg");
  if (start < 0) return null;
  const out: string[] = [];
  const re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  const body = svg.slice(start);
  while ((m = re.exec(body))) {
    const [, close, tag, attrs, self] = m;
    if (!TAGS.has(tag.toLowerCase())) continue;
    if (close) {
      out.push(`</${tag}>`);
      continue;
    }
    if (tag.toLowerCase() === "svg") {
      out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`);
      continue;
    }
    const kept: string[] = [];
    for (const a of attrs.matchAll(/([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*"([^"]*)"/g)) {
      const name = a[1].toLowerCase();
      const value = a[2];
      // Only references inside the drawing itself (url(#id)), nothing external.
      if (!ATTRS.has(name) || /url\((?!#)|javascript:|data:|[<>]/i.test(value)) continue;
      kept.push(`${a[1]}="${value}"`);
    }
    out.push(`<${tag}${kept.length ? " " + kept.join(" ") : ""}${self ? "/" : ""}>`);
  }
  const clean = out.join("");
  const ok = clean.startsWith("<svg") && clean.endsWith("</svg>") && clean.length <= 16000 && /<(path|circle|ellipse|rect|polygon)/.test(clean);
  return ok ? clean : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const deviceId = String(body.deviceId ?? "");
  if (!UUID.test(deviceId)) return json({ error: "bad request" }, 400);

  try {
    if (body.action === "words") {
      const theme = String(body.theme ?? "").trim().slice(0, 80);
      const count = Math.min(20, Math.max(3, Math.round(Number(body.count) || 10)));
      const existing = (Array.isArray(body.existing) ? body.existing : []).map(String).slice(0, 60);
      if (!theme) return json({ error: "theme" }, 400);
      const { data: allowed } = await db.rpc("ai_allow", { device_id: deviceId, kind: "words" });
      if (!allowed) return json({ error: "quota" }, 429);
      const drawn = await libraryHint();
      const result = await ask(
        WORDS_MODEL,
        "low",
        WORDS_SYSTEM,
        `Thème : ${theme}\nNombre de cartes : ${count}\nCartes déjà présentes : ${existing.join(", ") || "aucune"}\nBibliothèque déjà dessinée : ${drawn}`,
        WORDS_SCHEMA,
        4000,
      );
      const seen = new Set(existing.map((e) => e.toLowerCase()));
      const kept = ((result.cards ?? []) as { label: string; emoji: string; concept: string }[])
        .map((c) => ({
          label: String(c.label).trim().slice(0, 40),
          emoji: String(c.emoji).trim().slice(0, 8),
          concept: String(c.concept ?? ""),
        }))
        .filter((c) => {
          const key = c.label.toLowerCase();
          if (!c.label || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, count);
      if (kept.length === 0) return json({ error: "theme refused" }, 422);
      const concepts = uniqueConcepts(kept);
      const cards = kept.map((c, i) => ({ ...c, concept: concepts[i] }));
      // Every concept proposed joins the wishlist: free cells of later sheets draw it.
      await db.from("icon_wishlist").upsert(cards.map((c) => ({ concept: c.concept, label: c.label })), { onConflict: "concept", ignoreDuplicates: true });
      return json({ cards });
    }

    if (body.action === "icon") {
      const label = String(body.label ?? "").trim().slice(0, 40);
      const concept = normalizeConcept(String(body.concept || label));
      if (!concept) return json({ error: "bad request" }, 400);
      // Already drawn for someone: free and instant.
      const { data: known } = await db.from("card_icons").select("svg").eq("concept", concept).maybeSingle();
      if (known) return json({ concept, svg: known.svg, reused: true });
      const { data: allowed } = await db.rpc("ai_allow", { device_id: deviceId, kind: "icon" });
      if (!allowed) return json({ error: "quota" }, 429);
      const result = await ask(ICON_MODEL, "medium", ICON_SYSTEM, `Dessine l'icône du concept « ${concept} » (carte : « ${label} »).`, ICON_SCHEMA, 16000);
      const svg = sanitize(String(result.svg ?? ""));
      if (!svg) return json({ error: "icon failed" }, 502);
      await db.from("card_icons").upsert({ concept, svg, label }, { onConflict: "concept", ignoreDuplicates: true });
      return json({ concept, svg, reused: false });
    }

    if (body.action === "icons") {
      const theme = String(body.theme ?? "").trim().slice(0, 80);
      let asked = (Array.isArray(body.cards) ? body.cards : []).slice(0, 20).map((c: { label?: unknown; concept?: unknown; redraw?: unknown }) => ({
        label: String(c?.label ?? "").trim().slice(0, 40),
        concept: normalizeConcept(String(c?.concept ?? "")),
        theme: theme || undefined,
        redraw: c?.redraw === true,
      })).filter((c: { label: string; concept: string }) => c.label || c.concept);
      if (asked.length === 0) return json({ error: "bad request" }, 400);
      // Cards without a concept (added by hand, renamed): read in the theme's sense, or
      // "Rose" would get whichever rose the library drew first, flower or colour.
      const bare = asked.filter((c: { concept: string }) => !c.concept);
      let proposed: string[] = [];
      if (bare.length && theme) {
        // A Claude call: bounded like the words, so the endpoint can't run it for free.
        const { data: allowed } = await db.rpc("ai_allow", { device_id: deviceId, kind: "words" });
        if (!allowed) return json({ error: "quota" }, 429);
        try {
          const result = await ask(
            WORDS_MODEL,
            "low",
            CONCEPTS_SYSTEM,
            `Thème : ${theme}\nCartes : ${bare.map((c: { label: string }) => c.label).join(" | ")}\nBibliothèque déjà dessinée : ${await libraryHint()}`,
            CONCEPTS_SCHEMA,
            2000,
          );
          proposed = ((result.concepts ?? []) as unknown[]).map(String);
        } catch (e) {
          // The card's own name still makes a drawing: not worth failing the sheet.
          console.error("concepts", e);
        }
      }
      asked = withConcepts(asked, proposed);
      const concepts = [...new Set(asked.map((c: { concept: string }) => c.concept))];
      // Already drawn as a picture for someone: free and instant. (An SVG-only concept
      // is drawn again: the sheet style must stay the same across a list.)
      const { data: known } = await db.from("card_icons").select("concept, image").in("concept", concepts).not("image", "is", null);
      const urls = new Map<string, string>((known ?? []).map((k: { concept: string; image: string }) => [k.concept, k.image]));
      const alreadyDrawn = new Set(urls.keys());
      const missing = cardsToDraw(asked, alreadyDrawn);
      if (missing.length) {
        const { data: allowed } = await db.rpc("ai_allow", { device_id: deviceId, kind: "icon" });
        if (!allowed) return json({ error: "quota" }, 429);
        const { data: wish } = await db.from("icon_wishlist").select("concept, label").order("created_at").limit(40);
        const pending = (wish ?? []).filter((w: { concept: string }) => !urls.has(w.concept));
        const plan = fillSheet(missing, pending as { concept: string; label: string }[]);
        const tiles = await drawSheet(plan);
        const drawn: { concept: string; label: string; image: string }[] = [];
        await Promise.all(plan.map(async (card, i) => {
          const png = tiles[i];
          if (!png) return;
          // Name unique to this drawing: the CDN and the players' copies keep a file a
          // year, a concept redrawn under the same name would stay the old picture.
          const path = `${card.concept}-${Date.now().toString(36)}.png`;
          const { error } = await db.storage.from("card-icons").upload(path, png, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
          if (error) return console.error("upload", card.concept, error.message);
          const image = db.storage.from("card-icons").getPublicUrl(path).data.publicUrl;
          drawn.push({ concept: card.concept, label: card.label, image });
          urls.set(card.concept, image);
        }));
        if (drawn.length) {
          // A redrawn concept keeps its library image (other players' lists use it); the
          // new one is added beside it, and goes to the card that asked for it.
          const fresh = drawn.filter((d) => !alreadyDrawn.has(d.concept));
          if (fresh.length) await db.from("card_icons").upsert(fresh, { onConflict: "concept" });
          await db.from("card_icon_images").insert(drawn);
          await db.from("icon_wishlist").delete().in("concept", drawn.map((d) => d.concept));
        }
      }
      return json({ icons: asked.map((c: { concept: string }) => ({ concept: c.concept, url: urls.get(c.concept) ?? null })) });
    }

    return json({ error: "bad request" }, 400);
  } catch (e) {
    if (e instanceof SheetError) return json({ error: e.message === "busy" ? "busy" : "icon failed" }, e.message === "busy" ? 503 : 502);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 503);
    if (e instanceof Anthropic.APIError) {
      console.error("anthropic", e.status, e.message);
      return json({ error: "ai unavailable" }, 502);
    }
    if (e instanceof Error && e.message === "refused") return json({ error: "theme refused" }, 422);
    console.error(e);
    return json({ error: "server" }, 500);
  }
});

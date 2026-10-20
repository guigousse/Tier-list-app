// AI tier list generation, called by the app (the AI key never ships in the app).
//   { action: "challenge", deviceId } -> { challenge }  (one-use, for App Attest)
//   { action: "wallet", deviceId, wallet, keyId?, attestation?, challenge? } -> { balance, attested }
//   { action: "words", deviceId, wallet, theme, count, existing } -> { cards: [{ label, emoji, concept }], balance }
//   { action: "tiers", deviceId, wallet, theme, current, tone, cards? } -> { labels, balance }  (best first)
//   { action: "icons", deviceId, wallet, cards: [{ label, concept, redraw? }], theme? } -> { icons: [{ concept, url }], balance }
//   { action: "purchase", deviceId, wallet, transaction } -> { balance, credited, credits }  (an App Store pack, signed by Apple)
//   { action: "redraw", skip? } + header x-admin-secret -> { drawn, failed, left }  (admin: one sheet of the library redrawn as stickers)
// Generations are paid with the wallet's credits (wallet.ts): held first, then only what
// was delivered is kept. 402 { error: "credits" } when the balance is too low.
// Icons go to a shared library (table card_icons): a concept drawn once is reused
// by every player; a redrawn concept keeps its first image and adds the new one to
// card_icon_images, the history of every picture drawn. Per-device and global daily
// quotas (ai_allow) bound the bill.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

import { normalizeConcept, uniqueConcepts, withConcepts } from "./concepts.ts";
import { drawSheet, SheetError } from "./iconSheet.ts";
import { cardsToDraw, drawWithFallback, fillSheet } from "./sheet.ts";
import { cleanTierLabels, TONES, type Tone } from "./tiers.ts";
import { inLanguage, langOf } from "./language.ts";
import { verifyAttestation } from "./appAttest.ts";
import { WELCOME_BONUS } from "./pricing.ts";
import { verifyTransaction } from "./purchase.ts";
import { addClaude, type CostKind, costRow, type Meter, newMeter } from "./costs.ts";
import { MAX_BODY, texts, trustForLibrary } from "./limits.ts";
import { paid, WalletError } from "./wallet.ts";

// Models: change here to trade quality for cost (see docs/monetization-plan.md).
// Cards and their concepts: Sonnet 5.5, half Opus's price for the same cards on 7 themes
// measured on 2026-10-16 (≈ 0.9 ¢ $ against 1.8 for 12 cards), and steadier latency.
const CARDS_MODEL = "claude-sonnet-5-5";
// Tier names are wordplay in a chosen tone: Opus, not compared yet.
const TIERS_MODEL = "claude-opus-5-5";
/** The app's App ID, which App Attest binds every attestation to. */
const APP = { teamId: "9D78779LKL", bundleId: "com.guigousse.TierCraft" };

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
async function ask(model: string, effort: string, system: string, user: string, schema: object, maxTokens: number, meter?: Meter) {
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
  // The model that answered (a fallback may have), at its own rate.
  if (meter) addClaude(meter, (response as { model?: string }).model ?? model, response.usage);
  if (response.stop_reason === "refusal") throw new Error("refused");
  const text = response.content.find((b: { type: string }) => b.type === "text") as { text: string } | undefined;
  if (!text) throw new Error("empty answer");
  return JSON.parse(text.text);
}

const WORDS_SYSTEM = `Tu remplis des tier lists pour l'application Tiercraft : les joueurs classent des cartes de S (meilleur) à D.
On te donne un thème et un nombre de cartes. Propose des cartes :
- en français, courtes (1 à 3 mots, 24 caractères maximum), sans article ni numérotation ;
- toutes du thème, connues du grand public, assez variées pour que le classement fasse débat ;
- réparties sur toute l'échelle, du S au D : environ un quart de choix évidents pour le haut, la moitié de choix moyens ou discutables, et un quart de choix nettement faibles, décevants, pénibles ou absurdes. Une liste où tout mérite S est ratée : sans cartes faibles, les rangs du bas restent vides. Une carte faible reste du thème et reconnaissable, faible et non obscure ;
- sans doublon entre elles ni avec les cartes déjà présentes.
Pour chaque carte, donne aussi un emoji qui la représente, et un « concept » : un nom anglais simple en kebab-case (ex. "pizza", "hiking-boot", "rubber-duck") désignant l'objet à dessiner comme icône. Pour une idée difficile à dessiner, choisis un objet qui la symbolise (« Balade » -> "hiking-boot", « Grasse matinée » -> "bed"). Pour une personne réelle connue, le concept est son buste : "bust-" suivi de son prénom et de son nom en kebab-case (« Barack Obama » -> "bust-barack-obama"). Pour une marque ou une œuvre, choisis un objet générique évocateur, jamais un logo.
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

const TIERS_SYSTEM = `Tu nommes les rangs d'une tier list de l'application Tiercraft : les joueurs y classent des cartes du meilleur rang au moins bon.
On te donne le thème, le ton voulu, les noms actuels des rangs dans l'ordre, et quelques cartes de la liste. Donne un nouveau nom pour chaque rang, dans le même ordre, du meilleur au moins bon :
- tous tirés de l'univers du thème : son vocabulaire, ses objets, ses expressions, ce que les cartes en montrent. Jamais un simple jugement qui irait à n'importe quelle liste (« Excellent », « Moyen », « Nul ») : même sérieux, le nom parle du thème (pour des fromages : « Grand cru », « Bien affiné », « Trop jeune ») ;
- une même image filée du meilleur au moins bon, pour que la série soit cohérente ;
- qui disent clairement la gradation : on comprend lequel est meilleur sans voir la position ;
- en français, très courts : 1 ou 2 mots, 14 caractères au plus, aucun mot de plus de 10 lettres, pour tenir dans une colonne étroite ;
- tous différents, sans numéro, sans guillemets, sans emoji ;
- jamais blessants envers des personnes ou des groupes ; grossiers seulement si le ton le demande, et alors sans rien de sexuel ni de haineux.
Si le thème est haineux, sexuel ou violent envers des personnes, renvoie une liste vide.`;

const TIERS_SCHEMA = {
  type: "object",
  properties: { labels: { type: "array", items: { type: "string" } } },
  required: ["labels"],
  additionalProperties: false,
};

const CONCEPTS_SYSTEM = `Tu choisis les icônes des cartes d'une tier list. On te donne le thème de la liste et des noms de cartes, dans l'ordre.
Pour chaque carte, donne un « concept » : un nom anglais simple en kebab-case, au singulier, désignant l'objet à dessiner, lu dans le sens du thème.
Un mot à plusieurs sens est dit sans ambiguïté : « Rose » parmi des couleurs -> "pink-paint-splash", parmi des fleurs -> "rose-flower". Une couleur ou une matière se montre en tache de peinture de la teinte, pas en objet de cette couleur. Une idée difficile à dessiner prend un objet qui la symbolise ; une personne réelle connue, son buste : "bust-" suivi de son prénom et de son nom (« Barack Obama » -> "bust-barack-obama") ; une marque ou une œuvre, un objet générique évocateur, jamais un logo.
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

/**
 * Runs a paid generation and writes what it really cost next to what the player paid
 * (ai_costs), success or not: a failure we paid for and didn't charge counts too.
 */
async function tracked<T>(kind: CostKind, run: (meter: Meter) => Promise<{ value: T; balance: number; charged: number }>) {
  const meter = newMeter();
  let charged = 0;
  let ok = false;
  try {
    const out = await run(meter);
    charged = out.charged;
    ok = true;
    return out;
  } finally {
    // Also a generation that cost nothing and was paid (every image already in the
    // library): the reuse is where the margin grows. Nothing called, nothing paid: no row.
    if (meter.calls || charged) {
      const { error } = await db.from("ai_costs").insert(costRow(kind, meter, charged, ok));
      if (error) console.error("ai_costs", error.message);
    }
  }
}

/** A library picture drawn before the stickers (no white border of its own). */
const OLD_PICTURE = "%-sticker.png";

/**
 * Redraws one sheet of the library as die-cut stickers: the oldest concepts whose picture
 * has no border yet. The new picture becomes the concept's own, and every older picture
 * of the concept (redraws included) points to it, for the cards already in players' lists.
 * `skip`: concepts that came out empty in an earlier sheet, not asked again.
 */
async function redrawLibrary(skip: string[]) {
  const { data: rows, error } = await db
    .from("card_icons")
    .select("concept, label")
    .not("image", "is", null)
    .not("image", "like", OLD_PICTURE)
    .order("created_at")
    .limit(20 + skip.length);
  if (error) throw new Error(error.message);
  const todo = (rows ?? []).filter((r: { concept: string }) => !skip.includes(r.concept)).slice(0, 20);
  if (!todo?.length) return { drawn: [], failed: [], left: 0 };
  const plan = todo.map((r: { concept: string; label: string | null }) => ({ concept: r.concept, label: r.label || r.concept.replace(/-/g, " ") }));
  const meter = newMeter();
  let tiles: (Uint8Array | null)[] = [];
  try {
    tiles = await drawWithFallback(plan, (cards) => drawSheet(cards, meter));
  } finally {
    // What Gemini cost, kept with the players' generations (charged nothing).
    await db.from("ai_costs").insert(costRow("images", meter, 0, tiles.some(Boolean)));
  }
  const drawn: string[] = [], failed: string[] = [];
  await Promise.all(plan.map(async (card, i) => {
    const png = tiles[i];
    if (!png) return void failed.push(card.concept);
    const path = `${card.concept}-${Date.now().toString(36)}-sticker.png`;
    const up = await db.storage.from("card-icons").upload(path, png, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
    if (up.error) return void failed.push(card.concept);
    const image = db.storage.from("card-icons").getPublicUrl(path).data.publicUrl;
    await db.from("card_icon_images").update({ replaced_by: image }).eq("concept", card.concept).not("image", "like", OLD_PICTURE);
    await db.from("card_icon_images").insert({ image, concept: card.concept, label: card.label });
    await db.from("card_icons").update({ image }).eq("concept", card.concept);
    drawn.push(card.concept);
  }));
  const { count } = await db.from("card_icons").select("concept", { count: "exact", head: true }).not("image", "is", null).not("image", "like", OLD_PICTURE);
  return { drawn, failed, left: count ?? 0 };
}

/** A daily limit of the device (ai_allow) reached: nothing is charged. */
class QuotaError extends Error {}

async function allow(deviceId: string, kind: "words" | "icon") {
  const { data } = await db.rpc("ai_allow", { device_id: deviceId, kind });
  if (!data) throw new QuotaError("quota");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: Record<string, unknown>;
  try {
    // Every text of a request ends up in a prompt: a bounded request, a bounded bill.
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: "too large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "bad request" }, 400);
  }
  // Admin only: a key whose SHA-256 is in private.admin_tokens (admin_token_ok).
  if (body.action === "redraw") {
    const token = req.headers.get("x-admin-secret") ?? "";
    const { data: ok } = token.length >= 32 ? await db.rpc("admin_token_ok", { token }) : { data: false };
    if (ok !== true) return json({ error: "forbidden" }, 403);
    try {
      return json(await redrawLibrary(Array.isArray(body.skip) ? body.skip.map(String) : []));
    } catch (e) {
      console.error("redraw", e);
      return json({ error: e instanceof Error ? e.message : "failed" }, 502);
    }
  }
  const deviceId = String(body.deviceId ?? "");
  if (!UUID.test(deviceId)) return json({ error: "bad request" }, 400);
  const wallet = String(body.wallet ?? "");

  try {
    if (body.action === "challenge") {
      const { data, error } = await db.rpc("attest_challenge");
      if (error) throw new Error(error.message);
      return json({ challenge: data });
    }

    if (body.action === "wallet") {
      if (wallet.length < 32) return json({ error: "bad request" }, 400);
      const opened = await db.rpc("wallet_open", { secret: wallet });
      if (opened.error) throw new Error(opened.error.message);
      let balance = opened.data as number;
      let attested = false;
      const attestation = String(body.attestation ?? ""), keyId = String(body.keyId ?? ""), challenge = String(body.challenge ?? "");
      if (attestation && keyId && challenge) {
        try {
          // Issued by us, less than 5 minutes ago, and never used: no replay.
          const { data: fresh } = await db.rpc("attest_take", { challenge });
          if (!fresh) throw new Error("challenge");
          await verifyAttestation({ attestation, challenge, keyId, ...APP });
          const welcomed = await db.rpc("wallet_welcome", { secret: wallet, key_id: keyId, amount: WELCOME_BONUS });
          if (welcomed.error) throw new Error(welcomed.error.message);
          balance = welcomed.data as number;
          attested = true;
        } catch (e) {
          // The wallet works all the same, without the welcome bonus.
          console.error("attest", e instanceof Error ? e.message : e);
        }
      }
      return json({ balance, attested });
    }

    if (body.action === "purchase") {
      if (wallet.length < 32) return json({ error: "bad request" }, 400);
      let bought;
      try {
        bought = await verifyTransaction(String(body.transaction ?? ""), { bundleId: APP.bundleId });
      } catch (e) {
        console.error("purchase", e instanceof Error ? e.message : e);
        return json({ error: "purchase" }, 400);
      }
      const { data, error } = await db.rpc("wallet_purchase", {
        secret: wallet,
        transaction_id: bought.transactionId,
        product_id: bought.productId,
        credits: bought.credits,
        environment: bought.environment,
      });
      if (error) {
        if (error.message.includes("wallet")) throw new WalletError("wallet");
        // Free TestFlight purchases: 2000 credits a month per wallet (wallet_purchase).
        if (error.message.includes("sandbox limit")) return json({ error: "sandbox" }, 403);
        throw new Error(error.message);
      }
      const row = (data as { balance: number; credited: boolean }[])[0];
      // Already credited (sent again after a crash): the app finishes it all the same.
      return json({ balance: row.balance, credited: row.credited, credits: bought.credits });
    }

    if (body.action === "icon") return json({ error: "gone" }, 410);
    if (body.action === "words") {
      const theme = String(body.theme ?? "").trim().slice(0, 80);
      // From 1: replacing a single card asks for a single word, and pays for one.
      const count = Math.min(20, Math.max(1, Math.round(Number(body.count) || 10)));
      const existing = texts(body.existing, 60, 40);
      if (!theme) return json({ error: "theme" }, 400);
      const out = await tracked("words", (meter) => paid(db.rpc.bind(db), wallet, "words", count, async () => {
        // The daily quota counts paid requests only: no wallet, no credits, no quota spent.
        await allow(deviceId, "words");
        const drawn = await libraryHint();
        const result = await ask(
          CARDS_MODEL,
          "low",
          inLanguage(WORDS_SYSTEM, langOf(body.lang)),
          `Thème : ${theme}\nNombre de cartes : ${count}\nCartes déjà présentes : ${existing.join(", ") || "aucune"}\nBibliothèque déjà dessinée : ${drawn}`,
          WORDS_SCHEMA,
          4000,
          meter,
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
        if (kept.length === 0) throw new Error("refused");
        const concepts = uniqueConcepts(kept);
        const cards = kept.map((c, i) => ({ ...c, concept: concepts[i] }));
        // Every concept proposed joins the wishlist: free cells of later sheets draw it.
        await db.from("icon_wishlist").upsert(cards.map((c) => ({ concept: c.concept, label: c.label })), { onConflict: "concept", ignoreDuplicates: true });
        return { delivered: cards.length, value: cards };
      }));
      return json({ cards: out.value, balance: out.balance });
    }

    if (body.action === "tiers") {
      const theme = String(body.theme ?? "").trim().slice(0, 80);
      const tone = String(body.tone ?? "") as Tone;
      const current = (Array.isArray(body.current) ? body.current : []).map((l) => String(l).slice(0, 50)).slice(0, 12);
      const cards = (Array.isArray(body.cards) ? body.cards : []).map((l) => String(l).slice(0, 40)).slice(0, 12);
      if (!theme || !(tone in TONES) || current.length === 0) return json({ error: "bad request" }, 400);
      const out = await tracked("tiers", (meter) => paid(db.rpc.bind(db), wallet, "tiers", current.length, async () => {
        await allow(deviceId, "words");
        const result = await ask(
          TIERS_MODEL,
          "low",
          inLanguage(TIERS_SYSTEM, langOf(body.lang)),
          `Thème : ${theme}\nTon : ${TONES[tone]}\nRangs actuels (${current.length}, du meilleur au moins bon) : ${current.join(" | ")}\nQuelques cartes de la liste : ${cards.join(", ") || "aucune"}`,
          TIERS_SCHEMA,
          1000,
          meter,
        );
        const raw = (result.labels ?? []) as unknown[];
        if (raw.length === 0) throw new Error("refused");
        const labels = cleanTierLabels(raw, current);
        // A name kept (missing, too long, twice) isn't charged.
        return { delivered: labels.filter((l, i) => l !== current[i]).length, value: labels };
      }));
      return json({ labels: out.value, balance: out.balance });
    }

    if (body.action === "icons") {
      const theme = String(body.theme ?? "").trim().slice(0, 80);
      // One sheet holds 20 icons: the app splits beyond that. More would be dropped
      // without a word, the player seeing them as failed drawings: refused instead.
      if (Array.isArray(body.cards) && body.cards.length > 20) return json({ error: "bad request" }, 400);
      let asked = (Array.isArray(body.cards) ? body.cards : []).map((c: { label?: unknown; concept?: unknown; redraw?: unknown }) => ({
        label: String(c?.label ?? "").trim().slice(0, 40),
        concept: normalizeConcept(String(c?.concept ?? "")),
        theme: theme || undefined,
        redraw: c?.redraw === true,
      })).filter((c: { label: string; concept: string }) => c.label || c.concept);
      if (asked.length === 0) return json({ error: "bad request" }, 400);
      const out = await tracked("images", (meter) => paid(db.rpc.bind(db), wallet, "images", asked.length, async () => {
        // Cards without a concept (added by hand, renamed): read in the theme's sense, or
        // "Rose" would get whichever rose the library drew first, flower or colour.
        const bare = asked.filter((c: { concept: string }) => !c.concept);
        let proposed: string[] = [];
        if (bare.length && theme) {
          // A Claude call: bounded like the words.
          await allow(deviceId, "words");
          try {
            const result = await ask(
              CARDS_MODEL,
              "low",
              CONCEPTS_SYSTEM,
              `Thème : ${theme}\nCartes : ${bare.map((c: { label: string }) => c.label).join(" | ")}\nBibliothèque déjà dessinée : ${await libraryHint()}`,
              CONCEPTS_SCHEMA,
              2000,
              meter,
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
          await allow(deviceId, "icon");
          const { data: wish } = await db.from("icon_wishlist").select("concept, label").order("created_at").limit(40);
          const pending = (wish ?? []).filter((w: { concept: string }) => !urls.has(w.concept));
          // The AI's own words for the concepts it proposed: those alone go to the library.
          const { data: described } = await db.from("icon_wishlist").select("concept, label").in("concept", missing.map((c) => c.concept));
          const wishlist = new Map<string, string>([...(described ?? []), ...pending].map((w: { concept: string; label: string }) => [w.concept, w.label]));
          const { cards: plan, shared } = trustForLibrary(fillSheet(missing, pending as { concept: string; label: string }[]), wishlist);
          // A face Gemini refuses would lose the whole sheet: drawn again without the busts.
          const tiles = await drawWithFallback(plan, (cards) => drawSheet(cards, meter));
          const drawn: { concept: string; label: string; image: string }[] = [];
          await Promise.all(plan.map(async (card, i) => {
            const png = tiles[i];
            if (!png) return;
            // Name unique to this drawing: the CDN and the players' copies keep a file a
            // year, a concept redrawn under the same name would stay the old picture.
            // "-sticker": drawn with its own white border, the app adds none (STICKER_FILE).
            const path = `${card.concept}-${Date.now().toString(36)}-sticker.png`;
            const { error } = await db.storage.from("card-icons").upload(path, png, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
            if (error) return console.error("upload", card.concept, error.message);
            const image = db.storage.from("card-icons").getPublicUrl(path).data.publicUrl;
            drawn.push({ concept: card.concept, label: card.label, image });
            urls.set(card.concept, image);
          }));
          if (drawn.length) {
            // A redrawn concept keeps its library image (other players' lists use it); the
            // new one is added beside it, and goes to the card that asked for it.
            const fresh = drawn.filter((d) => !alreadyDrawn.has(d.concept) && shared.has(d.concept));
            if (fresh.length) await db.from("card_icons").upsert(fresh, { onConflict: "concept" });
            await db.from("card_icon_images").insert(drawn);
            await db.from("icon_wishlist").delete().in("concept", drawn.map((d) => d.concept));
          }
        }
        const icons = asked.map((c: { concept: string }) => ({ concept: c.concept, url: urls.get(c.concept) ?? null }));
        return { delivered: icons.filter((i) => i.url).length, value: icons };
      }));
      return json({ icons: out.value, balance: out.balance });
    }

    return json({ error: "bad request" }, 400);
  } catch (e) {
    if (e instanceof WalletError) return json({ error: e.code }, e.code === "credits" ? 402 : e.code === "blocked" ? 403 : 401);
    if (e instanceof QuotaError) return json({ error: "quota" }, 429);
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

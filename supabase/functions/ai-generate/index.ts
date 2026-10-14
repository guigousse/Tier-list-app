// AI tier list generation, called by the app (the AI key never ships in the app).
//   { action: "words", deviceId, theme, count, existing } -> { cards: [{ label, emoji, concept }] }
//   { action: "icon", deviceId, label, concept }          -> { concept, svg, reused }
// Icons go to a shared library (table card_icons): a concept drawn once is reused
// by every player. Per-device and global daily quotas (ai_allow) bound the bill.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

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
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

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
      const result = await ask(
        WORDS_MODEL,
        "low",
        WORDS_SYSTEM,
        `Thème : ${theme}\nNombre de cartes : ${count}\nCartes déjà présentes : ${existing.join(", ") || "aucune"}`,
        WORDS_SCHEMA,
        4000,
      );
      const seen = new Set(existing.map((e) => e.toLowerCase()));
      const cards = ((result.cards ?? []) as { label: string; emoji: string; concept: string }[])
        .map((c) => ({
          label: String(c.label).trim().slice(0, 40),
          emoji: String(c.emoji).trim().slice(0, 8),
          concept: slug(String(c.concept || c.label)),
        }))
        .filter((c) => {
          const key = c.label.toLowerCase();
          if (!c.label || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, count);
      if (cards.length === 0) return json({ error: "theme refused" }, 422);
      return json({ cards });
    }

    if (body.action === "icon") {
      const label = String(body.label ?? "").trim().slice(0, 40);
      const concept = slug(String(body.concept || label));
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

    return json({ error: "bad request" }, 400);
  } catch (e) {
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

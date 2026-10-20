# Card icons pipeline

How the vector icons on cards are made, to reuse when players create their own tier lists with AI.

## Style (validated)

- The badge sticker drawings (`src/lib/stickers.ts`). Pictures drawn on a Gemini sheet keep **their white die-cut border** (since 2026-10-20): only the magenta background is removed, and the file is named `…-sticker.png` so the app's previews don't draw a second border around it. Older library pictures have none: the previews still draw it for them.
- viewBox `0 0 100 100`, dark warm outline (`#2A1B14`, ~2.4 wide), flat colours plus one shade and one highlight per shape.
- A soft drop shadow under the drawing (silhouette, black, 22 % opacity, shifted 3 down).
- Rendered by `cardIconSvg(id)` in `src/lib/cardIcons.ts`, shown by `CardIcon` in `CardView`.

## Rules

1. **One drawing per concept, reused everywhere.** A pizza is drawn once; every card named "Pizza" in any list uses it (`CARD_ICON_FOR`: card name → icon id).
2. **Ideas hard to draw get an object that stands for them.** Walk → hiking boot; Sleep / Grasse matinée → bed; Housework → broom; Family meal → casserole; Sport → dumbbell; Bath → rubber duck.
3. **Keep it simple.** Readable at ~55 px on a coloured card: few shapes, no fine detail.
4. **Photos win.** A card with a photo keeps its photo; with no drawn icon, the emoji stays.

## Steps for a new list

1. List its cards; map each to an existing icon id when one fits (reuse first).
2. Draw only the missing concepts (silhouette + art), following the style above.
3. Render a preview grid on the card colours (Playwright, see `scratchpad` scripts of the session) and check it at card size.
4. Add the mappings to `CARD_ICON_FOR`.

## For AI-made tier lists (later)

- The AI suggests cards; each card name is matched to the icon library (exact name, then synonyms, then the item's emoji).
- Missing concepts: generate a drawing following the rules above, check it, add it to the shared library so the next list reuses it.
- Store icons online (Supabase, one row per icon id with its SVG) rather than in the app, so the library grows without app updates and the bundle stays small (~1–4 KB per icon).

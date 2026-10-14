# Monetisation plan (AI credits) — to implement later

Decided with the owner on 2026-10-14. Nothing is implemented yet.
Interactive simulation: https://claude.ai/artifact/HK6QyGXXvr4SrnESHx1iQh

## AI services

1. **Word list**: a tier list title → 3–20 cards, priced per card. AI cost ≈ 0.01 € per list.
2. **Icons** for the cards (vector, see `docs/card-icons-pipeline.md`), priced per image.
   Reused library icons cost nothing to produce. Measured costs below.

## Credits

- **No free weekly credits** (decided 2026-10-14): they were the main cost.
- **Welcome bonus** at sign-up, the only free credits (20 in the proposed scale).
- **Packs** (consumable in-app purchases):

  | Price | Credits |
  |---|---|
  | 0.99 € | 10 |
  | 1.99 € | 25 (highlighted) |
  | 4.99 € | 70 |
  | 9.99 € | 160 (best price) |

## Tiercraft+ (auto-renewable subscription)

- 2.99 € / month or 19.99 € / year (yearly shown as the obvious choice).
- Weekly credits (70 in the proposed scale), capped at twice that.
- Can **propose tier lists to be made public** (moderation queue, the owner approves).
- Cheap extras: exclusive "+" badge and avatar items, creator name on published lists, no ads.

## Measured AI costs (2026-10-14, Claude Opus 5.5 kept for quality)

- Card names: 12 names ≈ 1.06 ¢ $ (≈ 0.09 ¢ $ per card), 4–5 s. Sonnet 5.5 is half the
  price but put hummus in "Greek dishes"; Haiku 5.5 is 40× cheaper but gives vaguer
  concepts (`spinach` instead of `spinach-pie`), which spoils the icon drawn from them.
- New icon: ≈ 3.6 ¢ $ on average (2.6–5.0 ¢ $), ≈ 13 s. Sonnet 5.5 is 1.5 ¢ $ but
  visibly less detailed. A reused library icon costs nothing.
- **Chosen instead: Gemini sheets** (comparison https://claude.ai/artifact/5spNptA4YyHoPDWYPXnSjF).
  One picture for a whole list, cut on the server (`supabase/functions/ai-generate/sheet.ts`):
  Gemini 3 Pro Image 2K ≈ 0.134 $ per sheet, i.e. ≈ 1.1–1.4 ¢ $ per icon on a full
  sheet, ≈ 25 s; richer drawings than the SVG and one consistent style. Flash Image
  is 0.039 $ per sheet but uneven. A 1K and a 2K picture cost the same: sheets are
  never drawn smaller, their free cells draw concepts from `icon_wishlist`.
- So a 10-card illustrated list ≈ 37 ¢ $, 98 % of it for icons.

## Economics (simulation, measured costs)

- Net per sale ≈ price / 1.2 (VAT) × 0.85 (Apple, Small Business Program).
- Fixed costs ≈ 31 €/month (Supabase Pro + Apple developer account).
- Net revenue is only ≈ 0.07 € per active player per month, so **free credits decide
  everything**: a free illustrated list (≈ 0.23 € of AI) given to every new player
  sinks the model. Hence no free weekly credits, only a welcome bonus.
- The app's current scale (1 credit per card, 5 per image) with the old packs
  (25 credits for 1.99 €) is profitable but makes an illustrated list cost 4.78 €.
- **Adopted scale** (2026-10-14): 1 credit per card; images **12 credits per list plus
  3 per image** (degressive: 7 per image for 3 cards, 4.2 for 10, 3.6 for 20), because
  all the icons of a list are drawn on one Gemini 3 Pro Image sheet (~0.134 $ whatever
  the number of icons, free cells draw wishlist concepts ahead). 100 credits for
  1.99 €, 20 welcome credits, no weekly gift, Tiercraft+ 70 credits a week. An
  illustrated 10-card list = 52 credits ≈ 1.03 €.
- Safety valve: if monthly AI cost > ~30 % of net revenue, lower the welcome bonus first.

## Implementation notes

- AI calls server-side only (Supabase edge function), never an AI key in the app;
  rate limiting; title filter (same as pseudos).
- Apple in-app purchases only (consumables + subscription), "Restore purchases",
  terms page. Credits tied to the profile (Keychain).
- Rewarded ads (+1 credit) possible later (needs GDPR consent).
- Measure real usage before fixing prices: purchase rates, icon reuse, credits spent.

# Monetisation plan (AI credits)

Decided with the owner on 2026-10-14. Credits are real since 2026-10-15 (see
"Implementation" below); the in-app purchases that sell them are still to do.
Interactive simulation: https://claude.ai/artifact/HK6QyGXXvr4SrnESHx1iQh

## AI services

1. **Word list**: a tier list title → 3–20 cards, priced per card. AI cost ≈ 0.01 € per list.
2. **Icons** for the cards (vector, see `docs/card-icons-pipeline.md`), priced per image.
   Reused library icons cost nothing to produce. Measured costs below.

## Credits

- **No free weekly credits** (decided 2026-10-14): they were the main cost.
- **Welcome bonus**, the only free credits: **30** (a 10-card illustrated list is 28),
  once per wallet and per App Attest key.
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
- **Adopted scale** (2026-10-15, the sweet spot): **1 credit ≈ 1 cent** (200 credits
  for 1.99 €); 1 credit per card; images **8 credits per sheet plus 1 per image**
  (3 images = 11 credits, 10 = 18, 20 = 28). A sheet costs ≈ 12.1 c€ and a credit nets
  ≈ 0.71 c€: with every icon to draw, images alone pay for the sheet from 10 of them
  (18 credits ≈ 12.7 c€), and a 5-card list with its words and images breaks even.
  Small requests lose a little (3 images ≈ −4.3 c€), 20 images earn ≈ +7.7 c€. The
  margin comes from reuse (a reused icon is paid by the player, free for us) and from
  the icons free cells draw ahead. The earlier 2 + 1 lost money below ~15 images.
  Watch the reuse rate.
- Same scale for the other AI tabs (2026-10-14): a card whose word is replaced costs
  1 credit, like a new card; renaming the tiers costs **1 credit per tier** (one Opus
  call, effort low, ≈ 1 c€ whatever the tier count); a redrawn image counts as an
  image. Cards added by hand or renamed are read in the theme before drawing (one
  extra Opus call, ≈ 1 c€, not charged).
- **Charge only what was delivered** (rule for when credits are real, 2026-10-15): the
  credits are taken on the server once the result is saved, per card or image actually
  received. A failed generation costs the player nothing, even when it cost us (a
  sheet lost after Gemini was paid: twice on the presidents list, before the cutting
  fit in the edge function's 2 s of CPU).
- Safety valve: if monthly AI cost > ~30 % of net revenue, lower the welcome bonus first.

## Implementation (2026-10-15)

- **The balance lives on the server only** (`supabase/migrations/20261015010000_credits.sql`):
  tables `credit_wallets`, `credit_holds`, `credit_ledger` (every movement), with row
  security on and no rights for the app's key. Only the `ai-generate` edge function
  (service role) can call the wallet functions. The app shows the balance it is given.
- **The price is set on the server** (`supabase/functions/ai-generate/pricing.ts`): the
  app sends what it wants generated, never a price. `src/lib/aiGenerate.ts` shows the
  same scale for the estimate.
- A wallet is reached by a random 64-character secret made on the phone and kept in
  the Keychain with the identity (the database stores its SHA-256), so a reinstall
  keeps its credits.
- **Hold, then settle** (`wallet.ts`): the maximum price is held atomically before the
  AI is called (an empty wallet never reaches it, two requests can't spend the same
  credits), then only what was delivered is kept; a failure gives everything back, and
  a hold left open by a request that died is refunded after 10 minutes.
- **Welcome bonus guarded by Apple App Attest** (`appAttest.ts`, Apple's 9 steps,
  checked against real attestations): only a genuine copy of the app on a real iPhone
  gets it, once per wallet and once per device key; challenges are single-use and
  expire in 5 minutes. No entitlement is needed: TestFlight and App Store builds
  attest in production, the only environment accepted. A wallet without attestation
  works, it just gets no bonus.
- Credits for tests or support: `select public.wallet_grant(<wallet id>, <amount>, '<reason>')`.
- Still to do: the in-app purchases (App Store Connect products, receipt check on the
  server calling `wallet_grant`), Android (Play Integrity instead of App Attest).

## Implementation notes

- AI calls server-side only (Supabase edge function), never an AI key in the app;
  rate limiting; title filter (same as pseudos).
- Apple in-app purchases only (consumables + subscription), "Restore purchases",
  terms page. Credits tied to the profile (Keychain).
- Rewarded ads (+1 credit) possible later (needs GDPR consent).
- Measure real usage before fixing prices: purchase rates, icon reuse, credits spent.

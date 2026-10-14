# Monetisation plan (AI credits) — to implement later

Decided with the owner on 2026-10-14. Nothing is implemented yet.
Interactive simulation: https://claude.ai/artifact/HK6QyGXXvr4SrnESHx1iQh

## AI services

1. **Word list**: a tier list title → 10–15 cards. **1 credit.** AI cost < 0.01 €.
2. **Icons** for the cards (vector, see `docs/card-icons-pipeline.md`). **5 credits**
   (option: "up to 5", only new icons cost; reused library icons are free).
   AI cost 0.05–0.30 € per set of ~12 new icons, falling as the shared library grows.

## Credits

- **Free**: 3 credits per week, **capped at 6** (no hoarding).
- **Welcome bonus**: 10 credits at sign-up, so every new player tries icons once.
- **Packs** (consumable in-app purchases):

  | Price | Credits |
  |---|---|
  | 0.99 € | 10 |
  | 1.99 € | 25 (highlighted) |
  | 4.99 € | 70 |
  | 9.99 € | 160 (best price) |

## Tiercraft+ (auto-renewable subscription)

- 2.99 € / month or 19.99 € / year (yearly shown as the obvious choice).
- 20 credits per week, cap 40.
- Can **propose tier lists to be made public** (moderation queue, the owner approves).
- Cheap extras: exclusive "+" badge and avatar items, creator name on published lists, no ads.

## Economics (simulation)

- Net per sale ≈ price / 1.2 (VAT) × 0.85 (Apple, Small Business Program).
- Fixed costs ≈ 31 €/month (Supabase Pro + Apple developer account).
- The cost of a credit decides everything: with icons at 0.15 € and 40 % reuse, a credit
  costs ≈ 0.014 € and the model loses money as players grow (free credits dominate).
- **Targets**: icon set < 0.08 € (cheaper model, draw only missing concepts, pre-fill the
  library with common icons) and high reuse → credit ≈ 0.004–0.006 €, profitable from
  ~1,000 monthly active players (≈ +680 €/month at 10,000 with a realistic mix).
- Safety valve: if monthly AI cost > ~30 % of net revenue, lower the welcome bonus or
  make icons 6 credits.

## Implementation notes

- AI calls server-side only (Supabase edge function), never an AI key in the app;
  rate limiting; title filter (same as pseudos).
- Apple in-app purchases only (consumables + subscription), "Restore purchases",
  terms page. Credits tied to the profile (Keychain).
- Rewarded ads (+1 credit) possible later (needs GDPR consent).
- Measure real usage before fixing prices: purchase rates, icon reuse, credits spent.

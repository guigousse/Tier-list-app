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
- **Packs** (consumable in-app purchases, decided 2026-10-15; products
  `tiercraft.energy.<credits>` in App Store Connect, same list in
  `supabase/functions/ai-generate/purchase.ts` and `src/lib/shop.ts`):

  | Price | Credits | c/credit incl. VAT | Net c€/credit | Bonus vs 0.99 € | Margin at worst cost |
  |---|---|---|---|---|---|
  | 0.99 € | 60 | 1.65 | 1.17 | — (way in) | +80 % |
  | 2.99 € | 200 | 1.50 | 1.06 | +10 % | +63 % |
  | 4.99 € | 360 | 1.39 | 0.98 | +19 % ("Le plus choisi") | +51 % |
  | 9.99 € | 800 | 1.25 | 0.89 | +32 % | +37 % |
  | 19.99 € | 1750 | 1.14 | 0.81 | +44 % ("Meilleur prix") | +25 % |

  Net = price / 1.2 (VAT) × 0.85 (Small Business Program). "Worst cost" = 0.65 c€ a
  credit: the smallest image request, 3 new images on cards without a concept (sheet
  6.1 c€ + concept call 1 c€ for 11 credits), since the sheets moved to Gemini 3.1 Flash
  (2026-10-15; with 3 Pro, at 12.1 c€ a sheet, requests under ~8 icons lost money).
  10 new images cost 0.39 c€ a credit; a full 10-card list (words, images, tiers:
  33 credits, ≈ 8 c€) 0.25 c€, where even the biggest pack earns +230 %.
  A pack is ≈ 2 / 7 / 12 / 28 / 62 illustrated lists of 10 cards (28 credits each).
  The 0.99 € pack is the way in, 4.99 € the one the eye lands on, 19.99 € the anchor.
  Without the Small Business Program (30 % to Apple) every net figure is × 0.82: the
  19.99 € pack would sit at 0.67 c€, barely above the worst cost, so stay enrolled.

## Tiercraft+ (auto-renewable subscription)

- 2.99 € / month or 19.99 € / year (yearly shown as the obvious choice).
- Weekly credits (70 in the proposed scale), capped at twice that.
- Can **propose tier lists to be made public** (moderation queue, the owner approves).
- Cheap extras: exclusive "+" badge and avatar items, creator name on published lists, no ads.

## Measured AI costs (2026-10-14; cards on Sonnet 5.5 since 2026-10-16, see below)

- Card names: 12 names ≈ 1.06 ¢ $ (≈ 0.09 ¢ $ per card), 4–5 s. Sonnet 5.5 is half the
  price but put hummus in "Greek dishes"; Haiku 5.5 is 40× cheaper but gives vaguer
  concepts (`spinach` instead of `spinach-pie`), which spoils the icon drawn from them.
- New icon: ≈ 3.6 ¢ $ on average (2.6–5.0 ¢ $), ≈ 13 s. Sonnet 5.5 is 1.5 ¢ $ but
  visibly less detailed. A reused library icon costs nothing.
- **Chosen instead: Gemini sheets** (comparison https://claude.ai/artifact/5spNptA4YyHoPDWYPXnSjF).
  One picture for a whole list, cut on the server (`supabase/functions/ai-generate/sheet.ts`);
  richer drawings than the SVG and one consistent style. A sheet costs the same for
  3 icons or 20: sheets are never drawn smaller, their free cells draw concepts from
  `icon_wishlist`.
- **Model: Gemini 3.1 Flash Image at 1K** (2026-10-15, comparison
  https://claude.ai/artifact/XAACTS95F2xuWbSUropWqw): ≈ 6.8 ¢ $ (≈ 6.1 c€) per sheet,
  ≈ 10 s. Same prompt and cutting as before on Greek dishes and presidents, 12 and 20
  cells: same style, faces as recognizable. It replaced Gemini 3 Pro Image 2K
  (≈ 13.9 ¢ $ with its thinking, ≈ 21 s). Flash 3.1 at 2K (10.1 ¢ $) showed no gain and
  white sticker rims; Gemini 2.5 Flash Image (3.9 ¢ $) loses the style and the faces.
- So a 10-card illustrated list ≈ 9 ¢ $, ≈ 85 % of it for icons.

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
  (3 images = 11 credits, 10 = 18, 20 = 28). A credit nets ≈ 0.71 c€. With 3 Pro
  sheets (≈ 12.1 c€) images paid for the sheet only from 10 of them and 3 images lost
  ≈ 4.3 c€; with Flash 3.1 sheets (≈ 6.1 c€, since 2026-10-15) every request earns,
  even 3 images with their concept call (≈ +0.7 c€), and 20 images ≈ +12.8 c€. Reuse
  (a reused icon is paid by the player, free for us) and the icons free cells draw
  ahead add to that margin. The scale was kept as is.
- Same scale for the other AI tabs (2026-10-14): a card whose word is replaced costs
  1 credit, like a new card; renaming the tiers costs **1 credit per tier** (one Opus
  call, effort low, ≈ 1 c€ whatever the tier count); a redrawn image counts as an
  image. Cards added by hand or renamed are read in the theme before drawing (one
  extra Opus call, ≈ 1 c€, not charged).
- **Texte : 3 crédits fixes par génération** (2026-10-16), cartes écrites ou remplacées
  comme rangs renommés, quel qu'en soit le nombre : un seul appel écrit tout et son coût
  dépend peu du nombre. **Mesuré le 16 octobre** (consigne réelle, 12 cartes, 166
  concepts dans la bibliothèque, 7 thèmes) : ≈ 2 520 jetons en entrée, ≈ 400 en
  sortie ; **Opus 5.5 ≈ 1,8 ¢ $**, **Sonnet 5.5 ≈ 0,9 ¢ $** (tarifs 4 $ / 20 $ et 2 $ /
  10 $ le million de jetons). Mêmes cartes et mêmes concepts sur Plats grecs, Couleurs,
  Fromages, Fleurs, Jeux vidéo, Sports d'hiver ; sur les présidents de la Ve
  République, Sonnet s'arrête aux 9 vrais quand Opus complète avec « Élysée » et
  « Cohabitation ». Latence de Sonnet stable (≈ 5 s), Opus jusqu'à 17 s.
  **Cartes et concepts passent donc sur Sonnet 5.5** ; les noms de rangs (jeux de mots
  dans un ton choisi) restent sur Opus, pas encore comparés. Pire cas sur Sonnet : 20
  cartes, bibliothèque pleine (500 concepts, ≈ 4 200 jetons d'entrée) ≈ 1,5 ¢ $
  (≈ 1,4 c€). 3 crédits rapportent 2,4 c€ (pack 1 750) à 3,5 c€ (pack 60) : rentable
  partout. Sur Opus, ce pire cas (≈ 3 ¢ $) aurait été à perte avec le plus gros pack.
  Une liste de 10 cartes illustrées coûte 21 crédits (3 + 18).
- **Noms de rangs : Opus 5.5 gardé** (comparé le 16 octobre, 10 cas, les 5 tons) :
  ≈ 0,43 ¢ $ l'appel sur Opus, ≈ 0,21 ¢ $ sur Sonnet, une différence négligeable devant
  les 3 crédits. Mais Sonnet a dépassé la limite de 14 caractères dans 2 cas sur 10
  (« Festin d'Olympe », « Cendres d'Hadès », « Putain de culte ») : ces noms sont
  rejetés et le rang garde son ancien nom, alors que la génération est payée. Opus a
  tout respecté, avec des séries plus fidèles au thème (fromages en humour : « Grand
  cru / Bien coulant / Ça se tient / Un peu plâtre / Croûte à jeter » contre « Divin /
  À point / Un peu mou / Trop fait / À jeter »).
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
- **Purchases** (`purchase.ts`, migration `*_credit_purchases.sql`): the app buys with
  expo-iap (StoreKit 2) and sends the signed transaction (JWS); the server checks the
  chain up to Apple Root CA G3 (pinned by its SHA-256), Apple's OIDs on the intermediate
  and the signer, the ES256 signature, the bundle id, the product and that it isn't
  refunded, then `wallet_purchase` credits it once (the transaction id is the key).
  The app finishes the transaction only after the server answered, so a purchase made
  offline is credited at the next launch. Sandbox transactions are accepted (TestFlight
  and Apple's review buy in the sandbox).
- **Remboursements** (`refunds.ts`, fonction `appstore-notify`, migration
  `*_credit_refunds.sql`) : Apple envoie ses notifications serveur V2 à
  `https://mefhdtpyhtvplpfleyhi.supabase.co/functions/v1/appstore-notify`, vérifiées
  jusqu'à la racine comme les achats.
  - `CONSUMPTION_REQUEST` (le joueur demande un remboursement) : on répond à Apple la
    part du pack déjà dépensée (lue sur le solde) et notre préférence — rien dépensé :
    remboursement complet ; en partie : au prorata ; tout dépensé : refus. Le joueur y
    consent sous les packs. Demande les secrets `APPSTORE_IAP_KEY` (contenu du .p8 d'une
    clé « Achats intégrés »), `APPSTORE_IAP_KEY_ID` et `APPSTORE_ISSUER_ID` ; sans eux la
    demande est ignorée.
  - `REFUND` : l'énergie restante du pack est reprise, la part déjà dépensée devient une
    dette que le prochain achat rembourse en premier (`wallet_refund`, une seule fois par
    transaction). Deux remboursements après usage bloquent la génération IA du
    porte-monnaie (erreur `blocked`, 403). `REFUND_REVERSED` rend le pack, dette d'abord.
- Still to do: Android (Play Billing and Play Integrity).

## Implementation notes

- AI calls server-side only (Supabase edge function), never an AI key in the app;
  rate limiting; title filter (same as pseudos).
- Apple in-app purchases only (consumables + subscription), "Restore purchases",
  terms page. Credits tied to the profile (Keychain).
- Rewarded ads (+1 credit) possible later (needs GDPR consent).
- Measure real usage before fixing prices: purchase rates, icon reuse, credits spent.

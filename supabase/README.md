# Supabase (projet « Tiercraft »)

Base en ligne de l'app : partage par code, modèles publiés et tier list du jour.
Le schéma est dans `migrations/`. Tableau de bord :
https://supabase.com/dashboard/project/mefhdtpyhtvplpfleyhi

## Ajouter une tier list du jour

Table `daily_lists` (Table Editor ou SQL Editor). La liste d'un jour sort à
**12 h 30 heure de Paris**, pour tous les joueurs quel que soit leur fuseau
(`src/lib/dailyClock.ts`) : jusque-là, c'est encore celle de la veille. Le rappel
quotidien sonne à cette heure-là. Celles datées dans le futur restent cachées.

```sql
insert into public.daily_lists (day, title, emoji, description, items) values
('2026-11-12', 'Desserts glacés', '🍨', 'Lequel fond pour vous ?',
 array['🍦 Glace vanille', '🍧 Granité', '🍨 Sorbet citron', '🧁 Vacherin']);
```

### Revue de la semaine

Les listes à venir sont relues chaque dimanche avec Claude (tâche planifiée « Revue des
listes de la semaine ») : il présente les 7 listes de la semaine suivante, on les retouche
ensemble, puis il écrit les changements dans `daily_lists` et `content_translations`.
Une liste qui a des votes garde ses cartes (ni ajout, ni retrait, ni ordre) : seuls ses
textes, rangs, concepts et traductions changent. Les modifications ne sont pas reportées
dans `content-i18n/` : ces fichiers restent la source des listes écrites par migration.

Les rangs d'une tier list du jour sont ceux de la colonne `tiers` (cinq noms, du meilleur
au pire, traduits dans `content_translations.tiers`), et S, A, B, C, D quand elle est vide
ou n'en a pas cinq. Les votes sont rangés par position (0 à 4) : renommer les rangs ne
change pas les statistiques. Les listes du jour ne sont pas modifiables dans l'app : le
joueur classe les cartes puis valide.

## Votes et classement moyen

Table `daily_votes` (un vote par appareil et par jour, définitif), sans accès
direct : l'app envoie le classement validé via `submit_daily_vote(day, device_id,
ranks)` et lit uniquement les résultats agrégés via `get_daily_results(day)`
(nombre de votes, rang moyen et répartition par rang pour chaque carte). Ne
modifiez pas `items` d'une tier list du jour qui a déjà reçu des votes : les
votes sont rangés dans l'ordre des cartes.

## Listes publiques

Les modèles (intégrés à l'app ou de la table `templates`) apparaissent sur
l'accueil comme « Listes publiques » : cartes fixes, rangs S→D, classement à
valider. Contrairement à la tier list du jour, le joueur peut modifier son
classement et le revalider : son vote est remplacé.

Table `list_votes` (un vote par appareil et par liste), sans accès direct :
`submit_list_vote(list_key, device_id, ranks)` et `get_list_results(list_key)`.
`list_key` vaut `popular:<clé du modèle>:<empreinte des cartes>` : modifier les
cartes d'un modèle repart donc sur de nouvelles statistiques.

## Ajouter un modèle

Table `templates` : `key` unique, `title`, `emoji`, `items`, `tiers` (facultatif),
`sort` (ordre d'affichage), `published` (décocher pour le masquer). Les modèles
apparaissent dans l'écran « Modèles » après les modèles intégrés à l'app.

## Tier lists partagées

Table `shared_lists`, sans accès direct : l'app passe par les fonctions
`share_list(payload)` (renvoie un code à 6 caractères) et `get_shared_list(code)`.

## Listes envoyées entre amis

Table `list_mail`, sans accès direct : `send_list`, `get_mail`, `answer_mail`,
`rerank_mail`… L'ami classe les cartes sans voir le classement de l'expéditeur,
puis les deux classements sont comparés. Le classement de l'expéditeur
(`sender_ranks`) n'est pas figé à l'envoi : l'app le renvoie via
`set_sender_ranks(secret, mail, ranks)` quand l'expéditeur valide son classement
(jamais à chaque carte déplacée). Les listes classées entre amis comptent dans
`completed` (« listes complétées » des profils), une fois par liste.

## Crédits du parcours des listes

Supprimés : le parcours des listes ne donne plus que des objets d'avatar. Les
versions de l'app d'avant appellent encore `claim_list_credits(wallet, device_id)`,
qui délègue à `wallet_milestones` : celle-ci ne fait plus que renvoyer le solde
(`20261019030000_no_list_credits.sql`, appliquée en production par
`20261026010000_security_fixes.sql`). Les paliers déjà payés le restent
(`credit_milestones`, `credit_ledger`).

## Pub récompensée (« Énergie gratuite »)

Une pub regardée rapporte 5 crédits, une fois par semaine (fenêtre glissante de
7 jours). L'app ne dit jamais elle-même qu'une pub a été vue : elle demande un
ticket à usage unique (`ad_ticket(wallet)`, valable 1 h), le passe à la pub comme
`custom_data`, et c'est le rappel de vérification côté serveur d'AdMob qui crédite.

- Fonction Edge `ad-reward` (verify_jwt désactivé, Google appelle sans jeton) :
  vérifie la signature ECDSA de Google (clés de
  `https://www.gstatic.com/admob/reward/verifier-keys.json`), le bloc
  `7429871139`, puis appelle `ad_reward(ticket, transaction_id)` (clé service
  uniquement) → `private.ad_credit`, idempotent sur `transaction_id`.
- URL de rappel à déclarer dans AdMob (bloc récompensé → vérification côté
  serveur) : `https://mefhdtpyhtvplpfleyhi.supabase.co/functions/v1/ad-reward`
- `ad_status(wallet)` → `{available, next_at}` pour l'écran.
- Tables `ad_rewards` (une ligne par pub payée) et `ad_tickets`.
- Test : `supabase/tests/ad_rewards.sql` (doit finir sur l'erreur `OK`) ;
  `deno test supabase/functions/ad-reward/ssv.test.ts`.

## Déployer

Migrations et fonctions Edge ne partent pas toutes seules : depuis la racine du dépôt,
avec la CLI Supabase connectée au projet (`npx supabase login`, puis
`npx supabase link --project-ref mefhdtpyhtvplpfleyhi`).

```bash
npx supabase functions deploy ai-generate --no-verify-jwt
```

Toujours avec `--no-verify-jwt` (`ai-generate`, `referral-claim`, `appstore-notify`,
`ad-reward`) : l'app n'envoie que la clé publique, Apple et Google n'envoient rien, et
chaque fonction fait ses propres vérifications. Sans l'option, la CLI exige un JWT et
l'app ne peut plus les appeler.

L'historique des migrations de la production (`supabase_migrations.schema_migrations`)
ne correspond pas aux fichiers de `migrations/` : des migrations y ont été appliquées
sous d'autres numéros, d'autres à la main sans y être notées. `npx supabase db push`
rejouerait donc tout. Tant que l'historique n'est pas réparé, une nouvelle migration
s'applique seule (SQL Editor, ou `apply_migration`). Pour le réparer : marquer
appliqués tous les fichiers de `migrations/` jusqu'à `20261026000000_sync_production.sql`
compris (`npx supabase migration repair --status applied <version>…`), et retirer les
numéros qui n'ont pas de fichier (`--status reverted`). `20261026000000_sync_production.sql`
contient les fonctions telles que la production les exécutait le 2026-10-26 : n'importe
quel fichier plus ancien qui les définit autrement a été remplacé en production.

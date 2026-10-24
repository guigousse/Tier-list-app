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

Le parcours des récompenses offre 5 crédits tous les 25 listes validées (listes
populaires et tier lists du jour). L'app appelle `claim_list_credits(wallet,
device_id)` juste après l'ouverture du portefeuille ; la fonction délègue à
`wallet_milestones`, réservée au serveur, qui compte elle-même les votes de
l'appareil et ne paie chaque palier qu'une fois par portefeuille et par appareil
(table `credit_milestones`), aux seuls portefeuilles attestés par Apple. Le pas et
le montant sont écrits en dur dans `wallet_milestones` et dans `src/lib/rewards.ts`
(`CREDIT_EVERY`, `CREDIT_AMOUNT`) : les changer aux deux endroits.

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

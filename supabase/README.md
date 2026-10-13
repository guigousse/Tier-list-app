# Supabase (projet « Tiercraft »)

Base en ligne de l'app : partage par code, modèles publiés et tier list du jour.
Le schéma est dans `migrations/`. Tableau de bord :
https://supabase.com/dashboard/project/mefhdtpyhtvplpfleyhi

## Ajouter une tier list du jour

Table `daily_lists` (Table Editor ou SQL Editor). L'app affiche la plus récente
dont la date est passée ; celles datées dans le futur restent cachées.

```sql
insert into public.daily_lists (day, title, emoji, description, items) values
('2026-11-12', 'Desserts glacés', '🍨', 'Lequel fond pour vous ?',
 array['🍦 Glace vanille', '🍧 Granité', '🍨 Sorbet citron', '🧁 Vacherin']);
```

Les tier lists du jour utilisent toujours les rangs classiques S, A, B, C, D
(la colonne `tiers` est ignorée) et ne sont pas modifiables dans l'app : le
joueur classe les cartes puis valide.

## Votes et classement moyen

Table `daily_votes` (un vote par appareil et par jour, définitif), sans accès
direct : l'app envoie le classement validé via `submit_daily_vote(day, device_id,
ranks)` et lit uniquement les résultats agrégés via `get_daily_results(day)`
(nombre de votes, rang moyen et répartition par rang pour chaque carte). Ne
modifiez pas `items` d'une tier list du jour qui a déjà reçu des votes : les
votes sont rangés dans l'ordre des cartes.

## Listes populaires

Les modèles (intégrés à l'app ou de la table `templates`) apparaissent sur
l'accueil comme « Listes populaires » : cartes fixes, rangs S→D, classement à
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

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

`tiers` (facultatif) remplace les rangs par défaut, ex. `array['Top', 'Bof', 'Flop']`.

## Ajouter un modèle

Table `templates` : `key` unique, `title`, `emoji`, `items`, `tiers` (facultatif),
`sort` (ordre d'affichage), `published` (décocher pour le masquer). Les modèles
apparaissent dans l'écran « Modèles » après les modèles intégrés à l'app.

## Tier lists partagées

Table `shared_lists`, sans accès direct : l'app passe par les fonctions
`share_list(payload)` (renvoie un code à 6 caractères) et `get_shared_list(code)`.

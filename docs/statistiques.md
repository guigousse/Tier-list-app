# Statistiques de Tiercraft

Deux sources, chacune pour ce qu'elle fait de mieux.

## Le jeu et l'argent : Supabase

Le schéma `stats` (migrations `20261018010000_stats.sql` et `20261018020000_stats_names.sql`)
n'est pas visible par l'app : aucune permission pour `anon` ni `authenticated`. Une vue par
indicateur, et `stats.dashboard()` les réunit en un JSON. Test : `supabase/tests/stats.sql`.

- `stats.players`, `stats.new_players_weekly`, `stats.retention_weekly` : joueurs vus (une trace :
  vote, liste ouverte, camp choisi). Ne voit pas un joueur qui ne fait que des listes privées.
- `stats.lists_per_player`, `stats.path_funnel`, `stats.daily_participation` : engagement.
- `stats.teams`, `stats.team_pairs` : les camps des VS.
- `stats.lists`, `stats.cards` : listes jouées, cartes qui divisent ou font l'unanimité.
  `stats.builtin_cards` copie les noms des cartes des listes intégrées à l'app
  (`src/constants/presets.ts`) : à remettre à jour quand une de ces listes s'enrichit.
- `stats.social`, `stats.credits`, `stats.wallets`, `stats.purchases`, `stats.ai`.
  Les achats TestFlight (`Sandbox`) ne comptent jamais comme revenu.

Tableau de bord : l'artefact « Statistiques Tiercraft » sur claude.ai, relié en direct au
projet par le connecteur Supabase de son lecteur.

## L'audience : Firebase Analytics

Projet Firebase `tiercraft-517f4` (séparé de BROC). Fichiers dans `firebase/`.

- Rien n'est mesuré sans accord : `firebase.json` coupe la collecte au lancement,
  `src/lib/analytics.ts` ne l'ouvre que si `settings.analyticsConsent === 'granted'`.
  La question est posée une fois après la présentation (`AnalyticsConsent`), le réglage
  « Statistiques d'usage » permet de changer d'avis.
- Mesure seulement : pas d'identifiant publicitaire (`withoutAdIdSupport`), donc pas de demande
  App Tracking Transparency ; consentement publicitaire toujours refusé.
- Événements : écrans (par route, jamais un titre), `list_validated`, `share_image`, plus ce
  que Firebase mesure seul (sessions, rétention, achats).
- Côté Google Analytics : conservation des données réglée à 2 mois, signaux Google coupés
  (la politique de confidentialité l'annonce).
- iOS : frameworks statiques, Firebase par CocoaPods (`disableSPM`), React Native compilé
  depuis les sources (`expo-build-properties`).

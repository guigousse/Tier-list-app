# Fiche App Store — Tiercraft

À saisir dans App Store Connect → Tiercraft → Distribution (version 1.0).

## Informations

| Champ | Valeur | Limite |
|---|---|---|
| Nom | Tiercraft | 30 |
| Sous-titre | Tier lists : classez tout | 30 |
| Catégorie principale | Divertissement | |
| Catégorie secondaire | Réseaux sociaux | |
| Classification | 4+ (aucun contenu sensible) | |
| URL d’assistance | https://tier-list-app-share-site.vercel.app/support | |
| URL de confidentialité | https://tier-list-app-share-site.vercel.app/confidentialite | |
| URL marketing | https://tier-list-app-share-site.vercel.app | |
| Copyright | 2026 Guillaume Fenard | |

## Texte promotionnel (170 caractères, modifiable sans nouvelle version)

Chaque jour, une nouvelle tier list : classez-la, gardez votre série 🔥 et découvrez si vous êtes d’accord avec les autres joueurs !

## Description (4 000 caractères)

Pizza ou sushi ? Été ou hiver ? Avec Tiercraft, classez tout de S à D et comparez vos goûts à ceux des autres joueurs.

🎯 LA TIER LIST DU JOUR
Chaque jour, une nouvelle tier list vous attend. Classez les cartes, validez, et découvrez le classement moyen de tous les joueurs : votre score de proximité, vos choix les plus originaux et votre série de jours consécutifs.

🔥 LISTES POPULAIRES
Fruits, jeux mobiles, destinations, super-pouvoirs, fromages… Classez les listes populaires, comparez-vous à la communauté et changez d’avis quand vous voulez.

✏️ VOS PROPRES TIER LISTS
Créez une liste en un geste, renommez les rangs, ajoutez vos cartes avec une photo, l’appareil photo ou une image trouvée automatiquement sur Wikimedia. Glissez-déposez les cartes, ou touchez-les pour choisir leur rang.

👥 JOUEZ ENTRE AMIS
Créez votre profil (un pseudo et un avatar, sans e-mail), ajoutez vos amis avec leur code et comparez vos classements liste par liste : qui est le plus d’accord avec vous ? Un joueur gênant se bloque ou se signale en un geste.

📲 PARTAGEZ
Envoyez une tier list avec un code à 6 caractères ou un lien : vos amis l’ouvrent dans Tiercraft et font leur propre classement. Exportez aussi votre classement en image.

🔒 RESPECT DE LA VIE PRIVÉE
Pas d’e-mail, pas de publicité, pas de pistage. Vos listes restent sur votre téléphone ; seuls les listes que vous partagez, vos votes et votre profil de joueur (facultatif) sont envoyés en ligne. Vous pouvez supprimer votre profil à tout moment depuis les Réglages.

## Mots-clés (100 caractères, séparés par des virgules, sans espace)

tierlist,classement,top,ranking,quiz,vote,sondage,débat,amis,jeu,liste,classer,avis,comparer

## Nouveautés de la version

Première version : tier list du jour, listes populaires, amis, création et partage de vos tier lists.

## Confidentialité de l’app (questionnaire « App Privacy »)

Réponse : **oui, l’app collecte des données**, aucune n’est utilisée pour le pistage.

| Type de données (Apple) | Collectée | Liée à l’identité | Pistage | Finalité |
|---|---|---|---|---|
| Contenu utilisateur → Autre contenu de l’utilisateur (tier lists partagées, classements, avatar) | Oui | Oui | Non | Fonctionnalités de l’app |
| Identifiants → ID utilisateur (pseudo#numéro du profil de joueur) | Oui | Oui | Non | Fonctionnalités de l’app |
| Identifiants → ID de l’appareil (identifiant aléatoire créé par l’app, pour un vote par appareil) | Oui | Oui | Non | Fonctionnalités de l’app |
| Contacts → Autre (liste d’amis dans l’app, pas le carnet d’adresses) | Oui | Oui | Non | Fonctionnalités de l’app |

« Liée à l’identité » : oui, car le profil de joueur relie le pseudo aux classements et aux amis (les votes faits sans profil restent anonymes).

Tout le reste : non collecté (pas de coordonnées, de localisation, d’historique, d’achats, de données de santé, de diagnostics…). Les adresses IP ne servent qu’à la protection contre les abus et sont supprimées sous 24 h.

## Captures d’écran

iPhone 6,9 pouces (1320 × 2868) obligatoires : voir `store/screenshots/`, à envoyer dans l’ordre des numéros (les six images forment un panorama continu) :
1. « Classez tout, de S à D. » : titre et accueil
2. « Glissez. Tranchez. » : classement
3. « Un défi chaque jour. » : tier list du jour
4. « D’accord avec les autres ? » : classement moyen
5. « Vos rangs, vos règles. » : personnalisation
6. « Un code, et c’est partagé. » : partage

Pour les régénérer : écrans bruts dans `store/screens/`, mise en page dans `scripts/store-screenshots/panorama.html`, puis `node scripts/store-screenshots/render.mjs` (Playwright).

## Avant de soumettre

- [ ] Remplacer CONTACT_EMAIL dans `share-site/support.html` et `PUBLISHER` dans `src/constants/legal.ts` par le nom et l’adresse de contact, puis redéployer le site.
- [ ] Vérifier dans Supabase que `delete_profile`, `unblock_player` et la tâche `tiercraft-cleanup` (`select * from cron.job`) existent.
- [ ] Notes pour la revue Apple : profils sans e-mail, pseudos filtrés, avatars fixes ; signaler et bloquer depuis une demande d’ami ou le profil d’un ami ; suppression du profil dans Réglages → Zone de danger.
- [ ] Passer Supabase en offre Pro (le projet gratuit se met en pause après 7 jours sans activité).
- [ ] Vérifier les icônes d’apps du modèle « Jeux mobiles » (droits des éditeurs).

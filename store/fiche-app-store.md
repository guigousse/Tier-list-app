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
| URL d’assistance | https://tiercraft-nine.vercel.app/support | |
| URL de confidentialité | https://tiercraft-nine.vercel.app/confidentialite | |
| URL marketing | https://tiercraft-nine.vercel.app | |
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

📲 PARTAGEZ
Envoyez une tier list avec un code à 6 caractères ou un lien : vos amis l’ouvrent dans Tiercraft et font leur propre classement. Exportez aussi votre classement en image.

🔒 RESPECT DE LA VIE PRIVÉE
Pas de compte, pas de publicité, pas de pistage. Vos listes restent sur votre téléphone ; seules celles que vous partagez et vos votes anonymes sont envoyés en ligne.

## Mots-clés (100 caractères, séparés par des virgules, sans espace)

tierlist,classement,top,ranking,quiz,vote,sondage,débat,amis,jeu,liste,classer,avis,comparer

## Nouveautés de la version

Première version : tier list du jour, listes populaires, création et partage de vos tier lists.

## Confidentialité de l’app (questionnaire « App Privacy »)

Réponse : **oui, l’app collecte des données**, aucune n’est utilisée pour le pistage.

| Type de données (Apple) | Collectée | Liée à l’identité | Pistage | Finalité |
|---|---|---|---|---|
| Contenu utilisateur → Autre contenu de l’utilisateur (tier lists partagées, classements) | Oui | Non | Non | Fonctionnalités de l’app |
| Identifiants → ID de l’appareil (identifiant aléatoire créé par l’app, pour un vote par appareil) | Oui | Non | Non | Fonctionnalités de l’app |

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

- [ ] Remplacer CONTACT_EMAIL dans `share-site/support.html` par l’adresse de contact, puis redéployer le site.
- [ ] Lancer `supabase/migrations/20261013040000_daily_cleanup.sql` dans le SQL Editor (purge annoncée dans la politique).
- [ ] Passer Supabase en offre Pro (le projet gratuit se met en pause après 7 jours sans activité).
- [ ] Vérifier les icônes d’apps du modèle « Jeux mobiles » (droits des éditeurs).

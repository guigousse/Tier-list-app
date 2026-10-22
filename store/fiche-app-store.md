# Fiche App Store — Tiercraft

À saisir dans App Store Connect → Tiercraft → Distribution (version 1.0). Le 16 octobre 2026, textes, URL, catégories, classification, prix gratuit et copyright ont été posés par l’API ; restent à la main : captures, confidentialité de l’app, droits sur le contenu, informations pour la revue.

## Informations

| Champ | Valeur | Limite |
|---|---|---|
| Nom | Tiercraft | 30 |
| Sous-titre | Tier lists : classe tout | 30 |
| Catégorie principale | Divertissement | |
| Catégorie secondaire | Réseaux sociaux | |
| Classification | À refaire avec le nouveau questionnaire d’Apple : contenu créé par les joueurs (listes envoyées entre amis, pseudos), génération par IA, pub récompensée facultative | |
| URL d’assistance | https://tier-list-app-share-site.vercel.app/support | |
| URL de confidentialité | https://tier-list-app-share-site.vercel.app/confidentialite | |
| URL marketing | https://tier-list-app-share-site.vercel.app | |
| Copyright | 2026 Guillaume Fenard | |

## Texte promotionnel (170 caractères, modifiable sans nouvelle version)

Une nouvelle tier list chaque jour : classe-la, garde ta série et découvre si les autres joueurs sont d’accord avec toi !


## Description (4 000 caractères, sans emoji : Apple les refuse)

Pizza ou sushi ? Été ou hiver ? Chat ou chien ? Il est temps de trancher.

Tiercraft, c’est le jeu où tu classes tout de S à D… puis où tu découvres si le reste du monde (et tes amis) a aussi bon goût que toi.

CE QUI T’ATTEND
• Une tier list du jour, chaque jour : classe-la, compare-toi à tous les joueurs et fais grimper ta série.
• Des dizaines de listes publiques : fruits, fromages, jeux mobiles, destinations, super-pouvoirs…
• Tes propres listes en un geste : renomme les rangs, ajoute tes cartes avec une photo, l’appareil photo ou une image trouvée pour toi.
• L’IA en renfort : donne un thème, elle invente les cartes et les illustre dans le style de l’app.
• Des défis entre amis : envoie une liste, ton ami la classe sans voir ton classement, puis vous découvrez votre pourcentage d’accord.
• Des récompenses à débloquer : badges, tenues pour ton avatar et paliers à franchir.
• Un partage tout simple : un code à 6 caractères, un lien, ou ton classement en image.

L’ÉNERGIE
Créer avec l’IA utilise de l’énergie. Tu en reçois au démarrage, tu en gagnes en parrainant tes amis ou en regardant une pub une fois par semaine, et des packs t’attendent dans la boutique. Une génération ratée ne coûte rien.

RESPECT DE LA VIE PRIVÉE
Pas d’e-mail, aucune pub imposée (seulement celles que tu choisis de regarder pour gagner de l’énergie), pas de pistage publicitaire. Tes listes restent sur ton téléphone ; seuls les listes que tu partages, tes votes, les thèmes envoyés à l’IA et ton profil de joueur (facultatif) passent en ligne. Les statistiques d’usage ne sont mesurées qu’avec ton accord, et tu peux supprimer ton profil à tout moment depuis les Réglages.

Disponible en français, anglais, espagnol et grec.

Alors, S ou D ?

Les versions anglaise, espagnole et grecque sont dans `docs/appstore/listings.json`.


## Mots-clés (100 caractères, séparés par des virgules, sans espace)

tierlist,classement,top,ranking,quiz,vote,sondage,débat,amis,jeu,liste,avis,comparer,ia,défi


## Nouveautés de la version

Rien à saisir pour la première version (Apple n'affiche ce champ qu'à partir de la deuxième).

## Confidentialité de l’app (questionnaire « App Privacy »)

Réponse : **oui, l’app collecte des données**. Aucune n’est utilisée pour le pistage entre apps (pas de demande ATT : AdMob sert des pubs non personnalisées et Firebase tourne sans identifiant publicitaire).

| Type de données (Apple) | Liée à l’identité | Pistage | Finalité |
|---|---|---|---|
| Contenu utilisateur → Autre contenu de l’utilisateur (tier lists partagées, classements, avatar, thèmes et noms de cartes envoyés à l’IA) | Oui | Non | Fonctionnalités de l’app |
| Identifiants → ID utilisateur (pseudo#numéro du profil de joueur) | Oui | Non | Fonctionnalités de l’app |
| Identifiants → ID de l’appareil (identifiant aléatoire de l’app, porte-monnaie, App Attest, DeviceCheck) | Non | Non | Fonctionnalités de l’app, prévention de la fraude |
| Contacts → Autre (liste d’amis dans l’app, pas le carnet d’adresses) | Oui | Non | Fonctionnalités de l’app |
| Achats → Historique d’achats (packs d’énergie : transaction Apple, pack, date) | Non | Non | Fonctionnalités de l’app |
| Utilisation → Interactions avec le produit (Firebase Analytics, seulement avec l’accord du joueur) | Non | Non | Analyse |
| Utilisation → Données publicitaires, Localisation → Approximative, Diagnostics (AdMob, pub récompensée) | Non | Non | Publicité tierce |

Pour la ligne AdMob, recouper avec la page « App Store data disclosure » de Google avant de valider. Les adresses IP ne servent qu’à la protection contre les abus et sont supprimées sous 24 h.


## Captures d’écran

iPhone 6,9 pouces (1320 × 2868) obligatoires, une série par langue : `store/screenshots/fr/` (fiche principale), `en/`, `es/`, `el/`. À envoyer dans l’ordre des numéros (les six images forment un panorama continu) :
1. « Classe tout, de S à D. » : titre et accueil
2. « Glisse. Tranche. » : classement
3. « Un défi chaque jour. » : tier list du jour
4. « D’accord avec les autres ? » : classement moyen
5. « Tes rangs, tes règles. » : personnalisation
6. « Un code, et c’est partagé. » : partage

Apple demande aussi la taille « iPhone avec Dynamic Island (écran moyen) », 6,3 pouces (1206 × 2622) : mêmes images réduites, dans `store/screenshots-6.3/<langue>/`.

Pas de captures iPad : l’app est déclarée iPhone seul pour la 1.0 (l’iPad pourra être ajouté dans une mise à jour).

Pour les régénérer : lancer l’app web (`npx expo start --web --port 8081`), capturer les écrans avec `node scripts/store-screenshots/capture.mjs <langue> 8081` (dans `store/screens/<langue>/`, les envois au serveur sont simulés), puis `node scripts/store-screenshots/render.mjs <langue>` (Playwright).

## Informations pour la revue (à saisir à la main : Apple exige un téléphone)

Contact : Guillaume Fenard, broc.le.jeu@gmail.com, téléphone à saisir. Pas de compte de démonstration. Notes :

Tiercraft needs no account: a player profile (nickname + avatar from a fixed list, no e-mail) is optional, created from the avatar button on the home screen. The app follows the device language (French, English, Spanish, Greek).

Daily tier list: the card at the top of the home screen. Rank the cards, then validate to see how other players ranked them.

AI generation: create a new tier list, tap the magic wand button, enter a theme (e.g. "French cheeses"). The AI proposes cards, then draws their images. Each generation uses energy; a welcome amount is granted once per genuine iPhone (App Attest), so the reviewer can try it right away.

In-app purchases: the "+" next to the energy balance on the home screen opens the store with five consumable energy packs. Purchases are verified by our server (signed StoreKit 2 transaction) and credited once.

Optional rewarded ad: Store → "Énergie gratuite" ("Free energy") → watch one ad for 5 energy, once a week. No other ads are shown. The same page shows the referral programme: a player earns energy when a new player ranks a list they shared as a challenge.

Friends: add a friend with their code, send them a list; they rank it without seeing the sender's ranking, then both see their agreement. A list unanswered after 7 days expires.

User-generated content: nicknames and list words are filtered; a player can be reported or blocked from a friend request, a friend's profile or a list they sent. Profile deletion: Settings → Danger zone → Delete my profile (immediate, online data erased).


## Droits sur le contenu

Réponse : oui, l’app contient du contenu tiers ; case des droits cochée.

« Contient du contenu tiers » : images Wikimedia (licences indiquées sur chaque carte) et icônes d’apps de l’App Store.

## Avant de soumettre

- [x] Contact : broc.le.jeu@gmail.com sur le site et dans l’app (16 octobre 2026).
- [ ] Vérifier dans Supabase que `delete_profile`, `unblock_player` et la tâche `tiercraft-cleanup` (`select * from cron.job`) existent.
- [ ] Coller dans Supabase le nettoyage quotidien de `supabase/migrations/20261020190000_mail_expiry.sql` (fonction `private.cleanup`).
- [ ] Supprimer les fonctions Edge de test `appstore-test` et `words-bench` (tableau de bord Supabase → Edge Functions).
- [ ] Passer Supabase en offre Pro (le projet gratuit se met en pause après 7 jours sans activité).
- [x] Icônes d’apps du modèle « Jeux mobiles » : gardées pour la 1.0 (décidé le 22 octobre 2026). En cas de rejet (règle 5.2) ou de réclamation d’un éditeur, les remplacer par des dessins de la bibliothèque (seule celle de Broc, notre jeu, peut rester).

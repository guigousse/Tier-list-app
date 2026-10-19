# Tiercraft : Tier List maker

Application mobile (iOS en priorité, Android possible) pour créer des tier lists :
des rangs (S, A, B, C, D…) et des cartes à glisser depuis une barre en bas de l’écran.

Construite avec **Expo SDK 57 / React Native**, TypeScript, Expo Router, Reanimated,
Gesture Handler et Zustand (sauvegarde locale sur l’appareil).

## Fonctionnalités

- **Rangs** : nombre libre (1 à 12 à la création, ajout illimité ensuite), nom et couleur
  modifiables (palette + code hexadécimal), réordonnables, insertion au-dessus/en dessous,
  suppression (les cartes reviennent dans la barre). Couleurs classiques par défaut.
- **Cartes** : texte, emoji, photo (galerie ou appareil photo, recadrage carré), couleur de
  fond. Ajout une par une ou en lot (une carte par ligne).
- **Classement** : maintenir une carte puis la glisser dans un rang, à la position voulue,
  avec défilement automatique et retour haptique. Toucher une carte permet aussi de la
  déplacer via « Placer dans » (alternative accessible au glisser-déposer).
- **Partage** : export de la tier list en image PNG via la feuille de partage iOS.
- **Gestion** : favoris, duplication, renommage, suppression, réinitialisation du classement.
- **Réglages** : taille des cartes, affichage des noms, haptique, rangs par défaut,
  effacement des données.

## Menu (navigation)

| Écran | Rôle |
|---|---|
| **Accueil** | Bouton « Nouvelle tier list », accès à *Mes tier lists* et *Modèles*, historique « Récemment ouvertes », favoris |
| **Nouvelle tier list** | Titre, préréglage de rangs (Classique S→D, Étendu S→F, Podium, Avis, Notes) ou rangs personnalisés |
| **Mes tier lists** | Recherche, tri (modifiées, ouvertes, A→Z, favoris), actions (ouvrir, favori, renommer, dupliquer, supprimer) |
| **Modèles** | Jeux de cartes prêts à classer (fruits, desserts, animaux, sports, plats, fêtes) |
| **Éditeur** | Les rangs, la barre de cartes et le menu d’options |
| **Réglages** | Préférences et données |

## Structure

```
src/
  app/                  routes Expo Router (un fichier = un écran)
    _layout.tsx         navigation, thème, attente du chargement des données
    index.tsx           accueil
    new.tsx, lists.tsx, templates.tsx, settings.tsx
    editor/[id].tsx     éditeur de tier list
  components/
    editor/DragDrop.tsx glisser-déposer (gestes, zones de dépôt, auto-défilement)
    editor/…            rangs, barre de cartes, feuilles d’édition
  store/                modèle de données + store Zustand persistant (AsyncStorage)
  lib/                  images (expo-file-system), dates, identifiants
  constants/            thème, couleurs, préréglages et modèles
```

Les images sont copiées dans le dossier Documents de l’application ; seul leur nom de
fichier est enregistré (le chemin du conteneur iOS change entre les mises à jour).

## Développement

```bash
npm install
npx expo start          # puis scanner le QR code avec Expo Go, ou « i » pour le simulateur iOS
npm run typecheck
npm run lint
```

Toutes les dépendances natives sont incluses dans Expo Go : aucun build natif n’est
nécessaire pour tester.

## Publication sur l’App Store

1. Compte Apple Developer (99 €/an) et compte Expo.
2. Vérifier `app.json` : nom affiché (`Tiercraft`), `ios.bundleIdentifier` (`com.guigousse.TierCraft`, invisible pour les utilisateurs), version, icône
   (`assets/icon.png`, 1024×1024 sans transparence) et écran de démarrage.
3. `npx eas-cli@latest build --platform ios --profile production`
4. `npx eas-cli@latest submit --platform ios` (envoi vers App Store Connect / TestFlight).
5. Dans App Store Connect, nommer l’app « Tiercraft : Tier List maker », puis ajouter : captures d’écran, description, politique de confidentialité
   (voir la politique de confidentialité : profils, amis, votes et listes partagées sont stockés sur Supabase).

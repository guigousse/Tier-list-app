# Vidéos TikTok

Vidéos verticales (1080 × 1920, 30 i/s) dessinées image par image : `stage.html` décrit les vidéos, `render.js` les filme avec Playwright et les monte avec ffmpeg et les sons de l'app (`assets/sounds`).

```bash
./fetch-images.sh            # dessins des cartes (images.txt) depuis la bibliothèque d'icônes
node render.js pizza         # → out/tiercraft-pizza.mp4
node render.js pizza 30 "1.0,9.5"   # aperçus PNG de ces instants seulement
```

Trois formats, dans `stage.html` :
- `provoc` : un classement qui fait réagir, des cartes commentées, un tampon sur la dernière (avec suspense en option) ;
- `versus` : moi contre un proche, puis le pourcentage d'accord calculé comme dans l'app (`private.agreement`) ;
- `rapid` : une seconde par carte, et une question qui divise pour finir.

Une nouvelle vidéo = une entrée de `VIDEOS` ; ses dessins doivent être dans `images.txt` (concept + suffixe du fichier dans la bibliothèque).

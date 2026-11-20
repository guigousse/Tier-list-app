#!/usr/bin/env bash
# Downloads the card drawings the videos use (images.txt: concept + file suffix) from the app's icon library.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p img
BASE=https://mefhdtpyhtvplpfleyhi.supabase.co/storage/v1/object/public/card-icons
while read -r concept suffix; do
  [ -f "img/$concept.png" ] || curl -fsS -m 20 -o "img/$concept.png" "$BASE/$concept-$suffix-sticker.png"
done < images.txt
cp ../../assets/icon.png img/appicon.png

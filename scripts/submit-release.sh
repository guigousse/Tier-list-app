#!/usr/bin/env bash
# Sends the .ipa built by .github/workflows/testflight.yml (GitHub release
# build-<run>) to TestFlight. Usage: scripts/submit-release.sh <run number>
set -euo pipefail

cd "$(dirname "$0")/.."
run="${1:?run number}"
: "${ASC_API_KEY_P8:?}" "${EXPO_ASC_KEY_ID:?}" "${EXPO_ASC_ISSUER_ID:?}" "${EXPO_TOKEN:?}"
url="https://github.com/guigousse/Tier-list-app/releases/download/build-$run/Tiercraft.ipa"

tmp=$(mktemp -d)
cp eas.json "$tmp/eas.json"
trap 'cp "$tmp/eas.json" eas.json; rm -rf "$tmp"' EXIT
(
  umask 077
  echo "-----BEGIN PRIVATE KEY-----"
  printf '%s' "$ASC_API_KEY_P8" | sed 's/\\n//g; s/-----[A-Z ]*-----//g' | tr -d ' \r\n' | fold -w 64
  echo
  echo "-----END PRIVATE KEY-----"
) > "$tmp/AuthKey.p8"

python3 - "$tmp/AuthKey.p8" <<'PY'
import json, os, sys
d = json.load(open("eas.json"))
d["submit"]["production"]["ios"].update(
    ascApiKeyPath=sys.argv[1],
    ascApiKeyId=os.environ["EXPO_ASC_KEY_ID"],
    ascApiKeyIssuerId=os.environ["EXPO_ASC_ISSUER_ID"],
)
json.dump(d, open("eas.json", "w"), indent=2)
PY

bunx eas-cli@latest submit -p ios --profile production --url "$url" --non-interactive --wait

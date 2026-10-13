#!/usr/bin/env bash
# Builds the iOS production app on EAS and submits it to TestFlight.
#
# Requires EXPO_TOKEN, ASC_API_KEY_P8 (base64 body of the .p8 key, no PEM
# header), EXPO_ASC_KEY_ID and EXPO_ASC_ISSUER_ID in the environment.
# Signing credentials must already exist on EAS.
set -euo pipefail

cd "$(dirname "$0")/.."
: "${ASC_API_KEY_P8:?}" "${EXPO_ASC_KEY_ID:?}" "${EXPO_ASC_ISSUER_ID:?}" "${EXPO_TOKEN:?}"

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
openssl pkey -in "$tmp/AuthKey.p8" -noout

# The key also lets EAS sync capabilities (e.g. Associated Domains) with Apple.
EXPO_ASC_API_KEY_PATH="$tmp/AuthKey.p8" bunx eas-cli@latest build -p ios --profile production --non-interactive --wait --json > "$tmp/build.json"
build_id=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))[0]["id"])' "$tmp/build.json")
echo "Build: https://expo.dev/accounts/guigousse/projects/tiercraft/builds/$build_id"

# eas.json has no env interpolation, so point the submit profile at the key only for this run.
python3 - "$tmp/AuthKey.p8" <<'EOF'
import json, os, sys
d = json.load(open("eas.json"))
d["submit"]["production"]["ios"].update(
    ascApiKeyPath=sys.argv[1],
    ascApiKeyId=os.environ["EXPO_ASC_KEY_ID"],
    ascApiKeyIssuerId=os.environ["EXPO_ASC_ISSUER_ID"],
)
json.dump(d, open("eas.json", "w"), indent=2)
EOF
bunx eas-cli@latest submit -p ios --profile production --id "$build_id" --non-interactive --wait

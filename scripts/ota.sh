#!/usr/bin/env bash
# Publishes the current JavaScript and assets as an over-the-air update (EAS Update)
# to the builds of the "production" channel. Phones get it at the next launch.
#
# Only for JavaScript changes: anything touching native code (new native module,
# app.json plugins, permissions…) changes the runtime fingerprint and needs a new
# build (scripts/testflight.sh) instead.
#
# Usage: scripts/ota.sh "Message describing the update"   (needs EXPO_TOKEN)
set -euo pipefail

cd "$(dirname "$0")/.."
: "${EXPO_TOKEN:?}"
message="${1:-$(git log -1 --pretty=%s)}"

bunx eas-cli@latest update --channel production --environment production --message "$message" --non-interactive

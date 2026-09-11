#!/usr/bin/env bash
# Development loop: copy the local build (dist/) to a Volumio player and install it
# there with scripts/install.sh, exactly as a release would be installed.
#
# Usage: scripts/deploy.sh [user@host] [--activate]
#   host defaults to $VOLUMIO_HOST, then volumio@volumio.local
# Needs SSH access to the player (enable it at http://<player>/dev).
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${VOLUMIO_HOST:-volumio@volumio.local}"
EXTRA=()
for arg in "$@"; do
  case "$arg" in
    --activate) EXTRA+=(--activate) ;;
    -*) echo "unknown option: $arg" >&2; exit 1 ;;
    *) HOST="$arg" ;;
  esac
done

[ -f dist/index.html ] || { echo "error: no dist/ - run ./build.sh artwork artwork first" >&2; exit 1; }
echo "dev-$(git rev-parse --short HEAD 2>/dev/null || echo local)" > dist/VERSION

echo ">> copying dist/ to $HOST"
rsync -az --delete -e ssh dist/ "$HOST":/tmp/artwork-ui-dist/
scp -q scripts/install.sh "$HOST":/tmp/artwork-install.sh
# shellcheck disable=SC2029  # EXTRA is meant to expand locally
ssh "$HOST" "bash /tmp/artwork-install.sh --from /tmp/artwork-ui-dist ${EXTRA[*]:-}; rm -rf /tmp/artwork-ui-dist /tmp/artwork-install.sh"

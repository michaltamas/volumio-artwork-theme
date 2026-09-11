#!/usr/bin/env bash
# Install or update the Artwork One interface on a Volumio player.
#
# Run it on the player (over SSH):
#   curl -fsSL https://raw.githubusercontent.com/michaltamas/volumio-artwork-theme/master/scripts/install.sh | bash
#
# The interface is unpacked to /data/artwork-ui and registered through Volumio's
# third-party UI list (/data/thirdPartyUisList.json). Both live on the data
# partition, so they survive Volumio system updates. Nothing in /volumio is touched.
#
# Options:
#   --version vX.Y.Z   install a specific release instead of the latest one
#   --from PATH        install from a local build: a dist/ folder or an artwork-ui.tar.gz
#   --activate         make Artwork One the active interface and restart Volumio
#   -h, --help         show this help
#
# Environment (for testing): ARTWORK_INSTALL_DIR, ARTWORK_UI_LIST, ARTWORK_ACTIVE_UI
set -euo pipefail

REPO="michaltamas/volumio-artwork-theme"
ASSET="artwork-ui.tar.gz"
UI_NAME="artwork"
UI_PRETTY_NAME="Artwork One"
INSTALL_DIR="${ARTWORK_INSTALL_DIR:-/data/artwork-ui}"
UI_LIST="${ARTWORK_UI_LIST:-/data/thirdPartyUisList.json}"
ACTIVE_UI="${ARTWORK_ACTIVE_UI:-/data/active_volumio_ui}"

VERSION="latest"
SOURCE=""
ACTIVATE=0

usage() {
  cat <<'HELP'
Install or update the Artwork One interface on a Volumio player.

Usage: install.sh [--version vX.Y.Z] [--from PATH] [--activate]

  --version vX.Y.Z   install a specific release instead of the latest one
  --from PATH        install from a local build: a dist/ folder or an artwork-ui.tar.gz
  --activate         make Artwork One the active interface and restart Volumio
  -h, --help         show this help
HELP
}
die() { echo "error: $*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --version) [ $# -ge 2 ] || die "--version needs a value"; VERSION="$2"; shift 2 ;;
    --from)    [ $# -ge 2 ] || die "--from needs a path"; SOURCE="$2"; shift 2 ;;
    --activate) ACTIVATE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
done

command -v node >/dev/null 2>&1 || die "node not found; run this on a Volumio player"
command -v tar  >/dev/null 2>&1 || die "tar not found"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
STAGE="$TMP/stage"
mkdir -p "$STAGE"

# 1) get the build into $STAGE
if [ -n "$SOURCE" ]; then
  if [ -d "$SOURCE" ]; then
    cp -a "$SOURCE"/. "$STAGE"/
  elif [ -f "$SOURCE" ]; then
    tar -xzf "$SOURCE" -C "$STAGE"
  else
    die "--from: $SOURCE does not exist"
  fi
else
  command -v curl >/dev/null 2>&1 || die "curl not found"
  if [ "$VERSION" = "latest" ]; then
    URL="https://github.com/$REPO/releases/latest/download/$ASSET"
  else
    URL="https://github.com/$REPO/releases/download/$VERSION/$ASSET"
  fi
  echo ">> downloading $URL"
  curl -fL --retry 3 --progress-bar -o "$TMP/$ASSET" "$URL" || die "download failed"
  tar -xzf "$TMP/$ASSET" -C "$STAGE"
fi

if [ ! -f "$STAGE/index.html" ] || [ ! -d "$STAGE/app" ]; then
  die "this does not look like an Artwork One build (index.html or app/ missing)"
fi

# Volumio's own builds ship this fallback for players without network: the UI then
# talks to the backend on the same machine.
[ -f "$STAGE/app/local-config.json" ] || echo '{"localhost": "http://127.0.0.1:3000"}' > "$STAGE/app/local-config.json"

# 2) swap it into place, so a browser never loads a half-copied interface
echo ">> installing to $INSTALL_DIR"
mkdir -p "$(dirname "$INSTALL_DIR")"
rm -rf "$INSTALL_DIR.new" "$INSTALL_DIR.old"
cp -a "$STAGE" "$INSTALL_DIR.new"
[ -d "$INSTALL_DIR" ] && mv "$INSTALL_DIR" "$INSTALL_DIR.old"
mv "$INSTALL_DIR.new" "$INSTALL_DIR"
rm -rf "$INSTALL_DIR.old"

# 3) register it with Volumio's Appearance settings (idempotent)
UI_NAME="$UI_NAME" UI_PRETTY_NAME="$UI_PRETTY_NAME" INSTALL_DIR="$INSTALL_DIR" UI_LIST="$UI_LIST" node -e '
  const fs = require("fs");
  const { UI_NAME, UI_PRETTY_NAME, INSTALL_DIR, UI_LIST } = process.env;
  let list = [];
  try { list = JSON.parse(fs.readFileSync(UI_LIST, "utf8")); } catch (e) { list = []; }
  if (!Array.isArray(list)) { list = []; }
  list = list.filter(u => u && u.uiName !== UI_NAME && u.uiPath !== INSTALL_DIR);
  list.push({ uiPrettyName: UI_PRETTY_NAME, uiName: UI_NAME, uiPath: INSTALL_DIR });
  fs.writeFileSync(UI_LIST, JSON.stringify(list, null, 2));
'
echo ">> registered \"$UI_PRETTY_NAME\" in $UI_LIST"

INSTALLED="$(cat "$INSTALL_DIR/VERSION" 2>/dev/null || echo "local build")"

# 4) optionally switch to it
if [ "$ACTIVATE" -eq 1 ]; then
  printf '{"uiPrettyName":"%s","uiName":"%s","uiPath":"%s"}' "$UI_PRETTY_NAME" "$UI_NAME" "$INSTALL_DIR" > "$ACTIVE_UI"
  echo ">> $UI_PRETTY_NAME is now the active interface; restarting Volumio"
  if command -v volumio >/dev/null 2>&1; then
    volumio vrestart || echo "   restart failed: run 'volumio vrestart' yourself"
  fi
  echo "Done: Artwork One $INSTALLED is active. Reload the page in your browser."
else
  echo "Done: Artwork One $INSTALLED is installed."
  echo "Select it in Volumio: Settings > Appearance > User interface > $UI_PRETTY_NAME."
fi

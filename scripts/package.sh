#!/usr/bin/env bash
# Package dist/ as the release archive that scripts/install.sh downloads.
# Usage: scripts/package.sh [version]   e.g. scripts/package.sh v1.0.0
# Writes artwork-ui.tar.gz in the repository root. Build first: ./build.sh artwork artwork
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="${1:-$(git describe --tags --always 2>/dev/null || echo dev)}"
[ -f dist/index.html ] || { echo "error: no dist/ - run ./build.sh artwork artwork first" >&2; exit 1; }
echo "$VERSION" > dist/VERSION
# the same offline fallback Volumio writes into its own builds
[ -f dist/app/local-config.json ] || echo '{"localhost": "http://127.0.0.1:3000"}' > dist/app/local-config.json
# no macOS metadata in the archive (GNU tar on the player warns about it)
if tar --version 2>/dev/null | grep -q bsdtar; then
  COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -czf artwork-ui.tar.gz -C dist .
else
  tar --no-xattrs -czf artwork-ui.tar.gz -C dist . 2>/dev/null || tar -czf artwork-ui.tar.gz -C dist .
fi
echo "artwork-ui.tar.gz ($VERSION, $(du -h artwork-ui.tar.gz | cut -f1))"

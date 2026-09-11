#!/usr/bin/env bash
# Build a Volumio2-UI theme reproducibly in a node:10 container.
# Usage: ./build.sh <theme> <variant>   e.g. ./build.sh artwork artwork
set -euo pipefail
export THEME="${1:-volumio3}"
export VARIANT="${2:-$THEME}"
cd "$(dirname "$0")"

# The toolchain (Gulp 3, node-sass 4, Bower) needs Node 10, hence the container.
# Files it writes are handed back to the calling user (Docker on Linux runs as root).
docker run --rm -e THEME -e VARIANT -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
  -v "$PWD":/app -w /app node:10 bash -lc '
  set -e
  if [ ! -d node_modules ]; then
    echo ">> npm install"
    npm install --no-audit --no-fund --unsafe-perm
  fi
  if ! command -v bower >/dev/null 2>&1; then
    npm install -g bower >/dev/null 2>&1
  fi
  if [ ! -d bower_components ]; then
    echo ">> bower install"
    bower install --allow-root --config.interactive=false
  fi
  echo ">> gulp build --theme=$THEME --variant=$VARIANT"
  ./node_modules/.bin/gulp build --theme="$THEME" --variant="$VARIANT" --env="production"
  chown -R "$HOST_UID:$HOST_GID" /app/dist /app/node_modules /app/bower_components /app/.tmp /app/src 2>/dev/null || true
'
echo "Build complete -> $(pwd)/dist"

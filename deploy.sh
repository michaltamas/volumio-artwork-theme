#!/usr/bin/env bash
# Deploy built dist/ to the device as the additive "Artwork One" UI variant.
set -euo pipefail
HOST="volumio@192.168.1.131"
DIST="$(dirname "$0")/dist"
[ -d "$DIST" ] || { echo "No dist/ — run ./build.sh artwork artwork first"; exit 1; }

# 1) sync build to a NEW folder (never touches www/www3/www4)
ssh "$HOST" 'mkdir -p /volumio/http/www5'
rsync -az --delete -e ssh "$DIST"/ "$HOST":/volumio/http/www5/

# 2) register variant idempotently, backing up the list first
ssh "$HOST" 'bash -s' <<'REMOTE'
set -e
LIST=/volumio/volumioUisList.json
cp -n "$LIST" "$LIST.bak.$(date +%Y%m%d%H%M%S)"
node -e '
  const fs=require("fs"), p="/volumio/volumioUisList.json";
  const a=JSON.parse(fs.readFileSync(p,"utf8"));
  if(!a.some(u=>u.uiName==="artwork")) a.unshift({uiPrettyName:"Artwork One",uiName:"artwork",uiPath:"/volumio/http/www5"});
  fs.writeFileSync(p, JSON.stringify(a,null,2));
  console.log("registered:", a.map(u=>u.uiName).join(","));
'
REMOTE

echo "Deployed. Run: ssh $HOST 'volumio vrestart'  (then pick 'Artwork One' in the UI switcher)"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$ROOT_DIR/../../.." && pwd)"
UI_ROOT="${DS_UI_ROOT:-$PROJECT_DIR/dolphinscheduler-ui/dist}"
NGINX_BIN="${NGINX_BIN:-$(command -v nginx || true)}"
PREFIX="${DS_NGINX_PREFIX:-/tmp/ds-local-cluster/nginx}"
CONF="$PREFIX/nginx.conf"
PID="$PREFIX/nginx.pid"
LOG_DIR="$PREFIX/logs"

if [[ -z "$NGINX_BIN" ]]; then
  echo "nginx is not installed. Install nginx, or set NGINX_BIN to its executable path." >&2
  exit 1
fi
if [[ ! -f "$UI_ROOT/index.html" ]]; then
  echo "Frontend build not found: $UI_ROOT/index.html" >&2
  echo "Run pnpm run build:prod in dolphinscheduler-ui first." >&2
  exit 1
fi

mkdir -p "$PREFIX" "$LOG_DIR"
sed "s|__DS_UI_ROOT__|$UI_ROOT|g" "$ROOT_DIR/nginx.conf.template" > "$CONF"
cp "$ROOT_DIR/mime.types" "$PREFIX/mime.types"

"$NGINX_BIN" -t -p "$PREFIX" -c "$CONF"
"$NGINX_BIN" -p "$PREFIX" -c "$CONF"
echo "Nginx started: http://127.0.0.1:18080"

#!/usr/bin/env bash
set -euo pipefail

PREFIX="${DS_NGINX_PREFIX:-/tmp/ds-local-cluster/nginx}"
PID="$PREFIX/nginx.pid"
NGINX_BIN="${NGINX_BIN:-$(command -v nginx || true)}"

if [[ -f "$PID" ]]; then
  "$NGINX_BIN" -p "$PREFIX" -c "$PREFIX/nginx.conf" -s quit
  echo "Nginx stopped"
else
  echo "Nginx is not running"
fi

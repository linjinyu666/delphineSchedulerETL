#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/runtime-env.sh"

service="${1:-}"
case "$service" in
  api|master|worker|alert)
    exec "$ROOT/${service}-server/bin/start.sh"
    ;;
  *)
    echo "Usage: $0 {api|master|worker|alert}" >&2
    exit 64
    ;;
esac

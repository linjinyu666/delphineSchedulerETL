#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${DS_LOCAL_CLUSTER_DIR:-/tmp/ds-local-cluster}"

for pid_file in "$BASE_DIR"/*.pid; do
  [[ -f "$pid_file" ]] || continue
  pid="$(<"$pid_file")"
  name="$(basename "$pid_file" .pid)"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    echo "stopped $name (pid $pid)"
  else
    echo "$name is not running"
  fi
  rm -f "$pid_file"
done

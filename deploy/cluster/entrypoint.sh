#!/usr/bin/env bash
set -euo pipefail

source /usr/local/bin/ds-runtime-env.sh

case "${SERVICE:-}" in
  api)    exec /opt/dolphinscheduler/api-server/bin/start.sh ;;
  master) exec /opt/dolphinscheduler/master-server/bin/start.sh ;;
  worker) exec /opt/dolphinscheduler/worker-server/bin/start.sh ;;
  alert)  exec /opt/dolphinscheduler/alert-server/bin/start.sh ;;
  *)
    echo "SERVICE must be one of: api, master, worker, alert" >&2
    exit 64
    ;;
esac

#!/usr/bin/env bash
set -euo pipefail

RUNTIME_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DOLPHINSCHEDULER_HOME="${DOLPHINSCHEDULER_HOME:-$RUNTIME_HOME}"
export JAVA_HOME="${JAVA_HOME:-/opt/jdk8}"
export ETL_JAVA_HOME="${ETL_JAVA_HOME:-/opt/jdk17}"
export FLINK_ETL_HOME="${FLINK_ETL_HOME:-/opt/dolphinscheduler-flink-etl-runtime-3.4.2}"
export FLINK_LEARNING_LIB="${FLINK_LEARNING_LIB:-$FLINK_ETL_HOME/standalone-server/lib}"
export DATABASE="${DATABASE:-mysql}"
export PATH="$JAVA_HOME/bin:$PATH"

if [[ ! -x "$JAVA_HOME/bin/java" ]]; then
  echo "JDK 8 not found: $JAVA_HOME/bin/java" >&2
  exit 1
fi

java_version="$($JAVA_HOME/bin/java -version 2>&1 | awk -F'"' '/version/ {print $2; exit}')"
if [[ "$java_version" != 1.8.* ]]; then
  echo "DolphinScheduler services require JDK 8, found: ${java_version:-unknown}" >&2
  exit 1
fi

echo "DOLPHINSCHEDULER_HOME=$DOLPHINSCHEDULER_HOME"
echo "JAVA_HOME=$JAVA_HOME"
echo "ETL_JAVA_HOME=$ETL_JAVA_HOME"
echo "FLINK_LEARNING_LIB=$FLINK_LEARNING_LIB"

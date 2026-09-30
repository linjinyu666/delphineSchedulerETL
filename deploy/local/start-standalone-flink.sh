#!/usr/bin/env bash
# Start the local all-in-one server with a Flink 1.20 Session-cluster client.
# JAVA_HOME is for DolphinScheduler (JDK 8); ETL_JAVA_HOME is for flink run.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
standalone_home="$repo_root/dolphinscheduler-standalone-server/target/standalone-server"

if [[ "$(uname -s)" == "Darwin" ]]; then
  # An interactive shell may default to a newer JDK; the server itself needs 8.
  if [[ ! -x "${JAVA_HOME:-}/bin/java" ]] ||
      [[ "$("$JAVA_HOME/bin/java" -version 2>&1 | head -1)" != *'"1.8.'* ]]; then
    JAVA_HOME="$(/usr/libexec/java_home -v 1.8)"
  fi
  if [[ -z "${ETL_JAVA_HOME:-}" ]]; then
    ETL_JAVA_HOME="$(/usr/libexec/java_home -v 21)"
  fi
fi

export JAVA_HOME="${JAVA_HOME:?Set JAVA_HOME to a JDK 8 installation}"
export ETL_JAVA_HOME="${ETL_JAVA_HOME:?Set ETL_JAVA_HOME to a JDK 17+ installation}"
export FLINK_HOME="${FLINK_HOME:-$repo_root/dolphinscheduler-standalone-server/target/flink-client-1.20.0}"
export FLINK_LEARNING_LIB="${FLINK_LEARNING_LIB:-$standalone_home/flink-etl/lib}"
export FLINK_ETL_CLUSTER_JAR="${FLINK_ETL_CLUSTER_JAR:-$repo_root/dolphinscheduler-flink-etl-runtime/target/flink-learning-1.0.0-SNAPSHOT-cluster.jar}"
export DATABASE="${DATABASE:-mysql}"

for executable in "$JAVA_HOME/bin/java" "$ETL_JAVA_HOME/bin/java" "$FLINK_HOME/bin/flink"; do
  if [[ ! -x "$executable" ]]; then
    echo "Required executable not found: $executable" >&2
    exit 1
  fi
done
if [[ ! -r "$FLINK_ETL_CLUSTER_JAR" ]]; then
  echo "Cluster runner JAR not found: $FLINK_ETL_CLUSTER_JAR" >&2
  exit 1
fi
if [[ ! -d "$FLINK_LEARNING_LIB" ]]; then
  echo "Local runner libraries not found: $FLINK_LEARNING_LIB" >&2
  exit 1
fi

echo "JAVA_HOME=$JAVA_HOME"
echo "ETL_JAVA_HOME=$ETL_JAVA_HOME"
echo "FLINK_HOME=$FLINK_HOME"
echo "FLINK_ETL_CLUSTER_JAR=$FLINK_ETL_CLUSTER_JAR"
if [[ "${1:-}" == "--check" ]]; then
  exit 0
fi

cd "$standalone_home"
exec "$standalone_home/bin/start.sh"

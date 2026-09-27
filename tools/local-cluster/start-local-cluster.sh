#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${DS_LOCAL_CLUSTER_DIR:-/tmp/ds-local-cluster}"
JAVA_HOME="${DS_JAVA_HOME:-/Users/linjinyu/Library/Java/JavaVirtualMachines/corretto-1.8.0_482/Contents/Home}"
MYSQL_URL="${DS_MYSQL_URL:-jdbc:mysql://127.0.0.1:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&allowPublicKeyRetrieval=true}"
MYSQL_USER="${DS_MYSQL_USER:-dolphinscheduler}"
MYSQL_PASSWORD="${DS_MYSQL_PASSWORD:-dolphinscheduler}"

JAVA_BIN="$JAVA_HOME/bin/java"
if [[ ! -x "$JAVA_BIN" ]]; then
  JAVA_BIN="$(command -v java)"
fi

mkdir -p "$BASE_DIR/logs"

common_opts=(
  "-Dspring.profiles.active=mysql"
  "-Dspring.datasource.url=$MYSQL_URL"
  "-Dspring.datasource.username=$MYSQL_USER"
  "-Dspring.datasource.password=$MYSQL_PASSWORD"
  "-Dregistry.type=jdbc"
  "-Dregistry.hikariConfig.driverClassName=com.mysql.cj.jdbc.Driver"
  "-Dregistry.hikariConfig.jdbcUrl=$MYSQL_URL"
  "-Dregistry.hikariConfig.username=$MYSQL_USER"
  "-Dregistry.hikariConfig.password=$MYSQL_PASSWORD"
  "-Dspring.sql.init.mode=never"
  "-Dspring.flyway.enabled=false"
  "-Ddolphin.scheduler.network.interface.preferred=${DS_NETWORK_INTERFACE:-en0}"
)

start_service() {
  local name="$1"
  local main_class="$2"
  local server_port="$3"
  local listen_arg="$4"
  local service_dir="$BASE_DIR/$name"
  local classpath="$service_dir/conf:$service_dir/libs/*:$BASE_DIR/plugins/task-plugins/*:$BASE_DIR/plugins/datasource-plugins/*:$BASE_DIR/plugins/storage-plugins/*"
  local pid_file="$BASE_DIR/$name.pid"

  if [[ -f "$pid_file" ]] && kill -0 "$(<"$pid_file")" 2>/dev/null; then
    echo "$name already running (pid $(<"$pid_file"))"
    return
  fi

  nohup "$JAVA_BIN" -Xms256m -Xmx1g "${common_opts[@]}" \
    "-Dserver.port=$server_port" "$listen_arg" \
    -cp "$classpath" "$main_class" \
    >"$BASE_DIR/logs/$name.log" 2>&1 &
  echo $! >"$pid_file"
  echo "started $name (pid $(<"$pid_file"))"
}

start_service api-01 org.apache.dolphinscheduler.api.ApiApplicationServer 12346 "-Dapi.base-url=http://127.0.0.1:12346/dolphinscheduler"
start_service api-02 org.apache.dolphinscheduler.api.ApiApplicationServer 12347 "-Dapi.base-url=http://127.0.0.1:12347/dolphinscheduler"
start_service master-01 org.apache.dolphinscheduler.server.master.MasterServer 5682 "-Dmaster.listen-port=5680"
start_service master-02 org.apache.dolphinscheduler.server.master.MasterServer 5683 "-Dmaster.listen-port=5681"
start_service worker-01 org.apache.dolphinscheduler.server.worker.WorkerServer 1237 "-Dworker.listen-port=1236"
start_service worker-02 org.apache.dolphinscheduler.server.worker.WorkerServer 1239 "-Dworker.listen-port=1238"

echo "Local JDBC-registry cluster started under $BASE_DIR"

if [[ "${DS_KEEP_ALIVE:-false}" == "true" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  trap '"$SCRIPT_DIR/stop-local-cluster.sh" 2>/dev/null || true; exit 0' INT TERM
  while true; do
    sleep 5
  done
fi

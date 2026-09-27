#!/usr/bin/env bash
set -euo pipefail

ETL_JAVA_HOME="${ETL_JAVA_HOME:-/opt/jdk17}"
java_bin="$ETL_JAVA_HOME/bin/java"
if [[ ! -x "$java_bin" ]]; then
  echo "Flink ETL JDK 17 not found: $java_bin" >&2
  exit 1
fi

version="$($java_bin -version 2>&1 | awk -F'"' '/version/ {print $2; exit}')"
case "$version" in
  17.*) echo "Flink ETL Java runtime OK: $version" ;;
  *) echo "Flink ETL requires JDK 17, found: ${version:-unknown}" >&2; exit 1 ;;
esac

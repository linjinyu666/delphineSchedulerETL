#!/bin/bash
#
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
set -eo pipefail

BIN_DIR=$(dirname $(readlink -f "$0"))
STANDALONE_HOME=$(cd ${BIN_DIR}/..;pwd)
# The standalone distribution is self-contained.  Do not resolve the
# multi-service distribution one level above it: that layout is only used by
# dolphinscheduler-dist and made the local standalone launcher silently miss
# the API/Master/Worker/Alert jars.
DOLPHINSCHEDULER_HOME=$(cd ${STANDALONE_HOME}/../../..;pwd)

export DATABASE=${DATABASE:-h2}
source "$STANDALONE_HOME/conf/dolphinscheduler_env.sh"

JVM_ARGS_ENV_FILE=${STANDALONE_HOME}/bin/jvm_args_env.sh
JVM_ARGS="-server"

if [ -f $JVM_ARGS_ENV_FILE ]; then
  while read line
  do
      if [[ "$line" == -* ]]; then
            JVM_ARGS="${JVM_ARGS} $line"
      fi
  done < $JVM_ARGS_ENV_FILE
fi

JAVA_OPTS=${JAVA_OPTS:-"${JVM_ARGS}"}

if [[ "$DOCKER" == "true" ]]; then
  JAVA_OPTS="${JAVA_OPTS} -XX:-UseContainerSupport -DDOCKER=true"
fi

echo "JAVA_HOME=${JAVA_HOME}"
echo "JAVA_OPTS=${JAVA_OPTS}"

MODULES_PATH=(
  "$DOLPHINSCHEDULER_HOME/dolphinscheduler-api/target/api-server"
  "$DOLPHINSCHEDULER_HOME/dolphinscheduler-master/target/master-server"
  "$DOLPHINSCHEDULER_HOME/dolphinscheduler-worker/target/worker-server"
  "$DOLPHINSCHEDULER_HOME/dolphinscheduler-alert/dolphinscheduler-alert-server/target/alert-server"
)

CP=""
for module in "${MODULES_PATH[@]}"; do
  if [ -d "$module/libs" ]; then
    CP=$CP:"$module/libs/*"
  fi
done

PLUGINS_PATH=(
alert-plugins
datasource-plugins
storage-plugins
task-plugins
)

for plugin in ${PLUGINS_PATH[@]}; do
  if [ -d "$DOLPHINSCHEDULER_HOME/plugins/$plugin" ]; then
    CP=$CP:"$DOLPHINSCHEDULER_HOME/plugins/$plugin/*"
  fi
done

for jar in $(find $STANDALONE_HOME/libs/* -name "*.jar"); do
  CP=$CP:"$jar"
done

$JAVA_HOME/bin/java $JAVA_OPTS \
  -cp "$STANDALONE_HOME/conf:$STANDALONE_HOME/classes$CP" \
  org.apache.dolphinscheduler.StandaloneServer

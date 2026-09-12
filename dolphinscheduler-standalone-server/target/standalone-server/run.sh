#!/bin/bash
set -e
cd "$(dirname "$0")"

M2=$HOME/.m2/repository
PROJECT=/Users/linjinyu/Documents/code/trae/delphineSchedulerETL/apache-dolphinscheduler-3.4.2-src

# Sync the built UI dist into ./ui so the API server can serve it under /dolphinscheduler/ui/**.
UI_DIST="$PROJECT/dolphinscheduler-ui/dist"
if [ -d "$UI_DIST" ]; then
  echo "[run.sh] Using UI dist: $UI_DIST"
  rm -rf "$PWD/ui"
  cp -R "$UI_DIST" "$PWD/ui"
fi

# Classpath parts: master/worker/api/alert each with their test-scope deps so transitive libs are included.
# (如果 /tmp/ds-cp-*.txt 不存在, 直接 glob m2 里的所有依赖 jar)
CP_PARTS=()
MODULE_CP_FOUND=false
for module in dolphinscheduler-master dolphinscheduler-worker dolphinscheduler-api dolphinscheduler-alert-server; do
  short=$(echo "$module" | sed 's/dolphinscheduler-//')
  if [ -f "/tmp/ds-cp-$short.txt" ]; then
    CP_PARTS+=("$(cat /tmp/ds-cp-$short.txt)")
    MODULE_CP_FOUND=true
  fi
done

# Authentication auto-configuration references Spring Security types even when
# the full security auto-configuration is disabled. Add the Java 8-compatible
# 5.7.11 modules explicitly (newer 6.x modules require Java 17).
for jar in "$M2"/org/springframework/security/spring-security-{config,core,crypto,web}/5.7.11/*.jar; do
  [ -f "$jar" ] && CP_PARTS+=("$jar")
done

# All standalone-server provided modules (master, worker, api, alert-server, plus every plugin bundle).
# Adding ALL dolphinscheduler-*.jar ensures any missing transitive api/spi module is picked up.
for jar in "$M2"/org/apache/dolphinscheduler/*/3.4.2/*-3.4.2.jar; do
  # 排除几个 shade 了 slf4j-log4j12 引起 SLF4JLoggerContext 类冲突的 jar
  case "$jar" in
    */dolphinscheduler-datasource-dolphindb/*|\
    */dolphinscheduler-task-aliyunserverlessspark/*)
      continue ;;
  esac
  CP_PARTS+=("$jar")
done
# Include -shade.jar siblings (datasource / task / alert plugins bundle their JDBC drivers and other
# heavy deps into a shaded classifier). Plain jar is the same classes minus the bundled deps, so
# the shade jar takes precedence and the plain jar is excluded further down.
SHADE_CACHE="$PWD/.shade-cache"
mkdir -p "$SHADE_CACHE"
for jar in "$M2"/org/apache/dolphinscheduler/*/3.4.2/*-3.4.2-shade.jar; do
  # 同上, 排除 shade jar 里的 slf4j-log4j12 冲突 + hive shade 包含 servlet 3.x 污染 classpath
  case "$jar" in
    */dolphinscheduler-datasource-dolphindb/*|\
    */dolphinscheduler-task-aliyunserverlessspark/*)
      continue ;;
  esac
  # 多个 datasource/task shade jar 内嵌了 javax.servlet 3.x 包, 会覆盖 Tomcat 9 / Servlet 4.x 的 HttpServletRequest,
  # 运行时触发 NoSuchMethodError (Tomcat ApplicationHttpRequest 调用 getHttpServletMapping()).
  # 用 cached jar 把 javax.servlet.* 类剥除 (放回 META-INF/services 即可保证 shade 业务类正常工作).
  if unzip -l "$jar" 2>/dev/null | grep -q "javax/servlet/http/HttpServletRequest.class"; then
    cached="$SHADE_CACHE/$(basename "$jar")"
    if [ ! -f "$cached" ] || [ "$jar" -nt "$cached" ]; then
      echo "[run.sh] Stripping javax.servlet from $(basename "$jar") -> $cached"
      tmpdir=$(mktemp -d)
      (cd "$tmpdir" && unzip -qo "$jar" && find . -path './javax/servlet*' -delete && zip -qr "$cached" . -x "javax/servlet/*" "j/avax/servlet/*")
      rm -rf "$tmpdir"
    fi
    CP_PARTS+=("$cached")
  else
    CP_PARTS+=("$jar")
  fi
done

# Also include the local standalone-server build artifact itself.
CP_PARTS+=("$PROJECT/dolphinscheduler-standalone-server/target/dolphinscheduler-standalone-server-3.4.2.jar")

# Oracle JDBC driver is not on Maven Central (Oracle commercial license). The shade plugin of
# dolphinscheduler-datasource-oracle cannot bundle it, so we add a real ojdbc jar from the local
# M2 cache here. Prefer ojdbc8-12.2.0.1, which is Oracle's official "compatible with 11g/12c/18c/19c"
# build — newer 21.x drivers will reject older server TNS handshakes (ORA-17800). Fall back to
# newest available if 12.2.0.1 is not in the cache.
OJDBC_JAR=$(ls -1 "$M2"/com/oracle/database/jdbc/ojdbc8/12.2.0.1/ojdbc8-12.2.0.1.jar 2>/dev/null | head -1)
if [ -z "$OJDBC_JAR" ] || [ ! -f "$OJDBC_JAR" ]; then
  OJDBC_JAR=$(ls -1 "$M2"/com/oracle/database/jdbc/ojdbc8/*/ojdbc8-*.jar 2>/dev/null | sort -V | tail -1)
fi
if [ -n "$OJDBC_JAR" ] && [ -f "$OJDBC_JAR" ]; then
  echo "[run.sh] Using Oracle JDBC: $OJDBC_JAR"
  CP_PARTS+=("$OJDBC_JAR")
fi

# Standalone-server's own runtime deps (jackson etc.). Prefer the Maven-resolved
# module classpaths above; only use the broad fallback when none were generated.
if [ -f "/tmp/ds-cp.txt" ] && [ "$MODULE_CP_FOUND" = false ]; then
  CP_PARTS+=("$(cat /tmp/ds-cp.txt)")
elif [ "$MODULE_CP_FOUND" = false ]; then
  echo "[run.sh] /tmp/ds-cp.txt 缺失, 自动生成 cp..."
  {
    find "$M2" -name '*.jar' \
      ! -name '*-sources.jar' \
      ! -name '*-javadoc.jar' \
      ! -name '*-tests.jar' \
      ! -name '*-test-fixtures.jar' | while read jar; do
      case "$jar" in
        # 排除高版本 spring-boot 3.x (class file 61+, 不兼容 JDK 8)
        */spring-boot/3.*|*/spring-boot-*/3.*) continue;;
        # 排除 spring 6.x (class file 61+)
        */spring-*/6.*.*) continue;;
        # 排除 spring-cloud, spring-security 6+
        */spring-cloud/*|*/org/springframework/cloud/*) continue;;
        */spring-security/6.*|*/org/springframework/security/*) continue;;
        # Logback 1.3+ requires Java 11; the standalone build runs on JDK 8.
        */logback-classic/1.[345].*|*/logback-core/1.[345].*) continue;;
        # 排除 JDK 17+ 的 jar
        */elasticsearch/8.*) continue;;
        # 排除 netty 5 (JDK 17)
        */io/netty/netty-*5.*) continue;;
      esac
      echo "$jar"
    done
  } > /tmp/ds-cp.lines
  paste -sd: /tmp/ds-cp.lines > /tmp/ds-cp.txt
  CP_PARTS+=("$(cat /tmp/ds-cp.txt)")
fi

# Local ETL/runtime drivers are intentionally outside Maven's module graph.
for jar in "$PWD"/lib/*.jar; do
  [ -f "$jar" ] && CP_PARTS+=("$jar")
done

CP=$(printf '%s:' "${CP_PARTS[@]}")
# Remove conflicting slf4j bindings — keep only logback.
# Keep exactly the Logback version used by the 3.4.2 Spring Boot baseline;
# the Maven cache also contains incompatible 1.1.x/1.2.x/1.4.x/1.5.x variants.
CP=$(echo "$CP" | tr ':' '\n' | awk '!/\/logback-(classic|core)\// || /\/logback-(classic|core)\/1\.2\.11\//' | awk '!/\/org\/springframework\/security\// || /\/spring-security-(config|core|crypto|web)\/5\.7\.11\//' | grep -v -E '/slf4j-simple/|/slf4j-reload4j/|/slf4j-jdk14/|/slf4j-nop/|/slf4j-log4j12/|/log4j-slf4j-impl/|/log4j-over-slf4j/|/org/springframework/cloud/|/org/dinky/|dolphinscheduler-task-aliyunserverlessspark|dolphinscheduler-datasource-dolphindb' | paste -sd ':' -)
CP="classes:conf:${CP}"

exec /Users/linjinyu/Library/Java/JavaVirtualMachines/corretto-1.8.0_482/Contents/Home/bin/java \
  -Xms512m -Xmx2g \
  -verbose:class \
  -Djava.security.properties=$PWD/conf/java.security.override \
  -DDS_LOG_DIR="$PWD/logs" \
  -Dlogging.config="file:$PWD/conf/logback-spring.xml" \
  -Dorg.springframework.boot.logging.LoggingSystem=org.springframework.boot.logging.logback.LogbackLoggingSystem \
  -Dlogging.level.org.springframework=DEBUG \
  -Dspring.config.location="file:$PWD/conf/application.yaml" \
  -Dspring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration,org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration,org.springframework.boot.actuate.autoconfigure.metrics.mongo.MongoMetricsAutoConfiguration \
  -Dspring.flyway.enabled=false \
  -Dspring.flyway.locations=classpath:sql \
  -Dspring.flyway.fail-on-missing-locations=false \
  -Dspring.flyway.baseline-on-migrate=true \
  -cp "$CP" \
  org.apache.dolphinscheduler.StandaloneServer

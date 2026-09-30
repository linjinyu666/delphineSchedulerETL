ARG BASE_IMAGE=dockerhub.cninfo.com.cn/global/jdk:v1.8.0-sp2-aarch64-r2
FROM ${BASE_IMAGE}

ENV DOLPHINSCHEDULER_HOME=/opt/dolphinscheduler \
    TZ=Asia/Shanghai

WORKDIR ${DOLPHINSCHEDULER_HOME}

# The CI job must run Maven first. The official distribution tar contains
# service launchers, libraries, plugins, bundled JDBC drivers, configs and flink-etl.
# Oracle JDBC is not bundled by default; add ojdbc8 to api-server/libs (and
# worker-server/libs when needed) in the build context before building this image.
# One immutable role image is used by separate API/Master/Worker/Alert
# containers; SERVICE selects exactly one process per container.
COPY dist/target/apache-dolphinscheduler-*-bin.tar.gz /tmp/
RUN tar -xzf /tmp/apache-dolphinscheduler-*-bin.tar.gz --strip-components=1 \
    && rm -f /tmp/apache-dolphinscheduler-*-bin.tar.gz
COPY deploy/cluster/entrypoint.sh /usr/local/bin/ds-entrypoint.sh
COPY deploy/cluster/runtime-env.sh /usr/local/bin/ds-runtime-env.sh

RUN chmod +x /usr/local/bin/ds-entrypoint.sh /usr/local/bin/ds-runtime-env.sh \
    && mkdir -p /opt/dolphinscheduler/logs /opt/dolphinscheduler/resource

ENTRYPOINT ["/usr/local/bin/ds-entrypoint.sh"]

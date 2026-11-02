# 内网 DolphinScheduler 集群补齐 Oracle JDBC 驱动

本文用于处理内网创建或测试 Oracle 数据源时出现的 `ClassNotFoundException: oracle.jdbc.OracleDriver`。当前发布包中的 `dolphinscheduler-datasource-oracle-3.4.2-shade.jar` 约 135 KB，不含 Oracle JDBC 驱动；达梦插件包则已包含 `dm.jdbc.driver.DmDriver`。因此，无须替换 Oracle 插件，也无须改数据库地址或密码来处理这一报错。

集群部署统一把**一份** `ojdbc8-19.3.0.0.jar` 放到 DolphinScheduler 运行根目录下的 `plugins/datasource-plugins/`。当前项目的 API、Master 和 Worker 启动脚本都会将此目录加入类路径。不要再把同一驱动复制到 `api-server/libs/` 或 `worker-server/libs/`：相同版本重复放置虽通常不会立即报错，但不同版本会增加类加载冲突和排查难度。

## 准备驱动文件

外网开发机上已有 `ojdbc8-19.3.0.0.jar`，路径为：

```text
/Users/linjinyu/.m2/repository/com/oracle/database/jdbc/ojdbc8/19.3.0.0/ojdbc8-19.3.0.0.jar
```

该文件约 4 MB，包含 `oracle/jdbc/OracleDriver.class`，类文件版本为 52，可由 JDK 8 加载。通过公司批准的方式将其导入内网。此**具体文件**的 SHA-256 为：

```text
a66d27a14f3adee484427cc4de008af85a5c3e78e2e3285a4dba1277332978a5
```

若使用的是其他版本的 `ojdbc8`，校验值会不同；不要把上述值当作所有 Oracle 驱动的通用校验值。不要把数据库账号、密码写入本文或打进镜像。

## 直接在内网服务器上启动

以下命令在**每台 API 服务器，以及每台可能执行 Oracle ETL 的 Worker 服务器**执行。把两个示例路径替换成实际路径；`DS_ROOT` 应指向含有 `api-server/`、`worker-server/` 和 `plugins/` 的运行包根目录，而不是它们的上级目录。同一台服务器上两个服务共用一个运行目录时，只放一份驱动。先执行检查，确认通过后再执行下一组安装命令。

```bash
DS_ROOT="/实际路径/dolphinscheduler-cluster-runtime-3.4.2"
DRIVER_SOURCE="/已导入文件的路径/ojdbc8-19.3.0.0.jar"
test -f "$DRIVER_SOURCE"
test -d "$DS_ROOT/plugins/datasource-plugins"
printf '%s  %s\n' 'a66d27a14f3adee484427cc4de008af85a5c3e78e2e3285a4dba1277332978a5' "$DRIVER_SOURCE" | sha256sum -c -
find "$DS_ROOT/api-server/libs" "$DS_ROOT/worker-server/libs" "$DS_ROOT/plugins/datasource-plugins" -maxdepth 1 -name 'ojdbc*.jar' -print
```

如果 `test` 或 `sha256sum -c` 失败，先核对路径和驱动文件，不要继续。如果 `find` 显示其他目录已有 `ojdbc*.jar`，先确认其用途和版本，再按变更流程移走多余副本；不要在旧服务运行中盲目覆盖或删除。确认后执行：

```bash
install -m 0644 "$DRIVER_SOURCE" "$DS_ROOT/plugins/datasource-plugins/ojdbc8-19.3.0.0.jar"
jar tf "$DS_ROOT/plugins/datasource-plugins/ojdbc8-19.3.0.0.jar" | grep '^oracle/jdbc/OracleDriver.class$'
```

`jar tf` 应输出 `oracle/jdbc/OracleDriver.class`。

文件放好后，**先停止旧 API 进程，再按当前运行包的方式启动 API**（例如运行包提供的 `start-server.sh api`）。只重启 Worker 不能解决页面“测试连接”失败；有多个 API 节点时，每个节点都要更新并重启。**如果要通过工作流执行 Oracle ETL，所有可能接收该任务的 Worker 节点也必须放入驱动并重启 Worker**：Worker 会先用数据源连接 Oracle，校验绑定的 Schema，然后才启动本地 Runner 或提交 Flink 集群。运行中的 JVM 不会自动加载新复制的 JAR。Master 和 Alert 不参与这次 Oracle 数据源测试及 ETL 提交，不需要为此单独重启。

重启后在网页上重新测试 Oracle 数据源。若 `ClassNotFoundException` 消失、转而出现 Oracle 网络、服务名或认证错误，说明驱动加载问题已解决，需按新错误继续排查。若仍报缺类，检查是否改错运行包目录，以及实际 API 启动脚本是否包含 `plugins/datasource-plugins/*`。

## 通过 CCE 流水线构建镜像

不要只把 JAR 复制进正在运行的 Pod：Pod 重建后文件会丢失。应让每次构建的新镜像都包含同一份驱动。当前仓库的 Dockerfile 从 `dist/target/apache-dolphinscheduler-*-bin.tar.gz` 解压运行包；如果选择在 Docker 构建时另行复制驱动，需同时完成以下两处内网修改。

1. 在 Docker 构建前，通过内网 Git 或流水线制品注入，将驱动放到构建上下文的 `deploy/cluster/vendor/ojdbc8-19.3.0.0.jar`。是否允许将第三方驱动提交到 Git，应遵循公司的制品和许可要求。
2. 在仓库根目录的 `.dockerignore` 末尾追加以下规则，允许这个文件进入构建上下文：

   ```text
   !deploy/cluster/vendor/
   !deploy/cluster/vendor/ojdbc8-19.3.0.0.jar
   ```

3. 在 `deploy/cluster/Dockerfile` 解压发布包的 `RUN tar ...` 指令**之后**、设置 `ENTRYPOINT` **之前**增加：

   ```dockerfile
   COPY deploy/cluster/vendor/ojdbc8-19.3.0.0.jar /opt/dolphinscheduler/plugins/datasource-plugins/
   ```

4. 构建并推送新镜像，滚动更新所有 API 副本；如需执行 Oracle ETL，也滚动更新所有可能接收该任务的 Worker 副本。检查新 Pod 中只存在预期的一份驱动，再在网页上测试连接，并执行一次 Oracle ETL 工作流验证。

如果流水线选择**先把驱动加入发布包压缩文件**，则不要再执行上述 Dockerfile `COPY`，确保最终镜像中仍只保留一份。Flink 集群执行所用 Runner 的依赖与 DolphinScheduler API 类路径是两回事；页面“测试连接”优先检查 API 镜像中的驱动。

## 验收清单

- Oracle 插件 JAR 和独立的 `ojdbc8` JAR 都位于运行目录的 `plugins/datasource-plugins/`，且没有其他目录中的重复版本。
- `jar tf` 能找到 `oracle/jdbc/OracleDriver.class`；若使用本文指定的文件，内网 SHA-256 与上文一致。
- 所有 API 节点或 Pod 都已加载新文件并重启，网页“测试连接”不再报 `ClassNotFoundException`。
- 若需执行 Oracle ETL，所有可能接收该任务的 Worker 节点或 Pod 已更新并重启，且工作流实际运行通过；若使用 Flink 集群执行，还需另外验证 Flink Runner 的驱动依赖，不能用 API 连接成功代替该验证。

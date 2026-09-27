# DolphinScheduler 3.4.2 本地集群部署手册（MySQL JDBC 注册中心）

本文用于在当前开发机上模拟生产拓扑，并作为后续部署到多台服务器的安装参考。

## 1. 目标拓扑

本地保留现有 standalone 实例，同时使用另一组端口启动一套拆分服务：

|   服务   |    实例     |         端口         |
|--------|-----------|--------------------|
| 前端/API | API-01    | 12346              |
| 前端/API | API-02    | 12347              |
| Master | Master-01 | RPC 5680，HTTP 5682 |
| Master | Master-02 | RPC 5681，HTTP 5683 |
| Worker | Worker-01 | RPC 1236，HTTP 1237 |
| Worker | Worker-02 | RPC 1238，HTTP 1239 |
| MySQL  | 现有 MySQL  | 3306               |

现有 standalone 使用 `12345/5678/1234`，本方案不覆盖它，便于失败时回退。

生产环境对应关系为：

```text
浏览器 -> Nginx -> API-01/API-02
                    |
             MySQL JDBC 注册中心
                    |
          Master-01/Master-02
                    |
          Worker-01/Worker-02...
                    |
              ETL/Flink 本地进程
```

## 2. 前置条件

要求：

* JDK 8：运行 DolphinScheduler 3.4.2 服务；
* JDK 11+：运行当前 ETL/Flink Runner；
* Maven 本地依赖已下载；
* MySQL 已启动并可访问；
* MySQL 中存在 `dolphinscheduler` 数据库和运行用户；
* 当前仓库源码和关联 ETL Runner 位于同一台开发机。

不要把数据库密码写入 Git。部署时使用环境变量、Secret 或服务器外部配置。

## 3. MySQL 初始化

首次部署使用 DolphinScheduler 的 MySQL schema：

```bash
mysql -h <mysql-host> -P 3306 -u <admin-user> -p dolphinscheduler \
  < dolphinscheduler-dao/src/main/resources/sql/dolphinscheduler_mysql.sql
```

JDBC 注册中心还需要以下表：

```bash
mysql -h <mysql-host> -P 3306 -u <admin-user> -p dolphinscheduler \
  < dolphinscheduler-registry/dolphinscheduler-registry-plugins/dolphinscheduler-registry-jdbc/src/main/resources/mysql_registry_init.sql
```

生产环境不要在已有数据库上重复执行带有 `DROP TABLE` 的注册中心初始化脚本。应先备份，并确认脚本版本与 DolphinScheduler 版本一致。

## 4. 从源码构建

### 4.1 构建后端服务

```bash
export JAVA_HOME=/path/to/jdk8
./mvnw -B clean package -DskipTests
```

如果仓库中某个测试源码本身无法通过测试编译，可只为本地部署产物使用：

```bash
./mvnw -B clean package -Dmaven.test.skip=true \
  -Djacoco.skip=true -Dspotless.check.skip=true
```

`-Dmaven.test.skip=true` 会跳过测试源码编译，只适用于已经单独完成生产代码编译检查的本地部署；发布前仍应修复测试编译问题并执行完整 CI。

构建结果应至少包含：

```text
dolphinscheduler-api/target/api-server/
dolphinscheduler-master/target/master-server/
dolphinscheduler-worker/target/worker-server/
```

如果只修改 ETL 插件，可先验证：

```bash
./mvnw -q -pl dolphinscheduler-task-plugin/dolphinscheduler-task-etl \
  -am clean compile -DskipTests -Dspotless.check.skip=true
```

构建后的 ETL 插件必须复制到 Worker 的 task plugin 目录。每台 Worker 都要使用同一版本的插件。

### 4.2 构建前端

```bash
cd dolphinscheduler-ui
pnpm install --frozen-lockfile
pnpm run build:prod
```

前端构建结果在：

```text
dolphinscheduler-ui/dist/
```

### 4.3 使用项目内 Nginx 配置

API-01 和 API-02 不负责托管前端页面，生产访问入口应由 Nginx 提供。项目内已经提供本地配置模板：

```text
tools/local-cluster/nginx/nginx.conf.template
tools/local-cluster/nginx/start-nginx.sh
tools/local-cluster/nginx/stop-nginx.sh
```

本地启动前端入口：

```bash
cd dolphinscheduler-ui
pnpm install --frozen-lockfile
pnpm run build:prod
cd ..
./tools/local-cluster/nginx/start-nginx.sh
```

启动后访问 `http://127.0.0.1:18080`。Nginx 将静态页面指向 `dolphinscheduler-ui/dist`，并将 `/dolphinscheduler/` 请求轮询转发到 `127.0.0.1:12346` 和 `127.0.0.1:12347`。停止命令：

```bash
./tools/local-cluster/nginx/stop-nginx.sh
```

如果服务器上的 Nginx 不在 `PATH`，可以指定：

```bash
NGINX_BIN=/usr/sbin/nginx ./tools/local-cluster/nginx/start-nginx.sh
```

生产环境将 `dist` 部署到 Nginx；本地验证可以使用静态文件服务器，或暂时由 API 提供静态页面。

### 4.4 构建 ETL/Flink Runner

当前 ETL 任务使用：

```text
com.example.flink.pipeline.ConfigurableJdbcEtl
```

构建关联 Runner 后，将以下内容复制到每一台 Worker：

```text
flink-learning-*.jar
Flink 依赖包
MySQL JDBC 驱动
Oracle JDBC 驱动
达梦 JDBC 驱动
其他 ETL connector
```

建议目录：

```text
/data/dolphinscheduler/etl-lib/
/data/dolphinscheduler/flink-tmp/
/data/dolphinscheduler/resources/
```

## 5. 服务目录

生产环境建议每台服务器使用统一目录：

```text
/opt/dolphinscheduler/
  api-server/
  master-server/
  worker-server/
  plugins/
    datasource-plugins/
    task-plugins/
    storage-plugins/
  resources/
  logs/
```

本地模拟集群可以使用：

```text
/tmp/dolphinscheduler-local-cluster/
  api-01/
  api-02/
  master-01/
  master-02/
  worker-01/
  worker-02/
  plugins/
  resources/
  logs/
```

## 6. MySQL JDBC 注册中心配置

API、Master、Worker 的配置都必须使用相同的注册中心：

```yaml
registry:
  type: jdbc
  hikariConfig:
    driverClassName: com.mysql.cj.jdbc.Driver
    jdbcUrl: jdbc:mysql://<mysql-host>:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&allowPublicKeyRetrieval=true
    username: ${DS_REGISTRY_DB_USER}
    password: ${DS_REGISTRY_DB_PASSWORD}
    poolName: DolphinSchedulerRegistryDataSource
```

服务元数据库配置使用同一个数据库：

```yaml
spring:
  profiles:
    active: mysql
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://<mysql-host>:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&allowPublicKeyRetrieval=true
    username: ${DS_DB_USER}
    password: ${DS_DB_PASSWORD}
```

MySQL 注册中心的心跳和会话参数建议：

```yaml
registry:
  heartbeatRefreshInterval: 3s
  sessionTimeout: 60s
```

## 7. API 配置

API-01 和 API-02 使用相同配置，只有端口和日志目录不同：

```yaml
server:
  port: 12346
  servlet:
    context-path: /dolphinscheduler/

api:
  base-url: http://127.0.0.1:12346/dolphinscheduler
  ui-url: http://127.0.0.1:12346/dolphinscheduler/ui
```

API-02 改为：

```yaml
server:
  port: 12347
api:
  base-url: http://127.0.0.1:12347/dolphinscheduler
```

生产环境这里应填写 Nginx 对外域名，而不是 API 节点自身地址。

## 8. Master 配置

Master-01：

```yaml
server:
  port: 5682

master:
  listen-port: 5680
  max-heartbeat-interval: 10s
```

Master-02：

```yaml
server:
  port: 5683

master:
  listen-port: 5681
  max-heartbeat-interval: 10s
```

两台 Master 必须连接同一个 MySQL JDBC 注册中心。服务器 IP 发生变化时，要通过固定 IP、主机名或：

```yaml
dolphin:
  scheduler:
    network:
      interface:
        preferred: eth0
```

确保注册的地址是业务网卡地址。

## 9. Worker 配置

Worker-01：

```yaml
server:
  port: 1237

worker:
  listen-port: 1236
  group: default
  host-weight: 100
  max-heartbeat-interval: 10s
```

Worker-02：

```yaml
server:
  port: 1239

worker:
  listen-port: 1238
  group: default
  host-weight: 100
  max-heartbeat-interval: 10s
```

每台 Worker 必须安装相同的 ETL 运行依赖，并设置：

```bash
export ETL_JAVA_HOME=/path/to/jdk11-or-newer
export FLINK_LEARNING_LIB=/data/dolphinscheduler/etl-lib
```

## 10. ETL 本地执行配置

本地执行模式配置示例：

```text
executionMode=LOCAL
runtimeMode=BATCH
localJvmXms=512m
localJvmXmx=4g
localJvmXss=1m
parallelism=2
```

实际 Worker 子进程应包含：

```bash
java -Xms512m -Xmx4g -Xss1m \
  -cp <etl-classpath> \
  com.example.flink.pipeline.ConfigurableJdbcEtl \
  /tmp/dolphinscheduler-etl/etl-<task-id>.properties
```

大表 JOIN、排序和聚合还需要配置 Flink Managed Memory 与临时目录。临时目录必须有足够空间，且不能使用会被系统自动清理的目录作为生产存储。

## 11. 启动顺序

```text
1. MySQL
2. Master-01、Master-02
3. Worker-01、Worker-02
4. API-01、API-02
5. Alert Server
6. Nginx/前端
```

每个服务启动前设置自己的 `JAVA_HOME`、配置目录、日志目录和 JVM 参数。不要直接修改 `target` 目录中的临时产物作为长期部署方案；应使用正式发布目录和外部配置文件。

## 12. 启动检查

当前仓库提供了一个本地多进程验证脚本。它使用 `/tmp/ds-local-cluster` 作为运行目录，不会覆盖现有 standalone 的 `12345/5678/1234` 端口：

```bash
./tools/local-cluster/start-local-cluster.sh
./tools/local-cluster/stop-local-cluster.sh
```

脚本默认使用 JDK 8、MySQL JDBC 注册中心和以下端口。生产环境不要照搬 `/tmp`，应将目录改为正式发布目录，并由 systemd、Docker Compose 或 Kubernetes 管理进程。

端口检查：

```bash
lsof -nP -iTCP:12346 -sTCP:LISTEN
lsof -nP -iTCP:12347 -sTCP:LISTEN
lsof -nP -iTCP:5680 -sTCP:LISTEN
lsof -nP -iTCP:5681 -sTCP:LISTEN
lsof -nP -iTCP:1236 -sTCP:LISTEN
lsof -nP -iTCP:1238 -sTCP:LISTEN
```

健康检查：

```bash
curl -i http://127.0.0.1:12346/dolphinscheduler/actuator/health
curl -i http://127.0.0.1:12347/dolphinscheduler/actuator/health
curl -i http://127.0.0.1:5682/actuator/health
curl -i http://127.0.0.1:5683/actuator/health
curl -i http://127.0.0.1:1237/actuator/health
curl -i http://127.0.0.1:1239/actuator/health
```

日志中应能看到：

```text
JdbcRegistryProperties
Master registered successfully
Worker registered successfully
```

同时确认注册表中的地址不是旧 IP：

```sql
-- Master/Worker 的实时注册节点；data_value 是 JSON，含 host、port、processId、reportTime
SELECT data_key, data_type, client_id, last_update_time, data_value
FROM t_ds_jdbc_registry_data
WHERE data_key LIKE '/nodes/master/%' OR data_key LIKE '/nodes/worker/%'
ORDER BY data_key;

-- JDBC 注册客户端本身的心跳
SELECT id, client_name, last_heartbeat_time, create_time
FROM t_ds_jdbc_registry_client_heartbeat
ORDER BY id;
```

因此，Master/Worker 的“在线状态”主要看 `t_ds_jdbc_registry_data` 中的 `EPHEMERAL` 节点；`t_ds_jdbc_registry_client_heartbeat` 记录的是连接注册中心的客户端心跳，不是任务实例状态。任务实例状态仍记录在 `t_ds_workflow_instance` 和 `t_ds_task_instance`。

本次本机验证结果：API-01 `12346` 和 API-02 `12347` 的 `/dolphinscheduler/actuator/health` 返回 HTTP 200，响应中的 `db.status` 为 `UP`，数据库类型为 `MySQL`。Master、Worker 进程也能启动并监听各自端口；受限桌面会话结束后会回收由脚本派生的后台进程，正式服务器上应使用系统服务管理器保持驻留。

## 13. ETL 验证流程

按以下顺序验证：

1. 创建一个 Shell 工作流，确认 API、Master、Worker 链路正常。
2. 创建单 Source ETL，验证通过 `dsId` 获取数据库配置。
3. 分别验证 MySQL、Oracle、达梦数据源。
4. 创建 Source -> Join -> SQL -> Compare -> Sink 作业。
5. 将 Worker-01 停止，确认任务可以调度到 Worker-02。
6. 配置本地 `Xms/Xmx/Xss`，查看实际任务日志中的 Java 命令。
7. 执行大表 JOIN、排序、聚合，确认 Flink 临时目录产生溢写文件。
8. 检查任务失败、重试、取消和日志清理。

## 14. 常见故障

### 14.1 `Call method to Host(...) failed`

通常是注册中心中残留旧 IP，或者新 IP 不可达。检查：

```text
注册表中的 Master/Worker 地址
服务器网卡配置
防火墙
5678/1234 端口连通性
```

修复地址后必须重启对应服务，让旧注册信息过期或被覆盖。

### 14.2 服务启动后找不到 ETL 任务插件

确认每台 Worker 都有：

```text
dolphinscheduler-task-etl-*.jar
flink-learning-*.jar
数据库驱动 jar
```

### 14.3 ETL 本地内存参数没有生效

任务日志中的 Java 命令必须出现：

```text
-Xms...
-Xmx...
-Xss...
```

只看到 properties 文件中的 `local.jvm.xms` 等字段，并不能证明 JVM 已使用这些参数。

### 14.4 临时 View 找不到或重复读取上游

`TEMPORARY VIEW` 只保存 SQL 定义，不保存数据。需要多个 SQL 复用中间结果时，应写入共享文件系统、Parquet 或实际中间表。

## 15. 生产迁移注意事项

本地多进程集群只能验证服务拆分和注册逻辑，生产迁移时还需要：

* MySQL 高可用、备份和恢复演练；
* Nginx 或云负载均衡；
* 统一资源中心，例如 MinIO、S3、HDFS 或 NFS；
* Master/Worker 使用固定 IP 或 DNS；
* 所有 Worker 安装一致的 ETL/Flink 运行包；
* 日志集中采集；
* 监控 CPU、内存、磁盘、JVM、任务失败率；
* 本地 Flink 模式与远程 Flink 集群模式分开验证。

当前项目的 `FLINK_CLUSTER` 页面参数还需要映射到真实 Flink JobManager REST/CLI 提交流程；在此完成前，生产环境应明确标记为 Worker 本地执行模式。

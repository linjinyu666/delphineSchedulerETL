# DolphinScheduler Flink ETL Runtime

这是 ETL runner 的独立 Maven 工程，源码从原 `etl-flinksql/flink-learning` 工程集中到当前 DolphinScheduler 仓库中，便于统一版本管理。此目录仅保留 ETL 运行所需代码、连接器适配和测试，不包含 Flink 学习示例。

## 内容

- `ConfigurableJdbcEtl`：ETL Java 进程入口，读取 DolphinScheduler 生成的 properties，注册 Flink JDBC 表并执行 SQL。
- `AsTextUdf`：处理 LOB 字段的 UDF。
- MySQL、Oracle、达梦 JDBC connector 方言实现及 SPI 注册资源。
- runner 与方言相关的单元测试。

打包后的 JAR 主类为 `ConfigurableJdbcEtl`；DolphinScheduler 也会通过该类启动 runner。

## 构建

本模块保留独立 `pom.xml`，不加入 DolphinScheduler 根 Maven reactor；这样不会把 Flink 1.20 的依赖带入 DolphinScheduler 服务构建。

### 本地执行版

默认构建仍生成适用于当前 `java -cp` 本地执行方式的 Fat JAR，包含 Flink 运行库、数据库驱动和连接器：

```bash
cd dolphinscheduler-flink-etl-runtime
mvn test package
```

产物为 `target/flink-learning-1.0.0-SNAPSHOT.jar`。现有 DolphinScheduler API 测试运行和 Worker 本地执行仍使用这个版本。

### Flink 集群提交版

提交到 Flink 1.20 Session 集群时，使用 `cluster` profile：

```bash
mvn -o -Pcluster test package
```

产物为 `target/flink-learning-1.0.0-SNAPSHOT-cluster.jar`。它不打包 Flink 核心、Table 运行库和日志实现（由 Flink 集群镜像提供），但会包含 Runner、MySQL/Oracle JDBC Connector、MySQL/Oracle 驱动、自定义方言/SPI 和所需的 Jackson 依赖。达梦 JDBC 驱动仍需单独提供。集群与 Runner 必须使用兼容的 Flink 版本；目前按 Flink 1.20.0 构建。

手动提交示例：

```text
<FLINK_HOME>/bin/flink run -m <JOBMANAGER_HOST>:8081 \
  -c com.example.flink.pipeline.ConfigurableJdbcEtl \
  target/flink-learning-1.0.0-SNAPSHOT-cluster.jar \
  /path/to/etl.properties
```

`etl.properties` 是本次运行的参数文件，必须能被运行 `flink run` 的提交客户端读取；不要把数据库密码烘焙进公共 JAR。Flink CLI 会提交作业 JAR/依赖并由集群调度，不需要将作业 JAR逐个复制到 TaskManager。

### DolphinScheduler Worker 提交到 Flink Session 集群

ETL 节点选择“Flink 集群执行”后，Worker 会调用 Flink CLI，提交上面的 `*-cluster.jar` 到已运行的 Standalone Session 集群。当前接入范围是 **Standalone + BATCH**；YARN、Kubernetes、STREAM 和 Checkpoint 暂不支持，会在 Worker 日志中明确报错，而不是静默按本地/批处理配置运行。

Worker 所在机器/容器需准备：

- Flink 1.20 客户端发行包，设置 `FLINK_HOME`，并确保 `$FLINK_HOME/bin/flink` 可执行；它通过 `-m <JobManager地址>:<REST端口>` 提交到 Session 集群。
- JDK 17，设置 `ETL_JAVA_HOME`。Worker 的 DolphinScheduler 服务仍可由 JDK 8 启动；Flink CLI 会用 `ETL_JAVA_HOME` 启动。
- 上一步构建的 `flink-learning-1.0.0-SNAPSHOT-cluster.jar`，Worker 本地可读。默认从 `FLINK_LEARNING_LIB` 下自动查找唯一的 `*-cluster.jar`；也可以用 `FLINK_ETL_CLUSTER_JAR` 指定完整路径。
- JobManager 和 TaskManager 节点都必须能访问 ETL 数据源和目标库。Runner JAR 会随 Flink CLI 提交，不需要复制到每个 TaskManager。

本仓库的 `deploy/cluster/runtime-env.sh` 有上述变量的默认示例。生产环境按实际路径覆盖 `FLINK_HOME`、`ETL_JAVA_HOME` 和 `FLINK_ETL_CLUSTER_JAR`，然后重启 Worker 使环境变量生效。

Standalone Session 集群的 JobManager/TaskManager CPU、内存、数量和 Slots 在 Flink 集群部署时配置；ETL 节点表单中的同名资源参数不会动态扩缩已有 Session 集群。ETL 节点中的并行度会作为 `flink run -p` 传入。当前 Runner 固定以 BATCH 方式执行，Checkpoint 对批处理不生效。

如果构建环境已缓存全部 Maven 依赖，可用上述 `-o` 参数离线构建。`target/` 产物默认忽略，不提交到 Git。

## 本地模式部署位置

本地模式使用 Fat JAR：将同一版本的 JAR 放入各 API 和 Worker 节点配置的 `DS_STANDALONE_LIB` 目录。API 侧用于 ETL 测试运行，Worker 侧用于工作流 ETL 任务执行。集群中的所有对应副本都应使用同一 runner 版本。Flink 集群模式则使用 `*-cluster.jar`，放在 Worker 可访问的位置，由 Worker 上的 Flink CLI 提交。

集群模式的 `*-cluster.jar` 用于通过 Flink CLI 提交，不要用它替换本地模式的 Fat JAR。请勿将含有数据库密码的本地 properties 文件提交到仓库。

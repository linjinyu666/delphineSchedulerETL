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

```bash
cd dolphinscheduler-flink-etl-runtime
mvn test package
```

如果构建环境已缓存全部 Maven 依赖，可使用 `mvn -o test package` 离线构建。产物为：

```text
target/flink-learning-1.0.0-SNAPSHOT.jar
```

该 JAR 是包含 Flink 运行依赖的 shaded JAR。内网构建环境若无法下载 Maven 依赖，可以在外网构建后将该 JAR 作为镜像构建输入；`target/` 产物默认忽略，不提交到 Git。

## 部署位置

将同一版本的 JAR 放入各 API 和 Worker 节点配置的 `DS_STANDALONE_LIB` 目录。API 侧用于 ETL 测试运行，Worker 侧用于工作流 ETL 任务执行。集群中的所有对应副本都应使用同一 runner 版本。

注意：用户自带的达梦 JDBC 驱动仍需按部署环境放入运行时 classpath；请勿将含有数据库密码的本地 properties 文件提交到仓库。

# DolphinScheduler 内网集群部署材料

本文对应当前项目的集群部署方式，适用于华为云 CCE 通过 Git 拉取代码后构建镜像，再部署到内网 Kubernetes 集群。

## 1. 部署架构

```text
用户
  |
Nginx / CCE Ingress
  |
API Service (2 副本)  ---> 外部 MySQL
                              ^
Master Service (2 副本) -----|
Worker Service (2+ 副本) ----|
Alert Service (1 副本) ------|
```

不使用 ZooKeeper，注册中心使用 DolphinScheduler 的 JDBC Registry，所有服务连接同一个 MySQL 数据库。

每个服务使用同一个镜像，通过 `SERVICE=api|master|worker|alert` 决定启动的进程。镜像内部已经包含 Java、DolphinScheduler 服务包、插件、驱动和 ETL 运行依赖；CCE 节点不需要联网下载 Maven 依赖。

注意 Java 版本：DolphinScheduler API/Master/Worker/Alert 使用 JDK 8；当前 Flink ETL 后端基于 Java 17 编译，运行 ETL 时必须提供 JDK 17。JDK 不打入 ZIP 运行包，建议在 Worker 镜像中同时放置 JDK 8 和 JDK 17，并设置 `ETL_JAVA_HOME=/opt/jdk17`。

## 2. 需要提交到 Git 的材料

| 路径 | 用途 |
|---|---|
| `deploy/cluster/Dockerfile` | 构建统一角色镜像 |
| `deploy/cluster/build-image.sh` | Maven 打包并构建镜像 |
| `deploy/cluster/entrypoint.sh` | 根据 `SERVICE` 启动 API、Master、Worker 或 Alert |
| `deploy/cluster/runtime-env.sh` | 统一配置 JDK 8、JDK 17、MySQL 和运行根目录 |
| `deploy/cluster/start-service.sh` | 直接启动指定角色服务 |
| `deploy/cluster/check-etl-java.sh` | 检查 Flink ETL 是否使用 JDK 17 |
| `deploy/cluster/nginx.conf` | Nginx 入口代理配置 |
| `deploy/cluster/docker-compose.yml` | 本地或单机 Docker 冒烟验证，不作为 CCE 生产编排 |
| `deploy/cluster/.env.example` | 内网环境变量模板 |
| `deploy/cluster/DEPLOYMENT.md` | 本部署说明 |

## 3. 构建镜像

### 3.1 基础镜像

把 `deploy/cluster/Dockerfile` 的 `BASE_IMAGE` 改成内网已有的 JDK 8 镜像，例如：

```dockerfile
ARG BASE_IMAGE=dockerhub.cninfo.com.cn/global/jdk:v1.8.0-sp2-aarch64-r2
FROM ${BASE_IMAGE}
```

CCE 构建节点如果是 ARM，必须使用 ARM64 JDK 8 基础镜像；如果是 x86，则替换为 x86_64 版本，不能混用。

### 3.2 流水线构建命令

在仓库根目录执行：

```bash
chmod +x deploy/cluster/build-image.sh
IMAGE=内网镜像仓库/dolphinscheduler:3.4.2-custom \
  deploy/cluster/build-image.sh
```

脚本会执行以下动作：

1. 使用 JDK 8 和 Maven 构建 DolphinScheduler 发布包；
2. 将 `dolphinscheduler-dist/target/apache-dolphinscheduler-*-bin.tar.gz` 放入 Docker 构建上下文；
3. 构建一个同时包含 API、Master、Worker、Alert 的统一镜像。

Worker 执行 ETL 时需要设置 Flink 依赖目录。当前 ETL Worker 会优先读取任务的 `libDir`，其次读取 `FLINK_LEARNING_LIB`，最后读取 Worker 当前目录下的 `lib/`。推荐统一设置：

```bash
export ETL_JAVA_HOME=/opt/jdk17
export FLINK_LEARNING_LIB=/opt/dolphinscheduler-flink-etl-runtime-3.4.2/standalone-server/lib
```

如果流水线已经提前打包，也可以直接准备：

```text
dist/target/apache-dolphinscheduler-3.4.2-bin.tar.gz
```

然后执行：

```bash
docker build \
  --build-arg BASE_IMAGE=内网JDK8基础镜像 \
  -f deploy/cluster/Dockerfile \
  -t 内网镜像仓库/dolphinscheduler:3.4.2-custom .
docker push 内网镜像仓库/dolphinscheduler:3.4.2-custom
```

## 4. MySQL 配置

### 4.1 创建数据库

在内网 MySQL 创建数据库和账号：

```sql
CREATE DATABASE dolphinscheduler DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dolphinscheduler'@'%' IDENTIFIED BY '替换为强密码';
GRANT ALL PRIVILEGES ON dolphinscheduler.* TO 'dolphinscheduler'@'%';
FLUSH PRIVILEGES;
```

生产环境建议由 DBA 创建账号，不要把密码提交到 Git。

### 4.2 初始化表结构

只在首次部署或升级版本时执行一次。使用发布包内的数据库升级脚本：

```bash
export DATABASE=mysql
export SPRING_DATASOURCE_URL='jdbc:mysql://MYSQL_HOST:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&allowPublicKeyRetrieval=true'
export SPRING_DATASOURCE_USERNAME=dolphinscheduler
export SPRING_DATASOURCE_PASSWORD='数据库密码'

./tools/bin/upgrade-schema.sh
```

如果内网不能在容器中执行脚本，使用发布包 `sql/` 目录中的 MySQL 初始化脚本，由 DBA 在目标数据库执行。不要让多个 API 副本同时做初始化。

## 5. 服务环境变量

每个服务都必须使用同一组数据库和 JDBC Registry 配置：

```text
DATABASE=mysql
SPRING_PROFILES_ACTIVE=mysql
SPRING_DATASOURCE_URL=jdbc:mysql://MYSQL_HOST:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=dolphinscheduler
SPRING_DATASOURCE_PASSWORD=********
REGISTRY_TYPE=jdbc
REGISTRY_HIKARICONFIG_DRIVERCLASSNAME=com.mysql.cj.jdbc.Driver
REGISTRY_HIKARICONFIG_JDBCURL=jdbc:mysql://MYSQL_HOST:3306/dolphinscheduler?useUnicode=true&characterEncoding=UTF-8&useSSL=false&allowPublicKeyRetrieval=true
REGISTRY_HIKARICONFIG_USERNAME=dolphinscheduler
REGISTRY_HIKARICONFIG_PASSWORD=********
```

CCE 中建议把密码放在 Secret，把普通配置放在 ConfigMap；不要把 `.env` 或密码写入镜像。

## 6. CCE 部署顺序

### 6.1 Secret

创建数据库密码 Secret：

```bash
kubectl -n etl create secret generic dolphinscheduler-db \
  --from-literal=password='数据库密码'
```

### 6.2 API

- 镜像：统一 DolphinScheduler 镜像；
- `SERVICE=api`；
- 副本数：2；
- Service：ClusterIP，端口 12345；
- 探针：`GET /dolphinscheduler/actuator/health`；
- 挂载共享资源和日志存储。

### 6.3 Master

- `SERVICE=master`；
- 副本数：2；
- RPC 端口：5678；
- 两个副本必须使用同一 MySQL Registry；
- CCE Service 建议使用 Headless Service 或稳定 DNS，确保 Worker 能访问 Master。

### 6.4 Worker

- `SERVICE=worker`；
- 副本数按任务量设置，初始建议 2；
- RPC 端口：1234；
- `WORKER_EXECUTION_PATH` 使用持久卷或可写临时目录；
- 如果执行 ETL/Flink，需要把 ETL jar、JDBC 驱动和插件随镜像打入，不能依赖公网下载。

### 6.5 Alert

- `SERVICE=alert`；
- 副本数建议 1，避免重复发送告警；
- RPC 端口：50052。

### 6.6 Nginx / Ingress

Nginx 只代理 API 服务，前端由 API 镜像内部的 `ui/` 目录提供，因此不依赖宿主机挂载前端目录。入口示例：

```text
https://etl.example.com/dolphinscheduler/ui/
```

如果使用 CCE Ingress，可以直接把 `/` 转发到 API Service；如果使用单独 Nginx 容器，使用本目录的 `nginx.conf`。

## 7. 本地 Docker 冒烟验证

复制环境变量并填写实际值：

```bash
cp deploy/cluster/.env.example deploy/cluster/.env
```

启动：

```bash
docker compose --env-file deploy/cluster/.env \
  -f deploy/cluster/docker-compose.yml up -d
```

验证：

```bash
curl -I http://localhost:8080/dolphinscheduler/ui/
docker compose -f deploy/cluster/docker-compose.yml ps
docker compose -f deploy/cluster/docker-compose.yml logs --tail=100 api
```

注意：普通 `docker compose` 不会应用 `deploy.replicas`；副本数只在 Docker Swarm 或 CCE/Kubernetes 中生效。生产集群不要用 Compose 代替 CCE Deployment。

## 8. 上线检查清单

- [ ] CCE 节点架构和 JDK 基础镜像架构一致；
- [ ] API/Master/Worker/Alert 使用 JDK 8；
- [ ] 执行 Flink ETL 的 Worker 可访问 JDK 17，并设置 `ETL_JAVA_HOME`；
- [ ] MySQL 网络策略允许 API/Master/Worker/Alert 访问；
- [ ] 数据库已初始化且字符集为 `utf8mb4`；
- [ ] 四类服务使用完全相同的 JDBC Registry 配置；
- [ ] API、Master、Worker、Alert 的副本数符合规划；
- [ ] Worker 能访问 Master RPC 端口 5678；
- [ ] API 能访问 Worker/Master/Alert；
- [ ] ETL jar、Flink 依赖和数据库驱动已进入镜像；
- [ ] Nginx/Ingress 能访问 `/dolphinscheduler/ui/`；
- [ ] 不把数据库密码、Token、私钥提交到 Git；
- [ ] 先执行简单 Shell/SQL 作业，再执行 ETL/Flink 作业；
- [ ] 通过日志确认注册地址是内网可达的 Pod Service/DNS 地址，而不是开发机 IP。

## 9. 当前方案的边界

本材料使用 JDBC Registry，不使用 ZooKeeper。MySQL 是服务注册和调度元数据的持久化中心，但不是高可用注册中心本身；生产环境仍建议为 MySQL 配置主从、备份和故障切换。

统一镜像不等于统一进程：API、Master、Worker、Alert 仍然是独立容器，由 `SERVICE` 参数决定每个容器启动哪一个服务。

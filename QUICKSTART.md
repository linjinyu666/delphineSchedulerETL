# DolphinScheduler ETL Designer — 快速启动指南

## 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| JDK | **1.8** (必须) | 推荐 Amazon Corretto 8 或 Temurin 8 |
| Maven | 3.6+ | 项目自带 `mvnw` wrapper，可直接用 |
| Node.js | 16+ | 前端构建用 |
| pnpm | 8+ | 前端包管理器（`npm i -g pnpm`） |

> **不需要** 外部数据库 / Zookeeper / Redis — Standalone 模式用内置 H2 内存库，开箱即用。

---

## 方式一：一键启动（推荐，最简单）

Standalone Server 把 API / Master / Worker / Alert 四个服务打包在一个 JVM 里，5 秒启动。

### 1. 构建项目

```bash
cd apache-dolphinscheduler-3.4.2-src

# 全量构建（含前端 + 后端 + dist 打包）
./mvnw clean install -Prelease -DskipTests
```

> 构建慢？跳过前端：`./mvnw clean install -Prelease -DskipTests -pl '!dolphinscheduler-ui'`
>
> 只改后端某模块：`./mvnw -pl dolphinscheduler-master -am clean install -DskipTests`

### 2. 启动 Standalone Server

```bash
cd dolphinscheduler-standalone-server/target/standalone-server

# 启动
./bin/start.sh

# 停止
./bin/stop.sh
```

### 3. 访问

浏览器打开 → **http://localhost:12345/dolphinscheduler/ui**

| 项目 | 值 |
|------|------|
| 地址 | http://localhost:12345/dolphinscheduler/ui |
| 用户名 | `admin` |
| 密码 | `dolphinscheduler123` |

ETL Designer 入口：登录后 → 左侧菜单 **资源中心** → **ETL 作业管理** → 新建 ETL 作业。

---

## 方式二：前后端分离开发（改代码时用）

后端跑 Standalone Server，前端跑 Vite dev server（热更新）。

### 1. 启动后端

```bash
# 先构建后端（跳过前端快一点）
./mvnw clean install -Prelease -DskipTests -pl '!dolphinscheduler-ui'

cd dolphinscheduler-standalone-server/target/standalone-server
./bin/start.sh
```

后端在 **12345** 端口监听，内置 H2 数据库。

### 2. 启动前端 Dev Server

```bash
cd dolphinscheduler-ui

# 安装依赖（首次）
pnpm install

# 启动 dev server
pnpm dev
```

Vite dev server 默认在 **5173** 端口启动，自动代理 `/dolphinscheduler` 前缀的 API 请求到后端 `http://127.0.0.1:12345`（配置在 `.env.development`）。

浏览器打开 → **http://localhost:5173/dolphinscheduler/ui**

> 改前端代码会自动热更新，无需重启。

### 3. 前端构建产物部署到 Standalone

改完前端后，把构建产物同步到 Standalone Server 的 `ui/` 目录：

```bash
cd dolphinscheduler-ui
pnpm build:prod    # 生成 dist/

# 部署到 standalone
cp -r dist/* ../dolphinscheduler-standalone-server/target/standalone-server/ui/
```

重启 Standalone Server 或直接刷新浏览器即可看到新前端。

---

## 方式三：Docker Compose（生产部署模拟）

```bash
cd deploy/docker
docker-compose up -d
```

会启动 PostgreSQL + Zookeeper + API / Master / Worker / Alert 全套服务。

---

## 端口一览

| 服务 | 端口 | 说明 |
|------|------|------|
| Standalone Server | **12345** | HTTP API + 前端 UI |
| Master Server | 5679 | gRPC（独立部署时） |
| Worker Server | 1235 | gRPC（独立部署时） |
| Alert Server | 50052 / 50053 | gRPC / HTTP |
| 前端 Dev Server | 5173 | Vite 热更新 |

---

## 常见问题

### Q: 启动报 `java: error: release version 8 not supported`

JDK 版本不对。项目要求 **JDK 8**，不能用 11+。检查：

```bash
java -version    # 必须显示 1.8.x
echo $JAVA_HOME  # 确认指向 JDK 8
```

### Q: 前端 `pnpm install` 失败

```bash
# 用项目自带的 nodejs
nvm use 16   # 或更高
npm i -g pnpm
pnpm install
```

### Q: 端口 12345 被占用

```bash
# 查看占用
lsof -i :12345

# 修改端口：编辑 standalone-server/conf/application.yaml 里的 server.port
```

### Q: H2 数据库数据丢失

Standalone 默认用 H2 **内存库**，重启后数据会丢。如需持久化，修改 `conf/application.yaml` 把 `spring.profiles.active` 从 `h2` 改为 `mysql` 或 `postgresql`，并配置外部数据库连接。

### Q: 忘记密码

H2 库重启后自动恢复默认账号 `admin` / `dolphinscheduler123`。

---

## 项目结构速查

```
apache-dolphinscheduler-3.4.2-src/
├── dolphinscheduler-standalone-server/   ← 一键启动入口
│   ├── src/main/bin/start.sh            ← 启动脚本
│   ├── src/main/java/.../StandaloneServer.java  ← 主类
│   └── src/main/resources/application.yaml      ← 配置文件
├── dolphinscheduler-ui/                 ← 前端 (Vue 3 + Vite)
│   ├── src/views/resource/etl/          ← ETL Designer 代码
│   └── package.json                     ← pnpm dev / build:prod
├── dolphinscheduler-api/                ← REST API 服务
├── dolphinscheduler-master/             ← 工作流引擎
├── dolphinscheduler-worker/             ← 任务执行器
├── dolphinscheduler-dao/                ← 数据库层 + SQL 脚本
└── deploy/docker/                       ← Docker Compose 部署
```

---

## ETL Designer 快速上手

1. 登录后，左侧菜单 → **资源中心**
2. 点击 **ETL 作业管理** → **+ 新建 ETL 作业**
3. 输入作业名 → 进入 Designer 画布
4. 从左侧节点面板拖拽节点到画布：
   - **数据源**：Oracle / MySQL / Dameng 等
   - **SQL**：自定义 SQL 节点（支持多入边串联）
   - **转换**：Filter / Compare / Join
   - **输出**：Sink / Preview
5. 双击节点配置参数
6. 点击 **测试运行** 验证
7. **保存** → 回到列表页

> ETL Designer 支持的数据库：Oracle、MySQL、PostgreSQL、Dameng（达梦）

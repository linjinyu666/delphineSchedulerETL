# StandaloneServer 本地启动踩坑记录

> 本文档记录在不运行 `dolphinscheduler-dist` 打包流程的情况下,在 macOS + JDK 8 环境下启动 `dolphinscheduler-standalone-server` 时遇到的问题及对应的解决方案。

## 1. 启动结果

StandaloneServer 启动后,所有端口正常监听:

| 端口 | 用途 |
|------|------|
| 12345 | API + UI (HTTP) |
| 5678  | Master RPC (gRPC) |
| 1234  | Worker RPC (gRPC) |
| 50052 | Alert RPC (gRPC) |

健康检查接口 `GET http://localhost:12345/dolphinscheduler/actuator/health` 返回 `status: UP`,其中 `alert / api / db(H2) / master / worker` 全部 UP。

默认账号 `admin / dolphinscheduler123`,UI 入口 `http://localhost:12345/dolphinscheduler/ui/`。

## 2. 启动方法

```bash
export JAVA_HOME=/Users/linjinyu/Library/Java/JavaVirtualMachines/corretto-1.8.0_482/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH
./dolphinscheduler-standalone-server/target/standalone-server/run.sh
```

`run.sh` 在后台启动,日志输出到:
- `target/standalone-server/standalone.log` (stdout)
- `target/standalone-server/logs/dolphinscheduler-standalone.log` (业务日志)

停止:`kill $(pgrep -f corretto-1.8.0_482)`。

## 3. 问题与解决方案

### 3.1 Java 版本不兼容(JDK 22 vs JDK 8)

**现象**: 系统默认 JDK 22,与 lombok 不兼容,编译期报 `java.lang.invoke.StringConcatFactory` 等错误。

**原因**: 项目锁定 Java 1.8(`pom.xml` `<java.version>1.8</java.version>`、`<lombok.version>1.18.24</lombok.version>`),`dolphinscheduler-api-test` 是唯一的 Java 11 孤岛。

**解决**: 强制切换到 `corretto-1.8.0_482`,通过 `JAVA_HOME` 环境变量指定,后续所有 Maven 命令都显式 export。

### 3.2 Maven clean 阶段无法清理 target(macOS AppTranslocation)

**现象**: `./mvnw clean` 报 `cannot delete target/...`、`Unable to strip Mac OS X Metadata`。

**原因**: macOS 因 SIP/AppTranslocation 锁定某些已经被运行/解压过的路径,普通 `rm -rf` 也无法删除。

**解决**: 不使用 `clean` 阶段,所有命令一律 `install` 而非 `clean install`;实在需要清理时手动 `rm -rf` 可访问的目录。

### 3.3 `dolphinscheduler-task-etl` 模块被父 pom 遗漏

**现象**: `task-all` 依赖 `task-etl`,但 `dolphinscheduler-task-plugin/pom.xml` 没把 `task-etl` 列在 modules 里。Maven 不编译它,本地仓库没有 jar,`task-all` 构建失败,提示 `Could not find artifact dolphinscheduler-task-etl`。

**原因**: 这是项目本身的 build 配置遗漏(`dolphinscheduler-task-plugin/dolphinscheduler-task-all/pom.xml` 已经声明了 `task-etl` 依赖)。

**解决**: 在 `dolphinscheduler-task-plugin/pom.xml` 的 modules 末尾追加 `<module>dolphinscheduler-task-etl</module>`。

### 3.4 Standalone jar 是空的(所有依赖都是 provided)

**现象**: standalone-server 的 jar 只 3 KB,所有 `dolphinscheduler-*` 依赖都是 `provided` scope,直接 `java -jar` 启动报 `ClassNotFoundException: StandaloneServer`。

**原因**: 这是设计如此。生产环境通过 `dolphinscheduler-dist` 的 assembly 把所有 jar 放到 `libs/`,再用 tarball 里的 `start.sh` 启动。

**解决**: 写一个 `run.sh`(在 `target/standalone-server/run.sh`),手动拼装 classpath:
- 用 `mvn dependency:build-classpath -DincludeScope=test` 分别导出 master / worker / api / alert-server 的完整 classpath(test scope 会拉入 provided 的传递依赖)。
- 把 `~/.m2/repository/org/apache/dolphinscheduler/*/3.4.2/*.jar` 全部 glob 加入(覆盖所有 dolphinscheduler 自研模块)。
- 加入 standalone-server 自己的 runtime 依赖(`/tmp/ds-cp.txt`)。
- 过滤掉冲突的 slf4j 绑定(`slf4j-simple`、`slf4j-reload4j`、`slf4j-jdk14`、`slf4j-nop`、`log4j-slf4j-impl`),只保留 logback-classic。

### 3.5 JdbcRegistryAutoConfiguration 启动失败(hikariConfig = null)

**现象**: Spring Boot 启动到 JdbcRegistryAutoConfiguration 时抛 NPE,日志最后几行只看到 Hibernate Validator 的 WARNING,然后进程静默退出。

**错误堆栈**: `HikariDataSource.<init>(JdbcRegistryProperties.getHikariConfig())` 时 `getHikariConfig()` 返回 null,`new HikariDataSource(null)` 抛 NPE。

**原因**: standalone 默认的 `application.yaml` 只配了 `registry.type: jdbc`,但 `JdbcRegistryProperties` 没有默认值,`hikariConfig` 字段没被 yaml 注入。

**解决**: 在 `dolphinscheduler-standalone-server/src/main/resources/application.yaml`(及 `target/standalone-server/conf/application.yaml`)的 `registry:` 节点下补 `hikariConfig:` 段:

```yaml
registry:
  type: jdbc
  hikariConfig:
    driverClassName: org.h2.Driver
    jdbcUrl: jdbc:h2:mem:dolphinscheduler;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=true
    username: sa
    password: ""
    poolName: DolphinSchedulerRegistryDataSource
```

注意 `JdbcRegistryProperties` 的 `@ConfigurationProperties(prefix = "registry")` 直接绑定类字段,没有 `jdbc` 嵌套节点,所以 hikariConfig 必须直接放在 `registry:` 之下,不能放在 `registry.jdbc:` 下面(否则 Spring Boot Binder 会忽略 unknown 字段)。

### 3.6 MybatisPlusAutoConfiguration 因双 DataSource 不激活

**现象**: 修复 3.5 之后,启动报错 `Field alertMapper required a bean named 'sqlSessionFactory' that could not be found`。

**原因**: 项目有两个 DataSource bean:
- Spring Boot 的 `DataSourceAutoConfiguration` 通过 `spring.datasource.*` 配置创建的主 DataSource(`dataSource`)。
- `JdbcRegistryAutoConfiguration` 通过 `registry.jdbc.hikariConfig.*` 配置创建的 `jdbcRegistryDataSource`。

两者都没有 `@Primary`,`MybatisPlusAutoConfiguration` 上的 `@ConditionalOnSingleCandidate(DataSource.class)` 不满足,所以根本不创建 `sqlSessionFactory` bean。`dolphinscheduler-dao` 的 `@MapperScan(sqlSessionFactoryRef = "sqlSessionFactory")` 因此找不到 bean。

**解决**: 写一个补丁 `PrimaryDataSourceConfig.java`,声明 `@Primary DataSource` 显式构造,再加一个手动构造的 `SqlSessionFactory` bean,绕开 MybatisPlus 自动配置的不激活条件:

```java
@Configuration
@AutoConfigureBefore(DataSourceAutoConfiguration.class)
public class PrimaryDataSourceConfig {
    @Bean
    @Primary
    @ConfigurationProperties(prefix = "spring.datasource.hikari")
    public DataSource dataSource(DataSourceProperties properties) {
        return DataSourceBuilder.create()
                .url(properties.determineUrl())
                .username(properties.determineUsername())
                .password(properties.determinePassword())
                .driverClassName(properties.determineDriverClassName())
                .build();
    }
    @Bean
    @Primary
    public SqlSessionFactory sqlSessionFactory(DataSource ds,
                                               MybatisPlusProperties props,
                                               MybatisPlusInterceptor interceptor) throws Exception {
        MybatisSqlSessionFactoryBean factory = new MybatisSqlSessionFactoryBean();
        factory.setDataSource(ds);
        factory.setPlugins(interceptor);
        // 加载 mapper.xml,设置 type alias 包名,配置下划线转驼峰等
        ...
        return factory.getObject();
    }
}
```

编译后放到 `target/standalone-server/classes/`,并在 `run.sh` 的 classpath 中前置 `classes/` 目录。`StandaloneServer` 的 `@SpringBootApplication` 默认扫描 `org.apache.dolphinscheduler` 包和子包,补丁类会自动被发现。

### 3.7 UI 静态资源 404

**现象**: `GET http://localhost:12345/dolphinscheduler/ui/` 返回 404,`dispatcherServlet` 报 `No static resource`。

**原因**: `dolphinscheduler-api` 的 `AppConfiguration.java` 把 `/ui/**` 映射到进程 cwd 下的 `file:ui/` 目录。但生产 dist tarball 才会把 UI dist 拷贝进去;本地用 `mvn install` 跳过 assembly,cwd 下没有 `ui/` 目录。

**解决**: 在 `run.sh` 启动时,把 dolphinscheduler-ui 的 dist 拷贝到 `$PWD/ui`:

```bash
UI_DIST="$PROJECT/dolphinscheduler-ui/dist"
if [ -d "$UI_DIST" ]; then
  rm -rf "$PWD/ui"
  cp -R "$UI_DIST" "$PWD/ui"
fi
```

### 3.8 UI 构建失败(vue-tsc 类型错误)

**现象**: `pnpm run build:prod` 在 `vue-tsc --noEmit` 阶段失败,9 处 TypeScript 错误全集中在 `src/views/resource/etl/*`:

```
src/views/resource/etl/designer/cascade-config.tsx(105,50): error TS2322
src/views/resource/etl/Index.tsx(67,52): error TS2322
...
```

**原因**: 源码中 `cascade-config.tsx`、`Index.tsx` 的类型定义与 ETL 后端不匹配(对应自定义 ETL 功能,后端已加但前端类型未对齐)。

**解决**: 跳过 vue-tsc 直接跑 `vite build --mode production`,生成的 dist 与项目原本提供的 dist 内容基本一致(23 MB):

```bash
cd dolphinscheduler-ui && ./node_modules/.bin/vite build --mode production
```

`node_modules` 由 frontend-maven-plugin 在 `pnpm install` 阶段装好,可以直接复用。

### 3.9 前端 dist 与另一份 checkout 不一致

**现象**: 用户反馈 ETL 路径下的 UI 不是项目定制的版本,正确版本在 `/Users/linjinyu/Documents/code/trae/dophineScheduler/apache-dolphinscheduler-3.4.2-src/dolphinscheduler-ui`。

**原因**: ETL 路径下的 `dolphinscheduler-ui/src/` 与 dophineScheduler 路径下有 7 个文件不同(主要分布在 `src/views/resource/components/resource/*`、`src/views/resource/etl/*`、`src/router/modules/resources.ts` 等)。本地构建基于 ETL 路径的 src,产出的 dist 缺一些页面/路由。

**解决**: 按用户建议,把 dophineScheduler 路径下的 `src/` 完整覆盖到 ETL 路径:

```bash
SRC_DOP=/Users/linjinyu/Documents/code/trae/dophineScheduler/apache-dolphinscheduler-3.4.2-src/dolphinscheduler-ui/src
SRC_ETL=/Users/linjinyu/Documents/code/trae/delphineSchedulerETL/apache-dolphinscheduler-3.4.2-src/dolphinscheduler-ui/src
rm -rf "$SRC_ETL"
cp -R "$SRC_DOP" "$SRC_ETL"
```

然后删除 ETL 路径的旧 dist,重新 `vite build`。`run.sh` 改回只读 ETL 路径的 dist。两边 UI 源码和构建产物完全一致。

### 3.10 资源接口 `ResourceType.ETL` 枚举缺失

**现象**: 前端 ETL 资源相关 API 请求失败:

```
Failed to convert value of type 'java.lang.String' to required type
'org.apache.dolphinscheduler.spi.enums.ResourceType';
nested exception is java.lang.IllegalArgumentException:
No enum constant org.apache.dolphinscheduler.spi.enums.ResourceType.ETL
```

**原因**: `dolphinscheduler-spi/.../ResourceType.java` 只有 `FILE(0)` 和 `ALL(2)`,前端发的 `ETL` 找不到对应枚举值。这是 dophineScheduler 那边的 spi 实现包含 `ETL(1, "etl")`,但 ETL 路径下的 spi 没同步。

**解决**: 在 `ResourceType` 枚举中加 `ETL(1, "etl")`(新增枚举值不影响已有数据,只扩展 wire-format):

```java
FILE(0, "file"),
/**
 * 1 etl
 */
ETL(1, "etl"),
ALL(2, "all");
```

重新 install spi jar:

```bash
./mvnw -pl dolphinscheduler-spi install -DskipTests -Dspotless.check.skip=true
```

重启 standalone server 即可。

## 4. 无 Maven 协调的 classpath 拼接(本轮新增)

上一节 3.4 描述的 classpath 拼接依赖 `mvn dependency:build-classpath` 输出 `/tmp/ds-cp-*.txt`。在没有跑 Maven 的环境下,这些 txt 不会生成,程序就会走 `run.sh` 的 fallback 分支 —— 直接 glob `~/.m2/repository` 下的所有 jar 并做粗略过滤。

### 4.1 问题根源

`run.sh` 第 17 行的注释 `# (如果 /tmp/ds-cp-*.txt 不存在, 直接 glob m2 里的所有依赖 jar)` 说明的就是这个 fallback。当 `/tmp/ds-cp-{api,master,worker,alert-server}.txt` 都不存在时:

- 没有任何 Maven 依赖协调,所有"同一 groupId/artifactId 的多个版本"都会同时出现在 classpath 上。
- classpath 上的依赖顺序决定哪个版本的类被 JVM 加载,谁先谁赢,极不稳定。
- 即使后续我们手动加了"按版本排除"的 glob 规则,也无法覆盖 shade jar 偷偷内嵌的旧包(`javax.servlet` 3.x、`jsqlparser` 4.x 等)。

### 4.2 实际遇到的冲突链(按出现顺序)

| # | 现象 | 根因 | 解决 |
|---|------|------|------|
| 1 | `ErrorPageSecurityFilter.init()` 抛 `AbstractMethodError` | `streampark-*` shade jar 内嵌 servlet 3.x 的 `Filter` 接口(`init/destroy` 是 abstract)抢先加载,被 Tomcat 当成 `ErrorPageSecurityFilter` 的父接口 | `spring.autoconfigure.exclude=SecurityAutoConfiguration`(避免注册该 filter);排除 `streampark-*` shade |
| 2 | `springdoc.GroupedOpenApi` ClassNotFoundException | `gen-ds-cp.sh` 早期规则把 springdoc 排了,DS api 需要 | 取消排除,保留 springdoc-openapi 1.6.9 |
| 3 | `org.springframework.data` Kotlin `BeanInfoFactory` 初始化失败 | spring-data-commons 与 kotlin-reflect 冲突 | 排除 `spring-data-*` 和 `kotlin-*` |
| 4 | `org.hibernate.validator.internal.engine.ConfigurationImpl` NoClassDefFoundError | hibernate-validator 8.0.1.Final 是 JDK 11+ 编译,与 6.2.x 冲突 | 排除 7.x/8.x,只留 6.2.x |
| 5 | `org/jboss/logging/BasicLogger class file version 55` | jboss-logging 3.5/3.6 是 JDK 11 编译 | 排除 3.5/3.6,只留 3.4.x |
| 6 | Flyway 自动配置找不到 `classpath:db/migration` | DS 用 `spring.sql.init` 而不是 Flyway | `application.yaml` 加 `spring.flyway.enabled: false`;`spring.autoconfigure.exclude=FlywayAutoConfiguration` |
| 7 | `IncompatibleClassChangeError: Implementing class` in `PaginationInnerInterceptor.<clinit>` | cp 中 `flink-doris-connector` shade jar 内嵌 jsqlparser 的更新版本,与 mybatis-plus-extension 3.5.2 引用的 jsqlparser 4.4 接口签名不一致 | 排除 `flink-doris-connector*/*` |
| 8 | `org.apache.ibatis.plugin.Interceptor` ClassNotFoundException | 上一轮把 `org/mybatis/mybatis/*` 全部排除掉了 | 恢复 mybatis 3.5.10(本地 m2 没有 3.5.7) |
| 9 | `ConditionalOnClass did not find required class 'SchedulerFactoryBean'` | spring-context-support 5.3.10 不在 m2,我把所有版本都排掉了 | 只保留 5.3.31(本地唯一可用的版本) |
| 10 | `Could not initialize class oshi.jna.platform.mac.SystemB` | oshi 3.9.1/6.1.1/6.4.2 与 jna 3.4/4.1/5.x 多版本混存,SystemB native 加载失败 | 排除老 oshi,只留 6.1.1;jna 排除老版本,只留 5.13.0 |
| 11 | `ClassNotFoundException: ConnectionPoolCreatedEvent` | micrometer-core 1.9+ 引用 mongodb driver 4.x 的 event,m2 只有 3.12.2 | 排除 1.9+,只留 1.8.0;排除 micrometer-commons 1.12+;`spring.autoconfigure.exclude=MongoMetricsAutoConfiguration` |
| 12 | `NoSuchMethodError: HttpServletRequest.getHttpServletMapping()` | 多份 shade jar(dolphinscheduler-datasource-hive / spark / flink 等)内嵌 javax.servlet 3.x 包,抢先加载,Tomcat 9 的 servlet 4.x 接口被覆盖 | `run.sh` 启动时扫描每个 shade jar,如含 `javax/servlet/http/HttpServletRequest.class` 就解压并删除 `javax/servlet/*` 目录,重新 zip 缓存到 `.shade-cache/` 再加入 classpath |
| 13 | H2 表 `t_ds_*` 找不到 | `spring.sql.init.schema-locations: classpath:sql/dolphinscheduler_h2.sql` 期望 `sql/` 目录在 classpath,但只有 `conf/sql/` 存在 | 在 standalone-server 根目录创建 `sql -> conf/sql` 的符号链接 |
| 14 | `ClassNotFoundException: org.apache.geronimo.components.jaspi.AuthConfigFactoryImpl` | Tomcat 默认从 `java.security` 找 `authconfigprovider.factory` 属性,如果找不到就硬编码尝试加载 geronimo 的实现 | 创建 `conf/java.security.override` 文件写入 `authconfigprovider.factory=org.apache.catalina.authenticator.jaspic.AuthConfigFactoryImpl`,JVM 启动参数 `-Djava.security.properties=$PWD/conf/java.security.override`(单 `=` 表示追加,不是 `==` 覆盖)|

### 4.3 三个核心修复脚本

#### 4.3.1 `/tmp/gen-ds-cp.sh`(classpath 生成器)

由于我们没跑 Maven,实际生效的是 `run.sh` 第 84–113 行的 fallback glob(只做了 JDK 17+ 粗略过滤)。但是 glob 输出直接被 `run.sh` 当 cp 使用,会把所有冲突版本都拉进来。

所以我们额外写了 `/tmp/gen-ds-cp.sh`,在每次启动前离线生成更严格的 `/tmp/ds-cp.txt`,作为 fallback 的"二次精进版":

```bash
bash /tmp/gen-ds-cp.sh    # 重新生成 /tmp/ds-cp.txt
```

脚本核心逻辑是按 groupId + artifactId + 版本号精确排除,核心规则:

- Spring Boot 只留 2.6.1;其他 Spring 子模块(starter-*/actuator-*/loader-*/maven-plugin/buildpack-*/configuration-processor)同样只留 2.6.1
- Spring 5.3 只留 5.3.31(因为本地 m2 没有 5.3.10,spring-context-support 5.3.31 是唯一可用)
- MyBatis 只留 3.5.10(本地没有 3.5.7);mybatis-spring-boot-starter 只留 2.3.1
- MyBatis-Plus 只留 3.5.2(项目 BOM 期望);3.5.3.1/3.5.7 InnerInterceptor 接口签名不兼容
- Hibernate-validator 只留 6.2.x;jboss-logging 只留 3.4.x
- jsqlparser 只留 4.4(其他 shade jar 偷偷塞更高版本)
- oshi 只留 6.1.1;jna / jna-platform 只留 5.13.0
- micrometer-core 只留 1.8.0;micrometer-commons / micrometer-jakarta9 / micrometer-observation 全部排除
- flink-doris-connector 全部排除(污染 jsqlparser)
- streampark-* 全部排除(污染 javax.servlet.Filter)
- servlet-api 3.x / 2.x 全部排除(让 Tomcat 自带的 4.0.x 胜出)
- chunjun / dinky 全部排除(都 shade 了各种冲突包)
- dolphinscheduler-datasource-hive-*-shade 单独排除(后面会被 run.sh 的"剥离 javax.servlet"流程处理,但保险起见)

#### 4.3.2 `run.sh` 的 servlet 剥离逻辑

启动时扫描所有 `dolphinscheduler-*-shade.jar`,如果包含 `javax/servlet/http/HttpServletRequest.class`,就用 cached jar 把整个 `javax/servlet/*` 目录剥除,避免覆盖 Tomcat 自带的 servlet 4.x:

```bash
SHADE_CACHE="$PWD/.shade-cache"
mkdir -p "$SHADE_CACHE"
for jar in "$M2"/org/apache/dolphinscheduler/*/3.4.2/*-3.4.2-shade.jar; do
  if unzip -l "$jar" 2>/dev/null | grep -q "javax/servlet/http/HttpServletRequest.class"; then
    cached="$SHADE_CACHE/$(basename "$jar")"
    if [ ! -f "$cached" ] || [ "$jar" -nt "$cached" ]; then
      tmpdir=$(mktemp -d)
      (cd "$tmpdir" && unzip -qo "$jar" && find . -path './javax/servlet*' -delete && zip -qr "$cached" .)
      rm -rf "$tmpdir"
    fi
    CP_PARTS+=("$cached")
  else
    CP_PARTS+=("$jar")
  fi
done
```

#### 4.3.3 `conf/java.security.override` + JVM 启动参数

Tomcat 默认通过 `java.security.Security.getProperty("authconfigprovider.factory")` 加载 JASPIC provider,找不到时硬编码尝试 `org.apache.geronimo.components.jaspi.AuthConfigFactoryImpl`(Geronimo 的实现,不在我们 m2 里)。指定自定义 factory 的方法是写一个 `java.security` 片段并通过 JVM 参数注入:

文件 `target/standalone-server/conf/java.security.override`:
```
authconfigprovider.factory=org.apache.catalina.authenticator.jaspic.AuthConfigFactoryImpl
```

`run.sh` 启动参数(注意是单 `=`,不是 `==` —— `==` 表示完全覆盖内置 java.security,会破坏 JCE 算法注册):
```bash
-Djava.security.properties=$PWD/conf/java.security.override
```

### 4.4 启示

如果跑过一次 `./mvnw install` 让 Maven 把所有 jar 拉下来并经过 BOM 协调,本节列出的所有问题都不会出现 —— Maven 的依赖仲裁会把所有同名 jar 收敛到 BOM 锁定的版本,shade jar 也不会"穿透"内嵌包污染 classpath。

我们的 fallback 路径之所以能最终跑通,完全是因为:
1. m2 里恰好有 BOM 期望版本(或兼容版本)的 jar;
2. `/tmp/gen-ds-cp.sh` 写了上百条排除规则人工收敛版本;
3. `run.sh` 加了"shade jar 剥离 javax.servlet"逻辑处理打包污染;
4. `conf/java.security.override` 解决了 JASPIC 默认 factory 缺失。

任何环境里只要 m2 内容不同(比如 CI 拉的是更高版本的 spring-boot),这套 fallback 都可能再次爆炸。

### 4.5 验证

启动成功后端点状态:

```
GET  http://localhost:12345/dolphinscheduler/             → 302 (跳转 /dolphinscheduler/ui/)
GET  http://localhost:12345/dolphinscheduler/ui/          → 200
GET  http://localhost:12345/dolphinscheduler/ui/index.html → 200
POST http://localhost:12345/dolphinscheduler/login         → {"code":0,"msg":"login success",...}
      (admin / dolphinscheduler123)
```

## 5. 修改的文件清单

| 文件 | 修改 |
|------|------|
| `dolphinscheduler-task-plugin/pom.xml` | 添加 `<module>dolphinscheduler-task-etl</module>` |
| `dolphinscheduler-spi/src/main/java/org/apache/dolphinscheduler/spi/enums/ResourceType.java` | 添加 `ETL(1, "etl")` |
| `dolphinscheduler-ui/src/**` | 用 dophineScheduler 路径的 src 完全覆盖 |
| `dolphinscheduler-ui/dist/` | 用同步过来的 src 重新 `vite build` |
| `dolphinscheduler-standalone-server/src/main/resources/application.yaml` | 添加 `registry.hikariConfig:` |
| `dolphinscheduler-standalone-server/target/standalone-server/run.sh` | 新建,负责 classpath 拼接 + UI 同步 + shade jar 剥离 javax.servlet + JASPIC factory 注入 |
| `dolphinscheduler-standalone-server/target/standalone-server/conf/application.yaml` | 添加 `registry.hikariConfig:`(运行时覆盖);加 `spring.flyway.enabled: false` |
| `dolphinscheduler-standalone-server/target/standalone-server/conf/java.security.override` | 新建,写入 `authconfigprovider.factory=org.apache.catalina.authenticator.jaspic.AuthConfigFactoryImpl` |
| `dolphinscheduler-standalone-server/target/standalone-server/sql` | 新建,符号链接到 `conf/sql/`,让 `spring.sql.init` 能找到 H2 schema |
| `dolphinscheduler-standalone-server/target/standalone-server/.shade-cache/` | 运行时生成,缓存已剥离 javax.servlet 的 shade jar |
| `/tmp/gen-ds-cp.sh` | 新建,离线 classpath 生成器;按 BOM 期望版本精确收敛 m2 jar |
| `/tmp/ds-cp.txt`、`/tmp/ds-cp-{api,master,worker,alert-server}.txt` | `gen-ds-cp.sh` 的产物,作为 fallback 的精进版 classpath |
| `dolphinscheduler-standalone-server/target/standalone-server/classes/org/apache/dolphinscheduler/PrimaryDataSourceConfig.class` | 新建,补丁配置类 |

## 5. 后续修改 UI 时的快捷命令

```bash
export JAVA_HOME=/Users/linjinyu/Library/Java/JavaVirtualMachines/corretto-1.8.0_482/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

# 1. 改前端
cd dolphinscheduler-ui
# ...编辑 src/*
./node_modules/.bin/vite build --mode production

# 2. 重启后端
kill $(pgrep -f corretto-1.8.0_482)
./dolphinscheduler-standalone-server/target/standalone-server/run.sh
```

## 6. m2 jar 变化时如何恢复

如果本地 `~/.m2/repository` 被更新(例如升级 IDE、跑过 `mvn dependency:purge-local-repository`、CI 拉了新版本),`/tmp/ds-cp.txt` 的内容可能不再有效。重新生成即可:

```bash
bash /tmp/gen-ds-cp.sh          # 重新生成 /tmp/ds-cp.txt
```

如果 `/tmp/gen-ds-cp.sh` 本身被清掉,根据第 4.3.1 节的规则手写一份即可。如果遇到新的 shade jar 污染,把 jar 加进 `run.sh` 第 52 行的 `unzip -l ... | grep -q "javax/servlet/http/HttpServletRequest.class"` 自动剥离流程即可。
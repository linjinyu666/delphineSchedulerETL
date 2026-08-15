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

## 4. 修改的文件清单

| 文件 | 修改 |
|------|------|
| `dolphinscheduler-task-plugin/pom.xml` | 添加 `<module>dolphinscheduler-task-etl</module>` |
| `dolphinscheduler-spi/src/main/java/org/apache/dolphinscheduler/spi/enums/ResourceType.java` | 添加 `ETL(1, "etl")` |
| `dolphinscheduler-ui/src/**` | 用 dophineScheduler 路径的 src 完全覆盖 |
| `dolphinscheduler-ui/dist/` | 用同步过来的 src 重新 `vite build` |
| `dolphinscheduler-standalone-server/src/main/resources/application.yaml` | 添加 `registry.hikariConfig:` |
| `dolphinscheduler-standalone-server/target/standalone-server/run.sh` | 新建,负责 classpath 拼接 + UI 同步 |
| `dolphinscheduler-standalone-server/target/standalone-server/conf/application.yaml` | 添加 `registry.hikariConfig:`(运行时覆盖) |
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
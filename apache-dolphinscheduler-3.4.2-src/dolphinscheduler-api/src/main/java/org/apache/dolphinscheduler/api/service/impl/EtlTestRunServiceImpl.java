/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.dolphinscheduler.api.service.impl;

import org.apache.dolphinscheduler.api.service.EtlTestRunService;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileWriter;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 默认实现：spawn java 子进程跑 ConfigurableJdbcEtl (flink-learning fat jar)。
 * 协议与 flink-etl PipelineService 保持一致，方便后续把 flink-etl 后端直接干掉。
 */
@Slf4j
@Service
public class EtlTestRunServiceImpl implements EtlTestRunService {

    private static final String DEFAULT_MAIN_CLASS = "com.example.flink.pipeline.ConfigurableJdbcEtl";
    private static final String DEFAULT_JVM_ARGS =
            "--add-opens java.base/java.util=ALL-UNNAMED --add-opens java.base/java.lang=ALL-UNNAMED";
    private static final String DEFAULT_JAR = "flink-learning-1.0.0-SNAPSHOT.jar";
    private static final Path PROPS_DIR = Paths.get("/tmp/ds-etl-test");

    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final ConcurrentHashMap<String, JobStatus> jobs = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Process> processes = new ConcurrentHashMap<>();

    @Override
    public JobStatus submit(PipelineRequest req) {
        String jobId = UUID.randomUUID().toString().substring(0, 8);
        JobStatus st = new JobStatus(jobId, req.getJobName() == null ? "etl-test" : req.getJobName());
        jobs.put(jobId, st);

        // 前端从 /datasources API 拿到的 connectionParams.password 是 "******" 脱敏值,
        // 需要从数据库里把真实密码回填到 req.datasources 里。
        fillMissingPasswordsFromDb(req);

        File jar = resolveJar();
        if (jar == null || !jar.isFile()) {
            st.status = "FAILED";
            st.message = "ETL jar not found. Looked under $DS_STANDALONE_LIB and standalone-server/lib/.";
            log.error("etl jar not found: {}", DEFAULT_JAR);
            return st;
        }

        Path propsFile;
        try {
            propsFile = writePropertiesFile(jobId, req);
        } catch (Exception e) {
            st.status = "FAILED";
            st.message = "write properties failed: " + e.getClass().getSimpleName() + ": "
                    + (e.getMessage() == null ? "(no message)" : e.getMessage());
            log.error("write properties failed", e);
            return st;
        }
        st.message = "Properties file: " + propsFile;

        executor.submit(() -> {
            try {
                runFlinkJob(jar.getAbsolutePath(), propsFile.toString(), st);
            } catch (Exception e) {
                st.status = "FAILED";
                st.message = "ERROR: " + e.getMessage();
                log.error("etl job error", e);
            }
        });

        return st;
    }

    @Override
    public JobStatus status(String jobId) {
        JobStatus st = jobs.get(jobId);
        if (st == null) {
            // 不存在也返回一个 not-found 状态,避免 controller 强抛异常
            JobStatus notFound = new JobStatus(jobId, "not-found");
            notFound.status = "NOT_FOUND";
            return notFound;
        }
        return st;
    }

    @Override
    public JobStatus stop(String jobId) {
        JobStatus st = jobs.get(jobId);
        if (st == null) {
            JobStatus notFound = new JobStatus(jobId, "not-found");
            notFound.status = "NOT_FOUND";
            return notFound;
        }
        Process p = processes.get(jobId);
        if (p == null) {
            // job 已结束,直接返回当前状态
            return st;
        }
        // 先尝试 destroy (SIGTERM), 1.5s 后强杀
        p.destroy();
        try {
            if (!p.waitFor(1500, TimeUnit.MILLISECONDS)) {
                p.destroyForcibly();
                p.waitFor(2, TimeUnit.SECONDS);
            }
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
        processes.remove(jobId);
        st.status = "FAILED";
        st.message = "Stopped by user\n\n" + st.message;
        st.endTime = System.currentTimeMillis();
        return st;
    }

    // ---------------------------------------------------------------------
    // properties 生成：与 flink-etl PipelineService.writePropertiesFile 完全兼容的格式
    // (url|user|pwd|driver|table|alias|owner|tableSchema|fields, 节点之间用 ; 分隔)
    // ---------------------------------------------------------------------

    private Path writePropertiesFile(String jobId, PipelineRequest req) throws Exception {
        Files.createDirectories(PROPS_DIR);
        Path file = PROPS_DIR.resolve("etl-" + jobId + ".properties");

        Map<String, Map<String, Object>> dsIndex = indexDatasources(req);

        List<Map<String, Object>> sources = req.getSources() == null ? new ArrayList<>() : req.getSources();
        List<Map<String, Object>> sinks = req.getSinks() == null ? new ArrayList<>() : req.getSinks();

        try (FileWriter w = new FileWriter(file.toFile())) {
            w.write("# Auto-generated by EtlTestRunServiceImpl for " + jobId + "\n\n");

            w.write("sources=");
            for (int i = 0; i < sources.size(); i++) {
                if (i > 0)
                    w.write(";\\\n  ");
                w.write(formatDbNode(dsIndex, sources.get(i)));
            }
            w.write("\n\n");

            w.write("sinks=");
            for (int i = 0; i < sinks.size(); i++) {
                if (i > 0)
                    w.write(";\\\n  ");
                w.write(formatDbNode(dsIndex, sinks.get(i)));
            }
            w.write("\n\n");

            String sql = req.getSql() == null ? "" : req.getSql();
            // ${SRC_ALIAS_n} / ${SINK_ALIAS_n} 替换
            for (int i = 0; i < sources.size(); i++) {
                sql = sql.replace("${SRC_ALIAS_" + (i + 1) + "}", stringOf(sources.get(i).get("alias")));
            }
            for (int i = 0; i < sinks.size(); i++) {
                sql = sql.replace("${SINK_ALIAS_" + (i + 1) + "}", stringOf(sinks.get(i).get("alias")));
            }
            sql = sql.replaceAll("\\s+", " ").trim();
            w.write("sql=" + sql + "\n\n");

            w.write("parallelism=" + req.getParallelism() + "\n");
        }
        log.info("ETL test-run properties written: {}", file);
        return file;
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static String stringOf(Object o) {
        return o == null ? "" : o.toString();
    }

    /**
     * 把顶层 datasources 建成 Map (按 id 索引)
     */
    private static Map<String, Map<String, Object>> indexDatasources(PipelineRequest req) {
        Map<String, Map<String, Object>> idx = new HashMap<>();
        if (req.getDatasources() != null) {
            for (Map<String, Object> ds : req.getDatasources()) {
                String id = stringOf(ds.get("id"));
                if (id.isEmpty()) {
                    throw new IllegalArgumentException("Datasource 缺少 id");
                }
                if (idx.containsKey(id)) {
                    throw new IllegalArgumentException("Datasource id 重复: " + id);
                }
                idx.put(id, ds);
            }
        }
        return idx;
    }

    /**
     * 把单个 source/sink 节点格式化成 {@code url|user|pwd|driver|table|alias|owner|tableSchema|fields}。
     * 与 flink-etl PipelineService.formatDbNode 行为一致。
     */
    private static String formatDbNode(Map<String, Map<String, Object>> dsIndex, Map<String, Object> node) {
        String alias = stringOf(node.get("alias"));
        String dsId = stringOf(node.get("datasourceId"));
        Map<String, Object> ds = dsIndex.get(dsId);
        if (ds == null) {
            throw new IllegalArgumentException(
                    "Source/Sink [" + alias + "] 引用的 datasourceId 不存在: " + dsId
                            + "（可用: " + dsIndex.keySet() + "）");
        }

        String type = stringOf(ds.get("type")).toLowerCase();
        if (type.isEmpty()) {
            throw new IllegalArgumentException("Datasource [" + dsId + "] 缺少 type");
        }

        String host = stringOf(ds.get("host"));
        Object portObj = ds.get("port");
        int port = portObj instanceof Number ? ((Number) portObj).intValue() : defaultPort(type);
        String database = stringOf(ds.get("database"));
        // 兼容 userName / username 两种字段名
        Object userNameObj = ds.get("userName");
        Object userObj = ds.get("username");
        if (userNameObj == null)
            userNameObj = userObj;
        if (userObj == null)
            userObj = userNameObj;
        String user = stringOf(userNameObj);
        if (user.isEmpty())
            user = stringOf(userObj);
        String password = stringOf(ds.get("password"));

        // options 提取
        Map<String, Object> opts = castMap(ds.get("options"));

        String table = stringOf(node.get("table"));
        if ("oracle".equals(type) || "dameng".equals(type) || "dm".equals(type)) {
            table = table.toUpperCase();
        }
        // 如果 owner (用户选的 schema/库) 跟 datasource 默认 database 不同:
        // - 跨 MySQL 库: table 已经是 db.tbl 形式 (由 Flink 自己拼), 但 Flink JDBC 仍会把 URL 里的 db 当作默认 catalog 前缀
        // - 解决: 当跨库时, 把 URL 里的 db 换成 owner, 这样 Flink 拼的就是 owner.tbl (正确)
        String ownerStr = stringOf(node.get("owner"));
        boolean crossDb = !ownerStr.isEmpty() && !ownerStr.equalsIgnoreCase(database);
        if (crossDb && !table.contains(".") && "mysql".equals(type)) {
            // 把 table 留作裸名, URL 切换到 owner 库, Flink 拼成 owner.table
            database = ownerStr;
        }

        String driver;
        String url;
        if ("oracle".equals(type)) {
            driver = "oracle.jdbc.OracleDriver";
            String urlMode = readOpt(opts, "urlMode", "service");
            if ("sid".equalsIgnoreCase(urlMode)) {
                url = String.format("jdbc:oracle:thin:@%s:%d:%s", host, port, database);
            } else {
                url = String.format("jdbc:oracle:thin:@//%s:%d/%s", host, port, database);
            }
        } else if ("dameng".equals(type) || "dm".equals(type)) {
            driver = "dm.jdbc.driver.DmDriver";
            url = String.format("jdbc:dm://%s:%d/%s", host, port, database);
        } else if ("mysql".equals(type)) {
            driver = "com.mysql.cj.jdbc.Driver";
            String timezone = readOpt(opts, "timezone", "Asia/Shanghai");
            String useSSL = readOpt(opts, "useSSL", "false");
            url = String.format(
                    "jdbc:mysql://%s:%d/%s?useSSL=%s&allowPublicKeyRetrieval=true&serverTimezone=%s&characterEncoding=utf8",
                    host, port, database, useSSL, timezone);
        } else if ("postgresql".equals(type) || "postgres".equals(type) || "pg".equals(type)) {
            driver = "org.postgresql.Driver";
            url = String.format("jdbc:postgresql://%s:%d/%s", host, port, database);
        } else if ("sqlserver".equals(type)) {
            driver = "com.microsoft.sqlserver.jdbc.SQLServerDriver";
            url = String.format("jdbc:sqlserver://%s:%d;databaseName=%s", host, port, database);
        } else {
            throw new IllegalArgumentException("不支持的数据库类型: " + type);
        }

        // fields
        String fields = "";
        Object fieldsObj = node.get("fields");
        if (fieldsObj instanceof List) {
            List<?> list = (List<?>) fieldsObj;
            StringBuilder fsb = new StringBuilder();
            for (int i = 0; i < list.size(); i++) {
                Object f = list.get(i);
                if (f instanceof Map) {
                    Map<?, ?> fm = (Map<?, ?>) f;
                    String name = stringOf(fm.get("name"));
                    String t = stringOf(fm.get("type"));
                    if (t.isEmpty())
                        t = "STRING";
                    if (fsb.length() > 0)
                        fsb.append(",");
                    fsb.append(name).append(":").append(t);
                } else if (f instanceof String) {
                    if (fsb.length() > 0)
                        fsb.append(",");
                    fsb.append(f).append(":STRING");
                }
            }
            fields = fsb.toString();
        }

        String owner = stringOf(node.get("owner"));
        String tableSchema = stringOf(node.get("tableSchema"));

        return String.join("|",
                url,
                user,
                password,
                driver,
                table,
                alias,
                owner,
                tableSchema,
                fields);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> castMap(Object o) {
        return o instanceof Map ? (Map<String, Object>) o : null;
    }

    private static String readOpt(Map<String, Object> opts, String key, String def) {
        if (opts == null)
            return def;
        Object v = opts.get(key);
        return v == null ? def : v.toString();
    }

    /**
     * 前端从 /dolphinscheduler/datasources API 拿到的 datasource.connectionParams
     * 是经过脱敏的(password="******"), 直接拿这个去连 MySQL 会被拒。
     * 这里从 DS DB 里读真实 password 并回填到 req 里。
     */
    @Autowired
    private org.apache.dolphinscheduler.dao.mapper.DataSourceMapper dataSourceMapper;

    private void fillMissingPasswordsFromDb(PipelineRequest req) {
        if (req.getDatasources() == null || req.getDatasources().isEmpty())
            return;
        for (Map<String, Object> ds : req.getDatasources()) {
            String id = stringOf(ds.get("id"));
            if (id.isEmpty())
                continue;
            // 只在 password 为空 / "******" 时才查库
            String pw = stringOf(ds.get("password"));
            if (!pw.isEmpty() && !"******".equals(pw))
                continue;
            try {
                int dsId = Integer.parseInt(id);
                org.apache.dolphinscheduler.dao.entity.DataSource ent = dataSourceMapper.selectById(dsId);
                if (ent == null || ent.getConnectionParams() == null)
                    continue;
                com.fasterxml.jackson.databind.ObjectMapper mapper =
                        new com.fasterxml.jackson.databind.ObjectMapper();
                Map<String, Object> cp = mapper.readValue(ent.getConnectionParams(), Map.class);
                String realPw = stringOf(cp.get("password"));
                if (!realPw.isEmpty()) {
                    ds.put("password", realPw);
                    log.info("[etl-test-run] 回填 datasource id={} 的真实密码", dsId);
                }
            } catch (Exception e) {
                log.warn("[etl-test-run] 读取 datasource id={} 真实密码失败: {}", id, e.getMessage());
            }
        }
    }

    private static int defaultPort(String type) {
        switch (type) {
            case "mysql":
                return 3306;
            case "oracle":
                return 1521;
            case "dameng":
            case "dm":
                return 5236;
            case "postgresql":
            case "postgres":
            case "pg":
                return 5432;
            case "sqlserver":
                return 1433;
            case "db2":
                return 50000;
            default:
                return 3306;
        }
    }

    // ---------------------------------------------------------------------
    // 子进程
    // ---------------------------------------------------------------------

    private void runFlinkJob(String jarPath, String propsPath, JobStatus st) throws Exception {
        st.status = "RUNNING";
        st.message = "Starting Flink job...\n";

        String javaCmd = resolveJavaCmd();
        String[] cmd = buildCmd(javaCmd, jarPath, propsPath);

        ProcessBuilder pb = new ProcessBuilder(cmd).redirectErrorStream(true);
        pb.environment().put("JAVA_HOME", currentJavaHome());
        log.info("ETL test-run CMD: {}", String.join(" ", cmd));

        Process p = pb.start();
        processes.put(st.jobId, p);
        st.message += "CMD: " + String.join(" ", cmd) + "\n\n";

        BufferedReader reader =
                new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line).append("\n");
            // 截取最新 50000 字日志, 避免超大内存 (查询数据 200 行可能占用较多空间)
            st.message = sb.length() > 50000
                    ? "..." + sb.substring(sb.length() - 50000)
                    : sb.toString();
        }

        int exit = p.waitFor();
        processes.remove(st.jobId);
        st.endTime = System.currentTimeMillis();

        if (exit == 0) {
            st.status = "SUCCESS";
            st.message = "Job done!\n\n" + st.message;
        } else {
            st.status = "FAILED";
            st.message = "Failed (exit " + exit + ")\n\n" + st.message;
        }
    }

    private static String[] buildCmd(String javaCmd, String jarPath, String propsPath) {
        String[] jvm = DEFAULT_JVM_ARGS.split("\\s+");
        String[] cmd = new String[3 + jvm.length + 2];
        cmd[0] = javaCmd;
        System.arraycopy(jvm, 0, cmd, 1, jvm.length);
        cmd[1 + jvm.length] = "-cp";
        cmd[2 + jvm.length] = jarPath;
        cmd[3 + jvm.length] = DEFAULT_MAIN_CLASS;
        cmd[4 + jvm.length] = propsPath;
        return cmd;
    }

    /**
     * 与 etl-flinksql PipelineService.resolveJavaCmd 行为一致
     */
    private static String resolveJavaCmd() {
        // flink-learning 编译目标是 JDK 11+, 需要 --add-opens 等 JVM 参数。
        // DS 自身跑在 JDK 8 上, 默认 java.home 不支持这些参数。
        // 优先级:
        // 1) $FLINK_LEARNING_JAVA_HOME / $ETL_JAVA_HOME 环境变量
        // 2) /Users/linjinyu/Library/Java/JavaVirtualMachines/corretto-22.0.2 (开发机)
        // 3) 当前 JVM 的 java.home
        // 4) PATH 中的 java
        String[] candidateHomes = {
                System.getenv("FLINK_LEARNING_JAVA_HOME"),
                System.getenv("ETL_JAVA_HOME"),
                "/Users/linjinyu/Library/Java/JavaVirtualMachines/corretto-22.0.2/Contents/Home",
                System.getProperty("java.home"),
        };
        for (String home : candidateHomes) {
            if (home == null || home.isEmpty())
                continue;
            File jhDir = new File(home);
            if (jhDir.getName().equals("jre")) {
                jhDir = jhDir.getParentFile();
            }
            File javaBin = new File(jhDir, "bin/java");
            if (javaBin.exists() && javaBin.canExecute()) {
                return javaBin.getAbsolutePath();
            }
        }
        return "java";
    }

    private static String currentJavaHome() {
        String javaCmd = resolveJavaCmd();
        File f = new File(javaCmd).getParentFile().getParentFile();
        return f.getAbsolutePath();
    }

    /**
     * jar 路径解析：$DS_STANDALONE_LIB 或 dolphinScheduler-standalone-server/target/standalone-server/lib
     */
    private File resolveJar() {
        String env = System.getenv("DS_STANDALONE_LIB");
        if (env != null && !env.isEmpty()) {
            File f = new File(env, DEFAULT_JAR);
            if (f.isFile())
                return f;
        }
        File cwd = new File(System.getProperty("user.dir"));
        File dev = new File(cwd, "lib/" + DEFAULT_JAR);
        if (dev.isFile())
            return dev;
        // dev fallback: 源码工程目录（run.sh 启动时 cwd 是 standalone-server/target/standalone-server/）
        File src = new File(
                "/Users/linjinyu/Documents/code/trae/delphineSchedulerETL/apache-dolphinscheduler-3.4.2-src/dolphinscheduler-standalone-server/target/standalone-server/lib/"
                        + DEFAULT_JAR);
        if (src.isFile())
            return src;
        return null;
    }
}

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
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
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

    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER =
            new com.fasterxml.jackson.databind.ObjectMapper();

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

        // 前端 designer 节点的 cascade.dsId 可能因为历史作业 / 用户删除后重建 等原因,
        // 与 req.datasources 里的 id 集合对不上。此时按节点的 alias / 节点自带连接参数 / DS DB 三级反查补全。
        resolveMissingDatasources(req);

        // 前端从 /datasources API 拿到的 datasource.connectionParams.password 是 "******" 脱敏值,
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
                // 兼容旧版前端/历史配置：模式可能只保存在 SQL 注释中，不能因此退回 append。
                Map<String, Object> sink = sinks.get(i);
                String sinkMode = stringOf(sink.get("mode"));
                String requestSql = req.getSql() == null ? "" : req.getSql().toLowerCase();
                // SQL 中的模式标记是本次运行的最终选择；兼容前端把默认 append 一并传下来的情况。
                if (requestSql.contains("mode=upsert") || requestSql.contains("replace into")) {
                    sink = new HashMap<>(sink);
                    sink.put("mode", "upsert");
                } else if (sinkMode.isEmpty()) {
                    sink = new HashMap<>(sink);
                    sink.put("mode", "append");
                }
                w.write(formatDbNode(dsIndex, sink));
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

    /** 把 fields 列表序列化成 JSON 数组, 供 Flink 端 detect 后用 Jackson 反序列化 */
    private static String jsonListOfFields(List<?> list) {
        try {
            // 清理: name/type 只接受 String, 其他结构降级为 STRING
            List<Map<String, String>> cleaned = new ArrayList<>();
            for (Object f : list) {
                if (f instanceof Map) {
                    Map<?, ?> fm = (Map<?, ?>) f;
                    String name = stringOf(fm.get("name"));
                    String t = stringOf(fm.get("type"));
                    if (name.isEmpty())
                        continue;
                    if (t.isEmpty())
                        t = "STRING";
                    Map<String, String> rec = new LinkedHashMap<>();
                    rec.put("name", name);
                    rec.put("type", t);
                    cleaned.add(rec);
                } else if (f instanceof String) {
                    String s = ((String) f).trim();
                    if (s.isEmpty())
                        continue;
                    Map<String, String> rec = new LinkedHashMap<>();
                    rec.put("name", s);
                    rec.put("type", "STRING");
                    cleaned.add(rec);
                }
            }
            return MAPPER.writeValueAsString(cleaned);
        } catch (Exception e) {
            log.warn("jsonListOfFields 失败, fallback 到空列表: {}", e.getMessage());
            return "[]";
        }
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
        // - 跨 MySQL/PG/SQLServer 库: Flink JDBC 会把 URL 里的 db 当作默认 catalog 前缀
        //   → 跨库时把 URL 的 db 换成 owner, Flink 拼的就是 owner.tbl (正确)
        // - 对 oracle / dameng: database 是 service name / 库名(不是 schema),
        //   owner 是用户(schema), 两者概念不同, 不能直接替换 URL 末段
        //   (oracle: /ORCLCDB 是 service,/C##APP_USER 是错的服务名 → ORA-12514)
        //   (dameng: driver 会调 setSchema(URL末段), DAMENG 不是真 schema → 无效模式名)
        //   → oracle / dameng 不做跨库替换,table 直接拼成 owner.table
        String ownerStr = stringOf(node.get("owner"));
        boolean isCatalogDb = "mysql".equals(type) || "postgresql".equals(type) || "postgres".equals(type)
                || "pg".equals(type) || "sqlserver".equals(type);
        boolean crossDb = isCatalogDb && !ownerStr.isEmpty() && !ownerStr.equalsIgnoreCase(database);
        if (crossDb && !table.contains(".")) {
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
            // dameng driver 会在 openConnection 时调 setSchema(URL 末段),
            // URL 末段必须是真实存在的 schema 名 (e.g. TEST_USER), 不能用 database 默认值 DAMENG
            String damengSchema = ownerStr.isEmpty() ? database : ownerStr;
            url = String.format("jdbc:dm://%s:%d/%s", host, port, damengSchema);
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

        // fields - 用 JSON 数组序列化, 避免 name/type 里出现逗号/冒号时解析错位
        // Flink 端 convertFieldsSpecToFlink 会先检测 JSON 数组, 否则按老格式 (name:type,...) 解析
        String fields = "";
        Object fieldsObj = node.get("fields");
        if (fieldsObj instanceof List) {
            fields = jsonListOfFields((List<?>) fieldsObj);
        }

        String owner = stringOf(node.get("owner"));
        String tableSchema = stringOf(node.get("tableSchema"));

        String base = String.join("|",
                url,
                user,
                password,
                driver,
                table,
                alias,
                owner,
                tableSchema);
        // source 保留第 9 列 fields；sink 第 9 列改为 mode，供运行器区分 append / upsert。
        return fieldsObj instanceof List ? base + "|" + fields : base + "|" + stringOf(node.get("mode"));
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

    /**
     * 修复合并 datasource 缺失问题:
     * 前端画布节点的 cascade.dsId (写入到 source/sink 对象的 datasourceId 字段) 可能对应不到
     * req.datasources 里的任何一条 —— 比如历史作业保存的 dsId 在用户重建数据源后已经失效,
     * 或者前端 datasources.value 在加载过程中被过滤掉。这里把任何 dsIndex 找不到的 dsId
     * 都尽量回填一条:
     *   (1) 在 req.datasources 里按 alias (节点 datasourceAlias → d.name/aliasName) 反查;
     *   (2) 直接读 DS DB (DataSource 表) 用 dsId 拿真实连接信息;
     *   (3) 还找不到就抛 IllegalArgumentException,提示用户。
     */
    private void resolveMissingDatasources(PipelineRequest req) {
        if (req.getSources() == null && req.getSinks() == null) {
            return;
        }
        // 先把现有 datasources 建 index (id -> entry)
        Map<String, Map<String, Object>> dsIndex = new LinkedHashMap<>();
        if (req.getDatasources() != null) {
            for (Map<String, Object> ds : req.getDatasources()) {
                String id = stringOf(ds.get("id"));
                if (!id.isEmpty()) dsIndex.put(id, ds);
            }
        }
        if (req.getDatasources() == null) {
            // 兜底, 让 fillMissingPasswordsFromDb / indexDatasources 后续能正常处理
            req.setDatasources(new ArrayList<>());
        }

        // 收集所有节点用到的 dsId + 节点本身 (用来补 alias 反查)
        Map<String, Map<String, Object>> allNodes = new LinkedHashMap<>();
        if (req.getSources() != null) req.getSources().forEach(n -> allNodes.put(stringOf(n.get("alias")) + "|" + stringOf(n.get("datasourceId")), n));
        if (req.getSinks()   != null) req.getSinks().forEach(n -> allNodes.put(stringOf(n.get("alias")) + "|" + stringOf(n.get("datasourceId")), n));

        // 把所有缺失的 dsId 收集起来 (保持插入顺序)
        // 注意: 节点 datasourceId 为空但自带 host/port/database/type 完整时, 也要走兜底反查
        // (compare / join 等"虚拟"节点的 matchingSrc 找不到, datasourceId 常是 null)
        LinkedHashSet<String> missing = new LinkedHashSet<>();
        for (Map<String, Object> node : allNodes.values()) {
            String dsId = stringOf(node.get("datasourceId"));
            if (dsId.isEmpty()) {
                // 没有 dsId, 但若有 host/port/database/type 也算"待反查"
                String connKeyOfNode = connKey(node);
                if (!connKeyOfNode.isEmpty()) {
                    // 用 alias 作为虚拟 dsId (后边真正去做反查时, 会用节点自带字段)
                    missing.add("@" + stringOf(node.get("alias")));
                }
                continue;
            }
            if (!dsIndex.containsKey(dsId)) missing.add(dsId);
        }
        if (missing.isEmpty()) return;

        // (1) 按节点 datasourceAlias 反查 req.datasources 中已存在的条目
        // 先建一个 alias → ds 的索引
        Map<String, Map<String, Object>> aliasIdx = new HashMap<>();
        for (Map<String, Object> ds : dsIndex.values()) {
            String nm = stringOf(ds.get("name"));
            String als = stringOf(ds.get("aliasName"));
            if (!nm.isEmpty()) aliasIdx.put(nm, ds);
            if (!als.isEmpty()) aliasIdx.put(als, ds);
        }
        // 按节点字段 host:port:database 也建一份 (兼容 alias 不一致但 connection 等价的场景)
        Map<String, Map<String, Object>> connIdx = new HashMap<>();
        for (Map<String, Object> ds : dsIndex.values()) {
            String key = connKey(ds);
            if (!key.isEmpty()) connIdx.put(key, ds);
        }

        // (2) 数据库反查 (需要一个 id->ds 的映射给丢的 dsId 用)
        Map<String, Map<String, Object>> dbDsById = new HashMap<>();
        for (String dsId : missing) {
            if (dataSourceMapper == null) break;
            try {
                Integer parsed = Integer.parseInt(dsId);
                org.apache.dolphinscheduler.dao.entity.DataSource ent = dataSourceMapper.selectById(parsed);
                if (ent == null) continue;
                Map<String, Object> cp = ent.getConnectionParams() == null
                        ? new HashMap<>()
                        : new com.fasterxml.jackson.databind.ObjectMapper().readValue(ent.getConnectionParams(), Map.class);
                Map<String, Object> dbDs = new LinkedHashMap<>();
                dbDs.put("id", String.valueOf(ent.getId()));
                dbDs.put("name", ent.getName() == null ? "" : ent.getName());
                dbDs.put("aliasName", ent.getName() == null ? "" : ent.getName());
                dbDs.put("type", ent.getType() == null ? "" : ent.getType().name().toLowerCase());
                dbDs.put("host", stringOf(cp.get("host")));
                Object portObj = cp.get("port");
                dbDs.put("port", portObj instanceof Number ? ((Number) portObj).intValue() : (portObj == null ? 0 : Integer.parseInt(portObj.toString())));
                dbDs.put("database", stringOf(cp.get("database") == null ? cp.get("databaseName") : cp.get("database")));
                dbDs.put("userName", stringOf(cp.get("user") == null ? cp.get("userName") : cp.get("user")));
                dbDs.put("username", dbDs.get("userName"));
                dbDs.put("password", stringOf(cp.get("password")));
                dbDs.put("jdbcUrl", stringOf(cp.get("address") == null ? cp.get("jdbcUrl") : cp.get("address")));
                dbDsById.put(dsId, dbDs);
            } catch (Exception e) {
                log.warn("[etl-test-run] 反查 DS DB 失败 dsId={}: {}", dsId, e.getMessage());
            }
        }

        // 真正去做回填
        for (Map<String, Object> node : allNodes.values()) {
            String dsId = stringOf(node.get("datasourceId"));
            // datasourceId 为空 (compare/join 等虚拟节点) 但节点自带 host/port/database/type 时, 也走兜底反查
            String nodeAliasForLog = stringOf(node.get("alias"));
            boolean virtualId = dsId.isEmpty();
            if (!virtualId && dsIndex.containsKey(dsId)) continue;

            Map<String, Object> matched = null;

            // (1a) 节点自带 datasourceAlias
            String nodeAlias = stringOf(node.get("datasourceAlias"));
            if (!nodeAlias.isEmpty() && aliasIdx.containsKey(nodeAlias)) {
                matched = aliasIdx.get(nodeAlias);
            }
            // (1b) 节点自带 host/port/database/type (新画的节点 / compare 虚拟节点 都走这里)
            if (matched == null) {
                String key = connKey(node);
                if (!key.isEmpty() && connIdx.containsKey(key)) {
                    matched = connIdx.get(key);
                }
            }
            // (2) DS DB (仅当有真实 dsId)
            if (matched == null && !virtualId && dbDsById.containsKey(dsId)) {
                matched = dbDsById.get(dsId);
            }
            // (3) 还找不到: 用节点自带字段拼一个最小可用 ds entry
            if (matched == null) {
                Map<String, Object> fallback = new LinkedHashMap<>();
                String virtualKey = virtualId ? ("@" + nodeAliasForLog) : dsId;
                fallback.put("id", virtualKey);
                fallback.put("name", nodeAlias);
                fallback.put("aliasName", nodeAlias);
                fallback.put("type", stringOf(node.get("type")));
                fallback.put("host", stringOf(node.get("host")));
                Object portObj = node.get("port");
                fallback.put("port", portObj instanceof Number ? ((Number) portObj).intValue() : (portObj == null ? 0 : Integer.parseInt(portObj.toString())));
                fallback.put("database", stringOf(node.get("database")));
                fallback.put("userName", stringOf(node.get("userName") == null ? node.get("username") : node.get("userName")));
                fallback.put("username", fallback.get("userName"));
                fallback.put("password", stringOf(node.get("password")));
                String host = stringOf(fallback.get("host"));
                if (!host.isEmpty() && !stringOf(fallback.get("type")).isEmpty()) {
                    matched = fallback;
                    log.warn("[etl-test-run] datasourceId={} 在 req+DS DB 都找不到, 用节点自带连接参数兜底", virtualKey);
                }
            }

            if (matched != null) {
                String matchedId = stringOf(matched.get("id"));
                // 兜底 entry 的 id 是 "@alias" 形式, 替换为 alias (让 node.datasourceId 能 dsIndex 命中)
                if (matchedId.startsWith("@")) {
                    matchedId = matchedId.substring(1);
                }
                if (matchedId.isEmpty()) matchedId = dsId;
                // 用真实 ds 的 id 替换节点的引用 id, 保证 dsIndex 命中
                node.put("datasourceId", matchedId);
                if (!dsIndex.containsKey(matchedId)) {
                    dsIndex.put(matchedId, matched);
                    req.getDatasources().add(matched);
                }
                log.info("[etl-test-run] datasourceId={} 缺失已补全: alias={} type={}", virtualId ? "(empty)" : dsId, nodeAlias, matched.get("type"));
            } else {
                throw new IllegalArgumentException(
                        "Source/Sink [" + nodeAliasForLog + "] 引用的 datasourceId=" + (dsId.isEmpty() ? "(empty)" : dsId)
                                + " 不存在,且按 alias 反查失败,请先到\"数据源中心\"确认该数据源仍存在 (req datasources: "
                                + dsIndex.keySet() + ", missing: " + missing + ")");
            }
        }
    }

    private static String connKey(Map<String, Object> ds) {
        if (ds == null) return "";
        String type = stringOf(ds.get("type"));
        String host = stringOf(ds.get("host"));
        Object portObj = ds.get("port");
        String port = portObj == null ? "" : portObj.toString();
        String db = stringOf(ds.get("database"));
        if (type.isEmpty() || host.isEmpty() || port.isEmpty()) return "";
        return (type + "|" + host + "|" + port + "|" + db).toLowerCase();
    }

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
            // 过滤 Flink MiniCluster 关闭时的 collect 协调器警告堆栈 (已知噪音, 不影响数据)
            // 完整堆栈会塞爆 50000 字日志 buffer, 把真正有用的 [DDL] / [SQL] 输出挤掉
            if (line.contains("CollectResultFetcher")
                    || line.contains("Coordinator of operator")
                    || line.contains("o.a.f.s.a.o.c.CollectResultFetcher")
                    || line.startsWith("\tat ")
                    || line.startsWith("Caused by:")
                    || line.startsWith("java.util.concurrent.ExecutionException")
                    || line.startsWith("java.lang.reflect.Method.invoke")
                    || line.startsWith("jdk.internal.reflect.")) {
                continue;
            }
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
        // 把 fat jar 同目录下其它所有 .jar 也加到 -cp
        // （flink-learning 是 shade fat jar，但 dm/oracle/kafka 等驱动通常不打进 fat jar，
        //   让 EtlTestRunService 自动扫描 lib/ 目录，加进 user code classloader）
        String cp = jarPath;
        File jarFile = new File(jarPath);
        File libDir = jarFile.getParentFile();
        if (libDir != null && libDir.isDirectory()) {
            File[] others = libDir.listFiles((dir, name) -> name.endsWith(".jar") && !name.equals(jarFile.getName()));
            if (others != null && others.length > 0) {
                StringBuilder sb = new StringBuilder(jarPath);
                for (File f : others) {
                    sb.append(java.io.File.pathSeparator).append(f.getAbsolutePath());
                }
                cp = sb.toString();
            }
        }

        String[] jvm = DEFAULT_JVM_ARGS.split("\\s+");
        String[] cmd = new String[3 + jvm.length + 2];
        cmd[0] = javaCmd;
        System.arraycopy(jvm, 0, cmd, 1, jvm.length);
        cmd[1 + jvm.length] = "-cp";
        cmd[2 + jvm.length] = cp;
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

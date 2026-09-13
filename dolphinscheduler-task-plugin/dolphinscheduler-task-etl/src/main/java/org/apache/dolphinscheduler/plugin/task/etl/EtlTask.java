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

package org.apache.dolphinscheduler.plugin.task.etl;

import static org.apache.dolphinscheduler.plugin.datasource.api.utils.PasswordUtils.decodePassword;

import org.apache.dolphinscheduler.common.constants.Constants;
import org.apache.dolphinscheduler.common.utils.JSONUtils;
import org.apache.dolphinscheduler.plugin.datasource.api.utils.DataSourceUtils;
import org.apache.dolphinscheduler.plugin.task.api.AbstractTask;
import org.apache.dolphinscheduler.plugin.task.api.ShellCommandExecutor;
import org.apache.dolphinscheduler.plugin.task.api.TaskCallBack;
import org.apache.dolphinscheduler.plugin.task.api.TaskConstants;
import org.apache.dolphinscheduler.plugin.task.api.TaskException;
import org.apache.dolphinscheduler.plugin.task.api.TaskExecutionContext;
import org.apache.dolphinscheduler.plugin.task.api.enums.ResourceType;
import org.apache.dolphinscheduler.plugin.task.api.model.TaskResponse;
import org.apache.dolphinscheduler.plugin.task.api.parameters.AbstractParameters;
import org.apache.dolphinscheduler.plugin.task.api.parameters.resource.DataSourceParameters;
import org.apache.dolphinscheduler.plugin.task.api.shell.IShellInterceptorBuilder;
import org.apache.dolphinscheduler.plugin.task.api.shell.ShellInterceptorBuilderFactory;
import org.apache.dolphinscheduler.spi.datasource.BaseConnectionParam;

import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import lombok.extern.slf4j.Slf4j;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * ETL Task — 透传层：把 {@link EtlParameters} 4 个字段写到 properties，调
 * flink-learning 的 {@code ConfigurableJdbcEtl} 主类。
 *
 * <p>设计原则：designer 把节点拖拽后拼成 properties 4 行（sources/sinks/sql/parallelism），
 * 本插件只负责：
 * <ol>
 *   <li>写 /tmp/ds-etl-{taskInstanceId}.properties</li>
 *   <li>构造 java -cp ... com.example.flink.pipeline.ConfigurableJdbcEtl {props}</li>
 *   <li>用 ShellCommandExecutor 跑（自带流式日志到 DS task logger）</li>
 *   <li>cancel 时停子进程 + 删 props</li>
 * </ol>
 * </p>
 */
@Slf4j
public class EtlTask extends AbstractTask {

    private static final String DEFAULT_MAIN_CLASS = "com.example.flink.pipeline.ConfigurableJdbcEtl";
    private static final String DEFAULT_JVM_ARGS =
            "--add-opens java.base/java.util=ALL-UNNAMED --add-opens java.base/java.lang=ALL-UNNAMED";
    private static final String TMP_PROPS_DIR = "/tmp/dolphinscheduler-etl";

    private EtlParameters etlParameters;
    private final ShellCommandExecutor shellCommandExecutor;
    private Path propsFile;

    public EtlTask(TaskExecutionContext taskRequest) {
        super(taskRequest);
        this.taskRequest = taskRequest;
        this.shellCommandExecutor = new ShellCommandExecutor(taskRequest);
    }

    @Override
    public void init() {
        etlParameters = JSONUtils.parseObject(taskRequest.getTaskParams(), EtlParameters.class);
        resolveResourceDefinition();
        resolveDatasourceConnections();
        if (etlParameters == null || !etlParameters.checkParameters()) {
            throw new TaskException("etl task params is not valid (sources + sql required)");
        }
        log.info("Initialize etl task: sql.len={}, sources.entries={}, sinks.entries={}, parallelism={}",
                etlParameters.getSql() == null ? 0 : etlParameters.getSql().length(),
                countEntries(etlParameters.getSources()),
                countEntries(etlParameters.getSinks()),
                etlParameters.getParallelism());
    }

    /** Replace masked/frozen connection fields with the current DS datasource values. */
    private void resolveDatasourceConnections() {
        boolean hasContent = StringUtils.isNotBlank(etlParameters.getEtlContent());
        boolean hasDatasourceIds = etlParameters.getDatasourceIds() != null
                && !etlParameters.getDatasourceIds().isEmpty();
        if (!hasContent && !hasDatasourceIds) {
            return;
        }
        if (taskRequest.getResourceParametersHelper() == null) {
            throw new TaskException("ETL datasource resources are missing; datasource config must be resolved by dsId");
        }
        try {
            JsonNode nodes = hasContent
                    ? JSONUtils.parseObject(etlParameters.getEtlContent()).path("nodes")
                    : JSONUtils.parseObject("[]");
            java.util.Map<String, DataSourceParameters> resolved = new java.util.HashMap<>();
            if (etlParameters.getDatasourceIds() != null) {
                for (Integer dsId : etlParameters.getDatasourceIds()) {
                    resolveDatasource(dsId, resolved);
                }
            }
            if (nodes.isArray()) {
                for (JsonNode node : nodes) {
                    JsonNode cascade = node.path("config").path("cascade");
                    String dsId = cascade.path("dsId").asText("");
                    if (dsId.isEmpty() || resolved.containsKey(dsId)) {
                        continue;
                    }
                    resolveDatasource(Integer.parseInt(dsId), resolved);
                }
            }
            log.info("ETL datasource resolution: requested={}, resolved={}",
                    resolved.keySet(), resolved.size());
            // The connection fields in etl.sources/etl.sinks are only legacy
            // metadata. rewriteConnections replaces URL/user/password/driver
            // exclusively with the datasource selected by dsId.
            etlParameters.setSources(rewriteConnections(etlParameters.getSources(), resolved));
            etlParameters.setSinks(rewriteConnections(etlParameters.getSinks(), resolved));
        } catch (Exception e) {
            throw new TaskException("Cannot resolve ETL datasource connections from dsId", e);
        }
    }

    private void resolveDatasource(Integer dsId, java.util.Map<String, DataSourceParameters> resolved) {
        if (dsId == null || dsId <= 0 || resolved.containsKey(String.valueOf(dsId))) {
            return;
        }
        DataSourceParameters ds = (DataSourceParameters) taskRequest.getResourceParametersHelper()
                .getResourceParameters(ResourceType.DATASOURCE, dsId);
        if (ds != null) {
            resolved.put(String.valueOf(dsId), ds);
        } else {
            throw new TaskException("Cannot find datasource parameters for dsId=" + dsId);
        }
    }

    private String rewriteConnections(String specs, java.util.Map<String, DataSourceParameters> resolved) {
        if (StringUtils.isBlank(specs)) {
            return specs;
        }
        StringBuilder result = new StringBuilder();
        for (String spec : specs.split(";")) {
            if (StringUtils.isBlank(spec)) {
                continue;
            }
            String[] fields = spec.split("\\|", -1);
            if (fields.length < 4) {
                appendSpec(result, spec);
                continue;
            }
            String matchedId = null;
            // Match by the node-generated table/alias spec against the ETL
            // content's datasource id and table metadata.
            if (StringUtils.isNotBlank(etlParameters.getEtlContent())) {
                for (JsonNode node : JSONUtils.parseObject(etlParameters.getEtlContent()).path("nodes")) {
                    JsonNode cascade = node.path("config").path("cascade");
                    if (fields.length > 5 && fields[4].equals(cascade.path("table").asText(""))
                            && fields[5]
                                    .equals(node.path("config").path("alias").asText(node.path("label").asText("")))) {
                        matchedId = cascade.path("dsId").asText("");
                        break;
                    }
                }
            }
            DataSourceParameters ds = matchedId == null && resolved.size() == 1
                    ? resolved.values().iterator().next()
                    : (matchedId == null ? null : resolved.get(matchedId));
            if (ds != null) {
                BaseConnectionParam conn = (BaseConnectionParam) DataSourceUtils.buildConnectionParams(ds.getType(),
                        ds.getConnectionParams());
                String password = decodePassword(conn.getPassword());
                if (StringUtils.isBlank(password) || "******".equals(password)) {
                    throw new TaskException("Datasource password was not resolved from DS database");
                }
                fields[0] = DataSourceUtils.getJdbcUrl(ds.getType(), conn);
                fields[1] = conn.getUser();
                fields[2] = password;
                fields[3] = conn.getDriverClassName();
                appendSpec(result, String.join("|", fields));
            } else {
                appendSpec(result, spec);
            }
        }
        return result.toString();
    }

    private static void appendSpec(StringBuilder result, String spec) {
        if (result.length() > 0)
            result.append(';');
        result.append(spec);
    }

    private void resolveResourceDefinition() {
        // A database-backed ETL definition is authoritative. The task
        // definition may still contain a legacy/frozen sources string with a
        // masked password, so do not keep it merely because it is non-empty.
        if (StringUtils.isBlank(etlParameters.getEtlContent())
                && (StringUtils.isBlank(etlParameters.getEtlResource())
                        || StringUtils.isNotBlank(etlParameters.getSources()))) {
            return;
        }
        Path resource = Paths.get(etlParameters.getEtlResource());
        try {
            String content;
            if (StringUtils.isNotBlank(etlParameters.getEtlContent())) {
                content = etlParameters.getEtlContent();
            } else if (Files.exists(resource)) {
                content = new String(Files.readAllBytes(resource), StandardCharsets.UTF_8);
            } else {
                throw new TaskException("ETL resource content is not present in task definition: " + resource);
            }
            JsonNode etl = JSONUtils.parseObject(content).path("etl");
            etlParameters.setSources(etl.path("sources").asText(""));
            etlParameters.setSinks(etl.path("sinks").asText(""));
            etlParameters.setSql(etl.path("sql").asText(""));
            if (etl.has("parallelism")) {
                etlParameters.setParallelism(etl.path("parallelism").asInt(etlParameters.getParallelism()));
            }
        } catch (IOException e) {
            throw new TaskException("Cannot read ETL resource: " + resource, e);
        }
    }

    @Override
    public void handle(TaskCallBack taskCallBack) throws TaskException {
        try {
            // 1. 写 properties
            this.propsFile = writePropertiesFile();

            // 2. 解析 classpath
            String libDir = resolveLibDir();
            String classpath = buildClasspath(libDir);

            // 3. 拼 java 命令
            String mainClass = StringUtils.isBlank(etlParameters.getMainClass())
                    ? DEFAULT_MAIN_CLASS
                    : etlParameters.getMainClass().trim();
            String jvmArgs = StringUtils.isBlank(etlParameters.getJvmArgs())
                    ? defaultJvmArgs()
                    : etlParameters.getJvmArgs().trim();
            String javaCmd = resolveJavaCmd();

            StringBuilder sb = new StringBuilder();
            sb.append(javaCmd).append(Constants.SPACE)
                    .append(jvmArgs).append(Constants.SPACE)
                    .append("-cp").append(Constants.SPACE).append(classpath).append(Constants.SPACE)
                    .append(mainClass).append(Constants.SPACE)
                    .append(propsFile.toAbsolutePath());

            String command = sb.toString();
            log.info("ETL task command: {}", command);

            // 4. 调 DS ShellCommandExecutor（流式日志、kill 父子进程）
            IShellInterceptorBuilder<?, ?> builder = ShellInterceptorBuilderFactory.newBuilder()
                    .appendScript(command);
            TaskResponse taskResponse = shellCommandExecutor.run(builder, taskCallBack);
            log.info("etl task result: {}", taskResponse);

            setExitStatusCode(taskResponse.getExitStatusCode());
            setAppIds(taskResponse.getAppIds());
            setProcessId(taskResponse.getProcessId());
            setTaskOutputParams(shellCommandExecutor.getTaskOutputParams());
        } catch (InterruptedException e) {
            log.error("etl task interrupted", e);
            setExitStatusCode(TaskConstants.EXIT_CODE_FAILURE);
            Thread.currentThread().interrupt();
            throw new TaskException("etl task interrupted", e);
        } catch (TaskException e) {
            setExitStatusCode(TaskConstants.EXIT_CODE_FAILURE);
            throw e;
        } catch (Exception e) {
            log.error("etl task error", e);
            setExitStatusCode(TaskConstants.EXIT_CODE_FAILURE);
            throw new TaskException("run etl task error", e);
        } finally {
            cleanupPropsFile();
        }
    }

    /** Java 8 rejects --add-opens; only add module flags on Java 9+. */
    private String defaultJvmArgs() {
        String version = System.getProperty("java.specification.version", "8");
        try {
            int major = version.startsWith("1.") ? Integer.parseInt(version.substring(2)) : Integer.parseInt(version);
            return major >= 9 ? DEFAULT_JVM_ARGS : "";
        } catch (NumberFormatException ignored) {
            return "";
        }
    }

    @Override
    public void cancel() throws TaskException {
        try {
            shellCommandExecutor.cancelApplication();
        } catch (Exception e) {
            throw new TaskException("cancel etl task error", e);
        } finally {
            cleanupPropsFile();
        }
    }

    @Override
    public AbstractParameters getParameters() {
        return etlParameters;
    }

    // ---------------------------------------------------------------------
    // properties 生成
    // ---------------------------------------------------------------------

    private Path writePropertiesFile() throws IOException {
        Files.createDirectories(Paths.get(TMP_PROPS_DIR));
        long taskId = taskRequest.getTaskInstanceId() == 0
                ? System.currentTimeMillis()
                : taskRequest.getTaskInstanceId();
        Path file = Paths.get(TMP_PROPS_DIR, "etl-" + taskId + ".properties");

        try (FileWriter w = new FileWriter(file.toFile())) {
            w.write("# Auto-generated by dolphinscheduler-task-etl\n");
            w.write("# 协议：flink-learning com.example.flink.pipeline.ConfigurableJdbcEtl\n");
            w.write("# 字段顺序：sources / sinks / sql / parallelism\n\n");

            // sources / sinks 整段写出（designer 已经拼好 9-列 / 8-列格式）
            w.write("sources=" + safe(etlParameters.getSources()) + "\n\n");
            w.write("sinks=" + safe(etlParameters.getSinks()) + "\n\n");

            // sql 整段写出（多行变单行，避免 properties 文件截断）
            String sql = etlParameters.getSql() == null ? "" : etlParameters.getSql();
            sql = sql.replaceAll("\\s+", " ").trim();
            w.write("sql=" + sql + "\n\n");

            w.write("parallelism=" + etlParameters.getParallelism() + "\n");
        }
        log.info("ETL properties written: {}", file);
        return file;
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static int countEntries(String spec) {
        if (spec == null || spec.isEmpty())
            return 0;
        int n = 0;
        for (String s : spec.split(";")) {
            if (!s.trim().isEmpty())
                n++;
        }
        return n;
    }

    // ---------------------------------------------------------------------
    // classpath / java 命令解析
    // ---------------------------------------------------------------------

    private String resolveLibDir() {
        if (StringUtils.isNotBlank(etlParameters.getLibDir())) {
            return etlParameters.getLibDir().trim();
        }
        String env = System.getenv("FLINK_LEARNING_LIB");
        if (env != null && !env.isEmpty())
            return env;
        return new File(System.getProperty("user.dir"), "lib").getAbsolutePath();
    }

    private String buildClasspath(String libDir) {
        File dir = new File(libDir);
        StringBuilder cp = new StringBuilder();
        if (dir.isDirectory()) {
            File[] files = dir.listFiles((f) -> f.isFile() && f.getName().endsWith(".jar"));
            if (files != null) {
                for (File f : files) {
                    if (cp.length() > 0)
                        cp.append(File.pathSeparator);
                    cp.append(f.getAbsolutePath());
                }
            }
        }
        if (cp.length() == 0) {
            throw new TaskException("ETL task cannot resolve classpath: libDir=" + libDir
                    + " is empty. Set libDir param or FLINK_LEARNING_LIB env.");
        }
        return cp.toString();
    }

    /**
     * 用当前 JVM 自己的 java（与 etl-flinksql PipelineService.resolveJavaCmd 逻辑一致）
     */
    private String resolveJavaCmd() {
        String configuredHome = System.getenv("ETL_JAVA_HOME");
        if (StringUtils.isNotBlank(configuredHome)) {
            File configuredJava = new File(configuredHome.trim(), "bin/java");
            if (configuredJava.exists() && configuredJava.canExecute()) {
                return configuredJava.getAbsolutePath();
            }
        }
        String javaHome = System.getProperty("java.home");
        if (javaHome == null)
            return "java";
        File jhDir = new File(javaHome);
        if (jhDir.getName().equals("jre")) {
            jhDir = jhDir.getParentFile();
        }
        File javaBin = new File(jhDir, "bin/java");
        if (javaBin.exists() && javaBin.canExecute()) {
            return javaBin.getAbsolutePath();
        }
        return "java";
    }

    private void cleanupPropsFile() {
        if (propsFile != null) {
            try {
                Files.deleteIfExists(propsFile);
            } catch (IOException ignored) {
            }
        }
    }
}

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

import org.apache.dolphinscheduler.common.constants.Constants;
import org.apache.dolphinscheduler.common.utils.JSONUtils;
import org.apache.dolphinscheduler.plugin.task.api.AbstractTask;
import org.apache.dolphinscheduler.plugin.task.api.ShellCommandExecutor;
import org.apache.dolphinscheduler.plugin.task.api.TaskCallBack;
import org.apache.dolphinscheduler.plugin.task.api.TaskConstants;
import org.apache.dolphinscheduler.plugin.task.api.TaskException;
import org.apache.dolphinscheduler.plugin.task.api.TaskExecutionContext;
import org.apache.dolphinscheduler.plugin.task.api.model.TaskResponse;
import org.apache.dolphinscheduler.plugin.task.api.parameters.AbstractParameters;
import org.apache.dolphinscheduler.plugin.task.api.shell.IShellInterceptorBuilder;
import org.apache.dolphinscheduler.plugin.task.api.shell.ShellInterceptorBuilderFactory;

import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import lombok.extern.slf4j.Slf4j;

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
        if (etlParameters == null || !etlParameters.checkParameters()) {
            throw new TaskException("etl task params is not valid (sources + sql required)");
        }
        log.info("Initialize etl task: sql.len={}, sources.entries={}, sinks.entries={}, parallelism={}",
                etlParameters.getSql() == null ? 0 : etlParameters.getSql().length(),
                countEntries(etlParameters.getSources()),
                countEntries(etlParameters.getSinks()),
                etlParameters.getParallelism());
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
                    ? DEFAULT_JVM_ARGS
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

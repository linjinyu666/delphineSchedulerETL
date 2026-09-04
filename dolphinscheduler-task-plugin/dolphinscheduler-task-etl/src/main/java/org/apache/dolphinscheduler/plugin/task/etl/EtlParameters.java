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

import org.apache.dolphinscheduler.plugin.task.api.parameters.AbstractParameters;

import org.apache.commons.lang3.StringUtils;

/**
 * ETL task parameters — 直接对接 flink-learning 的
 * {@code com.example.flink.pipeline.ConfigurableJdbcEtl} 协议。
 *
 * <p>flink-learning 读 properties 文件，4 个 key：
 * <pre>
 *   sources=url|user|pwd|driver|table|alias|owner|tableSchema|fields;...
 *   sinks=url|user|pwd|driver|table|alias|owner|tableSchema;...
 *   sql=INSERT INTO ${SINK_ALIAS_1} SELECT ... FROM ${SRC_ALIAS_1} ...
 *   parallelism=2
 * </pre>
 * 9-列格式在 {@code etl-flinksql/flink-etl/src/main/java/com/flinketl/service/PipelineService.java}
 * 的 {@code formatDbNode()} 里定义，前端 designer 拼装时遵循同一规则。</p>
 *
 * <p>这样本 task-plugin 是 flink-learning 协议的纯透传层——零业务逻辑。
 * designer 才是"可视化 SQL 拼装器"。</p>
 */
public class EtlParameters extends AbstractParameters {

    /**
     * 多 source 串（9-列格式），以 ; 分隔。
     * 例如：{@code jdbc:mysql://host:3306/db?useSSL=false&...|root|pwd|com.mysql.cj.jdbc.Driver|orders|src1|||;...}
     */
    private String sources;

    /**
     * 多 sink 串（8-列格式，sink 无 fields 列），以 ; 分隔。
     */
    private String sinks;

    /**
     * Flink SQL 模板，支持 ${SRC_ALIAS_N} / ${SINK_ALIAS_N} 占位符。
     * 例如：{@code INSERT INTO ${SINK_ALIAS_1} SELECT id, name FROM ${SRC_ALIAS_1}}
     */
    private String sql;

    /**
     * Flink 并行度，默认 2
     */
    private int parallelism = 2;

    /**
     * flink-learning 主类，默认 com.example.flink.pipeline.ConfigurableJdbcEtl
     */
    private String mainClass;

    /**
     * 额外的 JVM 参数（--add-opens 等），一般不需要改
     */
    private String jvmArgs;

    /**
     * flink-learning lib 目录（含 flink-learning-*.jar + flink/connector jar）。
     * 默认 ${user.dir}/lib 或 ${FLINK_LEARNING_LIB} 环境变量。
     */
    private String libDir;

    @Override
    public boolean checkParameters() {
        return StringUtils.isNotBlank(sources) && StringUtils.isNotBlank(sql);
    }

    public String getSources() {
        return sources;
    }

    public void setSources(String sources) {
        this.sources = sources;
    }

    public String getSinks() {
        return sinks;
    }

    public void setSinks(String sinks) {
        this.sinks = sinks;
    }

    public String getSql() {
        return sql;
    }

    public void setSql(String sql) {
        this.sql = sql;
    }

    public int getParallelism() {
        return parallelism;
    }

    public void setParallelism(int parallelism) {
        this.parallelism = parallelism;
    }

    public String getMainClass() {
        return mainClass;
    }

    public void setMainClass(String mainClass) {
        this.mainClass = mainClass;
    }

    public String getJvmArgs() {
        return jvmArgs;
    }

    public void setJvmArgs(String jvmArgs) {
        this.jvmArgs = jvmArgs;
    }

    public String getLibDir() {
        return libDir;
    }

    public void setLibDir(String libDir) {
        this.libDir = libDir;
    }
}

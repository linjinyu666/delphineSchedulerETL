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

package org.apache.dolphinscheduler.api.service;

import java.util.List;
import java.util.Map;

/**
 * ETL Test Run —— spawn java 子进程跑 {@code com.example.flink.pipeline.ConfigurableJdbcEtl}。
 * 协议与 flink-etl PipelineRequest 兼容 (datasources / sources / sinks / sql / parallelism / jobName)。
 * 异步执行: submit 返回 jobId, status 轮询。
 *
 * <p>JSON 协议:
 * <pre>
 * {
 *   "jobName": "etl-1",
 *   "parallelism": 1,
 *   "datasources": [{"id":"ds1","type":"mysql","host":"...","port":3306,"database":"...","userName":"...","password":"..."}],
 *   "sources": [{"alias":"t1","datasourceId":"ds1","table":"orders","fields":[{"name":"id","type":"BIGINT"}]}],
 *   "sinks":   [{"alias":"s1","datasourceId":"ds1","table":"orders_dw","mode":"append"}],
 *   "sql": "INSERT INTO ${SINK_ALIAS_1} SELECT * FROM ${SRC_ALIAS_1}"
 * }
 * </pre>
 */
public interface EtlTestRunService {

    /**
     * 异步提交 ETL job, 立即返回 JobStatus (status=PENDING)
     */
    EtlTestRunService.JobStatus submit(EtlTestRunService.PipelineRequest req);

    /**
     * 查 job 当前状态 (status / message / endTime 等)
     */
    EtlTestRunService.JobStatus status(String jobId);

    /**
     * 停止运行中的 job (若已结束则返回当前状态)。
     * 找不到 job 时返回 status=NOT_FOUND 的 JobStatus。
     */
    EtlTestRunService.JobStatus stop(String jobId);

    /**
     * 与 flink-etl PipelineRequest 兼容的请求 DTO。
     * sources / sinks / datasources 都用 List&lt;Map&gt; 让前端可以传任意字段, 后端做容错解析。
     */
    class PipelineRequest {

        private String pipelineId;
        private String jobName;
        private Integer parallelism;
        private List<Map<String, Object>> datasources;
        private List<Map<String, Object>> sources;
        private List<Map<String, Object>> sinks;
        private String sql;

        public String getPipelineId() {
            return pipelineId;
        }

        public void setPipelineId(String pipelineId) {
            this.pipelineId = pipelineId;
        }

        public String getJobName() {
            return jobName;
        }

        public void setJobName(String jobName) {
            this.jobName = jobName;
        }

        public Integer getParallelism() {
            return parallelism == null ? 1 : parallelism;
        }

        public void setParallelism(Integer parallelism) {
            this.parallelism = parallelism;
        }

        public List<Map<String, Object>> getDatasources() {
            return datasources;
        }

        public void setDatasources(List<Map<String, Object>> datasources) {
            this.datasources = datasources;
        }

        public List<Map<String, Object>> getSources() {
            return sources;
        }

        public void setSources(List<Map<String, Object>> sources) {
            this.sources = sources;
        }

        public List<Map<String, Object>> getSinks() {
            return sinks;
        }

        public void setSinks(List<Map<String, Object>> sinks) {
            this.sinks = sinks;
        }

        public String getSql() {
            return sql;
        }

        public void setSql(String sql) {
            this.sql = sql;
        }
    }

    /**
     * Job 运行状态 DTO (PENDING / RUNNING / SUCCESS / FAILED)
     */
    class JobStatus {

        public String jobId;
        public String jobName;
        public String status;
        public String message;
        public long startTime;
        public long endTime;

        public JobStatus(String jobId, String jobName) {
            this.jobId = jobId;
            this.jobName = jobName;
            this.status = "PENDING";
            this.startTime = System.currentTimeMillis();
        }
    }
}

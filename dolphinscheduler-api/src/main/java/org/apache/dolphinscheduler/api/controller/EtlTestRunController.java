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

package org.apache.dolphinscheduler.api.controller;

import org.apache.dolphinscheduler.api.service.EtlTestRunService;
import org.apache.dolphinscheduler.api.utils.Result;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * ETL Test Run —— 异步 ETL 作业执行入口（仅在 standalone / api 节点本地跑，
 * 不依赖 flink-etl 后端）。jar 由 {@link EtlTestRunServiceImpl} 定位：
 * 优先 $DS_STANDALONE_LIB，其次 standalone-server/target/standalone-server/lib/。
 *
 * <p>调用方：ETL Designer 的"测试运行"按钮
 */
@Tag(name = "ETL_TAG")
@RestController
@RequestMapping("etl")
public class EtlTestRunController {

    @Autowired
    private EtlTestRunService etlTestRunService;

    @PostMapping(value = "/test-run", consumes = {"application/json", "application/x-www-form-urlencoded"})
    public Result<EtlTestRunService.JobStatus> submit(
                                                      @RequestBody EtlTestRunService.PipelineRequest req) {
        return Result.success(etlTestRunService.submit(req));
    }

    /**
     * 健康检查：仅返回 OK 状态，不查 jobId，不 spawn 子进程。
     * 供前端 designer 在点击"测试运行"前探测 backend 可用性。
     */
    @GetMapping("/test-run/__healthcheck__")
    public Result<Object> healthcheck() {
        return Result.success(java.util.Collections.singletonMap("status", "OK"));
    }

    @GetMapping("/test-run/{jobId}")
    public Result<EtlTestRunService.JobStatus> status(@PathVariable String jobId) {
        return Result.success(etlTestRunService.status(jobId));
    }

    @PostMapping("/test-run/{jobId}/stop")
    public Result<EtlTestRunService.JobStatus> stop(@PathVariable String jobId) {
        return Result.success(etlTestRunService.stop(jobId));
    }
}

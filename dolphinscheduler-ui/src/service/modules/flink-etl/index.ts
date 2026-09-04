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

// ETL 调度服务 —— 直接调本地 DolphinScheduler 后端的 EtlTestRunController,
// 后端会 spawn java 进程跑 com.example.flink.pipeline.ConfigurableJdbcEtl
// (flink-learning-1.0.0-SNAPSHOT.jar 140MB fat-jar)。
// 协议与原 flink-etl 后端 PipelineRequest 兼容 (sources / sinks / sql / parallelism / jobName)。
// 调用方: ETL Designer 的"测试运行"按钮。

import { axios } from '@/service/service'

export interface FlinkJobStatus {
  jobId: string
  pipelineId?: string
  jobName: string
  status: string  // PENDING | RUNNING | SUCCESS | FAILED
  message: string
  startTime: number
  endTime: number
}

export interface PipelineRequest {
  pipelineId?: string
  jobName: string
  parallelism?: number
  datasources?: any[]
  sources?: any[]
  sinks?: any[]
  sql?: string
}

/** 提交 ETL 任务到 DS 后端 EtlTestRunController, 后端会异步 spawn java 子进程跑 */
export function runFlinkPipeline(req: PipelineRequest): Promise<FlinkJobStatus> {
  // 强制 JSON：DS 默认 axios 会用 qs.stringify 转 form-urlencoded,
  // 但 PipelineRequest 里 datasources/sources/sinks 是数组对象,
  // form-urlencoded 会丢字段。显式指定 Content-Type 让 axios 用 JSON。
  return axios.post('/etl/test-run', req, {
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [(data) => JSON.stringify(data)]
  })
}

/** 查询 job 状态 (轮询用) */
export function getFlinkJobStatus(jobId: string): Promise<FlinkJobStatus> {
  return axios.get(`/etl/test-run/${jobId}`)
}

/** 停止 job (UI "停止" 按钮调用) */
export function stopFlinkJob(jobId: string): Promise<FlinkJobStatus> {
  return axios.post(`/etl/test-run/${jobId}/stop`)
}

/** 健康检查: 用 head/get 测试 /etl/test-run endpoint 是否存活 (任意 jobId 会 404 但说明 controller 起来了) */
export async function checkFlinkEtlHealth(): Promise<boolean> {
  try {
    await axios.get('/etl/test-run/__healthcheck__', { timeout: 3000 })
    return true
  } catch (e: any) {
    // 404/500 都算 endpoint 存在 (说明后端 controller 已加载)
    return e?.response?.status !== undefined && e.response.status !== 0
  }
}
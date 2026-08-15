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

// flink-etl 调度服务（直接调本地 flink-etl 后端，绕开 DS 后端修改）
// flink-etl 后端默认监听 8080，且已配置 @CrossOrigin(origins = "*")
// 调用方：ETL Designer 的"测试运行"按钮

const FLINK_ETL_BASE = 'http://localhost:8080'

export interface FlinkJobStatus {
  jobId: string
  pipelineId: string
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

/** 直接发起 POST 请求到 flink-etl */
export function runFlinkPipeline(req: PipelineRequest): Promise<FlinkJobStatus> {
  return fetch(`${FLINK_ETL_BASE}/api/pipelines/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  }).then((r) => r.json())
}

/** 查询 job 状态（轮询用）*/
export function getFlinkJobStatus(jobId: string): Promise<FlinkJobStatus> {
  return fetch(`${FLINK_ETL_BASE}/api/jobs/${jobId}`).then((r) => r.json())
}

/** 停止任务 */
export function stopFlinkJob(jobId: string): Promise<{ ok: boolean; message?: string }> {
  return fetch(`${FLINK_ETL_BASE}/api/jobs/${jobId}/stop`, {
    method: 'POST'
  }).then((r) => r.json())
}

/** 健康检查（探活用）*/
export async function checkFlinkEtlHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${FLINK_ETL_BASE}/api/health`, { method: 'GET' })
    const t = await r.text()
    return t === 'ok'
  } catch (e) {
    return false
  }
}

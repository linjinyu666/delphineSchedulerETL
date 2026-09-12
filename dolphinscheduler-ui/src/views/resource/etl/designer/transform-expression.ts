/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to you under the Apache License, Version 2.0
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

/**
 * The transform editor and pipeline builder share this small expression
 * compiler. Keeping the templates here prevents the preview SQL from
 * drifting away from the SQL that is submitted to Flink.
 */

export type TransformStepKind =
  | 'identity'
  | 'cast'
  | 'try_cast'
  | 'to_date'
  | 'to_timestamp'
  | 'to_timestamp_ltz'
  | 'date_format'
  | 'extract'
  | 'split_index'
  | 'substr'
  | 'left'
  | 'right'
  | 'trim'
  | 'lower'
  | 'upper'
  | 'round'
  | 'truncate'
  | 'coalesce'
  | 'custom'

export interface TransformStep {
  op: TransformStepKind | string
  params?: Record<string, any>
}

export interface TransformOutput {
  id?: string
  name: string
  source: string
  sourceType?: string
  steps: TransformStep[]
  type: string
  enabled?: boolean
}

export const TRANSFORM_TYPE_OPTIONS = [
  'STRING', 'BOOLEAN', 'TINYINT', 'SMALLINT', 'INT', 'BIGINT', 'FLOAT', 'DOUBLE',
  'DECIMAL(18,2)', 'DATE', 'TIME', 'TIMESTAMP(3)', 'TIMESTAMP_LTZ(3)'
].map((value) => ({ label: value, value }))

export const TRANSFORM_OPERATION_OPTIONS: Array<{ label: string; value: TransformStepKind }> = [
  { label: '原样保留', value: 'identity' },
  { label: '类型转换 · CAST', value: 'cast' },
  { label: '安全类型转换 · TRY_CAST', value: 'try_cast' },
  { label: '字符串 → 日期 · TO_DATE', value: 'to_date' },
  { label: '字符串 → 时间戳 · TO_TIMESTAMP', value: 'to_timestamp' },
  { label: 'Epoch → 带时区时间戳 · TO_TIMESTAMP_LTZ', value: 'to_timestamp_ltz' },
  { label: '时间戳 → 字符串 · DATE_FORMAT', value: 'date_format' },
  { label: '时间字段提取 · EXTRACT', value: 'extract' },
  { label: '按分隔符切割 · SPLIT_INDEX', value: 'split_index' },
  { label: '截取字符串 · SUBSTR', value: 'substr' },
  { label: '取左侧字符 · LEFT', value: 'left' },
  { label: '取右侧字符 · RIGHT', value: 'right' },
  { label: '去空格 · TRIM', value: 'trim' },
  { label: '转小写 · LOWER', value: 'lower' },
  { label: '转大写 · UPPER', value: 'upper' },
  { label: '四舍五入 · ROUND', value: 'round' },
  { label: '截断小数 · TRUNCATE', value: 'truncate' },
  { label: '空值兜底 · COALESCE', value: 'coalesce' },
  { label: '自定义表达式', value: 'custom' }
]

const DEFAULT_FORMAT = 'yyyy-MM-dd HH:mm:ss'

export function createTransformStep(op: TransformStepKind = 'identity'): TransformStep {
  switch (op) {
    case 'cast':
    case 'try_cast':
      return { op, params: { type: 'STRING' } }
    case 'to_date':
      return { op, params: { format: 'yyyy-MM-dd' } }
    case 'to_timestamp':
      return { op, params: { format: DEFAULT_FORMAT } }
    case 'to_timestamp_ltz':
      return { op, params: { precision: 3 } }
    case 'date_format':
      return { op, params: { format: 'yyyy-MM-dd' } }
    case 'extract':
      return { op, params: { unit: 'YEAR' } }
    case 'split_index':
      return { op, params: { delimiter: '-', index: 0 } }
    case 'substr':
      return { op, params: { start: 1, length: '' } }
    case 'left':
    case 'right':
      return { op, params: { length: 10 } }
    case 'round':
    case 'truncate':
      return { op, params: { scale: 2 } }
    case 'coalesce':
      return { op, params: { fallback: "''" } }
    case 'custom':
      return { op, params: { expression: '{{field}}' } }
    default:
      return { op: 'identity', params: {} }
  }
}

function sqlString(value: any): string {
  return `'${String(value ?? '').replace(/'/g, "''")}'`
}

function numericParam(value: any, fallback: number): string {
  const n = Number(value)
  return Number.isFinite(n) ? String(Math.trunc(n)) : String(fallback)
}

function normalizedType(type: any): string {
  return String(type || '').trim().toUpperCase().replace(/\s+/g, '')
}

function isTemporalType(type: any): boolean {
  const normalized = normalizedType(type)
  return normalized === 'DATE' || normalized === 'TIME' || normalized.startsWith('TIMESTAMP')
}

function isCharacterType(type: any): boolean {
  const normalized = normalizedType(type)
  return normalized === 'STRING' || normalized.includes('CHAR') || normalized === 'VARCHAR'
}

function nextType(inputType: string, step: TransformStep): string {
  const p = step?.params || {}
  switch (step?.op) {
    case 'cast':
    case 'try_cast':
      return String(p.type || 'STRING')
    case 'to_date':
      return 'DATE'
    case 'to_timestamp':
      return 'TIMESTAMP(3)'
    case 'to_timestamp_ltz':
      return 'TIMESTAMP_LTZ(3)'
    case 'date_format':
    case 'split_index':
    case 'substr':
    case 'left':
    case 'right':
    case 'trim':
    case 'lower':
    case 'upper':
    case 'custom':
      return 'STRING'
    case 'extract':
    case 'round':
    case 'truncate':
      return 'DECIMAL'
    case 'coalesce':
    case 'identity':
    default:
      return inputType
  }
}

/** Apply one supported Flink SQL scalar operation to an expression. */
export function compileTransformStep(input: string, step: TransformStep, inputType = ''): string {
  const expression = input || 'NULL'
  const p = step?.params || {}
  switch (step?.op) {
    case 'cast':
      return `CAST(${expression} AS ${String(p.type || 'STRING')})`
    case 'try_cast':
      return `TRY_CAST(${expression} AS ${String(p.type || 'STRING')})`
    case 'to_date':
      // Flink 的 TO_DATE 只接受一个字符串参数；带格式的输入先解析为
      // TIMESTAMP，再显式转换成 DATE，避免生成数据库方言专属的签名。
      // DATE/TIMESTAMP 字段已经是时间类型，不能再作为 TO_TIMESTAMP 的
      // 字符串参数传入；直接 CAST 可兼容 Oracle/DM JDBC 映射出的时间列。
      if (isTemporalType(inputType)) return `CAST(${expression} AS DATE)`
      return p.format
        ? `CAST(TO_TIMESTAMP(${expression}, ${sqlString(p.format)}) AS DATE)`
        : `TO_DATE(${expression})`
    case 'to_timestamp':
      if (isTemporalType(inputType)) return `CAST(${expression} AS TIMESTAMP(3))`
      if (!isCharacterType(inputType) && inputType) {
        return `TO_TIMESTAMP(CAST(${expression} AS STRING)${p.format ? `, ${sqlString(p.format)}` : ''})`
      }
      return `TO_TIMESTAMP(${expression}${p.format ? `, ${sqlString(p.format)}` : ''})`
    case 'to_timestamp_ltz':
      return `TO_TIMESTAMP_LTZ(${expression}, ${numericParam(p.precision, 3)})`
    case 'date_format':
      return `DATE_FORMAT(${expression}, ${sqlString(p.format || 'yyyy-MM-dd')})`
    case 'extract':
      return `EXTRACT(${String(p.unit || 'YEAR').toUpperCase()} FROM ${expression})`
    case 'split_index':
      return `SPLIT_INDEX(${expression}, ${sqlString(p.delimiter ?? '-')}, ${numericParam(p.index, 0)})`
    case 'substr': {
      const start = numericParam(p.start, 1)
      const length = p.length === '' || p.length == null ? '' : `, ${numericParam(p.length, 1)}`
      return `SUBSTR(${expression}, ${start}${length})`
    }
    case 'left':
      return `LEFT(${expression}, ${numericParam(p.length, 10)})`
    case 'right':
      return `RIGHT(${expression}, ${numericParam(p.length, 10)})`
    case 'trim':
      return `TRIM(${expression})`
    case 'lower':
      return `LOWER(${expression})`
    case 'upper':
      return `UPPER(${expression})`
    case 'round':
      return `ROUND(${expression}, ${numericParam(p.scale, 2)})`
    case 'truncate':
      return `TRUNCATE(${expression}, ${numericParam(p.scale, 2)})`
    case 'coalesce':
      return `COALESCE(${expression}, ${String(p.fallback || "''")})`
    case 'custom': {
      const custom = String(p.expression || '').trim()
      return custom ? custom.replace(/\{\{\s*field\s*\}\}/gi, expression) : expression
    }
    case 'identity':
    default:
      return expression
  }
}

export function compileTransformExpression(output: Partial<TransformOutput>): string {
  let expression = String(output.source || '').trim() || 'NULL'
  let inputType = String(output.sourceType || '')
  for (const step of Array.isArray(output.steps) ? output.steps : []) {
    expression = compileTransformStep(expression, step, inputType)
    inputType = nextType(inputType, step)
  }
  return expression
}

function parseColumns(raw: any): any[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }
  return []
}

/** Convert the old [{src,dst}] shape into the new output model. */
export function normalizeTransformOutputs(config: any, fields: Array<{ value?: string; name?: string; type?: string }> = []): TransformOutput[] {
  const existing = Array.isArray(config?.outputs) ? config.outputs : parseColumns(config?.columns)
  if (existing.length > 0) {
    return existing.map((item: any, index: number) => {
      const source = String(item?.source || item?.expr || item?.src || '').trim()
      const match = fields.find((f) => f.value === source || f.name === source || f.value?.endsWith(`.${source}`))
      const steps = Array.isArray(item?.steps) && item.steps.length > 0
        ? item.steps.map((step: any) => ({ op: String(step?.op || 'identity'), params: { ...(step?.params || {}) } }))
        : []
      return {
        id: String(item?.id || `output-${index + 1}`),
        name: String(item?.name || item?.dst || item?.alias || match?.name || '').trim(),
        source: source || String(match?.value || '').trim(),
        sourceType: String(item?.sourceType || match?.type || 'STRING'),
        steps,
        type: String(item?.type || match?.type || 'STRING'),
        enabled: item?.enabled !== false
      }
    }).filter((item: TransformOutput) => item.name || item.source)
  }
  return fields.map((field, index) => ({
    id: `output-${index + 1}`,
    name: String(field.name || field.value || '').split('.').pop() || '',
    source: String(field.value || field.name || ''),
    sourceType: String(field.type || 'STRING'),
    steps: [],
    type: String(field.type || 'STRING'),
    enabled: true
  })).filter((item) => item.name)
}

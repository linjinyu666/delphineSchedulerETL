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

export interface NodeField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'datasource-cascade' | 'sink-cascade'
  placeholder?: string
  required?: boolean
  options?: Array<{ label: string; value: string }>
}

export interface NodeDefinition {
  type: string
  label: string
  description: string
  color: string
  borderColor: string
  category: 'source' | 'transform' | 'join' | 'cdc' | 'sql' | 'sink' | 'preview'
  fields: NodeField[]
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  {
    type: 'source',
    label: '表输入',
    description: '配置任意数据库表',
    color: '#3b82f6',
    borderColor: '#1d4ed8',
    category: 'source',
    fields: [
      { key: '__cascade__', label: '数据源', type: 'datasource-cascade', required: true },
      { key: 'filter', label: '过滤条件 (WHERE)', type: 'text', placeholder: '可选，如 id > 100' }
    ]
  },
  {
    type: 'transform',
    label: '字段转换',
    description: '配置列映射规则',
    color: '#f59e0b',
    borderColor: '#d97706',
    category: 'transform',
    fields: [
      { key: 'columns', label: '列映射 (JSON)', type: 'textarea', placeholder: '[{"src":"id","dst":"id"},{"src":"name","dst":"user_name"}]' }
    ]
  },
  {
    type: 'join',
    label: '表连接',
    description: '多源合并（内/左/右/全）',
    color: '#a855f7',
    borderColor: '#7e22ce',
    category: 'join',
    fields: [
      { key: 'joinType', label: '连接类型', type: 'select', required: true, options: [
        { label: 'INNER JOIN', value: 'INNER' },
        { label: 'LEFT JOIN', value: 'LEFT' },
        { label: 'RIGHT JOIN', value: 'RIGHT' },
        { label: 'FULL JOIN', value: 'FULL' }
      ]},
      { key: 'condition', label: 'ON 条件', type: 'text', placeholder: 'a.id = b.id', required: true }
    ]
  },
  {
    type: 'cdc',
    label: '变更捕获',
    description: '两表比对找增量',
    color: '#10b981',
    borderColor: '#047857',
    category: 'cdc',
    fields: [
      { key: 'key', label: '主键列', type: 'text', placeholder: 'id', required: true }
    ]
  },
  {
    type: 'sql',
    label: '自定义 SQL',
    description: '多输入 + 多步 SQL + 1 输出',
    color: '#ec4899',
    borderColor: '#be185d',
    category: 'sql',
    fields: [
      { key: 'sql', label: 'SQL 语句', type: 'textarea', placeholder: 'SELECT * FROM upstream', required: true }
    ]
  },
  {
    type: 'sink',
    label: '表输出',
    description: '写入任意数据库表',
    color: '#0ea5e9',
    borderColor: '#0369a1',
    category: 'sink',
    fields: [
      { key: '__sink__', label: '目标数据源', type: 'sink-cascade', required: true },
      { key: 'mode', label: '写入模式', type: 'select', required: true, options: [
        { label: 'INSERT', value: 'insert' },
        { label: 'REPLACE', value: 'replace' },
        { label: 'UPSERT', value: 'upsert' },
        { label: 'TRUNCATE_INSERT', value: 'truncate_insert' }
      ]}
    ]
  },
  {
    type: 'preview',
    label: '打印预览',
    description: '把上游数据打印到控制台（不落库）',
    color: '#6366f1',
    borderColor: '#4338ca',
    category: 'sink',  // 归到"输出"组，方便面板显示
    fields: [
      { key: 'limit', label: '预览行数', type: 'number', placeholder: '默认 100' },
      { key: 'format', label: '输出格式', type: 'select', options: [
        { label: '表格', value: 'table' },
        { label: 'JSON', value: 'json' },
        { label: 'CSV', value: 'csv' }
      ]}
    ]
  }
]

// 根据画布生成 SQL 预览
export function generateSqlFromGraph(
  nodes: Array<{ id: string; type: string; label: string; config: any }>,
  edges: Array<{ source: string; target: string }>
): string {
  if (nodes.length === 0) return ''

  const lines: string[] = []
  lines.push('-- 由 ETL 画布自动生成的 SQL 预览')
  lines.push('-- 实际执行请通过 flink-etl 调度')
  lines.push('')

  // 找起点 (source) 和终点 (sink)
  const incoming = new Map<string, string[]>()
  const outgoing = new Map<string, string[]>()
  edges.forEach((e) => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, [])
    if (!incoming.has(e.target)) incoming.set(e.target, [])
    outgoing.get(e.source)!.push(e.target)
    incoming.get(e.target)!.push(e.source)
  })

  const sources = nodes.filter((n) => (incoming.get(n.id) || []).length === 0)
  const sinks = nodes.filter((n) => (outgoing.get(n.id) || []).length === 0)

  if (sources.length === 0) return '-- 警告：未找到起点节点（无入边的节点）'

  // 简化：按拓扑顺序遍历生成 SQL
  const visited = new Set<string>()
  const visiting = new Set<string>()

  const nodeAlias = (n: { id: string }) => 't_' + n.id.replace(/[^a-zA-Z0-9]/g, '')

  const emitNode = (n: any, depth: number = 0): string => {
    const cfg = n.config || {}
    const alias = nodeAlias(n)
    const indent = '  '.repeat(depth)
    switch (n.type) {
      case 'source': {
        const ds = cfg.datasourceAlias || 'src'
        const db = cfg.database ? `${cfg.database}.` : ''
        const table = cfg.table || '?'
        const filter = cfg.filter ? ` WHERE ${cfg.filter}` : ''
        lines.push(`${indent}-- [source] 表输入：${ds}.${db}${table}${cfg.columns && cfg.columns.length ? ` [字段: ${cfg.columns.join(', ')}]` : ''}`)
        return `SELECT ${cfg.columns && cfg.columns.length ? cfg.columns.join(', ') : '*'} FROM ${ds}.${db}${table}${filter}`
      }
      case 'transform': {
        const cols = cfg.columns || '[]'
        lines.push(`${indent}-- [transform] 字段转换：${cols.substring(0, 60)}`)
        return `(SELECT * FROM upstream /* 列映射: ${cols.substring(0, 80)} */)`
      }
      case 'join': {
        const type = cfg.joinType || 'INNER'
        const cond = cfg.condition || 'a.id = b.id'
        lines.push(`${indent}-- [join] ${type} JOIN ON ${cond}`)
        return `(upstream_a ${type} JOIN upstream_b ON ${cond})`
      }
      case 'cdc': {
        const key = cfg.key || 'id'
        lines.push(`${indent}-- [cdc] 变更捕获，key=${key}`)
        return `(upstream_a EXCEPT upstream_b UNION upstream_b EXCEPT upstream_a /* key=${key} */)`
      }
      case 'sql': {
        const sql = cfg.sql || '-- 请填写 SQL'
        lines.push(`${indent}-- [sql] 自定义 SQL`)
        return `(${sql})`
      }
      case 'sink': {
        const ds = cfg.datasourceAlias || 'dst'
        const db = cfg.database ? `${cfg.database}.` : ''
        const table = cfg.table || '?'
        const mode = cfg.mode || 'insert'
        lines.push(`${indent}-- [sink] 表输出：${ds}.${db}${table} (${mode})`)
        return `(INSERT INTO ${ds}.${db}${table} SELECT * FROM upstream /* mode=${mode} */)`
      }
      case 'preview': {
        const limit = cfg.limit || 100
        lines.push(`${indent}-- [preview] 打印预览，limit=${limit}`)
        return `(SELECT * FROM upstream LIMIT ${limit})`
      }
      default:
        return `(unknown type: ${n.type})`
    }
  }

  // 简单遍历：从 source 开始
  const traverse = (nodeId: string, parentAlias?: string, depth: number = 0): void => {
    if (visited.has(nodeId) || visiting.has(nodeId)) return
    visiting.add(nodeId)
    const n = nodes.find((x) => x.id === nodeId)
    if (!n) {
      visiting.delete(nodeId)
      return
    }
    const sqlFragment = emitNode(n, depth)
    visited.add(nodeId)
    visiting.delete(nodeId)

    const children = outgoing.get(nodeId) || []
    children.forEach((cid) => traverse(cid, nodeAlias(n), depth + 1))
  }

  sources.forEach((s) => traverse(s.id))

  if (visited.size < nodes.length) {
    lines.push('-- 警告：存在未连通的节点')
  }

  lines.push('')
  if (sinks.length > 0) {
    lines.push('-- 最终输出节点:')
    sinks.forEach((s) => {
      const cfg = s.config || {}
      if (s.type === 'sink') {
        lines.push(`-- ${s.label}: ${cfg.datasourceAlias || '?'}.${cfg.database ? cfg.database + '.' : ''}${cfg.table || '?'} (${cfg.mode || 'insert'})`)
      } else {
        lines.push(`-- ${s.label} (${s.type})`)
      }
    })
  }

  return lines.join('\n')
}

export function useNodeMenu() {
  const renderNodeMenu = () => null
  return { renderNodeMenu }
}
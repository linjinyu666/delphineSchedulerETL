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

import { compileTransformExpression, normalizeTransformOutputs } from './transform-expression'

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
      { key: '__cascade__', label: '数据源', type: 'datasource-cascade', required: true }
      // 注意：source 节点不再支持 WHERE 过滤
      //   原因：Flink SQL 的 CREATE TABLE 不接受 WHERE，直接过滤会生成不可执行的 DDL。
      //   用户如需过滤，请：
      //     1) 在数据库端加视图/物化视图预过滤
      //     2) 或在下游「表连接 / 字段转换 / 自定义 SQL」节点里加 WHERE
    ]
  },
  {
    type: 'transform',
    label: '字段转换',
    description: '可视化配置 Flink SQL 字段转换',
    color: '#f59e0b',
    borderColor: '#d97706',
    category: 'transform',
    // 字段转换使用专用 TransformConfigDialog，避免让用户直接维护 JSON。
    fields: []
  },
  {
    type: 'filter',
    label: '过滤',
    description: '1 入 1 出：WHERE 过滤 + 列选择 + 别名',
    color: '#14b8a6',
    borderColor: '#0d9488',
    category: 'transform',
    // 节点 config 结构：
    //   {
    //     alias: 'filter1',           // 节点别名（全局唯一，用于 SQL 子查询 AS）
    //     where: 'price > 2000',      // WHERE 条件（可选）
    //     columns: [                   // 输出字段列表（可选；空数组 = 全部列）
    //       { name: 'id', alias: 'user_id' },   // alias 可选，省略时沿用 name
    //       { name: 'price' },
    //     ]
    //   }
    fields: []
    // 使用专门的 FilterConfigDialog（自定义 UI，能从 upstream 自动拉字段）
  },
  {
    type: 'compare',
    label: '数据比对',
    description: '两表逐行比对:新增 / 删除 / 修改',
    color: '#F97316',
    borderColor: '#C2410C',
    category: 'transform',
    // 节点 config 结构:
    //   {
    //     alias: 'compare1',
    //     srcId: 'node-A',            // 上游节点id(SRC 角色)
    //     tgtId: 'node-B',            // 上游节点id(TGT 角色)
    //     key: 'id',                  // 主键字段(逗号分隔支持多 KEY)
    //     columns: [                  // 参与比对的字段
    //       { name: 'user_id', enabled: true },
    //       { name: 'amount',   enabled: true }
    //     ],
    //     output: { added: true, deleted: true, changed: true, unchanged: false }
    //   }
    fields: []
    // 使用专门的 CompareConfigDialog(自定义 UI,SRC/TGT 互换 + KEY 勾选)
  },
  {
    type: 'join',
    label: '表连接',
    description: '多源合并（内/左/右/全）',
    color: '#a855f7',
    borderColor: '#7e22ce',
    category: 'join',
    // fields 留空：join 使用专门的 JoinConfigDialog（自定义 UI）
    // 节点的 config 结构：
    //   {
    //     alias: 'join1',                  // 节点别名（全局唯一）
    //     joinType: 'INNER'|'LEFT'|'RIGHT'|'FULL',
    //     leftAlias: '',  // 主表别名（从 in1 边 source 节点 alias 自动带入）
    //     rightAlias: '', // 查表别名（从 in2 边 source 节点 alias 自动带入）
    //     leftKey: '',    // 主表关联字段名
    //     rightKey: '',   // 查表关联字段名
    //     selectFields: '*',  // 输出字段列表（'*' = 全部；'a.id, b.name' = 子集）
    //     where: ''       // 可选 WHERE 条件
    //   }
    fields: []
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
        { label: 'REPLACE INTO（主键覆盖）', value: 'replace_into' }
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
        const outputs = normalizeTransformOutputs(cfg).filter((item) => item.enabled !== false && item.name && item.source)
        const select = outputs.length > 0
          ? outputs.map((item) => `${compileTransformExpression(item)} AS ${item.name}`).join(', ')
          : '*'
        lines.push(`${indent}-- [transform] 字段转换：${outputs.length} 个输出字段`)
        return `(SELECT ${select} FROM upstream)`
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
        const mode = cfg.mode === 'replace_into' || cfg.mode === 'replaceinto' || cfg.mode === 'replace' || cfg.mode === 'upsert'
          ? 'REPLACE INTO（主键覆盖）'
          : 'INSERT'
        lines.push(`${indent}-- [sink] 表输出：${ds}.${db}${table} (${mode})`)
        // Flink SQL 统一使用 INSERT；REPLACE INTO 的主键覆盖语义由 JDBC sink 的 upsert 模式实现。
        return `(INSERT INTO ${ds}.${db}${table} SELECT * FROM upstream /* mode=${mode === 'REPLACE INTO（主键覆盖）' ? 'upsert' : 'append'} */)`
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

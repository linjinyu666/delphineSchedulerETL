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

/**
 * 把 designer 画布（节点 + 边）翻译成 flink-learning 协议的 4 字段。
 *
 * 输出：和 flink-learning com.example.flink.pipeline.ConfigurableJdbcEtl 协议对齐
 *
 *   sources = url|user|pwd|driver|table|alias|owner|tableSchema|fields;url|...   (9-列格式)
 *   sinks   = url|user|pwd|driver|table|alias|owner|tableSchema;url|...           (8-列格式)
 *   sql     = INSERT INTO ${SINK_ALIAS_1} SELECT ... FROM ${SRC_ALIAS_1} ...
 *   parallelism = 2
 *
 * 9-列格式来自 etl-flinksql/flink-etl PipelineService.formatDbNode()
 * 8-列（sink 无 fields 列）来自 ConfigurableJdbcEtl.splitConfig(snk, 8)
 */

import { compileTransformExpression, normalizeTransformOutputs } from './transform-expression'

// ============== 数据结构 ==============

export interface DatasourceConfig {
  id: string
  name?: string          // DS 元数据库里数据源 name (供 cascade.datasourceAlias 反查 ds.id)
  aliasName?: string     // DS 元数据库里 aliasName (与 name 通常相同)
  type: string           // mysql | oracle | dameng | dm | postgresql | sqlserver
  host: string
  port?: number
  database: string
  username: string
  password: string
  options?: Record<string, string>
}

export interface DbNodeConfig {
  alias: string
  datasourceId: string
  table: string
  owner?: string
  tableSchema?: string
  fields?: Array<{ name: string; type: string }>
  mode?: string          // append | upsert | retract（sink 专用）
}

export interface CanvasNode {
  id: string
  type: string           // source | transform | join | cdc | sql | sink | preview
  label: string
  x: number
  y: number
  config: any            // { datasourceId?, table?, columns?, filter?, joinType?, condition?, key?, sql?, mode?, limit?, format? }
}

export interface CanvasEdge {
  id?: string
  source: string         // 源节点 id
  target: string         // 目标节点 id
}

export interface BuiltPipeline {
  sources: string        // 9-列格式 ; 分隔
  sinks: string          // 8-列格式 ; 分隔
  sql: string            // Flink SQL 模板（含 ${SRC_ALIAS_N} / ${SINK_ALIAS_N}）
  parallelism: number
  warnings: string[]      // 构建过程中的警告（拓扑不全、孤立节点等）
}

/** 将界面写入模式转换为 flink-etl JDBC sink 协议。 */
function normalizeSinkMode(mode: unknown): 'append' | 'upsert' {
  const value = String(mode || 'insert').trim().toLowerCase()
  return value === 'replace_into' || value === 'replaceinto' || value === 'replace' || value === 'upsert'
    ? 'upsert'
    : 'append'
}

// ============== 入口 ==============

/**
 * 翻译画布 → flink-learning 协议。
 * @param datasources 数据源连接信息
 * @param nodes 节点列表
 * @param edges 边列表
 * @param options parallelism、jobName
 */
export function buildPipeline(
  datasources: DatasourceConfig[],
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  options: { parallelism?: number; jobName?: string } = {}
): BuiltPipeline {
  const dsIndex = new Map<string, DatasourceConfig>()
  for (const ds of datasources) {
    if (!ds.id && (ds.id as any) !== 0) throw new Error('数据源缺少 id')
    const key = String(ds.id)
    if (dsIndex.has(key)) throw new Error(`数据源 id 重复: ${ds.id}`)
    dsIndex.set(key, ds)
  }

  const nodeMap = new Map<string, CanvasNode>()
  for (const n of nodes) nodeMap.set(n.id, n)

  // 1. 拓扑结构
  const incoming = new Map<string, string[]>()
  const outgoing = new Map<string, string[]>()
  for (const e of edges) {
    if (!outgoing.has(e.source)) outgoing.set(e.source, [])
    if (!incoming.has(e.target)) incoming.set(e.target, [])
    outgoing.get(e.source)!.push(e.target)
    incoming.get(e.target)!.push(e.source)
  }

  const warnings: string[] = []

  // 2. 提取所有 source / sink 节点
  const sourceNodes = nodes.filter((n) => n.type === 'source')
  const sinkNodes = nodes.filter((n) => n.type === 'sink')
  if (sourceNodes.length === 0) {
    warnings.push('画布中没有任何 source 节点（表输入）')
  }
  if (sinkNodes.length === 0 && !nodes.some((n) => n.type === 'preview')) {
    warnings.push('画布中没有任何 sink / preview 节点，作业将无可输出')
  }

  // 3. 构造 sources 9-列串
  const sources = sourceNodes
    .map((n) => {
      const cfg = n.config || {}
      // 兼容两种 datasourceId 存放位置:
      //   1) n.config.datasourceId          (老 flink-etl_副本 旧协议)
      //   2) n.config.cascade.dsId          (DS designer 新面板)
      const dsId = cfg.datasourceId ?? cfg.cascade?.dsId
      if (!dsId) {
        warnings.push(`source 节点 "${n.label}" 缺少 datasourceId`)
        return ''
      }
      // datasourceId 可能是 number / string / string-number, dsIndex 的 key 是 String(d.id)
      const ds = dsIndex.get(String(dsId)) || dsIndex.get(Number(dsId))
      if (!ds) {
        warnings.push(`source 节点 "${n.label}" 引用未知数据源 ${dsId}`)
        return ''
      }
      const table = cfg.table ?? cfg.cascade?.table ?? ''
      const owner = cfg.owner ?? cfg.database ?? cfg.cascade?.database
      const tableSchema = cfg.tableSchema ?? cfg.cascade?.tableSchema
      const fields = cfg.columns ?? cfg.cascade?.columns ?? cfg.fields
      const node: DbNodeConfig = {
        // label = alias：节点的 label 就是 SQL 别名
        alias: (n.label && n.label.trim()) || cfg.alias || sanitizeAlias(n.id),
        datasourceId: String(dsId),
        table,
        owner,
        tableSchema,
        fields
      }
      return formatDbNodeSource(ds, node)
    })
    .filter(Boolean)

  // 4. 构造 sinks 8-列串
  const sinks = sinkNodes
    .map((n) => {
      const cfg = n.config || {}
      const dsId = cfg.datasourceId ?? cfg.cascade?.dsId
      if (!dsId) {
        warnings.push(`sink 节点 "${n.label}" 缺少 datasourceId`)
        return ''
      }
      const ds = dsIndex.get(String(dsId)) || dsIndex.get(Number(dsId))
      if (!ds) {
        warnings.push(`sink 节点 "${n.label}" 引用未知数据源 ${dsId}`)
        return ''
      }
      const table = cfg.table ?? cfg.cascade?.table ?? ''
      const owner = cfg.owner ?? cfg.database ?? cfg.cascade?.database
      const tableSchema = cfg.tableSchema ?? cfg.cascade?.tableSchema
      const mode = normalizeSinkMode(cfg.mode)
      const node: DbNodeConfig = {
        // label = alias：节点的 label 就是 SQL 别名
        alias: (n.label && n.label.trim()) || cfg.alias || sanitizeAlias(n.id),
        datasourceId: String(dsId),
        table,
        owner,
        tableSchema,
        mode
      }
      return formatDbNodeSink(ds, node)
    })
    .filter(Boolean)

  // 5. 按拓扑生成 SQL
  // 简单 BFS：每个中间节点（transform/join/cdc/sql/preview）翻译成一段 SQL
  // 最终 SQL 形如：INSERT INTO ${SINK_ALIAS_1} SELECT ... FROM ${SRC_ALIAS_1} ...
  const sql = generateSqlFromCanvas(nodes, edges, incoming, outgoing, sourceNodes, sinkNodes, warnings)

  return {
    sources: sources.join(';'),
    sinks: sinks.join(';'),
    sql,
    parallelism: options.parallelism ?? 2,
    warnings
  }
}

// ============== 9-列 / 8-列格式化 ==============

/**
 * source 9-列：url|user|pwd|driver|table|alias|owner|tableSchema|fields
 * 与 etl-flinksql/flink-etl PipelineService.formatDbNode() 保持一致
 */
function formatDbNodeSource(ds: DatasourceConfig, node: DbNodeConfig): string {
  const { url, driver } = buildUrlAndDriver(ds)
  const table = normalizeTable(ds.type, node.table || '')
  const alias = node.alias || ''
  const owner = node.owner || ''
  const tableSchema = node.tableSchema || ''
  // fields 序列化为 JSON 数组,避免 name/type 里出现逗号/冒号(例如 DECIMAL(15,2))时分隔错位
  // 与后端 EtlTestRunServiceImpl.jsonListOfFields 保持一致
  const fieldsJson = (() => {
    const cleaned = (node.fields || [])
      .map((f: any) => {
        if (typeof f === 'string') return { name: f, type: 'STRING' }
        if (f && typeof f === 'object') return { name: f.name || '', type: f.type || 'STRING' }
        return null
      })
      .filter((x: any) => x && x.name)
    try {
      return JSON.stringify(cleaned)
    } catch {
      return '[]'
    }
  })()
  return [url, ds.username || '', ds.password || '', driver, table, alias, owner, tableSchema, fieldsJson].join('|')
}

/**
 * sink 9-列：url|user|pwd|driver|table|alias|owner|tableSchema|mode
 * ConfigurableJdbcEtl 前 8 列保持兼容，第 9 列用于区分 append / upsert
 */
function formatDbNodeSink(ds: DatasourceConfig, node: DbNodeConfig): string {
  const { url, driver } = buildUrlAndDriver(ds)
  const table = normalizeTable(ds.type, node.table || '')
  const alias = node.alias || ''
  const owner = node.owner || ''
  const tableSchema = node.tableSchema || ''
  return [url, ds.username || '', ds.password || '', driver, table, alias, owner, tableSchema,
    normalizeSinkMode(node.mode)].join('|')
}

/**
 * 算 url + driver（与 PipelineService 一致）
 */
function buildUrlAndDriver(ds: DatasourceConfig): { url: string; driver: string } {
  const type = (ds.type || '').toLowerCase()
  const port = ds.port && ds.port > 0 ? ds.port : defaultPort(type)
  const database = (ds.database || '').trim()
  const opt = (k: string, def: string) => (ds.options || {})[k] || def
  if (type === 'oracle') {
    const driver = 'oracle.jdbc.OracleDriver'
    const urlMode = opt('urlMode', 'service')
    if (urlMode.toLowerCase() === 'sid') {
      return { url: `jdbc:oracle:thin:@${ds.host}:${port}:${database}`, driver }
    }
    return { url: `jdbc:oracle:thin:@//${ds.host}:${port}/${database}`, driver }
  }
  if (type === 'dameng' || type === 'dm') {
    return { url: `jdbc:dm://${ds.host}:${port}/${database}`, driver: 'dm.jdbc.driver.DmDriver' }
  }
  if (type === 'mysql') {
    const timezone = opt('timezone', 'Asia/Shanghai')
    const useSSL = opt('useSSL', 'false')
    return {
      url: `jdbc:mysql://${ds.host}:${port}/${database}?useSSL=${useSSL}&allowPublicKeyRetrieval=true&serverTimezone=${timezone}&characterEncoding=utf8`,
      driver: 'com.mysql.cj.jdbc.Driver'
    }
  }
  if (type === 'postgresql' || type === 'postgres' || type === 'pg') {
    return { url: `jdbc:postgresql://${ds.host}:${port}/${database}`, driver: 'org.postgresql.Driver' }
  }
  if (type === 'sqlserver') {
    return { url: `jdbc:sqlserver://${ds.host}:${port};databaseName=${database}`, driver: 'com.microsoft.sqlserver.jdbc.SQLServerDriver' }
  }
  throw new Error(`不支持的数据库类型: ${ds.type}`)
}

function defaultPort(type: string): number {
  switch (type) {
    case 'mysql': return 3306
    case 'oracle': return 1521
    case 'dameng': case 'dm': return 5236
    case 'postgresql': case 'postgres': case 'pg': return 5432
    case 'sqlserver': return 1433
    case 'db2': return 50000
    default: return 3306
  }
}

function normalizeTable(type: string, table: string): string {
  const t = (type || '').toLowerCase()
  if (t === 'oracle' || t === 'dameng' || t === 'dm') return table.toUpperCase()
  return table
}

function sanitizeAlias(id: string): string {
  return 't_' + id.replace(/[^a-zA-Z0-9]/g, '')
}

// ============== SQL 拼装 ==============

/**
 * 按画布生成最终 SQL：
 *   - 拓扑遍历每个节点
 *   - source → "${SRC_ALIAS_N}" (alias 已写到 sources 串)
 *   - transform/join/cdc/sql/preview → 拼成 SQL 片段
 *   - sink → "${SINK_ALIAS_N}"
 *   - 最终：INSERT INTO ${SINK_ALIAS_1} SELECT ... FROM ${SRC_ALIAS_1} ...
 */
function generateSqlFromCanvas(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  incoming: Map<string, string[]>,
  outgoing: Map<string, string[]>,
  sourceNodes: CanvasNode[],
  sinkNodes: CanvasNode[],
  warnings: string[]
): string {
  // 给 source / sink 编号（与 sources/sinks 串里的顺序一致）
  const sourceAliasById = new Map<string, string>()
  sourceNodes.forEach((n, idx) => sourceAliasById.set(n.id, `\${SRC_ALIAS_${idx + 1}}`))
  const sinkAliasById = new Map<string, string>()
  sinkNodes.forEach((n, idx) => sinkAliasById.set(n.id, `\${SINK_ALIAS_${idx + 1}}`))

  // 拓扑遍历：每个节点生成一段 SQL
  // source 节点 → 直接是 alias（占位符）
  // 中间节点 → (select_subquery) 形式
  // 多分支：用 UNION ALL 合并到 sink
  const visited = new Set<string>()
  const visiting = new Set<string>()

  const visit = (nid: string): string => {
    if (visited.has(nid)) return ''
    if (visiting.has(nid)) {
      warnings.push(`检测到环，节点 ${nid} 重复访问，已跳过`)
      return ''
    }
    visiting.add(nid)
    const n = nodes.find((x) => x.id === nid)
    if (!n) {
      visiting.delete(nid)
      return ''
    }
    let seg = ''
    const cfg = n.config || {}
    switch (n.type) {
      case 'source': {
        // source 节点只用 alias（已注册成临时表）
        // 不支持 WHERE：Flink SQL 的 CREATE TABLE 不接受 WHERE，强行过滤会破坏 DDL
        // 过滤请在下游 join/transform/sql 节点做
        seg = sourceAliasById.get(n.id) || ''
        break
      }
      case 'transform': {
        // 字段转换：使用可视化编辑器保存的 outputs；columns 仅作为旧配置兼容。
        const upstreamIds = incoming.get(n.id) || []
        const upstream = upstreamIds.map((c) => visit(c)).filter(Boolean)
        if (upstream.length === 0) {
          seg = `(SELECT * FROM (\`upstream\` /* transform: ${n.label} */))`
        } else {
          const outputs = normalizeTransformOutputs(cfg)
            .filter((item) => item.enabled !== false && item.name && item.source)
          const select = outputs.length > 0
            ? outputs.map((item) => `${compileTransformExpression(item)} AS ${item.name}`).join(', ')
            : '*'
          const upSeg = upstream[0].trim()
          // source 返回已注册的临时表占位符；中间节点返回子查询，需要补别名。
          const upstreamNode = nodes.find((item) => item.id === upstreamIds[0])
          const upstreamAlias = String(
            cfg.upstreamAlias || upstreamNode?.config?.alias || upstreamNode?.label || 'upstream'
          ).replace(/[^a-zA-Z0-9_]/g, '_')
          const fromClause = upSeg.startsWith('(')
            ? `${upSeg} AS ${upstreamAlias}`
            : upSeg
          seg = `(SELECT ${select} FROM ${fromClause})`
        }
        break
      }
      case 'filter': {
        // 过滤节点：1 入 1 出
        //   - SELECT [列] FROM upstream [WHERE ...] [AS alias]
        //   - cfg.columns:  [{ name, alias }]，空 = 全部
        //   - cfg.where:    WHERE 子句
        // 上游可能是 source（visit 返回 alias） 或 filter/transform/join（visit 返回 (SELECT ...)）
        //   - source：直接 FROM alias （alias 已是注册的临时表）
        //   - 其他： FROM (subquery) AS upstream_alias
        const upstream = (incoming.get(n.id) || []).map((c) => visit(c)).filter(Boolean)
        if (upstream.length === 0) {
          warnings.push(`filter 节点 "${n.label}" 无入边`)
          seg = ''
          break
        }
        // SELECT 子句：columns 空数组 = 全部 '*'，否则按 name[/alias] 列表
        // 跳过 enabled=false 的列（用户不勾选就不输出）
        const colsRaw = cfg.columns
        let cols: Array<{ name: string; alias?: string; enabled?: boolean }> | null = null
        if (Array.isArray(colsRaw)) {
          cols = colsRaw.filter((c: any) => c && c.name && c.enabled !== false)
        } else if (typeof colsRaw === 'string' && colsRaw.trim()) {
          try {
            const parsed = JSON.parse(colsRaw)
            if (Array.isArray(parsed)) {
              cols = parsed.filter((c: any) => c && c.name && c.enabled !== false)
            }
          } catch { /* ignore */ }
        }
        const select = cols && cols.length > 0
          ? cols.map((c) => c.alias && c.alias !== c.name ? `${c.name} AS ${c.alias}` : c.name).join(', ')
          : '*'
        // 根据 upstream 类型动态决定 FROM 形式
        const upSeg = (upstream[0] || '').trim()
        const fromClause = upSeg.startsWith('(')
          ? `${upSeg} AS ${upstreamAliasById.get(n.id) || 'filter_src'}`
          : upSeg
        let sql = `SELECT ${select}\nFROM ${fromClause}`
        const where = (cfg.where || '').trim()
        if (where) sql += `\nWHERE ${where}`
        seg = `(${sql})`
        break
      }
      case 'compare': {
        // 数据比对节点:2 入 1 出, FULL OUTER JOIN
        //   - 输入:src (baseline) + tgt (snapshot)
        //   - joinKeys:[{srcCol, tgtCol}] 自由配对(支持异名字段 a.id=b.user_id)
        //   - columns:[{name, srcField, tgtField, alias, enabled, compare}] 用户自定输出列
        //   - output:{added, deleted, changed, unchanged} 决定输出哪些差异行
        const ups = (incoming.get(n.id) || []).map((c) => visit(c)).filter(Boolean)
        if (ups.length < 2) {
          warnings.push(`compare 节点 "${n.label}" 入边少于 2（实际 ${ups.length}）`)
          seg = ups[0] || ''
          break
        }
        const incomingNodes = (incoming.get(n.id) || [])
          .map((id) => nodes.find((x) => x.id === id))
          .filter(Boolean)
        // 决定 src/tgt 索引(优先级: cfg.srcId/tgtId > 入边顺序)
        let srcIndex = 0
        let tgtIndex = 1
        if (cfg.srcId && cfg.tgtId) {
          const sIdx = incomingNodes.findIndex((x) => x.id === cfg.srcId)
          const tIdx = incomingNodes.findIndex((x) => x.id === cfg.tgtId)
          if (sIdx >= 0) srcIndex = sIdx
          if (tIdx >= 0) tgtIndex = tIdx
        }
        const srcAlias = incomingNodes[srcIndex]
          ? incomingNodes[srcIndex].label || incomingNodes[srcIndex].config?.alias || sanitizeAlias(incomingNodes[srcIndex].id)
          : ups[srcIndex] || 'src'
        const tgtAlias = incomingNodes[tgtIndex]
          ? incomingNodes[tgtIndex].label || incomingNodes[tgtIndex].config?.alias || sanitizeAlias(incomingNodes[tgtIndex].id)
          : ups[tgtIndex] || 'tgt'

        // ===== 解析 joinKeys =====
        // 优先新 cfg.joinKeys: [{srcCol, tgtCol}]
        // 兼容旧 cfg.key: 'id,code' (src/tgt 同名)
        let joinKeys: Array<{ srcCol: string; tgtCol: string }> = []
        if (Array.isArray(cfg.joinKeys) && cfg.joinKeys.length > 0) {
          joinKeys = cfg.joinKeys
            .map((k: any) => ({ srcCol: String(k.srcCol || '').trim(), tgtCol: String(k.tgtCol || '').trim() }))
            .filter((k: any) => k.srcCol && k.tgtCol)
        } else if (typeof cfg.key === 'string' && cfg.key.trim()) {
          const ks = cfg.key.split(',').map((k: string) => k.trim()).filter(Boolean)
          joinKeys = ks.map((k: string) => ({ srcCol: k, tgtCol: k }))
        }
        if (joinKeys.length === 0) {
          // 没配主键时,自动从 source1 第一个字段猜一个同名字段配对
          const srcNode = incomingNodes[srcIndex]
          const srcCols = Array.isArray(srcNode?.config?.columns) ? srcNode.config.columns
            : (Array.isArray(srcNode?.config?.cascade?.columns) ? srcNode.config.cascade.columns : [])
          const firstCol = srcCols.find((c: any) => c && c.name && c.enabled !== false) || srcCols.find((c: any) => c && c.name)
          if (firstCol && firstCol.name) {
            joinKeys = [{ srcCol: String(firstCol.name).trim(), tgtCol: String(firstCol.name).trim() }]
          } else {
            warnings.push(`compare 节点 "${n.label}" 未设置主键字段,请在节点配置里指定`)
            seg = ups[0] || ''
            break
          }
        }

        // ===== 解析 columns(用户可编辑的输出列) =====
        // 优先 cfg.columns: [{name, srcField, tgtField, alias, enabled, compare}]
        // 兼容旧 cfg.columns:[{name, enabled}] (SRC/TGT 同名)
        let outCols: Array<{
          name: string
          srcField: string
          tgtField: string
          alias: string
          enabled: boolean
          compare: boolean
        }> = []
        if (Array.isArray(cfg.columns) && cfg.columns.length > 0) {
          outCols = cfg.columns
            .map((c: any) => ({
              name: String(c.name || c.srcField || c.tgtField || '').trim(),
              srcField: String(c.srcField || c.name || '').trim(),
              tgtField: String(c.tgtField || c.name || '').trim(),
              alias: String(c.alias || c.name || '').trim(),
              enabled: c.enabled !== false,
              compare: c.compare !== false
            }))
            .filter((c: any) => c.srcField || c.tgtField)
        }

        // ===== 拼 SQL =====
        const srcKeyChecks = joinKeys.map((k) => `${srcAlias}.${k.srcCol} IS NULL`).join(' OR ')
        const tgtKeyChecks = joinKeys.map((k) => `${tgtAlias}.${k.tgtCol} IS NULL`).join(' AND ')
        const output = cfg.output || {}
        const outputSymbols = {
          added: String(output.addedSymbol || '+'),
          deleted: String(output.deletedSymbol || '-'),
          changed: String(output.changedSymbol || '~'),
          unchanged: String(output.unchangedSymbol || '=')
        }
        const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`
        let caseExpr = `WHEN ${srcKeyChecks} THEN ${sqlString(outputSymbols.added)}\n`
        caseExpr += `    WHEN ${tgtKeyChecks} THEN ${sqlString(outputSymbols.deleted)}\n`
        // 参与比对的列(compare=true 且 SRC+TGT 都有字段)
        const diffCols = outCols.filter((c) => c.compare && c.srcField && c.tgtField)
        if (diffCols.length > 0) {
          const diffExpr = diffCols.map((c) => {
            const a = `${srcAlias}.${c.srcField}`
            const b = `${tgtAlias}.${c.tgtField}`
            return `(${a} <> ${b} OR (${a} IS NULL) <> (${b} IS NULL))`
          }).join('\n      OR ')
          caseExpr += `    WHEN ${diffExpr} THEN ${sqlString(outputSymbols.changed)}\n`
        }
        caseExpr += `    ELSE ${sqlString(outputSymbols.unchanged)}`

        // cmp_id: 单 KEY 直接 COALESCE;多 KEY CONCAT_WS
        const keySelect = joinKeys.length === 1
          ? `COALESCE(${srcAlias}.${joinKeys[0].srcCol}, ${tgtAlias}.${joinKeys[0].tgtCol}) AS cmp_id`
          : `CONCAT_WS('|', ${joinKeys.map((k) => `COALESCE(${srcAlias}.${k.srcCol}, '')`).join(', ')}) AS cmp_id`

        // ON 表达式:src.a = tgt.b AND src.c = tgt.d
        const onExpr = joinKeys
          .map((k) => `${srcAlias}.${k.srcCol} = ${tgtAlias}.${k.tgtCol}`)
          .join(' AND ')

        // 输出列片段
        //   outputMode='src'  (默认): 只输出 SRC 一份,列别名直接用 alias
        //                          对差异行,TGT 没有的值显示为 NULL(SRC 实际有 → CMPOP=+, TGT 没有 → SRC=NULL)
        //   outputMode='both': 输出两份 s_<alias> / t_<alias>
        const outs = outCols.filter((c) => c.enabled)
        const colParts: string[] = []
        const mode = (cfg.outputMode || 'src') as string
        for (const c of outs) {
          const outAlias = (c.alias || c.name || c.srcField || c.tgtField || '').trim()
          if (!outAlias) continue
          if (mode === 'src') {
            if (c.srcField) colParts.push(`${srcAlias}.${c.srcField} AS ${outAlias}`)
          } else {
            if (c.srcField) colParts.push(`${srcAlias}.${c.srcField} AS s_${outAlias}`)
            if (c.tgtField) colParts.push(`${tgtAlias}.${c.tgtField} AS t_${outAlias}`)
          }
        }
        // 'src' 模式下,如果一列 SRC 没字段但 TGT 有(只对 TGT 关注),也补一个 TGT
        if (mode === 'src') {
          for (const c of outs) {
            const outAlias = (c.alias || c.name || c.srcField || c.tgtField || '').trim()
            if (!outAlias) continue
            if (!c.srcField && c.tgtField) {
              colParts.push(`${tgtAlias}.${c.tgtField} AS ${outAlias}`)
            }
          }
        }
        const colsSelect = colParts.length > 0 ? colParts.join(',\n  ') : `${srcAlias}.*`

        const opFilters: string[] = []
        if (output.added !== false) opFilters.push(sqlString(outputSymbols.added))
        if (output.deleted !== false) opFilters.push(sqlString(outputSymbols.deleted))
        if (output.changed !== false) opFilters.push(sqlString(outputSymbols.changed))
        if (output.unchanged === true) opFilters.push(sqlString(outputSymbols.unchanged))

        const inner = `SELECT\n  CASE\n    ${caseExpr}\n  END AS cmp_op,\n  ${keySelect},\n  ${colsSelect}\nFROM ${srcAlias} FULL OUTER JOIN ${tgtAlias}\n  ON ${onExpr}`
        const compareAlias = (cfg.alias || 'compare_out').trim().replace(/[^a-zA-Z0-9_]/g, '_')
        const outerWhere = opFilters.length > 0
          ? `WHERE ${compareAlias}.cmp_op IN (${opFilters.join(', ')})`
          : ''
        const fullSql = `SELECT * FROM (${inner}) AS ${compareAlias} ${outerWhere}`
        seg = `__CMP__:${compareAlias}:${fullSql}`
        break
      }
      case 'join': {
        const ups = (incoming.get(n.id) || []).map((c) => visit(c)).filter(Boolean)
        if (ups.length < 2) {
          warnings.push(`join 节点 "${n.label}" 入边少于 2（实际 ${ups.length}）,请连入主表和查表`)
          seg = ups[0] || ''
        } else {
          const joinType = (cfg.joinType || 'INNER').toUpperCase()
          // 解析 leftAlias / rightAlias:
          //   优先级 1: 节点 cfg 里存的别名
          //   优先级 2: 由两条入边对应的源节点 label/alias 自动推断（按边创建顺序）
          let leftAlias = cfg.leftAlias
          let rightAlias = cfg.rightAlias
          if (!leftAlias || !rightAlias) {
            // label = alias：节点的 label 就是 SQL 别名
            const incomingNodes = (incoming.get(n.id) || [])
              .map((id) => nodes.find((x) => x.id === id))
              .filter(Boolean)
            const inferred = incomingNodes.map((x) => x.label || x.config?.alias || sanitizeAlias(x.id))
            if (!leftAlias && inferred[0]) leftAlias = inferred[0]
            if (!rightAlias && inferred[1]) rightAlias = inferred[1]
          }
          if (!leftAlias || !rightAlias) {
            warnings.push(`join 节点 "${n.label}" 缺少主表/查表别名`)
            seg = ups[0] || ''
            break
          }
          const joinKeys = Array.isArray(cfg.joinKeys)
            ? cfg.joinKeys
                .map((k: any) => ({ left: String(k.left || k.srcCol || '').trim(), right: String(k.right || k.tgtCol || '').trim() }))
                .filter((k: any) => k.left && k.right)
            : []
          if (joinKeys.length === 0 && cfg.leftKey && cfg.rightKey) {
            joinKeys.push({ left: String(cfg.leftKey).trim(), right: String(cfg.rightKey).trim() })
          }
          if (joinKeys.length === 0) {
            warnings.push(`join 节点 "${n.label}" 未设置关联字段`)
            seg = ups[0] || ''
            break
          }
          // JOIN 必须声明明确的输出字段；SELECT * 会让下游无法获得稳定的字段契约。
          const selectCols = String(cfg.selectFields || '').trim()
          if (!selectCols || selectCols === '*') {
            warnings.push(`join 节点 "${n.label}" 未设置输出字段，请至少选择一个字段`)
            seg = ''
            break
          }
          const selectSql = selectCols === '*'
            ? '*'
            : (() => {
                const expressions = selectCols.split(',').map((expr: string) => expr.trim()).filter(Boolean)
                const names = expressions.map((expr: string) => expr.replace(/\s+AS\s+.+$/i, '').trim().split('.').pop() || expr)
                const duplicateNames = new Set(names.filter((name: string, index: number) => names.indexOf(name) !== index))
                return expressions.map((expr: string, index: number) => {
                  if (!duplicateNames.has(names[index]) || /\s+AS\s+/i.test(expr)) return expr
                  const parts = expr.split('.')
                  const source = parts.length > 1 ? parts[parts.length - 2] : 'field'
                  return `${expr} AS ${source}_${names[index]}`
                }).join(', ')
              })()
          const onExpr = joinKeys.map((key: any) => `${leftAlias}.${key.left} = ${rightAlias}.${key.right}`).join(' AND ')
          // 拼 SQL: SELECT ... FROM leftAlias INNER JOIN rightAlias ON 多组关联条件 [WHERE ...]
          let sql = `SELECT ${selectSql}\nFROM ${leftAlias} ${joinType} JOIN ${rightAlias}\n  ON ${onExpr}`
          if (cfg.where && cfg.where.trim()) {
            sql += `\nWHERE ${cfg.where.trim()}`
          }
          // 用 (sql) 包一层,让下游 (transform/sql/preview/sink) 可作为子查询引用
          seg = `(${sql})`
        }
        break
      }
      case 'cdc': {
        const ups = (incoming.get(n.id) || []).map((c) => visit(c)).filter(Boolean)
        const key = cfg.key || 'id'
        if (ups.length < 2) {
          warnings.push(`cdc 节点 "${n.label}" 入边少于 2（实际 ${ups.length}）`)
          seg = ups[0] || ''
        } else {
          seg = `((${ups[0]} EXCEPT ${ups[1]}) UNION (${ups[1]} EXCEPT ${ups[0]}) /* key=${key} */)`
        }
        break
      }
      case 'sql': {
        // SQL 节点:支持多入边
        //   - 单入边:SQL 里 FROM upstream   → 替换为 (子查询) AS up
        //   - 多入边:SQL 里 FROM upstreams  → 替换为 (子查询1) AS u1, (子查询2) AS u2 ...
        //   - outputs 字段(用户显式声明)→ 写回 n.config.fields,给下游节点引用 + 字段补全
        const ups = (incoming.get(n.id) || []).map((c) => visit(c)).filter(Boolean)
        const userSql = (cfg.sql || '').trim()
        // 把 outputs 写到节点 fields (供下游 + 自动补全)
        const outputs = Array.isArray(cfg.outputs) ? cfg.outputs : []
        const fields = outputs
          .map((o: any) => ({ name: String(o.name || '').trim(), type: String(o.type || 'STRING') }))
          .filter((f: any) => f.name)
        n.config.fields = fields
        n.config.columns = fields

        if (!userSql) {
          warnings.push(`sql 节点 "${n.label}" 未填写 SQL`)
          seg = ''
          break
        }
        if (ups.length === 0) {
          seg = `(${userSql})`
          break
        }
        if (ups.length === 1) {
          // 单入边:用入边 alias 当 FROM upstream
          //   Flink SQL 限制: FROM 后接 (alias) 不合法, 必须 (SELECT ... FROM alias) 子查询
          //   → 统一包成 (SELECT * FROM ups[0]) AS x 形式, Flink 必接受
          const upstreamAlias = (Array.isArray(cfg.upstreamAliases) && cfg.upstreamAliases[0])
            ? String(cfg.upstreamAliases[0]).trim()
            : 'up'
          const singleSql = userSql.replace(
            /\bFROM\s+upstream\b/gi,
            `FROM (SELECT * FROM ${ups[0]}) AS ${upstreamAlias}`
          )
          seg = `(${singleSql})`
          break
        }
        // 多入边:FROM upstreams 替换为 (SELECT * FROM ups[0]) AS u1 LEFT JOIN (SELECT * FROM ups[1]) AS u2 ON 1=1 ...
        //   Flink SQL 限制: FROM 后接 (alias) 不合法, 必须 (SELECT ... FROM alias) 子查询
        //   所以每个入边都包成 (SELECT * FROM ups[i]) 再套 LEFT JOIN ... ON 1=1
        //   (用户可以在 SQL 里用 a.id / b.lvl 引用, 因为是 LEFT JOIN 链)
        const uNames: string[] = (Array.isArray(cfg.upstreamAliases) && cfg.upstreamAliases.length === ups.length)
          ? cfg.upstreamAliases.map((s: any) => String(s || '').trim()).filter(Boolean)
          : ups.map((_, i) => `u${i + 1}`)
        if (ups.length === 2) {
          const fromList = `(SELECT * FROM ${ups[0]}) AS ${uNames[0] || 'u1'} LEFT JOIN (SELECT * FROM ${ups[1]}) AS ${uNames[1] || 'u2'} ON 1=1`
          const multiSql = userSql.replace(/\bFROM\s+upstreams\b/gi, `FROM ${fromList}`)
          seg = `(${multiSql})`
        } else {
          // 3+ 个入边: 链式 LEFT JOIN
          let chain = `(SELECT * FROM ${ups[0]}) AS ${uNames[0] || 'u1'}`
          for (let i = 1; i < ups.length; i++) {
            chain += ` LEFT JOIN (SELECT * FROM ${ups[i]}) AS ${uNames[i] || `u${i + 1}`} ON 1=1`
          }
          const multiSql = userSql.replace(/\bFROM\s+upstreams\b/gi, `FROM ${chain}`)
          seg = `(${multiSql})`
        }
        break
      }
      case 'preview': {
        const upstream = (incoming.get(n.id) || []).map((c) => visit(c)).filter(Boolean)
        const limit = cfg.limit || 100
        if (upstream.length === 0) {
          seg = `SELECT * /* preview ${n.label} */ LIMIT ${limit}`
        } else {
          // Flink SQL 不支持 SELECT * FROM (alias) 这种子查询,直接用 alias 名
          seg = `SELECT * FROM ${upstream[0]} LIMIT ${limit}`
        }
        break
      }
      case 'sink': {
        // sink 不向上游返回 SQL（终止点）
        seg = ''
        break
      }
      default:
        seg = `/* unknown type: ${n.type} */`
    }
    visited.add(nid)
    visiting.delete(nid)
    return seg
  }

  // 找到所有 sink / preview 的入边作为组装点
  // preview 节点 → SELECT ... LIMIT (不写入下游, 单独 SQL)
  // sink 节点   → INSERT INTO sink ...
  const fragments: string[] = []
  for (const snk of sinkNodes) {
    const upstreamIds = incoming.get(snk.id) || []
    const primaryUpstream = upstreamIds.length === 1
      ? nodes.find((n) => n.id === upstreamIds[0])
      : undefined
    const primaryUpstreamAlias = String(
      primaryUpstream?.config?.alias || primaryUpstream?.label || 'upstream'
    ).trim() || 'upstream'
    const ups = upstreamIds.map((c) => visit(c)).filter(Boolean)
    if (ups.length === 0) {
      warnings.push(`sink 节点 "${snk.label}" 无入边`)
      continue
    }
    const cfg = snk.config || {}
    const mode = String(cfg.mode || 'insert').toLowerCase()
    const sinkAlias = sinkAliasById.get(snk.id) || ''
    // 多入边 → UNION ALL 合并
    // 特判:每个 up 可能是 compare 输出(__CMP__: 前缀) → 还原成完整 SQL
    const upsExpanded = ups.map((u: string) => {
      if (u && u.startsWith('__CMP__:')) {
        const rest = u.substring('__CMP__:'.length)
        const colonIdx = rest.indexOf(':')
        if (colonIdx > 0) return rest.substring(colonIdx + 1)
      }
      return u
    })
    const mergedRaw = upsExpanded.length === 1 ? upsExpanded[0] : upsExpanded.join(' UNION ALL ')
    // source 节点的 visit 结果是已注册的临时表别名（例如 source1），
    // 直接拼接会生成非法的 `INSERT INTO sink source1`。将别名转换为查询。
    const merged = mergedRaw.trim().startsWith('(') || /\s+UNION\s+ALL\s+/i.test(mergedRaw)
      ? mergedRaw
      : `SELECT * FROM ${mergedRaw}`
    const mappings = Array.isArray(cfg.fieldMappings)
      ? cfg.fieldMappings.filter((m: any) => m?.enabled !== false && m?.target && m?.expr)
      : []
    // 字段映射下拉框使用“上游别名.字段名”作为表达式。单个表直接入边时，
    // 保留这个表别名作为 FROM 对象；否则外层子查询会让 source1.ID 失去作用域。
    // 中间节点/多入边则给合并结果补一个稳定别名，兼容同样的字段引用方式。
    const directSource = primaryUpstream?.type === 'source' && upsExpanded.length === 1
    const mappingFrom = directSource
      ? mergedRaw
      : `(${merged}) AS ${primaryUpstreamAlias}`
    const mappedQuery = mappings.length
      ? `SELECT ${mappings.map((m: any) => `${m.expr} AS ${m.target}`).join(', ')} FROM ${mappingFrom}`
      : merged
    const targetColumns = mappings.length
      ? ` (${mappings.map((m: any) => m.target).join(', ')})`
      : ''
    const insertSql = mode === 'replace_into' || mode === 'replaceinto' || mode === 'replace' || mode === 'upsert'
      ? `INSERT INTO ${sinkAlias}${targetColumns} ${mappedQuery} /* mode=upsert */`
      : `INSERT INTO ${sinkAlias}${targetColumns} ${mappedQuery}`
    // Flink TableEnvironment.executeSql(INSERT) is awaited by the launcher
    // before it exits, so the JDBC sink can flush and commit its transaction.
    fragments.push(insertSql)
  }

  // preview 节点：单独跑一段 SELECT (没有 sink 也可以运行)
  const previewNodes = nodes.filter((n) => n.type === 'preview')
  for (const prv of previewNodes) {
    const incomingIds = incoming.get(prv.id) || []
    if (incomingIds.length === 0) {
      warnings.push(`preview 节点 "${prv.label}" 无入边`)
      continue
    }
    const cfg = prv.config || {}
    const limit = cfg.limit || 100
    // preview 看的是「谁连入它」，把每条入边的 visit() 输出用 UNION ALL 串起来
    // visit() 的返回值有两种：
    //   - source：alias（已注册成临时表，可直接引用）→ SELECT * FROM source1 LIMIT n
    //   - join / transform：(SELECT ...) 子查询 → SELECT * FROM (SELECT ...) AS alias LIMIT n
    const upSelects = incomingIds.map((srcId: string) => {
      const srcNode = nodes.find((x) => x.id === srcId)
      const alias = (srcNode?.label && srcNode.label.trim()) || srcNode?.config?.alias || sanitizeAlias(srcId)
      const seg = (visit(srcId) || '').trim()
      // 特判:upstream 是 compare 节点的输出(用 __CMP__: 前缀标记)
      if (seg.startsWith('__CMP__:')) {
        // 格式:__CMP__:<compareAlias>:<完整SQL>
        const rest = seg.substring('__CMP__:'.length)
        const colonIdx = rest.indexOf(':')
        if (colonIdx > 0) {
          const compareAlias = rest.substring(0, colonIdx)
          const fullSql = rest.substring(colonIdx + 1)
          // 直接拼 LIMIT
          return `${fullSql} LIMIT ${limit}`
        }
      }
      if (seg.startsWith('(')) {
        // 子查询
        return `SELECT * FROM ${seg} AS ${alias} LIMIT ${limit}`
      }
      // 普通 alias（source 已注册成临时表）
      return `SELECT * FROM ${alias} LIMIT ${limit}`
    })
    fragments.push(upSelects.join(' UNION ALL '))
  }

  if (fragments.length === 0) {
    return '-- 画布上没有 sink / preview 节点，或所有 sink 都无入边'
  }

  return fragments.join(';\n')
}

function tryParseColumns(raw: any): any[] | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

// ============== PipelineRequest（用于前端"测试运行"直接 POST flink-etl） ==============

/**
 * 同样输入再生成 flink-etl 的 PipelineRequest JSON。
 * 这样 designer "测试运行" 按钮可以同时生成 properties 4 字段 + PipelineRequest JSON。
 */
export function buildPipelineRequest(
  datasources: DatasourceConfig[],
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  jobName: string,
  parallelism: number
): any {
  const built = buildPipeline(datasources, nodes, edges, { parallelism, jobName })

  // 复用 built.sources / built.sinks，转换回 PipelineRequest 的 sources/sinks 数组
  // （其实 flink-etl 自己的 PipelineService.writePropertiesFile 也是从前端 JSON 拼 9-列；
  //  这里我们用已经拼好的 9-列 / 8-列字符串，反向拆出给 PipelineRequest）
  const sourceArr = built.sources
    .split(';')
    .filter(Boolean)
    .map((s) => parseSourceSpec(s, datasources, sourceNodes(nodes)))

  const sinkArr = built.sinks
    .split(';')
    .filter(Boolean)
    .map((s) => parseSinkSpec(s, datasources, sinkNodes(nodes)))

  return {
    jobName,
    parallelism: built.parallelism,
    datasources: datasources.map((d) => ({ ...d })),
    sources: sourceArr,
    sinks: sinkArr,
    sql: built.sql,
    warnings: built.warnings || []
  }
}

function sourceNodes(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.filter((n) => n.type === 'source')
}
function sinkNodes(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.filter((n) => n.type === 'sink')
}

/**
 * 把 9-列 spec 里第 9 列 (fields) 反解为 [{name,type}] 数组
 * 新格式:JSON 数组字符串 (与 formatDbNodeSource 一致)
 * 老格式兜底: "name:type,name:type" (逗号分隔)
 */

/**
 * 解析 JDBC URL → { host, port, database }
 * 例:
 *   jdbc:mysql://10.0.0.1:3306/testdb?useSSL=false
 *     → { host:'10.0.0.1', port:3306, database:'testdb' }
 *   jdbc:oracle:thin:@host:1521:orcl
 *     → { host:'host', port:1521, database:'orcl' }
 *   jdbc:sqlserver://host:1433;databaseName=testdb
 *     → { host:'host', port:1433, database:'testdb' }
 */
function parseJdbcUrl(url: string): { host: string; port: number; database: string } {
  const failRet = { host: '', port: 0, database: '' }
  if (!url) return failRet
  try {
    let s = String(url).replace(/^jdbc:/i, '')
    // oracle sid 形式: oracle:thin:@host:port:sid (没有 //)
    const sid = s.match(/^oracle:thin:@([^:]+):(\d+):(.+)$/i)
    if (sid) {
      return { host: sid[1] || '', port: parseInt(sid[2] || '0', 10) || 0, database: sid[3] || '' }
    }
    // oracle service name 形式: oracle:thin:@//host:port/service (有 //)
    const svc = s.match(/^oracle:thin:@\/\/([^:\/]+):(\d+)\/(.+)$/i)
    if (svc) {
      return { host: svc[1] || '', port: parseInt(svc[2] || '0', 10) || 0, database: svc[3] || '' }
    }
    // 标准形式: <type>://host:port/database?...
    const m = s.match(/^[^:\/?]+:\/\/([^:\/]+)(?::(\d+))?(?:[\/?;]([^?;]+))?/i)
    if (m) {
      const dbRaw = (m[3] || '').split('?')[0].split(';')[0]
      // sqlserver 用 ;databaseName=xxx,把 databaseName= 前缀去掉
      const database = dbRaw.replace(/^databaseName=/i, '')
      return {
        host: m[1] || '',
        port: parseInt(m[2] || '0', 10) || 0,
        database
      }
    }
    return failRet
  } catch {
    return failRet
  }
}
function parseFieldsSpec(raw: string): Array<{ name: string; type: string }> {
  if (!raw) return []
  const s = raw.trim()
  if (!s) return []
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s)
      if (Array.isArray(arr)) {
        return arr
          .map((f: any) => ({
            name: String(f?.name || ''),
            type: String(f?.type || 'STRING')
          }))
          .filter((f: { name: string }) => f.name)
      }
    } catch {
      // 兜底走老 split
    }
  }
  return s.split(',').filter(Boolean).map((f) => {
    const [name, type] = f.split(':')
    return { name, type: type || 'STRING' }
  })
}

function parseSourceSpec(spec: string, datasources: DatasourceConfig[], srcs: CanvasNode[]): any {
  const parts = spec.split('|')
  const alias = parts[5]
  const matchingSrc = srcs.find((n) => sanitizeAlias(n.id) === alias)
  const cfg = matchingSrc?.config || {}
  let dsId = cfg.datasourceId ?? cfg.cascade?.dsId
  let dsEntry: DatasourceConfig | undefined
  // 兜底：按 database / datasourceAlias 匹配 datasourceId（兼容旧节点只有 datasourceAlias 没 dsId）
  //   优先级：database 精确匹配 → datasourceAlias 匹配 (d.name / d.aliasName) → datasourceList 只有 1 个时用它
  if (dsId == null && datasources.length > 0) {
    const dbName = cfg.database || cfg.cascade?.database || cfg.owner
    const dsAlias = cfg.datasourceAlias || cfg.cascade?.datasourceAlias
    // 1. 按 database 匹配
    dsEntry = dbName ? datasources.find((d) => d.database === dbName) : undefined
    // 2. 按 datasourceAlias 匹配 (用户保存的旧配置用 cascade.datasourceAlias = "join-ds-a")
    if (!dsEntry && dsAlias) {
      dsEntry = datasources.find((d) => d.name === dsAlias || d.aliasName === dsAlias)
    }
    // 3. datasourceList 只有一个时直接用它（绝大多数 ETL 作业只有一个数据源）
    if (!dsEntry && datasources.length === 1) {
      dsEntry = datasources[0]
    }
    if (dsEntry) dsId = dsEntry.id
    if (typeof console !== 'undefined') {
      console.log('[etl-designer] parseSourceSpec reverse-lookup:', {
        alias, dbName, dsAlias, dsList: datasources.length, matched: dsEntry?.id || 'NULL'
      })
    }
  }
  // 兜底 if dsId 仍然为空:用匹配到的 dsEntry 提供;否则用 cfg.cascade.datasourceAlias
  const ds = dsEntry || (dsId != null ? datasources.find((d) => String(d.id) === String(dsId)) : undefined)
  // 节点携带的连接参数 (designer 抽屉里的 host/port/database/userName/password)
  const cascade = cfg.cascade || {}
  // 从 spec 字符串本身反推 (compare 等"虚拟"source 节点的 matchingSrc 找不到, 这里兜底)
  const urlInfo = parseJdbcUrl(parts[0] || '')
  const specUser = parts[1] || ''
  const specPwd = parts[2] || ''
  const specDriver = (parts[3] || '').toLowerCase()
  // type: 优先 ds / cascade 的, 否则从 driver 类名反推
  let specType = ''
  if (specDriver.includes('dm.jdbc')) specType = 'dameng'
  else if (specDriver.includes('oracle')) specType = 'oracle'
  else if (specDriver.includes('mysql')) specType = 'mysql'
  else if (specDriver.includes('postgresql')) specType = 'postgresql'
  else if (specDriver.includes('sqlserver')) specType = 'sqlserver'
  return {
    alias,
    datasourceId: dsId != null ? String(dsId) : (ds?.id ?? null),
    // 附加兜底字段供后端 resolveMissingDatasources 使用
    datasourceAlias:
      cfg.datasourceAlias ||
      cascade.datasourceAlias ||
      ds?.name ||
      ds?.aliasName ||
      alias,
    type: ds?.type || cascade.dsType?.toLowerCase?.() || specType || '',
    host: ds?.host || cascade.host || urlInfo.host || '',
    port: ds?.port ?? cascade.port ?? urlInfo.port ?? 0,
    // database 是 catalog/db (datasource 默认), 不是 owner (用户选的 schema).
    // 后端 crossDb 判断用 owner vs database, 这里别把 owner 错填到 database.
    database: ds?.database || cascade.database || urlInfo.database || '',
    userName: ds?.username || cascade.userName || specUser,
    username: ds?.username || cascade.userName || specUser,
    password: ds?.password || cascade.password || '',
    table: parts[4],
    owner: parts[6] || undefined,
    tableSchema: parts[7] || undefined,
    fields: parseFieldsSpec(parts[8] || ''),
    mode: undefined
  }
}

function parseSinkSpec(spec: string, datasources: DatasourceConfig[], snks: CanvasNode[]): any {
  const parts = spec.split('|')
  const alias = parts[5]
  const matchingSnk = snks.find((n) =>
    sanitizeAlias(n.id) === alias ||
    sanitizeAlias(n.label) === alias ||
    sanitizeAlias(n.config?.alias) === alias
  )
  const cfg = matchingSnk?.config || {}
  let dsId = cfg.datasourceId ?? cfg.cascade?.dsId
  let dsEntry: DatasourceConfig | undefined
  // 兜底：按 database / datasourceAlias 匹配 datasourceId
  if (dsId == null) {
    const dbName = cfg.database || cfg.cascade?.database || cfg.owner
    const dsAlias = cfg.datasourceAlias || cfg.cascade?.datasourceAlias
    dsEntry = dbName ? datasources.find((d) => d.database === dbName) : undefined
    if (!dsEntry && dsAlias) {
      dsEntry = datasources.find((d) => d.name === dsAlias || d.aliasName === dsAlias)
    }
    if (!dsEntry && datasources.length === 1) {
      dsEntry = datasources[0]
    }
    if (dsEntry) dsId = dsEntry.id
  }
  const ds = dsEntry || (dsId != null ? datasources.find((d) => String(d.id) === String(dsId)) : undefined)
  const cascade = cfg.cascade || {}
  // sink 同 source, 从 spec 字符串兜底 (compare 等虚拟 sink 节点 matchingSnk 找不到)
  const urlInfo = parseJdbcUrl(parts[0] || '')
  const specUser = parts[1] || ''
  const specDriver = (parts[3] || '').toLowerCase()
  let specType = ''
  if (specDriver.includes('dm.jdbc')) specType = 'dameng'
  else if (specDriver.includes('oracle')) specType = 'oracle'
  else if (specDriver.includes('mysql')) specType = 'mysql'
  else if (specDriver.includes('postgresql')) specType = 'postgresql'
  else if (specDriver.includes('sqlserver')) specType = 'sqlserver'
  return {
    alias,
    datasourceId: dsId != null ? String(dsId) : (ds?.id ?? null),
    datasourceAlias:
      cfg.datasourceAlias ||
      cascade.datasourceAlias ||
      ds?.name ||
      ds?.aliasName ||
      alias,
    type: ds?.type || cascade.dsType?.toLowerCase?.() || specType || '',
    host: ds?.host || cascade.host || urlInfo.host || '',
    port: ds?.port ?? cascade.port ?? urlInfo.port ?? 0,
    database: ds?.database || cascade.database || urlInfo.database || '',
    userName: ds?.username || cascade.userName || specUser,
    username: ds?.username || cascade.userName || specUser,
    password: ds?.password || cascade.password || '',
    table: parts[4],
    owner: parts[6] || undefined,
    tableSchema: parts[7] || undefined,
    fields: undefined,
    mode: normalizeSinkMode(cfg.mode)
  }
}

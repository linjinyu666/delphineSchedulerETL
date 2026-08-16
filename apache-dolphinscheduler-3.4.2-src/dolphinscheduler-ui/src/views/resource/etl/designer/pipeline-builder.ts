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

// ============== 数据结构 ==============

export interface DatasourceConfig {
  id: string
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
        alias: sanitizeAlias(n.id),
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
      const mode = cfg.mode
      const node: DbNodeConfig = {
        alias: sanitizeAlias(n.id),
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
  // fields 可能是 string[] (列名) 或 {name,type}[] 对象数组,两种都支持
  const fields = (node.fields || [])
    .map((f: any) => {
      if (typeof f === 'string') return `${f}:STRING`
      if (f && typeof f === 'object') return `${f.name || ''}:${f.type || 'STRING'}`
      return ''
    })
    .filter(Boolean)
    .join(',')
  return [url, ds.username || '', ds.password || '', driver, table, alias, owner, tableSchema, fields].join('|')
}

/**
 * sink 8-列：url|user|pwd|driver|table|alias|owner|tableSchema
 * ConfigurableJdbcEtl.splitConfig(snk, 8) 期望 8 列，sink 无 fields
 */
function formatDbNodeSink(ds: DatasourceConfig, node: DbNodeConfig): string {
  const { url, driver } = buildUrlAndDriver(ds)
  const table = normalizeTable(ds.type, node.table || '')
  const alias = node.alias || ''
  const owner = node.owner || ''
  const tableSchema = node.tableSchema || ''
  return [url, ds.username || '', ds.password || '', driver, table, alias, owner, tableSchema].join('|')
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
        seg = sourceAliasById.get(n.id) || ''
        break
      }
      case 'transform': {
        // 列映射：把 upstream 的列按 columns 映射
        const upstream = (incoming.get(n.id) || []).map((c) => visit(c)).filter(Boolean)
        if (upstream.length === 0) {
          seg = `(SELECT * FROM (\`upstream\` /* transform: ${n.label} */))`
        } else {
          const cols = tryParseColumns(cfg.columns)
          const select = cols && cols.length > 0
            ? cols.map((c: any) => c.dst ? `${c.src || c.dst} AS ${c.dst}` : (c.src || c)).join(', ')
            : '*'
          seg = `(SELECT ${select} FROM (${upstream[0]}))`
        }
        break
      }
      case 'join': {
        const ups = (incoming.get(n.id) || []).map((c) => visit(c)).filter(Boolean)
        if (ups.length < 2) {
          warnings.push(`join 节点 "${n.label}" 入边少于 2（实际 ${ups.length}）`)
          seg = ups[0] || ''
        } else {
          const joinType = (cfg.joinType || 'INNER').toUpperCase()
          const cond = cfg.condition || 'a.id = b.id'
          seg = `(${ups[0]} ${joinType} JOIN ${ups[1]} ON ${cond})`
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
        const upstream = (incoming.get(n.id) || []).map((c) => visit(c)).filter(Boolean)
        const userSql = cfg.sql || ''
        if (upstream.length === 0) {
          seg = `(${userSql})`
        } else {
          // 用户 SQL 中的 from/upstream 关键字替换为第一个上游
          // 简化：包一层 SELECT * FROM (upstream) AS up, 让用户用 up.* 引用
          seg = `(${userSql.replace(/\bupstream\b/gi, `(${upstream[0]}) AS up`) || 'SELECT * FROM (' + upstream[0] + ')'})`
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
    const ups = (incoming.get(snk.id) || []).map((c) => visit(c)).filter(Boolean)
    if (ups.length === 0) {
      warnings.push(`sink 节点 "${snk.label}" 无入边`)
      continue
    }
    const cfg = snk.config || {}
    const mode = (cfg.mode || 'insert').toLowerCase()
    const sinkAlias = sinkAliasById.get(snk.id) || ''
    // 多入边 → UNION ALL 合并
    const merged = ups.length === 1 ? ups[0] : ups.join(' UNION ALL ')
    const insertSql = mode === 'truncate_insert'
      ? `/* TRUNCATE before */ INSERT INTO ${sinkAlias} ${merged}`
      : `INSERT INTO ${sinkAlias} ${merged}`
    fragments.push(insertSql)
  }

  // preview 节点：单独跑一段 SELECT (没有 sink 也可以运行)
  const previewNodes = nodes.filter((n) => n.type === 'preview')
  for (const prv of previewNodes) {
    const ups = (incoming.get(prv.id) || []).map((c) => visit(c)).filter(Boolean)
    if (ups.length === 0) {
      warnings.push(`preview 节点 "${prv.label}" 无入边`)
      continue
    }
    const cfg = prv.config || {}
    const limit = cfg.limit || 100
    const merged = ups.length === 1 ? ups[0] : ups.join(' UNION ALL ')
    // Flink SQL 不支持 SELECT * FROM (alias),直接用 alias 名
    fragments.push(`SELECT * FROM ${merged} LIMIT ${limit}`)
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

function parseSourceSpec(spec: string, datasources: DatasourceConfig[], srcs: CanvasNode[]): any {
  const parts = spec.split('|')
  const alias = parts[5]
  const matchingSrc = srcs.find((n) => sanitizeAlias(n.id) === alias)
  const cfg = matchingSrc?.config || {}
  const dsId = cfg.datasourceId ?? cfg.cascade?.dsId
  const ds = datasources.find((d) => d.id === dsId || String(d.id) === String(dsId))
  return {
    alias,
    datasourceId: dsId,
    table: parts[4],
    owner: parts[6] || undefined,
    tableSchema: parts[7] || undefined,
    fields: (parts[8] || '').split(',').filter(Boolean).map((f) => {
      const [name, type] = f.split(':')
      return { name, type: type || 'STRING' }
    }),
    mode: undefined
  }
}

function parseSinkSpec(spec: string, datasources: DatasourceConfig[], snks: CanvasNode[]): any {
  const parts = spec.split('|')
  const alias = parts[5]
  const matchingSnk = snks.find((n) => sanitizeAlias(n.id) === alias)
  const cfg = matchingSnk?.config || {}
  const dsId = cfg.datasourceId ?? cfg.cascade?.dsId
  return {
    alias,
    datasourceId: dsId,
    table: parts[4],
    owner: parts[6] || undefined,
    tableSchema: parts[7] || undefined,
    fields: undefined,
    mode: cfg.mode
  }
}
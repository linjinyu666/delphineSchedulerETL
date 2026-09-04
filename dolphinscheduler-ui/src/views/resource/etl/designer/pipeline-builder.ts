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
      const mode = cfg.mode
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
        // source 节点只用 alias（已注册成临时表）
        // 不支持 WHERE：Flink SQL 的 CREATE TABLE 不接受 WHERE，强行过滤会破坏 DDL
        // 过滤请在下游 join/transform/sql 节点做
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
        // 数据比对节点：2 入 1 出
        //   - 输入:src (baseline) + tgt (snapshot)
        //   - 主键:cfg.key
        //   - 比对字段:cfg.columns 中 enabled=true 的列
        //   - 输出差异类型:cfg.output (added/deleted/changed/unchanged)
        //   - 关键:upstream 都是 source (visit 返回 alias) — alias 已是注册好的临时表
        //     所以 FROM 直接用 alias,不带括号
        const ups = (incoming.get(n.id) || []).map((c) => visit(c)).filter(Boolean)
        if (ups.length < 2) {
          warnings.push(`compare 节点 "${n.label}" 入边少于 2（实际 ${ups.length}）`)
          seg = ups[0] || ''
          break
        }
        // 决定哪个是 src / tgt:
        //   优先级 1: cfg.srcId / cfg.tgtId (节点 id)
        //   优先级 2: 入边顺序 [0]=src, [1]=tgt
        const incomingNodes = (incoming.get(n.id) || [])
          .map((id) => nodes.find((x) => x.id === id))
          .filter(Boolean)
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
        // 主键(支持单 KEY;多 KEY 用逗号分隔)
        const keyField = (cfg.key || 'id').trim()
        if (!keyField) {
          warnings.push(`compare 节点 "${n.label}" 未设置主键字段`)
          seg = ups[0] || ''
          break
        }
        const keys = keyField.split(',').map((k: string) => k.trim()).filter(Boolean)
        // 比对字段(enabled=true)
        const colsRaw = cfg.columns
        let compareCols: Array<{ name: string; enabled?: boolean }> | null = null
        if (Array.isArray(colsRaw)) {
          compareCols = colsRaw.filter((c: any) => c && c.name && c.enabled !== false)
        } else if (typeof colsRaw === 'string' && colsRaw.trim()) {
          try {
            const parsed = JSON.parse(colsRaw)
            if (Array.isArray(parsed)) {
              compareCols = parsed.filter((c: any) => c && c.name && c.enabled !== false)
            }
          } catch { /* ignore */ }
        }
        // CASE WHEN 表达式:直接用源表别名(不再用 CTE,因为 Flink 对 CTE 引用敏感)
        const keyChecks = keys.map((k: string) => `${srcAlias}.${k} IS NULL`).join(' OR ')
        let caseExpr = `WHEN ${keyChecks} THEN '+'\n`
        const keyChecksTgt = keys.map((k: string) => `${tgtAlias}.${k} IS NULL`).join(' AND ')
        caseExpr += `    WHEN ${keyChecksTgt} THEN '-'\n`
        if (compareCols && compareCols.length > 0) {
          const diffExpr = compareCols.map((c: any) => {
            const cn = c.name
            return `(${srcAlias}.${cn} <> ${tgtAlias}.${cn} OR (${srcAlias}.${cn} IS NULL) <> (${tgtAlias}.${cn} IS NULL))`
          }).join('\n      OR ')
          caseExpr += `    WHEN ${diffExpr} THEN '~'\n`
        }
        caseExpr += `    ELSE '='`
        const keySelect = keys.length === 1
          ? `COALESCE(${srcAlias}.${keys[0]}, ${tgtAlias}.${keys[0]}) AS cmp_id`
          : `CONCAT_WS('|', ${keys.map((k: string) => `COALESCE(${srcAlias}.${k}, '')`).join(', ')}) AS cmp_id`
        const out = cfg.output || {}
        const opFilters: string[] = []
        if (out.added !== false) opFilters.push("'+'")
        if (out.deleted !== false) opFilters.push("'-'")
        if (out.changed !== false) opFilters.push("'~'")
        if (out.unchanged === true) opFilters.push("'='")
        // 关键:Flink/Calcite 不允许同层 SELECT WHERE 引用 SELECT 定义的 alias
        // 解决:子查询不带 WHERE,WHERE 提到 outer SELECT
        //   SELECT * FROM (subquery) AS x WHERE x.cmp_op IN (...) LIMIT N
        let sql: string
        if (compareCols && compareCols.length > 0) {
          const prefixed = compareCols.map((c: any) => `${srcAlias}.${c.name} AS s_${c.name}`).join(', ')
          const prefixedT = compareCols.map((c: any) => `${tgtAlias}.${c.name} AS t_${c.name}`).join(', ')
          sql = `SELECT\n  CASE\n    ${caseExpr}\n  END AS cmp_op,\n  ${keySelect},\n  ${prefixed},\n  ${prefixedT}\nFROM ${srcAlias} FULL OUTER JOIN ${tgtAlias}\n  ON ${keys.map((k: string) => `${srcAlias}.${k} = ${tgtAlias}.${k}`).join(' AND ')}`
        } else {
          sql = `SELECT\n  CASE\n    ${caseExpr}\n  END AS cmp_op,\n  ${keySelect},\n  ${srcAlias}.*, ${tgtAlias}.*\nFROM ${srcAlias} FULL OUTER JOIN ${tgtAlias}\n  ON ${keys.map((k: string) => `${srcAlias}.${k} = ${tgtAlias}.${k}`).join(' AND ')}`
        }
        const compareAlias = (cfg.alias || 'compare_out').trim().replace(/[^a-zA-Z0-9_]/g, '_')
        // Flink 不允许子查询嵌套多层(测试发现 3 层会抛 ParseException)
        // 解决:compare 直接输出完整 SQL(已含 cmp_op 过滤条件),不用包 subquery
        // 但 Calcite 不允许同层 SELECT WHERE 引用 SELECT 的 alias,所以必须用子查询包
        // 妥协:让 preview 节点对 compare 输出特判 — 用 alias 引用而不是子查询包裹
        //   compare 输出 = 带特殊前缀的字符串:`__CMP__:<compareAlias>:<完整SQL>`
        //   preview 看到这个会取 <完整SQL> 直接拼 LIMIT
        const outerWhere = opFilters.length > 0
          ? `WHERE ${compareAlias}.cmp_op IN (${opFilters.join(', ')})`
          : ''
        const fullSql = `SELECT * FROM (${sql}) AS ${compareAlias} ${outerWhere}`
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
          const leftKey = cfg.leftKey
          const rightKey = cfg.rightKey
          if (!leftKey || !rightKey) {
            warnings.push(`join 节点 "${n.label}" 未设置关联字段(leftKey/rightKey)`)
            seg = ups[0] || ''
            break
          }
          // SELECT 子句：默认 '*' 全部;或子集 'a.id, b.name'
          const selectCols = (cfg.selectFields || '*').trim() || '*'
          // 拼 SQL: SELECT ... FROM leftAlias INNER JOIN rightAlias ON leftAlias.leftKey = rightAlias.rightKey [WHERE ...]
          let sql = `SELECT ${selectCols}\nFROM ${leftAlias} ${joinType} JOIN ${rightAlias}\n  ON ${leftAlias}.${leftKey} = ${rightAlias}.${rightKey}`
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
    // 特判:每个 up 可能是 compare 输出(__CMP__: 前缀) → 还原成完整 SQL
    const upsExpanded = ups.map((u: string) => {
      if (u && u.startsWith('__CMP__:')) {
        const rest = u.substring('__CMP__:'.length)
        const colonIdx = rest.indexOf(':')
        if (colonIdx > 0) return rest.substring(colonIdx + 1)
      }
      return u
    })
    const merged = upsExpanded.length === 1 ? upsExpanded[0] : upsExpanded.join(' UNION ALL ')
    const insertSql = mode === 'truncate_insert'
      ? `/* TRUNCATE before */ INSERT INTO ${sinkAlias} ${merged}`
      : `INSERT INTO ${sinkAlias} ${merged}`
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

function parseSourceSpec(spec: string, datasources: DatasourceConfig[], srcs: CanvasNode[]): any {
  const parts = spec.split('|')
  const alias = parts[5]
  const matchingSrc = srcs.find((n) => sanitizeAlias(n.id) === alias)
  const cfg = matchingSrc?.config || {}
  let dsId = cfg.datasourceId ?? cfg.cascade?.dsId
  // 兜底：按 database / datasourceAlias 匹配 datasourceId（兼容旧节点只有 datasourceAlias 没 dsId）
  //   优先级：database 精确匹配 → datasourceAlias 匹配 (d.name / d.aliasName) → datasourceList 只有 1 个时用它
  if (dsId == null && datasources.length > 0) {
    const dbName = cfg.database || cfg.cascade?.database || cfg.owner
    const dsAlias = cfg.datasourceAlias || cfg.cascade?.datasourceAlias
    // 1. 按 database 匹配
    let matched = dbName ? datasources.find((d) => d.database === dbName) : undefined
    // 2. 按 datasourceAlias 匹配 (用户保存的旧配置用 cascade.datasourceAlias = "join-ds-a")
    if (!matched && dsAlias) {
      matched = datasources.find((d) => d.name === dsAlias || d.aliasName === dsAlias)
    }
    // 3. datasourceList 只有一个时直接用它（绝大多数 ETL 作业只有一个数据源）
    if (!matched && datasources.length === 1) {
      matched = datasources[0]
    }
    if (matched) dsId = matched.id
    if (typeof console !== 'undefined') {
      console.log('[etl-designer] parseSourceSpec reverse-lookup:', {
        alias, dbName, dsAlias, dsList: datasources.length, matched: matched?.id || 'NULL'
      })
    }
  }
  return {
    alias,
    datasourceId: dsId ?? null,
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
  let dsId = cfg.datasourceId ?? cfg.cascade?.dsId
  // 兜底：按 database / datasourceAlias 匹配 datasourceId
  if (dsId == null) {
    const dbName = cfg.database || cfg.cascade?.database || cfg.owner
    const dsAlias = cfg.datasourceAlias || cfg.cascade?.datasourceAlias
    let matched = dbName ? datasources.find((d) => d.database === dbName) : undefined
    if (!matched && dsAlias) {
      matched = datasources.find((d) => d.name === dsAlias || d.aliasName === dsAlias)
    }
    if (!matched && datasources.length === 1) {
      matched = datasources[0]
    }
    if (matched) dsId = matched.id
  }
  return {
    alias,
    datasourceId: dsId ?? null,
    table: parts[4],
    owner: parts[6] || undefined,
    tableSchema: parts[7] || undefined,
    fields: undefined,
    mode: cfg.mode
  }
}
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

interface EtlNode {
  id: string
  type: string
  config?: Record<string, any>
}

interface EtlEdge {
  source: string
  target: string
}

export interface LineageTable {
  datasource: string
  database: string
  table: string
  key: string
}

export interface TableFlow {
  source: LineageTable
  target: LineageTable
}

export interface TableLineage {
  flows: TableFlow[]
  sourceCount: number
  targetCount: number
  incompleteNodeCount: number
  hasSource: boolean
  hasSink: boolean
}

const nonEmpty = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value).trim()

function tableOf(node: EtlNode): LineageTable | null {
  const config = node.config || {}
  const cascade = config.cascade || {}
  const table = nonEmpty(cascade.table ?? config.table)
  if (!table) return null

  const datasourceId = nonEmpty(cascade.dsId ?? config.datasourceId)
  const datasource =
    nonEmpty(cascade.datasourceAlias ?? config.datasourceAlias) ||
    (datasourceId ? `#${datasourceId}` : '未命名数据源')
  const database = nonEmpty(cascade.database ?? config.database ?? config.owner)

  return {
    datasource,
    database,
    table,
    key: JSON.stringify([datasourceId || datasource, database, table])
  }
}

/**
 * Derive saved canvas lineage only. Never infer a relation from an unconnected
 * source/sink pair, or parse external tables from a custom SQL string.
 */
export function buildTableLineage(
  nodes: EtlNode[],
  edges: EtlEdge[]
): TableLineage {
  const byId = new Map(
    nodes.filter((node) => node?.id).map((node) => [node.id, node])
  )
  const incoming = new Map<string, string[]>()
  for (const edge of edges) {
    if (!byId.has(edge?.source) || !byId.has(edge?.target)) continue
    const parents = incoming.get(edge.target) || []
    parents.push(edge.source)
    incoming.set(edge.target, parents)
  }

  const sources = nodes.filter((node) => node.type === 'source')
  const sinks = nodes.filter((node) => node.type === 'sink')
  const incompleteNodeCount = [...sources, ...sinks].filter(
    (node) => !tableOf(node)
  ).length
  const flows = new Map<string, TableFlow>()

  for (const sink of sinks) {
    const target = tableOf(sink)
    if (!target) continue
    const visited = new Set<string>()
    const stack = [...(incoming.get(sink.id) || [])]
    while (stack.length > 0) {
      const id = stack.pop()!
      if (visited.has(id)) continue
      visited.add(id)
      const node = byId.get(id)
      if (!node) continue
      if (node.type === 'source') {
        const source = tableOf(node)
        if (source)
          flows.set(`${source.key}->${target.key}`, { source, target })
      } else {
        stack.push(...(incoming.get(id) || []))
      }
    }
  }

  const orderedFlows = [...flows.values()].sort((a, b) =>
    `${a.source.key}->${a.target.key}`.localeCompare(
      `${b.source.key}->${b.target.key}`
    )
  )
  return {
    flows: orderedFlows,
    sourceCount: new Set(orderedFlows.map((flow) => flow.source.key)).size,
    targetCount: new Set(orderedFlows.map((flow) => flow.target.key)).size,
    incompleteNodeCount,
    hasSource: sources.length > 0,
    hasSink: sinks.length > 0
  }
}

export function parseTableLineage(content: string): TableLineage {
  let parsed: any
  try {
    parsed = JSON.parse(content)
  } catch {
    // Older saved resources sometimes contain literal escaped line breaks.
    parsed = JSON.parse(
      content.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
    )
  }
  if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error('作业内容不是有效的 ETL 画布 JSON')
  }
  const nodes: EtlNode[] = parsed.nodes.filter(
    (node: unknown): node is EtlNode =>
      !!node &&
      typeof node === 'object' &&
      typeof (node as EtlNode).id === 'string' &&
      typeof (node as EtlNode).type === 'string'
  )
  const edges: EtlEdge[] = parsed.edges.filter(
    (edge: unknown): edge is EtlEdge =>
      !!edge &&
      typeof edge === 'object' &&
      typeof (edge as EtlEdge).source === 'string' &&
      typeof (edge as EtlEdge).target === 'string'
  )
  return buildTableLineage(nodes, edges)
}

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

// 节点配置完整性实时校验
//   返回 4 档状态: empty / partial / ready / error
//   - empty   : 节点拖到画布后未打开 drawer 配置
//   - partial : 打开过但缺必填字段
//   - ready   : 必填字段都有, 配置完整
//   - error   : 用户填了但校验不通过 (e.g. SQL 里有 SELECT *)

export type NodeStatus = 'empty' | 'partial' | 'ready' | 'error'

export interface NodeValidation {
  status: NodeStatus
  missing: string[]   // 缺哪些字段
  errors: string[]    // 哪些值不对
}

const isAlias = (s: any) => typeof s === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s.trim())

export function validateNodeConfig(type: string, cfg: any): NodeValidation {
  const missing: string[] = []
  const errors: string[] = []
  const c = cfg || {}

  switch (type) {
    case 'source': {
      if (!c.alias) missing.push('别名')
      else if (!isAlias(c.alias)) errors.push('别名必须是合法 SQL 标识符')
      // 表输入的级联配置保存在 cascade 中；同时兼容早期直接平铺字段的作业。
      const cascade = c.cascade || {}
      const hasCascade = c.cascade && typeof c.cascade === 'object'
      const datasourceId = hasCascade ? cascade.dsId : c.datasourceId
      const table = hasCascade ? cascade.table : c.table
      const selectedColumns = hasCascade ? cascade.columns : c.columns
      if (hasCascade && !cascade.dsType) missing.push('数据源类型')
      if ((datasourceId == null || datasourceId === '') && !c.host) {
        missing.push('数据源 (datasourceId 或 host/port/database)')
      }
      if (hasCascade && !cascade.database) missing.push('Schema / 数据库')
      if (!table) missing.push('表名')
      if (!Array.isArray(selectedColumns) || selectedColumns.length === 0) missing.push('字段')
      break
    }
    case 'sink': {
      if (!c.alias) missing.push('别名')
      else if (!isAlias(c.alias)) errors.push('别名必须是合法 SQL 标识符')
      if (!c.datasourceId) missing.push('目标数据源')
      if (!c.table) missing.push('目标表名')
      break
    }
    case 'transform': {
      if (!c.alias) missing.push('别名')
      else if (!isAlias(c.alias)) errors.push('别名必须是合法 SQL 标识符')
      const outputs = Array.isArray(c.outputs)
        ? c.outputs.filter((item: any) => item && item.enabled !== false)
        : []
      if (outputs.length === 0) missing.push('输出字段')
      const names = outputs.map((item: any) => String(item.name || '').trim()).filter(Boolean)
      if (names.length !== outputs.length) errors.push('输出字段必须填写名称')
      if (names.some((name: string) => !isAlias(name))) errors.push('输出字段名必须是合法 SQL 标识符')
      if (new Set(names).size !== names.length) errors.push('输出字段名重复')
      if (outputs.some((item: any) => !String(item.source || '').trim())) errors.push('输出字段必须选择来源')
      break
    }
    case 'filter': {
      if (!c.alias) missing.push('别名')
      else if (!isAlias(c.alias)) errors.push('别名必须是合法 SQL 标识符')
      break
    }
    case 'join': {
      if (!c.alias) missing.push('别名')
      if (!c.leftOn || !c.rightOn) missing.push('JOIN ON 字段')
      if (!c.joinType) missing.push('JOIN 类型')
      break
    }
    case 'compare': {
      if (!c.alias) missing.push('别名')
      const keys = Array.isArray(c.joinKeys) ? c.joinKeys : (c.key ? [{ srcCol: c.key, tgtCol: c.key }] : [])
      if (keys.length === 0) missing.push('JOIN ON 字段')
      const outputs = Array.isArray(c.columns) ? c.columns : []
      if (outputs.length === 0) missing.push('输出列')
      break
    }
    case 'sql': {
      if (!c.alias) missing.push('别名')
      else if (!isAlias(c.alias)) errors.push('别名必须是合法 SQL 标识符')
      const sql = (c.sql || '').trim()
      if (!sql) {
        missing.push('SQL')
      } else {
        if (/\bSELECT\s+\*/i.test(sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) {
          errors.push('禁止使用 SELECT *')
        }
        if (!/\bFROM\b/i.test(sql)) errors.push('SQL 必须包含 FROM 子句')
      }
      const outputs = Array.isArray(c.outputs) ? c.outputs : []
      if (outputs.length === 0) missing.push('输出列 (outputs)')
      // outputs 名字去重
      const names = outputs.map((o: any) => (o.name || '').trim()).filter(Boolean)
      if (new Set(names).size !== names.length) errors.push('输出字段名重复')
      break
    }
    case 'preview': {
      if (!c.alias) missing.push('别名')
      break
    }
    case 'cdc': {
      if (!c.alias) missing.push('别名')
      if (!c.table) missing.push('表名')
      break
    }
    default:
      break
  }

  let status: NodeStatus
  if (errors.length > 0) status = 'error'
  else if (missing.length === 0) status = 'ready'
  else status = 'partial'
  return { status, missing, errors }
}

export function computeNodeStatus(type: string, cfg: any): NodeStatus {
  return validateNodeConfig(type, cfg).status
}

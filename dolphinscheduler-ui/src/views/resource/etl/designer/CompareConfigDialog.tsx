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
import { defineComponent, ref, reactive, computed, watchEffect, PropType } from 'vue'
import {
  NDrawer, NDrawerContent, NButton, NSelect, NInput, NInputNumber, NSwitch,
  NRadioGroup, NRadioButton,
  NSpace, NCard, NTag, NEmpty, NDivider, NPopconfirm, useMessage
} from 'naive-ui'

// 数据比对节点配置对话框 (Compare Config Dialog)
//   用户可自定义:
//     - 哪个 upstream 是 SRC / 哪个是 TGT
//     - JOIN ON 用哪些字段配对 (srcCol, tgtCol,可多对)
//     - 输出哪些列、每列取 SRC/TGT/Both/None,可改别名
//     - 哪些列参与"修改"判定 (compare)
//     - 输出哪些差异行 (+/-/~/=)
//   SQL 预览实时生成

export interface CompareJoinKey {
  srcCol: string
  tgtCol: string
}

export interface CompareColumn {
  name: string          // 显示名 / 排序用 (默认 = srcField)
  srcField?: string     // SRC 取哪个字段(可空=不取 SRC)
  tgtField?: string     // TGT 取哪个字段(可空=不取 TGT)
  type?: string         // 类型
  alias?: string        // 输出列别名(默认 = name)
  enabled?: boolean     // 是否输出
  compare?: boolean     // 是否参与"修改"判定(差异判断)
}

export interface CompareConfig {
  alias?: string
  srcId?: string            // 上游节点id (SRC 角色)
  tgtId?: string            // 上游节点id (TGT 角色)
  // 新结构 (优先)
  joinKeys?: CompareJoinKey[]
  columns?: CompareColumn[]
  // 输出模式:
  //   'src'  = 只输出 SRC 列(差异行 TGT 缺失显示 NULL · 推荐 · 默认)
  //   'both' = 同时输出 SRC + TGT 两份(s_xxx / t_xxx)
  outputMode?: 'src' | 'both'
  // 兼容旧结构
  key?: string
  // 输出配置
  output?: {
    added?: boolean
    deleted?: boolean
    changed?: boolean
    unchanged?: boolean
    addedSymbol?: string
    deletedSymbol?: string
    changedSymbol?: string
    unchangedSymbol?: string
  }
}

interface UpstreamOption {
  id: string
  alias: string
  fields: Array<{ name: string; type: string }>
}

export default defineComponent({
  name: 'CompareConfigDialog',
  props: {
    visible: { type: Boolean, default: false },
    nodeId: { type: String, default: '' },
    nodeLabel: { type: String, default: '' },
    nodeConfig: { type: Object as PropType<CompareConfig>, default: () => ({}) },
    upstreams: { type: Array as PropType<UpstreamOption[]>, default: () => [] }
  },
  emits: ['update:visible', 'save', 'delete', 'close'],
  setup(props, { emit }) {
    const message = useMessage()

    // 表单本地副本
    const form = reactive<CompareConfig>({
      alias: '',
      srcId: '',
      tgtId: '',
      joinKeys: [],
      columns: [],
      outputMode: 'src',  // 默认只输出 SRC
      output: {
        added: true,
        deleted: true,
        changed: true,
        unchanged: false,
        addedSymbol: '+',
        deletedSymbol: '-',
        changedSymbol: '~',
        unchangedSymbol: '='
      }
    })

    // src/tgt upstream (按 srcId/tgtId 找)
    const srcUp = computed(() => props.upstreams.find((u) => u.id === form.srcId) || props.upstreams[0])
    const tgtUp = computed(() => props.upstreams.find((u) => u.id === form.tgtId) || props.upstreams[1] || props.upstreams[0])

    // 上游字段(并集,带 type)
    const mergedFields = computed(() => {
      const m = new Map<string, { name: string; type: string; src: boolean; tgt: boolean }>()
      ;(srcUp.value?.fields || []).forEach((f) => {
        if (!f || !f.name) return
        const e = m.get(f.name) || { name: f.name, type: f.type || 'STRING', src: false, tgt: false }
        e.src = true
        e.type = e.type || f.type || 'STRING'
        m.set(f.name, e)
      })
      ;(tgtUp.value?.fields || []).forEach((f) => {
        if (!f || !f.name) return
        const e = m.get(f.name) || { name: f.name, type: f.type || 'STRING', src: false, tgt: false }
        e.tgt = true
        e.type = e.type || f.type || 'STRING'
        m.set(f.name, e)
      })
      return Array.from(m.values())
    })

    // 初始化 / 兼容旧结构
    watchEffect(() => {
      if (!props.visible) return
      const cfg = (props.nodeConfig || {}) as CompareConfig
      form.alias = (cfg.alias || 'compare1').toString()
      form.srcId = (cfg.srcId || props.upstreams[0]?.id || '').toString()
      form.tgtId = (cfg.tgtId || props.upstreams[1]?.id || props.upstreams[0]?.id || '').toString()
      form.outputMode = cfg.outputMode || 'src'  // 默认只输出 SRC
      form.output = {
        added: true,
        deleted: true,
        changed: true,
        unchanged: false,
        addedSymbol: '+',
        deletedSymbol: '-',
        changedSymbol: '~',
        unchangedSymbol: '=',
        ...(cfg.output || {})
      }

      // joinKeys: 优先读 joinKeys;旧 cfg.key 兼容
      if (Array.isArray(cfg.joinKeys) && cfg.joinKeys.length > 0) {
        form.joinKeys = cfg.joinKeys
          .map((k: any) => ({ srcCol: (k.srcCol || '').trim(), tgtCol: (k.tgtCol || '').trim() }))
          .filter((k: any) => k.srcCol || k.tgtCol)
      } else if (typeof cfg.key === 'string' && cfg.key.trim()) {
        // 旧 key='id' → 单 KEY 配对,src/tgt 同名
        const keys = cfg.key.split(',').map((k: string) => k.trim()).filter(Boolean)
        form.joinKeys = keys.map((k: string) => ({ srcCol: k, tgtCol: k }))
      } else {
        form.joinKeys = []
      }

      // columns: 优先新结构;旧 cfg.columns (CompareColumn[]) 转换
      if (Array.isArray(cfg.columns) && cfg.columns.length > 0) {
        form.columns = cfg.columns.map((c: any) => ({
          name: (c.name || c.srcField || '').toString(),
          srcField: (c.srcField || c.name || '').toString(),
          tgtField: (c.tgtField || c.name || '').toString(),
          type: c.type || 'STRING',
          alias: c.alias || c.name,
          enabled: c.enabled !== false,
          compare: c.compare !== false
        }))
      } else {
        // 自动从 mergedFields 生成默认 columns (SRC+TGT 都取,enabled+compare 都开)
        form.columns = mergedFields.value.map((f) => ({
          name: f.name,
          srcField: f.src ? f.name : '',
          tgtField: f.tgt ? f.name : '',
          type: f.type || 'STRING',
          alias: f.name,
          enabled: true,
          compare: true
        }))
      }
    })

    // ===== 操作函数 =====
    function swapSrcTgt() {
      const a = form.srcId
      form.srcId = form.tgtId
      form.tgtId = a
    }
    function setSrc(slot: 1 | 2) {
      const cur = slot === 1 ? props.upstreams[0] : props.upstreams[1]
      const other = slot === 1 ? props.upstreams[1] : props.upstreams[0]
      if (!cur || !other) return
      form.srcId = cur.id
      form.tgtId = other.id
    }
    function setTgt(slot: 1 | 2) { setSrc(slot === 1 ? 2 : 1) }

    function addJoinKey() {
      form.joinKeys = [...(form.joinKeys || []), { srcCol: '', tgtCol: '' }]
    }
    function removeJoinKey(idx: number) {
      form.joinKeys = (form.joinKeys || []).filter((_, i) => i !== idx)
    }
    function updateJoinKey(idx: number, side: 'srcCol' | 'tgtCol', val: string) {
      if (!form.joinKeys) return
      form.joinKeys[idx][side] = val
    }

    function addColumn() {
      // 默认取 SRC+TGT 同名字段
      const firstUnset = mergedFields.value.find((f) => !form.columns?.some((c) => c.name === f.name))
      const nf = firstUnset || { name: '', type: 'STRING' }
      form.columns = [...(form.columns || []), {
        name: nf.name || '',
        srcField: nf.name || '',
        tgtField: nf.name || '',
        type: nf.type || 'STRING',
        alias: nf.name || '',
        enabled: true,
        compare: true
      }]
    }
    function removeColumn(idx: number) {
      form.columns = (form.columns || []).filter((_, i) => i !== idx)
    }
    function updateColumn(idx: number, patch: Partial<CompareColumn>) {
      if (!form.columns) return
      form.columns[idx] = { ...form.columns[idx], ...patch }
      // srcField 改了,name 自动同步(避免孤儿列名)
      if (patch.srcField !== undefined && !form.columns[idx].name) {
        form.columns[idx].name = patch.srcField
      }
      if (patch.srcField !== undefined || patch.tgtField !== undefined) {
        const c = form.columns[idx]
        if (!c.alias || c.alias === c.name) {
          c.alias = c.srcField || c.tgtField || c.name
        }
        if (!c.name) c.name = c.srcField || c.tgtField || ''
      }
    }

    function toggleOutput(op: 'added' | 'deleted' | 'changed' | 'unchanged') {
      form.output = form.output || {}
      form.output[op] = !form.output[op]
    }

    type OutputOperation = 'added' | 'deleted' | 'changed' | 'unchanged'
    const outputSymbolDefaults: Record<OutputOperation, string> = {
      added: '+',
      deleted: '-',
      changed: '~',
      unchanged: '='
    }
    const outputOperations: OutputOperation[] = ['added', 'deleted', 'changed', 'unchanged']
    function outputSymbol(op: OutputOperation) {
      const value = (form.output as any)?.[`${op}Symbol`]
      return value === undefined ? outputSymbolDefaults[op] : value
    }
    function updateOutputSymbol(op: OutputOperation, value: string) {
      const symbol = value.replace(/\s/g, '').slice(0, 3)
      form.output = { ...(form.output || {}), [`${op}Symbol`]: symbol } as CompareConfig['output']
    }
    function outputEnabled(op: OutputOperation) {
      return op === 'unchanged' ? form.output?.unchanged === true : form.output?.[op] !== false
    }
    function sqlString(value: string) {
      return `'${value.replace(/'/g, "''")}'`
    }

    const duplicateOutputAliases = computed(() => {
      const counts = new Map<string, number>()
      for (const c of form.columns || []) {
        const alias = (c.alias || c.name || '').trim()
        if (c.enabled !== false && alias) counts.set(alias, (counts.get(alias) || 0) + 1)
      }
      return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([alias]) => alias)
    })
    const invalidOutputSymbols = computed(() =>
      outputOperations.filter((op) => !outputSymbol(op).trim())
    )

    function onClose() {
      emit('update:visible', false)
      emit('close')
    }
    function onSave() {
      // 校验
      const alias = (form.alias || '').trim()
      if (!alias) { message.error('请填写节点别名'); return }
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(alias)) {
        message.error('别名只能包含字母/数字/下划线，且首位必须是字母'); return
      }
      if (props.upstreams.length < 2) { message.error('请连入 2 个上游节点'); return }
      if (!form.srcId || !form.tgtId) { message.error('请指定 SRC / TGT 角色'); return }
      if (invalidOutputSymbols.value.length > 0) {
        message.error('差异符号不能为空'); return
      }
      const keys = (form.joinKeys || []).filter((k) => k.srcCol || k.tgtCol)
      if (keys.length === 0) { message.error('请至少添加 1 个 JOIN KEY 配对'); return }
      // 校验 KEY 字段必须在对应上游存在
      for (const k of keys) {
        if (!k.srcCol) { message.error(`JOIN KEY: SRC 字段未指定`); return }
        if (!k.tgtCol) { message.error(`JOIN KEY: TGT 字段未指定`); return }
      }
      // 清理 columns:去掉完全没用的
      const cleanedColumns = (form.columns || []).filter((c) =>
        c.srcField || c.tgtField
      )
      if (duplicateOutputAliases.value.length > 0) {
        message.error(`输出列名重复：${duplicateOutputAliases.value.join('、')}`)
        return
      }
      emit('save', JSON.parse(JSON.stringify({
        alias,
        srcId: form.srcId,
        tgtId: form.tgtId,
        joinKeys: keys,
        columns: cleanedColumns,
        outputMode: form.outputMode || 'src',
        output: form.output
      })))
      onClose()
    }

    // ===== 计算:校验错误 =====
    const errorCount = computed(() => {
      let n = 0
      if (props.upstreams.length < 2) n++
      if (!form.alias?.trim()) n++
      const keys = (form.joinKeys || []).filter((k) => k.srcCol || k.tgtCol)
      if (keys.length === 0) n++
      // KEY 字段必须在对应上游存在
      const srcFieldNames = new Set((srcUp.value?.fields || []).map((f) => f.name))
      const tgtFieldNames = new Set((tgtUp.value?.fields || []).map((f) => f.name))
      for (const k of keys) {
        if (!k.srcCol || !srcFieldNames.has(k.srcCol)) n++
        if (!k.tgtCol || !tgtFieldNames.has(k.tgtCol)) n++
      }
      n += duplicateOutputAliases.value.length
      n += invalidOutputSymbols.value.length
      return n
    })

    // ===== 实时 SQL 预览 =====
    const previewSql = computed(() => {
      if (props.upstreams.length < 2) return '-- 请先连入 2 个上游节点'
      const srcAlias = srcUp.value?.alias || 'src'
      const tgtAlias = tgtUp.value?.alias || 'tgt'
      const alias = (form.alias || 'compare_out').trim()
      const keys = (form.joinKeys || []).filter((k) => k.srcCol && k.tgtCol)
      if (keys.length === 0) return '-- 请配置至少 1 个 JOIN KEY 配对'

      // 输出列:enabled=true 且 srcField 或 tgtField 非空
      const outs = (form.columns || []).filter((c) =>
        c.enabled && (c.srcField || c.tgtField)
      )
      // 参与"修改"判定的列 (compare=true)
      const diffCols = (form.columns || []).filter((c) =>
        c.compare !== false && c.srcField && c.tgtField
      )

      // SELECT 列片段
      //   outputMode='src'  (默认): 只输出 SRC 一份,列别名直接用 alias
      //                          对差异行,TGT 没有的值显示为 NULL(SRC 实际有 → CMPOP=+, TGT 没有 → SRC=NULL)
      //   outputMode='both': 输出两份 s_<alias> / t_<alias>
      const colParts: string[] = []
      const mode = form.outputMode || 'src'
      for (const c of outs) {
        const outAlias = (c.alias || c.name || c.srcField || c.tgtField || '').trim()
        if (!outAlias) continue
        if (mode === 'src') {
          // 只输出 SRC:FULL OUTER JOIN 下,新增行 SRC=null,删除行 SRC 有值
          if (c.srcField) colParts.push(`${srcAlias}.${c.srcField} AS ${outAlias}`)
        } else {
          // both:s_xxx / t_xxx 双份
          if (c.srcField) colParts.push(`${srcAlias}.${c.srcField} AS s_${outAlias}`)
          if (c.tgtField) colParts.push(`${tgtAlias}.${c.tgtField} AS t_${outAlias}`)
        }
      }
      // 'src' 模式下,如果一列 SRC 没字段但 TGT 有(只对 TGT 关注),也补一个 TGT (alias 相同)
      if (mode === 'src') {
        for (const c of outs) {
          const outAlias = (c.alias || c.name || c.srcField || c.tgtField || '').trim()
          if (!outAlias) continue
          if (!c.srcField && c.tgtField) {
            colParts.push(`${tgtAlias}.${c.tgtField} AS ${outAlias}`)
          }
        }
      }

      // cmp_op CASE WHEN
      const srcKeyChecks = keys.map((k) => `${srcAlias}.${k.srcCol} IS NULL`).join(' OR ')
      const tgtKeyChecks = keys.map((k) => `${tgtAlias}.${k.tgtCol} IS NULL`).join(' AND ')
      let caseExpr = `WHEN ${srcKeyChecks} THEN ${sqlString(outputSymbol('added'))}\n`
      caseExpr += `    WHEN ${tgtKeyChecks} THEN ${sqlString(outputSymbol('deleted'))}\n`
      if (diffCols.length > 0) {
        const diffExpr = diffCols.map((c) => {
          const a = `${srcAlias}.${c.srcField}`
          const b = `${tgtAlias}.${c.tgtField}`
          return `(${a} <> ${b} OR (${a} IS NULL) <> (${b} IS NULL))`
        }).join('\n      OR ')
        caseExpr += `    WHEN ${diffExpr} THEN ${sqlString(outputSymbol('changed'))}\n`
      }
      caseExpr += `    ELSE ${sqlString(outputSymbol('unchanged'))}`

      // cmp_id 表达式
      const keySelect = keys.length === 1
        ? `COALESCE(${srcAlias}.${keys[0].srcCol}, ${tgtAlias}.${keys[0].tgtCol}) AS cmp_id`
        : `CONCAT_WS('|', ${keys.map((k) => `COALESCE(${srcAlias}.${k.srcCol}, '')`).join(', ')}) AS cmp_id`

      // ON 表达式
      const onExpr = keys.map((k) => `${srcAlias}.${k.srcCol} = ${tgtAlias}.${k.tgtCol}`).join('\n  AND ')

      // 输出过滤
      const out = form.output || {}
      const opFilters: string[] = []
      if (out.added !== false) opFilters.push(sqlString(outputSymbol('added')))
      if (out.deleted !== false) opFilters.push(sqlString(outputSymbol('deleted')))
      if (out.changed !== false) opFilters.push(sqlString(outputSymbol('changed')))
      if (out.unchanged === true) opFilters.push(sqlString(outputSymbol('unchanged')))

      const colsSelect = colParts.length > 0 ? colParts.join(',\n  ') : `${srcAlias}.*, ${tgtAlias}.*`

      const inner = `SELECT\n  CASE\n    ${caseExpr}\n  END AS cmp_op,\n  ${keySelect},\n  ${colsSelect}\nFROM ${srcAlias} FULL OUTER JOIN ${tgtAlias}\n  ON ${onExpr}`
      const outerWhere = opFilters.length > 0
        ? `WHERE ${alias}.cmp_op IN (${opFilters.join(', ')})`
        : ''
      return `SELECT * FROM (\n${inner}\n) AS ${alias}\n${outerWhere}`
    })

    // select 选项
    const srcFieldOptions = computed(() => [
      ...(srcUp.value?.fields || []).map((f) => ({
        label: `${f.name} (${f.type || 'STRING'})`,
        value: f.name
      }))
    ])
    const tgtFieldOptions = computed(() => [
      ...(tgtUp.value?.fields || []).map((f) => ({
        label: `${f.name} (${f.type || 'STRING'})`,
        value: f.name
      }))
    ])

    // 一些快捷按钮
    function autoFillFromFields() {
      // 用 mergedFields 全量重建 columns
      form.columns = mergedFields.value.map((f) => ({
        name: f.name,
        srcField: f.src ? f.name : '',
        tgtField: f.tgt ? f.name : '',
        type: f.type || 'STRING',
        alias: f.name,
        enabled: true,
        compare: true
      }))
      message.success('已用上游字段全量填充')
    }
    function outputOnlyDiff() {
      // 默认 SRC+TGT 都有 = enabled=true;只参与比对的关闭 compare
      form.columns = (form.columns || []).map((c) => ({ ...c }))
    }
    function selectAllCompare() {
      for (const c of form.columns || []) c.compare = true
    }
    function clearAllCompare() {
      for (const c of form.columns || []) c.compare = false
    }

    return () => (
      <NDrawer
        show={props.visible}
        width={760}
        placement='right'
        onUpdateShow={(v: boolean) => emit('update:visible', v)}
      >
        <NDrawerContent title={`数据比对 · ${form.alias || '未命名'}`} closable>
          <CcdStyles />

          <div class="ccd-drawer">
            {/* 01. 基本配置 */}
            <div class="ccd-section">
              <div class="ccd-section-num">01</div>
              <div class="ccd-section-title">基本信息</div>
              <div class="ccd-basic-row">
                <label class="ccd-basic-label">节点名称(别名) <span>*</span></label>
                <div class="ccd-field-input">
                  <input
                    value={form.alias}
                    onInput={(e: any) => (form.alias = e.target.value)}
                    placeholder="例如 compare1"
                  />
                </div>
              </div>
              <div class="ccd-basic-row">
                <span class="ccd-basic-label">类型</span>
                <span class="ccd-type-tag">compare</span>
              </div>
            </div>

            {/* 上游表与角色 */}
            <div class="ccd-upstream">
              <div class="ccd-up-card">
                <div class="ccd-up-role">
                  <button
                    class={`up-role-btn ${form.srcId === props.upstreams[0]?.id ? 'active src' : ''}`}
                    onClick={() => setSrc(1)}
                  >SRC</button>
                  <button
                    class={`up-role-btn ${form.tgtId === props.upstreams[0]?.id ? 'active tgt' : ''}`}
                    onClick={() => setTgt(1)}
                  >TGT</button>
                </div>
                <span class="ccd-up-alias">{props.upstreams[0]?.alias || '?'}</span>
                <span class="ccd-up-fields">{props.upstreams[0]?.fields?.length || 0} 字段</span>
              </div>
              <button class="ccd-swap" onClick={swapSrcTgt} title="交换源/目标">⇄</button>
              <div class="ccd-up-card">
                <div class="ccd-up-role">
                  <button
                    class={`up-role-btn ${form.srcId === props.upstreams[1]?.id ? 'active src' : ''}`}
                    onClick={() => setSrc(2)}
                  >SRC</button>
                  <button
                    class={`up-role-btn ${form.tgtId === props.upstreams[1]?.id ? 'active tgt' : ''}`}
                    onClick={() => setTgt(2)}
                  >TGT</button>
                </div>
                <span class="ccd-up-alias">{props.upstreams[1]?.alias || '?'}</span>
                <span class="ccd-up-fields">{props.upstreams[1]?.fields?.length || 0} 字段</span>
              </div>
            </div>

            {/* 02. JOIN ON 配对 */}
            <div class="ccd-section">
              <div class="ccd-section-num">02</div>
              <div class="ccd-section-title">JOIN ON 字段配对</div>
              <div class="ccd-section-hint">
                决定两表用什么字段关联 · 支持多 KEY 配对 · 同名字段可直接用 ↑ 快捷复制
              </div>

              <div class="ccd-key-table">
                <div class="ccd-key-row ccd-key-header">
                  <span class="c-idx">#</span>
                  <span class="c-src">SRC.{srcUp.value?.alias}</span>
                  <span class="c-arrow">=</span>
                  <span class="c-tgt">TGT.{tgtUp.value?.alias}</span>
                  <span class="c-op"></span>
                </div>
                {(form.joinKeys || []).map((k, idx) => {
                  const srcMissing = k.srcCol && !srcUp.value?.fields?.some((f) => f.name === k.srcCol)
                  const tgtMissing = k.tgtCol && !tgtUp.value?.fields?.some((f) => f.name === k.tgtCol)
                  return (
                    <div key={'jk_' + idx} class="ccd-key-row">
                      <span class="c-idx">{idx + 1}</span>
                      <span class="c-src">
                        <NSelect
                          value={k.srcCol || null}
                          options={srcFieldOptions.value}
                          placeholder="选 SRC 字段"
                          filterable
                          clearable
                          size='small'
                          onUpdate:value={(v: string) => updateJoinKey(idx, 'srcCol', v)}
                        />
                        {srcMissing && (
                          <span class="ccd-mini-warn">⚠ 已失效</span>
                        )}
                      </span>
                      <span class="c-arrow">=</span>
                      <span class="c-tgt">
                        <NSelect
                          value={k.tgtCol || null}
                          options={tgtFieldOptions.value}
                          placeholder="选 TGT 字段"
                          filterable
                          clearable
                          size='small'
                          onUpdate:value={(v: string) => updateJoinKey(idx, 'tgtCol', v)}
                        />
                        {tgtMissing && (
                          <span class="ccd-mini-warn">⚠ 已失效</span>
                        )}
                      </span>
                      <span class="c-op">
                        <button
                          class="ccd-icon-btn"
                          title="把 SRC 字段名同步到 TGT(同名字段快捷)"
                          onClick={() => updateJoinKey(idx, 'tgtCol', k.srcCol)}
                        >↑</button>
                        <button
                          class="ccd-icon-btn danger"
                          title="删除这一对"
                          onClick={() => removeJoinKey(idx)}
                        >×</button>
                      </span>
                    </div>
                  )
                })}
                <button class="ccd-add-row" onClick={addJoinKey}>+ 添加 JOIN KEY 配对</button>
              </div>
            </div>

            {/* 03. 输出列 (可编辑) */}
            <div class="ccd-section">
              <div class="ccd-section-num">03</div>
              <div class="ccd-section-title">输出列（可编辑）</div>
              <div class="ccd-section-hint">
                输出别名决定下游字段名 · 选择 SRC/TGT 来源 · “比对”开关决定是否参与修改判定
              </div>

              {/* 输出模式切换 */}
              <div class="ccd-output-mode">
                <span class="ccd-mode-label">输出模式</span>
                <NRadioGroup
                  value={form.outputMode || 'src'}
                  onUpdate:value={(v: string) => (form.outputMode = v as any)}
                  size='small'
                >
                  <NRadioButton value='src'>
                    只输出 SRC<span class="ccd-mode-hint">· 推荐 · 差异行 TGT 缺失显示 NULL</span>
                  </NRadioButton>
                  <NRadioButton value='both'>
                    同时输出 SRC + TGT<span class="ccd-mode-hint">· s_xxx / t_xxx 双份</span>
                  </NRadioButton>
                </NRadioGroup>
              </div>

              {(!form.columns || form.columns.length === 0) ? (
                <NEmpty size='small' description='暂无列 · 点下方按钮添加' />
              ) : (
                <div class="ccd-col-table">
                  <div class="ccd-col-row ccd-col-header">
                    <span class="c-name">输出别名</span>
                    <span class="c-src">SRC 字段</span>
                    <span class="c-tgt">TGT 字段</span>
                    <span class="c-out">输出</span>
                    <span class="c-cmp">比对</span>
                    <span class="c-op"></span>
                  </div>
                  {form.columns.map((c, idx) => (
                    <div key={'col_' + idx} class={`ccd-col-row ${!c.enabled ? 'disabled' : ''} ${duplicateOutputAliases.value.includes(c.alias || c.name || '') ? 'duplicate' : ''}`}>
                      <span class="c-name">
                        <NInput
                          value={c.alias || ''}
                          placeholder='输出列名'
                          size='small'
                          onUpdate:value={(v: string) => updateColumn(idx, { alias: v, name: v })}
                        />
                      </span>
                      <span class="c-src">
                        <NSelect
                          value={c.srcField || null}
                          options={srcFieldOptions.value}
                          placeholder='— 不取 —'
                          filterable
                          clearable
                          size='small'
                          onUpdate:value={(v: string) => updateColumn(idx, { srcField: v || '' })}
                        />
                      </span>
                      <span class="c-tgt">
                        <NSelect
                          value={c.tgtField || null}
                          options={tgtFieldOptions.value}
                          placeholder='— 不取 —'
                          filterable
                          clearable
                          size='small'
                          onUpdate:value={(v: string) => updateColumn(idx, { tgtField: v || '' })}
                        />
                      </span>
                      <span class="c-out">
                        <NSwitch
                          value={c.enabled !== false}
                          size='small'
                          onUpdate:value={(v: boolean) => updateColumn(idx, { enabled: v })}
                        />
                      </span>
                      <span class="c-cmp">
                        <NSwitch
                          value={c.compare !== false}
                          size='small'
                          disabled={!c.srcField || !c.tgtField}
                          onUpdate:value={(v: boolean) => updateColumn(idx, { compare: v })}
                        />
                      </span>
                      <span class="c-op">
                        <button
                          class="ccd-icon-btn danger"
                          title="删除这一列"
                          onClick={() => removeColumn(idx)}
                        >×</button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {duplicateOutputAliases.value.length > 0 && (
                <div class="ccd-inline-error">输出别名重复：{duplicateOutputAliases.value.join('、')}，请修改后再保存</div>
              )}

              <div class="ccd-col-actions">
                <button class="ccd-action-link" onClick={addColumn}>+ 添加列</button>
                <button class="ccd-action-link" onClick={autoFillFromFields}>↑ 用上游字段全量填充</button>
                <span class="ccd-divider-v"></span>
                <button class="ccd-action-link" onClick={selectAllCompare}>全选比对</button>
                <button class="ccd-action-link muted" onClick={clearAllCompare}>清空比对</button>
                <span class="ccd-col-count">
                  {(form.columns || []).filter((c) => c.enabled).length} / {(form.columns || []).length} 输出 ·{' '}
                  {(form.columns || []).filter((c) => c.compare !== false && c.srcField && c.tgtField).length} 参与比对
                </span>
              </div>
            </div>

            {/* 04. 输出哪些差异行 */}
            <div class="ccd-section">
              <div class="ccd-section-num">04</div>
              <div class="ccd-section-title">输出哪些差异行</div>
              <div class="ccd-section-hint">选择要输出的差异类型，并为每种类型设置 cmp_op 符号</div>

              <div class="ccd-toggle-grid">
                {([
                  ['added', '新增', 'TGT 存在，SRC 无'],
                  ['deleted', '删除', 'SRC 存在，TGT 无'],
                  ['changed', '修改', '两侧内容不一致'],
                  ['unchanged', '一致', '两侧内容完全相同']
                ] as Array<[OutputOperation, string, string]>).map(([op, label, hint]) => (
                  <div
                    key={op}
                    class={`ccd-toggle ${outputEnabled(op) ? 'on' : ''}`}
                    onClick={() => toggleOutput(op)}
                  >
                    <input
                      class="ccd-toggle-symbol"
                      value={outputSymbol(op)}
                      aria-label={`${label}符号`}
                      maxLength={3}
                      onClick={(e: Event) => e.stopPropagation()}
                      onInput={(e: any) => updateOutputSymbol(op, e.target.value)}
                    />
                    <div class="ccd-toggle-text">
                      <div class="zh">{label}</div>
                      <div class="en">{hint}</div>
                    </div>
                    <div class="ccd-toggle-switch"></div>
                  </div>
                ))}
              </div>
              {invalidOutputSymbols.value.length > 0 && (
                <div class="ccd-inline-error">差异符号不能为空，请为每种差异类型填写符号</div>
              )}
            </div>

            {/* 05. SQL 预览 */}
            <div class="ccd-section">
              <div class="ccd-section-num">05</div>
              <div class="ccd-section-title">SQL 预览</div>
              <div class="ccd-section-hint">下游预览节点将作为子查询消费此结果</div>
              <pre class="ccd-preview-block">
                <span class="ccd-preview-label">LIVE</span>
                {previewSql.value}
              </pre>
            </div>

            {/* FOOTER */}
            <div class="ccd-footer">
              <div class="ccd-footer-actions">
                <div class="ccd-footer-actions-right">
                  <button class="ccd-btn" onClick={onClose}>取消</button>
                  <button class="ccd-btn primary" onClick={onSave} disabled={errorCount.value > 0}>
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </NDrawerContent>
      </NDrawer>
    )
  }
})

// CSS 注入
const _StyleSentinel = null
function CcdStyles() {
  return <style>{CcdStylesText}</style>
}

const CcdStylesText = `
.ccd-drawer {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #FFFFFF;
  color: #1C1917;
  position: relative;
  background-image:
    radial-gradient(circle at 100% 0%, rgba(249, 115, 22, 0.025), transparent 35%),
    radial-gradient(circle at 0% 100%, rgba(13, 148, 136, 0.018), transparent 35%);
}
.ccd-header {
  padding: 16px 24px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #E7E5E0;
}
.ccd-header-left { display: flex; align-items: center; gap: 12px; }
.ccd-node-chip {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
  display: grid;
  place-items: center;
  color: white;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(249, 115, 22, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.ccd-header-title {
  font-size: 14px;
  font-weight: 600;
  color: #1C1917;
  letter-spacing: -0.01em;
}
.ccd-header-sub {
  font-size: 11px;
  color: #A8A29E;
  margin-top: 2px;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
}
.ccd-header-right { display: flex; align-items: center; gap: 12px; }
.ccd-status-tag {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 3px;
  background: #CCFBF1;
  color: #0F766E;
  font-weight: 600;
}
.ccd-status-tag.bad { background: #FEE2E2; color: #B91C1C; }

.ccd-upstream {
  padding: 12px 24px;
  background: #FAFAF9;
  border-bottom: 1px solid #E7E5E0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.ccd-up-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #FFFFFF;
  border: 1px solid #E7E5E0;
  border-radius: 6px;
}
.ccd-up-role {
  display: inline-flex;
  background: #F5F5F4;
  border-radius: 3px;
  padding: 1px;
  border: 1px solid #E7E5E0;
}
.up-role-btn {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 9px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 2px;
  border: none;
  background: transparent;
  color: #A8A29E;
  cursor: pointer;
}
.up-role-btn.active.src { background: #DBEAFE; color: #1D4ED8; }
.up-role-btn.active.tgt { background: #EDE9FE; color: #7C3AED; }
.ccd-up-alias {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  font-weight: 600;
  flex: 1;
}
.ccd-up-fields {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #A8A29E;
}
.ccd-swap {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 1.5px solid #F97316;
  color: #C2410C;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
}
.ccd-swap:hover { background: #FFEDD5; transform: rotate(180deg); }

.ccd-section {
  margin: 0 14px 16px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.ccd-section-num {
  display: none;
}
.ccd-section-title {
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 20px;
}
.ccd-section-hint {
  margin: 2px 0 12px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 18px;
}

.ccd-identity-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  max-width: 320px;
}
.ccd-field-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #d9e2ef;
  border-radius: 6px;
  padding: 0 10px;
  transition: all 0.15s;
}
.ccd-field-input:focus-within {
  border-color: #288fff;
  box-shadow: 0 0 0 2px rgba(40, 143, 255, 0.12);
  background: #fff;
}
.ccd-field-input.error { border-color: #B91C1C; background: #FEF2F2; }
.ccd-field-icon {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  color: #A8A29E;
  font-size: 11px;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
}
.ccd-field-input input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 13px;
  color: #1C1917;
  outline: none;
}
.ccd-valid {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #0D9488;
  color: white;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: bold;
}
.ccd-valid.bad { background: #B91C1C; }

/* 基本信息统一为标签与内容同行、节点类型单独一行 */
.ccd-basic-row {
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr);
  column-gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}
.ccd-basic-label {
  color: #475569;
  font-size: 13px;
  line-height: 18px;
}
.ccd-basic-label span { color: #ef4444; }
.ccd-basic-row .ccd-field-input {
  max-width: none;
  min-width: 0;
}
.ccd-type-tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 26px;
  padding: 3px 10px;
  border: 1px solid #93c5fd;
  border-radius: 4px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 12px;
  line-height: 18px;
}

/* JOIN KEY 表格 */
.ccd-key-table {
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  overflow: hidden;
  background: #FFFFFF;
}
.ccd-key-row {
  display: grid;
  grid-template-columns: 30px 1fr 24px 1fr 80px;
  gap: 8px;
  padding: 8px 10px;
  align-items: center;
  border-bottom: 1px solid #E7E5E0;
}
.ccd-key-row:last-of-type { border-bottom: none; }
.ccd-key-header {
  background: #F5F5F4;
  font-size: 10px;
  font-weight: 600;
  color: #57534E;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.ccd-key-header .c-src { color: #1D4ED8; }
.ccd-key-header .c-tgt { color: #7C3AED; }
.ccd-key-row .c-idx {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 11px;
  color: #A8A29E;
  text-align: center;
}
.ccd-key-row .c-arrow {
  text-align: center;
  color: #D6D3CD;
  font-size: 14px;
  font-weight: 700;
}
.ccd-key-row .c-op {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}
.ccd-mini-warn {
  font-size: 10px;
  color: #B91C1C;
  font-family: 'SF Mono', Menlo, monospace;
  margin-left: 4px;
}
.ccd-icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: #FAFAF9;
  border: 1px solid #E7E5E0;
  color: #57534E;
  cursor: pointer;
  font-size: 13px;
  display: grid;
  place-items: center;
}
.ccd-icon-btn:hover { background: #EFEEEC; }
.ccd-icon-btn.danger:hover { background: #FEE2E2; color: #B91C1C; border-color: #FCA5A5; }
.ccd-add-row {
  display: block;
  width: 100%;
  background: #FAFAF9;
  border: none;
  border-top: 1px dashed #E7E5E0;
  padding: 10px;
  color: #0D9488;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.ccd-add-row:hover { background: #F0FDFA; color: #0F766E; }

/* 输出列表格 */
.ccd-col-table {
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  overflow: hidden;
  background: #FFFFFF;
}

/* 输出模式切换 */
.ccd-output-mode {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(90deg, rgba(13, 148, 136, 0.04), rgba(13, 148, 136, 0.01));
  border: 1px solid rgba(13, 148, 136, 0.18);
  border-radius: 6px;
  margin-bottom: 12px;
}
.ccd-mode-label {
  font-size: 11px;
  color: #57534E;
  font-weight: 600;
  flex-shrink: 0;
}
.ccd-mode-hint {
  margin-left: 4px;
  font-size: 10px;
  color: #A8A29E;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-weight: 400;
}
.ccd-col-row {
  display: grid;
  grid-template-columns: 130px 1fr 1fr 60px 60px 36px;
  gap: 8px;
  padding: 8px 10px;
  align-items: center;
  border-bottom: 1px solid #E7E5E0;
}
.ccd-col-row:last-of-type { border-bottom: none; }
.ccd-col-header {
  background: #F5F5F4;
  font-size: 10px;
  font-weight: 600;
  color: #57534E;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.ccd-col-row.disabled { background: #FAFAF9; }
.ccd-col-row.disabled .c-name { opacity: 0.5; }
.ccd-col-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.ccd-action-link {
  font-size: 11px;
  color: #0D9488;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-weight: 500;
}
.ccd-action-link:hover { background: #CCFBF1; }
.ccd-action-link.muted { color: #A8A29E; }
.ccd-action-link.muted:hover { background: #F5F5F4; color: #57534E; }
.ccd-divider-v {
  width: 1px;
  height: 12px;
  background: #E7E5E0;
  margin: 0 4px;
}
.ccd-col-count {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #A8A29E;
  padding: 2px 6px;
  background: #F5F5F4;
  border-radius: 3px;
  margin-left: auto;
}

.ccd-toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ccd-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #FAFAF9;
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  cursor: pointer;
}
.ccd-toggle.on {
  background: #FFFFFF;
  border-color: #D6D3CD;
}
.ccd-toggle-icon {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  color: white;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.ccd-toggle-icon.add { background: #16A34A; }
.ccd-toggle-icon.del { background: #DC2626; }
.ccd-toggle-icon.mod { background: #F59E0B; }
.ccd-toggle-icon.same { background: #94A3B8; }
.ccd-toggle-text { flex: 1; }
.ccd-toggle-text .zh {
  font-size: 12px;
  font-weight: 600;
  color: #1C1917;
}
.ccd-toggle-text .en {
  font-size: 10px;
  color: #A8A29E;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  margin-top: 2px;
}
.ccd-toggle-switch {
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: #D6D3CD;
  position: relative;
  flex-shrink: 0;
}
.ccd-toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  transition: transform 0.15s;
}
.ccd-toggle.on .ccd-toggle-switch { background: #0D9488; }
.ccd-toggle.on .ccd-toggle-switch::after { transform: translate(12px); }

.ccd-preview-block {
  background: #1A1A1A;
  border-radius: 6px;
  padding: 12px 14px;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 11.5px;
  line-height: 1.6;
  color: #E5E5E5;
  overflow-x: auto;
  position: relative;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
.ccd-preview-label {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.ccd-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #FAFAF9;
  border-top: 1px solid #E7E5E0;
}
.ccd-footer-meta {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10.5px;
  color: #A8A29E;
}
.ccd-footer-meta .ok { color: #0D9488; }
.ccd-footer-meta .bad { color: #B91C1C; }
.ccd-footer-actions { display: flex; justify-content: space-between; gap: 8px; width: 100%; }
.ccd-footer-actions-right { display: flex; gap: 8px; }
.ccd-btn {
  padding: 7px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #D6D3CD;
  background: #FFFFFF;
  color: #57534E;
  cursor: pointer;
}
.ccd-btn:hover { background: #F5F5F4; }
.ccd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ccd-btn.primary {
  background: #1C1917;
  color: #FFFFFF;
  border-color: #1C1917;
}
.ccd-btn.primary:hover { background: #000; }
.ccd-btn.danger {
  color: #B91C1C;
  border-color: #FCA5A5;
  background: #FFFFFF;
}
.ccd-btn.danger:hover {
  background: #FEF2F2;
  border-color: #DC2626;
  color: #991B1B;
}

/* 与其它节点抽屉保持一致：浅色画布、白色卡片、紧凑间距。 */
.ccd-drawer {
  padding: 0 16px 20px;
  background: #f7f8fa;
  background-image: none;
}
.ccd-header {
  padding: 0 0 12px;
  border-bottom: 0;
}
.ccd-node-chip,
.ccd-header-title {
  display: none;
}
.ccd-header-left {
  min-width: 0;
}
.ccd-header-sub {
  margin-top: 0;
  color: #64748b;
  font-size: 12px;
  font-family: inherit;
}
.ccd-header-right {
  gap: 8px;
}
.ccd-status-tag {
  border: 1px solid #99f6e4;
  border-radius: 4px;
  background: #f0fdfa;
  color: #0f766e;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
}
.ccd-status-tag.bad {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}
.ccd-upstream {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px minmax(0, 1fr);
  gap: 8px;
  margin: 0 0 16px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.ccd-up-card {
  min-width: 0;
  padding: 8px 10px;
  border-color: #e5e7eb;
  background: #f8fafc;
}
.ccd-up-alias,
.ccd-up-fields {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ccd-swap {
  align-self: center;
  justify-self: center;
  width: 28px;
  height: 28px;
  border-color: #cbd5e1;
  color: #2563eb;
  background: #fff;
}
.ccd-swap:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}
.ccd-section {
  margin: 0 0 16px;
  padding: 14px;
  border-color: #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.ccd-section-title {
  margin-bottom: 2px;
}
.ccd-section-hint {
  margin: 0 0 10px;
  color: #64748b;
}
.ccd-key-row,
.ccd-col-row {
  padding: 7px 8px;
  gap: 6px;
}
.ccd-key-row {
  grid-template-columns: 24px minmax(0, 1fr) 20px minmax(0, 1fr) 58px;
}
.ccd-col-row {
  grid-template-columns: 110px minmax(0, 1fr) minmax(0, 1fr) 48px 48px 28px;
}
.ccd-key-table,
.ccd-col-table {
  border-color: #e2e8f0;
}
.ccd-key-header,
.ccd-col-header {
  background: #f8fafc;
  color: #475569;
}
.ccd-output-mode {
  padding: 8px 10px;
  margin-bottom: 10px;
  border-color: #dbeafe;
  background: #f8fbff;
}
.ccd-mode-hint {
  display: none;
}
.ccd-toggle-grid {
  gap: 8px;
}
.ccd-toggle {
  padding: 8px 10px;
  gap: 8px;
}
.ccd-toggle-icon {
  width: 24px;
  height: 24px;
}
.ccd-toggle-text .en {
  color: #94a3b8;
}
.ccd-footer {
  margin: 0;
  padding: 0;
  border-top: 0;
  background: transparent;
}
.ccd-footer-actions {
  align-items: center;
  justify-content: flex-end;
}
.ccd-footer-meta {
  color: #64748b;
}
.ccd-btn {
  border-radius: 6px;
}
.ccd-btn.primary {
  background: #2080f0;
  border-color: #2080f0;
}
.ccd-btn.primary:hover {
  background: #4098f7;
  border-color: #4098f7;
}
.ccd-key-table .n-base-selection-label,
.ccd-col-table .n-base-selection-label,
.ccd-col-table .n-input__input {
  font-size: 12px !important;
}
.ccd-key-table .n-base-selection,
.ccd-col-table .n-base-selection {
  min-height: 30px;
}
.ccd-key-row,
.ccd-col-row {
  font-size: 12px;
}
.ccd-key-row .c-src,
.ccd-key-row .c-tgt,
.ccd-col-row .c-src,
.ccd-col-row .c-tgt {
  min-width: 0;
}
.ccd-inline-error {
  margin-top: 8px;
  padding: 7px 10px;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12px;
}
.ccd-col-row.duplicate {
  background: #fff7f7;
}
.ccd-col-row.duplicate .n-input {
  border-color: #fca5a5;
}
.ccd-toggle {
  background: #f8fafc;
  border-color: #e2e8f0;
}
.ccd-toggle:hover {
  border-color: #bfdbfe;
  background: #f8fbff;
}
.ccd-toggle.on {
  background: #f8fbff;
  border-color: #93c5fd;
}
.ccd-toggle-symbol {
  width: 30px;
  height: 28px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  background: #fff;
  color: #334155;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  outline: none;
}
.ccd-toggle-symbol:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.16);
}
.ccd-toggle.on .ccd-toggle-symbol {
  border-color: #93c5fd;
  color: #1d4ed8;
}
.ccd-toggle.on .ccd-toggle-switch {
  background: #2563eb;
}
`

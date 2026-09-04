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
import { computed, defineComponent, reactive, watchEffect } from 'vue'
import { NButton, NDrawer, NDrawerContent, NTooltip, useMessage } from 'naive-ui'

export interface FilterUpstreamField {
  name: string
  type: string
}

export interface FilterUpstream {
  id: string
  label: string
  alias: string
  fields: FilterUpstreamField[]
}

// 字段映射数据：columns 改为带 enabled 标记 [{ name, alias, enabled }]
type FilterColumn = { name: string; alias: string; enabled: boolean }

export interface FilterConfig {
  alias: string
  where: string
  // 输出列：[{ name, alias, enabled }]；alias 可省略，省略时沿用 name
  columns: FilterColumn[]
}

// === 全局样式（fcd- 前缀防止冲突） ===
const FcdStyles = `
/* === FilterConfigDialog · Refined data-tool === */
.fcd-section {
  padding: 18px 24px;
  border-bottom: 1px solid #E7E5E0;
  position: relative;
}
.fcd-section.fcd-section-last { border-bottom: none; }

.fcd-section-num {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #D6D3CD;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}
.fcd-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1C1917;
  letter-spacing: -0.01em;
}
.fcd-section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.fcd-section-hint {
  font-size: 11px;
  color: #A8A29E;
  margin-top: 3px;
  margin-bottom: 12px;
}

/* alias row */
.fcd-alias-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #FAFAF9;
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  padding: 0 10px;
  transition: all 0.15s;
}
.fcd-alias-row:focus-within {
  border-color: #0D9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
  background: #FFFFFF;
}
.fcd-alias-tag {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 11px;
  color: #A8A29E;
  padding: 2px 6px;
  background: #EFEEEC;
  border-radius: 3px;
}
.fcd-alias-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 13px;
  color: #1C1917;
  outline: none;
}
.fcd-alias-input::placeholder { color: #D6D3CD; }
.fcd-alias-valid {
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
.fcd-alias-valid.bad { background: #B91C1C; }

/* map table */
.fcd-map-table {
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  overflow: hidden;
  background: #FFFFFF;
}
.fcd-map-header {
  display: grid;
  grid-template-columns: 32px 1fr 14px 1fr 32px;
  gap: 0;
  padding: 8px 10px;
  background: #F5F5F4;
  border-bottom: 1px solid #E7E5E0;
  font-size: 10px;
  font-weight: 600;
  color: #57534E;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.fcd-map-row {
  display: grid;
  grid-template-columns: 32px 1fr 14px 1fr 32px;
  gap: 0;
  padding: 8px 10px;
  align-items: center;
  border-bottom: 1px solid #E7E5E0;
  transition: background 0.1s;
  position: relative;
}
.fcd-map-row:last-child { border-bottom: none; }
.fcd-map-row:hover { background: #FAFAF9; }
.fcd-map-row.has-conflict { background: #FEF2F2; }
/* 不勾选（disabled）= 字段变灰 + 中间横线 */
.fcd-map-row.disabled { background: #FAFAF9; }
.fcd-map-row.disabled .fcd-map-field-src,
.fcd-map-row.disabled .fcd-map-field-dst,
.fcd-map-row.disabled .fcd-map-arrow {
  color: #A8A29E;
  text-decoration: line-through;
  text-decoration-color: #A8A29E;
  text-decoration-thickness: 1px;
}
.fcd-map-row.disabled .fcd-map-field-src {
  background: #EFEEEC;
}
.fcd-map-row.disabled .fcd-map-field-dst {
  background: transparent;
  cursor: not-allowed;
}
.fcd-map-row.disabled .fcd-map-checkbox {
  background: #FFFFFF;
  border-color: #D6D3CD;
}
.fcd-map-row.disabled .fcd-map-checkbox:not(.checked) {
  background: #FAFAF9;
}

.fcd-map-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid #D6D3CD;
  background: #FFFFFF;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.1s;
  color: white;
  font-size: 11px;
  line-height: 1;
}
.fcd-map-checkbox.checked {
  background: #0D9488;
  border-color: #0D9488;
}

.fcd-map-field-src {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  color: #1C1917;
  padding: 4px 8px;
  background: #F5F5F4;
  border-radius: 4px;
}

.fcd-map-arrow {
  text-align: center;
  color: #D6D3CD;
  font-size: 12px;
}

.fcd-map-dst-wrap {
  position: relative;
  width: 100%;
}
.fcd-map-field-dst {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  color: #1C1917;
  padding: 4px 8px;
  background: #FFFFFF;
  border-radius: 4px;
  border: 1px solid #E7E5E0;
  width: 100%;
  outline: none;
  transition: all 0.1s;
  box-sizing: border-box;
}
.fcd-map-field-dst:focus {
  border-color: #0D9488;
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.08);
}
.fcd-map-field-dst.error {
  border-color: #B91C1C;
  background: #FEF2F2;
}
.fcd-map-field-dst.error::placeholder {
  color: #B91C1C;
  opacity: 0.7;
}
.fcd-conflict-badge {
  position: absolute;
  top: -6px;
  right: -4px;
  background: #B91C1C;
  color: white;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 8px;
  line-height: 1.4;
  box-shadow: 0 0 0 2px #FFFFFF;
  pointer-events: none;
}

.fcd-map-remove {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: #A8A29E;
  cursor: pointer;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: all 0.15s;
  font-size: 14px;
}
.fcd-map-row:hover .fcd-map-remove { opacity: 1; }
.fcd-map-remove:hover {
  background: #FEF2F2;
  color: #B91C1C;
}

.fcd-map-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.fcd-action-link {
  font-size: 11px;
  color: #0D9488;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.1s;
  font-weight: 500;
}
.fcd-action-link:hover { background: #CCFBF1; }
.fcd-action-link.muted { color: #A8A29E; }
.fcd-action-link.muted:hover {
  background: #F5F5F4;
  color: #57534E;
}
.fcd-map-count {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #A8A29E;
  padding: 2px 6px;
  background: #F5F5F4;
  border-radius: 3px;
}

.fcd-empty-hint {
  font-size: 12px;
  color: #A8A29E;
  padding: 14px 12px;
  background: #FAFAF9;
  border: 1px dashed #E7E5E0;
  border-radius: 6px;
  text-align: center;
}

/* WHERE shell */
.fcd-where-shell {
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  background: #FFFFFF;
  overflow: hidden;
  transition: border 0.15s, box-shadow 0.15s;
}
.fcd-where-shell:focus-within {
  border-color: #0D9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
}
.fcd-where-token-bar {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: #F5F5F4;
  border-bottom: 1px solid #E7E5E0;
  flex-wrap: wrap;
}
.fcd-where-token {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 11px;
  padding: 2px 6px;
  background: #FFFFFF;
  border: 1px solid #E7E5E0;
  border-radius: 3px;
  color: #57534E;
  cursor: pointer;
  transition: all 0.1s;
}
.fcd-where-token:hover {
  border-color: #0D9488;
  color: #0D9488;
}
.fcd-where-input {
  width: 100%;
  border: none;
  outline: none;
  padding: 10px 12px;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  background: transparent;
  color: #1C1917;
  resize: vertical;
  min-height: 50px;
  line-height: 1.5;
  box-sizing: border-box;
}
.fcd-where-input::placeholder { color: #D6D3CD; }

/* SQL preview */
.fcd-sql-warn {
  font-size: 11px;
  color: #B91C1C;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: #FEF2F2;
  border-radius: 4px;
}
.fcd-preview-block {
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
.fcd-preview-label {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 9px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

/* footer */
.fcd-drawer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #FAFAF9;
  border-top: 1px solid #E7E5E0;
  position: sticky;
  bottom: 0;
}
.fcd-footer-meta {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10.5px;
  color: #57534E;
}
.fcd-footer-meta .ok { color: #0D9488; margin-right: 4px; }
.fcd-footer-meta .bad { color: #B91C1C; margin-right: 4px; }
.fcd-footer-meta .muted { color: #A8A29E; margin-right: 4px; }
.fcd-footer-actions { display: flex; justify-content: space-between; gap: 8px; width: 100%; }
.fcd-footer-actions-right { display: flex; gap: 8px; }
`

export default defineComponent({
  name: 'FilterConfigDialog',
  props: {
    visible: { type: Boolean, default: false },
    upstream: { type: Array as () => FilterUpstream[], default: () => [] },
    nodeId: { type: String, default: '' },
    nodeConfig: { type: Object as () => FilterConfig | null, default: null }
  },
  emits: {
    'update:visible': (_v: boolean) => true,
    saved: (_cfg: FilterConfig) => true,
    delete: (_payload: { id: string }) => true
  },
  setup(props, { emit }) {
    const message = useMessage()

    // 注入全局样式（首次挂载时）
    if (typeof document !== 'undefined' && !document.getElementById('fcd-styles')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'fcd-styles'
      styleEl.textContent = FcdStyles
      document.head.appendChild(styleEl)
    }

    const form = reactive<FilterConfig>({
      alias: '',
      where: '',
      columns: []
    })

    // 收集到的所有可选字段（按出现顺序去重）
    const allFields = computed<FilterUpstreamField[]>(() => {
      const seen = new Set<string>()
      const out: FilterUpstreamField[] = []
      for (const u of props.upstream) {
        for (const f of u.fields || []) {
          if (!seen.has(f.name)) {
            seen.add(f.name)
            out.push(f)
          }
        }
      }
      return out
    })

    // 上游个数校验：filter 是 1 入 1 出
    const upstreamOk = computed(() => props.upstream.length === 1)
    const upstreamAlias = computed(() => (props.upstream[0]?.alias || '').trim())

    watchEffect(
      () => {
        if (!props.visible) return
        const cfg = (props.nodeConfig || {}) as FilterConfig
        form.alias = (cfg.alias || '').toString()
        form.where = (cfg.where || '').toString()
        form.columns = Array.isArray(cfg.columns)
          ? cfg.columns.map((c: any) => ({
              name: (c?.name || '').toString(),
              alias: (c?.alias ?? c?.name ?? '').toString(),
              enabled: c?.enabled !== false // 默认 true，兼容旧数据
            }))
          : []
        if (!form.alias.trim() && upstreamAlias.value) {
          form.alias = upstreamAlias.value + '_f'
        }
        if (form.columns.length === 0) {
          form.columns = allFields.value.map((f) => ({
            name: f.name,
            alias: f.name,
            enabled: true
          }))
        }
      },
      { flush: 'post' }
    )

    // 校验：每个 enabled column 的 alias 必须非空 + 与其他 enabled column 的 alias 不重名（不区分大小写）
    type ConflictMap = Map<string, { reason: 'empty' | 'dup'; withName?: string }>
    const columnErrors = computed<ConflictMap>(() => {
      const m: ConflictMap = new Map()
      const seen = new Map<string, string>()
      for (const c of form.columns) {
        if (!c.enabled) continue // 不启用的列不校验
        const alias = (c.alias || '').trim()
        const key = alias.toLowerCase()
        if (!alias) {
          m.set(c.name, { reason: 'empty' })
          continue
        }
        if (seen.has(key)) {
          m.set(c.name, { reason: 'dup', withName: seen.get(key) })
        } else {
          seen.set(key, c.name)
        }
      }
      return m
    })
    const errorCount = computed(() => columnErrors.value.size)
    const enabledColumns = computed(() => form.columns.filter((c) => c.enabled))
    const validColumnsForPreview = computed(() =>
      enabledColumns.value.filter((c) => !columnErrors.value.has(c.name))
    )

    function setAlias(idx: number, alias: string) {
      const item = form.columns[idx]
      if (!item) return
      item.alias = alias
    }

    function toggleColumn(name: string) {
      const item = form.columns.find((c) => c.name === name)
      if (item) item.enabled = !item.enabled
    }

    function selectAll() {
      const existing = new Map(form.columns.map((c) => [c.name, c.alias || c.name]))
      form.columns = allFields.value.map((f) => ({
        name: f.name,
        alias: existing.get(f.name) || f.name,
        enabled: existing.get(f.name) ? (form.columns.find((c) => c.name === f.name)?.enabled ?? true) : true
      }))
    }

    function clearAll() {
      // 全不选 = 全部 disabled（保留行，方便用户单独重新启用）
      for (const c of form.columns) c.enabled = false
    }

    const previewSql = computed(() => {
      if (!upstreamOk.value) return '-- 请先连入一个上游节点（仅支持 1 入 1 出）'
      const alias = (form.alias || upstreamAlias.value || 'filter').trim()
      const validCols = validColumnsForPreview.value
      // 当没有合法列时显示提示，而不是默默退回 '*'
      if (validCols.length === 0) {
        return '-- 没有可输出的列（请至少勾选一行并修复别名错误）'
      }
      const select = validCols
        .map((c) =>
          c.alias && c.alias !== c.name ? `${c.name} AS ${c.alias}` : c.name
        )
        .join(', ')
      // 上游是 source（已是注册的临时表）→ 直接 FROM alias
      // 上游是 filter/transform/join（返回子查询）→ FROM (subquery) AS upstream_alias
      const upAlias = upstreamAlias.value || 'upstream'
      const fromClause = upAlias
      let sql = `SELECT ${select}\nFROM ${fromClause}`
      const w = (form.where || '').trim()
      if (w) sql += `\nWHERE ${w}`
      sql += `\n-- 整体作为子查询，节点别名: ${alias}`
      return sql
    })

    const erroredColumns = computed(() =>
      form.columns
        .filter((c) => columnErrors.value.has(c.name))
        .map((c) => ({ name: c.name, err: columnErrors.value.get(c.name)! }))
    )

    function onSave() {
      if (!upstreamOk.value) {
        message.error('过滤节点仅支持 1 入 1 出，请先连入一个上游节点')
        return
      }
      const alias = (form.alias || '').trim()
      if (!alias) {
        message.error('请填写节点别名（用于 SQL 子查询 AS）')
        return
      }
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
        message.error('别名只能包含字母、数字、下划线，且不能以数字开头')
        return
      }
      if (errorCount.value > 0) {
        message.error('输出名有空值或冲突，请修复后再保存')
        return
      }
      const columns = form.columns.map((c) => ({
        name: (c.name || '').trim(),
        alias: (c.alias ?? c.name ?? '').trim()
      }))
      emit('saved', {
        alias,
        where: (form.where || '').trim(),
        columns
      })
      emit('update:visible', false)
    }

    function onCancel() {
      emit('update:visible', false)
    }
    function onDelete() {
      emit('delete', { id: props.nodeId })
      emit('update:visible', false)
    }

    function onClickFieldToken(name: string) {
      const cur = form.where || ''
      let next = cur.trimEnd()
      if (next && !/\b(AND|OR)\s*$/i.test(next)) next += ' AND'
      next += ' ' + name
      form.where = next.trimStart()
    }

    return () => (
      <NDrawer
        show={props.visible}
        onUpdate:show={(v: boolean) => emit('update:visible', v)}
        width={560}
        placement="right"
      >
        <NDrawerContent title="过滤节点配置" closable>
          {/* 1. 节点别名 */}
          <div class='fcd-section'>
            <div class='fcd-section-num'>01</div>
            <div class='fcd-section-title'>节点别名</div>
            <div class='fcd-section-hint'>下游节点引用此节点时使用的名称</div>
            <div class='fcd-alias-row'>
              <span class='fcd-alias-tag'>alias</span>
              <input
                class='fcd-alias-input'
                value={form.alias}
                onInput={(e: any) => (form.alias = e.target.value)}
                placeholder='filter1'
              />
              {form.alias.trim() &&
              /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(form.alias.trim()) ? (
                <span class='fcd-alias-valid'>✓</span>
              ) : (
                <span class='fcd-alias-valid bad'>!</span>
              )}
            </div>
          </div>

          {/* 2. 字段映射（核心：一对一映射表） */}
          <div class='fcd-section'>
            <div class='fcd-section-num'>02</div>
            <div class='fcd-section-title-row'>
              <div class='fcd-section-title'>字段映射</div>
              <div class='fcd-map-actions'>
                <button class='fcd-action-link' onClick={selectAll} type='button'>
                  + 全选
                </button>
                <button
                  class='fcd-action-link muted'
                  onClick={clearAll}
                  type='button'
                >
                  — 全不选
                </button>
                <span class='fcd-map-count'>
                  {validColumnsForPreview.value.length} / {form.columns.length} 合法输出
                </span>
              </div>
            </div>
            <div class='fcd-section-hint'>
              一对一映射 · 输出名不能为空也不能与其它行重名
            </div>

            {form.columns.length === 0 ? (
              <div class='fcd-empty-hint'>
                未选择任何输出列 · 点「+ 全选」从上游拉取
              </div>
            ) : (
              <div class='fcd-map-table'>
                <div class='fcd-map-header'>
                  <span></span>
                  <span>源字段 (upstream)</span>
                  <span></span>
                  <span>输出名 (alias)</span>
                  <span></span>
                </div>
                {form.columns.map((c, idx) => {
                  const err = columnErrors.value.get(c.name)
                  const isErr = !!err
                  const badgeText =
                    err?.reason === 'empty'
                      ? '空'
                      : err?.reason === 'dup'
                      ? '重名'
                      : null
                  const tipText =
                    err?.reason === 'empty'
                      ? '输出名不能为空'
                      : err?.reason === 'dup'
                      ? `与「${err.withName}」的输出名冲突`
                      : ''
                  const rowClass = [
                    'fcd-map-row',
                    !c.enabled ? ' disabled' : '',
                    isErr ? ' has-conflict' : ''
                  ].filter(Boolean).join(' ')
                  return (
                    <div
                      key={c.name + '_' + idx}
                      class={rowClass}
                    >
                      <span
                        class={'fcd-map-checkbox' + (c.enabled ? ' checked' : '')}
                        onClick={() => toggleColumn(c.name)}
                      >
                        {c.enabled ? '✓' : ''}
                      </span>
                      <span class='fcd-map-field-src'>{c.name}</span>
                      <span class='fcd-map-arrow'>→</span>
                      <div class='fcd-map-dst-wrap'>
                        <input
                          class={
                            'fcd-map-field-dst' + (isErr ? ' error' : '')
                          }
                          value={c.alias}
                          onInput={(e: any) => setAlias(idx, e.target.value)}
                          placeholder={isErr ? tipText : c.name}
                          disabled={!c.enabled}
                        />
                        {badgeText && (
                          <NTooltip>
                            {{
                              trigger: () => (
                                <span class='fcd-conflict-badge'>
                                  {badgeText}
                                </span>
                              ),
                              default: () => <span>{tipText}</span>
                            }}
                          </NTooltip>
                        )}
                      </div>
                      {/* 右侧已移除删除按钮：不勾选 = 字段变灰 + 中间横线（见 .fcd-map-row.disabled） */}
                      <span style='width: 32px;'></span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 3. WHERE 过滤 */}
          <div class='fcd-section'>
            <div class='fcd-section-num'>03</div>
            <div class='fcd-section-title'>WHERE 过滤</div>
            <div class='fcd-section-hint'>
              未填写 = 不过滤 · 点击上方字段 token 可快速插入
            </div>

            <div class='fcd-where-shell'>
              {allFields.value.length > 0 && (
                <div class='fcd-where-token-bar'>
                  {allFields.value.map((f) => (
                    <button
                      key={f.name}
                      class='fcd-where-token'
                      onClick={() => onClickFieldToken(f.name)}
                      type='button'
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                class='fcd-where-input'
                value={form.where}
                onInput={(e: any) => (form.where = e.target.value)}
                placeholder="price > 2000 AND category = 'electronics'"
                rows={3}
              />
            </div>
          </div>

          {/* 4. SQL 预览 */}
          <div class='fcd-section fcd-section-last'>
            <div class='fcd-section-num'>04</div>
            <div class='fcd-section-title'>SQL 预览</div>
            <div class='fcd-section-hint'>下游预览节点会用这段子查询</div>
            {errorCount.value > 0 && (
              <div class='fcd-sql-warn'>
                ⚠ 仅展示合法列 ·{' '}
                {erroredColumns.value.map((c) => `「${c.name}」`).join('、')}
                因校验失败暂被忽略
              </div>
            )}
            <pre class='fcd-preview-block'>
              <span class='fcd-preview-label'>LIVE</span>
              {previewSql.value}
            </pre>
          </div>

          {/* footer */}
          <div class='fcd-drawer-footer'>
            <div class='fcd-footer-meta'>
              {errorCount.value === 0 && form.columns.length > 0 ? (
                <>
                  <span class='ok'>●</span> 字段引用全部合法 ·{' '}
                  {validColumnsForPreview.value.length} 列输出
                </>
              ) : errorCount.value > 0 ? (
                <>
                  <span class='bad'>●</span> {errorCount.value} 项错误待修复 ·{' '}
                  {validColumnsForPreview.value.length} 列输出可用
                </>
              ) : (
                <>
                  <span class='muted'>●</span> 还未选择输出列
                </>
              )}
            </div>
            <div class='fcd-footer-actions'>
              <NButton
                quaternary
                type='error'
                onClick={onDelete}
              >
                删除节点
              </NButton>
              <div class='fcd-footer-actions-right'>
                <NButton onClick={onCancel}>取消</NButton>
                <NButton
                  type='primary'
                  onClick={onSave}
                  disabled={errorCount.value > 0}
                >
                  保存
                </NButton>
              </div>
            </div>
          </div>
        </NDrawerContent>
      </NDrawer>
    )
  }
})
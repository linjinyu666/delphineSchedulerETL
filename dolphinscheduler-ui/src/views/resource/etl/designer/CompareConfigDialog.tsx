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
import { defineComponent, ref, computed, watchEffect, watch } from 'vue'
import {
  NDrawer, NDrawerContent, NTooltip
} from 'naive-ui'

// 数据比对节点配置对话框 (Compare Config Dialog)
//   - 2 入 1 出:用户选择哪个 upstream 是 SRC / 哪个是 TGT
//   - 主键字段(可逗号分隔多个 KEY)
//   - 字段映射(checkbox 控制是否参与比对,支持多 KEY)
//   - 输出配置:新增 / 删除 / 修改 / 一致 哪些要输出
//   - SQL 预览(实时生成)

export interface CompareColumn {
  name: string
  enabled: boolean
}

export interface CompareConfig {
  alias?: string
  srcId?: string            // 上游节点id(SRC 角色)
  tgtId?: string            // 上游节点id(TGT 角色)
  key?: string              // 主键字段(逗号分隔)
  columns?: CompareColumn[] // 参与比对的字段
  output?: {
    added?: boolean
    deleted?: boolean
    changed?: boolean
    unchanged?: boolean
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
    nodeConfig: { type: Object as () => CompareConfig, default: () => ({}) },
    upstreams: { type: Array as () => UpstreamOption[], default: () => [] }
  },
  emits: ['update:visible', 'save', 'delete', 'close'],
  setup(props, { emit }) {
    const form = ref<CompareConfig>({
      alias: '',
      srcId: '',
      tgtId: '',
      key: '',
      columns: [],
      output: { added: true, deleted: true, changed: true, unchanged: false }
    })

    // 上游字段(从两个 upstream 中取交集;取所有字段让用户自选)
    const srcUp = computed(() => props.upstreams.find((u) => u.id === form.value.srcId) || props.upstreams[0])
    const tgtUp = computed(() => props.upstreams.find((u) => u.id === form.value.tgtId) || props.upstreams[1] || props.upstreams[0])
    const allFields = computed(() => {
      const m = new Map<string, { name: string; type: string }>()
      ;(srcUp.value?.fields || []).forEach((f) => m.set(f.name, f))
      ;(tgtUp.value?.fields || []).forEach((f) => m.set(f.name, f))
      return Array.from(m.values())
    })

    // 2 in 1 out 校验
    const upstreamOk = computed(() => props.upstreams.length === 2)
    const noKeyWarn = computed(() => !form.value.key?.trim())

    // 初始化表单
    watchEffect(() => {
      if (!props.visible) return
      const cfg = (props.nodeConfig || {}) as CompareConfig
      form.value.alias = (cfg.alias || '').toString()
      form.value.srcId = (cfg.srcId || props.upstreams[0]?.id || '').toString()
      form.value.tgtId = (cfg.tgtId || props.upstreams[1]?.id || props.upstreams[0]?.id || '').toString()
      form.value.key = (cfg.key || 'id').toString()
      form.value.columns = Array.isArray(cfg.columns)
        ? cfg.columns.map((c: any) => ({ name: c.name, enabled: c.enabled !== false }))
        : allFields.value.map((f) => ({ name: f.name, enabled: true }))
      form.value.output = cfg.output || { added: true, deleted: true, changed: true, unchanged: false }
      if (!form.value.alias.trim()) {
        form.value.alias = 'compare1'
      }
      if (form.value.columns.length === 0 && allFields.value.length > 0) {
        form.value.columns = allFields.value.map((f) => ({ name: f.name, enabled: true }))
      }
    })

    function swapSrcTgt() {
      const a = form.value.srcId
      form.value.srcId = form.value.tgtId
      form.value.tgtId = a
    }
    function setSrc(slot: 1 | 2) {
      const other = slot === 1 ? props.upstreams[1] : props.upstreams[0]
      const cur = slot === 1 ? props.upstreams[0] : props.upstreams[1]
      if (!cur || !other) return
      form.value.srcId = cur.id
      form.value.tgtId = other.id
    }
    function setTgt(slot: 1 | 2) {
      setSrc(slot === 1 ? 2 : 1)
    }
    function toggleColumn(name: string) {
      const c = form.value.columns.find((x) => x.name === name)
      if (c) c.enabled = !c.enabled
    }
    function selectAll() {
      for (const c of form.value.columns) c.enabled = true
    }
    function clearAll() {
      for (const c of form.value.columns) c.enabled = false
    }
    function toggleOutput(op: 'added' | 'deleted' | 'changed' | 'unchanged') {
      form.value.output = form.value.output || {}
      form.value.output[op] = !form.value.output[op]
    }
    function onClose() {
      emit('update:visible', false)
      emit('close')
    }
    function onSave() {
      emit('save', JSON.parse(JSON.stringify(form.value)))
      onClose()
    }
    function onDelete() {
      emit('delete', { id: props.nodeId })
      onClose()
    }

    // 实时 SQL 预览
    const previewSql = computed(() => {
      if (!upstreamOk.value) return '-- 请先连入 2 个上游节点'
      if (noKeyWarn.value) return '-- 请填写主键字段(如 id)'
      const srcAlias = srcUp.value?.alias || 'src'
      const tgtAlias = tgtUp.value?.alias || 'tgt'
      const keys = form.value.key!.split(',').map((k) => k.trim()).filter(Boolean)
      const enabledCols = form.value.columns.filter((c) => c.enabled)
      const colsSelect = enabledCols.length > 0
        ? enabledCols.map((c) => `${srcAlias}.${c.name} AS s_${c.name}, ${tgtAlias}.${c.name} AS t_${c.name}`).join(',\n  ')
        : `${srcAlias}.*, ${tgtAlias}.*`
      const diffExpr = enabledCols.length > 0
        ? enabledCols.map((c) => `(${srcAlias}.${c.name} <> ${tgtAlias}.${c.name} OR (${srcAlias}.${c.name} IS NULL) <> (${tgtAlias}.${c.name} IS NULL))`).join('\n      OR ')
        : ''
      const compareAlias = (form.value.alias || 'compare1').trim()
      const out = form.value.output || {}
      const ops: string[] = []
      if (out.added !== false) ops.push("'+'")
      if (out.deleted !== false) ops.push("'-'")
      if (out.changed !== false) ops.push("'~'")
      if (out.unchanged === true) ops.push("'='")
      const whereClause = ops.length > 0 ? `WHERE ${compareAlias}.cmp_op IN (${ops.join(', ')})` : ''

      return `SELECT * FROM (
SELECT
  CASE
    WHEN ${srcAlias}.${keys[0]} IS NULL THEN '+'
    WHEN ${tgtAlias}.${keys[0]} IS NULL THEN '-'
    ${diffExpr ? `WHEN ${diffExpr} THEN '~'` : ''}
    ELSE '='
  END AS cmp_op,
  COALESCE(${srcAlias}.${keys[0]}, ${tgtAlias}.${keys[0]}) AS cmp_id,
  ${colsSelect}
FROM ${srcAlias} FULL OUTER JOIN ${tgtAlias}
  ON ${keys.map((k) => `${srcAlias}.${k} = ${tgtAlias}.${k}`).join(' AND ')}
) AS ${compareAlias}
${whereClause}`
    })

    const errorCount = computed(() => {
      let n = 0
      if (!upstreamOk.value) n++
      if (noKeyWarn.value) n++
      return n
    })

    return () => (
      <NDrawer
        show={props.visible}
        width={620}
        placement="right"
        onUpdateShow={(v: boolean) => emit('update:visible', v)}
      >
        <NDrawerContent title={`数据比对 · ${form.value.alias || '未命名'}`} closable>
          {{
            default: () => (
              <div class="ccd-drawer">
                <FcdStyles />

                {/* HEADER */}
                <div class="ccd-header">
                  <div class="ccd-header-left">
                    <div class="ccd-node-chip">⊟</div>
                    <div>
                      <div class="ccd-header-title">数据比对 · {form.value.alias || '未命名'}</div>
                      <div class="ccd-header-sub">2 in · 1 out · FULL OUTER JOIN</div>
                    </div>
                  </div>
                  <div class="ccd-header-right">
                    <span class={`ccd-status-tag ${errorCount.value > 0 ? 'bad' : ''}`}>
                      ● {errorCount.value > 0 ? `${errorCount.value} 项待修复` : '已配置'}
                    </span>
                  </div>
                </div>

                {/* UPSTREAM STRIP */}
                <div class="ccd-upstream">
                  <div class="ccd-up-card">
                    <div class="ccd-up-role">
                      <button
                        class={`up-role-btn ${form.value.srcId === props.upstreams[0]?.id ? 'active src' : ''}`}
                        onClick={() => setSrc(1)}
                      >SRC</button>
                      <button
                        class={`up-role-btn ${form.value.tgtId === props.upstreams[0]?.id ? 'active tgt' : ''}`}
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
                        class={`up-role-btn ${form.value.srcId === props.upstreams[1]?.id ? 'active src' : ''}`}
                        onClick={() => setSrc(2)}
                      >SRC</button>
                      <button
                        class={`up-role-btn ${form.value.tgtId === props.upstreams[1]?.id ? 'active tgt' : ''}`}
                        onClick={() => setTgt(2)}
                      >TGT</button>
                    </div>
                    <span class="ccd-up-alias">{props.upstreams[1]?.alias || '?'}</span>
                    <span class="ccd-up-fields">{props.upstreams[1]?.fields?.length || 0} 字段</span>
                  </div>
                </div>

                {/* 01. 基本配置 */}
                <div class="ccd-section">
                  <div class="ccd-section-num">01</div>
                  <div class="ccd-section-title">基本配置</div>
                  <div class="ccd-section-hint">节点别名（下游引用）与主键字段（用于两表关联）</div>
                  <div class="ccd-identity-grid">
                    <div class="ccd-field-input">
                      <span class="ccd-field-icon">alias</span>
                      <input
                        value={form.value.alias}
                        onInput={(e: any) => (form.value.alias = e.target.value)}
                        placeholder="compare1"
                      />
                      {form.value.alias.trim()
                        ? <span class="ccd-valid">✓</span>
                        : <span class="ccd-valid bad">!</span>}
                    </div>
                    <div class={`ccd-field-input ${noKeyWarn.value ? 'error' : ''}`}>
                      <span class="ccd-field-icon">🔑</span>
                      <input
                        value={form.value.key}
                        onInput={(e: any) => (form.value.key = e.target.value)}
                        placeholder="点击下面字段 token 选主键"
                        readonly
                      />
                      {form.value.key.trim()
                        ? <span class="ccd-valid">✓</span>
                        : <span class="ccd-valid bad">!</span>}
                    </div>
                  </div>

                  {/* KEY 字段 token 选择器 - 点击即勾选/取消 */}
                  <div class="ccd-key-tokens">
                    {form.value.columns.map((c) => {
                      const keys = (form.value.key || '').split(',').map((k) => k.trim()).filter(Boolean)
                      const isKey = keys.includes(c.name)
                      return (
                        <button
                          class={`ccd-key-token ${isKey ? 'is-key' : ''}`}
                          onClick={() => {
                            if (isKey) {
                              form.value.key = keys.filter((k) => k !== c.name).join(',')
                            } else {
                              keys.push(c.name)
                              form.value.key = keys.join(',')
                            }
                          }}
                          type="button"
                        >
                          🔑 {c.name}
                        </button>
                      )
                    })}
                  </div>
                  {/* 太多 KEY 警告 */}
                  {((form.value.key || '').split(',').filter((k) => k.trim()).length >= 3) && (
                    <div class="ccd-key-warn">
                      ⚠ 选太多 KEY 会让每行都不同(可能完全无法匹配)
                    </div>
                  )}
                </div>

                {/* 02. 字段映射 */}
                <div class="ccd-section">
                  <div class="ccd-section-num">02</div>
                  <div class="ccd-section-title">字段映射</div>
                  <div class="ccd-section-hint">
                    勾选字段 = 参与比对 · 第一列 ⌜KEY⌟ 标记主键字段
                  </div>

                  {form.value.columns.length === 0 ? (
                    <div class="ccd-empty-hint">无可比对字段</div>
                  ) : (
                    <div class="ccd-map-table">
                      <div class="ccd-map-header">
                        <span class="l-h">SRC · {srcUp.value?.alias}</span>
                        <span class="center">=</span>
                        <span class="r-h">TGT · {tgtUp.value?.alias}</span>
                        <span class="center">✓</span>
                      </div>
                      {form.value.columns.map((c, idx) => {
                        const isMissing =
                          !srcUp.value?.fields?.some((f) => f.name === c.name) ||
                          !tgtUp.value?.fields?.some((f) => f.name === c.name)
                        return (
                          <div
                            key={c.name + '_' + idx}
                            class={`ccd-map-row ${!c.enabled ? 'disabled' : ''} ${isMissing ? 'is-mismatch' : ''}`}
                          >
                            <span class="ccd-map-field">{c.name}</span>
                            <span class="ccd-map-arrow">=</span>
                            <span class={`ccd-map-field r ${isMissing ? 'missing' : ''}`}>
                              {isMissing ? '不存在' : c.name}
                            </span>
                            <span class={`ccd-map-marker ${isMissing ? 'missing' : 'matched'}`}>
                              {isMissing ? '!' : '✓'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div class="ccd-map-actions">
                    <button class="ccd-action-link" onClick={selectAll}>+ 全选</button>
                    <button class="ccd-action-link muted" onClick={clearAll}>− 全不选</button>
                    <span class="ccd-map-count">
                      {form.value.columns.filter((c) => c.enabled).length} / {form.value.columns.length} 参与比对
                    </span>
                  </div>
                </div>

                {/* 03. 输出配置 */}
                <div class="ccd-section">
                  <div class="ccd-section-num">03</div>
                  <div class="ccd-section-title">输出哪些差异行</div>
                  <div class="ccd-section-hint">每行带 cmp_op 标记 · 默认仅输出 + / − / ~</div>

                  <div class="ccd-toggle-grid">
                    <div
                      class={`ccd-toggle ${form.value.output?.added !== false ? 'on' : ''}`}
                      onClick={() => toggleOutput('added')}
                    >
                      <span class="ccd-toggle-icon add">+</span>
                      <div class="ccd-toggle-text">
                        <div class="zh">新增</div>
                        <div class="en">ADDED · TGT 存在 SRC 无</div>
                      </div>
                      <div class="ccd-toggle-switch"></div>
                    </div>
                    <div
                      class={`ccd-toggle ${form.value.output?.deleted !== false ? 'on' : ''}`}
                      onClick={() => toggleOutput('deleted')}
                    >
                      <span class="ccd-toggle-icon del">−</span>
                      <div class="ccd-toggle-text">
                        <div class="zh">删除</div>
                        <div class="en">DELETED · SRC 存在 TGT 无</div>
                      </div>
                      <div class="ccd-toggle-switch"></div>
                    </div>
                    <div
                      class={`ccd-toggle ${form.value.output?.changed !== false ? 'on' : ''}`}
                      onClick={() => toggleOutput('changed')}
                    >
                      <span class="ccd-toggle-icon mod">~</span>
                      <div class="ccd-toggle-text">
                        <div class="zh">修改</div>
                        <div class="en">CHANGED · 内容不一致</div>
                      </div>
                      <div class="ccd-toggle-switch"></div>
                    </div>
                    <div
                      class={`ccd-toggle ${form.value.output?.unchanged === true ? 'on' : ''}`}
                      onClick={() => toggleOutput('unchanged')}
                    >
                      <span class="ccd-toggle-icon same">=</span>
                      <div class="ccd-toggle-text">
                        <div class="zh">一致</div>
                        <div class="en">UNCHANGED · 完全相同</div>
                      </div>
                      <div class="ccd-toggle-switch"></div>
                    </div>
                  </div>
                </div>

                {/* 04. SQL 预览 */}
                <div class="ccd-section">
                  <div class="ccd-section-num">04</div>
                  <div class="ccd-section-title">SQL 预览</div>
                  <div class="ccd-section-hint">下游预览节点将作为子查询消费此结果</div>
                  <pre class="ccd-preview-block">
                    <span class="ccd-preview-label">LIVE</span>
                    {previewSql.value}
                  </pre>
                </div>

                {/* FOOTER */}
                <div class="ccd-footer">
                  <div class="ccd-footer-meta">
                    {errorCount.value > 0 ? (
                      <span class="bad">●</span>
                    ) : (
                      <span class="ok">●</span>
                    )}
                    {' '}SRC = {srcUp.value?.alias || '?'} · TGT = {tgtUp.value?.alias || '?'} · {' '}
                    {(form.value.key || '').split(',').filter((k) => k.trim()).length} KEY · {' '}
                    {form.value.columns.filter((c) => c.enabled).length} 字段比对
                  </div>
                  <div class="ccd-footer-actions">
                    <button class="ccd-btn danger" onClick={onDelete}>删除节点</button>
                    <div class="ccd-footer-actions-right">
                      <button class="ccd-btn" onClick={onClose}>取消</button>
                      <button class="ccd-btn primary" onClick={onSave} disabled={errorCount.value > 0}>
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          }}
        </NDrawerContent>
      </NDrawer>
    )
  }
})

// CSS 注入(单文件组件风格,运行时由 Vite 解析 <style> 块,这里以函数组件返回 raw HTML)
// 实际样式写在 ccd.css / 跟随同文件 style tag 由构建工具提取
const _StyleSentinel = null
function FcdStyles() {
  return <style>{FcdStylesText}</style>
}

const FcdStylesText = `
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
  padding: 18px 24px;
  border-bottom: 1px solid #E7E5E0;
}
.ccd-section-num {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #D6D3CD;
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}
.ccd-section-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.ccd-section-hint {
  font-size: 11px;
  color: #A8A29E;
  margin-top: 3px;
  margin-bottom: 14px;
  line-height: 1.4;
}

.ccd-identity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.ccd-field-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FAFAF9;
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  padding: 0 10px;
  transition: all 0.15s;
}
.ccd-field-input:focus-within {
  border-color: #0D9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.08);
  background: #FFFFFF;
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

.ccd-map-table {
  border: 1px solid #E7E5E0;
  border-radius: 6px;
  overflow: hidden;
  background: #FFFFFF;
}
.ccd-map-header {
  display: grid;
  grid-template-columns: 1fr 14px 1fr 32px;
  padding: 8px 10px;
  background: #F5F5F4;
  border-bottom: 1px solid #E7E5E0;
  font-size: 10px;
  font-weight: 600;
  color: #57534E;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.ccd-map-header .l-h { color: #1D4ED8; }
.ccd-map-header .r-h { color: #7C3AED; }
.ccd-map-header .center { text-align: center; }
.ccd-map-row {
  display: grid;
  grid-template-columns: 1fr 14px 1fr 32px;
  padding: 8px 10px;
  align-items: center;
  border-bottom: 1px solid #E7E5E0;
  transition: background 0.1s;
}
.ccd-map-row:last-child { border-bottom: none; }
.ccd-map-row:hover { background: #FAFAF9; }
.ccd-map-row.is-key {
  background: linear-gradient(90deg, rgba(249, 115, 22, 0.04), rgba(249, 115, 22, 0.02));
}
.ccd-map-row.is-mismatch { background: #FEF2F2; }
.ccd-map-row.disabled { background: #FAFAF9; }
.ccd-map-row.disabled .ccd-map-field,
.ccd-map-row.disabled .ccd-map-arrow {
  color: #A8A29E;
  text-decoration: line-through;
  text-decoration-color: #A8A29E;
  text-decoration-thickness: 1px;
}
.ccd-map-row.disabled .ccd-map-field {
  background: #EFEEEC;
}
.ccd-key-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1.5px solid #D6D3CD;
  background: #FFFFFF;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 9px;
  line-height: 1;
  color: white;
}
.ccd-key-checkbox.is-key {
  background: #F97316;
  border-color: #F97316;
}
.ccd-key-checkbox.is-key::before {
  content: '⌜⌝';
  letter-spacing: -2px;
}

/* KEY token 选择器 - 在 01 基本配置里 */
.ccd-key-tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.ccd-key-token {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 11px;
  padding: 5px 10px;
  border-radius: 4px;
  background: #FAFAF9;
  border: 1px solid #E7E5E0;
  color: #57534E;
  cursor: pointer;
  transition: all 0.1s;
  font-weight: 500;
}
.ccd-key-token:hover { background: #EFEEEC; border-color: #D6D3CD; }
.ccd-key-token.is-key {
  background: #FFEDD5;
  border-color: #F97316;
  color: #C2410C;
  font-weight: 600;
}
.ccd-key-warn {
  margin-top: 8px;
  padding: 6px 10px;
  background: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: 4px;
  font-size: 11px;
  color: #92400E;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
}
.ccd-map-field {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  color: #1C1917;
  padding: 4px 8px;
  background: #F5F5F4;
  border-radius: 4px;
}
.ccd-map-field.r {
  background: rgba(13, 148, 136, 0.06);
  border: 1px solid rgba(13, 148, 136, 0.18);
}
.ccd-map-field.r.missing {
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.3);
  color: #DC2626;
  text-decoration: line-through;
  text-decoration-color: rgba(220, 38, 38, 0.5);
}
.ccd-map-arrow {
  text-align: center;
  color: #D6D3CD;
  font-size: 12px;
}
.ccd-map-marker {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: white;
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  font-weight: 700;
  margin: 0 auto;
}
.ccd-map-marker.matched { background: #0D9488; }
.ccd-map-marker.missing { background: #DC2626; }

.ccd-map-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
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
.ccd-map-count {
  font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #A8A29E;
  padding: 2px 6px;
  background: #F5F5F4;
  border-radius: 3px;
}
.ccd-empty-hint {
  font-size: 12px;
  color: #A8A29E;
  padding: 14px 12px;
  background: #FAFAF9;
  border: 1px dashed #E7E5E0;
  border-radius: 6px;
  text-align: center;
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
`
/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to you under the Apache License, Version 2.0
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
import {
  NAlert,
  NButton,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  NTooltip,
  useMessage
} from 'naive-ui'
import {
  compileTransformExpression,
  createTransformStep,
  normalizeTransformOutputs,
  TRANSFORM_OPERATION_OPTIONS,
  TRANSFORM_TYPE_OPTIONS,
  type TransformOutput,
  type TransformStep
} from './transform-expression'

export interface TransformUpstreamField {
  name: string
  type: string
}

export interface TransformUpstream {
  id: string
  label: string
  alias: string
  fields: TransformUpstreamField[]
}

export interface TransformConfig {
  alias: string
  mode?: 'projection'
  outputs: TransformOutput[]
  fields?: Array<{ name: string; type: string }>
  columns?: any[]
}

const styles = `
.tcd-section { margin: 0 14px 16px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.tcd-section:last-of-type { margin-bottom: 0; }
.tcd-title-row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
.tcd-title { color:#1f2937; font-size:14px; font-weight:600; line-height:20px; }
.tcd-hint { color:#94a3b8; font-size:12px; line-height:18px; }
.tcd-field { display:grid; grid-template-columns:118px minmax(0,1fr); align-items:center; gap:12px; margin-top:8px; }
.tcd-field:first-child { margin-top:0; }
.tcd-label { color:#475569; font-size:13px; }
.tcd-required { color:#ef4444; }
.tcd-upstreams { display:flex; flex-wrap:wrap; gap:8px; }
.tcd-upstream { display:inline-flex; align-items:center; gap:6px; padding:5px 9px; border:1px solid #dbeafe; border-radius:6px; color:#1d4ed8; background:#eff6ff; font-size:12px; }
.tcd-upstream strong { font-family:Menlo,Consolas,monospace; font-size:12px; }
.tcd-upstream small { color:#64748b; }
.tcd-output-list { display:flex; flex-direction:column; gap:10px; }
.tcd-output { overflow:hidden; border:1px solid #dfe6ef; border-radius:8px; background:#fff; }
.tcd-output.disabled { background:#f8fafc; }
.tcd-output-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; border-bottom:1px solid #edf1f6; background:#f8fafc; }
.tcd-output-title { display:grid; grid-template-columns:34px 22px 48px minmax(110px, 1fr) 58px 145px; align-items:center; gap:8px; min-width:0; flex:1; }
.tcd-output-label { color:#64748b; font-size:12px; white-space:nowrap; }
.tcd-output-type-label { color:#64748b; font-size:12px; white-space:nowrap; }
.tcd-output-type { min-width:0; }
.tcd-index { color:#64748b; font-size:12px; text-align:center; }
.tcd-output-body { display:flex; flex-direction:column; gap:10px; padding:10px 12px 12px; }
.tcd-row { display:grid; grid-template-columns:72px minmax(0, 1fr); align-items:center; gap:10px; min-width:0; }
.tcd-row-label { color:#64748b; font-size:12px; font-weight:500; white-space:nowrap; }
.tcd-transform-content { display:flex; flex-direction:column; align-items:stretch; gap:8px; min-width:0; }
.tcd-no-step { color:#94a3b8; font-size:12px; line-height:30px; }
.tcd-step { display:grid; grid-template-columns:minmax(170px, 1.2fr) minmax(130px, 1fr) auto; align-items:center; gap:8px; min-width:0; padding:7px; border:1px dashed #dbe3ee; border-radius:6px; background:#f8fafc; }
.tcd-step-params { display:grid; grid-template-columns:repeat(auto-fit, minmax(90px, 1fr)); align-items:center; gap:7px; min-width:0; }
.tcd-step-params > * { min-width:0; }
.tcd-add-step { align-self:flex-start; }
.tcd-result-row { display:grid; grid-template-columns:72px minmax(0, 1fr); align-items:center; gap:8px; min-width:0; padding:8px; border-radius:6px; background:#f8fafc; }
.tcd-expression { min-width:0; overflow:hidden; padding:0; }
.tcd-expression code { display:block; min-width:0; overflow:hidden; color:#334155; font-family:Menlo,Consolas,monospace; font-size:11px; line-height:18px; text-overflow:ellipsis; white-space:nowrap; }
.tcd-footer { display:flex; justify-content:flex-end; gap:8px; padding:12px 16px; border-top:1px solid #e5e7eb; background:#f8fafc; }
@media (max-width:640px) { .tcd-field { grid-template-columns:1fr; gap:4px; } .tcd-output-head { align-items:flex-start; } .tcd-output-title { grid-template-columns:28px 20px minmax(0, 1fr) 58px 120px; } .tcd-output-title .tcd-output-label { display:none; } .tcd-output-title .n-input { grid-column:3; } .tcd-output-title .tcd-output-type-label { grid-column:4; } .tcd-output-title .tcd-output-type { grid-column:5; } .tcd-row, .tcd-result-row { grid-template-columns:1fr; gap:4px; } .tcd-step { grid-template-columns:1fr; } .tcd-result-row .tcd-row-label { margin-top:2px; } }
`

function fieldsForUpstream(upstream: TransformUpstream[]) {
  const seen = new Set<string>()
  return upstream.flatMap((item) => (item.fields || []).map((field) => {
    const value = `${item.alias}.${field.name}`
    if (seen.has(value)) return null
    seen.add(value)
    return { value, label: `${value} · ${field.type}`, name: field.name, type: field.type, alias: item.alias }
  }).filter(Boolean) as Array<{ value: string; label: string; name: string; type: string; alias: string }>)
}

export default defineComponent({
  name: 'TransformConfigDialog',
  props: {
    visible: { type: Boolean, default: false },
    nodeId: { type: String, default: '' },
    nodeConfig: { type: Object as () => TransformConfig | null, default: null },
    upstream: { type: Array as () => TransformUpstream[], default: () => [] }
  },
  emits: {
    'update:visible': (_v: boolean) => true,
    saved: (_cfg: TransformConfig) => true,
    delete: (_payload: { id: string }) => true
  },
  setup(props, { emit }) {
    const message = useMessage()
    if (typeof document !== 'undefined' && !document.getElementById('tcd-styles')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'tcd-styles'
      styleEl.textContent = styles
      document.head.appendChild(styleEl)
    }

    const form = reactive<{ alias: string; outputs: TransformOutput[] }>({ alias: '', outputs: [] })
    const sourceOptions = computed(() => fieldsForUpstream(props.upstream))
    const enabledOutputs = computed(() => form.outputs.filter((item) => item.enabled !== false))
    const duplicateNames = computed(() => {
      const seen = new Set<string>()
      const duplicates = new Set<string>()
      enabledOutputs.value.forEach((item) => {
        const key = item.name.trim().toLowerCase()
        if (key && seen.has(key)) duplicates.add(key)
        if (key) seen.add(key)
      })
      return duplicates
    })

    watchEffect(() => {
      if (!props.visible) return
      const cfg = props.nodeConfig || ({} as TransformConfig)
      form.alias = String(cfg.alias || '')
      const hasConfiguredOutputs = (Array.isArray((cfg as any).outputs) && (cfg as any).outputs.length > 0) ||
        (Array.isArray((cfg as any).columns) && (cfg as any).columns.length > 0) ||
        (typeof (cfg as any).columns === 'string' && (cfg as any).columns.trim() && (cfg as any).columns.trim() !== '[]')
      const normalized = hasConfiguredOutputs ? normalizeTransformOutputs(cfg, sourceOptions.value) : [outputFromField(sourceOptions.value[0])]
      form.outputs = normalized.map((item) => ({
        ...item,
        steps: (item.steps || []).map((step) => ({ op: step.op, params: { ...(step.params || {}) } }))
      }))
      if (!form.alias.trim() && props.upstream[0]?.alias) form.alias = `${props.upstream[0].alias}_transform`
    }, { flush: 'post' })

    const expressionFor = (output: TransformOutput) => compileTransformExpression(output)

    function updateOutput(index: number, patch: Partial<TransformOutput>) {
      const item = form.outputs[index]
      if (item) Object.assign(item, patch)
    }

    function selectSource(index: number, value: string | null) {
      const item = form.outputs[index]
      if (!item) return
      const field = sourceOptions.value.find((option) => option.value === value)
      item.source = value || ''
      item.sourceType = field?.type || item.sourceType || 'STRING'
      if (!item.name && field?.name) item.name = field.name
      if (item.type === 'STRING' || !item.type) item.type = field?.type || 'STRING'
    }

    function addOutput() {
      const first = sourceOptions.value[0]
      form.outputs.push(outputFromField(first))
    }

    function outputFromField(field?: { value?: string; name?: string; type?: string }): TransformOutput {
      return {
        id: `output-${Date.now()}`,
        name: field?.name || '',
        source: field?.value || '',
        sourceType: field?.type || 'STRING',
        steps: [],
        type: field?.type || 'STRING',
        enabled: true
      }
    }

    function removeOutput(index: number) {
      form.outputs.splice(index, 1)
    }

    function addStep(output: TransformOutput) {
      output.steps.push(createTransformStep('identity'))
    }

    function updateStep(step: TransformStep, op: string) {
      const next = createTransformStep(op as any)
      step.op = next.op
      step.params = next.params
    }

    function removeStep(output: TransformOutput, index: number) {
      output.steps.splice(index, 1)
    }

    function stepParameter(step: TransformStep, key: string): any {
      if (!step.params) step.params = {}
      return step.params[key]
    }

    function setStepParameter(step: TransformStep, key: string, value: any) {
      if (!step.params) step.params = {}
      step.params[key] = value
    }

    function renderParams(step: TransformStep) {
      const p = step.params || {}
      switch (step.op) {
        case 'cast':
        case 'try_cast':
          return <NSelect size='small' value={String(p.type || 'STRING')} options={TRANSFORM_TYPE_OPTIONS} onUpdate:value={(v: string) => setStepParameter(step, 'type', v)} />
        case 'to_date':
        case 'to_timestamp':
        case 'date_format':
          return <NInput size='small' value={String(p.format || '')} placeholder='时间格式，如 yyyy-MM-dd' onUpdate:value={(v: string) => setStepParameter(step, 'format', v)} />
        case 'to_timestamp_ltz':
          return <NSelect size='small' value={Number(p.precision || 3)} options={[{ label: '毫秒 · 3', value: 3 }, { label: '秒 · 0', value: 0 }]} onUpdate:value={(v: number) => setStepParameter(step, 'precision', v)} />
        case 'extract':
          return <NSelect size='small' value={String(p.unit || 'YEAR')} options={['YEAR', 'QUARTER', 'MONTH', 'WEEK', 'DAY', 'HOUR', 'MINUTE', 'SECOND'].map((value) => ({ label: value, value }))} onUpdate:value={(v: string) => setStepParameter(step, 'unit', v)} />
        case 'split_index':
          return <><NInput size='small' value={String(p.delimiter ?? '-')} placeholder='分隔符' onUpdate:value={(v: string) => setStepParameter(step, 'delimiter', v)} /><NInputNumber size='small' value={Number(p.index ?? 0)} min={0} placeholder='索引' onUpdate:value={(v: number | null) => setStepParameter(step, 'index', v ?? 0)} /></>
        case 'substr':
          return <><NInputNumber size='small' value={Number(p.start ?? 1)} placeholder='起始位置' onUpdate:value={(v: number | null) => setStepParameter(step, 'start', v ?? 1)} /><NInputNumber size='small' value={p.length === '' ? null : Number(p.length)} min={1} placeholder='长度（可空）' onUpdate:value={(v: number | null) => setStepParameter(step, 'length', v == null ? '' : v)} /></>
        case 'left':
        case 'right':
          return <NInputNumber size='small' value={Number(p.length || 10)} min={1} placeholder='字符数' onUpdate:value={(v: number | null) => setStepParameter(step, 'length', v ?? 10)} />
        case 'round':
        case 'truncate':
          return <NInputNumber size='small' value={Number(p.scale ?? 2)} placeholder='小数位数' onUpdate:value={(v: number | null) => setStepParameter(step, 'scale', v ?? 2)} />
        case 'coalesce':
          return <NInput size='small' value={String(p.fallback || "''")} placeholder="兜底值，如 'unknown'" onUpdate:value={(v: string) => setStepParameter(step, 'fallback', v)} />
        case 'custom':
          return <NInput size='small' value={String(p.expression || '{{field}}')} placeholder='使用 {{field}} 代表当前表达式' onUpdate:value={(v: string) => setStepParameter(step, 'expression', v)} />
        default:
          return <span class='tcd-hint'>无需参数</span>
      }
    }

    function onSave() {
      const alias = form.alias.trim()
      if (!alias) return message.error('请填写节点别名')
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) return message.error('别名只能包含字母、数字、下划线，且不能以数字开头')
      if (props.upstream.length !== 1) return message.error('字段转换节点需要且只能连接一个上游节点')
      if (enabledOutputs.value.length === 0) return message.error('请至少启用一个输出字段')
      if (duplicateNames.value.size > 0) return message.error('输出字段名不能重复')
      if (enabledOutputs.value.some((item) => !item.name.trim() || !item.source.trim())) return message.error('请填写每个输出字段的名称和来源字段')
      if (enabledOutputs.value.some((item) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item.name.trim()))) return message.error('输出字段名只能包含字母、数字、下划线，且不能以数字开头')
      const outputs = form.outputs.map((item) => ({
        ...item,
        name: item.name.trim(),
        source: item.source.trim(),
        steps: (item.steps || []).map((step) => ({ op: step.op, params: { ...(step.params || {}) } }))
      }))
      const fields = outputs.filter((item) => item.enabled !== false).map((item) => ({ name: item.name, type: item.type || 'STRING' }))
      emit('saved', { alias, mode: 'projection', outputs, fields, columns: outputs.filter((item) => item.enabled !== false).map((item) => ({ src: expressionFor(item), dst: item.name, type: item.type })) })
      emit('update:visible', false)
    }

    return () => (
      <NDrawer show={props.visible} onUpdate:show={(v: boolean) => emit('update:visible', v)} width={720} placement='right'>
        <NDrawerContent title='字段转换' closable>
          <div class='tcd-section'>
            <div class='tcd-title-row'><span class='tcd-title'>基本信息</span><span class='tcd-hint'>用于识别画布节点和 SQL 别名</span></div>
            <div class='tcd-field'><label class='tcd-label'>节点名称(别名) <span class='tcd-required'>*</span></label><NInput value={form.alias} placeholder='transform1' onUpdate:value={(v: string) => (form.alias = v)} /></div>
            <div class='tcd-field'><span class='tcd-label'>类型</span><NTag type='info'>transform</NTag></div>
          </div>
          <div class='tcd-section'>
            <div class='tcd-title-row'><span class='tcd-title'>输入表</span><span class='tcd-hint'>已接入 {props.upstream.length} 张表</span></div>
            {props.upstream.length === 0 ? <NEmpty size='small' description='请先连接一个上游表输入节点' /> : <div class='tcd-upstreams'>{props.upstream.map((item) => <NTooltip key={item.id}>{ { trigger: () => <span class='tcd-upstream'><strong>{item.alias}</strong><small>{item.fields.length} 个字段</small></span>, default: () => <div>{item.fields.length ? item.fields.map((f) => <div>{f.name} · {f.type}</div>) : '暂无字段信息'}</div> } }</NTooltip>)}</div>}
          </div>
          <div class='tcd-section'>
            <div class='tcd-title-row'><span class='tcd-title'>输出字段</span><NButton size='small' type='primary' ghost onClick={addOutput}>+ 添加输出字段</NButton></div>
            <div class='tcd-hint' style='margin-bottom:10px'>每条输出默认只保留一个字段，可继续添加；选择来源字段后按顺序添加 Flink SQL 转换。</div>
            {form.outputs.length === 0 ? <NEmpty size='small' description='暂无输出字段，请添加一行或检查上游字段' /> : <div class='tcd-output-list'>{form.outputs.map((output, index) => <div class={`tcd-output ${output.enabled === false ? 'disabled' : ''}`} key={output.id || index}>
              <div class='tcd-output-head'><div class='tcd-output-title'><NSwitch size='small' value={output.enabled !== false} aria-label={`写入 ${output.name || index + 1}`} onUpdate:value={(v: boolean) => updateOutput(index, { enabled: v })} /><span class='tcd-index'>{index + 1}</span><span class='tcd-output-label'>字段名</span><NInput size='small' value={output.name} placeholder='输出字段名' disabled={output.enabled === false} onUpdate:value={(v: string) => updateOutput(index, { name: v })} /><span class='tcd-output-type-label'>输出类型</span><NSelect class='tcd-output-type' size='small' value={output.type || output.sourceType || 'STRING'} options={TRANSFORM_TYPE_OPTIONS} disabled={output.enabled === false} onUpdate:value={(v: string) => updateOutput(index, { type: v })} /></div><NButton size='tiny' quaternary type='error' disabled={form.outputs.length <= 1} onClick={() => removeOutput(index)}>删除</NButton></div>
              <div class='tcd-output-body'>
                <div class='tcd-row'><span class='tcd-row-label'>来源字段</span><NSelect size='small' value={output.source || null} options={sourceOptions.value} placeholder={sourceOptions.value.length ? '选择来源字段（含类型）' : '暂无上游字段'} filterable clearable disabled={output.enabled === false} onUpdate:value={(v: string | null) => selectSource(index, v)} /></div>
                <div class='tcd-row tcd-transform-row'><span class='tcd-row-label'>转换链</span><div class='tcd-transform-content'>{output.steps?.length ? output.steps.map((step, stepIndex) => <div class='tcd-step' key={`${output.id || index}-${stepIndex}`}><NSelect size='small' value={step.op} options={TRANSFORM_OPERATION_OPTIONS} disabled={output.enabled === false} onUpdate:value={(v: string) => updateStep(step, v)} /><div class='tcd-step-params'>{renderParams(step)}</div><NButton size='tiny' quaternary type='error' disabled={output.enabled === false} onClick={() => removeStep(output, stepIndex)}>删除</NButton></div>) : <span class='tcd-no-step'>原样保留（未添加转换）</span>}<NButton class='tcd-add-step' size='tiny' quaternary type='primary' disabled={output.enabled === false} onClick={() => addStep(output)}>+ 添加转换</NButton></div></div>
                <div class='tcd-result-row'><span class='tcd-row-label'>生成表达式</span><div class='tcd-expression'><NTooltip>{ { trigger: () => <code>{expressionFor(output)}</code>, default: () => <span>{expressionFor(output)}</span> } }</NTooltip></div></div>
              </div>
            </div>)}</div>}
          </div>
          <NAlert type='info' showIcon style='margin:0 14px 16px'>标准操作会生成 Flink SQL；需要特殊逻辑时可选择“自定义表达式”，使用 <code>{'{{field}}'}</code> 引用当前结果。</NAlert>
          <div class='tcd-footer'><NSpace><NButton onClick={() => emit('update:visible', false)}>取消</NButton><NButton type='error' ghost onClick={() => { emit('delete', { id: props.nodeId }); emit('update:visible', false) }}>删除节点</NButton><NButton type='primary' onClick={onSave}>应用</NButton></NSpace></div>
        </NDrawerContent>
      </NDrawer>
    )
  }
})

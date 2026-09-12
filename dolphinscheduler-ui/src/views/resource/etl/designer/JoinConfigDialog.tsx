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
 * JOIN 节点配置对话框
 * 与 flinksql-etl 的 JoinConfigDialog.vue 功能对齐:
 *   - 基本信息
 *   - 连接与关联字段（支持多组 JOIN KEY）
 *   - 输出字段映射（源字段 / AS / 输出名）+ WHERE 筛选
 *   - SQL 预览
 *
 * props:
 *   visible   - boolean
 *   node      - 当前 join 节点的 CanvasNode
 *   upstream  - 上游节点数组 [{id, type, label, alias, fields:[{name,type}]}]
 *   onSave    - (config) => void
 *   onCancel  - () => void
 */

import { defineComponent, ref, reactive, watch, watchEffect, computed, PropType } from 'vue'
import {
  NDrawer,
  NDrawerContent,
  NCard,
  NSpace,
  NInput,
  NSelect,
  NButton,
  NDivider,
  NEmpty,
  NTag,
  NTooltip,
  NForm,
  NFormItem,
  useMessage
} from 'naive-ui'

interface UpstreamField { name: string; type: string }
interface UpstreamNode {
  id: string
  type: string
  label: string
  alias: string
  fields: UpstreamField[]
}
interface JoinKey {
  left: string
  right: string
}
interface OutputMapping {
  source: string
  field: string
  alias: string
}
interface JoinConfig {
  alias: string
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
  leftAlias: string
  rightAlias: string
  joinKeys: JoinKey[]
  // 兼容早期只保存一组关联字段的配置
  leftKey: string
  rightKey: string
  selectFields: string  // 'a.id AS id, b.name AS name'
  where: string
}

export default defineComponent({
  name: 'JoinConfigDialog',
  props: {
    visible: { type: Boolean, required: true },
    node: { type: Object as PropType<any>, required: true },
    upstream: { type: Array as PropType<UpstreamNode[]>, required: true },
    // 校验别名：传入 graph + isAliasUsed 函数（在父组件里实现）
    isAliasUsed: { type: Function as PropType<(alias: string, excludeNodeId: string) => boolean>, default: null }
  },
  emits: ['update:visible', 'saved'],
  setup(props, { emit }) {
    const message = useMessage()

    // 表单状态(本地副本,保存时再提交)
    // 使用 reactive 而非 ref({...})：方便直接 form.leftAlias = '...'（Vue 自动追踪嵌套字段变化）
    const form = reactive<JoinConfig>({
      alias: '',
      joinType: 'INNER',
      leftAlias: '',
      rightAlias: '',
      joinKeys: [],
      leftKey: '',
      rightKey: '',
      selectFields: '',
      where: ''
    })

    // 每次 visible=true 或 node 变化,重置 form
    watch(
      () => [props.visible, props.node?.id],
      ([v]) => {
        if (!v) return
        if (!props.node) return
        const cfg = (props.node?.config || {}) as Partial<JoinConfig>
        const legacyKeys = cfg.leftKey || cfg.rightKey
          ? [{ left: cfg.leftKey || '', right: cfg.rightKey || '' }]
          : []
        Object.assign(form, {
          alias: cfg.alias || '',
          joinType: (cfg.joinType as any) || 'INNER',
          leftAlias: cfg.leftAlias || '',
          rightAlias: cfg.rightAlias || '',
          joinKeys: Array.isArray(cfg.joinKeys) && cfg.joinKeys.length > 0
            ? cfg.joinKeys.map((k: any) => ({ left: k.left || k.srcCol || '', right: k.right || k.tgtCol || '' }))
            : legacyKeys,
          leftKey: cfg.leftKey || '',
          rightKey: cfg.rightKey || '',
          // 历史配置中的 '*' 不再作为有效输出，打开后要求明确配置字段。
          selectFields: cfg.selectFields && cfg.selectFields !== '*' ? cfg.selectFields : '',
          where: cfg.where || ''
        })
      },
      { immediate: true }
    )

    // 从 upstream 推断 left/right alias (按入边顺序)
    const inferredAliases = computed(() => {
      const ups = props.upstream || []
      const map: Record<string, string> = {}
      ups.forEach((u) => {
        // 节点 label = SQL 别名（label = alias）
        // 优先级：节点 label > config.alias > sanitizeAlias(id)
        const alias = (u.label && u.label.trim()) || u.alias || ('t_' + u.id.replace(/[^a-zA-Z0-9]/g, ''))
        map[u.id] = alias
      })
      return map
    })

    // 自动把 leftAlias / rightAlias 从 inferredAliases 带入
    // 关键点：用 watchEffect + flush:'post'
    //   父组件 openJoinDialog 会同时改 joinUpstream.value 和 joinDialogShow.value
    //   watchEffect 在 DOM 更新后再跑，确保 form 被重置之后再设置 alias
    //   解决了 watch(() => props.upstream, { immediate: true }) 只跑 1 次的 bug
    watchEffect(
      () => {
        const ups = props.upstream || []
        if (ups.length === 0) return
        if (!props.visible) return
        if (ups[0]) form.leftAlias = inferredAliases.value[ups[0].id] || ups[0].label || ups[0].id
        if (ups[1]) form.rightAlias = inferredAliases.value[ups[1].id] || ups[1].label || ups[1].id
      },
      { flush: 'post' }
    )

    // 上游 in1/in2 的字段列表
    const leftFields = computed<UpstreamField[]>(() => {
      try {
        return Array.isArray(props.upstream?.[0]?.fields) ? props.upstream[0].fields : []
      } catch { return [] }
    })
    const rightFields = computed<UpstreamField[]>(() => {
      try {
        return Array.isArray(props.upstream?.[1]?.fields) ? props.upstream[1].fields : []
      } catch { return [] }
    })

    // 新建 JOIN 时自动带入第一组同名字段；用户仍可继续添加多组关联键。
    watch(
      () => [props.visible, leftFields.value.length, rightFields.value.length],
      () => {
        if (!props.visible || form.joinKeys.length > 0 || leftFields.value.length === 0 || rightFields.value.length === 0) return
        const common = leftFields.value.find((left) => rightFields.value.some((right) => right.name === left.name))
        form.joinKeys = [{ left: common?.name || leftFields.value[0].name, right: common?.name || rightFields.value[0].name }]
      },
      { immediate: true }
    )

    const leftKeyMissing = (key: string) => Boolean(key) && !leftFields.value.some((f) => f.name === key)
    const rightKeyMissing = (key: string) => Boolean(key) && !rightFields.value.some((f) => f.name === key)

    const outputFieldPicker = ref<string | null>(null)

    // 把历史 selectFields（支持 source.field、source.field AS alias）统一转成可编辑映射行。
    const selectMappings = computed<OutputMapping[]>(() => {
      const raw = (form.selectFields || '').trim()
      if (!raw || raw === '*') return []
      return raw.split(',').map((expr) => {
        const parts = expr.trim().split(/\s+AS\s+/i)
        const sourceField = parts[0].trim()
        const segments = sourceField.split('.').map((item) => item.trim()).filter(Boolean)
        const field = segments.pop() || sourceField
        return {
          source: segments.pop() || '',
          field,
          alias: (parts[1] || field).trim()
        }
      }).filter((mapping) => mapping.field)
    })

    const serializeMappings = (mappings: OutputMapping[]) => {
      form.selectFields = mappings.length > 0
        ? mappings.map((mapping) => `${mapping.source}.${mapping.field} AS ${mapping.alias.trim()}`).join(', ')
        : ''
    }

    const duplicateOutputAliases = computed(() => {
      const seen = new Set<string>()
      const duplicates = new Set<string>()
      selectMappings.value.forEach((mapping) => {
        const alias = mapping.alias.trim().toLowerCase()
        if (!alias) return
        if (seen.has(alias)) duplicates.add(mapping.alias.trim())
        seen.add(alias)
      })
      return [...duplicates]
    })

    const outputMappingError = computed(() => {
      if (selectMappings.value.some((mapping) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(mapping.alias.trim()))) {
        return '输出名只能包含字母、数字和下划线，且不能以数字开头。'
      }
      if (duplicateOutputAliases.value.length > 0) {
        return `输出名重复：${duplicateOutputAliases.value.join('、')}，请修改后再保存。`
      }
      return ''
    })

    const addOutputMapping = (value: string | null) => {
      if (!value) return
      const [source, field] = value.split('.')
      const mappings = [...selectMappings.value]
      if (!mappings.some((mapping) => mapping.source === source && mapping.field === field)) {
        mappings.push({ source, field, alias: field })
        serializeMappings(mappings)
      }
      outputFieldPicker.value = null
    }

    const removeOutputMapping = (index: number) => {
      const mappings = selectMappings.value.filter((_, mappingIndex) => mappingIndex !== index)
      serializeMappings(mappings)
    }

    const updateOutputAlias = (index: number, alias: string) => {
      const mappings = selectMappings.value.map((mapping, mappingIndex) => (
        mappingIndex === index ? { ...mapping, alias } : mapping
      ))
      serializeMappings(mappings)
    }

    // 实时 SQL 预览
    const generatedSql = computed(() => {
      const f = form
      if (!f.leftAlias || !f.rightAlias) {
        return '-- 请先连入 2 个源（左侧主表 / 左下查表）'
      }
      const joinKeys = (f.joinKeys || []).filter((k) => k.left && k.right)
      if (joinKeys.length === 0) {
        return '-- 请选择关联字段'
      }
      if (selectMappings.value.length === 0) {
        return '-- 请至少选择一个输出字段，不能使用 SELECT *'
      }
      const selectSql = selectMappings.value.length > 0
        ? selectMappings.value.map((mapping) => `${mapping.source}.${mapping.field} AS ${mapping.alias.trim() || mapping.field}`).join(', ')
        : '*'
      const onExpr = joinKeys.map((k) => `${f.leftAlias}.${k.left} = ${f.rightAlias}.${k.right}`).join(' AND ')
      let sql = `SELECT ${selectSql}\nFROM ${f.leftAlias} ${f.joinType} JOIN ${f.rightAlias}\n  ON ${onExpr}`
      if (f.where && f.where.trim()) {
        sql += `\nWHERE ${f.where.trim()}`
      }
      return sql
    })

    const joinTypeOptions = [
      { label: '内连接 · INNER', value: 'INNER' },
      { label: '左连接 · LEFT', value: 'LEFT' },
      { label: '右连接 · RIGHT', value: 'RIGHT' },
      { label: '全连接 · FULL', value: 'FULL' }
    ]

    // 关联字段选项
    const leftKeyOptions = (key: string) => [
      ...(leftKeyMissing(key)
        ? [
            {
              label: `⚠ ${key} (已删除)`,
              value: key
            }
          ]
        : []),
      ...leftFields.value.map((f) => ({
        label: `${f.name} (${f.type})`,
        value: f.name
      }))
    ]
    const rightKeyOptions = (key: string) => [
      ...(rightKeyMissing(key)
        ? [
            {
              label: `⚠ ${key} (已删除)`,
              value: key
            }
          ]
        : []),
      ...rightFields.value.map((f) => ({
        label: `${f.name} (${f.type})`,
        value: f.name
      }))
    ]

    const addJoinKey = () => form.joinKeys.push({ left: '', right: '' })
    const removeJoinKey = (index: number) => {
      if (form.joinKeys.length <= 1) {
        form.joinKeys[0] = { left: '', right: '' }
        return
      }
      form.joinKeys.splice(index, 1)
    }

    const selectFieldOptions = computed(() => {
      // NSelect 用 render-prefix 区分主表/查表字段,扁平结构简单可靠
      const opts: Array<{ label: string; value: string }> = []
      const lAlias = form.leftAlias || 'A'
      const rAlias = form.rightAlias || 'B'
      ;(leftFields.value || []).forEach((f) => {
        if (!f || !f.name) return
        opts.push({
          label: `${lAlias}.${f.name} (${f.type || 'STRING'})`,
          value: `${lAlias}.${f.name}`
        })
      })
      ;(rightFields.value || []).forEach((f) => {
        if (!f || !f.name) return
        opts.push({
          label: `${rAlias}.${f.name} (${f.type || 'STRING'})`,
          value: `${rAlias}.${f.name}`
        })
      })
      return opts
    })

    const outputFieldType = (mapping: OutputMapping) => {
      const fields = mapping.source === form.rightAlias ? rightFields.value : leftFields.value
      return fields.find((field) => field.name === mapping.field)?.type || 'STRING'
    }

    function handleSave() {
      const alias = (form.alias || '').trim()
      if (!alias) {
        message.error('请填写别名')
        return
      }
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(alias)) {
        message.error('别名只能包含字母/数字/下划线，且首位必须是字母')
        return
      }
      if (props.isAliasUsed && props.isAliasUsed(alias, props.node?.id || '')) {
        message.error(`别名 "${alias}" 已被其他节点占用`)
        return
      }
      if (!form.leftAlias || !form.rightAlias) {
        message.error('请连入主表(in1)和查表(in2)')
        return
      }
      if (selectMappings.value.length === 0) {
        message.error('至少选择一个输出字段，不能使用 SELECT *')
        return
      }
      if (outputMappingError.value) {
        message.error(outputMappingError.value)
        return
      }
      const validKeys = form.joinKeys.filter((k) => k.left && k.right)
      if (validKeys.length === 0) {
        message.error('至少配置一组关联字段')
        return
      }
      form.joinKeys = validKeys
      form.leftKey = validKeys[0].left
      form.rightKey = validKeys[0].right
      // 别名 → 同步写入 form
      form.alias = alias
      emit('saved', JSON.parse(JSON.stringify(form)))
      emit('update:visible', false)
    }

    function handleCancel() {
      emit('update:visible', false)
    }

    return () => (
      <NDrawer
        show={props.visible}
        onUpdateShow={(v) => emit('update:visible', v)}
        width={560}
        placement='right'
      >
        <NDrawerContent title='表连接配置' closable>
        <NSpace vertical size='medium'>
          {/* 基本信息 */}
          <NCard class='etl-config-card' size='small' title='基本信息'>
            <NSpace vertical size='small'>
              <div style='display: grid; grid-template-columns: 118px minmax(0, 1fr); column-gap: 12px; align-items: center;'>
                <div>节点名称(别名) <span style='color: #f56c6c;'>*</span></div>
                <NInput
                  v-model:value={form.alias}
                  placeholder='例如 join1, join2'
                  style='width: 100%;'
                />
              </div>
              <div style='display: grid; grid-template-columns: 118px minmax(0, 1fr); column-gap: 12px; align-items: center;'>
                <div>类型</div>
                <NTag class='etl-node-type-tag' type='info' size='small'>join</NTag>
              </div>
            </NSpace>
          </NCard>

          {/* 连接类型与多组关联字段 */}
          <NCard class='etl-config-card' size='small' title='连接与关联字段'>
            <div class='etl-join-alias-grid'>
              <div>
                <div class='etl-join-field-label'>主表别名</div>
                <NInput value={form.leftAlias || '— 连入后自动带入 —'} readonly disabled />
              </div>
              <div>
                <div class='etl-join-field-label'>查表别名</div>
                <NInput value={form.rightAlias || '— 连入后自动带入 —'} readonly disabled />
              </div>
            </div>
            <div class='etl-join-type-row'>
              <div class='etl-join-field-label'>连接类型</div>
              <NSelect
                v-model:value={form.joinType}
                options={joinTypeOptions}
                consistent-menu-width={false}
              />
            </div>
            <div class='etl-join-key-toolbar'>
              <div class='etl-join-field-label'>
                关联字段 <span class='etl-join-required'>*</span>
                <NTooltip trigger='hover'>
                  {{
                    trigger: () => <span class='etl-help-icon' role='img' aria-label='关联字段说明'>?</span>,
                    default: () => <span>可添加多组字段配对，多个条件会使用 AND 连接，例如 ID = ID 且 TENANT_ID = TENANT_ID。</span>
                  }}
                </NTooltip>
              </div>
              <NButton size='small' type='primary' ghost onClick={addJoinKey}>+ 添加关联字段</NButton>
            </div>
            <div class='etl-join-key-list'>
              {form.joinKeys.map((key, index) => (
                <div class='etl-join-key-row' key={`join-key-${index}`}>
                  <NSelect
                    value={key.left || null}
                    options={leftKeyOptions(key.left)}
                    placeholder='选择主表字段'
                    filterable
                    clearable
                    onUpdateValue={(value: string) => { key.left = value || '' }}
                  />
                  <span class='etl-join-key-equals'>=</span>
                  <NSelect
                    value={key.right || null}
                    options={rightKeyOptions(key.right)}
                    placeholder='选择查表字段'
                    filterable
                    clearable
                    onUpdateValue={(value: string) => { key.right = value || '' }}
                  />
                  <NButton
                    size='small'
                    quaternary
                    type='error'
                    title={`删除第 ${index + 1} 组关联字段`}
                    aria-label={`删除第 ${index + 1} 组关联字段`}
                    onClick={() => removeJoinKey(index)}
                  >×</NButton>
                </div>
              ))}
            </div>
            {form.joinKeys.some((key) => leftKeyMissing(key.left) || rightKeyMissing(key.right)) && (
              <div class='etl-join-warning'>部分关联字段已不存在，请重新选择。</div>
            )}
          </NCard>

          {/* 输出与筛选 */}
          <NCard class='etl-config-card' size='small' title='输出与筛选'>
            <div class='etl-output-toolbar'>
              <div class='etl-join-field-label'>输出字段 <span class='etl-join-required'>*</span><span class='etl-output-default-hint'>必须明确配置</span></div>
              {leftFields.value.length === 0 && rightFields.value.length === 0 ? (
                <NEmpty size='small' description='先连入主表和查表后会出现字段' />
              ) : (
                <NSelect
                  v-model:value={outputFieldPicker.value}
                  options={selectFieldOptions.value}
                  placeholder='添加输出字段'
                  filterable
                  clearable
                  onUpdateValue={addOutputMapping}
                />
              )}
            </div>
            {selectMappings.value.length > 0 && (
              <div class='etl-output-mapping-table'>
                <div class='etl-output-mapping-header'>
                  <span>源字段</span>
                  <span>表达式</span>
                  <span>输出名</span>
                  <span></span>
                </div>
                <div class='etl-output-mapping-list'>
                  {selectMappings.value.map((mapping, index) => (
                    <div class='etl-output-mapping-row' key={`output-${mapping.source}-${mapping.field}-${index}`}>
                      <div class='etl-output-source'>
                        <span>{mapping.source}.{mapping.field}</span>
                        <small>{outputFieldType(mapping)}</small>
                      </div>
                      <span class='etl-output-as'>AS</span>
                      <NInput
                        value={mapping.alias}
                        size='small'
                        status={outputMappingError.value && duplicateOutputAliases.value.some((alias) => alias.toLowerCase() === mapping.alias.trim().toLowerCase()) ? 'error' : undefined}
                        placeholder={mapping.field}
                        onUpdateValue={(value: string) => updateOutputAlias(index, value)}
                      />
                      <NButton
                        size='small'
                        quaternary
                        type='error'
                        title={`移除 ${mapping.source}.${mapping.field}`}
                        aria-label={`移除 ${mapping.source}.${mapping.field}`}
                        onClick={() => removeOutputMapping(index)}
                      >×</NButton>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {outputMappingError.value && (
              <div class='etl-output-mapping-error'>{outputMappingError.value}</div>
            )}
            <div class='etl-join-field-label'>筛选条件 (WHERE)</div>
            <NInput
              v-model:value={form.where}
              type='textarea'
              autosize={{ minRows: 2, maxRows: 4 }}
              placeholder='可选,例如 a.price > 0 或 b.status = "ACTIVE"'
            />
          </NCard>

          {/* 卡片 4: SQL 预览 */}
          <NCard class='etl-config-card' size='small' title='SQL 预览'>
            <pre style='background: #1e293b; color: #ecf0ff; padding: 12px; border-radius: 6px; font-size: 12px; margin: 0; white-space: pre-wrap; font-family: Menlo, Consolas, "Courier New", monospace;'>
{generatedSql.value}
            </pre>
          </NCard>
        </NSpace>

        {/* 底部按钮 */}
        <NSpace justify='end' style='margin-top: 16px;'>
          <NButton onClick={handleCancel}>取消</NButton>
          <NButton type='primary' onClick={handleSave}>保存</NButton>
        </NSpace>
        </NDrawerContent>
      </NDrawer>
    )
  }
})

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
 *   - 卡片 1: 别名 + 连接类型
 *   - 卡片 2: 主表/查表的关联字段（下拉 from 上游 fields）
 *   - 卡片 3: 输出字段多选 + WHERE 筛选
 *   - 卡片 4: SQL 预览
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
  NRadioGroup,
  NRadioButton,
  NSelect,
  NButton,
  NDivider,
  NEmpty,
  NTag,
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
interface JoinConfig {
  alias: string
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
  leftAlias: string
  rightAlias: string
  leftKey: string
  rightKey: string
  selectFields: string  // '*' or 'a.id, b.name'
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
      leftKey: '',
      rightKey: '',
      selectFields: '*',
      where: ''
    })

    // 每次 visible=true 或 node 变化,重置 form
    watch(
      () => [props.visible, props.node?.id],
      ([v]) => {
        if (!v) return
        if (!props.node) return
        const cfg = (props.node?.config || {}) as Partial<JoinConfig>
        Object.assign(form, {
          alias: cfg.alias || '',
          joinType: (cfg.joinType as any) || 'INNER',
          leftAlias: cfg.leftAlias || '',
          rightAlias: cfg.rightAlias || '',
          leftKey: cfg.leftKey || '',
          rightKey: cfg.rightKey || '',
          selectFields: cfg.selectFields || '*',
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

    // 上游字段是否还包含已配置的 leftKey / rightKey
    const leftKeyMissing = computed(() => {
      if (!form.leftKey) return false
      return !leftFields.value.some((f) => f.name === form.leftKey)
    })
    const rightKeyMissing = computed(() => {
      if (!form.rightKey) return false
      return !rightFields.value.some((f) => f.name === form.rightKey)
    })

    // selectFields 多选（双向桥接）
    const selectFieldList = computed<Array<string>>({
      get() {
        const raw = (form.selectFields || '').trim()
        if (!raw || raw === '*') return []
        return raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      },
      set(arr: string[]) {
        if (!arr || arr.length === 0) {
          form.selectFields = '*'
        } else {
          form.selectFields = arr.join(', ')
        }
      }
    })

    // 实时 SQL 预览
    const generatedSql = computed(() => {
      const f = form
      if (!f.leftAlias || !f.rightAlias) {
        return '-- 请先连入 2 个源（左侧主表 / 左下查表）'
      }
      if (!f.leftKey || !f.rightKey) {
        return '-- 请选择关联字段'
      }
      const cols = (f.selectFields || '*').trim() || '*'
      let sql = `SELECT ${cols}\nFROM ${f.leftAlias} ${f.joinType} JOIN ${f.rightAlias}\n  ON ${f.leftAlias}.${f.leftKey} = ${f.rightAlias}.${f.rightKey}`
      if (f.where && f.where.trim()) {
        sql += `\nWHERE ${f.where.trim()}`
      }
      return sql
    })

    // select 选项
    const leftKeyOptions = computed(() => [
      ...(leftKeyMissing.value
        ? [
            {
              label: `⚠ ${form.leftKey} (已删除)`,
              value: form.leftKey
            }
          ]
        : []),
      ...leftFields.value.map((f) => ({
        label: `${f.name} (${f.type})`,
        value: f.name
      }))
    ])
    const rightKeyOptions = computed(() => [
      ...(rightKeyMissing.value
        ? [
            {
              label: `⚠ ${form.rightKey} (已删除)`,
              value: form.rightKey
            }
          ]
        : []),
      ...rightFields.value.map((f) => ({
        label: `${f.name} (${f.type})`,
        value: f.name
      }))
    ])

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
      if (!form.leftKey || !form.rightKey) {
        message.error('请选择关联字段')
        return
      }
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
          {/* 卡片 1: 基本信息 */}
          <NCard size='small' title={<span><NTag type='primary' size='small' bordered={false}>1</NTag> 基本信息</span>}>
            <NSpace vertical size='medium'>
              <div>
                <div style='margin-bottom: 6px;'>节点别名 <span style='color: #f56c6c;'>*</span></div>
                <NInput
                  v-model:value={form.alias}
                  placeholder='例如 join1, join2'
                  style='width: 280px;'
                />
                <span style='color: #999; font-size: 12px; margin-left: 8px;'>全局唯一,用于 SQL 引用</span>
              </div>
              <div>
                <div style='margin-bottom: 6px;'>连接类型</div>
                <NRadioGroup v-model:value={form.joinType}>
                  <NRadioButton value='INNER'>内连接 INNER</NRadioButton>
                  <NRadioButton value='LEFT'>左连接 LEFT</NRadioButton>
                  <NRadioButton value='RIGHT'>右连接 RIGHT</NRadioButton>
                  <NRadioButton value='FULL'>全连接 FULL</NRadioButton>
                </NRadioGroup>
              </div>
            </NSpace>
          </NCard>

          {/* 卡片 2: 关联字段 */}
          <NCard size='small' title={<span><NTag type='primary' size='small' bordered={false}>2</NTag> 关联字段</span>}>
            <div style='color: #999; font-size: 12px; margin-bottom: 12px;'>
              主表(in1,左上端口)与查表(in2,左下端口)通过字段关联
            </div>
            <div style='display: grid; grid-template-columns: 1fr 1fr; gap: 16px;'>
              <div>
                <div style='margin-bottom: 6px;'>主表别名(只读)</div>
                <NInput
                  value={form.leftAlias || '— 连入后会从上游节点自动带入 —'}
                  readonly
                  disabled
                  style='margin-bottom: 12px;'
                />
                <div style='margin-bottom: 6px;'>
                  主表关联字段 <span style='color: #f56c6c;'>*</span>
                </div>
                {leftFields.value.length === 0 && !leftKeyMissing.value ? (
                  <NEmpty size='small' description='先连入主表后会出现字段' />
                ) : (
                  <NSelect
                    v-model:value={form.leftKey}
                    options={leftKeyOptions.value}
                    placeholder='从主表字段中选择'
                    filterable
                    clearable
                  />
                )}
                {leftKeyMissing.value && (
                  <div style='margin-top: 6px; padding: 6px 10px; font-size: 12px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px;'>
                    上游 <b>{form.leftAlias || '主表'}</b> 的 <code>{form.leftKey}</code> 字段已不存在,请重新选择。
                  </div>
                )}
              </div>
              <div>
                <div style='margin-bottom: 6px;'>查表别名(只读)</div>
                <NInput
                  value={form.rightAlias || '— 连入后会从上游节点自动带入 —'}
                  readonly
                  disabled
                  style='margin-bottom: 12px;'
                />
                <div style='margin-bottom: 6px;'>
                  查表关联字段 <span style='color: #f56c6c;'>*</span>
                </div>
                {rightFields.value.length === 0 && !rightKeyMissing.value ? (
                  <NEmpty size='small' description='先连入查表后会出现字段' />
                ) : (
                  <NSelect
                    v-model:value={form.rightKey}
                    options={rightKeyOptions.value}
                    placeholder='从查表字段中选择'
                    filterable
                    clearable
                  />
                )}
                {rightKeyMissing.value && (
                  <div style='margin-top: 6px; padding: 6px 10px; font-size: 12px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px;'>
                    上游 <b>{form.rightAlias || '查表'}</b> 的 <code>{form.rightKey}</code> 字段已不存在,请重新选择。
                  </div>
                )}
              </div>
            </div>
          </NCard>

          {/* 卡片 3: 输出与筛选 */}
          <NCard size='small' title={<span><NTag type='primary' size='small' bordered={false}>3</NTag> 输出与筛选</span>}>
            <div style='margin-bottom: 6px;'>输出字段 <span style='color: #999; font-size: 12px;'>(不选默认全部 *)</span></div>
            {leftFields.value.length === 0 && rightFields.value.length === 0 ? (
              <NEmpty size='small' description='先连入主表和查表后会出现字段' />
            ) : (
              <NSelect
                v-model:value={selectFieldList.value}
                multiple
                options={selectFieldOptions.value}
                placeholder='可多选上游字段(不选默认全部)'
                max-tag-count={20}
                style='margin-bottom: 12px;'
              />
            )}
            <div style='margin-top: 6px; color: #999; font-size: 12px; margin-bottom: 12px;'>
              例如: <code>a.id, b.user_name</code>(全选字段默认 SQL 输出 <code>*</code>)
            </div>
            <div style='margin-bottom: 6px;'>筛选条件 (WHERE)</div>
            <NInput
              v-model:value={form.where}
              type='textarea'
              autosize={{ minRows: 2, maxRows: 4 }}
              placeholder='可选,例如 a.price > 0 或 b.status = "ACTIVE"'
            />
          </NCard>

          {/* 卡片 4: SQL 预览 */}
          <NCard size='small' title={<span><NTag type='primary' size='small' bordered={false}>4</NTag> SQL 预览</span>}>
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
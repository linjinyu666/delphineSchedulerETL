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

import { defineComponent, ref, watch, nextTick, computed, h } from 'vue'
import {
  NSelect,
  NSpin,
  NEmpty,
  NSpace,
  NButton,
  NDataTable,
  NTag
} from 'naive-ui'
import {
  queryDataSourceList,
  getDatasourceDatabasesById,
  getDatasourceTablesById,
  getDatasourceTableColumnsById
} from '@/service/modules/data-source'

interface Option {
  label: string
  value: string | number
}

function normalizeColumnType(type: any): string {
  const value = String(type || 'STRING').trim().toUpperCase()
  return value.replace(/\s+UNSIGNED\b/g, '') || 'STRING'
}

export default defineComponent({
  name: 'CascadeConfig',
  props: {
    modelValue: {
      type: Object,
      required: true
    },
    mode: {
      type: String,
      default: 'source'
    }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const dsType = ref<string | null>(props.modelValue?.dsType ?? null)
    const dsId = ref<number | null>(props.modelValue?.dsId ?? null)
    const database = ref<string | null>(props.modelValue?.database ?? null)
    const table = ref<string | null>(props.modelValue?.table ?? null)
    // 旧作业保存的是 {name,type}[]，早期版本也可能保存 string[]。
    // 统一成列名数组，避免重新打开作业时字段选中状态丢失。
    const normalizeColumnNames = (items: any): string[] => {
      if (!Array.isArray(items)) return []
      return items
        .map((item: any) => typeof item === 'string' ? item : (item?.name || item?.value || ''))
        .map((name: any) => String(name || '').trim())
        .filter(Boolean)
    }
    const columns = ref<string[]>(normalizeColumnNames(props.modelValue?.columns))

    const dsTypeOptions = ref<Option[]>([])
    const dsInstanceOptions = ref<Option[]>([])
    const databaseOptions = ref<Option[]>([])
    const tableOptions = ref<Option[]>([])
    const columnOptions = ref<Option[]>([])

    const loadingDs = ref(false)
    const loadingInstances = ref(false)
    const loadingDb = ref(false)
    const loadingTable = ref(false)
    const loadingColumn = ref(false)

    const selectedCount = computed(() => new Set(columns.value).size)
    const primaryCount = computed(() => columnOptions.value.filter((c: any) => c._primary).length)
    const primaryColumnValues = computed(() =>
      columnOptions.value.filter((c: any) => c._primary).map((c: any) => String(c.value))
    )
    const ensurePrimaryColumns = () => {
      const required = primaryColumnValues.value
      if (required.length === 0) return
      const next = Array.from(new Set([...required, ...columns.value]))
      if (next.length !== columns.value.length || next.some((name, index) => name !== columns.value[index])) {
        columns.value = next
      }
    }

    const DATASOURCE_TYPES = [
      'MYSQL', 'POSTGRESQL', 'HIVE', 'CLICKHOUSE', 'ORACLE', 'DAMENG',
      'SQLSERVER', 'DB2', 'PRESTO', 'REDSHIFT', 'ATHENA',
      'TRINO', 'STARROCKS', 'AZURESQL', 'DAMENG', 'OCEANBASE',
      'KYUUBI', 'DATABEND', 'VERTICA', 'HANA', 'DORIS', 'DOLPHINDB'
    ]

    dsTypeOptions.value = DATASOURCE_TYPES.map((t) => ({ label: t, value: t }))

    const emitChange = () => {
      // 主键是写入模式和比对节点的基础字段，始终保留在输出列中。
      ensurePrimaryColumns()
      // 把 columns 从 string[] 转成 {name, type}[]，让后端 / 下游 pipeline-builder 拿到真实类型
      const colsWithType = columns.value.map((col: any) => {
        if (typeof col === 'string') {
          // 从 columnOptions 反查类型
          const opt = columnOptions.value.find((c: any) => c.value === col)
          return {
            name: col,
            type: normalizeColumnType((opt as any)?._type || 'STRING'),
            primary: !!(opt && opt._primary)
          }
        }
        return {
          ...col,
          type: normalizeColumnType(col.type || col.dataType || 'STRING')
        }
      })
      emit('update:modelValue', {
        dsType: dsType.value,
        dsId: dsId.value,
        datasourceAlias: dsInstanceOptions.value.find((o) => o.value === dsId.value)?.label || String(dsId.value || ''),
        database: database.value,
        table: table.value,
        columns: colsWithType
      })
      emit('change')
    }

    const reset = () => {
      database.value = null
      table.value = null
      columns.value = []
      databaseOptions.value = []
      tableOptions.value = []
      columnOptions.value = []
    }

    const loadInstances = async (type: string) => {
      loadingInstances.value = true
      try {
        const list = await queryDataSourceList({ type })
        dsInstanceOptions.value = (list || []).map((item: any) => ({
          label: item.name,
          value: item.id
        }))
      } catch (e) {
        dsInstanceOptions.value = []
      } finally {
        loadingInstances.value = false
      }
    }

    const loadDatabases = async (id: number) => {
      loadingDb.value = true
      databaseOptions.value = []
      try {
        const resp = await getDatasourceDatabasesById(id)
        // axios 返回的是 {code, msg, data, ...} 包装, 实际数组在 resp.data
        // 兼容后端直接返回数组的情况 (response interceptor 移除包装)
        const list = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.data) ? resp.data : [])
        // 后端可能返回两种结构：字符串数组 / [{label, value}] 对象
        databaseOptions.value = list.map((d: any) =>
          typeof d === 'string'
            ? { label: d, value: d }
            : { label: d.label || d.value, value: d.value }
        )
      } catch (e) {
        databaseOptions.value = []
      } finally {
        loadingDb.value = false
      }
    }

    const loadTables = async (id: number, db: string) => {
      loadingTable.value = true
      tableOptions.value = []
      try {
        const list = await getDatasourceTablesById(id, db)
        tableOptions.value = (list || []).map((t: any) =>
          typeof t === 'string'
            ? { label: t, value: t }
            : { label: t.label || t.value, value: t.value }
        )
      } catch (e) {
        tableOptions.value = []
      } finally {
        loadingTable.value = false
      }
    }

    const loadColumns = async (id: number, db: string, tbl: string) => {
      loadingColumn.value = true
      columnOptions.value = []
      try {
        const list = await getDatasourceTableColumnsById(id, db, tbl)
        columnOptions.value = (list || []).map((c: any) => {
          const label = typeof c === 'string' ? c : c.label || c.value
          // value 必须是真实列名（不含类型和 NOT NULL 标记），否则后续 emit 会把整段当 name 传给后端
          const value = (typeof c === 'string' ? c : (c.value || label)).trim().split(/\s+/)[0]
          // 解析 label 拆出类型 / 主键 / 可空 / 说明
          const parsed = parseColumnLabelFn(label)
          return {
            label,
            value,
            _name: parsed.name,
            _type: normalizeColumnType(parsed.size ? `${parsed.type}(${parsed.size})` : parsed.type),
            _primary: parsed.primary,
            _nullable: parsed.nullable,
            _comment: parsed.comment
          }
        })
        // 新表默认全选字段，再确保主键即使被旧配置遗漏也自动加入选中集合。
        if (columns.value.length === 0) {
          columns.value = columnOptions.value.map((c: any) => String(c.value))
        }
        ensurePrimaryColumns()
      } catch (e) {
        columnOptions.value = []
      } finally {
        loadingColumn.value = false
      }
    }

    // 提前声明 parser（在 setup 中后定义前向引用）
    const parseColumnLabelFn = (label: string) => {
      const result: any = { name: label, type: '', size: '', primary: false, nullable: true, comment: '' }
      const trimmed = label.trim()
      // 先把所有 [..] 整体（包括带空格的 [NOT NULL]）从 label 里抽出来
      const bracketRe = /\[([^\]]*)\]/g
      const brackets: string[] = []
      let stripped = trimmed.replace(bracketRe, (_m, inner) => {
        brackets.push(inner)
        return ''
      }).trim()
      // 现在 stripped 是 "name TYPE(size)"、"name TYPE(p,s)" 或
      // MySQL 驱动常见的 "name INT UNSIGNED"。
      const headMatch = stripped.match(/^(\S+)\s+(.+)$/)
      if (headMatch) {
        result.name = headMatch[1]
        const typePart = headMatch[2].trim().replace(/\s+UNSIGNED\b/ig, '')
        // 兼容 (size) 与 (p,s) 两种精度写法
        const tm = typePart.match(/^([A-Za-z][A-Za-z0-9_]*)(?:\((\d+)(?:,(\d+))?\))?$/)
        if (tm) {
          result.type = tm[1]
          if (tm[2] != null) {
            result.size = tm[3] != null ? `${tm[2]},${tm[3]}` : tm[2]
          }
        }
      } else {
        // 只有 name, 没有类型: "id"
        result.name = stripped
      }
      // brackets[0] 是 NULL/NOT NULL, brackets[1] 是 comment
      for (const inner of brackets) {
        const up = inner.toUpperCase().trim()
        if (up === 'NULL') result.nullable = true
        else if (up === 'NOT NULL') result.nullable = false
        else if (up === 'PK' || up === 'PRIMARY KEY' || up === 'PRIMARY_KEY' || up === 'PRIMARYKEY') {
          result.primary = true
        }
        else result.comment = (result.comment ? result.comment + ' ' : '') + inner
      }
      return result
    }

    watch(dsType, async (v) => {
      if (!v) {
        dsInstanceOptions.value = []
        reset()
        emitChange()
        return
      }
      dsId.value = null
      reset()
      await loadInstances(v)
      emitChange()
    })

    watch(dsId, async (v) => {
      if (!v) {
        databaseOptions.value = []
        reset()
        emitChange()
        return
      }
      reset()
      await loadDatabases(v)
      emitChange()
    })

    watch(database, async (v) => {
      if (!v || !dsId.value) {
        tableOptions.value = []
        table.value = null
        columns.value = []
        columnOptions.value = []
        emitChange()
        return
      }
      table.value = null
      columns.value = []
      tableOptions.value = []
      columnOptions.value = []
      await loadTables(dsId.value, v)
      emitChange()
    })

    watch(table, async (v) => {
      if (!v || !dsId.value || !database.value) {
        columnOptions.value = []
        columns.value = []
        emitChange()
        return
      }
      columns.value = []
      columnOptions.value = []
      await loadColumns(dsId.value, database.value, v)
    })

    // 抽屉可能在不同节点之间复用，父组件更新作业数据时同步本地级联状态。
    watch(() => props.modelValue, (value: any) => {
      if (!value) return
      dsType.value = value.dsType ?? null
      dsId.value = value.dsId ?? null
      database.value = value.database ?? null
      table.value = value.table ?? null
      const nextColumns = normalizeColumnNames(value.columns)
      if (JSON.stringify(nextColumns) !== JSON.stringify(columns.value)) {
        columns.value = nextColumns
      }
    }, { deep: true })

    watch(columns, () => emitChange(), { deep: true })

    if (dsType.value) loadInstances(dsType.value)
    if (dsId.value) loadDatabases(dsId.value)
    if (dsId.value && database.value) loadTables(dsId.value, database.value)
    if (dsId.value && database.value && table.value) {
      loadColumns(dsId.value, database.value, table.value)
    }

    // 字段表格列：把选择状态和主键必选状态放在同一行，减少用户对“为什么删不掉”的疑惑。
    const columnTableColumns = computed(() => {
      return [
        {
          title: '状态',
          key: 'selected',
          width: 72,
          render: (row: any) => row._primary
            ? h(NTag, { type: 'warning', size: 'small', bordered: false }, { default: () => '必选' })
            : columns.value.includes(row.value)
              ? h(NTag, { type: 'success', size: 'small', bordered: false }, { default: () => '已选' })
              : h('span', { class: 'cascade-field-unselected' }, '未选')
        },
        {
          title: '字段名',
          key: 'name',
          minWidth: 150,
          render: (row: any) =>
            h(
              'span',
              { class: row._primary ? 'cascade-field-primary-name' : '' },
              row._name
            )
        },
        {
          title: '类型',
          key: 'type',
          render: (row: any) => row._type || '-'
        },
        {
          title: '是否主键',
          key: 'primary',
          width: 90,
          render: (row: any) =>
            row._primary
              ? h(NTag, { type: 'primary', size: 'small', bordered: false }, { default: () => '主键 · 必选' })
              : h('span', { class: 'cascade-field-muted' }, '否')
        }
      ]
    })

    // 注入字段表格的样式
    if (typeof document !== 'undefined' && !document.getElementById('cascade-config-styles')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'cascade-config-styles'
      styleEl.textContent = `
        .etl-node-config-form {
          padding: 2px 0 8px;
        }
        .etl-node-config-section {
          margin-bottom: 16px;
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
        }
        .etl-node-config-overview {
          padding-bottom: 4px;
        }
        .etl-node-config-overview .etl-node-config-item {
          margin-bottom: 0;
        }
        .etl-node-config-overview .n-form-item-feedback-wrapper {
          min-height: 0;
        }
        .etl-node-config-section-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }
        .etl-node-config-section-hint {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 400;
        }
        .etl-node-config-overview-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .etl-node-config-overview-grid .etl-node-config-item {
          display: grid;
          grid-template-columns: 118px minmax(0, 1fr);
          column-gap: 12px;
          align-items: center;
        }
        .etl-node-config-overview-grid .n-form-item-label {
          align-self: center;
          margin-bottom: 0;
        }
        .etl-node-config-overview-grid .n-form-item-blank {
          grid-column: 2;
          grid-row: 1;
          min-width: 0;
        }
        .etl-node-config-overview-grid .n-form-item-feedback-wrapper {
          grid-column: 2;
          grid-row: 2;
          margin-top: 4px;
          min-height: 0;
        }
        .etl-node-config-item {
          margin-bottom: 14px;
        }
        .etl-node-config-item--alias,
        .etl-node-config-item--cascade {
          min-width: 0;
        }
        .etl-node-config-item--type .n-form-item-blank {
          min-height: 34px;
          align-items: center;
        }
        .etl-node-config-fields > .n-form-item:last-child {
          margin-bottom: 0;
        }
        .etl-node-config-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 4px;
        }
        @media (max-width: 640px) {
          .etl-node-config-overview-grid {
            grid-template-columns: 1fr;
          }
          .cascade-config-grid {
            grid-template-columns: 1fr;
          }
          .cascade-config-section-heading,
          .cascade-field-toolbar,
          .etl-node-config-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }
        .cascade-field-panel {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          overflow: hidden;
        }
        .cascade-field-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px 10px;
          background: #f8fafc;
          border-bottom: 1px solid #eef2f7;
          flex-wrap: wrap;
        }
        .cascade-field-title {
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }
        .cascade-field-hint {
          margin-top: 2px;
          color: #64748b;
          font-size: 12px;
          line-height: 18px;
        }
        .cascade-field-summary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          color: #475569;
          font-size: 12px;
          background: #fff;
        }
        .cascade-config-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .cascade-config-section {
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
        }
        .cascade-config-section-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
        }
        .cascade-config-section-hint {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 400;
        }
        .cascade-config-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 14px;
        }
        .cascade-config-field {
          min-width: 0;
        }
        .cascade-config-field--full {
          grid-column: 1 / -1;
        }
        .cascade-config-label {
          display: block;
          margin-bottom: 6px;
          color: #475569;
          font-size: 13px;
          line-height: 18px;
        }
        .cascade-config-label-required {
          color: #ef4444;
        }
        .cascade-field-table {
          max-height: 300px;
          overflow: auto;
          scrollbar-width: thin;
        }
        .cascade-field-table::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .cascade-field-table::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #cbd5e1;
        }
        .cascade-field-panel .n-data-table-tbody .n-data-table-tr {
          cursor: pointer;
        }
        .cascade-field-panel .n-data-table-tbody .n-data-table-tr:focus-visible {
          outline: 2px solid #60a5fa;
          outline-offset: -2px;
        }
        .cascade-field-primary-name {
          color: #1d4ed8;
          font-weight: 600;
        }
        .cascade-field-muted,
        .cascade-field-unselected {
          color: #94a3b8;
        }
        .cascade-field-panel .n-data-table {
          border-top: 1px solid #eef2f7;
        }
        .n-data-table-tr.selected-row td {
          background-color: #eff6ff !important;
        }
        .n-data-table-tr.selected-row:hover td {
          background-color: #dbeafe !important;
        }
        .n-data-table-tr.primary-row td {
          background-color: #fffbeb !important;
        }
        .n-data-table-tr.primary-row.selected-row td {
          background-color: #eff6ff !important;
        }
        .n-data-table-tr {
          cursor: pointer;
        }
      `
      document.head.appendChild(styleEl)
    }

    // 默认全选
    const handleSelectAll = () => {
      columns.value = columnOptions.value.map((c) => c.value)
    }
    const handleClearAll = () => {
      // 主键字段是目标表写入和比对的必要条件，清空操作只清理普通字段。
      columns.value = primaryColumnValues.value
    }
    // 单列切换 (在字段表格中点行)
    const handleToggleColumn = (col: any) => {
      if (col._primary) return
      const idx = columns.value.indexOf(col.value)
      if (idx >= 0) {
        columns.value = columns.value.filter((c: string) => c !== col.value)
      } else {
        columns.value = [...columns.value, col.value]
      }
    }

    // 字段加载完后默认全选
    watch(columnOptions, async (v) => {
      if (v.length > 0 && columns.value.length === 0) {
        await nextTick()
        columns.value = v.map((c) => c.value)
      }
      ensurePrimaryColumns()
    })

    return () => (
      <div class='cascade-config-layout'>
        <section class='cascade-config-section'>
          <div class='cascade-config-section-heading'>
            <span>{props.mode === 'sink' ? '目标数据源' : '数据源'} <span class='cascade-config-label-required'>*</span></span>
            <span class='cascade-config-section-hint'>按顺序选择数据源、库和表</span>
          </div>
          <div class='cascade-config-grid'>
            <div class='cascade-config-field'>
              <label class='cascade-config-label'>数据源类型 <span class='cascade-config-label-required'>*</span></label>
          <NSelect
            v-model:value={dsType.value}
            options={dsTypeOptions.value}
            placeholder='请选择数据库类型'
            filterable
            clearable
          />
            </div>
            <div class='cascade-config-field'>
              <label class='cascade-config-label'>数据源实例 <span class='cascade-config-label-required'>*</span></label>
          {loadingInstances.value ? (
            <NSpin size='small' />
          ) : dsInstanceOptions.value.length === 0 && dsType.value ? (
            <NEmpty size='small' description='该类型暂无数据源实例，请先到"数据源中心"创建' />
          ) : (
            <NSelect
              v-model:value={dsId.value}
              options={dsInstanceOptions.value}
              placeholder='请选择数据源实例'
              filterable
              clearable
              disabled={!dsType.value}
            />
          )}
            </div>
            <div class='cascade-config-field'>
              <label class='cascade-config-label'>Schema / 数据库 <span class='cascade-config-label-required'>*</span></label>
          {loadingDb.value ? (
            <NSpin size='small' />
          ) : databaseOptions.value.length === 0 && dsId.value ? (
            <NSpace vertical>
              <NEmpty size='small' description='该数据源无多 schema 列表（MySQL 等单库数据库无需选择）' />
              <NButton
                size='small'
                onClick={() => {
                  database.value = 'default'
                  emitChange()
                }}
              >
                使用默认（default）
              </NButton>
            </NSpace>
          ) : (
            <NSelect
              v-model:value={database.value}
              options={databaseOptions.value}
              placeholder='请选择数据库'
              filterable
              clearable
              disabled={!dsId.value}
            />
          )}
            </div>
            <div class='cascade-config-field'>
              <label class='cascade-config-label'>表名 <span class='cascade-config-label-required'>*</span></label>
          {loadingTable.value ? (
            <NSpin size='small' />
          ) : tableOptions.value.length === 0 && database.value ? (
            <NEmpty size='small' description='该数据库下无表' />
          ) : (
            <NSelect
              v-model:value={table.value}
              options={tableOptions.value}
              placeholder='请选择表'
              filterable
              clearable
              disabled={!database.value}
            />
          )}
            </div>
          </div>
        </section>
        <section class='cascade-field-panel'>
          <div class='cascade-field-toolbar'>
            <div>
              <div class='cascade-field-title'>字段 <span style='color: #f56c6c;'>*</span></div>
              <div class='cascade-field-hint'>点击字段行即可选择或取消；主键字段会自动保留</div>
            </div>
            <div style='display: flex; align-items: center; gap: 6px; flex-wrap: wrap;'>
              <NButton size='tiny' onClick={handleSelectAll}>全选</NButton>
              <NButton size='tiny' onClick={handleClearAll}>清空可选</NButton>
              <NTag size='small' type='info'>
                已选 {selectedCount.value} / {columnOptions.value.length}
              </NTag>
            </div>
          </div>
          {primaryCount.value > 0 && (
            <div class='cascade-field-summary'>
              <NTag size='small' type='warning' bordered={false}>主键必选</NTag>
              <span>检测到 {primaryCount.value} 个主键字段，已自动加入选中项</span>
            </div>
          )}
          {loadingColumn.value ? (
            <NSpin size='small' />
          ) : columnOptions.value.length === 0 ? (
            <NEmpty size='small' description='请先选择表' />
          ) : (
            <div class='cascade-field-table'>
              <NDataTable
                size='small'
                columns={columnTableColumns.value}
                data={columnOptions.value}
                pagination={false}
                row-key={(row: any) => row.value}
                row-class-name={(row: any) =>
                  [
                    columns.value.includes(row.value) ? 'selected-row' : '',
                    row._primary ? 'primary-row' : ''
                  ].filter(Boolean).join(' ')
                }
                row-props={(row: any) => ({
                  role: 'button',
                  tabindex: row._primary ? -1 : 0,
                  'aria-label': row._primary ? `${row._name}（主键，必选）` : `${row._name}（${columns.value.includes(row.value) ? '已选，点击取消' : '未选，点击选择'}）`,
                  'aria-pressed': columns.value.includes(row.value),
                  onClick: () => handleToggleColumn(row),
                  onKeydown: (event: KeyboardEvent) => {
                    if ((event.key === 'Enter' || event.key === ' ') && !row._primary) {
                      event.preventDefault()
                      handleToggleColumn(row)
                    }
                  }
                })}
              />
            </div>
          )}
        </section>
      </div>
    )
  }
})

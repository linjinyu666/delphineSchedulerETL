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
    const columns = ref<string[]>(Array.isArray(props.modelValue?.columns) ? props.modelValue.columns : [])

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

    const DATASOURCE_TYPES = [
      'MYSQL', 'POSTGRESQL', 'HIVE', 'CLICKHOUSE', 'ORACLE',
      'SQLSERVER', 'DB2', 'PRESTO', 'REDSHIFT', 'ATHENA',
      'TRINO', 'STARROCKS', 'AZURESQL', 'DAMENG', 'OCEANBASE',
      'KYUUBI', 'DATABEND', 'VERTICA', 'HANA', 'DORIS', 'DOLPHINDB'
    ]

    dsTypeOptions.value = DATASOURCE_TYPES.map((t) => ({ label: t, value: t }))

    const emitChange = () => {
      // 把 columns 从 string[] 转成 {name, type}[]，让后端 / 下游 pipeline-builder 拿到真实类型
      const colsWithType = columns.value.map((col: any) => {
        if (typeof col === 'string') {
          // 从 columnOptions 反查类型
          const opt = columnOptions.value.find((c: any) => c.value === col)
          return { name: col, type: (opt && opt._type) || 'STRING' }
        }
        return col
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
        const list = await getDatasourceDatabasesById(id)
        // 后端可能返回两种结构：字符串数组 / [{label, value}] 对象
        databaseOptions.value = (list || []).map((d: any) =>
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
            _type: parsed.size ? `${parsed.type}(${parsed.size})` : parsed.type,
            _primary: parsed.primary,
            _nullable: parsed.nullable,
            _comment: parsed.comment
          }
        })
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
      // 现在 stripped 是 "name TYPE(size)"
      const headMatch = stripped.match(/^(\S+)\s+(\S+)$/)
      if (headMatch) {
        result.name = headMatch[1]
        const typePart = headMatch[2]
        const tm = typePart.match(/^([A-Za-z][A-Za-z0-9_]*)(?:\((\d+)\))?$/)
        if (tm) {
          result.type = tm[1]
          if (tm[2]) result.size = tm[2]
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
        else if (up === 'PK') result.primary = true
        else result.comment = (result.comment ? result.comment + ' ' : '') + inner
      }
      return result
    }

    watch(dsType, async (v) => {
      if (!v) {
        dsInstanceOptions.value = []
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
        return
      }
      reset()
      await loadDatabases(v)
      emitChange()
    })

    watch(database, async (v) => {
      if (!v || !dsId.value) {
        tableOptions.value = []
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
        return
      }
      columns.value = []
      columnOptions.value = []
      await loadColumns(dsId.value, database.value, v)
    })

    watch(columns, () => emitChange(), { deep: true })

    if (dsType.value) loadInstances(dsType.value)
    if (dsId.value) loadDatabases(dsId.value)
    if (dsId.value && database.value) loadTables(dsId.value, database.value)
    if (dsId.value && database.value && table.value) {
      loadColumns(dsId.value, database.value, table.value)
    }

    // 字段表格列（简化为 3 列：字段名 / 类型 / 主键）
    const columnTableColumns = computed(() => {
      return [
        {
          title: '字段名',
          key: 'name',
          width: 160,
          render: (row: any) =>
            h(
              'span',
              { style: row._primary ? 'font-weight: 600; color: #2080f0;' : '' },
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
              ? h(NTag, { type: 'primary', size: 'small', bordered: false }, { default: () => '主键' })
              : h('span', { style: 'color: #c2c2c2;' }, '否')
        }
      ]
    })

    // 注入字段表格的样式
    if (typeof document !== 'undefined' && !document.getElementById('cascade-config-styles')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'cascade-config-styles'
      styleEl.textContent = `
        .n-data-table-tr.selected-row td {
          background-color: #e6f4ff !important;
        }
        .n-data-table-tr.selected-row:hover td {
          background-color: #bae0ff !important;
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
      columns.value = []
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
    })

    return () => (
      <NSpace vertical size='medium'>
        <div>
          <div style='margin-bottom: 6px;'>数据源类型 <span style='color: #f56c6c;'>*</span></div>
          <NSelect
            v-model:value={dsType.value}
            options={dsTypeOptions.value}
            placeholder='请选择数据库类型'
            filterable
            clearable
          />
        </div>
        <div>
          <div style='margin-bottom: 6px;'>数据源实例 <span style='color: #f56c6c;'>*</span></div>
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
        <div>
          <div style='margin-bottom: 6px;'>Schema / 数据库 <span style='color: #f56c6c;'>*</span></div>
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
        <div>
          <div style='margin-bottom: 6px;'>表名 <span style='color: #f56c6c;'>*</span></div>
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
        <div>
          <div style='margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;'>
            <span>字段（点击行选择 / 取消）</span>
            <NSpace size='small'>
              <NButton size='tiny' onClick={handleSelectAll}>全选</NButton>
              <NButton size='tiny' onClick={handleClearAll}>清空</NButton>
              <NTag size='small' type='info'>
                已选 {columns.value.length} / {columnOptions.value.length}
              </NTag>
            </NSpace>
          </div>
          {loadingColumn.value ? (
            <NSpin size='small' />
          ) : columnOptions.value.length === 0 ? (
            <NEmpty size='small' description='请先选择表' />
          ) : (
            <div
              style='max-height: 280px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 4px;'
            >
              <NDataTable
                size='small'
                columns={columnTableColumns.value}
                data={columnOptions.value}
                pagination={false}
                row-key={(row: any) => row.value}
                row-class-name={(row: any) =>
                  columns.value.includes(row.value) ? 'selected-row' : ''
                }
                onRowClick={(row: any) => {
                  if (row._primary) return
                  if (columns.value.includes(row.value)) {
                    columns.value = columns.value.filter((c: string) => c !== row.value)
                  } else {
                    columns.value = [...columns.value, row.value]
                  }
                }}
              />
            </div>
          )}
        </div>
      </NSpace>
    )
  }
})
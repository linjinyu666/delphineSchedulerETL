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

import { defineComponent, ref, onMounted, h } from 'vue'
import {
  NCard,
  NSpace,
  NButton,
  NDataTable,
  NPagination,
  NInput,
  NIcon,
  NEmpty,
  NPopconfirm,
  useMessage
} from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { SearchOutlined, DeleteOutlined, EditOutlined } from '@vicons/antd'
import {
  queryResourceListPaging,
  queryBaseDir,
  deleteResource
} from '@/service/modules/resources'

interface EtlJobRow {
  id: string
  name: string
  description: string
  fullName: string
  userName: string
  tenantCode: string
  updateTime: string
}

export default defineComponent({
  name: 'EtlList',
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    const message = useMessage()

    const baseDir = ref('/tmp/dolphinscheduler/default/etl/')
    const page = ref(1)
    const pageSize = ref(10)
    const total = ref(0)
    const searchVal = ref('')
    const data = ref<EtlJobRow[]>([])
    const loading = ref(false)

    const fetchBaseDir = async () => {
      try {
        const { data: dir } = await queryBaseDir({ type: 'ETL' })
        baseDir.value = dir.endsWith('/') ? dir : dir + '/'
      } catch (e) {
        // ignore
      }
    }

    const fetchList = async () => {
      loading.value = true
      try {
        const res: any = await queryResourceListPaging({
          type: 'ETL',
          fullName: baseDir.value,
          tenantCode: '',
          searchVal: searchVal.value,
          pageNo: page.value,
          pageSize: pageSize.value
        })
        total.value = res.total || 0
        // 只显示 .pipeline/.json ETL 作业文件（pipeline 是默认，json 是 view 白名单支持的）
        data.value = (res.totalList || [])
          .filter((it: any) => !it.directory && (it.fileName?.endsWith('.pipeline') || it.fileName?.endsWith('.json')))
          .map((it: any) => ({
            id: it.id,
            name: it.fileName?.replace(/\.(pipeline|json)$/, '') || it.alias,
            description: it.description || '',
            fullName: it.fullName,
            userName: it.userName,
            tenantCode: it.userName,
            updateTime: it.updateTime || it.createTime || ''
          }))
      } catch (e) {
        // ignore
      } finally {
        loading.value = false
      }
    }

    onMounted(async () => {
      await fetchBaseDir()
      await fetchList()
    })

    const handleCreate = () => {
      // 直接跳到画布（不弹窗），在画布顶部填名字 + 路径 + 点保存
      router.push({ name: 'etl-designer' })
    }

    const handleOpen = (row: EtlJobRow) => {
      router.push({
        name: 'etl-designer',
        query: { name: row.name }
      })
    }

    const handleDelete = async (row: EtlJobRow) => {
      try {
        await deleteResource({ fullName: row.fullName, tenantCode: row.tenantCode })
        message.success('删除成功')
        await fetchList()
      } catch (e) {
        message.error('删除失败: ' + (e as Error).message)
      }
    }

    const columns = [
      {
        title: '作业名',
        key: 'name',
        render: (row: EtlJobRow) =>
          h(
            'a',
            {
              style: 'color: #2080f0; cursor: pointer;',
              onClick: () => handleOpen(row)
            },
            row.name
          )
      },
      {
        title: '描述',
        key: 'description',
        render: (row: EtlJobRow) => row.description || '-'
      },
      {
        title: '更新时间',
        key: 'updateTime',
        width: 180
      },
      {
        title: '操作',
        key: 'action',
        width: 200,
        render: (row: EtlJobRow) =>
          h(NSpace, {}, () => [
            h(
              NButton,
              {
                size: 'tiny',
                type: 'primary',
                ghost: true,
                onClick: () => handleOpen(row)
              },
              { default: () => '编辑', icon: () => h(NIcon, null, { default: () => h(EditOutlined) }) }
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleDelete(row)
              },
              {
                default: () => '确认删除 ' + row.name + '？',
                trigger: () =>
                  h(
                    NButton,
                    {
                      size: 'tiny',
                      type: 'error',
                      ghost: true
                    },
                    { default: () => '删除', icon: () => h(NIcon, null, { default: () => h(DeleteOutlined) }) }
                  )
              }
            )
          ])
      }
    ]

    return () => (
      <NSpace vertical>
        <NCard>
          <NSpace justify='space-between'>
            <NSpace>
              <NButton type='primary' onClick={handleCreate}>
                新建 ETL 作业
              </NButton>
            </NSpace>
            <NSpace>
              <NInput
                v-model:value={searchVal.value}
                placeholder='搜索作业名'
                clearable
                onClear={() => {
                  page.value = 1
                  fetchList()
                }}
                onKeyup={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    page.value = 1
                    fetchList()
                  }
                }}
              />
              <NButton
                size='small'
                type='primary'
                onClick={() => {
                  page.value = 1
                  fetchList()
                }}
              >
                <NIcon>
                  <SearchOutlined />
                </NIcon>
              </NButton>
            </NSpace>
          </NSpace>
        </NCard>
        <NCard title='ETL 作业管理'>
          {data.value.length === 0 && !loading.value ? (
            <NEmpty description='暂无 ETL 作业，点击"新建 ETL 作业"开始' />
          ) : (
            <>
              <NDataTable
                columns={columns}
                data={data.value}
                size='small'
                loading={loading.value}
              />
              <NSpace justify='center' style='margin-top: 16px;'>
                <NPagination
                  v-model:page={page.value}
                  v-model:page-size={pageSize.value}
                  page-count={Math.ceil(total.value / pageSize.value)}
                  item-count={total.value}
                  show-quick-jumper
                  show-size-picker
                  onUpdatePage={(p: number) => {
                    page.value = p
                    fetchList()
                  }}
                  onUpdatePageSize={(s: number) => {
                    pageSize.value = s
                    page.value = 1
                    fetchList()
                  }}
                />
              </NSpace>
            </>
          )}
        </NCard>
      </NSpace>
    )
  }
})
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

import { defineComponent, onBeforeUnmount, ref, watch } from 'vue'
import type { PropType } from 'vue'
import { NAlert, NButton, NEmpty, NModal, NPagination, NSpin } from 'naive-ui'
import { viewEtlContent } from '@/service/modules/resources'
import type { ResourceFileTableData } from '@/views/resource/components/resource/types'
import { parseTableLineage } from './table-lineage'
import type { TableLineage } from './table-lineage'
import styles from './table-lineage.module.scss'

export default defineComponent({
  name: 'TableLineageModal',
  props: {
    show: { type: Boolean, default: false },
    resource: {
      type: Object as PropType<ResourceFileTableData | null>,
      default: null
    }
  },
  emits: ['update:show'],
  setup(props) {
    const loading = ref(false)
    const error = ref('')
    const lineage = ref<TableLineage | null>(null)
    const page = ref(1)
    let requestVersion = 0

    const load = async () => {
      const fullName = props.resource?.fullName
      if (!props.show || !fullName) return
      const version = ++requestVersion
      loading.value = true
      error.value = ''
      lineage.value = null
      page.value = 1
      try {
        const response: any = await viewEtlContent({ fullName })
        const content = response?.content
        if (typeof content !== 'string') throw new Error('作业内容为空')
        const result = parseTableLineage(content)
        if (version === requestVersion) lineage.value = result
      } catch (cause) {
        if (version === requestVersion) {
          error.value =
            cause instanceof SyntaxError
              ? '作业内容不是有效的 JSON，请检查保存的作业文件。'
              : cause instanceof Error && cause.message.startsWith('作业内容')
              ? cause.message
              : '无法读取作业数据流向，请稍后重试。'
        }
      } finally {
        if (version === requestVersion) loading.value = false
      }
    }

    watch(
      [() => props.show, () => props.resource?.fullName],
      ([show]) => {
        if (show) void load()
        else ++requestVersion
      },
      { immediate: true }
    )
    onBeforeUnmount(() => {
      ++requestVersion
    })

    return { loading, error, lineage, page, load }
  },
  render() {
    const lineage = this.lineage
    const emptyReason =
      !lineage?.hasSource || !lineage?.hasSink
        ? '作业需要同时包含表输入和表输出节点，才能形成表到表流向。'
        : '未找到从表输入到表输出的连线路径，请检查画布连接。'

    return (
      <NModal
        show={this.show}
        onUpdateShow={(show: boolean) => this.$emit('update:show', show)}
        preset='card'
        title={`数据流向 · ${
          this.resource?.alias || this.resource?.file_name || 'ETL 作业'
        }`}
        style={{ width: 'min(860px, 94vw)' }}
      >
        <div class={styles['lineage-modal']}>
          <p class={styles['description']}>
            根据当前保存的作业画布连线推导表级流向；这是静态配置视图，不代表作业已成功执行。
          </p>
          {this.loading ? (
            <div
              class={styles['centered']}
              role='status'
              aria-label='正在读取数据流向'
            >
              <NSpin size='medium' />
              <span>正在读取作业配置…</span>
            </div>
          ) : this.error ? (
            <NAlert type='error' title='读取失败'>
              <span>{this.error}</span>
              <NButton
                text
                type='primary'
                onClick={this.load}
                class={styles['retry']}
              >
                重试
              </NButton>
            </NAlert>
          ) : lineage ? (
            <>
              {lineage.flows.length > 0 ? (
                <>
                  <p class={styles['summary']}>
                    {lineage.sourceCount} 个源表 · {lineage.targetCount}{' '}
                    个目标表 · {lineage.flows.length} 条流向
                  </p>
                  <div
                    class={styles['flow-list']}
                    role='list'
                    aria-label='表到表数据流向'
                  >
                    {lineage.flows
                      .slice((this.page - 1) * 20, this.page * 20)
                      .map((flow) => (
                        <div
                          class={styles['flow-row']}
                          role='listitem'
                          key={`${flow.source.key}->${flow.target.key}`}
                        >
                          <div class={styles['table-ref']}>
                            <span class={styles['role']}>
                              源表 · {flow.source.datasource}
                            </span>
                            <strong
                              title={`${
                                flow.source.database
                                  ? `${flow.source.database}.`
                                  : ''
                              }${flow.source.table}`}
                            >
                              {flow.source.database
                                ? `${flow.source.database}.`
                                : ''}
                              {flow.source.table}
                            </strong>
                          </div>
                          <span class={styles['arrow']} aria-label='流向'>
                            →
                          </span>
                          <div class={styles['table-ref']}>
                            <span class={styles['role']}>
                              目标表 · {flow.target.datasource}
                            </span>
                            <strong
                              title={`${
                                flow.target.database
                                  ? `${flow.target.database}.`
                                  : ''
                              }${flow.target.table}`}
                            >
                              {flow.target.database
                                ? `${flow.target.database}.`
                                : ''}
                              {flow.target.table}
                            </strong>
                          </div>
                        </div>
                      ))}
                  </div>
                  {lineage.flows.length > 20 && (
                    <NPagination
                      class={styles['pagination']}
                      page={this.page}
                      page-size={20}
                      item-count={lineage.flows.length}
                      onUpdatePage={(page: number) => {
                        this.page = page
                      }}
                    />
                  )}
                </>
              ) : (
                <div class={styles['centered']}>
                  <NEmpty description={emptyReason} />
                </div>
              )}
              {lineage.incompleteNodeCount > 0 && (
                <NAlert type='warning' class={styles['notice']}>
                  {lineage.incompleteNodeCount}{' '}
                  个表输入或表输出节点未配置表名，未纳入上述流向。
                </NAlert>
              )}
              <p class={styles['footnote']}>
                仅统计已连接的表输入 → 表输出；打印预览不是目标表，自定义 SQL
                中未连接的外部表不作推断。
              </p>
            </>
          ) : null}
        </div>
      </NModal>
    )
  }
})

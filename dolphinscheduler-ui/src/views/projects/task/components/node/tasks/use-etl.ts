/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 */

import { onMounted, reactive, ref, watch } from 'vue'
import { queryResourceList, viewEtlContent } from '@/service/modules/resources'
import * as Fields from '../fields/index'
import type { IJsonItem, INodeData, ITaskData } from '../types'

/** Workflow ETL node. The selected resource is resolved by the ETL task plugin. */
export function useEtl({
  projectCode,
  from = 0,
  readonly,
  data
}: {
  projectCode: number
  from?: number
  readonly?: boolean
  data?: ITaskData
}) {
  const model = reactive({
    name: '',
    taskType: 'ETL',
    flag: 'YES',
    description: '',
    timeoutFlag: false,
    timeoutNotifyStrategy: ['WARN'],
    timeout: 30,
    localParams: [],
    environmentCode: null,
    failRetryInterval: 1,
    failRetryTimes: 0,
    workerGroup: 'default',
    cpuQuota: -1,
    memoryMax: -1,
    delayTime: 0,
    etlResource: '',
    etlContent: '',
    datasourceIds: [] as number[],
    etlVersion: 'LATEST',
    etlParameters: ''
  } as INodeData)

  const resourceOptions = ref<any[]>([])
  const resourceLoading = ref(false)
  const etlContentLoading = ref(false)
  let contentRequestId = 0

  const loadEtlContent = async (resource: string) => {
    const requestId = ++contentRequestId
    if (!resource) {
      model.etlContent = ''
      model.datasourceIds = []
      return
    }
    etlContentLoading.value = true
    try {
      const result: any = await viewEtlContent({ fullName: resource })
      if (requestId !== contentRequestId) return
      const content = result?.content || result?.data?.content || ''
      model.etlContent = content
      model.datasourceIds = extractDatasourceIds(content)
    } catch {
      if (requestId === contentRequestId) {
        model.etlContent = ''
        model.datasourceIds = []
      }
    } finally {
      if (requestId === contentRequestId) etlContentLoading.value = false
    }
  }

  // Always refresh the selected resource when the editor is opened. The
  // resource is database-backed, so an old etlContent snapshot from the
  // workflow task must never win over the current content stored by the
  // Resource Center. `immediate` also covers the edit-page initialization
  // path where etlResource is already populated before this composable runs.
  watch(() => model.etlResource, (resource) => {
    void loadEtlContent(resource)
  }, { immediate: true })

  onMounted(async () => {
    resourceLoading.value = true
    try {
      const result: any = await queryResourceList({ type: 'ETL', fullName: '' })
      const list = Array.isArray(result)
        ? result
        : result?.totalList || result?.data?.totalList || result?.data || []
      const getLeafName = (name: any, fullName: any) =>
        String(name || fullName || '')
          .replace(/\/+$/g, '')
          .split('/')
          .pop()
          ?.replace(/\.json$/i, '') || ''
      const files: any[] = []
      const collectFiles = (items: any[]) => items.forEach((item: any) => {
        if (item.directory || item.dirctory) {
          if (Array.isArray(item.children)) collectFiles(item.children)
        } else {
          files.push(item)
        }
      })
      collectFiles(list)

      // The resource API can return ETL files as a flat list. Rebuild the
      // directory hierarchy from the full resource path for the tree selector.
      const roots: any[] = []
      const directoryMap = new Map<string, any>()
      files.forEach((item: any) => {
        const fullName = item.fullName || item.name || item.fileName || ''
        const etlMarker = fullName.indexOf('/etl/')
        const relativePath = etlMarker >= 0
          ? fullName.substring(etlMarker + '/etl/'.length)
          : fullName.replace(/^\/+/, '')
        const parts = relativePath.split('/').filter(Boolean)
        if (!parts.length) return
        let children = roots
        let path = etlMarker >= 0 ? fullName.substring(0, etlMarker + '/etl/'.length) : '/'
        parts.slice(0, -1).forEach((part: string) => {
          path += part + '/'
          let directory = directoryMap.get(path)
          if (!directory) {
            directory = { key: path, label: part, disabled: true, children: [] }
            directoryMap.set(path, directory)
            children.push(directory)
          }
          children = directory.children
        })
        children.push({
          key: fullName,
          value: fullName,
          label: getLeafName(item.name, fullName)
        })
      })
      resourceOptions.value = roots
    } finally {
      resourceLoading.value = false
    }
  })

  const extra: IJsonItem[] = [
    {
        type: 'tree-select',
      field: 'etlResource',
      name: 'ETL 作业',
      span: 24,
      options: resourceOptions,
        props: {
          filterable: true,
          clearable: true,
          keyField: 'key',
          labelField: 'label',
          childrenField: 'children',
          defaultExpandAll: true,
          loading: resourceLoading,
        placeholder: '选择资源中心中的 ETL 作业',
        // Fetch the database-backed definition immediately when the user
        // selects a resource instead of relying only on the asynchronous
        // watcher. The form validator below prevents saving during loading.
        onUpdateValue: (resource: string) => {
          // The ETL selector is rendered through the generic Form schema and
          // its value is not guaranteed to be propagated back to the reactive
          // model before the async callback runs. Keep the model authoritative
          // so format-data can persist the selected resource and its dsIds.
          model.etlResource = resource || ''
          void loadEtlContent(resource)
        }
      },
      validate: {
        trigger: ['change', 'blur'],
        required: true,
        message: '请选择一个 ETL 作业',
        validator: (_validate: any, value: string) => {
          if (!value) return
          if (etlContentLoading.value) {
            return new Error('ETL 作业内容加载中，请稍后保存')
          }
          if (!model.etlContent) {
            return new Error('无法读取 ETL 作业内容，请重新选择')
          }
          if (!model.datasourceIds?.length) {
            return new Error('ETL 作业未配置有效的 dsId')
          }
        }
      },
      value: (model as any).etlResource
    },
    {
      type: 'radio',
      field: 'etlVersion',
      name: '版本策略',
      span: 24,
      options: [
        { label: '始终使用最新版本', value: 'LATEST' },
        { label: '固定当前版本', value: 'PINNED' }
      ],
      value: (model as any).etlVersion
    },
    {
      type: 'input',
      field: 'etlParameters',
      name: '运行参数',
      span: 24,
      props: {
        type: 'textarea',
        rows: 3,
        placeholder: '可选，例如：{"biz_date":"${today}"}'
      },
      value: (model as any).etlParameters
    }
  ]

  return {
    json: [
      Fields.useName(from),
      ...Fields.useTaskDefinition({ projectCode, from, readonly, data, model }),
      Fields.useRunFlag(),
      Fields.useDescription(),
      Fields.useTaskPriority(),
      Fields.useWorkerGroup(projectCode),
      Fields.useEnvironmentName(model, !data?.id),
      ...Fields.useTaskGroup(model, projectCode),
      ...Fields.useFailed(),
      ...Fields.useResourceLimit(),
      Fields.useDelayTime(model),
      ...Fields.useTimeoutAlarm(model),
      ...extra,
      Fields.usePreTasks()
    ] as IJsonItem[],
    model
  }

  function extractDatasourceIds(content: string): number[] {
    if (!content) return []
    try {
      const parsed = JSON.parse(content.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t'))
      const ids = (parsed.nodes || [])
        .map((node: any) => Number(node?.config?.cascade?.dsId ?? node?.config?.datasourceId))
        .filter((id: number) => Number.isInteger(id) && id > 0)
      return [...new Set(ids)]
    } catch {
      return []
    }
  }
}

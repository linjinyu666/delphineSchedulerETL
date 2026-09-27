/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 */

import { computed, onMounted, reactive, ref, watch } from 'vue'
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
    etlParameters: '',
    executionMode: 'LOCAL',
    localJvmXms: '512m',
    localJvmXmx: '2g',
    localJvmXss: '1m',
    runtimeMode: 'BATCH',
    clusterType: 'STANDALONE',
    jobManagerAddress: 'localhost',
    jobManagerRestPort: 8081,
    jobManagerCpu: 1,
    jobManagerMemory: '1g',
    taskManagerCpu: 2,
    taskManagerMemory: '2g',
    taskManagerCount: 1,
    taskManagerSlots: 2,
    parallelism: 2,
    checkpointEnabled: false,
    checkpointInterval: 60000,
    checkpointDir: ''
  } as INodeData)

  const localSpan = computed(() => model.executionMode === 'LOCAL' ? 12 : 0)
  const clusterSpan = computed(() => model.executionMode === 'CLUSTER' ? 12 : 0)
  const clusterFullSpan = computed(() => model.executionMode === 'CLUSTER' ? 24 : 0)
  const checkpointSpan = computed(() =>
    model.executionMode === 'CLUSTER' && model.checkpointEnabled ? 12 : 0
  )

  watch(() => model.executionMode, (mode) => {
    if (!mode) model.executionMode = 'LOCAL'
  }, { immediate: true })

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
    void loadEtlContent(resource || '')
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
    },
    {
      type: 'radio',
      field: 'executionMode',
      name: '执行方式',
      span: 24,
      options: [
        { label: '本地执行', value: 'LOCAL' },
        { label: 'Flink 集群执行', value: 'CLUSTER' }
      ],
      value: (model as any).executionMode
    },
    {
      type: 'input',
      field: 'localJvmXms',
      name: '初始堆内存 (-Xms)',
      span: localSpan,
      props: { placeholder: '例如 512m' },
      value: (model as any).localJvmXms
    },
    {
      type: 'input',
      field: 'localJvmXmx',
      name: '最大堆内存 (-Xmx)',
      span: localSpan,
      props: { placeholder: '例如 2g' },
      value: (model as any).localJvmXmx,
      validate: memoryRule('最大堆内存')
    },
    {
      type: 'input',
      field: 'localJvmXss',
      name: '线程栈内存 (-Xss)',
      span: localSpan,
      props: { placeholder: '例如 1m' },
      value: (model as any).localJvmXss
    },
    {
      type: 'input-number',
      field: 'parallelism',
      name: 'Flink 并行度',
      span: 12,
      props: { min: 1, placeholder: '例如 2' },
      value: (model as any).parallelism,
      validate: positiveNumberRule('并行度')
    },
    {
      type: 'radio',
      field: 'runtimeMode',
      name: '执行模式',
      span: localSpan,
      options: [
        { label: 'BATCH 批处理', value: 'BATCH' },
        { label: 'STREAM 流处理', value: 'STREAM' }
      ],
      value: (model as any).runtimeMode
    },
    {
      type: 'select',
      field: 'clusterType',
      name: '集群类型',
      span: clusterSpan,
      options: [
        { label: 'Standalone', value: 'STANDALONE' },
        { label: 'YARN', value: 'YARN' },
        { label: 'Kubernetes', value: 'KUBERNETES' }
      ],
      value: (model as any).clusterType
    },
    {
      type: 'input',
      field: 'jobManagerAddress',
      name: 'JobManager 地址',
      span: clusterSpan,
      props: { placeholder: '例如 flink-jobmanager' },
      value: (model as any).jobManagerAddress
    },
    {
      type: 'input-number',
      field: 'jobManagerRestPort',
      name: 'JobManager REST 端口',
      span: clusterSpan,
      props: { min: 1, max: 65535 },
      value: (model as any).jobManagerRestPort,
      validate: portRule('JobManager REST 端口')
    },
    {
      type: 'input-number',
      field: 'jobManagerCpu',
      name: 'JobManager CPU 核数',
      span: clusterSpan,
      props: { min: 1 },
      value: (model as any).jobManagerCpu,
      validate: positiveNumberRule('JobManager CPU 核数')
    },
    {
      type: 'input',
      field: 'jobManagerMemory',
      name: 'JobManager 内存',
      span: clusterSpan,
      props: { placeholder: '例如 1g' },
      value: (model as any).jobManagerMemory,
      validate: memoryRule('JobManager 内存')
    },
    {
      type: 'input-number',
      field: 'taskManagerCpu',
      name: 'TaskManager CPU 核数',
      span: clusterSpan,
      props: { min: 1 },
      value: (model as any).taskManagerCpu,
      validate: positiveNumberRule('TaskManager CPU 核数')
    },
    {
      type: 'input',
      field: 'taskManagerMemory',
      name: 'TaskManager 内存',
      span: clusterSpan,
      props: { placeholder: '例如 2g' },
      value: (model as any).taskManagerMemory,
      validate: memoryRule('TaskManager 内存')
    },
    {
      type: 'input-number',
      field: 'taskManagerCount',
      name: 'TaskManager 数量',
      span: clusterSpan,
      props: { min: 1 },
      value: (model as any).taskManagerCount,
      validate: positiveNumberRule('TaskManager 数量')
    },
    {
      type: 'input-number',
      field: 'taskManagerSlots',
      name: 'TaskManager Slots',
      span: clusterSpan,
      props: { min: 1 },
      value: (model as any).taskManagerSlots,
      validate: positiveNumberRule('TaskManager Slots')
    },
    {
      type: 'switch',
      field: 'checkpointEnabled',
      name: '启用 Checkpoint',
      span: clusterFullSpan,
      value: (model as any).checkpointEnabled
    },
    {
      type: 'input-number',
      field: 'checkpointInterval',
      name: 'Checkpoint 间隔 (毫秒)',
      span: checkpointSpan,
      props: { min: 1000 },
      value: (model as any).checkpointInterval,
      validate: positiveNumberRule('Checkpoint 间隔')
    },
    {
      type: 'input',
      field: 'checkpointDir',
      name: 'Checkpoint 存储目录',
      span: checkpointSpan,
      props: { placeholder: '例如 hdfs:///flink/checkpoints/etl' },
      value: (model as any).checkpointDir
    }
  ]

  return {
    json: [
      Fields.useName(from),
      ...Fields.useTaskDefinition({ projectCode, from, readonly, data, model }),
      Fields.useRunFlag(),
      Fields.useDescription(),
      ...Fields.useFailed(),
      ...extra,
      Fields.usePreTasks()
    ] as IJsonItem[],
    model
  }

  function extractDatasourceIds(content: string): number[] {
    if (!content) return []
    try {
      const parsed = JSON.parse(content.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t'))
      const ids: number[] = (parsed.nodes || [])
        .map((node: any) => Number(node?.config?.cascade?.dsId ?? node?.config?.datasourceId))
        .filter((id: number) => Number.isInteger(id) && id > 0)
      return [...new Set(ids)]
    } catch {
      return []
    }
  }

  function positiveNumberRule(label: string) {
    return {
      trigger: ['input', 'blur'],
      validator: (_validate: any, value: number) => {
        if (value == null || value < 1) return new Error(`${label}必须大于 0`)
      }
    }
  }

  function portRule(label: string) {
    return {
      trigger: ['input', 'blur'],
      validator: (_validate: any, value: number) => {
        if (value == null || value < 1 || value > 65535) {
          return new Error(`${label}必须在 1-65535 范围内`)
        }
      }
    }
  }

  function memoryRule(label: string) {
    return {
      trigger: ['input', 'blur'],
      validator: (_validate: any, value: string) => {
        if (value && !/^\d+(?:\.\d+)?\s*(?:k|m|g|t)$/i.test(value.trim())) {
          return new Error(`${label}请输入类似 512m、2g 的值`)
        }
      }
    }
  }
}

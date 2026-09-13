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

import { defineComponent, ref, onMounted, onBeforeUnmount, nextTick, computed, h } from 'vue'
import {
  NLayout,
  NLayoutHeader,
  NLayoutSider,
  NLayoutContent,
  NButton,
  NSpace,
  NInput,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NCard,
  NEmpty,
  NTag,
  NSelect,
  NInputNumber,
  NDivider,
  NCollapse,
  NCollapseItem,
  NModal,
  NScrollbar,
  NSpin,
  NIcon,
  NTabs,
  NTabPane,
  NTooltip,
  NPopconfirm,
  NSwitch,
  useMessage
} from 'naive-ui'
import { RollbackOutlined, SaveOutlined, PlayCircleOutlined, DatabaseOutlined, CodeOutlined, FilterOutlined, ApartmentOutlined, BranchesOutlined, SwapOutlined, ConsoleSqlOutlined } from '@vicons/antd'
import { useRouter, useRoute } from 'vue-router'
import { Graph, Node, Edge } from '@antv/x6'
import {
  queryBaseDir,
  queryResourceList,
  viewEtlContent,
  updateResourceContent,
  onlineCreateResource
} from '@/service/modules/resources'
import {
  queryDataSourceList,
  getDatasourceDatabasesById,
  getDatasourceTablesById,
  getDatasourceTableColumnsById
} from '@/service/modules/data-source'
import { useNodeMenu, generateSqlFromGraph, NODE_DEFINITIONS } from './node-registry'
import { buildPipeline, buildPipelineRequest } from './pipeline-builder'
import { computeNodeStatus, validateNodeConfig } from './node-validator'
import { runFlinkPipeline, getFlinkJobStatus, stopFlinkJob, checkFlinkEtlHealth } from '@/service/modules/flink-etl'
import { queryDataSourceListPaging } from '@/service/modules/data-source'
import CascadeConfig from './cascade-config.tsx'
import JoinConfigDialog from './JoinConfigDialog.tsx'
import FilterConfigDialog from './FilterConfigDialog.tsx'
import CompareConfigDialog from './CompareConfigDialog.tsx'
import SqlConfigDialog from './SqlConfigDialog.tsx'
import TransformConfigDialog, { type TransformUpstream } from './TransformConfigDialog.tsx'
import Styles from './index.module.scss'

// 所有中间节点都通过同一套字段契约向下游暴露输出字段。
// 这样字段转换、过滤、连接和自定义 SQL 可以串联使用，而不需要再次解析旧 JSON。
function getNodeOutputFields(config: any): Array<{ name: string; type: string }> {
  const c = config || {}
  const candidates = Array.isArray(c.outputs)
    ? c.outputs
    : (c.cascade?.columns || c.columns || c.fields || [])
  return candidates.map((item: any) => {
    if (typeof item === 'string') return { name: item.trim(), type: 'STRING' }
    return {
      name: String(item?.name || item?.alias || item?.dst || item?.field || item?.fieldName || '').trim(),
      type: String(item?.type || item?.dataType || 'STRING')
    }
  }).filter((field: { name: string }) => field.name)
}

// 节点 SVG 图标（inline SVG，跟工作流 DAG 同款）
// 默认态：灰色 #7A8599；选中态：蓝色 #288FFF
const COLOR_DEFAULT = '#7A8599'
const COLOR_HOVER = '#288FFF'

const NODE_ICON_SVG: Record<string, string> = {
  source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><rect x="4" y="6" width="22" height="4" rx="1" fill="${COLOR_DEFAULT}"/><rect x="4" y="13" width="22" height="4" rx="1" fill="${COLOR_DEFAULT}"/><rect x="4" y="20" width="22" height="4" rx="1" fill="${COLOR_DEFAULT}"/><circle cx="8" cy="8" r="1.2" fill="#fff"/><circle cx="8" cy="15" r="1.2" fill="#fff"/><circle cx="8" cy="22" r="1.2" fill="#fff"/></svg>`,
  transform: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><path d="M5 6h16l5 5v13H5z" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><path d="M21 6v5h5" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><path d="M10 14l-3 3 3 3" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2" stroke-linecap="round"/><path d="M18 14l3 3-3 3" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2" stroke-linecap="round"/></svg>`,
  join: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><circle cx="8" cy="8" r="4" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><circle cx="22" cy="8" r="4" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><circle cx="15" cy="22" r="4" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><path d="M11 11l4 7M19 11l-4 7" stroke="${COLOR_DEFAULT}" stroke-width="2" fill="none"/></svg>`,
  cdc: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><circle cx="9" cy="10" r="3.5" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><circle cx="21" cy="20" r="3.5" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><path d="M12 12l6 6M11 13c1 3 4 5 7 5" stroke="${COLOR_DEFAULT}" stroke-width="2" fill="none"/></svg>`,
  sql: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><ellipse cx="15" cy="7" rx="9" ry="3" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><path d="M6 7v16c0 1.7 4 3 9 3s9-1.3 9-3V7" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><path d="M6 14c0 1.7 4 3 9 3s9-1.3 9-3" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/></svg>`,
  sink: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><ellipse cx="15" cy="8" rx="9" ry="3" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><path d="M6 8v14c0 1.7 4 3 9 3s9-1.3 9-3V8" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><path d="M6 22c0 1.7 4 3 9 3s9-1.3 9-3" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><path d="M11 16h8M11 19h8" stroke="${COLOR_DEFAULT}" stroke-width="1.5"/></svg>`,
  // 打印预览：控制台/终端 icon（> _ 形式）
  preview: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30"><rect x="4" y="6" width="22" height="18" rx="2" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2"/><path d="M8 12l4 3-4 3" fill="none" stroke="${COLOR_DEFAULT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 18h6" stroke="${COLOR_DEFAULT}" stroke-width="2" stroke-linecap="round"/></svg>`
}

const NODE_ICON_COMPONENTS: Record<string, any> = {
  source: DatabaseOutlined,
  transform: CodeOutlined,
  filter: FilterOutlined,
  compare: SwapOutlined,
  sql: ConsoleSqlOutlined,
  join: BranchesOutlined,
  cdc: ApartmentOutlined,
  sink: DatabaseOutlined,
  preview: ConsoleSqlOutlined
}

// 选中态 svg（蓝色 #288FFF）
const NODE_ICON_SVG_HOVER: Record<string, string> = {
  source: NODE_ICON_SVG.source.replace(/fill="#7A8599"/g, `fill="${COLOR_HOVER}"`).replace(/stroke="#7A8599"/g, `stroke="${COLOR_HOVER}"`),
  transform: NODE_ICON_SVG.transform.replace(/stroke="#7A8599"/g, `stroke="${COLOR_HOVER}"`),
  join: NODE_ICON_SVG.join.replace(/stroke="#7A8599"/g, `stroke="${COLOR_HOVER}"`),
  cdc: NODE_ICON_SVG.cdc.replace(/stroke="#7A8599"/g, `stroke="${COLOR_HOVER}"`),
  sql: NODE_ICON_SVG.sql.replace(/stroke="#7A8599"/g, `stroke="${COLOR_HOVER}"`),
  sink: NODE_ICON_SVG.sink.replace(/stroke="#7A8599"/g, `stroke="${COLOR_HOVER}"`),
  preview: NODE_ICON_SVG.preview.replace(/fill="#7A8599"/g, `fill="${COLOR_HOVER}"`).replace(/stroke="#7A8599"/g, `stroke="${COLOR_HOVER}"`)
}

const iconToDataUrl = (svg: string) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(svg)

export default defineComponent({
  name: 'EtlDesigner',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const message = useMessage()

    const jobName = ref((route.query.name as string) || '')
    const isExistingJob = ref(Boolean(jobName.value))
    const routePrefix = String(route.query.prefix || '')
    const fullName = ref('')
    const description = ref('')
    const saveDir = ref('') // 用户选择的保存目录
    const parallelism = ref(2) // Flink 并行度
    const saveDialogVisible = ref(false)
    const datasources = ref<any[]>([]) // DS 数据源列表（去重后供 builder 使用）
    // Fix-10: 作业保存状态
    const saved = ref(true)  // true = 已保存(无改动); false = 有未保存改动
    const lastSavedAt = ref<number>(0)  // 上次保存时间
    markSaved()  // 初始 = 已保存
    function markSaved() {
      saved.value = true
      lastSavedAt.value = Date.now()
    }
    function markDirty() {
      saved.value = false
    }
    // Fix-13.3: 相对时间显示(刚刚 / N 分钟前 / HH:mm)
    const _now = ref(Date.now())
    let _nowTimer: any = null
    onMounted(() => {
      _nowTimer = setInterval(() => { _now.value = Date.now() }, 30 * 1000)  // 30s 刷新
    })
    const formatAgo = (ts: number): string => {
      if (!ts) return '从未保存'
      const diff = Math.max(0, _now.value - ts)
      const s = Math.floor(diff / 1000)
      if (s < 60) return '刚刚'
      const m = Math.floor(s / 60)
      if (m < 60) return `${m} 分钟前`
      const h = Math.floor(m / 60)
      if (h < 24) return `${h} 小时前`
      // 超过 1 天 → 显示日期 + HH:mm
      const d = new Date(ts)
      return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    const testing = ref(false) // 是否正在测试运行
    const testJobId = ref<string>('') // 当前测试运行 jobId
    const testJobStatus = ref<any>(null) // 测试运行状态轮询结果
    const testOutput = ref<string>('') // 测试运行输出日志
    const testModalVisible = ref(false) // 测试运行日志弹窗显示
    const testLogRef = ref<HTMLElement | null>(null) // 弹窗日志滚动容器 ref
    // Fix-7: 日志分级折叠
    const logFilter = ref<'all' | 'info' | 'warn' | 'error' | 'sql' | 'data'>('all')
    // Fix-8: 上次构建出的 SQL(单独卡片展示)
    const lastBuiltSql = ref<string>('')
    const lastBuiltSources = ref<any[]>([])
    const lastBuiltSinks = ref<any[]>([])
    const sqlCardCollapsed = ref(false)

    // 测试运行耗时(秒),实时计算
    const testDuration = computed(() => {
      const st = testJobStatus.value
      if (!st) return 0
      const start = st.startTime || 0
      const end = st.status === 'RUNNING' || st.status === 'PENDING' ? Date.now() : (st.endTime || start)
      if (!start) return 0
      return Math.max(0, Math.round((end - start) / 1000))
    })

    // 测试运行状态标签 (颜色 + 文本) - Fix-13.12: 状态行去重复,统一用中文
    const testStatusInfo = computed(() => {
      const status = testJobStatus.value?.status || ''
      const map: Record<string, { type: string; text: string }> = {
        PENDING: { type: 'warning', text: '排队中' },
        RUNNING: { type: 'info',    text: '运行中' },
        SUCCESS: { type: 'success', text: '成功' },
        FAILED:  { type: 'error',   text: '失败' }
      }
      return map[status] || { type: 'default', text: status || '未知' }
    })
    const availableDirs = ref<Array<{ label: string; value: string }>>([]) // 可选目录
    const graph = ref<Graph>()
    const paperEl = ref<HTMLElement>()
    const minimapEl = ref<HTMLElement>()

    const sidebarTab = ref<'nodes' | 'preview' | 'test'>('nodes')
    // 收藏的节点（从 localStorage 读，加载/初始化时同步）
    const favorites = ref<string[]>([])
    try {
      const saved = localStorage.getItem('etl-favorite-nodes')
      if (saved) favorites.value = JSON.parse(saved)
    } catch (e) {
      // ignore
    }
    const toggleFav = (type: string) => {
      if (favorites.value.includes(type)) {
        favorites.value = favorites.value.filter((t) => t !== type)
      } else {
        favorites.value = [...favorites.value, type]
      }
      try {
        localStorage.setItem('etl-favorite-nodes', JSON.stringify(favorites.value))
      } catch (e) {
        // ignore
      }
    }

    // 节点配置抽屉
    const drawerShow = ref(false)
    const activeNodeId = ref<string>('')
    const activeNodeConfig = ref<any>({})
    const activeNodeMeta = ref<any>(null)
    const sinkSourceFields = ref<Array<{
      value: string
      label: string
      field: string
      type: string
      alias: string
    }>>([])
    // 节点别名输入校验状态（用于 drawer 表单显示反馈）
    const aliasFeedback = ref<{ status: 'success' | 'warning' | 'error' | undefined; tip: string }>({
      status: undefined,
      tip: ''
    })

    // JOIN 节点专用对话框
    const joinDialogShow = ref(false)
    const joinDialogNode = ref<any>(null)
    // 上游节点信息: [{id, type, label, alias, fields:[{name,type}]}]
    const joinUpstream = ref<Array<{
      id: string; type: string; label: string; alias: string;
      fields: Array<{ name: string; type: string }>
    }>>([])

    // FILTER 节点专用对话框
    const filterDialogShow = ref(false)
    const filterDialogNode = ref<any>(null)
    const filterUpstream = ref<Array<{
      id: string; type: string; label: string; alias: string;
      fields: Array<{ name: string; type: string }>
    }>>([])

    // TRANSFORM 节点专用对话框：可视化字段转换 + Flink SQL 表达式生成
    const transformDialogShow = ref(false)
    const transformDialogNode = ref<any>(null)
    const transformUpstream = ref<TransformUpstream[]>([])

    // SQL 节点专用对话框(支持多入边,显式 outputs)
    const sqlDialogShow = ref(false)
    const sqlDialogNode = ref<any>(null)
    const sqlUpstream = ref<Array<{
      id: string; type: string; label: string; alias: string;
      fields: Array<{ name: string; type: string }>
    }>>([])

    const loading = ref(false)
    const saving = ref(false)
    const previewSql = ref('')

    const { renderNodeMenu } = useNodeMenu()

    // 画布端口数量是节点契约的一部分：连接时只能落到预定义的输入端口。
    // SQL 节点保留多入能力（最多 4 个可视化端口），其余节点使用固定输入数。
    const NODE_INPUT_PORTS: Record<string, string[]> = {
      source: [],
      transform: ['in'],
      filter: ['in'],
      compare: ['in1', 'in2'],
      join: ['in1', 'in2'],
      cdc: ['in1', 'in2'],
      sql: ['in3', 'in4', 'in5', 'in6'],
      sink: ['in'],
      preview: ['in']
    }

    const NODE_OUTPUT_PORTS: Record<string, string[]> = {
      source: ['out'],
      transform: ['out'],
      filter: ['out'],
      compare: ['out'],
      join: ['out'],
      cdc: ['out'],
      sql: ['out'],
      sink: [],
      preview: []
    }

    const inputPortsForType = (type: string): string[] => NODE_INPUT_PORTS[type] || ['in1']
    const outputPortsForType = (type: string): string[] => NODE_OUTPUT_PORTS[type] || ['out']

    const createPortGroup = (side: 'in' | 'out', y: string) => ({
      position: { name: 'absolute', args: { x: side === 'in' ? '0%' : '100%', y } },
      markup: [
        {
          tagName: 'g',
          selector: 'body',
          children: [
            { tagName: 'circle', selector: 'circle-outer' },
            { tagName: 'text', selector: 'arrow-text' },
            { tagName: 'circle', selector: 'circle-inner' }
          ]
        }
      ],
      attrs: {
        'arrow-text': {
          fontSize: 12,
          fontWeight: 700,
          fill: '#CCCCCC',
          text: side === 'in' ? '←' : '→',
          textAnchor: 'middle',
          x: 0,
          y: 4,
          pointerEvents: 'none'
        },
        'circle-outer': {
          stroke: '#CCCCCC',
          strokeWidth: 2,
          r: 6,
          fill: '#FFFFFF',
          pointerEvents: 'none'
        },
        'circle-inner': {
          r: 8,
          fill: 'transparent',
          stroke: 'transparent',
          magnet: true
        }
      }
    })

    // 注册自定义节点（端口 markup 才能生效，仿工作流 DAG）
    const X6_ETL_NODE = 'etl-task'
    Graph.unregisterNode(X6_ETL_NODE)
    Graph.registerNode(X6_ETL_NODE, {
      // 自定义 markup: rect body + 左侧分类色条 (Fix-2) + 状态指示灯 (Fix-3) + 文本标题
      inherit: 'rect',
      width: 220,
      height: 48,
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'rect', selector: 'categoryBar' },     // 左侧 4px 分类色条
        { tagName: 'circle', selector: 'statusDot' },     // 左上角状态指示灯
        { tagName: 'text', selector: 'label' }
      ],
      attrs: {
        body: {
          fill: '#FFFFFF',
          stroke: '#D0D5DD',
          strokeWidth: 1,
          rx: 6,
          ry: 6
        },
        categoryBar: {
          x: 0, y: 0, width: 4, height: '100%',
          fill: '#94A3B8',       // 默认灰, 在 addNode 时按 category 覆盖
          pointerEvents: 'none',
          rx: 2, ry: 2
        },
        statusDot: {
          cx: 12, cy: 12, r: 4,
          fill: '#94A3B8',       // 默认灰 (未配置), applyNodeStyle 时覆盖
          stroke: '#FFFFFF',
          strokeWidth: 1.5,
          pointerEvents: 'none'
        },
        label: {
          fill: '#0F172A',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'Microsoft Yahei, PingFang SC, sans-serif',
          text: '节点',
          textAnchor: 'middle',
          refX: '50%',
          refY: '50%',
          'text-vertical-anchor': 'middle'
        }
      },
      ports: {
        groups: {
          // 输出端口统一位于节点右侧；输入端口按序分布在左侧。
          // 单入节点使用居中的 in，双入节点使用 in1/in2，SQL 使用 in3~in6。
          out: createPortGroup('out', '50%'),
          in: createPortGroup('in', '50%'),
          in1: createPortGroup('in', '34%'),
          in2: createPortGroup('in', '66%'),
          in3: createPortGroup('in', '20%'),
          in4: createPortGroup('in', '40%'),
          in5: createPortGroup('in', '60%'),
          in6: createPortGroup('in', '80%')
        }
      }
    })

    const buildGraph = () => {
      if (!paperEl.value) return
      if (graph.value) return
      if (!minimapEl.value) {
        console.warn('[etl-designer] minimapEl not mounted yet, retry next tick')
        setTimeout(buildGraph, 50)
        return
      }
      const g: Graph = new Graph({
        container: paperEl.value,
        background: { color: '#fafafa' },
        grid: {
          visible: true,
          type: 'dot',
          args: [
            {
              color: '#c0c4cc',
              thickness: 1,
              size: 16  // 跟工作流 DAG 一致：稀点阵
            }
          ]
        },
        panning: true,
        mousewheel: { enabled: true, zoomAtMousePosition: true, modifiers: 'ctrl' },
        connecting: {
          allowBlank: false,
          allowLoop: false,
          allowMulti: false,
          allowNode: true,  // 允许拖到节点任意位置就连线
          allowEdge: false,
          allowPort: true,    // 显式允许连 port
          router: 'manhattan',
          connector: { name: 'rounded', args: { radius: 8 } },
          highlight: true,    // 连线时高亮可连接的 port
          snap: { radius: 20 },
          createEdge() {
            return g.createEdge({
              shape: 'edge',
              attrs: {
                line: {
                  stroke: '#2080f0',
                  strokeWidth: 2,
                  targetMarker: { name: 'block', width: 10, height: 8 }
                }
              }
            })
          },
          validateConnection({ sourceCell, targetCell, sourcePort, targetPort }) {
            if (!sourceCell || !targetCell) return false
            if (sourceCell.id === targetCell.id) return false
            const sourceType = String((sourceCell.getData?.() || {}).type || '')
            const targetType = String((targetCell.getData?.() || {}).type || '')
            // 强制要求从合法输出端口连到合法输入端口。
            if (!sourcePort || !outputPortsForType(sourceType).includes(sourcePort)) return false
            if (!targetPort || !inputPortsForType(targetType).includes(targetPort)) return false
            // 同一个输入口只能接一条边；双入节点必须分别使用 in1/in2。
            const targetPortUsed = g.getEdges().some((edge: Edge) =>
              edge.getTargetCellId() === targetCell.id && edge.getTargetPortId?.() === targetPort
            )
            if (targetPortUsed) return false
            return true
          }
        },
        interacting: {
          nodeMovable: true,
          edgeMovable: true
        },
        keyboard: {
          enabled: true,
          global: false
        },
        selecting: {
          enabled: true,
          multiple: true,
          rubberband: true,
          movable: true,
          showNodeSelectionBox: true
        },
        minimap: {
          enabled: true,
          container: minimapEl.value,
          scalable: false,
          width: 250,
          height: 140,
          padding: 10
        }
      })

      // Publish the graph immediately after construction.  Registering the
      // interaction handlers below must not delay restoration of persisted
      // nodes; if one handler is unavailable in a particular X6 build, the
      // canvas would otherwise exist while graph.value stayed empty.
      graph.value = g
      ;(window as any).__etlGraph = g

      g.on('node:click', ({ node }: { node: Node }) => {
        activeNodeId.value = node.id
        const data = node.getData() || {}
        activeNodeMeta.value = NODE_DEFINITIONS.find((d) => d.type === data.type)
        sinkSourceFields.value = []
        if (data.type === 'sink') {
          const incoming = g.getEdges().filter((e: Edge) => e.getTargetCellId() === node.id)
          const fields: Array<{ value: string; label: string; field: string; type: string; alias: string }> = []
          const seen = new Set<string>()
          incoming.forEach((edge: Edge) => {
            const upstream = g.getCellById(edge.getSourceCellId()) as Node | null
            const upstreamData = upstream?.getData() || {}
            const upstreamConfig = upstreamData.config || {}
            const alias = String(upstreamConfig.alias || upstreamData.label || upstream?.id || 'upstream').trim()
            const columns = getNodeOutputFields(upstreamConfig)
            columns.forEach((column: any) => {
              const field = column.name
              if (!field) return
              const key = `${alias}.${field}`
              if (seen.has(key)) return
              seen.add(key)
              const type = column.type
              fields.push({
                value: key,
                label: `${key} · ${type}`,
                field,
                type,
                alias
              })
            })
          })
          sinkSourceFields.value = fields
        }
        const rawConfig = JSON.parse(JSON.stringify(data.config || {}))
        // 兼容旧配置：把 datasourceAlias + table 转成 cascade 结构
        if ((data.type === 'source' || data.type === 'sink') && rawConfig.datasourceAlias && !rawConfig.cascade) {
          rawConfig.cascade = {
            dsType: null,
            dsId: null,
            datasourceAlias: rawConfig.datasourceAlias,
            database: rawConfig.database || null,
            table: rawConfig.table || null,
            columns: rawConfig.columns || []
          }
        }
        activeNodeConfig.value = rawConfig
        // label = alias：画布 label 是节点的显示名 + SQL 别名，两者保持一致
        // 兼容旧节点（没设置 alias 但有 label）：用 label 作 alias
        if (!activeNodeConfig.value.alias && data.label) {
          activeNodeConfig.value.alias = data.label
        } else if (activeNodeConfig.value.alias && data.label !== activeNodeConfig.value.alias) {
          // 同步 label 与 alias
          activeNodeConfig.value.label = activeNodeConfig.value.alias
          data.label = activeNodeConfig.value.alias
          node.setData(data)
          node.setAttrByPath('label/text', activeNodeConfig.value.alias)
        }
        // 初始化别名输入框校验状态
        refreshAliasFeedback()
        // JOIN 节点走专用对话框（不打开通用 drawer）
        if (data.type === 'join') {
          openJoinDialog(node)
          drawerShow.value = false
          return
        }
        // FILTER 节点走专用对话框（不打开通用 drawer）
        if (data.type === 'filter') {
          openFilterDialog(node)
          drawerShow.value = false
          return
        }
        // TRANSFORM 节点走专用对话框（不打开通用 drawer，字段转换需读取上游字段）
        if (data.type === 'transform') {
          openTransformDialog(node)
          drawerShow.value = false
          return
        }
        // COMPARE 节点走专用对话框（不打开通用 drawer）
        if (data.type === 'compare') {
          openCompareDialog(node)
          drawerShow.value = false
          return
        }
        // SQL 节点走专用对话框（不打开通用 drawer, 自定义 SQL + 显式 outputs）
        if (data.type === 'sql') {
          openSqlDialog(node)
          drawerShow.value = false
          return
        }
        drawerShow.value = true
      })

      g.on('node:delete', ({ node }: { node: Node }) => {
        if (node.id === activeNodeId.value) {
          activeNodeId.value = ''
          drawerShow.value = false
        }
      })

      // JOIN 节点删除时,关闭 dialog
      g.on('node:delete', ({ node }: { node: Node }) => {
        if (joinDialogNode.value && node.id === joinDialogNode.value.id) {
          joinDialogShow.value = false
          joinDialogNode.value = null
        }
        if (transformDialogNode.value && node.id === transformDialogNode.value.id) {
          transformDialogShow.value = false
          transformDialogNode.value = null
        }
      })

      // 点击画布空白处 → 打开全局属性抽屉
      g.on('blank:click', () => {
        activeNodeId.value = ''
        activeNodeMeta.value = undefined
        drawerShow.value = true
      })

      g.on('edge:connected edge:removed node:added node:removed node:change:position', () => {
        regeneratePreview()
      })
      // Fix-12: 节点配置变化 → 重新计算 status dot
      g.on('node:change:data', ({ node }: any) => {
        if (node && node.isNode && node.isNode()) applyNodeStyle(node)
        regeneratePreview()
      })

      graph.value = g
      // 暴露到 window 方便调试
      ;(window as any).__etlGraph = g

      // ===== 节点 hover/select 高亮（仿工作流：默认灰色，hover/选中变蓝）=====
      const STROKE_BLUE = '#288FFF'

      // 节点分类色板 (Fix-2: 用 NODE_DEFINITIONS 里的 color, 真正落地到 SVG 左侧色条)
      const CATEGORY_BAR_COLOR: Record<string, string> = {
        source: '#3B82F6',     // 蓝
        transform: '#F59E0B',  // 橙
        filter: '#14B8A6',     // 青
        compare: '#F97316',    // 橙红
        join: '#A855F7',       // 紫
        sql: '#EC4899',        // 粉
        cdc: '#10B981',        // 绿
        sink: '#0EA5E9',       // 天蓝
        preview: '#6366F1'     // 靛
      }
      // 状态指示灯颜色 (Fix-3)
      const STATUS_COLORS = {
        empty: '#94A3B8',   // 灰: 未配置
        partial: '#F59E0B', // 橙: 缺字段
        ready: '#10B981',   // 绿: 配置完整
        error: '#EF4444'    // 红: 有错误
      }

      const applyNodeStyle = (node: any) => {
        if (!node || !node.isNode || !node.isNode()) return
        const isHover = node === hoverCell
        const isSelected = g.isSelected(node)
        const t = node.data?.type
        // Fix-2: 分类色条 (每个节点根据自己的 type 上色)
        const catColor = CATEGORY_BAR_COLOR[t] || '#94A3B8'
        node.attr('categoryBar/fill', catColor)
        // Fix-3: 状态指示灯
        const cfg = node.data?.config || {}
        const status = computeNodeStatus(t, cfg)
        node.attr('statusDot/fill', STATUS_COLORS[status] || STATUS_COLORS.empty)

        if (isHover || isSelected) {
          node.attr('body/stroke', STROKE_BLUE)
          node.attr('body/strokeDasharray', isSelected ? '5 3' : '5 3')
          node.attr('body/strokeWidth', 2)
          node.attr('label/fill', STROKE_BLUE)
          // 切换 icon 到选中版（蓝色）
          const hoverSvg = NODE_ICON_SVG_HOVER[t] || NODE_ICON_SVG_HOVER.source
          node.attr('image/xlink:href', iconToDataUrl(hoverSvg))
          // out port 同步变蓝
          node.attr('circle/stroke', STROKE_BLUE)
          node.attr('plus/fill', STROKE_BLUE)
        } else {
          node.attr('body/stroke', '#D0D5DD')
          node.attr('body/strokeDasharray', 'none')
          node.attr('body/strokeWidth', 1)
          node.attr('label/fill', '#0F172A')
          // 默认 icon（灰色）
          const defSvg = NODE_ICON_SVG[t] || NODE_ICON_SVG.source
          node.attr('image/xlink:href', iconToDataUrl(defSvg))
          // out port 还原
          node.attr('circle/stroke', '#94A3B8')
          node.attr('plus/fill', '#94A3B8')
        }
      }

      let hoverCell: any = null
      g.on('cell:mouseenter', ({ cell }: any) => {
        if (hoverCell && hoverCell !== cell) {
          const prev = hoverCell
          hoverCell = null
          applyNodeStyle(prev)
        }
        hoverCell = cell
        applyNodeStyle(cell)
      })
      g.on('cell:mouseleave', ({ cell }: any) => {
        if (hoverCell === cell) hoverCell = null
        applyNodeStyle(cell)
      })

      // 选中状态变化时刷新所有节点
      g.on('selection:changed', () => {
        g.getNodes().forEach((n: any) => applyNodeStyle(n))
      })
      g.on('cell:selected', ({ cell }: any) => applyNodeStyle(cell))
      g.on('cell:unselected', ({ cell }: any) => applyNodeStyle(cell))

      // ====== 删除交互 ======
      // 1) Delete / Backspace 删除选中节点或连线 (带 confirm)
      g.bindKey(['delete', 'backspace'], () => {
        const selected = g.getSelectedCells?.() || []
        if (selected.length === 0) return false
        // 用 window.confirm 而不是 NPopconfirm (keydown 不能触发 popconfirm)
        const count = selected.length
        const msg = `确认删除选中的 ${count} 个元素 (${count > 1 ? '含节点和连线' : ''})?此操作不可撤销。`
        if (!window.confirm(msg)) return false
        selected.forEach((cell: any) => {
          if (cell.isEdge?.()) {
            g.removeEdge(cell.id)
          } else if (cell.isNode?.()) {
            if (cell.id === activeNodeId.value) {
              activeNodeId.value = ''
              drawerShow.value = false
            }
            g.removeNode(cell.id)
          }
        })
        return false
      })

      // 2) 节点右键菜单 - 配置/复制/重命名/删除 (Fix-13.10)
      g.on('node:contextmenu', ({ node, e }: any) => {
        if (e && e.preventDefault) e.preventDefault()
        const nodeData = node.getData() || {}
        const nodeType = nodeData.type
        showContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            {
              label: '⚙ 配置节点',
              disabled: !nodeType,
              onClick: () => {
                // 触发配置(根据 type 走对应 dialog)
                g.trigger('node:click', { node })
              }
            },
            {
              label: '⎘ 复制节点',
              onClick: () => {
                const pos = node.getPosition()
                const cfg = JSON.parse(JSON.stringify(nodeData.config || {}))
                // 复制时清空 alias,让 addNodeByType 自动生成新 alias
                delete cfg.alias
                const newNode = addNodeByType(nodeType, pos.x + 60, pos.y + 40, cfg, nodeData.label)
                if (newNode) {
                  message.success('已复制节点')
                }
              }
            },
            {
              label: '✎ 重命名(alias)',
              onClick: () => {
                const cur = (nodeData.config || {}).alias || nodeData.label || ''
                const next = window.prompt('修改节点别名 (SQL 中作为表别名引用):', cur)
                if (next && next.trim() && next.trim() !== cur) {
                  const cfg = nodeData.config || {}
                  cfg.alias = next.trim()
                  node.setData({ ...nodeData, label: next.trim(), config: cfg })
                  node.attr('label/text', next.trim())
                  applyNodeStyle(node)
                  markDirty()
                }
              }
            },
            { type: 'divider' },
            {
              label: '🗑 删除节点',
              danger: true,
              onClick: () => {
                if (!window.confirm('确认删除该节点?此操作不可撤销。')) return
                if (node.id === activeNodeId.value) {
                  activeNodeId.value = ''
                  drawerShow.value = false
                }
                g.removeNode(node.id)
              }
            }
          ]
        })
      })

      // 3) 连线右键菜单 - 删除
      g.on('edge:contextmenu', ({ edge, e }: any) => {
        if (e && e.preventDefault) e.preventDefault()
        showContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            {
              label: '删除连线',
              danger: true,
              onClick: () => g.removeEdge(edge.id)
            }
          ]
        })
      })

      // 4) 空白处右键 - 清空所有
      g.on('blank:contextmenu', ({ e, x, y }: any) => {
        if (e && e.preventDefault) e.preventDefault()
        const nodes = g.getNodes()
        const edges = g.getEdges()
        showContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            {
              label: '粘贴(暂未实现)',
              disabled: true
            },
            { type: 'divider' },
            {
              label: `清空全部 (${nodes.length} 节点 / ${edges.length} 连线)`,
              danger: true,
              disabled: nodes.length === 0 && edges.length === 0,
              onClick: () => {
                if (!confirm(`确认清空画布？将删除 ${nodes.length} 个节点和 ${edges.length} 条连线。`)) return
                g.clearCells()
                activeNodeId.value = ''
                drawerShow.value = false
              }
            }
          ]
        })
      })

      // 5) 选中变化时,关掉右键菜单
      g.on('blank:click cell:click', () => {
        hideContextMenu()
      })
    }

    // ====== 自定义右键菜单(轻量,不引入 Naive UI 库) ======
    const ctxMenu = ref<{
      visible: boolean
      x: number
      y: number
      items: Array<{ label?: string; type?: string; danger?: boolean; disabled?: boolean; onClick?: () => void }>
    }>({ visible: false, x: 0, y: 0, items: [] })
    function showContextMenu(opts: { x: number; y: number; items: any[] }) {
      ctxMenu.value = { visible: true, x: opts.x, y: opts.y, items: opts.items }
    }
    function hideContextMenu() {
      ctxMenu.value.visible = false
    }
    function onCtxItemClick(idx: number) {
      const item = ctxMenu.value.items[idx]
      ctxMenu.value.visible = false
      if (item && item.onClick) item.onClick()
    }
    function onGlobalCtxClose(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('.etl-ctx-menu')) {
        hideContextMenu()
      }
    }
    onMounted(() => {
      document.addEventListener('click', onGlobalCtxClose)
    })
    onBeforeUnmount(() => {
      document.removeEventListener('click', onGlobalCtxClose)
    })

    const regeneratePreview = () => {
      if (!graph.value) {
        previewSql.value = ''
        return
      }
      const nodes = graph.value.getNodes()
      const edges = graph.value.getEdges()
      const data = nodes.map((n) => {
        const pos = n.getPosition()
        return {
          id: n.id,
          type: (n.getData() || {}).type || 'source',
          label: (n.getData() || {}).label || n.id,
          x: pos.x,
          y: pos.y,
          config: (n.getData() || {}).config || {}
        }
      })
      const edgeData = edges.map((e) => ({
        source: e.getSourceCellId(),
        target: e.getTargetCellId()
      }))
      previewSql.value = generateSqlFromGraph(data, edgeData)
    }

    const fetchJobData = async () => {
      loading.value = true
      try {
        // The graph is created after both the canvas and minimap refs are
        // mounted.  When the designer is opened directly, the API request can
        // finish before that asynchronous retry completes; in that case
        // addNodeByType silently ignores every restored node.  Wait for the
        // graph explicitly before restoring database-backed content.
        for (let i = 0; i < 40 && !graph.value; i++) {
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
        if (!graph.value) {
          console.warn('[etl-designer] graph was not ready before restoring job data')
        }
        const { data: dir } = await queryBaseDir({ type: 'ETL' })
        // 兜底：dir 可能是字符串，也可能是 { data: '...' } 包装
        const dirStr: string =
          typeof dir === 'string' ? dir : (dir && (dir.data as string)) || '/tmp/dolphinscheduler/etl/'
        const base = dirStr.endsWith('/') ? dirStr : dirStr + '/'
        // The resource API may return the global ETL base directory while the
        // list page carries a tenant-specific directory (for example
        // /tmp/dolphinscheduler/default/etl/demo1). Preserve the directory
        // selected in the list page instead of falling back to the API base.
        const requestedDir = routePrefix
          ? (routePrefix.endsWith('/') ? routePrefix : routePrefix + '/')
          : base

        // 加载目录列表（用作保存路径下拉）
        availableDirs.value = [{ label: '根目录', value: base }]
        try {
          const listRes: any = await queryResourceList({
            type: 'ETL',
            fullName: base
          })
          const entries = (listRes as any)?.totalList
            || (listRes as any)?.data?.totalList
            || (listRes as any)?.data
            || listRes
            || []
          ;(Array.isArray(entries) ? entries : []).forEach((item: any) => {
            if (item && item.directory && item.fullName) {
              const fn: string = item.fullName
              const subDir = fn.endsWith('/') ? fn : fn + '/'
              availableDirs.value.push({
                label: (item.name || '') + '/',
                value: subDir
              })
            }
          })
          // 当前作业所在目录必须始终可选，即使目录接口只返回文件。
          if (requestedDir && !availableDirs.value.some((d) => d.value === requestedDir)) {
            availableDirs.value.push({ label: requestedDir.replace(base, '') || '当前目录', value: requestedDir })
          }
        } catch (e) {
          // ignore
        }

        if (jobName.value) {
          // 编辑现有作业：优先使用列表页传入的当前目录
          saveDir.value = requestedDir
          fullName.value = requestedDir + jobName.value + '.json'
          try {
            const res: any = await viewEtlContent({ fullName: fullName.value })
            const raw = res.content || ''
            let parsed: any = { name: jobName.value, description: '', nodes: [], edges: [] }
            try {
              parsed = raw ? JSON.parse(raw) : parsed
            } catch (e) {
              // 某些历史保存链路会把整个 JSON 的换行编码成字面量
              // "\\n"，先还原控制字符再解析，避免编辑器恢复为空白。
              try {
                parsed = JSON.parse(raw.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t'))
              } catch (normalizedError) {
                // 兼容旧 json
                console.warn('[etl-designer] JSON parse failed', String((normalizedError as any)?.message || normalizedError), raw.slice(0, 120))
              }
            }
            description.value = parsed.description || ''
            if (parsed.saveDir && parsed.saveDir.startsWith(base)) {
              saveDir.value = parsed.saveDir
            }

            await nextTick()
            console.info('[etl-designer] restoring job data', fullName.value, raw.length, Array.isArray(parsed.nodes) ? parsed.nodes.length : 0, !!graph.value, JSON.stringify((parsed.nodes || []).map((n: any) => n.type)))
            ;(parsed.nodes || []).forEach((n: any) => {
              addNodeByType(n.type, n.x, n.y, n.config, n.label, n.id)
            })
            // 兼容旧资源：旧边只保存 source/target 时，按目标节点的入边顺序补齐端口。
            const usedTargetPorts = new Map<string, Set<string>>()
            ;(parsed.edges || []).forEach((e: any) => {
              const targetNode = graph.value?.getCellById(e.target) as Node | null
              const targetType = String((targetNode?.getData?.() || {}).type || '')
              const allowedTargetPorts = inputPortsForType(targetType)
              const used = usedTargetPorts.get(e.target) || new Set<string>()
              const targetPort = e.targetPort && allowedTargetPorts.includes(e.targetPort)
                ? e.targetPort
                : allowedTargetPorts.find((port) => !used.has(port))
              // 旧资源可能包含超出节点契约的入边（例如单入字段转换被连了两次）。
              // 这类边不再挂到节点上，避免加载后看起来仍有多个输入。
              if (allowedTargetPorts.length === 0 || !targetPort) return
              if (targetPort) used.add(targetPort)
              usedTargetPorts.set(e.target, used)
              const sourceNode = graph.value?.getCellById(e.source) as Node | null
              const sourceType = String((sourceNode?.getData?.() || {}).type || '')
              const sourcePort = e.sourcePort && outputPortsForType(sourceType).includes(e.sourcePort)
                ? e.sourcePort
                : outputPortsForType(sourceType)[0]
              if (!sourcePort) return
              graph.value?.addEdge({
                ...(e.id ? { id: e.id } : {}),
                source: { cell: e.source, port: sourcePort },
                target: { cell: e.target, port: targetPort },
                shape: 'edge',
                attrs: {
                  line: { stroke: '#2080f0', strokeWidth: 2, targetMarker: { name: 'block' } }
                }
              })
            })
            regeneratePreview()
          } catch (e: any) {
            // 文件不存在也无所谓（新建场景）
            console.warn('[etl-designer] restore content failed', e?.message || e)
          }
        } else {
          // 新建：使用列表页当前目录，未传目录时回到根目录
          saveDir.value = requestedDir
        }
      } catch (e: any) {
        // 静默失败，避免顶部红色错误条
        console.warn('[etl-designer] fetchJobData failed:', e?.message || e)
      } finally {
        loading.value = false
      }
    }

    // ===== JOIN 节点对话框 =====
    // 打开 join 配置对话框前,先收集两个上游节点 + 各自输出字段
    function openJoinDialog(node: Node) {
      if (!graph.value) return
      const allNodes = graph.value.getNodes()
      const allEdges = graph.value.getEdges()
      // 找两条入边对应的源节点(按入边创建顺序:第一条 → in1主表,第二条 → in2查表)
      const incoming = allEdges.filter((e: Edge) => e.getTargetCellId() === node.id)
      const upstreamIds = incoming.map((e: Edge) => e.getSourceCellId())
      joinUpstream.value = upstreamIds.map((uid: string, idx: number) => {
        const u = allNodes.find((x: Node) => x.id === uid)
        const ud = u?.getData() || {}
        const ucfg = ud.config || {}
        // 所有上游节点都从统一输出契约读取字段；transform 输出来自 outputs。
        const fields: Array<{ name: string; type: string }> = getNodeOutputFields(ucfg)
        const alias = ucfg.alias || ('t_' + (uid || '').replace(/[^a-zA-Z0-9]/g, ''))
        return {
          id: uid,
          type: ud.type || '',
          label: ud.label || uid,
          alias,
          fields
        }
      })
      // 强制 deep clone 让 JoinConfigDialog 内部的 watch 触发(否则同引用数组 watch 不会 fire)
      joinUpstream.value = JSON.parse(JSON.stringify(joinUpstream.value))
      // 若 cfg.leftAlias / rightAlias 已存,且与 inferred aliases 不同 → 让用户在 dialog 里手动调整
      joinDialogNode.value = { id: node.id, config: JSON.parse(JSON.stringify(node.getData()?.config || {})) }
      joinDialogShow.value = true
    }

    function handleJoinSaved(newConfig: any) {
      if (!graph.value || !joinDialogNode.value) return
      const node = graph.value.getCellById(joinDialogNode.value.id)
      if (!node) return
      const data = node.getData() || {}
      data.config = newConfig
      // 别名 → 同步到 label
      const alias = (newConfig.alias || '').trim()
      const def = NODE_DEFINITIONS.find((d) => d.type === data.type)
      if (alias && (!data.label || data.label === def?.label || data.label === (data.config?.alias || ''))) {
        data.label = alias
      } else {
        data.label = newConfig.alias || data.label || '表连接'
      }
      node.setData(data)
      node.setAttrByPath('label/text', data.label)
      // 触发画布保存
      try { graph.value.toJSON() } catch {}
    }

    // ===== TRANSFORM 节点对话框 =====
    // 字段转换是 1 入 1 出：输入字段由上游节点的输出契约提供，输出字段由对话框显式声明。
    function openTransformDialog(node: Node) {
      if (!graph.value) return
      const allNodes = graph.value.getNodes()
      const incoming = graph.value.getEdges().filter((e: Edge) => e.getTargetCellId() === node.id)
      const upstreamIds = incoming.map((e: Edge) => e.getSourceCellId())
      transformUpstream.value = upstreamIds.map((uid: string) => {
        const upstream = allNodes.find((item) => item.id === uid)
        const data = upstream?.getData() || {}
        const config = data.config || {}
        return {
          id: uid,
          type: String(data.type || ''),
          label: String(data.label || uid),
          alias: String(config.alias || data.label || uid),
          fields: getNodeOutputFields(config)
        }
      })
      transformUpstream.value = JSON.parse(JSON.stringify(transformUpstream.value))
      transformDialogNode.value = {
        id: node.id,
        config: JSON.parse(JSON.stringify(node.getData()?.config || {}))
      }
      transformDialogShow.value = true
    }

    function handleTransformSaved(newConfig: any) {
      if (!graph.value || !transformDialogNode.value) return
      const node = graph.value.getCellById(transformDialogNode.value.id)
      if (!node) return
      const data = node.getData() || {}
      const outputs = Array.isArray(newConfig.outputs) ? newConfig.outputs : []
      const fields = outputs
        .filter((item: any) => item?.enabled !== false)
        .map((item: any) => ({ name: String(item.name || '').trim(), type: String(item.type || 'STRING') }))
        .filter((item: any) => item.name)
      // fields/columns 作为兼容字段，供旧节点和下游节点读取；SQL 生成以 outputs 为准。
      newConfig.fields = fields
      newConfig.columns = outputs
        .filter((item: any) => item?.enabled !== false)
        .map((item: any) => ({ src: String(item.source || '').trim(), dst: String(item.name || '').trim(), type: String(item.type || 'STRING') }))
        .filter((item: any) => item.src && item.dst)
      data.config = newConfig
      const alias = String(newConfig.alias || '').trim()
      const def = NODE_DEFINITIONS.find((item) => item.type === data.type)
      if (alias && (!data.label || data.label === def?.label || data.label === (data.config?.alias || ''))) {
        data.label = alias
      } else {
        data.label = alias || data.label || '字段转换'
      }
      node.setData(data)
      node.setAttrByPath('label/text', data.label)
      try { graph.value.toJSON() } catch {}
    }

    // ===== FILTER 节点对话框 =====
    function openFilterDialog(node: Node) {
      if (!graph.value) return
      const allNodes = graph.value.getNodes()
      const allEdges = graph.value.getEdges()
      // 找入边对应的上游节点(只支持 1 入 1 出)
      const incoming = allEdges.filter((e: Edge) => e.getTargetCellId() === node.id)
      const upstreamIds = incoming.map((e: Edge) => e.getSourceCellId())
      filterUpstream.value = upstreamIds.map((uid: string) => {
        const u = allNodes.find((x: Node) => x.id === uid)
        const ud = u?.getData() || {}
        const ucfg = ud.config || {}
        const fields: Array<{ name: string; type: string }> = getNodeOutputFields(ucfg)
        const alias = ucfg.alias || ('t_' + (uid || '').replace(/[^a-zA-Z0-9]/g, ''))
        return {
          id: uid,
          type: ud.type || '',
          label: ud.label || uid,
          alias,
          fields
        }
      })
      filterUpstream.value = JSON.parse(JSON.stringify(filterUpstream.value))
      filterDialogNode.value = { id: node.id, config: JSON.parse(JSON.stringify(node.getData()?.config || {})) }
      filterDialogShow.value = true
    }

    function handleFilterSaved(newConfig: any) {
      if (!graph.value || !filterDialogNode.value) return
      const node = graph.value.getCellById(filterDialogNode.value.id)
      if (!node) return
      const data = node.getData() || {}
      data.config = newConfig
      // 别名 → 同步到 label
      const alias = (newConfig.alias || '').trim()
      const def = NODE_DEFINITIONS.find((d) => d.type === data.type)
      if (alias && (!data.label || data.label === def?.label || data.label === (data.config?.alias || ''))) {
        data.label = alias
      } else {
        data.label = newConfig.alias || data.label || '过滤'
      }
      node.setData(data)
      node.setAttrByPath('label/text', data.label)
      try { graph.value.toJSON() } catch {}
    }

    // ===== COMPARE 节点对话框 =====
    const compareDialogShow = ref(false)
    const compareDialogNode = ref<{ id: string; config: any } | null>(null)
    const compareUpstream = ref<Array<{
      id: string
      type: string
      label: string
      alias: string
      fields: Array<{ name: string; type: string }>
    }>>([])

    function openCompareDialog(node: Node) {
      if (!graph.value) return
      const allNodes = graph.value.getNodes()
      const allEdges = graph.value.getEdges()
      // 找入边对应的上游节点(需要 2 个)
      const incoming = allEdges.filter((e: Edge) => e.getTargetCellId() === node.id)
      const upstreamIds = incoming.map((e: Edge) => e.getSourceCellId()).slice(0, 2)
      compareUpstream.value = upstreamIds.map((uid: string) => {
        const u = allNodes.find((x: Node) => x.id === uid)
        const ud = u?.getData() || {}
        const ucfg = ud.config || {}
        const fields: Array<{ name: string; type: string }> = getNodeOutputFields(ucfg)
        const alias = ucfg.alias || ('t_' + (uid || '').replace(/[^a-zA-Z0-9]/g, ''))
        return {
          id: uid,
          type: ud.type || '',
          label: ud.label || uid,
          alias,
          fields
        }
      })
      compareUpstream.value = JSON.parse(JSON.stringify(compareUpstream.value))
      compareDialogNode.value = {
        id: node.id,
        config: JSON.parse(JSON.stringify(node.getData()?.config || {}))
      }
      compareDialogShow.value = true
    }

    function handleCompareSaved(newConfig: any) {
      if (!graph.value || !compareDialogNode.value) return
      const node = graph.value.getCellById(compareDialogNode.value.id)
      if (!node) return
      const data = node.getData() || {}
      data.config = newConfig
      const alias = (newConfig.alias || '').trim()
      const def = NODE_DEFINITIONS.find((d) => d.type === data.type)
      if (alias && (!data.label || data.label === def?.label || data.label === (data.config?.alias || ''))) {
        data.label = alias
      } else {
        data.label = newConfig.alias || data.label || '数据比对'
      }
      node.setData(data)
      node.setAttrByPath('label/text', data.label)
      try { graph.value.toJSON() } catch {}
    }

    // ===== SQL 节点对话框 =====
    // SQL 节点:支持 N 个入边(每条边的源节点 alias 都能在 SQL 里引用)
    // 用户 SQL 里出现的:
    //   - FROM upstream            → 单入边时替换为 (上游子查询) AS up
    //   - FROM upstreams           → 多入边时替换为 (子查询1) AS u1, (子查询2) AS u2
    function openSqlDialog(node: Node) {
      if (!graph.value) return
      const allNodes = graph.value.getNodes()
      const allEdges = graph.value.getEdges()
      // 找所有入边对应的上游节点
      const incoming = allEdges.filter((e: Edge) => e.getTargetCellId() === node.id)
      const upstreamIds = incoming.map((e: Edge) => e.getSourceCellId())
      sqlUpstream.value = upstreamIds.map((uid: string) => {
        const u = allNodes.find((x: Node) => x.id === uid)
        const ud = u?.getData() || {}
        const ucfg = ud.config || {}
        const fields: Array<{ name: string; type: string }> = getNodeOutputFields(ucfg)
        const alias = ucfg.alias || ('t_' + (uid || '').replace(/[^a-zA-Z0-9]/g, ''))
        return {
          id: uid,
          type: ud.type || '',
          label: ud.label || uid,
          alias,
          tableName: ucfg.cascade?.table || ucfg.table || ucfg.tableName || '',
          databaseName: ucfg.cascade?.database || ucfg.database || '',
          fields
        }
      })
      sqlUpstream.value = JSON.parse(JSON.stringify(sqlUpstream.value))
      sqlDialogNode.value = {
        id: node.id,
        config: JSON.parse(JSON.stringify(node.getData()?.config || {}))
      }
      sqlDialogShow.value = true
    }

    function handleSqlSaved(newConfig: any) {
      if (!graph.value || !sqlDialogNode.value) return
      const node = graph.value.getCellById(sqlDialogNode.value.id)
      if (!node) return
      const data = node.getData() || {}
      // 把 outputs 同步到 data.fields,给下游节点引用 + 字段补全
      const outputs = Array.isArray(newConfig.outputs) ? newConfig.outputs : []
      const fields = outputs
        .map((o: any) => ({ name: String(o.name || '').trim(), type: String(o.type || 'STRING') }))
        .filter((f: any) => f.name)
      newConfig.fields = fields
      newConfig.columns = fields
      data.config = newConfig
      const alias = (newConfig.alias || '').trim()
      const def = NODE_DEFINITIONS.find((d) => d.type === data.type)
      if (alias && (!data.label || data.label === def?.label || data.label === (data.config?.alias || ''))) {
        data.label = alias
      } else {
        data.label = newConfig.alias || data.label || '自定义 SQL'
      }
      node.setData(data)
      node.setAttrByPath('label/text', data.label)
      try { graph.value.toJSON() } catch {}
    }

    const getInvalidTableInputs = () => {
      if (!graph.value) return [] as Array<{ label: string; missing: string[]; errors: string[] }>
      return graph.value.getNodes()
        .filter((node: any) => (node.getData() || {}).type === 'source')
        .map((node: any) => {
          const data = node.getData() || {}
          const validation = validateNodeConfig('source', data.config || {})
          return {
            label: data.label || data.config?.alias || '表输入',
            missing: validation.missing,
            errors: validation.errors
          }
        })
        .filter((item) => item.missing.length > 0 || item.errors.length > 0)
    }

    const performSave = async () => {
      if (!graph.value) return
      const invalidTableInputs = getInvalidTableInputs()
      if (invalidTableInputs.length > 0) {
        const detail = invalidTableInputs
          .map((item) => `${item.label}：${[...item.missing, ...item.errors].join('、')}`)
          .join('；')
        message.error(`请先完成表输入配置：${detail}`)
        return
      }
      if (!jobName.value.trim()) {
        message.error('请填写作业名')
        return
      }
      if (!/^[a-zA-Z0-9_\-]+$/.test(jobName.value.trim())) {
        message.error('作业名只支持字母数字下划线横线')
        return
      }
      if (!saveDir.value) {
        message.error('请选择保存路径')
        return
      }
      saving.value = true
      try {
        const nodes = graph.value.getNodes()
        const edges = graph.value.getEdges()
        const data: any = {
          name: jobName.value.trim(),
          description: description.value.trim(),
          saveDir: saveDir.value,
          version: 1,
          nodes: nodes.map((n) => {
            const pos = n.getPosition()
            return {
              id: n.id,
              type: (n.getData() || {}).type,
              label: (n.getData() || {}).label,
              x: pos.x,
              y: pos.y,
              config: (n.getData() || {}).config || {}
            }
          }),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.getSourceCellId(),
            target: e.getTargetCellId(),
            sourcePort: e.getSourcePortId?.() || undefined,
            targetPort: e.getTargetPortId?.() || undefined
          }))
        }

        // 调用 builder 生成可执行的 flink-learning properties 4 字段
        // 这些字段供 DS dolphinscheduler-task-etl task-plugin 直接喂给 flink jar
        try {
          const built = buildPipeline(
            datasources.value as any,
            data.nodes,
            data.edges,
            { parallelism: parallelism.value, jobName: data.name }
          )
          data.etl = {
            sources: built.sources,
            sinks: built.sinks,
            sql: built.sql,
            parallelism: built.parallelism,
            warnings: built.warnings
          }
          if (built.warnings && built.warnings.length > 0) {
            console.warn('[etl-designer] build warnings:', built.warnings)
          }
        } catch (buildErr: any) {
          console.error('[etl-designer] buildPipeline failed:', buildErr?.message || buildErr)
          message.warning('画布构建 ETL 失败：' + (buildErr?.message || '未知错误') + '，作业仍可保存（仅 designer 画布）')
        }
        const targetFullName = saveDir.value + jobName.value.trim() + '.json'
        if (isExistingJob.value) {
          await updateResourceContent({
            fullName: targetFullName,
            tenantCode: '',
            content: JSON.stringify(data, null, 2)
          })
        } else {
          await onlineCreateResource({
            pid: -1,
            type: 'ETL',
            fileName: jobName.value.trim(),
            suffix: 'json',
            description: description.value.trim(),
            content: JSON.stringify(data, null, 2),
            currentDir: saveDir.value
          })
          isExistingJob.value = true
        }
        fullName.value = targetFullName
        markSaved()
        message.success('保存成功')
      } catch (e: any) {
        message.error('保存失败: ' + (e.message || ''))
      } finally {
        saving.value = false
      }
    }

    const openSaveDialog = () => { saveDialogVisible.value = true }
    const confirmSave = async () => {
      if (!jobName.value.trim()) { message.error('请填写作业名'); return }
      saveDialogVisible.value = false
      await performSave()
    }

    // 加载 DS 数据源列表（供 builder 用）
    const loadDatasources = async () => {
      try {
        const res: any = await queryDataSourceListPaging({
          pageNo: 1,
          pageSize: 1000,
          searchVal: ''
        })
        const list = (res && (res.totalList || (res.data && res.data.totalList))) || []
        datasources.value = list.map((d: any) => {
          // DolphinScheduler 后端把连接参数序列化在 connectionParams 字段
          let cp: any = {}
          if (d.connectionParams) {
            try {
              cp = typeof d.connectionParams === 'string'
                ? JSON.parse(d.connectionParams)
                : d.connectionParams
            } catch (e) {
              cp = {}
            }
          }
          // 从 jdbcUrl / address 解析 host / port / database
          // 兼容多种 jdbc 形式:
          //   jdbc:mysql://host:3306/db?a=b
          //   jdbc:oracle:thin:@//host:1521/service   ← service_name
          //   jdbc:oracle:thin:@host:1521:sid         ← sid
          //   jdbc:postgresql://host:5432/db
          //   jdbc:sqlserver://host:1433;databaseName=db
          const jdbcUrl: string = cp.jdbcUrl || cp.address || ''
          let host = '', port = 0, database = ''
          // Oracle thin @//host:port/service 或 @host:port:sid
          const oraSvc = jdbcUrl.match(/^jdbc:oracle:thin:@?\/\/([^:/]+):(\d+)\/(.+?)(?:\?.*)?$/i)
          const oraSid = jdbcUrl.match(/^jdbc:oracle:thin:@([^:/]+):(\d+):(.+?)(?:\?.*)?$/i)
          if (oraSvc) {
            host = oraSvc[1]; port = parseInt(oraSvc[2], 10); database = oraSvc[3]
          } else if (oraSid) {
            host = oraSid[1]; port = parseInt(oraSid[2], 10); database = oraSid[3]
          } else {
            // 标准 jdbc:NAME://host:port/db?params
            const urlMatch = jdbcUrl.match(/^jdbc:\w+:\/\/([^:/]+)(?::(\d+))?(?:\/([^?;]+))?/)
            if (urlMatch) {
              host = urlMatch[1]
              port = urlMatch[2] ? parseInt(urlMatch[2], 10) : 0
              database = urlMatch[3] || ''
            }
          }
          host = host || (d.host || cp.host || '')
          port = port || (d.port || cp.port || 0)
          database = database || (d.database || d.dbName || cp.database || '')
          return {
            id: String(d.id),
            // 保存后端原始 name/aliasName,用于 cascade.datasourceAlias 反查 dsId
            name: d.name || d.aliasName || '',
            aliasName: d.aliasName || d.name || '',
            type: (d.type || '').toLowerCase(),
            host,
            port,
            database,
            username: cp.user || d.userName || '',
            password: d.password || cp.password || '',
            options: cp || {}
          }
        })
      } catch (e) {
        console.warn('[etl-designer] loadDatasources failed:', e)
        datasources.value = []
      }
    }

    // ===== Fix-7: 日志分级解析 =====
    // 启发式把每行日志分成 info / warn / error / sql / data
    // 后端 Flink 日志没标准级别,所以用关键词匹配
    const stripAnsi = (s: string): string => s.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')

    interface LogLine { text: string; level: 'info' | 'warn' | 'error' | 'sql' | 'data' | 'meta' }

    const classifyLog = (raw: string): LogLine[] => {
      const out: LogLine[] = []
      const lines = stripAnsi(raw || '').split(/\r?\n/)
      for (let line of lines) {
        if (line == null) continue
        const t = line.trim()
        if (!t) { out.push({ text: '', level: 'meta' }); continue }
        // 1) 自定义标记
        if (/\[LOG-ERROR\]|^\s*ERROR\s|Exception in thread|^\s*Caused by:|FAILED|FAILURE/i.test(t)) {
          out.push({ text: line, level: 'error' }); continue
        }
        if (/\[LOG-WARN\]|^\s*WARN\s|deprecat/i.test(t)) {
          out.push({ text: line, level: 'warn' }); continue
        }
        if (/\[SQL\]|^SQL>|^Flink SQL>/i.test(t) || /^\s*(SELECT|CREATE|INSERT|VALUES|WITH)\b/i.test(t)) {
          out.push({ text: line, level: 'sql' }); continue
        }
        if (/\[DATA\]|^\s*\|\s*\|.*\|.*\|/i.test(t) || /^\s*\+---\+/i.test(t)) {
          out.push({ text: line, level: 'data' }); continue
        }
        if (/jobId=|status=|jobName=|提交中|检查|部署|deploy/i.test(t)) {
          out.push({ text: line, level: 'meta' }); continue
        }
        if (/\[LOG-INFO\]|^\s*INFO\s/i.test(t)) {
          out.push({ text: line, level: 'info' }); continue
        }
        // Flink 内部噪音 (org.apache.flink, java.util, ...) → 默认 info
        out.push({ text: line, level: 'info' })
      }
      return out
    }

    const classifiedLog = computed<LogLine[]>(() => classifyLog(testOutput.value))
    const filteredLog = computed<LogLine[]>(() => {
      const lvl = logFilter.value
      if (lvl === 'all') return classifiedLog.value
      return classifiedLog.value.filter((l) => l.level === lvl)
    })
    const logCounts = computed(() => {
      const c: Record<string, number> = { info: 0, warn: 0, error: 0, sql: 0, data: 0, meta: 0 }
      for (const l of classifiedLog.value) c[l.level] = (c[l.level] || 0) + 1
      return c
    })

    // 将 JDBC 唯一性冲突翻译成用户可直接理解的提示，同时保留原始日志便于排查。
    const formatTestRunMessage = (raw: string) => {
      const text = String(raw || '')
      if (!/(BatchUpdateException|unique|唯一性|违反表.*约束|ORA-00001|duplicate key)/i.test(text)) return text
      const detail = text.match(/违反表\[([^\]]+)\]唯一性约束条件\[([^\]]+)\]/i)
      const target = detail?.[1] || '目标表'
      const constraint = detail?.[2] ? `（约束：${detail[2]}）` : ''
      const fields = text.match(/冲突字段（主键）:\s*([^\n]+)/i)?.[1]?.trim()
      const fieldHint = fields ? `\n冲突字段：${fields}` : ''
      return `⚠️ 写入失败：${target} 存在主键或唯一键冲突${constraint}。${fieldHint}\n当前写入模式为 INSERT，冲突记录不会覆盖；如需覆盖，请将写入模式改为 REPLACE INTO。\n\n原始日志：\n${text}`
    }

    // 测试运行：调 flink-etl 的 /api/pipelines/run
    const handleTestRun = async () => {
      if (!graph.value) return
      const invalidTableInputs = getInvalidTableInputs()
      if (invalidTableInputs.length > 0) {
        const detail = invalidTableInputs
          .map((item) => `${item.label}：${[...item.missing, ...item.errors].join('、')}`)
          .join('；')
        testModalVisible.value = true
        testing.value = false
        testOutput.value = `⚠️ 表输入配置不完整：${detail}`
        testJobStatus.value = {
          jobId: '', status: 'FAILED', startTime: Date.now(), endTime: Date.now(), message: testOutput.value
        }
        message.error(`请先完成表输入配置：${detail}`)
        return
      }
      // 测试运行不需要持久化，所以允许用临时名（仅当用户未填写时）。
      const runName = jobName.value.trim() || `etl-test-${Date.now()}`
      // 打开实时日志弹窗（即使健康检查失败也会显示错误）
      testModalVisible.value = true
      testing.value = true
      testJobStatus.value = { jobId: '', status: 'PENDING', startTime: Date.now(), endTime: 0, message: '' }
      testOutput.value = '提交中... jobName=' + runName + '\n正在检查 ETL 后端健康状态...\n'
      // 1. 健康检查
      const healthy = await checkFlinkEtlHealth()
      if (!healthy) {
        testOutput.value += '\n[ERROR] ETL 后端不可达，请检查 DolphinScheduler 是否启动 (/dolphinscheduler/etl/test-run)\n'
        testing.value = false
        testJobStatus.value = { jobId: '', status: 'FAILED', startTime: Date.now(), endTime: Date.now(), message: testOutput.value }
        message.error('ETL 后端不可达，请检查 DolphinScheduler 是否启动 (/dolphinscheduler/etl/test-run)')
        return
      }
      testOutput.value = ''
      try {
        const nodes = graph.value.getNodes()
        const edges = graph.value.getEdges()
        const data: any = {
          name: runName,
          description: description.value.trim(),
          saveDir: saveDir.value,
          version: 1,
          nodes: nodes.map((n: any) => {
            const pos = n.getPosition()
            return {
              id: n.id,
              type: (n.getData() || {}).type,
              label: (n.getData() || {}).label,
              x: pos.x, y: pos.y,
              config: (n.getData() || {}).config || {}
            }
          }),
          edges: edges.map((e: any) => ({
            id: e.id,
            source: e.getSourceCellId(),
            target: e.getTargetCellId(),
            sourcePort: e.getSourcePortId?.() || undefined,
            targetPort: e.getTargetPortId?.() || undefined
          }))
        }
        // 2. 调 builder 生成 PipelineRequest
        // 2.0 预处理:把 sql 节点的 outputs 同步到 fields (供下游节点 fields 引用 + 补全)
        for (const n of data.nodes) {
          if (n.type === 'sql' && n.config) {
            const outputs = Array.isArray(n.config.outputs) ? n.config.outputs : []
            const fields = outputs
              .map((o: any) => ({ name: String(o.name || '').trim(), type: String(o.type || 'STRING') }))
              .filter((f: any) => f.name)
            n.config.fields = fields
            n.config.columns = fields
          }
        }
        const req = buildPipelineRequest(
          datasources.value as any,
          data.nodes,
          data.edges,
          data.name,
          parallelism.value
        )
        // Fix-8: 把构建出的 SQL/sources/sinks 暂存,供日志弹窗单独卡片展示
        lastBuiltSql.value = (req && (req as any).sql) || ''
        lastBuiltSources.value = (req && (req as any).sources) || []
        lastBuiltSinks.value = (req && (req as any).sinks) || []
        sqlCardCollapsed.value = false
        // 2.1 检测关键 warning：未配置 source / sink 数据源 → 拒绝提交
        if (req.warnings && req.warnings.length > 0) {
          const fatalWarnings = req.warnings.filter(
            (w: string) =>
              w.includes('缺少 datasourceId') ||
              w.includes('引用未知数据源') ||
              w.includes('没有任何 source 节点') ||
              w.includes('没有任何 sink / preview 节点') ||
              w.includes('画布中没有任何 source') ||
              w.includes('未设置输出字段')
          )
          if (fatalWarnings.length > 0) {
            testing.value = false
            testOutput.value = '⚠️ 配置不完整，请先检查画布:\n' + fatalWarnings.map((w: string) => '  - ' + w).join('\n')
            message.error(fatalWarnings[0])
            return
          }
        }
        if (req.sources.length === 0) {
          testing.value = false
          testOutput.value = '⚠️ 没有任何可执行的 source 节点，请先配置表输入节点的数据源、表名和字段'
          testJobStatus.value = { jobId: '', status: 'FAILED', startTime: Date.now(), endTime: Date.now(), message: testOutput.value }
          message.error('没有任何可执行的 source 节点，请先在节点上配置数据源')
          return
        }
        testOutput.value = '提交中... jobName=' + req.jobName + '\n'
        // 3. POST 调 flink-etl
        const job: any = await runFlinkPipeline(req)
        testJobId.value = job.jobId
        testJobStatus.value = job
        testOutput.value += 'jobId=' + job.jobId + ', status=' + job.status + '\n'
        message.success('已提交到 flink-etl，jobId=' + job.jobId)
        // 4. 轮询状态
        const poll = async () => {
          if (!testJobId.value) return
          const st: any = await getFlinkJobStatus(testJobId.value)
          testJobStatus.value = st
          testOutput.value = 'jobId=' + st.jobId + '\nstatus=' + st.status + '\nstartTime=' + new Date(st.startTime).toLocaleString() + '\n\n' + formatTestRunMessage(st.message || '')
          // 自动滚动到底部 (类似终端 tail -f)
          await nextTick()
          if (testLogRef.value) {
            testLogRef.value.scrollTop = testLogRef.value.scrollHeight
          }
          if (st.status === 'PENDING' || st.status === 'RUNNING') {
            setTimeout(poll, 2000)
          } else {
            testing.value = false
            if (st.status === 'SUCCESS') {
              message.success('flink-etl 作业完成')
            } else {
              const failure = formatTestRunMessage(st.message || '')
              message.error(failure.split('\n')[0] || 'flink-etl 作业失败')
            }
          }
        }
        setTimeout(poll, 2000)
      } catch (e: any) {
        testing.value = false
        message.error('测试运行失败：' + (e?.message || '未知错误'))
        testOutput.value += '\nERROR: ' + (e?.message || '') + '\n'
      }
    }

    // 停止测试运行
    const handleStopTest = async () => {
      if (!testJobId.value) return
      try {
        await stopFlinkJob(testJobId.value)
        message.success('已停止')
      } catch (e: any) {
        message.error('停止失败：' + (e?.message || ''))
      }
    }

    // 复制日志到剪贴板
    const handleCopyLog = async () => {
      const text = testOutput.value || ''
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text)
        } else {
          // Fallback: 创建一个临时 textarea
          const ta = document.createElement('textarea')
          ta.value = text
          ta.style.position = 'fixed'
          ta.style.left = '-9999px'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        message.success('日志已复制到剪贴板')
      } catch (e: any) {
        message.error('复制失败：' + (e?.message || ''))
      }
    }

    // 下载日志为 .log 文件
    const handleDownloadLog = () => {
      const text = testOutput.value || ''
      const status = testJobStatus.value?.status || 'UNKNOWN'
      const jobId = testJobId.value || 'no-id'
      const filename = `etl-test-${jobId}-${status}.log`
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const handleBack = () => {
      router.push({ name: 'etl-manage' })
    }

    // 从节点面板拖拽到画布
    let nodeCounter = 0
    const addNodeByType = (
      type: string,
      x?: number,
      y?: number,
      preConfig?: any,
      preLabel?: string,
      preId?: string
    ) => {
      const def = NODE_DEFINITIONS.find((d) => d.type === type)
      if (!def || !graph.value) return
      nodeCounter++
      // 没指定坐标时，找一个空位（避免与现有节点重叠）
      let posX = x
      let posY = y
      if (posX === undefined || posY === undefined) {
        const existNodes = graph.value.getNodes()
        // 候选位置网格：从 (100, 100) 开始，列宽 200，行高 100
        let found = false
        for (let row = 0; row < 20 && !found; row++) {
          for (let col = 0; col < 10 && !found; col++) {
            const cx = 100 + col * 220
            const cy = 100 + row * 100
            const conflict = existNodes.some((n: any) => {
              const np = n.getPosition()
              return Math.abs(np.x - cx) < 180 && Math.abs(np.y - cy) < 80
            })
            if (!conflict) {
              posX = cx
              posY = cy
              found = true
            }
          }
        }
      }
      const pos = {
        x: posX !== undefined ? posX : 100 + (nodeCounter % 5) * 200,
        y: posY !== undefined ? posY : 200 + Math.floor(nodeCounter / 5) * 120
      }
      const config: any = preConfig || {}
      // label = alias：节点名称就是 SQL 别名
      // 默认别名：<type>1, <type>2 ... 自增直到全局唯一（仿 flinksql-etl）
      if (!config.alias) {
        let i = 1
        let cand = `${type}${i}`
        while (isAliasTaken(cand, '')) {
          i++
          cand = `${type}${i}`
        }
        config.alias = cand
      }
      const label = preLabel || config.alias
      const node = graph.value.addNode({
        ...(preId ? { id: preId } : {}),
        shape: 'etl-task',
        x: pos.x,
        y: pos.y,
        width: 220,
        height: 48,
        data: { type, label, config },
        attrs: {
          // icon 走自定义 markup（追加在 body/label 之间）
          image: {
            'xlink:href': iconToDataUrl(NODE_ICON_SVG[type] || NODE_ICON_SVG.source),
            width: 30,
            height: 30,
            x: 9,
            y: 9
          },
          label: {
            text: label,
            refX: 45,
            refY: 0.5,
            textAnchor: 'start',
            'text-vertical-anchor': 'middle',
            fill: '#333',
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'Microsoft Yahei',
            strokeWidth: 0,
            textWrap: { width: 160, ellipsis: true }
          }
        },
        // 节点级 markup：在注册的 rect(body+label) 基础上加 image
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'image', selector: 'image' },
          { tagName: 'text', selector: 'label' }
        ],
        // 端口数量按节点类型固定，避免用户把边连到错误的输入位置。
        ports: [
          ...inputPortsForType(type).map((id) => ({ id, group: id })),
          ...outputPortsForType(type).map((id) => ({ id, group: id }))
        ]
      })
      regeneratePreview()
      return node
    }

    const handleDragStart = (e: DragEvent, type: string) => {
      e.dataTransfer?.setData('etl-node-type', type)
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer?.getData('etl-node-type')
      if (!type || !graph.value) return
      // 直接传 client 坐标（clientToLocal 自动处理容器偏移和 view 变换）
      const point = graph.value.clientToLocal(e.clientX, e.clientY)
      // 居中放置（节点宽 220、高 48）
      addNodeByType(type, point.x - 110, point.y - 24)
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    // 节点配置更新
    const onConfigChange = () => {
      if (!graph.value || !activeNodeId.value) return
      const node = graph.value.getCellById(activeNodeId.value)
      if (!node) return
      const data = node.getData() || {}
      data.config = JSON.parse(JSON.stringify(activeNodeConfig.value))
      // label = alias：保证两边一致
      data.label = (activeNodeConfig.value.alias && activeNodeConfig.value.alias.trim()) || data.label
      node.setData(data)
      node.setAttrByPath('label/text', data.label)
      regeneratePreview()
    }

    // 表输入是可执行 ETL 的入口，未完成级联配置时保持抽屉打开，避免用户误以为已经保存。
    const applyActiveNodeConfig = () => {
      onConfigChange()
      if (activeNodeMeta.value?.type === 'source') {
        const validation = validateNodeConfig('source', activeNodeConfig.value)
        if (validation.status !== 'ready') {
          const detail = [...validation.missing, ...validation.errors].join('、')
          message.error(`表输入配置未完成：${detail}`)
          return
        }
      }
      drawerShow.value = false
      message.success('配置已应用到画布')
    }

    /**
     * 校验别名：
     *   - 必填
     *   - 全局唯一（同一画布内任意两个节点不能重名，排除自己）
     *   - 仅允许 [a-zA-Z0-9_]，首位必须是字母
     */
    const isAliasTaken = (alias: string, excludeNodeId: string): boolean => {
      if (!graph.value || !alias) return false
      return graph.value.getNodes().some((n: any) => {
        if (n.id === excludeNodeId) return false
        const cfg = (n.getData() || {}).config || {}
        return (cfg.alias || '').trim() === alias
      })
    }
    const isValidAliasFormat = (alias: string): boolean => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(alias)

    const refreshAliasFeedback = () => {
      const alias = (activeNodeConfig.value.alias || '').trim()
      if (!alias) {
        aliasFeedback.value = { status: 'warning', tip: '请输入别名（必填，SQL 中作为表别名引用）' }
        return false
      }
      if (!isValidAliasFormat(alias)) {
        aliasFeedback.value = {
          status: 'error',
          tip: '别名只能包含字母/数字/下划线，且首位必须是字母'
        }
        return false
      }
      if (isAliasTaken(alias, activeNodeId.value)) {
        aliasFeedback.value = {
          status: 'error',
          tip: `别名 "${alias}" 已被其他节点占用，请换一个`
        }
        return false
      }
      // 有效状态不再额外显示提示文字，避免在输入框下方占用一整行。
      // 只有必填、格式或重名错误时才显示反馈。
      aliasFeedback.value = { status: undefined, tip: '' }
      return true
    }

    const onAliasInputChange = () => {
      refreshAliasFeedback()
      // label = alias：节点名称 = SQL 别名，实时同步到画布
      if (graph.value && activeNodeId.value) {
        const node = graph.value.getCellById(activeNodeId.value)
        if (node) {
          const data = node.getData() || {}
          const alias = (activeNodeConfig.value.alias || '').trim()
          const def = NODE_DEFINITIONS.find((d) => d.type === data.type)
          // 别名同时写入 label（label 就是 alias）
          activeNodeConfig.value.label = alias
          data.label = alias || def?.label || ''
          data.config = JSON.parse(JSON.stringify(activeNodeConfig.value))
          node.setData(data)
          node.setAttrByPath('label/text', data.label)
          regeneratePreview()
        }
      }
    }

    onMounted(async () => {
      buildGraph()
      await nextTick()
      await fetchJobData()
      await loadDatasources()
    })

    onBeforeUnmount(() => {
      graph.value?.dispose()
      if (_nowTimer) clearInterval(_nowTimer)
    })

    return () => (
      <div class={[Styles.container, Styles.light]}>
        {/* 顶部操作栏：名称与状态，详细信息在保存时集中填写 */}
        <div class={Styles.toolbar}>
          {/* 左侧: 作业名输入 + 状态徽章 */}
          <NSpace align='center' size={8}>
            <span style='font-size: 15px; font-weight: 600; color: #1f2937;'>{jobName.value || '未命名 ETL 作业'}</span>
            {/* Fix-13.3: 已保存/未保存 徽章,未保存时变橙色 + 圆点动画 */}
            <NTag
              type={saved.value ? 'success' : 'warning'}
              size='small'
              round
            >
              {{
                default: () => saved.value
                  ? '✓ 已保存'
                  : h('span', {
                    style: 'display: inline-flex; align-items: center; gap: 4px;'
                  }, [
                    h('span', {
                      style: 'width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; animation: etl-pulse 1.5s ease-in-out infinite;'
                    }),
                    '未保存'
                  ])
              }}
            </NTag>
            <span style='color: #94a3b8; font-size: 12px;'>
              {lastSavedAt.value > 0
                ? (saved.value ? `保存于 ${formatAgo(lastSavedAt.value)}` : `上次保存: ${formatAgo(lastSavedAt.value)}`)
                : '新作业'}
            </span>
          </NSpace>
          <div style='flex: 1;' />
          {/* 右侧操作 */}
          <NSpace align='center' size={8}>
            {/* Fix-13.9: 测试运行按钮 disabled 加 tooltip 解释 */}
            <NTooltip>
              {{
                trigger: () => h('span', { style: 'display: inline-block;' },
                  h(NButton, {
                    type: 'primary',
                    ghost: true,
                    size: 'small',
                    loading: testing.value,
                    onClick: handleTestRun,
                    disabled: !graph.value || graph.value.getNodes().length === 0
                  }, { default: () => '▶ 测试运行' })
                ),
                default: () => {
                  if (!graph.value || graph.value.getNodes().length === 0) {
                    return '请先添加至少一个节点到画布'
                  }
                  return '用当前画布提交一次测试运行(Flink MiniCluster)'
                }
              }}
            </NTooltip>
            {testJobId.value && (testJobStatus.value?.status === 'RUNNING' || testJobStatus.value?.status === 'PENDING') ? (
              <NButton size='small' onClick={handleStopTest}>停止</NButton>
            ) : null}
            {/* Fix-13.7: 关闭按钮在有未保存改动时弹 confirm 拦截 */}
            <NButton type='primary' size='small' loading={saving.value} onClick={openSaveDialog}>
              {{ icon: () => <NIcon><SaveOutlined /></NIcon>, default: () => '保存' }}
            </NButton>
            {saved.value ? (
              h(NButton, { size: 'small', onClick: handleBack }, { icon: () => h(NIcon, null, { default: () => h(RollbackOutlined) }), default: () => '关闭' })
            ) : (
              h(NPopconfirm, {
                onPositiveClick: () => handleBack()
              }, {
                default: () => '有未保存的改动,确认关闭?\n关闭后画布状态将丢失。',
                trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { icon: () => h(NIcon, null, { default: () => h(RollbackOutlined) }), default: () => '关闭' })
              })
            )}
          </NSpace>
        </div>

        <NModal v-model:show={saveDialogVisible.value} preset='card' title='保存 ETL 作业' style='width: 520px; max-width: 92vw;' mask-closable={false}>
          <NForm labelPlacement='top'>
            <NFormItem label='作业名称' required>
              <NInput v-model:value={jobName.value} placeholder='请输入作业名称' disabled={isExistingJob.value} onUpdateValue={() => markDirty()} />
            </NFormItem>
            <NFormItem label='备注'>
              <NInput v-model:value={description.value} type='textarea' rows={3} placeholder='填写作业用途或运行说明（可选）' />
            </NFormItem>
            <NFormItem label='保存路径' required>
              <NSelect v-model:value={saveDir.value} options={availableDirs.value} placeholder='请选择保存路径' />
            </NFormItem>
            <NSpace justify='end'>
              <NButton onClick={() => { saveDialogVisible.value = false }}>取消</NButton>
              <NButton type='primary' loading={saving.value} onClick={confirmSave}>保存</NButton>
            </NSpace>
          </NForm>
        </NModal>

        {/* 主体 */}
        <div class={Styles.content}>
          {/* 左侧节点面板 */}
          <div class={Styles.sidebar}>
            <div class={Styles['sidebar-title']}>节点面板</div>
            <NCollapse defaultExpandedNames={['source', 'transform', 'sql', 'join', 'cdc', 'sink']} accordion>
              {['source', 'transform', 'sql', 'join', 'cdc', 'sink'].map((cat) => {
                const items = NODE_DEFINITIONS.filter((d) => d.category === cat)
                if (items.length === 0) return null
                const titles: Record<string, string> = {
                  source: '数据源',
                  transform: '转换',
                  sql: 'SQL',
                  join: '连接',
                  cdc: '变更捕获',
                  sink: '输出'
                }
                return (
                  <NCollapseItem
                    key={cat}
                    title={titles[cat]}
                    name={cat}
                  >
                    {items.map((d) => (
                      <div
                        key={d.type}
                        draggable='true'
                        onDragstart={(e: DragEvent) => handleDragStart(e, d.type)}
                        class={Styles['node-item']}
                      >
                        <NIcon size={20} color='#64748b' class={Styles['node-icon']} aria-hidden='true'>
                          {h(NODE_ICON_COMPONENTS[d.type] || DatabaseOutlined)}
                        </NIcon>
                        <span class={Styles['node-label']}>{d.label}</span>
                        <span
                          class={[
                            Styles['node-fav'],
                            favorites.value.includes(d.type) ? Styles['node-fav-active'] : ''
                          ]}
                          onClick={(e: MouseEvent) => {
                            e.stopPropagation()
                            toggleFav(d.type)
                          }}
                        >
                          {favorites.value.includes(d.type) ? '★' : '☆'}
                        </span>
                      </div>
                    ))}
                  </NCollapseItem>
                )
              })}
            </NCollapse>
          </div>

          {/* 中央画布 */}
          <div class={Styles.canvas}>
            <div
              ref={paperEl}
              onDrop={handleDrop}
              onDragover={handleDragOver}
              style='width: 100%; height: 100%;'
            ></div>
            {loading.value && (
              <div
                style='position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.7);'
              >
                加载中...
              </div>
            )}
            {/* 小地图（minimap）——仿创建工作流 */}
            <div
              ref={minimapEl}
              class={Styles.minimap}
            ></div>

            {/* 自定义右键菜单 */}
            {ctxMenu.value.visible && (
              <div
                class='etl-ctx-menu'
                style={{
                  position: 'fixed',
                  left: ctxMenu.value.x + 'px',
                  top: ctxMenu.value.y + 'px',
                  zIndex: 9999,
                  background: '#FFFFFF',
                  border: '1px solid #E7E5E0',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.06)',
                  padding: '4px',
                  minWidth: '180px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
                  fontSize: '13px'
                }}
              >
                {ctxMenu.value.items.map((item, idx) => (
                  item.type === 'divider' ? (
                    <div
                      key={'div_' + idx}
                      style={{
                        height: '1px',
                        background: '#E7E5E0',
                        margin: '4px 0'
                      }}
                    />
                  ) : (
                    <div
                      key={'item_' + idx}
                      class={'etl-ctx-item' + (item.danger ? ' danger' : '') + (item.disabled ? ' disabled' : '')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                        color: item.danger ? '#B91C1C' : (item.disabled ? '#A8A29E' : '#1C1917'),
                        fontWeight: item.danger ? 500 : 400,
                        transition: 'background 0.1s'
                      }}
                      onClick={() => !item.disabled && onCtxItemClick(idx)}
                      onMouseenter={(e: any) => {
                        if (!item.disabled) e.currentTarget.style.background = item.danger ? '#FEF2F2' : '#F5F5F4'
                      }}
                      onMouseleave={(e: any) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {item.label}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 测试运行实时日志弹窗 (Fix-7: 日志分级折叠 / Fix-8: SQL 单独卡片) */}
        <NModal
          show={testModalVisible.value}
          onUpdateShow={(v) => { testModalVisible.value = v }}
          preset='card'
          title='测试运行日志'
          style='width: 980px; max-width: 95vw;'
          mask-closable={false}
          closable
        >
          {{
            default: () => (
              <div>
                {/* 顶部状态栏 */}
                <div style='display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 10px 14px; border-radius: 6px; background: #f5f7fa; margin-bottom: 12px;'>
                  <NSpace align='center' size={6}>
                    <span style='color: #6b7280; font-size: 13px;'>状态</span>
                    <NTag type={testStatusInfo.value.type as any} size='medium' round>
                      {testStatusInfo.value.text}
                    </NTag>
                    {testing.value && <NSpin size='small' />}
                  </NSpace>
                  <span style='color: #6b7280; font-size: 13px;'>
                    jobId: <code style='background:#eaeaea;padding:2px 6px;border-radius:3px;font-family:Menlo,Consolas,monospace;'>{testJobId.value || '-'}</code>
                  </span>
                  <span style='color: #6b7280; font-size: 13px;'>
                    耗时: <strong style='color:#2080f0;'>{testDuration.value}</strong> s
                  </span>
                  {testJobStatus.value?.startTime ? (
                    <span style='color: #9ca3af; font-size: 12px;'>
                      {new Date(testJobStatus.value.startTime).toLocaleString()}
                    </span>
                  ) : null}
                </div>

                <NTabs type='line' default-value='log' size='small'>
                  {/* --- Tab 1: SQL & 数据源 (Fix-8) --- */}
                  <NTabPane name='sql' tab='执行的 SQL / 数据源'>
                    {{
                      default: () => h('div', { style: 'min-height: 320px;' }, [
                        // 数据源列表
                        h('div', { style: 'margin-bottom: 12px;' }, [
                          h('div', { style: 'font-weight: 600; font-size: 13px; color: #0f172a; margin-bottom: 6px;' },
                            '数据源 (Sources) ' + (lastBuiltSources.value.length > 0 ? `· ${lastBuiltSources.value.length}` : '')),
                          lastBuiltSources.value.length === 0
                            ? h(NEmpty, { size: 'small', description: '本次执行没有 source 节点' })
                            : h('div', { style: 'display: flex; flex-wrap: wrap; gap: 6px;' },
                                lastBuiltSources.value.map((s: any) =>
                                  h(NTag, { type: 'info', size: 'small', round: true }, {
                                    default: () => `${s.table || s.alias || s.datasourceAlias || JSON.stringify(s).slice(0, 40)}`
                                  })
                                )
                              )
                        ]),
                        // Sink
                        lastBuiltSinks.value.length > 0
                          ? h('div', { style: 'margin-bottom: 12px;' }, [
                              h('div', { style: 'font-weight: 600; font-size: 13px; color: #0f172a; margin-bottom: 6px;' },
                                '输出目标 (Sinks) · ' + lastBuiltSinks.value.length),
                              h('div', { style: 'display: flex; flex-wrap: wrap; gap: 6px;' },
                                lastBuiltSinks.value.map((s: any) =>
                                  h(NTag, { type: 'success', size: 'small', round: true }, {
                                    default: () => `${s.table || s.alias || s.datasourceAlias || JSON.stringify(s).slice(0, 40)}`
                                  })
                                )
                              )
                            ])
                          : null,
                        // 生成的 SQL
                        h('div', [
                          h('div', {
                            style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;'
                          }, [
                            h('div', { style: 'font-weight: 600; font-size: 13px; color: #0f172a;' },
                              '生成的 Flink SQL'),
                            h(NSpace, { size: 4 }, () => [
                              h(NButton, {
                                size: 'tiny',
                                onClick: () => { sqlCardCollapsed.value = !sqlCardCollapsed.value }
                              }, () => sqlCardCollapsed.value ? '展开' : '折叠'),
                              h(NButton, {
                                size: 'tiny',
                                onClick: async () => {
                                  try {
                                    await navigator.clipboard.writeText(lastBuiltSql.value || '')
                                    message.success('SQL 已复制')
                                  } catch (e: any) {
                                    message.error('复制失败: ' + (e?.message || ''))
                                  }
                                },
                                disabled: !lastBuiltSql.value
                              }, () => '复制 SQL')
                            ])
                          ]),
                          sqlCardCollapsed.value
                            ? null
                            : h(NScrollbar, { style: 'max-height: 320px;' }, () =>
                                h('pre', {
                                  style: 'margin: 0; padding: 12px; background: #1e1e1e; color: #fde68a; font-family: Menlo, Consolas, monospace; font-size: 12px; line-height: 1.6; white-space: pre; border-radius: 6px;'
                                }, lastBuiltSql.value || '（未生成 SQL）')
                              )
                        ])
                      ])
                    }}
                  </NTabPane>
                  {/* --- Tab 2: 运行日志 (Fix-7 分级) --- */}
                  <NTabPane name='log' tab={'运行日志 (' + (classifiedLog.value.length) + ')'}>
                    {{
                      default: () => h('div', {}, [
                        // 工具栏
                        h('div', {
                          style: 'display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px;'
                        }, [
                          // 分级 tab
                          h(NSpace, { size: 4 }, () => [
                            h(NButton, {
                              size: 'tiny',
                              type: logFilter.value === 'all' ? 'primary' : 'default',
                              onClick: () => { logFilter.value = 'all' }
                            }, () => `全部 ${classifiedLog.value.length}`),
                            h(NButton, {
                              size: 'tiny',
                              type: logFilter.value === 'error' ? 'error' : 'default',
                              onClick: () => { logFilter.value = 'error' },
                              disabled: logCounts.value.error === 0
                            }, () => `错误 ${logCounts.value.error}`),
                            h(NButton, {
                              size: 'tiny',
                              type: logFilter.value === 'warn' ? 'warning' : 'default',
                              onClick: () => { logFilter.value = 'warn' },
                              disabled: logCounts.value.warn === 0
                            }, () => `警告 ${logCounts.value.warn}`),
                            h(NButton, {
                              size: 'tiny',
                              type: logFilter.value === 'info' ? 'info' : 'default',
                              onClick: () => { logFilter.value = 'info' },
                              disabled: logCounts.value.info === 0
                            }, () => `INFO ${logCounts.value.info}`),
                            h(NButton, {
                              size: 'tiny',
                              type: logFilter.value === 'sql' ? 'success' : 'default',
                              onClick: () => { logFilter.value = 'sql' },
                              disabled: logCounts.value.sql === 0
                            }, () => `SQL ${logCounts.value.sql}`),
                            h(NButton, {
                              size: 'tiny',
                              type: logFilter.value === 'data' ? 'success' : 'default',
                              onClick: () => { logFilter.value = 'data' },
                              disabled: logCounts.value.data === 0
                            }, () => `DATA ${logCounts.value.data}`)
                          ]),
                          h(NSpace, { size: 4 }, () => [
                            h(NButton, { size: 'tiny', onClick: handleCopyLog, disabled: !testOutput.value }, () => '复制日志'),
                            h(NButton, { size: 'tiny', onClick: handleDownloadLog, disabled: !testOutput.value }, () => '下载日志')
                          ])
                        ]),
                        // 日志内容
                        h(NScrollbar, {
                          ref: (el: any) => { testLogRef.value = el && el.$el ? el.$el : el },
                          xScrollable: true,
                          style: 'max-height: 60vh; min-height: 360px;'
                        }, () =>
                          h('pre', {
                            style: 'margin: 0; padding: 12px; background: #1e1e1e; color: #d4d4d4; font-family: Menlo, Consolas, monospace; font-size: 12px; line-height: 1.6; white-space: pre; border-radius: 4px; min-width: 100%;'
                          },
                            filteredLog.value.length === 0
                              ? '（当前过滤下没有日志）'
                              : filteredLog.value.map((l) => {
                                  const colors: Record<string, string> = {
                                    error: '#fca5a5',
                                    warn: '#fde68a',
                                    sql: '#86efac',
                                    data: '#a5b4fc',
                                    meta: '#94a3b8',
                                    info: '#d4d4d4'
                                  }
                                  const c = colors[l.level] || '#d4d4d4'
                                  // [data-role="log-line"] for line
                                  return l.text === ''
                                    ? '\n'
                                    : h('div', {
                                      'data-role': 'log-line',
                                      'data-level': l.level,
                                      style: `color: ${c}; ${l.level === 'error' ? 'background: rgba(239, 68, 68, 0.12); padding: 0 4px; border-radius: 2px;' : ''}`
                                    }, l.text)
                                })
                          )
                        )
                      ])
                    }}
                  </NTabPane>
                </NTabs>
              </div>
            )
          }}
        </NModal>

        {/* JOIN 节点专用对话框 */}
        <JoinConfigDialog
          visible={joinDialogShow.value}
          node={joinDialogNode.value}
          upstream={joinUpstream.value}
          isAliasUsed={isAliasTaken}
          {...{ 'onUpdate:visible': (v: boolean) => { joinDialogShow.value = v } }}
          onSaved={(cfg: any) => handleJoinSaved(cfg)}
        />

        {/* FILTER 节点专用对话框 */}
        <FilterConfigDialog
          visible={filterDialogShow.value}
          nodeId={filterDialogNode.value?.id || ''}
          nodeConfig={filterDialogNode.value?.config || null}
          upstream={filterUpstream.value}
          {...{ 'onUpdate:visible': (v: boolean) => { filterDialogShow.value = v } }}
          onSaved={(cfg: any) => handleFilterSaved(cfg)}
          onDelete={(p: any) => {
            if (graph.value && p?.id) {
              graph.value.removeNode(p.id)
              filterDialogShow.value = false
            }
          }}
        />

        {/* TRANSFORM 节点专用对话框 */}
        <TransformConfigDialog
          visible={transformDialogShow.value}
          nodeId={transformDialogNode.value?.id || ''}
          nodeConfig={transformDialogNode.value?.config || null}
          upstream={transformUpstream.value}
          {...{ 'onUpdate:visible': (v: boolean) => { transformDialogShow.value = v } }}
          onSaved={(cfg: any) => handleTransformSaved(cfg)}
          onDelete={(p: any) => {
            if (graph.value && p?.id) {
              graph.value.removeNode(p.id)
              transformDialogShow.value = false
            }
          }}
        />

        {/* COMPARE 节点专用对话框 */}
        <CompareConfigDialog
          visible={compareDialogShow.value}
          nodeId={compareDialogNode.value?.id || ''}
          nodeConfig={compareDialogNode.value?.config || null}
          upstreams={compareUpstream.value}
          {...{ 'onUpdate:visible': (v: boolean) => { compareDialogShow.value = v } }}
          onSave={(cfg: any) => handleCompareSaved(cfg)}
          onDelete={(p: any) => {
            if (graph.value && p?.id) {
              graph.value.removeNode(p.id)
              compareDialogShow.value = false
            }
          }}
        />

        {/* SQL 节点专用对话框 */}
        <SqlConfigDialog
          visible={sqlDialogShow.value}
          nodeId={sqlDialogNode.value?.id || ''}
          nodeConfig={sqlDialogNode.value?.config || null}
          upstreams={sqlUpstream.value}
          isAliasUsed={isAliasTaken}
          {...{ 'onUpdate:visible': (v: boolean) => { sqlDialogShow.value = v } }}
          onSaved={(cfg: any) => handleSqlSaved(cfg)}
          onDeleted={(p: any) => {
            if (graph.value && p?.id) {
              graph.value.removeNode(p.id)
              sqlDialogShow.value = false
            }
          }}
        />

        {/* 节点配置抽屉：分组展示基础信息、节点配置和底部操作 */}
        <NDrawer v-model:show={drawerShow.value} width={620} placement='right' resizable={true} style='max-width: 92vw;'>
          <NDrawerContent title={activeNodeMeta.value?.label || '作业属性'}>
            {!activeNodeMeta.value ? (
              <NForm labelPlacement='top'>
                <NFormItem label='作业名' required>
                  <NInput v-model:value={jobName.value} placeholder='order-sync' />
                </NFormItem>
                <NFormItem label='备注'>
                  <NInput v-model:value={description.value} placeholder='作业描述' />
                </NFormItem>
                <NFormItem label='保存路径' required>
                  <NSelect
                    v-model:value={saveDir.value}
                    options={availableDirs.value}
                    placeholder='请选择保存路径'
                  />
                </NFormItem>
                <NDivider />
                <NSpace justify='end' style='width: 100%;'>
                  <NButton onClick={() => (drawerShow.value = false)}>关闭</NButton>
                </NSpace>
              </NForm>
            ) : (
              <NForm labelPlacement='top' class='etl-node-config-form'>
                <section class='etl-node-config-section etl-node-config-overview'>
                  <div class='etl-node-config-section-heading'>
                    <span>基本信息</span>
                    <span class='etl-node-config-section-hint'>用于识别画布节点和 SQL 别名</span>
                  </div>
                  <div class='etl-node-config-overview-grid'>
                    {/* 节点名称 = 节点别名：既是画布显示名，也是 SQL 中的表别名引用 */}
                    <NFormItem
                      label='节点名称(别名)'
                      required
                      feedback={aliasFeedback.value.tip || undefined}
                      validationStatus={aliasFeedback.value.status}
                      class='etl-node-config-item etl-node-config-item--alias'
                    >
                      <NInput
                        v-model:value={activeNodeConfig.value.alias}
                        placeholder='例如 users, orders, join1 — 英文/数字/下划线,首位必须是字母'
                        onUpdate:value={onAliasInputChange}
                      />
                    </NFormItem>
                    <NFormItem label='类型' class='etl-node-config-item etl-node-config-item--type'>
                      <NTag type='info'>{activeNodeMeta.value.type}</NTag>
                    </NFormItem>
                  </div>
                </section>
                <section class='etl-node-config-section'>
                  <div class='etl-node-config-section-heading'>
                    <span>节点配置</span>
                    <span class='etl-node-config-section-hint'>按节点类型填写必需参数</span>
                  </div>
                  <div class='etl-node-config-fields'>
                    {activeNodeMeta.value.fields.map((f: any) => {
                      const isCascadeField = f.type === 'datasource-cascade' || f.type === 'sink-cascade'
                      if (isCascadeField) {
                        return (
                          <div key={f.key} class='etl-node-config-item etl-node-config-item--cascade'>
                            <CascadeConfig
                              modelValue={activeNodeConfig.value.cascade || {}}
                              onUpdate:modelValue={(v: any) => {
                                activeNodeConfig.value.cascade = v
                                onConfigChange()
                              }}
                              mode={f.type === 'sink-cascade' ? 'sink' : 'source'}
                              onChange={onConfigChange}
                            />
                          </div>
                        )
                      }
                      return (
                        <NFormItem key={f.key} label={f.label} required={f.required} class='etl-node-config-item'>
                        {f.type === 'text' && (
                          <NInput
                            v-model:value={activeNodeConfig.value[f.key]}
                            placeholder={f.placeholder}
                            onUpdate:value={onConfigChange}
                          />
                        )}
                        {f.type === 'textarea' && (
                          <NInput
                            type='textarea'
                            rows={4}
                            v-model:value={activeNodeConfig.value[f.key]}
                            placeholder={f.placeholder}
                            onUpdate:value={onConfigChange}
                          />
                        )}
                        {f.type === 'number' && (
                          <NInputNumber
                            v-model:value={activeNodeConfig.value[f.key]}
                            onUpdate:value={onConfigChange}
                          />
                        )}
                        {f.type === 'select' && (
                          <NSelect
                            v-model:value={activeNodeConfig.value[f.key]}
                            options={f.options || []}
                            onUpdate:value={onConfigChange}
                          />
                        )}
                        </NFormItem>
                      )
                    })}
                  </div>
                </section>
                {activeNodeMeta.value.type === 'sink' && (() => {
                  const targetCols = Array.isArray(activeNodeConfig.value.cascade?.columns)
                    ? activeNodeConfig.value.cascade.columns : []
                  const existingMappings = Array.isArray(activeNodeConfig.value.fieldMappings)
                    ? activeNodeConfig.value.fieldMappings : []
                  // 上方“字段”列表是写入字段的唯一来源，映射表随选择同步，避免显示已取消的字段。
                  const mappings = targetCols.map((c: any) => {
                    const target = String(c.name || '').trim()
                    const existing = existingMappings.find((m: any) => String(m?.target || '').trim() === target)
                    const matchingSource = sinkSourceFields.value.find((field) => field.field === target)
                    const existingExpr = String(existing?.expr || '').trim()
                    const existingSourceField = String(existing?.sourceField || '').trim()
                    const sourceField = existingSourceField || matchingSource?.value || ''
                    return {
                      target,
                      sourceField,
                      expr: existingExpr && existingExpr !== target
                        ? existingExpr
                        : (sourceField || target),
                      type: String(c.type || existing?.type || 'STRING'),
                      enabled: existing?.enabled !== false
                    }
                  }).filter((m: any) => m.target)
                  const selectedNames = mappings.map((m: any) => m.target).join('|')
                  const storedNames = existingMappings.map((m: any) => String(m?.target || '').trim()).filter(Boolean).join('|')
                  const needsMappingSync = selectedNames !== storedNames || mappings.some((m: any, i: number) => {
                    const existing = existingMappings[i]
                    return existing?.enabled !== m.enabled ||
                      String(existing?.sourceField || '').trim() !== m.sourceField ||
                      String(existing?.expr || '').trim() !== m.expr
                  })
                  if (needsMappingSync) {
                    activeNodeConfig.value.fieldMappings = mappings
                  }
                  const updateMapping = (target: string, patch: Record<string, any>) => {
                    const item = (activeNodeConfig.value.fieldMappings || []).find(
                      (m: any) => String(m?.target || '').trim() === target
                    )
                    if (item) Object.assign(item, patch)
                    onConfigChange()
                  }
                  return (
                    <section class='etl-node-config-section'>
                      <div class='etl-node-config-section-heading'>
                        <span>字段映射</span>
                        <span class='etl-node-config-section-hint'>仅映射上方已选字段 · 先选来源字段，再按需填写转换表达式</span>
                      </div>
                      {mappings.length === 0 ? (
                        <NEmpty size='small' description='请在上方“字段”列表选择要写入的字段' />
                      ) : (
                        <div class='etl-field-mapping-table'>
                          <div class='etl-field-mapping-header'>
                            <span>写入</span>
                            <span>目标字段（类型）</span>
                            <span>来源字段（类型）</span>
                            <span>表达式</span>
                          </div>
                          {mappings.map((m: any, i: number) => (
                            <div key={`mapping-${i}`} class={`etl-field-mapping-row ${m.enabled === false ? 'disabled' : ''}`}>
                              <NSwitch
                                size='small'
                                value={m.enabled !== false}
                                aria-label={`写入 ${m.target}`}
                                onUpdate:value={(v: boolean) => updateMapping(m.target, { enabled: v })}
                              />
                              <div class='etl-field-mapping-target'>
                                <span class='etl-field-mapping-index'>{i + 1}</span>
                                <span>
                                  <strong>{m.target}</strong>
                                  <small>{m.type}</small>
                                </span>
                              </div>
                              <NSelect
                                size='small'
                                value={m.sourceField || null}
                                options={sinkSourceFields.value}
                                placeholder={sinkSourceFields.value.length ? '选择上游字段' : '暂无上游字段'}
                                filterable
                                clearable
                                disabled={m.enabled === false}
                                onUpdate:value={(v: string | null) => updateMapping(m.target, { sourceField: v || '', expr: v || '' })}
                              />
                              <NInput
                                size='small'
                                value={m.expr || ''}
                                placeholder={m.sourceField ? '可选：CAST(...) 或其他转换表达式' : '请输入来源表达式'}
                                clearable
                                disabled={m.enabled === false}
                                onUpdate:value={(v: string) => updateMapping(m.target, { expr: v })}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )
                })()}
                <div class='etl-node-config-actions'>
                  <NSpace>
                    <NButton onClick={() => (drawerShow.value = false)}>
                      取消
                    </NButton>
                    <NButton
                      type='primary'
                      onClick={applyActiveNodeConfig}
                    >
                      应用
                    </NButton>
                  </NSpace>
                </div>
              </NForm>
            )}
          </NDrawerContent>
        </NDrawer>
      </div>
    )
  }
})

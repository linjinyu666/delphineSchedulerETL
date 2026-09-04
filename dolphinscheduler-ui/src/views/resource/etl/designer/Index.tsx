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

import { defineComponent, ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
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
  useMessage
} from 'naive-ui'
import { RollbackOutlined, SaveOutlined, PlayCircleOutlined } from '@vicons/antd'
import { useRouter, useRoute } from 'vue-router'
import { Graph, Node, Edge } from '@antv/x6'
import {
  queryBaseDir,
  queryResourceList,
  viewResource,
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
import { runFlinkPipeline, getFlinkJobStatus, stopFlinkJob, checkFlinkEtlHealth } from '@/service/modules/flink-etl'
import { queryDataSourceListPaging } from '@/service/modules/data-source'
import CascadeConfig from './cascade-config.tsx'
import JoinConfigDialog from './JoinConfigDialog.tsx'
import FilterConfigDialog from './FilterConfigDialog.tsx'
import CompareConfigDialog from './CompareConfigDialog.tsx'
import Styles from './index.module.scss'

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
    const fullName = ref('')
    const description = ref('')
    const saveDir = ref('') // 用户选择的保存目录
    const parallelism = ref(2) // Flink 并行度
    const datasources = ref<any[]>([]) // DS 数据源列表（去重后供 builder 使用）
    const testing = ref(false) // 是否正在测试运行
    const testJobId = ref<string>('') // 当前测试运行 jobId
    const testJobStatus = ref<any>(null) // 测试运行状态轮询结果
    const testOutput = ref<string>('') // 测试运行输出日志
    const testModalVisible = ref(false) // 测试运行日志弹窗显示
    const testLogRef = ref<HTMLElement | null>(null) // 弹窗日志滚动容器 ref

    // 测试运行耗时(秒),实时计算
    const testDuration = computed(() => {
      const st = testJobStatus.value
      if (!st) return 0
      const start = st.startTime || 0
      const end = st.status === 'RUNNING' || st.status === 'PENDING' ? Date.now() : (st.endTime || start)
      if (!start) return 0
      return Math.max(0, Math.round((end - start) / 1000))
    })

    // 测试运行状态标签 (颜色 + 文本)
    const testStatusInfo = computed(() => {
      const status = testJobStatus.value?.status || ''
      const map: Record<string, { type: string; text: string }> = {
        PENDING: { type: 'warning', text: 'PENDING 排队中' },
        RUNNING: { type: 'info', text: 'RUNNING 运行中' },
        SUCCESS: { type: 'success', text: 'SUCCESS 成功' },
        FAILED:  { type: 'error',   text: 'FAILED 失败' }
      }
      return map[status] || { type: 'default', text: status || 'UNKNOWN' }
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

    const loading = ref(false)
    const saving = ref(false)
    const previewSql = ref('')

    const { renderNodeMenu } = useNodeMenu()

    // 注册自定义节点（端口 markup 才能生效，仿工作流 DAG）
    const X6_ETL_NODE = 'etl-task'
    Graph.unregisterNode(X6_ETL_NODE)
    Graph.registerNode(X6_ETL_NODE, {
      // 自定义 markup：rect body + 文本标题
      inherit: 'rect',
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'text', selector: 'label' }
      ],
      attrs: {
        body: {
          fill: '#FFFFFF',
          stroke: '#CCCCCC',
          strokeWidth: 2,
          rx: 6,
          ry: 6
        },
        label: {
          fill: '#333',
          fontSize: 14,
          fontWeight: 'bold',
          fontFamily: 'Microsoft Yahei',
          textAnchor: 'middle',
          refX: '50%',
          refY: '50%',
          'text-vertical-anchor': 'middle'
        }
      },
      ports: {
        groups: {
          // 输出端口（节点右侧 100% 50%，灰圆 + 加号）
          out: {
            position: { name: 'absolute', args: { x: '100%', y: '50%' } },
            markup: [
              {
                tagName: 'g',
                selector: 'body',
                children: [
                  { tagName: 'circle', selector: 'circle-outer' },
                  { tagName: 'text', selector: 'plus-text' },
                  { tagName: 'circle', selector: 'circle-inner' }
                ]
              }
            ],
            attrs: {
              'plus-text': {
                fontSize: 14,
                fill: '#CCCCCC',
                text: '+',
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
          },
          // 输入端口（节点左侧 0% 50%，空心圆 + 实心磁吸点）
          in: {
            position: { name: 'absolute', args: { x: '0%', y: '50%' } },
            markup: [
              {
                tagName: 'g',
                selector: 'body',
                children: [
                  { tagName: 'circle', selector: 'circle-outer' },
                  { tagName: 'circle', selector: 'circle-inner' }
                ]
              }
            ],
            attrs: {
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
          }
        }
      }
    })

    const buildGraph = () => {
      if (!paperEl.value) return
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
            // 强制要求连到 port 上（保证连线稳定）
            if (!targetPort) return false
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

      g.on('node:click', ({ node }: { node: Node }) => {
        activeNodeId.value = node.id
        const data = node.getData() || {}
        activeNodeMeta.value = NODE_DEFINITIONS.find((d) => d.type === data.type)
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
        // COMPARE 节点走专用对话框（不打开通用 drawer）
        if (data.type === 'compare') {
          openCompareDialog(node)
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

      graph.value = g
      // 暴露到 window 方便调试
      ;(window as any).__etlGraph = g

      // ===== 节点 hover/select 高亮（仿工作流：默认灰色，hover/选中变蓝）=====
      const STROKE_BLUE = '#288FFF'

      const applyNodeStyle = (node: any) => {
        if (!node || !node.isNode || !node.isNode()) return
        const isHover = node === hoverCell
        const isSelected = g.isSelected(node)
        const t = node.data?.type
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
          node.attr('body/stroke', '#CCCCCC')
          node.attr('body/strokeDasharray', 'none')
          node.attr('body/strokeWidth', 2)
          node.attr('label/fill', '#333')
          // 默认 icon（灰色）
          const defSvg = NODE_ICON_SVG[t] || NODE_ICON_SVG.source
          node.attr('image/xlink:href', iconToDataUrl(defSvg))
          // out port 还原
          node.attr('circle/stroke', '#CCCCCC')
          node.attr('plus/fill', '#CCCCCC')
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
      // 1) Delete / Backspace 删除选中节点或连线
      g.bindKey(['delete', 'backspace'], () => {
        const selected = g.getSelectedCells?.() || []
        if (selected.length === 0) return false
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

      // 2) 节点右键菜单 - 删除
      g.on('node:contextmenu', ({ node, e }: any) => {
        if (e && e.preventDefault) e.preventDefault()
        showContextMenu({
          x: e.clientX,
          y: e.clientY,
          items: [
            {
              label: '删除节点',
              danger: true,
              onClick: () => {
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
        const { data: dir } = await queryBaseDir({ type: 'ETL' })
        // 兜底：dir 可能是字符串，也可能是 { data: '...' } 包装
        const dirStr: string =
          typeof dir === 'string' ? dir : (dir && (dir.data as string)) || '/tmp/dolphinscheduler/etl/'
        const base = dirStr.endsWith('/') ? dirStr : dirStr + '/'

        // 加载目录列表（用作保存路径下拉）
        availableDirs.value = [{ label: '根目录', value: base }]
        try {
          const listRes: any = await queryResourceList({
            type: 'ETL',
            fullName: base
          })
          ;((listRes as any)?.totalList || listRes || []).forEach((item: any) => {
            if (item && item.directory && item.fullName) {
              const fn: string = item.fullName
              const subDir = fn.endsWith('/') ? fn : fn + '/'
              availableDirs.value.push({
                label: (item.name || '') + '/',
                value: subDir
              })
            }
          })
        } catch (e) {
          // ignore
        }

        if (jobName.value) {
          // 编辑现有作业：默认目录就是根
          saveDir.value = base
          fullName.value = base + jobName.value + '.json'
          try {
            const res: any = await viewResource({
              fullName: fullName.value,
              tenantCode: '',
              skipLineNum: 0,
              limit: -1
            })
            const raw = res.content || ''
            let parsed: any = { name: jobName.value, description: '', nodes: [], edges: [] }
            try {
              parsed = raw ? JSON.parse(raw) : parsed
            } catch (e) {
              // 兼容旧 json
            }
            description.value = parsed.description || ''
            if (parsed.saveDir && availableDirs.value.some(d => d.value === parsed.saveDir)) {
              saveDir.value = parsed.saveDir
            }

            await nextTick()
            ;(parsed.nodes || []).forEach((n: any) => {
              addNodeByType(n.type, n.x, n.y, n.config, n.label)
            })
            ;(parsed.edges || []).forEach((e: any) => {
              graph.value?.addEdge({
                source: { cell: e.source },
                target: { cell: e.target },
                shape: 'edge',
                attrs: {
                  line: { stroke: '#2080f0', strokeWidth: 2, targetMarker: { name: 'block' } }
                }
              })
            })
            regeneratePreview()
          } catch (e: any) {
            // 文件不存在也无所谓（新建场景）
          }
        } else {
          // 新建：默认根目录
          saveDir.value = base
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
        // 推断字段:source 节点 cascade.columns;transform 节点 columns;其他空
        const fields: Array<{ name: string; type: string }> =
          (ucfg.cascade?.columns || ucfg.columns || [])
            .map((c: any) => typeof c === 'string'
              ? { name: c, type: 'STRING' }
              : { name: c.name || c.dst || '', type: c.type || 'STRING' })
            .filter((f: any) => f.name)
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
        // 推断字段:source 节点 cascade.columns;transform 节点 columns;filter 节点也是 columns
        const fields: Array<{ name: string; type: string }> =
          (ucfg.cascade?.columns || ucfg.columns || [])
            .map((c: any) => typeof c === 'string'
              ? { name: c, type: 'STRING' }
              : { name: c.name || c.dst || '', type: c.type || 'STRING' })
            .filter((f: any) => f.name)
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
        const fields: Array<{ name: string; type: string }> =
          (ucfg.cascade?.columns || ucfg.columns || [])
            .map((c: any) => typeof c === 'string'
              ? { name: c, type: 'STRING' }
              : { name: c.name || c.dst || '', type: c.type || 'STRING' })
            .filter((f: any) => f.name)
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

    const handleSave = async () => {
      if (!graph.value) return
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
            target: e.getTargetCellId()
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
        try {
          await updateResourceContent({
            fullName: targetFullName,
            tenantCode: '',
            content: JSON.stringify(data, null, 2)
          })
        } catch (e) {
          await onlineCreateResource({
            pid: -1,
            type: 'ETL',
            fileName: jobName.value.trim(),
            suffix: 'json',
            description: description.value.trim(),
            content: JSON.stringify(data, null, 2),
            currentDir: saveDir.value
          })
        }
        fullName.value = targetFullName
        message.success('保存成功')
      } catch (e: any) {
        message.error('保存失败: ' + (e.message || ''))
      } finally {
        saving.value = false
      }
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

    // 测试运行：调 flink-etl 的 /api/pipelines/run
    const handleTestRun = async () => {
      if (!graph.value) return
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
            target: e.getTargetCellId()
          }))
        }
        // 2. 调 builder 生成 PipelineRequest
        const req = buildPipelineRequest(
          datasources.value as any,
          data.nodes,
          data.edges,
          data.name,
          parallelism.value
        )
        // 2.1 检测关键 warning：未配置 source / sink 数据源 → 拒绝提交
        if (req.warnings && req.warnings.length > 0) {
          const fatalWarnings = req.warnings.filter(
            (w: string) =>
              w.includes('缺少 datasourceId') ||
              w.includes('引用未知数据源') ||
              w.includes('没有任何 source 节点') ||
              w.includes('没有任何 sink / preview 节点') ||
              w.includes('画布中没有任何 source')
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
          testOutput.value = 'jobId=' + st.jobId + '\nstatus=' + st.status + '\nstartTime=' + new Date(st.startTime).toLocaleString() + '\n\n' + (st.message || '')
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
              message.error('flink-etl 作业失败：' + (st.message || '').slice(0, 200))
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
      preLabel?: string
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
        // ports：source 类只有 out；其它（transform/join/cdc/sql/sink/preview）有 in+out
        ports: type === 'source'
          ? [{ id: 'out', group: 'out' }]
          : [
              { id: 'in', group: 'in' },
              { id: 'out', group: 'out' }
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
      aliasFeedback.value = { status: 'success', tip: '别名可用' }
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

    const handleDeleteNode = () => {
      if (!graph.value || !activeNodeId.value) return
      graph.value.removeNode(activeNodeId.value)
      activeNodeId.value = ''
      drawerShow.value = false
    }

    onMounted(async () => {
      buildGraph()
      await fetchJobData()
      await loadDatasources()
    })

    onBeforeUnmount(() => {
      graph.value?.dispose()
    })

    return () => (
      <div class={[Styles.container, Styles.light]}>
        {/* 顶部条（工具栏）——参考创建工作流样式 */}
        <div class={Styles.toolbar}>
          <span class={Styles['toolbar-title']}>创建 ETL 作业</span>
          <div style='flex: 1;' />
          <NSpace>
            <NButton
              type='primary'
              ghost
              size='small'
              loading={testing.value}
              onClick={handleTestRun}
            >
              {{ default: () => '测试运行' }}
            </NButton>
            {testJobId.value && (testJobStatus.value?.status === 'RUNNING' || testJobStatus.value?.status === 'PENDING') ? (
              <NButton size='small' onClick={handleStopTest}>停止</NButton>
            ) : null}
            <NButton
              type='primary'
              size='small'
              loading={saving.value}
              onClick={handleSave}
            >
              保存
            </NButton>
            <NButton size='small' onClick={handleBack}>关闭</NButton>
          </NSpace>
        </div>

        {/* 主体 */}
        <div class={Styles.content}>
          {/* 左侧节点面板 */}
          <div class={Styles.sidebar}>
            <div class={Styles['sidebar-title']}>节点面板</div>
            <NCollapse defaultExpandedNames={['source', 'transform', 'join', 'sink']} accordion>
              {['source', 'transform', 'join', 'sink'].map((cat) => {
                const items = NODE_DEFINITIONS.filter((d) => d.category === cat)
                if (items.length === 0) return null
                const titles: Record<string, string> = {
                  source: '数据源',
                  transform: '转换',
                  join: '连接',
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
                        <img
                          src={iconToDataUrl(NODE_ICON_SVG[d.type] || NODE_ICON_SVG.source)}
                          alt={d.label}
                          class={Styles['node-icon']}
                          draggable={false}
                        />
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

        {/* 测试运行实时日志弹窗 */}
        <NModal
          show={testModalVisible.value}
          onUpdateShow={(v) => { testModalVisible.value = v }}
          preset='card'
          title='测试运行日志'
          style='width: 900px; max-width: 95vw;'
          mask-closable={false}
          closable
        >
          {{
            default: () => (
              <div>
                {/* 顶部状态栏 */}
                <div style='display: flex; align-items: center; gap: 16px; padding: 8px 12px; border-radius: 4px; background: #f5f7fa; margin-bottom: 12px;'>
                  <NSpace align='center'>
                    <span style='color: #666; font-size: 13px;'>状态:</span>
                    <NTag type={testStatusInfo.value.type as any} size='medium'>
                      {testStatusInfo.value.text}
                    </NTag>
                    {testing.value && <NSpin size='small' />}
                  </NSpace>
                  <span style='color: #666; font-size: 13px;'>
                    jobId: <code style='background:#eaeaea;padding:2px 6px;border-radius:3px;'>{testJobId.value || '-'}</code>
                  </span>
                  <span style='color: #666; font-size: 13px;'>
                    耗时: <strong style='color:#2080f0;'>{testDuration.value}</strong> 秒
                  </span>
                  {testJobStatus.value?.startTime ? (
                    <span style='color: #999; font-size: 12px;'>
                      开始: {new Date(testJobStatus.value.startTime).toLocaleTimeString()}
                    </span>
                  ) : null}
                </div>

                {/* 工具栏 */}
                <div style='display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 8px;'>
                  <NButton size='tiny' onClick={handleCopyLog} disabled={!testOutput.value}>
                    📋 复制日志
                  </NButton>
                  <NButton size='tiny' onClick={handleDownloadLog} disabled={!testOutput.value}>
                    ⬇ 下载日志
                  </NButton>
                </div>

                {/* 日志内容 */}
                <NScrollbar
                  ref={(el: any) => { testLogRef.value = el && el.$el ? el.$el : el }}
                  x-scrollable
                  style='max-height: 60vh; min-height: 360px;'
                >
                  <pre style='margin: 0; padding: 12px; background: #1e1e1e; color: #d4d4d4; font-family: Menlo, Consolas, "Courier New", monospace; font-size: 12px; line-height: 1.6; white-space: pre; border-radius: 4px; display: inline-block; min-width: 100%;'>
                    {testOutput.value || '等待日志输出...'}
                  </pre>
                </NScrollbar>
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

        {/* 节点配置抽屉 */}
        <NDrawer v-model:show={drawerShow.value} width={480} placement='right'>
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
              <NForm labelPlacement='top'>
                {/* 节点名称 = 节点别名：既是画布显示名，也是 SQL 中的表别名引用 */}
                <NFormItem
                  label='节点名称(别名)'
                  required
                  feedback={aliasFeedback.value.tip}
                  validationStatus={aliasFeedback.value.status}
                >
                  <NInput
                    v-model:value={activeNodeConfig.value.alias}
                    placeholder='例如 users, orders, join1 — 英文/数字/下划线,首位必须是字母'
                    onUpdate:value={onAliasInputChange}
                  />
                </NFormItem>
                <NFormItem label='类型'>
                  <NTag type='info'>{activeNodeMeta.value.type}</NTag>
                </NFormItem>
                <NDivider>节点配置</NDivider>
                {activeNodeMeta.value.fields.map((f: any) => (
                  <NFormItem key={f.key} label={f.label} required={f.required}>
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
                    {(f.type === 'datasource-cascade' || f.type === 'sink-cascade') && (
                      <CascadeConfig
                        modelValue={activeNodeConfig.value.cascade || {}}
                        onUpdate:modelValue={(v: any) => {
                          activeNodeConfig.value.cascade = v
                          onConfigChange()
                        }}
                        mode={f.type === 'sink-cascade' ? 'sink' : 'source'}
                        onChange={onConfigChange}
                      />
                    )}
                  </NFormItem>
                ))}
                <NDivider />
                <NSpace justify='space-between' style='width: 100%;'>
                  <NButton
                    type='error'
                    ghost
                    onClick={handleDeleteNode}
                  >
                    删除节点
                  </NButton>
                  <NSpace>
                    <NButton onClick={() => (drawerShow.value = false)}>
                      取消
                    </NButton>
                    <NButton
                      type='primary'
                      onClick={() => {
                        onConfigChange()
                        drawerShow.value = false
                        message.success('配置已应用到画布')
                      }}
                    >
                      应用
                    </NButton>
                  </NSpace>
                </NSpace>
              </NForm>
            )}
          </NDrawerContent>
        </NDrawer>
      </div>
    )
  }
})
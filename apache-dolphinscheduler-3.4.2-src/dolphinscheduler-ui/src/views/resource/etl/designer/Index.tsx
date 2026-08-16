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
        drawerShow.value = true
      })

      g.on('node:delete', ({ node }: { node: Node }) => {
        if (node.id === activeNodeId.value) {
          activeNodeId.value = ''
          drawerShow.value = false
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
    }

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
          const jdbcUrl: string = cp.jdbcUrl || cp.address || ''
          const urlMatch = jdbcUrl.match(/^jdbc:\w+:\/\/([^:/]+)(?::(\d+))?(?:\/([^?]+))?/)
          const host = urlMatch ? urlMatch[1] : (d.host || cp.host || '')
          const port = urlMatch && urlMatch[2] ? parseInt(urlMatch[2], 10) : (d.port || cp.port || 0)
          const database = urlMatch && urlMatch[3] ? urlMatch[3] : (d.database || d.dbName || cp.database || '')
          return {
            id: String(d.id),
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
      // 1. 健康检查
      const healthy = await checkFlinkEtlHealth()
      if (!healthy) {
        message.error('ETL 后端不可达，请检查 DolphinScheduler 是否启动 (/dolphinscheduler/etl/test-run)')
        return
      }
      testing.value = true
      testOutput.value = ''
      testJobStatus.value = null
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
          message.error('没有任何可执行的 source 节点，请先在节点上配置数据源')
          return
        }
        testOutput.value = '提交中... jobName=' + req.jobName + '\n'
        // 打开实时日志弹窗
        testModalVisible.value = true
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
      const label = preLabel || def.label
      const config = preConfig || {}
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
      data.label = activeNodeConfig.value.label || data.label
      node.setData(data)
      node.setAttrByPath('label/text', data.label)
      regeneratePreview()
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
            <NCollapse defaultExpandedNames={['source', 'transform', 'sink']} accordion>
              {['source', 'transform', 'sink'].map((cat) => {
                const items = NODE_DEFINITIONS.filter((d) => d.category === cat)
                if (items.length === 0) return null
                const titles: Record<string, string> = {
                  source: '数据源',
                  transform: '转换',
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
                  style='max-height: 60vh; min-height: 360px;'
                >
                  <pre style='margin: 0; padding: 12px; background: #1e1e1e; color: #d4d4d4; font-family: Menlo, Consolas, "Courier New", monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-all; border-radius: 4px;'>
                    {testOutput.value || '等待日志输出...'}
                  </pre>
                </NScrollbar>
              </div>
            )
          }}
        </NModal>

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
                <NFormItem label='节点名称'>
                  <NInput
                    v-model:value={activeNodeConfig.value.label}
                    onUpdate:value={onConfigChange}
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
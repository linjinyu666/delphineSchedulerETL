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

import { defineComponent, ref, computed, watch, h, nextTick } from 'vue'
import {
  NDrawer, NDrawerContent, NButton, NSpace, NInput, NSelect, NPopconfirm,
  NEmpty, NAlert, NTag, NTooltip
} from 'naive-ui'

// 上游节点(供字段补全 + 多输入声明用)
export interface SqlUpstream {
  id: string
  type: string                 // source / transform / filter / sql / join / compare / cdc / preview
  label: string
  alias: string                // 在 SQL 里能直接引用的别名
  tableName?: string           // 表输入节点选择的物理表名
  databaseName?: string        // 可选的 schema / 数据库名
  fields: Array<{ name: string; type: string }>
}

// SQL 节点 config 结构
export interface SqlNodeConfig {
  alias: string                                    // 节点别名(全局唯一,作为下游 SQL 引用的表名)
  upstreamAliases: string[]                        // 上游别名,必须跟入边数量一致;多入边时填 ['u1', 'u2']
  mode: 'single' | 'multi'                         // single: 1 入边;multi: 多入边
  sql: string                                      // 用户 SQL
  outputs: Array<{                                 // 显式列声明(禁用 SELECT * 必须)
    name: string
    expr: string                                   // 在 SQL 里对应的表达式(供前端补全提示,后端不用)
    type: string                                   // STRING / INT / DECIMAL / DATE ...
  }>
}

export default defineComponent({
  name: 'SqlConfigDialog',
  props: {
    visible: { type: Boolean, required: true },
    nodeId: { type: String, required: true },
    nodeConfig: { type: Object, default: () => ({}) },
    upstreams: { type: Array as () => SqlUpstream[], required: true },
    isAliasUsed: { type: Function, required: true }
  },
  emits: ['update:visible', 'saved', 'deleted'],
  setup(props, { emit }) {
    const cfg = ref<SqlNodeConfig>({
      alias: '',
      upstreamAliases: [],
      mode: 'single',
      sql: '',
      outputs: []
    })
    const errors = ref<string[]>([])
    // Fix-13.8: 别名 inline 校验
    const aliasStatus = computed<'success' | 'warning' | 'error' | undefined>(() => {
      const a = (cfg.value.alias || '').trim()
      if (!a) return 'warning'
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(a)) return 'error'
      if (props.isAliasUsed && a !== (props.nodeConfig?.alias || '') && props.isAliasUsed(a)) return 'error'
      return 'success'
    })
    const aliasTip = computed(() => {
      const a = (cfg.value.alias || '').trim()
      if (!a) return '请输入别名(必填,SQL 中作为表别名引用)'
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(a)) return '格式错误:必须以字母或下划线开头,只能包含字母/数字/下划线'
      if (props.isAliasUsed && a !== (props.nodeConfig?.alias || '') && props.isAliasUsed(a)) return `别名 "${a}" 已被画布上另一个节点占用`
      return '格式正确 ✓'
    })

    // 初始化 + 同步 props
    watch(
      () => [props.visible, props.nodeConfig, props.upstreams.length],
      () => {
        if (!props.visible) return
        const nc = props.nodeConfig || {}
        cfg.value = {
          alias: nc.alias || '',
          upstreamAliases: Array.isArray(nc.upstreamAliases) ? [...nc.upstreamAliases] : [],
          mode: nc.mode || (props.upstreams.length > 1 ? 'multi' : 'single'),
          sql: typeof nc.sql === 'string' ? nc.sql : '',
          outputs: Array.isArray(nc.outputs) ? nc.outputs.map((o: any) => ({ name: o.name || '', expr: o.expr || '', type: o.type || 'STRING' })) : []
        }
        // 单入边时,把入边的 alias 自动填进 upstreamAliases
        if (cfg.value.upstreamAliases.length === 0 && props.upstreams.length > 0) {
          cfg.value.upstreamAliases = props.upstreams.map((u) => u.alias)
          if (props.upstreams.length === 1) cfg.value.mode = 'single'
        }
        errors.value = []
      },
      { immediate: true }
    )

    // 校验
    const validate = (): string[] => {
      const errs: string[] = []
      const alias = (cfg.value.alias || '').trim()
      if (!alias) {
        errs.push('节点别名不能为空')
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
        errs.push('节点别名必须是合法的 SQL 标识符(字母/数字/下划线,数字不能开头)')
      } else if (props.isAliasUsed && alias !== (props.nodeConfig?.alias || '') && props.isAliasUsed(alias)) {
        errs.push(`别名 "${alias}" 已被其他节点使用`)
      }

      const sql = (cfg.value.sql || '').trim()
      if (!sql) {
        errs.push('SQL 不能为空')
      } else {
        // 去掉注释
        const noComment = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
        // 禁止 SELECT *
        if (/\bSELECT\s+\*/i.test(noComment)) {
          errs.push('禁止使用 SELECT *,必须显式列出所有输出字段 (这才能让下游节点知道有哪些字段)')
        }
        // 必须有 FROM
        if (!/\bFROM\b/i.test(noComment)) {
          errs.push('SQL 必须包含 FROM 子句')
        }
        // 多入边模式:要求 SQL 里有 FROM upstreams 标记 (builder 替换占位符)
        if (props.upstreams.length > 1) {
          if (!/\bFROM\s+upstreams\b/i.test(noComment)) {
            errs.push('多入边模式下,SQL 必须包含 FROM upstreams 占位符(会被替换为所有上游子查询)')
          }
        } else if (props.upstreams.length === 1) {
          if (!/\bFROM\s+upstream\b/i.test(noComment)) {
            errs.push('单入边模式下,SQL 必须包含 FROM upstream 占位符(会被替换为上游子查询)')
          }
        }
      }

      // outputs 校验
      if (cfg.value.outputs.length === 0) {
        errs.push('至少配置 1 个输出字段(供下游节点引用 + 字段补全)')
      } else {
        const names = cfg.value.outputs.map((o) => (o.name || '').trim()).filter(Boolean)
        if (new Set(names).size !== names.length) {
          errs.push('输出字段名重复')
        }
        for (let i = 0; i < cfg.value.outputs.length; i++) {
          const o = cfg.value.outputs[i]
          if (!(o.name || '').trim()) errs.push(`输出字段 #${i + 1} 名字为空`)
        }
      }

      // upstreamAliases 数量
      if (props.upstreams.length > 0 && cfg.value.upstreamAliases.length !== props.upstreams.length) {
        errs.push(`上游别名数量(${cfg.value.upstreamAliases.length})与入边数(${props.upstreams.length})不一致`)
      }
      for (let i = 0; i < cfg.value.upstreamAliases.length; i++) {
        const a = (cfg.value.upstreamAliases[i] || '').trim()
        if (!a) errs.push(`上游别名 #${i + 1} 为空`)
        else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(a)) errs.push(`上游别名 "${a}" 不是合法 SQL 标识符`)
      }

      return errs
    }

    // ====== SQL 编辑器 - 自制语法高亮 + 行号 + 括号匹配 + Tab 缩进 ======
    // 不引第三方编辑器,自实现一个轻量 textarea + 高亮 overlay
    // (CodeMirror 6 + lang-sql 体积大,这里只需要关键字/字符串/数字高亮)
    const SQL_KEYWORDS = new Set([
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'BETWEEN', 'LIKE',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON', 'USING',
      'GROUP', 'BY', 'ORDER', 'HAVING', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'DISTINCT',
      'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'COALESCE', 'CAST', 'IF',
      'UNION', 'ALL', 'INTERSECT', 'EXCEPT', 'WITH', 'OVER', 'PARTITION'
    ])
    const SQL_FUNCS = new Set([
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'FLOOR', 'CEIL', 'LENGTH', 'UPPER', 'LOWER', 'TRIM',
      'CONCAT', 'CONCAT_WS', 'SUBSTRING', 'REPLACE', 'NOW', 'CURRENT_DATE', 'CURRENT_TIMESTAMP',
      'COALESCE', 'CAST', 'ISNULL', 'NULLIF', 'IFNULL', 'DATE_FORMAT', 'TO_DATE', 'TO_CHAR',
      'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE'
    ])

    // 当前光标位置 / 选区
    const cursorPos = ref(0)
    const cursorLine = ref(1)

    // 括号匹配:在光标处或光标左侧找 () [] 配对
    const matchInfo = computed(() => {
      const text = cfg.value.sql || ''
      const pos = cursorPos.value
      if (pos <= 0 || pos > text.length) return null
      // 光标左侧 1 个字符
      const left = text[pos - 1]
      // 找开括号
      const checkPair = (open: string, close: string, isOpen: boolean) => {
        if (isOpen) {
          // 从 pos 往后找 close
          let depth = 1
          for (let i = pos; i < text.length; i++) {
            if (text[i] === open) depth++
            else if (text[i] === close) { depth--; if (depth === 0) return i }
          }
          return -1
        } else {
          // 从 pos-1 往前找 open
          let depth = 1
          for (let i = pos - 2; i >= 0; i--) {
            if (text[i] === close) depth++
            else if (text[i] === open) { depth--; if (depth === 0) return i }
          }
          return -1
        }
      }
      if (left === '(') {
        const r = checkPair('(', ')', true)
        if (r >= 0) return { a: pos - 1, b: r, ch: '()' }
      } else if (left === ')') {
        const l = checkPair('(', ')', false)
        if (l >= 0) return { a: l, b: pos - 1, ch: '()' }
      } else if (left === '[') {
        const r = checkPair('[', ']', true)
        if (r >= 0) return { a: pos - 1, b: r, ch: '[]' }
      } else if (left === ']') {
        const l = checkPair('[', ']', false)
        if (l >= 0) return { a: l, b: pos - 1, ch: '[]' }
      }
      return null
    })

    // 高亮 SQL (含括号匹配 span)
    const highlightSql = (raw: string): string => {
      if (!raw) return '&nbsp;'
      // 先转义 HTML
      let s = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // 字符串(单/双引号)
      s = s.replace(/('[^']*'|"[^"]*")/g, '<span class="sql-str">$1</span>')
      // 注释
      s = s.replace(/(--.*$)/gm, '<span class="sql-cmt">$1</span>')
      // 数字
      s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-num">$1</span>')
      // 关键字 + 函数
      s = s.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (m) => {
        const up = m.toUpperCase()
        if (SQL_KEYWORDS.has(up)) return `<span class="sql-kw">${m}</span>`
        if (SQL_FUNCS.has(up)) return `<span class="sql-fn">${m}</span>`
        return m
      })
      // 括号匹配高亮(必须在所有 token span 之后)
      const m = matchInfo.value
      if (m) {
        // 在高亮文本中找原文括号位置
        // 我们知道原始 raw 中位置 a / b 是括号,把它们包成 span
        // 简单做法:把 raw 按字符切,左右括号替换为 sql-match
        const a = m.a
        const b = m.b
        const beforeA = raw.substring(0, a)
        const chA = raw[a]
        const middle = raw.substring(a + 1, b)
        const chB = raw[b]
        const after = raw.substring(b + 1)
        // 重新构造带高亮的版本(但要按已高亮的版本)
        // 简化:直接在 raw 替换 → 然后再 apply 高亮 → 但 sql-match span 内不能有 token 化
        // 用一个 token 化 + 占位符的二次处理
        const esc = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // 先高亮中间字符串
        const midHL = (() => {
          let t = middle
          t = t.replace(/('[^']*'|"[^"]*")/g, '<span class="sql-str">$1</span>')
          t = t.replace(/(--.*$)/gm, '<span class="sql-cmt">$1</span>')
          t = t.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-num">$1</span>')
          t = t.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (mm) => {
            const up = mm.toUpperCase()
            if (SQL_KEYWORDS.has(up)) return `<span class="sql-kw">${mm}</span>`
            if (SQL_FUNCS.has(up)) return `<span class="sql-fn">${mm}</span>`
            return mm
          })
          return t
        })()
        s = esc(beforeA) + `<span class="sql-match">${esc(chA)}</span>` + midHL + `<span class="sql-match">${esc(chB)}</span>` + esc(after)
      }
      return s
    }

    const highlighted = computed(() => highlightSql(cfg.value.sql || ''))

    // 行号计算
    const lineCount = computed(() => Math.max(1, (cfg.value.sql || '').split('\n').length))
    const gutterLines = computed(() => {
      const total = lineCount.value
      const arr: number[] = []
      for (let i = 1; i <= Math.max(total, 1); i++) arr.push(i)
      return arr
    })

    // 字段补全
    const showAutocomplete = ref(false)
    const acItems = ref<Array<{ label: string; type: string; detail: string }>>([])
    const acPos = ref({ top: 0, left: 0 })

    // textarea ref(用于 scroll 同步 + 行号栏 + 补全位置)
    const taRef = ref<any>(null)
    const scrollRef = ref<HTMLElement | null>(null)
    const gutterRef = ref<HTMLElement | null>(null)

    const calcCursor = (ta: HTMLTextAreaElement) => {
      cursorPos.value = ta.selectionStart
      const before = ta.value.substring(0, ta.selectionStart)
      cursorLine.value = before.split('\n').length
    }

    const onSqlInput = (e: Event) => {
      const ta = e.target as HTMLTextAreaElement
      cfg.value.sql = ta.value
      calcCursor(ta)
      showAutocomplete.value = false
    }

    const onSqlKeyup = (e: KeyboardEvent) => {
      const ta = e.target as HTMLTextAreaElement
      calcCursor(ta)
      // 跳过修饰键
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) {
        showAutocomplete.value = false
        return
      }
      const before = ta.value.substring(0, ta.selectionStart)
      const m = before.match(/([a-zA-Z_][a-zA-Z0-9_]*)\.?([a-zA-Z_][a-zA-Z0-9_]*)?$/)
      if (!m) {
        showAutocomplete.value = false
        return
      }
      // 计算 popup 位置(估算:行高 18px, char 宽 7.5px)
      const lines = before.split('\n')
      const curLine = lines.length
      const colInLine = lines[lines.length - 1].length
      acPos.value = {
        top: 8 + (curLine - 1) * 18 + 18,
        left: 12 + colInLine * 7.5
      }

      const fullTok = m[0]
      const dotIdx = fullTok.indexOf('.')
      if (dotIdx >= 0) {
        // 补全 alias.field，字段名支持按当前输入过滤。
        const alias = fullTok.substring(0, dotIdx)
        const fieldPrefix = fullTok.substring(dotIdx + 1).toLowerCase()
        const up = props.upstreams.find((u) => u.alias.toLowerCase() === alias.toLowerCase())
        if (!up) { showAutocomplete.value = false; return }
        acItems.value = up.fields
          .filter((c) => !fieldPrefix || c.name.toLowerCase().startsWith(fieldPrefix))
          .map((c) => ({
          label: c.name,
          type: c.type || 'STRING',
          detail: `${up.alias}.${c.name}`
        }))
      } else {
        // 补全 alias，按当前输入过滤。
        const aliasPrefix = fullTok.toLowerCase()
        acItems.value = props.upstreams.filter((u) => u.alias.toLowerCase().startsWith(aliasPrefix)).map((u) => ({
          label: u.alias,
          type: 'alias',
          detail: `${u.type} · ${u.label} (${u.fields.length} 列)`
        }))
      }
      showAutocomplete.value = acItems.value.length > 0
    }

    // Tab 缩进 + 自动 indent + 括号配对
    const onSqlKeydown = (e: KeyboardEvent) => {
      const ta = e.target as HTMLTextAreaElement
      if (showAutocomplete.value && (e.key === 'Tab' || e.key === 'Enter') && acItems.value.length > 0) {
        e.preventDefault()
        insertAc(acItems.value[0])
        return
      }
      // Tab → 插入 2 空格(或 shift+tab 删 2 空格)
      if (e.key === 'Tab') {
        e.preventDefault()
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const v = cfg.value.sql || ''
        if (e.shiftKey) {
          // 删前导空白(2 字符)
          const lineStart = v.lastIndexOf('\n', start - 1) + 1
          const linePrefix = v.substring(lineStart, start)
          const m = linePrefix.match(/^( {1,2})/)
          if (m) {
            cfg.value.sql = v.substring(0, lineStart) + linePrefix.substring(m[0].length) + v.substring(start)
            nextTick(() => { ta.selectionStart = ta.selectionEnd = start - m[0].length })
          }
          return
        }
        // 多行缩进(选中多行时)
        if (start !== end && v.substring(start, end).includes('\n')) {
          const block = v.substring(start, end)
          const indented = block.replace(/^/gm, '  ')
          cfg.value.sql = v.substring(0, start) + indented + v.substring(end)
          nextTick(() => { ta.selectionStart = start; ta.selectionEnd = start + indented.length })
          return
        }
        // 单点插入 2 空格
        cfg.value.sql = v.substring(0, start) + '  ' + v.substring(end)
        nextTick(() => { ta.selectionStart = ta.selectionEnd = start + 2 })
        return
      }
      // Enter → 自动 indent
      if (e.key === 'Enter') {
        const start = ta.selectionStart
        const v = cfg.value.sql || ''
        const lineStart = v.lastIndexOf('\n', start - 1) + 1
        const linePrefix = v.substring(lineStart, start)
        const m = linePrefix.match(/^( +)/)
        const baseIndent = m ? m[0] : ''
        // 如果上一行以 ( 结尾,再加 2 空格
        const lastChar = v.substring(start - 1, start)
        const extraIndent = (lastChar === '(' || lastChar === ',' || lastChar === 'CASE') ? '  ' : ''
        e.preventDefault()
        cfg.value.sql = v.substring(0, start) + '\n' + baseIndent + extraIndent + v.substring(start)
        const newPos = start + 1 + baseIndent.length + extraIndent.length
        nextTick(() => { ta.selectionStart = ta.selectionEnd = newPos })
        return
      }
      // 括号配对: ( [ { → 自动闭合
      const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', "'": "'", '"': '"' }
      if (pairs[e.key]) {
        const start = ta.selectionStart
        const end = ta.selectionEnd
        if (start !== end) {
          // 选中文本 → 包裹
          e.preventDefault()
          const v = cfg.value.sql || ''
          const sel = v.substring(start, end)
          cfg.value.sql = v.substring(0, start) + e.key + sel + pairs[e.key] + v.substring(end)
          nextTick(() => { ta.selectionStart = start + 1; ta.selectionEnd = end + 1 })
          return
        }
        // 普通插入 → 跟随配对
        e.preventDefault()
        const v = cfg.value.sql || ''
        cfg.value.sql = v.substring(0, start) + e.key + pairs[e.key] + v.substring(end)
        nextTick(() => { ta.selectionStart = ta.selectionEnd = start + 1 })
        return
      }
      // 跳过右括号
      if (e.key === ')' || e.key === ']' || e.key === '}') {
        const start = ta.selectionStart
        const v = cfg.value.sql || ''
        if (v[start] === e.key) {
          e.preventDefault()
          ta.selectionStart = ta.selectionEnd = start + 1
          return
        }
      }
    }

    // 同步 scroll: 高亮层 + gutter 跟 textarea 同步
    const onSqlScroll = (e: Event) => {
      const ta = e.target as HTMLTextAreaElement
      if (scrollRef.value) {
        const hl = scrollRef.value.querySelector('.sql-editor-highlight') as HTMLElement
        if (hl) {
          hl.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`
          hl.style.transformOrigin = '0 0'
        }
      }
      if (gutterRef.value) {
        gutterRef.value.scrollTop = ta.scrollTop
      }
    }

    const onSqlClick = (e: MouseEvent) => {
      const ta = e.target as HTMLTextAreaElement
      calcCursor(ta)
    }

    const insertAc = (item: { label: string }) => {
      const ta = document.querySelector('.sql-editor-textarea') as HTMLTextAreaElement
      if (!ta) return
      const before = cfg.value.sql.substring(0, ta.selectionStart)
      const after = cfg.value.sql.substring(ta.selectionStart)
      const m = before.match(/([a-zA-Z_][a-zA-Z0-9_]*\.?)([a-zA-Z_][a-zA-Z0-9_]*)?$/)
      if (m) {
        const partial = (m[1] || '') + (m[2] || '')
        const newBefore = before.substring(0, before.length - partial.length)
        const replacement = (m[1] || '').endsWith('.') ? `${m[1]}${item.label}` : item.label
        cfg.value.sql = newBefore + replacement + after
      } else {
        cfg.value.sql = before + item.label + after
      }
      showAutocomplete.value = false
    }

    // ====== outputs 表格 ======
    const outputTypeOptions = [
      { label: 'STRING', value: 'STRING' },
      { label: 'INT / BIGINT', value: 'BIGINT' },
      { label: 'DECIMAL', value: 'DECIMAL' },
      { label: 'DATE', value: 'DATE' },
      { label: 'TIMESTAMP', value: 'TIMESTAMP' },
      { label: 'BOOLEAN', value: 'BOOLEAN' }
    ]
    const addOutput = () => {
      cfg.value.outputs.push({ name: '', expr: '', type: 'STRING' })
    }
    const removeOutput = (idx: number) => {
      cfg.value.outputs.splice(idx, 1)
    }
    const upOutput = (idx: number) => {
      if (idx === 0) return
      const t = cfg.value.outputs[idx - 1]
      cfg.value.outputs[idx - 1] = cfg.value.outputs[idx]
      cfg.value.outputs[idx] = t
    }
    const downOutput = (idx: number) => {
      if (idx >= cfg.value.outputs.length - 1) return
      const t = cfg.value.outputs[idx + 1]
      cfg.value.outputs[idx + 1] = cfg.value.outputs[idx]
      cfg.value.outputs[idx] = t
    }

    // 一键从 SQL 解析 outputs
    const parseFromSql = () => {
      showAutocomplete.value = false
      const sql = (cfg.value.sql || '').replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      // 抓 SELECT 和 FROM 之间的列表
      const m = sql.match(/\bSELECT\b([\s\S]+?)\bFROM\b/i)
      if (!m) {
        errors.value = ['无法从 SQL 解析 SELECT 列表']
        return
      }
      const list = m[1].split(',').map((s) => s.trim()).filter(Boolean)
      cfg.value.outputs = list.map((expr) => {
        // 如果是 "expr AS alias",提取 alias
        const am = expr.match(/\bAS\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/i)
        if (am) {
          return { name: am[1], expr, type: 'STRING' }
        }
        // 普通列默认使用最后一段字段名，例如 source1.ID → ID。
        const simpleName = expr.trim().match(/(?:^|\.)([a-zA-Z_][a-zA-Z0-9_]*)$/)
        return { name: simpleName ? simpleName[1] : '', expr, type: 'STRING' }
      })
      errors.value = []
    }

    // 保存
    const onSave = () => {
      const errs = validate()
      if (errs.length > 0) {
        errors.value = errs
        return
      }
      emit('saved', {
        ...cfg.value,
        alias: (cfg.value.alias || '').trim(),
        upstreamAliases: cfg.value.upstreamAliases.map((s) => s.trim())
      })
      emit('update:visible', false)
    }

    const onCancel = () => {
      emit('update:visible', false)
    }

    return () =>
      h(NDrawer, {
        show: props.visible,
        width: 600,
        placement: 'right',
        resizable: true,
        style: 'max-width: 92vw;',
        maskClosable: false,
        onUpdateShow: (v: boolean) => emit('update:visible', v)
      }, {
        default: () => h(NDrawerContent, {
          closable: true,
          title: 'SQL 节点配置',
          nativeScrollbar: false
        }, {
          default: () => h('div', { class: 'sql-config-body' }, [
            errors.value.length > 0
              ? h(NAlert, { type: 'error', showIcon: true, style: { marginBottom: '12px' } }, {
                  default: () => h('ul', { style: { margin: 0, paddingLeft: '20px' } },
                    errors.value.map((e) => h('li', null, e))
                  )
                })
              : null,

            // 01 基本信息：与表输入、表连接使用同一套卡片和标签布局。
            h('section', { class: 'etl-node-config-section etl-node-config-overview sql-config-section' }, [
              h('div', { class: 'etl-node-config-section-heading' }, [
                h('span', {}, '基本信息'),
                h('span', { class: 'etl-node-config-section-hint' }, '用于识别画布节点和 SQL 别名')
              ]),
              h('div', { class: 'etl-node-config-overview-grid' }, [
                h('div', { class: 'etl-node-config-item' }, [
                  h('label', { class: 'n-form-item-label' }, [
                    '节点名称(别名) ',
                    h('span', { class: 'etl-node-config-required' }, '*')
                  ]),
                  h('div', { class: 'n-form-item-blank' }, [
                    h(NInput, {
                      value: cfg.value.alias,
                      placeholder: '例如 sql1',
                      status: aliasStatus.value,
                      onUpdateValue: (v: string) => { cfg.value.alias = v }
                    })
                  ]),
                  aliasStatus.value !== 'success'
                    ? h('div', { class: 'n-form-item-feedback-wrapper sql-field-feedback' }, aliasTip.value)
                    : null
                ]),
                h('div', { class: 'etl-node-config-item etl-node-config-item--type' }, [
                  h('span', { class: 'n-form-item-label' }, '类型'),
                  h('div', { class: 'n-form-item-blank' }, [
                    h(NTag, { type: 'info', size: 'small' }, () => 'sql')
                  ])
                ])
              ])
            ]),

            // 02 表输入：只展示已接入数量和上游别名，字段信息通过悬浮提示查看。
            h('section', { class: 'etl-node-config-section sql-config-section' }, [
              h('div', { class: 'etl-node-config-section-heading' }, [
                h('span', {}, '表输入'),
                h('span', { class: 'etl-node-config-section-hint' }, `已接入 ${props.upstreams.length} 张表`)
              ]),
              props.upstreams.length === 0
                ? h(NEmpty, { description: '尚未接入表输入节点' })
                : h('div', { class: 'sql-upstream-tags' }, props.upstreams.map((u, i) => {
                    const alias = cfg.value.upstreamAliases[i] || u.alias
                    return h(NTooltip, { placement: 'right-start', trigger: 'hover' }, {
                      trigger: () => h(NTag, { type: 'info', size: 'small', bordered: true }, () => alias),
                      default: () => h('div', { class: 'sql-upstream-tooltip' }, [
                        h('div', { class: 'sql-upstream-tooltip-title' }, `${alias} · ${u.tableName || u.label}`),
                        u.fields.length === 0
                          ? h('div', { class: 'sql-upstream-tooltip-empty' }, '暂无字段信息')
                          : h('div', { class: 'sql-upstream-tooltip-fields' }, u.fields.map((field) =>
                              h('div', { class: 'sql-upstream-tooltip-field' }, [
                                h('span', {}, field.name),
                                h('span', {}, field.type || 'STRING')
                              ])
                            ))
                      ])
                    })
                  }))
            ]),

            // 03 自定义 SQL：编辑区始终可见，避免步骤条和折叠打断编写流程。
            h('section', { class: 'etl-node-config-section sql-config-section' }, [
              h('div', { class: 'etl-node-config-section-heading' }, [
                h('span', {}, '自定义 SQL'),
                h('span', { class: 'etl-node-config-section-hint' }, cfg.value.sql ? `${cfg.value.sql.length} 个字符` : '未填写')
              ]),
              h(NAlert, { type: 'info', showIcon: true, style: { marginBottom: '10px' } }, {
                default: () => props.upstreams.length === 0
                  ? '本节点无入边，SQL 中可直接引用目标表。'
                  : (props.upstreams.length === 1
                    ? `上游表 ${props.upstreams[0].label} 可使用别名 ${cfg.value.upstreamAliases[0] || props.upstreams[0].alias} 引用。`
                    : `已接入 ${props.upstreams.length} 张表，请使用上方 SQL 别名组合查询。`)
              }),
              h('div', { class: 'sql-editor-shell' }, [
                h('div', { class: 'sql-editor-wrap' }, [
                  h('div', {
                    class: 'sql-editor-gutter',
                    ref: (el: any) => { gutterRef.value = el }
                  }, gutterLines.value.map((n) =>
                    h('span', {
                      class: 'sql-editor-gutter-line' + (n === cursorLine.value ? ' sql-editor-gutter-line-active' : '')
                    }, String(n))
                  )),
                  h('div', {
                    class: 'sql-editor-scroll',
                    ref: (el: any) => { scrollRef.value = el }
                  }, [
                    h('pre', {
                      class: 'sql-editor-highlight',
                      'aria-hidden': true,
                      innerHTML: highlighted.value + '\n'
                    }),
                    h('textarea', {
                      ref: (el: any) => { taRef.value = el },
                      class: 'sql-editor-textarea',
                      value: cfg.value.sql,
                      spellcheck: false,
                      wrap: 'off',
                      placeholder: 'SELECT a.id, a.name FROM upstream a',
                      onInput: onSqlInput,
                      onKeyup: onSqlKeyup,
                      onKeydown: onSqlKeydown,
                      onScroll: onSqlScroll,
                      onClick: onSqlClick
                    })
                  ])
                ]),
                showAutocomplete.value
                  ? h('div', {
                    class: 'sql-autocomplete',
                    style: { top: acPos.value.top + 'px', left: acPos.value.left + 'px' }
                  }, acItems.value.slice(0, 20).map((it) =>
                    h('div', { class: 'sql-ac-item', onMousedown: () => insertAc(it) }, [
                      h('span', { class: 'sql-ac-label' }, it.label),
                      h('span', { class: 'sql-ac-detail' }, it.detail),
                      h('span', { class: 'sql-ac-type' }, it.type)
                    ])
                  ))
                  : null
              ])
            ]),

            // 04 输出列：明确声明输出，供下游节点字段补全和校验使用。
            h('section', { class: 'etl-node-config-section sql-config-section sql-output-section' }, [
              h('div', { class: 'etl-node-config-section-heading' }, [
                h('span', {}, [
                  '解析输出列 ',
                  h('span', { class: 'etl-node-config-required' }, '*')
                ]),
                h('span', { class: 'etl-node-config-section-hint' }, `${cfg.value.outputs.length} 个字段`)
              ]),
              h(NAlert, { type: 'warning', showIcon: true, style: { marginBottom: '10px' } }, {
                default: () => '必须明确写出每个输出字段的名称和类型，下游节点才能稳定引用。'
              }),
              cfg.value.outputs.length === 0
                ? h(NEmpty, { description: '点击“从 SQL 解析输出列”或“添加输出字段”' })
                : h('div', { class: 'sql-output-table' }, [
                  h('div', { class: 'sql-output-header' }, [
                    h('span', {}, '#'),
                    h('span', {}, '输出字段名'),
                    h('span', {}, '表达式'),
                    h('span', {}, '类型'),
                    h('span', {}, '操作')
                  ]),
                  ...cfg.value.outputs.map((output, idx) => h('div', { class: 'sql-output-row' }, [
                    h('span', { class: 'sql-output-index' }, String(idx + 1)),
                    h(NInput, {
                      value: output.name,
                      placeholder: '例如 cmp_id',
                      size: 'small',
                      onUpdateValue: (v: string) => { output.name = v }
                    }),
                    h(NInput, {
                      value: output.expr,
                      placeholder: '例如 COALESCE(a.id, b.id)',
                      size: 'small',
                      onUpdateValue: (v: string) => { output.expr = v }
                    }),
                    h(NSelect, {
                      value: output.type,
                      size: 'small',
                      options: outputTypeOptions,
                      onUpdateValue: (v: string) => { output.type = v }
                    }),
                    h(NSpace, { size: 2, class: 'sql-output-actions' }, () => [
                      h(NButton, { size: 'tiny', quaternary: true, onClick: () => upOutput(idx), disabled: idx === 0 }, () => '↑'),
                      h(NButton, { size: 'tiny', quaternary: true, onClick: () => downOutput(idx), disabled: idx === cfg.value.outputs.length - 1 }, () => '↓'),
                      h(NPopconfirm, { onPositiveClick: () => removeOutput(idx) }, {
                        default: () => `确认删除输出字段 "${output.name || '#' + (idx + 1)}" ?`,
                        trigger: () => h(NButton, { size: 'tiny', quaternary: true, type: 'error' }, () => '删')
                      })
                    ])
                  ]))
                ]),
              h(NSpace, { style: { marginTop: '10px' } }, () => [
                h(NButton, { size: 'small', onClick: addOutput, type: 'primary', ghost: true }, () => '+ 添加输出字段'),
                h(NButton, { size: 'small', onClick: parseFromSql, disabled: !cfg.value.sql }, () => '↑ 从 SQL 解析输出列')
              ])
            ])
          ]),
        footer: () => h('div', { class: 'sql-config-footer' }, [
          h(NSpace, {}, () => [
            h(NButton, { onClick: onCancel }, () => '取消'),
            h(NButton, { type: 'primary', onClick: onSave }, () => '保存')
          ])
        ])
        }),
      })
  }
})

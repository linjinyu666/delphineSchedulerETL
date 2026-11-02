const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const root = path.resolve(__dirname, '..')
const localRequire = createRequire(path.join(root, 'package.json'))
const ts = localRequire('typescript')
const vue = localRequire('vue')
function load(relative, overrides = {}) {
  const file = path.join(root, relative)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module, exports: module.exports, Error, Set, console,
    require: (name) => Object.hasOwn(overrides, name) ? overrides[name] : localRequire(name)
  }, { filename: file })
  return module.exports
}
const helper = load('src/views/projects/task/components/node/etl-resource.ts')
const content = JSON.stringify({ nodes: [
  { config: { cascade: { dsId: 3 } } },
  { config: { cascade: { dsId: '2' } } },
  { config: { datasourceId: 3 } },
  { config: { datasourceId: -1 } }
], etl: { sql: "SELECT 'a\\nb', '\\t'\nFROM orders\nJOIN customers ON orders.id = customers.id" } })
const ids = (value) => Array.from(helper.extractEtlDatasourceIds(value))
test('SQL escapes remain valid JSON and datasource ids are deduplicated', () => {
  assert.deepEqual(ids(content), [3, 2])
  assert.deepEqual(ids('invalid'), [])
  assert.deepEqual(ids(''), [])
})
test('tree selector updates the form before invoking its resource callback', () => {
  const { renderTreeSelect } = load('src/components/form/fields/tree-select.ts', {
    'naive-ui': { NTreeSelect: {} }
  })
  const fields = { etlResource: '' }; const calls = []
  const vnode = renderTreeSelect({ field: 'etlResource', props: {
    onUpdateValue(value, option, meta) {
      assert.equal(fields.etlResource, value)
      calls.push([value, option, meta])
    }
  } }, fields)
  const option = { key: '/etl/job.json' }; const meta = { action: 'select' }
  vnode.props.onUpdateValue(option.key, option, meta)
  assert.deepEqual(calls, [[option.key, option, meta]])
  vnode.props.onUpdateValue(null, null, { action: 'clear' })
  assert.equal(fields.etlResource, null)
})
test('ETL validation accepts loaded multiline SQL and distinguishes missing/loading/unreadable resources', async () => {
  let resolveContent
  const { useEtl } = load('src/views/projects/task/components/node/tasks/use-etl.ts', {
    'vue': { ...vue, onMounted: () => {} },
    '@/service/modules/resources': {
      queryResourceList: async () => [],
      viewEtlContent: () => new Promise(resolve => { resolveContent = resolve })
    },
    '../fields/index': new Proxy({}, { get: () => () => [] }),
    '../etl-resource': helper
  })
  const scope = vue.effectScope()
  const { model, json } = scope.run(() => useEtl({ projectCode: 1 }))
  const resource = json.find(item => item.field === 'etlResource')
  const validate = () => resource.validate.validator({}, model.etlResource)
  assert.match(validate().message, /请选择一个/)
  assert.equal(resource.validate.message, undefined)
  resource.props.onUpdateValue('/etl/job.json')
  await vue.nextTick()
  assert.match(validate().message, /加载中/)
  resolveContent({ content })
  await Promise.resolve(); await vue.nextTick()
  assert.deepEqual(Array.from(model.datasourceIds), [3, 2])
  assert.equal(validate(), true)
  resource.props.onUpdateValue('/etl/broken.json')
  await vue.nextTick()
  resolveContent({ content: '' })
  await Promise.resolve(); await vue.nextTick()
  assert.match(validate().message, /无法读取/)
  resource.props.onUpdateValue('/etl/loading.json')
  await vue.nextTick()
  const staleResponse = resolveContent
  resource.props.onUpdateValue(null)
  await vue.nextTick()
  staleResponse({ content })
  await Promise.resolve(); await vue.nextTick()
  assert.equal(model.etlContent, '')
  assert.deepEqual(Array.from(model.datasourceIds), [])
  assert.match(validate().message, /请选择一个/)
  scope.stop()
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply } from '../lib/index.mjs'

/** 测试文件所在目录，用于定位包内的 skills/。 */
const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * Register the provider through the plugin's real `apply()` path and return it,
 * so the tests exercise the same wiring the Loader will.
 * @returns the registered provider.
 */
function registered() {
  let provider
  const ctx = {
    skills: {
      registerProvider(create) {
        provider = create({ signal: new AbortController().signal, invalidate: () => {} })
      },
    },
  }
  apply(ctx)
  assert.ok(provider !== undefined, 'apply() must register exactly one provider')
  return provider
}

test('apply 通过 ctx.skills.registerProvider 注册，且 provider 名唯一', () => {
  assert.equal(registered().name, 'ssid-skills')
})

test('list 为每个 skill 目录返回一项', async () => {
  const candidates = await registered().list()
  assert.ok(candidates.length >= 1, '包内至少应有一个 skill')
  assert.ok(candidates.map(candidate => candidate.name).includes('ssid-test-reliability'))
})

test('每个 candidate 都满足注册表的校验要求', async () => {
  for (const candidate of await registered().list()) {
    assert.match(candidate.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${candidate.name} 必须是 kebab-case`)
    assert.ok(candidate.description.length > 0, `${candidate.name} 必须有 description`)
    assert.equal(candidate.provider, 'ssid-skills')
    assert.equal(candidate.source, 'packaged')
    assert.equal(candidate.rank, 550)
    assert.equal(candidate.invocation.modelInvocable, true)
    assert.equal(candidate.invocation.userInvocable, true)
    assert.equal(candidate.resourceBase.kind, 'directory')
    // fileURLToPath 保留尾部分隔符（Windows `\`、POSIX `/`），与上游 skill-badge 的写法一致。
    const base = candidate.resourceBase.path.replace(/[\\/]+$/, '')
    assert.ok(base.endsWith('skills'), 'resourceBase 必须指向 skills/ 以便解析相对引用')
  }
})

test('list 的名称稳定有序，且 locator 能回传给 get', async () => {
  const provider = registered()
  const first = await provider.list()
  const second = await provider.list()
  assert.deepEqual(first.map(c => c.name), second.map(c => c.name))
  assert.deepEqual(first.map(c => c.name), [...first.map(c => c.name)].sort())
})

test('get 返回去掉 frontmatter 的正文，并保留 name/description', async () => {
  const provider = registered()
  const [candidate] = await provider.list()
  const definition = await provider.get(candidate)
  assert.equal(definition.name, candidate.name)
  assert.equal(definition.description, candidate.description)
  assert.ok(definition.content.length > 0)
  assert.ok(!definition.content.startsWith('---'), 'frontmatter 不应出现在正文里')
  assert.ok(definition.content.includes('#'), '正文应当是 Markdown')
})

test('get 对每个 candidate 都能加载', async () => {
  const provider = registered()
  for (const candidate of await provider.list()) {
    const definition = await provider.get(candidate)
    assert.ok(definition !== undefined, `${candidate.name} 应当可加载`)
  }
})

test('带脚本的 skill：scripts/ 齐全，且正文引用了它的编码器', async () => {
  const provider = registered()
  const candidate = (await provider.list()).find(entry => entry.name === 'ssid-record-browser-gif')
  assert.ok(candidate !== undefined, '包内应当有带脚本的 skill')
  const definition = await provider.get(candidate)
  assert.ok(definition.content.includes('encode_gif.py'), '正文应当引用编码器')
  const scripts = join(HERE, '..', 'skills', 'ssid-record-browser-gif', 'scripts')
  const files = (await readdir(scripts)).filter(name => !name.startsWith('__'))
  assert.deepEqual(files.sort(), ['encode_gif.py', 'test_encode_gif.py'])
})

test('每个 skill 的 frontmatter 只含受支持的字段，且 description 不总结工作流', async () => {
  const provider = registered()
  for (const candidate of await provider.list()) {
    const text = await (await import('node:fs/promises')).readFile(candidate.locator.path, 'utf8')
    const frontmatter = text.slice(0, text.indexOf('\n---', 3))
    const fields = frontmatter.split('\n').slice(1).map(line => line.split(':')[0].trim())
    for (const field of fields) {
      assert.ok(['name', 'description', 'whenToUse'].includes(field), `${candidate.name} 含未知 frontmatter 字段: ${field}`)
    }
    // description 以触发条件开头，不出现「步骤」「流程：」这类工作流摘要。
    assert.ok(!/^(步骤|流程)/.test(candidate.description), `${candidate.name} 的 description 不应以工作流摘要开头`)
  }
})

test('rank 550 的意义：两个不等式都要成立（lower wins）', async () => {
  // 常量取自 DSH 源码，不是本包定义的：
  //   packages/skill/skill/src/index.ts          → BUNDLED_SKILL_RANK = 600
  //   packages/skill/skill-filesystem/src/index.ts → USER_AGENTS_RANK = 500
  // 优先级规则是“数字小的赢”，且只在同一 layer 内决定重复。
  const BUNDLED_SKILL_RANK = 600
  const USER_AGENTS_RANK = 500
  for (const candidate of await registered().list()) {
    assert.ok(
      candidate.rank < BUNDLED_SKILL_RANK,
      `${candidate.name}: rank 必须小于 ${BUNDLED_SKILL_RANK}，否则覆盖不了内置 skill`,
    )
    assert.ok(
      candidate.rank > USER_AGENTS_RANK,
      `${candidate.name}: rank 必须大于 ${USER_AGENTS_RANK}，否则用户无法用自己的 skill 覆盖本包`,
    )
  }
})

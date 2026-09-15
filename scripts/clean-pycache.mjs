/**
 * 打包前清掉 Python 字节码缓存。
 *
 * `record-browser-gif` 的编码器自测（`python -m unittest`）会在 `skills/` 下留下
 * `__pycache__/`。`.gitignore` 忽略它，但 npm 的 `files` 白名单优先于忽略规则——
 * 目录一旦列进 `files`，其中的缓存就会进 tarball（0.1.0 实测带上了一个 `.pyc`）。
 * 因此改为在 prepack 阶段删除，而不是靠忽略规则。
 */

import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const skillsDir = fileURLToPath(new URL('../skills/', import.meta.url))

/** @param directory - 待清理的目录，递归下降。 */
async function removePycache(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const path = join(directory, entry.name)
    if (entry.name === '__pycache__') {
      await rm(path, { recursive: true, force: true })
      console.log(`clean-pycache: removed ${path}`)
      continue
    }
    await removePycache(path)
  }
}

await removePycache(skillsDir)

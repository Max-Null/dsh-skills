/**
 * @max-null/dsh-skills — packaged `SkillProvider` for the SSiD-adapted skills.
 *
 * Serves one skill per directory under `skills/`, read from that directory's
 * `SKILL.md`. The skills are static files shipped with the package, so `list()`
 * reads the directory tree on each call instead of caching a catalog that a
 * package upgrade would stale.
 *
 * @module @max-null/dsh-skills
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROVIDER_NAME = 'ssid-skills'
const SOURCE = 'packaged'

/**
 * Precedence rank. DSH defines no constant for a packaged provider: its shipped
 * scale is project-dsh 100 / project-agents 200 / runtime 250 / custom 300 /
 * user-dsh 400 / user-agents 500 / bundled 600. 550 sits in the gap reserved for
 * a package that serves skills — below a user's own skill directories, so a user
 * can always override a packaged skill, and above bundled skills, so a package
 * can replace one.
 */
const RANK = 550

const SKILLS_DIR = fileURLToPath(new URL('../skills/', import.meta.url))
const RESOURCE_BASE = { kind: 'directory', path: SKILLS_DIR }
const INVOCATION = { modelInvocable: true, userInvocable: true }

/** Kebab-case skill name grammar, matching the registry's own validator. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Read `name`, `description`, and optional `whenToUse` from a skill's YAML
 * frontmatter. Only these fields are read, and only one-line values are
 * supported: every skill in this package writes them on a single line.
 * @param text - complete `SKILL.md` contents.
 * @returns the parsed fields, or `undefined` when the frontmatter is absent or malformed.
 */
function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return undefined
  const end = text.indexOf('\n---', 3)
  if (end === -1) return undefined
  const fields = {}
  for (const line of text.slice(4, end).split('\n')) {
    const at = line.indexOf(':')
    if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim()
  }
  return fields
}

/**
 * Drop the frontmatter block so the loaded body is instructions only.
 * @param text - complete `SKILL.md` contents.
 * @returns the Markdown body.
 */
function stripFrontmatter(text) {
  if (!text.startsWith('---\n')) return text
  const end = text.indexOf('\n---', 3)
  if (end === -1) return text
  return text.slice(end + 4).replace(/^\n+/, '')
}

/**
 * Read one skill directory into a candidate, skipping anything unreadable or
 * failing the registry's own name and description requirements.
 * @param directory - skill directory name under `skills/`.
 * @returns the candidate, or `undefined` when this directory is not a skill.
 */
async function readCandidate(directory) {
  const path = join(SKILLS_DIR, directory, 'SKILL.md')
  let text
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return undefined
  }
  const fields = parseFrontmatter(text)
  if (fields === undefined) return undefined
  if (typeof fields.name !== 'string' || !SKILL_NAME.test(fields.name)) return undefined
  if (typeof fields.description !== 'string' || fields.description.length === 0) return undefined
  return {
    name: fields.name,
    description: fields.description,
    invocation: INVOCATION,
    provider: PROVIDER_NAME,
    source: SOURCE,
    resourceBase: RESOURCE_BASE,
    rank: RANK,
    locator: { path },
  }
}

const provider = {
  name: PROVIDER_NAME,
  /** @returns every readable skill in this package, ordered by name. */
  async list() {
    const entries = await readdir(SKILLS_DIR, { withFileTypes: true })
    const candidates = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const candidate = await readCandidate(entry.name)
      if (candidate !== undefined) candidates.push(candidate)
    }
    candidates.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    return candidates
  },
  /**
   * Load the winning candidate's body.
   * @param candidate - a candidate originally returned by `list()`.
   * @returns the complete skill definition, or `undefined` when it is no longer loadable.
   */
  async get(candidate) {
    const { path } = candidate.locator
    const text = await readFile(path, 'utf8')
    const fields = parseFrontmatter(text)
    return {
      name: candidate.name,
      description: candidate.description,
      invocation: INVOCATION,
      provider: PROVIDER_NAME,
      source: SOURCE,
      resourceBase: RESOURCE_BASE,
      content: stripFrontmatter(text),
      ...(fields !== undefined && typeof fields.whenToUse === 'string' ? { whenToUse: fields.whenToUse } : {}),
    }
  },
}

/** Cordis plugin name. */
export const name = 'ssid-skills'
/** Service required by this provider. */
export const inject = ['skills']

/**
 * Register the packaged skill provider on `ctx.skills`.
 * @param ctx - the Cordis context carrying the `skills` service.
 */
export function apply(ctx) {
  ctx.skills.registerProvider(() => provider)
}

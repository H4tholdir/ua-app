import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const TEMPLATE_PATH = resolve(ROOT, 'scripts/sw-template.js')
const OUTPUT_PATH = resolve(ROOT, 'public/sw.js')

/**
 * Resolve build ID for Service Worker cache versioning.
 * Priority: isDev → VERCEL_GIT_COMMIT_SHA (truncated to 8 chars) → git rev-parse → Date.now()
 *
 * @param {Object} [options={}]
 * @param {boolean} [options.isDev=false]
 * @param {Partial<Record<string, string>>} [options.env]
 * @param {(command: string, options?: object) => string} [options.execSyncFn]
 * @returns {string} Build ID
 */
export function resolveBuildId({ isDev = false, env = process.env, execSyncFn = execSync } = {}) {
  if (isDev) return 'dev'

  const vercelSha = env.VERCEL_GIT_COMMIT_SHA
  if (vercelSha) return vercelSha.slice(0, 8)

  try {
    const gitSha = execSyncFn('git rev-parse --short=8 HEAD', { encoding: 'utf-8' }).trim()
    if (gitSha) return gitSha
  } catch {
    // git non disponibile o non è un repository — si passa al fallback successivo
  }

  return String(Date.now())
}

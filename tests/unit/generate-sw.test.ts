import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync as writeFileSyncNode, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveBuildId, generateServiceWorker } from '../../scripts/generate-sw.mjs'

describe('resolveBuildId', () => {
  it('restituisce "dev" quando isDev è true, ignorando env e git', () => {
    const result = resolveBuildId({
      isDev: true,
      env: { VERCEL_GIT_COMMIT_SHA: 'deadbeef1234' },
      execSyncFn: () => {
        throw new Error('non deve essere chiamato in modalità dev')
      },
    })
    expect(result).toBe('dev')
  })

  it('usa VERCEL_GIT_COMMIT_SHA troncato a 8 caratteri quando presente', () => {
    const result = resolveBuildId({
      isDev: false,
      env: { VERCEL_GIT_COMMIT_SHA: 'deadbeef1234567890' },
      execSyncFn: () => {
        throw new Error('non deve essere chiamato se VERCEL_GIT_COMMIT_SHA è presente')
      },
    })
    expect(result).toBe('deadbeef')
  })

  it('usa git rev-parse quando VERCEL_GIT_COMMIT_SHA è assente', () => {
    const result = resolveBuildId({
      isDev: false,
      env: {},
      execSyncFn: () => 'a1b2c3d4\n',
    })
    expect(result).toBe('a1b2c3d4')
  })

  it('usa Date.now() come fallback quando git fallisce', () => {
    const before = Date.now()
    const result = resolveBuildId({
      isDev: false,
      env: {},
      execSyncFn: () => {
        throw new Error('not a git repository')
      },
    })
    const after = Date.now()
    const parsed = Number(result)
    expect(Number.isNaN(parsed)).toBe(false)
    expect(parsed).toBeGreaterThanOrEqual(before)
    expect(parsed).toBeLessThanOrEqual(after)
  })
})

describe('generateServiceWorker', () => {
  it('scrive il file di output sostituendo il placeholder con il build id', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-gen-test-'))
    try {
      const templatePath = join(dir, 'sw-template.js')
      const outputPath = join(dir, 'sw.js')
      writeFileSyncNode(templatePath, "const CACHE_NAME = 'ua-__BUILD_ID__'\n")

      const buildId = generateServiceWorker({ isDev: true, templatePath, outputPath })

      expect(buildId).toBe('dev')
      expect(readFileSync(outputPath, 'utf-8')).toBe("const CACHE_NAME = 'ua-dev'\n")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

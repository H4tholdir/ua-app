// tests/unit/lab-guard-static.test.ts
// Gemello di lab-context-guard.test.ts: anti-drift N13. Ogni route.ts con
// almeno un handler esportato o è nell'allowlist esenzioni
// (lab-guard-exempt-routes.ts) o chiama assertLabOperativo(.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { LAB_GUARD_EXEMPT_ROUTES } from '@/lib/supabase/lab-guard-exempt-routes'

const SRC = join(process.cwd(), 'src')
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (e.endsWith('.ts')) out.push(p)
  }
  return out
}
const rel = (p: string) => relative(SRC, p).replaceAll('\\', '/')
const routes = walk(join(SRC, 'app', 'api')).filter((f) => rel(f).endsWith('route.ts'))

// Copre sia `export async function GET` sia `export const GET = ...`
// (wrapper/arrow) — un handler in qualunque forma conta come handler.
const HANDLER_RE = /export\s+((async\s+)?function|const)\s+(GET|HEAD|POST|PATCH|PUT|DELETE)\b/

describe('guardia statica lab-guard (N13)', () => {
  it('ogni route con handler non esente chiama assertLabOperativo(', () => {
    const violazioni = routes
      .filter((f) => HANDLER_RE.test(readFileSync(f, 'utf8')))
      .map(rel)
      .filter((r) => !LAB_GUARD_EXEMPT_ROUTES.includes(r as never))
      .filter((r) => !readFileSync(join(SRC, r), 'utf8').includes('assertLabOperativo('))
    expect(violazioni).toEqual([])
  })

  it('ogni esenzione punta a un file esistente (niente entry morte)', () => {
    const all = routes.map(rel)
    for (const r of LAB_GUARD_EXEMPT_ROUTES) {
      expect(all).toContain(r)
    }
  })
})

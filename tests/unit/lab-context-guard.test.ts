// tests/unit/lab-context-guard.test.ts
// Guardia anti-misuse per getLabContext (spec R2 §D-2): il codice vive in
// src/lib/supabase/__tests__ nel brief ma i glob vitest di questo repo
// scoprono solo tests/unit e tests/integration — file spostato qui, SRC
// risolto da process.cwd() (robusto rispetto a __dirname del test runner).
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { LAB_CONTEXT_ROUTE_ALLOWLIST } from '@/lib/supabase/lab-context-allowlist'

const SRC = join(process.cwd(), 'src')
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (e.endsWith('.ts') || e.endsWith('.tsx')) out.push(p)
  }
  return out
}
const files = walk(join(SRC, 'app'))
const rel = (p: string) => relative(SRC, p).replaceAll('\\', '/')

// Estrae il body di ogni handler mutante (fino al prossimo `export` o EOF)
function mutationBodies(src: string): string[] {
  const out: string[] = []
  const re = /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const rest = src.slice(m.index + m[0].length)
    const next = rest.search(/\nexport\s/)
    out.push(next === -1 ? rest : rest.slice(0, next))
  }
  return out
}

// Copre sia getLabContext( sia getLabContextWithTimings( — quest'ultima è la
// wrapper con Server-Timing usata dai 28 GET categoria A (spec R2 N11).
const GET_LAB_CONTEXT_RE = /getLabContext(WithTimings)?\(/

describe('guardia lab-context (spec R2 §D-2)', () => {
  it('getLabContext usato SOLO nei route.ts in allowlist', () => {
    const violazioni = files
      .filter((f) => rel(f).endsWith('route.ts'))
      .filter((f) => GET_LAB_CONTEXT_RE.test(readFileSync(f, 'utf8')))
      .map(rel)
      .filter((r) => !LAB_CONTEXT_ROUTE_ALLOWLIST.includes(r as never))
    expect(violazioni).toEqual([])
  })
  it('nessun handler mutante usa getLabContext (nemmeno in file allowlist)', () => {
    const violazioni = files
      .filter((f) => rel(f).endsWith('route.ts'))
      .filter((f) => mutationBodies(readFileSync(f, 'utf8')).some((b) => GET_LAB_CONTEXT_RE.test(b)))
      .map(rel)
    expect(violazioni).toEqual([])
  })
  it('nessun lookup utenti self diretto fuori da lab-context.ts (anti-bypass N11)', () => {
    const violazioni = files
      .filter((f) => {
        const s = readFileSync(f, 'utf8')
        return s.includes("from('utenti')") && /\.eq\(\s*'id'\s*,\s*(user!?\.id|userId|user\.id)/.test(s)
      })
      .map(rel)
    expect(violazioni).toEqual([])
  })
})

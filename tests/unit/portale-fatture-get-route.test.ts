// tests/unit/portale-fatture-get-route.test.ts
// Ondata 2 — storico fatture nel portale, dietro PIN (spec §3).
// Esclusioni: draft (non emessa) e rifiutata (non valida verso il cliente).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))

import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { GET } from '../../src/app/api/portale/[token]/fatture/route'

const ctx = { params: Promise.resolve({ token: 'tok-1' }) }
function req(cookie?: string): Request {
  return new Request('http://localhost/api/portale/tok-1/fatture', {
    headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest', ...(cookie ? { cookie } : {}) },
  })
}
function cookieValido(): string {
  return `${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 1)}`
}

let cliente: Record<string, unknown> | null
let fatture: Array<Record<string, unknown>>
let fattureErrore: { message: string } | null
let auditInserts: Array<Record<string, unknown>>
let auditErrore: { message: string } | null

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  auditInserts = []
  auditErrore = null
  fattureErrore = null
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true, laboratori: { stato: 'attivo' },
    portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  fatture = [
    { id: 'f-1', numero: '2026-0002', data: '2026-07-05', tipo_documento: 'TD01', totale: 632, pdf_storage_path: 'lab-1/2026/cortesia/Fattura-2026-0002.pdf', stato_sdi: 'generata', cliente_id: 'cli-1', laboratorio_id: 'lab-1' },
    { id: 'f-2', numero: '2026-0001', data: '2026-02-10', tipo_documento: 'TD04', totale: 180, pdf_storage_path: null, stato_sdi: 'smtp_inviata', cliente_id: 'cli-1', laboratorio_id: 'lab-1' },
    { id: 'f-3', numero: '2025-0009', data: '2025-11-20', tipo_documento: 'TD01', totale: 450, pdf_storage_path: 'lab-1/2025/cortesia/Fattura-2025-0009.pdf', stato_sdi: 'generata', cliente_id: 'cli-1', laboratorio_id: 'lab-1' },
    { id: 'f-4-draft', numero: '2026-0003', data: '2026-07-08', tipo_documento: 'TD01', totale: 100, pdf_storage_path: null, stato_sdi: 'draft', cliente_id: 'cli-1', laboratorio_id: 'lab-1' },
    { id: 'f-5-rifiutata', numero: '2026-0004', data: '2026-07-09', tipo_documento: 'TD01', totale: 200, pdf_storage_path: 'lab-1/2026/cortesia/Fattura-2026-0004.pdf', stato_sdi: 'rifiutata', cliente_id: 'cli-1', laboratorio_id: 'lab-1' },
  ]
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }) }
    }
    if (table === 'fatture') {
      // catena: select → eq(cliente) → eq(lab) → not(stato_sdi in) → is(deleted) → order
      // Il mock registra i filtri realmente invocati dalla route e li applica alla
      // risoluzione di `order(...)`: se la route smette di chiamare `.not(...)`, il
      // filtro non viene registrato e il test torna a vedere draft/rifiutata → FALLISCE.
      const notCalls: Array<[string, string, string]> = []
      const eqCalls: Array<[string, unknown]> = []
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = (col: string, val: unknown) => { eqCalls.push([col, val]); return chain }
      chain.not = (col: string, op: string, val: string) => { notCalls.push([col, op, val]); return chain }
      chain.is = () => chain
      chain.order = async () => {
        if (fattureErrore) return { data: null, error: fattureErrore }
        let risultato = fatture
        for (const [col, op, val] of notCalls) {
          if (op === 'in') {
            // parse stile PostgREST: ("a","b") → ['a','b']
            const match = /^\((.*)\)$/.exec(val)
            const valori = match ? match[1].split(',').map((v) => v.replace(/^"|"$/g, '')) : []
            risultato = risultato.filter((r) => !valori.includes(String(r[col])))
          }
        }
        for (const [col, val] of eqCalls) {
          risultato = risultato.filter((r) => r[col] === val)
        }
        return { data: risultato, error: null }
      }
      return chain
    }
    // portale_accessi
    return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: auditErrore } } }
  })
})

describe('GET /api/portale/[token]/fatture', () => {
  it('lista raggruppata per anno desc, pdf boolean, audit view_fatture con IP', async () => {
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.gruppi.map((g: { anno: number }) => g.anno)).toEqual([2026, 2025])
    expect(json.gruppi[0].fatture).toHaveLength(2)
    expect(json.gruppi[0].fatture[0]).toEqual({ id: 'f-1', numero: '2026-0002', data: '2026-07-05', tipo_documento: 'TD01', totale: 632, pdf: true })
    expect(json.gruppi[0].fatture[1].pdf).toBe(false)
    expect(JSON.stringify(json)).not.toContain('pdf_storage_path')
    expect(auditInserts.some((a) => a.azione === 'view_fatture' && a.ip_address === '1.2.3.4')).toBe(true)
  })

  it('esclude fatture draft e rifiutata dallo storico (vincolo di sicurezza centrale)', async () => {
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    const idsRestituiti = json.gruppi.flatMap((g: { fatture: Array<{ id: string }> }) => g.fatture.map((f) => f.id))
    expect(idsRestituiti).not.toContain('f-4-draft')
    expect(idsRestituiti).not.toContain('f-5-rifiutata')
    expect(idsRestituiti.sort()).toEqual(['f-1', 'f-2', 'f-3'].sort())
  })

  it('lettura fatture fallita → 500 senza leak', async () => {
    fattureErrore = { message: 'boom-postgres' }
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom-postgres')
  })

  it('audit fallito → 500 (fail-loud, evento economico)', async () => {
    auditErrore = { message: 'insert ko' }
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
  })

  it('guardie: senza sessione → 401; interruttore OFF → 403; token invalido → 401 uniforme', async () => {
    expect((await GET(req(), ctx)).status).toBe(401)
    cliente!.portale_fatturazione_attiva = false
    expect((await GET(req(cookieValido()), ctx)).status).toBe(403)
    cliente = null
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(401)
    expect((await res.json()).errore).toBe('non_autorizzato')
  })
})

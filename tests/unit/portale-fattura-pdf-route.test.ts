// tests/unit/portale-fattura-pdf-route.test.ts
// Ondata 2 — download copia di cortesia, pattern B5 (signed URL 300s + 307).
// Audit download_fattura fail-loud: se l'insert fallisce NIENTE redirect.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockGetSignedUrl } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSignedUrl: vi.fn(async (): Promise<string | null> => 'https://signed.example/f.pdf?token=abc'),
}))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/storage/signed-url', () => ({ getSignedUrl: mockGetSignedUrl }))

import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { GET } from '../../src/app/api/portale/[token]/fatture/[fattura_id]/pdf/route'

const ctx = { params: Promise.resolve({ token: 'tok-1', fattura_id: 'f-1' }) }
function req(cookie?: string): Request {
  return new Request('http://localhost/api/portale/tok-1/fatture/f-1/pdf', {
    headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest', ...(cookie ? { cookie } : {}) },
  })
}
function cookieValido(): string {
  return `${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 1)}`
}

let cliente: Record<string, unknown> | null
let fattura: Record<string, unknown> | null
let auditInserts: Array<Record<string, unknown>>
let auditErrore: { message: string } | null

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  auditInserts = []
  auditErrore = null
  mockGetSignedUrl.mockResolvedValue('https://signed.example/f.pdf?token=abc')
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true,
    portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  fattura = { id: 'f-1', numero: '2026-0002', pdf_storage_path: 'lab-1/2026/cortesia/Fattura-2026-0002.pdf' } as Record<string, unknown>
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }) }
    }
    if (table === 'fatture') {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.not = () => chain
      chain.is = () => chain
      chain.maybeSingle = async () => ({ data: fattura, error: null })
      return chain
    }
    return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: auditErrore } } }
  })
})

describe('GET /api/portale/[token]/fatture/[fattura_id]/pdf', () => {
  it('successo: 307 al signed URL, audit download_fattura con dettaglio', async () => {
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://signed.example/f.pdf?token=abc')
    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), 'fatture-pdf', 'lab-1/2026/cortesia/Fattura-2026-0002.pdf', 300)
    const audit = auditInserts.find((a) => a.azione === 'download_fattura')
    expect(audit).toBeTruthy()
    expect((audit!.dettaglio as { fattura_id: string }).fattura_id).toBe('f-1')
    expect(audit!.ip_address).toBe('1.2.3.4')
  })

  it('fattura inesistente/di altro cliente → 404', async () => {
    fattura = null
    expect((await GET(req(cookieValido()), ctx)).status).toBe(404)
  })

  it('pdf_storage_path NULL → 404 documento non disponibile', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fattura = { id: 'f-1', numero: '2026-0002', pdf_storage_path: null } as any as Record<string, unknown>
    expect((await GET(req(cookieValido()), ctx)).status).toBe(404)
  })

  it('audit fallito → 500, NESSUN redirect (fail-loud)', async () => {
    auditErrore = { message: 'ko' }
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
    expect(res.headers.get('location')).toBeNull()
  })

  it('signed URL non ottenibile → 500', async () => {
    mockGetSignedUrl.mockResolvedValueOnce(null)
    expect((await GET(req(cookieValido()), ctx)).status).toBe(500)
  })

  it('guardie: senza sessione → 401; token invalido → 401 uniforme', async () => {
    expect((await GET(req(), ctx)).status).toBe(401)
    cliente = null
    expect((await GET(req(cookieValido()), ctx)).status).toBe(401)
  })
})

// tests/unit/portale-situazione-get-route.test.ts
// Ondata 3 — situazione economica nel portale, dietro PIN (spec Ondata 3 §3).
// Il saldo è l'output di calcolaCreditoCliente passato così com'è; i dovuti
// sono minimizzati ad allowlist (cadono id e stato_sdi).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))

const { mockContabilita, mockPagamenti } = vi.hoisted(() => ({
  mockContabilita: vi.fn(),
  mockPagamenti: vi.fn(),
}))
vi.mock('@/lib/contabilita/queries', () => ({
  getContabilitaCliente: mockContabilita,
  getPagamentiCliente: mockPagamenti,
}))

import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { GET } from '../../src/app/api/portale/[token]/situazione/route'

const ctx = { params: Promise.resolve({ token: 'tok-1' }) }
function req(cookie?: string): Request {
  return new Request('http://localhost/api/portale/tok-1/situazione', {
    headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest', ...(cookie ? { cookie } : {}) },
  })
}
function cookieValido(): string {
  return `${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 1)}`
}

let cliente: Record<string, unknown> | null
let auditInserts: Array<Record<string, unknown>>
let auditErrore: { message: string } | null

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  auditInserts = []
  auditErrore = null
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true,
    portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }) }
    }
    // portale_accessi
    return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: auditErrore } } }
  })
  mockContabilita.mockResolvedValue({
    dovuti: [
      // campi vietati presenti apposta: la route DEVE lasciarli cadere
      { id: 'fat-id-1', origine: 'fattura', numero: '2026-0002', data: '2026-05-01', totale: 632, residuo: 500, pagata: false, giorni_ritardo: 43, stato_sdi: 'smtp_inviata' },
      { id: 'lav-id-1', origine: 'lavoro_diretto', numero: '2026/0015', data: '2026-06-20', totale: 180, residuo: 180, pagata: false, giorni_ritardo: 2, stato_sdi: null },
      { id: 'fat-id-2', origine: 'fattura', numero: '2026-0001', data: '2026-02-10', totale: 132, residuo: 0, pagata: true, giorni_ritardo: 120, stato_sdi: 'accettata' },
    ],
    lavoriInAttesa: [
      { id: 'lav-id-9', numero_lavoro: '2026/0031', prezzo_unitario: 322, data_consegna_prevista: '2026-07-01', proposta_dentista: null, proposta_at: null },
    ],
    creditoCliente: { confermato: 680, potenziale: 322, disponibile: 45, totale: 1002 },
  })
  mockPagamenti.mockResolvedValue([
    { data: '2026-06-01', importo: 132, metodo: 'bonifico', destinazione: { tipo: 'fattura', numero: '2026-0001' } },
  ])
})

describe('GET /api/portale/[token]/situazione', () => {
  it('risposta felice: saldo passthrough, dovuti minimizzati, pagamenti, audit view_situazione con IP', async () => {
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.studio).toBe('Studio Bianchi')
    expect(json.saldo).toEqual({ confermato: 680, potenziale: 322, disponibile: 45, totale: 1002 })
    expect(json.dovuti).toEqual([
      { origine: 'fattura', numero: '2026-0002', data: '2026-05-01', totale: 632, residuo: 500, pagata: false, giorni_ritardo: 43 },
      { origine: 'lavoro_diretto', numero: '2026/0015', data: '2026-06-20', totale: 180, residuo: 180, pagata: false, giorni_ritardo: 2 },
      { origine: 'fattura', numero: '2026-0001', data: '2026-02-10', totale: 132, residuo: 0, pagata: true, giorni_ritardo: 120 },
    ])
    expect(json.pagamenti).toEqual([
      { data: '2026-06-01', importo: 132, metodo: 'bonifico', destinazione: { tipo: 'fattura', numero: '2026-0001' } },
    ])
    expect(mockContabilita).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'cli-1')
    expect(mockPagamenti).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'cli-1')
    expect(auditInserts.some((a) => a.azione === 'view_situazione' && a.ip_address === '1.2.3.4')).toBe(true)
  })

  it('content-check: i campi vietati non compaiono MAI nel payload', async () => {
    const res = await GET(req(cookieValido()), ctx)
    const raw = JSON.stringify(await res.json())
    expect(raw).not.toContain('metodo_nota')
    expect(raw).not.toContain('stato_sdi')
    expect(raw).not.toContain('fat-id-1')
    expect(raw).not.toContain('lav-id-1')
    expect(raw).not.toContain('lavoriInAttesa') // il dettaglio in attesa NON è esposto: solo il numero potenziale
  })

  it('lettura contabilità fallita → 500 senza leak', async () => {
    mockContabilita.mockRejectedValue(new Error('boom-postgres'))
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom-postgres')
  })

  it('lettura pagamenti fallita → 500 senza leak (fail-closed della lib)', async () => {
    mockPagamenti.mockRejectedValue(new Error('boom-pagamenti'))
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom-pagamenti')
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

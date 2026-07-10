import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))

import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { GET } from '../../src/app/api/portale/[token]/fatturazione/route'

const ctx = { params: Promise.resolve({ token: 'tok-1' }) }
function req(cookie?: string): Request {
  return new Request('http://localhost/api/portale/tok-1/fatturazione', {
    headers: {
      'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest',
      ...(cookie ? { cookie } : {}),
    },
  })
}
function cookieValido(): string {
  return `${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 1)}`
}

let cliente: Record<string, unknown> | null
let lavori: Array<Record<string, unknown>>
let fattureLavoroIds: string[]
let fattureErrore: { message: string } | null
let auditInserts: Array<Record<string, unknown>>

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  auditInserts = []
  fattureErrore = null
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true,
    portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  lavori = [
    { id: 'lav-1', numero_lavoro: '2026-0141', tipo_dispositivo: 'corona', data_consegna_effettiva: '2026-07-03T10:00:00Z', prezzo_unitario: 180, paziente_nome_snapshot: 'ROSSI MARIO', proposta_dentista: null, proposta_at: null, decisione_fatturazione: 'in_attesa' },
    { id: 'lav-2', numero_lavoro: '2026-0139', tipo_dispositivo: 'ponte', data_consegna_effettiva: '2026-06-28T10:00:00Z', prezzo_unitario: 450, paziente_nome_snapshot: 'VERDI ANNA', proposta_dentista: 'fatturare', proposta_at: '2026-07-01T09:00:00Z', decisione_fatturazione: 'in_attesa' },
    { id: 'lav-3', numero_lavoro: '2026-0135', tipo_dispositivo: 'protesi', data_consegna_effettiva: '2026-06-20T10:00:00Z', prezzo_unitario: 900, paziente_nome_snapshot: 'NERI LUCA', proposta_dentista: null, proposta_at: null, decisione_fatturazione: 'fatturare' },
  ]
  fattureLavoroIds = []
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }) }
    }
    if (table === 'lavori') {
      return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ order: async () => ({ data: lavori, error: null }) }) }) }) }) }) }) }
    }
    if (table === 'fatture') {
      return { select: () => ({ eq: () => ({ neq: () => ({ in: async () => (fattureErrore ? { data: null, error: fattureErrore } : { data: fattureLavoroIds.map((id) => ({ lavoro_id: id })), error: null }) }) }) }) }
    }
    // portale_accessi
    return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: null } } }
  })
})

describe('GET /api/portale/[token]/fatturazione', () => {
  it('lista completa: gruppi per mese desc, paziente minimizzato, prezzi, totale dei fatturare', async () => {
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.gruppi.map((g: { mese: string }) => g.mese)).toEqual(['2026-07', '2026-06'])
    const tutte = json.gruppi.flatMap((g: { lavori: unknown[] }) => g.lavori)
    expect(tutte).toHaveLength(3)
    expect(tutte[0].paziente).toBe('R. MARIO')
    expect(JSON.stringify(json)).not.toContain('ROSSI')
    // totale: lav-2 (proposta fatturare, in_attesa) + lav-3 (decisione fatturare) = 450 + 900
    expect(json.totale_fatturare).toBe(1350)
    expect(auditInserts.some((a) => a.azione === 'view_fatturazione' && a.ip_address === '1.2.3.4')).toBe(true)
  })

  it('VINCOLO doppia sorgente: lavoro con fattura attiva via fatture.lavoro_id escluso anche se incluso_in_fattura=false', async () => {
    fattureLavoroIds = ['lav-3'] // fatturato via xml route multi-lavoro: incluso_in_fattura resta false
    const res = await GET(req(cookieValido()), ctx)
    const json = await res.json()
    const tutte = json.gruppi.flatMap((g: { lavori: Array<{ id: string }> }) => g.lavori)
    expect(tutte.map((l: { id: string }) => l.id)).not.toContain('lav-3')
    expect(json.totale_fatturare).toBe(450)
  })

  it('FAIL-CLOSED: errore sulla lettura fatture → 500, mai lista parziale', async () => {
    fattureErrore = { message: 'boom' }
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom')
  })

  it('riga confermata: confermato=true e decisione esposta', async () => {
    const res = await GET(req(cookieValido()), ctx)
    const json = await res.json()
    const lav3 = json.gruppi.flatMap((g: { lavori: Array<{ id: string; confermato: boolean; decisione: string }> }) => g.lavori).find((l: { id: string }) => l.id === 'lav-3')
    expect(lav3.confermato).toBe(true)
    expect(lav3.decisione).toBe('fatturare')
  })

  it('senza sessione → 401; sessione di un altro cliente → 401; pin_generation cambiata → 401', async () => {
    expect((await GET(req(), ctx)).status).toBe(401)
    expect((await GET(req(`${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-2', 1)}`), ctx)).status).toBe(401)
    expect((await GET(req(`${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 99)}`), ctx)).status).toBe(401)
  })

  it('interruttore OFF → 403; token invalido → 401 uniforme', async () => {
    cliente!.portale_fatturazione_attiva = false
    expect((await GET(req(cookieValido()), ctx)).status).toBe(403)
    cliente = null
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(401)
    expect((await res.json()).errore).toBe('non_autorizzato')
  })
})

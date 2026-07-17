// tests/unit/portale-lab-guard.test.ts
// N13: guardia stato-lab nel portale token. Lab blacklist → 404 generico
// (no info-leak a terzi); sospeso/scaduto → read consentito (invariato).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))

import { getServiceClient } from '@/lib/supabase/server-service'
import { risolviClientePortale, guardieEconomiche } from '@/lib/portale/guardie'
import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'

type Cliente = Record<string, unknown>

function clienteFixture(labStato: string): Cliente {
  return {
    id: 'cli-1',
    laboratorio_id: 'lab-1',
    studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null,
    portale_fatturazione_attiva: true,
    portale_pin_hash: 'scrypt$32768$8$1$a$b',
    portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null,
    portale_pin_generation: 1,
    laboratori: { stato: labStato },
  }
}

let cliente: Cliente | null

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  cliente = clienteFixture('attivo')
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return {
        select: () => ({
          eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }),
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

const svc = () => getServiceClient()

describe('risolviClientePortale — stato lab (N13)', () => {
  it('lab attivo → ok, espone lab_stato', async () => {
    const ris = await risolviClientePortale(svc(), 'tok-1')
    expect(ris.esito).toBe('ok')
    if (ris.esito === 'ok') expect(ris.cliente.lab_stato).toBe('attivo')
  })

  it('lab sospeso e scaduto → ok (read di terzi consentito)', async () => {
    for (const stato of ['sospeso', 'scaduto']) {
      cliente = clienteFixture(stato)
      const ris = await risolviClientePortale(svc(), 'tok-1')
      expect(ris.esito).toBe('ok')
    }
  })

  it('lab blacklist → non_disponibile', async () => {
    cliente = clienteFixture('blacklist')
    const ris = await risolviClientePortale(svc(), 'tok-1')
    expect(ris.esito).toBe('non_disponibile')
  })

  it('embed laboratori assente → non_disponibile (fail-closed)', async () => {
    cliente = { ...clienteFixture('attivo'), laboratori: null }
    const ris = await risolviClientePortale(svc(), 'tok-1')
    expect(ris.esito).toBe('non_disponibile')
  })
})

describe('guardieEconomiche — stato lab (N13)', () => {
  function req(cookie?: string): Request {
    return new Request('http://localhost/api/portale/tok-1/situazione', {
      headers: cookie ? { cookie } : {},
    })
  }
  const cookieValido = () => `${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 1)}`

  it('lab blacklist → 404 generico { errore: non_trovato }', async () => {
    cliente = clienteFixture('blacklist')
    const ris = await guardieEconomiche(svc(), req(cookieValido()), 'tok-1')
    expect(ris.ok).toBe(false)
    if (!ris.ok) {
      expect(ris.res.status).toBe(404)
      expect(await ris.res.json()).toEqual({ errore: 'non_trovato' })
    }
  })

  it('lab sospeso con sessione valida → ok (invariato)', async () => {
    cliente = clienteFixture('sospeso')
    const ris = await guardieEconomiche(svc(), req(cookieValido()), 'tok-1')
    expect(ris.ok).toBe(true)
  })
})

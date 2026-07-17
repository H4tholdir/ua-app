// tests/unit/portale-lab-guard.test.ts
// N13: guardia stato-lab nel portale token. In ENFORCE lab blacklist → 404
// generico (no info-leak a terzi, anche con token scaduto); sospeso/scaduto →
// read consentito (invariato). In SHADOW (default rollout) logga soltanto.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))

import { getServiceClient } from '@/lib/supabase/server-service'
import { risolviClientePortale, guardieEconomiche, statoLabDaEmbed } from '@/lib/portale/guardie'
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
  process.env.UA_LAB_GUARD_MODE = 'enforce'
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
afterEach(() => {
  delete process.env.UA_LAB_GUARD_MODE
  vi.restoreAllMocks()
})

const svc = () => getServiceClient()

describe('statoLabDaEmbed — robustezza forma embed', () => {
  it('oggetto (forma runtime PostgREST verificata) → stato', () => {
    expect(statoLabDaEmbed({ stato: 'attivo' })).toBe('attivo')
  })
  it('array (forma del typegen) → stato del primo elemento', () => {
    expect(statoLabDaEmbed([{ stato: 'sospeso' }])).toBe('sospeso')
  })
  it('null/undefined/forma ignota → null (fail-closed a carico del chiamante)', () => {
    expect(statoLabDaEmbed(null)).toBeNull()
    expect(statoLabDaEmbed(undefined)).toBeNull()
    expect(statoLabDaEmbed({})).toBeNull()
    expect(statoLabDaEmbed([])).toBeNull()
  })
})

describe('risolviClientePortale — stato lab (enforce)', () => {
  it('lab attivo → ok', async () => {
    const ris = await risolviClientePortale(svc(), 'tok-1')
    expect(ris.esito).toBe('ok')
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

  it('lab blacklist + token scaduto → non_disponibile (blacklist valutata PRIMA: no oracolo di esistenza)', async () => {
    cliente = { ...clienteFixture('blacklist'), portale_token_scade_at: '2020-01-01T00:00:00Z' }
    const ris = await risolviClientePortale(svc(), 'tok-1')
    expect(ris.esito).toBe('non_disponibile')
  })

  it('embed laboratori assente → non_disponibile (fail-closed)', async () => {
    cliente = { ...clienteFixture('attivo'), laboratori: null }
    const ris = await risolviClientePortale(svc(), 'tok-1')
    expect(ris.esito).toBe('non_disponibile')
  })

  it('modalità shadow (default rollout): blacklist → ok + would-block loggato', async () => {
    process.env.UA_LAB_GUARD_MODE = 'shadow'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    cliente = clienteFixture('blacklist')
    const ris = await risolviClientePortale(svc(), 'tok-1')
    expect(ris.esito).toBe('ok')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0].join(' ')).toContain('would-block')
  })

  it('kill-switch off: blacklist → ok senza log', async () => {
    process.env.UA_LAB_GUARD_MODE = 'off'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    cliente = clienteFixture('blacklist')
    const ris = await risolviClientePortale(svc(), 'tok-1')
    expect(ris.esito).toBe('ok')
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('guardieEconomiche — stato lab (enforce)', () => {
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

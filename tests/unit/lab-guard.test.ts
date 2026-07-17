// tests/unit/lab-guard.test.ts
// N13: matrice ratificata stato-lab × metodo (decisione 17/07/2026).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { assertLabOperativo, getLabGuardMode, LAB_GUARD_DEFAULT_MODE } from '@/lib/supabase/lab-guard'

const LAB_ATTIVO = { stato: 'attivo', trial_ends_at: null }
const ctx = (
  over: Partial<{ ruolo: string; lab: { stato: string; trial_ends_at: string | null } | null }> = {}
) => ({
  ruolo: 'titolare',
  lab: LAB_ATTIVO,
  ...over,
})

async function bodyOf(res: Response) {
  return res.json() as Promise<{ error: string; code: string }>
}

describe('assertLabOperativo — matrice ratificata (enforce)', () => {
  beforeEach(() => { process.env.UA_LAB_GUARD_MODE = 'enforce' })
  afterEach(() => { delete process.env.UA_LAB_GUARD_MODE; vi.restoreAllMocks() })

  it('trial e attivo: tutto consentito', () => {
    expect(assertLabOperativo(ctx(), 'GET')).toBeNull()
    expect(assertLabOperativo(ctx(), 'POST')).toBeNull()
    expect(
      assertLabOperativo(
        ctx({ lab: { stato: 'trial', trial_ends_at: new Date(Date.now() + 86_400_000).toISOString() } }),
        'PATCH'
      )
    ).toBeNull()
    // trial_ends_at null = override admin, non scade mai
    expect(assertLabOperativo(ctx({ lab: { stato: 'trial', trial_ends_at: null } }), 'DELETE')).toBeNull()
  })

  it('trial scaduto: GET ok, mutazione 403 UA_LAB_TRIAL_SCADUTO', async () => {
    const scaduto = ctx({ lab: { stato: 'trial', trial_ends_at: new Date(Date.now() - 1000).toISOString() } })
    expect(assertLabOperativo(scaduto, 'GET')).toBeNull()
    const res = assertLabOperativo(scaduto, 'POST')!
    expect(res.status).toBe(403)
    expect((await bodyOf(res)).code).toBe('UA_LAB_TRIAL_SCADUTO')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it.each([
    ['sospeso', 'UA_LAB_SOSPESO'],
    ['scaduto', 'UA_LAB_SCADUTO'],
  ])('%s: GET/HEAD ok, mutazioni 403 %s', async (stato, code) => {
    const c = ctx({ lab: { stato, trial_ends_at: null } })
    expect(assertLabOperativo(c, 'GET')).toBeNull()
    expect(assertLabOperativo(c, 'HEAD')).toBeNull()
    for (const m of ['POST', 'PATCH', 'PUT', 'DELETE'] as const) {
      const res = assertLabOperativo(c, m)!
      expect(res.status).toBe(403)
      expect((await bodyOf(res)).code).toBe(code)
      expect(res.headers.get('Cache-Control')).toBe('no-store')
    }
  })

  it('blacklist: TUTTO 403, GET inclusi', async () => {
    const c = ctx({ lab: { stato: 'blacklist', trial_ends_at: null } })
    for (const m of ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE'] as const) {
      const res = assertLabOperativo(c, m)!
      expect(res.status).toBe(403)
      expect((await bodyOf(res)).code).toBe('UA_LAB_BLACKLIST')
    }
  })

  it('stato sconosciuto: 403 fail-closed anche in GET', async () => {
    const res = assertLabOperativo(ctx({ lab: { stato: 'stato_futuro', trial_ends_at: null } }), 'GET')!
    expect(res.status).toBe(403)
    expect((await bodyOf(res)).code).toBe('UA_LAB_NON_OPERATIVO')
  })

  it('ctx null o lab null non-admin: 403 fail-closed', async () => {
    expect(assertLabOperativo(null, 'GET')!.status).toBe(403)
    const res = assertLabOperativo(ctx({ lab: null }), 'POST')!
    expect(res.status).toBe(403)
    expect((await bodyOf(res)).code).toBe('UA_LAB_NON_OPERATIVO')
  })

  it('admin_sistema: bypass totale anche con lab null', () => {
    const admin = ctx({ ruolo: 'admin_sistema', lab: null })
    expect(assertLabOperativo(admin, 'DELETE')).toBeNull()
    expect(assertLabOperativo(admin, 'GET')).toBeNull()
  })

  it('admin_rete: come titolare (nessun bypass)', () => {
    const c = ctx({ ruolo: 'admin_rete', lab: { stato: 'sospeso', trial_ends_at: null } })
    expect(assertLabOperativo(c, 'POST')).not.toBeNull()
    expect(assertLabOperativo(c, 'GET')).toBeNull()
  })
})

describe('assertLabOperativo — modalità (kill-switch e shadow)', () => {
  afterEach(() => { delete process.env.UA_LAB_GUARD_MODE; vi.restoreAllMocks() })

  it('default senza env = shadow (ondata rollout)', () => {
    delete process.env.UA_LAB_GUARD_MODE
    expect(LAB_GUARD_DEFAULT_MODE).toBe('shadow')
    expect(getLabGuardMode()).toBe('shadow')
  })

  it('env non valida → default', () => {
    process.env.UA_LAB_GUARD_MODE = 'banana'
    expect(getLabGuardMode()).toBe(LAB_GUARD_DEFAULT_MODE)
  })

  it('shadow: would-block loggato, richiesta consentita', () => {
    process.env.UA_LAB_GUARD_MODE = 'shadow'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const res = assertLabOperativo(ctx({ lab: { stato: 'blacklist', trial_ends_at: null } }), 'GET')
    expect(res).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0].join(' ')).toContain('UA_LAB_BLACKLIST')
  })

  it('shadow: richiesta consentita (attivo) → nessun log', () => {
    process.env.UA_LAB_GUARD_MODE = 'shadow'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(assertLabOperativo(ctx(), 'POST')).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  it('off (kill-switch): nessun log, nessun blocco', () => {
    process.env.UA_LAB_GUARD_MODE = 'off'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(assertLabOperativo(ctx({ lab: { stato: 'blacklist', trial_ends_at: null } }), 'POST')).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })
})

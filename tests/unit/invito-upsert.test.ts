import { describe, it, expect, vi } from 'vitest'
import { trovaInvitoPendente, upsertInvito } from '@/lib/invito/upsert-invito'

describe('trovaInvitoPendente', () => {
  const NOW = new Date('2026-07-03T12:00:00Z')

  it('nessun invito esistente → null', () => {
    expect(trovaInvitoPendente([], NOW)).toBeNull()
  })

  it('invito pendente non scaduto → restituisce il suo id', () => {
    const inviti = [{ id: 'inv-1', accepted_at: null, expires_at: '2026-07-10T00:00:00Z' }]
    expect(trovaInvitoPendente(inviti, NOW)).toBe('inv-1')
  })

  it('invito già accettato → ignorato (null)', () => {
    const inviti = [{ id: 'inv-1', accepted_at: '2026-07-01T00:00:00Z', expires_at: '2026-07-10T00:00:00Z' }]
    expect(trovaInvitoPendente(inviti, NOW)).toBeNull()
  })

  it('invito scaduto (non accettato) → ignorato (null)', () => {
    const inviti = [{ id: 'inv-1', accepted_at: null, expires_at: '2026-07-01T00:00:00Z' }]
    expect(trovaInvitoPendente(inviti, NOW)).toBeNull()
  })

  it('più inviti misti → restituisce quello ancora pendente', () => {
    const inviti = [
      { id: 'inv-scaduto', accepted_at: null, expires_at: '2026-07-01T00:00:00Z' },
      { id: 'inv-pendente', accepted_at: null, expires_at: '2026-07-10T00:00:00Z' },
    ]
    expect(trovaInvitoPendente(inviti, NOW)).toBe('inv-pendente')
  })
})

function createFakeSupabase(config: {
  lab?: { stato: string; nome: string } | null
  inviti?: Array<{ id: string; accepted_at: string | null; expires_at: string }>
  onInsert?: (row: Record<string, unknown>) => void
  onUpdate?: (id: string, row: Record<string, unknown>) => void
}) {
  const fake = {
    from(table: string) {
      const builder = {
        select() { return builder },
        eq() { return builder },
        single() {
          return Promise.resolve({ data: table === 'laboratori' ? (config.lab ?? null) : null, error: null })
        },
        insert(row: Record<string, unknown>) {
          config.onInsert?.(row)
          return Promise.resolve({ error: null })
        },
        update(row: Record<string, unknown>) {
          return {
            eq(_col: string, id: string) {
              config.onUpdate?.(id, row)
              return Promise.resolve({ error: null })
            },
          }
        },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          resolve({ data: table === 'inviti' ? (config.inviti ?? []) : [], error: null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return fake
}

describe('upsertInvito', () => {
  it('laboratorio inesistente → 404', async () => {
    const svc = createFakeSupabase({ lab: null })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'a@b.it', ruolo: 'tecnico', createdBy: 'u1' })
    expect(r).toMatchObject({ ok: false, status: 404 })
  })

  it('laboratorio in blacklist → 403', async () => {
    const svc = createFakeSupabase({ lab: { stato: 'blacklist', nome: 'Lab Test' } })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'a@b.it', ruolo: 'tecnico', createdBy: 'u1' })
    expect(r).toMatchObject({ ok: false, status: 403 })
  })

  it('laboratorio scaduto → 403', async () => {
    const svc = createFakeSupabase({ lab: { stato: 'scaduto', nome: 'Lab Test' } })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'a@b.it', ruolo: 'tecnico', createdBy: 'u1' })
    expect(r).toMatchObject({ ok: false, status: 403 })
  })

  it('nessun invito pendente → crea una nuova riga con email normalizzata', async () => {
    const onInsert = vi.fn()
    const svc = createFakeSupabase({ lab: { stato: 'attivo', nome: 'Lab Test' }, inviti: [], onInsert })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'A@B.it ', ruolo: 'tecnico', createdBy: 'u1' })
    expect(r.ok).toBe(true)
    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(onInsert.mock.calls[0][0]).toMatchObject({ email: 'a@b.it', laboratorio_id: 'lab-x', ruolo: 'tecnico' })
  })

  it('invito pendente esistente per stessa email → aggiorna invece di duplicare', async () => {
    const onInsert = vi.fn()
    const onUpdate = vi.fn()
    const inviti = [{ id: 'inv-1', accepted_at: null, expires_at: '2099-01-01T00:00:00Z' }]
    const svc = createFakeSupabase({ lab: { stato: 'attivo', nome: 'Lab Test' }, inviti, onInsert, onUpdate })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'a@b.it', ruolo: 'front_desk', createdBy: 'u1' })
    expect(r.ok).toBe(true)
    expect(onInsert).not.toHaveBeenCalled()
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate.mock.calls[0][0]).toBe('inv-1')
    expect(onUpdate.mock.calls[0][1]).toMatchObject({ ruolo: 'front_desk' })
  })

  it('invito esistente ma scaduto → crea comunque una nuova riga (non aggiorna)', async () => {
    const onInsert = vi.fn()
    const onUpdate = vi.fn()
    const inviti = [{ id: 'inv-vecchio', accepted_at: null, expires_at: '2020-01-01T00:00:00Z' }]
    const svc = createFakeSupabase({ lab: { stato: 'attivo', nome: 'Lab Test' }, inviti, onInsert, onUpdate })
    const r = await upsertInvito(svc, { laboratorioId: 'lab-x', email: 'a@b.it', ruolo: 'tecnico', createdBy: 'u1' })
    expect(r.ok).toBe(true)
    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(onUpdate).not.toHaveBeenCalled()
  })
})

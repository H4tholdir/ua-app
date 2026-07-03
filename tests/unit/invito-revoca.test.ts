import { describe, it, expect, vi } from 'vitest'
import { revocaInvito } from '@/lib/invito/revoca-invito'

function createFakeSupabase(config: {
  found: boolean
  onUpdate?: (id: string, row: Record<string, unknown>) => void
  updateError?: string
  selectError?: { code?: string; message?: string }
}) {
  const fake = {
    from() {
      const builder = {
        select() { return builder },
        eq() { return builder },
        is() { return builder },
        single() {
          if (config.selectError) {
            return Promise.resolve({ data: null, error: config.selectError })
          }
          return Promise.resolve({
            data: config.found ? { id: 'inv-1' } : null,
            error: config.found ? null : { code: 'PGRST116' },
          })
        },
        update(row: Record<string, unknown>) {
          return {
            eq(_col: string, id: string) {
              config.onUpdate?.(id, row)
              return Promise.resolve({ error: config.updateError ? { message: config.updateError } : null })
            },
          }
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return fake
}

describe('revocaInvito', () => {
  it('invito non trovato nel proprio lab → 404 (copre anche invito di un altro lab)', async () => {
    const svc = createFakeSupabase({ found: false })
    const r = await revocaInvito(svc, { inviteId: 'inv-1', laboratorioId: 'lab-1' })
    expect(r).toMatchObject({ ok: false, status: 404 })
  })

  it('invito trovato nel proprio lab → soft-revoca (accepted_at valorizzato)', async () => {
    const onUpdate = vi.fn()
    const svc = createFakeSupabase({ found: true, onUpdate })
    const r = await revocaInvito(svc, { inviteId: 'inv-1', laboratorioId: 'lab-1' })
    expect(r).toEqual({ ok: true })
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate.mock.calls[0][0]).toBe('inv-1')
    expect(typeof onUpdate.mock.calls[0][1].accepted_at).toBe('string')
  })

  it('errore DB durante update → 500', async () => {
    const svc = createFakeSupabase({ found: true, updateError: 'boom' })
    const r = await revocaInvito(svc, { inviteId: 'inv-1', laboratorioId: 'lab-1' })
    expect(r).toMatchObject({ ok: false, status: 500, error: 'boom' })
  })

  it('errore DB genuino durante il lookup (code diverso da PGRST116) → 500', async () => {
    const svc = createFakeSupabase({ found: false, selectError: { code: '500', message: 'connessione al DB fallita' } })
    const r = await revocaInvito(svc, { inviteId: 'inv-1', laboratorioId: 'lab-1' })
    expect(r).toMatchObject({ ok: false, status: 500, error: 'connessione al DB fallita' })
  })
})

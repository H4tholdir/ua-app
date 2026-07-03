import { describe, it, expect } from 'vitest'
import { listInvitiPendenti } from '@/lib/invito/list-inviti-pendenti'

function createFakeSupabase(rows: unknown[] | null) {
  const fake = {
    from(table: string) {
      const builder = {
        select() { return builder },
        eq() { return builder },
        is() { return builder },
        gt() { return builder },
        order() { return builder },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          resolve({ data: table === 'inviti' ? rows : [], error: null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return fake
}

describe('listInvitiPendenti', () => {
  it('nessun invito → array vuoto', async () => {
    const svc = createFakeSupabase([])
    const r = await listInvitiPendenti(svc, 'lab-1')
    expect(r).toEqual([])
  })

  it('restituisce gli inviti pendenti configurati', async () => {
    const rows = [
      { id: 'inv-1', email: 'a@b.it', ruolo: 'tecnico', created_at: '2026-07-01T00:00:00Z', expires_at: '2026-07-08T00:00:00Z' },
    ]
    const svc = createFakeSupabase(rows)
    const r = await listInvitiPendenti(svc, 'lab-1')
    expect(r).toEqual(rows)
  })

  it('data null dalla query → array vuoto, nessuna eccezione', async () => {
    const svc = createFakeSupabase(null)
    const r = await listInvitiPendenti(svc, 'lab-1')
    expect(r).toEqual([])
  })
})

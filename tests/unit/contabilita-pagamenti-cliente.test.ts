// tests/unit/contabilita-pagamenti-cliente.test.ts
// Ondata 3 — pagamenti del cliente per il portale (spec §4).
// pagamenti non ha cliente_id: doppio inner join fatture/lavori.
import { describe, it, expect } from 'vitest'
import { getPagamentiCliente } from '@/lib/contabilita/queries'

// Fake supabase: registra le select e i filtri eq/is (per "via", dato che la
// select determina fatture o lavori PRIMA che eq/is vengano incatenati);
// risolve con le fixture della "via" giusta in base alla select richiesta.
type Via = 'fatture' | 'lavori'
type Chiamata = [string, unknown]

function createFakeSupabase(data: {
  viaFatture?: Array<Record<string, unknown>>
  viaLavori?: Array<Record<string, unknown>>
  erroreFatture?: { message: string } | null
  erroreLavori?: { message: string } | null
}) {
  const selects: string[] = []
  const eqCalls: Record<Via, Chiamata[]> = { fatture: [], lavori: [] }
  const isCalls: Record<Via, Chiamata[]> = { fatture: [], lavori: [] }
  const fake = {
    from(table: string) {
      if (table !== 'pagamenti') throw new Error(`tabella inattesa: ${table}`)
      let via: Via | null = null
      const builder = {
        select(cols: string) {
          selects.push(cols)
          via = cols.includes('fatture!inner') ? 'fatture' : 'lavori'
          return builder
        },
        eq(col: string, val: unknown) {
          if (via) eqCalls[via].push([col, val])
          return builder
        },
        is(col: string, val: unknown) {
          if (via) isCalls[via].push([col, val])
          return builder
        },
        then(resolve: (v: { data: unknown; error: unknown }) => void) {
          if (via === 'fatture') resolve({ data: data.erroreFatture ? null : (data.viaFatture ?? []), error: data.erroreFatture ?? null })
          else resolve({ data: data.erroreLavori ? null : (data.viaLavori ?? []), error: data.erroreLavori ?? null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { fake, selects, eqCalls, isCalls }
}

describe('getPagamentiCliente', () => {
  it('unifica pagamenti su fatture e lavori, ordinati per data desc, con destinazione', async () => {
    const { fake } = createFakeSupabase({
      viaFatture: [
        { data_pagamento: '2026-03-10', importo: 300, metodo: 'bonifico', fatture: { numero: '2026-0001' } },
      ],
      viaLavori: [
        { data_pagamento: '2026-06-01', importo: 150, metodo: 'contanti', lavori: { numero_lavoro: '2026/0015' } },
        { data_pagamento: '2025-11-20', importo: 90, metodo: 'pos', lavori: { numero_lavoro: '2025/0102' } },
      ],
    })
    const r = await getPagamentiCliente(fake, 'lab-1', 'cli-1')
    expect(r).toEqual([
      { data: '2026-06-01', importo: 150, metodo: 'contanti', destinazione: { tipo: 'lavoro', numero: '2026/0015' } },
      { data: '2026-03-10', importo: 300, metodo: 'bonifico', destinazione: { tipo: 'fattura', numero: '2026-0001' } },
      { data: '2025-11-20', importo: 90, metodo: 'pos', destinazione: { tipo: 'lavoro', numero: '2025/0102' } },
    ])
  })

  it('non seleziona MAI metodo_nota (minimizzazione alla sorgente)', async () => {
    const { fake, selects } = createFakeSupabase({})
    await getPagamentiCliente(fake, 'lab-1', 'cli-1')
    expect(selects).toHaveLength(2)
    for (const s of selects) expect(s).not.toContain('metodo_nota')
  })

  it('applica i filtri di isolamento multi-tenant su ENTRAMBE le vie (fatture e lavori)', async () => {
    const { fake, eqCalls, isCalls } = createFakeSupabase({})
    await getPagamentiCliente(fake, 'lab-1', 'cli-1')

    for (const via of ['fatture', 'lavori'] as const) {
      // eq esatti attesi (indipendenti dall'ordine): laboratorio_id sui
      // pagamenti, stato attivo, e sulla via (fatture/lavori) cliente_id +
      // laboratorio_id — una regressione che rimuovesse anche solo uno di
      // questi filtri (es. l'isolamento multi-tenant) farebbe fallire questo
      // test.
      expect(eqCalls[via]).toHaveLength(4)
      expect(eqCalls[via]).toEqual(
        expect.arrayContaining([
          ['laboratorio_id', 'lab-1'],
          ['stato', 'attivo'],
          [`${via}.cliente_id`, 'cli-1'],
          [`${via}.laboratorio_id`, 'lab-1'],
        ])
      )
      expect(isCalls[via]).toEqual([[`${via}.deleted_at`, null]])
    }
  })

  it('errore sulla via fatture → throw (fail-closed, mai lista parziale)', async () => {
    const { fake } = createFakeSupabase({ erroreFatture: { message: 'boom' } })
    await expect(getPagamentiCliente(fake, 'lab-1', 'cli-1')).rejects.toThrow()
  })

  it('errore sulla via lavori → throw (fail-closed)', async () => {
    const { fake } = createFakeSupabase({ erroreLavori: { message: 'boom' } })
    await expect(getPagamentiCliente(fake, 'lab-1', 'cli-1')).rejects.toThrow()
  })

  it('liste vuote → array vuoto', async () => {
    const { fake } = createFakeSupabase({})
    expect(await getPagamentiCliente(fake, 'lab-1', 'cli-1')).toEqual([])
  })
})

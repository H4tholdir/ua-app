import { describe, it, expect } from 'vitest'
import { eseguiRegistrazionePagamento, type RegistraPagamentoInput } from '@/lib/contabilita/registra-pagamento'

interface FakeData {
  fatture?: Record<string, { id: string; totale: number; cliente_id: string }>
  lavori?: Record<string, { id: string; prezzo_unitario: number; cliente_id: string; lavorazioni?: Array<{ importo: number | null }> }>
  pagamentiAttivi?: Array<{ importo: number }>
  applicazioni?: Array<{ importo: number }>
  simulaErroreEccedenza?: boolean
}

function createFakeSupabase(data: FakeData) {
  const inserted = {
    pagamenti: [] as Record<string, unknown>[],
    credito_clienti_movimenti: [] as Record<string, unknown>[],
  }

  const fake = {
    _inserted: inserted,
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const builder = {
        select() { return builder },
        eq(col: string, val: unknown) { filters[col] = val; return builder },
        is() { return builder },
        single() {
          if (table === 'fatture') {
            const row = data.fatture?.[filters.id as string]
            return Promise.resolve({ data: row ?? null, error: row ? null : { message: 'not found' } })
          }
          if (table === 'lavori') {
            const row = data.lavori?.[filters.id as string]
            return Promise.resolve({ data: row ?? null, error: row ? null : { message: 'not found' } })
          }
          if (table === 'pagamenti') {
            const last = inserted.pagamenti[inserted.pagamenti.length - 1]
            return Promise.resolve({ data: last ?? null, error: null })
          }
          return Promise.resolve({ data: null, error: { message: `single non gestito per ${table}` } })
        },
        insert(row: Record<string, unknown>) {
          if (table === 'pagamenti') {
            const withId = { id: `pag-${inserted.pagamenti.length + 1}`, ...row }
            inserted.pagamenti.push(withId)
            return builder
          }
          if (table === 'credito_clienti_movimenti') {
            if (data.simulaErroreEccedenza) {
              return Promise.resolve({ data: null, error: { message: 'simulato' } })
            }
            inserted.credito_clienti_movimenti.push(row)
            return Promise.resolve({ data: row, error: null })
          }
          return Promise.resolve({ data: null, error: { message: `insert non gestito per ${table}` } })
        },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          if (table === 'pagamenti') {
            resolve({ data: data.pagamentiAttivi ?? [], error: null })
            return
          }
          if (table === 'credito_clienti_movimenti') {
            resolve({ data: data.applicazioni ?? [], error: null })
            return
          }
          resolve({ data: [], error: null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  return fake
}

function baseInput(overrides: Partial<RegistraPagamentoInput> = {}): RegistraPagamentoInput {
  return {
    laboratorio_id: 'lab-1',
    fattura_id: null,
    lavoro_id: null,
    importo: 100,
    metodo: 'contanti',
    metodo_nota: null,
    data_pagamento: '2026-07-02',
    registrato_da: 'user-1',
    sostituisce_pagamento_id: null,
    ...overrides,
  }
}

describe('eseguiRegistrazionePagamento', () => {
  it('pagamento pieno su fattura senza pagamenti precedenti → nessuna eccedenza', async () => {
    const supabase = createFakeSupabase({
      fatture: { 'fatt-1': { id: 'fatt-1', totale: 100, cliente_id: 'cli-1' } },
    })

    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', importo: 100 }))

    expect(r.ok).toBe(true)
    expect(r.eccedenza).toBe(0)
    expect(supabase._inserted.pagamenti).toHaveLength(1)
    expect(supabase._inserted.pagamenti[0]).toMatchObject({ fattura_id: 'fatt-1', lavoro_id: null, importo: 100 })
    expect(supabase._inserted.credito_clienti_movimenti).toHaveLength(0)
  })

  it('pagamento che supera il residuo → genera automaticamente un movimento eccedenza collegato al pagamento', async () => {
    const supabase = createFakeSupabase({
      fatture: { 'fatt-1': { id: 'fatt-1', totale: 100, cliente_id: 'cli-1' } },
      pagamentiAttivi: [{ importo: 60 }], // residuo pre-esistente = 40
    })

    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', importo: 70 }))

    expect(r.ok).toBe(true)
    expect(r.eccedenza).toBe(30)
    expect(supabase._inserted.credito_clienti_movimenti).toHaveLength(1)
    expect(supabase._inserted.credito_clienti_movimenti[0]).toMatchObject({
      tipo: 'eccedenza',
      cliente_id: 'cli-1',
      importo: 30,
      pagamento_id: 'pag-1',
    })
  })

  it('pagamento su lavoro diretto usa prezzo_unitario come dovuto, non tocca fatture', async () => {
    const supabase = createFakeSupabase({
      lavori: { 'lav-1': { id: 'lav-1', prezzo_unitario: 50, cliente_id: 'cli-2' } },
    })

    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ lavoro_id: 'lav-1', importo: 50 }))

    expect(r.ok).toBe(true)
    expect(r.eccedenza).toBe(0)
    expect(supabase._inserted.pagamenti[0]).toMatchObject({ fattura_id: null, lavoro_id: 'lav-1', importo: 50 })
  })

  it('pagamento su lavoro con righe lavorazione usa la somma delle righe come dovuto, non prezzo_unitario (N4)', async () => {
    const supabase = createFakeSupabase({
      lavori: {
        'lav-n4': {
          id: 'lav-n4',
          prezzo_unitario: 322,
          cliente_id: 'cli-3',
          lavorazioni: [{ importo: 112 }],
        },
      },
    })

    // dovuto reale = 112 (somma righe). Pagando 150, l'eccedenza attesa è
    // 150 - 112 = 38. Col vecchio codice (dovuto = prezzo_unitario = 322)
    // l'eccedenza sarebbe erroneamente 0 (150 - 322 < 0 → clamp).
    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ lavoro_id: 'lav-n4', importo: 150 }))

    expect(r.ok).toBe(true)
    expect(r.eccedenza).toBe(38)
    expect(supabase._inserted.credito_clienti_movimenti).toHaveLength(1)
    expect(supabase._inserted.credito_clienti_movimenti[0]).toMatchObject({
      tipo: 'eccedenza',
      cliente_id: 'cli-3',
      importo: 38,
    })
  })

  it('errore se non è specificato esattamente uno tra fattura_id e lavoro_id', async () => {
    const supabase = createFakeSupabase({})
    const nessuno = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: null, lavoro_id: null }))
    expect(nessuno.ok).toBe(false)
    expect(nessuno.errore).toMatch(/esattamente uno/)

    const entrambi = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', lavoro_id: 'lav-1' }))
    expect(entrambi.ok).toBe(false)
  })

  it('errore se importo non positivo', async () => {
    const supabase = createFakeSupabase({ fatture: { 'fatt-1': { id: 'fatt-1', totale: 100, cliente_id: 'cli-1' } } })
    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', importo: 0 }))
    expect(r.ok).toBe(false)
    expect(r.errore).toMatch(/positivo/)
  })

  it('fattura non trovata (cross-tenant o inesistente) → errore, nessun insert', async () => {
    const supabase = createFakeSupabase({ fatture: {} })
    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-inesistente' }))
    expect(r.ok).toBe(false)
    expect(r.errore).toBe('Fattura non trovata')
    expect(supabase._inserted.pagamenti).toHaveLength(0)
  })

  it('sostituisce_pagamento_id viene passato al nuovo pagamento quando presente', async () => {
    const supabase = createFakeSupabase({ fatture: { 'fatt-1': { id: 'fatt-1', totale: 100, cliente_id: 'cli-1' } } })
    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', importo: 100, sostituisce_pagamento_id: 'pag-vecchio' }))
    expect(r.ok).toBe(true)
    expect(supabase._inserted.pagamenti[0]).toMatchObject({ sostituisce_pagamento_id: 'pag-vecchio' })
  })

  it('se l\'insert dell\'eccedenza fallisce, il pagamento resta ok:true ma con avviso esplicito (non silenziato)', async () => {
    const supabase = createFakeSupabase({
      fatture: { 'fatt-1': { id: 'fatt-1', totale: 100, cliente_id: 'cli-1' } },
      pagamentiAttivi: [{ importo: 60 }], // residuo pre-esistente = 40
      simulaErroreEccedenza: true,
    })

    const r = await eseguiRegistrazionePagamento(supabase, baseInput({ fattura_id: 'fatt-1', importo: 70 }))

    expect(r.ok).toBe(true)
    expect(r.eccedenza).toBe(30)
    expect(r.avviso).toBeDefined()
    expect(r.avviso).toMatch(/riconciliazione manuale/)
    expect(supabase._inserted.pagamenti).toHaveLength(1)
    expect(supabase._inserted.credito_clienti_movimenti).toHaveLength(0)
  })
})

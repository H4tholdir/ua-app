import { describe, it, expect } from 'vitest'
import { getContabilitaCliente } from '@/lib/contabilita/queries'

function createFakeSupabase(data: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fatture?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lavori?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movimenti?: any[]
  // Iniezione errori per tabella (fail-closed: la lettura deve fallire,
  // mai risolvere in lista vuota silenziosa).
  errori?: {
    fatture?: { message: string }
    lavori?: { message: string }
    movimenti?: { message: string }
  }
}) {
  const fake = {
    from(table: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows: any[] =
        table === 'fatture' ? (data.fatture ?? []) :
        table === 'lavori' ? (data.lavori ?? []) :
        table === 'credito_clienti_movimenti' ? (data.movimenti ?? []) :
        []
      const errore =
        table === 'fatture' ? (data.errori?.fatture ?? null) :
        table === 'lavori' ? (data.errori?.lavori ?? null) :
        table === 'credito_clienti_movimenti' ? (data.errori?.movimenti ?? null) :
        null
      const builder = {
        select() { return builder },
        eq() { return builder },
        // A differenza degli altri filtri (no-op in questo fake — si assume che
        // la fixture rappresenti già i dati filtrati da Postgres), `neq` filtra
        // davvero: serve a testare la regressione del filtro `stato_sdi != 'draft'`
        // senza dover simulare l'intero query planner.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        neq(column: string, value: any) {
          rows = rows.filter((r) => r[column] !== value)
          return builder
        },
        is() { return builder },
        not() { return builder },
        gt() { return builder },
        order() { return builder },
        then(resolve: (v: { data: unknown; error: { message: string } | null }) => void) {
          if (errore) resolve({ data: null, error: errore })
          else resolve({ data: rows, error: null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  return fake
}

const DATA_LONTANA = '2020-01-01'

describe('getContabilitaCliente', () => {
  it('lavoro in_attesa entra in lavoriInAttesa e nel bucket potenziale, non nei dovuti', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0001', prezzo_unitario: 200, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'in_attesa', incluso_in_fattura: false, pagamenti: [], credito_clienti_movimenti: [],
        proposta_dentista: null, proposta_at: null,
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(0)
    expect(r.lavoriInAttesa).toHaveLength(1)
    expect(r.lavoriInAttesa[0]).toMatchObject({ proposta_dentista: null, proposta_at: null })
    expect(r.creditoCliente.potenziale).toBe(200)
    expect(r.creditoCliente.confermato).toBe(0)
  })

  // Task 14 (Ondata 1, D3): la proposta del dentista deve propagarsi intatta
  // fino al bucket lavoriInAttesa, per essere mostrata sulla riga scadenzario.
  it('lavoro in_attesa con proposta del dentista propaga proposta_dentista/proposta_at', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l2', numero_lavoro: '2026/0002', prezzo_unitario: 180, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'in_attesa', incluso_in_fattura: false, pagamenti: [], credito_clienti_movimenti: [],
        proposta_dentista: 'fatturare', proposta_at: '2026-07-02T14:30:00.000+00:00',
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.lavoriInAttesa).toHaveLength(1)
    expect(r.lavoriInAttesa[0]).toMatchObject({
      proposta_dentista: 'fatturare',
      proposta_at: '2026-07-02T14:30:00.000+00:00',
    })
  })

  it('lavoro fatturare con incluso_in_fattura=true è escluso ovunque (già confluito nella fattura)', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0002', prezzo_unitario: 150, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'fatturare', incluso_in_fattura: true, pagamenti: [], credito_clienti_movimenti: [],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(0)
    expect(r.lavoriInAttesa).toHaveLength(0)
    expect(r.creditoCliente.confermato).toBe(0)
  })

  it('lavoro non_fatturare non saldato entra nei dovuti (origine lavoro_diretto) e nel confermato', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0003', prezzo_unitario: 90, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'non_fatturare', incluso_in_fattura: false,
        pagamenti: [{ importo: 30, stato: 'attivo' }], credito_clienti_movimenti: [],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(1)
    expect(r.dovuti[0]).toMatchObject({ origine: 'lavoro_diretto', residuo: 60 })
    expect(r.creditoCliente.confermato).toBe(60)
  })

  it('fattura non pagata entra nei dovuti con residuo netto da importo_pagato', async () => {
    const supabase = createFakeSupabase({
      fatture: [{ id: 'f1', numero: '2026-0010', data: DATA_LONTANA, totale: 100, importo_pagato: 40, stato_sdi: 'accettata', pagata: false }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(1)
    expect(r.dovuti[0]).toMatchObject({ origine: 'fattura', residuo: 60, pagata: false })
  })

  it('credito disponibile riflette i movimenti del cliente (via fetchMovimentiCreditoValidi, Task 9)', async () => {
    const supabase = createFakeSupabase({
      movimenti: [
        { tipo: 'eccedenza', importo: 50, pagamento_id: 'p1', pagamenti: { stato: 'attivo' } },
        { tipo: 'applicazione', importo: 20, pagamento_id: null, pagamenti: null },
      ],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.creditoCliente.disponibile).toBe(30)
  })

  // Regressione (finding review finale whole-branch, dopo Task 16): una fattura
  // bozza (stato_sdi='draft', mai inviata) non è un dovuto reale — deve essere
  // esclusa da `dovuti` e non contribuire a `creditoCliente.confermato`, come già
  // avviene in getCreditoScadutoPerCliente (Task 9) e /api/scadenzario (Task 11).
  it('fattura in stato draft è esclusa da dovuti e da creditoCliente.confermato', async () => {
    const supabase = createFakeSupabase({
      fatture: [
        { id: 'f1', numero: '2026-0020', data: DATA_LONTANA, totale: 500, importo_pagato: 0, stato_sdi: 'draft', pagata: false },
        { id: 'f2', numero: '2026-0021', data: DATA_LONTANA, totale: 100, importo_pagato: 0, stato_sdi: 'accettata', pagata: false },
      ],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(1)
    expect(r.dovuti[0]).toMatchObject({ id: 'f2', origine: 'fattura', residuo: 100 })
    expect(r.creditoCliente.confermato).toBe(100)
  })
})

// Follow-up Ondata 3 (finding review finale whole-branch): le letture di
// getContabilitaCliente devono essere fail-closed — un errore DB transitorio
// NON deve risolversi in lista vuota silenziosa (saldo mostrato più basso
// del reale, su scadenzario lab E portale dentista insieme).
describe('getContabilitaCliente — fail-closed sugli errori di lettura', () => {
  it('errore sulla query fatture → throw (mai saldo parziale)', async () => {
    const supabase = createFakeSupabase({ errori: { fatture: { message: 'boom-fatture' } } })
    await expect(getContabilitaCliente(supabase, 'lab-1', 'cli-1')).rejects.toThrow(/fatture/)
  })

  it('errore sulla query lavori → throw (mai saldo parziale)', async () => {
    const supabase = createFakeSupabase({ errori: { lavori: { message: 'boom-lavori' } } })
    await expect(getContabilitaCliente(supabase, 'lab-1', 'cli-1')).rejects.toThrow(/lavori/)
  })

  it('errore sulla query movimenti credito → throw (mai credito parziale)', async () => {
    const supabase = createFakeSupabase({ errori: { movimenti: { message: 'boom-movimenti' } } })
    await expect(getContabilitaCliente(supabase, 'lab-1', 'cli-1')).rejects.toThrow(/movimenti/)
  })
})

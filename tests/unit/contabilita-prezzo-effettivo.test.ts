import { describe, it, expect } from 'vitest'
import { getContabilitaCliente, getCreditoScadutoPerCliente } from '@/lib/contabilita/queries'

// Mock harness modellato su tests/unit/contabilita-cliente-query.test.ts e
// tests/unit/contabilita-queries.test.ts: `from(table)` risolve le righe già
// "filtrate" dalla fixture (i filtri PostgREST sono no-op qui, tranne `neq`
// che serve altrove) — le righe includono `lavorazioni` per esercitare
// SELECT_FRAGMENT_PREZZO.
function createFakeSupabase(data: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fatture?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lavori?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movimenti?: any[]
}) {
  const fake = {
    from(table: string) {
      const builder = {
        select() { return builder },
        eq() { return builder },
        neq() { return builder },
        is() { return builder },
        not() { return builder },
        in() { return builder },
        lt() { return builder },
        gt() { return builder },
        order() { return builder },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          if (table === 'fatture') { resolve({ data: data.fatture ?? [], error: null }); return }
          if (table === 'lavori') { resolve({ data: data.lavori ?? [], error: null }); return }
          if (table === 'credito_clienti_movimenti') { resolve({ data: data.movimenti ?? [], error: null }); return }
          resolve({ data: [], error: null })
        },
      }
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  return fake
}

const CLIENTE_1 = { id: 'cli-1', nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi', telefono: '333' }
const DATA_LONTANA = '2020-01-01' // sempre > 30gg fa

describe('getContabilitaCliente — prezzo effettivo unico (regressione 322/112 + completezza)', () => {
  it('lavoro con righe [100,12] e prezzo_unitario 322 → residuo/totale = 112, NON 322', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0001', prezzo_unitario: 322, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'non_fatturare', incluso_in_fattura: false,
        pagamenti: [], credito_clienti_movimenti: [],
        lavorazioni: [{ importo: 100 }, { importo: 12 }],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(1)
    expect(r.dovuti[0]).toMatchObject({ origine: 'lavoro_diretto', totale: 112, residuo: 112 })
    expect(r.creditoCliente.confermato).toBe(112)
  })

  it('lavoro con prezzo_unitario=0 e righe [80] compare comunque nei dovuti con residuo 80 (completezza)', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0002', prezzo_unitario: 0, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'non_fatturare', incluso_in_fattura: false,
        pagamenti: [], credito_clienti_movimenti: [],
        lavorazioni: [{ importo: 80 }],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(1)
    expect(r.dovuti[0]).toMatchObject({ origine: 'lavoro_diretto', totale: 80, residuo: 80 })
  })

  it('lavoro con prezzo_unitario=null e righe [80] compare comunque (null equivalente a 0)', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0003', prezzo_unitario: null, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'non_fatturare', incluso_in_fattura: false,
        pagamenti: [], credito_clienti_movimenti: [],
        lavorazioni: [{ importo: 80 }],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(1)
    expect(r.dovuti[0]).toMatchObject({ totale: 80, residuo: 80 })
  })

  it('lavoro in_attesa con prezzo_unitario=0 e righe [80] compare in lavoriInAttesa con residuo/prezzo 80', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0004', prezzo_unitario: 0, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'in_attesa', incluso_in_fattura: false,
        pagamenti: [], credito_clienti_movimenti: [],
        proposta_dentista: null, proposta_at: null,
        lavorazioni: [{ importo: 80 }],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.lavoriInAttesa).toHaveLength(1)
    expect(r.lavoriInAttesa[0]).toMatchObject({ prezzo_unitario: 80 })
    expect(r.creditoCliente.potenziale).toBe(80)
  })

  it('lavoro in_attesa a totale 0 (né righe né prezzo_unitario) resta escluso (comportamento preesistente)', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0005', prezzo_unitario: 0, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'in_attesa', incluso_in_fattura: false,
        pagamenti: [], credito_clienti_movimenti: [],
        proposta_dentista: null, proposta_at: null,
        lavorazioni: [],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.lavoriInAttesa).toHaveLength(0)
    expect(r.creditoCliente.potenziale).toBe(0)
  })

  it('lavoro confermato a totale 0 (né righe né prezzo_unitario) resta escluso dai dovuti (comportamento preesistente)', async () => {
    const supabase = createFakeSupabase({
      lavori: [{
        id: 'l1', numero_lavoro: '2026/0006', prezzo_unitario: 0, data_consegna_prevista: DATA_LONTANA,
        decisione_fatturazione: 'non_fatturare', incluso_in_fattura: false,
        pagamenti: [], credito_clienti_movimenti: [],
        lavorazioni: [],
      }],
    })
    const r = await getContabilitaCliente(supabase, 'lab-1', 'cli-1')
    expect(r.dovuti).toHaveLength(0)
  })
})

describe('getCreditoScadutoPerCliente — prezzo effettivo unico (regressione 322/112 + completezza)', () => {
  it('lavoro con righe [100,12] e prezzo_unitario 322 → credito residuo 112, NON 322', async () => {
    const supabase = createFakeSupabase({
      fatture: [],
      lavori: [{
        id: 'l1', prezzo_unitario: 322, data_consegna_prevista: DATA_LONTANA,
        clienti: CLIENTE_1, pagamenti: [], credito_clienti_movimenti: [],
        lavorazioni: [{ importo: 100 }, { importo: 12 }],
      }],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(1)
    expect(r[0].residuo_totale).toBe(112)
  })

  it('lavoro con prezzo_unitario=0 e righe [80] compare comunque (completezza)', async () => {
    const supabase = createFakeSupabase({
      fatture: [],
      lavori: [{
        id: 'l1', prezzo_unitario: 0, data_consegna_prevista: DATA_LONTANA,
        clienti: CLIENTE_1, pagamenti: [], credito_clienti_movimenti: [],
        lavorazioni: [{ importo: 80 }],
      }],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(1)
    expect(r[0].residuo_totale).toBe(80)
  })

  it('lavoro a totale 0 (né righe né prezzo_unitario) resta escluso (comportamento preesistente)', async () => {
    const supabase = createFakeSupabase({
      fatture: [],
      lavori: [{
        id: 'l1', prezzo_unitario: 0, data_consegna_prevista: DATA_LONTANA,
        clienti: CLIENTE_1, pagamenti: [], credito_clienti_movimenti: [],
        lavorazioni: [],
      }],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(0)
  })
})

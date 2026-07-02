import { describe, it, expect } from 'vitest'
import { getCreditoScadutoPerCliente, fetchMovimentiCreditoValidi } from '@/lib/contabilita/queries'

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

describe('getCreditoScadutoPerCliente — unifica fatture + lavori diretti scaduti per cliente', () => {
  it('fattura non pagata scaduta con residuo positivo → inclusa', async () => {
    const supabase = createFakeSupabase({
      fatture: [{ id: 'f1', totale: 100, importo_pagato: 40, data: DATA_LONTANA, clienti: CLIENTE_1 }],
      lavori: [],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ cliente_id: 'cli-1', residuo_totale: 60, lavori_count: 1 })
  })

  it('fattura con importo_pagato pari al totale (residuo zero) → esclusa', async () => {
    const supabase = createFakeSupabase({
      fatture: [{ id: 'f1', totale: 100, importo_pagato: 100, data: DATA_LONTANA, clienti: CLIENTE_1 }],
      lavori: [],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(0)
  })

  it('lavoro diretto scaduto con pagamento parziale → residuo netto incluso', async () => {
    const supabase = createFakeSupabase({
      fatture: [],
      lavori: [{
        id: 'l1',
        prezzo_unitario: 80,
        data_consegna_prevista: DATA_LONTANA,
        clienti: CLIENTE_1,
        pagamenti: [{ importo: 30, stato: 'attivo' }, { importo: 20, stato: 'annullato' }],
        credito_clienti_movimenti: [],
      }],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(1)
    // il pagamento annullato (stato != 'attivo') non riduce il residuo
    expect(r[0].residuo_totale).toBe(50)
    expect(r[0].giorni_scaduto).toBeGreaterThan(30)
  })

  it('fattura e lavoro diretto dello stesso cliente si sommano in una riga sola', async () => {
    const supabase = createFakeSupabase({
      fatture: [{ id: 'f1', totale: 100, importo_pagato: 0, data: DATA_LONTANA, clienti: CLIENTE_1 }],
      lavori: [{
        id: 'l1', prezzo_unitario: 50, data_consegna_prevista: DATA_LONTANA,
        clienti: CLIENTE_1, pagamenti: [], credito_clienti_movimenti: [],
      }],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r).toHaveLength(1)
    expect(r[0].residuo_totale).toBe(150)
    expect(r[0].lavori_count).toBe(2)
  })

  it('ordina per residuo_totale decrescente', async () => {
    const CLIENTE_2 = { id: 'cli-2', nome: 'Luca', cognome: 'Bianchi', studio_nome: null, telefono: null }
    const supabase = createFakeSupabase({
      fatture: [
        { id: 'f1', totale: 30, importo_pagato: 0, data: DATA_LONTANA, clienti: CLIENTE_1 },
        { id: 'f2', totale: 200, importo_pagato: 0, data: DATA_LONTANA, clienti: CLIENTE_2 },
      ],
      lavori: [],
    })
    const r = await getCreditoScadutoPerCliente(supabase, 'lab-1')
    expect(r.map((x) => x.cliente_id)).toEqual(['cli-2', 'cli-1'])
  })
})

describe('fetchMovimentiCreditoValidi — scarta eccedenze il cui pagamento sorgente non è più attivo', () => {
  it('eccedenza con pagamento ancora attivo → inclusa', async () => {
    const supabase = createFakeSupabase({
      movimenti: [{ tipo: 'eccedenza', importo: 30, pagamento_id: 'p1', pagamenti: { stato: 'attivo' } }],
    })
    const r = await fetchMovimentiCreditoValidi(supabase, 'lab-1', 'cli-1')
    expect(r).toEqual([{ tipo: 'eccedenza', importo: 30 }])
  })

  it('eccedenza il cui pagamento è stato annullato → esclusa (anti-credito-fantasma)', async () => {
    const supabase = createFakeSupabase({
      movimenti: [{ tipo: 'eccedenza', importo: 30, pagamento_id: 'p1', pagamenti: { stato: 'annullato' } }],
    })
    const r = await fetchMovimentiCreditoValidi(supabase, 'lab-1', 'cli-1')
    expect(r).toEqual([])
  })

  it('applicazione e rimborso sono sempre inclusi (non dipendono da un pagamento)', async () => {
    const supabase = createFakeSupabase({
      movimenti: [
        { tipo: 'applicazione', importo: 10, pagamento_id: null, pagamenti: null },
        { tipo: 'rimborso', importo: 5, pagamento_id: null, pagamenti: null },
      ],
    })
    const r = await fetchMovimentiCreditoValidi(supabase, 'lab-1', 'cli-1')
    expect(r).toEqual([{ tipo: 'applicazione', importo: 10 }, { tipo: 'rimborso', importo: 5 }])
  })
})

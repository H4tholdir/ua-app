import { describe, it, expect } from 'vitest'
import { calcolaCreditoDisponibile } from '@/lib/contabilita/saldo'
import { fetchMovimentiCreditoValidi } from '@/lib/contabilita/queries'

// Task 4 (Nota di Credito TD04): il credito generato dallo storno di una
// fattura pagata è un movimento DEDICATO tipo 'storno' — NON un'eccedenza —
// senza alcuna dipendenza da pagamento_id (spec 2026-07-14 §credito).

describe('credito da storno (nota di credito)', () => {
  it('un movimento storno aumenta il credito disponibile', () => {
    expect(calcolaCreditoDisponibile([{ tipo: 'storno', importo: 122 }])).toBe(122)
  })

  it('storno si somma a eccedenze, al netto di applicazioni e rimborsi', () => {
    expect(calcolaCreditoDisponibile([
      { tipo: 'eccedenza', importo: 10 },
      { tipo: 'storno', importo: 122 },
      { tipo: 'applicazione', importo: 20 },
      { tipo: 'rimborso', importo: 5 },
    ])).toBe(107) // 10 + 122 - 20 - 5
  })

  it('arrotonda a 2 decimali (drift float)', () => {
    expect(calcolaCreditoDisponibile([
      { tipo: 'storno', importo: 0.1 },
      { tipo: 'storno', importo: 0.2 },
    ])).toBe(0.3)
  })
})

// Stesso fake minimale di contabilita-queries.test.ts: il filtro anti-credito-
// fantasma gatea SOLO 'eccedenza' sul pagamento attivo — 'storno' passa sempre.
function createFakeSupabase(movimenti: unknown[]) {
  const builder = {
    select() { return builder },
    eq() { return builder },
    then(resolve: (v: { data: unknown; error: null }) => void) {
      resolve({ data: movimenti, error: null })
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: () => builder } as any
}

describe('fetchMovimentiCreditoValidi — storno non è gateato sul pagamento', () => {
  it('storno senza pagamento (pagamento_id null) → sempre incluso', async () => {
    const supabase = createFakeSupabase([
      { tipo: 'storno', importo: 122, pagamento_id: null, pagamenti: null },
      { tipo: 'eccedenza', importo: 30, pagamento_id: 'p1', pagamenti: { stato: 'annullato' } },
    ])
    const r = await fetchMovimentiCreditoValidi(supabase, 'lab-1', 'cli-1')
    // l'eccedenza fantasma cade, lo storno resta
    expect(r).toEqual([{ tipo: 'storno', importo: 122 }])
  })
})

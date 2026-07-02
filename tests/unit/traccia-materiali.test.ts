// tests/unit/traccia-materiali.test.ts
import { describe, it, expect } from 'vitest'
import { tracciaMaterialiLavoro } from '@/lib/consegna/traccia-materiali'
import type { LavoroDettaglio } from '@/types/domain'

type FakeMagazzino = { nome: string; produttore: string | null; traccia_lotto: boolean }
type FakeLotto = { id: string; numero_lotto: string; quantita_residua: number; data_scadenza: string | null; data_acquisto: string | null }
type FakeBomRow = { magazzino_id: string; quantita_per_unita: number; unita_misura: string }

interface FakeData {
  bom: Record<string, FakeBomRow[]>
  magazzino: Record<string, FakeMagazzino>
  lotti: Record<string, FakeLotto[]>
}

function createFakeSupabase(data: FakeData) {
  const inserted = {
    lavori_materiali: [] as Record<string, unknown>[],
    scarichi_magazzino: [] as Record<string, unknown>[],
  }
  const rpcCalls: Array<{ name: string; args: unknown }> = []

  const fake = {
    _inserted: inserted,
    _rpcCalls: rpcCalls,
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const builder = {
        select() { return builder },
        eq(col: string, val: unknown) { filters[col] = val; return builder },
        gt() { return builder },
        single() {
          if (table === 'magazzino') {
            const row = data.magazzino[filters.id as string]
            return Promise.resolve({ data: row ?? null, error: row ? null : { message: 'not found' } })
          }
          return Promise.resolve({ data: null, error: { message: `single non gestito per ${table}` } })
        },
        insert(row: Record<string, unknown>) {
          if (table === 'lavori_materiali') {
            const withId = { id: `mat-${inserted.lavori_materiali.length + 1}`, ...row }
            inserted.lavori_materiali.push(withId)
            return { select: () => ({ single: () => Promise.resolve({ data: withId, error: null }) }) }
          }
          if (table === 'scarichi_magazzino') {
            inserted.scarichi_magazzino.push(row)
            return Promise.resolve({ data: row, error: null })
          }
          return Promise.resolve({ data: null, error: { message: `insert non gestito per ${table}` } })
        },
        then(resolve: (v: { data: unknown; error: null }) => void) {
          if (table === 'listino_materiali_auto') {
            resolve({ data: data.bom[filters.listino_id as string] ?? [], error: null })
            return
          }
          if (table === 'lotti_magazzino') {
            resolve({ data: data.lotti[filters.magazzino_id as string] ?? [], error: null })
            return
          }
          resolve({ data: [], error: null })
        },
      }
      return builder
    },
    rpc(name: string, args: unknown) {
      rpcCalls.push({ name, args })
      return Promise.resolve({ data: null, error: null })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  return fake
}

function lavoroFixture(overrides: Partial<LavoroDettaglio> = {}): LavoroDettaglio {
  return {
    id: 'lav-1',
    materiali: [],
    lavorazioni: [
      {
        id: 'lin-1',
        laboratorio_id: 'lab-1',
        lavoro_id: 'lav-1',
        listino_id: 'list-1',
        codice: 'COD1',
        descrizione: 'Corona ceramica',
        quantita: 2,
        unita_misura: 'pz',
        prezzo_unitario: 100,
        sconto_percentuale: 0,
        maggiorazione: 0,
        importo: 200,
        calo: null,
        codice_iva: '22',
        natura_iva: '',
        esterna: false,
        lab_esterno: null,
        ordine: 1,
      },
    ],
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as LavoroDettaglio
}

describe('tracciaMaterialiLavoro', () => {
  it('materiale MDR-rilevante con lotto disponibile → insert in lavori_materiali, nessun flag', async () => {
    const supabase = createFakeSupabase({
      bom: { 'list-1': [{ magazzino_id: 'mag-1', quantita_per_unita: 1, unita_misura: 'g' }] },
      magazzino: { 'mag-1': { nome: 'Zirconia', produttore: 'Vita', traccia_lotto: true } },
      lotti: { 'mag-1': [{ id: 'lot-1', numero_lotto: 'LOT-A', quantita_residua: 50, data_scadenza: '2027-01-01', data_acquisto: '2026-01-01' }] },
    })

    const risultato = await tracciaMaterialiLavoro(supabase, lavoroFixture(), 'lab-1')

    expect(risultato.tracciabilitaOk).toBe(true)
    expect(risultato.dettaglio).toEqual([])
    expect(supabase._inserted.lavori_materiali).toHaveLength(1)
    expect(supabase._inserted.lavori_materiali[0]).toMatchObject({
      lavoro_id: 'lav-1',
      magazzino_id: 'mag-1',
      lotto_id: 'lot-1',
      quantita_usata: 2,
      numero_lotto_snapshot: 'LOT-A',
      nome_materiale_snapshot: 'Zirconia',
      produttore_snapshot: 'Vita',
    })
  })

  it('materiale MDR-rilevante senza lotti disponibili → flag lotto_assente, nessun insert', async () => {
    const supabase = createFakeSupabase({
      bom: { 'list-1': [{ magazzino_id: 'mag-1', quantita_per_unita: 1, unita_misura: 'g' }] },
      magazzino: { 'mag-1': { nome: 'Zirconia', produttore: 'Vita', traccia_lotto: true } },
      lotti: { 'mag-1': [] },
    })

    const risultato = await tracciaMaterialiLavoro(supabase, lavoroFixture(), 'lab-1')

    expect(risultato.tracciabilitaOk).toBe(false)
    expect(risultato.dettaglio).toEqual([{ magazzino_id: 'mag-1', nome_materiale: 'Zirconia', motivo: 'lotto_assente' }])
    expect(supabase._inserted.lavori_materiali).toHaveLength(0)
  })

  it('lavorazione senza BOM definita → flag bom_mancante', async () => {
    const supabase = createFakeSupabase({ bom: {}, magazzino: {}, lotti: {} })

    const risultato = await tracciaMaterialiLavoro(supabase, lavoroFixture(), 'lab-1')

    expect(risultato.tracciabilitaOk).toBe(false)
    expect(risultato.dettaglio).toEqual([{ magazzino_id: null, nome_materiale: 'Corona ceramica', motivo: 'bom_mancante' }])
  })

  it('materiale con traccia_lotto=false → nessun flag, decremento via scarichi_magazzino + RPC', async () => {
    const supabase = createFakeSupabase({
      bom: { 'list-1': [{ magazzino_id: 'mag-2', quantita_per_unita: 1, unita_misura: 'pz' }] },
      magazzino: { 'mag-2': { nome: 'Guanti monouso', produttore: null, traccia_lotto: false } },
      lotti: {},
    })

    const risultato = await tracciaMaterialiLavoro(supabase, lavoroFixture(), 'lab-1')

    expect(risultato.tracciabilitaOk).toBe(true)
    expect(risultato.dettaglio).toEqual([])
    expect(supabase._inserted.lavori_materiali).toHaveLength(0)
    expect(supabase._inserted.scarichi_magazzino).toHaveLength(1)
    expect(supabase._rpcCalls).toEqual([{ name: 'decrementa_scorta', args: { p_magazzino_id: 'mag-2', p_laboratorio_id: 'lab-1', p_quantita: 2 } }])
  })

  it('idempotenza: se il magazzino_id è già tracciato in lavoro.materiali, salta senza reinserire', async () => {
    const supabase = createFakeSupabase({
      bom: { 'list-1': [{ magazzino_id: 'mag-1', quantita_per_unita: 1, unita_misura: 'g' }] },
      magazzino: { 'mag-1': { nome: 'Zirconia', produttore: 'Vita', traccia_lotto: true } },
      lotti: { 'mag-1': [{ id: 'lot-1', numero_lotto: 'LOT-A', quantita_residua: 50, data_scadenza: '2027-01-01', data_acquisto: '2026-01-01' }] },
    })

    const lavoroConMaterialeEsistente = lavoroFixture({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      materiali: [{ id: 'mat-esistente', magazzino_id: 'mag-1' } as any],
    })

    const risultato = await tracciaMaterialiLavoro(supabase, lavoroConMaterialeEsistente, 'lab-1')

    expect(supabase._inserted.lavori_materiali).toHaveLength(0)
    expect(risultato.materialiTracciati).toHaveLength(1)
  })
})

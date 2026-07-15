import { describe, it, expect } from 'vitest'
import {
  mapTitolareKpiRow,
  mapTecnicoLavoriRows,
  mapFrontDeskConsegneRows,
  isCacheStale,
  getTrendMensile,
} from '@/lib/dashboard/queries'

describe('mapTitolareKpiRow', () => {
  it('fallback su valori mancanti', () => {
    const result = mapTitolareKpiRow(null)
    expect(result.lavori_in_ritardo).toBe(0)
    expect(result.fatturato_mese).toBe(0)
    expect(result.fatturato_mese_precedente).toBe(0)
    expect(result.pagamenti_scaduti_totale).toBe(0)
    expect(result.materiali_esaurimento_count).toBe(0)
  })

  it('mappa correttamente una riga cache completa', () => {
    const row = {
      laboratorio_id: 'lab-001',
      consegne_oggi: 5,
      lavori_in_ritardo: 2,
      pronti_non_fatturati: 3,
      mdr_incompleti: 1,
      spedizioni_in_ritardo: 0,
      is_rifacimento_count: 1,
      stl_non_assegnati: 0,
      lavori_attivi: 12,
      fatturato_mese: '11500.00',
      fatturato_mese_precedente: '9800.00',
      pagamenti_scaduti_totale: '4820.00',
      pagamenti_scaduti_clienti_count: 3,
      materiali_esaurimento_count: 2,
      in_prova_count: 2,
      tecnico_saturo_id: null,
      tecnico_saturo_count: 0,
      aggiornato_at: new Date().toISOString(),
    }
    const result = mapTitolareKpiRow(row)
    expect(result.fatturato_mese).toBe(11500)
    expect(result.fatturato_mese_precedente).toBe(9800)
    expect(result.pagamenti_scaduti_totale).toBe(4820)
    expect(result.materiali_esaurimento_count).toBe(2)
    expect(result.consegne_oggi).toBe(5)
  })
})

describe('mapTecnicoLavoriRows', () => {
  it('restituisce array vuoto su input null', () => {
    expect(mapTecnicoLavoriRows(null)).toEqual([])
  })

  it('ordina urgenti prima degli altri', () => {
    const rows = [
      {
        id: '1', numero_lavoro: '0041', stato: 'in_lavorazione' as const,
        priorita: 'normale' as const, tipo_dispositivo: 'protesi_fissa' as const,
        descrizione: 'Corona', data_consegna_prevista: '2026-05-20',
        ora_consegna: null, paziente_nome_snapshot: null,
        clienti: { nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' },
      },
      {
        id: '2', numero_lavoro: '0028', stato: 'in_ritardo' as const,
        priorita: 'urgente' as const, tipo_dispositivo: 'scheletrato' as const,
        descrizione: 'Scheletrato', data_consegna_prevista: '2026-05-14',
        ora_consegna: null, paziente_nome_snapshot: null,
        clienti: { nome: 'Luca', cognome: 'Bianchi', studio_nome: null },
      },
    ]
    const result = mapTecnicoLavoriRows(rows)
    expect(result[0].id).toBe('2')
    expect(result[1].id).toBe('1')
  })
})

describe('mapFrontDeskConsegneRows', () => {
  it('restituisce array vuoto su input null', () => {
    expect(mapFrontDeskConsegneRows(null)).toEqual([])
  })

  it('formatta ora_consegna correttamente', () => {
    const rows = [
      {
        id: '1', numero_lavoro: '0041', stato: 'pronto' as const,
        priorita: 'normale' as const, tipo_dispositivo: 'protesi_fissa' as const,
        descrizione: 'Corona', data_consegna_prevista: '2026-05-15',
        ora_consegna: '09:30', paziente_nome_snapshot: 'Luigi Verdi',
        clienti: { nome: 'Carlo', cognome: 'Rossi', studio_nome: 'Studio Rossi', telefono: null },
      },
    ]
    const result = mapFrontDeskConsegneRows(rows)
    expect(result[0].ora_consegna).toBe('09:30')
    expect(result[0].cliente_display).toBe('Studio Rossi')
  })
})

// Task 5 (audit letture storno TD04, Gruppo B): il trend mensile NON filtra
// stornata_at (la fattura originale resta nel suo mese) ma sottrae il TD04
// nel mese in cui è stato emesso — l'originale e la nota di credito possono
// cadere in mesi diversi.
describe('getTrendMensile', () => {
  function fakeSupabase(rowsIn: Array<{ data: string; totale: number; tipo_documento: string; stornata_at?: string | null }>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: any[] = rowsIn
    const builder = {
      select() { return builder },
      eq() { return builder },
      gte() { return builder },
      not() { return builder },
      order() { return builder },
      // Real filter (non no-op): garantisce che, se una futura regressione
      // aggiungesse `.is('stornata_at', null)` qui (il predicato del
      // Gruppo A, vietato nel Gruppo B), il test sotto lo intercetti.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      is(column: string, value: any) {
        rows = rows.filter((r) => (r[column] ?? null) === value)
        return builder
      },
      then(resolve: (v: { data: unknown; error: null }) => void) {
        resolve({ data: rows, error: null })
      },
    }
    return { from: () => builder } as unknown as Parameters<typeof getTrendMensile>[0]
  }

  it('sottrae il totale del TD04 dal mese di emissione', async () => {
    const svc = fakeSupabase([
      { data: '2026-07-05', totale: 1000, tipo_documento: 'TD01' },
      { data: '2026-07-10', totale: 200, tipo_documento: 'TD04' },
    ])
    const result = await getTrendMensile(svc, 'lab-1', 1)
    expect(result).toHaveLength(1)
    expect(result[0].month).toBe('2026-07')
    expect(result[0].totale).toBe(800)
  })

  it('la TD01 stornata resta nel suo mese di emissione (Gruppo B: mai filtrare stornata_at)', async () => {
    const svc = fakeSupabase([
      // stornata_at valorizzato: se la query filtrasse stornata_at IS NULL
      // (come nel Gruppo A), questa riga sparirebbe e il totale sarebbe -500
      // invece di 0 — la regressione che il Gruppo B vieta esplicitamente.
      { data: '2026-07-01', totale: 500, tipo_documento: 'TD01', stornata_at: '2026-07-20T10:00:00.000Z' },
      { data: '2026-07-20', totale: 500, tipo_documento: 'TD04' },
    ])
    const result = await getTrendMensile(svc, 'lab-1', 1)
    // Stesso mese solare: la TD01 (+500) e il TD04 (-500) si compensano
    // nell'unico bucket mensile — l'originale non è mai stato filtrato via.
    expect(result).toHaveLength(1)
    expect(result[0].totale).toBe(0)
  })

  it('originale e TD04 in mesi diversi: ognuno pesa sul proprio mese', async () => {
    const svc = fakeSupabase([
      { data: '2026-06-15', totale: 900, tipo_documento: 'TD01' },
      { data: '2026-07-03', totale: 900, tipo_documento: 'TD04' },
    ])
    const result = await getTrendMensile(svc, 'lab-1', 2)
    const giugno = result.find((r) => r.month === '2026-06')
    const luglio = result.find((r) => r.month === '2026-07')
    expect(giugno?.totale).toBe(900)
    expect(luglio?.totale).toBe(-900)
  })
})

describe('isCacheStale', () => {
  it('ritorna true se aggiornato_at è null', () => {
    expect(isCacheStale(null)).toBe(true)
  })
  it('ritorna true se cache > 15 minuti fa', () => {
    const oldDate = new Date(Date.now() - 16 * 60 * 1000).toISOString()
    expect(isCacheStale(oldDate)).toBe(true)
  })
  it('ritorna false se cache < 15 minuti fa', () => {
    const recentDate = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(isCacheStale(recentDate)).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import {
  mapTitolareKpiRow,
  mapTecnicoLavoriRows,
  mapFrontDeskConsegneRows,
  isCacheStale,
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

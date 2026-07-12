import { describe, it, expect } from 'vitest'
import { getDatiWizard, aggregaDatiWizard, type DatiWizard } from '@/lib/wizard/dati-wizard'
import { trovaTipo, labelTipo, CANONICI_DAY1 } from '@/lib/domain/tipi-lavoro'
import type { SupabaseClient } from '@supabase/supabase-js'

const OGGI = new Date('2026-07-12T10:00:00') // domenica 12 luglio — coerente con currentDate di sessione

/**
 * Mock router multi-tabella: ogni tabella ha una CODA di risultati
 * consumati in ordine di chiamata (FIFO, l'ultimo si ripete se le
 * chiamate superano le voci) — necessario perché `getDatiWizard` e
 * `fetchCampioniConsegna` (Task 6) interrogano ENTRAMBI `lavori`, con
 * filtri diversi, e un mock stateless-per-tabella li confonderebbe.
 */
function svcRouter(routing: Record<string, Array<{ data: unknown; error: unknown }>>): SupabaseClient {
  const indici: Record<string, number> = {}
  return {
    from: (tabella: string) => {
      const coda = routing[tabella]
      if (!coda) throw new Error(`tabella inattesa nel mock: ${tabella}`)
      const i = indici[tabella] ?? 0
      indici[tabella] = i + 1
      const risultato = coda[Math.min(i, coda.length - 1)]
      const builder: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'is', 'gte', 'not', 'like']) builder[m] = () => builder
      builder.then = (resolve: (v: unknown) => void) => resolve(risultato)
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('aggregaDatiWizard — aggregazione pura (nessuna rete)', () => {
  const clienti = [
    { id: 'c1', nome: 'Aldo', cognome: 'Esposito', studio_nome: 'Studio Esposito' },
    { id: 'c2', nome: 'Anna', cognome: 'Bianchi', studio_nome: null },
    { id: 'c3', nome: 'Bruno', cognome: 'Verdi', studio_nome: null },
  ]

  it('label dentista: studio_nome se presente, altrimenti "Dr. Cognome"', () => {
    const r = aggregaDatiWizard(clienti, [], [], OGGI)
    expect(r.dentisti.find((d) => d.id === 'c1')!.label).toBe('Studio Esposito')
    expect(r.dentisti.find((d) => d.id === 'c2')!.label).toBe('Dr. Bianchi')
  })

  it('dentisti: TUTTI i clienti, anche con count30 zero', () => {
    const r = aggregaDatiWizard(clienti, [], [], OGGI)
    expect(r.dentisti).toHaveLength(3)
    expect(r.dentisti.every((d) => d.count30 === 0)).toBe(true)
  })

  it('count30: solo lavori con data_ingresso >= oggi-30gg (45gg fa escluso, 5gg fa incluso)', () => {
    const lavori = [
      { cliente_id: 'c1', descrizione: 'Corona zirconia', data_ingresso: '2026-07-07' }, // 5gg fa → dentro
      { cliente_id: 'c1', descrizione: 'Corona zirconia', data_ingresso: '2026-05-28' }, // 45gg fa → fuori
      { cliente_id: 'c2', descrizione: 'Riparazione', data_ingresso: '2026-07-01' }, // 11gg fa → dentro
    ]
    const r = aggregaDatiWizard(clienti, lavori, [], OGGI)
    expect(r.dentisti.find((d) => d.id === 'c1')!.count30).toBe(1)
    expect(r.dentisti.find((d) => d.id === 'c2')!.count30).toBe(1)
    expect(r.dentisti.find((d) => d.id === 'c3')!.count30).toBe(0)
  })

  it('dentisti ordinati count30 desc poi label asc', () => {
    const lavori = [
      { cliente_id: 'c2', descrizione: 'x', data_ingresso: '2026-07-10' },
      { cliente_id: 'c2', descrizione: 'x', data_ingresso: '2026-07-09' },
      { cliente_id: 'c1', descrizione: 'x', data_ingresso: '2026-07-08' },
    ]
    const r = aggregaDatiWizard(clienti, lavori, [], OGGI)
    // c2 (count 2) primo, poi c1/c3 a pari conteggio (c1=1, c3=0) → c1 prima di c3 per count, non per label
    expect(r.dentisti.map((d) => d.id)).toEqual(['c2', 'c1', 'c3'])
  })

  it('dentisti a pari count30: tie-break su label asc', () => {
    const soloClienti = [
      { id: 'x1', nome: 'Z', cognome: 'Zeta', studio_nome: null }, // label 'Dr. Zeta'
      { id: 'x2', nome: 'A', cognome: 'Alfa', studio_nome: null }, // label 'Dr. Alfa'
    ]
    const r = aggregaDatiWizard(soloClienti, [], [], OGGI)
    expect(r.dentisti.map((d) => d.label)).toEqual(['Dr. Alfa', 'Dr. Zeta'])
  })

  it('frequenzeTipi: conta i lavori 30gg la cui descrizione === labelTipo(t)', () => {
    const labelCorona = labelTipo(trovaTipo('corona_zirconia')!)
    const labelRiparazione = labelTipo(trovaTipo('riparazione')!)
    const lavori = [
      { cliente_id: 'c1', descrizione: labelCorona, data_ingresso: '2026-07-10' },
      { cliente_id: 'c1', descrizione: labelCorona, data_ingresso: '2026-07-09' },
      { cliente_id: 'c2', descrizione: labelRiparazione, data_ingresso: '2026-07-08' },
      { cliente_id: 'c2', descrizione: 'Descrizione a caso non tassonomica', data_ingresso: '2026-07-08' },
    ]
    const r = aggregaDatiWizard(clienti, lavori, [], OGGI)
    expect(r.frequenzeTipi.corona_zirconia).toBe(2)
    expect(r.frequenzeTipi.riparazione).toBe(1)
    expect(r.frequenzeTipi.faccetta).toBe(0)
  })

  it('topTipi: 2 tipi con count>0 → completati con i primi 2 CANONICI_DAY1 non già presenti', () => {
    const labelCorona = labelTipo(trovaTipo('faccetta')!) // NON in CANONICI_DAY1
    const labelPonte = labelTipo(trovaTipo('ponte_zirconia')!) // NON in CANONICI_DAY1
    const lavori = [
      { cliente_id: 'c1', descrizione: labelCorona, data_ingresso: '2026-07-10' },
      { cliente_id: 'c1', descrizione: labelCorona, data_ingresso: '2026-07-09' },
      { cliente_id: 'c2', descrizione: labelPonte, data_ingresso: '2026-07-08' },
    ]
    const r = aggregaDatiWizard(clienti, lavori, [], OGGI)
    expect(r.topTipi).toEqual(['faccetta', 'ponte_zirconia', ...CANONICI_DAY1.slice(0, 2)])
  })

  it('topTipi: ≥4 tipi con count>0 → i 4 più frequenti, tie-break ordine canonico a pari conteggio', () => {
    // corona_zirconia e corona_disilicato precedono ponte_zirconia e faccetta
    // nell'ordine canonico di TIPI_LAVORO — tutti con lo stesso count (2), a
    // parità il tie-break deve rispettare quell'ordine.
    const tipi = ['corona_zirconia', 'corona_disilicato', 'ponte_zirconia', 'faccetta', 'intarsio'] as const
    const lavori = tipi.flatMap((id) => {
      const label = labelTipo(trovaTipo(id)!)
      return [
        { cliente_id: 'c1', descrizione: label, data_ingresso: '2026-07-10' },
        { cliente_id: 'c1', descrizione: label, data_ingresso: '2026-07-09' },
      ]
    })
    const r = aggregaDatiWizard(clienti, lavori, [], OGGI)
    expect(r.topTipi).toEqual(['corona_zirconia', 'corona_disilicato', 'ponte_zirconia', 'faccetta'])
  })

  it('prossimoPz: max numerico dei PZ-\\d+ + 1, pad 4 cifre — non-PZ ignorati', () => {
    const pazienti = [
      { codice_paziente: 'PZ-0435' },
      { codice_paziente: 'PZ-0021' },
      { codice_paziente: 'P-99' },
      { codice_paziente: 'ALTRO' },
    ]
    const r = aggregaDatiWizard(clienti, [], pazienti, OGGI)
    expect(r.prossimoPz).toBe('PZ-0436')
  })

  it('prossimoPz: lista vuota → PZ-0001', () => {
    const r = aggregaDatiWizard(clienti, [], [], OGGI)
    expect(r.prossimoPz).toBe('PZ-0001')
  })

  it('prossimoPz: codice_paziente null non rompe il match', () => {
    const r = aggregaDatiWizard(clienti, [], [{ codice_paziente: null }], OGGI)
    expect(r.prossimoPz).toBe('PZ-0001')
  })
})

describe('getDatiWizard — wiring Supabase + fail-closed', () => {
  const clientiData = [{ id: 'c1', nome: 'Aldo', cognome: 'Esposito', studio_nome: 'Studio Esposito' }]

  it('compone dentisti/frequenzeTipi/topTipi/prossimoPz/giorniPerTipo dalle query', async () => {
    const svc = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [
        { data: [{ cliente_id: 'c1', descrizione: 'Corona zirconia', data_ingresso: '2026-07-10' }], error: null }, // query wizard (30gg)
        { data: [], error: null }, // query interna a fetchCampioniConsegna (storico consegne)
      ],
      pazienti: [{ data: [{ codice_paziente: 'PZ-0010' }], error: null }],
    })
    const r: DatiWizard = await getDatiWizard(svc, 'lab-1', OGGI)
    expect(r.dentisti).toEqual([{ id: 'c1', label: 'Studio Esposito', count30: 1 }])
    expect(r.frequenzeTipi.corona_zirconia).toBe(1)
    expect(r.prossimoPz).toBe('PZ-0011')
    expect(r.giorniPerTipo.corona_zirconia).toEqual({ giorni: 5, daStoria: false }) // nessuno storico → fallback tassonomia
  })

  it('fail-closed: errore sulla query clienti → throw', async () => {
    const svc = svcRouter({
      clienti: [{ data: null, error: { message: 'boom clienti' } }],
      lavori: [{ data: [], error: null }, { data: [], error: null }],
      pazienti: [{ data: [], error: null }],
    })
    await expect(getDatiWizard(svc, 'lab-1', OGGI)).rejects.toThrow()
  })

  it('fail-closed: errore sulla query lavori → throw', async () => {
    const svc = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [{ data: null, error: { message: 'boom lavori' } }],
      pazienti: [{ data: [], error: null }],
    })
    await expect(getDatiWizard(svc, 'lab-1', OGGI)).rejects.toThrow()
  })

  it('fail-closed: errore sulla query pazienti → throw', async () => {
    const svc = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [{ data: [], error: null }, { data: [], error: null }],
      pazienti: [{ data: null, error: { message: 'boom pazienti' } }],
    })
    await expect(getDatiWizard(svc, 'lab-1', OGGI)).rejects.toThrow()
  })

  it('fail-closed: errore sulla query storico consegne (fetchCampioniConsegna) → throw', async () => {
    const svc = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [{ data: [], error: null }, { data: null, error: { message: 'boom storico' } }],
      pazienti: [{ data: [], error: null }],
    })
    await expect(getDatiWizard(svc, 'lab-1', OGGI)).rejects.toThrow()
  })
})

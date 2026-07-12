import { describe, it, expect } from 'vitest'
import { mapPileHome, subMorph, getPileHome, getPerimetroHome, type RawLavoroPila } from '@/lib/dashboard/pile-home'
import { scegliSegnale } from '@/lib/dashboard/striscia'
import { createChain } from './helpers/supabase-chain-mock'
import type { SupabaseClient } from '@supabase/supabase-js'

const OGGI = new Date('2026-07-09T10:00:00') // giovedì 9 luglio — l'ancora del cast mockup

function raw(p: Partial<RawLavoroPila>): RawLavoroPila {
  return {
    id: 'id-1', numero_lavoro: '147', stato: 'pronto',
    data_consegna_prevista: '2026-07-09', ora_consegna: '16:00:00',
    descrizione: 'Corona zirconia', created_at: '2026-07-01T08:00:00Z', updated_at: '2026-07-08T08:00:00Z',
    clienti: { nome: 'Aldo', cognome: 'Esposito', studio_nome: 'Studio Esposito' },
    pazienti: { codice_paziente: 'PZ-0412' },
    lavori_fasi: [], lavoro_prove: [], tecnici: null,
    ...p,
  }
}

describe('mapPileHome — il cast del mockup, riprodotto (home.html + pila-aperta.html)', () => {
  const rows: RawLavoroPila[] = [
    raw({ id: 'l147' }), // pronto oggi 16:00 → rossa
    raw({ id: 'l144', numero_lavoro: '144', stato: 'pronto', data_consegna_prevista: '2026-07-08', ora_consegna: null,
          descrizione: 'Ponte 3 elementi', clienti: { nome: 'Anna', cognome: 'Bianchi', studio_nome: null }, pazienti: { codice_paziente: 'PZ-0398' } }),
    raw({ id: 'l149', numero_lavoro: '149', stato: 'in_lavorazione', data_consegna_prevista: '2026-07-10', ora_consegna: null,
          descrizione: 'Scheletrato', pazienti: { codice_paziente: 'PZ-0421' },
          lavori_fasi: [
            { eseguita_at: '2026-07-08T10:00:00Z', deleted_at: null, fase: { descrizione: 'Fusione', ordine: 1 } },
            { eseguita_at: null, deleted_at: null, fase: { descrizione: 'Rifinitura', ordine: 2 } },
          ] }), // ultima fase rimasta → STA PER FINIRE
    raw({ id: 'l148', numero_lavoro: '148', stato: 'in_lavorazione', data_consegna_prevista: '2026-07-14', ora_consegna: null,
          descrizione: 'Faccette in ceramica', pazienti: { codice_paziente: 'PZ-0424' },
          lavori_fasi: [
            { eseguita_at: '2026-07-08T10:00:00Z', deleted_at: null, fase: { descrizione: 'Modellazione', ordine: 1 } },
            { eseguita_at: null, deleted_at: null, fase: { descrizione: 'In forno', ordine: 2 } },
            { eseguita_at: null, deleted_at: null, fase: { descrizione: 'Rifinitura', ordine: 3 } },
          ] }), // fase corrente non ultima → IN FORNO
    raw({ id: 'l150', numero_lavoro: '150', stato: 'sospeso', data_consegna_prevista: '2026-07-06', ora_consegna: null,
          descrizione: 'Corona metallo-ceramica', updated_at: '2026-07-03T08:00:00Z', pazienti: { codice_paziente: 'PZ-0430' } }),
    raw({ id: 'l145', numero_lavoro: '145', stato: 'in_prova_esterna', data_consegna_prevista: '2026-07-15', ora_consegna: null,
          descrizione: 'Corona in disilicato', pazienti: { codice_paziente: 'PZ-0408' },
          lavoro_prove: [{ data_rientro_prevista: '2026-07-13', data_rientro_effettiva: null }] }),
    raw({ id: 'l151', numero_lavoro: '151', stato: 'ricevuto', data_consegna_prevista: '2026-07-16', ora_consegna: null,
          descrizione: 'Protesi totale', created_at: '2026-07-09T07:00:00Z', pazienti: { codice_paziente: 'PZ-0433' } }),
    raw({ id: 'l152', numero_lavoro: '152', stato: 'ricevuto', data_consegna_prevista: '2026-07-16', ora_consegna: null,
          descrizione: 'Intarsio', created_at: '2026-07-08T07:00:00Z', pazienti: { codice_paziente: 'PZ-0435' } }),
    raw({ id: 'fuori', numero_lavoro: '130', stato: 'consegnato' }),
  ]
  const pile = mapPileHome(rows, OGGI)

  it('distribuisce nelle 4 pile: rossa 2 · ambra 3 · viola 1 · blu 2 (consegnato fuori)', () => {
    expect(pile.liste.rossa.map((l) => l.numero)).toEqual(['144', '147']) // ritardo in cima
    expect(pile.liste.ambra.map((l) => l.numero)).toEqual(['149', '148', '150']) // sospeso in fondo
    expect(pile.liste.viola.map((l) => l.numero)).toEqual(['145'])
    expect(pile.liste.blu.map((l) => l.numero)).toEqual(['151', '152'])
  })

  it('pill: DA IERI · OGGI · 16:00 · STA PER FINIRE · IN FORNO · FERMO · IN PROVA · APPENA ARRIVATO', () => {
    expect(pile.liste.rossa[0].pill).toEqual({ testo: 'DA IERI', famiglia: 'red' })
    expect(pile.liste.rossa[1].pill).toEqual({ testo: 'OGGI · 16:00', famiglia: 'red' })
    expect(pile.liste.ambra[0].pill).toEqual({ testo: 'STA PER FINIRE', famiglia: 'amber' })
    expect(pile.liste.ambra[1].pill).toEqual({ testo: 'IN FORNO', famiglia: 'amber' })
    expect(pile.liste.ambra[2].pill).toEqual({ testo: 'FERMO', famiglia: 'amber' })
    expect(pile.liste.viola[0].pill).toEqual({ testo: 'IN PROVA', famiglia: 'purple' })
    expect(pile.liste.blu[0].pill).toEqual({ testo: 'APPENA ARRIVATO', famiglia: 'blue' })
  })

  it('consegnabile SOLO sui consegnabili (per il TastoConsegnaInline del primo della rossa)', () => {
    expect(pile.liste.rossa[0].consegnabile).toBe(true)
    expect(pile.liste.ambra.every((l) => !l.consegnabile)).toBe(true)
  })

  it('dentista = studio_nome ?? nome cognome · paziente = codice_paziente (mai nome in chiaro)', () => {
    expect(pile.liste.rossa[1].dentista).toBe('Studio Esposito')
    expect(pile.liste.rossa[0].dentista).toBe('Anna Bianchi')
    expect(pile.liste.rossa[0].paziente).toBe('PZ-0398')
  })

  it('sub della home: regola subline — numero primo, mai troncato (§5.7 rev. 3.1)', () => {
    expect(pile.sub.rossa).toBe('n.144 da ieri · n.147 alle 16')
    expect(pile.sub.ambra).toBe('n.149 per venerdì')
    expect(pile.sub.viola).toBe('n.145 torna lunedì')
    expect(pile.sub.blu).toBe('n.151 e n.152 da confermare')
  })

  it('sub di sollievo a pila vuota (L5 — le pile non si nascondono mai)', () => {
    const vuote = mapPileHome([], OGGI)
    expect(vuote.sub.rossa).toBe('Tutte consegnate ✓')
    expect(vuote.sub.ambra).toBe('Niente sul banco')
    expect(vuote.sub.viola).toBe('Nessuna prova in giro')
    expect(vuote.sub.blu).toBe('Nessun nuovo arrivo')
  })

  it('dati striscia: ritardo più grave, fermo ≥5gg, arrivo >24h, prossima ora', () => {
    expect(pile.striscia.ritardoPiuGrave).toEqual({ numero: '144', giorni: 1 })
    expect(pile.striscia.fermo).toEqual({ id: 'l150', numero: '150', giorni: 6 })
    expect(pile.striscia.arrivoVecchio).toBe('152') // creato ieri, >24h fa
    expect(pile.striscia.consegneOggiTotali).toBe(2) // n.144 (dovuta ieri, va gestita oggi) + n.147
    expect(pile.striscia.prossimaOra).toBe('16:00')
  })

  it('rientro (Task 8): l\'unico lavoro viola porta con sé la data di rientro prevista della prova aperta', () => {
    expect(pile.liste.viola[0].rientro).toBe('2026-07-13')
  })

  it('subMorph — i numeri utili del morph header', () => {
    expect(subMorph('rossa', pile, OGGI)).toBe('2 lavori · il più vicino alle 16:00')
    expect(subMorph('ambra', pile, OGGI)).toBe('3 lavori · il più vicino venerdì 10')
    expect(subMorph('viola', pile, OGGI)).toBe('1 lavoro · torna lunedì 13')
    expect(subMorph('blu', pile, OGGI)).toBe('2 lavori · da confermare')
    expect(subMorph('rossa', mapPileHome([], OGGI), OGGI)).toBeUndefined()
  })
})

// Ratifica Francesco 12/07 (emendamento al piano Ondata 1, item 3 review
// finale): un tecnico SENZA riga in `tecnici` deve vedere pile VUOTE
// (fail-closed), mai l'intero lab. Prima: `tecnicoId: null` → `getPileHome`
// senza filtro → il tecnico vedeva tutto (bug di perimetro scoperto in QA
// Task 11, §4 ledger «richiesto seeding aggiuntivo»).
describe('getPerimetroHome / getPileHome — fail-closed per il tecnico senza anagrafica (ratifica 12/07)', () => {
  function svcTecnicoSenzaRiga(): SupabaseClient {
    const chainTecnici = createChain({ data: null, error: null })
    return {
      from: (tabella: string) => {
        // Fail-closed vero: `getPileHome` con `senzaAnagrafica: true` NON deve
        // MAI interrogare "lavori" — se lo fa, il perimetro non è chiuso prima
        // della query, solo dopo (rischio di leak sotto race/refactor futuri).
        if (tabella === 'lavori') throw new Error('getPileHome ha interrogato "lavori" nonostante senzaAnagrafica: true — fail-closed rotto')
        if (tabella === 'tecnici') return chainTecnici
        throw new Error(`tabella inattesa nel mock: ${tabella}`)
      },
    } as unknown as SupabaseClient
  }

  it('getPerimetroHome: ruolo tecnico senza riga in "tecnici" → senzaAnagrafica true, tecnicoId null', async () => {
    const svc = svcTecnicoSenzaRiga()
    const perimetro = await getPerimetroHome(svc, 'lab-1', 'user-1', 'tecnico')
    expect(perimetro).toEqual({ tecnicoId: null, senzaAnagrafica: true })
  })

  it('getPerimetroHome: ruoli non-tecnico → senzaAnagrafica false, perimetro titolare (tutto il lab)', async () => {
    const svc = { from: () => { throw new Error('non-tecnico non deve nemmeno interrogare "tecnici"') } } as unknown as SupabaseClient
    const perimetro = await getPerimetroHome(svc, 'lab-1', 'user-1', 'titolare')
    expect(perimetro).toEqual({ tecnicoId: null, senzaAnagrafica: false })
  })

  it('getPileHome: senzaAnagrafica true → tutte le 4 pile vuote, MAI l\'intero lab', async () => {
    const svc = svcTecnicoSenzaRiga()
    const pile = await getPileHome(svc, 'lab-1', { tecnicoId: null, senzaAnagrafica: true })
    expect(pile.liste).toEqual({ rossa: [], ambra: [], viola: [], blu: [] })
  })

  it('pile vuote da fail-closed → la striscia del tecnico cade sul segnale 9 sereno ("nessuna consegna oggi")', async () => {
    const svc = svcTecnicoSenzaRiga()
    const pile = await getPileHome(svc, 'lab-1', { tecnicoId: null, senzaAnagrafica: true })
    const segnale = scegliSegnale('tecnico', {
      fatturaScartata: null, materialeRosso: null, pagamentoScaduto: null, ddcOggi: 0,
      pile: pile.striscia,
    })
    expect(segnale).toEqual({ attenzione: false, forte: 'Tutto a posto:', testo: 'nessuna consegna oggi', azione: null })
  })
})

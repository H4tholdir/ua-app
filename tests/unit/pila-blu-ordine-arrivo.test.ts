// D244 — «APPENA ARRIVATI» si ordina per ARRIVO, il più recente in cima.
//
// 🔑 Il fatto che l'ha generata: Francesco, il 05/08/2026, guardando la pila
// vera dal telefono — «*nei lavori appena arrivati il loro ordine non lo
// capisco*». E aveva ragione: la pila era ordinata per **data di consegna**
// (`urgenza.ts:102-103`), come le altre tre, quindi in cima finiva un lavoro
// arrivato a maggio con la consegna scaduta, e i quattro arrivati quel giorno
// stavano in fondo. Il nome della pila prometteva una cosa e la lista ne faceva
// un'altra.
//
// 🛑 Le altre TRE pile NON cambiano, ed è il punto: rossa, ambra e viola
// parlano di **scadenze** — lì la data di consegna è l'ordine giusto. Solo la
// blu parla di **arrivi**.
//
// 📌 E il secondo difetto, che si chiude qui insieme al primo: a parità di
// chiave l'ordine era **arbitrario** — il confronto tornava `0` e la query di
// casa non ha alcun `ORDER BY`, quindi restava l'ordine che il database
// capitava di restituire, che non è stabile fra due letture. Ora c'è un
// criterio di spareggio dichiarato: il numero del lavoro.
import { describe, it, expect } from 'vitest'
import { mapPileHome, type RawLavoroPila } from '@/lib/dashboard/pile-home'

const OGGI = new Date('2026-08-05T15:00:00')

function raw(p: Partial<RawLavoroPila>): RawLavoroPila {
  return {
    id: 'id-1', numero_lavoro: '0001', stato: 'ricevuto',
    data_consegna_prevista: '2026-08-18', ora_consegna: null,
    descrizione: 'Corona zirconia', created_at: '2026-08-05T08:00:00Z', updated_at: '2026-08-05T08:00:00Z',
    clienti: { nome: 'Aldo', cognome: 'Esposito', studio_nome: null },
    pazienti: { codice_paziente: 'PZ-1' },
    lavori_fasi: [], lavoro_prove: [], tecnici: null,
    numero_cassetta: null,
    ...p,
  }
}

describe('pila blu — l\'ordine è quello di ARRIVO, non quello di consegna', () => {
  it('🔴 il caso vero del 05/08: l\'arrivato OGGI sta sopra quello di maggio, benché la sua consegna sia lontanissima', () => {
    // Riproduce la pila misurata sul banco: 2026/0002 è arrivato il 21 maggio e
    // la sua consegna è scaduta da mesi; 2026/0020 è arrivato oggi e consegna
    // il 18 agosto. Con l'ordine per consegna il vecchio stava in CIMA.
    const pile = mapPileHome([
      raw({ id: 'vecchio', numero_lavoro: '2026/0002', created_at: '2026-05-21T07:57:00Z', data_consegna_prevista: '2026-05-22' }),
      raw({ id: 'nuovo', numero_lavoro: '2026/0020', created_at: '2026-08-05T13:13:00Z', data_consegna_prevista: '2026-08-18' }),
    ], OGGI)
    expect(pile.liste.blu.map((l) => l.numero)).toEqual(['2026/0020', '2026/0002'])
  })

  it('quattro arrivi nello stesso giorno: dal più recente al più vecchio', () => {
    const pile = mapPileHome([
      raw({ id: 'a', numero_lavoro: '0017', created_at: '2026-08-05T11:23:44Z' }),
      raw({ id: 'b', numero_lavoro: '0020', created_at: '2026-08-05T13:13:57Z' }),
      raw({ id: 'c', numero_lavoro: '0018', created_at: '2026-08-05T12:34:19Z' }),
      raw({ id: 'd', numero_lavoro: '0019', created_at: '2026-08-05T13:12:31Z' }),
    ], OGGI)
    expect(pile.liste.blu.map((l) => l.numero)).toEqual(['0020', '0019', '0018', '0017'])
  })

  it('⚖️ criterio di spareggio: a PARITÀ di istante d\'arrivo l\'ordine è comunque STABILE', () => {
    const stesso = '2026-08-05T09:00:00Z'
    const righe = [
      raw({ id: 'x', numero_lavoro: '0031', created_at: stesso }),
      raw({ id: 'y', numero_lavoro: '0033', created_at: stesso }),
      raw({ id: 'z', numero_lavoro: '0032', created_at: stesso }),
    ]
    const primo = mapPileHome(righe, OGGI).liste.blu.map((l) => l.numero)
    // Le stesse righe LETTE AL CONTRARIO: se l'ordine dipendesse dal database,
    // qui cambierebbe. È esattamente ciò che succedeva prima.
    const secondo = mapPileHome([...righe].reverse(), OGGI).liste.blu.map((l) => l.numero)
    expect(primo).toEqual(secondo)
    expect(primo).toEqual(['0033', '0032', '0031'])
  })

  it('🛑 NON-REGRESSIONE: le altre tre pile restano ordinate per CONSEGNA', () => {
    const pile = mapPileHome([
      raw({ id: 'r1', numero_lavoro: '0100', stato: 'pronto', data_consegna_prevista: '2026-08-10', created_at: '2026-08-05T10:00:00Z' }),
      raw({ id: 'r2', numero_lavoro: '0101', stato: 'pronto', data_consegna_prevista: '2026-08-06', created_at: '2026-08-05T11:00:00Z' }),
      raw({ id: 'v1', numero_lavoro: '0200', stato: 'in_prova', data_consegna_prevista: '2026-08-20', created_at: '2026-08-05T10:00:00Z' }),
      raw({ id: 'v2', numero_lavoro: '0201', stato: 'in_prova', data_consegna_prevista: '2026-08-12', created_at: '2026-08-05T11:00:00Z' }),
    ], OGGI)
    // il più vicino a consegnare in cima, anche se è arrivato DOPO
    expect(pile.liste.rossa.concat(pile.liste.ambra).map((l) => l.numero)).toEqual(['0101', '0100'])
    expect(pile.liste.viola.map((l) => l.numero)).toEqual(['0201', '0200'])
  })

  it('⚖️ spareggio anche sulle altre pile: stessa data e stessa ora → ordine STABILE', () => {
    const righe = [
      raw({ id: 'p1', numero_lavoro: '0300', stato: 'pronto', data_consegna_prevista: '2026-08-11', ora_consegna: null }),
      raw({ id: 'p2', numero_lavoro: '0302', stato: 'pronto', data_consegna_prevista: '2026-08-11', ora_consegna: null }),
      raw({ id: 'p3', numero_lavoro: '0301', stato: 'pronto', data_consegna_prevista: '2026-08-11', ora_consegna: null }),
    ]
    const primo = mapPileHome(righe, OGGI).liste.ambra.map((l) => l.numero)
    const secondo = mapPileHome([...righe].reverse(), OGGI).liste.ambra.map((l) => l.numero)
    expect(primo).toEqual(secondo)
    expect(primo).toEqual(['0300', '0301', '0302'])
  })

  it('🔑 la striscia nomina il più VECCHIO che aspetta, non il primo della lista (che ora è il più nuovo)', () => {
    const pile = mapPileHome([
      raw({ id: 'nuovo', numero_lavoro: '0050', created_at: '2026-08-05T09:00:00Z' }), // di oggi: non aspetta da 24h
      raw({ id: 'medio', numero_lavoro: '0040', created_at: '2026-08-02T09:00:00Z' }),
      raw({ id: 'vecchissimo', numero_lavoro: '0030', created_at: '2026-07-20T09:00:00Z' }),
    ], OGGI)
    expect(pile.liste.blu.map((l) => l.numero)).toEqual(['0050', '0040', '0030'])
    // Prima bastava il `find` sulla lista ordinata; ora il primo della lista è
    // il più NUOVO, quindi il più vecchio va cercato apposta.
    expect(pile.striscia.arrivoVecchio).toBe('0030')
  })

  it('la frase della pila nomina i due PIÙ RECENTI, coerente con l\'ordine nuovo', () => {
    const pile = mapPileHome([
      raw({ id: 'b1', numero_lavoro: '0170', created_at: '2026-08-05T06:00:00Z' }),
      raw({ id: 'b2', numero_lavoro: '0171', created_at: '2026-08-05T07:00:00Z' }),
      raw({ id: 'b3', numero_lavoro: '0172', created_at: '2026-08-05T08:00:00Z' }),
      raw({ id: 'b4', numero_lavoro: '0173', created_at: '2026-08-05T09:00:00Z' }),
    ], OGGI)
    expect(pile.sub.blu).toBe('n.0173, n.0172 e altri 2 da confermare')
  })
})

import { describe, it, expect } from 'vitest'
import { risolviTinta, NESSUNA_TINTA } from '@/lib/api/tinta'

/**
 * Finto client, con la SPIA di ciò che è stato chiesto al catalogo.
 *
 * 🔑 LA SPIA NON È DECORO. Senza, la prova «scarta una famiglia che non c'entra
 *    con la macro» passerebbe anche se quella regola non esistesse — perché il
 *    codice usato non sta nel catalogo di prova e verrebbe scartato comunque. È
 *    la forma vacua già pagata due volte in quest'ondata (un `UPDATE` su zero
 *    righe nel T2, un ciclo su un elenco vuoto nel T3). Qui si asserisce il
 *    MECCANISMO: il rifiuto avviene PRIMA di consultare il catalogo.
 */
function svcFinto(righe: Array<{ famiglia: string; codice: string }>, errore = false) {
  const spia = { consultato: 0, tabella: null as string | null, famigliaChiesta: null as string | null }
  const svc = {
    from: (tabella: string) => {
      spia.consultato++
      spia.tabella = tabella
      return {
        select: () => ({
          eq: (_colonna: string, valore: string) => {
            spia.famigliaChiesta = valore
            return Promise.resolve(
              errore ? { data: null, error: { message: 'ko' } } : { data: righe, error: null }
            )
          },
        }),
      }
    },
  }
  return { svc: svc as never, spia }
}

const CATALOGO_SPORT = [
  { famiglia: 'sport', codice: 'rosso' },
  { famiglia: 'sport', codice: 'nero' },
]
const CATALOGO_RESINA = [
  { famiglia: 'resina_ortodontica', codice: 'rosa' },
  { famiglia: 'resina_ortodontica', codice: 'glitter_oro' },
]

describe('risolviTinta — la tinta del manufatto, normalizzata e confrontata col catalogo', () => {
  // ⚠️ GUARDIE NEGATIVE — contro l'abbozzo inerte restano verdi PER COSTRUZIONE:
  //    chiedono NESSUNA_TINTA, e l'abbozzo risponde NESSUNA_TINTA a tutto. Non si
  //    riscrivono per farle accendere: sarebbe fingere (stessa scelta dichiarata
  //    nel T3). Il loro valore è contro una regressione futura — il giorno in cui
  //    una casella vuota cominciasse a produrre un avviso, si accendono.
  it('undefined e null non sono una richiesta', async () => {
    expect(await risolviTinta(svcFinto([]).svc, undefined, undefined, 'bite_splint')).toEqual(NESSUNA_TINTA)
    expect(await risolviTinta(svcFinto([]).svc, null, null, 'bite_splint')).toEqual(NESSUNA_TINTA)
  })

  it('una casella vuota non è una richiesta', async () => {
    expect(await risolviTinta(svcFinto([]).svc, 'sport', '   ', 'bite_splint')).toEqual(NESSUNA_TINTA)
  })

  // 🆕 IL PIANO NOMINAVA TRE TIPI SBAGLIATI («numero, oggetto, array») E NE
  //    PROVAVA UNO. Enumerate le forme d'input (R-P4), si coprono tutte e tre.
  it('un codice di tipo sbagliato È una richiesta, e va dichiarata persa — numero, oggetto, array', async () => {
    for (const sbagliato of [42, { codice: 'rosso' }, ['rosso']]) {
      const r = await risolviTinta(svcFinto([]).svc, 'sport', sbagliato as never, 'bite_splint')
      expect(r.scartata, `${JSON.stringify(sbagliato)} doveva essere dichiarato perso`).toBe(true)
      expect(r.tinta_codice).toBeNull()
    }
  })

  it('normalizza maiuscole e spazi — su TUTTI E DUE i lati, e chiede al catalogo giusto', async () => {
    const { svc, spia } = svcFinto(CATALOGO_SPORT)
    // 🆕 il piano normalizzava (e provava) il solo codice: `'  SPORT '` deve
    //    arrivare a combaciare con la famiglia ammessa, o una maiuscola di
    //    troppo farebbe scartare una tinta buona. Stesso ragionamento di P4-①.
    const r = await risolviTinta(svc, '  SPORT ', '  ROSSO ', 'bite_splint')
    expect(r).toEqual({ tinta_famiglia: 'sport', tinta_codice: 'rosso', scartata: false })
    // 🛑 SENZA QUESTA RIGA la spia sarebbe un osservatore che nessuno legge: se
    //    la funzione interrogasse `colori_dentali` invece del catalogo delle
    //    tinte, tutte e undici le prove resterebbero verdi. Un interruttore che
    //    c'è e non fa niente è peggio di uno che manca (lezione del 05/08).
    expect(spia.tabella).toBe('tinte_manufatto')
  })

  it('deduce la famiglia dalla macro quando non è indicata', async () => {
    const { svc, spia } = svcFinto(CATALOGO_SPORT)
    const r = await risolviTinta(svc, null, 'rosso', 'bite_splint')
    expect(r).toEqual({ tinta_famiglia: 'sport', tinta_codice: 'rosso', scartata: false })
    expect(spia.famigliaChiesta, 'il catalogo va interrogato sulla famiglia della MACRO').toBe('sport')
  })

  // 🆕 CONTROLLO POSITIVO SULL'ALTRO LATO. Il piano provava solo `sport` su
  //    `bite_splint`: un difetto che rifiutasse tutta la resina sarebbe passato.
  //    È la lezione del T2 («un positivo va messo su OGNI lato che la regola
  //    tocca»), applicata prima di pagarla una seconda volta.
  it('e vale identico sull’altra famiglia: resina ortodontica su un lavoro di ortodonzia', async () => {
    const { svc, spia } = svcFinto(CATALOGO_RESINA)
    const r = await risolviTinta(svc, null, 'GLITTER_ORO', 'ortodonzia')
    expect(r).toEqual({ tinta_famiglia: 'resina_ortodontica', tinta_codice: 'glitter_oro', scartata: false })
    expect(spia.famigliaChiesta).toBe('resina_ortodontica')
  })

  it('scarta una famiglia che non c’entra con la macro, SENZA nemmeno consultare il catalogo', async () => {
    const { svc, spia } = svcFinto(CATALOGO_SPORT)
    const r = await risolviTinta(svc, 'resina_ortodontica', 'rosso', 'bite_splint')
    expect(r.scartata).toBe(true)
    // 🛑 «rosso» ESISTE nel catalogo di prova: se il rifiuto non arrivasse da qui,
    //    la tinta si salverebbe. Questa riga è ciò che rende la prova capace di
    //    distinguere le due vie di rifiuto.
    expect(spia.consultato, 'il disaccordo si vede prima, senza chiedere niente al catalogo').toBe(0)
  })

  // 🆕 IL LATO CHE IL PIANO NON PROVAVA. La sua implementazione puliva solo il
  //    CODICE: una famiglia di tipo sbagliato cadeva nel ramo «non indicata» e
  //    veniva dedotta IN SILENZIO — cioè un dato palesemente rotto otteneva un
  //    trattamento più indulgente di uno solo sbagliato («resina» su un bite,
  //    che scarta). Qui si chiude: quello che non è una stringa non si indovina.
  it('una famiglia di tipo sbagliato non si deduce in silenzio: si dichiara persa', async () => {
    for (const sbagliata of [42, { famiglia: 'sport' }, ['sport']]) {
      const { svc } = svcFinto(CATALOGO_SPORT)
      const r = await risolviTinta(svc, sbagliata as never, 'rosso', 'bite_splint')
      expect(r.scartata, `famiglia ${JSON.stringify(sbagliata)} doveva essere dichiarata persa`).toBe(true)
    }
  })

  it('scarta un codice inesistente', async () => {
    const { svc, spia } = svcFinto(CATALOGO_SPORT)
    const r = await risolviTinta(svc, 'sport', 'rosa_fluo', 'bite_splint')
    expect(r.scartata).toBe(true)
    expect(spia.consultato, 'qui invece il catalogo È stato chiesto: è lui a dire di no').toBe(1)
  })

  it('scarta se la macro non ha famiglia di tinte — una corona non ha tinta', async () => {
    const { svc, spia } = svcFinto(CATALOGO_SPORT)
    const r = await risolviTinta(svc, 'sport', 'rosso', 'protesi_fissa')
    expect(r.scartata).toBe(true)
    expect(spia.consultato).toBe(0)
  })

  it('un catalogo irraggiungibile scarta, non lancia', async () => {
    const { svc } = svcFinto([], true)
    const r = await risolviTinta(svc, 'sport', 'rosso', 'bite_splint')
    expect(r.scartata).toBe(true)
    expect(r.tinta_famiglia).toBeNull()
  })
})

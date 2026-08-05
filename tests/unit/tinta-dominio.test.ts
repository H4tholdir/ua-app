import { describe, it, expect } from 'vitest'
import { FAMIGLIE_TINTA, famigliaDiMacro, macroDiFamiglia } from '@/lib/domain/tinta'
import { TIPI_LAVORO } from '@/lib/domain/tipi-lavoro'

describe('tinta — famiglie e corrispondenza con la categoria grossa', () => {
  it('le famiglie sono due', () => {
    expect(FAMIGLIE_TINTA).toEqual(['resina_ortodontica', 'sport'])
  })

  it('ortodonzia → resina, bite_splint → sport, tutto il resto → null', () => {
    expect(famigliaDiMacro('ortodonzia')).toBe('resina_ortodontica')
    expect(famigliaDiMacro('bite_splint')).toBe('sport')
    expect(famigliaDiMacro('protesi_fissa')).toBeNull()
    expect(famigliaDiMacro('altro')).toBeNull()
  })

  it('la corrispondenza è biunivoca', () => {
    expect(macroDiFamiglia('resina_ortodontica')).toBe('ortodonzia')
    expect(macroDiFamiglia('sport')).toBe('bite_splint')
  })

  // 🔑 LA PROVA CHE VALE PIÙ DELLE ALTRE, e che si accenderà da sola il giorno
  // in cui qualcuno aggiungerà un tipo con tinta sotto un'altra macro: è il
  // limite (b) scritto nella migration, trasformato in una rete.
  it('OGNI tipo con prevedeColore «libero» sta sotto una macro che ha una famiglia', () => {
    const liberi = TIPI_LAVORO.filter((t) => t.prevedeColore === 'libero')
    expect(liberi.length).toBeGreaterThan(0) // se un domani sparissero, questa prova va ripensata
    for (const t of liberi) {
      expect(famigliaDiMacro(t.macro), `il tipo ${t.id} non ha una famiglia di tinte`).not.toBeNull()
    }
  })

  // ⚠️ LE DUE PROVE QUI SOTTO SONO GUARDIE NEGATIVE, e contro l'abbozzo inerte
  //    restano verdi PER COSTRUZIONE: chiedono che la risposta sia `null`, e
  //    l'abbozzo risponde `null` a tutto. Non si riscrivono per farle accendere
  //    — sarebbe fingere. Il loro valore è contro una REGRESSIONE futura: il
  //    giorno in cui qualcuno aggiunge una corrispondenza di troppo, si
  //    accendono. Misurato e dichiarato il 05/08 (R-P4: 5 su 8 si accendono,
  //    queste due e una terza no; la terza era vacua ed è stata corretta).
  it('nessun tipo con prevedeColore «catalogo» sta sotto una macro con famiglia di tinte', () => {
    const catalogo = TIPI_LAVORO.filter((t) => t.prevedeColore === 'catalogo')
    for (const t of catalogo) {
      expect(famigliaDiMacro(t.macro), `il tipo ${t.id} finirebbe sotto una tinta non dentale`).toBeNull()
    }
  })

  // 🆕 NON nel piano — aggiunte eseguendo, perché senza di queste l'abbozzo
  //    inerte del Passo 3 (R-P4) lascerebbe verdi delle prove che non provano
  //    niente, e perché una corrispondenza si prova anche dal lato che NON deve
  //    esistere.
  it('una famiglia inventata non ha alcuna macro', () => {
    expect(macroDiFamiglia('pippo')).toBeNull()
    expect(macroDiFamiglia('')).toBeNull()
  })

  it('le due funzioni si chiudono l’una sull’altra: famiglia → macro → stessa famiglia', () => {
    // 🛑 QUESTA RIGA NON È DECORO — R-P4, misurato il 05/08. Senza, contro
    //    l'abbozzo inerte (`FAMIGLIE_TINTA = []`) il ciclo qui sotto non gira
    //    NEANCHE UNA VOLTA e la prova passa **vuota**: verde senza aver
    //    verificato niente. Un ciclo su un elenco vuoto è una prova che non c'è.
    expect(FAMIGLIE_TINTA.length).toBe(2)
    for (const f of FAMIGLIE_TINTA) {
      const macro = macroDiFamiglia(f)
      expect(macro, `la famiglia ${f} non ha una macro`).not.toBeNull()
      expect(famigliaDiMacro(macro!)).toBe(f)
    }
  })

  it('la macro di ogni tipo con tinta «libera» torna alla famiglia giusta', () => {
    const attese: Record<string, string> = {
      placca_espansione: 'resina_ortodontica',
      apparecchio_funzionale: 'resina_ortodontica',
      paradenti: 'sport',
    }
    const liberi = TIPI_LAVORO.filter((t) => t.prevedeColore === 'libero').map((t) => t.id)
    // 🛑 L'elenco atteso NON è una copia del codice: è il censimento fatto a mano
    //    su tipi-lavoro.ts il 05/08. Se un tipo entra o esce, questa prova se ne
    //    accorge — ed è il punto.
    expect(liberi.sort()).toEqual(Object.keys(attese).sort())
    for (const [id, famiglia] of Object.entries(attese)) {
      const tipo = TIPI_LAVORO.find((t) => t.id === id)!
      expect(famigliaDiMacro(tipo.macro), `${id} sbaglia famiglia`).toBe(famiglia)
    }
  })
})

// tests/unit/avvisi-ruoli.test.ts
//
// ⚖️ D342 — CHI CHIUDE E CHI VEDE UN AVVISO AL DENTISTA, provato come FUNZIONE.
// Nato dalla revisione del Task 6, e la ragione per cui esiste è questa:
//
// 🔴 LE TRE SENTINELLE DI `scheda-avviso-dentista.test.tsx` PROVAVANO CHE IL
//    CANCELLO ESISTE, NON CHE GUARDA DAL VERSO GIUSTO. Erano asserzioni sul
//    TESTO di `lavori/[id]/page.tsx`: la parola `puoVedereAvviso` doveva comparire
//    nella finestra prima della chiamata alla lettura. Scambiando i due rami del
//    ternario la parola resta lì dov'è, e **tutte le prove restano verdi** mentre
//    a vedere il promemoria sarebbero rimasti solo `admin_rete` e `admin_sistema`
//    — cioè esattamente i due che D342 esclude.
//
// ✅ QUI LA DECISIONE È UNA FUNZIONE PURA, e una funzione si esercita.
//
// 🛑 I CINQUE NOMI SONO SCRITTI A MANO, MAI PRESI DA `RUOLI_CHIUSURA_AVVISO`.
//    È la lezione già pagata in questa casa e scritta in `api-avviso.test.ts:559`:
//    un ciclo sulla costante è **tautologico** — chi togliesse `front_desk`
//    dall'elenco farebbe girare il ciclo su due nomi, e la prova si adatterebbe al
//    difetto invece di trovarlo. L'elenco atteso qui è la DECISIONE, non il codice.

import { describe, it, expect } from 'vitest'
import {
  RUOLI_CHIUSURA_AVVISO,
  puoChiudereAvviso,
  puoVedereAvviso,
} from '@/lib/avvisi/ruoli'

/**
 * I CINQUE ruoli veri di questo progetto, scritti a mano.
 * `provato:` il CHECK vivo su `public.utenti.ruolo`, letto sul catalogo il
 * 09/08/2026 (v. il riquadro in `src/lib/avvisi/ruoli.ts`).
 * ⚠️ E NON si leggono da `supabase/schema.sql:247`, che porta un CHECK vecchio di
 * quattro ruoli (senza `admin_sistema`): chi costruisse un cancello da lì ne
 * dimenticherebbe uno.
 */
const CINQUE_RUOLI = ['titolare', 'tecnico', 'front_desk', 'admin_rete', 'admin_sistema'] as const

/**
 * La TAVOLA DELLA VERITÀ di D342, ruolo per ruolo, scritta a mano.
 *
 * 🔑 È questa tabella — non la costante — che rende rossa una funzione
 * capovolta: `true`/`false` sono la decisione, e una funzione che risponde
 * all'incontrario sbaglia **tutte e cinque** le righe insieme.
 */
const ATTESO_CHIUSURA: Record<(typeof CINQUE_RUOLI)[number], boolean> = {
  titolare: true,
  tecnico: true,
  front_desk: true,
  admin_rete: false,
  admin_sistema: false,
}

describe('puoChiudereAvviso — il PERMESSO (⚖️ D342)', () => {
  for (const ruolo of CINQUE_RUOLI) {
    const atteso = ATTESO_CHIUSURA[ruolo]
    it(`«${ruolo}» ${atteso ? 'PUÒ' : 'NON può'} chiudere un avviso`, () => {
      expect(puoChiudereAvviso(ruolo)).toBe(atteso)
    })
  }

  it('i tre ammessi e i due esclusi sono esattamente quelli, e nessun altro', () => {
    // La partizione intera in una riga: se un sesto ruolo nascesse in banca dati
    // e qualcuno lo aggiungesse all'elenco senza passare da una decisione, la
    // prova qui sopra non lo vedrebbe (non è nei cinque) — questa sì.
    expect(CINQUE_RUOLI.filter(puoChiudereAvviso)).toEqual(['titolare', 'tecnico', 'front_desk'])
    expect(CINQUE_RUOLI.filter((r) => !puoChiudereAvviso(r))).toEqual(['admin_rete', 'admin_sistema'])
    expect([...RUOLI_CHIUSURA_AVVISO].sort()).toEqual(['front_desk', 'tecnico', 'titolare'])
  })

  it('🛑 FAIL-CLOSED: ruolo assente, vuoto, o un nome che non esiste → NO', () => {
    // `SchedaLavoroV3` riceve `ruolo?: string | null`: i due casi sono veri, non
    // ipotetici. E non c'è un `if` dedicato a trattarli — `includes()` risponde
    // `false` da sé, così non esiste un secondo posto in cui sbagliare il verso.
    expect(puoChiudereAvviso(null)).toBe(false)
    expect(puoChiudereAvviso(undefined)).toBe(false)
    expect(puoChiudereAvviso('')).toBe(false)
    // `admin` nudo NON esiste in questo progetto (`CLAUDE.md` §9), e `tsc` non
    // protegge dal refuso perché il ruolo è una `string`: lo prende questa riga.
    expect(puoChiudereAvviso('admin')).toBe(false)
    expect(puoChiudereAvviso('front-desk')).toBe(false) // col trattino: refuso classico
    expect(puoChiudereAvviso('Titolare')).toBe(false) // il confronto è esatto, non a maiuscole
  })

  it('l’elenco non contiene nomi che in banca dati non esistono', () => {
    // Il verso opposto della tavola: ogni nome ammesso deve essere un ruolo vero,
    // o il cancello taglierebbe fuori in silenzio chi doveva passare.
    for (const ruolo of RUOLI_CHIUSURA_AVVISO) {
      expect(CINQUE_RUOLI as readonly string[], `«${ruolo}» non è un ruolo di questo progetto`)
        .toContain(ruolo)
    }
  })
})

describe('puoVedereAvviso — la VISIBILITÀ, che è un sottoinsieme del permesso', () => {
  // 🔑 Due funzioni, due mutazioni. Se questa avesse solo la prova
  //    «coincide con puoChiudereAvviso», capovolgerla **da sola** lascerebbe la
  //    suite verde: la tavola qui sotto è scritta a mano proprio per quello.
  for (const ruolo of CINQUE_RUOLI) {
    const atteso = ATTESO_CHIUSURA[ruolo]
    it(`«${ruolo}» ${atteso ? 'VEDE' : 'NON vede'} il promemoria`, () => {
      expect(puoVedereAvviso(ruolo)).toBe(atteso)
    })
  }

  it('🛑 FAIL-CLOSED anche qui: ruolo assente → non si vede niente', () => {
    expect(puoVedereAvviso(null)).toBe(false)
    expect(puoVedereAvviso(undefined)).toBe(false)
    expect(puoVedereAvviso('admin')).toBe(false)
  })

  it('⚖️ D342 — SOTTOINSIEME, mai sovrainsieme: nessuno vede ciò che non può chiudere', () => {
    // «*Non è un bicondizionale — si può mostrare MENO di ciò che si permette,
    // mai il contrario*». Questa è la relazione che deve reggere anche il giorno
    // in cui le due funzioni smettessero di coincidere: si prova l'IMPLICAZIONE,
    // non l'uguaglianza, così restringere la visibilità domani non farà arrossire
    // una prova che parla d'altro.
    for (const ruolo of [...CINQUE_RUOLI, 'admin', '', 'front-desk']) {
      if (puoVedereAvviso(ruolo)) {
        expect(puoChiudereAvviso(ruolo), `«${ruolo}» vedrebbe un avviso che non può chiudere`).toBe(true)
      }
    }
  })
})

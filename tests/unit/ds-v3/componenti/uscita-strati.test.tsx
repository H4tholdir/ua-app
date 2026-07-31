import { type ReactElement, type RefObject } from 'react'
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MotionGlobalConfig } from 'motion/react'

// ═══════════════════════════════════════════════════════════════════════════
// D100 — l'USCITA dei quattro strati sopra la foto.
//
// 🛑 PERCHÉ QUESTO FILE SPEGNE `skipAnimations`, ed è l'unico che lo fa.
//    `tests/setup.ts:16` mette `MotionGlobalConfig.skipAnimations = true` per
//    TUTTA la suite: entrata e uscita diventano istantanee. È giusto per le
//    altre 4.234 prove — nessuna di loro parla di animazioni, e i tempi veri
//    porterebbero flake. Ma qui è esattamente il fatto in esame: **con le
//    animazioni spente un'uscita che non esiste e un'uscita che funziona sono
//    INDISTINGUIBILI**, e una prova che non distingue i due mondi è verde su un
//    difetto vivo. È la lezione ② dell'handoff del 02/08, applicata a un altro
//    strumento: là era jsdom che non esegue la traversal di `history.back()`,
//    qui è la suite che spegne il movimento.
//
// 🔑 E LE ASSERZIONI NON DIPENDONO DA UN TEMPO. Sono due fatti sincroni, veri
//    nel commit React subito dopo la chiusura:
//      ① lo strato è ANCORA nel documento (se sparisse di taglio, non ci sarebbe);
//      ② la sua radice ha `pointer-events: none` (se non ce l'avesse, per tutta
//        l'uscita si mangerebbe i tocchi diretti alla scheda dietro).
//    Nessun `setTimeout`, nessuna soglia in millisecondi: la rimozione si
//    aspetta con `waitForElementToBeRemoved`, che non ha un tempo suo da
//    indovinare. Per questo il file non riapre il flake che `skipAnimations`
//    era stato messo a chiudere (intervento 22/07, v. `sheet-dialog.test.tsx:267`).
//
// ⚠️ ① NON è una prova della bellezza dell'uscita — quella non si prova in
//    jsdom, e non si prova affatto: si guarda. Questa rete prova che l'uscita
//    ESISTE e che non lascia una finestra morta ai tocchi. Il giudizio estetico
//    è di Francesco, in produzione (D99: niente anteprima).
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn(), initSuoni: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))

import { VisoreFoto } from '@/components/ds/VisoreFoto'
import { TendinaMenu } from '@/components/ds/TendinaMenu'
import { FoglioConferma } from '@/components/ds/FoglioConferma'
import { FoglioCategoria } from '@/components/ds/FoglioCategoria'

const FOTO = [
  { id: 'f1', url: 'https://esempio/1.jpg', categoria: 'impronta', created_at: '2026-08-01T09:00:00Z', nome_file: null },
  { id: 'f2', url: 'https://esempio/2.jpg', categoria: 'rx', created_at: '2026-08-01T10:00:00Z', nome_file: null },
]

/** Un'àncora VERA nel documento: gli strati avvisano in sviluppo se è vuota, e
 *  un avviso in mezzo alle prove è rumore che nasconde i guasti veri. */
function ancora(): RefObject<HTMLElement | null> {
  const tasto = document.createElement('button')
  tasto.textContent = 'apri'
  document.body.appendChild(tasto)
  return { current: tasto }
}

/** La radice dello strato: l'unico nodo che porta `data-ds="v3"` in tutti e
 *  quattro. Presa dal pannello e non per classe, così la prova vale identica
 *  sui quattro senza conoscere i loro nomi di classe. */
function radiceDi(pannello: HTMLElement): HTMLElement {
  const r = pannello.closest('[data-ds="v3"]')
  if (!(r instanceof HTMLElement)) throw new Error('lo strato non ha una radice `data-ds="v3"`')
  return r
}

type Caso = {
  nome: string
  /** Il pannello vivo, come lo trova chi guarda lo schermo. */
  pannello: () => HTMLElement | null
  vista: (aperto: boolean) => ReactElement
}

const CASI: Caso[] = [
  {
    nome: 'VisoreFoto (§5.39)',
    pannello: () => screen.queryByRole('dialog'),
    vista: (aperto) => (
      <VisoreFoto
        aperto={aperto}
        foto={FOTO}
        indice={0}
        onIndice={() => {}}
        onChiudi={() => {}}
        onCorreggiCategoria={() => {}}
        ancoraFocus={ancora()}
      />
    ),
  },
  {
    nome: 'TendinaMenu (§5.40)',
    pannello: () => screen.queryByRole('menu'),
    vista: (aperto) => (
      <TendinaMenu
        aperta={aperto}
        voci={[{ id: 'v1', testo: 'Scarica', icona: <path d="M0 0" />, onScegli: () => {} }]}
        onChiudi={() => {}}
        etichettaAria="Cose da fare su questa foto"
        ancora={ancora()}
      />
    ),
  },
  {
    nome: 'FoglioConferma (§5.42)',
    pannello: () => screen.queryByRole('dialog'),
    vista: (aperto) => (
      <FoglioConferma
        aperto={aperto}
        titolo="Elimini questa foto?"
        testo="Sparisce dalla scheda e dall'archivio."
        etichettaDistruttiva="Elimina foto"
        etichettaSicura="Annulla"
        foto={FOTO[0]}
        ancoraFocus={ancora()}
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    ),
  },
  {
    nome: 'FoglioCategoria (§5.41)',
    pannello: () => screen.queryByRole('dialog'),
    vista: (aperto) => (
      <FoglioCategoria
        aperto={aperto}
        quante={1}
        anteprime={[FOTO[0].url]}
        ancoraFocus={ancora()}
        onScegli={() => {}}
        onChiudi={() => {}}
      />
    ),
  },
]

beforeEach(() => {
  // Il movimento ACCESO: è il punto del file (v. il commento di testa).
  MotionGlobalConfig.skipAnimations = false
})

afterEach(() => {
  MotionGlobalConfig.skipAnimations = true
  // Nessuna prova deve lasciare il corpo bloccato per la successiva.
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

describe('D100 — i quattro strati sopra la foto ESCONO, non spariscono di taglio', () => {
  for (const caso of CASI) {
    describe(caso.nome, () => {
      it('alla chiusura resta a schermo mentre esce, e poi se ne va', async () => {
        const { rerender } = render(caso.vista(true))
        const vivo = caso.pannello()
        expect(vivo).not.toBeNull()

        rerender(caso.vista(false))

        // 🔴 IL FATTO IN ESAME. Senza `AnimatePresence` questo nodo è già
        //    staccato dal documento in questo istante: è lo «sparire di taglio».
        expect(caso.pannello()).not.toBeNull()

        await waitForElementToBeRemoved(() => caso.pannello())
      })

      it('mentre esce NON prende più i tocchi: la radice va a `pointer-events: none`', async () => {
        const { rerender } = render(caso.vista(true))
        const pannello = caso.pannello()
        expect(pannello).not.toBeNull()
        // Da aperto i tocchi arrivano: il velo si tocca per chiudere.
        expect(radiceDi(pannello!).style.pointerEvents).not.toBe('none')

        rerender(caso.vista(false))

        const uscente = caso.pannello()
        expect(uscente).not.toBeNull()
        // 🔴 La finestra morta: senza questa riga, per tutta l'uscita un tocco
        //    diretto alla scheda dietro finisce nello strato che sta sparendo.
        expect(radiceDi(uscente!).style.pointerEvents).toBe('none')

        await waitForElementToBeRemoved(() => caso.pannello())
      })

      it('lo scorrimento del corpo si rilascia a uscita FINITA, non a metà', async () => {
        const { rerender } = render(caso.vista(true))
        expect(document.body.style.overflow).toBe('hidden')

        rerender(caso.vista(false))

        // 🔴 A metà uscita il corpo è ancora bloccato: rilasciarlo qui fa
        //    ricomparire la barra di scorrimento e la pagina DIETRO slitta di
        //    lato mentre il velo si sta ancora dissolvendo (difetto già pagato
        //    in collaudo su `Sheet`, v. `Sheet.tsx:203-230`).
        expect(document.body.style.overflow).toBe('hidden')

        await waitForElementToBeRemoved(() => caso.pannello())
        await waitFor(() => expect(document.body.style.overflow).toBe(''))
      })

      it('riaprire mentre esce non lascia il corpo bloccato per sempre', async () => {
        const { rerender } = render(caso.vista(true))
        rerender(caso.vista(false))
        // Riapertura DENTRO la finestra d'uscita: è il gesto vero di chi
        // sbaglia strato e torna indietro subito.
        rerender(caso.vista(true))
        expect(caso.pannello()).not.toBeNull()
        expect(document.body.style.overflow).toBe('hidden')

        rerender(caso.vista(false))
        await waitForElementToBeRemoved(() => caso.pannello())
        await waitFor(() => expect(document.body.style.overflow).toBe(''))
      })
    })
  }
})

describe('D100 — «riduci movimento»: l\'uscita resta, ma non fa aspettare', () => {
  let ripristina: () => void

  beforeEach(() => {
    const originale = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
    ripristina = () => {
      window.matchMedia = originale
    }
  })

  afterEach(() => ripristina())

  for (const caso of CASI) {
    it(`${caso.nome}: se ne va e non lascia niente appeso`, async () => {
      const { rerender } = render(caso.vista(true))
      expect(caso.pannello()).not.toBeNull()

      rerender(caso.vista(false))

      // 🔑 Qui NON si pretende che resti a schermo: a movimento ridotto la
      //    transizione è `istantaneo` e lo strato può essere già via. Il fatto
      //    che conta è l'opposto — che non resti appeso e che il corpo torni
      //    libero. Un'uscita a durata zero che non completa mai bloccherebbe la
      //    pagina sotto le dita per sempre.
      await waitFor(() => expect(caso.pannello()).toBeNull())
      await waitFor(() => expect(document.body.style.overflow).toBe(''))
    })
  }
})

describe('D100 — la regressione da non riaprire: il montaggio resta SEMPRE (lezione ①)', () => {
  it('a strato chiuso il documento è pulito: nessun pannello, nessun blocco', () => {
    for (const caso of CASI) {
      const { unmount } = render(caso.vista(false))
      expect(caso.pannello()).toBeNull()
      expect(document.body.style.overflow).toBe('')
      unmount()
    }
  })

  it('lo smontaggio a strato APERTO non lascia il corpo bloccato', async () => {
    for (const caso of CASI) {
      const { unmount } = render(caso.vista(true))
      expect(document.body.style.overflow).toBe('hidden')
      unmount()
      await waitFor(() => expect(document.body.style.overflow).toBe(''))
    }
  })
})

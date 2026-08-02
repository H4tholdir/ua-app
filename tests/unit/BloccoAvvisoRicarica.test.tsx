// UÀ — BloccoAvvisoRicarica (P17, coda del Task 4)
//
// 🔑 PERCHÉ QUESTO COMPONENTE ESISTE, e quindi cosa deve provare questo file:
//    la scheda dentista (`clienti/[id]/page.tsx`) è un componente SERVER, e una
//    funzione non attraversa il confine RSC — non è serializzabile. Il disegno
//    approvato (D161, variante «a blocco») vuole un tasto «Ricarica» sul caso
//    ⑦c «non riesco a leggere il registro», e da lì un `onClick` non si può
//    passare. Questo è il pezzo client minimo che lo rende possibile.
//
// 🛑 Le prove qui NON ridimostrano `BloccoAvviso` (ha già le sue in
//    `tests/unit/BloccoAvviso.test.tsx`): provano il PONTE — che l'azione esista
//    davvero, che porti l'etichetta approvata, e che alla pressione RICARICHI i
//    dati invece di NAVIGARE.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const refreshMock = vi.fn()
const pushMock = vi.fn()

// Stesso impianto dei 56 file di prova che già mockano `next/navigation` in
// questo repo (es. `nota-credito-button.test.tsx:7-9`).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

import { BloccoAvvisoRicarica } from '../../src/components/feedback/BloccoAvvisoRicarica'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BloccoAvvisoRicarica — il blocco d\'avviso che sa rileggere i dati', () => {
  it('rende il blocco con titolo e testo, annunciato alle tecnologie assistive', () => {
    render(
      <BloccoAvvisoRicarica
        tipo="attesa"
        titolo="Non riesco a leggere il registro"
        testo="Il contratto potrebbe essere già stato emesso: questa riga non fa fede."
      />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Non riesco a leggere il registro')).toBeInTheDocument()
    expect(
      screen.getByText('Il contratto potrebbe essere già stato emesso: questa riga non fa fede.'),
    ).toBeInTheDocument()
  })

  // 🛑 L'INTERO motivo per cui questo componente esiste: senza il tasto, il caso
  //    ⑦c resta il blocco SENZA AZIONE che il piano ha riferito come difetto.
  it('rende un tasto vero, con l\'etichetta APPROVATA nel mockup («Ricarica»)', () => {
    render(<BloccoAvvisoRicarica tipo="attesa" titolo="T" testo="X" />)

    expect(screen.getByRole('button', { name: 'Ricarica' })).toBeInTheDocument()
  })

  // 🛑 `refresh`, MAI `push`. Sono due cose opposte: `push` impilerebbe una
  //    seconda copia della stessa pagina (una pressione «indietro» morta),
  //    `refresh` riesegue il componente server — cioè rifà la lettura del
  //    registro che era fallita. È tutto il senso del tasto.
  it('alla pressione RICARICA i dati della pagina, e NON naviga', () => {
    render(<BloccoAvvisoRicarica tipo="attesa" titolo="T" testo="X" />)

    fireEvent.click(screen.getByRole('button', { name: 'Ricarica' }))

    expect(refreshMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalled()
  })

  // Il `tipo` non è decorativo: porta la striscia e l'icona. Se il ponte lo
  // ingoiasse (o lo fissasse a un valore solo), i due casi si vedrebbero uguali.
  it('passa il `tipo` al blocco: attesa e guasto NON si vedono uguali', () => {
    const { container: attesa } = render(<BloccoAvvisoRicarica tipo="attesa" titolo="T" testo="X" />)
    const { container: guasto } = render(<BloccoAvvisoRicarica tipo="guasto" titolo="T" testo="X" />)

    expect(attesa.querySelector('svg')?.innerHTML).not.toBe(guasto.querySelector('svg')?.innerHTML)
    expect(attesa.innerHTML).toContain('var(--c-amber')
    expect(guasto.innerHTML).toContain('var(--primary')
  })

  // 🛑 Nessun TESTO nuovo su `--t2`/`--t3`: falliscono il contrasto in modo
  //    scuro (P16, deferita da D134). ⚠️ `--t3` compare lo stesso nel markup, ma
  //    SOLO come bordo del tasto — è il disegno approvato, ed è già riferito al
  //    gate FASE 9b (`BloccoAvviso.tsx:74-79`). L'asserzione distingue le due
  //    cose: vieta `color: var(--t3…)`, non l'occorrenza del nome.
  it('non colora nessun testo con --t2 né con --t3', () => {
    const { container } = render(<BloccoAvvisoRicarica tipo="attesa" titolo="T" testo="X" />)

    expect(container.innerHTML).not.toContain('var(--t2')
    expect(container.innerHTML).not.toMatch(/color:\s*var\(--t3/)
  })
})

// ── Forza delle prove, contata (R-P4) ────────────────────────────────────────
// Il primo rosso era «modulo non trovato», e quello non prova NIENTE. Contro un
// abbozzo inerte (`return <div />`) si sono accese **4 prove su 5**:
//   × il blocco con titolo e testo  × il tasto «Ricarica»
//   × la pressione che ricarica     × il `tipo` che arriva al blocco
//   ✓ «non colora nessun testo con --t2 né --t3» — VERDE su un albero VUOTO.
// 🔑 Quella quinta si dichiara per quello che è: un **guard-rail**, non una
//    prova. Non guida il codice, si accende solo se un giorno qualcuno mette un
//    testo su quei due colori. Contarla fra le prove che «passano» sarebbe
//    gonfiare il numero.
//
// ── Forme d'ingresso, e quelle NON coperte con il loro perché (R-P4) ──────────
// ✅ coperte: `tipo` in entrambi i valori · titolo e testo · una pressione.
// ⛔ `non provato:` **due pressioni rapide**. Il tasto cambia etichetta mentre
//    ricarica (`useTransition`), e sarebbe la difesa naturale da provare — ma
//    qui `refresh` è un finto che risponde all'istante, quindi la transizione si
//    chiude prima che si possa osservare `isPending`. Un'asserzione su
//    «Ricarico…» sarebbe VERDE perché il finto è istantaneo, non perché il
//    codice funziona: è la stessa trappola di `UA_LAB_GUARD_MODE` e di
//    `process.env.TZ` già pagata due volte in questa ondata. Meglio nessuna
//    asserzione che una bugiarda. Lo stato in corso si guarda in FASE 9b.
// ⛔ `non provato:` **il refresh che fallisce a sua volta**. `router.refresh()`
//    non restituisce una promessa e non solleva: un secondo guasto di lettura
//    torna semplicemente come lo stesso blocco. È un fatto di prodotto (riferito
//    nel referto), non un ramo di codice da coprire.

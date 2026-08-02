'use client'

// UÀ — BloccoAvviso (DS v2.3)
// Il blocco che dice CHE COSA non va e CHE COSA si può fare. Presentazione
// pura: non sa di DPA, di contratti né di documenti — è ciò che lo rende
// ereditabile dall'ondata della firma a distanza (D162).
//
// 🛑 v2.3 e non v3: le superfici che lo usano oggi non sono migrate, e i due
//    sistemi non si mischiano MAI nella stessa pagina (DS v3 §14).
// 🛑 Ogni testo su `--t1`: `--t2` (4,45:1) e `--t3` (2,24:1) falliscono WCAG
//    sul fondo card scuro. È P16, deferita da D134 — ma un testo NUOVO non
//    deve nascere col difetto che si è scelto di rimandare.
// ⚠️ Il precedente di casa (`TracciabilitaMaterialiBanner`) usa `--t2` per il
//    corpo: qui si segue il suo impianto, NON quel colore.

import type { ReactElement } from 'react'
import Link from 'next/link'

export type TipoAvviso = 'attesa' | 'guasto'

type Azione =
  | { etichetta: string; href: string }
  | { etichetta: string; onClick: () => void }

interface Props {
  /** `attesa` = manca un dato, l'utente può rimediare · `guasto` = si è rotto qualcosa di nostro */
  tipo: TipoAvviso
  titolo: string
  testo: string
  azione?: Azione
}

/** 🔄 CORRETTO il 02/08/2026 dall'esecutore del Task 2: il piano scriveva
 *  `var(--amber, #F59E0B)`, e quel nome NON porta quel colore.
 *  `misurato:` `globals.css:91` → `--amber: #FD7E14` (arancio, warning MDR),
 *  mentre `#F59E0B` è `--c-amber` (`globals.css:97`). L'equivoco nasce da
 *  `src/design-system/tokens.ts:39`, dove la voce si chiama `amber` e vale
 *  `#F59E0B`: il nome del token TypeScript e quello della variabile CSS sono
 *  due nomi diversi per due colori diversi.
 *  `provato:` campionando il pixel della striscia nello scatto APPROVATO
 *  (`docs/design/mockups/screenshots/2026-08-02-p17-mobile-light-variante-b.png`)
 *  → `(245, 158, 11)`, cioè `#F59E0B`. Col nome del piano la striscia sarebbe
 *  nata di un colore che Francesco non ha mai visto.
 *  ✅ `--c-amber` non è ridefinito in `.dark`: vale in entrambi i modi, come
 *  nel mockup. */
const COLORE: Record<TipoAvviso, { striscia: string; fondo: string }> = {
  attesa: { striscia: 'var(--c-amber, #F59E0B)', fondo: 'rgba(245, 158, 11, 0.14)' },
  guasto: { striscia: 'var(--primary, #D90012)', fondo: 'rgba(217, 0, 18, 0.10)' },
}

function Icona({ tipo }: { tipo: TipoAvviso }) {
  // Due disegni DIVERSI, non lo stesso in due colori: il colore non deve mai
  // essere l'unica fonte di stato (chi non lo distingue vede comunque la forma).
  return tipo === 'attesa' ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: 'none', marginTop: '1px' }}>
      <path d="M8 1.5L15 14H1L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6.2v3.4M8 11.6v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: 'none', marginTop: '1px' }}>
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const stileAzione = {
  display: 'inline-flex',
  alignItems: 'center',
  height: '34px',
  marginTop: '8px',
  padding: '0 12px',
  borderRadius: '8px',
  // 📌 `--t3` qui è il BORDO, non un testo: il vincolo «ogni testo nuovo su
  //    `--t1`» resta intatto e P16 non si riapre. È il mockup approvato
  //    (`.blocco .azione`). ⚠️ `misurato:` come confine di un elemento
  //    premibile dà 4,49:1 in chiaro e 1,72:1 in SCURO, sotto il 3:1 che
  //    WCAG 1.4.11 chiede al bordo di un comando. Riferito al gate FASE 9b
  //    del Task 5 — non corretto qui, perché è il disegno approvato.
  border: '1px solid var(--t3, #6B5C51)',
  background: 'transparent',
  color: 'var(--t1, #1C1916)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12.5px',
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
} as const

export function BloccoAvviso({ tipo, titolo, testo, azione }: Props): ReactElement {
  const colore = COLORE[tipo]
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        borderRadius: '10px',
        padding: '10px 12px',
        margin: '10px 0 0',
        borderLeft: `3px solid ${colore.striscia}`,
        background: colore.fondo,
        /* 🔄 CORRETTO il 02/08/2026 dall'esecutore del Task 2: qui il piano
         *  scriveva `color: colore.bordo`, cioè tingeva l'ICONA del colore del
         *  tipo (l'icona disegna con `currentColor`). Nel mockup APPROVATO
         *  `.blocco` non dichiara nessun `color`: l'icona eredita il testo e il
         *  colore resta tutto nella striscia.
         *  `provato:` il pixel dell'icona nello scatto approvato → `(28, 25, 22)`
         *  = `#1C1916` = `--t1`, non ambra.
         *  🛑 E non è solo fedeltà al disegno: `misurato:` l'ambra sul fondo del
         *  blocco in modo CHIARO dà 1,80:1 col nome scritto nel piano e 1,50:1
         *  col colore del mockup, contro i 12,26:1 di `--t1`. Il documento di
         *  design (§4) chiede a un segno grafico di reggere 3:1 — l'icona tinta
         *  non ci arrivava, ed è proprio il segno che deve reggere quando il
         *  colore non si distingue.
         *  ⚠️ La riga «il colore sta nell'icona e nella striscia» del §4 descrive
         *  la VARIANTE A, dove il segno è `#7A5500` in chiaro proprio perché
         *  l'ambra piena lì non tiene. La variante approvata è la B, e la B
         *  l'icona non la tinge: non «ripristinarlo» in futuro.
         *  📌 Dichiarato e non ereditato: il `body` dell'app non sta su `--t1`
         *  ma su `text-foreground` (oklch), quindi l'ereditarietà del mockup
         *  qui non si riprodurrebbe da sola. */
        color: 'var(--t1, #1C1916)',
      }}
    >
      <Icona tipo={tipo} />
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12.5px', lineHeight: 1.5, color: 'var(--t1, #1C1916)' }}>
        <strong style={{ display: 'block', fontWeight: 700, marginBottom: '2px' }}>{titolo}</strong>
        {testo}
        {azione && (
          <div>
            {'href' in azione ? (
              /* 🔄 CORRETTO il 02/08/2026 dall'esecutore del Task 2: il piano
               *  usava un `<a href>` nudo. In una PWA installata quello è un
               *  RICARICAMENTO dell'intero documento — si perde lo scorrimento,
               *  si rilegge tutto, e si vede il lampo bianco.
               *  `provato:` in `src/components` non esiste un solo `<a href="/…">`
               *  interno (0 occorrenze) e 16 file usano `next/link`, fra cui
               *  `features/clienti/ClientiSearchList.tsx`, cioè la stessa area di
               *  questa scheda. `provato:` `next/link` rende un `link` col suo
               *  `href` anche sotto prova in jsdom, senza alcun finto
               *  (`tests/unit/CicliProduzioneList.test.tsx:26`). */
              <Link href={azione.href} style={stileAzione}>{azione.etichetta}</Link>
            ) : (
              <button type="button" onClick={azione.onClick} style={stileAzione}>{azione.etichetta}</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

// UÀ — BloccoAvvisoRicarica (P17, coda del Task 4 — DS v2.3)
// Il blocco d'avviso che, oltre a dire che cosa non va, sa RIFARE la lettura
// fallita.
//
// 🔑 PERCHÉ ESISTE UN COMPONENTE APPOSTA, invece di scrivere l'`onClick` dove
//    serve: la scheda dentista (`clienti/[id]/page.tsx`) è un componente
//    SERVER, e una funzione non attraversa il confine RSC — non è
//    serializzabile. Il disegno approvato (D161, variante «a blocco») vuole un
//    tasto «Ricarica» sul caso «non riesco a leggere il registro», e da un
//    componente server quel tasto non si può armare. Questo è il pezzo client
//    minimo che lo rende possibile — e resta un ponte: la presentazione, tutta,
//    è di `BloccoAvviso` (D162, che lo tiene ignaro del dominio proprio perché
//    sia ereditabile).
//
// 🛑 v2.3 e non v3, come il blocco che avvolge: la scheda dentista non è
//    migrata, e i due sistemi non si mischiano nella stessa pagina (DS v3 §14).
//
// 📌 `useNavigaDaOverlay` qui NON c'entra, e la nota serve a chi arriverà con
//    quella regola in testa: quella vale per chi NAVIGA da dentro un overlay v3.
//    Qui non si naviga affatto — si rilegge la stessa pagina — e non c'è nessun
//    overlay. Vedi il commento su `refresh` più sotto.

import { useCallback, useTransition, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { BloccoAvviso, type TipoAvviso } from './BloccoAvviso'

interface Props {
  tipo: TipoAvviso
  titolo: string
  testo: string
}

export function BloccoAvvisoRicarica({ tipo, titolo, testo }: Props): ReactElement {
  const router = useRouter()
  const [inCorso, startTransition] = useTransition()

  const ricarica = useCallback(() => {
    // 🛑 `refresh()`, MAI `push()` — nemmeno verso questa stessa pagina. Sono
    //    due cose opposte: `push` impilerebbe una SECONDA copia della scheda
    //    sopra quella aperta, e la pressione «indietro» diventerebbe morta
    //    (è la famiglia di difetti che ha prodotto `useNavigaDaOverlay`).
    //    `refresh` invece riesegue il componente server e RIFÀ la lettura del
    //    registro che era fallita — che è l'unica cosa che questo tasto promette.
    // 🔑 E la rilettura avviene davvero: la scheda dentista è dinamica per
    //    costruzione (`getLabContext` legge i cookie e interroga `utenti` a ogni
    //    richiesta, `lab-context.ts:34-46`), quindi non c'è nessuna copia in
    //    cache da poter restituire al posto di una query nuova.
    // 📌 Dentro una transizione per avere `inCorso`: senza, una pressione su
    //    rete lenta non darebbe NESSUN segno di essere stata sentita.
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  return (
    <BloccoAvviso
      tipo={tipo}
      titolo={titolo}
      testo={testo}
      // 📌 «Ricarica» è la parola del mockup APPROVATO
      //    (`2026-08-02-p17-scarico-dpa.html:368`, variante B): non è un
      //    sinonimo scelto qui, e non va «migliorata».
      //    ⚠️ `non provato:` l'etichetta in corso. Sotto prova `refresh` è un
      //    finto istantaneo, quindi `inCorso` non è mai osservabile: asserirla
      //    sarebbe verde per colpa del finto, non del codice. Si guarda in
      //    FASE 9b, insieme allo stato in corso del tasto principale.
      //    📌 Lo stato in corso NON è nel mockup — quel disegno mostra solo il
      //    riposo. La forma segue il precedente di casa
      //    (`NotaCreditoButton.tsx:576`, `ScaricaDpaButton` con «Preparo il
      //    documento…»): stesso tasto, etichetta al presente, niente rotelle.
      // 🛑 Nessun `hapticLight()` qui, ed è una scelta: `haptic.ts:3` dice
      //    «solo su azioni critiche/irreversibili». Rileggere un dato non è né
      //    l'una né l'altra — è l'azione più innocua che ci sia.
      azione={{ etichetta: inCorso ? 'Ricarico…' : 'Ricarica', onClick: ricarica }}
    />
  )
}

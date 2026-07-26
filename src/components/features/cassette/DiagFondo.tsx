'use client'

import { useEffect, useState } from 'react'

/**
 * OVERLAY DIAGNOSTICO TEMPORANEO — `/cassette?diag=fondo`. Collaudo PWA installata, 26/07/2026.
 * Precedente in questo repo: `59b7cfd3` («overlay suoni ?diag=suoni — evidenza device per H1»).
 * VA RIMOSSO a diagnosi chiusa, insieme a `public/diagnostica-barre.html`.
 *
 * PERCHÉ ESISTE. Francesco vede una striscia panna fra il fondo del muro e il bordo dello schermo,
 * SOLO nella PWA installata. Tre misure che non stanno insieme:
 *  - nell'app installata il documento arriva all'ultimo pixel (PROVA 2: `RESIDUO SCOPERTO: 0 px`);
 *  - sul banco il muro chiude a filo anche al suo viewport esatto (375×755, dpr 3.25, stesse
 *    cassette): `muro.bottom` = `innerHeight`, ed `elementFromPoint` risponde `.ds-parete` fino
 *    all'ultimo pixel;
 *  - sul suo device il muro NON ci arriva.
 * Una delle tre non sta misurando quello che credo. Le prime due sono state prese su pagine di
 * PROVA: questo overlay misura la pagina VERA, che è l'unico posto dove il difetto esiste.
 * È la correzione dell'errore appena commesso — un numero letto in una condizione diversa da
 * quella del difetto non è una misura del difetto.
 *
 * COSA STAMPA. Quanto è alta la finestra, quanto il documento, se si è DAVVERO a fine scroll, e
 * soprattutto i due numeri che decidono: la distanza fra il bordo inferiore del muro e il fondo
 * della finestra, e — la domanda vera — CHI dipinge gli ultimi pixel, chiesto a `elementFromPoint`
 * invece che dedotto.
 *
 * Nessuno stile del design system, nessun token, nessuna animazione: non è una superficie di
 * prodotto e non deve sembrarlo. Senza `?diag=fondo` il componente rende `null` e non registra
 * alcun listener — costo zero sulla pagina normale.
 *
 * `window.location.search` invece di `useSearchParams()`: quest'ultimo obbligherebbe a un confine
 * di Suspense e a ragionare sul prerender, per un overlay che vive pochi giorni.
 */
export function DiagFondo() {
  // Un solo stato, che parte `null` e vale anche da interruttore: senza `?diag=fondo` non viene
  // mai riempito e il componente resta invisibile. Niente `setState` sincrono nel corpo
  // dell'effect (`react-hooks/set-state-in-effect`): la prima misura passa da un frame di
  // animazione, che per giunta è il momento giusto — a layout posato.
  const [righe, setRighe] = useState<string[] | null>(null)

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('diag')) return

    const misura = () => {
      const se = document.scrollingElement
      if (!se) return
      const muro = document.querySelector('[data-ds="v3"] .ds-parete')
      const vh = window.innerHeight
      const max = se.scrollHeight - se.clientHeight
      const giu = Math.round(se.scrollTop)
      const aFondo = max - giu < 2

      // Chi dipinge gli ultimi pixel: la domanda si fa al motore, non al foglio di stile.
      const chi = [1, 8, 20, 40, 60].map((dy) => {
        const el = document.elementFromPoint(Math.round(window.innerWidth / 2), vh - dy)
        if (!el) return `${dy}:—`
        const nome = el.classList.length ? `.${el.classList[0]}` : el.tagName.toLowerCase()
        return `${dy}:${nome}`
      })

      const r: string[] = []
      r.push(`finestra ${vh} · documento ${se.scrollHeight} · impagina ${se.clientHeight}`)
      r.push(aFondo ? `a fine scroll ✓ (${giu}/${Math.round(max)})` : `↓ SCORRI ANCORA (${giu}/${Math.round(max)})`)
      if (muro) {
        const b = muro.getBoundingClientRect().bottom
        const residuo = Math.round(vh - b)
        r.push(`MURO: manca ${residuo} px al fondo${aFondo ? '' : ' (non a fine scroll)'}`)
        r.push(`padding-bottom muro ${getComputedStyle(muro).paddingBottom}`)
      } else {
        r.push('MURO: non trovato')
      }
      r.push(`in fondo → ${chi.join(' ')}`)
      setRighe(r)
    }

    const frame = requestAnimationFrame(misura)
    window.addEventListener('scroll', misura, { passive: true })
    window.addEventListener('resize', misura)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', misura)
      window.removeEventListener('resize', misura)
    }
  }, [])

  if (!righe) return null

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: '#1C1916', color: '#fff', padding: '6px 8px',
        fontFamily: 'ui-monospace, monospace', fontSize: 11, lineHeight: 1.35,
        pointerEvents: 'none', whiteSpace: 'pre-wrap',
      }}
    >
      {righe.join('\n')}
    </div>
  )
}

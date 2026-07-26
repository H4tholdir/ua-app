'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CHIAVE_TEMA,
  MODO_PREDEFINITO,
  isModoTema,
  risolviTema,
  type ModoTema,
} from '@/lib/preferenze/tema'

type TemaRisolto = 'light' | 'dark'

function modoInMemoria(): ModoTema {
  // Lo storage puo' lanciare (privacy del browser, cookie bloccati, WebView,
  // policy aziendali): in quel caso si segue il telefono, come lo script inline.
  try {
    const salvato = localStorage.getItem(CHIAVE_TEMA)
    return isModoTema(salvato) ? salvato : MODO_PREDEFINITO
  } catch {
    return MODO_PREDEFINITO
  }
}

function telefonoScuro(): boolean {
  return !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Si scrivono ENTRAMBI: data-theme e la classe. L'attributo e' il denominatore
// comune (admin-nav scriveva solo quello), ma meta' del CSS e' ancora agganciata
// a .dark — finche' e' cosi', chi muove il tema muove tutti e due.
function applicaAlDocumento(tema: TemaRisolto): void {
  const html = document.documentElement
  if (tema === 'dark') {
    html.classList.add('dark')
    html.setAttribute('data-theme', 'dark')
  } else {
    html.classList.remove('dark')
    html.setAttribute('data-theme', 'light')
  }
}

/**
 * L'unico modo, dentro React, di leggere e cambiare il tema.
 *
 * `toggle` e `isDark` non esistono piu': erano la firma dell'interruttore a due
 * stati, e con essi sparivano i sei punti che decidevano il tema per conto loro.
 * Chi vuole cambiare il tema passa da `impostaModo`, che e' montato in un posto
 * solo (Impostazioni → Tema).
 */
export function useTheme() {
  // Lo stato iniziale e' quello che renderizza anche il server, che non ha ne'
  // localStorage ne' matchMedia: senza questo si avrebbe un hydration mismatch
  // su tutto cio' che dipende dal tema. Il valore vero si legge dopo il mount.
  // Il colore visibile, intanto, e' gia' quello giusto: lo ha scritto lo script
  // inline di ThemeInitializer prima della prima pittura.
  const [modo, setModo] = useState<ModoTema>(MODO_PREDEFINITO)
  const [temaRisolto, setTemaRisolto] = useState<TemaRisolto>('light')
  const [montato, setMontato] = useState(false)

  useEffect(() => {
    const inMemoria = modoInMemoria()
    // Sync una tantum al mount da fonti esterne (storage, telefono), mai
    // disponibili server-side: non innesca cascata, le dipendenze sono vuote.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModo(inMemoria)
    setTemaRisolto(risolviTema(inMemoria, telefonoScuro()))
    setMontato(true)
  }, [])

  // Si tocca il DOM solo dopo aver letto il valore vero. Se questo girasse anche
  // con lo stato iniziale finto, toglierebbe per un istante la classe 'dark' che
  // lo script inline ha gia' messo: lampo scuro → chiaro → scuro.
  useEffect(() => {
    if (!montato) return
    applicaAlDocumento(temaRisolto)
  }, [temaRisolto, montato])

  // Il telefono che cambia idea conta SOLO quando il tema non e' bloccato. E'
  // qui che «Automatico» si distingue da «Sempre chiaro»: non da come parte
  // l'app, ma da che cosa fa quando il telefono cambia a app aperta.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const alCambio = (e: MediaQueryListEvent) => {
      if (modo !== 'sistema') return
      setTemaRisolto(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', alCambio)
    return () => mq.removeEventListener('change', alCambio)
  }, [modo])

  const impostaModo = useCallback((nuovo: ModoTema) => {
    setModo(nuovo)
    setTemaRisolto(risolviTema(nuovo, telefonoScuro()))
    try {
      localStorage.setItem(CHIAVE_TEMA, nuovo)
    } catch {
      // La preferenza non sopravvivera' alla chiusura, ma la sessione corrente
      // deve comunque rispettarla: lo stato React sopra e' gia' aggiornato.
    }
  }, [])

  return { modo, temaRisolto, impostaModo }
}

import { describe, it, expect, beforeEach } from 'vitest'
import { COLORE_BARRA } from '@/design-system/colore-barra-sistema'
import { luce, notte } from '@/design-system/v3/tokens'
import { SCRIPT_TEMA } from '@/components/layout/ThemeInitializer'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

function metaTemi(): string[] {
  return Array.from(document.querySelectorAll('meta[name="theme-color"]'))
    .map(m => m.getAttribute('content') ?? '')
}

describe('COLORE_BARRA — deriva dal fondo, non lo ridigita', () => {
  it('vale esattamente il fondo dei token v3', () => {
    expect(COLORE_BARRA.light).toBe(luce.bg)
    expect(COLORE_BARRA.dark).toBe(notte.bg)
  })

  // I valori finiscono INTERPOLATI dentro apici singoli nella stringa di uno script
  // iniettato via dangerouslySetInnerHTML. Un valore con un apice, un backslash o
  // '</script' produrrebbe un errore di sintassi che il try/catch dello script NON
  // puo' catturare (uccide lo script che lo contiene) — rottura muta in produzione.
  it('sono esadecimali a sei cifre, interpolabili senza escape', () => {
    for (const valore of Object.values(COLORE_BARRA)) {
      expect(valore).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

function eseguiScript(): void {
  new Function(SCRIPT_TEMA)()
}

function sistemaScuro(scuro: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: scuro && query.includes('dark'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// NOTA sugli osservatori: ogni eseguiScript() installa un MutationObserver su
// documentElement che non viene mai disconnesso (in produzione vive quanto il
// documento, ed e' corretto cosi'). A fine file ne restano diversi vivi sullo
// stesso documento: innocui, perche' scrivono tutti lo stesso valore. Se un
// giorno si volesse asserire QUANTE volte gira barra(), questo va cambiato.
describe('SCRIPT_TEMA — il codice che gira davvero, prima della prima pittura', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    sistemaScuro(false)
  })

  it('senza preferenza, segue il sistema chiaro', () => {
    eseguiScript()

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(metaTemi()).toEqual([COLORE_BARRA.light])
  })

  it('senza preferenza, segue il sistema scuro', () => {
    sistemaScuro(true)

    eseguiScript()

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  it('la preferenza salvata vince sul sistema', () => {
    sistemaScuro(true)
    localStorage.setItem('ua-theme', 'light')

    eseguiScript()

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(metaTemi()).toEqual([COLORE_BARRA.light])
  })

  // Chrome ignora un theme-color che non sta in <head>. querySelectorAll cerca in
  // tutto il documento: senza questa asserzione un appendChild sul body passerebbe.
  it('mette il meta dentro <head>, non altrove', () => {
    eseguiScript()

    const meta = document.querySelector('meta[name="theme-color"]')
    expect(meta?.parentElement).toBe(document.head)
  })

  it('aggiorna il meta gia emesso da Next invece di aggiungerne un altro', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#D90012">'
    sistemaScuro(true)

    eseguiScript()

    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  it('aggiorna TUTTI i meta presenti, non solo il primo', () => {
    document.head.innerHTML =
      '<meta name="theme-color" content="#D90012">' +
      '<meta name="theme-color" content="#D90012" media="(prefers-color-scheme: dark)">'

    eseguiScript()

    expect(metaTemi()).toEqual([COLORE_BARRA.light, COLORE_BARRA.light])
  })

  it('non tocca i meta di altro nome', () => {
    document.head.innerHTML = '<meta name="description" content="UA">'

    eseguiScript()

    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('UA')
    expect(metaTemi()).toEqual([COLORE_BARRA.light])
  })

  it('segue dal vivo il cambio di data-theme — e questa e la cosa da provare sul device', async () => {
    eseguiScript()
    expect(metaTemi()).toEqual([COLORE_BARRA.light])

    document.documentElement.setAttribute('data-theme', 'dark')
    await new Promise(r => setTimeout(r, 0))

    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  // Chiude il caso «scatta solo la prima volta»: l'osservatore deve reggere le
  // alternanze, non un singolo cambio.
  it('regge le alternanze ripetute, non solo il primo cambio', async () => {
    eseguiScript()

    for (const atteso of ['dark', 'light', 'dark'] as const) {
      document.documentElement.setAttribute('data-theme', atteso)
      await new Promise(r => setTimeout(r, 0))
      expect(metaTemi()).toEqual([COLORE_BARRA[atteso]])
    }
  })

  it('con data-theme RIMOSSO torna chiaro, non scuro (caso ds-v3-catalogo)', async () => {
    localStorage.setItem('ua-theme', 'dark')
    eseguiScript()
    expect(metaTemi()).toEqual([COLORE_BARRA.dark])

    document.documentElement.removeAttribute('data-theme')
    await new Promise(r => setTimeout(r, 0))

    expect(metaTemi()).toEqual([COLORE_BARRA.light])
  })

  // Il difetto trovato in review, misurato: con localStorage che lancia (privacy
  // del browser, cookie bloccati, WebView, policy aziendali) un try unico faceva
  // cadere TUTTO — niente tema, niente classe, niente meta — e da quando layout.tsx
  // non dichiara piu' themeColor non c'e' nemmeno piu' un colore di riserva
  // nell'HTML. Lo storage deve degradare al sistema, non azzerare lo script.
  it('se localStorage lancia, degrada al sistema invece di cadere del tutto', () => {
    const originale = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError: storage bloccato') },
    })
    sistemaScuro(true)

    try {
      eseguiScript()

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(metaTemi()).toEqual([COLORE_BARRA.dark])
    } finally {
      if (originale) Object.defineProperty(window, 'localStorage', originale)
    }
  })

  it('non contiene colori scritti a mano', () => {
    expect(SCRIPT_TEMA).toContain(COLORE_BARRA.light)
    expect(SCRIPT_TEMA).toContain(COLORE_BARRA.dark)
    expect(SCRIPT_TEMA).not.toContain('#D90012')
  })
})

describe('layout.tsx — nessun theme-color posseduto da React', () => {
  const sorgente = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf-8')

  it('l_export viewport non dichiara themeColor', () => {
    const blocco = sorgente.slice(
      sorgente.indexOf('export const viewport'),
      sorgente.indexOf('export default function RootLayout'),
    )

    expect(blocco.length).toBeGreaterThan(0)
    expect(blocco).not.toContain('themeColor')
  })

  it('non contiene piu il rosso della barra', () => {
    expect(sorgente).not.toContain('#D90012')
  })

  it('conserva viewportFit cover, che serve alla PWA', () => {
    expect(sorgente).toContain("viewportFit: 'cover'")
  })

  it('non tocca statusBarStyle di Apple, che e un altra piattaforma', () => {
    expect(sorgente).toContain("statusBarStyle: 'default'")
  })

  // Oggi layout.tsx e' l'unico export viewport dell'app, ma niente lo presidia:
  // una pagina futura che dichiara themeColor reintrodurrebbe un meta posseduto
  // da React, rimontabile a ogni navigazione, e nessun test se ne accorgerebbe.
  it('NESSUNA pagina di src/app dichiara themeColor', () => {
    const colpevoli: string[] = []

    // Si guarda il codice, non i commenti: layout.tsx nomina 'themeColor' proprio
    // nella riga che spiega perche' non lo dichiara piu'.
    const senzaCommenti = (sorgente: string) =>
      sorgente
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map(riga => riga.replace(/\/\/.*$/, ''))
        .join('\n')

    function scandaglia(cartella: string): void {
      for (const voce of readdirSync(cartella)) {
        const percorso = join(cartella, voce)
        if (statSync(percorso).isDirectory()) {
          scandaglia(percorso)
        } else if (voce.endsWith('.tsx') || voce.endsWith('.ts')) {
          const codice = senzaCommenti(readFileSync(percorso, 'utf-8'))
          if (codice.includes('themeColor')) colpevoli.push(percorso)
        }
      }
    }

    scandaglia(resolve(process.cwd(), 'src/app'))

    expect(colpevoli).toEqual([])
  })
})

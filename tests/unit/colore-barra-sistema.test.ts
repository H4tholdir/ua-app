import { describe, it, expect, beforeEach } from 'vitest'
import { COLORE_BARRA, impostaColoreBarra } from '@/design-system/colore-barra-sistema'
import { luce, notte } from '@/design-system/v3/tokens'
import { SCRIPT_TEMA } from '@/components/layout/ThemeInitializer'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function metaTemi(): string[] {
  return Array.from(document.querySelectorAll('meta[name="theme-color"]'))
    .map(m => m.getAttribute('content') ?? '')
}

describe('COLORE_BARRA — deriva dal fondo, non lo ridigita', () => {
  it('vale esattamente il fondo dei token v3', () => {
    expect(COLORE_BARRA.light).toBe(luce.bg)
    expect(COLORE_BARRA.dark).toBe(notte.bg)
  })
})

describe('impostaColoreBarra — upsert, mai no-op silenzioso', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('crea il meta quando non ce ne sono', () => {
    expect(metaTemi()).toHaveLength(0)

    impostaColoreBarra('dark')

    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  it('aggiorna TUTTI i meta presenti, non solo il primo', () => {
    document.head.innerHTML =
      '<meta name="theme-color" content="#D90012">' +
      '<meta name="theme-color" content="#D90012" media="(prefers-color-scheme: dark)">'

    impostaColoreBarra('light')

    expect(metaTemi()).toEqual([COLORE_BARRA.light, COLORE_BARRA.light])
  })

  it('non ne crea un secondo se ce n_e gia uno', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#D90012">'

    impostaColoreBarra('dark')

    expect(metaTemi()).toHaveLength(1)
    expect(metaTemi()[0]).toBe(COLORE_BARRA.dark)
  })

  it('non tocca i meta di altro nome', () => {
    document.head.innerHTML = '<meta name="description" content="UA">'

    impostaColoreBarra('dark')

    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('UA')
    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
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
    expect(metaTemi()).toEqual([COLORE_BARRA.light])
  })

  it('senza preferenza, segue il sistema scuro', () => {
    sistemaScuro(true)

    eseguiScript()

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  it('la preferenza salvata vince sul sistema', () => {
    sistemaScuro(true)
    localStorage.setItem('ua-theme', 'light')

    eseguiScript()

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(metaTemi()).toEqual([COLORE_BARRA.light])
  })

  it('aggiorna il meta gia emesso da Next invece di aggiungerne un altro', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#D90012">'
    sistemaScuro(true)

    eseguiScript()

    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  it('segue dal vivo il cambio di data-theme — e questa e la cosa da provare sul device', async () => {
    eseguiScript()
    expect(metaTemi()).toEqual([COLORE_BARRA.light])

    document.documentElement.setAttribute('data-theme', 'dark')
    await new Promise(r => setTimeout(r, 0))

    expect(metaTemi()).toEqual([COLORE_BARRA.dark])
  })

  it('con data-theme RIMOSSO torna chiaro, non scuro (caso ds-v3-catalogo)', async () => {
    localStorage.setItem('ua-theme', 'dark')
    eseguiScript()
    expect(metaTemi()).toEqual([COLORE_BARRA.dark])

    document.documentElement.removeAttribute('data-theme')
    await new Promise(r => setTimeout(r, 0))

    expect(metaTemi()).toEqual([COLORE_BARRA.light])
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
})

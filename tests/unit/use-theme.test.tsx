import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '@/hooks/useTheme'

type Ascoltatore = (e: { matches: boolean }) => void

// Il mock di matchMedia tiene gli ascoltatori registrati, cosi' si puo' simulare
// il telefono che cambia idea MENTRE l'app e' aperta — che e' l'unico modo per
// distinguere «segue il sistema» da «e' partito uguale al sistema».
let ascoltatori: Ascoltatore[] = []

function sistemaScuro(scuro: boolean): void {
  ascoltatori = []
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: scuro && query.includes('dark'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, l: Ascoltatore) => { ascoltatori.push(l) },
      removeEventListener: (_: string, l: Ascoltatore) => {
        ascoltatori = ascoltatori.filter(x => x !== l)
      },
      dispatchEvent: () => false,
    }),
  })
}

function ilTelefonoPassaA(scuro: boolean): void {
  for (const ascoltatore of [...ascoltatori]) ascoltatore({ matches: scuro })
}

function temaSullHtml(): string | null {
  return document.documentElement.getAttribute('data-theme')
}

describe('useTheme — tre stati, una regola', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
    sistemaScuro(false)
  })

  it('parte da sistema quando non c_e nessuna preferenza', () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.modo).toBe('sistema')
  })

  it('bloccare il tema lo scrive e lo risolve', () => {
    const { result } = renderHook(() => useTheme())

    act(() => result.current.impostaModo('scuro'))

    expect(result.current.modo).toBe('scuro')
    expect(result.current.temaRisolto).toBe('dark')
    expect(localStorage.getItem('ua-tema')).toBe('scuro')
    expect(temaSullHtml()).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('tornare ad Automatico rimette il telefono al comando', () => {
    sistemaScuro(true)
    const { result } = renderHook(() => useTheme())

    act(() => result.current.impostaModo('chiaro'))
    expect(result.current.temaRisolto).toBe('light')

    act(() => result.current.impostaModo('sistema'))
    expect(result.current.temaRisolto).toBe('dark')
    expect(temaSullHtml()).toBe('dark')
  })

  // Le due prove che distinguono davvero «Automatico» da «bloccato»: non come
  // parte l'app, ma che cosa fa quando il telefono cambia a app aperta.
  it('con Automatico, il telefono che cambia porta con se il tema', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.temaRisolto).toBe('light')

    act(() => ilTelefonoPassaA(true))

    expect(result.current.temaRisolto).toBe('dark')
    expect(temaSullHtml()).toBe('dark')
  })

  it('bloccato, il telefono che cambia non sposta niente', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.impostaModo('chiaro'))

    act(() => ilTelefonoPassaA(true))

    expect(result.current.modo).toBe('chiaro')
    expect(result.current.temaRisolto).toBe('light')
    expect(temaSullHtml()).toBe('light')
  })

  it('legge la preferenza gia in memoria, contro il telefono', () => {
    sistemaScuro(true)
    localStorage.setItem('ua-tema', 'chiaro')

    const { result } = renderHook(() => useTheme())

    expect(result.current.modo).toBe('chiaro')
    expect(result.current.temaRisolto).toBe('light')
  })

  it('un valore non previsto in memoria vale quanto nessun valore', () => {
    sistemaScuro(true)
    localStorage.setItem('ua-tema', 'turchese')

    const { result } = renderHook(() => useTheme())

    expect(result.current.modo).toBe('sistema')
    expect(result.current.temaRisolto).toBe('dark')
  })

  // La chiave vecchia non deve tornare in vita da questa parte: se l'hook la
  // leggesse, chi aveva premuto il sole/luna prima di questa tappa resterebbe
  // bloccato su una scelta che non ha mai espresso.
  it('non guarda la chiave vecchia', () => {
    sistemaScuro(true)
    localStorage.setItem('ua-theme', 'light')

    const { result } = renderHook(() => useTheme())

    expect(result.current.modo).toBe('sistema')
    expect(result.current.temaRisolto).toBe('dark')
  })
})

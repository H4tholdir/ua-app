import { describe, it, expect, beforeEach } from 'vitest'
import { COLORE_BARRA, impostaColoreBarra } from '@/design-system/colore-barra-sistema'
import { luce, notte } from '@/design-system/v3/tokens'

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

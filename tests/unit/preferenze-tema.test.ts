import { describe, it, expect } from 'vitest'
import {
  isModoTema,
  risolviTema,
  CHIAVE_TEMA,
  CHIAVE_VECCHIA,
  MODO_PREDEFINITO,
} from '@/lib/preferenze/tema'

describe('isModoTema — porta stretta', () => {
  it('accetta i tre stati previsti', () => {
    for (const valore of ['sistema', 'chiaro', 'scuro']) {
      expect(isModoTema(valore)).toBe(true)
    }
  })

  // I valori della chiave vecchia devono essere RIFIUTATI: se passassero, chi
  // aveva toccato il vecchio interruttore a due stati resterebbe bloccato su un
  // tema che non ha mai scelto davvero — «Automatico» non gli era stato offerto.
  it('rifiuta i valori della vecchia chiave e ogni altra cosa', () => {
    for (const valore of ['light', 'dark', '', null, undefined, 0, {}, 'Sistema']) {
      expect(isModoTema(valore)).toBe(false)
    }
  })
})

describe('risolviTema — sistema, chiaro, scuro', () => {
  it('con sistema segue il telefono, in entrambi i versi', () => {
    expect(risolviTema('sistema', true)).toBe('dark')
    expect(risolviTema('sistema', false)).toBe('light')
  })

  it('bloccato, ignora il telefono in entrambi i versi', () => {
    expect(risolviTema('chiaro', true)).toBe('light')
    expect(risolviTema('chiaro', false)).toBe('light')
    expect(risolviTema('scuro', true)).toBe('dark')
    expect(risolviTema('scuro', false)).toBe('dark')
  })
})

describe('Le chiavi e il predefinito', () => {
  it('la nuova non è la vecchia', () => {
    expect(CHIAVE_TEMA).toBe('ua-tema')
    expect(CHIAVE_VECCHIA).toBe('ua-theme')
    expect(CHIAVE_TEMA).not.toBe(CHIAVE_VECCHIA)
  })

  it('si parte sempre da sistema: seguire il telefono è il comportamento normale', () => {
    expect(MODO_PREDEFINITO).toBe('sistema')
    expect(isModoTema(MODO_PREDEFINITO)).toBe(true)
  })
})

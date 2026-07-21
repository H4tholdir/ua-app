// tests/unit/preferenze-home.test.ts
// Helper di parsing difensivo per «La tua home» (Task 6). NB percorso: `tests/unit/`, MAI
// `src/lib/preferenze/__tests__/` — quella cartella non esiste in questo repo e
// `vitest.config.ts` (include: 'tests/unit/**/*.test.ts') non la scoprirebbe (RED finto).
import { describe, expect, it } from 'vitest'
import { homePrefDa, isHomePref, pareteIntroVista } from '@/lib/preferenze/home'

describe('homePrefDa', () => {
  it('default due_stanze su null/garbage/valore ignoto', () => {
    expect(homePrefDa(null)).toBe('due_stanze')
    expect(homePrefDa('x')).toBe('due_stanze')
    expect(homePrefDa({ home: 'boh' })).toBe('due_stanze')
  })
  it('legge i 3 valori validi', () => {
    expect(homePrefDa({ home: 'pile' })).toBe('pile')
    expect(homePrefDa({ home: 'parete' })).toBe('parete')
    expect(homePrefDa({ home: 'due_stanze' })).toBe('due_stanze')
  })
  it('ignora chiavi non correlate nell\'oggetto nav_preferences', () => {
    expect(homePrefDa({ parete_intro_vista: true, altro: 42 })).toBe('due_stanze')
  })
})

describe('pareteIntroVista', () => {
  it('false di default, true solo se flag esplicito', () => {
    expect(pareteIntroVista(null)).toBe(false)
    expect(pareteIntroVista(undefined)).toBe(false)
    expect(pareteIntroVista({ parete_intro_vista: true })).toBe(true)
  })
  it('false su valori "truthy ma non true" — solo il booleano true conta', () => {
    expect(pareteIntroVista({ parete_intro_vista: 'true' })).toBe(false)
    expect(pareteIntroVista({ parete_intro_vista: 1 })).toBe(false)
    expect(pareteIntroVista({ parete_intro_vista: false })).toBe(false)
  })
})

// isHomePref è il validatore STRETTO usato dalla route in scrittura (PATCH): a differenza di
// `homePrefDa`, che sui valori fuori enum DEFAULT silenziosamente a 'due_stanze', qui un valore
// fuori enum deve risultare `false` — la route lo trasforma in 422, MAI in un default silenzioso
// che scriverebbe 'due_stanze' senza che l'utente l'abbia scelto (bug segnalato in review).
describe('isHomePref', () => {
  it('true sui 3 valori validi', () => {
    expect(isHomePref('due_stanze')).toBe(true)
    expect(isHomePref('pile')).toBe(true)
    expect(isHomePref('parete')).toBe(true)
  })
  it('false su garbage, null/undefined, numeri, oggetti', () => {
    expect(isHomePref('boh')).toBe(false)
    expect(isHomePref(null)).toBe(false)
    expect(isHomePref(undefined)).toBe(false)
    expect(isHomePref(42)).toBe(false)
    expect(isHomePref({ home: 'pile' })).toBe(false)
  })
})

// L'UNICA regola con cui questa app decide se e' chiara o scura.
//
// Prima ce n'erano QUATTRO, applicate in SETTE posti: la chiave 'ua-theme'
// dell'app, 'prefers-color-scheme' letto per conto proprio dalle quattro
// schermate di autenticazione, 'ua-admin-theme' dell'area amministrazione, due
// superfici a tema fisso, e i toast che seguivano il telefono via next-themes
// senza alcun provider montato. Censimento completo e conseguenze:
// docs/superpowers/specs/2026-07-26-un-tema-solo-e-la-barra-lo-segue-design.md §3.
//
// Qui non si tocca il DOM e non si legge lo storage: solo i valori e la regola,
// cosi' la logica si prova da sola. Chi la applica: ThemeInitializer (prima
// della prima pittura) e useTheme (quando l'utente sceglie).
export type ModoTema = 'sistema' | 'chiaro' | 'scuro'

export const CHIAVE_TEMA = 'ua-tema'

// La chiave vecchia si IGNORA e si cancella, non si converte: conteneva
// 'light'/'dark' scritti da un interruttore a DUE stati, dove «Automatico» non
// era nemmeno offerto. Quel valore non esprime la volonta' di bloccare il tema —
// la esprimerebbe per accidente, lasciando bloccato chi non l'ha mai chiesto.
export const CHIAVE_VECCHIA = 'ua-theme'

// Seguire il telefono e' il comportamento normale; bloccare e' l'eccezione che
// l'utente dichiara. Decisione D4 di Francesco, 26/07/2026.
export const MODO_PREDEFINITO: ModoTema = 'sistema'

export function isModoTema(valore: unknown): valore is ModoTema {
  return valore === 'sistema' || valore === 'chiaro' || valore === 'scuro'
}

export function risolviTema(modo: ModoTema, sistemaScuro: boolean): 'light' | 'dark' {
  if (modo === 'chiaro') return 'light'
  if (modo === 'scuro') return 'dark'
  return sistemaScuro ? 'dark' : 'light'
}

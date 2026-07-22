// Collaudo R3 (P-STATUSBAR, 22/07 notte) — logica PURA dell'overlay diagnostico del viewport.
//
// Il sintomo (device Francesco): all'avvio della PWA INSTALLATA la barra di stato «sposta tutto
// in giù» e la home richiede scroll. Non riproducibile fuori dal device (serve la PWA installata,
// non il browser) → stessa dottrina ratificata per P9: NIENTE fix alla cieca, prima la misura.
// L'overlay (`DiagnosticaViewport`) mostra sul device i numeri veri: innerHeight, visualViewport,
// dvh/svh/lvh risolti in px, env(safe-area-inset-*), display-mode — e registra i resize dei primi
// secondi di vita (la corsa post-splash è l'indiziato principale).
//
// Attivazione: la PWA installata parte dallo start_url del manifest, senza query — quindi il
// flag PERSISTE in localStorage. `?diag=viewport` accende e salva, `?diag=off` spegne e cancella;
// senza param comanda il flag salvato. Qualsiasi altro valore è ignorato (non tocca il flag).

export const DIAG_VIEWPORT_STORAGE_KEY = 'ua_diag_viewport'

export function decidiDiagViewport(
  search: string,
  flagSalvato: string | null,
): { attiva: boolean; flag: '1' | null } {
  const diag = new URLSearchParams(search).get('diag')
  if (diag === 'viewport') return { attiva: true, flag: '1' }
  if (diag === 'off') return { attiva: false, flag: null }
  return flagSalvato === '1' ? { attiva: true, flag: '1' } : { attiva: false, flag: null }
}

/** Numero → «884.8px»; null/NaN → «n/d» (API assente sul device: mai una riga rotta). */
export function formattaPx(valore: number | null): string {
  if (valore == null || Number.isNaN(valore)) return 'n/d'
  return `${Math.round(valore * 10) / 10}px`
}

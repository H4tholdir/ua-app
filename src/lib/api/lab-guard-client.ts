// N13: interceptor fetch lato client (PWA). Senza questo, i codici UA_LAB_*
// delle 403 della guard sarebbero inerti: un tab già aperto su un lab
// sospeso/scaduto mostrerebbe errori grezzi. Qui si mappa il primo 403
// UA_LAB_* al redirect verso /impostazioni/abbonamento — il gate del layout
// (app) poi raffina la destinazione (blacklist→/blocked, sospeso→/billing…).
// Decisione: docs/design/decisions/2026-07-17-N13-N14-N11bis-ratifiche.md

export const LAB_GUARD_REDIRECT = '/impostazioni/abbonamento'

// Path su cui NON redirigere (anti-loop: sono già le destinazioni del gate)
const PATH_ESCLUSI = ['/impostazioni/abbonamento', '/billing', '/blocked']

type WinLike = {
  fetch: typeof fetch
  location: { pathname: string; origin: string; assign: (url: string) => void }
}

/** Estrae il code UA_LAB_* da una risposta 403 (clone, best-effort). */
export async function estraiCodiceLabGuard(res: Response): Promise<string | null> {
  try {
    const body = (await res.clone().json()) as { code?: unknown }
    return typeof body.code === 'string' && body.code.startsWith('UA_LAB_') ? body.code : null
  } catch {
    return null
  }
}

function isApiSameOrigin(input: RequestInfo | URL, origin: string): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url.startsWith('/api/')) return true
  // URL relative senza slash iniziale ('api/x'): il browser le risolve contro
  // la base del documento, non contro la radice — non classificabili qui, skip.
  if (!/^https?:\/\//.test(url)) return false
  try {
    const u = new URL(url)
    return u.origin === origin && u.pathname.startsWith('/api/')
  } catch {
    return false
  }
}

/**
 * Patcha win.fetch: la risposta originale arriva SEMPRE al chiamante; in
 * parallelo, sul clone, si ispezionano i soli 403 same-origin verso /api/.
 * Un solo redirect per pagina. Ritorna la funzione di uninstall.
 */
export function installLabGuardInterceptor(win: WinLike): () => void {
  const originale = win.fetch
  let redirected = false

  const wrapped: typeof fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const promise = originale.call(win, input, init)
    void promise.then((res) => {
      if (redirected || res.status !== 403) return
      if (!isApiSameOrigin(input, win.location.origin)) return
      // Boundary esatto: /billing e /billing/x sì, /billing-storico no
      if (PATH_ESCLUSI.some((p) => win.location.pathname === p || win.location.pathname.startsWith(p + '/'))) return
      void estraiCodiceLabGuard(res).then((code) => {
        if (!code || redirected) return
        redirected = true
        win.location.assign(LAB_GUARD_REDIRECT)
      })
    }).catch(() => {
      // errori di rete: nessuna ispezione, il chiamante li gestisce già
    })
    return promise
  }

  win.fetch = wrapped
  return () => {
    win.fetch = originale
  }
}

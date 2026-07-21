import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
import { isHomePref } from '@/lib/preferenze/home'

// Preferenza «La tua home» per-utente (Task 6). Scrive `utenti.nav_preferences` SOLO via la
// RPC SECURITY DEFINER `utente_set_nav_pref` — MAI `.update()` diretto (service_role ha solo
// SELECT sulle tabelle della Parete, come per le cassette: vedi ../../cassette/[id]/route.ts).
//
// Contratto reale della RPC (migration 20260721090000_parete_cassette.sql:628-654, letto lì,
// NON dedotto dal brief — il brief era disallineato):
//   utente_set_nav_pref(p_lab uuid, p_user uuid, p_chiave text, p_valore jsonb) RETURNS void
// → QUATTRO argomenti (con 3 PostgREST risponde PGRST202, non silenzia). Nessun `esito` json:
// successo = assenza di `error`. Tutte le RAISE della RPC sono errori di PROGRAMMAZIONE (il
// commento della migration è esplicito: «la route non deve produrle») — quindi questa route
// valida `p_chiave`/`p_valore` PRIMA di chiamare, e se una RAISE arrivasse comunque è un bug
// della route: 500 + console.error, non un esito di dominio.
//
// R-4.3 (dal commento della migration): l'UPDATE della RPC si chiude su
// `WHERE id = p_user AND laboratorio_id = p_lab AND deleted_at IS NULL`. Un `p_lab`/`p_user`
// che non corrispondono più a una riga viva (es. utente admin_sistema con laboratorio_id NULL,
// o lab cambiato in una race) aggiornano ZERO righe SENZA sollevare — no-op silenzioso e
// voluto, difesa in profondità perché `auth.uid()` è NULL sotto `service_role`. Con
// `RETURNS void` la route non ha comunque modo di distinguerlo, ed è voluto: non provarci.
export async function PATCH(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'origin' }, { status: 403 })

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'auth' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'lab' }, { status: 403 })
  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard
  const labId: string = context.laboratorioId
  const userId = context.userId

  // req.json() risolve `null` per un body JSON letterale `null` SENZA lanciare — `?? {}` evita
  // un TypeError su `hasOwnProperty.call(null, ...)` più sotto (stesso gotcha di
  // ../../cassette/[id]/route.ts).
  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>
  const hasHome = Object.prototype.hasOwnProperty.call(body, 'home')
  const hasParete = Object.prototype.hasOwnProperty.call(body, 'parete_intro_vista')

  if (hasHome === hasParete) {
    // Nessuna delle due chiavi (incluso un body con SOLO chiavi fuori allowlist, es. {foo}),
    // oppure entrambe insieme → 422. Allowlist esplicita: una chiamata = una chiave, mai
    // passthrough di campi non previsti.
    return NextResponse.json({ errore: 'campi_non_validi' }, { status: 422 })
  }

  const svc = getServiceClient()

  if (hasHome) {
    // Validazione STRETTA (isHomePref, non homePrefDa: quella defaulta silenziosamente a
    // 'due_stanze', qui un valore fuori enum deve dare 422 esplicito) — p_valore non arriva
    // MAI NULL/assente/fuori enum alla RPC.
    if (!isHomePref(body.home)) {
      return NextResponse.json({ errore: 'home_non_valido' }, { status: 422 })
    }
    const { error } = await callRpcWithRetry(() =>
      svc.rpc('utente_set_nav_pref', { p_lab: labId, p_user: userId, p_chiave: 'home', p_valore: body.home })
    )
    if (error) {
      console.error('[PATCH /api/impostazioni/preferenze] utente_set_nav_pref(home) fallita:', error)
      return NextResponse.json({ error: 'Errore aggiornamento preferenza home' }, { status: 500 })
    }
    return NextResponse.json({ esito: 'ok' })
  }

  // {parete_intro_vista}: la RPC accetta SOLO `true` (RAISE su qualunque altro valore) — la
  // route rigetta prima con 422 qualunque cosa diversa dal booleano `true` esplicito.
  if (body.parete_intro_vista !== true) {
    return NextResponse.json({ errore: 'parete_intro_vista_non_valido' }, { status: 422 })
  }
  const { error } = await callRpcWithRetry(() =>
    svc.rpc('utente_set_nav_pref', { p_lab: labId, p_user: userId, p_chiave: 'parete_intro_vista', p_valore: true })
  )
  if (error) {
    console.error('[PATCH /api/impostazioni/preferenze] utente_set_nav_pref(parete_intro_vista) fallita:', error)
    return NextResponse.json({ error: 'Errore aggiornamento preferenza parete_intro_vista' }, { status: 500 })
  }
  return NextResponse.json({ esito: 'ok' })
}

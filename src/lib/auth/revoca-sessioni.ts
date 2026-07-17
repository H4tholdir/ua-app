import 'server-only'
import type { getServiceClient } from '@/lib/supabase/server-service'

type Svc = ReturnType<typeof getServiceClient>

// N13 (appsec R5): al passaggio a blacklist (terminale) si tagliano le sessioni
// di tutti gli utenti del lab. GoTrue NON espone un endpoint admin di logout
// per-utente (verificato su supabase/auth api.go: sotto /admin/users/{id} solo
// GET/PUT/DELETE + factors/passkeys; admin.signOut richiede il JWT del target,
// che qui non abbiamo). Il meccanismo corretto con la sola service key è il BAN:
// updateUserById(id, { ban_duration }) blocca refresh dei token e nuovi login.
// Gli access token residui restano validi ≤900s — la guard lab-guard è il muro
// primario a ogni request (stato letto fresco dal DB).
// Blacklist è terminale (state-machine: nessuna transizione in uscita), quindi
// il ban de-facto permanente è coerente col dominio.
const BAN_DURATION = '87600h' // ~10 anni

export async function revocaSessioniLaboratorio(
  svc: Svc,
  laboratorioId: string
): Promise<{ revocati: number; errori: number }> {
  const { data: utenti, error } = await svc
    .from('utenti')
    .select('id')
    .eq('laboratorio_id', laboratorioId)
    .is('deleted_at', null)
  if (error || !utenti) {
    console.error('[revoca-sessioni] lookup utenti fallito:', error?.message ?? 'nessun dato', { laboratorioId })
    return { revocati: 0, errori: 1 }
  }

  // Best-effort in parallelo: un fallimento non blocca gli altri né la transizione.
  const esiti = await Promise.allSettled(
    utenti.map(async (u) => {
      const { error: banErr } = await svc.auth.admin.updateUserById(u.id, {
        ban_duration: BAN_DURATION,
      })
      if (banErr) throw new Error(`${u.id}: ${banErr.message}`)
    })
  )

  let revocati = 0
  let errori = 0
  for (const esito of esiti) {
    if (esito.status === 'fulfilled') {
      revocati++
    } else {
      errori++
      console.error('[revoca-sessioni] ban utente fallito:', esito.reason instanceof Error ? esito.reason.message : esito.reason, { laboratorioId })
    }
  }
  return { revocati, errori }
}

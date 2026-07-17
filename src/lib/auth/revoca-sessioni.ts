import 'server-only'
import type { getServiceClient } from '@/lib/supabase/server-service'

type Svc = ReturnType<typeof getServiceClient>

// N13 (appsec R5): revoca best-effort delle sessioni di tutti gli utenti di un
// laboratorio via GoTrue admin logout (supabase-js espone solo signOut(jwt),
// che qui non abbiamo — si usa l'endpoint REST admin con la service key).
// La guard lab-guard resta il muro primario (stato letto fresco a ogni request);
// questa revoca accorcia la finestra dei token claims-based (≤900s).
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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[revoca-sessioni] env Supabase assente — revoca saltata', { laboratorioId })
    return { revocati: 0, errori: utenti.length }
  }

  let revocati = 0
  let errori = 0
  for (const u of utenti) {
    try {
      const res = await fetch(`${url}/auth/v1/admin/users/${u.id}/logout`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
      if (res.ok) {
        revocati++
      } else {
        errori++
        console.error('[revoca-sessioni] logout fallito:', res.status, { userId: u.id, laboratorioId })
      }
    } catch (e) {
      errori++
      console.error('[revoca-sessioni] logout errore rete:', e instanceof Error ? e.message : e, {
        userId: u.id,
        laboratorioId,
      })
    }
  }
  return { revocati, errori }
}

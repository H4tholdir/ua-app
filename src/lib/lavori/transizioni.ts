import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { StatoLavoro } from '@/types/domain'

// Matrice completa delle transizioni consentite.
// "consegnato" non compare come destinazione: passa OBBLIGATORIAMENTE per orchestraConsegna.
// "annullato" è terminale: nessuna transizione uscente.
export const TRANSIZIONI_CONSENTITE: Partial<Record<StatoLavoro, StatoLavoro[]>> = {
  ricevuto:         ['in_lavorazione'],
  in_lavorazione:   ['pronto', 'in_prova_esterna', 'sospeso', 'annullato'],
  in_prova_esterna: ['in_lavorazione', 'pronto', 'sospeso', 'annullato'],
  in_prova:         ['in_lavorazione', 'pronto'],
  sospeso:          ['in_lavorazione'],
  in_ritardo:       ['in_lavorazione', 'in_prova_esterna'],
  pronto:           ['in_lavorazione'],
}

export function puoTransizionare(da: StatoLavoro, a: StatoLavoro): boolean {
  return TRANSIZIONI_CONSENTITE[da]?.includes(a) ?? false
}

type TransizioneResult =
  | { ok: true }
  | { ok: false; error: string; status: 400 | 404 | 409 }

/**
 * Esegue una transizione di stato su un lavoro, validando la transizione
 * contro la matrice TRANSIZIONI_CONSENTITE.
 * Usare questa funzione in tutte le route che mutano lavori.stato.
 */
export async function transizioneLavoro(
  svc: SupabaseClient,
  lavoroId: string,
  labId: string,
  nuovoStato: StatoLavoro,
  extraFields?: Record<string, unknown>,
): Promise<TransizioneResult> {
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id, stato')
    .eq('id', lavoroId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!lavoro) {
    return { ok: false, error: 'Lavoro non trovato o accesso negato', status: 404 }
  }

  const statoCorrente = lavoro.stato as StatoLavoro

  if (!puoTransizionare(statoCorrente, nuovoStato)) {
    return {
      ok: false,
      error: `Transizione ${statoCorrente}→${nuovoStato} non consentita`,
      status: 409,
    }
  }

  const { error } = await svc
    .from('lavori')
    .update({ stato: nuovoStato, updated_at: new Date().toISOString(), ...extraFields })
    .eq('id', lavoroId)
    .eq('laboratorio_id', labId)

  if (error) {
    return { ok: false, error: error.message, status: 400 }
  }

  return { ok: true }
}

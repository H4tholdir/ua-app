import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

// N10 — claim anti-doppio-invio PEC (spec 2026-07-15 §3.1 step 7/9).
// Repurposing di smtp_inviata_at come lock: ogni fattura 'generata' lo ha NULL
// per costruzione (unico writer: send-pec.ts, atomico con stato_sdi='smtp_inviata').
// ⚠️ Claim orfano su crash: si sblocca SOLO dopo verifica nella cartella «inviata»
// della casella PEC (pec_message_id NULL NON è prova di non-invio) con:
//   UPDATE fatture SET smtp_inviata_at = NULL WHERE id = '…' AND stato_sdi = 'generata';

export const RUOLI_INVIO_PEC = ['titolare', 'front_desk'] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Svc = SupabaseClient<any, any, any>

export async function claimInvioPec(
  svc: Svc,
  fatturaId: string,
  labId: string
): Promise<{ claimed: boolean; error: string | null }> {
  const { data, error } = await svc
    .from('fatture')
    .update({ smtp_inviata_at: new Date().toISOString() })
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .eq('stato_sdi', 'generata')
    .is('smtp_inviata_at', null)
    .select('id')
  if (error) return { claimed: false, error: error.message }
  return { claimed: (data ?? []).length > 0, error: null }
}

export async function releaseInvioPec(svc: Svc, fatturaId: string, labId: string): Promise<void> {
  const { error } = await svc
    .from('fatture')
    .update({ smtp_inviata_at: null })
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .eq('stato_sdi', 'generata')
  if (error) {
    console.error(`[INVIA-PEC] rilascio claim fallito per fattura ${fatturaId}:`, error.message)
  }
}

export function messaggioStatoNonInviabile(
  statoSdi: string | null,
  tipoDocumento: string | null
): string {
  if (statoSdi === 'draft') {
    return tipoDocumento === 'TD04'
      ? "Nota di credito incompleta — riapri l'emissione dalla fattura originale per completarla"
      : 'XML non ancora generato — genera prima la fattura'
  }
  if (statoSdi === 'rifiutata' || statoSdi === 'scaduta') {
    return 'Stato non re-inviabile — richiede intervento dedicato'
  }
  return 'Fattura già inviata a SdI'
}

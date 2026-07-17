// N13 (decisione ratificata 17/07/2026): guard applicativa lab.stato × metodo.
// Chiamata a INIZIO handler, early-return della 403 pronta — MAI negli helper
// di contesto (servono anche ai Server Component dove il gate è redirect),
// MAI in middleware (lab.stato non è nei claims, costerebbe un round-trip DB).
// Documento: docs/design/decisions/2026-07-17-N13-N14-N11bis-ratifiche.md
import { NextResponse } from 'next/server'
import { isTrialScaduto } from '@/lib/utils/lab-stato'

export type LabGuardMode = 'off' | 'shadow' | 'enforce'

// ENFORCE dal 17/07/2026: la finestra shadow è stata saltata su decisione
// esplicita di Francesco (PWA senza utenti in questa fase — nessun chiamante
// legittimo da scoprire). L'env UA_LAB_GUARD_MODE resta il kill-switch per
// rollback istantaneo ('off') o per riattivare l'osservazione ('shadow').
export const LAB_GUARD_DEFAULT_MODE: LabGuardMode = 'enforce'

export type LabGuardInput = {
  ruolo: string
  lab: { stato: string; trial_ends_at: string | null } | null
  // opzionale, solo per il log shadow (LabContext e i wrapper lo portano già)
  laboratorioId?: string | null
}
export type GuardMethod = 'GET' | 'HEAD' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type LabGuardCode =
  | 'UA_LAB_TRIAL_SCADUTO'
  | 'UA_LAB_SOSPESO'
  | 'UA_LAB_SCADUTO'
  | 'UA_LAB_BLACKLIST'
  | 'UA_LAB_NON_OPERATIVO'

const MESSAGGI: Record<LabGuardCode, string> = {
  UA_LAB_TRIAL_SCADUTO: 'Periodo di prova terminato: passa a un piano per continuare a modificare i dati.',
  UA_LAB_SOSPESO: 'Abbonamento sospeso: la modifica dei dati è disabilitata.',
  UA_LAB_SCADUTO: 'Abbonamento scaduto: rinnova il piano per continuare.',
  UA_LAB_BLACKLIST: 'Account disabilitato.',
  UA_LAB_NON_OPERATIVO: 'Laboratorio non disponibile.',
}

export function getLabGuardMode(): LabGuardMode {
  const env = process.env.UA_LAB_GUARD_MODE
  return env === 'off' || env === 'shadow' || env === 'enforce' ? env : LAB_GUARD_DEFAULT_MODE
}

const isRead = (m: GuardMethod) => m === 'GET' || m === 'HEAD'

// Decisione pura (esportata per test e shadow-analisi): null = consentito.
export function decideLabOperativo(ctx: LabGuardInput | null, method: GuardMethod): LabGuardCode | null {
  if (!ctx) return 'UA_LAB_NON_OPERATIVO' // fail-closed
  if (ctx.ruolo === 'admin_sistema') return null // bypass totale (laboratorio_id NULL by design)
  if (!ctx.lab) return 'UA_LAB_NON_OPERATIVO' // fail-closed: non-admin senza lab
  switch (ctx.lab.stato) {
    case 'attivo':
      return null
    case 'trial': {
      // predicato condiviso col gate UX del layout (app) — niente drift
      const scaduto = isTrialScaduto(ctx.lab.stato, ctx.lab.trial_ends_at)
      return scaduto && !isRead(method) ? 'UA_LAB_TRIAL_SCADUTO' : null
    }
    case 'sospeso':
      return isRead(method) ? null : 'UA_LAB_SOSPESO'
    case 'scaduto':
      return isRead(method) ? null : 'UA_LAB_SCADUTO'
    case 'blacklist':
      return 'UA_LAB_BLACKLIST' // terminale: anche i GET (ratificato)
    default:
      return 'UA_LAB_NON_OPERATIVO' // fail-closed su stati sconosciuti/futuri
  }
}

export function assertLabOperativo(ctx: LabGuardInput | null, method: GuardMethod): NextResponse | null {
  const mode = getLabGuardMode()
  if (mode === 'off') return null
  const code = decideLabOperativo(ctx, method)
  if (!code) return null
  if (mode === 'shadow') {
    // Il pathname della route è nei metadata della function log su Vercel;
    // qui si aggiunge il lab per l'analisi aggregata della finestra shadow.
    console.warn(
      `[lab-guard] would-block ${JSON.stringify({ code, method, ruolo: ctx?.ruolo ?? null, stato: ctx?.lab?.stato ?? null, laboratorioId: ctx?.laboratorioId ?? null })}`
    )
    return null
  }
  return NextResponse.json(
    { error: MESSAGGI[code], code },
    { status: 403, headers: { 'Cache-Control': 'no-store' } }
  )
}

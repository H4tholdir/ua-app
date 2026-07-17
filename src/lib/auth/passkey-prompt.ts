// N14b — handoff cross-route del prompt passkey (login → dashboard, Opzione C).
// Il login "arma" il prompt in sessionStorage; la dashboard lo "consuma" una
// sola volta ed entro una breve finestra TTL. Fuori dal TTL il prompt non
// compare: una sessione dashboard non collegata al login appena avvenuto non
// deve mai far apparire il modal.
const PASSKEY_PROMPT_KEY = 'ua_passkey_prompt'
export const PASSKEY_PROMPT_TTL_MS = 20_000

type PromptPayload = { email: string; ts: number }

// `now` iniettabile per testabilità (default: orologio reale).
export function armPasskeyPrompt(email: string, now: number = Date.now()): void {
  if (typeof window === 'undefined') return
  try {
    const payload: PromptPayload = { email, ts: now }
    sessionStorage.setItem(PASSKEY_PROMPT_KEY, JSON.stringify(payload))
  } catch {
    /* sessionStorage non disponibile — nessun prompt, degrada in silenzio */
  }
}

// One-shot: rimuove SEMPRE il flag (anche se scaduto/corrotto) e restituisce
// l'email solo se il prompt è ancora entro il TTL.
export function consumePasskeyPrompt(now: number = Date.now()): string | null {
  if (typeof window === 'undefined') return null
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(PASSKEY_PROMPT_KEY)
    sessionStorage.removeItem(PASSKEY_PROMPT_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const payload = JSON.parse(raw) as PromptPayload
    if (typeof payload?.email !== 'string' || typeof payload?.ts !== 'number') return null
    if (now - payload.ts > PASSKEY_PROMPT_TTL_MS) return null
    return payload.email
  } catch {
    return null
  }
}

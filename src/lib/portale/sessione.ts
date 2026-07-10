// src/lib/portale/sessione.ts
// Sessione economica del portale (spec §5, audit F2 — specifica vincolante).
// Cookie firmato HMAC-SHA256 con PORTALE_SESSION_SECRET (env DISTINTA dal
// pepper del PIN). Nasce SOLO dal POST pin riuscito; durata 30 min non
// rinnovabile; binding al cliente del token e alla pin_generation corrente.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSIONE_ECONOMICA_COOKIE = 'ua_portale_sessione'
export const SESSIONE_ECONOMICA_DURATA_MS = 30 * 60 * 1000

type SessionePayload = {
  cliente_id: string
  exp: number
  pin_generation: number
  nonce: string
}

function secret(): string {
  const s = process.env.PORTALE_SESSION_SECRET
  if (!s) throw new Error('PORTALE_SESSION_SECRET non configurato')
  return s
}

function firma(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url')
}

export function creaSessioneEconomica(clienteId: string, pinGeneration: number): string {
  const payload: SessionePayload = {
    cliente_id: clienteId,
    exp: Date.now() + SESSIONE_ECONOMICA_DURATA_MS,
    pin_generation: pinGeneration,
    nonce: randomBytes(8).toString('base64url'), // anti-fissazione: valore sempre nuovo, generato dal server
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${firma(body)}`
}

export function verificaSessioneEconomica(
  token: string | null | undefined,
  attesi: { clienteId: string; pinGeneration: number },
): boolean {
  try {
    if (!token) return false
    const [body, sig] = token.split('.')
    if (!body || !sig) return false
    const sigAttesa = firma(body)
    const a = Buffer.from(sig)
    const b = Buffer.from(sigAttesa)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionePayload
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return false
    if (payload.cliente_id !== attesi.clienteId) return false
    if (payload.pin_generation !== attesi.pinGeneration) return false
    return true
  } catch {
    return false
  }
}

export function estraiCookie(cookieHeader: string | null, nome: string): string | null {
  if (!cookieHeader) return null
  for (const parte of cookieHeader.split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nome) return v.join('=') || null
  }
  return null
}

// src/lib/portale/pin.ts
// PIN portale dentista (spec portale-dentista-v2 §4/§5, audit F1).
// Formato hash: scrypt$N$r$p$<salt base64>$<hash base64>, parametri espliciti.
// Input di scrypt = HMAC-SHA256(PORTALE_PIN_PEPPER, pin): senza pepper un PIN
// a 6 cifre (10^6) si cracka offline da qualsiasi dump del DB.
import { scryptSync, randomBytes, createHmac, timingSafeEqual } from 'node:crypto'

const SCRYPT_N = 32768 // 2^15
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEYLEN = 64
const SALT_BYTES = 16
// 128 * N * r = 32 MiB esatti: il default maxmem (32 MiB) non basta.
const SCRYPT_MAXMEM = 64 * 1024 * 1024

function pepper(): string {
  const p = process.env.PORTALE_PIN_PEPPER
  if (!p) throw new Error('PORTALE_PIN_PEPPER non configurato')
  return p
}

function pepperedPin(pin: string): Buffer {
  return createHmac('sha256', pepper()).update(pin).digest()
}

const SEQUENZE = new Set<string>()
for (let start = 0; start <= 9; start++) {
  let asc = ''
  let desc = ''
  for (let i = 0; i < 6; i++) {
    asc += (start + i) % 10
    desc += (start - i + 10) % 10
  }
  SEQUENZE.add(asc)
  SEQUENZE.add(desc)
}

function isDataEvidente(pin: string): boolean {
  // DDMMYY plausibile (01-31 / 01-12 / qualsiasi anno a 2 cifre)
  const gg = Number(pin.slice(0, 2))
  const mm = Number(pin.slice(2, 4))
  return gg >= 1 && gg <= 31 && mm >= 1 && mm <= 12
}

export function validaPinNuovo(pin: string): { ok: true } | { ok: false; errore: string } {
  if (!/^\d{6}$/.test(pin)) return { ok: false, errore: 'Il PIN deve essere di 6 cifre' }
  if (/^(\d)\1{5}$/.test(pin)) return { ok: false, errore: 'PIN troppo prevedibile' }
  if (SEQUENZE.has(pin)) return { ok: false, errore: 'PIN troppo prevedibile' }
  if (isDataEvidente(pin)) return { ok: false, errore: 'PIN troppo prevedibile (sembra una data)' }
  return { ok: true }
}

export function hashPin(pin: string): string {
  const salt = randomBytes(SALT_BYTES)
  const hash = scryptSync(pepperedPin(pin), salt, KEYLEN, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifyPin(pin: string, stored: string): boolean {
  try {
    const parti = stored.split('$')
    if (parti.length !== 6 || parti[0] !== 'scrypt') return false
    const [, nStr, rStr, pStr, saltB64, hashB64] = parti
    const N = Number(nStr); const r = Number(rStr); const p = Number(pStr)
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false
    const salt = Buffer.from(saltB64, 'base64')
    const atteso = Buffer.from(hashB64, 'base64')
    if (salt.length === 0 || atteso.length === 0) return false
    const calcolato = scryptSync(pepperedPin(pin), salt, atteso.length, {
      N, r, p, maxmem: SCRYPT_MAXMEM,
    })
    return timingSafeEqual(calcolato, atteso)
  } catch {
    return false
  }
}

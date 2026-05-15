// src/lib/consegna/pec-idempotency.ts
import { createHash } from 'crypto'

/**
 * Generates a deterministic Message-ID for PEC to prevent duplicate sends.
 * RFC 5322 format: <local@domain>
 * Same inputs → same ID → safe to retry.
 */
export function generatePecMessageId(
  labId: string,
  lavoroId: string,
  tipo: 'fattura' | 'ddc'
): string {
  const fullHash = createHash('sha256')
    .update(`${labId}:${lavoroId}:${tipo}`)
    .digest('hex')

  // Split hash into two hex segments for readability; both are valid hex
  const part1 = fullHash.substring(0, 16)
  const part2 = fullHash.substring(16, 24)
  return `<ua-${part1}-${part2}@ua.app>`
}

// Funzioni pure per FatturaPA XML — importabili anche nei test (no server-only)

/** Escape caratteri speciali XML */
export function xe(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
}

/** Formatta numero decimale con 2 cifre (FatturaPA richiede punto come separatore) */
export function fmt2(n: number): string {
  return n.toFixed(2)
}

/**
 * Genera numero fattura conforme XSD FatturaPA v1.2.
 * - Usa trattino '-' (lo slash '/' non è ammesso)
 * - Formato: ANNO-NNNN (max 20 caratteri, solo [a-zA-Z0-9-_])
 */
export function formatNumeroFattura(anno: number, progressivo: number): string {
  return `${anno}-${String(progressivo).padStart(4, '0')}`
}

/**
 * Valida che cedente e cessionario abbiano identificativo fiscale.
 * XSD FatturaPA: IdCodice e CodiceFiscale non possono essere stringhe vuote.
 */
export function validaIdentificativoFiscale(
  piva: string | null | undefined,
  cf: string | null | undefined,
  label: string
): void {
  if (!piva && !cf) {
    throw new Error(
      `${label}: manca P.IVA e Codice Fiscale. Impossibile generare FatturaPA valida.`
    )
  }
}

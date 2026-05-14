import type { LavoroDettaglio } from '@/types/domain'

export async function generaFatturaPA(lavoro: LavoroDettaglio) {
  // TODO Task 16: implementare generazione XML FatturaPA
  return { numero: 'STUB', stato_sdi: 'draft' as const }
}

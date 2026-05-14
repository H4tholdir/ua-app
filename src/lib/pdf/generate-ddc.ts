import type { LavoroDettaglio } from '@/types/domain'

export async function generateDdC(lavoro: LavoroDettaglio) {
  // TODO Task 14: implementare generazione PDF reale
  return {
    numero: `DDC-${new Date().getFullYear()}-STUB`,
    url: '',
  }
}

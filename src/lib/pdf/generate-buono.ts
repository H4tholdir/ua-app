import type { LavoroDettaglio } from '@/types/domain'

export async function generateBuono(lavoro: LavoroDettaglio) {
  // TODO Task 15: implementare generazione PDF reale
  return {
    numero: `BUO-${new Date().getFullYear()}-STUB`,
    url: '',
  }
}

// Pill di stato dell'header scheda (§3.1). Riusa derivaUrgenza (E4) quando
// produce una pillTempo; per gli stati fuori-pila (consegnato/annullato/
// in_lavorazione senza ritardo) derivaUrgenza restituisce pillTempo null,
// quindi qui forniamo un fallback esplicito — l'header ha SEMPRE una pill.
import { derivaUrgenza } from '@/lib/lavori/urgenza'
import type { Famiglia } from '@/components/ds/Pill'
import type { StatoLavoro } from '@/types/domain'

type LavoroPill = { stato: StatoLavoro; data_consegna_prevista: string; ora_consegna: string | null }

const FALLBACK: Partial<Record<StatoLavoro, { testo: string; famiglia: Famiglia }>> = {
  consegnato: { testo: 'CONSEGNATO ✓', famiglia: 'green' },
  annullato: { testo: 'ANNULLATO', famiglia: 'amber' },
  in_lavorazione: { testo: 'IN LAVORAZIONE', famiglia: 'amber' },
}

export function pillStatoScheda(lavoro: LavoroPill, oggi: Date): { testo: string; famiglia: Famiglia } {
  const u = derivaUrgenza(lavoro, oggi)
  if (u.pillTempo) return u.pillTempo
  return FALLBACK[lavoro.stato] ?? { testo: 'IN LAVORAZIONE', famiglia: 'amber' }
}

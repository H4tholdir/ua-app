// E4 — adapter urgenza: l'UNICO modulo dell'app che conosce lo stato
// `in_ritardo` (condizione temporale travestita da fase — deprecazione
// tracciata in spec §11). Le pile, le query e il server passano da qui.
// Client-safe: pure function, nessun accesso a rete o env.

import type { StatoLavoro } from '@/types/domain'
import { isStatoConsegnabile } from '@/lib/consegna/costanti'
import type { Famiglia } from '@/components/ds/Pill'

export type Pila = 'rossa' | 'ambra' | 'viola' | 'blu'

export type LavoroPerUrgenza = {
  stato: StatoLavoro
  data_consegna_prevista: string
  ora_consegna: string | null
}

export type Urgenza = {
  pila: Pila | null
  giorniRitardo: number
  inCima: boolean
  inFondo: boolean
  consegnabile: boolean
  pillTempo: { testo: string; famiglia: Famiglia } | null
}

const MS_GIORNO = 24 * 60 * 60 * 1000

/** Giorni INTERI di ritardo della consegna rispetto a `oggi` (date-only, tz locale). */
function giorniDiRitardo(dataConsegna: string, oggi: Date): number {
  const [y, m, d] = dataConsegna.split('-').map(Number)
  const consegna = new Date(y, m - 1, d)
  const oggiZero = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
  return Math.max(0, Math.round((oggiZero.getTime() - consegna.getTime()) / MS_GIORNO))
}

function pillRitardo(giorni: number): { testo: string; famiglia: Famiglia } {
  return { testo: giorni === 1 ? 'DA IERI' : `−${giorni} GIORNI`, famiglia: 'red' }
}

function oraBreve(ora: string | null): string | null {
  if (!ora) return null
  const [h, m] = ora.split(':')
  return `${h}:${m}`
}

export function derivaUrgenza(lavoro: LavoroPerUrgenza, oggi: Date): Urgenza {
  const { stato, data_consegna_prevista, ora_consegna } = lavoro
  const consegnabile = isStatoConsegnabile(stato)
  const vuota: Urgenza = { pila: null, giorniRitardo: 0, inCima: false, inFondo: false, consegnabile, pillTempo: null }

  if (stato === 'consegnato' || stato === 'annullato') return vuota

  if (stato === 'in_prova' || stato === 'in_prova_esterna') {
    return { ...vuota, pila: 'viola', pillTempo: { testo: 'IN PROVA', famiglia: 'purple' } }
  }

  if (stato === 'ricevuto') {
    return { ...vuota, pila: 'blu', pillTempo: { testo: 'APPENA ARRIVATO', famiglia: 'blue' } }
  }

  if (stato === 'sospeso') {
    return { ...vuota, pila: 'ambra', inFondo: true, pillTempo: { testo: 'FERMO', famiglia: 'amber' } }
  }

  // Da qui: pronto · in_lavorazione · in_ritardo — il ritardo si CALCOLA dalle
  // date; lo stato `in_ritardo` (scritto dal trigger solo da in_lavorazione,
  // P2-7) vale come ritardo di almeno 1 giorno anche se la data non è passata.
  const dalleDate = giorniDiRitardo(data_consegna_prevista, oggi)
  const giorniRitardo = stato === 'in_ritardo' ? Math.max(1, dalleDate) : dalleDate

  if (stato === 'pronto') {
    if (giorniRitardo > 0) {
      return { ...vuota, pila: 'rossa', inCima: true, giorniRitardo, pillTempo: pillRitardo(giorniRitardo) }
    }
    if (giorniDiRitardo(data_consegna_prevista, new Date(oggi.getTime() + MS_GIORNO)) > 0) {
      // consegna == oggi (domani sarebbe in ritardo)
      const ora = oraBreve(ora_consegna)
      return { ...vuota, pila: 'rossa', pillTempo: { testo: ora ? `OGGI · ${ora}` : 'OGGI', famiglia: 'red' } }
    }
    return { ...vuota, pila: 'ambra', pillTempo: { testo: 'PRONTA ✓', famiglia: 'green' } }
  }

  // in_lavorazione / in_ritardo: sul banco; se in ritardo, in cima con pill rossa.
  if (giorniRitardo > 0) {
    return { ...vuota, pila: 'ambra', inCima: true, giorniRitardo, pillTempo: pillRitardo(giorniRitardo) }
  }
  return { ...vuota, pila: 'ambra', pillTempo: null } // pill fase: la decide il chiamante (P6)
}

/** Ordinamento dentro una pila (§4.1): ritardi in cima (più gravi prima),
 *  poi consegna data+ora ascendente (senza ora = fine giornata), sospesi in fondo. */
export function confrontaUrgenza(
  a: { urgenza: Urgenza; data: string; ora: string | null },
  b: { urgenza: Urgenza; data: string; ora: string | null },
): number {
  const fascia = (x: { urgenza: Urgenza }) => (x.urgenza.inFondo ? 2 : x.urgenza.inCima ? 0 : 1)
  if (fascia(a) !== fascia(b)) return fascia(a) - fascia(b)
  if (a.urgenza.inCima && b.urgenza.inCima && a.urgenza.giorniRitardo !== b.urgenza.giorniRitardo) {
    return b.urgenza.giorniRitardo - a.urgenza.giorniRitardo
  }
  const chiave = (x: { data: string; ora: string | null }) => `${x.data}T${x.ora ?? '23:59:59'}`
  return chiave(a) < chiave(b) ? -1 : chiave(a) > chiave(b) ? 1 : 0
}

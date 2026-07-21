// src/lib/domain/miniature-lavoro.ts
// Risoluzione miniatura a 3 livelli (spec §8): granulare → macro → generica.
import { cercaTipiLavoro } from './tipi-lavoro'

export type MiniaturaId =
  | 'corona' | 'provvisorio' | 'impianto' | 'ponte' | 'totale' | 'scheletrato'
  | 'allineatore' | 'mascherina' | 'riparazione' | 'generica'

// Livello 1: id granulare TIPI_LAVORO → miniatura (solo dove il granulare
// racconta più del macro; il resto cade sul macro). Chiavi allineate agli id
// REALI di TIPI_LAVORO (tipi-lavoro.ts:32-69), verificate contro cercaTipiLavoro.
const GRANULARE: Record<string, MiniaturaId> = {
  corona_zirconia: 'corona', corona_disilicato: 'corona', corona_metallo_ceramica: 'corona',
  ponte_zirconia: 'ponte',
  corona_impianto: 'impianto', ponte_impianti: 'impianto', toronto: 'impianto',
  protesi_totale: 'totale', parziale_resina: 'totale',
  scheletrato: 'scheletrato',
  provvisorio_resina: 'provvisorio',
}

const MACRO: Record<string, MiniaturaId> = {
  protesi_fissa: 'corona', protesi_mobile: 'totale', implantologia: 'impianto',
  cad_cam: 'corona', scheletrato: 'scheletrato', ortodonzia: 'allineatore',
  provvisorio: 'provvisorio', riparazione: 'riparazione', bite_splint: 'mascherina',
  altro: 'generica',
}

export function miniaturaPerLavoro(descrizione: string | null, tipoDispositivo: string | null): MiniaturaId {
  if (descrizione) {
    const match = cercaTipiLavoro(descrizione)[0]
    if (match && GRANULARE[match.id]) return GRANULARE[match.id]
  }
  if (tipoDispositivo && MACRO[tipoDispositivo]) return MACRO[tipoDispositivo]
  return 'generica'
}

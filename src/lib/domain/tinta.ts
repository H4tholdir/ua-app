// D42 — le famiglie delle tinte NON dentali e la loro corrispondenza con la
// categoria GROSSA del lavoro (`lavori.tipo_dispositivo`).
//
// 🔑 Questa corrispondenza è la stessa che vive nel CHECK `lavori_tinta_tipo_ck`
// (migration `supabase/migrations/20260805174500_lavori_tinta.sql`). Due copie
// della stessa regola sono la classe di difetto che questo progetto combatte:
// qui c'è perché il client deve sapere quali tinte mostrare, LÀ c'è perché il
// client si aggira. La rete che le tiene allineate è
// `tests/unit/tinta-dominio.test.ts`.
//
// ⚠️ È un ACCOPPIAMENTO, non una legge: se un tipo con tinta nascesse sotto
// un'altra macro, si cambiano ENTRAMBE. La prova «ogni tipo con prevedeColore
// libero ha una famiglia» si accende da sola in quel caso.
import type { TipoDispositivo } from '@/types/domain'

export const FAMIGLIE_TINTA = ['resina_ortodontica', 'sport'] as const
export type FamigliaTinta = (typeof FAMIGLIE_TINTA)[number]

/** Una riga del catalogo `tinte_manufatto`. `hex` è NULL dove un colore piatto mentirebbe (D114). */
export type TintaManufatto = {
  famiglia: FamigliaTinta
  codice: string
  nome: string
  ordine: number
  hex: string | null
}

/** La tinta di un lavoro, già risolta col catalogo: la coppia stabile che sta
 *  su `lavori` PIÙ l'etichetta e il pallino, che stanno solo in catalogo.
 *  🔑 Vive qui, nel dominio puro, e non accanto alla funzione che la carica: la
 *  usa anche `types/domain.ts`, che non deve tirarsi dietro un modulo server. */
export type TintaScelta = { famiglia: string; codice: string; nome: string; hex: string | null }

const PER_MACRO: Partial<Record<TipoDispositivo, FamigliaTinta>> = {
  ortodonzia: 'resina_ortodontica',
  bite_splint: 'sport',
}

/** La famiglia di tinte di una categoria grossa, oppure `null` se non ne ha. */
export function famigliaDiMacro(macro: string): FamigliaTinta | null {
  return PER_MACRO[macro as TipoDispositivo] ?? null
}

/** La categoria grossa di una famiglia. Biunivoca per costruzione. */
export function macroDiFamiglia(famiglia: string): TipoDispositivo | null {
  const trovata = (Object.entries(PER_MACRO) as Array<[TipoDispositivo, FamigliaTinta]>)
    .find(([, f]) => f === famiglia)
  return trovata ? trovata[0] : null
}

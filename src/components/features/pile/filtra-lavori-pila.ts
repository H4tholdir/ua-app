// Filtro della RigaCerca di PilaAperta (§5.13 + decisions 20/07: matcha anche
// la cassetta — col lavoro in mano «C12» è la query più naturale del banco).
import type { LavoroPila } from '@/lib/dashboard/pile-home-shared'

/** contains normalizzato: minuscolo + NFD senza diacritici (accent-insensitive). */
export function normalizza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function filtraLavoriPila(lista: LavoroPila[], query: string): LavoroPila[] {
  const q = normalizza(query)
  if (!q) return lista
  return lista.filter((l) =>
    normalizza(`n.${l.numero} ${l.dentista} ${l.paziente} ${l.tipoLavoro} ${l.cassetta ?? ''}`).includes(q)
  )
}

// Task 11 — la ricerca «che accende» della Parete (§5.1 spec
// 2026-07-21-parete-cassette-design.md).
//
// Ritorna gli **id accesi**, non una lista filtrata: la parete resta lo specchio del muro
// (nessuna cassetta sparisce mai, l'ordine non cambia) — i non-match si spengono soltanto.
//
// Query vuota (o di soli spazi) → Set vuoto = «nessun filtro attivo». Anche zero-match dà un
// Set vuoto: i due casi si distinguono col `query.trim()` del chiamante, MAI con `.size`
// (v. `PareteClient`).
//
// Pagliaio per cassetta: `nome ∥ n.{numero} ∥ dentista ∥ paziente ∥ descrizione` (piano Task 11
// Step 2). La `descrizione` è il testo scritto da un umano — `tipoDispositivo` è uno slug
// macchina (`protesi_fissa`) che nessuno digita al banco e che porterebbe solo rumore.
// `normalizza` è quella CONDIVISA di `filtra-lavori-pila.ts` (§5.13): una sola definizione di
// «contains accento-insensibile» in tutta l'app.
import { normalizza } from '@/components/features/pile/filtra-lavori-pila'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

export function filtraCassette(parete: CassettaParete[], query: string): Set<string> {
  // `normalizza` non taglia gli spazi: senza `trim()` una query di soli spazi sarebbe
  // «attiva» e spegnerebbe l'intera parete al primo spazio battuto per sbaglio.
  const q = normalizza(query.trim())
  if (!q) return new Set()

  const accesi = new Set<string>()
  for (const c of parete) {
    const l = c.lavoro
    const pagliaio = normalizza(
      l ? `${c.nome} n.${l.numero} ${l.dentista} ${l.paziente} ${l.descrizione ?? ''}` : c.nome
    )
    if (pagliaio.includes(q)) accesi.add(c.id)
  }
  return accesi
}

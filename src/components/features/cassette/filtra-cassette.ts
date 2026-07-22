// Task 11 — la ricerca «che accende» della Parete (§5.1 spec
// 2026-07-21-parete-cassette-design.md). Task 18 (ratifica Francesco 22/07): «la ricerca deve
// essere globale e su ogni possibile campo in modo da permettere sicuramente
// l'identificazione di una cassetta o lavoro in essa contenuto» — il pagliaio Task 11 non
// bastava (v. sotto).
//
// Ritorna gli **id accesi**, non una lista filtrata: la parete resta lo specchio del muro
// (nessuna cassetta sparisce mai, l'ordine non cambia) — i non-match si spengono soltanto.
//
// Query vuota (o di soli spazi) → Set vuoto = «nessun filtro attivo». Anche zero-match dà un
// Set vuoto: i due casi si distinguono col `query.trim()` del chiamante, MAI con `.size`
// (v. `PareteClient`).
//
// Pagliaio per cassetta OCCUPATA: `nome ∥ n.{numero} ∥ dentista ∥ paziente ∥ descrizione ∥
// etichetta-leggibile-del-tipo ∥ colore`. Per una LIBERA: `nome ∥ colore`.
//
// Sul tipo: Task 11 escludeva `tipoDispositivo` perché è uno slug macchina (`protesi_fissa`)
// che nessuno digita al banco — quel ragionamento resta valido PER LO SLUG, ma la ratifica
// chiede il campo comunque: la soluzione è l'**etichetta leggibile** (`LABEL_MACRO`), non lo
// slug crudo. Lookup difensivo — `tipoDispositivo` è `string | null` e può contenere uno slug
// fuori mappa (drift DB, v. commento su `LABEL_MACRO`): `?? ''` evita sia il crash su chiave
// assente sia un `'undefined'` letterale nel pagliaio.
//
// Sul colore: entra così com'è (`c.colore`). Per le 6 facce standard è una parola vera («rossa»,
// «verde»...) che si digita al banco; per i custom è un hex, innocuo nel pagliaio e utile a chi
// lo incolla. Digitare «rossa» accende TUTTE le cassette rosse (comprese le libere): è voluto,
// non un difetto — identificazione «per qualunque via», anche a costo di più match.
//
// `normalizza` è quella CONDIVISA di `filtra-lavori-pila.ts` (§5.13): una sola definizione di
// «contains accento-insensibile» in tutta l'app.
import { normalizza } from '@/components/features/pile/filtra-lavori-pila'
import { LABEL_MACRO } from '@/lib/domain/tipi-lavoro'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

export function filtraCassette(parete: CassettaParete[], query: string): Set<string> {
  // `normalizza` non taglia gli spazi: senza `trim()` una query di soli spazi sarebbe
  // «attiva» e spegnerebbe l'intera parete al primo spazio battuto per sbaglio.
  const q = normalizza(query.trim())
  if (!q) return new Set()

  const accesi = new Set<string>()
  for (const c of parete) {
    const l = c.lavoro
    const etichettaTipo = l?.tipoDispositivo
      ? LABEL_MACRO[l.tipoDispositivo as keyof typeof LABEL_MACRO] ?? ''
      : ''
    const pagliaio = normalizza(
      l
        ? `${c.nome} n.${l.numero} ${l.dentista} ${l.paziente} ${l.descrizione ?? ''} ${etichettaTipo} ${c.colore}`
        : `${c.nome} ${c.colore}`
    )
    if (pagliaio.includes(q)) accesi.add(c.id)
  }
  return accesi
}

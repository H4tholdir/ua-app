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
// etichetta-leggibile-del-tipo ∥ colore-PAROLA ∥ note laboratorio`. Per una LIBERA:
// `nome ∥ colore-PAROLA` (FIX-K, G7 — v. sotto: MAI l'hex, su nessuna delle due).
//
// Sul tipo: Task 11 escludeva `tipoDispositivo` perché è uno slug macchina (`protesi_fissa`)
// che nessuno digita al banco — quel ragionamento resta valido PER LO SLUG, ma la ratifica
// chiede il campo comunque: la soluzione è l'**etichetta leggibile** (`LABEL_MACRO`), non lo
// slug crudo. Lookup difensivo — `tipoDispositivo` è `string | null` e può contenere uno slug
// fuori mappa (drift DB, v. commento su `LABEL_MACRO`): `?? ''` evita sia il crash su chiave
// assente sia un `'undefined'` letterale nel pagliaio.
//
// Sul colore (FIX-K, G7, ratifica 25/07 — docs/design/decisions/2026-07-24-qa-device-meta-
// ondata.md, sezione «Ri-collaudo device #2»): fino a questo fix l'hex custom crudo (`c.colore`
// quando NON è una delle 6 facce standard) entrava nel pagliaio così com'è — la scelta
// originale (v. git blame) lo definiva "innocuo... utile a chi lo incolla". Francesco ribalta
// quella scelta al ri-collaudo device: «eliminiamo la ricerca per codice esadecimale del
// colore, inutile per un laboratorio». `HEX_RE` (STESSA di `colore.ts`, `normalizzaColore` —
// unica fonte di verità sul formato) riconosce l'hex; se `c.colore` lo è, esce dal pagliaio
// (stringa vuota) invece di entrarci. Il colore-PAROLA delle 6 facce standard («rossa»,
// «verde», ...) resta cercabile ESATTAMENTE come prima: digitare «rossa» accende ancora TUTTE
// le cassette rosse, comprese le libere — non era un difetto, non lo è restato.
//
// Sulle note laboratorio (FIX-K, G7, stessa ratifica 25/07 — «inseriamo invece la ricerca del
// campo note laboratorio che adesso non c'è»): `lavori.note_interne` (MAI `note_dentista`, che
// è un campo diverso e non è in scope) entra nel pagliaio SOLO per le cassette OCCUPATE — una
// LIBERA non ha un `lavoro`, quindi non ha note da cercare. GDPR: `note_interne` resta un dato
// interno al laboratorio, nessun canale esterno lo legge — nessun impatto aggiuntivo dal
// portarlo in un filtro che già gira lato client sui dati già caricati per QUESTO laboratorio.
//
// `normalizza` è quella CONDIVISA di `filtra-lavori-pila.ts` (§5.13): una sola definizione di
// «contains accento-insensibile» in tutta l'app.
import { normalizza } from '@/components/features/pile/filtra-lavori-pila'
import { HEX_RE } from '@/lib/cassette/colore'
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
    // FIX-K/K1 — l'hex esce dal pagliaio (stringa vuota), la parola-colore ci resta.
    const parolaColore = HEX_RE.test(c.colore) ? '' : c.colore
    const pagliaio = normalizza(
      l
        ? `${c.nome} n.${l.numero} ${l.dentista} ${l.paziente} ${l.pazienteAlias ?? ''} ${l.descrizione ?? ''} ${etichettaTipo} ${parolaColore} ${l.noteInterne ?? ''}`
        : `${c.nome} ${parolaColore}`
    )
    if (pagliaio.includes(q)) accesi.add(c.id)
  }
  return accesi
}

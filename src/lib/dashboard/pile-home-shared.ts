// Parte client-safe di `pile-home.ts` (Task 9) — tipi + funzioni pure (nessun
// accesso a Supabase/rete): `mapPileHome`, `subMorph`, `giornoBreve`. Estratte
// in un modulo proprio, SENZA `import 'server-only'`, perché componenti client
// (`HomeDesktop`, `SchedaAnteprima`, Task 9) ne hanno bisogno a runtime nel
// browser — `pile-home.ts` (server-only) le re-esporta invariate per i
// chiamanti server-side esistenti, così nessun import server preesistente cambia.
import type { StatoLavoro } from '@/types/domain'
import { derivaUrgenza, confrontaUrgenza, type Pila } from '@/lib/lavori/urgenza'
import type { Famiglia } from '@/components/ds/Pill'

export type RawLavoroPila = {
  id: string; numero_lavoro: string; stato: StatoLavoro
  data_consegna_prevista: string; ora_consegna: string | null
  numero_cassetta: string | null
  descrizione: string; created_at: string; updated_at: string
  clienti: { nome: string; cognome: string; studio_nome: string | null } | null
  pazienti: { codice_paziente: string | null } | null
  lavori_fasi: Array<{ eseguita_at: string | null; deleted_at: string | null; fase: { descrizione: string; ordine: number } | null }>
  lavoro_prove: Array<{ data_rientro_prevista: string | null; data_rientro_effettiva: string | null }>
  /** Tecnico assegnato (Task 9) — `tecnici.nome`/`.cognome` vivono sulla tabella
   *  stessa (verificato in `database.types.ts`, nessun giro per `utenti`). */
  tecnici: { nome: string; cognome: string } | null
}

export type LavoroPila = {
  id: string; numero: string; dentista: string; paziente: string; tipoLavoro: string
  /** Targa cassetta fisica (A14) — null se il lavoro non è in cassetta. */
  cassetta: string | null
  pill: { testo: string; famiglia: Famiglia }
  consegnabile: boolean
  consegna: { data: string; ora: string | null }
  /** Data (ISO) del rientro previsto della prova aperta — SOLO per i lavori in
   *  pila viola (§4.1/Task 8), `null` altrimenti. Alimenta `subMorph('viola', …)`. */
  rientro: string | null
  /** Le fasi del lavoro (Task 9), vive e ordinate (§5.11) — alimenta la card
   *  «Le fasi» di `SchedaAnteprima` (sola lettura, senza chi·quando). */
  fasi: Array<{ nome: string; fatta: boolean }>
  /** Nome e cognome del tecnico assegnato, `null` se non assegnato (Task 9). */
  tecnico: string | null
}
export type DatiPileStriscia = {
  ritardoPiuGrave: { numero: string; giorni: number } | null
  consegnaOggiNonPronta: { numero: string; ora: string | null } | null
  provaRientroOggi: string | null
  arrivoVecchio: string | null
  fermo: { id: string; numero: string; giorni: number } | null
  consegneOggiTotali: number
  prossimaOra: string | null
}
export type PileHome = { liste: Record<Pila, LavoroPila[]>; sub: Record<Pila, string>; striscia: DatiPileStriscia }

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MS_GIORNO = 24 * 60 * 60 * 1000

function dataLocale(iso: string): Date { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
/** Giorni interi da oggi alla data (negativo = passata) — esportata (review Task 9):
 *  `SchedaAnteprima` la usa per distinguere una consegna in ritardo da una futura. */
export function deltaGiorni(iso: string, oggi: Date): number {
  const zero = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
  return Math.round((dataLocale(iso).getTime() - zero.getTime()) / MS_GIORNO)
}
/** «oggi» · «domani» · «venerdì» (o «venerdì 10» con conNumero) — parole del banco §2.1. */
export function giornoBreve(iso: string, oggi: Date, conNumero = false): string {
  const delta = deltaGiorni(iso, oggi)
  if (delta === 0) return 'oggi'
  if (delta === 1) return 'domani'
  const d = dataLocale(iso)
  return conNumero ? `${GIORNI[d.getDay()]} ${d.getDate()}` : GIORNI[d.getDay()]
}
/** Nome del giorno della settimana, SENZA le scorciatoie «oggi»/«domani» — usato dal
 *  sub della pila ambra (banco): un lavoro sul banco non si segnala mai come «per domani»,
 *  la scadenza si legge sempre come giorno della settimana (verificato dal test §5.7).
 *  `conNumero` (Task 8, subMorph ambra) aggiunge il numero del giorno — stessa ragione
 *  del `giornoBreve(..., conNumero=true)` ma senza mai collassare su «domani» a delta 1. */
function nomeGiornoSettimana(iso: string, conNumero = false): string {
  const d = dataLocale(iso)
  return conNumero ? `${GIORNI[d.getDay()]} ${d.getDate()}` : GIORNI[d.getDay()]
}
/** «alle 16» · «alle 16:30» — il minuto :00 si omette (regola subline: il dato non si tronca, si accorcia). */
function oraBrevissima(ora: string | null): string | null {
  if (!ora) return null
  const [h, m] = ora.split(':')
  return m === '00' ? `alle ${Number(h)}` : `alle ${Number(h)}:${m}`
}
/** «16:00» — formato HH:mm per la striscia (mai parole, solo il dato). */
function formattaOraHHmm(ora: string | null): string | null {
  return ora ? ora.slice(0, 5) : null
}

function fraseRossa(l: { numero: string; giorniRitardo: number; ora: string | null }): string {
  if (l.giorniRitardo === 1) return `n.${l.numero} da ieri`
  if (l.giorniRitardo > 1) return `n.${l.numero} da ${l.giorniRitardo} giorni`
  return `n.${l.numero} ${oraBrevissima(l.ora) ?? 'oggi'}`
}

/** Fasi vive (non cancellate, con fase configurata) del lavoro, ordinate per `ordine`
 *  (§5.11/Task 5+9) — condivisa da `pillFase` (P6) e da `LavoroPila.fasi` (Task 9). */
function fasiVive(r: RawLavoroPila) {
  return r.lavori_fasi
    .filter((f) => !f.deleted_at && f.fase)
    .slice()
    .sort((a, b) => (a.fase!.ordine - b.fase!.ordine))
}

/** P6 — pill di fase per i lavori sul banco (ambra) senza pill temporale già decisa
 *  dall'adapter urgenza: fasi vive (non cancellate, con fase configurata) ordinate,
 *  l'ultima rimasta da fare vince come «STA PER FINIRE», altrimenti la fase corrente. */
function pillFase(r: RawLavoroPila, oggi: Date): { testo: string; famiglia: Famiglia } {
  const vive = fasiVive(r)
  const daFare = vive.filter((f) => !f.eseguita_at)
  if (daFare.length === 1) return { testo: 'STA PER FINIRE', famiglia: 'amber' }
  if (daFare.length > 1) return { testo: daFare[0].fase!.descrizione.toUpperCase(), famiglia: 'amber' }
  return { testo: `PER ${giornoBreve(r.data_consegna_prevista, oggi, true).toUpperCase()}`, famiglia: 'amber' }
}

type Interno = LavoroPila & { _u: ReturnType<typeof derivaUrgenza>; _raw: RawLavoroPila }

/** Rimuove i campi interni (_u, _raw) usati solo per costruire sub/striscia. */
function pulisci(liste: Record<Pila, Interno[]>): Record<Pila, LavoroPila[]> {
  const out = {} as Record<Pila, LavoroPila[]>
  for (const pila of Object.keys(liste) as Pila[]) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omissione intenzionale dei campi interni dallo spread
    out[pila] = liste[pila].map(({ _u, _raw, ...resto }) => resto)
  }
  return out
}

function costruisciSubRossa(lista: Interno[]): string {
  if (lista.length === 0) return 'Tutte consegnate ✓'
  return lista
    .slice(0, 2)
    .map((l) => fraseRossa({ numero: l.numero, giorniRitardo: l._u.giorniRitardo, ora: l.consegna.ora }))
    .join(' · ')
}

function costruisciSubAmbra(lista: Interno[]): string {
  if (lista.length === 0) return 'Niente sul banco'
  const p = lista[0]
  if (p._u.inCima) return fraseRossa({ numero: p.numero, giorniRitardo: p._u.giorniRitardo, ora: p.consegna.ora })
  return `n.${p.numero} per ${nomeGiornoSettimana(p.consegna.data)}`
}

function provaApertaDi(r: RawLavoroPila) {
  return r.lavoro_prove.find((pr) => pr.data_rientro_effettiva === null) ?? null
}

function costruisciSubViola(lista: Interno[], oggi: Date): string {
  if (lista.length === 0) return 'Nessuna prova in giro'
  const p = lista[0]
  const aperta = provaApertaDi(p._raw)
  if (!aperta?.data_rientro_prevista) return `n.${p.numero} in prova`
  return `n.${p.numero} torna ${giornoBreve(aperta.data_rientro_prevista, oggi)}`
}

function costruisciSubBlu(lista: Interno[]): string {
  if (lista.length === 0) return 'Nessun nuovo arrivo'
  if (lista.length === 1) return `n.${lista[0].numero} da confermare`
  if (lista.length === 2) return `n.${lista[0].numero} e n.${lista[1].numero} da confermare`
  const resto = lista.length - 2
  return `n.${lista[0].numero}, n.${lista[1].numero} e altri ${resto} da confermare`
}

function costruisciSub(liste: Record<Pila, Interno[]>, oggi: Date): Record<Pila, string> {
  return {
    rossa: costruisciSubRossa(liste.rossa),
    ambra: costruisciSubAmbra(liste.ambra),
    viola: costruisciSubViola(liste.viola, oggi),
    blu: costruisciSubBlu(liste.blu),
  }
}

function costruisciStriscia(liste: Record<Pila, Interno[]>, oggi: Date): DatiPileStriscia {
  const inCimaRossa = liste.rossa.find((x) => x._u.inCima) ?? null
  const inCimaAmbra = liste.ambra.find((x) => x._u.inCima) ?? null
  const ritardo = inCimaRossa ?? inCimaAmbra
  const ritardoPiuGrave = ritardo ? { numero: ritardo.numero, giorni: ritardo._u.giorniRitardo } : null

  const nonProntaOggi =
    liste.ambra.find((x) => !x._u.inFondo && deltaGiorni(x.consegna.data, oggi) === 0) ?? null
  const consegnaOggiNonPronta = nonProntaOggi
    ? { numero: nonProntaOggi.numero, ora: formattaOraHHmm(nonProntaOggi.consegna.ora) }
    : null

  const zeroOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
  const provaOggi =
    liste.viola.find((x) => {
      const aperta = provaApertaDi(x._raw)
      if (!aperta?.data_rientro_prevista) return false
      return dataLocale(aperta.data_rientro_prevista).getTime() <= zeroOggi.getTime()
    }) ?? null
  const provaRientroOggi = provaOggi ? provaOggi.numero : null

  const vecchio =
    liste.blu.find((x) => oggi.getTime() - new Date(x._raw.created_at).getTime() > MS_GIORNO) ?? null
  const arrivoVecchio = vecchio ? vecchio.numero : null

  const giorniFermo = (x: Interno) => Math.floor((oggi.getTime() - new Date(x._raw.updated_at).getTime()) / MS_GIORNO)
  const fermoTrovato = liste.ambra.find((x) => x._u.inFondo && giorniFermo(x) >= 5) ?? null
  const fermo = fermoTrovato
    ? { id: fermoTrovato.id, numero: fermoTrovato.numero, giorni: giorniFermo(fermoTrovato) }
    : null

  const consegneOggiTotali = liste.rossa.length

  const primaOraRossa = liste.rossa.find((x) => !x._u.inCima && x.consegna.ora) ?? null
  const prossimaOra = primaOraRossa ? formattaOraHHmm(primaOraRossa.consegna.ora) : null

  return { ritardoPiuGrave, consegnaOggiNonPronta, provaRientroOggi, arrivoVecchio, fermo, consegneOggiTotali, prossimaOra }
}

export function mapPileHome(rows: RawLavoroPila[], oggi: Date): PileHome {
  const liste: Record<Pila, Interno[]> = { rossa: [], ambra: [], viola: [], blu: [] }

  for (const r of rows) {
    const u = derivaUrgenza({ stato: r.stato, data_consegna_prevista: r.data_consegna_prevista, ora_consegna: r.ora_consegna }, oggi)
    if (!u.pila) continue
    liste[u.pila].push({
      id: r.id, numero: r.numero_lavoro,
      cassetta: r.numero_cassetta,
      dentista: r.clienti?.studio_nome ?? (`${r.clienti?.nome ?? ''} ${r.clienti?.cognome ?? ''}`.trim() || '—'),
      paziente: r.pazienti?.codice_paziente ?? '—',
      tipoLavoro: r.descrizione,
      pill: u.pillTempo ?? pillFase(r, oggi),
      consegnabile: u.consegnabile,
      consegna: { data: r.data_consegna_prevista, ora: r.ora_consegna },
      rientro: provaApertaDi(r)?.data_rientro_prevista ?? null,
      fasi: fasiVive(r).map((f) => ({ nome: f.fase!.descrizione, fatta: !!f.eseguita_at })),
      tecnico: r.tecnici ? `${r.tecnici.nome} ${r.tecnici.cognome}`.trim() : null,
      _u: u, _raw: r,
    })
  }
  for (const pila of Object.keys(liste) as Pila[]) {
    liste[pila].sort((a, b) => confrontaUrgenza(
      { urgenza: a._u, data: a.consegna.data, ora: a.consegna.ora },
      { urgenza: b._u, data: b.consegna.data, ora: b.consegna.ora },
    ))
  }
  return { liste: pulisci(liste), sub: costruisciSub(liste, oggi), striscia: costruisciStriscia(liste, oggi) }
}

/** «N lavori» / «1 lavoro» — plurale di legge del morph header (§5.28). */
function contaLavori(n: number): string {
  return n === 1 ? '1 lavoro' : `${n} lavori`
}

/** Il primo lavoro della pila NON in fondo (sospesi/fermi esclusi — riconoscibili
 *  dalla pill «FERMO», l'unica che `derivaUrgenza` assegna a `inFondo`). La lista
 *  è già ordinata coi fermi in coda (§4.1): quando esiste un lavoro non-fermo è
 *  sempre lui il primo del filtro; se la pila è TUTTA ferma si ripiega su `lista[0]`. */
function primoNonInFondo(lista: LavoroPila[]): LavoroPila {
  return lista.find((l) => l.pill.testo !== 'FERMO') ?? lista[0]
}

/**
 * subMorph — la sub-riga del morph header della pila aperta (§5.28, Task 8):
 * «2 lavori · il più vicino alle 16:00» (rossa) · «4 lavori · il più vicino
 * venerdì 10» (ambra) · «1 lavoro · torna lunedì 13» (viola) · «2 lavori · da
 * confermare» (blu). `undefined` a pila vuota — niente sub da mostrare, il
 * morph a 0 basta da solo (mockup stati-vuoti-errori.html).
 *
 * Deviazione documentata (Task 8, verificata dal test): l'ambra usa il nome
 * del giorno della settimana `conNumero` (mai «domani») — un lavoro sul banco
 * non si legge mai con le scorciatoie di `giornoBreve`, stessa ragione già
 * valida per `costruisciSubAmbra` (§5.7).
 */
export function subMorph(pila: Pila, pile: PileHome, oggi: Date): string | undefined {
  const lista = pile.liste[pila]
  if (lista.length === 0) return undefined
  const conteggio = contaLavori(lista.length)

  switch (pila) {
    case 'rossa': {
      const ora = pile.striscia.prossimaOra
      return ora ? `${conteggio} · il più vicino alle ${ora}` : conteggio
    }
    case 'ambra': {
      const p = primoNonInFondo(lista)
      return `${conteggio} · il più vicino ${nomeGiornoSettimana(p.consegna.data, true)}`
    }
    case 'viola': {
      const rientro = lista[0].rientro
      return rientro ? `${conteggio} · torna ${giornoBreve(rientro, oggi, true)}` : `${conteggio} · in prova`
    }
    case 'blu':
      return `${conteggio} · da confermare`
  }
}

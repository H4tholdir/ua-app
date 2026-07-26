import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMaterialiEsaurimento, getPagamentiScadutiTop } from '@/lib/dashboard/queries'
import { adessoRoma } from '@/lib/utils/data-roma'
import type { DatiPileStriscia, PileHome } from './pile-home'

export type SegnaleStriscia = {
  attenzione: boolean
  forte: string | null // parte in grassetto --ink
  testo: string // resto della riga (1 riga, ellissi CSS)
  azione: { etichetta: string; href: string } | null // CTA mai troncata
  tono?: 'ambra'
  // Task 15 — marca il racconto backfill: al tap della CTA il chiamante, oltre a navigare,
  // scrive `parete_intro_vista` (fire-and-forget). Assente su ogni altro segnale.
  intro?: true
  // Task 16 (D3 §3.4) — nessuna striscia da mostrare: la home NON renderizza lo slot (il saluto
  // respira). Sostituisce il vecchio segnale 9 «Tutto a posto», che compariva sempre anche a
  // costo di dire il nulla. Nessun consumer legge ancora questo campo in questa tranche (16a) —
  // l'adattamento UI (StrisciaStato + HomeV3, hide dello slot) è compito della tranche 16b.
  silenzio?: true
  // Task 16 (D3 §3.4) — chiave stabile per il dedup client-side dei «racconti» (riserva UX 5c):
  // stesso evento → stesso eventoId → il componente (tranche 16b, localStorage) non lo ri-mostra
  // dopo il primo tap. Presente solo sui segnali «racconto» (oggi: sRaccontoLiberazione);
  // assente altrove.
  eventoId?: string
  // Task 16a-bis (ratifica 26/07/2026) — numero degli ALTRI allarmi di livello 1 accesi insieme
  // a questo (count - 1), quando 2+ sono accesi. Presente SOLO in quel caso — con un solo
  // allarme il campo è assente (mai `altri: 0`, v. `scegliSegnale`). La UI (tranche 16b, fuori
  // scope qui) lo renderizza in un nodo separato che non si accorcia — MAI concatenato dentro
  // `testo`, che StrisciaStato.tsx:93-104 tronca con ellissi CSS a 390px. Copy esatta da usare,
  // verbatim, per la tranche UI:
  //   altri === 1  → «e un'altra»
  //   altri > 1    → «e altre N»
  altri?: number
}
export type IngressiStriscia = {
  fatturaScartata: { id: string; numero: string } | null
  materialeRosso: string | null
  pagamentoScaduto: string | null
  ddcOggi: number
  // O1f (Task 11) — propagati dal chiamante, NON da fetchIngressiStriscia:
  // `senzaAnagrafica` esce già da getPerimetroHome (perimetro tecnico);
  // `tecniciSenzaAnagrafica` è una query separata, agganciata nel Promise.all
  // di `(app)/dashboard/page.tsx`, apposta FUORI da questo modulo — vedi nota
  // su `leggiTecniciSenzaAnagrafica` più sotto sul perché non vive qui dentro.
  senzaAnagrafica?: boolean
  tecniciSenzaAnagrafica?: string[]
  // O1i (Task 10) — propagato dal chiamante (stile O1f), NON da
  // fetchIngressiStriscia: v. nota su `sTrial` più sotto.
  trial?: { giorniRimasti: number } | null
  // Task 15 — racconto backfill (una tantum): totale cassette del lab (`getParete`, già letto
  // in dashboard/page.tsx) + se l'utente ha già liquidato l'intro (`nav_preferences
  // .parete_intro_vista`). Optional come `trial`/`tecniciSenzaAnagrafica`: assente (es. admin
  // live preview) → nessun segnale nuovo.
  parete?: { n: number; introVista: boolean }
  // Task 16 (D3 §3.4) — racconto «UÀ ha liberato <cassetta>»: ultima liberazione per consegna
  // (`liberato_per='consegna'`) nelle ultime 24h. Propagato dal chiamante (stile
  // `trial`/`tecniciSenzaAnagrafica`), letto da `leggiLiberazioneRecente` più sotto — NON dentro
  // `fetchIngressiStriscia`, per lo stesso motivo di `leggiTecniciSenzaAnagrafica`: è lab-wide,
  // non uno dei 4 ingressi fiscali/pagamenti/ddc gestiti lì.
  liberazioneRecente?: { cassettaId: string; nome: string; quando: string } | null
  pile: DatiPileStriscia
}

// Valori runtime confermati allo Step 1 (grep su src/app/api/fatture, src/types/domain.ts,
// migration 002_fase2_schema.sql): lo stato SDI granulare NON conosce 'scartata' né
// 'mancata_consegna' (erano valori del CHECK originario in supabase/schema.sql, sostituito
// dalla migration 002 con lo StatoSDI attuale). L'unico stato realmente scritto/letto dal
// codice che rappresenta un rifiuto SDI è 'rifiutata'.
export const SDI_SCARTATE = ['rifiutata']

type Candidato = (i: IngressiStriscia) => SegnaleStriscia | null
const s1: Candidato = (i) => i.fatturaScartata && { attenzione: true, forte: `Fattura n.${i.fatturaScartata.numero}`, testo: 'scartata', azione: { etichetta: 'Sistemala ›', href: `/fatture/${i.fatturaScartata.id}` } }
// Fix review Task 16a, finding importante #1: s2 bundlava DUE allarmi distinti (ritardo più
// grave E consegna di oggi non pronta) in un'unica funzione con precedenza interna — se
// entrambi i campi delle pile erano valorizzati insieme (routine: un lavoro in ritardo grave +
// un altro con consegna di oggi non ancora pronta), il secondo restava invisibile ANCHE sotto
// l'aggregazione, perché `candidatiLivello1` conta le FUNZIONI candidate, non gli allarmi
// effettivamente accesi — la riserva UX 5a («mai un allarme nascosto dietro un altro») valeva
// solo a metà. Divisi in due candidati indipendenti — copy e href INVARIATI verbatim — così
// possono accendersi insieme e contribuire entrambi al conteggio dell'aggregato.
const s2: Candidato = (i) => {
  const r = i.pile.ritardoPiuGrave
  return r ? { attenzione: true, forte: `n.${r.numero}`, testo: r.giorni === 1 ? 'doveva uscire ieri' : `doveva uscire ${r.giorni} giorni fa`, azione: { etichetta: 'Apri ›', href: '/lavori?pila=rossa' } } : null
}
const s2b: Candidato = (i) => {
  const c = i.pile.consegnaOggiNonPronta
  return c ? { attenzione: true, forte: `n.${c.numero}`, testo: c.ora ? `non è ancora pronto per le ${c.ora}` : 'non è ancora pronto per oggi', azione: { etichetta: 'Apri ›', href: '/lavori?pila=ambra' } } : null
}
// Task 16a-bis, punto 3 — verificato in `src/lib/lavori/urgenza.ts:69-70`: lo stato
// `in_ritardo` forza `giorniRitardo = Math.max(1, dalleDate)` ANCHE quando la data di consegna
// prevista è oggi (`dalleDate=0`, la data non è ancora passata — il trigger ha già marcato il
// lavoro in ritardo prima che scadesse). Quel lavoro finisce `inCima` nella pila ambra CON
// `deltaGiorni(consegna.data, oggi) === 0` — la STESSA condizione che accende
// `consegnaOggiNonPronta` (v. `costruisciStriscia` in pile-home-shared.ts:172-182, che non
// esclude gli `inCima` dal proprio filtro). `ritardoPiuGrave` e `consegnaOggiNonPronta` NON sono
// quindi garantiti disgiunti: un solo lavoro fisico può accendere sia s2 sia s2b, e leggerebbe
// come «e un'altra» per un lavoro che non esiste. Si confronta per `numero` — unico
// identificatore condiviso dai due campi di `DatiPileStriscia` (niente `id` qui): stesso numero
// → stesso lavoro.
function stessoLavoroRitardoOggi(i: IngressiStriscia): boolean {
  const r = i.pile.ritardoPiuGrave
  const c = i.pile.consegnaOggiNonPronta
  return !!r && !!c && r.numero === c.numero
}
// `s2b` si spegne (torna null) quando è lo STESSO lavoro di `s2` — resta solo il ritardo (più
// informativo: dice da quanti giorni doveva uscire), mai contato due volte nell'aggregato.
const s2bDedup: Candidato = (i) => (stessoLavoroRitardoOggi(i) ? null : s2b(i))
const s3: Candidato = (i) => i.pile.provaRientroOggi ? { attenzione: true, forte: `n.${i.pile.provaRientroOggi}`, testo: 'torna oggi dalla prova', azione: { etichetta: 'Apri ›', href: '/lavori?pila=viola' } } : null
const s4: Candidato = (i) => i.pile.arrivoVecchio ? { attenzione: true, forte: `n.${i.pile.arrivoVecchio}`, testo: 'aspetta conferma da ieri', azione: { etichetta: 'Conferma ›', href: '/lavori?pila=blu' } } : null
const s5: Candidato = (i) => i.materialeRosso ? { attenzione: true, forte: i.materialeRosso, testo: 'sta per finire', azione: { etichetta: 'Riordina ›', href: '/magazzino' } } : null
const s6: Candidato = (i) => i.pile.fermo && i.pile.fermo.giorni >= 5 ? { attenzione: true, forte: `n.${i.pile.fermo.numero}`, testo: `è fermo da ${i.pile.fermo.giorni} giorni`, azione: { etichetta: 'Apri ›', href: `/lavori/${i.pile.fermo.id}` } } : null
const s7: Candidato = (i) => i.pagamentoScaduto ? { attenzione: true, forte: i.pagamentoScaduto, testo: 'ha un pagamento scaduto', azione: { etichetta: 'Guarda ›', href: '/scadenzario' } } : null
const s8: Candidato = (i) => i.ddcOggi > 0 ? { attenzione: false, forte: null, testo: `Oggi ho preparato ${i.ddcOggi} DdC ✓`, azione: null } : null
// Il vecchio segnale 9 «Tutto a posto: N consegne oggi…» è MORTO (D3 §3.4, Task 16, 3-bis):
// compariva SEMPRE, anche a costo di dire il nulla. Ora, se nessun candidato accende nulla,
// `scegliSegnale` restituisce `silenzio: true` — il saluto respira, la striscia sparisce.

// O1f (Task 11) — dead-end silenzioso: un tecnico con account ma senza riga
// `tecnici` vedeva pile vuote + s9 sereno, senza sapere perché.
// Task 16 (D3 §3.4): `sTecAccount` è sceso nella catena di fallback (sotto il livello 1
// aggregato, v. `FALLBACK_PER_RUOLO`) — nel codice non è più "il primo che vince", ma lo resta
// NELLA PRATICA: quando `senzaAnagrafica` è true le pile sono comunque vuote per costruzione
// (v. `getPileHome`/`senzaAnagrafica`), quindi nessun candidato di livello 1 (s2/s3/s4/s6) può
// accendersi prima che si arrivi qui — resta l'unica cosa da dire al tecnico.
const sTecAccount: Candidato = (i) => i.senzaAnagrafica
  ? { attenzione: true, forte: 'Il tuo account', testo: 'non è ancora configurato — avvisa il titolare', azione: null }
  : null
// `sTitTecnici` avvisa titolare/admin_rete che uno o più utenti ruolo
// tecnico non hanno ancora la riga `tecnici` collegata (stesso bug di
// perimetro dal lato titolare) — vive nella catena di fallback (sotto il
// livello 1 aggregato, v. `FALLBACK_PER_RUOLO`), sopra al sereno s8 e al silenzio (D3).
const sTitTecnici: Candidato = (i) => i.tecniciSenzaAnagrafica?.length
  ? { attenzione: true, forte: `Account di ${i.tecniciSenzaAnagrafica[0]}`, testo: 'da completare', azione: { etichetta: 'Apri ›', href: '/tecnici' } }
  : null

// Review finale (20/07) — giorni CIVILI di Roma, non periodi di 24h: le copy
// sTrial («finisce oggi/domani») parlano di calendario. Con una sottrazione
// fra epoche assolute (Math.ceil((fine - ora)/86.4M)) nell'ULTIMO giorno di
// trial (poche ore residue) il risultato era 1 → «finisce domani» invece di
// «finisce oggi», e 0 («finisce oggi») era irraggiungibile prima che il
// redirect di layout portasse a scaduto. Qui si confronta il giorno civile
// di Roma di `oggiRoma` (già wall-clock, passare `adessoRoma()`) con quello
// di `trialEndsAt` convertito allo stesso modo — mai un conteggio di ore.
export function giorniCiviliRimasti(trialEndsAt: string, oggiRoma: Date): number {
  const zeroOggi = new Date(oggiRoma.getFullYear(), oggiRoma.getMonth(), oggiRoma.getDate())
  const fineRoma = adessoRoma(new Date(trialEndsAt))
  const zeroFine = new Date(fineRoma.getFullYear(), fineRoma.getMonth(), fineRoma.getDate())
  return Math.max(0, Math.round((zeroFine.getTime() - zeroOggi.getTime()) / 86_400_000))
}

// O1i — segnale trial (decisions 20/07): ambra informativa finché il trial va,
// rossa negli ultimi 3 giorni. SOLO titolare/admin_rete (la CTA è Abbonamento).
// Scaduto/sospeso NON passano di qui: li gestiscono i redirect di layout (B15).
const TESTO_FINE: Record<number, string> = { 0: 'finisce oggi', 1: 'finisce domani', 2: 'finisce dopodomani', 3: 'finisce fra 3 giorni' }
const sTrial: Candidato = (i) => {
  const g = i.trial?.giorniRimasti
  if (g === undefined || g === null || g < 0) return null
  const azione = { etichetta: 'Attiva ›', href: '/impostazioni/abbonamento' }
  if (g <= 3) return { attenzione: true, forte: 'Prova:', testo: TESTO_FINE[g], azione }
  return { attenzione: false, tono: 'ambra', forte: 'Prova:', testo: `mancano ${g} giorni`, azione }
}

// Task 15 — racconto backfill (§6, una tantum): segnale QUIETO (attenzione:false, nessun `tono`
// → il ✓ verde sereno, riuso del tono quieto esistente, nessun tono nuovo). Invita a colorare/
// ordinare le cassette appena create dal backfill; compare SOLO se ci sono cassette (`n>0`) e
// l'utente non ha già liquidato l'intro. La clausola azionabile vive in `azione` — l'UNICO
// elemento tappabile della striscia (§5.24): il tap naviga a /cassette E scrive
// `parete_intro_vista` (il flag `intro` lo dice al chiamante). Il testo è verbatim dalla spec §6.
const sPareteIntro: Candidato = (i) =>
  i.parete && i.parete.n > 0 && !i.parete.introVista
    ? { attenzione: false, intro: true, forte: null, testo: i.parete.n === 1 ? 'UÀ ha creato 1 cassetta dai tuoi lavori —' : `UÀ ha creato ${i.parete.n} cassette dai tuoi lavori —`, azione: { etichetta: 'colorale e mettile in ordine ›', href: '/cassette' } }
    : null

// Task 16 (D3 §3.4) — livello 1: mai un allarme nascosto dietro un altro. Stesso perimetro per
// ruolo di prima (P7 §6 tabella Ruoli + §3.2 front_desk «parte dagli operativi»): i candidati
// ammessi per ruolo non cambiano.
// Task 16a-bis (ratifica 26/07/2026) — «chi nomina, chi conta»: quando 2+ sono accesi insieme
// NON si sintetizza più un aggregato «N scadenze oggi» (v. `scegliSegnale`) — vince il PRIMO
// dell'array, che nomina la striscia con la propria copy/href verbatim; gli altri si contano
// (v. `SegnaleStriscia.altri`). L'ORDINE DI QUESTO ARRAY È ORA PORTANTE — prima era ininfluente
// (con l'aggregazione a numero nessuno leggeva quale fosse il primo); ora decide QUALE allarme
// parla quando 2+ sono accesi insieme. Il trial ≤3gg (riserva UX 5b) entra qui SOLO per
// titolare/admin_rete (unici ruoli che lo vedono, O1i) — v. `candidatiLivello1`, che lo mette in
// TESTA (non in coda) quando acceso: a giorni dal blocco dell'app dev'essere lui a parlare, non
// un allarme operativo qualsiasi arrivato prima in quest'array.
// Fix review Task 16a #1: `s2b` (consegna oggi non pronta, ex metà di s2) aggiunta SUBITO dopo
// `s2` (ritardo) in ogni lista di ruolo — stesso perimetro di prima (s2b era già raggiungibile
// da ogni ruolo che vedeva s2, solo nascosta dentro la stessa funzione). Task 16a-bis: qui sotto
// si usa `s2bDedup`, non `s2b` — ritardo e consegna-oggi-non-pronta NON sono garantiti disgiunti
// (v. commento su `stessoLavoroRitardoOggi` sopra s2bDedup), un lavoro in stato `in_ritardo` con
// consegna prevista oggi accende ENTRAMBI per lo stesso lavoro fisico.
const LIVELLO1_PER_RUOLO: Record<string, Candidato[]> = {
  titolare: [s1, s2, s2bDedup, s3, s4, s5, s6, s7],
  admin_rete: [s1, s2, s2bDedup, s3, s4, s5, s6, s7],
  front_desk: [s2, s2bDedup, s3, s4, s1, s5, s6], // niente s7 (pagamenti — P7: solo tit/admin_rete)
  tecnico: [s2, s2bDedup, s3, s4, s6], // niente s1/s5/s7 (fiscali/pagamenti — P7: mai al tecnico)
}
function candidatiLivello1(ruolo: string, i: IngressiStriscia): SegnaleStriscia[] {
  const perRuolo = LIVELLO1_PER_RUOLO[ruolo] ?? LIVELLO1_PER_RUOLO.tecnico
  const accesi = perRuolo.map((c) => c(i)).filter((s): s is SegnaleStriscia => !!s)
  const g = i.trial?.giorniRimasti
  if ((ruolo === 'titolare' || ruolo === 'admin_rete') && g !== undefined && g !== null && g >= 0 && g <= 3) {
    const t = sTrial(i)
    // Ratifica 26/07 — «ordine di parola»: il trial ≤3gg va in TESTA (unshift), non in coda
    // (push, come prima). La testa dell'array è ora l'allarme che `scegliSegnale` NOMINA — a
    // giorni dal blocco dell'app dev'essere il trial a parlare per primo, mai un allarme
    // operativo qualsiasi che sia arrivato prima nella lista di ruolo.
    if (t) accesi.unshift(t)
  }
  return accesi
}

// Task 16 (D3 §3.4) — racconto «UÀ ha liberato <cassetta>» (riserva UX 5c): quieto
// (attenzione:false), tappabile verso la parete. `eventoId` stabile
// (`lib-<cassettaId>-<quando>`, `quando` esattamente come Postgres lo restituisce — v.
// `leggiLiberazioneRecente` più sotto, MAI riformattato) per il dedup client-side (tranche 16b,
// localStorage): stessa liberazione → stesso eventoId → non si ripete dopo il primo tap.
const sRaccontoLiberazione: Candidato = (i) =>
  i.liberazioneRecente
    ? { attenzione: false, forte: null, testo: `UÀ ha liberato ${i.liberazioneRecente.nome}`,
        azione: { etichetta: 'Guarda ›', href: '/dashboard?stanza=parete' },
        eventoId: `lib-${i.liberazioneRecente.cassettaId}-${i.liberazioneRecente.quando}` }
    : null

// Task 16 (D3 §3.4) — catena di fallback: valutata SOLO se il livello 1 non ha prodotto 2+
// allarmi (0 allarmi: si scende qui; 1 allarme: torna quello, invariato — v. `scegliSegnale`).
// Stesso perimetro per ruolo della vecchia `GERARCHIE` (morta, 3-bis): `sTecAccount` resta SOLO
// tecnico (O1f — le pile sono vuote per costruzione quando scatta, v. commento su `sTecAccount`),
// `sTitTecnici`/`sTrial` restano SOLO titolare/admin_rete; `sPareteIntro` e
// `sRaccontoLiberazione` sono lab-wide (valgono per ogni ruolo, come il vecchio sPareteIntro);
// s8 (DdC) chiude, resta un racconto. Il vecchio s9 «Tutto a posto» è MORTO: se nessuno di
// questi accende nulla, si arriva al `silenzio` in fondo a `scegliSegnale` — il saluto respira.
const FALLBACK_PER_RUOLO: Record<string, Candidato[]> = {
  titolare: [sTitTecnici, sTrial, sPareteIntro, sRaccontoLiberazione, s8],
  admin_rete: [sTitTecnici, sTrial, sPareteIntro, sRaccontoLiberazione, s8],
  front_desk: [sPareteIntro, sRaccontoLiberazione, s8],
  tecnico: [sTecAccount, sPareteIntro, sRaccontoLiberazione, s8],
}

export function scegliSegnale(ruolo: string, i: IngressiStriscia): SegnaleStriscia {
  // 1) allarmi di livello 1 (già filtrati per ruolo, trial in testa se acceso — v.
  // `candidatiLivello1`). Task 16a-bis (ratifica 26/07/2026, Francesco Formicola): il vecchio
  // aggregato sintetico «N scadenze oggi — Vedi › /lavori» è MORTO. Due fatti emersi dopo la
  // ratifica 24/07 (D3 §3.4): (1) `/lavori` senza `?pila=` fa redirect a `/dashboard`
  // (src/app/(app)/lavori/page.tsx:36) — la CTA riportava l'utente esattamente alla home da cui
  // era partito, per QUALSIASI aggregato, non solo quelli misti; (2) il livello 1 non è un
  // insieme omogeneo di "scadenze" — include anche stati SENZA finestra temporale (materiale in
  // esaurimento, pagamento scaduto), quindi «2+ accesi» è il riposo del laboratorio, non
  // un'eccezione. Ora: la striscia NOMINA il primo allarme (copy/href suoi, verbatim, invariati)
  // e CONTA gli altri in `altri`. Con un solo allarme: passthrough, NESSUN campo `altri` (mai
  // `altri: 0`) — byte-identico a prima di questa tranche.
  const allarmi = candidatiLivello1(ruolo, i)
  if (allarmi.length >= 2) {
    const [primo, ...resto] = allarmi
    return { ...primo, altri: resto.length }
  }
  if (allarmi.length === 1) return allarmi[0]
  // 2) fallback per ruolo: account/tecnici scoperti · trial fuori dall'ultima finestra ·
  // racconti · SILENZIO (mai più un s9 di default).
  const fallback = FALLBACK_PER_RUOLO[ruolo] ?? FALLBACK_PER_RUOLO.tecnico
  for (const c of fallback) {
    const s = c(i)
    if (s) return s
  }
  return { attenzione: false, forte: null, testo: '', azione: null, silenzio: true }
}

// I ruoli che vedono segnali fiscali/materiali (tit/fd, P7) e pagamenti (solo tit/admin_rete).
function usaFiscali(ruolo: string): boolean {
  return ruolo === 'titolare' || ruolo === 'admin_rete' || ruolo === 'front_desk'
}
function usaPagamenti(ruolo: string): boolean {
  return ruolo === 'titolare' || ruolo === 'admin_rete'
}

async function leggiFatturaScartata(svc: SupabaseClient, labId: string): Promise<IngressiStriscia['fatturaScartata']> {
  try {
    const { data, error } = await svc
      .from('fatture')
      .select('id, numero')
      .eq('laboratorio_id', labId)
      .in('stato_sdi', SDI_SCARTATE)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw error
    const riga = (data as Array<{ id: string; numero: string }> | null)?.[0]
    return riga ? { id: riga.id, numero: riga.numero } : null
  } catch (err) {
    console.error('[getSegnaleStriscia] lettura fatturaScartata fallita — degrado a null:', err)
    return null
  }
}

async function leggiMaterialeRosso(svc: SupabaseClient, labId: string): Promise<string | null> {
  try {
    const materiali = await getMaterialiEsaurimento(svc, labId, 1)
    return materiali[0]?.nome ?? null
  } catch (err) {
    console.error('[getSegnaleStriscia] lettura materialeRosso fallita — degrado a null:', err)
    return null
  }
}

async function leggiPagamentoScaduto(svc: SupabaseClient, labId: string): Promise<string | null> {
  try {
    const pagamenti = await getPagamentiScadutiTop(svc, labId, 1)
    return pagamenti[0]?.cliente_display ?? null
  } catch (err) {
    console.error('[getSegnaleStriscia] lettura pagamentoScaduto fallita — degrado a null:', err)
    return null
  }
}

async function leggiDdcOggi(svc: SupabaseClient, labId: string): Promise<number> {
  try {
    const oggiMezzanotte = new Date()
    oggiMezzanotte.setHours(0, 0, 0, 0)
    const { count, error } = await svc
      .from('dichiarazioni_conformita')
      .select('id', { count: 'exact', head: true })
      .eq('laboratorio_id', labId)
      .neq('stato', 'annullata')
      .gte('created_at', oggiMezzanotte.toISOString())
    if (error) throw error
    return count ?? 0
  } catch (err) {
    console.error('[getSegnaleStriscia] lettura ddcOggi fallita — degrado a 0:', err)
    return 0
  }
}

// O1f (Task 11) — utenti ruolo 'tecnico' attivi/non-deleted del lab SENZA
// riga `tecnici` corrispondente (confronto via `tecnici.utente_id`).
// Esportata e chiamata dal CHIAMANTE (`(app)/dashboard/page.tsx`), NON
// aggiunta al Promise.all di `fetchIngressiStriscia` qui sotto: quella
// funzione è condivisa anche da `getSegnaleStriscia`, usata dall'anteprima
// admin (`/admin/labs/[id]/live`) che gira sempre con ruolo 'titolare' — se
// la query vivesse qui dentro, l'anteprima mostrerebbe segnali reali sui
// tecnici scoperti del lab osservato. Tenendola fuori, per l'anteprima
// `tecniciSenzaAnagrafica` resta `undefined` → nessun segnale nuovo (voluto).
export async function leggiTecniciSenzaAnagrafica(svc: SupabaseClient, labId: string): Promise<string[]> {
  try {
    const [utentiRes, tecniciRes] = await Promise.all([
      svc.from('utenti').select('id, nome').eq('laboratorio_id', labId).eq('ruolo', 'tecnico').eq('attivo', true).is('deleted_at', null),
      svc.from('tecnici').select('utente_id').eq('laboratorio_id', labId).is('deleted_at', null),
    ])
    if (utentiRes.error) throw utentiRes.error
    if (tecniciRes.error) throw tecniciRes.error
    const conAnagrafica = new Set(
      ((tecniciRes.data ?? []) as Array<{ utente_id: string | null }>)
        .map((t) => t.utente_id)
        .filter((id): id is string => !!id)
    )
    return ((utentiRes.data ?? []) as Array<{ id: string; nome: string }>)
      .filter((u) => !conAnagrafica.has(u.id))
      .map((u) => u.nome)
  } catch (err) {
    console.error('[getSegnaleStriscia] lettura tecniciSenzaAnagrafica fallita — degrado a []:', err)
    return []
  }
}

// Task 16 (D3 §3.4) — racconto «UÀ ha liberato <cassetta>»: ultima riga `cassette_lavori`
// liberata per consegna (`liberato_per='consegna'`) nelle ultime 24h, col nome della cassetta
// (join `cassette.nome`). Esportata e chiamata dal CHIAMANTE (`(app)/dashboard/page.tsx`) nel
// proprio Promise.all — stesso motivo di `leggiTecniciSenzaAnagrafica` sopra: è lab-wide (vale
// per ogni ruolo), non uno dei 4 ingressi fiscali/pagamenti/ddc di `fetchIngressiStriscia`. Il
// chiamante gira con `getServiceClient()`, che BYPASSA la RLS: il filtro `.eq('laboratorio_id',
// labId)` qui sotto è OBBLIGATORIO, non opzionale — senza, si leggerebbero liberazioni di
// QUALSIASI lab.
export async function leggiLiberazioneRecente(svc: SupabaseClient, labId: string): Promise<IngressiStriscia['liberazioneRecente']> {
  try {
    const dalleUltime24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await svc
      .from('cassette_lavori')
      .select('cassetta_id, liberato_at, cassette(nome)')
      .eq('laboratorio_id', labId)
      .eq('liberato_per', 'consegna')
      .gt('liberato_at', dalleUltime24h)
      .order('liberato_at', { ascending: false })
      .limit(1)
    if (error) throw error
    // `cassette(nome)` è un embed to-one (FK cassette_lavori.cassetta_id → cassette.id), ma
    // senza un `Database` generic sul client il tipo inferito da postgrest-js è comunque un
    // array (stessa cautela di `getPileHome`/`getParete`, che passano da `unknown`) — si
    // normalizza qui sia l'array sia l'eventuale oggetto singolo.
    const riga = (data as unknown as Array<{ cassetta_id: string; liberato_at: string; cassette: { nome: string } | { nome: string }[] | null }> | null)?.[0]
    const nome = riga ? (Array.isArray(riga.cassette) ? riga.cassette[0]?.nome : riga.cassette?.nome) : undefined
    if (!riga || !nome) return null
    return { cassettaId: riga.cassetta_id, nome, quando: riga.liberato_at }
  } catch (err) {
    console.error('[getSegnaleStriscia] lettura liberazioneRecente fallita — degrado a null:', err)
    return null
  }
}

export async function fetchIngressiStriscia(
  svc: SupabaseClient, labId: string, ruolo: string
): Promise<Omit<IngressiStriscia, 'pile'>> {
  const [fatturaScartata, materialeRosso, pagamentoScaduto, ddcOggi] = await Promise.all([
    usaFiscali(ruolo) ? leggiFatturaScartata(svc, labId) : Promise.resolve(null),
    usaFiscali(ruolo) ? leggiMaterialeRosso(svc, labId) : Promise.resolve(null),
    usaPagamenti(ruolo) ? leggiPagamentoScaduto(svc, labId) : Promise.resolve(null),
    leggiDdcOggi(svc, labId),
  ])
  return { fatturaScartata, materialeRosso, pagamentoScaduto, ddcOggi }
}

// NB: getSegnaleStriscia NON può emettere sTecAccount/sTitTecnici/sPareteIntro/
// sRaccontoLiberazione — questi candidati dipendono da ingressi
// (senzaAnagrafica/tecniciSenzaAnagrafica/parete/liberazioneRecente) che solo
// la home carica e passa direttamente a scegliSegnale; qui non vengono letti
// (Task 16: leggiLiberazioneRecente non è nel Promise.all di
// fetchIngressiStriscia, stesso motivo di leggiTecniciSenzaAnagrafica sopra).
// I chiamanti che li vogliono (dashboard/page.tsx) compongono da sé.
export async function getSegnaleStriscia(svc: SupabaseClient, labId: string, ruolo: string, pile: PileHome): Promise<SegnaleStriscia> {
  const ingressi = await fetchIngressiStriscia(svc, labId, ruolo)
  return scegliSegnale(ruolo, { ...ingressi, pile: pile.striscia })
}

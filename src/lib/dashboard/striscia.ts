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
const s2: Candidato = (i) => {
  const r = i.pile.ritardoPiuGrave
  if (r) return { attenzione: true, forte: `n.${r.numero}`, testo: r.giorni === 1 ? 'doveva uscire ieri' : `doveva uscire ${r.giorni} giorni fa`, azione: { etichetta: 'Apri ›', href: '/lavori?pila=rossa' } }
  const c = i.pile.consegnaOggiNonPronta
  if (c) return { attenzione: true, forte: `n.${c.numero}`, testo: c.ora ? `non è ancora pronto per le ${c.ora}` : 'non è ancora pronto per oggi', azione: { etichetta: 'Apri ›', href: '/lavori?pila=ambra' } }
  return null
}
const s3: Candidato = (i) => i.pile.provaRientroOggi ? { attenzione: true, forte: `n.${i.pile.provaRientroOggi}`, testo: 'torna oggi dalla prova', azione: { etichetta: 'Apri ›', href: '/lavori?pila=viola' } } : null
const s4: Candidato = (i) => i.pile.arrivoVecchio ? { attenzione: true, forte: `n.${i.pile.arrivoVecchio}`, testo: 'aspetta conferma da ieri', azione: { etichetta: 'Conferma ›', href: '/lavori?pila=blu' } } : null
const s5: Candidato = (i) => i.materialeRosso ? { attenzione: true, forte: i.materialeRosso, testo: 'sta per finire', azione: { etichetta: 'Riordina ›', href: '/magazzino' } } : null
const s6: Candidato = (i) => i.pile.fermo && i.pile.fermo.giorni >= 5 ? { attenzione: true, forte: `n.${i.pile.fermo.numero}`, testo: `è fermo da ${i.pile.fermo.giorni} giorni`, azione: { etichetta: 'Apri ›', href: `/lavori/${i.pile.fermo.id}` } } : null
const s7: Candidato = (i) => i.pagamentoScaduto ? { attenzione: true, forte: i.pagamentoScaduto, testo: 'ha un pagamento scaduto', azione: { etichetta: 'Guarda ›', href: '/scadenzario' } } : null
const s8: Candidato = (i) => i.ddcOggi > 0 ? { attenzione: false, forte: null, testo: `Oggi ho preparato ${i.ddcOggi} DdC ✓`, azione: null } : null
const s9: Candidato = (i) => ({ attenzione: false, forte: 'Tutto a posto:', testo: i.pile.consegneOggiTotali > 0 ? `${i.pile.consegneOggiTotali} consegne oggi${i.pile.prossimaOra ? `, la prossima alle ${i.pile.prossimaOra}` : ''}` : 'nessuna consegna oggi', azione: null })

// O1f (Task 11) — dead-end silenzioso: un tecnico con account ma senza riga
// `tecnici` vedeva pile vuote + s9 sereno, senza sapere perché. `sTecAccount`
// vince su TUTTO (primo in gerarchia tecnico) perché in quel caso le pile
// sono comunque vuote per costruzione (v. `getPileHome`/`senzaAnagrafica`) —
// non c'è nulla di più urgente da segnalare al tecnico stesso.
const sTecAccount: Candidato = (i) => i.senzaAnagrafica
  ? { attenzione: true, forte: 'Il tuo account', testo: 'non è ancora configurato — avvisa il titolare', azione: null }
  : null
// `sTitTecnici` avvisa titolare/admin_rete che uno o più utenti ruolo
// tecnico non hanno ancora la riga `tecnici` collegata (stesso bug di
// perimetro dal lato titolare) — sotto ai segnali operativi s1-s7 (che
// restano più urgenti), sopra al sereno s8/s9.
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

// P7 — gerarchie per ruolo (spec §6 tabella Ruoli + §3.2 front_desk «parte dagli operativi»)
const GERARCHIE: Record<string, Candidato[]> = {
  titolare: [s1, s2, s3, s4, s5, s6, s7, sTitTecnici, sTrial, s8, s9],
  admin_rete: [s1, s2, s3, s4, s5, s6, s7, sTitTecnici, sTrial, s8, s9],
  front_desk: [s2, s3, s4, s1, s5, s6, s8, s9], // invariato — O1f non tocca front_desk
  tecnico: [sTecAccount, s2, s3, s4, s6, s8, s9],
}

export function scegliSegnale(ruolo: string, i: IngressiStriscia): SegnaleStriscia {
  for (const candidato of GERARCHIE[ruolo] ?? GERARCHIE.tecnico) {
    const s = candidato(i)
    if (s) return s
  }
  return s9(i) as SegnaleStriscia
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

// NB: getSegnaleStriscia NON può emettere sTecAccount/sTitTecnici — quei due
// candidati dipendono da ingressi (senzaAnagrafica/tecniciSenzaAnagrafica) che
// solo la home carica e passa direttamente a scegliSegnale; qui non vengono
// letti. I chiamanti che li vogliono (dashboard/page.tsx) compongono da sé.
export async function getSegnaleStriscia(svc: SupabaseClient, labId: string, ruolo: string, pile: PileHome): Promise<SegnaleStriscia> {
  const ingressi = await fetchIngressiStriscia(svc, labId, ruolo)
  return scegliSegnale(ruolo, { ...ingressi, pile: pile.striscia })
}

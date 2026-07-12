import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMaterialiEsaurimento } from '@/lib/dashboard/queries'
import { SDI_SCARTATE } from '@/lib/dashboard/striscia'

// ☰ «Tutto il resto» (§6.1/§6.2, Task 10) — le 9 voci CHIUSE della mappa, nello
// stesso ordine del mockup `tutto-il-resto.html`: Dentisti · Fatture ·
// Magazzino · Agenda · Documenti e qualità · Persone · Listino · [La mia
// rete, SOLO admin_rete] · Il mio laboratorio. NIENTE «I conti» / «Il mio
// compenso» (§11 le rimanda al sotto-progetto 4). Nessuna voce fuori mappa.
//
// Emoji come icone di sezione (licenza §4.4): questa pagina è l'UNICO
// contesto app in cui l'emoji è lecita. Nei `sub` (testo) si usa SOLO il
// dingbat «✓» (U+2713), mai un verdetto di conformità non verificato (L5) —
// «Il mio laboratorio» devia deliberatamente dal mockup (che porta un ✓ non
// giustificato): qui resta descrittivo, senza spunta.
export type Sezione = { chiave: string; emoji: string; nome: string; sub: string; href: string }

export type DatiTuttoIlResto = {
  dentisti: string[] // primi 4 display distinti (già limitati a monte)
  fattureDaSistemare: number
  materialiRossi: number
  consegneOggi: number
  prossimaOra: string | null
  persone: string[] // il primo elemento diventa sempre «Tu» (componiSezioni)
}

/** Elenco in parole del banco: "a", "a e b", "a, b e c" — mai un elenco puntato. */
function elenco(nomi: string[]): string {
  if (nomi.length === 0) return ''
  if (nomi.length === 1) return nomi[0]
  return `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`
}

function subFatture(n: number): string {
  if (n <= 0) return 'Tutto a posto questo mese ✓'
  return `${n} fattur${n === 1 ? 'a' : 'e'} da sistemare`
}

function subMagazzino(n: number): string {
  if (n <= 0) return 'Tutto rifornito ✓'
  return `${n} material${n === 1 ? 'e' : 'i'} da riordinare`
}

function subAgenda(n: number, prossimaOra: string | null): string {
  if (n <= 0) return 'Oggi niente in agenda'
  return `Oggi ${n} consegne · la prossima alle ${prossimaOra}`
}

function subDentisti(nomi: string[]): string {
  return nomi.length > 0 ? elenco(nomi) : 'Nessun dentista in anagrafica ancora'
}

function subPersone(nomi: string[]): string {
  const conTu = nomi.length > 0 ? ['Tu', ...nomi.slice(1)] : ['Tu']
  return elenco(conTu)
}

/**
 * componiSezioni(ruolo, dati) — puro, nessuna I/O. Le 9 voci di §6.1
 * nell'ordine del mockup; `La mia rete` (`/rete`) SOLO per `admin_rete`,
 * penultima voce (subito prima di «Il mio laboratorio»).
 */
export function componiSezioni(ruolo: string, dati: DatiTuttoIlResto): Sezione[] {
  const sezioni: Sezione[] = [
    { chiave: 'dentisti', emoji: '🦷', nome: 'Dentisti', sub: subDentisti(dati.dentisti), href: '/clienti' },
    { chiave: 'fatture', emoji: '🧾', nome: 'Fatture', sub: subFatture(dati.fattureDaSistemare), href: '/fatture' },
    { chiave: 'magazzino', emoji: '📦', nome: 'Magazzino', sub: subMagazzino(dati.materialiRossi), href: '/magazzino' },
    { chiave: 'agenda', emoji: '📅', nome: 'Agenda', sub: subAgenda(dati.consegneOggi, dati.prossimaOra), href: '/agenda' },
    { chiave: 'qualita', emoji: '🛡️', nome: 'Documenti e qualità', sub: 'DdC generata a ogni consegna ✓', href: '/qualita' },
    { chiave: 'persone', emoji: '👥', nome: 'Persone', sub: subPersone(dati.persone), href: '/tecnici' },
    { chiave: 'listino', emoji: '🏷️', nome: 'Listino', sub: 'I tuoi prezzi per ogni lavorazione', href: '/listino' },
  ]
  if (ruolo === 'admin_rete') {
    sezioni.push({ chiave: 'rete', emoji: '🌐', nome: 'La mia rete', sub: 'I laboratori della tua rete', href: '/rete' })
  }
  // Sub SENZA ✓ (deviazione dichiarata dal mockup, L5): «profilo/PEC/abbonamento»
  // sono fatti anagrafici, non un verdetto di conformità che il software non può dare.
  sezioni.push({ chiave: 'laboratorio', emoji: '⚙️', nome: 'Il mio laboratorio', sub: 'Profilo, PEC, abbonamento', href: '/impostazioni' })
  return sezioni
}

// ─── Raccolta dati (query leggere, errori → default sereni) ─────────────────

function clienteDisplay(c: { nome: string; cognome: string; studio_nome: string | null } | null): string | null {
  if (!c) return null
  return c.studio_nome ?? `${c.nome} ${c.cognome}`
}

async function getDentisti(svc: SupabaseClient, labId: string): Promise<string[]> {
  try {
    const { data, error } = await svc
      .from('lavori')
      .select('clienti(nome, cognome, studio_nome)')
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    const righe = (data ?? []) as unknown as Array<{ clienti: { nome: string; cognome: string; studio_nome: string | null } | null }>
    const nomi: string[] = []
    for (const r of righe) {
      const display = clienteDisplay(r.clienti)
      if (display && !nomi.includes(display)) nomi.push(display)
      if (nomi.length >= 4) break
    }
    return nomi
  } catch (err) {
    console.error('[getSezioniTuttoIlResto] lettura dentisti fallita — degrado a []:', err)
    return []
  }
}

async function getFattureDaSistemare(svc: SupabaseClient, labId: string): Promise<number> {
  try {
    const { count, error } = await svc
      .from('fatture')
      .select('id', { count: 'exact', head: true })
      .eq('laboratorio_id', labId)
      .in('stato_sdi', SDI_SCARTATE)
    if (error) throw error
    return count ?? 0
  } catch (err) {
    console.error('[getSezioniTuttoIlResto] lettura fattureDaSistemare fallita — degrado a 0:', err)
    return 0
  }
}

async function getMaterialiRossi(svc: SupabaseClient, labId: string): Promise<number> {
  try {
    const materiali = await getMaterialiEsaurimento(svc, labId, 5)
    return materiali.length
  } catch (err) {
    console.error('[getSezioniTuttoIlResto] lettura materialiRossi fallita — degrado a 0:', err)
    return 0
  }
}

async function getAgendaOggi(svc: SupabaseClient, labId: string): Promise<{ consegneOggi: number; prossimaOra: string | null }> {
  try {
    const oggi = new Date().toISOString().split('T')[0]
    const { data, error } = await svc
      .from('lavori')
      .select('ora_consegna')
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .eq('data_consegna_prevista', oggi)
      .not('stato', 'in', '("consegnato","annullato")')
      .order('ora_consegna', { ascending: true, nullsFirst: false })
    if (error) throw error
    const righe = (data ?? []) as Array<{ ora_consegna: string | null }>
    const prossima = righe.find((r) => r.ora_consegna)?.ora_consegna ?? null
    return { consegneOggi: righe.length, prossimaOra: prossima }
  } catch (err) {
    console.error('[getSezioniTuttoIlResto] lettura agendaOggi fallita — degrado a 0:', err)
    return { consegneOggi: 0, prossimaOra: null }
  }
}

async function getPersone(svc: SupabaseClient, labId: string): Promise<string[]> {
  try {
    const { data, error } = await svc
      .from('utenti')
      .select('nome')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(3)
    if (error) throw error
    return ((data ?? []) as Array<{ nome: string }>).map((r) => r.nome)
  } catch (err) {
    console.error('[getSezioniTuttoIlResto] lettura persone fallita — degrado a []:', err)
    return []
  }
}

/**
 * getSezioniTuttoIlResto(svc, labId, ruolo) — raccoglie i dati con query
 * leggere (in parallelo) e delega la composizione a `componiSezioni`. Ogni
 * query degrada singolarmente a un default sereno con `console.error`: la
 * pagina non crasha mai (L5), al massimo mostra un sub più povero.
 */
export async function getSezioniTuttoIlResto(svc: SupabaseClient, labId: string, ruolo: string): Promise<Sezione[]> {
  const [dentisti, fattureDaSistemare, materialiRossi, agenda, persone] = await Promise.all([
    getDentisti(svc, labId),
    getFattureDaSistemare(svc, labId),
    getMaterialiRossi(svc, labId),
    getAgendaOggi(svc, labId),
    getPersone(svc, labId),
  ])

  return componiSezioni(ruolo, {
    dentisti,
    fattureDaSistemare,
    materialiRossi,
    consegneOggi: agenda.consegneOggi,
    prossimaOra: agenda.prossimaOra,
    persone,
  })
}

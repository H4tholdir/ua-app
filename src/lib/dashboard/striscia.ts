import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMaterialiEsaurimento, getPagamentiScadutiTop } from '@/lib/dashboard/queries'
import type { DatiPileStriscia, PileHome } from './pile-home'

export type SegnaleStriscia = {
  attenzione: boolean
  forte: string | null // parte in grassetto --ink
  testo: string // resto della riga (1 riga, ellissi CSS)
  azione: { etichetta: string; href: string } | null // CTA mai troncata
}
export type IngressiStriscia = {
  fatturaScartata: { id: string; numero: string } | null
  materialeRosso: string | null
  pagamentoScaduto: string | null
  ddcOggi: number
  pile: DatiPileStriscia
}

// Valori runtime confermati allo Step 1 (grep su src/app/api/fatture, src/types/domain.ts,
// migration 002_fase2_schema.sql): lo stato SDI granulare NON conosce 'scartata' né
// 'mancata_consegna' (erano valori del CHECK originario in supabase/schema.sql, sostituito
// dalla migration 002 con lo StatoSDI attuale). L'unico stato realmente scritto/letto dal
// codice che rappresenta un rifiuto SDI è 'rifiutata'.
const SDI_SCARTATE = ['rifiutata']

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

// P7 — gerarchie per ruolo (spec §6 tabella Ruoli + §3.2 front_desk «parte dagli operativi»)
const GERARCHIE: Record<string, Candidato[]> = {
  titolare: [s1, s2, s3, s4, s5, s6, s7, s8, s9],
  admin_rete: [s1, s2, s3, s4, s5, s6, s7, s8, s9],
  front_desk: [s2, s3, s4, s1, s5, s6, s8, s9],
  tecnico: [s2, s3, s4, s6, s8, s9],
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

export async function getSegnaleStriscia(svc: SupabaseClient, labId: string, ruolo: string, pile: PileHome): Promise<SegnaleStriscia> {
  let fatturaScartata: IngressiStriscia['fatturaScartata'] = null
  let materialeRosso: string | null = null
  let pagamentoScaduto: string | null = null
  let ddcOggi = 0

  if (usaFiscali(ruolo)) {
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
      fatturaScartata = riga ? { id: riga.id, numero: riga.numero } : null
    } catch (err) {
      console.error('[getSegnaleStriscia] lettura fatturaScartata fallita — degrado a null:', err)
      fatturaScartata = null
    }

    try {
      const materiali = await getMaterialiEsaurimento(svc, labId, 1)
      materialeRosso = materiali[0]?.nome ?? null
    } catch (err) {
      console.error('[getSegnaleStriscia] lettura materialeRosso fallita — degrado a null:', err)
      materialeRosso = null
    }
  }

  if (usaPagamenti(ruolo)) {
    try {
      const pagamenti = await getPagamentiScadutiTop(svc, labId, 1)
      pagamentoScaduto = pagamenti[0]?.cliente_display ?? null
    } catch (err) {
      console.error('[getSegnaleStriscia] lettura pagamentoScaduto fallita — degrado a null:', err)
      pagamentoScaduto = null
    }
  }

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
    ddcOggi = count ?? 0
  } catch (err) {
    console.error('[getSegnaleStriscia] lettura ddcOggi fallita — degrado a 0:', err)
    ddcOggi = 0
  }

  return scegliSegnale(ruolo, { fatturaScartata, materialeRosso, pagamentoScaduto, ddcOggi, pile: pile.striscia })
}

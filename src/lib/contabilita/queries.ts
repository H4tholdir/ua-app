import type { SupabaseClient } from '@supabase/supabase-js'
import { calcolaResiduo, calcolaCreditoDisponibile } from './saldo'
import { calcolaCreditoCliente, type CreditoClienteResult } from './credito-cliente'
import { prezzoEffettivoLavoro, divergenzaPrezzo, SELECT_FRAGMENT_PREZZO } from '@/lib/domain/prezzo-lavoro'

export interface CreditoScadutoPerCliente {
  cliente_id: string
  cliente_display: string
  cliente_telefono: string | null
  residuo_totale: number
  giorni_scaduto: number
  lavori_count: number
}

interface ClienteSnap {
  id: string
  nome: string
  cognome: string
  studio_nome: string | null
  telefono: string | null
}

function clienteDisplay(c: ClienteSnap): string {
  return c.studio_nome ?? `${c.nome} ${c.cognome}`
}

function accumula(
  map: Map<string, CreditoScadutoPerCliente>,
  cliente: ClienteSnap,
  residuo: number,
  dataRiferimento: string
): void {
  const giorni = Math.floor((Date.now() - new Date(dataRiferimento).getTime()) / 86_400_000)
  const existing = map.get(cliente.id)
  map.set(cliente.id, {
    cliente_id: cliente.id,
    cliente_display: clienteDisplay(cliente),
    cliente_telefono: cliente.telefono,
    residuo_totale: Math.round(((existing?.residuo_totale ?? 0) + residuo) * 100) / 100,
    giorni_scaduto: Math.max(existing?.giorni_scaduto ?? 0, giorni),
    lavori_count: (existing?.lavori_count ?? 0) + 1,
  })
}

/**
 * Unifica fatture non pagate + lavori diretti (fatturare/non_fatturare, non
 * ancora inclusi in fattura) scaduti da oltre `giorniSoglia` giorni, per
 * cliente. Sostituisce la lettura di `lavori_partitario` (0 righe, mai
 * scritta) in Dashboard Titolare, admin/labs/[id]/live e widget Front Desk —
 * garantendo lo stesso numero su tutte e tre le superfici (regressione B2).
 */
export async function getCreditoScadutoPerCliente(
  svc: SupabaseClient,
  labId: string,
  giorniSoglia = 30
): Promise<CreditoScadutoPerCliente[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - giorniSoglia)
  const cutoffISO = cutoff.toISOString().split('T')[0]

  const map = new Map<string, CreditoScadutoPerCliente>()

  const { data: fattureData } = await svc
    .from('fatture')
    .select('id, totale, importo_pagato, data, clienti!inner(id, nome, cognome, studio_nome, telefono)')
    .eq('laboratorio_id', labId)
    .eq('pagata', false)
    .neq('stato_sdi', 'draft')
    .is('deleted_at', null)
    // Task 5 (audit letture storno TD04): una TD01 stornata non è più un
    // dovuto scaduto (il credito compensativo vive in
    // credito_clienti_movimenti, Task 4); il TD04 stesso non è mai un
    // "pagamento scaduto" (lavoro_id NULL — non rappresenta un incasso atteso).
    .is('stornata_at', null)
    .neq('tipo_documento', 'TD04')
    .lt('data', cutoffISO)

  for (const f of (fattureData ?? []) as unknown as Array<{
    id: string; totale: number; importo_pagato: number; data: string; clienti: ClienteSnap
  }>) {
    const residuo = Math.round((Number(f.totale) - Number(f.importo_pagato ?? 0)) * 100) / 100
    if (residuo <= 0) continue
    accumula(map, f.clienti, residuo, f.data)
  }

  const { data: lavoriData } = await svc
    .from('lavori')
    .select(`
      id, ${SELECT_FRAGMENT_PREZZO}, data_consegna_prevista,
      clienti:clienti!inner(id, nome, cognome, studio_nome, telefono),
      pagamenti(importo, stato),
      credito_clienti_movimenti(importo, tipo)
    `)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .not('stato', 'in', '("annullato")')
    .eq('incluso_in_fattura', false)
    .in('decisione_fatturazione', ['non_fatturare', 'fatturare'])
    .lt('data_consegna_prevista', cutoffISO)

  for (const l of (lavoriData ?? []) as unknown as Array<{
    id: string; prezzo_unitario: number | null; data_consegna_prevista: string
    lavorazioni: Array<{ importo: number | null }> | null
    clienti: ClienteSnap
    pagamenti: Array<{ importo: number; stato: string }>
    credito_clienti_movimenti: Array<{ importo: number; tipo: string }>
  }>) {
    const totaleLav = prezzoEffettivoLavoro(l)
    if (totaleLav <= 0) continue
    const pagamentiAttivi = (l.pagamenti ?? []).filter((p) => p.stato === 'attivo')
    const applicazioni = (l.credito_clienti_movimenti ?? []).filter((m) => m.tipo === 'applicazione')
    const residuo = calcolaResiduo(totaleLav, pagamentiAttivi, applicazioni)
    if (residuo <= 0) continue
    accumula(map, l.clienti, residuo, l.data_consegna_prevista)
  }

  return [...map.values()].sort((a, b) => b.residuo_totale - a.residuo_totale)
}

/**
 * Restituisce i movimenti di credito di un cliente al netto delle eccedenze
 * "fantasma" — quelle il cui pagamento sorgente è stato annullato/sostituito
 * (Task 8 non tocca mai credito_clienti_movimenti: la correzione vive qui,
 * lato lettura, unica fonte usata da Task 10 e Task 15 per calcolaCreditoDisponibile).
 * Il filtro gatea SOLO 'eccedenza': 'storno' (credito da nota di credito
 * TD04, Task 4) non ha pagamento sorgente e passa sempre, come
 * applicazione/rimborso.
 */
export async function fetchMovimentiCreditoValidi(
  svc: SupabaseClient,
  labId: string,
  clienteId: string
): Promise<Array<{ tipo: 'eccedenza' | 'storno' | 'applicazione' | 'rimborso'; importo: number }>> {
  const { data: movimentiRaw, error: movimentiErr } = await svc
    .from('credito_clienti_movimenti')
    .select('tipo, importo, pagamento_id, pagamenti(stato)')
    .eq('cliente_id', clienteId)
    .eq('laboratorio_id', labId)
  // Fail-closed (follow-up Ondata 3): un errore di lettura NON deve degradare
  // in credito 0 silenzioso — il chiamante risponde 500, mai un saldo parziale.
  if (movimentiErr) throw new Error(`[contabilita cliente] lettura movimenti: ${movimentiErr.message}`)

  return ((movimentiRaw ?? []) as unknown as Array<{
    tipo: 'eccedenza' | 'storno' | 'applicazione' | 'rimborso'; importo: number
    pagamento_id: string | null; pagamenti: { stato: string } | null
  }>)
    .filter((m) => m.tipo !== 'eccedenza' || m.pagamenti?.stato === 'attivo')
    .map((m) => ({ tipo: m.tipo, importo: m.importo }))
}

export interface DovutoEstratto {
  id: string
  origine: 'fattura' | 'lavoro_diretto'
  numero: string
  data: string
  totale: number
  residuo: number
  pagata: boolean
  giorni_ritardo: number
  stato_sdi: string | null
}

export interface LavoroInAttesa {
  id: string
  numero_lavoro: string
  prezzo_unitario: number
  data_consegna_prevista: string
  proposta_dentista: 'fatturare' | 'non_fatturare' | null
  proposta_at: string | null
  // Task 7b (N4): true quando le righe di lavorazione divergono dal
  // prezzo_unitario memorizzato (≥1 cent) — calcolato server-side qui perché
  // il componente riceve solo il totale effettivo già collassato.
  divergente: boolean
}

export interface ContabilitaCliente {
  dovuti: DovutoEstratto[]
  lavoriInAttesa: LavoroInAttesa[]
  creditoCliente: CreditoClienteResult
}

/**
 * Vista "Contabilità cliente" completa (spec B2 §UI): lista unificata dei
 * dovuti (fatture + lavori diretti, taggati per origine), lavori in attesa
 * di decisione, e i 4 numeri di credito cliente (mai fusi — spec B2 §5).
 */
export async function getContabilitaCliente(
  svc: SupabaseClient,
  labId: string,
  clienteId: string
): Promise<ContabilitaCliente> {
  const now = Date.now()

  // NOTA (finding review finale whole-branch, dopo Task 16): manca il filtro
  // `stato_sdi != 'draft'` — senza, una fattura bozza (mai inviata) con un
  // saldo comparirebbe qui come dovuto confermato, mentre Dashboard/Scadenzario
  // (Task 9/11) la escludono sempre. Allineato agli altri due path.
  const { data: fattureRaw, error: fattureErr } = await svc
    .from('fatture')
    .select('id, numero, data, totale, importo_pagato, stato_sdi, pagata')
    .eq('cliente_id', clienteId)
    .eq('laboratorio_id', labId)
    .neq('stato_sdi', 'draft')
    .is('deleted_at', null)
    // Task 5 (audit letture storno TD04): stesso invariante di
    // getCreditoScadutoPerCliente sopra — TD01 stornata e TD04 esclusi dai
    // dovuti, altrimenti lo stesso importo comparirebbe due volte.
    .is('stornata_at', null)
    .neq('tipo_documento', 'TD04')
    .order('data', { ascending: false })
  // Fail-closed (follow-up Ondata 3): mai lista vuota silenziosa su errore —
  // il saldo mostrato (scadenzario lab E portale dentista) sarebbe più basso
  // del reale senza alcun segnale.
  if (fattureErr) throw new Error(`[contabilita cliente] lettura fatture: ${fattureErr.message}`)

  const fattureDovuti: DovutoEstratto[] = ((fattureRaw ?? []) as Array<{
    id: string; numero: string; data: string; totale: number; importo_pagato: number
    stato_sdi: string; pagata: boolean
  }>).map((f) => {
    const residuo = Math.max(0, Math.round((Number(f.totale) - Number(f.importo_pagato ?? 0)) * 100) / 100)
    return {
      id: f.id,
      origine: 'fattura' as const,
      numero: f.numero,
      data: f.data,
      totale: f.totale ?? 0,
      residuo: f.pagata ? 0 : residuo,
      pagata: f.pagata ?? false,
      giorni_ritardo: Math.floor((now - new Date(f.data).getTime()) / 86_400_000),
      stato_sdi: f.stato_sdi ?? 'draft',
    }
  })

  const { data: lavoriRaw, error: lavoriErr } = await svc
    .from('lavori')
    .select(`
      id, numero_lavoro, ${SELECT_FRAGMENT_PREZZO}, data_consegna_prevista, decisione_fatturazione, incluso_in_fattura,
      proposta_dentista, proposta_at,
      pagamenti(importo, stato),
      credito_clienti_movimenti(importo, tipo)
    `)
    .eq('cliente_id', clienteId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .not('stato', 'in', '("annullato")')
  if (lavoriErr) throw new Error(`[contabilita cliente] lettura lavori: ${lavoriErr.message}`)

  const lavoriConfermati: DovutoEstratto[] = []
  const lavoriInAttesa: LavoroInAttesa[] = []
  // Bucket separati per decisione_fatturazione (finding review finale: prima
  // venivano mischiati tutti in lavoriFatturareNonInclusi — la somma finale
  // era comunque corretta perché calcolaCreditoCliente li somma entrambi in
  // "confermato", ma l'etichettatura era fuorviante per chi legge il codice).
  const residuiNonFatturare: Array<{ residuo: number }> = []
  const residuiFatturareNonInclusi: Array<{ residuo: number }> = []

  for (const l of (lavoriRaw ?? []) as unknown as Array<{
    id: string; numero_lavoro: string; prezzo_unitario: number | null; data_consegna_prevista: string
    lavorazioni: Array<{ importo: number | null }> | null
    decisione_fatturazione: string; incluso_in_fattura: boolean
    proposta_dentista: string | null; proposta_at: string | null
    pagamenti: Array<{ importo: number; stato: string }>
    credito_clienti_movimenti: Array<{ importo: number; tipo: string }>
  }>) {
    const totaleLav = prezzoEffettivoLavoro(l)
    // Il `.gt('prezzo_unitario', 0)` DB-side escludeva ogni lavoro a totale 0
    // PRIMA del branch in_attesa — replichiamo qui lo stesso ordine per non
    // alterare il comportamento preesistente su in_attesa a totale 0, mentre
    // includiamo i lavori con prezzo nelle righe e prezzo_unitario 0/null
    // (fix di completezza).
    if (totaleLav <= 0) continue

    if (l.decisione_fatturazione === 'in_attesa') {
      lavoriInAttesa.push({
        id: l.id,
        numero_lavoro: l.numero_lavoro,
        prezzo_unitario: totaleLav,
        data_consegna_prevista: l.data_consegna_prevista,
        proposta_dentista: (l.proposta_dentista as 'fatturare' | 'non_fatturare' | null) ?? null,
        proposta_at: l.proposta_at ?? null,
        divergente: divergenzaPrezzo(l).divergente,
      })
      continue
    }

    // Già confluito nel bucket fatture sopra il giorno in cui è stato incluso — mai due volte.
    if (l.incluso_in_fattura) continue

    const pagamentiAttivi = (l.pagamenti ?? []).filter((p) => p.stato === 'attivo')
    const applicazioni = (l.credito_clienti_movimenti ?? []).filter((m) => m.tipo === 'applicazione')
    // INVARIANTE N6 (decisione C, spec 2026-07-14): il dovuto pre-fattura è
    // calcolato sull'imponibile SENZA bollo. Il bollo di €2 (imponibile >
    // 77,47€) è imposta documentale che nasce con l'emissione e vive solo in
    // fatture.totale — la differenza di €2 tra "lavoro dovuto" e "fattura" è
    // INTENZIONALE, non un drift. NON piegare mai il bollo dentro
    // prezzoEffettivoLavoro: alimenta l'imponibile XML, che deve restare
    // bollo-free. Guardia: tests/unit/contabilita-bollo-n6.test.ts.
    const residuo = calcolaResiduo(totaleLav, pagamentiAttivi, applicazioni)

    if (residuo <= 0) continue // saldato — non è più un dovuto

    lavoriConfermati.push({
      id: l.id,
      origine: 'lavoro_diretto',
      numero: l.numero_lavoro,
      data: l.data_consegna_prevista,
      totale: totaleLav,
      residuo,
      pagata: false,
      giorni_ritardo: Math.floor((now - new Date(l.data_consegna_prevista).getTime()) / 86_400_000),
      stato_sdi: null,
    })

    if (l.decisione_fatturazione === 'non_fatturare') {
      residuiNonFatturare.push({ residuo })
    } else {
      residuiFatturareNonInclusi.push({ residuo })
    }
  }

  const nonSaldati = [...fattureDovuti.filter((f) => !f.pagata), ...lavoriConfermati]
    .sort((a, b) => b.giorni_ritardo - a.giorni_ritardo)
  const saldati = fattureDovuti
    .filter((f) => f.pagata)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  // fetchMovimentiCreditoValidi (Task 9) applica già il filtro anti-credito-
  // fantasma: un'eccedenza il cui pagamento sorgente è stato annullato/
  // sostituito non conta più.
  const movimentiValidi = await fetchMovimentiCreditoValidi(svc, labId, clienteId)
  const creditoDisponibile = calcolaCreditoDisponibile(movimentiValidi)

  const creditoCliente = calcolaCreditoCliente({
    fattureNonSaldate: fattureDovuti.filter((f) => !f.pagata).map((f) => ({ residuo: f.residuo })),
    lavoriNonFatturareNonSaldati: residuiNonFatturare,
    lavoriFatturareNonInclusi: residuiFatturareNonInclusi,
    lavoriInAttesa: lavoriInAttesa.map((l) => ({ residuo: l.prezzo_unitario })),
    creditoDisponibile,
  })

  return { dovuti: [...nonSaldati, ...saldati], lavoriInAttesa, creditoCliente }
}

export interface PagamentoClientePortale {
  data: string
  importo: number
  metodo: string
  destinazione: { tipo: 'fattura' | 'lavoro'; numero: string }
}

/**
 * Pagamenti attivi di un cliente, unificati dalle due vie possibili
 * (pagamenti non ha cliente_id: la risoluzione passa per fattura_id o
 * lavoro_id). Nato per il portale dentista (Ondata 3, spec §4): seleziona
 * SOLO i campi esposti — metodo_nota (nota interna lab) non viene nemmeno
 * letto. Fail-closed: errore di query → throw, mai lista parziale.
 */
export async function getPagamentiCliente(
  svc: SupabaseClient,
  labId: string,
  clienteId: string
): Promise<PagamentoClientePortale[]> {
  const [viaFatture, viaLavori] = await Promise.all([
    svc
      .from('pagamenti')
      .select('data_pagamento, importo, metodo, fatture!inner(numero)')
      .eq('laboratorio_id', labId)
      .eq('stato', 'attivo')
      .eq('fatture.cliente_id', clienteId)
      .eq('fatture.laboratorio_id', labId)
      .is('fatture.deleted_at', null)
      // Task 5 (audit letture storno TD04, Gruppo E): un pagamento storico su
      // una fattura poi stornata resta un movimento reale già incassato — non
      // lo nascondiamo, ma non deve più risultare "su una fattura attiva".
      // Qui filtriamo comunque le stornate per coerenza con Gruppo A/C: il
      // credito compensativo del cliente vive in credito_clienti_movimenti
      // (tipo 'storno'), non in questo elenco pagamenti.
      .is('fatture.stornata_at', null),
    svc
      .from('pagamenti')
      .select('data_pagamento, importo, metodo, lavori!inner(numero_lavoro)')
      .eq('laboratorio_id', labId)
      .eq('stato', 'attivo')
      .eq('lavori.cliente_id', clienteId)
      .eq('lavori.laboratorio_id', labId)
      .is('lavori.deleted_at', null),
  ])

  if (viaFatture.error) throw new Error(`[pagamenti cliente] via fatture: ${viaFatture.error.message}`)
  if (viaLavori.error) throw new Error(`[pagamenti cliente] via lavori: ${viaLavori.error.message}`)

  const suFatture = ((viaFatture.data ?? []) as unknown as Array<{
    data_pagamento: string; importo: number; metodo: string; fatture: { numero: string }
  }>).map((p) => ({
    data: p.data_pagamento,
    importo: Number(p.importo),
    metodo: p.metodo,
    destinazione: { tipo: 'fattura' as const, numero: p.fatture.numero },
  }))

  const suLavori = ((viaLavori.data ?? []) as unknown as Array<{
    data_pagamento: string; importo: number; metodo: string; lavori: { numero_lavoro: string }
  }>).map((p) => ({
    data: p.data_pagamento,
    importo: Number(p.importo),
    metodo: p.metodo,
    destinazione: { tipo: 'lavoro' as const, numero: p.lavori.numero_lavoro },
  }))

  return [...suFatture, ...suLavori].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  )
}

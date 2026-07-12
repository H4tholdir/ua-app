// src/lib/dashboard/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DashboardStatsExtended,
  TecnicoDashboard,
  TecnicoDashboardItem,
  FrontDeskDashboard,
  FrontDeskConsegnaItem,
  StatoLavoro,
  PrioritaLavoro,
  TipoDispositivo,
} from '@/types/domain'
export { isCacheStale } from './cache-stale'

// ─── Helpers ─────────────────────────────────────────────────

function clienteDisplay(c: {
  nome: string
  cognome: string
  studio_nome: string | null
} | null): string {
  if (!c) return '—'
  return c.studio_nome ?? `${c.nome} ${c.cognome}`
}

function oggiISO(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Raw types ───────────────────────────────────────────────

export type RawKpiCacheRow = {
  laboratorio_id: string
  consegne_oggi: number
  lavori_in_ritardo: number
  pronti_non_fatturati: number
  mdr_incompleti: number
  spedizioni_in_ritardo: number
  is_rifacimento_count: number
  stl_non_assegnati: number
  lavori_attivi: number
  fatturato_mese: string | number
  fatturato_mese_precedente?: string | number
  pagamenti_scaduti_totale?: string | number
  pagamenti_scaduti_clienti_count?: number
  materiali_esaurimento_count?: number
  in_prova_count?: number
  tecnico_saturo_id: string | null
  tecnico_saturo_count: number
  aggiornato_at: string
} | null

type RawLavoroRow = {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  priorita: PrioritaLavoro
  tipo_dispositivo: TipoDispositivo
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  clienti: { nome: string; cognome: string; studio_nome: string | null } | null
}

type RawFrontDeskRow = RawLavoroRow & {
  clienti: {
    nome: string
    cognome: string
    studio_nome: string | null
    telefono: string | null
  } | null
}

// ─── Mapper puri ─────────────────────────────────────────────

export function mapTitolareKpiRow(row: RawKpiCacheRow): DashboardStatsExtended {
  const defaults: DashboardStatsExtended = {
    consegne_oggi: 0,
    lavori_in_ritardo: 0,
    pronti_non_fatturati: 0,
    tecnico_piu_saturo: null,
    mdr_incompleti: 0,
    spedizioni_in_ritardo: 0,
    is_rifacimento_count: 0,
    stl_non_assegnati: 0,
    lavori_attivi: 0,
    fatturato_mese: 0,
    fatturato_mese_precedente: 0,
    pagamenti_scaduti_totale: 0,
    pagamenti_scaduti_clienti_count: 0,
    materiali_esaurimento_count: 0,
    in_prova_count: 0,
    margine_netto: 0,
    percentuale_margine: 0,
  }
  if (!row) return defaults
  return {
    ...defaults,
    consegne_oggi: row.consegne_oggi ?? 0,
    lavori_in_ritardo: row.lavori_in_ritardo ?? 0,
    pronti_non_fatturati: row.pronti_non_fatturati ?? 0,
    mdr_incompleti: row.mdr_incompleti ?? 0,
    spedizioni_in_ritardo: row.spedizioni_in_ritardo ?? 0,
    is_rifacimento_count: row.is_rifacimento_count ?? 0,
    stl_non_assegnati: row.stl_non_assegnati ?? 0,
    lavori_attivi: row.lavori_attivi ?? 0,
    fatturato_mese: Number(row.fatturato_mese ?? 0),
    fatturato_mese_precedente: Number(row.fatturato_mese_precedente ?? 0),
    pagamenti_scaduti_totale: Number(row.pagamenti_scaduti_totale ?? 0),
    pagamenti_scaduti_clienti_count: row.pagamenti_scaduti_clienti_count ?? 0,
    materiali_esaurimento_count: row.materiali_esaurimento_count ?? 0,
    in_prova_count: row.in_prova_count ?? 0,
    tecnico_piu_saturo: row.tecnico_saturo_id
      ? { nome: '', sigla: null, lavori_attivi: row.tecnico_saturo_count ?? 0 }
      : null,
  }
}

export function mapTecnicoLavoriRows(rows: RawLavoroRow[] | null): TecnicoDashboardItem[] {
  if (!rows) return []
  return rows
    .map((r) => ({
      id: r.id,
      numero_lavoro: r.numero_lavoro,
      stato: r.stato,
      priorita: r.priorita,
      tipo_dispositivo: r.tipo_dispositivo,
      descrizione: r.descrizione,
      data_consegna_prevista: r.data_consegna_prevista,
      ora_consegna: r.ora_consegna,
      paziente_nome_snapshot: r.paziente_nome_snapshot,
      cliente_display: clienteDisplay(r.clienti),
      prossima_fase: null,
      completamento_perc: 0,
      is_urgente:
        r.stato === 'in_ritardo' ||
        r.priorita === 'urgente' ||
        r.priorita === 'extra_urgente',
    }))
    .sort((a, b) => {
      if (a.is_urgente && !b.is_urgente) return -1
      if (!a.is_urgente && b.is_urgente) return 1
      return a.data_consegna_prevista.localeCompare(b.data_consegna_prevista)
    })
}

export function mapFrontDeskConsegneRows(rows: RawFrontDeskRow[] | null): FrontDeskConsegnaItem[] {
  if (!rows) return []
  return rows.map((r) => ({
    id: r.id,
    numero_lavoro: r.numero_lavoro,
    stato: r.stato,
    tipo_dispositivo: r.tipo_dispositivo,
    descrizione: r.descrizione,
    data_consegna_prevista: r.data_consegna_prevista,
    ora_consegna: r.ora_consegna,
    paziente_nome_snapshot: r.paziente_nome_snapshot,
    cliente_display: clienteDisplay(r.clienti),
    cliente_telefono: r.clienti?.telefono ?? null,
  }))
}

// ─── Query async ─────────────────────────────────────────────

export async function getTitolareKpi(
  svc: SupabaseClient,
  labId: string,
  stale: boolean
): Promise<DashboardStatsExtended> {
  if (stale) {
    await svc.rpc('refresh_dashboard_cache', { p_lab_id: labId })
  }
  const { data } = await svc
    .from('dashboard_kpi_cache')
    .select('*')
    .eq('laboratorio_id', labId)
    .maybeSingle()

  const kpi = mapTitolareKpiRow(data as RawKpiCacheRow)

  // ─── Margine netto mese corrente (calcolato on-the-fly) ──────────────────
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: margineRows } = await svc
    .from('lavori_lavorazioni')
    .select(`
      quantita,
      prezzo_unitario,
      listino!lavori_lavorazioni_listino_id_fkey(compenso_tecnico, costo_materiali_estimated),
      lavori!inner(
        laboratorio_id,
        data_consegna_effettiva,
        stato
      )
    `)
    .eq('lavori.laboratorio_id', labId)
    .eq('lavori.stato', 'consegnato')
    .gte('lavori.data_consegna_effettiva', startOfMonth.toISOString())
    .is('deleted_at', null)

  type MargineRow = {
    quantita: number | null
    prezzo_unitario: number | null
    listino: { compenso_tecnico: number | null; costo_materiali_estimated: number | null } | null
  }

  const rows = (margineRows ?? []) as unknown as MargineRow[]
  const fatturato = rows.reduce(
    (sum, r) => sum + (Number(r.prezzo_unitario ?? 0) * (r.quantita ?? 1)),
    0
  )
  const costiMateriali = rows.reduce(
    (sum, r) => sum + (Number(r.listino?.costo_materiali_estimated ?? 0) * (r.quantita ?? 1)),
    0
  )
  const compensiTecnici = rows.reduce(
    (sum, r) => sum + (Number(r.listino?.compenso_tecnico ?? 0) * (r.quantita ?? 1)),
    0
  )

  const margine_netto = fatturato - costiMateriali - compensiTecnici
  const percentuale_margine = fatturato > 0 ? Math.round((margine_netto / fatturato) * 100) : 0

  return { ...kpi, margine_netto, percentuale_margine }
}

export async function getPagamentiScadutiTop(
  svc: SupabaseClient,
  labId: string,
  limit = 3
): Promise<Array<{ cliente_id: string; cliente_display: string; residuo: number; telefono: string | null; giorni_ritardo: number }>> {
  const { getCreditoScadutoPerCliente } = await import('@/lib/contabilita/queries')
  const rows = await getCreditoScadutoPerCliente(svc, labId, 30)
  return rows.slice(0, limit).map((r) => ({
    cliente_id: r.cliente_id,
    cliente_display: r.cliente_display,
    residuo: r.residuo_totale,
    telefono: r.cliente_telefono,
    giorni_ritardo: r.giorni_scaduto,
  }))
}

export async function getMaterialiEsaurimento(
  svc: SupabaseClient,
  labId: string,
  limit = 5
): Promise<
  Array<{
    id: string
    nome: string
    scorta_attuale: number
    scorta_minima: number
    um_acquisto: string
  }>
> {
  const { data } = await svc
    .from('magazzino')
    .select('id, nome, scorta_attuale, scorta_minima, um_acquisto')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .eq('attivo', true)
    .gt('scorta_minima', 0)
    .order('scorta_attuale', { ascending: true })
    .limit(limit * 5)

  return (data ?? [])
    .filter(
      (m: { scorta_attuale: number; scorta_minima: number }) =>
        m.scorta_attuale <= m.scorta_minima
    )
    .slice(0, limit)
}

export async function getLavoriInProvaRientro(
  svc: SupabaseClient,
  labId: string
): Promise<
  Array<{
    id: string
    numero_lavoro: string
    descrizione: string
    data_prima_prova: string | null
    clienti: { nome: string; cognome: string; studio_nome: string | null } | null
  }>
> {
  const oggi = oggiISO()
  const { data } = await svc
    .from('lavori')
    .select('id, numero_lavoro, descrizione, data_prima_prova, clienti(nome, cognome, studio_nome)')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .eq('stato', 'in_prova')
    .lte('data_prima_prova', oggi)
    .order('data_prima_prova', { ascending: true })
    .limit(10)
  return (data ?? []) as never
}

export async function getTecnicoDashboard(
  svc: SupabaseClient,
  labId: string,
  tecnicoId: string
): Promise<TecnicoDashboard> {
  const oggi = oggiISO()
  const selectCampi =
    'id, numero_lavoro, stato, priorita, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome)'

  const [
    { data: urgentiData },
    { data: oggiData },
    { data: provaData },
    { data: lavoriOggiCompenso },
  ] = await Promise.all([
    svc
      .from('lavori')
      .select(selectCampi)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .eq('tecnico_id', tecnicoId)
      .or('stato.eq.in_ritardo,priorita.eq.urgente,priorita.eq.extra_urgente')
      .not('stato', 'in', '("consegnato","annullato")')
      .order('data_consegna_prevista', { ascending: true })
      .limit(20),

    svc
      .from('lavori')
      .select(selectCampi)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .eq('tecnico_id', tecnicoId)
      .eq('data_consegna_prevista', oggi)
      .not('stato', 'in', '("consegnato","annullato","in_ritardo")')
      .neq('priorita', 'urgente')
      .neq('priorita', 'extra_urgente')
      .order('ora_consegna', { ascending: true, nullsFirst: false })
      .limit(20),

    svc
      .from('lavori')
      .select(selectCampi)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .eq('tecnico_id', tecnicoId)
      .eq('stato', 'in_prova')
      .lte('data_prima_prova', oggi)
      .order('data_prima_prova', { ascending: true })
      .limit(10),

    // Compenso guadagnato oggi: lavori consegnati con data_consegna_effettiva = oggi
    svc
      .from('lavori_lavorazioni')
      .select(`
        quantita,
        listino!inner(compenso_tecnico),
        lavori!inner(tecnico_id, laboratorio_id, stato, data_consegna_effettiva)
      `)
      .eq('laboratorio_id', labId)
      .eq('lavori.tecnico_id', tecnicoId)
      .eq('lavori.stato', 'consegnato')
      .eq('lavori.laboratorio_id', labId)
      .eq('lavori.data_consegna_effettiva', oggi)
      .not('listino.compenso_tecnico', 'is', null),
  ])

  const compenso_oggi = (
    (lavoriOggiCompenso ?? []) as unknown as Array<{
      quantita: number
      listino: { compenso_tecnico: number | null } | null
    }>
  ).reduce((sum, ll) => {
    return sum + ((ll.listino?.compenso_tecnico ?? 0) * (ll.quantita ?? 1))
  }, 0)

  const lavorazioni_conteggiate_oggi = (lavoriOggiCompenso ?? []).length

  return {
    lavori_urgenti: mapTecnicoLavoriRows(urgentiData as RawLavoroRow[] | null),
    lavori_oggi: mapTecnicoLavoriRows(oggiData as RawLavoroRow[] | null),
    in_prova_rientro_oggi: mapTecnicoLavoriRows(provaData as RawLavoroRow[] | null),
    compenso_oggi,
    lavorazioni_conteggiate_oggi,
  }
}


export async function getTrendMensile(
  svc: SupabaseClient,
  labId: string,
  months = 12
): Promise<{ month: string; totale: number; label: string }[]> {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months + 1)
  startDate.setDate(1)
  startDate.setHours(0, 0, 0, 0)

  const { data } = await svc
    .from('fatture')
    .select('data_emissione, totale')
    .eq('laboratorio_id', labId)
    .gte('data_emissione', startDate.toISOString())
    .not('data_emissione', 'is', null)
    .order('data_emissione', { ascending: true })

  // Group by month (YYYY-MM)
  const byMonth: Record<string, number> = {}
  for (const f of data ?? []) {
    const month = (f.data_emissione as string).slice(0, 7) // "2026-01"
    byMonth[month] = (byMonth[month] ?? 0) + (f.totale ?? 0)
  }

  // Fill in empty months
  const result: { month: string; totale: number; label: string }[] = []
  const cursor = new Date(startDate)
  for (let i = 0; i < months; i++) {
    const key = cursor.toISOString().slice(0, 7)
    const label = cursor.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
    result.push({ month: key, totale: byMonth[key] ?? 0, label })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return result
}

// ─── LavoroDaFatturareItem ───────────────────────────────────────────────────
// Task 11: `getLavoriDaFatturare` (la query che popolava questo tipo) è stata
// rimossa perché priva di ogni consumatore (grep zero-risultati fuori da
// questo file). Il tipo resta: `DashboardTitolare.tsx` importa
// `LavoroDaFatturareItem` per una prop opzionale (`lavoriDaFatturare?`) mai
// valorizzata da chi la monta oggi (solo `admin/labs/[id]/live/page.tsx`,
// che non la passa) — coerente con `DashboardTitolare` restando in vita SOLO
// per quel consumatore admin (vedi task-11-report.md).
export type LavoroDaFatturareItem = {
  id: string
  numero_lavoro: string
  cliente_display: string
  data_consegna_effettiva: string | null
  prezzo_unitario: number
}

export async function getFrontDeskDashboard(
  svc: SupabaseClient,
  labId: string
): Promise<FrontDeskDashboard> {
  const oggi = oggiISO()
  const selectCampi =
    'id, numero_lavoro, stato, priorita, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome, telefono)'

  const [{ data: consegneData }, { data: rititiData }, { data: provaData }] =
    await Promise.all([
      svc
        .from('lavori')
        .select(selectCampi)
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .eq('data_consegna_prevista', oggi)
        .not('stato', 'in', '("consegnato","annullato")')
        .order('ora_consegna', { ascending: true, nullsFirst: false })
        .limit(30),

      svc
        .from('lavori')
        .select(selectCampi)
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .eq('data_ingresso', oggi)
        .order('created_at', { ascending: true })
        .limit(20),

      svc
        .from('lavori')
        .select(selectCampi)
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .eq('stato', 'in_prova')
        .lte('data_prima_prova', oggi)
        .order('data_prima_prova', { ascending: true })
        .limit(10),
    ])

  const { getCreditoScadutoPerCliente } = await import('@/lib/contabilita/queries')
  const daContattare = await getCreditoScadutoPerCliente(svc, labId, 30)

  return {
    consegne_oggi: mapFrontDeskConsegneRows(consegneData as RawFrontDeskRow[] | null),
    ritiri_attesi_oggi: mapFrontDeskConsegneRows(rititiData as RawFrontDeskRow[] | null),
    in_prova_rientro_oggi: mapFrontDeskConsegneRows(provaData as RawFrontDeskRow[] | null),
    da_contattare: daContattare.slice(0, 5),
  }
}

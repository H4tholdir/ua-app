/**
 * Dashboard query functions — pure, testable, service-client-ready.
 * These functions accept a SupabaseClient instance (service or user) and
 * a laboratorio_id, and return typed data objects.
 *
 * Note: all queries use explicit .eq('laboratorio_id', labId) because the
 * service client bypasses RLS — the tenant filter is the security boundary here.
 */

import type { DashboardStats } from '@/types/domain'
import { SupabaseClient } from '@supabase/supabase-js'

const defaultStats: DashboardStats = {
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
}

// ─── Titolare KPI (from cache, or defaults if stale/missing) ─────────────────

export async function getTitolareKpi(
  svc: SupabaseClient,
  labId: string,
  stale: boolean
): Promise<DashboardStats> {
  if (stale) {
    // Trigger async cache refresh (fire-and-forget, non-blocking)
    void svc.rpc('refresh_dashboard_cache', { p_lab: labId })
  }

  const { data: cache } = await svc
    .from('dashboard_kpi_cache')
    .select('*')
    .eq('laboratorio_id', labId)
    .maybeSingle()

  if (!cache) return defaultStats

  return {
    ...defaultStats,
    consegne_oggi: (cache as Record<string, unknown>).consegne_oggi as number ?? 0,
    lavori_in_ritardo: (cache as Record<string, unknown>).lavori_in_ritardo as number ?? 0,
    pronti_non_fatturati: (cache as Record<string, unknown>).pronti_non_fatturati as number ?? 0,
    mdr_incompleti: (cache as Record<string, unknown>).mdr_incompleti as number ?? 0,
    spedizioni_in_ritardo: (cache as Record<string, unknown>).spedizioni_in_ritardo as number ?? 0,
    is_rifacimento_count: (cache as Record<string, unknown>).is_rifacimento_count as number ?? 0,
    stl_non_assegnati: (cache as Record<string, unknown>).stl_non_assegnati as number ?? 0,
    lavori_attivi: (cache as Record<string, unknown>).lavori_attivi as number ?? 0,
    fatturato_mese: Number((cache as Record<string, unknown>).fatturato_mese ?? 0),
    tecnico_piu_saturo: (cache as Record<string, unknown>).tecnico_saturo_id
      ? {
          nome: '',
          sigla: null,
          lavori_attivi: (cache as Record<string, unknown>).tecnico_saturo_count as number ?? 0,
        }
      : null,
  }
}

// ─── Pagamenti scaduti — top N clienti con saldo aperto ──────────────────────

export interface PagamentoScaduto {
  cliente_id: string | null
  cliente_nome: string | null
  studio_nome: string | null
  saldo_aperto: number | null
}

export async function getPagamentiScadutiTop(
  svc: SupabaseClient,
  labId: string,
  limit = 3
): Promise<PagamentoScaduto[]> {
  // lavori_partitario tracks payment rows per lavoro; each lavoro has a cliente_id.
  // We join through lavori to get cliente_id, then aggregate open amounts per client.
  // Actual columns: id, importo, laboratorio_id, lavoro_id, data_pagamento, modalita, note, riferimento
  // "Open" = pagamento with importo < 0 (debits/uncollected) — but since schema stores
  // all payments as positive amounts, we use the fatture approach instead:
  // get clienti with positive saldo_aperto via the partitario_clienti view filtered to this lab.
  //
  // partitario_clienti view has: cliente_id, cliente_nome, studio_nome, saldo_aperto
  // but NO laboratorio_id (view is RLS-scoped normally; service client returns all labs).
  // We filter by joining with clienti.laboratorio_id.

  // Fetch all partitario rows for this lab's clients
  const { data: clientiLab } = await svc
    .from('clienti')
    .select('id')
    .eq('laboratorio_id', labId)

  if (!clientiLab || clientiLab.length === 0) return []

  const clientiIds = (clientiLab as Array<Record<string, unknown>>).map(c => c.id as string)

  // Get payment summary from lavori_partitario grouped by cliente via lavori join
  // lavori has cliente_id — join: lavori_partitario -> lavori -> (cliente_id, laboratorio_id)
  const { data: partitario } = await svc
    .from('lavori_partitario')
    .select('importo, lavori!inner(cliente_id, laboratorio_id)')
    .eq('lavori.laboratorio_id', labId)
    .is('deleted_at', null)
    .limit(200)

  if (!partitario) return []

  // Aggregate by cliente_id
  const byCliente: Record<string, number> = {}
  for (const row of partitario as Array<Record<string, unknown>>) {
    const lavoro = row.lavori as Record<string, unknown> | null
    const cid = lavoro?.cliente_id as string | null
    if (!cid || !clientiIds.includes(cid)) continue
    byCliente[cid] = (byCliente[cid] ?? 0) + (row.importo as number ?? 0)
  }

  // Sort descending by balance (higher = more owed)
  const sorted = Object.entries(byCliente)
    .filter(([, amount]) => amount > 0)
    .map(([cid, amount]) => ({ cliente_id: cid, saldo_aperto: amount }))
    .sort((a, b) => b.saldo_aperto - a.saldo_aperto)
    .slice(0, limit)

  if (sorted.length === 0) return []

  // Fetch client names
  const ids = sorted.map(r => r.cliente_id)
  const { data: clienti } = await svc
    .from('clienti')
    .select('id, nome, cognome, studio_nome')
    .in('id', ids)
    .eq('laboratorio_id', labId)

  return sorted.map(row => {
    const c = (clienti as Array<Record<string, unknown>> ?? []).find(
      (x: Record<string, unknown>) => x.id === row.cliente_id
    ) as Record<string, unknown> | undefined
    return {
      cliente_id: row.cliente_id,
      cliente_nome: c
        ? `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || null
        : null,
      studio_nome: (c?.studio_nome as string | null) ?? null,
      saldo_aperto: row.saldo_aperto,
    }
  })
}

// ─── Materiali sotto scorta — top N articoli ─────────────────────────────────

export interface MaterialeEsaurimento {
  id: string | null
  nome: string | null
  scorta_attuale: number | null
  scorta_minima: number | null
  um_acquisto: string | null
}

export async function getMaterialiEsaurimento(
  svc: SupabaseClient,
  labId: string,
  limit = 5
): Promise<MaterialeEsaurimento[]> {
  // PostgREST cannot compare two columns natively, so we fetch all active articles
  // for this lab and filter scorta_attuale <= scorta_minima in JS.
  // We order by scorta_attuale ASC and cap at 100 rows to avoid over-fetching.
  const { data } = await svc
    .from('magazzino')
    .select('id, nome, scorta_attuale, scorta_minima, um_acquisto')
    .eq('laboratorio_id', labId)
    .eq('attivo', true)
    .order('scorta_attuale', { ascending: true })
    .limit(100)

  if (!data) return []

  return (data as Array<Record<string, unknown>>)
    .filter(r => {
      const attuale = r.scorta_attuale as number | null
      const minima = r.scorta_minima as number | null
      return attuale !== null && minima !== null && attuale <= minima
    })
    .slice(0, limit)
    .map(r => ({
      id: r.id as string | null,
      nome: r.nome as string | null,
      scorta_attuale: r.scorta_attuale as number | null,
      scorta_minima: r.scorta_minima as number | null,
      um_acquisto: r.um_acquisto as string | null,
    }))
}

// ─── Lavori in prova esterna con rientro previsto oggi o scaduto ─────────────

export interface LavoroInProva {
  id: string
  numero_lavoro: string
  tipo_dispositivo: string
  descrizione: string
  data_prima_prova: string | null
  data_seconda_prova: string | null
  data_terza_prova: string | null
  paziente_nome_snapshot: string | null
  cliente_display: string
}

export async function getLavoriInProvaRientro(
  svc: SupabaseClient,
  labId: string
): Promise<LavoroInProva[]> {
  const oggi = new Date().toISOString().split('T')[0]

  const { data } = await svc
    .from('lavori')
    .select(`
      id, numero_lavoro, tipo_dispositivo, descrizione,
      data_prima_prova, data_seconda_prova, data_terza_prova,
      paziente_nome_snapshot,
      clienti(nome, cognome, studio_nome)
    `)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .in('stato', ['in_prova', 'in_prova_esterna'])
    .or(`data_prima_prova.lte.${oggi},data_seconda_prova.lte.${oggi},data_terza_prova.lte.${oggi}`)
    .order('data_prima_prova', { ascending: true })
    .limit(10)

  if (!data) return []

  return (data as Array<Record<string, unknown>>).map(l => {
    const c = l.clienti as Record<string, unknown> | null
    return {
      id: l.id as string,
      numero_lavoro: l.numero_lavoro as string,
      tipo_dispositivo: l.tipo_dispositivo as string,
      descrizione: l.descrizione as string,
      data_prima_prova: l.data_prima_prova as string | null,
      data_seconda_prova: l.data_seconda_prova as string | null,
      data_terza_prova: l.data_terza_prova as string | null,
      paziente_nome_snapshot: l.paziente_nome_snapshot as string | null,
      cliente_display: c
        ? ((c.studio_nome as string | null) ?? `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()) || '—'
        : '—',
    }
  })
}

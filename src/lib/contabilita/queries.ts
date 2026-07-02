import type { SupabaseClient } from '@supabase/supabase-js'
import { calcolaResiduo } from './saldo'

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
      id, prezzo_unitario, data_consegna_prevista,
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
    .gt('prezzo_unitario', 0)

  for (const l of (lavoriData ?? []) as unknown as Array<{
    id: string; prezzo_unitario: number | null; data_consegna_prevista: string
    clienti: ClienteSnap
    pagamenti: Array<{ importo: number; stato: string }>
    credito_clienti_movimenti: Array<{ importo: number; tipo: string }>
  }>) {
    const pagamentiAttivi = (l.pagamenti ?? []).filter((p) => p.stato === 'attivo')
    const applicazioni = (l.credito_clienti_movimenti ?? []).filter((m) => m.tipo === 'applicazione')
    const residuo = calcolaResiduo(Number(l.prezzo_unitario ?? 0), pagamentiAttivi, applicazioni)
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
 */
export async function fetchMovimentiCreditoValidi(
  svc: SupabaseClient,
  labId: string,
  clienteId: string
): Promise<Array<{ tipo: 'eccedenza' | 'applicazione' | 'rimborso'; importo: number }>> {
  const { data: movimentiRaw } = await svc
    .from('credito_clienti_movimenti')
    .select('tipo, importo, pagamento_id, pagamenti(stato)')
    .eq('cliente_id', clienteId)
    .eq('laboratorio_id', labId)

  return ((movimentiRaw ?? []) as unknown as Array<{
    tipo: 'eccedenza' | 'applicazione' | 'rimborso'; importo: number
    pagamento_id: string | null; pagamenti: { stato: string } | null
  }>)
    .filter((m) => m.tipo !== 'eccedenza' || m.pagamenti?.stato === 'attivo')
    .map((m) => ({ tipo: m.tipo, importo: m.importo }))
}

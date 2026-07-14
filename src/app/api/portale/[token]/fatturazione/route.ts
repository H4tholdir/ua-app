// src/app/api/portale/[token]/fatturazione/route.ts
// Spec §5/§7 — lista «Da fatturare» dietro PIN.
// VINCOLO doppia sorgente (Francesco): un lavoro è «già fatturato» se
// incluso_in_fattura=true OPPURE se esiste una fattura attiva con
// fatture.lavoro_id = lavoro (il percorso xml multi-lavoro non setta il flag).
// La seconda sorgente è FAIL-CLOSED: se la lettura fatture fallisce → 500.
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { guardieEconomiche } from '@/lib/portale/guardie'
import { logPortaleAudit } from '@/lib/portale/audit'
import { minimizzaPhi } from '@/lib/portale/minimizza-phi'
import { prezzoEffettivoLavoro } from '@/lib/domain/prezzo-lavoro'

type RouteContext = { params: Promise<{ token: string }> }

export type RigaDaFatturare = {
  id: string
  numero_lavoro: string
  tipo_dispositivo: string
  data_consegna: string | null
  prezzo: number
  paziente: string
  proposta: 'fatturare' | 'non_fatturare' | null
  proposta_at: string | null
  confermato: boolean
  decisione: 'fatturare' | 'non_fatturare' | null
}
export type FatturazioneResponse = {
  studio: string | null
  gruppi: Array<{ mese: string; lavori: RigaDaFatturare[] }>
  totale_fatturare: number
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { token } = await params
    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const cliente = g.cliente

    const { data: lavori, error: lavErr } = await svc
      .from('lavori')
      .select('id, numero_lavoro, tipo_dispositivo, data_consegna_effettiva, prezzo_unitario, paziente_nome_snapshot, proposta_dentista, proposta_at, decisione_fatturazione, lavorazioni:lavori_lavorazioni(importo)')
      .eq('cliente_id', cliente.id)
      .eq('laboratorio_id', cliente.laboratorio_id)
      .eq('stato', 'consegnato')
      .eq('incluso_in_fattura', false)
      .is('deleted_at', null)
      .order('data_consegna_effettiva', { ascending: false })
    if (lavErr) {
      console.error('[portale fatturazione] lettura lavori:', lavErr.message)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }

    // Seconda sorgente di esclusione: fatture.lavoro_id (fail-closed).
    let esclusi = new Set<string>()
    const ids = (lavori ?? []).map((l) => l.id)
    if (ids.length > 0) {
      const { data: fatt, error: fatErr } = await svc
        .from('fatture')
        .select('lavoro_id')
        .eq('laboratorio_id', cliente.laboratorio_id)
        .neq('stato_sdi', 'rifiutata')
        .in('lavoro_id', ids)
      if (fatErr) {
        console.error('[portale fatturazione] lettura fatture:', fatErr.message)
        return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
      }
      esclusi = new Set((fatt ?? []).map((f) => f.lavoro_id).filter((x): x is string => x != null))
    }

    const righe: RigaDaFatturare[] = (lavori ?? [])
      .filter((l) => !esclusi.has(l.id))
      .map((l) => ({
        id: l.id,
        numero_lavoro: l.numero_lavoro,
        tipo_dispositivo: l.tipo_dispositivo,
        data_consegna: l.data_consegna_effettiva,
        prezzo: prezzoEffettivoLavoro(l),
        paziente: minimizzaPhi(l.paziente_nome_snapshot) ?? '',
        proposta: (l.proposta_dentista as RigaDaFatturare['proposta']) ?? null,
        proposta_at: l.proposta_at,
        confermato: l.decisione_fatturazione !== 'in_attesa',
        decisione: l.decisione_fatturazione !== 'in_attesa'
          ? (l.decisione_fatturazione as 'fatturare' | 'non_fatturare')
          : null,
      }))

    const gruppiMap = new Map<string, RigaDaFatturare[]>()
    for (const r of righe) {
      const mese = (r.data_consegna ?? '').slice(0, 7) || 'senza-data'
      const gruppo = gruppiMap.get(mese) ?? []
      gruppo.push(r)
      gruppiMap.set(mese, gruppo)
    }
    const gruppi = [...gruppiMap.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mese, lavoriMese]) => ({ mese, lavori: lavoriMese }))

    const totale_fatturare = righe
      .filter((r) => r.decisione === 'fatturare' || (!r.confermato && r.proposta === 'fatturare'))
      .reduce((s, r) => s + r.prezzo, 0)

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id, azione: 'view_fatturazione', req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    const risposta: FatturazioneResponse = { studio: cliente.studio_nome, gruppi, totale_fatturare }
    return NextResponse.json(risposta)
  } catch (err) {
    console.error('[portale fatturazione] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}

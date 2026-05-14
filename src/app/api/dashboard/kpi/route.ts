import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import type { DashboardStats } from '@/types/domain'

export async function GET() {
  const supabase = await getServerUserClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS applies via anon key — will return only the current lab's row
  const { data: cache } = await supabase
    .from('dashboard_kpi_cache')
    .select('*')
    .maybeSingle()

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

  if (!cache) return NextResponse.json(defaultStats)

  const stats: DashboardStats = {
    ...defaultStats,
    consegne_oggi: cache.consegne_oggi ?? 0,
    lavori_in_ritardo: cache.lavori_in_ritardo ?? 0,
    pronti_non_fatturati: cache.pronti_non_fatturati ?? 0,
    mdr_incompleti: cache.mdr_incompleti ?? 0,
    spedizioni_in_ritardo: cache.spedizioni_in_ritardo ?? 0,
    is_rifacimento_count: cache.is_rifacimento_count ?? 0,
    stl_non_assegnati: cache.stl_non_assegnati ?? 0,
    lavori_attivi: cache.lavori_attivi ?? 0,
    fatturato_mese: Number(cache.fatturato_mese ?? 0),
    tecnico_piu_saturo: cache.tecnico_saturo_id
      ? { nome: '', sigla: null, lavori_attivi: cache.tecnico_saturo_count ?? 0 }
      : null,
  }

  return NextResponse.json(stats)
}

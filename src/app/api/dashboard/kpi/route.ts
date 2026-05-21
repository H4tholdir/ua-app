import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isCacheStale } from '@/lib/dashboard/cache-stale'
import {
  getTitolareKpi,
  getTecnicoDashboard,
  getFrontDeskDashboard,
} from '@/lib/dashboard/queries'
import type {
  DashboardStatsExtended,
  TecnicoDashboard,
  FrontDeskDashboard,
} from '@/types/domain'

// ─── Response union ──────────────────────────────────────────

type DashboardApiResponse =
  | { role: 'titolare'; data: DashboardStatsExtended }
  | { role: 'tecnico'; data: TecnicoDashboard }
  | { role: 'front_desk'; data: FrontDeskDashboard }
  | { error: string }

// ─── Route handler ───────────────────────────────────────────

export async function GET(): Promise<NextResponse<DashboardApiResponse>> {
  // 1. Autenticazione — RLS via anon key
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Profilo utente — service client per bypassare RLS su utenti
  //    (RLS su utenti potrebbe bloccare la lettura del proprio profilo via anon key)
  const svc = getServiceClient()

  const { data: utente, error: utenteError } = await svc
    .from('utenti')
    .select('ruolo, laboratorio_id')
    .eq('id', user.id)
    .single()

  if (utenteError || !utente) {
    return NextResponse.json({ error: 'Profilo utente non trovato' }, { status: 404 })
  }

  const labId: string | null = utente.laboratorio_id ?? null
  const ruolo: string = utente.ruolo ?? ''

  if (!labId) {
    return NextResponse.json({ error: 'Laboratorio non associato' }, { status: 404 })
  }

  // 3. RBAC routing

  // ── Titolare / admin_rete ───────────────────────────────────
  if (ruolo === 'titolare' || ruolo === 'admin_rete') {
    // Controllo stale sulla cache prima di passare a getTitolareKpi
    const { data: meta } = await svc
      .from('dashboard_kpi_cache')
      .select('aggiornato_at')
      .eq('laboratorio_id', labId)
      .maybeSingle()

    const stale = isCacheStale(meta?.aggiornato_at ?? null)
    const data = await getTitolareKpi(svc, labId, stale)

    return NextResponse.json({ role: 'titolare', data })
  }

  // ── Tecnico ─────────────────────────────────────────────────
  if (ruolo === 'tecnico') {
    // Ricerca profilo tecnico associato all'utente corrente
    const { data: tecnico } = await svc
      .from('tecnici')
      .select('id')
      .eq('laboratorio_id', labId)
      .eq('utente_id', user.id)
      .maybeSingle()

    if (!tecnico) {
      // Tecnico senza profilo tecnico associato: dashboard vuota, non un errore
      const empty: TecnicoDashboard = {
        lavori_urgenti: [],
        lavori_oggi: [],
        in_prova_rientro_oggi: [],
        compenso_oggi: 0,
      }
      return NextResponse.json({ role: 'tecnico', data: empty })
    }

    const data = await getTecnicoDashboard(svc, labId, tecnico.id)
    return NextResponse.json({ role: 'tecnico', data })
  }

  // ── Front desk ───────────────────────────────────────────────
  if (ruolo === 'front_desk') {
    const data = await getFrontDeskDashboard(svc, labId)
    return NextResponse.json({ role: 'front_desk', data })
  }

  // ── Ruolo sconosciuto ────────────────────────────────────────
  return NextResponse.json({ error: `Ruolo non autorizzato: ${ruolo}` }, { status: 403 })
}

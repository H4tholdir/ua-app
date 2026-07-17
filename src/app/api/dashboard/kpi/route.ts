import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
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

// Esportato solo a scopo documentale (shape logica della risposta): la
// firma di GET resta `Promise<NextResponse>` non parametrizzata perché
// withServerTiming (Task 9) non è generico — vedi server-timing.ts.
export type DashboardApiResponse =
  | { role: 'titolare'; data: DashboardStatsExtended }
  | { role: 'tecnico'; data: TecnicoDashboard }
  | { role: 'front_desk'; data: FrontDeskDashboard }
  | { error: string }

// ─── Route handler ───────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return withServerTiming(async (t) => {
    // 1. Contesto — claims locali (zero rete), fail-closed su qualunque
    //    problema di autenticazione O di lookup profilo (DEVIAZIONE
    //    DICHIARATA: prima "profilo non trovato" era 404 distinto, ora
    //    collassa su context null → 401 "Unauthorized" come l'utente non
    //    autenticato — vedi lab-context.ts, fail-closed by design).
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)

    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const labId: string | null = context.laboratorioId
    const ruolo: string = context.ruolo ?? ''

    if (!labId) {
      return NextResponse.json({ error: 'Laboratorio non associato' }, { status: 404 })
    }
    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard

    // 2. RBAC routing
    const svc = getServiceClient()

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
        .eq('utente_id', context.userId)
        .maybeSingle()

      if (!tecnico) {
        // Tecnico senza profilo tecnico associato: dashboard vuota, non un errore
        const empty: TecnicoDashboard = {
          lavori_urgenti: [],
          lavori_oggi: [],
          in_prova_rientro_oggi: [],
          compenso_oggi: 0,
          lavorazioni_conteggiate_oggi: 0,
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
  })
}

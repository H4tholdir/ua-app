import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isCacheStale } from '@/lib/dashboard/cache-stale'
import {
  getTitolareKpi,
  getPagamentiScadutiTop,
  getMaterialiEsaurimento,
  getLavoriInProvaRientro,
  getTecnicoDashboard,
  getFrontDeskDashboard,
} from '@/lib/dashboard/queries'
import { DashboardTitolare } from '@/components/features/dashboard/DashboardTitolare'
import { DashboardTecnico } from '@/components/features/dashboard/DashboardTecnico'
import { DashboardFrontDesk } from '@/components/features/dashboard/DashboardFrontDesk'
import type { StatoLavoro, PrioritaLavoro, TipoDispositivo } from '@/types/domain'

export const dynamic = 'force-dynamic'

// ─── Raw row types for Supabase queries ──────────────────────────────────────

type ConsegnaRaw = {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  tipo_dispositivo: TipoDispositivo
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  clienti: {
    nome: string
    cognome: string
    studio_nome: string | null
    telefono: string | null
  } | null
}

type RitardoRaw = {
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()

  // ─── Dati utente ──────────────────────────────────────────────────────────
  // Note: `utenti` non ha colonna `tecnico_id` — si usa tecnici.utente_id per il join
  const { data: utente } = await svc
    .from('utenti')
    .select('ruolo, laboratorio_id, nome, cognome')
    .eq('id', user.id)
    .is('deleted_at', null)
    .single()

  if (!utente) redirect('/login')

  const { ruolo, laboratorio_id: labId } = utente
  const nomeUtente =
    utente.nome ??
    user.email?.split('@')[0] ??
    'Utente'

  // ─── TITOLARE / admin_rete ────────────────────────────────────────────────
  if (ruolo === 'titolare' || ruolo === 'admin_rete') {
    const { data: cacheRow } = await svc
      .from('dashboard_kpi_cache')
      .select('aggiornato_at')
      .eq('laboratorio_id', labId)
      .maybeSingle()

    const stale = isCacheStale(cacheRow?.aggiornato_at ?? null)
    const oggi = new Date().toISOString().split('T')[0]

    const [stats, pagamentiTop, materialiEsaurimento, inProvaRientro] =
      await Promise.all([
        getTitolareKpi(svc, labId, stale),
        getPagamentiScadutiTop(svc, labId, 3),
        getMaterialiEsaurimento(svc, labId, 5),
        getLavoriInProvaRientro(svc, labId),
      ])

    // Consegne oggi
    const { data: consegneData } = await svc
      .from('lavori')
      .select(
        'id, numero_lavoro, stato, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome, telefono)'
      )
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .eq('data_consegna_prevista', oggi)
      .not('stato', 'in', '("consegnato","annullato")')
      .order('ora_consegna', { ascending: true, nullsFirst: false })
      .limit(30)

    // Lavori in ritardo
    const { data: ritardoData } = await svc
      .from('lavori')
      .select(
        'id, numero_lavoro, stato, priorita, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome)'
      )
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .eq('stato', 'in_ritardo')
      .order('data_consegna_prevista', { ascending: true })
      .limit(20)

    // Nome laboratorio + onboarding status
    const { data: lab } = await svc
      .from('laboratori')
      .select('nome, onboarding_completato')
      .eq('id', labId)
      .maybeSingle()

    const consegneOggi = ((consegneData ?? []) as unknown as ConsegnaRaw[]).map(
      (l) => ({
        id: l.id,
        numero_lavoro: l.numero_lavoro,
        stato: l.stato,
        tipo_dispositivo: l.tipo_dispositivo,
        descrizione: l.descrizione,
        data_consegna_prevista: l.data_consegna_prevista,
        ora_consegna: l.ora_consegna,
        paziente_nome_snapshot: l.paziente_nome_snapshot,
        cliente_display:
          l.clienti?.studio_nome ??
          (`${l.clienti?.nome ?? ''} ${l.clienti?.cognome ?? ''}`.trim() || '—'),
        cliente_telefono: l.clienti?.telefono ?? null,
      })
    )

    const lavoriInRitardo = ((ritardoData ?? []) as unknown as RitardoRaw[]).map(
      (l) => ({
        id: l.id,
        numero_lavoro: l.numero_lavoro,
        stato: l.stato,
        priorita: l.priorita,
        tipo_dispositivo: l.tipo_dispositivo,
        descrizione: l.descrizione,
        data_consegna_prevista: l.data_consegna_prevista,
        ora_consegna: l.ora_consegna,
        paziente_nome_snapshot: l.paziente_nome_snapshot,
        cliente_display:
          l.clienti?.studio_nome ??
          (`${l.clienti?.nome ?? ''} ${l.clienti?.cognome ?? ''}`.trim() || '—'),
      })
    )

    return (
      <DashboardTitolare
        stats={stats}
        consegneOggi={consegneOggi}
        lavoriInRitardo={lavoriInRitardo}
        inProvaRientro={inProvaRientro}
        materialiEsaurimento={materialiEsaurimento}
        pagamentiTop={pagamentiTop}
        nomeUtente={nomeUtente}
        labName={lab?.nome ?? undefined}
        aggiornatoAt={cacheRow?.aggiornato_at ?? null}
        onboardingPending={!lab?.onboarding_completato}
      />
    )
  }

  // ─── TECNICO ──────────────────────────────────────────────────────────────
  if (ruolo === 'tecnico') {
    // Trova il record tecnici associato a questo utente
    const { data: tecnico } = await svc
      .from('tecnici')
      .select('id')
      .eq('laboratorio_id', labId)
      .eq('utente_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    const data = tecnico
      ? await getTecnicoDashboard(svc, labId, tecnico.id)
      : { lavori_urgenti: [], lavori_oggi: [], in_prova_rientro_oggi: [], compenso_oggi: 0, lavorazioni_conteggiate_oggi: 0 }

    return <DashboardTecnico data={data} nomeUtente={nomeUtente} tecnicoId={tecnico?.id ?? null} />
  }

  // ─── FRONT DESK ───────────────────────────────────────────────────────────
  if (ruolo === 'front_desk') {
    const data = await getFrontDeskDashboard(svc, labId)
    return (
      <DashboardFrontDesk data={data} nomeUtente={nomeUtente} labId={labId} />
    )
  }

  // Ruoli non gestiti dalla dashboard (admin_sistema usa /admin)
  redirect('/login')
}

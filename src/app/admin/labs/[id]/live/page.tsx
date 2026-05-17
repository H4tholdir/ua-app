import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { DashboardTitolare } from '@/components/features/dashboard/DashboardTitolare'
import { isCacheStale } from '@/lib/dashboard/cache-stale'
import {
  getTitolareKpi,
  getPagamentiScadutiTop,
  getMaterialiEsaurimento,
  getLavoriInProvaRientro,
} from '@/lib/dashboard/queries'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminLivePreviewPage({ params }: Props) {
  const { id } = await params

  // ── Verifica admin ────────────────────────────────────────────────────────
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: me } = await svc
    .from('utenti')
    .select('ruolo')
    .eq('id', user.id)
    .single()

  if ((me as Record<string, unknown> | null)?.ruolo !== 'admin_sistema') {
    redirect('/admin/labs')
  }

  // ── Carica dati del lab ───────────────────────────────────────────────────
  const { data: lab } = await svc
    .from('laboratori')
    .select('*')
    .eq('id', id)
    .single()

  if (!lab) redirect('/admin/labs')

  // ── Trova il titolare del lab ─────────────────────────────────────────────
  const { data: titolareUtente } = await svc
    .from('utenti')
    .select('nome, cognome, ruolo')
    .eq('laboratorio_id', id)
    .eq('ruolo', 'titolare')
    .maybeSingle()

  const labRaw = lab as Record<string, unknown>
  const titolareRaw = titolareUtente as Record<string, unknown> | null

  const nomeUtente = titolareRaw
    ? `${titolareRaw.nome ?? ''} ${titolareRaw.cognome ?? ''}`.trim()
    : labRaw.nome as string

  // ── Cache staleness ───────────────────────────────────────────────────────
  const { data: cacheRow } = await svc
    .from('dashboard_kpi_cache')
    .select('aggiornato_at')
    .eq('laboratorio_id', id)
    .maybeSingle()

  const cacheRaw = cacheRow as Record<string, unknown> | null
  const stale = isCacheStale((cacheRaw?.aggiornato_at as string | null) ?? null)

  // ── Carica dati dashboard con service client ──────────────────────────────
  const [stats, pagamentiTop, materialiEsaurimento, inProvaRientro] = await Promise.all([
    getTitolareKpi(svc, id, stale),
    getPagamentiScadutiTop(svc, id, 3),
    getMaterialiEsaurimento(svc, id, 5),
    getLavoriInProvaRientro(svc, id),
  ])

  const oggi = new Date().toISOString().split('T')[0]

  // ── Consegne di oggi ──────────────────────────────────────────────────────
  const { data: consegneData } = await svc
    .from('lavori')
    .select(
      'id, numero_lavoro, stato, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome, telefono)'
    )
    .eq('laboratorio_id', id)
    .is('deleted_at', null)
    .eq('data_consegna_prevista', oggi)
    .not('stato', 'in', '("consegnato","annullato")')
    .order('ora_consegna', { ascending: true, nullsFirst: false })
    .limit(30)

  // ── Lavori in ritardo ─────────────────────────────────────────────────────
  const { data: ritardoData } = await svc
    .from('lavori')
    .select(
      'id, numero_lavoro, stato, priorita, tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna, paziente_nome_snapshot, clienti(nome, cognome, studio_nome)'
    )
    .eq('laboratorio_id', id)
    .is('deleted_at', null)
    .eq('stato', 'in_ritardo')
    .order('data_consegna_prevista', { ascending: true })
    .limit(20)

  const consegneOggi = ((consegneData as Array<Record<string, unknown>>) ?? []).map(l => {
    const c = l.clienti as Record<string, unknown> | null
    return {
      id: l.id as string,
      numero_lavoro: l.numero_lavoro as string,
      stato: l.stato as string,
      tipo_dispositivo: l.tipo_dispositivo as string,
      descrizione: l.descrizione as string,
      data_consegna_prevista: l.data_consegna_prevista as string,
      ora_consegna: l.ora_consegna as string | null,
      paziente_nome_snapshot: l.paziente_nome_snapshot as string | null,
      cliente_display: c
        ? ((c.studio_nome as string | null) ??
            `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()) || '—'
        : '—',
      cliente_telefono: (c?.telefono as string | null) ?? null,
    }
  })

  const lavoriInRitardo = ((ritardoData as Array<Record<string, unknown>>) ?? []).map(l => {
    const c = l.clienti as Record<string, unknown> | null
    return {
      id: l.id as string,
      numero_lavoro: l.numero_lavoro as string,
      stato: l.stato as string,
      priorita: l.priorita as string,
      tipo_dispositivo: l.tipo_dispositivo as string,
      descrizione: l.descrizione as string,
      data_consegna_prevista: l.data_consegna_prevista as string,
      ora_consegna: l.ora_consegna as string | null,
      paziente_nome_snapshot: l.paziente_nome_snapshot as string | null,
      cliente_display: c
        ? ((c.studio_nome as string | null) ??
            `${c.nome ?? ''} ${c.cognome ?? ''}`.trim()) || '—'
        : '—',
    }
  })

  return (
    <>
      {/* Banner Admin Preview — fisso in cima */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: '#1C1916',
          color: '#F0EDE8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 44,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,.4)',
        }}
      >
        <span>
          <strong>ADMIN PREVIEW</strong> — visualizzando come{' '}
          <strong>{nomeUtente}</strong> &middot; {labRaw.nome as string}
        </span>
        <Link
          href={`/admin/labs/${id}`}
          style={{
            background: 'rgba(255,255,255,.12)',
            color: '#F0EDE8',
            padding: '5px 12px',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Chiudi preview
        </Link>
      </div>

      {/* Contenuto dashboard con padding-top per il banner */}
      <div style={{ paddingTop: 44, minHeight: '100dvh', background: '#0F1E52' }}>
        <DashboardTitolare
          stats={stats}
          consegneOggi={consegneOggi as Parameters<typeof DashboardTitolare>[0]['consegneOggi']}
          lavoriInRitardo={lavoriInRitardo as Parameters<typeof DashboardTitolare>[0]['lavoriInRitardo']}
          inProvaRientro={inProvaRientro}
          materialiEsaurimento={materialiEsaurimento}
          pagamentiTop={pagamentiTop}
          nomeUtente={nomeUtente}
          labName={labRaw.nome as string}
          aggiornatoAt={(cacheRaw?.aggiornato_at as string | null) ?? null}
        />
      </div>
    </>
  )
}

import { notFound } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatoBadge } from '@/components/features/lavori/StatoBadge'
import { LavoroTimeline } from '@/components/features/lavori/LavoroTimeline'
import { LavoroFormClient } from '@/components/features/lavori/LavoroFormClient'
import { AnnullaConsegnaBanner } from '@/components/features/lavori/AnnullaConsegnaBanner'
import { TracciabilitaMaterialiBanner } from '@/components/features/lavori/TracciabilitaMaterialiBanner'
import { RifacimentoButton } from '@/components/features/lavori/RifacimentoButton'
import type { LavoroDettaglio } from '@/types/domain'

type PageProps = { params: Promise<{ id: string }> }

export default async function LavoroDettaglioPage({ params }: PageProps) {
  const { id } = await params

  // Auth
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) notFound()

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) notFound()

  // Carica lavoro con tutti i join
  const { data: lavoro, error } = await svc
    .from('lavori')
    .select(`
      *,
      cliente:clienti(*),
      paziente:pazienti(*),
      tecnico:tecnici(*),
      lavorazioni:lavori_lavorazioni(*),
      appuntamenti:lavori_appuntamenti(*),
      immagini:lavori_immagini(*),
      fasi:lavori_fasi(*, fase:fasi_produzione(*)),
      materiali:lavori_materiali(*),
      ddc:dichiarazioni_conformita(*),
      laboratorio:laboratori(nome, telefono)
    `)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (error || !lavoro) {
    notFound()
  }

  const lavoroDettaglio = lavoro as unknown as LavoroDettaglio

  const subtitle =
    lavoroDettaglio.paziente_nome_snapshot ?? lavoroDettaglio.descrizione

  return (
    <PageWrapper>
      <AppHeader
        title={lavoroDettaglio.numero_lavoro}
        subtitle={subtitle}
        backHref="/lavori"
        actions={<StatoBadge stato={lavoroDettaglio.stato} />}
      />

      {/* Banner annulla consegna (grace period 5 min) */}
      {lavoroDettaglio.stato === 'consegnato' && lavoroDettaglio.data_consegna_effettiva && (
        <AnnullaConsegnaBanner
          lavoroId={id}
          dataConsegnaEffettiva={lavoroDettaglio.data_consegna_effettiva}
        />
      )}

      {!lavoroDettaglio.tracciabilita_materiali_ok && lavoroDettaglio.materiali_incompleti_dettaglio && (
        <TracciabilitaMaterialiBanner dettaglio={lavoroDettaglio.materiali_incompleti_dettaglio} />
      )}

      {/* Timeline stato */}
      <div style={{ padding: '0 20px 20px' }}>
        <LavoroTimeline lavoro={lavoroDettaglio} />
      </div>

      {/* Form multi-tab */}
      <LavoroFormClient lavoro={lavoroDettaglio} ruolo={utente.ruolo} />

      {/* Rifacimento — disponibile su consegnato, pronto, sospeso */}
      {(['consegnato', 'pronto', 'sospeso'] as const).includes(lavoroDettaglio.stato as 'consegnato' | 'pronto' | 'sospeso') && (
        <div style={{ padding: '0 20px 24px' }}>
          <RifacimentoButton
            lavoroId={id}
            numeroLavoro={lavoroDettaglio.numero_lavoro}
          />
        </div>
      )}
    </PageWrapper>
  )
}

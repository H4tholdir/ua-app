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
import { getSignedUrl } from '@/lib/storage/signed-url'
import type { LavoroDettaglio, DichiarazioneConformita } from '@/types/domain'

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
    .neq('ddc.stato', 'annullata')
    .single()

  if (error || !lavoro) {
    notFound()
  }

  const lavoroDettaglio = lavoro as unknown as LavoroDettaglio

  // Fix trasversale B5: le "public URL" salvate in DB sono rotte (bucket
  // documenti privato) — firma gli URL al momento del render, mai in anticipo.
  // Normalizzazione difensiva: PostgREST può restituire `dichiarazioni_conformita`
  // embedded come oggetto singolo o array a seconda della cardinalità inferita —
  // non assumere una forma specifica per questo confine esterno (mai verificato
  // empiricamente). Riassegna la proprietà così tutto il resto della pagina
  // (incluso il passaggio a TabDocumenti) vede sempre un oggetto singolo coerente.
  const ddcRaw = lavoroDettaglio.ddc as unknown as DichiarazioneConformita | DichiarazioneConformita[] | null
  lavoroDettaglio.ddc = Array.isArray(ddcRaw) ? (ddcRaw[0] ?? null) : ddcRaw

  if (lavoroDettaglio.ddc?.storage_path_pdf) {
    const signedDdcUrl = await getSignedUrl(svc, 'documenti', lavoroDettaglio.ddc.storage_path_pdf, 3600)
    if (signedDdcUrl) lavoroDettaglio.ddc.pdf_url = signedDdcUrl
  }

  if (lavoroDettaglio.immagini.length > 0) {
    await Promise.all(
      lavoroDettaglio.immagini.map(async (img) => {
        const signedImgUrl = await getSignedUrl(svc, 'documenti', img.storage_path, 3600)
        if (signedImgUrl) img.url = signedImgUrl
      })
    )
  }

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

      {/* Scheda di Fabbricazione — download on-demand, disponibile se esistono fasi */}
      {lavoroDettaglio.fasi.length > 0 && (
        <div style={{ padding: '0 20px 24px' }}>
          <a
            href={`/api/lavori/${id}/scheda-fabbricazione`}
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              height: 44,
              borderRadius: 12,
              background: 'var(--elv, #EDEDEA)',
              border: '1.5px solid var(--prs, #D4CFC9)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--t2, #4A3D33)',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
            aria-label="Scarica Scheda di Fabbricazione"
          >
            📄 Scarica Scheda di Fabbricazione
          </a>
        </div>
      )}
    </PageWrapper>
  )
}

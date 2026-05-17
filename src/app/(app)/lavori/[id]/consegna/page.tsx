import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ConsegnaButton } from '@/components/features/lavori/ConsegnaButton'
import { precheckMDR } from '@/lib/consegna/precheck'
import type { LavoroDettaglio } from '@/types/domain'

type PageProps = { params: Promise<{ id: string }> }

export default async function ConsegnaPage({ params }: PageProps) {
  const { id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) notFound()

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) notFound()

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
      partitario:lavori_partitario(*),
      ddc:dichiarazioni_conformita(*)
    `)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (error || !lavoro) notFound()

  const lavoroDettaglio = lavoro as unknown as LavoroDettaglio

  // Gate: CONSEGNA accessibile solo da stati consegnabili
  const STATI_CONSEGNABILI = ['pronto', 'in_ritardo'] as const
  if (!STATI_CONSEGNABILI.includes(lavoroDettaglio.stato as typeof STATI_CONSEGNABILI[number])) {
    redirect(`/lavori/${id}`)
  }

  const precheck = precheckMDR(lavoroDettaglio)
  const lavorazioniVuote = lavoroDettaglio.lavorazioni.length === 0
  const materialiVuoti = !lavoroDettaglio.materiali || lavoroDettaglio.materiali.length === 0

  return (
    <PageWrapper>
      <AppHeader
        title="Consegna"
        subtitle={lavoroDettaglio.numero_lavoro}
        backHref={`/lavori/${id}`}
      />

      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Card riepilogo — cosa succede al tap */}
        <div
          style={{
            background: 'var(--surface, #E4DFD9)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
          }}
        >
          <p
            style={{
              margin: '0 0 14px',
              color: 'var(--t1, #1C1916)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            Con un tap genereremo automaticamente:
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              'Dichiarazione di Conformità (DdC) — Allegato XIII MDR 2017/745',
              'Buono di consegna firmato',
              'FatturaPA in formato XML (pronta per SDI)',
              'Messaggio WhatsApp al dentista con link ai documenti',
            ].map((testo, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span
                  style={{
                    color: 'var(--success, #16A34A)',
                    fontSize: '18px',
                    flexShrink: 0,
                    lineHeight: 1.3,
                  }}
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span
                  style={{
                    color: 'var(--t2, #96918D)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    lineHeight: 1.5,
                  }}
                >
                  {testo}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Warning lavorazioni vuote */}
        {lavorazioniVuote && (
          <div
            role="alert"
            style={{
              background: 'hsl(30 100% 40% / 0.15)',
              border: '1px solid hsl(30 100% 55% / 0.4)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '18px', flexShrink: 0 }} aria-hidden="true">⚠️</span>
            <p
              style={{
                margin: 0,
                color: 'var(--amber, #FD7E14)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                lineHeight: 1.5,
              }}
            >
              Aggiungi almeno una lavorazione prima di consegnare
            </p>
          </div>
        )}

        {/* Warning materiali — non bloccante, ma raccomandata per MDR Allegato XIII §5 */}
        {materialiVuoti && (
          <div
            role="note"
            style={{
              background: 'hsl(43 65% 55% / 0.1)',
              border: '1px solid hsl(43 65% 55% / 0.35)',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }} aria-hidden="true">💡</span>
            <p style={{ margin: 0, color: 'var(--gold, #D4A843)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', lineHeight: 1.5 }}>
              Nessun lotto materiale registrato. Per la tracciabilità MDR (Allegato XIII §5) è raccomandato aggiungere i materiali usati nella tab Dati.
            </p>
          </div>
        )}

        {/* Errori precheck MDR */}
        {!precheck.ok && (
          <div
            role="alert"
            style={{
              background: 'hsl(0 95% 60% / 0.12)',
              border: '1px solid hsl(0 95% 60% / 0.35)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <p
              style={{
                margin: 0,
                color: 'var(--primary, #D90012)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Dati MDR incompleti — correggi prima di consegnare:
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {precheck.errori.map((err, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span
                    style={{
                      background: 'hsl(0 95% 60% / 0.2)',
                      color: 'var(--primary, #D90012)',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      padding: '1px 5px',
                      flexShrink: 0,
                      lineHeight: 1.8,
                    }}
                  >
                    §{err.elemento}
                  </span>
                  <Link
                    href={`/lavori/${id}?tab=${err.route}`}
                    style={{
                      color: 'var(--primary, #D90012)',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      textDecoration: 'underline',
                      textDecorationColor: 'hsl(0 95% 60% / 0.4)',
                      textUnderlineOffset: '2px',
                    }}
                  >
                    {err.descrizione}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ConsegnaButton — sempre visibile, la validazione definitiva è server-side */}
        <ConsegnaButton lavoroId={id} />

      </div>
    </PageWrapper>
  )
}

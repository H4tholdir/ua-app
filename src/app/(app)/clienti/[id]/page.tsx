import { notFound } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

type PageProps = { params: Promise<{ id: string }> }

type ClienteDettaglio = {
  id: string
  studio_nome: string | null
  nome: string
  cognome: string
  telefono: string | null
  email: string | null
  partita_iva: string | null
  codice_fiscale: string | null
  codice_sdi: string | null
  pec: string | null
  indirizzo: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  paese: string
  listino_numero: number
  sconto_percentuale: number
  modalita_pagamento: string | null
  non_soggetto_fe: boolean
  portale_token: string
  note: string | null
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 0' }}>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
          color: '#8899CC',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
          color: '#F0F4FF',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#1B2D6B',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
        marginBottom: '12px',
      }}
    >
      <h2
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          fontWeight: 600,
          color: '#8899CC',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          borderTop: '1px solid #243580',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default async function ClienteDettaglioPage({ params }: PageProps) {
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

  const { data: cliente, error } = await svc
    .from('clienti')
    .select(`
      id, studio_nome, nome, cognome, telefono, email,
      partita_iva, codice_fiscale, codice_sdi, pec,
      indirizzo, cap, citta, provincia, paese,
      listino_numero, sconto_percentuale, modalita_pagamento,
      non_soggetto_fe, portale_token, note
    `)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (error || !cliente) notFound()

  const c = cliente as unknown as ClienteDettaglio

  const nomeCompleto = `${c.cognome} ${c.nome}`
  const indirizzoCompleto = [c.indirizzo, c.cap, c.citta, c.provincia]
    .filter(Boolean)
    .join(', ') || null

  // Bottone modifica (placeholder — form in Fase 3)
  const modButton = (
    <button
      disabled
      aria-label="Modifica cliente — disponibile in Fase 3"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: '40px',
        minHeight: '52px',
        padding: '0 16px',
        borderRadius: '12px',
        background: '#243580',
        color: '#8899CC',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 600,
        fontSize: '14px',
        border: 'none',
        cursor: 'not-allowed',
        flexShrink: 0,
      }}
    >
      Modifica
    </button>
  )

  return (
    <PageWrapper>
      <AppHeader
        title={nomeCompleto}
        subtitle={c.studio_nome ?? undefined}
        backHref="/clienti"
        actions={modButton}
      />

      <div style={{ padding: '0 20px 32px' }}>
        {/* Anagrafica */}
        <SectionCard title="Anagrafica">
          <InfoRow label="Telefono" value={c.telefono} />
          <InfoRow label="Email" value={c.email} />
          <InfoRow label="Indirizzo" value={indirizzoCompleto} />
          <InfoRow label="Paese" value={c.paese !== 'IT' ? c.paese : null} />
        </SectionCard>

        {/* Dati fiscali */}
        <SectionCard title="Dati fiscali">
          <InfoRow label="Partita IVA" value={c.partita_iva} />
          <InfoRow label="Codice fiscale" value={c.codice_fiscale} />
          <InfoRow label="Codice SDI" value={c.codice_sdi} />
          <InfoRow label="PEC" value={c.pec} />
          {c.non_soggetto_fe && (
            <div style={{ padding: '10px 0' }}>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FD7E14',
                  background: 'hsl(28 100% 55% / 0.15)',
                  borderRadius: '6px',
                  padding: '3px 10px',
                }}
              >
                Non soggetto a fattura elettronica
              </span>
            </div>
          )}
        </SectionCard>

        {/* Commerciale */}
        <SectionCard title="Commerciale">
          <InfoRow label="Listino" value={`Listino ${c.listino_numero}`} />
          <InfoRow
            label="Sconto"
            value={c.sconto_percentuale > 0 ? `${c.sconto_percentuale}%` : null}
          />
          <InfoRow label="Modalità pagamento" value={c.modalita_pagamento} />
        </SectionCard>

        {/* Note */}
        {c.note && (
          <SectionCard title="Note">
            <div style={{ padding: '10px 0' }}>
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  color: '#F0F4FF',
                  margin: 0,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {c.note}
              </p>
            </div>
          </SectionCard>
        )}

        {/* Link portale */}
        <SectionCard title="Portale dentista">
          <div style={{ padding: '10px 0' }}>
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                color: '#8899CC',
                wordBreak: 'break-all',
              }}
            >
              /portale/{c.portale_token}
            </span>
          </div>
        </SectionCard>
      </div>
    </PageWrapper>
  )
}

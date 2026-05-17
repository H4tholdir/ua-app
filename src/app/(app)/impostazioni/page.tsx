import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

type LabRow = {
  id: string
  nome: string
  ragione_sociale: string | null
  partita_iva: string | null
  codice_fiscale: string | null
  indirizzo: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  telefono: string | null
  email: string | null
  pec: string | null
  logo_url: string | null
  logo_print_url: string | null
  firma_ddc_url: string | null
  codice_itca: string | null
  srn_eudamed: string | null
  prrc_nome: string | null
  prrc_qualifica: string | null
  pec_smtp_configurata: boolean
  piano: string
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '10px 0',
        borderBottom: '1px solid var(--elv, #EDEDEA)',
      }}
    >
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--t2, #96918D)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          color: value ? 'var(--t1, #1C1916)' : '#6677AA',
          fontStyle: value ? 'normal' : 'italic',
        }}
      >
        {value ?? 'Non compilato'}
      </span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface, #E4DFD9)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
        marginBottom: '12px',
      }}
    >
      <h2
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--t2, #96918D)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: '0 0 4px',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

export default async function ImpostazioniPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  const labId: string = utente?.laboratorio_id ?? ''

  let lab: LabRow | null = null
  if (labId) {
    const { data } = await svc
      .from('laboratori')
      .select(`
        id, nome, ragione_sociale, partita_iva, codice_fiscale,
        indirizzo, cap, citta, provincia, telefono, email, pec,
        logo_url, logo_print_url, firma_ddc_url,
        codice_itca, srn_eudamed,
        prrc_nome, prrc_qualifica,
        pec_smtp_configurata, piano
      `)
      .eq('id', labId)
      .single()
    lab = data as unknown as LabRow | null
  }

  if (!lab) redirect('/login?error=no_lab')

  const indirizzoCompleto = [lab.indirizzo, lab.cap, lab.citta, lab.provincia]
    .filter(Boolean)
    .join(', ') || null

  return (
    <PageWrapper>
      <AppHeader title="Impostazioni" />

      <div style={{ padding: '0 20px 32px' }}>
        {/* Sezione 1: Dati laboratorio */}
        <SectionCard title="Dati laboratorio">
          <InfoRow label="Nome" value={lab.nome} />
          <InfoRow label="Ragione sociale" value={lab.ragione_sociale} />
          <InfoRow label="Partita IVA" value={lab.partita_iva} />
          <InfoRow label="Codice fiscale" value={lab.codice_fiscale} />
          <InfoRow label="Indirizzo" value={indirizzoCompleto} />
          <InfoRow label="Telefono" value={lab.telefono} />
          <InfoRow label="Email" value={lab.email} />
          <InfoRow label="PEC" value={lab.pec} />
          <InfoRow label="Codice ITCA" value={lab.codice_itca} />
          <InfoRow label="SRN EUDAMED" value={lab.srn_eudamed} />
          <div style={{ padding: '10px 0' }}>
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--t2, #96918D)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Piano
            </span>
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#D4A843',
                  background: 'hsl(43 65% 55% / 0.15)',
                  borderRadius: '6px',
                  padding: '3px 10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {lab.piano}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Sezione 2: Documenti MDR */}
        <SectionCard title="Documenti MDR">
          <InfoRow label="PRRC — nome" value={lab.prrc_nome} />
          <InfoRow label="PRRC — qualifica" value={lab.prrc_qualifica} />
          <div
            style={{
              padding: '14px 0 4px',
            }}
          >
            <a
              href="/api/impostazioni/nomina-prrc"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '44px',
                padding: '0 18px',
                borderRadius: '10px',
                background: 'var(--elv, #EDEDEA)',
                color: 'var(--t2, #96918D)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
              }}
              aria-label="Genera Nomina PRRC — disponibile in Fase 3"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 12L4 4M4 4L7 7M4 4L1 7M12 4L12 12M12 12L9 9M12 12L15 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Genera Nomina PRRC
            </a>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                color: '#6677AA',
                margin: '6px 0 0',
              }}
            >
              Disponibile in Fase 3
            </p>
          </div>
        </SectionCard>

        {/* Sezione 3: PEC */}
        <SectionCard title="PEC">
          <InfoRow label="Indirizzo PEC" value={lab.pec} />
          <div style={{ padding: '10px 0' }}>
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--t2, #96918D)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              SMTP configurato
            </span>
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: lab.pec_smtp_configurata ? 'var(--success, #16A34A)' : 'var(--primary, #D90012)',
                  background: lab.pec_smtp_configurata
                    ? 'hsl(159 63% 49% / 0.15)'
                    : 'hsl(0 95% 64% / 0.15)',
                  borderRadius: '6px',
                  padding: '3px 10px',
                }}
              >
                {lab.pec_smtp_configurata ? 'Configurato' : 'Non configurato'}
              </span>
            </div>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                color: '#6677AA',
                margin: '6px 0 0',
              }}
            >
              La configurazione SMTP viene gestita dall&apos;amministratore UÀ.
            </p>
          </div>
        </SectionCard>

        {/* Sezione 4: Marchio */}
        <SectionCard title="Marchio">
          {lab.logo_url ? (
            <div style={{ padding: '10px 0', borderBottom: '1px solid var(--elv, #EDEDEA)' }}>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--t2, #96918D)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Logo (app)
              </span>
              <a
                href={lab.logo_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  color: '#D4A843',
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                }}
              >
                Visualizza file
              </a>
            </div>
          ) : (
            <InfoRow label="Logo (app)" value={null} />
          )}

          {lab.logo_print_url ? (
            <div style={{ padding: '10px 0', borderBottom: '1px solid var(--elv, #EDEDEA)' }}>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--t2, #96918D)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Logo (stampa)
              </span>
              <a
                href={lab.logo_print_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  color: '#D4A843',
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                }}
              >
                Visualizza file
              </a>
            </div>
          ) : (
            <InfoRow label="Logo (stampa)" value={null} />
          )}

          {lab.firma_ddc_url ? (
            <div style={{ padding: '10px 0' }}>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--t2, #96918D)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Firma DdC
              </span>
              <a
                href={lab.firma_ddc_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  color: '#D4A843',
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                }}
              >
                Visualizza file
              </a>
            </div>
          ) : (
            <InfoRow label="Firma DdC" value={null} />
          )}
        </SectionCard>
      </div>
    </PageWrapper>
  )
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ImpostazioniEditForm } from '@/components/features/impostazioni/ImpostazioniEditForm'
import { AttivaAccessoRapido } from '@/components/features/impostazioni/AttivaAccessoRapido'

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
  pec_verificata: boolean
  pec_verified_at: string | null
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
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--t2, #4A3D33)',
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
          color: value ? 'var(--t1, #1C1916)' : 'var(--t2, #4A3D33)',
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
        boxShadow: 'var(--sh-b, var(--sh-b))',
        marginBottom: '12px',
      }}
    >
      <h2
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--t2, #4A3D33)',
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
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login?error=no_lab')

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

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
        pec_smtp_configurata, pec_verificata, pec_verified_at, piano
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
        <ImpostazioniEditForm initialData={lab} />

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
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--t2, #4A3D33)',
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
                  color: 'var(--c-amber, #F59E0B)',
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
            {lab.prrc_nome ? (
              <a
                href="/api/impostazioni/nomina-prrc"
                download="NominaPRRC.pdf"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '44px',
                  padding: '0 18px',
                  borderRadius: '10px',
                  background: 'var(--primary, #D90012)',
                  color: '#fff',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none',
                  boxShadow: 'var(--sh-red)',
                }}
                aria-label="Scarica PDF Nomina PRRC"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 2v8M5 8l3 3 3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Scarica Nomina PRRC PDF
              </a>
            ) : (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--primary, #D90012)', margin: 0 }}>
                Configura nome e qualifica PRRC per scaricare la nomina
              </p>
            )}
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                color: 'var(--t3)',
                margin: '6px 0 0',
              }}
            >
              Documento MDR Art. 15 — atto formale nomina PRRC
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
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--t2, #4A3D33)',
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
            {lab.pec_verificata && (
              <div style={{ fontSize: '11px', color: 'var(--success, #16A34A)', fontFamily: 'DM Sans, sans-serif', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>✅</span> Verificata end-to-end
              </div>
            )}
            <Link href="/impostazioni/pec" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', marginTop: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--primary, #D90012)', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>
              {lab.pec_smtp_configurata ? 'Modifica configurazione PEC →' : 'Configura PEC →'}
            </Link>
          </div>
        </SectionCard>

        {/* Sezione Sicurezza (N14): ingresso manuale passkey, sempre disponibile */}
        <SectionCard title="Sicurezza">
          <AttivaAccessoRapido email={context.email ?? ''} />
        </SectionCard>

        {/* Sezione 4: Marchio */}
        <SectionCard title="Marchio">
          {lab.logo_url ? (
            <div style={{ padding: '10px 0', borderBottom: '1px solid var(--elv, #EDEDEA)' }}>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--t2, #4A3D33)',
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
                  color: 'var(--c-amber, #F59E0B)',
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
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--t2, #4A3D33)',
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
                  color: 'var(--c-amber, #F59E0B)',
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
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--t2, #4A3D33)',
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
                  color: 'var(--c-amber, #F59E0B)',
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

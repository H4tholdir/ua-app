import Link from 'next/link'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { StatoSDI } from '@/types/domain'
import { EmptyState } from '@/components/ui/EmptyState'
import { BatchFatturaSection } from '@/components/features/fatture/BatchFatturaSection'
import type { LavoroProntoFattura } from '@/components/features/fatture/BatchFatturaSection'

// ─── Colori badge per ogni stato SDI ─────────────────────────────────────────
const coloriStatoSDI: Record<StatoSDI, { bg: string; fg: string }> = {
  draft:          { bg: 'var(--prs, #D4CFC9)',       fg: 'var(--t2, #4A3D33)' },
  generata:       { bg: 'rgba(37,99,235,.12)',        fg: 'var(--info, #2563EB)' },
  smtp_inviata:   { bg: 'rgba(37,99,235,.12)',        fg: 'var(--info, #2563EB)' },
  pec_consegnata: { bg: 'rgba(37,99,235,.12)',        fg: 'var(--info, #2563EB)' },
  ricevuta_sdi:   { bg: 'rgba(37,99,235,.12)',        fg: 'var(--info, #2563EB)' },
  accettata:      { bg: 'rgba(22,163,74,.12)',        fg: 'var(--success, #16A34A)' },
  rifiutata:      { bg: 'rgba(217,0,18,.10)',         fg: 'var(--primary, #D90012)' },
  scaduta:        { bg: 'rgba(217,0,18,.10)',         fg: 'var(--primary, #D90012)' },
}

const labelStatoSDI: Record<StatoSDI, string> = {
  draft:          'Bozza',
  generata:       'XML Pronto',
  smtp_inviata:   'Inviata',
  pec_consegnata: 'Consegnata',
  ricevuta_sdi:   'Ricevuta SDI',
  accettata:      'Accettata',
  rifiutata:      'Rifiutata',
  scaduta:        'Scaduta',
}

// ─── Formato data italiana ────────────────────────────────────────────────────
function formatDataIT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Formato importo ─────────────────────────────────────────────────────────
function formatImporto(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)
}

// ─── Tipi ─────────────────────────────────────────────────────────────────────
interface FatturaRow {
  id: string
  numero: string
  data: string
  stato_sdi: StatoSDI
  imponibile: number
  totale: number
  bollo: number
  nome_file_xml: string | null
  inviata_via: 'pec' | 'sdi_coop' | null
  cliente: {
    id: string
    nome: string
    cognome: string
    studio_nome: string | null
  } | null
}

export default async function FatturePage() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user!.id)
    .single()

  const labId: string = utente?.laboratorio_id ?? ''

  // ── Carica fatture ─────────────────────────────────────────────────────────
  let fatture: FatturaRow[] = []
  let lavoriPronti: LavoroProntoFattura[] = []

  if (labId) {
    const [fattureResult, lavoriResult] = await Promise.all([
      svc
        .from('fatture')
        .select(
          `
          id,
          numero,
          data,
          stato_sdi,
          imponibile,
          totale,
          bollo,
          nome_file_xml,
          inviata_via,
          cliente:clienti(id, nome, cognome, studio_nome)
        `
        )
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .order('data', { ascending: false })
        .limit(100),
      svc
        .from('lavori')
        .select('id, numero_lavoro, prezzo_unitario, data_consegna_effettiva, cliente:clienti(id, nome, cognome, studio_nome)')
        .eq('laboratorio_id', labId)
        .eq('stato', 'consegnato')
        .eq('incluso_in_fattura', false)
        .is('deleted_at', null)
        .order('data_consegna_effettiva', { ascending: false })
        .limit(50),
    ])

    fatture = (fattureResult.data ?? []) as unknown as FatturaRow[]
    lavoriPronti = (lavoriResult.data ?? []) as unknown as LavoroProntoFattura[]
  }

  return (
    <PageWrapper>
      <AppHeader title="Fatture" />

      {/* Toolbar: export CSV per commercialista */}
      <div style={{ padding: '0 20px 8px', display: 'flex', justifyContent: 'flex-end' }}>
        <a
          href={`/api/fatture/export?year=${new Date().getFullYear()}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: 'var(--sfc, #E4DFD9)',
            border: '1px solid var(--prs, #D4CFC9)',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            color: 'var(--t1, #1C1916)',
            fontFamily: 'DM Sans, sans-serif',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.72), 0 1px 3px rgba(148,128,118,.20)',
          }}
        >
          ⬇ Esporta CSV {new Date().getFullYear()}
        </a>
      </div>

      {/* Info banner generazione automatica — BUG #11 */}
      <div style={{ padding: '0 20px 12px' }}>
        <div
          role="note"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: 'var(--elv, #EDEDEA)',
            borderRadius: '14px',
            padding: '12px 14px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: '1px', color: 'var(--c-amber, #F59E0B)' }}
          >
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--t2, #4A3D33)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Le fatture vengono generate automaticamente.{' '}
            <Link
              href="/lavori"
              style={{
                color: 'var(--primary, #D90012)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Vai su un lavoro → Consegna
            </Link>{' '}
            per generare la fattura.
          </p>
        </div>
      </div>

      {/* Lavori pronti da fatturare — batch action */}
      <BatchFatturaSection lavoriPronti={lavoriPronti} />

      {/* Lista fatture */}
      <section style={{ padding: '0 20px' }}>
        {fatture.length === 0 ? (
          <EmptyState
            icon="💳"
            title="Nessuna fattura ancora"
            description="Le fatture vengono create automaticamente quando consegni un lavoro."
          />
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {fatture.map((fattura) => {
              const clienteNome = fattura.cliente
                ? fattura.cliente.studio_nome ??
                  `${fattura.cliente.nome} ${fattura.cliente.cognome}`
                : '—'

              // Normalizza stato SDI — gestisce valori DB legacy
              const statoKey: StatoSDI =
                (fattura.stato_sdi in coloriStatoSDI)
                  ? fattura.stato_sdi
                  : 'draft'

              const colore = coloriStatoSDI[statoKey]
              const label = labelStatoSDI[statoKey]

              return (
                <li key={fattura.id}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'var(--surface, #E4DFD9)',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      boxShadow:
                        'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Riga 1: numero fattura + badge stato */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: 'var(--t1, #1C1916)',
                          }}
                        >
                          N. {fattura.numero}
                        </span>

                        {/* Badge stato SDI */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '24px',
                            padding: '0 10px',
                            borderRadius: '100px',
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                            background: colore.bg,
                            color: colore.fg,
                            flexShrink: 0,
                          }}
                        >
                          {label}
                        </span>
                      </div>

                      {/* Riga 2: cliente */}
                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: 'var(--t1, #1C1916)',
                          margin: '0 0 4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {clienteNome}
                      </p>

                      {/* Riga 3: data + totale */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <time
                          dateTime={fattura.data}
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '12px',
                            color: 'var(--t2, #4A3D33)',
                          }}
                        >
                          {formatDataIT(fattura.data)}
                        </time>

                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--c-amber, #F59E0B)',
                          }}
                        >
                          {formatImporto(fattura.totale)}
                          {fattura.bollo > 0 && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'var(--t2, #4A3D33)',
                                marginLeft: '4px',
                              }}
                            >
                              + bollo
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Riga 4: canale invio (se disponibile) */}
                      {fattura.inviata_via && (
                        <p
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '11px',
                            color: 'var(--t2, #4A3D33)',
                            margin: '4px 0 0',
                          }}
                        >
                          Inviata via {fattura.inviata_via === 'pec' ? 'PEC' : 'SDI-Coop'}
                          {fattura.nome_file_xml && ` · ${fattura.nome_file_xml}`}
                        </p>
                      )}
                    </div>

                    {/* Indicatore XML presente */}
                    {fattura.nome_file_xml && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-label="XML generato"
                        role="img"
                        style={{ flexShrink: 0, color: 'var(--info, #2563EB)' }}
                      >
                        <path
                          d="M13 2H6L3 5v9h10V2z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 2v3H3"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 9l1.5 1.5L6 12M10 9l-1.5 1.5L10 12"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </PageWrapper>
  )
}

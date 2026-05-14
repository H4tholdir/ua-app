import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { StatoSDI } from '@/types/domain'

// ─── Colori badge per ogni stato SDI ─────────────────────────────────────────
const coloriStatoSDI: Record<StatoSDI, { bg: string; fg: string }> = {
  draft:          { bg: '#243580', fg: '#8899CC' },
  generata:       { bg: '#1E3A5F', fg: '#74C0FC' },
  smtp_inviata:   { bg: '#1B3A4B', fg: '#66D9E8' },
  pec_consegnata: { bg: '#1B3B3B', fg: '#38D9A9' },
  ricevuta_sdi:   { bg: '#2C2A4A', fg: '#CC5DE8' },
  accettata:      { bg: '#1A3A2A', fg: '#2ECC9A' },
  rifiutata:      { bg: '#3A1A1A', fg: '#FA5252' },
  scaduta:        { bg: '#3A2A1A', fg: '#FD7E14' },
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

  if (labId) {
    const { data } = await svc
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
      .limit(100)

    fatture = (data ?? []) as unknown as FatturaRow[]
  }

  return (
    <PageWrapper>
      <AppHeader title="Fatture" />

      {/* Lista fatture */}
      <section style={{ padding: '0 20px' }}>
        {fatture.length === 0 ? (
          <div
            style={{
              background: '#1B2D6B',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              boxShadow:
                '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
            }}
          >
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                color: '#8899CC',
                margin: 0,
              }}
            >
              Nessuna fattura trovata
            </p>
          </div>
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
                      background: '#1B2D6B',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      boxShadow:
                        '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
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
                            color: '#F0F4FF',
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
                          color: '#F0F4FF',
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
                            color: '#8899CC',
                          }}
                        >
                          {formatDataIT(fattura.data)}
                        </time>

                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#D4A843',
                          }}
                        >
                          {formatImporto(fattura.totale)}
                          {fattura.bollo > 0 && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                color: '#8899CC',
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
                            color: '#6677AA',
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
                        style={{ flexShrink: 0, color: '#74C0FC' }}
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

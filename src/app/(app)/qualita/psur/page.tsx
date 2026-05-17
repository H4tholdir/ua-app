import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'
import type { Psur } from '@/types/domain'

export const metadata = { title: 'PSUR — Qualita MDR' }

// ─── Helpers ─────────────────────────────────────────────────

function formatDataIT(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const STATO_LABEL: Record<Psur['stato'], string> = {
  bozza: 'Bozza',
  completato: 'Completato',
  firmato: 'Firmato',
}

const STATO_COLOR: Record<Psur['stato'], string> = {
  bozza: '#D4A843',
  completato: 'var(--t2, #96918D)',
  firmato: 'var(--success, #16A34A)',
}

const STATO_BG: Record<Psur['stato'], string> = {
  bozza: 'hsl(43 65% 55% / 0.12)',
  completato: 'hsl(220 50% 65% / 0.12)',
  firmato: 'hsl(159 63% 49% / 0.12)',
}

// ─── Page ─────────────────────────────────────────────────────

export default async function PsurPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) return null

  const { data: psurList } = await svc
    .from('psur')
    .select(
      'id, anno_riferimento, periodo_inizio, periodo_fine, totale_dispositivi, totale_non_conformita, totale_incidenti, totale_reclami, totale_rifacimenti, stato, pdf_url, firmato_at, prrc_nome_snapshot'
    )
    .eq('laboratorio_id', utente.laboratorio_id)
    .order('anno_riferimento', { ascending: false })

  const annoCorrente = new Date().getFullYear()
  const annoRendiconto = annoCorrente - 1
  const hasCurrentPsur = psurList?.some((p) => p.anno_riferimento === annoRendiconto)

  const fontFamily = "'DM Sans', system-ui, sans-serif"

  return (
    <PageWrapper>
      <AppHeader
        title="PSUR"
        subtitle="Periodic Safety Update Report — MDR Art. 86"
        backHref="/qualita"
      />

      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Link back */}
        <Link
          href="/qualita"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--t2, #96918D)',
            fontSize: '13px',
            textDecoration: 'none',
            fontFamily,
            marginBottom: '4px',
          }}
        >
          ← Qualita
        </Link>

        {/* Alert MDR: PSUR mancante per anno corrente-1 */}
        {!hasCurrentPsur && (
          <div
            role="alert"
            style={{
              background: '#261500',
              borderRadius: '12px',
              padding: '14px 16px',
              borderLeft: '3px solid #FD7E14',
            }}
          >
            <p style={{
              color: '#FD7E14',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily,
              margin: '0 0 4px',
            }}>
              PSUR {annoRendiconto} mancante
            </p>
            <p style={{
              color: '#C88040',
              fontSize: '13px',
              fontFamily,
              margin: '0 0 12px',
              lineHeight: '1.5',
            }}>
              MDR Art. 86 obbliga i fabbricanti a produrre il PSUR almeno annualmente.
              Genera il report per l&apos;anno {annoRendiconto}.
            </p>
            <form action="/api/qualita/psur" method="POST">
              <input type="hidden" name="anno_riferimento" value={annoRendiconto} />
              <button
                type="submit"
                style={{
                  height: '40px',
                  padding: '0 18px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#D4A843',
                  color: 'var(--t1, #1C1916)',
                  fontFamily,
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                Genera PSUR {annoRendiconto}
              </button>
            </form>
          </div>
        )}

        {/* Lista PSUR */}
        {(!psurList || psurList.length === 0) ? (
          <div style={{
            background: 'var(--surface, #E4DFD9)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
          }}>
            <p style={{
              color: 'var(--t2, #96918D)',
              fontSize: '14px',
              fontFamily,
              margin: 0,
            }}>
              Nessun PSUR generato
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {psurList.map((p) => (
              <div
                key={p.id}
                style={{
                  background: 'var(--surface, #E4DFD9)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
                }}
              >
                {/* Riga header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}>
                  <span style={{
                    color: 'var(--t1, #1C1916)',
                    fontSize: '17px',
                    fontWeight: 700,
                    fontFamily,
                  }}>
                    PSUR {p.anno_riferimento}
                  </span>
                  <span style={{
                    color: STATO_COLOR[p.stato as Psur['stato']],
                    background: STATO_BG[p.stato as Psur['stato']],
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily,
                    padding: '3px 10px',
                    borderRadius: '100px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {STATO_LABEL[p.stato as Psur['stato']]}
                  </span>
                </div>

                {/* Periodo */}
                <p style={{
                  color: 'var(--t2, #96918D)',
                  fontSize: '13px',
                  fontFamily,
                  margin: '0 0 10px',
                }}>
                  {formatDataIT(p.periodo_inizio)} — {formatDataIT(p.periodo_fine)}
                </p>

                {/* Aggregati */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  <KpiChip label="Dispositivi" value={p.totale_dispositivi} />
                  <KpiChip label="Non conformita" value={p.totale_non_conformita} alert={p.totale_non_conformita > 0} />
                  <KpiChip label="Incidenti" value={p.totale_incidenti} alert={p.totale_incidenti > 0} />
                  <KpiChip label="Rifacimenti" value={p.totale_rifacimenti} alert={p.totale_rifacimenti > 0} />
                </div>

                {/* PRRC snapshot */}
                {p.prrc_nome_snapshot && (
                  <p style={{
                    color: '#6677AA',
                    fontSize: '12px',
                    fontFamily,
                    margin: '0 0 10px',
                  }}>
                    PRRC: {p.prrc_nome_snapshot}
                    {p.firmato_at ? ` — firmato il ${formatDataIT(p.firmato_at.slice(0, 10))}` : ''}
                  </p>
                )}

                {/* Link PDF */}
                {p.pdf_url ? (
                  <a
                    href={p.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#D4A843',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontFamily,
                      textDecoration: 'none',
                    }}
                  >
                    Scarica PDF →
                  </a>
                ) : (
                  <span style={{
                    color: '#6677AA',
                    fontSize: '12px',
                    fontFamily,
                    fontStyle: 'italic',
                  }}>
                    PDF non ancora generato
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pulsante genera anno corrente-1 se non presente */}
        {hasCurrentPsur && (
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <p style={{
              color: '#6677AA',
              fontSize: '12px',
              fontFamily,
              margin: '0 0 4px',
            }}>
              Anno {annoRendiconto}: PSUR gia presente
            </p>
          </div>
        )}

      </div>
    </PageWrapper>
  )
}

// ─── KPI Chip ─────────────────────────────────────────────────

function KpiChip({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  const fontFamily = "'DM Sans', system-ui, sans-serif"
  return (
    <div style={{
      background: 'var(--elv, #EDEDEA)',
      borderRadius: '8px',
      padding: '6px 10px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minWidth: '70px',
    }}>
      <span style={{
        color: alert && value > 0 ? 'var(--primary, #D90012)' : 'var(--t1, #1C1916)',
        fontSize: '16px',
        fontWeight: 700,
        fontFamily,
      }}>
        {value}
      </span>
      <span style={{
        color: '#6677AA',
        fontSize: '10px',
        fontFamily,
        textAlign: 'center',
        lineHeight: '1.2',
      }}>
        {label}
      </span>
    </div>
  )
}

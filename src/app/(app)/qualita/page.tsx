import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'

export const metadata = { title: 'Qualita MDR' }

// ─── Helpers ─────────────────────────────────────────────────

function formatDataIT(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const gravitaColor: Record<string, string> = {
  lieve:    'var(--gold, #D4A843)',
  moderata: 'var(--amber, #FD7E14)',
  grave:    'var(--primary, #D90012)',
  critica:  'var(--primary, #D90012)',
}

// ─── Page ─────────────────────────────────────────────────────

export default async function QualitaPage() {
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
  const labId = utente.laboratorio_id

  // ─── Sezione 1: Non Conformita Recenti ──────────────────────
  const { data: nc } = await svc
    .from('lavori_fasi')
    .select(
      'id, lavoro_id, azione_correttiva, created_at, lavoro:lavori(numero_lavoro), fase:fasi_produzione(descrizione)'
    )
    .eq('laboratorio_id', labId)
    .eq('non_conforme', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  // ─── Sezione 2: Analisi Rischi per Tipo Dispositivo ─────────
  const { data: rischi } = await svc
    .from('rischi_tipo_dispositivo')
    .select('tipo_dispositivo, data_ultima_revisione, versione, rischi_json')
    .eq('laboratorio_id', labId)
    .order('tipo_dispositivo')

  // ─── Sezione 3: Incidenti MDR ───────────────────────────────
  const { data: incidenti } = await svc
    .from('incidenti_mdr')
    .select('id, tipo, gravita, data_evento, descrizione, risolto, segnalato_ministero')
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .order('data_evento', { ascending: false })
    .limit(10)

  return (
    <PageWrapper>
      <AppHeader title="Qualita MDR" subtitle="Non conformita, rischi e incidenti" />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* ─── Sezione 1: Non Conformita ─────────────────────── */}
        <section>
          <h2 style={{
            color: 'var(--t1, #1C1916)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '12px',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>
            Non Conformita Recenti
          </h2>

          {(!nc || nc.length === 0) ? (
            <div style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '12px',
              padding: '20px',
              color: 'var(--success, #16A34A)',
              fontSize: '14px',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              textAlign: 'center',
            }}>
              Nessuna non conformita registrata
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {nc.map((item) => {
                const lavoro = Array.isArray(item.lavoro) ? item.lavoro[0] : item.lavoro
                const fase = Array.isArray(item.fase) ? item.fase[0] : item.fase
                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(217, 0, 18, 0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid rgba(217, 0, 18, 0.28)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '6px',
                    }}>
                      <span style={{
                        color: 'var(--t1, #1C1916)',
                        fontSize: '14px',
                        fontWeight: 600,
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}>
                        {lavoro?.numero_lavoro ?? 'Lavoro sconosciuto'}
                      </span>
                      <span style={{
                        color: 'var(--t2, #4A3D33)',
                        fontSize: '12px',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}>
                        {formatDataIT(item.created_at)}
                      </span>
                    </div>
                    {fase?.descrizione && (
                      <div style={{
                        color: 'var(--t2, #4A3D33)',
                        fontSize: '13px',
                        marginBottom: '4px',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}>
                        Fase: {fase.descrizione}
                      </div>
                    )}
                    {item.azione_correttiva && (
                      <div style={{
                        color: 'var(--c-amber, #F59E0B)',
                        fontSize: '13px',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}>
                        Azione: {item.azione_correttiva}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ─── Sezione 2: Analisi Rischi ─────────────────────── */}
        <section>
          <h2 style={{
            color: 'var(--t1, #1C1916)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '12px',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>
            Analisi Rischi per Tipo Dispositivo
          </h2>

          {(!rischi || rischi.length === 0) ? (
            <div style={{
              background: 'rgba(253, 126, 20, 0.10)',
              borderRadius: '12px',
              padding: '16px 20px',
              border: '1px solid rgba(253, 126, 20, 0.4)',
              color: 'var(--amber, #FD7E14)',
              fontSize: '14px',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}>
              Nessuna analisi rischi configurata — obbligatoria per fascicolo MDR
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rischi.map((r) => {
                const rischiList = Array.isArray(r.rischi_json) ? r.rischi_json : []
                return (
                  <div
                    key={r.tipo_dispositivo}
                    style={{
                      background: 'var(--surface, #E4DFD9)',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{
                        color: 'var(--t1, #1C1916)',
                        fontSize: '15px',
                        fontWeight: 600,
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}>
                        {r.tipo_dispositivo}
                      </span>
                      <span style={{
                        color: 'var(--t2, #4A3D33)',
                        fontSize: '12px',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}>
                        v{r.versione}
                      </span>
                    </div>
                    <div style={{
                      marginTop: '6px',
                      display: 'flex',
                      gap: '16px',
                      color: 'var(--t2, #4A3D33)',
                      fontSize: '13px',
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                    }}>
                      <span>Revisione: {formatDataIT(r.data_ultima_revisione)}</span>
                      <span>{rischiList.length} rischi identificati</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ─── Sezione 3: Incidenti MDR ──────────────────────── */}
        <section>
          <h2 style={{
            color: 'var(--t1, #1C1916)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '12px',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>
            Incidenti MDR
          </h2>

          {(!incidenti || incidenti.length === 0) ? (
            <div style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '12px',
              padding: '20px',
              color: 'var(--success, #16A34A)',
              fontSize: '14px',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              textAlign: 'center',
            }}>
              Nessun incidente registrato
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {incidenti.map((inc) => {
                const isGrave = inc.gravita === 'grave' || inc.gravita === 'critica'
                return (
                  <div
                    key={inc.id}
                    style={{
                      background: isGrave ? 'rgba(217,0,18,0.10)' : 'var(--surface, #E4DFD9)',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: `inset 0 0 0 1px ${gravitaColor[inc.gravita] ?? 'var(--t2, #4A3D33)'}40`,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '6px',
                    }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          color: gravitaColor[inc.gravita] ?? 'var(--t1, #1C1916)',
                          fontSize: '13px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                        }}>
                          {inc.gravita}
                        </span>
                        <span style={{
                          color: 'var(--t2, #4A3D33)',
                          fontSize: '13px',
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                        }}>
                          {inc.tipo.replace('_', ' ')}
                        </span>
                        {inc.segnalato_ministero && (
                          <span style={{
                            background: 'rgba(27,45,107,0.15)',
                            color: 'var(--cobalt, #1B2D6B)',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '100px',
                            fontFamily: "'DM Sans', system-ui, sans-serif",
                          }}>
                            Segnalato Ministero
                          </span>
                        )}
                        {inc.risolto && (
                          <span style={{
                            background: 'rgba(22,163,74,0.15)',
                            color: 'var(--success, #16A34A)',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '100px',
                            fontFamily: "'DM Sans', system-ui, sans-serif",
                          }}>
                            Risolto
                          </span>
                        )}
                      </div>
                      <span style={{
                        color: 'var(--t2, #4A3D33)',
                        fontSize: '12px',
                        flexShrink: 0,
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                      }}>
                        {formatDataIT(inc.data_evento)}
                      </span>
                    </div>
                    <p style={{
                      color: 'var(--t2, #4A3D33)',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      margin: 0,
                    }}>
                      {inc.descrizione}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <Link
              href="/qualita/psur"
              style={{
                color: 'var(--c-amber, #F59E0B)',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              PSUR &rarr;
            </Link>
          </div>
        </section>

      </div>
    </PageWrapper>
  )
}

import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'

export const metadata = { title: 'Rete Multi-Sede' }

// ─── Helpers ─────────────────────────────────────────────────

const PIANO_LABEL: Record<string, string> = {
  freemium: 'Freemium',
  solo: 'Solo',
  lab: 'Lab',
  studio: 'Studio',
}

const PIANO_COLOR: Record<string, string> = {
  freemium: 'var(--t2, #96918D)',
  solo: 'var(--t2, #96918D)',
  lab: '#D4A843',
  studio: 'var(--success, #16A34A)',
}

// ─── Page ─────────────────────────────────────────────────────

export default async function RetePage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) return null
  const labId = utente.laboratorio_id

  const fontFamily = "'DM Sans', system-ui, sans-serif"

  // Solo titolare e admin_rete hanno accesso alla funzionalita rete
  const isAdminRete = utente.ruolo === 'admin_rete' || utente.ruolo === 'titolare'

  if (!isAdminRete) {
    return (
      <PageWrapper>
        <AppHeader title="Rete Multi-Sede" />
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              margin: '0 0 6px',
            }}>
              Nessuna rete configurata.
            </p>
            <p style={{
              color: '#6677AA',
              fontSize: '13px',
              fontFamily,
              margin: 0,
            }}>
              Piano UA Rete richiesto. Contatta il supporto per attivare la funzionalita multi-sede.
            </p>
          </div>
        </div>
      </PageWrapper>
    )
  }

  // Carica reti admin
  const { data: retiAdmin } = await svc
    .from('reti')
    .select('id, nome, admin_laboratorio_id, created_at')
    .eq('admin_laboratorio_id', labId)
    .order('created_at', { ascending: false })

  // Per ogni rete, carica i membri con dati del laboratorio
  const retiConMembri: Array<{
    id: string
    nome: string
    membri: Array<{
      laboratorio_id: string
      ruolo: string
      joined_at: string
      lab: { id: string; nome: string; citta: string | null; piano: string } | null
    }>
  }> = []

  for (const rete of retiAdmin ?? []) {
    const { data: membri } = await svc
      .from('reti_membri')
      .select('laboratorio_id, ruolo, joined_at')
      .eq('rete_id', rete.id)

    const membriConLab = await Promise.all(
      (membri ?? []).map(async (m) => {
        const { data: labData } = await svc
          .from('laboratori')
          .select('id, nome, citta, piano')
          .eq('id', m.laboratorio_id)
          .single()
        return { ...m, lab: labData ?? null }
      })
    )

    retiConMembri.push({ id: rete.id, nome: rete.nome, membri: membriConLab })
  }

  return (
    <PageWrapper>
      <AppHeader title="Rete Multi-Sede" subtitle="Gestione laboratori collegati" />

      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {(!retiConMembri || retiConMembri.length === 0) ? (
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
              margin: '0 0 6px',
            }}>
              Nessuna rete configurata
            </p>
            <p style={{
              color: '#6677AA',
              fontSize: '13px',
              fontFamily,
              margin: '0 0 16px',
            }}>
              Crea la prima rete multi-sede per collegare piu laboratori.
            </p>
            <Link
              href="/rete/nuova"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '44px',
                padding: '0 20px',
                borderRadius: '10px',
                background: 'var(--primary, #D90012)',
                color: '#fff',
                fontFamily,
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Crea rete
            </Link>
          </div>
        ) : (
          <>
            {retiConMembri.map((rete) => (
              <div
                key={rete.id}
                style={{
                  background: 'var(--surface, #E4DFD9)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
                }}
              >
                {/* Header rete */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}>
                  <h3 style={{
                    color: 'var(--t1, #1C1916)',
                    fontSize: '16px',
                    fontWeight: 700,
                    fontFamily,
                    margin: 0,
                  }}>
                    {rete.nome}
                  </h3>
                  <span style={{
                    color: '#D4A843',
                    background: 'hsl(43 65% 55% / 0.12)',
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily,
                    padding: '2px 8px',
                    borderRadius: '100px',
                  }}>
                    {rete.membri.length} {rete.membri.length === 1 ? 'sede' : 'sedi'}
                  </span>
                </div>

                {/* Lista membri */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {rete.membri.map((m) => (
                    <div
                      key={m.laboratorio_id}
                      style={{
                        background: 'var(--elv, #EDEDEA)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <p style={{
                          color: 'var(--t1, #1C1916)',
                          fontSize: '14px',
                          fontWeight: 600,
                          fontFamily,
                          margin: '0 0 2px',
                        }}>
                          {m.lab?.nome ?? 'Laboratorio sconosciuto'}
                        </p>
                        {m.lab?.citta && (
                          <p style={{
                            color: 'var(--t2, #96918D)',
                            fontSize: '12px',
                            fontFamily,
                            margin: 0,
                          }}>
                            {m.lab.citta}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        {m.lab?.piano && (
                          <span style={{
                            color: PIANO_COLOR[m.lab.piano] ?? 'var(--t2, #96918D)',
                            fontSize: '13px',
                            fontWeight: 700,
                            fontFamily,
                            background: 'rgba(255,255,255,0.05)',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                          }}>
                            {PIANO_LABEL[m.lab.piano] ?? m.lab.piano}
                          </span>
                        )}
                        {m.ruolo === 'admin_rete' && (
                          <span style={{
                            color: 'var(--success, #16A34A)',
                            fontSize: '13px',
                            fontFamily,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Link gestisci */}
                <Link
                  href={`/rete/${rete.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--t2, #96918D)',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontFamily,
                    padding: '6px 12px',
                    background: 'var(--elv, #EDEDEA)',
                    borderRadius: '8px',
                  }}
                >
                  Gestisci rete →
                </Link>
              </div>
            ))}
          </>
        )}

      </div>
    </PageWrapper>
  )
}

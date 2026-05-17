import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

type VoceRow = {
  id: string
  codice: string
  nome: string
  descrizione: string | null
  categoria: string
  prezzo_1: number | null
  unita_misura: string
}

function formatPrezzo(prezzo: number | null): string {
  if (prezzo == null) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(prezzo)
}

export default async function ListinoPage() {
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

  let voci: VoceRow[] = []
  if (labId) {
    const { data } = await svc
      .from('listino')
      .select('id, codice, nome, descrizione, categoria, prezzo_1, unita_misura')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .order('categoria', { ascending: true })
      .order('nome', { ascending: true })
      .limit(1000)
    voci = (data ?? []) as VoceRow[]
  }

  // Raggruppa per categoria
  const perCategoria = voci.reduce<Record<string, VoceRow[]>>((acc, voce) => {
    const cat = voce.categoria || 'Altro'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(voce)
    return acc
  }, {})

  const categorie = Object.keys(perCategoria).sort()

  const addButton = (
    <Link
      href="/listino/nuovo"
      aria-label="Nuova voce listino"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: '40px',
        minHeight: '52px',
        padding: '0 16px',
        borderRadius: '12px',
        background: 'var(--primary, #D90012)',
        color: '#fff',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 700,
        fontSize: '14px',
        textDecoration: 'none',
        boxShadow: '0 0 16px rgba(0,0,0,.12)',
        flexShrink: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Nuova voce
    </Link>
  )

  return (
    <PageWrapper>
      <AppHeader title="Listino" actions={addButton} />

      <div style={{ padding: '0 20px 32px' }}>
        {voci.length === 0 ? (
          <div
            style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
            }}
          >
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                color: 'var(--t2, #96918D)',
                margin: 0,
              }}
            >
              Nessuna voce nel listino
            </p>
          </div>
        ) : (
          categorie.map((categoria) => (
            <section key={categoria} style={{ marginBottom: '20px' }}>
              <h2
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--t2, #96918D)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '0 0 8px',
                }}
              >
                {categoria}
              </h2>

              <div
                style={{
                  background: 'var(--surface, #E4DFD9)',
                  borderRadius: '16px',
                  boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
                  overflow: 'hidden',
                }}
              >
                {perCategoria[categoria].map((voce, idx) => (
                  <div
                    key={voce.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderTop: idx > 0 ? '1px solid var(--elv, #EDEDEA)' : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '8px',
                          marginBottom: '2px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#6677AA',
                          }}
                        >
                          {voce.codice}
                        </span>
                        <p
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'var(--t1, #1C1916)',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {voce.nome}
                        </p>
                      </div>
                      {voce.descrizione && (
                        <p
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '12px',
                            color: 'var(--t2, #96918D)',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {voce.descrizione}
                        </p>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span
                        style={{
                          fontFamily: 'Playfair Display, serif',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#D4A843',
                        }}
                      >
                        {formatPrezzo(voce.prezzo_1)}
                      </span>
                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '11px',
                          color: '#6677AA',
                          margin: 0,
                        }}
                      >
                        /{voce.unita_misura}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </PageWrapper>
  )
}

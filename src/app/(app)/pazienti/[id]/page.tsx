import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PazienteArchiviaButton } from '@/components/features/pazienti/PazienteArchiviaButton'

interface Props { params: Promise<{ id: string }> }

export default async function PazienteDetailPage({ params }: Props) {
  const { id } = await params
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id, ruolo').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: paziente } = await svc
    .from('pazienti')
    .select('id, nome_cognome, codice_paziente, note, created_at')
    .eq('id', id).eq('laboratorio_id', utente.laboratorio_id).single()

  if (!paziente) redirect('/pazienti')

  const canEdit = utente.ruolo === 'titolare' || utente.ruolo === 'admin_rete'

  const { data: lavori } = await svc
    .from('lavori')
    .select('id, numero_lavoro, stato, tipo_dispositivo, data_consegna_prevista, clienti(studio_nome, nome, cognome)')
    .eq('paziente_id', id).eq('laboratorio_id', utente.laboratorio_id).is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(50)

  const p = paziente as Record<string, unknown>
  const card: React.CSSProperties = {
    background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
    marginBottom: '12px',
  }

  return (
    <>
      <AppHeader title={p.nome_cognome as string ?? 'Paziente'} backHref="/pazienti" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px' }}>
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', fontFamily: 'DM Sans, sans-serif' }}>Dati paziente</div>
            {typeof p.codice_paziente === 'string' && (
              <div style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'monospace', marginBottom: '4px' }}>
                Cod. paziente: {p.codice_paziente}
              </div>
            )}
            {typeof p.note === 'string' && <div style={{ fontSize: '13px', color: 'var(--t2)', marginTop: '8px', fontFamily: 'DM Sans, sans-serif' }}>{p.note}</div>}
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '16px 0 8px', fontFamily: 'DM Sans, sans-serif' }}>
            Lavori ({lavori?.length ?? 0})
          </div>
          {(lavori ?? []).map((l) => {
            const lv = l as Record<string, unknown>
            const cliente = lv.clienti as Record<string, string | null> | null
            return (
              <a key={lv.id as string} href={`/lavori/${lv.id as string}`} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
                    #{lv.numero_lavoro as string} · {lv.tipo_dispositivo as string}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '2px', fontFamily: 'DM Sans, sans-serif' }}>
                    {cliente?.studio_nome ?? `${cliente?.nome ?? ''} ${cliente?.cognome ?? ''}`.trim()}
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                  background: lv.stato === 'consegnato' ? 'rgba(22,163,74,.1)' : 'rgba(148,145,141,.1)',
                  color: lv.stato === 'consegnato' ? '#16A34A' : 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>
                  {lv.stato as string}
                </span>
              </a>
            )
          })}
          {(!lavori || lavori.length === 0) && (
            <div style={{ ...card, color: 'var(--t3)', fontSize: '13px', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
              Nessun lavoro trovato per questo paziente.
            </div>
          )}

          {/* Archivia paziente — solo titolare/admin_rete */}
          {canEdit && (
            <div style={{ marginTop: '20px' }}>
              <PazienteArchiviaButton
                pazienteId={paziente.id}
                pazienteNome={paziente.nome_cognome}
              />
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}

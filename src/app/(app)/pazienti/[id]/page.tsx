import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PazienteArchiviaButton } from '@/components/features/pazienti/PazienteArchiviaButton'
import { PazienteEditSheet } from '@/components/features/pazienti/PazienteEditSheet'

interface Props { params: Promise<{ id: string }> }

export default async function PazienteDetailPage({ params }: Props) {
  const { id } = await params
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login?error=no_lab')

  const svc = getServiceClient()
  const { data: paziente } = await svc
    .from('pazienti')
    .select('id, nome_cognome, codice_paziente, note, anamnesi, asl, sesso, data_nascita, created_at')
    .eq('id', id).eq('laboratorio_id', context.laboratorioId).single()

  if (!paziente) redirect('/pazienti')

  const canEdit = context.ruolo === 'titolare' || context.ruolo === 'admin_rete'

  const { data: lavori } = await svc
    .from('lavori')
    .select('id, numero_lavoro, stato, tipo_dispositivo, data_consegna_prevista, clienti(studio_nome, nome, cognome)')
    .eq('paziente_id', id).eq('laboratorio_id', context.laboratorioId).is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(50)

  const p = paziente as Record<string, unknown>
  const card: React.CSSProperties = {
    background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
    boxShadow: 'var(--sh-b)',
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

          {/* Azioni paziente — solo titolare/admin_rete */}
          {canEdit && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <PazienteEditSheet paziente={{
                id: paziente.id,
                codice_paziente: paziente.codice_paziente ?? null,
                note: paziente.note ?? null,
                anamnesi: (paziente as Record<string, unknown>).anamnesi as string | null ?? null,
                asl: (paziente as Record<string, unknown>).asl as string | null ?? null,
                sesso: (paziente as Record<string, unknown>).sesso as string | null ?? null,
                data_nascita: (paziente as Record<string, unknown>).data_nascita as string | null ?? null,
              }} />
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

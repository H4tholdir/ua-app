import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'

export const metadata = { title: 'Analisi Rischi — Qualita MDR' }

// ─── Helpers ─────────────────────────────────────────────────

function formatDataIT(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatTipoDispositivo(tipo: string): string {
  const map: Record<string, string> = {
    protesi_fissa: 'Protesi Fissa',
    protesi_mobile: 'Protesi Mobile',
    implantologia: 'Implantologia',
    cad_cam: 'CAD/CAM',
    scheletrato: 'Scheletrato',
    ortodonzia: 'Ortodonzia',
    provvisorio: 'Provvisorio',
    riparazione: 'Riparazione',
    altro: 'Altro',
  }
  return map[tipo] ?? tipo
}

// ─── Page ─────────────────────────────────────────────────────

export default async function RischiPage() {
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

  const { data: rischi } = await svc
    .from('rischi_tipo_dispositivo')
    .select('id, tipo_dispositivo, rischi_json, data_ultima_revisione, versione')
    .eq('laboratorio_id', utente.laboratorio_id)
    .order('tipo_dispositivo', { ascending: true })

  const fontFamily = "'DM Sans', system-ui, sans-serif"

  return (
    <PageWrapper>
      <AppHeader
        title="Analisi Rischi"
        subtitle="Per tipo di dispositivo — ISO 14971"
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
            color: '#8899CC',
            fontSize: '13px',
            textDecoration: 'none',
            fontFamily,
            marginBottom: '4px',
          }}
        >
          ← Qualita
        </Link>

        {/* Alert se nessuna analisi */}
        {(!rischi || rischi.length === 0) ? (
          <div
            role="alert"
            style={{
              background: '#2D1A0A',
              borderRadius: '12px',
              padding: '16px 20px',
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
              Nessuna analisi rischi configurata
            </p>
            <p style={{
              color: '#C8895A',
              fontSize: '13px',
              fontFamily,
              margin: 0,
              lineHeight: '1.5',
            }}>
              L&apos;analisi rischi per tipo dispositivo e obbligatoria per il fascicolo tecnico MDR
              (Allegato II — ISO 14971:2019). Configura almeno un tipo di dispositivo.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rischi.map((r) => {
              const rischiList = Array.isArray(r.rischi_json) ? r.rischi_json : []
              return (
                <div
                  key={r.id}
                  style={{
                    background: '#1B2D6B',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}>
                    <span style={{
                      color: '#F0F4FF',
                      fontSize: '15px',
                      fontWeight: 600,
                      fontFamily,
                    }}>
                      {formatTipoDispositivo(r.tipo_dispositivo)}
                    </span>
                    <span style={{
                      color: '#D4A843',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily,
                      background: 'hsl(43 65% 55% / 0.12)',
                      padding: '2px 8px',
                      borderRadius: '100px',
                    }}>
                      v{r.versione}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    color: '#8899CC',
                    fontSize: '13px',
                    fontFamily,
                    marginBottom: '12px',
                  }}>
                    <span>
                      Revisione: {formatDataIT(r.data_ultima_revisione)}
                    </span>
                    <span>
                      {rischiList.length} {rischiList.length === 1 ? 'rischio' : 'rischi'} identificati
                    </span>
                  </div>

                  <Link
                    href={`/qualita/rischi/${r.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#8899CC',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      fontFamily,
                      padding: '6px 12px',
                      background: '#243580',
                      borderRadius: '8px',
                    }}
                  >
                    Modifica →
                  </Link>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </PageWrapper>
  )
}

import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'
import { LABEL_MACRO } from '@/lib/domain/tipi-lavoro'

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

// B4: consolidata su LABEL_MACRO (unica fonte) — src/lib/domain/tipi-lavoro.ts
function formatTipoDispositivo(tipo: string): string {
  return LABEL_MACRO[tipo as keyof typeof LABEL_MACRO] ?? tipo
}

// ─── Page ─────────────────────────────────────────────────────

export default async function RischiPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) return null

  const svc = getServiceClient()
  const { data: rischi } = await svc
    .from('rischi_tipo_dispositivo')
    .select('id, tipo_dispositivo, rischi_json, data_ultima_revisione, versione')
    .eq('laboratorio_id', context.laboratorioId)
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
            color: 'var(--t2, #4A3D33)',
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
              background: 'rgba(253, 126, 20, 0.10)',
              borderRadius: '12px',
              padding: '16px 20px',
              border: '1px solid rgba(253, 126, 20, 0.4)',
            }}
          >
            <p style={{
              color: 'var(--amber, #FD7E14)',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily,
              margin: '0 0 4px',
            }}>
              Nessuna analisi rischi configurata
            </p>
            <p style={{
              color: 'var(--c-amber, #F59E0B)',
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
                    background: 'var(--surface, #E4DFD9)',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: 'var(--sh-b, var(--sh-b))',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}>
                    <span style={{
                      color: 'var(--t1, #1C1916)',
                      fontSize: '15px',
                      fontWeight: 600,
                      fontFamily,
                    }}>
                      {formatTipoDispositivo(r.tipo_dispositivo)}
                    </span>
                    <span style={{
                      color: 'var(--c-amber, #F59E0B)',
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
                    color: 'var(--t2, #4A3D33)',
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
                      color: 'var(--t2, #4A3D33)',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      fontFamily,
                      padding: '6px 12px',
                      background: 'var(--elv, #EDEDEA)',
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

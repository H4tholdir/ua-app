import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ListinoVoceRow } from '@/components/features/listino/ListinoVoceRow'
import type { VoceListino } from '@/components/features/listino/ListinoVoceRow'
import { ListinoNuovoSheet } from '@/components/features/listino/ListinoNuovoSheet'

export default async function ListinoPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')

  const svc = getServiceClient()
  const labId: string = context.laboratorioId
  const ruolo: string = context.ruolo
  const canEdit = ruolo === 'titolare' || ruolo === 'admin_rete'

  let voci: VoceListino[] = []
  if (labId) {
    const { data } = await svc
      .from('listino')
      .select('id, codice, nome, descrizione, categoria, prezzo_1, unita_misura, compenso_tecnico, costo_materiali_estimated')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .order('categoria', { ascending: true })
      .order('nome', { ascending: true })
      .limit(1000)
    voci = (data ?? []) as VoceListino[]
  }

  // Raggruppa per categoria
  const perCategoria = voci.reduce<Record<string, VoceListino[]>>((acc, voce) => {
    const cat = voce.categoria || 'Altro'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(voce)
    return acc
  }, {})

  const categorie = Object.keys(perCategoria).sort()

  const addButton = canEdit ? <ListinoNuovoSheet /> : undefined

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
              boxShadow: 'var(--sh-b, var(--sh-b))',
            }}
          >
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                color: 'var(--t2, #4A3D33)',
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
                  color: 'var(--t2, #4A3D33)',
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
                  boxShadow: 'var(--sh-b, var(--sh-b))',
                  overflow: 'hidden',
                }}
              >
                {perCategoria[categoria].map((voce, idx) => (
                  <ListinoVoceRow
                    key={voce.id}
                    voce={voce}
                    showBorderTop={idx > 0}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </PageWrapper>
  )
}

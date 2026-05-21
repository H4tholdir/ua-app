import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MagazzinoSearchList } from '@/components/features/magazzino/MagazzinoSearchList'

type ArticoloRow = {
  id: string
  codice_articolo: string
  nome: string
  produttore: string | null
  categoria: string | null
  um_scarico: string
  scorta_attuale: number
  scorta_minima: number
  dispositivo_medico: boolean
}

export default async function MagazzinoPage() {
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

  let articoli: ArticoloRow[] = []
  if (labId) {
    const { data } = await svc
      .from('magazzino')
      .select('id, codice_articolo, nome, produttore, categoria, um_scarico, scorta_attuale, scorta_minima, dispositivo_medico')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .order('nome', { ascending: true })
      .limit(500)
    articoli = (data ?? []) as ArticoloRow[]
  }

  const articoliAlert = articoli.filter((a) => a.scorta_attuale < a.scorta_minima)

  return (
    <PageWrapper>
      <AppHeader
        title="Magazzino"
        subtitle={articoliAlert.length > 0 ? `${articoliAlert.length} sotto scorta minima` : undefined}
      />

      {articoli.length === 0 ? (
        <section style={{ padding: '0 20px 32px' }}>
          <div
            style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
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
              Nessun articolo in magazzino
            </p>
          </div>
        </section>
      ) : (
        /* Search + lista lato client — i dati sono già caricati — BUG #12 */
        <MagazzinoSearchList articoli={articoli} />
      )}
    </PageWrapper>
  )
}

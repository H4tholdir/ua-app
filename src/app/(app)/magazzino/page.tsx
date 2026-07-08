import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MagazzinoSearchList } from '@/components/features/magazzino/MagazzinoSearchList'
import { OrdinaBatchBanner } from '@/components/features/magazzino/OrdinaBatchBanner'

// Tipo base — usato dalla search list
export type ArticoloRow = {
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

// Tipo esteso — usato per la logica batch ordini
export type ArticoloRowConOrdine = ArticoloRow & {
  fornitore_id: string | null
  um_acquisto: string
  conf_da_ordinare: number | null
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

  let articoli: ArticoloRowConOrdine[] = []
  let categorieEsistenti: string[] = []
  let fornitori: Array<{ id: string; ragione_sociale: string }> = []

  if (labId) {
    const { data } = await svc
      .from('magazzino')
      .select('id, codice_articolo, nome, produttore, categoria, um_scarico, um_acquisto, fornitore_id, conf_da_ordinare, scorta_attuale, scorta_minima, dispositivo_medico')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .order('nome', { ascending: true })
      .limit(500)
    articoli = (data ?? []) as ArticoloRowConOrdine[]

    categorieEsistenti = Array.from(
      new Set(articoli.map((a) => a.categoria).filter((c): c is string => !!c))
    ).sort()

    const { data: fornitoriData } = await svc
      .from('fornitori')
      .select('id, ragione_sociale')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .order('ragione_sociale', { ascending: true })
    fornitori = fornitoriData ?? []
  }

  const articoliAlert = articoli.filter((a) => a.scorta_attuale <= a.scorta_minima)

  return (
    <PageWrapper>
      <AppHeader
        title="Magazzino"
        subtitle={articoliAlert.length > 0 ? `${articoliAlert.length} sotto scorta minima` : undefined}
      />

      {articoliAlert.length > 0 && (
        <OrdinaBatchBanner articoliSottoScorta={articoliAlert} />
      )}
      {/* Search + lista lato client — gestisce anche stato vuoto e creazione nuovo articolo */}
      <MagazzinoSearchList articoli={articoli} categorieEsistenti={categorieEsistenti} fornitori={fornitori} />
    </PageWrapper>
  )
}

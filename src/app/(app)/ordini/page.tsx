import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { OrdiniList } from '@/components/features/ordini/OrdiniList'

export type OrdineRow = {
  id: string
  numero_ordine: string
  stato: string
  quantita_ordinata: number | null
  unita_misura: string | null
  quantita_ricevuta: number | null
  data_ordine: string | null
  data_consegna_richiesta: string | null
  data_consegna_effettiva: string | null
  note: string | null
  whatsapp_inviato: boolean
  email_inviato: boolean
  created_at: string
  fornitore_id: string | null
  magazzino_id: string | null
  // Join
  materiale_nome?: string | null
  fornitore_nome?: string | null
  fornitore_telefono?: string | null
  fornitore_email?: string | null
}

export type ArticoloSottoScorta = {
  id: string
  nome: string
  scorta_attuale: number
  scorta_minima: number
  um_scarico: string
  fornitore_id: string | null
}

export default async function OrdiniPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  let ordini: OrdineRow[] = []
  let articoliSottoScorta: ArticoloSottoScorta[] = []

  if (labId) {
    // Carica ordini con join su magazzino e fornitori
    const { data: ordiniData } = await svc
      .from('ordini_fornitori')
      .select(`
        id, numero_ordine, stato, quantita_ordinata, unita_misura,
        quantita_ricevuta, data_ordine, data_consegna_richiesta,
        data_consegna_effettiva, note, whatsapp_inviato, email_inviato,
        created_at, fornitore_id, magazzino_id
      `)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200)

    if (ordiniData) {
      // Arricchisci con nomi da magazzino e fornitori
      const magazziniIds = [...new Set(ordiniData.map((o) => o.magazzino_id).filter(Boolean))]
      const fornitoriIds = [...new Set(ordiniData.map((o) => o.fornitore_id).filter(Boolean))]

      const [magazziniRes, fornitoriRes] = await Promise.all([
        magazziniIds.length > 0
          ? svc.from('magazzino').select('id, nome').in('id', magazziniIds as string[])
          : Promise.resolve({ data: [] }),
        fornitoriIds.length > 0
          ? svc.from('fornitori').select('id, nome, telefono, email').in('id', fornitoriIds as string[])
          : Promise.resolve({ data: [] }),
      ])

      const magMap = Object.fromEntries((magazziniRes.data ?? []).map((m) => [m.id, m.nome as string]))
      const fornMap = Object.fromEntries(
        (fornitoriRes.data ?? []).map((f) => [
          f.id,
          { nome: f.nome as string, telefono: f.telefono as string | null, email: f.email as string | null },
        ])
      )

      ordini = ordiniData.map((o) => ({
        ...o,
        materiale_nome: o.magazzino_id ? (magMap[o.magazzino_id] ?? null) : null,
        fornitore_nome: o.fornitore_id ? (fornMap[o.fornitore_id]?.nome ?? null) : null,
        fornitore_telefono: o.fornitore_id ? (fornMap[o.fornitore_id]?.telefono ?? null) : null,
        fornitore_email: o.fornitore_id ? (fornMap[o.fornitore_id]?.email ?? null) : null,
      })) as OrdineRow[]
    }

    // Carica articoli sotto scorta minima (RPC server-side, B16)
    const { data: articoliSottoScortaData } = await svc
      .rpc('articoli_sotto_scorta_minima', { p_lab_id: labId })

    articoliSottoScorta = (articoliSottoScortaData ?? []) as ArticoloSottoScorta[]
  }

  const ordiniAperti = ordini.filter((o) => !['evaso', 'annullato', 'archiviato'].includes(o.stato))

  return (
    <PageWrapper>
      <AppHeader
        title="Ordini Fornitori"
        subtitle={ordiniAperti.length > 0 ? `${ordiniAperti.length} in corso` : undefined}
      />
      <OrdiniList
        ordini={ordini}
        articoliSottoScorta={articoliSottoScorta}
      />
    </PageWrapper>
  )
}

import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { CicloFasiEditor } from '@/components/features/cicli/CicloFasiEditor'
import type { FaseItem } from '@/components/features/cicli/CicloFasiEditor'

interface Props { params: Promise<{ id: string }> }

function formatDataOra(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function CicloDettaglioPage({ params }: Props) {
  const { id } = await params
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login?error=no_lab')

  const svc = getServiceClient()
  const { data: ciclo } = await svc
    .from('cicli_produzione')
    .select('id, codice, nome, tipo_dispositivo, classe_rischio, created_by, created_at, updated_by, updated_at')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!ciclo) redirect('/cicli-produzione')

  const { data: fasiRows } = await svc
    .from('fasi_produzione')
    .select('id, codice_fase, descrizione, obbligatoria, attrezzatura, controllo_misura, esito_atteso, materiali_nota')
    .eq('ciclo_id', id)
    .is('deleted_at', null)
    .order('ordine', { ascending: true })

  let ultimaModificaLabel: string | null = null
  if (ciclo.updated_by) {
    const { data: editor } = await svc
      .from('utenti')
      .select('nome, cognome')
      .eq('id', ciclo.updated_by)
      .eq('laboratorio_id', context.laboratorioId)
      .single()
    if (editor) {
      ultimaModificaLabel = `${editor.nome} ${editor.cognome} il ${formatDataOra(ciclo.updated_at)}`
    }
  }

  let creatoDaLabel: string | null = null
  if (ciclo.created_by) {
    const { data: creatore } = await svc
      .from('utenti')
      .select('nome, cognome')
      .eq('id', ciclo.created_by)
      .eq('laboratorio_id', context.laboratorioId)
      .single()
    if (creatore) {
      creatoDaLabel = `${creatore.nome} ${creatore.cognome} il ${formatDataOra(ciclo.created_at)}`
    }
  }

  return (
    <>
      <AppHeader title={ciclo.nome} subtitle={ciclo.codice} backHref="/cicli-produzione" />
      <PageWrapper>
        <CicloFasiEditor
          cicloId={ciclo.id}
          nomeCiclo={ciclo.nome}
          fasiIniziali={(fasiRows ?? []) as FaseItem[]}
          ultimaModificaLabel={ultimaModificaLabel}
          headerActions={{
            codice: ciclo.codice,
            tipoDispositivo: ciclo.tipo_dispositivo,
            classeRischio: ciclo.classe_rischio,
            creatoDaLabel,
          }}
        />
      </PageWrapper>
    </>
  )
}

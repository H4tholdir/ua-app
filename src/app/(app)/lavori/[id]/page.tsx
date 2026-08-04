import { notFound } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { SchedaLavoroV3 } from '@/components/features/lavori/scheda-v3/SchedaLavoroV3'
import { getSignedUrl } from '@/lib/storage/signed-url'
import { normalizzaPrescrizione } from '@/lib/domain/prescrizione-mapper'
import type { LavoroDettaglio, DichiarazioneConformita } from '@/types/domain'

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ consegna?: string }> }

export default async function LavoroDettaglioPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { consegna } = await searchParams

  // Auth
  const context = await getLabContext()
  if (!context?.laboratorioId) notFound()

  const svc = getServiceClient()

  // Carica lavoro con tutti i join
  const { data: lavoro, error } = await svc
    .from('lavori')
    .select(`
      *,
      cliente:clienti(*),
      paziente:pazienti(*),
      tecnico:tecnici(*),
      lavorazioni:lavori_lavorazioni(*),
      appuntamenti:lavori_appuntamenti(*),
      immagini:lavori_immagini(*),
      fasi:lavori_fasi(*, fase:fasi_produzione(*)),
      materiali:lavori_materiali(*),
      ddc:dichiarazioni_conformita(*),
      denti:lavori_denti(*),
      prescrizione:lavori_prescrizioni(*),
      laboratorio:laboratori(nome, telefono)
    `)
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .neq('ddc.stato', 'annullata')
    .is('lavori_immagini.deleted_at', null)
    .single()

  if (error || !lavoro) {
    notFound()
  }

  const lavoroDettaglio = lavoro as unknown as LavoroDettaglio

  // Fix trasversale B5: le "public URL" salvate in DB sono rotte (bucket
  // documenti privato) — firma gli URL al momento del render, mai in anticipo.
  // Normalizzazione difensiva: PostgREST può restituire `dichiarazioni_conformita`
  // embedded come oggetto singolo o array a seconda della cardinalità inferita —
  // non assumere una forma specifica per questo confine esterno (mai verificato
  // empiricamente). Riassegna la proprietà così tutto il resto della pagina
  // (incluso il passaggio a TabDocumenti) vede sempre un oggetto singolo coerente.
  const ddcRaw = lavoroDettaglio.ddc as unknown as DichiarazioneConformita | DichiarazioneConformita[] | null
  lavoroDettaglio.ddc = Array.isArray(ddcRaw) ? (ddcRaw[0] ?? null) : ddcRaw

  // T7 (ondata B ③) — la scheda legge lo SNAPSHOT della prescrizione e il
  // COLORE VIVO, che è ciò che serve alla riga «Colore» (D225②).
  //
  // 🔑 Questa pagina NON passa dalla GET di `/api/lavori/[id]`: fa la sua
  //    query. I due embed che il Task 6 ha aggiunto alla rotta vanno quindi
  //    chiesti anche qui, o la scheda resta cieca — è la stessa asimmetria che
  //    ha tenuto la prescrizione fuori dalla scheda fino a oggi.
  // 🔑 `denti:lavori_denti(*)` è la STRADA DEL RITORNO del colore: dal Task 10
  //    `lavori.colore_dente` non ha più scrittori, e il colore vivo si legge
  //    dalle righe con la precedenza riga→caso di `@/lib/domain/colore-dente`.
  //    Nessun filtro `deleted_at`: quella colonna su `lavori_denti` non esiste
  //    (verificato su `database.types.ts`), e la GET della rotta la embedda
  //    allo stesso modo.
  // 🔑 `normalizzaPrescrizione` è la stessa funzione della rotta (modulo puro,
  //    Task 6): normalizza la forma array-vs-oggetto dell'embed E le guardie
  //    di dominio su `contenuto`/`divergenze`. Copiare qui un accesso diretto
  //    a `lavoro.prescrizione` sarebbe una seconda lettura dello stesso
  //    confine esterno, con le guardie in un posto solo.
  lavoroDettaglio.prescrizione = normalizzaPrescrizione(
    (lavoro as Record<string, unknown>).prescrizione
  )

  const [signedDdcUrl] = await Promise.all([
    lavoroDettaglio.ddc?.storage_path_pdf
      ? getSignedUrl(svc, 'documenti', lavoroDettaglio.ddc.storage_path_pdf, 3600)
      : Promise.resolve(null),
    Promise.all(
      lavoroDettaglio.immagini.map(async (img) => {
        const signedImgUrl = await getSignedUrl(svc, 'documenti', img.storage_path, 3600)
        if (signedImgUrl) img.url = signedImgUrl
      })
    ),
  ])
  if (signedDdcUrl && lavoroDettaglio.ddc) lavoroDettaglio.ddc.pdf_url = signedDdcUrl

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <SchedaLavoroV3 lavoro={lavoroDettaglio} ruolo={context.ruolo} apriConsegna={consegna === '1'} />
    </div>
  )
}

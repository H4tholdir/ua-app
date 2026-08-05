import { notFound } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getSignedUrl } from '@/lib/storage/signed-url'
import { LavoroFormClient } from '@/components/features/lavori/LavoroFormClient'
import { BackHeaderModifica } from './BackHeaderModifica'
import { risolviTab } from '@/lib/lavori/risolvi-tab'
import { caricaTinteScheda } from '@/lib/lavori/tinta-scheda'
import type { LavoroDettaglio, DichiarazioneConformita } from '@/types/domain'

// ⚠️ `denti:lavori_denti(*)` NON è un di più: dal Task 10 le quattro colonne
// `lavori.colore_*` non hanno più alcuno scrittore (le due RPC denormalizzano
// solo i tre `denti_*`). Senza l'embed, la tab Clinica mostrerebbe l'ultimo
// valore ricevuto prima di quel deploy: l'utente scriverebbe un colore, lo
// vedrebbe salvato davvero, e ricaricando non lo troverebbe più.
//
// Ondata 3a Task 9 — route-ponte /lavori/[id]/modifica. La scheda-vista v3
// (SchedaLavoroV3, Task 6) delega le 4 voci pesanti del menu (Lavorazioni,
// Clinica, Prove, Immagini — MenuSchedaSheet, Task 4) qui via
// `router.push('/lavori/{id}/modifica?tab=...')`. Questa pagina replica
// FEDELMENTE il pattern dati di [id]/page.tsx (stessa query con join, stessa
// firma URL di ddc.pdf_url e immagini) perché LavoroFormClient consuma lo
// stesso oggetto `lavoro` — nessuna query alternativa, nessun campo mancante.

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function ModificaLavoroPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab } = await searchParams

  const defaultTab = risolviTab(tab)

  // Auth (identico a [id]/page.tsx)
  const context = await getLabContext()
  if (!context?.laboratorioId) notFound()

  const svc = getServiceClient()

  // Carica lavoro con tutti i join (identico a [id]/page.tsx)
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

  // Fix trasversale B5 (identico a [id]/page.tsx): le "public URL" salvate in
  // DB sono rotte (bucket documenti privato) — firma gli URL al momento del
  // render, mai in anticipo. Normalizzazione difensiva ddc: PostgREST può
  // restituire l'embed come oggetto singolo o array a seconda della
  // cardinalità inferita.
  const ddcRaw = lavoroDettaglio.ddc as unknown as DichiarazioneConformita | DichiarazioneConformita[] | null
  lavoroDettaglio.ddc = Array.isArray(ddcRaw) ? (ddcRaw[0] ?? null) : ddcRaw

  // D42 T8 — le tinte per il campo della tab Clinica. 🔑 È LA STESSA funzione
  // che usa la scheda (`lavori/[id]/page.tsx`), non una copia: questa pagina
  // dichiara in testa di replicare «FEDELMENTE il pattern dati» dell'altra, e
  // due letture divergenti dello stesso catalogo sarebbero due verità.
  const tinte = await caricaTinteScheda(svc, {
    tipo_dispositivo: lavoroDettaglio.tipo_dispositivo,
    tinta_famiglia: lavoroDettaglio.tinta_famiglia,
    tinta_codice: lavoroDettaglio.tinta_codice,
  })
  lavoroDettaglio.tinta = tinte.scelta
  lavoroDettaglio.tinteDisponibili = tinte.disponibili

  if (lavoroDettaglio.ddc?.storage_path_pdf) {
    const signedDdcUrl = await getSignedUrl(svc, 'documenti', lavoroDettaglio.ddc.storage_path_pdf, 3600)
    if (signedDdcUrl) lavoroDettaglio.ddc.pdf_url = signedDdcUrl
  }

  if (lavoroDettaglio.immagini.length > 0) {
    await Promise.all(
      lavoroDettaglio.immagini.map(async (img) => {
        const signedImgUrl = await getSignedUrl(svc, 'documenti', img.storage_path, 3600)
        if (signedImgUrl) img.url = signedImgUrl
      })
    )
  }

  return (
    <div data-ds="v3" className="lavoro-form-v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <BackHeaderModifica lavoroId={id} />
      <LavoroFormClient
        lavoro={lavoroDettaglio}
        ruolo={context.ruolo}
        bridged
        defaultTab={defaultTab}
      />
    </div>
  )
}

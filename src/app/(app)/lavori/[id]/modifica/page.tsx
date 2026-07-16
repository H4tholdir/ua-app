import { notFound } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getSignedUrl } from '@/lib/storage/signed-url'
import { LavoroFormClient } from '@/components/features/lavori/LavoroFormClient'
import { BackHeaderModifica } from './BackHeaderModifica'
import { risolviTab } from '@/lib/lavori/risolvi-tab'
import type { LavoroDettaglio, DichiarazioneConformita } from '@/types/domain'

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
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) notFound()

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) notFound()

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
      laboratorio:laboratori(nome, telefono)
    `)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .neq('ddc.stato', 'annullata')
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
        ruolo={utente.ruolo}
        bridged
        defaultTab={defaultTab}
      />
    </div>
  )
}

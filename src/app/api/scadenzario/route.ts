import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { calcolaResiduo } from '@/lib/contabilita/saldo'

// ─── GET /api/scadenzario ─────────────────────────────────────────────────────
// Fatture non pagate (stato_sdi != 'draft') + lavori diretti non_fatturare non
// saldati, raggruppati per cliente, ordinati per anzianità decrescente.
// Il "credito potenziale" (lavori in_attesa) NON entra in questa lista (B2 §5).
export async function GET() {
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id

  type ClienteSnap = {
    id: string
    nome: string
    cognome: string
    studio_nome: string | null
    telefono: string | null
  }

  interface DovutoRow {
    id: string
    origine: 'fattura' | 'lavoro_diretto'
    numero: string
    data: string
    importo: number
    stato_sdi: string | null
  }

  const { data: fattureData, error: fattureError } = await svc
    .from('fatture')
    .select('id, numero, data, totale, importo_pagato, stato_sdi, pagata, cliente:clienti(id, nome, cognome, studio_nome, telefono)')
    .eq('laboratorio_id', labId)
    .eq('pagata', false)
    .neq('stato_sdi', 'draft')
    .is('deleted_at', null)
    .order('data', { ascending: true })

  if (fattureError) {
    return NextResponse.json({ error: fattureError.message }, { status: 500 })
  }

  const { data: lavoriData, error: lavoriError } = await svc
    .from('lavori')
    .select(`
      id, numero_lavoro, prezzo_unitario, data_consegna_prevista,
      cliente:clienti(id, nome, cognome, studio_nome, telefono),
      pagamenti(importo, stato),
      credito_clienti_movimenti(importo, tipo)
    `)
    .eq('laboratorio_id', labId)
    .in('decisione_fatturazione', ['non_fatturare', 'fatturare'])
    .eq('incluso_in_fattura', false)
    .not('stato', 'in', '("annullato")')
    .is('deleted_at', null)
    .gt('prezzo_unitario', 0)

  if (lavoriError) {
    return NextResponse.json({ error: lavoriError.message }, { status: 500 })
  }

  // NOTA (finding Task 16, review finale): `pagata=false` include le fatture
  // parzialmente pagate — senza nettare `importo_pagato` questo endpoint
  // mostrerebbe l'importo pieno invece del residuo reale, disaccordando con
  // Dashboard/Contabilità cliente (esattamente il sintomo originale di B2).
  //
  // NOTA (finding review finale whole-branch, dopo Task 16): il filtro sui
  // lavori includeva SOLO `non_fatturare`, escludendo `fatturare` con
  // `incluso_in_fattura=false` — il bucket "confermato" definito nello spec
  // B2 §5 include invece entrambi (un lavoro deciso "fatturare" ma non ancora
  // formalizzato in fattura è comunque un dovuto reale). Con solo
  // `non_fatturare`, un cliente con l'unico scaduto in questo stato compariva
  // nel widget morosi Dashboard e nella sua Contabilità cliente ma spariva
  // dallo Scadenzario — lo stesso sintomo di disaccordo tra superfici che B2
  // esiste per eliminare. Allineato a `.in(...)`, stesso filtro già usato da
  // `getCreditoScadutoPerCliente` (Task 9) e `getContabilitaCliente` (Task 15).

  const byCliente: Record<
    string,
    { cliente: ClienteSnap; dovuti: DovutoRow[]; totale_insoluto: number; giorni_max_ritardo: number }
  > = {}

  function upsertCliente(cliente: ClienteSnap): void {
    if (!byCliente[cliente.id]) {
      byCliente[cliente.id] = { cliente, dovuti: [], totale_insoluto: 0, giorni_max_ritardo: 0 }
    }
  }

  function aggiornaGiorniMax(clienteId: string, dataRiferimento: string): void {
    const giorni = Math.floor((Date.now() - new Date(dataRiferimento).getTime()) / 86_400_000)
    if (giorni > byCliente[clienteId].giorni_max_ritardo) {
      byCliente[clienteId].giorni_max_ritardo = giorni
    }
  }

  for (const f of (fattureData ?? []) as unknown as Array<{
    id: string; numero: string; data: string; totale: number; importo_pagato: number
    stato_sdi: string; pagata: boolean
    cliente: ClienteSnap | null
  }>) {
    if (!f.cliente) continue
    const residuo = Math.round((Number(f.totale) - Number(f.importo_pagato ?? 0)) * 100) / 100
    if (residuo <= 0) continue

    upsertCliente(f.cliente)
    byCliente[f.cliente.id].dovuti.push({
      id: f.id,
      origine: 'fattura',
      numero: f.numero,
      data: f.data,
      importo: residuo,
      stato_sdi: f.stato_sdi,
    })
    byCliente[f.cliente.id].totale_insoluto += residuo
    aggiornaGiorniMax(f.cliente.id, f.data)
  }

  for (const l of (lavoriData ?? []) as unknown as Array<{
    id: string; numero_lavoro: string; prezzo_unitario: number | null; data_consegna_prevista: string
    cliente: ClienteSnap | null
    pagamenti: Array<{ importo: number; stato: string }>
    credito_clienti_movimenti: Array<{ importo: number; tipo: string }>
  }>) {
    if (!l.cliente) continue
    const pagamentiAttivi = (l.pagamenti ?? []).filter((p) => p.stato === 'attivo')
    const applicazioni = (l.credito_clienti_movimenti ?? []).filter((m) => m.tipo === 'applicazione')
    const residuo = calcolaResiduo(Number(l.prezzo_unitario ?? 0), pagamentiAttivi, applicazioni)
    if (residuo <= 0) continue

    upsertCliente(l.cliente)
    byCliente[l.cliente.id].dovuti.push({
      id: l.id,
      origine: 'lavoro_diretto',
      numero: l.numero_lavoro,
      data: l.data_consegna_prevista,
      importo: residuo,
      stato_sdi: null,
    })
    byCliente[l.cliente.id].totale_insoluto += residuo
    aggiornaGiorniMax(l.cliente.id, l.data_consegna_prevista)
  }

  const result = Object.values(byCliente).sort(
    (a, b) => b.giorni_max_ritardo - a.giorni_max_ritardo
  )

  return NextResponse.json(result)
}

// src/app/api/lavori/[id]/precheck-consegna/route.ts
// GET read-only (ondata 16/07 §3.1): il precheck consegna per il client
// FlussoConsegna. STESSO precheck del POST (precheckMDR — divergenza
// impossibile per costruzione) + warnings materiali via helper condiviso.
// Authz IDENTICA al POST consegna: nessun gate di ruolo (D-3, parità),
// 404 indistinguibile cross-tenant (mai 403). Shape risposta BLINDATO: mai
// echo di campi lavoro/paziente (Art. 9 GDPR).
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { precheckMDR } from '@/lib/consegna/precheck'
import { materialiCarenti } from '@/lib/consegna/materiali-carenti'
import type { LavoroDettaglio, PrecheckConsegnaResponse } from '@/types/domain'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()
  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }
  const labId: string = utente.laboratorio_id

  // Select MINIMO = lo stesso di orchestraConsegna (orchestrate.ts Step 1) —
  // ciò che serve a precheckMDR, niente relazioni superflue.
  const { data: lavoro } = await svc
    .from('lavori')
    .select(`
      *,
      cliente:clienti(*),
      paziente:pazienti(*),
      lavorazioni:lavori_lavorazioni(*),
      materiali:lavori_materiali(*)
    `)
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()
  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })

  const pre = precheckMDR(lavoro as unknown as LavoroDettaglio)
  const carenti = await materialiCarenti(svc, id, labId)

  const warnings: string[] = [
    ...(pre.mdr_campi_mancanti ?? []).map((c) => `${c} non registrato all'accettazione`),
    ...carenti.map((m) => `${m.nome} sotto scorta (${m.scorta_attuale} ${m.unita_misura} su ${m.quantita_necessaria})`),
  ]

  const risposta: PrecheckConsegnaResponse = {
    consegnabile: pre.ok,
    bloccanti: pre.errori,
    warnings,
  }
  return NextResponse.json(risposta)
}

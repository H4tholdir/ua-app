// src/app/api/lavori/[id]/precheck-consegna/route.ts
// GET read-only (ondata 16/07 §3.1): il precheck consegna per il client
// FlussoConsegna. STESSO precheck del POST (precheckMDR — divergenza
// impossibile per costruzione) + warnings materiali via helper condiviso.
// Authz IDENTICA al POST consegna: nessun gate di ruolo (D-3, parità),
// 404 indistinguibile cross-tenant (mai 403). Shape risposta BLINDATO: mai
// echo di campi lavoro/paziente (Art. 9 GDPR).
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { precheckMDR } from '@/lib/consegna/precheck'
import { materialiCarenti } from '@/lib/consegna/materiali-carenti'
import type { LavoroDettaglio, PrecheckConsegnaResponse } from '@/types/domain'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    // Messaggio/status di questo file (404 "Lavoro non trovato", MAI 403 —
    // vedi commento di testa: 404 indistinguibile cross-tenant) conservato
    // anche per il ramo laboratorioId assente.
    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
    }

    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard

    const labId: string = context.laboratorioId

    const svc = getServiceClient()
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
  })
}

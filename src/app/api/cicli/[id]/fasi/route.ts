import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

type RouteContext = { params: Promise<{ id: string }> }

interface FaseInput {
  id?: string
  codice_fase: string
  descrizione: string
  obbligatoria?: boolean
  attrezzatura?: string | null
  controllo_misura?: string | null
  esito_atteso?: string | null
  materiali_nota?: string | null
}

interface RpcResult {
  ok: boolean
  error?: string
}

export async function PATCH(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id: cicloId } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = context.laboratorioId
  const svc = getServiceClient()

  let body: { fasi?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const fasiInput = Array.isArray(body.fasi) ? (body.fasi as FaseInput[]) : []

  const { data, error: rpcError } = await svc.rpc('salva_fasi_ciclo_atomico', {
    p_ciclo_id: cicloId,
    p_laboratorio_id: labId,
    p_user_id: context.userId,
    p_fasi: fasiInput,
  })

  if (rpcError) {
    return NextResponse.json({ error: 'Errore nel salvataggio delle fasi' }, { status: 500 })
  }

  const result = data as unknown as RpcResult

  if (!result?.ok) {
    const message = result?.error ?? 'Errore nel salvataggio delle fasi'
    const status = message === 'Ciclo non trovato' ? 404 : 422
    return NextResponse.json({ error: message }, { status })
  }

  return NextResponse.json({ ok: true })
}

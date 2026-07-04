import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
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

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente, error: utenteError } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (utenteError) {
    return NextResponse.json({ error: 'Errore nel recupero del laboratorio' }, { status: 500 })
  }
  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId: string = utente.laboratorio_id

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
    p_user_id: user.id,
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

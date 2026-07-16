import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { materialiCarenti, type MaterialeCarente } from '@/lib/consegna/materiali-carenti'

interface PrecheckMaterialiResponse {
  ok: boolean
  materiali_carenti: MaterialeCarente[]
  mdr_incompleto: boolean
  mdr_campi_mancanti: string[]
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
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

  // Verifica ownership del lavoro e carica i campi MDR accettazione ingresso
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id, tipo_impronte, disinfettante_usato')
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  // Calcola MDR soft-block (campi accettazione ingresso mancanti)
  const mdrCampiMancanti: string[] = [
    !lavoro.tipo_impronte ? 'Tipo impronta' : null,
    !lavoro.disinfettante_usato ? 'Disinfettante' : null,
  ].filter((x): x is string => x !== null)
  const mdrIncompleto = mdrCampiMancanti.length > 0

  const materialiCarentiRisultato = await materialiCarenti(svc, id, labId)

  const response: PrecheckMaterialiResponse = {
    ok: materialiCarentiRisultato.length === 0 && !mdrIncompleto,
    materiali_carenti: materialiCarentiRisultato,
    mdr_incompleto: mdrIncompleto,
    mdr_campi_mancanti: mdrCampiMancanti,
  }

  return NextResponse.json(response)
}

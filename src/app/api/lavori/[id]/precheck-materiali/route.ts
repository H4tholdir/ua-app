import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

interface MaterialeCarente {
  nome: string
  quantita_necessaria: number
  scorta_attuale: number
  unita_misura: string
  sufficiente: boolean
}

interface PrecheckMaterialiResponse {
  ok: boolean
  materiali_carenti: MaterialeCarente[]
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

  // Verifica ownership del lavoro
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  // Carica le lavorazioni del lavoro
  const { data: lavorazioni, error: lavErr } = await svc
    .from('lavori_lavorazioni')
    .select('id, listino_id, quantita')
    .eq('lavoro_id', id)
    .eq('laboratorio_id', labId)

  if (lavErr || !lavorazioni || lavorazioni.length === 0) {
    return NextResponse.json<PrecheckMaterialiResponse>({ ok: true, materiali_carenti: [] })
  }

  const materialiCarenti: MaterialeCarente[] = []

  for (const lavorazione of lavorazioni) {
    if (!lavorazione.listino_id) continue

    // Carica il BOM per questa lavorazione
    const { data: bomItems } = await svc
      .from('listino_materiali_auto')
      .select('magazzino_id, quantita_per_unita, unita_misura')
      .eq('listino_id', lavorazione.listino_id)
      .eq('laboratorio_id', labId)

    if (!bomItems || bomItems.length === 0) continue

    for (const bom of bomItems) {
      const quantitaNecessaria = Number(bom.quantita_per_unita) * Number(lavorazione.quantita)

      // Carica la scorta attuale del materiale
      const { data: magazzino } = await svc
        .from('magazzino')
        .select('nome, scorta_attuale')
        .eq('id', bom.magazzino_id)
        .eq('laboratorio_id', labId)
        .single()

      if (!magazzino) continue

      const scorta = Number(magazzino.scorta_attuale)
      const sufficiente = scorta >= quantitaNecessaria

      if (!sufficiente) {
        materialiCarenti.push({
          nome: magazzino.nome as string,
          quantita_necessaria: quantitaNecessaria,
          scorta_attuale: scorta,
          unita_misura: bom.unita_misura as string,
          sufficiente: false,
        })
      }
    }
  }

  const response: PrecheckMaterialiResponse = {
    ok: materialiCarenti.length === 0,
    materiali_carenti: materialiCarenti,
  }

  return NextResponse.json(response)
}

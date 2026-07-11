import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { calcolaCreditoDisponibile } from '@/lib/contabilita/saldo'
import { fetchMovimentiCreditoValidi } from '@/lib/contabilita/queries'

const METODI_VALIDI = ['contanti', 'bonifico', 'pos', 'assegno', 'altro']

type RouteContext = { params: Promise<{ id: string }> }

// ─── POST /api/clienti/[id]/credito/rimborsa ───────────────────────────────
// Body: { importo, metodo, metodo_nota? }
export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: cliente_id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'front_desk') {
    return NextResponse.json({ error: 'Ruolo non autorizzato' }, { status: 403 })
  }

  const { data: cliente } = await svc
    .from('clienti')
    .select('id')
    .eq('id', cliente_id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!cliente) {
    return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const importo = typeof body.importo === 'number' ? body.importo : NaN
  const metodo = typeof body.metodo === 'string' ? body.metodo : ''
  const metodo_nota = typeof body.metodo_nota === 'string' ? body.metodo_nota : null

  if (!(importo > 0)) {
    return NextResponse.json({ error: 'Importo deve essere positivo' }, { status: 400 })
  }
  if (!METODI_VALIDI.includes(metodo)) {
    return NextResponse.json({ error: 'Campo `metodo` non valido' }, { status: 400 })
  }

  // fetchMovimentiCreditoValidi è fail-closed (follow-up Ondata 3): su errore
  // di lettura lancia — risposta JSON pulita, mai messaggi Postgres.
  let movimentiValidi
  try {
    movimentiValidi = await fetchMovimentiCreditoValidi(svc, utente.laboratorio_id, cliente_id)
  } catch (err) {
    console.error('[credito rimborsa] lettura movimenti:', err)
    return NextResponse.json({ error: 'Errore lettura credito' }, { status: 500 })
  }
  const disponibile = calcolaCreditoDisponibile(movimentiValidi)

  if (importo > disponibile) {
    return NextResponse.json({ error: `Credito disponibile insufficiente (disponibile: ${disponibile})` }, { status: 400 })
  }

  const { data: movimento, error } = await svc
    .from('credito_clienti_movimenti')
    .insert({
      laboratorio_id: utente.laboratorio_id,
      cliente_id,
      tipo: 'rimborso',
      importo,
      metodo,
      metodo_nota,
      registrato_da: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ movimento })
}

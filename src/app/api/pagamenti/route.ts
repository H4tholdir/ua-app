import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { eseguiRegistrazionePagamento } from '@/lib/contabilita/registra-pagamento'

const METODI_VALIDI = ['contanti', 'bonifico', 'pos', 'assegno', 'altro']

// ─── POST /api/pagamenti ───────────────────────────────────────────────────
// Body: { fattura_id? | lavoro_id?, importo, metodo, metodo_nota?, data_pagamento }
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const fattura_id = typeof body.fattura_id === 'string' ? body.fattura_id : null
  const lavoro_id = typeof body.lavoro_id === 'string' ? body.lavoro_id : null
  const importo = typeof body.importo === 'number' ? body.importo : NaN
  const metodo = typeof body.metodo === 'string' ? body.metodo : ''
  const metodo_nota = typeof body.metodo_nota === 'string' ? body.metodo_nota : null
  const data_pagamento = typeof body.data_pagamento === 'string' ? body.data_pagamento : ''

  if (!METODI_VALIDI.includes(metodo)) {
    return NextResponse.json({ error: 'Campo `metodo` non valido' }, { status: 400 })
  }
  if (!data_pagamento) {
    return NextResponse.json({ error: 'Campo `data_pagamento` richiesto' }, { status: 400 })
  }

  const risultato = await eseguiRegistrazionePagamento(svc, {
    laboratorio_id: utente.laboratorio_id,
    fattura_id,
    lavoro_id,
    importo,
    metodo,
    metodo_nota,
    data_pagamento,
    registrato_da: user.id,
  })

  if (!risultato.ok) {
    const status = risultato.errore?.match(/non trovat[ao]/) ? 404 : 400
    return NextResponse.json({ error: risultato.errore }, { status })
  }

  return NextResponse.json({ pagamento: risultato.pagamento, eccedenza: risultato.eccedenza })
}

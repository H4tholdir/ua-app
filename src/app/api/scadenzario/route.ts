import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

// ─── GET /api/scadenzario ─────────────────────────────────────────────────────
// Fatture non pagate (stato_sdi != 'draft'), raggruppate per cliente, ordinate
// per anzianità decrescente (più vecchie prima).
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

  // Fetch unpaid invoices — exclude drafts (not real receivables yet)
  const { data, error } = await svc
    .from('fatture')
    .select(
      `
      id,
      numero,
      data,
      totale,
      stato_sdi,
      pagata,
      cliente:clienti(
        id,
        nome,
        cognome,
        studio_nome,
        telefono
      )
    `
    )
    .eq('laboratorio_id', labId)
    .eq('pagata', false)
    .neq('stato_sdi', 'draft')
    .is('deleted_at', null)
    .order('data', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type ClienteSnap = {
    id: string
    nome: string
    cognome: string
    studio_nome: string | null
    telefono: string | null
  }

  type FatturaRow = {
    id: string
    numero: string
    data: string
    totale: number
    stato_sdi: string
    pagata: boolean
    cliente: ClienteSnap | null
  }

  // Group by cliente and compute totals + max delay
  const byCliente: Record<
    string,
    {
      cliente: ClienteSnap
      fatture: FatturaRow[]
      totale_insoluto: number
      giorni_max_ritardo: number
    }
  > = {}

  for (const f of (data ?? []) as unknown as FatturaRow[]) {
    const cliente = f.cliente
    if (!cliente) continue

    const clienteId = cliente.id
    if (!byCliente[clienteId]) {
      byCliente[clienteId] = {
        cliente,
        fatture: [],
        totale_insoluto: 0,
        giorni_max_ritardo: 0,
      }
    }

    byCliente[clienteId].fatture.push(f)
    byCliente[clienteId].totale_insoluto += f.totale ?? 0

    const giorniRitardo = Math.floor(
      (Date.now() - new Date(f.data).getTime()) / 86_400_000
    )
    if (giorniRitardo > byCliente[clienteId].giorni_max_ritardo) {
      byCliente[clienteId].giorni_max_ritardo = giorniRitardo
    }
  }

  const result = Object.values(byCliente).sort(
    (a, b) => b.giorni_max_ritardo - a.giorni_max_ritardo
  )

  return NextResponse.json(result)
}

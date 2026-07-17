import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getContabilitaCliente, type DovutoEstratto, type LavoroInAttesa } from '@/lib/contabilita/queries'

export type { DovutoEstratto, LavoroInAttesa }

export interface EstrattoContoResponse {
  cliente: {
    id: string
    nome: string
    cognome: string
    studio_nome: string | null
    telefono: string | null
    indirizzo: string | null
    cap: string | null
    citta: string | null
  }
  dovuti: DovutoEstratto[]
  lavoriInAttesa: LavoroInAttesa[]
  creditoCliente: { confermato: number; potenziale: number; disponibile: number; totale: number }
}

// ─── GET /api/scadenzario/[cliente_id] ───────────────────────────────────────
// Vista "Contabilità cliente" completa (B2): dovuti unificati, lavori in
// attesa di decisione, credito cliente (confermato/potenziale/disponibile/totale).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cliente_id: string }> }
) {
  const { cliente_id } = await params

  const context = await getFreshLabContext()

  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  const { data: clienteRow, error: clienteError } = await svc
    .from('clienti')
    .select('id, nome, cognome, studio_nome, telefono, indirizzo, cap, citta')
    .eq('id', cliente_id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (clienteError || !clienteRow) {
    return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  }

  // getContabilitaCliente è fail-closed (follow-up Ondata 3): su errore di
  // lettura lancia — meglio un 500 esplicito di un saldo parziale silenzioso.
  let contabilita
  try {
    contabilita = await getContabilitaCliente(svc, labId, cliente_id)
  } catch (err) {
    console.error('[scadenzario cliente] lettura contabilità:', err)
    return NextResponse.json({ error: 'Errore lettura contabilità' }, { status: 500 })
  }
  const { dovuti, lavoriInAttesa, creditoCliente } = contabilita

  const response: EstrattoContoResponse = {
    cliente: {
      id: clienteRow.id,
      nome: clienteRow.nome,
      cognome: clienteRow.cognome,
      studio_nome: clienteRow.studio_nome,
      telefono: clienteRow.telefono,
      indirizzo: clienteRow.indirizzo,
      cap: clienteRow.cap,
      citta: clienteRow.citta,
    },
    dovuti,
    lavoriInAttesa,
    creditoCliente,
  }

  return NextResponse.json(response)
}

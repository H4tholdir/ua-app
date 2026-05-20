import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

// ─── Tipi risposta ────────────────────────────────────────────────────────────

export interface FatturaEstratto {
  id: string
  numero: string
  data: string
  totale: number
  stato_sdi: string
  pagata: boolean
  giorni_ritardo: number
}

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
  fatture: FatturaEstratto[]
  saldo_insoluto: number
  totale_emesso: number
  fatture_pagate_count: number
}

// ─── GET /api/scadenzario/[cliente_id] ───────────────────────────────────────
// Estratto conto completo per un singolo cliente del laboratorio autenticato
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cliente_id: string }> }
) {
  const { cliente_id } = await params

  // Auth
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()

  // Recupera laboratorio_id
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id

  // Fetch cliente — verifica appartenenza al laboratorio
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

  // Fetch TUTTE le fatture del cliente (incluse pagate)
  const { data: fattureRaw, error: fattureError } = await svc
    .from('fatture')
    .select('id, numero, data, totale, stato_sdi, pagata')
    .eq('cliente_id', cliente_id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (fattureError) {
    return NextResponse.json({ error: fattureError.message }, { status: 500 })
  }

  const now = Date.now()

  // Calcola giorni_ritardo server-side + arricchisce le fatture
  const fatture: FatturaEstratto[] = (fattureRaw ?? []).map((f) => ({
    id: f.id,
    numero: f.numero,
    data: f.data,
    totale: f.totale ?? 0,
    stato_sdi: f.stato_sdi ?? 'draft',
    pagata: f.pagata ?? false,
    giorni_ritardo: Math.floor((now - new Date(f.data).getTime()) / 86_400_000),
  }))

  // Ordina: non pagate per giorni_ritardo desc, poi pagate per data desc
  const nonPagate = fatture
    .filter((f) => !f.pagata)
    .sort((a, b) => b.giorni_ritardo - a.giorni_ritardo)
  const pagate = fatture
    .filter((f) => f.pagata)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  const fattureOrdinate = [...nonPagate, ...pagate]

  // KPI aggregati
  const saldo_insoluto = nonPagate.reduce((sum, f) => sum + f.totale, 0)
  const totale_emesso = fatture.reduce((sum, f) => sum + f.totale, 0)
  const fatture_pagate_count = pagate.length

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
    fatture: fattureOrdinate,
    saldo_insoluto,
    totale_emesso,
    fatture_pagate_count,
  }

  return NextResponse.json(response)
}

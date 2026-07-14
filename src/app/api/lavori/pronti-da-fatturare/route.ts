import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { prezzoEffettivoLavoro } from '@/lib/domain/prezzo-lavoro'

export interface LavoroProntoFattura {
  id: string
  numero_lavoro: string
  cliente: {
    id: string
    nome: string
    cognome: string
    studio_nome: string | null
  } | null
  prezzo_unitario: number | null
  data_consegna_effettiva: string | null
}

// ─── GET /api/lavori/pronti-da-fatturare ──────────────────────────────────────
// Restituisce i lavori consegnati che non sono ancora stati inclusi in fattura.
// Criterio: stato = 'consegnato' AND incluso_in_fattura = false
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

  const { data, error } = await svc
    .from('lavori')
    .select(`
      id,
      numero_lavoro,
      prezzo_unitario,
      data_consegna_effettiva,
      cliente:clienti(id, nome, cognome, studio_nome),
      lavorazioni:lavori_lavorazioni(importo)
    `)
    .eq('laboratorio_id', labId)
    .eq('stato', 'consegnato')
    .eq('incluso_in_fattura', false)
    .eq('decisione_fatturazione', 'fatturare')
    .is('deleted_at', null)
    .order('data_consegna_effettiva', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type Row = {
    id: string
    numero_lavoro: string
    prezzo_unitario: number | null
    data_consegna_effettiva: string | null
    cliente: LavoroProntoFattura['cliente']
    lavorazioni: Array<{ importo: number | null }> | null
  }

  const lavori: LavoroProntoFattura[] = ((data ?? []) as unknown as Row[]).map((l) => ({
    id: l.id,
    numero_lavoro: l.numero_lavoro,
    cliente: l.cliente,
    prezzo_unitario: prezzoEffettivoLavoro(l),
    data_consegna_effettiva: l.data_consegna_effettiva,
  }))

  return NextResponse.json({ lavori })
}

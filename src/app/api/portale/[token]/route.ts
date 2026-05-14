import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import type { LavoroPortale, PortaleDentistaDati } from '@/types/domain'

type RouteContext = { params: Promise<{ token: string }> }

/**
 * PHI minimizzata: "ROSSI MARIO" → "R. MARIO"
 * La prima parola (cognome) viene abbreviata a prima lettera + punto.
 */
function minimizzaPhi(nomeSnapshot: string | null): string | null {
  if (!nomeSnapshot) return null
  const parti = nomeSnapshot.trim().split(/\s+/)
  if (parti.length < 2) return parti[0]?.[0] ? `${parti[0][0]}.` : null
  const cognomeAbbreviato = `${parti[0][0]}.`
  const resto = parti.slice(1).join(' ')
  return `${cognomeAbbreviato} ${resto}`
}

export async function GET(req: Request, { params }: RouteContext) {
  const { token } = await params

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token non valido' }, { status: 400 })
  }

  const svc = getServiceClient()

  // Verifica token — cerca il cliente con questo portale_token
  const { data: cliente, error: clienteError } = await svc
    .from('clienti')
    .select(`
      id,
      nome,
      cognome,
      studio_nome,
      laboratorio_id,
      portale_token,
      portale_token_scade_at
    `)
    .eq('portale_token', token)
    .is('deleted_at', null)
    .single()

  if (clienteError || !cliente) {
    return NextResponse.json({ error: 'Link non valido' }, { status: 404 })
  }

  // Verifica TTL token
  const scadenza = (cliente as Record<string, unknown>).portale_token_scade_at as string | null
  if (scadenza && new Date(scadenza) < new Date()) {
    return NextResponse.json({ error: 'Link scaduto' }, { status: 403 })
  }

  // Carica dati laboratorio
  const { data: lab } = await svc
    .from('laboratori')
    .select('nome, ragione_sociale, logo_url, telefono, email')
    .eq('id', cliente.laboratorio_id)
    .single()

  if (!lab) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 404 })
  }

  // Log accesso (IP da header x-forwarded-for)
  const ipRaw = req.headers.get('x-forwarded-for')
  const ip = ipRaw ? ipRaw.split(',')[0].trim() : null

  // Audit log accesso — campo corretto: azione (NOT NULL), created_at (auto)
  const { error: logErr } = await svc.from('portale_accessi').insert({
    cliente_id: cliente.id,
    laboratorio_id: cliente.laboratorio_id,
    ip_address: ip,
    azione: 'view_lavori',
  })
  if (logErr) console.error('[Portale API] Audit log failed:', logErr.message)

  // Lavori aperti
  const { data: lavoriAperti } = await svc
    .from('lavori')
    .select(`
      id,
      numero_lavoro,
      stato,
      tipo_dispositivo,
      descrizione,
      data_consegna_prevista,
      data_consegna_effettiva,
      paziente_nome_snapshot,
      conformato,
      spedizione_stato,
      spedizione_tracking
    `)
    .eq('cliente_id', cliente.id)
    .eq('laboratorio_id', cliente.laboratorio_id)
    .not('stato', 'in', '("consegnato","annullato")')
    .is('deleted_at', null)
    .order('data_consegna_prevista', { ascending: true })

  // Lavori consegnati (max 10)
  const { data: lavoriConsegnati } = await svc
    .from('lavori')
    .select(`
      id,
      numero_lavoro,
      stato,
      tipo_dispositivo,
      descrizione,
      data_consegna_prevista,
      data_consegna_effettiva,
      paziente_nome_snapshot,
      conformato,
      spedizione_stato,
      spedizione_tracking
    `)
    .eq('cliente_id', cliente.id)
    .eq('laboratorio_id', cliente.laboratorio_id)
    .eq('stato', 'consegnato')
    .is('deleted_at', null)
    .order('data_consegna_effettiva', { ascending: false })
    .limit(10)

  const mapLavoro = (l: Record<string, unknown>): LavoroPortale => ({
    id: l.id as string,
    numero_lavoro: l.numero_lavoro as string,
    stato: l.stato as LavoroPortale['stato'],
    tipo_dispositivo: l.tipo_dispositivo as LavoroPortale['tipo_dispositivo'],
    descrizione: l.descrizione as string,
    data_consegna_prevista: l.data_consegna_prevista as string,
    data_consegna_effettiva: (l.data_consegna_effettiva as string) ?? null,
    paziente_nome_snapshot: minimizzaPhi(l.paziente_nome_snapshot as string | null),
    conformato: l.conformato as boolean,
    ddc_signed_url: null, // URL firmato generato on demand — non disponibile in listing
    buono_signed_url: null,
    spedizione_stato: (l.spedizione_stato as LavoroPortale['spedizione_stato']) ?? null,
    spedizione_tracking: (l.spedizione_tracking as string) ?? null,
  })

  const risposta: PortaleDentistaDati = {
    laboratorio: {
      nome: lab.nome,
      ragione_sociale: lab.ragione_sociale,
      logo_url: lab.logo_url,
      telefono: lab.telefono,
      email: lab.email,
    },
    cliente: {
      id: cliente.id,
      nome: cliente.nome,
      cognome: cliente.cognome,
      studio_nome: cliente.studio_nome,
    },
    lavori_aperti: (lavoriAperti ?? []).map(mapLavoro),
    lavori_consegnati: (lavoriConsegnati ?? []).map(mapLavoro),
  }

  return NextResponse.json(risposta)
}

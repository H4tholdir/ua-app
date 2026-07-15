import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function GET(req: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  const labId: string = utente?.laboratorio_id ?? ''

  if (!labId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  // ── Parametri ─────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') ?? String(new Date().getFullYear())
  const dateFrom = `${year}-01-01`
  const dateTo = `${year}-12-31`

  // ── Fetch fatture ─────────────────────────────────────────────────────────────
  const { data: fatture, error } = await svc
    .from('fatture')
    .select(
      `
      numero,
      data,
      cliente_denominazione,
      cliente_cf,
      cliente_piva,
      imponibile,
      iva_importo,
      totale,
      bollo,
      stato_sdi,
      pagata,
      inviata_via,
      tipo_documento
    `
    )
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .gte('data', dateFrom)
    .lte('data', dateTo)
    .order('data', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Genera CSV ────────────────────────────────────────────────────────────────
  // BOM UTF-8 per compatibilità Excel italiano (apre correttamente i caratteri accentati)
  const BOM = '﻿'
  const SEP = ';' // punto-virgola per Excel IT

  const labelStatoSDI: Record<string, string> = {
    draft:          'Bozza',
    generata:       'XML Pronto',
    smtp_inviata:   'Inviata',
    pec_consegnata: 'Consegnata',
    ricevuta_sdi:   'Ricevuta SDI',
    accettata:      'Accettata',
    rifiutata:      'Rifiutata',
    scaduta:        'Scaduta',
  }

  const header = [
    'Numero Fattura',
    'Tipo Documento',
    'Data Emissione',
    'Cliente',
    'Cod. Fiscale',
    'Partita IVA',
    'Imponibile (€)',
    'IVA (€)',
    'Bollo (€)',
    'Totale (€)',
    'Stato SDI',
    'Pagata',
    'Canale Invio',
  ].join(SEP)

  const rows = (fatture ?? []).map((f) => {
    const cfPiva = f.cliente_piva ?? f.cliente_cf ?? ''
    // Escape per CSV: wrap in virgolette doppie, raddoppia le virgolette interne
    const escapeField = (val: string) => `"${val.replace(/"/g, '""')}"`
    // Task 5 (audit letture storno TD04, Gruppo B): il TD04 pesa come riga
    // negativa nel proprio mese di emissione — l'originale stornato NON
    // viene mai filtrato via (resta nel suo mese con l'importo originale,
    // invariato). `totale` in DB è sempre positivo anche per il TD04 (Task
    // 3/6): il segno si applica solo qui, in lettura, su tutti gli importi
    // monetari (coerenza contabile della riga, non solo del totale).
    const isTD04 = f.tipo_documento === 'TD04'
    const segno = isTD04 ? -1 : 1
    // Formatto numeri con virgola decimale per Excel IT
    const num = (n: number | null) =>
      ((n ?? 0) * segno).toFixed(2).replace('.', ',')

    return [
      f.numero ?? '',
      isTD04 ? 'Nota di Credito' : 'Fattura',
      f.data?.split('T')[0] ?? '',
      escapeField(f.cliente_denominazione ?? ''),
      f.cliente_cf ?? '',
      cfPiva,
      num(f.imponibile),
      num(f.iva_importo),
      num(f.bollo),
      num(f.totale),
      labelStatoSDI[f.stato_sdi ?? 'draft'] ?? f.stato_sdi ?? 'bozza',
      f.pagata ? 'Sì' : 'No',
      f.inviata_via === 'pec' ? 'PEC' : f.inviata_via === 'sdi_coop' ? 'SDI-Coop' : '',
    ].join(SEP)
  })

  const csv = BOM + [header, ...rows].join('\n')
  const filename = `fatture-${year}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

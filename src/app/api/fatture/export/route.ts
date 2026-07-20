import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { annoRoma } from '@/lib/utils/data-roma'
import { CSV_BOM, csvCell, csvNumIT, csvRiga } from '@/lib/utils/csv'
import { fetchAllPages, type PageResult } from '@/lib/utils/paginate'

type FatturaExportRow = {
  numero: string | null
  data: string | null
  cliente_denominazione: string | null
  cliente_cf: string | null
  cliente_piva: string | null
  imponibile: number | null
  iva_importo: number | null
  totale: number | null
  bollo: number | null
  stato_sdi: string | null
  pagata: boolean | null
  inviata_via: string | null
  tipo_documento: string | null
}

export async function GET(req: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const context = await getFreshLabContext()

  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  // N13: route ESENTE dalla guard (export GDPR/portabilità aperto a
  // sospeso/scaduto), ma blacklist resta terminale — self-check esplicito,
  // stesso pattern di stripe/checkout e stripe/portal. Il canale Art. 15/20
  // per i lab blacklist è il processo out-of-band (docs/security/).
  if (context.lab?.stato === 'blacklist') {
    return NextResponse.json({ error: 'Account disabilitato' }, { status: 403 })
  }

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  // ── Parametri ─────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') ?? String(annoRoma())
  const dateFrom = `${year}-01-01`
  const dateTo = `${year}-12-31`

  // ── Fetch fatture (a pagine: PostgREST tronca a 1000 righe in silenzio) ────────
  const { data: fatture, error } = await fetchAllPages<FatturaExportRow>(
    (from, to) =>
      svc
        .from('fatture')
        .select(
          `
          numero, data, cliente_denominazione, cliente_cf, cliente_piva,
          imponibile, iva_importo, totale, bollo, stato_sdi, pagata,
          inviata_via, tipo_documento
        `
        )
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .gte('data', dateFrom)
        .lte('data', dateTo)
        .order('data', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<FatturaExportRow>>
  )
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  // ── Genera CSV ────────────────────────────────────────────────────────────────
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

  const header = csvRiga([
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
  ])

  const rows = (fatture ?? []).map((f) => {
    const cfPiva = f.cliente_piva ?? f.cliente_cf ?? ''
    // Task 5 (audit letture storno TD04, Gruppo B): il TD04 pesa come riga
    // negativa nel proprio mese di emissione — l'originale stornato NON
    // viene mai filtrato via (resta nel suo mese con l'importo originale,
    // invariato). `totale` in DB è sempre positivo anche per il TD04 (Task
    // 3/6): il segno si applica solo qui, in lettura, su tutti gli importi
    // monetari (coerenza contabile della riga, non solo del totale).
    const isTD04 = f.tipo_documento === 'TD04'
    const segno = isTD04 ? -1 : 1

    return csvRiga([
      f.numero ?? '',
      isTD04 ? 'Nota di Credito' : 'Fattura',
      f.data?.split('T')[0] ?? '',
      csvCell(f.cliente_denominazione),
      f.cliente_cf ?? '',
      cfPiva,
      csvNumIT(f.imponibile, segno),
      csvNumIT(f.iva_importo, segno),
      csvNumIT(f.bollo, segno),
      csvNumIT(f.totale, segno),
      labelStatoSDI[f.stato_sdi ?? 'draft'] ?? f.stato_sdi ?? 'bozza',
      f.pagata ? 'Sì' : 'No',
      f.inviata_via === 'pec' ? 'PEC' : f.inviata_via === 'sdi_coop' ? 'SDI-Coop' : '',
    ])
  })

  const csv = CSV_BOM + [header, ...rows].join('\n')
  const filename = `fatture-${year}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

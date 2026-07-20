import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { annoRoma } from '@/lib/utils/data-roma'
import { CSV_BOM, csvCell, csvRiga } from '@/lib/utils/csv'
import { fetchAllPages, type PageResult } from '@/lib/utils/paginate'

type LavoroExportRow = {
  numero_lavoro: string | null
  created_at: string | null
  stato: string | null
  priorita: string | null
  tipo_dispositivo: string | null
  descrizione: string | null
  paziente_nome_snapshot: string | null
  data_consegna_prevista: string | null
  data_consegna_effettiva: string | null
  conformato: boolean | null
  incluso_in_fattura: boolean | null
  spedizione_stato: string | null
  spedizione_tracking: string | null
  cliente: { nome: string | null; cognome: string | null; studio_nome: string | null } | null
  tecnico: { nome: string | null; cognome: string | null } | null
}

export async function GET(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  // N13: route ESENTE dalla guard (export portabilità, aperto a
  // sospeso/scaduto come fatture/export) — blacklist resta terminale.
  if (context.lab?.stato === 'blacklist') {
    return NextResponse.json({ error: 'Account disabilitato' }, { status: 403 })
  }

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  // ── Parametri ─────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year') ?? ''
  const year = /^\d{4}$/.test(yearParam) ? Number(yearParam) : annoRoma()

  // ── Fetch (a pagine: PostgREST tronca a 1000 righe in silenzio) ───────────
  const { data: lavori, error } = await fetchAllPages<LavoroExportRow>(
    (from, to) =>
      svc
        .from('lavori')
        .select(
          `
          numero_lavoro, created_at, stato, priorita, tipo_dispositivo,
          descrizione, paziente_nome_snapshot, data_consegna_prevista,
          data_consegna_effettiva, conformato, incluso_in_fattura,
          spedizione_stato, spedizione_tracking,
          cliente:clienti(nome, cognome, studio_nome),
          tecnico:tecnici(nome, cognome)
        `
        )
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${year + 1}-01-01`)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<LavoroExportRow>>
  )
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  // ── Genera CSV ────────────────────────────────────────────────────────────
  const header = csvRiga([
    'Numero Lavoro', 'Data Creazione', 'Stato', 'Priorità', 'Tipo Dispositivo',
    'Descrizione', 'Cliente', 'Paziente', 'Tecnico', 'Consegna Prevista',
    'Consegna Effettiva', 'Conformato', 'Fatturato', 'Spedizione', 'Tracking',
  ])

  const rows = lavori.map((l) => {
    const cliente = l.cliente
      ? l.cliente.studio_nome || [l.cliente.cognome, l.cliente.nome].filter(Boolean).join(' ')
      : ''
    const tecnico = l.tecnico
      ? [l.tecnico.cognome, l.tecnico.nome].filter(Boolean).join(' ')
      : ''
    return csvRiga([
      csvCell(l.numero_lavoro),
      l.created_at?.split('T')[0] ?? '',
      csvCell(l.stato),
      csvCell(l.priorita),
      csvCell(l.tipo_dispositivo),
      csvCell(l.descrizione),
      csvCell(cliente),
      csvCell(l.paziente_nome_snapshot),
      csvCell(tecnico),
      l.data_consegna_prevista?.split('T')[0] ?? '',
      l.data_consegna_effettiva?.split('T')[0] ?? '',
      l.conformato ? 'Sì' : 'No',
      l.incluso_in_fattura ? 'Sì' : 'No',
      csvCell(l.spedizione_stato),
      csvCell(l.spedizione_tracking),
    ])
  })

  const csv = CSV_BOM + [header, ...rows].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="lavori-${year}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

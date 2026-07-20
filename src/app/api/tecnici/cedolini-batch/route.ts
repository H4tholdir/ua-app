// Bundle E (A16): cedolini di tutto il lab in un unico CSV — GUARDED N13
// (assertLabOperativo, non è nell'allowlist esenzioni), RBAC solo
// titolare/admin_rete (il singolo tecnico usa GET /api/tecnici/[id]/cedolino
// che espone solo il proprio compenso; qui c'è quello di TUTTI i tecnici).
import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { oggiRomaISO } from '@/lib/utils/data-roma'
import { meseBoundaries } from '@/lib/utils/mese'
import { CSV_BOM, csvCell, csvNumIT, csvRiga } from '@/lib/utils/csv'
import { fetchAllPages, type PageResult } from '@/lib/utils/paginate'

type RigaBatch = {
  quantita: number
  lavori: {
    tecnico_id: string | null
    tecnici: { nome: string | null; cognome: string | null } | null
  } | null
  listino: { nome: string; compenso_tecnico: number | null } | null
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

  const guard = assertLabOperativo(context, 'GET')
  if (guard) return guard

  // ── RBAC: il batch espone i compensi di TUTTI i tecnici ───────────────────
  // (il singolo tecnico usa GET /api/tecnici/[id]/cedolino)
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  // ── Parametri ─────────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const meseParam = searchParams.get('mese') ?? ''
  const mese = /^\d{4}-\d{2}$/.test(meseParam) ? meseParam : oggiRomaISO().slice(0, 7)
  const { from: dal, to: al } = meseBoundaries(mese)

  // ── Fetch (a pagine, tiebreaker id) ───────────────────────────────────────
  const { data: righe, error } = await fetchAllPages<RigaBatch>(
    (from, to) =>
      svc
        .from('lavori_lavorazioni')
        .select(
          `
          quantita,
          lavori!inner(tecnico_id, tecnici(nome, cognome), stato, laboratorio_id, data_consegna_effettiva),
          listino!inner(nome, compenso_tecnico)
        `
        )
        .eq('laboratorio_id', labId)
        .eq('lavori.laboratorio_id', labId)
        .eq('lavori.stato', 'consegnato')
        .gte('lavori.data_consegna_effettiva', dal)
        .lt('lavori.data_consegna_effettiva', al)
        .not('lavori.tecnico_id', 'is', null)
        .not('listino.compenso_tecnico', 'is', null)
        .order('id', { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<RigaBatch>>
  )
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  // ── Aggregazione per tecnico × voce listino ───────────────────────────────
  type Voce = { tecnico: string; voce: string; quantita: number; compensoUnitario: number }
  const agg = new Map<string, Voce>()
  for (const r of righe) {
    const tecnicoId = r.lavori?.tecnico_id
    const voce = r.listino?.nome
    if (!tecnicoId || !voce) continue
    const tecnico =
      [r.lavori?.tecnici?.cognome, r.lavori?.tecnici?.nome].filter(Boolean).join(' ') || tecnicoId
    const key = `${tecnicoId}::${voce}`
    const cur = agg.get(key)
    if (cur) {
      cur.quantita += r.quantita
    } else {
      agg.set(key, {
        tecnico,
        voce,
        quantita: r.quantita,
        compensoUnitario: r.listino?.compenso_tecnico ?? 0,
      })
    }
  }

  // ── Genera CSV ────────────────────────────────────────────────────────────
  const header = csvRiga([
    'Tecnico', 'Voce Listino', 'Quantità', 'Compenso Unitario (€)', 'Compenso Totale (€)',
  ])
  const rows = Array.from(agg.values())
    .sort((a, b) => a.tecnico.localeCompare(b.tecnico, 'it') || a.voce.localeCompare(b.voce, 'it'))
    .map((v) =>
      csvRiga([
        csvCell(v.tecnico),
        csvCell(v.voce),
        String(v.quantita),
        csvNumIT(v.compensoUnitario),
        csvNumIT(v.compensoUnitario * v.quantita),
      ])
    )

  const csv = CSV_BOM + [header, ...rows].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cedolini-${mese}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

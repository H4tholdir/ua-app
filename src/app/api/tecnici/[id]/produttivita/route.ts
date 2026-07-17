import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LavorazioneComp {
  lavoro_id: string
  numero_lavoro: string
  nome_lavorazione: string
  quantita: number
  compenso_unitario: number
  compenso_totale: number
  data_consegna: string
}

export interface MeseComp {
  mese: string   // es. "2026-02"
  compenso: number
  label: string  // es. "Feb"
}

export interface ProduttivitaResponse {
  tecnico: { id: string; nome: string; cognome: string }
  mese: string
  lavori_completati: number
  puntualita_pct: number
  compenso_maturato: number
  lavorazioni_dettaglio: LavorazioneComp[]
  storico_4_mesi: MeseComp[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESI_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

/** Calcola i boundaries di un mese tipo "2026-05" → { from, to } ISO date strings */
function meseBoundaries(mese: string): { from: string; to: string } {
  const [year, month] = mese.split('-').map(Number)
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to   = new Date(Date.UTC(year, month, 1))
  return {
    from: from.toISOString().split('T')[0],
    to:   to.toISOString().split('T')[0],
  }
}

/** Restituisce array degli ultimi 4 mesi (corrente + 3 precedenti) in "YYYY-MM" */
function ultimi4Mesi(meseCorrente: string): string[] {
  const [year, month] = meseCorrente.split('-').map(Number)
  const result: string[] = []
  for (let i = 3; i >= 0; i--) {
    let m = month - i
    let y = year
    while (m <= 0) { m += 12; y-- }
    result.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return result
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tecnicoId } = await params
  const { searchParams } = new URL(req.url)

  // Validazione parametro mese (YYYY-MM)
  const meseParam = searchParams.get('mese')
  const meseCorrente = new Date().toISOString().slice(0, 7) // Europe/UTC-safe default
  let mese = meseParam ?? meseCorrente
  if (!/^\d{4}-\d{2}$/.test(mese)) mese = meseCorrente

  // Nome parametro `timing` (non `t`, come nel pattern brief) per evitare lo
  // shadowing col `to: t` destrutturato più sotto in meseBoundaries().
  return withServerTiming(async (timing) => {
    // ─── Auth ────────────────────────────────────────────────────────────────
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(timing, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }

    // Guard PRIMA di qualsiasi query (il check RBAC sotto interroga già il DB)
    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard

    const labId: string = context.laboratorioId
    const svc = getServiceClient()

    // ─── RBAC ─────────────────────────────────────────────────────────────────
    // Il tecnico può vedere SOLO la propria produttività.
    // Il titolare / admin_rete può vedere qualsiasi tecnico del proprio lab.
    if (context.ruolo === 'tecnico') {
      const { data: mioTecnico } = await svc
        .from('tecnici')
        .select('id')
        .eq('laboratorio_id', labId)
        .eq('utente_id', context.userId)
        .is('deleted_at', null)
        .maybeSingle()

      if (!mioTecnico || mioTecnico.id !== tecnicoId) {
        return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
      }
    } else if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // ─── Dati tecnico ─────────────────────────────────────────────────────────
    const { data: tecnico } = await svc
      .from('tecnici')
      .select('id, nome, cognome, compenso_base')
      .eq('id', tecnicoId)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .single()

    if (!tecnico) {
      return NextResponse.json({ error: 'Tecnico non trovato' }, { status: 404 })
    }

    const { from, to } = meseBoundaries(mese)

    // ─── Lavori completati nel mese ───────────────────────────────────────────
    const { data: lavoriMese, error: lavoriError } = await svc
      .from('lavori')
      .select('id, data_consegna_effettiva, data_consegna_prevista')
      .eq('laboratorio_id', labId)
      .eq('tecnico_id', tecnicoId)
      .eq('stato', 'consegnato')
      .is('deleted_at', null)
      .gte('data_consegna_effettiva', from)
      .lt('data_consegna_effettiva', to)

    if (lavoriError) {
      return NextResponse.json({ error: lavoriError.message }, { status: 500 })
    }

    const lavoriCompletati = lavoriMese?.length ?? 0

    // ─── Puntualità ────────────────────────────────────────────────────────────
    let inTempo = 0
    for (const lav of lavoriMese ?? []) {
      if (
        lav.data_consegna_effettiva &&
        lav.data_consegna_prevista &&
        lav.data_consegna_effettiva <= lav.data_consegna_prevista
      ) {
        inTempo++
      }
    }
    const puntualitaPct = lavoriCompletati > 0
      ? Math.round((inTempo / lavoriCompletati) * 100)
      : 0

    // ─── Lavorazioni con compenso (ultime 10 del mese) ────────────────────────
    const { data: lavorazioniRaw } = await svc
      .from('lavori_lavorazioni')
      .select(`
        id,
        quantita,
        lavori!inner(
          id,
          numero_lavoro,
          data_consegna_effettiva,
          stato,
          tecnico_id,
          laboratorio_id
        ),
        listino!inner(
          nome,
          compenso_tecnico
        )
      `)
      .eq('laboratorio_id', labId)
      .eq('lavori.tecnico_id', tecnicoId)
      .eq('lavori.stato', 'consegnato')
      .eq('lavori.laboratorio_id', labId)
      .gte('lavori.data_consegna_effettiva', from)
      .lt('lavori.data_consegna_effettiva', to)
      .not('listino.compenso_tecnico', 'is', null)
      .order('lavori.data_consegna_effettiva', { ascending: false })
      .limit(10)

    // Calcola compenso totale dal mese
    // (fetch tutte le lavorazioni con compenso, non solo ultime 10, per il totale)
    const { data: tutteConCompensoCrudi } = await svc
      .from('lavori_lavorazioni')
      .select(`
        quantita,
        lavori!inner(
          stato,
          tecnico_id,
          laboratorio_id,
          data_consegna_effettiva
        ),
        listino!inner(
          compenso_tecnico
        )
      `)
      .eq('laboratorio_id', labId)
      .eq('lavori.tecnico_id', tecnicoId)
      .eq('lavori.stato', 'consegnato')
      .eq('lavori.laboratorio_id', labId)
      .gte('lavori.data_consegna_effettiva', from)
      .lt('lavori.data_consegna_effettiva', to)
      .not('listino.compenso_tecnico', 'is', null)

    // Tipo delle righe raw
    type LavoriJoin = { id: string; numero_lavoro: string; data_consegna_effettiva: string | null; stato: string; tecnico_id: string | null; laboratorio_id: string }
    type ListinoJoin = { nome: string; compenso_tecnico: number | null }
    type LavCompRow = { id: string; quantita: number; lavori: LavoriJoin; listino: ListinoJoin }
    type TotRow = { quantita: number; lavori: { stato: string; tecnico_id: string | null; laboratorio_id: string; data_consegna_effettiva: string | null }; listino: { compenso_tecnico: number | null } }

    let compensoMaturato = 0
    for (const r of (tutteConCompensoCrudi ?? []) as unknown as TotRow[]) {
      const comp = r.listino?.compenso_tecnico ?? 0
      compensoMaturato += comp * (r.quantita ?? 1)
    }

    const lavorazioniDettaglio: LavorazioneComp[] = ((lavorazioniRaw ?? []) as unknown as LavCompRow[]).map((r) => ({
      lavoro_id: r.lavori.id,
      numero_lavoro: r.lavori.numero_lavoro,
      nome_lavorazione: r.listino.nome,
      quantita: r.quantita,
      compenso_unitario: r.listino.compenso_tecnico ?? 0,
      compenso_totale: (r.listino.compenso_tecnico ?? 0) * r.quantita,
      data_consegna: r.lavori.data_consegna_effettiva ?? '',
    }))

    // ─── Storico 4 mesi ───────────────────────────────────────────────────────
    // Corrente + 3 precedenti. Mese corrente = primo degli ultimi 4.
    const mesiList = ultimi4Mesi(mese)

    const storico4Mesi: MeseComp[] = await Promise.all(
      mesiList.map(async (m) => {
        const { from: f, to: t } = meseBoundaries(m)
        const [, mm] = m.split('-').map(Number)
        const label = MESI_IT[mm - 1] ?? m

        const { data: rowsM } = await svc
          .from('lavori_lavorazioni')
          .select(`
            quantita,
            lavori!inner(
              stato,
              tecnico_id,
              laboratorio_id,
              data_consegna_effettiva
            ),
            listino!inner(
              compenso_tecnico
            )
          `)
          .eq('laboratorio_id', labId)
          .eq('lavori.tecnico_id', tecnicoId)
          .eq('lavori.stato', 'consegnato')
          .eq('lavori.laboratorio_id', labId)
          .gte('lavori.data_consegna_effettiva', f)
          .lt('lavori.data_consegna_effettiva', t)
          .not('listino.compenso_tecnico', 'is', null)

        let comp = 0
        for (const r of (rowsM ?? []) as unknown as TotRow[]) {
          comp += (r.listino?.compenso_tecnico ?? 0) * (r.quantita ?? 1)
        }

        return { mese: m, compenso: comp, label }
      })
    )

    const response: ProduttivitaResponse = {
      tecnico: { id: tecnico.id, nome: tecnico.nome, cognome: tecnico.cognome },
      mese,
      lavori_completati: lavoriCompletati,
      puntualita_pct: puntualitaPct,
      compenso_maturato: compensoMaturato,
      lavorazioni_dettaglio: lavorazioniDettaglio,
      storico_4_mesi: storico4Mesi,
    }

    return NextResponse.json(response)
  })
}

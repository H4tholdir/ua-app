import 'server-only'
import { createElement } from 'react'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import {
  CedolinoTecnicoTemplate,
  type LavorazioneCedolino,
} from '@/components/features/pdf/CedolinoTecnicoTemplate'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function meseBoundaries(mese: string): { from: string; to: string } {
  const [year, month] = mese.split('-').map(Number)
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to   = new Date(Date.UTC(year, month, 1))
  return {
    from: from.toISOString().split('T')[0],
    to:   to.toISOString().split('T')[0],
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function generateCedolinoTecnico(
  tecnico_id: string,
  laboratorio_id: string,
  mese: string  // es. "2026-05"
): Promise<Buffer> {
  const svc = getTypedServiceClient()

  // Dati laboratorio
  const { data: lab } = await svc
    .from('laboratori')
    .select('nome, ragione_sociale, indirizzo, cap, citta, provincia, codice_itca, prrc_nome')
    .eq('id', laboratorio_id)
    .single()
  if (!lab) throw new Error('Laboratorio non trovato')

  // Dati tecnico
  const { data: tecnico } = await svc
    .from('tecnici')
    .select('nome, cognome')
    .eq('id', tecnico_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .single()
  if (!tecnico) throw new Error('Tecnico non trovato')

  const { from, to } = meseBoundaries(mese)

  // Lavorazioni con compenso del tecnico nel mese
  // Aggrega per voce listino per evitare righe duplicate in PDF
  type RawRow = {
    quantita: number
    lavori: {
      stato: string
      tecnico_id: string | null
      laboratorio_id: string
      data_consegna_effettiva: string | null
    }
    listino: {
      nome: string
      compenso_tecnico: number | null
    }
  }

  const { data: rawRows, error } = await svc
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
        nome,
        compenso_tecnico
      )
    `)
    .eq('laboratorio_id', laboratorio_id)
    .eq('lavori.tecnico_id', tecnico_id)
    .eq('lavori.stato', 'consegnato')
    .eq('lavori.laboratorio_id', laboratorio_id)
    .gte('lavori.data_consegna_effettiva', from)
    .lt('lavori.data_consegna_effettiva', to)
    .not('listino.compenso_tecnico', 'is', null)

  if (error) throw new Error(`Errore query lavorazioni: ${error.message}`)

  // Aggrega per nome lavorazione
  const aggMap = new Map<string, LavorazioneCedolino>()
  for (const r of (rawRows ?? []) as unknown as RawRow[]) {
    const nome = r.listino.nome
    const cu   = r.listino.compenso_tecnico ?? 0
    if (aggMap.has(nome)) {
      const existing = aggMap.get(nome)!
      existing.quantita       += r.quantita
      existing.compenso_totale = existing.quantita * cu
    } else {
      aggMap.set(nome, {
        nome_lavorazione: nome,
        quantita: r.quantita,
        compenso_unitario: cu,
        compenso_totale: cu * r.quantita,
      })
    }
  }

  const lavorazioni = Array.from(aggMap.values())
  const totale = lavorazioni.reduce((s, l) => s + l.compenso_totale, 0)

  const labPdf = {
    ragione_sociale: lab.ragione_sociale,
    nome: lab.nome,
    indirizzo: lab.indirizzo,
    cap: lab.cap,
    citta: lab.citta,
    provincia: lab.provincia,
    codice_itca: lab.codice_itca,
    titolare_nome: lab.prrc_nome ?? null,
  }

  const element = createElement(CedolinoTecnicoTemplate, { tecnico, lab: labPdf, mese, lavorazioni, totale })
  return renderPdfDocument(element)
}

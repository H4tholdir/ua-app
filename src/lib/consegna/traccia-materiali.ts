// src/lib/consegna/traccia-materiali.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LavoroDettaglio, LavoroMateriale, MaterialeIncompletoDettaglio } from '@/types/domain'
import { selezionaLottiFefo, type LottoDisponibile } from './materiali-fefo'

export interface RisultatoTracciamento {
  tracciabilitaOk: boolean
  dettaglio: MaterialeIncompletoDettaglio[]
  materialiTracciati: LavoroMateriale[]
}

/**
 * Risolve la tracciabilità materiali/lotti per un lavoro, PRIMA della
 * generazione della DdC (B1 — Allegato XIII MDR).
 *
 * Per ogni lavorazione con BOM (listino_materiali_auto):
 * - traccia_lotto=true  → risolve lotto via FEFO, insert in lavori_materiali
 *   (alimenta la DdC). Nessun lotto disponibile → flag 'lotto_assente'.
 * - traccia_lotto=false → decremento diretto via scarichi_magazzino +
 *   decrementa_scorta (comportamento pre-esistente, invariato). Nessun flag.
 *
 * Nessuna BOM definita per la lavorazione → flag 'bom_mancante'.
 * Errori DB imprevisti non bloccano mai la consegna (soft-block):
 * vengono loggati e trattati come riga flaggata.
 */
export async function tracciaMaterialiLavoro(
  supabase: SupabaseClient,
  lavoro: LavoroDettaglio,
  laboratorio_id: string
): Promise<RisultatoTracciamento> {
  const dettaglio: MaterialeIncompletoDettaglio[] = []
  const materialiEsistenti = lavoro.materiali ?? []
  const magazziniGiaTracciati = new Set(materialiEsistenti.map((m) => m.magazzino_id))
  const nuoviMateriali: LavoroMateriale[] = []

  for (const lav of lavoro.lavorazioni ?? []) {
    if (!lav.listino_id) continue

    const { data: bomItems, error: bomError } = await supabase
      .from('listino_materiali_auto')
      .select('magazzino_id, quantita_per_unita, unita_misura')
      .eq('listino_id', lav.listino_id)
      .eq('laboratorio_id', laboratorio_id)

    if (bomError) {
      console.error('[TRACCIA-MATERIALI] Errore caricamento BOM:', bomError.message)
      dettaglio.push({ magazzino_id: null, nome_materiale: lav.descrizione, motivo: 'bom_mancante' })
      continue
    }

    if (!bomItems || bomItems.length === 0) {
      dettaglio.push({ magazzino_id: null, nome_materiale: lav.descrizione, motivo: 'bom_mancante' })
      continue
    }

    for (const bom of bomItems as Array<{ magazzino_id: string; quantita_per_unita: number; unita_misura: string }>) {
      try {
        const quantitaNecessaria = Number(bom.quantita_per_unita) * Number(lav.quantita)

        const { data: articolo, error: artErr } = await supabase
          .from('magazzino')
          .select('nome, produttore, traccia_lotto')
          .eq('id', bom.magazzino_id)
          .eq('laboratorio_id', laboratorio_id)
          .single()

        if (artErr || !articolo) {
          throw new Error(artErr?.message ?? 'Articolo magazzino non trovato')
        }

        const art = articolo as { nome: string; produttore: string | null; traccia_lotto: boolean }

        if (!art.traccia_lotto) {
          // Ramo B — non MDR-rilevante: meccanismo esistente invariato
          const { error: scarErr } = await supabase
            .from('scarichi_magazzino')
            .insert({
              laboratorio_id,
              lavoro_id: lavoro.id,
              magazzino_id: bom.magazzino_id,
              quantita: quantitaNecessaria,
              unita_misura: bom.unita_misura,
            })

          if (scarErr && (scarErr as { code?: string }).code === '23505') continue // già scaricato in un ciclo precedente
          if (scarErr) throw new Error(scarErr.message)

          const { error: decreErr } = await supabase.rpc('decrementa_scorta', {
            p_magazzino_id: bom.magazzino_id,
            p_laboratorio_id: laboratorio_id,
            p_quantita: quantitaNecessaria,
          })
          if (decreErr) console.error('[TRACCIA-MATERIALI] decrementa_scorta failed:', decreErr.message)
          continue
        }

        // Ramo A — MDR-rilevante
        if (magazziniGiaTracciati.has(bom.magazzino_id)) continue // idempotenza su retry consegna

        const { data: lotti, error: lottiErr } = await supabase
          .from('lotti_magazzino')
          .select('id, numero_lotto, quantita_residua, data_scadenza, data_acquisto')
          .eq('magazzino_id', bom.magazzino_id)
          .eq('laboratorio_id', laboratorio_id)
          .eq('attivo', true)
          .gt('quantita_residua', 0)

        if (lottiErr) {
          console.error('[TRACCIA-MATERIALI] Errore query lotti_magazzino:', lottiErr.message)
        }

        const lottiDisponibili: LottoDisponibile[] = ((lotti ?? []) as Array<{
          id: string
          numero_lotto: string
          quantita_residua: number
          data_scadenza: string | null
          data_acquisto: string | null
        }>).map((l) => ({
          id: l.id,
          numero_lotto: l.numero_lotto,
          quantita_residua: Number(l.quantita_residua),
          data_scadenza: l.data_scadenza,
          data_acquisto: l.data_acquisto,
        }))

        const { consumi, quantitaMancante } = selezionaLottiFefo(lottiDisponibili, quantitaNecessaria)

        for (const consumo of consumi) {
          const { data: inserted, error: insErr } = await supabase
            .from('lavori_materiali')
            .insert({
              laboratorio_id,
              lavoro_id: lavoro.id,
              lotto_id: consumo.lotto_id,
              magazzino_id: bom.magazzino_id,
              quantita_usata: consumo.quantita,
              unita_misura: bom.unita_misura,
              numero_lotto_snapshot: consumo.numero_lotto,
              nome_materiale_snapshot: art.nome,
              produttore_snapshot: art.produttore,
            })
            .select()
            .single()

          if (insErr) {
            console.error('[TRACCIA-MATERIALI] Errore insert lavori_materiali:', insErr.message)
            dettaglio.push({ magazzino_id: bom.magazzino_id, nome_materiale: art.nome, motivo: 'lotto_assente' })
            continue
          }
          if (inserted) nuoviMateriali.push(inserted as LavoroMateriale)
        }

        if (quantitaMancante > 0) {
          dettaglio.push({ magazzino_id: bom.magazzino_id, nome_materiale: art.nome, motivo: 'lotto_assente' })
        }
      } catch (err) {
        console.error('[TRACCIA-MATERIALI] Errore su riga BOM', bom.magazzino_id, err)
        dettaglio.push({ magazzino_id: bom.magazzino_id, nome_materiale: 'sconosciuto', motivo: 'lotto_assente' })
      }
    }
  }

  return {
    tracciabilitaOk: dettaglio.length === 0,
    dettaglio,
    materialiTracciati: [...materialiEsistenti, ...nuoviMateriali],
  }
}

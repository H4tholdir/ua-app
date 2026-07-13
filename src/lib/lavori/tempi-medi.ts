import type { SupabaseClient } from '@supabase/supabase-js'
import { inizioGiorno, aggiungiGiorni } from '@/lib/date/giorni'
import { TIPI_LAVORO, labelTipo } from '@/lib/domain/tipi-lavoro'

export type CampioneConsegna = {
  descrizione: string | null
  tipo_dispositivo: string
  data_ingresso: string
  data_consegna_effettiva: string
}

const MS_GIORNO = 86_400_000

// Le colonne sono TIMESTAMPTZ reali (con orario), non DATE: il diff su
// .getTime() grezzi misurerebbe tempo trascorso, non giorni di calendario
// (ingresso 08:00 + consegna 5 giorni dopo alle 21:00 → 5,54 → round 6).
// Normalizzando ENTRAMBI a mezzanotte locale con inizioGiorno (W7) il delta
// conta giorni di calendario; il Math.round resta necessario SOLO per
// assorbire l'ora di scarto ai confini DST (il giorno del cambio ora dura
// 23h/25h reali anche tra due mezzanotte locali).
function deltaGiorni(campione: CampioneConsegna): number {
  const ingresso = inizioGiorno(new Date(campione.data_ingresso)).getTime()
  const consegna = inizioGiorno(new Date(campione.data_consegna_effettiva)).getTime()
  return Math.round((consegna - ingresso) / MS_GIORNO)
}

function mediaGiorni(campioni: CampioneConsegna[]): number {
  const somma = campioni.reduce((acc, c) => acc + deltaGiorni(c), 0)
  const media = Math.round(somma / campioni.length)
  return Math.max(1, media)
}

/**
 * Cascata di stima consegna (spec §8): per ogni tipo della tassonomia
 * (a) media dei campioni granulari (descrizione === labelTipo(t)) se ≥ 5;
 * (b) altrimenti media dei campioni macro (tipo_dispositivo === t.macro) se ≥ 5;
 * (c) altrimenti t.giorniFallback. Funzione PURA — nessuna chiamata a rete.
 */
export function calcolaGiorniPerTipo(
  campioni: CampioneConsegna[]
): Record<string, { giorni: number; daStoria: boolean }> {
  const risultato: Record<string, { giorni: number; daStoria: boolean }> = {}

  for (const t of TIPI_LAVORO) {
    const label = labelTipo(t)
    const granulari = campioni.filter((c) => c.descrizione === label)

    if (granulari.length >= 5) {
      risultato[t.id] = { giorni: mediaGiorni(granulari), daStoria: true }
      continue
    }

    const macro = campioni.filter((c) => c.tipo_dispositivo === t.macro)

    if (macro.length >= 5) {
      risultato[t.id] = { giorni: mediaGiorni(macro), daStoria: true }
      continue
    }

    risultato[t.id] = { giorni: t.giorniFallback, daStoria: false }
  }

  return risultato
}

/**
 * Data di consegna suggerita: `oggi + giorni`, con l'unica correzione che se
 * il risultato cade di domenica slitta a lunedì (+1). Nessun altro giorno
 * della settimana viene spostato (spec §8).
 */
export function dataSuggerita(giorni: number, oggi: Date = new Date()): Date {
  const base = inizioGiorno(oggi)
  const risultato = aggiungiGiorni(base, giorni)
  return risultato.getDay() === 0 ? aggiungiGiorni(risultato, 1) : risultato
}

/**
 * Campioni storici per la stima consegna: lavori consegnati (stato
 * 'consegnato', data_consegna_effettiva valorizzata) del laboratorio, non
 * cancellati. Fail-closed (prassi post-Ondata 3): un errore di lettura non
 * deve degradare silenziosamente in "nessuno storico" (cascata (c) su tutti i
 * tipi) — il chiamante deve saperlo e propagare un errore.
 */
export async function fetchCampioniConsegna(
  svc: SupabaseClient,
  labId: string
): Promise<CampioneConsegna[]> {
  const { data, error } = await svc
    .from('lavori')
    .select('descrizione, tipo_dispositivo, data_ingresso, data_consegna_effettiva')
    .eq('laboratorio_id', labId)
    .eq('stato', 'consegnato')
    .not('data_consegna_effettiva', 'is', null)
    .is('deleted_at', null)

  if (error) throw new Error(`[tempi medi] lettura campioni consegna: ${error.message}`)

  return (data ?? []) as unknown as CampioneConsegna[]
}

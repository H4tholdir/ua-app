const DECISIONI_VALIDE = ['in_attesa', 'fatturare', 'non_fatturare'] as const

export interface EsitoValidazioneDecisione {
  ok: boolean
  errore?: string
}

/**
 * Regole PATCH /api/lavori/[id]/decisione-fatturazione (spec B2 §"Flusso operativo").
 * Immutabile una volta incluso_in_fattura=true, consentita solo su pronto/consegnato.
 */
export function validaDecisioneFatturazione(
  decisione: string,
  stato: string,
  inclusoInFattura: boolean
): EsitoValidazioneDecisione {
  if (!DECISIONI_VALIDE.includes(decisione as (typeof DECISIONI_VALIDE)[number])) {
    return { ok: false, errore: 'Campo `decisione` non valido' }
  }
  if (inclusoInFattura) {
    return { ok: false, errore: 'Decisione immutabile: lavoro già incluso in fattura' }
  }
  if (stato !== 'pronto' && stato !== 'consegnato') {
    return { ok: false, errore: 'Decisione fatturazione consentita solo su lavori pronto o consegnato' }
  }
  return { ok: true }
}

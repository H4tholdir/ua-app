import type { SupabaseClient } from '@supabase/supabase-js'
import { calcolaResiduo, calcolaEccedenza } from './saldo'

export interface RegistraPagamentoInput {
  laboratorio_id: string
  fattura_id: string | null
  lavoro_id: string | null
  importo: number
  metodo: string
  metodo_nota: string | null
  data_pagamento: string
  registrato_da: string
  sostituisce_pagamento_id?: string | null
}

export interface RegistraPagamentoResult {
  ok: boolean
  errore?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pagamento?: any
  eccedenza?: number
  /** Presente se il pagamento è stato registrato ma la riga di eccedenza NON è
   * stata scritta (le due insert non sono in una transazione — vedi Step 3
   * sotto) — richiede riconciliazione manuale, non silenziare. */
  avviso?: string
}

/**
 * Registra un pagamento (fattura XOR lavoro diretto) e genera automaticamente
 * un movimento 'eccedenza' se l'importo supera il residuo pre-esistente
 * (spec B2 §"Flusso operativo"). Condivisa da POST /api/pagamenti e dal
 * ramo "nuovo pagamento" di PATCH /api/pagamenti/[id] (modifica-come-sostituzione).
 */
export async function eseguiRegistrazionePagamento(
  supabase: SupabaseClient,
  input: RegistraPagamentoInput
): Promise<RegistraPagamentoResult> {
  const { laboratorio_id, fattura_id, lavoro_id, importo, metodo, metodo_nota, data_pagamento, registrato_da, sostituisce_pagamento_id } = input

  if ((fattura_id == null) === (lavoro_id == null)) {
    return { ok: false, errore: 'Specificare esattamente uno tra fattura_id e lavoro_id' }
  }
  if (!(importo > 0)) {
    return { ok: false, errore: 'Importo deve essere positivo' }
  }

  let importoDovuto: number
  let clienteId: string

  if (fattura_id) {
    const { data: fattura, error } = await supabase
      .from('fatture')
      .select('id, totale, cliente_id')
      .eq('id', fattura_id)
      .eq('laboratorio_id', laboratorio_id)
      .is('deleted_at', null)
      .single()
    if (error || !fattura) return { ok: false, errore: 'Fattura non trovata' }
    importoDovuto = Number((fattura as { totale: number }).totale)
    clienteId = (fattura as { cliente_id: string }).cliente_id
  } else {
    const { data: lavoro, error } = await supabase
      .from('lavori')
      .select('id, prezzo_unitario, cliente_id')
      .eq('id', lavoro_id as string)
      .eq('laboratorio_id', laboratorio_id)
      .is('deleted_at', null)
      .single()
    if (error || !lavoro) return { ok: false, errore: 'Lavoro non trovato' }
    importoDovuto = Number((lavoro as { prezzo_unitario: number | null }).prezzo_unitario ?? 0)
    clienteId = (lavoro as { cliente_id: string }).cliente_id
  }

  const filtroCol = fattura_id ? 'fattura_id' : 'lavoro_id'
  const filtroVal = (fattura_id ?? lavoro_id) as string

  const { data: pagamentiAttiviRaw } = await supabase
    .from('pagamenti')
    .select('importo')
    .eq(filtroCol, filtroVal)
    .eq('stato', 'attivo')

  const { data: applicazioniRaw } = await supabase
    .from('credito_clienti_movimenti')
    .select('importo')
    .eq(filtroCol, filtroVal)
    .eq('tipo', 'applicazione')

  const pagamentiAttivi = (pagamentiAttiviRaw ?? []) as Array<{ importo: number }>
  const applicazioni = (applicazioniRaw ?? []) as Array<{ importo: number }>

  // Clamp a 0: se il target è già in overpayment (residuo negativo da un
  // pagamento precedente, la cui eccedenza è già stata estratta come riga
  // separata in credito_clienti_movimenti), un nuovo pagamento su questo
  // stesso target NON deve "riassorbire" quel negativo — altrimenti l'intero
  // importo precedente verrebbe ricontato come eccedenza una seconda volta
  // (finding di review su Task 4: calcolaEccedenza assume residuoPreEsistente >= 0).
  const residuoPreEsistente = Math.max(0, calcolaResiduo(importoDovuto, pagamentiAttivi, applicazioni))
  const eccedenza = calcolaEccedenza(importo, residuoPreEsistente)

  const { data: pagamento, error: insErr } = await supabase
    .from('pagamenti')
    .insert({
      laboratorio_id,
      fattura_id,
      lavoro_id,
      importo,
      metodo,
      metodo_nota,
      data_pagamento,
      registrato_da,
      sostituisce_pagamento_id: sostituisce_pagamento_id ?? null,
    })
    .select()
    .single()

  if (insErr || !pagamento) {
    return { ok: false, errore: insErr?.message ?? 'Errore inserimento pagamento' }
  }

  if (eccedenza > 0) {
    // Non è una transazione con l'insert sopra: se questa fallisce, il
    // pagamento resta comunque registrato (è la fonte di verità del denaro
    // incassato) ma l'eccedenza andrebbe persa silenziosamente. Fix (review
    // Task 7): controlla l'errore e restituiscilo come avviso esplicito,
    // MAI ok:false — il pagamento è comunque riuscito.
    const { error: eccErr } = await supabase.from('credito_clienti_movimenti').insert({
      laboratorio_id,
      cliente_id: clienteId,
      tipo: 'eccedenza',
      pagamento_id: (pagamento as { id: string }).id,
      importo: eccedenza,
      registrato_da,
    })

    if (eccErr) {
      return {
        ok: true,
        pagamento,
        eccedenza,
        avviso: `Pagamento registrato ma la registrazione del credito di ${eccedenza} è fallita (${eccErr.message}) — richiede riconciliazione manuale.`,
      }
    }
  }

  return { ok: true, pagamento, eccedenza }
}

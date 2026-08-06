import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { ESITI } from '@/lib/domain/qualita-costanti'

/**
 * POST /api/eventi-qualita/[id]/valutazioni — deposita IL GIUDIZIO su un
 * evento già registrato. È l'altra metà di D267: **registrare è un atto,
 * giudicare è un altro**, e questo secondo atto porta la firma di una persona
 * (`classificato_da`, dalla sessione).
 *
 * 🛑 QUESTA ROTTA DEPOSITA LA **PRIMA** VALUTAZIONE E NON RICLASSIFICA.
 * La riclassificazione (spec §9) è **fuori da quest'ondata** per D273: i suoi
 * pezzi sono rotti a metà — `valutazioni_evento.sostituisce_id` è ancora una
 * FK semplice, e `valutazione_supera()` copre solo metà dell'operazione
 * (fra «supera la vecchia» e «inserisci la nuova» esiste una finestra a zero
 * valutazioni vive). Quindi qui:
 *  · `sostituisce_id` e `motivo_riclassificazione` **non si accettano** dal
 *    client — rifiutati, non ignorati: uno scarto muto farebbe credere
 *    depositata una riclassificazione che non c'è;
 *  · `superata` non si accetta — e questo rifiuto è **portante**, non
 *    pignoleria: `valutazione_viva_unique` (`20260806140823:57-58`) è parziale
 *    `WHERE superata = false`, quindi una riga inserita già `superata = true`
 *    ci scivolerebbe sotto e lascerebbe l'evento **senza alcun giudizio vivo**;
 *  · `valutazione_supera()` non si chiama mai.
 */

type RouteContext = { params: Promise<{ id: string }> }

// Idioma di casa (`cassetta/route.ts:15`): scarta un id di path che farebbe
// fallire il cast `uuid` con un `22P02` grezzo.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function err(messaggio: string, status: number) {
  return NextResponse.json({ error: messaggio }, { status })
}

export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return err('Richiesta non consentita', 403)
  }

  const context = await getFreshLabContext()
  if (!context) return err('Non autorizzato', 401)
  if (!context.laboratorioId) return err('Laboratorio non trovato', 403)

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const { id: evento_id } = await params
  if (!UUID_RE.test(evento_id)) return err('Registrazione non trovata', 404)

  let grezzo: unknown
  try {
    grezzo = await req.json()
  } catch {
    return err('Non sono riuscita a leggere i dati inviati: riprova.', 400)
  }
  if (grezzo === null || typeof grezzo !== 'object' || Array.isArray(grezzo)) {
    return err('Non sono riuscita a leggere i dati inviati: riprova.', 400)
  }
  const corpo = grezzo as Record<string, unknown>

  // ── ciò che questa rotta NON accetta (vedi il riquadro in testa) ─────────
  if (corpo.sostituisce_id !== undefined || corpo.motivo_riclassificazione !== undefined) {
    return err('Correggere una valutazione già depositata non è ancora possibile da qui.', 422)
  }
  if (corpo.superata !== undefined) {
    return err('Lo stato di una valutazione non si imposta a mano.', 422)
  }

  const esito = corpo.esito
  if (typeof esito !== 'string' || !(ESITI as readonly string[]).includes(esito)) {
    return err('Scegli l\'esito dall\'elenco per confermare la valutazione.', 422)
  }

  const giustificazioneGrezza = corpo.giustificazione
  if (giustificazioneGrezza !== undefined && giustificazioneGrezza !== null && typeof giustificazioneGrezza !== 'string') {
    return err('La motivazione deve essere un testo.', 422)
  }
  const giustificazione =
    typeof giustificazioneGrezza === 'string' && giustificazioneGrezza.trim().length > 0
      ? giustificazioneGrezza.trim()
      : null

  // Specchio TRADOTTO del CHECK `valutazione_nessuna_azione_giustificata`
  // (`20260806140823:48-49`): «nessuna azione» senza il perché scritto è
  // esattamente ciò che ISO 13485 §8.2.2 vieta. Il controllo sta qui perché il
  // database darebbe un `23514` che non dice a nessuno cosa fare.
  if (esito === 'nessuna_azione' && !giustificazione) {
    return err('Hai scelto «nessuna azione»: scrivi il perché — resta agli atti insieme alla valutazione.', 422)
  }

  const svc = getServiceClient()

  // L'evento dev'essere di QUESTO laboratorio. La FK composita
  // `(evento_id, laboratorio_id)` (20260806142910:43) lo impedirebbe comunque,
  // ma con un `23503` grezzo: qui si risponde 404.
  const { data: evento } = await svc
    .from('eventi_qualita')
    .select('id')
    .eq('id', evento_id)
    .eq('laboratorio_id', context.laboratorioId)
    .single()

  if (!evento) return err('Registrazione non trovata', 404)

  // 🛑 `laboratorio_id` e `classificato_da` vengono dalla SESSIONE, mai dal corpo.
  const { data: valutazione, error: erroreInsert } = await svc
    .from('valutazioni_evento')
    .insert({
      laboratorio_id: context.laboratorioId,
      evento_id,
      esito,
      giustificazione,
      classificato_da: context.userId,
    })
    .select('id, evento_id, esito, giustificazione, superata, classificato_da, classificato_il')
    .single()

  if (erroreInsert || !valutazione) {
    console.error('[VALUTAZIONI-EVENTO] insert fallito:', erroreInsert)
    const codice = erroreInsert?.code
    // `valutazione_viva_unique`: esiste già un giudizio vivo su questo evento.
    // Non è un guasto — è un secondo deposito — e non deve uscire come 500.
    if (codice === '23505') {
      return err('Questa registrazione ha già una valutazione: cambiarla non è ancora possibile da qui.', 409)
    }
    if (codice === '23503') return err('Registrazione non trovata', 404)
    if (codice === '23514') {
      return err('La valutazione non è stata accettata così com\'è: se l\'esito è «nessuna azione» serve il perché scritto.', 422)
    }
    return err('Non sono riuscita a salvare la valutazione: riprova fra un momento.', 500)
  }

  return NextResponse.json({ valutazione }, { status: 201 })
}

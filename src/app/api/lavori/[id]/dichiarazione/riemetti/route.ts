import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { normalizzaPrescrizione } from '@/lib/domain/prescrizione-mapper'
import { riemettiDdC } from '@/lib/pdf/generate-ddc'
import type { LavoroDettaglio } from '@/types/domain'

/**
 * POST /api/lavori/[id]/dichiarazione/riemetti — rifà LA CARTA, non il lavoro.
 *
 * Task 5 dell'ondata «si deve sempre poter intervenire» (spec §8.1, §8.2).
 * Corpo: `{ evento_id }` — l'evento di qualità che motiva la riemissione.
 *
 * ⚖️ D299 — IL LAVORO NON SI MUOVE. «*Il lavoro resta consegnato, si rifà solo la
 * carta*»: il manufatto è a posto e sta dal dentista, sbagliato era un dato
 * scritto sul documento. Questa rotta **non tocca `lavori.stato`** e non passa da
 * `riapri_lavoro_atomica`. Chi cerca il rientro in produzione cerca un'altra
 * strada, che appartiene ad altri motivi.
 *
 * ⚖️ D265 — NESSUN CANCELLO FISCALE. Il documento sanitario si corregge SEMPRE, a
 * fattura emessa compresa: è la ragione per cui la RPC di quest'ondata è nuova e
 * non un allargamento di `annulla_consegna_atomica`, che quei cancelli li porta.
 *
 * 🛑 NESSUN CANCELLO DI STATO SUL LAVORO, ed è una scelta dichiarata come nella
 * rotta degli eventi: un dato sbagliato su un documento va corretto qualunque
 * cosa sia successo dopo al lavoro. A dire «non c'è niente da riemettere» è la
 * presenza di una dichiarazione viva, che controlla il database — non uno stato.
 *
 * 🔑 IL CARICAMENTO DEL LAVORO È LO STESSO DELLA CONSEGNA, embed per embed
 * (`src/lib/consegna/orchestrate.ts:193-227`), e la normalizzazione della
 * prescrizione **è la stessa funzione**. Caricarlo in modo diverso qui vorrebbe
 * dire che una dichiarazione riemessa può dire cose diverse da una emessa, a
 * parità di dati: è la lezione delle «due metà giuste» del 07/08, e qui la
 * giuntura è proprio questa riga.
 */

type RouteContext = { params: Promise<{ id: string }> }

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function err(messaggio: string, status: number) {
  return NextResponse.json({ error: messaggio }, { status })
}

export async function POST(req: Request, { params }: RouteContext) {
  if (!isSameOrigin(req)) return err('Richiesta non consentita', 403)

  const context = await getFreshLabContext()
  if (!context) return err('Non autorizzato', 401)
  if (!context.laboratorioId) return err('Laboratorio non trovato', 403)

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const { id: lavoro_id } = await params
  // 404 e non 400: un id impossibile è indistinguibile da uno inesistente, ed è
  // la stessa risposta che riceve chi cerca il lavoro di un altro laboratorio.
  if (!UUID_RE.test(lavoro_id)) return err('Lavoro non trovato', 404)

  let grezzo: unknown
  try {
    grezzo = await req.json()
  } catch {
    return err('Non sono riuscita a leggere i dati inviati: riprova.', 400)
  }
  if (grezzo === null || typeof grezzo !== 'object' || Array.isArray(grezzo)) {
    return err('Non sono riuscita a leggere i dati inviati: riprova.', 400)
  }

  // 🛑 D263 — LA RIEMISSIONE NON È MAI SENZA MOTIVO. La forma si controlla QUI e
  // non solo nella RPC: un `evento_id` storto arriverebbe al database come un
  // `22P02` grezzo, e a leggere la risposta è un'operatrice al banco.
  const eventoId = (grezzo as Record<string, unknown>).evento_id
  if (typeof eventoId !== 'string' || !UUID_RE.test(eventoId)) {
    return err('Per rifare la dichiarazione serve la registrazione che ne dà il motivo: aprila da «Devo intervenire».', 422)
  }

  const svc = getServiceClient()

  // Stessi embed della consegna: v. il riquadro in testa al file.
  const { data: lavoro } = await svc
    .from('lavori')
    .select(`
      *,
      cliente:clienti(*),
      paziente:pazienti(*),
      lavorazioni:lavori_lavorazioni(*),
      materiali:lavori_materiali(*),
      prescrizione:lavori_prescrizioni(*)
    `)
    .eq('id', lavoro_id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!lavoro) return err('Lavoro non trovato', 404)

  // D295 — l'embed arriva come ARRAY (la FK è composita): senza questa riga la
  // voce 6 dell'Allegato XIII tornerebbe vuota sul documento riemesso.
  const lavoroCompleto = {
    ...(lavoro as Record<string, unknown>),
    prescrizione: normalizzaPrescrizione((lavoro as { prescrizione?: unknown }).prescrizione),
  } as unknown as LavoroDettaglio

  try {
    const esito = await riemettiDdC(lavoroCompleto, eventoId)

    if (esito.stato === 'nessuna_dichiarazione_viva') {
      // 409 e non 200: non è un successo, e non è nemmeno colpa di chi ha
      // chiesto. Non c'è niente da superare — una prima emissione è un altro
      // atto, e passa dalla consegna.
      return err('Questo lavoro non ha una dichiarazione da rifare: la prima si emette con la consegna.', 409)
    }
    if (esito.stato === 'evento_non_valido') {
      return err('La registrazione indicata non appartiene a questo lavoro: riapri «Devo intervenire» e riprova.', 422)
    }

    return NextResponse.json(
      {
        numero: esito.numero,
        url: esito.url,
        numero_superato: esito.numeroSuperato,
        dichiarazione_id: esito.nuovaId,
        sostituisce_id: esito.vecchiaId,
      },
      { status: 200 }
    )
  } catch (e) {
    // Il dettaglio resta nei log; a chi legge arriva una frase che dice cosa
    // fare. Un `violates check constraint` in faccia a un'operatrice non è un
    // messaggio d'errore, è un vicolo cieco.
    console.error('[RIEMISSIONE] fallita per il lavoro', lavoro_id, e)
    return err('Non sono riuscita a rifare la dichiarazione: riprova fra un momento.', 500)
  }
}

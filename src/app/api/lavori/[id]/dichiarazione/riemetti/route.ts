import { NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { normalizzaPrescrizione } from '@/lib/domain/prescrizione-mapper'
import { isMotivo } from '@/lib/domain/qualita-costanti'
import { effettoDaMotivo } from '@/lib/qualita/effetti'
import { riemettiDdC, correggiERiemettiDdC } from '@/lib/pdf/generate-ddc'
import { validaCorrezioni, fondiCorrezioni } from '@/lib/dichiarazione/correzioni'
import type { LavoroDettaglio, Paziente } from '@/types/domain'

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

  // 🛑 IL MOTIVO DEVE AMMETTERE LA RIEMISSIONE — e uno solo su nove lo fa.
  //
  // Senza questa guardia bastava registrare un evento QUALUNQUE e chiamare qui:
  // la dichiarazione veniva annullata anche per «persona sbagliata», dove D291
  // dice l'opposto — il documento **resta valido, perché diceva il vero**;
  // sbagliato era il destinatario, non il contenuto. E annullarlo non lo
  // «supera»: lo cancella, insieme all'unica prova che quel manufatto è
  // esistito ed è andato a un paziente (D293).
  //
  // 🔑 LA CONDIZIONE NON È UN ELENCO SCRITTO QUI, ed è la quarta volta che in
  // questo progetto un elenco a mano sembra completo e non lo è: la porta la
  // apre `effettoDaMotivo`, cioè la stessa tabella degli effetti che l'app usa
  // per proporre. Il giorno in cui un secondo motivo comincerà a riemettere,
  // basterà cambiarla lì e questa riga sarà già giusta.
  const { data: evento } = await svc
    .from('eventi_qualita')
    .select('motivo')
    .eq('id', eventoId)
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', context.laboratorioId)
    .maybeSingle()

  if (!evento) {
    return err('La registrazione indicata non appartiene a questo lavoro: riapri «Devo intervenire» e riprova.', 422)
  }

  const motivo = (evento as { motivo: unknown }).motivo
  if (!isMotivo(motivo) || effettoDaMotivo(motivo).documento !== 'riemetti') {
    // Il messaggio dice CHE COSA succede davvero con quel motivo, non «vietato»:
    // il testo lo compone l'elenco degli effetti, così non può divergere da esso.
    const spiegazione = isMotivo(motivo) ? ` ${effettoDaMotivo(motivo).perche}` : ''
    return err(`Con il motivo scelto la dichiarazione non si rifà.${spiegazione}`, 422)
  }

  // D295 — l'embed arriva come ARRAY (la FK è composita): senza questa riga la
  // voce 6 dell'Allegato XIII tornerebbe vuota sul documento riemesso.
  const lavoroCompleto = {
    ...(lavoro as Record<string, unknown>),
    prescrizione: normalizzaPrescrizione((lavoro as { prescrizione?: unknown }).prescrizione),
  } as unknown as LavoroDettaglio

  // ══════════════════════════════════════════════════════════════════════════
  //  ⑨ LA STRADA DELLE CORREZIONI — Task C, «correggi e rifai la dichiarazione»
  //
  //  🔑 IL CONFINE È UNA CHIAVE SOLA, ed è una scelta, non una comodità.
  //     Senza `correzioni` questa rotta fa **esattamente ciò che faceva prima**:
  //     stessa funzione, stesso contratto SQL, stesse risposte. Con
  //     `correzioni` entra l'ATTO UNICO, che applica le correzioni e rifà il
  //     documento in una transazione sola.
  //
  //  🛑 PERCHÉ NON SI È SPOSTATO TUTTO SULLA STRADA NUOVA, benché sia migliore:
  //     ① il contratto vecchio (`riemetti_ddc_atomica`) ha un chiamante
  //        **pubblicato**, ed è una voce di roadmap a sé — chiuderlo di nascosto
  //        da qui la renderebbe falsa;
  //     ② il gettone di concorrenza è **obbligatorio** sulla strada nuova, e
  //        imporlo a chi non corregge niente romperebbe una porta che oggi
  //        funziona senza proteggere niente (senza correzioni non si scrive
  //        su `lavori`, quindi non c'è nessun aggiornamento da perdere).
  //
  //  📌 E DA QUI VIENE LA RISPOSTA A C2: `correzioni: {}` mandato apposta si
  //     RIFIUTA, perché chi vuole solo rifare la carta **omette la chiave** —
  //     quella strada resta aperta, e un oggetto vuoto diventa quel che è, una
  //     richiesta che non chiede niente.
  // ══════════════════════════════════════════════════════════════════════════
  const correzioniGrezze = (grezzo as Record<string, unknown>).correzioni
  if (correzioniGrezze !== undefined) {
    return correggiERifai(svc, context.laboratorioId, lavoroCompleto, eventoId, grezzo as Record<string, unknown>, correzioniGrezze)
  }

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

/**
 * L'ATTO UNICO visto dalla porta: valida, apre le porte che stanno PRIMA del
 * render, fonde in memoria, chiama, traduce.
 *
 * 🛑 L'ORDINE DEI PASSI È IL COMPITO, e la ragione è una sola: **il PDF si
 * rende e si carica PRIMA della transazione** (`generate-ddc.ts:457-460`,
 * scelta dichiarata — è ciò che permette alla transazione di esistere). Ogni
 * rifiuto che arriva **dopo** il render costa un **file orfano su Storage e un
 * progressivo bruciato**. Quindi tutto ciò che si può sapere prima, si sa
 * prima: la forma delle correzioni, il paziente e il suo laboratorio, la
 * prescrizione che deve esistere, e l'evento che potrebbe aver già fatto tutto.
 */
async function correggiERifai(
  svc: ReturnType<typeof getServiceClient>,
  laboratorioId: string,
  lavoro: LavoroDettaglio,
  eventoId: string,
  corpo: Record<string, unknown>,
  correzioniGrezze: unknown
) {
  // ── ① IL GETTONE, OBBLIGATORIO (modello `…/denti:104-111`) ────────────────
  //
  // 🔑 Il contratto è «**i valori che hai visto sono ancora quelli**», non «la
  //    riga non è cambiata negli ultimi 200 ms»: per questo arriva dal CORPO e
  //    non da una lettura fresca fatta qui. Se lo producesse la rotta, la
  //    finestra sarebbe il solo rendering del PDF e la guardia non potrebbe
  //    quasi mai accendersi — cioè una guardia che non può fallire.
  //
  // 🛑 E `p_atteso_updated_at = NULL` **SPEGNE** il controllo dentro la RPC: un
  //    gettone assente non si può ripiegare su `null`, o si spegnerebbe la
  //    protezione proprio a chi ha dimenticato di mandarla.
  //
  // ⚠️ La stringa vuota si rifiuta qui perché `''::timestamptz` è un errore di
  //    cast (`22007`), cioè un 500 illeggibile al posto di un 422.
  // ⚠️ LIMITE DICHIARATO, identico a quello di `…/denti:100-103`: una stringa
  //    non vuota ma non interpretabile come istante (`'pippo'`) supera questa
  //    porta e sbatte sullo stesso `22007` → 500. Chiuderlo vorrebbe dire
  //    riconoscere qui tutte le forme che Postgres accetta.
  const attesoGrezzo = corpo.atteso_updated_at
  if (typeof attesoGrezzo !== 'string' || attesoGrezzo.trim().length === 0) {
    return NextResponse.json(
      {
        error:
          'Per correggere serve sapere da quali valori parti: manda «atteso_updated_at», cioè l’ultimo aggiornamento del lavoro che hai visto.',
        valore: attesoGrezzo,
      },
      { status: 422 }
    )
  }
  // 🛑 Viaggia COSÌ COM'È: nessun `new Date(...)`. Il `.trim()` di sopra serve
  //    solo a decidere se è vuoto — il valore spedito non si tocca.
  const atteso = attesoGrezzo

  // ── ② LE SETTE VOCI (erano OTTO fino a D319: v. `correzioni.ts`) ──────────
  const validate = validaCorrezioni(correzioniGrezze)
  if (!validate.ok) {
    return NextResponse.json({ error: validate.errore, valore: validate.valore }, { status: 422 })
  }
  const correzioni = validate.correzioni

  // ── ③ LA PORTA D'INGRESSO STA SULL'EVENTO, ed è PORTANTE (C3) ─────────────
  //
  // 🛑 MAI una porta su «esiste una dichiarazione viva»: quella è vietata alla
  //    riemissione (`generate-ddc.ts:378-392`) e restituirebbe **il documento
  //    vecchio** dicendo «rifatto» — il difetto peggiore possibile qui.
  //
  // 🔴 E SI RESTITUISCE IL SUCCESSORE, NON QUELLA TROVATA. `annullata_da_evento_id
  //    = evento` marca la dichiarazione **ANNULLATA**: consegnare quella
  //    vorrebbe dire dare in mano il documento superato dicendo che è il nuovo.
  //    Il piano dice «restituisci quella» ed è un'imprecisione: la carta buona
  //    è quella che la supera (`sostituisce_id`, unico per costruzione).
  const { data: giaAnnullata } = await svc
    .from('dichiarazioni_conformita')
    .select('id, numero_ddc')
    .eq('laboratorio_id', laboratorioId)
    .eq('annullata_da_evento_id', eventoId)
    .maybeSingle()

  if (giaAnnullata) {
    const annullata = giaAnnullata as { id: string; numero_ddc: string | null }
    const { data: successore } = await svc
      .from('dichiarazioni_conformita')
      .select('id, numero_ddc, pdf_url')
      .eq('laboratorio_id', laboratorioId)
      .eq('sostituisce_id', annullata.id)
      .maybeSingle()

    if (successore) {
      const nuova = successore as { id: string; numero_ddc: string | null; pdf_url: string | null }
      return NextResponse.json(
        {
          numero: nuova.numero_ddc,
          url: nuova.pdf_url ?? '',
          numero_superato: annullata.numero_ddc,
          dichiarazione_id: nuova.id,
          sostituisce_id: annullata.id,
          gia_fatto: true,
        },
        { status: 200 }
      )
    }

    // 🔴 PREDECESSORE SENZA SUCCESSORE: è uno stato RAGGIUNGIBILE, non un caso
    //    teorico. `riapri_lavoro_atomica` e `riporta_a_pronto_atomica`
    //    scrivono anch'esse `annullata_da_evento_id` e **non creano nessun
    //    successore**. Andare avanti sbatterebbe comunque su
    //    `ddc_evento_annulla_unique`; tornare 200 consegnerebbe il vuoto.
    return err(
      'Quella registrazione è già stata usata per un altro intervento su questo lavoro: aprine una nuova da «Devo intervenire».',
      409
    )
  }

  // ── ④ LA PRESCRIZIONE DEVE ESISTERE, se la si vuole correggere ────────────
  // La RPC lo controlla e risponde `senza_prescrizione`, ma **dopo il render**.
  if (correzioni.prescrizione_caratteristiche !== undefined && !lavoro.prescrizione) {
    return err(
      'Questo lavoro non ha una prescrizione trascritta: le caratteristiche prescritte non si correggono da qui.',
      422
    )
  }

  // ── ⑤ IL PAZIENTE, E IL SUO LABORATORIO — PRIMA DEL RENDER ────────────────
  //
  // 🛑 Se il PDF si generasse prima di questo controllo, **un documento col
  //    paziente di un altro laboratorio resterebbe su Storage anche dopo il
  //    rollback**. La RPC lo rifiuta (è `SECURITY DEFINER`, quindi scavalca le
  //    RLS e il controllo lì dentro è dovuto), ma lo rifiuta troppo tardi.
  //
  // 🔴 E LA STESSA LETTURA SERVE UNA SECONDA VOLTA, che è la parte che nessun
  //    documento a monte nomina: `generate-ddc.ts:258` ripiega su
  //    `lavoro.paziente?.nome_cognome` quando lo snapshot è nullo. Correggere
  //    il solo identificativo e lasciare l'embed vecchio stamperebbe sul
  //    documento **il nome della persona sbagliata**, con la riga in banca dati
  //    che punta a quella giusta. Una query, due ragioni.
  let pazienteNuovo: Paziente | null | undefined
  if (correzioni.paziente_id !== undefined) {
    const { data: paziente } = await svc
      .from('pazienti')
      .select('*')
      .eq('id', correzioni.paziente_id as string)
      .eq('laboratorio_id', laboratorioId)
      .maybeSingle()
    if (!paziente) {
      return err('Il paziente indicato non è di questo laboratorio: scegline uno dall’anagrafica.', 422)
    }
    pazienteNuovo = paziente as unknown as Paziente
  }

  // ── ⑥ SI FONDE IN MEMORIA, e si stampa dai dati CORRETTI ──────────────────
  const lavoroCorretto = fondiCorrezioni(lavoro, correzioni, pazienteNuovo)

  try {
    const esito = await correggiERiemettiDdC(
      lavoroCorretto,
      eventoId,
      correzioni as Record<string, unknown>,
      atteso
    )

    switch (esito.stato) {
      case 'ok':
        return NextResponse.json(
          {
            numero: esito.numero,
            url: esito.url,
            numero_superato: esito.numeroSuperato,
            dichiarazione_id: esito.nuovaId,
            sostituisce_id: esito.vecchiaId,
            // Il gettone aggiornato: senza, una seconda correzione di fila
            // troverebbe sempre un conflitto.
            updated_at: esito.updatedAt,
          },
          { status: 200 }
        )

      case 'non_trovato':
        return err('Lavoro non trovato', 404)

      case 'conflitto':
        // 📌 IL MESSAGGIO DEV'ESSERE ONESTO, e questo è il punto in cui costa:
        //    il PDF è già stato reso e caricato, quindi un conflitto lascia
        //    dietro di sé un file orfano e un numero bruciato. Nessuno dei due
        //    rompe niente — ma chi legge deve sapere che deve rifare il giro
        //    con i valori aggiornati, non che «non è successo niente».
        return NextResponse.json(
          {
            error:
              'Qualcun altro ha toccato questo lavoro mentre stavi correggendo: ricarica e rifai la correzione sui valori aggiornati.',
            updated_at: esito.updatedAt,
          },
          { status: 409 }
        )

      case 'evento_non_valido':
        return err(
          'La registrazione indicata non appartiene a questo lavoro: riapri «Devo intervenire» e riprova.',
          422
        )

      case 'paziente_non_valido':
        return err('Il paziente indicato non è di questo laboratorio: scegline uno dall’anagrafica.', 422)

      case 'senza_prescrizione':
        return err(
          'Questo lavoro non ha una prescrizione trascritta: le caratteristiche prescritte non si correggono da qui.',
          422
        )

      case 'nessuna_dichiarazione_viva':
        return err(
          'Questo lavoro non ha una dichiarazione da rifare: la prima si emette con la consegna.',
          409
        )

      case 'evento_gia_consumato':
        // La porta ③ prende quasi sempre questo caso prima; qui resta la corsa
        // fra due richieste che la superano entrambe.
        return err(
          'Quella registrazione è già stata usata per rifare la dichiarazione: ricarica la scheda del lavoro.',
          409
        )

      case 'gia_superata':
        return err('Questa dichiarazione è già stata superata da un’altra: ricarica la scheda del lavoro.', 409)

      case 'numero_gia_usato':
        return err(
          'Il numero preparato per la dichiarazione nuova risulta già usato: riprova, ne verrà preso un altro.',
          409
        )

      case 'richiesta_rifiutata':
        // 🛑 400, e NON 500: il contratto ha rifiutato **prima di scrivere
        //    qualsiasi cosa**, quindi è la richiesta a essere sbagliata. Il
        //    testo è quello del contratto, che nomina la chiave incriminata.
        console.warn('[ATTO UNICO] richiesta rifiutata dal contratto:', esito.messaggio)
        return err(`La correzione non è stata accettata: ${esito.messaggio}`, 400)
    }
  } catch (e) {
    // 🛑 QUI ARRIVANO I QUATTRO `P0001` POST-ANNULLO, e questa è la ragione per
    //    cui non si smista per SQLSTATE: hanno lo stesso codice dei nove di
    //    sopra e sono l'opposto. Un 400 direbbe all'odontotecnico che ha
    //    sbagliato lui, mentre l'app si è rotta.
    console.error('[ATTO UNICO] correzione fallita per il lavoro', lavoro.id, e)
    return err('Non sono riuscita a correggere e rifare la dichiarazione: riprova fra un momento.', 500)
  }
}

import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { isSameOrigin } from '@/lib/utils/csrf'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
import { isFdiValido } from '@/lib/domain/denti-fdi-dominio'

// PUT a SOSTITUZIONE INTEGRALE (spec §4): il client manda la lista che vuole
// vedere, non un delta. Idempotente per costruzione; 6 denti = 1 chiamata.
//
// La validazione vive QUI e non solo nei CHECK del database perché un CHECK
// produrrebbe un 500 illeggibile: chi sbaglia un dente deve sapere QUALE.
// Ogni controllo qui sotto ha un vincolo gemello in
// `20260727120100_lavori_denti_tabella.sql`; il database resta la rete, questa
// è la porta. I due elenchi devono dire la stessa cosa — se un giorno la
// migration cambia, cambia anche questo file.

const RUOLI = ['elemento', 'mancante', 'impianto', 'escluso', 'incollato'] as const
const PROVENIENZE = ['prescritto', 'eseguito'] as const

// Le cinque colonne testuali del colore, tutte nullable e tutte soggette agli
// stessi due CHECK (coppia + zone).
const CAMPI_TESTO = ['scala', 'codice', 'codice_collo', 'codice_corpo', 'codice_incisale'] as const

type DenteNormalizzato = {
  fdi: number
  ruolo: string
  scala: string | null
  codice: string | null
  codice_collo: string | null
  codice_corpo: string | null
  codice_incisale: string | null
  provenienza: string
}

type RouteContext = { params: Promise<{ id: string }> }

function errore422(messaggio: string, valore?: unknown) {
  return NextResponse.json({ error: messaggio, valore }, { status: 422 })
}

/**
 * Un campo testo del colore è: assente (`undefined`/`null`) oppure una stringa
 * non vuota. Un numero o un oggetto arriverebbero al database stringificati da
 * `d->>'scala'` e sbatterebbero contro `lavori_denti_colore_fk` con un 500; una
 * stringa vuota non è un colore, e `('','')` non esiste in `colori_dentali`.
 */
function leggiTesto(grezzo: unknown): { ok: true; valore: string | null } | { ok: false } {
  if (grezzo === undefined || grezzo === null) return { ok: true, valore: null }
  if (typeof grezzo !== 'string') return { ok: false }
  const pulito = grezzo.trim()
  if (pulito.length === 0) return { ok: false }
  return { ok: true, valore: pulito }
}

export async function PUT(req: Request, { params }: RouteContext) {
  const { id } = await params

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })

  const guard = assertLabOperativo(context, 'PUT')
  if (guard) return guard

  let grezzo: unknown
  try {
    grezzo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  // ⚠️ `JSON.stringify(null)` è la stringa "null": `req.json()` la parsa senza
  // lanciare, quindi il `catch` qui sopra NON scatta e un `body.denti` su null
  // sarebbe un TypeError → 500 non gestito. Stessa classe del difetto
  // «Important #1» già corretto in `lavori/[id]/cassetta/route.ts`: un corpo
  // che non è un oggetto è un errore di richiesta, e va detto.
  if (grezzo === null || typeof grezzo !== 'object' || Array.isArray(grezzo)) {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  const body = grezzo as Record<string, unknown>

  // 🔑 Il gettone di concorrenza viaggia COSÌ COM'È, senza mai passare da un
  // `new Date(...)`: `timestamptz` ha precisione al microsecondo, `Date` di JS
  // al millisecondo. Un solo giro di riparsing troncherebbe `.123456` a `.123`
  // e il confronto `IS DISTINCT FROM` dentro la RPC non tornerebbe MAI uguale:
  // 409 permanente, che nemmeno ricaricando la pagina si sana. Qui si controlla
  // solo che sia una stringa — un numero produrrebbe un errore di cast
  // (SQLSTATE 22007) e quindi un 500 al posto di un 422.
  const attesoGrezzo = body.atteso_updated_at
  if (attesoGrezzo !== undefined && attesoGrezzo !== null && typeof attesoGrezzo !== 'string') {
    return errore422('atteso_updated_at deve essere una stringa', attesoGrezzo)
  }
  const atteso = (attesoGrezzo as string | null | undefined) ?? null

  if (!Array.isArray(body.denti)) return errore422('denti deve essere una lista')

  const visti = new Set<number>()
  const denti: DenteNormalizzato[] = []

  for (const grezzoDente of body.denti as unknown[]) {
    if (!grezzoDente || typeof grezzoDente !== 'object' || Array.isArray(grezzoDente)) {
      return errore422('ogni dente deve essere un oggetto', grezzoDente)
    }
    const d = grezzoDente as Record<string, unknown>

    if (!isFdiValido(d.fdi)) return errore422('numero di dente non valido', d.fdi)
    if (visti.has(d.fdi)) return errore422('dente ripetuto: la lista è un insieme', d.fdi)
    visti.add(d.fdi)

    if (d.ruolo !== undefined && !(RUOLI as readonly unknown[]).includes(d.ruolo)) {
      return errore422('ruolo non valido', d.ruolo)
    }
    if (d.provenienza !== undefined && !(PROVENIENZE as readonly unknown[]).includes(d.provenienza)) {
      return errore422('provenienza non valida', d.provenienza)
    }

    const testi: Record<string, string | null> = {}
    for (const campo of CAMPI_TESTO) {
      const letto = leggiTesto(d[campo])
      if (!letto.ok) return errore422(`${campo} non valido`, d[campo])
      testi[campo] = letto.valore
    }

    // Mezza coppia non è mezzo colore (`lavori_denti_coppia_ck`, stessa regola
    // di risolviColore: tre punti, una sola idea).
    if ((testi.scala === null) !== (testi.codice === null)) {
      return errore422('scala e codice vanno insieme', testi.scala ?? testi.codice)
    }
    // Le zone del ceramista non possono esistere senza la scala che le legge
    // (`lavori_denti_zone_ck`). Il piano si fermava alla coppia e lasciava
    // scoperto questo secondo CHECK: un `{ fdi: 11, codice_collo: 'A1' }`
    // passava la porta e tornava indietro come 500.
    if (
      testi.scala === null &&
      (testi.codice_collo !== null || testi.codice_corpo !== null || testi.codice_incisale !== null)
    ) {
      return errore422('le zone del colore richiedono scala e codice', d.fdi)
    }

    denti.push({
      fdi: d.fdi,
      ruolo: (d.ruolo as string | undefined) ?? 'elemento',
      scala: testi.scala,
      codice: testi.codice,
      codice_collo: testi.codice_collo,
      codice_corpo: testi.codice_corpo,
      codice_incisale: testi.codice_incisale,
      provenienza: (d.provenienza as string | undefined) ?? 'prescritto',
    })
  }

  // ⚠️ LIMITE DICHIARATO: una coppia (scala, codice) sintatticamente valida ma
  // inesistente in `colori_dentali` viola `lavori_denti_colore_fk` e torna 500,
  // non 422. Chiuderlo richiede una lettura di `colori_dentali` dalla route:
  // non è nel perimetro di questo task, ed è meglio scritto qui che dedotto.

  // laboratorio_id e lavoro_id eventualmente presenti nel body si IGNORANO:
  // si derivano da sessione e URL. Il client non sceglie il proprio tenant.
  const svc = getServiceClient()
  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('lavoro_denti_sostituisci_atomica', {
      p_lab: context.laboratorioId as string,
      p_lavoro: id,
      p_denti: denti,
      // `p_atteso_updated_at` non ha DEFAULT in SQL e PostgREST risolve
      // l'overload sull'INSIEME delle chiavi del body: la chiave va mandata
      // SEMPRE, valorizzata a null quando il gettone non c'è. Ometterla darebbe
      // PGRST202 «function not found» sul percorso più comune di tutti.
      p_atteso_updated_at: atteso,
    })
  )

  // postgrest NON lancia: l'errore si controlla, non si aspetta in un catch.
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const esito = data as { esito: string; updated_at?: string } | null
  if (esito?.esito === 'non_trovato') {
    // Anche il caso cross-tenant finisce qui: un lavoro di un altro laboratorio
    // non esiste, non è «vietato». 404, non 403 (R4).
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }
  if (esito?.esito === 'conflitto') {
    return NextResponse.json(
      { error: 'Il lavoro è stato modificato da qualcun altro', updated_at: esito.updated_at },
      { status: 409 }
    )
  }
  if (esito?.esito !== 'ok') {
    return NextResponse.json({ error: 'Esito inatteso' }, { status: 500 })
  }

  // Si restituisce la lista NORMALIZZATA — quella davvero scritta, con i
  // default di `ruolo`/`provenienza` applicati — non l'eco del corpo ricevuto:
  // il chiamante deve poter ridisegnare da questa risposta senza rileggere.
  return NextResponse.json({ denti, updated_at: esito.updated_at })
}

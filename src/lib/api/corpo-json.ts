import { NextResponse } from 'next/server'

// Lettura del corpo JSON di una route mutante, con dizionario CHIUSO delle
// chiavi ammesse.
//
// 🔑 PERCHÉ ESISTE, invece di stare in linea come nelle route più vecchie: la
//    regola delle «chiavi ignote → 422» nasce con le route della prescrizione
//    (nota ② 6 del piano di sessione ③: 422 nelle route NUOVE; il POST
//    /api/lavori resta com'è, per retro-compatibilità D218). Nasce quindi in
//    TRE posti nello stesso minuto — ed è esattamente la classe R3, «due copie
//    della stessa regola, una che si aggiorna e l'altra no». Qui ce n'è una.
//
// 🔑 PERCHÉ IL 422 SULLE CHIAVI IGNOTE NON È PEDANTERIA. Una chiave che la
//    route non conosce oggi viene ignorata in silenzio, e chi l'ha mandata
//    legge «Salvato» su un dato che non è stato scritto: è il difetto già
//    pagato dall'allowlist della PATCH (`lavori/[id]/route.ts`, citato in
//    CLAUDE.md R-P6). Con un dizionario chiuso diventa anche impossibile far
//    scegliere al client cose che spettano al server — il proprio tenant,
//    l'utente che firma una divergenza — senza doverlo ricordare caso per caso.
//
// ⚠️ NON è una validazione dei VALORI: quella resta in ogni route, dove vive
//    la conoscenza di cosa quel valore significa.

export type EsitoCorpo =
  | { ok: true; corpo: Record<string, unknown> }
  | { ok: false; risposta: NextResponse }

export async function leggiCorpoJson(
  req: Request,
  chiaviNote: readonly string[]
): Promise<EsitoCorpo> {
  let grezzo: unknown
  try {
    grezzo = await req.json()
  } catch {
    return {
      ok: false,
      risposta: NextResponse.json({ errore: 'Corpo non valido: serve un oggetto JSON' }, { status: 400 }),
    }
  }

  // ⚠️ `JSON.stringify(null)` è la stringa "null": `req.json()` la parsa SENZA
  // lanciare, quindi il catch qui sopra NON scatta e ogni lettura `corpo.campo`
  // sarebbe un TypeError → 500 non gestito. Stessa classe già chiusa in
  // `lavori/[id]/cassetta/route.ts` e in `lavori/[id]/denti/route.ts:51-58`.
  // Un array cade qui per lo stesso motivo: `Object.keys([…])` darebbe gli
  // INDICI, e il controllo delle chiavi ignote diventerebbe teatro.
  if (grezzo === null || typeof grezzo !== 'object' || Array.isArray(grezzo)) {
    return {
      ok: false,
      risposta: NextResponse.json({ errore: 'Corpo non valido: serve un oggetto JSON' }, { status: 400 }),
    }
  }

  const corpo = grezzo as Record<string, unknown>
  const ignote = Object.keys(corpo).filter((k) => !chiaviNote.includes(k))
  if (ignote.length > 0) {
    return {
      ok: false,
      risposta: NextResponse.json(
        { errore: `Chiavi non riconosciute: ${ignote.join(', ')}` },
        { status: 422 }
      ),
    }
  }

  return { ok: true, corpo }
}

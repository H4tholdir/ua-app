import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { isSameOrigin } from '@/lib/utils/csrf'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
import { leggiCorpoJson } from '@/lib/api/corpo-json'
// 🛑 Il dizionario si IMPORTA, non si riscrive (v. prescrizione-costanti.ts).
import { CAMPI_TYPO, type CampoTypo } from '@/lib/domain/prescrizione-costanti'

// POST /api/lavori/[id]/prescrizione/typo — «era scritto così sulla
// prescrizione»: la metà «typo» del gesto V4/D212.
//
// Correggere un typo RISCRIVE la trascrizione, cioè lo snapshot che la
// Dichiarazione di Conformità fotografa. L'altra metà del gesto — «lo cambiamo
// noi» — non tocca il contenuto e vive in `../divergenza`.
//
// 🔑 IL GETTONE DI CONCORRENZA È OBBLIGATORIO, e la RPC resta permissiva.
//    `lavoro_prescrizione_correggi_typo` salta il confronto quando
//    `p_atteso_updated_at IS NULL` (20260804152403:222): senza gettone due
//    correzioni concorrenti tornano ENTRAMBE `ok` e l'ultima vince in
//    silenzio. È il rilievo M1, riprodotto sul database vero il 28/07/2026 sul
//    PUT denti e chiuso allo stesso modo — nella porta, non in SQL: la RPC
//    conosce `conflitto` («qualcun altro ha scritto»), e «non hai mandato la
//    chiave» non è quello. Farglielo dire sarebbe una bugia all'utente.
//    ⚠️ Se un domani nascesse una seconda porta su questa RPC, la guardia va
//    ricopiata lì — oppure si dà alla RPC il suo quarto esito.
//    Il contratto è esigibile: `GET /api/lavori/[id]` fa `select('*')` su
//    `lavori`, quindi chi apre la scheda ha già `updated_at` in mano.
//
// 🔑 IL GETTONE È UNA STRINGA OPACA END-TO-END (sonda S5, rossa al primo giro
//    proprio per questo). `timestamptz` ha precisione al MICROSECONDO, `Date`
//    di JS al millisecondo: un solo giro di riparsing troncherebbe `.123456` a
//    `.123`, il confronto `IS DISTINCT FROM` dentro la RPC non tornerebbe MAI
//    uguale e il 409 diventerebbe permanente — insanabile ricaricando la
//    pagina. Quella che arriva dal client si passa alla RPC; quella che la RPC
//    restituisce si rimanda al client. Mai un `new Date(...)` in mezzo.

type RouteContext = { params: Promise<{ id: string }> }

const CHIAVI_NOTE = ['campo', 'valore', 'atteso_updated_at'] as const

// 🛑 ALLOWLIST DI ROTTA, NON DEL DIZIONARIO (adjudicazione controllore, fix
//    Important T4, 04/08/2026). `CAMPI_TYPO` (prescrizione-costanti.ts) è la
//    spia del CHECK SQL di `lavoro_prescrizione_correggi_typo` e include
//    'tipo' — resta così, NON si tocca. Ma `lavoro_prescrizione_conferma_consegna`
//    sovrascrive INCONDIZIONATAMENTE `contenuto.tipo` con `lavori.tipo_dispositivo`
//    alla conferma (D213): una correzione di 'tipo' fatta QUI risponderebbe 200
//    e sparirebbe silenziosamente alla conferma — l'utente legge «Salvato» su
//    un dato che non c'è. Finché la sessione ④ non costruisce il momento in cui
//    correggere il tipo ha senso (la conferma stessa), la ROTTA lo esclude da
//    sé. `CAMPO_TIPO_ESCLUSO` è tipizzato contro `CampoTypo`: se un domani
//    'tipo' sparisse da `CAMPI_TYPO`, questa riga smette di compilare.
const CAMPO_TIPO_ESCLUSO = 'tipo' satisfies CampoTypo
const CAMPI_TYPO_ROUTE = CAMPI_TYPO.filter(
  (campo): campo is Exclude<CampoTypo, 'tipo'> => campo !== CAMPO_TIPO_ESCLUSO
)

function isCampoTypoRoute(v: unknown): v is Exclude<CampoTypo, 'tipo'> {
  return typeof v === 'string' && (CAMPI_TYPO_ROUTE as readonly string[]).includes(v)
}

function errore422(messaggio: string, valore?: unknown) {
  return NextResponse.json({ errore: messaggio, valore }, { status: 422 })
}

export async function POST(req: Request, { params }: RouteContext) {
  const { id } = await params

  if (!isSameOrigin(req)) {
    return NextResponse.json({ errore: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ errore: 'Non autorizzato' }, { status: 401 })
  if (!context.laboratorioId) {
    return NextResponse.json({ errore: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const letto = await leggiCorpoJson(req, CHIAVI_NOTE)
  if (!letto.ok) return letto.risposta
  const corpo = letto.corpo
  const labId: string = context.laboratorioId

  // ── campo: dall'allowlist DI ROTTA, non dal dizionario intero ─────────────
  // Il dizionario morde ANCHE nella RPC (esito `campo_non_valido`), ma qui deve
  // mordere PRIMA: un 422 che dice cosa correggere, non un giro fino al
  // database per tornare con un codice.
  // 🔑 'tipo' è un caso a parte, e per questo ha il suo controllo dedicato: è
  //    un campo VERO del dizionario (la RPC lo accetterebbe), quindi merita un
  //    422 che indichi la via giusta — non lo stesso messaggio generico di un
  //    campo che non esiste affatto (v. il commento sopra `CAMPI_TYPO_ROUTE`).
  if (corpo.campo === CAMPO_TIPO_ESCLUSO) {
    return errore422(
      'il tipo si corregge sul lavoro, non sulla trascrizione: usa la scheda del lavoro',
      corpo.campo
    )
  }
  if (!isCampoTypoRoute(corpo.campo)) {
    return errore422('campo non valido: usa elementi o colore', corpo.campo)
  }
  const campo = corpo.campo

  // ── il gettone ────────────────────────────────────────────────────────────
  // La stringa vuota è respinta perché `''::timestamptz` è un errore di cast
  // (22007, provato sul PUT denti): sarebbe un 500 illeggibile al posto di un
  // 422. Il `.trim()` serve SOLO a decidere se è vuota — il valore spedito non
  // si tocca.
  // ⚠️ LIMITE DICHIARATO, identico a quello del PUT denti (route.ts:100-103):
  // una stringa non vuota ma non interpretabile come istante (`'pippo'`) supera
  // questa porta e sbatte sullo stesso 22007 → 500. Chiuderlo vorrebbe dire
  // riconoscere qui tutte le forme che Postgres accetta: meglio scritto che
  // dedotto.
  const gettone = corpo.atteso_updated_at
  if (typeof gettone !== 'string' || gettone.trim().length === 0) {
    return errore422(
      'atteso_updated_at obbligatorio: è updated_at del lavoro che stai correggendo',
      gettone
    )
  }

  // ── valore: la chiave DEVE esserci ────────────────────────────────────────
  // 🔑 S6, ed è il motivo per cui si guarda la CHIAVE e non il valore:
  //    `JSON.stringify` fa SPARIRE le chiavi con valore `undefined`. Se la
  //    rimozione si derivasse da `corpo.valore === undefined`, un client con un
  //    bug di costruzione del corpo CANCELLEREBBE una caratteristica trascritta
  //    e leggerebbe 200. La rimozione è un atto, e si chiede: `{valore: null}`.
  if (!('valore' in corpo)) {
    return errore422(
      'valore obbligatorio: manda {"valore": null} per dire che quel campo non era sulla prescrizione'
    )
  }
  const valore = corpo.valore

  // ── la FORMA del valore, campo per campo ──────────────────────────────────
  // 🛑 Si prova la FORMA, non il DOMINIO: nessun controllo sulla numerazione
  //    FDI degli elementi, nessun confronto del colore col catalogo.
  //    `contenuto` è una TRASCRIZIONE, e la sua regola fondativa è la fedeltà
  //    al foglio (D210; fatto 6 del censimento: un colore fuori catalogo viene
  //    scartato dal CASO ma resta trascritto). Importare qui la validazione di
  //    `denti-validazione` contraddirebbe lo snapshot.
  if (valore !== null) {
    if (campo === 'elementi') {
      if (!Array.isArray(valore)) {
        return errore422('elementi deve essere una lista di numeri di dente', valore)
      }
      if (valore.length === 0) {
        // «Non c'era nessun elemento sulla prescrizione» si dice con
        // `{"valore": null}`: la chiave sparisce. Una lista vuota nel contenuto
        // sarebbe un terzo stato — presente ma vuota — che nessun altro pezzo
        // del sistema produce (`componiSnapshot` OMETTE la chiave) e che ogni
        // lettore dovrebbe imparare a distinguere dall'assenza.
        return errore422(
          'elementi non può essere una lista vuota: manda {"valore": null} per togliere il campo'
        )
      }
      if (!valore.every((n) => typeof n === 'number' && Number.isInteger(n))) {
        return errore422('elementi deve contenere solo numeri interi', valore)
      }
    } else {
      // colore — 'tipo' non arriva più qui: la porta lo respinge sopra, prima
      // ancora di guardare la forma del valore (v. CAMPO_TIPO_ESCLUSO).
      if (typeof valore !== 'string') {
        return errore422(`${campo} deve essere testo`, valore)
      }
      // Stessa regola di `componiSnapshot`: la stringa VUOTA non è la
      // trascrizione di niente (mentre «solo spazi» si preserva — giudicarlo
      // vuoto richiederebbe un trim, cioè una normalizzazione).
      if (valore === '') {
        return errore422(
          `${campo} non può essere vuoto: manda {"valore": null} per togliere il campo`
        )
      }
    }
  }

  const svc = getServiceClient()

  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('lavoro_prescrizione_correggi_typo', {
      p_lab: labId,
      p_lavoro: id,
      p_campo: campo,
      // `null` arriva alla RPC come jsonb `null` e RIMUOVE la chiave
      // (`contenuto - p_campo`); anche il NULL SQL rimuove, perché passarlo a
      // `jsonb_set` annienterebbe l'INTERO contenuto — e un typo non può
      // costare la trascrizione.
      p_valore: valore,
      // 🛑 COSÌ COM'È: mai un `new Date(...)`, mai un `.trim()` sul valore
      //    spedito (v. il cappello del file).
      p_atteso_updated_at: gettone,
    })
  )

  if (error) return NextResponse.json({ errore: error.message }, { status: 500 })

  const esito = data as { esito?: string; updated_at?: string } | null

  if (esito?.esito === 'non_trovato') {
    // Anche il caso cross-tenant finisce qui: un lavoro di un altro laboratorio
    // non esiste, non è «vietato». 404, non 403 (R4).
    return NextResponse.json({ errore: 'Lavoro non trovato' }, { status: 404 })
  }
  if (esito?.esito === 'conflitto') {
    return NextResponse.json(
      {
        errore: 'Il lavoro è stato modificato da qualcun altro',
        esito: 'conflitto',
        // Il gettone CORRENTE, intatto: è quello con cui il client riproverà.
        updated_at: esito.updated_at,
      },
      { status: 409 }
    )
  }
  if (esito?.esito === 'congelata') {
    return NextResponse.json(
      {
        errore:
          'La trascrizione è congelata: il lavoro ha una Dichiarazione di Conformità attiva. Per correggerla, annulla prima la dichiarazione.',
        esito: 'congelata',
      },
      { status: 409 }
    )
  }
  if (esito?.esito === 'senza_prescrizione') {
    // 🔑 Non è un vicolo cieco, ed è per questo che la frase dice il rimedio:
    //    allegare la fonte CREA la riga anche per i lavori nati prima
    //    dell'ondata B (UPSERT deliberato, provato dalla sonda S1).
    return NextResponse.json(
      {
        errore: 'Questo lavoro non ha ancora una trascrizione: prima allega il foglio.',
        esito: 'senza_prescrizione',
      },
      { status: 409 }
    )
  }
  if (esito?.esito === 'campo_non_valido') {
    // Difesa in profondità: il dizionario ha già morso sopra. Se arriva qui,
    // costante e database sono divergenti — 422, mai un 500.
    return NextResponse.json(
      { errore: 'campo non valido', esito: 'campo_non_valido', valore: campo },
      { status: 422 }
    )
  }
  // Un `ok` senza gettone nuovo non è un successo: il chiamante ripartirebbe
  // con un gettone stantio e prenderebbe un 409 immeritato al gesto dopo.
  if (esito?.esito !== 'ok' || !esito.updated_at) {
    return NextResponse.json({ errore: 'Esito inatteso' }, { status: 500 })
  }

  return NextResponse.json({ updated_at: esito.updated_at })
}

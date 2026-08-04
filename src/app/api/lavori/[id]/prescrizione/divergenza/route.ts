import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { isSameOrigin } from '@/lib/utils/csrf'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
import { leggiCorpoJson } from '@/lib/api/corpo-json'
// 🛑 I dizionari si IMPORTANO, non si riscrivono (v. prescrizione-costanti.ts).
import { isCampoTypo, isMotivoDivergenza } from '@/lib/domain/prescrizione-costanti'

// POST /api/lavori/[id]/prescrizione/divergenza — «lo cambiamo noi»: la metà
// «divergenza» del gesto V4/D212 (V9).
//
// A differenza del typo, questa NON riscrive il contenuto: la trascrizione
// resta ciò che il dentista ha prescritto, e al registro si APPENDE
// `{campo, motivo, nota, utente_id, registrata_at}`.
//
// 🔴 IL DIZIONARIO DEL CAMPO VIVE QUI, E OGGI SOLO QUI. Provato a banco (sonda
//    S3): `lavoro_prescrizione_registra_divergenza` accetta `p_campo :=
//    'pippo'` e perfino `NULL`, e risponde `ok`. Una divergenza registrata su
//    un campo che non esiste è una riga che nessuna schermata mostrerà mai e
//    che nessuno saprà di avere — un dato perso in silenzio, che è la classe di
//    difetto peggiore di questo repo. Il Task 5 chiude il buco anche in banca
//    dati; questa porta resta comunque la prima.
//
// 🛑 NIENTE GETTONE DI CONCORRENZA, ed è una scelta, non una dimenticanza: la
//    RPC non tocca `lavori.updated_at` (fatto 12 del censimento) e l'operazione
//    è un APPEND — due divergenze concorrenti sono due righe legittime, non una
//    sovrascrittura. Non si promette un 409 che non esiste. Un client che
//    mandasse `atteso_updated_at` prende un 422 da chiave ignota: meglio un
//    rifiuto esplicito che un campo accettato e ignorato.

type RouteContext = { params: Promise<{ id: string }> }

const CHIAVI_NOTE = ['campo', 'motivo', 'nota'] as const

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

  // ── campo: dal dizionario (la guardia che oggi il database non ha) ────────
  if (!isCampoTypo(corpo.campo)) {
    return errore422('campo non valido: usa elementi, colore o tipo', corpo.campo)
  }

  // ── motivo: dal dizionario chiuso ─────────────────────────────────────────
  if (!isMotivoDivergenza(corpo.motivo)) {
    return errore422(
      'motivo non valido: usa richiesta_dentista, esigenza_tecnica, materiale_non_disponibile o altro',
      corpo.motivo
    )
  }

  // ── nota: facoltativa ─────────────────────────────────────────────────────
  // Vuota o di soli spazi = nessuna nota: registrarla come stringa vuota
  // costringerebbe ogni lettore a distinguere due vuoti diversi. Il valore
  // NON si normalizza (niente trim su ciò che si spedisce): il trim decide
  // soltanto se c'è qualcosa.
  let nota: string | null = null
  if (corpo.nota !== undefined && corpo.nota !== null) {
    if (typeof corpo.nota !== 'string') {
      return errore422('nota non valida: deve essere testo', corpo.nota)
    }
    nota = corpo.nota.trim().length === 0 ? null : corpo.nota
  }

  const svc = getServiceClient()

  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('lavoro_prescrizione_registra_divergenza', {
      p_lab: labId,
      p_lavoro: id,
      p_campo: corpo.campo,
      p_motivo: corpo.motivo,
      p_nota: nota,
      // 🛑 IL «CHI» NON SI CHIEDE AL CLIENT. `p_utente` è l'utente autenticato,
      //    sempre: la divergenza è una firma — dice chi ha deciso di scostarsi
      //    dalla prescrizione — e una firma che il firmatario si sceglie da sé
      //    non vale niente. Un `utente_id` nel corpo è una chiave ignota: 422.
      p_utente: context.userId,
    })
  )

  if (error) return NextResponse.json({ errore: error.message }, { status: 500 })

  const esito = data as { esito?: string; divergenze?: number } | null

  if (esito?.esito === 'non_trovato') {
    // Anche il caso cross-tenant finisce qui: un lavoro di un altro laboratorio
    // non esiste, non è «vietato». 404, non 403 (R4).
    return NextResponse.json({ errore: 'Lavoro non trovato' }, { status: 404 })
  }
  if (esito?.esito === 'congelata') {
    return NextResponse.json(
      {
        errore:
          'La trascrizione è congelata: il lavoro ha una Dichiarazione di Conformità attiva. Per registrare una divergenza, annulla prima la dichiarazione.',
        esito: 'congelata',
      },
      { status: 409 }
    )
  }
  if (esito?.esito === 'senza_prescrizione') {
    return NextResponse.json(
      {
        errore: 'Questo lavoro non ha ancora una trascrizione: prima allega il foglio.',
        esito: 'senza_prescrizione',
      },
      { status: 409 }
    )
  }
  if (esito?.esito === 'motivo_non_valido' || esito?.esito === 'campo_non_valido') {
    // Difesa in profondità: i dizionari hanno già morso sopra.
    // ⚠️ `campo_non_valido` NON esiste ancora: lo aggiunge il Task 5 alla RPC.
    //    Mapparlo oggi vuol dire che il giorno del deploy di quella migration
    //    questa porta risponde già 422 invece di 500, senza toccare niente.
    return NextResponse.json(
      { errore: 'Valore non valido', esito: esito.esito },
      { status: 422 }
    )
  }
  // Un `ok` senza conteggio non è un successo: il client mostrerebbe
  // «registrata» con un registro che non sa contare.
  if (esito?.esito !== 'ok' || typeof esito.divergenze !== 'number') {
    return NextResponse.json({ errore: 'Esito inatteso' }, { status: 500 })
  }

  // Il conteggio del registro è l'unica cosa che il chiamante non può dedurre
  // da sé senza rileggere.
  return NextResponse.json({ divergenze: esito.divergenze })
}

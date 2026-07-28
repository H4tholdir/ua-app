import { NextResponse } from 'next/server'
import { oggiRomaISO, annoRoma } from '@/lib/utils/data-roma'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'
import { MACRO_SLUGS } from '@/lib/domain/tipi-lavoro'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
import { isFdiValido } from '@/lib/domain/denti-fdi-dominio'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato')
  const q = searchParams.get('q')

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }

    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard

    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    let query = svc
      .from('lavori')
      .select(`
        id,
        numero_lavoro,
        stato,
        priorita,
        tipo_dispositivo,
        descrizione,
        data_consegna_prevista,
        ora_consegna,
        paziente_nome_snapshot,
        conformato,
        incluso_in_fattura,
        spedizione_stato,
        spedizione_tracking,
        cliente:clienti(id, nome, cognome, studio_nome, telefono),
        tecnico:tecnici(id, nome, cognome, sigla)
      `)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('data_consegna_prevista', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200)

    if (stato) {
      query = query.eq('stato', stato)
    }

    if (q) {
      query = query.ilike('descrizione', `%${q}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ lavori: data ?? [] })
  })
}

type ColoreCaso = { colore_scala: string | null; colore_codice: string | null }
const NESSUN_COLORE: ColoreCaso = { colore_scala: null, colore_codice: null }

/**
 * Il colore di CASO, normalizzato e confrontato col catalogo `colori_dentali`.
 *
 * 🛑 NON FALLISCE MAI. Se il codice non si riconosce si perde IL COLORE, non il
 * lavoro: si corregge dalla scheda (direttiva «ogni campo del lavoro si
 * corregge, fino alla consegna», 27/07/2026).
 *
 * 🔴 Perché vive QUI e non nel client (misurato il 28/07/2026):
 *
 *   begin; update lavori set colore_scala='vita_classical', colore_codice='a3'
 *     where id=(select id from lavori limit 1); rollback;
 *   → ERRORE SQL: insert or update on table "lavori" violates foreign key
 *     constraint "lavori_colore_caso_fk"
 *
 * La chiave esterna verso `colori_dentali` esiste ANCHE su `lavori`, non solo
 * sulle quattro di `lavori_denti`. Il catalogo distingue le maiuscole: «A3» c'è,
 * «a3» no. Quindi un colore digitato di fretta al banco non «non si salva»: fa
 * fallire la CREAZIONE del lavoro con un 500. Una garanzia che vivesse solo nel
 * client non sarebbe una garanzia — il client si aggira, e domani i client
 * saranno più d'uno.
 *
 * 📌 CONTRATTO DEL POST, dichiarato perché il Task 11-bis non debba indovinarlo:
 * `colore_codice` può arrivare SENZA `colore_scala`, e allora la scala si deduce
 * dal catalogo. È lecito perché i 48 codici sono distinti fra le tre scale
 * (16 vita_classical + 29 vita_3d_master + 3 fuori_scala, verificato il
 * 28/07/2026); se un domani un codice comparisse in due scale, `trovate.length
 * !== 1` lo scarta invece di tirare a indovinare. Il `PUT /api/lavori/[id]/denti`
 * oggi NON fa nulla di tutto questo (limite dichiarato a `denti/route.ts:157-160`):
 * allinearli è il Task 11-bis, non questo.
 */
async function risolviColoreCaso(
  svc: ReturnType<typeof getServiceClient>,
  scalaGrezza: unknown,
  codiceGrezzo: unknown
): Promise<ColoreCaso> {
  // Mezza coppia non è mezzo colore: è nessun colore. Una scala orfana
  // violerebbe `lavori_colore_caso_coppia_ck` dentro la RPC — 500, nessun
  // lavoro. Un codice che non è nemmeno una stringa cade qui.
  if (typeof codiceGrezzo !== 'string') return NESSUN_COLORE
  const codice = codiceGrezzo.trim().toUpperCase()
  if (codice.length === 0) return NESSUN_COLORE

  const scala =
    typeof scalaGrezza === 'string' && scalaGrezza.trim().length > 0 ? scalaGrezza.trim() : null

  const { data, error } = await svc.from('colori_dentali').select('scala, codice').eq('codice', codice)
  // Anche un catalogo irraggiungibile scarta il colore invece di far fallire la
  // creazione: la regola dura non ha eccezioni tecniche.
  if (error || !data) return NESSUN_COLORE

  const trovate = scala === null ? data : data.filter((r) => r.scala === scala)
  if (trovate.length !== 1) return NESSUN_COLORE
  return { colore_scala: trovate[0].scala, colore_codice: trovate[0].codice }
}

export async function POST(req: Request) {
  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  // Authenticate
  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const svc = getServiceClient()
  const labId: string = context.laboratorioId

  let grezzo: unknown
  try {
    grezzo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  // ⚠️ `JSON.stringify(null)` è la stringa "null": `req.json()` la parsa SENZA
  // lanciare, quindi il catch qui sopra NON scatta e ogni lettura `body.campo`
  // sarebbe un TypeError → 500 non gestito. Un corpo che non è un oggetto è un
  // errore di richiesta, e va detto. Stessa classe già chiusa in
  // `lavori/[id]/cassetta/route.ts` e dichiarata in `[id]/denti/route.ts:77-84`.
  if (grezzo === null || typeof grezzo !== 'object' || Array.isArray(grezzo)) {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }
  const body = grezzo as Record<string, unknown>

  // Validazione server-side campi obbligatori
  if (!body.cliente_id || typeof body.cliente_id !== 'string') {
    return NextResponse.json({ error: 'cliente_id obbligatorio' }, { status: 422 })
  }
  if (!body.tipo_dispositivo || typeof body.tipo_dispositivo !== 'string') {
    return NextResponse.json({ error: 'tipo_dispositivo obbligatorio' }, { status: 422 })
  }
  if (!body.descrizione || typeof body.descrizione !== 'string') {
    return NextResponse.json({ error: 'descrizione obbligatoria' }, { status: 422 })
  }
  if (!body.data_consegna_prevista || typeof body.data_consegna_prevista !== 'string') {
    return NextResponse.json({ error: 'data_consegna_prevista obbligatoria' }, { status: 422 })
  }
  if (!(MACRO_SLUGS as string[]).includes(body.tipo_dispositivo)) {
    return NextResponse.json({ error: 'tipo_dispositivo non valido' }, { status: 422 })
  }

  // Validate FK tenant ownership BEFORE generating progressivo
  // (avoids burning sequence numbers on rejected requests)
  const FK_FIELDS_INSERT: { field: string; table: string }[] = [
    { field: 'cliente_id', table: 'clienti' },
    { field: 'paziente_id', table: 'pazienti' },
    { field: 'tecnico_id', table: 'tecnici' },
    { field: 'ciclo_id', table: 'cicli_produzione' },
  ]
  const fkCandidates: Record<string, unknown> = {
    cliente_id: body.cliente_id,
    paziente_id: body.paziente_id ?? null,
    tecnico_id: body.tecnico_id ?? null,
    ciclo_id: body.ciclo_id ?? null,
  }
  for (const { field, table } of FK_FIELDS_INSERT) {
    const fkId = fkCandidates[field]
    if (fkId && typeof fkId === 'string') {
      const { data: fkRow } = await svc
        .from(table)
        .select('laboratorio_id')
        .eq('id', fkId)
        .is('deleted_at', null)
        .single()
      if (!fkRow || fkRow.laboratorio_id !== labId) {
        return NextResponse.json(
          { error: `${field} non appartiene a questo laboratorio` },
          { status: 403 }
        )
      }
    }
  }

  // Validazione dei denti PRIMA della RPC: un valore fuori dominio deve tornare
  // un 422 leggibile che dice QUALE dente, non un 500 dal CHECK del database —
  // e senza bruciare un progressivo. Ogni controllo qui ha il suo gemello in
  // `20260727120100_lavori_denti_tabella.sql`: il database resta la rete,
  // questa è la porta.
  //
  // 🔴 `denti` presente ma NON una lista è un 422, mai un «nessun dente».
  // Un `Array.isArray(body.denti) ? ... : []` trasformerebbe un oggetto o una
  // stringa in lista vuota: 201, zero denti, nessun errore — il dato sparirebbe
  // in silenzio e l'utente leggerebbe «Salvato». Anche `null` cade qui: chi non
  // ha denti da mandare OMETTE la chiave, non la manda vuota.
  const dentiIn: Array<Record<string, unknown>> = []
  if (body.denti !== undefined) {
    if (!Array.isArray(body.denti)) {
      return NextResponse.json({ error: 'denti deve essere una lista' }, { status: 422 })
    }
    const vistiFdi = new Set<number>()
    for (const grezzoDente of body.denti as unknown[]) {
      if (!grezzoDente || typeof grezzoDente !== 'object' || Array.isArray(grezzoDente)) {
        return NextResponse.json(
          { error: 'ogni dente deve essere un oggetto', valore: grezzoDente },
          { status: 422 }
        )
      }
      const d = grezzoDente as Record<string, unknown>
      if (!isFdiValido(d.fdi)) {
        return NextResponse.json({ error: 'numero di dente non valido', valore: d.fdi }, { status: 422 })
      }
      if (vistiFdi.has(d.fdi)) {
        return NextResponse.json({ error: 'dente ripetuto', valore: d.fdi }, { status: 422 })
      }
      vistiFdi.add(d.fdi)
      dentiIn.push(d)
    }
  }

  // Creazione ATOMICA: progressivo + lavoro + denti in una transazione sola.
  // Motivo NORMATIVO, non di comodità (spec §4, rischio R1): un colore perso in
  // silenzio produce una Dichiarazione priva di un contenuto obbligatorio
  // dell'Allegato XIII. Prima di questa modifica il lavoro nasceva con un
  // INSERT e i denti arrivavano dopo con una PATCH fail-soft: se quella
  // falliva, il lavoro esisteva e il dato no.
  // L'anno è quello del giorno civile di ROMA, non dell'orologio del processo:
  // in produzione il server gira in UTC, e `new Date().getFullYear()` fra le
  // 00:00 e l'01:00 di Roma del 1° gennaio è ancora indietro di un anno. Qui non
  // sarebbe un dettaglio estetico: questo valore diventa `v_anno` dentro
  // lavoro_crea_atomico e alimenta genera_progressivo(p_lab, 'lavoro', v_anno)
  // — la SERIE del numero di lavoro, che finisce nella Dichiarazione di
  // Conformità e in fattura. Con l'anno del server il lavoro nascerebbe con
  // `data_ingresso` (già di Roma, sotto) al 1° gennaio e il numero pescato dalla
  // serie dell'anno prima.
  const anno = annoRoma()
  const colore = await risolviColoreCaso(svc, body.colore_scala, body.colore_codice)
  const { data: esitoRpc, error: rpcError } = await callRpcWithRetry(() =>
    svc.rpc('lavoro_crea_atomico', {
      p_lab: labId,
      p_lavoro: {
        anno_lavoro: anno,
        tipo_dispositivo: body.tipo_dispositivo,
        descrizione: body.descrizione,
        data_consegna_prevista: body.data_consegna_prevista,
        ora_consegna: body.ora_consegna ?? null,
        richiedente_nome: body.richiedente_nome ?? null,
        priorita: body.priorita ?? 'normale',
        dispositivo_semilavorato: body.dispositivo_semilavorato ?? false,
        note_interne: body.note_interne ?? null,
        cliente_id: body.cliente_id,
        paziente_id: body.paziente_id ?? null,
        tecnico_id: body.tecnico_id ?? null,
        ciclo_id: body.ciclo_id ?? null,
        classe_rischio: body.classe_rischio ?? 'classe_i',
        da_conformare: body.da_conformare ?? true,
        codice_iva: body.codice_iva ?? 'N4',
        natura_iva: body.natura_iva ?? 'N4',
        data_ingresso: oggiRomaISO(),
        // Già passati dal catalogo: al database arriva una coppia che ESISTE,
        // oppure due null. Mai il grezzo del client (v. risolviColoreCaso).
        colore_scala: colore.colore_scala,
        colore_codice: colore.colore_codice,
      },
      p_denti: dentiIn,
    })
  )

  // postgrest NON lancia: l'errore si controlla, non si aspetta in un catch.
  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  const esito = esitoRpc as {
    esito?: string
    id?: string
    numero_lavoro?: string
    stato?: string
    dettaglio?: string
  } | null

  // I tre campi si controllano tutti: se anche uno solo mancasse, il client
  // riceverebbe un lavoro senza numero e lo mostrerebbe come creato.
  if (esito?.esito !== 'ok' || !esito.id || !esito.numero_lavoro || !esito.stato) {
    return NextResponse.json({ error: esito?.dettaglio ?? 'Creazione non riuscita' }, { status: 500 })
  }

  const lavoro = { id: esito.id, numero_lavoro: esito.numero_lavoro, stato: esito.stato }

  // Genera le fasi di produzione dal ciclo scelto, se presente.
  // Non blocca la creazione del lavoro già avvenuta se qualcosa qui fallisce:
  // le fasi si possono sempre aggiungere/correggere dopo.
  if (body.ciclo_id && typeof body.ciclo_id === 'string') {
    const { data: fasiCiclo, error: fasiCicloError } = await svc
      .from('fasi_produzione')
      .select('id, ordine, responsabile_id')
      .eq('ciclo_id', body.ciclo_id)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('ordine', { ascending: true })

    if (fasiCicloError) {
      console.error(`[POST /api/lavori] fetch fasi_produzione fallito per ciclo_id=${body.ciclo_id}, lavoro_id=${lavoro.id}:`, fasiCicloError.message)
    }

    if (fasiCiclo && fasiCiclo.length > 0) {
      const lavoriFasiRows = fasiCiclo.map((fase) => ({
        lavoro_id: lavoro.id,
        fase_id: fase.id,
        laboratorio_id: labId,
        tecnico_id: fase.responsabile_id ?? null,
      }))
      const { error: lavoriFasiError } = await svc.from('lavori_fasi').insert(lavoriFasiRows)
      if (lavoriFasiError) {
        console.error(`[POST /api/lavori] insert lavori_fasi fallito per lavoro_id=${lavoro.id}, ciclo_id=${body.ciclo_id}:`, lavoriFasiError.message)
      }
    }
  }

  return NextResponse.json({ lavoro }, { status: 201 })
}

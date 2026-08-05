import { NextResponse } from 'next/server'
import { oggiRomaISO, annoRoma } from '@/lib/utils/data-roma'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'
import { testoVivoDaCorpo } from '@/lib/utils/testo'
import { MACRO_SLUGS } from '@/lib/domain/tipi-lavoro'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
// La validazione dei denti è UNA SOLA e vive in `lib/domain`: la chiamano
// questa creazione e la sostituzione integrale (`PUT /api/lavori/[id]/denti`).
// Fino al 28/07/2026 viveva solo nel PUT, e qui si controllavano `fdi` e i
// duplicati e basta — con l'oggetto grezzo che finiva alla RPC (rilievo G2).
import { validaDenti, type DenteNormalizzato } from '@/lib/domain/denti-validazione'
// La normalizzazione del colore di caso è UNA SOLA e vive in `lib/api`: la
// chiamano questa creazione e la correzione dalla scheda (PATCH /api/lavori/
// [id], Task 12-bis). Due copie della stessa regola sono la classe R3.
import { risolviColoreCaso } from '@/lib/api/colore-caso'
// Lo snapshot della prescrizione si compone QUI, server-side (ondata B ②, V3):
// il client manda dati grezzi (colore come digitato, numero), mai testo MDR
// composto. La semantica (V2, W20, D210, D213) vive nel modulo.
import { componiSnapshot, type PrescrizioneInput } from '@/lib/prescrizione/componi-snapshot'

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
  // e senza bruciare un progressivo.
  //
  // 🛑 E DEVE ESSERE LA STESSA DEL PUT, non una sua metà (rilievo G2 della
  // revisione pre-merge, 28/07/2026). Qui si guardavano `fdi` e i duplicati e
  // poi si spediva alla RPC l'oggetto GREZZO; `lavoro_crea_atomico` non ha
  // exception handler attorno all'INSERT dei denti, quindi un `ruolo` inventato
  // o una mezza coppia di colore non facevano perdere il DENTE: facevano
  // abortire l'intera creazione, con un 500 col messaggio Postgres crudo e il
  // lavoro che non nasceva. Il rovescio della regola dura del ramo.
  //
  // 🔑 E si spedisce la lista NORMALIZZATA, non quella grezza: senza il `.trim()`
  // un `scala: '  vita_classical  '` passerebbe ogni controllo di forma e
  // arriverebbe al database con gli spazi attaccati — `lavori_denti_colore_fk`,
  // 500, di nuovo il lavoro perso. Da qui in avanti le due porte mandano alla
  // banca dati oggetti della STESSA forma.
  //
  // 🔴 `denti` presente ma NON una lista è un 422, mai un «nessun dente».
  // Un `Array.isArray(body.denti) ? ... : []` trasformerebbe un oggetto o una
  // stringa in lista vuota: 201, zero denti, nessun errore — il dato sparirebbe
  // in silenzio e l'utente leggerebbe «Salvato». Anche `null` cade qui: chi non
  // ha denti da mandare OMETTE la chiave, non la manda vuota. ⚠️ Questa
  // distinzione fra «assente» e «presente ma sbagliata» resta QUI e non entra
  // nel modulo condiviso: è l'unica differenza legittima fra le due porte (sul
  // PUT la lista è il corpo stesso della richiesta) e va vista dove sta.
  let dentiIn: DenteNormalizzato[] = []
  if (body.denti !== undefined) {
    const esitoDenti = validaDenti(body.denti)
    if (!esitoDenti.ok) {
      return NextResponse.json({ error: esitoDenti.errore, valore: esitoDenti.valore }, { status: 422 })
    }
    dentiIn = esitoDenti.denti
  }

  // La trascrizione della prescrizione (ondata B ②). Il GATE è la presenza
  // della chiave `prescrizione`: la trascrizione nasce SOLO se il client la
  // dichiara. Senza questo gate ogni body legacy CON denti produrrebbe una
  // riga di `lavori_prescrizioni` dal giorno del deploy del server, prima che
  // il wizard nuovo esista — e la retro-compatibilità chiede la chiamata RPC
  // IDENTICA a oggi per i body senza i campi nuovi.
  // Stessa regola di `denti` (sopra): presente ma della forma sbagliata è un
  // 422, mai un «niente da trascrivere» — anche `null` cade qui, chi non
  // trascrive OMETTE la chiave.
  let prescrizioneIn: PrescrizioneInput | undefined
  if (body.prescrizione !== undefined) {
    const grezzaP = body.prescrizione
    if (grezzaP === null || typeof grezzaP !== 'object' || Array.isArray(grezzaP)) {
      return NextResponse.json({ error: 'prescrizione deve essere un oggetto' }, { status: 422 })
    }
    const p = grezzaP as Record<string, unknown>
    // Il colore si trascrive COME DIGITATO (D210) — ma solo se è un testo: un
    // numero o un oggetto non sono una trascrizione, e passarli stringificati
    // sarebbe inventare un testo che il medico non ha scritto.
    if (p.colore !== undefined && typeof p.colore !== 'string') {
      return NextResponse.json({ error: 'colore della prescrizione non valido', valore: p.colore }, { status: 422 })
    }
    if (p.numero_prescrizione !== undefined && typeof p.numero_prescrizione !== 'string') {
      return NextResponse.json({ error: 'numero_prescrizione non valido', valore: p.numero_prescrizione }, { status: 422 })
    }
    prescrizioneIn = {
      colore: p.colore as string | undefined,
      numero_prescrizione: p.numero_prescrizione as string | undefined,
    }
  }
  // null = NIENTE di prescritto (V2): nessuna riga. Un contenuto `{}` con
  // numero presente è invece una riga legittima (M-T3-3) — la distinzione la
  // fa `componiSnapshot`, qui si rispetta l'esito.
  const snapshotPrescrizione =
    prescrizioneIn !== undefined ? componiSnapshot(dentiIn, prescrizioneIn) : null

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
        // D242 — `''` non entra: è la SECONDA ortografia di «non c'è», e i
        // documenti ne conoscono una sola (`null`). Chi manda una stringa
        // vuota, o di soli spazi, sta dicendo «nessun prescrittore»: si scrive
        // così sulla riga, e il ripiego sul cliente scatta come deve.
        richiedente_nome: testoVivoDaCorpo(body.richiedente_nome),
        // P37 (ondata B ②): l'istituzione sanitaria del prescrittore. Per la
        // RPC `p_lavoro->>'istituzione_sanitaria'` la chiave a null e la chiave
        // assente sono lo stesso SQL NULL.
        // 📌 D242 — stessa normalizzazione del campo gemello qui sopra. Oggi
        // nessun documento la legge: questa è prevenzione dichiarata, perché
        // l'ondata che la stamperà troverebbe la stessa trappola.
        istituzione_sanitaria: testoVivoDaCorpo(body.istituzione_sanitaria),
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
      // 🛑 M-T3-2: quando non c'è niente di trascritto la chiave si OMETTE,
      // non si manda `p_prescrizione: null`. Con PostgREST un JSON null
      // diventa `'null'::jsonb`, che NON è SQL NULL: l'`IF p_prescrizione IS
      // NOT NULL` della RPC scatterebbe e nascerebbe una riga fantasma di
      // `lavori_prescrizioni` per ogni lavoro senza trascrizione.
      ...(snapshotPrescrizione !== null ? { p_prescrizione: snapshotPrescrizione } : {}),
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

  // `colore_scartato` (M2, 28/07/2026): il colore digitato male non fa fallire
  // la creazione — ma il 201 da solo dice «tutto a posto», e non era vero. Il
  // campo c'è SEMPRE, anche `false`: un consumatore non deve distinguere «no»
  // da «non me l'ha detto». È l'unica informazione che il client non può
  // dedurre da sé (il confronto col catalogo vive qui, v. risolviColoreCaso).
  return NextResponse.json({ lavoro, colore_scartato: colore.scartato }, { status: 201 })
}

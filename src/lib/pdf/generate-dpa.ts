import 'server-only'
import { createElement } from 'react'
import { createHash } from 'node:crypto'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { DpaTemplate } from '@/components/features/pdf/DpaTemplate'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import type { Laboratorio, Cliente } from '@/types/domain'
import { annoRoma } from '@/lib/utils/data-roma'
import { generaProgressivo } from '@/lib/db/progressivi'
import { improntaDpa, VERSIONE_MODELLO_DPA } from '@/lib/pdf/dpa-modello'

/** Il risultato di un'EMISSIONE — non di una generazione.
 *
 *  🔑 La differenza è il punto dell'ondata: prima di D129/D130 `generateDpa()`
 *  rendeva un PDF al volo e UÀ non sapeva quale testo avesse in mano ogni
 *  studio. Ora ogni scarico lascia una riga in `data_processing_agreements`,
 *  con un numero progressivo vero e il file conservato nel contenitore privato.
 *
 *  `riemessa` dice se il documento è nato ADESSO. Nel Task 4 è sempre `true`
 *  (non c'è ancora nulla da riusare); il guard di riuso del Task 5 è ciò che le
 *  darà anche il valore `false`. */
export interface EmissioneDpa {
  buffer: Buffer
  numero_dpa: string      // es. "DPA-2026-0007"
  emissione_id: string    // uuid della riga di registro
  riemessa: boolean       // true = generata ora, false = restituita dall'archivio
}

/** Il PDF conservato è DAVVERO sparito, o l'archivio è solo irraggiungibile?
 *
 *  🔑 È la domanda su cui gira tutto il fail-closed di questa funzione, perché
 *  la risposta «sì» autorizza un atto DISTRUTTIVO: archiviare la riga di
 *  registro. Su un'indisponibilità passeggera scambiata per «file sparito» la
 *  riga viene archiviata, poi fallisce anche il caricamento del sostituto e si
 *  solleva — e il registro vivo resta SENZA nessun DPA per quel dentista. Se la
 *  riga archiviata era `firmato`, `firmato_da`/`firmato_at` restano nella riga
 *  morta: da lì in poi ogni lettura vede «da firmare» dove esiste un accordo
 *  FIRMATO.
 *
 *  ═══ Le due trappole, misurate sul progetto vero il 03/08/2026 ═══
 *  `provato:` `curl "$URL/storage/v1/object/documenti/<inesistente>"`
 *    → `HTTP 400` · `{"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}`
 *  `provato:` `curl "$URL/storage/v1/object/<bucket-inesistente>/x.pdf"`
 *    → `HTTP 400` · `{"statusCode":"404","error":"Bucket not found","message":"Bucket not found","code":"NoSuchBucket"}`
 *  `provato:` la stessa richiesta SENZA credenziali → risposta IDENTICA alla seconda.
 *
 *  🛑 ① `status` vale **400**, NON 404. Un `errore.status === 404` — che è la
 *     forma che viene naturale — non sarebbe MAI vero in produzione: l'orfana
 *     non verrebbe mai archiviata e la riemissione resterebbe una porta chiusa
 *     permanente.
 *  🛑 ② `statusCode` è la STRINGA `'404'`, e la dice anche il contenitore
 *     mancante — cioè una chiave di servizio ruotata male. Archiviare su quel
 *     solo segnale vorrebbe dire archiviare OGNI riga del registro alla prima
 *     rotazione sbagliata, comprese le `firmato`.
 *
 *  🔑 Per questo è una ALLOWLIST, mai una denylist: si archivia SOLO su ciò che
 *  si riconosce. Un 503, una rete caduta (`StorageUnknownError`: nessun
 *  `status`, `@supabase/storage-js/src/lib/common/fetch.ts:85`) o un testo che
 *  domani sarà nuovo sono tutti DUBBI — e nel dubbio non si distrugge niente.
 *  Il prezzo di sbagliare per eccesso di prudenza è un errore rumoroso che
 *  qualcuno viene a leggere; il prezzo di sbagliare per difetto è la perdita
 *  silenziosa di uno stato firmato.
 *  ⚠️ Il confronto è sul messaggio ESATTO, non `.includes('not found')`: quello
 *  è il modo di casa (`generate-ddc.ts:189`, `generate-buono.ts:49`) e qui
 *  sarebbe sbagliato, perché prenderebbe anche «Bucket not found». */
function fileDavveroAssente(errore: { message?: string; statusCode?: string } | null | undefined): boolean {
  return errore?.statusCode === '404' && errore.message === 'Object not found'
}

function validateDpaData(lab: Laboratorio, cliente: Cliente): void {
  if (!lab.partita_iva && !lab.codice_fiscale) {
    throw new Error('DPA: laboratorio privo di Partita IVA e Codice Fiscale')
  }
  if (!cliente.partita_iva && !cliente.codice_fiscale) {
    throw new Error('DPA: cliente privo di Partita IVA e Codice Fiscale')
  }
}

export async function generateDpa(laboratorio_id: string, cliente_id: string): Promise<EmissioneDpa> {
  const svc = getTypedServiceClient()

  const [{ data: labRaw, error: erroreLab }, { data: clienteRaw, error: erroreCliente }] = await Promise.all([
    svc.from('laboratori').select('*').eq('id', laboratorio_id).single(),
    svc.from('clienti').select('*').eq('id', cliente_id).eq('laboratorio_id', laboratorio_id).single(),
  ])

  // 🔑 Il dato ASSENTE e il dato NON LETTO sono due fatti diversi, e vanno
  //    detti diversi. Scartando l'errore, chi ha solo perso la rete per due
  //    secondi legge «Laboratorio non trovato» e va a cercare un dato che c'è.
  //    ⚠️ `.single()` risponde con l'errore PGRST116 anche quando semplicemente
  //    non ha trovato la riga: per questo il «non trovato» resta affidato a
  //    `!labRaw` qui sotto, e qui passa solo ciò che ha un `data` nullo E un
  //    errore che non sia quello — v. `erroreDiLettura`.
  const erroreDiLettura = [erroreLab, erroreCliente].find((e) => e && e.code !== 'PGRST116')
  if (erroreDiLettura) {
    console.error('generateDpa — lettura di laboratorio/cliente fallita:', erroreDiLettura.message)
    throw new Error('DPA: non è stato possibile leggere i dati di laboratorio e cliente')
  }

  if (!labRaw) throw new Error('Laboratorio non trovato')
  if (!clienteRaw) throw new Error('Cliente non trovato')

  // Cast puntuale sul risultato: lo schema reale tipizza alcune colonne enum
  // (es. laboratori.piano, clienti.listino_numero) come stringa/numero generico
  // invece delle union letterali di domain.ts — la query stessa resta type-safe
  // sullo schema (typo sulle colonne vengono comunque intercettati da tsc).
  const lab = labRaw as Laboratorio
  const cliente = clienteRaw as Cliente

  validateDpaData(lab, cliente)

  const impronta = improntaDpa(lab, cliente)

  // Guard di riuso (D130). Il confronto è su DUE cose insieme: impronta dei dati
  // E versione del modello — il testo può cambiare a dati identici (D126, 03/08).
  // 🛑 Il filtro laboratorio_id è esplicito: il client di servizio aggira la RLS.
  const { data: esistente, error: erroreGuard } = await svc
    .from('data_processing_agreements')
    .select('id, numero_dpa, storage_path_pdf, payload_sha256, template_versione')
    .eq('laboratorio_id', laboratorio_id)
    .eq('dentista_id', cliente_id)
    .eq('payload_sha256', impronta)
    .eq('template_versione', VERSIONE_MODELLO_DPA)
    .is('deleted_at', null)
    // D132: «viva» comprende lo STATO. Lo stesso predicato dell'indice
    // dpa_emissione_viva_unica — se cambia uno, cambiano tutti e tre (indice,
    // guard, rilettura del Task 6). Senza questo filtro il guard restituirebbe
    // come corrente un contratto REVOCATO che l'indice considera morto.
    .not('stato', 'in', '("revocato","scaduto")')
    .order('emesso_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 🛑 Un guasto di LETTURA non è «non c'è nessuna emissione».
  //    Scartandolo, una rete caduta si legge come registro vuoto: si brucia un
  //    progressivo, si carica un PDF orfano, e l'INSERT prende 23505 dalla riga
  //    viva che c'era e non si è vista. `.maybeSingle()` sulle zero righe
  //    risponde `data: null, error: null` (`provato:` `curl` senza
  //    `Accept: …pgrst.object+json` → `HTTP 200 []`), quindi qui QUALUNQUE
  //    errore è un errore vero — nessun PGRST116 da scansare, al contrario
  //    delle `.single()` qui sopra.
  if (erroreGuard) {
    console.error('generateDpa — registro non leggibile:', erroreGuard.message)
    throw new Error('DPA: non è stato possibile leggere il registro')
  }

  if (esistente?.storage_path_pdf) {
    const { data: file, error: erroreScarico } = await svc.storage.from('documenti').download(esistente.storage_path_pdf)
    if (file) {
      return {
        buffer: Buffer.from(await file.arrayBuffer()),
        numero_dpa: esistente.numero_dpa as string,
        emissione_id: esistente.id as string,
        riemessa: false,
      }
    }

    // 🛑 IL CANCELLO DEL FAIL-CLOSED. Da qui in giù si archivia una riga di
    //    registro, ed è un atto distruttivo: si fa SOLO col file riconosciuto
    //    come davvero assente. Tutto il resto — 503, rete caduta, contenitore
    //    che non risponde, o un `error` che non c'è affatto — è un dubbio, e nel
    //    dubbio non si tocca niente: né la riga, né il progressivo, né
    //    l'archivio. Chi ha davanti l'errore riprova fra un minuto e trova
    //    tutto com'era.
    if (!fileDavveroAssente(erroreScarico)) {
      console.error('generateDpa — archivio non raggiungibile, NON archivio niente:', esistente.storage_path_pdf, erroreScarico?.message ?? 'né file né errore')
      throw new Error('DPA: archivio non raggiungibile, riprovare fra qualche istante')
    }
    // File sparito dall'archivio: meglio un numero nuovo che una porta chiusa.
    // 🛑 MA PRIMA VA LIBERATA LA CHIAVE — senza questo UPDATE, con
    //    dpa_emissione_viva_unica in casa, la riemissione è una porta chiusa
    //    PERMANENTE: la riga orfana occupa la chiave (laboratorio, dentista,
    //    impronta, versione), l'INSERT qui sotto prende 23505, la rilettura del
    //    Task 6 ritrova la STESSA orfana e si ricade sul throw — e ogni clic,
    //    prima di fallire, brucia un progressivo e carica un PDF orfano in più,
    //    perché il caricamento precede l'INSERT.
    //    Il soft-delete lascia comunque TRACCIA: una riga il cui file non esiste
    //    più è un'emissione che non documenta niente, e archiviarla è un atto
    //    che deve risultare, non un effetto collaterale.
    const { error: erroreArchiviazione } = await svc
      .from('data_processing_agreements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', esistente.id)
      .eq('laboratorio_id', laboratorio_id)   // il client di servizio aggira la RLS
    // 🛑 Se l'archiviazione non riesce, la chiave è ANCORA occupata: andare
    //    avanti vuol dire bruciare un progressivo e caricare un PDF orfano per
    //    poi prendersi comunque il 23505. Ci si ferma prima di pagare tutto
    //    quello per un errore già certo.
    if (erroreArchiviazione) {
      console.error('generateDpa — archiviazione della riga orfana fallita:', esistente.id, erroreArchiviazione.message)
      throw new Error("DPA: non è stato possibile archiviare l'emissione senza file")
    }
    console.error('generateDpa — PDF conservato non trovato, riga archiviata e riemetto:', esistente.storage_path_pdf)
  }

  const anno = annoRoma()
  // 🛑 ① IL MESSAGGIO DEL DATABASE USCIVA DA QUI, una riga sopra tutte le altre
  //    che questo file ha già chiuso. `generaProgressivo` interpola
  //    `error.message` dentro il proprio `Error` (`src/lib/db/progressivi.ts:30-32`)
  //    e `route.ts:41-43` rimanda `e.message` al browser dentro un JSON: senza
  //    questo `try`, su un guasto vero il testo PUBBLICO conteneva l'INSERT per
  //    intero, il nome di `public.progressivi_anno` e la firma della funzione.
  //    Stessa regola di ogni altro guasto di questo file: il dettaglio nel LOG,
  //    al chiamante un testo FISSO.
  //    ⚠️ Il `try` avvolge SOLO questa chiamata. Allargarlo al rendering o al
  //    caricamento vorrebbe dire raccontare come «numero non assegnato» un
  //    guasto che non lo è — e questo file distingue i guasti apposta.
  //    📌 `progressivi.ts` ha lo STESSO difetto per tutti gli altri documenti
  //    (DdC, buono, fattura, invio SDI): è fuori dal mandato di questo task e va
  //    RIFERITO, non corretto di nascosto (R-E2). V. referto Task 6, «Riserve».
  let progressivo: number
  try {
    progressivo = await generaProgressivo(svc, laboratorio_id, 'dpa', anno)
  } catch (e) {
    console.error('generateDpa — progressivo non assegnato:', e instanceof Error ? e.message : String(e))
    throw new Error('DPA: non è stato possibile assegnare il numero al documento')
  }
  const numero_dpa = `DPA-${anno}-${String(progressivo).padStart(4, '0')}`

  const dpa = {
    lab: {
      ragione_sociale: lab.ragione_sociale,
      nome: lab.nome,
      partita_iva: lab.partita_iva,
      codice_fiscale: lab.codice_fiscale,
      indirizzo: lab.indirizzo,
      cap: lab.cap,
      citta: lab.citta,
      provincia: lab.provincia,
      prrc_nome: lab.prrc_nome,
      codice_itca: lab.codice_itca,
    },
    cliente: {
      studio_nome: cliente.studio_nome,
      nome: cliente.nome,
      cognome: cliente.cognome,
      partita_iva: cliente.partita_iva,
      codice_fiscale: cliente.codice_fiscale,
      indirizzo: cliente.indirizzo,
      cap: cliente.cap,
      citta: cliente.citta,
      provincia: cliente.provincia,
    },
    numero_dpa,
    data_emissione: new Date().toISOString(),
  }

  const buffer = await renderPdfDocument(createElement(DpaTemplate, { dpa }))

  // Il FILE prima della RIGA: se il caricamento fallisce, nessuna traccia resta
  // in banca dati. Stessa regola di D61 (immagini/[imgId]/route.ts:207-219).
  //
  // ⚠️ La promessa vale per `data_processing_agreements`, NON per la serie dei
  // numeri: `generaProgressivo` ha già incrementato `progressivi_anno` con una
  // RPC committata, e nessun errore qui sotto la annulla. Se l'archivio rifiuta,
  // quel numero è BRUCIATO e la serie mostra un buco. L'ordine è però FORZATO,
  // non distratto: `storage_path_pdf` contiene `numero_dpa`, quindi il numero
  // deve esistere prima del caricamento — invertire richiederebbe caricare su un
  // percorso provvisorio e poi spostarlo, che è fuori da questo task.
  const storage_path_pdf = `${laboratorio_id}/dpa/${anno}/${numero_dpa}.pdf`
  const { error: erroreFile } = await svc.storage
    .from('documenti')
    .upload(storage_path_pdf, buffer, { contentType: 'application/pdf', upsert: false })
  if (erroreFile) {
    console.error('generateDpa — caricamento del PDF fallito:', erroreFile.message)
    throw new Error('DPA: non è stato possibile conservare il documento')
  }

  const { data: riga, error: erroreRiga } = await svc
    .from('data_processing_agreements')
    .insert({
      laboratorio_id,
      tipo_controparte: 'dentista',
      dentista_id: cliente_id,
      stato: 'da_firmare',
      // 🛑 D133: la costante, MAI il letterale — porta dentro l'impronta del
      // testo, quindi cambia da sola quando cambia il contratto.
      template_versione: VERSIONE_MODELLO_DPA,
      numero_dpa,
      anno_dpa: anno,
      progressivo_dpa: progressivo,
      storage_path_pdf,
      pdf_sha256: createHash('sha256').update(buffer).digest('hex'),
      payload_sha256: impronta,
      emesso_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (erroreRiga || !riga) {
    // Il PDF caricato poco fa non sarà nominato da NESSUNA riga, qualunque
    // strada prenda questo blocco: va tolto prima di ogni uscita, non solo sul
    // cammino felice del recupero. Un file coi dati dello studio che nessuno
    // può più raggiungere né cancellare è un problema di minimizzazione (GDPR),
    // non di ordine.
    // 🔑 Toglierlo QUI, prima della rilettura, è sicuro: la vincitrice ha un
    //    progressivo DIVERSO dal nostro (`genera_progressivo` li dà distinti
    //    apposta), quindi un percorso diverso. E se anche coincidessero,
    //    `upsert: false` avrebbe già fatto fallire il caricamento — quindi il
    //    file su quel percorso è comunque il NOSTRO.
    // ⚠️ Se la rimozione fallisce non si solleva per quello: l'errore da
    //    raccontare è un altro, e un PDF di troppo è meno grave di un errore
    //    sostituito da un altro errore.
    const { error: erroreRimozione } = await svc.storage.from('documenti').remove([storage_path_pdf])
    if (erroreRimozione) {
      console.error('generateDpa — PDF orfano non rimosso:', storage_path_pdf, erroreRimozione.message)
    }

    // Rete di sicurezza per la corsa: due richieste hanno superato entrambe il
    // guard. A separarle è `dpa_emissione_viva_unica` — l'indice sulla chiave
    // di deduplicazione, NON quello sul numero: `genera_progressivo` ha già
    // dato ai due concorrenti progressivi diversi, apposta.
    // ⚠️ Un 23505 può arrivare anche da `dpa_emissione_numero_unico`, e da qui
    //    i due casi NON sono distinguibili: quello è un'anomalia vera (un
    //    numero riusato) e la rilettura qui sotto non lo troverà → si solleva.
    //    È il comportamento voluto, non un caso dimenticato.
    if (erroreRiga?.code === '23505') {
      const { data: vincitrice, error: erroreRilettura } = await svc
        .from('data_processing_agreements')
        .select('id, numero_dpa, storage_path_pdf')
        .eq('laboratorio_id', laboratorio_id)
        .eq('dentista_id', cliente_id)
        .eq('payload_sha256', impronta)
        .eq('template_versione', VERSIONE_MODELLO_DPA)   // 🔑 le QUATTRO colonne
        .is('deleted_at', null)
        .not('stato', 'in', '("revocato","scaduto")')    // 🔑 e lo stesso predicato (D132)
        .order('emesso_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      // 🔑 L'INVARIANTE dell'ondata, da tenere tutta insieme: colonne E
      //    predicato dell'indice = filtro del guard (righe 63-78) = filtro di
      //    questa rilettura. Se cambia uno, cambiano tutti e tre. Con tre
      //    colonne invece di quattro, chi perde la corsa rileggerebbe
      //    l'emissione di un'ALTRA versione di modello e consegnerebbe al
      //    dentista il testo sbagliato — il guasto che questo registro esiste
      //    per impedire.
      //    🔑 Dell'invariante fa parte anche l'ORDINAMENTO, e non è un dettaglio
      //    di stile: le sei condizioni dicono QUALI righe entrano, l'ordine dice
      //    QUALE si prende. Oggi `dpa_emissione_viva_unica` ne ammette al più
      //    UNA viva, quindi l'ordine non morde; il giorno in cui l'indice
      //    cambiasse, sarebbe l'unica riga a decidere il vincitore — e deve
      //    essere la PIÙ RECENTE, qui come nel guard.
      if (erroreRilettura) {
        console.error('generateDpa — rilettura dopo 23505 fallita:', erroreRilettura.message)
      }
      if (vincitrice?.storage_path_pdf) {
        const { data: file, error: erroreScaricoVincitrice } = await svc.storage
          .from('documenti')
          .download(vincitrice.storage_path_pdf)
        if (erroreScaricoVincitrice) {
          console.error('generateDpa — PDF della vincitrice non scaricabile:', vincitrice.storage_path_pdf, erroreScaricoVincitrice.message)
        }
        if (file) {
          return {
            buffer: Buffer.from(await file.arrayBuffer()),
            numero_dpa: vincitrice.numero_dpa as string,
            emissione_id: vincitrice.id as string,
            // Chi perde NON ha emesso niente: la riga è dell'altro, e il numero pure.
            riemessa: false,
          }
        }
      }
    }

    // 🛑 NIENTE `erroreRiga.message` QUI DENTRO. `route.ts:43-44` rimanda
    //    `e.message` al browser dentro un JSON: con il messaggio del database
    //    uscivano il nome del VINCOLO e quello della TABELLA. Il dettaglio
    //    serve a chi ripara, e chi ripara legge i log.
    console.error('generateDpa — registro non scritto:', erroreRiga?.message ?? 'nessuna riga')
    throw new Error('DPA: non è stato possibile registrare il documento')
  }

  return { buffer, numero_dpa, emissione_id: riga.id, riemessa: true }
}

import 'server-only'
import { createElement } from 'react'
import crypto from 'node:crypto'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { generaProgressivo } from '@/lib/db/progressivi'
import { DdcTemplate } from '@/components/features/pdf/DdcTemplate'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'
import { annoRoma } from '@/lib/utils/data-roma'
import { nomePrescrittore } from '@/lib/consegna/prescrittore'
import { caratteristichePrescritte } from '@/lib/prescrizione/caratteristiche-prescritte'

// ═══ `hashFirmaDdc` VIVEVA QUI, E NON C'È PIÙ (07/08/2026, giro di correzione
//     di D294) ══════════════════════════════════════════════════════════════
//
// 🔴 CHE COSA FACEVA, e perché non doveva più farlo: a OGNI emissione scaricava
//    da Storage il file della firma del laboratorio (`fetch`) e ne calcolava
//    l'impronta SHA-256, per scriverla in `firma_ddc_sha256`. Nato con A18 come
//    metadato d'integrità della firma **stampata sulla dichiarazione**.
//    D294 ha tolto il blocco firma dal foglio: da quel momento era una chiamata
//    di rete, dentro il percorso di consegna, per certificare l'integrità di
//    un'immagine che **nessun modello rende più** e per riempire una colonna che
//    **non ha nessun lettore** in tutto il progetto.
//
// 🔑 Perché toglierla è più che risparmiare: era l'unico punto in cui l'emissione
//    di un documento a valore legale dipendeva dalla raggiungibilità di Storage.
//    Era `fail-open` — e il fail-open era la cura giusta per un rischio che ora
//    semplicemente non c'è.
//
// 🛑 QUEL CHE NON È USCITO, perché non è di questo mandato:
//    · le colonne `firma_ddc_url` (laboratori) e `firma_ddc_storage_path`
//      (dichiarazioni_conformita) restano, e la seconda continua a essere
//      scritta a ogni emissione: è la fotografia di com'era configurato il
//      laboratorio quel giorno, e non costa niente;
//    · la **schermata di caricamento** della firma in `/impostazioni` e
//      l'allowlist di `PATCH /api/impostazioni` **non sono toccate**: è una
//      superficie che l'utente vede, e la decisione è di Francesco. Riferita.
//    · con la `fetch` è uscita anche la difesa anti-SSRF `isPublicStorageUrl`,
//      che serviva a non far scaricare al server un URL arbitrario: **non è un
//      indebolimento**, è la scomparsa della superficie che difendeva. La
//      validazione a scrittura in `PATCH /api/impostazioni` resta al suo posto.
// ═══════════════════════════════════════════════════════════════════════════

/** La versione della FORMA del documento. Cambia quando cambia **ciò che il
 *  documento dice** — non a ogni ritocco di codice, e non per un glifo.
 *
 *  🛑 Introdotta con D102, e «introdotta» è la parola giusta: la colonna
 *  `template_version` esiste in `supabase/schema.sql` dal primo giorno e non
 *  l'ha mai scritta nessuno. Fra dieci anni (quindici per gli impiantabili) è la
 *  riga che permette di rileggere un documento sapendo come andava letto.
 *
 *  ═══ REGISTRO DELLE VERSIONI ═════════════════════════════════════════════
 *  `ddc-v1` — dalla prima emissione con le impronte (03/08/2026) a oggi.
 *     Comprende, per decisione **D105**, anche la correzione ortografica del
 *     03/08 (gli accenti in titolo, §7 ed etichetta della firma, e `e'` → `è`
 *     nel testo di conformità) e la comparsa del **§2 — Data di emissione**:
 *     nessuna delle due cambia ciò che il documento DICE.
 *  🔑 Il salto a `ddc-v2` è riservato al primo cambiamento di **sostanza** —
 *     un contenuto dell'Allegato XIII che entra, esce o cambia significato.
 *     I candidati sono già in `docs/superpowers/specs/2026-08-03-accenti-documenti-design.md`
 *     §5 (referral ①②③④): la clausola «e ai disposti dell'Allegato XIII», il
 *     luogo di fabbricazione mancante, il «Sostanze/tessuti: No» affermato senza
 *     dato, l'identificazione del paziente che può ridursi a un trattino.
 *
 *  `ddc-v2` — dal 07/08/2026 (**D295**). ⚠️ È il primo salto, ed è dovuto:
 *     **DUE contenuti dell'Allegato XIII ENTRANO**, e uno dei due era già
 *     nominato fra i candidati qui sopra.
 *       ① **Voce 6** — «le caratteristiche specifiche del prodotto indicate
 *          nella prescrizione». Era cablata a `null` e la riga del modello è
 *          condizionale: **non è mai comparsa su nessuna dichiarazione**. Ora
 *          nasce da `lavori_prescrizioni.contenuto`, resa in italiano da
 *          `caratteristichePrescritte`.
 *       ② **Voce 1** — «il nome e l'indirizzo del fabbricante e di TUTTI I
 *          LUOGHI DI FABBRICAZIONE». `luogo_fabbricazione` esisteva come
 *          colonna `NOT NULL DEFAULT 'Italia'`, non la scriveva nessuno e il
 *          modello non la stampava.
 *     🔑 Perché il salto NON era rimandabile: senza, due documenti che dicono
 *        cose diverse porterebbero la stessa etichetta di versione — e fra
 *        dieci anni questa colonna è l'unica cosa che permette di rileggere una
 *        dichiarazione sapendo come andava letta.
 *
 *  `ddc-v3` — dal 07/08/2026 (**D294**), poche ore dopo `ddc-v2`. ⚠️ È la regola
 *     di sopra letta nell'altra direzione: il salto spetta a un contenuto che
 *     entra, **esce** o cambia significato. Qui **ESCONO DODICI BLOCCHI**, e uno
 *     di essi — il «Sostanze/tessuti: No» affermato senza dato — era già nominato
 *     fra i candidati elencati per `ddc-v1`.
 *     Escono, tutti per la stessa ragione (non sono fra gli otto contenuti
 *     dell'Allegato XIII punto 1): ① materiali e lotti · ② il codice ITCA, che
 *     era stampato **due volte** · ③ l'«SRN EUDAMED», la cui etichetta era
 *     sbagliata due volte · ④ il luogo di **emissione**, anch'esso due volte ·
 *     ⑤ la classe di rischio · ⑥ la norma di riferimento e le norme armonizzate ·
 *     ⑦ i rischi residui · ⑧ il «**Sostanze / tessuti: No**» affermato senza il
 *     dato — ⚠️ **e solo quello**: v. la riga qui sotto · ⑨ la firma con
 *     l'etichetta PRRC, il nome e la qualifica del responsabile · ⑩ il logo ·
 *     ⑪ il piè di pagina · ⑫ i metadati del file.
 *     🔑 **PRECISATO NEL GIRO DI CORREZIONE DELLO STESSO GIORNO, perché la voce
 *        ⑧ non è uscita per intero e la riga di prima lasciava credere di sì.**
 *        Il taglio aveva portato via l'intero blocco condizionale, ramo
 *        affermativo compreso: la voce ⑧ dell'Allegato XIII non aveva più
 *        nessuna strada per comparire, nemmeno con un dato affermativo. Il ramo
 *        affermativo è stato **ripristinato**; a uscire è, e resta, il solo «No»
 *        affermato senza il dato.
 *     📌 **`ddc-v3` NON si spacca in due per questo, ed è una decisione presa
 *        e non subìta.** Il registro salta quando cambia ciò che il documento
 *        **dice**, e `contiene_sostanze_o_tessuti` è ancora cablato a `false`
 *        (v. il commento accanto al valore): **nessuna dichiarazione emessa
 *        cambia di una riga**, né quelle di prima né quelle di oggi. Il giorno
 *        in cui la raccolta del dato arriverà, un documento potrà dire una cosa
 *        che oggi nessun documento dice — e **quello** sarà il salto a `ddc-v4`.
 *     📌 Con le due sezioni svuotate è cambiata anche la **numerazione**: la
 *        dichiarazione di conformità era il §7 ed è il §6.
 *     🛑 Nessuna colonna è stata toccata: escono dal FOGLIO, non dalla banca
 *        dati. `template_version` è ciò che permetterà, fra dieci anni, di
 *        sapere che una dichiarazione `ddc-v2` portava righe che una `ddc-v3`
 *        non porta più — pur nascendo dagli stessi dati.
 *     ⚠️ Le voci precedenti NON si riscrivono e non si riusano: un'etichetta
 *        già emessa che cambiasse significato svuoterebbe il registro intero.
 *  ═════════════════════════════════════════════════════════════════════════ */
const VERSIONE_TEMPLATE_DDC = 'ddc-v3'

/** Il luogo di fabbricazione della VOCE 1, ricavato dal laboratorio.
 *
 *  🔴 DA DOVE ARRIVAVA PRIMA: **da nessuna parte.** La colonna è
 *     `NOT NULL DEFAULT 'Italia'` (`supabase/schema.sql:1251`) e nessuna riga
 *     di codice l'ha mai scritta — quindi ogni dichiarazione in archivio porta
 *     il letterale **«Italia»**, che è un PAESE e non un indirizzo, mentre la
 *     voce 1 chiede «il nome e **l'indirizzo**… di tutti i luoghi di
 *     fabbricazione». E comunque non usciva sul foglio: il modello non la
 *     stampava affatto.
 *
 *  🔑 DECISIONE (D295, presa qui e dichiarata nel referto): per un laboratorio
 *     a **sede unica** — che è il caso di ogni laboratorio odontotecnico che
 *     questa PWA serve oggi — il luogo di fabbricazione **coincide con
 *     l'indirizzo del fabbricante**. Il §1 mostrerà quindi la stessa stringa
 *     sotto due etichette: è corretto, e si dice invece di lasciarlo scoprire.
 *     ⚠️ Un laboratorio con PIÙ luoghi di fabbricazione (una seconda sede, una
 *     fresatura esternalizzata sotto il proprio nome) qui NON è rappresentabile:
 *     servirebbe un campo dedicato e ripetibile. È una decisione di Francesco,
 *     non di questa funzione — riferita, non presa.
 *
 *  🛑 Il ripiego su «Italia» resta, e non è pigrizia: la colonna è `NOT NULL`,
 *     una stringa vuota la supererebbe (vuoto per il database non è vuoto per
 *     una persona) e stamperebbe un'etichetta senza valore. «Italia» è il
 *     valore che quella colonna ha sempre avuto: peggiora nulla, e non finge. */
function luogoFabbricazione(lab: Laboratorio): string {
  const pezzi = [lab.indirizzo, lab.citta]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
  return pezzi.length > 0 ? pezzi.join(', ') : 'Italia'
}

/** Serializzazione CANONICA: le chiavi degli oggetti in ordine alfabetico, gli
 *  array nel loro ordine (che è un dato, non una casualità).
 *
 *  🔑 Perché canonica e non `JSON.stringify` nudo: l'impronta deve certificare
 *  i DATI, non l'ordine in cui un refactoring futuro capita di dichiararli. Con
 *  la stringa nuda, spostare due righe nel builder cambierebbe l'impronta di un
 *  documento identico — e un'impronta che cambia senza che cambi niente non
 *  prova più niente. */
function canonico(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`).join(',')}}`
}

/** L'impronta dei DATI che hanno prodotto il documento.
 *
 *  🔑 NON è `pdf_sha256`, ed è la ragione per cui ne servono due: quella è
 *  l'impronta del FILE e prova che il byte non è stato toccato; questa prova da
 *  QUALI DATI quel file è nato. Sono due domande diverse e un'ispezione può
 *  farle entrambe.
 *
 *  🛑 Va calcolata sull'oggetto DAVVERO RESO (`ddcConNorma`), mai su `ddc`:
 *  `norma_riferimento` sta nel primo e non nel secondo, perché non è una colonna
 *  della tabella e viene passata al template solo per il rendering. Calcolarla
 *  sull'oggetto sbagliato è l'errore naturale — è quello che si ha sotto mano —
 *  e produrrebbe una prova d'integrità che certifica un payload DIVERSO da
 *  quello stampato: una prova che mente, sul documento in cui mentire costa di
 *  più. La prova che distingue i due mondi è in `tests/unit/generate-ddc.test.ts`
 *  («cambiare `norma_riferimento` cambia l'impronta»). */
export function improntaPayload(payload: unknown): string {
  return crypto.createHash('sha256').update(canonico(payload)).digest('hex')
}

/** Costruisce la dichiarazione: il numero, i dati, il PDF reso e caricato, le
 *  due impronte. **NON scrive una riga in banca dati** — a scriverla è chi la
 *  chiama, e sono due atti diversi (la prima emissione e la riemissione).
 *
 *  🔑 PERCHÉ È ESTRATTA, e non è un riordino estetico. Con due costruttori — uno
 *  per emettere e uno per riemettere — il documento riemesso divergerebbe da
 *  quello emesso al primo cambiamento che qualcuno propaga in un posto solo, e
 *  **nessuna prova guarderebbe la differenza**: è la lezione delle «due metà
 *  giuste» pagata il 07/08. Il costruttore è UNO, e le due strade si separano
 *  solo su COME la riga finisce in banca dati.
 *
 *  ⚠️ Il numero progressivo si prende QUI, cioè prima della scrittura: se la
 *  scrittura poi fallisce, quel numero è bruciato e nella serie resta un buco.
 *  È accettabile e va detto: il numero della dichiarazione **non è un contenuto
 *  dovuto** (l'Allegato XIII punto 1 non lo nomina — censimento D294), a
 *  differenza della numerazione delle fatture. Non si può nemmeno prendere più
 *  tardi: il numero è **stampato sul PDF**. */
async function costruisciDichiarazione(
  supabase: ReturnType<typeof getTypedServiceClient>,
  lavoro: LavoroDettaglio
) {
  const anno = annoRoma()

  // Carica dati laboratorio + rischi residui per tipo dispositivo
  const [{ data: labRaw }, { data: rischiRow }] = await Promise.all([
    supabase.from('laboratori').select('*').eq('id', lavoro.laboratorio_id).single(),
    supabase
      .from('rischi_tipo_dispositivo')
      .select('rischi_residui, norme_json')
      .eq('laboratorio_id', lavoro.laboratorio_id)
      .eq('tipo_dispositivo', lavoro.tipo_dispositivo)
      .maybeSingle(),
  ])
  if (!labRaw) throw new Error('Laboratorio non trovato')
  // Cast puntuale: lo schema reale tipizza laboratori.piano come stringa
  // generica invece della union letterale di domain.ts (vedi generate-dpa.ts).
  const lab = labRaw as Laboratorio

  // Genera progressivo
  const progressivo = await generaProgressivo(supabase, lavoro.laboratorio_id, 'ddc', anno)
  const numero = `DDC-${anno}-${String(progressivo).padStart(4, '0')}`

  // MDR §8: dichiarazione esplicita di conformità (colonna NOT NULL senza default
  // in dichiarazioni_conformita — mascherata finora dal client non tipizzato).
  const testoConformita = "Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745."

  // Prepara dati snapshot
  const ddc = {
    numero_ddc: numero,
    anno_ddc: anno,
    progressivo_ddc: progressivo,
    fabbricante_nome: (lab.ragione_sociale ?? lab.nome) as string,
    fabbricante_indirizzo: (lab.indirizzo ?? '') as string,
    fabbricante_piva: (lab.partita_iva ?? '') as string,
    fabbricante_itca: (lab.codice_itca ?? null) as string | null,
    luogo_emissione: (lab.citta ?? 'Italia') as string,
    // VOCE 1 (D295) — ⚠️ NON è `luogo_emissione`: quello è dove il documento è
    // stato firmato, questo è dove il dispositivo è stato fabbricato.
    luogo_fabbricazione: luogoFabbricazione(lab),
    // D242 — il ripiego sul cliente vale con la STESSA regola del precheck.
    // 🛑 Qui c'era `lavoro.richiedente_nome ?? …`: un `??` ripiega solo su
    // `null`, quindi una stringa vuota (o di soli spazi) lo superava intatta e
    // il §3 del documento usciva senza il nome del medico — col controllo di
    // consegna VERDE, perché quello misura il testo trimmato. Due idee diverse
    // di «vuoto» nello stesso flusso: ora sono la stessa, e sta in un posto solo.
    prescrittore_nome:
      nomePrescrittore(
        lavoro.richiedente_nome,
        `${lavoro.cliente.cognome} ${lavoro.cliente.nome}`,
      ) ?? '',
    prescrizione_id: lavoro.numero_prescrizione ?? null,
    // Fallback da paziente.nome_cognome se lo snapshot è nullo (Allegato XIII §4)
    paziente_nome: lavoro.paziente_nome_snapshot ?? lavoro.paziente?.nome_cognome ?? lavoro.paziente?.codice_paziente ?? '',
    paziente_cognome: null as string | null,
    tipo_dispositivo: lavoro.tipo_dispositivo as string,
    descrizione_dispositivo: lavoro.descrizione,
    denti_coinvolti: lavoro.denti_coinvolti ?? null,
    uso_esclusivo_paziente: 'Dispositivo fabbricato su misura esclusivamente per il paziente indicato',
    // VOCE 6 (D295) — «le caratteristiche specifiche del prodotto indicate
    // nella prescrizione».
    // 🔴 Qui c'era `null as string | null`, cablato. Il dato esisteva già in
    //    `lavori_prescrizioni.contenuto` (ondata B) e non lo leggeva nessuno:
    //    mancava il filo, non il dato. Con la riga del modello condizionale,
    //    l'effetto era che uno degli OTTO contenuti obbligatori non è MAI
    //    comparso su una dichiarazione emessa.
    // 🔑 `undefined` (embed non chiesto) e «prescrizione senza caratteristiche»
    //    danno lo stesso vuoto QUI, e va bene: sul documento un vuoto è un
    //    vuoto. A distinguerli è `precheckMDR`, che vede se la riga esiste e lo
    //    dice PRIMA di emettere, quando si può ancora rimediare.
    prescrizione_caratteristiche: caratteristichePrescritte(lavoro.prescrizione?.contenuto),
    // VOCE 8 (D294 + giro di correzione, 07/08/2026) — «se del caso,
    // l'indicazione che il dispositivo contiene o incorpora una sostanza
    // medicinale, compreso un derivato dal sangue o dal plasma umani, o tessuti
    // o cellule di origine umana o di origine animale».
    //
    // 🔴 QUESTO `false` È CABLATO: nessuna riga di codice lo scrive a partire da
    //    una risposta dell'odontotecnico, perché **nessuna schermata gli fa la
    //    domanda**. Non è un valore misurato, è un posto vuoto che ha la forma
    //    di una risposta.
    //
    // 🛑 E RESTA CABLATO APPOSTA, perché raccogliere il dato è un'altra ondata:
    //    serve un campo nel lavoro (o nel wizard), la sua via di correzione fino
    //    alla consegna (direttiva permanente di Francesco, 27/07/2026) e una
    //    decisione su chi risponde. Inventare qui un valore sarebbe rimettere
    //    l'affermazione non sostenuta che il taglio ha tolto dal foglio.
    //
    // ✅ MA LA STRADA DI STAMPA C'È ED È PRONTA, e questa riga è l'unica cosa
    //    che manca. `DdcTemplate` porta di nuovo il blocco condizionale della
    //    voce 8: con `true` il documento DICHIARA la sostanza (col dettaglio, o
    //    rimandando alla documentazione allegata se il dettaglio manca), con
    //    `false` o col campo assente TACE. Provato in tutt'e due i versi in
    //    `tests/unit/ddc-pdf-content.test.ts` («la voce ⑧ è CONDIZIONALE»).
    //    ⚠️ Fino al giro di correzione questa frase sarebbe stata FALSA: il
    //    taglio aveva portato via anche il ramo affermativo, e una prova verde
    //    intitolata «non stampa nulla nemmeno sul ramo affermativo» blindava il
    //    vicolo cieco da entrambi i lati. Chi arriva qui a collegare la raccolta
    //    deve trovare scritto lo stato vero, non quello di ieri.
    contiene_sostanze_o_tessuti: false,
    sostanze_tessuti_dettaglio: null as string | null,
    classe_rischio: lavoro.classe_rischio,
    testo_conformita: testoConformita,
    testo_conformita_snapshot: testoConformita,
    prrc_nome: (lab.prrc_nome ?? '') as string,
    prrc_qualifica: (lab.prrc_qualifica ?? null) as string | null,
    firma_ddc_storage_path: (lab.firma_ddc_url ?? null) as string | null,
    // 🛑 SEMPRE `null` dal 07/08/2026, e la chiave resta scritta a posta: era
    //    l'impronta del file della firma, calcolata scaricandolo a ogni
    //    emissione. Nessun modello stampa più quella firma e nessuno legge
    //    questa colonna — v. il blocco in testa al file, dove `hashFirmaDdc`
    //    viveva. La chiave si tiene esplicita perché il payload dell'impronta
    //    (`payload_sha256`) mantenga la stessa FORMA, e perché un `null` scritto
    //    con la sua ragione accanto si legge meglio di una chiave sparita.
    firma_ddc_sha256: null as string | null,
    // Priorità: rischi specifici per tipo dispositivo > testo generico del lab
    rischi_residui_snapshot: (rischiRow?.rischi_residui ?? lab.testo_rischi_default ?? null) as string | null,
    norme_json: (rischiRow?.norme_json ?? []) as Array<{ codice: string; titolo: string; anno?: number }>,
    data_emissione: new Date().toISOString(),
    stato: 'generata' as const,
  }

  // Genera PDF
  // norma_riferimento non è una colonna di dichiarazioni_conformita (solo del
  // lavoro): passata al template solo per il rendering, esclusa dall'insert.
  const ddcConNorma = { ...ddc, norma_riferimento: lavoro.norma_riferimento ?? null }
  const buffer = await renderPdfDocument(createElement(DdcTemplate, { lavoro, lab, ddc: ddcConNorma }))
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')
  // 🛑 Su `ddcConNorma`, MAI su `ddc`: v. il commento di `improntaPayload`.
  const payloadSha256 = improntaPayload(ddcConNorma)
  const storagePath = `${lavoro.laboratorio_id}/ddc/${anno}/${numero}.pdf`

  // Upload su Supabase Storage
  const { error: upErr } = await supabase.storage
    .from('documenti')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

  // Se il bucket non esiste ancora (dev), continua senza errore fatale
  if (upErr && !upErr.message.includes('not found') && !upErr.message.includes('already exists')) {
    console.error('[DdC] Storage upload failed:', upErr.message)
  }

  const { data: urlData } = supabase.storage
    .from('documenti')
    .getPublicUrl(storagePath)
  const pdfUrl = urlData?.publicUrl ?? ''

  // 🛑 `laboratorio_id` e `lavoro_id` NON stanno qui: li mette chi scrive. Per la
  // riemissione è la RPC a fissarli dai propri parametri, e una copia in più nel
  // corpo sarebbe una seconda verità sullo stesso fatto.
  const riga = {
    ...ddc,
    pdf_url: pdfUrl,
    storage_path_pdf: storagePath,
    pdf_sha256: sha256,
    // D102 ① — le due colonne dichiarate come prova e mai scritte da nessuno.
    payload_sha256: payloadSha256,
    template_version: VERSIONE_TEMPLATE_DDC,
    pdf_generato_at: new Date().toISOString(),
    inviata_al_dentista: false,
  }

  return { riga, numero, pdfUrl }
}

export async function generateDdC(lavoro: LavoroDettaglio) {
  const supabase = getTypedServiceClient()

  // Idempotenza su retry di orchestraConsegna (B13 1/2): se la DdC per questo
  // lavoro esiste già (generata in un tentativo precedente), non rigenerare —
  // evita un secondo file su Storage e un secondo progressivo sprecato. Il
  // recupero su errore 23505 più sotto resta come rete di sicurezza per la
  // race condition residua (due richieste che superano entrambe questo guard).
  //
  // 🛑 ED È QUESTA LA PORTA DA CUI LA RIEMISSIONE NON DEVE PASSARE (spec §8.1):
  // qui si torna `{numero, url}` della dichiarazione ESISTENTE, senza nessun
  // segno di non averla generata. Una riemissione che entrasse di qui direbbe
  // «riemessa» con in mano il documento VECCHIO. Per questo `riemettiDdC` è una
  // funzione a sé e non un parametro di questa.
  const { data: ddcEsistente } = await supabase
    .from('dichiarazioni_conformita')
    .select('numero_ddc, pdf_url')
    .eq('lavoro_id', lavoro.id)
    .neq('stato', 'annullata')
    .maybeSingle()

  if (ddcEsistente) {
    return { numero: ddcEsistente.numero_ddc, url: ddcEsistente.pdf_url ?? '' }
  }

  const { riga, numero, pdfUrl } = await costruisciDichiarazione(supabase, lavoro)

  // INSERT record DdC
  const { error: insertErr } = await supabase
    .from('dichiarazioni_conformita')
    .insert({
      laboratorio_id: lavoro.laboratorio_id,
      lavoro_id: lavoro.id,
      ...riga,
    })

  if (insertErr) {
    // Se unique constraint violato (doppio tap), recupera record esistente
    if (insertErr.code === '23505') {
      const { data: existing } = await supabase
        .from('dichiarazioni_conformita')
        .select('numero_ddc, pdf_url')
        .eq('lavoro_id', lavoro.id)
        .neq('stato', 'annullata')
        .maybeSingle()
      return { numero: existing?.numero_ddc ?? numero, url: existing?.pdf_url ?? pdfUrl }
    }
    throw new Error(`DdC insert failed: ${insertErr.message}`)
  }

  return { numero, url: pdfUrl }
}

/** L'esito di una riemissione. I due casi «non si può» **non sono guasti** e non
 *  lanciano: sono risposte, e chi chiama deve poterle distinguere da un successo
 *  senza leggere un messaggio d'errore. Tutto il resto **lancia**, perché su
 *  questo documento un successo dichiarato per sbaglio è il difetto peggiore
 *  possibile (spec §8.1). */
export type EsitoRiemissione =
  | { stato: 'ok'; numero: string; url: string; nuovaId: string; vecchiaId: string; numeroSuperato: string }
  /** Non c'era niente da superare: una prima emissione è un altro atto. */
  | { stato: 'nessuna_dichiarazione_viva' }
  /** L'evento non esiste, o non è di questo lavoro: mai una riemissione senza motivo (D263). */
  | { stato: 'evento_non_valido' }

/** Riemette la dichiarazione di un lavoro: **prima si annulla, poi si riemette**
 *  (spec §8.1), e le due scritture stanno in **una transazione sola**.
 *
 *  ⚖️ D299 — questa funzione **NON tocca `lavori.stato`**. Il manufatto è a posto
 *  e resta dal dentista: si rifà solo la carta. Parole di Francesco, «*il lavoro
 *  resta consegnato, si rifà solo la carta*». Chi cerca il rientro in produzione
 *  sta cercando un'altra strada: `riapri_lavoro_atomica`, che è di un altro motivo.
 *
 *  🛑 PERCHÉ L'ORDINE È PORTANTE, ed è invisibile leggendo il TypeScript.
 *  `ddc_lavoro_attiva_unique` ammette **una sola** dichiarazione viva per lavoro:
 *  inserire prima di annullare sbatte contro un `23505`. E annullare senza
 *  inserire, o non annullare affatto, lascia il lavoro **senza nessuna
 *  dichiarazione viva** — uno stato che nessun vincolo può segnalare, perché
 *  «zero» è legittimo per un lavoro mai consegnato. ➡️ La transazione è la sola
 *  cosa che tiene, e per questo l'ordine vive nella RPC, non qui.
 *
 *  🔑 `sostituisce_id` NON si calcola qui: lo fissa il database, che sa qual era
 *  la dichiarazione viva **nello stesso istante in cui la annulla**. Calcolarlo
 *  in TypeScript vorrebbe dire leggerlo prima, e fra la lettura e la scrittura la
 *  viva potrebbe essere un'altra. */
export async function riemettiDdC(lavoro: LavoroDettaglio, eventoId: string): Promise<EsitoRiemissione> {
  const supabase = getTypedServiceClient()

  // Il PDF si rende e si carica PRIMA: non sono scritture in banca dati, e
  // tenerle fuori dalla transazione è ciò che permette alla transazione di
  // esistere. Se la RPC poi fallisce restano un file orfano e un numero bruciato:
  // nessuno dei due rompe niente (v. `costruisciDichiarazione`).
  const { riga, numero, pdfUrl } = await costruisciDichiarazione(supabase, lavoro)

  const { data, error } = await supabase.rpc('riemetti_ddc_atomica', {
    p_lavoro_id: lavoro.id,
    p_laboratorio_id: lavoro.laboratorio_id,
    p_evento_id: eventoId,
    p_nuova: riga as unknown as Record<string, never>,
  })

  if (error) {
    console.error('[DdC] riemetti_ddc_atomica fallita:', error)
    throw new Error('Non è stato possibile rifare la dichiarazione', { cause: error })
  }

  const risposta = (data ?? {}) as { esito?: unknown; nuova_id?: unknown; vecchia_id?: unknown; numero?: unknown; numero_superato?: unknown }

  if (risposta.esito === 'nessuna_dichiarazione_viva') return { stato: 'nessuna_dichiarazione_viva' }
  if (risposta.esito === 'evento_non_valido') return { stato: 'evento_non_valido' }

  // 🛑 FAIL-CLOSED su tutto il resto, e non è pignoleria: un esito che questa
  // funzione non riconosce — una risposta vuota, un valore nuovo aggiunto alla
  // RPC domani — letto come successo restituirebbe un numero senza sapere se
  // la riemissione è avvenuta. Su questo documento è il difetto peggiore.
  if (risposta.esito !== 'ok' || typeof risposta.nuova_id !== 'string') {
    console.error('[DdC] riemetti_ddc_atomica: esito inatteso', data)
    throw new Error('Non è stato possibile rifare la dichiarazione')
  }

  return {
    stato: 'ok',
    // Il numero e l'indirizzo li restituisce il database sulla riga davvero
    // scritta; quelli calcolati qui sono il ripiego, mai la fonte.
    numero: typeof risposta.numero === 'string' ? risposta.numero : numero,
    url: pdfUrl,
    nuovaId: risposta.nuova_id,
    vecchiaId: typeof risposta.vecchia_id === 'string' ? risposta.vecchia_id : '',
    numeroSuperato: typeof risposta.numero_superato === 'string' ? risposta.numero_superato : '',
  }
}

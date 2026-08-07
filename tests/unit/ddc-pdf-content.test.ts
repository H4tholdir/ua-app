// @vitest-environment node
// Piano E — Task 1: DdC PDF content validation
// 8 elementi obbligatori Allegato XIII MDR 2017/745
// Zero DB, zero Supabase — fixture inline

import { describe, it, expect, beforeAll } from 'vitest'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { createElement, isValidElement, type ReactElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { DdcTemplate } from '@/components/features/pdf/DdcTemplate'
import type { DichiarazioneConformita } from '@/types/domain'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// LAB_FIXTURE/LAVORO_FIXTURE: vedi tests/unit/helpers/pdf-fixtures.ts (condivise).
// LAB_FIXTURE è usato per logo_url (null) e come fallback nei metadata del Document.
// Le sezioni §1 e §8 PRRC leggono da ddc.fabbricante_* e ddc.prrc_*, non dal lab.

// DDC_FIXTURE: tutti i campi che il template stampa direttamente.
// §1 Fabbricante legge: fabbricante_nome, fabbricante_indirizzo, fabbricante_piva, fabbricante_itca
// §3 Prescrittore: prescrittore_nome
// §4 Paziente: paziente_nome + paziente_cognome
// §5 Dispositivo: tipo_dispositivo, descrizione_dispositivo
// §6 Classificazione: classe_rischio
// §7 Conformità: testo_conformita_snapshot
// §8 PRRC firma: prrc_nome, prrc_qualifica
const DDC_FIXTURE: DichiarazioneConformita = {
  id: 'ddc-test-001',
  laboratorio_id: 'lab-test-001',
  lavoro_id: 'lav-test-001',
  numero_ddc: 'DDC-2026-0001',
  anno_ddc: 2026,
  progressivo_ddc: 1,
  pdf_url: null,
  pdf_sha256: null,
  storage_path_pdf: null,
  pdf_generato_at: null,
  inviata_al_dentista: false,
  inviata_al_dentista_at: null,
  data_emissione: '2026-05-15T10:00:00.000Z',
  stato: 'bozza',
  // §1 Allegato XIII — Fabbricante (snapshot immutabile)
  fabbricante_nome: 'Laboratorio Odontotecnico Opromolla S.r.l.',
  fabbricante_indirizzo: 'Via Roma 12, Serre (SA)',
  fabbricante_piva: '03508740655',
  fabbricante_itca: 'ITCA01051686',
  luogo_emissione: 'Serre (SA), Italia',
  // 🔴 «Italia» È IL VALORE VERO DI OGNI DICHIARAZIONE IN ARCHIVIO, non un
  //    valore scelto per la prova: fino al 07/08/2026 nessuno scriveva questa
  //    colonna e il `DEFAULT 'Italia'` di `schema.sql:1251` faceva da solo.
  //    Questa fixture è quindi il documento «di prima», e resta tale apposta.
  luogo_fabbricazione: 'Italia',
  // §3 Prescrittore
  prescrittore_nome: 'Dott. Mario Rossi',
  prescrizione_id: null,
  // §4 Paziente
  paziente_nome: 'M.R.',
  paziente_cognome: null,
  // §5 Dispositivo
  tipo_dispositivo: 'protesi_fissa',
  descrizione_dispositivo:
    'Corona ceramica su impianto elemento 14 colore A2',
  denti_coinvolti: null, // letti dal lavoro
  uso_esclusivo_paziente:
    'Dispositivo fabbricato su misura esclusivamente per il paziente indicato',
  prescrizione_caratteristiche: null,
  contiene_sostanze_o_tessuti: false,
  sostanze_tessuti_dettaglio: null,
  // §6 Classificazione
  classe_rischio: 'classe_iia',
  norma_riferimento: null,
  // §7 Conformità
  testo_conformita_snapshot:
    "Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745.",
  // §8 PRRC
  prrc_nome: 'Filippo Opromolla',
  prrc_qualifica: 'Odontotecnico abilitato',
  firma_ddc_storage_path: null,
  firma_ddc_sha256: null,
  rischi_residui_snapshot: null,
  norme_json: null,
}

// ─── Test suite ───────────────────────────────────────────────────────────────

let pdfText = ''

describe('DdcTemplate — PDF content validation (Allegato XIII MDR 2017/745)', () => {
  beforeAll(async () => {
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: DDC_FIXTURE,
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    pdfText = result.text
  }, 30_000)

  // ── Struttura ─────────────────────────────────────────────────────────────

  it('PDF > 1 KB', async () => {
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: DDC_FIXTURE,
    })
    const buffer = await renderPdfDocument(element)
    expect(buffer.length).toBeGreaterThan(1024)
  })

  it('il titolo porta l\'accento: «DICHIARAZIONE DI CONFORMITÀ»', () => {
    // textTransform:'uppercase' — react-pdf rende le maiuscole nel PDF, À compresa
    // (provato: scripts/tmp/sonda-accenti.tsx). Questo test PRETENDE l'accento:
    // fino al 03/08/2026 pretendeva il refuso, quindi la regressione sarebbe
    // tornata silenziosa in entrambe le direzioni.
    expect(pdfText).toContain('DICHIARAZIONE DI CONFORMITÀ')
    // 🛑 Nessun refuso residuo nei punti che questa fixture RENDE: la rete si
    //    accende su qualunque occorrenza rimasta lì, comprese quelle che le
    //    asserzioni puntuali non guardano (provato per mutazione su due punti
    //    diversi, §7 e etichetta della firma).
    // ⚠️ Il limite, scritto perché nessuno legga più di quanto la prova misuri:
    //    `pdfText` nasce da DDC_FIXTURE, che lascia a `null` norme_json,
    //    rischi_residui_snapshot, firma_ddc_storage_path e le righe di
    //    prescrizione — quindi §6-bis, §8 e quei blocchi NON sono renderizzati, e
    //    un refuso che vivesse lì dentro questa rete non lo vedrebbe. Oggi non ce
    //    n'è (verificato), ma la rete copre il foglio reso, non «il foglio».
    expect(pdfText).not.toContain('CONFORMITA')
    expect(pdfText).not.toContain('Conformita')
  })

  it('🔴 D294 — il blocco FIRMA non c\'è più: né etichetta PRRC né riga per firmare', () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294). Pretendeva «Responsabile della
    //    Conformità (PRRC)» perché il foglio portava un blocco firma.
    // 🔑 Perché esce: l'Art. 15(3)(b) nomina la dichiarazione di conformità
    //    **UE**, che per i dispositivi su misura NON esiste (Art. 10(6)); e fra
    //    gli otto contenuti dell'Allegato XIII punto 1 non compare né una firma
    //    né un responsabile. Il progetto lo sapeva già (ROADMAP-UFFICIALE.md).
    // 🛑 Capovolta, non cancellata: una prova cancellata è copertura persa in
    //    silenzio, e domani la firma tornerebbe senza che niente suoni.
    // La fixture ha prrc_nome e prrc_qualifica valorizzati: il caso è POPOLATO,
    // quindi l'assenza è una scelta del modello e non un vuoto della fixture.
    expect(pdfText).not.toContain('Responsabile della Conformità')
    expect(pdfText).not.toContain('PRRC')
  })

  it('il titolo dell\'ultima sezione porta l\'accento — ed è il §6, non più il §7', () => {
    // styles.sectionTitle ha textTransform: 'uppercase' (DdcTemplate.tsx:86) —
    // il titolo di sezione esce in maiuscolo nel PDF.
    // ⚖️ RINUMERATA (D294): §6 Classificazione e §6-bis Norme armonizzate sono
    //    usciti, quindi la dichiarazione di conformità ha risalito la numerazione
    //    da §7 a §6. Un foglio che salta da §5 a §7 è un foglio che sembra
    //    incompleto a chi lo ispeziona.
    expect(pdfText).toContain('§6 — DICHIARAZIONE DI CONFORMITÀ')
    // 🛑 E i numeri usciti non devono restare da nessuna parte: è la rete sulla
    //    rinumerazione, che altrimenti nessuno guarderebbe.
    expect(pdfText).not.toContain('§7')
    expect(pdfText).not.toContain('§8')
    expect(pdfText).not.toContain('§6-bis')
    expect(pdfText).not.toContain('§6-BIS')
  })

  // ── §1 Fabbricante ────────────────────────────────────────────────────────

  it('§1 stampa ragione sociale del fabbricante', () => {
    expect(pdfText).toContain('Laboratorio Odontotecnico Opromolla S.r.l.')
  })

  it('§1 stampa indirizzo del fabbricante', () => {
    expect(pdfText).toContain('Via Roma 12')
  })

  it('§1 stampa Partita IVA del fabbricante', () => {
    expect(pdfText).toContain('03508740655')
  })

  it('🔴 D294 — il codice ITCA non compare, né in testata né nel §1', () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294). Pretendeva il codice; il foglio lo
    //    stampava DUE volte (testata e §1).
    // 🔑 Perché esce: la voce 1 dell'Allegato XIII nomina DUE cose — «il nome e
    //    l'indirizzo del fabbricante e di tutti i luoghi di fabbricazione». Un
    //    codice di registrazione non è né un nome né un indirizzo. L'obbligo
    //    italiano (D.Lgs. 137/2022 art. 7) colpisce l'ISCRIVERSI all'elenco, non
    //    il contenuto di questa dichiarazione.
    // 🛑 Il dato RESTA in banca dati (`laboratori.codice_itca`) e resta
    //    obbligatorio: qui esce dal FOGLIO, non dal laboratorio.
    // La fixture ha fabbricante_itca valorizzato: il caso è POPOLATO.
    expect(pdfText).not.toContain('ITCA01051686')
    expect(pdfText).not.toContain('ITCA')
  })

  it('🔴 D294 — l\'SRN EUDAMED non compare NEMMENO quando il laboratorio ne ha uno', async () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294). Pretendeva la stringa: il foglio la
    //    stampava quando il campo era valorizzato.
    // 🔑 Perché esce, e l'etichetta era sbagliata due volte: un fabbricante di
    //    soli dispositivi su misura non è registrato in EUDAMED finché non
    //    trasmette la prima segnalazione di vigilanza (MDCG 2021-13 Rev.1 Q2/Q3,
    //    D.Lgs. 137/2022 art. 12 c.2); e ciò che riceverebbe allora è un
    //    **Actor ID, non un SRN**. Nessuna delle otto voci lo chiede.
    // 🛑 La forma della prova è il punto: si rende con il campo POPOLATO. La
    //    vecchia prova gemella («non stampa quando assente») girava su una
    //    fixture con srn_eudamed: null — restava verde anche col difetto in
    //    piedi, cioè non misurava niente. Qui il dato c'è e non deve uscire.
    const labConSrn = { ...LAB_FIXTURE, srn_eudamed: 'IT-CA-000123456' }
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: labConSrn,
      ddc: DDC_FIXTURE,
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    expect(result.text).not.toContain('IT-CA-000123456')
    expect(result.text.toLowerCase()).not.toContain('srn eudamed')
    expect(result.text.toLowerCase()).not.toContain('eudamed')
  })

  it('🔴 D294 — i due codici di registrazione sono NEL DATO e non sul foglio', () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294) da «non stampa SRN quando assente», che
    //    dopo il taglio sarebbe diventata vera per il motivo sbagliato (la
    //    fixture non ha il campo) — cioè teatro.
    // 🔑 Questa prova tiene ferma LA DISTINZIONE che regge tutto il taglio:
    //    togliere dal FOGLIO non è togliere dal DATO. I due codici sono ancora
    //    lì, leggibili nelle fixture, e proprio per questo la loro assenza dal
    //    testo reso è una scelta e non una mancanza.
    expect(DDC_FIXTURE.fabbricante_itca).toBe('ITCA01051686')
    expect(LAB_FIXTURE.codice_itca).toBe('ITCA01051686')
    expect(pdfText.toLowerCase()).not.toContain('srn eudamed')
    expect(pdfText.toLowerCase()).not.toContain('itca')
  })

  // ── §2 Numero DdC e data emissione ───────────────────────────────────────

  it('§2 stampa numero DdC', () => {
    expect(pdfText).toContain('DDC-2026-0001')
  })

  it('§2 stampa data di emissione formattata (dd/mm/yyyy)', () => {
    expect(pdfText).toContain('15/05/2026')
  })

  it('il §2 — Data di emissione esiste e porta la data', () => {
    // I paragrafi ricalcano gli otto elementi dell'Allegato XIII punto 1: il n. 2
    // è la data di emissione (src/lib/consegna/precheck.ts:8). Fino al 03/08/2026
    // il dato c'era ma senza il suo titoletto, e il foglio saltava da §1 a §3.
    // ⚠️ Il brief del task proponeva questa stringa in maiuscole/minuscole miste,
    // ma styles.sectionTitle ha textTransform: 'uppercase' (come per ogni altra
    // sezione, es. il §7 alla riga 138) — il titolo esce in maiuscolo nel PDF.
    expect(pdfText).toContain('§2 — DATA DI EMISSIONE')

    // Rilievo di revisione: un semplice toContain('15/05/2026') non discrimina
    // niente da solo — svuotare il valore della sola sezione §2
    // (formatData(ddc.data_emissione) → '—', titoletto intatto) lascerebbe il
    // test verde finché la data compare da qualche altra parte. La prova vera è
    // il CONTEGGIO delle occorrenze nel foglio.
    //
    // ⚖️ IL NUMERO È CAMBIATO DA 2 A 1 il 07/08/2026 (D294), e il commento
    //    cambia con lui — un commento che spiega una logica decaduta è il
    //    difetto che questo progetto ha già pagato. La seconda occorrenza era
    //    quella del blocco FIRMA, che oggi non esiste più: la data vive in un
    //    posto solo, il §2, che è dove l'Art. 52(8) la vuole («prima
    //    dell'immissione sul mercato»: senza data non si dimostra).
    // 🔑 Il test resta bidirezionale: se il §2 perde il valore → 0 occorrenze
    //    (rosso); se un giorno la data tornasse in testata o sotto una firma
    //    rimessa → 2 occorrenze (rosso).
    const occorrenzeData = pdfText.split('15/05/2026').length - 1
    expect(occorrenzeData).toBe(1)
  })

  // ── §3 Prescrittore ───────────────────────────────────────────────────────

  it('§3 stampa nome prescrittore', () => {
    expect(pdfText).toContain('Dott. Mario Rossi')
  })

  // ── §4 Paziente ───────────────────────────────────────────────────────────

  it('§4 stampa nome paziente (pseudonimizzato)', () => {
    expect(pdfText).toContain('M.R.')
  })

  // ── §5 Dispositivo su misura ──────────────────────────────────────────────

  it('§5 stampa tipo dispositivo formattato ("Protesi Fissa")', () => {
    expect(pdfText).toContain('Protesi Fissa')
  })

  it('§5 stampa descrizione dispositivo', () => {
    expect(pdfText).toContain('Corona ceramica')
  })

  it('§5 stampa dente coinvolto (elemento 14)', () => {
    expect(pdfText).toContain('14')
  })

  it('🔴 D294 — il nome del materiale non compare: la storia dei materiali esce dal foglio', () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294), ed è il taglio che Francesco ha nominato
    //    per primo: «togli tutto quello che sul documento non ci deve essere,
    //    come la storia dei materiali».
    // 🔑 Perché esce: i materiali arrivano dal CONSUMO DI MAGAZZINO, non dalla
    //    prescrizione — quindi non sono la voce 6 («le caratteristiche specifiche
    //    del prodotto **indicate nella prescrizione**»), e nessun'altra delle
    //    otto voci li chiede.
    // 🛑 RESTANO in banca dati e continuano a stamparsi su ricevuta di consegna
    //    ed etichetta: dal documento escono, dal laboratorio no.
    // LAVORO_FIXTURE ha i materiali valorizzati: il caso è POPOLATO.
    expect(pdfText).not.toContain('Zirconia IPS e.max ZirCAD')
    expect(pdfText).not.toContain('Materiali')
  })

  it('🔴 D294 — il numero di lotto non compare', () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294) — stessa ragione della prova sopra, e
    //    tenuta separata apposta: il lotto è il dato che più somiglia a una
    //    tracciabilità dovuta, quindi la sua assenza merita di accendersi da
    //    sola invece di nascondersi dentro un'altra asserzione.
    expect(pdfText).not.toContain('LOT-2025-ZR-0042')
    expect(pdfText.toLowerCase()).not.toContain('lotti')
  })

  it('§5 stampa numero lavoro (dati identificativi del dispositivo, elemento 2 Allegato XIII)', () => {
    expect(pdfText).toContain('LAV-2026-0001')
  })

  it('§5 stampa dicitura "fabbricato su misura" (elemento 3 Allegato XIII)', () => {
    // Formula presente in uso_esclusivo_paziente (§4) — "fabbricato su misura
    // esclusivamente per il paziente indicato"
    expect(pdfText.toLowerCase()).toContain('fabbricato su misura')
  })

  it('§5/§7 stampa dicitura assenza marcatura CE (Art. 20(1) MDR — dispositivi su misura)', () => {
    expect(pdfText.toLowerCase()).toContain('marcatura ce')
    expect(pdfText).toContain('Art. 20(1)')
  })

  it('nessun riferimento residuo alla Direttiva 93/42/CEE (abrogata dal 26/05/2024)', () => {
    expect(pdfText).not.toContain('93/42')
  })

  // ── La sezione CLASSIFICAZIONE, che non esiste più (D294) ─────────────────

  it('🔴 D294 — la classe di rischio non compare sul foglio', () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294). Pretendeva «Classe IIa».
    // 🔑 Perché esce: la classe di rischio è fuori dalle otto voci dell'Allegato
    //    XIII punto 1. Serve al fabbricante (ed è `NOT NULL` su
    //    `dichiarazioni_conformita`, quindi il DATO resta e l'emissione continua
    //    a pretenderlo) — ma non è un contenuto di questa dichiarazione.
    // La fixture ha classe_rischio: 'classe_iia': il caso è POPOLATO.
    expect(pdfText).not.toContain('Classe IIa')
    expect(pdfText.toLowerCase()).not.toContain('classe di rischio')
  })

  it('🔴 D294 — la sezione «Classificazione MDR» non esiste più: nemmeno il titoletto', () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294) da un test di documentazione che
    //    riasseriva la stessa cosa della prova sopra.
    // 🛑 Il titoletto si guarda a parte, e non è pedanteria: togliendo le due
    //    righe e lasciando il `<View>` resterebbe un titolo di sezione bordato e
    //    VUOTO — un foglio sfigurato, che è il modo tipico in cui una pulizia
    //    fatta a metà si vede solo a stampa avvenuta.
    expect(pdfText).not.toContain('CLASSIFICAZIONE')
    expect(pdfText.toLowerCase()).not.toContain('classificazione')
  })

  // ── §6 Dichiarazione di Conformità (era §7 fino al 07/08/2026 — D294) ─────

  it('§6 contiene riferimento ad Allegato XIII', () => {
    expect(pdfText).toContain('Allegato XIII')
  })

  it('§6 contiene riferimento esplicito ad Allegato I (requisiti generali di sicurezza e prestazione, voce 7 Allegato XIII)', () => {
    // pdf-parse può spezzare la riga tra "Allegato" e "I" a causa del wrapping
    // del testo nel box PDF — regex tollerante a whitespace/newline nel mezzo.
    expect(pdfText).toMatch(/Allegato\s+I(?!\w)/)
  })

  it('§6 contiene riferimento a Regolamento UE 2017/745', () => {
    expect(pdfText).toContain('2017/745')
  })

  it('il foglio porta la base giuridica «Art. 52(8)» — nel SOTTOTITOLO, non nel §6', () => {
    // ⚖️ RINOMINATA il 07/08/2026 (D294). Si chiamava «§6 contiene riferimento
    //    ad Art. 52(8)» ed era una LOCALIZZAZIONE FALSA: il testo di conformità
    //    del §6 porta «Allegato I», «Allegato XIII» e «2017/745», ma NON
    //    «Art. 52(8)». Quella stringa vive nel sottotitolo sotto il titolo, e
    //    fino a oggi anche nel piè di pagina (uscito con D294).
    // 🔑 È la stessa specie di difetto dell'«elemento 8 Allegato XIII» corretto
    //    poco sopra: un nome di prova che afferma un fatto sbagliato si tramanda
    //    più a lungo del codice che descrive.
    expect(pdfText).toContain('Art. 52(8)')
  })

  it('§6 contiene testo di conformità ("conforme ai requisiti")', () => {
    expect(pdfText.toLowerCase()).toContain('conforme ai requisiti')
  })

  // ── Il responsabile e il luogo di emissione, che non ci sono più (D294) ────

  it('🔴 D294 — il nome del responsabile non compare', () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294). Pretendeva «Filippo Opromolla» sotto la
    //    firma. Le otto voci dell'Allegato XIII punto 1 non nominano un
    //    responsabile: la persona che vi compare per legge è il PRESCRITTORE
    //    (voce 5, §3 del foglio), che resta.
    // La fixture ha prrc_nome valorizzato: il caso è POPOLATO.
    // 🛑 «Filippo Opromolla» è anche la ragione sociale del laboratorio di prova
    //    del banco, ma NON di questa fixture (`fabbricante_nome` è «Laboratorio
    //    Odontotecnico Opromolla S.r.l.»): qui la stringa nuda può comparire solo
    //    dal blocco firma, quindi l'asserzione discrimina davvero.
    expect(pdfText).not.toContain('Filippo Opromolla')
  })

  it('🔴 D294 — la qualifica del responsabile non compare', () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294) — stessa ragione.
    expect(pdfText).not.toContain('Odontotecnico abilitato')
  })

  it('🔴 D294 — il LUOGO DI EMISSIONE non compare, in nessuno dei due punti in cui stava', () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294). Il vecchio nome della prova rivendicava
    //    «elemento 8 Allegato XIII — luogo, data e firma»: È FALSO, e va detto
    //    perché è il genere di affermazione che si tramanda. La voce 8 è quella
    //    delle SOSTANZE/tessuti; l'Allegato XIII punto 1 non chiede né un luogo
    //    di emissione né una firma.
    // 🔑 Perché esce: `luogo_emissione` è la CITTÀ DEL LABORATORIO, cioè dove il
    //    documento è stato firmato. Non è un luogo di fabbricazione.
    // 🛑 DA NON CONFONDERE con `luogo_fabbricazione`, che è la voce 1 ed è
    //    obbligatorio: quello RESTA, ed è provato dal blocco D295 in fondo a
    //    questo file. I due nomi si somigliano e sono due cose diverse.
    // Il foglio lo stampava DUE volte: nel §1 e sotto la firma. La fixture ha
    // luogo_emissione valorizzato: il caso è POPOLATO.
    expect(pdfText).not.toContain('Serre (SA), Italia')
    expect(pdfText.toLowerCase()).not.toContain('luogo emissione')
  })

  // ── Le norme, che non ci sono più (D294) ──────────────────────────────────

  it('🔴 D294 — le norme armonizzate non compaiono NEMMENO quando ce ne sono', async () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294). Pretendeva codici e titoli.
    // 🔑 Perché escono: la voce 7 chiede una dichiarazione di conformità
    //    all'Allegato I e, «se del caso», l'indicazione dei requisiti **NON
    //    rispettati** con debita motivazione. Una norma APPLICATA è un'altra
    //    cosa — è il contrario, anzi: è ciò che si è rispettato.
    // 🛑 Si rende con `norme_json` POPOLATO. La vecchia prova gemella («non
    //    compare quando è vuoto») girava sulla fixture a `null` e sarebbe
    //    rimasta verde col difetto in piedi.
    const ddcConNorme = {
      ...DDC_FIXTURE,
      norme_json: [
        { codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials' },
        { codice: 'EN ISO 22674:2016', titolo: 'Metallic materials', anno: 2016 },
      ],
    }
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: ddcConNorme,
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    expect(result.text).not.toContain('EN ISO 6872:2015')
    expect(result.text).not.toContain('Dental ceramic materials')
    expect(result.text).not.toContain('EN ISO 22674:2016')
    expect(result.text.toLowerCase()).not.toContain('norme armonizzate')
  })

  it('🔴 D294 — la sezione «Norme Armonizzate Applicate» non ha più nemmeno il titoletto', async () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294) da «§6-bis non compare quando norme_json
    //    è vuoto», e **RESA VERA nel giro di correzione dello stesso giorno**.
    // 🛑 Il difetto della versione di mezzo, ed è la terza prova-teatro trovata
    //    in questo lavoro: asseriva sul foglio reso da `DDC_FIXTURE`, che ha
    //    `norme_json: null` — e nel modello PRE-taglio quella sezione era **già
    //    condizionale su quel campo**. Rimettendo la sezione intera, la prova
    //    sarebbe rimasta VERDE: cioè non misurava il taglio, misurava la
    //    fixture.
    // 🔑 Ora si rende con `norme_json` POPOLATO, l'unico foglio su cui quel
    //    titoletto potrebbe comparire.
    // 🛑 Tenuta come caso a sé, e non fusa nella prova qui sopra, per la stessa
    //    ragione delle due sezioni svuotate: il TITOLETTO si guarda a parte,
    //    perché una sezione tolta a metà lascia un titolo bordato e vuoto.
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: {
        ...DDC_FIXTURE,
        norme_json: [
          { codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials' },
          { codice: 'EN ISO 22674:2016', titolo: 'Metallic materials', anno: 2016 },
        ],
      },
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    // Il titoletto vero, come stava scritto nel modello pre-taglio:
    // «§6-bis — Norme Armonizzate Applicate», reso tutto maiuscolo da
    // `textTransform: 'uppercase'`. ⚠️ Per questo si cerca in minuscolo: una
    // asserzione su `'§6-bis'` sarebbe passata comunque, perché sul foglio quel
    // testo sarebbe uscito come «§6-BIS».
    expect(result.text).not.toContain('NORME ARMONIZZATE APPLICATE')
    expect(result.text.toLowerCase()).not.toContain('norme armonizzate')
    expect(result.text.toLowerCase()).not.toContain('6-bis')
  }, 30_000)

  it('🔴 D294 — la NORMA DI RIFERIMENTO non compare nemmeno quando il lavoro ne ha una', async () => {
    // ⚖️ NUOVA il 07/08/2026 (D294): nessuna prova guardava questo campo, che
    //    pure il modello stampava. È il gemello della riga sopra e ha la stessa
    //    ragione di uscita — una norma applicata non è un requisito non
    //    rispettato.
    // ⚠️ `norma_riferimento` non è una colonna di `dichiarazioni_conformita`:
    //    arriva dal lavoro e viene passata al modello solo per il rendering
    //    (generate-ddc.ts:249). Il DATO resta sul lavoro.
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: { ...DDC_FIXTURE, norma_riferimento: 'UNI EN ISO 22674:2016' },
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    expect(result.text).not.toContain('UNI EN ISO 22674:2016')
    expect(result.text.toLowerCase()).not.toContain('norma di riferimento')
  })

  it('🔴 D294 — i RISCHI RESIDUI non compaiono nemmeno quando il testo c\'è', async () => {
    // ⚖️ NUOVA il 07/08/2026 (D294): il §8 non aveva NESSUNA prova positiva, e
    //    un blocco senza rete è un blocco che si toglie senza che nulla suoni —
    //    in entrambe le direzioni.
    // 🔑 Perché esce: i rischi residui sono l'esito dell'analisi del rischio
    //    (ISO 14971), non una deroga a un requisito generale. La voce 7 chiede i
    //    requisiti dell'Allegato I NON rispettati, con motivazione: è un'altra
    //    domanda. 🛑 Il DATO resta (`rischi_residui_snapshot`, e la sua
    //    schermata di modifica in qualità non è toccata).
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: {
        ...DDC_FIXTURE,
        rischi_residui_snapshot:
          'Rischio residuo di frattura della ceramica in caso di parafunzione non compensata.',
      },
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    expect(result.text).not.toContain('Rischio residuo di frattura')
    expect(result.text.toLowerCase()).not.toContain('rischi residui')
  })

  // ── IL PIÈ DI PAGINA: tre reti, e solo la prima guarda il testo ────────────
  // 🛑 IL DIFETTO DI QUESTA RETE, misurato nel giro di correzione del
  //    07/08/2026. Il commento qui sotto diceva che il conteggio del numero era
  //    «l'unica forma che si accende anche se il piè di pagina tornasse con un
  //    testo diverso». **Era falso, ed è stato provato per mutazione:**
  //    rimettendo un piè di pagina `fixed` con un testo diverso e SENZA il
  //    numero del documento, tutte le prove restavano verdi. Cioè un blocco
  //    ripetuto su OGNI PAGINA di un documento a valore legale sarebbe potuto
  //    rientrare senza che nulla suonasse.
  // 🔑 LA LEZIONE, che vale oltre questo caso: una rete legata al TESTO di un
  //    blocco protegge quel testo, non quel blocco. Per proteggere il blocco si
  //    prova ciò che lo rende riconoscibile a prescindere da cosa ci sia
  //    scritto — qui: **è un elemento `fixed`**, e **si ripete su ogni pagina**.

  it('🔴 D294 — il TESTO del piè di pagina non compare, e il numero una volta sola', async () => {
    // ⚖️ NUOVA il 07/08/2026 (D294): il piè di pagina non aveva prove, benché
    //    fosse `fixed` — cioè ripetuto su OGNI pagina. Era un doppione: la base
    //    giuridica sta già nel sottotitolo, il numero già in testa al foglio.
    // ⚠️ Questa prova guarda il TESTO che c'era, e basta: è utile contro il
    //    ritorno di quel testo esatto, e NON è la rete sul blocco. La rete sul
    //    blocco sono le due prove qui sotto.
    expect(pdfText).not.toContain('Documento generato ai sensi')
    const occorrenzeNumero = pdfText.split('DDC-2026-0001').length - 1
    expect(occorrenzeNumero).toBe(1)
  })

  it('🔴 nessun elemento del modello è `fixed`: la FORMA, non il testo', () => {
    // 🔑 `fixed` è la proprietà con cui @react-pdf dichiara «questo blocco si
    //    ripete su ogni pagina»: è la firma strutturale di un piè di pagina (e
    //    di una testata ripetuta), e non dipende da una sola parola del testo.
    //    Il modello di oggi non ha nessun elemento `fixed`, e questa prova si
    //    accende su QUALUNQUE blocco ripetuto che rientri, comunque scritto.
    const conta = (nodo: unknown): number => {
      if (Array.isArray(nodo)) return nodo.reduce<number>((n, f) => n + conta(f), 0)
      if (!isValidElement(nodo)) return 0
      const props = (nodo as ReactElement<Record<string, unknown>>).props
      return (props.fixed === true ? 1 : 0) + conta(props.children)
    }

    const albero = DdcTemplate({
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: DDC_FIXTURE,
    })
    expect(conta(albero)).toBe(0)
  })

  it('🔴 e su un foglio a PIÙ PAGINE nessun blocco di testo si ripete su tutte', async () => {
    // 🔑 IL COMPORTAMENTO, non la proprietà: un piè di pagina si riconosce dal
    //    fatto che lo stesso blocco compare su OGNI pagina. Questa prova rende
    //    un documento lungo abbastanza da spezzarsi e confronta il testo pagina
    //    per pagina: se una riga qualsiasi è presente su tutte, c'è un blocco
    //    ripetuto — e su questo foglio non ce ne devono essere.
    // 🛑 Il riempimento è fatto di frasi TUTTE DIVERSE, numerate una per una, e
    //    non è un vezzo: con un riempimento ripetitivo (`'x'.repeat(…)`) le
    //    righe impaginate sarebbero identiche fra loro e l'intersezione
    //    risulterebbe piena anche senza nessun piè di pagina — la prova
    //    fallirebbe per il motivo sbagliato, che è il modo peggiore di fallire.
    const riempimento = Array.from(
      { length: 130 },
      (_, i) => `Annotazione ${i + 1}: verifica dimensionale e occlusale eseguita al banco.`,
    ).join(' ')

    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: { ...DDC_FIXTURE, descrizione_dispositivo: riempimento },
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    // 🛑 ASSERZIONE, non guardia: se un giorno il riempimento smettesse di
    //    spezzare il foglio, questa prova non deve passare in silenzio — sarebbe
    //    esattamente il teatro che questo giro è venuto a togliere.
    expect(result.total).toBeGreaterThanOrEqual(2)

    const MARCA_PAGINA = /^--\s*\d+\s+of\s+\d+\s*--$/
    const righeUtili = (t: string) =>
      t
        .split('\n')
        .map((r) => r.trim())
        .filter((r) => r.length > 0 && !MARCA_PAGINA.test(r))

    const perPagina = result.pages.map((p) => righeUtili(p.text))
    const ripetute = perPagina.reduce((comuni, righe) => comuni.filter((r) => righe.includes(r)))
    expect(ripetute).toEqual([])
  }, 30_000)

  // ══ D102 ③ — un documento CONGELATO non legge dati VIVI ═══════════════════
  // 🔴 IL DIFETTO, misurato: `DdcTemplate.tsx` prendeva i denti da
  //    `lavoro.denti_coinvolti` — il dato VIVO, che continua a cambiare dopo
  //    l'emissione — mentre la fotografia `ddc.denti_coinvolti` esisteva già
  //    (`generate-ddc.ts` la scrive) e non veniva letta da nessuno. Su un
  //    documento conservato dieci anni (quindici per gli impiantabili) significa
  //    che ristampandolo poteva dire denti diversi da quelli dichiarati.
  //    La fixture stessa lo aveva messo nero su bianco: `denti_coinvolti: null,
  //    // letti dal lavoro`.
  // 🔑 LA FORMA DELLA PROVA: si rende il PDF con la fotografia e il vivo che
  //    dicono cose DIVERSE. Se il template legge quello giusto, sul foglio
  //    compare la fotografia e il vivo non compare affatto. Con valori uguali la
  //    prova sarebbe verde in entrambi i mondi — cioè non proverebbe niente.
  describe('D102 ③ — il PDF stampa la FOTOGRAFIA, non il dato vivo', () => {
    let testoDivergente = ''

    beforeAll(async () => {
      const element = createElement(DdcTemplate, {
        lavoro: { ...LAVORO_FIXTURE, denti_coinvolti: ['38', '37'] },
        lab: LAB_FIXTURE,
        ddc: { ...DDC_FIXTURE, denti_coinvolti: ['47', '46'] },
      })
      const buffer = await renderPdfDocument(element)
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      await parser.destroy()
      testoDivergente = result.text
    }, 30_000)

    it('stampa i denti della fotografia', () => {
      expect(testoDivergente).toContain('47, 46')
    })

    it('🔴 NON stampa i denti vivi del lavoro', () => {
      expect(testoDivergente).not.toContain('38, 37')
    })

    it('senza fotografia dei denti la riga non compare: non si ripiega sul vivo', async () => {
      // 🛑 Il ripiego `ddc.X ?? lavoro.X` è proprio ciò che si toglie: una
      //    fotografia vuota è un fatto (quel giorno non c'erano denti), non un
      //    invito a guardare com'è il lavoro adesso.
      const element = createElement(DdcTemplate, {
        lavoro: { ...LAVORO_FIXTURE, denti_coinvolti: ['38', '37'] },
        lab: LAB_FIXTURE,
        ddc: { ...DDC_FIXTURE, denti_coinvolti: null },
      })
      const buffer = await renderPdfDocument(element)
      const parser = new PDFParse({ data: buffer })
      const result = await parser.getText()
      await parser.destroy()
      expect(result.text).not.toContain('38, 37')
      expect(result.text.toLowerCase()).not.toContain('denti coinvolti')
    })
  })
})

describe('D294 — la voce ⑧ è CONDIZIONALE: parla col dato, tace senza', () => {
  // ⚖️ CAPOVOLTA il 07/08/2026 (D294) e **CAPOVOLTA DI NUOVO** nel giro di
  //    correzione dello stesso giorno. La seconda volta è la più importante.
  //
  // 🔴 IL DIFETTO DI PARTENZA: il foglio stampava «Sostanze / tessuti: No» a
  //    partire da un `false` CABLATO (`generate-ddc.ts`) che nessuna riga di
  //    codice ha mai scritto. Su un documento a valore legale è
  //    un'AFFERMAZIONE NON SOSTENUTA: nessuno ha mai chiesto all'odontotecnico
  //    se il dispositivo contenga una sostanza medicinale, un derivato del
  //    sangue o del plasma, o tessuti di origine umana o animale.
  //
  // 🛑 IL DIFETTO INTRODOTTO CORREGGENDO IL PRIMO, ed è il motivo per cui questo
  //    blocco è scritto così. Il taglio aveva portato via **l'intero blocco
  //    condizionale, ramo affermativo compreso**, e questa prova si intitolava
  //    «non stampa nulla nemmeno sul ramo affermativo». Cioè: la strada di
  //    stampa della voce ⑧ era chiusa **e blindata da una prova verde il cui
  //    nome affermava che quel silenzio fosse voluto**. Il giorno in cui il dato
  //    si fosse raccolto davvero, l'odontotecnico avrebbe dichiarato «sì,
  //    contiene un derivato del plasma» e il documento non avrebbe stampato
  //    nulla — e chi fosse andato a rimediare avrebbe trovato una prova rossa
  //    che gli diceva che il silenzio era la forma giusta. Avrebbe tolto la
  //    raccolta invece del difetto.
  //
  // 🔑 LA REGOLA VERA, e sono DUE metà che vanno provate tutt'e due. La voce ⑧
  //    dell'Allegato XIII punto 1 comincia con «**se del caso**»:
  //      · quando il caso NON ricorre (dato falso o assente) → **tacere è la
  //        forma giusta**; affermare «No» senza sapere non lo è;
  //      · quando il caso RICORRE (dato affermativo) → la voce è
  //        **OBBLIGATORIA**, e il documento la deve dichiarare.
  //    Una prova che guardi una metà sola lascia l'altra senza rete — ed è
  //    successo, in tutt'e due le direzioni, nello stesso giorno.
  //
  // 📌 `generate-ddc.ts` cabla ancora `contiene_sostanze_o_tessuti: false` e
  //    nessuna schermata raccoglie il dato: **manca la raccolta, non la
  //    strada**. Queste prove sono ciò che tiene la strada aperta e percorribile
  //    fino al giorno in cui la raccolta arriverà.

  it('🔴 col dato AFFERMATIVO e il dettaglio, il documento DICHIARA la sostanza', async () => {
    const DETTAGLIO =
      'Contiene un derivato del plasma umano (fibrina autologa) — vedere documentazione allegata'
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: {
        ...DDC_FIXTURE,
        contiene_sostanze_o_tessuti: true,
        sostanze_tessuti_dettaglio: DETTAGLIO,
      },
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    expect(result.text).toContain('Sostanze / tessuti')
    // 🔑 E il DETTAGLIO, non solo l'etichetta: una prova che si fermasse
    //    all'etichetta resterebbe verde su un modello che stampa il titoletto e
    //    butta via il contenuto — cioè proprio ciò che la voce ⑧ chiede.
    expect(result.text).toContain('derivato del plasma umano')
  }, 30_000)

  it('🔴 col dato affermativo ma SENZA dettaglio, dichiara comunque il fatto', async () => {
    // Il ripiego non è cosmetico: la voce ⑧ chiede «l'INDICAZIONE che il
    // dispositivo contiene o incorpora…». Il dettaglio la arricchisce, non la
    // costituisce — e un `null` nel dettaglio non può far sparire l'indicazione.
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: { ...DDC_FIXTURE, contiene_sostanze_o_tessuti: true, sostanze_tessuti_dettaglio: null },
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    expect(result.text).toContain('Sostanze / tessuti')
    expect(result.text).toContain('Sì — vedere documentazione allegata')
  }, 30_000)

  it('🔴 e TACE col dato a `false`: il «No» affermato senza dato è il difetto vero', () => {
    // La fixture ha `contiene_sostanze_o_tessuti: false` — cioè ESATTAMENTE il
    // valore cablato che ogni dichiarazione in archivio porta. Questa prova
    // guarda il caso reale, non quello raro.
    expect(pdfText).not.toContain('Sostanze / tessuti')
    expect(pdfText.toLowerCase()).not.toContain('sostanze')
  })

  it('🔴 e tace anche col campo ASSENTE, che è una forma d\'ingresso raggiungibile', async () => {
    // 🔑 `DdcTemplateProps.ddc` è un `Partial`: la chiave può mancare del tutto.
    //    `false` e «assente» sono due input DIVERSI che devono dare lo stesso
    //    silenzio, e una condizione scritta male (`!== false`, oppure
    //    `'contiene_sostanze_o_tessuti' in ddc`) parlerebbe sul secondo.
    const senzaCampo: Partial<DichiarazioneConformita> &
      Pick<DichiarazioneConformita, 'tipo_dispositivo'> = { ...DDC_FIXTURE }
    delete senzaCampo.contiene_sostanze_o_tessuti
    delete senzaCampo.sostanze_tessuti_dettaglio

    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: senzaCampo,
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    expect(result.text).not.toContain('Sostanze / tessuti')
    expect(result.text.toLowerCase()).not.toContain('sostanze')
  }, 30_000)
})

describe('DdcTemplate — i METADATI del file (title/subject), che nessuna prova guardava', () => {
  // 🔑 Perché questo blocco esiste, ed è la lezione che l'ha generato: la revisione
  //    finale del ramo ha rimesso a mano il refuso in `title` e `subject`
  //    (DdcTemplate.tsx:292,294) e la suite ha risposto **40/40 verdi**. Il motivo è
  //    strutturale: `pdfText` nasce da `PDFParse.getText()`, che legge il CONTENUTO
  //    della pagina, mentre quei due campi vivono nel dizionario `/Info` del file —
  //    dove nessuna asserzione del progetto guardava. Sono i due punti che un lettore
  //    PDF mostra nella barra della finestra di un documento conservato dieci anni.
  // 🛑 I metadati sono scritti in UTF-16BE con BOM (provato: scripts/tmp/sonda-metadati.tsx),
  //    quindi si cercano nei BYTE, non nel testo estratto: ogni carattere latino
  //    diventa `\x00` + il carattere. È anche la prova che quella codifica regge
  //    l'accento — il gate che il panel aveva posto prima di autorizzare la correzione.
  const utf16be = (s: string) => [...s].map((c) => '\x00' + c).join('')

  it('🔴 D294 — title, subject, author, keywords e creator non sono più scritti nel file', async () => {
    // ⚖️ CAPOVOLTA il 07/08/2026 (D294). Pretendeva le due stringhe accentate.
    // 🔑 Perché escono: non sono contenuti del documento — non stanno sul foglio
    //    e non sono fra le otto voci. Erano il doppione di ciò che il foglio già
    //    dice, scritto in un posto dove nessuno lo rilegge.
    // 📌 Niente di identificativo si perde: il file conservato si chiama già
    //    `DDC-<anno>-<progressivo>.pdf` (`generate-ddc.ts`, `storagePath`), e il
    //    numero è stampato in testa al foglio.
    // 🛑 La lezione che aveva generato il blocco RESTA VALIDA e vale al
    //    contrario: quei campi vivono nel dizionario `/Info`, dove nessuna
    //    asserzione sul testo estratto arriva. Se un giorno tornassero — magari
    //    ricopiati da un altro modello — solo una prova sui BYTE se ne
    //    accorgerebbe. Per questo la prova resta, capovolta.
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: DDC_FIXTURE,
    })
    const buffer = await renderPdfDocument(element)
    const grezzo = buffer.toString('latin1')

    // Le stringhe intere, in UTF-16BE (la forma che avevano) e in codifica
    // semplice (la forma che avrebbero senza accento): entrambe, perché lo
    // strato PDF passa a UTF-16BE solo davanti a un carattere non-ASCII e una
    // sola delle due ricerche sarebbe cieca a metà dei modi di far tornare
    // quei campi.
    expect(grezzo).not.toContain(utf16be('Dichiarazione di Conformità DDC-2026-0001'))
    expect(grezzo).not.toContain(utf16be('Dichiarazione di Conformità MDR 2017/745'))
    expect(grezzo).not.toContain('Dichiarazione di Conformita')
    expect(grezzo).not.toContain('DDC MDR 2017/745 Allegato XIII') // keywords
    expect(grezzo).not.toContain('UA PWA') // creator

    // 🔑 E le CHIAVI del dizionario /Info, che è la prova che discrimina davvero:
    //    un valore può cambiare, la chiave no. Se `/Title` ricomparisse con un
    //    testo diverso, le asserzioni sulle stringhe tacerebbero e questa no.
    expect(grezzo).not.toContain('/Title')
    expect(grezzo).not.toContain('/Subject')
    expect(grezzo).not.toContain('/Keywords')
  }, 30_000)
})

// ═══════════════════════════════════════════════════════════════════════════
// D295 — LA PROVA CHE LE DUE VOCI FINISCONO DAVVERO SULLA CARTA
// ═══════════════════════════════════════════════════════════════════════════
// 🛑 NON BASTA che `generateDdC` metta il valore nell'insert: fino al
//    07/08/2026 `prescrizione_caratteristiche` ERA una colonna, ERA nel
//    modello, e il documento non l'ha mai stampata — perché il valore che ci
//    arrivava era sempre `null` e la riga è condizionale
//    (`DdcTemplate.tsx:442-447`). Queste prove rendono il PDF VERO e ne
//    leggono il testo: è l'unico controllo che il difetto non poteva superare.
//
// ⚠️ La fixture di sopra (`DDC_FIXTURE`) lascia le due voci vuote apposta —
//    è il documento «di prima». Qui se ne rende una seconda, «di dopo».
describe('D295 — voce 6 e luogo di fabbricazione sul foglio reso', () => {
  let testoPieno = ''

  beforeAll(async () => {
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: {
        ...DDC_FIXTURE,
        prescrizione_caratteristiche: 'Elementi: denti 26, 27 · Colore: A3',
        luogo_fabbricazione: 'Via Roma 12, Serre',
      },
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    testoPieno = result.text
  }, 30_000)

  it('🔴 §5 stampa l\'etichetta «Caratteristiche prescritte»', () => {
    expect(testoPieno).toContain('Caratteristiche prescritte')
  })

  it('🔴 e stampa la FRASE, leggibile da una persona — non un oggetto JSON', () => {
    expect(testoPieno).toContain('Elementi: denti 26, 27 · Colore: A3')
    // La contro-prova che vale più dell'asserzione sopra: sul foglio non
    // compare MAI la forma da macchina.
    expect(testoPieno).not.toContain('{"colore"')
    expect(testoPieno).not.toContain('"elementi"')
  })

  it('🔴 §1 stampa il luogo di fabbricazione, che la voce 1 pretende', () => {
    expect(testoPieno).toContain('Luogo di fabbricazione')
    expect(testoPieno).toContain('Via Roma 12, Serre')
  })

  it('il documento «di prima» NON aveva nessuna delle due: è il difetto, misurato', () => {
    // `pdfText` è il render della fixture con le due voci vuote. Se un giorno
    // qualcuno rendesse incondizionali quelle righe, questa prova lo direbbe:
    // una riga vuota su un documento legale è peggio di una riga assente.
    expect(pdfText).not.toContain('Caratteristiche prescritte')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// D294 — IL LOGO, e la ragione per cui una IMMAGINE su questo foglio è un rischio
// ═══════════════════════════════════════════════════════════════════════════
describe('D294 — nessuna immagine sul foglio', () => {
  // 🔑 Perché il logo esce, e sono DUE ragioni:
  //    ① non è un contenuto — nessuna delle otto voci dell'Allegato XIII punto 1
  //      chiede un marchio;
  //    ② è una LETTURA VIVA. `lab.logo_print_url ?? lab.logo_url` punta a un file
  //      su Storage che il laboratorio può sostituire in qualsiasi momento: una
  //      ristampa fra otto anni renderebbe un documento diverso da quello
  //      emesso, o non lo renderebbe affatto se l'URL nel frattempo è morto.
  //      È la stessa malattia che D102 ③ ha curato sui denti.
  // 🛑 Nessuna prova guardava questo. Un'immagine non lascia testo, quindi
  //    `PDFParse.getText()` è cieco: si guardano i BYTE del file.
  const PIXEL_PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

  it('🔴 con logo E firma valorizzati, il PDF non contiene nessuna immagine', async () => {
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: { ...LAB_FIXTURE, logo_url: PIXEL_PNG, logo_print_url: PIXEL_PNG },
      ddc: { ...DDC_FIXTURE, firma_ddc_storage_path: PIXEL_PNG },
    })
    const buffer = await renderPdfDocument(element)
    const grezzo = buffer.toString('latin1')

    // Un'immagine incorporata produce un XObject di sottotipo Image nel file.
    expect(grezzo).not.toContain('/Subtype /Image')
    expect(grezzo).not.toContain('/XObject')
  }, 30_000)
})

// ═══════════════════════════════════════════════════════════════════════════
// D294 — IL FOGLIO MASSIMALE: la rete che guarda il documento INTERO
// ═══════════════════════════════════════════════════════════════════════════
// 🔑 PERCHÉ QUESTO BLOCCO ESISTE, e perché non è il doppione delle prove sopra.
//    Ognuna di quelle guarda UN campo su una fixture che lascia vuoti gli altri:
//    è la forma giusta per dire *perché* un campo esce, ma nessuna di loro vede
//    il foglio come lo vede una persona. Qui si rende una dichiarazione con
//    OGNI campo valorizzato — il caso peggiore, quello in cui tutti i dodici
//    tagli avrebbero qualcosa da stampare — e si guarda il risultato tutto
//    insieme. È l'unica prova che si accenderebbe se un tredicesimo campo
//    rientrasse da una strada che nessuna asserzione puntuale sorveglia.
describe('D294 — il foglio massimale porta SOLO ciò che ci deve stare', () => {
  let testoMassimale = ''
  let pagineMassimale = 0

  beforeAll(async () => {
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: { ...LAB_FIXTURE, srn_eudamed: 'IT-CA-000123456' },
      ddc: {
        ...DDC_FIXTURE,
        prescrizione_caratteristiche: 'Elementi: denti 26, 27 · Colore: A3',
        luogo_fabbricazione: 'Via Roma 12, Serre',
        prescrizione_id: 'PRESCR-2026-77',
        denti_coinvolti: ['21', '37', '38'],
        // ⚠️ Le lunghezze qui NON sono decorative e non vanno accorciate: sono
        //    prese da un documento VERO del banco di prova (render locale in
        //    sola lettura del 07/08/2026). Un rischio residuo di una riga e una
        //    norma sola farebbero stare il foglio in una pagina anche PRIMA dei
        //    tagli, e la prova sulla paginazione qui sotto non misurerebbe più
        //    niente.
        norma_riferimento: 'UNI EN ISO 22674:2016',
        contiene_sostanze_o_tessuti: true,
        rischi_residui_snapshot:
          'Rischio residuo di frattura della ceramica in caso di parafunzione non compensata. ' +
          'Possibile perdita di ritenzione in presenza di igiene orale inadeguata. ' +
          'Sensibilità post-cementazione transitoria nei primi giorni dalla consegna.',
        norme_json: [
          { codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials' },
          { codice: 'EN ISO 22674:2016', titolo: 'Metallic materials', anno: 2016 },
        ],
      },
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    testoMassimale = result.text
    pagineMassimale = result.total
  }, 30_000)

  // ── Ciò che DEVE esserci: le voci dell'Allegato XIII e i tre appigli tenuti ──

  it('✅ porta le voci dell\'Allegato XIII punto 1 che gli spettano', () => {
    // voce 1 — nome, indirizzo, e TUTTI i luoghi di fabbricazione
    expect(testoMassimale).toContain('Laboratorio Odontotecnico Opromolla S.r.l.')
    expect(testoMassimale).toContain('Via Roma 12')
    expect(testoMassimale).toContain('Luogo di fabbricazione')
    // voce 3 — i dati che identificano il dispositivo
    expect(testoMassimale).toContain('LAV-2026-0001')
    expect(testoMassimale).toContain('Protesi Fissa')
    // voce 4 — uso esclusivo per il paziente nominato
    expect(testoMassimale).toContain('M.R.')
    expect(testoMassimale.toLowerCase()).toContain('fabbricato su misura')
    // voce 5 — il prescrittore
    expect(testoMassimale).toContain('Dott. Mario Rossi')
    // voce 6 — le caratteristiche indicate nella prescrizione
    expect(testoMassimale).toContain('Elementi: denti 26, 27 · Colore: A3')
    // voce 7 — conformità ai requisiti generali dell'Allegato I
    expect(testoMassimale.toLowerCase()).toContain('conforme ai requisiti')
    expect(testoMassimale).toMatch(/Allegato\s+I(?!\w)/)
  })

  it('✅ e la VOCE ⑧, che su questo foglio ricorre: il dato è affermativo', () => {
    // ⚖️ SALITA QUI nel giro di correzione del 07/08/2026, dalla lista dei tagli
    //    qui sotto. La voce ⑧ dell'Allegato XIII punto 1 è condizionale — «se
    //    del caso» — ma quando il caso ricorre è **obbligatoria**, e questa
    //    fixture ha `contiene_sostanze_o_tessuti: true`: il caso ricorre.
    // 🔴 Il taglio del mattino aveva portato via l'intero blocco condizionale,
    //    ramo affermativo compreso: la voce ⑧ non aveva più NESSUNA strada per
    //    comparire su nessun foglio. Questa asserzione, sul foglio massimale, è
    //    la prova che la strada è di nuovo percorribile.
    expect(testoMassimale).toContain('Sostanze / tessuti')
    expect(testoMassimale).toContain('Sì — vedere documentazione allegata')
  })

  it('✅ e i tre appigli tenuti apposta, ognuno con la sua ragione', () => {
    // data di emissione — Art. 52(8): «prima dell'immissione sul mercato».
    // Senza data non si dimostra di aver rispettato il termine.
    expect(testoMassimale).toContain('15/05/2026')
    // numero del documento — la chiave per ritrovarlo nei dieci anni di
    // conservazione che l'Allegato XIII punto 4 impone.
    expect(testoMassimale).toContain('DDC-2026-0001')
    // numero della prescrizione — l'aggancio al foglio del dentista.
    expect(testoMassimale).toContain('PRESCR-2026-77')
    // 🔑 PARTITA IVA — TENUTA PER SCELTA DI FRANCESCO, NON PER OBBLIGO.
    //    Il censimento non ha trovato nessuna norma che la imponga su questa
    //    dichiarazione. Sta scritto qui perché il prossimo che legge non la
    //    deduca da una legge che non esiste, e non la tolga credendola un refuso.
    expect(testoMassimale).toContain('03508740655')
    // titolo e base giuridica
    expect(testoMassimale).toContain('DICHIARAZIONE DI CONFORMITÀ')
    expect(testoMassimale).toContain('Art. 52(8)')
    // la nota sulla marcatura CE (Art. 20(1) — i su misura non la portano)
    expect(testoMassimale.toLowerCase()).toContain('marcatura ce')
  })

  // ── Ciò che NON deve esserci: i tagli che lasciano un testo da cercare ────

  it('🔴 e NESSUNO dei NOVE tagli che lasciano un testo, su un foglio dove tutti avrebbero da stampare', () => {
    // ⚖️ RINOMINATA nel giro di correzione del 07/08/2026, e il nome vecchio era
    //    «e NESSUNO dei DODICI tagli». Ne controllava DIECI, non dodici: il
    //    **logo** e i **metadati del file** non lasciano testo sul foglio —
    //    un'immagine è invisibile a `PDFParse.getText()` e i metadati vivono nel
    //    dizionario `/Info` — quindi non possono stare in una lista di stringhe.
    //    Le loro reti esistono e guardano i BYTE: «nessuna immagine sul foglio»
    //    e «title/subject/… non sono più scritti nel file».
    // ⚖️ E da DIECI sono scesi a NOVE nello stesso giro: la voce ⑧ («Sostanze /
    //    tessuti») **non è più un taglio**. Il ramo affermativo è stato
    //    ripristinato, perché quando il caso ricorre quella voce è OBBLIGATORIA
    //    — e questa fixture ha `contiene_sostanze_o_tessuti: true`, quindi il
    //    foglio la DEVE portare. È risalita nella prova qui sopra, fra ciò che
    //    ci deve stare.
    // 🔑 Perché il nome conta quanto le asserzioni: un nome di prova si tramanda
    //    più a lungo del codice che descrive, e un numero sbagliato lì dentro fa
    //    credere coperto ciò che nessuno guarda.
    const vietati: Array<[string, string]> = [
      ['materiali e lotti', 'Zirconia IPS e.max ZirCAD'],
      ['materiali e lotti (lotto)', 'LOT-2025-ZR-0042'],
      ['codice ITCA', 'ITCA'],
      ['SRN EUDAMED', 'EUDAMED'],
      ['luogo di emissione', 'Serre (SA), Italia'],
      ['classe di rischio', 'Classe IIa'],
      ['norma di riferimento', 'UNI EN ISO 22674:2016'],
      ['norme armonizzate', 'EN ISO 6872:2015'],
      ['rischi residui', 'Rischio residuo di frattura'],
      ['responsabile (PRRC)', 'PRRC'],
      ['piè di pagina', 'Documento generato ai sensi'],
    ]
    for (const [nome, ago] of vietati) {
      expect(testoMassimale, `taglio non applicato: ${nome}`).not.toContain(ago)
    }
  })

  it('🔴 il foglio massimale sta in UNA pagina sola', () => {
    // 🔴 IL FATTO, misurato il 07/08/2026 su render reale del banco di prova:
    //    PRIMA dei tagli il foglio con tutti i campi valorizzati traboccava su
    //    una SECONDA pagina, dove restavano orfani «Serre» e «Odontotecnico
    //    abilitato» — cioè un blocco firma spezzato in due. Una dichiarazione a
    //    valore legale che si spacca a metà è un difetto di forma che nessuna
    //    prova vedeva, perché nessuna guardava il foglio intero.
    // 🔑 Si conta con `result.total`, non cercando la marca «-- 2 of 2 --» nel
    //    testo: quella è una convenzione di stampa di PDFParse, cioè il
    //    comportamento di una libreria, e legarci una prova significa misurare
    //    lo strumento invece del documento.
    expect(pagineMassimale).toBe(1)
  })
})

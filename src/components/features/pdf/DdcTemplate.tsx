// UÀ — DdcTemplate
// Dichiarazione ex Allegato XIII del Reg. (UE) 2017/745 — dispositivi su misura
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer
//
// ═══ D294 (07/08/2026) — «IL DOCUMENTO PORTA SOLO CIÒ CHE CI DEVE STARE» ═══
// Francesco: «togli tutto quello che sul documento non ci deve essere, come la
// storia dei materiali» · «confermo, ripulisci per bene il documento».
//
// 🔑 IL METRO SONO GLI OTTO CONTENUTI dell'Allegato XIII punto 1, e sono questi:
//    ① nome e indirizzo del fabbricante e di TUTTI i luoghi di fabbricazione
//    ② nome e indirizzo dell'eventuale mandatario
//    ③ i dati che consentono di identificare il dispositivo
//    ④ la dichiarazione d'uso esclusivo per il paziente nominato
//    ⑤ il nome di chi ha prescritto il dispositivo
//    ⑥ le caratteristiche specifiche del prodotto INDICATE NELLA PRESCRIZIONE
//    ⑦ la conformità ai requisiti generali dell'Allegato I e, «se del caso»,
//       quelli NON rispettati con debita motivazione
//    ⑧ «se del caso», sostanze medicinali / tessuti / cellule
//    (② non è applicabile a un fabbricante italiano che fabbrica in Italia:
//     il mandatario serve all'extra-UE, Art. 11.)
//
// 🛑 SONO USCITI DODICI BLOCCHI, e la regola che li ha fatti uscire è una sola:
//    ciò che non è una delle otto voci non sta su questo foglio. Escono i
//    materiali e i lotti (vengono dal magazzino, non dalla prescrizione: non
//    sono la ⑥), il codice ITCA e l'SRN EUDAMED (registrazioni, non nomi né
//    indirizzi), il luogo di emissione, la classe di rischio, la norma di
//    riferimento e le norme armonizzate (la ⑦ chiede i requisiti NON rispettati,
//    non quelli rispettati), i rischi residui (ISO 14971, non una deroga), il
//    «Sostanze / tessuti: No» affermato senza avere il dato, la firma col
//    responsabile, il logo, il piè di pagina e i metadati del file.
//
// ⚠️ UNA PRECISAZIONE SUL TAGLIO N. 8, aggiunta nel giro di correzione dello
//    stesso giorno perché la riga qui sopra si legge male. È uscito **il solo
//    «No» affermato senza il dato**, non la voce ⑧. Il taglio del mattino aveva
//    portato via l'intero blocco condizionale, ramo affermativo compreso: la
//    voce ⑧ non aveva più nessuna strada per comparire nemmeno con un dato
//    affermativo, e una prova verde intitolata «non stampa nulla nemmeno sul
//    ramo affermativo» teneva chiusa quella strada. Il ramo affermativo è stato
//    RIPRISTINATO (§5, riga «Sostanze / tessuti»): «se del caso» vuol dire che
//    quando il caso ricorre la voce è **obbligatoria**.
//
// 🔴 USCIRE DAL FOGLIO NON È USCIRE DALLA BANCA DATI. Tutte le colonne restano,
//    tutti i valori continuano a salvarsi, e i materiali continuano a stamparsi
//    su ricevuta di consegna ed etichetta. Qui si decide solo COSA SI STAMPA.
//
// 🔑 RESTANO, e la ragione va lasciata scritta: la data di emissione (Art. 52(8)
//    — la dichiarazione va redatta «prima dell'immissione sul mercato», e senza
//    data non lo si dimostra), il numero del documento (la chiave per ritrovarlo
//    nei dieci anni di conservazione dell'Allegato XIII punto 4), il numero
//    della prescrizione, il titolo con la base giuridica, la nota sull'assenza
//    di marcatura CE (Art. 20(1)) — e la PARTITA IVA, che è tenuta **per scelta
//    di Francesco e non per obbligo**: il censimento non ha trovato nessuna
//    norma che la imponga su questa dichiarazione. Sta scritto qui perché il
//    prossimo non la deduca da una legge che non esiste.
// ═══════════════════════════════════════════════════════════════════════════

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { LavoroDettaglio, Laboratorio, DichiarazioneConformita, TipoDispositivo } from '@/types/domain'
import { LABEL_MACRO, MACRO_SLUGS } from '@/lib/domain/tipi-lavoro'
import { dataItalianaBreve } from '@/lib/utils/data-roma'

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    paddingTop: 36,
    paddingBottom: 48,
    paddingLeft: 48,
    paddingRight: 48,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  labNome: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  labSub: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 2,
  },
  // Titolo
  titoloWrapper: {
    alignItems: 'center',
    marginBottom: 4,
  },
  titolo: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#0f1e52',
  },
  sottotitolo: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  // Separatore
  separator: {
    borderBottom: '0.5pt solid #cccccc',
    marginBottom: 12,
  },
  // Numero DdC
  numeroDdc: {
    textAlign: 'right',
    fontSize: 8,
    color: '#888888',
    marginBottom: 12,
  },
  // Sezione
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#0f1e52',
    marginBottom: 3,
    paddingBottom: 2,
    borderBottom: '0.5pt solid #e0e4f0',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    width: 140,
    fontSize: 9,
    color: '#555555',
  },
  value: {
    flex: 1,
    fontSize: 9,
    color: '#1a1a1a',
  },
  valueBold: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  // Testo conformita
  conformitaBox: {
    marginTop: 4,
    padding: 8,
  },
  conformitaText: {
    fontSize: 9,
    color: '#222222',
    lineHeight: 1.5,
  },
  // Nota a piè di sezione (oggi: la sola nota sull'assenza di marcatura CE)
  rischiText: {
    fontSize: 8,
    color: '#444444',
    lineHeight: 1.4,
    marginTop: 3,
  },
  // Denti
  dentiText: {
    fontSize: 9,
    color: '#1a1a1a',
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────

// P9 (02/08/2026) — la data si stampa nel giorno civile ITALIANO, non nel fuso
// della macchina. `dichiarazioni_conformita.data_emissione` è un TIMESTAMPTZ, cioè
// un istante: letto a UTC — com'è in produzione — un documento emesso alle 00:30
// di Roma portava la data del giorno prima, mentre il suo NUMERO era già del
// giorno dopo (`annoRoma`, dal 20/07/2026). Su un documento a valore legale
// (Art. 52(8) + Allegato XIII MDR) è una discordanza che non si tiene.
const formatData = dataItalianaBreve

// ⚠️ `formatClasseRischio` viveva qui e non c'è più (D294): la classe di rischio
// non è una delle otto voci dell'Allegato XIII e non si stampa più. Il DATO
// resta — `dichiarazioni_conformita.classe_rischio` è `NOT NULL` e continua a
// essere scritto a ogni emissione — e resta anche il controllo di consegna che
// lo pretende (`precheck.ts`): esce dal foglio, non dal laboratorio.

// B4: le label del DdC (documento regolamentare stampato) usano il Title Case
// ("Protesi Fissa"), diverso dal sentence case standard di LABEL_MACRO
// ("Protesi fissa") — invariante coperto da tests/unit/ddc-pdf-content.test.ts.
// Override locale conservato; chiavi derivate da MACRO_SLUGS (fallback a
// LABEL_MACRO per le voci a parola singola, identiche nei due casing).
const TIPO_LABELS_DDC_OVERRIDE: Partial<Record<TipoDispositivo, string>> = {
  protesi_fissa: 'Protesi Fissa',
  protesi_mobile: 'Protesi Mobile',
  bite_splint: 'Bite / Splint',
}

function formatTipoDispositivo(tipo: string): string {
  if (MACRO_SLUGS.includes(tipo as TipoDispositivo)) {
    const macro = tipo as TipoDispositivo
    return TIPO_LABELS_DDC_OVERRIDE[macro] ?? LABEL_MACRO[macro]
  }
  return tipo
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface DdcTemplateProps {
  lavoro: LavoroDettaglio
  lab: Laboratorio
  /** La FOTOGRAFIA della dichiarazione — ciò che viene congelato all'emissione.
   *
   *  🛑 D102 ③ — perché non è più un `Partial` nudo, ed è la causa RADICE del
   *  difetto che questa modifica toglie. Con tutto facoltativo il template non
   *  poteva fidarsi di niente, e si ripiegava sul lavoro VIVO (`ddc.X ?? lavoro.X`
   *  in quattro punti): un documento a valore legale che, ristampato, poteva dire
   *  cose diverse da quelle dichiarate. Rimettere i ripieghi avrebbe curato il
   *  sintomo; il rimedio è dichiarare che senza questi campi la dichiarazione non
   *  si stampa affatto — sono colonne NOT NULL, quindi la fotografia li ha
   *  SEMPRE, e un chiamante che li dimenticasse si rompe alla compilazione invece
   *  che in silenzio sulla carta.
   *
   *  ⚠️ ERANO DUE, ED È RIMASTO UNO (giro di correzione del 07/08/2026).
   *  `classe_rischio` stava qui accanto a `tipo_dispositivo`, e la ragione
   *  scritta sopra — «senza questi campi la dichiarazione non si stampa
   *  affatto» — per lei **non era più vera**: la classe di rischio è uscita dal
   *  foglio con D294 e questo modello non la legge da nessuna parte. Un tipo che
   *  pretende un campo che non usa non è severo, è **impreciso**: chiede una cosa
   *  in nome di una regola che non la riguarda, e il commento accanto diventa
   *  metà vero e metà falso.
   *  🛑 Il DATO non è toccato: `dichiarazioni_conformita.classe_rischio` è
   *  `NOT NULL`, `generate-ddc.ts` continua a scriverla a ogni emissione e il
   *  controllo di consegna continua a pretenderla (`precheck.ts`). A cambiare è
   *  solo ciò che QUESTO componente dichiara di aver bisogno. */
  ddc: Partial<DichiarazioneConformita> &
    Pick<DichiarazioneConformita, 'tipo_dispositivo'>
}

// ─── Component ─────────────────────────────────────────────────────────────

export function DdcTemplate({ lavoro, lab, ddc }: DdcTemplateProps) {
  const pazienteNome = [ddc.paziente_nome, ddc.paziente_cognome]
    .filter(Boolean)
    .join(' ')
    .trim() || '—'

  // 🛑 D102 ③ — la FOTOGRAFIA (`ddc.`), mai il dato vivo (`lavoro.`).
  // Questa riga leggeva `lavoro.denti_coinvolti` mentre lo snapshot esisteva già
  // e non lo leggeva nessuno: un documento conservato dieci anni che, ristampato,
  // poteva dire denti diversi da quelli dichiarati. E se la fotografia è vuota la
  // riga NON compare: è un fatto («quel giorno non c'erano denti»), non un invito
  // a guardare com'è il lavoro adesso.
  const dentiFormatted = ddc.denti_coinvolti?.length
    ? ddc.denti_coinvolti.join(', ')
    : null

  // ⚠️ `materialiText` viveva qui e non c'è più (D294). I materiali e i loro
  // lotti nascono dal CONSUMO DI MAGAZZINO, non dalla prescrizione: non sono la
  // voce ⑥ («le caratteristiche indicate nella prescrizione») e nessun'altra
  // delle otto voci li chiede. 🛑 `lavori_materiali` resta intatta e i
  // materiali continuano a stamparsi su ricevuta di consegna ed etichetta:
  // `lavoro.materiali` semplicemente non viene più letto da QUESTO modello.

  return (
    // 🛑 D294 — `<Document>` non porta più metadati (title/author/subject/
    //    keywords/creator). Non sono contenuti del documento: non stanno sul
    //    foglio e non sono fra le otto voci. Il file conservato si identifica
    //    già dal nome (`DDC-<anno>-<progressivo>.pdf`, generate-ddc.ts) e dal
    //    numero stampato in testa.
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── HEADER ──
            🛑 D294 — il LOGO è uscito, e per DUE ragioni: non è un contenuto
            dell'Allegato XIII, e soprattutto era una LETTURA VIVA
            (`lab.logo_print_url ?? lab.logo_url`) su un file che il laboratorio
            può sostituire quando vuole. Una ristampa fra otto anni avrebbe reso
            un documento diverso da quello emesso — o non l'avrebbe reso affatto,
            con l'URL morto. È la stessa malattia che D102 ③ ha curato sui denti.
            Uscito anche il codice ITCA, che qui era la SECONDA delle sue due
            stampe. */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.labNome}>
              {ddc.fabbricante_nome ?? lab.ragione_sociale ?? lab.nome}
            </Text>
            {ddc.fabbricante_indirizzo ? (
              <Text style={styles.labSub}>{ddc.fabbricante_indirizzo}</Text>
            ) : null}
            {ddc.fabbricante_piva ? (
              <Text style={styles.labSub}>P.IVA: {ddc.fabbricante_piva}</Text>
            ) : null}
          </View>
        </View>

        {/* ── TITOLO ── */}
        <View style={styles.titoloWrapper}>
          <Text style={styles.titolo}>Dichiarazione di Conformità</Text>
        </View>
        <Text style={styles.sottotitolo}>
          Ai sensi dell&apos;Art. 52(8) e Allegato XIII del Regolamento UE 2017/745
        </Text>

        {/* ── SEPARATORE ── */}
        <View style={styles.separator} />

        {/* ── NUMERO DDC ── */}
        {ddc.numero_ddc ? (
          <Text style={styles.numeroDdc}>
            N. {ddc.numero_ddc}
          </Text>
        ) : null}

        {/* ── §1 FABBRICANTE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§1 — Fabbricante</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Ragione sociale:</Text>
            <Text style={styles.valueBold}>{ddc.fabbricante_nome ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Indirizzo:</Text>
            <Text style={styles.value}>{ddc.fabbricante_indirizzo || '—'}</Text>
          </View>
          {/* 🔑 PARTITA IVA — TENUTA PER SCELTA DI FRANCESCO, NON PER OBBLIGO
              («teniamola», 07/08/2026). Il censimento non ha trovato nessuna
              norma che la imponga su questa dichiarazione: la voce 1 chiede il
              nome e l'indirizzo, non un identificativo fiscale. Sta scritto qui
              perché il prossimo che legge non la deduca da una legge che non
              c'è — e non la tolga credendola una svista. */}
          <View style={styles.row}>
            <Text style={styles.label}>Partita IVA:</Text>
            <Text style={styles.value}>{ddc.fabbricante_piva || '—'}</Text>
          </View>
          {/* 🛑 D294 — QUI USCIVANO IL CODICE ITCA E L'SRN EUDAMED.
              · Il codice ITCA (che il foglio stampava anche in testata) è un
                codice di REGISTRAZIONE: la voce 1 nomina due cose, il nome e
                l'indirizzo, e un codice non è né l'uno né l'altro. L'obbligo
                italiano (D.Lgs. 137/2022 art. 7) colpisce l'ISCRIVERSI
                all'elenco dei fabbricanti di dispositivi su misura, non il
                contenuto di questa dichiarazione. `laboratori.codice_itca`
                resta, obbligatorio come prima.
              · L'«SRN EUDAMED» aveva l'etichetta sbagliata DUE volte: un
                fabbricante di soli dispositivi su misura non è registrato in
                EUDAMED finché non trasmette la prima segnalazione di vigilanza
                (MDCG 2021-13 Rev.1 Q2/Q3; D.Lgs. 137/2022 art. 12 c.2), e ciò
                che riceve allora è un **Actor ID, che non è un SRN**. */}
          {/* VOCE 1 (D295) — «il nome e l'indirizzo del fabbricante e di TUTTI
              I LUOGHI DI FABBRICAZIONE». Prima del 07/08/2026 questa riga non
              esisteva: la colonna c'era (NOT NULL DEFAULT 'Italia'), nessuno la
              scriveva, e il foglio non la diceva.
              🔑 Incondizionata, a differenza delle righe facoltative qui sopra:
              la colonna è NOT NULL e un luogo di fabbricazione è SEMPRE dovuto —
              nasconderla quando è vuota nasconderebbe proprio il caso da vedere.
              ⚠️ Per un laboratorio a sede unica questo valore COINCIDE con
              l'indirizzo del fabbricante due righe sopra. È corretto, non un
              doppione: la voce 1 chiede entrambe le informazioni, e chi ispeziona
              deve poter leggere che coincidono invece di doverlo dedurre. */}
          <View style={styles.row}>
            <Text style={styles.label}>Luogo di fabbricazione:</Text>
            <Text style={styles.value}>{ddc.luogo_fabbricazione || '—'}</Text>
          </View>
          {/* 🛑 D294 — QUI USCIVA IL «Luogo emissione», ed è il taglio più facile
              da sbagliare di tutti e dodici. `luogo_emissione` è la CITTÀ DEL
              LABORATORIO, cioè dove il documento è stato firmato: non è un luogo
              di fabbricazione e non è fra le otto voci. Il foglio lo stampava
              due volte, qui e sotto la firma.
              ⚠️ NON confonderlo con `luogo_fabbricazione`, la riga qui sopra:
              i due nomi si somigliano, ma quello è la voce 1 ed è OBBLIGATORIO.
              La colonna `luogo_emissione` resta in banca dati e continua a
              essere scritta a ogni emissione. */}
        </View>

        {/* ── §2 DATA DI EMISSIONE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§2 — Data di emissione</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Data:</Text>
            <Text style={styles.valueBold}>
              {ddc.data_emissione ? formatData(ddc.data_emissione) : '—'}
            </Text>
          </View>
        </View>

        {/* ── §3 PRESCRITTORE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§3 — Prescrittore</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome prescrittore:</Text>
            <Text style={styles.valueBold}>{ddc.prescrittore_nome || '—'}</Text>
          </View>
          {ddc.prescrizione_id ? (
            <View style={styles.row}>
              <Text style={styles.label}>N. prescrizione:</Text>
              <Text style={styles.value}>{ddc.prescrizione_id}</Text>
            </View>
          ) : null}
        </View>

        {/* ── §4 PAZIENTE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§4 — Paziente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Paziente:</Text>
            <Text style={styles.valueBold}>{pazienteNome}</Text>
          </View>
          {ddc.uso_esclusivo_paziente ? (
            <View style={styles.row}>
              <Text style={styles.label}></Text>
              <Text style={styles.value}>{ddc.uso_esclusivo_paziente}</Text>
            </View>
          ) : null}
        </View>

        {/* ── §5 DISPOSITIVO ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§5 — Dispositivo su misura</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Numero lavoro:</Text>
            <Text style={styles.valueBold}>{lavoro.numero_lavoro || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tipo dispositivo:</Text>
            <Text style={styles.valueBold}>
              {/* D102 ③ — niente ripiego sul vivo: la colonna è NOT NULL. */}
              {formatTipoDispositivo(ddc.tipo_dispositivo)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Descrizione:</Text>
            <Text style={styles.value}>{ddc.descrizione_dispositivo || '—'}</Text>
          </View>
          {dentiFormatted ? (
            <View style={styles.row}>
              <Text style={styles.label}>Denti coinvolti:</Text>
              <Text style={styles.dentiText}>{dentiFormatted}</Text>
            </View>
          ) : null}
          {/* 🛑 D294 — QUI USCIVANO I MATERIALI E I LOTTI, ed è il taglio che
              Francesco ha nominato per primo («come la storia dei materiali»).
              Vengono dal consumo di magazzino, non dalla prescrizione: non sono
              la voce ⑥ e nessun'altra delle otto li chiede. Nessuna norma
              italiana li impone su questo foglio (censimento esaustivo).
              🛑 Restano in banca dati e continuano a stamparsi su ricevuta di
              consegna ed etichetta — dal documento escono, dal laboratorio no. */}
          {ddc.prescrizione_caratteristiche ? (
            <View style={styles.row}>
              <Text style={styles.label}>Caratteristiche prescritte:</Text>
              <Text style={styles.value}>{ddc.prescrizione_caratteristiche}</Text>
            </View>
          ) : null}
          {/* 🛑 D294 — QUI USCIVA «Sostanze / tessuti», ed è il taglio più
              delicato dei dodici. La riga era stampata a partire da un `false`
              CABLATO (`generate-ddc.ts`) che nessuna riga di codice ha mai
              scritto: il foglio affermava «No» senza che nessuno avesse mai
              chiesto all'odontotecnico se il dispositivo contenga una sostanza
              medicinale, un derivato del sangue o tessuti. Su un documento a
              valore legale è un'AFFERMAZIONE NON SOSTENUTA.
              🔑 La voce ⑧ comincia con «se del caso»: è condizionale, e il
              silenzio è la forma giusta finché il dato non c'è.

              🛑 MA IL TAGLIO ERA ANDATO OLTRE, e il giro di correzione dello
              stesso giorno l'ha rimediato: era uscito **l'intero blocco
              condizionale, ramo affermativo compreso**, e una prova verde
              intitolata «non stampa nulla nemmeno sul ramo affermativo» lo
              teneva chiuso. La voce ⑧ non aveva più NESSUNA strada per comparire
              su nessun foglio. La riga qui sotto è quella strada, riaperta. */}
          {/* ── VOCE ⑧ — «SE DEL CASO», e quando il caso ricorre è DOVUTA ──
              Allegato XIII punto 1, ottavo trattino: «se del caso, l'indicazione
              che il dispositivo contiene o incorpora una sostanza medicinale,
              compreso un derivato dal sangue o dal plasma umani, o tessuti o
              cellule di origine umana o di origine animale…».
              🔑 CONDIZIONALE VUOL DIRE DUE COSE, NON UNA: con il dato assente o
              falso il foglio TACE (affermare «No» senza saperlo è
              un'affermazione non sostenuta su un documento a valore legale); con
              il dato affermativo il foglio DEVE dichiararlo. Per questo la riga
              esiste ed è dentro un `? :` sul dato, invece di essere sparita.
              📌 Il dettaglio ARRICCHISCE l'indicazione, non la costituisce: se
              manca si dichiara comunque il fatto e si rimanda alla
              documentazione allegata. Un `null` nel dettaglio non può far
              sparire una voce obbligatoria.
              ⚠️ OGGI QUESTA RIGA NON COMPARE SU NESSUN DOCUMENTO EMESSO, e non
              è un difetto di qui: `generate-ddc.ts` cabla ancora
              `contiene_sostanze_o_tessuti: false` perché **nessuna schermata
              chiede il dato all'odontotecnico**. Manca la raccolta, non la
              stampa. Le prove in `tests/unit/ddc-pdf-content.test.ts` tengono
              questa strada percorribile in tutt'e due i versi. */}
          {ddc.contiene_sostanze_o_tessuti ? (
            <View style={styles.row}>
              <Text style={styles.label}>Sostanze / tessuti:</Text>
              <Text style={styles.value}>
                {ddc.sostanze_tessuti_dettaglio ?? 'Sì — vedere documentazione allegata'}
              </Text>
            </View>
          ) : null}
          <Text style={styles.rischiText}>
            Dispositivo su misura ai sensi dell&apos;Art. 2(1)(3) MDR — non soggetto a marcatura CE ai sensi dell&apos;Art. 20(1) MDR 2017/745.
          </Text>
        </View>

        {/* 🛑 D294 — QUI USCIVANO DUE SEZIONI INTERE, non due righe.
            · «§6 — Classificazione MDR» portava la CLASSE DI RISCHIO e la NORMA
              DI RIFERIMENTO. La classe è fuori dalle otto voci; la norma di
              riferimento è una norma APPLICATA, mentre la voce ⑦ chiede, «se del
              caso», i requisiti generali NON rispettati con debita motivazione —
              cioè il contrario.
            · «§6-bis — Norme Armonizzate Applicate» usciva per la stessa
              ragione della norma di riferimento.
            🔑 Tolte le righe, le sezioni restavano VUOTE: si è tolto l'intero
            `<View>`, titoletto bordato compreso. Un titolo di sezione senza
            contenuto è il modo tipico in cui una pulizia fatta a metà si scopre
            solo a stampa avvenuta.
            📌 Da qui la RINUMERAZIONE: la dichiarazione di conformità era il §7
            ed è il §6. Un foglio che salta da §5 a §7 sembra incompleto a chi
            lo ispeziona — ed è la cosa peggiore che possa sembrare. */}

        {/* ── §6 CONFORMITA (era §7 fino al 07/08/2026) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§6 — Dichiarazione di Conformità</Text>
          <View style={styles.conformitaBox}>
            <Text style={styles.conformitaText}>
              {ddc.testo_conformita_snapshot ?? '—'}
            </Text>
          </View>
        </View>

        {/* 🛑 D294 — QUI USCIVANO IL §8 RISCHI RESIDUI, IL BLOCCO FIRMA E IL PIÈ
            DI PAGINA.
            · I RISCHI RESIDUI sono l'esito dell'analisi del rischio (ISO 14971),
              non una deroga a un requisito generale: la voce ⑦ chiede i
              requisiti dell'Allegato I non rispettati, con motivazione, che è
              un'altra domanda. `rischi_residui_snapshot` resta in banca dati.
            · LA FIRMA, con l'etichetta «Responsabile della Conformità (PRRC)», il
              nome e la qualifica. L'Art. 15(3)(b) nomina la dichiarazione di
              conformità **UE**, che per i dispositivi su misura NON esiste
              (Art. 10(6)); e fra le otto voci non compare né una firma né un
              responsabile. L'unica persona che il punto 1 nomina è il
              PRESCRITTORE — voce ⑤, il §3 di questo foglio, che resta.
              ⚠️ Con la firma è uscita anche la SECONDA stampa della data di
              emissione: ora vive nel §2 e basta.
            · IL PIÈ DI PAGINA (testo di legge + numero del documento) era
              `fixed`, cioè ripetuto su ogni pagina, ed era un doppione: la base
              giuridica sta nel sottotitolo, il numero in testa al foglio. */}

      </Page>
    </Document>
  )
}

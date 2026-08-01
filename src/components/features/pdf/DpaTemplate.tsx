// UÀ — DpaTemplate
// Accordo di Responsabile del Trattamento (DPA) — GDPR Art. 28
// Tra studio dentistico (Titolare) e laboratorio odontotecnico (Responsabile)
// react/no-unescaped-entities disabilitato via eslint.config.mjs per tutti i template PDF

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: '#1a1a1a',
    paddingTop: 44,
    paddingBottom: 60,
    paddingLeft: 52,
    paddingRight: 52,
  },
  header: { marginBottom: 16 },
  labNome: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  labSub: { fontSize: 8, color: '#666', marginBottom: 1 },
  separator: { borderBottom: '1.5pt solid #1a1a1a', marginBottom: 16, marginTop: 8 },
  separatorLight: { borderBottom: '0.5pt solid #ccc', marginBottom: 10, marginTop: 10 },
  titolo: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  sottotitolo: { fontSize: 9, color: '#555', textAlign: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 5, marginTop: 12 },
  bodyText: { fontSize: 9.5, lineHeight: 1.5, color: '#1a1a1a', marginBottom: 6 },
  boldText: { fontFamily: 'Helvetica-Bold' },
  bulletRow: { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { width: 12, fontSize: 9.5 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },
  partiBox: {
    flexDirection: 'row', gap: 16, marginBottom: 14, marginTop: 6,
  },
  parteCard: {
    flex: 1, borderWidth: 0.5, borderColor: '#999', borderRadius: 4, padding: 8,
  },
  parteLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  parteName: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  parteDetail: { fontSize: 8.5, color: '#555', marginBottom: 1 },
  firmaRow: {
    flexDirection: 'row', gap: 20, marginTop: 30, marginBottom: 20,
  },
  firmaBox: {
    flex: 1, borderTopWidth: 0.5, borderTopColor: '#333', paddingTop: 6,
  },
  firmaLabel: { fontSize: 8, color: '#555' },
  footer: { position: 'absolute', bottom: 20, left: 52, right: 52 },
  footerText: { fontSize: 7, color: '#999', textAlign: 'center' },
  articleNum: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#D90012', marginRight: 4 },
})

interface DpaData {
  lab: {
    ragione_sociale?: string | null
    nome: string
    partita_iva?: string | null
    codice_fiscale?: string | null
    indirizzo?: string | null
    cap?: string | null
    citta?: string | null
    provincia?: string | null
    prrc_nome?: string | null
    codice_itca?: string | null
  }
  cliente: {
    studio_nome?: string | null
    nome: string
    cognome: string
    partita_iva?: string | null
    codice_fiscale?: string | null
    indirizzo?: string | null
    cap?: string | null
    citta?: string | null
    provincia?: string | null
  }
  numero_dpa: string
  data_emissione: string
}

interface Props { dpa: DpaData }

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  )
}

export function DpaTemplate({ dpa }: Props) {
  const { lab, cliente } = dpa
  const labNome = lab.ragione_sociale ?? lab.nome
  const clienteNome = cliente.studio_nome ?? `${cliente.nome} ${cliente.cognome}`.trim()
  const data = new Date(dpa.data_emissione).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document title={`DPA-${dpa.numero_dpa}`} author={labNome}>
      <Page size="A4" style={styles.page}>

        {/* Header lab */}
        <View style={styles.header}>
          <Text style={styles.labNome}>{labNome}</Text>
          {lab.indirizzo && <Text style={styles.labSub}>{lab.indirizzo}{lab.cap ? `, ${lab.cap}` : ''}{lab.citta ? ` ${lab.citta}` : ''}{lab.provincia ? ` (${lab.provincia})` : ''}</Text>}
          {lab.partita_iva && <Text style={styles.labSub}>P.IVA: {lab.partita_iva}</Text>}
          {lab.codice_itca && <Text style={styles.labSub}>Codice ITCA: {lab.codice_itca} — Fabbricante DM ai sensi MDR 2017/745</Text>}
        </View>
        <View style={styles.separator} />

        {/* Titolo */}
        <Text style={styles.titolo}>ACCORDO SUL TRATTAMENTO DEI DATI PERSONALI</Text>
        <Text style={styles.sottotitolo}>Data Processing Agreement (DPA) — Regolamento (UE) 2016/679, Art. 28</Text>
        <Text style={[styles.bodyText, { textAlign: 'center', color: '#666', marginBottom: 12 }]}>
          Rif. n. {dpa.numero_dpa} — {data}
        </Text>

        {/* Parti */}
        <View style={styles.partiBox}>
          <View style={styles.parteCard}>
            <Text style={styles.parteLabel}>Titolare del Trattamento</Text>
            <Text style={styles.parteName}>{clienteNome}</Text>
            {cliente.indirizzo && <Text style={styles.parteDetail}>{cliente.indirizzo}{cliente.citta ? `, ${cliente.citta}` : ''}</Text>}
            {cliente.partita_iva && <Text style={styles.parteDetail}>P.IVA: {cliente.partita_iva}</Text>}
            {cliente.codice_fiscale && <Text style={styles.parteDetail}>C.F.: {cliente.codice_fiscale}</Text>}
          </View>
          <View style={styles.parteCard}>
            <Text style={styles.parteLabel}>Responsabile del Trattamento</Text>
            <Text style={styles.parteName}>{labNome}</Text>
            {lab.indirizzo && <Text style={styles.parteDetail}>{lab.indirizzo}{lab.citta ? `, ${lab.citta}` : ''}</Text>}
            {lab.partita_iva && <Text style={styles.parteDetail}>P.IVA: {lab.partita_iva}</Text>}
            {lab.prrc_nome && <Text style={styles.parteDetail}>Ref.: {lab.prrc_nome}</Text>}
          </View>
        </View>

        {/* PREMESSA */}
        <Text style={styles.sectionTitle}>PREMESSE</Text>
        <Text style={styles.bodyText}>
          Il Titolare affida al Responsabile la lavorazione di dispositivi medici su misura ai sensi del Regolamento (UE) 2017/745 (MDR). Tale attività comporta il trattamento di dati personali, compresi dati relativi alla salute dei pazienti del Titolare. Le parti stipulano il presente accordo ai sensi dell'Art. 28 del Regolamento (UE) 2016/679 (GDPR).
        </Text>

        {/* ART. 1 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 1</Text> — Oggetto, Natura e Durata del Trattamento</Text>
        <Text style={styles.bodyText}>Il Responsabile tratta dati personali per conto del Titolare ai seguenti fini:</Text>
        <Bullet text="Produzione di dispositivi medici su misura su prescrizione del Titolare" />
        <Bullet text="Redazione e archiviazione della dichiarazione per i dispositivi su misura (MDR Art. 52(8) e Allegato XIII, punto 1)" />
        <Bullet text="Tenuta a disposizione delle autorità competenti della documentazione di fabbricazione del dispositivo (MDR Art. 10(5) e Allegato XIII, punto 2)" />
        <Bullet text="Valutazione e documentazione dell'esperienza acquisita dopo la produzione (MDR Allegato XIII, punto 5)" />
        <Text style={[styles.bodyText, { marginTop: 4 }]}>Il trattamento ha durata pari a quella del rapporto contrattuale tra le parti. La dichiarazione dei dispositivi su misura è conservata per almeno 10 anni dalla data di immissione sul mercato del dispositivo — che coincide con la sua consegna (MDR Art. 2, punto 28) — e per almeno 15 anni nel caso dei dispositivi impiantabili (MDR Allegato XIII, punto 4). La documentazione di fabbricazione è tenuta a disposizione delle autorità competenti per tutto il tempo in cui l'obbligo permane, senza che il Regolamento ne fissi un termine.</Text>
        <Text style={[styles.bodyText, { marginTop: 4 }]}>Il materiale di lavorazione non compreso nella documentazione sopra indicata — in particolare le immagini acquisite durante la produzione — non è soggetto ad alcun termine minimo di conservazione imposto dal Regolamento (UE) 2017/745, ed è conservato per il solo tempo necessario alla lavorazione.</Text>
        <Text style={[styles.bodyText, { marginTop: 4 }]}>Il presente accordo è stipulato per ciascun Titolare e non per singolo dispositivo: le clausole enunciano la regola applicabile, non il termine riferito a un determinato dispositivo.</Text>

        {/* ART. 2 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 2</Text> — Tipologia di Dati e Categorie di Interessati</Text>
        <Text style={styles.bodyText}>Sono trattati i seguenti dati personali:</Text>
        <Bullet text="Dati identificativi del paziente (nome, cognome, data di nascita, codice fiscale)" />
        <Bullet text="Dati relativi alla salute: informazioni cliniche necessarie alla produzione (arcata, denti coinvolti, classe di rischio, prescrizione)" />
        <Bullet text="Dati del prescrittore (dentista): nome, qualifica, studio" />
        <Text style={[styles.bodyText, { marginTop: 4 }]}>Gli interessati sono i pazienti degli studi dentistici del Titolare. Il Responsabile gestisce tali dati esclusivamente per le finalità indicate all'Art. 1.</Text>

        {/* ART. 3 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 3</Text> — Istruzioni al Responsabile e Obblighi</Text>
        <Text style={styles.bodyText}>Il Responsabile si impegna a:</Text>
        <Bullet text="Trattare i dati personali soltanto su istruzione documentata del Titolare, salvo obblighi di legge" />
        <Bullet text="Garantire la riservatezza delle persone autorizzate al trattamento, con impegno di riservatezza contrattuale o ex lege" />
        <Bullet text="Non trasferire i dati a paesi terzi al di fuori dello Spazio Economico Europeo senza preventiva autorizzazione scritta del Titolare" />
        <Bullet text="Informare il Titolare di qualsiasi violazione di dati personali (data breach) senza ingiustificato ritardo e comunque entro 24 ore dal momento in cui ne ha conoscenza, fornendo le informazioni di cui all'Art. 33(3) GDPR" />
        <Bullet text="Assistere il Titolare, con misure tecniche e organizzative adeguate, nel dare seguito alle richieste degli interessati, inoltrandogli entro 5 giorni lavorativi ogni richiesta ricevuta direttamente e senza darvi autonomo riscontro" />
        <Bullet text="Assistere il Titolare nel rispetto degli obblighi di cui agli Artt. da 32 a 36 GDPR, inclusa la valutazione d'impatto sulla protezione dei dati" />
        <Bullet text="Mettere a disposizione del Titolare tutte le informazioni necessarie a dimostrare il rispetto dell'Art. 28 GDPR, consentendo e contribuendo ad audit e ispezioni condotti dal Titolare o da un incaricato, con preavviso di 15 giorni" />
        <Bullet text="Informare immediatamente il Titolare qualora ritenga che una sua istruzione violi il GDPR o altre disposizioni sulla protezione dei dati (Art. 28(3), secondo comma)" />
        <Text style={[styles.bodyText, { marginTop: 6 }]}>Il Titolare istruisce fin d'ora il Responsabile a gestire autonomamente, secondo il proprio giudizio tecnico, il materiale di lavorazione (immagini, appunti e file di lavoro) fino alla consegna del dispositivo, ivi compresa la sua eliminazione. Dalla consegna si applica il regime di conservazione dell'Art. 1.</Text>

        {/* ART. 4 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 4</Text> — Misure di Sicurezza (Art. 32 GDPR)</Text>
        <Text style={styles.bodyText}>Il Responsabile adotta le seguenti misure tecniche e organizzative:</Text>
        <Bullet text="Cifratura dei dati in transito e a riposo, garantita dalla piattaforma UÀ e dai suoi fornitori infrastrutturali (data center nell'Unione europea)" />
        <Bullet text="Accesso ai dati limitato al personale autorizzato, mediante controllo dei permessi per ruolo (RBAC)" />
        <Bullet text="Isolamento dei dati di ciascun laboratorio a livello di banca dati (Row Level Security)" />
        <Bullet text="Vincolo di riservatezza per tutte le persone autorizzate al trattamento" />
        <Bullet text="Backup gestiti dal fornitore infrastrutturale, con dati mantenuti in area UE" />
        <Bullet text="Registrazione delle operazioni di modifica sui dati di lavorazione" />
        <Text style={[styles.bodyText, { marginTop: 6 }]}>Le misure sopra elencate sono quelle effettivamente adottate alla data del presente accordo. Ogni misura ulteriore sarà dichiarata solo quando sarà operativa.</Text>

        {/* ART. 5 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 5</Text> — Sub-Responsabili</Text>
        <Text style={styles.bodyText}>
          Il Responsabile si avvale della piattaforma UÀ quale sub-responsabile per la gestione informatica dei dati trattati per conto del Titolare. UÀ si avvale a sua volta dei seguenti fornitori, quali ulteriori sub-responsabili:
        </Text>
        <Bullet text="Supabase Inc. — Banca dati, autenticazione e archiviazione dei file — data center nell'Unione europea" />
        <Bullet text="Vercel Inc. — Hosting dell'applicazione web — data center nell'Unione europea" />
        <Bullet text="Resend Inc. — Invio delle email transazionali — clausole contrattuali standard UE" />
        <Text style={[styles.bodyText, { marginTop: 4 }]}>Il Titolare autorizza in via generale il ricorso ai sub-responsabili elencati. Il Responsabile impone a ciascuno di essi, per contratto, obblighi di protezione dei dati equivalenti a quelli del presente accordo (Art. 28(4) GDPR) e risponde nei confronti del Titolare del loro operato. L'elenco aggiornato è disponibile su richiesta; ogni modifica è comunicata per iscritto entro 15 giorni dal momento in cui il Responsabile ne ha notizia, con facoltà del Titolare di opporsi con motivazione.</Text>
        <Text style={[styles.bodyText, { marginTop: 4 }]}>La trasmissione dei dati fiscali al Sistema di Interscambio (Agenzia delle Entrate) e le comunicazioni dovute al Ministero della Salute non costituiscono sub-responsabilità: quei soggetti agiscono come titolari autonomi in forza di un obbligo di legge (Art. 6(1)(c) GDPR).</Text>

        {/* ART. 6 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 6</Text> — Cancellazione e Conservazione</Text>
        <Text style={styles.bodyText}>
          Al termine del rapporto contrattuale il Responsabile, a scelta del Titolare da esercitarsi entro 30 giorni, cancella oppure restituisce i dati personali trattati per suo conto, cancellandone le copie esistenti (Art. 28(3)(g) GDPR).
        </Text>
        <Text style={styles.bodyText}>
          Fanno eccezione i dati compresi nella dichiarazione e nella documentazione che il Responsabile, quale fabbricante di dispositivi su misura, è tenuto a conservare o a mantenere disponibili ai sensi dell'Art. 10(5) e dell'Allegato XIII, punti 2 e 4, del Regolamento (UE) 2017/745, per i termini indicati all'Art. 1. Limitatamente a tali documenti il Responsabile può opporre alle richieste di cancellazione l'obbligo di legge di cui all'Art. 17(3)(b) GDPR, dandone conto al Titolare.
        </Text>

        {/* ART. 7 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 7</Text> — Ruoli delle Parti</Text>
        <Text style={styles.bodyText}>
          Le parti danno atto che, per i trattamenti connessi agli obblighi che il Regolamento (UE) 2017/745 pone direttamente in capo al fabbricante, il Responsabile agisce quale titolare autonomo del trattamento, e che le previsioni del presente accordo si applicano a tali trattamenti solo in quanto compatibili.
        </Text>

        {/* ART. 8 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 8</Text> — Legge Applicabile e Foro Competente</Text>
        <Text style={styles.bodyText}>Il presente accordo è regolato dal diritto italiano. Per qualsiasi controversia è competente il Foro del luogo della sede del Responsabile.</Text>

        {/* Firme */}
        <View style={styles.separatorLight} />
        <View style={styles.firmaRow}>
          <View style={styles.firmaBox}>
            <Text style={styles.firmaLabel}>Per il Titolare del Trattamento</Text>
            <Text style={[styles.firmaLabel, { marginTop: 2 }]}>{clienteNome}</Text>
            <Text style={[styles.firmaLabel, { marginTop: 20 }]}>Firma: _________________________</Text>
            <Text style={[styles.firmaLabel, { marginTop: 6 }]}>Data: ___/___/______</Text>
          </View>
          <View style={styles.firmaBox}>
            <Text style={styles.firmaLabel}>Per il Responsabile del Trattamento</Text>
            <Text style={[styles.firmaLabel, { marginTop: 2 }]}>{labNome}</Text>
            {lab.prrc_nome && <Text style={[styles.firmaLabel, { marginTop: 1 }]}>({lab.prrc_nome})</Text>}
            <Text style={[styles.firmaLabel, { marginTop: 20 }]}>Firma: _________________________</Text>
            <Text style={[styles.firmaLabel, { marginTop: 6 }]}>Data: ___/___/______</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            DPA n. {dpa.numero_dpa} — Accordo ex Art. 28 Reg. (UE) 2016/679 — Generato da UÀ il {data}
          </Text>
        </View>

      </Page>
    </Document>
  )
}

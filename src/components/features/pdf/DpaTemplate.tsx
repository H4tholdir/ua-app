// UÀ — DpaTemplate
// Accordo di Responsabile del Trattamento (DPA) — GDPR Art. 28
// Tra studio dentistico (Titolare) e laboratorio odontotecnico (Responsabile)

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
        <Bullet text="Redazione e archiviazione della Dichiarazione di Conformità (MDR Art. 52(8))" />
        <Bullet text="Gestione del Fascicolo Tecnico del dispositivo (MDR Art. 10(4))" />
        <Bullet text="Sorveglianza post-market e raccolta dati PMCF (se applicabile)" />
        <Text style={[styles.bodyText, { marginTop: 4 }]}>Il trattamento ha durata pari a quella del rapporto contrattuale tra le parti, con conservazione dei dati per almeno 10 anni dalla consegna di ciascun dispositivo, ai sensi dell'Art. 10(8) MDR.</Text>

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
        <Bullet text="Informare immediatamente il Titolare di qualsiasi violazione di dati personali (data breach) entro 24 ore dall'evento" />
        <Bullet text="Assistere il Titolare nel rispondere alle richieste degli interessati (accesso, rettifica, cancellazione — nel rispetto dei limiti MDR)" />
        <Bullet text="Cancellare o restituire tutti i dati al termine del rapporto, salvo obbligo di conservazione MDR 10 anni" />

        {/* ART. 4 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 4</Text> — Misure di Sicurezza (Art. 32 GDPR)</Text>
        <Text style={styles.bodyText}>Il Responsabile adotta le seguenti misure tecniche e organizzative:</Text>
        <Bullet text="Cifratura dei dati in transito (TLS 1.3) e a riposo (AES-256) tramite piattaforma UÀ / Supabase (EU-West)" />
        <Bullet text="Autenticazione a più fattori per l'accesso al sistema gestionale" />
        <Bullet text="Pseudonimizzazione dei dati paziente nel sistema informativo (GDPR Art. 25)" />
        <Bullet text="Accesso ai dati limitato al personale autorizzato (Role-Based Access Control)" />
        <Bullet text="Backup giornaliero con replica geografica in area UE" />
        <Bullet text="Log immutabile di tutti gli accessi ai dati sanitari" />

        {/* ART. 5 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 5</Text> — Sub-Responsabili</Text>
        <Text style={styles.bodyText}>
          Il Responsabile si avvale dei seguenti sub-responsabili per l'erogazione del servizio, previa garanzia di adeguate misure di protezione:
        </Text>
        <Bullet text="Supabase Inc. (BV) — Database e autenticazione — Server UE (Irlanda, Frankfurt)" />
        <Bullet text="Vercel Inc. — Hosting applicazione web — Server UE" />
        <Bullet text="Resend Inc. — Invio email transazionali — Standard Contracts EU" />
        <Text style={[styles.bodyText, { marginTop: 4 }]}>Il Titolare autorizza il ricorso ai sub-responsabili elencati. Il Responsabile notificherà per iscritto qualsiasi modifica all'elenco con almeno 15 giorni di anticipo.</Text>

        {/* ART. 6 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 6</Text> — Cancellazione e Conservazione</Text>
        <Text style={styles.bodyText}>
          Al termine del rapporto contrattuale, il Responsabile procederà alla cancellazione sicura dei dati, fatta eccezione per quelli soggetti all'obbligo di conservazione decennale ai sensi dell'Art. 10(8) MDR 2017/745, il quale prevale sul diritto all'oblio ex Art. 17 GDPR (Art. 17(3)(b) GDPR).
        </Text>

        {/* ART. 7 */}
        <View style={styles.separatorLight} />
        <Text style={styles.sectionTitle}><Text style={styles.articleNum}>Art. 7</Text> — Legge Applicabile e Foro Competente</Text>
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

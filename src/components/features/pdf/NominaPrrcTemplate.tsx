// UÀ — NominaPrrcTemplate
// Documento di Nomina PRRC ai sensi dell'Art. 15 MDR 2017/745
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    paddingTop: 48,
    paddingBottom: 60,
    paddingLeft: 56,
    paddingRight: 56,
  },
  // Header laboratorio
  header: {
    marginBottom: 20,
  },
  labNome: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    color: '#0f1e52',
  },
  labSub: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 2,
  },
  // Separatore
  separator: {
    borderBottom: '1pt solid #0f1e52',
    marginBottom: 20,
  },
  separatorLight: {
    borderBottom: '0.5pt solid #cccccc',
    marginBottom: 12,
  },
  // Titolo documento
  titoloWrapper: {
    alignItems: 'center',
    marginBottom: 6,
  },
  titolo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#0f1e52',
    textAlign: 'center',
  },
  titoloSub: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 20,
  },
  // Paragrafo introduttivo
  paragrafo: {
    fontSize: 10,
    color: '#1a1a1a',
    lineHeight: 1.6,
    marginBottom: 16,
  },
  paragrafoStrong: {
    fontFamily: 'Helvetica-Bold',
  },
  // Box dati PRRC
  prrcBox: {
    marginBottom: 20,
    padding: 12,
    borderLeft: '3pt solid #0f1e52',
  },
  prrcBoxTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#0f1e52',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 130,
    fontSize: 9,
    color: '#555555',
  },
  value: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  valueNormal: {
    flex: 1,
    fontSize: 9,
    color: '#1a1a1a',
  },
  // Sezione responsabilità
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#0f1e52',
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: '0.5pt solid #e0e4f0',
  },
  responsabilitaItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  responsabilitaLettera: {
    width: 20,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f1e52',
  },
  responsabilitaText: {
    flex: 1,
    fontSize: 9,
    color: '#333333',
    lineHeight: 1.4,
  },
  // Data nomina
  dataNominaSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  dataNominaText: {
    fontSize: 10,
    color: '#1a1a1a',
  },
  // Sezione firma
  firmeSection: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  firmaBlock: {
    width: 200,
  },
  firmaLabel: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 32,
  },
  firmaLinea: {
    borderBottom: '0.5pt solid #333333',
    marginBottom: 4,
  },
  firmaNome: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  firmaQualifica: {
    fontSize: 8,
    color: '#555555',
  },
  // Controfirma PRRC
  controfirmaSection: {
    marginTop: 24,
  },
  controfirmaTitolo: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f1e52',
    marginBottom: 4,
  },
  controfirmaText: {
    fontSize: 9,
    color: '#333333',
    lineHeight: 1.4,
    marginBottom: 16,
  },
  // Footer pagina
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#aaaaaa',
  },
})

// ─── Props ─────────────────────────────────────────────────────────────────

interface NominaPrrcTemplateProps {
  lab: {
    ragione_sociale?: string | null
    nome?: string
    indirizzo?: string | null
    cap?: string | null
    citta?: string | null
    provincia?: string | null
    partita_iva?: string | null
    codice_itca?: string | null
  }
  nominaPrrc: {
    prrc_nome: string
    prrc_cognome: string
    prrc_qualifica?: string | null
    prrc_numero_albo?: string | null
    data_nomina: string
    ha_accettato: boolean
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildIndirizzo(lab: NominaPrrcTemplateProps['lab']): string {
  return [lab.indirizzo, lab.cap, lab.citta, lab.provincia]
    .filter(Boolean)
    .join(', ') || ''
}

// ─── Responsabilita Art. 15(1) ─────────────────────────────────────────────

const RESPONSABILITA_ART15 = [
  {
    lettera: 'a)',
    testo:
      'garantire che la conformità dei dispositivi sia opportunamente verificata prima della loro immissione in commercio o messa in servizio, in conformità al sistema di gestione della qualità;',
  },
  {
    lettera: 'b)',
    testo:
      'assicurare che la documentazione tecnica e la dichiarazione di conformità UE siano redatte e tenute aggiornate;',
  },
  {
    lettera: 'c)',
    testo:
      'assicurare che siano rispettati gli obblighi di vigilanza, compresa la segnalazione di incidenti gravi alle autorità competenti;',
  },
  {
    lettera: 'd)',
    testo:
      'nel caso di indagini su un dispositivo: fornire, su richiesta delle autorità competenti, tutte le informazioni e la documentazione necessaria per dimostrare la conformità del dispositivo.',
  },
]

// ─── Component ─────────────────────────────────────────────────────────────

export function NominaPrrcTemplate({ lab, nominaPrrc }: NominaPrrcTemplateProps) {
  const labNome = lab.ragione_sociale ?? lab.nome ?? ''
  const indirizzo = buildIndirizzo(lab)
  const prrcNomeCompleto = [nominaPrrc.prrc_nome, nominaPrrc.prrc_cognome]
    .filter(Boolean)
    .join(' ')
    .trim() || '—'

  return (
    <Document
      title="Documento di Nomina PRRC"
      author={labNome}
      subject="Nomina PRRC ai sensi Art. 15 MDR 2017/745"
      keywords="PRRC MDR 2017/745 Art. 15 Nomina"
      creator="UA PWA"
    >
      <Page size="A4" style={styles.page}>

        {/* ── HEADER LAB ── */}
        <View style={styles.header}>
          <Text style={styles.labNome}>{labNome}</Text>
          {indirizzo ? <Text style={styles.labSub}>{indirizzo}</Text> : null}
          {lab.partita_iva ? (
            <Text style={styles.labSub}>P.IVA: {lab.partita_iva}</Text>
          ) : null}
          {lab.codice_itca ? (
            <Text style={styles.labSub}>Codice ITCA: {lab.codice_itca}</Text>
          ) : null}
        </View>

        <View style={styles.separator} />

        {/* ── TITOLO ── */}
        <View style={styles.titoloWrapper}>
          <Text style={styles.titolo}>
            Documento di Nomina
          </Text>
          <Text style={styles.titolo}>
            Persona Responsabile del Rispetto della Normativa (PRRC)
          </Text>
        </View>
        <Text style={styles.titoloSub}>
          Ai sensi dell&apos;Art. 15 del Regolamento (UE) 2017/745 del Parlamento Europeo e del Consiglio
        </Text>

        <View style={styles.separatorLight} />

        {/* ── PARAGRAFO INTRODUTTIVO ── */}
        <Text style={styles.paragrafo}>
          Con il presente atto,{' '}
          <Text style={styles.paragrafoStrong}>{labNome}</Text>
          , in qualità di fabbricante di dispositivi medici su misura ai sensi
          dell&apos;Art. 52(8) del Regolamento (UE) 2017/745, nomina quale Persona Responsabile
          del Rispetto della Normativa (PRRC) ai sensi dell&apos;Art. 15 del medesimo Regolamento:
        </Text>

        {/* ── BOX DATI PRRC ── */}
        <View style={styles.prrcBox}>
          <Text style={styles.prrcBoxTitle}>Dati della persona nominata</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Nome e Cognome:</Text>
            <Text style={styles.value}>{prrcNomeCompleto}</Text>
          </View>

          {nominaPrrc.prrc_qualifica ? (
            <View style={styles.row}>
              <Text style={styles.label}>Qualifica:</Text>
              <Text style={styles.value}>{nominaPrrc.prrc_qualifica}</Text>
            </View>
          ) : null}

          {nominaPrrc.prrc_numero_albo ? (
            <View style={styles.row}>
              <Text style={styles.label}>N. Albo/Registro:</Text>
              <Text style={styles.valueNormal}>{nominaPrrc.prrc_numero_albo}</Text>
            </View>
          ) : null}
        </View>

        {/* ── RESPONSABILITA ART. 15(1) ── */}
        <Text style={styles.sectionTitle}>
          Responsabilita ai sensi dell&apos;Art. 15(1) MDR 2017/745
        </Text>

        {RESPONSABILITA_ART15.map((item) => (
          <View key={item.lettera} style={styles.responsabilitaItem}>
            <Text style={styles.responsabilitaLettera}>{item.lettera}</Text>
            <Text style={styles.responsabilitaText}>{item.testo}</Text>
          </View>
        ))}

        {/* ── DATA NOMINA ── */}
        <View style={styles.dataNominaSection}>
          <Text style={styles.dataNominaText}>
            Data di nomina:{' '}
            <Text style={styles.paragrafoStrong}>{nominaPrrc.data_nomina}</Text>
          </Text>
        </View>

        {/* ── FIRMA TITOLARE ── */}
        <View style={styles.firmeSection}>
          <View style={styles.firmaBlock}>
            <Text style={styles.firmaLabel}>
              Il Titolare / Legale Rappresentante
            </Text>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaNome}>{labNome}</Text>
          </View>

          <View style={styles.firmaBlock}>
            <Text style={styles.firmaLabel}>
              Data e luogo
            </Text>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaQualifica}>
              {nominaPrrc.data_nomina}
            </Text>
          </View>
        </View>

        {/* ── CONTROFIRMA PRRC (se ha accettato) ── */}
        {nominaPrrc.ha_accettato ? (
          <View style={styles.controfirmaSection}>
            <View style={styles.separatorLight} />
            <Text style={styles.controfirmaTitolo}>
              Accettazione dell&apos;incarico da parte del PRRC
            </Text>
            <Text style={styles.controfirmaText}>
              Il/La sottoscritto/a {prrcNomeCompleto} dichiara di accettare
              la nomina a PRRC e di essere a conoscenza delle responsabilità
              conferite ai sensi dell&apos;Art. 15(1) del Regolamento (UE) 2017/745.
            </Text>
            <View style={styles.firmeSection}>
              <View style={styles.firmaBlock}>
                <Text style={styles.firmaLabel}>
                  Firma del PRRC
                </Text>
                <View style={styles.firmaLinea} />
                <Text style={styles.firmaNome}>{prrcNomeCompleto}</Text>
                {nominaPrrc.prrc_qualifica ? (
                  <Text style={styles.firmaQualifica}>
                    {nominaPrrc.prrc_qualifica}
                  </Text>
                ) : null}
              </View>

              <View style={styles.firmaBlock}>
                <Text style={styles.firmaLabel}>Data accettazione</Text>
                <View style={styles.firmaLinea} />
              </View>
            </View>
          </View>
        ) : null}

        {/* ── FOOTER ── */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerText}>
            Documento generato ai sensi dell&apos;Art. 15 Reg. UE 2017/745
          </Text>
          <Text style={styles.footerText}>
            {labNome} — {nominaPrrc.data_nomina}
          </Text>
        </View>

      </Page>
    </Document>
  )
}

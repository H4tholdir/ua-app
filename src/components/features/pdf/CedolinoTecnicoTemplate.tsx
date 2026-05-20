// UÀ — CedolinoTecnicoTemplate
// Riepilogo compensi maturati per il tecnico (documento interno non fiscale)
// SOLO Helvetica/Helvetica-Bold — MAI altre font in PDF

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatEur(v: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(v)
}

function meseLabel(mese: string): string {
  const MESI = [
    'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
  ]
  const [year, m] = mese.split('-').map(Number)
  return `${MESI[m - 1] ?? mese} ${year}`
}

function ultimoGiornoMese(mese: string): number {
  const [year, m] = mese.split('-').map(Number)
  return new Date(year, m, 0).getDate()
}

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
    color: '#1a1a1a',
  },
  labSub: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 2,
  },
  separator: {
    borderBottom: '1pt solid #1a1a1a',
    marginBottom: 20,
  },
  separatorLight: {
    borderBottom: '0.5pt solid #cccccc',
    marginBottom: 12,
  },
  // Titolo
  titoloWrapper: {
    alignItems: 'center',
    marginBottom: 4,
  },
  titolo: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  titoloSub: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 20,
  },
  // Dati tecnico
  datiBox: {
    marginBottom: 20,
  },
  datiRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  datiLabel: {
    width: 80,
    fontSize: 9,
    color: '#555555',
  },
  datiValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  // Tabella
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #1a1a1a',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingTop: 5,
    paddingBottom: 5,
    borderBottom: '0.5pt solid #eeeeee',
  },
  colPrestazione: {
    flex: 3,
    fontSize: 9,
    color: '#1a1a1a',
  },
  colQta: {
    width: 40,
    fontSize: 9,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  colComp: {
    width: 70,
    fontSize: 9,
    color: '#1a1a1a',
    textAlign: 'right',
  },
  colTotale: {
    width: 70,
    fontSize: 9,
    color: '#1a1a1a',
    textAlign: 'right',
  },
  colPrestazioneH: {
    flex: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
  },
  colQtaH: {
    width: 40,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  colCompH: {
    width: 70,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  colTotaleH: {
    width: 70,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  // Riga totale
  totaleRow: {
    flexDirection: 'row',
    borderTop: '1pt solid #1a1a1a',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 24,
  },
  totaleLabelStyle: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  totaleValore: {
    width: 70,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  // Nota legale
  notaLegale: {
    marginBottom: 24,
    padding: 10,
    borderLeft: '2pt solid #cccccc',
  },
  notaLegaleText: {
    fontSize: 8,
    color: '#777777',
    lineHeight: 1.5,
  },
  // Firma
  firmeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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
  // Footer
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

// ─── Props ────────────────────────────────────────────────────────────────

export interface LavorazioneCedolino {
  nome_lavorazione: string
  quantita: number
  compenso_unitario: number
  compenso_totale: number
}

export interface LabCedolino {
  ragione_sociale?: string | null
  nome?: string | null
  indirizzo?: string | null
  cap?: string | null
  citta?: string | null
  provincia?: string | null
  codice_itca?: string | null
  titolare_nome?: string | null
}

export interface CedolinoTecnicoTemplateProps {
  tecnico: { nome: string; cognome: string }
  lab: LabCedolino
  mese: string            // es. "2026-05"
  lavorazioni: LavorazioneCedolino[]
  totale: number
}

// ─── Component ─────────────────────────────────────────────────────────────

export function CedolinoTecnicoTemplate({
  tecnico,
  lab,
  mese,
  lavorazioni,
  totale,
}: CedolinoTecnicoTemplateProps) {
  const labNome = lab.ragione_sociale ?? lab.nome ?? ''
  const indirizzo = [lab.indirizzo, lab.cap, lab.citta, lab.provincia]
    .filter(Boolean)
    .join(', ')

  const meseLabelStr = meseLabel(mese)
  const [yyyyStr, mmStr] = mese.split('-')
  const yyyy = parseInt(yyyyStr, 10)
  const mm = parseInt(mmStr, 10)
  const lastDay = ultimoGiornoMese(mese)

  return (
    <Document
      title={`Riepilogo Compensi — ${tecnico.cognome} ${tecnico.nome} — ${meseLabelStr}`}
      author={labNome}
      subject="Documento interno compensi tecnico"
      creator="UA PWA"
    >
      <Page size="A4" style={styles.page}>

        {/* ── HEADER LAB ── */}
        <View style={styles.header}>
          <Text style={styles.labNome}>{labNome}</Text>
          {lab.codice_itca ? (
            <Text style={styles.labSub}>Codice ITCA: {lab.codice_itca}</Text>
          ) : null}
          {indirizzo ? <Text style={styles.labSub}>{indirizzo}</Text> : null}
        </View>

        <View style={styles.separator} />

        {/* ── TITOLO ── */}
        <View style={styles.titoloWrapper}>
          <Text style={styles.titolo}>Riepilogo Compensi Maturati</Text>
        </View>
        <Text style={styles.titoloSub}>
          {meseLabelStr} — Documento interno non fiscale
        </Text>

        <View style={styles.separatorLight} />

        {/* ── DATI TECNICO ── */}
        <View style={styles.datiBox}>
          <View style={styles.datiRow}>
            <Text style={styles.datiLabel}>Tecnico:</Text>
            <Text style={styles.datiValue}>{tecnico.nome} {tecnico.cognome}</Text>
          </View>
          <View style={styles.datiRow}>
            <Text style={styles.datiLabel}>Periodo:</Text>
            <Text style={styles.datiValue}>
              1 – {lastDay} {meseLabel(`${yyyy}-${String(mm).padStart(2, '0')}`)}
            </Text>
          </View>
        </View>

        {/* ── TABELLA LAVORAZIONI ── */}
        <View style={styles.tableHeader} fixed>
          <Text style={styles.colPrestazioneH}>Prestazione</Text>
          <Text style={styles.colQtaH}>Q.tà</Text>
          <Text style={styles.colCompH}>Comp./pz</Text>
          <Text style={styles.colTotaleH}>Totale</Text>
        </View>

        {lavorazioni.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={{ ...styles.colPrestazione, color: '#999999' }}>
              Nessuna lavorazione con compenso configurato
            </Text>
          </View>
        ) : (
          lavorazioni.map((lav, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colPrestazione}>{lav.nome_lavorazione}</Text>
              <Text style={styles.colQta}>{lav.quantita}</Text>
              <Text style={styles.colComp}>{formatEur(lav.compenso_unitario)}</Text>
              <Text style={styles.colTotale}>{formatEur(lav.compenso_totale)}</Text>
            </View>
          ))
        )}

        {/* ── TOTALE ── */}
        <View style={styles.totaleRow}>
          <Text style={styles.totaleLabelStyle}>Totale compenso maturato:</Text>
          <Text style={styles.totaleValore}>{formatEur(totale)}</Text>
        </View>

        {/* ── NOTA LEGALE ── */}
        <View style={styles.notaLegale}>
          <Text style={styles.notaLegaleText}>
            Il presente documento è un riepilogo informale dei compensi per cottimo.
            Non costituisce busta paga né documento fiscale. Non ha valore ai fini previdenziali o contributivi.
            Conservare per uso interno del laboratorio.
          </Text>
        </View>

        {/* ── FIRMA TITOLARE ── */}
        <View style={styles.firmeSection}>
          <View style={styles.firmaBlock}>
            <Text style={styles.firmaLabel}>
              Firma del Titolare / Responsabile
            </Text>
            <View style={styles.firmaLinea} />
            {lab.titolare_nome ? (
              <Text style={styles.firmaNome}>{lab.titolare_nome}</Text>
            ) : (
              <Text style={styles.firmaNome}>{labNome}</Text>
            )}
          </View>

          <View style={styles.firmaBlock}>
            <Text style={styles.firmaLabel}>Data</Text>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaLabel}>___/___/______</Text>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerText}>
            Documento interno — {labNome}
          </Text>
          <Text style={styles.footerText}>
            {tecnico.cognome} {tecnico.nome} — {meseLabelStr}
          </Text>
        </View>

      </Page>
    </Document>
  )
}

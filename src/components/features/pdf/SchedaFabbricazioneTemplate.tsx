// UÀ — SchedaFabbricazioneTemplate
// Registro tracciabilità fasi di lavorazione — documento interno QMS
// Art. 10(9) MDR 2017/745 — NON un output richiesto da Allegato XIII
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { LavoroDettaglio, Laboratorio, LavoroFase } from '@/types/domain'

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 28,
    paddingBottom: 40,
    paddingLeft: 36,
    paddingRight: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1pt solid #cccccc',
  },
  headerLeft: {
    flex: 1,
  },
  labNome: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  headerMeta: {
    fontSize: 7.5,
    color: '#555555',
    marginBottom: 1,
  },
  titoloPrinc: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 3,
    marginTop: 8,
  },
  sottotitolo: {
    fontSize: 8,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  fieldLabel: {
    width: 110,
    fontSize: 8,
    color: '#888888',
  },
  fieldValue: {
    flex: 1,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  // Tabella fasi
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #1a1a1a',
    paddingBottom: 4,
    marginTop: 10,
    marginBottom: 4,
  },
  colCodiceH: {
    flex: 2,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
  },
  colEsitoH: {
    width: 70,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
  },
  colOperatoreH: {
    flex: 1.5,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
  },
  colDataH: {
    width: 75,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingTop: 5,
    paddingBottom: 5,
    borderBottom: '0.5pt solid #eeeeee',
  },
  colCodice: {
    flex: 2,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  colCodiceDescr: {
    fontSize: 7.5,
    color: '#888888',
    marginTop: 1,
  },
  colEsito: {
    width: 70,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  colEsitoNonConforme: {
    width: 70,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#B91C1C',
  },
  colOperatore: {
    flex: 1.5,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  colData: {
    width: 75,
    fontSize: 8,
    color: '#1a1a1a',
  },
  azioneCorrettivaRow: {
    paddingTop: 2,
    paddingBottom: 4,
    paddingLeft: 4,
    borderBottom: '0.5pt solid #eeeeee',
  },
  azioneCorrettivaLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#B91C1C',
  },
  azioneCorrettivaText: {
    fontSize: 7.5,
    color: '#555555',
    lineHeight: 1.3,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: '0.5pt solid #cccccc',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: '#888888',
    lineHeight: 1.3,
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDataOra(isoString: string | null): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function esitoLabel(fase: LavoroFase): string {
  if (!fase.eseguita_at) return 'In attesa'
  if (fase.esito === 'ok') return 'OK'
  if (fase.esito === 'non_conforme') return 'Non conforme'
  if (fase.esito === 'parziale') return 'Parziale'
  return '—'
}

function operatoreLabel(fase: LavoroFase): string {
  if (!fase.tecnico) return '—'
  return `${fase.tecnico.nome} ${fase.tecnico.cognome}`
}

function labIndirizzoCompleto(lab: Laboratorio): string {
  const parts = [lab.indirizzo, lab.cap, lab.citta, lab.provincia].filter(Boolean)
  return parts.join(', ') || '—'
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface SchedaFabbricazioneTemplateProps {
  lavoro: LavoroDettaglio
  lab: Laboratorio
}

// ─── Component ─────────────────────────────────────────────────────────────

export function SchedaFabbricazioneTemplate({ lavoro, lab }: SchedaFabbricazioneTemplateProps) {
  const dataEmissione = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const labNome = lab.ragione_sociale ?? lab.nome
  const tipoFormatted = lavoro.tipo_dispositivo.replace(/_/g, ' ')
  const fasiOrdinate = [...lavoro.fasi].sort((a, b) => a.fase.ordine - b.fase.ordine)

  return (
    <Document
      title={`Scheda di Fabbricazione ${lavoro.numero_lavoro}`}
      creator="UA PWA"
      subject="Registro tracciabilità fasi di lavorazione — documento interno"
    >
      <Page size="A4" style={styles.page}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.labNome}>{labNome}</Text>
            {lab.codice_itca && (
              <Text style={styles.headerMeta}>ITCA: {lab.codice_itca}</Text>
            )}
            <Text style={styles.headerMeta}>{labIndirizzoCompleto(lab)}</Text>
          </View>
        </View>

        {/* ── TITOLO ── */}
        <Text style={styles.titoloPrinc}>SCHEDA DI FABBRICAZIONE</Text>
        <Text style={styles.sottotitolo}>
          Registro tracciabilità fasi di lavorazione — documento interno,
          parte del Fascicolo Tecnico (Art. 10(9) MDR 2017/745)
        </Text>

        {/* ── IDENTIFICAZIONE LAVORO ── */}
        <Text style={styles.sectionTitle}>Identificazione Lavoro</Text>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Numero lavoro:</Text>
          <Text style={styles.fieldValue}>{lavoro.numero_lavoro}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Tipo dispositivo:</Text>
          <Text style={styles.fieldValue}>{tipoFormatted}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Descrizione:</Text>
          <Text style={styles.fieldValue}>{lavoro.descrizione}</Text>
        </View>

        {/* ── TABELLA FASI ── */}
        <Text style={styles.sectionTitle}>Fasi di Lavorazione</Text>
        <View style={styles.tableHeader} fixed>
          <Text style={styles.colCodiceH}>Fase</Text>
          <Text style={styles.colEsitoH}>Esito</Text>
          <Text style={styles.colOperatoreH}>Operatore</Text>
          <Text style={styles.colDataH}>Data/ora</Text>
        </View>

        {fasiOrdinate.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={{ ...styles.colCodice, color: '#999999' }}>
              Nessuna fase configurata per questo lavoro
            </Text>
          </View>
        ) : (
          fasiOrdinate.map((f) => (
            <View key={f.id}>
              <View style={styles.tableRow}>
                <View style={styles.colCodice}>
                  <Text>{f.fase.codice_fase}</Text>
                  <Text style={styles.colCodiceDescr}>{f.fase.descrizione}</Text>
                </View>
                <Text style={f.non_conforme ? styles.colEsitoNonConforme : styles.colEsito}>
                  {esitoLabel(f)}
                </Text>
                <Text style={styles.colOperatore}>{operatoreLabel(f)}</Text>
                <Text style={styles.colData}>{formatDataOra(f.eseguita_at)}</Text>
              </View>
              {f.non_conforme && f.azione_correttiva && (
                <View style={styles.azioneCorrettivaRow}>
                  <Text style={styles.azioneCorrettivaLabel}>Azione correttiva: </Text>
                  <Text style={styles.azioneCorrettivaText}>{f.azione_correttiva}</Text>
                </View>
              )}
            </View>
          ))
        )}

        {/* ── FOOTER ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Emesso da: {labNome}
            {lab.codice_itca ? ` — ITCA ${lab.codice_itca}` : ''} — {dataEmissione}
          </Text>
          <Text style={styles.footerText}>
            Documento interno di tracciabilità QMS — Art. 10(9) MDR 2017/745.
            Non costituisce Dichiarazione di Conformità né documento consegnato al paziente/prescrittore.
          </Text>
        </View>

      </Page>
    </Document>
  )
}

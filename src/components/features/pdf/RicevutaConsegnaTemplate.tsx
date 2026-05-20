// UÀ — RicevutaConsegnaTemplate
// Dichiarazione di Avvenuta Consegna — MDR Allegato XIII §2.3 + prassi ANTLO
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 32,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
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
  // Titolo principale
  titoloPrinc: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 3,
    marginTop: 10,
    lineHeight: 1.3,
  },
  sottotitolo: {
    fontSize: 8,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 14,
  },
  // Sezioni
  sectionBox: {
    border: '0.5pt solid #cccccc',
    borderRadius: 2,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  para: {
    fontSize: 8.5,
    color: '#1a1a1a',
    lineHeight: 1.45,
    marginBottom: 6,
  },
  // Righe campo-valore
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
  fieldValueBold: {
    flex: 1,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  // Checklist consegnati
  checklistTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginTop: 6,
    marginBottom: 4,
  },
  checkRow: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  checkBox: {
    width: 14,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  checkText: {
    flex: 1,
    fontSize: 8.5,
    color: '#1a1a1a',
    lineHeight: 1.3,
  },
  // Spazio firma
  firmaContainer: {
    marginTop: 12,
  },
  firmaLabel: {
    fontSize: 8.5,
    color: '#1a1a1a',
    lineHeight: 1.6,
    marginBottom: 4,
  },
  firmaLine: {
    borderBottom: '0.5pt solid #1a1a1a',
    marginTop: 24,
    marginBottom: 4,
    width: 200,
  },
  firmaCaption: {
    fontSize: 7.5,
    color: '#888888',
  },
  // Nota conservazione
  notaConservazione: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '0.5pt solid #cccccc',
    fontSize: 7.5,
    color: '#888888',
    lineHeight: 1.3,
    fontFamily: 'Helvetica',
    fontStyle: 'italic',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTop: '0.5pt solid #cccccc',
    paddingTop: 5,
  },
  footerText: {
    fontSize: 7,
    color: '#888888',
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatData(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return isoString
  }
}

function codiceGDPR(lavoro: LavoroDettaglio): string {
  if (lavoro.paziente?.codice_paziente) return `PAZ-${lavoro.paziente.codice_paziente}`
  if (lavoro.paziente) {
    const iniziale = lavoro.paziente.nome ? lavoro.paziente.nome.charAt(0).toUpperCase() + '.' : ''
    const cognome = lavoro.paziente.cognome ?? ''
    if (iniziale || cognome) return `${iniziale} ${cognome}`.trim()
  }
  if (lavoro.paziente_nome_snapshot) {
    const parts = lavoro.paziente_nome_snapshot.split(' ')
    if (parts.length > 1) return `${parts[0].charAt(0).toUpperCase()}. ${parts.slice(1).join(' ')}`
    return lavoro.paziente_nome_snapshot
  }
  return 'N.A. (GDPR)'
}

function materialiString(lavoro: LavoroDettaglio): string {
  if (!lavoro.materiali?.length) return '—'
  return lavoro.materiali
    .map((m) => m.nome_materiale_snapshot)
    .filter(Boolean)
    .slice(0, 5)
    .join(', ')
}

function labIndirizzoCompleto(lab: Laboratorio): string {
  const parts = [lab.indirizzo, lab.cap, lab.citta, lab.provincia].filter(Boolean)
  return parts.join(', ') || '—'
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface RicevutaConsegnaTemplateProps {
  lavoro: LavoroDettaglio
  lab: Laboratorio
}

// ─── Component ─────────────────────────────────────────────────────────────

export function RicevutaConsegnaTemplate({ lavoro, lab }: RicevutaConsegnaTemplateProps) {
  const dataEmissione = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const labNome = lab.ragione_sociale ?? lab.nome
  const tipoFormatted = lavoro.tipo_dispositivo.replace(/_/g, ' ')
  const dataConsegna = formatData(
    lavoro.data_consegna_effettiva ?? lavoro.data_consegna_prevista
  )
  const studioCliente =
    lavoro.cliente?.studio_nome ??
    (`${lavoro.cliente?.cognome ?? ''} ${lavoro.cliente?.nome ?? ''}`.trim() || '—')

  return (
    <Document
      title={`Ricevuta Consegna ${lavoro.numero_lavoro}`}
      creator="UA PWA"
      subject="Dichiarazione di Avvenuta Consegna — MDR 2017/745 Allegato XIII"
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
        <Text style={styles.titoloPrinc}>
          DICHIARAZIONE DI AVVENUTA CONSEGNA{'\n'}DISPOSITIVO MEDICO SU MISURA
        </Text>
        <Text style={styles.sottotitolo}>
          ai sensi del Reg. (UE) 2017/745 — Allegato XIII
        </Text>

        {/* ── SEZIONE A — IL FABBRICANTE DICHIARA ── */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Sezione A — Il Fabbricante Dichiara</Text>

          <Text style={styles.para}>
            Il laboratorio {labNome}, con sede in {labIndirizzoCompleto(lab)},
            {lab.codice_itca ? ` iscritto all'elenco ITCA con numero ${lab.codice_itca},` : ''}
            {' '}ha consegnato in data {dataConsegna} il seguente Dispositivo Medico Su Misura:
          </Text>

          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Tipo dispositivo:</Text>
            <Text style={styles.fieldValueBold}>{tipoFormatted}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Descrizione:</Text>
            <Text style={styles.fieldValue}>{lavoro.descrizione}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Numero ordine:</Text>
            <Text style={styles.fieldValue}>{lavoro.numero_lavoro}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Paziente (cod. GDPR):</Text>
            <Text style={styles.fieldValue}>{codiceGDPR(lavoro)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Materiali principali:</Text>
            <Text style={styles.fieldValue}>{materialiString(lavoro)}</Text>
          </View>

          <Text style={styles.checklistTitle}>
            Insieme al dispositivo sono stati consegnati:
          </Text>

          <View style={styles.checkRow}>
            <Text style={styles.checkBox}>[x]</Text>
            <Text style={styles.checkText}>
              Dichiarazione di Conformità (DdC) — Allegato XIII MDR 2017/745
            </Text>
          </View>
          <View style={styles.checkRow}>
            <Text style={styles.checkBox}>[x]</Text>
            <Text style={styles.checkText}>
              {"Istruzioni per l'Uso (IFU)"}
</Text>
          </View>
          <View style={styles.checkRow}>
            <Text style={styles.checkBox}>[x]</Text>
            <Text style={styles.checkText}>
              Etichetta dispositivo
            </Text>
          </View>
        </View>

        {/* ── SEZIONE B — IL PRESCRITTORE DICHIARA ── */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Sezione B — Il Prescrittore Dichiara</Text>

          <Text style={styles.para}>
            Il/La sottoscritto/a Dott./Dott.ssa ___________________________,
            esercente la professione odontoiatrica presso {studioCliente},
            DICHIARA di aver ricevuto il dispositivo e la documentazione sopra indicata
            {`e di aver informato il paziente delle modalità d'uso e delle avvertenze`}
            {`contenute nelle Istruzioni per l'Uso.`}
          </Text>

          <View style={styles.firmaContainer}>
            <Text style={styles.firmaLabel}>
              Luogo e data: _________________________ , ___/___/______
            </Text>

            <View style={styles.firmaLine} />
            <Text style={styles.firmaCaption}>
              Firma e timbro del prescrittore
            </Text>
          </View>
        </View>

        {/* ── NOTA CONSERVAZIONE ── */}
        <Text style={styles.notaConservazione}>
          Il presente documento deve essere conservato per almeno 15 anni dalla
          data di consegna, ai sensi del Reg. (UE) 2017/745.
        </Text>

        {/* ── FOOTER ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Emesso da: {labNome}
            {lab.codice_itca ? ` — ITCA ${lab.codice_itca}` : ''} — {dataEmissione} —
            Documento ai sensi Allegato XIII MDR 2017/745
          </Text>
        </View>

      </Page>
    </Document>
  )
}

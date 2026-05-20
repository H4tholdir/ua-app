// UÀ — IFUTemplate
// Istruzioni per l'Uso — MDR Allegato I §23.4 — formato A4 portrait
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 36,
    paddingRight: 36,
  },
  // Header
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
  headerRight: {
    textAlign: 'right',
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
  // Titolo
  titoloPrinc: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 3,
    marginTop: 8,
  },
  sottotitoloTitolo: {
    fontSize: 8.5,
    textAlign: 'center',
    color: '#555555',
    marginBottom: 10,
  },
  separatore: {
    borderBottom: '0.5pt solid #cccccc',
    marginBottom: 8,
  },
  // Sezioni
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
    marginTop: 8,
  },
  sectionFirstTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
    marginTop: 0,
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
  // Testo paragrafo
  para: {
    fontSize: 8.5,
    color: '#1a1a1a',
    lineHeight: 1.45,
    marginBottom: 4,
  },
  // Lista puntata
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bulletDot: {
    width: 12,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  bulletText: {
    flex: 1,
    fontSize: 8.5,
    color: '#1a1a1a',
    lineHeight: 1.4,
  },
  // Warning rischi residui
  warningRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  warningIcon: {
    width: 16,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  warningText: {
    flex: 1,
    fontSize: 8.5,
    color: '#1a1a1a',
    lineHeight: 1.4,
  },
  // Footer
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
  // Codice anonimizzato GDPR — NO nome reale
  if (lavoro.paziente?.codice_paziente) return `PAZ-${lavoro.paziente.codice_paziente}`
  if (lavoro.paziente) {
    const iniziale = lavoro.paziente.nome ? lavoro.paziente.nome.charAt(0).toUpperCase() + '.' : ''
    const cognome = lavoro.paziente.cognome ?? ''
    if (iniziale || cognome) return `${iniziale} ${cognome}`.trim()
  }
  if (lavoro.paziente_nome_snapshot) {
    // Mostra solo prima iniziale + cognome (anonimizzazione parziale)
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

interface IFUTemplateProps {
  lavoro: LavoroDettaglio
  lab: Laboratorio
}

// ─── Component ─────────────────────────────────────────────────────────────

export function IFUTemplate({ lavoro, lab }: IFUTemplateProps) {
  const dataEmissione = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const labNome = lab.ragione_sociale ?? lab.nome
  const tipoFormatted = lavoro.tipo_dispositivo.replace(/_/g, ' ')
  const dataFabbricazione = formatData(
    lavoro.data_consegna_effettiva ?? lavoro.data_consegna_prevista
  )

  return (
    <Document
      title={`IFU ${lavoro.numero_lavoro}`}
      creator="UA PWA"
      subject="Istruzioni per l'Uso — MDR 2017/745"
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
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>N. ordine: {lavoro.numero_lavoro}</Text>
            <Text style={styles.headerMeta}>Data emissione: {dataEmissione}</Text>
          </View>
        </View>

        {/* ── TITOLO ── */}
        <Text style={styles.titoloPrinc}>ISTRUZIONI PER L&apos;USO</Text>
        <Text style={styles.sottotitoloTitolo}>
          Dispositivo Medico Su Misura — Art. 10 MDR 2017/745
        </Text>
        <View style={styles.separatore} />

        {/* ── 1. IDENTIFICAZIONE DISPOSITIVO ── */}
        <Text style={styles.sectionFirstTitle}>1. Identificazione del Dispositivo</Text>

        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Paziente (cod. GDPR):</Text>
          <Text style={styles.fieldValue}>{codiceGDPR(lavoro)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Tipo dispositivo:</Text>
          <Text style={styles.fieldValue}>{tipoFormatted}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Descrizione:</Text>
          <Text style={styles.fieldValue}>{lavoro.descrizione}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Materiali:</Text>
          <Text style={styles.fieldValue}>{materialiString(lavoro)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Data fabbricazione:</Text>
          <Text style={styles.fieldValue}>{dataFabbricazione}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Numero ordine:</Text>
          <Text style={styles.fieldValue}>{lavoro.numero_lavoro}</Text>
        </View>

        {/* ── 2. DESTINAZIONE D'USO ── */}
        <Text style={styles.sectionTitle}>2. Destinazione d&apos;Uso</Text>
        <Text style={styles.para}>
          Il presente dispositivo protesico su misura è destinato all&apos;utilizzo
          esclusivo del paziente identificato, su prescrizione del professionista
          odontoiatra. Non è destinato alla rivendita né all&apos;uso su terzi.
        </Text>

        {/* ── 3. ISTRUZIONI DI UTILIZZO ── */}
        <Text style={styles.sectionTitle}>3. Istruzioni di Utilizzo</Text>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>
            Seguire le istruzioni del professionista prescrittore
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>
            Indossare/inserire come indicato dall&apos;odontoiatra curante
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>
            In caso di dolore, disagio o alterazioni del fit, consultare immediatamente
            il professionista
          </Text>
        </View>

        {/* ── 4. PULIZIA E MANUTENZIONE ── */}
        <Text style={styles.sectionTitle}>4. Pulizia e Manutenzione</Text>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>
            Pulire con acqua tiepida e spazzolino morbido dopo ogni pasto
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>
            Non utilizzare detergenti abrasivi, solventi acetone o acqua ossigenata
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>
            Per protesi rimovibili: rimuovere la notte e conservare in acqua pulita
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>
            Controlli periodici consigliati ogni 6-12 mesi
          </Text>
        </View>

        {/* ── 5. CONTROINDICAZIONI E AVVERTENZE ── */}
        <Text style={styles.sectionTitle}>5. Controindicazioni e Avvertenze</Text>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>
            Informare il professionista in caso di allergie ai materiali dentali
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>
            Non modificare o riparare autonomamente il dispositivo
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletDot}>-</Text>
          <Text style={styles.bulletText}>
            Tenere fuori dalla portata dei bambini (rischio soffocamento)
          </Text>
        </View>

        {/* ── 6. RISCHI RESIDUI ── */}
        <Text style={styles.sectionTitle}>
          6. Rischi Residui (MDR Art. 10(11)(d))
        </Text>
        <Text style={styles.para}>
          I seguenti rischi non eliminabili sono stati identificati e minimizzati:
        </Text>
        <View style={styles.warningRow}>
          <Text style={styles.warningIcon}>!</Text>
          <Text style={styles.warningText}>
            Reazione di ipersensibilità/allergia ai materiali (es. nichel, acrilici)
          </Text>
        </View>
        <View style={styles.warningRow}>
          <Text style={styles.warningIcon}>!</Text>
          <Text style={styles.warningText}>
            Rischio di frattura per sovraccarico occlusale eccessivo
          </Text>
        </View>
        <View style={styles.warningRow}>
          <Text style={styles.warningIcon}>!</Text>
          <Text style={styles.warningText}>
            Usura fisiologica del dispositivo nel tempo
          </Text>
        </View>
        <View style={styles.warningRow}>
          <Text style={styles.warningIcon}>!</Text>
          <Text style={styles.warningText}>
            Variazione morfologica per riassorbimento osseo (protesi rimovibili)
          </Text>
        </View>

        {/* ── 7. DURATA DI VITA ── */}
        <Text style={styles.sectionTitle}>7. Durata di Vita e Follow-Up</Text>
        <Text style={styles.para}>
          La durata di vita attesa dipende dalla tipologia, dai materiali e
          dall&apos;uso. Controlli periodici con il prescrittore sono raccomandati.
        </Text>

        {/* ── 8. SEGNALAZIONE INCIDENTI ── */}
        <Text style={styles.sectionTitle}>8. Segnalazione Incidenti</Text>
        <Text style={styles.para}>
          In caso di incidente grave correlato all&apos;uso del dispositivo,
          comunicare al fabbricante e all&apos;Autorità Competente italiana (AIFA/ISS).
        </Text>

        {/* ── FOOTER ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Emesso da: {labNome}
            {lab.codice_itca ? ` — ITCA ${lab.codice_itca}` : ''} — {dataEmissione}
          </Text>
          <Text style={styles.footerText}>
            Versione 1.0 — Documento riservato al paziente e al prescrittore
          </Text>
        </View>

      </Page>
    </Document>
  )
}

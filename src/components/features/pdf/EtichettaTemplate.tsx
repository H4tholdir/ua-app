// UÀ — EtichettaTemplate
// Etichetta MDR Art. 20(1) — formato 100x50mm (A8 custom)
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1a1a1a',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
  },
  labNome: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    color: '#0f1e52',
  },
  separatorTop: {
    borderBottom: '0.5pt solid #cccccc',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    width: 60,
    fontSize: 7,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    flex: 1,
    fontSize: 8,
    color: '#1a1a1a',
  },
  valueBold: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  separatorBottom: {
    borderTop: '0.5pt solid #cccccc',
    marginTop: 5,
    paddingTop: 4,
  },
  disclaimer: {
    fontSize: 6.5,
    color: '#555555',
    lineHeight: 1.3,
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDataBreve(isoString: string | null | undefined): string {
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

function inizialeCognomePaziente(lavoro: LavoroDettaglio): string {
  const snap = lavoro.paziente_nome_snapshot
  if (snap) return snap
  const paz = lavoro.paziente
  if (!paz) return '—'
  const cognome = paz.cognome ?? ''
  const inizialeNome = paz.nome ? paz.nome.charAt(0).toUpperCase() + '.' : ''
  return [inizialeNome, cognome].filter(Boolean).join(' ') || '—'
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface EtichettaTemplateProps {
  lavoro: LavoroDettaglio
  lab: Laboratorio
}

// ─── Component ─────────────────────────────────────────────────────────────

export function EtichettaTemplate({ lavoro, lab }: EtichettaTemplateProps) {
  const primoMateriale = lavoro.materiali?.[0] ?? null
  const tipoFormatted = lavoro.tipo_dispositivo.replace(/_/g, ' ')

  return (
    <Document
      title={`Etichetta ${lavoro.numero_lavoro}`}
      creator="UA PWA"
    >
      <Page
        size={{ width: 283.46, height: 141.73 }}
        style={styles.page}
      >

        {/* ── LAB NOME ── */}
        <Text style={styles.labNome}>
          {lab.ragione_sociale ?? lab.nome}
        </Text>

        <View style={styles.separatorTop} />

        {/* ── PAZIENTE ── */}
        <View style={styles.row}>
          <Text style={styles.label}>Paziente</Text>
          <Text style={styles.valueBold}>{inizialeCognomePaziente(lavoro)}</Text>
        </View>

        {/* ── TIPO DISPOSITIVO ── */}
        <View style={styles.row}>
          <Text style={styles.label}>Dispositivo</Text>
          <Text style={styles.value}>{tipoFormatted}</Text>
        </View>

        {/* ── DATA PRODUZIONE ── */}
        <View style={styles.row}>
          <Text style={styles.label}>Produzione</Text>
          <Text style={styles.value}>
            {formatDataBreve(lavoro.data_consegna_effettiva ?? lavoro.data_consegna_prevista)}
          </Text>
        </View>

        {/* ── LOTTO (primo materiale) ── */}
        {primoMateriale ? (
          <View style={styles.row}>
            <Text style={styles.label}>Lotto</Text>
            <Text style={styles.value}>{primoMateriale.numero_lotto_snapshot}</Text>
          </View>
        ) : null}

        {/* ── DISCLAIMER MDR ── */}
        <View style={styles.separatorBottom}>
          <Text style={styles.disclaimer}>
            Dispositivo su misura — Art. 20(1) MDR 2017/745
          </Text>
        </View>

      </Page>
    </Document>
  )
}

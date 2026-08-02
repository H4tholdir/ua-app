// UÀ — EtichettaTemplate
// Etichetta MDR Art. 20(1) — formato A6 landscape (148x105mm)
// v2: aggiunto "DISPOSITIVO SU MISURA", ITCA prominente, "Installare entro"
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'
import { dataItalianaBreve } from '@/lib/utils/data-roma'

// ─── Props aggiuntiva v2 ────────────────────────────────────────────────────
export interface EtichettaTemplateProps {
  lavoro: LavoroDettaglio
  lab: Laboratorio
  installareEntro?: string | null
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1a1a1a',
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
  },
  // Badge "DISPOSITIVO SU MISURA" — prima riga prominente
  deviceBadge: {
    border: '1pt solid #1a1a1a',
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 6,
    paddingRight: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  deviceBadgeText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Header lab + ITCA
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  labNome: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    flex: 1,
  },
  itcaBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    textAlign: 'right',
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
    width: 70,
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

// P9 (02/08/2026) — giorno civile italiano, non fuso della macchina. Qui il valore
// è `data_consegna_effettiva ?? data_consegna_prevista`, cioè un TIMESTAMPTZ oppure
// una DATE a seconda del caso (`supabase/schema.sql:935,939`): la funzione condivisa
// regge entrambi, perché Roma è sempre avanti a UTC.
const formatDataBreve = dataItalianaBreve

/**
 * Il paziente sull'etichetta. Allineata verbatim alla funzione `codiceGDPR`
 * di IFUTemplate.tsx e di RicevutaConsegnaTemplate.tsx (riserva
 * G1): dei tre template questo era l'UNICO che non passava mai da
 * `codice_paziente`, e stampava direttamente cognome + iniziale. Ora l'ordine
 * è lo stesso ovunque: prima il codice pseudonimizzato, poi (solo se manca)
 * l'iniziale + cognome, poi lo snapshot abbreviato.
 *
 * Esportata per il test; il template la usa internamente.
 */
export function pazienteEtichetta(lavoro: LavoroDettaglio): string {
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

// ─── Component ─────────────────────────────────────────────────────────────

export function EtichettaTemplate({ lavoro, lab, installareEntro }: EtichettaTemplateProps) {
  const primoMateriale = lavoro.materiali?.[0] ?? null
  const tipoFormatted = lavoro.tipo_dispositivo.replace(/_/g, ' ')

  return (
    <Document
      title={`Etichetta ${lavoro.numero_lavoro}`}
      creator="UA PWA"
    >
      {/* A6 landscape: 148mm × 105mm = 419.53pt × 297.64pt */}
      <Page
        size={{ width: 419.53, height: 297.64 }}
        style={styles.page}
      >

        {/* ── BADGE "DISPOSITIVO SU MISURA" ── */}
        <View style={styles.deviceBadge}>
          <Text style={styles.deviceBadgeText}>DISPOSITIVO SU MISURA</Text>
        </View>

        {/* ── HEADER: LAB + ITCA ── */}
        <View style={styles.headerRow}>
          <Text style={styles.labNome}>
            {lab.ragione_sociale ?? lab.nome}
          </Text>
          {lab.codice_itca ? (
            <Text style={styles.itcaBadge}>ITCA: {lab.codice_itca}</Text>
          ) : null}
        </View>

        <View style={styles.separatorTop} />

        {/* ── PAZIENTE ── */}
        <View style={styles.row}>
          <Text style={styles.label}>Paziente</Text>
          <Text style={styles.valueBold}>{pazienteEtichetta(lavoro)}</Text>
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

        {/* ── INSTALLARE ENTRO ── */}
        {installareEntro ? (
          <View style={styles.row}>
            <Text style={styles.label}>Installare entro</Text>
            <Text style={styles.valueBold}>{installareEntro}</Text>
          </View>
        ) : null}

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
            {lab.codice_itca ? ` — ITCA ${lab.codice_itca}` : ''}
          </Text>
        </View>

      </Page>
    </Document>
  )
}

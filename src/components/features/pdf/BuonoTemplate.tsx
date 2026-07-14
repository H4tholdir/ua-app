// UÀ — BuonoTemplate
// Buono di Consegna con colonna Calo (perdita peso metalli preziosi)
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'

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
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  logo: {
    width: 72,
    height: 36,
    objectFit: 'contain',
  },
  labNome: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  labSub: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 1,
  },
  docTitolo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#0f1e52',
    textAlign: 'right',
  },
  docNumero: {
    fontSize: 9,
    color: '#555555',
    textAlign: 'right',
    marginTop: 2,
  },
  separator: {
    borderBottom: '0.5pt solid #cccccc',
    marginBottom: 12,
  },
  // Dati documento
  datiRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  datiSection: {
    flex: 1,
  },
  datiLabel: {
    fontSize: 8,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  datiValue: {
    fontSize: 9,
    color: '#1a1a1a',
  },
  datiValueBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  // Sezione paziente
  pazienteBar: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingTop: 6,
    paddingBottom: 6,
    borderTop: '0.5pt solid #e0e4f0',
    borderBottom: '0.5pt solid #e0e4f0',
  },
  pazienteItem: {
    flex: 1,
  },
  pazienteLabel: {
    fontSize: 7,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  pazienteValue: {
    fontSize: 9,
    color: '#1a1a1a',
  },
  // Tabella lavorazioni
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #0f1e52',
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #eeeeee',
    paddingTop: 4,
    paddingBottom: 4,
  },
  colDescrizione: {
    flex: 4,
    fontSize: 9,
  },
  colQta: {
    width: 40,
    fontSize: 9,
    textAlign: 'right',
  },
  colCalo: {
    width: 50,
    fontSize: 9,
    textAlign: 'right',
  },
  colUm: {
    width: 40,
    fontSize: 9,
    textAlign: 'center',
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#0f1e52',
    letterSpacing: 0.4,
  },
  // Totale
  totaleRow: {
    flexDirection: 'row',
    borderTop: '1pt solid #0f1e52',
    paddingTop: 6,
    marginTop: 4,
  },
  totaleLabel: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f1e52',
  },
  totaleValue: {
    width: 40,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  caloTotaleValue: {
    width: 50,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  totaleUm: {
    width: 40,
  },
  // Footer
  footer: {
    marginTop: 24,
    borderTop: '0.5pt solid #cccccc',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    width: 180,
    alignItems: 'flex-end',
  },
  footerLabel: {
    fontSize: 8,
    color: '#888888',
    marginBottom: 24,
  },
  firmaLinea: {
    borderBottom: '0.5pt solid #333333',
    width: 160,
    marginBottom: 3,
  },
  firmaNome: {
    fontSize: 8,
    color: '#555555',
  },
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageFooterText: {
    fontSize: 7,
    color: '#aaaaaa',
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

function formatImporto(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface BuonoTemplateProps {
  lavoro: LavoroDettaglio
  lab: Laboratorio
  numeroBuono: string
}

// ─── Component ─────────────────────────────────────────────────────────────

export function BuonoTemplate({ lavoro, lab, numeroBuono }: BuonoTemplateProps) {
  const logoUrl = lab.logo_print_url ?? lab.logo_url ?? null
  const cliente = lavoro.cliente
  const nomeCliente = cliente.studio_nome ?? `${cliente.nome} ${cliente.cognome}`.trim()
  const lavorazioni = lavoro.lavorazioni ?? []

  const totaleCalo = lavorazioni.reduce((sum, l) => sum + (l.calo ?? 0), 0)
  const totaleQta = lavorazioni.reduce((sum, l) => sum + l.quantita, 0)

  return (
    <Document
      title={`Buono di Consegna ${numeroBuono}`}
      author={lab.ragione_sociale ?? lab.nome}
      creator="UA PWA"
    >
      <Page size="A4" style={styles.page}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.labNome}>
              {lab.ragione_sociale ?? lab.nome}
            </Text>
            {lab.indirizzo ? (
              <Text style={styles.labSub}>{lab.indirizzo}{lab.citta ? ` — ${lab.citta}` : ''}</Text>
            ) : null}
            {lab.partita_iva ? (
              <Text style={styles.labSub}>P.IVA: {lab.partita_iva}</Text>
            ) : null}
            {lab.telefono ? (
              <Text style={styles.labSub}>Tel: {lab.telefono}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            {logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoUrl} style={styles.logo} />
            ) : null}
            <Text style={styles.docTitolo}>Buono di Consegna</Text>
            <Text style={styles.docNumero}>N. {numeroBuono}</Text>
            <Text style={styles.docNumero}>{formatData(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* ── SEPARATORE ── */}
        <View style={styles.separator} />

        {/* ── DATI DOCUMENTO ── */}
        <View style={styles.datiRow}>
          <View style={styles.datiSection}>
            <Text style={styles.datiLabel}>Cliente</Text>
            <Text style={styles.datiValueBold}>{nomeCliente}</Text>
            {cliente.indirizzo ? (
              <Text style={styles.datiValue}>{cliente.indirizzo}</Text>
            ) : null}
            {cliente.citta ? (
              <Text style={styles.datiValue}>{cliente.citta}</Text>
            ) : null}
          </View>
          <View style={styles.datiSection}>
            <Text style={styles.datiLabel}>Richiedente</Text>
            <Text style={styles.datiValueBold}>
              {lavoro.richiedente_nome ?? `${cliente.nome} ${cliente.cognome}`.trim()}
            </Text>
          </View>
          <View style={styles.datiSection}>
            <Text style={styles.datiLabel}>Lavoro n.</Text>
            <Text style={styles.datiValueBold}>{lavoro.numero_lavoro}</Text>
            <Text style={styles.datiLabel}>Data consegna</Text>
            <Text style={styles.datiValue}>{formatData(lavoro.data_consegna_prevista)}</Text>
          </View>
        </View>

        {/* ── SEZIONE PAZIENTE ── */}
        <View style={styles.pazienteBar}>
          <View style={styles.pazienteItem}>
            <Text style={styles.pazienteLabel}>Paziente</Text>
            <Text style={styles.pazienteValue}>
              {lavoro.paziente_nome_snapshot ?? '—'}
            </Text>
          </View>
          <View style={styles.pazienteItem}>
            <Text style={styles.pazienteLabel}>Tipo dispositivo</Text>
            <Text style={styles.pazienteValue}>{lavoro.tipo_dispositivo.replace(/_/g, ' ')}</Text>
          </View>
          <View style={styles.pazienteItem}>
            <Text style={styles.pazienteLabel}>Consegna prevista</Text>
            <Text style={styles.pazienteValue}>{formatData(lavoro.data_consegna_prevista)}</Text>
          </View>
          {lavoro.numero_cassetta ? (
            <View style={styles.pazienteItem}>
              <Text style={styles.pazienteLabel}>Cassetta n.</Text>
              <Text style={styles.pazienteValue}>{lavoro.numero_cassetta}</Text>
            </View>
          ) : null}
        </View>

        {/* ── TABELLA LAVORAZIONI ── */}
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colDescrizione, styles.tableHeaderText]}>Descrizione</Text>
          <Text style={[styles.colQta, styles.tableHeaderText]}>Q.ta</Text>
          <Text style={[styles.colCalo, styles.tableHeaderText]}>Calo (g)</Text>
          <Text style={[styles.colUm, styles.tableHeaderText]}>U.M.</Text>
        </View>

        {/* Righe */}
        {lavorazioni.map((lav, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={styles.colDescrizione}>{lav.descrizione}</Text>
            <Text style={styles.colQta}>{lav.quantita}</Text>
            <Text style={styles.colCalo}>
              {lav.calo != null && lav.calo > 0
                ? formatImporto(lav.calo)
                : '—'}
            </Text>
            <Text style={styles.colUm}>{lav.unita_misura}</Text>
          </View>
        ))}

        {/* Totali */}
        <View style={styles.totaleRow}>
          <Text style={styles.totaleLabel}>Totale</Text>
          <Text style={styles.totaleValue}>{totaleQta}</Text>
          <Text style={styles.caloTotaleValue}>
            {totaleCalo > 0 ? formatImporto(totaleCalo) : '—'}
          </Text>
          <Text style={styles.totaleUm}></Text>
        </View>

        {/* ── NOTA DEL DENTISTA ── */}
        {lavoro.note_dentista ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.pazienteLabel}>Nota del dentista</Text>
            <Text style={{ fontSize: 8, color: '#444444', marginTop: 2 }}>
              {lavoro.note_dentista}
            </Text>
          </View>
        ) : null}

        {/* ── NOTE ── */}
        {lavoro.note_interne ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.pazienteLabel}>Note</Text>
            <Text style={{ fontSize: 8, color: '#444444', marginTop: 2 }}>
              {lavoro.note_interne}
            </Text>
          </View>
        ) : null}

        {/* ── FOOTER CON FIRMA ── */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerLabel}>
              {lab.ragione_sociale ?? lab.nome}
              {lab.indirizzo ? `\n${lab.indirizzo}` : ''}
              {lab.citta ? `, ${lab.citta}` : ''}
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerLabel}>Il destinatario</Text>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaNome}>Firma per ricevuta</Text>
          </View>
        </View>

        {/* ── PAGE FOOTER ── */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.pageFooterText}>
            {lab.ragione_sociale ?? lab.nome}
          </Text>
          <Text style={styles.pageFooterText}>
            {numeroBuono}
          </Text>
        </View>

      </Page>
    </Document>
  )
}

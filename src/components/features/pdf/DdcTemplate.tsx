// UÀ — DdcTemplate
// Dichiarazione di Conformità MDR 2017/745 Allegato XIII
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { LavoroDettaglio, Laboratorio, DichiarazioneConformita, ClasseRischio } from '@/types/domain'

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
    marginBottom: 2,
  },
  // Titolo
  titoloWrapper: {
    alignItems: 'center',
    marginBottom: 4,
  },
  titolo: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#0f1e52',
  },
  sottotitolo: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  // Separatore
  separator: {
    borderBottom: '0.5pt solid #cccccc',
    marginBottom: 12,
  },
  // Numero DdC
  numeroDdc: {
    textAlign: 'right',
    fontSize: 8,
    color: '#888888',
    marginBottom: 12,
  },
  // Sezione
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#0f1e52',
    marginBottom: 3,
    paddingBottom: 2,
    borderBottom: '0.5pt solid #e0e4f0',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    width: 140,
    fontSize: 9,
    color: '#555555',
  },
  value: {
    flex: 1,
    fontSize: 9,
    color: '#1a1a1a',
  },
  valueBold: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  // Testo conformita
  conformitaBox: {
    marginTop: 4,
    padding: 8,
  },
  conformitaText: {
    fontSize: 9,
    color: '#222222',
    lineHeight: 1.5,
  },
  // Rischi
  rischiText: {
    fontSize: 8,
    color: '#444444',
    lineHeight: 1.4,
    marginTop: 3,
  },
  // Footer firma
  firmaSection: {
    marginTop: 16,
    borderTop: '0.5pt solid #cccccc',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  firmaLeft: {
    flex: 1,
  },
  firmaRight: {
    width: 180,
    alignItems: 'flex-end',
  },
  firmaLabel: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 4,
  },
  firmaNome: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  firmaQualifica: {
    fontSize: 8,
    color: '#555555',
  },
  firmaImage: {
    width: 120,
    height: 40,
    objectFit: 'contain',
    marginBottom: 4,
  },
  firmaLinea: {
    borderBottom: '0.5pt solid #333333',
    width: 160,
    marginBottom: 3,
  },
  // Footer pagina
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#aaaaaa',
  },
  // Denti
  dentiText: {
    fontSize: 9,
    color: '#1a1a1a',
  },
  // Classe rischio badge (solo testo)
  classeRischio: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f1e52',
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatData(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return isoString
  }
}

function formatClasseRischio(classe: ClasseRischio): string {
  const map: Record<ClasseRischio, string> = {
    classe_i: 'Classe I',
    classe_iia: 'Classe IIa',
    classe_iib: 'Classe IIb',
    classe_iii: 'Classe III',
  }
  return map[classe] ?? classe
}

function formatTipoDispositivo(tipo: string): string {
  const map: Record<string, string> = {
    protesi_fissa: 'Protesi Fissa',
    protesi_mobile: 'Protesi Mobile',
    implantologia: 'Implantologia',
    cad_cam: 'CAD/CAM',
    scheletrato: 'Scheletrato',
    ortodonzia: 'Ortodonzia',
    provvisorio: 'Provvisorio',
    riparazione: 'Riparazione',
    altro: 'Altro',
  }
  return map[tipo] ?? tipo
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface DdcTemplateProps {
  lavoro: LavoroDettaglio
  lab: Laboratorio
  ddc: Partial<DichiarazioneConformita>
}

// ─── Component ─────────────────────────────────────────────────────────────

export function DdcTemplate({ lavoro, lab, ddc }: DdcTemplateProps) {
  const logoUrl = lab.logo_print_url ?? lab.logo_url ?? null

  const pazienteNome = [ddc.paziente_nome, ddc.paziente_cognome]
    .filter(Boolean)
    .join(' ')
    .trim() || '—'

  const dentiFormatted = lavoro.denti_coinvolti?.length
    ? lavoro.denti_coinvolti.join(', ')
    : null

  // Materiali: numero_lotto + nome_materiale + produttore
  const materialiText = lavoro.materiali?.length
    ? lavoro.materiali
        .map((m) => {
          const parts = [m.nome_materiale_snapshot, m.numero_lotto_snapshot, m.produttore_snapshot].filter(Boolean)
          return parts.join(' – ')
        })
        .join('\n')
    : null

  return (
    <Document
      title={`Dichiarazione di Conformita ${ddc.numero_ddc ?? ''}`}
      author={ddc.fabbricante_nome ?? lab.ragione_sociale ?? lab.nome}
      subject="Dichiarazione di Conformita MDR 2017/745"
      keywords="DDC MDR 2017/745 Allegato XIII"
      creator="UA PWA"
    >
      <Page size="A4" style={styles.page}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.labNome}>
              {ddc.fabbricante_nome ?? lab.ragione_sociale ?? lab.nome}
            </Text>
            {ddc.fabbricante_indirizzo ? (
              <Text style={styles.labSub}>{ddc.fabbricante_indirizzo}</Text>
            ) : null}
            {ddc.fabbricante_piva ? (
              <Text style={styles.labSub}>P.IVA: {ddc.fabbricante_piva}</Text>
            ) : null}
            {ddc.fabbricante_itca ? (
              <Text style={styles.labSub}>Codice ITCA: {ddc.fabbricante_itca}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            {logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoUrl} style={styles.logo} />
            ) : null}
          </View>
        </View>

        {/* ── TITOLO ── */}
        <View style={styles.titoloWrapper}>
          <Text style={styles.titolo}>Dichiarazione di Conformita</Text>
        </View>
        <Text style={styles.sottotitolo}>
          Ai sensi dell&apos;Art. 52(8) e Allegato XIII del Regolamento UE 2017/745
        </Text>

        {/* ── SEPARATORE ── */}
        <View style={styles.separator} />

        {/* ── NUMERO DDC ── */}
        {ddc.numero_ddc ? (
          <Text style={styles.numeroDdc}>
            N. {ddc.numero_ddc}
            {ddc.data_emissione ? `   |   Data: ${formatData(ddc.data_emissione)}` : ''}
          </Text>
        ) : null}

        {/* ── §1 FABBRICANTE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§1 — Fabbricante</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Ragione sociale:</Text>
            <Text style={styles.valueBold}>{ddc.fabbricante_nome ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Indirizzo:</Text>
            <Text style={styles.value}>{ddc.fabbricante_indirizzo || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Partita IVA:</Text>
            <Text style={styles.value}>{ddc.fabbricante_piva || '—'}</Text>
          </View>
          {ddc.fabbricante_itca ? (
            <View style={styles.row}>
              <Text style={styles.label}>Registro ITCA:</Text>
              <Text style={styles.value}>{ddc.fabbricante_itca}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Luogo emissione:</Text>
            <Text style={styles.value}>{ddc.luogo_emissione || '—'}</Text>
          </View>
        </View>

        {/* ── §3 PRESCRITTORE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§3 — Prescrittore</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome prescrittore:</Text>
            <Text style={styles.valueBold}>{ddc.prescrittore_nome || '—'}</Text>
          </View>
          {ddc.prescrizione_id ? (
            <View style={styles.row}>
              <Text style={styles.label}>N. prescrizione:</Text>
              <Text style={styles.value}>{ddc.prescrizione_id}</Text>
            </View>
          ) : null}
        </View>

        {/* ── §4 PAZIENTE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§4 — Paziente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Paziente:</Text>
            <Text style={styles.valueBold}>{pazienteNome}</Text>
          </View>
          {ddc.uso_esclusivo_paziente ? (
            <View style={styles.row}>
              <Text style={styles.label}></Text>
              <Text style={styles.value}>{ddc.uso_esclusivo_paziente}</Text>
            </View>
          ) : null}
        </View>

        {/* ── §5 DISPOSITIVO ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§5 — Dispositivo su misura</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Tipo dispositivo:</Text>
            <Text style={styles.valueBold}>
              {formatTipoDispositivo(ddc.tipo_dispositivo ?? lavoro.tipo_dispositivo)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Descrizione:</Text>
            <Text style={styles.value}>{ddc.descrizione_dispositivo || lavoro.descrizione || '—'}</Text>
          </View>
          {dentiFormatted ? (
            <View style={styles.row}>
              <Text style={styles.label}>Denti coinvolti:</Text>
              <Text style={styles.dentiText}>{dentiFormatted}</Text>
            </View>
          ) : null}
          {materialiText ? (
            <View style={styles.row}>
              <Text style={styles.label}>Materiali / Lotti:</Text>
              <Text style={styles.value}>{materialiText}</Text>
            </View>
          ) : null}
          {ddc.prescrizione_caratteristiche ? (
            <View style={styles.row}>
              <Text style={styles.label}>Caratteristiche prescritte:</Text>
              <Text style={styles.value}>{ddc.prescrizione_caratteristiche}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Sostanze / tessuti:</Text>
            <Text style={styles.value}>
              {ddc.contiene_sostanze_o_tessuti
                ? (ddc.sostanze_tessuti_dettaglio ?? 'Si — vedere documentazione allegata')
                : 'No'}
            </Text>
          </View>
        </View>

        {/* ── §6 CLASSIFICAZIONE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§6 — Classificazione MDR</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Classe di rischio:</Text>
            <Text style={styles.classeRischio}>
              {formatClasseRischio(ddc.classe_rischio ?? lavoro.classe_rischio)}
            </Text>
          </View>
          {ddc.norma_riferimento ? (
            <View style={styles.row}>
              <Text style={styles.label}>Norma di riferimento:</Text>
              <Text style={styles.value}>{ddc.norma_riferimento}</Text>
            </View>
          ) : null}
        </View>

        {/* ── §7 CONFORMITA ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§7 — Dichiarazione di Conformita</Text>
          <View style={styles.conformitaBox}>
            <Text style={styles.conformitaText}>
              {ddc.testo_conformita_snapshot ?? '—'}
            </Text>
          </View>
        </View>

        {/* ── §8 RISCHI RESIDUI ── */}
        {ddc.rischi_residui_snapshot ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>§8 — Rischi residui</Text>
            <Text style={styles.rischiText}>{ddc.rischi_residui_snapshot}</Text>
          </View>
        ) : null}

        {/* ── FIRMA PRRC ── */}
        <View style={styles.firmaSection}>
          <View style={styles.firmaLeft}>
            <Text style={styles.firmaLabel}>Data di emissione:</Text>
            <Text style={styles.firmaNome}>
              {ddc.data_emissione ? formatData(ddc.data_emissione) : '—'}
            </Text>
            {ddc.luogo_emissione ? (
              <Text style={styles.firmaQualifica}>{ddc.luogo_emissione}</Text>
            ) : null}
          </View>
          <View style={styles.firmaRight}>
            <Text style={styles.firmaLabel}>Responsabile della Conformita (PRRC)</Text>
            {ddc.firma_ddc_storage_path ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={ddc.firma_ddc_storage_path} style={styles.firmaImage} />
            ) : (
              <View style={styles.firmaLinea} />
            )}
            <Text style={styles.firmaNome}>{ddc.prrc_nome || '—'}</Text>
            {ddc.prrc_qualifica ? (
              <Text style={styles.firmaQualifica}>{ddc.prrc_qualifica}</Text>
            ) : null}
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerText}>
            Documento generato ai sensi del Reg. UE 2017/745 — Art. 52(8) + Allegato XIII
          </Text>
          <Text style={styles.footerText}>
            {ddc.numero_ddc ?? ''}
          </Text>
        </View>

      </Page>
    </Document>
  )
}

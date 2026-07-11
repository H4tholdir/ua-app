// src/components/features/pdf/FatturaCortesiaTemplate.tsx
// UÀ — Copia di cortesia della fattura elettronica (Ondata 2 portale dentista).
// NON è un documento fiscale: l'originale è l'XML FatturaPA trasmesso al SDI.
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer (pattern BuonoTemplate).
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a', paddingTop: 36, paddingBottom: 48, paddingLeft: 48, paddingRight: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  labNome: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  labSub: { fontSize: 8, color: '#555555', marginBottom: 1 },
  docTitolo: { fontSize: 11, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' },
  docNumero: { fontSize: 9, color: '#555555', textAlign: 'right', marginTop: 2 },
  separator: { borderBottom: '0.5pt solid #cccccc', marginBottom: 12 },
  datiLabel: { fontSize: 8, color: '#888888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  datiValore: { fontSize: 10, marginBottom: 6 },
  tabellaHeader: { flexDirection: 'row', borderBottom: '1pt solid #333333', paddingBottom: 4, marginTop: 12 },
  tabellaRiga: { flexDirection: 'row', borderBottom: '0.5pt solid #dddddd', paddingVertical: 4 },
  colDescrizione: { flex: 1 },
  colQta: { width: 48, textAlign: 'right' },
  colUm: { width: 32, textAlign: 'right' },
  colPrezzo: { width: 70, textAlign: 'right' },
  colImporto: { width: 70, textAlign: 'right' },
  thText: { fontSize: 8, color: '#888888', textTransform: 'uppercase', letterSpacing: 0.5 },
  riepilogo: { marginTop: 16, alignItems: 'flex-end' },
  riepilogoRiga: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  riepilogoLabel: { fontSize: 9, color: '#555555', width: 140, textAlign: 'right', paddingRight: 8 },
  riepilogoValore: { fontSize: 9, width: 80, textAlign: 'right' },
  totaleLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', width: 140, textAlign: 'right', paddingRight: 8 },
  totaleValore: { fontSize: 11, fontFamily: 'Helvetica-Bold', width: 80, textAlign: 'right' },
  natura: { marginTop: 10, fontSize: 8, color: '#555555' },
  cortesia: { marginTop: 24, padding: 8, border: '0.5pt solid #cccccc', fontSize: 8, color: '#555555', textAlign: 'center' },
})

function formatData(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

function formatImporto(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const titoliDocumento: Record<string, string> = {
  TD01: 'Fattura',
  TD02: 'Fattura di acconto',
  TD04: 'Nota di credito',
  TD05: 'Nota di debito',
  TD06: 'Parcella',
}

export interface FatturaCortesiaProps {
  lab: { denominazione: string; partita_iva: string; indirizzo: string | null; cap: string | null; citta: string | null; provincia: string | null }
  cliente: { denominazione: string; piva: string | null; cf: string | null; indirizzo: string }
  fattura: { numero: string; data: string; tipo_documento: string }
  righe: Array<{ descrizione: string; quantita: number; unita_misura: string; prezzo_unitario: number; importo: number }>
  imponibile: number
  bollo: number
  totale: number
}

export function FatturaCortesiaTemplate({ lab, cliente, fattura, righe, imponibile, bollo, totale }: FatturaCortesiaProps) {
  const titolo = titoliDocumento[fattura.tipo_documento] ?? 'Documento'
  const labIndirizzo = [lab.indirizzo, [lab.cap, lab.citta, lab.provincia].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <Document title={`${titolo} ${fattura.numero} — copia di cortesia`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.labNome}>{lab.denominazione}</Text>
            {labIndirizzo ? <Text style={styles.labSub}>{labIndirizzo}</Text> : null}
            <Text style={styles.labSub}>P.IVA {lab.partita_iva}</Text>
          </View>
          <View>
            <Text style={styles.docTitolo}>{titolo} — copia di cortesia</Text>
            <Text style={styles.docNumero}>N. {fattura.numero} del {formatData(fattura.data)}</Text>
          </View>
        </View>
        <View style={styles.separator} />

        <Text style={styles.datiLabel}>Destinatario</Text>
        <Text style={styles.datiValore}>
          {cliente.denominazione}
          {cliente.piva ? ` — P.IVA ${cliente.piva}` : cliente.cf ? ` — CF ${cliente.cf}` : ''}
          {cliente.indirizzo ? `\n${cliente.indirizzo}` : ''}
        </Text>

        <View style={styles.tabellaHeader}>
          <Text style={[styles.colDescrizione, styles.thText]}>Descrizione</Text>
          <Text style={[styles.colQta, styles.thText]}>Q.tà</Text>
          <Text style={[styles.colUm, styles.thText]}>UM</Text>
          <Text style={[styles.colPrezzo, styles.thText]}>Prezzo</Text>
          <Text style={[styles.colImporto, styles.thText]}>Importo</Text>
        </View>
        {righe.map((r, i) => (
          <View key={i} style={styles.tabellaRiga}>
            <Text style={styles.colDescrizione}>{r.descrizione}</Text>
            <Text style={styles.colQta}>{formatImporto(r.quantita)}</Text>
            <Text style={styles.colUm}>{r.unita_misura}</Text>
            <Text style={styles.colPrezzo}>{formatImporto(r.prezzo_unitario)}</Text>
            <Text style={styles.colImporto}>{formatImporto(r.importo)}</Text>
          </View>
        ))}

        <View style={styles.riepilogo}>
          <View style={styles.riepilogoRiga}>
            <Text style={styles.riepilogoLabel}>Imponibile</Text>
            <Text style={styles.riepilogoValore}>{formatImporto(imponibile)} EUR</Text>
          </View>
          <View style={styles.riepilogoRiga}>
            <Text style={styles.riepilogoLabel}>IVA</Text>
            <Text style={styles.riepilogoValore}>Esente (N4)</Text>
          </View>
          {bollo > 0 ? (
            <View style={styles.riepilogoRiga}>
              <Text style={styles.riepilogoLabel}>Bollo</Text>
              <Text style={styles.riepilogoValore}>{formatImporto(bollo)} EUR</Text>
            </View>
          ) : null}
          <View style={styles.riepilogoRiga}>
            <Text style={styles.totaleLabel}>Totale</Text>
            <Text style={styles.totaleValore}>{formatImporto(totale)} EUR</Text>
          </View>
        </View>

        <Text style={styles.natura}>
          Operazione esente IVA — Natura N4, Art. 10 n.18 DPR 633/72.
        </Text>

        <Text style={styles.cortesia}>
          Copia di cortesia priva di valore fiscale — l&apos;originale è la fattura elettronica trasmessa al Sistema di Interscambio.
        </Text>
      </Page>
    </Document>
  )
}

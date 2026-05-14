import type { LavoroDettaglio, ConsegnaPrecheckResult } from '@/types/domain'

/**
 * Verifica lato client gli 8 elementi obbligatori Allegato XIII MDR 2017/745.
 *
 * Elementi 1, 2, 8 sono verificati automaticamente server-side:
 *   1. Fabbricante — dati lab (snapshot al momento della generazione DdC)
 *   2. Data emissione — impostata automaticamente
 *   8. Conformità ai requisiti — testo fisso standardizzato
 *
 * Elementi 3–7 sono verificati qui:
 *   3. Prescrittore (richiedente_nome OR cliente.cognome + cliente.nome)
 *   4. Paziente (paziente_nome_snapshot OR paziente_id)
 *   5. Descrizione dispositivo (min 5 caratteri) + tipo_dispositivo non vuoto
 *   6. Classe di rischio non null
 *   7. Data consegna prevista non null
 */
export function precheckMDR(lavoro: LavoroDettaglio): ConsegnaPrecheckResult {
  const errori: ConsegnaPrecheckResult['errori'] = []

  // Elemento 3 — Prescrittore
  const haPrescrittore =
    (lavoro.richiedente_nome && lavoro.richiedente_nome.trim().length > 0) ||
    (lavoro.cliente &&
      (lavoro.cliente.cognome?.trim() || lavoro.cliente.nome?.trim()))

  if (!haPrescrittore) {
    errori.push({
      elemento: 3,
      descrizione: 'Nominativo prescrittore mancante',
      campo: 'cliente_id',
      route: 'dati',
    })
  }

  // Elemento 4 — Paziente: deve esserci un identificatore renderizzabile nel PDF
  // (nome snapshot, o codice paziente — non basta solo paziente_id senza nome)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paz = lavoro.paziente as any
  const nomePaziente = lavoro.paziente_nome_snapshot?.trim()
    ?? paz?.nome_cognome?.trim()
    ?? paz?.codice_paziente?.trim()
  const haPaziente = !!nomePaziente && nomePaziente.length > 0

  if (!haPaziente) {
    errori.push({
      elemento: 4,
      descrizione: 'Paziente non identificabile — aggiungi nome paziente o codice',
      campo: 'paziente_id',
      route: 'dati',
    })
  }

  // Elemento 5a — Descrizione dispositivo (min 5 caratteri)
  if (!lavoro.descrizione || lavoro.descrizione.trim().length < 5) {
    errori.push({
      elemento: 5,
      descrizione: 'Descrizione dispositivo troppo breve (min 5 caratteri)',
      campo: 'descrizione',
      route: 'dati',
    })
  }

  // Elemento 5b — Tipo dispositivo
  if (!lavoro.tipo_dispositivo || lavoro.tipo_dispositivo.trim().length === 0) {
    errori.push({
      elemento: 5,
      descrizione: 'Tipo dispositivo non specificato',
      campo: 'tipo_dispositivo',
      route: 'dati',
    })
  }

  // Elemento 6 — Classe di rischio
  if (!lavoro.classe_rischio) {
    errori.push({
      elemento: 6,
      descrizione: 'Classe di rischio non specificata',
      campo: 'classe_rischio',
      route: 'dati',
    })
  }

  // Elemento 7 — Data consegna prevista
  if (!lavoro.data_consegna_prevista) {
    errori.push({
      elemento: 7,
      descrizione: 'Data consegna prevista mancante',
      campo: 'data_consegna_prevista',
      route: 'dati',
    })
  }

  return { ok: errori.length === 0, errori }
}

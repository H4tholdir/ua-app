// src/lib/domain/qualita-costanti.ts
//
// I SETTE vocabolari chiusi dell'ondata «si deve sempre poter intervenire»
// (Task 2). SEI sono copiati ALLA LETTERA dai CHECK vivi in banca dati —
// fonte autoritativa: supabase/migrations/20260806140823_eventi_qualita.sql
// (Task 1, già applicata). Un valore in più o in meno qui, per quei sei, è
// una riga che il database rifiuterà a runtime con un 23514 illeggibile,
// invece di un errore leggibile in fase di scrittura.
// ⚠️ Il SETTIMO, `RISPOSTE_GRAVITA_INCIDENTE` (D277, righe verso la fine di
// questo file), NON ha un CHECK corrispondente: nessuna tabella porta ancora
// quella colonna — per scelta dichiarata, non per omissione. Vedi il
// commento sopra il suo export.
//
// 🔑 `natura` NON è un secondo campo che l'utente compila: è una derivazione
// FISSA di `motivo` (spec §5, tabella). `naturaDaMotivo` è quella
// derivazione — vive qui perché il vocabolario e la sua proiezione sono la
// stessa fonte di verità, non due.

// ── motivo — nove voci, la scelta dell'utente ────────────────────────────
// CHECK: 20260806140823_eventi_qualita.sql:10-13
export const MOTIVI = [
  'errore_dato_dichiarazione',
  'difetto_lavorazione',
  'difetto_materiale',
  'destinatario_errato',
  'modifica_clinica_richiesta',
  'errore_prezzo_quantita',
  'reso_senza_difetto',
  'errore_registrazione',
  'altro',
] as const
export type Motivo = (typeof MOTIVI)[number]

// ── natura — sette voci, DERIVATA da motivo (spec §5) ────────────────────
// CHECK: 20260806140823_eventi_qualita.sql:15-17
export const NATURE = [
  'dato_documentale',
  'difetto_fisico',
  'identificazione_destinatario',
  'nuova_esigenza_clinica',
  'nessun_difetto',
  'commerciale',
  'errore_registrazione',
] as const
export type Natura = (typeof NATURE)[number]

// ── origine_informazione — cinque voci: fa partire l'orologio ───────────
// (MDCG 2023-3 Q15 — la awareness date) e stabilisce se può esistere un
// reclamo (serve una comunicazione da fuori).
// CHECK: 20260806140823_eventi_qualita.sql:18-20
export const ORIGINI_INFORMAZIONE = [
  'laboratorio_interno',
  'odontoiatra',
  'paziente_tramite_medico',
  'autorita_competente',
  'altro_operatore',
] as const
export type OrigineInformazione = (typeof ORIGINI_INFORMAZIONE)[number]

// ── stato_dispositivo — quattro voci, non un booleano (D269, spec §5) ───
// `non_noto` è ammesso e non blocca: decisione di Francesco del 06/08.
// CHECK: 20260806140823_eventi_qualita.sql:22-23
export const STATI_DISPOSITIVO = [
  'mai_uscito_dal_lab',
  'consegnato_non_applicato',
  'applicato',
  'non_noto',
] as const
export type StatoDispositivo = (typeof STATI_DISPOSITIVO)[number]

// ── potenziale_di_danno — quattro voci, default prudente `da_valutare` ──
// Un default `nessuno` sarebbe un generatore silenzioso di
// sotto-classificazione, contro l'Art. 87(7) (spec §5).
// CHECK: 20260806140823_eventi_qualita.sql:24-25
export const POTENZIALI_DI_DANNO = [
  'nessuno',
  'da_valutare',
  'possibile',
  'accertato',
] as const
export type PotenzialeDiDanno = (typeof POTENZIALI_DI_DANNO)[number]

// ── esito — cinque voci, l'ordine ministeriale (D268, spec §3/§6) ───────
// CHECK: 20260806140823_eventi_qualita.sql:38-40
export const ESITI = [
  'nessuna_azione',
  'non_conformita_interna',
  'reclamo',
  'incidente',
  'incidente_grave',
] as const
export type Esito = (typeof ESITI)[number]

// ── motivo → natura, la derivazione fissa (spec §5, tabella) ─────────────
const NATURA_DA_MOTIVO: Record<Exclude<Motivo, 'altro'>, Natura> = {
  errore_dato_dichiarazione: 'dato_documentale',
  difetto_lavorazione: 'difetto_fisico',
  difetto_materiale: 'difetto_fisico',
  destinatario_errato: 'identificazione_destinatario',
  // 🔑 Caso 5 (spec §11): `modifica_clinica_richiesta` NON duplica il
  // vocabolario della divergenza prescritto/eseguito — vi RIMANDA.
  // `richiesta_dentista` è già il caso 5, modellato in
  // src/lib/domain/prescrizione-costanti.ts:53-58
  // (`MOTIVI_DIVERGENZA`, prima voce dell'array).
  modifica_clinica_richiesta: 'nuova_esigenza_clinica',
  errore_prezzo_quantita: 'commerciale',
  reso_senza_difetto: 'nessun_difetto',
  errore_registrazione: 'errore_registrazione',
}

const INSIEME_MOTIVI = new Set<string>(MOTIVI)

/** `true` se il valore è uno dei nove motivi ammessi. La usa chi riceve un
 *  `unknown` non validato (un body JSON) PRIMA di chiamare `naturaDaMotivo`
 *  con un `Motivo` vero — stesso idioma di `isFonteTipo` in
 *  `src/lib/domain/prescrizione-costanti.ts:72-74`.
 *
 *  🛑 Ritrovamento della revisione del Task 2 (06/08/2026), CHIUSO qui e non
 *  dentro `naturaDaMotivo`: un `Record` indicizzato senza controllo di tipo
 *  fa risalire un valore come `'constructor'` al prototipo di `Object` e
 *  restituisce quel membro (una FUNZIONE; `'__proto__'` un OGGETTO) invece
 *  di un esito coerente. La ri-revisione (06/08/2026, stessa data) ha
 *  spostato la guardia QUI, separata da `naturaDaMotivo`: prima viveva
 *  dentro, allargando la firma di `naturaDaMotivo` a `unknown` — e così
 *  facendo il suo `null` tornava ad avere DUE significati («è `altro`»
 *  oppure «è spazzatura»), il difetto opposto a quello che la guardia
 *  doveva chiudere. Vedi il commento sopra `naturaDaMotivo`. */
export function isMotivo(v: unknown): v is Motivo {
  return typeof v === 'string' && INSIEME_MOTIVI.has(v)
}

/** La derivazione fissa motivo → natura (spec §5). `null` SOLO per
 *  `'altro'`: lì la natura si CHIEDE, non si indovina — l'utente la sceglie
 *  fra le sette (motivo_libero porta il testo, non basta a dedurre natura).
 *
 *  🔑 Firma STRETTA (`motivo: Motivo`), come nel mandato originale del
 *  Task 2. Chi ha solo un `unknown` non validato (un body JSON) chiama
 *  PRIMA `isMotivo` — così `null` continua a significare UNA sola cosa. */
export function naturaDaMotivo(motivo: Motivo): Natura | null {
  if (motivo === 'altro') return null
  return NATURA_DA_MOTIVO[motivo]
}

// ── la risposta alla domanda dell'Art. 2(65) — la gravità (D277, 06/08/2026) ──
// 🔑 NON è un vincolo di banca dati: nessuna tabella ha ancora questa colonna
// (Task 2 è puro, senza DB — l'aggancio a `valutazioni_evento` è di una Task
// successiva, fuori da questo mandato). Vive qui perché è lo stesso dominio
// dei sei vocabolari sopra: la domanda che `classifica()` pone quando il
// passo ① trova un potenziale di danno e non può più dedurre la gravità da
// un solo valore di `potenziale_di_danno` — il difetto che D277 ha chiuso
// (quell'asse risponde all'Art. 2(64) «è un incidente?», non all'Art. 2(65)
// «è grave?»: sono due domande, non una).
//
// Le prime tre sono «grave», ciascuna col suo termine dell'Art. 87; la quarta
// ferma la scadenza a `null` (resta un incidente, ma senza MIR — entra solo
// nel conteggio periodico dell'Art. 88).
export const RISPOSTE_GRAVITA_INCIDENTE = [
  'minaccia_grave_salute_pubblica', // Art. 87(4) → 2 giorni
  'morte_o_deterioramento_grave_non_previsto', // Art. 87(5) → 10 giorni
  'grave_regola_generale', // Art. 87(3) → 15 giorni
  'non_grave', // incidente, nessuna scadenza MIR
] as const
export type RispostaGravitaIncidente = (typeof RISPOSTE_GRAVITA_INCIDENTE)[number]

const INSIEME_RISPOSTE_GRAVITA = new Set<string>(RISPOSTE_GRAVITA_INCIDENTE)

/** `true` se il valore è una delle quattro risposte ammesse. La usa
 *  `classifica()` (`src/lib/qualita/classifica.ts`) per normalizzare
 *  `rispostaGravita` PRIMA di passarlo a `esitoDaGravita`: quella funzione
 *  ha un `switch` esaustivo SUL TIPO dichiarato ma senza ramo di riserva —
 *  un valore che il tipo esclude (fuori vocabolario, `null`, un numero) e
 *  che arriva comunque a runtime (nessuna validazione a monte in questo
 *  mandato) lo fa cadere attraverso il `switch` senza ritorno.
 *
 *  🛑 REGRESSIONE chiusa dalla ri-revisione (06/08/2026): prima di questa
 *  guardia, un `rispostaGravita` malformato produceva un `TypeError` alla
 *  destrutturazione (`classifica.ts`, passo ①) — la funzione ESPLODEVA
 *  invece di proporre. Con la guardia, un valore non riconosciuto è trattato
 *  come "nessuna risposta valida ancora data": la stessa domanda dell'Art.
 *  2(65) resta aperta (D277 — la gravità si CHIEDE, non si deduce, e questo
 *  vale anche per un ingresso corrotto: indovinare una gravità da un valore
 *  a caso sarebbe esattamente la deduzione che D277 vieta). */
export function isRispostaGravitaIncidente(v: unknown): v is RispostaGravitaIncidente {
  return typeof v === 'string' && INSIEME_RISPOSTE_GRAVITA.has(v)
}

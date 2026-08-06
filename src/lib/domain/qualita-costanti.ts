// src/lib/domain/qualita-costanti.ts
//
// I SEI vocabolari chiusi dell'ondata «si deve sempre poter intervenire»
// (Task 2). Copiati ALLA LETTERA dai CHECK vivi in banca dati — fonte
// autoritativa: supabase/migrations/20260806140823_eventi_qualita.sql
// (Task 1, già applicata). Un valore in più o in meno qui è una riga che il
// database rifiuterà a runtime con un 23514 illeggibile, invece di un errore
// leggibile in fase di scrittura.
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

/** La derivazione fissa motivo → natura (spec §5). `null` SOLO per
 *  `'altro'`: lì la natura si CHIEDE, non si indovina — l'utente la sceglie
 *  fra le sette (motivo_libero porta il testo, non basta a dedurre natura). */
export function naturaDaMotivo(motivo: Motivo): Natura | null {
  if (motivo === 'altro') return null
  return NATURA_DA_MOTIVO[motivo]
}

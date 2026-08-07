# P7 — registro DPA: cancello, traccia, il «chi» · registro di avanzamento

Piano: docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md
Ramo: p7-registro-dpa-cancello-traccia · base: 185e55fd
Decisioni: D146 · D147 · D148 · D149 · D150 (esecutori freschi) · D151 (migration via Management API)

## Stato
- **Task 1 (migration + schema.sql + tipi): COMPLETO** (commit 185e55fd..0e7d1b6f, revisione pulita:
  conformità ✅, qualità Approvato — verificata sul database vivo, non sul referto)
- **Task 2 (parametro obbligatorio): COMPLETO** (commit 0e7d1b6f..19aa6364, revisione pulita:
  conformità ✅, qualità Approvato — il revisore ha verificato in modo indipendente che T3b non è
  vacua: `mockUpdate` è armato nello stesso blocco e le prove sorelle lo chiamano con successo)
- **Task 3 (prove di comportamento): COMPLETO come task** (commit 1961dcdf..2527fdfa, revisione pulita:
  conformità ✅, qualità Approvato) — **ma le prove NON sono tutte verdi**:
    · T1 ✅ rifiuto provato, col controllo positivo (regola vecchia: 2 righe toccate; regola nuova: 0)
      e con `current_lab_id()` risolto a un laboratorio vero in ENTRAMBI i bracci — non NULL
    · T2 ✅ traccia provata: `audit_log` 0→1, `operation='INSERT'`, `new_data` con 23 chiavi
    · T5 ✅ la chiave esterna morde: 23503 col messaggio incollato
    · T3 ⚠️ **APERTA** — eseguita, 0 righe: nessuna emissione VERA ha ancora scritto `emesso_da`.
      Per chiuderla serve una scrittura permanente → decisione di Francesco
    · T4 🔴 **BLOCCATA** da F1 (sotto), difetto preesistente e indipendente da P7
  🛑 Il database è rimasto PULITO: 2 righe DPA, 0 con `emesso_da`, nessun residuo delle prove,
  laboratori tutti al loro posto (verificato dal revisore in sola lettura, non sulla parola)
- **Task 4 (FASE 7 + memoria + chiusura): COMPLETO.** T3 chiusa con emissione vera (D152); P27, P28
  aperti in roadmap (D153); voce P7 e testa spec oneste (ESEGUITA IN PARTE, T4 non eseguibile);
  `tsc` 0 · `vitest` 4382|19 · `next build` 0. Referto: `.superpowers/sdd/task-4-report.md`. Commit sul
  ramo, non mergiato né pubblicato.

## Rilievi MINORI raccolti (per la revisione finale di ramo)
- **M1** `supabase/schema.sql:2874` — il commento «I sette campi viaggiano tutti insieme o nessuno»
  (sopra il CHECK `dpa_emissione_coerente`) ora ne conta otto: `emesso_da` è **volutamente** fuori dal
  vincolo (le 2 righe preesistenti non hanno un «chi» e non si inventa). Scelta giusta, commento da
  allineare.
- **M2** a livello di database nulla impedisce `emesso_at` valorizzato ed `emesso_da` NULL per sempre:
  lo impedisce **solo** la firma TypeScript del Task 2. È **D148 dichiarata** (il vincolo vive nel
  compilatore, non in un valore finto) — rischio accettato per scelta, non difetto.
- **M3** accenti scritti con l'apostrofo ASCII nei commenti nuovi (`e'` invece di `è`, `puo'` invece
  di `può`) in `src/lib/pdf/generate-dpa.ts:91-95` e `tests/unit/dpa-registro.test.ts:463,467,716-719`,
  mentre il resto degli stessi file usa gli accenti veri (54 occorrenze di `è` nel solo generate-dpa).
  ⚠️ **Ereditato VERBATIM dal brief**, cioè dal piano: la fonte va corretta insieme al codice, o
  rientra al prossimo task. Il progetto ha già un handoff dedicato agli accenti (03/08).
- **M4** `expect(riga.firmato_da).toBeUndefined()` in T3a è verde per qualunque implementazione
  ragionevole: non è un difetto, ma non va contata come forza della prova.

## Fuori mandato (R-E2) — da portare in roadmap, NON correggere qui
- **F4** `supabase/schema.sql` non rispecchia **10 degli 11** automatismi del registro modifiche: solo
  quello aggiunto oggi è visibile. Deriva **preesistente** (10 migration storiche mai propagate a mano),
  riprodotta dal revisore. 🔑 La fotografia dello schema mente per omissione, ed è il file che una
  sessione nuova legge per capire com'è fatto il database. → voce di roadmap **P27**.
- **F1** (già risolto in corsa) `.superpowers/sdd/` conteneva brief e referti di un piano DIVERSO
  (03/08) coi nomi `task-2…task-8`: un esecutore indirizzato per nome avrebbe letto i requisiti
  sbagliati. Rimossi.

## 🔴 F1 — IL DIFETTO GRAVE, verificato DUE volte sul catalogo vivo (esecutore + revisore)
`admin_delete_laboratorio()` cancella **`clienti` PRIMA di `data_processing_agreements`** (righe 42 e 67
della definizione viva letta da `pg_get_functiondef`, non del file). Ma ogni DPA **emesso davvero** ha
`dentista_id` valorizzato — lo impone il CHECK `dpa_emissione_coerente` — e quella colonna punta a
`clienti(id)` con chiave esterna **NO ACTION**. 🛑 **Conseguenza: un laboratorio che ha emesso anche un
solo DPA NON SI PUÒ PIÙ CANCELLARE**, e fallisce con 23503.
- **Preesistente:** lo stesso ordine è già in `20260702030000_b2_fix_admin_delete_laboratorio.sql` (2
  luglio). P7 **non** tocca l'ordine dei DELETE (verificato sulla migration).
- **Oggi colpisce un laboratorio**; per costruzione colpirà **ogni** laboratorio che emette un DPA.
- **NON è la voce del 28/07** (riga 752 della roadmap): quella elenca **sei tabelle che la funzione non
  cancella affatto**. Qui le due DELETE ci sono entrambe: è l'**ordine** a essere sbagliato. Ritrovamento
  **nuovo**. → voce di roadmap **P28**.
- 🔑 **E smentisce in parte l'assunzione A7 della spec di P7**, che dichiarava sicuro l'ordine guardando
  solo `utenti` (155 vs 163) e **non** `clienti` (130). L'ordine giusto lo si prova su **tutte** le chiavi
  esterne entranti, non su quella che si ha in mente.

## Difetti del PIANO trovati eseguendo (corretti nel piano, non aggirati)
- Task 1 Step 4: `grep -c "BEGIN;\|COMMIT;"` senza escludere i commenti → dava **1** ed era
  **impossibile da soddisfare**, perché l'intestazione obbligatoria contiene quelle parole. Trovato due
  volte in modo indipendente (esecutore e revisore). Corretto.
- Task 1: numero di riga sbagliato per la regola RLS in `schema.sql` (l'esecutore ha localizzato per
  contenuto, che è la cosa giusta).

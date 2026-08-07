# Ondata B — sessione ② (migration + RPC + server) · registro di avanzamento

Piano: `docs/superpowers/plans/2026-08-04-ondata-b-sessione-2-migration-rpc.md`
Spec: `docs/superpowers/specs/2026-08-04-ondata-b-prescrizione-design.md` (RATIFICATA, D214)
Ramo: `ondata-b-sessione-2` · base: (si annota al commit del piano)
Cancello §0① PASSATO: 6 DdC in archivio (2 `generata` pre-v1, 4 `annullata`) — incollato nel piano §A.0.

🛑 Registro P31 archiviato in `archivio-ondate-precedenti/2026-08-03-p31-due-numeri/` PRIMA di
cominciare (difetto F1 di P7: brief di un piano diverso ingannano gli esecutori indirizzati per nome).
⚠️ Nota per il controllore: `db push` può richiedere permessi negati agli esecutori (successo P31:
`migration repair` eseguito dal controllore). Se l'esecutore è bloccato sul push, lo esegue il controllore.

## Stato

- Task 1 (branch `ondata-b-sessione-2`): ✅ fatta dal controllore (FASE 5).
- Task 2 (Migration A: strutture) — ✅ COMPLETO (commit 3fc71e70..04578edd; review: migration
  `85e41487` Approved, spec ✅ verbatim). Rilievo Importante ADJUDICATO dal controllore: il commit
  tipi `04578edd` anticipa Step 6.1 — si TIENE per la REGOLA ZERO del repo («dopo ogni migration:
  gen types + tsc», rango superiore al piano); ⚠️ il Task 6 RESTA da eseguire PER INTERO (nuova
  rigenerazione dopo le migration B/C + tsc + RLS a 5 tabelle). Strutture vive collaudate:
  9 vincoli, policy solo SELECT, istituzione_sanitaria presente.
- Task 3 (Migration B: RPC) — ✅ COMPLETO (commit 04578edd..18e60bb8; review: Approved, spec ✅,
  fedeltà dei corpi verificata riga-per-riga sul vigente). Collaudo 9/9 + permessi 6/6.
  Importanti adjudicati: ① rifacimento senza istituzione_sanitaria sul lavoro nuovo → RIFERITO
  (handoff; gemello del preesistente richiedente_nome non clonato); ② accenti garbled in DUE
  COMMENT (:513 gia''/e'' · :521 finche'') → FIX NEL TASK 4 (Migration C ri-emette i COMMENT
  corretti + emenda il file B per fedeltà); ③ FASE 6b → Task 6 (già a ledger).
- Task 4 (Migration C: chiusura policy) — ✅ COMPLETO (commit 18e60bb8..ce0d289c; review: Approved,
  spec ✅ verbatim, prova del rifiuto NON vacua — controllo positivo nello stesso ruolo/claims).
  Include il fix accenti ordinato dal controllore (COMMENT ri-emessi + file B emendato,
  byte-identici) e la rigenerazione tipi (debito FASE 6b del Task 3, giustificata a parte).
  ⚠️ RISCOPARE IL TASK 7 prima del dispatch: la fotografia schema.sql:1292-1294 (policy →
  commento) è GIÀ fatta qui (39a782d0) — il brief 7 deve dirlo o l'esecutore cercherà una policy
  che non c'è più.
- Task 5 (server: componiSnapshot + POST/PATCH) — ✅ COMPLETO (commit ce0d289c..c8b63adf; review:
  Approved, zero Critical/Important; R-P4 verificato A MANO dal revisore, conteggi combacianti;
  3 rischi nominati confermati dal diff). CONTRADDIZIONE DEL PIANO (Step 5.4) trovata
  dall'esecutore e adjudicata dal controllore: gate sulla PRESENZA della chiave `prescrizione`
  nel body — i body legacy non creano righe snapshot (la ③ manderà la chiave). Da verbale.
- Task 6 (FASE 6b) — ✅ COMPLETO (eseguito dal CONTROLLORE, come i gate di P31): gen types →
  IDENTICI (debito già saldato in ce0d289c, nessun commit) · tsc 0 errori · RLS a 5 tabelle:
  DdC solo insert+select (chiusura CONFERMATA), lavori_prescrizioni solo tenant_select, nessuna
  policy sparita. Osservazione R-E2: lavori ha DUE famiglie di policy parallele preesistenti
  (lavori_laboratorio_* + tenant_*) — non toccate, a referto.
- Task 7 (igiene dichiarata) — ✅ COMPLETO (commit c8b63adf..16f71ab5; re-review: Spec ✅,
  Approved — le due righe nella forma della 878, +2/-2, nient'altro mosso).
  Storia: commit 9e352972 (3 dei 4 punti puliti al primo giro; salvataggio in self-review del
  falso «12 elementi»); Critical del revisore: schema.sql:919 introduceva un abbinamento
  normativo falso («Allegato XIII p.1 — classe rischio»); fix 16f71ab5 rimuove gli abbinamenti
  non provati (919 senza allegato · 903 nella forma della 878). Important (b) chiuso dal
  CONTROLLORE con grep: nessun costrutto esaustivo consuma la union stato DdC (solo Psur e
  lab-guard). R-E2 nuovi: due «Allegato IV» stantii in docs/ (spec 2026-05-15:369 e piano
  2026-05-15:907, archivi) — non toccati.
- Task 8 (FASE 7 verify) — ✅ COMPLETO (dal controllore): verify:fast → tsc 0 · eslint 0 ·
  vitest 4568/4568 (397 file) · verifica registrata. REVIEW FINALE DI RAMO (c04cf781..16f71ab5,
  9 commit): READY TO MERGE, zero Critical/Important nuovi; 4 Minor tutti oltre il confine ②;
  triage dei 9 Minori accumulati fatto; note vincolanti ③/④ SCRITTE NEL PIANO (committate).
  BP-1 fatto: MEMORY (138) + ROADMAP (62) + SESSION_ACTIVE aggiornati. NON pubblicato: il
  merge/push attende l'ok di Francesco.

## Rilievi MINORI raccolti (per la revisione finale di ramo)

- **M-T3-1** registra_divergenza accetta p_campo NULL (la route ③/④ deve fare da guardia).
- **M-T3-2** p_prescrizione='null'::jsonb passa IS NOT NULL → riga snapshot vuota spuria (guardia
  jsonb_typeof suggerita; irraggiungibile via PostgREST — la route Task 5 non deve mandarlo).
- **M-T3-3** correggi_typo: SQL NULL rimuove la chiave — la route deve distinguere rimozione
  esplicita da valore assente PRIMA di chiamare.
- **M-T3-4** output collaudo caso 3 troncato a metà parola nel report (cosmetico).
- **M-T3-5** (osservato, vigente, fuori mandato) lock di crea_rifacimento_atomico senza tenant
  param né deleted_at IS NULL.
- **M-T3-6** il report del Task 3 §7 affermava «lettere accentate mai toccate» — smentito dal
  revisore (:513/:521): il referto si verifica, non si crede.
- **M-T5-1** retrocompat POST semantica, non byte-identica: p_lavoro porta sempre
  istituzione_sanitaria (null per i body legacy) — RATIFICATA dal controllore (null-equivalente
  per ->>, pattern uniforme del blocco).
- **M-T5-2** chiavi ignote dentro body.prescrizione scartate in silenzio (fuori enumerazione
  R-P4) — per la ③: enumerare o 422.
- **M-T5-3** istituzione_sanitaria senza type-check nel POST (coerente col preesistente
  richiedente_nome) — asimmetria dichiarata qui.
- **M-T5-4** stringa vuota = assente per colore/numero (semantica decisa in-task, ben motivata:
  un testo vuoto non è una trascrizione) — riga di verbale nell'handoff.
- **M-T4-1** DROP POLICY senza IF EXISTS (testo verbatim del piano; divergenza dal principio di
  idempotenza del modello DPA — riferita dall'esecutore, innocua: già applicata con successo).

## Fuori mandato (R-E2) — per l'handoff §3-bis, NON correggere qui

- I 14 ritrovamenti dei lettori R-P2 sono censiti nel piano §B (in coda al registro letture).
- (Task 3) Il rifacimento vigente non copia istituzione_sanitaria sul lavoro nuovo — gemello del
  preesistente richiedente_nome non clonato: i due campi P37 vanno sanati INSIEME, decisione da
  ratificare (non in ②).
- (Task 4) TRE COMMENT vivi preesistenti con lo stesso bug accento-come-doppio-apostrofo:
  lavori_immagini.categoria · data_processing_agreements.storage_path_pdf ·
  data_processing_agreements.emesso_da (dettagli in task-4-report.md §7.1; il terzo era F-P31-3).

## FASE 10 — ✅ PUBBLICATO (D219, 04/08 sera)
push `c04cf781..d1ba332d` · CI verde (30923933154, 7m32s) · CD verde (30924573853) · sito 200.
Tornate 82-83 a verbale (D216-D222). Commit di chiusura docs pushato a parte (secondo giro CI in corso).

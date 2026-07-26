# Handoff — Parete delle Cassette: ripresa dal Task 3
**Data:** 21/07/2026 · **Per:** sessione NUOVA a contesto pulito
**Stato:** Task 1 e Task 2 **COMPLETI**, migration **APPLICATA** al DB live. Gate 1 superato.

## Dove siamo in 30 secondi

Worktree `.claude/worktrees/parete-cassette`, branch `worktree-parete-cassette`.
5 commit, `main` @ `4853458` come base. **Niente è stato mergiato né pushato.**

| Commit | Cosa |
|---|---|
| `03f16a7` | Task 2 — mappa miniature (3 livelli) + guardia di regressione sul granulare |
| `a9bcb23` | Task 1 rifatto dopo il panel — 3 migration |
| `18bdd98` | fix D1/D2/D3/D5 |
| `8387125` | fix E1/E2/E8 + ordine dei lock documentato |
| `971a6cd` | FASE 6b — `database.types.ts` rigenerato |
| `2c00948` | piano/spec/ratifiche versionati + brief dei task 3-19 corretti |

## Come ripartire

1. **Leggi il blocco «⚠️ STATO AL 21/07» in testa a
   `docs/superpowers/plans/2026-07-21-parete-cassette.md`.** Contiene le 5 regole che valgono per
   tutti i task rimanenti. **Il piano è già stato corretto**: ogni task impattato porta in testa un
   blocco «⚠️ CORREZIONI 21/07» che il `task-brief` estrae automaticamente. Non serve rileggere gli
   audit per implementare — servono solo se vuoi il perché.
2. **Ledger:** `.superpowers/sdd/progress.md` (nel worktree, git-ignored). È la mappa di recupero:
   se il contesto si perde, fidati di quello e di `git log`, non della memoria.
3. **Skill:** `superpowers:subagent-driven-development`, come finora. Subagent fresco per task +
   review per task. **Riparti dal Task 3.**
4. `npm install` è già fatto nel worktree; `.env.local` e `.env.test` sono già copiati.

## I 5 vincoli che valgono per ogni task rimanente

1. **Test in `tests/unit/`**, MAI in `src/**/__tests__/` — `vitest.config.ts` non li scoprirebbe e
   avresti un RED finto. `vitest.config.ts` **non si tocca**. I path dei sorgenti restano quelli del piano.
2. **Retry sul 40P01** nelle route che chiamano le RPC: alcune combinazioni concorrenti danno deadlock
   con rollback pulito, deliberatamente non corretti in SQL. Elenco e tassi misurati nel commento
   d'intestazione di `20260721090000_parete_cassette.sql`.
3. **`p_lab` sempre da `getFreshLabContext()` server-side, `p_user` sempre da `context.userId`** —
   mai dal body. La tenuta multi-tenant delle RPC poggia lì.
4. **Il seed E2E (Task 19 Step 1) va anticipato prima della QA di FASE 9**: `numero_cassetta` è NULL
   su tutti i 288 lavori in DB, quindi senza seed ogni superficie della Parete è vuota.
5. **`cassette_lavori` è append-only, il trigger rifiuta ogni DELETE.** Reset di fixture con
   `.delete()` fallisce: usa `public.cassette_purge_lab(labId)`.

## Task rimanenti: 3 → 19 (17 task)

Impattati dalle correzioni: **3, 4, 5, 6, 8, 9, 19**. I due che romperebbero se ignorati:
- **Task 6** — `utente_set_nav_pref` ha **4 argomenti**: senza `p_lab` PostgREST dà `PGRST202`.
- **Task 3** — le chip «dal parco» si ordinano per `max(cassette_lavori.assegnato_at)`, non per
  `cassette.updated_at`.

Non impattati (verificato, non assunto): 7, 10, 11, 12, 13, 14, 15, 16, 17, 18.

## I 2 gate 🛑 che restano

1. **Task 18 — mockup delle 4 miniature nuove** (allineatore, mascherina/bite, riparazione, generica):
   mockup HTML in `docs/design/mockups/` (MAI /tmp) + screenshot light/dark → **approvazione di
   Francesco** prima del React. Le 6 esistenti sono già ratificate e si fanno subito nel Task 10.
2. **Merge finale** — dopo FASE 7 (tsc + vitest + build, output reali), review (FASE 8), QA browser
   sul lab E2E `00000000-…-0001` (FASE 9) e **GATE ESTETICO L2** (FASE 9b). Presentare a Francesco;
   merge/push **solo** su richiesta esplicita.

## Cosa è successo al Task 1 (per capire il perché, non serve per implementare)

L'SQL ratificato conteneva 1 Critical + 7 Important, trovati da una review e confermati **8/8** da un
panel advisor 3× che ha riprodotto tutto su Postgres in container. Due round di audit avversariale
(~40.000 statement concorrenti, 4 lenti indipendenti) hanno trovato e chiuso altri 3 difetti di
correttezza. Esito: **3 migration** invece di una, applicate il 21/07 con invarianti a zero sul DB live.

Documenti: `.superpowers/sdd/panel-sintesi.md` · `task-1-decisioni-ratificate.md` (R-1…R-6) ·
`audit-round2-consolidato.md` · `audit-indipendente-completezza.md` · `audit-indipendente-correttezza.md`.

**Criterio di arresto adottato, da non re-litigare:** l'SQL garantisce la **correttezza**; la coda di
deadlock che fa rollback pulito si gestisce con **retry in route**. Inseguire ogni deadlock sotto
contesa sintetica non converge.

## Due cose da ricordare al merge

- I 4 documenti della Parete (piano, spec, ratifiche, handoff) sono ora **tracciati sul branch** ma
  esistono anche come **file non tracciati nel main tree**: prima del merge vanno rimossi da lì,
  altrimenti git rifiuta di sovrascriverli. Il piano è già sincronizzato nei due posti.
- **D-11 va aperta** subito dopo questa ondata: fix *di classe* per la purga per-tenant, con panel
  proprio (architettura + sicurezza + normativa), che copra anche le **3 tabelle già orfane oggi** in
  `admin_delete_laboratorio` — `fatture_outbox`, `fatture_sdi_eventi`, `credito_clienti_movimenti`.
  Non è un difetto introdotto dalla Parete: è preesistente e verificato.

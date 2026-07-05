# Handoff — B5 pronto per esecuzione in nuova sessione (05/07/2026)

**B5 (download DdC/Buono dal portale + fix trasversale URL firmati) — spec e piano completi, revisionati, worktree isolato pronto. Da ESEGUIRE in una nuova sessione** (richiesta esplicita di Francesco: "voglio continuare in una nuova sessione").

**Spec:** `docs/superpowers/specs/2026-07-05-b5-download-portale-e-signed-url-design.md` (commit `04b25ab`).
**Piano:** `docs/superpowers/plans/2026-07-05-b5-download-portale-signed-url.md` (13 task, TDD completo) — ultimo commit `5e9da4e` include le correzioni post-revisione advisor (vedi sotto).

**Root cause (indagine autorizzata, oltre la descrizione originale del backlog):** A) messaggio WhatsApp mai inviato (nessun componente legge `whatsapp_url`), B) portale senza UI di download, C) bucket `documenti` privato — le "public URL" salvate in DB sono rotte (verificato: 400 "Bucket not found" reale), rompe oggi in produzione il bottone DdC e le foto lavoro, D) precedente corretto già esistente in `send-pec.ts` da estrarre in helper condiviso. Include anche pulizia codice morto (2 elementi) e audit contenuto PDF DdC/Buono (Task 11-12) con eventuale fix inline.

**Revisione indipendente eseguita prima dell'esecuzione — 2 problemi reali trovati e corretti nel piano:**
1. Task 6/7 assumevano senza verifica la forma dell'embed PostgREST `dichiarazioni_conformita` (oggetto vs array) — rischio di fallimento silenzioso del link DdC sia nel portale sia internamente. Corretto: normalizzazione difensiva aggiunta a entrambi i siti.
2. Task 4 prevedeva apertura automatica `window.open()` dopo un `await` — rischio concreto di blocco popup silenzioso (specie Safari), avrebbe reintrodotto lo stesso bug che il lavoro deve risolvere. Deciso con Francesco: bottone WhatsApp esplicito post-consegna (il bottone CONSEGNA diventa un bottone WHATSAPP dopo consegna riuscita, click reale = affidabile) invece di apertura automatica.

**Worktree isolato creato:** `.claude/worktrees/b5-download-signed-url` (branch `worktree-b5-download-signed-url`, da commit `5e9da4e` su `main`). Dipendenze installate, baseline verificato in quel worktree: `tsc --noEmit` pulito, `vitest run` → **526 passed | 4 skipped**.

**Da fare all'avvio della nuova sessione:**
1. Entrare nel worktree, leggere il piano.
2. Scegliere esecuzione Subagent-Driven (consigliato) o Inline (offerta pendente, mai risposta).
3. Eseguire i 13 task TDD. **Migration** (`buono_storage_path`) richiede conferma esplicita di Francesco prima di applicarla al DB live, seguita da `supabase gen types` + `tsc --noEmit`.
4. QA browser a fine piano (dev server locale, lab E2E isolato, **mai il lab Filippo**) — checklist completa in fondo al piano.
5. Merge + deploy solo dopo QA, seguendo lo stesso schema di B17.

**Anche aperto, non toccato:** B20 (PSUR/PMS Report), B6 (SW offline), B14 (compenso_base — richiede decisione di Filippo), B16 (query ordini non supportata).

---

Backlog: 🔴 15/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B10 ✅ [B8 4/5], B11-B13 ✅, B15 ✅, B17 ✅, B18 ✅, B19 ✅). B5: piano pronto, esecuzione in nuova sessione. B20: nuovo, non pianificato. 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.

# Sessione attiva — ondata (b): Blocco 0 e Blocco 1 CHIUSI, si apre la banca dati (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-ondata-b-apertura-handoff.md`.**
Poi il piano: **`docs/roadmap/2026-07-29-ondata-b-piano-v2.md`**. Ledger: `.superpowers/sdd/progress.md`.

**Ramo `ondata-b-schermate`** (mai un worktree), aperto da `b4b09d52`. **Nulla di pubblicato su `origin`.**

✅ **T1 · T4 · T2 · T3 fatti e REVISIONATI** (ogni review ha riverificato di persona, non sulla parola):
- **T4** `src/lib/wizard/passi.ts` — il passo si identifica **per NOME**, mai per indice. Review: 2 Importanti
  (una prova **tautologica** che non poteva fallire; un caso limite non provato) → **corretti** e provati
  invertendo il segno dell'implementazione.
- **T2** i 38 tipi con `prevedeDenti` / `prevedeColore: 'catalogo'|'libero'|'nessuno'` / `prevedeArcata`.
  Review: **38/38 righe riconfrontate con la fonte, zero divergenze.**
- **T3** `src/lib/wizard/sequenza-passi.ts` — `sequenzaPassi(tipo)` e `cosaSiPerde(precedente, successivo)`
  **a due STATI** (D17: cambiare dentista sgancia il paziente, e non deve farlo in silenzio).

🔒 **D43 — Francesco ha autorizzato l'indice unico sul codice paziente DIRETTAMENTE in produzione** (T5):
**P2 rieseguita nello stesso turno → 0 duplicati** grezzi e normalizzati. Rollback: `DROP INDEX`.
🔑 **Da lì Z1 smette di essere inerte.** Registro migration verificato allineato (85, ultima `20260728103000`).

🔴 **Ancora aperti:** **B2 vs T6** (architetturale → panel) · **mockup** denti/colore (T19/T20) · **B7** (T13) ·
🆕 **la leva «si può saltare»** di riparazione/ribasatura: **sede** = un campo su `tipi-lavoro.ts`, **consumo**
in T21 — **decisione di Francesco, non ancora presa**.

**Database SOLO in lettura finora. Baseline: 294 · 0 · 916 · 48.**

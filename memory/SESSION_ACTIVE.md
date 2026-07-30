# Sessione attiva — ondata (b): l'album è pronto per l'esecuzione (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-album-foto-esecuzione-handoff.md`** — lo legge per primo
chi apre la sessione nuova. Il documento **operativo** è il piano
`docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` (**13 task in cinque blocchi**, con registro
prove P1-P20, registro letture R-P2 e censimento R-P6).
⚠️ Il ledger `.superpowers/sdd/progress.md` è **fuori dal repo git**: non può essere un punto di ripresa.

**Ramo `ondata-b-schermate`** — niente su `origin`, **albero pulito**, guardie verdi (12 documenti).
Spec **RATIFICATA** · mockup **APPROVATO** (A1 · V1 · M2 · C1) · verbale a **settantanove** decisioni.

➡️ **PROSSIMO: eseguire, UN TASK PER SESSIONE con esecutore fresco (R-E1)**, revisione fra l'uno e l'altro,
e nel brief l'istruzione esplicita di **cercare dove il piano sbaglia**.
**Ordine:** A (T1→T2→T3) → B (T4) → C (T5 🚪gate → T6-T9) → D (T10→T11→T12) → E (T13).
🛑 **A prima di D** · 🛑 **B prima di D-T12**, o «Elimina foto» promette il falso.

🔴 **Tre trappole misurate, tutte nel piano:** la finta dei test espone **solo `from`** (il primo
`storage.remove` **romperà un test** senza che sia un difetto) · **due blocchi dello scorrimento si
incastrano** → blocca **solo** il visore · **Esc collassa tutti e tre gli strati**, il back ne chiude uno.

🟡 **Da chiedere a Francesco prima del Task 12:** lo **scostamento S1** — la conferma di eliminazione sarà
una **card centrata** (`DialogConferma`), non il foglio dal basso del mockup. Gli è stato detto il 30/07 e
**non ha risposto su questo punto**. Se vuole il foglio, serve una **deroga scritta** al design system.

🔴 **Non dimenticare:** **T8 dell'ondata è ancora a cancellazione morbida** (è il Task 4). E fuori da questo
piano, prima della pubblicazione: **DPA** (D62) e **TOK-1 + CLI-1** (D53, difetto **vivo in produzione**).

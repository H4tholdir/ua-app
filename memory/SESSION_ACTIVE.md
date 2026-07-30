# Sessione attiva — ondata (b): l'album delle foto, esecuzione APERTA (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-album-foto-esecuzione-handoff.md`**. Documento operativo:
il piano `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` (**14 task**: 13 + **T9-bis**).
⚠️ Il ledger `.superpowers/sdd/progress.md` è **fuori dal repo git**: non è un punto di ripresa.

**Ramo `ondata-b-schermate`** — niente su `origin`. Spec ratificata · mockup approvato · verbale a **ottanta**
decisioni.

🆕 **D80 (30/07, ventunesima tornata):** la conferma di eliminazione è il **foglio dal basso** del mockup,
non la card centrata. **Lo scostamento S1 è RITIRATO.** Nasce **T9-bis** (`FoglioConferma`), la §5.x si
propone nel gate **T5**, **T12** lo usa. Deroga verso **§5.17** (non §5.16: l'invariante «mai modal centrato
su mobile» il foglio lo rispetta).
🔴 **Costo misurato, da risolvere nel gate T5:** `Sheet` tiene il valore precedente dello scorrimento in un
`useRef` **per istanza** (`Sheet.tsx:222`) → un secondo foglio **sopra il visore** lascerebbe la pagina
bloccata per sempre. Il foglio di conferma **non blocca**.

➡️ **IN CORSO: Task 1** (la colonna `categoria` nasce, `tipo` se ne va), esecutore fresco (R-E1).
🔑 **Verificato prima di partire:** il registro delle migration in banca dati **è allineato** ai file
(ultima: `20260729140000`) → la migration nuova va applicata per la **via registrata**, non con SQL diretto.

**Ordine:** A (T1→T2→T3) → B (T4) → C (T5 🚪gate → T6-T9, T9-bis) → D (T10→T11→T12) → E (T13).
🛑 **A prima di D** · 🛑 **B prima di D-T12**.

🔴 **Non dimenticare:** **T8 dell'ondata è ancora a cancellazione morbida** (è il Task 4). Fuori dal piano,
prima della pubblicazione: **DPA** (D62) e **TOK-1 + CLI-1** (D53, difetto **vivo in produzione**).

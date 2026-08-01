# Sessione attiva — Task 1 del registro DPA FATTO e APPLICATO, e la frase falsa tolta

🚪 **PUNTO DI RIPRESA:** il piano `docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md` — **Task 2**
(il prossimo: non tocca il database, si può partire subito). Ledger: `.superpowers/sdd/progress.md`.

✅ **Task 1 COMPLETO — la migration è APPLICATA al database vero**, con l'autorizzazione di Francesco.
Cancello riletto dal catalogo: colonne **7/7** · indici `dpa_*` **2/2** · vincoli **3/3** · trigger **1/1** ·
righe **0**. **Le tre sonde rifiutate ognuna dal vincolo GIUSTO** (`23514` coerenza · `23505` numero ·
`23505` **deduplicazione**) — la terza è quella che il piano non aveva, e riproduce la corsa vera.
Ledger delle migration in pari (**92 → 93**). `tsc` **0** · `vitest` **371 | 3** file e **4292 | 19** prove,
identico al riferimento.

✅ **La frase falsa sui dieci anni è fuori dal codice** (`clienti/[id]/page.tsx`): nessuna promessa sulla
conservazione finché il registro non c'è — quella entra al **Task 8**.

🔑 **Le due cose imparate, che valgono oltre questo task.** ① Un panel ha declassato una prova perché
leggeva **un file** invece del catalogo, e **tre righe dopo** ha scritto la sua prova nuova leggendo un file:
l'esecutore l'ha smontata sul catalogo vivo (`apply_updated_at_trigger` **è** rieseguibile). Per gli oggetti
di banca dati la fonte è `pg_proc`/`pg_trigger`/`pg_constraint`/`pg_indexes` — **e da qui si leggono**
(Management API, `read_only:true`). ② Le sonde finivano con `SELECT …; ROLLBACK;` e **la prova non si
sarebbe vista**: si mostra solo l'ultimo risultato.

🆕 **D132:** l'indice anti-doppione **esclude gli stati morti** (`revocato`, `scaduto`), o un contratto
revocato farebbe da **tappo** per sempre. Aggiornati **insieme** indice, guard del Task 5 e rilettura del
Task 6 — cambiarne uno solo dava il difetto opposto: consegnare un contratto **revocato** come corrente.

🚀 `main` = `e2ff2d67`; ramo **`dpa-registro`** avanti di 5 commit, albero pulito. **9 commit DA PUBBLICARE
in tutto** — Francesco ha scelto di pubblicare **tutto insieme a lavoro finito**.
📎 Verbale: **centotrentadue** decisioni in **quarantaquattro** tornate; la prossima è **D133**.
⚠️ L'orologio della macchina dice **1° agosto**; i documenti seguono la serie del **3 agosto**.

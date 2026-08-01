# Sessione attiva — registro DPA: Task 1 (migration APPLICATA) e Task 2 fatti

🚪 **PUNTO DI RIPRESA:** il piano `docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md` — **Task 5**
(il riuso: nessun numero bruciato). Ledger: `.superpowers/sdd/progress.md`.

🛑🛑 **CANCELLO DI PUBBLICAZIONE — il ramo NON si pubblica finché non ci sono i Task 5 E 6.** Col solo
Task 4 `generateDpa()` **emette sempre**: al **secondo scarico** dello stesso contratto l'`insert` viola
l'indice unico, l'utente vede un errore, e restano dietro **un progressivo bruciato** e **un file orfano**.
🔑 L'ordine file-poi-riga protegge la **tabella**, non la **serie dei numeri**.

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

✅ **Task 2 COMPLETO** — `src/lib/pdf/dpa-modello.ts` + la sua prova. `tsc` **0** · `vitest` **372 | 3**
file e **4294 | 19** prove.

🆕 **D132:** l'indice anti-doppione **esclude gli stati morti** (`revocato`, `scaduto`), o un contratto
revocato farebbe da **tappo** per sempre. Aggiornati **insieme** indice, guard del Task 5 e rilettura del
Task 6 — cambiarne uno solo dava il difetto opposto: consegnare un contratto **revocato** come corrente.

🆕 **D133:** `VERSIONE_MODELLO_DPA` **porta dentro l'impronta del testo** — `dpa-v2+8d98dbee`. La guardia
del Task 2 rendeva **visibile** un cambio di testo ma non **impediva** di dimenticare il numero: chi chiude
il rosso incollando la nuova impronta aveva un verde a `v2` fermo — e l'indice, vedendo stessa versione e
stessi dati, **non avrebbe riemesso** (dentista col contratto vecchio: il guasto di D126 in forma nuova).
Ora la versione cambia **da sola**. 🛑 **Regola per i Task 4, 5, 6 e 9: mai il letterale `'dpa-v2'`**, si
importa la costante.

🚀 `main` = `e2ff2d67`; ramo **`dpa-registro`** avanti di **8 commit**, albero pulito. **11 commit DA
PUBBLICARE in tutto** — Francesco ha scelto di pubblicare **tutto insieme a lavoro finito**.
📎 Verbale: **centotrentatré** decisioni in **quarantacinque** tornate; la prossima è **D134**.
⚠️ L'orologio della macchina dice **1° agosto**; i documenti seguono la serie del **3 agosto**.

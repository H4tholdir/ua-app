# Sessione attiva — la frase falsa tolta, e il Task 1 del registro DPA riscritto dal panel

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/2026-08-03-dpa-handoff.md` (la §0 va per prima) + il piano
`docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md`, **Task 1**, sezione «Perché questo task è
stato riscritto».

✅ **Fatto oggi (salvato, NON pubblicato — Francesco ha scelto di pubblicare tutto insieme dopo):**
① `src/app/(app)/clienti/[id]/page.tsx:276` — via la frase falsa sui dieci anni (D125/D126). Al suo posto la
sola istruzione operativa: **niente promesse sulla conservazione** finché il registro non esiste davvero
(quella entra al Task 8). ② **Task 1 riscritto dopo un panel di due advisor**: **sei difetti**, tre bloccanti.

🔴 **Il difetto grosso (T1-04):** l'indice unico previsto era sul **progressivo**, ma `genera_progressivo`
(`schema.sql:111-115`) dà a due richieste simultanee numeri **diversi** — quindi non collideva **mai**, il
recupero dal `23505` del Task 6 era provato **solo contro un mock**, e la corsa vera produceva **due
emissioni identiche in silenzio**. Il piano diceva «stessa rete della DdC» essendo **falso contro la DdC**,
che di indici ne ha **DUE** (`ddc_lavoro_attiva_unique` + backstop `schema.sql:1273`); regola già ratificata
per le fatture (spec ondata-4a §4 M3). Ora ci sono **due indici** + tre CHECK + tre sonde che si controllano
da sole. Corretti a cascata **Task 5** (soft-delete dell'orfana), **Task 6** (`template_versione` nella
rilettura, il perdente toglie il proprio file), **Task 9** (due `curl` in **parallelo**). Spec §6 emendata.

🚀 `main` = **`b7dfa2f2`** + il salvataggio del panel, albero pulito, **5 commit DA PUBBLICARE**
(3 documenti di ieri + la frase falsa + le correzioni del panel). `tsc` **0**, guardia **verde**.
🔜 **Prossimo:** eseguire il **Task 1** su ramo `dpa-registro` **nel repo principale** (🛑 mai un worktree),
R-E1, esecutore fresco. Si ferma sul **commit della migration**: applicarla è il punto in cui il lavoro
**aspetta Francesco**.
📎 Verbale decisioni: **centotrentadue** in **quarantaquattro** tornate; la prossima è **D133**.
🆕 **D132 (03/08):** l'indice anti-doppione del contratto **esclude gli stati morti** (`revocato`, `scaduto`),
o un contratto revocato farebbe da **tappo** alla riemissione per sempre. Aggiornati **insieme** indice,
guard del Task 5 e rilettura del Task 6: cambiarne uno solo dava il difetto **opposto** — consegnare a un
dentista un contratto revocato come se fosse quello in corso.
⚠️ L'orologio della macchina dice **1° agosto**; i documenti seguono la serie del **3 agosto**.

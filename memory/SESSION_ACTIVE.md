# Sessione attiva — ONDATA (a) FINITA come codice. Resta il collaudo, poi il merge (28/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-28-ondata-a-chiusura-handoff.md`** — leggi quello, non
questo file, per sapere cosa fare. Qui c'è solo lo stato.
🛑 **Branch `ondata-a-denti-colore`**, repo principale, **72 commit avanti a `main`. NIENTE IN
PRODUZIONE.** 🛑 **Il merge lo autorizza Francesco.**

✅ **13 task su 13 + 5 code + revisione indipendente con 5 correzioni.** FASE 7 rieseguita
dall'orchestratore: **`tsc` 0 · `eslint` 0 · `next build` ok · vitest 3622 · DB alla baseline
(294 lavori, 0 denti) · albero pulito.**
**RESTA: FASE 9 (collaudo browser 390/768/1280 × light+dark) → merge → deploy → BP-1.**

🛑 **LE MIGRATION SONO GIÀ APPLICATE SUL DATABASE VIVO**, `DROP COLUMN` compreso: «niente in
produzione» vale per il **codice**, non per lo **schema**. Oggi non rompe nulla (verificato su `main`),
ma un `git revert` non riporterebbe indietro lo schema.

🔎 **Revisione pre-merge:** `docs/roadmap/2026-07-28-revisione-pre-merge-ondata-a.md` — 3 revisori a
contesto fresco, mandati disgiunti. **3 gravi + 6 medi + 6 minori.** ✅ **Isolamento fra laboratori
provato pulito** (115 route, attacco riprodotto, 4 strati). ✅ **Le 5 correzioni decise da Francesco
sono CHIUSE:** rifacimento che clona denti e colore (`9254288c`) · le due porte allineate
(`8d5e90ba`) · guardia che ignora i commenti (`98db9114`) · gettone obbligatorio **sulla porta**
(`0c5b8db9`) · avviso sul colore scartato (`64615027`).

🔑 **Le tre frasi che l'utente legge** (uniche cose visibili di tutta l'ondata): «Non sono riuscita a
salvare il colore. Lo aggiungi dalla scheda.» · «Le zone del colore si registrano sul dente:
seleziona almeno un dente nell'odontogramma» · «Qualcun altro ha modificato questo lavoro: ricarica
la pagina». **Mostrate a Francesco, non modificate — ma nemmeno approvate esplicitamente.**

🧹 **gstack RIMOSSO** (decisione di Francesco): corpo 1,1 GB + 53 scorciatoie + symlink + configurazioni.
**Le 11 skill di design NON toccate**, verificate vive. `WORKFLOW-STANDARD.md` **non riscritto** (40+
`/gstack:*` = ridefinire il processo): ha un avviso in testa.

🛑 **MAI worktree.** ⚠️ `.next` stantio dopo un cambio di ramo → `/usr/bin/trash .next`.
🛑 **Due esecutori in parallelo: `git commit -F <msg> -- ':(literal)<percorso>'`, e dopo il commit si
verifica l'ELENCO DEI FILE** — `lint-staged` riscrive l'indice e un commit può prendersi i file
altrui o farsi sostituire i propri (successo due volte oggi).
🔑 `node scripts/tmp/sql.mjs "<query>"` (vive **solo su questo disco**).

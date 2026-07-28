# Sessione attiva — ONDATA (a) COMPLETATA SUL RAMO, mai mergiata (28/07/2026)

🛑 **Branch `ondata-a-denti-colore`**, repo principale, **57 commit avanti a `main` (contati, non
stimati). NIENTE IN PRODUZIONE.** 🛑 **Il merge lo autorizza Francesco:** *«non andiamo in produzione finché non lo dico io»*.
📌 Punto di ripresa: `docs/roadmap/2026-07-28-ondata-a-esecuzione-handoff.md` — i 23 ritrovamenti
stanno in §5-bis → §5-sexies. Voce di memoria: `MEMORY.md` **voce 58**.

✅ **13 task su 13 + tre code.** FASE 7 con output reale, **rieseguita dall'orchestratore**: `tsc` 0 ·
`eslint` 0 · `next build` ok · **vitest 3584 passati / 19 saltati** · **DB alla baseline (294 lavori,
0 righe in `lavori_denti`)**. **MANCANO: review (FASE 8) e QA browser (FASE 9), poi il merge.**
⚠️ Nessun gate estetico L2: quest'ondata non cambia un pixel, di proposito.

🛡️ **R4 (isolamento fra laboratori) PROVATO PER INTERO** sul database vero, quattro colpi ostili su
quattro strati — il più importante: cross-tenant e id inesistente danno **la stessa risposta byte per
byte**, quindi i lavori altrui **non sono enumerabili**. Evidenze:
`docs/superpowers/plans/evidenze/2026-07-27-ondata-a-isolamento.md`.
🔴 **R5 (cancellabilità) NON chiuso — la prova è FALLITA, ed è il risultato più prezioso:** sei
tabelle hanno una FK verso `laboratori` senza `ON DELETE` e nessuno le cancella. **Pre-esistente**,
latente solo perché a zero righe. → sezione dedicata in coda alla `ROADMAP-UFFICIALE.md`.
🔴 **Due progetti Playwright dichiarano file che non esistono** (`rls-cross-tenant.spec.ts`,
`api-coverage.spec.ts`): un cancello automatico creduto e mai esistito, proprio sul rischio provato a
mano. → stessa coda.

🔎 **REVISIONE PRE-MERGE FATTA (28/07):** `docs/roadmap/2026-07-28-revisione-pre-merge-ondata-a.md`
— 3 revisori a contesto fresco, mandati disgiunti. **3 gravi · 6 medi · 6 minori.** ✅ Isolamento fra
laboratori **provato pulito** (115 route, attacco riprodotto). 🛑 **Le migration sono GIÀ APPLICATE
sul database vivo**, `DROP COLUMN` compreso: «niente in produzione» vale per il **codice**, non per
lo **schema**.
✅ **G1 CHIUSO** (`9254288c`): il rifacimento **clona le righe** e copia il colore di caso — prima
copiava solo la colonna orfana, e «colore sbagliato» è il primo motivo di rifacimento. Provato in
transazione annullata: 5 righe su 5, `provenienza` conservata. 🛑 `colore_dente` **si continua a
copiare** di proposito: in produzione gira `main`, che legge ancora quella colonna.
✅ **G3 CHIUSO** (`98db9114`): la guardia sull'embed ignora i commenti. **Misurato: prima restava
verde con la riga vera cancellata, ora fallisce.**
🔴 **RESTANO 3 CORREZIONI decise da Francesco:** **G2** POST/PUT (un dente storto fa perdere **il
lavoro**, non il colore — 7 forme su 7 misurate) · **M1** il gettone `atteso_updated_at` è
**facoltativo** (riprodotto: due salvataggi, il secondo cancella il primo) · **M2** il colore
digitato male sparisce senza avviso.
🔴 **Nuovi dal G1, non toccati:** `007_rpc_rifacimento.sql` **non è la funzione viva** (il testo
insegna il modello sbagliato: progressivo `MAX+1`, `GRANT` a `authenticated`) · **`incidenti_mdr` non
viene MAI scritto sul rifacimento** (0 righe in tutta la banca dati) · l'originale **non viene
annullato** → rifacimenti illimitati · route e funzione **non concordano sugli stati** → 500 crudo.

🧹 **gstack RIMOSSO** (28/07, decisione di Francesco): corpo 1,1 GB + 53 scorciatoie (53 su 53
verificate) + symlink tracciato + voci di configurazione. **Le 11 skill di design NON toccate**,
verificate vive dopo. `WORKFLOW-STANDARD.md` **non riscritto** — 40+ `/gstack:*` lo attraversano e
sostituirli è ridefinire il processo: ha un avviso in testa.

🔑 **Le tre frasi nuove che l'utente legge** (uniche cose visibili in tutta l'ondata):
«Le zone del colore si registrano sul dente: seleziona almeno un dente nell'odontogramma» ·
«Colore «X» non riconosciuto: riselezionalo prima di salvare» ·
«Qualcun altro ha modificato questo lavoro: ricarica la pagina».

⚖️ **Metodo che ha pagato: 16 esecutori freschi, 16 difetti reali trovati** (contati sugli
identificativi) — uno in una regola scritta dall'orchestratore stesso, smentita da un repro.
✅ **Verificato prima di chiudere (la classe di difetto che solo una review di ramo intero vede):** la
scheda in **sola lettura** (`scheda-v3/`) **non rende alcun campo colore** — nessun disaccordo fra
superfici sullo stesso fatto. Gli unici due file che nominano `colore_dente` nella UI sono quelli del
form, entrambi coperti dal T12. **R-E1/R-E2 restano in vigore.** 🛑 **MAI worktree.**
⚠️ `.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit → `/usr/bin/trash .next`.
🔑 `node scripts/tmp/sql.mjs "<query>"` (vive **solo su questo disco**).

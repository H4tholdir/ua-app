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

🔑 **Le tre frasi nuove che l'utente legge** (uniche cose visibili in tutta l'ondata):
«Le zone del colore si registrano sul dente: seleziona almeno un dente nell'odontogramma» ·
«Colore «X» non riconosciuto: riselezionalo prima di salvare» ·
«Qualcun altro ha modificato questo lavoro: ricarica la pagina».

⚖️ **Metodo che ha pagato: 15 esecutori freschi, 15 difetti reali trovati** — uno in una regola scritta
dall'orchestratore stesso, smentita da un repro. **R-E1/R-E2 restano in vigore.** 🛑 **MAI worktree.**
⚠️ `.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit → `/usr/bin/trash .next`.
🔑 `node scripts/tmp/sql.mjs "<query>"` (vive **solo su questo disco**).

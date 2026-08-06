# Sessione attiva — punto di ripresa

🚪 **PUNTO DI RIPRESA — leggi prima questo:**
`docs/roadmap/2026-08-06-intervento-post-consegna-handoff.md` — **la §0 per prima**.

**Stato (06/08/2026, 15:20):** ramo **`intervento-post-consegna`**, **12 salvataggi avanti a `main`**,
**NON pubblicato**. Albero pulito. `provato:` `npm run verify:full` **uscita 0 letta da variabile**:
tsc **0** · eslint **0** · build ok · **sei guardie verdi** · vitest **5069 passate | 19 saltate**
(429 file). 📈 **Invariato rispetto a stamattina — ed è il difetto §0①.**

**§0 in tre righe:**
1. 🔴 **L'ondata non ha ANCORA una sola prova automatica.** Le nove verifiche di rifiuto del Task 1
   (comprese tre cross-tenant e quella sul `service_role`) sono state fatte **a mano**, vivono in un
   rapporto fuori da git e **non sono ripetibili**. ➡️ Prima cosa: `tests/unit/eventi-qualita-schema.test.ts`. 🆕
2. 🟠 **Quattro ritrovamenti aperti** del Task 1 (R-E2), elencati nel piano sotto «RITROVAMENTI
   ESEGUENDO». Uno **aspetta una decisione di Francesco**: se anche `eventi_qualita` — il *fatto* —
   debba diventare non modificabile.
3. 🟡 **Otto compiti su nove non fatti.** Il **Task 1 è `complete`** in `.superpowers/sdd/progress.md`:
   **non ri-eseguirlo.**

**Oggi:** spec «si deve sempre poter intervenire» **RATIFICATA** (D264-D272, due tornate), piano scritto
coi tre registri, Task 1 fatto e revisionato. Il panel ha **ribaltato il confine** (non è l'applicazione
al paziente: è la **consegna**), e la revisione ha trovato **due difetti Critici nel PIANO** — entrambi
già pagati e risolti altrove nel progetto, non cercati perché il precedente era stato cercato per nome
invece che per comportamento.

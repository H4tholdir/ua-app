# Sessione attiva — ondata (a) del wizard: ESECUZIONE AVVIATA (27/07/2026, sera tardi)

🛑 **Branch `ondata-a-denti-colore`** (repo principale, mai worktree). Piano:
`docs/superpowers/plans/2026-07-27-wizard-ondata-a-dato-e-api.md` — 13 task, **2 chiusi**.

**Fatto:** spec **ratificata** · piano scritto · **Task 1** (dominio FDI a 52 codici + fix quadranti decidui)
· **Task 2** (precedenza colore riga→caso). Suite 3440 verdi · tsc 0 · eslint pulito.

🔑 **ACCESSO SQL AL DATABASE: C'È.** `SUPABASE_DB_URL` sta in `.env.local` — strumento pronto:
`node scripts/tmp/sql.mjs "<query>"` (non stampa mai la stringa di connessione). La riserva dichiarata
prima («servirebbe una password») era **sbagliata**: le verifiche del piano si possono fare da qui.

🔴 **Tutti e due i task hanno smentito il piano che li generava — la revisione fra un compito e l'altro sta
pagando:**
1. **Task 1:** il piano dava per innocuo il raggruppamento su quadranti 1-4 «perché adulto e deciduo non
   condividono lo schermo». Condividono il **codice**: controprova, **0 denti su 20** resi in dentizione
   decidua. Nessun gate lo vedeva (tsc compila, eslint tace, nessun test nomina `Odontogramma`).
2. **Task 2:** Task 10 toglieva `colore_collo/corpo/incisale` dall'allowlist mentre Task 12 non le mandava
   al nuovo endpoint → **tre tendine morte**, violazione della direttiva «ogni campo si corregge fino alla
   consegna». Corretto: le colonne esistono già in `lavori_denti`, bastava collegarle.
3. **Regola nuova nei vincoli del piano:** il rosso da «modulo non trovato» **non prova nulla** — nel Task 2
   quattro asserzioni su sette passavano contro una funzione vuota.

**PROSSIMO: Task 3** — prima migration (unique `(id, laboratorio_id)` + `colori_dentali` con 48 codici).
⚠️ Da lì in poi si tocca il database vero: `npx supabase db push` è collegato al progetto.

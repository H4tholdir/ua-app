# Sessione attiva — ondata (a) del wizard: 4 task su 13 (27/07/2026, notte)

🛑 **Branch `ondata-a-denti-colore`** (repo principale, mai worktree). Niente in produzione.
Piano: `docs/superpowers/plans/2026-07-27-wizard-ondata-a-dato-e-api.md`.

**CHIUSI:** T1 dominio FDI 52 codici + fix quadranti decidui · T2 precedenza colore riga→caso ·
T3 migration `colori_dentali` (48 codici) + unique `(id, laboratorio_id)` · T4 tabella `lavori_denti`
(vincolo FDI provato con 14 rifiuti su 14, FK composita, RLS, REVOKE service_role compreso).
Suite 3440 verdi · tsc 0 · eslint pulito · database: 48 colori, 0 righe denti, 1 policy.

🔑 **ACCESSO SQL:** `node scripts/tmp/sql.mjs "<query>"` (usa `SUPABASE_DB_URL` da `.env.local`, non stampa
mai la stringa). `npx supabase db push --yes` — **senza `--yes` si blocca su un prompt.**

🔴 **OGNI task ha trovato un difetto REALE nel piano. La revisione fra un compito e l'altro sta pagando:**
1. **T1:** raggruppamento su quadranti 1-4 dato per innocuo → **0 denti su 20** resi in dentizione decidua.
   Nessun gate lo vedeva (tsc compila, eslint tace, nessun test nomina `Odontogramma`).
2. **T2:** T10 toglieva `colore_collo/corpo/incisale` dall'allowlist e T12 non le mandava al nuovo endpoint
   → **tre tendine morte**. Corretto: le colonne c'erano già in `lavori_denti`.
3. **T3:** il colore del wizard è **testo libero** (`PassoPaziente.tsx:94-97`) e il catalogo è
   case-sensitive: `A3` sì, `a3` no. Prerequisito aggiunto a **T11**: normalizzare e confrontare col
   catalogo, **mai far fallire la creazione del lavoro** per un colore digitato male.
4. **T4:** le tre zone del ceramista accettavano **qualunque stringa** (`'ZZZ'`, `'pippo'` provati sul DB),
   su un dato che alimenta la DdC → **3 FK composite aggiunte al T5**, più indice duplicato da togliere e
   `updated_at` senza trigger.

🟡 **Da tenere d'occhio:** finché il **T5** non è fatto, un laboratorio con righe denti sarebbe
**incancellabile** (`admin_delete_laboratorio` non le nomina ancora). `lavori_denti` usa `ON DELETE NO ACTION`
mentre le 7 tabelle sorelle usano `CASCADE`: nessun impatto oggi (nessun endpoint DELETE su `lavori`).

**PROSSIMO: Task 5** — colonne di caso + snapshot + `DROP COLUMN colore_dente` (W23, **prima verificare con
SQL che sia vuota**) + `admin_delete_laboratorio` (corpo da **copiare verbatim** da
`20260721090100`, firma `p_lab_id UUID` → `JSONB`) + i tre fix del T4.

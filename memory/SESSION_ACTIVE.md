# Sessione attiva — ondata (a): T9 chiuso, si riparte dal T10 (28/07/2026)

🛑 **PUNTO DI RIPRESA:** `docs/roadmap/2026-07-28-ondata-a-esecuzione-handoff.md`.
🛑 **Branch `ondata-a-denti-colore`**, repo principale, **39 commit avanti a `main`. Niente in
produzione, mai mergiato.** 🛑 Il merge lo autorizza Francesco.

✅ **T9 CHIUSO** (commit `759fc183`): `POST /api/lavori` crea lavoro + progressivo + denti in **una
transazione sola** via `lavoro_crea_atomico`. **18 test nuovi, 18 su 18 cadono contro un abbozzo
sempre-201.** Suite intera **3478 verdi · tsc 0 · eslint 0 · `next build` ok · DB alla baseline
(294 lavori, 0 denti)** — `next build` e i test rieseguiti **anche dall'orchestratore**, non solo
riferiti. 🔑 `denti` presente ma non-array → **422**, non un «nessun dente»
silenzioso (buco del piano, chiuso). 🛑 `FK_FIELDS_INSERT` (`route.ts:134-162`) è l'**unica**
guardia tenant su `cliente_id`/`paziente_id`/`tecnico_id`/`ciclo_id`: la RPC non li controlla.

✅ **CODA DEL T9 CHIUSA** (commit `63361649`): l'anno del numero di lavoro segue **Roma**, non il fuso
del processo — `annoRoma()` esisteva già. Non cosmetico: `anno_lavoro` alimenta `genera_progressivo`,
componente della **chiave primaria di `progressivi_anno`**. 🔑 Il difetto era stato etichettato
«pre-esistente, fuori mandato» **ma era codice del T9**: con quell'etichetta non aveva proprietario.
🔴 **Nono difetto, nella diagnosi:** la suite **non fissa il fuso**, questo Mac è a Roma, e il test
prescritto sarebbe passato **verde col difetto in casa** → chiuso con `vi.stubEnv('TZ','UTC')`.

🔴 **RITROVAMENTI ancora aperti — riferiti, non toccati** (dettaglio in §5-bis dell'handoff):
① il piano sbagliava sulla «rete di sicurezza»: i 2 test indicati mockavano il **meccanismo
vecchio**, adattati (4 test) · ② **POST e PUT validano diversamente gli stessi dati**
(`ruolo:'pippo'` → 422 sul PUT, **500** sul POST): modulo di validazione unico, ✅ **assegnato al T11
e scritto NEL PIANO** (diceva «T11 o T12», e due candidati vogliono dire nessuno) · ③
`crea-lavoro.ts:164,191-196` **usa ancora la PATCH fail-soft**: il percorso atomico esiste e nessuno
lo chiama — conferma dal vivo che **T10 senza T11 perde i denti in silenzio** · ④ il wizard scrive
`colore_dente` (colonna legacy), il percorso nuovo la coppia `colore_scala`/`colore_codice`: due
fonti dello stesso fatto (R3) · ⑤ `genera_numero_lavoro()` (`schema.sql:1996-2000`) ha lo **stesso**
difetto dell'anno, in SQL — **latente**, zero chiamanti · ⑥ 🟡 **da decidere, di nessun task:**
fissare `TZ:'UTC'` in `vitest.config.ts`? Oggi `fatture-data-roma.test.ts:42-48` non può fallire su
una macchina italiana.

**ONDATA (a) — 9 task su 13.** **RESTANO:** T10 sentinelle (+ tabella di destinazione R-P6) ·
T11 wizard · T12 form · T13 prove + FASE 7.
🛑 **T10, T11, T12 nello STESSO deploy** (`[id]/route.ts:255-264` scarta senza errore).

⚖️ **REGOLE DI METODO** (`CLAUDE.md` §0C): R-P1 · R-P2 · R-P6 · R-P4 · R-E1 · R-E2.
🛑 **NON retroattive su T9-T13**; unico innesto: al **T10 la tabella di destinazione R-P6**.
🛑 **MAI un git worktree.** ⚠️ `.next` stantio dopo un cambio di ramo fa fallire `tsc` nel
pre-commit → `/usr/bin/trash .next`. ⚠️ Pre-commit: `eslint --max-warnings=0` + guardia CSRF +
guardia «Riduci movimento» (~5 s).

🔑 `node scripts/tmp/sql.mjs "<query>"` (vive **solo su questo disco**) · `npx supabase db push --yes`.

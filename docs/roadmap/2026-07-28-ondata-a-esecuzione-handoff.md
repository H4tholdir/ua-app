# Handoff — Ondata (a) del wizard: si riprende dal Task 9 (28/07/2026)

**Per:** la sessione successiva, contesto pulito.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi questo documento. **Non serve altro.**
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **BP-1** prima di fermarsi.

---

## 0. In una riga

**8 task su 13 chiusi, la parte «database e API» è finita.** Branch `ondata-a-denti-colore`,
18 commit, **3453 test verdi · tsc 0 · eslint 0 · `next build` ok**. 🛑 **Niente in produzione, mai
mergiato.** Restano T9-T13: **è la parte che tocca il codice vivo dell'app.**

---

## 1. I due documenti che contano

| File | Cosa contiene |
|---|---|
| `docs/superpowers/plans/2026-07-27-wizard-ondata-a-dato-e-api.md` | **IL PIANO** — 13 task TDD, già corretto 5 volte con quello che l'esecuzione ha smentito |
| `docs/processes/2026-07-27-lezioni-piano-ondata-a.md` | **PERCHÉ 8 TASK SU 8 HANNO TROVATO UN DIFETTO** — cause, controprove, 3 regole proposte da ratificare |

Spec ratificata: `docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md`
Verbale (23 decisioni): `docs/design/decisions/2026-07-27-wizard-nuovo-lavoro-brainstorming.md`

---

## 2. 🔑 Lo strumento che cambia tutto

**Hai accesso SQL diretto al database.** Non chiedere a Francesco di eseguire query:

```bash
node scripts/tmp/sql.mjs "select count(*) from lavori;"
```

Legge `SUPABASE_DB_URL` da `.env.local` e **non stampa mai** la stringa di connessione.
⚠️ `npx supabase db push --yes` — **senza `--yes` si blocca su un prompt** in sessione non interattiva.
⚠️ Non stampare mai `.env.local` né la connection string.

---

## 3. Cosa è in casa (verificato sul database, non riferito)

- `colori_dentali` — 48 codici: 16 VITA classical · 3 fuori scala (T/BL/OM) · 29 3D-Master. `hex` **NULL
  di proposito** (i valori veri si importano dalla fonte pubblicata nell'ondata b).
- `lavori_denti` — una riga per dente. `fdi smallint` + CHECK strutturale: **14 valori sbagliati provati,
  14 rifiutati**. FK **composita** verso `lavori (id, laboratorio_id)`. RLS con `public.current_lab_id()`.
  `REVOKE ALL`, **`service_role` compreso**.
- `lavori` — `colore_scala` · `colore_codice` · `denti_snapshot` · `denti_snapshot_at`.
- `dichiarazioni_conformita.colore_dente` — **eliminata** (W23), verificata vuota prima del DROP.
- `admin_delete_laboratorio` — **integra**: 48 → 49 istruzioni DELETE, misurate sul corpo installato.
- Due RPC `SECURITY DEFINER`: `lavoro_crea_atomico` e `lavoro_denti_sostituisci_atomica`. Solo
  `service_role` può eseguirle.
- `PUT /api/lavori/[id]/denti` — 13 test, **zero asserzioni sopravvivono a un abbozzo sempre-200**.

---

## 4. 🛑 Il vincolo che decide l'ordine dei prossimi task

**T10, T11 e T12 vanno nello STESSO deploy.** Appena i 7 campi escono da `PATCHABLE_FIELDS`, i due
scrittori odierni **smettono di salvare in silenzio**: `route.ts:259-264` scarta le chiavi fuori allowlist
**senza errore** — l'utente vede «Salvato» su un dato che non c'è.

Non chiudere il T10 e fermarsi. O si arriva al T12, o non si parte.

---

## 5. Quello che i task già fatti hanno lasciato detto — leggilo PRIMA di scrivere

- **T9:** `lavoro_crea_atomico` **non** verifica `cliente_id`/`paziente_id`/`tecnico_id`/`ciclo_id` contro
  `p_lab` (sono FK semplici, non composite). Riprodotto: lavoro creato con un cliente di un altro
  laboratorio. **La guardia vive in `FK_FIELDS_INSERT` nella route: il T9 DEVE tenerla.**
- **T11:** il colore del wizard è **testo libero** (`PassoPaziente.tsx:94-97`), non una tendina, e il
  catalogo è **case-sensitive**: `A3` si trova, `a3` no. Normalizzare a maiuscolo e confrontare col
  catalogo **prima** di spedire; se non è in catalogo, non mandarlo come colore. 🛑 **Mai far fallire la
  creazione del lavoro per un colore digitato male** — al banco si digita di fretta.
- **T12:** il punto di scrittura **non è `TabClinica.tsx`** (che è controllato e non salva): è
  `useLavoroForm.ts:36-80`. Lì c'è già il precedente esatto da ricalcare (`delete patchBody.numero_cassetta`).
  E **riallineare `updated_at` dopo ogni salvataggio**, o il secondo salvataggio prende un 409 **con un
  utente solo collegato**.
- **Noto e non chiuso:** una coppia `(scala, codice)` sintatticamente valida ma **inesistente in catalogo**
  torna **500** dal `PUT /denti`. Chiuderlo vuole una lettura di `colori_dentali` dalla route.
- **`tsc --noEmit` NON valida la firma degli handler di rotta:** serve `npx next build`.
- **Il gettone di concorrenza:** `timestamptz` ha precisione al **microsecondo**, `Date` di JS al
  millisecondo. Far passare `atteso_updated_at` da un `new Date(...)` produce un **409 permanente**.

---

## 6. Come si esegue (metodo scelto da Francesco, e ha funzionato)

**Un task alla volta, ognuno a un esecutore fresco**, con revisione fra l'uno e l'altro. Nel brief:
il percorso del piano, il task, lo strumento SQL, e **l'istruzione di cercare attivamente dove il piano
sbaglia** — 8 volte su 8 ha trovato qualcosa.

🔑 **Regola che ha pagato:** un esecutore che trova un difetto **fuori dal proprio mandato lo RIFERISCE,
non lo corregge di nascosto.** Se il T4 avesse zittito il problema delle zone colore, il piano sarebbe
rimasto sbagliato per tutti i task successivi.

🔑 **E il rosso da «modulo non trovato» non prova nulla:** dopo il primo rosso, metti un abbozzo inerte e
conta **quante** asserzioni si accendono.

---

## 7. Trappole logistiche — ancora vere

- 🛑 **Branch nel repo principale, mai worktree** (doppio `package-lock.json` → tutte le route 404).
- ⚠️ `.gitignore` riga 62 ignora `*.png`: gli screenshot vanno aggiunti con `git add -f`.
- ⚠️ Il pre-commit gira `eslint --max-warnings=0`: `npx eslint src/` **prima** di committare.
- ⚠️ `../CLAUDE.md` e `../ANALISI/` stanno **fuori** dal repo git: non provare a committarli.
- 🛑 **Le password non le digita l'assistente.** Per il QA dietro login entra Francesco.
- ⚠️ I dati in DB sono **di prova** (`ua-app/CLAUDE.md` §8): la fedeltà del dato migrato non è un vincolo,
  **la robustezza dell'applicazione sì**. Una migration che **aborta** resta un problema.
- 🛑 **Lasciare il database pulito** dopo ogni prova: baseline **294 lavori, 0 righe in `lavori_denti`**.

---

## 8. Dopo il T13

FASE 7 (tsc + vitest + build con **output reale**) → review → QA browser → **BP-1** → merge → deploy.
⚠️ **Nessun gate estetico L2 in questa ondata**: non cambia un pixel, di proposito. Serve nell'**ondata (b)**.

Poi: **ondata (b)** — wizard adattivo + odontogramma v3 **+ la metà rimasta del nome/cognome paziente**
(oggi il wizard scrive tutto nel cognome, e **la targa della cassetta non è ancora migliorata**);
l'indicatore di avanzamento dei passi è **aperto**, va deciso sui mockup.
Poi: **ondata (c)** — Dichiarazione di Conformità + gancio nel precheck.

---

## 9. 📌 Quello che questa notte lascia

> **Un piano non è un documento: è codice non ancora eseguito.**

Otto task, otto difetti nel piano — e **nessuno arrivato all'utente**. Il conto non è peggiore del solito:
è migliore, perché il controllo è arrivato **prima** invece che al collaudo. Le cause e le tre regole
proposte stanno in `docs/processes/2026-07-27-lezioni-piano-ondata-a.md`, **da ratificare con Francesco**
prima di incidere qualsiasi cosa in `CLAUDE.md`.

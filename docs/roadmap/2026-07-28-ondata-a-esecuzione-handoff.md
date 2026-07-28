# Handoff — Ondata (a) del wizard: si riprende dal Task 10 (28/07/2026)

> ✅ **AGGIORNATO il 28/07/2026: il T9 è chiuso** (commit `759fc183`). Il titolo diceva «dal Task 9».
> Quello che il T9 ha lasciato detto sta in **§5-bis**, subito dopo §5. Il resto del documento è
> invariato e ancora valido.

**Per:** la sessione successiva, contesto pulito.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi questo documento. **Non serve altro.**
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **BP-1** prima di fermarsi.

---

## 0. In una riga

**9 task su 13 chiusi** (T9 chiuso il 28/07, v. §5-bis)**, la parte «database e API» è finita.**
Branch `ondata-a-denti-colore`, **37 commit avanti a `main`** — il riferimento storico sotto diceva
29 al momento in cui questo documento è nato (i commit dopo il 18° sono documentazione e memoria della notte del
27-28/07, nessun codice del piano), **3453 test verdi · tsc 0 · eslint 0 · `next build` ok**.
🛑 **Niente di questa ondata in produzione, mai mergiato.** Restano T9-T13: **è la parte che tocca il
codice vivo dell'app.**

### ⚙️ Cosa è cambiato NELLA NOTTE fra il 27 e il 28 — leggilo, cambia come lavori

1. **Sei regole di metodo sono ora permanenti** (`ua-app/CLAUDE.md` §0C, blocco «REGOLE DI PIANO»):
   R-P1 · R-P2 · R-P6 · R-P4 (piano e TDD) · R-E1 · R-E2 (esecuzione). 🛑 **NON sono retroattive su
   T9-T13**, v. §4-bis qui sotto.
2. 🛑 **MAI un git worktree** — è ora nella **FASE 5**, non più solo in questo handoff. Vale anche
   quando è una skill a proporlo. Si fa `git checkout -b` nel repo principale.
3. **Due controlli girano da soli a ogni commit** (`.husky/pre-commit`): la guardia CSRF (~0,3 s) e
   quella su «Riduci movimento» (~4,6 s). Se un tuo commit si ferma, guarda cosa dicono: sono loro.
4. ⚠️ **`.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit** con un errore che
   *sembra* un difetto tuo (`Cannot find module '.../route.js'`). Non lo è: **cestina `.next`**
   (`/usr/bin/trash .next`, si rigenera) e ricommitta.
5. **`main` è avanzato** (`24474b5c`, in produzione): guardie riparate + correzione dell'accesso con
   passkey. **Già mergiato dentro questo ramo**, non serve fare niente.
6. **I ruoli sono CINQUE**, non quattro: manca(va) `admin_sistema` — v. §9 delle istruzioni.

---

## 1. I due documenti che contano

| File | Cosa contiene |
|---|---|
| `docs/superpowers/plans/2026-07-27-wizard-ondata-a-dato-e-api.md` | **IL PIANO** — 13 task TDD, già corretto 5 volte con quello che l'esecuzione ha smentito |
| `docs/processes/2026-07-27-lezioni-piano-ondata-a.md` | **PERCHÉ 8 TASK SU 8 HANNO TROVATO UN DIFETTO** — cause, controprove, e (§7) il **verbale del panel**: ✅ **regole RATIFICATE il 28/07/2026 e in vigore in `ua-app/CLAUDE.md` §0C** (R-P1 · R-P2 · R-P4 · R-P6 · R-E1 · R-E2) |

Spec ratificata: `docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md`
Verbale (23 decisioni): `docs/design/decisions/2026-07-27-wizard-nuovo-lavoro-brainstorming.md`

---

## 2. 🔑 Lo strumento che cambia tutto

**Hai accesso SQL diretto al database.** Non chiedere a Francesco di eseguire query:

```bash
node scripts/tmp/sql.mjs "select count(*) from lavori;"
```

Legge `SUPABASE_DB_URL` da `.env.local` e **non stampa mai** la stringa di connessione.
🛑 **Vive solo su questo disco: `scripts/tmp/` è ignorato da git** (verificato il 28/07: 54 file, zero
tracciati). Non sopravvive a un clone pulito né a un cambio di macchina — se un domani non c'è, va
riscritto, non cercato nel repo.
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

## 4-bis. 🛑 Le regole nuove e QUESTO piano — regola di transizione

Il piano dell'ondata (a) è **anteriore alle regole ratificate il 28/07**: non ha il registro delle
prove, non ha la colonna `letto:`, non ha il censimento degli identificatori.

**R-P1, R-P2 e R-P4 NON si applicano retroattivamente ai task T9-T13.** L'esecutore del T9 **non si
ferma** per la loro assenza, e R-E1 non gli chiede di farlo. Vincolano **dal prossimo piano in poi**.

**Un solo innesto, e non è formale — è il punto dove quella regola paga:** al **T10** si scrive la
**tabella di destinazione di R-P6**, una riga per ogni nome che esce da `PATCHABLE_FIELDS`, con scritto
**chi lo scriverà d'ora in avanti**. Costa poco (il censimento dei sette campi è già nel piano, §51) e
copre esattamente il pericolo che obbliga T10-T11-T12 a viaggiare in un unico deploy: **un nome che esce
dall'allowlist senza uno scrittore rediretto è un dato che smette di salvarsi in silenzio.** Una riga
senza destinazione = il task non è finito.

⚠️ **Restano invece pienamente in vigore, anche qui: R-E1** (un compito, un esecutore fresco, con nel
brief l'istruzione di cercare dove il piano sbaglia) **e R-E2** (un difetto fuori mandato si riferisce,
non si patcha di nascosto). Sono le due che hanno prodotto 8 catture su 8.

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

## 5-bis. Quello che il T9 ha lasciato detto (28/07/2026, commit `759fc183`)

**Fatto:** `POST /api/lavori` crea progressivo + lavoro + denti in **una transazione sola** via
`lavoro_crea_atomico`. Nella route **non esiste più alcun INSERT su `lavori`**. 18 test nuovi,
**18 su 18 cadono contro un abbozzo sempre-201** (misurato, non dedotto). Suite intera 3477 verdi,
`tsc` 0, `eslint` 0, `next build` ok, DB alla baseline.

- 🔑 **Un buco del piano, chiuso dentro il mandato:** `Array.isArray(body.denti) ? … : []` avrebbe
  trasformato un oggetto o una stringa in **lista vuota** → 201, zero denti, nessun errore. Ora
  `denti` presente ma non-array è **422**. Chi non ha denti da mandare **omette la chiave**.
- 🛑 **`FK_FIELDS_INSERT` (`route.ts:134-162`) è viva e resta l'UNICA guardia di isolamento fra
  laboratori** su `cliente_id`/`paziente_id`/`tecnico_id`/`ciclo_id`: `lavoro_crea_atomico` **non**
  li verifica contro `p_lab`. Chi tocca quella route non la sposta e non la salta. Il T9 le ha anche
  aggiunto il test di regressione che non aveva (prima solo `ciclo_id` era coperto).

### 🔴 Ritrovamenti fuori mandato — riferiti, NON toccati (R-E2)

1. **Il piano sbagliava sulla propria «rete di sicurezza»** (Step 4). I due test indicati come prova
   che il contratto non cambia mockavano il **meccanismo vecchio**, non il contratto
   (`mockRpc.mockResolvedValue({ data: 1 })` era il ritorno di `genera_progressivo`). Dopo la
   sostituzione 4 test cadevano. Adattati: il commit è di **4 file, non 2**, e il motivo è questo.
2. 🛑 **POST e PUT rispondono diversamente sugli stessi dati.** `[id]/denti/route.ts:100-155` valida
   `ruolo`, `provenienza`, i cinque campi testo, `coppia_ck`, `zone_ck` e **normalizza**; il POST
   valida fdi/duplicati/oggettualità e passa gli oggetti grezzi. `{fdi:11, ruolo:'pippo'}` → **422
   sul PUT, 500 sul POST**. Non unificato di proposito: il colore è di **T11**, che potrebbe volerne
   canonicalizzare i valori (`a3`→`A3`). **Estrarre un modulo di validazione unico — assegnato a
   T11 o T12.** Il PUT stesso dichiara a `:14-17` che i due elenchi devono dire la stessa cosa.
3. 🛑 **Conferma dal vivo del vincolo di sequenza §4.** `src/lib/wizard/crea-lavoro.ts:164` crea via
   POST e `:191-196` fa la **PATCH fail-soft** con `denti_coinvolti` + `colore_dente`. Il T9 rende
   *disponibile* il percorso atomico, **ma nessuno lo usa ancora**. Se il T10 atterra prima che il
   T11 migri il wizard, il passo 4 perde i denti in silenzio.
4. **Due fonti dello stesso fatto (R3):** il wizard scrive `colore_dente` (colonna singola legacy,
   `crea-lavoro.ts:196`), il percorso nuovo la coppia `colore_scala`/`colore_codice`. Nessuno le
   riconcilia. Territorio T11/T2.
5. **Il 500 sulla coppia inesistente in catalogo esiste anche sul POST**, non solo sul PUT.
   Difetto già assegnato a T11: confermato, non toccato.
6. **Difetti nel codice di test del piano** (validi per i task che ne ricalcano la forma):
   (a) `const rpcMock = vi.fn()` referenziato dentro una factory `vi.mock` issata è un **crash TDZ**
   — serve `vi.hoisted()`, convenzione già usata dai test vicini; (b) lo stub di
   `getFreshLabContext` del piano non restituisce il campo `lab`, e contro il vero
   `assertLabOperativo` fallirebbe fail-closed.
7. **`anno = new Date().getFullYear()` convive con `oggiRomaISO()`** per `data_ingresso`: intorno
   alla mezzanotte del 1° gennaio i due non concordano (il server è in UTC), contro la convenzione
   W7 citata in `crea-lavoro.ts`. Finestra strettissima, **non chiuso**: è una riga, ma non è del
   mandato del T9 deciderlo.

### Forme d'ingresso — censimento del T9
**Coperte:** chiave assente · `[]` · lista valida · `fdi` 19 · `fdi` `"11"` stringa · dente ripetuto
· elemento non-oggetto · elemento `null` · `denti` oggetto · `denti` stringa · `denti: null` · body
non-JSON → 400 · body `null` → 400 · body array alla radice → 400 · RPC in errore → 500 · RPC con
`esito != ok` → 500 · `cliente_id` cross-tenant → 403.
**Non coperte, con motivo:** `ruolo`/`provenienza` fuori dominio → 500 dal CHECK (ritrovamento 2) ·
mezza coppia scala/codice e coppia fuori catalogo → **T11** · `fdi` decimale → già chiusa dal
dominio (`Number.isInteger`) · chiavi ignote sull'oggetto dente → **inerti**, la RPC legge solo le
chiavi note via `d->>'…'` (⚠️ differenza dichiarata rispetto al PUT, che le scarta normalizzando).

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
  Dal 28/07 è anche nelle istruzioni permanenti (FASE 5), non solo qui.
- ⚠️ **`.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit** con `Cannot find module
  '.../route.js'`. Non è un difetto tuo: `/usr/bin/trash .next` e ricommitta.
- ⚠️ **La cancellazione ricorsiva definitiva è bloccata** fuori da `/private/tmp/claude-*`,
  `scripts/tmp/` e `node_modules` (protezione dopo l'incidente del 24/07): si usa `/usr/bin/trash`,
  che è ripristinabile. 🔑 **Quel blocco legge il testo dell'INTERO comando**, quindi scatta anche se
  la sequenza vietata compare dentro un **messaggio di commit** — successo il 28/07. Non è un errore
  tuo: riformula il messaggio a parole e riprova.
- ⚠️ `.gitignore` riga 62 ignora `*.png`: gli screenshot vanno aggiunti con `git add -f`.
- ⚠️ Il pre-commit gira `eslint --max-warnings=0`: `npx eslint src/` **prima** di committare.
  **Dal 28/07 gira anche la guardia CSRF e quella «Riduci movimento»** (~5 s in tutto).
- ⚠️ **macOS ha bash 3.2:** con `set -u`, `"${ARRAY[@]}"` su un array **vuoto** non dà una lista vuota
  ma «unbound variable». Idioma da usare: `${ARR[@]+"${ARR[@]}"}`.
- ⚠️ `../CLAUDE.md` e `../ANALISI/` stanno **fuori** dal repo git: non provare a committarli.
- 🛑 **Le password non le digita l'assistente.** Per il QA dietro login entra Francesco.
- ⚠️ I dati in DB sono **di prova** (`ua-app/CLAUDE.md` §8): la fedeltà del dato migrato non è un vincolo,
  **la robustezza dell'applicazione sì**. Una migration che **aborta** resta un problema.
- 🛑 **Lasciare il database pulito** dopo ogni prova: baseline **294 lavori, 0 righe in `lavori_denti`**.

---

## 8. Dopo il T13

FASE 7 (tsc + vitest + build con **output reale**) → review → QA browser → **BP-1** → merge → deploy.
⚠️ **Nessun gate estetico L2 in questa ondata**: non cambia un pixel, di proposito. Serve nell'**ondata (b)**.
🛑 **Il merge lo autorizza Francesco**, non si dà per scontato: *«non andiamo in produzione finché non lo
dico io»* (28/07/2026).

Poi: **ondata (b)** — wizard adattivo + odontogramma v3 **+ la metà rimasta del nome/cognome paziente**
(oggi il wizard scrive tutto nel cognome, e **la targa della cassetta non è ancora migliorata**);
l'indicatore di avanzamento dei passi è **aperto**, va deciso sui mockup.
Poi: **ondata (c)** — Dichiarazione di Conformità + gancio nel precheck.
In coda a **tutta** la roadmap: **ondata «accesso con passkey»**, 5 difetti censiti il 28/07 — sezione
dedicata in fondo a `docs/roadmap/ROADMAP-UFFICIALE.md`. 🛑 La questione CSRF su quelle route è
**chiusa**, non si riapre.

---

## 9. 📌 Quello che questa notte lascia

> **Un piano non è un documento: è codice non ancora eseguito.**

Otto task, otto difetti nel piano — e **nessuno arrivato all'utente**. Il conto non è peggiore del solito:
è migliore, perché il controllo è arrivato **prima** invece che al collaudo.

✅ **Aggiornamento 28/07/2026 — le regole sono state ratificate e incise.** Panel 3× (architettura ·
costo · **avversariale**), sei regole in vigore in `ua-app/CLAUDE.md` §0C, due scartate con motivo
scritto, una nuova (**R-P6**) nata dalla lente avversariale. Verbale in
`docs/processes/2026-07-27-lezioni-piano-ondata-a.md` **§7**.

🛑 La regola di transizione che riguarda questi task sta in **§4-bis**, subito dopo il vincolo di
sequenza: è lì che serve, non in fondo.

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
   canonicalizzare i valori (`a3`→`A3`). Il PUT stesso dichiara a `:14-17` che i due elenchi devono
   dire la stessa cosa.
   ✅ **ASSEGNATO il 28/07: è del T11, ed è scritto nel PIANO**, non solo qui — il brief di un
   esecutore si costruisce dal piano, non da questo handoff. Diceva «T11 o T12», e **due candidati
   vogliono dire nessuno**: stessa forma di «una riga senza destinazione» che R-P6 vieta.
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
7. ✅ **CHIUSO — e non era «fuori mandato»: era codice che il T9 aveva appena scritto.**
   `anno = new Date().getFullYear()` conviveva con `oggiRomaISO()`. L'esecutore l'aveva classificato
   «pre-esistente», e con quell'etichetta il difetto **non aveva un proprietario**: T10 è un altro
   file, T11 è il wizard, T13 sono le prove sul database. 🔑 **Un difetto etichettato male è un
   difetto orfano** — è la stessa forma del pericolo che questa ondata combatte, applicata a un
   difetto invece che a un campo. Correzione: commit **`63361649`**, `annoRoma()` al posto di
   `new Date().getFullYear()` — la funzione **esisteva già** (`data-roma.ts:21-23`), scritta apposta
   «per numeri documento e serie progressive fiscali».
   ⚠️ **Non era cosmetico:** `anno_lavoro` viaggia nella RPC, diventa `v_anno` e alimenta
   `genera_progressivo(p_lab,'lavoro',v_anno)` (`20260727120300_lavori_denti_rpc.sql:138,144`), che
   è **componente della chiave primaria di `progressivi_anno`**. Fra le 00:00 e le 01:00 di Roma del
   1° gennaio un lavoro sarebbe nato con `data_ingresso` del 2027 e un numero pescato dalla **serie
   2026** — sulla catena che alimenta la DdC e la fatturazione.
   🔴 **Il nono difetto, e stava nella diagnosi, non nel codice:** la diagnosi diceva «anno **UTC**
   del server». È l'anno **locale del processo**. La suite **non fissa il fuso da nessuna parte**
   (verificato in `vitest.config.ts`, `tests/setup.ts`, `package.json`, `.github/workflows/`) e
   questo Mac risolve `Europe/Rome`: sotto quel fuso **non esiste istante** che separi i due valori,
   e il test prescritto sarebbe passato **verde col difetto ancora in casa**. Chiuso con
   `vi.stubEnv('TZ','UTC')` nel singolo caso (pattern già di casa: `push-timeout.test.ts:20`).
   **Un test che non può fallire non è una rete, è un disegno di una rete.**

8. **`genera_numero_lavoro()` ha lo STESSO difetto, in SQL** (`supabase/schema.sql:1996-2000`):
   ricava `v_anno` da `EXTRACT(YEAR FROM now())`, cioè l'anno della sessione Postgres (UTC su
   Supabase). **Latente**: nessun chiamante in `src/` — la referenziano solo la propria definizione,
   la migration di hardening di `search_path` e i tipi generati. Non toccata: chiuderla vuole una
   migration, e questa ondata non ne apre altre.
9. **La suite di test non fissa il fuso orario, e questo indebolisce una prova esistente.**
   `tests/unit/fatture-data-roma.test.ts:42-48` usa lo stesso identico istante di confine **senza**
   fissare `TZ`: su una macchina italiana non può fallire, discrimina solo in CI. Oggi non nasconde
   nulla (quella route usa già `annoRoma()`), ma **non è la rete che sembra**. La decisione se
   fissare `TZ: 'UTC'` in `vitest.config.ts` tocca un terzo file e vale per tutta la suite:
   **è una decisione da prendere, non un residuo** — non appartiene a nessun task dell'ondata (a).

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

## 5-ter. Quello che il T10 ha lasciato detto (28/07/2026, commit `75434c5a`)

**Fatto:** i **sette** nomi (non cinque, come diceva il titolo del task) sono usciti da
`PATCHABLE_FIELDS`. 9 casi nuovi, **7 rossi al primo giro**, tutti per la ragione giusta. Suite
**3487 verdi**, `tsc` 0, `eslint` 0, `next build` ok, DB alla baseline.
🔑 **L'esecutore ha aggiunto un controllo positivo** (`toContain('descrizione')`) che il piano non
prevedeva: sette `not.toContain` sarebbero passati **anche con l'allowlist svuotata per sbaglio** —
non distinguono «i sette sono usciti» da «non è rimasto niente».

### ✅ La tabella di destinazione (R-P6) — e i sette nomi NON hanno lo stesso regime
Sta nel codice, sopra `PATCHABLE_FIELDS`, con i due gruppi separati. **Nessuna riga senza destinazione.**
- **Gruppo A — la colonna su `lavori` resta viva** (regime `numero_cassetta`): `denti_coinvolti`,
  `denti_mancanti`, `denti_impianti` → righe di `lavori_denti` per ruolo + **denormalizzazione
  scritta dalle RPC** → T11 (wizard) / T12 (scheda).
- **Gruppo B — la colonna su `lavori` NON ha più nessuno scrittore:** `colore_dente`, `colore_collo`,
  `colore_corpo`, `colore_incisale` → `lavori_denti.codice*` → T11 / T12.
  🛑 **Il piano lasciava credere il contrario per omissione**: il commento prescritto dice che «le
  colonne restano vive come denormalizzazione» e nomina **solo i tre `denti_*`**. Verificato sul
  corpo delle RPC (`20260727120300_lavori_denti_rpc.sql:115-121` e `:205-211`): gli `UPDATE lavori
  SET` **non toccano nessuna colonna del colore**.
- 🔑 **L'ottavo scrittore non esiste, ed è stato cercato per FORMA, non per nome:** dei cinque
  chiamanti della PATCH, quattro mandano chiavi esplicite; **uno solo** manda un oggetto intero
  (`useLavoroForm.ts:59`, `{ ...data }` → T12). Un grep sui sette nomi non l'avrebbe visto.

### 🔴 Ritrovamenti fuori mandato del T10

10. 🛑 **IL COLORE SI SCRIVE MA NON SI RILEGGE — e il T12 come era scritto NON lo copriva.**
    Conseguenza diretta del Gruppo B: le quattro colonne `lavori.colore_*` non hanno più scrittori,
    ma la `GET` del lavoro (`[id]/route.ts:242`) **non include `lavori_denti`** e
    `TabClinica.tsx:57,77,97,117` si idrata da `data.colore_*`. Dopo il deploy T10+T11+T12 l'utente
    digiterebbe un colore, leggerebbe «Salvato» (vero: il dato è nelle righe), **ricaricherebbe e non
    lo troverebbe più** — la stessa bugia che l'ondata esiste per togliere, spostata dalla scrittura
    alla **lettura**. ✅ **Chiuso il 28/07 scrivendolo NEL PIANO come ampliamento del mandato del
    T12** (la strada del ritorno: la GET include le righe, la scheda si idrata da lì, e il test è
    **scrivi → rileggi → ritrova**). ⚠️ **Dimensione corretta, verificata:** correggibilità del dato
    ed esperienza d'uso, **non** Allegato XIII — `DdcTemplate.tsx` e `generate-ddc.ts` non leggono
    alcun campo colore. Non si escala come normativo.
11. **Il default di caso non è correggibile dopo la creazione.** `lavori.colore_scala`/`colore_codice`
    si scrivono solo dentro `lavoro_crea_atomico` e **non sono mai stati** in `PATCHABLE_FIELDS`:
    nessuna via di correzione. Collide con la direttiva permanente «ogni campo del lavoro si corregge,
    fino alla consegna». Casa naturale: **ondata (b)**, quando arriva la tendina.
12. **Un test verde su un difetto vivo:** `tests/unit/crea-lavoro.test.ts:193` continua a passare
    mentre asserisce che il wizard fa una PATCH con `denti_coinvolti`/`colore_dente` — che dal T10 è
    un **no-op silenzioso**. Passa perché il `fetch` è finto e non arriva mai al server. **Lo sostituisce il T11.**
13. **Due conteggi sbagliati nel piano:** il titolo del T10 dice «cinque nomi» (sono **sette**), e lo
    Step 2 prevede «FAIL su 7 degli 8 casi» — non corrisponde né al test del piano né a quello scritto.

---

## 5-quater. Quello che il T11 ha lasciato detto (28/07/2026, commit `1163f092`)

**Fatto:** il wizard manda i denti **dentro** il POST, la PATCH fail-soft è sparita, e il colore
**non può più far fallire la creazione**. 41 casi nuovi, **35 rossi al primo giro**; suite da 3487 a
**3530 verdi**, `tsc` 0, `eslint` 0, `next build` ok, DB alla baseline.

- **La mappatura, scritta e non assunta:** il wizard raccoglie **due caselle di testo libero**
  (`PassoPaziente.tsx:83-98`), «Elemento» e «Colore». `mappaElementi()` toglie il punto cosmetico
  (`2.6`→`26`), pretende **due cifre esatte** (`2.66` esce, mai troncato) e passa da `isFdiValido`.
  `provenienza: 'prescritto'` e `ruolo: 'elemento'` sono **costanti**, con la ragione nel codice: il
  wizard è l'accettazione di ciò che il dentista ha prescritto; «eseguito», «mancante» e «impianto»
  non hanno alcun comando in quella schermata.
- 🔑 **Deduplica silenziosa:** «2.6, 26» è **un dente scritto due volte**, non un dato perso. Senza,
  il POST rispondeva 422 «dente ripetuto» e al banco si perdeva **il lavoro** per una ripetizione.
- ✅ **La prova che il colore degrada, misurata sulla RPC vera (transazione annullata):**
  `lavoro_crea_atomico(..., 'colore_codice','a3')` → **ERRORE**, `violates foreign key constraint
  "lavori_colore_caso_fk"`. Con `'A3'` → lavoro creato. Ora il POST normalizza (`a3`→`A3`+
  `vita_classical`, `bl`→`BL`+`fuori_scala`, `2m2`→`2M2`+`vita_3d_master`), e su una coppia fuori
  catalogo risponde **201 col colore scartato**: la coppia inesistente **non raggiunge mai il
  database**. 🛑 Si perde il colore, mai il lavoro.
- 🔑 **Il test morto è stato sostituito, e la ragione per cui era verde vale come lezione:**
  `crea-lavoro.test.ts:193` misurava l'**intenzione del client**, mai l'**accettazione del server** —
  il `fetch` era finto, quindi la PATCH non arrivava mai a qualcuno che potesse rifiutarla. In più
  l'esecutore ha aggiunto un blocco **«la stretta di mano»** che costruisce il corpo del POST con
  `mappaElementi` **vera** e lo fa accettare dalla route vera: chiude la cucitura fra le due metà.

### 🔴 Ritrovamenti e deviazioni del T11 (dichiarate, non nascoste)

14. **Due deviazioni consapevoli dalla lettera del piano**, entrambe perché il piano presupponeva
    un'interfaccia che **non esiste in questa ondata**: (a) la firma di `creaLavoroDaWizard` tiene
    `elemento: string`/`colore: string` invece di `denti[]` — è ciò che l'interfaccia produce
    davvero, e una firma `denti[]` spingerebbe il parsing dentro il componente inventando una UI che
    il wizard non sa alimentare; (b) `accessoriFalliti` **non** si riduce a `Array<'foto'>` ma
    diventa `Array<'elementi' | 'foto'>`. ⚠️ **Il T12 non lo "corregga" indietro.** La ragione: con
    testo libero il parsing esiste, e un token illeggibile («corona») aveva tre esiti — farlo passare
    (**perde il lavoro**), buttarlo zitto (**la classe di difetto che l'ondata uccide**), o scartarlo
    **e dirlo**. Solo il terzo regge entrambi i vincoli. Il **colore** invece degrada in silenzio, ed
    è giusto: è deciso nel piano.
15. **Il piano codificava il colore per-dente nel proprio test** (`denti: [{fdi, scala, codice, …}]`)
    — che è dichiaratamente **ondata (b)** e che `PassoPaziente` non sa produrre. Non implementata.
16. **`denti_coinvolti` cambia formato con questo commit**: la denormalizzazione RPC produce
    `['26','27']` dove il wizard scriveva `['2.6','2.7']`, e il valore atterra **visibile** nella DdC
    (`DdcTemplate.tsx:258-259`, un `join(', ')`) e nella scheda. ✅ **Verificato in banca dati: è un
    ALLINEAMENTO, non una rottura** — l'unico lavoro con denti in casa ha già `["21"]`, senza punto,
    perché lo aveva scritto la scheda. Il wizard era l'unico fuori riga, e `TabClinica.tsx:28` fa
    `.map(Number)` sui valori: con `'2.6'` produceva `2.6`, che **non è un FDI valido** — cioè
    l'odontogramma della scheda non ritrovava il dente scritto dal wizard. Il formato nuovo è quello
    canonico ISO 3950 e quello che il resto dell'app già usa.
17. **Nota sui tipi generati da Supabase:** l'inferenza di `.select('scala, codice')` controlla i
    **nomi** delle colonne (provato: un nome inventato dà `TS2339`) ma degrada i **valori** ad `any`.
    Vale per ogni `select` multi-colonna del repo, non solo per questo. Nessuna azione, ma non
    contare su `tsc` come rete sui **tipi** di ciò che torna da una `select`.

---

## 5-quinquies. Il T12 e le sue due code — **il blocco 10-11-12 È CHIUSO** (28/07/2026)

Commit: **`e80e9bb8`** (T12) · **`3302f799`** (T12-bis) · **`0a319fc4`** (coda del 12-bis).
**3584 test verdi**, `tsc` 0, `eslint` 0, `next build` ok, DB alla baseline. Tutti e tre riverificati
dall'orchestratore, non solo riferiti.

### T12 — la scheda scrive sull'endpoint **e rilegge dalle righe**
La strada dell'andata ricalca il precedente di `numero_cassetta` (i sette campi tolti **alla
sorgente**, non lasciati partire per essere scartati). La strada del ritorno: la `GET` della pagina
di modifica include `denti:lavori_denti(*)` e `LavoroFormClient` idrata le quattro caselle con
`idrataColoreScheda`. 🔑 **`TabClinica.tsx` NON è stato toccato**: legge le stesse quattro chiavi di
prima, nessun pixel cambia — il piano si contraddiceva (la tabella «Files» chiedeva di modificarlo,
lo Step 4 diceva di no) e ha vinto lo Step 4.
🔑 **`updated_at` si riallinea DUE volte**, dopo il PUT **e** dopo la PATCH: anche la PATCH riscrive
`updated_at` server-side, quindi senza il secondo riallineamento basterebbe salvare un campo
ordinario per far prendere un 409 fasullo al primo salvataggio clinico successivo.
🔑 **Il Task 2 ha finalmente un consumatore:** `risolviColore` (la precedenza riga→caso, dichiarata
«senza consumatori in questa ondata») è la base di `idrataColoreScheda`. Serve davvero: il wizard
scrive il colore **solo** nel default di caso, quindi senza la ricaduta ogni lavoro nato dal wizard
mostrerebbe la casella vuota.

### T12-bis — il colore «di tutto il lavoro» torna correggibile
> 🛑 **Ragione di dominio, parole di Francesco (fonte primaria, non dedurla di nuovo):** *«si può
> succedere di voler inserire il colore ad esempio su di una protesi totale senza indicare il
> dente.»* Il default di caso **non** è un ripiego per un dato incompleto: è un dato legittimo.

Misurato prima di decidere: **293 lavori su 294 non hanno denti**, e **zero** hanno un colore — si
stava riparando **il flusso**, non lo storico. `colore_scala`/`colore_codice` entrano in
`PATCHABLE_FIELDS` (additivo: nate col T5, mai state in allowlist, un solo scrittore) e la
normalizzazione col catalogo è stata **estratta** in `src/lib/api/colore-caso.ts` —
`risolviColoreCaso`, **unica copia** (provato: `from('colori_dentali')` compare **una volta sola in
tutto `src/`**), chiamata da POST e PATCH.

### La coda — 🔑 **una regola che avevo scritto io, smentita da un repro**
Avevo scritto «quando ci sono righe, il caso non si tocca». Conseguenza **osservata**, non dedotta:
su un lavoro nato dal wizard con elemento **e** colore (righe senza colore, colore nel caso — la
**forma normale**), **cambiare** il colore funzionava ma **azzerarlo no**: il vecchio riappariva al
ricaricamento. **Un campo che non si può azzerare è un campo che non si corregge.**
✅ Regola corretta: **il caso si scrive DOVE SI LEGGE** — ogni volta che dopo il salvataggio nessuna
riga porterà una coppia completa, azzeramento compreso. La condizione di scrittura è ora **la stessa
identica** con cui `idrataColoreScheda` decide di leggere il caso, e vive in **una funzione sola**
(`coloreDelleRighe`) con tre chiamanti, invece che in tre condizioni scritte a mano.
⚠️ Il pericolo che la regola vecchia voleva evitare resta chiuso, ed è **provato con un test che
percorre i due momenti**: finché le righe portano un colore il caso è illeggibile; appena si
svuotano, la stessa condizione lo riallinea.

### 🔴 Ritrovamenti delle tre tornate

18. **Le tre zone (collo/corpo/incisale) senza elementi non hanno NESSUNA destinazione** — il default
    di caso è una coppia `(scala, codice)` e basta. Il form **si ferma e lo dice** invece di buttarle
    via. Limite dichiarato, non difetto nascosto.
19. **La tendina della scheda offre 19 codici su 48.** Un `2M2` che arriva dal default di caso rende
    la casella **vuota a schermo** mentre il dato resta intatto (verificato: riparte identico al
    salvataggio, e la casella vuota non provoca azzeramenti). **Ondata (b)**, la tendina a 48 voci.
    ⚠️ Rileva più di prima: quella tendina ora è anche **la penna** del caso, non solo la sua vetrina.
20. **La sostituzione integrale ha due effetti strutturali:** (a) una riga `escluso`/`incollato`
    verrebbe cancellata da un salvataggio della scheda (irraggiungibile oggi: nessuna UI scrive quei
    ruoli); (b) a ogni modifica clinica **tutte** le righe passano a `provenienza:'eseguito'`, anche i
    denti non toccati — rileva per il precheck W20/W22 dell'**ondata (c)**.
21. **Due `select` della fatturazione chiedono le quattro colonne orfane e non le leggono mai**
    (`fatture/[id]/xml/route.ts:109-112`, `fatture/batch/route.ts:125-128`): verificato che la stringa
    «colore» non compare in `generate-xml.ts`. **Nessun valore fermo finisce su un documento
    fiscale.** Due select da ripulire nell'**ondata (c)**.
22. **La vista `lavori_dashboard` espone ancora `colore_dente`** (colonna ferma dal T10). Nessun
    codice applicativo la interroga. **Ondata (c)**.
23. **La distinzione elementi/denti non è sparita, si è spostata** (dichiarato dall'esecutore invece
    di essere lasciato credere): `coloreDelleRighe` nomina ancora `denti_coinvolti`. La formulazione
    che l'assorbirebbe (derivarla dalle righe costruite) **non è utilizzabile** — `costruisciDenti`
    può rispondere `ok:false` proprio nei salvataggi dove il PUT non parte, e le due uscite possibili
    sono entrambe sbagliate (si azzererebbe un caso valido, oppure si perderebbe in silenzio una
    modifica). Il guadagno vero è che la regola sta in **un posto solo** invece di tre.

---

## 5-sexies. Il T13 — le prove sul database vero (28/07/2026, `acea52c4` + `93016d70`)

Evidenze complete: **`docs/superpowers/plans/evidenze/2026-07-27-ondata-a-isolamento.md`** — output
reale copiato, mai parafrasato.

### ✅ R4 — provato per intero, quattro colpi ostili su quattro strati
1. **Privilegi di tabella:** `SQLSTATE 42501 permission denied for table lavori_denti` × 4
   (DELETE/INSERT/UPDATE da `service_role`, DELETE da `authenticated`). **Controllo positivo:** lo
   stesso `service_role` **via RPC** → `{"esito":"ok"}`, conteggio 2→3. Il `REVOKE ALL` morde davvero.
2. **RPC col laboratorio sbagliato:** `{"esito":"non_trovato"}` in **entrambe** le direzioni, denti
   invariati (la chiamata chiedeva di ridurli).
3. **RLS in lettura, via HTTP vero su PostgREST con JWT:** 3 righe esistono, ne torna **1**. Chiedere
   esplicitamente le altrui → `[]`. Senza sessione → `401`. `DELETE` col JWT → `403`.
4. **La route, via HTTP vero:** `404 {"error":"Lavoro non trovato"}` — 🔑 **byte per byte identico**
   alla risposta per un id inesistente. Quindi i lavori altrui **non sono enumerabili**. Proprio lab
   → `200`; senza sessione → `401`; origine estranea → `403`.

⚠️ **Le prove 3 e 4 usano l'utente sintetico dell'E2E** (`scripts/seed-e2e.ts:201`), credenziale
versionata nel repo e creata dal seed per i test — **non** una credenziale di una persona, nessun
modulo di accesso compilato, nessun segreto negli artefatti. Il piano le dava per non eseguibili;
l'esecutore ha trovato la terza via **e l'ha messa a ratifica invece di darla per scontata.**

### 🔴 R5 — la prova è FALLITA, ed è il risultato più prezioso della giornata
`lavori_denti` è coperta e la prova (5) lo mostra col **controfattuale** (senza quella riga:
`SQLSTATE 23503 … violates foreign key constraint "lavori_denti_lavoro_fk"`). **Ma R5 come classe di
rischio non è chiuso:** sei tabelle rendono un laboratorio **incancellabile** appena ricevono una
riga. Pre-esistente, non introdotto qui. → **sezione dedicata in `ROADMAP-UFFICIALE.md`**, con il
repro e l'avvertenza di non riusare il controllo fragile.

### 🔑 Lo strumento di prova mentiva — nella direzione rassicurante
L'asserzione «strutturale» del piano (`regexp_matches(prosrc, 'DELETE FROM (\w+)')`) è fragile in tre
modi indipendenti: `information_schema.columns` include **le viste**; le DELETE delegate a un'altra
funzione non compaiono in quel corpo; e `prosrc` contiene **i commenti**, mentre il regex non legge
`DELETE FROM public.x`. **Prova che non è teoria:** sulla funzione accanto ha estratto una tabella
chiamata **`public`**. Contati a mano: 50 match, **49 distinti** — `lavori` conta due volte perché una
occorrenza è **dentro un commento**. Regge sul testo di oggi **per come è scritto**, non per una
proprietà del controllo.

### 🔴 Ritrovamenti del T13
24. **R5 su sei tabelle** (sopra) — `credito_clienti_movimenti`, `fatture_sdi_eventi`,
    `listino_materiali_auto`, `ordini_fornitori`, `pagamenti`, `scarichi_magazzino`.
25. **`progressivi_anno` lascia orfani** (nessuna FK: non blocca, ma le righe restano).
26. 🛑 **Due progetti Playwright dichiarano file che NON esistono** — `cross-tenant` →
    `rls-cross-tenant.spec.ts`, `api-coverage` → `api-coverage.spec.ts` (verificato). Un cancello
    automatico creduto e mai esistito, **proprio sul rischio che il T13 ha dovuto provare a mano**.
    Stessa classe delle quattro guardie non agganciate (`MEMORY.md` voce 55).
27. **L'accesso E2E non ha mai avuto una sessione:** `auth.setup.ts` legge
    `TEST_USER_EMAIL`/`TEST_USER_PASSWORD`, `.env.local` definisce `TEST_EMAIL`/`TEST_PASSWORD` →
    l'helper prende il ramo «avviso e salvo auth vuota». I difetti 26 e 27 **si nascondono a vicenda**:
    il cancello non c'è, e se ci fosse non avrebbe di che accedere.

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

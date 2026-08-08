# RESOCONTO — Task C-sexies: lo snapshot del nome del paziente esce dal contratto (D320)

**Ramo:** `intervento-post-consegna` · **Data:** 08/08/2026, pomeriggio
**Decisione eseguita:** ⚖️ **D320** — centotrentanovesima tornata di
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`

---

## 0. IN UNA RIGA

`paziente_nome_snapshot` è uscito dalle **due** allowlist — quella TypeScript e quella SQL — e la sua
destinazione è scritta in tre posti. **Ma la destinazione dichiarata dal brief NON arriva sempre:**
vale esattamente quando lo snapshot è nullo, cioè su **298 lavori su 299**. Sul lavoro che uno
snapshot ce l'ha, dopo questo compito il nome stampato non è più correggibile **da nessuna strada** —
misurato, riferito, non corretto (è la decisione che il brief §4 mette fuori mandato).

---

## 1. CHE COSA HO CAMBIATO, percorso per percorso

| percorso | che cosa |
|---|---|
| `src/lib/dichiarazione/correzioni.ts` | nome fuori da `CAMPI_CORREGGIBILI_DOCUMENTO` (**7 → 6**) e da `CAMPI_TESTO` (**4 → 3**); intestazione riscritta («un nome, una riga»); D320 con la destinazione; il motivo tecnico (`generate-ddc.ts:304`); il limite dichiarato dentro `fondiCorrezioni` |
| `supabase/migrations/20260808154033_atto_unico_snapshot_paziente_fuori.sql` | migration NUOVA: `c_su_lavori` **5 → 4** nomi, riga del `SET` tolta, `COMMENT` con la tabella chiave→destinazione. `DROP`→`CREATE`→`REVOKE`→`GRANT`→`COMMENT` |
| `src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts` | **una riga di commento**: «LE SETTE VOCI» → «LE SEI VOCI». Nessuna logica toccata (v. §6-B1) |
| `tests/unit/correzioni-documento.test.ts` | elenco esatto 7 → 6; **blocco «D320» nuovo, 7 casi**; due prove D242 spostate su un campo ancora correggibile; conteggi stantii corretti (`49 → 56`) |
| `tests/unit/riemissione-route.test.ts` | il caso C2 non usa più lo snapshot (sarebbe rimasto verde per la ragione sbagliata); «fuori dalle otto» → «fuori dalle sei» (`53 → 53`) |

### Il timestamp e l'applicazione

`date -u "+%Y%m%d%H%M%S"` in comando SEPARATO (D311) → **`20260808154033`**, sopra il pavimento
`20260808142358`. `npx supabase db push --linked --yes` (D284):

```
Applying migration 20260808154033_atto_unico_snapshot_paziente_fuori.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260808154033_atto_unico_snapshot_paziente_fuori.sql"],
 "seeds":[],"roles":[],"message":"Finished supabase db push."}
```

### 🛑 Il corpo è ribattuto dal VIVO, e la prova è un `diff`

`pg_get_functiondef` scaricato dal catalogo e confrontato riga per riga col file
`20260808142358`: **differiscono SOLO la formattazione della firma e il tag del dollaro**
(`$$` contro `$function$`), che Postgres normalizza. Il corpo è **identico**. Da lì le tre modifiche.

**Riletta dal catalogo DOPO il push** (non dal file):

```
  c_su_lavori CONSTANT text[] := ARRAY[
    'richiedente_nome', 'paziente_id',
    'tipo_dispositivo', 'descrizione'];
      richiedente_nome       = v_lavoro_atteso.richiedente_nome,
      paziente_id            = v_lavoro_atteso.paziente_id,
      tipo_dispositivo       = v_lavoro_atteso.tipo_dispositivo,
      descrizione            = v_lavoro_atteso.descrizione
```

**ACL dopo il `REVOKE`** (che dopo un `CREATE` fresco è portante, non cosmetico):

```
proacl = {postgres=X/postgres,service_role=X/postgres}      ← niente PUBLIC, anon, authenticated
```

### ⚖️ LA RIGA DELL'`UPDATE`: TOLTA, e il perché per intero

La riga era `paziente_nome_snapshot = v_lavoro_atteso.paziente_nome_snapshot`. **`v_lavoro_atteso`
nasce da `jsonb_populate_record(v_lavoro_prima, v_patch_lavori)`**: con la chiave fuori
dall'allowlist quel valore è **sempre** quello già in riga, cioè la copia del valore su sé stesso.
Lasciarla sarebbe stata un'assegnazione **morta e bugiarda** — direbbe che questa funzione scrive
quella colonna, e non è più vero.

**Toglierla è sicuro, e la ragione è una riga precisa:** la prova d'atterraggio dentro la funzione
scorre `jsonb_each(v_patch_lavori)`, cioè **solo le chiavi arrivate**. Una chiave che non può più
arrivare non viene mai guardata. Il verso opposto — togliere la riga e lasciare il nome
nell'allowlist — avrebbe fatto alzare quella prova a **ogni** chiamata che lo mandasse. ➡️ **Tolti
insieme**, come per D319.

---

## 2. LE SONDE — SQL e output incollato

Tutte in **transazione annullata**, fixture costruita **dentro**, una invocazione per sonda,
`SET LOCAL ROLE service_role` (senza, `scripts/psql.mjs` si collega come **proprietario** e una sonda
non prova niente). File: `scripts/tmp/sonde-c-sexies/` (cartella ignorata da git, non committata).

### 🔑 La fixture, e perché è fatta così

```sql
'paziente_nome_snapshot', 'SNAPSHOT-DA-NON-TOCCARE',   -- PIENO e riconoscibile
'descrizione',            'VECCHIA descrizione',       -- DIVERSA dal valore corretto
'updated_at',             now() - interval '1 hour'    -- now() è costante in transazione
```

🛑 **Se lo snapshot nascesse `NULL`, la sonda ③ leggerebbe `NULL → NULL` e sarebbe vera anche con la
riga del `SET` ancora dentro** (che scriverebbe `NULL` su `NULL`): una sonda che non può fallire —
la lezione ③ del brief §7, alla lettera. E se `descrizione` nascesse già col valore corretto, la
sonda ② non saprebbe distinguere «scritto» da «c'era già».

### ① la chiave DEVE essere rifiutata → **rifiutata**

```sql
SELECT public.correggi_e_riemetti_atomica(f.lavoro, f.lab, f.evento,
  jsonb_build_object('paziente_nome_snapshot', 'Mario Russo'),
  jsonb_build_object('anno_ddc', 2099, 'progressivo_ddc', 999005), (SELECT u0 FROM g)) FROM f;
```
```
❌ P0001 atto unico: chiavi che non sono voci correggibili del documento: {paziente_nome_snapshot}
   (ammesse: {richiedente_nome,paziente_id,tipo_dispositivo,descrizione,denti_coinvolti,
              prescrizione_caratteristiche})
```

### ② il giro buono, e l'ATTERRAGGIO

```
esito = {"esito":"ok","nuova_id":"676de534-…","vecchia_id":"0555022b-…",
         "numero":"DDC-2099-999005","numero_superato":"DDC-2098-998001",
         "updated_at":"2026-08-08T15:46:33.699112+00:00"}
descrizione_dopo = 'NUOVA descrizione corretta'          ← era 'VECCHIA descrizione'
```

### ③ 🔑 dopo una correzione riuscita, lo snapshot NON è cambiato

```
esito            = {"esito":"ok", …, "numero":"DDC-2099-999005", …}
snapshot_dopo    = 'SNAPSHOT-DA-NON-TOCCARE'
invariato        = true
descrizione_dopo = 'NUOVA descrizione corretta'      ← la correzione È avvenuta davvero
```

### ④ 🔴 LA PROVA CHE ① E ③ SANNO DIVENTARE ROSSE

Copia **usa-e-getta** della funzione **viva** (`pg_get_functiondef`, mai il file), rinominata
`sonda_csex_vecchia`, con le **due** cose rimesse dentro (nome nell'allowlist + riga del `SET`); le
tre sostituzioni sono **asserite dentro il `DO`** — una `replace` che non trova niente non fallisce,
restituisce la stringa com'era, e la sonda misurerebbe di nuovo la funzione **nuova** credendo di
misurare la vecchia. Stesso carico della sonda ①:

```
esito_regola_vecchia = {"esito":"ok", …}          ← ACCETTATA: la sonda ① misura la regola nuova
snapshot_dopo        = 'Mario Russo'
invariato            = false                       ← la sonda ③ sa distinguere
```

**Dopo il `ROLLBACK`, riletto dal catalogo:** `copia_residua = 0` · `fixture_residua = 0` ·
`allowlist_sporca = false` · `snapshot_pieni = 1` (invariato).

---

## 3. R-P4 — il conteggio, e le forme d'input

**Abbozzo inerte** = il modulo con la regola **vecchia** rimessa nelle due allowlist (è la forma
inerte onesta per un filtro che esiste già: il rosso da «modulo non trovato» qui non esisterebbe).

```
FAIL … > CAMPI_CORREGGIBILI_DOCUMENTO — sei nomi … AssertionError: expected […(6)] to deeply equal […(5)]
FAIL … > D320 … valore BUONO è rifiutato          AssertionError: expected true to be false
FAIL … > D320 … il messaggio lo NOMINA            Error: atteso rifiuto
FAIL … > D320 … in compagnia di una voce buona    AssertionError: expected true to be false
FAIL … > D320 … né insieme a `paziente_id`        AssertionError: expected true to be false
FAIL … > D320 … con valore VUOTO → «chiave ignota»
        AssertionError: expected 'La correzione di «paziente_nome_snaps…' not to contain 'è vuota'
FAIL … > D320 … l'elenco delle ammesse            AssertionError: … not to contain 'paziente_nome_snapshot'
      Tests  7 failed | 102 passed (109)
```

➡️ **7 asserzioni su 8 si accendono.** L'ottava è la **controprova voluta** (`paziente_id` da solo
resta una correzione buona): deve restare **verde in tutte e due le regole**, perché D320 chiude una
porta e non due — è dichiarata come tale nel test. Codice vero ripristinato → `109 passed (109)`.

📌 **La sesta riga è la più importante del blocco:** sotto la regola vecchia il messaggio era «la
correzione è vuota». Senza l'asserzione **sul testo**, quella prova sarebbe stata verde con
entrambe le regole — cioè la quinta lezione del brief §7 ripetuta.

### Le forme d'input, enumerate

| forma | caso | esito |
|---|---|---|
| `{paziente_nome_snapshot: 'Mario Russo'}` (valore buono) | ✅ due prove (rifiuto + il messaggio lo nomina) | rifiutata |
| insieme a una chiave valida (`descrizione`) | ✅ una prova | l'intera correzione cade |
| insieme a `paziente_id` | ✅ una prova | rifiutata intera |
| valore **vuoto** (`''`) | ✅ una prova, **sul messaggio** | «chiave ignota», mai «campo vuoto» |
| l'elenco proposto dal messaggio | ✅ una prova | non lo nomina più |
| `paziente_id` da solo (controprova) | ✅ una prova | resta buono |
| valore `null` / numero / oggetto sulla chiave | 🚫 **non coperta, perché** il controllo delle chiavi ignote gira **prima** di ogni controllo di forma: il tipo del valore non è mai guardato, quindi sarebbero tre prove dello stesso ramo già coperto |
| la chiave sulla **RPC** (non sul TypeScript) | ✅ **sonda ①**, con la ④ a provarne il rosso |

---

## 4. FASE 6b e FASE 7

**FASE 6b:**
```
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq   → GEN_EXIT=0
diff src/types/database.types.ts <nuovo>                              → NESSUNA DIFFERENZA (0 righe)
npx tsc --noEmit                                                      → TSC_EXIT=0
```
📌 **Nessuna differenza è l'esito atteso, e va detto perché:** la **firma** della RPC non cambia
(stessi sei parametri, stesso ritorno) — a cambiare è il **corpo**, che i tipi generati non
descrivono. Dichiarato, non nascosto.

**FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` → **VERIFY_EXIT=0**
```
Test Files  448 passed | 6 skipped (454)
     Tests  5628 passed | 68 skipped (5696)
✓ Compiled successfully in 3.3s
```

**Base `5621 | 68 su 454` → `5628 | 68 su 454`: +7, e il conto torna esatto.**
`correzioni-documento.test.ts` **49 → 56** (i sette del blocco «D320») ·
`riemissione-route.test.ts` **53 → 53** (due prove **aggiornate sul posto**, nessuna cancellata).

---

## 5. 🔴 DOVE QUESTO BRIEF SBAGLIA — quattro difetti, uno grave

### B1 — 🔴 LA DESTINAZIONE DICHIARATA NON ARRIVA SEMPRE, e il brief la dà per buona

Il mandato in una frase dice: «*la sua destinazione è scritta: `pazienti.nome`/`pazienti.cognome`,
via `PATCH /api/pazienti/[id]`*». **È vero esattamente quando lo snapshot è NULLO.** Misurato:

```
SELECT count(*) AS lavori_tot, count(paziente_nome_snapshot) AS con_snapshot FROM lavori;
→ lavori_tot = 299 · con_snapshot = 1 · snapshot_vuoto = 0
```

`PATCH /api/pazienti/[id]` scrive **solo su `pazienti`** (letto: `route.ts:80-155`), e **nessun
trigger propaga** da `pazienti` a `lavori`:

```
pg_trigger su `pazienti` → trg_paziente_nome_cognome (sync_paziente_nome_cognome) · trg_pazienti_updated_at
```

Siccome `generate-ddc.ts:304` legge lo **snapshot per primo**, su un lavoro che ha lo snapshot la
correzione in anagrafica **non arriva sul documento**. E la riga che ce l'ha è peggio del previsto:

```
numero_lavoro = 'TEST-DdC-001' · paziente_nome_snapshot = 'F.R.' · paziente_id = NULL
```

**Non ha nessuna anagrafica a cui puntare.** Per quel lavoro, dopo D320, il nome stampato non è
correggibile da nessuna strada: non da qui (chiuso oggi), non dalla PATCH del lavoro (escluso da
`PATCHABLE_FIELDS`), non dall'anagrafica (non c'è, e comunque non vincerebbe).
➡️ **Riferito, non corretto:** il brief §4 mette `generate-ddc.ts:304` **fuori mandato** e dice che
toglierlo è una decisione a sé. **Lo è, e va messa in coda.**

### B2 — la stessa cosa, dal lato del codice: `fondiCorrezioni` non può più riparare l'embed

Dopo l'uscita del nome da `CAMPI_TESTO`, correggere `paziente_id` su un lavoro **con** snapshot
cambia la riga e l'embed, ma il documento continua a stampare **lo snapshot vecchio**.
**Non è una regressione** — nessuna schermata mandava quella chiave (`DevoIntervenire.tsx` non la
nomina: zero occorrenze) — è una **riparazione che il foglio del Task D non potrà offrire**. Scritto
accanto al codice, in `fondiCorrezioni`, perché è lì che si vede.

### B3 — «il clone del rifacimento (`007_rpc_rifacimento.sql:52-60`)»: **quel file non è la verità viva**

Il brief §4 lo cita come sito vivo da non toccare. Il corpo vivo di `crea_rifacimento_atomico`
**non nomina affatto** la colonna:

```
SELECT proname FROM pg_proc WHERE prokind='f' AND prosrc ILIKE '%paziente_nome_snapshot%'
→ UNA sola riga: correggi_e_riemetti_atomica
```

e l'elenco delle colonne del suo `INSERT INTO lavori` (letto dal catalogo) salta lo snapshot. Il
divieto è innocuo — non l'ho toccato — ma **la premessa del censimento era sbagliata**, ed è la
**terza volta in quest'ondata** che un file superato viene scambiato per la verità viva.
🔑 **E rafforza il compito:** dopo questa migration **nessuna funzione del catalogo e nessuna rotta
scrive più quella colonna.**

### B4 — il commento di `riemetti/route.ts:257` diventava falso, e il brief lo metteva «da non toccare»

Il brief §5 dice «*vive in `…/riemetti/route.ts`, che tu NON tocchi*» — riferito al rilievo **I3**.
Ma la riga 257 di quel file diceva «**LE SETTE VOCI**», e il mio cambiamento la rende **falsa**.
È **lo stesso difetto B3 del C-quinquies**, che quel file l'aveva già corretto per la stessa ragione.
➡️ **Corretta la sola parola** (nessuna logica, nessuna asserzione, I3 intatto). Se la lettura
stretta fosse quella giusta, è un cambiamento di **una riga di commento**, dichiarato qui.

📌 **E c'è un residuo del C-quinquies:** `riemissione-route.test.ts:427` diceva ancora «una chiave
fuori dalle **otto**» quando erano già sette. Corretto a «sei» — è il commento più vicino al codice
toccato, cioè quello che nessuno rilegge.

---

## 6. RITROVAMENTI FUORI MANDATO — riferiti, non corretti (R-E2)

1. 🔴 **La decisione che questo compito lascia aperta:** il ripiego `snapshot ?? nome_cognome` di
   `generate-ddc.ts:304` (e il gemello `precheck.ts:99-101`) rende **irraggiungibile** la correzione
   del nome per l'unico lavoro che ha uno snapshot. Le due strade possibili — togliere il ripiego,
   oppure svuotare lo snapshot quando si corregge `paziente_id` — sono **decisioni**, non
   manutenzione. Nessuna delle due è stata presa.
   ⚠️ **E la posta è più alta di un nome stampato:** `precheck.ts:99-101` legge la stessa catena, e su
   `TEST-DdC-001` (stato `pronto`, `paziente_id` NULL) **lo snapshot è l'unica cosa che soddisfa
   l'elemento 4 dell'Allegato XIII alla consegna**. Cioè: una colonna che da oggi non ha più
   scrittori **regge un cancello di consegna** su quella riga.
2. 🟠 **`src/app/api/lavori/[id]/route.ts:69-73`** tiene `paziente_nome_snapshot` fra gli esclusi
   dalla PATCH con la motivazione «*verificato: nessun writer nel form React attuale*» — che la
   direttiva permanente di CLAUDE.md §9 chiama testualmente «*non è una ragione: è un buco che
   aspetta*». **Da oggi una ragione vera c'è** (D320: il nome si corregge in anagrafica), e quel file
   non la sa. **Non l'ho toccato**: il brief §4 mette quell'allowlist fuori mandato e R-P6 è già
   soddisfatta dalla destinazione scritta nel `COMMENT` della migration e nell'intestazione di
   `correzioni.ts`. ➡️ **Una riga da aggiungere lì**, di chi orchestra.
3. 🟠 **L'indice GIN `idx_lavori_search`** (`supabase/schema.sql:1020`, e **vivo** in banca dati:
   `pg_indexes` lo conferma) indicizza `descrizione || paziente_nome_snapshot`. Con **zero
   scrittori**, quel secondo pezzo ha contenuto per **una riga su 299**.
   ⚠️ **E c'è di più, misurato invece che dedotto: nessuno lo interroga.** La ricerca dei lavori
   dell'app è `query.ilike('descrizione', …)` (`src/app/api/lavori/route.ts:77`), che **non usa un
   indice a testo pieno e non guarda affatto il nome del paziente**; `grep` su tutto `src` per
   `textSearch` / `to_tsquery` / `websearch` → **zero occorrenze**. Quindi l'indice è **inerte**, e la
   ricerca per nome del paziente **non esiste** — non è che funzioni per una riga sola. Difetto
   **preesistente**, riferito perché il prossimo che vede l'indice penserà il contrario.
4. 🟠 **La riga `TEST-DdC-001` non è la fixture del seed**, che il piano dava come sorgente del dato
   (P3, «*la fixture del seed `supabase/seed.sql:133`*»): quella riga del seed ha per giunta un `id`
   che **non è un UUID valido** (`h0000000-…`), quindi non è nemmeno in banca dati. Il **numero** (1
   su 299) era giusto, la **provenienza** no.
5. Già noti e **non toccati**, come chiedeva il brief §5: **I3** (la porta d'idempotenza ha una sola
   asserzione) · **M1** (lo `switch` senza `default`) · `{"denti_coinvolti": []}` ·
   e i ritrovamenti aperti del C-quinquies (`POST /api/lavori` scrive ancora
   `lavori_prescrizioni.numero_prescrizione`; `riemetti_ddc_atomica` accetta ancora tutto).

---

## 7. 🛑 COSA NON HO FATTO, per intero

- **Non ho cancellato nessuna colonna** e non ho toccato lo schema: D320 chiude una penna.
- **Non ho toccato `generate-ddc.ts:304` né `precheck.ts:99-101`** — è la decisione a sé del §6.1.
- **Non ho toccato `PATCH /api/pazienti/[id]` né `PazienteEditSheet`**: sono la destinazione, e
  funzionano.
- **Non ho toccato `DevoIntervenire.tsx`** (Task D, esecutore diverso) né nessuna superficie a
  schermo: **niente FASE 9 e niente FASE 9b**, perché nessun pixel è cambiato — quel foglio non
  esiste ancora.
- **Non ho toccato `PATCHABLE_FIELDS`**, né `riemetti_ddc_atomica`, né il clone del rifacimento.
- **Non ho toccato le quattro migration già nel ledger.**
- **Non ho aggiornato MEMORY.md, ROADMAP-UFFICIALE.md né il verbale delle decisioni:** D320 è già
  ratificata, e la memoria è di chi chiude l'ondata (BP-1).
- **Non ho pubblicato il ramo e non ho toccato `main`.**
- **Non ho committato `scripts/tmp/`** (cartella ignorata): sonde e impalcature restano usa-e-getta.

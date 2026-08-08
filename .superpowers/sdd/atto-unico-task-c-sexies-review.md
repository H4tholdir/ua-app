# REVISIONE — Task C-sexies: lo snapshot del nome del paziente esce dal contratto (D320)

**Revisore indipendente** (non ha scritto questo codice) · **Data:** 08/08/2026, sera
**Ramo:** `intervento-post-consegna` · **Base:** `c221f228` · **Testa:** `f595f171`
**Oggetto:** commit `f595f171`, 6 percorsi, `+1057 / −36`

---

## 0. VERDETTO

# ✅ APPROVATO CON RILIEVI

**Zero rilievi CRITICI.** Le quattro affermazioni dell'esecutore sono state messe alla prova una per
una e **reggono tutte e quattro** — due di esse con sonde che l'esecutore **non aveva fatto** e che
potevano smentirlo. Il perimetro è rispettato. La FASE 7 è stata rilanciata per intero e dà gli stessi
numeri del resoconto.

**Un rilievo IMPORTANTE e tre MINORI**, nessuno dei quali blocca il merge:

| # | gravità | in una riga |
|---|---|---|
| **R1** | 🟠 IMPORTANTE | **Tre commenti stantii nel codice toccato**, e uno **vive nel catalogo**: `-- 🧬 L'ALLOWLIST — SETTE NOMI SCRITTI A MANO` sta oggi nel corpo vivo, sopra un elenco di **sei**. 🔴 Sta nel punto da cui **si auto-propaga**: il prossimo che riscrive la funzione la ribatte dal vivo e la ricopia. Il compito precedente (D319) quella riga l'aveva aggiornata. |
| **R2** | 🟡 MINORE | Il messaggio che legge chi sta al banco dice «da qui non si corregge», **ma non dice dove si corregge**: la destinazione è scritta nel codice e nel `COMMENT` SQL, non nella frase che arriva a schermo. ⚠️ E che quella destinazione **funzioni** non è verificato da nessuno (§7.5). |
| **R3** | 🟡 MINORE (preesistente) | Il test dell'elenco esatto **dichiara** di essere «*l'unico posto in cui TypeScript e RPC si guardano in faccia*», ma è una **terza copia scritta a mano**. Il confronto vero esiste — è la sonda ① — ma vive in `scripts/tmp/`, **ignorata da git**: usa-e-getta, quindi domani non c'è più. |
| **R4** | 🟡 MINORE (preesistente) | «*Perde l'ULTIMA PENNA*» è vero per **funzioni e rotte**, ma `anon` e `authenticated` hanno tuttora `UPDATE` **sulla colonna** (default Supabase, filtrato da RLS): un lettore può capire che sia il database a rifiutare, e non è così. |

---

## 1. LE QUATTRO AFFERMAZIONI, una per una

### ① «La riga dell'`UPDATE` è stata tolta ed è sicuro» → ✅ **CONFERMATA**, e con la sonda che mancava

L'argomento dell'esecutore era un **meccanismo mai messo alla prova**: «la prova d'atterraggio scorre
`jsonb_each(v_patch_lavori)`, cioè solo le chiavi arrivate». Verificato in due modi.

**(a) Statico, sul corpo vivo** — i due insiemi devono coincidere, o una chiave legittima smette di
salvarsi in silenzio. `pg_get_functiondef` (catalogo, non file):

```
c_su_lavori CONSTANT text[] := ARRAY[
    'richiedente_nome', 'paziente_id',
    'tipo_dispositivo', 'descrizione'];
c_su_penne  CONSTANT text[] := ARRAY['denti_coinvolti', 'prescrizione_caratteristiche'];

    UPDATE lavori SET
      richiedente_nome       = v_lavoro_atteso.richiedente_nome,
      paziente_id            = v_lavoro_atteso.paziente_id,
      tipo_dispositivo       = v_lavoro_atteso.tipo_dispositivo,
      descrizione            = v_lavoro_atteso.descrizione
```

**`c_su_lavori` = 4 · righe del `SET` = 4 · insiemi identici.** Nessuna chiave ammessa è senza penna.

E lo snapshot **non compare più nel codice, solo nei commenti** — misurato togliendo i commenti:

```bash
sed 's/--.*$//' live-correggi.sql | grep -n "paziente_nome_snapshot"
→ (nessuna riga; uscita 1)
```

**(b) Dinamico — la sonda del revisore M1, il verso opposto che nessuno aveva percorso.**
Copia usa-e-getta della funzione **viva**, con la riga del `SET` di `richiedente_nome` **tolta** e il
nome **lasciato** nell'allowlist (le due sostituzioni asserite dentro il `DO`, o una `replace` a vuoto
misurerebbe la funzione intatta). Poi la si chiama con quella chiave:

```sql
SELECT public.sonda_rev_setmancante(f.lavoro, f.lab, f.evento,
  jsonb_build_object('richiedente_nome', 'NUOVO Prescrittore'), …);
```
```
❌ P0001 atto unico: chiavi accettate ma NON atterrate su lavori: {richiedente_nome}
```

**La prova d'atterraggio si accende davvero.** L'argomento dell'esecutore non è retorica: è una
guardia vera, e regge.

**Controprova M1b** (senza la quale un rosso qualsiasi passerebbe per «la guardia funziona»): la
**stessa** copia mutilata, chiamata con una chiave la cui riga del `SET` c'è ancora →

```
esito             = {"esito":"ok", …, "numero":"DDC-2099-999005", …}
descrizione_dopo  = 'NUOVA descrizione corretta'
prescrittore_dopo = 'VECCHIO Prescrittore'      ← la sola colonna orfana di SET non si muove
snapshot_dopo     = 'SNAPSHOT-DA-NON-TOCCARE'
```

➡️ Togliere la riga insieme al nome era la scelta giusta, e ora è **misurata**, non argomentata.

---

### ② «R-P4: 7 asserzioni su 8, e l'ottava è una controprova voluta» → ✅ **CONFERMATA, numero esatto**

Mutazione riprodotta: `paziente_nome_snapshot` rimesso in **entrambe** le allowlist TypeScript
(`CAMPI_CORREGGIBILI_DOCUMENTO` **e** `CAMPI_TESTO` — rimetterlo in una sola sarebbe un errore di
tipo e misurerebbe un'altra cosa).

```
× sono esattamente le sei chiavi dell'allowlist della RPC
× 🔴 `paziente_nome_snapshot` con un valore BUONO è rifiutato
× e il messaggio lo NOMINA, invece di scartarlo in silenzio
× 🛑 e non passa nemmeno in compagnia di una voce buona
× 🔑 …né insieme a `paziente_id`
× 🔴 con valore VUOTO risponde «chiave ignota», non «campo vuoto»
× 📌 …e l'elenco che il messaggio propone NON lo nomina più

 Test Files  1 failed | 1 passed (2)
      Tests  7 failed | 102 passed (109)
```

**7 su 8.** L'ottava (`paziente_id` da solo resta buono) **è** una controprova legittima: deve
restare verde sotto entrambe le regole, perché D320 chiude una porta e non due. Non è decorazione —
è l'asserzione che dice che il compito non ha chiuso troppo.

Codice ripristinato (`git checkout`), file identico all'originale byte per byte, `109 passed (109)`.

**📌 E qui c'è un dato che l'esecutore non aveva e che gli dà ragione due volte.** Ho preso il file
di prova **vecchio** (`c221f228`) e l'ho fatto girare contro il codice **nuovo**:

```
Tests  1 failed | 48 passed (49)
FAIL … > sono esattamente le sette chiavi dell'allowlist della RPC
```

**Prima di questo compito, l'intero cambiamento era sorvegliato da UNA sola asserzione su 49.** Le
altre 48 restavano verdi — compresi i due casi che nominavano lo snapshot. È la prova indipendente
che le due decisioni contestabili dell'esecutore erano giuste:
- **aggiungere il blocco «D320»** (7 prove), perché la rete esistente era una sola maglia;
- **spostare** le due prove D242/C2 su `richiedente_nome`, perché sarebbero rimaste verdi **per la
  ragione sbagliata** (chiave ignota invece che campo vuoto) — non le ha diluite, le ha salvate.

---

### ③ «`crea_rifacimento_atomico` non nomina la colonna nel corpo vivo» → ✅ **CONFERMATA, con censimento più largo del suo**

Il censimento dell'esecutore aveva **due maglie troppo larghe**: `prokind='f'` **esclude le
procedure**, e i trigger erano stati cercati su `pazienti` ma **mai su `lavori`** — che è proprio
dove vivrebbe uno scrittore. Rifatto largo:

```sql
SELECT n.nspname, p.proname, p.prokind FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE p.prosrc ILIKE '%paziente_nome_snapshot%';
```
```
public | correggi_e_riemetti_atomica | f          ← UNA riga, e in essa SOLO commenti
```
(nessun filtro su `prokind`, nessun filtro sullo schema: procedure e schemi non-`public` compresi)

```sql
-- trigger NON interni su `lavori` e `pazienti`, con la funzione risolta
```
| tabella | trigger | funzione | tocca lo snapshot |
|---|---|---|---|
| lavori | `_audit_lavori` | `_audit_trigger_fn` | **false** |
| lavori | `trg_dashboard_lavori` | `trg_refresh_dashboard` | **false** |
| lavori | `trg_lavori_ritardo` | `check_lavoro_ritardo` | **false** |
| lavori | `trg_lavori_updated_at` | `trigger_set_updated_at` | **false** |
| pazienti | `trg_paziente_nome_cognome` | `sync_paziente_nome_cognome` | **false** |
| pazienti | `trg_pazienti_updated_at` | `trigger_set_updated_at` | **false** |

```
crea_rifacimento_atomico → la_nomina = false      ← il file 007_rpc_rifacimento.sql è superato
lavoro_crea_atomico      → la_nomina = false
riemetti_ddc_atomica     → la_nomina = false
DEFAULT sulla colonna    → null
```

**Lato applicazione:** 47 occorrenze in `src/` fuori da `database.types.ts`, **zero in contesto di
scrittura** — nessun `.update(` / `.insert(` / `.upsert(` la nomina; le uniche assegnazioni sono
dichiarazioni di tipo e mappature di **lettura** (`queries.ts`, `portale`, `agenda`, i template PDF).
Fuori da `src/`: `scripts/giro-guardia-overlay.ts:46` la **seleziona** (lettura), `supabase/seed.sql:133`
e `supabase/schema.sql:900/1020` sono definizione e seed.

➡️ **«Zero scrittori» regge, ed è più solido di come l'esecutore l'aveva provato.** Il rilievo **B3**
del resoconto (il brief citava un file superato come verità viva) è **fondato**.

---

### ④ «`gen types` non produce differenze ed è l'esito atteso» → ✅ **CONFERMATA, ed è stato davvero eseguito**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > types-rigenerati.ts
GEN_EXIT=0 · stderr vuoto · 6686 righe (identiche alle 6686 di src/types/database.types.ts)
diff types-rigenerati.ts src/types/database.types.ts → (NESSUNA DIFFERENZA)
```

Non è un `gen types` saltato: è girato, è uscito 0, ha prodotto 6686 righe. La spiegazione
dell'esecutore è corretta — cambia il **corpo** della funzione, che i tipi generati non descrivono.
📌 E lo stesso file **contiene ancora `paziente_nome_snapshot` (3 occorrenze)**: prova indipendente
che **nessuna colonna è stata cancellata**.

---

## 2. LE MIE SONDE — SQL e output incollato

Tutte in **transazione annullata**, fixture costruita **dentro**, una invocazione per sonda,
`SET LOCAL ROLE` dove il ruolo conta. Fixture riusata: `scripts/tmp/sonde-c-sexies/00-fixture.sql`
(snapshot che nasce **pieno** e `updated_at` arretrato di un'ora — `now()` è costante in transazione).

### Sonde dell'esecutore **rieseguite** (non fidandomi dell'output incollato)

| sonda | esito misurato da me | uguale al resoconto? |
|---|---|---|
| ① chiave rifiutata | `❌ P0001 atto unico: chiavi che non sono voci correggibili del documento: {paziente_nome_snapshot} (ammesse: {richiedente_nome,paziente_id,tipo_dispositivo,descrizione,denti_coinvolti,prescrizione_caratteristiche})` | ✅ sì |
| ③ snapshot invariato | `snapshot_dopo='SNAPSHOT-DA-NON-TOCCARE' · invariato=true · descrizione_dopo='NUOVA descrizione corretta'` | ✅ sì (e copre anche la ② : l'atterraggio è misurato sulla funzione **vera**) |
| ④ la prova sa diventare rossa | `esito_regola_vecchia={"esito":"ok",…} · snapshot_dopo='Mario Russo' · invariato=false` | ✅ sì |

### 🔴 M1 — la prova d'atterraggio sa vedere una riga del `SET` che manca? (**nuova**)

Vedi §1①. **Rosso atteso ottenuto** (`{richiedente_nome}`), **controprova verde** sulla stessa copia.

### 🔴 M2 — il `REVOKE` è portante? (**nuova, e la prima versione è morta sul proprio errore**)

Prima stesura: `❌ 42501 permission denied for table f` — la sonda moriva sul **suo** 42501 (le
tabelle temporanee della fixture erano concesse solo a `service_role`), non su quello che doveva
misurare. Aggiunto `GRANT SELECT ON f, g TO authenticated`:

```sql
SET LOCAL ROLE authenticated;
SELECT public.correggi_e_riemetti_atomica(…);
```
```
❌ 42501 permission denied for function correggi_e_riemetti_atomica
```

E dal catalogo: `proacl = {postgres=X/postgres,service_role=X/postgres}` · `prosecdef = true` ·
proprietario `postgres`. **Niente `PUBLIC`, niente `anon`, niente `authenticated`.**

### 🔴 M3 / M3-bis / M4 — l'ALTRA METÀ dell'allowlist (**nuova**)

🛑 **Tutte le sonde del resoconto toccano una sola chiave: `descrizione`.** Le due voci di
`c_su_penne` atterrano per una strada diversa, dentro una funzione riscritta da capo in 566 righe: se
la riscrittura le avesse disturbate, **nessuna sonda del resoconto se ne sarebbe accorta.**

```
M3-bis  denti_coinvolti = [{fdi:21,ruolo:elemento},{fdi:22,…}]
        → esito ok · denti_atterrati = [21, 22] · snapshot_dopo = 'SNAPSHOT-DA-NON-TOCCARE'

M4      prescrizione_caratteristiche = {colore:'A3'}   (fixture arricchita con una riga di prescrizione)
        → esito ok · colore_dopo = 'A3' · snapshot_dopo = 'SNAPSHOT-DA-NON-TOCCARE'

M3      le due insieme, SENZA riga di prescrizione
        → esito = {"esito":"senza_prescrizione"}   ← pre-volo fail-closed, niente toccato
```

➡️ **Tutte e sei le chiavi dell'allowlist sono ora provate ad atterrare**, e in nessuna delle sei lo
snapshot si muove.

### Catalogo e ledger

```
supabase_migrations.schema_migrations  → 20260808154033 · 20260808142358 · 20260808112700 ·
                                          20260808103515 · 20260808093513 …  (le 4 precedenti intatte)
COMMENT vivo → dice «SEI chiavi» = true · nomina «pazienti.nome» = true · nomina «PATCH» = true (5184 caratteri)
corpo del FILE 20260808154033 vs corpo VIVO (pg_get_functiondef) → 355 righe = 355 righe · IDENTICI: true
```

📌 **Il file committato È ciò che gira.** (L'esecutore aveva confrontato il vivo con il file
*precedente*; questo è il confronto che mancava.)

### Residui

```
sonde residue nel catalogo (proname LIKE 'sonda_%')  → 0
fixture residue (numero_lavoro LIKE 'SONDA-CSEX%')   → 0
git status                                            → pulito (solo il .diff non tracciato)
```

---

## 3. IL RISULTATO DELLA MUTAZIONE

| che cosa ho rotto | dove | prove accese |
|---|---|---|
| `paziente_nome_snapshot` rimesso in **`CAMPI_CORREGGIBILI_DOCUMENTO` e `CAMPI_TESTO`** | `src/lib/dichiarazione/correzioni.ts` | **7 su 8** (`7 failed \| 102 passed (109)`) |
| riga del `SET` di `richiedente_nome` **tolta** dalla copia viva della RPC | catalogo (copia usa-e-getta) | la **prova d'atterraggio dentro la funzione** (`P0001 … chiavi accettate ma NON atterrate`) |
| allowlist SQL + riga del `SET` **rimesse** (sonda ④ dell'esecutore) | catalogo (copia usa-e-getta) | sonde ① e ③ **entrambe** invertite (`ok` invece di `P0001`, `'Mario Russo'` invece dell'invariato) |
| file di prova **vecchio** contro codice **nuovo** | `tests/unit/correzioni-documento.test.ts` | **1 su 49** — la misura che dice quanto era sottile la rete prima di questo compito |

Tutto ripristinato: file identici agli originali, `109 passed (109)`, albero pulito.

---

## 4. LA FASE 7, RILANCIATA DA ME

```bash
npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"    # timeout 600000
```
```
> tsc --noEmit && eslint src --max-warnings 0 && vitest run && npm run build && npm run guardie && node scripts/segna-verifica.mjs full

 Test Files  448 passed | 6 skipped (454)
      Tests  5628 passed | 68 skipped (5696)
✓ Compiled successfully in 3.3s
✅ DS compliance OK · ✅ Guardia CSRF verde · ✅ reduced-motion · ✅ Coerenza documenti ·
✅ salvataggio automatico · ✅ progetti Playwright
VERIFY_EXIT=0
```

**Identico al resoconto.** Tutti e cinque i passaggi eseguiti davvero (`tsc`, `eslint`, `vitest`,
`next build`, guardie): non ci si è fermati a `tsc`.

**Il conto delle prove torna, e l'ho verificato da entrambi i lati:**

| file | prima (`c221f228`) | dopo (`f595f171`) | delta |
|---|---|---|---|
| `correzioni-documento.test.ts` | **49** (misurato riportando indietro il file) | **56** | **+7** |
| `riemissione-route.test.ts` | 53 | **53** | 0 — due prove **aggiornate sul posto**, zero cancellate |
| totale progetto | 5621 \| 68 su 454 | **5628 \| 68 su 454** | **+7** ✅ |

---

## 5. I RILIEVI

### 🟠 R1 — IMPORTANTE · Tre commenti stantii nel codice toccato, e uno **vive nel catalogo**

Il brief aveva fatto di questo un punto esplicito («🔴 **I COMMENTI VICINI AL CODICE TOCCATO — è il
difetto B3 del C-quinquies, e ricade qui uguale**») e il resoconto lo dà per fatto («intestazione
riscritta»). L'intestazione sì. **Tre righe no**, e la prima è la peggiore.

**(a) 🛑 `supabase/migrations/20260808154033_…sql:130` — ed è la riga 8 del CORPO VIVO.**

```
-- 🧬 L'ALLOWLIST — SETTE NOMI SCRITTI A MANO, e il `COMMENT` in fondo porta la
--    tabella chiave -> destinazione.
  c_su_lavori CONSTANT text[] := ARRAY['richiedente_nome','paziente_id','tipo_dispositivo','descrizione'];
  c_su_penne  CONSTANT text[] := ARRAY['denti_coinvolti','prescrizione_caratteristiche'];
```

I nomi sono **SEI**. E non è una svista senza precedente: **il compito prima quella riga l'aveva
aggiornata.**

```
20260808112700 (D-precedente) :109  → «OTTO NOMI SCRITTI A MANO»
20260808142358 (D319)         : 98  → «SETTE NOMI SCRITTI A MANO»   ← aggiornata
20260808154033 (D320)         :130  → «SETTE NOMI SCRITTI A MANO»   ← NON aggiornata
```

`grep "SETTE NOMI SCRITTI A MANO" <pg_get_functiondef>` → **riga 8**. È la **prima riga che legge**
chi apre la funzione viva, ed è falsa.

🔴 **E non è igiene: è una riga falsa messa nel punto esatto da cui si auto-propaga.** La regola di
casa — scritta nell'intestazione di questa stessa migration e seguita da tutti i compiti dell'ondata —
è che **il corpo si ribatte dal CATALOGO VIVO, non dal file**. Quindi il prossimo che riscriverà questa
funzione lancerà `pg_get_functiondef`, si troverà «SETTE NOMI» sopra un elenco di sei, e **lo ricopierà
in avanti**: è lo stesso meccanismo della deriva delle date di `CLAUDE.md` §0F — «*ogni sessione leggeva
la data del documento precedente e andava avanti di uno*», e nessun passaggio la confrontava con un
orologio. Qui l'orologio è l'array sottostante, e nessuno lo guarda.

⚠️ **Il costo è già salito:** la migration è applicata e registrata, quindi correggerla richiede
`DROP`→`CREATE`→`REVOKE`→`GRANT`→`COMMENT` in una migration nuova. Il momento in cui costava zero era
prima del push.
📌 **E l'occasione non arriva da sola:** letto il piano, **né il Task D né il Task E riscrivono questa
funzione** (D è il foglio a schermo, E l'avviso al dentista). Quindi non c'è una migration «prossima»
in cui infilarla per inerzia.
➡️ **La consegna è nominata, non accodata: la PRIMA migration che riemette
`correggi_e_riemetti_atomica` deve correggere quella riga**, e chi la scrive va avvertito nel suo
brief — perché la ribatterà dal vivo, cioè dalla copia sbagliata.

**(b) `src/lib/dichiarazione/correzioni.ts:340` — dentro la funzione di cui è stato riscritto il commento.**

```ts
// Vista non tipizzata sulla COPIA: le otto chiavi sono nomi che arrivano da fuori…
const fuso: Record<string, unknown> = { ...lavoro }
```

Sono **sei**. Sta **sei righe sotto** il blocco di commento che l'esecutore ha ampliato in questo
commit (righe 326-333). Era già stantìa da D319 («otto» era vero fino a due compiti fa).

**(c) `src/lib/dichiarazione/correzioni.ts:293` — e questa è quella che si dimostra da sola.**

```ts
// 🔑 E LE SOTTO-CHIAVI SI RIPULISCONO AI BORDI come i cinque testi di primo livello (D242, C3)
```

Sono **tre**. E nello **stesso commit** l'esecutore ha corretto **la frase gemella** nel file di prova:

```
tests/unit/correzioni-documento.test.ts:278
  «le sotto-chiavi arrivano RIPULITE ai bordi, come i tre testi di primo livello (D242)»   ← corretta
src/lib/dichiarazione/correzioni.ts:293
  «…come i cinque testi di primo livello (D242, C3)»                                        ← lasciata
```

Sapeva che il numero era passato da cinque a tre, l'ha scritto nella copia e ha lasciato l'originale.

➡️ **Nessuna delle tre cambia un comportamento.** Restano IMPORTANTI perché il brief le nominava per
nome, il resoconto le dà per chiuse, e **(a) è finita in banca dati**.

---

### 🟡 R2 — MINORE · La destinazione è scritta ovunque tranne che nella frase che l'utente legge

R-P6 chiede che un nome tolto da un'allowlist porti **la sua destinazione**, e la destinazione è
**scritta** in tre posti: l'intestazione di `correzioni.ts`, i commenti della migration, e il `COMMENT`
vivo (verificato sul catalogo: nomina `pazienti.nome` e `PATCH`).
🛑 **«Scritta» è tutto ciò che ho verificato: che quella destinazione FUNZIONI non l'ho esercitato.**
`PATCH /api/pazienti/[id]` e `PazienteEditSheet` sono fuori perimetro e non sono stati toccati da
nessuno; che portino davvero una correzione di `nome`/`cognome` fino al documento **lo prendo dal brief,
non da una mia misura** (v. §7.5). Tutto ciò che segue in questo rilievo, e l'intera tesi «il nome si
corregge altrove», poggia su quell'anello non provato.

**Ma il messaggio che arriva a schermo è questo** (`correzioni.ts:200`):

```
Da qui non si corregge «paziente_nome_snapshot» (si correggono: richiedente_nome, paziente_id, …).
```

Dice **da dove no**, non **dove sì**. Chi sta al banco legge «da qui non si corregge» e resta fermo.
🔑 Il metro non è mio: è dell'esecutore stesso, nel commento della sua prova sul valore vuoto —
«*«la correzione è vuota» manderebbe chi sta al banco a riempire una casella che non esiste più*».
Lo stesso ragionamento vale una riga più su.
➡️ **Non è un difetto di questo compito** (il brief chiedeva la destinazione nel `COMMENT`, e c'è) ed
è probabilmente **materia del Task D**, che disegna il foglio. Ma va scritto ora, o si perde.

---

### 🟡 R3 — MINORE (preesistente al Task C-sexies) · Il test dell'elenco esatto **non guarda il SQL**

`tests/unit/correzioni-documento.test.ts:59-62` dichiara:

> «*Lo stesso elenco vive nella RPC (`c_su_lavori || c_su_penne`). Sono due scritture della stessa
> verità e questo test è l'unico posto in cui si guardano in faccia*»

**Non si guardano in faccia:** il test asserisce una **terza copia scritta a mano** dentro il test
stesso. Nessuna prova della suite legge `pg_get_functiondef`. Se domani qualcuno cambiasse solo il
TypeScript, il SQL divergerebbe **e la suite resterebbe verde**.

🔑 **E il confronto vero esiste — ma non sopravvive alla sessione.** L'unica cosa che mette davvero i
due elenchi uno di fronte all'altro è la **sonda ①**: manda la chiave alla RPC viva e legge nel
messaggio d'errore l'elenco delle ammesse (`{richiedente_nome,paziente_id,tipo_dispositivo,descrizione,
denti_coinvolti,prescrizione_caratteristiche}`) — cioè **il SQL che si dichiara**. Quella sonda vive in
`scripts/tmp/sonde-c-sexies/`, **cartella ignorata da git e non committata**: usa-e-getta per scelta
dichiarata, e quindi il giorno dopo non c'è più.
➡️ **Il rilievo esatto è questo:** il confronto fra le due allowlist non è assente, è **usa-e-getta** —
mentre la frase nel test dice che è permanente. È la stessa lezione già pagata con `scripts/psql.mjs`
(spostato sotto git il 05/08 perché «*un attrezzo che sparisce trasforma una misura in
un'affermazione*»).

📌 Oggi i due elenchi **coincidono** — verificato in due modi indipendenti (TS: 6 nomi; catalogo:
`c_su_lavori` 4 + `c_su_penne` 2; e la sonda ① li ha letti dal messaggio della funzione viva). Il
rilievo è sulla **rete**, non sullo stato.
➡️ Preesistente (nasce col Task C), **fuori dal mandato C-sexies**, ma è la stessa famiglia di difetto
che questo compito combatte: una verità in due posti, e nessuna prova permanente che li confronti.

---

### 🟡 R4 — MINORE (preesistente) · «Perde l'ULTIMA PENNA» è vero per l'applicazione, non per il database

Il `COMMENT` vivo e il messaggio di commit dicono: «*da questa migration nessuna funzione del
catalogo e nessuna rotta la scrive più*». **Vero, e l'ho verificato più a fondo dell'esecutore (§1③).**
Ma un lettore può capire che sia il **database** a rifiutare la scrittura, e non è così:

```sql
SELECT grantee, privilege_type FROM information_schema.column_privileges
 WHERE table_name='lavori' AND column_name='paziente_nome_snapshot' AND privilege_type='UPDATE';
```
```
anon · authenticated · postgres · service_role
```

Sono i `GRANT` predefiniti di Supabase sulla tabella — **non introdotti da questo compito** e identici
prima e dopo. E il filtro RLS **c'è davvero**, misurato invece che supposto:

```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename='lavori' AND cmd IN ('UPDATE','ALL');
→ lavori_laboratorio_update (UPDATE) · tenant_update (UPDATE)
```

La porta chiusa da D320 è quella **dell'applicazione**; PostgREST resta una strada teorica, filtrata da
due politiche di riga. ⚠️ **Ho letto che le politiche esistono, non ho provato che rifiutino**: per
farlo servirebbe una sessione `authenticated` vera (v. §7.2).
➡️ **Nessuna azione richiesta**: una mezza riga di precisione nel prossimo testo che cita la frase.

---

## 6. IL PERIMETRO — verificato voce per voce

```bash
git diff --name-only c221f228..f595f171
```
```
.superpowers/sdd/atto-unico-task-c-sexies-report.md
src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts
src/lib/dichiarazione/correzioni.ts
supabase/migrations/20260808154033_atto_unico_snapshot_paziente_fuori.sql
tests/unit/correzioni-documento.test.ts
tests/unit/riemissione-route.test.ts
```

| voce che NON doveva essere toccata | esito |
|---|---|
| `src/lib/pdf/generate-ddc.ts` | ✅ **intatto** (non nell'elenco) |
| `src/lib/consegna/precheck.ts` | ✅ **intatto** |
| `PATCHABLE_FIELDS` di `lavori/[id]/route.ts` | ✅ **intatto** — esclude ancora lo snapshot con la vecchia motivazione (riferito dall'esecutore, non corretto: giusto così) |
| `riemetti_ddc_atomica` | ✅ **intatta** — nella migration compare **2 volte, entrambe in commento** (righe 99 e 421) |
| `crea_rifacimento_atomico` | ✅ **intatta** — 1 occorrenza, **in commento** (riga 76) |
| `PATCH /api/pazienti/[id]` · `PazienteEditSheet` | ✅ **intatti** |
| `DevoIntervenire.tsx` (`…/scheda-v3/`) | ✅ **intatto**, e **non nomina** la chiave (0 occorrenze) |
| nessuna colonna cancellata | ✅ `DROP COLUMN` → **0** · `ALTER TABLE` → **0** nella migration; la colonna è ancora nei tipi generati (3 occorrenze) |

**L'unica modifica fuori dai file «suoi»** è `riemetti/route.ts:257`. Verificata: **una riga sola, ed
è un commento.**

```diff
-  // ── ② LE SETTE VOCI (erano OTTO fino a D319: v. `correzioni.ts`) ──────────
+  // ── ② LE SEI VOCI (OTTO fino a D319, SETTE fino a D320: v. `correzioni.ts`) ─
```

Nessuna logica, nessuna asserzione, **I3 intatto**, e il testo nuovo è aritmeticamente corretto.
➡️ **Rientra nell'eccezione dichiarata dal mandato.** Era davvero resa falsa dal cambiamento.

**Migration:** le sole istruzioni sono `DROP FUNCTION` → `CREATE FUNCTION` → `REVOKE` → `GRANT` →
`COMMENT` sulla **stessa firma** (`uuid,uuid,uuid,jsonb,jsonb,timestamptz`). Il `diff` con la
migration precedente (`20260808142358`) mostra **solo commenti + le due modifiche mandate**: il nome
fuori da `c_su_lavori`, la riga fuori dal `SET`.

---

## 7. 🛑 CHE COSA NON HO VERIFICATO — per intero

1. **Niente prova a schermo (FASE 9 / 9b).** Nessun pixel è cambiato e il foglio del Task D non
   esiste ancora: **coerente**, ma resta non verificato che l'esperienza a schermo sia sensata.
2. **Non ho provato una scrittura diretta via PostgREST** con un JWT `authenticated` vero su
   `lavori.paziente_nome_snapshot` (R4): **ho letto i `GRANT`, non ho esercitato RLS.** Servirebbe una
   sessione autenticata vera. Quindi non so **se** RLS la fermerebbe — so solo che il permesso di
   colonna c'è.
3. **Non ho generato un PDF.** Che `generate-ddc.ts:304` faccia vincere lo snapshot l'ho verificato
   **leggendo la riga**, non stampando un documento. Tutto il ragionamento B1 dell'esecutore poggia su
   quella lettura, mia e sua.
4. **Non ho provato il giro completo dal vivo** (login → riemissione dal browser → PDF). Le sonde
   parlano con la RPC, non con la rotta HTTP.
5. **Non ho verificato `PATCH /api/pazienti/[id]` dal vivo**: che la destinazione dichiarata funzioni
   davvero l'ho preso dal brief (che la marca `provato:` con le righe) e dal fatto che il file non è
   stato toccato. **Non l'ho esercitata.**
6. **Non ho riletto le 42 occorrenze nelle prove** una per una: ho misurato che la suite è verde, che
   il conteggio torna (+7) e che il file vecchio contro il codice nuovo dà 1/49. Non ho controllato
   che ogni singola prova rimasta asserisca ancora ciò che dice di asserire.
7. **Non ho valutato la sostanza normativa di D320** (se l'Allegato XIII imponga o meno quel campo):
   la decisione è ratificata a monte, io ho verificato l'**esecuzione**.
8. **Non ho verificato BP-1** (MEMORY.md · ROADMAP-UFFICIALE.md · verbale): l'esecutore dichiara di
   non averli toccati perché «la memoria è di chi chiude l'ondata». **Coerente con R-E1, ma resta un
   debito aperto in capo all'orchestratore** — non l'ho misurato.
9. **Non ho misurato le prestazioni** della funzione riscritta, né l'effetto dell'indice GIN citato.
10. ⚠️ **Un mio errore, dichiarato:** costruendo la sonda di controprova ho scritto
    `cat … R-M1b.sql > R-M1B.sql` — su macOS il filesystem **non distingue maiuscole e minuscole**,
    quindi `cat` ha scritto dentro il proprio ingresso e ha riempito il disco (**189 GB**, `EXIT=137`,
    `No space left on device`). Rilevato, file cancellati, spazio recuperato (`189Gi Avail`), sonda
    rifatta con nomi non ambigui. **Nessun effetto sul repository né sul database** — ma per una
    ventina di minuti due sonde sono morte per questa ragione e non per ciò che misuravano.

---

## 8. I TRE RITROVAMENTI GIÀ NOTI — non ri-riferiti come nuovi

**I3** (una sola asserzione sulla porta d'idempotenza) · **M1** (lo `switch` senza `default`) ·
**`{"denti_coinvolti": []}`**. Li ho incontrati tutti e tre leggendo `riemetti/route.ts` e la RPC.
**Non li conto fra i miei rilievi.**

Confermo inoltre che i **cinque ritrovamenti fuori mandato** del §6 del resoconto sono legittimi e
correttamente **riferiti e non corretti** (R-E2). Ne ho verificati due:
- **#3** — l'indice GIN `idx_lavori_search` esiste davvero (`schema.sql:1020`, `to_tsvector(… || paziente_nome_snapshot)`);
- **#4** — la riga con lo snapshot **è** `TEST-DdC-001` (`paziente_id` NULL, stato `pronto`), non la
  fixture del seed. Misura di B1 riprodotta esatta: `lavori_tot=299 · con_snapshot=1 · snapshot_vuoto=0`.

📌 **Calibratura su B1**, e va detta: l'unica riga interessata si chiama `TEST-DdC-001` e vive in un
database che `CLAUDE.md` §8 dichiara **di soli dati di prova**. Come **osservazione sul contratto** il
rilievo è giusto e l'esecutore ha fatto bene a scriverlo; come **rischio di prodotto** è basso, ed è
già in coda come decisione a sé. **Non va gonfiato.**

---

## 9. In una riga

Il compito fa esattamente ciò che il mandato chiedeva, con un perimetro pulito e prove che sanno
diventare rosse. **Le due sonde che l'esecutore non aveva fatto — il verso opposto sulla prova
d'atterraggio, e l'altra metà dell'allowlist — gli danno ragione entrambe.** Ciò che resta sono tre
righe di commento diventate false, e **una è finita in banca dati, nel punto esatto da cui il prossimo
esecutore la ricopierà in avanti**.

**Le due consegne, in ordine:**
1. 🟠 **La prima migration che riemette `correggi_e_riemetti_atomica` corregge «SETTE NOMI» → «SEI
   NOMI»** (riga 8 del corpo vivo), e chi la scrive va avvertito nel brief: la ribatterà dal catalogo,
   cioè dalla copia sbagliata. Né il Task D né il Task E riemettono quella funzione.
2. 🟡 Due righe di commento in `src/lib/dichiarazione/correzioni.ts` (**340**: «le otto chiavi» → sei ·
   **293**: «i cinque testi di primo livello» → tre). Non serve una migration: è un commit di poche
   battute, da fare prima che diventi anch'esso storia.

# REVISIONE — Task B, «Correggi e rifai la dichiarazione» (atto unico)

**Revisore:** sessione indipendente, nessuna modifica al codice · **Data:** 08/08/2026
**Oggetto:** `bfcafc2f..13e010fe` — migration `20260808093513_correggi_e_riemetti_atomica.sql`,
`src/types/database.types.ts`, `.superpowers/sdd/atto-unico-task-b-report.md`
**Metodo:** catalogo vivo (`pg_get_functiondef` · `proacl` · `pg_indexes` ·
`supabase_migrations.schema_migrations`), **17 sonde mie** (`provato:` `ls scripts/tmp/revisione-b/R*.sql
| wc -l` → `17`, di cui **due sono controprove** — R3b · R9b — perché un rosso senza il suo verde prova
solo che «qualcosa esplode», e **una è un confronto col modello** — R6 su `riemetti_ddc_atomica`, che è
ciò che permette di dire «ereditato» invece di «introdotto») in transazione annullata, fixture costruita
**dentro** la transazione, **una invocazione per sonda**, ruolo forzato con `SET LOCAL ROLE`.
Sonde e dump: `scripts/tmp/revisione-b/` (ignorato da git — il codice delle sonde è incollato qui sotto
dove serve).

> ⚠️ **`HEAD` si è mosso mentre revisionavo, e l'ho controllato invece di ignorarlo.** A metà lavoro il
> ramo è passato a `ad08cc6b` (*«P10-bis — la mia ragione sul gettone era sbagliata»*). `provato:`
> `git diff --stat 13e010fe..HEAD` → **un solo file, il piano, 2 righe**: nessun tocco alla migration
> né ai tipi. **Il perimetro della revisione non cambia e il verdetto resta valido.** 🔑 Quel
> salvataggio **corrobora** in modo indipendente il §4 punto 1 di questa revisione: chi ha scritto il
> piano ha rimisurato `now() = transaction_timestamp()` per conto proprio ed è arrivato alla stessa
> conclusione dell'esecutore e alla mia.

---

## 0. VERDETTO — **APPROVATO CON RILIEVI**

**Perché in una frase:** su tutte e nove le domande del mandato l'artefatto regge la verifica
indipendente — atomicità, isolamento tenant, indice, ordine, R-P6, permessi, FASE 6b — e i tre difetti
che ho trovato **non sono stati introdotti dal Task B** (due sono ereditati dal modello
`riemetti_ddc_atomica`, uno è una domanda di perimetro che l'esecutore ha correttamente riferito invece
di tapparla), ma **due di essi non sono nel resoconto e vanno chiusi nel Task C**, perché è lì che
diventano raggiungibili.

**Detto piano:** il brief chiedeva sette cose — atomicità, isolamento tenant, l'indice, l'ordine
annullo→correggi→inserisci, R-P6 sulle chiavi, i permessi `SECURITY DEFINER`, la FASE 6b — e **tutte e
sette reggono sotto sonde indipendenti**. **Niente di ciò che ho trovato è stato introdotto da questo
esecutore.** Il lavoro è buono.

🛑 **Nessun rilievo CRITICO.** Il difetto più caro possibile — un `RETURN` sopravvissuto dopo la prima
scrittura — **non c'è**, e l'ho verificato sul corpo vivo, non sul file.

🔴 **Ma «0 CRITICO» non vuol dire «niente qui può fare male», e le due cose vanno tenute separate:
la GRAVITÀ di uno stato e l'ATTRIBUZIONE di chi l'ha creato sono assi diversi.** Il rilievo **R1** —
`p_nuova` che fa nascere la dichiarazione già annullata — produce uno stato di gravità **critica** (un
lavoro consegnato senza nessuna dichiarazione viva, invisibile a ogni indice), raggiunto per via
**gentile**. È classificato IMPORTANTE perché **è ereditato dal modello e non introdotto dal Task B**,
non perché sia innocuo. ➡️ **La conseguenza è un cancello, non un consiglio: il punto 1 della §5
BLOCCA il Task C.**

| | |
|---|---|
| rilievi **CRITICO** | **0** |
| rilievi **IMPORTANTE** | **3** (R1 · R2 · R3) — tutti ereditati o di perimetro, tutti a carico del Task C |
| rilievi **MINORE** | **2** (R4 · R5) |
| affermazioni dell'esecutore **riprovate da me** | **11** |
| affermazioni **prese per buone senza riprovarle** | **3**, elencate in §1 (tabella B) |

---

## 1. 🛑 CHE COSA HO VERIFICATO IO, E CHE COSA HO PRESO PER BUONO

*(È la parte più preziosa della revisione, quindi viene prima dei rilievi.)*

### Verificato da me, sul catalogo vivo o con sonda mia

| # | affermazione dell'esecutore | come l'ho riprovata | esito |
|---|---|---|---|
| 1 | dopo la prima scrittura **non c'è nessun `RETURN`**, solo `RAISE` | `pg_get_functiondef` + grep sul corpo **vivo** | ✅ **vera** — §2.1 |
| 2 | un `paziente_id` di un altro laboratorio è **rifiutato** | sonda R1, fixture mia con paziente del lab `314cd040…` | ✅ **vera** — §2.2 |
| 3 | doppio invio con lo stesso evento → `23505` | sonda R3 (+ controprova R3b con evento diverso) | ✅ **vera** — §2.3 |
| 4 | il nuovo indice cambia il comportamento di `riapri_lavoro_atomica` | corpo vivo di `riapri_lavoro_atomica` + sonda R9 | ✅ **vera, e più vicina di come la descrive** — §2.3 |
| 5 | il rischio di quel cambiamento è **basso** («l'interfaccia conia un evento nuovo a ogni giro») | letto `eventi-qualita/route.ts:378-383` e `:457` | ✅ **vera** — l'evento nasce da un `INSERT` dentro lo stesso POST che poi smista l'azione |
| 6 | l'ordine annullo → correzioni → inserimento è quello vivo, e la prescrizione **atterra** | sonda R2, 17 asserzioni mie | ✅ **vera** — 17 su 17 |
| 7 | il controllo R-P6 copre le otto voci e **rifiuta** `stato` (colonna vera) | sonda R4 | ✅ **vera** — §2.5 |
| 8 | `{"denti_coinvolti": []}` cancella tutti i denti | sonda R7 | ✅ **vera**, ed è un caso di un difetto più generale — §3 R2 |
| 9 | sonda 2 (`conflitto`), sonda 8 (forma dei denti), sonda 9 (la penna dice no dopo l'annullo) | sonde R12 · R13 · R10/R10b | ✅ **tutte riprodotte**, messaggi identici |
| 10 | chiamata con la chiave pubblica → `42501` | sonda R11 con `SET LOCAL ROLE anon` | ✅ **vera** |
| 11 | FASE 6b: tipo generato presente, `tsc` a zero | rieseguito `npx tsc --noEmit` | ✅ **vera** — §2.9 |

### 🛑 Preso per buono SENZA riprovarlo — dichiarato

| # | affermazione | perché non l'ho riprovata |
|---|---|---|
| A | **R-P4, «14 su 14»** con l'abbozzo inerte (`0/14` → `14/14`) | rifarlo vuol dire `DROP`/`CREATE` della funzione viva dentro una transazione: rumore sul catalogo per una **misura di processo**. ⚠️ Ho però verificato la parte sostanziale — le **due asserzioni «nate cieche»** che l'esecutore dice di aver rifatto: nella mia fixture il lavoro parte da `paz_vecchio` e la correzione manda `paz_nuovo`, e la «nuova viva» è cercata con `id <> ` quella di partenza. Con quelle due forme **le asserzioni non possono essere verdi per inerzia**. L'affermazione è internamente coerente e la sua parte falsificabile regge |
| B | l'esito della sonda **1b** (secondo giro con evento diverso) come lo incolla il resoconto | l'ho rifatto **nella mia forma** (R3b, esito `ok`, `totali 3 · vive 1`), non confrontando i suoi UUID |
| C | che `scripts/tmp/dump-def.mjs` e `scripts/tmp/sonde-b/` siano esistiti come descritto | `scripts/tmp/` è ignorato da git: **non sono verificabili per costruzione**. Ho riscritto tutto da zero, ed è il motivo per cui il resoconto fa bene a incollare la fixture per intero (§3-ter) |

---

## 2. LE NOVE DOMANDE, CON LE PROVE

### 2.1 🔴 L'atomicità regge davvero? — **SÌ**

Nessun `RETURN` sopravvissuto dopo la prima scrittura. Sul **corpo vivo** (`pg_get_functiondef`,
267 righe), le uscite «gentili» stanno tutte **sopra** la barriera:

```
 99: IF NOT FOUND THEN RETURN … 'non_trovato'
104:   RETURN … 'conflitto'
110: IF NOT FOUND THEN RETURN … 'evento_non_valido'
123:   IF NOT FOUND THEN RETURN … 'paziente_non_valido'
133:   RETURN … 'senza_prescrizione'
143: IF NOT FOUND THEN RETURN … 'nessuna_dichiarazione_viva'
146: -- ║  DA QUI IN POI SI SCRIVE. Ogni fallimento è un RAISE, mai un RETURN. ║
161:   RAISE EXCEPTION 'atto unico: annullo … fallito'
182:     RETURNING * INTO v_lavoro_dopo          ← clausola, non un'uscita
196:   RAISE EXCEPTION '… chiavi accettate ma NON atterrate su lavori'
205:   RAISE EXCEPTION '… la penna dei denti ha risposto %'
223:   RAISE EXCEPTION '… la penna della prescrizione ha risposto % sul campo %'
257: RETURN json_build_object( 'esito','ok', …)   ← l'unica uscita dopo la barriera
```

🔑 **E ho chiuso l'altro modo di committare mezzo atto senza nessun `RETURN`:** un blocco
`BEGIN … EXCEPTION WHEN …` apre una sotto-transazione, e un errore inghiottito lì dentro annulla **solo
il blocco interno** lasciando proseguire fino al `RETURN` di successo. Non ce n'è nessuno, né nell'atto
unico né nelle due penne che chiama:

```
provato: SELECT proname, (length(prosrc)-length(replace(prosrc,'EXCEPTION','')))/9 …
correggi_e_riemetti_atomica       :: EXCEPTION-count=11 :: RAISE-count=12
lavoro_denti_sostituisci_atomica  :: EXCEPTION-count=0  :: RAISE-count=0
lavoro_prescrizione_correggi_typo :: EXCEPTION-count=0  :: RAISE-count=0
```
Le 11 occorrenze di `EXCEPTION` sono le 11 `RAISE EXCEPTION` contate sopra (la dodicesima `RAISE` è
nel commento della barriera): **zero blocchi gestore**. Le due penne non hanno né gestori né `RAISE` —
rispondono solo con json, che è precisamente ciò che rende sensata la disciplina
`IF v_esito ->> 'esito' <> 'ok' THEN RAISE`.

**Prova a rovescio (sonda R10b):** una penna che risponde «no» **dopo** l'annullo disfa anche l'annullo.
```
catturato: P0001 atto unico: la penna della prescrizione ha risposto {"esito":"campo_non_valido"} sul campo pippo
e1_annullo_disfatto: true | e2_causale_disfatta: true | e3_lavoro_disfatto: true | e4_nessuna_nuova: true
```

---

### 2.2 🔴 Isolamento tenant — **REGGE** (sonda R1, fixture mia)

`paziente_id` preso dal laboratorio `314cd040-0893-4e9d-9ad8-786e4eefd75f`, chiamata sul lavoro del
laboratorio `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c`, come `service_role`:

```
esito: {"esito" : "paziente_non_valido"}
d1_paziente_intatto: true | d1b_descrizione_intatta: true
d2_vecchia_ancora_viva: true | d3_nessuna_nuova: true
```
🔑 L'esito è **gentile e sta prima dell'annullo** (riga 123 < barriera 146): la `descrizione`, mandata
nella stessa chiamata, **non è stata scritta**. Il controllo è al posto giusto: la funzione è
`SECURITY DEFINER`, quindi scavalca le RLS, e senza questa riga la fuga sarebbe **della funzione**, non
della rotta.

---

### 2.3 🔴 L'indice fa il suo lavoro, e il rilievo su `riapri_lavoro_atomica` — **CONFERMATO, e va esteso**

**Il doppio invio dà `23505` (sonda R3):**
```
ERRCODE=23505 duplicate key value violates unique constraint "ddc_evento_annulla_unique"
DETAIL=Key (laboratorio_id, annullata_da_evento_id)=(971061a1-…, 283c1f33-8970-4fe7-9ca4-351c645f572e) already exists.
```
**Controprova (R3b): con un evento diverso il secondo giro passa** — `totali 3 · vive 1`. Senza questa,
il rosso proverebbe solo che «qualcosa esplode».

**Il rilievo dell'esecutore è VERO** — `riapri_lavoro_atomica:100-103`, letta dal catalogo, scrive la
stessa colonna:
```sql
UPDATE dichiarazioni_conformita
   SET stato = 'annullata', annullata_da_evento_id = p_evento_id
 WHERE lavoro_id = … AND laboratorio_id = … AND stato <> 'annullata';
```

🔑 **Ma la sequenza che descrive («riapri → riconsegna → riapri con lo stesso evento») è quella
LONTANA. Ce n'è una più vicina, e il resoconto non la nomina** — *correggi con l'evento E, poi riapri
con lo stesso E*, **senza nessuna riconsegna di mezzo** (sonda R9):
```
[1] correggi_e_riemetti_atomica(…, evento) → {"esito":"ok", …}
[2] riapri_lavoro_atomica(…, STESSO evento)
    ERRCODE=23505 … "ddc_evento_annulla_unique"
    DETAIL=Key (laboratorio_id, annullata_da_evento_id)=(971061a1-…, b7dfcb38-…) already exists.
```
Controprova R9b: con `evento2` → `{"esito":"ok","ddc_assente":false}`.

**GIUDIZIO: irrigidimento accettabile, NON una regressione** — e la ragione l'ho misurata io, non
presa dal resoconto. L'evento **nasce dentro la stessa richiesta che poi smista l'azione**:
`src/app/api/lavori/[id]/eventi-qualita/route.ts:378-383` fa l'`INSERT` in `eventi_qualita` e ne prende
l'`id`; `:457` chiama `riapri_lavoro_atomica` **con quell'id appena coniato**. Non esiste oggi un
percorso che riproponga un evento già speso. L'invariante che l'indice afferma — *un evento annulla al
più una dichiarazione per laboratorio* — è quella voluta, ed è scritta nel `COMMENT` come
un'affermazione. ✅ **L'esecutore ha fatto la cosa giusta a riferirlo senza correggerlo (R-E2).**

⚠️ **Ma diventa un vincolo sul Task C**, ed è il punto da portare via: vedi §5.

---

### 2.4 🟠 L'ordine è quello vivo, e la prescrizione **atterra** — **SÌ** (sonda R2, 17 su 17)

La guardia che rende l'ordine obbligatorio, letta sul catalogo
(`lavoro_prescrizione_correggi_typo:122-127`), controlla `stato <> 'annullata'`: dopo l'annullo e prima
dell'inserimento la finestra è **aperta**. Provato, non dedotto:

```
esito: {"esito":"ok","nuova_id":"16c1012a-…","vecchia_id":"e819235f-…",
        "numero":"REV-2098-0002","numero_superato":"REV-2098-0001", …}

a01_richiedente_nome true   a02_paziente_id       true   a03_paziente_snapshot  true
a04_numero_prescrizione true a05_tipo_dispositivo true   a06_descrizione        true
a07_denti_tabella    true   a08_denti_denorm      true   a08b_denti_mancanti    true
a09_prescr_colore    true   a10_prescr_elementi   true   ← NON «congelata»: atterra
a11_vecchia_annullata true  a12_causale_scritta   true
a13_nuova_viva       true   a14_filo_sostituisce  true
a15_nuova_senza_causale true a16_nuova_eredita_stato true
```

🔑 **Tre asserzioni sono mie e non stanno nel resoconto**, e chiudono altrettanti modi silenziosi di
sbagliare: `a08b` manda un dente con `ruolo: mancante` e verifica che finisca in **`denti_mancanti`**
e non in `denti_coinvolti` (la penna smista davvero); `a15` verifica che la **nuova** nasca **senza**
causale d'annullo; `a16` che erediti lo `stato` della vecchia (`generata`) — cioè che la copia locale
`v_vecchia` letta **prima** dell'`UPDATE` non sia stata inquinata dall'annullo.

---

### 2.5 🟠 R-P6, nessuna chiave si perde muta — **SÌ, e la sonda con `stato` è valida** (sonda R4)

```
ERRCODE=P0001 atto unico: chiavi che non sono voci correggibili del documento: {stato}
  (ammesse: {richiedente_nome,paziente_id,paziente_nome_snapshot,numero_prescrizione,
             tipo_dispositivo,descrizione,denti_coinvolti,prescrizione_caratteristiche})
```
✅ **La prova è valida, e la scelta di `stato` è migliore di `pippo`**: `stato` **è** una colonna vera
di `lavori` (la fixture stessa la scrive), quindi il controllo del *modello* — «è una colonna della
tabella?» — l'avrebbe **accettata**. La sonda dimostra che qui l'allowlist è l'elenco delle **otto voci
stampate**, non «i campi di `lavori`». È esattamente il difetto che R-P6 esiste per impedire, e la
sonda lo aggredisce nel punto giusto.

⚠️ Nota tecnica che regge il controllo: `array_agg` su zero righe restituisce `NULL`, quindi
`IF v_ignote IS NOT NULL` è il modo corretto di scrivere «nessuna chiave ignota» — non un `count(*)=0`.

---

### 2.6 🟠 `p_nuova` deve portare `numero_ddc`/`progressivo_ddc` — **VERO A METÀ, e la metà mancante è la pericolosa**

L'esecutore (§7d) scrive: *«`p_nuova` DEVE portare `numero_ddc` e `progressivo_ddc` nuovi, o
`jsonb_populate_record` eredita quelli della vecchia e l'`INSERT` sbatte»*. **Sui due nomi insieme la
frase è falsa, e la differenza fra i due è tutta la sostanza.** Vedi §3 R1.

**Senza `progressivo_ddc` → collisione RUMOROSA** (sonda R8a), ed è la metà che il resoconto descrive:
```
ERRCODE=23505 … "dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key"
DETAIL=Key (laboratorio_id, anno_ddc, progressivo_ddc)=(971061a1-…, 2098, 998001) already exists.
```

**Senza `numero_ddc` → NESSUNA collisione, ed è SILENZIOSA** (sonda R8b). `numero_ddc` **non ha un
vincolo unico proprio** (`pg_indexes` su `dichiarazioni_conformita`: gli unici unici sono `pkey`,
`(laboratorio_id, anno_ddc, progressivo_ddc)`, `ddc_sostituisce_unique`, `ddc_evento_annulla_unique`,
`ddc_lavoro_attiva_unique` — **nessuno tocca `numero_ddc`**):
```
esito: {"esito":"ok", …, "numero":"REV-2098-0001", "numero_superato":"REV-2098-0001"}

numero_ddc      progressivo_ddc  stato       e_la_vecchia
REV-2098-0001   998001           annullata   true
REV-2098-0001   998002           generata    false     ← STESSO NUMERO STAMPATO
```
🔴 **Due dichiarazioni a valore legale con lo stesso numero stampato**, una annullata e una viva, e la
funzione risponde `ok`. Il valore di ritorno lo **dichiara persino** (`numero` = `numero_superato`) e
nessuno lo guarda.

---

### 2.7 🟠 `{"denti_coinvolti": []}` cancella tutti i denti — **VERO**, ed è un caso di un difetto più largo

Vedi §3 R2 per la formulazione generale. Il caso puntuale, dal corpo vivo della penna
(`lavoro_denti_sostituisci_atomica:33-50`): `DELETE` incondizionato, poi `INSERT … FROM
jsonb_array_elements(COALESCE(p_denti,'[]'))` — con `[]` si cancella e non si reinserisce, e la
denormalizzazione va a `'{}'` per via dei `COALESCE` alle righe 84-89. La guardia di forma dell'atto
unico **non lo ferma** perché `EXISTS(SELECT … FROM jsonb_array_elements('[]'))` è `false` su zero
righe. Misurato (sonda R7): `denti_rimasti: 0 · denorm: {}`.

**È accettabile a questo livello?** ✅ **Sì**, e la scelta dell'esecutore di non bloccarlo è giusta: dal
livello della banca dati `[]` è **indistinguibile** da «questo lavoro non ha denti», che è un dato
legittimo. Il posto dove si distingue è la schermata, cioè il Task C/D. 🛑 **Ma va chiuso lì, e non
dimenticato:** una dichiarazione ex Allegato XIII senza denti è un elemento del documento che sparisce.

---

### 2.8 🔵 Il resoconto dice il vero? — **SÌ**, con una correzione

Ho ricontrollato a campione **otto** delle nove sonde riproducendole nella mia forma: 1 (R3), 1b (R3b),
2 (R12), 3 (R4), 4 (R11), 6 (R2), 7 (R1), 8 (R13), 9 (R10b). **Tutti gli esiti si riproducono**, e i
messaggi d'errore incollati nel resoconto coincidono parola per parola con quelli che ho ottenuto io.

Verificati anche i tre punti che il metro chiama «il file non è la prova»:

| controllo | esito |
|---|---|
| migration **registrata** nel ledger, e sopra il pavimento D311 | ✅ `SELECT version FROM supabase_migrations.schema_migrations WHERE version >= '20260807185858'` → `20260807185858,20260808093513` |
| `proacl` + `prosecdef` letti dal catalogo | ✅ `prosecdef=true · acl=postgres=X/postgres , service_role=X/postgres · owner=postgres` — **nessuna voce PUBLIC**, e per differenza nemmeno `anon` né `authenticated` (chiude anche il «non coperto» che il resoconto dichiara in §5 per `authenticated`: non serve una sonda, lo dice l'ACL) |
| corpo del **file** vs corpo del **catalogo** | ✅ `diff` fra i due estratti (257 righe ciascuno) → **identici**. Una ricostruzione dal file produce ciò che ho revisionato |
| l'indice vivo | ✅ `CREATE UNIQUE INDEX ddc_evento_annulla_unique ON public.dichiarazioni_conformita USING btree (laboratorio_id, annullata_da_evento_id) WHERE (annullata_da_evento_id IS NOT NULL)` |
| BP-1 | ✅ `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md` aggiornati nello stesso salvataggio, e **dicono che la RPC non ha chiamanti** — cosa che ho verificato: `grep` su `src/` la trova **solo** in `database.types.ts` |

🔑 **Il resoconto NON abbellisce.** Al contrario: dichiara un difetto proprio (sonda 8, la guardia dei
denti nata debole), dichiara che tre sonde su nove sarebbero state decorative senza `SET LOCAL ROLE`,
elenca in §5 **nove forme d'ingresso «non coperte»** invece di nasconderle, e in §8 elenca ciò che non
ha fatto. La correzione a §7d (§2.6 qui sopra) è l'unica affermazione che ho trovato **imprecisa**, e
non è un abbellimento: è un'analisi incompleta.

---

### 2.9 🔵 FASE 6b — **VERIFICATA, rieseguita**

```
$ grep -n correggi_e_riemetti_atomica src/types/database.types.ts
6320:      correggi_e_riemetti_atomica: {
$ tail -1 src/types/database.types.ts
} as const                              ← nessun messaggio CLI in coda
$ npx tsc --noEmit
TSC_EXIT=0
righe_output=0
```
Il tipo generato porta i sei argomenti giusti (`p_atteso_updated_at`, `p_correzioni`, `p_evento_id`,
`p_laboratorio_id`, `p_lavoro_id`, `p_nuova` → `Returns: Json`).

---

## 3. I RILIEVI

### 🟠 IMPORTANTE — R1 · `p_nuova` può far nascere la dichiarazione nuova **già annullata**, e la funzione risponde `ok`

**Dove:** `supabase/migrations/20260808093513_correggi_e_riemetti_atomica.sql:367-388` (catena degli
override di `jsonb_populate_record`).

`stato` **non è** in nessuno dei due oggetti che sovrascrivono `p_nuova` — né fra i forzati
(`id`, `laboratorio_id`, `lavoro_id`, `sostituisce_id`, `created_at`, `updated_at`) né fra gli azzerati
(`annullata_da_evento_id`, `firmata_at`, `firma_digitale_url`, `inviata_al_dentista*`, `deleted_at`) —
e **è** una colonna di `dichiarazioni_conformita`, quindi la guardia R-P6 su `p_nuova` lo lascia
passare. Misurato (sonda R5):

```sql
SELECT public.correggi_e_riemetti_atomica(
  f.lavoro, f.lab, f.evento,
  jsonb_build_object('descrizione', 'NUOVA descrizione'),
  jsonb_build_object('numero_ddc','REV-2098-0002','progressivo_ddc',998002,
                     'stato','annullata'),          -- ← la chiave
  (SELECT u0 FROM g)) FROM f;
```
```
esito: {"esito":"ok","nuova_id":"162936fc-…","vecchia_id":"f5434a4e-…", …}

totali: 2 | VIVE: 0 | stato_lavoro: consegnato | stato_nuova: annullata
```

🔴 **È esattamente lo stato che la funzione è stata scritta per rendere impossibile.** Il commento alle
righe 111-118 del file lo nomina e lo difende: *«Un annullo committato senza la nuova lascerebbe un
lavoro consegnato SENZA nessuna dichiarazione viva — lo stato che nessun indice può segnalare, perché
"zero dichiarazioni" è legittimo per un lavoro mai consegnato»*. La difesa costruita è contro il
percorso d'**errore** (niente `RETURN` dopo la barriera) ed è solida; **questo lo raggiunge dal
percorso GENTILE**, e nessun indice se ne accorge (`ddc_lavoro_attiva_unique` è parziale su
`stato <> 'annullata'`: due righe annullate non collidono).

**Classificazione R-E2 — è EREDITATO, non introdotto.** Verificato: lo stesso ingresso su
`riemetti_ddc_atomica`, che ha la costruzione identica, dà lo stesso risultato (sonda R6):
```
esito: {"esito":"ok","nuova_id":"b1c082b0-…", …}
totali: 2 | VIVE: 0
```
➡️ **Non è colpa del Task B**, e non chiedo che il Task B lo corregga. Ma è un ritrovamento che il
resoconto **non fa** pur avendone fatti altri della stessa famiglia (§7d), e **il Task C non può
ignorarlo**: se la rotta costruisce `p_nuova` spargendo dentro una riga di dichiarazione (`{...ddc}`),
`stato` ci finisce da solo.

**Chiusura suggerita (non fatta — non è il mio ruolo):** un nome da forzare in più nell'oggetto degli
azzerati, oppure — meglio, perché vale anche per il modello — un'allowlist di `p_nuova` invece della
denylist implicita «è una colonna».

---

### 🟠 IMPORTANTE — R2 · `p_correzioni` valida la FORMA e non rifiuta mai il VUOTO

**Dove:** `…20260808093513_…sql:213-228` (le guardie di forma) e `:300-333` (l'`UPDATE` su `lavori`).

Il resoconto isola un caso (`denti_coinvolti: []`, §7c). **È un caso di una regola mancante**, non
un'eccezione. Una sola chiamata, esito `ok` (sonda R7):

```sql
jsonb_build_object(
  'denti_coinvolti',        '[]'::jsonb,
  'paziente_id',            NULL,
  'paziente_nome_snapshot', '',
  'descrizione',            '',
  'richiedente_nome',       '')
```
```
esito: {"esito":"ok", …}

denti_rimasti: 0 | denorm: {} | paziente_azzerato: true
descrizione: "" | richiedente: "" | vive: 1
```

🔴 **Tutte e cinque le forme vuote atterrano.** Quattro delle sette voci **stampate** sull'Allegato XIII
si possono svuotare attraverso una funzione che risponde «fatto»: i denti, l'identità del paziente
(`paziente_id` a `NULL` **e** lo snapshot a stringa vuota — insieme, il documento non ha più nessun
modo di nominare il paziente), la descrizione del dispositivo, il prescrittore.

🔑 **È lo stesso pericolo che il piano già nomina al Task C Passo 5** («*uno snapshot vuoto vincerebbe
sul nome vivo e stamperebbe un'identificazione paziente assente — è il difetto già pagato sul gemello
`richiedente_nome`, D242*»). Formularlo come **una regola sola** — *nessuna voce obbligatoria del
documento si può portare a vuoto attraverso una correzione* — dà al Task C un vincolo invece di tre
casi speciali, e copre anche il quarto che nessuno ha ancora nominato (`paziente_id: NULL`).

**Il livello giusto è il Task C**, come l'esecutore dice per i denti: dalla banca dati «vuoto» e
«voluto» sono indistinguibili. **Riferito, non corretto.**

---

### 🟠 IMPORTANTE — R3 · La riga §7d del resoconto è imprecisa, e la metà che manca è quella silenziosa

**Dove:** `.superpowers/sdd/atto-unico-task-b-report.md:538-542`.

Il resoconto tratta `numero_ddc` e `progressivo_ddc` come una cosa sola («*o l'`INSERT` sbatte su
`dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key`*»). **Solo `progressivo_ddc` sbatte.**
`numero_ddc` non ha vincolo unico e passa in silenzio, producendo due documenti legali con lo stesso
numero (prove complete in §2.6).

⚠️ **Perché è un rilievo e non una pignoleria:** chi legge §7d costruisce il Task C credendo che
l'omissione si manifesti come errore. È l'unica affermazione del resoconto che, se creduta, porta a
scrivere codice sbagliato.

---

### 🔵 MINORE — R4 · Il rilievo su `riapri_lavoro_atomica` descrive il percorso lontano

Il resoconto (§7b) sceglie «riapri → riconsegna → riapri». Esiste una sequenza **più corta di due
passi** che dà lo stesso `23505` — *correggi(E) → riapri(E)* — e non richiede nessuna riconsegna
(prove in §2.3). **La conclusione dell'esecutore resta giusta** (irrigidimento voluto, rischio basso,
riferito e non corretto): cambia il percorso da tenere d'occhio, non il giudizio.

---

### 🔵 MINORE — R5 · Una prova che il resoconto dichiara «non coperta» è invece chiusa dall'ACL

`.superpowers/sdd/atto-unico-task-b-report.md:460` segna `authenticated` come **non coperto**. Non serve
una sonda: `proacl = {postgres=X/postgres, service_role=X/postgres}` è un elenco **chiuso**, quindi ogni
ruolo che non sia quei due — `authenticated` incluso — prende `42501` per la stessa ragione per cui lo
prende `anon` (provato). ✅ Prudenza eccessiva, non un difetto: la segno perché una riga «non coperta»
che in realtà è coperta consuma attenzione nel Task C.

---

## 4. QUELLO CHE IL BRIEF E IL PIANO SBAGLIAVANO, e che l'esecutore ha visto giusto

Confermo, avendoli riprovati, **due** dei difetti che il resoconto attribuisce al brief — e sono
entrambi del tipo che produce **verdi falsi**, cioè il peggiore:

1. **§6① — «il gettone si rinfresca a ogni passaggio» descrive un meccanismo che non esiste.** Dentro
   una transazione `now()` è `transaction_timestamp()`, costante. Misurato sulla **mia** fixture:
   `gettone_ingresso 09:05:10.572886+00` · `adesso_transazione 10:05:10.572886+00`, e il gettone
   restituito dopo **tutte** le scritture è sempre `10:05:10.572886`. ➡️ Su una fixture normale il
   gettone d'ingresso e quello dopo la prima scrittura sarebbero **uguali**, e il giro buono sarebbe
   verde **anche con la catena dei gettoni rotta**. La contromisura (`updated_at` arretrato di un'ora
   nella fixture) è necessaria, e l'ho adottata anch'io.
2. **§6② — `scripts/psql.mjs` si collega come `postgres`, cioè come proprietario.** `provato:`
   `SELECT current_user` → `postgres`. Senza `SET LOCAL ROLE` la sonda sulla chiamata annidata è un
   verde che non prova niente, perché il proprietario passa comunque. Tutte le mie sonde forzano il
   ruolo.

🔑 Sono i due difetti per cui l'esecutore merita credito: nessuno dei due si vede leggendo il codice,
e tutti e due trasformano una prova in un'affermazione.

---

## 5. CHE COSA RESTA APERTO PER IL TASK C

Nell'ordine in cui costerebbe sbagliarli.

1. 🛑 **BLOCCANTE — `p_nuova` va costruito con un'allowlist, non spargendoci dentro una riga.** `stato`
   è la chiave che apre lo stato «lavoro consegnato, zero dichiarazioni vive» (§3 R1) e ci arriva da
   sola se la rotta fa `{...ddc}`. Serve anche `numero_ddc` **esplicito e nuovo**, non solo
   `progressivo_ddc` (§3 R3). ⚠️ **Questo non è un suggerimento di stile: finché non è chiuso, la rotta
   può produrre per via gentile lo stato che tutta l'ondata esiste per impedire.**
2. 🔴 **La regola del vuoto, una sola:** nessuna voce obbligatoria del documento si porta a vuoto
   attraverso una correzione — denti `[]`, `paziente_id: null`, stringhe vuote su
   `paziente_nome_snapshot` / `descrizione` / `richiedente_nome` (§3 R2). Il piano ne nomina già metà
   al Passo 5 (D242): conviene scriverla come **una** regola.
3. 🔴 **La porta d'idempotenza del Passo 4 diventa PORTANTE, non facoltativa.** Con
   `ddc_evento_annulla_unique` vivo, un secondo invio con lo stesso evento — un ritentativo dopo un
   timeout, un doppio tocco — **non è più un caso da gestire con eleganza: è un `23505` grezzo**.
   La porta «esiste già una dichiarazione con `annullata_da_evento_id = evento_id`? → restituisci
   quella» va **prima** della chiamata alla RPC.
4. 🟠 **`23505` su questa tabella è ORA tre errori diversi**, e una traduzione fatta sul solo SQLSTATE
   dirà la cosa sbagliata. I nomi da distinguere, con i messaggi già catturati:
   | vincolo | significato per chi legge |
   |---|---|
   | `ddc_evento_annulla_unique` | «questa correzione è già stata registrata» → **409/idempotenza**, non un errore |
   | `dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key` | il progressivo non è stato coniato → **difetto del chiamante, 500** |
   | `ddc_sostituisce_unique` | due riemissioni sulla stessa dichiarazione superata |
5. 🟠 **La forma di `denti_coinvolti` è una trappola di nome** (l'esecutore la segnala, §6③, e la
   confermo): la chiave si chiama come la colonna denormalizzata (`text[]` di FDI) ma vuole il
   **carico della penna**, array di oggetti `{fdi, ruolo, …}`. Il messaggio d'errore la nomina, il
   `COMMENT` pure. La schermata del Task D deve mandare gli oggetti.
6. 🟠 **`tipo` fra le sotto-chiavi della prescrizione** (§6⑦ del resoconto) — ✅ **riletto io il file,
   l'esecutore ha ragione.** `src/lib/prescrizione/caratteristiche-prescritte.ts:73-106`: la funzione
   costruisce `pezzi` da **`elementi`** (`:84-87`) e **`colore`** (`:100-103`) e **basta**; `tipo` è
   escluso apposta, con la ragione scritta a `:66-71` (D213 — *«è ciò che il laboratorio HA FATTO, non
   ciò che il medico ha PRESCRITTO»*, e sarebbe il doppione del §5 «Tipo dispositivo»). ➡️ Una
   correzione su `tipo` **atterra** in `lavori_prescrizioni.contenuto` e **non cambia una virgola del
   documento stampato**: sotto il nome `CAMPI_CORREGGIBILI_DOCUMENTO` non ci sta. **Domanda di
   perimetro da chiudere nel Task C**, non un difetto del Task B.
   🔑 **E lo stesso file rafforza il punto 2:** `:105` restituisce `null` se entrambi i pezzi sono
   vuoti — quindi `{"elementi": [], "colore": ""}` fa **sparire l'intera sezione «Caratteristiche
   prescritte»** dal documento, in silenzio e con esito `ok`.
7. 🔵 **La RPC oggi non ha chiamanti** (`grep` su `src/` → solo `database.types.ts`), e le sonde
   **non girano in CI** (`scripts/tmp/` è ignorato). La rete permanente su questo comportamento
   nascerà con i test della rotta: finché il Task C non c'è, questa funzione non è coperta da niente
   che riparta da solo.

---

## 6. NOTA DI METODO

Non ho toccato nessun file del progetto. Le mie sonde stanno in `scripts/tmp/revisione-b/`, che è
ignorato da git (`provato:` `git check-ignore -v` → `.gitignore:167:scripts/tmp/`), e ogni sonda è
girata in `BEGIN … ROLLBACK` con la fixture costruita dentro la transazione: **niente è rimasto scritto
sul banco**. L'unica cosa che ho eseguito fuori da una transazione annullata è `npx tsc --noEmit`.

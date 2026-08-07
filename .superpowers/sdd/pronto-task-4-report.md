# Task 4 — Le due RPC di ripristino, col corpo condiviso — REFERTO

**Ramo:** `intervento-post-consegna` · **Migration:** `supabase/migrations/20260807182614_riporta_a_pronto_atomica.sql`
**Esito:** ✅ costruito, applicato al banco, provato sul comportamento. **6 sonde su 6 verdi.** Il brief
ne chiedeva 4; le altre due le ho aggiunte perché senza di esse due cose restavano **affermate e non
misurate**: il ramo che dà alla funzione la sua ragione dichiarata (⑤) e l'atomicità attraverso la
nuova chiamata annidata (⑥).

---

## Passo 0 — il timestamp, prima di dare un nome al file

Il vincolo era «successivo a `20260807180314`», e non è una formalità: il numero ordina il registro
delle migration. `date` in un comando **separato**, come da vincolo.

```
$ date -u "+%Y%m%d%H%M%S"
20260807182614
```
`20260807182614 > 20260807180314` ✅ — ordina dopo. (Verificato che le migration precedenti sono
nominate in UTC e non in ora locale: `20260807180314` = 18:03 UTC = 20:03 CEST, coerente.)

---

## Passo 1 — IL CORPO VIVO, letto dal catalogo — e in che cosa differiva dal file

```bash
cd "…/ua-app" && set -a && . ./.env.local; set +a; node scripts/psql.mjs /tmp/leggi-corpo.sql
```
con `SELECT pg_get_functiondef(p.oid) …` spezzato riga per riga (`regexp_split_to_table … WITH
ORDINALITY`), perché `console.table` su una stringa multiriga non è leggibile.

**Esito: 52 righe.** Il corpo vivo, nei punti che contano:

```sql
CREATE OR REPLACE FUNCTION public.riapri_lavoro_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
…
  UPDATE lavori SET
    stato = 'pronto', conformato = false, data_conformazione = NULL,
    data_consegna_effettiva = NULL, consegna_completata_at = NULL,
    consegna_in_corso = false, consegna_tap_at = NULL,
    proposta_dentista = NULL, proposta_at = NULL
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'riapertura: ripristino lavoro fallito'; END IF;

  -- ⬇️ L'UNICA riga cambiata dal 06/08: la causale si registra.
  UPDATE dichiarazioni_conformita
     SET stato = 'annullata', annullata_da_evento_id = p_evento_id
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato <> 'annullata';
```

### In che cosa differiva dal file `20260806210400` — due differenze, una sostanziale

| | file `20260806210400` (superato) | catalogo vivo (07/08) |
|---|---|---|
| **UPDATE sulla dichiarazione** | `SET stato = 'annullata'` — **e basta** | `SET stato = 'annullata', annullata_da_evento_id = p_evento_id` |
| commenti interni al corpo | sei blocchi di commento dentro il `$$…$$` | **spariti tutti**, tranne il commento nuovo di una riga |

La prima è la differenza che il brief anticipava, e viene da `20260807143623_riemissione_ddc.sql:205-257`.
La seconda non era annunciata da nessuno: la riscrittura del 07/08 ha **perso i commenti interni** del
file del 06/08 (quelli fuori dal corpo della funzione non finiscono nel catalogo per costruzione, ma
qui mancano anche quelli *dentro*). Chi avesse ribattuto dal catalogo credendo di conservare tutto
avrebbe comunque perso quel testo — l'ho ricostruito riscrivendo i commenti utili nel file nuovo.

**Chi avesse copiato dal file avrebbe cancellato la correzione di ieri**, ed è esattamente quello che
la sonda R-E2 in fondo dimostra succedere già oggi, in un altro punto del repo.

---

## Passo 2 — la migration

`supabase/migrations/20260807182614_riporta_a_pronto_atomica.sql`, tre oggetti:

1. **`public.ripristina_lavoro_a_pronto(uuid,uuid)`** — il corpo condiviso, `RETURNS void`. I **nove**
   campi del ripristino, presi dal corpo vivo, uno per uno.
   🔑 **`prima_immissione_at` NON è nell'elenco, e non deve entrarci mai:** è ciò che il Task 2 ha
   messo al sicuro, ed è da lì che decorrono i dieci anni di conservazione della dichiarazione. È
   scritto nel commento della migration, così chi domani aggiunge un campo all'elenco trova il
   perché dell'assenza invece di scambiarla per una dimenticanza.
2. **`public.riporta_a_pronto_atomica(uuid,uuid,uuid)`** — la gemella NON distruttiva.
3. **`public.riapri_lavoro_atomica(uuid,uuid,uuid)`** — ribattuta **dal catalogo vivo**, con il solo
   `UPDATE lavori` sostituito dalla chiamata alla funzione condivisa.

### Le due divergenze dal corpo vivo, dichiarate invece che taciute

- Il `RAISE` del ripristino perde il prefisso: `'riapertura: ripristino lavoro fallito'` →
  `'ripristino lavoro fallito'`. **È obbligato**: la funzione condivisa serve due chiamanti e non può
  nominarne uno solo. `provato:` nessun codice dipende da quel testo —
  `grep -rn "ripristino lavoro fallito" src tests scripts docs` → **zero occorrenze in `src/` e in
  `tests/`**, solo file di piano storici. Ed è un ramo comunque irraggiungibile (`FOR UPDATE` +
  nessun predicato aggiuntivo sull'`UPDATE`), come il file del 06/08 già annotava.
- I commenti interni: reintrodotti, vedi sopra.

**Il resto è puro spostamento di codice.** L'atomicità non cambia: una funzione plpgsql chiamata da
un'altra **non** apre una transazione autonoma, e nessuna delle due ha un blocco `EXCEPTION` (che
sarebbe l'unica cosa a creare una sottotransazione) — quindi un `RAISE` nella chiamante annulla anche
l'`UPDATE` della chiamata.
🛑 **Questo ragionamento NON è la prova, ed è stato misurato a parte: sonda ⑥.** La prova che era già
in casa (`riapri-lavoro-atomica.rpc.test.ts:288`) **non copre il caso nuovo**, perché ribatte il corpo
del 06/08, dove l'`UPDATE` era in linea — copre l'atomicità di una funzione che non è più quella viva.

---

## Passo 3 — applicata al banco (D284), e provata sul comportamento

```
$ npx supabase db push --linked --yes
Applying migration 20260807182614_riporta_a_pronto_atomica.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260807182614_riporta_a_pronto_atomica.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
=== uscita=0 ===
```

### Come sono costruite le sonde, e perché così

**Le quattro lezioni pagate dai task precedenti sono state applicate tutte:**
- **①** `SAVEPOINT` in un file solo non funziona col protocollo semplice → **un'invocazione per sonda**,
  cinque file separati, cinque comandi separati. Nessuna sonda vede lo stato lasciato da un'altra.
- **②** una sonda su righe inesistenti dà falso verde → **ogni sonda costruisce la propria fixture
  dentro la propria transazione annullata**, e prima di agire **misura la precondizione** (la fase
  `A-PRECONDIZIONE` che si vede in ogni output): se la fixture non fosse nello stato dichiarato, si
  vedrebbe lì invece di passare per un verde.
- **③** il file non è la prova → tutto letto dal catalogo (Passo 1 e Passo 4).
- **④** `pg_constraint` non elenca i trigger → **censiti a parte**, prima di scrivere: su
  `eventi_qualita` **zero trigger**; su `lavori` quattro, e ho letto il corpo del solo sospetto,
  `check_lavoro_ritardo` — agisce **unicamente** su `stato = 'in_lavorazione'`, quindi non può
  riscrivere il `'pronto'` che il ripristino imposta. Nessun `P0001` incontrato.

### ① lavoro consegnato + dichiarazione VIVA → la dichiarazione RESTA VIVA

```
[6] A-PRECONDIZIONE   lavoro_stato='consegnato'   ddc_stato='generata'
[7] B-CHIAMATA        risultato = { esito: 'ok', ddc_viva: true }
[8] C-DOPO
  lavoro_stato='pronto' · conformato=false · consegna_azzerata=true
  prima_immissione_at=2026-01-15T10:00:00.000Z
  ddc_stato='generata' · ddc_ancora_viva=true · annullata_da_evento_id=null
=== uscita=0 ===
```
✅ **È la prova che distingue le due funzioni, ed è quella che poteva far fallire il compito.** La
dichiarazione è ancora `'generata'`, non annullata, e non porta causale di annullamento.
✅ **In più, non richiesto ma decisivo:** `prima_immissione_at` è **intatto** mentre
`data_consegna_effettiva` è azzerato — cioè il ragionamento del Task 2 regge in esercizio, non solo
sulla carta.

### ② la stessa chiamata RIPETUTA → `non_consegnato`

```
[7] B-PRIMA-CHIAMATA    { esito: 'ok', ddc_viva: true }
[8] C-SECONDA-CHIAMATA  { esito: 'non_consegnato' }
[9] D-DOPO   lavoro_stato='pronto'  ddc_stato='generata'  ddc_ancora_viva=true
=== uscita=0 ===
```
✅ Non idempotente per finta: la seconda chiamata **rifiuta** e non tocca nulla.

### ③ `p_evento_id` di UN ALTRO lavoro → `evento_non_valido`, e nessuna mutazione

```
[6] A-PRECONDIZIONE  evento 4444…0006 appartiene a 4444…0005, bersaglio della chiamata 4444…0002
[7] B-CHIAMATA       { esito: 'evento_non_valido' }
[8] C-DOPO           lavoro_stato='consegnato'   consegna_intatta=true
=== uscita=0 ===
```
✅ R-P1 nella forma richiesta: **un valore che DEVE essere rifiutato**, ed è rifiutato — e la riga
resta `consegnato`, cioè il rifiuto avviene **prima** di qualunque scrittura.

### ④ `riapri_lavoro_atomica` — su FIXTURE PROPRIA E FRESCA

🛑 **Qui il brief aveva un difetto, e l'ho corretto invece di eseguirlo alla lettera.** Il brief dice
«`riapri_lavoro_atomica` **sullo stesso lavoro**»: ma dopo la sonda ① quel lavoro è `'pronto'`, quindi
la gemella avrebbe restituito `non_consegnato` **senza toccare niente** — e l'asserzione «la
dichiarazione diventa annullata» sarebbe stata o un fallimento o, peggio, un verde su una funzione
mai entrata in azione. La sonda ④ ha perciò **fixture propria**, identica per forma a quella della ①.

```
[6] A-PRECONDIZIONE  lavoro_stato='consegnato'  ddc_stato='generata'  annullata_da_evento_id=null
[7] B-CHIAMATA       { esito: 'ok', ddc_assente: false }
[8] C-DOPO
  lavoro_stato='pronto' · conformato=false · consegna_azzerata=true
  prima_immissione_at=2026-01-15T10:00:00.000Z
  ddc_stato='annullata'
  annullata_da_evento_id='44444444-0000-4000-8000-000000000003'
  causale_corretta=true
=== uscita=0 ===
```
✅ La gemella **annulla e registra la causale** — cioè la correzione del 07/08 è sopravvissuta alla
riscrittura. ✅ Confrontata con la ①, sulla **stessa forma di fixture**: `'generata'` contro
`'annullata'`. Le due funzioni divergono esattamente dove devono, e solo lì.

### ⑤ (AGGIUNTA — il brief non la prevedeva) dichiarazione già annullata → `ddc_viva=false`

Tutte e quattro le sonde del brief girano su «consegnato con dichiarazione viva»: il ramo che dà alla
funzione la sua ragione dichiarata — **dire che la promessa "resta valida" non ha oggetto** — non
sarebbe mai stato eseguito.

```
[6] A-PRECONDIZIONE  lavoro_stato='consegnato'  ddc_stato='annullata'  quante_dichiarazioni=1
[7] B-CHIAMATA       { esito: 'ok', ddc_viva: false }
[8] C-DOPO           lavoro_stato='pronto'
=== uscita=0 ===
```
✅ E qui si vede una **seconda divergenza voluta fra le gemelle**, che nessun documento aveva scritto:
sulla **stessa identica fixture** `riapri_lavoro_atomica` **solleva**, mentre
`riporta_a_pronto_atomica` **passa e lo segnala**. È corretto — per la distruttiva «nessuna riga da
annullare ma ce n'è una» è uno stato incoerente, per la conservativa è semplicemente un fatto da
riferire — ma è una differenza in più rispetto a quella dichiarata («è tutta qui: non si tocca la
dichiarazione»). **Misurata nella sonda ⑥, non letta dal codice** (vedi sotto).

### ⑥ (AGGIUNTA) l'ATOMICITÀ attraverso la funzione condivisa — e il RAISE della gemella

Due affermazioni di questo referto erano **dedotte e non misurate**: che il ripristino non
sopravvivesse a un `RAISE` ora che avviene in **un'altra funzione**, e che sulla fixture della ⑤ la
gemella sollevi. Sono la stessa sonda. Fixture della ⑤ (consegnato, unica dichiarazione già
annullata). 🛑 Niente `SAVEPOINT` (lezione ①): un blocco `DO` con `EXCEPTION` cattura in proprio, e
la sua sottotransazione è **esattamente** la semantica sotto esame; il messaggio si raccoglie in una
tabella temporanea perché `RAISE NOTICE` non arriva a `scripts/psql.mjs`.

```
[6]  A-PRECONDIZIONE  lavoro_stato='consegnato'  conformato=true  ddc_stato='annullata'
[9]  B-CHIAMATA  'SOLLEVATA -> riapertura: dichiarazione in stato incoerente per lavoro 44444444-0000-4000-8000-000000000002'
[10] C-DOPO-IL-RAISE  lavoro_stato='consegnato'  conformato=true  consegna_intatta=true
=== uscita=0 ===
```
✅ **La gemella solleva davvero**, col messaggio del suo fail-closed — la divergenza della ⑤ è provata.
✅ **E il ripristino NON sopravvive:** dopo l'eccezione il lavoro è ancora `consegnato`,
`conformato=true`, consegna intatta. Se l'`UPDATE` della funzione condivisa fosse sfuggito
all'annullamento si leggerebbe `pronto`/`false`, cioè **lo stato peggiore dei due**: lavoro riaperto
e dichiarazione ancora viva. **L'atomicità che il nome promette regge anche attraverso la chiamata
annidata** — ed è la misura che nessuna prova in casa fa oggi.

---

## Passo 4 — le ACL, verificate sul catalogo e non assunte

⚠️ **Ho irrobustito la query del brief su un punto che poteva ingannare:** `proacl` **NULL** significa
privilegi di *default*, cioè **PUBLIC ha EXECUTE** — e `array_to_string(NULL, …)` rende una cella
**vuota**, che si legge come «pulito». Il caso pericoloso sarebbe quindi apparso identico al caso
buono. Perciò asserisco prima che l'ACL **non** sia nulla, e poi interrogo il motore.

Lettura **finale**, rifatta **dopo tutte le sonde** — perché `prova-re2.sql` esegue `CREATE OR
REPLACE` + `REVOKE`/`GRANT` sulla gemella dentro una transazione annullata, e un referto deve
descrivere lo stato che si consegna, non uno intermedio. (L'annullamento era pulito: le ACL sono
identiche a prima.)

```
proname                     | acl_esplicite | acl
riapri_lavoro_atomica       | true          | postgres=X/postgres | service_role=X/postgres
riporta_a_pronto_atomica    | true          | postgres=X/postgres | service_role=X/postgres
ripristina_lavoro_a_pronto  | true          | postgres=X/postgres | service_role=X/postgres

funzione                     | anon_puo | authenticated_puo | service_role_puo
riporta_a_pronto_atomica     | false    | false             | true
ripristina_lavoro_a_pronto   | false    | false             | true
riapri_lavoro_atomica        | false    | false             | true
=== uscita=0 ===
```
✅ **Solo `postgres` e `service_role`. Nessun `anon`, nessun `authenticated`** — e confermato due
volte, dall'array e da `has_function_privilege`, che è indipendente dal formato dell'array.
✅ Tutte e tre `SECURITY DEFINER` con `search_path` bloccato su `public, pg_temp` (rilevato con
`prosecdef` e `proconfig` nella prima lettura).

### E l'estrazione è VIVA — lezione ③ applicata al proprio lavoro

Il file che ho scritto non è la prova che l'estrazione sia atterrata: la sonda ④ dimostra che la
causale sopravvive, **non** che il corpo condiviso sia in uso invece del vecchio `UPDATE` in linea.
Letto dal catalogo, dopo il push:

```
proname                     | estrazione_viva | causale_viva | update_ancora_in_linea
riapri_lavoro_atomica       | true            | true         | false
riporta_a_pronto_atomica    | true            | false        | false
ripristina_lavoro_a_pronto  | false           | false        | true
=== uscita=0 ===
```
✅ Le due funzioni pubbliche **chiamano** `ripristina_lavoro_a_pronto` e **non** hanno più l'`UPDATE`
in linea; l'unica a portarlo è la funzione condivisa. ✅ `causale_viva` è `true` **solo** sulla
gemella distruttiva — cioè la nuova non nomina neppure il campo dell'annullamento, che è la
differenza per cui esiste.

📌 **Osservazione, non un rilievo:** il `GRANT` a `service_role` sulla funzione **interna** non è
tecnicamente necessario — è chiamata solo da dentro funzioni `SECURITY DEFINER` di proprietà di
`postgres`, che risolvono il permesso come proprietario. L'ho messo perché il vincolo di mandato lo
impone per **ogni** `SECURITY DEFINER` e il Passo 4 lo dà come atteso; e non apre nulla, perché
`service_role` è la chiave di servizio che può già eseguire la funzione pubblica.

---

## FASE 6b — tipi e compilazione

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
uscita=0   (nessun messaggio CLI in fondo al file — niente da togliere)

$ git diff --stat src/types/database.types.ts
 src/types/database.types.ts | 12 ++++++++++++
```
Il diff **non è vuoto**, ed è la verifica al contrario che il push è atterrato davvero:

```diff
+      riporta_a_pronto_atomica: {
+        Args: { p_evento_id: string; p_laboratorio_id: string; p_lavoro_id: string }
+        Returns: Json
+      }
+      ripristina_lavoro_a_pronto: {
+        Args: { p_laboratorio_id: string; p_lavoro_id: string }
+        Returns: undefined
+      }
```

```
$ npx tsc --noEmit
=== uscita tsc=0 ===   (output vuoto)
```

## Prove esistenti — la gemella non è stata rotta dall'estrazione

```
$ set -a && . ./.env.local; set +a; npx vitest run tests/integration/riapri-lavoro-atomica.rpc.test.ts
 Test Files  1 passed (1)
      Tests  15 passed (15)
=== uscita=0 ===
```
⚠️ **Ma quel verde vale meno di quanto sembra — vedi il primo difetto riferito qui sotto.**

Superficie adiacente:
```
$ npx vitest run tests/integration tests/unit/qualita-effetti.test.ts tests/unit/eventi-qualita-route.test.ts \
    tests/unit/riemissione-ordine.test.ts tests/unit/orchestra-consegna-prima-immissione.test.ts
 Test Files  1 failed | 9 passed (10)
      Tests  4 failed | 184 passed (188)
```
Le **4 rotte sono `tests/integration/annulla-effetti-storno-td04.rpc.test.ts`, e NON sono mie.**
`provato:` rilanciato da solo → **4 fallite | 1 passata**, che è **esattamente** lo stato registrato in
`memory/MEMORY.md` e in `docs/roadmap/2026-08-06-intervento-sera-handoff.md:56`, dove risulta già
provato al punto di partenza del ramo (`7427a680`, prima di ogni lavoro dell'ondata). `grep` sul file:
**nessun riferimento** a `riapri_lavoro_atomica`, `ripristina_lavoro_a_pronto` o
`riporta_a_pronto_atomica`, e nessuna migration applicata dentro. Dominio fiscale (note di credito
TD04), già voce di roadmap a priorità alta.

---

## Difetti riferiti fuori mandato (R-E2)

### 🔴 1. `tests/integration/riapri-lavoro-atomica.rpc.test.ts` prova una funzione MORTA — 15 verdi che non guardano il codice vivo

**Il fatto.** Quel file, a ogni test, fa questo (righe 22 e 28-31):

```ts
const MIGRATION_PATH = 'supabase/migrations/20260806210400_riapri_lavoro_atomica.sql'
async function applicaMigrazione(client: Client) {
  const sql = readFileSync(MIGRATION_PATH, 'utf8')
  await client.query(sql)                       // CREATE OR REPLACE, dentro la transazione
}
```

Cioè **riscrive `riapri_lavoro_atomica` con il corpo del 06/08 dentro la propria transazione**, e poi
prova quello. Dal 07/08 il corpo vivo è diverso (`annullata_da_evento_id`): **la correzione di ieri
non è coperta da nessuna delle 15 prove**, e da oggi non lo è nemmeno il corpo condiviso.

**Non è un'illazione, è misurato.** Ho rifatto la sonda ④ — fixture identica — anteponendo il
contenuto di quel file, cioè riproducendo esattamente ciò che fa il test:

| | corpo VIVO (sonda ④) | dopo aver applicato `20260806210400` (ciò che fa il test) |
|---|---|---|
| `ddc_stato` | `annullata` | `annullata` |
| **`annullata_da_evento_id`** | **`44444444-…-0003`** | **`null`** |
| `causale_corretta` | `true` | `null` |

```
[12] C-DOPO  lavoro_stato='pronto' … ddc_stato='annullata' · annullata_da_evento_id=null · causale_corretta=null
=== uscita=0 ===
```

**Perché conta più di un fastidio.** Il commento in testa al file dichiara la ragione di
`applicaMigrazione`: «*LA MIGRATION NON È ANCORA APPLICATA AL DATABASE VERO*». **Quella ragione è
scaduta** — la migration è viva dal 06/08 sera. Quello che resta è un meccanismo che **riporta
indietro il codice sotto prova** ogni volta che gira, e più il tempo passa più il divario cresce in
silenzio. È la stessa famiglia già pagata due volte in questo progetto: «il file non è la prova» e
«una prova che non gira non è una prova» — qui la variante è **una prova che gira e misura il
passato**.

**Non l'ho corretto** (R-E2: fuori mandato, e la correzione tocca un file di prova di un altro task).
**La correzione è di una riga:** togliere `applicaMigrazione` e provare la funzione **viva**, come già
fa `tests/integration/riemetti-ddc-atomica.rpc.test.ts:7` («*migration già applicata*»). Chi lo fa
aggiunga anche le due asserzioni che oggi mancano: `annullata_da_evento_id` valorizzato, e il fatto
che il ripristino passi per `ripristina_lavoro_a_pronto`.

### 🟡 2. La funzione nuova non ha ancora prove di integrazione proprie

Il brief del Task 4 non le chiede (i cinque passi finiscono al commit) e il piano non le assegna a
nessun task. Le sei sonde di qui sono **transitorie, in `/tmp/`, e non committate** — cioè la prova
che distingue le due funzioni (①) oggi **non è ripetibile da nessuno**. Segnalo il vuoto invece di
riempirlo di nascosto: chi scriverà quel file può partire da `/tmp/prova-t4-{1..6}.sql`, e i sei casi
sono già scritti sopra con l'esito atteso. **La ⑥ è la più importante da portarsi dietro:** è l'unica
che misura l'atomicità del corpo condiviso, e in casa non esiste nulla che lo faccia.

### 🟡 3. Perdita silenziosa di commenti nella riscrittura del 07/08

`20260807143623` ha ribattuto `riapri_lavoro_atomica` **perdendo tutti i commenti interni** al corpo
del 06/08 (sei blocchi, fra cui quello che spiega perché il `RAISE` del ripristino è oggi
irraggiungibile). Non cambia il comportamento; è la stessa dinamica del difetto 1 vista dall'altro
lato — **`CREATE OR REPLACE` non ammette modifiche parziali, quindi ogni ritocco è una ricopiatura**,
e a ogni ricopiatura si perde ciò che chi ricopia non ritiene importante. Nel file nuovo ho
reintrodotto i commenti utili. È anche l'argomento più forte a favore dell'estrazione chiesta dal
piano: meno corpo ribattuto, meno occasioni di perderne pezzi.

### 🟢 4. Catena di conseguenze che il Task 7 dovrà avere in mente (non un difetto)

Lasciando viva la dichiarazione, lo slot di `ddc_lavoro_attiva_unique` (`WHERE stato <> 'annullata'`)
**resta occupato**: alla riconsegna il guard di idempotenza di `generate-ddc.ts:99-108` restituirà
**quella esistente** senza generarne una nuova. È l'esito voluto — il documento diceva il vero e resta
in piedi — ma è il tipo di conseguenza su cui la rotta del Task 7 deve essere esplicita, perché la
dichiarazione è una **fotografia** presa alla prima consegna: va bene finché l'intervento non cambia
i dati che quella fotografia riporta.

---

## Passo 5 — salvato

Vedi il commit in coda al ramo `intervento-post-consegna`.

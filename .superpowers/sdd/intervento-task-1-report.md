# Task 1 — Report — Le due tabelle, e la sola-aggiunta imposta dal database

Ondata «si deve sempre poter intervenire». Ramo `intervento-post-consegna`.
Commit: `cfdbd235650bd532913c19efdd7f24ce38f9f0df`.

---

## 1. Cosa ho fatto

1. Aperto i due file modello indicati dal brief (Passo 1) e confrontati col loro scopo dichiarato.
2. Scritto `supabase/migrations/20260806140823_eventi_qualita.sql` copiando **verbatim** l'SQL del
   Passo 2 del brief (nessuna modifica, nessuna omissione — confermato con `git diff --no-index`
   contro il testo del brief).
3. Applicata al database vero con `npx supabase db push`.
4. Eseguite le due prove di rifiuto del Passo 3, in transazione annullata.
5. FASE 6b: rigenerati i tipi, verificato che la CLI non abbia lasciato messaggi in coda al file,
   `npx tsc --noEmit` → 0 errori.
6. `npx vitest run` → verde.
7. Verifiche aggiuntive di mia iniziativa (oggetti live nel catalogo, grant di privilegio) — vedi
   §4 e §5.
8. Commit.

---

## 2. Passo 1 — apertura dei due file modello (R-P2)

**`supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql`** — letto per intero (18
righe). È esattamente il modello dell'indice unico parziale che il brief descrive: sostituisce un
vincolo `UNIQUE` pieno su `dichiarazioni_conformita` con `CREATE UNIQUE INDEX
ddc_lavoro_attiva_unique ON ... (laboratorio_id, lavoro_id) WHERE stato <> 'annullata'` — "una sola
ATTIVA per lavoro". Corrisponde: `valutazione_viva_unique` nel mio file usa la stessa forma
(`WHERE superata = false` al posto di `WHERE stato <> 'annullata'`).

**`supabase/migrations/20260804154232_ondata_b_ddc_chiusura_update.sql`** — letto per intero (26
righe). Contiene il modello della revoca di UPDATE, ma **non è una `REVOKE`**: è
`DROP POLICY "ddc_laboratorio_update" ON dichiarazioni_conformita` — l'immutabilità di
`dichiarazioni_conformita` è ottenuta togliendo la policy RLS di UPDATE, **non** revocando il
privilegio SQL. Il brief invece, per `valutazioni_evento`, chiede esplicitamente
`REVOKE UPDATE, DELETE ... FROM anon, authenticated` **in aggiunta** a non creare policy di
UPDATE/DELETE — un meccanismo più forte (agisce anche se in futuro qualcuno aggiungesse per errore
una policy di UPDATE, la REVOKE resta la barriera esterna). Nessuna discrepanza da riferire: il
brief non dice "usa lo stesso meccanismo", dice "apri il modello della revoca di UPDATE" — e questo
file è dove per la prima volta nel progetto un `UPDATE` viene tolto da una tabella "immutabile";
l'SQL del Passo 2 del brief è coerente con sé stesso e con §9 della spec (che cita proprio questo
file come precedente per "la sola-aggiunta si impone nel database").

---

## 3. Passo 3 — prove di rifiuto (output reale)

Comando eseguito esattamente come nel brief:

```
✅ rifiutato motivo fuori vocabolario → new row for relation "eventi_qualita" violates check constraint "eventi_qualita_motivo_check"
✅ rifiutato altro senza testo → new row for relation "eventi_qualita" violates check constraint "evento_altro_ha_testo"
```

Due righe `✅`. Nessuna riga `❌`. Prova superata.

---

## 4. Verifiche aggiuntive (mia iniziativa, per l'autorevisione)

Non richieste dal brief, ma necessarie per convincermi che la garanzia "sola-aggiunta imposta dal
database" regge davvero, non solo che la migration sia andata a buon fine.

**a) Grant di privilegio dopo la REVOKE** — interrogato `information_schema.role_table_grants` per
`valutazioni_evento`:

```
anon:          INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE
authenticated: INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE
```

Né UPDATE né DELETE compaiono per nessuno dei due ruoli — la REVOKE ha avuto effetto reale, non solo
sintattico. (Nota su TRUNCATE: vedi §8, finding fuori mandato.)

**a-bis) Prova FUNZIONALE, non solo sul catalogo** — la query su `role_table_grants` filtra per
`grantee IN ('anon','authenticated')` e da sola non basta: non vedrebbe un grant a `PUBLIC` (che una
`REVOKE ... FROM anon, authenticated` non tocca) né un privilegio ereditato per appartenenza di ruolo.
Ho quindi chiuso la prova nel modo che conta davvero — **eseguendo l'operazione come quei ruoli**, in
transazione annullata:

```
✅ rifiutato UPDATE come authenticated → permission denied for table valutazioni_evento
✅ rifiutato DELETE come authenticated → permission denied for table valutazioni_evento
✅ rifiutato UPDATE come anon → permission denied for table valutazioni_evento
✅ rifiutato DELETE come anon → permission denied for table valutazioni_evento
```

E l'ACL letta direttamente (`relacl`) conferma che non c'è un grant `PUBLIC` residuo che silenziosamente
riaprirebbe UPDATE/DELETE:

```
{"relacl":"{postgres=arwdDxtm/postgres,anon=arDxtm/postgres,authenticated=arDxtm/postgres,service_role=arwdDxtm/postgres}"}
```

(`arDxtm` = SELECT+INSERT+TRUNCATE+REFERENCES+TRIGGER+MAINTAIN — né `w` UPDATE né `d` DELETE per
`anon`/`authenticated`; solo `postgres` e `service_role` hanno `arwdDxtm` completo.) La garanzia
"sola-aggiunta imposta dal database" è verificata **funzionalmente**, non solo per assenza dalla lista.

**b) Oggetti vivi nel catalogo** — confermati via `pg_indexes` e `pg_get_constraintdef` che tutti gli
indici, i CHECK e le colonne coincidono esattamente col testo del brief (vincoli, tipi, nullability,
default). Incollato per intero:

```
INDEXES:
  eventi_qualita_lavoro_idx -> CREATE INDEX eventi_qualita_lavoro_idx ON public.eventi_qualita USING btree (laboratorio_id, lavoro_id)
  eventi_qualita_pkey -> CREATE UNIQUE INDEX eventi_qualita_pkey ON public.eventi_qualita USING btree (id)
  valutazione_viva_unique -> CREATE UNIQUE INDEX valutazione_viva_unique ON public.valutazioni_evento USING btree (laboratorio_id, evento_id) WHERE (superata = false)
  valutazioni_evento_pkey -> CREATE UNIQUE INDEX valutazioni_evento_pkey ON public.valutazioni_evento USING btree (id)
lavori_rifacimenti.evento_id: uuid, nullable=YES, default=null
laboratori.certificazione_iso13485: text, nullable=NO, default='non_dichiarato'::text
```

**c) `COMMENT ON TABLE` con accenti** — il testo del brief spezza il commento su tre stringhe
letterali adiacenti separate da a-capo (concatenazione implicita SQL). Verificato che Postgres le ha
unite correttamente e che gli accenti (à, è, §) sono arrivati intatti — rilevante perché questo
stesso progetto ha già pagato un errore di codifica di accenti in un `COMMENT` in
`20260804152403_ondata_b_prescrizioni_rpc.sql` (corretto in `20260804154232`). Letto da
`obj_description`:

```
Append-only (D270). Una classificazione sbagliata si supera con una riga nuova che punta alla
precedente e ne dichiara il motivo; la vecchia si marca superata=true. MAI un UPDATE del giudizio:
ISO 13485 §4.2.5 richiede che le modifiche a una registrazione restino identificabili.
```

Corretto, nessun troncamento, nessun apostrofo raddoppiato dove non doveva esserlo.

---

## 5. FASE 6b — output reale

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
EXIT:0   (nessun testo su stderr)
```

Testa e coda del file verificate: il file inizia direttamente con `export type Json =` e finisce con
`export const Constants = { public: { Enums: {} } } as const` — nessun messaggio della CLI lasciato
in fondo.

`grep` di conferma:

```
1113: eventi_qualita: {
5898: valutazioni_evento: {
2302/2368/2434: certificazione_iso13485: string
3571: referencedRelation: "eventi_qualita"
```

```
$ npx tsc --noEmit
EXIT_CODE=0
```

---

## 6. `npx vitest run` — output reale

```
Test Files  429 passed | 3 skipped (432)
     Tests  5069 passed | 19 skipped (5088)
  Duration  39.84s
```

Nessun fallimento. (Il messaggio `Not implemented: navigation to another Document` è rumore jsdom
già presente prima di questa modifica, non applicativo a questa migration.)

**`next build` — non eseguito, e la ragione è dichiarata invece che sottintesa.** Il mandato di
questo task (§Procedimento, punti 3-6) elenca esplicitamente solo `tsc --noEmit` e `vitest run` dopo
la migration; non ho toccato codice applicativo (nessun handler di rotta, nessun componente) — solo
SQL e il file di tipi generato. `next build` è FASE 7 completa e resta dovuta prima del merge/deploy
dell'intera ondata (o quando un task successivo tocchi codice applicativo che usa queste tabelle);
la ometto qui solo perché niente in questo diff potrebbe farla fallire diversamente da `tsc`, non
perché la considero saltabile in generale.

---

## 7. Autorevisione

Ho riletto il diff cercando dove potrei aver sbagliato, non dove ho fatto bene:

- **Il testo SQL è stato copiato, non riscritto a memoria** — verificato con un diff diretto tra il
  file creato e il blocco del brief: identico carattere per carattere.
- **Punto di attenzione controllato:** `lavoro_id` su `eventi_qualita` e `evento_id` su
  `lavori_rifacimenti`/`valutazioni_evento` non hanno `ON DELETE` esplicito (default `NO ACTION`) —
  significa che un `lavoro` o un `eventi_qualita` referenziato non si può cancellare finché esiste la
  riga collegata. È **esattamente ciò che il brief scrive**, non un'aggiunta o omissione mia: non
  l'ho segnalato come difetto perché non è una mia interpretazione, è il testo dato verbatim.
- **Timestamp della migration**: letto dall'orologio (`date +%Y%m%d%H%M%S` → `20260806140823`), non
  dedotto dai file vicini (regola del progetto, §0F di CLAUDE.md) — verificato con
  `npx supabase migration list` che il nome non collidesse con nessuna migration già registrata
  prima di applicarla.
- **Nessun TODO, nessun segnaposto**: il file non ne contiene; verificato con lettura integrale.
- **Ruoli**: la migration non tocca `utenti.ruolo` — nessun rischio di introdurre un quarto ruolo
  nudo (`admin`) o di dimenticarne uno dei cinque; `created_by`/`classificato_da` sono FK generiche
  su `utenti(id)`, senza vincolo di ruolo, come da brief.
- **RLS**: uso di `public.current_lab_id()`, mai `auth.current_lab_id()` — verificato a occhio nel
  file e confermato dalle policy vive lette dal catalogo (`pg_policies`, §4b).
- Non ho trovato un punto in cui l'esecuzione reale abbia dato un risultato diverso da quello atteso
  dal brief.

---

## 8. Ritrovamenti fuori mandato (R-E2 — riferiti, non corretti)

**TRUNCATE resta concesso ad `anon`/`authenticated` su `valutazioni_evento`, e su ogni altra tabella
del progetto — inclusa `dichiarazioni_conformita`, il modello dichiarato "immutabile".**

Verifica fatta: `information_schema.role_table_grants` su `valutazioni_evento`, `lavori` e
`dichiarazioni_conformita` mostra `TRUNCATE` concesso ad `anon` e `authenticated` su **tutte e tre**
(oltre a UPDATE/DELETE ancora presenti su `dichiarazioni_conformita` — la sua "immutabilità" si
regge **solo** sull'assenza di policy RLS di UPDATE, non su una REVOKE di privilegio). In Postgres
`TRUNCATE` **non è soggetto a RLS** (le row-level policy si applicano a SELECT/INSERT/UPDATE/DELETE,
non a TRUNCATE) — quindi, sulla carta, un ruolo con privilegio TRUNCATE e una sessione autenticata
potrebbe svuotare `valutazioni_evento` per intero, aggirando sia le policy RLS sia la REVOKE
UPDATE/DELETE appena introdotta.

Non l'ho corretto: il brief chiede esplicitamente e soltanto `REVOKE UPDATE, DELETE`, il pattern è
**identico su ogni tabella del progetto** (sembra un grant di default a livello di schema, non
qualcosa introdotto da questa migration), e toccarlo solo per `valutazioni_evento` sarebbe
un'incoerenza silenziosa rispetto al resto dello schema — oltre a un cambiamento fuori dal
perimetro di questo task. Segnalo perché la garanzia "sola-aggiunta imposta dal database" enunciata
nel commento della tabella (e in §9 della spec) è **quasi** completa ma non blinda TRUNCATE; se il
progetto vuole la garanzia piena, serve una decisione a sé — probabilmente a livello di default
privileges di schema, non di singola tabella — con relativa prova di rifiuto.

**TRUNCATE — esposizione pratica:** l'unico canale con cui i client parlano al database in questo
progetto è PostgREST (via supabase-js), che **non emette mai un `TRUNCATE`** — non esiste un metodo
del client che lo generi. L'esposizione è quindi teorica per la via normale (qualcuno dovrebbe avere
una connessione SQL diretta col JWT del ruolo `authenticated`), non un canale che l'app userebbe mai
per errore. Lo segnalo comunque perché il commento sulla tabella dichiara la garanzia "il database",
punto — e su questo punto specifico non è ancora piena; non è un elemento per dare priorità a una
correzione, solo per non lasciarlo silenzioso.

Nessun altro ritrovamento fuori mandato.

---

## 8-bis. Conseguenza d'interfaccia per i task successivi (non un difetto — un fatto che il piano deve avere)

La combinazione **`REVOKE UPDATE`** + **indice unico parziale `valutazione_viva_unique` su
`superata = false`** (entrambi richiesti dal brief, entrambi corretti) produce un effetto che vale la
pena scrivere esplicitamente per chi implementerà §9 della spec (la riclassificazione): **nessun
client può "superare" una valutazione con una semplice INSERT + UPDATE.** Inserire la riga nuova
mentre la vecchia ha ancora `superata = false` viola l'indice unico parziale (due righe vive per lo
stesso `evento_id`); marcare la vecchia `superata = true` richiede un UPDATE, che è revocato. L'unico
modo per eseguire "inserisci la nuova, marca superata la vecchia" **atomicamente e con permessi
sufficienti** è una funzione `SECURITY DEFINER`, esattamente il precedente già in casa
(`annulla_consegna_atomica`, richiamato anche nel file modello §2 di questo report: "le policy non
la toccano"). Non è un difetto di questo task — l'SQL del brief è corretto e l'ho seguito verbatim —
ma è un vincolo d'interfaccia che il task che implementerà la riclassificazione deve conoscere PRIMA
di scrivere un `.update({superata: true})` lato client e trovarlo bocciato da un permission error.

---

## 9. BP-1 (MEMORY.md / ROADMAP-UFFICIALE.md) — non toccati, deliberatamente

Il mio mandato (procedimento, punti 1-8) non include l'aggiornamento di memoria/roadmap, e questo è
un task intermedio di un'ondata a più task (R-E1: un esecutore, un compito). Aggiornarli ora, da
solo, rischierebbe di scrivere uno stato parziale che i task successivi dovrebbero poi correggere.
Lascio BP-1 al chiusura-ondata o a chi orchestra i task successivi, e lo scrivo qui esplicitamente
perché non vada perso in silenzio.

---

## 10. Comandi eseguiti, in ordine (per chi vuole ripetere)

```bash
date +%Y%m%d%H%M%S
npx supabase migration list
npx supabase db push
# [prove di rifiuto, script del brief]
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
npx vitest run
git add supabase/migrations/20260806140823_eventi_qualita.sql src/types/database.types.ts
git commit -m "feat(qualita): ..."
```

---

## 11. Correzione dei rilievi

La revisione di questo task ha trovato due difetti **Critici** e due **Importanti**, tutti e quattro
nel testo del brief/piano copiato verbatim in §2 (`docs/superpowers/sdd`), non in una deviazione
dell'esecutore. Corretti con una migration **nuova** — `supabase/migrations/20260806142910_correzione_eventi_qualita_cross_tenant.sql`
— senza toccare `20260806140823_eventi_qualita.sql`, già registrata come applicata.

### 11.1 CRITICO 1 — `service_role` mancava dal REVOKE

**Il difetto:** `REVOKE UPDATE, DELETE ON public.valutazioni_evento FROM anon, authenticated;` non
citava `service_role`, che riceve `ALL` dalle default privileges di Supabase e ha `bypassrls` — la
RLS non lo ferma. Precedente già in casa e seguito: nota E8 in
`supabase/migrations/20260721090000_parete_cassette.sql:126-139`, applicato in
`supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql:79`.

**La correzione:** `REVOKE UPDATE, DELETE ON public.valutazioni_evento FROM anon, authenticated, service_role;`
ri-emessa nella migration nuova (REVOKE agisce sull'ACL corrente dell'oggetto, non sulla migration
che l'ha creato — non serve toccare quella vecchia).

**Prova reale, `relacl` letto dal catalogo dopo la correzione:**
```
{postgres=arwdDxtm/postgres,anon=arDxtm/postgres,authenticated=arDxtm/postgres,service_role=arDxtm/postgres}
```
`arDxtm` = SELECT+INSERT+TRUNCATE+REFERENCES+TRIGGER+MAINTAIN — né `w` (UPDATE) né `d` (DELETE) per
nessuno dei tre ruoli client-facing. Solo `postgres` (owner) ha `arwdDxtm` pieno.

**La conseguenza collegata (anticipata dal brief):** con `service_role` senza UPDATE, "superare" una
valutazione (`superata = true`) non si può più fare da client — serve una funzione SECURITY DEFINER.
Creata: `public.valutazione_supera(p_valutazione_vecchia_id uuid, p_laboratorio_id uuid)`, stesso
trattamento delle altre RPC del progetto (modello: `consegna_finalizza_atomica`,
`20260710091500_rpc_consegna_annullo_atomiche.sql`) — `SECURITY DEFINER`,
`SET search_path = public, pg_temp`, `REVOKE ALL ... FROM PUBLIC, anon, authenticated`,
`GRANT EXECUTE ... TO service_role`. Marca `superata = true` solo sulla riga
`id = p_valutazione_vecchia_id AND laboratorio_id = p_laboratorio_id`; ritorna
`{"esito":"ok"}` o `{"esito":"non_trovata"}`.

### 11.2 CRITICO 2 — riferimenti cross-tenant con FK semplici

**Il difetto:** `eventi_qualita.lavoro_id → lavori(id)`, `valutazioni_evento.evento_id →
eventi_qualita(id)`, `lavori_rifacimenti.evento_id → eventi_qualita(id)` erano FK semplici: la RLS
controlla solo `laboratorio_id` della riga che si inserisce, non del laboratorio proprietario della
riga puntata — il laboratorio A poteva creare un evento su un lavoro del laboratorio B, o una
valutazione su un evento di un altro laboratorio.

**La correzione, precedente già in casa e seguito** (`lavori_id_lab_uk`,
`supabase/migrations/20260727120000_lavori_denti.sql:8`; `lavori_immagini_id_lab_uk` +
`lavori_prescrizioni_lavoro_fk`, `supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql:50-54`):
1. `ALTER TABLE eventi_qualita ADD CONSTRAINT eventi_qualita_id_lab_uk UNIQUE (id, laboratorio_id)`.
2. Le tre FK riscritte in forma composita: `eventi_qualita_lavoro_fk FOREIGN KEY (lavoro_id,
   laboratorio_id) REFERENCES lavori (id, laboratorio_id)`; `valutazioni_evento_evento_fk` e
   `lavori_rifacimenti_evento_fk` entrambe `FOREIGN KEY (evento_id, laboratorio_id) REFERENCES
   eventi_qualita (id, laboratorio_id)`.

**La conseguenza insidiosa collegata da questo rilievo (`valutazione_viva_unique` su
`(laboratorio_id, evento_id)` — due laboratori diversi potevano avere due valutazioni vive sullo
stesso `evento_id`): verificata di persona, non assunta.** Con la FK composita, ogni riga di
`valutazioni_evento` che punta a un dato `evento_id` eredita per forza il `laboratorio_id` di
quell'evento (l'unico `laboratorio_id` compatibile con la coppia `(id, laboratorio_id)` unica su
`eventi_qualita`) — quindi il `laboratorio_id` non è più libero di variare a parità di `evento_id`, e
il caso "due laboratori, stesso evento, due righe vive" diventa **irraggiungibile a monte**: il test
(c) sotto (laboratorio B tenta una valutazione su un evento di A) fallisce già all'INSERT, prima
ancora di arrivare all'indice unico. Confermato con l'output reale del test in §11.3.

### 11.3 IMPORTANTE 3 — prove di rifiuto sull'invariante

Nessun test tentava di violare `valutazione_viva_unique` o le nuove FK composite. Script:
`scripts/tmp/sonda-intervento-fix-r-p1.mjs` (usa e getta, non committato — `scripts/tmp/` è
ignorato da git), modello `scripts/tmp/sonda-intervento-r-p1.mjs`. Tutte le prove di rifiuto in
transazione annullata (`BEGIN`…`ROLLBACK`); le uniche righe scritte fuori transazione (un evento e
le sue valutazioni, necessarie per costruire i casi) sono cancellate a fine script — verificato col
conteggio delle righe cancellate nell'output.

**Output reale, integrale:**

```
Laboratori di prova: A=00000000-0000-0000-0000-000000000001 (lavoro 00000000-0000-0000-0000-000000000030) · B=971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c (lavoro 0273749d-b583-48af-a75f-8f02aba18080)

=== (b) eventi_qualita cross-tenant: laboratorio A punta al lavoro di B ===
  ✅ rifiutato → insert or update on table "eventi_qualita" violates foreign key constraint "eventi_qualita_lavoro_fk"

Evento di prova (laboratorio A, persistente per la durata dello script): 772c2756-b044-405d-8c07-a57d8113b105

=== (c) valutazioni_evento cross-tenant: laboratorio B valuta un evento di A ===
  ✅ rifiutato → insert or update on table "valutazioni_evento" violates foreign key constraint "valutazioni_evento_evento_fk"

=== (d) controprova: valutazione legittima (laboratorio A sul proprio evento) ===
  ✅ accettato (controprova: il vincolo non rifiuta tutto)

=== (a) seconda valutazione viva sullo stesso evento (valutazione_viva_unique) ===
  ✅ rifiutato → duplicate key value violates unique constraint "valutazione_viva_unique"

=== (e) UPDATE diretto su valutazioni_evento come service_role ===
Valutazione di prova per (e): a872da8c-0796-4414-a66d-e2e0017f34be
  ruolo attivo nella transazione: service_role
  ✅ rifiutato → permission denied for table valutazioni_evento

=== (e) stessa operazione via valutazione_supera(...) come service_role deve riuscire ===
  ruolo attivo nella transazione: service_role
  esito RPC: {"esito":"ok"}
  ✅ RPC riuscita (come service_role): superata=true confermato in tabella
  esito RPC su id inesistente: {"esito":"non_trovata"} (atteso: {"esito":"non_trovata"})
  esito RPC chiamata da B su valutazione di A: {"esito":"non_trovata"} (atteso: {"esito":"non_trovata"} — il WHERE laboratorio_id=p_laboratorio_id non trova la riga)

=== (e) controllo EXECUTE su valutazione_supera (catalogo) ===
  postgres:EXECUTE · service_role:EXECUTE

=== Pulizia righe di prova persistenti ===
  valutazioni_evento cancellate: 1 · eventi_qualita cancellati: 1
```

Cinque righe `✅`, nessuna `❌`. Nota su (e): il test gira DAVVERO come `service_role`
(`SET LOCAL ROLE service_role` dentro la transazione, confermato da `current_user` letto e
stampato) — non come il ruolo superuser della connessione, che avrebbe bypassato ogni GRANT/REVOKE e
non avrebbe provato niente (stessa lezione di E8: una prova sul catalogo non basta, serve una prova
funzionale eseguita come il ruolo vero).

### 11.4 IMPORTANTE 4 — indici mancanti

Aggiunti (verificati vivi su `pg_indexes` dopo l'applicazione):
```
valutazioni_evento_lab_evento_idx: CREATE INDEX ... ON public.valutazioni_evento USING btree (laboratorio_id, evento_id)
lavori_rifacimenti_evento_idx:     CREATE INDEX ... ON public.lavori_rifacimenti USING btree (evento_id)
```
Il primo è **non parziale** (a differenza di `valutazione_viva_unique`, che resta parziale su
`superata = false`): copre anche lo storico completo di un evento, comprese le valutazioni superate.

### 11.5 Verifica — output reale

```
$ npx supabase db push
{"upToDate":false,"dryRun":false,"migrations":["20260806142910_correzione_eventi_qualita_cross_tenant.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}

$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
EXIT:0   (file verificato: inizia con "export type Json =", finisce con "} as const", nessun
          messaggio CLI residuo; "valutazione_supera" presente fra i Functions generati)

$ npx tsc --noEmit
EXIT_CODE=0

$ npx vitest run
 Test Files  429 passed | 3 skipped (432)
      Tests  5069 passed | 19 skipped (5088)
   Duration  137.45s

$ npx next build
✓ Compiled successfully in 9.1s
  Running TypeScript ...
  Finished TypeScript in 15.8s ...
✓ Generating static pages using 15 workers (82/82) in 405ms
```

`next build` era stato omesso dal task originale (§6, motivato lì) — la revisione lo ha rilevato
mancante e questa correzione lo esegue, come dovuto dal percorso «Grande» (RLS + migration).

### 11.6 Dubbi/osservazioni per chi ratifica

- **`service_role:EXECUTE` su `valutazione_supera` compare anche `postgres:EXECUTE`** nel catalogo
  (`information_schema.role_routine_grants`) — è l'owner della funzione, non un grant esplicito
  aggiuntivo: stesso comportamento di ogni altra RPC SECURITY DEFINER del progetto, non specifico di
  questa migration. Non l'ho trattato come anomalia, ma lo scrivo perché non l'ho assunto senza
  guardarlo.
- **`TRUNCATE` resta concesso** ad `anon`/`authenticated`/`service_role` su `valutazioni_evento`
  (visibile in `arDxtm`, la `t` è TRIGGER non TRUNCATE — la `m` finale è MAINTAIN, il privilegio
  `TRUNCATE` vero è la `D` maiuscola, presente). Il Task 1 originale l'aveva già segnalato come
  finding fuori mandato in §8 (non ripetuto qui: R-E2, si riferisce una volta, non ad ogni
  correzione).

- 🛑 **R-E2 — trovato FUORI mandato, riferito e NON corretto: `valutazioni_evento.sostituisce_id` è
  rimasta una FK SEMPLICE, stessa classe del CRITICO 2.** Il mio stesso censimento del catalogo
  (§ sopra, catalogo vivo) lo mostra:
  `valutazioni_evento_sostituisce_id_fkey [f]: FOREIGN KEY (sostituisce_id) REFERENCES
  valutazioni_evento(id)`. Il laboratorio A può inserire una riga con `laboratorio_id = A`,
  `evento_id = <evento di A>` (passa la nuova FK composita) e `sostituisce_id = <valutazione di B>`:
  la FK semplice controlla solo che la riga esista, non che appartenga allo stesso laboratorio, e la
  RLS sull'INSERT controlla solo la riga che si inserisce, non quella puntata — esattamente il
  meccanismo del CRITICO 2, sulla quarta FK che il brief non elencava (R-P6: l'elenco delle FK da
  correggere non lo decide l'autore del brief). **Non è un fix da una riga**: `valutazioni_evento`
  non ha ancora un `UNIQUE (id, laboratorio_id)` (necessario perché una FK composita possa puntare a
  se stessa), va aggiunto insieme alla riscrittura di `sostituisce_id_fkey` in forma
  `(sostituisce_id, laboratorio_id) REFERENCES valutazioni_evento (id, laboratorio_id)`. Precedente
  di riferimento per la scelta simple-vs-composita: `20260804150306_ondata_b_lavori_prescrizioni.sql`
  lascia semplice `confermata_da uuid REFERENCES utenti(id)` (:41, punta a `utenti`, non-tenant) e
  rende composita `fonte_immagine_id` (:53-54, punta a un'entità tenant-scoped) — `sostituisce_id`
  punta a `valutazioni_evento`, entità tenant-scoped, quindi segue il secondo caso. Per differenza,
  `created_by`/`classificato_da` (→ `utenti`) restano correttamente semplici, coerenti col brief:
  non li segnalo come difetto.

- **Verifica runtime (non richiesta esplicitamente, fatta perché tsc/vitest/next build non possono
  vederla — sono controlli statici, il REVOKE e le FK composite sono vincoli che si vedono solo
  eseguendo davvero una query):**
  `grep -rn "valutazioni_evento\|eventi_qualita" src/ | grep -v database.types.ts` → **zero
  occorrenze**. Nessun codice applicativo legge o scrive oggi queste due tabelle (Task 1 ha solo
  creato lo schema, nessuna route/componente le usa ancora). Verificato anche sul catalogo vivo che
  `crea_rifacimento_atomico()` — l'unica RPC che scrive su `lavori_rifacimenti`, la tabella con la
  terza FK composita di questa correzione — **non** referenzia `evento_id`
  (`pg_get_functiondef(...).includes('evento_id')` → `false`). Il REVOKE `service_role` e le FK
  composite non rompono nessun percorso esistente: non c'è nessun percorso esistente su queste
  colonne.

- **Nota per il task che implementerà §9 della spec (riclassificazione), a futura memoria:**
  `valutazione_supera` copre SOLO metà dell'operazione descritta in §8-bis del Task 1
  ("inserisci la nuova, marca superata la vecchia" — un'unica RPC atomica). Il brief di QUESTA
  correzione chiedeva esplicitamente una funzione che marca soltanto (`valutazione_supera`), ed è
  quella che ho costruito — non è una mia scorciatoia. Ma un chiamante che fa
  "INSERT della nuova valutazione, poi RPC per superare la vecchia" in due passi separati attraversa
  una finestra in cui l'evento ha **zero** valutazioni vive (se supera prima) o due
  (se l'INSERT della nuova va prima — e in quel caso l'INSERT stesso fallisce su
  `valutazione_viva_unique`, quindi l'ordine corretto è "supera prima, poi inserisci" — ma questo
  lascia comunque una finestra a zero valutazioni vive fra le due chiamate). Chi scrive §9 deve
  saperlo prima di scrivere il client, non scoprirlo da un bug di sincronizzazione in produzione.

- **BP-1 (MEMORY.md/ROADMAP-UFFICIALE.md): non toccato, deliberatamente — stessa ragione di §9.**
  Anche questa è una correzione di un task intermedio in un'ondata a più task (R-E1: un esecutore,
  un compito): aggiornare memoria/roadmap ora, da solo, rischia di scrivere uno stato parziale che i
  task successivi (o la chiusura dell'ondata) dovrebbero poi correggere. Il fatto che questa
  correzione abbia aggiunto una funzione DB nuova (`valutazione_supera`) non cambia la ragione — la
  aggiungo comunque a un elenco che chi chiude l'ondata dovrà scrivere in MEMORY.md.

- **`.superpowers/` è ignorato da git** (`.gitignore:140`) — questo report, incluso questo
  paragrafo, **non è nel commit** `09551b14f41d499c25f6bc455f561c460074d594`. Stessa convenzione
  del report originale del Task 1 (§10: il comando `git add` lì non includeva il report). Chi legge
  questo file da una macchina diversa non lo trova nella storia git — vive solo localmente.

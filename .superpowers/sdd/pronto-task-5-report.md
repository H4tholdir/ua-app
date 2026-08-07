# Task 5 — Il rifacimento sa da quale evento nasce · REFERTO

**Ramo:** `intervento-post-consegna` · **Migration:** `supabase/migrations/20260807185858_rifacimento_evento.sql`
**Esito:** completato. 5 sonde su 5 verdi (le 4 del brief + una aggiunta). FASE 6b uscita 0.

---

## 1. Il timestamp — un passaggio che ha richiesto una verifica in più

Il brief fissava `date -u "+%Y%m%d%H%M%S"`. Prima di fidarmene ho letto il **pavimento vero dal
ledger vivo** (lezione ③ vale anche per il ledger) e ho misurato l'orologio nei due modi, in un
comando separato:

```
$ date "+locale=%Y%m%d%H%M%S"; date -u "+utc___=%Y%m%d%H%M%S"; date
locale=20260807205748
utc___=20260807185748
Fri Aug  7 20:57:48 CEST 2026
```
```
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 3;
  20260807182614 · 20260807180314 · 20260807174850
```

Il dubbio era serio: il cappello di `20260805201640` e D155 documentano `date` **senza** `-u`, cioè
ora locale. Siccome CEST è UTC+2, un nome UTC è **due ore più basso** di uno locale preso nello
stesso istante — e con il pavimento a `20260807182614` la scelta sbagliata avrebbe prodotto un nome
**inferiore all'ultima migration applicata**.

L'ho risolto misurando invece di dedurre, confrontando il nome di ogni migration con l'ora reale in
cui il file è stato aggiunto (`git log --diff-filter=A --date=format-local`):

| migration | aggiunta il (locale) | il nome è… |
|---|---|---|
| `20260805201640` | 20:26:41 CEST | **locale** (20:16:40) |
| `20260806210400` | 21:19:19 CEST | **locale** (21:04:00) |
| `20260807143623` | 14:53:08 CEST | **locale** (14:36:23) |
| `20260807171033` | 19:18:24 CEST | **UTC** (19:10:33 CEST) |
| `20260807172520` | 19:30:48 CEST | **UTC** (19:25:20 CEST) |
| `20260807174850` | 19:57:35 CEST | **UTC** (19:48:50 CEST) |
| `20260807180314` | 20:07:41 CEST | **UTC** (20:03:14 CEST) |
| `20260807182614` | 20:36:26 CEST | **UTC** (20:26:14 CEST) |

➡️ **Il brief aveva ragione** e la mia ipotesi iniziale era sbagliata: questa ondata è tutta su UTC.
Scegliere l'ora locale avrebbe per giunta «bruciato» due ore di spazio dei nomi, mandando **sotto** il
mio ogni nome UTC dei task successivi della stessa serata. Timestamp preso in un comando separato
subito prima di creare il file: **`20260807185858`** (> `20260807182614` ✓).

⚠️ Il fatto che la convenzione sia **cambiata a metà ledger** è un rilievo fuori mandato: §5.

---

## 2. Il corpo vivo letto PRIMA del `DROP` (e se differiva dal file)

Letto dal catalogo, mai dal file:

```sql
SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname='crea_rifacimento_atomico';   -- → righe=1
```

**Differiva dal file `20260805201640`? NO — coincide.** Il testo vivo è identico a quello di
`20260805201640` (unica differenza: `pg_get_functiondef` chiude `$function$` senza punto e virgola).
Coerente con il censimento: nessuna migration successiva riscrive la funzione — il Task 3
(`20260807180314`) tocca il CHECK su `motivo` e crea l'indice, non la RPC.
🔑 Ma è **il catalogo** ad averlo deciso, non il file: la coincidenza è un esito misurato, non un
presupposto. Copia integrale del corpo vivo conservata durante il lavoro come base del confronto.

**Prova che ho ribattuto il corpo senza alterarlo.** Ho estratto il `CREATE` dalla migration e l'ho
confrontato riga per riga col corpo vivo:

```
$ diff vivo.sql nuovo_body.sql
1c1
<   …p_note text DEFAULT NULL::text)
>   …p_note text DEFAULT NULL::text, p_evento_id uuid DEFAULT NULL::uuid)
112c112,117
<     motivo, rilevato_in, costo_interno, note
>     motivo, rilevato_in, costo_interno, note,
>     …(commento)…
>     evento_id
115c120,121
<     p_motivo, p_rilevato_in, p_costo_interno, p_note
>     p_motivo, p_rilevato_in, p_costo_interno, p_note,
>     p_evento_id
```

Tre differenze, tutte volute: la firma, la lista colonne, la lista valori. **Nient'altro è cambiato.**

---

## 3. Le ACL dal catalogo — prima e dopo

**PRIMA del `DROP`** (`pg_proc.proacl`, firma a 5 argomenti):

```
firma        crea_rifacimento_atomico(uuid,text,text,numeric,text)
proprietario postgres
acl          {postgres=X/postgres,service_role=X/postgres}
anon_puo false · auth_puo false · srv_puo true
```

**Verifica preliminare che il `DROP` non rompesse niente** (il brief la dava per fatta, l'ho rifatta):

```
pg_depend (deptype <> 'i') su crea_rifacimento_atomico(…5 arg)  → 0 righe
pg_policies con la funzione in qual/with_check                  → 0 righe
pg_proc.prosrc ILIKE '%crea_rifacimento_atomico%' (altre)       → 1 riga: cassetta_trasferisci_rifacimento
```

⚠️ Quell'unica riga **non compare in `pg_depend`** (plpgsql non crea dipendenze sulle funzioni che
chiama): l'ho aperta invece di dedurre. È un **commento** — «*La RPC 007 crea_rifacimento_atomico NON
si tocca.*» — non una chiamata. Nessun chiamante SQL: il «0 dipendenze» del brief regge.

**E una copia stantia della firma a cinque argomenti non è rimasta da nessuna parte.** `supabase/`
contiene anche `schema.sql` e `seed.sql`, che il censimento sulle sole `migrations/` non avrebbe
guardato: se uno dei due avesse portato la vecchia definizione, un ambiente ricreato da lì
rinascerebbe **senza** la scrittura di `evento_id`.

```
$ ls supabase/                                    → migrations  schema.sql  seed.sql
$ grep -rn "crea_rifacimento_atomico" supabase/ --include="*.sql" -l | grep -v "migrations/"
(nessuna riga — 0 hit fuori da migrations/)
```

**L'applicazione** (D284, non si chiede):

```
$ npx supabase db push --linked --yes
Applying migration 20260807185858_rifacimento_evento.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260807185858_rifacimento_evento.sql"],…}
uscita=0
```

**DOPO** — SONDA ③, letta dal catalogo e ricontrollata con `has_function_privilege`:

```
firma                     crea_rifacimento_atomico(uuid,text,text,numeric,text,uuid)
proprietario              postgres
security_definer          true
search_path               {"search_path=public, pg_temp"}
acl_catalogo              {postgres=X/postgres,service_role=X/postgres}
acl_cita_anon             false
acl_cita_authenticated    false
anon_puo_eseguire         false
auth_puo_eseguire         false
srv_puo_eseguire          true
identica_a_prima_del_drop true
```

✅ **L'ACL dopo è byte-identica a quella prima del `DROP`.** Proprietario ancora `postgres` (per una
`SECURITY DEFINER` un cambio di proprietario sarebbe un cambio di privilegi, non un dettaglio),
`SECURITY DEFINER` e `search_path` conservati. Nel catalogo resta **una sola** riga: la firma a
cinque argomenti non esiste più, quindi non c'è un residuo aperto da qualche parte.

---

## 4. Le quattro sonde del brief, più una

Una **invocazione separata per sonda** (lezione ①), fixture costruita **dentro** la transazione
annullata (lezione ②), e sempre contro la **funzione viva** — nessuna sonda si riscrive la funzione
addosso (lezione ⑤).

### ① La chiamata a CINQUE argomenti funziona ancora — **VERDE**

Forma nominata, la stessa che PostgREST genera da `route.ts:181-187`:

```
[2] SELECT — { lavoro_nuovo_id: '293806f5-…', numero_lavoro: '2026/0017' }
[3] SELECT — motivo 'misura_errata' · rilevato_in 'post_consegna' · evento_id null · evento_id_e_null true
[4] ROLLBACK
```

**E anche al livello HTTP vero**, che è dove vive il chiamante — con un identificativo inesistente,
così non scrive nulla (l'eccezione scatta prima dell'incremento del progressivo):

```
$ curl -X POST …/rest/v1/rpc/crea_rifacimento_atomico  -d '{"p_lavoro_originale_id":"…00ff", …5 chiavi…}'
http=400
{"code":"P0001","message":"Lavoro 00000000-0000-0000-0000-0000000000ff non trovato"}
```

🔑 Il messaggio arriva **dal corpo della funzione**, non da PostgREST: quindi le cinque chiavi
nominate risolvono ancora, e la cache dello schema si è ricaricata da sola dopo il DDL (se non fosse
successo avrei avuto `PGRST202 Could not find the function`). Era il rischio meno visibile del
`DROP`+`CREATE`, ed è chiuso.

### ② La chiamata a SEI argomenti scrive `evento_id` — **VERDE**

```
[3] SELECT — { lavoro_nuovo_id: '68f0739a-…', numero_lavoro: '2026/0017' }
[4] SELECT — evento_id 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2' · evento_id_scritto true
             motivo 'difetto_lavorazione' · rilevato_in 'post_consegna' · costo_interno '12.50'
             note 'sonda 2 — sei argomenti' · is_rifacimento true · stato_nuovo_lavoro 'ricevuto'
[5] ROLLBACK
```

Ho riletto **anche** motivo/rilevato_in/costo_interno/note: le due liste dell'`INSERT` si
corrispondono per indice e uno scivolamento di un posto fra colonne compatibili sarebbe passato
**senza errore**. Ogni valore è nella sua colonna.

### ③ Le ACL non contengono `anon` né `authenticated` — **VERDE** (§3)

### ④ Due chiamate con lo stesso evento → la seconda esce **23505** — **VERDE**

```
❌ 23505 duplicate key value violates unique constraint "rifacimento_evento_unique"
   dettaglio: Key (laboratorio_id, evento_id)=(00000000-0000-0000-0000-000000000001,
              aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee4) already exists.
```

La prima chiamata riesce, la seconda no. È **esattamente** il vincolo del Task 3, che fino a oggi
vigilava su una colonna sempre NULL: da questa migration si è svegliato.

### ⑤ Un evento di un ALTRO laboratorio è rifiutato — **VERDE** (aggiunta, non nel brief)

```
❌ 23503 insert or update on table "lavori_rifacimenti" violates foreign key constraint
   "lavori_rifacimenti_evento_fk"
   dettaglio: Key (evento_id, laboratorio_id)=(aaaaaaaa-…eee5, 00000000-…0001)
              is not present in table "eventi_qualita".
```

🔑 **Perché l'ho aggiunta, e perché non è decorazione.** Ho letto
`pg_get_functiondef('assert_same_lab_rifacimento')`: il trigger controlla **solo**
`lavoro_originale_id` e `lavoro_nuovo_id`, e **non guarda mai `evento_id`**. Siccome la RPC è
`SECURITY DEFINER` e non filtra per laboratorio, l'unico guardiano del riferimento fra laboratori
diversi è la **FK composita** — e prima di oggi nessuno la esercitava, perché la colonna restava
sempre NULL. Da qui in poi è una difesa viva, e ora è provata. L'errore è `23503` (la FK) e non
`P0001` (il trigger), come previsto.

---

## 5. FASE 6b — gen types + tsc

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
gen_uscita=0    (nessun messaggio CLI in coda al file: finisce con "} as const")

$ npx tsc --noEmit
tsc_uscita=0    (log vuoto)
```

Firma generata — `p_evento_id` è **opzionale**, quindi la chiamata a cinque chiavi di
`route.ts:181-187` continua a compilare **senza toccare la rotta**:

```ts
crea_rifacimento_atomico: {
  Args: { p_costo_interno?: number; p_evento_id?: string; p_lavoro_originale_id: string
          p_motivo: string; p_note?: string; p_rilevato_in?: string }
  Returns: Json }
```

**E la rete di sicurezza resta verde**, perché `src/types/database.types.ts` è una superficie di tipi
condivisa da tutto il progetto e il Task 6 deve ereditarla intatta:

```
$ npx vitest run
 Test Files  444 passed | 6 skipped (450)
      Tests  5436 passed | 68 skipped (5504)
vitest_uscita=0
```

`next build` **non** l'ho eseguito, deliberatamente: `CLAUDE.md` §0C dice che il suo apporto unico è
la firma degli handler di rotta, e in questo task nessun handler è stato toccato.

---

## 6. Difetti riferiti fuori mandato (R-E2)

**① Il ledger delle migration ha due orologi, e il passaggio è avvenuto dentro questa ondata.**
Fino a `20260807143623` compreso i nomi sono in **ora locale**; da `20260807171033` (Task 1 di questa
serie) in poi sono in **UTC**. Misurato sulle date reali di aggiunta dei file (tabella in §1), non
dedotto. La documentazione dice ancora locale: D155 in `CLAUDE.md` §0F e il cappello di
`20260805201640` prescrivono entrambi `date "+%Y%m%d%H%M%S"`, **senza** `-u`.
🔑 **Perché è un rischio e non una pignoleria:** essendo CEST = UTC+2, un nome locale sta **sempre due
ore sopra** un nome UTC preso nello stesso istante. Quindi dopo una migration battezzata in locale,
**qualunque migration UTC creata nelle due ore successive nasce con un nome più BASSO** e finisce
fuori ordine. Oggi non è successo per un margine di 31 minuti. **Non l'ho corretto** (fuori mandato, e
toccare la convenzione a metà ondata sarebbe peggio): va scelto un orologio solo e scritto in D155.

**② Il 23505 che ho appena reso raggiungibile oggi non lo traduce nessuno.**
Il cappello del Task 3 (`20260807180314`) dice: «*Col vincolo, il secondo tentativo è un 23505
riconoscibile: **la rotta lo traduce e restituisce il lavoro già creato***». Quella traduzione **non
esiste ancora**: in `src/app/api/lavori/[id]/rifacimento/route.ts` non compare nessun `23505` (grep: 0
occorrenze; le uniche in `src/app/api/lavori/` stanno in `prove/route.ts:97`), e il ramo d'errore è
`if (error) return NextResponse.json({ error: error.message }, { status: 500 })` (righe 189-191).
🔑 **Perché lo segnalo proprio adesso — e con la misura esatta, perché mi ero sbagliato scrivendola
la prima volta.** Avevo scritto «la mia migration lo rende raggiungibile» e «da ora un ritentativo
restituirebbe un 500»: **è falso oggi**. L'indice è **parziale** (`WHERE evento_id IS NOT NULL`) e
l'unico chiamante esistente — `route.ts:181-187` — passa **cinque** chiavi, quindi lì `evento_id`
resta sempre NULL e il 23505 **non è raggiungibile per quella strada**. La formulazione giusta è: la
mia migration lo rende **possibile**, e diventerà **raggiungibile appena un chiamante passa
`p_evento_id`** (Task 6). Da quel momento, senza la traduzione, un ritentativo sullo stesso evento
darebbe un **500 col messaggio grezzo di Postgres** invece del comportamento idempotente promesso —
l'opposto dell'intento di D307. Lascio la correzione a vista invece di riscrivere: un referto che
annuncia un 500 già vivo manderebbe il prossimo esecutore a caccia di un difetto che oggi non c'è.
Appartiene al task che possiede la rotta (nessuna riga della rotta rientra nel mio mandato, quindi
**non l'ho toccata**).

**③ Nota di metodo, non un difetto.** Il «0 dipendenze (P9)» del brief è **vero**, ma `pg_depend` da
solo non lo avrebbe dimostrato: plpgsql non registra dipendenze verso le funzioni che chiama, quindi
una vera chiamata da un'altra funzione sarebbe risultata invisibile lì. Serve anche la ricerca
testuale su `pg_proc.prosrc` — che infatti ha prodotto una riga, poi risultata un commento.

---

## 7. Riepilogo

| voce | esito |
|---|---|
| Migration | `20260807185858_rifacimento_evento.sql`, applicata, uscita 0 |
| Corpo ribattuto dal catalogo vivo | sì — coincideva col file, ma deciso dal catalogo |
| `DROP`→`CREATE`→`REVOKE`→`GRANT`→`COMMENT` | tutto nella stessa migration |
| ACL dopo | `{postgres=X/postgres,service_role=X/postgres}` — identica a prima |
| Sonde | ① ② ③ ④ del brief + ⑤ aggiunta → **5 verdi su 5** |
| FASE 6b | `gen types` 0 · `tsc --noEmit` 0 · rotta non toccata |
| Rete di sicurezza | `vitest run` → 5436 passati, 0 falliti, uscita 0 |
| Copie stantie della firma a 5 arg | nessuna fuori da `migrations/` (`schema.sql`/`seed.sql` puliti) |
| Difetti fuori mandato | 2 riferiti (ledger a due orologi · 23505 non tradotto) |
| BP-1 (MEMORY.md + ROADMAP) | **non eseguito** — fuori dal mandato di Task 5 (R-E1) |

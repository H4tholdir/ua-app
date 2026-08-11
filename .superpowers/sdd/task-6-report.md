# Task 6 — Referto · «Il rifacimento si porta dietro la tinta» (D42, Task 6 di 9)

**Ramo:** `tinte-manufatto` (repo principale, nessun worktree) · **Data:** 05/08/2026
(`provato:` `date` → `Wed Aug 5 20:16:40 CEST 2026`, usata per il nome della migration).
**Esito:** 🟢 completo. Migration applicata al DB vivo, collaudo verde su transazione annullata,
FASE 6b eseguita (tipi invariati), `verify:full` esce 0 con i numeri di riferimento esatti.

---

## 0. ⚠️ COLLISIONE DI PERCORSO TROVATA FUORI MANDATO — riferita, non corretta (R-E2)

**Prima di scrivere questo referto**, il percorso che il brief indica
(`.superpowers/sdd/task-6-report.md`) conteneva un referto **completo e non banale di
un'altra ondata**: «Task 6 — Referto · "La lettura per la scheda (server)"», ramo
`ondata-b-sessione-3`, datato 04/08/2026 23:44 — il lavoro sulla GET `/api/lavori/[id]` e
`normalizzaPrescrizione`, niente a che vedere con D42/tinte-manufatto.

**Portata del difetto, censita prima di agire:**
- `.superpowers/` è **interamente fuori da git** (`.gitignore:140`) — questi file non hanno
  storia recuperabile: un sovrascrivere è **irreversibile**.
- `ls -la .superpowers/sdd/*.md` mostra che **tutti** i `task-{1,2,4,5,6,7,8,10,11-giro}-report.md`
  e `task-3-9-report.md`, più `progress.md`, portano l'intestazione `ondata-b-sessione-3` e la
  data 04-05/08/2026 — sono il set di lavoro **intero** di quell'ondata, mai archiviato.
- `archivio-ondate-precedenti/` ha cartelle datate fino a `2026-08-04-ondata-b-sessione-2`
  (archiviata il 4/08 alle 19:01): **sessione-3 è l'unica non archiviata**.
- L'unico file già toccato da D42 in questa cartella è `task-6-brief.md` (riscritto oggi alle
  20:13 col brief di QUESTO task) — nessun altro file `task-N-brief.md`/`task-N-report.md` di D42
  risulta scritto qui: i referti dei Task 1-5 di D42 (che il mio brief dà per fatti, e che ho
  verificato indipendentemente sul database vivo — catalogo 34 righe, colonne, tre vincoli, tutti
  presenti) **non vivono in questi percorsi**. La numerazione `task-N` di questa cartella non è
  scoped per ondata, e la sessione-3 non è mai stata spostata prima che D42 iniziasse a scriverci
  sopra.

**Cosa ho fatto per non perdere il dato** (custodia, non correzione del processo — non ho
riorganizzato l'archivio, non è nel mio mandato): ho copiato il contenuto originale di
`task-6-report.md` (ondata-b-sessione-3) **prima di sovrascriverlo**, integro, **nella stessa
cartella** (gitignored ma persistente sul disco, non nella scratchpad effimera dell'agente):
`.superpowers/sdd/task-6-report-ondata-b-sessione-3-PRESERVATO-2026-08-05.md`. Non ho toccato
`task-1/2/4/5/7/8/10/11-giro-report.md` né `progress.md` di sessione-3: restano dove sono, esposti
alla stessa sorte se un'altra ondata dovesse riusare il loro nome.

**Cosa NON ho fatto, e perché:** non ho spostato `task-1/2/4/5/7/8/10/11-giro-report.md` né
`progress.md` di sessione-3 dentro `archivio-ondate-precedenti/`. È lavoro reale (organizzare
l'archivio di un'altra ondata) fuori dal mandato di «Task 6 di D42», e una riorganizzazione fatta
di corsa dentro un task diverso è esattamente il tipo di correzione silenziosa che R-E2 vieta.
**Segnalo e basta**: quei file restano esposti alla stessa sorte di `task-6-report.md` finché
qualcuno non li archivia.

---

## 1. Passo 1 — La funzione letta dal catalogo vivo, non dal file

```sql
SELECT prosrc FROM pg_proc WHERE proname = 'crea_rifacimento_atomico';
```

Nessuna migration fra `20260804211256` (l'ultima che tocca questa funzione) e l'ultima applicata
prima di questo task (`20260805174500`) la riscrive — il catalogo vivo coincideva col testo
dell'ultima riscrittura nota, ma è il catalogo ad averlo deciso, non l'assunzione.

**Le righe dell'`INSERT INTO lavori (…)` lette dal catalogo vivo, incollate integralmente:**

```sql
  INSERT INTO lavori (
    laboratorio_id, numero_lavoro, anno_lavoro,
    cliente_id, paziente_id, tecnico_id,
    richiedente_nome, istituzione_sanitaria,
    tipo_dispositivo, descrizione, note_interne,
    colore_dente, denti_coinvolti, arcata,
    colore_scala, colore_codice,
    denti_mancanti, denti_impianti,
    classe_rischio, norma_riferimento,
    da_conformare, conformato,
    stato, priorita,
    data_ingresso, data_consegna_prevista,
    codice_iva, natura_iva,
    is_rifacimento, rifacimento_motivo,
    listino_id, prezzo_unitario
  ) VALUES (
    v_lavoro.laboratorio_id, v_numero, v_anno,
    v_lavoro.cliente_id, v_lavoro.paziente_id, v_lavoro.tecnico_id,
    v_lavoro.richiedente_nome, v_lavoro.istituzione_sanitaria,
    v_lavoro.tipo_dispositivo, v_lavoro.descrizione, p_note,
    v_lavoro.colore_dente, v_lavoro.denti_coinvolti, v_lavoro.arcata,
    v_lavoro.colore_scala, v_lavoro.colore_codice,
    v_lavoro.denti_mancanti, v_lavoro.denti_impianti,
    v_lavoro.classe_rischio, v_lavoro.norma_riferimento,
    TRUE, FALSE,
    'ricevuto', v_lavoro.priorita,
    NOW(), v_lavoro.data_consegna_prevista,
    v_lavoro.codice_iva, v_lavoro.natura_iva,
    TRUE, p_motivo,
    v_lavoro.listino_id, v_lavoro.prezzo_unitario
  ) RETURNING id INTO v_nuovo_id;
```

Confermato: **`tinta_famiglia`/`tinta_codice` non comparivano né nelle colonne né nei valori** —
il difetto gemello di G1 (colore_scala/colore_codice, chiuso il 28/07 in `20260728103000`) era
reale e vivo.

Nessun'altra funzione scrive su `lavori` a parte questa e `lavoro_crea_atomico` (censito:
`SELECT proname FROM pg_proc WHERE prosrc ILIKE '%INSERT INTO lavori %'` → 2 righe). Nota, fuori
dal mio mandato ma già coperta dal piano stesso (non un difetto nuovo): `lavoro_crea_atomico` non
scrive `tinta_famiglia`/`tinta_codice` — la creazione via wizard con tinta è dichiarata «parte 2»
nel piano (`docs/superpowers/plans/2026-08-03-tinte-manufatto.md:106-107`), e il POST
`/api/lavori/route.ts` non nomina `tinta` (`provato:` `grep -n "tinta" src/app/api/lavori/route.ts`
→ zero hit). Oggi la tinta si assegna solo dalla scheda via PATCH (Task 5). Non è una scoperta:
il piano lo dice esplicitamente, quindi non lo marco come ritrovamento.

## 2. Passo 2 — La riscrittura

File creato: `supabase/migrations/20260805201640_rifacimento_clona_tinta.sql`.

🛑 **Nome preso dall'OROLOGIO, non dal brief.** Il brief scrive `20260803140200`, anteriore
all'ultima migration applicata (`provato:` `SELECT version FROM
supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1` → **20260805174500**, prima
di questa migration). `date "+%Y%m%d%H%M%S"` → `20260805201640`, usato come nome del file.

`tinta_famiglia, tinta_codice` aggiunte all'elenco delle colonne **subito dopo** `colore_scala,
colore_codice` (stessa famiglia concettuale: il colore/tinta del caso), e
`v_lavoro.tinta_famiglia, v_lavoro.tinta_codice` aggiunte **nella stessa posizione relativa**
nell'elenco dei valori — verificato per indice a mano, non solo per conteggio, riga per riga sul
file scritto.

Il vincolo `lavori_tinta_tipo_ck` regge **per costruzione**: la riga sorgente (`v_lavoro`) è già in
banca dati, quindi rispettava già l'accoppiamento famiglia↔tipo; questa RPC copia
`tipo_dispositivo` e `tinta_famiglia`/`tinta_codice` dalla STESSA riga, quindi la coppia copiata
non può violare quel CHECK sulla riga nuova.

`COMMENT ON FUNCTION` aggiornato per menzionare la clonazione di `tinta_famiglia`/`tinta_codice`
(D42, Task 6) accanto agli altri clic già documentati.

**La prova che discrimina davvero** (non un grep di presenza, che non vede né un'omissione
appaiata né uno scambio fra due colonne dello stesso tipo — esattamente la classe di difetto che
questo task esiste per chiudere): `pg_get_functiondef` letto PRIMA della migration
(`scratchpad/funcdef_full.sql`) e DOPO (`scratchpad/funcdef_after.sql`), messi a `diff -u`:

```diff
@@ -39,6 +39,10 @@
     -- ⬇️ AGGIUNTA G1 — il default di caso dell'ondata (a). Senza queste due
     --    colonne il rifacimento per 'colore_sbagliato' nasceva senza colore.
     colore_scala, colore_codice,
+    -- ⬇️ AGGIUNTA D42/Task 6 — la tinta del manufatto (bite_splint/ortodonzia).
+    --    Stesso difetto di G1, gemello: senza queste due colonne il
+    --    rifacimento perdeva la tinta scelta sul lavoro originale.
+    tinta_famiglia, tinta_codice,
     -- ⬇️ AGGIUNTA G1 — coerenza con le righe clonate qui sotto.
     denti_mancanti, denti_impianti,
     classe_rischio, norma_riferimento,
@@ -57,6 +61,7 @@
     --    La rimozione è dell'ondata (c). Vedi il cappello di 20260728103000.
     v_lavoro.colore_dente, v_lavoro.denti_coinvolti, v_lavoro.arcata,
     v_lavoro.colore_scala, v_lavoro.colore_codice,
+    v_lavoro.tinta_famiglia, v_lavoro.tinta_codice,
     v_lavoro.denti_mancanti, v_lavoro.denti_impianti,
     v_lavoro.classe_rischio, v_lavoro.norma_riferimento,
     TRUE, FALSE,
```

**Zero altre righe toccate in tutto il corpo della funzione.** Questo esclude sia un'omissione
appaiata altrove (una riga tolta da entrambe le liste, che il conteggio non avrebbe rilevato) sia
uno scambio fra due colonne testo dello stesso tipo (che Postgres accetta senza errore): il diff
mostra ESATTAMENTE le due righe attese, nella stessa posizione relativa in entrambe le liste, e
niente altro. `obj_description` confermato separatamente uguale al testo atteso (non incluso in
`pg_get_functiondef`, letto a parte).

**Permessi**: ri-emessi `REVOKE`/`GRANT` sulla firma esatta (`uuid,text,text,numeric,text`), stessa
cautela già in uso in `20260728103000` — non dipendere dal fatto che `CREATE OR REPLACE` conservi
l'ACL. `provato:` prima della migration, `information_schema.routine_privileges` per questa
funzione dava solo `service_role` + `postgres` in EXECUTE, nessun `anon`/`authenticated` — stato
replicato identico dopo.

## 3. Passo 3 — La prova, su transazione annullata con SAVEPOINT

Comando eseguito (`node scripts/psql.mjs <file.sql>`), esito **reale, incollato per intero**:

```
[1] BEGIN — 0 righe toccate
[2] SAVEPOINT — 0 righe toccate
[3] UPDATE — 1 righe toccate
[4] SELECT — 1 righe
┌─────────┬────────────────────────────────────────┬──────────────────┬──────────┬────────────────┬───────────────┐
│ (index) │ id                                     │ tipo_dispositivo │ stato    │ tinta_famiglia │ tinta_codice  │
├─────────┼────────────────────────────────────────┼──────────────────┼──────────┼────────────────┼───────────────┤
│ 0       │ '7d5343a8-3364-4dd2-992f-c0510e8ea026' │ 'bite_splint'    │ 'pronto' │ 'sport'        │ 'rosso_scuro' │
└─────────┴────────────────────────────────────────┴──────────────────┴──────────┴────────────────┴───────────────┘
[5] SAVEPOINT — 0 righe toccate
[6] SELECT — 1 righe  (esito della RPC)
{ lavoro_nuovo_id: '1cc4dc64-cd1a-4306-b905-87e5505219a6', numero_lavoro: '2026/0021' }
[7] SELECT — 1 righe (il lavoro NUOVO, letto per join su lavori_rifacimenti)
┌─────────┬────────────────────────────────────────┬───────────────┬──────────────────┬────────────────┬───────────────┬────────────────────────────────────────┬─────────┐
│ (index) │ id                                     │ numero_lavoro │ tipo_dispositivo │ tinta_famiglia │ tinta_codice  │ lavoro_originale_id                    │ motivo  │
├─────────┼────────────────────────────────────────┼───────────────┼──────────────────┼────────────────┼───────────────┼────────────────────────────────────────┼─────────┤
│ 0       │ '1cc4dc64-cd1a-4306-b905-87e5505219a6' │ '2026/0021'   │ 'bite_splint'    │ 'sport'        │ 'rosso_scuro' │ '7d5343a8-3364-4dd2-992f-c0510e8ea026' │ 'altro' │
└─────────┴────────────────────────────────────────┴───────────────┴──────────────────┴────────────────┴───────────────┴────────────────────────────────────────┴─────────┘
[8] ROLLBACK — 0 righe toccate
[9] SELECT — 1 righe (il lavoro ORIGINALE, dopo ROLLBACK — deve essere tornato com'era)
┌─────────┬────────────────────────────────────────┬──────────────────┬────────────────┬──────────────┐
│ (index) │ id                                     │ tipo_dispositivo │ tinta_famiglia │ tinta_codice │
├─────────┼────────────────────────────────────────┼──────────────────┼────────────────┼──────────────┤
│ 0       │ '7d5343a8-3364-4dd2-992f-c0510e8ea026' │ 'protesi_fissa'  │ null           │ null         │
└─────────┴────────────────────────────────────────┴──────────────────┴────────────────┴──────────────┘
[10] SELECT — 1 righe
┌─────────┬───────────────────────────┐
│ (index) │ righe_rifacimento_rimaste │
├─────────┼───────────────────────────┤
│ 0       │ '0'                       │
└─────────┴───────────────────────────┘
```

**Esito atteso — verificato:** stessa famiglia (`sport`), stesso codice (`rosso_scuro`) sul lavoro
nuovo. **La prova non è a righe zero**: `[3] UPDATE — 1 righe toccate` sul setup, e il `SELECT [7]`
del lavoro nuovo torna esattamente 1 riga con la tinta copiata. Dopo `ROLLBACK`, il `[9]` conferma
che il lavoro originale è tornato `protesi_fissa`/senza tinta e `[10]` conferma zero righe di
rifacimento rimaste — la transazione è stata annullata per davvero, non solo dichiarata tale.

**Deviazione dal brief, con causa scritta:** il brief non specificava `motivo`/`rilevato_in` per la
chiamata di prova. Il primo tentativo con `motivo='test_task6_tinta'`, `rilevato_in='laboratorio'`
ha fallito con `23514 — new row … violates check constraint
"lavori_rifacimenti_motivo_check"` (il dominio ammesso è
`colore_sbagliato|misura_errata|fusione_difettosa|rottura_produzione|non_confortevole|
errore_prescrizione|altro`, e `rilevato_in` è
`produzione|prova_1|prova_2|prova_3|post_consegna`). Corretto in `'altro'` / `'produzione'` — non
un difetto del piano, un dettaglio non specificato che ho verificato sul vincolo vivo
(`pg_get_constraintdef` su `lavori_rifacimenti`) prima di rilanciare.

## 4. Applicazione

`npx supabase db push` → `{"upToDate":false,"dryRun":false,"migrations":
["20260805201640_rifacimento_clona_tinta.sql"],...}`.

`provato:` `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 3`
→ `20260805201640` in testa. `provato:` `prosrc ILIKE '%tinta_famiglia%'` e `%tinta_codice%` sulla
funzione viva dopo l'applicazione → **entrambi `true`**.

## 5. FASE 6b

```
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts.new
```
Exit 0, nessun messaggio CLI residuo in fondo al file (controllato). `diff
src/types/database.types.ts src/types/database.types.ts.new` → **nessuna differenza**: atteso,
perché questo task cambia solo il corpo di una funzione, non lo schema delle tabelle. File `.new`
rimosso, `database.types.ts` non toccato.

```
npx tsc --noEmit
```
Exit 0, **0 righe di output**.

## 6. `npm run verify:full` — uscita reale, senza pipe

```
npm run verify:full > log 2>&1; echo $?
```
→ **`EXIT_CODE: 0`**.

Dettaglio dalle sezioni del log:
- `tsc --noEmit && eslint src --max-warnings 0` → nessun errore/warning stampato (silenzioso =
  verde per entrambi gli strumenti).
- `vitest run` → **`Test Files 421 passed | 3 skipped (424)`**, **`Tests 5012 passed | 19 skipped
  (5031)`** — combacia esattamente col riferimento di rete dato nel brief («5012 passate | 19
  saltate su 421 file»).
- `next build` → `✓ Compiled successfully`, tutte le route generate, incluse le route API.
- `npm run guardie` (le sei guardie pre-commit) → tutte e sei ✅: DS compliance, CSRF, reduced-motion,
  coerenza documenti, salvataggio automatico, progetti Playwright.
- `grep -in "error|warning"` sul log intero (escludendo l'avviso noto e preesistente su
  `middleware`→`proxy`) → **zero righe**.

## 7. Difetti del piano trovati (dentro il mio mandato)

Nessuno nel testo del brief stesso: i quattro punti «Contesto che il brief non può sapere» erano
tutti verificati e veri (ponte SQL, nome-da-orologio, SAVEPOINT, `UPDATE…LIMIT 1`), e i dati
dichiarati (34 righe catalogo, 0 lavori con tinta, `bite_splint` assente) sono risultati esatti
alla lettura diretta. L'unica imprecisione era la mia, non del brief: i valori di prova per
`motivo`/`rilevato_in` andavano scelti dal dominio vivo, non inventati — corretto al primo errore,
vedi §3.

## 8. Ritrovamenti FUORI mandato (riferiti, NON corretti — R-E2)

1. **§0 sopra, ripetuto qui per il formato standard**: collisione di percorso fra D42 e
   `ondata-b-sessione-3` su TUTTO `.superpowers/sdd/*.md` (non solo `task-6-report.md`) — la
   sessione-3 non è mai stata archiviata in `archivio-ondate-precedenti/` prima che D42 iniziasse a
   scrivere in questa cartella. Copia di sicurezza del contenuto originale di `task-6-report.md`
   fatta fuori repo, **non durevole oltre questa sessione dell'agente** — vedi §0 per il percorso.
2. **BP-1 non eseguito qui.** Come per altri task di questa ondata, l'aggiornamento di
   `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md` è compito della chiusura di sessione o
   del coordinatore che ha visione di tutta l'ondata D42 — non eseguito da questo singolo task per
   non scrivere una riga di memoria parziale/prematura su un'ondata da 9 task di cui questo è solo
   il sesto.

---

## Stato finale

- `crea_rifacimento_atomico` clona `tinta_famiglia`/`tinta_codice` insieme a tutto il resto —
  provato su transazione annullata con dati reali, non solo per compilazione.
- Migration `20260805201640_rifacimento_clona_tinta.sql` applicata al DB vivo (ledger verificato).
- Tipi TypeScript invariati (atteso), `tsc` pulito, `verify:full` verde 0 con i numeri esatti di
  riferimento (5012 | 19 su 421 file).
- Nessun difetto nel brief stesso; un problema di igiene documentale fuori mandato riferito in §0/§8,
  con copia di sicurezza NON durevole del file collisivo.

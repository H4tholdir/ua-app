# Resoconto — Task 1 del piano «L'avviso al dentista»

**Data:** 09/08/2026 · **Ramo:** `intervento-post-consegna` · **Esecutore:** Task 1, perimetro chiuso.
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`, righe 79-190.

| cosa | esito |
|---|---|
| Difetti del piano trovati | **7** — 6 dal brief (①-⑥) + 1 non previsto da nessuno |
| Timestamp migration | `20260809123206` (pavimento `20260808195344` verificato) |
| Prove d'integrazione nuove | **23 passate su 23**, zero saltate |
| Forza delle prove (R-P4) | **9 su 22** si accendono contro la SQL del piano scritta com'è |
| `tsc --noEmit` | `TSC_EXIT=0` |
| Suite completa | **5832 passate su 5832**, 459 file, zero saltate |
| Righe lasciate nel banco | **0** (tutto in transazione annullata) |

---

## 1. I difetti del piano — prima del lavoro fatto

### ① 🔴 CONFERMATO — la prova elencata e mai eseguita

Il Task 1 mette `tests/integration/avvisi-dentista-schema.rpc.test.ts` fra i file da creare
(riga 84) e **nessuno dei Passi 1-6 la lancia**. Il Passo 4 lancia una sonda `psql.mjs` a mano, il
Passo 5 fa `gen types` + `tsc`, il Passo 6 salva. La prova non compare mai.

**Non è solo un passo dimenticato: è la differenza fra una misura e un'affermazione.** Le nove
verifiche a mano del Task 1 dell'ondata precedente sono già state rifatte in suite proprio per
questo motivo (v. l'intestazione di `tests/integration/eventi-qualita-schema.rpc.test.ts`).

Lanciata con l'ambiente caricato, come chiede il brief:

```
$ set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-dentista-schema.rpc.test.ts

 Test Files  1 passed (1)
      Tests  23 passed (23)
   Duration  14.49s
```

**23 passate su 23, zero `skipped`.**

📌 **E in CI girano davvero**, verificato: `.github/workflows/ci.yml:42` passa
`SUPABASE_DB_URL` allo step «Unit tests» (⚖️ D333, 09/08/2026). Quindi **non serve un gemello
statico** in `tests/unit/` come per `eventi-qualita`: là il gemello esisteva perché in CI
l'integrazione si saltava. Oggi non si salta più.

---

### ② 🔴 CONFERMATO E CORRETTO — `auth.users(id)` era la presunzione, ed era sbagliata

Il piano scriveva `comunicato_da uuid REFERENCES auth.users(id)` senza alcun `provato:`.
Interrogato il catalogo vivo su **ogni** colonna «chi ha fatto l'azione»:

```
$ node scripts/psql.mjs -c "SELECT c.conrelid::regclass, a.attname, c.confrelid::regclass … WHERE c.contype='f' …"

┌──────────────────────────────┬───────────────────┬──────────────┐
│ tabella                      │ colonna           │ punta_a      │
├──────────────────────────────┼───────────────────┼──────────────┤
│ 'inviti'                     │ 'created_by'      │ 'auth.users' │
│ 'cicli_produzione'           │ 'created_by'      │ 'utenti'     │
│ 'cicli_produzione'           │ 'updated_by'      │ 'utenti'     │
│ 'credito_clienti_movimenti'  │ 'registrato_da'   │ 'utenti'     │
│ 'data_processing_agreements' │ 'emesso_da'       │ 'utenti'     │
│ 'dichiarazioni_conformita'   │ 'generated_by'    │ 'utenti'     │
│ 'eventi_qualita'             │ 'created_by'      │ 'utenti'     │
│ 'fascicoli_tecnici'          │ 'approvato_da'    │ 'utenti'     │
│ 'fasi_produzione'            │ 'updated_by'      │ 'utenti'     │
│ 'inviti_rete'                │ 'invitato_da'     │ 'utenti'     │
│ 'lavori'                     │ 'segnalazione_by' │ 'utenti'     │
│ 'lavori_prescrizioni'        │ 'confermata_da'   │ 'utenti'     │
│ 'lavori_rifacimenti'         │ 'created_by'      │ 'utenti'     │
│ 'lavoro_prove'               │ 'created_by'      │ 'utenti'     │
│ 'pagamenti'                  │ 'annullato_da'    │ 'utenti'     │
│ 'pagamenti'                  │ 'registrato_da'   │ 'utenti'     │
│ 'risk_analyses'              │ 'approvato_da'    │ 'utenti'     │
│ 'valutazioni_evento'         │ 'classificato_da' │ 'utenti'     │
└──────────────────────────────┴───────────────────┴──────────────┘
```

**17 su 18 puntano a `public.utenti(id)`.** L'unica eccezione, `inviti.created_by`, è una tabella
**pre-account**: là l'utente non esiste ancora, quindi non è un precedente, è un caso diverso.
Le sorelle più vicine per ruolo — `dichiarazioni_conformita.generated_by` (autore di un documento a
valore di prova) e `valutazioni_evento.classificato_da` — puntano entrambe a `utenti`.

🔑 **Ma il motivo portante non è la coerenza, è funzionale.** ⚖️ **D335** chiede di registrare
**chi**, e la scheda del dentista (Task 9) deve mostrarne il **nome**. Lo schema `auth` **non è
esposto da PostgREST**: con una chiave verso `auth.users` quella colonna sarebbe un uuid e nulla
più, e il nome dell'autore non si potrebbe incorporare in una lettura. Con la correzione, i tipi
generati portano la relazione utile (`src/types/database.types.ts:218-222`):

```ts
foreignKeyName: "avvisi_dentista_comunicato_da_fkey"
columns: ["comunicato_da"]
referencedRelation: "utenti"
```

I due valori sono la stessa chiave — `public.utenti.id` è `FOREIGN KEY (id) REFERENCES
auth.users(id) ON DELETE CASCADE`, e le 7 righe su 7 coincidono — ma `utenti` è **leggibile** e
**più stretta** (impone che l'autore sia un utente di laboratorio, non un qualunque account).

**E NON `ON DELETE SET NULL`**, benché due sorelle lo usino: l'azione referenziale è un `UPDATE`,
che **rivaluta** `avviso_comunicato_ha_autore_e_data` — il quale pretende l'autore quando lo stato è
chiuso. Con `SET NULL` la cancellazione di un utente morirebbe con un `23514` incomprensibile invece
del `23503` giusto. Scelto **NO ACTION**, come `dichiarazioni_conformita.generated_by`. Provato:

```
✓ cancellare l'autore di un avviso chiuso è BLOCCATO, non azzerato
  → 23503 su avvisi_dentista_comunicato_da_fkey
```

---

### ③ 🔴 CONFERMATO — il Passo 4 provava il caso sbagliato, ed erano **entrambe** le direzioni a mancare

Il rischio che il piano si autodenuncia (autorevisione ③) è che i vincoli rendano impossibile uno
stato **legittimo**. Il Passo 4 provava solo il rifiuto. Ora ci sono tutte due.

**Direzione «accettazione» — i tre inserimenti che DEVONO riuscire, con id veri presi dal banco:**

```
✓ ① «da_comunicare» nasce senza autore e senza data
✓ ② «comunicato_dall_app» con autore, data e testo inviato
✓ ③ «comunicato_a_voce» con autore e data, e SENZA testo (D335)
✓ e il valore di default è «da_comunicare»: l'avviso nasce aperto
```

**Tutti e tre passano: i tre `CHECK` eseguiti insieme non rendono impossibile nessuno stato
legittimo.** Il rischio dichiarato dal piano era reale come dubbio, infondato come difetto — ma
**questa è la prima volta che qualcuno l'ha misurato**, ed è il punto: prima era una speranza.

**Direzione «rifiuto»:**

```
✓ uno stato fuori vocabolario è rifiutato — con gli altri due CHECK SODDISFATTI
✓ «da_comunicare» con una data di comunicazione è rifiutato
✓ un avviso comunicato SENZA autore è rifiutato (D335: chi e quando)
✓ «comunicato_dall_app» senza il testo mandato è rifiutato
```

---

### ⑦ 🔴 IL DIFETTO CHE NON ERA NELL'ELENCO — la sonda del piano nomina il vincolo SBAGLIATO

**Non è nei sei punti del brief, né nell'autorevisione del piano.** È uscito perché la prova è stata
scritta prima del codice e ha fallito dove non doveva.

Il Passo 4 del piano (riga 172) sonda `stato = 'pippo'` lasciando **data e autore a `NULL`**, e il
brief dichiara come atteso «`23514` su `avviso_stato_vocabolario`». Eseguita **verbatim** contro la
SQL del piano:

```
$ node scripts/psql.mjs -c "BEGIN; INSERT INTO public.avvisi_dentista (…, stato) VALUES (…, 'pippo'); ROLLBACK;"

❌ 23514 new row for relation "avvisi_dentista" violates check constraint
   "avviso_comunicato_ha_autore_e_data"
```

🔑 **Il meccanismo:** con `stato='pippo'` e `comunicato_at IS NULL`, è violato **anche** il secondo
`CHECK` — il suo secondo ramo pretende la data quando lo stato non è `da_comunicare`. Due vincoli
violati insieme, e Postgres riporta quello che valuta per primo.

🛑 **La conseguenza è che l'unica prova R-P1 del Task 1 sarebbe passata** — il `23514` arriva, la
casella si spunta — **senza provare nulla sul vocabolario**. Un `CHECK` sui tre stati che non
esistesse affatto avrebbe superato quella sonda identicamente. È il modo esatto in cui una prova
diventa un rituale: guarda il codice d'errore e non il nome.

**Corretto isolando:** la prova valorizza data e autore (veri), così resta un solo vincolo che può
fallire, e una **sentinella** separata fissa la sovrapposizione misurata, perché se un giorno i due
`CHECK` venissero ridisegnati si sappia subito che è cambiata.

---

### ④ 🟠 CONFERMATO — deciso: **si stringe**, non si rinomina

Il `CHECK` del piano era `(stato <> 'comunicato_dall_app' OR testo_inviato IS NOT NULL)`: **impone**
il testo quando l'avviso parte dall'app, ma **non lo vieta** altrove — mentre il suo nome
(«testo solo se dall'app») promette il divieto.

**Deciso: stringere.** Il motivo non è il nome, è ⚖️ **D339** — «si registra solo il testo mandato;
la bozza proposta **non** si conserva». Con la formulazione del piano passavano **due** righe che
D339 vieta: un `comunicato_a_voce` con dentro un testo, e **una bozza salvata su
`da_comunicare`**. Cioè la tabella che dovrebbe impedire la conservazione della bozza la permetteva.
Rinominare avrebbe reso onesto il nome e lasciato aperto il buco.

Forma applicata:

```sql
CONSTRAINT avviso_testo_solo_se_dall_app
  CHECK (
    (stato =  'comunicato_dall_app' AND testo_inviato IS NOT NULL)
    OR (stato <> 'comunicato_dall_app' AND testo_inviato IS NULL)
  )
```

Verificata contro tutti e tre gli stati legittimi (passano) e contro i due casi vietati:

```
✓ ④ «comunicato_a_voce» CON un testo inviato è rifiutato — D339
✓ ④ e nemmeno una BOZZA su «da_comunicare» si conserva (D339)
```

Tabella a zero righe, nessuna migrazione di dati: si disfa con un `DROP TABLE`. Non è stato chiesto
a Francesco, come il brief autorizza.

---

### ⑤ 🔴 PEGGIO DI «NON PROVATO» — l'affermazione della riga 148 è **FALSA**

Il brief offriva due strade: provarla con `SET LOCAL ROLE authenticated`, o marcarla `non provato`.
**Nessuna delle due era giusta, perché l'affermazione non regge.** Due fatti misurati:

```
$ node scripts/psql.mjs -c "SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN (…)"

┌─────────────────┬──────────────┐
│ rolname         │ rolbypassrls │
├─────────────────┼──────────────┤
│ 'postgres'      │ true         │
│ 'authenticated' │ false        │
│ 'anon'          │ false        │
│ 'service_role'  │ true         │   ← 🔴
└─────────────────┴──────────────┘
```

① **`service_role` aggira la RLS.** È il ruolo che il server usa davvero. «Nessuna politica di
`INSERT`» **non lo tocca affatto**: la protezione che il piano descriveva non esisteva per l'unico
chiamante che conta.

② **E i privilegi di default di questo progetto sono `arwdDxtm` — ALL, TRUNCATE compreso:**

```
$ node scripts/psql.mjs -c "SELECT defaclrole::regrole, defaclnamespace::regnamespace, defaclacl FROM pg_default_acl"

'postgres' │ 'public' │ 'r' │ '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,
                              authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}'
```

Ogni tabella **nuova** di `public` nasce con `INSERT`, `UPDATE`, `DELETE` e **`TRUNCATE`** concessi a
`anon`, `authenticated`, `service_role`. E **`TRUNCATE` ignora la RLS**: chiunque poteva svuotare gli
avvisi di **tutti i laboratori insieme**. È **lo stesso difetto già pagato** su `valutazioni_evento`
(D274 ②, migration `20260806170700`) — la tabella nuova lo reintroduceva intatto, perché la SQL del
piano **non ha un solo `REVOKE`**.

**Aggiunte le due righe che mancavano**, nella forma già in casa:

```sql
REVOKE ALL ON public.avvisi_dentista FROM anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.avvisi_dentista TO anon, authenticated, service_role;
```

🔑 **È il `REVOKE`, non la RLS, che rende vera la frase del piano.** Provato in tutte tre le
direzioni:

```
✓ (p1) come `authenticated` l'INSERT è rifiutato: nessuna politica di INSERT
✓ (p2) il CATALOGO: i tre ruoli hanno SELECT e UPDATE, mai INSERT/DELETE/TRUNCATE
✓ (p3) e nemmeno `service_role` — che AGGIRA la RLS — riesce a inserire
✓ (p4) TRUNCATE è rifiutato ai tre ruoli — e TRUNCATE ignora la RLS
✓ (p5) la lettura resta isolata per laboratorio: la politica usa public.current_lab_id()
✓ (p6) la RLS è ACCESA: senza, le politiche sarebbero decorative
```

---

### ⑧ 🔴 SECONDO DIFETTO FUORI ELENCO — `ON DELETE RESTRICT` rompeva la cancellazione di un laboratorio

Il piano metteva `ON DELETE RESTRICT` su `cliente_id` e `dichiarazione_id`.
`admin_delete_laboratorio` cancella le tabelle **a mano**, e `avvisi_dentista` **non è nel suo
elenco**. L'ordine misurato dal catalogo cancella `dichiarazioni_conformita` (8ª), `lavori` (11ª) e
`clienti` (19ª) **prima** di arrivare al laboratorio: con `RESTRICT`, un laboratorio con **un solo
avviso** non si sarebbe più potuto cancellare (`23503`).

**È la quarta volta in questa famiglia** — cassette, denti, eventi (D274 ①), ora avvisi.

**Corretto a `ON DELETE CASCADE` su entrambe**, che è dentro il mio mandato (sono le chiavi della
mia tabella). `RESTRICT` non comprava niente: la riga muore comunque col lavoro, che è già `CASCADE`.
E un avviso su una dichiarazione che non esiste più non è prova di niente. Provato:

```
✓ cancellare un laboratorio che ha un avviso arriva in fondo (famiglia D274 ①)
```

🛑 **Ciò che NON ho corretto, e va al Task 2:** `admin_delete_laboratorio` resta **muto** su questa
tabella — il conteggio che restituisce non la nomina. La funzione sopravvive solo perché tutte e
quattro le chiavi sono `CASCADE`. **Se un domani si aggiunge a questa tabella una chiave esterna
`RESTRICT` o `NO ACTION`, si rompe di nuovo.** L'asserzione che lo fissa è nella prova
(`expect(esito.r.deleted).not.toHaveProperty('avvisi_dentista')`), così il giorno in cui qualcuno
la aggiungerà all'elenco la prova lo dirà invece di restare verde per il motivo sbagliato.

---

### ⑥ 🟠 LA FASE 3, tutte e cinque le caselle

| casella | risposta |
|---|---|
| **Tenant isolation** — tocca RLS o `current_lab_id()`? | **Sì.** Due politiche, entrambe su `laboratorio_id = public.current_lab_id()` (schema `public`, non `auth`). Rilette dal catalogo sotto. 🔑 Ma l'isolamento **vero** lo dà il `REVOKE`, non la RLS: `service_role` ha `BYPASSRLS`. |
| **Schema drift** — serve migration? `gen types` va rieseguito? | **Sì e sì.** `20260809123206_avvisi_dentista.sql`, applicata; `gen types` rieseguito, `tsc --noEmit` → `0`. |
| **API contract** — il payload rompe client esistenti? | **No.** Tabella nuova, zero righe, nessuna rotta la legge ancora (`src/lib/avvisi/` conteneva solo `stati.ts`, creato ora). Nessun nome tolto da un'allowlist. |
| **Rollback** — come si annulla se va in prod e fallisce? | `DROP TABLE public.avvisi_dentista;` — una riga, e basta. Niente dipende ancora da lei: nessuna funzione la nomina (la RPC la guadagnerà nel Task 2), nessuna vista, nessuna rotta. ⚖️ **D338 «si parte da zero»** significa che **non c'è backfill da disfare**: zero righe da riconvertire, nessuno stato pregresso. Le due politiche e i due indici cadono col `DROP`. Provato in pratica: l'abbozzo inerte è stato creato e lasciato cadere con `DROP TABLE IF EXISTS`, e `to_regclass` è tornato `null`. |
| **Dominio critico?** | **Sì — RLS + migration.** Percorso GRANDE, come applicato: FASE 3 scritta, TDD con prova prima del codice, FASE 6b eseguita, catalogo riletto. |

**E il catalogo riletto, perché `db push` che esce 0 non prova che i vincoli esistano** —
`CREATE TABLE IF NOT EXISTS` riesce anche sopra uno stato applicato a metà:

```
$ node scripts/psql.mjs -c "SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.avvisi_dentista'::regclass"

'avviso_comunicato_ha_autore_e_data'    'c'  CHECK ((((stato = 'da_comunicare') AND (comunicato_at IS NULL) AND (comunicato_da IS NULL))
                                                OR ((stato <> 'da_comunicare') AND (comunicato_at IS NOT NULL) AND (comunicato_da IS NOT NULL))))
'avviso_stato_vocabolario'              'c'  CHECK ((stato = ANY (ARRAY['da_comunicare','comunicato_dall_app','comunicato_a_voce'])))
'avviso_testo_solo_se_dall_app'         'c'  CHECK ((((stato = 'comunicato_dall_app') AND (testo_inviato IS NOT NULL))
                                                OR ((stato <> 'comunicato_dall_app') AND (testo_inviato IS NULL))))
'avvisi_dentista_cliente_id_fkey'       'f'  FOREIGN KEY (cliente_id) REFERENCES clienti(id) ON DELETE CASCADE
'avvisi_dentista_comunicato_da_fkey'    'f'  FOREIGN KEY (comunicato_da) REFERENCES utenti(id)
'avvisi_dentista_dichiarazione_id_fkey' 'f'  FOREIGN KEY (dichiarazione_id) REFERENCES dichiarazioni_conformita(id) ON DELETE CASCADE
'avvisi_dentista_laboratorio_id_fkey'   'f'  FOREIGN KEY (laboratorio_id) REFERENCES laboratori(id) ON DELETE CASCADE
'avvisi_dentista_lavoro_id_fkey'        'f'  FOREIGN KEY (lavoro_id) REFERENCES lavori(id) ON DELETE CASCADE
'avvisi_dentista_pkey'                  'p'  PRIMARY KEY (id)
```

**I tre `CHECK` ci sono, e il terzo è nella forma stretta.** I due indici:

```
'idx_avvisi_da_comunicare'  CREATE INDEX … (laboratorio_id, created_at DESC) WHERE (stato = 'da_comunicare'::text)
'idx_avvisi_per_cliente'    CREATE INDEX … (cliente_id, created_at DESC)
```

Le due politiche, e il permesso — che è **l'unica cosa che prova che `REVOKE`/`GRANT` siano
atterrati**:

```
'avvisi_lettura_lab'    'SELECT'  qual: (laboratorio_id = current_lab_id())   with_check: null
'avvisi_scrittura_lab'  'UPDATE'  qual: (laboratorio_id = current_lab_id())   with_check: (laboratorio_id = current_lab_id())

rls_accesa: true
permessi:   {postgres=arwdDxtm/postgres, anon=rw/postgres, authenticated=rw/postgres, service_role=rw/postgres}
```

`rw` = `SELECT` + `UPDATE`. **Nessun `a` (INSERT), nessun `d` (DELETE), nessun `D` (TRUNCATE).**

---

## 2. I due numeri che non ho ricopiato

**L'orologio**, in un comando separato:

```
$ date -u "+%Y%m%d%H%M%S"
20260809123206
```

**Pavimento verificato da me**, non ricopiato:

```
$ ls supabase/migrations | tail -5
20260808112700_atto_unico_coppia_indivisibile.sql
20260808142358_atto_unico_senza_numero_prescrizione.sql
20260808154033_atto_unico_snapshot_paziente_fuori.sql
20260808195344_lavori_gettone_solo_se_cambia.sql
MANUAL_000_auth_helpers.sql
```

`20260809123206` > `20260808195344` ✅ — nessun motivo di fermarsi.

**La base delle prove.** Il piano dichiara `5725 | 84 su 458`, oppure `5809/5809 su 458` con
l'integrazione accesa. **Misurato oggi, con l'ambiente caricato:**

```
$ set -a && . ./.env.local; set +a && npx vitest run
 Test Files  459 passed (459)
      Tests  5832 passed (5832)
```

**Zero saltate.** E il conto torna esattamente: `5809 + 23 = 5832`, `458 + 1 = 459` — le 23 prove
nuove e il file nuovo sono l'intera differenza. Nessuna prova preesistente è stata toccata.

**FASE 6b:**

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
exit=0   (nessun messaggio del CLI in fondo al file: termina con `} as const`)
$ npx tsc --noEmit
TSC_EXIT=0
```

---

## 3. TDD e R-P4 — il numero che misura la forza delle prove

**Primo rosso**, prova scritta prima di qualunque SQL:

```
 Test Files  1 failed (1)
      Tests  21 failed | 1 passed (22)
```

L'unica passata è la dichiarazione misurata sul ruolo della connessione, che non dipende dalla
tabella — cioè si comporta come deve.

**Abbozzo inerte (R-P4).** Invece di un abbozzo vuoto ho applicato **la SQL del piano esattamente
come scritta** (righe 100-146), perché è la misura utile per questo mandato: quante delle mie
asserzioni **catturano i difetti del piano**. Applicata con `scripts/psql.mjs` — che **non** registra
nel ledger — e lasciata cadere subito dopo. Non è mai stata una migration.

```
 Tests  9 failed | 13 passed (22)
```

**→ 9 su 22 si accendono contro la versione del piano.** Le nove sono: il vocabolario nominato male
(⑦), i due divieti di D339 (④), la chiave verso `utenti` e il blocco sulla cancellazione
dell'autore (②), i tre permessi `(p2) (p3) (p4)` (⑤), e la cancellazione del laboratorio (⑧).
**Le tredici che passavano già sono altrettanto informative:** dicono che le tre accettazioni
legittime funzionavano anche col piano, cioè che il rischio dell'autorevisione ③ era infondato.

**Verde finale: 23 su 23.**

**Forme d'input enumerate** (R-P4 chiede le forme prima delle asserzioni):
valore fuori vocabolario ✅ · stato aperto con data ✅ · stato chiuso senza autore ✅ · stato chiuso
senza testo ✅ · stato a voce **con** testo ✅ · bozza su stato aperto ✅ · autore inesistente
(`23503`) ✅ · autore cancellato ✅ · default omesso ✅ · `campi_corretti` vuoto e pieno ✅ ·
INSERT dai tre ruoli ✅ · TRUNCATE dai tre ruoli ✅.
**Non coperte, col perché:** `UPDATE` cross-tenant tramite la politica di scrittura — **serve una
sessione con un JWT vero** perché `public.current_lab_id()` legge il token, e con
`SET LOCAL ROLE` non c'è claim; va col Task 4, che è il primo a fare `UPDATE` dall'applicazione.
`visto_dal_dentista_at` non ha vincoli propri: nulla da provare finché il Task 8 non lo scrive.

---

## 4. Ciò che resta `non provato`, e il motivo

| affermazione | perché non è provata |
|---|---|
| La politica `avvisi_scrittura_lab` **impedisce** a un laboratorio di chiudere l'avviso di un altro | Provata la **presenza e la forma** dal catalogo (`qual` e `with_check` usano `public.current_lab_id()`), **non il comportamento**: `current_lab_id()` legge il JWT, e né la connessione proprietaria né `SET LOCAL ROLE` ne hanno uno. Serve una sessione autenticata vera → **Task 4**. Fail-closed: non la dichiaro provata. |
| L'avviso nasce **solo** dentro `correggi_e_riemetti_atomica` | Provato il **contrario in negativo** (nessun ruolo dell'app può inserire: `p1`/`p2`/`p3`). Che la RPC **riesca** a inserirlo non è provato: la RPC non scrive ancora in questa tabella → **Task 2**. |
| `campi_corretti` contiene solo voci di `CAMPI_CORREGGIBILI_DOCUMENTO` | **Nessun vincolo lo impone**, e non l'ho aggiunto: la colonna è `text[]` libera. Il piano non lo chiede e la fonte è applicativa. 🟠 **Segnalato come scelta aperta al Task 2**, che è chi la riempie. |

---

## 5. I ritrovamenti fuori mandato (R-E2) — riferiti, non corretti

1. 🔴 **`admin_delete_laboratorio` non nomina `avvisi_dentista`.** Sopravvive solo grazie al
   `CASCADE` su tutte e quattro le chiavi, e il conteggio che restituisce è muto su quelle righe.
   Quarta occorrenza della famiglia D274 ①. **Non toccata** (è una funzione di un altro perimetro).
   Chi tocca questa tabella in futuro deve sapere che **una chiave `RESTRICT` la romperebbe di
   nuovo**. Destinatario naturale: chi apre il Task 2.

2. 🟠 **La sonda del Passo 4 del Task 2 e seguenti eredita lo stesso vizio di ⑦.** Ogni sonda che
   guarda il **codice** `23514` e non il **nome** del vincolo può passare per il motivo sbagliato
   quando più `CHECK` si sovrappongono. Vale per tutti i task che istituiscono vincoli.

3. 🟠 **Il piano dichiara la base prove `5725 | 84 su 458` come alternativa a `5809/5809`.** La prima
   forma (84 saltate) **non è più raggiungibile in CI**: `.github/workflows/ci.yml:42` passa
   `SUPABASE_DB_URL` dal 09/08 (D333). La riga 27 del piano andrebbe semplificata, o qualcuno
   confronterà col numero sbagliato.

4. 🟠 **`inviti.created_by → auth.users(id)` è l'unica colonna d'autore fuori convenzione** su 18.
   Per una tabella pre-account è difendibile, ma è anche il precedente che ha probabilmente fatto
   scrivere `auth.users` nel piano. Non è un difetto da correggere: è una nota per chi cerca
   precedenti «per nome» invece che «per comportamento» (R-P3).

5. 🟢 **Nota utile, non un difetto:** `dichiarazioni_conformita.classe_rischio` accetta
   `classe_i | classe_iia | classe_iib | classe_iii`, **non** `IIa`. Chi scrive fixture di
   dichiarazioni nei Task 2-10 ci sbatterà come me.

---

## 6. Il salvataggio

`git status --short` guardato prima di salvare — l'albero è condiviso. I file miei, e solo quelli:

```
supabase/migrations/20260809123206_avvisi_dentista.sql
src/lib/avvisi/stati.ts
tests/integration/avvisi-dentista-schema.rpc.test.ts
src/types/database.types.ts
.superpowers/sdd/avviso-dentista-task-1-report.md
```

Aggiunti a percorso, mai `git add -A` (⚖️ D318). Nessun `git push`, `main` non toccata, nessun
worktree.

**Commit:** vedi la coda di questo file dopo il salvataggio.

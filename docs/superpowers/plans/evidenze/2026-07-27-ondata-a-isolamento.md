# Ondata (a) — le prove che nessun test unitario può dare

**Task 13** del piano `docs/superpowers/plans/2026-07-27-wizard-ondata-a-dato-e-api.md`.
**Eseguite il 28/07/2026** sul database vero del progetto `iagibumwjstnveqpjbwq`, ramo `ondata-a-denti-colore`.

**Perché questo documento esiste.** I rischi **R4** (un laboratorio vede o tocca i denti di un altro)
e **R5** (il laboratorio diventa incancellabile) non sono falsificabili da un test unitario: un finto
database risponde quello che gli si insegna a rispondere. Si provano sul database vero, con
richieste ostili.

**Regola di lettura.** Qui sotto c'è **l'output reale copiato**, mai una parafrasi e mai un
«atteso: …» spacciato per risultato. Dove una prova ha un **controllo positivo**, il controllo fa
parte della prova: un «permission denied» da solo è indistinguibile da «non funziona niente», e
«zero righe» da solo è indistinguibile da «la tabella è vuota». È il contrasto che prova qualcosa.

**Stato del database.** Tutte e sei le prove sono state eseguite **in transazione annullata**
(`BEGIN … ROLLBACK`), tranne le prove (3) e (4), che devono attraversare più connessioni (PostgREST
e il processo del server Next) e quindi scrivono davvero: quelle righe sono state annotate mentre
venivano create e rimosse subito dopo. **Conteggio finale letto: 294 `lavori`, 0 `lavori_denti`** —
identico alla baseline. Il dettaglio è in fondo.

**Gli attrezzi.** Quattro script usa e getta, **non committati** — `scripts/tmp/` è ignorato da git
(`.gitignore:126`), come vuole la regola sugli spike: si buttano, non si mantengono. I nomi servono
solo a dire da quale attrezzo viene ogni blocco di output qui sotto:
`scripts/tmp/prove-isolamento.mjs` (prove 1, 2, 3-bis, 5) ·
`scripts/tmp/prove-strutturale.mjs` (prova 6) ·
`scripts/tmp/prova-rls-postgrest.mjs` (prova 3) ·
`scripts/tmp/prova-put-cross-tenant.mjs` (prova 4).
**Quello che serve conservare è l'output, ed è tutto qui dentro.**

---

## Esito in una riga

| # | Prova | Esito |
|---|-------|-------|
| 1 | Il `service_role` non può scrivere a mano su `lavori_denti` | ✅ eseguita — passata |
| 2 | La RPC col laboratorio sbagliato non scrive niente | ✅ eseguita — passata |
| 3 | La RLS filtra in lettura, con un JWT vero su PostgREST | ✅ eseguita — passata |
| 4 | `PUT /api/lavori/<lavoro-di-un-altro>/denti` risponde 404, non 403 | ✅ eseguita — passata |
| 5 | Il laboratorio con denti resta cancellabile | ✅ eseguita — passata |
| 6 | L'asserzione strutturale su `admin_delete_laboratorio` | ⚠️ **eseguita — FALLITA**, e l'asserzione stessa è difettosa |

**R4 è provato.** **R5 è provato per la parte che riguarda `lavori_denti`, e la prova (6) ha
scoperto lo stesso rischio su sei ALTRE tabelle** — latente oggi solo perché quelle tabelle sono
vuote. Dettaglio nella prova (6).

---

## Le due chiavi di lettura del progetto, provate per prime

`lavori_denti` è in `REVOKE ALL`, **`service_role` compreso**
(`supabase/migrations/20260727120100_lavori_denti_tabella.sql`, nota E8). Le uniche due penne sono
`lavoro_crea_atomico` e `lavoro_denti_sostituisci_atomica`, che sono `SECURITY DEFINER`. Le fixture
di questo documento passano tutte da lì: **nessun `INSERT INTO lavori_denti` diretto compare in
nessuno degli attrezzi**, perché non funzionerebbe — ed è la prova (1).

Il ruolo da cui si è lavorato, letto e non assunto:

```
--- chi sono ora
[
  {
    "current_user": "service_role",
    "session_user": "postgres"
  }
]
```

`postgres` è membro di `service_role`, `authenticated` e `anon` (`pg_has_role` → `true` per tutti e
tre): è questo che rende possibile impersonare i ruoli veri senza un JWT, dove serve.

---

## Prova (1) — il `service_role` non può scrivere a mano

**Comando** (`scripts/tmp/prove-isolamento.mjs`, dentro `BEGIN … ROLLBACK`, ogni tentativo dentro il
suo `SAVEPOINT`):

```sql
SET LOCAL ROLE service_role; DELETE FROM lavori_denti WHERE laboratorio_id = '971061a1-…';
SET LOCAL ROLE service_role; INSERT INTO lavori_denti (laboratorio_id, lavoro_id, fdi) VALUES ('971061a1-…', '<lavoro-di-A>', 33);
SET LOCAL ROLE service_role; UPDATE lavori_denti SET ruolo='impianto' WHERE laboratorio_id = '971061a1-…';
SET LOCAL ROLE authenticated;  DELETE FROM lavori_denti WHERE laboratorio_id = '971061a1-…';
```

**Output reale:**

```
--- (1a) service_role → DELETE diretto su lavori_denti
SQLSTATE 42501: permission denied for table lavori_denti

--- (1b) service_role → INSERT diretto su lavori_denti
SQLSTATE 42501: permission denied for table lavori_denti

--- (1c) service_role → UPDATE diretto su lavori_denti
SQLSTATE 42501: permission denied for table lavori_denti

--- (1d) authenticated → DELETE diretto su lavori_denti
SQLSTATE 42501: permission denied for table lavori_denti
```

**Controllo positivo — lo STESSO `service_role` scrive attraverso la RPC.** Senza questo, i quattro
«permission denied» qui sopra proverebbero anche soltanto che la tabella è rotta per tutti:

```
--- (1e) CONTROLLO POSITIVO — lo stesso service_role scrive via RPC (SECURITY DEFINER)
[
  {
    "r": {
      "esito": "ok",
      "updated_at": "2026-07-28T10:11:13.491675+00:00"
    }
  }
]

--- (1e) conteggio dopo la RPC del service_role
[
  {
    "count": 3
  }
]

--- (1e) conteggio riportato alla fixture dopo il ROLLBACK TO SAVEPOINT
[
  {
    "count": 2
  }
]
```

**Cosa prova.** Il `REVOKE ALL` morde davvero, e morde **anche il ruolo di servizio** — cioè quello
con cui gira l'applicazione. La porta di servizio non è una scorciatoia: chi vuole scrivere sui
denti passa dalle due RPC, e quelle applicano `p_lab` in ogni `WHERE`. Il difetto E8 riprodotto il
21/07 su `parete_cassette` (`SET LOCAL ROLE service_role; DELETE` cross-tenant riuscito) **non si
riproduce qui**.

---

## Prova (2) — la RPC col laboratorio sbagliato non scrive niente

**Comando:**

```sql
SELECT public.lavoro_denti_sostituisci_atomica('<lab-B>', '<lavoro-di-A>', '[{"fdi":11}]'::jsonb, NULL);
```

**Output reale:**

```
--- (2) prima: i denti del lavoro di A
[
  {
    "fdi": 11,
    "ruolo": "elemento"
  },
  {
    "fdi": 21,
    "ruolo": "elemento"
  }
]

--- (2) lavoro_denti_sostituisci_atomica(lab B, lavoro di A, [{"fdi":11}], NULL)
[
  {
    "r": {
      "esito": "non_trovato"
    }
  }
]

--- (2) dopo: i denti del lavoro di A — invariati?
[
  {
    "fdi": 11,
    "ruolo": "elemento"
  },
  {
    "fdi": 21,
    "ruolo": "elemento"
  }
]
```

La chiamata chiedeva di **ridurre** il lavoro di A al solo dente 11: se avesse morso, il 21 sarebbe
sparito. È rimasto.

**La simmetrica** (A che tocca il lavoro di B), perché una guardia che funziona in una direzione sola
non è una guardia:

```
--- (2-bis) la simmetrica: lab A sul lavoro di B
[
  {
    "r": {
      "esito": "non_trovato"
    }
  }
]

--- (2-bis) dopo: i denti del lavoro di B — invariati?
[
  {
    "fdi": 36,
    "ruolo": "elemento"
  }
]
```

**Controllo positivo — col laboratorio giusto la stessa chiamata scrive:**

```
--- (2-ter) CONTROLLO POSITIVO — col laboratorio GIUSTO la stessa chiamata scrive
[
  {
    "r": {
      "esito": "ok",
      "updated_at": "2026-07-28T10:11:13.491675+00:00"
    }
  }
]

--- (2-ter) denti del lavoro di B dopo la chiamata legittima
[
  {
    "fdi": 36
  },
  {
    "fdi": 37
  }
]
```

**Cosa prova.** Il `SELECT … WHERE id = p_lavoro AND laboratorio_id = p_lab … FOR UPDATE` in testa
alla RPC è insieme controllo di esistenza e controllo di appartenenza: un lavoro di un altro
laboratorio **semplicemente non si trova**, e la funzione esce prima di qualunque `DELETE`. Il
`non_trovato` non è una cortesia di forma — è la stessa risposta che darebbe un identificatore
inesistente, che è quello che serve perché la route possa rispondere 404 (prova 4).

---

## Prova (3) — la RLS filtra in lettura, con un JWT vero su PostgREST

**Eseguita davvero via HTTP**, non simulata. Il JWT si ottiene con l'**utente robot dell'E2E**
(`e2e-titolare@ua-test.local`, laboratorio `Lab Test E2E`): credenziale **sintetica, versionata nel
repo** in `scripts/seed-e2e.ts:201` e creata dal seed del progetto per i test automatici. Non è la
credenziale di una persona, e nessun token compare in questo documento.

⚠️ Questa prova **scrive righe vere**, perché PostgREST è un'altra connessione e non vedrebbe una
transazione aperta. Le righe create sono annotate qui sotto e sono state rimosse subito dopo.

**Fixture e verità di riferimento** (letta dal database come `postgres`, che è `BYPASSRLS`):

```
FIXTURE CREATA per il laboratorio A (Filippo Opromolla): lavoro d085d882-e747-4525-bcfc-5dcaa1516be5 (2026/0009), 2 denti
FIXTURE CREATA per il laboratorio E2E (Lab Test E2E): lavoro 80a42e12-ab23-4de3-a3af-b34f59bbcbf0 (2026/0012), 1 denti

--- verità di riferimento, letta dal database come postgres (BYPASSRLS)
[
  {
    "laboratorio_id": "00000000-0000-0000-0000-000000000001",
    "fdi": 36
  },
  {
    "laboratorio_id": "971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c",
    "fdi": 11
  },
  {
    "laboratorio_id": "971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c",
    "fdi": 21
  }
]
```

Tre righe esistono, di due laboratori diversi. **Questo è ciò che rende la prova una prova:** se la
RLS non filtrasse, la GET qui sotto ne restituirebbe tre.

```
--- JWT ottenuto (il token NON si stampa; ecco le rivendicazioni che contano)
{
  "sub": "33d98966-71f8-4600-ba60-7cc6499afe5b",
  "role": "authenticated",
  "email": "e2e-titolare@ua-test.local"
}

--- GET /rest/v1/lavori_denti?select=laboratorio_id,lavoro_id,fdi  (Authorization: Bearer <jwt del Lab Test E2E>)
HTTP 200 OK
[{"laboratorio_id":"00000000-0000-0000-0000-000000000001","lavoro_id":"80a42e12-ab23-4de3-a3af-b34f59bbcbf0","fdi":36}]
(atteso: SOLO righe con laboratorio_id = 00000000-0000-0000-0000-000000000001 — mai una di 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c)
```

**Una riga su tre.** Le due dell'altro laboratorio non compaiono.

**Le tre controprove ostili:**

```
--- controprova: stessa GET con la sola chiave anonima (nessuna sessione)
HTTP 401 Unauthorized
{"code":"42501","details":null,"hint":"Grant the required privileges to the current role with: GRANT SELECT ON public.lavori_denti TO anon;","message":"permission denied for table lavori_denti"}

--- controprova ostile: ?laboratorio_id=eq.971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c col JWT del Lab Test E2E
HTTP 200 OK
[]

--- controprova ostile: DELETE /rest/v1/lavori_denti?laboratorio_id=eq.971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c col JWT del Lab Test E2E
HTTP 403 Forbidden
{"code":"42501","details":null,"hint":"Grant the required privileges to the current role with: GRANT DELETE ON public.lavori_denti TO authenticated;","message":"permission denied for table lavori_denti"}
```

Chiedere **esplicitamente** le righe dell'altro laboratorio non le fa uscire: la risposta è `[]`,
non un errore — cioè il richiedente non impara nemmeno che esistono.

**La stessa garanzia, verificata anche a livello di database** (`scripts/tmp/prove-isolamento.mjs`,
in transazione annullata: si impostano le rivendicazioni del token esattamente come fa PostgREST —
`set_config('request.jwt.claims', …)` — e si passa a `SET LOCAL ROLE authenticated`). Serve a
mostrare che il filtro è la **policy**, non un caso:

```
--- (3a) da postgres (BYPASSRLS): quante righe esistono in tutto
[
  {
    "laboratorio_id": "314cd040-0893-4e9d-9ad8-786e4eefd75f",
    "count": 2
  },
  {
    "laboratorio_id": "971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c",
    "count": 2
  }
]

--- (3) sessione del laboratorio B (Lab Pepe) — chi sono e quale lab vede la RLS
[
  {
    "current_user": "authenticated",
    "auth_uid": "71dcf274-fcd6-47e1-9927-b68d5a697389",
    "current_lab_id": "314cd040-0893-4e9d-9ad8-786e4eefd75f"
  }
]

--- (3) sessione del laboratorio B (Lab Pepe) — SELECT laboratorio_id, fdi FROM lavori_denti
[
  {
    "laboratorio_id": "314cd040-0893-4e9d-9ad8-786e4eefd75f",
    "fdi": 36
  },
  {
    "laboratorio_id": "314cd040-0893-4e9d-9ad8-786e4eefd75f",
    "fdi": 37
  }
]

--- (3) sessione del laboratorio A (Filippo Opromolla) — chi sono e quale lab vede la RLS
[
  {
    "current_user": "authenticated",
    "auth_uid": "2f78066e-64ef-4194-aef4-364dad2e7d4d",
    "current_lab_id": "971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c"
  }
]

--- (3) sessione del laboratorio A (Filippo Opromolla) — SELECT laboratorio_id, fdi FROM lavori_denti
[
  {
    "laboratorio_id": "971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c",
    "fdi": 11
  },
  {
    "laboratorio_id": "971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c",
    "fdi": 21
  }
]
```

Due sessioni diverse, sugli stessi dati, vedono due metà diverse. È il filtro, non il caso.
🔑 Nota di metodo: `public.current_lab_id()` risolve al laboratorio giusto **in entrambe** le
sessioni — senza questa riga, uno `zero righe` sarebbe stato indistinguibile da un `auth.uid()` a
`NULL`, cioè da una prova che non prova niente.

---

## Prova (4) — la route risponde 404, non 403

**Eseguita davvero via HTTP** contro il server di sviluppo su `http://localhost:3000`, con una
**sessione autenticata vera**. La sessione è costruita **senza browser e senza compilare un modulo
di accesso**: si ottiene il token dell'utente robot dell'E2E via API e lo si impacchetta nel cookie
che `@supabase/ssr` 0.5.2 si aspetta (`base64-` + base64url della sessione, a pezzi da 3180
caratteri — `node_modules/@supabase/ssr/dist/main/cookies.js:153` e `utils/chunker.js:4`).

**La prova:**

```
FIXTURE CREATA: lavoro 1d77c9e4-d4c8-4105-9d7b-5fe350d9ebfa (2026/0010) per il laboratorio 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c
FIXTURE CREATA: lavoro da0fae2c-3ede-400a-b34c-d19dc9650d08 (2026/0013) per il laboratorio 00000000-0000-0000-0000-000000000001

--- sessione costruita per e2e-titolare@ua-test.local (laboratorio 00000000-0000-0000-0000-000000000001)
cookie: sb-iagibumwjstnveqpjbwq-auth-token (valori non stampati)

########## LA PROVA ##########

--- (4) lavoro di un ALTRO laboratorio, sessione del Lab Test E2E — atteso 404, MAI 403
PUT /api/lavori/1d77c9e4-d4c8-4105-9d7b-5fe350d9ebfa/denti
HTTP 404 Not Found
{"error":"Lavoro non trovato"}
```

**I quattro controlli:**

```
--- (4a) CONTROLLO POSITIVO — lavoro del PROPRIO laboratorio: la stessa richiesta scrive
PUT /api/lavori/da0fae2c-3ede-400a-b34c-d19dc9650d08/denti
HTTP 200 OK
{"denti":[{"fdi":36,"ruolo":"elemento","scala":null,"codice":null,"codice_collo":null,"codice_corpo":null,"codice_incisale":null,"provenienza":"prescritto"},{"fdi":37,"ruolo":"elemento","scala":null,"codice":null,"codice_collo":null,"codice_corpo":null,"codice_incisale":null,"provenienza":"prescritto"}],"updated_at":"2026-07-28T10:16:58.133624+00:00"}

--- (4b) senza sessione — atteso 401
PUT /api/lavori/1d77c9e4-d4c8-4105-9d7b-5fe350d9ebfa/denti
HTTP 401 Unauthorized
{"error":"Non autorizzato"}

--- (4c) sessione valida ma origine estranea — atteso 403 (guardia CSRF, prima della RPC)
PUT /api/lavori/1d77c9e4-d4c8-4105-9d7b-5fe350d9ebfa/denti
HTTP 403 Forbidden
{"error":"Richiesta non consentita"}

--- (4d) identificatore inesistente — stessa risposta del cross-tenant? (404 = indistinguibili)
PUT /api/lavori/00000000-0000-0000-0000-0000000000ff/denti
HTTP 404 Not Found
{"error":"Lavoro non trovato"}
```

**E il dato non si è mosso:**

```
--- verifica sul database: il lavoro dell'altro laboratorio è rimasto intatto?
[{"fdi":11},{"fdi":21}]
(la richiesta (4) chiedeva di ridurlo al solo 11; atteso: ancora 11 e 21 — esito HTTP 404)
```

**Cosa prova, e perché (4d) è la parte che conta.** Il 404 da solo direbbe poco. Quello che conta è
che la risposta a «il lavoro di un altro laboratorio» e la risposta a «un identificatore che non
esiste» sono **la stessa risposta, parola per parola**: `HTTP 404` + `{"error":"Lavoro non
trovato"}`. Un 403 avrebbe detto «esiste, ma non puoi» — che è già un'informazione di troppo, e
permetterebbe di enumerare i lavori altrui una richiesta alla volta. Da fuori, i due casi sono
indistinguibili.

Il 403 del controllo (4c) è un'altra cosa e sta al posto giusto: è la guardia contro le richieste
che arrivano da un'origine estranea (`isSameOrigin`), e scatta **prima** che si guardi di chi sia il
lavoro. Non rivela nulla su nessun lavoro.

---

## Prova (5) — il laboratorio con denti resta cancellabile

Su un **laboratorio di prova creato apposta** (mai su uno dei tre veri), in transazione annullata.

**Fixture, con il controllo positivo che serve** — senza di questo si proverebbe solo che si
cancella un laboratorio vuoto, cosa che funzionava anche prima di questa ondata:

```
--- FIXTURE — laboratorio di prova creato
[
  {
    "id": "0684b43b-2b20-40cc-896f-c6f71e0a91b5",
    "nome": "Lab prova task 13 — R5"
  }
]

--- FIXTURE — lavoro + denti creati via RPC
[
  {
    "r": {
      "esito": "ok",
      "id": "24778090-3508-413e-89f9-dfc76e2f4955",
      "numero_lavoro": "2026/0001",
      "stato": "ricevuto"
    }
  }
]

--- CONTROLLO POSITIVO — righe in lavori_denti per questo laboratorio (deve essere > 0)
[
  {
    "denti": 3
  }
]
```

**Il controfattuale — che il rischio R5 fosse reale, non teorico.** Senza la riga aggiunta il
27/07 in `admin_delete_laboratorio`, la cancellazione andrebbe a sbattere qui:

```
--- (5a) CONTROFATTUALE — DELETE FROM lavori senza prima togliere i denti
SQLSTATE 23503: update or delete on table "lavori" violates foreign key constraint "lavori_denti_lavoro_fk" on table "lavori_denti"
DETAIL: Key (id, laboratorio_id)=(24778090-3508-413e-89f9-dfc76e2f4955, 0684b43b-2b20-40cc-896f-c6f71e0a91b5) is still referenced from table "lavori_denti".
```

**La prova:**

```
--- (5b) SELECT public.admin_delete_laboratorio(<lab di prova>)
[
  {
    "r": {
      "ok": true,
      "nome": "Lab prova task 13 — R5",
      "deleted": {
        "psur": 0,
        "inviti": 0,
        "lavori": 1,
        "utenti": 0,
        "clienti": 1,
        "fatture": 0,
        "listino": 0,
        "tecnici": 0,
        "cassette": 0,
        "messaggi": 0,
        "pazienti": 0,
        "fornitori": 0,
        "magazzino": 0,
        "notifiche": 0,
        "laboratori": 1,
        "prima_nota": 0,
        "lavori_fasi": 0,
        "nomine_prrc": 0,
        "prrc_nomine": 0,
        "reti_membri": 0,
        "appuntamenti": 0,
        "lavori_denti": 3,
        "lavoro_prove": 0,
        "ordini_righe": 0,
        "sdi_receipts": 0,
        "fatture_righe": 0,
        "incidenti_mdr": 0,
        "lab_stato_log": 0,
        "risk_analyses": 0,
        "buoni_consegna": 0,
        "istruzioni_uso": 0,
        "cassette_lavori": 0,
        "fasi_produzione": 0,
        "lab_memberships": 0,
        "lavori_immagini": 0,
        "lotti_magazzino": 0,
        "ordini_acquisto": 0,
        "portale_accessi": 0,
        "cicli_produzione": 0,
        "lavori_materiali": 0,
        "fascicoli_tecnici": 0,
        "fatture_pagamenti": 0,
        "lavori_lavorazioni": 0,
        "lavori_rifacimenti": 0,
        "dashboard_kpi_cache": 1,
        "lavori_appuntamenti": 0,
        "listino_prezzi_tier": 0,
        "prescrizioni_digitali": 0,
        "cassette_backfill_audit": 0,
        "rischi_tipo_dispositivo": 0,
        "utenti_admin_scollegati": 0,
        "dichiarazioni_conformita": 0,
        "data_processing_agreements": 0
      }
    }
  }
]

--- (5b) il laboratorio, i suoi lavori e i suoi denti non esistono più
[
  {
    "laboratori": 0,
    "lavori": 0,
    "lavori_denti": 0
  }
]
```

**Nessun errore di chiave esterna**, e `"lavori_denti": 3` — cioè la funzione ha davvero cancellato
le righe nuove, non le ha semplicemente ignorate.

---

## Prova (6) — l'asserzione strutturale: **fallita, e difettosa in tre modi**

Il piano chiedeva: nessuna tabella con `laboratorio_id` deve mancare da `admin_delete_laboratorio`.
Atteso: zero righe, «oppure solo tabelle di cui si sa e si scrive perché sono escluse».

### (6a) L'asserzione del piano, eseguita alla lettera

```sql
SELECT c.table_name
  FROM information_schema.columns c
 WHERE c.column_name = 'laboratorio_id'
   AND c.table_schema = 'public'
   AND c.table_name NOT IN (
     SELECT unnest(regexp_matches(prosrc, 'DELETE FROM (\w+)', 'g'))
       FROM pg_proc WHERE proname = 'admin_delete_laboratorio'
   );
```

**Output reale — undici righe, non zero:**

```
[
  { "table_name": "cassette" },
  { "table_name": "cassette_backfill_audit" },
  { "table_name": "cassette_lavori" },
  { "table_name": "credito_clienti_movimenti" },
  { "table_name": "fatture_sdi_eventi" },
  { "table_name": "listino_materiali_auto" },
  { "table_name": "ordini_fornitori" },
  { "table_name": "pagamenti" },
  { "table_name": "progressivi_anno" },
  { "table_name": "push_subscriptions" },
  { "table_name": "scarichi_magazzino" }
]
```

### (6b) Il conteggio che ottengo è vero?

Non basta che la query giri. **Conta a mano contro conta della macchina:**

```
--- match del regex, distinti, e forme che il regex NON saprebbe leggere
[
  {
    "match_regex": "50",
    "match_distinti": "49",
    "delete_con_schema": "0",
    "delete_su_piu_righe": "0"
  }
]

--- quale nome il regex conta DUE volte (una è dentro un commento)
[
  {
    "nome": "lavori",
    "volte": "2"
  }
]
```

Conta a mano sul sorgente della migration vigente
(`grep -c "DELETE FROM" supabase/migrations/20260727120200_lavori_colore_caso.sql`): **50**.
Coincide con i 50 match del regex. Ma i nomi **distinti** sono 49: `lavori` è contato due volte
perché `prosrc` **contiene anche i commenti**, e uno dei commenti dice
`-- … DEVE stare PRIMA di DELETE FROM lavori:`.

**Verdetto sulla lettura del regex, sul testo di oggi:** i 50 `DELETE FROM` di
`admin_delete_laboratorio` sono tutti su una riga sola e tutti senza schema davanti
(`delete_con_schema: 0`, `delete_su_piu_righe: 0`), quindi **il regex li legge tutti**. Su questo
testo, in questo punto, non mente. Ma ci riesce **per come è scritto il testo oggi**, non per una
proprietà del controllo.

### (6c) Lo stesso regex, sulla funzione accanto, **mente già oggi**

`admin_delete_laboratorio` delega la purga delle cassette a `cassette_purge_lab`. Stesso regex,
stessa base dati:

```
--- regexp_matches(prosrc,'DELETE FROM (\w+)') su cassette_purge_lab
[
  { "letto_dal_regex": "cassette_lavori" },
  { "letto_dal_regex": "cassette" },
  { "letto_dal_regex": "public" }
]

--- la riga vera che il regex ha letto come «public»
[
  {
    "riga_vera": "DELETE FROM public.cassette_backfill_audit WHERE laboratorio_id = $1' USING p_lab;"
  }
]
```

Il regex ha estratto una tabella che si chiama **`public`**. La tabella vera,
`cassette_backfill_audit`, è invisibile al controllo. Non è un'ipotesi sul futuro: è **la stessa
base dati, oggi**.

### Le tre difettosità, indipendenti l'una dall'altra

1. **`information_schema.columns` include le viste**, non solo le tabelle. Una vista non si cancella
   e non deve comparire. Va filtrato `table_type='BASE TABLE'` (o `pg_class.relkind='r'`).
2. **Le `DELETE` delegate a `cassette_purge_lab` non stanno in `prosrc`** di
   `admin_delete_laboratorio` → tre falsi positivi (`cassette`, `cassette_lavori`,
   `cassette_backfill_audit`), che infatti risultano cancellate nell'output della prova (5).
3. **`DELETE FROM public.x` e le `DELETE` su più righe** il regex non le sa leggere — e `prosrc`
   include anche i **commenti**, quindi un commento che nomina una tabella la fa risultare coperta
   anche se nessuno la cancella. **Questa terza è la più insidiosa: mente nella direzione
   rassicurante.**

### (6d) L'asserzione corretta — e il buco vero che scopre

Filtrando alle sole tabelle base, unendo le `DELETE` di **entrambe** le funzioni e accettando lo
schema davanti:

```sql
WITH coperte AS (
  SELECT unnest(regexp_matches(prosrc,'DELETE\s+FROM\s+(?:public\.)?(\w+)','g')) AS t
    FROM pg_proc WHERE proname IN ('admin_delete_laboratorio','cassette_purge_lab')
)
SELECT cl.relname AS tabella, …
  FROM pg_attribute a JOIN pg_class cl ON cl.oid=a.attrelid …
 WHERE n.nspname='public' AND cl.relkind='r' AND a.attname='laboratorio_id'
   AND cl.relname NOT IN (SELECT t FROM coperte);
```

**Output reale** (`on_delete`: `a` = NO ACTION, `c` = CASCADE, `-` = nessuna chiave esterna):

```
[
  { "tabella": "credito_clienti_movimenti", "fk_verso_laboratori": "1", "on_delete": "a" },
  { "tabella": "fatture_sdi_eventi",        "fk_verso_laboratori": "1", "on_delete": "a" },
  { "tabella": "listino_materiali_auto",    "fk_verso_laboratori": "1", "on_delete": "a" },
  { "tabella": "ordini_fornitori",          "fk_verso_laboratori": "1", "on_delete": "a" },
  { "tabella": "pagamenti",                 "fk_verso_laboratori": "1", "on_delete": "a" },
  { "tabella": "progressivi_anno",          "fk_verso_laboratori": "0", "on_delete": "-" },
  { "tabella": "push_subscriptions",        "fk_verso_laboratori": "1", "on_delete": "c" },
  { "tabella": "scarichi_magazzino",        "fk_verso_laboratori": "1", "on_delete": "a" }
]
```

Le tre tabelle delle cassette sono sparite: erano falsi positivi. Restano otto nomi, che si dividono
in tre casi diversi:

- **`push_subscriptions` — nessun problema.** Chiave esterna `ON DELETE CASCADE`: le righe se ne
  vanno da sole.
- **`progressivi_anno` — non blocca, ma lascia spazzatura.** Nessuna chiave esterna verso
  `laboratori`, quindi non impedisce niente; però le righe **restano orfane**. Provato:

```
--- righe in progressivi_anno per il laboratorio, PRIMA della cancellazione
[
  {
    "laboratorio_id": "42da8438-0a9d-4957-a5d7-b8725c93b2c9",
    "tipo": "lavoro",
    "anno": 2026,
    "progressivo": 1
  }
]

--- admin_delete_laboratorio
[
  {
    "ok": "true"
  }
]

--- righe in progressivi_anno DOPO la cancellazione — orfane di un laboratorio che non esiste più
[
  {
    "laboratorio_id": "42da8438-0a9d-4957-a5d7-b8725c93b2c9",
    "tipo": "lavoro",
    "anno": 2026,
    "progressivo": 1
  }
]
```

- **🔴 Le altre sei — `credito_clienti_movimenti`, `fatture_sdi_eventi`, `listino_materiali_auto`,
  `ordini_fornitori`, `pagamenti`, `scarichi_magazzino` — sono R5, esattamente, su un'altra
  tabella.** Hanno una chiave esterna verso `laboratori` **senza `ON DELETE`** (NO ACTION) e
  **nessuno le cancella**. Oggi non si vede perché sono tutte a zero righe:

```
credito_clienti_movimenti 0 · fatture_sdi_eventi 0 · listino_materiali_auto 0
ordini_fornitori 0 · pagamenti 0 · scarichi_magazzino 0
(progressivi_anno 9 · push_subscriptions 1)
```

**Repro** — un laboratorio che si cancella senza problemi, **una sola riga**, e non si cancella più:

```
--- controllo: il laboratorio VUOTO si cancella (SAVEPOINT, poi si torna indietro)
true

--- inserita UNA riga in credito_clienti_movimenti per quel laboratorio

--- (6e) ora admin_delete_laboratorio sullo STESSO laboratorio
SQLSTATE 23503: update or delete on table "clienti" violates foreign key constraint "credito_clienti_movimenti_cliente_id_fkey" on table "credito_clienti_movimenti"
DETAIL: Key (id)=(ce6738ab-b042-477e-988c-0bfda5d3cdf5) is still referenced from table "credito_clienti_movimenti".
```

Stesso laboratorio, stessa chiamata, due esiti opposti: **`true` prima, chiave esterna violata
dopo.** Il laboratorio è diventato incancellabile.

### Verdetto sulla prova (6)

**L'asserzione strutturale del piano non regge, e non regge due volte:** il suo risultato non è zero
righe, e lo strumento con cui la si misura è fragile in tre modi indipendenti — uno dei quali si
verifica **già oggi**, sulla funzione accanto.

⚠️ Il buco delle sei tabelle **non appartiene a questa ondata** e **non è stato corretto**
(R-E2: si riferisce, non si corregge di nascosto). `lavori_denti` — la tabella di questa ondata — è
coperta correttamente, e la prova (5) lo dimostra. È riportato nei ritrovamenti fuori mandato
dell'handoff.

---

## Il database dopo il lavoro

Tutto ciò che è stato scritto, e come è stato rimosso:

| Dove | Cosa | Come è stato ripulito |
|------|------|------------------------|
| Prove (1) (2) (3-bis) | 2 lavori + 3 denti nei laboratori Filippo Opromolla e Lab Pepe | `ROLLBACK` della transazione |
| Prova (5) | 1 laboratorio + 1 cliente + 1 lavoro + 3 denti di prova | `ROLLBACK` della transazione |
| Prova (6e) (6f) | 2 laboratori + 2 clienti + 1 lavoro + 1 dente + 1 movimento di credito | `ROLLBACK` della transazione |
| **Prova (3)** | **2 lavori + 3 denti** (`d085d882…`, `80a42e12…`) — **scritti davvero** | denti svuotati con `lavoro_denti_sostituisci_atomica(…, '[]')`, poi righe rimosse |
| **Prova (4)** | **2 lavori + 3 denti** (`1d77c9e4…`, `da0fae2c…`) — **scritti davvero** | idem |

**Conteggio finale, letto con lo strumento SQL** (`node scripts/tmp/sql.mjs`), non stimato:

```
[
  {
    "lavori": "294",
    "lavori_denti": "0",
    "laboratori": "3"
  }
]
```

Identico alla baseline dichiarata all'inizio dell'ondata: **294 lavori, 0 righe in `lavori_denti`**.

🔑 Nota su `progressivi_anno`: le fixture create in transazione hanno incrementato dei progressivi,
ma il `ROLLBACK` li ha riportati indietro insieme al resto. Le fixture delle prove (3) e (4), che
sono state scritte davvero, hanno consumato dei numeri di lavoro (2026/0009, 2026/0010, 2026/0012,
2026/0013): quei numeri restano consumati, come per qualunque lavoro cancellato. Non è un residuo
da ripulire — è il comportamento normale di un progressivo.

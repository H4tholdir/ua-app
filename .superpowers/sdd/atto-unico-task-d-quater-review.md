# REVISIONE — Task D-quater: il gettone si muove solo se cambia qualcosa (D323)

**Revisore indipendente** (non ha scritto il codice) · **Ramo:** `intervento-post-consegna`
**Diff esaminato:** `01b62a0e..f06408ba` · **Data:** 08/08/2026

---

## VERDETTO — **APPROVATO CON RILIEVI**

| cosa | esito della MIA verifica |
|---|---|
| 🔴 la DEVIAZIONE di un token | **GIUSTIFICATA** — riprodotta con le penne VERE: forma ratificata **4 su 6**, forma spedita **6 su 6** |
| il critico (gettone bruciato dal contatore) | **CHIUSO** — `post_consegna_correzioni + 1` → gettone **pinzato**, contro la funzione VIVA |
| migration (ledger · corpo · trigger · ACL · condivisa) | **tutto verificato**, corpo vivo **identico byte a byte** al file |
| controllo anticipato in `…/riemetti` | **dopo** la porta d'idempotenza ✅ · confronto **più debole** della RPC ✅ · controllo nella RPC **rimasto** ✅ |
| il foglio raccoglie il gettone | successo ✅ · 409 ✅ · **nessuna riconversione** — rotta apposta su ENTRAMBI i rami: diventano rossi |
| «Ricarica e riprendi» | non cancella più le correzioni ✅ |
| FASE 7 rilanciata da me | **5676 | 68 su 455** — `VERIFY_EXIT=0`, **identica alla dichiarazione** |
| mutazioni dichiarate (6 su 13 riprodotte) | **6 su 6 accese, tutte sull'asserzione giusta** |
| 🔴 **mutazioni NUOVE che restano VERDI** | **quattro** — e tre sono sulla migration, cioè sul cuore di D323 |

🛑 **NESSUN RILIEVO CRITICO.** Non ho trovato **nessun difetto che si accenda oggi**: il
comportamento spedito è corretto su ogni punto che ho potuto misurare. I quattro rilievi qui sotto
riguardano **la rete di sicurezza e il contratto**, cioè cose che costano domani, non oggi.
**Perché non APPROVATO e basta:** il pezzo di SQL che è tutto il compito **non ha nessuna prova**, e
la regressione che l'emendamento stesso dichiara di temere passa verde — con il modello per chiuderla
già in casa. **Perché non RESPINTO:** nessun difetto di comportamento, e la deviazione è provata.

---

# RILIEVI

## 🟠 IMPORTANTI

### I1 — Il cuore di D323 non ha NESSUNA rete meccanica: tre mutazioni sulla migration restano VERDI

L'esecutore dichiara «**13 mutazioni, 13 accese**». Sono vere (ne ho riprodotte sei, §MUTAZIONI),
ma **tutte e tredici stanno su TypeScript**. Il predicato SQL — la cosa per cui esiste il compito —
non è toccato da nessuna prova: `grep -rln "lavori_set_updated_at" tests/` restituisce due file, e
in **entrambi la stringa compare solo dentro un commento**.

Ho mutato la migration e rilanciato le quattro suite toccate dal task:

```
### MUTAZIONE N2 — RIMETTE la forma ratificata ( - 'updated_at' ) — uscita 0
 Test Files  4 passed (4)
      Tests  145 passed (145)

### MUTAZIONE N1 — cambia la colonna esente (post_consegna_correzioni → numero_cassetta) — uscita 0
 Test Files  4 passed (4)
      Tests  145 passed (145)

### MUTAZIONE N3 — la migration NON riaggancia il trigger (= il difetto B1 del brief) — uscita 0
 Test Files  4 passed (4)
      Tests  145 passed (145)
```

🛑 **N2 è esattamente lo scenario che l'emendamento a D323 mette per iscritto come pericolo:**

> «*la prima «pulizia» che nota la differenza rimetterebbe `- 'updated_at'` riaprendo l'aggiornamento
> perso, con la convinzione di star sistemando un refuso.*»

L'unica difesa dichiarata contro quello scenario è **prosa** — in tre posti (verbale, `COMMENT` sulla
funzione, cappello della migration). Ho misurato che la prosa non si accende: quel cambiamento oggi
esce **verde da `verify:full`**, e riapre l'aggiornamento perso **totale** su
`lavoro_denti_sostituisci_atomica` che ho riprodotto io stesso (§SONDA A, riga `C1-1`).

🛑 **N3 è il difetto B1 che l'ESECUTORE STESSO ha trovato nel brief.** Un piano che «crea la funzione
e non riaggancia il trigger» sarebbe passato verde allora e passerebbe verde oggi: la prova che
avrebbe dovuto nascere da quel ritrovamento non è stata scritta.

🔑 **E il modello è già in casa — due volte, e uno è già sul file giusto:**
- `tests/unit/prescrizione-costanti-spia-migration.test.ts` e
  `tests/unit/categorie-foto-spia-migration.test.ts` — una prova unitaria che **legge il file di
  migration** e lo confronta con il codice. Prende N1 e N2. Il suo stesso cappello dice di essere
  «*l'UNICA rete meccanica che impedisce ai due di divergere in silenzio*».
- `tests/integration/helpers/pg-client.ts` → `withRollback()`, e
  **`tests/integration/riemetti-ddc-atomica.rpc.test.ts` esiste già** per questa stessa RPC. Una
  prova lì dentro prende N1, N2 **e** N3 per **comportamento**, ed è la stessa forma della mia
  sonda A: sei righe di fixture e un `UPDATE` in transazione annullata.

⚠️ **DUE ONESTÀ, e la seconda restringe il rilievo:**
1. i file di `tests/integration/**` **si saltano da soli** senza `SUPABASE_DB_URL`, e infatti la mia
   FASE 7 riporta `6 skipped` su 455. ➡️ **Una prova di integrazione NON avrebbe fermato N2 in CI**:
   il rimedio che regge davvero è la **prova spia**, che gira dentro `verify:full` da subito;
2. **il brief non chiedeva questa prova**, e l'esecutore era su un mandato di correzione, non di
   costruzione della prima prova di comportamento su un trigger. ➡️ **Il rilievo è sul lavoro che
   resta**, non su una regola violata.

📌 **Non è un rilievo sul comportamento:** il comportamento è giusto, l'ho misurato. È un rilievo su
**R-P4** applicata a metà — «una prova nuova non è finita finché non l'hai vista diventare rossa»
non si può applicare a una prova che non esiste.

### I2 — CHI può sfilarsi dalla pinzatura: **solo il server** — e la guardia è UNA prova su UNA rotta

🔑 **La risposta al punto ② del mandato, in una riga.** Il predicato tiene `updated_at` **dentro** il
confronto, quindi **chiunque lo assegni fa ripartire `now()` anche senza cambiare nient'altro**.
Chi può farlo, misurato e non supposto: **solo il codice di server (`service_role`)** — un `UPDATE`
diretto su `lavori` come `authenticated` **muore con `42501` su `refresh_dashboard_cache`** (sonda
B2). ➡️ **La scrittura sbagliata che diventa possibile è una scrittura di ROTTA**, non del browser:
una rotta nuova che mette `updated_at` nel proprio carico spegne la pinzatura sul proprio percorso,
in silenzio. **E l'unica guardia contro quello è una prova unitaria su una rotta sola** — la PATCH.

Detto per esteso, la regola vera è:

> il gettone avanza **se** la sostanza cambia **oppure** se il chiamante ha assegnato `updated_at`.

Cioè: **qualunque scrittore che metta `updated_at` nel proprio carico si sfila dalla pinzatura**, e
lo fa in silenzio. Misurato (§SONDA A, riga `C2-5`): un `UPDATE lavori SET updated_at = '2000-01-01'`
che **non cambia nient'altro** porta il gettone a `now()`.

🛑 **E il `COMMENT` sulla funzione dichiara «fail-closed» senza dire per cosa:**

> «*Il predicato è per SOTTRAZIONE: una colonna nuova entra da sola dalla parte protetta (fail-closed).*»

**Vero per le COLONNE. Falso per gli SCRITTORI**, che sono l'altra metà e sono la metà da cui è
arrivato il difetto originale. Il cappello della migration nomina l'accoppiamento **solo con la
PATCH**; la sentinella (`lavori-patch-senza-updated-at.test.ts`) copre **un** file su tutti quelli
che possono scrivere `lavori`.

📌 **Il censimento degli scrittori, che ho rifatto io:** l'idioma è **già vivo** in
`src/lib/lavori/transizioni.ts:62` —
`.update({ stato: nuovoStato, updated_at: new Date().toISOString(), ...extraFields })`.
✅ **Oggi è innocuo, e l'ho verificato invece di supporlo:** `TRANSIZIONI_CONSENTITE`
(`transizioni.ts:8-16`) **non contiene nessuna auto-transizione** — nessuno stato compare fra le
proprie destinazioni — quindi `stato` cambia sempre e il gettone avanzerebbe comunque.
🔴 **Ma è la riga da cui si copia:** una rotta nuova che ricalca quell'idioma riapre D323 **sul
proprio percorso**, e nessuna guardia lo vede.

✅ **Il confine misurato, che è la ragione per cui il rischio resta dentro il codice di server:**
il gesto **non è raggiungibile dal browser**. Sonda B2, `SET LOCAL ROLE authenticated`
con un claim JWT di un utente vero del laboratorio:

```
q=ESITO | gettone_spostato=false | valore_in_riga=2026-08-05 18:48:23.594252+00
```

L'`UPDATE` diretto via PostgREST **non passa**: supera le RLS e i permessi di colonna, e **muore sul
trigger AFTER** — `42501 permission denied for function refresh_dashboard_cache`
(`refresh_dashboard_cache` ha ACL `{postgres,service_role}` ed è `SECURITY DEFINER`, ma
`trg_refresh_dashboard` è `SECURITY INVOKER`, quindi gira come il chiamante e non può chiamarla).
➡️ **Solo il codice di server (`service_role`) può muovere il gettone.** La protezione però è
**incidentale** — un buco di permessi su una funzione che non c'entra niente — non progettata.

### I3 — La scorciatoia del carico vuoto **scarta l'errore** e può rispondere **200 `{lavoro: null}`**

`src/app/api/lavori/[id]/route.ts` (la guardia B3):

```ts
const { data: invariato } = await svc
  .from('lavori')
  .select('id, numero_lavoro, stato, updated_at')
  …
  .single()
return NextResponse.json({ lavoro: invariato })
```

L'`error` non viene letto. Se la riga sparisce fra la lettura di `existing` (`:509-519`, che risponde
**404** se manca) e questa seconda lettura, il chiamante riceve **200 con `lavoro: null`** — dove la
strada normale risponde **500** (`if (updateError)`) e la porta di sopra **404**. È una finestra
stretta e su dati di prova non fa danno, ma **è un terzo contratto di risposta** su una rotta che ne
aveva due, ed è quello che un client non si aspetta (`ModificaColoreSheet.tsx:226-228` e
`ModificaRigaSheet` leggono `corpo?.lavoro?.updated_at`: con `null` restano semplicemente col gettone
vecchio, senza sapere perché).

✅ **Il resto della guardia regge, e l'ho controllato:** sta **dopo** l'allowlist (`:521-531`), dopo lo
svuotamento della mezza coppia di colore (`:644`) e di tinta (`:733`), dopo il lock prezzo
(`:753-757`) e dopo la validazione FK — quindi **tutte e tre le strade di B3 ci arrivano davvero**.
E l'argomento R4-bis regge per costruzione: `coloreScartato`, `tintaScartata` e `tintaRimossa` si
accendono **solo** dentro rami che **assegnano chiavi al carico**, quindi con carico vuoto nessuno dei
tre può essere vero.

### I4 — Il censimento: la conclusione tiene, il **metodo** no (R-P2 / R-P6)

Il filtro dell'esecutore era
`prosrc ILIKE '%updated_at%' AND prosrc ILIKE '%lavori%'` → **11 righe**. Quel filtro, **per
costruzione**, non vede la popolazione che D323 governa: le funzioni che scrivono `lavori` **senza
nominare** `updated_at` — cioè proprio quelle che si affidano al trigger.

Rifatto sul catalogo vivo:

```sql
SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace
  AND (prosrc ILIKE '%update lavori%' OR prosrc ILIKE '%update public.lavori%');
→ 20 righe (non 11)
```

✅ **Non ho trovato un quattordicesimo oggetto rotto, e ho cercato in quattro popolazioni:**
1. **le 20 funzioni che scrivono `lavori`** — le 15 in più rispetto all'elenco toccano tutte una
   colonna vera (`numero_cassetta`, `stato`, `incluso_in_fattura`, `data_consegna_prevista`…),
   quindi avanzano da sole. `lavoro_prescrizione_registra_divergenza` e
   `lavoro_prescrizione_conferma_consegna` **non toccano `lavori` affatto** (scrivono
   `lavori_prescrizioni`), quindi non hanno gettone da rompere;
2. **le funzioni che PORTANO un gettone atteso** — sono **tre**, e sono esattamente le righe #1-#3
   del resoconto: `SELECT proname FROM pg_proc WHERE pg_get_function_identity_arguments(oid) ILIKE
   '%updated_at%'` → `correggi_e_riemetti_atomica`, `lavoro_denti_sostituisci_atomica`,
   `lavoro_prescrizione_correggi_typo`;
3. **gli scrittori TypeScript** — `grep -rn "from('lavori')"` → 88 occorrenze, **un solo** `.update()`
   assegna `updated_at` (`transizioni.ts:62`, v. I1);
4. 🔑 **i lettori fuori da `pg_proc`, che è dove un difetto si sarebbe nascosto meglio** — nessuna
   sincronizzazione incrementale e nessun ordinamento sul gettone:
   `order('updated_at'` / `gt('updated_at'` / `gte('updated_at'` / `lt(` / `lte(` → **zero hit** in
   tutto `src/`; nessun `last_sync`/`If-Modified-Since`/ETag; nessuna schermata che stampi
   «ultima modifica» da `lavori.updated_at`. E la vista:
   `pg_get_viewdef('lavori_dashboard') ILIKE '%order by%updated_at%'` → **false**,
   `ILIKE '%updated_at%'` → **true** (la seleziona, non ci ordina) — la riga #13 del resoconto è
   confermata.

➡️ **L'affermazione «0 rotti» la confermo.** Il rilievo è sull'innesco: R-P2 dice che *l'elenco non lo
decide l'autore*, e un filtro che richiede la presenza della parola `updated_at` **è** l'autore che
decide l'elenco.

---

## 🟡 MINORI

**m1 — M6 accende CINQUE asserzioni, non quattro** (resoconto §4). Misurato:
```
### MUTAZIONE M6 — uscita 1
 × 🔴 ① il carico dell'UPDATE NON contiene `updated_at` …
 × 🔴 ② un corpo senza nessun campo dell'allowlist NON scrive e risponde 200, mai 500
 × 🛑 ②-bis … mezza coppia di colore …
 × 🛑 ②-ter la scorciatoia NON ingoia un avviso …
 × ⚖️ D323 — `updated_at` NON entra nel carico: né quello del client né uno messo dalla rotta
      Tests  5 failed | 140 passed (145)
```
Sottostima, quindi nel verso sicuro.

**m2 — «~20 tabelle» è basso.** Il cappello della migration e il `COMMENT` dicono che
`trigger_set_updated_at` è condivisa da «~20 tabelle». Il catalogo vivo:
```
q=CONDIVISA_USI | tabelle_ancora_legate = 36
```
La direzione dell'argomento è giusta (e più forte di come è scritta); il numero no.

**m3 — «tre tocchi per rientrare» (resoconto §8) è ottimista.** `ricaricaERiprendi` tiene
`correzioni` **e** `eventoDaRiusare` (che è consultato solo al momento dell'invio, `:719-720`), ma
azzera `motivo`, `motivoLibero`, `risposta`, `esitoScelto`, `confermata`: rientrando si ripercorrono
le domande di qualità, non tre tocchi. ✅ **Il testo a schermo però è vero** — dice «*Anche le
correzioni che hai scritto restano: non devi ridigitarle*», e quelle restano davvero. Nessuna bugia
all'utente; la stima nel resoconto sì.

**m4 — la risincronizzazione dai `props` è scoperta due volte.** Mutazione nuova N5 (tolto il blocco
`if (voci.updatedAt !== gettoneDeiProps) {…}`): **verde**, `145 passed (145)`. Il resoconto §4
dichiara già che in jsdom la prova del 409 misura **solo il ramo di ripiego** perché
`router.refresh()` è finto; sommando le due cose, **la strada principale — «quello dei props vince
quando cambia» — non ha né prova né mutante**. È la sola parte del pezzo ③ che si regge su un
ragionamento e non su una misura.

---

# LE MIE SONDE

Ponte: `node scripts/psql.mjs` / un runner equivalente (`pg` diretto) per leggere i corpi senza
troncamenti. Credenziali da `.env.local`. **Tutte in transazione annullata.**

## SONDA A — le due forme candidate, sei casi ciascuna, **penne vere invocate**

**Come discrimina, dato che `now()` è costante nella transazione:** ogni fixture nasce con
`updated_at = '2020-01-01'`, che è un `OLD` **diverso** da `now()` di questa transazione. Quindi
«avanzato» = `updated_at <> '2020-01-01'`. Non serve che `now()` vari: il confronto del trigger è
contro `OLD`. ⚠️ `stato_dispositivo` **non è una colonna di `lavori`** — vive su `eventi_qualita`
(`information_schema.columns` → una riga sola), quindi l'avvertenza del brief riguarda il percorso
HTTP, non queste sonde; ho comunque fissato `stato`, `data_consegna_prevista` (per rendere inerte
`check_lavoro_ritardo`) e i tre array denormalizzati.

`C1` = forma **ratificata** (`- 'post_consegna_correzioni' - 'updated_at'`), montata su una funzione
usa-e-getta. `C2` = **la funzione VIVA** `public.lavori_set_updated_at()`.

```
fase=0 · BASE | al_valore_base=12 | totali=12

etichetta=C1-1 denti solo codice colore | gettone_avanzato=false | valore_in_riga=2020-01-01 00:00:00+00 | array_denti_identici=true | codici_denti=0M2 | esito_penna={"esito":"ok","updated_at":"2020-01-01T00:00:00+00:00"}
etichetta=C1-2 typo prescrizione       | gettone_avanzato=false | valore_in_riga=2020-01-01 00:00:00+00 | colore_prescrizione=B1 | esito_penna={"esito":"ok","updated_at":"2020-01-01T00:00:00+00:00"}
etichetta=C1-3 contatore               | gettone_avanzato=false | valore_in_riga=2020-01-01 00:00:00+00
etichetta=C1-4 cambio vero             | gettone_avanzato=true  | valore_in_riga=2026-08-08 20:41:26.9628+00
etichetta=C1-5 updated_at falso        | gettone_avanzato=false | valore_in_riga=2020-01-01 00:00:00+00
etichetta=C1-6 salvataggio a vuoto     | gettone_avanzato=false | valore_in_riga=2020-01-01 00:00:00+00

etichetta=C2-1 denti solo codice colore | gettone_avanzato=true  | valore_in_riga=2026-08-08 20:41:26.9628+00 | array_denti_identici=true | codici_denti=0M2 | esito_penna={"esito":"ok","updated_at":"2026-08-08T20:41:26.9628+00:00"}
etichetta=C2-2 typo prescrizione       | gettone_avanzato=true  | valore_in_riga=2026-08-08 20:41:26.9628+00 | colore_prescrizione=B1
etichetta=C2-3 contatore               | gettone_avanzato=false | valore_in_riga=2020-01-01 00:00:00+00
etichetta=C2-4 cambio vero             | gettone_avanzato=true  | valore_in_riga=2026-08-08 20:41:26.9628+00
etichetta=C2-5 updated_at falso        | gettone_avanzato=true  | valore_in_riga=2026-08-08 20:41:26.9628+00
etichetta=C2-6 salvataggio a vuoto     | gettone_avanzato=false | valore_in_riga=2020-01-01 00:00:00+00
```

🔴 **`C1-1` è il caso che il mandato chiedeva di misurare, ed è peggiore di come si racconta.** La
penna `lavoro_denti_sostituisci_atomica` **riesce** (`esito: ok`), scrive davvero i denti
(`codici_denti=0M2`, erano `0M1`), gli array denormalizzati restano identici — e **restituisce al
chiamante il gettone VECCHIO**. Cioè: due persone che tengono lo stesso gettone superano entrambe il
controllo, e quella penna fa **`DELETE` di tutta la collezione + `INSERT`**. L'aggiornamento perso è
**totale**, e la penna lo aveva previsto per iscritto nel proprio commento.

🔴 **`C1-2`**: la penna del typo scrive la prescrizione (`colore_prescrizione=B1`) e restituisce il
gettone vecchio: il suo controllo di concorrenza diventa **inerte**.

✅ **`C1-3` = `C2-3` = pinzato**: il critico del mandato è chiuso da **entrambe** le forme. La
deviazione non compra il critico — compra le due penne.

✅ **`C1-5` / `C2-5`**: in nessuna delle due forme il valore falso `2000-01-01` atterra. La sonda 7
del panel regge nello **scopo**; nella **lettera** no, come il resoconto dichiara (in C2 diventa
`now()`, non `OLD`).

**Conteggio: forma ratificata 4 su 6 · forma spedita 6 su 6. La differenza è `- 'updated_at'`.**
➡️ **La deviazione dell'esecutore è confermata da una misura indipendente.**

## SONDA B2 — chi può far ripartire `now()`? (permessi, con `SET LOCAL ROLE`)

```
q=ESITO | gettone_spostato=false | valore_in_riga=2026-08-05 18:48:23.594252+00
q=ACL refresh_dashboard_cache | proacl={postgres=X/postgres,service_role=X/postgres} | prosecdef=true
q=ACL trg_refresh_dashboard   | proacl={=X/postgres,…,authenticated=X/postgres,…} | prosecdef=false
```
Errore intercettato dal ramo `EXCEPTION`: `42501 permission denied for function refresh_dashboard_cache`.
➡️ Nessuno scrive `lavori` dal browser. Il gesto di I2 resta dentro il codice di server. (Dettaglio in I2.)

## SONDA C — il catalogo vivo, punto per punto del mandato §10

```
LEDGER   | 20260808195344 | lavori_gettone_solo_se_cambia          ← registrata
TRIGGER  | trg_lavori_updated_at  → lavori_set_updated_at   BEFORE UPDATE   ← RIAGGANCIATO (B1 chiuso)
TRIGGER  | trg_lavori_ritardo     → check_lavoro_ritardo    BEFORE INSERT OR UPDATE
TRIGGER  | _audit_lavori          → _audit_trigger_fn       AFTER
TRIGGER  | trg_dashboard_lavori   → trg_refresh_dashboard   AFTER
ACL      | lavori_set_updated_at  | {postgres=X/postgres,service_role=X/postgres} | search_path=public, pg_temp
ACL      | trigger_set_updated_at | {=X/…,anon=X/…,authenticated=X/…,service_role=X/…}   ← INTATTA
CONDIVISA_CORPO | trigger_set_updated_at → «NEW.updated_at = now();»          ← INTATTA
CONDIVISA_USI   | 36 trigger ancora legati alla condivisa                     ← non è stata sfilata a nessuno
```
✅ `anon`/`authenticated` **non** hanno `EXECUTE` sulla funzione nuova. ✅ `search_path` fissato.
✅ `COMMENT` presente e spiega perché è separata dalla condivisa.

**E il corpo vivo è identico al file, non «somigliante»** — confronto normalizzato fra
`pg_proc.prosrc` e il blocco `AS $f$ … $f$` della migration:
```
CORPO VIVO == CORPO NEL FILE: True
```

## Ordine e forza del controllo anticipato (mandato §5) — letto nel sorgente

- `…/riemetti/route.ts`: porta **③** (idempotenza sull'evento) alle righe `291-343`, con il `return`
  `200 { gia_fatto: true }`; il controllo nuovo **③-bis** alle righe `344-378`. ✅ **Sta dopo.**
- `stessoIstante()` (`:65-71`) usa `Date.parse` → **millisecondo**, e restituisce `null` (= passa la
  mano) su tutto ciò che non è interpretabile. ✅ **Più debole** del `timestamptz` della RPC:
  `Z` vs `+00:00` e le differenze sotto il millisecondo **non** producono il 409 permanente.
- Il controllo dentro la RPC **c'è ancora**, letto dal catalogo:
  `IF p_atteso_updated_at IS NOT NULL AND v_gettone IS DISTINCT FROM p_atteso_updated_at THEN RETURN … 'conflitto' …` (riga 159 di `correggi_e_riemetti_atomica`).

---

# LE MUTAZIONI

**Base:** `npx vitest run` sui quattro file toccati → `4 passed (4)` · `145 passed (145)`.
Ogni mutazione è stata applicata, misurata e **ripristinata con `git checkout --`**; l'albero è stato
riverificato pulito dopo ognuna.

## Sei delle tredici dichiarate — **6 su 6 accese, tutte sull'asserzione giusta**

| # | mutazione | esito | asserzione che si accende |
|---|---|---|---|
| **M1** | controllo anticipato spostato **prima** della porta d'idempotenza | 🔴 1 rossa | «🔴 il controllo anticipato viene DOPO la porta d'idempotenza: un ritentativo legittimo NON diventa un conflitto» |
| **M2** | `stessoIstante` → confronto fra **stringhe** (`return a === b`) | 🔴 3 rosse | «il confronto è per ISTANTE, non per forma testuale: «Z» e «+00:00»…» · «i microsecondi non fanno scattare il filtro» · «nemmeno un gettone illeggibile nel corpo» |
| **M4** | il 409 anticipato **non porta** il gettone | 🔴 1 rossa | «…e il 409 anticipato porta il gettone FRESCO, quello letto dalla riga» |
| **M6** | la PATCH **rimette** `updated_at` nel carico | 🔴 **5** rosse (il resoconto ne dichiara 4) | le tre della scorciatoia + «① il carico dell'UPDATE NON contiene `updated_at`» + la sentinella «⚖️ D323 — `updated_at` NON entra nel carico» |
| **M7** | tolta la **guardia del carico vuoto** | 🔴 3 rosse | «② un corpo senza nessun campo dell'allowlist NON scrive e risponde 200, mai 500» · «②-bis mezza coppia di colore» · «②-ter non ingoia un avviso» |
| **M10** | «Ricarica e riprendi» torna a chiamare `ricomincia` | 🔴 3 rosse | ««Ricarica e riprendi» TIENE le correzioni digitate: riprende davvero» · «il tasto torna premibile» · «sul 409 il foglio raccoglie il gettone fresco» |

## Mutazioni NUOVE — quattro restano VERDI, tre sono sulla migration

| # | mutazione nuova | esito |
|---|---|---|
| **N1** | migration: colonna esente cambiata (`post_consegna_correzioni` → `numero_cassetta`) | 🟢 **VERDE** `145/145` |
| **N2** | migration: **rimessa la forma ratificata** (`- 'updated_at'`) | 🟢 **VERDE** `145/145` |
| **N3** | migration: **trigger non riagganciato** (= difetto B1 del brief) | 🟢 **VERDE** `145/145` |
| **N5** | tolta la risincronizzazione `gettoneDeiProps` in `DevoIntervenire` | 🟢 **VERDE** `145/145` |

E due nuove che invece **si accendono**, quindi la rete c'è dove è stata tesa:

| # | mutazione nuova | esito |
|---|---|---|
| **N4** | il 409 anticipato porta il gettone **STANTÌO** (`updated_at: atteso`) invece di quello fresco | 🔴 1 rossa — «il 409 anticipato porta il gettone FRESCO, quello letto dalla riga» |
| **N6** | il corpo torna a mandare `voci.updatedAt` invece del gettone di stato | 🔴 2 rosse — «dopo una riemissione riuscita il gettone AVANZA» · «sul 409 il foglio raccoglie il gettone fresco» |
| **N7a** | il foglio **riconverte** il gettone sul ramo del **successo** (`new Date(x).toISOString()`) | 🔴 1 rossa — «dopo una riemissione riuscita il gettone AVANZA: la seconda correzione parte da quello nuovo» |
| **N7b** | il foglio **riconverte** il gettone sul ramo del **409** (dentro `esitoDiErrore`) | 🔴 1 rossa — «sul 409 il foglio raccoglie il gettone fresco, e il tentativo dopo parte da quello» |

🔑 **N7a + N7b chiudono il punto ⑥ del mandato («le prove devono portare un valore con i
microsecondi: rompile»), ed entrambi i rami sono coperti** — successo **e** 409, come chiedeva il
punto. I valori delle fixture li portano davvero — `'2026-08-08T10:54:08.314024+00:00'`,
`'2026-08-08T10:20:30.123456+00:00'`, `'2026-08-08T12:34:56.654321+00:00'`,
`'2026-08-08T10:54:08.314999+00:00'` — e ho verificato che troncarli **rende rossa** la prova, invece
di fidarmi del commento che lo dichiara.

---

# FASE 7 — RILANCIATA DA ME

```
$ npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"

 Test Files  449 passed | 6 skipped (455)
      Tests  5676 passed | 68 skipped (5744)
   Duration  134.21s
✓ Compiled successfully in 6.8s
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde
✅ reduced-motion
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti
✅ verifica «full» registrata
VERIFY_EXIT=0
```

**Base del brief: 5659 | 68 su 454 → misurato: 5676 | 68 su 455.** Coincide con la dichiarazione
dell'esecutore, cifra per cifra. `timeout: 600000`, uscita letta **da variabile**.
📌 I **6 file saltati** sono `tests/integration/**`, che si escludono da soli senza `SUPABASE_DB_URL`
(v. il rilievo I1).

---

# ✅ COSA CONFERMO DEL RESOCONTO

- **La deviazione di un token: giustificata**, e la prova regge a una riproduzione indipendente.
- **Il difetto B1 era reale**: senza `DROP/CREATE TRIGGER` la migration sarebbe stata un **no-op verde**.
  Il trigger vivo punta alla funzione nuova.
- **Il difetto B3 era reale**: `.update({})` → `PGRST116`, e le **tre strade** ci arrivano davvero.
- **B6**: `payload.updated_at = new Date().toISOString()` stava alla riga **803**; ha ragione il brief.
- **La riga del verbale è stata emendata** (`f06408ba`) e il testo dell'emendamento **corrisponde al
  corpo che ho letto dal catalogo**. ➡️ **Quel punto è chiuso**, non lo porto come rilievo aperto.
- **`_audit_lavori` produrrà righe con `old_data.updated_at == new_data.updated_at`** (R3): confermato
  per costruzione (trigger AFTER, pinzatura nel BEFORE). Fuori mandato, già riferito.

---

# 🛑 CHE COSA **NON** HO VERIFICATO — per intero

1. **Niente prova a schermo.** Nessuna FASE 9, nessun gate estetico L2, nessun viewport, nessun tema.
   Sono del Task D-bis.
2. 🔴 **Il comportamento del `Sheet` v3 alla chiusura programmatica, ed è la domanda aperta più
   scomoda che lascio.** `ricaricaERiprendi` chiude il foglio con `setFase('chiuso')`, ma il foglio è
   montato come `<Sheet aperto={fase !== 'chiuso'} onChiudi={ricomincia}>` (`:865`) — e `ricomincia`
   fa `setCorrezioni({})`. **Se su un browser vero la chiusura programmatica facesse partire anche
   `onChiudi`** (gli overlay v3 tengono una entry di history, `storia-overlay.ts`), le correzioni
   verrebbero cancellate **dopo** essere state tenute, e il difetto §5 del brief tornerebbe intero.
   In jsdom quel meccanismo è finto, quindi **le prove unitarie non possono rispondere**, e io non ho
   acceso l'app. ➡️ **Da guardare in FASE 9**, insieme alle due cose che il resoconto già elenca.
3. **Il conflitto falso end-to-end su due transazioni committate.** Non riprodotto: accetto
   l'argomento dell'esecutore (ogni domanda che *discrimina fra le due forme* si risolve contro un
   `OLD` committato, quindi in una sola transazione annullata) — e la mia sonda A lo dimostra.
4. **`npm run test:integration` non l'ho lanciato**, quindi non so se le prove di integrazione
   esistenti passino oggi contro il banco.
5. **Il costo di `to_jsonb`** su volumi veri: non misurato (299 righe in tabella).
6. **La diff per intero.** Ho letto i **quattro file di produzione** cambiati, la migration,
   `supabase/schema.sql` e i **nomi delle asserzioni** delle prove nuove — **non il corpo di ogni
   prova** (3.350 righe di diff, di cui ~1.400 di documenti).
7. **RLS e isolamento tenant oltre `lavori`**: ho letto le sei policy di `lavori` e i permessi di
   colonna; non ho riverificato il resto del modello.
8. **Le due mutazioni dichiarate M3, M5, M9, M11, M12, M13** non le ho riprodotte (ne ho fatte sei su
   tredici, come chiedeva il mandato).
9. **Fuori mandato, non riesaminati** (già riferiti altrove): `ddc_lavoro_attiva_unique` mancante da
   `atto-unico-errori.ts` · i sette 409 indistinguibili · `useLavoroForm.ts:291` col `?? null` ·
   il registro di D324.
10. **Non ho corretto niente.** Nessun file di produzione è stato lasciato modificato: ogni mutazione
    è stata ripristinata e l'albero riverificato (`git status --porcelain` → solo il `.diff` non
    tracciato che il mandato mi ha dato in ingresso, più questo documento).

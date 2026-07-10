# Portale Dentista v2 — Fatturazione concordata

**Data:** 10 luglio 2026 · **Rev. 2** (post-audit multi-advisor: architettura + appsec + SRE, 10/07 — tutti i finding bloccanti/importanti recepiti) · **Stato:** approvata da Francesco a sezioni — in attesa di review della rev. 2
**Sostituisce:** il modello di emissione automatica dell'Ondata 4a-server (spec `2026-07-09-ondata-4a-server-consegna-fiscale-design.md`), **interrotta al Task 8** su decisione di Francesco. Vedi §10 per lo stato ereditato.
**Dominio critico** (fiscale + portale esposto) → percorso Grande BP-2. Gate mockup obbligatorio per ogni schermata nuova (CLAUDE.md §0B).

---

## 1. Principio

**La fatturazione è una decisione concordata col clinico, mai un automatismo.** Alla consegna non nasce alcun documento fiscale e nessun timer emette nulla. I lavori consegnati entrano nella lista del dentista committente sul suo portale; il dentista **propone** cosa fatturare e cosa no; il laboratorio **conferma**; solo i lavori confermati `fatturare` entrano nella fatturazione (manuale/batch, invariata). Il portale del dentista è l'anello di congiunzione tra laboratorio e cliente: lista da fatturare, storico fatture, situazione economica.

## 2. Decisioni ratificate da Francesco (10/07)

| # | Decisione | Scelta | Alternative scartate |
|---|---|---|---|
| D1 | Valore dell'indicazione del dentista | **Proposta — il lab conferma sempre** | Vincolante; solo-lab (portale informativo) |
| D2 | Abilitazione per cliente | **Interruttore per-cliente nella scheda cliente**, OFF di default | Funzione attiva per tutti |
| D3 | Dove il lab conferma | **Scadenzario cliente** — sezione "Lavori in attesa di decisione" esistente, arricchita con la proposta | Sezione dedicata trasversale; notifica+conferma al volo |
| D4 | Contenuto lista dentista | **Tutti i consegnati non fatturati, con prezzi e totale** + (ondate 2-3) storico fatture scaricabili e situazione economica | Solo in_attesa; senza prezzi |
| D5 | Protezione dati economici | **Link + PIN a 6 cifre** (sezioni economiche dietro PIN; il resto del portale resta a solo link) | Solo link; account autenticato |
| D6 | Vita della proposta | **Modificabile finché il lab non conferma; poi congelata** (riapre solo il lab) | One-shot; sempre modificabile |
| D7 | Architettura proposta | **Approccio A: campi sul lavoro** (`proposta_dentista`, `proposta_at`), decisione raggiungibile solo dal lab | Tabella dedicata proposte; scrittura diretta ratificata |

## 3. Ondate (spec unica, 4 piani di implementazione)

**Ondata 0 — Pulizia 4a + fix indipendenti dal modello.** (URGENTE — audit I-4: con le migration DdC già applicate al DB live, il primo annullo+riconsegna reale può creare una seconda DdC che i lettori attuali non gestiscono. Verifica-dati 10/07: 0 DdC in stati a rischio — siamo in tempo.)
1. **Rimozione dell'emissione fiscale inline alla consegna** (audit B-1): lo Step 6 di `orchestraConsegna` (`src/lib/consegna/orchestrate.ts:263-313`, pre-esistente alla 4a) crea OGGI in produzione un draft `fatture` + XML consumando un progressivo, per ogni cliente con SDI/PEC. Viola il principio §1 e non setta `incluso_in_fattura` (bug doppia-fatturazione auto+batch). Va rimosso integralmente, con test di regressione: consegna con cliente fatturabile → **zero righe in `fatture`, zero progressivi consumati**.
2. **`fatture.lavoro_id` valorizzato dalla fatturazione** (audit B-2): oggi NESSUN writer scrive `lavoro_id` → il gate annullo sarebbe un no-op. Il batch (`/api/fatture/batch`, loop 1 fattura ↔ 1 lavoro) scrive `lavoro_id` nell'INSERT (l'indice `fatture_lavoro_attiva_unique` già applicato lo protegge). Le fatture pre-esistenti restano NULL (finestra 10 min già chiusa, nessun backfill).
3. **Migration di pulizia** in UNA transazione, in quest'ordine (audit I-1, SRE-2): (a) unschedule **guardato** dei job (`SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('outbox-emissione-tick','outbox-sorveglianza')` — in prod sono già rimossi, un unschedule nudo fallirebbe; il guardato serve per replay/ambienti nuovi dove i job rinascono dalla history); (b) `DROP FUNCTION IF EXISTS` di `outbox_tick`, `outbox_sorveglianza`, `outbox_prepara_draft`, `outbox_claim_batch` (quest'ultima PRIMA del drop tabella: dipendenza di catalogo `RETURNS SETOF fatture_outbox`); (c) `DROP FUNCTION` esplicito della vecchia firma `consegna_finalizza_atomica(uuid, uuid, boolean, integer)` + `CREATE` della nuova firma senza parametri outbox (mai `CREATE OR REPLACE` con firma diversa: creerebbe un overload orfano — lezione P2-9) e `CREATE OR REPLACE` di `annulla_consegna_atomica` con corpo outbox-free; REVOKE/GRANT rifatti su ogni firma nuova; (d) `DROP TABLE fatture_outbox, outbox_heartbeat, outbox_alerts`; (e) `DROP EXTENSION pg_net` (audit F8: col nuovo modello non serve a nulla; eliminarla chiude alla radice il nodo dei grant non revocabili su Supabase gestito — v. §10).
4. **Adattamento RPC**: `consegna_finalizza_atomica(p_lavoro_id, p_laboratorio_id)` = solo transizione di stato atomica con verifica righe; `annulla_consegna_atomica` sostituisce il claim outbox con il **doppio gate fiscale**: (i) esiste fattura non `rifiutata` con `lavoro_id = lavoro` → `fattura_gia_emessa` (409, messaggio nota di credito); (ii) cintura: `lavori.incluso_in_fattura = true` → stesso 409 (copre fatture create da codice che non scrive ancora `lavoro_id`).
5. Fix ereditati dalla 4a, da eseguire (erano i Task 9, 11, 12, 13, 14 del piano 4a, già progettati): gate B1 stato consegnabile server-side in `orchestraConsegna` (`stato_non_consegnabile` → 422 + rilascio lock); route annullo sottile sulla RPC atomica con `FINESTRA_ANNULLO_MS` (10 min — la costante è GIÀ in prod nella route dal mini-fix del 10/07) e mappatura esiti su 200/400/404/409/500; `generateDdC` (guard + recovery 23505 `:130-135`) e gli 11 lettori DdC filtrano `stato <> 'annullata'`.
6. **Pulizia costanti** (audit M-2): rimuovere da `src/lib/consegna/costanti.ts` le costanti outbox-only (`MAX_TENTATIVI_EMISSIONE`, `OUTBOX_BATCH_MAX`, `OUTBOX_TIME_BUDGET_MS`, `WATCHDOG_IN_LAVORAZIONE_MIN`); restano `STATI_CONSEGNABILI`, `FINESTRA_ANNULLO_MS`, `isStatoConsegnabile`.
7. **FASE 6b post-pulizia**: `npx supabase gen types` + `npx tsc --noEmit` (i tipi attuali non riflettono lo schema live: il gate 4a si è fermato prima del regen).
8. NON si eredita: endpoint cron, Vault/CRON_SECRET, admin "Coda emissione", idempotenza `generaFatturaPA` su ripresa (era per il cron; il batch manuale resta invariato). `ConsegnaResult.fattura` resta `null`; la 4b UI mostrerà lo stato della decisione, non una fattura in arrivo.

**Ondata 1 — Il cuore: lista + proposta + conferma.** Portale: sezione "Da fatturare" dietro PIN, proposta per riga, stampa. Lab: interruttore+PIN in scheda cliente, conferma nello scadenzario, push aggregata. È l'ondata che chiude il requisito che ha fermato la 4a.

**Ondata 2 — Storico fatture nel portale.** Fatture emesse verso il cliente, scaricabili in PDF con signed URL (pattern B5, come DdC/Buono). Dietro PIN. **Pre-check obbligatorio (audit I-6):** `generaFatturaPA` oggi persiste `getPublicUrl` degli XML in `fatture.xml_url` — verificare la visibilità del bucket `fatture-pdf`: se pubblico, migrare a signed URL anche i consumer lab-side e smettere di persistire URL pubblici, altrimenti si protegge con PIN una porta con la finestra aperta.

**Ondata 3 — Situazione economica.** Saldo, fatture da pagare/pagate, pagamenti registrati — le stesse query dello scadenzario lato lab (`src/lib/contabilita/`), presentate lato dentista. Dietro PIN.

Ogni ondata è utile da sola e passa da: piano → mockup (per le UI) → TDD → review → QA lab E2E → merge.

## 4. Modello dati (Ondata 1 salvo indicato)

**`lavori`** (nuove colonne, additive):
- `proposta_dentista text NULL CHECK (proposta_dentista IN ('fatturare','non_fatturare'))` — scrivibile SOLO dall'API portale.
- `proposta_at timestamptz NULL`.
- Congelamento: l'API portale rifiuta proposte se `decisione_fatturazione <> 'in_attesa'` o `incluso_in_fattura = true`. Nessun trigger: il gate sta nell'API (unica scrittrice).

**`clienti`** (nuove colonne, additive):
- `portale_fatturazione_attiva boolean NOT NULL DEFAULT false` — l'interruttore D2.
- `portale_pin_hash text NULL` — formato `scrypt$N$r$p$salt$hash` con **parametri espliciti** (N=2^15, r=8, p=1), salt casuale 16 byte per cliente, e input = `HMAC-SHA256(PORTALE_PIN_PEPPER, pin)` dove `PORTALE_PIN_PEPPER` è un segreto server-side (env Vercel, MAI nel DB) — audit F1: senza pepper un PIN a 6 cifre (10^6) si cracka offline da qualsiasi dump del DB. Mai in chiaro, mai loggato, mai in risposta API. Alla creazione: blocklist PIN banali (000000, 123456, 111111, sequenze e date evidenti).
- `portale_pin_tentativi int NOT NULL DEFAULT 0` + `portale_pin_bloccato_fino_a timestamptz NULL` — anti brute-force: 5 tentativi errati → blocco 15 min (solo sezione economica). **Incremento atomico single-statement** (audit F4): `UPDATE ... SET portale_pin_tentativi = portale_pin_tentativi + 1 WHERE ... RETURNING`, mai check-then-increment; reset a 0 solo su verifica riuscita; test di concorrenza obbligatorio.
- `portale_pin_generation int NOT NULL DEFAULT 0` — incrementato a ogni set/reset del PIN: invalida tutte le sessioni economiche in corso (v. §5 cookie).

**Audit (migration additiva su `portale_accessi`** — audit I-3: la tabella attuale non ha colonne per il dettaglio): `lavoro_id uuid NULL REFERENCES lavori(id)` + `dettaglio jsonb NULL`. Azioni nuove (audit F9): `proposta_fatturazione` (con lavoro_id e valore), `view_fatturazione`, `lista_stampata`, `pin_ok`, `pin_errato`, `pin_bloccato`, `pin_impostato`/`pin_reimpostato` (con **autore lab** nel dettaglio), `interruttore_on`/`interruttore_off` (con autore), e in Ondata 2 `download_fattura`. Gli eventi economici includono IP e user-agent (uniformare: oggi `[documento]/route.ts` logga senza IP) e il loro insert NON viene ingoiato in silenzio (fail-loud o alert-loud). Retention log: 24 mesi con purge (audit F10). La storia completa delle proposte vive qui (sul lavoro resta solo l'ultima — limite accettato di D7).

**Eredità 4a che resta in schema (già applicata al DB live, riusata):** `fatture.lavoro_id` + indice UNIQUE parziale `fatture_lavoro_attiva_unique` (anti doppia emissione, e ora base del gate annullo); `dichiarazioni_conformita.stato = 'annullata'` + indice `ddc_lavoro_attiva_unique`; costanti `src/lib/consegna/costanti.ts` (`STATI_CONSEGNABILI`, `FINESTRA_ANNULLO_MS = 10 min`).

**Rimozione (Ondata 0):** v. §3 punto 1.

## 5. Portale dentista (Ondata 1)

- **Due livelli di accesso:** tutto ciò che esiste oggi (lavori in corso, consegnati, DdC/Buono) resta a solo link+token. Le sezioni economiche (lista da fatturare; poi fatture e saldo) richiedono il PIN.
- **PIN:** 6 cifre, tastierino numerico mobile-first. Verificato server-side. Blocco 15 min dopo 5 errori, con countdown visibile; il resto del portale resta usabile.
- **Sessione economica (cookie — specifica vincolante, audit F2):** nasce SOLO dalla risposta del POST pin riuscito, valore interamente generato dal server (anti-fissazione). Firma HMAC-SHA256 con `PORTALE_SESSION_SECRET` (env dedicata, distinta dal pepper). Payload: `{cliente_id, exp, pin_generation}`. Verifica su OGNI richiesta economica: firma valida, `exp` non passato (durata 30 min, non rinnovabile silenziosamente), `cliente_id` del cookie **uguale** al cliente risolto dal token nel path (binding cookie↔token: la sessione del cliente A non vale sul link del cliente B), `pin_generation` corrente (il cambio PIN invalida tutte le sessioni), interruttore ancora ON. Attributi: `HttpOnly; Secure; SameSite=Strict`.
- **CSRF (audit F3):** `SameSite=Strict` + check `isSameOrigin(req)` su TUTTE le POST del portale (pin e proposta), come già fanno le route lab.
- **Sezione "Da fatturare"** (solo se interruttore ON): tutti i lavori `consegnato` + `incluso_in_fattura = false`, senza limite, raggruppati per mese. Riga: numero lavoro, tipo dispositivo, data consegna, **prezzo**; footer: totale dei "fatturare". Niente nomi paziente in chiaro (iniziali, come già fa il portale). Su ogni riga toggle **Fatturare / Non fatturare**: scrive la proposta, modificabile finché il lab non conferma (D6). Righe confermate: bloccate, "✓ Confermato dal laboratorio" (se il lab ha scelto diversamente dalla proposta, mostra la decisione del lab). Le confermate `fatturare` restano visibili finché non finiscono in fattura, poi passano allo storico (Ondata 2); le confermate `non_fatturare` restano come memoria nel loro gruppo-mese.
- **Stampa:** bottone "Stampa lista" → layout print CSS dedicato (intestazione lab + studio, righe, totali, data); su mobile equivale a "Salva PDF". L'azione va in audit.

## 6. Lato laboratorio (Ondata 1)

- **Scheda cliente** (`/clienti/[id]`): blocco "Portale — fatturazione concordata": interruttore ON/OFF + gestione PIN (impostazione/cambio; mai visualizzato dopo il salvataggio, solo "PIN impostato ✓") + bottone **"Rigenera link"** (`portale_token = gen_random_uuid()` — audit F6: nessuna rotation esiste oggi e il TTL è 1 anno). OFF nasconde subito la sezione al dentista senza cancellare dati. **Prerequisito (audit I-2): la PATCH clienti attuale è una BLOCKLIST (`IMMUTABLE` + passthrough del resto del body, `clienti/[id]/route.ts:123-141`) — va convertita ad allowlist esplicita PRIMA di aggiungere le colonne portale**, altrimenti chiunque nel lab potrebbe scrivere un hash arbitrario o azzerare i contatori anti-brute-force dal body. Il PIN viaggia come campo write-only in chiaro dal form del lab e viene hashato server-side (mai l'hash dal client); l'hash mai restituito in GET. Regola operativa: il PIN si comunica al dentista su canale separato dal link (a voce/telefono), mai nello stesso messaggio.
- **Scadenzario cliente** (`/scadenzario/[cliente_id]`): la sezione "Lavori in attesa di decisione" (`LavoriInAttesaSection`) mostra, se presente, *"<Studio> propone: Fatturare · <quando>"* con il bottone corrispondente evidenziato. La conferma usa la PATCH `decisione-fatturazione` esistente. Decisione ≠ proposta è legittima: vince il lab, il portale mostra la decisione.
- **Notifiche:** push a `titolare` + `front_desk` quando un dentista invia/cambia proposte, **aggregata per sessione di proposte** ("Dott. Rossi ha proposto la fatturazione di N lavori"), mai una per riga. Mai prezzi né saldi nelle push.

## 7. API (Ondata 1)

| Endpoint | Cosa fa | Guardie |
|---|---|---|
| `POST /api/portale/[token]/pin` | Verifica PIN, apre sessione economica (cookie firmato, scadenza breve) | token valido+TTL; interruttore ON; conteggio tentativi + blocco 15 min; 401 uniforme |
| `GET /api/portale/[token]/fatturazione` | Lista consegnati non fatturati con prezzi + stato proposte/decisioni | token; interruttore ON; sessione PIN valida |
| `POST /api/portale/[token]/fatturazione/[lavoro_id]` | Scrive `proposta_dentista` + `proposta_at` | come sopra + lavoro del cliente del token (`laboratorio_id`+`cliente_id`), `stato='consegnato'`, `decisione_fatturazione='in_attesa'`, `incluso_in_fattura=false`; altrimenti 409/404. **UPDATE condizionale single-statement** (audit I-5: tutte le guardie nella WHERE, 0 righe → rileggi e mappa 404/409 — mai check-then-write, o la conferma lab concorrente ha una finestra TOCTOU). Colonne hardcoded nell'UPDATE, mai spread del body — scrive SOLO i 2 campi proposta |
| PATCH clienti (esistente, estesa) | interruttore + PIN (write-only) | allowlist; hash mai in GET/response |
| PATCH decisione-fatturazione (esistente, invariata) | conferma del lab | già presente (titolare/front_desk) |

Regole trasversali: ogni query filtrata `laboratorio_id` + `cliente_id` del token (fail-closed); risposte minime; errori senza leak (nessun messaggio Postgres grezzo); nessun dato economico in log/push; sulle route economiche risposta **uniforme** per token invalido/scaduto (audit F13 — niente oracolo di esistenza); rate limit per-IP sul POST pin (audit F5, es. 20 req/15 min — il lockout-DoS del dentista legittimo resta accettato: lo sblocca il lab reimpostando il PIN, documentato nel runbook). Invariante D7 blindata: `proposta_dentista`/`proposta_at` NON entrano MAI in `PATCHABLE_FIELDS` della PATCH lavori (commento-sentinella nel file + test di regressione).

## 8. Edge case (posizioni esplicite)

- Interruttore OFF a metà sessione → sezione sparisce al refresh con messaggio cortese; proposte già scritte restano (inerti).
- Proposta su lavoro appena confermato dal lab → 409; il portale ricarica e mostra la riga bloccata.
- Lavoro annullato entro la finestra 10 min dopo una proposta → il lavoro esce dalla lista (non più `consegnato`); la proposta resta in audit, il campo si azzera al ritorno in `pronto` (reset aggiunto all'annullo nell'Ondata 1, quando i campi esistono).
- PIN dimenticato → il lab lo reimposta dalla scheda cliente (nessun recupero self-service).
- Cliente senza PIN impostato ma interruttore ON → la sezione invita a chiedere il PIN al laboratorio (non si apre).
- Lavori consegnati prima del deploy → compaiono in lista come tutti (nessun backfill necessario: il criterio è lo stato, non una data).
- Due proposte simultanee sullo stesso lavoro (stesso studio, due dispositivi) → ultima vince (UPDATE idempotente), audit registra entrambe.
- Conferma lab mentre il dentista sta guardando la lista → alla prossima azione il portale si riallinea (409 + refresh).
- **Riapertura della decisione da parte del lab** (decisione → `in_attesa`): azzera anche `proposta_dentista`/`proposta_at` (audit M-3 — mai rimostrare come attiva una proposta pre-conferma stantia); il dentista riparte da zero su quel lavoro.
- **Annullo consegna + riconsegna:** la proposta si azzera (v. sopra); la `decisione_fatturazione` già presa invece **sopravvive** (la scelta di fatturazione resta valida per il lavoro riconsegnato — audit M-4, posizione esplicita).
- La lista lab "pronti da fatturare" ha `LIMIT 50` (audit M-5): da rivedere in Ondata 1 se i volumi del flusso portale lo saturano.

## 9. Testing (TDD)

- **API pin:** successo; PIN errato (contatore); 5 errori → blocco con countdown; blocco scaduto → riprova; interruttore OFF → 403; token scaduto → 401; nessun leak di hash; **concorrenza sul contatore** (N richieste parallele non aggirano il limite — audit F4); cookie: binding al cliente del token, invalidazione su cambio PIN (`pin_generation`) e su interruttore OFF, scadenza 30 min.
- **API fatturazione GET:** solo lavori del cliente del token; niente nomi paziente; prezzi presenti; raggruppamento mese.
- **API proposta POST:** scrive solo i 2 campi; 409 su lavoro non `in_attesa`/già in fattura; 404 su lavoro di altro cliente (mai 403 disambiguante); congelamento post-conferma; audit scritto.
- **PATCH clienti:** conversione a allowlist verificata (campi ignoti scartati); hash mai in response; PIN write-only hashato server-side; interruttore OFF nasconde (test integrazione GET fatturazione → 403).
- **Invariante D7:** PATCH lavori con `proposta_dentista` nel body → campo invariato nel DB (test di regressione); CSRF: POST portale senza Origin corretto → 403.
- **Ondata 0:** consegna con cliente fatturabile → zero righe `fatture`, zero progressivi consumati (regressione B-1); batch scrive `lavoro_id`; annullo con fattura collegata o `incluso_in_fattura=true` → 409.
- **Scadenzario:** riga con proposta mostrata; conferma → PATCH esistente; decisione difforme dalla proposta.
- **Ondata 0:** gate B1 (7 stati non consegnabili → 422 + lock rilasciato); annullo → DdC `annullata` con matrice fail-closed; gate fatture reali (fattura esistente → 409); lettori DdC (test per file, lista chiusa §7 spec 4a).
- **QA browser:** lab E2E `00000000-0000-0000-0000-000000000001`, MAI il lab Filippo; 390/768/1280, light+dark per le parti in-app; portale mobile-first.

## 10. Stato ereditato dalla 4a (cosa c'è in produzione OGGI)

Applicate al DB live il 10/07 (gate Step 1, poi interrotto): le 6 migration `20260710090000..092500`. Nessun codice applicativo le usa (i task applicativi 9-18 della 4a non sono mai stati scritti) → zero impatto utente (**verificato dall'audit SRE oggetto per oggetto**, inclusa la neutralità del UNIQUE parziale DdC: 0 righe in stati a rischio sul DB live al 10/07). I 2 job pg_cron sono stati rimossi (`cron.unschedule`) il 10/07 — ATTENZIONE: rinascono su replay della history/ambienti nuovi finché la migration di pulizia non è in history (SRE-2). Vault e env Vercel: mai creati. Nota sicurezza: il REVOKE su `net.*` è no-op su Supabase gestito (oggetti di `supabase_admin`, non revocabili da `postgres`); mitigazione attuale: `net` non è esposto da PostgREST e nessuna SECURITY DEFINER nel repo usa SQL dinamico → nessun percorso SSRF; soluzione definitiva: `DROP EXTENSION pg_net` nell'Ondata 0 (audit F8). **Merge su main (10/07, deciso da Francesco post-audit):** i 6 file migration + costanti Task 1 + mini-fix route annullo (finestra 5→10 min, `FINESTRA_ANNULLO_MS`) + questa spec sono stati mergiati su `main` per chiudere l'hazard di drift history↔file (SRE-1, forward-only, mai retro-delete: i file 4a restano in history come storia anche dopo la pulizia). Audit completo nel ledger `.superpowers/sdd/progress.md` del worktree.

## 11. Rollback

Ondata 0: la migration di pulizia è distruttiva solo verso oggetti mai usati dal codice (tabelle outbox vuote, funzioni senza chiamanti) — rollback = riapplicare i file 4a (in git). Ondate 1-3: colonne additive con default innocui; disattivazione operativa immediata = interruttore OFF per tutti i clienti (nessuna migration necessaria). Le API portale nuove sono isolate sotto `/api/portale/[token]/` — revert del codice senza toccare schema.

## 12. Fuori scope

Invio automatico a SDI (resta manuale); riconciliazione ricevute SDI (post-sp.3); account autenticato per il dentista (il PIN è il livello scelto oggi; un eventuale login vero è evoluzione futura); note/contro-proposte del dentista per riga (richiederebbe approccio B); pagamenti online dal portale; UI PWA consegna (Ondata 4b del piano DS v3, invariata); deprecazione `in_ritardo` (§N2).

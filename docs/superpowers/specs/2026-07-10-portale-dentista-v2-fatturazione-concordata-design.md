# Portale Dentista v2 — Fatturazione concordata

**Data:** 10 luglio 2026 · **Stato:** approvata da Francesco a sezioni (brainstorming 10/07) — in attesa di review della spec scritta
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

**Ondata 0 — Pulizia 4a + fix indipendenti dal modello.**
1. Migration di pulizia: DROP `fatture_outbox`, `outbox_heartbeat`, `outbox_alerts`, RPC `outbox_claim_batch`, `outbox_prepara_draft`, funzioni `outbox_tick`, `outbox_sorveglianza` (i 2 job pg_cron sono già stati rimossi il 10/07). L'estensione pg_net resta installata (inerte, hardening già tentato — v. §10).
2. Adattamento RPC superstiti: `consegna_finalizza_atomica` perde il ramo outbox (resta la transizione di stato atomica con verifica righe); `annulla_consegna_atomica` sostituisce il claim outbox con il **gate sulle fatture reali**: se esiste una fattura non `rifiutata` con `lavoro_id = lavoro` → esito `fattura_gia_emessa` (409, messaggio nota di credito).
3. Fix ereditati dalla 4a, da eseguire (erano i Task 9, 11, 12, 13, 14 del piano 4a, già progettati): gate B1 stato consegnabile server-side in `orchestraConsegna` (`stato_non_consegnabile` → 422 + rilascio lock); route annullo sottile sulla RPC atomica con `FINESTRA_ANNULLO_MS` (10 min) e mappatura esiti su 200/400/404/409/500; `generateDdC` e gli 11 lettori DdC filtrano `stato <> 'annullata'`.
4. NON si eredita: endpoint cron, Vault/CRON_SECRET, admin "Coda emissione", idempotenza `generaFatturaPA` su ripresa (era per il cron; il batch manuale resta invariato). `ConsegnaResult.fattura` resta `null` (nessuna fattura programmata esiste più); la 4b UI mostrerà lo stato della decisione, non una fattura in arrivo.

**Ondata 1 — Il cuore: lista + proposta + conferma.** Portale: sezione "Da fatturare" dietro PIN, proposta per riga, stampa. Lab: interruttore+PIN in scheda cliente, conferma nello scadenzario, push aggregata. È l'ondata che chiude il requisito che ha fermato la 4a.

**Ondata 2 — Storico fatture nel portale.** Fatture emesse verso il cliente, scaricabili in PDF con signed URL (pattern B5, come DdC/Buono). Dietro PIN.

**Ondata 3 — Situazione economica.** Saldo, fatture da pagare/pagate, pagamenti registrati — le stesse query dello scadenzario lato lab (`src/lib/contabilita/`), presentate lato dentista. Dietro PIN.

Ogni ondata è utile da sola e passa da: piano → mockup (per le UI) → TDD → review → QA lab E2E → merge.

## 4. Modello dati (Ondata 1 salvo indicato)

**`lavori`** (nuove colonne, additive):
- `proposta_dentista text NULL CHECK (proposta_dentista IN ('fatturare','non_fatturare'))` — scrivibile SOLO dall'API portale.
- `proposta_at timestamptz NULL`.
- Congelamento: l'API portale rifiuta proposte se `decisione_fatturazione <> 'in_attesa'` o `incluso_in_fattura = true`. Nessun trigger: il gate sta nell'API (unica scrittrice).

**`clienti`** (nuove colonne, additive):
- `portale_fatturazione_attiva boolean NOT NULL DEFAULT false` — l'interruttore D2.
- `portale_pin_hash text NULL` — hash robusto (scrypt via `node:crypto`, mai in chiaro, mai loggato, mai in risposta API).
- `portale_pin_tentativi int NOT NULL DEFAULT 0` + `portale_pin_bloccato_fino_a timestamptz NULL` — anti brute-force: 5 tentativi errati → blocco 15 min (solo sezione economica).

**Audit:** riuso della tabella di audit del portale esistente (quella di `view_lavori`): nuove azioni `proposta_fatturazione` (con lavoro_id e valore), `pin_errato`, `lista_stampata`, `view_fatturazione`. La storia completa delle proposte vive qui (sul lavoro resta solo l'ultima — limite accettato di D7).

**Eredità 4a che resta in schema (già applicata al DB live, riusata):** `fatture.lavoro_id` + indice UNIQUE parziale `fatture_lavoro_attiva_unique` (anti doppia emissione, e ora base del gate annullo); `dichiarazioni_conformita.stato = 'annullata'` + indice `ddc_lavoro_attiva_unique`; costanti `src/lib/consegna/costanti.ts` (`STATI_CONSEGNABILI`, `FINESTRA_ANNULLO_MS = 10 min`).

**Rimozione (Ondata 0):** v. §3 punto 1.

## 5. Portale dentista (Ondata 1)

- **Due livelli di accesso:** tutto ciò che esiste oggi (lavori in corso, consegnati, DdC/Buono) resta a solo link+token. Le sezioni economiche (lista da fatturare; poi fatture e saldo) richiedono il PIN.
- **PIN:** 6 cifre, tastierino numerico mobile-first. Verificato server-side; sessione economica = cookie firmato con scadenza breve, separato dal token del link. Blocco 15 min dopo 5 errori, con countdown visibile; il resto del portale resta usabile.
- **Sezione "Da fatturare"** (solo se interruttore ON): tutti i lavori `consegnato` + `incluso_in_fattura = false`, senza limite, raggruppati per mese. Riga: numero lavoro, tipo dispositivo, data consegna, **prezzo**; footer: totale dei "fatturare". Niente nomi paziente in chiaro (iniziali, come già fa il portale). Su ogni riga toggle **Fatturare / Non fatturare**: scrive la proposta, modificabile finché il lab non conferma (D6). Righe confermate: bloccate, "✓ Confermato dal laboratorio" (se il lab ha scelto diversamente dalla proposta, mostra la decisione del lab). Le confermate `fatturare` restano visibili finché non finiscono in fattura, poi passano allo storico (Ondata 2); le confermate `non_fatturare` restano come memoria nel loro gruppo-mese.
- **Stampa:** bottone "Stampa lista" → layout print CSS dedicato (intestazione lab + studio, righe, totali, data); su mobile equivale a "Salva PDF". L'azione va in audit.

## 6. Lato laboratorio (Ondata 1)

- **Scheda cliente** (`/clienti/[id]`): blocco "Portale — fatturazione concordata": interruttore ON/OFF + gestione PIN (impostazione/cambio; mai visualizzato dopo il salvataggio, solo "PIN impostato ✓"). OFF nasconde subito la sezione al dentista senza cancellare dati. PATCH clienti estesa via allowlist; l'hash mai restituito in GET.
- **Scadenzario cliente** (`/scadenzario/[cliente_id]`): la sezione "Lavori in attesa di decisione" (`LavoriInAttesaSection`) mostra, se presente, *"<Studio> propone: Fatturare · <quando>"* con il bottone corrispondente evidenziato. La conferma usa la PATCH `decisione-fatturazione` esistente. Decisione ≠ proposta è legittima: vince il lab, il portale mostra la decisione.
- **Notifiche:** push a `titolare` + `front_desk` quando un dentista invia/cambia proposte, **aggregata per sessione di proposte** ("Dott. Rossi ha proposto la fatturazione di N lavori"), mai una per riga. Mai prezzi né saldi nelle push.

## 7. API (Ondata 1)

| Endpoint | Cosa fa | Guardie |
|---|---|---|
| `POST /api/portale/[token]/pin` | Verifica PIN, apre sessione economica (cookie firmato, scadenza breve) | token valido+TTL; interruttore ON; conteggio tentativi + blocco 15 min; 401 uniforme |
| `GET /api/portale/[token]/fatturazione` | Lista consegnati non fatturati con prezzi + stato proposte/decisioni | token; interruttore ON; sessione PIN valida |
| `POST /api/portale/[token]/fatturazione/[lavoro_id]` | Scrive `proposta_dentista` + `proposta_at` | come sopra + lavoro del cliente del token (`laboratorio_id`+`cliente_id`), `stato='consegnato'`, `decisione_fatturazione='in_attesa'`, `incluso_in_fattura=false`; altrimenti 409/404. Scrive SOLO i 2 campi proposta |
| PATCH clienti (esistente, estesa) | interruttore + PIN (write-only) | allowlist; hash mai in GET/response |
| PATCH decisione-fatturazione (esistente, invariata) | conferma del lab | già presente (titolare/front_desk) |

Regole trasversali: ogni query filtrata `laboratorio_id` + `cliente_id` del token (fail-closed); risposte minime; errori senza leak (nessun messaggio Postgres grezzo); nessun dato economico in log/push.

## 8. Edge case (posizioni esplicite)

- Interruttore OFF a metà sessione → sezione sparisce al refresh con messaggio cortese; proposte già scritte restano (inerti).
- Proposta su lavoro appena confermato dal lab → 409; il portale ricarica e mostra la riga bloccata.
- Lavoro annullato entro la finestra 10 min dopo una proposta → il lavoro esce dalla lista (non più `consegnato`); la proposta resta in audit, il campo si azzera al ritorno in `pronto` (reset aggiunto all'annullo nell'Ondata 1, quando i campi esistono).
- PIN dimenticato → il lab lo reimposta dalla scheda cliente (nessun recupero self-service).
- Cliente senza PIN impostato ma interruttore ON → la sezione invita a chiedere il PIN al laboratorio (non si apre).
- Lavori consegnati prima del deploy → compaiono in lista come tutti (nessun backfill necessario: il criterio è lo stato, non una data).
- Due proposte simultanee sullo stesso lavoro (stesso studio, due dispositivi) → ultima vince (UPDATE idempotente), audit registra entrambe.
- Conferma lab mentre il dentista sta guardando la lista → alla prossima azione il portale si riallinea (409 + refresh).

## 9. Testing (TDD)

- **API pin:** successo; PIN errato (contatore); 5 errori → blocco con countdown; blocco scaduto → riprova; interruttore OFF → 403; token scaduto → 401; nessun leak di hash.
- **API fatturazione GET:** solo lavori del cliente del token; niente nomi paziente; prezzi presenti; raggruppamento mese.
- **API proposta POST:** scrive solo i 2 campi; 409 su lavoro non `in_attesa`/già in fattura; 404 su lavoro di altro cliente (mai 403 disambiguante); congelamento post-conferma; audit scritto.
- **PATCH clienti:** allowlist; hash mai in response; interruttore OFF nasconde (test integrazione GET fatturazione → 403).
- **Scadenzario:** riga con proposta mostrata; conferma → PATCH esistente; decisione difforme dalla proposta.
- **Ondata 0:** gate B1 (7 stati non consegnabili → 422 + lock rilasciato); annullo → DdC `annullata` con matrice fail-closed; gate fatture reali (fattura esistente → 409); lettori DdC (test per file, lista chiusa §7 spec 4a).
- **QA browser:** lab E2E `00000000-0000-0000-0000-000000000001`, MAI il lab Filippo; 390/768/1280, light+dark per le parti in-app; portale mobile-first.

## 10. Stato ereditato dalla 4a (cosa c'è in produzione OGGI)

Applicate al DB live il 10/07 (gate Step 1, poi interrotto): le 6 migration `20260710090000..092500`. Nessun codice applicativo le usa (i task applicativi 9-18 della 4a non sono mai stati scritti) → zero impatto utente. I 2 job pg_cron sono stati rimossi (`cron.unschedule`) il 10/07. Vault e env Vercel: mai creati. Nota sicurezza: il REVOKE su `net.*` è no-op su Supabase gestito (oggetti di `supabase_admin`, non revocabili da `postgres`); mitigazione: `net` non è esposto da PostgREST → nessun percorso SSRF via API. L'Ondata 0 rimuove le parti outbox e adatta le 2 RPC di consegna/annullo. Branch di lavoro 4a: `worktree-ondata-4a-server` (Task 1-7 committati, review-approvati) — i commit delle costanti e delle migration DdC/lavoro_id si portano avanti, il resto si supera con la migration di pulizia.

## 11. Rollback

Ondata 0: la migration di pulizia è distruttiva solo verso oggetti mai usati dal codice (tabelle outbox vuote, funzioni senza chiamanti) — rollback = riapplicare i file 4a (in git). Ondate 1-3: colonne additive con default innocui; disattivazione operativa immediata = interruttore OFF per tutti i clienti (nessuna migration necessaria). Le API portale nuove sono isolate sotto `/api/portale/[token]/` — revert del codice senza toccare schema.

## 12. Fuori scope

Invio automatico a SDI (resta manuale); riconciliazione ricevute SDI (post-sp.3); account autenticato per il dentista (il PIN è il livello scelto oggi; un eventuale login vero è evoluzione futura); note/contro-proposte del dentista per riga (richiederebbe approccio B); pagamenti online dal portale; UI PWA consegna (Ondata 4b del piano DS v3, invariata); deprecazione `in_ritardo` (§N2).

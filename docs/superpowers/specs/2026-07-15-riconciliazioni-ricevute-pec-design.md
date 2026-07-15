# Spec — Riconciliazioni pendenti + ricevute PEC (ondata R1)

**Data:** 2026-07-15 · **Rev. 2** (riserve panel integrate) · **Owner:** Francesco Formicola · **Dominio:** FatturaPA → percorso GRANDE (BP-2)
**Stato:** design approvato da Francesco (direzione C «parser-first» + contro-movimento, gate 15/07); **validazione panel: 3× CONFERMATA CON RISERVE** (solution-architect, backend-api, appsec-auditor) — tutti i bloccanti e le riserve recepiti in questa revisione (§12).
**Handoff di origine:** `docs/roadmap/2026-07-15-riconciliazioni-handoff.md` (item B, scelto esplicitamente da Francesco).

---

## 1. Problema

Tre stati-limite oggi silenziosi, tutti «post-invio/post-storno» (riserve advisor TD04 2/3 + follow-up N10):

1. **Saldo credito negativo** — al rifiuto di un TD04 il trigger `annulla_effetti_storno_td04()` (migration `20260715140000`, righe 60-63) fa `DELETE` del movimento `storno`; se il credito era già stato applicato il saldo va negativo. La UI lo nasconde: `CreditoDisponibileSection.tsx:18` → `if (disponibile <= 0) return null`.
2. **Collisione storno/ri-fatturazione** — lo stesso trigger lascia `stornata_at` valorizzato sull'originale se il lavoro è stato ri-fatturato (guardia anti-23505 sull'indice `fatture_lavoro_attiva_unique`, righe 28-39). Oggi è solo un «FLAG COMMERCIALISTA» nei commenti SQL: nessuna lista, nessun alert. La transizione a `rifiutata` non ha alcun writer applicativo (solo dashboard Supabase manuale).
3. **Ricevute PEC mai riconciliate** — `send-pec.ts` porta la fattura a `smtp_inviata` e lì si ferma: gli stati `pec_consegnata`/`ricevuta_sdi`/`accettata`/`rifiutata` non hanno writer. Le colonne esiti (`pec_consegnata_at`, `ricevuta_sdi_at`, `codice_esito_sdi`, `messaggio_esito_sdi`, `sdi_risposta_at`, `xml_errori_sdi`) esistono e non sono mai popolate. Il **claim orfano** su `smtp_inviata_at` (crash tra sendMail e UPDATE: fattura `generata` + `smtp_inviata_at` valorizzato) si sblocca oggi solo a mano, dopo verifica della cartella «inviata» (`invio-claim.ts:4-9`; `pec_message_id` NULL NON è prova di non-invio).

## 2. Decisioni

Panel advisor consultato su richiesta esplicita di Francesco (solution-architect, backend-api, appsec-auditor): direzione raccomandata **unanime C «parser-first»**, ratificata da Francesco.

**D-1 — Parser-first, IMAP rinviato.** In questa ondata l'azione primaria dell'operatore è **l'upload del file ricevuta XML** scaricato dalla propria casella PEC; il server parsa, verifica la firma e applica la transizione tramite un writer unico. Il poller IMAP è un'ondata futura che alimenterà la **stessa pipeline** (fetcher intercambiabile). Motivazioni: la credenziale PEC è unica SMTP/IMAP/webmail (nessun gestore offre read-only scoped) → un poller leggerebbe TUTTA la posta certificata del lab (GDPR art. 5.1.c minimizzazione, art. 616 c.p.); pg_net droppato deliberatamente (audit 4a-server); volume reale poche decine di ricevute/mese per lab; time-to-value.

**D-2 — Contro-movimento al posto del DELETE nel trigger** (scelta esplicita di Francesco): ledger credito append-only, storia visibile, audit. **La guardia di idempotenza è a delta, non a esistenza** (bloccante panel rev.2, §6.2): il `NOT EXISTS` romperebbe il ciclo legittimo storno→rifiuto→ri-storno→secondo rifiuto (credito fantasma del secondo storno).

**D-3 — Lo sblocco del claim orfano non è mai automatico.** Condizione bloccante 3/3 advisor: la risoluzione automatica avviene SOLO su evidenza positiva (ricevuta matchata = prova che la mail partì → lo stato avanza e il claim si risolve da solo); il **rilascio** (riabilitare l'invio, rischio doppio invio fiscale) resta manuale, solo `titolare`, con motivo + audit.

**D-4 — Verifica firma XAdES obbligatoria e fail-closed per ogni transizione automatica.** Una ricevuta SdI autentica è firmata XAdES-BES (enveloped) e conforme a `MessaggiTypes_v1.1.xsd`. Header `From:`, oggetto e nome file NON sono autenticazione. Requisiti pinnati in spec (non deferibili al piano): trust anchor = certificato SdI/Sogei **pinnato** (mai truststore di sistema), con procedura di rotazione documentata; qualsiasi errore/eccezione/algoritmo non atteso → `fallita` (mai default a `valida` né `non_applicabile`); `non_applicabile` ammesso SOLO per eventi senza file (`trigger_td04`, `sblocco_claim`, `override_manuale`) — vietato per `origine='upload_verificato'` (CHECK DB); difesa da XML signature wrapping: l'elemento coperto dalla firma deve essere la radice del documento parsato e parser/verifier operano sugli stessi byte. La scelta libreria (xadesjs vs xml-crypto + catena) va risolta con uno **spike come primo task del piano**, con fallback esplicito: se la verifica non è implementabile nei tempi → tutte le ricevute in quarantena e transizioni solo via override titolare.

**D-5 — NS ≠ EC02.** La Notifica di Scarto (NS: fattura mai esistita fiscalmente) è l'**unica** transizione automatica ammessa verso `rifiutata` — semantica coerente col trigger TD04. La Notifica Esito committente negativa (NE/EC02, solo flusso PA: fattura emessa poi rifiutata) NON scrive `rifiutata`: parcheggio in pendenti con flag commercialista. Per i clienti B2B (i dentisti) lo stato terminale positivo è la **RC** (la NE non esiste in B2B): mapping documentato per non aspettare per sempre una `accettata` che non arriverà.

**D-6 — Fix compliance indirizzo SdI dinamico.** `send-pec.ts:124` hardcoda `sdi01@pec.fatturapa.it`, valido solo per il PRIMO invio: con la prima risposta SdI comunica l'indirizzo dedicato `sdiNN` da usare per i successivi (fonte AdE, FAQ modalità di trasmissione). Nuova colonna `laboratori.pec_sdi_address`, destinatario `pec_sdi_address ?? 'sdi01@pec.fatturapa.it'`. L'XML della ricevuta non contiene l'indirizzo mittente PEC → in R1 il campo è editabile in `/impostazioni/pec`; l'IMAP futuro lo popolerà in automatico.

**D-7 — Guardia di monotonia anche sul writer legacy** (bloccante panel rev.2): l'UPDATE post-sendMail di `send-pec.ts:143-152` oggi scrive `stato_sdi='smtp_inviata'` con solo `.eq('id')` — dopo uno sblocco claim + re-invio concorrente con l'applicazione della ricevuta del primo invio, regredirebbe `accettata`→`smtp_inviata`. Fix: aggiungere `.eq('stato_sdi','generata')` all'UPDATE (0 righe → log come oggi, nessun throw: il contratto N10 «mai throw dopo sendMail ok» resta intatto).

## 3. Modello dati (migration)

### 3.1 Colonne nuove
- `fatture.identificativo_sdi TEXT` — popolata al primo match; chiave di conferma per le ricevute successive e per l'assistenza SdI. Indice `(laboratorio_id, identificativo_sdi)` parziale `WHERE identificativo_sdi IS NOT NULL`.
- `laboratori.pec_sdi_address TEXT` — vedi D-6. Aggiunta all'allowlist del `PATCH /api/impostazioni/pec` (pattern allowlist esplicita).

**Non si aggiunge `pec_errore`**: gli errori vivono in `fatture_sdi_eventi.lista_errori` e `fatture.xml_errori_sdi` (evita stato duplicato).

### 3.2 Tabella `fatture_sdi_eventi`
```sql
id uuid PK, laboratorio_id uuid NOT NULL REFERENCES laboratori,
fattura_id uuid NULL REFERENCES fatture,          -- NULL = ricevuta parcheggiata (non matchata / quarantena / EC02)
origine text NOT NULL CHECK (origine IN ('upload_verificato','override_manuale','sblocco_claim','trigger_td04','imap')),
tipo_ricevuta text NULL CHECK (tipo_ricevuta IN ('RC','NS','MC','NE','DT','AT')),
stato_da text NULL, stato_a text NULL,            -- valorizzati dalla RPC al momento dell'applicazione
nome_file_fattura text NULL, nome_file_ricevuta text NULL,   -- nome_file_ricevuta = SOLO metadato informativo (mai chiave)
identificativo_sdi text NULL, esito_committente text NULL CHECK (esito_committente IN ('EC01','EC02')),
lista_errori jsonb NULL,                          -- NS: ListaErrori integrale
esito_verifica_firma text NULL CHECK (esito_verifica_firma IN ('valida','fallita','non_applicabile')),
ricevuta_storage_path text NULL,                  -- bucket privato: le ricevute SdI sono documenti fiscali da conservare
content_sha256 text NULL,                         -- NOT NULL applicativo per origine='upload_verificato'/'imap'
registrato_da uuid NULL,                          -- NULL = sistema (trigger)
motivo text NULL,
created_at timestamptz NOT NULL DEFAULT now(),
CHECK (origine NOT IN ('override_manuale','sblocco_claim') OR motivo IS NOT NULL),
CHECK (origine <> 'upload_verificato' OR esito_verifica_firma IN ('valida','fallita'))
```
- **Idempotenza**: SOLO `UNIQUE (laboratorio_id, content_sha256)` parziale `WHERE content_sha256 IS NOT NULL`. **Nessun vincolo sul nome file** (riserve panel: il nome dell'allegato salvato dal client di posta non è canonico → falsi positivi «duplicata»; e un vincolo per nome sarebbe squattabile da un upload in quarantena che blocca la ricevuta autentica successiva).
- **Lifecycle two-step esplicito** (bloccante panel): l'upload **inserisce** la riga (stato «proposta»: `stato_da`/`stato_a` NULL, parse + verifica firma + match già persistiti); l'applica **completa la stessa riga** via RPC (valorizza `stato_da`/`stato_a` contestualmente all'UPDATE della fattura, transazione atomica). Non si inserisce mai una seconda riga per lo stesso file.
- **Append-only reale, non solo convenzione**: RLS abilitata con SOLA policy SELECT lab-scoped (`public.current_lab_id()`; le parcheggiate con `fattura_id NULL` restano scoped via `laboratorio_id NOT NULL`); `REVOKE INSERT, UPDATE, DELETE ... FROM anon, authenticated` esplicito (difesa in profondità sui default grant); trigger `BEFORE UPDATE OR DELETE` che consente SOLO la valorizzazione dei campi transizione (`stato_da`, `stato_a`, `fattura_id`, `identificativo_sdi`) su riga con `stato_a IS NULL` e vieta tutto il resto (`RAISE EXCEPTION`) — così l'append-only vincola anche `service_role`.

### 3.3 Tipo movimento credito `annullo_storno` — DUE constraint da estendere
In `credito_clienti_movimenti` (definizioni attuali in `20260715110000_credito_storno_nota_credito.sql`):
1. `credito_clienti_movimenti_tipo_check` (righe 20-24): DROP + re-ADD con `'annullo_storno'` nella lista;
2. `credito_clienti_movimenti_check` (shape per-tipo, righe 31-39): DROP + re-ADD con ramo `OR (tipo = 'annullo_storno' AND pagamento_id IS NULL AND fattura_id IS NOT NULL AND lavoro_id IS NULL)`.

Nota di precisione: il DROP+ADD CONSTRAINT prende lock + revalidation scan — accettabile (tabella piccola), ma non è «additivo» in senso stretto; va eseguito in migration dedicata.

### 3.4 Nota drift documentale
`supabase/schema.sql:1414` elenca un CHECK `stato_sdi` obsoleto (`bozza`,`pronta`,…). Il vincolo **live** è corretto (migration `002_fase2_schema.sql:150`: 8 stati `draft`…`scaduta`). `schema.sql` è uno snapshot stantio: nessuna migration necessaria; da non usare come fonte di verità (header di deprecazione/rigenerazione → backlog).

### 3.5 Ordine di deploy (riserva panel)
**Codice prima, migration dopo**: i lettori aggiornati che sottraggono un tipo `annullo_storno` inesistente sono no-op; l'ordine inverso aprirebbe una finestra in cui un `annullo_storno` scritto dal trigger è ignorato da `calcolaCreditoDisponibile` → credito sovrastimato spendibile. (Rischio de facto basso — oggi nessun writer porta a `rifiutata` — ma l'ordine va fissato nel piano.)

## 4. Parser, verifica firma, macchina a stati

### 4.1 Parser (`src/lib/fattura/ricevute/parse-ricevuta-sdi.ts`)
Pure function, zero I/O: `Buffer → { tipo, nomeFileFattura, identificativoSdI, dataOraRicezione, esitoCommittente, listaErrori[] }`.
- XML hardening: entità/DTD disabilitate (`fast-xml-parser` con `processEntities:false` o equivalente), size cap 1 MB, profondità/numero nodi limitati, reject di strutture non conformi a MessaggiTypes.
- Testabile al 100% con fixture dalle specifiche ufficiali SdI (v1.8.1) — nessuna rete, nessuna casella reale.

### 4.2 Verifica firma (`src/lib/fattura/ricevute/verifica-firma.ts`)
Verifica XAdES-BES enveloped prima di ogni transizione automatica, con i requisiti fail-closed pinnati in **D-4** (trust anchor pinnato, error→`fallita`, difesa signature wrapping, `non_applicabile` vietato per upload). Esiti: `valida` → applicabile; `fallita` → **quarantena**. Spike libreria = primo task del piano (fallback: quarantena-all + override titolare).

### 4.3 Matching ricevuta → fattura
1. `nomeFileFattura` = `fatture.nome_file_xml` **+ `laboratorio_id` dell'operatore autenticato** (mai cross-tenant, test dedicato);
2. `identificativo_sdi` come conferma dal secondo match in poi (il primo match lo persiste). **Mismatch = fail-closed**: se il nome file matcha ma l'`identificativo_sdi` della ricevuta differisce da quello già persistito sulla fattura → parcheggio con stato dedicato, MAI transizione;
3. nessun match → evento parcheggiato (`fattura_id NULL`), visibile in lista.

### 4.4 Writer unico: RPC `applica_ricevuta_sdi`
SECURITY DEFINER con hardening tripartito standard del repo: `REVOKE FROM PUBLIC, anon, authenticated` + `GRANT service_role` + **`SET search_path = public, pg_temp`**. Transazione atomica: completa l'evento (§3.2) + UPDATE fattura. Nessun altro percorso applicativo scrive `stato_sdi` post-invio.

**Contratto** (pattern `emetti_nota_credito_atomica`): ritorna json a esiti — `{esito: 'applicata'|'duplicata'|'stato_incompatibile'|'non_matchata'|'quarantena', stato_da, stato_a}`. Regole di concorrenza:
- la transizione è **ricalcolata dallo stato corrente della fattura** dentro la RPC (mai fidarsi della `transizione_proposta` del payload, che può essere stantia);
- UPDATE fattura **guardato** sullo stato atteso (`WHERE stato_sdi = <stato_da_corrente>`) + `GET DIAGNOSTICS ROW_COUNT`: 0 righe → `stato_incompatibile`, nessun evento completato (doppio-applica concorrente e corse con `sblocca-claim` degradano a 409 applicativo, mai a stato incoerente);
- evento già completato (`stato_a NOT NULL`) → `duplicata`, zero side-effect.

**Macchina a stati forward-only** — rank completo (tutti gli 8 stati del CHECK live) e **monotonia stretta** (il rank deve aumentare; 5→5 vietato: una NS tardiva su fattura già `accettata` è `stato_incompatibile` → parcheggio):
```
draft(0) → generata(1) → smtp_inviata(2) → pec_consegnata(3) → ricevuta_sdi(4) → scaduta(5) → accettata(6) | rifiutata(6)
```
`ricevuta_sdi` e `scaduta` restano **senza writer in R1** (come oggi; raggiungibili solo da dashboard manuale) ma hanno rank assegnato: una ricevuta li può avanzare (4→6, 5→6), l'override NON li include nell'allowlist. Non «completarli» in implementazione.

| Ricevuta | Transizione | Colonne |
|---|---|---|
| consegna gestore (solo IMAP futuro) | → `pec_consegnata` | `pec_consegnata_at` |
| **RC** / **MC** | → `accettata` (terminale B2B; MC = comunque emessa, messa a disposizione) | `ricevuta_sdi_at`, `sdi_risposta_at`, `codice_esito_sdi`, `identificativo_sdi` |
| **NS** | → `rifiutata` (unica via automatica; può innescare `trg_fatture_td04_rifiutata`) | `xml_errori_sdi`, `messaggio_esito_sdi` |
| **NE** EC01 | → `accettata` | come RC + `esito_committente` |
| **NE** EC02 | **nessuna transizione**: parcheggio pendenti, flag commercialista | evento con `esito_committente='EC02'` |
| DT / AT (flusso PA) | parcheggio pendenti (fuori scope R1) | evento |

**Riparazione claim orfano**: ricevuta matchata su fattura `generata` con `smtp_inviata_at NOT NULL` → prova d'invio → la RPC avanza direttamente allo stato della ricevuta e valorizza `inviata_via='pec'`/`inviata_at`; guardie `WHERE stato_sdi='generata' AND smtp_inviata_at IS NOT NULL` (predicati disgiunti da `claimInvioPec`, che richiede `smtp_inviata_at IS NULL` — nessuna race; concorrenza testata).

**Quarantena — nessun bypass della verifica firma** (formulazione vincolante): non esiste alcun endpoint che «applichi comunque» una ricevuta in quarantena. L'override titolare è una transizione di stato **per-fattura** che può referenziare l'evento in quarantena, ma: l'evento conserva `esito_verifica_firma='fallita'` per sempre; `codice_esito_sdi`, `xml_errori_sdi`, `identificativo_sdi` NON vengono mai popolati automaticamente da XML non verificato; la UI mostra avviso esplicito «firma non verificata — contenuto potenzialmente contraffatto», rafforzato per TD04→`rifiutata`. **Re-upload dopo quarantena**: stesso file → `duplicata` MA la risposta restituisce sempre il `ricevuta_id` esistente, e l'endpoint `applica` su evento in quarantena **ri-esegue la verifica firma** (così un fix di libreria/rotazione certificato sblocca le quarantene senza vicoli ciechi).

## 5. API e flussi

Pattern consolidato: CSRF same-origin, auth, gate ruolo, 404 su fattura non del lab, 409 su stato non ammesso, errori sanitizzati, audit operatore.

| Endpoint | Ruoli | Contratto |
|---|---|---|
| `POST /api/pec/ricevute` | `RUOLI_INVIO_PEC` (titolare, front_desk) | Upload multipart XML (`request.formData()`, runtime `nodejs`): validazione content-type (`text/xml`/`application/xml`) + estensione `.xml` (il contenuto fa comunque fede: parse + firma); **nome oggetto storage server-generated** `<lab>/ricevute-sdi/<sha256>.xml` — il filename client non entra MAI nel path, solo nel metadato `nome_file_ricevuta`. Parse + verifica firma + match → 200 con proposta `{ricevuta_id, tipo, fattura?, transizione_proposta, esito_verifica_firma}`. Duplicato (sha256) → 200 `esito='duplicata'` **con `ricevuta_id` esistente**. **Cap anti-abuso applicativo**: max N eventi parcheggiati aperti per lab e COUNT upload/24h per lab → 429 (il rate-limit generale resta a backlog). |
| `POST /api/pec/ricevute/[id]/applica` | `RUOLI_INVIO_PEC` | Conferma → RPC `applica_ricevuta_sdi` (esiti §4.4). Idempotente. Su evento in quarantena: ri-esegue la verifica firma; se ancora `fallita` → 409. |
| `POST /api/fatture/[id]/stato-sdi-override` | **solo titolare** | `motivo` obbligatorio; allowlist di transizioni per-endpoint (mai PATCH generico; `ricevuta_sdi`/`scaduta` esclusi); **anti-stale-read**: il payload include `stato_sdi_atteso` (e per TD04→`rifiutata` anche l'importo storno mostrato); UPDATE guardato `WHERE stato_sdi = :atteso` → 409 su mismatch; per TD04→`rifiutata` richiede `conferma_effetti_storno: true` e la UI elenca gli effetti del trigger. `stato_da`/`stato_a` sempre valorizzati nell'evento. |
| `POST /api/fatture/[id]/sblocca-claim` | **solo titolare** | `motivo` + `verificata_cartella_inviata: true` obbligatori → UPDATE guardato (`stato_sdi='generata'`) + evento `sblocco_claim`. Mai automatico (D-3). |

- **Lista riconciliazioni**: Server Component (nessuna API di lettura dedicata). Query: claim orfani (`stato_sdi='generata' AND smtp_inviata_at IS NOT NULL`), `smtp_inviata` da > 7 giorni, `stornata_at IS NOT NULL` con TD04 collegato `rifiutata`, clienti con saldo credito negativo (**serve query/vista aggregata dedicata** — `fetchMovimentiCreditoValidi` è per-cliente, niente N+1; da specificare nel piano), eventi parcheggiati (non matchate, EC02, quarantena firma, mismatch identificativo).
- **`send-pec.ts`**: due modifiche puntuali — destinatario dinamico (D-6) e guardia `.eq('stato_sdi','generata')` sull'UPDATE post-invio (D-7). Il contratto N10 «mai throw dopo sendMail ok» (righe 136-158) resta intatto e coperto dal test-contratto esistente.
- **Ritocco lettore cosmetico**: `fatture/[id]/page.tsx:256-257` mostra «Non inviata» quando `pec_consegnata_at` è NULL — fuorviante su una fattura `accettata` (il salto `smtp_inviata`→`accettata` è legittimo, §4.4): allineare la label allo stato.
- **Storage**: bucket privato esistente `fatture-pdf`, prefisso `<lab>/ricevute-sdi/` (coerente coi path esistenti `<lab>/<anno>/…`); accesso solo service_role + signed URL on-demand. In FASE 6b: **asserire zero policy client su `fatture-pdf`** (nel repo non esistono migration `storage.objects`; se policy sono state create da dashboard, escludere il prefisso).

## 6. Trigger TD04 — riscrittura a contro-movimento (D-2)

`annulla_effetti_storno_td04()` (CREATE OR REPLACE della sola funzione — deployabile senza finestre, il trigger non viene droppato; rollback = ripristino versione `20260715140000`):
1. Parte «riabilita storno» invariata (guardia anti-collisione indice inclusa), MA il caso collisione ora scrive un **evento** (`origine='trigger_td04'`, `motivo='collisione_rifatturazione'`) al posto del solo commento FLAG COMMERCIALISTA → appare in lista riconciliazioni.
2. Il `DELETE` del movimento `storno` → **INSERT di `annullo_storno` a delta**: `v_delta := SUM(storno) − SUM(annullo_storno)` per `(laboratorio_id, fattura_collegata_id)`; INSERT solo se `v_delta > 0`, importo = `v_delta`. Idempotente per costruzione (seconda esecuzione → delta 0), gestisce N cicli storno/rifiuto con importi diversi (bloccante panel: il `NOT EXISTS` avrebbe lasciato credito fantasma dal secondo ciclo in poi).
3. Evento (`origine='trigger_td04'`, `motivo='annullo_credito_storno'`) con l'importo nel payload.
4. Parte «ripristina lavoro» invariata.

**Lettori da aggiornare** (audit obbligatorio, pattern spec TD04 §6):
- `saldo.ts`: `disponibile = eccedenza + storno − applicazione − rimborso − annullo_storno`; tipo `MovimentoCreditoRiga` esteso (`saldo.ts:8`).
- `queries.ts`: `fetchMovimentiCreditoValidi` include `annullo_storno` — **estendere anche le due union inline duplicate** (`queries.ts:133` e `:143-146`); il filtro anti-fantasma (`:147`, gatea solo `eccedenza`) lo lascia passare correttamente.
- **Sanare il drift esistente in `src/types/domain.ts`** (riserva panel): `TipoMovimentoCredito` (`domain.ts:631`) manca già di `'storno'` → aggiungere `'storno' | 'annullo_storno'`; `CreditoClienteMovimento.registrato_da` (`domain.ts:645`) è stale vs il `DROP NOT NULL` → renderlo nullable.
- `credito-cliente.ts`, `EstrattoContoView`, `CreditoSheet`, `KpiBar`, portale `SituazioneEconomicaSection`: pass-through della stessa formula (verificare). Coperte transitivamente: `credito/applica/route.ts:111-116` e `credito/rimborsa/route.ts:75-80` (consumano `fetchMovimentiCreditoValidi` + `calcolaCreditoDisponibile`; con saldo negativo il gate `disponibile` blocca correttamente la spesa). Da verificare in FASE 6: `registra-pagamento.ts:97`.
- Migration di **backfill non necessaria**: i DELETE storici sono già avvenuti (nessun dato da ricostruire); il cambio vale dal deploy in poi. Ordine di deploy: §3.5.

## 7. UI (gate §0B — mockup multi-variante light+dark PRIMA del React)

- **Nuova pagina `/fatture/riconciliazioni`**: mobile-first 390px card + bottom sheet per azioni (MAI modal centrato, MAI tabella full-width su mobile); gruppi per tipo di pendenza con conteggi; tablet 768 split-view; desktop 1280 tabella. Badge conteggio pendenze dalla lista `/fatture`.
- Flusso «carica ricevuta»: upload → schermata proposta (tipo ricevuta, fattura matchata, transizione, esito firma) → conferma. Quarantena/non matchate/mismatch con stato visivo dedicato (colore mai unica fonte di stato). Avviso quarantena: «firma non verificata — contenuto potenzialmente contraffatto».
- Override titolare e sblocco claim: doppia conferma con elenco esplicito degli effetti (per TD04→`rifiutata`: annullo credito con importo mostrato, possibile saldo negativo, ripristino lavoro) — il payload porta lo stato/importo che l'utente HA VISTO (anti-stale-read §5).
- **`CreditoDisponibileSection.tsx`**: con `disponibile < 0` non più `return null` → variante alert (token semantici DS, testo esplicativo «rifiuto TD04 dopo credito già speso», link alla riconciliazione). Con `= 0` resta nascosta (comportamento attuale corretto).
- Animazioni da `motion.ts`, token da `tokens.ts`, DM Sans, touch ≥ 44px, `prefers-reduced-motion`. Gate estetico L2 (FASE 9b) a fine ondata.

## 8. Testing

- **Fixture** (`tests/fixtures/ricevute-sdi/`): RC/NS/MC/NE EC01/NE EC02 valide; firma assente/invalida; XML malformato; oversize; payload XXE; signature wrapping; nome file di altro lab; mismatch identificativo.
- **Invarianti blindate**:
  1. Monotonia **stretta** su tutti gli 8 stati (incl. `ricevuta_sdi`/`scaduta`): nessuna permutazione/duplicazione di ricevute produce regressione o transizione a pari rank (property-test con permutazioni).
  2. NS-only: `rifiutata` mai scritta da NE/EC02 o da RC/MC; EC02 finisce in parcheggio.
  3. Idempotenza forte: stessa ricevuta applicata 2 volte → una sola transizione (`duplicata`); il trigger TD04 non ri-esegue.
  4. Isolamento tenant: ricevuta con nome file del lab B su sessione lab A → parcheggio, mai transizione.
  5. Claim: riparazione da ricevuta vs `claimInvioPec` concorrente → nessun doppio invio; corsa `sblocca-claim` vs `applica` → esiti deterministici (409/`stato_incompatibile`).
  6. Contratto N10 intatto: test esistente `send-pec` continua a passare; destinatario dinamico testato con e senza `pec_sdi_address`; **guardia D-7**: UPDATE post-invio su fattura non più `generata` → 0 righe, nessun throw, nessuna regressione di stato.
  7. Contro-movimento a delta: ciclo singolo (delta = storno), doppio ciclo storno→rifiuto→ri-storno→rifiuto (secondo annullo = X₂), ri-esecuzione (delta 0, nessun duplicato); saldo coerente in ogni punto; `annullo_storno` visibile nei lettori.
  8. Trigger: coverage caso collisione (evento scritto, `stornata_at` intatto).
  9. Anti-stale-read: override con `stato_sdi_atteso` stantio → 409, nessun evento.
- **QA browser**: lab E2E `00000000-0000-0000-0000-000000000001`, mai lab Filippo, mai caselle PEC reali; 390/768/1280 × light/dark.

## 9. Validazione architetturale (FASE 3)

| Gate | Risposta |
|---|---|
| Tenant isolation | Toccata: RLS nuova tabella (`public.current_lab_id()`); RPC/trigger SECURITY DEFINER con hardening tripartito (REVOKE + GRANT + search_path) e filtri `laboratorio_id` espliciti; matching mai cross-tenant (invariante 4). |
| Schema drift | Migration sì → FASE 6b: `supabase gen types` + `tsc --noEmit` + verifica RLS esistenti + assert zero policy client su bucket `fatture-pdf`. |
| API contract | Solo endpoint nuovi; `send-pec` con fallback destinatario identico all'attuale e guardia che non altera il contratto → zero breaking. |
| Rollback | Migration additive (eccetto DROP+ADD dei 2 CHECK, §3.3 — reversibile); trigger CREATE OR REPLACE reversibile; eventuali `annullo_storno` registrati restano coerenti anche col trigger vecchio ripristinato. Ordine deploy: codice → migration (§3.5). |
| Dominio critico | FatturaPA → percorso GRANDE (questo documento ne è la FASE 2-3). |

## 10. Piano: decomposizione suggerita (riserva panel, da confermare in FASE 4)

Due sub-ondate con confini puliti, in un unico worktree/branch:
- **R1a — debito contabile**: migration `annullo_storno` (2 CHECK) + trigger a delta + lettori saldo + drift `domain.ts` + alert saldo negativo in `CreditoDisponibileSection` (+ mockup §0B della variante alert). Autoconsistente, sblocca subito le riserve TD04.
- **R1b — pipeline ricevute**: spike XAdES (primo task, con fallback quarantena-all) → migration `fatture_sdi_eventi` + colonne → parser + verifica + RPC → endpoint → pagina `/fatture/riconciliazioni` (mockup §0B) → D-6/D-7 su send-pec.

## 11. Fuori scope (tracciati a backlog)

- **Poller IMAP** (ondata 2): route `POST /api/cron/pec-poll` Node runtime + Vercel Cron (Pro) o QStash, `CRON_SECRET` timing-safe, cursore `UIDVALIDITY`/UID per-lab, lettura minimizzata (cartella dedicata), requisiti bloccanti appsec (firma a due livelli, DPA/GDPR, kill-switch per-lab). Alimenta la pipeline di questa ondata.
- Rate-limit per-lab generale (backlog esistente; il cap applicativo dell'upload è in R1, §5) · «N10 polish» (item separato) · flusso PA completo (DT/AT oltre il parcheggio) · writer `scaduta` (decorrenza termini) · connectionTimeout nodemailer · timing-safe compare su `pec-verify` esistente (segnalazione appsec, micro-fix candidabile ad accorpamento nel piano) · rigenerazione/deprecazione snapshot `supabase/schema.sql`.

## 12. Esito validazione panel (rev.2)

| Advisor | Verdetto | Bloccanti → risoluzione |
|---|---|---|
| solution-architect | CONFERMATA CON RISERVE | Idempotenza annullo a `NOT EXISTS` rompe il ri-storno → **guardia a delta** (§6.2, D-2). Riserve: lifecycle two-step (§3.2), rank `ricevuta_sdi` + monotonia stretta (§4.4), drift `domain.ts` (§6), ordine deploy (§3.5), spike XAdES (§4.2/D-4). |
| backend-api | CONFERMATA CON RISERVE | Two-step vs UNIQUE sha256 → lifecycle esplicito (§3.2); contratto RPC + concorrenza → esiti json + UPDATE guardato + ricalcolo transizione (§4.4); UPDATE non guardato `send-pec.ts:143-152` → **D-7**; guard trigger → **delta** (§6.2). Riserve: 2 CHECK (§3.3), UNIQUE nome file rimosso (§3.2), riverifica quarantena (§4.4/§5). |
| appsec-auditor | CONFERMATA CON RISERVE | Condizioni bloccanti del primo panel tutte recepite. Riserve integrate: nome oggetto storage server-generated + validazioni upload (§5), mismatch identificativo fail-closed (§4.3), REVOKE + trigger append-only + CHECK motivo (§3.2), search_path (§4.4), anti-stale-read (§5), quarantena senza bypass (§4.4), requisiti XAdES pinnati (D-4), cap upload (§5), assert policy storage (§5/§9). |

## 13. Riferimenti

- Handoff: `docs/roadmap/2026-07-15-riconciliazioni-handoff.md` · Menu: `docs/roadmap/2026-07-15-post-td04-handoff.md` §B
- Spec TD04: `docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md` · Spec N10-N9: `docs/superpowers/specs/2026-07-15-n10-n9-invio-pec-sdi-design.md`
- Trigger attuale: `supabase/migrations/20260715140000_annulla_effetti_storno_td04_rifiutato.sql` · RPC storno + CHECK movimenti: `20260715110000_credito_storno_nota_credito.sql`
- Precedente scheduling: `docs/roadmap/2026-07-10-ledger-4a-interrotta-audit.md` (pg_cron+pg_net, outbox smontata)
- Normativa/piattaforma: Specifiche tecniche SdI v1.8.1 (fatturapa.gov.it), Allegato A AdE v1.9.1, FAQ AdE modalità di trasmissione (indirizzo `sdiNN` dedicato), MessaggiTypes_v1.1.xsd.

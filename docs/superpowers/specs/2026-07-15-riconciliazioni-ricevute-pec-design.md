# Spec — Riconciliazioni pendenti + ricevute PEC (ondata R1)

**Data:** 2026-07-15 · **Owner:** Francesco Formicola · **Dominio:** FatturaPA → percorso GRANDE (BP-2)
**Stato:** design approvato da Francesco (direzione C «parser-first» + contro-movimento, gate 15/07); in validazione panel advisor.
**Handoff di origine:** `docs/roadmap/2026-07-15-riconciliazioni-handoff.md` (item B, scelto esplicitamente da Francesco).

---

## 1. Problema

Tre stati-limite oggi silenziosi, tutti «post-invio/post-storno» (riserve advisor TD04 2/3 + follow-up N10):

1. **Saldo credito negativo** — al rifiuto di un TD04 il trigger `annulla_effetti_storno_td04()` (migration `20260715140000`, righe 60-63) fa `DELETE` del movimento `storno`; se il credito era già stato applicato il saldo va negativo. La UI lo nasconde: `CreditoDisponibileSection.tsx:18` → `if (disponibile <= 0) return null`.
2. **Collisione storno/ri-fatturazione** — lo stesso trigger lascia `stornata_at` valorizzato sull'originale se il lavoro è stato ri-fatturato (guardia anti-23505 sull'indice `fatture_lavoro_attiva_unique`, righe 28-39). Oggi è solo un «FLAG COMMERCIALISTA» nei commenti SQL: nessuna lista, nessun alert. La transizione a `rifiutata` non ha alcun writer applicativo (solo dashboard Supabase manuale).
3. **Ricevute PEC mai riconciliate** — `send-pec.ts` porta la fattura a `smtp_inviata` e lì si ferma: gli stati `pec_consegnata`/`ricevuta_sdi`/`accettata`/`rifiutata` non hanno writer. Le colonne esiti (`pec_consegnata_at`, `ricevuta_sdi_at`, `codice_esito_sdi`, `messaggio_esito_sdi`, `sdi_risposta_at`, `xml_errori_sdi`) esistono e non sono mai popolate. Il **claim orfano** su `smtp_inviata_at` (crash tra sendMail e UPDATE: fattura `generata` + `smtp_inviata_at` valorizzato) si sblocca oggi solo a mano, dopo verifica della cartella «inviata» (`invio-claim.ts:4-9`; `pec_message_id` NULL NON è prova di non-invio).

## 2. Decisione di direzione (gate Francesco 15/07 + panel 3/3)

Panel advisor consultato su richiesta esplicita di Francesco (solution-architect, backend-api, appsec-auditor): verdetto **unanime C «parser-first»**, poi ratificato da Francesco.

**D-1 — Parser-first, IMAP rinviato.** In questa ondata l'azione primaria dell'operatore è **l'upload del file ricevuta XML** scaricato dalla propria casella PEC; il server parsa, verifica la firma e applica la transizione tramite un writer unico. Il poller IMAP è un'ondata futura che alimenterà la **stessa pipeline** (fetcher intercambiabile). Motivazioni: la credenziale PEC è unica SMTP/IMAP/webmail (nessun gestore offre read-only scoped) → un poller leggerebbe TUTTA la posta certificata del lab (GDPR art. 5.1.c minimizzazione, art. 616 c.p.); pg_net droppato deliberatamente (audit 4a-server); volume reale poche decine di ricevute/mese per lab; time-to-value.

**D-2 — Contro-movimento al posto del DELETE nel trigger** (scelta esplicita di Francesco): ledger credito append-only, storia visibile, audit.

**D-3 — Lo sblocco del claim orfano non è mai automatico.** Condizione bloccante 3/3 advisor: la risoluzione automatica avviene SOLO su evidenza positiva (ricevuta matchata = prova che la mail partì → lo stato avanza e il claim si risolve da solo); il **rilascio** (riabilitare l'invio, rischio doppio invio fiscale) resta manuale, solo `titolare`, con motivo + audit.

**D-4 — Verifica firma XAdES obbligatoria per ogni transizione automatica.** Una ricevuta SdI autentica è firmata XAdES-BES (enveloped) e conforme a `MessaggiTypes_v1.1.xsd`. Header `From:`, oggetto e nome file NON sono autenticazione: chiunque con una PEC può contraffarli, e una NS contraffatta su un TD04 innescherebbe il trigger contabile. Ricevuta con firma non verificabile → **quarantena** (mai applicata automaticamente; solo override titolare).

**D-5 — NS ≠ EC02.** La Notifica di Scarto (NS: fattura mai esistita fiscalmente) è l'**unica** transizione automatica ammessa verso `rifiutata` — semantica coerente col trigger TD04. La Notifica Esito committente negativa (NE/EC02, solo flusso PA: fattura emessa poi rifiutata) NON scrive `rifiutata`: parcheggio in pendenti con flag commercialista. Per i clienti B2B (i dentisti) lo stato terminale positivo è la **RC** (la NE non esiste in B2B): mapping documentato per non aspettare per sempre una `accettata` che non arriverà.

**D-6 — Fix compliance indirizzo SdI dinamico.** `send-pec.ts:124` hardcoda `sdi01@pec.fatturapa.it`, valido solo per il PRIMO invio: con la prima risposta SdI comunica l'indirizzo dedicato `sdiNN` da usare per i successivi (fonte AdE, FAQ modalità di trasmissione). Nuova colonna `laboratori.pec_sdi_address`, destinatario `pec_sdi_address ?? 'sdi01@pec.fatturapa.it'`. L'XML della ricevuta non contiene l'indirizzo mittente PEC → in R1 il campo è editabile in `/impostazioni/pec`; l'IMAP futuro lo popolerà in automatico.

## 3. Modello dati (migration additive)

### 3.1 Colonne nuove
- `fatture.identificativo_sdi TEXT` — popolata al primo match; chiave di conferma per le ricevute successive e per l'assistenza SdI. Indice `(laboratorio_id, identificativo_sdi)` parziale `WHERE identificativo_sdi IS NOT NULL`.
- `laboratori.pec_sdi_address TEXT` — vedi D-6. Aggiunta all'allowlist del `PATCH /api/impostazioni/pec` (pattern allowlist esplicita).

**Non si aggiunge `pec_errore`**: gli errori vivono in `fatture_sdi_eventi.lista_errori` e `fatture.xml_errori_sdi` (evita stato duplicato).

### 3.2 Tabella `fatture_sdi_eventi` (append-only)
```sql
id uuid PK, laboratorio_id uuid NOT NULL REFERENCES laboratori,
fattura_id uuid NULL REFERENCES fatture,          -- NULL = ricevuta parcheggiata (non matchata / quarantena)
origine text NOT NULL CHECK (origine IN ('upload_verificato','override_manuale','sblocco_claim','trigger_td04','imap')),
tipo_ricevuta text NULL CHECK (tipo_ricevuta IN ('RC','NS','MC','NE','DT','AT')),
stato_da text NULL, stato_a text NULL,            -- NULL su eventi senza transizione (parcheggio, annullo credito)
nome_file_fattura text NULL, nome_file_ricevuta text NULL,
identificativo_sdi text NULL, esito_committente text NULL CHECK (esito_committente IN ('EC01','EC02')),
lista_errori jsonb NULL,                          -- NS: ListaErrori integrale
esito_verifica_firma text NULL CHECK (esito_verifica_firma IN ('valida','fallita','non_applicabile')),
ricevuta_storage_path text NULL,                  -- bucket privato: le ricevute SdI sono documenti fiscali da conservare
content_sha256 text NULL,
registrato_da uuid NULL,                          -- NULL = sistema (trigger)
motivo text NULL,                                 -- NOT NULL applicativo per override_manuale/sblocco_claim
created_at timestamptz NOT NULL DEFAULT now()
```
- **Idempotenza**: `UNIQUE (laboratorio_id, content_sha256)` parziale `WHERE content_sha256 IS NOT NULL` + `UNIQUE (laboratorio_id, tipo_ricevuta, nome_file_ricevuta)` parziale `WHERE nome_file_ricevuta IS NOT NULL`.
- **RLS**: SELECT per lab via `public.current_lab_id()`; INSERT/UPDATE/DELETE nessuna policy (scrive solo service_role via RPC) → append-only per costruzione.

### 3.3 Nuovo tipo movimento credito
`annullo_storno` nel CHECK di `credito_clienti_movimenti` (stessa shape di `storno`: `pagamento_id IS NULL AND fattura_id IS NOT NULL AND lavoro_id IS NULL`). Segno: registrato positivo, sottratto dalla formula del saldo (coerente con `applicazione`/`rimborso`).

### 3.4 Nota drift documentale
`supabase/schema.sql:1414` elenca un CHECK `stato_sdi` obsoleto (`bozza`,`pronta`,…). Il vincolo **live** è corretto (migration `002_fase2_schema.sql:150`: 8 stati `draft`…`scaduta`). `schema.sql` è uno snapshot stantio: nessuna migration necessaria; da non usare come fonte di verità.

## 4. Parser, verifica firma, macchina a stati

### 4.1 Parser (`src/lib/fattura/ricevute/parse-ricevuta-sdi.ts`)
Pure function, zero I/O: `Buffer → { tipo, nomeFileFattura, identificativoSdI, dataOraRicezione, esitoCommittente, listaErrori[] }`.
- XML hardening: entità/DTD disabilitate (`fast-xml-parser` con `processEntities:false` o equivalente), size cap 1 MB, profondità/numero nodi limitati, reject di strutture non conformi a MessaggiTypes.
- Testabile al 100% con fixture dalle specifiche ufficiali SdI (v1.8.1) — nessuna rete, nessuna casella reale.

### 4.2 Verifica firma (`src/lib/fattura/ricevute/verifica-firma.ts`)
Verifica XAdES-BES enveloped della ricevuta prima di ogni transizione automatica (D-4). Scelta libreria (xadesjs vs xml-crypto + verifica catena fino al certificato SdI/Sogei, con procedura di rotazione documentata) da dettagliare nel piano. Esiti: `valida` → applicabile; `fallita` → quarantena.

### 4.3 Matching ricevuta → fattura
1. `nomeFileFattura` = `fatture.nome_file_xml` **+ `laboratorio_id` dell'operatore autenticato** (mai cross-tenant, test dedicato);
2. `identificativo_sdi` come conferma dal secondo match in poi (primo match lo persiste);
3. nessun match → evento parcheggiato (`fattura_id NULL`), visibile in lista.

### 4.4 Writer unico: RPC `applica_ricevuta_sdi`
SECURITY DEFINER (pattern `REVOKE FROM PUBLIC, anon, authenticated` + `GRANT service_role`), transazione atomica: INSERT evento + UPDATE fattura. Nessun altro percorso applicativo scrive `stato_sdi` post-invio.

**Macchina a stati forward-only** (rank monotono, mai regressione):
```
draft(0) → generata(1) → smtp_inviata(2) → pec_consegnata(3) → accettata(5)
                                                            ↘ rifiutata(5)
scaduta(4): fuori scope R1 (nessun writer); una ricevuta tardiva PUÒ avanzare scaduta→accettata/rifiutata
```
| Ricevuta | Transizione | Colonne |
|---|---|---|
| consegna gestore (solo IMAP futuro) | → `pec_consegnata` | `pec_consegnata_at` |
| **RC** / **MC** | → `accettata` (terminale B2B; MC = comunque emessa, messa a disposizione) | `ricevuta_sdi_at`, `sdi_risposta_at`, `codice_esito_sdi`, `identificativo_sdi` |
| **NS** | → `rifiutata` (unica via automatica; può innescare `trg_fatture_td04_rifiutata`) | `xml_errori_sdi`, `messaggio_esito_sdi` |
| **NE** EC01 | → `accettata` | come RC + `esito_committente` |
| **NE** EC02 | **nessuna transizione**: parcheggio pendenti, flag commercialista | evento con `esito_committente='EC02'` |
| DT / AT (flusso PA) | parcheggio pendenti (fuori scope R1) | evento |

**Riparazione claim orfano**: ricevuta matchata su fattura `generata` con `smtp_inviata_at NOT NULL` → prova d'invio → la RPC avanza direttamente allo stato della ricevuta e valorizza `inviata_via='pec'`/`inviata_at`; guardie `WHERE stato_sdi='generata' AND smtp_inviata_at IS NOT NULL` (nessuna finestra di doppio invio; concorrenza con `claimInvioPec` testata).

## 5. API e flussi

Pattern consolidato: CSRF same-origin, auth, gate ruolo, 404 su fattura non del lab, 409 su stato non ammesso, errori sanitizzati, audit operatore.

| Endpoint | Ruoli | Contratto |
|---|---|---|
| `POST /api/pec/ricevute` | `RUOLI_INVIO_PEC` (titolare, front_desk) | Upload multipart XML → parse + verifica firma + match → 200 con **proposta** `{ricevuta_id, tipo, fattura?, transizione_proposta, esito_verifica_firma}`. Two-step: nessun side-effect su `stato_sdi`. Duplicato (sha256/nome file) → 200 `esito='duplicata'`. |
| `POST /api/pec/ricevute/[id]/applica` | `RUOLI_INVIO_PEC` | Conferma → RPC `applica_ricevuta_sdi`. Idempotente. Quarantena (firma fallita) → 409. |
| `POST /api/fatture/[id]/stato-sdi-override` | **solo titolare** | `motivo` obbligatorio; allowlist di transizioni per-endpoint (mai PATCH generico); per TD04→`rifiutata` richiede `conferma_effetti_storno: true` e la UI elenca gli effetti del trigger. |
| `POST /api/fatture/[id]/sblocca-claim` | **solo titolare** | `motivo` + `verificata_cartella_inviata: true` obbligatori → UPDATE guardato (`stato_sdi='generata'`) + evento `sblocco_claim`. Mai automatico (D-3). |

- **Lista riconciliazioni**: Server Component (nessuna API di lettura dedicata). Query: claim orfani (`stato_sdi='generata' AND smtp_inviata_at IS NOT NULL`), `smtp_inviata` da > 7 giorni, `stornata_at IS NOT NULL` con TD04 collegato `rifiutata`, clienti con saldo credito negativo, eventi parcheggiati (non matchate, EC02, quarantena firma).
- **`send-pec.ts`**: cambia SOLO il destinatario (D-6). Il contratto N10 «mai throw dopo sendMail ok» (righe 136-158) resta intatto e coperto dal test-contratto esistente.
- **Storage**: le ricevute caricate si conservano nel bucket privato esistente (`fatture-pdf`) sotto prefisso dedicato `ricevute-sdi/<lab>/`, path nell'evento.

## 6. Trigger TD04 — riscrittura a contro-movimento (D-2)

`annulla_effetti_storno_td04()` (CREATE OR REPLACE, rollback = ripristino versione 20260715140000):
1. Parte «riabilita storno» invariata (guardia anti-collisione indice inclusa), MA il caso collisione ora scrive un **evento** (`origine='trigger_td04'`, `motivo='collisione_rifatturazione'`) al posto del solo commento FLAG COMMERCIALISTA → appare in lista riconciliazioni.
2. Il `DELETE` del movimento `storno` → **INSERT di `annullo_storno`** di pari importo (guard `NOT EXISTS` su annullo già presente per lo stesso `fattura_collegata_id` → idempotenza anche oltre il `WHEN` del trigger).
3. Evento (`origine='trigger_td04'`, `motivo='annullo_credito_storno'`) con l'importo nel payload.
4. Parte «ripristina lavoro» invariata.

**Lettori da aggiornare** (audit obbligatorio, pattern spec TD04 §6):
- `saldo.ts`: `disponibile = eccedenza + storno − applicazione − rimborso − annullo_storno`; tipo `MovimentoCreditoRiga` esteso.
- `queries.ts` / `fetchMovimentiCreditoValidi`: include `annullo_storno` (nessun gate su pagamento, come `storno`).
- `credito-cliente.ts`, `EstrattoContoView` (riga movimento con label), `CreditoSheet`, `KpiBar`, portale `SituazioneEconomicaSection`: verificare che il nuovo tipo transiti correttamente (per la maggior parte è pass-through della stessa formula).
- Migration di **backfill non necessaria**: i DELETE storici sono già avvenuti (nessun dato da ricostruire); il cambio vale dal deploy in poi.

## 7. UI (gate §0B — mockup multi-variante light+dark PRIMA del React)

- **Nuova pagina `/fatture/riconciliazioni`**: mobile-first 390px card + bottom sheet per azioni (MAI modal centrato, MAI tabella full-width su mobile); gruppi per tipo di pendenza con conteggi; tablet 768 split-view; desktop 1280 tabella. Badge conteggio pendenze dalla lista `/fatture`.
- Flusso «carica ricevuta»: upload → schermata proposta (tipo ricevuta, fattura matchata, transizione, esito firma) → conferma. Quarantena/non matchate con stato visivo dedicato (colore mai unica fonte di stato).
- Override titolare e sblocco claim: doppia conferma con elenco esplicito degli effetti (per TD04→rifiutata: annullo credito, possibile saldo negativo, ripristino lavoro).
- **`CreditoDisponibileSection.tsx`**: con `disponibile < 0` non più `return null` → variante alert (token semantici DS, testo esplicativo «rifiuto TD04 dopo credito già speso», link alla riconciliazione). Con `= 0` resta nascosta (comportamento attuale corretto).
- Animazioni da `motion.ts`, token da `tokens.ts`, DM Sans, touch ≥ 44px, `prefers-reduced-motion`. Gate estetico L2 (FASE 9b) a fine ondata.

## 8. Testing

- **Fixture** (`tests/fixtures/ricevute-sdi/`): RC/NS/MC/NE EC01/NE EC02 valide; firma assente/invalida; XML malformato; oversize; payload XXE; nome file di altro lab.
- **Invarianti blindate**:
  1. Monotonia: nessuna permutazione/duplicazione di ricevute produce regressione di `stato_sdi` (property-test con permutazioni).
  2. NS-only: `rifiutata` mai scritta da NE/EC02 o da RC/MC; EC02 finisce in parcheggio.
  3. Idempotenza forte: stessa ricevuta applicata 2 volte → una sola transizione; il trigger TD04 non ri-esegue.
  4. Isolamento tenant: ricevuta con nome file del lab B su sessione lab A → parcheggio, mai transizione.
  5. Claim: riparazione da ricevuta vs `claimInvioPec` concorrente → nessun doppio invio possibile.
  6. Contratto N10 intatto: test esistente `send-pec` continua a passare; destinatario dinamico testato con e senza `pec_sdi_address`.
  7. Contro-movimento: saldo identico pre/post rispetto al DELETE; `annullo_storno` visibile nei lettori; doppio rifiuto non duplica l'annullo.
  8. Trigger: coverage caso collisione (evento scritto, `stornata_at` intatto).
- **QA browser**: lab E2E `00000000-0000-0000-0000-000000000001`, mai lab Filippo, mai caselle PEC reali; 390/768/1280 × light/dark.

## 9. Validazione architetturale (FASE 3)

| Gate | Risposta |
|---|---|
| Tenant isolation | Toccata: RLS nuova tabella (`public.current_lab_id()`); RPC/trigger SECURITY DEFINER con filtri `laboratorio_id` espliciti; matching mai cross-tenant (invariante 4). |
| Schema drift | Migration sì → FASE 6b: `supabase gen types` + `tsc --noEmit` + verifica RLS esistenti. |
| API contract | Solo endpoint nuovi; `send-pec` con fallback identico all'attuale → zero breaking. |
| Rollback | Migration additive; trigger CREATE OR REPLACE reversibile; eventuali `annullo_storno` registrati restano coerenti anche col trigger vecchio ripristinato. |
| Dominio critico | FatturaPA → percorso GRANDE (questo documento ne è la FASE 2-3). |

## 10. Fuori scope (tracciati a backlog)

- **Poller IMAP** (ondata 2): route `POST /api/cron/pec-poll` Node runtime + Vercel Cron (Pro) o QStash, `CRON_SECRET` timing-safe, cursore `UIDVALIDITY`/UID per-lab, lettura minimizzata (cartella dedicata), requisiti bloccanti appsec §2 del parere (firma a due livelli, DPA/GDPR, kill-switch per-lab). Alimenta la pipeline di questa ondata.
- Rate-limit per-lab (backlog esistente) · «N10 polish» (item separato) · flusso PA completo (DT/AT oltre il parcheggio) · writer `scaduta` (decorrenza termini) · connectionTimeout nodemailer · timing-safe compare su `pec-verify` esistente (segnalazione appsec, micro-fix candidabile ad accorpamento nel piano).

## 11. Riferimenti

- Handoff: `docs/roadmap/2026-07-15-riconciliazioni-handoff.md` · Menu: `docs/roadmap/2026-07-15-post-td04-handoff.md` §B
- Spec TD04: `docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md` · Spec N10-N9: `docs/superpowers/specs/2026-07-15-n10-n9-invio-pec-sdi-design.md`
- Trigger attuale: `supabase/migrations/20260715140000_annulla_effetti_storno_td04_rifiutato.sql` · RPC storno: `20260715110000_credito_storno_nota_credito.sql`
- Precedente scheduling: `docs/roadmap/2026-07-10-ledger-4a-interrotta-audit.md` (pg_cron+pg_net, outbox smontata)
- Normativa/piattaforma: Specifiche tecniche SdI v1.8.1 (fatturapa.gov.it), Allegato A AdE v1.9.1, FAQ AdE modalità di trasmissione (indirizzo `sdiNN` dedicato), MessaggiTypes_v1.1.xsd.

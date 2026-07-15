# N10+N9 — Invio a SdI dell'XML congelato (PEC) — Design

> **Data:** 2026-07-15 · **Owner:** Francesco Formicola · **Percorso:** GRANDE (dominio FatturaPA)
> **Backlog:** chiude N10 (TD04 senza percorso di invio) e N9 (nessun retry PEC via API).
> **Origine:** handoff `docs/roadmap/2026-07-15-post-td04-handoff.md` §A.
> **Rev. 2 (15/07):** riserve dei 3 advisor specializzati (solution-architect + backend-api +
> appsec-auditor, tutti «CONFERMATA CON RISERVE», zero bloccanti) recepite — vedi §9.

---

## 1. Problema

La nota di credito TD04 si ferma a `stato_sdi='generata'`: l'unico percorso PEC esistente
(`POST /api/fatture/[id]/xml` con `invia_pec:true`) gatea su `stato_sdi==='draft'` (N7) e
richiede lavori associati → 409/422 per un TD04 (`lavoro_id` NULL).

**Scoperta di sessione che riframa il problema:** quel percorso non è chiamato da NESSUN
client — `sendFatturaPEC` ha un solo caller (la route `/xml`) e la route `/xml` non ha
caller nell'app. Oggi **nessuna fattura parte via PEC dall'app**, nemmeno le TD01: la
pagina fattura mostra solo «Scarica XML» e «PEC consegnata: Non inviata» read-only.

N10 (TD04 ferma) e N9 (retry PEC fallita) sono quindi due facce dello stesso buco:
**manca il percorso di invio per qualsiasi fattura `generata`**.

## 2. Decisioni ratificate da Francesco (15/07/2026)

| # | Decisione | Scelta |
|---|-----------|--------|
| D-1 | Perimetro | **API + bottone UI** nella card «Invio SDI» di `/fatture/[id]` |
| D-2 | Stati ammessi all'invio | **Solo `generata`** (`scaduta`/`rifiutata` = design dedicato futuro) |
| D-3 | Permessi | **Solo `titolare` + `front_desk`** (nuovo gate di ruolo; `tecnico` e `admin_rete` esclusi — nota: sulla config PEC `admin_rete` è invece ammesso, incoerenza accettata) |
| D-4 | Meccanismo | **A — endpoint dedicato** `POST /api/fatture/[id]/invia-pec` (la route `/xml` e il gate N7 restano intatti) |

## 3. Architettura

### 3.1 Route `POST /api/fatture/[id]/invia-pec` (nuova)

Pattern gemello di `nota-credito/route.ts`. Sequenza:

1. **CSRF** `isSameOrigin(req)` → 403 «Richiesta non consentita»
2. **Auth** `getServerUserClient().auth.getUser()` → 401
3. **Ruolo**: `svc.from('utenti').select('laboratorio_id, ruolo')` → utente senza riga o
   senza `laboratorio_id` → **403** «Laboratorio non trovato» (come `xml/route.ts:43-45`);
   se `!['titolare','front_desk'].includes(ruolo)` → **403** «Ruolo non autorizzato all'invio fiscale»
4. **Fattura del lab**: select `id, numero, stato_sdi, xml_storage_path, nome_file_xml,
   tipo_documento, laboratorio:laboratori(pec_smtp_configurata)`
   con `.eq('laboratorio_id', labId)` → **404** se assente
5. **Gate stato** (allowlist): `stato_sdi !== 'generata'` → **409** con messaggio per stato:
   - `draft` + `tipo_documento === 'TD04'` → «Nota di credito incompleta — riapri l'emissione dalla fattura originale per completarla» (un TD04 con generazione XML fallita resta `draft`; il resume idempotente vive già in `nota-credito/route.ts`)
   - `draft` (altri tipi) → «XML non ancora generato — genera prima la fattura»
   - `smtp_inviata`/`pec_consegnata`/`ricevuta_sdi`/`accettata` → «Fattura già inviata a SdI»
   - `rifiutata`/`scaduta` → «Stato non re-inviabile — richiede intervento dedicato»
6. **XML congelato presente**: `xml_storage_path` o `nome_file_xml` NULL → **422** (anomalia)
6b. **Precheck PEC** (pre-claim, per caller API diretti — la UI disabilita già il bottone):
   `pec_smtp_configurata !== true` → **422** «PEC non configurata — configurala nelle Impostazioni»
7. **Claim anti-doppio-invio** (nessuna migration, colonne esistenti):
   ```ts
   const { data: claimed, error: claimErr } = await svc
     .from('fatture')
     .update({ smtp_inviata_at: new Date().toISOString() })
     .eq('id', fatturaId)
     .eq('laboratorio_id', labId)          // defense-in-depth
     .eq('stato_sdi', 'generata')
     .is('smtp_inviata_at', null)
     .select('id')
   if (claimErr) → 500 (errore Postgres transiente, log server — NON 409)
   if (claimed.length === 0) → 409 «Invio già in corso o già effettuato»
   ```
   Solo un chiamante concorrente vince. Coerenza: ogni fattura `generata` ha
   `smtp_inviata_at` NULL — invariante verificato dall'advisor architetturale: unico
   writer è `send-pec.ts:138-146` (atomico con `stato_sdi='smtp_inviata'`), la RPC TD04
   non lo eredita, nessun percorso riporta da `smtp_inviata` a `generata`.
8. **Log audit operatore** (nessuna migration): prima dell'invio, log server strutturato
   `console.log('[INVIA-PEC]', { fatturaId, numero, labId, userId: user.id, ruolo })` —
   traccia CHI ha scatenato l'atto fiscale. Poi **invio**: `await sendFatturaPEC(fatturaId)`
   — riuso del modulo, logica invariata. Legge l'XML congelato dal bucket privato
   `fatture-pdf` (signed URL 60s), invia a `sdi01@pec.fatturapa.it` con SMTP del lab
   (password dal Vault via `get_pec_password`), aggiorna `stato_sdi='smtp_inviata'`,
   `inviata_via='pec'`, `inviata_at`, `smtp_inviata_at`, `pec_message_id`.
   Nessuna rigenerazione XML, nessun progressivo.
9. **Errore invio** (catch): **rilascio del claim** `smtp_inviata_at = NULL` (condizioni
   `.eq('laboratorio_id', labId).eq('stato_sdi','generata')`), poi **502** con messaggio
   pulito («Invio PEC fallito — riprova o verifica la configurazione PEC»); dettaglio
   grezzo (host SMTP, errori Vault/Postgres) SOLO nei log server.
10. **Successo**: **re-fetch dello stato dal DB** (pattern `xml/route.ts:252-257`) e 200 con
   `{ fattura: { id, numero, stato_sdi, inviata_at, pec_message_id } }` riflettendo lo
   stato REALE. **Ramo degradato definito** (mail partita ma UPDATE interno di
   `send-pec.ts:149-153` fallito, che NON rilancia): il re-fetch restituisce ancora
   `generata` + claim tenuto → la route risponde comunque 200 (la PEC è partita), la UI
   mostra lo stato reale e un successivo tap riceve 409 «Invio già in corso o già
   effettuato», da trattare come informativo (non ritentabile alla cieca).

### 3.2 Route `/xml` — hardening del ramo `invia_pec` (riserve advisor 1-2)

Il gate N7 sulla (ri)generazione resta **intatto**. Ma il ramo `invia_pec:true` della
route `/xml` (`xml/route.ts:243-250`) è un'API pubblica viva che oggi: (a) non ha gate
di ruolo → un `tecnico` potrebbe inviare a SdI una fattura `draft`, aggirando D-3;
(b) chiama `sendFatturaPEC` senza claim → doppio invio possibile in concorrenza col
nuovo endpoint; (c) fa leak di `err.message` grezzo nel body (`pec_errore`,
`xml/route.ts:248,263` — host SMTP, errori Vault). In questa ondata il ramo riceve:

- lo **stesso gate ruolo** `titolare`+`front_desk` (403), attivo SOLO quando
  `invia_pec === true` (la sola generazione XML resta senza gate, com'è oggi);
- l'**acquisizione del claim** (stesso UPDATE condizionale di §3.1 step 7) prima di
  `sendFatturaPEC`, con rilascio nel catch;
- **sanitizzazione** di `pec_errore`: messaggio generico nel body, dettaglio nei log.

### 3.2b Cosa NON cambia

- `send-pec.ts` — **logica invariata**. Si aggiungono SOLO: un commento-contratto e un
  test unitario che blindano l'invariante «mai throw dopo `sendMail` riuscito»
  (`send-pec.ts:136-153`) — è ciò che rende sicuro il rilascio del claim nel catch;
  un futuro refactor che lo violasse causerebbe doppio invio a mail partita.
- Il gate N7 (`xml/route.ts:80-85`) — intatto.
- Nessuna migration, nessun `gen types` (FASE 6b non scatta).

### 3.3 Rischi residui documentati

- **Claim orfano su crash** tra claim (step 7) e rilascio (step 9): la fattura resta
  `generata` con `smtp_inviata_at` valorizzato → il bottone risponde 409. Rimedio
  manuale documentato: `UPDATE fatture SET smtp_inviata_at = NULL WHERE id = '…' AND
  stato_sdi = 'generata';` **SOLO dopo aver verificato nella cartella «inviata» della
  casella PEC del lab che il messaggio non sia realmente partito**. ⚠️ `pec_message_id`
  NULL NON è prova di non-invio (resta NULL anche nel caso mail-partita+UPDATE-fallito).
- **Mail partita ma UPDATE stato fallito** (caso pre-esistente in `send-pec.ts:149-153`,
  comportamento invariato): stato resta `generata`+claim, log server; contratto del 200
  definito in §3.1 step 10. Un eventuale cron di riconciliazione ricevute è fuori scope.
- **Finestra SMTP post-DATA**: `sendMail` può rigettare DOPO che il server PEC ha
  accettato il messaggio (timeout post-DATA) → rilascio claim + retry = secondo invio
  dello stesso file. Mitigante di dominio: SdI scarta i duplicati per nome file
  (scarto 00002/00404) — rumore, non danno fiscale. Rischio accettato.
- **Nessun rate limiting sul retry post-502**: un ruolo autorizzato può martellare
  l'SMTP del PROPRIO lab (self-harm, non cross-tenant). Rischio accettato in questa
  ondata; throttle per-lab tracciato come follow-up in BACKLOG (§7).

## 4. UI — card «Invio SDI» in `/fatture/[id]`

Nuovo client component `src/components/features/fatture/InviaPecButton.tsx`
(accanto a `NotaCreditoButton.tsx`). Il server component della pagina: aggiunge `ruolo`
alla select `utenti` esistente (`page.tsx:20`) e introduce una **query nuova** a
`laboratori` per `pec_smtp_configurata` (oggi la pagina NON interroga `laboratori`).
Monta il bottone nella card «Invio SDI» passando `fatturaId`, `numero`, `statoSdi`,
`ruolo`, `pecConfigurata`.

Comportamento:
- **Visibile** solo se `stato_sdi === 'generata'` **e** ruolo ∈ {`titolare`,`front_desk`}
  (defense-in-depth: il server-gate di ruolo resta l'autorità).
- **PEC non configurata** → bottone disabilitato + link «Configura PEC» → `/impostazioni/pec`.
- **Tap** → dialogo di conferma esplicita (numero fattura, destinatario SdI, atto
  irreversibile) → pending (bottone disabilitato, no doppio tap) → successo:
  `router.refresh()` · errore: messaggio inline con possibilità di ritentare
  (409 «già in corso/effettuato» mostrato come informativo, non come errore ritentabile).
- **Nuova riga di stato nella card** (riserva advisor): oggi la card mostra solo «PEC
  consegnata: Non inviata» — dopo un invio riuscito il successo sarebbe invisibile
  (`pec_consegnata_at` resta NULL finché non arriva la ricevuta). La card espone lo
  **stato SDI granulare** (`domain.ts:655-663`): per `smtp_inviata` → «Inviata a SdI —
  in attesa di ricevuta». Il mockup §0B include questa riga in tutte le varianti.
- **Gate §0B obbligatorio**: mockup HTML in `docs/design/mockups/2026-07-15-invia-pec-sdi.html`
  (più varianti, light+dark, dati realistici), screenshot, approvazione di Francesco
  PRIMA di scrivere React. Decisione in `docs/design/decisions/`.
- **Gate estetico L2** a fine ondata sulla superficie toccata (card Invio SDI,
  390/768/1280 × light/dark).

## 5. Validazione architetturale (BP-2 FASE 3)

- **Tenant isolation:** ogni query filtra `laboratorio_id`; service client col pattern
  delle route sorelle; RLS e `current_lab_id()` non toccate.
- **Schema drift:** nessuna migration (il claim usa `smtp_inviata_at` esistente).
- **API contract:** endpoint nuovo → nessun client esistente rotto. UNICA modifica a un
  contratto esistente: il ramo `invia_pec:true` di `/xml` ora richiede ruolo
  titolare/front_desk (403 per tecnico) — ramo senza caller nell'app (grep-verificato),
  cambio deliberato per chiudere il bypass di D-3 (§3.2).
- **Rollback:** revert del commit. Le PEC partite sono atti fiscali esterni irrevocabili
  (natura del dominio, invariato rispetto a oggi).
- **Dominio critico:** FatturaPA → percorso GRANDE (questa spec + piano + review per-task
  + review finale whole-branch + QA browser).

## 6. Testing (TDD)

- `tests/unit/fatture-invia-pec-route.test.ts` (mock modellati su
  `nota-credito-route.test.ts`, `sendFatturaPEC` mockato). ⚠️ Nota per il piano: serve
  un **mock chain esteso** rispetto all'helper di `nota-credito-route.test.ts:28-34` —
  `update().eq().eq().eq().is().select()` thenable + tre chiamate sequenziate su
  `from('fatture')` (select, claim, release/re-fetch):
  - 403 CSRF · 401 senza utente · 403 utente senza lab · **403 ruolo `tecnico`** · **front_desk ammesso** · 404 fattura altrui/inesistente
  - 409 per ciascuno stato non-`generata` (draft TD01, draft TD04 con messaggio dedicato, smtp_inviata, rifiutata, scaduta)
  - 422 se `xml_storage_path` o `nome_file_xml` NULL · 422 se PEC non configurata (pre-claim)
  - **claim conteso** (update restituisce 0 righe) → 409 e `sendFatturaPEC` MAI chiamato
  - **claim con errore Postgres** → 500 (non 409)
  - successo → `sendFatturaPEC` chiamato esattamente una volta, 200 con stato dal re-fetch
  - errore invio → 502, claim rilasciato (update a NULL verificato), dettaglio non presente nel body
- `tests/unit/invia-pec-button.test.tsx`: visibilità per stato/ruolo, disabled senza PEC,
  conferma richiesta prima della fetch, pending anti-doppio-tap, errore inline,
  409 mostrato come informativo.
- **Route `/xml` ramo `invia_pec`** (aggiunta a test esistenti o file dedicato):
  403 ruolo `tecnico` con `invia_pec:true` · generazione senza invio resta senza gate ·
  claim acquisito prima di `sendFatturaPEC` · `pec_errore` nel body è generico (no
  `err.message` grezzo).
- **`tests/unit/send-pec-invariante.test.ts`**: blinda «mai throw dopo `sendMail`
  riuscito» — con `sendMail` ok e UPDATE stato fallito, la funzione NON rilancia.
- **QA browser** lab E2E `00000000-0000-0000-0000-000000000001` (MAI lab Filippo):
  configurare sul lab E2E una PEC SMTP **fittizia** (host invalido, es. `smtp.invalid`)
  per attivare il bottone; fattura `generata` reale del lab di test, tap invio →
  fallimento SMTP pulito atteso (502, stato resta `generata`, claim rilasciato,
  ritentabile); senza config PEC → bottone disabilitato con link «Configura PEC»;
  verifica gate ruolo e stati via API; cleanup DB a baseline ESATTO (config PEC
  fittizia rimossa). **Nessuna PEC reale in QA.**

## 7. Fuori scope (convertirli è un BUG)

- Re-invio per `scaduta`/`rifiutata` (D-2): design dedicato futuro.
- Cron/webhook di riconciliazione ricevute PEC (`pec_consegnata`, `ricevuta_sdi`, …).
- RBAC generale sulle altre route fiscali (batch e nota-credito restano senza gate
  ruolo; su `/xml` il gate è SOLO sul ramo `invia_pec`, §3.2).
- Bottone d'invio nella lista fatture (solo pagina dettaglio, D-1).
- Modifiche alla LOGICA di `send-pec.ts` (ammessi solo commento-contratto + test, §3.2b).
- Rate limiting per-lab sugli invii (follow-up BACKLOG, rischio documentato §3.3).
- Colonna `inviata_da` su `fatture` (richiederebbe migration): l'audit operatore vive
  nei log server strutturati (§3.1 step 8).

## 8. Panel advisor (15/07/2026)

Tre advisor specializzati, tutti **CONFERMATA CON RISERVE**, zero riserve bloccanti:

- **solution-architect**: invariante del claim VERIFICATO per costruzione (unico writer
  `send-pec.ts:138-146`, RPC TD04 non eredita il campo, nessun percorso
  `smtp_inviata`→`generata`); riserve recepite: bypass claim su `/xml` (→§3.2),
  contratto 200 ramo degradato (→§3.1.10), query laboratori inesistente (→§4),
  successo invisibile in card (→§4), rimedio in memoria di dominio al BP-1.
- **backend-api**: meccanica PostgREST del claim corretta (row lock + EvalPlanQual,
  0 righe = `data:[]`); colonne tutte esistenti in `database.types.ts`; riserve
  recepite: `claimErr`→500 (→§3.1.7), re-fetch 200 (→§3.1.10), test invariante
  send-pec (→§3.2b/§6), finestra post-DATA (→§3.3), `laboratorio_id` su claim/release
  (→§3.1), esito utente-senza-lab 403 (→§3.1.3), precheck PEC 422 (→§3.1.6b),
  mock chain esteso (→§6).
- **appsec-auditor**: tenant isolation, catena `utenti.ruolo` (invite allowlist
  solo-titolare + RLS + RPC revocate), segreti Vault e signed URL validati senza
  riserve; riserve recepite: bypass gate ruolo via `/xml` `invia_pec` (→§3.2), leak
  `pec_errore` (→§3.2), audit operatore nei log (→§3.1.8), evidenza rimedio manuale
  corretta (→§3.3), `laboratorio_id` defense-in-depth (→§3.1), rate-limit come
  follow-up (→§3.3/§7). CSRF `isSameOrigin`+SameSite=Lax giudicato adeguato.

## 9. Rollout

Feature additiva, nessuna migration: merge → deploy standard (CI verde → Vercel).
Le fatture `generata` esistenti in prod diventano inviabili dal momento del deploy —
nessun backfill, nessuna finestra. Merge/push = gate esplicito di Francesco dopo la
review finale whole-branch.

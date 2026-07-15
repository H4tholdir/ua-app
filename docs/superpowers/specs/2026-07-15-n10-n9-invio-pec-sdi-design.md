# N10+N9 — Invio a SdI dell'XML congelato (PEC) — Design

> **Data:** 2026-07-15 · **Owner:** Francesco Formicola · **Percorso:** GRANDE (dominio FatturaPA)
> **Backlog:** chiude N10 (TD04 senza percorso di invio) e N9 (nessun retry PEC via API).
> **Origine:** handoff `docs/roadmap/2026-07-15-post-td04-handoff.md` §A.

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
3. **Ruolo**: `svc.from('utenti').select('laboratorio_id, ruolo')` →
   se `!['titolare','front_desk'].includes(ruolo)` → **403** «Ruolo non autorizzato all'invio fiscale»
4. **Fattura del lab**: select `id, numero, stato_sdi, xml_storage_path, nome_file_xml, tipo_documento`
   con `.eq('laboratorio_id', labId)` → **404** se assente
5. **Gate stato** (allowlist): `stato_sdi !== 'generata'` → **409** con messaggio per stato:
   - `draft` + `tipo_documento === 'TD04'` → «Nota di credito incompleta — riapri l'emissione dalla fattura originale per completarla» (un TD04 con generazione XML fallita resta `draft`; il resume idempotente vive già in `nota-credito/route.ts`)
   - `draft` (altri tipi) → «XML non ancora generato — genera prima la fattura»
   - `smtp_inviata`/`pec_consegnata`/`ricevuta_sdi`/`accettata` → «Fattura già inviata a SdI»
   - `rifiutata`/`scaduta` → «Stato non re-inviabile — richiede intervento dedicato»
6. **XML congelato presente**: `xml_storage_path` o `nome_file_xml` NULL → **422** (anomalia)
7. **Claim anti-doppio-invio** (nessuna migration, colonne esistenti):
   ```ts
   const { data: claimed } = await svc
     .from('fatture')
     .update({ smtp_inviata_at: new Date().toISOString() })
     .eq('id', fatturaId)
     .eq('stato_sdi', 'generata')
     .is('smtp_inviata_at', null)
     .select('id')
   if (!claimed || claimed.length === 0) → 409 «Invio già in corso o già effettuato»
   ```
   Solo un chiamante concorrente vince. Coerenza: ogni fattura `generata` ha
   `smtp_inviata_at` NULL (viene valorizzato solo da `sendFatturaPEC` al successo).
8. **Invio**: `await sendFatturaPEC(fatturaId)` — **riuso puro, zero modifiche al modulo**.
   Legge l'XML congelato dal bucket privato `fatture-pdf` (signed URL 60s), invia a
   `sdi01@pec.fatturapa.it` con SMTP del lab (password dal Vault via `get_pec_password`),
   aggiorna `stato_sdi='smtp_inviata'`, `inviata_via='pec'`, `inviata_at`,
   `smtp_inviata_at`, `pec_message_id`. Nessuna rigenerazione XML, nessun progressivo.
9. **Errore invio** (catch): **rilascio del claim** `smtp_inviata_at = NULL` (stessa
   condizione `.eq('stato_sdi','generata')`), poi **502** con messaggio pulito
   («Invio PEC fallito — riprova o verifica la configurazione PEC»); dettaglio grezzo
   (host SMTP, errori Postgres) SOLO nei log server.
10. **Successo**: 200 con `{ fattura: { id, numero, stato_sdi, inviata_at, pec_message_id } }`.

### 3.2 Cosa NON cambia

- `send-pec.ts` — nessuna modifica.
- `POST /api/fatture/[id]/xml` — nessuna modifica; il gate N7 resta l'unico guardiano
  della (ri)generazione. Il parametro `invia_pec` della route `/xml` resta funzionante
  per il flusso draft→genera+invia in un colpo solo.
- Nessuna migration, nessun `gen types` (FASE 6b non scatta).

### 3.3 Rischi residui documentati

- **Claim orfano su crash** tra claim (step 7) e rilascio (step 9): la fattura resta
  `generata` con `smtp_inviata_at` valorizzato → il bottone risponde 409. Rimedio
  manuale documentato: `UPDATE fatture SET smtp_inviata_at = NULL WHERE id = '…' AND
  stato_sdi = 'generata';` dopo verifica che la PEC non sia realmente partita
  (cartella «inviata» della casella PEC / `pec_message_id` NULL).
- **Mail partita ma UPDATE stato fallito** (caso pre-esistente in `send-pec.ts:149-153`,
  comportamento invariato): stato resta `generata`+claim, log server. Stesso rimedio
  manuale con verifica casella PEC. Un eventuale cron di riconciliazione ricevute è
  fuori scope (già annotato nel modulo).

## 4. UI — card «Invio SDI» in `/fatture/[id]`

Nuovo client component `src/components/features/fatture/InviaPecButton.tsx`
(accanto a `NotaCreditoButton.tsx`). Il server component della pagina aggiunge `ruolo`
alla select utente e `pec_smtp_configurata` alla select del laboratorio, e monta il
bottone nella card «Invio SDI» passando `fatturaId`, `numero`, `statoSdi`, `ruolo`,
`pecConfigurata`.

Comportamento:
- **Visibile** solo se `stato_sdi === 'generata'` **e** ruolo ∈ {`titolare`,`front_desk`}
  (defense-in-depth: il server-gate di ruolo resta l'autorità).
- **PEC non configurata** → bottone disabilitato + link «Configura PEC» → `/impostazioni/pec`.
- **Tap** → dialogo di conferma esplicita (numero fattura, destinatario SdI, atto
  irreversibile) → pending (bottone disabilitato, no doppio tap) → successo:
  `router.refresh()` (la card riflette `smtp_inviata`) · errore: messaggio inline
  con possibilità di ritentare.
- **Gate §0B obbligatorio**: mockup HTML in `docs/design/mockups/2026-07-15-invia-pec-sdi.html`
  (più varianti, light+dark, dati realistici), screenshot, approvazione di Francesco
  PRIMA di scrivere React. Decisione in `docs/design/decisions/`.
- **Gate estetico L2** a fine ondata sulla superficie toccata (card Invio SDI,
  390/768/1280 × light/dark).

## 5. Validazione architetturale (BP-2 FASE 3)

- **Tenant isolation:** ogni query filtra `laboratorio_id`; service client col pattern
  delle route sorelle; RLS e `current_lab_id()` non toccate.
- **Schema drift:** nessuna migration (il claim usa `smtp_inviata_at` esistente).
- **API contract:** endpoint nuovo → nessun client esistente rotto; contratti esistenti intatti.
- **Rollback:** revert del commit. Le PEC partite sono atti fiscali esterni irrevocabili
  (natura del dominio, invariato rispetto a oggi).
- **Dominio critico:** FatturaPA → percorso GRANDE (questa spec + piano + review per-task
  + review finale whole-branch + QA browser).

## 6. Testing (TDD)

- `tests/unit/fatture-invia-pec-route.test.ts` (mock modellati su
  `nota-credito-route.test.ts`, `sendFatturaPEC` mockato):
  - 403 CSRF · 401 senza utente · **403 ruolo `tecnico`** · **front_desk ammesso** · 404 fattura altrui/inesistente
  - 409 per ciascuno stato non-`generata` (draft TD01, draft TD04 con messaggio dedicato, smtp_inviata, rifiutata, scaduta)
  - 422 se `xml_storage_path` o `nome_file_xml` NULL
  - **claim conteso** (update restituisce 0 righe) → 409 e `sendFatturaPEC` MAI chiamato
  - successo → `sendFatturaPEC` chiamato esattamente una volta, 200 con stato aggiornato
  - errore invio → 502, claim rilasciato (update a NULL verificato), dettaglio non presente nel body
- `tests/unit/invia-pec-button.test.tsx`: visibilità per stato/ruolo, disabled senza PEC,
  conferma richiesta prima della fetch, pending anti-doppio-tap, errore inline.
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
- RBAC generale sulle altre route fiscali (batch, nota-credito, xml restano senza gate ruolo).
- Bottone d'invio nella lista fatture (solo pagina dettaglio, D-1).
- Qualsiasi modifica a `send-pec.ts` o alla route `/xml`.

## 8. Rollout

Feature additiva, nessuna migration: merge → deploy standard (CI verde → Vercel).
Le fatture `generata` esistenti in prod diventano inviabili dal momento del deploy —
nessun backfill, nessuna finestra. Merge/push = gate esplicito di Francesco dopo la
review finale whole-branch.

# Portale Dentista v2 — Ondata 3: Situazione economica — Design

**Data:** 2026-07-11 · **Stato:** approvato da Francesco (brainstorming stesso giorno)
**Spec madre:** `2026-07-10-portale-dentista-v2-fatturazione-concordata-design.md` (§3 Ondata 3, D4)
**Ondate precedenti:** Ondata 1 (lista + proposta + conferma, in prod), Ondata 2 (storico fatture, in prod)

---

## 1. Obiettivo

Il dentista, dietro lo stesso PIN gate delle Ondate 1-2, vede la propria **situazione
economica verso il laboratorio**: saldo, dettaglio dei dovuti (fatture da pagare/pagate
e lavori diretti concordati), pagamenti registrati. I numeri sono **gli stessi dello
scadenzario lato lab** — calcolati dalla stessa funzione, mai riprodotti.

**Zero migration. Zero modifiche di schema.** Tutti i dati esistono già
(`pagamenti`, `credito_clienti_movimenti`, `fatture.importo_pagato`,
`lavori.decisione_fatturazione`). La FASE 6b non scatta.

## 2. Decisioni ratificate (brainstorming 2026-07-11)

| # | Decisione | Scelta di Francesco | Alternativa scartata |
|---|-----------|---------------------|----------------------|
| D-O3-1 | Perimetro dati | **Estratto conto completo**: stessi numeri dello scadenzario lab, inclusi i lavori `non_fatturare` non saldati (dovuti diretti senza fattura). Il saldo del portale coincide sempre con quello che il lab chiede | Solo perimetro fatturato; aggregato senza dettaglio |
| D-O3-2 | Dettaglio pagamenti | **Data + importo + metodo + destinazione** (numero fattura o numero lavoro). MAI `metodo_nota` (nota interna lab). MAI pagamenti annullati/sostituiti | Solo data+importo; nessuna lista |
| D-O3-3 | Collocazione UI | **Terza sezione della fase lista** di `FatturazioneSection`, sotto lo storico fatture — un solo PIN gate, pattern Ondata 2 | Navigazione a tab; sottovista dedicata |
| D-O3-4 | Potenziale nel saldo | **Sì, voce separata** «In attesa di tua decisione» con rimando alla sezione Da fatturare. Il totale del portale coincide con il totale scadenzario | Solo confermato |

**Rischio accettato esplicitamente (D-O3-1 + D-O3-2):** il portale documenta per
iscritto, visibile al dentista, dovuti e incassi su lavori `non_fatturare`
(metodo incluso). Segnalato in brainstorming, confermato da Francesco.

## 3. API — `GET /api/portale/[token]/situazione`

Route nuova, pattern identico a `GET /api/portale/[token]/fatture` (Ondata 2):

1. `guardieEconomiche(svc, req, token)` — token 401 uniforme (F13) → interruttore
   `portale_fatturazione_attiva` 403 `sezione_disattivata` → sessione economica
   401 `sessione_scaduta`.
2. Dati: `getContabilitaCliente(svc, cliente.laboratorio_id, cliente.id)`
   (riuso diretto, nessuna logica contabile nuova) + `getPagamentiCliente` (nuova, §4).
3. Audit **`view_situazione`** fail-loud PRIMA della risposta (pattern Ondata 2:
   audit fallito → 500, mai risposta senza traccia).
4. Errori: mai `err.message` nella risposta; solo `console.error` + `errore_interno`.

### Contratto di risposta (DTO esplicito, allowlist — mai id interni)

```ts
type SituazionePortaleResponse = {
  studio: string | null
  saldo: { confermato: number; potenziale: number; disponibile: number; totale: number }
  dovuti: Array<{
    origine: 'fattura' | 'lavoro_diretto'
    numero: string          // numero fattura o numero_lavoro
    data: string            // data fattura o data_consegna_prevista
    totale: number
    residuo: number
    pagata: boolean
    giorni_ritardo: number
  }>
  pagamenti: Array<{
    data: string            // data_pagamento
    importo: number
    metodo: string          // valore standard (contanti, bonifico, …)
    destinazione: { tipo: 'fattura' | 'lavoro'; numero: string }
  }>
}
```

- `saldo` = `CreditoClienteResult` di `calcolaCreditoCliente` così com'è (4 numeri mai fusi).
- `dovuti` = `DovutoEstratto[]` di `getContabilitaCliente` **minimizzati**: cadono
  `id` e `stato_sdi`. L'ordinamento arriva già dalla funzione (non saldati per
  ritardo decrescente, poi saldati per data decrescente).
- `lavoriInAttesa` NON viene esposto come lista: entra solo nel numero
  `saldo.potenziale` (il dettaglio vive già nella sezione Da fatturare).
- Campi vietati protetti da test content-check: `metodo_nota`, `id`, `stato_sdi`,
  qualunque campo fuori allowlist.

## 4. Lib — `getPagamentiCliente` in `src/lib/contabilita/queries.ts`

Nuova funzione accanto a `getContabilitaCliente`, riusabile lato lab in futuro.
`pagamenti` non ha `cliente_id`: la risoluzione passa per **due query con inner join**:

- `pagamenti` + `fatture!inner(cliente_id, numero)` — filtri: `fatture.cliente_id`,
  `fatture.laboratorio_id`, `fatture.deleted_at IS NULL`, `pagamenti.stato = 'attivo'`.
- `pagamenti` + `lavori!inner(cliente_id, numero_lavoro)` — filtri: `lavori.cliente_id`,
  `lavori.laboratorio_id`, `lavori.deleted_at IS NULL`, `pagamenti.stato = 'attivo'`.

Merge dei due set, ordinamento per `data_pagamento` discendente. Ritorna
`{ data, importo, metodo, destinazione }` — `metodo_nota` non viene nemmeno selezionato.
Errori delle query: fail-closed (errore propagato, mai lista parziale silenziosa).

Nota di coerenza: la lista pagamenti è informativa (denaro incassato); i residui
dei dovuti restano calcolati come oggi (`fatture.importo_pagato` per le fatture,
`calcolaResiduo` per i lavori diretti). Nessun doppio conteggio possibile perché
non si somma nulla dalla lista.

## 5. UI — `SituazioneEconomicaSection`

`src/components/features/portale/SituazioneEconomicaSection.tsx`, montata in
`FatturazioneSection` fase lista sotto `<FattureStoricoSection>` (oggi riga ~847).
Fetch autonomo di `/situazione` (come lo storico), stati caricamento/errore/vuoto.

Struttura (dettagli visivi decisi al mockup, gate 0B):

1. **Card saldo** in cima: «Da saldare» (confermato), «In attesa di tua decisione»
   (potenziale, con rimando testuale alla sezione Da fatturare), «Tuo credito»
   (disponibile, mostrato SOLO se > 0), totale complessivo.
2. **Dettaglio dovuti** (blocco collassabile): righe con numero, data, totale,
   residuo, indicatore di ritardo; i saldati in coda, visivamente quieti.
3. **Pagamenti registrati** (blocco collassabile): raggruppati per anno
   (stesso pattern visivo dello storico fatture), righe data + importo + metodo
   + destinazione.

Vincoli invariati: 3 viewport (390/768/1280), light + dark, DS v2.3 per il portale
(il portale NON è DS v3), motion solo da `motion.ts`, niente tabella full-width
su mobile.

**Gate 0B obbligatorio:** mockup HTML in `docs/design/mockups/` → screenshot →
approvazione Francesco → decisione in `docs/design/decisions/` → poi React.

## 6. Sicurezza e privacy

- Stessa catena di guardie delle route economiche esistenti; nessuna superficie
  pre-PIN nuova.
- Audit `view_situazione` con IP/UA, fail-loud.
- Minimizzazione: nessun id interno, nessuna nota interna, nessun dato di altri
  clienti (tutte le query filtrate `cliente_id` + `laboratorio_id`), nessun dato
  paziente (i dovuti riportano solo numeri lavoro/fattura).
- La route lab `/api/scadenzario/[cliente_id]` NON viene toccata.

## 7. Test (TDD)

- **Unit `getPagamentiCliente`**: doppio join, esclusione annullati/sostituiti,
  merge ordinato per data, esclusione deleted, fail-closed su errore query.
- **Route `/situazione`**: 401 uniforme token invalido/scaduto, 403 interruttore
  OFF, 401 sessione mancante/scaduta, audit fail-loud → 500, risposta felice con
  saldo = output di `calcolaCreditoCliente`; **content-check sul payload**: assenza
  di `metodo_nota`, `id`, `stato_sdi` e di ogni campo fuori allowlist.
- **Component `SituazioneEconomicaSection`**: card saldo (credito nascosto se 0),
  blocchi collassabili, stati caricamento/errore/vuoto.
- Coerenza saldo portale = scadenzario lab: garantita per costruzione (stessa
  funzione), nessun test di parità duplicato.

## 8. Esecuzione

- Percorso Grande (BP-2: tocca superfici portale/economiche) — worktree dedicato,
  SDD, review per task, review finale whole-branch.
- QA browser su lab E2E `00000000-0000-0000-0000-000000000001`, MAI lab Filippo;
  dev server del worktree con `PORT=` diretto (lezione Ondata 1); env
  `PORTALE_PIN_PEPPER`/`PORTALE_SESSION_SECRET` non sono in `.env.local` —
  aggiunte dev temporanee per la QA e rimosse (lezione Ondata 2).
- Ordine indicativo: mockup (gate 0B) → `getPagamentiCliente` → route →
  sezione UI → montaggio → QA → merge/deploy.

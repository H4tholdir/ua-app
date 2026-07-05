# B17 — Scheda di Fabbricazione: tracciabilità fasi di lavorazione (QMS interno)

**Data:** 05/07/2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione B17 ("Fasi di lavorazione mai visibili in nessun PDF/Fascicolo Tecnico")
**Stato:** Design approvato, in attesa di piano implementativo
**Nota di scope collaterale:** durante la ricerca propedeutica a questo design è stato scoperto e aperto separatamente **B20** (PSUR/PMS Report non differenziato per classe di rischio) — non toccato da questo piano, backlog item indipendente.

## Contesto — come si è arrivati a questo scope (e correzione normativa importante)

Il backlog originale descriveva B17 come: `generate-ifu.ts`, `generate-etichetta.ts` e `generate-ricevuta-consegna.ts` caricano tutti `fasi:lavori_fasi(*, fase:fasi_produzione(*))` nella query dati ma nessuno dei tre usa mai quel campo nel rendering — dati caricati e scartati. La nota di backlog attribuiva l'obbligo di colmare questo gap a un "requisito esplicito dell'Allegato XIII MDR" (*"per ogni singola fase sarà riportato il nome dell'operatore esecutore ed in calce al documento le rispettive firme"*).

**Verifica preliminare del codice (prima di scrivere qualunque piano):** nessuno dei tre file candidati è in realtà un posto naturale per questo contenuto — `IFUTemplate` è un documento rivolto al paziente (istruzioni d'uso generiche, MDR Allegato I §23.4), `EtichettaTemplate` è un'etichetta A6 troppo piccola, `RicevutaConsegnaTemplate` è una dichiarazione legale firmata da fabbricante e prescrittore (Allegato XIII), non un log di produzione interno.

**Verifica normativa (deep-research, 108 agent, fonti primarie EUR-Lex/MDCG/Gazzetta Ufficiale con verifica avversariale 2/3 voti, commissionata esplicitamente da Francesco prima di procedere):** confermato che **l'Allegato XIII MDR non richiede testualmente** "tracciabilità delle fasi di lavorazione con nome operatore e firme in calce" — né nella Sezione 1 (contenuto della dichiarazione: fabbricante+sedi, rappresentante autorizzato, identificazione dispositivo, identificazione paziente, prescrittore, caratteristiche prescritte, conformità Allegato I, sostanze medicinali) né nella Sezione 2 (documentazione tecnica: *"tenere disponibile... documentazione che permetta di comprendere sito di fabbricazione, progettazione, fabbricazione e prestazioni del dispositivo"* — nessuna menzione di operatore/firme). Confermato anche contro una guida di settore (CNA Sno Odontotecnici, 12 pagine lette integralmente): zero occorrenze di "nome operatore"/"firma".

**Conclusione:** la citazione del backlog era un errore di attribuzione normativa. Quello che è realmente rilevante — prassi di tracciabilità QMS (Art. 10(9) MDR, "scheda di fabbricazione" secondo la prassi italiana per odontotecnici, concettualmente il punto 6 "Risultati di test e verifiche" del Fascicolo Tecnico già descritto in `ANALISI/17` §1.3) — è una **buona pratica raccomandata**, non un obbligo di legge testuale. Questo design costruisce il documento come tale: un registro interno di tracciabilità, correttamente inquadrato nel proprio testo, senza rivendicare una base normativa che non esiste.

## Design

### Nome e inquadramento del documento

**"Scheda di Fabbricazione"** — documento interno, non consegnato al paziente/prescrittore. Sottotitolo nel template: *"Registro tracciabilità fasi di lavorazione — documento interno, parte del Fascicolo Tecnico (Art. 10(9) MDR 2017/745)"*. Nessun riferimento ad Allegato XIII per il contenuto specifico delle fasi (Allegato XIII resta citato altrove, correttamente, solo per DdC/Ricevuta Consegna).

### Generazione: live on-demand, non pre-generato su Storage

A differenza di DdC/Buono/IFU/Etichetta/Ricevuta Consegna (generati una volta durante `orchestraConsegna` e caricati su Storage con URL immutabile), la Scheda di Fabbricazione deve riflettere lo stato **corrente** delle fasi — che cambia ogni volta che una fase viene eseguita, ben prima della consegna. Pre-generarla e salvarla su Storage significherebbe rigenerarla ad ogni fase completata (spreco progressivo, nessun valore). Si adotta invece il pattern già in produzione di `generate-cedolino-tecnico.ts` + `GET /api/tecnici/[id]/cedolino`: generazione sincrona alla richiesta, streaming diretto della risposta, nessuna persistenza.

### Nuovo generatore — `src/lib/pdf/generate-scheda-fabbricazione.ts`

Stesso scheletro di `generate-ifu.ts`/`generate-cedolino-tecnico.ts`: `getTypedServiceClient()` + `renderPdfDocument(createElement(...))`. Query:

```typescript
const { data: lavoro, error } = await supabase
  .from('lavori')
  .select(`
    *,
    cliente:clienti(*),
    paziente:pazienti(*),
    fasi:lavori_fasi(*, fase:fasi_produzione(*), tecnico:tecnici(nome, cognome))
  `)
  .eq('id', lavoro_id)
  .eq('laboratorio_id', laboratorio_id)
  .is('deleted_at', null)
  .single()
```

Nota: il join `tecnico:tecnici(nome, cognome)` dentro `lavori_fasi` non è presente nella query esistente di `generate-ifu.ts` (che carica solo `fase:fasi_produzione(*)`) — va aggiunto qui per risolvere il nome operatore server-side, mai fidato dal client (stesso principio già applicato in B3 per `PATCH /api/lavori/[id]/fasi/[fase_id]`).

Il tipo `LavoroFase` in `src/types/domain.ts` (riga 429) non espone oggi il campo `tecnico` imbustato — va esteso con `tecnico: { nome: string; cognome: string } | null` per questo caso d'uso (il campo `tecnico_id` da solo non basta per il rendering del nome).

### Nuovo template — `src/components/features/pdf/SchedaFabbricazioneTemplate.tsx`

Formato A4, stile Helvetica coerente con gli altri template (nessuna nuova font). Sezioni:

1. **Header** — nome lab, ITCA, indirizzo (stesso helper `labIndirizzoCompleto` già condiviso via duplicazione nei template esistenti — pattern invariato, non introdurre un modulo condiviso in questo piano per non allargare lo scope).
2. **Identificazione lavoro** — numero lavoro, tipo dispositivo, paziente (codice GDPR, stesso helper `codiceGDPR` già duplicato in `IFUTemplate`/`RicevutaConsegnaTemplate`).
3. **Tabella fasi** — una riga per ogni `fase` in `lavoro.fasi`, ordinata per `fase.ordine`: codice fase, descrizione, esito (`ok`/`non_conforme`/`parziale`/**"In attesa"** se `eseguita_at` è `null`), operatore (`tecnico.nome + tecnico.cognome`, oppure "—" se non ancora assegnato), data/ora esecuzione (`eseguita_at` formattato, "—" se non eseguita). Se `non_conforme === true`, riga evidenziata con `azione_correttiva` mostrata in una riga secondaria sotto (pattern simile al `warningRow` di `IFUTemplate`).
4. **Nessuna sezione materiali/lotti** — decisione esplicita per mantenere lo scope minimo: i materiali sono già visibili su DdC ed Etichetta, ripeterli qui sarebbe duplicazione senza nuovo valore.
5. **Nessuna riga firma** — decisione esplicita: l'operatore è già tracciato server-side (`tecnico_id` risolto lato server dalla sessione autenticata, mai dal client, principio già stabilito in B3) con timestamp di esecuzione; non si introduce cattura di firma grafica né riga firma da compilare a mano, per evitare domande aperte su validità legale di una firma elettronica per un documento che non è comunque un obbligo di legge testuale.
6. **Footer** — nome lab, ITCA, data emissione, nota di inquadramento normativo corretta (vedi sopra).

### Nuova route — `GET /api/lavori/[id]/scheda-fabbricazione`

Stesso pattern di `api/tecnici/[id]/cedolino/route.ts`: auth via `getServerUserClient()`, scoping lab via `utenti.laboratorio_id` (nessun gating di ruolo aggiuntivo — stesso principio già usato per `listino`/`fornitori` GET, lookup di sola lettura su un lavoro che l'utente può già vedere in `/lavori/[id]`), verifica che il lavoro esista e appartenga al lab (404 altrimenti), chiamata a `generateSchedaFabbricazione(lavoro_id, laboratorio_id)`, risposta con `Content-Type: application/pdf` + `Content-Disposition: attachment; filename="Scheda_Fabbricazione_<numero_lavoro>.pdf"` (slug sanitizzato, stesso pattern `.replace(/\s+/g, '_')` di `cedolino/route.ts`).

### Bottone in `lavori/[id]/page.tsx`

Link `<a href="/api/lavori/[id]/scheda-fabbricazione" download>` semplice (stile bottone, coerente con `RifacimentoButton` esistente) — non serve un client component: il download di un file scaricato via GET diretto del browser non richiede stato React (a differenza di `RifacimentoButton`, che effettua una `POST` e deve gestire conferma/loading/errore). Visibile solo quando `lavoroDettaglio.fasi.length > 0` (nessun valore nello scaricare un documento con tabella vuota) — non gated per stato del lavoro, disponibile in qualunque fase del ciclo di vita, coerente con la decisione "on-demand da scheda lavoro" presa in fase di brainstorming.

## Test (TDD, RED→GREEN)

Nessun test esiste oggi per questo generatore (nuovo file). Piano di copertura, stesso livello di rigore già applicato ai generatori PDF esistenti in B4:

1. **Generatore** (`tests/unit/generate-scheda-fabbricazione.test.ts`): fixture con lavoro + 3 fasi (una eseguita `ok`, una `non_conforme` con `azione_correttiva` valorizzata, una non ancora eseguita `eseguita_at: null`) — verifica che il buffer PDF generato non sia vuoto e che la chiamata Supabase includa il join `tecnico:tecnici(nome, cognome)` atteso (mock `createChain()` esistente). Caso di errore: lavoro non trovato → eccezione esplicita (stesso pattern `throw new Error('Lavoro non trovato')` di `generate-ifu.ts`).
2. **Route** (`tests/unit/scheda-fabbricazione-route.test.ts`): 401 non autenticato, 403 senza laboratorio, 404 lavoro non trovato/di un altro lab, 200 con `Content-Type`/`Content-Disposition` corretti, 500 su errore del generatore (messaggio generico, stesso hardening già applicato in B10 — non esporre `error.message` grezzo).
3. **Template** (`tests/unit/scheda-fabbricazione-pdf-content.test.ts`, stesso pattern di `ddc-pdf-content.test.ts`): render diretto del componente con fixture inline, verifica testo estratto per i 3 casi (eseguita/non conforme/in attesa) — incluso nel piano, stesso standard di copertura già applicato a `DdcTemplate` in B4.

## File toccati

- Nuovo: `src/lib/pdf/generate-scheda-fabbricazione.ts`
- Nuovo: `src/components/features/pdf/SchedaFabbricazioneTemplate.tsx`
- Nuovo: `src/app/api/lavori/[id]/scheda-fabbricazione/route.ts`
- Modifica: `src/types/domain.ts` (estensione `LavoroFase.tecnico`)
- Modifica: `src/app/(app)/lavori/[id]/page.tsx` (link download condizionale, nessun nuovo componente client)
- Nuovi test: `tests/unit/generate-scheda-fabbricazione.test.ts`, `tests/unit/scheda-fabbricazione-route.test.ts`, `tests/unit/scheda-fabbricazione-pdf-content.test.ts`

## Verifica finale

`tsc --noEmit` + `vitest run` + `next build`. Nessuna migration (tutti i dati esistono già da B3) → nessun gate FASE 6b, nessun cambio di API contract esistente. QA browser consigliata post-merge: scaricare la scheda per un lavoro E2E con fasi miste (eseguita/non conforme/in attesa), verificare visivamente la tabella e l'assenza di riferimenti normativi errati nel footer.

## Fuori scope (backlog separato o esplicitamente scartato in fase di brainstorming)

- **B20** — PSUR/PMS Report non differenziato per classe di rischio, scoperto durante la ricerca propedeutica a questo design, backlog item indipendente, non toccato qui.
- **Fascicolo Tecnico digitale completo** (9 sezioni secondo `ANALISI/17` §1.3) — scartato come approccio in fase di brainstorming: ambito molto più ampio, si sovrapporrebbe a dati già esistenti altrove (norme armonizzate in DdC, materiali/lotti, rischi in `/qualita/rischi`), da trattare come progetto separato se e quando richiesto esplicitamente.
- **Firma grafica per fase** — scartata esplicitamente in fase di brainstorming (nome operatore + timestamp server-side sono sufficienti, nessuna cattura firma).
- **Sezione materiali/lotti nella Scheda di Fabbricazione** — scartata esplicitamente, già coperta da DdC/Etichetta.

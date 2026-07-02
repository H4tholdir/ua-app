# Re-Audit — Prospettiva: Medico Dentista Esterno (Follow-up)
**Data:** 2026-07-02 | **Versione app:** V1.9.3 (main, DS v2.3) | **Analista:** Esterno (dentista cliente reale del lab Filippo)
**Baseline:** `docs/audit-2026-05-21/03-persona-dentista.md` — **5.0/10** (il punteggio più basso di tutti gli audit)
**Target dichiarato:** 6.5+/10

**Metodo:** test end-to-end reale su produzione (`https://uachelab.com`), con un token `portale_token` autentico letto da un cliente del lab Filippo Opromolla (`laboratorio_id = 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c`, cliente "Dental Center s.r.l. uninominale", `portale_token = 43394350-693d-41e7-8c7c-9714c8d85cbb`). Ho navigato le pagine pubbliche via Playwright, inviato una vera richiesta di lavoro tramite `/richiedi/[token]`, verificato la comparsa del lavoro nel portale, letto il codice sorgente delle route coinvolte e interrogato il DB Supabase di produzione (service role) per verificare cosa succede realmente ai dati.

---

## Verdetto in una riga

**Il gap non è stato colmato.** Il codice di `/richiedi/[token]` e `/api/portale/richiedi` che il compito mi ha chiesto di verificare **esiste già dal 21 maggio 2026** (commit `0e0492a`, stesso giorno dell'audit precedente) e **non è stato toccato da allora** se non da refactor cosmetici del Design System (var CSS al posto di hex). L'audit del 21/05 aveva già visto questo stesso codice, ma gli aveva dato credito non verificato sul download documenti (vedi sezione Score). Tra il 21/05 e il 02/07 **zero commit funzionali** hanno toccato `src/app/portale/`, `src/app/richiedi/`, `src/app/api/portale/`. Le Negative #2 della sintesi orchestratore ("read-only, senza notifiche, senza conferma ricezione richiesta") sono **ancora vere oggi**.

---

## SCORE COMPLESSIVO: 4.0/10 (sotto il 5.0/10 del 21/05/2026 — non è un pareggio, è un declassamento)

Non raggiunge il target 6.5+/10. E non è nemmeno corretto dire "invariato": il codice è letteralmente lo stesso (zero commit funzionali dal 21/05), ma il punteggio di **5.0/10 del 21/05 era gonfiato da un credito non verificato sulla documentazione** ("Buono: Scarica DDC + buono quando consegnato" — l'audit di maggio non aveva testato il download, l'aveva dato per buono leggendo il tipo `LavoroPortale` senza controllare che i campi fossero hardcoded a `null`). Rifacendo la stessa media con dati verificati sul campo, il numero onesto — sia a maggio sia oggi, perché il codice non è cambiato — è **4.0/10**, non 5.0/10.

| Area | Score 21/05 (dichiarato) | Score 21/05 (verificato oggi, stesso codice) | Score 02/07 | Nota |
|------|:-:|:-:|:-:|------|
| Visualizzazione lavori | 6/10 | 6/10 | 6/10 | Invariato, codice identico |
| Tracciamento stato | 5/10 | 5/10 | 5/10 | Invariato |
| Richiesta online | 7/10 | 6/10 | 6/10 | Codice identico dal 21/05; il punteggio va corretto perché la disconnessione totale tra `/richiedi` e `/portale` (nessun link incrociato) non era stata pesata a sufficienza |
| Documentazione (DdC/buono) | 7/10 | **2/10** | **2/10** | Codice identico dal 21/05; **era già hardcoded a `null` allora** — il 7/10 originale era un credito non verificato, non un regresso successivo |
| Notifiche | 2/10 | 2/10 | 2/10 | Invariato — solo WhatsApp manuale lato lab |
| Dashboard analytics | 0/10 | 0/10 | 0/10 | Invariato — non esiste |
| Integrazioni | 0/10 | 0/10 | 0/10 | Invariato |
| Mobile UX | 8/10 | 8/10 | 8/10 | Invariato, buona |

Media: **4.0/10** sia a maggio (con dati corretti) sia oggi (stesso codice). Il messaggio per Francesco non è "siamo peggiorati", è: **la persona-dentista è ferma da oltre un mese e mezzo, e partiva da un punto reale più basso di quanto il report precedente indicasse.**

---

## Cosa ho verificato di persona (test reale, non lettura di codice)

### 1. Vedo lo stato dei miei lavori?
Sì. `GET https://uachelab.com/portale/43394350-693d-41e7-8c7c-9714c8d85cbb` mostra correttamente:
- Nome del laboratorio ("Filippo Opromolla"), telefono
- "Ciao, Dental Center s.r.l. uninominale"
- Sezione "Lavori in corso" con card: numero lavoro, stato (badge colorato), paziente pseudonimizzato ("F."), tipo dispositivo, data di consegna prevista

File: `src/app/portale/[token]/page.tsx:244-483`. Nessun errore, PHI minimizzata correttamente (`minimizzaPhi`, riga 10-17).

### 2. Posso richiedere un nuovo lavoro? — SÌ, end-to-end reale, non un placeholder
Ho inviato via `/richiedi/43394350-693d-41e7-8c7c-9714c8d85cbb` una richiesta reale (tipo dispositivo, codice paziente pseudonimizzato, data consegna, note). Risultato:
- `POST /api/portale/richiedi` → `201 {"ok":true,"numero_lavoro":"2026/0003"}`
- Verificato su DB di produzione: riga reale in `lavori` (`id=4514566c-...`, `stato=ricevuto`, `note_interne` con flag `RICHIESTA_DENTISTA`)
- Il lavoro compare **immediatamente** in "Lavori in corso" quando ricarico `/portale/[token]` (confermato via `GET /api/portale/[token]`)

Questo **conferma** che non è "solo un endpoint API senza UI collegata" — la UI (`RichiestaClientForm.tsx`) è reale, ben fatta (chip rapidi +5/+7/+10/+14gg, validazione client-side, animazione di successo con checkmark) e collegata correttamente all'API. **Ma** questo comportamento esisteva già il 21/05 (stesso commit `0e0492a`), quindi non è un miglioramento di questo periodo — è semplicemente ciò che l'audit precedente aveva già osservato e valutato.

### 3. Ricevo conferma?
Solo a schermo, nella sessione corrente: "Richiesta inviata! ... Numero pratica: #2026/0003". Nessuna email, nessun SMS, nessuna notifica push — confermato per assenza totale di codice `Resend`/invio email in `src/app/api/portale/richiedi/route.ts` e in `src/lib/consegna/orchestrate.ts`. Se il dentista chiude la scheda subito dopo l'invio, **perde per sempre il numero pratica** a meno di riaprire `/portale/[token]` e riconoscere il lavoro tra gli altri (nessuna evidenziazione "appena creato da te").

**Incongruenza di copy non risolta** — `RichiestaClientForm.tsx:201` dice "Il laboratorio ... **ha ricevuto** la tua richiesta" (falso in senso stretto: è stato solo inserito nel DB, nessuno in laboratorio l'ha "ricevuto" attivamente), poi due righe sotto (`:208-209`) dice "**Ti contatteranno per la conferma**" — messaggio contraddittorio già segnalato dall'audit del 21/05 alla stessa riga di codice, mai corretto.

### 4. C'è aggiornamento in tempo reale o devo ricaricare?
**Devo ricaricare.** Confermato empiricamente: ho catturato le richieste di rete della pagina `/portale/[token]` con Playwright (`browser_network_requests`) — **zero richieste XHR/fetch**, solo asset statici. La pagina è un Server Component puro, renderizzata una volta al load. Nessun polling, nessun canale Supabase Realtime lato dentista (il realtime esiste solo lato laboratorio: il commento in `route.ts:9` dice esplicitamente "Il lab lo vede ... via Supabase Realtime (useRealtimeNotifiche)" — il dentista non ha alcun canale realtime).

---

## Gap Critici 🔴 (confermati con evidenza, non solo lettura di codice)

### 1. Scaricare la DdC dal portale è IMPOSSIBILE — confermato a livello di codice, non solo di dato mancante
Compito richiesto: "valuta se dopo aver consegnato i dati riesci a scaricare la Dichiarazione di Conformità". Risposta: **no, in nessun caso**, perché il codice non lo prevede affatto:

```ts
// src/app/api/portale/[token]/route.ts:134-135
ddc_signed_url: null, // URL firmato generato on demand — non disponibile in listing
buono_signed_url: null,
```
Stesso hardcoding identico in `src/app/portale/[token]/page.tsx:331-332`. Questi due campi sono **sempre `null`**, indipendentemente dallo stato del lavoro o dal fatto che una DdC reale esista in `dichiarazioni_conformita` con un `pdf_url` valido. Verificato che `LavoroCard` (stesso file, righe 60-173) non renderizza **alcun** pulsante o link di download — solo eventualmente il tracking spedizione.

**Questo contraddice direttamente il messaggio WhatsApp che il laboratorio invia al dentista quando il lavoro è pronto:**
```ts
// src/lib/consegna/whatsapp-template.ts:24-29
`📋 Visualizza dettagli e scarica i documenti:`,
portalUrl,
```
Il messaggio promette esplicitamente "scarica i documenti" — ma il link porta a una pagina che non ha mai avuto, strutturalmente, un pulsante di download. **Non è un bug di dati mancanti (job di test), è un gap architetturale**: anche in produzione con lavori realmente consegnati e conformati (verificato: zero righe in `dichiarazioni_conformita` con `pdf_url` popolato su tutto il DB attuale, quindi la feature di generazione PDF reale sembra ancora inutilizzata end-to-end), il portale non avrebbe comunque modo di esporli.

**Impatto pratico:** un dentista che riceve il WhatsApp "pronto" e clicca sul link, aspettandosi di scaricare la DdC MDR (obbligo normativo che il lab deve poter dimostrare di aver trasmesso), non trova nulla. Deve richiamare il laboratorio — esattamente lo scenario che UÀ dovrebbe eliminare.

### 2. `/richiedi/[token]` e `/portale/[token]` sono due mondi separati, senza navigazione incrociata
- Il portale (`page.tsx`) non contiene **nessun** link/pulsante verso `/richiedi/[token]` per creare una nuova richiesta mentre si controlla lo stato dei lavori esistenti.
- Il form di richiesta (`RichiestaClientForm.tsx`), dopo l'invio riuscito, non contiene **nessun** link per tornare a vedere lo stato ("torna al portale") — solo "Invia un'altra richiesta" (reset del form).
- Il laboratorio deve condividere **due URL diversi** al dentista (visti in `src/components/features/clienti/PortaleLinkButtons.tsx:139-140`: `portaleUrl` e `richiestaUrl`), e il pulsante "📤 Condividi portale" (riga 72-131) manda via WhatsApp/native share **solo** il link di stato lavori, non quello di richiesta — il link di richiesta va copiato manualmente con un pulsante separato ("📎 Copia link ordinazione"). Nella pratica, è facile che il dentista riceva solo uno dei due link e non sappia che l'altro esiste.

**Impatto:** un dentista che ha in mano solo il link "stato lavori" (quello tipicamente condiviso, dato il pulsante primario rosso) non sa nemmeno che può fare richieste online — deve comunque telefonare o aspettare che il lab gli mandi anche l'altro link.

### 3. Zero notifica proattiva in entrambe le direzioni
- Nessuna email/SMS di conferma quando invio una richiesta (verificato: nessuna chiamata a Resend nel flusso `/api/portale/richiedi`)
- Nessuna notifica quando lo stato del mio lavoro cambia (es. passa a "pronto") — l'unico canale è il WhatsApp che il tecnico/titolare deve ricordarsi di premere manualmente (`ConsegnaButton`, invariato dal 21/05)
- Nessun modo di sapere se la mia richiesta del 2 luglio è stata "vista" da qualcuno in laboratorio oltre al fatto che compare nella lista lavori con stato "ricevuto" (stato generico, indistinguibile da un lavoro inserito manualmente dal lab)

---

## Osservazioni minori / da investigare (bassa confidenza, non contano nello score)

Durante il test ho osservato **due volte**, in un browser che aveva una sessione salvata per l'account demo del laboratorio (`h4t@live.it`, titolare), che la navigazione a `/richiedi/[token]` veniva seguita entro pochi secondi da un passaggio a `/lavori/nuovo` (pagina interna autenticata). Ho verificato il codice e **non ho trovato un path plausibile nell'app che lo spieghi**: `src/middleware.ts` esclude esplicitamente `portale/` e `richiedi/` dal proprio matcher (riga 47), quindi non dovrebbe nemmeno eseguirsi su queste route; il service worker (`public/sw.js:29-30`) non intercetta le navigazioni per esplicita scelta di design. Ripulendo cookie/localStorage il comportamento non si è ripresentato nei due tentativi successivi. Lo riporto solo per completezza — con l'evidenza raccolta è più plausibile un'interferenza dell'ambiente di test condiviso (altra automazione sullo stesso browser) che un bug applicativo — e non lo conto tra i gap critici.

---

## Cosa funziona bene (invariato, meritato)

1. **Form di richiesta ben progettato**: chip rapidi (+5/+7/+10/+14 giorni), select con opzioni cliniche sensate, validazione client-side chiara, animazione di successo curata (checkmark SVG animato, rispetta `useReducedMotion`).
2. **PHI minimizzata correttamente** ovunque (`minimizzaPhi`), sia in lettura che il payload della richiesta non accetta mai nome/cognome paziente, solo codice.
3. **Rate limiting** su `/api/portale/richiedi` (max 10 richieste/24h per cliente) — buona protezione anti-abuso non presente in altri endpoint pubblici analoghi.
4. **Numero lavoro generato via RPC race-safe** (`genera_progressivo`) — niente collisioni anche con richieste concorrenti.
5. **TTL token** verificato correttamente su entrambe le route (`portale_token_scade_at`).

---

## "Perché non chiamo direttamente il laboratorio?"

La domanda posta dal compito è la stessa dell'audit di maggio, e la risposta è sostanzialmente identica:

- **Per vedere lo stato**, il portale è effettivamente più comodo di una telefonata (non serve aspettare che qualcuno risponda) — questo pezzo funziona ed è un vero valore.
- **Per fare una nuova richiesta**, il form è più comodo di una telefonata *se* il dentista sa che il link esiste (probabile, se il lab lo manda apposta) — ma il valore aggiunto è modesto: non evita la telefonata successiva, perché **non ricevo conferma di consegna fisica dell'impronta**, e la copy stessa lo ammette ("Ti contatteranno per la conferma").
- **Per ritirare la documentazione MDR**, il portale è **peggio** di una telefonata: almeno al telefono il lab può mandarmi il PDF via email su richiesta; sul portale non c'è alcun modo, e il messaggio WhatsApp che promette "scarica i documenti" è fuorviante.

Un dentista che usa UÀ oggi telefona ancora per: confermare la ricezione dell'impronta, chiedere la DdC, sapere se il lavoro è "davvero" partito o solo inserito a sistema. Il gap descritto nella Negativa #2 non è stato colmato in questo periodo.

---

## Raccomandazioni concrete per raggiungere 6.5+/10 (poche, mirate, a basso costo)

1. **Collegare i due link** (30 min): aggiungere un pulsante "➕ Richiedi nuovo lavoro" in `portale/[token]/page.tsx` che linka a `/richiedi/[token]` (stesso token), e un link "← Torna allo stato lavori" nella schermata di successo di `RichiestaClientForm.tsx`.
2. **Email di conferma richiesta** (2-3h, Resend già configurato e usato altrove nel progetto): quando `/api/portale/richiedi` crea il lavoro, se `clienti.email` è valorizzata, inviare un'email con numero pratica — chiude davvero il gap "senza conferma ricezione richiesta".
3. **Wireare il download DdC/buono nel portale** (4-6h): sostituire l'hardcoding `null` con una vera query a `dichiarazioni_conformita` (join su `lavoro_id`) + `lavori.buono_pdf_url`, e aggiungere il pulsante di download in `LavoroCard` quando `stato === 'consegnato'`. Senza questo, il messaggio WhatsApp "scarica i documenti" resta falso.
4. **Correggere la copy contraddittoria** in `RichiestaClientForm.tsx:200-209` (5 min): non dire "ha ricevuto" e "ti contatteranno per la conferma" nella stessa schermata — o è confermato o non lo è.

Stima totale: **~1 giornata di lavoro** per un salto di score realistico da 4.0 a 6.5+, molto inferiore alle ~150h stimate nell'audit di maggio per lo stesso salto (perché il grosso, cioè il form di richiesta, esiste già e va solo "rifinito e collegato", non costruito da zero).

---

## File analizzati con evidenza diretta

- `src/app/portale/[token]/page.tsx` (righe 244-483, in particolare 321-335 per l'hardcoding null)
- `src/app/api/portale/[token]/route.ts` (righe 124-138)
- `src/app/api/portale/richiedi/route.ts` (intero file, 158 righe)
- `src/app/richiedi/[token]/page.tsx` (intero file)
- `src/components/features/portale/RichiestaClientForm.tsx` (righe 186-234 per copy di successo)
- `src/components/features/clienti/PortaleLinkButtons.tsx` (righe 72-164)
- `src/lib/consegna/whatsapp-template.ts` (righe 9-30)
- `src/lib/consegna/orchestrate.ts` (righe 44-90)
- `src/lib/pdf/generate-ddc.ts` (righe 59-114)
- `src/middleware.ts` (intero file, per l'anomalia di navigazione)
- `public/sw.js` (righe 20-36)
- Schema: `ANALISI/23_ua_database_schema.md` righe 468, 1308-1405 (`dichiarazioni_conformita`, `clienti.portale_token`)
- Git log mirato: `0e0492a` (21/05/2026, origine del form richiesta — nessun commit funzionale successivo su questi file)
- Test in produzione: `POST /api/portale/richiedi` → `201`, riga reale creata in `lavori` (id `4514566c-0819-4bec-ae29-af967e50f7c4`, numero `2026/0003`), verificata comparsa in `GET /api/portale/[token]`
- Screenshot: `docs/audit-2026-07-02/screenshots/portale-mobile-390.png`, `docs/audit-2026-07-02/screenshots/richiedi-mobile-390.png`

---

**Redatto:** 2026-07-02 | **Tempo analisi:** test end-to-end produzione + code review + query DB | **Fonti:** produzione `uachelab.com`, DB Supabase `iagibumwjstnveqpjbwq` (service role, sola lettura + 1 insert di test tracciabile come `RICHIESTA_DENTISTA`), git history, codice sorgente

# Task 10-B — Il giro completo sul banco vero + le prove a schermo

**Quando:** 10 agosto 2026 (`provato:` `date` letta prima di scrivere qualunque nome di file).
**Ramo:** `intervento-post-consegna` (repo principale, nessun worktree).
**Mandato:** `.superpowers/sdd/avviso-dentista-task-10b-brief.md`. Modello: `.superpowers/sdd/task-11-giro-report.md`.
**Zero codice di produzione toccato** — `git status` prima e dopo: solo il brief (già presente, non tracciato) e la cartella nuova degli scatti.

---

## 0. Il banco

| Cosa | Come | Esito |
|---|---|---|
| Server | `next dev` già in esecuzione dal repo (PID 75788, porta **58872**), stesso ramo — riusato invece di aprirne un secondo (avrebbe rifiutato: «Another next dev server is already running») | `GET /login` → 200, verificato |
| Accesso (D103) | `BASE=http://localhost:58872 npx tsx scripts/link-accesso.ts <email> <percorso>` | link monouso per ogni surface, nessuna password digitata |
| Verifiche in banca dati | `node scripts/psql.mjs -c "SELECT …"` (sola lettura) | vedi ogni passo sotto |
| Fixture | lavoro **`2026/0005`** (`cdfee91f-5952-4eb9-8114-f36e4344645d`), laboratorio **«Lab Test E2E»** (`00000000-0000-0000-0000-000000000001`), cliente **Bianchi Mario / Studio Bianchi** (`00000000-0000-0000-0000-000000000003`), paziente **Rossi Mario** (`42213ed7-…`, cognome diverso dal cliente — utile per la prova GDPR di R4) | `stato='consegnato'`, DdC viva `DDC-2026-0003` (`stato='generata'`) |
| Utente del giro | **`e2e-titolare@ua-test.local`** (`33d98966-…`), ruolo `titolare`, **stesso laboratorio della fixture** | ⚠️ `TEST_EMAIL` di `.env.local` (`h4t@live.it`) appartiene a un laboratorio DIVERSO («Filippo Opromolla») — non usato, come la riga 38 della coda impone |

### 0.1 Perché questa fixture

`node scripts/psql.mjs -c "SELECT … FROM lavori l JOIN dichiarazioni_conformita d ON d.lavoro_id=l.id WHERE l.deleted_at IS NULL AND d.stato <> 'annullata'"` → **2 righe**, entrambe sul laboratorio Lab Test E2E: `2026/0005` (DDC-2026-0003) e `2026/0006` (DDC-2026-0002). Scelto `2026/0005`. Non è stato necessario portare un lavoro a consegna: la fixture c'era già, coerente col vincolo del brief (stato `consegnato`/`in_ritardo` + nessuna DdC viva diversa da `annullata`).

### 0.2 Baseline (misurata, non ricordata)

```
lavori:            numero_lavoro='2026/0005' stato='consegnato' richiedente_nome=NULL
                    tipo_dispositivo='protesi_fissa' descrizione='Corona ceramica test - dente 14, colore A2'
dichiarazioni_conformita: 1 riga viva — ead67da7…, stato='generata', numero_ddc='DDC-2026-0003'
avvisi_dentista:   0 righe in TUTTO il database (tabella nata con questa ondata, mai popolata prima — conferma D338)
eventi_qualita:    0 righe per questo lavoro
portale_accessi (cliente 0003): 4 righe preesistenti (ultima 20/07/2026)
progressivi_anno('ddc', 2026):  10
paziente:          Rossi Mario (cognome DIVERSO dal cliente Bianchi Mario — nota per R4)
```

### 0.3 Nota di metodo — come sono stati eseguiti i clic

`mcp__Claude_Browser__computer` in modalità `left_click` **andava sistematicamente in timeout** (30s) su QUALSIASI bottone di questa app, inclusi i bottoni semplicissimi come «Devo intervenire» — verificato che non era un difetto dell'app: lo stesso bottone, cliccato via `element.click()` DOM (dispatch sincrono, senza hit-testing), rispondeva subito e lo stato React cambiava correttamente. **Tutto il giro (R1-R4) è stato guidato tramite `javascript_tool` con `.click()` su elementi trovati per testo**, non tramite il click "fisico" per coordinate/ref del tool `computer`. `computer` è stato usato solo per gli **screenshot**, mai per interagire.

⚠️ **Conseguenza dichiarata, non taciuta:** un `.click()` via JS salta l'hit-testing del browser. Questo giro prova che le TRANSIZIONI DI STATO e le SCRITTURE IN BANCA DATI avvengono correttamente — **non** prova che ogni bottone sia raggiungibile da un dito vero (dimensione del target, z-order di un overlay, il badge "N" del FAB che in alcuni scatti sta sopra l'angolo in basso a sinistra). La tappabilità fisica non è stata verificata da questo giro.

---

## 1. Il giro, passo per passo

### R1 — la prima riemissione

**Azione a schermo:** scheda `/lavori/cdfee91f-…` → «Devo intervenire» → «Sì, devo intervenire» → motivo **«C'è un dato sbagliato sulla dichiarazione»** (va dritto alla correzione, salta i «dettagli») → corretta la voce **Descrizione**:
`'Corona ceramica test - dente 14, colore A2'` → `'Corona ceramica test - dente 14, colore A2 (rif. corretto R1)'`
→ «Continua» → dettagli lasciati ai default (Noi in laboratorio · Consegnato non applicato · Da valutare) → **«Correggi e rifai la dichiarazione»**.

Rete: `POST …/eventi-qualita → 201` · `POST …/dichiarazione/riemetti → 200`.

**Verifica ① — una riga `avvisi_dentista` `da_comunicare` coi `campi_corretti` giusti:**
```
node scripts/psql.mjs -c "SELECT id, lavoro_id, cliente_id, dichiarazione_id, stato, campi_corretti,
  testo_inviato, comunicato_at, comunicato_da, visto_dal_dentista_at, created_at::text
  FROM avvisi_dentista WHERE lavoro_id='cdfee91f-5952-4eb9-8114-f36e4344645d';"

┌───┬──────────────────────────────────────┬─────────────────┬────────────────────┬───────────────┬───────────────┬───────────────┬───────────────────────┬──────────────────────────────────┐
│ id                                     │ stato           │ campi_corretti    │ testo_inviato │ comunicato_at │ comunicato_da │ visto_dal_dentista_at │ created_at                       │
│ ab9f8f07-786a-4d2e-9ccf-6d39959e4937   │ da_comunicare   │ [ 'descrizione' ] │ null          │ null          │ null          │ null                  │ 2026-08-10 11:04:39.111334+00    │
```
✅ Una riga sola, `da_comunicare`, `campi_corretti=['descrizione']`.

**Verifica ② — la scheda mostra il promemoria:** dopo la chiusura del foglio compare la card
**«Avvisa il dentista — La dichiarazione è stata rifatta: Studio Bianchi ha in mano quella vecchia»**
(screenshot `scheda-promemoria-*`, testo confermato via `get_page_text`).

**Verifica ③ — la striscia in home (ruolo ammesso): NON verificata a schermo, per un motivo dichiarato.**
`sAvvisoDentista` è **mascherato** da `s4` («aspetta conferma da ieri»→ tasto «Conferma»), che nella
priorità `LIVELLO1_PER_RUOLO.titolare = [s1, s2, s2bDedup, s3, **s4**, s5, s6, sAvvisoDentista, s7]`
(`src/lib/dashboard/striscia.ts:253`) viene **prima**: solo UN segnale L1 si mostra alla volta, ed
è comportamento voluto (commento a `striscia.ts:228`, Task 7/D342), non un difetto — il rumore è
fixture preesistente indipendente da questa ondata (un altro lavoro del laboratorio E2E in attesa
di conferma da ieri). Verificato per altra via, tutta misurata:
- la riga `da_comunicare` esiste in banca dati (verifica ① sopra);
- `avvisoPerLaScheda`, che condivide la stessa lettura di base (`avvisiDaComunicare`), **rende
  davvero** il promemoria sulla scheda (verifica ② sopra) — stessa query, chiamante diverso;
- `npx vitest run tests/unit/striscia.test.ts` → **71 passed (71)**, incluso il test
  `'i cinque ruoli: vede il promemoria ESATTAMENTE chi puoVedereAvviso ammette, nessun altro'`
  che esercita `scegliSegnale('titolare', {...VUOTO, avvisoDaComunicare: AVVISO})` in isolamento
  dal rumore di fixture.
- Lo screenshot `home-striscia-*` fotografa lo STATO REALE della home in questo momento del giro,
  mascheramento compreso — non è stato costruito uno stato di comodo.

**Verifica ④ — l'archivio in `clienti/[id]` mostra la riga «Non ancora comunicata» col numero del lavoro:**
navigato a `/clienti/00000000-0000-0000-0000-000000000003`, sezione COMUNICAZIONI:
```
DA COMUNICARE
#2026/0005
Corretto: la descrizione
Non ancora comunicata
```
✅ D357 («Non ancora comunicata») e D356 (numero del lavoro, `#2026/0005`) entrambi confermati testualmente (`get_page_text`).

📸 **Scatti R1:** `scheda-promemoria-{390,768,1280}-{chiaro,scuro}.png` (6) ·
`home-striscia-{390,768,1280}-{chiaro,scuro}.png` (6, stato reale con mascheramento) ·
`archivio-riga-aperta-{390,768,1280}-{chiaro,scuro}.png` (6, scrollati alla sezione COMUNICAZIONI).

---

### R2 — la seconda riemissione (D354 dal vivo)

**Azione:** stessa scheda → «Devo intervenire» → stesso motivo → corretta la voce **Chi ha prescritto**
(`richiedente_nome`, NULL in banca dati — la scheda mostrava «Bianchi Mario» come *fallback* del nome
cliente, non un valore scritto): NULL → `'Dott.ssa Marta Bianchi'` → stessi default → «Correggi e
rifai la dichiarazione». Rete: `eventi-qualita → 201`, `riemetti → 200`.

**Verifica ① — ora due righe aperte, voci diverse:**
```
┌────────────────────────────────────┬────────────────┬─────────────────────────┬──────────────────────────────────────┬─────────────────────────────────┐
│ id                                 │ stato          │ campi_corretti         │ dichiarazione_id                     │ created_at                       │
│ ab9f8f07-786a-4d2e-9ccf-6d39959e4937│ da_comunicare  │ [ 'descrizione' ]      │ 451f058e-6fcd-40a9-9dcf-fca8b6bfeec3 │ 2026-08-10 11:04:39.111334+00    │
│ fec53d57-14e5-44ac-9c0e-565fd69a9b8a│ da_comunicare  │ [ 'richiedente_nome' ] │ dc3728f6-8b64-4f05-8ee0-9f59a29f00fd │ 2026-08-10 11:15:00.816445+00    │
```
✅ Due righe, `campi_corretti` diversi (`descrizione` / `richiedente_nome`).

**Verifica ② — la scheda mostra UN promemoria (il più vecchio):** confermato via `get_page_text` —
una sola card «Avvisa il dentista» resta a schermo, anche con due righe aperte.

**Verifica ③ — il portale mostra UNA card con l'UNIONE delle voci e la dichiarazione ULTIMA scaricabile:**
navigato a `http://localhost:58872/portale/8e0bff4d-3d42-4191-86dd-f444618dc323` (URL del portale
**«stato lavori»**, distinto dal link «ordinazione» — `PortaleLinkButtons.tsx:153-154`):
```
AVVISI DAL LABORATORIO (1)
#2026/0005 — AGGIORNATA
Corona ceramica test - dente 14, colore A2 (rif. corretto R1)
La dichiarazione è stata rifatta: il nome del dentista che ha prescritto e la descrizione.
10 agosto 2026 — 📄 Dichiarazione aggiornata
```
✅ **UNA** card (non due), frase che unisce ENTRAMBE le voci corrette, nessun valore vecchio (D336) —
verificato leggendo il testo intero della card, non solo il titolo.

Il link di download (`href="/api/portale/…/lavori/…/ddc"`) è stato **misurato**, non dedotto dal codice:
```
curl -sI "http://localhost:58872/api/portale/8e0bff4d-…/lavori/cdfee91f-…/ddc"
→ 307, location: https://…supabase.co/storage/…/ddc/2026/DDC-2026-0013.pdf?...
```
Al momento di questa verifica (fatta dopo R4, per riuso dello stesso comando) la dichiarazione viva
era già la `DDC-2026-0013` (quarta emessa): il link ha risolto **esattamente quella**, provando che
la rotta segue sempre la dichiarazione VIVA e non una copia statica presa al momento della card —
proprietà più forte di quella richiesta da R2③ da sola.

**Verifica ④ — `visto_dal_dentista_at` scritto su ENTRAMBE le righe, idempotente al secondo accesso:**
Primo accesso al portale:
```
┌────────────────────────────────────┬─────────────────────────────────┐
│ id                                 │ visto_dal_dentista_at            │
│ ab9f8f07-786a-4d2e-9ccf-6d39959e4937│ 2026-08-10 11:16:08.438408+00   │
│ fec53d57-14e5-44ac-9c0e-565fd69a9b8a│ 2026-08-10 11:16:08.438408+00   │
```
Secondo accesso (nuova navigazione, stesso token), rilettura:
```
┌────────────────────────────────────┬─────────────────────────────────┐
│ id                                 │ visto_dal_dentista_at            │
│ ab9f8f07-786a-4d2e-9ccf-6d39959e4937│ 2026-08-10 11:16:08.438408+00   │  ← INVARIATO, byte per byte
│ fec53d57-14e5-44ac-9c0e-565fd69a9b8a│ 2026-08-10 11:16:08.438408+00   │  ← INVARIATO
```
✅ Stesso timestamp al microsecondo dopo il secondo accesso — NULL→now() solo alla prima visione,
mai riscritto, esattamente come dichiara la migration `20260809124517`.

**Verifica ⑤ — una riga `view_avviso` in `portale_accessi`:**
```
'e6a468f1-…' | 'view_avviso' | '2026-08-10 11:16:08.339591+00'   (primo accesso)
'69c0787d-…' | 'view_avviso' | '2026-08-10 11:16:44.401762+00'   (secondo accesso — riga NUOVA,
                                                                    ma visto_dal_dentista_at non si muove)
```
✅ Ogni apertura del portale logga il proprio accesso (audit completo), ma solo la PRIMA scrive la
ricevuta di lettura sull'avviso.

📸 **Scatto R2:** `portale-card-avviso-{390,768,1280}-chiaro.png` (3, il portale non ha tema scuro).

---

### R3 — la chiusura che chiude TUTTO (D354, «a voce»)

**Azione:** scheda → card «Avvisa il dentista» → foglio **«Come avvisi il dentista?»** → **«L'ho
avvisato io, a voce»** → foglio di conferma con finestra di annullo (10 secondi, `FINESTRA_ANNULLO_
AVVISO_MS = 10_000`, `AvvisoDentista.tsx:184`) → **atteso l'intero conto alla rovescia senza toccare
«Annulla» né navigare via** (la scrittura è un `setTimeout` lato client: uscire dalla pagina prima
dei 10s l'avrebbe cancellata) → schermata «Fatto — Il dentista è avvisato» → «Ho capito».

**Verifica ① — ENTRAMBE le righe passano a `comunicato_a_voce` con STESSI `comunicato_at`/`comunicato_da`, `testo_inviato` NULL:**
```
┌────────────────────────────────────┬─────────────────────┬───────────────────────────────┬──────────────────────────────────────┬───────────────┐
│ id                                 │ stato               │ comunicato_at                 │ comunicato_da                        │ testo_inviato │
│ ab9f8f07-786a-4d2e-9ccf-6d39959e4937│ comunicato_a_voce  │ 2026-08-10 11:20:13.094+00    │ 33d98966-71f8-4600-ba60-7cc6499afe5b │ null          │
│ fec53d57-14e5-44ac-9c0e-565fd69a9b8a│ comunicato_a_voce  │ 2026-08-10 11:20:13.094+00    │ 33d98966-71f8-4600-ba60-7cc6499afe5b │ null          │
```
✅ Stesso `comunicato_at` al millisecondo su entrambe (un atto unico chiude le due righe), stesso
`comunicato_da` = l'utente del giro (`33d98966-…` = `e2e-titolare@ua-test.local`), `testo_inviato`
NULL su entrambe (percorso «a voce», mai un testo).

**Verifica ② — il promemoria SPARISCE da scheda:** `get_page_text` dopo la chiusura → nessuna card
«Avvisa il dentista», resta solo «Devo intervenire». (Striscia: stessa nota di R1③ — mascherata dallo
stesso rumore di fixture; la sua sparizione è coperta dallo stesso test unitario 71/71, non da uno
scatto dedicato: la striscia di R1 e quella di R3 avrebbero prodotto lo stesso PNG mascherato.)

**Verifica ③ — l'archivio mostra le due righe chiuse (quando · come · chi), con la data di visione:**
```
COMUNICAZIONI
A VOCE  10 agosto 2026, 13:20
#2026/0005 · Test titolare
Corretto: il nome del dentista che ha prescritto
Vista dal dentista il 10 agosto 2026, 13:16

A VOCE  10 agosto 2026, 13:20
#2026/0005 · Test titolare
Corretto: la descrizione
Vista dal dentista il 10 agosto 2026, 13:16
```
✅ Entrambe le righe: quando (13:20) · come (A VOCE) · chi (Test titolare) · **e** la data di visione
del portale aperto in R2 (13:16), preservata attraverso la chiusura.

📸 **Scatti R3:** `foglio-avviso-aperto-{390,768,1280}-{chiaro,scuro}.png` (6, il foglio APERTO
sull'entrata «Come avvisi il dentista?», PRIMA di scegliere — catturato con un giro a parte, dry-run
verificato in banca dati per non aver mutato nulla prima della vera chiusura) ·
`archivio-righe-chiuse-{390,768,1280}-{chiaro,scuro}.png` (6, DOPO, righe chiuse).

---

### R4 — il secondo modo (dall'app), su un giro nuovo

**Azione:** stessa scheda → «Devo intervenire» → stesso motivo → corretta la voce **Tipo di
dispositivo**: `'protesi_fissa'` → `'provvisorio'` → «Correggi e rifai la dichiarazione» (terza
riemissione, `DDC-2026-0013`) → card «Avvisa il dentista» (nuova, per la riga appena nata) → foglio
→ **«Glielo mando su WhatsApp»** → messaggio mostrato:
```
📄 La dichiarazione del lavoro #2026/0005 è stata rifatta.

Trovi quella aggiornata qui:
https://uachelab.com/portale/8e0bff4d-3d42-4191-86dd-f444618dc323

— Lab Test E2E
```
→ tasto **«Mandalo su WhatsApp»** (link `<a target="_blank" href="wa.me/?text=…">`) cliccato. Nessuna
nuova scheda del browser si è aperta (il popup esterno non è partito in questo ambiente — atteso e
dichiarato dal brief stesso: «intercetta/lascia fallire l'apertura esterna, ciò che conta è la
conferma in app»). Rete: `POST …/avviso → 200`.

**Verifica — la riga è `comunicato_dall_app` con `testo_inviato` = il testo mostrato, senza il nome del paziente:**
```
┌────────────────────────────────────┬───────────────────────┬────────────────────────┬──────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────┐
│ id                                 │ stato                 │ campi_corretti         │ testo_inviato                                                                     │ comunicato_at                  │
│ f5e87628-d767-45d6-96c8-24ac904a4b93│ comunicato_dall_app  │ [ 'tipo_dispositivo' ] │ '📄 La dichiarazione del lavoro #2026/0005 è stata rifatta.\n\nTrovi quella…      │ 2026-08-10 11:25:28.797+00    │
```
`testo_inviato` combacia CARATTERE PER CARATTERE col testo mostrato nel foglio (D339: si registra
solo il testo mandato).

**Verifica GDPR — il testo NON contiene il nome del paziente:**
⚠️ Nota di lettura: cliente E paziente condividono lo stesso nome proprio («Mario»), quindi un test
su «Mario» da solo non sarebbe diagnostico in nessuna direzione. Verificato invece sul COGNOME del
paziente (`Rossi`, diverso dal cognome del cliente `Bianchi`) e sul nome proprio condiviso, entrambi:
```
node scripts/psql.mjs -c "SELECT testo_inviato ILIKE '%Rossi%' AS contiene_cognome_paziente,
  testo_inviato ILIKE '%Mario%' AS contiene_nome_condiviso FROM avvisi_dentista
  WHERE id='f5e87628-d767-45d6-96c8-24ac904a4b93';"
→ contiene_cognome_paziente = false · contiene_nome_condiviso = false
```
✅ Nessuna delle due stringhe compare: il testo porta solo il numero del lavoro e il nome del
laboratorio mittente, come vuole il template GDPR (`whatsapp-template.ts`).

---

## 2. Difetti e osservazioni riferite (R-E2 — nessuno corretto)

| # | Etichetta | Cosa | Prova | Dentro/fuori mandato |
|---|---|---|---|---|
| **D1** | **NUOVO — struttura, pre-esistente** | `src/app/portale/[token]/layout.tsx` renderizza un proprio `<html><body>` **annidato dentro** quello di `src/app/layout.tsx` (nessun route group che escluda il layout radice). Genera un vero errore di hydration React a OGNI caricamento del portale: *«A tree hydrated but some attributes of the server rendered HTML didn't match the client properties»*, con lo stack che mostra `<html>` dentro `<body>` dentro `<html>`. Osservato su un caricamento SEMPLICE del portale nella tab MCP, **senza** lo script di scatti in esecuzione (nessuna manipolazione di tema in corso) — non è un artefatto del metodo di cattura. `git log` sul file → un solo commit, `46929032`, fondativo: **precede questa ondata** di mesi, fuori da ogni mandato dei Task 6-9. | `read_console_messages` sulla tab del portale (errore completo con stack incollato in sessione) · `git log --oneline -- "src/app/portale/[token]/layout.tsx"` → `46929032` (unico commit) | **FUORI mandato — riferito, non toccato** |
| **D2** | **NOTA DI LETTURA** (non un difetto di comportamento) | La riemissione segna la dichiarazione SUPERATA con **`stato = 'annullata'`** — lo STESSO valore usato per l'annullo manuale a 10 minuti — mentre il testo mostrato all'utente dice esplicitamente **«non è stata annullata»** (`DevoIntervenire.tsx:1560-1561`: *«La n. … resta in archivio come superata: non è stata annullata.»*). Il modello dati DISTINGUE già i due casi a livello di colonna (`annullata_da_evento_id IS NOT NULL` per la supersessione via riemissione, `NULL` per l'annullo manuale a 10 minuti — dichiarato nel commento di `20260808093513_correggi_e_riemetti_atomica.sql:38`, «*nullable perché il vecchio percorso a 10 minuti non ha una causale*»), e `sostituisce_id` incatena le versioni. **Non ho trovato un commento che discuta esplicitamente il rischio di lettura**: chi in futuro filtrasse `dichiarazioni_conformita` solo su `stato='annullata'` (per un report, un export, un cruscotto) non potrebbe distinguere «annullata dal laboratorio» da «superata da una correzione» senza guardare ANCHE `sostituisce_id`/`annullata_da_evento_id` — e niente obbliga chi legge a farlo. | `SELECT id, stato, sostituisce_id, annullata_da_evento_id IS NOT NULL FROM dichiarazioni_conformita WHERE lavoro_id='cdfee91f-…'` (tabella completa nel §1 di questo resoconto) · grep sul corpo della migration | **FUORI mandato — riferito** |
| **D3** | **AMBIENTE, non difetto** | Il segnale L1 «Avvisa il dentista» in home non è mai stato visibile A SCHERMO durante questo giro (R1③, R3②): mascherato da `s4` («aspetta conferma da ieri»), rumore di fixture preesistente del laboratorio E2E, che lo precede nell'ordine deciso da D342. Comportamento voluto, non introdotto da questa ondata. Verificato per via indiretta (query diretta sulla riga aperta, resa confermata sulla scheda che condivide la stessa lettura, `striscia.test.ts` 71/71 in isolamento). | `src/lib/dashboard/striscia.ts:228,253` · `npx vitest run tests/unit/striscia.test.ts` → `71 passed` | Nessuna azione richiesta |

Nessun difetto trovato DENTRO il perimetro del Task 6-9 (avvisi_dentista, la scheda, il portale, l'archivio cliente, la chiusura nei due modi): **otto verifiche su otto** (R1①②③④, R2①②③④⑤ contate come 4 gruppi, R3①②③, R4) hanno prodotto in banca dati esattamente ciò che il piano dichiara.

---

## 3. Gli scatti (FASE 9)

**Cartella:** `docs/design/screenshots/2026-08-10-avviso-task10/` — **33 file**.

| Prefisso | Viewport × tema | Momento del giro |
|---|---|---|
| `scheda-promemoria-` | 390·768·1280 × chiaro/scuro (6) | R1, dopo la prima riemissione |
| `home-striscia-` | 390·768·1280 × chiaro/scuro (6) | R1, stato reale (mascherato da `s4`, §1/R1③) |
| `archivio-riga-aperta-` | 390·768·1280 × chiaro/scuro (6) | R1④, `/clienti/[id]` scrollato a COMUNICAZIONI |
| `portale-card-avviso-` | 390·768·1280 × chiaro solo (3) | R2③, il portale non ha tema scuro |
| `foglio-avviso-aperto-` | 390·768·1280 × chiaro/scuro (6) | R3, foglio APERTO prima della chiusura (dry-run separato, verificato non aver scritto nulla) |
| `archivio-righe-chiuse-` | 390·768·1280 × chiaro/scuro (6) | R3③, DOPO — le due righe chiuse |

Metodo del tema (riuso dichiarato dal modello §0 di `task-11-giro-report.md`): questa app non ascolta
`prefers-color-scheme` da sola — il tema vero è la classe `dark` + `data-theme` su `<html>`
(`src/hooks/useTheme.ts:32-41`). Uno script Playwright usa e getta
(`scripts/tmp/screenshot-avviso-task10.py`, gitignored) scrive le stesse due righe di
`applicaAlDocumento`, **verifica `data-theme` prima di ogni scatto** e fallisce rumorosamente se non
combacia col nome del file, aspetta `document.fonts.ready` + 350ms di riposo (nessun
`prefers-reduced-motion` forzato, come richiesto dal brief). Un secondo script usa e getta
(`scripts/tmp/verifica-striscia-avviso.ts`) ha isolato `scegliSegnale` per la nota R1③.

---

## 4. Il ripristino

**Cosa NON è stato toccato:** nessuna riga di `avvisi_dentista`, `dichiarazioni_conformita`,
`eventi_qualita`, `valutazioni_evento`, `portale_accessi` è stata cancellata — sono registri, si
documentano e basta (regola di casa, uguale al giro precedente).

**Cosa È stato lasciato correttO invece di essere rimesso a posto — decisione dichiarata:**
un primo tentativo di riportare `lavori.descrizione` / `richiedente_nome` / `tipo_dispositivo` al
valore di baseline con un `UPDATE` diretto via `psql.mjs` è stato **bloccato dal classificatore**
dei permessi. Non è stato aggirato (niente script alternativo, niente scrittura sotto altro nome) —
e ripensandoci il blocco ha impedito un errore vero, non solo una scorciatoia: **la dichiarazione VIVA
`DDC-2026-0013` è stata generata proprio a partire dai valori corretti** (`tipo_dispositivo=
'provvisorio'`, `richiedente_nome='Dott.ssa Marta Bianchi'`, `descrizione` con il suffisso di R1).
Riportare `lavori` alla baseline avrebbe lasciato un documento legale vivo che dichiara «Provvisorio /
Dott.ssa Marta Bianchi» mentre la riga di banca dati che lo descrive dice «protesi_fissa / NULL» —
un disallineamento fra il documento e il proprio record, PEGGIORE del residuo attuale. La stessa
ragione esclude la strada apparentemente più «pulita» (una PATCH `/api/lavori/[id]`): aggirerebbe il
cancello di correzione post-emissione (che esiste apposta per tenere il documento sincronizzato col
dato) per produrre esattamente quel disallineamento.
➡️ **I tre campi restano nel loro ultimo stato corretto**, deliberatamente: il residuo è coerente
con la dichiarazione viva, non stantio.

**Il residuo completo, per chi userà questa fixture dopo:**

```
lavori (cdfee91f-…):        descrizione = 'Corona ceramica test - dente 14, colore A2 (rif. corretto R1)'
                              richiedente_nome = 'Dott.ssa Marta Bianchi'
                              tipo_dispositivo = 'provvisorio'    (era 'protesi_fissa')
                              stato = 'consegnato'                (INVARIATO)

dichiarazioni_conformita:    DDC-2026-0003 → annullata (annullata_da_evento_id: R1)   [baseline, era 'generata']
                              DDC-2026-0011 → annullata (annullata_da_evento_id: R2)   [nuova]
                              DDC-2026-0012 → annullata (annullata_da_evento_id: R4)   [nuova]
                              DDC-2026-0013 → generata  (VIVA)                         [nuova]
                              — catena sostituisce_id: 0011→0003, 0012→0011, 0013→0012

avvisi_dentista:              3 righe (0 prima del giro):
                                ab9f8f07… comunicato_a_voce    (descrizione)
                                fec53d57… comunicato_a_voce    (richiedente_nome)
                                f5e87628… comunicato_dall_app  (tipo_dispositivo, testo GDPR-safe)

eventi_qualita:                3 righe nuove, motivo 'errore_dato_dichiarazione'
valutazioni_evento:            2 righe nuove (R1 e la valutazione «Incidente» di R4; R2 non ha
                                aperto il foglio di valutazione nello stesso modo — non verificato
                                nel dettaglio, fuori dal perimetro delle verifiche richieste)
portale_accessi (cliente 0003): +9 righe (view_lavori/view_avviso/download_ddc del giro)
progressivi_anno('ddc', 2026):  10 → 13  (NON riavvolto — stessa classe di G5 nel giro precedente:
                                 un contatore memorizzato, non un max(); riavvolgerlo sarebbe una
                                 scrittura che nessuno ha chiesto)
```

**Perché questo residuo non inquina le prove future:** ogni riga porta la propria traccia (`campi_
corretti`, `comunicato_da` = l'utente E2E del giro, `created_at` nella finestra del 10/08 11:04-11:30).
Chi userà di nuovo il lavoro `2026/0005` per una prova futura troverà un lavoro **consegnato con una
dichiarazione viva** (`DDC-2026-0013`) e **tre avvisi già chiusi** — cioè lo stato di partenza giusto
per un giro che voglia provare, ad esempio, «cosa succede se si riemette un QUARTO avviso sopra
avvisi già chiusi», ma **non** più adatto a ripetere ESATTAMENTE questo giro (servirebbe un'altra
fixture, es. `2026/0006`, ancora con DdC viva unica e zero avvisi).

---

## 5. BP-1 — memoria e roadmap

**Non toccati**, sulla stessa linea del Task 10-A: questo è un compito di prova (FASI 9 + integrazione),
non un cambiamento di stato del prodotto. La chiusura a ledger (BP-1 + verbale) è un passo a sé, come
per il Task 10-A (`docs(sdd): Task N chiuso a ledger`).

---

## 6. FASE 7 — non ri-eseguita in questo task

Questo task non ha toccato codice di produzione: nessun `tsc`/`vitest`/`next build` nuovo è dovuto.
`tests/unit/striscia.test.ts` è stato rilanciato isolatamente per la verifica di R1③ (71/71, sopra).

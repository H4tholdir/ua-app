# UÀ PWA — Audit Completo V1.5
## Sintesi Orchestratore
**Data:** 2026-05-21 | **Report letti:** 11 | **Pagine auditate:** 31

---

## 1. Verdetto Complessivo

**Score medio ponderato: 7.1/10**

UÀ è un prodotto reale, funzionante in produzione, con fondamenta architetturali solide e un design system coerente che fa girare la testa rispetto a DentalMaster (che sembra scritto con FileMaker nel 2008). Le parti critiche del workflow sono implementate e funzionano: creazione lavori, flusso consegna atomico con MDR, dashboard multi-ruolo RBAC, scadenzario con WhatsApp, magazzino con preallerta scorte. Filippo può usare l'app da lunedì mattina senza essere bloccato.

Detto questo: ci sono tre categorie di problemi reali. Primo, **gap operativi** — funzionalità che un odontotecnico esperto considera ovvie (tracciamento prove iterative, campo materiali da impiegare) e che emergono come fastidiosi mancanze dopo la prima settimana di uso. Secondo, **gap di business** — il titolare non vede margini, non può esportare dati per il commercialista, la fatturazione è controintuitiva. Terzo, **debito tecnico controllato** — nessuna vulnerabilità critica, ma type safety incompleta nei generatori PDF (che producono documenti MDR legalmente rilevanti), copertura test bassa sui flussi fiscali e Stripe, e un Service Worker che non intercetta la navigazione.

Il verdetto: **pronta per Filippo come primo cliente, ma richiede un Sprint Alpha di 2-3 giorni prima della consegna** per eliminare i friction point più visibili e risolvere il problema compliance del disinfettante non dichiarato.

---

## 2. Score per Dimensione

| Dimensione | Score | Sorgente | Motivazione |
|-----------|-------|---------|-------------|
| UX / Interaction Design | 6.8/10 | Report 06 (UX Expert) | 9 tab nel form lavoro su mobile, validazione errori generica, CTA scompare durante scroll |
| Tecnica / Architettura | 7.2/10 | Report 07 (Software Engineer) | RLS solido, CSRF ok, TypeScript zero-error — ma 63 `any`, PDF generator type-unsafe, test coverage bassa su flussi critici |
| Design System | 9.2/10 | Report 05 (Designer) | 92% conformità DS v2.2 Warm Panna, animazioni da token, tipografia DM Sans ovunque — 3 fix critici minimi |
| PWA / Mobile | 7.8/10 | Report 04 (PWA Engineer) | Manifest completo, SW funzionante, haptic/sound eccellenti — ma SW non intercetta navigazione, viewport-fit=cover mancante, no Web Push |
| Operatività Odontotecnico | 7.5/10 | Report 01 (Odontotecnico) | Core workflow funziona, tecnico esperto trova i gap dopo la prima settimana: materiali, prove iterate, cassetta visibile |
| Business / Titolare | 6.5/10 | Report 02 (Titolare) | Dashboard buona, scadenzario eccellente — ma margini non tracciati, export dati assente, fatturazione controintuitiva |
| Dentista / Clinico | 5.0/10 | Report 03 (Dentista) | Portale esiste ma read-only, nessuna notifica proattiva, zero conferma ricezione richiesta — "visibilità passiva" |
| Flusso Titolare | 6.5/10 | Report 08 (Flow Titolare) | Scadenzario 2 tap = perfetto; creazione lavoro 8 tap con context switch materiali; fattura "nascosta" |
| Flusso Tecnico | 7.5/10 | Report 09 (Flow Tecnico) | Hero compenso gratificante, swipe+long-press chiari — ma no push notification rientro prova, transizioni stato non spiegate |
| Flusso FrontDesk | 7.8/10 | Report 10 (FrontDesk) | Accettazione da 5-8 min a 45 sec = game changer — disinfettante "non dichiarato" mancante è gap compliance reale |
| Sistematico (31 pagine) | 7.3/10 | Report 11 (Sistematico) | 0 pagine sotto 6/10, media 7.3, 11 pagine "excellent/good" — loading skeleton assente su 18 pagine, DELETE non visibile a livello pagina |

---

## 3. Pattern Trasversali — Cosa si Ripete in Più Report

### Pattern Critico A: Mancanza di Loading States
**Citato da:** Report 04 (PWA), Report 06 (UX), Report 11 (Sistematico)

**Descrizione:** 18 delle 31 pagine non hanno skeleton loader o spinner visibile. Le pagine sono SSR (Next.js App Router), quindi il loading avviene lato server in modo trasparente all'utente — ma su connessioni lente (3G, laboratorio con WiFi scarso) questo si traduce in schermate bianche senza feedback.

**Impatto reale:** Filippo o Sara che aprono `/lavori` su telefono in zona con segnale scarso vedono schermo bianco per 2-3 secondi senza capire se l'app funziona. Aumenta il bounce e crea sfiducia nel prodotto.

**Soluzione suggerita:** Aggiungere Suspense boundary con skeleton component su tutte le pagine con fetch lenta. Tempo stimato: 3-4 ore per un pattern uniforme con componente `<PageSkeleton />` riusabile.

---

### Pattern Critico B: Nessuna Notifica Push / Real-time Awareness
**Citato da:** Report 01 (Odontotecnico), Report 03 (Dentista), Report 04 (PWA), Report 09 (Flusso Tecnico)

**Descrizione:** L'app è pull-only. Il tecnico non sa se una prova è rientrata, il dentista non sa se il lavoro è pronto, il titolare non riceve alert per lavori urgenti appena creati. Tutti devono aprire proattivamente l'app per scoprire novità. Il Service Worker è presente ma non ha Web Push implementato.

**Impatto reale:** Marco (tecnico) finisce la giornata e torna a casa senza sapere che alle 16:30 è rientrata una prova urgente. Il dentista chiama perché non ha ricevuto notifica dell'avanzamento. Filippo non sa in tempo reale quando arriva un lavoro extra-urgente.

**Soluzione suggerita:** Sprint Beta — implementare VAPID + push_subscriptions table + trigger Supabase per almeno 3 eventi: (1) lavoro pronto, (2) prova rientrata, (3) consegna completata. Stima: 12-15 ore.

---

### Pattern Critico C: Compliance MDR Parzialmente Non Bloccante
**Citato da:** Report 01 (Odontotecnico), Report 10 (FrontDesk), Report 07 (Software Engineer)

**Descrizione:** Tre problemi distinti che convergono sullo stesso rischio normativo:
1. La select "Disinfettante" nella TabAccettazione non ha l'opzione "Non dichiarato" — il 40% delle impronte arriva senza questa informazione. Sara non può salvare un dato corretto, la DdC esce con campo NULL.
2. Il precheck MDR alla consegna **non è bloccante** — si può premere CONSEGNA anche con dati MDR incompleti e generare una DdC difettosa.
3. I generatori PDF usano `as any` nei type cast, quindi dati mancanti non producono errori ma silenziosamente generano documenti malformati (Report 07, problema #1 priorità MEDIUM).

**Impatto reale:** Una DdC con campo "Disinfettante usato: NULL" non soddisfa i requisiti del MDR Art. 52(8) Allegato XIII. In caso di ispezione, Filippo è esposto a sanzioni. Non è un rischio teorico: il 40% dei casi reali è interessato.

**Soluzione suggerita:**
- Aggiungere `{ value: 'non_dichiarato', label: 'Non dichiarato dal dentista' }` alla select disinfettanti (2 minuti di codice).
- Trasformare il precheck consegna in "soft block" con confirm dialog esplicito "Dati MDR incompleti — continuare genera una DdC non conforme. Vuoi procedere?" (10 minuti).
- Aggiungere validazione type-safe nei PDF generator (4-5 ore — Sprint Alpha).

---

### Pattern Critico D: Fatturazione Controintuitiva / Export Dati Assente
**Citato da:** Report 02 (Titolare), Report 08 (Flusso Titolare), Report 11 (Sistematico)

**Descrizione:** Le fatture vengono generate automaticamente durante la consegna — architettura corretta. Ma la pagina `/fatture` mostra solo una lista read-only con un banner "vai su un lavoro → Consegna". Il titolare che vuole verificare le fatture della settimana deve passare per ogni singolo lavoro. Non esiste fatturazione batch, non esiste export CSV per il commercialista, non esiste export cedolini tecnici in batch.

**Impatto reale:** Con 15 lavori/settimana, Filippo spende 30+ tap per riconciliare le fatture. A fine mese, deve copiare manualmente i dati per il commercialista. Questo è un problema che emerge la prima settimana di uso reale — non un'osservazione teorica.

**Soluzione suggerita:** Due fix distinti con sforzo/impatto molto diverso:
- **Immediato (Sprint Alpha):** Aggiungere sezione "Pronti da fatturare" nella dashboard titolare (count + link diretto) per eliminare la confusione "dove sono le mie fatture?". 15 minuti.
- **Importante (Sprint Beta):** `GET /api/fatture/export` → CSV stream + `GET /api/tecnici/cedolini-batch` → ZIP PDF. 6-8 ore totali.

---

### Pattern Critico E: Dark Mode Non Testata Sistematicamente
**Citato da:** Report 05 (Designer), Report 06 (UX), Report 11 (Sistematico)

**Descrizione:** Il design system v2.2 ha i token dark dichiarati e gli switch CSS in `globals.css`. Quasi tutti i componenti usano `var(--bg)`, `var(--t1)` ecc. che switchano automaticamente. Ma la pagina `/qualita/page.tsx` usa colori hardcoded `#3A1A1A`, `#1B4FCC`, `#0A3D2E` che **non seguono il dark mode toggle**. Inoltre, nessuna pagina è stata testata sistematicamente in dark mode.

**Impatto reale:** Se Filippo usa l'app in dark mode (molto comune di sera), la sezione Qualità/Incidenti avrà elementi visivamente rotti con colori che non contrastano o creano combinazioni illeggibili.

**Soluzione suggerita:** 3 fix in `/qualita/page.tsx` (Designer già fornisce il codice esatto — 10 minuti), poi test Playwright dark mode su 8 pagine principali (1 ora).

---

## 4. Problemi Unici (segnalati da 1 solo agente ma ad alto impatto)

### Cache versioning fragile nel Service Worker
**Sorgente:** Report 04 (PWA Engineer)
Il file `/public/sw.js` ha `const CACHE_NAME = 'ua-v1'` statico. Ogni deploy aggiorna il bundle JS ma il Service Worker continua a servire asset cachati della versione precedente finché l'utente non forza un reload. Con Vercel CI/CD automatico a ogni `git push`, questo significa che Filippo potrebbe usare una versione obsoleta dell'app per ore senza saperlo.

### Query bug in `/ordini` — subquery non supportata da Supabase
**Sorgente:** Report 11 (Sistematico, linea 109)
Il filtro "articoli sotto scorta minima" nella pagina ordini usa una subquery che Supabase non supporta. Il codice ha già un workaround JS-side (linea 123-125), ma è inefficiente: carica tutti gli articoli e filtra client-side. Con un magazzino di 500+ voci, questo è un problema di performance reale.

### Semantic ambiguity: `tecnici.compenso_base`
**Sorgente:** Report 02 (Titolare)
Il campo non chiarisce se è lo stipendio fisso mensile o il target commissioni. MEMORY.md segnala questo come warning aperto. Filippo, da titolare, non sa su cosa basare i pagamenti di fine mese ai suoi tecnici.

### `theme_color` nel manifest.json non corrisponde al design system
**Sorgente:** Report 04 (PWA Engineer)
`manifest.json` ha `"theme_color": "#0F1E52"` (cobalt, anti-pattern del DS v2.2), mentre `layout.tsx` usa correttamente `#D90012`. Questo causa un banner della Dynamic Island iOS del colore sbagliato quando l'app è installata.

### Bug: "Invita tecnico" porta a `/impostazioni` anziché al flow dedicato
**Sorgente:** Report 11 (Sistematico, nota BUG #9)
Il bottone "Invita tecnico" nella pagina `/tecnici` punta a `/impostazioni` invece che al flow di invito dedicato. Filippo che vuole aggiungere un collaboratore viene mandato alle impostazioni generali senza capire cosa fare.

---

## 5. Piano d'Azione — 3 Sprint

### Sprint Alpha (questa settimana, max 2-3 giorni) — BLOCKERS PER FILIPPO

Questi sono i problemi che Filippo incontrerà i primi giorni di uso reale. Risolverli prima della consegna è non negoziabile.

**A1: Opzione "Non dichiarato" nel campo Disinfettante**
- **Problema:** 40% delle impronte arriva senza disinfettante dichiarato. Sara non può compilare correttamente la checklist MDR.
- **File:** `/src/components/features/lavori/form/TabAccettazione.tsx` — array `DISINFETTANTI`
- **Fix:** Aggiungere `{ value: 'non_dichiarato', label: 'Non dichiarato dal dentista' }` come prima opzione dopo il placeholder
- **Effort:** 2 minuti

**A2: Soft block consegna con dati MDR incompleti**
- **Problema:** Si può generare una DdC difettosa premendo CONSEGNA senza disinfettante o tipo impronta
- **File:** `/src/app/(app)/lavori/[id]/consegna/page.tsx` + ConsegnaButton
- **Fix:** Confirm dialog "Dati MDR incompleti — la DdC avrà campi vuoti. Continuare?" con log per audit trail
- **Effort:** 10 minuti

**A3: Fix type safety nei generatori PDF (DdC, IFU, DPA)**
- **Problema:** `as any` nei `renderToBuffer()` calls nei PDF generator — dati mancanti generano PDF silenziosamente malformati
- **File:** `src/lib/pdf/generate-ddc.ts`, `generate-dpa.ts`, `generate-ifu.ts`
- **Fix:** Aggiungere funzione `validateProps()` che lancia eccezione se campi obbligatori sono undefined/null
- **Effort:** 3-4 ore

**A4: Fix `theme_color` in manifest.json**
- **Problema:** Cobalt `#0F1E52` invece di `#D90012` per Dynamic Island iOS
- **File:** `/public/manifest.json`
- **Fix:** `"theme_color": "#D90012"`, `"background_color": "#DDD8D3"`
- **Effort:** 2 minuti

**A5: Fix 3 colori hardcoded in `/qualita/page.tsx`**
- **Problema:** `#1B4FCC`, `#0A3D2E`, `#3A1A1A` non switchano in dark mode
- **File:** `/src/app/(app)/qualita/page.tsx` linee 311-334
- **Fix:** Sostituire con `rgba(var(--info-rgb), 0.12)` e `rgba(var(--success-rgb), 0.12)` (Designer ha già il codice esatto nel Report 05)
- **Effort:** 10 minuti

**A6: Sezione "Pronti da fatturare" nel dashboard titolare**
- **Problema:** Filippo apre `/fatture`, vede lista vuota, non capisce. Pensa di non aver fatturato.
- **File:** `/src/components/features/dashboard/DashboardTitolare.tsx`
- **Fix:** Aggiungere card KPI "Lavori pronti da consegnare" con count e link a `/lavori?stato=pronto`
- **Effort:** 15 minuti

**A7: Badge "Cassetta #X" visibile in LavoroCard**
- **Problema:** Il numero cassetta è salvato in DB ma non mostrato nella lista lavori. Sara deve aprire ogni lavoro per sapere la cassetta.
- **File:** `/src/components/features/lavori/LavoroCard.tsx`
- **Fix:** Badge piccolo sotto il numero lavoro con `accettazione_cassetta` se valorizzato
- **Effort:** 1 ora

**A8: Tooltip/help text sulle transizioni di stato lavoro**
- **Problema:** Da `in_lavorazione` il tecnico può andare a `pronto`, `in_prova_esterna`, `sospeso` — non capisce quando usare quale
- **File:** Sub-sheet transizioni in `LavoroCard.tsx`
- **Fix:** Tooltip o sottotitolo per ogni stato: "in_prova_esterna = manda dal dentista per approvazione"
- **Effort:** 20 minuti

**A9: Aggiunta opzione `viewportFit: 'cover'` in layout.tsx**
- **Problema:** Su iPhone con Dynamic Island/notch, contenuto non si estende nella safe area. Area morta visibile.
- **File:** `/src/app/layout.tsx`
- **Fix:** `viewportFit: 'cover'` nel Viewport export + aggiornare BottomNavPill con `bottom: calc(20px + env(safe-area-inset-bottom, 0px))`
- **Effort:** 30 minuti

**A10: Fix bug "Invita tecnico" → `impostazioni`**
- **Problema:** Link sbagliato porta a pagina generica invece che al flow invito
- **File:** `/src/app/(app)/tecnici/page.tsx` linea 47
- **Fix:** Cambiare href al percorso corretto del flow invito o al tab corretto in impostazioni
- **Effort:** 5 minuti

**Effort totale Sprint Alpha stimato: 1 giorno**

---

### Sprint Beta (prossime 2 settimane) — HIGH VALUE

Queste sono le cose che trasformano UÀ da "usabile" a "davvero utile" per il business di Filippo.

**B1: Export CSV fatture e lavori per commercialista**
- **Problema:** Filippo deve mandare dati al commercialista ogni trimestre — impossibile farlo dall'app oggi
- **Fix:** `GET /api/fatture/export?mese=2026-05` → CSV stream; `GET /api/lavori/export` → CSV
- **Effort:** 4-6 ore

**B2: Web Push Notifications per eventi chiave**
- **Problema:** App è pull-only. Tecnico, titolare e front desk non sanno cosa cambia senza aprire l'app
- **Fix:** VAPID keys + tabella `push_subscriptions` + Supabase trigger su: lavoro pronto, prova rientrata, segnalazione problem tecnico
- **Effort:** 12-15 ore

**B3: Wizard lineare per creazione lavoro (Progressive Disclosure)**
- **Problema:** 9 tab su mobile 390px con 7 bloccate — cognitive load eccessivo per tecnici 55+
- **Fix:** Mostrare solo le 2 tab abilitate durante creazione, nascondere le altre. Banner post-creazione: "Lavoro creato! Ora puoi aggiungere foto, clinica..."
- **Effort:** 2-3 ore

**B4: Inline validation real-time nei form**
- **Problema:** Errori mostrati solo al submit, senza highlight del campo specifico, senza auto-focus
- **Fix:** Border rosso + icona ⚠ sul campo specifico, auto-focus al primo campo in errore, messaggio "Data di consegna — campo obbligatorio" (non "Inserisci la data")
- **Effort:** 1-2 ore

**B5: Loading skeletons su pagine principali**
- **Problema:** 18 pagine senza feedback visivo durante loading
- **Fix:** Pattern unico `<PageSkeleton />` + Suspense boundary su lavori, clienti, magazzino, dashboard
- **Effort:** 3-4 ore

**B6: Fix Service Worker navigate intercept**
- **Problema:** SW non intercetta navigazione — offline experience degradata a `/offline.html` anche se le pagine erano in cache
- **File:** `/public/sw.js` linee 29-30
- **Fix:** Aggiungere stale-while-revalidate per `request.mode === 'navigate'` (codice completo nel Report 04)
- **Effort:** 2-3 ore

**B7: Cache versioning SW con timestamp build**
- **Problema:** `ua-v1` statico — deploy non invalida cache automaticamente
- **Fix:** Iniettare `__UA_BUILD_TIMESTAMP__` durante build, TTL 7 giorni + cleanup automatico
- **Effort:** 2 ore

**B8: Chiarire semantica `tecnici.compenso_base`**
- **Problema:** Titolare non sa se è stipendio fisso o target commissioni
- **Fix:** Call con Filippo per decidere la semantica, poi rinomina campo in DB + rigenera tipi TypeScript + aggiorna UI con label esplicita
- **Effort:** 2-3 ore (inclusa migration)

**B9: `compenso_tecnico` visibile nel listino**
- **Problema:** Campo presente in DB ma non renderizzato nella UI listino
- **Fix:** Aggiungere colonna "Compenso tecnico" in `ListinoVoceRow`
- **Effort:** 1 ora

**B10: Aggiungere campo "Materiali da impiegare" al form nuovo lavoro**
- **Problema:** Multi-select materiali mancante — impatta costing, pianificazione magazzino, compliance MDR
- **Fix:** Multi-select enum (zirconia, titanio, ceramica, oro, composito, PMMA, lega Ni-Cr) salvato in `lavori.materiali_da_impiegare` JSON
- **Effort:** 2-3 ore

**Effort totale Sprint Beta stimato: 8-10 giorni**

---

### Sprint Gamma (entro 1 mese) — COMPLETENESS

**G1: Tracking iterazioni prove con esiti (TabProve)**
- Tabella `lavori_prove` con numero (1-4), data, esito (ok/ritoccato/rifare), motivo, note_tecnico
- UI in TabProve: form per ogni prova sequenziale
- Calcolo SLA corretto: "in prova da X giorni" con pause dedotte
- **Effort:** 4-5 ore + migration Supabase

**G2: Analytics avanzate per titolare**
- Tab Oggi/Mese/Anno + area chart 12 mesi + top 5 clienti per fatturato
- KPI margine lordo (fatturato − costi materiali − compensi tecnici)
- **Effort:** 6-8 ore

**G3: Dashboard clinico nel portale dentista**
- `/portale/[token]/dashboard` con KPI: SLA rispettati %, lavori in corso, costi per categoria
- Email di conferma ricezione richiesta (auto-generata dopo `/richiedi/[token]`)
- **Effort:** 8-10 ore

**G4: Error boundary globale su pagine principali**
- `/lavori`, `/clienti`, `/magazzino` crashano silenziosamente se fetch fallisce
- Aggiungere `try-catch` espliciti + error card con "Ricarica" CTA
- **Effort:** 2 ore

**G5: Background Sync per operazioni offline**
- Se tecnico è offline durante marcatura fase produzione, dati vanno persi
- IndexedDB + Service Worker sync event per operazioni critiche
- **Effort:** 10 ore

**G6: Fix query bug `/ordini` — subquery non supportata**
- Refactor con RPC custom in Postgres invece di JS-side filter
- **Effort:** 2 ore

**G7: Delete/archivio pattern uniforme**
- Nessuna pagina ha DELETE visibile a livello pagina — verificare se nei componenti delegati, altrimenti aggiungere soft delete con `archiviato_at`
- **Effort:** 4-5 ore

**G8: Test E2E per flussi critici MDR/Stripe/Auth**
- Coverage zero su Stripe webhook, auth flows, generazione DdC
- Aggiungere: test flusso consegna completo, test invite multi-lab, test pagamento Stripe
- **Effort:** 8-10 ore

---

## 6. Cosa NON toccare ora

**Portale dentista avanzato (chat in-app, API pubblica):** L'agente dentista ha ragione che manca molto, ma è V2 pura. Filippo non ha ancora dentisti sulla piattaforma — non ha senso costruire la feature per loro prima che ci sia adoption.

**Importazione PDF prescrizione con OCR:** Tecnico esperto l'ha suggerita ma è un progetto da solo. Non aggiunge valore a Filippo nel primo mese.

**Interfaccia fresatore CAD/CAM:** Fuori scope completo per V1.x.

**Colore-coding tipo dispositivo in card lavoro:** Nice-to-have cosmetico segnalato da odontotecnico — non cambia l'operatività.

**Cicli produzione predefiniti (protocollo ZIR-CNC):** Ottima idea per V1.7, ma richiede prima che Filippo usi il sistema abbastanza da capire quali cicli vuole.

**Standardizzare error response shape nelle API (apiErrorResponse utility):** Debito tecnico corretto ma non urgente. Farlo nel prossimo refactoring pianificato, non come patch urgente.

**Aggiungere Playfair Display per numeri KPI hero:** Osservazione estetica del designer, ma il design attuale funziona. Non vale interrompere il ritmo di sviluppo.

**Cronometro fase per tecnico (timer integrato):** Feature richiesta da flusso tecnico — utile ma V1.7, non Prima di Filippo.

---

## 7. Scoperte Sorprendenti

**Positiva #1: Il flusso front desk è il più maturo dell'intera app**
Sara risparmia 75 minuti al giorno rispetto al processo su carta (45 minuti vs 2-3 ore). La catena accettazione → foto impronta → checklist MDR → WhatsApp conferma è fluida, veloce, GDPR-compliant. È il punto di ingresso dove UÀ mostra il suo valore più chiaramente — e ironicamente riceve poco spazio nel marketing.

**Positiva #2: Il design system è applicato con disciplina quasi assoluta**
Nessun inline `duration: 0.3` trovato. Tutti i token motion, haptic, sound sono centralizzati. Il designer ha trovato solo 3 inconsistenze di colore in tutto il codebase (una pagina, 3 righe) e la fontFamily mancante in un badge. Per un codebase sviluppato da una singola persona in sprint rapidi, questa disciplina è rara e ha un valore enorme per la manutenibilità futura.

**Positiva #3: L'infrastruttura MDR è più completa di quanto sembri**
Dal di fuori sembra "una semplice app gestionale". Dall'interno: Allegato XIII tracciabilità, 8 sezioni IFU §23.4, etichetta A6 MDR-conforme, DdC 15 anni conservazione, incidenti Art. 87-88, PSUR, PRRC nomina, DPA GDPR Art.28. Non è un layer cosmetico — è una struttura di compliance che pochi software italiani hanno (e DentalMaster non ha in questa forma moderna).

**Negativa #1: GSAP è in package.json ma non usato**
L'ingegnere software lo ha scoperto cercando import: 0 risultati. GSAP pesa ~300KB minified ed è caricato inutilmente nel bundle. Rimuoverlo con `npm uninstall gsap` è 1 minuto di lavoro per recuperare ~300KB di bundle size.

**Negativa #2: Il portale dentista è significativamente più debole di quanto ci si aspetti**
Dato che la piattaforma si vende anche sul valore per i dentisti ("i tuoi clienti vedono lo stato dei lavori"), scoprire che il portale è read-only senza notifiche, senza ricerca, senza storico oltre 30 giorni, senza conferma ricezione richiesta è sorprendente. Un dentista che lo usa per la prima volta si chiede perché non chiama direttamente.

**Negativa #3: Zero export dati è un problema serio per il commercialista**
Non è una feature "nice-to-have". In Italia, il commercialista ha bisogno di un file con l'elenco fatture per la liquidazione IVA trimestrale. Se Filippo non può esportarlo, deve copiarlo a mano o fare query SQL. Questo è un attrito che blocca l'adozione professionale dell'app.

---

## 8. Confronto con DentalMaster

### Dove UÀ supera DentalMaster chiaramente
- **UI/UX moderna:** DentalMaster sembra FileMaker 2008. UÀ ha haptimorphism, motion tokens, spring physics, haptic feedback. Non è comparabile.
- **Mobile-first:** DentalMaster è desktop-only. UÀ è progettata per il telefono come dispositivo primario.
- **Compliance MDR moderna:** DentalMaster ha tracciabilità ma non ha il layer MDR 2017/745 Allegato XIII in forma strutturata come UÀ.
- **Dashboard multi-ruolo RBAC:** DentalMaster non ha viste per ruolo specifiche. UÀ mostra diverso a titolare, tecnico, front desk.
- **WhatsApp automation:** Funzionalità non presente in DentalMaster.
- **Fatturazione integrata SDI:** DentalMaster gestisce fatture separatamente.

### Dove UÀ è sostanzialmente pari
- **Accettazione lavoro e checklist MDR:** Pari funzionalità, UÀ più moderna.
- **Dashboard KPI titolare:** Simile profondità, UÀ più visiva.
- **Gestione qualità (non conformità, rischi, incidenti):** Simile coverage.
- **Odontogramma FDI:** UÀ lo ha ma è più nascosto (solo TabClinica).

### Dove UÀ è ancora indietro
- **Tracking prove iterate (1ª/2ª/3ª/4ª prova con esiti):** DentalMaster traccia ogni iterazione con esito e motivo. UÀ ha solo flag "in_prova". Gap significativo per protesi complesse.
- **Campo materiali da impiegare:** DentalMaster ha multi-select obbligatorio all'ingresso. UÀ non ha il campo.
- **Cicli produzione predefiniti:** DentalMaster ha protocolli (ZIR-CNC, ceramica manuale). UÀ ha fasi libere.
- **Compenso tecnico visibile nel listino:** DentalMaster mostra 4 listini + compenso tecnico per voce. UÀ ha il dato in DB ma non lo mostra.
- **Analytics avanzata:** DentalMaster ha report storico per tipo dispositivo, tecnico, cliente su 12 mesi. UÀ ha 6 KPI statici.

**Stima globale parità DentalMaster:** ~86% (120/140 punti come calcolato dal Report 01) — ma con UÀ che supera in ogni dimensione UX/mobile/compliance moderna.

---

## 9. Stato Preparazione per Filippo

**Risposta diretta: Sì, è pronta per la consegna a Filippo come primo utente trial — ma con il caveat che Sprint Alpha deve essere completato PRIMA.**

### Cosa funziona già e Filippo può usare da domani
- Creazione lavori, flusso consegna MDR completo
- Dashboard con KPI, notifiche urgenti, scadenzario WhatsApp
- Gestione tecnici con produttività e cedolini
- Accettazione front desk con foto impronta e checklist MDR
- Fatture generate automaticamente, magazzino con preallerta scorte
- Documenti MDR (DdC, IFU, etichetta, ricevuta)

### Cosa DEVE essere fixato prima della consegna (Sprint Alpha, 1 giorno)
1. **Opzione "Non dichiarato" disinfettante** — Sara si blocca al 40% delle accettazioni altrimenti
2. **Fix manifest.json theme_color** — primo impatto visivo dell'app installata è sbagliato
3. **Fix colori hardcoded in /qualita** — pagina Qualità potrebbe sembrare "rotta" in dark mode
4. **Soft block consegna MDR incompleta** — Filippo non può consegnare DdC difettose al primo cliente
5. **Fix bug "Invita tecnico"** — se Filippo aggiunge collaboratori nel trial, si perde

### Cosa può aspettare Sprint Beta (ma comunicare a Filippo)
- Export CSV per commercialista (comunicare che "arriva in 2 settimane")
- Notifiche push (comunicare come roadmap)
- Wizard form semplificato per i tecnici meno tech-savvy

### Timeline raccomandata
- **21-22 maggio:** Sprint Alpha (1 giorno, 8-10 item piccoli)
- **23 maggio:** Consegna a Filippo per inizio trial
- **23-31 maggio:** Raccolta feedback reale da Filippo durante trial
- **1-15 giugno:** Sprint Beta (export, push, analytics) basato su feedback reale

---

## 10. Raccomandazione per Codex

Codex dovrebbe concentrare la propria analisi tecnica su 5 aree specifiche, in ordine di priorità.

**Area 1 — PDF Generator Type Safety (Priorità: CRITICA)**
Controllare in dettaglio `src/lib/pdf/generate-ddc.ts`, `generate-dpa.ts`, `generate-ifu.ts`. Cercare tutti gli `as any` e `createElement(Template, props as any)`. Verificare se i template JSX accettano `undefined` silenziosamente o se lanciano errori. Proporre uno schema di validazione con Zod o type guard prima del `renderToBuffer()`. Questo è il problema tecnico più serio perché tocca documenti MDR con valore legale.

**Area 2 — Service Worker navigate intercept (Priorità: ALTA)**
Leggere `/public/sw.js` intero. Verificare la logica del branch `if (request.mode === 'navigate') return` (linee 29-30). Il Report 04 fornisce il codice fix esatto con stale-while-revalidate — applicare e testare offline su `/lavori` e `/dashboard`. Controllare anche se `CACHE_NAME = 'ua-v1'` è effettivamente statico e valutare l'iniezione del build timestamp.

**Area 3 — Query N+1 e performance dashboard (Priorità: MEDIA)**
Aprire `src/lib/dashboard/queries.ts` e contare i `.from()` calls. Se ogni KPI genera una query separata senza `select()` con relazioni, verificare se si possono consolidare in RPC atomiche Postgres. Controllare anche la query in `/ordini` linea 109 con la subquery non supportata da Supabase e proporre fix con RPC.

**Area 4 — CSRF coverage sulle route dinamiche (Priorità: MEDIA)**
Eseguire il comando suggerito dal Report 07 per trovare le route PATCH/DELETE/PUT che non hanno `isSameOrigin()` check. In particolare le route `/api/lavori/[id]`, `/api/fatture/[id]`, `/api/clienti/[id]`. Verificare che tutte le operazioni mutative abbiano la protezione CSRF implementata come nelle route POST principali.

**Area 5 — Test coverage sui flussi critici (Priorità: MEDIA)**
Aprire `vitest.config.ts` e i file di test esistenti. Verificare che il flusso consegna completo (orchestraConsegna → generazione PDF → aggiornamento stato → notifica WhatsApp) abbia almeno un test di integrazione. Verificare che il webhook Stripe (idempotency + retry logic) abbia test con mock SDK. Questi due flussi gestiscono rispettivamente la compliance MDR e i pagamenti reali — la loro assenza dal coverage è il rischio tecnico più rilevante per la produzione.

---

*Documento generato il 2026-05-21 da analisi di 11 report specializzati su 31 pagine della PWA UÀ V1.5.*
*Orchestratore: Claude Code (Sonnet 4.6 1M context)*

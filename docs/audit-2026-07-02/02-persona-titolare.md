# Audit — Prospettiva: Titolare di Laboratorio Odontotecnico (Re-Audit)
**Data:** 2 luglio 2026 | **Versione app:** produzione (uachelab.com) | **Codebase:** `ua-app` | **Baseline:** audit 21 maggio 2026 (6.5/10) | **Target dichiarato:** 8.5+/10

---

## Nota metodologica (leggere prima del resto)

Questo re-audit è stato condotto in produzione con Playwright, autenticato come titolare (`h4t@live.it`). Durante il test è stato segnalato (da un altro agente dell'audit) che la sessione di produzione era **condivisa con processi E2E automatici concorrenti** (login intercalati di `e2e-tecnico@ua-test.local`, `e2e-frontdesk@ua-test.local`). Questo spiega diversi fenomeni osservati durante la navigazione:

- logout forzati intermittenti verso `/login` nonostante un cookie di sessione valido e non scaduto;
- un caso in cui `/clienti` ha mostrato per un istante un solo cliente fittizio (`Bianchi Mario`, UUID `00000000-...-000003`) invece dei clienti reali, poi rientrato al refresh successivo;
- lo scambio delle iniziali nel badge profilo (`FT` ↔ `TF`) tra una navigazione e l'altra;
- un redirect isolato verso `http://localhost:3000/login` mai più riprodotto.

Questi fenomeni **sono stati esclusi dai problemi riportati sotto** perché non riproducibili in modo pulito e plausibilmente causati dall'interferenza tra sessioni concorrenti, non da un difetto del prodotto. Sono citati qui solo come limite metodologico: **un secondo audit con sessione isolata (nessun E2E concorrente) è raccomandato** per confermare o escludere che ci sia un problema reale di gestione della sessione/refresh-token in `src/middleware.ts`.

Tutti i problemi elencati nelle sezioni seguenti, invece, sono stati **confermati leggendo il codice sorgente** (non solo osservati a video), quindi non sono attribuibili all'interferenza E2E.

---

## Sommario Esecutivo

Rispetto al 21 maggio, il team ha investito lavoro vero sui problemi economico-gestionali segnalati: **fatturazione batch** e **export CSV per il commercialista** sono stati implementati e sono usabili dalla UI (non solo endpoint nascosti), e il **margine netto** è ora calcolato e mostrato in dashboard. Questi erano 3 dei 5 problemi critici del report precedente.

Allo stesso tempo, il re-audit ha scoperto **due difetti nuovi di severità pari o superiore** a quelli chiusi: (1) la pagina Abbonamento mostra un piano "Attivo" insieme a un banner che intima di attivare il piano perché il trial sta per scadere — messaggio contraddittorio su un account che paga; (2) più gravemente, **la dashboard e lo Scadenzario calcolano "quanto mi devono i clienti" da due fonti dati indipendenti e mai riconciliate** (`lavori`+`lavori_partitario` da un lato, `fatture` dall'altro), che su questo account divergono da "€36.185 su 245 lavori scaduti" a "✅ nessun insoluto" nella stessa sessione. Per un titolare, questa è la domanda più importante che fa all'app ("chi mi deve pagare?") e l'app dà due risposte incompatibili su due schermate diverse.

La semantica di `tecnici.compenso_base` — segnalata come ambigua a maggio — **non è stata toccata**. Analytics resta sostanzialmente lo stesso pannello 2×3 KPI di maggio, con l'aggiunta di un grafico a barre del fatturato 12 mesi (nessun margine, nessun top-cliente, nessuna % rifacimenti).

**Valutazione complessiva: 7.0/10** (baseline 6.5/10, target dichiarato 8.5+/10) — miglioramento reale ma parziale: l'app ha chiuso gap operativi importanti sulla fatturazione, ma ha aperto un nuovo gap di fiducia sui numeri finanziari che è, se possibile, più dannoso di quello chiuso.

---

## Confronto diretto con l'audit del 21 maggio (5 criticità originali)

| # | Problema baseline (6.5/10) | Stato oggi | Evidenza |
|---|---|---|---|
| 1 | Fatturazione non fluida, un lavoro alla volta | ✅ **Risolto** — batch invoicing con selezione multipla | `POST /api/fatture/batch` + `BatchFatturaSection.tsx`, sezione "N lavori pronti da fatturare" visibile su `/fatture` |
| 2 | Dashboard KPI senza redditività (margine) | 🟡 **Parzialmente risolto** — margine netto calcolato e mostrato in dashboard, ma **non** in `/analytics` | `src/lib/dashboard/queries.ts:188-228` (query margine), `DashboardTitolare.tsx:645-652` (UI) |
| 3 | `compenso_base` semanticamente ambiguo | ❌ **Non risolto** — stesso commento ambiguo nel codice, nessun campo `stipendio_mensile_netto` aggiunto | `src/components/features/tecnici/ProduttivitaTecnico.tsx:307` |
| 4 | Materiali non catalogati nel BOM non controllati | ❌ Non verificato in questo giro (fuori scope del re-test mirato su fatturazione/export) | — |
| 5 | Export dati assente per il commercialista | ✅ **Risolto** — bottone "⬇ Esporta CSV" visibile in `/fatture`, endpoint verificato funzionante end-to-end (200, CSV valido, header corretto) | `src/app/(app)/fatture/page.tsx:133-155`, `src/app/api/fatture/export/route.ts` |

**3 su 5** criticità originali hanno ricevuto lavoro di ingegneria concreto e verificabile. Questo giustifica un punteggio più alto della baseline. Non giustifica un salto a 8.5+, per le ragioni sotto.

---

## Punti di Forza confermati (invariati da maggio)

- Dashboard "Oggi" ben strutturata, ruolo-specifica, ora con toggle esplicito Gestione/Produzione per titolari che sono anche tecnici.
- Flusso consegna atomico (DdC + fattura + scarico materiali) — architettura invariata e solida.
- Scadenzario con sollecito WhatsApp one-tap — **ma vedi Problema Critico #2 sotto**, la sua affidabilità sui numeri è ora in dubbio.
- Design system Warm Panna applicato con disciplina anche nelle nuove feature (batch fatturazione, export CSV) — nessuna nuova inconsistenza visiva rilevata.

## Nuovi Punti di Forza (rispetto a maggio)

### ✅ Fatturazione batch reale e utilizzabile
`BatchFatturaSection.tsx` mostra i lavori consegnati e non ancora fatturati con checkbox multi-selezione, pulsante "Fattura N selezionati", claim atomico anti-doppia-fatturazione (`incluso_in_fattura` con UPDATE condizionale, `src/app/api/fatture/batch/route.ts:76-95`) e rollback in caso di errore XML. Questo è esattamente il fix richiesto a maggio, implementato con attenzione alla concorrenza.

### ✅ Export CSV raggiungibile dalla UI, non solo da URL nascosto
Verificato con una chiamata `fetch` autenticata: `GET /api/fatture/export?year=2026` risponde `200`, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="fatture-2026.csv"`, con intestazioni in italiano e formattazione numerica IT (virgola decimale, BOM UTF-8 per Excel). Il bottone è visibile in alto su `/fatture`.

### ✅ Margine netto in dashboard (a livello di codice)
`getFatturatoMensile` (o funzione equivalente in `queries.ts:188-228`) calcola `margine_netto = fatturato − costi_materiali − compensi_tecnici` usando `listino.costo_materiali_estimated` e `listino.compenso_tecnico`, e lo mostra sotto il fatturato mensile in dashboard. **Nota onestà:** sull'account di test il fatturato del mese è €0 (nessuna fattura reale emessa a luglio), quindi non è stato possibile verificare live che il numero di margine sia corretto su dati reali — la verifica è solo a livello di query/codice, non di risultato numerico osservato.

---

## Problemi Critici 🔴 (nuovi o non risolti)

### 🔴 #1 [NUOVO] — Dashboard e Scadenzario danno risposte opposte su "chi mi deve pagare"

**Descrizione:** la dashboard titolare mostra un KPI "Crediti da riscuotere" con importi significativi (osservato: importo a 5 cifre, decine di lavori scaduti). La pagina `/scadenzario` — costruita apposta per questo scopo, e valutata "eccellente" nell'audit di maggio — ha mostrato nella stessa sessione "✅ Nessun insoluto — Tutti i pagamenti sono in regola".

**Causa (confermata a livello di codice):** le due schermate leggono da due tabelle diverse, mai riconciliate:
- Dashboard: `supabase/migrations/008_dashboard_extended_kpi.sql:39-61` — calcola `pagamenti_scaduti_totale` come `lavori.prezzo_unitario − SUM(lavori_partitario.importo)` per lavori con `data_consegna_prevista` oltre 30 giorni fa.
- Scadenzario: `src/app/api/scadenzario/route.ts:36-46` — legge la tabella `fatture` filtrando `pagata = false AND stato_sdi != 'draft'`.

Se un laboratorio ha lavori consegnati/registrati direttamente in `lavori`/`lavori_partitario` (es. dati storici importati, o incassi registrati fuori dal flusso di fatturazione SDI) senza una riga corrispondente in `fatture` con `stato_sdi` diverso da `draft`, la dashboard conta un debito che lo Scadenzario non vedrà mai, e viceversa.

**Impatto business:** 🔴 CRITICO. Questa è la domanda numero uno di un titolare ("chi mi deve ancora pagare, e quanto?"). Un'app che dà due risposte diverse su due schermate distrugge la fiducia in **tutti** i numeri dell'app, non solo in questo. È più grave del problema "fatturazione controintuitiva" segnalato a maggio, perché quello era un problema di flusso (fastidioso), questo è un problema di **verità dei dati** (pericoloso).

**Fix suggerito:** unificare la fonte: lo Scadenzario e il KPI dashboard devono leggere lo stesso ledger (idealmente `fatture` + `lavori_partitario` riconciliati in un'unica vista/RPC), oppure il KPI dashboard deve esplicitamente escludere lavori senza fattura emessa e segnalarli come categoria separata ("lavori consegnati non ancora fatturati" ≠ "fatture scadute non pagate").

---

### 🔴 #2 [NUOVO] — Pagina Abbonamento: messaggio contraddittorio "Attivo" + "trial in scadenza"

**Descrizione:** su `/impostazioni/abbonamento`, un laboratorio con `stato = 'attivo'` (piano pagante) può comunque vedere il banner di warning "Il trial scade tra pochi giorni. Attiva il piano per continuare." insieme al badge verde "Attivo" — osservato live in produzione.

**Causa (codice):** `src/app/(app)/impostazioni/abbonamento/page.tsx:25-27` calcola `isTrialExpiringSoon` solo dalla vicinanza di `trial_ends_at` a "adesso", **senza controllare `l.stato === 'trial'`**. Il banner viene renderizzato a riga 55-59 (`{isTrialExpiringSoon && (...)}`) indipendentemente dallo stato reale dell'abbonamento. Se `trial_ends_at` non viene azzerato/ignorato al passaggio a piano pagante, il banner resta visibile per sempre su ogni account "attivo" il cui vecchio `trial_ends_at` cade per caso entro 7 giorni da oggi.

**Impatto business:** 🔴 CRITICO per fiducia/retention. Un cliente pagante che vede "attiva il piano o perdi l'accesso" può pensare che il pagamento non sia andato a buon fine, contattare il supporto inutilmente, o nel peggiore dei casi provare a "riattivare" un piano già attivo generando un doppio addebito Stripe.

**Fix suggerito:** una riga — `const isTrialExpiringSoon = l.stato === 'trial' && l.trial_ends_at ? (...) : false`.

---

### 🔴 #3 [INVARIATO da maggio] — `tecnici.compenso_base` ancora semanticamente ambiguo

**Descrizione:** identico al 21 maggio. Il commento nel codice conferma che il dubbio non è stato risolto: `compensoBase?: number | null  // target mensile da tecnici.compenso_base` (`src/components/features/tecnici/ProduttivitaTecnico.tsx:307`). Nessun campo `stipendio_mensile_netto` o rinomina è stato introdotto nello schema (verificato in `src/types/database.types.ts` — esiste solo `compenso_base`).

**Impatto business:** 🔴 CRITICO per gestione RU, invariato. Con tecnici che aspettano la busta paga a fine mese, questo rischio di controversia è ancora aperto dopo oltre un mese.

**Fix suggerito:** invariato dal report precedente — decisione con Filippo su semantica, poi migration + rinomina + UI esplicita. Effort stimato 2-3 ore, non ancora impiegate.

---

## Problemi Medi 🟠

### 🟠 #4 — Export CSV incompleto rispetto alla richiesta reale del commercialista
L'unico export disponibile è `/api/fatture/export` (lista fatture). Mancano ancora, come segnalato a maggio: export lavori/analytics, cedolini tecnici in batch. Il commercialista di un laboratorio con fatturazione mista (SDI + incassi diretti registrati in partitario) avrebbe comunque bisogno di incrociare dati da due export separati per capire il quadro completo — aggravato dal problema #1 sopra.

### 🟠 #5 — Discrepanza osservata tra KPI "Da fatturare" in dashboard e lista effettiva in `/fatture`
Osservazione live: la dashboard mostrava un conteggio "N Da fatturare", ma la sezione "lavori pronti da fatturare" su `/fatture` (che alimenta il batch invoicing, problema #1 di maggio ora risolto) era vuota nello stesso momento. Verificando il codice, la causa è strutturale, non un semplice ritardo di cache: il KPI dashboard conta lavori con `stato = 'pronto'` (`supabase/migrations/002_fase2_schema.sql:327-328`), mentre la lista effettivamente fatturabile su `/fatture` richiede `stato = 'consegnato' AND incluso_in_fattura = false` (`src/app/(app)/fatture/page.tsx:118`, coerente con `src/app/api/fatture/batch/route.ts:81`). Poiché in questa architettura la fattura si genera solo alla consegna, un lavoro "pronto" (non ancora consegnato) non può essere fatturato — l'etichetta "Da fatturare" sul KPI dashboard descrive in realtà "lavori pronti da **consegnare**", non da fatturare. Non è stato possibile verificare dove porti il tap sul KPI (il click è stato intercettato da un overlay durante il test), quindi il problema resta all'etichetta/conteggio, non necessariamente alla navigazione.

**Fix suggerito:** rinominare il KPI in "Pronti da consegnare" oppure cambiarne il filtro a `stato = 'consegnato' AND incluso_in_fattura = false` per farlo coincidere con ciò che l'utente può effettivamente fatturare in un tap dalla stessa dashboard.

### 🟠 #6 — Analytics resta superficiale, miglioramento minimo
`/analytics` (`src/app/(app)/analytics/page.tsx`) ha aggiunto un grafico a barre "Fatturato ultimi 12 mesi" (righe 234-261) rispetto ai soli 6 KPI statici di maggio. Mancano ancora: margine (presente solo in dashboard, non qui), top 5 clienti, % rifacimenti, lead time per tipo dispositivo — tutti già raccomandati nel report precedente e non implementati.

### 🟠 #7 — Errore di hydration React ripetuto su `/dashboard` (e altre pagine)
Osservato in modo identico e riproducibile su più caricamenti indipendenti: `Error: Minified React error #418 (text mismatch)` seguito da `TypeError: Cannot read properties of null (reading 'parentNode')`. Causa identificata nel codice: `getGreeting()` (`DashboardTitolare.tsx:114-119`) usa `new Date().getHours()` senza normalizzazione di fuso orario, in un componente `'use client'` (riga 1) che viene comunque server-side-rendered. Il server (Vercel, UTC) e il browser del titolare (Europe/Rome, UTC+1/+2) calcolano ore diverse nella stessa finestra di 1-2 ore al giorno (es. alle 10:30 UTC il server dice "Buongiorno" mentre il client in Italia, alle 12:30 locali, dice "Buon pomeriggio"), producendo un markup diverso tra SSR e hydration. Non è un problema visibile in modo permanente (il testo finale è corretto), ma genera un errore console ripetuto ogni giorno nella stessa fascia oraria e un micro-flash del testo per l'utente reale.

**Fix suggerito:** calcolare `getGreeting()` solo lato client dentro un `useEffect`, mostrando un placeholder neutro ("Ciao") nel render iniziale, oppure passare l'ora già risolta come prop da un Server Component che usa esplicitamente il fuso `Europe/Rome`.

---

## Problemi Bassi 🟡 (invariati, non ri-verificati in dettaglio in questo giro)

- Analytics senza confronto mese precedente esplicito nella UI (solo in dashboard).
- Documentazione/FAQ in-app ancora assente.
- Portale dentista non distribuibile dal dettaglio cliente (non ri-testato).

---

## Le 3 domande del titolare — risposta diretta

1. **"Riesco a capire quanto guadagno?"** Parzialmente sì a livello di codice (margine netto ora calcolato in dashboard), ma non verificabile su dati reali in questo test (fatturato mese = €0 sull'account usato) e assente su `/analytics`, dove un titolare guarderebbe per un'analisi più approfondita.
2. **"Riesco a esportare per il commercialista?"** Sì per le fatture — bottone funzionante, CSV corretto, verificato end-to-end. No per lavori/cedolini, ancora mancanti.
3. **"Capisco a colpo d'occhio lo stato del business?"** No in modo affidabile: la dashboard e lo Scadenzario possono raccontare due storie opposte sugli incassi in sospeso (Problema Critico #1). Questo è il regresso più serio di questo giro di audit.

---

## Punteggio Complessivo: 7.0/10

**Baseline 21 maggio: 6.5/10 → Oggi: 7.0/10 → Target dichiarato: 8.5+/10**

**Perché è salito:** 3 dei 5 problemi critici originali (fatturazione batch, export CSV, margine in dashboard) hanno ricevuto lavoro di ingegneria reale, verificato nel codice e in produzione, non solo promesso.

**Perché non è salito di più:** sono emersi due difetti nuovi di severità critica — la contraddizione dashboard/scadenzario sugli incassi (che colpisce esattamente il caso d'uso "capire lo stato del business" al centro di questa persona) e il messaggio contraddittorio sull'abbonamento attivo — mentre una criticità aperta da oltre un mese (`compenso_base`) resta identica, e Analytics riceve solo un miglioramento cosmetico (un grafico) rispetto alla richiesta originale (margine, top clienti, % rifacimenti, lead time).

**Per arrivare a 8.5+:** (1) unificare la fonte dati di "denaro dovuto" tra dashboard e scadenzario — priorità assoluta; (2) correggere il banner trial/attivo (fix da 5 minuti); (3) chiudere finalmente `compenso_base`; (4) portare in `/analytics` il margine e almeno un confronto per cliente/dispositivo, così com'era già raccomandato a maggio.

---

*Re-audit completato il 2 luglio 2026. Metodologia: navigazione autenticata Playwright su produzione + verifica incrociata nel codice sorgente di ogni finding riportato come "critico" o "medio". Vedi nota metodologica in apertura per i fenomeni esclusi per interferenza da sessioni E2E concorrenti.*

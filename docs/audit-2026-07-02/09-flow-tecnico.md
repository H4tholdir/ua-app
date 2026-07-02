# Audit Flusso UX — Giornata Tipo: Tecnico (RE-AUDIT follow-up)
**Data:** 2026-07-02 | **Baseline confrontata:** `docs/audit-2026-05-21/09-flow-tecnico.md` (7.5/10) | **Target:** 8.5+/10

## Nota metodologica — limite di questo re-audit

Durante il test in produzione (https://uachelab.com), la sessione browser ha subito ripetute
interferenze di autenticazione:

- `src/app/(auth)/login/login-form.tsx:186-192` pre-compila il campo email al mount leggendo
  `localStorage.getItem('ua_passkey_email')` e, se presente, imposta anche `hasSavedPasskey=true`.
  Questo effetto è asincrono e in più occasioni ha sovrascritto le credenziali digitate manualmente
  con l'ultima email salvata sul dispositivo (osservato passaggio non richiesto da
  `e2e-tecnico@ua-test.local` a `h4t@live.it` e a `e2e-frontdesk@ua-test.local` nella stessa sessione
  di test).
- Un secondo agente ha segnalato che, in parallelo, un processo E2E automatico stava operando sulle
  stesse credenziali `e2e-tecnico@ua-test.local`, causando login intrecciati e logout inattesi non
  imputabili all'app.
- Il tenant "Lab Test E2E" a cui è associato `e2e-tecnico@ua-test.local` non contiene alcun lavoro
  (`/lavori` → "Nessun lavoro ancora"), quindi non è stato possibile eseguire live, con l'account
  tecnico reale, i passaggi "segna fase completata / marca pronto / gestisci prova".

**Compensazione adottata:** l'identità di sessione è stata verificata in modo affidabile decodificando
il payload del cookie `sb-*-auth-token` (campo `email` del JWT), non le iniziali mostrate in UI. Il
login come tecnico è stato comunque ottenuto e confermato (screenshot dashboard tecnico, sotto). Per i
flussi che richiedevano dati reali (Cambia stato, fasi, prove), è stata usata la sessione titolare —
che condivide gli **stessi componenti React** (`LavoroCard.tsx`, `TabProduzione.tsx`,
`SegnalaProblemaSheet.tsx`) usati dal tecnico — su lavori reali del lab di produzione. Dove il test
è "by proxy" tramite componente condiviso anziché sessione tecnico diretta, è indicato esplicitamente.
La lettura del codice sorgente resta la fonte primaria e più affidabile per le domande sulle push
notification, che sono state verificate sia a livello di codice (wiring) sia confermando l'esistenza
reale dell'infrastruttura (VAPID, service worker, subscribe route).

---

## 1. Dashboard tecnico — è chiaro cosa fare oggi?

Confermato via login riuscito come `e2e-tecnico@ua-test.local` (identità verificata via JWT):

- Hero "Compenso oggi" ancora above-the-fold, verde, con sottotitolo lavorazioni completate — invariato
  e ancora il punto di forza più forte del flusso.
- KPI inline a 3 colonne (Urgenti / Oggi / Puntualità %) — invariato.
- Sezione "I miei lavori oggi" con empty state pulito ("Nessun lavoro assegnato per oggi ✓") quando non
  ci sono lavori — buon comportamento, non un errore silenzioso.
- **Osservazione nuova (non nel baseline):** la bottom nav del tecnico mostra le stesse voci del
  titolare (Oggi · Lavori · + · Clienti · Fatture · Sospesi), incluse "Fatture" e "Sospesi" che sono
  funzioni gestionali/contabili. Nel baseline non era stato notato. Da verificare se è comportamento
  voluto (piccoli lab dove il tecnico è anche titolare) o gap di role-scoping della nav — non risulta
  documentato come intenzionale in `ANALISI/`.

**Score dimensione: 10/10 — invariato rispetto al baseline.**

---

## 2. Segnare fase completata / marcare pronto / gestire prova

Verificato leggendo `src/components/features/lavori/form/TabProduzione.tsx` e testando dal vivo la
sessione titolare (stesso componente `LavoroCard`/sub-sheet stato) su un lavoro reale
(`ESPOSITO MASSIMO · #2026/0002`, con blocco attivo "Il bordo è strappato sul dente 14").

- Pulsanti esito fase `[OK] [Non conf.] [Parziale]` — invariati, 1 tap, timestamp `eseguita_at`
  mostrato in alto a destra della card fase. Feedback visivo (colore attivo + inset shadow) confermato
  nel codice, invariato dal baseline.
- **Friction #3 del baseline ("Confusione fase completata vs lavoro in prova") NON risolta.**
  `TabProduzione.tsx` non contiene alcuna logica di suggerimento/CTA quando tutte le fasi risultano
  `OK` (nessun controllo aggregato, nessun banner "Tutte le fasi completate — pronto per prova?").
  Il "Quick win" #5 del baseline ("Suggerimento CTA dopo tutte le fasi completate", stimato 20 min)
  risulta non implementato.
- Sub-sheet "Cambia stato" (`LavoroCard.tsx:956-985`) — invariato: mostra solo le label degli stati
  successivi (`Pronto`, `In prova esterna`, `Sospeso`), senza alcuna spiegazione del significato di
  ciascuna transizione (vedi punto 4).

**Score dimensione: 8/10 — invariato rispetto al baseline** (nessun miglioramento verificabile per la
distinzione fase→pronto).

---

## 3. Push notification — sono ora collegate agli eventi giusti?

Questo è il cambiamento più significativo rispetto al baseline (`3/10 → Push notification / Real-time
ASSENTE`). L'infrastruttura di push **ora esiste realmente** ed è **parzialmente** collegata.

**Infrastruttura (nuova rispetto al baseline):**
- `src/lib/notifications/push.ts` — wrapper `web-push` con VAPID reale (`sendPushToSubscription`),
  disabilitato in sicurezza se mancano le chiavi (`ensureVapid()`).
- `src/lib/notifications/trigger.ts` — `triggerPushByRole()` e `triggerPushToUser()`, entrambe
  fire-and-forget (try/catch silenzioso, non bloccano il flusso principale).
- `src/components/features/notifications/PushRegistrar.tsx` — componente client che registra la
  subscription del browser (`pushManager.subscribe`) e la sincronizza via
  `POST /api/notifications/subscribe`. Montato in `(app)/layout.tsx`.
- `public/sw.js` — service worker registrato.

**Wiring verificato per evento (grep su tutti i call-site di `triggerPush*`):**

| Evento | File:linea | Destinatario | Stato |
|---|---|---|---|
| **Rientro prova** (`registra_rientro`) | `src/app/api/lavori/[id]/prove/route.ts:179-186` | `triggerPushToUser(lavoro.tecnico_id, ...)` — il tecnico assegnato | ✅ **COLLEGATA** — chiude la lacuna #1 più critica del baseline ("Marco scopre rientro solo se apre app") |
| Segnalazione problema | `src/app/api/lavori/[id]/segnala/route.ts:103` | `triggerPushByRole(..., 'titolare', ...)` | ✅ collegata (verso titolare, non verso tecnico — corretto per questo evento) |
| Lavoro pronto → avviso front_desk | `src/lib/consegna/orchestrate.ts:233` | `triggerPushByRole(..., 'front_desk', ...)` | ✅ collegata (non riguarda il tecnico) |
| **Nuova assegnazione lavoro a un tecnico** | `src/app/api/lavori/[id]/route.ts` (PATCH, gestisce `tecnico_id`) | — | ❌ **NON COLLEGATA** — nessun `triggerPush*` importato o chiamato in questo file (verificato via grep degli import). Il tecnico non riceve alcuna notifica push quando gli viene assegnato un nuovo lavoro. |

**In-app realtime toast (`useRealtimeNotifiche.ts`, canale Supabase Realtime, diverso dalla push
web):** i toast per `segnalazione` e `pronto` sono filtrati esplicitamente per ruolo
(`ruolo === 'titolare' || ruolo === 'admin_rete'` / `'front_desk'`, righe 61-89) — **il tecnico non
riceve toast in-app per questi eventi**, solo per `urgente` (righe 91-103, nessun filtro ruolo) e per
i push web-based (tabella sopra).

**Conclusione punto 3:** le push funzionano per il tecnico **solo per il rientro prova** (l'evento più
richiesto nel baseline), non per la nuova assegnazione. Miglioramento reale ma parziale.

**Score dimensione (Push/Real-time): 6/10 — su da 3/10, sotto il target pieno.**

---

## 4. Transizioni di stato — ora spiegate?

Verificato in `src/components/features/lavori/LavoroCard.tsx`:

- Il componente `SheetAction` (righe 181-239) supporta già un prop opzionale `sub?: string` che
  renderizza un sottotitolo grigio sotto il titolo (usato correttamente nel sub-sheet "Priorità",
  riga 1008: `sub={p === priorita ? 'Attuale' : undefined}`).
- Nel sub-sheet "Cambia stato" (righe 973-981), le stesse `SheetAction` per `Pronto`,
  `In prova esterna`, `Sospeso` **non passano alcun `sub`** — quindi il meccanismo esiste ma non è
  usato per spiegare le transizioni.

**Friction #1 del baseline NON risolta.** Il "Quick win" #1 del baseline ("Tooltip/help text su
transizioni stato", stimato 5 minuti) non risulta implementato, nonostante il componente supporti
già la UI necessaria — è un fix a bassissimo sforzo rimasto non fatto.

**Score dimensione: invariato.**

---

## 5. Connessione lenta / offline

Testato con Chrome DevTools Protocol via Playwright (throttling reale, non solo teorico):

- **Offline totale** (`context.setOffline(true)`): sia una navigazione hard sia un click su un
  `<Link>` interno (che Next.js dovrebbe gestire come navigazione client-side) sono finiti su
  `chrome-error://chromewebdata/` con la pagina dinosauro nativa di Chrome
  (`ERR_INTERNET_DISCONNECTED`) — **nessuna schermata offline dell'app, nessun banner "sei offline",
  nessun fallback servito dal service worker** (`public/sw.js` esiste ma non intercetta la
  navigazione con un fallback app-shell).
- **Rete estremamente lenta** (20 kbps, 800 ms di latenza — throttling volutamente aggressivo):
  una navigazione a `/lavori` non ha raggiunto `domcontentloaded` in 15 secondi — schermo bianco per
  tutto il periodo, nessuno skeleton/placeholder visibile prima del completamento del load.

Questo comportamento non era stato testato nel baseline 2026-05-21 (non menzionato come verificato
né come friction), quindi non è un regresso, ma è un gap reale e rilevante per un tecnico in
laboratorio con Wi-Fi debole/rame vecchio: un fallimento di rete produce l'errore nativo del browser,
non un'esperienza degradata controllata dall'app.

**Nuovo problema rilevato, non presente nel baseline.**

---

## Problemi con file:linea (residui + nuovi)

### 🔴 Residuo #1 — Transizioni stato non spiegate (BASELINE, non risolto)
`src/components/features/lavori/LavoroCard.tsx:973-981` — `SheetAction` supporta `sub` (righe 185,
231-235) ma non viene passato per le opzioni di cambio stato.
**Fix:** aggiungere `sub="Pronto per il dentista"` / `sub="In attesa di materiali"` ecc. — è letteralmente
una riga per opzione, il componente è già pronto.

### 🔴 Residuo #2 — Nessuna CTA dopo fasi tutte completate (BASELINE, non risolto)
`src/components/features/lavori/form/TabProduzione.tsx` — nessuna logica che rilevi
"tutte le fasi = OK" e suggerisca il passaggio a pronto/prova.

### 🟡 Residuo #3 — Push assente per "nuova assegnazione" (BASELINE parzialmente risolto)
`src/app/api/lavori/[id]/route.ts` — nessun `triggerPushToUser`/`triggerPushByRole` collegato al
cambio di `tecnico_id`. Il rientro prova (il gap più citato nel baseline) è invece stato risolto in
`src/app/api/lavori/[id]/prove/route.ts:179-186`.

### 🆕 Nuovo #4 — Nessun fallback offline/rete lenta
`public/sw.js` non serve un app-shell di fallback per navigazioni offline; nessun indicatore di
"connessione assente" nell'app. Impatto alto per un tecnico da banco con Wi-Fi di laboratorio.

### 🆕 Nuovo #5 — Bug login: passkey email overwrite
`src/app/(auth)/login/login-form.tsx:186-192` — l'effetto di rilevamento biometrico rilegge
`localStorage.ua_passkey_email` e forza `setEmail(savedEmail)` se presente, sovrascrivendo un'email
digitata manualmente se l'utente accede da un dispositivo con una passkey salvata per un account
diverso (es. laboratorio condiviso da più persone sullo stesso tablet). Ha causato interferenze dirette
durante questo audit (login involontari come altri account). Da verificare con test multi-utente su
device condiviso — plausibile impatto reale in un laboratorio dove più tecnici usano lo stesso tablet.

### ⚪ Non regredito, ancora aperto — Cronometro fase (V1.7, come da baseline)
Confermato via grep: nessun componente cronometro/timer di produzione nel codice (`grep -rn timer`
restituisce solo debounce/toast generici, non un timer di fase). Resta pianificato per V1.7, coerente
col baseline.

---

## Score Flusso Tecnico — confronto con baseline

| Area | Baseline 21/05 | Ora (02/07) | Δ | Note |
|---|---|---|---|---|
| Accesso Dashboard | 10/10 | 10/10 | = | Hero compenso invariato, confermato via screenshot reale |
| Presa in carico lavoro | 8/10 | 8/10 | = | Componenti invariati (swipe/long-press), nessuna modifica rilevata |
| Fasi produzione | 8/10 | 8/10 | = | UI invariata; CTA "fasi complete → pronto" ancora assente |
| Segnalazione problema | 9/10 | 9/10 | = | `onSegnalato` ora chiama `router.refresh()` (LavoroFormClient.tsx:405) — miglioramento minore rispetto al "solo dopo refresh completo" del baseline, ma non è un aggiornamento locale ottimistico |
| Flow prove | 7/10 | 7/10 | = | Nessuna modifica rilevata a form/UX; friction #4/#5 baseline ancora aperte |
| Visualizzazione compenso | 9/10 | 9/10 | = | Invariato |
| **Push notification / Real-time** | **3/10** | **6/10** | **+3** | Infrastruttura reale (VAPID/SW/subscribe) e wiring per rientro prova confermati; assegnazione lavoro ancora scoperta |
| Error handling | 6/10 | 5/10 | −1 | Nuovo: nessun fallback offline/rete lenta rilevato (errore nativo Chrome, non gestito dall'app) |

**Punteggio complessivo: 7.8/10** (baseline 7.5/10, target 8.5+/10 — **target non raggiunto**)

**Verdict:** il miglioramento reale e verificato è la push notification per il rientro prova, che era
il gap più critico segnalato nel baseline ("Marco non sa se prova rientra") — questo da solo giustifica
un incremento di punteggio. Tuttavia i tre "quick win" più economici del baseline (tooltip transizioni
stato, CTA dopo fasi complete, push per nuova assegnazione) restano tutti non implementati nonostante
fossero stimati collettivamente in meno di un'ora di lavoro. A questi si aggiunge un gap non
precedentemente testato — assenza di fallback offline — rilevante per l'uso reale in laboratorio.
Per raggiungere 8.5+/10 servono: (1) i tre quick-win residui del baseline, (2) un fallback offline
minimo (banner "sei offline" + cache app-shell via service worker), (3) fix del bug di autofill email
del login su device condivisi.

---

*Re-audit completato il 2 luglio 2026. Metodologia: lettura codice sorgente (fonte primaria per
wiring push/tooltip) + test Playwright su https://uachelab.com, viewport 390×844, con verifica
identità di sessione tramite decodifica JWT del cookie di autenticazione. Vedi nota metodologica in
apertura per i limiti di interferenza riscontrati durante il test live con l'account tecnico.*

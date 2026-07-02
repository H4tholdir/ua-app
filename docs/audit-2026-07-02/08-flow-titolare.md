# Re-Audit Flusso UX — Titolare (Follow-up)
**Data:** 2026-07-02 | **Baseline confrontata:** `docs/audit-2026-05-21/08-flow-titolare.md` (score 6.5/10, target 8+/10)
**Metodologia:** Playwright headless, contesto browser isolato (nuovo `BrowserContext` per test, per evitare interferenze), login reale con `h4t@live.it` (verificato via query diretta su tabella `utenti`: ruolo=`titolare`, nome="Francesco Test Filippo" — è l'account corretto, non un dato stantio).

---

## ⚠️ Nota metodologica importante

Durante l'audit, il browser condiviso ha mostrato **sessioni intercalate con un altro processo** (in un momento, dopo un click, la sessione è apparsa come utente "Test / ACCETTAZIONE" invece di "Francesco / titolare" — verosimilmente un altro agente/E2E concorrente che stava testando in parallelo sullo stesso ambiente prod). Dopo aver isolato ogni test in un `BrowserContext` dedicato con login pulito, il comportamento si è stabilizzato e i conteggi sotto sono stati **confermati end-to-end con dati reali** (es. creazione lavoro riuscita, numero progressivo 2026/0004). Va considerato che **testare su produzione condivisa introduce rumore**: alcuni fenomeni transitori osservati inizialmente (navigazioni impreviste, redirect a `/login`) sono quasi certamente artefatti dell'ambiente condiviso, non bug applicativi — non sono stati inclusi come findings salvo dove riprodotti in modo isolato e consistente.

---

## Punteggio complessivo: **6/10** (invariato rispetto a 6.5/10 — obiettivo 8+/10 NON raggiunto)

La dashboard è stata **riscritta** (V1.5 → versione con tab "Gestione business" / "Produzione i miei lavori", nuovo form "Nuovo lavoro" monopagina). Alcuni flussi sono oggettivamente migliorati (creazione lavoro, "da fatturare" ora visibile), ma **due regressioni gravi** annullano il guadagno: lo scadenzario (ex 9/10, fiore all'occhiello) ora mostra dati incoerenti con la dashboard, e la funzione "invita tecnico" esiste ma è **irraggiungibile dalla UI** (nessun link in nav/menu/impostazioni).

---

## Tabella tap-count: vecchio vs nuovo

| # | Flusso | Vecchio (21/05) | Nuovo (02/07) | Δ | Stato |
|---|--------|:---:|:---:|:---:|-------|
| 1 | Login → "quanto ho fatturato questo mese" | 1 tap (visibile above-the-fold) | 2–3 tap (login → *dismiss prompt biometrico [nuovo]* → tab "Gestione business") | 🔴 +1/+2 | Peggiorato (ma dato ora più pulito, meno scroll) |
| 2 | Creare un nuovo lavoro completo | 8 tap (dichiarati; 7 nella somma reale) | **7 tap** (+, cliente, tipo, descrizione, data, priorità, crea) | 🟢 −1 | Migliorato — form monopagina, submit confermato (lavoro 2026/0004 creato) |
| 3 | Trovare "lavori pronti da fatturare" | 6+ tap (flusso indiretto, "nascosto") | **2–3 tap** (tab Gestione business → chip "5 Da fatturare — tocca per vedere") | 🟢 −4/−3 | Migliorato molto — risolve friction #5 e QW4 della baseline |
| 4 | Gestire scadenzario/promemoria cliente | 2 tap ("perfetto", 9/10) | 1 tap raggiunge `/scadenzario`, ma la pagina mostra **"Nessun insoluto"** mentre la dashboard nello stesso momento mostra **245 clienti / €36.185 scaduti** | 🔴 Regressione funzionale | **Rotto**: dato incoerente, flusso reale bloccato |
| 5 | Invitare un nuovo tecnico | non misurato nella baseline | Pagina `/tecnici` esiste e funziona (CTA "Invita tecnico"), ma **nessun link** la raggiunge da bottom-nav, menu profilo o `/impostazioni` | 🔴 Irraggiungibile | **Nuovo flusso non scopribile** (0/10 discoverability) |

---

## Dettaglio per flusso

### 1. Login → Fatturato mensile

Sequenza reale osservata (contesto pulito, primo accesso):
1. **Tap "Entra nel laboratorio"** → login riuscito (~5-6s di attesa, poi "Bentornato!")
2. **NUOVO STEP:** compare un prompt biometrico "Accedi più veloce — Attiva Touch ID o Face ID" (compare 10-15s dopo submit). Richiede un tap ("Non adesso") per procedere. Non presente nell'audit precedente.
3. Si atterra su `/dashboard` con tab default **"Produzione i miei lavori"** selezionato — il fatturato NON è visibile qui.
4. **Tap tab "Gestione business"** → ora appare "Fatturato mensile — luglio 2026 — 0 €" insieme a "Crediti da riscuotere" (€36.185, 245 clienti) e chip azionabili (In ritardo, Da fatturare, Materiali in esaurimento).

Totale: **2 tap** se il prompt biometrico è già stato gestito su quel dispositivo (persistente 30gg), **3 tap** al primo accesso assoluto. Il vecchio flusso mostrava il fatturato (settimanale) senza alcun tap aggiuntivo, above-the-fold. La nuova architettura a tab è più pulita (meno scroll, ~4 scroll → 0) ma sposta l'informazione dietro un tap extra e introduce un default-tab che non è quello con i KPI business.

**Raccomandazione:** rendere "Gestione business" il tab di default per il ruolo titolare, o mostrare un mini-KPI fatturato anche nel tab "Produzione".

### 2. Creazione nuovo lavoro completo

Il form è stato riscritto: da wizard a 2 tab "vecchio stile" a un **form monopagina** con progress indicator "1 Dati / 2 Accettazione MDR" (la tab MDR resta opzionale/read-only in creazione, 0 tap — comportamento invariato dalla baseline).

Sequenza confermata con dati reali (cliente "ESPOSITO MASSIMO", corona su impianto urgente):
1. Tap "+" (bottom nav) → `/lavori/nuovo`
2. Tap combobox "Dentista/Studio" → digita ricerca → tap risultato
3. Select "Tipo dispositivo" → Implantologia
4. Tap "Descrizione" → digita
5. Tap "Data consegna" → seleziona
6. Select "Priorità" → Urgente
7. Tap "Crea lavoro" → **successo**, redirect a `/lavori/2dcdd536-...` con numero progressivo **2026/0004**

**Totale: 7 tap** (vs 8 dichiarati/7 di fatto nella baseline) — leggero miglioramento, form più snello.

Persistono le due criticità già note e NON risolte:
- "Medico richiedente" resta opzionale (nessun asterisco) — rischio tracciabilità MDR Allegato XIII invariato.
- Nessuna memorizzazione dell'ultimo cliente usato (QW2 della baseline non implementata).

Nota QA minore: il dropdown risultati cliente richiede ~1-2s dopo la digitazione prima di essere cliccabile in modo affidabile (debounce ricerca + round-trip Supabase) — non blocca un utente reale che digita e attende naturalmente, ma vale la pena abbreviare la latenza.

### 3. Lavori pronti da fatturare

**Miglioramento più significativo di questo audit.** La dashboard (tab "Gestione business") ora mostra un chip diretto: **"5 Da fatturare — tocca per vedere"**, insieme a "52 In ritardo" e "4 Materiali in esaurimento". Questo risolve direttamente la Friction #5 e la Quick Win QW4 della baseline ("Section 'Pronti da fatturare' nel dashboard con count").

Totale: **2-3 tap** (login → tab Gestione business → tap chip) contro i 6+ tap indiretti di prima.

**Riserva:** la pagina `/fatture` di destinazione (raggiunta anche da "Vedi tutti" sul widget crediti) mostra ancora il vecchio banner "Le fatture vengono generate automaticamente. Vai su un lavoro → Consegna per generare la fattura." — la UX di fondo della pagina Fatture non è stata cambiata, solo aggirata con una scorciatoia dashboard. Inoltre `/fatture?filter=scadute` non mostra i 245 clienti scaduti annunciati dal widget (vedi punto 4 sotto) — solo 1 fattura in bozza.

### 4. Scadenzario / promemoria cliente — REGRESSIONE CRITICA

Nella baseline questo era il fiore all'occhiello (9/10, 2 tap, "nessun friction"). Ora:

1. Tap "Sospesi" (bottom nav) → `/scadenzario`
2. La pagina mostra: **"✅ Nessun insoluto — Tutti i pagamenti sono in regola."**

Ma nello stesso momento, la dashboard (tab Gestione business) mostra **"245 clienti con pagamenti scaduti"** e **"€36.185 crediti da riscuotere"**, con nomi reali (GDA STP S.R.L. €17.591, ESPOSITO MASSIMO €5.833, ecc.) e bottoni "Contatta" funzionanti. Ho verificato anche `/fatture?filter=scadute` (link "Vedi tutti" dal widget): mostra una sola fattura in bozza, non i 245 clienti.

**Questo è un bug di incoerenza dati grave**: la pagina dedicata `/scadenzario` (quella raggiungibile dal bottom-nav "Sospesi", il percorso che un titolare userebbe naturalmente) sembra leggere da una fonte dati diversa/vuota rispetto al widget dashboard, che invece è corretto e ricco di dettagli. Per Filippo, il flusso "sollecito pagamento" descritto nella baseline (tap card cliente → tap WhatsApp) **non è raggiungibile passando dalla nav standard** — deve sapere di restare sulla dashboard e usare i bottoni "Contatta" lì, oppure andare su `/fatture` (ma senza vista aggregata per cliente).

**Raccomandazione P0:** allineare la query di `/scadenzario` alla stessa fonte dati del widget "Crediti da riscuotere" in dashboard, oppure deprecare la pagina `/scadenzario` e reindirizzare "Sospesi" al widget dashboard/una vista fatture filtrata coerente.

### 5. Invitare un nuovo tecnico — flusso non scopribile

Non misurato nella baseline (05/21). La pagina `/tecnici` esiste e **funziona**: mostra "Invita tecnico", stato vuoto con copy corretto ("Invita un collaboratore per assegnargli lavori e tracciare la produttività") e CTA "Invita collaboratori →".

Il problema: **nessun punto della UI porta a `/tecnici`**. Verificato assenza di link in:
- bottom nav (Oggi / Lavori / + / Clienti / Fatture / Sospesi)
- menu profilo (Profilo, Impostazioni laboratorio, Abbonamento, Logout)
- pagina `/impostazioni` (Dati laboratorio, PEC, MDR, Preferenze — nessun link a Tecnici/Team)

Un titolare reale non ha alcun modo di scoprire questa funzione navigando l'app. È raggiungibile solo digitando l'URL a mano. Tap-count: N/A (irraggiungibile), o "infinito" da UI pura.

**Raccomandazione P0:** aggiungere una voce "Tecnici" nel menu profilo o in `/impostazioni`, con badge/CTA visibile per l'onboarding del primo collaboratore (coerente con il principio fondante "tutto automatico, pochissimi tap" di UÀ).

---

## Confronto con baseline e target

| | Baseline 21/05 | Re-audit 02/07 |
|---|:---:|:---:|
| Score complessivo | 6.5/10 | **6/10** |
| Target dichiarato | 8+/10 | **non raggiunto** |
| Scadenzario | 9/10 (perfetto) | ~3/10 (dati incoerenti) |
| Creazione lavoro | 5/10 (8 tap) | 7/10 (7 tap, form migliore) |
| Fatturazione "nascosta" | 6/10 | 8/10 (chip dashboard risolve friction #5) |
| Fatturato in dashboard | 7/10 (0 tap extra) | 6/10 (dietro 1 tab + prompt biometrico) |
| Invito tecnico | non misurato | 2/10 (funziona ma non scopribile) |

**Netto:** i miglioramenti reali su creazione-lavoro e "da fatturare" sono **compensati quasi esattamente** dalla regressione sullo scadenzario (che era il flusso migliore in assoluto) e dalla mancata scopribilità dell'invito tecnico. Il punteggio resta sostanzialmente fermo a metà tra 6 e 6.5, **sotto il target 8+**.

## Priorità consigliate per il prossimo ciclo
1. **P0 — Fix dati scadenzario**: allineare `/scadenzario` al widget dashboard (stessa query "crediti da riscuotere").
2. **P0 — Discoverability invito tecnico**: link a `/tecnici` da menu profilo o impostazioni.
3. **P1 — Tab default dashboard**: valutare "Gestione business" come default per ruolo titolare, o KPI ibridi visibili in entrambi i tab.
4. **P1 — QW2 non ancora fatta**: precompilare ultimo cliente usato nel form nuovo lavoro (localStorage).
5. **P2 — Medico richiedente obbligatorio** se lo studio ha >1 medico (rischio MDR, invariato da 21/05).

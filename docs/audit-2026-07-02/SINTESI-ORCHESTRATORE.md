# UÀ PWA — Re-Audit V1.9.3
## Sintesi Orchestratore
**Data:** 2026-07-02 | **Report letti:** 11 | **Baseline confronto:** docs/audit-2026-05-21/ (21/05/2026, score medio 7.1/10)

---

## 0. Nota metodologica importante — LEGGERE PRIMA

Due problemi hanno inciso sulla qualità di questo audit e vanno considerati nell'interpretare i punteggi:

1. **Sessione di produzione condivisa con processi E2E concorrenti.** Almeno 5 agenti (Designer, Titolare, Flow Titolare, Flow Tecnico, Flow Front Desk) hanno riscontrato interferenze da processi di test automatizzati in esecuzione simultanea su `uachelab.com` con le stesse credenziali (`e2e-tecnico@ua-test.local`, `e2e-frontdesk@ua-test.local`): login intercalati, logout inattesi, drift di navigazione, screenshot sovrascritti. Gli agenti hanno mitigato isolando browser context dedicati e verificando l'identità reale via JWT/query DB diretta, ma la copertura fotografica sistematica (3 viewport × 2 temi) non è stata raggiunta ovunque. **Raccomandazione: il prossimo audit visivo va eseguito con un ambiente/token isolato dal test E2E schedulato.**
2. **Errore infrastrutturale a metà audit.** 4 dei 11 agenti (Titolare, Flow Titolare, Flow Tecnico, Flow Front Desk) hanno subito un errore di connessione API a fine sessione dopo 110-161 tool call già eseguiti. Sono stati ripresi con successo dal loro contesto (nessun lavoro perso), ma segnalo la cosa per trasparenza sul processo.

---

## 1. Verdetto Complessivo

**Score medio: 7.29/10** (baseline 21/05: 7.1/10 — miglioramento marginale di +0.19, non i +1.4/+1.9 punti che i target fissati a maggio si aspettavano su quasi ogni dimensione)

Il quadro è a due velocità. Da un lato, **i fix critici di compliance MDR promessi per lo Sprint Alpha di maggio sono stati realizzati davvero**: il campo disinfettante ha l'opzione "Non dichiarato", la consegna con dati MDR incompleti è ora bloccata sia lato client (soft) sia lato server (hard, non aggirabile), la fatturazione batch e l'export CSV per il commercialista funzionano, il form di creazione lavoro è stato genuinamente semplificato, e le push notification per il rientro prova sono operative. Design System v2.3 è stato applicato con qualità alta sulle pagine principali (rainbow KPI, Playfair Display, dark mode flat, tasto+ fisico) — lavoro reale, non solo dichiarato.

Dall'altro lato, sono emersi **problemi nuovi e più gravi di quelli chiusi**, in particolare due che toccano la fiducia nel prodotto: la **tracciabilità MDR di materiali e lotti è strutturalmente rotta** (ogni Dichiarazione di Conformità generata oggi ha il campo materiali/lotti vuoto, perché nessun codice scrive mai nella tabella che il PDF legge), e **dashboard e scadenzario mostrano cifre di credito contrastanti** perché calcolate da due fonti dati mai riconciliate — un titolare che guarda i due schermi nella stessa sessione vede numeri diversi per la stessa domanda ("quanto mi devono i clienti?").

Il claim "Design System v2.3 al 100%" in MEMORY.md **non è verificato**: la pagina di login (la superficie più trafficata dell'app) viola ancora una regola WCAG esplicitamente vietata dalla spec v2.3, invisibile allo script di enforcement automatico per un limite di scope.

**Verdetto:** UÀ non è regredita nel complesso, ma non ha fatto il salto di qualità che il piano di maggio prometteva. Nessuna delle 11 dimensioni ha raggiunto il proprio target. 4 dimensioni su 11 sono **peggiorate** rispetto al 21/05.

---

## 2. Score per Dimensione — Confronto Diretto

| Dimensione | 21/05 | Target dichiarato | 02/07 | Delta | Esito |
|---|---|---|---|---|---|
| Operatività Odontotecnico | 7.5 | 8.5+ | **7.2** | -0.3 | ❌ Regredito |
| Business / Titolare | 6.5 | 8.5+ | **7.0** | +0.5 | ⚠️ Migliorato, target mancato |
| Dentista / Clinico | 5.0 | 6.5+ | **4.0** | -1.0 | ❌ Regredito (baseline gonfiata, non testata a fondo a maggio) |
| PWA / Mobile | 7.8 | 9+ | **8.4** | +0.6 | ⚠️ Migliorato, target mancato |
| Design System | 9.2 (v2.2) | 9.5+ | **8.8** (v2.3, non direttamente comparabile) | n/a | ⚠️ Claim "100%" smentito |
| UX / Interaction Design | 6.8 | 8.5+ | **8.3** | +1.5 | ⚠️ Miglior progresso dell'audit, target quasi centrato |
| Tecnica / Architettura | 7.2 | 9+ | **7.6** | +0.4 | ⚠️ Migliorato, target mancato |
| Flusso Titolare | 6.5 | 8+ | **6.0** | -0.5 | ❌ Regredito |
| Flusso Tecnico | 7.5 | 8.5+ | **7.8** | +0.3 | ⚠️ Migliorato, target mancato |
| Flusso FrontDesk | 7.8 | 9+ | **8.6** | +0.8 | ⚠️ Migliorato, secondo miglior progresso |
| Sistematico (pagine) | 7.3 | 9+ | **6.5** | -0.8 | ❌ Regredito |

**Media: 7.29/10** (7 dimensioni migliorate, 4 regredite, 0 target centrati)

---

## 3. I Due Problemi Critici Nuovi (corroborati da più agenti indipendenti)

### Critico A — Tracciabilità MDR materiali/lotti strutturalmente rotta
**Fonte:** Report 01 (Odontotecnico)

La sezione "Materiali/Lotti" della Dichiarazione di Conformità (`DdcTemplate.tsx`) legge dalla tabella `lavori_materiali`. Nessun trigger, endpoint o Edge Function nel repo scrive mai in quella tabella. Il sistema più recente di scarico magazzino (`scarichi_magazzino`, aggiunto il 20/05) decrementa lo stock automaticamente ma il suo campo `lotto_numero` — commentato in codice come "obbligatorio MDR Allegato XIII" — non viene mai valorizzato.

**Impatto reale:** ogni DdC emessa oggi da UÀ ha il campo materiali/lotti vuoto. In caso di ispezione, è un'esposizione diretta per Filippo su un requisito esplicito dell'Allegato XIII MDR 2017/745 — più grave del problema "disinfettante non dichiarato" di maggio perché qui manca l'intero meccanismo di popolamento dati, non solo un'opzione UI.

**Priorità: CRITICA, da trattare come blocker prima di ogni nuova consegna reale a un cliente esterno.**

### Critico B — Dashboard e Scadenzario non riconciliati
**Fonte:** Report 02 (Titolare) + Report 08 (Flow Titolare), corroborazione indipendente

Dashboard e `/scadenzario` calcolano "crediti verso clienti" da fonti diverse (`lavori`/`lavori_partitario` vs `fatture`) mai riconciliate. Nella stessa sessione di test, la dashboard mostrava crediti scaduti a 5 cifre (245 clienti, €36.185) mentre lo scadenzario diceva "nessun insoluto".

**Impatto reale:** colpisce la domanda più importante per un titolare — "quanto mi devono?" — con due risposte diverse sullo stesso schermo. Lo scadenzario era il fiore all'occhiello dell'audit di maggio (9/10 in tap-efficiency); oggi ha dati inaffidabili.

**Priorità: ALTA, prima che Filippo prenda decisioni di credito basate su numeri sbagliati.**

---

## 4. Pattern Trasversali

### Pattern A — Fix dichiarati "risolti" ma solo mascherati, non corretti
Citato da Software Engineer (PDF `as any` → ora `eslint-disable-next-line` sullo stesso cast, non una validazione reale) e Designer (script di compliance DS ha 3 blind spot strutturali: non scansiona `.css`, non rileva colori passati per lookup object, non rileva variabili CSS mai dichiarate come `--cobalt`). In entrambi i casi il gate automatico dà falso verde.

### Pattern B — Funzionalità "orfane": esistono ma sono irraggiungibili
"Invita tecnico" (Sistematico + Flow Titolare): il bug di maggio (link sbagliato) è peggiorato — ora non c'è alcun link, da nessuna pagina. Il download DdC dal portale dentista (Dentista): il codice del bottone di condivisione WhatsApp promette "scarica i documenti" ma `ddc_signed_url`/`buono_signed_url` sono `null` hardcoded, sempre.

### Pattern C — I miglioramenti reali sono concentrati su UX/compliance operativa, non su infrastruttura
Form semplificato, validazione migliorata, fix disinfettante, soft/hard block MDR, fatturazione batch, export CSV, push rientro prova: tutti verificati e funzionanti. Ma Service Worker offline, cache versioning, query `/ordini` rotta, test coverage su Stripe/orchestraConsegna: tutti **identici a maggio**, byte-per-byte in alcuni casi (query `/ordini` confermata invariata da due agenti diversi).

### Pattern D — Roadmap disallineata dal codice reale, in entrambe le direzioni
`docs/roadmap/ROADMAP-UFFICIALE.md` segna "logo + firma DdC" come ⏳ da fare — il Software Engineer conferma che è **già implementato** nel codice. Al contrario, MEMORY.md dichiara "Design System v2.3 100% compliance" — il Designer dimostra che **non lo è**. La documentazione va aggiornata in entrambe le direzioni, non solo per registrare progressi.

---

## 5. Bug Nuovi Non Noti a Maggio

- **Errore di hydration React (#418)** su `/dashboard`, causato da calcolo orario server-UTC vs client-locale in `getGreeting()` — 8 pattern simili con `new Date()` individuati (Sistematico, confermato anche da PWA Engineer)
- **5 link CRUD che portano a pagine 404**: magazzino, listino, rete (×2), qualità/rischi (Sistematico)
- **Lista pazienti non navigabile**: impossibile aprire `/pazienti/[id]` dalla lista (bug già taggato internamente come BUG #13, mai risolto)
- **`/api/fornitori` mancante**: blocca la creazione di nuovi ordini (Sistematico)
- **Colore bandito da CLAUDE.md** (`#1B2D6B`, cobalt) renderizzato come sfondo su ogni card lavoro — variabile `--cobalt` referenziata ma mai dichiarata in nessun file CSS del progetto (Designer + Sistematico, corroborato)
- **Pagina Abbonamento** mostra contemporaneamente "Attivo" e un banner "trial in scadenza" (bug logico da una riga, `isTrialExpiringSoon` non controlla lo stato reale) — Titolare
- **Nuova assegnazione lavoro** non genera alcuna push notification al tecnico, a differenza del rientro prova che invece funziona — Flow Tecnico
- **ClienteComboBox** non ha `aria-invalid`/`aria-describedby` — unico campo del form Nuovo Lavoro rimasto indietro dopo il refactor della validazione — UX Expert

---

## 6. Cosa Funziona Bene e Va Riconosciuto

- **Compliance MDR alla consegna**: hard-block server-side non aggirabile per gli elementi core dell'Allegato XIII, soft-block esplicito per disinfettante/tipo impronta con dialog "non conforme". Il gap più grave di maggio (si poteva consegnare con dati incompleti) è chiuso con un'implementazione più robusta del previsto.
- **Form Nuovo Lavoro**: da 9 tab (7 bloccate) a 2 tab visibili con step indicator, validazione con auto-focus e messaggi specifici per campo — verificato live due volte.
- **Fatturazione batch + export CSV commercialista**: funzionanti end-to-end, non solo endpoint nascosti.
- **CSRF**: copertura completa confermata su tutte le 35 route dinamiche `[id]`.
- **Flusso "richiedi lavoro dal portale dentista"**: genuinamente funzionante end-to-end (verificato con una richiesta reale in produzione, arrivata via Supabase Realtime) — ma pre-esisteva già a maggio, non è un progresso di questo periodo.
- **Error boundary**: copertura completa, 33 file `error.tsx` funzionanti.
- **GSAP rimosso**, dipendenza da 300KB eliminata dal bundle.

---

## 7. Piano d'Azione Proposto

### Immediato (blocker compliance, 1-2 giorni)
1. **Popolare `lavori_materiali`/`lotto_numero`** in scarico magazzino o nel flusso di accettazione — senza questo, ogni DdC è incompleta su un requisito Allegato XIII (Critico A)
2. **Riconciliare Dashboard e Scadenzario** su un'unica fonte di verità per i crediti clienti (Critico B)
3. Fix login WCAG (`--ua-t2`/`--ua-t3` in `globals.css:245-246`) — 2 minuti, sistema anche forgot-password/reset-password/billing/blocked in un colpo
4. Ripristinare un link funzionante a "Invita tecnico"
5. Collegare il download DdC/buono dal portale dentista (o rimuovere la promessa dal messaggio WhatsApp finché non è pronto)

### Prossimo sprint
6. Validazione type-safe reale nei generatori PDF (non solo `eslint-disable`)
7. Fix 5 link CRUD 404, endpoint `/api/fornitori` mancante, navigabilità lista pazienti
8. Push notification anche per nuova assegnazione lavoro tecnico
9. Estendere lo script di compliance DS a `.css` e alle route fuori da `(app)`, aggiungere controllo per variabili CSS non dichiarate
10. Fix query `/ordini` con RPC (segnalato invariato da due audit consecutivi)

### Prima del prossimo audit
11. Isolare l'ambiente di test E2E da quello di audit manuale/QA per evitare interferenze di sessione
12. Allineare ROADMAP-UFFICIALE.md e MEMORY.md allo stato reale del codice (logo+firma DdC già fatto; DS v2.3 non al 100%)

---

## 8. Stato Preparazione per Filippo

I fix di compliance MDR alla consegna (disinfettante, soft/hard-block) sono solidi e pronti. **Ma la scoperta sulla tracciabilità materiali/lotti è un blocker reale**: se Filippo ha già consegnato dispositivi con UÀ dopo l'ultimo deploy funzionale (5 giugno), quelle DdC hanno il campo materiali/lotti vuoto. Prima di procedere con nuove consegne o con l'onboarding di dentisti sul portale (dato che il download documenti è rotto), vanno chiusi i due Critici (A e B) di questo report.

---

*Documento generato il 2026-07-02 da sintesi di 11 report specializzati (4 dei quali ripresi dopo un errore di connessione a metà audit) su re-audit della PWA UÀ V1.9.3.*
*Nota: audit condotto in condizioni di sessione di produzione condivisa con processi E2E concorrenti — vedi sezione 0.*

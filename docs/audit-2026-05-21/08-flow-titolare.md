# Audit Flusso UX — Giornata Tipo: Titolare
**Data:** 2026-05-21 | **Versione app:** V1.5

## Overview del Flusso

Simulazione della mattina tipo lunedì di Filippo (ore 8:00-11:30):

| Step | Azione | Tap necessari | Friction | Stato |
|------|--------|--------------|----------|-------|
| 1 | Apre app (dashboard) | 1 | ✅ Fluido | ✓ |
| 2 | Legge consegne di oggi | 0 (Above-the-fold) | ✅ Visibile | ✓ |
| 3 | Riceve ordine telefonico | — | ⚠️ Switch app | — |
| 4 | Crea nuovo lavoro | 8 | 🔴 Criticità | ⚠️ |
| 5 | Assegna tecnico | 2 | ✅ Inline | ✓ |
| 6 | Verifica materiali | 3 | ⚠️ Context switch | ⚠️ |
| 7 | Controlla pagamenti | 2 | 🔴 Gap critico | ⚠️ |
| 8 | Invia WhatsApp sollecito | 2 | ✅ One-tap | ✓ |
| 9 | Genera fattura | 4+ | ⚠️ Flusso indiretto | ⚠️ |

---

## Analisi Dettagliata per Fase

### 1. Apertura App + Dashboard (ore 8:00)

Dashboard mostra above-the-fold su 390px (mobile):
- KPI sezione con fatturato settimana
- 4 consegne di oggi (ordinate: PRONTO prima)
- 2 lavori in ritardo (rosso urgente)
- Top 3 pagamenti scaduti (color-coded per urgenza)
- Materiali in esaurimento
- Segnalazioni aperte

**Friction:**
- Cache KPI scade ogni 30 min — Filippo potrebbe vedere dati "stantii"
- Dashboard lunga ~800px su 390px — richiede 4 scroll per vedere tutto

---

### 2. Creazione Nuovo Lavoro (ore 8:30 — Dr. Rossi chiama)

**Scenario:** "Corona su impianto urgente, consegna venerdì."

**Tap sequence:**
1. Tap "Nuovo" button → `/lavori/nuovo`
2. Tap ClienteComboBox → search "Dr. Rossi" → 1 tap
3. Tap Tipo dispositivo → select "implantologia" → 1 tap
4. Tap Descrizione → type → 1 tap
5. Tap Data consegna → datepicker → 1 tap
6. Tap Priorità → "urgente" → 1 tap
7. Navigate Tab "Accettazione" → read-only → 0 tap
8. Tap "Crea lavoro" → 1 tap

**TOTALE: 8 tap**

**Friction:**
- Cliente non viene ricordato — ogni volta ricerca da zero (anche cliente frequente)
- Richiedente non obbligatorio → rischio MDR traceability
- Tab Accettazione aggiunge step senza valore in creazione (solo read-only)

---

### 3. Assegnazione Tecnico (ore 8:35)

Dettaglio lavoro → Tab Produzione → Combobox tecnico → 2 tap.

**NESSUN FRICTION** ✅

---

### 4. Verifica Materiali (ore 8:40)

**Problema:** Per sapere se c'è abbastanza zirconio, Filippo deve:
1. Uscire da lavoro → `/magazzino`
2. Search bar "zirconio"
3. Filtra 500 articoli lato client
4. Tap articolo → scorta_attuale=2, scorta_minima=10 → ESAURITO

**TOTALE: 4 tap + context switch**

Il precheck materiali esiste solo al momento della consegna (`/api/lavori/[id]/precheck-materiali`), non in fase di planning. Filippo scopre il problema 3 giorni dopo.

---

### 5. Scadenzario + Sollecito (ore 10:30)

**Scenario:** Dr. Bianchi non paga da 62 giorni (€2.145).

1. Tap `/scadenzario` → lista clienti insoluti color-coded (🔴 >60gg, 🟡 30-60gg)
2. Tap card Dr. Bianchi → espande con fatture
3. Tap link WhatsApp → apre con template pre-compilato

**TOTALE: 2 tap** ✅ Eccellente

---

### 6. Generazione Fattura (ore 11:00)

**Problema fondamentale:** Le fatture si generano IMPLICITAMENTE durante la consegna (RPC automatico), non da `/fatture`. Filippo apre `/fatture`, vede lista vuota, non capisce.

**Sequenza attuale:**
1. Tap `/fatture` → vede banner "vai su un lavoro → Consegna"
2. Tap `/lavori` → filtra per "consegnato"
3. Tap singolo lavoro → ConsegnaButton (già cliccato, stato success)
4. Scroll fino a sezione fatture → vede PDF/XML
5. Repeat per ogni lavoro

**TOTALE: 6+ tap + context switch** per ogni singola fattura

Nessuna fatturazione batch disponibile.

---

## Friction Points Critici 🔴

### 🔴 #1: Cache KPI non auto-aggiorna
Dashboard mostra dati delle 8:00 alle 8:45. Nessun button "Aggiorna ora".

### 🔴 #2: Form nuovo lavoro non ricorda ultimo cliente
Ogni volta ricerca cliente da zero — +15% tempo per clienti frequenti.

### 🔴 #3: Verifica materiali richiede context switch
Non c'è Tab "Materiali richiesti" nel dettaglio lavoro. Filippodeve navigare al magazzino globale.

### 🔴 #4: Richiedente non obbligatorio
Nessun errore se non si specifica chi ha ordinato. Rischio MDR Allegato XIII.

### 🔴 #5: Fattura "nascosta" fino a consegna
La logica è corretta (automatica) ma controintuitiva. Filippo pensa di non aver fatturato.

---

## Quick Wins ✅

| QW | Descrizione | Effort | Impact |
|----|-------------|--------|--------|
| QW1 | Button "Aggiorna KPI" in dashboard | 5 min | +confidence dati |
| QW2 | Precompilare ultimo cliente in form nuovo (localStorage) | 8 min | -15% tempo |
| QW3 | Richiedente REQUIRED se studio ha >1 medico | 10 min | +compliance |
| QW4 | Section "Pronti da fatturare" nel dashboard con count | 15 min | -confusion |
| QW5 | Tab "Materiali richiesti" in dettaglio lavoro con precheck | 45 min | -3 tap |

---

## Score Flusso Titolare: 6.5/10

| Fase | Score | Note |
|------|-------|------|
| Dashboard | 7/10 | KPI visibili ma cache stale |
| Nuovo lavoro | 5/10 | 8 tap, cliente non ricordato |
| Assegnazione tecnico | 9/10 | Fast, inline ✅ |
| Verifica materiali | 4/10 | Context switch obbligatorio |
| Scadenzario | 9/10 | WhatsApp one-tap ✅ |
| Fatturazione | 6/10 | Flusso indiretto, fattura "hidden" |

**Comparazione DentalMaster:** DentalMaster = 5 tap per nuovo lavoro. UÀ = 8 tap (+3 per Tab MDR Accettazione, trade-off compliance vs speed accettabile).

---

*Audit completato il 21 maggio 2026*

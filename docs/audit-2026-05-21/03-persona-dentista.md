# Audit — Prospettiva: Medico Dentista Esterno
**Data:** 2026-05-21 | **Versione app:** V1.5 | **Analista:** Esterno (Frame di un clinico Napoli)

---

## Sommario Esecutivo

UÀ è una **PWA per laboratori odontotecnici** costruita interamente attorno al flusso di lavoro del laboratorista. Il portale per il dentista esterno esiste (`/portale/[token]`) ma è **minimalista, read-only e asincrono**: vedi i tuoi lavori, ma non c'è modo di interagire in tempo reale.

**Dal punto di vista di un clinico che manda lavori ogni settimana al laboratorio:**
- ✅ **Sì**, esiste un portale dove vedo lo stato dei lavori
- ✅ **Sì**, ricevo WhatsApp quando il lavoro è pronto  
- ✅ **Sì**, posso fare richieste online (`/richiedi/[token]`)
- ❌ **No**, non posso cercare i miei pazienti online (assente totalmente)
- ❌ **No**, non ho una dashboard con metriche (SLA, costi, trend)
- ❌ **No**, non c'è integrazione con la mia agenda/software gestionale
- ❌ **No**, il flusso comunicativo è ancora principalmente **telefonico/WhatsApp manuale**

**Verdict:** UÀ è uno strumento di visibilità passiva per il dentista, non un'estensione del suo flusso operativo. Perché un clinico moderno la userebbe al posto di una telefonata?

---

## Punti di Forza ✅

### 1. **Portale Dentista Funziona (Baseline OK)**
- **File:** `/src/app/portale/[token]/page.tsx`
- **Cosa fa:** 
  - Mostra lavori aperti vs. consegnati
  - Minimizza i dati sensibili del paziente (PHI minimizzata: "R. MARIO" invece di "ROSSI MARIO")
  - TTL token: portale scade automaticamente (`portale_token_scade_at`)
  - Audit log accesso (IP tracciato in `portale_accessi`)
  - Mostra tracking spedizione se presente
  
**Buono:** È GDPR-compliant e non espone dati clinici inutilmente.

### 2. **Notifica WhatsApp Intelligente (Ma Implementazione Parziale)**
- **File:** `/src/lib/consegna/whatsapp-template.ts`
- **Cosa fa:**
  - Quando il lavoro è marcato "pronto", il laboratorio genera un link WhatsApp con il numero lavoro
  - **Zero dati personali nel messaggio** (solo "#NUM_LAVORO" + link portale token)
  - Link diretto `wa.me/[TELEFONO]?text=...` apre WhatsApp automaticamente
  
**Limite:** È un "fire-and-forget" — il laboratorio deve premere un bottone manualmente. Non è integrato in notifiche push o email.

### 3. **Form Richiesta Lavoro Online (Accettabile)**
- **File:** `/src/app/richiedi/[token]/page.tsx` + `/src/components/features/portale/RichiestaClientForm.tsx`
- **Cosa fa:**
  - Dentista accede a link privato
  - Riempi tipo dispositivo, codice paziente (non nome!), data consegna, note cliniche
  - Invia → laboratorio riceve la richiesta
  - Success screen con numero pratica
  
**Buono:** Asincrono, non richiede call. **Limite:** Nessuna conferma di ricezione in tempo reale — "Ti contatteranno per la conferma" (torna il telefono).

### 4. **Design System Coerente (v2.2)**
- Palette warm beige, tipografia DM Sans
- Responsive mobile-first
- Accessibilità base (label, ARIA, color contrast)
- **Per il dentista:** UI pulita, leggibile, non complessa.

### 5. **Gestione del Ciclo Consegna Robusto (Ma Lato Lab)**
- **File:** `/src/lib/consegna/orchestrate.ts`
- Generazione automatica DDC (Dichiarazione Conformità MDR)
- Generazione buono consegna  
- Fatturazione automatica (FatturaPA/SDI)
- Auto-scarico materiali dal magazzino
  
**Per il dentista:** Significa che quando riceve il WhatsApp, il lab ha già generato tutta la documentazione MDR. **Buono dal lato compliance, trasparente per il clinico.**

---

## Gap Critici per il Clinico 🔴

### 1. **Assenza Totale di Ricezione Lavoro — Zero Conferma**
**Problema Core:** Il dentista manda un lavoro al laboratorio, ma non sa se è stato ricevuto.

- Manda impronta via corriere
- La richiesta online (`/richiedi/[token]`) è "fire-and-forget"
- Non c'è email di conferma
- Non c'è SMS
- Non c'è notifica push
- Il portale non mostra il lavoro fino a quando il lab non lo carica (può essere giorni)

**Scenario Reale:** "Ho mandato la corona lunedì, ma il lab non l'ha ancora caricata nel sistema. Non so se l'hanno persa o stanno aspettando altro."

**Codice Rilevante:** 
```typescript
// /src/components/features/portale/RichiestaClientForm.tsx, line 208-209
<p>Ti contatteranno per la conferma.</p>
```
Il tono lo dice tutto: il digitale è secondario.

---

### 2. **Nessun Tracciamento Stato in Tempo Reale**
**Cosa vede il dentista sul portale:**
- Stato lavoro: uno di questi → `ricevuto | in_lavorazione | in_prova | pronto | consegnato | annullato | sospeso | in_ritardo`
- Data consegna prevista
- Tracking spedizione (se il lab la abilita)

**Cosa NON vede:**
- Quando è stata effettivamente ricevuta la richiesta
- Quale tecnico sta lavorando
- Dove è il lavoro nel flusso (le "fasi" sono visibili solo al lab, non al clinico)
- Foto di progress (il lab le carica, ma non vengono esportate al portale)
- Notifiche push quando lo stato cambia

**Codice:** `/src/app/portale/[token]/page.tsx` carica solo:
```typescript
id, numero_lavoro, stato, tipo_dispositivo, descrizione,
data_consegna_prevista, data_consegna_effettiva,
paziente_nome_snapshot, conformato, spedizione_stato, spedizione_tracking
```
Niente timestamp di ricezione, niente foto, niente storico stati.

---

### 3. **Impossibile Cercare i Propri Pazienti Online**
**Problema:** Il dentista non ha una lista dei pazienti che ha in cura presso il laboratorio.

**Cosa accade in pratica:**
- Crea un nuovo lavoro on-site (il portale è read-only per richieste)
- Usa `/richiedi/[token]` per inviare la richiesta
- Manda il codice paziente (es. "MR-2026" — pseudonimizzato per GDPR)
- Ma non può vedere "ho 15 pazienti con il lab" o "quale lavoro aspetto da questo paziente?"

**Codice:** Non esiste `/portale/[token]/pazienti` o simile. Il portale è solo lavori.

**Impatto Competitivo:** Un clinico moderno vorrebbe almeno una lista tipo:
```
PAZIENTE          | LAVORO         | STATO      | CONSEGNA
Mr. A            | #2026-001      | In prova   | 24 mag
Ms. B (3 lavori) | #2026-005      | Pronto     | 22 mag
                 | #2026-015      | Ricevuto   | 28 mag
```

---

### 4. **Nessun Dashboard Clinico — Zero KPI Visibili**
Il portale mostra lavori sì, ma non mostra:
- **SLA rispettati:** Su 50 lavori, quanti sono stati consegnati entro la data prevista?
- **Costi per tipo:** Quanto ho speso in protesi fissa vs. implantologia questo mese?
- **Trend:** Numero medio di giorni lavorazione per categoria
- **Problema:** In caso di dubbio sulla qualità/prezzo, il dentista non ha dati per negoziare

**Codice:** `/src/app/(app)/analytics/page.tsx` esiste, ma è **solo per il laboratorio**, non esposta al clinico.

---

### 5. **Comunicazione Ancora Telefonica/WhatsApp Manuale**
**Flusso Reale (Oggi):**
1. Dentista: "Ciao, la corona di Rossi è pronta?"
2. Lab: "Sì, è qui. Te la spedisco domani"
3. Dentista: "Mi serve lunedì, puoi farmi un favor..."
4. Lab: "Ok ok, vediamo. Ti mando il numero tracking"

**Flusso con UÀ:**
1. Dentista: Accede al portale → vede "PRONTO" per il lavoro #2026-001
2. Lab: Clicca "Consegna" → genera PDF + manda WhatsApp con link portale
3. Dentista: Riceve WhatsApp → scarica la DDC dal portale

**Problema:** Il laboratorio deve **ricordarsi manualmente** di mandare il WhatsApp. Se lo dimentica, il dentista non sa che è pronto.

**Codice:**
```typescript
// src/components/features/lavori/ConsegnaButton.tsx (linea 57+)
// Bottone manuale "CONSEGNA" che il lab deve premere
// Non c'è automazione: niente polling, niente notifica schedulata
```

---

### 6. **Zero Integrazione con Software Gestionale Clinico**
Assenza totale di:
- **API pubblica per clinici** (solo API interne lab)
- **Webhook** per sincronizzare lavori con Dentaruzzo/Odontoiatrico/Sidoc
- **Esportazione dati** (CSV, Excel)
- **Calendar sync** (iCal, Google Calendar)

**Impatto:** Se il dentista usa un software gestionale separato, deve mantenere due fonti di verità.

---

## Funzionalità Presenti ma Migliorabili 🟠

### 1. **Portale Lettura Lavori (Troppo Minimalista)**
**Attualmente:** Card lista lavori aperti + ultimi consegnati.

**Manca:**
- Filtri (per stato, per tecnico assegnato, per data consegna)
- Ordinamento (per data, per priorità, per stato)
- Ricerca (per numero lavoro, per paziente pseudonimizzato)
- Dettaglio cliccabile (fare click su una card mostra timeline completa?)

**Codice:** `/src/app/portale/[token]/page.tsx` linea 415-457 — la lista è statica, niente interattività.

### 2. **Richiesta Lavoro (Usabilità OK, ma No Feedback)**
**Attualmente:** Form con validazione client-side decente.

**Manca:**
- Conferma di ricezione via email (non c'è)
- Numero pratica via email (esiste solo nello screen di successo)
- Cronologia richieste (dentista non vede più cosa ha richiesto)
- Modifica/cancellazione richiesta (impossibile)

**Codice:** `/src/components/features/portale/RichiestaClientForm.tsx` — form puro, niente state management post-submit.

### 3. **Tracciamento Spedizione (Presente ma Non Visibile per Default)**
**Attualmente:** Se il lab abilita spedizione, il portale mostra tracking.

```typescript
// /src/app/portale/[token]/page.tsx linea 151-170
{lavoro.spedizione_stato && lavoro.spedizione_tracking && (
  <div style={{...}}>
    Tracking: {lavoro.spedizione_tracking}
  </div>
)}
```

**Limite:** Se il lab dimentica di inserire il tracking, il clinico non vede nulla. E molti laboratori non usano spedizione tracciata.

### 4. **Documentazione MDR (Accessibile ma Non Cercabile)**
**Attualmente:** DDC e buono si scaricano quando il lavoro è "consegnato".

**Manca:**
- Archive dei PDF consegnati (dopo 6 mesi, i PDF scadono?)
- Download in bulk
- Organizzazione per anno/trimestre

**Codice:** La download è nel WhatsApp link o nel portale, ma non esiste una "dashboard documenti" storica.

---

## Opportunità di Differenziazione 🟡

### 1. **Portale Clinico Completo (Dashboard + Analitics)**
**Cosa potrebbe aggiungere UÀ per differenziarsi da SMS/tel:**
- Dashboard KPI: SLA, costi, trend per categoria
- Export dati: CV lavori mensili per clinico
- Billing preview: prima di ricevere la fattura SDI, vedi il sommario
- Comunicazione diretta: chat in-app con il lab (no WhatsApp)

**Priorità:** ALTA — è il modo per fare stickiness.

### 2. **Notifiche Proattive**
- Email quando lavoro passa a "in_prova"
- Notifica push se data consegna a rischio ("entro domani o in ritardo")
- SMS per SLA critici
- Reminder: "il tuo lavoro è in coda da 3 giorni"

**Priorità:** MEDIA — aumenta engagement senza costi grossi.

### 3. **API Pubblica per Clinici**
- `/api/clinic/[token]/jobs` → lista lavori JSON
- `/api/clinic/[token]/jobs/[id]/documents` → accesso PDFs
- `/api/clinic/[token]/patients` → lista pazienti (pseudonimizzata)
- Webhooks per cambi stato

**Priorità:** MEDIA-BASSA — richiede governance ma apre integrazioni.

### 4. **Richiesta Lavoro Asincrona Confermata**
- Dentista invia richiesta
- Sistema auto-genera numero pratica
- **Confermata via email in 5 minuti** con allegato ricevuta
- Lab ha 24h per confermare ricezione della impronta fisica

**Priorità:** ALTA — è quello che manca di più.

---

## Il Portale Dentista — Analisi Dettagliata

### **Struttura Tecnica**
- **Route:** `/portale/[token]`
- **Auth:** Token OPACO memorizzato in `clienti.portale_token` con TTL
- **Pagina:** Server-side rendered (SSR) — carica tutto il contenuto al load
- **DB Query:** Leggera (1 query clienti + 2 query lavori)
- **Performance:** Buono, niente loading skeleton

### **Cosa Funziona (Really)**
1. ✅ Accesso via link privato (no login, no password)
2. ✅ Vedi lavori aperti + ultimi consegnati
3. ✅ Stato aggiornato in tempo reale (ogni accesso al portale rilegge il DB)
4. ✅ Scarica DDC + buono quando consegnato
5. ✅ Mostra tracking spedizione se presente
6. ✅ GDPR-compliant: nome paziente minimizzato

### **Cosa Non Funziona**
1. ❌ **Zero notifiche:** Accedi al portale manualmente
2. ❌ **Niente search/filter:** Lista statica, ordine fisso
3. ❌ **Niente dettaglio:** Clicca su una card, cosa vedi? (Code dice: niente, è solo una card display)
4. ❌ **Niente storico:** Lavori consegnati > 30 giorni scompaiono
5. ❌ **Niente contesto:** Non sai a chi appartiene il laboratorio, non puoi contattare il tecnico

### **TTL Token & Scadenza**
```typescript
// /src/app/portale/[token]/page.tsx linea 261-265
const tokenScadenza = cliente.portale_token_scade_at
if (tokenScadenza && new Date(tokenScadenza) < new Date()) {
  return <LinkScaduto />
}
```
**Default TTL:** Non è chiaro dal codice. Probabilmente infinito finché il lab non lo revoca.

---

## Raccomandazioni per V2 (Esperienza Clinico)

### **Sprint 1: Notifiche Base (Costo: BASSO, Impatto: ALTO)**
1. Email quando lavoro passa a stato "pronto"
2. Email con allegato DDC + buono quando consegnato
3. SMS reminder se in_ritardo > 2 giorni

```
Cost: +$50/mese (SendGrid + Twilio base)
Tempo: 1 sprint
```

### **Sprint 2: Dashboard Portale Clinico (Costo: MEDIO, Impatto: ALTO)**
1. Aggiungi `/portale/[token]/dashboard`
2. Card KPI: lavori totali, in prova, pronti, SLA realizzato (%)
3. Tabella storica ultimi 30 lavori (filtri: stato, tecnico, data)
4. Export CSV mensile

```
Cost: Frontend ~40 ore
Tempo: 2 sprint
```

### **Sprint 3: Richiesta Confermata (Costo: MEDIO, Impatto: ALTO)**
1. Quando dentista invia `/richiedi/[token]`, auto-generiamo ricevuta
2. Email in 5 min con numero pratica + checkbox "impronta ricevuta" per lab
3. Lab vede richiesta in `/lavori/nuove-richieste` con status "in_attesa_ricezione"

```
Cost: +2 RPC Postgres, email template
Tempo: 1 sprint
```

### **Sprint 4: Chat In-App Clinic-Lab (Costo: ALTO, Impatto: MEDIO)**
1. Aggiungi Realtime channel per ogni cliente
2. Lab può mandare messaggi dal dettaglio lavoro
3. Clinico riceve notifica push in portale

```
Cost: Feature complessa (Supabase Realtime + UI)
Tempo: 3+ sprint
```

### **Sprint 5: API Pubblica (Costo: MEDIO-ALTO, Impatto: MEDIO)**
1. Documenta `/api/clinic/[token]/jobs` (GET)
2. Aggiungi webhook subscriptions per state changes
3. Rate limiting + logging

```
Cost: API design, rate limiting middleware
Tempo: 2 sprint
```

---

## Cosa Si Aspetta un Clinico Moderno

Un dentista con software gestionale moderno (Dentaruzzo, Sidoc, ecc.) si aspetta:

| Feature | UÀ Oggi | Standard Settore |
|---------|---------|-----------------|
| **Richiesta lavoro online** | ✅ (via `/richiedi/[token]`) | ✅ Tutti |
| **Tracciamento stato** | ✅ (portale read-only) | ✅ Tutti |
| **Ricevuta ricezione digitale** | ❌ | ✅ Tutti |
| **Notifiche cambio stato** | ❌ | ✅ Tutti |
| **Dashboard SLA/costi** | ❌ | ✅ I leader |
| **Scarico documenti in bulk** | ❌ | ✅ I leader |
| **Chat diretta con lab** | ❌ | ⚠️ In crescita |
| **API integrazione** | ❌ | ✅ I leader |
| **Fatturazione preview** | ❌ | ⚠️ Solo B2B |

**Verdict:** UÀ è al livello "basic" — il minimo per non far tornare indietro il dentista al telefono, ma non è "sticky".

---

## Gap di Comunicazione & UX

### **Problema Principale: Asincronia Non Gestita**
Il portale assume che il dentista **acceda proattivamente**. Ma:
- Dentista manda impronta lunedì mattina
- Lab riceve impronta, ma non carica il lavoro nel sistema fino a mercoledì
- Dentista non sa se è stato perso o è in coda
- Chiama il lab: "Avete ricevuto?"
- Lab: "Certo, è qui, è in lavorazione"
- Dentista: *perché non me l'ha detto il sistema?*

**Soluzione:** Push notification + email, non pull-only via portale.

---

## Score Complessivo

| Area | Score | Note |
|------|-------|------|
| **Visualizzazione lavori** | 6/10 | Funziona, ma minimalista |
| **Tracciamento stato** | 5/10 | No timestamps, no history |
| **Richiesta online** | 7/10 | Form buono, ma no conferma |
| **Documentazione** | 7/10 | Accesso a DDC ok, ma no archive |
| **Notifiche** | 2/10 | Solo WhatsApp manuale da lab |
| **Dashboard analytics** | 0/10 | Non esiste per clinico |
| **Integrazioni** | 0/10 | Zero API pubblica |
| **Mobile UX** | 8/10 | Design v2.2 bello e usabile |

### **SCORE COMPLESSIVO: 5/10**

**Giudizio:** UÀ portale funziona come "visualizzatore" ma non come "sistema operativo" per il dentista. È uno step avanti rispetto a niente, ma indietro rispetto a sistemi B2B maturi (es. Cribeo per dentisti, o i portali clinic di grandi lab internazionali).

**Rischio competitivo:** Se un laboratore concorrente aggiunge dashboard SLA + notifiche push, il dentista si sposta.

---

## Conclusione: Come Vende Questo?

Se io fossi Francesco (founder) e visitassi uno studio dentistico a Napoli:

**Francesco:** "Con UÀ puoi vedere i tuoi lavori online dal portale, ricevi una notifica WhatsApp quando sono pronti, e puoi fare richieste senza telefonare."

**Dentista:** "Bellissimo. Ma io continuo a telefonare perché..."
- Non vedo quando è arrivata la mia impronta
- Non so se è perso o è in coda
- Non vedo foto di progress
- Non so quanto sto spendendo in media per paziente
- E se mi serve una modifica urgente, non posso comunicare in chat

**Francesco (idea per V2):** "Capito. Intanto aggiungo:
1. Email quando ricevi la richiesta + numero pratica
2. Notifica email quando il lavoro passa a 'pronto'
3. Dashboard dove vedi i tuoi SLA"

**Dentista:** "Ok, questo sì mi serve. Quando lo fate?"

---

## Implementazione Prioritaria (Roadmap Suggerita)

### **Q3 2026 — MVP Clinico (No Brainer)**
```
- Email di ricezione richiesta [1 sprint]
- Email lavoro pronto [1 sprint]
- Tabella storica lavori nel portale [2 sprint]
```
**Cost:** ~150h | **Impatto:** Va da 5/10 a 6.5/10

### **Q4 2026 — Stickiness Features**
```
- Dashboard KPI (SLA %, costi medi) [2 sprint]
- SMS reminder se in ritardo [1 sprint]
- Ricerca/filtri portale [1 sprint]
```
**Cost:** ~200h | **Impatto:** Va da 6.5/10 a 7.5/10

### **Q1 2027 — Differenziazione**
```
- API pubblica base [2 sprint]
- Chat in-app [3 sprint]
```
**Cost:** ~250h | **Impatto:** Va da 7.5/10 a 8.5/10

---

**Redatto:** 2026-05-21 | **Tempo analisi:** ~45 minuti | **Fonti:** Code audit codebase, UX walkthrough portale, DB schema review

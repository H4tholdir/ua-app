# Dashboard V2 — Decisioni Approvate (sessione 22/05/2026)

**Approvato da Francesco Formicola — 22 maggio 2026**
**Non modificare senza nuova sessione di revisione con Francesco.**

---

## 1. Filosofia operativa — la domanda fondamentale

> "Cosa faccio ADESSO?"

La dashboard deve rispondere in 3 secondi, senza cognitive load. Regola dei 60 secondi: l'odontotecnico >55 anni deve completare l'azione principale senza manuale.

---

## 2. Separazione Gestione / Produzione — DECISIONE CHIAVE

### Gestione (Business View)
Risponde a: "Com'è il laboratorio?"
- KPI 2×2: Da consegnare, In ritardo, Da fatturare, Materiali esauriti
- Urgenze Lab: top 3 pagamenti scaduti (NON la lista completa)
- Mini-chart fatturato mensile
- Materiali in esaurimento con progress bar

### Produzione (Operational View)
Risponde a: "Cosa faccio adesso al banco?"
- SpotlightCard se c'è un blocco/urgenza
- Task list I miei lavori con progress bar reale da lavori_fasi
- Ordine: blocchi → in ritardo → urgenti → per scadenza

### Quando appaiono i tab Gestione/Produzione?
- **Solo** per utenti ibridi (ruolo=titolare E record in tabella `tecnici`)
- Un titolare puro vede un'unica vista con entrambe le sezioni
- Default tab: **Produzione** (operativo, non business)

---

## 3. Layout per viewport

### Mobile 390px — single column
```
Header (lab name | sync badge | avatar)
Greeting (Playfair 22px, data 11px)
[Role tabs SE ibrido]
SpotlightCard (se urgenza)
KPI Grid 2×2
Urgenze Lab (3 righe)
Consegne oggi (empty state se 0)
Materiali in esaurimento
Fatturato mensile (semplificato)
Bottom Nav Pill (sticky)
```

### Tablet 768px
- KPI: 4 in riga (`grid-template-columns: repeat(4, 1fr)`)
- Playfair Display 42px per i numeri
- Task list: 2 colonne
- Nav pill: visibile con tab aggiuntivo

### Desktop 1280px — SEMPRE 2 colonne per titolare
```
Colonna sinistra — Produzione
  Header full-width (sopra entrambe le colonne)
  SpotlightCard orizzontale (compact)
  "I miei lavori" + task list verticale

Colonna destra — Gestione
  Label "Gestione Lab"
  KPI 2×2 (Playfair 44px)
  Urgenze Lab top 3
  Fatturato mensile
```
**Nav pill: visibile in basso come barra full-width (NON nascosta)**

---

## 4. SpotlightCard — regole

- Appare SOLO se esiste urgenza (segnalazione_risolta=false O lavoro in_ritardo urgente)
- **Priorità**: segnalazione bloccante > in_ritardo urgente > in_ritardo normale
- Se nessuna urgenza: non si mostra, si va direttamente alla KPI grid
- NO placeholder vuoto al suo posto
- `data_consegna_prevista` è opzionale (non sempre disponibile da segnalazione)

---

## 5. KPI Cards — regole

- Valore 0: colore `var(--t2)` grigio, non cliccabile, nessun chevron
- Valore >0: cliccabile come Link Next.js, chevron `›` top-right, feedback pressed scale(.95)
- **Colori semantici**: in ritardo=red, da fatturare=gold, materiali=grey, consegne=blue INFO
- Nessuna strip orizzontale scrollabile — solo grid 2×2

---

## 6. Tipografia — DS v2.2

- **KPI numeri**: Playfair Display, weight 300, 38px mobile / 42px tablet / 44px desktop
- **Titoli sezione**: DM Sans 700, 11px, uppercase, `var(--t3)`
- **Testo operativo**: DM Sans 400, 13-14px
- **Label metadata**: DM Sans 500-600, 10-11px
- **MAI Inter** — sempre DM Sans per UI
- **Touch target**: min 52×52px su ogni elemento interattivo

---

## 7. Dark mode — regole assolute

- Background: `#1A1916` (carbonio warm, NON `#1E1E1E` neutro)
- Surface: `#222019`
- Testo: `#F0EDE8` avorio (NON `#CCC` o `#DDD`)
- Rosso dark: `#E8001A` (+9% luminosità vs `#D90012` light)
- **Zero border come sostituto ombre** — solo le ombre fanno il lavoro di separazione
- Border: `rgba(255,255,255,.06)` (invertito rispetto al light `rgba(0,0,0,.06)`)
- Ombre dark molto più pesanti: `.52-.60` opacity su black shadow

---

## 8. Bottom Nav Pill — funzionalità IMMEDIATE

- **Tooltip permanente** "Nuovo lavoro" sul FAB (+) — sempre visibile, non solo hover
- **Long press 500ms** → editMode (outline tratteggiata rosso 30%)
- **Drag & drop** in editMode (ordine tab)
- **Pin** tab → badge 📌 visibile + persistenza localStorage + DB nav_preferences
- **Tab "Altro"**: apre bottom sheet con tutte le pagine non in nav principale
- **Desktop**: barra orizzontale in basso, FAB diventa tasto "+" testo

---

## 9. SyncBadge (sostituisce LIVE)

- Verde: online + dati aggiornati (<5 min)
- Arancio: online ma stale (>5 min)
- Rosso: offline, testo "Offline"
- Aggiornamento ogni 30s via setInterval
- Posizione: header, accanto all'avatar

---

## 10. Cosa NON deve apparire

- ❌ Strip KPI orizzontale scrollabile (vecchio pattern)
- ❌ Pagamenti scaduti con totale e lista completa → sostituiti da "Urgenze Lab" top 3
- ❌ "In prova rientro" come sezione separata nel titolare → integrato in task list
- ❌ Hardcoded 84% puntualità → mostra "—" se non calcolato
- ❌ completamento_perc = 0 hardcoded → calcolato da lavori_fasi.eseguita_at
- ❌ Dark mode neutra `#1E1E1E` → sempre `#1A1916` warm

---

---

## 12. Revisioni sessione 23/05/2026 — Feedback Francesco

### 12.1 Header non copre contenuto in scroll
Header sticky con `position: sticky; top: 0; z-index: 40` + il main content ha `padding-top` adeguato. L'header non è fixed-overlay — scorre con la pagina ma rimane visible al top.

### 12.2 KPI Grid: filtri visivi in-page (NON navigate)
Le KPI card NON navigano a una pagina diversa. Premendo un KPI:
- Il KPI appare "pressato" visivamente (shadow inset, transform scale down leggermente)
- La sezione lavori sotto si filtra per mostrare solo quelli rilevanti
- Secondo tap: il KPI si "stappa", filtro rimosso
- Gli elementi filtrati, se toccati, navigano al dettaglio lavoro

Implementazione: `const [activeFilter, setActiveFilter] = useState<'ritardo'|'consegne'|'fatturare'|'materiali'|null>(null)`

### 12.3 Colori semantici riorganizzati
- **Da consegnare oggi** (azione immediata): `var(--primary, #D90012)` rosso
- **In ritardo** (attenzione urgente): `var(--warning, #B45309)` ambra/arancio
- **Da fatturare** (valore economico): `var(--gold, #D4A843)` oro
- **Materiali esauriti** (gestione/manutenzione): `var(--t2, #96918D)` grigio

### 12.4 Sezione "Crediti da riscuotere" (ex Urgenze Lab)
Nome cambiato: "Crediti da riscuotere" — più chiaro.
Struttura:
- Totale aggregato (€ tot, N clienti)
- Top 3 clienti con importo e CTA "Contatta" 
- Footer: "Vedi tutti →"

### 12.5 Tooltip FAB: non fisso
Il tooltip "Nuovo lavoro" appare solo:
- Prima apertura dell'app (localStorage flag `ua-tooltip-fab-shown`)
- Scompare dopo 3 secondi
- Su hover desktop (se non già visto)
Dopo la prima visualizzazione: non appare più. L'utente ha già imparato il gesto.

### 12.6 Zero emoji — solo icone SVG
Nessuna emoji nell'UI operativa. I tab "Gestione" e "Produzione" usano icone SVG neumorphiche. Le fasi lavoro usano colori + testo.

### 12.7 Default ibrido — titolare vede sempre i tab
Tutti i titolari vedono i tab Gestione/Produzione per default.
"Titolare puro" è opt-in esplicito in /impostazioni → flag `utenti.preferenza_dashboard = 'gestione_solo'`.
Logica: `if (ruolo === 'titolare' && preferenza !== 'gestione_solo') → mostra tab ibrido`.

---

## 11. Mockup approvato

File: `docs/design/mockups/2026-05-23-dashboard-titolare-v2.html`
Screenshot: `docs/design/mockups/screenshots/2026-05-23-dashboard-titolare-v2-mockup.png`

**Data approvazione**: DA COMPILARE dopo revisione sessione 23/05/2026

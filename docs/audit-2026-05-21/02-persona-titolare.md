# Audit — Prospettiva: Titolare di Laboratorio Odontotecnico
**Data:** 21 maggio 2026 | **Versione app:** V1.5 | **Codebase:** `ua-app`

---

## Sommario Esecutivo

UÀ è una **PWA solida e funzionale** orientata al controllo operativo quotidiano di un laboratorio odontotecnico. L'architettura è pulita (Next.js 16, TypeScript, Supabase), il design system è coerente (warm panna v2.2), e la maggior parte dei flussi critici sono implementati. Tuttavia, dal punto di vista di un titolare che gestisce €170k/anno di fatturato con 4 tecnici, emergono **gap significativi** nella visibilità del business, nella praticità della fatturazione, e nella gestione dei dati sensibili (margini, compensi, scadenzario).

**Valutazione complessiva: 6.5/10** — L'app funziona per "gestire il caos quotidiano", ma non è ancora uno strumento strategico che un imprenditore userebbe con piena fiducia per tutte le decisioni critiche.

---

## Punti di Forza ✅

### 1. Dashboard OGGI ben strutturata (DashboardTitolare)
- Segnalazioni intelligenti: consegne oggi, lavori in ritardo, materiali in esaurimento, prove in corso, pagamenti scaduti (KPI Strip visibile above the fold)
- Segnalazioni problema tecnici/front desk con link al lavoro — permette tracciamento issue end-to-end
- Aggiornamento KPI cache con timestamp sincronizzazione visibile
- Ordinamento intelligente: lavori pronti prima degli altri nella sezione consegne
- 3 view separate per ruolo: titolare/tecnico/front desk — evita informazioni irrilevanti

**Impatto business:** ✅ Il titolare sa subito cosa è urgente. È il punto di ingresso ideale.

### 2. Flusso consegna atomico (ConsegnaButton → orchestraConsegna)
- Triggerizzazione DdC + Fattura + Scarico materiali in una sola azione
- Validazione MDR pre-consegna (warning sheet su materiali insufficienti)
- Consumo automatico materiali dal listino con tracciabilità lotto
- Ricevuta di consegna PDF + Etichetta dispositivo + IFU — completo dal punto di vista MDR
- Controllo della conformità: non si può consegnare senza i dati MDR minimi compilati

**Impatto business:** ✅ Zero "dimenticanze" di fatturazione — tutto accade nel momento della consegna.

### 3. Scadenzario + Partitario clienti funzionali (Sprint S4)
- Lista insoluti con card espandibili
- API `/api/scadenzario/[cliente_id]` mostra tutte le fatture (pagate + non) per un cliente
- Bottom sheet azioni: WhatsApp sollecito diretto + segna pagata (one-tap)
- Stratificazione importo/giorni ritardo — visualizzazione chiara chi paga bene/male
- Feedback sintetico: sound + haptic al tap "Pagato"

**Impatto business:** ✅ Titolare non dimentica nessuno — sollecito WhatsApp è un game changer.

### 4. Gestione tecnici + produttività (Sprint S8)
- Dashboard produttività per tecnico: KPI hero, streak giornaliero, barre 4 mesi
- Compensi lavorazione configurabili per lavoro
- Cedolino tecnico PDF generabile (tabella riepilogativa, firma, nota legale)
- `tecnici.compenso_base` come target mensile nella progress bar

**Impatto business:** ✅ Trasparenza su chi produce quanto — fondamentale per bonus/valutazione.

### 5. Infrastruttura MDR solida
- IFU Template: 8 sezioni Allegato I §23.4, rischi residui obbligatori, GDPR-safe
- Etichetta dispositivo: A6 landscape, "DISPOSITIVO SU MISURA", ITCA bold, "Installare entro il"
- Ricevuta di consegna: sez. A fabbricante + sez. B firma prescrittore, 15 anni conservazione
- Nomina PRRC: PDF scaricabile da impostazioni
- DPA GDPR: Art.28 template per ogni cliente

**Impatto business:** ✅ Conformità MDR verificabile — riduce rischio normativo.

### 6. Ordini fornitori con link WhatsApp (Sprint S7)
- Lista ordini aperti/evasi con sheet NuovoOrdine pre-popolato
- Articoli sotto scorta minima visibili
- Stato ordine (ordinato/ricevuto/annullato/archiviato)

**Impatto business:** ✅ Ordini materiali non si dimenticano.

### 7. Design system v2.2 coerente
- Warm panna (#DDD8D3 bg, #E4DFD9 surface, #D90012 primary)
- Shadow warm-tinted dual-layer, DM Sans font, touch target ≥ 44px conforme HIG
- Mobile-first (390px primario), nessun overflow orizzontale verificato

---

## Problemi Critici 🔴

### 🔴 #1: Fatturazione NON è fluida — richiede passaggio per ogni singolo lavoro

**Descrizione:**
`/fatture` mostra il messaggio: *"Le fatture vengono generate automaticamente. Vai su un lavoro → Consegna per generare la fattura."*
Cioè: la fattura non viene creata dall'app direttamente, viene creata solo quando consegni il lavoro.

**Sequenza reale per fatturare:**
1. Titolare finisce un lavoro (stato = "pronto")
2. Va su `/fatture` per fatturarlo → non lo vede
3. Deve tornare su `/lavori`, aprire il dettaglio, trovare "Consegna"
4. Solo allora viene creata la fattura

**File:** `/src/app/(app)/fatture/page.tsx`

**Impatto business:** 🔴 CRITICO — Con 10-15 lavori/settimana, fatturare richiede 30+ tap + scroll per una settimana di lavoro. Non esiste fatturazione batch.

**Fix suggerito:**
1. Aggiungere sezione "Pronti da fatturare" su `/fatture` con card + swipe per fatturare direttamente
2. Nuova route `POST /api/fatture/batch` per fatturare N lavori in parallelo
3. Nel ConsegnaButton aggiungere tooltip esplicito "Genera fattura"

---

### 🔴 #2: Dashboard KPI — mancano dati di redditività

**Descrizione:**
Dashboard mostra: consegne, ritardi, fatturato mese. Manca completamente:
- ❌ Margine netto mese (fatturato − costi materiali − compensi tecnici)
- ❌ Giorni medi di consegna per tipo dispositivo
- ❌ % rifacimenti (is_rifacimento count vs consegne ok)
- ❌ Tasso di utilizzo tecnico (ore assegnate vs disponibili)

**File:** `/src/app/(app)/dashboard/page.tsx` — `getTitolareKpi`

**Impatto business:** 🔴 CRITICO — Un titolare non può prendere decisioni di business senza visibilità su margini. Con ~€170k fatturato e margini non tracciati, può perdere €25k/anno senza saperlo.

**Fix suggerito:**
1. Aggiungere `costo_materiali_estimated` in `listino`
2. KPI "Margine netto mese" = `fatturato − sum(costo_materiali) − sum(compensi_tecnici)`
3. Tab "Trend margini 12 mesi" su `/analytics`

---

### 🔴 #3: Compenso tecnico — campo `compenso_base` semanticamente ambiguo

**Descrizione:**
MEMORY.md segnala: ⚠️ `tecnici.compenso_base` usato come target mensile nella progress bar — confermare se è il target di commissioni o lo stipendio base fisso.

**File:** `/src/components/features/tecnici/ProduttivitaTecnico.tsx`

**Impatto business:** 🔴 CRITICO per gestione RU — Se il titolare non sa se quel numero è uno stipendio o un target commissioni, non sa quanto deve pagare il tecnico a fine mese. Rischio controversie.

**Fix suggerito:**
1. Rinominare: `tecnici.compenso_base` → `tecnici.target_commissioni_mese`
2. Aggiungere `tecnici.stipendio_mensile_netto` (fisso mensile)
3. Nel dashboard tecnico mostrare entrambi chiaramente

---

### 🔴 #4: Nessun controllo su materiali non catalogati nel BOM

**Descrizione:**
Il check `MaterialiWarningSheet` verifica solo articoli presenti in `listino_materiali_auto` (BOM dichiarato). Se una lavorazione richiede un materiale speciale non nel BOM, il sistema non lo sa e si rischia il rifacimento.

**File:** `/src/components/features/lavori/MaterialiWarningSheet.tsx`

**Impatto business:** 🔴 CRITICO — Con 5% di rifacimenti per materiali non previsti, Filippo perde ~€8.500/anno.

---

### 🔴 #5: Export dati assente — il commercialista non può lavorare

**Descrizione:**
Non esiste modo di esportare:
- ❌ Lista fatture in CSV per dichiarazione IVA
- ❌ Storico lavori per analisi trend
- ❌ Report pagamenti ricevuti
- ❌ Cedolini tecnici in batch

**Impatto business:** 🔴 CRITICO per rapporto con commercialista. Filippo deve copiare i dati a mano o fare query SQL custom.

**Fix suggerito:**
- `GET /api/fatture/export` → CSV stream
- `POST /api/tecnici/cedolini-batch` → PDF zip
- `GET /api/lavori/export-analytics` → CSV

---

## Problemi Medi 🟠

### 🟠 #6: Analytics page superficiale — solo 6 KPI statici
`/analytics` ha una griglia 2×3 senza trend storico, confronto mese precedente, top clienti, segmentazione per dispositivo. È "dumb read-only".

**Fix:** Tab Oggi/Mese/Anno + area chart 12 mesi + top 5 clienti.

### 🟠 #7: Flow prove (try-in) non testato end-to-end
Implementato ma mai testato in UI reale (MEMORY.md L:169). Il 20-40% dei lavori entra in prova.

### 🟠 #8: Portale dentista non distribuibile dall'app
Esiste `/portale/[token]` ma non c'è UI nel dettaglio cliente per generare e condividere il link via WhatsApp/Email.

### 🟠 #9: Sezione Rete non funzionale
`/rete` esiste ma non ha UI per creare reti, aggiungere sub-lab, o controllare visibilità dati inter-lab.

---

## Problemi Bassi 🟡

### 🟡 #10: Magazzino — nessun reminder ordini in ritardo
Nessun alert quando un ordine aperto supera i 7 giorni senza stato "ricevuto".

### 🟡 #11: Scadenzario — fattura scaduta non visibile inline
La card mostra solo il totale residuo. Per vedere quale fattura specifica è scaduta, bisogna aprire il dettaglio.

### 🟡 #12: Listino — prezzo per fascia non visibile nel form lavoro
Quando si aggiunge una lavorazione, non si vede quale fascia prezzo si sta applicando.

### 🟡 #13: Documentazione per il titolare inesistente
Nessun tutorial, FAQ, o guida in-app. Filippo deve chiedere a Francesco per ogni cosa.

---

## KPI e Funzionalità Business Mancanti

| Feature | Status UÀ | Priorità |
|---------|-----------|----------|
| Margine lordo per lavoro | ❌ Non implementato | V1.6 CRITICO |
| Lead time medio per tipo dispositivo | ❌ Non implementato | V1.7 |
| % rifacimenti con causa | ❌ Non implementato | V1.7 |
| Capacità produttiva tecnico (ore) | ❌ Non implementato | V2 |
| Export CSV fatture/lavori | ❌ Non implementato | V1.6 CRITICO |
| Fatturazione batch | ❌ Non implementato | V1.6 CRITICO |
| Tasso conformità MDR per lavoro | ⚠️ Parziale | V1.6 |
| Portale dentista distribuibile | ⚠️ Esiste ma non distribuibile | V1.7 |
| Analytics trend 12 mesi | ❌ Non implementato | V1.7 |
| Report per commercialista | ❌ Non implementato | V1.6 |

---

## Raccomandazioni Prioritizzate

### Fase 1 — Blockers per uso quotidiano (1 settimana)
1. **Fatturazione batch** — bottone "Fattura selezionati" + `POST /api/fatture/batch` (~4 ore)
2. **Chiarire compenso_base** — call con Filippo + migration rename (~2 ore)
3. **Export CSV fatture** — `GET /api/fatture/export` (~4 ore)

### Fase 2 — Visibilità strategica (2 settimane)
4. **Margine lordo KPI** — DB migration + queries + UI (~6 ore)
5. **Analytics avanzate** — tab + area chart 12 mesi (~8 ore)
6. **Controllo materiali custom pre-consegna** — textarea TabAccettazione + validazione (~3 ore)

### Fase 3 — Nice-to-have (1 mese)
7. Lead time analytics per tipo dispositivo
8. Tasso rifacimenti per motivo con causa
9. Documentazione/FAQ in-app `/guida`
10. Portale dentista distribuibile da dettaglio cliente

---

## Score Complessivo: 6.5/10

**Cosa funziona bene:**
- ✅ Dashboard intuitiva e ruolo-specifica
- ✅ Flusso consegna atomico (DdC + fattura + scarico materiali)
- ✅ Scadenzario pratico con sollecito WhatsApp one-tap
- ✅ Gestione tecnici con cedolino PDF
- ✅ Conformità MDR solida (IFU, etichetta, DdC, ricevuta)
- ✅ Mobile UX pulita

**Cosa manca per excellence:**
- ❌ Margini non tracciati (difetto strategico grave)
- ❌ Fatturazione non è fluida (un lavoro alla volta)
- ❌ Analytics superficiali (no trend, no insight)
- ❌ Export dati impossibile (blocca relazione con commercialista)
- ❌ Compensi tecnico semanticamente confusi
- ❌ Visibilità su lead time e rifacimenti insufficiente

**Verdict:** UÀ è pronta per l'uso quotidiano di Filippo (consegne, fatture, scadenzario, tecnici), ma non è ancora uno strumento di business completo. Per le decisioni strategiche, Filippo deve ancora ricorrere a fogli Excel.

---

*Audit completato il 21 maggio 2026*

# Audit — Prospettiva: UX Expert (RE-AUDIT di follow-up)
**Data:** 2026-07-02 | **Versione app:** V1.9.3 (Design System v2.3) | **Metodo:** Playwright live su https://uachelab.com, viewport 390px, account titolare `h4t@live.it` (lab Filippo, dataset reale: 20 clienti, 277 lavori storici) + verifica a codice per i punti non riproducibili live (empty state su liste popolate, onboarding già completato, censimento skeleton).

## Punteggio: 8.3/10 (baseline 21/05/2026: 6.8/10 — target 8.5+/10)

**Verdetto:** i due problemi critici P0 della baseline (cognitive overload da 9 tab e validazione errori generica) sono stati **sostanzialmente risolti**, con evidenza riprodotta due volte via browser reale. Il target 8.5 non è ancora raggiunto perché un problema medio della baseline (CTA che sparisce durante lo scroll) **non è stato toccato**, il problema "MDR troppo tecnico" è solo **parzialmente** mitigato, e la nuova combobox custom introdotta per il fix della validazione ha una **lacuna di accessibilità nuova** (nessun `aria-invalid`/`aria-describedby`) che i vecchi campi `<select>`/`<textarea>` invece hanno.

---

## Confronto diretto con la baseline (21/05/2026)

| # | Problema baseline | Stato | Evidenza |
|---|---|---|---|
| 1 | 🔴 Cognitive overload: 9 tab visibili su mobile, 7 bloccate | ✅ **RISOLTO** | `src/components/features/lavori/form/LavoroFormShell.tsx:48-50` — `visibleTabs = isCreating ? TABS.filter(dati/accettazione) : TABS`. In creazione sono visibili solo 2 tab + step indicator numerato "1 Dati → 2 Accettazione MDR" (`LavoroFormShell.tsx:54-150`). Verificato live: snapshot Playwright a 390px mostra `tablist` con 2 soli `tab` ("Dati", "Accett."). |
| 2 | 🔴 Validazione generica, nessun focus, nessun highlight | ✅ **RISOLTO** | `src/app/(app)/lavori/nuovo/page.tsx:37-44` (messaggi specifici per campo), `:111-118` (auto-focus + `scrollIntoView({block:'center'})` sul primo campo in errore), `:68-92` (inline real-time: l'errore si pulisce appena l'utente compila il campo). Verificato live 2 volte: submit form vuoto → focus automatico su `#field-cliente_id`, bordo `1px solid rgb(217,0,18)` (rosso brand) + testo errore rosso sotto ogni campo ("Seleziona il dentista", "Seleziona il tipo di dispositivo", "Inserisci una descrizione", "Inserisci la data di consegna"). |
| 3 | 🔴 MDR troppo tecnico (terminologia, disinfettante a select, progress bar per audit) | 🟡 **PARZIALE** | Aggiunta `InfoTooltip` in linguaggio semplice su tipo impronta (`TabAccettazione.tsx:293`) e opzione "Altro" a testo libero per il disinfettante (`TabAccettazione.tsx:207-213,349-356`). Ma l'intestazione sezione resta **"MDR Allegato XIII"** (`TabAccettazione.tsx:285`) e la progress bar resta **"Completezza MDR Allegato XIII"** (`TabAccettazione.tsx:565`) — esattamente la terminologia che la baseline segnalava come spaventosa per un tecnico non-compliance-officer. Fix consigliato non applicato su questo punto. |
| 4 | 🟠 CTA "Nuovo" sparisce con lo scroll down | ❌ **NON RISOLTO** | `src/components/layout/BottomNavPill.tsx:207-229` — `handleScroll` nasconde l'intera pill (`setVisible(false)`) quando si scrolla verso il basso oltre `HIDE_AFTER_PX`; `:429-450` — l'intero `motion.div` (che contiene anche il bottone "+" Crea nuovo lavoro) è condizionato da `{visible && ...}`. Nessuna logica separata per tenere la CTA sempre visibile. Il fix suggerito nella baseline (A: mai nascondere / B: FAB sempre visibile) non è stato implementato. |
| 5 | 🟠 Empty state assenti/poco motivazionali (clienti, magazzino, lavori senza CTA) | ✅ **RISOLTO** | Componente universale `src/components/ui/EmptyState.tsx` (icon+title+description+cta, esattamente il pattern raccomandato) ora usato in 7 punti: `clienti/page.tsx`, `fatture/page.tsx`, `magazzino/page.tsx`, `pazienti/page.tsx`, `DashboardFrontDesk.tsx`, `DashboardTecnico.tsx`, `OrdiniList.tsx`. `/lavori` ha un empty state inline equivalente con CTA verso `/lavori/nuovo` (`lavori/page.tsx:226-270`, testo "Crea il tuo primo lavoro per iniziare a gestire le commesse del laboratorio"). |
| 6 | 🟠 Tab "Accettazione" abilitata prima dei dati principali | 🟡 **RESIDUO MINORE** | `DISABLED_TABS` (`lavori/nuovo/page.tsx:16-24`) ancora non include `'accettazione'` — tecnicamente cliccabile subito. Impatto ridotto rispetto alla baseline perché ora è solo 1 di 2 tab visibili con uno step-indicator numerato che comunica la sequenza attesa, ma nessun blocco vero. |
| 7 | 🟠 Odontogramma FDI hidden feature | ❌ **NON RISOLTO** | Nessun badge "Nuovo"/hint trovato (`grep` su `TabClinica.tsx` e componenti correlati non ha prodotto risultati). Feature ancora raggiungibile solo da chi esplora le tab sbloccate post-creazione. |
| Trasversale | Skeleton loader mancanti su 18/31 pagine | ✅ **RISOLTO AL 100%** | Ogni route con `page.tsx` sotto `src/app/(app)/` (30 route, incluse dinamiche `[id]` e nested) ha un `loading.tsx` corrispondente con skeleton animato reale (gradient pulse `1.4s`, non placeholder vuoto) — vedi `src/app/(app)/lavori/loading.tsx:1-32` come esempio rappresentativo. |
| Onboarding — rischio abbandono 40% allo step PEC | 🟡 **MIGLIORATO** | Wizard resta a 6 step (`wizard.tsx:10` e seguenti, invariato nel conteggio), ma ora ha via di fuga esplicita sia sullo step ITCA/normativo ("Salta per ora", `wizard.tsx:177`) sia sullo step PEC (`onSkip={() => setStep('ddc')}` passato a `PecSetupWidget`, `wizard.tsx:190-193`). Non è stato possibile ritestare il tasso di abbandono live (account già onboardato, impossibile ri-triggerare il wizard senza nuova registrazione). |

---

## Nuovo problema emerso (non presente in baseline)

### 8. Combobox custom "Dentista/Studio" priva di `aria-invalid`/`aria-describedby`

**Dove:** `src/components/features/clienti/ClienteComboBox.tsx:180-200` (usato da `TabDati.tsx:115-121`)

Tutti gli altri campi obbligatori del nuovo form (`select` tipo dispositivo, `textarea` descrizione, `input` data consegna) collegano correttamente l'errore tramite `aria-describedby` puntato allo `span[role="alert"]` corrispondente (`TabDati.tsx:154,196,330`). La combobox dentista, introdotta per il fix della validazione, riceve solo una prop booleana `hasError` che cambia il colore del bordo (`ClienteComboBox.tsx:200`) ma non imposta `aria-invalid="true"` né `aria-describedby="error-cliente_id"` sull'elemento con `role="combobox"` (riga 180). Per un utente di screen reader il primo campo in errore — proprio quello su cui va il focus automatico — non viene annunciato come invalido, né viene letta la ragione.

**Fix consigliato:** propagare `aria-invalid={hasError}` e `aria-describedby={hasError ? 'error-cliente_id' : undefined}` sull'input della combobox, coerentemente con gli altri campi dello stesso form.

**Impact:** basso volume utenti (screen reader su target 45-60enni è raro) ma è un regression rispetto allo standard già raggiunto sugli altri campi dello stesso form nello stesso commit.

---

## Nota metodologica — cosa è stato verificato live vs a codice

**Verificato live (Playwright, 390×844, sessione autenticata reale h4t@live.it):**
- Flusso completo apertura `/lavori/nuovo`, struttura a 2 tab, step indicator
- Submit form vuoto → messaggi di errore, auto-focus, evidenza visiva del bordo rosso (screenshot + `getComputedStyle`)
- Assenza di `aria-invalid`/`aria-describedby` sulla combobox (via `page.evaluate`)

**Verificato a codice (non riproducibile live per limiti strutturali dell'ambiente):**
- Empty state: il lab Filippo ha 20 clienti / 277 lavori storici / 187 materiali — le liste non sono mai vuote con questo account, quindi gli empty state non sono renderizzabili in produzione con i dati esistenti. Confermato invece via lettura del componente `EmptyState.tsx` e dei suoi 7 punti di utilizzo.
- Onboarding: l'account di test è già onboardato; non è possibile ri-triggerare il wizard senza una nuova registrazione lab. Confermato via lettura di `wizard.tsx`.
- Censimento skeleton loader: più affidabile via file system (30/30 route con `loading.tsx`) che via click-through pagina per pagina.

**Nota ambientale:** durante il testing il browser Playwright ha mostrato instabilità intermittente (refs di snapshot invalidati da re-render continui dell'app — probabilmente dovuti a orologio "Buon pomeriggio" + realtime provider — e un caso di navigazione anomala dopo un click con retry lungo). Le evidenze riportate sopra sono tutte state riprodotte in un contesto stabile (tab isolata, `run_code_unsafe` self-contained) e confermate almeno due volte dove indicato.

---

## Punteggio per dimensione

| Dimensione | Baseline (21/05) | Ora (02/07) | Motivazione variazione |
|---|---|---|---|
| Information Architecture | 7.5 | **9.0** | Fix wizard 9→2 tab, il problema #1 più citato dalla baseline |
| Visual Design | 9.0 | **9.2** | DS v2.3 (contrasti t2/t3 WCAG AA/AAA, rainbow semantic colors) invariato/rifinito |
| Interaction Design | 7.0 | **8.5** | Real-time inline validation + auto-focus + scrollIntoView |
| Accessibility | 9.0 | **8.7** | Per lo più mantenuta (role=alert, aria-describedby su 3/4 campi), lieve regressione sulla combobox nuova |
| Onboarding | 6.5 | **7.5** | Skip espliciti su ITCA e PEC; step count invariato, non ritestabile il tasso reale di abbandono |
| Error Prevention | 5.0 | **8.7** | Il fix più netto della sessione: messaggi specifici + focus + evidenza visiva, tutto verificato live |
| Mobile Experience | 6.5 | **8.0** | Wizard semplificato aiuta molto; CTA che sparisce con lo scroll resta un attrito non risolto |
| Feature Discoverability | 6.0 | **6.5** | Empty state con CTA ovunque; odontogramma FDI resta non scoperto |

**Media: 66.1 / 8 = 8.26/10 → arrotondato 8.3/10**

**NPS predetto:** Tech-savvy (25-40 anni): 8.5/10 | Non tech-savvy (45+ anni): 7/10 (era 5/10 — salto netto grazie a wizard + validazione, frenato da CTA-scroll e terminologia MDR ancora tecnica)

---

## Raccomandazioni per chiudere il gap verso 8.5+

**P0 (impatto alto, effort basso — 1-2h totali):**
1. CTA "+" sempre visibile durante lo scroll — separare il bottone centrale dal resto della pill in `BottomNavPill.tsx:429-450` (non condizionarlo a `visible`)
2. `aria-invalid`/`aria-describedby` sulla combobox dentista in `ClienteComboBox.tsx:180-200`

**P1 (impatto medio, effort basso — 1h):**
3. Rinominare "MDR Allegato XIII" → "Materiali ricevuti" nell'intestazione visibile all'operatore (`TabAccettazione.tsx:285`) e nella progress bar (`:565`), mantenendo il riferimento normativo solo nel tooltip/dettaglio
4. Badge "Nuovo" o hint dashboard per scoprire l'odontogramma FDI

**P2 (verifica, non implementazione):**
5. Ritestare il tasso di abbandono onboarding reale con un nuovo signup end-to-end (non possibile con l'account esistente già onboardato)

---

*Re-audit completato il 2 luglio 2026 — confronto baseline: `docs/audit-2026-05-21/06-persona-ux-expert.md`*

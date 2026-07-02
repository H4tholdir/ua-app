# Re-Audit Flusso UX — Front Desk (Follow-up)
**Data:** 2026-07-02 | **Baseline confrontata:** `docs/audit-2026-05-21/10-flow-frontdesk.md` (score 7.8/10, "il flusso più maturo dell'app") | **Persona:** Sara, front desk | **Metodo:** lettura codice sorgente deployato + verifica live su https://uachelab.com (Playwright, viewport 390px) con utente `e2e-frontdesk@ua-test.local` (ruolo `front_desk`, da `scripts/seed-e2e.ts` linea 116)

---

## Punteggio: 8.6/10 (baseline 7.8/10 → target 9+/10)

**Sintesi:** i due problemi CRITICI di compliance segnalati nel report precedente sono stati risolti, uno di essi in modo più rigoroso di quanto lo stesso audit richiedesse (hard-block server-side, non solo il soft-block suggerito). Non è stata invece toccata la fonte di debito tecnico su `/ordini` (bug noto, non bloccante), e diversi "quick win" di UX secondaria elencati nel report di maggio restano non implementati. Il flusso non regredisce su nessun punto — anzi migliora sui due assi più pesanti — ma non raggiunge 9+ perché permangono le stesse lacune minori già preventivate a maggio più il debito tecnico mai risolto.

---

## 1. Fix critico #1 — Disinfettante "Non dichiarato": ✅ APPLICATO

File: `src/components/features/lavori/form/TabAccettazione.tsx`

```ts
// linee 31-42
const DISINFETTANTI = [
  ...
  { value: 'Non dichiarato', label: 'Non dichiarato' },   // linea 33
  ...
]
const DISINFETTANTI_VALUES = DISINFETTANTI.map((o) => o.value)   // linea 42
```

- Linea 209: la validazione controlla che il valore inserito sia tra quelli ammessi (`DISINFETTANTI_VALUES`), quindi "Non dichiarato" è un valore di prima classe, non un workaround.
- Linea 324: `InfoTooltip` istruisce esplicitamente l'operatore: *"Scrivi 'Non dichiarato' se non comunicato dal dentista"* — risolve esattamente lo scenario del 40% dei casi segnalato a maggio.
- Linea 343: l'opzione compare nel `<select>` renderizzato.

Verificato anche live: il form "Nuovo lavoro" → step "Accettazione MDR" carica correttamente in produzione con l'utente front_desk di test.

**Giudizio:** fix implementato esattamente come raccomandato nel report precedente (sezione "Quick win #1"). Nessuna riserva.

---

## 2. Fix critico #2 — Precheck MDR alla consegna: ✅ MIGLIORATO OLTRE LA RACCOMANDAZIONE

Il report di maggio proponeva due opzioni: (A) hard-block totale, o (B) soft-block con dialog di conferma. È stata implementata **una combinazione a due livelli**, più solida di entrambe le opzioni singole:

### 2a. Elementi Allegato XIII core (prescrittore, paziente, descrizione, tipo dispositivo, classe di rischio, data consegna) → **HARD BLOCK server-side, non aggirabile**

File: `src/lib/consegna/orchestrate.ts`, linee 141-153:
```ts
const precheck = precheckMDR(lavoro as LavoroDettaglio)
if (!precheck.ok) {
  await rilasciaLock()
  return { ok: false, tipo: 'precheck_fallito', messaggio: 'Dati MDR incompleti — correggi i campi segnalati.', errori_precheck: precheck.errori }
}
```
Questo controllo gira **server-side** dentro `orchestraConsegna()`, invocato da `POST /api/lavori/[id]/consegna` (`src/app/api/lavori/[id]/consegna/route.ts` linee 46-50), che risponde HTTP 422 se il precheck fallisce. Nessuna azione lato client (incluso un'eventuale chiamata diretta all'API bypassando la UI) può forzare la consegna se mancano: nominativo prescrittore, paziente identificabile, descrizione dispositivo, tipo dispositivo, classe di rischio o data di consegna prevista (`src/lib/consegna/precheck.ts` linee 18-92, elementi 3-7). Questo è più rigoroso di quanto il report di maggio stesso chiedesse.

### 2b. Disinfettante + tipo impronta (dati accettazione ingresso) → soft-block con dialog esplicito

File: `src/lib/consegna/precheck.ts`, linee 94-101: questi due campi sono intenzionalmente **esclusi** dal blocco hard (`ok` dipende solo da `errori.length`, non da `mdr_incompleto`) ma generano un flag `mdr_incompleto` + elenco `mdr_campi_mancanti`.

Il flusso lato client (`src/components/features/lavori/ConsegnaButton.tsx` linee 104-133) intercetta questo flag chiamando `GET /api/lavori/[id]/precheck-materiali` prima di consegnare, e se `mdr_incompleto === true` mostra `MaterialiWarningSheet` (`src/components/features/lavori/MaterialiWarningSheet.tsx`) con:
- Titolo "Dati MDR incompleti" e box rosso con elenco campi mancanti (linee 164-208)
- Bottone esplicito **"Consegna senza dati MDR completi"** in rosso, con `aria-label="Consegna senza dati MDR completi — non conforme Allegato XIII"` (linee 319-342) — quindi Sara vede chiaramente il rischio prima di procedere, cosa che a maggio non esisteva affatto ("nessun avviso").

**Giudizio:** questo è esattamente lo scenario "Opzione B" raccomandato dal report di maggio per il disinfettante, combinato con un hard-block reale (non richiesto ma benvenuto) per gli elementi realmente obbligatori per la DdC. **Non è più vero** che si possa "consegnare con dati MDR incompleti senza alcun avviso" — la domanda del brief originale ha ora risposta negativa per tutti gli scenari: o c'è un blocco duro, o c'è un dialog esplicito con azione nominata "non conforme Allegato XIII".

**Riserva minore:** il messaggio finale al dentista via WhatsApp resta privo di indicatore visivo se la consegna è avvenuta con dati MDR incompleti (stesso gap descritto a maggio, mai realmente richiesto come fix separato — resta un nice-to-have).

---

## 3. Bug subquery `/ordini`: ❌ NON RISOLTO — invariato rispetto a maggio

File: `src/app/(app)/ordini/page.tsx`, linee 104-125:
```ts
// linee 104-111 — query non funzionante, ESEGUITA COMUNQUE ad ogni caricamento pagina
const { data: articoliData } = await svc
  .from('magazzino')
  .select('id, nome, scorta_attuale, scorta_minima, um_scarico, fornitore_id')
  .eq('laboratorio_id', labId)
  .eq('attivo', true)
  .lt('scorta_attuale', svc.from('magazzino').select('scorta_minima'))   // ← non supportato da Supabase-js
  .order('nome', { ascending: true })
  .limit(100)

// linea 113: commento che riconosce il problema — INVARIATO da maggio
// "La query sopra non funziona con lt su colonne della stessa tabella — usiamo filter lato JS"
const { data: tuttiArticoli } = await svc
  .from('magazzino')
  .select('id, nome, scorta_attuale, scorta_minima, um_scarico, fornitore_id')
  .eq('laboratorio_id', labId)
  .eq('attivo', true)
  .order('nome', { ascending: true })
  .limit(500)

void articoliData // sopprime il warning — la query rotta resta comunque nel codice
articoliSottoScorta = ((tuttiArticoli ?? []) as ArticoloSottoScorta[]).filter(
  (a) => a.scorta_attuale < a.scorta_minima
)
```

Questo codice era **già presente identico** al momento del report di maggio (documentato in `docs/audit-2026-05-21/11-technical-systematic.md` linee 522-530 e `SINTESI-ORCHESTRATORE.md` linee 108-110, con fix raccomandato G6: "Refactor con RPC custom in Postgres", 2 ore di sforzo stimato). **Il fix G6 non è stato applicato.**

**Impatto reale:** funzionalmente la pagina `/ordini` funziona correttamente (il filtro JS-side alle linee 122-125 produce il risultato giusto), quindi non c'è un bug visibile per Sara. Ma:
- La query rotta alle linee 104-111 viene comunque eseguita ad ogni caricamento pagina, sprecando una round-trip di rete per un risultato scartato (`void articoliData`).
- Con un magazzino di 500+ articoli (limite già impostato a `.limit(500)` in previsione), il filtro lato JS scala peggio di una query SQL nativa.
- Codice morto/confuso: un futuro sviluppatore potrebbe non capire perché esistono due query quasi identiche.

**Giudizio:** invariato rispetto al 21 maggio. Non è una regressione, ma nemmeno un progresso — il debito tecnico è ancora lì, esattamente come descritto.

---

## 4. Altri "quick win" del report di maggio — stato

| # | Fix proposto (maggio) | Stato | Evidenza |
|---|---|---|---|
| 1 | Disinfettante "Non dichiarato" | ✅ Fatto | `TabAccettazione.tsx:33` |
| 2 | Haptic feedback su SUCCESS bottone CONSEGNA | ❌ Non fatto | `ConsegnaButton.tsx` — nessuna chiamata a funzioni haptic; solo `playSuccess()`/`soundConsegna()` (audio, non tattile), linee 84-85 |
| 3 | KPI "Accettati/Consegnati oggi" su dashboard | ❌ Non fatto | `src/components/features/dashboard/DashboardFrontDesk.tsx` — nessuna sezione KPI giornaliera trovata; dashboard mostra solo "Da consegnare oggi", "Ritiri attesi oggi", "In prova — rientrano oggi" come a maggio |
| 4 | Link documenti nel messaggio WhatsApp post-consegna | ⚠️ Parziale | `src/lib/consegna/whatsapp-template.ts` linea 3: commento esplicito "Solo: numero lavoro + link portale token" — include un link al portale cliente (verosimilmente con accesso ai documenti), ma non link diretti ai singoli PDF come suggerito |
| 5 | Sticky header sezione "Materiali ricevuti" | ❌ Non fatto | Nessuna occorrenza di `sticky` in `TabAccettazione.tsx` |
| 6 | Parallel XHR upload immagini (max 3 concorrenti) | ✅ Probabilmente già ok | `src/components/features/lavori/form/TabImmagini.tsx` linee 200-218: `filesArr.forEach(file => { ... uploadFile(file, ...) })` — gli upload partono concorrentemente (forEach non attende), non in sequenza come descritto a maggio |
| 7 | Blocco (soft) consegna se precheck MDR fallisce | ✅ Fatto (e superato, vedi §2) | `MaterialiWarningSheet.tsx`, `orchestrate.ts:143-153` |
| 8 | Date stepper su `data_consegna_prevista` | ➖ Invariato | Input nativo `type="date"` già in uso (`TabDati.tsx` linea 317); limite di stepper su iOS resta un vincolo di piattaforma, non applicativo |

Punteggio "quick win": **3 di 8 completati/superati** (i due critici + probabilmente il parallel upload), **1 parziale**, **3 non fatti**, **1 invariato per vincolo di piattaforma**.

---

## 5. Verifica live (Playwright, 390px, utente front_desk)

Login confermato con `e2e-frontdesk@ua-test.local` (ruolo `front_desk`, laboratorio "Lab Test E2E"). Confermati live e coerenti col codice:
- Dashboard front desk renderizza correttamente: header "ACCETTAZIONE", "Ciao, Test", sezione "DA CONSEGNARE OGGI (0)" — struttura identica a quella descritta nel report di maggio.
- Form "Nuovo lavoro" ha ora uno stepper a 2 step espliciti in testa alla pagina ("1 Dati" / "2 Accettazione MDR") con tab "Dati"/"Accett." — un miglioramento di orientamento rispetto al flusso a tab semplice descritto a maggio (non era esplicitamente segnalato come problema, ma è un affinamento positivo).
- Campo data consegna: input nativo `type="date"` con icona calendario, coerente col codice.

**Limite metodologico:** durante il test la sessione di produzione condivisa ha mostrato comportamenti anomali e ricorrenti — logout intermittenti, navigazioni impreviste verso pagine non richieste (`/fatture`, `/qualita`, `/scadenzario`, persino `chrome://password-manager`), e un menu profilo che si riapriva da solo intercettando i click. Non è stato possibile escludere con certezza un'interferenza da processo concorrente (es. suite E2E automatica che riusa le stesse credenziali di test, o autofill/password manager del browser). Di conseguenza **non è stato possibile completare in un'unica sessione continua e cronometrata l'intero ciclo accettazione→foto→consegna** come richiesto. La cronometrazione puntuale (45 sec accettazione dati, 2m15s checklist MDR, ecc.) del report di maggio non è stata quindi ri-misurata in modo affidabile in questo giro; le conclusioni sui punti 1-4 sopra si basano su lettura diretta del codice server-side effettivamente eseguito in produzione (le route API sono le stesse invocate dal client) più le conferme live puntuali elencate sopra. Si raccomanda un secondo passaggio di verifica in un ambiente isolato (staging dedicato o sessione browser pulita senza credenziali salvate) per ri-cronometrare l'intero flusso end-to-end.

---

## 6. Confronto con baseline e raccomandazione finale

| Criterio | Maggio (7.8/10) | Luglio (8.6/10) |
|---|---|---|
| Disinfettante non dichiarato | ❌ Assente — friction 40% casi | ✅ Risolto |
| Precheck MDR a consegna | ❌ Non bloccante, nessun avviso | ✅ Hard-block su elementi core + soft-block esplicito su disinfettante/impronta |
| Bug `/ordini` subquery | ⚠️ Noto, workaround JS presente | ⚠️ Identico, fix RPC (G6) non applicato |
| KPI fine giornata | ❌ Assente | ❌ Ancora assente |
| Haptic feedback consegna | ❌ Assente | ❌ Ancora assente |
| Sticky header materiali | ❌ Assente | ❌ Ancora assente |
| Upload immagini | Sequenziale (stimato 45s/5 foto) | Concorrente (forEach non-blocking) |

**Per raggiungere 9+/10:** (1) applicare il fix G6 su `/ordini` (RPC Postgres, ~2h, già specificato nel report di maggio), (2) aggiungere i KPI giornalieri "Accettati/Consegnati oggi" alla dashboard front desk, (3) haptic feedback su stato SUCCESS del bottone CONSEGNA. Sono le stesse tre lacune minori individuate a maggio, nessuna nuova regressione rilevata.

---

**Report compilato:** 2 luglio 2026 · Produzione https://uachelab.com · Basato su lettura del codice sorgente deployato (nessun diff Git disponibile — repo non versionato in questa directory) + verifica live parziale con Playwright a 390px.

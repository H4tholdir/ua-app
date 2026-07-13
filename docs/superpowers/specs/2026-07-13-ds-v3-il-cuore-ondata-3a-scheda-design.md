# DS v3 «Il cuore» — Ondata 3a: Scheda lavoro v3 (design)

**Data:** 2026-07-13
**Autore:** sessione brainstorming con Francesco + advisor
**Legge madre:** `2026-07-07-design-system-v3-una-cosa-alla-volta.md` (§7.4, §5.1, §5.11, §5.27, §12.2)
**Spec madre sotto-progetto:** `2026-07-09-ds-v3-il-cuore-design.md` (§7, §7.1 — questa spec le attua)
**Mockup approvato (gate 0B):** `docs/design/mockups/2026-07-09-il-cuore/scheda-lavoro.html`
**Ondate correlate:** 3b (flussi ⋯ pesanti nativi + N4) · 4b (flusso Consegna + morte `/lavori/[id]/consegna`)

---

## 0. TL;DR

Ondata 3 (Scheda lavoro) si **decompone in 3a + 3b**. Questa spec copre **3a**: `/lavori/[id]` passa da form-multi-tab v2.3 a **scheda-vista v3** (sola lettura + azioni + modifica per-riga via Sheet). I flussi ⋯ pesanti (Prezzi&lavorazioni, Dati clinici, Prove) e Foto restano a **ponte** verso il form v2.3 esistente (deep-link) fino a 3b, che li nativizza e affronta N4. Il flusso Consegna e la morte di `/lavori/[id]/consegna` sono 4b.

**Invarianti 3a:** zero API nuove · zero migration · zero dominio fiscale · scheda-vista 100% v3 · il tasto `CONSEGNA` naviga al flusso `/consegna` v2.3 esistente quando il lavoro è consegnabile (identica azione del `TastoConsegnaInline` della pila, già in produzione da Ondata 1); 4b lo sostituirà col flusso in-scheda.

---

## 1. Scopo e perimetro

Migrare la **scheda lavoro** `/lavori/[id]` a DS v3 secondo §7/§7.1 della spec madre, applicando il principio C3 «il form multi-tab muore ORA: nessun residuo v2.3 **sulla scheda-vista**». La chiave è *sulla scheda-vista*: la vista principale non ha residui v2.3; i sotto-flussi pesanti restano dietro un ponte esplicito e temporaneo fino a 3b.

**Route:** invariata (`/lavori/[id]`), più una route-ponte nuova `/lavori/[id]/modifica`. Nessuna migrazione URL. La pagina si avvolge in `data-ds="v3"` con `background: var(--bg)` dipinto inline sul page-root (pattern catalogo/Ondata 1).

### 1.1 Muore in 3a
- Il rendering v2.3 della scheda `/lavori/[id]/page.tsx`: `AppHeader` + `StatoBadge`, `LavoroTimeline`, `LavoroFormClient` montato direttamente in pagina, `RifacimentoButton` v2.3, il link scheda-fabbricazione inline, i banner v2.3.
- La barra azioni sticky del form (Salva + 📦 + **CONSEGNA gold**) **sulla scheda-vista**.

### 1.2 Nasce in 3a (v3 nativo)
- **Scheda-vista v3** (§3).
- **Modifica per-riga** via `Sheet` una-domanda (§4).
- **CardFasi** read-only con gesto di completamento (§5).
- Voce ⋯ **Annulla lavoro** → presente ma **disabilitata** (§6.2), backend rimandato a stage dedicato.
- Voce ⋯ **Documenti** → hub download nativo (§6.3).
- `TastoSecondario` **Rifacimento** e **Segnala problema** contestuali (§3.4).
- Route-ponte `/lavori/[id]/modifica` che sopprime il tasto CONSEGNA fuori contesto (§7).

### 1.3 Resta a ponte v2.3 fino a 3b
- Voci ⋯ **Prezzi e lavorazioni** · **Dati clinici** · **Prove** · **Foto** → deep-link al form v2.3 esistente (§7).

### 1.4 Fuori da 3a (esplicitamente)
- Riscrittura del flusso Consegna (precheck → `DialogConferma` → esito in-scheda) e morte di `/lavori/[id]/consegna` → **4b**. In 3a il tasto CONSEGNA usa il flusso `/consegna` v2.3 così com'è (viva fino a 4b), come già fa la pila.
- Decisione **N4** (fonte di verità del prezzo lavoro: `lavori.prezzo_unitario` vs righe `lavori_lavorazioni`) → **3b**, dentro «Prezzi e lavorazioni».
- Smontaggio nativo dei tab pesanti e flusso «Produzione» nativo → **3b**.

---

## 2. Decisioni ratificate (2026-07-13, Francesco)

| # | Decisione | Origine |
|---|---|---|
| D1 | Ondata 3 si decompone in **3a** (scheda-vista + editing comune + flussi leggeri) e **3b** (flussi pesanti nativi + N4). | Francesco |
| D2 | Il tasto `TastoPrimario CONSEGNA` della scheda **naviga a `/lavori/[id]/consegna` v2.3** quando il lavoro è consegnabile (stessa azione del `TastoConsegnaInline` della pila, già in produzione), **disabled + callout** quando non consegnabile (§5.1). 4b sostituirà il flusso `/consegna` con quello in-scheda. | Francesco (Nodo 1, rivisto in review) |
| D3 | **Nessuna regressione consegna** in 3a: scheda e pila portano entrambe allo stesso flusso `/consegna` v2.3 (vivo fino a 4b) → coerenza anche nel desktop split. Fatto emerso in review advisor: la consegna era già raggiungibile dalla pila (Ondata 1, `PilaAperta`/`PilaSplit`), quindi «CONSEGNA disabled» avrebbe creato un'incoerenza pila-consegna/scheda-no sullo stesso schermo. | Advisor + Francesco |
| D4 | Ponte ai flussi pesanti = **route `/lavori/[id]/modifica`** che rende `LavoroFormClient` con `defaultTab` (deep-link) e `bridged` (**CONSEGNA + barra sticky soppresse**). Il menu ⋯ mostra le **6 etichette del mockup** (no «Modifica avanzata» generica). | Advisor + Francesco |
| D5 | Confine leggero/pesante di 3a: **nativi** = modifica per-riga, Annulla lavoro, Documenti (hub), Rifacimento e Segnala (TastoSecondario contestuali). **A ponte** = Prezzi&lavorazioni, Dati clinici, Prove, **Foto**. | Francesco (raccomandazione accolta) |
| D6 | **Documenti nativo** (non a ponte): il ponte sarebbe incompleto perché pacchetto MDR e scheda-fabbricazione non vivono in un tab; l'hub è un elenco di download su endpoint esistenti. | Analisi codice + Francesco |
| D7 | **Foto a ponte** in 3a: `TabImmagini` è 692 righe, il valore quotidiano «vedere» è già nella strip read-only nativa; nativizzata in 3b con gli altri per coerenza di linguaggio. | Analisi codice + Francesco |
| D8 | **Annulla lavoro**, non «Butta via»: un DM su misura tracciato MDR non si cestina, si annulla (deviazione mockup già annotata al gate 0B). | Advisor odontotecnico/normativo |

---

## 3. Scheda-vista v3 (`/lavori/[id]`)

Ordine verticale (mobile), fedele al mockup approvato:

### 3.1 Header (§7)
`TastoTondo ‹` back → `/lavori` · titolo `n.147` + `PillStato` · `TastoTondo ⋯` (apre menu). Nient'altro.

### 3.2 Corpo
1. **Banner annullo** (condizionale): se `stato === 'consegnato'` e consegna da < 10 min → riga con countdown + `LinkQuieto` «Aspetta, annulla la consegna». **In 3a il banner è inerte/informativo** (la logica di annullo vive col flusso Consegna, 4b); si valuta se mostrarlo disabilitato o rimandarlo del tutto a 4b → **da fissare nel piano** (default proposto: mostrarlo solo se già oggi esiste il percorso di annullo funzionante, altrimenti rimandare a 4b per non esporre un'azione morta).
2. **CardInfo** — 4-5 `RigaDato`: dentista, paziente (codice PZ o alias), lavoro (descrizione/tipo), consegna (data + ora), tecnico. Ogni RigaDato editabile è **tappabile → Sheet** (§4).
3. **NotaDentista** (§5.23) — solo se esiste una nota del dentista.
4. **Strip foto** orizzontale read-only — thumbnail 72, radius 12, max 1 riga — solo se presenti immagini. Tap su una foto = anteprima (comportamento minimo; la gestione è nel flusso Foto a ponte).
5. **CardFasi** (§5) — solo se il lavoro ha fasi.

### 3.3 Azione primaria
`TastoPrimario CONSEGNA` **sempre presente, mai nascosto**.
- **Abilitato** quando il lavoro è **consegnabile** (tutte le fasi fatte + stato ∈ `STATI_CONSEGNABILI` — la stessa nozione di `l.consegnabile` usata dalla pila; adapter E4). Al tap: `router.push('/lavori/[id]/consegna')` — il flusso v2.3 vivo, **identico** a ciò che fa già il `TastoConsegnaInline` della pila. Nessun salvataggio globale da fare (la modifica per-riga salva già ottimisticamente).
- **Disabled** quando non consegnabile, con callout «Completa il controllo finale per consegnare».

In 4b il tasto verrà ricablato al flusso Consegna in-scheda; in 3a riusa il percorso esistente senza aggiungere debito (la pagina `/consegna` muore comunque in 4b).

### 3.4 Azioni contestuali (TastoSecondario)
- **Rifacimento** — visibile se `stato ∈ {consegnato, pronto, sospeso}`. Riusa `crea_rifacimento_atomico` via l'attuale endpoint `POST /api/lavori/[id]/rifacimento`. Presentazione v3 (`TastoSecondario` + `DialogConferma`), rimpiazza `RifacimentoButton` v2.3.
- **Segnala problema** — visibile solo se `ruolo === 'tecnico'`. Riusa `SegnalaProblemaSheet` (o sua resa v3) + `POST /api/lavori/[id]/segnala`. Il **banner segnalazione non risolta** (oggi in `LavoroFormClient`, visibile a titolare/admin_rete con «Segna risolta») va riportato nella scheda v3 come `Avviso`/callout con azione — **da confermare nel piano** se in 3a o rimandato.

> Nota gate visivo: Rifacimento e Segnala come `TastoSecondario` contestuali **non sono nel mockup 6-voci**. Sono aggiunte a basso rischio, da ratificare allo screenshot Playwright (come deviazioni analoghe delle ondate precedenti).

---

## 4. Modifica per-riga (Sheet una-domanda) — §5.27 madre, C3

Tap su una `RigaDato` editabile della CardInfo → `Sheet` con **il solo input pertinente**:

| RigaDato | Input | Campo PATCH | Note |
|---|---|---|---|
| Consegna | `CampoData` + chip rapidi (`ChipScelta`) per data; input ora | `data_consegna_prevista`, `ora_consegna` | entrambi in `PATCHABLE_FIELDS` (verificato) |
| Tecnico | `TileScelta` tecnici del lab | `tecnico_id` | FK validato cross-tenant (verificato) |
| Dentista | `TileScelta` + `RigaCerca` clienti | `cliente_id` | FK validato cross-tenant (verificato) |
| Note | `Campo` testo | campo note del lavoro | campo esatto da fissare nel piano (candidato: `descrizione` o nota dedicata — verificare colonna) |

**Comportamento:** salvataggio **ottimistico** via `PATCH /api/lavori/[id]` (allowlist già in vigore). In caso di errore: rollback dello stato ottimistico + `Avviso` (L6). Una riga, una modifica, si chiude — **nessun autosave globale, nessuna barra Salva sticky** sulla scheda-vista.

**MDR:** i dati clinici/di accettazione/di fase **non** sono editabili dalla scheda-vista (§7.4 madre); si toccano solo nei flussi dedicati (a ponte in 3a, nativi in 3b).

---

## 5. CardFasi — read-only con gesto di completamento

- `CardFasi` mostra le `RigaFase` (§5.11) del lavoro. I **dati** di fase (note, non-conformità, materiali) sono **read-only** in scheda.
- **Eccezione deliberata:** il gesto di **completamento** resta. La fase attiva (una sola alla volta, §5.1) espone un `CheckTondo` che la marca FATTA via `PATCH /api/lavori/[id]/fasi/[faseId]` (endpoint e logica ottimistica già esistenti in `LavoroFormClient.handleUpdateFase`, con il request-id ref anti-race da preservare).
- Questo è la precondizione perché CONSEGNA si abiliti (in 4b): completare le fasi deve essere possibile dalla scheda.
- **L'editing avanzato di fase** (esito dettagliato, non-conformità) **non è esposto in 3a** — coerente col mockup 6-voci (nessuna voce «Produzione») — ed è tracciato per il flusso «Produzione» nativo di **3b**.

---

## 6. Menu ⋯ (6 voci del mockup approvato)

`TastoTondo ⋯` apre uno `Sheet` con le voci (§7.1, ordine e stile dal mockup):

1. **Prezzi e lavorazioni** → ponte (§7)
2. **Dati clinici** → ponte (§7)
3. **Prove** → ponte (§7)
4. **Foto** → ponte (§7)
5. **Documenti** → hub nativo (§6.3)
6. **Annulla lavoro** (rossa, staccata) → **presente ma disabilitata in 3a** (§6.2)

### 6.2 Annulla lavoro — disabilitata in 3a
La voce compare (mockup 6-voci rispettato) ma è **disabilitata** con indicazione «prossimamente». Motivo verificato in review: **non esiste alcun backend** per annullare un lavoro — nessun `DELETE` sulla route `/api/lavori/[id]` (solo `GET`/`PATCH`), nessun writer di `lavori.deleted_at` (l'unico writer di `deleted_at` è su `lavori_lavorazioni`, cioè le righe). È quindi una **feature nuova**, mai esistita, che tocca MDR (sorte di un lavoro con DdC / consegnato / fatturato — la tracciabilità deve restare) e viola le invarianti «zero API nuove / zero dominio MDR» di 3a.

Il suo progetto (soft-delete MDR-conforme + gestione stati DdC/consegnato/fatturato) è **rimandato a uno stage dedicato conforme** (decisione Francesco), tracciato nel backlog. In 3a la voce è solo un segnaposto disabilitato.

### 6.3 Documenti (hub nativo)
`Sheet` che elenca come azioni di download/apertura, riusando endpoint **già esistenti**:
- Scarica **DdC** (se presente, signed URL)
- **Pacchetto MDR** → riusa `PacchettoConsegnaSheet` esistente
- **Scheda di Fabbricazione** → `GET /api/lavori/[id]/scheda-fabbricazione`
- **IFU** → `GET /api/lavori/[id]/ifu`
- **Etichetta** → `GET /api/lavori/[id]/etichetta`
- **Ricevuta di consegna** → `GET /api/lavori/[id]/ricevuta-consegna`

Le voci si mostrano condizionalmente (es. DdC solo se esiste, scheda-fabbricazione solo se ci sono fasi). Nessuna generazione fiscale.

---

## 7. Il ponte a v2.3 (route `/lavori/[id]/modifica`)

Le 4 voci a ponte (Prezzi e lavorazioni, Dati clinici, Prove, Foto) navigano a **`/lavori/[id]/modifica?tab=…`** (route nuova, `data-ds="v3"` sul guscio). La pagina rende `LavoroFormClient` con due prop nuove:

- `defaultTab: TabId` — deep-link (già supportato da `LavoroFormShell`; va solo inoltrato da `LavoroFormClient`). Mappatura: Prezzi e lavorazioni→`lavorazioni`, Dati clinici→`clinica`, Prove→`prove`, Foto→`immagini`.
- `bridged: boolean` — quando true **sopprime SOLO il `TastoPrimario CONSEGNA`** (righe 378-421). Motivo: la consegna si avvia dalla scheda-vista o dalla pila, non da dentro un sotto-flusso di editing (es. «Prezzi e lavorazioni»); ed evita di mostrare il tasto CONSEGNA gold v2.3 (WCAG-fail) in una superficie gusciata v3.
  - **La barra Salva RESTA** (correzione emersa in review). Verificato in `useLavoroForm.ts`: i tab a campi (`TabClinica`/`TabDati`/`TabDate`/`TabAccettazione`) mutano stato locale via `onChange={update}` e persistono **solo** su `save()`; l'autosave è debounced a 30s (fires solo con `data.id` presente). Sopprimere Salva farebbe evaporare le modifiche se l'utente chiude prima dei 30s. Salva fa solo `PATCH` e resta sulla pagina → non riapre alcun back-door. Il pulsante 📦 diventa ridondante col nuovo hub Documenti nativo: rimuoverlo dal ponte è cosmetico e opzionale.
  - Il pulsante «Segnala problema» / banner segnalazione, se già portati nella scheda-vista, vanno evitati come doppione nel ponte — **da fissare nel piano**.

**Header della route-ponte:** `TastoTondo ‹` back → `/lavori/[id]` (torna alla scheda-vista) + titolo `n.147`. Un guscio v3 attorno a contenuto v2.3: è il residuo v2.3 **fuori dalla scheda-vista**, esplicito e temporaneo, che 3b elimina sostituendo la destinazione dietro le stesse etichette.

**Nota:** dopo la revisione D2/D3 il tasto CONSEGNA non è più «disabilitato in 3a», quindi sopprimerlo nel ponte non è più una questione anti-regressione ma di **contesto/coerenza v3**. Il vincolo resta valido (§11.6: audit che nessun tab abbia navigazioni interne autonome verso `/consegna`).

**Perché route e non sheet:** back nativo, deep-link condivisibile, isolamento del residuo v2.3 in un URL dedicato. L'advisor concorda.

---

## 8. Responsive (§12 madre)

La scheda completa v3 è un **componente riusabile** (`SchedaLavoroV3`) montato sulla route standalone `/lavori/[id]`. **Nota architetturale verificata in review:** la vista pile (`/lavori?pila=…&lavoro=…`) usa il DTO ridotto `LavoroPila` (fasi **senza id**), mentre la modifica per-riga e il gesto di completamento fase richiedono `LavoroDettaglio` (fasi con id per `PATCH …/fasi/[faseId]`). Quindi la scheda **interattiva vive sulla route `/lavori/[id]`**, non nel pannello pile.

- **Mobile (390):** scheda piena; `Sheet` = bottom sheet; menu ⋯ = bottom sheet.
- **Desktop (768/1280):** la route `/lavori/[id]` mostra la scheda come **card centrata** (max-width ~640); `Sheet`/menu come bottom-sheet o dialog centrato (resa esatta nel piano). Nessuna lista di provenienza: un deep-link contestuale non ha una pila definita (`«quale pila?»` è indefinito per un `in_lavorazione`), quindi la card centrata è la resa standalone coerente — **non una deviazione dal mockup**.
- **Vista pile invariata:** `SchedaAnteprima` (Ondata 1) resta l'**anteprima read-only** nel pannello destro dello split/3-pannelli, con «Apri la scheda completa» → `/lavori/[id]`. Il commento di `SchedaAnteprima` «la scheda piena con chi/quando arriva in Ondata 3» è soddisfatto dalla route standalone.
- Entrambi i temi (light + dark). `data-ds="v3"` + `background: var(--bg)` sul page-root.

**Follow-up tracciato (NON in 3a):** upgrade del pannello destro della vista pile da `SchedaAnteprima` (anteprima) alla `SchedaLavoroV3` interattiva — richiede il fetch di `LavoroDettaglio` su `?lavoro=` e la resa `Sheet` → pannello laterale 420px. È il layout split/desktop del mockup gate-0B (`.split`/`.desktop`, pannello destro = full-card); rimandato per tenere 3a fuori dal codice Ondata 1 deployato e dare al problema sheet-as-panel un pass dedicato. Costo contenuto: `SchedaLavoroV3` è già costruita in 3a, il follow-up è «montala nel pannello + 1 fetch + sheet laterale».

---

## 9. Errori, motion, testing

- **Errori:** ogni PATCH per-riga e ogni marcatura fase è ottimistica con rollback + `Avviso` (L6). Nessuna scrittura silenziosa.
- **Motion:** solo da `src/design-system/motion.ts` (apertura Sheet, transizioni). Mai inline.
- **Testing (TDD):** unit sui componenti nuovi —
  - CardInfo: tap su RigaDato apre il Sheet giusto; salvataggio ottimistico + rollback su errore.
  - CardFasi: `CheckTondo` sulla fase attiva emette il PATCH corretto; una sola fase attiva.
  - Documenti hub: mostra solo le voci pertinenti; ogni voce punta all'endpoint giusto.
  - **Ponte `bridged`:** il form NON rende il tasto CONSEGNA quando `bridged` è true, **ma continua a rendere la barra Salva** (test di regressione: le modifiche ai tab a campi restano salvabili); `defaultTab` apre il tab richiesto.
  - Scheda-vista: CONSEGNA presente; abilitato+naviga a `/consegna` quando consegnabile, `disabled`+callout altrimenti; Rifacimento/Segnala compaiono solo alle condizioni di stato/ruolo; «Annulla lavoro» nel menu è presente e disabilitata.
- **Verifica (FASE 7):** `tsc --noEmit` + `vitest run` + `next build`, tutti con output reale. Baseline attesa: 1561 pass | 4 skipped + i nuovi test.
- **QA browser (FASE 9):** lab E2E (`00000000-…-0001`, **mai** lab Filippo), 3 viewport × 2 temi. Verifiche chiave: modifica per-riga persiste; CONSEGNA abilitato su lavoro consegnabile porta a `/consegna` (e disabled+callout su lavoro non consegnabile); coerenza pila/scheda nel desktop split; le modifiche nei tab a ponte restano salvabili (barra Salva presente); Documenti scarica i file reali; Rifacimento/Segnala contestuali; «Annulla lavoro» disabilitata.

---

## 10. Invarianti e non-obiettivi

**Invarianti:**
- Zero API nuove (tutti gli endpoint esistono: PATCH lavoro, PATCH fasi, rifacimento, segnala, immagini, prove, lavorazioni, ifu/etichetta/ricevuta/scheda-fabbricazione, DdC). Reso possibile dal rimando di «Annulla lavoro» (unica voce che avrebbe richiesto backend nuovo).
- Zero migration.
- Zero dominio fiscale/MDR nuovo (N4 in 3b; backend Annulla lavoro in stage dedicato).
- La scheda-vista è 100% v3; il residuo v2.3 vive solo nella route-ponte `/lavori/[id]/modifica` e nel flusso `/consegna` v2.3 (raggiunto dal tasto CONSEGNA come già dalla pila), entrambi eliminati/sostituiti nelle ondate successive.

**Non-obiettivi (rimandati):**
- Riscrittura del flusso Consegna in-scheda + morte di `/consegna` → **4b** (in 3a il tasto usa il flusso esistente).
- Flussi Prezzi&lavorazioni / Dati clinici / Prove / Foto nativi + N4 → **3b**.
- Flusso «Produzione» nativo (editing non-conformità di fase) → **3b**.
- Backend «Annulla lavoro» (soft-delete MDR-conforme) → **stage dedicato**.
- Upgrade del pannello destro della vista pile a `SchedaLavoroV3` interattiva (fetch `LavoroDettaglio` + sheet-as-panel 420px) → **follow-up desktop dedicato** (§8).

---

## 11. Punti aperti da fissare nel piano (non bloccanti)

1. **Banner annullo consegna in 3a:** l'`AnnullaConsegnaBanner` v2.3 esiste già (grace period). In 3a mostrarlo in resa v3 (riusa il percorso di annullo consegna esistente, `annulla-consegna`) o rimandarlo a 4b. Default proposto: portarlo in resa v3 se il percorso di annullo consegna è già funzionante oggi; altrimenti 4b.
2. **Campo «note»** della modifica per-riga: identificare la colonna esatta (`descrizione` vs nota dedicata) e la presenza in `PATCHABLE_FIELDS`.
3. **Banner segnalazione non risolta** (titolare/admin_rete «Segna risolta»): portarlo nella scheda-vista in 3a o rimandarlo, evitando doppioni con la route-ponte.
4. **Consegnabilità del tasto CONSEGNA:** confermare la fonte esatta di `l.consegnabile` usata dalla pila (adapter/derivazione E4) e riusarla identica nella scheda.
5. **Copy callout CONSEGNA disabled** e testo «prossimamente» della voce Annulla lavoro disabilitata.
6. Verificare che la route-ponte con `bridged` non lasci affordance residue verso `/consegna` in nessuno dei tab (audit dei tab per link/navigazioni interne autonome alla consegna).
7. **Stage dedicato «Annulla lavoro»:** aprire un item di backlog per il design del soft-delete lavoro MDR-conforme (conseguenze su DdC/consegnato/fatturato).

---

## 12. Riferimenti codice (stato attuale)

- Scheda: `src/app/(app)/lavori/[id]/page.tsx` (v2.3 da riscrivere).
- Form monolitico: `src/components/features/lavori/LavoroFormClient.tsx` (455) + `form/LavoroFormShell.tsx` (`defaultTab?: TabId` già presente).
- Tab: `form/Tab{Dati,Date,Produzione,Lavorazioni,Immagini,Documenti,Accettazione,Clinica}.tsx` + `TabProve.tsx` (~4300 righe totali).
- API: `PATCH /api/lavori/[id]` (allowlist `PATCHABLE_FIELDS`), `PATCH …/fasi/[id]`, `POST …/rifacimento`, `POST …/segnala`, `…/ifu|etichetta|ricevuta-consegna|scheda-fabbricazione`.
- Componenti ds v3 disponibili: `CardInfo`, `RigaFase`, `Sheet`, `TastoPrimario/Secondario/Tondo`, `NotaDentista`, `DialogConferma`, `TileScelta`, `RigaCerca`, `CampoData`/`Campo`, `ChipScelta`, `Pill`/`PillFase`, `Avviso`.
- Mockup: `docs/design/mockups/2026-07-09-il-cuore/scheda-lavoro.html`.

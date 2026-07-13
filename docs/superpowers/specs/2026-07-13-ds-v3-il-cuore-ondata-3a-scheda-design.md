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

**Invarianti 3a:** zero API nuove · zero migration · zero dominio fiscale · scheda-vista 100% v3 · `CONSEGNA` disabled (4b la riabilita).

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
- Voce ⋯ **Annulla lavoro** → `DialogConferma` (§6.2).
- Voce ⋯ **Documenti** → hub download nativo (§6.3).
- `TastoSecondario` **Rifacimento** e **Segnala problema** contestuali (§3.4).
- Route-ponte `/lavori/[id]/modifica` con soppressione consegna (§7).

### 1.3 Resta a ponte v2.3 fino a 3b
- Voci ⋯ **Prezzi e lavorazioni** · **Dati clinici** · **Prove** · **Foto** → deep-link al form v2.3 esistente (§7).

### 1.4 Fuori da 3a (esplicitamente)
- Flusso Consegna (precheck → `DialogConferma` → esito) e morte di `/lavori/[id]/consegna` → **4b**.
- Decisione **N4** (fonte di verità del prezzo lavoro: `lavori.prezzo_unitario` vs righe `lavori_lavorazioni`) → **3b**, dentro «Prezzi e lavorazioni».
- Smontaggio nativo dei tab pesanti e flusso «Produzione» nativo → **3b**.

---

## 2. Decisioni ratificate (2026-07-13, Francesco)

| # | Decisione | Origine |
|---|---|---|
| D1 | Ondata 3 si decompone in **3a** (scheda-vista + editing comune + flussi leggeri) e **3b** (flussi pesanti nativi + N4). | Francesco |
| D2 | `TastoPrimario CONSEGNA` **presente ma disabilitato** in 3a (mai nascosto, con callout). Il flusso Consegna resta a 4b. | Francesco (Nodo 1) |
| D3 | **Regressione accettata**: tra il deploy di 3a e quello di 4b non si consegna dalla scheda. Nessun laboratorio reale in uso quotidiano; 4b arriva subito dopo. | Francesco (Nodo 1) |
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
`TastoPrimario CONSEGNA` **sempre presente, disabled in 3a**, mai nascosto. Callout sotto: «Disponibile a breve» (o «Completa il controllo finale per consegnare» quando le fasi non sono tutte fatte — la variante di copy si fissa nel piano). L'abilitazione reale (fasi complete + stato `pronto`/`in_ritardo`) è logica di 4b.

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
6. **Annulla lavoro** (rossa, staccata) → `DialogConferma` (§6.2)

### 6.2 Annulla lavoro
`DialogConferma` con oggetto esplicito (numero lavoro + effetto). Riusa il percorso di annullo/eliminazione lavoro esistente (soft-delete `deleted_at`). **Da fissare nel piano:** endpoint esatto (`DELETE`/`PATCH` esistente) e conseguenze MDR (la tracciabilità resta — è annullo, non cancellazione). Nessun nuovo endpoint se quello esistente basta.

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
- `bridged: boolean` — quando true **sopprime**:
  - il `TastoPrimario CONSEGNA` (righe 378-421) — **vincolo critico anti back-door consegna**: senza questo il ponte riaprirebbe il flusso consegna, cancellando la regressione D2/D3.
  - la barra azioni sticky (Salva + 📦 Documenti MDR + CONSEGNA). L'autosave per-campo di `useLavoroForm` e i salvataggi interni dei tab (Lavorazioni/Prove/Immagini via loro API) restano.
  - il pulsante «Segnala problema» / banner segnalazione se già portati nella scheda-vista (evitare doppioni) — **da fissare nel piano**.

**Header della route-ponte:** `TastoTondo ‹` back → `/lavori/[id]` (torna alla scheda-vista) + titolo `n.147`. Un guscio v3 attorno a contenuto v2.3: è il residuo v2.3 **fuori dalla scheda-vista**, esplicito e temporaneo, che 3b elimina sostituendo la destinazione dietro le stesse etichette.

**Perché route e non sheet:** back nativo, deep-link condivisibile, isolamento del residuo v2.3 in un URL dedicato. L'advisor concorda.

---

## 8. Responsive (§12 madre)

- **Mobile (390):** scheda piena; `Sheet` = bottom sheet; menu ⋯ = bottom sheet.
- **768 (split):** lista lavori 360 a sinistra + scheda a destra (pattern pila-aperta 768). `Sheet` → pannello laterale.
- **1280 (3 pannelli §12.3):** la scheda vive nel **pannello destro** (pattern Ondata 1 `SchedaAnteprima`); `Sheet` → pannello laterale **420px**.
- Entrambi i temi (light + dark). `data-ds="v3"` + `background: var(--bg)` sul page-root.

---

## 9. Errori, motion, testing

- **Errori:** ogni PATCH per-riga e ogni marcatura fase è ottimistica con rollback + `Avviso` (L6). Nessuna scrittura silenziosa.
- **Motion:** solo da `src/design-system/motion.ts` (apertura Sheet, transizioni). Mai inline.
- **Testing (TDD):** unit sui componenti nuovi —
  - CardInfo: tap su RigaDato apre il Sheet giusto; salvataggio ottimistico + rollback su errore.
  - CardFasi: `CheckTondo` sulla fase attiva emette il PATCH corretto; una sola fase attiva.
  - Documenti hub: mostra solo le voci pertinenti; ogni voce punta all'endpoint giusto.
  - **Ponte `bridged`:** il form NON rende CONSEGNA né la barra sticky quando `bridged` è true (test di regressione anti back-door consegna); `defaultTab` apre il tab richiesto.
  - Scheda-vista: CONSEGNA presente e `disabled`; Rifacimento/Segnala compaiono solo alle condizioni di stato/ruolo.
- **Verifica (FASE 7):** `tsc --noEmit` + `vitest run` + `next build`, tutti con output reale. Baseline attesa: 1561 pass | 4 skipped + i nuovi test.
- **QA browser (FASE 9):** lab E2E (`00000000-…-0001`, **mai** lab Filippo), 3 viewport × 2 temi. Verifiche chiave: modifica per-riga persiste; CONSEGNA disabled; il ponte NON permette di consegnare; Documenti scarica i file reali; Rifacimento/Segnala contestuali.

---

## 10. Invarianti e non-obiettivi

**Invarianti:**
- Zero API nuove (tutti gli endpoint esistono: PATCH lavoro, PATCH fasi, rifacimento, segnala, immagini, prove, lavorazioni, ifu/etichetta/ricevuta/scheda-fabbricazione, DdC).
- Zero migration.
- Zero dominio fiscale (N4 in 3b).
- La scheda-vista è 100% v3; il residuo v2.3 vive solo nella route-ponte `/lavori/[id]/modifica`.

**Non-obiettivi (rimandati):**
- Consegna funzionante dalla scheda → **4b**.
- Flussi Prezzi&lavorazioni / Dati clinici / Prove / Foto nativi + N4 → **3b**.
- Flusso «Produzione» nativo (editing non-conformità di fase) → **3b**.

---

## 11. Punti aperti da fissare nel piano (non bloccanti)

1. **Banner annullo in 3a:** mostrarlo disabilitato o rimandarlo del tutto a 4b (evitare azione morta). Default proposto: rimandare a 4b se l'annullo non è funzionale in 3a.
2. **Campo «note»** della modifica per-riga: identificare la colonna esatta (`descrizione` vs nota dedicata) e la presenza in `PATCHABLE_FIELDS`.
3. **Banner segnalazione non risolta** (titolare/admin_rete «Segna risolta»): portarlo nella scheda-vista in 3a o rimandarlo, evitando doppioni con la route-ponte.
4. **Annulla lavoro:** endpoint esatto (soft-delete) e copy del `DialogConferma`.
5. **Copy callout CONSEGNA disabled** («Disponibile a breve» vs «Completa il controllo finale»).
6. Verificare che la route-ponte con `bridged` non lasci affordance residue verso `/consegna` in nessuno dei tab (audit dei tab per link/navigazioni interne alla consegna).

---

## 12. Riferimenti codice (stato attuale)

- Scheda: `src/app/(app)/lavori/[id]/page.tsx` (v2.3 da riscrivere).
- Form monolitico: `src/components/features/lavori/LavoroFormClient.tsx` (455) + `form/LavoroFormShell.tsx` (`defaultTab?: TabId` già presente).
- Tab: `form/Tab{Dati,Date,Produzione,Lavorazioni,Immagini,Documenti,Accettazione,Clinica}.tsx` + `TabProve.tsx` (~4300 righe totali).
- API: `PATCH /api/lavori/[id]` (allowlist `PATCHABLE_FIELDS`), `PATCH …/fasi/[id]`, `POST …/rifacimento`, `POST …/segnala`, `…/ifu|etichetta|ricevuta-consegna|scheda-fabbricazione`.
- Componenti ds v3 disponibili: `CardInfo`, `RigaFase`, `Sheet`, `TastoPrimario/Secondario/Tondo`, `NotaDentista`, `DialogConferma`, `TileScelta`, `RigaCerca`, `CampoData`/`Campo`, `ChipScelta`, `Pill`/`PillFase`, `Avviso`.
- Mockup: `docs/design/mockups/2026-07-09-il-cuore/scheda-lavoro.html`.

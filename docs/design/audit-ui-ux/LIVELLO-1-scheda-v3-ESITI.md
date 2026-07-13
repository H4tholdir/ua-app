# Livello 1 — Esiti audit estetico: Scheda lavoro v3

> **Data:** 2026-07-13 · **Worktree:** `polish-scheda-v3` · **Server:** dev `:3013` · **Lab:** E2E `…0001` (mai lab Filippo).
> **Superfici auditate:** `/lavori/[id]` (0004 ricevuto, 0005 consegnato) + sheet (Menu, Documenti, ModificaRiga) + route-ponte `/lavori/[id]/modifica`.
> **Coperto live:** mobile 390 (L+D), tablet 768 (L), desktop 1280 (L+D) su 0004; mobile 390 L su 0005 + sheet + ponte.
> **Legenda:** ✅ conforme · ⚠️ Minor · ❌ da fixare.

---

## A. Tabella esiti (checklist 12 sezioni)

| # | Sezione | Esito | Nota (file:riga) |
|---|---------|-------|------------------|
| 1 | Layout & allineamento | ❌ | Header desktop: back `‹`+numero+pill+`⋯` ancorati alla card (`.scheda-v3-centrata` max-640) mentre l'**avatar globale** è ancorato al viewport top-right → orfano/disallineato (`SchedaLavoroV3.tsx:182`, avatar da AppHeader). |
| 2 | Proporzioni & spazio | ❌ | **Spazio morto desktop 1280**: card 640 centrata lascia ~60% del viewport vuoto (`ds-v3.css:96`). Presente anche su 768. È l'item estetico più evidente (difetto noto #1). |
| 3 | Sovrapposizioni & z-index | ❌ | **Mobile 390 overflow header**: back clippato a sx, avatar **sovrapposto** alla pill, `⋯` tagliato a dx. Peggiora con pill lunga ("CONSEGNATO"). Root: header (`:182`) non riserva spazio all'avatar globale. |
| 4 | Tipografia & gerarchia | ⚠️ | `fontSize: 21` inline sul numero (`:184`) invece di token tipografico v3. Gerarchia complessiva buona; DM Sans ovunque ✅. |
| 5 | Colore, contrasto, tema | ⚠️ | Scheda: token v3 ok, dark=flat ✅. **Aloni chiari** attorno ad angoli header/bottom-nav in dark → sospetta shadow gloss (da verificare). **Route-ponte**: tab attivo **oro `#D4A843`** + "Totale" oro (off-brand v3, contrasto). |
| 6 | Motion & micro-interazioni | ⚠️ | Scheda usa motion v3. **RifacimentoButton** importa `@/design-system/motion` (v2), non v3 (`RifacimentoButton.tsx:5`). |
| 7 | Suono & haptic | ⏸️ | Non verificabile a fondo via browser pane (autoplay policy). Da confermare in QA finale. |
| 8 | Touch target & interazione | ✅ | Righe editabili, TastoTondo, voci sheet ≥44px. Sheet con handle e swipe ok. |
| 9 | Stati (empty/loading/error/disabled) | ⚠️ | Empty paziente="—" ok; **manca affordance "aggiungi prima nota"** (difetto noto #5). Disabled CONSEGNA = **testo nudo** (`motivoDisabilitato`) vs AvvisoTracciabilità = box → 2 stili callout. |
| 10 | Responsive (3 viewport) | ❌ | 390 header overflow (§3); 768/1280 spazio morto (§2). Tablet header allineato meglio. |
| 11 | Accessibilità | ❌ | **`:focus-visible` assente** nei componenti scheda-v3 (grep vuoto, difetto noto #3). **`aria-label="Modifica scadenza"`** diverge da riga visibile "Consegna" — WCAG 2.5.3 label-in-name (`:215`, difetto noto #4). |
| 12 | Copy & microcopy | ❌ | **Copy errata**: lavoro `consegnato` mostra CONSEGNA disabled con "Completa il controllo finale per consegnare" — `motivoDisabilitato` hardcoded per ogni stato (`:251`). Ridondanza titolo/label in ModificaRigaSheet consegna. |

---

## B. Difetti puntuali (con azione proposta)

### Blocco 1 — Approvazione visiva Francesco richiesta (cambi di layout)
| ID | Difetto | Proposta |
|----|---------|----------|
| D1 | **Spazio morto desktop 1280** (`ds-v3.css:96`) | Layout desktop più ricco: (a) card 640 + **pannello laterale** (azioni/riepilogo/documenti), oppure (b) card più larga con contenuto a 2 colonne, oppure (c) card centrata + hero visivo. **→ scelta Francesco.** |
| D2 | **Avatar orfano vs card** (header) | Ancorare header e avatar alla stessa colonna: (a) avatar dentro la colonna card su desktop, oppure (b) togliere l'avatar dalla route (coerente con Ondata 1: `isV3MigratedRoute`). **→ scelta Francesco.** |

### Blocco 2 — Fix diretti (a11y/token/copy/spacing — procedibili senza gate)
| ID | Difetto | Fix | File |
|----|---------|-----|------|
| D3 | Header overflow mobile 390 (overlap pill/avatar/`⋯`) | Riservare spazio avatar / gestire wrap-truncation della pill / min-width back | `SchedaLavoroV3.tsx:182` |
| D4 | `:focus-visible` assente su bottoni inline v3 | Aggiungere ring focus-visible v3 (RigaEditabile, NotaLaboratorio, voci sheet) | scheda-v3/* |
| D5 | `aria-label="Modifica scadenza"` ≠ "Consegna" | Allineare a "Modifica consegna" + aggiornare query test | `SchedaLavoroV3.tsx:215,430` |
| D6 | Copy CONSEGNA disabled errata su `consegnato` | `motivoDisabilitato` state-aware (consegnato → nessun motivo / "Già consegnato") | `SchedaLavoroV3.tsx:251` |
| D7 | Callout disabled = testo nudo vs box | Uniformare stile callout (box coerente con AvvisoTracciabilità) | TastoPrimario / scheda |
| D8 | `fontSize:21` inline numero | Sostituire con token tipografico v3 | `SchedaLavoroV3.tsx:184` |
| D9 | RifacimentoButton token/shadow v2 (gloss `rgba(255,255,255,.78)` > 0.32; motion v2) | Portare a token/shadow/motion v3 | `RifacimentoButton.tsx:5,131` |
| D10 | Empty-note: manca "aggiungi prima nota" | Affordance empty-state per la prima nota | `SchedaLavoroV3.tsx:226` |

### Blocco 3 — Da valutare / probabile defer 3b
| ID | Difetto | Nota |
|----|---------|------|
| D11 | Route-ponte: tab oro + Totale oro + ombre v2.3 | Coerenza header v3 ↔ form v2.3. Riscrittura form = **3b**; qui al più ritocco header/oro. |
| D12 | Incoerenza righe tra MenuSchedaSheet (con icone) e DocumentiSheet (senza) | Uniformare trattamento righe sheet. |
| D13 | Bottom-nav resta color panna in dark su questa route | Verificare se intenzionale (glass) o incoerenza tema. |

---

## C. Non coperto (richiede fixture/mutazione — decisione al gate)
- Stato **pronto/in_ritardo** → CONSEGNA **enabled** (stile primario abilitato): richiede mutazione SQL temporanea di 0004 (+ ripristino baseline).
- **NotaLaboratorio** presente, **CardFasiV3** con gesto FATTA, assegnazione tecnico: lab E2E ha 0 tecnici/0 fasi → fixture minime o verifica unit.
- **Suoni/haptic** eventi (§7): QA finale.

## D. Cleanup
Baseline DB E2E invariata (nessuna mutazione eseguita in questo audit; solo letture). 3 lavori al baseline.

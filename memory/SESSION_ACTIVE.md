# Sessione attiva — l'uscita dei quattro strati è FATTA (D99 · D100), ramo non mergiato

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-02-ondata-b-chiusa-handoff.md`** — la sua §0 è **CHIUSA**.

⏱️ **Fatto:** visore, tendina e i due fogli **animano l'uscita**. Simmetrica (`molla.smooth`), che è ciò
che §5.39 diceva già: **nessun emendamento alla spec**. Lo strato in uscita **smette di prendere i tocchi**
(`StratoRadice.tsx`, `useIsPresent`) e lo scorrimento si rilascia **a uscita finita**
(`useScorrimentoBloccato.ts`). Il montaggio NON è cambiato: gli strati restano montati sempre.

🛑 **Ramo `uscita-quattro-strati`, commit `ceb5f222` + `009d002d` — NON mergiato, in attesa di
autorizzazione.** `main` è ancora `56150f7b`.

✅ **Verifiche:** `tsc` 0 · `vitest` **370|3** file e **4256|19** prove (due corse) · `next build` ok ·
guardia navigazione-overlay **verde sul braccio dell'album** (con `LAVORO_ID` di un lavoro con foto).

⚠️ **Riferiti e non corretti (R-E2):** `Sheet` non usa il nuovo hook dello scorrimento · la tabella dei
numeri a parole di `scripts/guardia-coerenza-documenti.mjs` **finisce a «cento»** e il verbale è **a cento**:
la prossima decisione spegne il controllo del conteggio in silenzio · l'orologio del Mac dice 31/07, i
documenti 02/08.

📎 Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **cento** decisioni. Prossima: **D101**.

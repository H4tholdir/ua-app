# Sessione attiva — l'uscita dei quattro strati è FATTA (D99 · D100), ramo non mergiato

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-02-ondata-b-chiusa-handoff.md`** — la sua §0 è **CHIUSA**.

⏱️ **Fatto:** visore, tendina e i due fogli **animano l'uscita**. Simmetrica (`molla.smooth`), che è ciò
che §5.39 diceva già: **nessun emendamento alla spec**. Lo strato in uscita **smette di prendere i tocchi**
(`StratoRadice.tsx`, `useIsPresent`) e lo scorrimento si rilascia **a uscita finita**
(`useScorrimentoBloccato.ts`). Il montaggio NON è cambiato: gli strati restano montati sempre.

🚀 **IN PRODUZIONE.** `main` = `8ad360db`, mergiato in avanti (4 commit), CI verde, deploy Vercel `success`,
**uachelab.com verificato dal vivo**: a metà uscita velo 0,27 e pannello 0,27 — si dissolvono insieme — e i
tocchi sono già spenti. Niente a metà, niente da salvare.

🔧 **Riparata anche la guardia dei documenti** (`scripts/guardia-coerenza-documenti.mjs`): i numeri a parole
si **costruiscono** da 0 a 999 invece di essere elencati a mano (1107 grafie, era 108 e finiva a «cento»
mentre il verbale arrivava a cento), e «dichiarato ma illeggibile» non si traveste più da «non dichiarato» —
era un avviso che diceva il falso, ora è un errore. Provata accendendola apposta in tre modi.

✅ **Verifiche:** `tsc` 0 · `vitest` **370|3** file e **4256|19** prove (due corse) · `next build` ok ·
guardia navigazione-overlay **verde sul braccio dell'album** (con `LAVORO_ID` di un lavoro con foto).

⚠️ **Restano riferiti e non corretti (R-E2):** `Sheet` non usa il nuovo hook dello scorrimento (condiviso e
in produzione, fuori mandato) · il **primo braccio** della guardia navigazione-overlay non è misurato da
tempo: gli serve la fixture `E2E-CAS-002` in banca dati · l'orologio del Mac dice **31/07**, i documenti
**02/08**.

➡️ **Da qui si riparte dalle voci pronte dell'handoff §4:** voce 2 (avviso su dente/colore mancanti) ·
voce 3 (⚠️ prima verificare se il colore compaia nella DdC) · voce 6 (le tinte del manufatto, D42) ·
voce 7 (allegati e condivisione, D67).

📎 Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **cento** decisioni. Prossima: **D101**.

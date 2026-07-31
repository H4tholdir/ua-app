# Sessione attiva — ondata (b): la SETTIMA categoria è FATTA e in banca dati (02/08/2026)

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-02-prescrizione-settima-categoria-brief.md`** — **D91: la
prescrizione diventa la SETTIMA categoria della foto.** Il brief porta il censimento già fatto (i **tre**
posti che si muovono insieme, i **tredici** file che consumano l'elenco, le **tre** prove che contano «sei»).
✅ **TUTTE E QUATTRO le domande del brief sono chiuse — D92-D97 — e IL LAVORO È FATTO.** Nome **«Prescrizione»** ·
emoji **🩺** · posto **quinto, subito prima della radiografia** (🛑 **D92 è una RETTIFICA**: il brief la voleva
**in testa**, ma la prima del primo gruppo è la foto grande della carta) · la spaiata è **«Altro» come riga di
chiusura a tutta larghezza** (D95, variante A2 del mockup `docs/design/mockups/2026-08-02-foglio-categoria-sette-pastiglie.html`).
**Toccati:** migration nuova `20260802090000_lavori_immagini_categoria_prescrizione.sql` (`DROP`+`ADD CONSTRAINT`,
**nessun backfill**) · `categorie-foto.ts` · `FoglioCategoria.tsx` · `FrameFatto.tsx` → **`'prescrizione'`** (D97) ·
la **spia** ora punta al vincolo in vigore (🛑 scartata la scansione automatica: verde silenzioso al posto di un
rosso rumoroso). 🚦 **FASE 7:** `tsc` **0** · `vitest` **368 | 3** e **4219 | 19** (+12) · build ok. **FASE 6b:** tipi
rigenerati **identici** (`categoria` esce `string`, R27).
🔴 **DIFETTO DI RILASCIO TROVATO E RIPARATO (D96), e c'era già con SEI categorie:** a testo 200 % la griglia usciva
dal foglio. ✅ **Provato nell'app vera** (accesso col titolare E2E, `scripts/seed-e2e.ts`): la chiave che regge è
**`overflowWrap:'anywhere'`** sull'etichetta (0 px fuori); **`minmax(0,1fr)` da solo NON basta** (9 px a 768, 54 a 390).
La misura ha corretto il commento che stavo scrivendo — non solo quello vecchio.
✅ **R-P1 FATTA:** la migration è stata eseguita dentro `BEGIN … ROLLBACK` sul database vero (🛑 transazione
**annullata**, ledger fermo): `'pippo'` **rifiutato** `23514` · **`'Prescrizione'` con la maiuscola RIFIUTATO** —
il valore è `'prescrizione'` · `'prescrizione'` e `'rx'` accettati. Il blocco `provato:` è in testa alla migration.
✅ **MIGRATION APPLICATA il 02/08** (`supabase db push`, autorizzato da Francesco): era l'unica non registrata
(89 su 90 già remote). **Verificata sul database vero:** il vincolo in vigore porta le sette voci · `categoria`
resta `NOT NULL` **senza default** · `'pippo'`, `'Prescrizione'` e la stringa vuota **rifiutati** `23514`, le sette
buone accettate (prove dentro `BEGIN…ROLLBACK`: nessun dato toccato) · ledger: `20260802090000` in testa.
**FASE 6b ripetuta dopo l'apply:** tipi rigenerati **identici**, `tsc` 0.
✅ **T12 FATTO sulla SCHEDA (02/08):** i due bottoni che non aprivano niente ora aprono — «⤢ Apri» monta
`VisoreFoto`, la pastiglia monta `FoglioCategoria` (correzione, D70) — e dal ⋯ del visore si elimina passando
da `TendinaMenu` → `FoglioConferma` col testo VERBATIM di §5.42. 🛑 **I quattro strati sono montati FRATELLI**
in `SchedaLavoroV3`, **non** dentro `VisoreFoto`: ⚠️ **il piano diceva «modifica VisoreFoto (aggancia menù e
conferma)» e contraddice il contratto scritto nel componente** (`VisoreFoto.tsx:33-35`) — si è seguito il
contratto, il piano è **riferito** (R-E2). Su lavoro **consegnato** la voce «Elimina foto» **non è offerta**
(il server dà 409). Rimozione **ottimistica** dallo specchio locale + `router.refresh()`. Prove:
`tests/unit/scheda-v3/scheda-album-elimina.test.tsx`, **10**, fra cui il controllo positivo «annullare non
chiama niente» (mutazione provata: accende **1 su 10**) e «un rerender non sposta il focus».
🔴 **DIFETTO TROVATO SOLO NEL BROWSER, e riparato (02/08):** il visore si apriva e si **richiudeva da solo**.
Causa: gli strati erano montati **dentro una condizione** (`{fotoVisore && …}`), quindi il loro ciclo di vita
seguiva l'apertura; in sviluppo React monta due volte, e la sequenza `entraOverlay → pushState` · `esciOverlay →
history.back()` · `entraOverlay → pushState` faceva arrivare **dopo** un `popstate` che `storia-overlay.ts:101`
leggeva come «indietro» dell'utente. 🔑 **REGOLA GENERALE, non un caso di questa scheda: gli overlay v3 si
montano SEMPRE e si pilotano con `aperto`** — rendono `null` da soli (`VisoreFoto.tsx:142`). ⚠️ **Nessuna prova
in `vitest` poteva vederlo**: jsdom non esegue la traversal di `history.back()`, quindi il popstate non arriva
mai. La rete ora c'è ed è di un'altra specie: si contano gli ingressi nella storia degli overlay (**uno** per
apertura, in Strict Mode) — quella prova, tolta la correzione, si accende (2 invece di 1).
🔴 **RESTA DI T12 — una lacuna del piano, da decidere:** il Passo 3 chiede la rimozione dallo stato anche in
`LavoroFormClient` (`:128`), ma **la pagina di modifica non ha né carta album né visore** (TabImmagini ha
ancora la sua griglia; la migrazione di quella route a v3 è **ondata propria**, spec §10). Un `onRemove` lì
sarebbe **codice morto**: non è stato aggiunto. La spec §1 però prevede la carta «*sulla scheda del lavoro **e
sulla modifica***» → **serve una decisione di perimetro.**
➡️ **Poi:** **T13** (FASE 7 · FASE 9 nel browser · gate estetico L2).
📎 Da dove veniamo: `docs/roadmap/2026-08-01-t11-referto.md` · prima: `…-t10-referto.md` · `…-t9-bis-referto.md`
📎 Ledger vivo dell'esecuzione: `.superpowers/sdd/progress.md` — 🛑 **cartella IGNORATA da git**, esiste solo su questa macchina.

**Ramo `ondata-b-schermate`** — niente su `origin`. ✅ **Fatti: T1 → T9-bis, T10, T11, T11-bis, T12.** Resta **T13**.
🔑 **Riferimento MISURATO il 01/08 a T11-bis chiuso:** `vitest` **368 | 3** file, **4207 | 19** prove · `tsc` **0** · `next build` ok.

🔑 **Da T9-bis in poi si esegue con `subagent-driven-development`** (esecutore fresco per compito + revisione
indipendente in mezzo), che è ciò che R-E1 prescrive. **Alla prima applicazione la revisione ha bocciato la
consegna su entrambi i verdetti e ha trovato un conteggio `N su M` GONFIATO** («4 su 37» → **3 su 47** con un
abbozzo davvero inerte). Il metodo si tiene.

**Lo stato dell'innesto:** ✅ **TUTTI E QUATTRO GLI STRATI SONO MONTATI.** `CartaAlbum` (§5.38) sulla scheda e
nel catalogo (T10) · `FoglioCategoria` (§5.41) nel caricamento foto (T11) e nella correzione dalla scheda (T12) ·
`VisoreFoto` (§5.39) · `TendinaMenu` (§5.40) · `FoglioConferma` (§5.42) montati dalla scheda da **T12**, come
**fratelli**. La trappola dell'**identità di `ancoraFocus`** (ref stabile, mai un letterale inline) è chiusa in
entrambi i chiamanti, con una prova che la sorveglia.

✅ **CHIUSO da T12 (02/08):** i due bottoni della scheda che non aprivano niente — «⤢ Apri» (che **vibrava**
a vuoto) e la pastiglia della categoria — ora aprono davvero. Restava il blocco alla produzione: non c'è più.
**T13** (FASE 7 + FASE 9 nel browser + gate estetico L2) resta prima del merge.

✅ **DECISA, ed è D91:** la foto della prescrizione viaggiava con l'etichetta `'prescrizione'`, che non era
fra le sei categorie; T11-bis l'ha instradata su `'altro'` **come ripiego dichiarato**, e Francesco ha deciso
che **la prescrizione diventa una categoria a pieno titolo**. 🛑 **Quel codice non è una scelta ponderata da
rispettare: è ciò che il prossimo lavoro sostituisce.**

🔴 **QUATTRO COSE CHE I BRIEF DI T10-T13 DEVONO PORTARSI, o si perdono nel passaggio:**
1. **L'`exit` non gira su NESSUNO dei quattro strati** (nessuno monta `AnimatePresence`; in `src/` esiste solo in
   `Sheet`, `DialogConferma`, `RigaFase`, `Avviso`). **Si decide INSIEME al gate estetico L2 (T13)**, mai per un
   componente solo.
2. **L'effect del focus dipende dall'IDENTITÀ di `ancoraFocus`** (`FoglioCategoria.tsx:183` e `FoglioConferma`):
   un chiamante che passa un letterale inline `{ current: x }` si fa **strappare il cursore** a ogni rerender.
   **I chiamanti veri sono T10-T12: si chiude lì.**
3. **T12 deve portarsi il testo ratificato di §5.42 VERBATIM** e il `<strong>` su «e dall'archivio»: il componente
   prova solo di **non troncare** ciò che riceve.
4. ✅ **CHIUSO da T12:** l'innesco della tendina è un `<button>` scritto nel chiamante (non `TastoTondo`, che
   non ha `aria-haspopup`/`aria-expanded`) e consuma `sopraFoto.facciaAttiva`, che era a zero usi.
   ⚠️ Resta la lezione: la riga che assegnava questo lavoro a T10 era sbagliata ed è passata senza che nessuno
   la eseguisse — un documento vivo che assegna un lavoro a un task che non lo farà è il modo in cui un lavoro
   si perde.

🚦 **TRE PROVE DI BROWSER DOVUTE A T13 (FASE 9b) — nessuna gira in vitest:**
① **`FoglioCategoria` a text-zoom 200%, a 390 e 768** (§5.41 la chiama «la prova di questo componente», §13.3 la
rende requisito di **rilascio**) · ② **`scripts/guardia-navigazione-overlay.mjs`**, che nessun task da T6 in poi ha
potuto lanciare (⚠️ **cieca** a `TendinaMenu`: `role="menu"` senza `aria-modal`) · ③ **screenshot 390/768/1280 ×
chiaro/scuro**, e con essi **il contrasto di «Annulla» in scuro dentro `FoglioConferma`**: `TastoSecondario` e il
pannello userebbero **lo stesso `var(--elv)`**, distinti da una hairline al 6% (misurato su `ds-v3.css:13/48/65-68`;
il rimedio di casa esiste già a `ds-v3.css:83-87`).

⚠️ **Difetto di forma del piano, TRE task su tre** (T8, T9, T9-bis): un riquadro «MANDATO CORRETTO» corregge la
testa del task e **il corpo resta a dire il contrario** — e il corpo è dove stanno i passi da eseguire. In T9-bis
erano sbagliate **una prova e una mutazione**. **Chi apre un task nuovo legga PRIMA il riquadro, poi il corpo.**

🔴 **Restano aperti:** ✅ *(chiuso il 02/08: la roadmap ora dice «ondata (b) IN ESECUZIONE», col punto di ripresa)* ·
`MenuVoce` col chevron sulla distruttiva (F-6) · **R27** · **R29 + D81** (foto rotte su uachelab.com fino al merge,
**T13**) · **FM-8** · tredici overlay di `src/components/features/**` che promettono `aria-modal` senza mantenerlo ·
**cinque Minori di T9-bis** a verbale per la **revisione finale di ramo** (elencati nel suo referto §6).

➡️ Verbale (`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`): **novantasette** decisioni in ventinove tornate — le ultime sono **D92-D97** (ordine, nome, emoji, griglia, rimedio del testo grande, il punto del wizard). La prossima è **D98**.

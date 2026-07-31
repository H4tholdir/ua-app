# Sessione attiva — ondata (b) IN PRODUZIONE, e il guasto delle foto è chiuso (02/08/2026)

🚀 **PUBBLICATA: `main` → `origin/main` (`e845fc78 → d890545a`, 120 commit).** CI **verde** (TypeScript + ESLint
+ prove · Next.js Build · Deploy to Production), messa in linea Vercel **success** su https://uachelab.com.
✅ **IL GUASTO VIVO DAL 30/07 È CHIUSO, e non per deduzione: misurato.** Caricata una foto **vera** (una
finta radiografia scura, generata apposta) su uachelab.com → **`POST 201`** dove prima rispondeva **500**; il
foglio ha chiesto la categoria con **sette** pastiglie; la foto è comparsa sulla scheda come «Radiografia».
✅ **E in produzione ha funzionato anche il giro nuovo per intero:** visore → tendina → conferma → eliminata,
sparita dopo il ricarico. Il banco è stato **ripulito**: la foto di prova non è rimasta lì.
🎨 **Il giudizio estetico che mancava, ora dato — con una foto VERA e scura (§5.39, il «caso peggiore»):**
✅ i controlli del visore reggono, perché ognuno porta la **propria faccia e il proprio anello** e non si
appoggia alla sfumatura. ⚠️ **RILIEVO NUOVO, riferito e non corretto:** in tema **chiaro** il velo
(`rgba(9,7,5,.94)`, valore ratificato) lascia **leggere** il testo della scheda dietro la foto — «DENTISTA»,
«Studio Bianchi», la carta album in fondo. Non tocca il contrasto dei controlli, ma è rumore dietro la
fotografia. `provato:` velo misurato a riposo dopo 5s — copre 390×844, opacità 1: **non è un'animazione a
metà**, è il 6% di trasparenza su un fondo chiaro. ➡️ Da decidere: alzare il velo verso l'opaco **solo in
tema chiaro**, o tenerlo così.


🚀 **MERGE FATTO (02/08): `ondata-b-schermate` → `main`, fast-forward pulito, 118 commit.** `tsc` 0 · `vitest`
**369 | 3** file, **4233 | 19** prove · `next build` ok, verificati **su main** dopo il merge.
🔒 **E prima del merge si sono chiusi TOK-1 e CLI-1, come D53 prescriveva** (commit `6f25f075`): la chiave del
portale non esce più dall'elenco dei dentisti — **due fonti**, la proiezione e una allowlist in uscita
(`CAMPI_ELENCO`), perché la sola proiezione lascerebbe rientrare il token in silenzio da una vista o da un
`select('*')` rimesso un domani — e la ricerca rende **letterali** `%` e `_` (ordine di D48). Tre prove nuove.
🧹 Gli **11 file di `.superpowers/`** tracciati contro il `.gitignore` sono usciti dall'indice (restano sul disco).
🛑 **IL PUSH NON È STATO FATTO:** il comando è stato **bloccato dal controllo dei permessi**, non da un errore.
`main` locale è avanti di 118 commit su `origin/main`. ➡️ **Serve che Francesco lanci `git push origin main`**
(o autorizzi il comando), poi: **CI verde su Vercel** → **verifica su uachelab.com**.
🔴 **E SUBITO DOPO IL PUSH, il Passo 4-bis di T13 — non è un collaudo fra i tanti:** dal 30/07 il caricamento di
una foto su uachelab.com risponde **500** (il codice pubblicato scriveva ancora la colonna `tipo`, tolta dalla
migration di T1 — D81/R29). **Il merge lo ripara: va caricata una foto VERA e vista comparire.** Con foto vere
va anche dato il giudizio estetico che il gate L2 non ha potuto dare (le prove usavano PNG 1×1 trasparenti).


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
✅ **T13 FATTO (02/08), tranne l'ultimo passo che dipende dal merge.**
**Passo 1 — FASE 7:** `tsc` **0** · `vitest` **369 | 3** file, **4230 | 19** prove · `next build` ok, con
`ƒ /api/lavori/[id]/immagini/[imgId]` in tabella.
**Passo 2 — 🚦 LA GUARDIA DEGLI OVERLAY HA GIRATO, ED È VERDE (uscita 0).** Non girava da T6. Le serviva una
build di produzione (aggiunta la configurazione **`ua-prod-3020`**) e la fixture di E2E-CAS-002, preparata e
**rimessa com'era**. ✅ **Aggiunto il quarto braccio, quello dell'album:** indietro chiude **la tendina** e
lascia il visore aperto sotto · indietro sulla conferma **annulla** (verificato sul DATO, dopo un ricarico).
🔧 **E il terzo braccio dava un rosso FALSO:** cliccava la *prima* cassetta, e una cassetta **occupata** porta
al suo lavoro invece di aprire lo sheet. Ora cerca le **libere** (`.is-libera`) e dichiara «non misurato» se
non ce ne sono.
**Passo 3 — FASE 9 nel browser vero, 390/768/1280 × chiaro e scuro:** tre foto insieme → «Che foto sono? La
scelta vale per tutte e 3» · foglio chiuso con `Escape` → le foto **nascono lo stesso** (D74) · visore, 10
miniature, scorrimento · categoria corretta **dal visore**, e **il visore resta aperto** · conferma annullata,
niente eliminato · a 768 e 1280 il foglio resta a **480px**. 🛑 **Banco riportato com'era:** foto del collaudo
eliminate, **294** lavori, fixture ripristinata.
**Passo 4 — GATE ESTETICO L2:** ✅ **risolto il rilievo previsto** — in scuro «Annulla» spariva dentro il
pannello (stessa faccia `var(--elv)`, contorno `--line` invisibile). Rimedio **scoped** in `ds-v3.css`, stessa
forma già usata dal progetto per gli sheet: dentro `.ds-foglioconferma-pannello` il tasto scende a
`var(--card)` e il contorno sale a `--faint`. `TastoSecondario` **non cambia da nessun'altra parte**, e in
chiaro la regola non esiste. Screenshot prima/dopo (25 file) in `docs/design/screenshots/2026-07-30-album-foto/`,
tracciati con `git add -f`.
⚠️ **LIMITE DEL GATE, dichiarato:** le foto di prova sono PNG **1×1 trasparenti**, quindi il giudizio sui
controlli **sopra una fotografia vera** — che §5.39 chiama il caso peggiore («la radiografia») — **non è stato
dato**. Va fatto con foto vere, insieme al Passo 4-bis.
🔴 **RESTA SOLO IL PASSO 4-BIS, e dipende dal merge:** dal 30/07 su `uachelab.com` il caricamento di una foto
risponde **500** (il codice pubblicato scrive ancora la colonna `tipo`, tolta dalla migration di T1 — D81/R29).
Francesco ha scelto di lasciarlo fino al merge. ➡️ **Dopo il merge, e prima di dichiarare chiusa l'ondata:
caricare una foto vera su uachelab.com e vederla comparire.**
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

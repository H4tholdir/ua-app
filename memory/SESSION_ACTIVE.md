# Sessione attiva — ondata (b): T9-bis FATTO, il BLOCCO C è chiuso. Si riparte da T10 (01/08/2026)

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md`** → **BLOCCO D, Task 10**
(la carta album entra sulla scheda, e la striscia esce da tutti e tre i siti).
📎 Da dove veniamo: `docs/roadmap/2026-08-01-t9-bis-referto.md` · prima: `…-t9-referto.md` · `…-t8-referto.md`
📎 Ledger vivo dell'esecuzione: `.superpowers/sdd/progress.md` — 🛑 **cartella IGNORATA da git**, esiste solo su questa macchina.

**Ramo `ondata-b-schermate`** — niente su `origin`. ✅ **Fatti: T1 → T9-bis.** Il **blocco C (i quattro componenti nuovi) è CHIUSO.**
🔑 **Riferimento MISURATO il 01/08 a T9-bis chiuso:** `vitest` **368 | 3** file, **4192 | 19** prove · `tsc` **0** · `next build` ok.

🔑 **Da T9-bis in poi si esegue con `subagent-driven-development`** (esecutore fresco per compito + revisione
indipendente in mezzo), che è ciò che R-E1 prescrive. **Alla prima applicazione la revisione ha bocciato la
consegna su entrambi i verdetti e ha trovato un conteggio `N su M` GONFIATO** («4 su 37» → **3 su 47** con un
abbozzo davvero inerte). Il metodo si tiene.

**I quattro componenti pronti, nessuno montato da nessuna parte:**
`CartaAlbum` (§5.38) · `VisoreFoto` (§5.39) · `TendinaMenu` (§5.40) · `FoglioCategoria` (§5.41) · `FoglioConferma` (§5.42).

🔴 **QUATTRO COSE CHE I BRIEF DI T10-T13 DEVONO PORTARSI, o si perdono nel passaggio:**
1. **L'`exit` non gira su NESSUNO dei quattro strati** (nessuno monta `AnimatePresence`; in `src/` esiste solo in
   `Sheet`, `DialogConferma`, `RigaFase`, `Avviso`). **Si decide INSIEME al gate estetico L2 (T13)**, mai per un
   componente solo.
2. **L'effect del focus dipende dall'IDENTITÀ di `ancoraFocus`** (`FoglioCategoria.tsx:183` e `FoglioConferma`):
   un chiamante che passa un letterale inline `{ current: x }` si fa **strappare il cursore** a ogni rerender.
   **I chiamanti veri sono T10-T12: si chiude lì.**
3. **T12 deve portarsi il testo ratificato di §5.42 VERBATIM** e il `<strong>` su «e dall'archivio»: il componente
   prova solo di **non troncare** ciò che riceve.
4. **T10 monta l'innesco della tendina** → è lui che chiude `TastoTondo` senza `aria-haspopup`/`aria-expanded` e
   consuma `sopraFoto.facciaAttiva` (a zero usi, **non è un difetto**).

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

🔴 **Restano aperti:** `ROADMAP-UFFICIALE.md` dice ancora «ondata (b) *da pianificare*» — **prima del merge** ·
`MenuVoce` col chevron sulla distruttiva (F-6) · **R27** · **R29 + D81** (foto rotte su uachelab.com fino al merge,
**T13**) · **FM-8** · tredici overlay di `src/components/features/**` che promettono `aria-modal` senza mantenerlo ·
**cinque Minori di T9-bis** a verbale per la **revisione finale di ramo** (elencati nel suo referto §6).

➡️ Verbale (`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`) fermo a **novanta**: la prossima è **D91**.

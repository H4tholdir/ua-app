# Sessione attiva — ondata (b): T7 FATTO, si riparte da T8 `TendinaMenu` (31/07/2026)

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` → Task 8**
(riquadro «MANDATO CORRETTO»), a un **esecutore fresco** (R-E1). Da dove viene:
`docs/roadmap/2026-07-31-t7-referto.md`.
📎 Legge: spec v3 rev. 3.4 **§5.40** — `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`
📎 Regole comuni: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` §1.1-§1.12
📎 Verbale (**novanta** decisioni): `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`

**Ramo `ondata-b-schermate`** — niente su `origin`.
✅ **Fatti: T1 · T2 · T3 · T4 · T5 · T5-bis · RATIFICA (D89) · T5-ter · D90 · T6 · T7.**
🔑 **Riferimento MISURATO il 31/07 a T7 chiuso:** `vitest` **365 | 3** file, **4066 | 19** prove ·
`tsc` **0** · `next build` ok.

🚦 **La prova obbligatoria di D86 è VERDE:** `Escape` dentro il visore chiude **solo** il visore, lo
`Sheet` sotto resta aperto. **Niente da riferire, `storia-overlay.ts` non si tocca.**

**Che cosa ha lasciato T7:** `src/components/ds/VisoreFoto.tsx` (47 prove). `ancoraFocus` è
**obbligatoria** (F-12), e la firma nel piano (`:1203`) non ce l'ha ancora. Il visore **non è montato da
nessuna parte** (T10). Dopo T7 di `sopraFoto` restano senza utente **due** valori: `facciaAttiva` e
`ombraPannello` — sono di T8.

🔴 **Da tenere presenti in T8:** z-index **1020** · **niente trappola del focus** (è `role="menu"`, non
`aria-modal`) · il `Tab` **chiude** la tendina e riporta il focus al ⋯ · `aria-haspopup="menu"` e
`aria-expanded` stanno **sull'innesco**, che è ciò che si passa a `azioni` del visore.
⚠️ **Due lacune dichiarate da T7, non difetti:** «riduci movimento» non è verificabile in jsdom (Motion
con `skipAnimations` lascia scritto l'`initial` — misurato: si guarda al gate estetico L2, T13) ·
`scripts/guardia-navigazione-overlay.mjs` va lanciata a **T10**, quando il visore entra sulla scheda.
🔴 **Restano aperti dai task prima:** **R27** (`tsc` non protegge le query) · **R29 + D81** (il
caricamento foto su uachelab.com è rotto fino al merge, si ripara in **T13**) · **FM-8** · **tredici**
overlay di `src/components/features/**` che promettono `aria-modal` senza mantenerlo (si migrano insieme).
🔴 **Riferito da T6 e ancora non deciso:** la **§5.38 non nomina mai `indiceAperto`** — se serve un
comportamento diverso da quello scelto, è una decisione di Francesco (la prossima è **D91**).

➡️ **Dopo T8: T9 → T9-bis, uno per esecutore.**

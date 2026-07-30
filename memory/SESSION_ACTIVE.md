# Sessione attiva — ondata (b): T6 FATTO, si riparte da T7 `VisoreFoto` (31/07/2026)

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` → Task 7**
(riquadro «MANDATO CORRETTO»), a un **esecutore fresco** (R-E1). Da dove viene:
`docs/roadmap/2026-07-31-t6-referto.md`.
📎 Legge: spec v3 rev. 3.4 **§5.39** — `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`
📎 Prove e vincoli: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md`
📎 Verbale (**novanta** decisioni): `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`

**Ramo `ondata-b-schermate`** — niente su `origin`.
✅ **Fatti: T1 · T2 · T3 · T4 · T5 · T5-bis · RATIFICA (D89) · T5-ter · D90 · T6.**
🔑 **Riferimento MISURATO il 31/07 a T6 chiuso:** `vitest` **364 | 3** file, **4018 | 19** prove ·
`tsc` **0** · `next build` ok.

**Che cosa ha lasciato T6:** `src/components/ds/CartaAlbum.tsx` (39 prove) e il gruppo `sopraFoto`
(**nove** valori) in `src/design-system/v3/tokens.ts`, con 3 prove sue in `tests/unit/ds-v3/tokens.test.ts`. La carta **non è montata da nessuna parte**
(T10, T11) e `FotoStrip` è intatta.
⚠️ **Il conteggio delle prove cresce di UNO più del previsto a ogni componente nuovo:**
`tests/unit/home-style-parsabile.test.ts` genera un caso per ogni file con un blocco `<style>`.

🔴 **Aperti, e da tenere presenti in T7:** la firma di `VisoreFoto` nel piano (`:1201`) **non ha
`ancoraFocus`**, che §5.39 esige — va aggiunta · **sette dei nove `sopraFoto` non hanno ancora un
utente**: sono di T7 e T8 · prima prova obbligatoria di T7: `Sheet` sotto, tendina sopra, focus nella
tendina, `Escape` → si chiude **solo la tendina**; se fallisce **si riferisce, non si sceglie** (D86).
🔴 **Riferito da T6 e non deciso:** la **§5.38 non nomina mai `indiceAperto`** — la prop vive solo
nella firma del piano. Scelta la lettura piana e dichiarata nel commento; se ne serve un'altra, è una
decisione di Francesco e vuole il suo numero (la prossima è **D91**).
🔴 **Restano aperti dai task prima:** **R27** (`tsc` non protegge le query) · **R29 + D81** (il
caricamento foto su uachelab.com è rotto fino al merge, si ripara in **T13**) · **FM-8** · **tredici**
overlay di `src/components/features/**` che promettono `aria-modal` senza mantenerlo (si migrano
insieme).

➡️ **Dopo T7: T8 → T9 → T9-bis, uno per esecutore.**

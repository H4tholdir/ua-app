# Sessione attiva — ondata (b): T7 FATTO, si riparte da T8 `TendinaMenu` (31/07/2026)

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-01-t8-brief.md`** — **un compito solo**, per un esecutore
fresco (R-E1), e il brief è **autosufficiente**: cosa esiste già con le firme esatte, il riferimento della
suite rimisurato, la previsione dei rossi (**zero**) e le due lacune dell'ambiente già misurate.
📎 Legge: spec v3 rev. 3.4 **§5.40** — `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`
📎 Prove e ragioni: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` §5.40 e §1.1-§1.6
📎 Verbale (**novanta** decisioni): `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **D78**
📎 Da dove veniamo: `docs/roadmap/2026-07-31-t7-referto.md`

**Ramo `ondata-b-schermate`** — niente su `origin`, albero pulito, guardie verdi (16 documenti).
✅ **Fatti: T1 · T2 · T3 · T4 · T5 · T5-bis · RATIFICA (D89) · T5-ter · D90 · T6 · T7.**
🔑 **Riferimento MISURATO il 31/07 a T7 chiuso:** `vitest` **365 | 3** file, **4066 | 19** prove ·
`tsc` **0** · `next build` ok.

🚦 **La prova obbligatoria di D86 è VERDE, e non creduta ma provata anche al contrario:** `Escape` dentro il
visore chiude **solo** il visore. **Niente da riferire, `storia-overlay.ts` non si tocca.**

**Che cosa ha lasciato T7:** `src/components/ds/VisoreFoto.tsx` (47 prove). `ancoraFocus` è **obbligatoria**
(F-12) e la firma nel piano (`:1203`) non ce l'ha ancora. `azioni` accetta **solo l'innesco**: la tendina di
T8 si monta **fratella**, mai dentro. Il visore **non è montato da nessuna parte** (T10).

🔧 **CORREZIONE al referto di T7, misurata scrivendo il brief di T8:** dei due valori di `sopraFoto` rimasti,
**uno solo è di T8** (`ombraPannello`). **`facciaAttiva` è di T10**, perché accende il **⋯**, che non è né
della tendina né del visore: è l'innesco che il chiamante passa. Se dopo T8 resta a zero usi, **non è un
difetto**.
🔴 **Ritrovamento nuovo, di T10:** `TastoTondo` **non sa dire** `aria-haspopup` né `aria-expanded`
(`src/components/ds/TastoTondo.tsx:19-23`), che §5.39 e §5.40 esigono **entrambi** sull'innesco. Stesso
difetto di forma di `MenuVoce` (F-6).

⚠️ **Due lacune dell'ambiente, misurate — non difetti:** Motion con `skipAnimations` lascia scritto
l'`initial` e non applica mai l'`animate` (niente prove sul `transform` finale: si guarda al gate estetico
L2, T13) · `scripts/guardia-navigazione-overlay.mjs` è **cieca** a un `role="menu"` e va lanciata a **T10**.
🔴 **Restano aperti dai task prima:** **R27** (`tsc` non protegge le query) · **R29 + D81** (il caricamento
foto su uachelab.com è rotto fino al merge, si ripara in **T13**) · **FM-8** · **tredici** overlay di
`src/components/features/**` che promettono `aria-modal` senza mantenerlo · la **§5.38 non nomina mai
`indiceAperto`** (se serve un comportamento diverso è una decisione di Francesco: la prossima è **D91**).

➡️ **Dopo T8: T9 → T9-bis, uno per esecutore.**

# Sessione attiva — ondata (b): T8 FATTO, si riparte da T9 `FoglioCategoria` (01/08/2026)

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md`** → **Task 9**
(`FoglioCategoria`, §5.41), **un compito solo** a un esecutore fresco (R-E1). 🆕 **Da creare:** il suo brief.
📎 Legge: spec v3 rev. 3.4 **§5.41** — `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`
📎 Prove e ragioni: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` §5.41 e §1.1-§1.6
📎 Da dove veniamo: `docs/roadmap/2026-08-01-t8-referto.md`

**Ramo `ondata-b-schermate`** — niente su `origin`. ✅ **Fatti: T1 · T2 · T3 · T4 · T5 · T5-bis · D89 · T5-ter · D90 · T6 · T7 · T8.**
🔑 **Riferimento MISURATO il 01/08 a T8 chiuso:** `vitest` **366 | 3** file, **4104 | 19** prove · `tsc` **0** · `next build` ok.

**Che cosa ha lasciato T8:** `src/components/ds/TendinaMenu.tsx` (37 prove). `role="menu"` **senza `aria-modal`**,
`Tab` **chiude** e restituisce il focus al ⋯, blocca lo scorrimento **come tutti** (D84). **Non è montato da
nessuna parte: è T10**, che dovrà anche lanciare `scripts/guardia-navigazione-overlay.mjs` (cieca a un `role="menu"`).

🔴 **Riferiti da T8, nessuno corretto (R-E2):** il **Task 8 del piano** dice ancora «NON blocca lo scorrimento»
sotto un riquadro che dice il contrario · **`MenuVoce.tsx:77-79`** mostra il chevron **anche sulla distruttiva**,
contro la sua legge visiva (si aggiunge a F-6) · il mockup **M2** non mostra chevron su nessuna voce mentre §5.40
lo presuppone (**gate estetico L2, T13**) · il pressed «si scurisce di un tono» è in `:active`, non in Motion, che
non interpola `var(--…)` — **scostamento dichiarato**.

🔴 **Restano aperti dai task prima:** **`facciaAttiva`** e **`TastoTondo`** senza `aria-haspopup`/`aria-expanded`
(entrambi **T10**) · **R27** · **R29 + D81** (foto rotte su uachelab.com fino al merge, si riparano in **T13**) ·
**FM-8** · **tredici** overlay di `src/components/features/**` che promettono `aria-modal` senza mantenerlo ·
**§5.38 non nomina mai `indiceAperto`** (decisione di Francesco: la prossima è **D91**).

➡️ **Dopo T9: T9-bis, uno per esecutore.** Verbale
(`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`) fermo a **novanta** decisioni: T8 non ne ha
aggiunte, la prossima è **D91**.

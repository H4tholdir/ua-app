# Sessione attiva — ondata (b): T9 FATTO, si riparte da T9-bis `FoglioConferma` (01/08/2026)

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md`** → **Task 9-bis**
(`FoglioConferma`, §5.42, D80), **un compito solo** a un esecutore fresco (R-E1). 🆕 **Da creare:** il suo brief.
📎 Legge: spec v3 rev. 3.4 **§5.42** — `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`
📎 Prove e ragioni: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` §5.42 e **§1.9 (B-6)**
📎 Da dove veniamo: `docs/roadmap/2026-08-01-t9-referto.md` · prima: `docs/roadmap/2026-08-01-t8-referto.md`

**Ramo `ondata-b-schermate`** — niente su `origin`. ✅ **Fatti: T1 · T2 · T3 · T4 · T5 · T5-bis · D89 · T5-ter · D90 · T6 · T7 · T8 · T9.**
🔑 **Riferimento MISURATO il 01/08 a T9 chiuso:** `vitest` **367 | 3** file, **4140 | 19** prove · `tsc` **0** · `next build` ok.

**Che cosa ha lasciato T9:** `src/components/ds/FoglioCategoria.tsx` (35 prove). Ogni uscita porta una
categoria (**D74**, provato da due lati: che arrivi, e che arrivi **prima** della chiusura) · allo scatto
**nessuna** pastiglia accesa · focus al **pannello** · `Tab` **trattenuto**. **Non è montato da nessuna parte:
è T11 (lo scatto) e T10/T12 (la correzione).**

🔑 **T9-bis eredita due cose che gli servono subito:** ① §1.9 **(B-6)** vale **anche per lui** — è il secondo
dei due fogli, e `coreografie.sheetSu` porta la transizione **dentro** la variante: si riusa la forma di
`variantePannello` in `FoglioCategoria.tsx`, provata sull'**oggetto vero**; ② l'apritore di `FoglioConferma` è
**una voce di menù che smonta**, quindi l'àncora del focus va **dichiarata** (C-12), mai catturata.

🔴 **Riferiti da T9, nessuno corretto (R-E2):** il **piano** porta ancora due righe annullate dal suo riquadro
(la misura **148,5 px** e la mutazione a 15,5) — **due task su due** con lo stesso difetto · la **firma del
piano** non poteva rendere il momento della correzione (aggiunta `scelta?: CategoriaFoto`) · `ancoraFocus` è
**`RefObject` obbligatoria** (F-12), non l'opzionale del piano · «il manico» è elencato fra le uscite ma in
casa **non è un comando** · **nessuno dei tre strati anima l'uscita** (nessun `AnimatePresence`): si decide
**insieme** al **gate estetico L2 (T13)**.

🔴 **Restano aperti dai task prima:** **`ROADMAP-UFFICIALE.md`** dice ancora «ondata (b) *da pianificare*» —
da sistemare **prima del merge** · **`MenuVoce`** col chevron sulla distruttiva (F-6) · **`TastoTondo`** senza
`aria-haspopup`/`aria-expanded` e **`facciaAttiva`** a zero usi (entrambi **T10**) · **R27** · **R29 + D81**
(foto rotte su uachelab.com fino al merge, **T13**) · **FM-8** · **tredici** overlay di
`src/components/features/**` che promettono `aria-modal` senza mantenerlo.

⚠️ **La lezione che vale per T9-bis:** FASE 7 verde **non vede la forma di una transizione**, e ogni §5.x ha
la **sua** riga «Riduci movimento» — §5.40 per chiave, §5.41 dentro la variante. Si legge **la propria**, mai
quella del vicino.

➡️ Verbale (`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`) fermo a **novanta**: la prossima è **D91**.

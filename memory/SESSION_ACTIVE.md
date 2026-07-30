# Sessione attiva — ondata (b): T5-ter FATTO, la trappola del focus è in casa (30/07/2026, notte)

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-t5-ter-referto.md`** — poi **T6 (`CartaAlbum`)**, a un
esecutore fresco (R-E1). 🛑 **T6 porta i NOVE token `sopraFoto`** in `src/design-system/v3/tokens.ts`,
non T7. Mandato: `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` → Task 6.
📎 Motivazioni e prove: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` (§1.6 = la
trappola) · verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` (D85 · D86 · D89)
· mandato eseguito: `docs/roadmap/2026-07-30-t5-ter-brief.md`.

**Ramo `ondata-b-schermate`** — niente su `origin`. Verbale a **ottantanove** decisioni.

✅ **Fatti: T1 · T2 · T3 · T4 · T5 · T5-bis · la RATIFICA (D89) · T5-ter.**
🆕 `src/components/ds/trappola-focus.ts`: il `Tab` resta dentro il pannello, il focus torna
all'**àncora dichiarata**. `Sheet` e `DialogConferma` sono i primi due utenti; FM-5 chiusa (il
commento di D80 è nel file). **FASE 7:** `tsc` 0 · `vitest` **363 | 3** e **3959 | 19** · build ok.
🔑 **Passo 4: zero rossi, e la ragione è misurata** — il ripiego dell'àncora rende `Sheet`
invariante e nessuna prova in casa tabulava fino al bordo. La rete morde lo stesso: mutazione di
controllo → **5 prove si accendono**. R-P4: **13 su 19** → sei prove deboli rinforzate → **18 su 19**.

🟡 **Una domanda per Francesco:** `DialogConferma` porta il focus **sul pannello** (default di casa,
§5.17 non dice dove va). Se lo vuole sul tasto sicuro, come `FoglioConferma`, è una riga.
🔴 **R-E2 riferiti, non corretti:** la firma di `VisoreFoto` nel piano (`:1201`) **non ha
`ancoraFocus`** e T7 la deve aggiungere · una trappola a mano esiste già in
`src/components/features/fatture/InviaPecButton.tsx:80-114` (su `window`) · **tredici** overlay di
`features/**` promettono `aria-modal` senza mantenerlo — elencati nel referto, **nessuno toccato**.

🔴 **Restano vivi: R27** (`tsc` non protegge le query) · **R29 + D81** (un solo database: il
caricamento foto su uachelab.com è rotto fino al merge, si ripara in **T13**) · **FM-8** (l'eliminazione
riuscita non dà nessun ritorno non visivo — decisione di grammatica, da porre a Francesco).

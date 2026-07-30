# Sessione attiva — ondata (b): T5-ter FATTO, si riparte da T6 `CartaAlbum` (31/07/2026)

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-31-t6-brief.md`** — **un compito solo**, per un esecutore
fresco (R-E1), e il brief è **autosufficiente**: cosa esiste già con la firma esatta, i nove token che
T6 porta con sé, il riferimento della suite rimisurato, e la previsione dei rossi (**zero**, quindi il
rischio è una prova che non morde).
📎 Legge: spec v3 rev. 3.4 **§5.38** — `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`
📎 Prove e blocco dei token: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` §4
📎 Verbale (**novanta** decisioni): `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`
📎 Piano (**Task 6**, riquadro «MANDATO CORRETTO»): `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md`
📎 Da dove veniamo: `docs/roadmap/2026-07-30-t5-ter-referto.md`

**Ramo `ondata-b-schermate`** — niente su `origin`, albero pulito, guardie verdi (15 documenti).
✅ **Fatti: T1 · T2 · T3 · T4 · T5 · T5-bis · la RATIFICA (D89) · T5-ter · D90.**
🔑 **Riferimento MISURATO ad albero pulito il 31/07:** `vitest` **363 | 3** file, **3975 | 19** prove ·
`tsc` **0** · `next build` ok.

**Che cosa ha lasciato T5-ter:** `src/components/ds/trappola-focus.ts` — il `Tab` resta dentro il
pannello, il focus torna all'**àncora dichiarata**. `Sheet` e `DialogConferma` sono i suoi primi due
utenti; **D90**: nella conferma il focus si posa sul **tasto sicuro** (proprietà, non posizione).
Nella stessa notte, due difetti di calendario chiusi: il grafico del trend non perde più un mese (e non
ne inventa uno futuro), e la finestra «ultimi 12 mesi» non trabocca il 29 febbraio (`mesiFaISO`).

🔴 **Aperti, e nessuno è di T6:** **R27** (`tsc` non protegge le query: chi tocca uno scrittore si porta
la sua prova) · **R29 + D81** (**un solo database**, ed è la produzione: il caricamento foto su
uachelab.com è **rotto** fino al merge, si ripara in **T13**) · **FM-8** (l'eliminazione riuscita non dà
nessun ritorno non visivo — decisione di grammatica, da porre a Francesco) · **T7 deve aggiungere
`ancoraFocus` alla firma di `VisoreFoto`**, che il piano non ha (`:1201`) · **tredici** overlay di
`src/components/features/**` promettono `aria-modal` senza mantenerlo — elenco nel referto di T5-ter,
**si migrano insieme** · `src/app/api/clienti/[id]/route.ts` è a posto, ma la **roadmap** dice ancora
ondata (b) «da pianificare» (perimetro da decidere: è la voce del *wizard adattivo*, non dell'album).

➡️ **Dopo T6: T7 → T9-bis, uno per esecutore.**

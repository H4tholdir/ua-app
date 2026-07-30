# Sessione attiva — ondata (b), l'album: le correzioni del panel sono ENTRATE nel gate (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-album-ripresa-post-panel.md`** — lo legge per primo chi apre
la sessione nuova; la sua **§8** dice cosa è cambiato nel gate, sezione per sezione.
Gate: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` — **revisione 2**.
Verbale del panel (storico): `docs/roadmap/2026-07-30-panel-gate-sezioni-album.md`.

**Ramo `ondata-b-schermate`** — niente su `origin`, albero pulito, **83 commit** avanti a `origin/main`,
guardie verdi (9 documenti). Verbale a **ottantotto** decisioni.

✅ **Fatti: T1 · T2 · T3 · T4 · T5 (scritto) · T5-bis · le correzioni del panel dentro il gate.**
Sette bloccanti e quindici rilievi applicati. Quattro bivi decisi da Francesco: **D85** trappola del focus
**alla radice** (nasce **T5-ter**, `trappola-focus.ts` 🆕 da creare, `Sheet` e `DialogConferma` utenti) ·
**D86** la via dell'`Escape` si tiene, il ripiego lo decide il **coordinatore** · **D87** etichetta di gruppo
a **12,5** · **D88** l'ombra della tendina resta, **seconda eccezione** dichiarata a §3.

🔑 **Le tre misure sbagliate sono state rifatte col conto in chiaro:** il contrasto del visore era calcolato
su un elemento **senza sfondo** (2,1:1 → nasce la **pastiglia con faccia**) · i **148,5 px** erano presi
dentro la cornice del mockup (colonna vera: **171** a 390, **216** da 768) · il `nowrap` rompeva il
**text-zoom 200%**, che è un requisito di rilascio.
⚠️ **Undici citazioni a `Sheet.tsx` erano scadute** — il panel è di prima di T5-bis; rifatte.

🔴 **Restano vivi: R27** (`tsc` **non protegge le query**: chi tocca uno scrittore si porta la sua prova) ·
**R29 + D81** (**un solo database**, ed è la produzione: il caricamento foto su uachelab.com è **rotto** fino
al merge, si ripara in **T13**).

➡️ **PROSSIMO, in quest'ordine:** ① **la ratifica del gate** — §0 della proposta, **quindici voci** ·
② **T5-ter** (D85), prima di T6 · ③ i mandati di T6/T7/T8/T9/T9-bis corretti con F-1·F-6·F-7·F-8·F-10·
F-11·F-12·F-13 · ④ T6 → T9-bis, un esecutore fresco per task.
🛑 **T6 porta i NOVE token `sopraFoto`**, non T7. 🛑 **Il piano dice 14 task e i task veri sono 16**: non
conosce né T5-bis né T5-ter. 🛑 **T11 è la riparazione del caricamento**: da T3 ogni caricamento riceve 422.

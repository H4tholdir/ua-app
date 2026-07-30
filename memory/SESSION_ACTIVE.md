# Sessione attiva — ondata (b): il gate è RATIFICATO, la spec v3 è a rev. 3.4 (30/07/2026 sera)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-album-ripresa-post-panel.md`** — §4 dice da dove si riparte,
§8 dice cosa è cambiato nel gate. Allegato (motivazioni e prove):
`docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` — ✅ **ratificato, non più proposta**.

**Ramo `ondata-b-schermate`** — niente su `origin`, albero pulito, guardie verdi (9 documenti).
Verbale a **ottantanove** decisioni.

✅ **Fatti: T1 · T2 · T3 · T4 · T5 · T5-bis · le correzioni del panel · la RATIFICA (D89).**
Le cinque §5.x sono **legge**: `CartaAlbum` §5.38 · `VisoreFoto` §5.39 · `TendinaMenu` §5.40 ·
`FoglioCategoria` §5.41 · `FoglioConferma` §5.42, in `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`
**rev. 3.4**. Con esse: §5.17 emendata (la card centrata è **una delle due** forme), §13.2 allineata,
§5.33 chiusa. 🔑 **Entrate in forma NORMATIVA:** la spec dice cosa si fa, le prove stanno nell'allegato.

🚪 **PROSSIMO: T5-ter — `src/components/ds/trappola-focus.ts` (🆕 da creare), e `Sheet` e `DialogConferma`
diventano suoi utenti** (D85). **Esecutore fresco, contesto pulito** (R-E1): cambia il comportamento della
tastiera su **due componenti in produzione** contro **3936** prove. 🛑 **Primo passo del mandato: misurare il
terreno e CONTARE e CLASSIFICARE i rossi** — molti non saranno difetti ma prove che descrivevano il vecchio
comportamento (stessa classe della trappola pagata in T8). Il mandato è nel piano, con **sei passi**.
➡️ Poi **T6 → T9-bis**, uno per esecutore. 🛑 **T6 porta i NOVE token `sopraFoto`**, non T7.

**Il piano è allineato a 16 task** (dichiarava 14: non conosceva T5-bis né T5-ter). T6, T7, T8, T9 e T9-bis
portano in testa un blocco **«MANDATO CORRETTO»** che vince sul resto del task.

🔴 **Restano vivi: R27** (`tsc` **non protegge le query**: chi tocca uno scrittore si porta la sua prova) ·
**R29 + D81** (**un solo database**, ed è la produzione: il caricamento foto su uachelab.com è **rotto** fino
al merge, si ripara in **T13**) · **FM-8** (l'eliminazione riuscita non dà nessun ritorno non visivo —
`Avviso.tsx:81-91` fa suonare solo l'errore: **decisione di grammatica, da porre a Francesco**).
🛑 **T11 è la riparazione del caricamento**: da T3 ogni caricamento riceve **422** finché non atterra.

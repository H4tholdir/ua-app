# Sessione attiva — ondata (b): gate RATIFICATO, spec v3 a rev. 3.4, T5-ter pronto (30/07/2026 sera)

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-t5-ter-brief.md`** — è **un compito solo**, per un esecutore
fresco (R-E1), e il brief è **autosufficiente**: fatti misurati, contratto del modulo, i cinque utenti e
l'unico non-utente, il riferimento della suite e la previsione dei rossi.
📎 Contesto largo (se serve): `docs/roadmap/2026-07-30-album-ripresa-post-panel.md` §4 e §8.
📎 Motivazioni e prove del gate: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md`
— ✅ **ratificato, non più proposta**.

**Ramo `ondata-b-schermate`** — niente su `origin`, albero pulito, guardie verdi (9 documenti).
Verbale a **ottantanove** decisioni.

✅ **Fatti: T1 · T2 · T3 · T4 · T5 · T5-bis · le correzioni del panel · la RATIFICA (D89).**
Le cinque §5.x sono **legge**: `CartaAlbum` §5.38 · `VisoreFoto` §5.39 · `TendinaMenu` §5.40 ·
`FoglioCategoria` §5.41 · `FoglioConferma` §5.42, in `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`
**rev. 3.4**. Con esse: §5.17 emendata (la card centrata è **una delle due** forme), §13.2 allineata,
§5.33 chiusa. 🔑 **Entrate in forma NORMATIVA:** la spec dice cosa si fa, le prove stanno nell'allegato.

🚪 **PROSSIMO: T5-ter — `src/components/ds/trappola-focus.ts` (🆕 da creare), e `Sheet` e `DialogConferma`
diventano suoi utenti** (D85). Brief pronto (v. sopra), mandato nel piano in **sei passi**.
🔑 **Riferimento MISURATO ad albero pulito il 30/07 h 23:34:** `vitest` **362 | 3** file, **3936 | 19** prove ·
`tsc` **0**. 🛑 Il task cambia la **tastiera** su due componenti in produzione: alcuni rossi **non saranno
difetti** ma prove che descrivevano il vecchio comportamento — si **contano e si classificano**, ed entrambi
i numeri si scrivono. ✅ **Il raggio è misurato e ha un nome:** solo **cinque** file di prova toccano
`Tab`/focus, e quello a rischio è `tests/unit/ds-v3/componenti/sheet-dialog.test.tsx`. Rossi fuori da lì =
sorpresa da riferire. 🔴 **Fatto nuovo:** `DialogConferma` **non gestisce il focus affatto** (zero riscontri
di `focus`/`activeElement`/`tabIndex`) — non lo porta nemmeno dentro; `Sheet` sì (`:314-322`).
➡️ Poi **T6 → T9-bis**, uno per esecutore. 🛑 **T6 porta i NOVE token `sopraFoto`**, non T7.

**Il piano è allineato a 16 task** (dichiarava 14: non conosceva T5-bis né T5-ter). T6, T7, T8, T9 e T9-bis
portano in testa un blocco **«MANDATO CORRETTO»** che vince sul resto del task.

🔴 **Restano vivi: R27** (`tsc` **non protegge le query**: chi tocca uno scrittore si porta la sua prova) ·
**R29 + D81** (**un solo database**, ed è la produzione: il caricamento foto su uachelab.com è **rotto** fino
al merge, si ripara in **T13**) · **FM-8** (l'eliminazione riuscita non dà nessun ritorno non visivo —
`Avviso.tsx:81-91` fa suonare solo l'errore: **decisione di grammatica, da porre a Francesco**).
🛑 **T11 è la riparazione del caricamento**: da T3 ogni caricamento riceve **422** finché non atterra.

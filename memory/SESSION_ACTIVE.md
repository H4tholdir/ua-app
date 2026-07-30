# Sessione attiva — ondata (b), l'album: A e B chiusi, il gate fermato dal panel (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-album-ripresa-post-panel.md`** — lo legge per primo chi apre
la sessione nuova. ⚠️ **Sostituisce** `docs/roadmap/2026-07-30-album-foto-esecuzione-handoff.md`, superato.
🔴 **La lista di lavoro è `docs/roadmap/2026-07-30-panel-gate-sezioni-album.md`** (sette bloccanti, quindici
rilievi). Piano: `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` (**14 task**).

**Ramo `ondata-b-schermate`** — niente su `origin`, albero pulito, **82 commit** avanti a `origin/main`,
guardie verdi (9 documenti). Verbale a **ottantaquattro** decisioni.

✅ **Fatti: T1 · T2 · T3 · T4 · T5 (scritto) · T5-bis.** La categoria è una colonna che il database difende ·
unica fonte dei sei valori + spia a **insiemi** · le rotte **validano** (422, non 500) · la cancellazione è
**vera** (file → riga → traccia, mai l'immagine) · il blocco dello scorrimento è **a contatore** (D84).
`tsc` **0** · vitest **3936 | 19** (362 file).

🛑 **IL GATE T5 NON È RATIFICATO.** Panel di tre → **sette bloccanti**. Convergenza a tre su uno: **nessuna
delle cinque §5.x dichiara cosa fa il `Tab`**, e la via di `Escape` ci poggia sopra.
🔑 **Due prove prescritte erano CIECHE** · **tre misure sbagliate** (il contrasto del visore è calcolato su
un elemento che nel disegno **non ha sfondo**; i 148,5 px sono presi **dentro la cornice del mockup**; il
`nowrap` rompe il **text-zoom 200%**). ✅ **A-1 è VERA**, provata in `react-dom`.

🔴 **Due ritrovamenti strutturali: R27** — `tsc` **non protegge le query** (il client non porta il generico):
chi tocca uno scrittore **si porta la sua prova**. **R29 + D81** — **un solo database**, ed è quello di
produzione: **il caricamento foto su uachelab.com è ROTTO** e resta così **fino al merge**, per scelta di
Francesco. **Si ripara in T13**, ed è scritto lì.

➡️ **PROSSIMO, in quest'ordine:** ① le correzioni del panel dentro il documento del gate · ② la **ratifica**
· ③ i mandati di **T7/T8/T9/T9-bis corretti PRIMA di T6** · ④ T6 → T9-bis, un esecutore fresco per task.
🛑 **T6 porta il gruppo di token `sopraFoto`**, non T7. 🛑 **T11 è la riparazione del caricamento**, non un
abbellimento: da T3 ogni caricamento riceve **422** finché non atterra.

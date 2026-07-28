# Sessione attiva — ONDATA (b): SPEC RATIFICATA + 25 DECISIONI + ANTEPRIME SCELTE, ZERO codice (28/07/2026, sera)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-28-ondata-b-piano-handoff.md`.**
Spec ✅ **RATIFICATA** · verbale a **quattro tornate**: D1-D8 apertura · D9-D16 mockup · **D17-D20 ratifica** ·
**D21-D25 varianti**. La forma scelta è la **§4** di ciascun mockup.

**D21-D25:** uscita **T2** (✕ leggera) e **la ✕ compare solo dal passo 2** · briciole **o intere o a icona,
MAI troncate**, si riempie da destra, la fila scorre se serve · foto **F2 + PIÙ FOTO** (rivedere, ingrandire,
rifare, **eliminare**, aggiungere) · cassetta **solo le libere** + **crea al volo** + **salta** · avviso **V1**.

🔴 **Tre cose trovate misurando/aprendo i file, non ragionando:**
① `text-overflow: ellipsis` **non funziona dentro un flex** — vale identico in React: la pastiglia dev'essere
un **blocco**. ② La colonna è **bloccata a 480 px**: **768 e 1280 sono IDENTICI** (320 px alle briciole contro
230 a 390) — lo spazio vero arriva **sui passi larghi** (D14). ③ ✅ Regola «mai troncate» **verificata a
schermo** (`scripts/tmp/misura-forma-ratificata.mjs`): **zero troncature su 7 casi**.

🚫 **R11 RITIRATO:** il «difetto» del colore delle cassette **non esisteva** — `normalizzaColore`
(`src/lib/cassette/colore.ts:6,11`) accetta le sei parole **e** l'esadecimale, e `facciaHex`
(`v3/tokens.ts:121-128`) traduce già. Avevo dedotto un difetto da un dato **senza aprire il codice che lo
legge**. ✅ Conseguenza buona: il passo cassetta **riusa**, e `NuovaCassettaSheet` + `POST /api/cassette`
esistono già.
🆕 **R12 (vero):** **un'immagine del lavoro NON si può cancellare** — `immagini/[imgId]/route.ts` ha solo
`PATCH`. Caricarne più d'una è già possibile (`lavori_immagini` è una tabella); toglierne una no. **In
perimetro** per D23.

**Prossimo:** restano 6 domande minori nei mockup (icone, sfumatura dello scorrimento, tetto foto, etichette
foto, conferma di eliminazione, cassetta creata) → poi **il piano** (R-P1/R-P2/R-P6) → ramo (🛑 **mai worktree**).
🔑 Baseline DB invariata: **294 lavori · 0 denti · 916 pazienti · 48 colori** (solo letture).

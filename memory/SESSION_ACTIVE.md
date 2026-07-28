# Sessione attiva — ONDATA (b): SPEC RATIFICATA + 25 DECISIONI + ANTEPRIME SCELTE, ZERO codice (28/07/2026, sera)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-28-ondata-b-piano-handoff.md`.**
Spec ✅ **RATIFICATA** · verbale a **quattro tornate**: D1-D8 apertura · D9-D16 mockup · **D17-D20 ratifica** ·
**D21-D25 varianti**. La forma scelta è la **§4** di ciascun mockup.

**D21-D25:** uscita **T2** (✕ leggera) e **la ✕ compare solo dal passo 2** · **D22 riscritta dopo una
rettifica di Francesco**: la fila **scorre ancorata a destra**, quello che è in vista si legge **intero**, il
resto è **fuori vista (non compresso)** con una **sfumatura** che lo dice, e l'**icona è il solo caso limite
al bordo** · foto **F2 + PIÙ FOTO** (rivedere, ingrandire, rifare, **eliminare**, aggiungere) · cassetta
**solo le libere** + **crea al volo** + **salta** · avviso **V1**.

🔴 **Quattro cose trovate misurando/aprendo i file, non ragionando — tutte valide identiche in React:**
① `text-overflow: ellipsis` **non funziona dentro un flex**: la pastiglia dev'essere un **blocco**.
② `justify-content: flex-end` ancora a destra **ma rende irraggiungibile** ciò che esce a sinistra → serve
`margin-left:auto` **più** `scrollLeft = scrollWidth` al montaggio. ③ Una fila che scorre **taglia sempre**
il bordo → **maschera sfumata**, e **direzionale** (sfumare l'ultima è una bugia visiva). ④ La colonna è
**bloccata a 480 px**: **768 e 1280 sono IDENTICI** (320 px contro 230) — lo spazio vero arriva **sui passi
larghi** (D14). ✅ Regola «mai troncate» **verificata a schermo**
(`scripts/tmp/misura-forma-ratificata.mjs`): **zero parole tagliate su 7 casi**, 267 px nascosti e
**raggiungibili**, scorrimento iniziale **ancorato a destra**.

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

# Sessione attiva — UÀ

🚪 **PUNTO DI RIPRESA: `docs/roadmap/ROADMAP-UFFICIALE.md`** — la tabella delle righe aperte è la
fonte; il racconto di questa sessione sta in `memory/MEMORY.md`, riga (156). Il ramo
**`prescrittore-vuoto`** (`2f45e8a0` + `afcfe5ef`) è **pronto e NON pubblicato**: il merge lo
autorizza Francesco.

✅ **D242 — la DdC non esce più senza il nome del prescrittore.** La stringa vuota si ferma **al
confine di scrittura** (POST e PATCH) e la regola di «vuoto» è **una sola** per il controllo di
consegna e per i due documenti. Il censimento ha trovato un **secondo lettore** che il punto di
ripresa non nominava — il **buono di consegna** — e che `||` da solo **non bastava** (`'   '` è
truthy). `provato:` 299 lavori e 6 dichiarazioni emesse, **zero** col nome vuoto: nessun documento
da riparare. `vitest` **4976 | 19** · `verify:full` uscita 0.

🍏 **Prova iPhone FATTA (riga 16):** foto dalla fotocamera → il magazzino ha registrato
**`image/jpeg`** (2,06 e 2,55 MB) sui lavori 2026/0019 e 0020. Safari converte: **l'HEIC non ci
arriva**. Scoperti: la foto **dalla libreria** e i browser non-Safari su iOS.

🆕 **Riga 18 di roadmap:** «appena arrivati» è ordinata per **data di consegna**, non per arrivo — e
a parità di data l'ordine è **arbitrario** (nessun criterio di spareggio). Il **13 contro 12** non è
un errore di calcolo: il sito vero risponde 13 in entrambi i posti, il 12 era un disegno vecchio.

📎 **242 decisioni in 92 tornate; la prossima è D243.**

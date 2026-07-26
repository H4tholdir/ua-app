# Sessione attiva — 26/07/2026 (le due decisioni del gate estetico L2)
Worktree `redesign-parete-home`. **3283 verdi / 19 skip · tsc 0 · build ok.** Collaudo :3020
riavviato sulla build corrente, guardia stili verde.

**Fatte le due decisioni di Francesco al gate L2.** (1) *«Il numero del lavoro non si taglia
mai»*: nella striscia il numero ha un nodo suo (`flex-shrink: 0` + `max-width: 100%`), a
troncarsi è solo la frase, il conteggio resta intoccabile. (2) *«Avvicino le righe»*: il muro
riserva 4 maglie per fila **dal tablet in su** (@media 768, mai container query — le due pareti
hanno container 680 e 440 alla stessa finestra), 5 sul telefono.

**Trappola incisa nei commenti:** un restringimento «sotto il pixel» non è innocuo su un testo
con `text-overflow` — 0,10px fanno scattare i puntini e mangiano tre cifre. Vista solo aprendo
la cattura: i numeri arrotondati la nascondevano.

**Aperto per Francesco:** a 1280 la striscia sta nel rail di NavDesk, 178px contro 208 richiesti
→ allarme senza soggetto. Preesistente, misurato identico prima/dopo, in backlog: serve una
decisione di forma. Restano R3-R6 del gate.

**Poi:** offrire la branch al merge (a parola di Francesco).
Rapporto: `.superpowers/sdd/gate-decisioni-report.md` · backlog:
`docs/roadmap/2026-07-26-backlog-ondata-parete-home.md`.

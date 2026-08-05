# Sessione attiva — UÀ

🚪 **PUNTO DI RIPRESA: `docs/roadmap/ROADMAP-UFFICIALE.md`** — la tabella delle righe aperte è la
fonte; il racconto di questa sessione sta in `memory/MEMORY.md`, righe (156) e (157).

🚀 **PUBBLICATO E VERIFICATO SUL SITO VERO (D243):** la correzione del **prescrittore vuoto** è
online (`c9408d99..800a7c0c` · CI verde · CD verde · 200/307). `provato:` PATCH di produzione con
**soli spazi** → in banca dati `null`; controllo positivo `'  Dott. Bianchi  '` → `"Dott. Bianchi"`.
Baseline ripristinata. La Dichiarazione di Conformità non può più uscire senza il nome
del medico, e la stessa regola vale per il **buono di consegna** — secondo lettore trovato col
censimento. `provato:` 299 lavori e 6 dichiarazioni emesse, **zero** col nome vuoto: nessun documento
vecchio da riparare.

✅ **D244 — «APPENA ARRIVATI» si ordina per ARRIVO**, il più recente in cima (prima: per data di
consegna, con un lavoro di maggio in testa). Le altre tre pile non cambiano: parlano di scadenze.
Chiuso anche l'ordine **arbitrario** a parità di chiave. ⛔ **Ramo `ordine-per-arrivo`, NON
pubblicato.** `vitest` **4983 | 19** · `verify:full` uscita 0.

🍏 **Formato Apple (riga 16):** la foto **dalla fotocamera** arriva in `image/jpeg` — misurato sui
byte. ⏳ **Resta da provare la foto presa dalla LIBRERIA** — «il telefono adesso non l'ho tra le mani».

📌 **Il 13 contro 12:** il sito vero risponde 13 in entrambi i posti. Perché il telefono dicesse 12
**non è misurato**: il service worker è escluso dal suo codice, resta il ridisegno lato client.

📎 **244 decisioni in 93 tornate; la prossima è D245.**

# Sessione attiva — UÀ

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-05-prescrittore-e-ordine-handoff.md`** — la §0 per prima.

🚀 **DUE RILASCI IN PRODUZIONE oggi pomeriggio, tutti e due verificati sul sito vero.** ① La
**Dichiarazione di Conformità non può più uscire senza il nome del prescrittore** (D242-D243): la
stringa vuota si ferma al confine di scrittura e la regola di «vuoto» è una sola per il controllo di
consegna e per i due documenti. ② La pila **«APPENA ARRIVATI» si ordina per ARRIVO** (D244), il più
recente in cima — e a parità di data l'ordine non è più arbitrario.

🔴 **LA §0 IN UNA FRASE — sette cose non fatte, e la prima è una regola saltata DUE volte:** il
**gate estetico L2** non è stato fatto neanche oggi (e oggi si aggiunge la domanda se valga anche
quando cambia il contenuto e non l'aspetto) · nessuna **FASE 9 a schermo** su entrambe le modifiche ·
manca la prova della foto **dalla LIBRERIA** dell'iPhone (quella dalla fotocamera è fatta: arriva
`image/jpeg`) · `CRON_SECRET` non verificabile da qui · nessuna misura su **rete mobile vera** · la
carta di caricamento fallito **ancora non si può togliere** · e **perché il telefono dicesse 12 non è
misurato** (il service worker è escluso dal suo stesso codice).

📌 MISURATO IN CHIUSURA (`npm run verify:full`, uscita 0): tsc 0 · eslint 0 · vitest **4983 passate |
19 saltate** (418 file) · build ok · sei guardie verdi. `main` allineato a `origin/main`, 0 in attesa.

📎 **244 decisioni in 93 tornate; la prossima è D245.**

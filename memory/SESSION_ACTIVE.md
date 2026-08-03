# Sessione attiva — la notte è in produzione, si riparte da P31

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-03-unione-notte-e-ripresa-p31.md`** — la **§0 per prima**.
🛑 **NON puntarlo su `memory/MEMORY.md`:** gli archivi sono esclusi apposta dalla catena che
`guardia-coerenza-documenti.mjs` segue, e puntarci la porta d'ingresso **svuota la guardia** — 7
documenti controllati → 1, **restando verde**. Difetto introdotto e chiuso il 03/08 (§0④ del referto).

✅ **UNITO E PUBBLICATO (D177):** `main` = **`8d06ea5b`** (`fdf90dac..8d06ea5b`), nodo di unione
esplicito. **Undici** salvataggi = 9 correzioni + referto + verbale (non nove, non dieci: il
conteggio era sbagliato in due documenti, corretto qui).

🔴 **La precondizione è stata eseguita per prima e provata in quattro modi** — non basta che
l'installatore stampi «✅»: guardia **rosso→verde** (la copia era del 02/08 12:04) · `diff` identico ·
`scarto += pagina.length` e arresto sulla pagina **vuota** dentro la copia che gira di notte ·
`launchctl` ore 3:00, in ascolto.

📌 `tsc` **0** · `vitest` **4490 | 19** (384 file) · `next build` **0** · **cinque** guardie verdi
sull'albero unito (nessuno le aveva mai eseguite lì).

🔎 **Riferito, non corretto (R-E2):** P31 tocca **tre** punti WhatsApp, non uno — `orchestrate.ts:123`
· `EstrattoContoView.tsx:223-224` · `ScadenzarioList.tsx:85`; più tre punti «numero da chiamare».

✅ **Tutto pubblicato:** `main` = **`ab76bca7`**, albero pulito, 0 da pubblicare.

🔨 **P31 — SPEC RATIFICATA, il piano non è ancora scritto.**
📄 `docs/superpowers/specs/2026-08-03-p31-due-numeri-per-il-cliente-design.md` (in attesa della
revisione di Francesco). **D181** due campi (`telefono` = studio · **`cellulare_whatsapp`** nuovo) ·
**D182** il prefisso `39` lo mette UÀ, non l'utente · **D183** se il cellulare manca, il tasto lo chiede
e lo **salva prima** di aprire WhatsApp.
🔑 **Tre misure hanno cambiato il perimetro:** il **travaso non esiste** (39 clienti, **1** con
telefono, **0** con email) · le **due schermate si contraddicono già nelle etichette** · **nessuno mette
il prefisso**, quindi la colonna nuova da sola ereditava il difetto.
🛑 **Due vincoli scoperti dalla validazione:** le allowlist sono **due** (`PATCHABLE_FIELDS_CLIENTE` +
`CAMPI_ELENCO`) · **`ConsegnaResult` non porta l'id del cliente** (`domain.ts:633-647`), quindi D183
richiede di aggiungerlo.

➡️ **DOPO P31: P30-a → P30-b → poi il React di P30.** 🆕 **P32** aperta (la guardia dei documenti perde
un anello a ogni handoff nuovo). ❓ Restano **D-Q2** e **D-Q5**.
📎 **183** decisioni in **67** tornate; la prossima è **D184**.

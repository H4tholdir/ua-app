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

🛑 **DUE SALVATAGGI LOCALI NON PUBBLICATI** (`29e9b2db` verifica di produzione · `08c3db65` voci P32 e
censimento P31): `git push` è stato **negato due volte dal filtro dei permessi**, non da un errore di
git. Il **codice** è tutto in produzione (`8d06ea5b`) e i documenti fino a `e0bb1de4`: mancano solo
questi due di documentazione. ➡️ Serve un `git push origin main` autorizzato da Francesco.

➡️ **ORDINE: P31 → P30-a → P30-b → poi il React di P30.** 🆕 **P32** aperta (la guardia dei documenti
perde un anello a ogni handoff nuovo). ❓ Restano **D-Q2** e **D-Q5**.
📎 **180** decisioni in **66** tornate; la prossima è **D181**.

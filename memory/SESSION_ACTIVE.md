# Sessione attiva

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/2026-08-09-avviso-al-dentista-cinque-task-handoff.md` — **la §0 per prima**.

🔴 **LA §0 IN UNA FRASE: il foglio dell'avviso ESISTE e NESSUNO PUÒ APRIRLO.** `provato:`
`grep -rn "AvvisoDentista" src/` → una sola occorrenza fuori dal suo file, **e è un commento**.
Cinque task su dieci non sono fatti (**6 · 7 · 8 · 9 · 10**), il **gate estetico L2 NON è stato fatto**
(gli 89 scatti sono FASE 9, non lui), e **il merge su `main` resta NO**.

**Ramo:** `intervento-post-consegna`, **pubblicato**, albero pulito · `main` **intatto** a `7427a680` ·
**249** salvataggi sopra `main` (si conta: `git rev-list --count main..HEAD`).
**PR #1 in BOZZA** — esiste per far girare la CI, **non** per il merge.

📌 **Misurato in chiusura:** `verify:full` **`VERIFY_EXIT=0`** · `vitest` **5902 passate | 119 saltate su
465 file** · `tsc` 0 · build ok · guardie verdi. Le 119 saltate sono le prove d'integrazione, che
`verify:full` **non carica** (`.env.local`): in CI girano tutte.

🗄️ **TRE migration nuove. Pavimento: `20260809133546`** (era `20260808195344`).
⚖️ **D342 → D351** — **351 decisioni in 150 tornate**. Fra queste: il foglio è la **variante A2**, la
sezione del portale è la **B1**, il nome del paziente nel foglio è la **terza deroga** a §2.1, «a voce»
chiude con **un tocco** (e la via di fuga è **10 secondi differiti**), il portale si migra **intero a v3**
in un'ondata a sé, e il collegamento al portale **non scade più a tempo**.

➡️ **PRIMA COSA: il Task 6** — il montaggio del foglio sulla scheda del lavoro, dove vivono ⚖️ D350
(`pazienteMostrato`) e la firma (`lavoro.laboratorio?.nome`, già letto a `lavori/[id]/page.tsx:38`).
🛑 **Una domanda aperta per Francesco, da porre PRIMA del gate L2:** D351 ha rotto la parità dei tocchi
(WhatsApp **3**, «a voce» **2**), e chiuderla significa toccare **D334**.

# Sessione attiva

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/2026-08-09-ci-vera-e-avviso-al-dentista-handoff.md` — **la §0 per prima**.

**Ramo:** `intervento-post-consegna`, pubblicato, albero pulito · `main` **intatto** a `7427a680` ·
**205** salvataggi sopra `main` (si conta: `git rev-list --count main..HEAD`).
**PR #1 in BOZZA** — esiste per far girare la CI, **non** per il merge.

📌 **Misurato in chiusura:** `verify:full` **`VERIFY_EXIT=0`** · `vitest` **5725 | 84 saltate su 458
file** · `tsc` 0 · build ok · guardie verdi.
🌐 **Sulla CI vera** (esecuzione `31312042122`, `success`): **458/458 file · 5809/5809 prove · zero
saltate** — le 84 «saltate» in locale sono le prove d'integrazione, che `verify:full` **non carica**.
➡️ **La CI è ora più severa della verifica locale.**

🔴 **La §0 in una frase — cinque cose non fatte:**
① **il Task E ha spec e piano e ZERO codice** (`grep -rc "avvisi_dentista" src/` → niente), e Francesco
ha già deciso **come** eseguirlo: *un compito alla volta con revisione*, in sessione nuova ·
② `contiene_sostanze_o_tessuti` **ancora cablato** (`generate-ddc.ts:349`) — è la riga **34** della coda ·
③ **il merge su `main` resta NO**: l'ondata non è finita ·
④ **quattro rilievi estetici aperti** (riga 37) più due riferiti oggi ·
⑤ **le righe di coda 34-41**, fra cui il **moncone** classificato nella classe sbagliata (riga 35).

⚖️ **Quindici decisioni: D325 → D339** (totale **339** in centoquarantasei tornate).
➡️ **Prima cosa da fare: il Task E**, dal piano `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`.

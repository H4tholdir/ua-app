# Sessione attiva — P17: design approvato, spec scritta, si aspetta il piano

🚪 **PUNTO DI RIPRESA: `docs/superpowers/specs/2026-08-02-p17-scarico-dpa-design.md`** (spec, 🟡 da rileggere)
+ `docs/design/decisions/2026-08-02-p17-scarico-dpa.md` (design approvato). L'handoff di ieri
(`docs/roadmap/2026-08-02-p7-in-produzione-e-la-deriva-delle-date-handoff.md`) resta valido **tranne la §0 ①**,
superata da **D156**. 📅 D155/§0F: la data si legge da `date`.

🛑 **D156 — NESSUNO USA QUESTA PWA FINCHÉ NON SI DISTRIBUISCE** (Francesco). ➡️ La frase falsa di
`DpaTemplate.tsx:210` esce da FASE 1 → **FASE 2 come P19-d**, insieme a P19-a. **«In produzione» ≠ «qualcuno
lo usa»**. ⚠️ Non riordina il resto: P7 e P17 restano FASE 1 per scelta esplicita (**D157**).

🔨 **P17 — fatto oggi:** censimento (12 file aperti) · **7 decisioni D156-D162** · mockup approvato
(`docs/design/mockups/2026-08-02-p17-scarico-dpa.html`, **12 scatti**, variante **B «a blocco»**) · spec con i
tre registri. **Ramo `p17-scarico-che-fallisce`**, 2 salvataggi, **nessun codice applicativo ancora scritto**.

🔴 **Tre cose trovate che il disegno non mostrava:** ① passare a `fetch` **perde il nome del file** e disferebbe
il Task 8 (`c1a1145d`) — `provato:` 14 occorrenze di `content-disposition`, **0 lato client**, e l'unico
scarico via fetch in casa **si fabbrica il nome** · ② i due 422 (P.IVA lab / cliente) **non si distinguono**
dal corpo: serve un **codice** leggibile a macchina, unione chiusa · ③ 🔄 **corretta un'assunzione mia**:
`lab-context.ts:19` **non** porta i dati fiscali del laboratorio → la prevenzione del caso ③ vuole una lettura
in più. **È la forma di P28: provato su `clienti`, assunto su `laboratori`.**

✅ **IL PIANO C'È: `docs/superpowers/plans/2026-08-02-p17-scarico-dpa.md`** — **D163**: la spec è passata al
piano **senza rilettura, per scelta** (come D149 per P7; ⚠️ **diverso** da P19-a, che aspetta una risposta mai
arrivata). **Cinque task** + un **Task 0** che prova le assunzioni prima di costruirci sopra.
⏭️ **PROSSIMO PASSO: eseguire il piano, un task alla volta (R-E1)**, a partire dal Task 0.
⚠️ Superficie **in produzione**: **FASE 9b** obbligatoria prima di unire. **Nessuna migration** → niente FASE 6b.
🛑 P16 **non si riapre** (deferita, D134) — ma i testi nuovi stanno su `--t1` per non nascere col suo difetto.

📌 `tsc` · `vitest` · `next build`: **non rimisurati oggi** (nessun codice applicativo toccato). Riferimento di
ieri: **0** · **4382 | 19** (375 file) · **0**.
📎 **162** decisioni in **56** tornate (**D156-D162** oggi); la prossima è **D163**.

# Sessione attiva — FASE 1: si lavora a P17 (lo scarico che fallisce)

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-02-p7-in-produzione-e-la-deriva-delle-date-handoff.md`** — leggilo
per intero, **ma la sua §0 ① è superata da D156** (vedi sotto). 📅 **D155 vale:** la data si legge da `date`
(`CLAUDE.md` §0F); i file `2026-08-03-*` sono dell'1 agosto, i `2026-08-04-*` del 2.

🛑 **D156 — NESSUNO USA QUESTA PWA, E NESSUNO LA USERÀ FINCHÉ NON SI DISTRIBUISCE.** Promemoria esplicito di
Francesco. ➡️ **La frase falsa di `DpaTemplate.tsx:210` ESCE da FASE 1 e torna in FASE 2 come `P19-d`**, da fare
**insieme a P19-a**. 🔑 **Il difetto era nella premessa** («*un documento che l'app produce oggi*»): quel PDF non
raggiunge nessuno — 3 laboratori, tutti di prova. **«In produzione» ≠ «qualcuno lo usa».** ⚠️ Non tocca l'altra
metà di D145: **P7 resta FASE 1** (la ragione lì è la finestra sulle righe, non l'utente).

🔨 **D157 — LA FASE 1 PROSEGUE DA P17.** Il tasto «Scarica DPA PDF» è un `<a href>` nudo: se la rotta risponde
male, il titolare vede `{"error":"…"}` a schermo, senza tasti. Perimetro **doppio**: ① il tasto
(`src/app/api/clienti/[id]/dpa/route.ts:66-72`) · ② sulla stessa scheda, guasto di lettura e «mai emesso» si
vedono **identici** (`src/app/(app)/clienti/[id]/page.tsx:169-171`). ⚠️ Superficie **in produzione**: trascina
**§0B per intero** (mockup → scatti 390/768/1280 chiaro+scuro → approvazione di Francesco → React) **+ FASE 9b**.

📌 Stato: `main` **`94576989`**, albero pulito, 0 da pubblicare · `tsc` **0** · `vitest` **4382 | 19** (375 file)
· `next build` **0** (misure di ieri, da rifare in FASE 7).
📎 **157** decisioni in **56** tornate (**D156 · D157** oggi); la prossima è **D158**.

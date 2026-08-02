# Sessione attiva — il salvataggio parte da solo (D139), e il primo tentativo non partiva affatto

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-04-gate-l2-e-panel-handoff.md`** — resta valido per tutto
il resto. ✅ **Chiusa la sua §0 ②:** il salvataggio del database **ora parte ogni notte alle 03:00**.

🛑 **Il fatto della giornata: il primo lavoro registrato NON È MAI PARTITO.** `provato:` con una sonda
lanciata da `launchd`, dentro `~/Downloads` — dove vive il progetto — ogni livello dà «Operation not
permitted»; `~/Library` si legge. È la protezione di macOS, non un difetto nostro. 🔑 **Trovato solo
facendolo partire davvero da `launchd` con Docker spento**: a mano funzionava benissimo.

✅ Copia autonoma in `~/Library/Application Support/UA-salvataggio/` · archivio riscritto **senza
librerie** (`provato equivalente`: 31 file identici bit per bit) · versione strumento **fissata** ·
fallimento **rumoroso** (notifica + Scrivania + guardia al commit) · `scripts/guardia-salvataggio-installato.mjs`
**ferma il commit** se la copia diverge (accesa 4 volte su 4).

⚠️ **P20 NON è chiusa:** parte solo se il Mac è acceso e Francesco ha fatto l'accesso. Il piano a
pagamento resta **un acquisto di Francesco**. 🔴 Restano aperte anche le **due azioni sue**: guardare il
piano Vercel e il piano Supabase nel pannello.

📌 `tsc` **0** · `vitest` **375 | 3** file e **4380 | 19** prove · guardie **verdi**.
📎 Verbale: **centotrentanove** decisioni in **cinquantuno** tornate; la prossima è **D140**.
⚠️ L'orologio del Mac dice **2 agosto**; i documenti seguono la serie del **4 agosto**.

⏭️ **PROSSIMA COSA: la spec dell'ondata P19** (il contratto UÀ↔laboratorio) — brainstorming (FASE 2) →
validazione architetturale (FASE 3) → piano (FASE 4). ⚠️ Dominio critico: percorso **GRANDE**.
🛑 L'ondata 2 (la firma a distanza) non parte finché P19 non è chiusa.

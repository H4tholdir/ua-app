# Sessione attiva — il salvataggio che non partiva, la spec del contratto, e la roadmap in ordine

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-04-salvataggio-p19-e-riordino-handoff.md`** — leggilo per intero.

🔴 **La §0 in una riga: nemmeno oggi una riga di codice APPLICATIVO** (`provato:` `git diff 8caadc2c..HEAD --
src/ supabase/` → vuoto) — e pesa il doppio, perché la giornata si è chiusa ratificando che **prima si finisce
la PWA** (D144). **La FASE 1 non è iniziata.** Poi: 🔴 **3 salvataggi NON pubblicati** · la **spec P19-a non è
stata riletta** da Francesco · la **frase falsa a `DpaTemplate.tsx:210` è ancora viva** (FASE 1, non aspetta
più P19) · i traguardi **V1.9/V2.0** portano ancora il trigger «Filippo», **dichiarato morto in testa e vivo
in fondo**.

✅ **Fatto:** il **salvataggio del database parte da solo alle 03:00** (D139) — e il primo tentativo **non
partiva affatto**: dentro `~/Downloads` un lavoro automatico non può leggere (protezione di macOS), trovato
**solo** facendolo partire da `launchd` con Docker spento. Copia autonoma in `~/Library`, archivio riscritto
**senza librerie** (`provato equivalente`: 31 file identici bit per bit), guardia anti-deriva al pre-commit.
✅ **Spec P19-a scritta** · **roadmap riordinata** in FASE 1 / FASE 2 (D144 · D145) · 🔴 **P24: il piano Vercel
vieta l'uso commerciale** (`verificato alla fonte`, Termini §4) — **UÀ così com'è non si può distribuire**.

📌 `tsc` **0** · `vitest` **4380 | 19** prove · `next build` **0** · **due** guardie verdi.
📎 Verbale: **centoquarantacinque** decisioni in **cinquantuno** tornate; la prossima è **D146**.
⚠️ L'orologio del Mac dice **2 agosto**; i documenti seguono la serie del **4 agosto**.

⏭️ **PRIMA COSA: pubblicare i tre salvataggi.** Poi si esegue la **FASE 1** — **P17** (la più visibile) o
**P7** (la più costosa da rimandare: `provato:` 2 righe, **0 firmate**). ⚡ Mezz'ora: la correzione di
`DpaTemplate.tsx:210`.

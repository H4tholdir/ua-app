# Sessione attiva — wizard «Nuovo lavoro»: SPEC RATIFICATA, PIANO ONDATA (a) SCRITTO (27/07/2026, sera)

🛑 **PUNTO DI RIPRESA:** `docs/superpowers/plans/2026-07-27-wizard-ondata-a-dato-e-api.md` — 13 task TDD.

🟡 **Nessun codice di produzione toccato. Niente committato.** Solo documenti su disco.

**Francesco ha ratificato la spec** (`docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md`) dopo
tre correzioni di coerenza: §6 diceva ancora «solo i valori prescritti» mentre **W21 stampa la realtà del
manufatto consegnato**; §3.5 lasciava aperto il destino di `dichiarazioni_conformita.colore_dente` che **W23
elimina**; il `DROP COLUMN` mancava dall'ordine della migration (§8 passo 5) — aggiunto **con verifica
preventiva** che la colonna sia davvero vuota.

**Tre decisioni nuove (27/07, sera):**
1. **Tre ondate** — (a) dato+API+atomicità · (b) wizard+odontogramma · (c) DdC+precheck. La **migration sta
   tutta in (a)**, non si spezza.
2. **La foto della prescrizione resta fuori dalla transazione** (nessun blocco al banco, W22) **ma il
   fallimento diventa visibile**: il difetto non è «fallisce», è «fallisce senza dirlo».
3. 🛑 **Vincolo di sequenza trovato scrivendo il piano:** appena le 5 colonne escono da `PATCHABLE_FIELDS`,
   `crea-lavoro.ts` e `TabClinica.tsx` **smettono di salvare**. Quindi l'ondata (a) include il loro
   reindirizzamento **a grafica invariata** (Task 11-12). Rimandare le sentinelle riaprirebbe le due sorgenti
   dello stesso fatto che il gate FASE 3 ha chiuso apposta.

**PROSSIMO PASSO:** esecuzione del piano — branch **nel repo principale**, mai worktree.
⚠️ `.gitignore:62` mangia i png → `git add -f`. Pre-commit su `--max-warnings=0`: `npx eslint src/` prima.

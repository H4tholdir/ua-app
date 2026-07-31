# Sessione attiva — la §0 dell'handoff è chiusa PER INTERO (le due impronte + la guardia overlay)

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-03-verifica-impronte-ddc-referto.md`** — le due impronte in
§1-§7, la guardia overlay in §8. Per ciò che resta da fare:
`docs/roadmap/2026-08-03-uscita-strati-e-ddc-handoff.md` §3 (righe 2, 4 e seguenti: la §0 non è più aperta).

✅ **① Le due impronte della DdC, provate in produzione.** Consegnato `TEST-DdC-001` su uachelab.com →
`DDC-2026-0002` nasce con `payload_sha256` (64 hex) e `template_version='ddc-v1'`; la `DDC-2026-0001`
(pre-D102) le ha **entrambe NULL**. Consegna **annullata**, lavoro tornato `pronto`. In produzione:
`main` = `17535613`, CI verde, deploy `success`, uachelab.com risponde.

✅ **② Il primo braccio della guardia navigazione-overlay ha misurato** — quattro bracci su quattro verdi,
due corse di fila, con la fixture `E2E-CAS-002` preparata e **rimessa com'era**.
🔴 **Ma la guardia si rompeva, e nessuno dei due difetti era dell'app:** la lettura non reggeva una
traversal cross-document (sonda: **12 rotture su 12**, col rimedio **0 su 12**) e **un'eccezione di un
braccio uccideva l'intera guardia**. Riparata, con prova che ogni rimedio morde. 🔑 *Una rete mai eseguita
non è una rete: è una promessa.*

📎 Verbale: **centotré** decisioni in trentadue tornate — **D103** (accesso al banco con i dati di
`.env.local`; in `CLAUDE.md` §9). La prossima è **D104**.
🟠 **Riferiti, non corretti (R-E2):** il PDF della DdC stampa «CONFORMITA» / «e' conforme» **senza accenti**
— e non è il carattere, il §8 rende «è» correttamente · la numerazione salta il **§2**. Voce 8 di roadmap.
📌 **FASE 7 dopo la riparazione:** `vitest` **370 | 3** file e **4267 | 19** prove · `tsc` **0**.
⚠️ La DdC emessa porta stampato **31/07/2026**: l'orologio dei documenti è quello della macchina.

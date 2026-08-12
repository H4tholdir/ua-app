### Task 3: Verifica piena, chiusura delle righe 58-59, pubblicazione

**Files:**
- Modify: `docs/roadmap/ROADMAP-UFFICIALE.md` (righe 58 e 59 → CHIUSE, con le prove; testa aggiornata)
- Modify: `memory/MEMORY.md` (testa: code 58-59 chiuse)

**Interfaces:** consuma i due task; nessun produce.

- [ ] **Step 1: FASE 7 piena, output reale**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit && echo TSC_OK
```
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npm run verify:full; VERIFY_EXIT=$?; echo "VERIFY_EXIT=$VERIFY_EXIT"
```
(⚠️ uscita da variabile, SENZA pipe, timeout 600000 — le ~137 saltate d'integrazione in locale sono
attese; le nostre nuove prove girano col comando sotto.)
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/
```
Atteso: l'intero progetto integration verde (nessun file saltato).
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx next build
```
Atteso: build pulita (nessun handler toccato, ma i tre comandi sono tre — FASE 7).

- [ ] **Step 2: chiudi le righe 58 e 59 nella roadmap**

In `docs/roadmap/ROADMAP-UFFICIALE.md`: le righe **58** e **59** si riscrivono CHIUSE — ✅, la data, il
rimedio vero (trigger `trg_avviso_chiusura_one_way` · `utenti_id_lab_uk` + `avvisi_dentista_comunicato_da_fk`),
le migration `<TS1>`/`<TS2>`, i due file di prova, e il nome nuovo della FK dichiarato dove la riga 59
citava il vecchio. Testa del documento aggiornata (code 58-59 chiuse). In `memory/MEMORY.md`: testa
aggiornata allo stesso modo. La guardia di coerenza (`node scripts/guardia-coerenza-documenti.mjs`)
DEVE restare verde.

- [ ] **Step 3: commit docs + push del ramo**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && git status --short
git add docs/roadmap/ROADMAP-UFFICIALE.md memory/MEMORY.md
git commit -F <file-messaggio>   # docs(roadmap): righe 58-59 chiuse — prova inalterabile e firma same-lab
git push -u origin code-58-59-prova-inalterabile
```

- [ ] **Step 4: review di ramo (FASE 8) e merge (FASE 10 — giudizio D296)**

Review con `/code-review` + `superpowers:requesting-code-review` sul diff del ramo. Poi il giudizio
D296, motivato: ondata COMPLETA (nessun difetto dichiarato), CI verde sul ramo, migrations già vive sul
banco di prova, zero superfici toccate → merge su `main`, push, CI, verifica deploy. Se un Critical o un
Important emergono dalla review, si chiudono PRIMA del merge.

---

## Self-Review (fatta il 11/08/2026 prima di consegnare il piano)

1. **Copertura del mandato:** riga 58 → Task 1 (trigger + 11 prove); riga 59 → Task 2 (UNIQUE + FK + 7
   prove + 1 asserzione esistente aggiornata); «prima dell'onboarding reale» → Task 3 chiude le righe e
   pubblica. ✔
2. **Segnaposto:** nessun TBD/TODO; l'unico blocco «da copiare» (helper del Task 2) rimanda a codice
   COMPLETO nel Task 1 dello stesso documento, con la ragione (convenzione file-locali). L'asserzione ⑨
   (`ris.r.aggiornati`) porta il comando per verificarla sul corpo vivo prima di fidarsene. ✔
3. **Coerenza dei nomi fra i task:** `trg_avviso_chiusura_one_way` (Task 1, prova ⑪ e messaggio RAISE) ·
   `utenti_id_lab_uk` e `avvisi_dentista_comunicato_da_fk` (Task 2, prove ①②③④⑤ e migration) — identici
   ovunque, verificati rileggendo. ✔
4. **Rischio dichiarato:** la forma esatta del diff dei types al Task 2/7 dipende dal generatore
   Supabase — per questo il passo prescrive di LEGGERE il diff, non di assumerlo. Il valore di ritorno
   di `avvisi_segna_visti` (⑨) va verificato sul corpo vivo. Sono i due soli punti in cui il piano
   prevede una lettura invece di un'asserzione cieca.

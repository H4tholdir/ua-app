# DECISIONI PENDENTI — la coda delle questioni per Francesco (PIPELINE-3 §4, D197)

Le questioni che NON bloccano il lavoro corrente si accodano qui invece di interrompere.
Francesco le smaltisce a finestre. Basso rischio: procede col **default** se non vetato entro
la finestra successiva (e il default eseguito si annota nel referto). Alto rischio (dati, MDR,
contratti, UX visibile, design system): **blocca** finché non risponde.
⚠️ Una decisione PRESA riceve il suo numero D nello stesso turno (§0A-bis) — qui vivono solo
quelle **in attesa**.

**Formato:**

| # | Posta il · da | La questione, con le opzioni | Raccomandazione + default proposto | Rischio | Stato |
|---|---|---|---|---|---|
| Q1 | 04/08 · audit Fase 0 | `npm test` e il commento di `vitest.config.ts` si contraddicono (scheda E2 di `docs/ops/EMERGENTI.md`). **(a)** allineare lo script al commento (`"test": "vitest run tests/unit"` — le integration restano su `test:integration`); **(b)** allineare il commento allo script (npm test = tutto, con skipIf) | **(a)**: `npm test` torna il comando quotidiano prevedibile e veloce; le integration si chiamano per nome quando servono. Default: (a) | basso | 🔴 in attesa |
| Q2 | 04/08 · dopo D199 | **Pubblicare i salvataggi in attesa su produzione?** (9 alla scrittura — il numero cresce coi commit di verbale: si conta con `git rev-list --count origin/main..main` al momento del sì) Contengono: il colore D193 (ora approvato a schermo, D199), la Fase 0 di PIPELINE-3 (D197-D198, solo processo: script, docs, hook), gli scatti di D193 e i 3 salvataggi già in attesa da prima. Con D199 il blocco «D193 mai guardata» è caduto. **(a)** pubblicare ora (`git push` → CI → CD → verifica su uachelab.com, FASE 10); **(b)** aspettare e accumulare con P38/P39 | **(a)**: la distanza fra main e produzione è essa stessa un rischio (8 salvataggi che nessuno esercita online); il contenuto è approvato o solo-processo. ⚠️ Alto rischio per policy: NIENTE default — si pubblica solo su risposta esplicita di Francesco | **alto** | ✅ decisa il 04/08 → **D200**, eseguita: CI+CD verdi, `#9a8f80` trovato nel CSS di produzione |

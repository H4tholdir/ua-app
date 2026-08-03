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

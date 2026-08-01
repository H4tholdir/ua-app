# Sessione attiva — D42 aperta: spec delle tinte del manufatto RATIFICATA, si va ai mockup

🚪 **PUNTO DI RIPRESA: `docs/superpowers/specs/2026-08-03-tinte-manufatto-design.md`** — la spec di D42,
ratificata. Il suo §1 dice cosa NON è, il §2 il censimento coi riferimenti verificati, il §8 le domande
aperte. Verbale: tornate **35** e **36** (D109-D118).

🎨 **D42 — che cosa si costruisce:** catalogo nuovo e separato `tinte_manufatto` per le tinte **non
dentali** dei tre tipi che ne hanno una (placca con vite · apparecchio funzionale · paradenti), più **due
colonne** su `lavori` con chiave esterna composita. Una tinta sola, catalogo chiuso uguale per tutti, due
famiglie **col vincolo nel database**, facoltativa e saltabile, pallino solo dove è onesto.

✅ **MOCKUP FATTI E SCELTI (D119): la tavolozza è la GRIGLIA di pastiglie** — diciassette tinte in una
schermata sola; l'elenco raggruppato ne mostrava dodici su diciassette e resta nel mockup con la sua
ragione. Mockup + 13 scatti in `docs/design/mockups/`. Due difetti trovati guardando e corretti: il nome
lungo che sfasava la riga, e il blocco dell'avviso mal formattato.

✅ **PIANO SCRITTO — parte 1:** `docs/superpowers/plans/2026-08-03-tinte-manufatto.md`, **9 task** coi tre
registri (prove, letture, censimento). Ogni vincolo si prova con **valori che DEVONO essere rifiutati**,
più due controlli positivi.

🔴 **Il passo del wizard è FUORI e diventa la PARTE 2, e serve una decisione prima di scriverla:**
misurando è emerso che l'impalcatura dei passi adattivi (`NomePasso`, `SEQUENZA_CANONICA`, `sequenzaPassi`)
**non è agganciata a nessuna schermata** — la usano solo le sue prove — e il wizard vero è ancora a **tre
passi numerati** che si fermano al paziente. O si aggancia l'impalcatura (lavoro aperto dell'ondata (b),
tocca la bozza salvata a 24 ore → `v: 2`), o si bullona un quarto passo numerato che poi va disfatto.

➡️ **PROSSIMO PASSO: eseguire il piano** — un task alla volta a un esecutore fresco (R-E1), ramo
`tinte-manufatto` **nel repo principale** (🛑 mai un worktree). **GRANDE, con migration.**

🔴 **Due fatti misurati aprendo i file, che nessun documento diceva:** nel wizard **il passo del colore non
esiste per nessun tipo** (finisce al paziente, dove il colore è testo libero) · la tendina della scheda
offre **19 codici su 48**.

✅ **Chiuso prima, nella stessa sessione:** la §0 dell'handoff del 3 agosto — la DdC **guardata uscendo
dalla produzione**, otto criteri su otto verdi, referto in `docs/roadmap/2026-08-03-ddc-produzione-referto.md`.
🔴 **Due voci nuove da quel giro, in roadmap:** il **buono di consegna non si rigenera dopo un annullo** ·
la DdC cita **`Art. 2(1)(3)` MDR, che non esiste**. Le undici voci aperte sulla DdC stanno ora nella
roadmap, sezione «📄 I documenti che escono dal laboratorio».

🚀 **Stato:** `main` allineato con origin. **Nessuna riga di codice toccata in tutta la sessione.**
📌 **Riferimento misurato su `main`:** `tsc` **0** · `vitest` **370 | 3** file e **4275 | 19** prove ·
`next build` ok.
📎 Verbale a **centoventi** decisioni in **trentasette** tornate. La prossima è **D121**.
⚠️ L'orologio della macchina dice **1° agosto**; i documenti seguono la serie del **3 agosto**.

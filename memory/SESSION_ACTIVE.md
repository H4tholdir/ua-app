# Sessione attiva — D42 aperta: spec delle tinte del manufatto RATIFICATA, si va ai mockup

🚪 **PUNTO DI RIPRESA: `docs/superpowers/specs/2026-08-03-tinte-manufatto-design.md`** — la spec di D42,
ratificata. Il suo §1 dice cosa NON è, il §2 il censimento coi riferimenti verificati, il §8 le domande
aperte. Verbale: tornate **35** e **36** (D109-D118).

🎨 **D42 — che cosa si costruisce:** catalogo nuovo e separato `tinte_manufatto` per le tinte **non
dentali** dei tre tipi che ne hanno una (placca con vite · apparecchio funzionale · paradenti), più **due
colonne** su `lavori` con chiave esterna composita. Una tinta sola, catalogo chiuso uguale per tutti, due
famiglie **col vincolo nel database**, facoltativa e saltabile, pallino solo dove è onesto.

➡️ **PROSSIMO PASSO: i MOCKUP (§0B), non il codice.** Più varianti mai una sola, 390/768/1280, chiaro e
scuro, in `docs/design/mockups/`. **Domanda lasciata aperta apposta per il mockup:** con 17 tinte per
famiglia, griglia di pastiglie col pallino o elenco raggruppato per colore? Si portano disegnate
**tutte e due**. Poi il piano (R-P1 · R-P2 · R-P6), poi il ramo. **GRANDE, con migration.**

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
📎 Verbale a **centodiciotto** decisioni in **trentasei** tornate. La prossima è **D119**.
⚠️ L'orologio della macchina dice **1° agosto**; i documenti seguono la serie del **3 agosto**.

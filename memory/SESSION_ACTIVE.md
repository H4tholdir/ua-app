# Sessione attiva — UÀ

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-08-05-caricamento-diretto-storage.md`, da T4.**
(L'handoff `docs/roadmap/2026-08-05-caricamento-handoff.md` resta valido **tolta la sua §0②**, fatta.)

**Fatto oggi, in ordine:**
- **D238** — i due difetti vivi chiusi (`f5f80b8e`): via il **WebP → JPEG** e si **controlla il tipo
  ricevuto** (su Safari/iPhone la conversione non avveniva e tornava un PNG in silenzio); **controllo
  di peso** in `TabImmagini`, messo **dopo** la compressione (a monte rifiuterebbe le foto da 6MB che
  oggi passano).
- **D239** — il §4 del piano dava per aperte D236 e D237, già decise: allineato.
- **L'errore si dice con l'Avviso §5.18** (`c25654e6`), non con un riquadro inventato — Francesco:
  «*stile AI slop, usiamo le regole del nostro design system*». Il suono non si sdoppia: prova che
  conta le chiamate.
- **T1** (`63911666`): percorso `<laboratorio_id>/lavori/<lavoro_id>/<uuid>.<ext>`, laboratorio dalla
  **sessione**, `Date.now()` fuori (R23). **5 file spostati e verificati**: stessi cinque pesi,
  `lavori/` vuota, orfano tolto dopo copia di sicurezza.
- **T2** (`79c5f9d2`): la policy **nega** invece di esplodere. 🔎 **Erano OTTO, non quattro** (anche
  `fatture-pdf`): chiuse tutte con una funzione, `public.storage_lab_del_percorso`. Provato col
  valore che DEVE essere rifiutato. Migration **applicata e registrata**, tipi rigenerati (FASE 6b).

🔎 **Riferiti (R-E2), fuori mandato:**
- il **registro delle migration era disallineato**: la migration di D236 era applicata in banca dati
  ma **non registrata** — al prossimo push sarebbe stata rieseguita. Registrata.
- il censimento del piano diceva «nessuno interpreta `storage_path`», ma il suo grep non elencava
  `endsWith` — e un lettore c'è (`TabImmagini.tsx:124`). Non ha morso.
- una carta di caricamento fallito **non si può togliere** dalla schermata finché non si ricarica.

📌 **Misurato** (`npm run verify:full`): tsc 0 · eslint 0 · vitest **4892 passate | 19 saltate**
(412 file) · build ok · sei guardie verdi.
⚠️ **La prova che manca:** il comportamento su un **iPhone vero**.

⛔ **Non pubblicato:** il ramo `fix-limite-caricamento` esce **con** la soluzione (D235).

- **T3** (`7e0652a0`): le due rotte ci sono. **C1** provata con **nove** forme di percorso rifiutate
  (altro laboratorio · altro lavoro · risalita di cartella · nome non-uuid · estensione fuori
  elenco…); **C2** provata (file assente → nessuna riga; peso e tipo si leggono dal magazzino).
  Limite di frequenza sulla firma: 120 immagini/ora per laboratorio.
  🛑 **Due difetti del piano, riferiti:** ① «su qualunque rifiuto, `remove` del percorso» sarebbe
  un'**arma** se applicato al percorso ricevuto (farebbe cancellare a noi il documento di un altro
  laboratorio): si toglie **solo** ciò che è già passato da C1 · ② «aggiungere le rotte a
  `check-csrf.sh`» non serve — la guardia è a scoperta automatica dal 28/07 (verificato che si
  accende davvero: rossa con una rotta scoperta, verde tolta).
  ⚠️ **Nessun client le usa ancora**: è T4.

➡️ **Prossimo: T4 — i tre client** (`FrameFatto` · `AllegaPrescrizioneSheet` · `TabImmagini`) al
corridoio nuovo: firma → `uploadToSignedUrl` → conferma. L'avanzamento si prende dall'XHR già in
casa. Poi T5 (costanti per corridoio), T6 (mietitore degli orfani), T7 (via la vecchia rotta).

📎 **239 decisioni in 89 tornate; la prossima è D240.**

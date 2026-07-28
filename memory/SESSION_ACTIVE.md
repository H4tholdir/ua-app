# Sessione attiva — ONDATA (b): PANEL FATTO, il piano NON si esegue (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-panel-validazione.md`** — il verbale del panel.
Il piano (`2026-07-28-ondata-b-piano.md`) si legge **dopo**, e non nella forma attuale.

**7 revisori** (4 di lente + 3 lettori sugli 11 file mai aperti), ~70 file aperti, **29 rilievi ·
6 BLOCCANTI · 15 affermazioni del piano verificate FALSE** (9 riverificate a mano).
🔑 **Il piano sbagliava dove si sentiva sicuro:** P1 «provata» prova il caso banale · il censimento dei token
indicava regole CSS **inesistenti** · la citazione-àncora del §4 punta al `catch` sbagliato · il drift
`bite_splint` **non esiste**.

**I 6 bloccanti in una riga:** ① il 23505 non è gestito → «Riprova» all'infinito (il modello esiste in **9
route**, `api/pazienti` è l'unica senza) · ② il **momento in cui il lavoro nasce** non è deciso, e T14/T15
dicono il contrario · ③ `cosaSiPerde` non vede il dentista · ④ l'uscita naviga da dentro un overlay e
**l'attrezzo non esiste** (`useNavigaDaOverlay` prende un href, serve `back()`) · ⑤ **NESSUNO STAGING**:
la migration di T4 va sull'unico DB, quindi la gestione dell'errore va su `main` **prima** · ⑥ il `DELETE`
immagini impugna `url` (morto) invece di `storage_path`, e non ha né soggetto né finestra.

✅ **Chiuso: la chiave `localStorage` NON si rinomina** (i test la leggono dalla costante: rinominarla
renderebbe verdi a vuoto tutte le verifiche di pulizia).
🔧 **Fatto il 29/07:** conteggio 10→11 · spec §15 (tre superfici avevano già i mockup approvati, D23-D25) ·
verbale D22 ripulito dalle due stesure superate · 6 screenshot salvati (98 = 98) · **nota falsa
`bite_splint` rimossa da `tipi-lavoro.ts`**.
🟡 **In corso:** panel normativo a 3 advisor su **4 domande** (soft/hard · chi-e-fino-a-quando ·
riuso del codice archiviato · normalizzazione). Poi la **riscrittura del piano**. **Zero righe di codice
applicativo.** Baseline riverificata: **294 · 0 · 916 · 48**.

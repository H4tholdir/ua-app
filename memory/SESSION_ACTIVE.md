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
✅ **PANEL NORMATIVO CHIUSO — 4 domande su 4.** Foto: **soft-delete**, stessi ruoli che caricano, finestra
**fino alla consegna** (che è anche il confine di legge: Art. 52(8) + Art. 2(28) → la consegna **è**
l'immissione sul mercato). **D34 ratificata:** il codice di un archiviato **non si riusa mai** ·
**D34-bis:** `lower(btrim(...))`, che è la normalizzazione **già presente** su quella colonna.
🔧 **Base normativa corretta in 3 documenti:** per i **su misura** non è l'Art. 10(8) (i suoi oggetti sono
riservati ai dispositivi «diversi dai su misura», Art. 10(4)/(6)) ma **Art. 10(5) + All. XIII p.4**; e
`ANALISI/17:174` diceva **10** anni per gli impiantabili invece di **15**, contraddicendo la sua stessa
riga :149.

🛑 **PUNTO DI RIPRESA OPERATIVO: `docs/roadmap/2026-07-29-ondata-b-piano-v2.md`** (scritto il 29/07).
**Consegna zero (Z1-Z3) va in produzione DA SOLA e PRIMA del ramo** — non c'è staging, quindi l'indice
varrebbe per la produzione senza la gestione dell'errore. Poi 23 task.
🔴 **Restano: 3 sonde** (P2 da rieseguire · P3 · P6-forma) · **2 gate di mockup** (denti, colore) ·
**2 decisioni di prodotto** (quando nasce la cassetta creata dal wizard · la stringa della briciola).
**Zero righe di codice applicativo.** Baseline riverificata: **294 · 0 · 916 · 48**.

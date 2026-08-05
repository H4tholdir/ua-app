# Sessione attiva — UÀ

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-05-caricamento-diretto-handoff.md`** — la §0 per prima.

🚀 **Il caricamento diretto è IN PRODUZIONE** (piano T1-T7 completo, D235-D241). I file non passano
più dalla funzione: vanno **dritti al magazzino**, tetto **50MB** invece di ~4,2. Provato sul sito
vero con un PDF da **6,1MB**, e provato dall'utente vero (due foto dal telefono alle 12:33/12:34 UTC,
che hanno la riga).

🔴 **LA §0 IN UNA FRASE: il GATE ESTETICO L2 NON è stato fatto** e il codice con UI toccata è già in
produzione (al suo posto c'è un mockup approvato, che è un'anteprima del componente, non un audit
della schermata) · manca la **prova su un iPhone vero**, da cui dipende la scelta della riga 16 (HEIC)
· `CRON_SECRET` è stata aggiunta ma **non verificabile da qui**: si conferma su Vercel → Cron Jobs
(piano Hobby: l'orario ha **±1 ora**, quindi fra le 4:20 e le 5:19) · nessuna misura su **rete mobile
vera**, e ora i file arrivano a 50MB senza ripresa · una carta di caricamento fallito **non si può
togliere** dalla schermata.

🔑 **La lezione della giornata, e vale oltre questo caso:** una migration applicata al database vive
**subito**, il codice che l'accompagna no — fra i due istanti c'è una finestra che **nessuna prova
automatica vede**. Qui è durata due ore e **ha rotto il caricamento foto in produzione** (D241).
➡️ Ciò che **toglie** qualcosa si applica **dopo** aver pubblicato il codice che smette di usarlo.

📌 **Misurato in chiusura** (`npm run verify:full`): tsc 0 · eslint 0 · vitest **4944 passate | 19
saltate** (415 file) · build ok · sei guardie verdi. `main` allineato a `origin/main`, 0 in attesa;
ramo `fix-limite-caricamento` cancellato dopo il merge.

➡️ **Prima cosa:** la **DdC che può uscire senza il nome del prescrittore** — verificato oggi riga per
riga (`TabDati.tsx:283` scrive `''` · `precheck.ts:23` ripiega sul cliente e passa · ma
`generate-ddc.ts:146` usa `??`, che su stringa vuota **non** ripiega → il documento esce vuoto).

📎 **241 decisioni in 91 tornate; la prossima è D242.**

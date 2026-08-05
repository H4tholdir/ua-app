# Sessione attiva — UÀ

🚀 **IL CARICAMENTO DIRETTO È IN PRODUZIONE.** Piano `2026-08-05-caricamento-diretto-storage.md`
completo (T1-T7), pubblicato con fast-forward di 24 commit, CI e CD verdi.

🚪 **PUNTO DI RIPRESA: `docs/roadmap/ROADMAP-UFFICIALE.md`** — nessun compito aperto sul caricamento.

**Cosa è cambiato per chi usa l'app:** i file non passano più dalla funzione, vanno **dritti al
magazzino**. Il tetto è **50MB** invece di ~4,2. Provato sul sito vero: un PDF da **6,1MB** si
carica (firma 200 · byte 200 · conferma 201 · riga nel recinto).

🔴 **Il rilascio ha chiuso un difetto VIVO che nessuno sapeva di avere (D241):** la migration di
D236 era stata applicata al database alle 09:59 **senza pubblicare il codice**, quindi da stamattina
ogni caricamento di foto in produzione falliva e lasciava un file orfano (prova: due file alle 11:23
e 11:24 sul lavoro 2026/0017, cancellati su autorizzazione di Francesco).
🔑 **La regola che ne esce:** una migration che **toglie** qualcosa si applica **dopo** aver
pubblicato il codice che smette di usarla. Fra i due istanti c'è una finestra che **nessuna prova
automatica vede**, perché in locale i due pezzi sono sempre allineati.

⚠️ **Aperte e dichiarate:**
- la prova su un **iPhone vero** (HEIC): da lì dipende la scelta della riga 16 di roadmap — accettarlo nel
  bucket o rifiutarlo al selettore. Oggi è **fuori** dall'elenco, e una guardia
  (`scripts/guardia-tipi-bucket.mjs`) tiene allineate le due liste;
- **`CRON_SECRET`** su Vercel, se si vuole il mietitore automatico delle 4:20 (`INTERNAL_SECRET`
  esiste già e basta per chiamarlo a mano);
- 🔴 la **DdC col prescrittore vuoto**, indipendente da tutto il resto.

📌 **Misurato** (`npm run verify:full` prima del rilascio): tsc 0 · eslint 0 · vitest **4944 passate
| 19 saltate** (415 file) · build ok · sei guardie verdi.

📎 **241 decisioni in 91 tornate; la prossima è D242.**

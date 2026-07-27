# Sessione attiva — nome paziente correggibile: ramo PRONTO AL MERGE (27/07/2026)

✅ Ramo `ondata-nome-cognome-paziente`, 15 commit. tsc 0 · eslint pulito · vitest **3424/19** (base
3364) · build ok. Dettaglio completo: MEMORY.md **voce 51**.

🛑 **Perimetro ridotto in corsa (Francesco): il wizard va ripensato per intero** → fermi mockup,
`crea-lavoro`, `PassoPaziente`, bozza `v:2`. ⚠️ **La targa NON migliora con questo ramo.**

**Il perno:** il trigger è `BEFORE INSERT OR **UPDATE**` → la tabella §5 non è una regola del
wizard, è un **invariante di `pazienti` con 3 scrittori** → una funzione sola
(`src/lib/domain/nome-paziente-scrittura.ts`).

**Le 4 revisioni hanno trovato 3 difetti veri, tutti riprodotti eseguendo il codice:** cognome
spogliato col codice NUOVO invece del vecchio (arrivava fino alla DdC) · la correzione di quel
difetto ne introduceva un altro (cancellava un cognome vero uguale al codice) · 🔴 **la rettifica
non funzionava sui pazienti del wizard**, cioè quelli per cui esiste (`''` su `data_nascita`/`sesso`
faceva fallire l'UPDATE, e un `catch` vuoto lo nascondeva).

🔑 **Metodo da riusare:** ogni correzione provata **per mutazione** — rompere il codice di proposito
e verificare che il test diventi rosso **per asserzione, non per crash**. Una mutazione realistica
(client che sceglie il laboratorio) passava 18/18 verdi.

🔑 **Direttiva nuova (`CLAUDE.md` §7): «Statuto delle fonti»** — i documenti `ANALISI/` che
descrivono *come si lavora* sono materiale di studio **non verificato**. Serve una fra: fonte
esterna, prova nel codice, obbligo di legge, decisione di Francesco.

✅ **COLLAUDO DAL VIVO FATTO** (Francesco loggato). Ha trovato ciò che i test non vedevano: il tasto
«Salva» finiva **sotto il bordo** su scrivania e **coperto dalla barra** su telefono. Chiuso
allineandosi al pannello gemello dei clienti. Prova end-to-end su PZ-0003: casella Cognome vuota
(codice nascosto) → salvato → la scheda mostra **«BAGHERIA GIUSEPPE»**, cognome davanti.
⚠️ Screenshot NON su disco: pagina dietro login. ⚠️ PZ-0003 resta rinominato (DB di test).

✅ **IN PRODUZIONE.** Merge `9aea0f22` su main → CI verde → deploy Vercel riuscito →
`uachelab.com` risponde, zero errori in console. **Ondata chiusa.**

**PUNTO DI RIPRESA:** `docs/roadmap/2026-07-27-ripensamento-wizard-handoff.md` — il ripensamento
del wizard «Nuovo lavoro», **percorso GRANDE con migration** (il colore oggi è in 4 colonne del
lavoro intero: «più denti con più colori» non è rappresentabile). Ramo dell'ondata cancellato dopo
il merge. Coda completa: ROADMAP voce 19.

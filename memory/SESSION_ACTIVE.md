# Sessione attiva — ondata (b): l'album delle foto, esecuzione APERTA (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-album-foto-esecuzione-handoff.md`**. Documento operativo:
il piano `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` (**14 task**: 13 + **T9-bis**).
⚠️ Il ledger `.superpowers/sdd/progress.md` è **fuori dal repo git**: non è un punto di ripresa.

**Ramo `ondata-b-schermate`** — niente su `origin`. Spec ratificata · mockup approvato · verbale a **ottanta**
decisioni.

🆕 **D80 (30/07, ventunesima tornata):** la conferma di eliminazione è il **foglio dal basso** del mockup,
non la card centrata. **Lo scostamento S1 è RITIRATO.** Nasce **T9-bis** (`FoglioConferma`), la §5.x si
propone nel gate **T5**, **T12** lo usa. Deroga verso **§5.17** (non §5.16: l'invariante «mai modal centrato
su mobile» il foglio lo rispetta).
🔴 **Costo misurato, da risolvere nel gate T5:** `Sheet` tiene il valore precedente dello scorrimento in un
`useRef` **per istanza** (`Sheet.tsx:222`) → un secondo foglio **sopra il visore** lascerebbe la pagina
bloccata per sempre. Il foglio di conferma **non blocca**.

✅ **Task 1 FATTO** (`9961964f`): colonna `categoria` vincolata ai sei valori, `tipo` eliminata, migration
registrata con `npx supabase db push --yes`, `tsc` 0, vitest **3850 | 19** identico al riferimento.
🔴 **E ha trovato un difetto più grande di sé: `tsc` NON protegge le query.** I quattro fabbricanti del
client Supabase non portano il generico `<Database>` → una colonna **inventata** in un `.insert()` lascia
`tsc` a **0**. È **R27** (roadmap propria, 147 file, decide Francesco); **R28** = la rotta POST rimanda il
messaggio grezzo del database e non ha test → **si chiude in T3**. **P2 del piano è stata corretta.**
✅ **Task 2 FATTO** (`cf976a96`): `src/lib/domain/categorie-foto.ts` + le due prove. vitest **3863 | 19**
(+13), `tsc` 0. **Sette mutazioni provate, nessuna prova decorativa.** Ha trovato **quattro difetti nel
piano**, tutti corretti nel piano stesso: il codice della spia **non compilava** (e la riga rotta era
proprio la seconda direzione del confronto) · **M2 non poteva mostrare entrambe le direzioni** → aggiunta
M2b · il blocco «Interfacce» contraddiceva il codice (`categoria: string`, non l'unione) · `isCategoriaFoto`
**non era coperta** da nessuna prova.
🛑 **Per T3:** la spia sorveglia **due** copie dell'elenco, non tre — la terza (la validazione della rotta)
è coperta **solo** se T3 **importa** `isCategoriaFoto` invece di ricopiare la lista.

🔴 **D81 (30/07): il caricamento foto su uachelab.com è ROTTO e resta così fino al merge**, per scelta di
Francesco (dati di prova, nessun cliente vero). Causa: **un solo database** per prove e produzione (**R29**)
— la migration ha tolto `tipo`, il codice pubblicato la scrive ancora. **Si ripara al merge, ed è un passo
di collaudo di T13.**

✅ **Task 3 FATTO** (`b925a866`): POST e PATCH pretendono e **validano** `categoria` (**422**, non 500),
importando `isCategoriaFoto` (la terza copia dell'elenco è coperta) · chiuse **R26** (tre `.eq()` +
`deleted_at` + conteggio righe) e **R28** (niente più messaggi grezzi del database al browser, e la rotta
POST ha la sua **prima** prova). vitest **3917 | 19** (+54), `tsc` 0, **sette mutazioni, tutte uccidono**.
Quattro difetti trovati nel piano (finta del PATCH, codice di prova che non compila, file di prova
mancante dall'elenco, censimento contraddittorio su chi tocca il client) — **tutti corretti nel piano**.
🔴 **Nuovi rilievi: R30** (l'errore dello Storage va ancora grezzo al browser) · **R31** (corpo JSON
non-oggetto → 500; stessa grafia in 7 file, **non verificato** che siano tutti scoperti) · **R32** (`ordine`
patchabile senza validazione).
🛑 **Da T3 il caricamento foto riceve 422**, perché `TabImmagini.tsx:131` spedisce ancora `descrizione`:
**la riparazione è T11**, ed è dichiarata nel piano.

🔴 **D81 (30/07): il caricamento foto su uachelab.com è ROTTO e resta così fino al merge**, per scelta di
Francesco (dati di prova, nessun cliente vero). Causa: **un solo database** per prove e produzione (**R29**).
**Si ripara al merge, ed è un passo di collaudo di T13.**

✅ **Task 4 FATTO** — **blocco B chiuso** (`912096a8` la tabella di traccia · `bc6ccd1f` la finta ·
`cdb96f6a` handler + prove · `246d09db` il verbale delle mutazioni · `20260730150200` la revoca dei
permessi). La cancellazione è **vera**: file prima, riga dopo, traccia dopo. **Fail-closed sul file**
(se non si toglie, la riga resta e la risposta è 500) · **fail-soft dichiarato sulla traccia**. vitest
**3926 | 19** (+9), `tsc` 0, tre mutazioni **tutte con vittime**.
🔑 **Due sonde che valgono più delle asserzioni:** la prova che la finta *senza* `storage` rompe davvero
(P12 verificata, non assunta), e l'`INSERT` come **`service_role`** — perché la traccia è fail-soft e un
permesso mancante avrebbe prodotto foto sparita, **200 OK e nessun audit, in silenzio**.
🔧 **R33 chiusa dal coordinatore:** la traccia nasceva difesa dalla sola RLS, coi permessi di tabella
ancora aperti ad `anon`/`authenticated` (14 righe, come `lab_stato_log`). Allineata al precedente più
stretto di casa (`cassette_backfill_audit`): `REVOKE ALL` + `GRANT` esplicito. Fatto **mentre la tabella era
vuota**, cioè quando costava zero.
⚠️ **R34 aperta:** `deleted_at` su `lavori_immagini` **non ha più scrittori** — otto filtri sorvegliano uno
stato che niente produce. Non urgente (zero righe già cancellate, nessun file orfano), ma va scritto
accanto ai filtri o confonderà qualcuno fra sei mesi.

✅ **Task 5 SCRITTO** (`8822fa05` · `8cdd7fc4` · `430d86e6`): le cinque §5.x in
`docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` (773 righe), **zero codice**.
🛑 **MA IL GATE NON È RATIFICATO.** Panel di tre (architettura · accessibilità · verificabilità) →
**sette bloccanti**, verbale in `docs/roadmap/2026-07-30-panel-gate-sezioni-album.md`. Convergenza a tre su
uno: **nessuna delle cinque §5.x dichiara cosa fa il `Tab`**, e la via di `Escape` ci poggia sopra.
🔑 **Due prove prescritte erano CIECHE** (la sentinella dello scorrimento è il valore che `Sheet` stesso
scriverebbe; la prova di `Escape` asserisce su uno `Sheet` che non può chiudersi da solo) · **i numeri di
contrasto del visore sono calcolati sull'elemento sbagliato** (`.vis-capo .mezzo` non ha sfondo: 2,1:1, non
4,2) · **i 148,5 px di D79 sono presi dentro la cornice di telefono del mockup** e `nowrap` rompe il
text-zoom 200%. ✅ **A-1 è VERA**, provata in `react-dom` e riverificata: il piano B non serve.

🆕 **D83:** il visore **copre tutto** → z-index **1010 · 1020 · 1030** (sopra `Sheet`/`DialogConferma`, sotto
gli avvisi). L'assunzione A-2 smette di essere portante.
🆕 **D84:** il blocco dello scorrimento si **ripara alla radice** → nasce **T5-bis** (modulo a contatore,
`blocca()` → `sblocca()` **idempotente** per lo sblocco differito di `Sheet.tsx:328`), **prima di T6**.
⚠️ Gli attori sono **due**: `Sheet.tsx:227-257` e `NuovoOrdineSheet.tsx:91-95` (il secondo scrive
`overflow=''` a mano senza catturare).

➡️ **PROSSIMO: T5-bis**, poi le correzioni del panel dentro il documento del gate, poi la ratifica, **poi**
T6 → T9-bis. 🛑 **T6 porta il gruppo di token `sopraFoto`**, non T7: `CartaAlbum` lo usa già.

**Ordine:** A (T1→T2→T3) → B (T4) → C (T5 🚪gate → T6-T9, T9-bis) → D (T10→T11→T12) → E (T13).
🛑 **A prima di D** · 🛑 **B prima di D-T12**.

🔴 **Non dimenticare:** **T8 dell'ondata è ancora a cancellazione morbida** (è il Task 4). Fuori dal piano,
prima della pubblicazione: **DPA** (D62) e **TOK-1 + CLI-1** (D53, difetto **vivo in produzione**).

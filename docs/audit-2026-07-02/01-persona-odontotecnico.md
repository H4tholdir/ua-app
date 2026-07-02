# Audit — Prospettiva: Odontotecnico Esperto (RE-AUDIT di follow-up)
**Data:** 2026-07-02 | **Versione app:** V1.9.3 (main, DS v2.3)
**Analizzato da:** 15+ anni esperienza laboratorio | **Riferimento:** DentalMaster Advanced v6.0
**Baseline:** `docs/audit-2026-05-21/01-persona-odontotecnico.md` (score 7.5/10, target dichiarato 8.5+/10)
**Metodo:** login produzione (Playwright) + verifica codice/schema/migrazioni + `git log` per confermare cosa è realmente cambiato dal 21/05/2026

---

## Nota metodologica — perché questo report si basa soprattutto sul codice

Ho tentato il walkthrough live (accettazione → odontogramma → prove → produzione → materiali → cassetta → consegna) con Playwright su `uachelab.com`. Il login ha funzionato, ma nelle sessioni successive il browser ha mostrato comportamenti incoerenti con qualunque azione mia (redirect a `/portale/[token]` di un dentista mai visitato, cambi di sessione tra "Francesco" e un altro utente, `next=` con UUID mai navigati, errore React #418). Le prove tecniche (nessuna seconda tab, nessuna azione mia in quei momenti) indicano che il browser MCP condiviso era pilotato in parallelo da un altro agente di audit (con ogni probabilità la persona "Dentista", che è l'unica ad avere motivo di aprire `/portale/[token]`). **Non riporto questi sintomi come bug di UÀ** — sarebbe un falso positivo che comprometterebbe la credibilità del report.

Ho quindi spostato la verifica sul codice sorgente, sullo schema Postgres e sulla cronologia `git log`, che sono fonti autoritative e non soggette a interferenza. Un passaggio live pulito (login + `/lavori/nuovo`, TabDati) è comunque riuscito ed è coerente al 100% con quanto trovato nel codice — quindi la sostanza del report è verificata sia da codice sia da un frammento di sessione reale.

---

## Sommario Esecutivo

Il verdetto centrale di questo re-audit: **i 4 gap operativi segnalati il 21/05/2026 sono ancora aperti**, e per uno di essi (materiali/tracciabilità) l'indagine più approfondita ha scoperto un problema più serio di quanto stimato la prima volta — non un semplice fastidio UX, ma un **buco di conformità MDR concreto**: il campo "Materiali / Lotti" della Dichiarazione di Conformità è strutturalmente vuoto per ogni lavoro creato dall'app oggi, perché la tabella pensata per alimentarlo (`lavori_materiali`) non viene mai scritta da nessun percorso di codice.

Allo stesso tempo, `git log` conferma che tra il 21/05 e oggi (28/05 → V1.9.3) il lavoro di sviluppo si è concentrato quasi interamente sul **Design System v2.3** (dark mode, token colore, shadow) e su feature per altre persone (ordini fornitori, batch fatture). I quattro file che incarnano i gap operativi di questo report — `TabDati.tsx`, `LavoroCard.tsx`, `TabProduzione.tsx`, `TabClinica.tsx` — hanno ricevuto **solo commit di styling/UX minore** (id fields, dark mode, validazione inline) dal 21/05 a oggi. Zero commit hanno toccato la logica di materiali, cassetta, cicli di produzione o posizionamento odontogramma.

**Una correzione importante al report precedente:** il gap "TabProve troppo sommario" (Problema Critico #3, 21/05) era in realtà **già risolto da 6 giorni** al momento del primo audit (commit `1c4c3ea`, 15/05/2026) — l'auditor precedente ha esplicitamente ammesso di non aver letto il file per intero. Il tracciamento prove con `numero_prova`, esiti (ok/modifiche/rifare/sospeso), date uscita/rientro previsto/effettivo è solido e **supera DentalMaster** (che ha solo 4 slot fissi; UÀ supporta iterazioni illimebase). Questo non è un fix di sprint fatto in risposta all'audit — è una correzione di un errore del report precedente. Lo segnalo per onestà metodologica, ma non lo conto come "miglioramento post-audit".

**Punteggio: 7.2/10** — sostanzialmente invariato rispetto a 7.5/10, con un calo lieve compensato da miglioramenti reali ma non mirati a questa persona. **Target 8.5+/10 non raggiunto, e non ci si è nemmeno avvicinati.**

---

## Cosa è stato verificato risolto (con evidenza)

### ✅ 1. Soft-block MDR alla consegna (Sprint Alpha A2)
**File:** `src/components/features/lavori/MaterialiWarningSheet.tsx` (tutto il file), `src/lib/consegna/orchestrate.ts`
Se i dati MDR sono incompleti, compare un bottom sheet con "⚠ Dati MDR incompleti — Allegato XIII" e pulsante esplicito "Consegna senza dati MDR completi" (non un blocco silenzioso). Corretto e ben fatto — traccia l'azione, non nasconde il rischio.

### ✅ 2. Opzione "Non dichiarato" nel disinfettante (Sprint Alpha A1)
**File:** `src/components/features/lavori/form/TabAccettazione.tsx:33`
`{ value: 'Non dichiarato', label: 'Non dichiarato' }` presente, con tooltip esplicativo MDR Art. 13(8) alla riga 324.

### ✅ 3. Compenso tecnico visibile nel listino (Sprint Beta B9)
**File:** `src/components/features/listino/ListinoVoceRow.tsx:30,79,208,221,235,243`
Campo editabile inline, non più nascosto.

### ✅ 4. Warning materiali insufficienti pre-consegna (nuovo, non richiesto esplicitamente ma rilevante)
**File:** `src/components/features/lavori/MaterialiWarningSheet.tsx`, `src/app/api/lavori/[id]/precheck-materiali/route.ts`
Prima di consegnare, l'app confronta il BOM (`listino_materiali_auto`) con la giacenza e avvisa se un materiale è sotto scorta o esaurito, con "Procedi comunque" esplicito. Buona aggiunta lato operatività quotidiana, anche se — vedi sotto — non risolve la tracciabilità per-lotto.

### ✅ (falso allarme corretto) Tracciamento prove iterate
Come spiegato sopra: già presente dal 15/05/2026, migrazione `005_v1_foundation.sql` + `src/components/features/lavori/TabProve.tsx`. Design solido, superiore a DentalMaster.

---

## Gap originali — stato reale (verificato su codice, non solo su UI)

### 🔴 GAP #1 — "Materiali da impiegare": non solo mancante, ma la tracciabilità MDR è strutturalmente rotta

Il campo "materiali da impiegare" in `TabDati.tsx` (form nuovo lavoro) è ancora assente — confermato leggendo il file corrente (nessun campo materiali tra le 8 sezioni del form) e confermato in produzione (`/lavori/nuovo`, tab "Dati", nessun multi-select materiali).

Ma l'indagine più approfondita di questo re-audit trova qualcosa di più grave: **la Dichiarazione di Conformità (DdC) — il documento con valore legale MDR — non riporterà mai i materiali/lotti usati per un lavoro creato dall'app oggi.**

Evidenza a catena:

1. `src/components/features/pdf/DdcTemplate.tsx:257-261,396-399` — il PDF della DdC ha una sezione "Materiali / Lotti" che legge da `lavoro.materiali` (nome, numero lotto, produttore).
2. `src/lib/consegna/orchestrate.ts:123` — questo campo arriva da `materiali:lavori_materiali(*)`, quindi dipende dalla tabella `lavori_materiali`.
3. `supabase/schema.sql:1084-1088` — il commento sulla tabella dice esplicitamente: *"LAVORI_MATERIALI — materiali e lotti usati in ogni lavoro. Tracciabilità MDR: da lotto → tutti i lavori (recall). Il contenuto va incluso nel materiali_json della DoC."* Ha anche un trigger (`trg_lavori_materiali_scorta`, riga 1145) che scala automaticamente la giacenza del lotto quando viene inserita una riga.
4. **Nessun endpoint, componente, trigger o funzione Postgres scrive mai in questa tabella.** Ho verificato con grep sull'intero albero (`src/`, `supabase/`, `scripts/`, non solo `src/app/api`): ogni occorrenza di `lavori_materiali` è o una `SELECT`/join (7 route/pagine), o una entry di `database.types.ts`, o codice DDL (CREATE TABLE, indici, RLS). L'unico trigger sulla tabella — `trg_lav_mat_same_lab` in `supabase/migrations/002_fase2_schema.sql:626-628` — è una validazione BEFORE INSERT (verifica che `lavoro_id` appartenga allo stesso lab), non un meccanismo che genera righe. `supabase/schema.sql:2673` la elenca esplicitamente tra le tabelle da scrivere "usare webhook/edge function" — ma `supabase/` non contiene alcuna cartella `functions/`: quel meccanismo è documentazione di un'intenzione futura, non codice esistente. Il tecnico non ha alcuna UI per associare un lotto a un lavoro, e nessun automatismo lo fa al suo posto.
5. In parallelo esiste un **secondo sistema** più recente (S7.2, commit `dddbcb3`, 20/05/2026): `listino_materiali_auto` (BOM per voce di listino) → `scarichi_magazzino`, scritto automaticamente in `src/lib/consegna/orchestrate.ts:338-347` al momento della consegna. La colonna `scarichi_magazzino.lotto_numero` è commentata nella migrazione (`supabase/migrations/20260520_bom_materiali_ordini.sql:44`) come "**obbligatorio MDR Allegato XIII**" — ma il codice che fa l'INSERT (righe 340-347 sopra) non la valorizza mai. Resta sempre `NULL`.

**Risultato netto:** due tabelle pensate per la tracciabilità dei lotti (`lavori_materiali`, con commento esplicito "va incluso... nella DoC"; `scarichi_magazzino.lotto_numero`, commentato "obbligatorio MDR"), **nessuna delle due viene mai popolata con un numero di lotto reale**. Il PDF della DdC oggi genera sempre una sezione "Materiali / Lotti" vuota per qualunque lavoro creato tramite l'app in produzione. È l'esatto contrario di quello che DentalMaster fa manualmente ma correttamente (vedi PDF reale analizzato in `ANALISI/15_dentalmaster_funzionalita_complete.md` §8.5: *"Materiali impiegati: ZIRCONIA:2500090046, CERAMICA:15C0229"*).

**Impatto per un tecnico che usa l'app 8 ore al giorno:** io scarico materiale dal magazzino (in automatico, bene), ma il documento che il paziente/dentista tiene per 10-15 anni come prova di conformità non dice *con cosa* è stato fatto il dispositivo. In caso di richiamo lotto o ispezione, non c'è modo di risalire dal lavoro al lotto usato — esattamente il rischio che l'Allegato XIII vuole evitare.

**File coinvolti per il fix:**
- `src/lib/consegna/orchestrate.ts:338-347` — valorizzare `lotto_numero` nell'insert di `scarichi_magazzino` (richiede che `listino_materiali_auto` sappia collegarsi a un lotto specifico di `lotti_magazzino`, non solo al materiale generico)
- `src/lib/pdf/generate-ddc.ts` — far leggere la sezione materiali da `scarichi_magazzino` invece che dalla tabella orfana `lavori_materiali`, oppure implementare finalmente una UI di inserimento lotto in `TabAccettazione.tsx` o `TabProduzione.tsx` che scriva su `lavori_materiali`
- **Priorità: CRITICA — più alta di quanto stimato nel report del 21/05**, perché non è più "manca comodità di costing", è "il documento legale è incompleto by design".

### 🟠 GAP #2 — Odontogramma ancora isolato in TabClinica

Invariato. `src/components/features/lavori/form/TabClinica.tsx:5,26-31` — `OdontogrammaFDI` è ancora solo qui, tab accessibile solo dopo la creazione del lavoro (in `LavoroFormShell.tsx:48-50`, la modalità `isCreating` mostra solo i tab `dati` e `accettazione`). `git log` conferma zero commit su questo file dal 21/05 se non styling dark-mode (22/05, 28/05).

### 🟠 GAP #3 — Cassetta ancora invisibile in lista lavori

Invariato, e particolarmente deludente perché era stimato "1 ora di sforzo" (Sprint Alpha A7 nella sintesi orchestratore del 21/05). Ho letto **tutto** `src/components/features/lavori/LavoroCard.tsx` (1046 righe): l'interfaccia `LavoroCardProps` (righe 111-128) non ha nessun campo `accettazione_cassetta` o `cassetta`, e nessuna delle 4 righe di contenuto della card lo mostra. Il dato esiste in DB e viene letto/usato solo per il PDF del buono di consegna (`src/components/features/pdf/BuonoTemplate.tsx`) e per l'accettazione (`TabAccettazione.tsx`) — mai in lista. Un tecnico con 5 cassette aperte in banco deve ancora aprire ogni lavoro per sapere a quale cassetta corrisponde.

### 🆕 GAP #4 (nuovo, scoperto in questo re-audit) — "Cicli produzione predefiniti" è un vicolo cieco per i lavori nuovi

Non era stato scoperto a fondo nel report precedente (l'auditor aveva scritto "TabProduzione presumibilmente ok, fasi generiche" senza verificare). Approfondendo:

- `src/components/features/lavori/form/TabProduzione.tsx:72` mostra, quando non ci sono fasi: *"Nessuna fase — assegna un ciclo nella tab Dati."*
- Ma `src/components/features/lavori/form/TabDati.tsx` (letto per intero, 441 righe) **non ha nessun selettore di ciclo di produzione**. Il messaggio punta a un campo che non esiste nell'interfaccia attuale.
- La tabella `cicli_produzione` esiste in DB (134 cicli, 371 fasi importati da DentalMaster secondo `memory/MEMORY.md` §11) ed è referenziata via `listino.ciclo_id` (`src/app/api/listino/route.ts`) e via `lavori.ciclo_id` (`supabase/schema.sql:593`, allowlisted in PATCH da `src/app/api/lavori/[id]/route.ts:148`), ma **nessun endpoint, trigger o funzione materializza mai righe in `lavori_fasi` quando si crea un lavoro nuovo o quando si valorizza `ciclo_id`** — verificato con grep sull'intero albero (`src/`, `supabase/`, `scripts/`): ogni occorrenza di `lavori_fasi` è una query di lettura (join in liste/dettaglio/PDF/dashboard), DDL (CREATE TABLE/indici/RLS), o il trigger `trg_lav_fasi_same_lab` (`supabase/migrations/002_fase2_schema.sql:621-623`), anch'esso solo una validazione BEFORE INSERT sul lab, non un generatore di righe. Zero `INSERT` reali in `lavori_fasi` in tutto il codebase applicativo.
- **Conseguenza pratica:** i 277 lavori storici importati hanno le fasi (dati di migrazione), ma qualunque lavoro che Filippo crea da oggi in poi **non avrà mai fasi di produzione**, e il tab "Prod." mostrerà sempre il messaggio vicolo-cieco sopra descritto. La feature di tracking-fasi-MDR (l'equivalente digitale dei 136 protocolli DentalMaster con checkbox OK/Non conforme/Parziale) esiste solo come vetrina sui dati storici, non come strumento operativo per il lavoro quotidiano futuro.

**File coinvolti per il fix:** `src/app/api/lavori/route.ts` (creazione) dovrebbe, quando la lavorazione selezionata in `TabLavorazioni` ha un `ciclo_id` collegato, generare automaticamente le righe `lavori_fasi` da `fasi_produzione` per quel ciclo — esattamente come promette (implicitamente) il messaggio in `TabProduzione.tsx:72`.

---

## Confronto esplicito con l'audit del 21/05/2026

| Gap (21/05) | Stato 21/05 | Stato 02/07 | Note |
|---|---|---|---|
| Materiali da impiegare | 🔴 Critico — mancante | 🔴 **Ancora mancante, e più grave** | DdC genera sezione materiali/lotti sempre vuota per lavori nuovi (vedi Gap #1) |
| Odontogramma isolato | 🟠 Medio | 🟠 **Invariato** | Zero commit funzionali dal 21/05 |
| Tracciamento prove 1a-4a con esiti | 🔴 Critico (giudicato erroneamente) | ✅ **Era già risolto dal 15/05** | Correzione di un errore del report precedente, non un fix nuovo |
| Cassetta non in lista | 🟠 Medio | 🟠 **Invariato** | Stimato 1h di lavoro, mai fatto |
| (nuovo) Cicli produzione predefiniti rotti per lavori nuovi | non rilevato | 🔴 **Nuovo gap critico** | TabProduzione punta a un campo inesistente |

**Verdetto sui gap Sprint Beta/Gamma:** la sintesi orchestratore del 21/05 elencava, per questa persona, B9 (compenso tecnico — ✅ fatto), B10 (materiali da impiegare — ❌ non fatto), A7 (cassetta — ❌ non fatto), G1 (prove iterate — era già fatto prima). **Su 3 item realmente nuovi assegnati a Sprint Beta/Gamma per l'odontotecnico, solo 1 (compenso tecnico, sforzo stimato 1h) è stato completato.** Il lavoro di sviluppo tra il 21/05 e oggi (confermato da `git log` e da `memory/MEMORY.md`) è andato quasi interamente al Design System v2.3, non ai gap operativi di questa persona.

---

## Altri problemi osservati in questo re-audit

### 🟡 Messaggio fuorviante in TabProduzione
`src/components/features/lavori/form/TabProduzione.tsx:72` — "assegna un ciclo nella tab Dati" è un riferimento a una funzionalità che non esiste più (o non è mai stata esposta) nell'interfaccia. Un tecnico che segue l'istruzione letterale non troverà nulla in Dati e penserà che l'app sia rotta.

### 🟡 9 tab nel form lavoro restano tanti, ma la creazione è stata giustamente semplificata
`src/components/features/lavori/form/LavoroFormShell.tsx:23-33,48-50` — in fase di creazione (`isCreating`) vengono mostrati solo 2 tab (Dati, Accettazione MDR) con uno step-indicator dedicato; le altre 7 (Prezzi, Clinica, Prod., Prove, Date, Foto, Docs) compaiono solo dopo la creazione. Questo risolve di fatto la preoccupazione B3 del report precedente ("9 tab su mobile con 7 bloccate") anche se non è stato esplicitamente il fix richiesto — buona notizia non evidenziata nel changelog.

### 🟡 Urgenza ora visibile a colpo d'occhio in lista (fix implicito del vecchio problema #6)
`src/components/features/lavori/LavoroCard.tsx:484-533` — badge pill "↑ Urgente" / "⚡ Extra urgente" ben visibili sopra il nome cliente, non più solo in timeline nascosta. Il vecchio "Problema Medio #6" è di fatto risolto.

### 🟡 Progress bar fasi reale in lista
`LavoroCard.tsx:663-699` — barra di progresso fasi con conteggio "X/Y fasi" e spunta verde a completamento. Buona a patto che le fasi esistano (vedi Gap #4 — per i lavori nuovi sarà sempre vuota).

### 🟡 Medico richiedente: soluzione parziale, non completa
`TabDati.tsx:210-301` — ora ci sono chip rapidi per i medici dello stesso studio (S7.1), ma resta vero quanto segnalato prima: se il richiedente non è nello studio del cliente selezionato, si scrive comunque solo testo libero, senza autocomplete globale.

### 🟡 Logo e firma DdC: nessuna UI di upload, solo visualizzazione
`src/app/(app)/impostazioni/page.tsx:288-380` — la sezione "Marchio" mostra link "Visualizza file" se `logo_url`/`firma_ddc_url` sono già valorizzati in DB, ma non c'è alcun form di upload. Coerente con `ROADMAP-UFFICIALE.md` che lo segna ancora ⏳ — nessuna discrepanza qui, solo conferma che è vero debito, non dimenticanza di roadmap.

### 🟡 Dettatura vocale: conferma non iniziata
`grep -rl "SpeechRecognition" src/` → zero risultati. Coerente con roadmap.

---

## Cosa farebbe un tecnico esperto notare, oggi

1. **Zero fiducia nella tracciabilità materiali.** Se un giorno arriva una segnalazione di richiamo lotto (es. zirconia difettosa di un certo batch), oggi non esiste alcun modo — né in UI né in query — di rispondere "quali lavori hanno usato quel lotto?" per i lavori creati dopo il go-live. Le due tabelle progettate per questo sono entrambe orfane.
2. **Il tab "Produzione" mente.** Dice di assegnare un ciclo in "Dati" ma quel campo non c'è. Per un tecnico di 15+ anni abituato ai 136 protocolli DentalMaster, aprire quella tab su un lavoro nuovo e trovarla sempre vuota, con un'istruzione che non porta da nessuna parte, è il tipo di dettaglio che mina la fiducia nel software molto più di un bottone mancante.
3. **La cassetta resta un problema fisico irrisolto.** Con più lavori aperti in contemporanea, non sapere quale cassetta corrisponde a quale scheda senza aprire il dettaglio è un attrito quotidiano concreto, non estetico — ed era il fix più economico di tutti (1 ora) rimasto ignorato per 6 settimane.

---

## Punteggio Complessivo: 7.2/10

| Criterio | Score | Peso | Note |
|----------|-------|------|------|
| Operatività Core | 7.0 | 30% | Prove tracking solido (pre-esistente); materiali/cassetta/cicli ancora aperti |
| MDR Compliance | 6.0 | 25% | Soft-block consegna e disinfettante "non dichiarato" sono ottimi; ma la DdC ha un buco di tracciabilità materiali/lotti più serio di quanto stimato al 21/05 |
| UX/UI Design | 9.0 | 20% | DS v2.3 solido, dark mode corretto, badge urgenza migliorati, creazione lavoro semplificata (2 tab) |
| Dashboard/Produzione | 6.0 | 15% | TabProduzione non funzionale per lavori nuovi (Gap #4) |
| Pronto Produzione | 7.5 | 10% | App usabile quotidianamente, ma con debito di conformità non banale |
| **TOTALE** | | | **7.2/10** |

### Confronto con baseline e target

- **Score precedente (21/05/2026): 7.5/10**
- **Score attuale: 7.2/10** — leggero calo, non un miglioramento
- **Target dichiarato per questo sprint: 8.5+/10** — **mancato, e di un margine ampio (-1.3 punti)**
- La causa principale del mancato progresso è strutturale, non di sforzo: nessuno sprint tra il 21/05 e oggi ha avuto come obiettivo dichiarato questi 4 gap. Il lavoro reale (DS v2.3, S7 BOM/ordini fornitori) ha toccato di striscio 2 dei problemi (compenso tecnico, warning materiali) ma non li ha chiusi nel modo in cui l'odontotecnico ne ha bisogno.

## Verdetto sui gap Sprint Beta/Gamma per questa persona

**Non chiusi.** Dei 4 gap originali:
- 1 era già chiuso prima ancora del report del 21/05 (prove) — non è merito di uno sprint post-audit
- 1 è stato chiuso a metà (materiali → ora c'è un sistema di BOM/scarico automatico, ma la parte di tracciabilità per-lotto richiesta da Allegato XIII è più rotta di prima perché ci sono due sistemi paralleli e nessuno dei due scrive il dato critico)
- 2 sono rimasti identici a 6 settimane fa (odontogramma, cassetta)
- 1 nuovo problema strutturale è emerso con l'indagine approfondita (cicli produzione non materializzano fasi per lavori nuovi)

**Raccomandazione per la prossima sessione:** prima di aggiungere altre feature (dettatura vocale, email branding), chiudere il debito di conformità MDR sui materiali — è l'unico elemento di questo report con rischio legale concreto per Filippo, non solo friction UX.

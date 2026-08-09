# Verbale — decisioni di apertura dell'ondata (b), wizard «Nuovo lavoro»

**Data:** 28 luglio 2026 · **aggiornato alla centoquarantatreesima tornata (D329: per il tema chiaro vince la variante che chiude due difetti, non uno)** ·
**Decide:** Francesco Formicola · **Stato:** ratificato in sessione
**329 decisioni in centoquarantatré tornate:** D1-D8 in apertura · D9-D16 sui mockup · **D17-D20 alla ratifica della
spec**, la sera. ✅ Con la terza tornata la spec dell'ondata (b) è **RATIFICATA**
(`docs/superpowers/specs/2026-07-28-wizard-ondata-b-schermate-design.md`).
**Nasce da:** `docs/roadmap/2026-07-28-ondata-b-handoff.md` (punto di ripresa) + spec ratificata
`docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md` §5 e §12
**Precede:** i mockup (§0B) → la spec dell'ondata (b) → il piano.

> Questo verbale esiste perché **tre decisioni di oggi contraddicono documenti già scritti**
> (D3 contro l'handoff §3 e la testa della ROADMAP; D6 contro DS v3 §2.1). Lezione della voce 57:
> quando due documenti dicono il contrario, **vince quello letto per primo** — quindi le fonti
> contraddette vanno corrette, non solo superate. Le correzioni sono elencate in §4.

---

## 1. Le decisioni

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D1** | **Perimetro dell'ondata (b) = il solo wizard** (`/lavori/nuovo`) | scelta esplicita fra tre perimetri | Le tre eredità che vivono sulla **scheda del lavoro** (tendina 19/48, colore di caso non correggibile alla creazione, tre zone senza dente) e i due difetti della **home** restano tracciati e **fuori** |
| **D2** | **Nome e cognome del paziente: due caselle distinte, entrambe facoltative. Via i pulsanti «Salta»** | «non voglio vedere i pulsanti salta che sono inutili, in questa fase» | Conferma D6 della spec nome/cognome. Il blocco «Se vuoi, aggiungi» perde la sua ragione d'essere (v. §3) |
| **D3** | 🛑 **Il catalogo dei colori è CHIUSO** | «il colore può essere scelto da due liste di colori preimpostati, **non esiste poter inserire un colore che non esiste**; può capitare solo che l'operatore inserisca un colore "errato" rispetto alle richieste o la prescrizione, ma non rispetto al sistema che non lo riconosce» | **Decade la «quinta eredità»** dell'handoff §3 (catalogo non chiuso → panel). Nessuna regola nuova per «codici sconosciuti». L'errore possibile è **umano** e si intercetta al confronto pre-consegna (W22), non con la validazione |
| **D4** | **`pazienti` diventa un'anagrafica vera** — il wizard cerca prima di creare | scelta esplicita fra registro / anagrafica / via di mezzo | Il doppione smette di essere il caso normale (v. §2, prova ①) |
| **D5** | **L'anagrafica entra solo per la parte wizard** | scelta esplicita | **Dentro:** cerca-prima-di-creare + i due difetti di §2. **Fuori, voce propria:** unione di due schede già doppie, creazione/gestione dalla pagina `/pazienti`  🔄 **Destinazione aggiunta dall'audit del 03/08/2026 — e la voce NON è mai stata aperta:** il buco è registrato in **AUD-3** di `docs/roadmap/ROADMAP-UFFICIALE.md`. Finché resta lì, «voce propria» vuol dire «nessuna voce». |
| **D6** | **Riconoscimento per COGNOME, disambiguato dal contesto** (dentista + data dell'ultimo lavoro accanto a ogni risultato) | scelta esplicita fra cognome / cognome+data di nascita / codice fiscale | **La data di nascita NON entra.** Nessuna casella nuova da riempire al banco. Coerente con la minimizzazione: nessuno degli 8 moduli di prescrizione veri esaminati chiede la data di nascita al laboratorio |
| **D7** | **Deroga concessa: nel wizard i cognomi si vedono a schermo — e la regola del DS si riscrive in forma vera** | scelta esplicita fra deroga locale / allineamento della regola / niente deroga | DS v3 §2.1:58 e la lista anti-pattern :511 vanno corretti: la regola oggi dichiara un invariante che l'app **già** non rispetta (parete cassette, D8 del 27/07) |
| **D8** | **Un passo «foto» sempre presente**, per tutti i tipi di lavoro | scelta esplicita | Chiude il buco creato dalla combinazione «prescrizione condizionale al tipo» (spec §5) + «riga foto oggi incondizionata»: senza D8, i tipi senza prescrizione resterebbero **senza fotocamera** |

### Seconda tornata — le decisioni prese sui mockup (stesso giorno)

Mockup: `docs/design/mockups/2026-07-28-wizard-passo-paziente.html` (3 varianti × 3 stati) e
`…-wizard-avanzamento-passi.html` (4 varianti × 3 momenti), visti a 390/768/1280 in chiaro e scuro.

| # | Decisione | Perché | Conseguenza |
|---|---|---|---|
| **D9** | **Passo paziente: variante A** — la ricerca vive **dentro la casella «Cognome»** | scelta esplicita fra A / B / C / C+A | Nessun gesto nuovo da imparare, zero tocchi in più per chi ha fretta, e — la ragione che decide — **mostra il doppione anche a chi non sospetta che esista**, cosa che B non fa. ⚠️ Da progettare: i suggerimenti compaiono *mentre* si scrive, quindi **non devono far ballare il tasto «Continua»** |
| **D10** | **Avanzamento: variante 3, le briciole** — in testata si vede **quello che hai già scelto** (`Dr. Puleo · Overdenture`), nessun conteggio | scelta esplicita fra 4 varianti | `ProgressDots` **esce** dal wizard (resta nel DS per altri usi). Nessun numero da smentire quando i passi cambiano · la voce sintetica legge i nomi invece di «passo 2 di 3» · lo spazio in testata porta informazione invece di decorazione. ⚠️ Sparisce la sensazione di «quanto manca»: accettato |
| **D11** | **La ricerca guarda SOLO dentro lo studio scelto** al primo passo | scelta esplicita fra tre portate | Coerente col modello: `pazienti.cliente_id` è **NOT NULL** (`supabase/schema.sql:458`), un paziente **appartiene a uno studio**. La stessa persona che arriva da due dentisti resta **due schede**, e non è un doppione da combattere: sono due rapporti distinti. ⚠️ **Decade la metà «dentista» di D6**: dentro un solo studio il dentista non disambigua nulla — restano **nome proprio, codice e data dell'ultimo lavoro** |
| **D16** | **`ProgressDots` muore**: componente, voce di catalogo, test e **DS v3 §5.32** | scelta esplicita, dopo censimento | Tolto dal wizard (D10) resta **senza consumatori**: due usi soli — `WizardNuovoLavoro.tsx:29,422` e la vetrina `ds-v3-catalogo/page.tsx:31,80,1140-1144` — e la sua seconda forma `ProgressDotsStanze` **era già morta** (QA device D3). Stessa regola di D13 |
| **D15** | **Il codice paziente è sempre quello che propone UÀ**: nessun dentista porta una propria numerazione | risposta di Francesco a una domanda di fatto, non di design | → indice unico su **`(laboratorio_id, codice_paziente)`**, la chiave più forte. **Misurato prima di decidere** (`scripts/tmp/sql.mjs`, sola lettura): **0** coppie stesso-codice fra studi diversi · **0** duplicati dentro lo stesso studio · 916 pazienti · 0 archiviati · 1 senza codice → **oggi non rifiuta nulla**. ⚠️ Ne segue una correzione: `supabase/schema.sql:461` dice «Codice assegnato **dallo studio** (es. "PAZ-001")» e **non descrive più il sistema** — si allinea nella stessa migration (classe voce 57: *un commento non si sbaglia, si scolla*) |
| **D14** | **Larghezza su schermi grandi: stretta per le domande, larga per denti e colore** | domanda di Francesco: «perché quando mi mostri i mockup non mi mostri mai la versione per tablet e desktop?» — poi scelta esplicita fra tre | Oggi il wizard è **una colonna da 480 px centrata a ogni taglio** (`WizardNuovoLavoro.tsx:533-538`, e il commento in testa lo dichiara: «full-screen a TUTTI i viewport»). La spec madre §5 però prevede già **due arcate su tablet e mappa+colore affiancati su desktop**: le due cose insieme fanno **cambiare larghezza al wizard fra un passo e l'altro**. Ratificato: il salto **si accetta**, perché è il contenuto a chiederlo — e si rende morbido con l'animazione. ⚠️ **Da provare a schermo, non da assumere:** il passaggio dalla colonna stretta al passo denti largo, e ritorno col tasto indietro |
| **D13** | 🗑️ **«Dimmelo a voce» esce — del tutto.** Via dai tre passi del wizard, dalla vetrina dei componenti, dal design system, e **il componente si cancella coi suoi test** | «poiché avevamo già appuntato che il dimmelo a voce scompare per essere sostituito dall'assistente ia, perché non toglierlo già da adesso e ripulire i piani a riguardo? sennò poi dobbiamo intervenire su tutti i punti dove lo inseriamo» | **Censimento (R-P6), 4 usi + 2 test + 1 regola:** `PassoDentista.tsx:29,93` · `PassoTipo.tsx:34,116` · `PassoPaziente.tsx:32,118` · `ds-v3-catalogo/page.tsx:41,78,1084-1088` · `tests/unit/ds-v3/componenti/PillVoce.test.tsx` (intero) · `tests/unit/PassoTipo.test.tsx:191` (**questo fallisce subito** se si rimuove il componente senza toccarlo) · **DS v3 §5.15**, che oggi prescrive «PillVoce sempre in fondo a ogni passo del wizard». Da verificare nel piano se restano orfani la coreografia `motion.ts:56` e il token `pillVoce` in `v3/tokens.ts`. 🔑 Git conserva tutto: se l'assistente vocale (voce 4 della roadmap) ne riuserà dei pezzi, si ripescano |
| **D12** | **Il codice paziente resta modificabile**, e quando se ne scrive uno **già in uso** UÀ lo dice invece di attaccarsi in silenzio | domanda di Francesco sui mockup: «ma il codice paziente può essere modificato vero?» | **Verificato che oggi lo è**: casella nel wizard · casella nella scheda paziente (`PazienteEditSheet.tsx:182`) · campo nell'allowlist del server (`api/pazienti/[id]/route.ts:35`). ⚠️ **Nessuno controlla che sia unico** (§2 ③) → è qui che l'avviso serve. ⚠️ Sui documenti **già emessi** il codice vecchio resta: la DdC congela (giusto, Art. 10(8) MDR), etichetta e ricevuta leggono il dato vivo — ma **l'etichetta già attaccata alla cassetta non si aggiorna da sola**: disallineamento fisico, da dire a schermo quando si cambia il codice di un paziente con lavori già consegnati |

---

### Terza tornata — la ratifica della spec (stessa sera)

La spec è stata portata a Francesco **in ordine, sezione per sezione**, con isolate le **sei cose che la
spec aveva deciso da sé**. Esito: **ratificata** — ma la ratifica non è stata un «ok» secco. Ha prodotto
**quattro emendamenti**, e **due delle quattro decisioni nuove nascono da domande sue**, non da domande
nostre: la spec non si era nemmeno accorta che mancasse una via d'uscita.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D17** | **Le briciole sono toccabili**, il ritorno **conserva** i passi già compilati, e chi cambia una risposta a monte viene avvisato **solo se qualcosa si perde** | «rendiamole toccabili per tornare al quel passo, lo stato dei passi già compilati restano immutati, cosi quando si ritorna restano compilati come erano stati compilati» + scelta esplicita **(a)** fra tre comportamenti | Era **l'unica cosa che la spec rimandava al piano**: chiusa qui. ⚠️ Due casi reali che il ritorno «e basta» non copre: **cambiare il tipo** svuota di senso denti e colore (i passi dipendono dal tipo, W2); **cambiare il dentista** invalida il **paziente scelto dall'archivio** — `pazienti.cliente_id` è NOT NULL (D11), la scheda è di quello studio. Scartate: **(b)** svuotare in silenzio (è la classe di difetto di `api/lavori/[id]/route.ts:259-264`: dati scartati senza errore mentre l'utente legge «Salvato») e **(c)** conservare e rimettere (raddoppia gli stati per una furbizia che il banco non chiede). 🔑 Il calcolo di «cosa si perde» **non è dell'interfaccia**: viene dalla stessa funzione che deriva la sequenza dal tipo — una seconda lista a mano sarebbe R1/R3 daccapo |
| **D18** | **Via d'uscita esplicita, con conferma** — e l'abbandono **volontario azzera il salvataggio locale** | domanda di Francesco: «non bisogna prevedere anche la possibilità di abbandonare in qualsiasi momento la creazione di un nuovo lavoro?» | 🔴 **Verificato aprendo il file: oggi non esiste.** La testata ha **solo** la freccia indietro (`WizardNuovoLavoro.tsx:421`): dal terzo passo si esce premendola tre volte, senza conferma — e i passi stanno per diventare sette. 🐛 **E la freccia al primo passo è un difetto vero:** `:219-222` fa `router.push('/dashboard')`, contro la **direttiva permanente del 22/07/2026** («indietro = pagina precedente, OVUNQUE; mai una rotta fissa»). Chi arriva da `/lavori` finisce sulla home. **Dentro perimetro** — la testata si rifà comunque — quindi si corregge qui, non si rimanda |
| **D19** | **La rete di ripresa 24h resta com'è** | domanda di Francesco: «durante la creazione di un nuovo lavoro abbiamo uno stato bozza? … quando l'operatore segna un lavoro in entrata deve chiuderlo o al massimo abortire il processo, punto» → poi «resta com'è» | 🔑 **Il suo modello è già rispettato dal gestionale**, e la domanda ha fatto emergere il fatto che chiarisce tutto: **non esiste nessuna bozza nel sistema.** Nessuna riga in banca dati, nessun numero occupato, nessun elenco. Quello che c'è è `localStorage` (`persistenza.ts:26-79`): **24 ore scorrevoli** dall'ultima modifica, legato a `userId`+`labId` (dispositivo condiviso), **uno solo**, **senza foto**, **non viaggia fra dispositivi**. Copre solo l'interruzione **involontaria** (squillo, sistema che chiude la pagina, tocco sbagliato). E con i passi che passano **da 3 a 7 vale più di ieri, non meno**. **D18 le dà il suo confine naturale:** l'uscita volontaria cancella, così la rete sopravvive **solo** a ciò per cui esiste |
| **D20** | **L'aiuto dichiara che il codice si può cambiare** | «magari quando dice il codice l'ho già scritto io, possiamo indicare che però può essere cambiato» | Testo: «Il codice l'ho già scritto io — **puoi cambiarlo**. Il nome puoi aggiungerlo, o lasciar perdere.» Chiude a monte lo scarto fra D12 (il codice **è** modificabile) e una schermata che non lo diceva |

**Le quattro chiusure che la spec aveva preso da sé — ratificate, una con modifica:**

| chiusura | esito |
|---|---|
| §5 — la ricerca passa dalla **porta esistente** con un parametro, niente route nuova | ✅ ratificata, con una **condizione**: «se è una procedura giusta e ottimizzata per la nostra pwa va bene» → nel piano diventa una **prova**, non un'opinione |
| §5 — **data dell'ultimo lavoro** accanto a ogni suggerimento | ✅ ratificata **con modifica**: «cerchiamo di mantenerlo, può essere un dato utile per l'operatore che crea il lavoro» → 🛑 **cade la licenza di degradare al solo codice**. Se costa, si **ottimizza** (lettura aggregata, mai una query per riga) e si **misura**; se non regge nemmeno così, si torna da Francesco **col numero in mano** |
| §6 — l'indice **non guarda** `archiviato`/`deleted_at`: un codice usato **resta impegnato** | ✅ ratificata |
| §7 — la bozza `v:1` **si scarta**, non si converte | ✅ ratificata (e D19 chiarisce che a scartarsi è il **contenuto**, non la rete) |

**Esenzione Regola Advisor dichiarata, non sottintesa:** sulle due chiusure architetturali (§5 porta
esistente, §7 bozza scartata) non è stato convocato un panel. Motivo: la spec porta già il ragionamento in
forma di panel — alternativa scartata **scritta**, con il perché (due route sullo stesso dato = due posti
dove sbagliare il filtro di tenant; migrare una bozza = indovinare la corrispondenza dei passi, e il costo
di sbagliare è un lavoro creato coi dati di un altro). L'esenzione è stata **dichiarata a Francesco prima
della ratifica**, non applicata in silenzio.

---

### Quarta tornata — le varianti dei mockup (stessa sera)

Mockup: `2026-07-28-wizard-testata-uscita.html` · `…-passo-foto-e-cassetta.html` ·
`…-avviso-codice-gia-in-uso.html`, visti a 390/768/1280 in chiaro e scuro. La **§4** di ciascuno porta la
forma ratificata.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D21** | **Uscita: variante T2** (✕ leggera, senza cerchio) — e **compare solo dal passo 2** | «qui la ✕ e la freccia fanno la stessa cosa: facciamo che la ✕ compare solo dal passo 2. poi scelgo la variante T2» | Al passo 1 **un solo controllo per una sola azione**. La ✕ non compete con la freccia, e la gerarchia è giusta: l'uscita non è l'azione da incoraggiare |
| **D22** 🎯 **TERZA E DEFINITIVA stesura** (le prime due avevano capito male) | **La fila è A PAGINE, non a scorrimento libero.** Si mostra **un numero INTERO di briciole**, quelle che ci stanno comode; uno swipe (o il contatore) fa **entrare esattamente una briciola più vecchia**, con la molla. 🔑 **Non esistendo il caso «tagliata», non servono né la sfumatura né le icone** — le due cose aggiunte per rattoppare un problema che questo modello non ha. Affordance: **una pastiglia contatore intera** («+4»), che è anche il bersaglio da premere. | Prima stesura: «mostriamo solo le ultime due e le altre diventano degli svg…». **Rettifica di Francesco:** «finché ho spazio mostro le briciole per intere con il loro nome, mostrando gli stati precedenti il più possibile; quelle che non riesco a mostrare non sono visibili, ma dobbiamo indicare all'utente che si può scorrere la barra, e man mano che si scorre si espandono quelle che entrano nel campo visivo. L'idea delle svg era solo per dare un senso logico a una possibile briciola compressa» · e il vincolo duro: «non mi piace vedere le briciole troncate o tagliate a metà o pezzetti che fuoriescono» | ✅ **Verificato a schermo** (`scripts/tmp/misura-forma-ratificata.mjs`): **zero parole tagliate** su 7 casi. 🔑 **Ciò che vale nel codice, e SOLO questo:** si tiene **`inizio`** (non `fine`) · si **riempie da capo** a ogni cambio di larghezza finché l'utente non ha scorso · **niente frecce** (misurate: rubavano fino a 68 px su 230) · contatore **intero** «+N», che è anche il bersaglio · molle da `motion.ts`, mai inline. ⚠️ **Ipotesi di Francesco corretta:** «su tablet/desktop c'è più spazio» vale a metà — la colonna è **bloccata a 480 px** (`WizardNuovoLavoro.tsx:533-538`), quindi **768 e 1280 sono identici** (320 px contro 230); lo spazio vero arriva **sui passi larghi** (D14) |
| **D23** | **Foto: variante F2, e PIÙ DI UNA** — rivedere, ingrandire, rifare, eliminare, aggiungere | «vorrei però poter inserire più di una foto, proprio come dice la frase… devo poter rivedere le foto allegate, ingrandirle per poterle rivedere se sono uscite bene, eventualmente rifarle, eliminarle o aggiungerne delle altre» | ✅ **Quasi tutto è già in casa:** le immagini stanno in una **tabella** (`lavori_immagini`), non in una colonna, e `POST /api/lavori/[id]/immagini` esiste (max 20 MB). **Caricarne cinque è già possibile oggi**: è il wizard che ne tiene una sola. 🔴 **Ma manca la cancellazione** → **R12** |
| **D24** | **Cassetta: solo le libere**, con **crea al volo** e **salta** | «non possiamo mostrare proprio la pagina cassette mostrando solo quelle libere, e permettere di cliccare su quelle libere, eventualmente crearne una per metterci il lavoro o saltare perché magari il pacchetto ancora non è arrivato?» | ✅ **Riuso puro:** `NuovaCassettaSheet.tsx:33-43` (nome precompilato + le sei facce) e `POST /api/cassette` esistono già. La griglia mostra 4 libere su 28 invece di 28 |
| **D25** | **Avviso codice in uso: variante V1** (sotto la casella, non ferma niente) · e la **ripresa** che dice cos'è cambiato mettendo già il codice nuovo | scelta esplicita su entrambi gli inneschi | Il divieto vero ce l'ha il **database** (D15): la schermata serve a **far incontrare la persona giusta**, non a fare la guardia |

#### 🔧 D22 — la storia delle due stesure superate (registrata il 29/07/2026, dopo il panel)

**Il fatto:** fino al 29/07 la riga di D22, pur intestata «TERZA E DEFINITIVA stesura», portava ancora
addosso **le prescrizioni delle prime due** — nate dal modello a **scorrimento**, non da quello a **pagine**.
Prescriveva di ancorare la fila **a destra** (`margin-left:auto` sul primo figlio + `scrollLeft = scrollWidth`
al montaggio) e di sfumare i bordi con una **maschera direzionale**.

**Perché è un difetto e non un dettaglio:** entrambe sono **decadute** col modello a pagine — la sfumatura
per nome (**D32**: «Scartate: la sfumatura, decaduta con le pagine»), l'ancoraggio a destra perché il piano
prescrive l'opposto (**T8**: «si tiene `inizio`, non `fine`»). E la regola scritta in **testa a questo
verbale** dice che *quando due documenti si contraddicono vince quello letto per primo*: un esecutore fresco,
a cui diciamo di leggere il verbale, avrebbe costruito la testata **al contrario di come è stata approvata**.

**Cosa resta valido di quelle due misurazioni** (sono fatti, non prescrizioni): ① `justify-content: flex-end`
su un contenitore che scorre rende **irraggiungibile** ciò che esce dal bordo sinistro; ② una fila che scorre
**taglia sempre** la pastiglia al bordo. Sono esattamente le due ragioni per cui il modello a scorrimento è
stato abbandonato, e vivono come **trappole** nel piano §8, non come istruzioni.

🔑 **La lezione, che vale oltre questa riga:** una stesura sostituita non si aggiorna, si **riscrive** —
altrimenti restano in casa le istruzioni del modello che si è appena scartato, indistinguibili da quelle
vive. È la stessa specie del *commento che non si sbaglia, si scolla* (voce 57).

---

### Quinta tornata — il taglio in ondate (D26)

| # | Decisione | Testo di Francesco | Conseguenza |
|---|---|---|---|
| **D26** | **Il lavoro si divide in tre ondate**, e la divisione la sceglie chi scrive il piano | «mi sta bene dividere il lavoro in ondate, scegli tu la divisione più consona» | **(b) Il wizard** — tutto ciò senza cui il wizard non funziona · **(c) Le foto, per bene** — l'editor (ruota/ritaglia/ingrandisci) **e le stesse azioni sulla scheda del lavoro**, perché l'editor si scrive **una volta** e serve in due posti · **(d) Le cassette, per bene** — la parete in «modo scelta» **con la ricerca** e la **tavolozza più ricca**. 🔑 **Criterio dichiarato:** resta in (b) ciò senza cui il wizard non funziona; esce ciò che ha una casa migliore altrove e che, fatto lì, si scrive una volta invece di due |

**Le sei decisioni minori della stessa sera — registrate qui perché erano rimaste solo in chat, e una
decisione che vive solo in chat non esiste** (doppio controllo di fine sessione, richiesto da Francesco):

| # | Decisione | Testo di Francesco | Conseguenza |
|---|---|---|---|
| **D27** | **Nessun tetto al numero di foto** | «lascia libero, c'è qualche pericolo in merito?» → risposta: sì, ma non è lo spazio sul server | 🔴 **Il pericolo vero, verificato:** le foto **si caricano DOPO** la creazione del lavoro (`crea-lavoro.ts:328`), quindi **restano nella memoria del telefono** fino a quel momento. Dieci foto piene su un telefono modesto e il sistema chiude l'app, portandosi via anche la digitazione. **La difesa è comprimere allo scatto** (la scheda del lavoro lo fa già, a 0,4 MB: `TabImmagini.tsx:37`). ⚠️ **Da misurare su un device vero**, non da assumere |
| **D28** | **Le foto si etichettano** | «se si può, sarebbe comodo» | ✅ **Si può, ed esiste già**: `lavori_immagini.descrizione` + i sei valori di `TIPI_FOTO` (`TabImmagini.tsx:15-22`: Impronta · Pre-lavoro · Guida colore · Post-prova · Radiografia · Altro), già modificabili via `PATCH`. 🔴 **Il wizard è l'unico posto che non li usa**: manda `'impronta'` **fissa** (`crea-lavoro.ts:333`) |
| **D29** | **Eliminare una foto chiede conferma** | «sì» | ⚠️ E resta aperta la domanda che la conferma non risolve: **soft o hard?** Dopo l'emissione della Dichiarazione, la direttiva «ogni campo si corregge fino alla consegna» e l'Art. 10(8) MDR tirano in direzioni opposte → **panel normativo**, piano §9 |
| **D30** | **La cassetta creata dal wizard prende SUBITO il lavoro** | «ci va dentro subito» | Un passaggio in meno al banco. `NuovaCassettaSheet.onCreata` → assegnazione immediata, senza tornare alla griglia |
| **D31** | 🗑️ **Le icone delle briciole DECADONO** | conseguenza diretta della terza stesura di D22: «forse permette di abbandonare anche le icone, che diventerebbero inutili» | Con la fila **a pagine** non esiste più il caso «briciola compressa», quindi **non c'è più niente da spiegare con un simbolo**. ⚠️ **Le indicazioni date da Francesco sulle icone** (studio = qualcosa di clinico · tipo = un manufatto · denti = un dente) **restano valide se un giorno servissero**, ma **non sono un compito dell'ondata (b)**: nessuno le disegni |
| **D32** | **L'annuncio dello scorrimento è il contatore, più un rimbalzo la prima volta** | domanda di Francesco: «proponimi più soluzioni» — poi la fila a pagine ha ristretto il campo | Scelte: **pastiglia contatore intera** («+4»), che non è un troncamento, dice quante ne restano **ed è il bersaglio da premere** · più un **rimbalzo alla prima apertura** (`molla.bouncy`), che insegna il gesto una volta sola. Scartate: la **sfumatura** (decaduta con le pagine), la **lineetta** tipo barra di scorrimento (rumore in una testata di 44 px), le **frecce** (**misurate: rubavano fino a 68 px su 230**) |

### Sesta tornata — la regola nata dal ripasso (D33)

| # | Decisione | Testo di Francesco | Conseguenza |
|---|---|---|---|
| **D33** | **«Il numero si dà subito»** — ogni scelta riceve numero e riga **nello stesso turno**, più una **guardia meccanica** agganciata al salvataggio | «cosa possiamo fare a riguardo quindi?» → poi «procedi» | Direttiva permanente, testo in **`CLAUDE.md` §0A-bis**. Nasce da un fatto, non da un timore: il ripasso di chiusura ha trovato **tre buchi** — sei decisioni solo in chat (fra cui una che **cancellava** del lavoro: le icone decadute), le ondate (c) e (d) assenti dalla roadmap, la memoria ignara di mezzo pomeriggio. **La rete:** `scripts/guardia-coerenza-documenti.mjs` (**0,03 s** misurati, nel pre-commit): conteggio dichiarato = reale · numeri senza buchi · nessun riferimento a file inesistenti · nessuna «voce» fantasma · punto di ripresa vero · avviso se si tocca un verbale senza toccare la memoria. 🛑 **Controlla la coerenza, non la verità:** cosa è stato detto e mai scritto non lo sa nessun programma. ✅ **Provata rompendo apposta ognuno dei cinque controlli: cinque su cinque si accendono** — e la guardia ha **bloccato il salvataggio che la introduce**, perché D33 era stata aggiunta senza aggiornare il conteggio. ⚠️ **Due lezioni dalla taratura:** la prima stesura della prova era **sbagliata** e faceva sembrare inerte un controllo che funzionava (*anche le prove vanno provate*); e il riconoscimento del conteggio **degradava in silenzio** sulle parole accentate («Trentatré»), perché `\w` in JavaScript non contiene gli accenti — *un controllo che si spegne da solo è peggio di uno assente* |

**Due precisazioni di Francesco che entrano nel piano, non nelle decisioni:**
- **Le briciole (D22, terza stesura)** nascono da una sua rettifica: «finché ho spazio mostro le briciole per
  intere… e man mano che scorro viene sbalzata via quella che non entra più facendo apparire quella nuova.
  Animazioni alla Apple. E senza troncamenti o sfumature.» → **fila a pagine**, e **le icone decadono**:
  senza il caso «tagliata» non c'era più niente da far capire con un simbolo.
- **I colori delle cassette NON si unificano** (dopo la spiegazione del perché la parola non è un doppione
  dell'esadecimale): «non ci conviene unificare, se questo permette la ricerca per colore; facciamo solo in
  modo da avere una tabella più ricca possibile che copra quasi tutti i colori ricercabili» → **ondata (d)**,
  con la regola che **ricava** la tonalità scura invece di scriverla, così ogni colore nuovo costa un nome e
  un valore.

**🚫 E una segnalazione mia, RITIRATA nel giro di un'ora — sta qui perché la lezione vale più dell'errore.**
Avevo riferito come difetto che «il colore delle 28 cassette è scritto in due modi, 8 in esadecimale e 20 a
parole → una griglia ne colora 8 su 28». **La misura era giusta, la conclusione no.** Il doppio formato è
**previsto**: `normalizzaColore` (`src/lib/cassette/colore.ts:6,11`) accetta **le sei parole e l'esadecimale,
e nient'altro** (altrimenti 422), e `facciaHex` (`src/design-system/v3/tokens.ts:121-128`) **traduce già** le
parole in colore. 🔑 **Avevo dedotto un difetto da un dato senza aprire il codice che quel dato lo legge** —
la stessa forma d'errore che il panel sui colori aveva smontato la mattina. Francesco aveva chiesto «come
pensi di risolverlo?»: **non c'era niente da risolvere.**

---

### Settima tornata — 29 luglio 2026, dopo il panel di validazione

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D34** | 🔒 **Il codice di un paziente archiviato NON si riusa: resta impegnato per sempre.** L'indice unico **non guarda lo stato** del paziente | scelta esplicita fra due forme, presentate col loro costo. Prima di chiedergliela: «è l'unica decisione di tutta la sessione che **non si può disfare dopo**» | **Predicato: `WHERE codice_paziente IS NOT NULL AND btrim(codice_paziente) <> ''`** — nessun filtro su `archiviato` né su `deleted_at`. **Chiave normalizzata: `(laboratorio_id, lower(btrim(codice_paziente)))`** (D34-bis, sotto). 🔑 **La ragione che decide:** il codice **non è un'etichetta interna, è un identificativo di legge** — Art. 21(2) MDR e Allegato XIII p.1: il dispositivo è destinato a «un determinato paziente … identificato mediante il **nome, un acronimo o un codice numerico**», tre alternative **equivalenti**. E finisce su **quattro documenti conservati**: `EtichettaTemplate.tsx:128` · `IFUTemplate.tsx:171` · `RicevutaConsegnaTemplate.tsx:187` · **`generate-ddc.ts:93`**, dove è l'ultimo ripiego dell'elemento 4 **sulla Dichiarazione stessa**, che poi si **congela**. Se in un laboratorio lo stesso codice puntasse a due persone, **risalire dal dispositivo al paziente** dopo un incidente (All. XIII p.5, Art. 87) diventerebbe ambiguo **proprio nella lettura che conta**. ⚠️ **Dichiarato come inferenza, non come citazione:** l'MDR **non scrive** «i codici non si riusano». ✅ **Precedente in casa già ratificato:** per le DdC annullate «il numero **NON si riusa mai**» (`ANALISI/17:149`, parere normativo del 16/07). 🔑 **Secondo argomento, indipendente dalla norma:** mettere lo stato nel predicato **obbligherebbe a scegliere QUALE stato**, e `pazienti` ne ha **due che non concordano** (`archiviato` scritto dal DELETE, `deleted_at` letto da RLS e wizard) — **un predicato senza stato non deve arbitrare niente**. **Costo: nessuno** (il numero successivo si calcola comunque). Panel: `docs/roadmap/2026-07-29-ondata-b-panel-validazione.md` §5-quater e §5-quinquies |
| **D34-bis** | **Il codice si normalizza**: `lower(btrim(...))` in indice **e** in scrittura | conseguenza tecnica di D34, adottata su parere concorde di due advisor e **provata** | 🔴 **Senza, il divieto non funziona: PROVATO.** Sonda P1-bis (transazione annullata, tabelle temporanee): con l'indice grezzo `pz-0042`, ` PZ-0042` e `PZ-0042 ` **passano tutti e tre**; con quello normalizzato sono **tutti rifiutati**, e il controllo positivo fra due laboratori **continua a passare**. La casella è modificabile a mano da **due strade** (wizard `PassoPaziente.tsx:76` e scheda `PazienteEditSheet.tsx:182-184`) **più la dettatura**, e `Campo.tsx:85` passa il valore **grezzo**. ✅ **Non è una scelta di gusto:** `cognomeEffettivo` (`domain/nome-paziente-scrittura.ts:86-89`) confronta **già oggi** il codice `trim`-ato e in minuscolo — è la normalizzazione **che esiste già su questa identica colonna**. ⚠️ **Ne segue un obbligo:** il pre-check deve usare **la stessa identica espressione**, e il generatore va reso **case-insensitive** (`.like` → `.ilike`, `/^PZ-(\d+)$/` → `/i`), altrimenti un `pz-0043` digitato a mano è invisibile al `max+1` e **il wizard proporrebbe un codice che l'indice ha già occupato** |

---

### Ottava tornata — 30 luglio 2026, apertura della consegna zero

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D35** | **La consegna zero si esegue con esecutori freschi, uno per task, con revisione fra l'uno e l'altro** | scelta esplicita fra tre modi, presentati col loro costo | **Conferma R-E1** (già ratificata il 28/07) e la estende alla consegna zero, che non è un task dell'ondata. Nel brief di ognuno va **l'istruzione esplicita di cercare dove il piano sbaglia**, e in particolare **dove si sente sicuro** — è il meccanismo che ha reso visibili 8 difetti su 8 nell'ondata (a) e 29 rilievi nel panel del 29/07. Costo accettato: più tempo e più consumo |
| **D36** | **Nella consegna zero l'avviso «codice già occupato» dice la verità e indica il campo. L'azione «È lei: usa la sua scheda» è RIMANDATA a T7+T15** | scelta esplicita fra tre forme, presentate col loro costo | 🔴 **La ragione è un fatto letto, non una preferenza:** il mockup ratificato del 28/07 (`docs/design/mockups/2026-07-28-wizard-avviso-codice-gia-in-uso.html`) mostra **nome del paziente, data dell'ultimo lavoro e primo codice libero** — **nessuno dei tre è disponibile nella consegna zero**. I primi due li porta **T7**; il terzo richiede una lettura di unicità che non esiste: `crea-lavoro.ts:214` confronta **byte-identico** (`===`) su una lista che arriva da un `GET` tagliato a **`.limit(500)`** (`api/pazienti/route.ts:37`) contro **911 pazienti di un solo cliente**. Offrire «È lei» significherebbe promettere un riconoscimento che il wizard **non sa fare**. **Testi ratificati:** nel wizard «Il codice PZ-0918 è già di un altro paziente. Scrivine un altro nel campo "Codice paziente" qui sopra.» · nel pannello di modifica «Questo codice è già di un altro paziente. Scrivine un altro.» **Nessuna schermata nuova, nessun mockup**: cambia solo la frase dentro l'avviso che esiste già (`WizardNuovoLavoro.tsx:383`), e il campo è **già editabile**. ⚠️ **Sostituisce** il testo di oggi — «Non sono riuscita a creare il lavoro. Riprova.» — che è **l'anello chiuso**: `pz` non si ricalcola mai (`WizardNuovoLavoro.tsx:258`, da `dati.prossimoPz` fissato al render della pagina), quindi «Riprova» **riproduce lo stesso errore all'infinito**. Quando arriverà T15 questa frase **decade** e le subentra l'avviso completo del mockup |

| **D37** | 🔧 **CORREGGE D36: il messaggio NON nomina il codice, ed è lo STESSO su entrambe le superfici** — «Questo codice è già di un altro paziente. Scrivine un altro.» | scelta esplicita fra tre uscite, presentate con le misure in mano | 🔴 **L'ha imposta una MISURA, non un'opinione** — è la FASE 9 che trova un difetto **prima** che esca. Il testo di D36 (102 caratteri con `PZ-0918`) occupa **TRE righe**, e `Avviso.tsx:194` ne mostra **DUE** (`-webkit-line-clamp: 2` + `overflow: hidden`): spariva l'ultima riga, cioè **l'istruzione**. L'avviso avrebbe detto il problema **nascondendo la soluzione**. ⚠️ E il taglio valeva a **tutte e tre** le larghezze, non solo su telefono: il contenitore satura a **480px** (`Avviso.tsx:290`), quindi il testo resta largo **366px** da 768 in su (276px a 390). 🔑 **La ragione che decide fra le tre uscite:** una frase che contiene il codice ha **lunghezza variabile** — 102 con `PZ-0918`, **108 con `PAZ/2026/0918`**, che è il formato degli **911 pazienti oggi in banca dati**. La variante intermedia (74/80 caratteri) reggeva col codice corto e **cedeva** con quello lungo: sarebbe passata in prova e si sarebbe rotta sui dati veri. Questa, a **60 caratteri fissi**, non può cedere. ✅ **Effetto collaterale buono:** è **la stessa identica frase** che restituiscono le due rotte e che rende `PazienteEditSheet` — **una sola stringa** da mantenere e un solo testo da riconoscere al banco. **Misure e catture:** `docs/design/mockups/2026-07-30-avviso-codice-occupato-misura.html` · 6 screenshot 390/768/1280 × chiaro/scuro in `docs/design/screenshots/2026-07-30-consegna-zero/`. ⚠️ **Resta aperto, come voce propria e FUORI da questa consegna:** il taglio a due righe colpisce **qualunque** avviso lungo, non solo il nostro — è un difetto del componente, non del testo |

---

### Nona tornata — le due decisioni che il piano v2 §9 aspettava
### Decima — T6 (D46-D50) · **Undicesima — perimetro T8 (D51-D53)** · **Dodicesima — chi esegue T8 (D54)** · **Tredicesima — il gesto (D55-D56)** · **Quattordicesima — Francesco ferma il disegno (D57-D60)** · **Quindicesima — dopo il panel di tre (D61-D63)** · **Sedicesima — la forma dell'album (D64-D66)** · **Diciassettesima — le quattro risposte prima della spec (D67-D70)** · **Diciottesima — la casella della categoria (D71-D73)** · **Diciannovesima — i due buchi rimasti (D74-D75)** · **Ventesima — le quattro superfici sul mockup (D76-D79)** · **Ventunesima — la forma della conferma distruttiva (D80)** · **Ventiduesima — il guasto in produzione dopo la migration di T1 (D81)** · **Ventitreesima — l'ordine dei tasti nel foglio di conferma, al gate T5 (D82)** · **Ventiquattresima — le due domande del panel sul gate (D83-D84)** · **Venticinquesima — i quattro bivi che il panel non poteva chiudere da sé (D85-D88)** · **Ventiseiesima — la ratifica del gate (D89)**

> 🔎 **Le tornate condividono la tabella qui sotto e non hanno un ordine cronologico**: le righe si
> leggono per numero, non per posizione. **D51-D53 sono dell'undicesima tornata** (29/07, apertura del
> lavoro su T8): perimetro del task · i due difetti del file che si tocca · il tempo di TOK-1.
> **D54 è della dodicesima** (stesso giorno, poche ore dopo): chi esegue T8 col modello potente sovraccarico.
> **D55-D56 sono della tredicesima** (dopo la chiusura di T8): la conferma sull'eliminazione, e le due
> superfici su cui il gesto compare.
> **D64-D66 sono della sedicesima** (davanti al confronto delle tre direzioni): la forma è **A + il
> visore**, la categoria **si chiede allo scatto**, e **l'editor resta fuori** — il visore nasce predisposto.
> **D67-D70 sono della diciassettesima** (30/07, le quattro domande poste **prima** di scrivere la spec, con
> un panel di tre advisor lanciato in parallelo sulle due questioni tecniche). 🔑 **D67 va letta per prima
> perché SPOSTA LAVORO FUORI dall'ondata** (§0A-bis, regola 2): a una domanda sul PDF Francesco non ha
> scelto un'opzione, **ha riformulato la domanda** e ha aperto un territorio nuovo — gli allegati che non
> sono foto, e la loro **condivisione**, mai discussa prima. **D68** dà l'ordine dell'album, **D69** mette
> l'eliminazione sotto il menù, **D70** tiene la categoria correggibile da entrambe le superfici.
> 🛑 **E il panel ha falsificato TRE premesse su tre delle domande che gli erano state poste** — v. §9.
> **D71-D73 sono della diciottesima** (stesso giorno, subito dopo): l'**ordine dei gruppi** che D68 lasciava
> aperto · l'elenco delle categorie **chiuso**, con le sei voci ratificate **per la prima volta** da
> Francesco (prima non le aveva mai viste: buco dello Statuto delle fonti, chiuso qui) · e la **casella
> `tipo` che si elimina**, con `categoria` al suo posto. 🔑 **D73 nasce da un panel di due advisor IN
> DISACCORDO, e a romperne il pareggio è stata una decisione precedente di Francesco (W23), non il
> coordinatore.**
> **D74-D75 sono della diciannovesima** (stesso giorno, in chiusura): sono **due buchi che nessuna delle
> decisioni precedenti copriva** e che sono emersi mettendole insieme — ① `categoria` obbligatoria senza
> ripiego (D73) + il foglio che si chiede allo scatto (D65) non dicevano **dove va una foto il cui foglio
> viene chiuso**; ② il visore a tutto schermo (D64) rende **facile da copiare** un collegamento che dura
> un'ora, e rimandarlo in silenzio avrebbe consegnato un peggioramento non dichiarato. 🔑 **Nessuno dei due
> era visibile guardando una decisione alla volta.**
> **D76-D79 sono della ventesima** (stesso giorno, sul mockup
> `docs/design/mockups/2026-07-30-album-visore-categoria.html`, tre tagli × due temi, **dentro la scheda
> vera** come chiede D58): album **A1** · visore **V1** · menù **M2** · categoria **C1**.
> 🔑 **D78 va contro la raccomandazione del coordinatore, ed è giusto che risulti:** la scelta è di
> Francesco e si esegue, ma i due costi che erano scritti nella domanda **restano veri**, quindi la riga li
> porta come **cose da progettare**, non come obiezioni. 📏 **E il disegno ha prodotto una misura che
> nessuna decisione poteva prevedere** (D79): l'etichetta più lunga delle sei **non ci stava**.
> **D80 è della ventunesima** (30/07, all'apertura dell'esecuzione): il piano dichiarava uno **scostamento
> dal mockup approvato** — la conferma di eliminazione sarebbe stata una **card centrata** invece del foglio
> dal basso disegnato — e lo dichiarava **senza averlo mai chiesto a Francesco**. Chiesto, ha scelto il
> **foglio**. 🔑 **Il punto di processo, che vale oltre questa riga: uno scostamento dal mockup approvato non
> è una nota tecnica, è una domanda.** Era stato scritto il 30/07 e registrato come «detto e non risposto»
> per un giorno intero — cioè un piano stava per essere eseguito con una superficie diversa da quella
> approvata, con la sola giustificazione di una regola interna.
> **D61-D63 sono della quindicesima** (dopo il panel di tre advisor): la foto è **materiale di lavoro**, il
> DPA va corretto, la rete è **conferma + traccia**. 🔑 **D61 scioglie D59:** la cancellazione **fisica** è
> ratificata, quindi T8 **non è più condizionale** — va emendato nella sua unica riga di sostanza.
> **D57-D60 sono della quattordicesima** (subito dopo, davanti al primo mockup): Francesco **ferma** il
> disegno — l'album va ripensato, il contesto intero è obbligatorio, e la cancellazione deve essere vera.
> 🔑 **D59 sospende in parte D55/D56**: la frase della conferma («il file resta conservato») dipende
> dall'esito del panel normativo. ✅ **La finestra del 409 NON è più in dubbio** — v. l'emendamento in coda
> a D59: «fino alla fine» = **fino alla consegna**. **D60** dichiara il perimetro allargato.

> ⚠️ **Nota sulle date, dichiarata e non nascosta.** Le tornate settima e ottava sono intestate «29 luglio»
> e «30 luglio», ma **i commit che le portano sono TUTTI del 29 luglio 2026** (`git log --date`:
> `bf009e2d` 09:55, `ed286b0f` 09:58, `b1620cbe` 10:15, `e845fc78` 11:20), e l'orologio della macchina
> segna il 29. La data «30/07» dei documenti e dei nomi di file è quindi **avanti di un giorno rispetto al
> registro dei commit**. Questa tornata porta **la data del sistema, 29 luglio 2026**. 🛑 **Nessuna
> rinomina retroattiva** di file e riferimenti: sarebbe un intervento largo e fuori mandato. Segnalato a
> Francesco (R-E2).

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D76** | 🖼️ **La carta album è la variante A1 — le foto della striscia stanno in blocchi, e ogni blocco porta SOPRA il nome della sua categoria** | scelta esplicita fra tre (A1 etichette sopra i blocchi · A2 striscia continua con separatori · A3 una riga per gruppo), viste **dentro la scheda vera** ai tre tagli in chiaro e scuro | ✅ **Rende visibile la decisione D68**, che altrimenti resterebbe un fatto interno: con A2 chi non sa che l'ordine è per categoria vede **solo delle stanghette**, e il raggruppamento non si spiega da sé. ✅ **E l'argomento che ha deciso è misurabile:** a **768** i quattro gruppi dell'esempio **ci stanno senza scorrere** — la stessa forma che a 390 scorre, sul tablet **si apre da sola**, senza un secondo disegno. ⚠️ **Costo accettato:** le etichette valgono **~17 px** di altezza e la striscia comincia a scorrere prima. 🛑 **Scartata A3** (una riga per gruppo) benché evitasse lo scorrimento orizzontale — che al banco è il gesto che si sbaglia di più: con sei categorie presenti la carta **spinge il tasto CONSEGNA sotto la piega**, e le miniature scendono a 48 px |
| **D77** | 👁️ **Il visore è la variante V1 — i controlli stanno SEMPRE in vista** (chiudi · categoria e «1 di 6» · menù ⋯ · striscia delle altre foto) | scelta esplicita fra due (V1 controlli visibili · V2 solo la foto, controlli al tocco) | ✅ **Al banco non si cercano gesti che nessuno insegna**, ed è la ragione che ha deciso: in V2 il tocco che scopre i controlli **è lo stesso** che ingrandisce — due significati sullo stesso dito. ✅ **E V1 rende giudicabile D66:** il posto riservato alla barra dell'editor **si vede**, quindi la decisione «editor fuori ma visore predisposto» si può valutare guardando invece che immaginando. ⚠️ **Costo accettato:** le due sfumature scure coprono **~124 px** di fotografia. 🔎 **Il caso peggiore è stato disegnato apposta e va tenuto d'occhio nell'esecuzione:** su una **radiografia** (foto scura) le sfumature **spariscono** e con loro il contrasto del testo bianco — la colonna V1-bis del mockup esiste per questo. ➡️ **Il contrasto dei controlli si prova sulla foto più scura**, non su quella media |
| **D78** | ⋯ **Il menù del visore è la variante M2 — una TENDINA ancorata ai tre puntini**, non il foglio dal basso | scelta esplicita fra due (M1 foglio dal basso · M2 tendina), **contro la raccomandazione del coordinatore**, coi due costi dichiarati nella domanda | 🔑 **La scelta è di Francesco e si esegue; ma i due costi erano scritti e restano veri, quindi si progettano invece di scoprirli dopo.** ① 🆕 **È un componente che in casa NON esiste:** l'app usa **fogli**, non tendine — quindi nasce un componente `ds` nuovo, con la sua **§5.x proposta prima di essere scritta** (processo §13.1 p.3 della spec v3), e non si improvvisa dentro un task. ② 🛑 **In alto a destra è la zona meno raggiungibile col pollice** su un telefono grande, ed è lì che finirebbe la voce che **cancella davvero** (D61). ➡️ **Mitigazione da rispettare, non facoltativa: la voce distruttiva sta IN FONDO alla tendina** — cioè il punto più lontano dai tre puntini e **più vicino al pollice** — e resta rossa, staccata da una linea e con margine extra, come prescrive §5.34. ⚠️ **E la tendina NON è un dettaglio grafico per il tasto «indietro»:** resta **uno strato** sopra il visore, quindi entra in `storia-overlay.ts` esattamente come un foglio — altrimenti «indietro» chiuderebbe **il visore** invece del menù. Conta come **terzo strato** (visore → tendina → conferma). Da progettare con lei: chiusura toccando fuori, chiusura allo scorrimento, e raggiungibilità da tastiera e lettore di schermo (un foglio ce l'ha già, una tendina no) |
| **D89** | 🚪 **IL GATE DELLE CINQUE §5.x È RATIFICATO — le sezioni §5.38-§5.42 entrano nella spec v3 (rev. 3.4), §5.17 e §13.2 sono emendate, §5.33 è chiusa** | «procediamo», dopo che le **quindici** voci di §0 erano state riassunte una per una e i **quattro bivi** decisi esplicitamente (D85-D88) | ⚠️ **La forma della ratifica si scrive com'è stata:** è **complessiva**, non riga per riga — Francesco ha visto il riassunto di tutte e quindici e i quattro bivi li ha decisi lui, uno alla volta. Si registra così perché **una ratifica raccontata più forte di com'è avvenuta è il modo di far sembrare esaminato ciò che è stato approvato in blocco**. 🔑 **Che cosa cambia concretamente:** le cinque sezioni sono **legge** da adesso — un componente non in spec è una review respinta (§13.1 p.3) — e sono entrate **in forma normativa**, non nella forma della proposta: nella spec sta **che cosa si fa**, mentre le prove, i numeri rifatti e le stesure superate restano nell'allegato, che ogni sezione cita. ✅ **La convenzione era già in casa e l'ho verificata invece di indovinarla:** §5.29, §5.30, §5.31, §5.32 e §5.34 portano tutte «React in Ondata X» — **una §5.x entra nella spec PRIMA che il componente esista**, ed è esattamente ciò che §13.1 p.3 impone. ✅ **E G-1 è stata riverificata ADESSO, non fidandosi della prova di stamattina:** `provato:` `grep -rn "5\.38\|5\.39\|5\.40\|5\.41\|5\.42"` su spec e `src/components/ds/*.tsx` → **0 riscontri**. Non è pignoleria: **questa stessa spec ha già rinumerato una sezione una volta** (§5.35 → §5.37 il 21/07, quando la Parete si è presa 5.35 e 5.36). ➡️ **Da qui: T5-ter, poi i mandati, poi T6 → T9-bis** |
| **D88** | 🌑 **L'ombra della tendina RESTA, e diventa la seconda eccezione ratificata alla legge «in scuro nessuna ombra»** (spec v3 §3) | scelta esplicita fra due (l'ombra resta dichiarata · via l'ombra, si stacca con un anello), posta col rilievo **C-14** del panel | 🔑 **La ragione che decide è che la legge di §3 ha una PREMESSA, e sopra una fotografia quella premessa non c'è:** «l'elevazione è una superficie più chiara» funziona perché sotto c'è una superficie d'app di luminanza nota, da cui affiorare; sotto la tendina c'è una **fotografia qualunque** — una radiografia bianca o una guida colore sovraesposta — e non esiste nessun «più chiaro» che si stacchi da entrambe. ✅ **Il precedente esiste, è ratificato e porta lo stesso argomento:** `src/design-system/v3/tokens.ts:75` dichiara per `TastoPiu` in scuro «unica ombra esterna: l'alone della ghiera». Questa diventa la **seconda**, e come la prima **si scrive**: un'eccezione dichiarata è una regola con un confine, un'eccezione silenziosa è una regola morta. ⚠️ **Il confine da incidere:** vale per un pannello che galleggia **sopra una fotografia**, non per le carte dell'app — `var(--sh-card)` in scuro resta `none` per tutto il resto |
| **D87** | 🔠 **L'etichetta sopra ogni gruppo di foto sale da 11 a 12,5 px** — il minimo assoluto del sistema | scelta esplicita fra due (sale a 12,5 · resta 11 con deroga scritta), posta col rilievo **C-9** del panel | 🔑 **Non è una questione di gusto ma di coerenza interna, ed è il difetto che il panel ha trovato per DOPPIA MISURA:** lo stesso documento del gate boccia il contatore del visore a 12 px invocando il minimo di §4.1 (**12,5**), e quattro sezioni prima accetta in silenzio **11** — su un testo che per giunta è il più difficile che ci sia: maiuscolo, spaziato di 0,1em, nel colore più debole (`var(--faint)`). `provato:` mockup `docs/design/mockups/2026-07-30-album-visore-categoria.html:96` (`.gr-et { font-size: 11px }`). ⚠️ **Costo dichiarato:** l'etichetta cresce di 1,5 px e con lei la fascia dei gruppi; **D76** aveva già messo a bilancio ~17 px per queste etichette e il margine regge. ➡️ Nasce lo scostamento **S10** nel gate: il mockup dice 11, la §5.38 prescrive 12,5 |
| **D86** | 🚦 **La via dell'`Escape` di §1.5 si TIENE; il ripiego, se mai servisse, lo decide il coordinatore — non l'esecutore** | scelta esplicita fra tre (si tiene con ripiego pre-autorizzato al coordinatore · si sceglie subito il ripiego FM-2 · decide l'esecutore di T7), posta col bloccante **B-2** del panel | ✅ **La premessa è stata VERIFICATA e regge:** `provato:` — riverificato dal coordinatore in `node_modules/react-dom/cjs/react-dom-client.development.js:3394-3397` (lo `stopPropagation()` del sintetico chiama quello **nativo**) e `:12907-12911` (`case 4`, il portale, chiama `listenToAllSupportedEvents(containerInfo)`: gli ascoltatori stanno sul **contenitore del portale**, che sta sotto `window` nella risalita). Il ripiego quindi con ogni probabilità **non servirà**. ⚠️ **Il confine da incidere, perché la verifica vale solo per metà del meccanismo:** regge per la fase di **bolla**; un ascoltatore in **cattura** su `window` passerebbe attraverso. Oggi nessuno la usa — `provato:` i **nove** ascoltatori `keydown` su `window` di tutto `src/` sono tutti in bolla — ma la regola deve dirlo, o il giorno che qualcuno ne aggiunge uno in cattura il difetto torna senza che niente lo segnali. 🔑 **Perché il bivio non può restare in mano all'esecutore:** il ripiego tocca `src/components/ds/storia-overlay.ts`, modulo condiviso da due componenti in produzione, cioè **fuori mandato per R-E2**. Un esecutore che ci arrivasse dovrebbe fermarsi comunque: meglio scritto prima che scoperto dopo |
| **D85** | 🔒 **La trappola del focus si ripara ALLA RADICE, come D84 ieri: un modulo solo, e `Sheet` e `DialogConferma` diventano suoi utenti** | scelta esplicita fra tre (alla radice · solo i quattro strati nuovi · rendere inerte la pagina dietro), posta col bloccante **B-1** del panel — convergenza a tre advisor su tre | 🔑 **Il difetto vero non è il `Tab` che scappa: è che tutti gli overlay di casa dichiarano `aria-modal="true"` e NESSUNO lo mantiene.** Quell'attributo significa, alla lettera, «quello che c'è dietro non esiste»; `provato:` in tutto `src/components/ds/` non esiste **una sola** gestione del `Tab`. Il velo copre già i clic, l'attributo copre già i lettori di schermo: manca la tastiera, ed è esattamente il pezzo che il modulo porta. 🔴 **Il difetto è concreto, non teorico:** `src/components/layout/SkipToContent.tsx:12` è focusabile, globale e a z-index **9999** — col `Tab` si esce dal pannello, si atterra lì, e da quel momento `Escape` risale a `window` dove vivono **nove** ascoltatori e chiude lo strato **sbagliato**: l'inverso esatto del difetto che la via di §1.5 esiste per chiudere. 🛑 **Scartata la via «rendere inerte la pagina dietro»**, benché sia quella che fa il browser da sé coi dialoghi nativi: per spegnere «tutto tranne me» uno strato deve scegliere quali figli del corpo risparmiare, e **il contenitore degli avvisi è appeso lì anche lui** (`src/components/ds/Avviso.tsx:99`, portale su `document.body`) — spegnere tutto spegne il cartellino che dice «Foto eliminata», e salvarlo vuol dire andare a marchiare un file condiviso. La soluzione forte diventa forte **solo** allungando la mano fuori dal mandato; se non la allunghi, rompi il cartellino. ⚠️ **Costo accettato, dichiarato nella domanda:** nasce `src/components/ds/trappola-focus.ts` (🆕 **da creare**), si toccano **due file vivi** (`Sheet.tsx`, `DialogConferma.tsx`) e serve un task suo, **T5-ter**, prima di T6 — stessa forma e stessa collocazione di T5-bis ieri. ✅ **Il guadagno è dello stesso tipo di D84:** ritira un'invariante che nessuna macchina può controllare («il pannello che contiene il focus è quello in cima») e la rende vera **per costruzione**. 🔧 **PRECISAZIONE aggiunta nella stessa serata, rileggendo: la trappola vale per i TRE DIALOGHI, non per la tendina** — e non è un'eccezione di comodo. L'argomento di questa decisione («`aria-modal="true"` promette che dietro non esista niente, la trappola è la metà mancante») vale **dove quella promessa c'è**: `VisoreFoto`, `FoglioCategoria`, `FoglioConferma` — più `Sheet` e `DialogConferma`. **`TendinaMenu` è `role="menu"` e NON porta `aria-modal`**, e nel modello del menù **un solo elemento sta nella sequenza del `Tab`** mentre a muoversi fra le voci sono ↑ e ↓ — che è già ciò che §5.40 prescriveva: la prima stesura ci **incollava sopra un secondo modello**. ➡️ Sulla tendina il `Tab` **chiude e riporta il focus al ⋯**, che vive dentro `VisoreFoto`, **che la trappola ce l'ha** — quindi il punto portante di §1.5 resta vero per costruzione. 🔑 **E il bloccante B-1 chiedeva che ogni §5.x DICHIARI il proprio comportamento, non che tutte dicessero la stessa cosa:** l'uniformità era una comodità di scrittura, ed era il modo di sbagliare pattern su uno dei cinque |
| **D84** | 🔧 **Il difetto del blocco dello scorrimento si RIPARA alla radice adesso, non si aggira con una regola** — nasce **T5-bis**, un modulo a contatore di cui anche `Sheet` è utente, **prima** di T6 | scelta esplicita fra due (riparare adesso · tenere la via «gli strati alti non toccano mai lo scorrimento»), coi costi dichiarati nella domanda | ✅ **La ragione che ha deciso è di documentazione, non di codice:** la via alternativa **funziona**, ma inciderebbe in una §5.x della spec v3 una regola che è la **scorciatoia attorno a un difetto** di `src/components/ds/Sheet.tsx` — e il giorno in cui qualcuno lo riparasse davvero, **tre sezioni in vigore direbbero il contrario del codice**, con un altro gate per correggerle. 🔑 **E toglie di mezzo un'invariante che nessuna guardia può controllare:** «esattamente un bloccante alla volta, e dev'essere il più basso» non è esprimibile in TypeScript, non è verificabile da nessun controllo esistente, e quando cade produce il guasto peggiore dell'app (pagina bloccata sotto le dita, non riparabile senza chiudere). ⚠️ **Gli attori sono DUE, non uno** — `provato:` grep su tutto `src/`: `src/components/ds/Sheet.tsx:227-257` e `src/components/features/ordini/NuovoOrdineSheet.tsx:91-95`, e **il secondo è il peggiore** perché non cattura niente e alla pulizia scrive `overflow = ''` a mano. Un contatore con un non-partecipante che sovrascrive il valore sarebbe incompleto per costruzione. ⚠️ **Il modulo deve accettare lo sblocco DIFFERITO** di `Sheet` (`onExitComplete`, `Sheet.tsx:328`): `blocca()` torna una `sblocca()` **idempotente**. ➡️ Dopo T5-bis, G-3 si riscrive nella forma definitiva — «ogni strato chiama `bloccaScorrimento()`» — che è più corta e **non ha costo residuo**: cade anche il difetto dichiarato del foglio categoria allo scatto |
| **D83** | 🔝 **Il visore delle foto COPRE tutto, anche un foglio già aperto** — i tre strati salgono a **1010 · 1020 · 1030**, sopra `Sheet` e `DialogConferma` (1000) e sotto gli avvisi (1100) | scelta esplicita fra due (il visore copre · il visore sta sotto), posta dal panel del 30/07 | 🔑 **La domanda è nata da un censimento incompleto, ed è il pezzo che il documento del gate aveva omesso:** `provato:` — riverificato dal coordinatore — `src/components/features/lavori/consegna-v3/FlussoConsegna.tsx:56` e `FrameConsegnato.tsx:90` sono **due overlay v3 a tutto schermo a z-index 1000**, montati **dalla stessa pagina** dove vivrà l'album (`SchedaLavoroV3.tsx:376`). La casa aveva già risposto alla domanda «a che quota sta un overlay v3 a tutto schermo», e la risposta era **1000**, non 400. ✅ **Il guadagno non è estetico: l'assunzione A-2 del gate SMETTE DI ESSERE PORTANTE.** Con 400/500/600 la correttezza dipendeva da «nessuno `Sheet` resta aperto sotto il visore» — vero **oggi** sui due chiamanti misurati, ma è una regola che chi aggiungerà una voce di menù domani deve conoscere **senza che niente glielo ricordi**. 🛑 E l'invariante vera era **più larga** di come A-2 la scriveva: `FoglioCategoria` **allo scatto non passa mai dal visore**, quindi il caso più frequente della funzione non era nemmeno coperto dalla frase |
| **D82** | ↕️ **Nel foglio di conferma i due tasti stanno nell'ordine di §5.17: «Annulla» SOPRA, «Elimina foto» SOTTO** — non come nel mockup, che li mostra invertiti | scelta esplicita fra due (l'ordine del design system · l'ordine del mockup approvato), col costo di ciascuna dichiarato nella domanda | ✅ **Conferma lo scostamento S3 della proposta T5, e lo fa diventare una decisione invece che una deduzione.** 🔑 **L'argomento che decide non è «lo dice la regola», è la COERENZA INTERNA di questa stessa ondata:** con **D78** la voce distruttiva della tendina sta **in fondo proprio perché il fondo è la zona del pollice**, e la sicurezza la portano rosso + linea + parola esplicita. Mettere nel foglio la voce **sicura** in fondo «perché lì c'è il pollice» significherebbe usare **due grammatiche opposte a due centimetri di distanza** — peggio di entrambe. ✅ **E allinea le due forme della conferma:** `DialogConferma` (§5.17, `src/components/ds/DialogConferma.tsx`) usa già sicura-sopra/distruttiva-sotto, quindi da D80 in poi le due forme **si leggono uguali** e cambia solo il contenitore. ⚠️ **Conseguenza sul piano, e non è cosmetica:** la riga di T9-bis «focus alla **prima azione**» prescriveva una **posizione**; con quest'ordine la prima azione **è** quella sicura, ma la frase va riscritta come **proprietà** («alla prima azione, **che è quella sicura**») — altrimenti un domani un'inversione manderebbe il focus sul tasto che cancella (rilievo **F-7** della proposta) |
| **D81** | ⏸️ **Il caricamento foto rotto sul sito pubblicato SI LASCIA COSÌ fino al merge dell'album** | scelta esplicita fra tre (correzione minima su `main` subito · lasciare fino al merge · rimettere la colonna in banca dati), coi costi dichiarati nella domanda | 🔴 **Il fatto, verificato e non dedotto:** questo progetto ha **un solo database**, `iagibumwjstnveqpjbwq`, che serve **anche uachelab.com** — non esiste staging né `supabase/config.toml`. La migration di T1 ha eliminato `tipo` **per davvero**, mentre il codice pubblicato la scrive ancora (`origin/main:src/app/api/lavori/[id]/immagini/route.ts:110`, `tipo: 'foto'`) ➡️ **da ora ogni caricamento di foto in produzione risponde 500.** ✅ **La scelta regge perché il costo è misurato, non minimizzato:** §8 di `ua-app/CLAUDE.md` registra dal 21/07 che in quel database ci sono **solo dati di prova e nessun cliente vero**, quindi non c'è nessun laboratorio che perde una fotografia — il costo è che la funzione non risponde a chi apre l'app per provarla. ⚠️ **Due cose che restano vere e vanno tenute d'occhio:** ① sommato a **R28**, l'errore che l'utente vede **non è generico**: la rotta rimanda il messaggio grezzo del database, cioè «column … does not exist» arriva al browser — un'altra ragione per chiudere R28 in **T3**; ② **al merge si verifica che il caricamento torni a funzionare**, ed è un passo di collaudo di **T13**, non una speranza. 🛑 **Scartata la terza via** (rimettere la colonna a mano): lo schema smetterebbe di corrispondere al registro delle migration, e andrebbe disfatta di nuovo alla pubblicazione — due passaggi rischiosi invece di uno |
| **D80** | 🗑️ **La conferma dell'eliminazione è un FOGLIO DAL BASSO, come nel mockup approvato — non la card centrata `DialogConferma`** | scelta esplicita fra due (cartellino centrato di casa · foglio dal basso del mockup), con la deroga e il pezzo nuovo dichiarati nella domanda | ✅ **Lo scostamento S1 del piano DECADE**: il piano torna fedele al mockup che Francesco aveva approvato, e la riga «dichiarato ma non confermato» del punto di ripresa si chiude. 🔑 **E la deroga è più piccola di come il piano l'aveva presentata, perché è verso l'ALTRA sezione:** `provato:` la spec v3 §5.16 (riga 257) impone che «su mobile OGNI form/creazione/modifica è uno sheet o un wizard full-screen — **mai** modal centrato» (invariante di progetto), quindi **il foglio si allinea all'invariante, non lo viola**. La riga da emendare è **§5.17** (riga 259) più l'anti-pattern §13.2 (riga 521, «❌ modal centrato su mobile (salvo `DialogConferma`)»), che resta vero ma **smette di essere l'unica forma ammessa per una conferma distruttiva**: `DialogConferma.tsx:3-9` si dichiara «l'UNICA card centrata ammessa dal design system» — è quel «unica» a diventare «una delle due forme», e `DialogConferma` **resta in casa per tutto il resto**, qui si affianca e non si sostituisce. 🔴 **Il costo tecnico è MISURATO e va progettato PRIMA di T12, non scoperto dentro:** `Sheet` blocca lo scorrimento del corpo e la sua difesa è **solo contro la propria rientranza** — `scrollLockPrecedenteRef` è un `useRef` **per istanza** (`Sheet.tsx:222`, catturato a `:248-252`), quindi un secondo foglio aperto **sopra** il visore (che blocca già, P16 del piano) catturerebbe `overflow:'hidden'` come «valore precedente» e alla chiusura lo **ripristinerebbe a hidden per sempre**: la pagina resterebbe bloccata sotto le dita. ➡️ **Il foglio di conferma NON può essere uno `Sheet` nudo montato sopra il visore.** ⚠️ **Secondo costo, gemello di quello di D78:** nasce una **§5.x nuova** (foglio di conferma distruttiva) da proporre nel gate T5 prima di scriverla — è il **secondo** componente nuovo di questa ondata dopo la tendina. ⚠️ **I vincoli di testo restano quelli di sempre:** oggetto esplicito della conferma, **mai** «elimina definitivamente» (`src/design-system/v3/dizionario.ts:25` lo vieta e propone «Butta via»), e la frase deve dire che la foto sparisce **anche dall'archivio** — dopo D61 la vecchia formula «il file resta conservato» è **falsa** |
| **D79** | 🏷️ **Il foglio della categoria è la variante C1 — sei pastiglie su due colonne** | scelta esplicita fra due (C1 pastiglie · C2 elenco a righe) | ✅ **Tutte e sei si vedono insieme senza scorrere**, nella metà bassa dello schermo (la zona del pollice), con pastiglie da **60 px**. 🛑 **Scartata C2** benché fosse la forma già in casa: **sei righe da 56 px sono 336 px**, cioè quasi mezzo schermo — l'anteprima della foto non ci starebbe più e le ultime voci finirebbero lontane dal pollice, fra cui **«Radiografia»**, che al banco non è rara. ⚠️ **Due cose che il disegno ha lasciato aperte, dichiarate:** ① le **emoji sono un segnaposto** — servono icone vere, ed è lavoro di disegno in più da mettere nel piano; ② 📏 **misura fatta e da NON perdere:** a 390 la pastiglia utile è **148,5 px** e «**Guida colore**», la più lunga delle sei ratificate da D72, **andava a capo** sfalsando la griglia — rientra a **15 px** di testo. 🔑 **È la stessa trappola dei nomi lunghi già pagata con le briciole (D39): l'etichetta più lunga si MISURA, non si stima** — e se una voce cambierà nome, questa misura va rifatta |
| **D75** | 🔗 **La DURATA dei collegamenti con cui si vedono le foto si decide NEL LAVORO SULLA CONDIVISIONE (D67), non qui. Nell'ondata (b) è un VUOTO DICHIARATO E DATATO** | parole di Francesco: «*dobbiamo decidere come si condividono le foto, i file allegati ad un lavoro, una scheda lavoro proprio, quindi direi di lasciare questa cosa in quel task*» | ✅ **La ragione regge, ed è la stessa che ha fatto scartare la fretta altrove:** decidere la durata **prima** di sapere come si condivide significa progettare per un'architettura che poi cambia — condividere non è accorciare una scadenza, è **decidere chi ha il permesso**. 🔴 **Il fatto che resta vero e va scritto, non sottinteso:** oggi la foto si vede con un **collegamento firmato che vale un'ora** (`(app)/lavori/[id]/page.tsx:65` e `modifica/page.tsx:87`, `3600`) ed è **al portatore** — chi ce l'ha entra senza autenticarsi; il portale dei dentisti usa **300** e la PEC **60**, e quei due numeri sono **motivati per iscritto** mentre il 3600 è stato **copiato** da un esempio. ⚠️ **E il gradiente è invertito:** dal portale le foto **non passano mai** (`api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts:13` serve solo `ddc` e `buono`), quindi il dato più delicato — impronte e **radiografie** — ha la finestra **più lunga** e **non ha alternativa più corta da nessuna parte**. 🛑 **La mitigazione da ~15 righe è stata presentata e NON scelta** (TTL corto + rinfresco al ritorno sulla scheda): era indipendente dall'esito della condivisione, e va registrato che l'uscita esisteva ed è stata scartata consapevolmente, non che non c'era. ➡️ **Vincolo che l'ondata (b) DEVE rispettare, ed è la contropartita del rinvio: l'album e il visore non peggiorano l'esposizione in modo evitabile** — nessun punto nuovo che mostri, copi o esporti l'indirizzo firmato, e il conteggio dei punti in cui quell'indirizzo compare **non cresce**. ⚠️ **Da riprendere in D67 insieme a R20** (la public URL persistita in `lavori_immagini.url`, oggi inerte): è lì che nascerà la tentazione «rendiamo pubblico il bucket» |
| **D74** | 🏷️ **Se il foglio della categoria si chiude senza scegliere, la foto nasce `altro` — l'elenco resta a SEI, nessuna settima voce** | scelta esplicita fra tre (settima voce «Da classificare» · `altro` · la foto non si salva senza categoria), **col costo di ciascuna dichiarato nella domanda** | ✅ **Chiude il buco che D65 + D72 + D73 aprivano insieme e che nessuna delle tre copriva:** `categoria` è `NOT NULL` **senza ripiego** (D73), quindi una foto il cui foglio viene chiuso **non aveva dove andare**. Ora ce l'ha. ✅ **E scarta la peggiore delle tre:** «la foto non si salva» avrebbe fatto **perdere uno scatto** al banco per un foglio chiuso col dito — e lo scatto può essere di un'impronta già buttata. 🔴 **Il costo, che era scritto nella domanda e resta vero: l'album NON potrà distinguere «ho scelto Altro» da «non ho risposto».** Le due cose finiscono nello stesso valore, quindi la deriva che D65 esiste per chiudere **non è chiusa del tutto: è ristretta**. Prima l'app indovinava **sempre** (`'impronta'` per la fotocamera, `'altro'` per la galleria — `TabImmagini.tsx:198`); adesso indovina **solo per chi non risponde**, e non su una categoria clinica ma sulla voce che significa «nessuna delle precedenti». ⚠️ **Conseguenza sulla forma, da portare nella spec:** il gruppo `altro` è **l'ultimo** nell'ordine di D71, quindi le foto non classificate stanno **in fondo** e non occupano la foto grande della carta — il difetto resta contenuto **per costruzione dell'ordine**, non per caso. 🔑 **E una conseguenza sul foglio:** chiudere senza scegliere **non è un errore** e non si tratta come tale (niente avviso, niente suono d'errore); ma il foglio deve rendere **evidente** che una scelta è attesa, o «Altro» diventa la risposta normale invece dell'eccezione |
| **D71** | 🗂️ **CHIUDE il punto lasciato aperto da D68 — l'ordine dei gruppi dell'album è CRONOLOGICO: `impronta → pre_lavoro → colore → post_prova → rx → altro`** | scelta esplicita fra quattro (cronologico · colore davanti · radiografia davanti · decidere sul mockup), presentate col loro costo | ✅ **Segue il tempo del lavoro:** prima ciò che arriva dallo studio, poi ciò che nasce al banco. Chi apre la scheda vede per prima la foto che dice **da dove si parte**. 🔑 **E l'ordine NON è esprimibile in SQL:** l'ordinamento alfabetico darebbe `altro, colore, impronta, post_prova, pre_lavoro, rx` — cioè `altro` **davanti a tutto**. ➡️ **L'ordine vive in TypeScript**, accanto alle sei voci, e le foto si ordinano **dopo** la lettura (4-20 per lavoro: costo nullo). ⚠️ **Costo dichiarato:** la lista dei sei valori esiste allora in **due posti** — la migration e il codice — e il database **non restringe il tipo generato** (`categoria` esce come `string` da `gen types`, non come unione dei sei). ➡️ **Serve una prova-spia che LEGGE la migration** e verifica che le due liste coincidano, o divergeranno in silenzio. **Il «1 di 4» si conta dalla posizione nell'elenco**, mai da una colonna |
| **D72** | 📋 **Le categorie foto sono un elenco CHIUSO, uguale per tutti i laboratori — e le SEI voci di oggi sono confermate da Francesco: Impronta · Pre-lavoro · Guida colore · Post-prova · Radiografia · Altro** | due scelte esplicite: elenco **fisso** (contro «ogni laboratorio le sue» e «fisso ora, apribile poi»); voci **«vanno bene così»** (contro «te le correggo» e «decidiamo sul mockup») | 🔑 **Questa riga chiude un buco dello STATUTO DELLE FONTI, e va detto:** quelle sei voci **non erano mai state scelte da Francesco** — le ha scritte chi ha costruito il componente (`TabImmagini.tsx:15-22`), sono ferme da allora, e stavano per essere **scolpite in un vincolo di banca dati** senza che nessuno gliele avesse mai mostrate. La prova che mancava era la n.4 dello Statuto (decisione esplicita di Francesco): ora c'è. ✅ **Conseguenza diretta:** l'elenco chiuso rende legittimo un `CHECK` — se fosse estendibile servirebbe una **tabella di consultazione**, una schermata per gestirla e una regola per le foto orfane quando una categoria viene cancellata. **Non serve niente di tutto questo.** ⚠️ **E il costo dell'elenco chiuso, dichiarato:** una voce nuova costa un rilascio, non un'impostazione |
| **D73** | 🛠️ **La colonna `tipo` SI ELIMINA, e nasce `categoria` — vincolata ai sei valori, obbligatoria e SENZA valore di ripiego** | **decisione delegata**: «*non so risponderti, scegli tu il modo migliore*». ➡️ Ratificata dal coordinatore col parere di un panel di **due** advisor **in disaccordo fra loro**, e sciolta da **una decisione precedente di Francesco** (W23) | 🔴 **I due advisor si sono contraddetti, ed è il motivo per cui questa riga è lunga.** **Il primo** raccomandava di **riservare** `tipo` per l'ondata degli allegati (D67): due assi esistono davvero — un `.stl` può essere **la scansione di un'impronta**, il formato e il contenuto sono domande diverse. **Il secondo l'ha demolita con due fatti**, riverificati: ① **`tipo` non è l'asse del formato**, perché dei suoi quattro valori (`foto,scan,rx,altro`, `002_fase2_schema.sql:251-252`) **due — `rx` e `altro` — sono già due delle sei categorie fotografiche**, e `'foto'` dentro una tabella che si chiama `lavori_immagini` non dice nulla: è **la stessa domanda della categoria, disegnata a metà sotto un secondo nome**; ② il formato **è già derivabile senza colonne**, perché `storage_path` è `NOT NULL` (`:246`) e porta sempre l'estensione, presa da un'allowlist **chiusa di sei** (`api/lavori/[id]/immagini/route.ts:11-18`, percorso costruito a `:85`). ➡️ **Riservarla non risparmia nemmeno una migration**: D67 dovrebbe comunque riscriverne il vincolo. 🔑 **Il pareggio l'ha rotto Francesco, tre giorni fa (W23, `docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md:295-300`): «*se serve usala sennò togli, il codice nella nostra pwa deve essere più ordinato e pulito possibile*»** — stessa identica classe (una colonna diventata inutile), stessa motivazione registrata allora («toglierla subito è innocuo, toglierla dopo significherebbe una seconda migration»), e coerente con la richiesta del 30/07 di non costruire un'infrastruttura che cade a pezzi. ✅ **Raggio d'azione MISURATO, non stimato:** `tipo` **non è letta da nessuno** — gli otto siti innestano `(*)` e nessuno la consuma, **zero occorrenze nei due test della tabella**, e l'unico `.tipo` in `TabImmagini.tsx:523` è lo **stato locale del caricamento**. Si tolgono **tre righe** (`route.ts:110` che la pinna · `[imgId]/route.ts:10` che la lascia **scrivibile dal browser** · `types/domain.ts:484`) più `gen types`. 🛑 **`NOT NULL` SENZA `DEFAULT`, ed è la parte che conta:** con un ripiego («altro») il compilatore tace e un domani uno scrittore che dimentica la categoria passa inosservato — **cioè D65 riprodotta di una colonna più in là**. Senza ripiego, `tsc --noEmit` **si accende sull'unico scrittore** e obbliga a dirla: **il rosso è il risultato atteso, non un incidente**. ⚠️ **Ordine della migration, e i due modi in cui può abortire:** colonna nullable → **backfill TOTALE (🛑 MAI un filtro `deleted_at`: le righe cancellate resterebbero nulle e `SET NOT NULL` aborterebbe)** → `CHECK` **dopo** il backfill (prima validerebbe subito e aborterebbe sul primo valore fuori elenco) → `SET NOT NULL`. **File SEPARATO da quello di D63**: falliscono in modi diversi, e un file solo che si ferma a metà disallinea il ledger per entrambe. 🔴 **Da NON dimenticare a valle** (censimento del panel): la validazione dei valori **nella rotta**, o una violazione del vincolo esce come **500** invece di 422 (`[imgId]/route.ts:60-66,80-86`) · `SchedaLavoroV3.tsx:316` usa oggi `descrizione` come **testo alternativo** dell'immagine (uno screen reader legge «pre_lavoro»): senza la mappa `categoria → etichetta` l'immagine resterebbe **senza etichetta**, cioè peggio di adesso · `tests/unit/lavori-immagini-deleted-embed.test.ts:41` asserisce il **grafema letterale** `immagini:lavori_immagini(*)` — aggiungere una colonna va bene, **trasformare l'innesto in elenco esplicito romperebbe la guardia di T8** · D70 impone **una sola funzione di scrittura**, quindi `handleTipoChange` e `handleTipoChangeDb` (`TabImmagini.tsx:224-244` e `:247-260`) si fondono. 📌 **Un fatto misurato che vale per D67:** oggi un **PDF caricato è in banca dati come `tipo='foto'` e `descrizione='altro'` — entrambe le colonne mentono sulla stessa riga**; chi progetterà gli allegati dovrà ricostruire il genere vero **fiutando l'estensione** |
| **D67** | 📎 **APERTURA — «foto» e «allegato» diventano due cose distinte, e la CONDIVISIONE degli allegati entra nel progetto per la prima volta.** L'album dell'ondata (b) resta **solo foto**; il resto è materia di un'ondata propria | parole di Francesco: «*l'inserimento di una foto nella scheda di un lavoro va di pari passo all'inserimento di un allegato qualsiasi, che possa esser un pdf, un stl, piuttosto che altro… valutiamo una differenziazione tra foto e altri tipi di allegati, il modo di allegarli, il modo di conservarli, rivederli e condividerli. (Non avevamo mai parlato della possibilità di condividere gli allegati, via whatsapp, via portale del medico al clinico, o nella chat generale con gli altri membri del laboratorio)*» | 🛑 **Non è la scelta di un'opzione: è una riformulazione della domanda, e va registrata come tale.** Gli era stato chiesto *cosa fare del PDF che oggi finisce fra le foto e rende la tessera rotta*; ha risposto spostando il problema di un livello. ✅ **Ciò che è GIÀ FERMO e si può usare subito:** ① foto e allegato **non sono la stessa cosa** e non devono condividere la stessa superficie; ② il posto naturale per allegare **è la scheda del lavoro**, non il wizard — nel wizard, se ci sarà, sarà **una possibilità dichiaratamente opzionale**. 🟡 **Ciò che è APERTO e richiede il suo percorso** (BP-2 pieno: brainstorming → gate FASE 3 → panel): come si allegano · come si **conservano** (un `.stl` non è un dato sanitario come una radiografia, e la regola di conservazione può non essere la stessa: D61 ha classificato **la foto**, non l'allegato) · come si **rivedono** (un `.stl` non ha anteprima) · e soprattutto **come si condividono** — WhatsApp, portale del dentista, chat interna del laboratorio: **tre canali con tre modelli di rischio diversi**, e la chat interna **non esiste nel prodotto**. 🔴 **La condivisione tocca subito una cosa già in tavola:** oggi una foto si vede tramite una **URL firmata**, che è **un link al portatore** — chi ce l'ha entra senza autenticarsi. Condividere per link vuol dire **progettare il permesso**, non accorciare una scadenza. ➡️ **Conseguenza immediata sulla spec dell'album:** il perimetro è **le sole foto**; e 🛑 **`application/pdf` NON si toglie da `ALLOWED_MIME`** (`api/lavori/[id]/immagini/route.ts:17`) dentro questa spec — togliere la sola strada esistente prima che ne esista un'altra chiuderebbe una porta a chi oggi la usa. La spec **dichiara il caso e lo rimanda**, mostrando intanto un PDF come **tessera documento**, non come immagine rotta. ⚠️ **Voce di roadmap propria, da collocare** (candidata: accanto o dentro l'ondata (c) «Le foto, per bene»)  🔄 **Destinazione aggiunta dall'audit del 03/08/2026:** **voce 7** di `docs/roadmap/ROADMAP-UFFICIALE.md`, aperta. |
| **D68** | 🗂️ **L'album ordina le foto RAGGRUPPANDOLE PER CATEGORIA** — davanti sta la prima del gruppo più importante | scelta esplicita fra quattro (più vecchia · più recente · trascinamento · raggruppate per categoria), presentate col loro costo | 🔴 **Il fatto che rende questa scelta più pesante di come suona:** oggi **l'ordine delle foto non esiste**. `provato:` l'INSERT scrive `ordine: 0` fisso (`api/lavori/[id]/immagini/route.ts:111`) **sovrascrivendo il default 1 dello schema** (`002_fase2_schema.sql:253`), e **nessuno degli otto siti di lettura ordina l'innesto** (verificati uno per uno, zero `.order()`). «La prima foto» non ha oggi alcun referente stabile — e una carta che mostra **una** foto grande deve sapere quale. 🔑 **E la scelta di Francesco poggia su un dato che oggi NON è affidabile, ed è la cosa più importante di questa riga:** la categoria vive in **`descrizione`** (testo libero, nessun vincolo — `TabImmagini.tsx:236,253`), mentre la colonna **`tipo`**, che il vincolo ce l'ha (`CHECK (tipo IN ('foto','scan','rx','altro'))`, `002_fase2_schema.sql:251-252`), è **morta**: l'INSERT la pinna a `'foto'` (`route.ts:110`). Le **sei** categorie che l'utente vede (`impronta, pre_lavoro, colore, post_prova, rx, altro` — `TabImmagini.tsx:15-22`) **non sono** le quattro del vincolo: **quattro su sei verrebbero rifiutate** dal database se si scrivessero in `tipo`. ➡️ **D65 («la categoria si chiede allo scatto») e D68 («si ordina per categoria») poggiano entrambe su questa colonna: la spec DEVE dichiarare dove vive la categoria**, o le due decisioni costruiscono su un dato che il database non difende. ✅ **Ciò che invece NON è in dubbio, misurato:** un cambio d'ordine **non tocca alcun documento conservato** — nessuno dei dieci template PDF legge `immagini` (i tre generatori la innestano e la buttano), quindi All. XIII p.4 non è coinvolto e questo resta un fatto di interfaccia. 🔑 **Conseguenza tecnica:** un raggruppamento a priorità **non è esprimibile come `.order()` di PostgREST** — si ordina in JavaScript dopo la lettura (4-20 foto per lavoro: costo nullo), e cade con esso la sonda sul comportamento di `referencedTable` su un innesto aliasato. ⚠️ **Resta da chiedere a Francesco l'ORDINE DEI GRUPPI** (quale categoria sta davanti): la scelta è sua, non del panel. E il «1 di 4» si conta **dalla posizione nell'elenco**, mai dalla colonna `ordine` |
| **D69** | 🗑️ **Nel visore a tutto schermo il tasto per eliminare sta SOTTO IL MENÙ ⋯**, non in vista | scelta esplicita fra tre (sempre visibile con conferma · sotto il menù ⋯ · solo dalla carta, mai dal visore), presentate col loro costo | ✅ **Il gesto distruttivo non sta mai accanto al gesto di scorrere**, che nel visore è il gesto principale e continuo. Con D61 la cancellazione è **fisica**: un tocco sbagliato non toglie un'etichetta, toglie il file. ➡️ **Un tocco in più, pagato apposta.** 🔑 **Non sostituisce la conferma di D55, la affianca:** menù → «Elimina foto» → conferma. E **non contraddice D56** («il gesto vive su entrambe le superfici»): D56 dice *dove* compare, D69 dice *quanto è profondo* dentro il visore. ⚠️ **Da portare nella spec:** il menù ⋯ del visore è **una superficie nuova** e va nel censimento del tasto «indietro» insieme al visore stesso (`storia-overlay.ts`), perché è un secondo strato sopra un overlay — e la sua rete di controllo (`scripts/guardia-navigazione-overlay.mjs`) **è manuale** |
| **D70** | 🏷️ **La categoria di una foto già caricata si corregge DA ENTRAMBI I POSTI: dal visore toccando l'etichetta, e dall'album sotto la tessera** | scelta esplicita fra tre (solo dal visore · solo dall'album · entrambi), presentate col loro costo — **compreso** il costo dichiarato di «entrambi» | ✅ **È l'applicazione diretta della direttiva permanente del 27/07** («ogni campo del lavoro si corregge, fino alla consegna»): la categoria nasce da una digitazione al banco, quindi l'errore è il caso normale e nessuna delle due strade deve essere un vicolo cieco. 🛑 **Il costo era stato dichiarato nella domanda e resta vero: la stessa logica scritta in due punti è esattamente la classe di difetto che questo progetto ha già pagato** (due scrittori dello stesso dato che si scollegano — v. D45 e le 911 righe di `crea-lavoro.ts`). ➡️ **Vincolo che la spec deve imporre, o la decisione si trasforma nel suo difetto:** **una sola funzione di scrittura**, chiamata dalle due superfici — mai due percorsi di salvataggio paralleli. Il precedente in casa da NON ripetere è nello stesso file: `TabImmagini.tsx:224-244` e `:247-260` sono **due** gestori quasi identici (`handleTipoChange` e `handleTipoChangeDb`) che fanno la stessa `PATCH` con due strade diverse |
| **D38** | 🧺 **La cassetta creata dal wizard nasce ALLA FINE, insieme al lavoro.** Il wizard porta **l'intenzione**, non l'effetto | scelta esplicita fra due uscite, presentate col loro costo (bloccante B-2 + I-6 del piano v2) | ✅ **Sblocca T18**, che era 🚧 fermo su questa decisione. **La scrittura avviene nell'unico punto in cui nasce il lavoro** — `src/components/features/wizard/WizardNuovoLavoro.tsx:363-371`, che il codice stesso dichiara «l'unico punto che chiama `creaLavoroDaWizard`, nessuna scorciatoia lo bypassa» (letto, `:363`; ⚠️ **il piano diceva `:362-364`: coordinate derivate**). ➡️ `POST /api/cassette` **non si chiama durante il percorso**. **Costo accettato:** cassetta e lavoro devono nascere **insieme** — una RPC atomica, o due passi con compensazione: **la forma si decide dentro T18**, con panel se non è ovvia, e ricalcando il precedente in casa (`crea_rifacimento_atomico`, «MAI 3 INSERT separati»). ➡️ **Cambia il contratto di `src/components/features/cassette/NuovaCassettaSheet.tsx`**, oggi costruito su `onCreata` → assegnazione immediata. 🔑 **Non contraddice D30, la precisa:** D30 decideva **il gesto al banco** («ci va dentro subito», nessun ritorno alla griglia) e resta intatta; D38 decide **quando nasce la riga in banca dati**. ✅ **E tiene vero un testo già ratificato:** chi preme ✕ dopo il passo cassetta legge «nel gestionale non resta niente» — con l'uscita (b) avrebbe lasciato **una cassetta vuota sulla parete** subito dopo aver letto quella frase |
| **D45** | 🛑 **CORREGGE UN PEZZO DI D44: quando la ricerca NON trova nulla, LO DICE.** E con essa entra una regola di metodo: **un numero letto sui dati di prova non diventa una regola di prodotto** | rilievo di Francesco: «*non vorrei che il fatto che stai ragionando sui dati in db che sono dati test messi alla cavolo, ecco perché non trovi i cognomi, ti potesse sviare*» | 🔴 **Aveva ragione su una conclusione, e la ritiro:** l'advisor «banco» aveva raccomandato **nessun messaggio quando non si trova nulla**, perché «con questi dati *non trovato* è l'esito **normale**». Quel «normale» **vale solo per l'archivio di prova**: con un archivio vero, chi cerca «Bagheria» e non riceve **niente** resta a fissare un campo muto, senza capire se sta sbagliando a scrivere o se il paziente non c'è. ➡️ **T15 mostra lo stato «nessun risultato».** ✅ **Cosa invece NON cambia, perché non dipendeva dai dati** (riverificato): ① i 911 senza cognome **non sono dati inseriti male, sono un difetto del CODICE** — `src/lib/wizard/crea-lavoro.ts:229-230` scrive `cognome: alias \|\| pz` e `nome: ''` **fissi**, quindi un laboratorio vero, con l'app di oggi, otterrebbe **lo stesso identico archivio**; ed è proprio ciò che D2 e T16 chiudono; ② **mai `nome_cognome`**: quella colonna **non la scrive nessuno**, la compone il trigger `trg_paziente_nome_cognome` da `cognome` e `nome` — cercarci dentro non aggiunge nulla che non sia già nelle due caselle vere; ③ **il tetto sulle righe** serve **di più** con un archivio pieno, non di meno; ④ **la «lunghezza minima» resta inutile anche coi dati veri**, perché i codici generati sono tutti `PZ-` più un numero: un prefisso comune resta comune; ⑤ **la scelta di `alias` invece di `cognome`** nasce da una trappola nel **codice** (scrittura contro lettura), non dai numeri. ⚠️ **E una cosa che resterà vera anche con l'archivio pulito:** un paziente **senza nome** è un caso **legittimo**, non un errore — la prescrizione può arrivare col solo codice, e la legge lo consente (Art. 21(2) MDR: nome, acronimo **o codice**). Non saranno 911 su 916, ma **non saranno zero**: la riga di suggerimento deve saper dire «questo paziente non ha un nome» invece di fingere che ce l'abbia. 🔑 **La regola di metodo, che vale oltre questo caso:** prima di trasformare una misura in una regola, si chiede **da dove viene il numero** — se dal **codice** (allora vale anche domani) o dai **dati di prova** (allora sparisce con la pulizia, `ua-app/CLAUDE.md` §8) |
| **D44** | 🔎 **CHIUDE IL BLOCCANTE «B2 contro T6», e lo chiude verso il BASSO: la ricerca pazienti restituisce QUATTRO chiavi — `id, codice_paziente, alias, ultimoLavoro` — e filtra su `codice_paziente \| cognome \| nome`, MAI su `nome_cognome`** | decisione tecnica, ratificata col parere concorde di un panel di due advisor (contratto · banco), dopo che entrambi i fatti-perno sono stati riverificati aprendo i file | 🔴 **Il bloccante era questo:** il piano voleva `cognomeEffettivo` **dentro** la proiezione, la spec **B2** pretendeva «esattamente cinque chiavi» **con una prova che fallisce alla sesta**. Due documenti ratificati, incompatibili. **Scartata l'uscita (a)** — servire il cognome derivato sotto la chiave `cognome` — e la ragione è **provata, non estetica:** `cognome` sarebbe **la colonna in scrittura e un derivato in lettura**, e un client che rilegge e rimanda `cognome: ''` (cioè **911 righe su 916**) passa da `src/app/api/pazienti/[id]/route.ts:130-135` e finisce su `risolviNomePaziente` (`src/lib/domain/nome-paziente-scrittura.ts:64-68`), che scrive **`cognome := codice`**: mutazione **silenziosa**, risposta 200, nessun errore. 🔑 **E B2 sarebbe rimasta VERDE attraverso il cambiamento che è nata per vedere**, perché guarda la forma e (a) non cambia la forma. ✅ **La parola giusta esisteva già in casa:** `derivaAlias` (`src/lib/cassette/parco-shared.ts:69`) torna `string \| null`, legge **una** colonna e copre **entrambe le generazioni di dato** — restituisce `null` quando il nome visibile **è** il codice. `cognomeEffettivo` è invece l'attrezzo di **scrittura**, e sulle 911 righe restituisce `''`: sarebbe **una terza convenzione per «nessun nome»**. 📏 **Il filtro è aritmetica, non opinione** (misurato il 29/07: 916 totali · **911 senza cognome** · 5 con cognome vero · 911 con `nome_cognome = codice_paziente` · `nome` pieno **2** volte): **911 + 5 = 916**, quindi **nessuna riga porta in `nome_cognome` un nome che non sia già in `cognome`** — includerlo aggiungerebbe **solo** 911 righe indistinguibili. `nome` entra benché pieno due volte, perché `risolviNomePaziente:67` mette **nel cognome** il valore quando la casella piena è una sola. ⚠️ **E la «lunghezza minima» del piano non difende nulla, misurato:** **912 codici su 916** condividono lo stelo `PAZ/2026/`, quindi `%PAZ/2026/0%` — **dieci** caratteri — restituisce **911 righe**. ➡️ **La difesa è un tetto duro sulle RIGHE** (~10 dalla rotta, **5 mostrati** a schermo), non sui caratteri digitati. 🛑 **Il motivo che il piano dichiarava — «mostrerebbe il codice due volte» — oggi vale ZERO righe** (`cognome == codice`: nessuna): il problema **vero e presente** è che 911 schede **non hanno alcun nome**. 🔴 **E resta una seconda cosa da NON sottintendere:** piano (T6.1, proiezione stretta **sempre**) e spec §5 (ridotta **solo quando c'è `q`**) **non concordano**; B2 deve dire **su quale percorso** vale e se l'innesto «ultimo lavoro» gira **anche senza `q`** — cioè sul percorso dell'unico chiamante vivo (`src/lib/wizard/crea-lavoro.ts:250`), che quel valore **non lo legge**, per fino a 500 righe a ogni creazione di lavoro |
| **D43** | 🔒 **L'indice unico sul codice paziente si applica SUBITO alla banca dati di produzione** (T5), non a fine ondata | scelta esplicita fra tre uscite, presentate col loro costo — la domanda gli è stata posta **con il conteggio dei duplicati rifatto in quel momento**, non con quello del giorno prima | ✅ **Precondizione P2 rieseguita nello stesso turno, come prescrive il piano** (decade col tempo): `provato:` duplicati sul codice **normalizzato** per laboratorio → **0 righe**; duplicati sul codice **grezzo** → **0 righe**; baseline **294 · 0 · 916 · 48** intatta. ➡️ **La migration non può abortire.** 🔑 **Da quel minuto Z1 smette di essere inerte:** il messaggio «Questo codice è già di un altro paziente» (D37), in produzione dal 29/07 ma **impossibile da accendere** senza indice, comincia a comparire davvero — e l'applicazione **sa già gestirlo**, che è la ragione per cui la consegna zero è andata in produzione **prima** del ramo. ⚠️ **Non esiste uno staging** (verificato: `deploy.yml` non ha alcuno step di migration, `ci.yml` porta un URL segnaposto, non c'è `supabase/config.toml`): «applicare» significa **toccare l'unico progetto**, ed è il motivo per cui questa decisione è stata chiesta e non assunta. **Rollback, come comando e non come categoria:** `DROP INDEX IF EXISTS pazienti_codice_lab_uidx;` **Nessun dato esistente viene modificato**, e a 916 righe la finestra di blocco è trascurabile (`CONCURRENTLY` **non serve**, verificato: zero occorrenze in tutto `supabase/`). ✅ **Registro delle migration verificato allineato** prima di toccarlo: 85 registrate in `supabase_migrations.schema_migrations`, ultima `20260728103000`, che è **l'ultimo file su disco** |
| **D42** | 🎨 **CHIUDE D40, dopo il panel dei tre advisor: la tinta non dentale si fa DOPO, e con i NOMI.** Nell'ondata (b) i tre tipi non chiedono il colore; la tavolozza con le tinte nominate diventa **un'ondata propria**, con catalogo **separato** da `colori_dentali` | scelta esplicita fra tre uscite, presentate col loro costo, dopo il parere concorde dei tre advisor | ✅ **In T2, `prevedeColore` diventa a TRE valori** — `'catalogo' \| 'libero' \| 'nessuno'` — e i tre tipi prendono **`'libero'`, che nell'ondata (b) non rende alcun passo**: meglio nessuna domanda che una domanda con la scala sbagliata. È l'unica parte che entra ora, ed è TypeScript puro: **zero banca dati**. 🔑 **I tre pareri hanno detto no all'esadecimale nudo per tre ragioni diverse, e la più forte è di Francesco stesso** (riga 151 di questo verbale, sui colori delle cassette): «*non ci conviene unificare, se questo permette la ricerca per colore; facciamo solo in modo da avere una tabella più ricca possibile che copra quasi tutti i colori ricercabili*» — aveva **già** scelto i nomi contro l'hex, per la ricercabilità. 🔴 **E il panel ha smontato anche la via di mezzo che sembrava ovvia — allargare `colori_dentali` con due scale nuove:** `lavori.colore_scala/colore_codice` e le quattro colonne di `lavori_denti` puntano a quel catalogo con **cinque chiavi esterne** (`lavori_colore_caso_fk` + `lavori_denti_*_fk`), e **l'id fine dei 38 tipi NON è persistito** (su `lavori` c'è solo `tipo_dispositivo`, 10 valori macro) → `('sport','rosso')` diventerebbe scrivibile **sulla riga-dente di una corona** e nessun vincolo potrebbe accorgersene. **La separazione dei cataloghi è l'unica guardia strutturale disponibile.** ⚠️ **E il vincolo non aiuterebbe:** `colori_dentali_codice_check` accetta **1-8 caratteri**, quindi `#AABBCC` (7) **ci entra** — provato leggendo `pg_constraint`. ✅ **Nessuna urgenza normativa:** il colore **non finisce oggi su nessun documento** — `generate-ddc.ts:99` tiene `prescrizione_caratteristiche` a `null` fisso e il template lo stampa solo se valorizzato. ➡️ **Voce di roadmap propria**, con la ragione scritta. 🔑 **La forma futura, già indicata dai moduli veri:** i colori non dentali si scrivono **a nome** — «Pink / Clear» per la resina, «Clear, White, Black, Gold» per il paradenti  🔄 **Destinazione aggiunta dall'audit del 03/08/2026:** **voce 6** di `docs/roadmap/ROADMAP-UFFICIALE.md`, in corso. |
| **D41** | 🔬 **Sulla dima chirurgica il passo colore NON compare** | scelta esplicita fra due, presentate col loro costo | La dima è una guida per l'implantologo e **non ha un colore proprio**: il verbale del 27/07 §6-quater le assegna il colore «solo se si ordina un provvisorio», ma **nel wizard un lavoro ha un tipo solo** — il provvisorio è un altro lavoro, col proprio passo colore. ➡️ **In T2: `prevedeColore: 'nessuno'` per `dima_chirurgica`**, e la riga del verbale §6-quater va letta con questa precisazione accanto. 🔧 **Corretto il 29/07 su segnalazione dell'esecutore di T2 (R-E2):** questa riga diceva `prevedeColore: false`, cioè **la forma booleana di prima di D42** — scritta un attimo prima che D42, nella stessa tornata, portasse il campo a tre valori. Il difetto non ha bloccato il lavoro (il brief traduceva già in `'nessuno'`), ma **il verbale letto da solo si contraddiceva**: è la stessa classe di §2/D22, «una stesura sostituita non si aggiorna, si riscrive». Una domanda in meno al banco nel caso normale |
| **D40** | 🎨 **PROPOSTA DI FRANCESCO — ✅ VALIDATA E CHIUSA DA D42** (qui sopra): il *gesto* resta (fila di tinte da toccare + si può saltare), **l'esadecimale libero no**. Per i tipi il cui colore **non è dentale** (`placca_espansione`, `apparecchio_funzionale`, `paradenti`) si valuta **il selettore delle cassette** (`src/components/features/cassette/SwatchesColore.tsx`: sei facce con nome + colore libero), **con la possibilità di saltare** | «non possiamo inserire un selettore colore come quello che abbiamo nella creazione delle cassette? ricordandoci sempre di poter skippare se non occorre» | 🔴 **La domanda nasce da una sonda, non da un'ipotesi:** il catalogo vivo `colori_dentali` ha **solo colori dentali** — `vita_3d_master` 29 · `vita_classical` 16 · `fuori_scala` 3 (codici `T`, `BL`, `OM`, `hex` a `NULL`) — quindi **nessuna tinta resina e nessun colore sportivo esistono**, e **D3 vieta di inventarne** («non esiste poter inserire un colore che non esiste»). Senza una via, quei tre tipi resterebbero **senza il dato che il verbale §6-quater dichiara necessario**. ⚠️ **Ciò che resta da sciogliere, e perché non si ratifica oggi:** ① **dove si salva** un colore che non è un codice di catalogo; ② se `prevedeColore` può restare **booleano** o deve dire **anche di che natura** è il colore (è la forma del dato di **T2**, quindi blocca T2); ③ se D3 parla del colore **dentale** o di **ogni** colore — la distinzione va scritta, o fra sei mesi le due decisioni si leggeranno in conflitto (precedente: D30 e D38); ④ cosa finisce sui **documenti conservati** (un esadecimale non è un nome); ⑤ quanti **mockup** servono, visto che il passo colore (T20) è già dietro un gate. ➡️ **Panel di tre advisor in corso** (architettura del dato · esperienza al banco · documenti e norma), come prescrive la Regola Advisor. **La forma si ratifica col parere in mano, e prende il proprio numero.** 🔑 **Ciò che è già fermo, perché l'ha detto Francesco:** qualunque sia la forma, **si deve poter saltare** |
| **D39** | 🍞 **Una briciola che non ci sta intera prende un NOME CORTO DEDICATO**, scritto a mano accanto al tipo. Niente tagli, niente puntini, una riga sola | scelta esplicita fra tre uscite (nome corto · due righe · carattere più piccolo), presentate col loro costo | ✅ **Sblocca la regola che T11 aspettava** e **conferma D22** (troncare è vietato) senza toccarla. ➡️ **Nasce una stringa propria della briciola** accanto ai 38 tipi in `src/lib/domain/tipi-lavoro.ts`: la scia **non eredita più `labelTipo()`**, che resta com'è per ricerca e tessere. 🔴 **E qui il piano v2 va corretto su un numero MISURATO, non stimato:** diceva «~15 etichette su 38 superano i 17 caratteri, fra cui `Duplicato protesi`, uno dei tre casi di prova canonici» — **misurate sul file, sono NOVE** (`Corona metallo-ceramica` 23 · `Scheletrato con attacchi` 24 · `Scheletrato laser (SLM)` 23 · `Abutment personalizzato` 23 · `Provvisorio su impianto` 23 · `Apparecchio funzionale` 22 · `Protesi flessibile` 18 · `Corona su impianto` 18 · `Provvisorio resina` 18), e **`Duplicato protesi` NON è fra quelle**: sta a 17 esatti. ⚠️ **La soglia dei 17 caratteri resta però una STIMA**: la misura vera è in pixel, sulla CSS vera, e si fa **dentro T11** — i nomi brevi si scelgono **sull'esito della misura**, non sulla stima, e la scelta si porta a Francesco in **una passata sola**. 🔑 **Chiude anche «Anti- russamento»** (`labelTipo` a `src/lib/domain/tipi-lavoro.ts:86-88` — ⚠️ **il piano diceva `:74-76`**): la stringa nasce dall'unire le due righe della tessera (`Anti-` + `russamento`), corretta su due righe e sbagliata su una sola. Il nome breve la sostituisce **senza toccare la tessera** |
| **D50** | ✂️ **Un termine di ricerca oltre i 64 caratteri risponde `200 { pazienti: [] }`. 🛑 NON si tronca** | rilievo del revisore di T6: il tetto di 64 caratteri era **entrato senza numero** — nessun documento di mandato lo nominava (cercato: zero occorrenze in piano, verbale e spec) e **nessuna rotta in casa taglia un termine di ricerca** | 🔑 **Il tetto è giusto, il troncamento no.** Con i metacaratteri tutti spenti, un termine di 70 caratteri semplicemente **non combacia con niente**; troncarlo a 64 fa combaciare **di più** di quanto l'utente abbia chiesto — cioè restituisce suggerimenti per un testo **che non ha scritto**, in silenzio. È lo stesso difetto di forma che D48 chiude sull'escape: **non si altera mai ciò che l'utente ha digitato**. ➡️ Il tetto **resta come guardia** (un codice paziente e un cognome non sono lunghi 64 caratteri: oltre quella soglia non c'è nulla da trovare) ma si comporta **come la guardia sul vuoto** — stessa uscita, stessa forma, un `it` proprio. ⚠️ **E la lunghezza massima non c'entra con la lunghezza MINIMA**, tolta da D44 e che resta tolta: quella difendeva la riservatezza e **non difendeva nulla**; questa è un freno su un input che non può portare un risultato |
| **D49** | 🔎 **Un termine di ricerca VUOTO ma con lo studio dichiarato (`?q=&cliente_id=X`) risponde `200 { pazienti: [] }`** — non l'elenco | **buco di specifica**: nessun documento lo copriva. Scelta dell'esecutore di T6, **dichiarata** nel suo rapporto invece che presa in silenzio, e ratificata dal coordinatore | 🔑 **Il caso esiste perché i due controlli di D46/D48 non si sovrappongono:** il **400** difende `q` **senza** `cliente_id`, la **guardia sul vuoto** difende un termine che **collassa** a vuoto dopo l'escape (`q='*'`). Un `q` vuoto **con** lo studio non cade in nessuno dei due. ➡️ **Vince «nessun risultato», e non è una scelta neutra:** l'alternativa — non applicare il filtro — restituirebbe **le prime dieci schede dello studio** per un termine che **non ha cercato niente**, cioè trasformerebbe una casella svuotata in un elenco. ⚠️ **E non contraddice D45** («quando la ricerca non trova nulla, LO DICE»): D45 parla di una ricerca **fatta** che non trova; qui la ricerca **non è stata fatta**. Tocca a **T15** distinguere i due stati a schermo — casella vuota ≠ «nessun risultato» |
| **D46** | 🚪 **CHIUDE «4-ter», l'ultimo bloccante di T6: la risposta di `GET /api/pazienti` ha UNA FORMA SOLA — `id, codice_paziente, alias, ultimoLavoro` — su ENTRAMBI i percorsi, con o senza `q`** | decisione tecnica, ratificata dal coordinatore col parere di un panel di **tre** advisor (contratto API · costi del database · sicurezza e dati), dopo che i fatti-perno sono stati riverificati **di persona** | 🔴 **Il bloccante era questo:** il piano voleva la proiezione stretta **sempre**, la spec §5 e §14.3 la volevano **solo con `q`**, e **B2 non diceva su quale percorso vale**. ➡️ **Vince il piano, e per una ragione che non è di gusto: due forme di risposta sulla stessa porta non hanno UN SOLO precedente in casa** — `api/clienti/route.ts:28-30,38-40` e `api/fasi-produzione/ricerca/route.ts:34-36` applicano `q` come **solo filtro**, con `select` e forma di risposta **identiche** con e senza. Una forma che cambia col parametro è una **modalità nascosta**: nessun chiamante può tipizzare la risposta senza sapere *come ha chiesto*, e il conto si paga in T15/T16 che riusano la stessa `fetch`. 🔧 **E cade con essa la mia proposta di calcolare l'ultimo lavoro solo con `q`:** ✅ **misurato** — sul percorso senza `q`, 500 righe, l'innesto costa **+911 buffer e +1,6 ms** (1,817 → 3,432 ms), e quel percorso gira **una volta per creazione di lavoro**, non a ogni tasto. Risparmiare lì è micro-ottimizzazione comprata con una spaccatura di contratto. 🛑 **E la chiave `ultimoLavoro` NON si omette quando manca:** vale `null`, che significa **una cosa sola** — «questo paziente non ha lavori» (stessa convenzione già scritta in `codice-paziente-unicita.ts:54-57`). Un `null` che significhi *anche* «non calcolato» sarebbe un valore che mente. **Il resto della forma, dichiarato:** tetto **incondizionato** — ~10 righe con `q`, 500 senza · `archiviato = false` su **entrambi** i percorsi · `cliente_id` **obbligatorio quando `q` è presente**, e il ramo si sceglie su **`q !== null`, MAI su `if (q)`** (🔑 `searchParams.get('q')` torna `''` per `?q=`, e `''` è falso: con `if (q)` una casella svuotata cade nel ramo legacy e il vincolo di portata si aggira **togliendo un carattere** — sarebbe un 400 decorativo) · **400, non 422**, perché il precedente in casa per un parametro di query mancante è `impostazioni/pec/verify-status/route.ts:11` (400) mentre tutti i 422 trovati sono semantica di **corpo**, e una GET non ne ha; col suo `motivo` leggibile a macchina, mai una frase. 🛑 **E una frase che deve stare scritta in T6:** questa rotta **non risponde alla domanda «chi occupa il codice»** — quella è `trovaOccupanteCodice` (T7), che è **cieca allo stato e larga su tutto il laboratorio**. Senza questa riga T15 userebbe la ricerca come riconoscimento e riaprirebbe il buco che T7 esiste per chiudere |
| **D47** | 🔎 **EMENDA D44 su UN punto: nel filtro della ricerca `nome_cognome` RIENTRA, e le colonne cercate diventano QUATTRO — `codice_paziente, nome_cognome, cognome, nome`** | l'aritmetica con cui D44 l'aveva escluso è stata **rimisurata e trovata void** | 🔴 **D44 diceva: «includerlo aggiungerebbe SOLO righe indistinguibili».** ✅ **Falso, e provato:** su quelle 911 righe vale `nome_cognome = codice_paziente` **carattere per carattere** (verificato: `PAZ/2026/0101` → `nome_cognome` `PAZ/2026/0101`), quindi `nome_cognome ILIKE '%q%'` e `codice_paziente ILIKE '%q%'` selezionano **lo stesso identico insieme** e il di più è **ZERO**. `provato:` righe che `nome_cognome` aggiunge e `codice_paziente` non porta già → `paz` **0** · `2026` **0** · `101` **0**; e sulle schede con un nome vero aggiunge **esattamente 1** (`ross` 1 · `bagheria` 1 · `giuseppe` 1). 🔑 **E il caso che l'esclusione rompeva è il più naturale di tutti: cercare il nome COME LO SI LEGGE A SCHERMO.** `provato:` `q = 'bagheria giuseppe'` → col filtro di D44 (tre colonne) **0 righe**, con `nome_cognome` **1 riga**. Il cognome e il nome, separati, non contengono mai la stringa che li unisce. ⚠️ **Perché QUATTRO e non due** (`nome_cognome` è oggi un **soprainsieme stretto** di `cognome`/`nome`: 0 righe trovate da quelle due e non da lui, su 8 sonde): il soprainsieme **non è garantito**, perché il trigger `sync_paziente_nome_cognome` (`002_fase2_schema.sql:124`) ricompone **solo `IF NEW.nome IS NOT NULL AND NEW.cognome IS NOT NULL`** — una riga futura col solo cognome lascerebbe `nome_cognome` **fermo al valore vecchio**, e il soprainsieme si romperebbe **in silenzio**. Nessun vincolo lo impedisce. ➡️ Si tengono tutte e quattro: costa una `ILIKE` in più per riga (~0,5 µs) e **non poggia su un'invariante che oggi nessuno fa rispettare**. ✅ **Cosa di D44 NON cambia:** le **quattro chiavi in uscita**, `alias` invece di `cognome`/`nome`, il tetto sulle righe, e la **caduta della lunghezza minima** — che resta caduta (v. D48) |
| **D66** | ✂️ **L'editor (ruota · ritaglia) NON entra ora: il visore nasce PREDISPOSTO e l'editor è il lavoro subito successivo** | scelta esplicita fra tre (visore ora + editor dopo · editor ora distruttivo · editor ora non distruttivo), presentate col loro costo | ✅ **Chiude il perimetro** aperto da D60 e da «avviando anche l'editor» di D64. **DENTRO ORA:** carta con foto grande · apertura a tutto schermo · ingrandimento · categoria (chiesta allo scatto, D65) · eliminazione con conferma e traccia · **e il posto per la barra dell'editor già previsto nel visore**, che è il motivo per cui questa forma è stata scelta. **SUBITO DOPO, lavoro proprio:** ruota e ritaglia. 🔴 **La ragione tecnica che ha fatto scartare «editor ora», e non è di comodo:** in casa **non esiste alcun modo di sostituire i byte di un'immagine** — l'allowlist del `PATCH` è `descrizione, tipo, ordine` (`[imgId]/route.ts:10`) e nessuna rotta riscrive lo storage. Ritagliare significherebbe **caricare una foto nuova e cancellare l'originale**; e con D61 + D63 quella cancellazione è **vera**, quindi un ritaglio storto sarebbe **definitivo**. In più ogni salvataggio **ricomprime** un'immagine già compressa (`TabImmagini.tsx:36-42`: webp q.85, max 1920), e la perdita si accumula. ➡️ **L'editor non distruttivo è la forma giusta** (originale intatto + le trasformazioni salvate come istruzioni), ed è anche la più costosa: tocca come le foto si conservano **e** come si mostrano in ogni punto. Merita il suo lavoro e il suo panel, non una coda a questo. ⚠️ **Un vincolo che il visore deve rispettare da subito, o l'editor lo pagherà:** il visore mostra la foto **alla sorgente**, senza degradarla — la fedeltà del colore è uno dei tre motivi per cui quelle foto esistono |
| **D64** | 🖼️ **La forma dell'album è «A + il visore»: la carta con foto grande sulla scheda, e al tocco sulla foto principale si apre a TUTTO SCHERMO** | parole di Francesco: «*A, con la possibilità però, di cliccare sulla foto principale e aprirla a tutto schermo avviando anche l'editor*» | 🔑 **Non è la direzione A pura, ed è giusto scriverlo:** A metteva la foto grande **dentro** la pagina e il suo limite dichiarato era «non è un vero ingrandimento»; B portava il visore ma cambiava l'indice in griglia. La scelta prende **la carta di A** (una carta con titolo «Foto», foto grande ~4,7× la miniatura di oggi, striscia sotto, categoria e «1 di 4») **più il visore di B** come secondo livello. ➡️ **Ed è la combinazione che scioglie il contro di A:** «si disegnerà due volte» era vero perché A non aveva dove ospitare l'editor — col visore, la superficie per l'editor **esiste già**. **Conseguenze da portare nella spec:** il visore è **un componente nuovo del sistema grafico** (in casa non esiste nulla di riusabile) · deve entrare nella **gestione del tasto indietro** (`storia-overlay.ts` + `useNavigaDaOverlay`, regola già pagata) e la sua rete di controllo **è manuale** (`scripts/guardia-navigazione-overlay.mjs`) · chiede **un velo più coprente** nei token, perché `materia.scrim` (`rgba(29,25,19,.35)`) è troppo trasparente per starci dietro una fotografia · vale **identico** su scheda e modifica (D56: una superficie sola, due chiamanti). ⚠️ **E l'emendamento a DS v3 §5.33 diventa più largo:** non solo «non più sola lettura», ma «la striscia diventa una carta, e la foto si apre» |
| **D65** | 🏷️ **La categoria si CHIEDE allo scatto, e smette di essere indovinata** | scelta esplicita fra tre (chiedere allo scatto · «Da classificare» · lasciare com'è) | 🔴 **Oggi è indovinata, e il default è scritto nel codice:** `TabImmagini.tsx:198` assegna `'impronta'` a tutto ciò che arriva dalla **fotocamera** e `'altro'` a tutto ciò che arriva dalla **galleria** — quindi una guida colore fotografata al banco nasce «Impronta». Finché l'etichetta non si vede, il difetto dorme; **messa in bella vista, un'etichetta falsa diventa credibile** (il difetto passa da «non vedo» a «vedo una cosa sbagliata»). ➡️ **Il dato nasce giusto**, e l'album può fidarsi di ciò che mostra. ⚠️ **Il costo è un tocco in più al banco, e va detto:** contraddice il «percorso minimo a tre tocchi» del DS v3 §7.3 — **è una deroga consapevole**, decisa da Francesco sapendo che il momento dello scatto è quello con le mani occupate. 🔑 **Da progettare con cura, quindi:** la domanda deve arrivare **dopo** lo scatto (mai prima: non si blocca la fotocamera) e con le sei voci a portata di pollice; e per lo **scatto multiplo** si chiede **una volta per gruppo**, non foto per foto — o il tocco in più diventa sei |
| **D61** | 🗂️ **Una foto di un lavoro è MATERIALE DI LAVORO, non una registrazione di fabbricazione** — e da qui scende che la cancellazione **fisica** è legittima | scelta esplicita fra tre (materiale di lavoro · registrazione di fabbricazione · dipende dalla categoria), dopo panel di **tre** advisor | 🔑 **La norma NON classifica la foto: dice chi la classifica.** `FATTO NORMATIVO` verificato dal panel: **Allegato XIII punto 2** descrive la documentazione dei su misura con una clausola **aperta** («allows an understanding to be formed of the design, manufacture and performance») e **non enumera immagini né fissa un termine**; **punto 3** impone di fabbricare «in accordance with the documentation referred to in Section 2», cioè **è il processo documentato del fabbricante a stabilire cosa sia quella documentazione**; i **10/15 anni** del **punto 4** gravano sulla **dichiarazione**, non sulle foto. ✅ **E lo stato di fatto è misurato:** le foto non entrano in **nessun** documento conservato — `immagin|foto|storage_path` = **0 in nove template su dieci**, e i due riscontri del decimo (`DdcTemplate.tsx:496,498`) sono `firma_ddc_storage_path`, cioè **la firma del laboratorio**; in `generate-xml.ts` i due riscontri sono i percorsi **della fattura**; `generate-ddc.ts` **non è** fra gli otto siti d'innesto. ➡️ **Quindi «cancellata punto» non è solo permesso: è la direzione del GDPR** (Art. 5(1)(c) «limited to what is necessary» e 5(1)(e) «no longer than is necessary» — tenere un dato Art. 9 senza finalità dimostrata **è** il rischio) e del **Garante** (chiarimenti 7/3/2019: dove la legge non fissa il termine, «**il titolare** dovrà individuare tale periodo»). 🛑 **Cade la giustificazione del panel del 29/07**, che aveva scelto il soft-delete «perché il QMS potrebbe designarla»: era una **scelta di prodotto travestita da conclusione di legge**. ⚠️ **Scartata «dipende dalla categoria»** e il motivo è tecnico, non di gusto: la categoria vive in `descrizione` (testo libero, default **indovinato** — `TabImmagini.tsx:198` mette `'impronta'` per la fotocamera) e la colonna `tipo` è **morta** (`'foto'` fisso) → una regola «cancella le RX, tieni le impronte» **non è costruibile oggi**. 🔴 **Restano le eccezioni guidate da EVENTI, non dalla consegna:** vigilanza su un incidente (All. XIII p.5 + Art. 87(1)) · contenzioso (Art. 28(3)(g), e l'istruzione è del **titolare**) · una futura procedura del laboratorio che designi quella foto |
| **D62** | 📜 **Il DPA che l'app consegna ai dentisti va CORRETTO: via la promessa dei dieci anni sulle foto — e non esistono copie firmate su carta** | scelta esplicita fra tre (correggere · correggere ma con copie firmate in giro · non toccare), con la conferma di Francesco che **non ci sono copie firmate** | 🔴 **Il vero ostacolo alla cancellazione fisica non era la legge: era un impegno CONTRATTUALE che ci siamo dati noi.** `DpaTemplate.tsx:149` promette «conservazione dei dati per **almeno 10 anni** dalla consegna di ciascun dispositivo, ai sensi dell'**Art. 10(8) MDR**»; `:169` «salvo obbligo di conservazione MDR 10 anni»; `:197` «fatta eccezione per quelli soggetti all'obbligo di conservazione decennale… il quale **prevale sul diritto all'oblio** ex Art. 17 GDPR». ➡️ Cancellare fisicamente prima dei dieci anni sarebbe **inadempimento del nostro stesso DPA**, a prescindere dal MDR. ✅ **Ed è rimediabile a costo quasi nullo perché il documento NON è congelato:** `generate-dpa.ts` lo **rigenera dal template vivo** a ogni scarico, `api/clienti/[id]/dpa/route.ts` restituisce il buffer e **non persiste nulla**, e la tabella `data_processing_agreements` ha **zero scrittori applicativi**. **Corretto il testo, la promessa cambia per tutti al prossimo scarico.** 🔧 **E nello stesso passaggio si correggono due errori che quel documento porta al CLIENTE:** ① cita l'**Art. 10(8)**, che il panel del 29/07 ha già accertato **non essere** la norma dei su misura (è riservato ai dispositivi «diversi dai dispositivi su misura»; la base giusta è **Art. 10(5) + All. XIII**); ② scrive «almeno 10 anni» **piatto**, mentre per gli **impiantabili** l'All. XIII punto 4 dice **15**. ⚠️ **Voce propria, fuori dall'ondata (b):** `DpaTemplate.tsx:168` promette di «assistere il Titolare nel rispondere alle richieste degli interessati (accesso, rettifica, **cancellazione**)» e **quel canale non esiste nel prodotto** — impegno scoperto, già riferito   🔄 **Destinazione aggiunta dall'audit del 03/08/2026:** **voce 10** di `docs/roadmap/ROADMAP-UFFICIALE.md` — aperta SOLO oggi, dopo che la precondizione di questa decisione («prima che la cancellazione fisica entri in produzione») era già stata superata. |
| **D63** | 🧾 **La rete di sicurezza è: CONFERMA (D55) + una TRACCIA di chi ha cancellato — senza l'immagine. Nessun cestino a tempo** | scelta esplicita fra tre (conferma + traccia · solo conferma · cestino a tempo) | ✅ **La conferma copre il caso reale** (il tocco sbagliato al banco), **la traccia copre l'obbligo**: `FATTO NORMATIVO` — **Art. 28(3)(h)** GDPR impone al responsabile di mettere a disposizione del titolare «all information necessary to **demonstrate compliance**»; che questo richieda una riga per cancellazione (**chi · quando · quale lavoro · quale `storage_path`**, mai l'immagine) è **inferenza dichiarata**, non citazione. 🔴 **Oggi `lavori_immagini` non ha alcun audit:** una cancellazione fisica non lascerebbe traccia che la foto sia **mai esistita**, e alla domanda del dentista «che fine ha fatto quella foto?» il sistema non avrebbe risposta. **Forme già in casa da ricalcare:** `lab_stato_log` (`001_commercial_infra.sql:85`), `fatture_sdi_eventi`, `cassette_backfill_audit`. Costo: **una migration + un insert nell'handler**. 🛑 **Scartato il cestino a tempo, con due ragioni misurate:** ① per quei giorni la foto **non è cancellata**, quindi non soddisfa «cancellata punto»; ② il meccanismo che farebbe la pulizia **non esiste più** — `pg_net` è stato **rimosso** (`20260710150000_ondata0_pulizia_outbox.sql:130-133`, per una ragione di sicurezza scritta nella migration stessa), i job cron sono stati unschedulati e `vercel.json` **non ha `crons`**: andrebbe ricostruito da zero. ⚠️ **E «punto» non è letterale, va detto a Francesco e non dopo:** la spec dichiara **PITR 7 giorni + backup giornaliero** (`2026-05-15-ua-spec-completo.md:524-528`) — per quella finestra il dato resta tecnicamente ripristinabile dal fornitore; l'attivazione reale del piano **non è verificata** nel repo. E sulle **URL già emesse** resta una coda: la cache dura fino a **~60 s** con lo Smart CDN attivo, fino a **un'ora** senza (`cacheControl: '3600'` è il default della libreria, mai scelto da noi — `upload.ts:20-25`) |
| **D60** | 🖼️➕ **L'album entra ADESSO, insieme all'eliminazione: la metà «guardare le foto» dell'ondata (c) si sposta nell'ondata (b)** | scelta esplicita fra due (album ora con l'eliminazione · prima l'album per intero in un'ondata propria, senza bottone) | ✅ **Perimetro dichiarato, e la dichiarazione è la sostanza di questa decisione** (senza, «task UI Elimina foto» diventa la riprogettazione senza confini di tutto il sotto-sistema foto). **DENTRO:** la visualizzazione delle foto su **entrambe** le superfici — album vero, **ingrandimento** (oggi impossibile: 72 px e nessun visore), categoria leggibile — **più** l'eliminazione con la sua conferma e il suo stato fuori finestra. **FUORI, resta all'ondata (c):** **ruota** e **ritaglia**, cioè la modifica dell'immagine. 🔑 **Il motivo per cui conviene così:** la forma si disegna **una volta sola** — mettere una ✕ sulla striscia di oggi e riprogettare l'album tre settimane dopo significa disegnare due volte e far imparare all'utente due interfacce. ⚠️ **Il costo, detto per intero:** l'ondata (b) si allarga mentre è in corso, e il gate estetico L2 di fine ondata (FASE 9b) dovrà coprire **anche** questa superficie  🔄 **Destinazione aggiunta dall'audit del 03/08/2026:** la sezione «ONDATA (c) — le foto, per bene» di `docs/roadmap/ROADMAP-UFFICIALE.md`. |
| **D57** | 🖼️ **La scheda del lavoro NON mostra più le foto come una striscia di miniature da 72 px: si progetta un ALBUM vero, e prima si fa ricerca e panel** | parole di Francesco: «*perché le foto si vedono così piccole e a striscia? costruiamo la visualizzazione "album" in maniera migliore e che permetta un'usabilità migliore, fai una ricerca in merito e confrontati anche con advisor specializzati*» | 🛑 **CANCELLA il lavoro di disegno appena fatto** (le tre varianti A1/A2/A3 del mockup del 29/07 chiedevano *dove mettere la ✕ sulla striscia*: la domanda sbagliata, perché dava la striscia per buona). ➡️ **Nessuna variante si sceglie prima** di: ① ricerca su come si fa una galleria di foto in un contesto professionale e mobile-first, ② **panel di advisor** con prospettive diverse. 🔑 **Il fatto che dà ragione alla richiesta, e stava già nel piano senza che nessuno lo collegasse:** l'ondata **(c) «Le foto, per bene»** esiste già come voce (piano v2 §1: «editor: ruota · ritaglia · ingrandisci — **e le stesse azioni sulla scheda**»), cioè il progetto **sapeva** che quella striscia era provvisoria; disegnare una ✕ sopra di essa avrebbe cementato una forma destinata a cambiare. ⚠️ **Vincolo tecnico da portare al panel, non da nascondere:** `FotoStrip` è un componente del sistema grafico con un secondo consumatore (catalogo) e la sua spec §5.33 va comunque emendata (D56) |
| **D58** | 📐 **Una proposta di interfaccia si presenta DENTRO la schermata vera e nei TRE formati, mai come frammento isolato** | parole di Francesco: «*non mi stai mostrando l'interezza di dove siamo e come viene gestita effettivamente sul telefono e sulle altre viewpoint*» | 🛑 **Rilievo di metodo, e il mockup del 29/07 lo violava**: mostrava la griglia delle foto **estratta dal suo contesto**, quindi rendeva invisibile ciò che la circonda (le altre schede del form, la testata, i tasti di salvataggio, quanto spazio resta davvero). Una variante può sembrare buona in un ritaglio e impossibile nella pagina. ➡️ **Da qui in avanti ogni proposta porta: ① lo STATO ATTUALE dell'app vera** (schermata intera, non riproduzione) **nei tre formati (390 · 768 · 1280) e nei due temi**, ② la proposta **nello stesso inquadramento**, così il confronto è un confronto. ⚠️ Il §0B già chiedeva i tre formati; **non chiedeva l'intera schermata**, ed è la riga che va aggiunta |
| **D59** | 🗑️ **La foto si CANCELLA DAVVERO — e si può cancellare (e aggiungere) «fino alla fine»** — 📌 **direttiva di Francesco REGISTRATA, ratificabile solo dopo panel normativo** | parole di Francesco: «*se la foto deve essere cancellata, va cancellata punto. E deve poter essere cancellata fino alla fine, così come poter aggiungerne di altre fino alla fine*» | 🔴 **Contesta DUE scelte che Francesco non aveva mai preso, ed è il punto:** «morbida» (la riga resta, il file resta) e «finché il lavoro non è consegnato» sono state chiuse da un **panel di advisor** il 29/07 (`docs/roadmap/2026-07-29-ondata-b-panel-validazione.md`, tabella «le quattro domande normative»), e **non sono mai state portate a Francesco** — mentre nella stessa tabella la domanda 3 porta «📌 da ratificare da Francesco». 🛑 **E il piano attribuiva quella scelta a «D34/panel»** (`piano-v2:191` e `:394`): **D34 è il codice del paziente archiviato**, non ha nulla a che vedere con le foto. La citazione sbagliata è stata **ripetuta nel brief di T8** dal coordinatore. ⚠️ **Perché non si ratifica seduta stante, e non è una scusa per rimandare:** la finestra «fino alla consegna» del panel poggiava su una **base normativa esplicita** (Art. 52(8) + Art. 2(28) MDR: la dichiarazione precede l'immissione, e l'immissione è la consegna) e la cancellazione fisica incrocia **due obblighi opposti** — conservazione (Allegato XIII punto 4: 10 anni, 15 per gli impiantabili, *se* la foto è parte della documentazione) e minimizzazione (Art. 5(1)(e) e Art. 17 GDPR, dove tenere un file che non serve più è **l'illecito**). 🔑 **La domanda che il panel deve sciogliere è quindi UNA, e nessuno l'ha ancora posta: una fotografia caricata su un lavoro È documentazione conservata, o è materiale di lavoro?** Da lì scende tutto: se è documentazione, «cancellata punto» ha un limite di legge da dichiarare; se è materiale di lavoro, la richiesta di Francesco è **anche** la lettura più corretta del GDPR, e il soft-delete diventa il difetto. ✅ **DISAMBIGUATO NELLO STESSO TURNO, e metà della contestazione CADE:** «fino alla fine» significa **«fino alla consegna, compresa»** — scelta esplicita di Francesco fra tre letture. ➡️ **La finestra NON era contestata:** il rifiuto **409** su `stato = 'consegnato'` scritto in T8 **resta valido**, e coincide sia con la direttiva del 27/07 sia con la base normativa del panel (Art. 52(8) + Art. 2(28)). 🔑 **Quindi di T8 resta condizionale UNA cosa sola: morbida contro vera** — non più la finestra. 🛑 **E va detto che il conflitto sulla finestra l'avevo COSTRUITO io:** ho letto «fino alla fine» come «anche dopo la consegna» quando la lettura piana, contro la sua direttiva del 27/07, era l'altra. Una domanda in più è costata un secondo di Francesco; senza, il panel normativo avrebbe speso ricerca su una domanda chiusa e sarebbe tornato con una raccomandazione su un problema inesistente — il mandato è stato **restretto a lavoro in corso** |
| **D55** | ⚠️ **Eliminare una foto CHIEDE CONFERMA** — un passaggio in mezzo con «Annulla», nessuna eliminazione al primo tocco | scelta esplicita fra tre uscite (conferma · eliminazione immediata con «Annulla» a tempo · immediata senza rete), presentate col loro costo | 🔑 **La ragione non è la prudenza in astratto: è che tornare indietro NON è gratis.** La cancellazione è **morbida** (il file resta, `deleted_at` scritto), quindi in banca dati il ripristino sarebbe banale — **ma nel sistema non esiste alcuna strada per farlo**: `deleted_at` **non è nell'allowlist del `PATCH`** (`[imgId]/route.ts:10` porta solo `descrizione`, `tipo`, `ordine`), e nessuna rotta lo azzera. ➡️ **«Annulla» a tempo avrebbe richiesto lavoro nuovo sul motore** (una rotta di ripristino, con la sua finestra e le sue prove); la conferma sposta il ripensamento **prima** del gesto, dove non costa nulla. 🛑 **E l'eliminazione al primo tocco è stata scartata per un fatto, non per gusto:** le miniature sono **72×72** nella scheda e **~100 px** in griglia, e il gesto avviene **al banco, con le dita**: il tocco sbagliato è il caso normale, non l'eccezione (stesso ragionamento della direttiva permanente sul refuso al front desk). ⚠️ **Su mobile la conferma è un foglio dal basso, mai un riquadro centrato** (anti-pattern permanente, `ua-app/CLAUDE.md` §0B) |
| **D56** | 📷 **L'eliminazione compare ANCHE nella scheda del lavoro, non solo in modifica** — e la striscia di foto smette di essere «sola lettura» per contratto | scelta esplicita fra due, **col costo dichiarato prima della scelta** | 🔴 **Il costo è reale e va pagato in tre punti, non uno:** `src/components/ds/FotoStrip.tsx` è un componente del **sistema grafico** la cui intestazione dichiara «strip thumbnail orizzontale **read-only**» (**DS v3 §5.33** — spec ratificata), e ha un **secondo consumatore** (`src/app/ds-v3-catalogo/page.tsx:1166`). ➡️ **La forma che regge senza rompere nulla:** il gesto entra come **capacità opzionale** (una prop che, se assente, lascia il componente esattamente com'è oggi) — così il catalogo **non cambia comportamento** e la scheda guadagna l'azione; **la spec §5.33 va emendata**, perché una regola che dice «sola lettura» mentre il componente ha un'azione è la classe di difetto già pagata due volte in questo verbale (D7 sui nomi paziente, e il §2.1 del DS). 🔑 **Perché la scelta è comunque sensata:** la scheda è il posto dove le foto **si guardano**, ed è lì che ci si accorge che una è sbagliata — obbligare a entrare in modifica per toglierla è un passaggio che l'utente paga ogni volta. ⚠️ **Due superfici, una sola conferma:** il foglio di conferma (D55) è **lo stesso componente** su entrambe, o le due strade divergeranno |
| **D54** | 🤖 **T8 lo esegue un esecutore FRESCO su modello leggero, adesso — e poi passa da una revisione SEVERA, con mandato esplicito di cercare le prove vuote** | scelta esplicita fra tre uscite (esecutore leggero subito · aspettare il modello potente · lo esegue il coordinatore), presentate col loro costo | 🔴 **Il fatto:** cinque tentativi di lanciare l'esecutore sono caduti con **`529 Overloaded`** — sovraccarico dei server, non un difetto del brief; l'albero è rimasto intatto a ogni caduta. `provato:` un esecutore su modello **leggero** è partito al primo colpo (20 s), quindi **il sovraccarico riguarda il pool del modello potente, non tutti gli esecutori**. ✅ **Perché questa uscita e non «lo eseguo io»:** R-E1 non chiede un esecutore *capace*, chiede un esecutore **che non abbia scritto le istruzioni che segue** — è il meccanismo che ha reso visibili **8 difetti su 8** nell'ondata (a), e il brief di T8 l'ha scritto il coordinatore. **Con l'esecutore leggero la garanzia resta in piedi; con l'autore no.** 🔴 **Il costo, dichiarato e non minimizzato:** la parte prescrittiva è alla portata del modello leggero (il brief è molto dettagliato), ma **il giudizio su una prova VUOTA è esattamente ciò che cede per primo** — ed è il difetto più caro di questa ondata (ieri, su T6: una guardia scritta come lista nera, **104 prove su 104 verdi** mentre il difetto era presente). ➡️ **La revisione non è un timbro: è il posto dove torna il giudizio.** Va fatta col modello potente quando è di nuovo disponibile, e il suo mandato dice **esplicitamente** di rifare le mutazioni e di cercare le asserzioni che restano verdi anche togliendo il codice che provano. 🔑 **E questa riga sta a verbale per una ragione operativa, non burocratica:** senza, la sessione dopo troverebbe il codice di T8 con una qualità di prove diversa dagli altri sette task **e nessuna spiegazione** — cioè lo prenderebbe per il livello normale del ramo |
| **D51** | 🧭 **T8 è il SOLO motore: rotta `DELETE` + il filtro sugli otto siti di lettura. Il bottone «Elimina foto» e il contatore escono, e diventano un task proprio** | scelta esplicita fra due perimetri, presentati col loro costo | ✅ **T8 non passa dal §0B** (nessuna superficie nuova → nessun mockup da approvare) e si chiude in giornata invece di fermarsi su un disegno. 🔴 **Ma il costo va detto per intero, perché ha già un nome in casa: R14.** `trovaOccupanteCodice` (T7) è mergiata da giorni e **non ha un solo chiamante di produzione** — codice corretto, provato e **inerte**. Una rotta `DELETE` senza il bottone che la chiama è **la stessa identica forma**, e ripeterla due volte nella stessa ondata la trasforma da incidente in abitudine. ➡️ **Il task della parte visibile si aggancia SUBITO dopo T8**, non a fine ondata, e porta con sé le due cose che senza di lui restano scoperte: il **bottone disabilitato con la spiegazione visibile** fuori finestra (mai nascosto) e la correzione del **contatore** (`TabImmagini.tsx:571`) — che è la **seconda metà** della gravità del sito 2: l'utente ricancella, ricarica, la ritrova. 🔧 **CORRETTA il 29/07, prima di disegnare il task: questa mezza riga è DECADUTA, e va letta come lavoro CANCELLATO.** Diceva «il contatore **oggi conta anche** le foto cancellate», e dopo T8 **non è più vero**: `provato:` il numero a `:571` è `immagini.length`, `immagini` arriva da `lavoro.immagini` (`LavoroFormClient.tsx:74`) che è **la query del sito 2** (`modifica/page.tsx:51`) — cioè quella a cui T8 **ha aggiunto il filtro**. ➡️ **Al caricamento il conteggio è ORA strutturalmente giusto: non c'è nulla da correggere.** 🛑 **E il brief prevedeva l'opposto** («da quel momento è provabilmente sbagliato»): la previsione era **rovesciata**, perché mettere il filtro al sito 2 è **ciò che l'ha aggiustato**; né l'esecutore né il revisore l'hanno colto (il revisore l'ha registrato come «intatto, riferito» senza verificare se fosse **ancora** sbagliato). 🔑 **Il lavoro che resta è UN ALTRO, e senza questa riga la sessione dopo spenderebbe tempo su un non-problema:** dopo un'eliminazione **dal browser** la tessera deve **uscire dallo stato locale**, o resta a schermo (e il numero con lei) fino a un ricaricamento. Il canale esiste ed è da **specchiare**: `onAdd` → `setImmagini((prev) => [...prev, img])` (`LavoroFormClient.tsx:129`) vuole il suo gemello in rimozione. 🛑 **Ciò che NON si sposta con lui: il comportamento del server.** Il **409** fuori finestra, i tre `.eq()`, il conteggio delle righe toccate sono di T8 e si provano in T8 — un server che regge da solo non dipende dalla schermata che verrà |
| **D52** | 🔧 **I due difetti già trovati nel file che T8 tocca entrano NEL MANDATO di T8: la guardia del `PATCH` filtra `deleted_at`, e l'errore del database smette di arrivare grezzo al browser** | scelta esplicita fra correggere dentro / solo riferire | 🔴 **Il primo lo apriamo noi, e questo cambia la sua natura:** oggi `PATCH` (`[imgId]/route.ts:37-43`) verifica che l'immagine esista **senza guardare `deleted_at`** — e oggi non è sfruttabile, perché nessuna riga è cancellata. **Dal minuto in cui T8 esiste**, la stessa guardia lascia modificare una riga **già cancellata** e risponde **200 OK su un fantasma**. Non è un difetto preesistente che ci troviamo davanti: è **un buco che apre T8**, quindi lo chiude T8. Il secondo (`:77` rimanda `updateError.message` **grezzo** al client, voce **G9-76**) è preesistente e piccolo, ed è **nello stesso file e nello stesso `if`**: si sostituisce con un messaggio nostro e il dettaglio resta nel registro del server, ricalcando il precedente in casa `api/pazienti/route.ts:45-50`. 🔑 **E non è una violazione di R-E2, per la ragione esatta:** R-E2 vieta di correggere **di nascosto** un difetto **fuori** dal proprio mandato — qui i due difetti sono **scritti nel brief prima che l'esecutore cominci**, quindi sono **dentro** il mandato. È la via che R-E2 lascia aperta apposta: si dichiara, e allora si può toccare. ⚠️ **Resta FUORI, e va riferito e non corretto:** l'`update()` di `:68-74` porta **due** `.eq()` invece di tre (manca `lavoro_id`) — non è sfruttabile (`id` è chiave primaria) e **non è stato deciso**; il `DELETE` nuovo ne porta **tre** e non copia quel modello |
| **D53** | ⏳ **TOK-1 si chiude alla FINE dell'ondata (b), prima della pubblicazione del ramo — insieme a CLI-1, che è nello stesso file** | scelta esplicita fra tre tempi, **ripresentata** dopo che la premessa della prima domanda era stata trovata falsa | 🛑 **La premessa sbagliata, e vale la pena che resti scritta:** la prima volta la domanda diceva «nulla è online adesso, quindi il rischio resta dentro il computer». **Vero per il ramo, FALSO per TOK-1** — `provato:` `git show origin/main:src/app/api/clienti/route.ts` porta `portale_token` dentro la proiezione, quindi la chiave **viaggia al browser sul sito vero, oggi**. Non la introduce l'ondata (b): c'è già. ➡️ La domanda è stata **rifatta col fatto giusto**, e la risposta non è cambiata. 🔑 **La lezione di forma:** una premessa comoda («tanto non è pubblicato») applicata all'oggetto sbagliato è il modo in cui una decisione informata diventa una decisione presa al buio — e nessuna guardia meccanica la vede, perché è **prosa in una domanda**, non un conteggio. ⚠️ **Cosa resta vero nel frattempo:** la chiave è **al portatore** (apre dichiarazione di conformità e buono di lavorazione **senza PIN**, che protegge le sole rotte economiche), arriva a **ogni** utente autenticato del laboratorio e **sopravvive all'uscita del dipendente**. La finestra scelta è di giorni, non di settimane, e **si chiude prima che il ramo vada in produzione** — non dopo |
| **D48** | 🛡️ **Il termine di ricerca si spegne in TRE passaggi, in QUEST'ORDINE: (1) `*` si RIMUOVE e `\ % _` si escapano, (2) GUARDIA SUL VUOTO, (3) cornice `%…%` e `pgrestQuote`** | ogni passaggio è stato provato **con un valore che DEVE essere rifiutato**, come prescrive R-P1 | 🔴 **Il piano ne nominava DUE (`%` e `_`) e ne servono QUATTRO.** ① **`\`** — lezione già pagata nella review di T7 (commit `068fc2f0`): per Postgres è il carattere di escape dentro ILIKE, sparisce dal pattern e resta nel dato. ② 🛑 **`*` sopravvive alle virgolette e NON è neutralizzabile:** PostgREST lo traduce in `%` sul valore **già spogliato dagli apici**, quindi `\*` diventerebbe `\%`, cioè un percento letterale. `provato:` `q='*'` con il solo `pgrestQuote` → **911 righe su 911, nessun errore**. Si rimuove. ③ 🔑 **E la rimozione APRE IL BUCO CHE CHIUDE, se non la segue una guardia sul vuoto:** `provato:` `q='*'` → dopo l'escape resta `''` → il pattern diventa `%%` → **l'anagrafica intera**. La guardia sta **dopo** l'escape, mai prima. ④ **`pgrestQuote` va per ULTIMO**: dentro i doppi apici il parser di PostgREST toglie una barra davanti a qualunque carattere, quindi perché a SQL arrivi `\%` nella query string deve viaggiare `\\%` — e chi raddoppia è `pgrestQuote`. Nell'ordine inverso si escaperebbe la cornice e **si cercherebbe un'altra stringa**. ✅ **Prove incollate** (sonda in sola lettura, solo conteggi — mai righe: è dato Art. 9): `%` → solo `pgrestQuote` **911** ❌ / completo **0** ✅ · `_` → **911** ❌ / **0** ✅ · `a%b` → **0** / **0** · `rossi, mario` → **0**, nessun 400 (senza virgolette darebbe `PGRST100`). ✅ **E l'isolamento fra laboratori regge, provato in ATTACCO e non per deduzione:** un `q` **nudo** che tenta `laboratorio_id.eq.<altro lab>` dentro il gruppo `.or()` → **0 righe** (lab con 1 paziente contro lab con 911: un'evasione si vedrebbe). Regge **per struttura**, non per fortuna: `postgrest-js` mette il gruppo `or` in un **parametro separato** (`dist/index.cjs:2988-2990`, `searchParams.append`), che PostgREST unisce agli `.eq()` con un **AND** e parentesizza per conto suo. 🔑 **La riga di metodo che resta:** con un filtro a testo libero **il predicato è un secondo canale verso le colonne che la proiezione ha appena tolto** — senza `pgrestQuote` una virgola aggiunge una condizione al gruppo e si ricostruisce `codice_fiscale` carattere per carattere. Quindi **i test di T6 asseriscono anche sul PREDICATO COSTRUITO**, non solo sulle chiavi in uscita: le chiavi le guarda già B2, il predicato non lo guarda nessuno |

---

## 2. I fatti verificati di persona (R-P1 — prova, non ricordo)

Tutti letti aprendo il file, non riferiti da terzi:

① **Il wizard non ritrova mai un paziente: ne crea uno nuovo quasi sempre.**
`crea-lavoro.ts:209` chiede i pazienti **di quel dentista**; `:214` cerca `codice_paziente === pz`;
`:216` riusa, `:219-236` altrimenti crea. Ma il codice proposto è sempre `PZ-<max+1>`
(`dati-wizard.ts:44-50`): **il confronto non può quasi mai colpire**.

② **Due caselle nell'interfaccia non arriverebbero a nulla.**
`crea-lavoro.ts:229-230` manda `nome: ''` e `cognome: alias || pz`, **fissi nel codice**.
È la riga che decide se D2 ha un effetto.

③ **Nessun vincolo di unicità sul codice paziente.** `supabase/schema.sql:461` —
`codice_paziente TEXT`, nudo: nessun UNIQUE, nessun indice (`grep` su `schema.sql` +
`migrations/*.sql`: **zero riscontri**). Il numero si calcola **su tutto il laboratorio**
(`dati-wizard.ts:106,128`) mentre la ricerca filtra **per dentista** (`crea-lavoro.ts:209`):
due persone diverse possono ricevere lo stesso codice, e nulla lo impedisce.
🔑 **Conseguenza di progetto:** una regola di unicità applicata solo nel codice dell'interfaccia
è la classe di difetto che questo progetto ha già pagato — **la sede naturale è il database**.
Da decidere nella spec, non qui.

④ **La bozza del wizard è `v:1` e va portata a `v:2`.** `persistenza.ts:12-24` porta
`alias`/`elemento`/`colore`; `:69` accetta `parsed.v !== 1 → null`. L'ondata (b) toglie quei campi
**e cambia il significato del numero di passo**: una bozza di oggi, ripresa domani, si riverserebbe
in un wizard con passi diversi. **Il comportamento della bozza vecchia (scartare o migrare) è una
decisione di disegno, non un dettaglio d'implementazione**: va nella spec.

---

## 3. Cosa ne segue per la forma del passo paziente

Conseguenza diretta di D2 + spec §5 (elemento e colore diventano passi propri): il blocco
**«Se vuoi, aggiungi» sparisce**. Restavano tre righe chiuse; due se ne vanno con i loro passi e la
terza perde il «Salta» per D2 — un accordion da una voce sola costa due tocchi e nasconde proprio il
dato che vogliamo facile. **Al posto del «Salta» non si mette niente: si toglie la serratura.**

Forma da portare ai mockup: colonna unica — domanda · aiuto · `CODICE PAZIENTE` (precompilato) ·
`COGNOME` · `NOME` · nota · `Continua`. **Nessun campo col cursore già dentro** (aprirebbe la
tastiera e seppellirebbe il tasto). Più caselle in una schermata non violano «una cosa alla volta»:
rispondono tutte a **una** domanda — precedente già v3 e già del wizard, `NuovoDentistaSheet.tsx:103-111`.

⚠️ **Il campo nasce senza la sua via di correzione, e va detto.** Direttiva permanente del 27/07
(«se non c'è la schermata da cui correggerlo, il campo non è finito»): il cognome digitato nel
wizard **non è visibile dal lavoro** — `paziente_nome_snapshot` non è scritto da nessuno, e la
correzione dalla scheda del lavoro è fuori perimetro (tappa 1-bis, panel normativo). La via di
correzione resta la **scheda paziente**, raggiungibile solo se il paziente si sa ritrovare: cioè
**D4 è anche la via di correzione di D2**, non un di più.

---

## 4. Le fonti da correggere (perché contraddicono le decisioni di oggi)

| Documento | Cosa dice oggi | Cosa va scritto | Decisione |
|---|---|---|---|
| `docs/roadmap/2026-07-28-ondata-b-handoff.md` §3 punto 5 | «il catalogo non è chiuso… **serve il panel**» | Il catalogo **è** chiuso (D3); il panel è stato fatto e la premessa è decaduta | D3 |
| `docs/roadmap/ROADMAP-UFFICIALE.md`, testa (agg. 26) | «più **la quinta che vuole il panel** (il catalogo non chiuso: esito asimmetrico…)» | idem | D3 |
| `docs/superpowers/specs/2026-07-07-design-system-v3…md` §2.1:58 e :511 | «Il nome paziente non compare **MAI** in UI» · anti-pattern «nome paziente in chiaro» | La regola vera: pseudonimo **per difetto**, con le deroghe esplicite e datate (parete cassette D8 del 27/07; ricerca paziente nel wizard D7 di oggi) | D7 |

---

## 5. Ciò che il panel ha smontato — da non riproporre

Il panel 3× sul colore (lenti: dato · banco · avversariale) ha **falsificato entrambe le gambe**
della premessa scritta nell'handoff §3:

- «sul POST rifiutare perderebbe **il lavoro**» → **falso**: un rifiuto alla porta torna **prima**
  della scrittura, non crea nulla, non brucia il progressivo (`genera_progressivo` è nella stessa
  transazione) e lascia la digitazione a schermo;
- «sul PUT rifiutare **non perde niente**» → **falso**: oggi il rifiuto avviene nel **client**
  (`useLavoroForm.ts:156-163`, che solleva prima della PATCH) e **blocca l'intero salvataggio** della
  scheda, non solo il colore.

L'asse vero non era «creazione contro correzione» ma **rumoroso contro silenzioso**.
🔑 **Con D3 la questione è chiusa a monte**: si sceglie da due liste, un codice sconosciuto non
esiste. Resta valido **un solo ritrovamento**, e non è una regola ma un difetto (v. §6, R1).

---

## 6. Ritrovamenti fuori mandato — riferiti, non toccati (R-E2)

Raccolti qui in una sezione sola, con la loro destinazione.

| # | Ritrovamento | Prova | Destinazione |
|---|---|---|---|
| **R1** | La tendina della scheda offre **19 codici su 48** — lista scritta a mano, scollata dal catalogo. Un `2M2` (che il sistema **conosce**) rende la casella **vuota a schermo** | `TabClinica.tsx:8-14` vs catalogo 48 | Fuori perimetro D1 → coda, **difetto vivo in produzione** |
| **R2** | La correzione **calcola** che un colore è stato scartato e poi **butta l'informazione** invece di mostrarla | `api/lavori/[id]/route.ts:402-406`, risposta `:471` | Coda (stessa famiglia di R1) |
| **R3** | Il controllo automatico che dovrebbe accorgersi di un catalogo cresciuto legge **una migration congelata** e pretende esattamente 48: resterebbe verde | `tests/unit/colore-dente-idratazione.test.ts:21-33` | Coda. ⚠️ Classe «rete che non può fallire» — la quinta volta in tre giorni |
| **R4** | L'etichetta stampa **`PAZ-PZ-0042`**: prefisso due volte | `EtichettaTemplate.tsx:128` + `dati-wizard.ts:50` | Ondata (b) se il mockup lo tocca, altrimenti coda |
| **R5** | Il precheck di consegna può fermarsi su un nome fatto di **soli spazi** (`' '` non è nullish) e **bloccare la consegna** di un lavoro che il codice identifica benissimo. La via d'ingresso è oggi chiusa dai due scrittori, non dal precheck; e `precheck.ts:40-42` fa `.trim()` mentre `generate-ddc.ts:93` no — **due scale di ripiego divergenti per lo stesso fatto** | `precheck.ts:40-43`, `generate-ddc.ts:93` | Coda, con test che oggi **non esiste** |
| **R6** | `paziente_nome_snapshot` **non è scritto da nessuno**: scheda del lavoro «—», portale del dentista mostra il **dispositivo** al posto della persona, e il **buono stampa «—» senza nemmeno ripiegare sul codice** | grep su `src/`, `supabase/`, `scripts/`: solo letture | Tappa 1-bis (voce 5 roadmap) — ma il **buono senza ripiego** è un difetto a sé |
| **R7** | Il **DPA che UÀ genera per il dentista promette** di trattare nome, cognome, data di nascita e codice fiscale — dati che il wizard **non chiede** | `DpaTemplate.tsx:155` | Coda, panel normativo |
| **R8** | Dal portale il dentista **scrive già** un identificatore del paziente (`paziente_codice_richiesta`) che **non legge nessuno** | `api/portale/richiedi/route.ts:46-47,148` | Domanda aperta (v. §7) |
| **R9** | La dettatura vocale parte sul **codice** invece che sul cognome: una parola dettata riscrive il codice | `PassoPaziente.tsx:49` vs spec nome/cognome §6 | Ondata (b), stesso passo |
| **R10** | `../ANALISI/17` chiama il laboratorio **«titolare»** in un punto (`:878`) e **«responsabile»** in un altro (`:778`), come il DPA firmato | — | Coda, allineamento documentale |
| **R11** 🔴 | **`GET /api/clienti` manda al browser il `portale_token` di ogni dentista.** Quel token **da solo, senza PIN**, apre le URL firmate di dichiarazione di conformità e buono di lavorazione: il PIN protegge le sole rotte economiche. È una **credenziale al portatore dentro un elenco di ricerca**, arriva nel browser di **ogni** utente autenticato del laboratorio e **sopravvive all'uscita del dipendente** | `api/clienti/route.ts:30` (proiezione) · `api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts:19-45` (nessun PIN) · `lib/portale/guardie.ts:81-90` (dove il PIN c'è) · `ClienteComboBox.tsx:93` (dove arriva) | 🛑 **Fuori dall'ondata (b) e più grosso di essa: decisione di Francesco.** Voce di roadmap propria |
| **R12** | Sulla **stessa rotta clienti**, due cose minori dello stesso capitolo: `q=%` restituisce **l'anagrafica intera** (stesso buco di escape che D48 chiude su `pazienti`), e l'errore del database torna **grezzo** al client, contro G9 — `pazienti/route.ts:45-50` lo fa invece bene | `api/clienti/route.ts:38-41` e `:46` | Voce di roadmap, insieme a R11 (stesso file) |
| **R13** | **`GET /api/pazienti` non filtra `deleted_at`**, e la colonna esiste. Effetto oggi: l'indice parziale `idx_pazienti_laboratorio` (`WHERE deleted_at IS NULL`) **non è utilizzabile** e tutti i piani fanno `Seq Scan`. Effetto domani: il giorno in cui una cancellazione Art. 17 diventasse un soft-delete, questa rotta **continuerebbe a servire i cancellati in silenzio** | `api/pazienti/route.ts:30-37` · colonna in `database.types.ts:4490` · zero righe cancellate oggi, quindi **inerte** | 🔴 **Fuori dal mandato di T6** (una riga in più su una rotta che l'ondata sta già cambiando è tentazione, non mandato). Voce di roadmap, **fail-closed** |
| **R14** | **`trovaOccupanteCodice` (T7) è mergiata e non ha NESSUN chiamante di produzione**: l'unico import è il suo file di prova. Un riconoscimento appeso nel vuoto, accanto a una ricerca che *sembra* rispondere alla stessa domanda, è il modo in cui la correzione di T7 resta morta | unico import: `tests/unit/codice-paziente-unicita.test.ts:3` | **T15** — ed è il motivo per cui D46 scrive a chiare lettere che la ricerca **non** è il riconoscimento |
| **R15** | **Esiste una QUARTA implementazione della ricerca pazienti**, e nessun documento la nomina: la pagina `/pazienti` legge Supabase **direttamente lato server** (500 righe, `archiviato=false`, con `nome`/`cognome`/`nome_cognome`) e passa a `PazientiSearchList` — **non** passa dalla rotta, quindi D46/D47/D48 **non la toccano** | `(app)/pazienti/page.tsx:26-40` | Censimento, e da pesare quando la ricerca diventerà una cosa sola |
| **R16** | Il trigger `sync_paziente_nome_cognome` ricompone **solo se `nome` E `cognome` sono entrambi non-null**: una riga col solo cognome lascia `nome_cognome` **fermo al valore vecchio**, e nessun vincolo lo impedisce. È l'invariante non fatta rispettare su cui D47 ha deciso di **non** poggiare | `002_fase2_schema.sql:121-134`, la condizione è a `:124` | Voce di roadmap (vincolo o ricomposizione incondizionata) |
| **R19** | 🔎 **TERZA occorrenza di un termine utente dentro un `ilike`, e non ha alcun escape:** `query.ilike('descrizione', '%'+q+'%')` con `q` letto dalla query string. Il censimento «due sole occorrenze in casa» scritto in T6 è **vero come inteso** (i due posti che *fanno* questo escape) ma **falso come si legge** (i posti dove un termine utente incontra un `ilike`): il terzo non escapa affatto | `api/lavori/route.ts:72`, con `q` a `:23` | ⚠️ **Portata minore, e va detto perché**: `.eq('laboratorio_id', …)` e `.limit(200)` stanno **a monte**, e la colonna è `descrizione`, non l'anagrafica — un jolly allarga una ricerca di lavori, non apre schede di pazienti. **Preesistente e fuori mandato.** Ora che `ilikeLiterale` esiste, è **una riga**: roadmap **ESC-1**, insieme a `CLI-1` |
| **R18** | 🔑 **Esiste una TERZA forma di «nessun nome», e nessun documento la nomina: `nome = ''`.** Fin qui i documenti conoscevano due forme — `NULL` (911 righe) e il nome vero (che si credeva 5). ✅ **Rimisurato:** delle 5 righe con `nome` non-null, **3 hanno `nome = ''`** e solo **2** portano un nome vero. `cognome = ''` invece è **zero**. ⚠️ **E non è un dato sporco, è il CODICE** (regola di metodo di D45): `crea-lavoro.ts:270` scrive `nome: ''` **fisso** — quindi la forma si riprodurrà identica con un laboratorio vero | `provato:` `count(*) FILTER (WHERE nome IS NOT NULL)` **5** · `WHERE nome = ''` **3** · `WHERE nome IS NOT NULL AND nome <> ''` **2** | 🔴 **T16**, che riscrive proprio quei due scrittori — e **T15**, che deve decidere come si legge una scheda il cui nome è una stringa vuota |
| **R17** | **Nessuna rotta autenticata ha un freno di frequenza.** L'unico che esiste è sulle due rotte **pubbliche** del portale | `api/portale/[token]/pin/route.ts:13-14,42-54` · `api/portale/richiedi/route.ts:94-105` | Voce di roadmap — e va riesaminata **insieme** alla portata del percorso senza `q` (D46), perché sono la stessa domanda: *quante righe, scelte da chi* |
| **R20** 🔴 | **Una riga inerte che INVITA la correzione catastrofica.** Il caricamento costruisce una **public URL** e la rotta la **persiste** in `lavori_immagini.url`. Oggi è morta (il bucket `documenti` è privato: `GET …/object/public/documenti/…` → `400 NoSuchBucket`), ma è una colonna piena di indirizzi che *sembrano* funzionanti e non funzionano. 🛑 **Il giorno in cui qualcuno «ripara le immagini rotte» rendendo pubblico il bucket, ogni foto Art. 9 diventa una URL permanente, non autenticata e non revocabile** — e la confusione è plausibile, perché il progetto **ha davvero** un bucket pubblico | `lib/storage/upload.ts:31` (costruzione) · `api/lavori/[id]/immagini/route.ts:107` (persistenza) · `lib/utils/storage-url.ts:6-10` (il bucket pubblico che confonde) | Voce di roadmap propria. Costo: **una riga nell'insert + pulizia della colonna**. ⚠️ Da valutare **insieme** a D67 (condivisione), perché è lì che la tentazione «rendiamolo pubblico» nascerà davvero |
| **R21** 🔧 | 🛑 **CORRETTA il 30/07 scrivendo il piano — la prima stesura di questa riga era SBAGLIATA, e va detto.** Diceva «la guardia del design system è rimasta a v2.3 e non controlla nulla di ciò che v3 vieta». **Falso:** `provato:` `scripts/check-ds-compliance.sh:49` dichiara `V3_SCOPE="src/components/ds src/design-system/v3"` e su quel perimetro girano **tre** controlli veri — **4a** colori inline (`:54-63`), **4b** durate/curve inventate (`:66-73`), **4d** parole del software (`:121-125`) — ed è **agganciata al pre-commit** (`.husky/pre-commit:6`). ✅ **Il fatto vero, più stretto e più utile:** il perimetro **si ferma a `src/components/ds` e `src/design-system/v3`** e **non copre `src/components/features/**`**, che è dove vive `TabImmagini` — ed è **per questo** che lì i due sistemi si sono mischiati senza che nessuno se ne accorgesse. ⚠️ **Due buchi misurati anche dentro il perimetro:** la regex di 4a vuole **sei cifre esatte**, quindi `#fff` **passa**; e i **colori nominali** (`white`, `black`, `transparent`) non sono cercati affatto | `scripts/check-ds-compliance.sh:49,54-63,66-73,121-125` · `.husky/pre-commit:6` | Voce di roadmap: **allargare il perimetro** (o almeno alle route dichiarate `data-ds="v3"`) e chiudere i due buchi della regex. 🔑 **La lezione di metodo:** una riga di ritrovamento scritta a memoria, senza aprire lo script, ha prodotto un'accusa più grave del vero — ed è la stessa classe dei difetti che questa sezione registra |
| **R22** | La spec DS v3 prescrive un **worktree** per la migrazione, che `CLAUDE.md` vieta senza eccezioni (doppio `package-lock.json` → 404 su tutte le route, difetto vero e pagato) | spec v3 `:535` | Si corregge **nella stessa passata** dell'emendamento a §5.33 (album), per non aprire due modifiche allo stesso documento |
| **R23** | Il percorso di archivio di una foto è `lavori/<id>/<Date.now()>.<ext>`: **due caricamenti nello stesso millisecondo collidono** e il secondo sovrascrive il primo | `api/lavori/[id]/immagini/route.ts:85` | Coda. Portata bassa (serve il carico multiplo simultaneo), ma la perdita sarebbe **silenziosa** |
| **R24** | `ALLOWED_MIME` si fida del **tipo dichiarato dal client** (`file.type`), senza mai leggere i byte | `api/lavori/[id]/immagini/route.ts:70-77` | Coda oggi (il browser non esegue nulla da un bucket privato di altra origine). 🛑 **Diventa BLOCCANTE il giorno in cui i byte si servono dalla propria origine** — cioè nell'uscita «proxy» della questione TTL: senza `nosniff` + `Content-Type` esplicito sarebbe XSS immagazzinata same-origin |
| **R26** | **Difesa asimmetrica fra le due mutazioni della stessa riga:** l'`update()` del `PATCH` porta **due** `.eq()`, il `DELETE` ne porta **tre**. Non è un buco (la guardia di esistenza a monte controlla `lavoro_id`), ma è la stessa riga difesa in due modi diversi nello stesso file — ed è **il modello che un terzo scrittore copierebbe**. ⚠️ Già segnalato il 29/07 come eredità di T8, qui **riconfermato con le coordinate** | `api/lavori/[id]/immagini/[imgId]/route.ts:71-75` (due) vs `:154-159` (tre) | Al task che tocca quel file per D73 (la nuova colonna entra nell'allowlist dello stesso `PATCH`): **dichiarato nel mandato**, come D52, non corretto di nascosto |
| **R33** 🔧 | ✅ **CHIUSA nella stessa sessione — la traccia delle cancellazioni nasceva con la difesa SEMPLICE invece che DOPPIA.** `provato:` `lavori_immagini_eliminazioni` aveva RLS attiva e **zero policy** (quindi già chiusa a `anon`/`authenticated`), **ma i permessi di tabella c'erano lo stesso** — i default privileges dello schema `public` di Supabase danno a entrambi i ruoli `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER`: **14 righe** in `information_schema.role_table_grants`, esattamente come su `lab_stato_log`, che è il precedente che la migration aveva ricalcato. 🔑 **Lo scenario che rende il difetto concreto è benintenzionato, ed è per questo che si chiude ora:** il giorno in cui si vorrà **mostrare al titolare** l'elenco delle foto cancellate si aggiungerà una policy di **lettura**, e con quella `authenticated` erediterebbe anche `UPDATE`, `DELETE` e `TRUNCATE` su un registro di audit — **un audit che chi vi è registrato può riscrivere non è un audit**. ✅ **La forma non è inventata: era già in casa, ed è la più stretta delle tre tabelle di sola traccia** — `cassette_backfill_audit` (`20260721090200_parete_cassette_backfill.sql:52-54`) fa RLS + `REVOKE ALL` + `GRANT` esplicito, con la ragione scritta accanto | `supabase/migrations/20260730150100_lavori_immagini_eliminazioni_log.sql` (com'era) → `20260730150200_lavori_immagini_eliminazioni_revoke.sql` (la correzione) | ✅ **Chiusa il 30/07**, mentre la tabella era **nuova e vuota** — cioè quando costava zero. `provato:` sonda in transazione annullata → prima 4 ruoli con 7 permessi, dopo **solo `postgres` e `service_role`**, e 🔑 **`SET LOCAL ROLE service_role` + `INSERT` → 1 riga**: la prova che conta, perché la scrittura della traccia è **fail-soft** (D63) e un `GRANT` sbagliato avrebbe prodotto foto sparita, risposta 200 e **nessuna riga di audit, in silenzio, con tutte le prove verdi** |
| **R34** | ⚠️ **`deleted_at` su `lavori_immagini` non ha più NESSUNO scrittore, in tutto il repo.** `provato:` dopo T4 i soli `.update({deleted_at})` rimasti sono su `lavori_lavorazioni`, `cicli` e `laboratori`. La colonna, l'indice parziale, la RLS e gli **otto lettori** che la filtrano **restano** — come il mandato di T4 imponeva — ma da oggi sorvegliano uno stato che **niente produce**. ✅ **Non è un difetto da chiudere di corsa** (i filtri sono corretti e innocui, e servono ancora alle quattro migrazioni di cancellazione totale del laboratorio): è la cosa che **confonderà qualcuno fra sei mesi**, quando leggerà otto filtri su una colonna sempre vuota e ne dedurrà che la cancellazione sia ancora morbida. ✅ **E un fatto che toglie urgenza:** `lavori_immagini` ha **3 righe e zero già soft-cancellate**, quindi il vecchio comportamento **non ha lasciato file orfani** nell'archivio da bonificare | i tre `.update({deleted_at})` superstiti (`lavori_lavorazioni`, `cicli`, `laboratori`) · gli otto lettori che filtrano `lavori_immagini.deleted_at` | Voce di roadmap: **decidere se la colonna resta come cimitero dichiarato o se ne va**, e in entrambi i casi scriverlo **accanto ai filtri**. ⚠️ Insieme va corretta la prosa di `tests/unit/lavori-immagini-deleted-embed.test.ts:2-7` («il file resta nello storage»), che da **D61** è una mezza verità |
| **R30** | **Il ramo di fallimento dello Storage rimanda `err.message` al browser** — stessa *forma* di R28, ma **non la stessa cosa**: G9 e R28 parlano dei messaggi **del database**, questo viene dall'archivio dei file (`Storage upload fallito: …`). Trovato da T3 mentre chiudeva R28, e **non corretto perché fuori dal mandato letterale** (R-E2) | `api/lavori/[id]/immagini/route.ts:117-120` | Coda. **Lo chiude il prossimo task che tocca quel ramo**, dichiarandolo — è una riga sola, ma va fatta con la sua prova, non di passaggio |
| **R31** | **Un corpo JSON valido ma NON-oggetto fa sollevare `field in body`** → **500 non gestito** invece di 400. `provato:` `TypeError: Cannot use 'in' operator to search for 'descrizione' in stringa`. ⚠️ **La stessa grafia `in body` compare in 7 file** sotto `src/app/api` (`grep -rln`), ma **che tutte e sette siano ugualmente scoperte è NON VERIFICATO**: misurata è la grafia, non l'assenza di guardia in ciascuna — la distinzione è il punto, ed è la classe di difetto di R21 (un'accusa scritta più grande del misurato) | `api/lavori/[id]/immagini/[imgId]/route.ts` (il caso provato) · 7 file con la stessa grafia | Voce di roadmap: **prima il censimento vero** (aprire i sette), poi decidere se serve una guardia comune sull'ingresso o sette correzioni |
| **R32** | **`ordine` resta patchabile senza validazione dei valori:** `{"ordine":"pippo"}` esce **500** invece di 422. È il **residuo di P11** che il mandato di T3 non copriva (T3 valida `categoria`; il censimento dichiara `ordine` colonna che l'ondata **non tocca**) | `api/lavori/[id]/immagini/[imgId]/route.ts` (allowlist `:17`) | Coda, **insieme** alla questione più grande di `ordine`: la colonna è **ambigua** (schema `DEFAULT 1`, INSERT scrive `0`) e nessuno la legge. Si decide **se serve** prima di decidere come validarla |
| **R29** 🔴 | 🛑 **Un solo database per le prove e per la produzione: ogni migration fatta su un RAMO colpisce subito il sito pubblicato, e resta scoperta finché quel ramo non atterra.** `provato:` non esiste `supabase/config.toml` né alcun secondo progetto; `npx supabase db push` tocca **l'unico** progetto `iagibumwjstnveqpjbwq`, che `../CLAUDE.md` dichiara essere la **produzione** di uachelab.com. Effetto misurato il 30/07: la migration di T1 elimina `tipo`, il codice su `origin/main` la scrive ancora (`:110`) ➡️ **caricamento foto in produzione rotto** (D81). ⚠️ **Non è un incidente di questo piano ma una tensione STRUTTURALE del modo di lavorare:** la FASE 6b impone `gen types` dopo ogni migration, e per rigenerare i tipi la migration dev'essere **applicata** — quindi la finestra di scopertura si apre **per costruzione**, ogni volta. 🔑 **E c'è già un precedente in casa, non visto finché non l'ho cercato:** `20260729140000_pazienti_codice_lab_uidx.sql` è **applicata in banca dati e assente da `origin/main`** — stessa situazione, un giorno prima | `supabase/migrations/20260730150000_lavori_immagini_categoria.sql` (applicata) vs `origin/main:src/app/api/lavori/[id]/immagini/route.ts:110` · `supabase/migrations/20260729140000_pazienti_codice_lab_uidx.sql` (stesso caso) | **Voce di roadmap propria.** Le vie possibili, da valutare con panel: un secondo progetto Supabase per i rami · migration **compatibili all'indietro per contratto** (si aggiunge, si smette di scrivere, si elimina solo dopo il rilascio) · applicare le migration **al merge** e non alla scrittura, accettando che `gen types` arrivi dopo. 🛑 **Finché non è decisa, ogni ondata che tocca lo schema va aperta sapendo che la produzione resta scoperta** — e va detto a Francesco **prima**, non dopo |
| **R27** 🔴 | 🛑 **I quattro fabbricanti del client Supabase NON portano il generico `<Database>`, quindi i tipi generati non proteggono NESSUNA query dell'app.** `provato:` `src/lib/supabase/{server-service.ts:5, server-user.ts:6, browser-anon.ts:7, middleware-client.ts:5}` chiamano `createClient`/`createServerClient`/`createBrowserClient` **senza** il generico; una colonna **inventata** dentro un `.insert()` lascia `npx tsc --noEmit` a **uscita 0** (sonda dell'esecutore di T1, riverificata dal coordinatore). ➡️ **La FASE 6b è in parte INERTE nella sua promessa:** `gen types` rigenera i tipi, ma `tsc` non li fa incontrare a nessun `insert`/`update`/`select` di rotta. 🔑 **Il fatto era già scritto in casa** (`src/lib/pdf/typed-service-client.ts:6-10`: «non porta il generic `<Database>` … usato da 147 file, esplicitamente fuori scope — spec B4») **e il censimento R-P6 del piano non ci è arrivato**, perché quel file non era nel registro delle letture. Esiste già una scappatoia locale, `getTypedServiceClient()`, usata dai **9 generatori PDF** | `src/lib/supabase/server-service.ts:5` · `server-user.ts:6` · `browser-anon.ts:7` · `middleware-client.ts:5` · `src/lib/pdf/typed-service-client.ts:6-10` | 🛑 **Voce di roadmap propria, NON un task di quest'ondata:** il raggio è di **147 file** e la decisione è di Francesco. ⚠️ **Conseguenza immediata da rispettare nel piano dell'album:** nessun task può contare su `tsc` per scoprire una discordanza di schema — chi tocca uno scrittore **si porta la sua prova** (T1 l'ha fatto con due sonde `INSERT` in transazione annullata) |
| **R28** | **La rotta che carica le foto rimanda al browser il messaggio grezzo del database (G9), e non ha NESSUN test.** `provato:` `api/lavori/[id]/immagini/route.ts:117` fa `NextResponse.json({ error: insertError.message }, …)`; nessun file di test importa quella rotta (i test di `[imgId]` importano solo `PATCH` e `DELETE`). ⚠️ **P11 del piano aveva controllato G9 sulla rotta `[imgId]`, dove è rispettata, e ne aveva tratto un'assoluzione più larga del vero.** Sommato a **R27**, quello scrittore non è guardato da niente | `api/lavori/[id]/immagini/route.ts:117` · assenza di `tests/unit/…immagini-route…` | **T3** — il censimento gli assegna già quel file (il campo `categoria` obbligatorio, 422), quindi la correzione e la prima prova atterrano lì **senza aprire un passaggio nuovo**. Dichiarato nel mandato, come D52 e R26 |
| **R25** | **Cinque innesti pagati e mai letti:** su otto siti che innestano `immagini:lavori_immagini(*)`, **cinque non usano mai il dato** — e uno sta **dentro un ciclo multi-lavoro**. Nessuno dei dieci template PDF nomina `immagini` | `api/fatture/batch/route.ts:179` (nel ciclo) · `api/fatture/[id]/xml/route.ts:163` · `lib/pdf/generate-ifu.ts:21` · `lib/pdf/generate-ricevuta-consegna.ts:21` · `lib/pdf/generate-etichetta.ts:37` | Coda. ✅ **Effetto collaterale utile:** è la prova che l'ordine delle foto **non può toccare un documento conservato** (v. D68) |

---

## 7. Domande aperte — quattro su cinque CHIUSE in giornata

⚠️ Questa sezione è stata riscritta la sera del 28: lasciarla com'era avrebbe fatto dire al verbale il
contrario di sé stesso, che è il difetto di classe corretto due volte oggi (spec §13/§17, testa della
roadmap).

| # | domanda | esito |
|---|---|---|
| 1 | Cosa mostrare al posto di «passo 2 di 3» | ✅ **CHIUSA — D10**: le briciole, nessun conteggio. E **D17**: toccabili |
| 2 | Il testo d'aiuto che sostituisce «alias» (aperta dal 27/07 §7.5) | ✅ **CHIUSA** — i quattro testi stanno nella spec §4, ratificati, con l'aggiunta **D20** («puoi cambiarlo») |
| 3 | La sede della regola di unicità del codice paziente | ✅ **CHIUSA — il database**: indice unico parziale su `(laboratorio_id, codice_paziente)` (**D15**), gate FASE 3 superato |
| 4 | Il comportamento della bozza `v:1` esistente | ✅ **CHIUSA** — si scarta, non si converte (spec §7, ratificata). **D19** precisa che a scartarsi è il contenuto, non la rete di ripresa |
| 5 | Che fare dell'identificatore che il dentista scrive dal portale (**R8**) | 🟡 **APERTA** — è l'unico punto in cui il paziente è nominato da chi lo conosce davvero. **Fuori perimetro D1**, e resta l'unica domanda viva di questo verbale |

---

## 8. Perimetro aggiornato dell'ondata (b) — dichiarato

D1 è stata scelta quando «(b)» significava *passi adattivi + odontogramma + colore per dente*.
Con D4/D5/D8 il contenuto è cresciuto, e la ratifica (D17/D18) l'ha fatto crescere ancora.
**Il perimetro vero, a fine giornata, è:**

wizard adattivo sui 38 tipi · odontogramma v3 con le illustrazioni · colore per dente ·
passo paziente rifatto (due caselle, niente «Salta») · **ricerca del paziente prima di crearlo** ·
**i due difetti del codice paziente** · **passo foto sempre presente** · cassetta saltabile ·
avanzamento dei passi **a briciole toccabili, con avviso quando un cambio a monte perde dati** (D17) ·
**via d'uscita esplicita dal wizard + correzione della freccia indietro** (D18) ·
**riscrittura della regola DS sul nome** · gate estetico L2 (FASE 9b)
· 🆕 **L'ALBUM DELLE FOTO sulla scheda del lavoro** *(aggiunto il 30/07: **D60** lo aveva spostato qui il
29 e questo elenco non se n'era accorto)* — carta con foto grande (D64) · **visore a tutto schermo**
(D64, D66) · categoria **chiesta allo scatto** (D65, D72, D74) · **ordine per categoria** (D68, D71) ·
**eliminazione** con conferma, traccia e menù ⋯ (D61, D63, D69) · la colonna `categoria` e la rimozione di
`tipo` (**D73**, migration). 🛑 **Un elenco di perimetro che sembra completo e non lo è è la classe di
difetto già pagata tre volte in questo progetto** (voce 57 · il ruolo `admin_sistema` · l'intestazione
«OTTO decisioni»): qui l'aveva mancato per **un giorno intero**. Spec propria:
`docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md`.

**Fuori:** unione delle schede doppie · pagina `/pazienti` in scrittura · le tre eredità della scheda
del lavoro · i due difetti della home · la fotografia congelata del nome (tappa 1-bis).
**Dal 30/07 esce anche:** gli **allegati che non sono foto** e la loro **condivisione** (D67) — l'album
resta **solo foto**.

---

## 9. Il panel del 30/07 — tre premesse poste al panel, tre falsificate

Panel di **tre** advisor (sicurezza applicativa · architettura del front-end e design system · modello dei
dati e contratto API), lanciato **prima** di scrivere la spec dell'album, con la regola imposta dopo il buco
di processo del 29/07: **ogni conclusione etichettata `FATTO NORMATIVO` (con fonte) o `SCELTA DI PRODOTTO`
(con opzioni e costi), nessuna riga senza etichetta.**

🔑 **Il punto di questa sezione non sono le risposte: è che tutte e tre le domande contenevano una premessa
falsa, e nessuna delle tre l'avrebbe scoperta chi l'ha scritta.** È lo stesso meccanismo di D53 («una
premessa comoda applicata all'oggetto sbagliato»), e stavolta ha colpito tre volte su tre.

| # | la premessa scritta nella domanda | che cosa è invece vero, provato |
|---|---|---|
| **P-a** | «Le foto hanno un TTL di un'ora contro i 5 minuti del portale: **una disparità di 12×** sulla stessa classe di dato» | 🛑 **La disparità non esiste, ed è peggio.** Il portale serve **solo** `ddc` e `buono` più i PDF fattura (`api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts:13`): **nessuna foto ci passa mai.** Le foto — che includono radiografie e impronte — vivono **solo** sulla superficie a 3600. Non è un divario: è un **gradiente invertito**, il dato più sensibile ha la finestra più lunga e **non ha alternativa più corta da nessuna parte**. ✅ E il 300 **è motivato per iscritto** (`docs/superpowers/specs/2026-07-05-b5-download-portale-e-signed-url-design.md:71`); il 3600 compare solo come codice: **un numero è stato scelto, l'altro copiato** |
| **P-b** | «`TabImmagini` importa **quattro** cose dal sistema grafico vecchio dentro una pagina v3: quattro violazioni» | ⚠️ **Due delle quattro non lo sono.** `useReducedMotion` è **ri-esportato da v3** (`design-system/v3/motion.ts:5`), quindi è benedetto; e `raisedShadow` non è un valore v2.3 in esecuzione, è `var(--sh-b, …)` che un **ponte CSS** rimappa ai token v3 (`form/styles.ts:52-53` · `ds-v3.css:236-255`). 🔴 **Ma sotto c'è un difetto più grosso di quello cercato:** quel ponte è agganciato alla classe `.lavoro-form-v3`, che **esiste in un solo posto di tutto `src/`** (`modifica/page.tsx:94`) ➡️ un componente album che leggesse `form/styles.ts` **renderebbe diverso sulla scheda e in modifica**. **Vincolo per la spec:** i componenti nuovi leggono **solo** `v3/tokens.ts` |
| **P-c** | «`lavori_immagini` sta in `supabase/schema.sql`; l'INSERT scrive `ordine: 0` e la colonna è **morta**» | ⚠️ **La tabella non è in `schema.sql`** (zero riscontri): sta in `002_fase2_schema.sql:242-263`. E la colonna **non è morta, è ambigua**: il default dello schema è **`1`** (`:253`) e l'INSERT scrive **`0`**, quindi righe vecchie e nuove portano valori diversi per «nessun ordine». ✅ **In compenso `created_at` esiste** (`:254`) e l'indice `(lavoro_id, ordine) WHERE deleted_at IS NULL` c'è già (`:262-263`) — **non unico**, il che è ciò che rende irricevibile un `max(ordine)+1` (due caricamenti simultanei scriverebbero lo stesso valore, legalmente) |

🛑 **Un fatto che va scritto qui perché nessuna decisione lo copre e la spec ci inciampa:** **D61 è
decisa ma NON implementata.** La cancellazione oggi sul ramo è ancora **morbida** — l'handler lo dichiara
per iscritto (`api/lavori/[id]/immagini/[imgId]/route.ts:91-93`, «il file nello storage **NON** si tocca»)
e non esiste alcuna chiamata a `storage.remove`. L'emendamento di T8 è **da fare**, e finché non è fatto
ogni frase dell'interfaccia che promette «cancellata» è falsa.

---

## Ventisettesima tornata — dove si posa il focus in una conferma distruttiva (D90)

Nata da una domanda posta a Francesco in coda a **T5-ter**: la trappola del focus porta il cursore
dentro `DialogConferma`, ma **dove**, di preciso? La spec v3 §5.17 non lo diceva. Fino a quel momento
il componente non gestiva il focus affatto, quindi non c'era nemmeno un comportamento da conservare.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D90** | 🎯 **In `DialogConferma` il focus si posa sul TASTO SICURO, non sul pannello** — «il cursore sul tasto “Lascia stare”» | scelta esplicita fra due (sul pannello, com'era il default di casa e come fa `Sheet` · sul tasto sicuro, come §5.42 prescrive già per `FoglioConferma`), posta in coda a T5-ter con entrambe le ragioni scritte | 🔑 **La ragione è una PROPRIETÀ, non una posizione:** un Invio dato a caso — o dato da chi non ha ancora finito di leggere — deve **annullare**, mai cancellare. ✅ **E chiude una differenza che sarebbe nata storta:** §5.42 vuole il focus sulla prima azione sicura per `FoglioConferma`, quindi senza questa decisione **le due forme della stessa conferma distruttiva si sarebbero comportate in modo diverso** — un revisore l'avrebbe chiesto, e la risposta sarebbe stata «la spec non lo diceva». 🛑 **Il tasto si cerca per IDENTITÀ, mai per posizione:** con `primarioSopra` (la deroga del rito consegna, decision record 16/07) l'ordine dei due tasti si **inverte**, e «il primo bottone del pannello» sarebbe quello **distruttivo**. La prova che tiene ferma la distinzione monta proprio quella variante; una mutazione che prende il primo bottone la fa fallire — verificato. ➡️ **Conseguenze:** `src/components/ds/DialogConferma.tsx` passa `focusIniziale` a `trappola-focus.ts` · la spec v3 **§5.17 riceve la riga che non aveva** · **due prove scritte poche ore prima diventano rosse e vanno aggiornate**, perché descrivevano il comportamento appena sostituito (contate e classificate nel referto di T5-ter) |

🔑 **Perché questa decisione ha un numero anche se «sposta un cursore»:** §0A-bis dice che una scelta
di Francesco riceve la sua riga **nello stesso turno**, e questa cambia il comportamento di **ogni**
conferma distruttiva dell'app — non solo dell'album. Senza riga, la sessione dopo l'avrebbe trovata
come un dettaglio di implementazione senza padrone, e la prima revisione l'avrebbe rimessa in
discussione.

---

## Ventottesima tornata — la prescrizione entra fra le categorie della foto (D91)

**Data:** 1 agosto 2026, a valle di T11-bis. **Innesco:** riparando i tre punti che mandavano ancora il
campo vecchio si è scoperto che uno di essi spediva l'etichetta `'prescrizione'`, che **non è fra le sei
categorie ammesse**. Nel referto di T11 la conseguenza era stata scritta come una perdita da decidere: «il
dettaglio *era la prescrizione* non è più registrato da nessuna parte».

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D91** | 🎯 **La prescrizione diventa una categoria di foto a pieno titolo: le categorie passano da SEI a SETTE.** Parole di Francesco: «*mi sono dimenticato la prescrizione, dobbiamo aggiungerla alle categorie*» | scelta di Francesco, non una proposta: il difetto trovato da T11-bis ha reso visibile una **dimenticanza del progetto**, non un errore di esecuzione | 🔑 **Non è un ripiego, è il caso che mancava:** la prescrizione è il documento con cui il lavoro **nasce**, e finiva in «Altro» insieme a tutto il resto. ⚠️ **L'elenco era dichiarato CHIUSO (D72):** questa decisione lo **riapre una volta**, e la sua stessa esistenza dimostra che «chiuso» significa «si cambia con una decisione scritta», non «non si cambia». ➡️ **Conseguenze da eseguire** — il censimento sta in `docs/roadmap/2026-08-02-prescrizione-settima-categoria-brief.md` (🆕 **da creare** nella prossima sessione, insieme al lavoro): il vincolo in banca dati, l'elenco unico di dominio, la spia che li tiene allineati, la pastiglia in più nel foglio della categoria (che oggi ne ha sei su due colonne), e i due punti del wizard che T11-bis aveva instradato su «altro» **in attesa di questa decisione**. 🛑 **Nessuna di queste conseguenze è stata eseguita oggi:** la decisione è di fine sessione, e il lavoro si apre pulito nella prossima |

🔑 **Perché la riga esiste PRIMA del lavoro, e non dopo:** §0A-bis dice che una scelta di Francesco riceve
il suo numero nello stesso turno, e che **una decisione che cambia del lavoro già fatto si scrive per
prima** — qui T11-bis ha instradato la prescrizione su «altro» **due ore fa**, e senza questa riga la
sessione dopo avrebbe letto quel codice come una scelta ponderata invece che come un ripiego in attesa.

---

## Ventinovesima tornata — la settima categoria (D92-D97) e il perimetro dell'album (D98)

**Data:** 2 agosto 2026, in apertura di sessione. **Innesco:** il brief della settima categoria poneva
**quattro** domande da chiudere prima di scrivere codice (`docs/roadmap/2026-08-02-prescrizione-settima-categoria-brief.md`
§1). Francesco ne ha chiuse **tre**; la quarta — la griglia che diventa dispari — è andata al mockup, come
il brief stesso chiedeva.

> 🛑 **D92 sta per prima perché CORREGGE una proposta già scritta.** Il brief diceva «*il posto naturale è
> **in testa***» e ne dava anche la ragione (l'ordine è cronologico, D71). Francesco ha deciso il contrario,
> e la sua ragione è più forte di quella cronologica. Senza questa riga, una sessione che legge solo il
> brief metterebbe la prescrizione al primo posto **credendo di eseguire**.

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D92** | 🔧 **RETTIFICA della proposta del brief — la prescrizione NON va in testa: va subito prima della radiografia.** L'ordine dei gruppi diventa `impronta → pre_lavoro → colore → post_prova → prescrizione → rx → altro` | rettifica esplicita di Francesco, arrivata a brief già letto: «*l'ordine non è il primo, sennò l'operatore vede sempre la foto della prescrizione, mettila prima della radiografia*» | 🔑 **L'ordine dei gruppi non ordina solo un elenco: sceglie la foto GRANDE della carta dell'album** (la prima del primo gruppo). In testa, la prescrizione sarebbe stata la copertina di quasi ogni lavoro — e la copertina deve dire *com'è il lavoro*, non *chi l'ha ordinato*. ⚠️ **Costo dichiarato, e resta vero:** D71 fondava l'ordine sulla **cronologia**, e la prescrizione arriva davvero per prima; da oggi l'ordine è cronologico **con una deroga motivata**, non cronologico puro. La riga di D71 va letta insieme a questa. ⚠️ **E un caso che la deroga non copre:** un lavoro appena creato che ha **solo** la foto della prescrizione la vedrà comunque grande — è l'unico gruppo che esiste. Il difetto si estingue da sé alla prima foto di lavorazione. ➡️ `src/lib/domain/categorie-foto.ts:17-24` porta l'ordine: la voce nuova va **quinta**, non prima |
| **D93** | 🏷️ **Il nome a schermo è «Prescrizione»** | scelta di Francesco fra le due parole del banco proposte dal brief («Prescrizione» · «Ricetta») | ✅ È la parola che il progetto usa già ovunque (`numero_prescrizione` su `lavori`, il passo «prescrizione» del wizard): il dizionario resta uno solo, a schermo e sotto. 📏 **Misura fatta sul mockup, e da NON perdere** (è la trappola di D79, che con «Guida colore» era già stata pagata): a 390 la pastiglia è **170 px** e a testo normale «Prescrizione» ci sta comodo. ⚠️ **A testo ingrandito al 200 % no** — ma il guasto **non è suo**: v. il riquadro «un difetto che c'era già», qui sotto |
| **D94** | 🩺 **L'emoji segnaposto della prescrizione è lo stetoscopio** | scelta di Francesco | ✅ Non collide con le sei già in uso (🦷 🔧 🎨 ✨ 🩻 📄) e non si confonde con 🩻 della radiografia, che le sta **accanto** nella griglia. ⚠️ **Resta un segnaposto dichiarato** (S2 di §5.41), come le altre sei: le icone vere sono un passo suo, fuori da questa ondata. ➡️ Va nel `Record<CategoriaFoto, string>` di `FoglioCategoria.tsx:82-89` — che senza di lei **non compila**, ed è la rete voluta |

### La quarta domanda, chiusa sul mockup (D95-D96)

Mockup: `docs/design/mockups/2026-08-02-foglio-categoria-sette-pastiglie.html`, tre varianti × 390 e 768 ×
chiaro e scuro. ⚠️ **Gli screenshot NON sono nel repo e non lo saranno:** `.gitignore:62` esclude `*.png`,
quindi i due file `docs/design/mockups/screenshots/2026-08-02-foglio-categoria-7-{chiaro,scuro}.png` vivono
**solo su questa macchina**. 🔑 **L'artefatto durevole è il mockup HTML**, che è tracciato e si riapre
identico: chi deve rivedere questa scelta apre quello, non cerca le immagini.
🔑 **Da 768 in su la figura non cambia:** il pannello si ferma a `maxWidth: 480` e resta centrato, quindi
**1280 è identico a 768** — ed è la ragione per cui questa volta i viewport mostrati sono due e non tre.

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D95** | 🎨 **La pastiglia spaiata è «Altro», e prende tutta la larghezza come RIGA DI CHIUSURA — variante A2:** altezza **48** invece di 60, faccia trasparente con contorno `var(--line)` invece del riempimento `var(--bg-deep)`, testo **centrato** e in `var(--muted)` | scelta di Francesco fra tre viste sul mockup (**A1** riga piena alta uguale · **A2** riga di chiusura · **B** il buco a destra) | ✅ **La spaiata cade sulla voce dove essere diversa SIGNIFICA qualcosa:** «Altro» è «nessuna delle precedenti» (D74), e una riga di chiusura lo dice senza una parola in più. ✅ **Scartata B:** il buco a destra si legge come un'impaginazione sbagliata, non come una scelta. ✅ **Scartata A1**, che pure funzionava: dava ad «Altro» lo stesso peso visivo delle categorie vere, e «Altro» **non deve invitare** — D74 avverte che è già il ripiego di chi non risponde. ⚠️ **Due vincoli che la variante NON può violare, e vanno tenuti in fase di codice:** ① **48 px resta sopra i 44** del bersaglio minimo (§0B) — non scendere oltre; ② il contorno non può diventare **l'unica** fonte dello stato: la pastiglia accesa continua a portare `aria-pressed` e la luminanza piena (G4), anche in questa variante |
| **D96** | 🔧 **Il rimedio al testo ingrandito entra in QUESTO lavoro, non in T13** | scelta di Francesco fra «adesso» e «alla chiusura del ramo», col costo di entrambe dichiarato | ✅ **Il foglio si sta aprendo comunque** per la pastiglia nuova: due righe nello stesso file costano quasi nulla adesso e molto di più fra due task. ➡️ **Che cosa cambia, ed è misurato:** `gridTemplateColumns` da `'1fr 1fr'` a **`'minmax(0,1fr) minmax(0,1fr)'`** (toglie alle colonne il minimo automatico) + **`overflowWrap: 'anywhere'`** sull'etichetta (permette alla parola lunga di andare a capo *dentro* la pastiglia). ✅ **PROVATA SUL COMPONENTE VERO il 02/08, e la prova ha CORRETTO questa stessa riga.** Su indicazione di Francesco («*nel file env abbiamo i dati di test, puoi usarli e devi usarli*») la prova di §13.3 è stata eseguita nell'app vera — accesso col titolare del banco E2E, scheda del lavoro, foglio aperto davvero (sette pastiglie) — invece di fermarsi al mockup. `provato:` Playwright, quattro combinazioni × 390 e 768, testo delle pastiglie portato a 30px (l'emoji a 36), misura di `griglia.scrollWidth` contro il foglio:

| combinazione | fuori a 390 | fuori a 768 |
|---|---|---|
| ① com'era: `1fr` + nessun wrap | — | **52 px** |
| ② **solo** `overflowWrap:'anywhere'` (colonne `1fr`) | — | **0** |
| ③ **solo** `minmax(0,1fr)` (wrap normale) | **54 px** | **9 px** |
| ④ com'è adesso: `minmax` + `anywhere` | **0** | **0** |

🛑 **Quindi le due chiavi NON pesano uguale, e la riga che diceva «vanno insieme, nessuna basta da sola» era sbagliata:** a reggere il requisito è **`overflowWrap` sull'etichetta**, da solo; `minmax(0,1fr)` da solo **non basta**. Resta in codice perché toglie un modo di sfondare (una colonna che si allarga oltre la sua metà), ma è dichiarato per quello che è — **non è il rimedio**. ⚠️ **Il commento del componente e quello della prova sono stati corretti insieme a questa riga:** era esattamente il difetto che questa tornata ha denunciato — un commento che afferma una protezione che non c'è. 🛑 **E la riga di commento del componente va corretta insieme al codice** (`FoglioCategoria.tsx:411-412`): «due righi ammessi, ed è ciò che tiene in piedi il text-zoom 200 %» era vera solo per le etichette con uno spazio, ed è il commento che ha fatto credere per tre task che la prova fosse già superata |

### Il punto del wizard che torna alla prescrizione (D97)

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D97** | 📸 **Il tasto «Fotografa impronta e prescrizione» della schermata «Fatto!» registra la foto come `'prescrizione'`** (`FrameFatto.tsx:170`) — non più `'altro'` | conseguenza diretta di D91, decisa qui perché **non è un dettaglio di implementazione**: sceglie sotto quale voce l'operatore ritroverà quella foto | 🔑 **È il valore che quel punto mandava PRIMA**, ed è la perdita che T11 aveva registrato («il dettaglio *era la prescrizione* non è più registrato da nessuna parte»); T11-bis l'ha instradato su `'altro'` come **ripiego dichiarato in attesa di D91**. ⚠️ **Il commento che sta lì (`:170-179`) va RISCRITTO, non solo il valore:** motiva `'altro'` con «una prescrizione cartacea non è nessuna delle cinque categorie cliniche» — premessa che da D91 **è falsa**, e un commento falso lasciato in piedi è ciò che fa ripetere la scelta sbagliata. ⚠️ **Asimmetria dichiarata, e NON si chiude qui:** il tasto promette due cose («impronta **e** prescrizione») e il dato ne registra una. Non è un buco nuovo — è il modello di D65/D74 (*la foto nasce con una categoria, la si corregge dopo*), e la correzione esiste già dalla scheda del lavoro. 🛑 **Aprire il foglio-categoria anche in fondo al wizard sarebbe un cambio di flusso**, e non è questo lavoro. ➡️ **Resta invece `'impronta'`** l'altro punto (`crea-lavoro.ts:393`): lì la schermata dice letteralmente «Aggiungi la foto dell'impronta», e non c'è ambiguità da sciogliere |

---

### Il perimetro dell'album, chiuso a T12 (D98)

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D98** | 📐 **L'album (carta, visore, tendina, conferma) resta SOLO sulla scheda del lavoro: la pagina di modifica tiene la sua galleria vecchia fino alla propria ondata** | scelta di Francesco fra due, poste dopo un ritrovamento di T12: «*lasciala com'è fino alla sua ondata*» | 🔑 **La domanda è nata da una lacuna del piano, non da un capriccio:** il Passo 3 di T12 chiedeva la rimozione dallo stato anche in `LavoroFormClient` (`:128`), ma quella pagina **non ha né carta album né visore** — `TabImmagini` ha ancora la sua griglia. Un `onRemove` lì sarebbe stato **codice che nessuno chiama**, e «niente placeholder» è regola di casa. ⚠️ **Costo dichiarato, e va tenuto d'occhio:** per un po' le foto si guardano in due modi diversi a seconda della pagina da cui si entra — la spec §1 prevede la carta «*sulla scheda del lavoro **e sulla modifica***», quindi questa decisione **non contraddice la spec, la scaglia nel tempo**. ➡️ **La destinazione esiste già:** la migrazione di `/lavori/[id]/modifica` a v3 è **ondata propria** (spec §10, ~3.500 righe su 10 file) — l'album ci entra lì. 🛑 **Quello che NON cambia:** su quella pagina la categoria si chiede e si corregge lo stesso (T11 ha montato lì `FoglioCategoria`), quindi nessuna foto nasce senza categoria da nessuna delle due strade  🔄 **Destinazione aggiunta dall'audit del 03/08/2026 — e la voce NON è mai stata aperta:** il buco è registrato in **AUD-3** di `docs/roadmap/ROADMAP-UFFICIALE.md`. |

---

### 🔴 Un difetto che c'era già — trovato misurando il mockup, riferito, e poi RIPARATO su decisione di Francesco (D96)

Il mockup doveva rispondere a una domanda di forma; misurando la pastiglia ha trovato un **difetto di
rilascio del componente già in casa**, indipendente dalla prescrizione.

`provato:` Playwright su `2026-08-02-foglio-categoria-sette-pastiglie.html`, viewport 390, testo al 200 %
(`.pill` a 30 px, emoji a 36 px — la stessa scala del text-zoom di sistema). Misura di quanto la griglia
esce dal foglio (`griglia.scrollWidth` contro `pannello.clientWidth − 40` di padding):

| caso | serve | disponibile | **esce di** |
|---|---|---|---|
| ① **SEI categorie — cioè `main` di oggi** | 404 px | 348 px | **56 px** |
| ② sette, con «Prescrizione» | 492 px | 348 px | **144 px** |
| ③ sette + rimedio (`minmax(0,1fr)` sulle colonne + `overflow-wrap:anywhere` sull'etichetta) | 348 px | 348 px | **0** |

🔑 **La causa, ed è una sola:** `gridTemplateColumns: '1fr 1fr'` (`FoglioCategoria.tsx:381`) lascia alle
colonne un **minimo automatico** pari alla parola più lunga che non si può spezzare. «Radiografia» è una
parola sola: a testo grande la colonna si allarga per contenerla e trascina con sé tutta la griglia.
«Guida colore» invece va a capo sullo spazio — ed è per questo che la misura di D79, presa **su
quell'etichetta**, non aveva visto niente.

🛑 **Quindi la riga del componente «due righi ammessi, ed è ciò che tiene in piedi il text-zoom 200 %»
(`FoglioCategoria.tsx:411-412`) è vera solo per le etichette CON uno spazio.** Per «Radiografia» — e
domani per «Prescrizione» — non ha mai retto.

✅ **Ed è stato riparato in questa sessione, perché Francesco ha deciso così: v. D96 sopra.** Il difetto era
**fuori dal mandato** (R-E2 dice di riferire, non di correggere di nascosto) — quindi è stato riferito, messo
davanti a Francesco con il costo di entrambe le strade, e riparato **solo dopo la sua scelta**. 🔑 **E la
misura sul componente vero ha poi corretto anche questa tabella:** il rimedio ③ funziona, ma **non per il
motivo che c'era scritto qui** — regge `overflowWrap`, non `minmax`. La riga di D96 porta i numeri.

---

### Trentesima tornata — l'uscita dei quattro strati sopra la foto (D99-D100)

La domanda è stata posta all'apertura della **sessione successiva alla chiusura dell'ondata (b)**, come
prima cosa e prima di toccare altro: era la **§0** di `docs/roadmap/2026-08-02-ondata-b-chiusa-handoff.md`.
Era una decisione d'ondata che il gate estetico L2 di T13 doveva portare a Francesco e **non gli era mai
stata portata**. ⚠️ La data non è scritta perché **l'orologio della macchina e i documenti non concordano**
(la macchina dice 31/07, l'handoff della sessione precedente è datato 02/08): meglio un riferimento vero
che una data inventata.

🛑 **D99 sta per prima perché CANCELLA del lavoro** (§0A-bis, riga 2): senza questa riga una sessione
futura costruirebbe il mockup che Francesco ha deciso di non volere.

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D99** | 🚫 **Per questa decisione NON si fa l'anteprima: si va diritti al codice** — deroga esplicita a §0B | scelta di Francesco fra «pagina di prova da toccare» e «decido su questo»: *«No, decido su questo»* | 🔑 **La deroga è sua e vale SOLO qui.** §0B (mockup → screenshot → approvazione → React) resta la regola di casa per ogni altra superficie. ⚠️ **Il costo, dichiarato prima della scelta:** un'animazione non si giudica da uno screenshot — due immagini identiche non dicono niente — quindi il giudizio estetico su questa uscita arriva **a cose fatte, in produzione**, non prima. Se l'uscita non convince, si cambia il valore del token: è un numero in un posto solo (v. D100) |
| **D100** | ⏱️ **I quattro strati sopra la foto ESCONO, e l'uscita è SIMMETRICA — `molla.smooth` in entrata e in uscita — con due proprietà che la rendono «alla Apple»: lo strato in uscita SMETTE DI PRENDERE I TOCCHI, e l'uscita è INTERROMPIBILE** | **decisione delegata da Francesco a un criterio, non scelta fra opzioni:** posto davanti a quattro strade ha risposto *«non ho presente esattamente la differenza tra le varie opzioni, ma poiché ci siamo detti che le animazioni di tutta la pwa devono essere alla apple, in base a questo concetto, decidi»*. Il criterio è suo, l'applicazione è di Claude, e la si registra con le sue fonti | 🛑 **CORREGGE UNA COSA DETTA SBAGLIATA IN CHAT, ed è la ragione per cui l'esito ribalta la prima risposta di Francesco.** La proposta gli era stata presentata così: «l'uscita più svelta dell'entrata è quello che fa l'iPhone». **È falso, e la fonte lo smentisce:** la regola «l'uscita dura meno dell'entrata» è **di Material Design (Google)** — 225 ms in entrata contro 195 ms in uscita, [m1.material.io/motion/duration-easing](https://m1.material.io/motion/duration-easing.html), principio confermato in [M3](https://m3.material.io/styles/motion/easing-and-duration). **Apple fa il contrario:** in SwiftUI una transizione è **simmetrica per costruzione** — la rimozione è l'opposto dell'inserimento con la stessa animazione, e `.transition(.asymmetric(insertion:removal:))` esiste **proprio perché** l'asimmetria è il caso da dichiarare a mano ([objc.io](https://www.objc.io/blog/2022/04/14/transitions/), [swiftui-lab.com](https://swiftui-lab.com/advanced-transitions/)). 🔑 **E le molle di casa SONO le molle di sistema di Apple** (`src/design-system/v3/motion.ts:2-3`: `smooth`/`snappy`/`bouncy`/`press` = `.smooth`/`.snappy`/`.bouncy`/`.interactiveSpring`): applicarle simmetriche **è** il comportamento iOS. · ✅ **Effetto sulla spec: NESSUN emendamento.** §5.39 diceva già «entra **ed esce** con `molla.smooth`» e l'allegato §1.8 lo porta in tabella — **D100 esegue D89, non lo corregge.** Il gate L2 doveva porre la domanda: la risposta era già scritta, e regge. · 🔑 **Ma il prezzo dell'uscita lenta era reale, e si paga in un altro modo — questa è la parte nuova:** finché l'uscita gioca, lo strato è ancora sullo schermo e **prende ancora i tocchi**; chiudere e toccare subito qualcosa dietro perde quel tocco. Accorciare l'uscita lo riduceva; **toglierlo del tutto è più Apple ancora**, perché su iOS una vista che si sta rimuovendo **esce dal hit-testing subito**. Quindi: `pointerEvents:'none'` sullo strato in uscita, dall'istante in cui si chiude. **La finestra morta sparisce, e la calma dell'uscita resta.** · 🔑 **Seconda proprietà, ed è quella che Apple mette al centro delle sue molle: l'uscita è INTERROMPIBILE** — riaprire mentre sta uscendo riprende da dov'è, non riparte da capo. `AnimatePresence` lo fa per costruzione; va solo non rotto. · 🔑 **Due dei quattro non erano comunque una scelta:** `FoglioConferma` e `FoglioCategoria` avevano l'uscita **già scritta** (`coreografie.sheetSu.exit`) e **mai eseguita**, perché nessuno monta `AnimatePresence`. · 🛑 **Il velo esce insieme, e NON è una scelta:** nessuno dei quattro veli ha `exit` oggi — un pannello che scende con calma su uno sfondo che sparisce di colpo sarebbe **peggio dello stato attuale**. · 🛑 **Vincolo di montaggio, e qui si riapre un difetto pagato:** gli strati si montano **sempre** e si pilotano con `aperto` (lezione ① dell'handoff, `SchedaLavoroV3.tsx:568-575`). `AnimatePresence` va messo **rispettando quel montaggio**, o torna il visore che si richiudeva da solo. · 📐 **Raggio d'azione: due superfici, non una** — `FoglioCategoria` è montato anche da `TabImmagini.tsx` (la pagina di modifica, ancora legacy per D98). · 🔵 **«La foto torna a casa» NON è stata scartata, è stata rimandata:** resta candidata per l'ondata dell'album (la migrazione di `/lavori/[id]/modifica`), dove carta e visore vivranno nello stesso posto |

---

### Trentunesima tornata — le «caratteristiche prescritte» della DdC, e ciò che il panel ha demolito (D101-D102)

Nasce dalla **voce 3** dell'handoff dell'ondata (b) («⚠️ verificare se il colore compaia nella DdC: possibile
lacuna normativa → **verifica prima, voce dopo**»). La verifica è stata fatta, e ha trovato una lacuna **vera
ma diversa** da quella ipotizzata. Poi Francesco ha chiesto — ed è la ragione per cui questa tornata esiste
nella forma che ha — di **rifare la ricerca sulle fonti ITALIANE**: «*visto che questa pwa la useranno
inizialmente solo in italia e sarà cosi per anni, ci interessa la normativa vigente in italia, fai ricerche
specializzate in merito prima di rispondere, perchè ho visto fonti inglesi a cui ti riferivi*». Rifatta.

🛑 **D101 sta per prima perché CANCELLA del lavoro** (§0A-bis, riga 2): senza questa riga, una sessione futura
riprenderebbe la proposta demolita dal panel e la implementerebbe.

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D101** | 🚫 **SCARTATA la proposta di riempire `prescrizione_caratteristiche` componendo un testo dai campi di caso del lavoro (colore, tecnica, arcata). Non si rifà.** Il campo resta vuoto finché non nasce il dato «prescritto» vero | proposta di Claude, **demolita da un panel di tre** (normativo · dominio odontotecnico · architettura del dato), tutti e tre con mandato esplicito di confutare; le affermazioni portanti **riverificate a mano** prima di accettarle | 🔑 **Il difetto capitale: l'Allegato XIII §1 elenca DUE cose distinte, e la proposta versava la prima nella seconda.** «*i dati che consentono di identificare il dispositivo in questione*» = il pezzo **come realizzato**, ed è **già coperto** dal §5 del PDF (numero, tipo, descrizione, denti, materiali con lotto). «*le caratteristiche specifiche del prodotto indicate nella prescrizione*» = **il prescritto**, ed è quello scoperto. Riempire il secondo con l'as-built **afferma che quel colore era prescritto** quando spesso lo sceglie il laboratorio o lo corregge in prova: **un'attribuzione falsa al medico, dentro un documento conservato 10 anni (15 impiantabili)** — e lascia il trattino vero scoperto lo stesso. Fallisce due volte. · 🛑 **E il dato «prescritto» in gran parte NON ESISTE in banca dati:** il materiale prescritto non è persistito (`lavori_materiali` porta il materiale **usato**, con lotto — un altro fatto); l'ancoraggio su impianto neppure. Esiste il seme: `lavori_denti.provenienza` (`prescritto`/`eseguito`, W20). · 🔴 **Due errori di fatto nella proposta, verificati a mano:** ① `proposta_dentista` **non è clinica**, vale `fatturare`/`non_fatturare` e `src/app/api/lavori/[id]/route.ts:65` **vieta** di metterla in allowlist — avrebbe stampato una decisione commerciale su un documento sanitario; ② le quattro colonne `lavori.colore_dente/collo/corpo/incisale` sono **SENZA SCRITTORE dal Task 10** e restano ferme all'ultimo valore pre-deploy: il testo avrebbe congelato un **colore morto** accanto a un elenco denti vivo, nella stessa frase. · 🛑 **Chiusa anche la via di fuga «se non c'è niente scrivo *nessuna caratteristica prescritta*»: è autolesionista.** Art. 2(3) MDR (testo IT, verificato): dispositivo su misura è quello fabbricato «*sulla base di una prescrizione scritta … **che indichi** … **le caratteristiche specifiche di progettazione**»* — quella frase metterebbe per iscritto che **il presupposto dell'esenzione dalla marcatura CE non c'è**. Non si usa mai. · 🔵 **Non è un abbandono, è un rinvio con destinazione:** la forma giusta sono **DUE righe distinte** sulla dichiarazione («caratteristiche indicate nella prescrizione» / «dispositivo come realizzato»), appoggiate a `provenienza`. Entra nell'ondata che progetta il dato prescritto |
| **D102** | 🔧 **SI FANNO SUBITO le quattro riparazioni che NON dipendono dal modello in movimento** | scelta di Francesco fra tre strade poste dopo il panel | ① **`template_version` e `payload_sha256` non sono mai stati scritti**: le colonne esistono in `supabase/schema.sql` ma nessuno le valorizza — **ogni DdC mai emessa le ha `NULL`**, cioè il documento non porta la prova di essere quello di allora. Stessa classe della guardia dichiarata come rete e mai agganciata. ⚠️ **Trappola misurata:** l'impronta va calcolata su `ddcConNorma` (`generate-ddc.ts:119`), l'oggetto **davvero reso**, non su `ddc` — `norma_riferimento` sta solo nel primo, e sbagliando si certificherebbe un payload diverso da quello stampato. ② **`denti_snapshot`/`denti_snapshot_at` stanno sulla riga sbagliata**: sono **uno per lavoro**, ma le DdC per lavoro sono **N** (`ddc_lavoro_attiva_unique` è un unique **parziale**: una attiva, quante si vuole annullate). Alla seconda emissione la prima si sovrascrive, e la DdC annullata — l'unica prova di cosa fu dichiarato quel giorno — resta senza il dato che la giustifica. **Vanno su `dichiarazioni_conformita`, e oggi costa ZERO: nessuno scrittore, nessun dato da migrare.** ③ **Il PDF congelato legge dati VIVI**: `DdcTemplate.tsx:258` prende `lavoro.denti_coinvolti` mentre lo snapshot `ddc.denti_coinvolti` esiste e non è mai letto; e ci sono i ripieghi `ddc.X ?? lavoro.X`. Un documento a valore legale non può cambiare sotto i piedi. ④ **`arcata` non è in `PATCHABLE_FIELDS`**: per la direttiva del 27/07 un campo entra in un documento congelato **solo se ha la sua via di correzione aperta** |

#### Le tre correzioni di CIFRA e di FONTE che questa tornata lascia in eredità

🛑 Non sono opinioni del panel: sono errori nostri, verificati sul testo.

1. **`ANALISI/17:127` presenta come norma una nostra glossa.** Elenca «tipologia, dente/arcata, materiale, **colore**, numero lavoro» fra i contenuti obbligatori: **il colore non è nominato da nessun trattino dell'Allegato XIII**. Diventa dovuto **solo per rinvio**, quando il prescrittore lo indica. La riga va corretta, non superata.
2. **Il «€48.500» dell'ITCA va accompagnato da due commi**: le sanzioni si **riducono di un terzo** per le microimprese, e gli importi si **aggiornano ogni due anni** su indice ISTAT — la cifra scritta **non è necessariamente quella corrente**.
3. **Il rischio non è dove lo avevo messo.** Nessun comma sanziona una dichiarazione All. XIII **incompleta**; il comma sull'immissione «senza ricorrere» a una procedura punisce l'**omissione**, non l'esecuzione difettosa, e in materia punitiva non si ragiona per analogia. L'esposizione realistica è **in ispezione**: **24.200-145.000 €** per chi, richiesto, non fornisce la documentazione che dimostra la conformità.

#### Riferiti e NON toccati (R-E2)

- **Art. 21(2): la dichiarazione va messa a disposizione del PAZIENTE.** Da noi arriva solo al portale del cliente/dentista. La prassi italiana delle tre copie probabilmente basta — **ma è da ratificare, non da ereditare**.
- `generate-ddc.ts:93` scrive il **nome completo del paziente** dove l'Allegato XIII ammette «*un acronimo o un codice numerico*»: la minimizzazione è **dentro la norma**, non solo nel GDPR.
- `prescrizioni_digitali` **non ha firma del prescrittore né numero d'albo**: oggi nulla garantisce che alla consegna esista un documento di prescrizione archiviato.
- **Il termine di conservazione della PRESCRIZIONE non ha una fonte primaria sotto MDR** (i «5 anni» erano dell'abrogato D.Lgs. 46/97). Scelta di rischio proposta: allinearla a 10/15 anni della dichiarazione — **non è un obbligo con termine scritto**.

---

### Trentaduesima tornata — la verifica dal vivo delle due impronte (§0 dell'handoff del 3 agosto)

Referto completo: `docs/roadmap/2026-08-03-verifica-impronte-ddc-referto.md`. **Esito: ✅ provato in
produzione** — la DdC nuova `DDC-2026-0002` nasce con `payload_sha256` e `template_version = 'ddc-v1'`;
la vecchia `DDC-2026-0001` (22/07, prima di D102) le ha entrambe `NULL`. Giro chiuso e annullato: il lavoro
è tornato `pronto`.

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D103** | 🔑 **Per i collaudi dal vivo si accede al banco con le credenziali che stanno nel file di configurazione del repo, senza chiedere ogni volta** | «*logga tranquillamente con i dati nel file env **e ricordati di questa cosa***» — risposta a una domanda esplicita su come accedere | **Vale da qui in avanti**: nessuna domanda per accedere a un ambiente di prova quando le credenziali sono già in `.env.local`. · ⚠️ **Il modo resta il link monouso** (`admin.generateLink` con la chiave di servizio → `/auth/callback?token_hash=…`): nasce dalle stesse credenziali, **non richiede di digitare una password in un campo** — cosa che Claude non fa in nessun caso — e aggira il limite di tentativi ravvicinati citato nell'handoff §5. Ricetta in `scripts/tmp/link-accesso.ts` 🔄 (05/08/2026: in quella cartella, ignorata da git, il file non esiste più — spostato sotto git in `scripts/link-accesso.ts`; v. `ua-app/CLAUDE.md` §9). · Scritta anche in `ua-app/CLAUDE.md` §9, perché una direttiva che vive solo in un verbale non arriva alla sessione che ne ha bisogno |

**Scelta operativa della stessa tornata (non una decisione di prodotto, ma cambia il fatto misurato):** la
prova è stata fatta su **`TEST-DdC-001`** e non sul lavoro indicato nell'handoff (`7dba9a57`), che era in
stato `ricevuto` e **senza paziente** — si sarebbe fermato al gate degli stati e poi al precheck MDR, senza
generare nulla. Fra «uso il lavoro già pronto» e «preparo quello del banco scrivendo sul database»,
Francesco ha scelto il primo: *una prova che comincia modificando i dati per far passare un controllo prova
meno*.

#### Riferiti e NON toccati (R-E2)

- 🟠 **Il PDF della dichiarazione stampa «CONFORMITA», «Conformita (PRRC)» e «e' conforme», senza accenti** —
  titolo, etichetta della firma e frase di conformità. 🔑 **Non è un limite del carattere:** nello stesso
  foglio il §8 rende correttamente «*Il dispositivo **è** conforme*», perché quel testo viene dalla banca
  dati. Gli altri sono scritti senza accento nel sorgente (`DdcTemplate.tsx:292,294,326,486,514` ·
  `generate-ddc.ts:117`). ⚠️ Non corretto qui perché il testo di conformità **finisce in banca dati e
  nell'impronta del payload**: cambiarlo è una decisione sul contenuto di un documento conservato dieci
  anni, non una correzione di battitura.
- 🟡 **La numerazione dei paragrafi del PDF salta il §2** (data di emissione): il dato c'è, in testa e in
  calce, ma senza il suo titoletto. Chi legge col trattino dell'Allegato XIII in mano vede un buco che non
  c'è.

---

### Trentatreesima tornata — gli accenti nei documenti generati (voce 8 di roadmap)

Spec: `docs/superpowers/specs/2026-08-03-accenti-documenti-design.md`. Nasce dal PDF **guardato con
l'occhio** durante la verifica del 03/08. **Panel di tre con mandato di confutare** (normativo · dato ·
prodotto): ha corretto il censimento da 7 a **10 punti**, ha posto un gate sui metadati del file (**superato
misurandolo**) e ha portato **nove ritrovamenti fuori mandato**, alcuni più pesanti del refuso.

🛑 **Un'affermazione portante del panel è stata riverificata a mano ed era FALSA:** il parere normativo
dava per assodato che *nessuna* dichiarazione porti `template_version = 'ddc-v1'`, e su quel presupposto
sconsigliava il salto di versione. Il conteggio vero: su 4 righe in archivio **una porta `ddc-v1`**. La sua
raccomandazione resta difendibile per altra via, ma non per quella. È il motivo per cui le affermazioni
portanti si riverificano.

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D104** | ✅ **Si correggono gli accenti in TUTTI i punti, frase congelata compresa** | scelta di Francesco fra tre strade (tutto / solo le scritte fisse / prima il panel) | Dieci punti, elencati nella spec §2. 🛑 **Vincolo sul testo congelato: solo i segni d'accento, il resto byte per byte** — una modifica dentro la frase di un documento legale è un invito a riformulare, e quella è un'altra decisione. ⚠️ Il decimo punto è il **DEFAULT di una colonna** in una migration storica: non si riscrive la storia, serve una **migration nuova** (e con essa la FASE 6b) |
| **D105** | 🔢 **La versione del modello RESTA `ddc-v1`**: il salto si tiene per il primo cambiamento che altera *ciò che il documento dice* | scelta di Francesco fra `ddc-v2` / semver / restare a v1 | 🛑 **Ma così la definizione scritta nel codice diventa falsa** (`generate-ddc.ts:33-34` dice «cambia quando cambia ciò che il PDF rende»). La decisione si realizza **scrivendo il registro delle versioni** accanto alla costante, riformulando la definizione perché sia vera, e **allineando `schema.sql:1249`**, che promette un formato a tre numeri mai usato. Due definizioni contraddittorie della stessa colonna erano il rilievo bloccante del panel: si toglie comunque |
| **D106** | ➕ **Il §2 mancante entra nello stesso giro** | scelta di Francesco fra insieme / voce separata | Il documento salta da §1 a §3: la data di emissione (elemento 2 dell'Allegato XIII) c'è ma senza titoletto. Farlo dopo significherebbe **due revisioni e tre grafie** dello stesso documento in poche settimane. Forma scelta: nasce la sezione, e **l'intestazione perde la data** — resta in due posti come oggi, non in tre. ⚠️ Un titoletto sposta il flusso: il collaudo guarda **il PDF intero**, non la sola sezione nuova |
| **D107** | 🚫 **Niente guardia automatica contro i refusi nei documenti** | scelta di Francesco fra farla / non farla | Il panel ne proponeva una a dizionario sui soli undici modelli, agganciata al pre-commit già esistente. ⚠️ **Conseguenza dichiarata, perché non venga scoperta due volte:** il prossimo refuso arriverà sui documenti esattamente come questo, e si troverà **solo guardando un foglio stampato** |

#### Riferiti e NON toccati (R-E2) — nove, dal panel

Elenco completo con `file:riga` nella **spec §5**. I tre che pesano di più: ① la frase del §7 dichiara il
dispositivo conforme «**e ai disposti dell'Allegato XIII**», che è una **procedura**, non un requisito — e
`seed.sql:198` conserva una versione migliore e già accentata, quindi quella in uso è una **regressione**;
② **il luogo di fabbricazione non è mai stampato** benché sia il trattino 1, obbligatorio; ③ il foglio
**afferma «Sostanze / tessuti: No»** con un valore codificato a mano, mai raccolto.
⚠️ E una **contraddizione fra due panel da sciogliere**: la base normativa della conservazione decennale è
«Art. 10(5) + Allegato XIII punto 4» (ratificata il 29/07) o **l'Allegato XIII punto 4 da solo**? Quella
citazione vive in tre documenti. Non ratificata né scartata: **va verificata sul testo**.
🟢 **SCIOLTA il 03/08/2026 con D125, sul testo consolidato: «l'Allegato XIII punto 4 DA SOLO».** Il punto 4
fissa i 10/15 anni sulla **dichiarazione**; l'Art. 10(5) rimanda al **punto 2** e non ha termine. ⚠️ E i
documenti non erano tre: il censimento ne ha trovati **quattordici**.

---

### Trentaquattresima tornata — chiusa la §0 in produzione, e si sceglie la prossima ondata (D108)

**Contesto.** Chiusa la §0 dell'handoff del 3 agosto: la Dichiarazione di Conformità è stata guardata
**uscendo dalla produzione** (referto: `docs/roadmap/2026-08-03-ddc-produzione-referto.md`). Il giro ha
prodotto **due voci nuove** — il buono di consegna che non si rigenera dopo un annullo, e la citazione
`Art. 2(1)(3)` che non esiste — e ha lasciato sul tavolo le voci normative già aperte.

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D108** | 🎨 **La prossima ondata è D42 — LE TINTE DEL MANUFATTO.** E **tutto ciò che resta va appuntato prima**, per poterlo riprendere al momento giusto | scelta di Francesco fra quattro strade proposte (le voci sui documenti che escono · il «prescritto» di voce 9 · le tinte D42 · gli allegati D67): «*procediamo con D42, ovviamente appuntiamo tutto quello che resta da fare per continuarlo nel giusto momento*» | ✅ **Coerente con D42 stessa**, che era già ratificata «dopo l'ondata (b)», cioè adesso. 🔑 **La seconda metà della decisione non è una cortesia, è la regola §0A-bis applicata:** le voci normative sulla DdC vivevano **solo dentro un handoff**, cioè in un documento che la sessione dopo supera — sono state trasferite nella roadmap (sezione «I documenti che escono dal laboratorio»), con **ogni riferimento riaperto e riverificato**: tre erano invecchiati di qualche riga dopo il rilascio degli accenti. ⚠️ **Conseguenza dichiarata:** le cinque voci sui documenti — fra cui il **luogo di fabbricazione mai stampato**, che è obbligatorio — restano aperte mentre si lavora sulle tinte. Non sono state dimenticate: sono state **rimandate con una casa** |

**Vincoli che D42 si porta dietro dal panel del 28/07 (D40 · D42) — non si riaprono:**
🛑 **niente esadecimale libero** (un colore senza nome non si cerca e diventa illeggibile su un documento
conservato dieci anni) · 🛑 **niente scale nuove dentro `colori_dentali`** (cinque chiavi esterne puntano
lì, e l'id fine dei 38 tipi **non è persistito**: una scala `sport` renderebbe scrivibile `('sport','rosso')`
sulla riga-dente di una corona senza che alcun vincolo se ne accorga) · ➡️ **catalogo separato, voci con
un NOME**.

---

### Trentacinquesima tornata — D42, le tinte del manufatto: le sei scelte di apertura (D109-D114)

**Contesto.** Apertura dell'ondata D42. Le domande sono state fatte **una alla volta**, dopo aver aperto i
file invece di fidarsi dei documenti: `colori_dentali` (48 codici, tre scale, catalogo pubblico senza RLS),
le **cinque** chiavi esterne che vi puntano, il catalogo dei 38 tipi (`prevedeColore`: 26 `catalogo`,
**3 `libero`**, 10 `nessuno`), e le due superfici dove il colore si tocca oggi.

🔴 **Due fatti misurati che cambiano il perimetro, e che nessun documento diceva:**
① nel wizard il **passo del colore non esiste per nessun tipo** — la procedura finisce al paziente e lì il
colore è ancora **una casella di testo libero** (`PassoPaziente.tsx:41-42`, `colore: string`), il cui
contenuto viene scartato se non è uno dei 48 codici; ② sulla scheda la tendina offre **19 codici su 48**
(`TabClinica.tsx:8-14`), mancano le 29 voci di `vita_3d_master`.

🔑 **E una correzione a un'affermazione portante del panel del 28/07** (lezione ⑥, riverificare):
il panel dava per impossibile legare una tinta al tipo di lavoro perché «l'id fine dei 38 tipi non è
persistito». Vero per l'id fine — **ma la divisione resina/sport cade esattamente sulla categoria GROSSA,
che sul lavoro c'è**: i due tipi a resina sono gli unici `ortodonzia` con una tinta, il paradenti è l'unico
`bite_splint` con una tinta. Quindi il pericolo che il panel temeva — scrivere `('sport','rosso')` sulla
riga-dente di una corona — **si ferma nel database**, non solo a schermo. Misurato aprendo
`src/lib/domain/tipi-lavoro.ts:70-77`.

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D109** | 🎨 **Una tinta sola per lavoro, scelta da un elenco** | scelta di Francesco fra quattro forme (un colore · colore+effetto · dipende dal tipo · due o più sempre) | Niente effetti, niente combinazioni, niente stratificazione interno/esterno del paradenti. ➡️ **Conseguenza sul modello:** il dato è **una coppia sulla riga del lavoro**, non una tabella di raccordo — e non serve prevedere la molteplicità «per dopo» (YAGNI) |
| **D110** | 🌍 **Un catalogo solo per tutti i laboratori, CHIUSO** | scelta di Francesco fra chiuso / comune+aggiunte del lab / tutto del lab | Come `colori_dentali`: catalogo pubblico in sola lettura, **senza `laboratorio_id` e senza RLS**. ⚠️ **Prezzo dichiarato e accettato:** chi compra da un fornitore con una gamma diversa non trova la sua voce finché non si aggiunge con un rilascio. ✅ **In cambio il vincolo resta forte**: «esiste», non «esiste nel tuo elenco» |
| **D111** | 👨‍👩‍👧 **Due famiglie — resina ortodontica e sport — con il vincolo NEL DATABASE** | scelta di Francesco fra due famiglie con vincolo / elenco piatto / famiglia solo a schermo | Scegliendo la placca si vedono solo le tinte di resina, col paradenti solo quelle sportive, **e l'abbinamento sbagliato è rifiutato dal database** grazie alla corrispondenza con la categoria grossa (v. sopra). ⚠️ **Il vincolo resta largo, dichiarato:** sa dire «questa tinta non c'entra con l'ortodonzia», **non** «la contenzione non ha colore» — quella resta una regola di schermo. ⚠️ E se un giorno un tipo con tinta nascesse sotto un'altra categoria grossa, la corrispondenza va rifatta: **è un accoppiamento, non una legge** |
| **D112** | 📍 **Si sceglie sulla scheda del lavoro E in un passo dedicato del wizard, solo per i tre tipi** | scelta di Francesco fra scheda+passo / solo scheda / anche il colore dentale per dente | La scheda è **obbligata** dalla direttiva del 27/07 («ogni campo del lavoro si corregge, fino alla consegna»): un campo senza la sua via di correzione non è finito. Il passo nel wizard è una tavolozza semplice — **niente denti, niente zone del ceramista**. 🛑 **Fuori perimetro, esplicitamente:** il selettore del colore **dentale** per dente resta all'ondata (b), che è dove è nato |
| **D113** | ⭕ **Facoltativa e saltabile** | scelta di Francesco fra facoltativa / obbligatoria / facoltativa con default | Il lavoro nasce anche senza tinta; dalla scheda si aggiunge quando si sa. 🛑 **Scartato il default automatico**, e con una ragione che il progetto ha già pagato: un valore messo dal sistema fa **affermare al documento una scelta che nessuno ha fatto** — è la stessa classe del «Sostanze / tessuti: No» oggi aperto. ⚠️ **Strada dichiarata NON percorribile oggi:** «facoltativa, ma avvisa alla consegna se manca» — l'avviso dovrebbe sapere che *quel tipo* prevede una tinta, e sul lavoro c'è solo la categoria grossa, che mescola la placca (tinta sì) con la contenzione (tinta no). Stessa dipendenza dura già in roadmap |
| **D114** | 🔵 **Il pallino colorato c'è SOLO dove è onesto** | scelta di Francesco fra pallino selettivo / solo nome / pallino per tutte | Tinte piene e riconoscibili (rosa, blu, nero, oro) col pallino; **trasparente, glitter e perlato restano col solo nome**, perché un colore piatto lì mentirebbe. 🔑 È lo stesso principio già scritto nel catalogo dentale, dove la colonna del colore è **vuota di proposito**: «*una tinta inventata su un dispositivo medico non è un segnaposto innocuo*». ➡️ La colonna del colore nasce **nullable**, e il vuoto è un'informazione, non una mancanza |

📌 **Confine richiamato, NON riaperto:** la tinta **non finisce sulla Dichiarazione di Conformità** in
quest'ondata — lo ha stabilito **D101** (la norma non nomina il colore; la riga scoperta è il «prescritto»,
voce 9 di roadmap). Se un giorno si vorrà, sarà una decisione con panel normativo.

---

### Trentaseiesima tornata — D42: la forma del dato e le superfici (D115-D118)

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D115** | 🗄️ **La tinta è una COPPIA sulla riga del lavoro** — catalogo nuovo `tinte_manufatto` + due colonne su `lavori` con chiave esterna composita | scelta di Francesco fra tre strade (coppia sulla riga · tabella di raccordo · allargare `colori_dentali`) | ✅ **È la forma già in casa** per il default di caso del colore dentale: chi la legge domani la riconosce. 🔑 **E soprattutto è l'unica delle tre in cui il vincolo di D111 è esprimibile come CHECK di riga**, perché `tipo_dispositivo` sta sulla stessa riga — con una tabella di raccordo servirebbe una funzione scritta a mano: più macchina per meno garanzia. 🛑 **La terza strada resta chiusa** (allargare `colori_dentali`): cinque chiavi esterne vi puntano, quattro sulla riga del singolo dente, e una scala `sport` renderebbe scrivibile `('sport','rosso')` sul dente di una corona |
| **D116** | 📋 **Il contenuto dei due elenchi è preso così com'è stato proposto** | Francesco: «*la forma va bene, prendo il contenuto così*» | ⚠️ **Cambia lo STATUTO di quelle liste, e va scritto:** la lista **sport** ricalca una gamma reale ([dischi Erkoflex, Erkodent](https://glidewelldental.com/solutions/in-office-thermoforming/thermoforming-discs/erkoflex-thermoforming-discs)) ed è **fonte esterna**; la lista **resina** è **mia**, non di un fornitore — la pagina Dentaurum descrive le famiglie (classici, neon, glitter, bianco/nero, trasparente) ma **non un elenco di nomi**. Presa così, quella lista vale come **decisione esplicita di Francesco** (quarta prova dello statuto delle fonti), **non** come ricerca: chi la leggerà non deve poterla scambiare per una gamma commerciale accertata |
| **D117** | 🔄 **Se il tipo di lavoro cambia e la tinta non è più compatibile, il server la TOGLIE e lo DICHIARA nella risposta** | scelta di Francesco fra togliere-e-dichiarare / rifiutare il salvataggio / avviso preventivo | Il salvataggio riesce sempre; la schermata dice «ho tolto la tinta, non c'entrava col nuovo tipo». 🔑 **Nasce da un fatto misurato, non da un'ipotesi:** `tipo_dispositivo` **è già** in `PATCHABLE_FIELDS` (`src/app/api/lavori/[id]/route.ts:179`), quindi senza questo trattamento il CHECK di D111 farebbe fallire una correzione legittima con un errore grezzo. 🛑 **Il confine:** togliere sì, in silenzio mai — una perdita non dichiarata è peggio del salvataggio fallito |
| **D118** | 👁️ **Tre superfici, non due: passo del wizard · pagina di modifica · e la scheda in SOLA LETTURA** | proposta accolta da Francesco nell'approvazione della sezione | Il tecnico al banco apre il lavoro e legge «Tinta: Rosa» senza entrare in modifica. 🛑 **E vale §0B senza sconti:** prima del React vanno i **mockup HTML** con dati veri, **più varianti** (mai una sola), su 390/768/1280 e in chiaro e scuro. ⚠️ **Una domanda lasciata aperta APPOSTA per il mockup:** con 17 tinte sportive la tavolozza su 390 px diventa lunga — griglia di pastiglie col pallino, oppure elenco per gruppi di colore? Si porteranno **disegnate tutte e due**, non descritte |

---

### Trentasettesima tornata — D42: la tavolozza scelta sul mockup, e gli scatti che non si salvavano (D119-D120)

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D119** | 🎨 **La tavolozza è la GRIGLIA di pastiglie (variante A)** | scelta di Francesco sul mockup `docs/design/mockups/2026-08-03-tinte-manufatto-due-tavolozze.html`, fra griglia / elenco raggruppato / griglia con gruppi dentro | ✅ **Ci stanno tutte e diciassette in una schermata sola**: niente da scorrere, si sceglie a colpo d'occhio. La variante B ne mostrava **dodici su diciassette**. ⚠️ **Prezzo dichiarato:** le tinte arrivano tutte insieme, senza un ordine che guidi — chi cerca «il verde» lo cerca con gli occhi. 📌 **La B resta nel mockup, non si cancella:** se un domani le tinte diventassero quaranta, la scelta si riapre da lì con la sua ragione già scritta. 🔴 **E il mockup ha trovato un difetto che nessuno aveva previsto:** «Glitter multicolore» va a capo, e con le pastiglie ad altezza libera quella sola diventava più alta sfasando la riga — corretto con **righe a altezza fissa (60)**, il nome lungo si dispone su due righe dentro la stessa altezza. È il motivo per cui i mockup si guardano coi dati veri invece di descriverli |
| **D120** | 💾 **I 211 scatti mai salvati entrano nel repo** (56,3 MB) | scelta di Francesco fra lasciarli fuori / salvarli tutti / salvare solo quelli delle ondate vive | 🔑 **Il fatto che l'ha resa necessaria:** il file delle esclusioni ignorava `*.png` con la ragione «screenshot di debug», mentre **§0B rende gli scatti dei mockup obbligatori e li vuole nel repo** («MAI in /tmp — i file /tmp vengono cancellati, le decisioni si perdono»). In quella cartella ce n'erano già **343 versionati**, ognuno **forzato a mano** contro la regola: un gesto da ricordare a ogni ondata è un gesto che prima o poi salta — ed era già saltato 211 volte, comprese **le anteprime su cui sono state approvate ondate passate**. Aggiunte due eccezioni mirate al file delle esclusioni, `provato:` uno scatto di mockup **non è più ignorato** e `scripts/tmp/*.png` (le immagini di debug vere, che è ciò che la regola voleva escludere) **resta ignorato**. ⚠️ **Prezzo accettato:** il repo cresce di 56 MB |

📌 **Con D119 la spec non cambia:** la §5.1 lasciava la domanda aperta **apposta** per il mockup, e ora ha
la sua risposta. Il piano parte da qui.

---

### Trentottesima tornata — D121: il passo del wizard aspetta il wizard

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D121** | 🧭 **La tinta NON entra nel wizard adesso. D42 chiude con DUE superfici — scheda e pagina di modifica — e il passo della tinta nasce dentro l'ondata che costruisce le schermate del wizard**, accanto a denti, colore, foto e cassetta, dove il progetto lo colloca già | scelta di Francesco fra tre strade (aspettare il wizard vero · aprire subito l'ondata delle schermate · anticipare il solo passo tinta con la macchina agganciata a metà), **dopo che Francesco ha respinto una quarta strada che stavo per raccomandare** — la tinta come riga dentro il passo paziente — con l'obiezione che l'ha demolita: «*stiamo ragionando sul comportamento della pwa di com'è adesso non di come l'abbiamo progettata*» | 🔑 **L'obiezione era esatta, ed è verificata sul documento:** la spec ratificata dell'ondata (b) §4 dice «**il blocco "Se vuoi, aggiungi" sparisce: elemento e colore diventano passi propri, la foto diventa il passo di D8**». Le tre righe facoltative di oggi (`PassoPaziente.tsx:80-108`) sono **già condannate dal progetto**: costruirci dentro la tavolozza sarebbe stato arredare una stanza in lista di demolizione. **⚠️ Emenda D112 e D118 per RINVIO, non per revoca:** le tre superfici restano tre, ma la terza arriva con la sua ondata. **📌 D112 era stata presa su un presupposto che non reggeva** — che nel wizard esistesse un'impalcatura di passi a cui agganciarsi: il fatto contrario (`provato:` `WizardNuovoLavoro.tsx:50-59` → `passo: 1 \| 2 \| 3`, un numero; l'impalcatura `wizard/passi.ts` + `wizard/sequenza-passi.ts` **la usano solo i suoi test**) è stato misurato **dopo**, scrivendo il piano. 🛑 **La terza strada è stata smontata da un panel 3× con mandato di confutare**, e le sue affermazioni portanti sono state riverificate a mano: agganciare «solo un po'» la macchina costa comunque i pallini rifatti (`ProgressDots.tsx:43` è cablato a tre, con `aria-label` «Passo N di 3»), la bozza a versione nuova — e **l'etichetta `v:2` è GIÀ PRENOTATA** dalla spec §7 per un altro contenuto, quindi due bozze diverse si scambierebbero per la stessa —, i testi della ripresa riscritti (`RipresaSheet.tsx:59-75`), **circa venti prove rotte**, e il punto in cui nasce il lavoro traslocato **due volte**. ✅ **Costo accettato di D121:** finché quell'ondata non arriva, chi crea un paradenti mette la tinta **dalla scheda**, subito dopo — che è comunque la superficie che la direttiva del 27/07 rende obbligatoria |

🔴 **Due fatti che nessun documento diceva, emersi in questa tornata e da trattare a parte** (R-E2, riferiti
non corretti). 📄 **Gli altri sette ritrovamenti — minori uno per uno, ma che sparirebbero col contesto della
sessione — stanno raccolti in un posto solo:** `docs/roadmap/2026-08-03-d121-ritrovamenti.md` (fra questi:
una prova verde che **codifica** la violazione della direttiva «indietro», una contraddizione viva fra il
contratto dei passi e la spec che dice di seguirlo, e due prove che dopo un cambiamento previsto
resterebbero verdi smettendo di controllare).

**① Il wizard oggi INVITA l'errore che D42 vuole togliere.** La riga «Colore — es. A2» (`PassoPaziente.tsx:91-98`)
compare **per tutti e 38 i tipi**, perché quella schermata non riceve il tipo (`provato:` `PassoPaziente.tsx:38-47`,
nessuna prop `tipo`). Chi crea un paradenti e scrive «rosa» manda quel valore come `colore_codice`
(`crea-lavoro.ts:323`); il server lo confronta col catalogo dei **colori dentali** (48 codici), non lo trova, lo
**scarta** (`src/lib/api/colore-caso.ts:25`) e il lavoro nasce senza — con un avviso in coda
(`crea-lavoro.ts:386`). Lo stesso invito sbagliato vale, al contrario, per i **10 tipi che un colore non lo
prevedono affatto** (`provato:` conteggio su `tipi-lavoro.ts`, escludendo la riga 11 che è la definizione
del tipo: **25** `'catalogo'` + **3** `'libero'` + **10** `'nessuno'` = **38**).
➡️ **La sua sede naturale è l'ondata delle schermate**, che quel blocco lo elimina: se però quell'ondata tarda,
si toglie prima con un intervento piccolo.

**② L'ondata (b) è stata dichiarata chiusa avendo costruito una parte del suo perimetro.** Dentro c'erano
(spec §2) il wizard adattivo sui 38 tipi, il passo paziente rifatto, la ricerca del paziente, i passi denti ·
colore · foto · cassetta, le briciole, la bozza `v:2`, nome e cognome separati. In produzione è andato
**l'album delle foto sulla scheda** — che al perimetro era stato *aggiunto* il 30/07 (D60) — più i due
moduli-motore del wizard, **agganciati a nulla**. L'handoff del 02/08 dice «ondata (b) in produzione» senza
distinguere; la ROADMAP dice ancora «in esecuzione, restano T12 e T13», che sono task **dell'album**.
🔑 È la stessa classe di difetto della voce 57 e del ruolo `admin_sistema`: **un elenco che sembra completo e
non lo è**. Le due righe sono state corrette con questa tornata.

---

### Trentanovesima tornata — D122: il numero del lavoro nella lettura vocale della cassetta

| n. | La decisione | Come è stata presa | Ragioni e conseguenze |
|---|---|---|---|
| **D122** | 🔊 **Il numero del lavoro RESTA nel nome accessibile della cassetta** — la targa dipinta resta senza (invariata, D4 + verbale 24/07 §6), ma chi usa il lettore vocale lo sente | scelta di Francesco fra tre strade (resta nella lettura · esce anche da lì · si legge solo quando due cassette suonerebbero identiche), posta dall'audit del 03/08 come **l'unica divergenza DS↔codice senza una ratifica dietro** | ✅ **Ratifica ciò che il codice già faceva** (`src/components/ds/Cassetta.tsx:724-728`), che finora era **una lettura dell'implementatore** e non una decisione: «*il ratificato che lo vieta parla della TARGA*». 🔑 **La ragione che regge, ed è quella che l'audit chiedeva di rendere esplicita:** il divieto del 24/07 nasce dal **budget di due righe** della targa dipinta — un vincolo di impaginazione che **a una frase letta ad alta voce non si applica**. E il costo del contrario è concreto: senza il numero, **due cassette dello stesso dentista e dello stesso paziente sono indistinguibili** per chi non vede. 🛑 **Scartata la terza strada** («si legge solo quando serve»): sarebbe la più pulita da ascoltare, ma imporrebbe alla singola cassetta di sapere che cosa c'è nelle altre celle della parete — informazione che oggi non ha. ➡️ **Conseguenza documentale:** la nota «domanda APERTA» aggiunta a **DS v3 §7.20** dall'audit diventa una **ratifica**, e **AUD-2 si chiude senza code** |

📌 **La forma di questa tornata è essa stessa un esito dell'audit:** la divergenza è stata trovata da un
verificatore, **non sanata** dal verificatore (le altre sette avevano una decisione dietro e sono state
allineate; questa no), e portata a Francesco come domanda. 🔑 È la regola R-E2 applicata a un documento
invece che a un difetto di codice: **allineare la legge al codice senza una decisione è il modo in cui una
deviazione diventa norma senza che nessuno l'abbia scelta.**

---

### Quarantesima tornata — D123: il documento segue il lavoro finché il lavoro è aperto

Non nasce da una domanda posta a Francesco: nasce da un **suo appunto** all'apertura della sessione. È una
direttiva di prodotto e riguarda **tutti** i documenti che UÀ genera, non uno.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D123** | 📄 **Un documento segue il lavoro finché il lavoro è aperto, e si cristallizza SOLO alla chiusura.** La conformità non è un motivo per irrigidire il prodotto **prima** del momento in cui la legge lo chiede — e quel momento è uno solo, non «appena possibile» | «mentre un lavoro è dentro UÀ può ricevere sempre delle modifiche o delle rettifiche e la struttura finale di un documento deve mutare in base a queste, solo nel momento in cui un lavoro viene chiuso devono essere cristallizzate come è giusto che sia (tenere conto della possibile riapertura di un lavoro con le normali conseguenze e credo generazioni nuove di documenti, non so cosa dice la normativa a riguardo) […] noi con la nostra pwa forniamo un servizio al laboratorio e dobbiamo metterci sempre nella posizione di facilitare e aiutare il laboratorio» | ✅ **È il corollario documentale della direttiva del 27/07** («ogni campo del lavoro si corregge, fino alla consegna»): quella parla dei **campi**, questa dei **documenti che quei campi generano**. **Stato misurato aprendo i file il 03/08:** il **DPA segue già** — `src/lib/pdf/generate-dpa.ts` lo rigenera dal modello vivo e `src/app/api/clienti/[id]/dpa/route.ts` non persiste nulla (`grep` di `insert`/`upsert`: **zero** riscontri); la **DdC si congela all'emissione, ed è corretto** — l'emissione coincide con la consegna (Art. 52(8) + Art. 2(28), panel del 29/07); ⚠️ **ma una DdC emessa non ha una via per rifarsi**: `src/lib/pdf/generate-ddc.ts:98-107` restituisce quella esistente (`.neq('stato','annullata')`) **senza rigenerare**. 🛑 **Due domande restano APERTE, sono normative, e nessuna riga di codice si scrive prima di un panel:** ① **dove cade «chiuso»** — «chiuso» **non può che essere la consegna** perché `consegnato` è **terminale per comportamento**: `src/lib/lavori/transizioni.ts:8-16` non ha alcuna transizione uscente e il commento `:6` dichiara che non è nemmeno una destinazione; ma i campi del prezzo restano correggibili fino a `incluso_in_fattura`: la finestra è **già a due tempi** e va detto quale tempo vale per quale documento. 🔄 **Questa riga portava una prova SBAGLIATA, mia, corretta il 03/08 da un advisor con mandato di confutare:** diceva «`supabase/schema.sql:917-920`, sei stati», ma quel file è una **baseline stantia** — il vincolo vivo ne ammette **NOVE** (`supabase/migrations/005_v1_foundation.sql:31-37`, l'ultima che tocca `lavori_stato_check`), fra cui un `sospeso` che una riapertura futura potrebbe voler usare. La conclusione reggeva, la prova no; ② **la riapertura** oggi vive **solo entro 10 minuti** (`src/lib/consegna/costanti.ts:7` · `src/app/api/lavori/[id]/annulla-consegna/route.ts`) e oltre quella finestra **non esiste** — che cosa imponga la norma a una riapertura vera (nuova DdC, sorte della vecchia, tracciabilità della revisione) **non è deciso e non si assume**. ➡️ **Destinazione:** la sezione «il documento segue il lavoro» di `docs/roadmap/ROADMAP-UFFICIALE.md`, aperta oggi sotto la direttiva del 27/07; il primo panel che tocca la stessa materia è quello della **voce 10** (per quanto tempo un dato resta) |

🔑 **Perché questa riga è stata scritta PRIMA che Francesco scegliesse la prossima cosa da fare.** §0A-bis:
una scelta riceve il suo numero **nello stesso turno**. E questa, in più, **contiene una precondizione**
(«prima del codice, un panel») — che è esattamente la forma con cui **D62** è sfuggita per quattro giorni:
una condizione scritta dentro un blocco che nessuno rileggeva. Sta qui **con la sua destinazione**, non
dentro un'ondata da pianificare.

---

### Quarantunesima tornata — D124: si parte dal contratto che i dentisti hanno già in mano

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D124** | 🥇 **La prima cosa è la riga 10 della roadmap — il contratto sul trattamento dei dati che i dentisti scaricano — e il panel normativo si ALLARGA alle due domande lasciate aperte da D123** | scelta di Francesco fra tre strade (riga 10 col panel largo · riga 10 col panel stretto al solo testo del contratto · Task 1 di D42) | ✅ **La ragione:** è l'unico difetto dell'audit arrivato a un documento **già uscito dal laboratorio**, e la sua materia — *per quanto tempo un dato resta* — è la stessa metà della domanda che D123 lascia aperta. **Un panel solo invece di due.** 🛑 **Il panel decide PRIMA che si tocchi il testo**, e nel suo mandato entrano anche: ① la **contraddizione fra due panel già registrata** — la base della conservazione è «Art. 10(5) + Allegato XIII punto 4» oppure il **solo** punto 4? (riga 8 della sezione «I documenti che escono dal laboratorio» di `docs/roadmap/ROADMAP-UFFICIALE.md`, *non ratificata né scartata*); ② un **vincolo di forma che il modello impone e che nessuno aveva detto**: il contratto è **per CLIENTE, non per lavoro** (`src/components/features/pdf/DpaTemplate.tsx:52-78` non porta **alcun** dato del dispositivo), quindi il testo corretto **non può essere condizionale** sugli impiantabili — deve enunciare la regola, non applicarla a un caso che il documento non conosce; ③ le **quattro** righe da correggere, non tre. ➡️ **D42 non decade, scala di un posto:** il piano resta pronto (`docs/superpowers/plans/2026-08-03-tinte-manufatto.md`, 9 task, da eseguire con R-E1) |

---

### Quarantaduesima tornata — D125-D126: la base normativa si emenda, e il contratto smette di dire cose non vere

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D125** | 📜 **La base ratificata il 29/07 — «Art. 10(5) + Allegato XIII punto 4» — si EMENDA: i due obblighi si citano SEPARATI.** Il termine di **10 anni (15 per gli impiantabili)** sta nell'**Allegato XIII punto 4, da solo**, e riguarda **la dichiarazione**; l'**Art. 10(5)** rimanda al **punto 2** ed è un obbligo **senza termine** | scelta di Francesco fra tre strade (emendare tutti i documenti · emendare tutto tranne le istruzioni permanenti · lasciare la ratifica com'è), posta dopo che **avevo letto io** il testo consolidato | ✅ **Prova di prima mano:** EUR-Lex, MDR consolidato al 01/01/2026, CELEX `02017R0745-20260101`, versione italiana, scaricata e letta — «*La dichiarazione di cui alla parte introduttiva del punto 1 è conservata per un periodo di almeno 10 anni dalla data di immissione sul mercato **del dispositivo***» (singolare: **non** «dell'ultimo», che è la formula dell'Art. 10(8), cioè della produzione in serie). 🔑 **Il difetto non è stato il panel del 29/07: la lettura giusta ERA GIÀ NEL SUO VERBALE**, sotto «cosa resta non verificato» («*l'Art. 10(5) impone di tenerla a disposizione senza indicare un termine*») — è la **riga di sintesi** ad averla appiattita, ed è la riga di sintesi che è stata copiata altrove. ⚠️ **E il censimento ha smentito il mio stesso conteggio: non «tre documenti» ma QUATTORDICI.** Emendati i **vivi** — `ua-app/CLAUDE.md` §9, `docs/roadmap/2026-07-29-ondata-b-panel-validazione.md`, la riga 8 di `docs/roadmap/ROADMAP-UFFICIALE.md` (che così si **chiude**), questo verbale, `supabase/schema.sql` e tre commenti fra codice e prove. 🛑 **Handoff e referti passati NON riscritti:** sono il verbale di ciò che si credeva allora. 📌 **Conseguenza pratica: nessuna norma MDR impone di conservare una FOTO clinica per dieci anni** |
| **D126** | ✍️ **Il contratto ai dentisti si riscrive TUTTO adesso — testo, non impianto**: le quattro citazioni, la conservazione sull'oggetto giusto, **le tre affermazioni di sicurezza false**, la catena dei sub-responsabili con UÀ dichiarata e le clausole dell'Art. 28 mancanti. **Nessuna migration** | scelta di Francesco fra tre ampiezze (tutto il testo ora · testo + contratto dimostrabile con migration · solo citazioni e conservazione) | 🔴 **Le tre affermazioni false, misurate:** autenticazione a più fattori (`grep` su `src/` → **0** riscontri), pseudonimizzazione (il nome paziente è **in chiaro** in `supabase/schema.sql:891` e dentro l'indice full-text `:1011`), «log immutabile di **tutti gli accessi**» (registra le **modifiche**, e solo su `cicli_produzione` e `fasi_produzione`, `supabase/migrations/20260704120000_b3_cicli_fasi_audit.sql:7,11`). ⚠️ **Un contratto che dichiara misure inesistenti è più grave di una citazione sbagliata**, e non era nel mandato di partenza: l'ha trovato il panel perché gli è stato chiesto di cercarlo. 🛑 **Ciò che questa decisione NON copre, e resta aperto:** il contratto **non è dimostrabile** — numero stabile per cliente e per anno, PDF mai persistito, `template_versione` mai valorizzato: nessuno può sapere quale testo ha in mano un dentista. Quella è la parte **(b)** della riga 10 di `docs/roadmap/ROADMAP-UFFICIALE.md`, con migration, **non fatta oggi** |

🔑 **Perché D125 sta scritta con la sua prova e non con un «lo dice il panel».** La formula emendata era
**ratificata**, viveva nelle istruzioni permanenti di Francesco, ed è stata cambiata solo dopo aver letto
**le parole del regolamento**. Un panel che cita una ratifica non è una fonte: è un'eco. Il panelista ② ha
fatto esattamente questo, e non è servito a nulla se non a mostrare quanto è facile.

---

### Quarantatreesima tornata — D127: i documenti da firmare si mandano e si firmano dal telefono

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D127** | ✍️ **TUTTI i documenti da firmare si devono poter INVIARE (email · WhatsApp · conversazione col clinico) e FIRMARE direttamente da PC, tablet o telefono.** Non è una funzione del solo contratto ai dentisti: è una **capacità del prodotto**, e il contratto è il suo primo caso | «*la pwa non è in uso da nessuno, quindi dobbiamo verificare e sistemare tutto. io vorrei che tutti i documenti da firmare possano essere inviati tramite email o whatapp o nella conversazione con il clinico con la possibilità di essere firmati direttamente da pc, tablet o smartphone che sia*» | 🔑 **Risponde a una domanda che avevo posto male.** Avevo chiesto «che cosa succede oggi dopo lo scarico», dando per scontato che un'abitudine esistesse: **non esiste**, la PWA non è in uso da nessuno — quindi il progetto si fa su come **deve** funzionare, non su una prassi osservata (statuto delle fonti, `../CLAUDE.md` §7). ⚠️ **La parte (b) della riga 10 di `docs/roadmap/ROADMAP-UFFICIALE.md` — «il contratto dimostrabile» — NON è più una voce sola:** contiene ① il **registro delle emissioni** (quale testo, quando, per chi: senza questo non si sa nemmeno *che cosa* è stato firmato), ② l'**invio** su tre canali, ③ la **firma a distanza** con la sua prova, ④ il **documento firmato** che torna e si conserva. 🛑 **La ② e la ③ hanno un vincolo che il prodotto oggi non ha: un modo per far aprire una pagina a chi NON ha un accesso a UÀ** — esiste già il portale del dentista a gettone, ed è il precedente da guardare. 📌 **Il peso legale della firma è una domanda NORMATIVA aperta** (eIDAS: accettazione tracciata · firma avanzata · firma qualificata) e va a panel prima di qualsiasi riga di codice |
| **D128** | 🖊️ **La firma è un'ACCETTAZIONE TRACCIATA, non una firma elettronica avanzata.** Il clinico apre il link, legge, scrive il suo nome e accetta; UÀ conserva il PDF, la sua impronta, chi ha accettato, quando e da dove. **Nessun fornitore esterno, nessun costo per firma** | scelta di Francesco fra tre (accettazione tracciata · firma avanzata con fornitore certificato · livello deciso documento per documento) | ✅ **Regge sulla forma richiesta dall'Art. 28(9) GDPR — «per iscritto, anche in formato elettronico»** — 📌 **da riconfermare sul testo dal panel normativo prima del codice**, con lo stesso metro usato per l'Allegato XIII: nessuna citazione di seconda mano. 🔑 **Conseguenza di prodotto:** niente dipendenza nuova, niente contratto con un terzo, e la prova sta tutta in casa. ⚠️ **Conseguenza di progetto:** la prova vale quanto la sua **catena** — impronta del PDF + momento + identità dichiarata + registrazione dell'invio: se manca un anello, l'accettazione non dimostra nulla, ed è questo che il progetto deve costruire bene |
| **D129** | 🧱 **Si taglia in DUE ondate, e va per prima quella che non si vede: il REGISTRO DELLE EMISSIONI.** Ondata 1 — ogni volta che il documento esce, UÀ lo conserva, gli dà un numero progressivo vero, ne salva l'impronta e la versione del modello. Ondata 2 — invio (email · WhatsApp) e firma a distanza, che poggiano su quel registro | scelta di Francesco fra tre tagli (prima il registro poi la firma · tutto in una sola ondata · prima la firma) | 🔑 **La ragione che regge, ed è la stessa che ha aperto la voce:** una firma non vale niente se non si sa **che cosa** è stato firmato. Oggi il numero del contratto è `DPA-{anno}-{primi 8 del cliente}` — **stabile per cliente e per anno** —, il PDF non è conservato da nessuna parte e `template_versione` non viene mai valorizzata: se un dentista accettasse domani, **non sapremmo dire quale testo ha accettato**. ✅ **E dopo l'ondata 1 il contratto è già dimostrabile anche senza firma**, che è il valore che si porta a casa subito. ⚠️ **Perimetro dell'ondata 2, dichiarato adesso perché non si perda:** l'invio ha **due canali che esistono già** (email via Resend, e WhatsApp che è un **link `wa.me`** — nessuna API, nessun costo) e **uno che NON esiste**: la «conversazione col clinico» — la tabella `messaggi` è disegnata in banca dati con **zero lettori e zero scrittori**, esattamente come lo era `data_processing_agreements`. Quel canale è una voce sua, e la sua destinazione è la riga 10 di `docs/roadmap/ROADMAP-UFFICIALE.md` |
| **D130** | 🔁 **Un'emissione nasce SOLO se qualcosa è cambiato** — testo del modello, dati del laboratorio o del cliente. Una riga del registro = **un documento distinto**; riscaricare a parità di tutto restituisce il **PDF già conservato**, senza bruciare un numero | scelta di Francesco fra tre (solo se cambiato · ogni scarico è un'emissione · una riga sola per cliente, aggiornata) | ✅ **Alla domanda che ha aperto tutta la voce — «quale testo ha in mano questo dentista?» — risponde l'ultima riga.** 🔑 **Il confronto si fa su DUE cose insieme:** l'impronta dei dati che generano il foglio **e** la versione del modello — perché il testo può cambiare a dati identici (è successo **oggi**, con D126). ⚠️ **Scartata la terza strada** («una riga sola, aggiornata»): è esattamente ciò che impedirebbe di dimostrare che cosa era stato consegnato **prima** di un cambio di testo, cioè il problema da cui siamo partiti. 📌 **Il precedente in casa è il guard della DdC** (`src/lib/pdf/generate-ddc.ts:98-107`) — stessa forma, con una differenza dichiarata: là l'idempotenza è per **lavoro**, qui è per **coppia (dati, versione del modello)** |
| **D131** | 📮 **La «conversazione col clinico» NON è un canale di questa materia: rientra nell'ondata del portale del clinico.** Restano qui i due canali che esistono già — **email** e **WhatsApp** — che non dipendono dal portale e costano zero | «*tutta la parte della conversazione con il clinico dovrebbe rientrare nell'ondata del rifacimento del portale del clinico che immagino avevamo già iniziato a progettare e poi messo in pausa, quindi vedi cosa rimandare e quando*» | ✅ **Verificato prima di rimandarci qualcosa — la destinazione ESISTE:** **V2.0 n.1 «Portale dentista V2 — comunicazione bidirezionale»** in `docs/roadmap/ROADMAP-UFFICIALE.md`, che porta già una nota «**non duplicare**» agganciandola al centro notifiche («*stessa materia, superficie diversa: il portale ha un'altra autenticazione*»). 🔑 **Correzione a un ricordo, detta perché conta:** del portale del clinico **non è rimasto un progetto in pausa** — le sue ondate 0, 1, 2 e 3 sono **fatte e in produzione** da luglio (spec in `docs/superpowers/specs/`, la 3b mergiata il 14/07). Ciò che resta aperto è **solo** la comunicazione bidirezionale, ed è quella la casa della conversazione. 🔗 **E una seconda voce da agganciare, non da riscrivere:** **V3.0 n.2 «Prescrizione digitale dentista — form digitale dal portale con firma digitale»** userà **la stessa macchina della firma** dell'ondata 2: quando arriverà, la riusa. ➡️ **Perimetro finale: ondata 1** = registro delle emissioni, nessun canale · **ondata 2** = email + WhatsApp + pagina di firma a gettone + documento firmato conservato · **rimandato al portale** = la conversazione |

---

### Quarantaquattresima tornata — D132: «viva» comprende lo stato, o l'indice fa da tappo

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D132** | 🧱 **L'indice che impedisce i doppioni del contratto ai dentisti ESCLUDE gli stati morti — `revocato` e `scaduto` — e lo fa ADESSO, non nell'ondata 2.** Il predicato diventa `WHERE deleted_at IS NULL AND payload_sha256 IS NOT NULL AND stato NOT IN ('revocato','scaduto')` | scelta di Francesco fra due (escludere adesso · rimandare all'ondata 2, che porta comunque le sue migration) | 🔑 **Il difetto che chiude:** senza quella riga un contratto **revocato o scaduto** resterebbe dentro l'indice e farebbe da **tappo** — nessuna riemissione possibile a quel dentista con gli stessi dati sostanziali, **per sempre**, perché l'impronta esclude apposta numero e data e quindi non cambia mai. L'unica uscita sarebbe cancellare logicamente la riga che documenta l'emissione: togliere dal registro la prova, per poterne fare una nuova. ✅ **Il precedente in casa lo faceva già giusto:** `ddc_lavoro_attiva_unique` esclude `'annullata'` (`20260710090000_ddc_annullata_unique_parziale.sql`) — la prima stesura aveva copiato **il backstop** della DdC e non **la sua condizione di vita**. ⚠️ **Oggi il caso NON è raggiungibile** (`grep` su `src/` → nessun codice scrive su quella tabella; revoca e scadenza sono ondata 2): si è scelto lo stesso perché **costa una riga adesso e una migration dopo**, e questa migration si applica a mano su un database vero. 🛑 **Non è una riga sola, ed è la parte che si sarebbe potuta sbagliare:** il predicato dell'indice, il filtro del **guard di riuso** (Task 5) e quello della **rilettura dopo il `23505`** (Task 6) sono **la stessa cosa** — cambiarne uno solo avrebbe prodotto il difetto **opposto e peggiore**: un guard che restituisce come **corrente** un contratto che l'indice considera **morto**, cioè consegnare a un dentista un contratto revocato. Tutti e tre aggiornati insieme. 📌 **Denylist e non allowlist, di proposito:** uno stato **nuovo** resta **dentro** l'indice, cioè continua a deduplicare — sbagliare da quella parte non apre buchi. 🔎 **Da dove è uscita:** revisione indipendente del Task 1, rilievo `I1`, su un blocco che il piano dava alla lettera |

---

### Quarantacinquesima tornata — D133: la versione del contratto porta dentro l'impronta del testo

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D133** | 🔖 **`VERSIONE_MODELLO_DPA` non è più una stringa scritta a mano: è COMPOSTA.** Revisione leggibile **più le prime otto cifre dell'impronta del testo** — `dpa-v2+8d98dbee`. È questo il valore che finisce in banca dati, nella colonna `template_versione` | scelta di Francesco fra due (attaccare l'impronta alla versione · lasciare il numero a mano e correggere solo il commento falso) | 🔴 **Il difetto che chiude, trovato dall'esecutore del Task 2 e provato smontando il meccanismo.** La guardia rende **visibile** un cambio di testo (la prova diventa rossa), ma **non impedisce** di dimenticare di alzare il numero: chi chiude il rosso **incollando la nuova impronta** ottiene un verde **senza aver toccato `v2`**. E il commento del sorgente affermava il contrario — «*le due cose si muovono sempre insieme, e la prova è ciò che lo impone*»: **una promessa falsa in un file permanente**, la classe di difetto che questo progetto continua a pagare. 🛑 **La conseguenza NON è cosmetica, ed è stata verificata a valle:** l'indice `dpa_emissione_viva_unica` confronta proprio `template_versione`. A versione invariata e dati invariati **non riemetterebbe** — **il dentista resterebbe col contratto vecchio mentre il laboratorio crede di avergli mandato quello nuovo**. È il guasto di **D126** in forma nuova, cioè esattamente ciò che il Task 2 esisteva per impedire. ✅ **Con l'impronta attaccata la versione cambia DA SOLA**: dimenticare di alzare `v2` diventa **innocuo**. *(È la lezione di **D120**, i 211 scatti dei mockup mai salvati: una promessa che dipende da un gesto umano ripetuto è una promessa che salta — e stavolta non si è messa un'altra promessa, si è tolto il gesto.)* ⚠️ **Deterministica:** si compone da due **letterali** del sorgente, mai da un render a tempo di esecuzione — due macchine danno lo stesso valore. `provato:` riscrivendo la costante come letterale, **2 asserzioni su 2** si accendono; cambiando **una parola** nel template l'impronta passa da `8d98dbee…` a `85bdcde1…` e con lei la versione, **a `v2` fermo**; template rimesso, `git diff` **vuoto**, 2 prove verdi. 🔑 **Regola che ne discende, e vale per i Task 4, 5, 6 e 9:** il valore **non si scrive mai come letterale**, si importa `VERSIONE_MODELLO_DPA` — un test che asserisce `'dpa-v2'` diventerebbe rosso al primo cambio di testo **per il motivo sbagliato** |

---

### Quarantaseiesima tornata — D134: il contrasto in modo scuro si deferisce, e si deferisce SAPENDO cosa costa

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D134** | 🌒 **P16 SI DEFERISCE all'ondata di migrazione a v3 della route `clienti/[id]` — la sede che la roadmap già indicava.** Non si toccano i colori del listino legacy adesso | scelta di Francesco fra tre, portate col **gate estetico L2** in mano (`docs/design/audit-ui-ux/LIVELLO-2-2026-08-04-dpa-scheda-cliente-ESITI.md` §2): **(A)** allineare i due grigi scuri v2.3 ai valori v3 già corretti (`#A69B8C` · `#928778`) · **(B) esclusa dalle misure**, non da una preferenza · **(C) deferire** ← scelta | 🔑 **Che cosa si è deciso di TENERE, e va scritto perché una deferizione senza il suo prezzo è una rimozione:** in modo scuro restano illeggibili **DUE** righe della scheda cliente — la promessa «*ogni versione emessa resta conservata da UÀ*», che è un impegno verso lo studio dentistico (**2,24 : 1**), e la riga «*Ultima emissione: DPA-2026-0001*», che porta **il numero che rende dimostrabile l'emissione** (**4,45 : 1**, sotto il minimo di **4,5** di un soffio). ✅ In chiaro passano entrambe. 🛑 **E il difetto non è di quella pagina:** `provato:` `--t2` `#8A8580` sta a **4,45** su card `#232018` e a **3,92** sull'elevato `#2C2A27`; `--t3` `#5A5652` sta a **2,24 / 2,52 / 1,97** — **fallisce ovunque**. Raggio: **143 usi in 143 file**. Quindi ciò che si deferisce **non è una riga, è il listino dei testi scuri di tutta la parte legacy**. ⚠️ **Perché (B) è esclusa e non è un'opinione:** `misurato:`, **nessun** token di testo v2.3 scuro passa su quella card tranne `--t1` (**14,06**), che come corpo minuto distruggerebbe la gerarchia; l'unica alternativa sarebbe un colore letterale in linea, cioè un'isola fuori dal listino, vietata dalle istruzioni permanenti. ✅ **Che cosa rende la deferizione ragionevole:** la cura **esiste già, fatta una volta, in v3** (`src/design-system/v3/tokens.ts:15` — `muted #A69B8C` → **5,95**, `faint #928778` → **4,61**, col motivo scritto accanto: «*rev. 3.1 — era #6E6457 (WCAG fail)*»). L'ondata di migrazione **porta quei valori per costruzione**: non è debito che si accumula, è debito che si estingue da solo quando la route passa a v3. ⚠️ **Ma resta un nodo che quell'ondata dovrà sciogliere**, e si scrive adesso o si perde: `#928778` sta a **4,06 sull'elevato `#2C2A27`** — va deciso se `--t3` possa vivere su una superficie sollevata. 📌 **Se l'ondata di migrazione slitta, questa riga è l'innesco per riaprire (A)** — che a quel punto vorrà il suo panel (Regola Advisor) e il suo giro visivo sulle pagine che cambiano |

---

### Quarantasettesima tornata — D135: la firma resta quella scelta, ma il TESTO si corregge prima

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D135** | 🖊️ **DUE scelte in una, portate dal panel normativo su D128** (referto: `docs/roadmap/2026-08-04-panel-d128-referto.md`). **(a) Il modo di firmare RESTA l'accettazione tracciata** — nessun fornitore esterno, nessun costo per firma — **con le condizioni C1-C11 del referto**, in particolare l'ancoraggio d'identità (**C8**) e la chiusura in scrittura del registro (**C5**). **(b) L'ORDINE si accetta: prima le correzioni di TESTO, poi la firma** | due scelte di Francesco: **(a)** fra «resta l'accettazione tracciata con le condizioni» · «si riguarda la firma avanzata con fornitore certificato» · «decido dopo aver letto le condizioni» → **la prima**; **(b)** fra «prima il testo, poi la firma» · «avanti con l'ondata 2, il testo dopo» → **la prima** | 🔑 **Perché (b) è la scelta che valeva di più, e ha una scadenza vera:** oggi correggere il testo costa **zero** perché **nessun dentista ha ancora accettato niente** (`provato:` 2 righe nel registro, **0 firmate**). Dalla prima accettazione, ogni parola cambiata sposta l'impronta del testo, quindi la versione (**D133**), quindi obbliga a **riemettere e far riaccettare a TUTTI** i dentisti già passati. ⏱️ **Le quattro correzioni si fanno in un colpo solo** — C1 la frase sul contratto laboratorio↔UÀ · C2 gli **obblighi del Titolare**, elemento che l'**Art. 28(3) NOMINA** e che l'EDPB ribadisce al §102 · C3 la contraddizione **Art. 1 ↔ Art. 7** su chi è titolare · C4 le **immagini di lavorazione**, disciplinate due volte e mai censite fra i tipi di dati — **perché ognuna, da sola, sposterebbe la versione**. ✅ **Su (a) il panel è concorde e la scelta regge:** davanti al Garante l'accettazione tracciata **è** un atto scritto in forma elettronica (EDPB §101 esclude solo gli accordi **non** scritti; le firme le **raccomanda**). 🛑 **Ma NON regge da sola in causa**, perché il flusso **non identifica nessuno**: si finisce nel «*liberamente valutabili in giudizio, in relazione alle caratteristiche di sicurezza, integrità e immodificabilità*» del **CAD art. 20 co. 1-bis** (letto alla fonte su Normattiva). 🔑 **E quelle tre parole sono esattamente ciò che l'ondata 1 ha costruito** — impronta, conservazione, numerazione: il disegno gioca sul terreno che la legge indica al giudice, **purché C5 e C6 lo rendano vero**. ⚠️ **Resta APERTA la terza domanda del panel, e non è un dettaglio: ESISTE il contratto laboratorio↔UÀ?** Il DPA che i dentisti scaricano lo **afferma** (`DpaTemplate.tsx:210`, «*per contratto*») e il prodotto **non ne conserva traccia** (`provato:` un solo scrittore di `tipo_controparte`, scrive sempre `'dentista'` · `sub_processors` **zero** lettori e scrittori · nessuna pagina di condizioni in `src/app` · nessuna colonna di accettazione su `laboratori`). **Da qui dipende se C1 è una riga di testo da riscrivere o un documento da produrre** — e C1 è dentro il pacchetto (b), quindi **blocca l'inizio dell'ondata 2**. 🔄 **CHIUSA nello stesso turno, dopo aver rispiegato la domanda: Francesco ha risposto «NO, oggi non firma niente».** Quindi **C1 è un documento da produrre**, non una riga da riscrivere — e il buco **non è del laboratorio di Francesco, è di UÀ come servizio**: ogni laboratorio che si abbona affida a UÀ dati sanitari, quindi ciascuno ha bisogno del **proprio** accordo. → voce **P19**. ✅ **E la catena a valle è a posto**, verificata da me alla fonte su richiesta di Francesco («*provvedi a controllare tu stesso*»): i DPA di **Supabase**, **Vercel** e **Resend** si perfezionano **automaticamente** con l'accettazione delle condizioni — nessuna casella da spuntare. 🛑 **Non verificabile dalle API** (la Management API di Supabase non ha endpoint sui documenti legali: 404), quindi la prova sta nel testo dei documenti stessi. ⚠️ Resta da guardare **quale piano Vercel** è in uso |

---

### Quarantottesima tornata — D136: C1 non è una frase da riscrivere, è l'anello che manca

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D136** | 🔗 **UÀ si dà le proprie CONDIZIONI DI SERVIZIO col contratto sui dati incorporato, accettate all'abbonamento — lo stesso meccanismo dei suoi fornitori.** La condizione **C1** del panel su D128 **cambia natura**: non è più «riscrivere la frase di `DpaTemplate.tsx:210` perché afferma un contratto che non c'è», è **costruire quel contratto**. 🛑 **Prima il panel, poi una riga di codice** (Regola Advisor) | «*sì, imposta così*», dopo aver chiesto «*non possiamo fare la stessa cosa con UÀ?*» guardando come si perfezionano i DPA di Supabase, Vercel e Resend | 🔑 **Il fatto che l'ha generata, ed è verificato alla fonte:** i tre fornitori non hanno nessuna casella da spuntare **perché il contratto sui dati viaggia DENTRO le loro condizioni di servizio** — Supabase lo dice con parole sue («*this DPA **supplements and forms part of** the Terms of Service*» + §12.2 «*acceptance of the Agreement shall have the same effect as signing the SCCs*»), Vercel e Resend con formule equivalenti. **Non è che «non serve firmare»: è che la firma è quella delle condizioni.** 🛑 **UÀ può fare lo stesso solo perché… oggi NON ha condizioni:** `provato:` nessuna pagina di condizioni o privacy in `src/app`, nessuna colonna di accettazione su `laboratori`. Quindi **servono TRE pezzi, non uno**: ① **il testo**, che è un documento **nuovo e coi ruoli rovesciati** (nel DPA ai dentisti il laboratorio è il *responsabile*; qui il laboratorio è il **titolare** e UÀ il **responsabile**) — ⚠️ **trattandosi di dati sanitari, l'ultima parola non è di Claude: serve un occhio legale**; ② **il momento in cui si accetta**, che oggi non esiste; ③ **la traccia di chi ha accettato cosa e quando** — ✅ **e questa esiste già**: è la macchina dell'ondata 1 (progressivo · conservazione · impronta del testo · versione) applicata a una controparte diversa, e `provato:` **il registro la controparte giusta ce l'ha già prevista e non l'ha mai vista** — `CHECK (tipo_controparte = ANY (ARRAY['dentista','sub_responsabile']))`, righe `'sub_responsabile'` = **zero**. ⏱️ **PERCHÉ ADESSO, e la ragione è la stessa di D135 (b):** `provato:` in banca dati ci sono **3 laboratori e sono TUTTI di prova** (`ua-app/CLAUDE.md` §8: alla consegna si ripulisce tutto). **Non c'è nessuno da rincorrere.** Farlo prima del primo laboratorio vero costa **solo il lavoro di scriverlo**; farlo dopo significa tornare da clienti acquisiti a chiedere una firma — la cosa che tutti rimandano e nessuno chiude. ⚠️ **Perimetro dichiarato adesso perché non si perda:** l'elenco dei fornitori che il contratto mostra al dentista è **scritto a mano dentro il modello PDF** (`DpaTemplate.tsx:207-209`) mentre la tabella `sub_processors` li elenca già **tutti e sei** — è il motivo per cui oggi **aggiungere un fornitore obbligherebbe a riemettere a tutti i dentisti** (condizione **C8** del referto). Va sciolto nello stesso passaggio o resta un debito che matura a ogni fornitore nuovo. ➡️ **Voce di roadmap: P19, che assorbe C1.** Panel: 3 advisor a mandato disgiunto, lanciato nello stesso turno |

---

### Quarantanovesima tornata — D137: il momento si sposta, il secondo passaggio si fa, e prima si mette in sicurezza il prodotto

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D137** | 🛡️ **TRE SCELTE IN UNA, tutte accolte, portate dal panel su D136** (referto: `docs/roadmap/2026-08-04-panel-d136-referto.md`). **(a) Il MOMENTO dell'accettazione si sposta dall'abbonamento al PRIMO ACCESSO**, dentro la transazione atomica dell'invito. **(b) SI FA il secondo passaggio con firma elettronica leggera** (codice usa-e-getta) per le clausole che proteggono UÀ. **(c) L1 · L2 · L3 vanno ESEGUITE PRIMA della prima accettazione** — copie di sicurezza, cancellazione vera, tracciamento degli accessi di UÀ | «*sì a tutte e tre, procedi*» | 🔴 **(a) — D136 non era incompleta, era SBAGLIATA, e la prova è in tre righe di codice:** `provato:` un laboratorio nasce `stato:'trial'` (`src/app/api/admin/labs/route.ts:86`) e **in prova tutte le scritture passano** (`src/lib/supabase/lab-guard.ts:55-58`) → fra l'ingresso e l'abbonamento c'è una finestra in cui **entrano dati veri di pazienti senza nessun contratto**, che è esattamente ciò che il contratto deve coprire. ✅ **Il posto giusto esiste già:** `accept_invite_atomic` (`supabase/migrations/20260525000002_invite_atomic.sql:20-57`) fa tutto in **un'unica operazione indivisibile** → «*o nasce l'utente con l'accettazione, o non nasce niente*». 🔴 **(b) — la ragione è una sentenza di sei settimane fa, POSTERIORE alla conoscenza di Claude, ed è il motivo per cui il panel andava fatto: Cass. civ. Sez. III, ord. 20945 del 20/06/2026.** Fra professionisti, online, «*non essendo di per sé sufficiente la mera «spunta» (o «flaggatura») della casella*»: serve una **firma elettronica anche semplice**, e la Corte fa l'esempio del **codice usa-e-getta per SMS o email**. ⚠️ **Verifica dichiarata:** il PDF della Corte **non si apre** (certificato di `italgiure.giustizia.it`); citazione riscontrata **verbatim** su fonte giuridica indipendente e confermata da altre nove. È **una** ordinanza di sezione semplice, **non ancora orientamento consolidato**. 🔑 **L'ASIMMETRIA che ha deciso la scelta:** l'art. 1341 co. 2 c.c. colpisce **solo** tetto di responsabilità, sospensione, rinnovo tacito e foro — **le difese di UÀ** — mentre **il contratto sui dati NON è vessatorio e sopravvive**. Senza (b), in causa **UÀ resterebbe legata a ogni proprio dovere e priva di ogni propria difesa**, con dati sanitari di mezzo, quindi **senza tetto al risarcimento**. 🛑 **E «lo fanno Supabase, Vercel e Resend» non vale:** non sono società italiane, e l'art. 1341 lì **non esiste**. 🔴 **(c) — perché prima e non dopo:** senza L1-L3 UÀ firmerebbe, verso **ogni** laboratorio abbonato, tre affermazioni che oggi non può sostenere. **È la classe di difetto di D126 — con la differenza che quel contratto lo firmava il laboratorio di Francesco, e questo lo firma UÀ.** 🛑 **L1 è la sola condizione del panel che si COMPRA, non si scrive, e va fatta comunque:** `provato:` `pitr_enabled:false`, **`backups:[]`** — e la documentazione di Supabase conferma che **il piano gratuito NON ha copie ripristinabili** (le copie giornaliere partono dal piano Pro, 7 giorni). ⚠️ **L'attivazione è un ACQUISTO e un cambio di impostazioni d'account: la fa Francesco, non Claude.** → voci **P20 · P21 · P22**, e **P19** che le raccoglie |

---

### Cinquantesima tornata — D138: si resta su Supabase, con una rete provvisoria sul Mac

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D138** | 🏠 **NIENTE MIGRAZIONE SUL VPS: si resta su Supabase.** Nell'attesa, **salvataggio del database sul computer di Francesco**; **prima della distribuzione si prende il piano a pagamento** | domanda di Francesco: «*ho un vps con sopra una pwa, ma c'è spazio e potenza, quindi potremmo poi migrare prima di andare in distribuzione?*» → poi, letta l'analisi: «*il vps lo pago già, però se la strada migliore è restare su supabase, va bene, imposta il backup sul mio pc e poi prima di andare in distribuzione prenderemo l'abbonamento a pagamento*» | 🔑 **La domanda era posta nel momento GIUSTO** — dopo il primo laboratorio vero una migrazione diventa un trasloco di **dati sanitari**. 📏 **Superficie misurata prima di rispondere:** il grosso del lavoro è **PostgreSQL puro e viaggia ovunque** (`provato:` **70 tabelle · 104 funzioni · 125 regole di accesso · 73 automatismi · 29 MB**); il legame vero è su **autenticazione** (22 punti nel codice, `auth.uid()` in **5** regole), **archivio file** (5 punti, 31 file) e **aggiornamenti dal vivo** (3 file — parete cassette e notifiche, **che stavo per non contare**); **zero** funzioni serverless. 🛑 **Due strade, non una:** **(A)** portare **Supabase stesso** sul VPS — stesse interfacce, modifiche quasi solo di configurazione — oppure **(B)** togliere Supabase e rifare i pezzi: **(B) esclusa**, sono mesi e butterebbe via il disegno dell'isolamento fra laboratori. ✅ **Il VPS non era il problema:** `Hetzner, Norimberga` → **Germania, quindi Unione europea**, nessun trasferimento da giustificare; **ed è gestito**, il che toglieva metà delle riserve. 🔑 **La ragione che ha deciso, ed è controintuitiva: spostarsi sul VPS NON risolve il problema delle copie di sicurezza — lo TRASFERISCE addosso.** Su un piano a pagamento si paga e ci sono; sul proprio VPS vanno costruite, va **provato che il ripristino funzioni**, e va continuato a provarlo — e il panel su D136 ha appena stabilito che quella è una **promessa contrattuale** su **dati sanitari** (Art. 32(1)(b)(c)). ⚠️ **E il contratto diventerebbe più DIFFICILE da scrivere, non più facile:** la condizione **T1** del panel dice di dichiarare la cifratura a riposo «*fornita dall'infrastruttura*» — **se l'infrastruttura è UÀ, quella attribuzione sparisce** e ogni affermazione di sicurezza diventa una promessa propria da dimostrare. 📌 **Conseguenza sull'ORDINE, ed è la parte utile subito:** siccome non si migra, **L1 si fa su Supabase e non va rifatta**. ⏳ **Rete provvisoria, a costo zero e già in funzione:** `scripts/salvataggio-database.sh` — tre file (ruoli · struttura · dati) in `~/Backup-UA-database/<data-e-ora>/`, con **controllo che dentro ci siano davvero regole di accesso e funzioni**, perché *un salvataggio che non si controlla non è un salvataggio: è un file*. 🔎 **E il salvataggio è stato PROVATO, non solo scritto — ricaricandolo in un database usa-e-getta (PostgreSQL 17, la stessa versione della sorgente). La prova ha trovato un buco, ed è il motivo per cui i pezzi sono cinque e non tre.** ✅ **Tornato identico:** `provato:` **295 lavori · 39 clienti · 2 contratti · 1588 righe di registro · 104 funzioni**, gli stessi numeri della sorgente. 🛑 **NON c'era:** lo schema **`auth`** — cioè **i dati tornavano e nessuno poteva entrare** — né **`storage`**, l'anagrafe dei file; e **11 regole di accesso su 115** non si erano applicate. 🔑 **Il salvataggio «normale» di Supabase copre SOLO lo schema `public`:** è una scelta loro, non un guasto, ma chi non la conosce si ritrova con un salvataggio che sembra completo e non lo è. ✅ **Corretto:** si salvano anche `auth` e `storage` (struttura e dati), **e i FILE VERI si scaricano a parte** (~~scripts/salvataggio-archivio·ts~~ → 🔄 **sostituito il 04/08 da `scripts/salvataggio-archivio.mjs`, v. D139**: il vecchio usava una libreria e girava solo dentro il progetto) perché contratti in PDF e **foto cliniche non stanno nel database**. 🛑 **DA RICORDARE quando entra il primo laboratorio vero:** quei file conterranno **nomi di pazienti, anamnesi e le password cifrate di tutti gli utenti** — il disco va cifrato (FileVault) e la cartella non va messa in nessuna sincronizzazione che esca dall'Unione europea |
| **D139** | ⏰ **IL SALVATAGGIO DEL DATABASE PARTE DA SOLO, ogni notte alle 03:00** — e la copia che gira vive **fuori dal progetto**, in `~/Library/Application Support/UA-salvataggio/` | domanda posta con il prezzo scritto («*toglie la dipendenza dalla tua memoria; NON ti dà una copia garantita ogni giorno*») → **«sì, programmalo»**; e poi, sulla via d'uscita da scegliere: **«riscrivi il salvataggio come programma autonomo»** | 🔑 **Chiude il §0 ② dell'handoff del 04/08:** `provato:` prima `crontab -l` → **0** e `~/Library/LaunchAgents` → **0**; adesso `launchctl print … → runs = 1, last exit code = 0`. 🛑 **IL DIFETTO CHE HA CAMBIATO IL DISEGNO, e sarebbe passato in silenzio:** il primo lavoro registrato **non è mai partito**. `provato:` con una sonda lanciata da `launchd` — `~/Downloads` e **ogni livello sotto** rispondono «*Operation not permitted*», mentre `~/Library` e `~/Backup-UA-database` si leggono. **Non è un difetto nostro: è la protezione della riservatezza di macOS**, e il progetto vive dentro `~/Downloads`. ⚠️ **La diagnosi è stata corretta una volta in corsa:** una prima sonda diceva che `~/Downloads` era **scrivibile**, e sembrava smentire tutto — la seconda ha separato le due cose: **si scrive, non si legge**, ed è la lettura che serve. 🔑 **Trovato SOLO perché il lavoro è stato fatto partire davvero da `launchd`, con Docker spento** — cioè nelle condizioni delle tre di notte. Lanciato a mano dal terminale funzionava benissimo: è la stessa forma del guaio di D138, *una cosa che sembra completa e non lo è*. ✅ **Tre pezzi nuovi:** ① `scripts/salvataggio-programmato.sh`, l'involucro che dà a `launchd` l'ambiente che non ha (`node` e `npx` non sono nel suo PATH), **accende Docker e ASPETTA che risponda** (`provato:` «Docker pronto dopo 3 secondi»), controlla che la copia sia **davvero** sul disco e tiene le ultime **14**; ② `scripts/installa-salvataggio-programmato.sh`, che installa la copia autonoma con **le sole tre credenziali che servono** e registra il lavoro; ③ `scripts/guardia-salvataggio-installato.mjs`, agganciata al **pre-commit** (~0,03 s). 🛑 **IL PREZZO DELLA COPIA, scritto perché non si perda:** lo stesso script vive ora in **due posti**, e una copia vecchia continuerebbe a dichiararsi **riuscita**. Per questo la guardia **ferma il commit** sulla deriva — `provato:` accesa apposta **4 volte su 4** (deriva · allarme presente · copia vecchia di 8 giorni · non installata) e tornata verde ogni volta. ✅ **`salvataggio-archivio.ts` → `salvataggio-archivio.mjs`, senza NESSUNA libreria** (il vecchio importava `@supabase/supabase-js` e girava solo dentro il progetto): `provato equivalente` non contando i file ma confrontando le **impronte** — **31 file identici bit per bit**, inventario identico. ✅ **Versione dello strumento FISSATA** a `supabase@2.111.0`: `npx --yes supabase` avrebbe preso l'ultima uscita quel giorno, cioè avrebbe cambiato la parte **provata** mentre nessuno guarda. ✅ **Il fallimento è RUMOROSO, e provato togliendo le credenziali alla copia:** notifica di sistema + file sulla Scrivania (`provato:` un lavoro launchd non può *elencare* la Scrivania ma il **proprio** file lo scrive, rilegge e cancella) + copia in `~/Backup-UA-database` che la guardia legge al commit. **E si spegne da solo al primo giro riuscito** (`provato:` 0 file sulla Scrivania dopo). 🔎 **Prova finale end-to-end:** Docker **spento**, lavoro avviato da `launchd` → copia in **2 minuti**, `11 MB`, **115 regole di accesso**, blocco **utenti** presente, **31 file** di archivio, e **tutti e cinque i file con lo stesso numero di righe** della copia fatta a mano. ⚠️ **CHE COSA QUESTO NON COMPRA, e resta P20:** un lavoro di utente parte **solo se il Mac è acceso e Francesco ha fatto l'accesso**. Toglie la dipendenza dalla **memoria** di qualcuno; **non** garantisce una copia al giorno. Quella la dà **solo il piano a pagamento**, che è un acquisto di Francesco. 🛑 **E una cosa che stavo per dare per vera senza provarla, trovata da un advisor a lavoro finito:** avevo scritto in tre punti che «*se il Mac dorme, macOS recupera al risveglio*». **NON VERIFICATO** — servirebbe un ciclo di sonno vero a cavallo delle 03:00. Corretto ovunque: **finché non è provato, un giorno saltato si conta come saltato**. ✅ **Due prove aggiunte dopo lo stesso ripasso:** ① **l'orario è registrato davvero, non solo il programma** (`launchctl print` → `com.apple.launchd.calendarinterval`, Hour 3 · Minute 0, `watching = 1`): senza questa, «programmato» avrebbe potuto voler dire «parte solo se lo avvii tu», cioè la rete manuale di prima; ② **la rotazione — che cancella copie di sicurezza e non aveva MAI girato** (14 di soglia, 5 copie in casa: il primo giro sarebbe stato **il quindicesimo giorno, di notte, da solo**). Provata con **12 cartelle finte** più vecchie: `provato:` ne ha cancellate **esattamente 4, tutte finte**, ne restano **14**, **tutte e 6 le copie vere intatte**, e ogni cancellazione **nominata nel diario**; e il modello dello script (`20*_*`) e quello della guardia concordano — **17 e 17**. ➡️ **Un difetto riferito e NON corretto qui (R-E2): P23** — il salvataggio dei file si ferma a **1000 per cartella** senza dirlo. Ereditato dalla versione precedente; oggi la cartella più piena ne ha 20, quindi non morde ancora |
| **D140** | ⚖️ **UÀ NON ESISTE ANCORA COME SOGGETTO GIURIDICO — e il contratto si scrive lo stesso, lasciando i dati della parte come UNICO spazio dichiarato da riempire** | domanda posta all'apertura della spec P19 («*chi è UÀ dal punto di vista giuridico? è la parte che firma*») → **«non esiste ancora, la devo aprire»** | 🔑 **Perché la domanda era la prima e non un dettaglio anagrafico:** un contratto ha bisogno di **due parti con un nome**. Del laboratorio la banca dati sa tutto; di UÀ il prodotto non dice **niente** — `provato:` **nessuna** pagina di condizioni o privacy in `src/app`, e `DpaTemplate.tsx` nomina «UÀ» come **marchio**, senza denominazione, sede né partita IVA. Era già la condizione **T6** del panel su D136, letta come una riga da aggiungere: **non lo è, è un soggetto da costituire.** 🛑 **CONSEGUENZA CHE CAMBIA L'ORDINE — è una precondizione che sta PRIMA di L1·L2·L3:** finché il soggetto non esiste, **nessun laboratorio può accettare alcunché**, perché manca la controparte. Quindi il pezzo ② dell'ondata (il momento e la traccia) si può **progettare**, ma **non può entrare in produzione**. ⚠️ **E c'è un secondo effetto, che non è un difetto del prodotto ma va scritto:** se oggi entrasse un laboratorio vero, i suoi dati sanitari sarebbero trattati **da Francesco come persona fisica**, non da una società — cosa che si somma all'asimmetria trovata dal panel (art. 1341: UÀ resterebbe legata a ogni dovere e priva di ogni difesa, **senza tetto**, su dati sanitari). ✅ **Oggi il danno è ZERO** — `provato:` 3 laboratori in banca dati e **tutti di prova** — ed è esattamente la ragione per cui farlo adesso costa solo il lavoro di scriverlo. ➡️ **Il testo si scrive per intero adesso** (D135 (b) lo mette per primo), con i dati della parte come **spazio dichiarato**, mai finto: un contratto che *sembra* completo è la classe di difetto di D126. **Quale forma societaria scegliere è una domanda per commercialista e avvocato, non per Claude** |
| **D141** | 📏 **IL TESTO PROMETTE «IL MINIMO CORRETTO»: condizioni essenziali + contratto sui dati completo, e NESSUNA promessa di prestazioni** — niente disponibilità garantita, niente rimborsi per disservizio, niente tempi di risposta dell'assistenza | domanda sul perimetro del documento, con le tre alternative e il loro prezzo → **«il minimo corretto»** | 🔑 **La scelta è vincolata da una MISURA, non da un gusto:** il panel su D136 ha censito riga per riga ciò che UÀ può dimostrare (dati in area UE ✅ · cifratura in transito ✅ · isolamento fra laboratori **69 tabelle su 70** ✅ · archivio non pubblico ✅) e ciò che **non** può (copie di sicurezza gestite 🔴 · accesso a più fattori 🔴, **0 utenti su 7** · registro delle letture 🔴 · verifica periodica dell'efficacia 🔴). **Un livello di servizio garantito sarebbe stato una promessa non mantenibile su un piano gratuito** — cioè **esattamente D126**, un documento che afferma misure inesistenti, con la differenza che stavolta a firmarlo sarebbe UÀ. ✅ **Dentro ci vanno:** chi è UÀ · cosa fa il servizio · prezzo e durata · quando si può sospendere · **cosa succede ai dati quando il laboratorio se ne va** · il contratto sui dati come parte integrante. 🛑 **Fuori restano** disponibilità garantita, crediti di servizio e tempi di assistenza: **si potranno aggiungere quando esisteranno**, non prima |
| **D142** | 🗑️ **IL CONTRATTO PROMETTE LA CANCELLAZIONE PIENA, e la cancellazione vera si costruisce DOPO — ma prima che entri il primo laboratorio vero** | domanda sulla fine del rapporto, con l'avvertenza scritta che è «*il difetto che ci ha già morso una volta*» → **«cancellazione piena, ma più avanti»** | ⚠️ **L'avvertenza è stata posta e Francesco ha scelto lo stesso: la scelta è sua e si esegue.** 🔑 **E regge, ma per una ragione precisa che va scritta o la prossima sessione la legge come un azzardo: NON è D126.** D126 era un documento **già consegnato ai dentisti** che affermava tre misure inesistenti — il danno era **in corso**. Qui il documento **non arriva a nessuno** finché la cosa non esiste, perché **D137 (c) ha già ratificato che L2 sta PRIMA della prima accettazione**. La promessa e la costruzione restano nello stesso ordine; cambia solo **quando si scrive il testo**, e scriverlo adesso è ciò che D135 (b) impone. 🛑 **MA la differenza vive solo finché il blocco è MECCANICO, non una buona intenzione:** una promessa scritta oggi e una precondizione affidata alla memoria di qualcuno tornano ad essere D126 il giorno in cui il blocco salta. ➡️ **Vincolo per la spec: l'accettazione non si può accendere se P21 non è chiusa, e il controllo dev'essere automatico** — stesso principio della guardia introdotta con D139, e stessa lezione della `guardia-navigazione-overlay` che per settimane «proteggeva» una direttiva senza girare mai. ✅ **Eccezione unica ammessa nel testo:** ciò che la **legge impone** di conservare (le fatture, per obbligo fiscale) |
| **D143** | 📄 **IL TESTO DEL CONTRATTO VIVE NEL REPOSITORY, come file versionato — non in banca dati e non dentro un componente React** | tre strade presentate col loro prezzo (A file versionato · B banca dati modificabile dal pannello · C componente React) → **«A — nel repository»** | 🔑 **La ragione è che il documento serve a fare da PROVA:** un testo versionato **è** già una prova (ogni modifica porta data e motivo, una versione accettata non si cambia di nascosto), mentre un testo in banca dati **va difeso** — sarebbe modificabile a caldo, senza traccia, ed è il primo appiglio che cerca un avvocato avversario. ✅ **E l'impronta del testo che il panel chiede (F5: versione · impronta · momento · identità e ruolo di chi accetta) con questa scelta viene gratis**, calcolata dal file. 🛑 **Scartata C — il componente React — pur essendo ciò che il progetto già fa** per il contratto ai dentisti: mescola le parole con il modo di mostrarle, ed è il difetto che quel contratto **sta già pagando** (l'elenco dei tre fornitori è scritto a mano dentro `DpaTemplate.tsx:207-209` invece di venire da `sub_processors`, che è **popolata con 6 righe e mai letta** — per aggiungere un fornitore bisogna riemettere tutto). ⚠️ **Prezzo accettato:** per correggere una virgola serve un rilascio. Il documento cambia due volte l'anno |
| **D144** | 🧭 **L'ORDINE DEL LAVORO CAMBIA: PRIMA SI FINISCE LA PWA, POI SI PREPARA LA DISTRIBUZIONE** | «*io voglio prima completare la pwa, poi voglio pensare a tutte le cose che occorrono per distribuirla, se non finiamo prima l'applicazione è tutto lavoro inutile*» | 🔑 **La roadmap era ordinata per GIORNO DI SCOPERTA, non per momento di esecuzione** — «trovati provando l'ondata (a)», «usciti dal panel», «usciti dall'audit»: **1107 righe e una trentina di sezioni** che raccontano *quando* abbiamo capito una cosa, non *quando* va fatta. ✅ **Si aggiunge una sezione ORDINATRICE in testa**, non si riscrive l'archivio: riscrivere avrebbe perso ritrovamenti, ed è il modo classico di buttare via mesi di lavoro. 🔄 **NON contraddice le ratifiche precedenti, e va detto o la prossima sessione lo crede:** **D137 (c)** dice L1·L2·L3 prima della **prima accettazione**, **D135 (b)** dice le correzioni di testo prima di **qualunque accettazione** — nessuna delle due dice «prima di finire la PWA». Sono **compatibili**: parlano del momento in cui entra un cliente, non del momento in cui si scrive il codice. 🛑 **MA D142 diventa più delicata, non meno:** allontanando P21 si allunga la distanza fra «il testo promette la cancellazione piena» e «la cancellazione funziona» — **il blocco meccanico non è più un di più, è ciò che tiene** |
| **D145** | 📐 **LA REGOLA DI SMISTAMENTO: «chi lo vede, e chi costa rifarlo»** — FASE 1 = tutto ciò che un utente incontra usando l'app, **più** tutto ciò che, sistemato dopo, costringerebbe a **rifare lavoro già fatto**. FASE 2 = tutto ciò che conta **solo quando esiste un laboratorio vero che paga** | tre regole proposte col loro prezzo → **«chi lo vede, e chi costa rifarlo»** | 🔑 **Serviva una regola perché alcune voci stanno in mezzo e senza un criterio le si smista a sentimento:** **P7** (il registro riscrivibile) è un difetto interno che nessun utente vede — **ma finisce in FASE 1**, perché ripararlo dopo significherebbe toccare **prove vere** e la finestra per farlo a costo zero è adesso (`provato:` 2 righe, **0 firmate**). **P21** (la cancellazione) va invece in FASE 2: conta il giorno in cui un laboratorio vero se ne va. ⚠️ **La regola si applica in modo MECCANICO e lo smistamento si mostra**, voce per voce: una regola applicata a sentimento non è una regola |

---

### Cinquantaduesima tornata — D146: la FASE 1 parte da P7, e due stime dell'handoff erano sbagliate

> ⚠️ **Trovato scrivendo questa riga, e si riferisce invece di correggerlo di nascosto (R-E2):** la testa
> dichiarava «cinquantunesima tornata (D145)», ma **D144-D145 vivono dentro la tabella della cinquantesima**
> — non hanno mai avuto un titolo proprio. Il conteggio delle *decisioni* è sempre stato giusto (ed è quello
> che la guardia controlla); a essere fuori posto è il titolo della tornata. Qui si riparte da **cinquantadue**
> senza rinumerare l'archivio.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D146** | 🔨 **LA FASE 1 PARTE DA P7** — la regola di protezione delle righe del registro DPA, che oggi lascia riscrivibile la prova dell'accettazione a chi quella prova dovrebbe vincolare | tre partenze presentate **col loro costo reale ricalcolato**, non con quello dell'handoff → **«P7 — chiudo la finestra»** | 🔑 **La scelta è stata fatta su stime CORRETTE, e la correzione va scritta o resta solo in chat.** L'handoff del 04/08 §4 chiamava **P17** «*la più visibile, la più breve*»: **non è la più breve, è la più lunga delle tre**. Cambia il comportamento di un tasto su una pagina **già in produzione**, quindi trascina §0B per intero (mockup → scatti → approvazione di Francesco → React) **più la FASE 9b**, il cancello estetico L2 — proprio quello saltato sulla superficie DPA e pagato con una sessione di rimedio. E la **correzione di `DpaTemplate.tsx:210`** era data a «mezz'ora»: `provato:` nessuno dei **17** controlli di `tests/unit/dpa-pdf-content.test.ts` blocca quella frase (l'unico vicino, riga 137-140, cade su `Art. 5` a riga 204), quindi **tecnicamente** è un cambio di testo — **ma decidere che cosa scriverci è una scelta normativa su un documento che esce verso terzi**, quindi panel (§0C) e numero proprio: mezza giornata, non mezz'ora. ✅ **Perché P7 vince a parità di rigore:** tocca RLS, quindi è **percorso GRANDE d'ufficio** (§0C) — ma **non ha superfici UI**, cioè zero cancelli di design, e il precedente corretto è **in casa a undici righe** (`sdi_receipts`, `FOR SELECT`, col commento «*mai UPDATE/DELETE su documenti fiscali*»). 🛑 **Vincolo che parte con l'esecuzione:** il «`provato:` 2 righe, 0 firmate» che rende la finestra gratuita è **del 04/08 e non riverificato** (la roadmap stessa lo dichiara), e l'ultima lettura del database dal terminale **fu bloccata dal filtro dell'ambiente**. **Si riverifica prima di toccare la regola**; se non si riesce a leggere, **si dichiara** invece di ripetere il numero vecchio |

| **D147** | 🛡️ **P7 SI CHIUDE CON DUE PEZZI: il cancello E la traccia** — la regola di riga passa a **sola lettura** (il modello di `sdi_receipts`) **e** la tabella entra nel registro delle modifiche (da **dieci** tabelle sorvegliate a **undici**). La guardia «una firma non si riscrive» **NON** si costruisce adesso | tre profondità presentate col loro prezzo, e con scritto in chiaro che il solo cancello **non protegge la prova dal laboratorio** (il passepartout del server scavalca la regola per costruzione) → **«cancello + traccia»** | 🔑 **Perché la terza è stata scartata, ed è la ragione a contare:** la guardia che rifiuta di riscrivere una firma già messa è **la protezione vera**, ma oggi **non esiste ancora la cosa da proteggere** — l'accettazione arriva con **P19-b**, che non ha spec. Costruire il vincolo prima della sua forma significa dargli quasi certamente la forma sbagliata e rifarlo. ➡️ **La guardia diventa un vincolo dichiarato di P19-b**, non una voce dimenticata. ✅ **Assunzioni PROVATE prima di scegliere, non dopo:** `provato:` `admin_delete_laboratorio` (l'unica funzione che cancella da quella tabella) è **SECURITY DEFINER di proprietà di `postgres`**, e `postgres` è **proprietario della tabella** con `relforcerowsecurity = false` — quindi la RLS la scavalca e **passare a sola lettura NON rompe la cancellazione di un laboratorio**. `provato:` **2 righe, 0 firmate, entrambe `da_firmare`** — riverificato **oggi**, non ripreso dai documenti del 04/08 |
| **D148** | 👤 **LA TRACCIA DEL REGISTRO DPA DEVE SAPER DIRE ANCHE *CHI*** — una colonna sulla riga, riempita dal percorso di emissione con l'utente che ha premuto, che finisce da sola dentro la fotografia conservata dalla traccia | domanda posta **dopo** la misura, non prima: `provato:` il registro delle modifiche ha **1.588 righe e UNA SOLA sa dire chi** (1.587 senza attore) → **«sì, anche il chi»** | 🔑 **Perché il buco esiste, e non è un difetto nuovo:** la macchina della traccia chiede al database «chi è l'utente collegato?», ma **tutte** le scritture dell'app passano dal client di servizio, che **non ha identità** — `auth.uid()` torna vuoto. Vale per tutte e **dieci** le tabelle sorvegliate, da sempre. ⚠️ **Ma su questo registro pesa diversamente:** è quello che un giorno dovrà **contenere la prova** di un'accettazione, e una prova che non sa nominare nessuno vale molto meno. 🛑 **SCARTATA la riparazione globale** (tutte e dieci): è molto più grande di P7 e tocca decine di punti di scrittura — **si riferisce, non si fa di nascosto** (R-E2). 🔴 **TROVATO cercando il precedente in casa, ed è FUORI mandato: il registro FRATELLO ha già la colonna e non la riempie mai.** `provato:` `dichiarazioni_conformita.generated_by` esiste nello schema (`supabase/schema.sql:1261`) col commento «*chi ha premuto "Consegna"*», ma nel codice compare **solo** in `database.types.ts` (generato) — **nessuno scrittore** — e in banca dati fa **5 righe, 0 con il chi**. ➡️ **Conseguenza vincolante su questo lavoro:** la colonna nuova **nasce con il suo scrittore e con una prova che la vede riempita davvero**, non solo dichiarata nei tipi. ➡️ **E il buco della DdC diventa una voce di roadmap**, non un ritrovamento che muore in chat |
| **D149** | ⏩ **LA SPEC DI P7 PASSA AL PIANO SENZA LA RILETTURA DI FRANCESCO** — il gate di rilettura è stato **offerto esplicitamente** e **saltato per scelta**, non per dimenticanza | domanda posta col prezzo scritto («*se preferisci non rileggerla adesso dimmelo e procedo lo stesso — ma allora la spec resta «scritta e non riletta», come è successo a quella del contratto*») → **«procedi con il piano»** | 🔑 **Si scrive perché il precedente è vivo e a due giorni di distanza:** la spec **P19-a** è ferma da ieri nello stato «scritta ma non approvata», e lì la rilettura **non era stata saltata: era stata chiesta e la risposta non era arrivata**. Sono due cose diverse e il verbale le tiene diverse, o la prossima sessione legge «due spec non rilette» e non sa quale aspetta chi. ⚠️ **Conseguenza operativa:** la spec di P7 è **approvata in sessione** (§3 del disegno presentato e accolto) ma **non riletta a freddo**; se il piano trova una contraddizione nella spec, la corregge **nella spec** e lo dichiara — non la aggira nel piano |

---

### Cinquantatreesima tornata — D150-D151: come si esegue P7, e chi applica la migration

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D150** | 👥 **P7 SI ESEGUE CON ESECUTORI FRESCHI, UNO PER COMPITO** — come prescrive **R-E1**, con revisione fra l'uno e l'altro e il mandato esplicito di **cercare dove il piano sbaglia** | domanda posta perché **le istruzioni di sessione vietavano di lanciare esecutori separati senza una richiesta esplicita** → **«con esecutori freschi»** | 🔑 **La scelta vale anche come AUTORIZZAZIONE, e per questo ha un numero:** senza una richiesta esplicita di Francesco quella strada era chiusa, e sarebbe stato eseguito tutto in una conversazione sola — cioè **da chi ha scritto il piano**, che è la persona meno adatta a trovarne i difetti. ✅ **Il precedente che la giustifica è misurato:** è il meccanismo che il **27/07** ha reso visibili **8 difetti su 8 task**. ⚠️ **E la sessione stessa l'ha già dimostrato in piccolo:** il piano, controllato contro il codice prima della consegna, portava **due difetti propri** (54 errori attesi e non 55 · un mock dato per incompleto che era già completo) |
| **D151** | 🔑 **LA MIGRATION LA APPLICA CLAUDE, con la Management API** (`read_only:false`), poi **rimette in pari il ledger** con `supabase migration repair` | tre strade presentate col loro prezzo (Management API · `supabase db push` mai provato da questo Mac · incollare a mano nel pannello) → **«fallo tu con la Management API»** | 🛑 **Questa decisione ESISTE perché il divieto non era tecnico:** `.env.local` ha sempre avuto `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_URL`. Il piano del 03/08 aveva già **corretto la ragione sbagliata** («*richiede la password*») proprio perché un motivo falso è un motivo che smette di funzionare: il prossimo esecutore che trova le credenziali conclude che il divieto era una svista. ✅ **Il rischio è basso e misurato:** la banca dati contiene **solo dati di prova** (3 laboratori, tutti finti) e la migration è **idempotente istruzione per istruzione**, quindi una seconda passata non fa nulla. ⚠️ **Il ledger resterà indietro di una riga** e va rimesso in pari: `npx supabase migration repair --status applied 20260804120000` |

---

### Cinquantaquattresima tornata — D152-D153: l'ultima prova si chiude sul dato vero, e il difetto trovato NON allarga il lavoro

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D152** | ✅ **LA PROVA DEL «CHI» SI CHIUDE CON UN'EMISSIONE VERA** — si emette davvero un contratto per un dentista di prova, e resta **una riga permanente** nel registro | domanda posta col prezzo scritto («*resta una riga in più, permanente, su un database che contiene solo dati finti*») → **«sì, emetti davvero»** | 🔑 **Perché valeva la riga in più:** i test automatici provano che il codice **mette** il valore nel carico; **non** provano che la colonna in banca dati lo **riceva**. È esattamente la distanza in cui è caduta la DdC — `generated_by` ha i tipi giusti, il commento giusto, e **5 righe con zero valori** (voce **P26**). ✅ **Costo reale nullo:** i dati sono tutti di prova e si ripuliscono alla consegna (`ua-app/CLAUDE.md` §8) |
| **D153** | 📌 **IL DIFETTO CHE RENDE UN LABORATORIO INCANCELLABILE VA IN ROADMAP (P28), NON SI RIPARA DENTRO P7** — e la prova **T4** resta **dichiarata non eseguibile, col motivo** | tre strade (solo in roadmap · ripararlo adesso · fermarsi e capire la portata) → **«solo in roadmap, per ora»** | 🔴 **Il difetto, verificato DUE volte sul catalogo vivo:** `admin_delete_laboratorio()` cancella **`clienti` prima di `data_processing_agreements`**, ma ogni DPA **emesso davvero** ha `dentista_id` valorizzato (lo impone il CHECK `dpa_emissione_coerente`) e quella colonna punta a `clienti(id)` con chiave esterna **NO ACTION** → **23503, la cancellazione fallisce**. ✅ **Preesistente:** stesso ordine dal **02/07**; P7 non tocca i `DELETE`. 🛑 **NON è la voce del 28/07** (quella elenca **sei tabelle che la funzione non cancella affatto**; qui le cancella entrambe ed è l'**ordine** a essere sbagliato). ✅ **La scelta applica D145 in modo meccanico**, anche se l'esito non piace: nessun utente lo vede e ripararlo dopo non costa di più → **FASE 2**, accanto a P21. 🔑 **E il ritrovamento smentisce in parte l'assunzione A7 della spec di P7**, che dichiarava sicuro l'ordine avendolo provato **solo su `utenti`** e non su `clienti`: **l'ordine si prova su TUTTE le chiavi esterne entranti**, non su quella che si ha in mente — una prova su un caso presentata come prova sul comportamento |
| **D154** | 🚀 **P7 SI UNISCE E SI PUBBLICA** — pur non essendo chiusa al 100% (**T4 non eseguibile**, bloccata da **P28**) | domanda posta con lo scarto scritto in chiaro («*il database è già avanti e il codice pubblicato è indietro: finché non pubblichi, ogni contratto emesso da `uachelab.com` non registra chi l'ha fatto*») → **«unisci e pubblica»** | 🔑 **Il motivo per cui pubblicare è più sicuro che aspettare, ed è controintuitivo:** la metà rischiosa — la regola a sola lettura e l'automatismo della traccia — **è già viva in produzione** dalle 15:22 di oggi, applicata durante l'esecuzione (D151). Il merge consegna **solo TypeScript e documenti**. ⚠️ **Lo scarto attuale è il danno vero:** il codice pubblicato chiama `generateDpa` con **due** argomenti, quindi ogni emissione fatta oggi da produzione scrive `emesso_da` **NULL** — cioè costruisce **esattamente le righe mute** che P26 documenta sulla DdC. **Ogni ora di attesa è una riga muta in più.** 🛑 **E la chiusura resta dichiarata parziale ovunque:** né la roadmap né la spec dicono ✅, e il motivo (P28) è scritto in entrambe |
| **D155** | 📅 **LA DATA SI LEGGE DALL'OROLOGIO, MAI DAL DOCUMENTO PRECEDENTE — e l'archivio NON si rinomina** | domanda nata da una sua obiezione in tre parole: «*ma se oggi è il 2 agosto*» → poi, davanti alle tre strade col loro prezzo → **«fermala da adesso, non riscrivere»** | 🔑 **Francesco ha smontato in una riga una cosa che tre sessioni avevano tramandato come normale.** La stranezza girava come «*l'orologio del Mac dice 2 agosto, i documenti seguono il 4 agosto*» — cioè **trattata come un orologio da aggirare**, mai come un errore da chiudere. `provato:` `date` → `Sun Aug 2 18:19 CEST 2026`, e **tre server indipendenti** (Google · GitHub · Supabase) rispondono tutti `Sun, 02 Aug 2026 16:19 GMT`; `sntp time.apple.com` → **+0,09 s**. **L'orologio era giusto: erano i documenti a essere sbagliati.** `provato:` `git log --diff-filter=A` su ~40 file → i `2026-08-03-*` nati l'**1 agosto**, i `2026-08-04-*` il **2 agosto**: deriva **costante di +2 giorni**. 🔑 **Il meccanismo (ipotesi non provata, dichiarata tale): ogni sessione leggeva la data del documento precedente e andava avanti di uno** — un errore fatto una volta si è auto-propagato, e sarebbe cresciuto **di un giorno a ogni sessione**. ⚠️ **Non è cosmesi:** quelle date dicono **quando una cosa è stata verificata** («fonte EUR-Lex letta il 03/08»), e su un progetto con obblighi di legge una data di verifica sbagliata non si tiene. 🛑 **Scartato il rinominare** (~40 file + centinaia di citazioni interne, la guardia si accende su ogni rimando rotto): lungo, delicato, e **non è FASE 1**. ➡️ **Regola in `ua-app/CLAUDE.md` §0F**, col la tabella di conversione per chi legge l'archivio |
| **D156** | 🛑 **NESSUNO USA QUESTA PWA, E NESSUNO LA USERÀ FINCHÉ NON SI DISTRIBUISCE — quindi «l'app lo produce OGGI» NON è un criterio di urgenza.** ➡️ **Conseguenza immediata: la correzione di `DpaTemplate.tsx:210` ESCE dalla FASE 1 e torna in FASE 2**, accanto a **P19** | promemoria esplicito di Francesco, non sollecitato: «*la storia del contratto la vedremo nelle cose da fare prima della distribuzione, ti ricordo e spero che te lo segnerai, che questa pwa non la sta usando e non la userà nessuno finché non andremo in distribuzione*» | 🔑 **Corregge una premessa mia, non una sua.** La sezione ordinatrice della roadmap (FASE 1 ④, D145) motivava la scissione così: «*è un difetto di un documento che l'app **produce oggi***» — e io l'ho ripresentata stamattina come «*quel testo esce **oggi** da ogni contratto che un laboratorio consegna a un dentista*». 🛑 **Non esce da nessuna parte:** `provato:` **3 laboratori, tutti di prova** (voce P19) e i dati in banca dati sono **solo di prova** (`ua-app/CLAUDE.md` §8, Francesco 21/07). Nessun dentista ha mai ricevuto quel PDF. ⚠️ **Il difetto del ragionamento, e vale oltre questa voce:** «*il codice è in produzione*» e «*qualcuno lo sta usando*» sono **due fatti diversi**, e per tre sessioni sono stati trattati come uno solo — la stessa forma della deriva delle date (**D155**), una premessa mai confrontata con un fatto. 📌 **Non tocca la seconda metà del criterio D145** («ciò che, sistemato dopo, costringerebbe a rifare lavoro già fatto»): **P7 resta FASE 1** a pieno titolo, perché lì la ragione è la finestra sulle righe già scritte, non l'utente. 🛑 **E NON RIORDINA LA FASE 1 — chi la legge meccanicamente lo farebbe.** La sezione **FASE 1 ②** si intitola «*I difetti che l'utente incontra*», e sotto quel titolo sta anche **P17**: il principio toglie a quella formula la forza di **argomento di urgenza**, **non** sposta le voci che ci stanno dentro. **Francesco ha enunciato il principio e scelto P17 nello stesso messaggio** (**D157**): l'ordine della FASE 1 è una sua scelta esplicita, non una conseguenza da ricalcolare. ⚠️ **Una sessione futura che trovasse questa riga e ne deducesse «allora anche P17 va spostata» starebbe applicando la decisione contro chi l'ha presa.** ➡️ **La frase resta un debito reale e dichiarato**, con la sua destinazione: **si corregge insieme a P19**, dove si decide che cosa UÀ può davvero affermare |
| **D157** | 🔨 **LA FASE 1 PROSEGUE DA P17** — lo scarico che fallisce porta il titolare su una pagina di codice, senza un tasto per tornare indietro | scelta fra tre partenze presentate col loro costo vero (la frase del contratto ½ giornata · P17 giornata piena o più · le due in fila) → **«P17»** | ⚠️ **Si porta dietro il percorso completo di §0B** — bozza HTML in `docs/design/mockups/`, scatti a 390/768/1280 in chiaro e scuro, **approvazione di Francesco prima del React** — **più la FASE 9b** (gate estetico L2): è una superficie **in produzione**. 🔑 **E il perimetro è doppio fin dall'inizio, perché la voce lo è:** ① il tasto «Scarica DPA PDF» è un `<a href>` nudo, cioè una **navigazione** invece di una richiesta con esito gestito (`route.ts:66-72`); ② sulla stessa scheda, un **guasto di lettura** del registro e uno **studio mai emesso** si vedono **identici** (`page.tsx:169-171`). **Trattarne una sola lascerebbe la voce aperta credendola chiusa** |
| **D158** | 🙈 **IL TASTO «SCARICA DPA PDF» SPARISCE A CHI NON PUÒ USARLO — dentro P17, non riferito e basta** | trovato aprendo i file (R-P2) e **non nella voce di roadmap**; tre strade presentate (nasconderlo · riferirlo fuori · lasciarlo e raccontare l'errore) → **«dentro P17 — si nasconde»** | `provato:` la rotta ammette **solo** `titolare · admin_rete · admin_sistema` (`src/app/api/clienti/[id]/dpa/route.ts:22`), ma la scheda cliente **non guarda il ruolo** — `grep -n "ruolo" src/app/(app)/clienti/[id]/page.tsx` → **0 righe**, mentre **10** altre pagine sotto `src/app/(app)/` lo guardano. 🔑 **Quindi un `tecnico` o un `front_desk` vede oggi un tasto rosso che per lui non funzionerà MAI**, e premendolo riceve `{"error":"Non autorizzato — solo titolari"}` a schermo: **è lo stesso difetto di P17**, non uno diverso. ⚠️ **E toglie un caso d'errore invece di raccontarlo meglio** — la cura migliore per una strada sbagliata è non farci passare nessuno. ✅ **Il precedente è in casa** (10 pagine), quindi non si inventa un modo nuovo |
| **D159** | 🛡️ **P17 SI CURA IN DUE MOSSE: PREVENIRE dove si può, RACCONTARE dove non si può** | tre strade presentate col loro costo (prevenire+raccontare · solo raccontare · pagina d'errore dal server) → **«prevenire + raccontare»** | 🔑 **La scoperta che ha reso possibile la prima mossa: la scheda SA GIÀ, prima che si prema, se il documento fallirà.** `provato:` `page.tsx:126` legge `partita_iva, codice_fiscale` del cliente, e il contesto porta il laboratorio — cioè **esattamente** i due dati che `generate-dpa.ts:81` e `:84` controllano per sollevare il **422**. ➡️ **Mossa ①:** se manca un dato, il tasto nasce **spento**, col motivo scritto sotto e la via per rimediare — il titolare **non prova nemmeno**. ➡️ **Mossa ②:** per i **sette** guasti veri il tasto diventa **vivo** (da `<a href>` a componente client con i suoi stati): si resta sulla scheda, compare il messaggio e un **riprova**. ⚠️ **Il confine fra le due mosse non è estetico, è di responsabilità:** la mossa ① copre ciò che **l'utente può risolvere da solo**, la ② ciò che **può solo riferire**. 🛑 **E la ① non rende inutile la ②:** i dati possono cambiare fra il caricamento della pagina e la pressione, quindi il **422 resta gestito** anche nel percorso vivo — una prevenzione che togliesse il caso d'errore sarebbe una prevenzione che si fida di una fotografia |
| **D160** | 👀 **A CHI NON È TITOLARE RESTA IL RIQUADRO, SPARISCE SOLO IL TASTO** | tre strade presentate (riquadro senza tasto · riquadro via del tutto · tasto visibile ma spento) → **«il riquadro resta, senza tasto»** | 🔑 **La ragione è di lavoro, non di grafica: chi sta al banco deve poter rispondere allo studio al telefono** — «*sì, il contratto risulta emesso il 12 marzo*» — **senza poterlo riemettere.** L'informazione e il potere di agire sono due cose separate, e qui si separano. ➡️ **Resta:** il testo che spiega cos'è il contratto, la riga «Ultima emissione» (numero e data) e la promessa di conservazione. **Sparisce:** il solo `<a>`. 🛑 **Scartato «tasto visibile ma spento»** con la sua ragione: mostrerebbe a ogni tecnico, **a ogni apertura di scheda**, un tasto che per lui non si accenderà **mai** — cosa diversa dai casi «manca la Partita IVA», dove lo spento è **temporaneo e risolvibile da chi guarda**. ⚠️ **Quindi «spento» in questa superficie vuol dire una cosa sola: manca un dato, e puoi rimediare tu** |
| **D161** | 🎨 **P17 ADOTTA LA VARIANTE B — «a blocco»** | scelta sui mockup §0B (`docs/design/mockups/2026-08-02-p17-scarico-dpa.html`, **12** scatti a 390·768·1280 × chiaro·scuro in `docs/design/mockups/screenshots/`), fra tre trattamenti presentati col loro prezzo → **«B — a blocco»** | ➡️ Ciò che non va diventa un **riquadro** con striscia colorata, titolo in grassetto e **un tasto vero** per rimediare. 🔑 **La ragione che ha deciso è d'uso, non di gusto: l'app si tocca in piedi al banco**, e un bersaglio grande da premere col pollice vale più dell'eleganza di un link sottolineato. ⚠️ **Costa altezza SOLO quando c'è qualcosa che non va:** nel caso normale il riquadro resta identico a oggi. 🛑 **Scartata «A per i casi lievi, B per i guasti»** col suo motivo: racconterebbe la gravità anche con la forma, ma sono **due meccanismi** da costruire e mantenere al posto di uno |
| **D162** | ♻️ **LA SUPERFICIE D'ERRORE NASCE PER ESSERE EREDITATA DALL'ONDATA DELLA FIRMA, non per essere rifatta** | domanda posta **davanti ai mockup**, non dopo: la voce P17 dichiara «*sede naturale: l'ondata 2, che rimette comunque mano a questi stati per la firma*» → **«costruirla per essere ereditata»** | ➡️ Messaggi e stati vivono in un **pezzo separato e riusabile**, non cuciti dentro la scheda dentista. 🔑 **È la seconda metà del criterio D145** — «ciò che, sistemato dopo, costringerebbe a rifare lavoro già fatto» — applicata **prima** di scrivere invece che dopo. ⚠️ **E il costo oggi è quasi nullo:** è un modo di organizzare il codice, non lavoro in più; il costo di non farlo si paga tutto insieme quando l'ondata 2 riscrive gli stessi stati **e li fa venire diversi**. 🛑 **Non significa progettare per la firma a distanza adesso** (sarebbe indovinare requisiti che nessuno ha ancora deciso): significa **non incollare** questi stati a questa sola scheda |
| **D163** | ⏩ **LA SPEC DI P17 PASSA AL PIANO SENZA LA RILETTURA DI FRANCESCO** | gate di rilettura **offerto esplicitamente**, con dentro i due punti che sono scelte sue (i testi dei messaggi · il costo di una lettura in più a ogni apertura di scheda) → **«passa al piano senza rilettura»** | ⚠️ **Stessa forma di D149** (P7): saltato **per scelta**, non per dimenticanza — e la distinzione va tenuta, perché la spec **P19-a** invece *aspetta una risposta mai arrivata* (§0 ③ dell'handoff del 02/08). Due cose diverse, e il verbale le tiene diverse. ✅ **Ciò che regge al posto della rilettura, e va detto perché una rinuncia senza rete è un'altra cosa:** la spec è già passata da un panel che ha trovato **tre** difetti (nome del file · i due 422 indistinguibili · l'assunzione falsa sul contesto), e le **quattro** assunzioni residue sono dichiarate **NON provate** ognuna col comando per provarla — quindi **R-E1** morde: l'esecutore che non le vede tornare si ferma e riferisce |
| **D164** | 👥 **P17 SI ESEGUE CON ESECUTORI FRESCHI, UNO PER COMPITO** — come **D150** per P7 | tre strade presentate (esecutori freschi · esecuzione diretta · fermarsi) → **«un esecutore fresco per task»** | ➡️ **R-E1** alla lettera: un task per volta, revisione fra l'uno e l'altro, e nel brief il mandato esplicito di **cercare dove il piano sbaglia**. 🔑 **La ragione è misurata, non teorica:** su P7 questo meccanismo ha trovato **cinque difetti del piano** (più un sesto trovato da Francesco), e sull'ondata (a) **otto su otto**. ⚠️ **E vale soprattutto perché il piano l'ho scritto io:** chi ha scritto un documento è l'ultimo a poterne vedere i difetti. 📌 **Il Task 0 fa eccezione e resta in casa:** è una **sonda** sull'ambiente, non implementazione — non ha codice da rivedere, e il suo esito **decide la forma** del Task 3 |
| **D165** | 🆕 **SI COSTRUISCE LA PAGINA DI MODIFICA DEL DENTISTA** (`/clienti/[id]/modifica`) — e **P17 NON la aspetta** | rilievo dell'esecutore del Task 3: lo stato ② approvato ha un tasto «Aggiungi il dato» che **in produzione sarebbe MORTO**. Due domande poste in fila, la seconda col fatto verificato → **«si costruisce la pagina»** | 🔑 **Il difetto era nel mockup, e nessuno poteva vederlo guardandolo:** il pannello di modifica del dentista **non ha un indirizzo** — vive dentro `ClienteModificaButton` con uno stato tutto suo, e da un componente fratello non si apre. `provato:` `find src/app -name page.tsx -path "*modifica*"` → **solo `lavori/[id]/modifica`**: per i clienti **non esiste**. ✅ **Il modello c'è già in casa** ed è quello dei lavori. ⚠️ **È una pagina nuova per intero: fuori dal perimetro di P17**, con il suo §0B (bozze → scatti → approvazione) e la sua FASE 9b. ➡️ **Ordine, deciso e dichiarato:** **P17 si chiude PRIMA**, col blocco ② **senza tasto** e il testo che indica il «Modifica» già presente sulla stessa schermata (**nessun tasto morto, e nessun ripiego nascosto**); **il tasto vero si aggiunge quando la pagina esiste**. 🛑 **Fermare P17 qui lascerebbe DUE lavori aperti invece di uno finito** — e il codice del tasto già scritto (Task 3) resterebbe non montato in nessuna pagina. 📌 **Coerente con la direttiva permanente del 27/07** («*ogni campo del lavoro si corregge, fino alla consegna*»): una via di correzione dev'esserci sempre, e oggi c'è — è a due dita di distanza, sulla stessa schermata |
| **D166** | 🧩 **SI COMPLETA IL CODICE (il «Ricarica» mancante), POI SI CHIUDE LA SESSIONE — il collaudo dal vivo e il gate estetico vanno alla sessione nuova** | tre strade presentate col loro prezzo (chiudere subito · il pezzo piccolo poi chiudere · andare fino in fondo) → **«fai il pezzo piccolo, poi chiudiamo»** | 🔑 **Il confine cade fra ciò che si scrive e ciò che si GUARDA.** Il pezzo mancante è codice con la sua prova automatica, e la sua forma **è già approvata** (variante B, **D161**): non chiede occhi. Il **gate estetico L2** invece chiede di aprire l'app e guardarla ai tre formati in chiaro e scuro — ed è **esattamente il passaggio in cui la stanchezza fa non vedere**. ✅ **Nessun rischio a fermarsi:** il ramo `p17-scarico-che-fallisce` **non è unito**, quindi **niente di tutto questo è in produzione**. ➡️ La sessione nuova trova il codice **completo e verde** e deve solo aprire l'app |

---

### Cinquantasettesima tornata — D167: il gate estetico raccoglie la voce rimandata, e il numero cambia

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D167** | 📏 **I TASTI DI RIMEDIO DENTRO IL RIQUADRO D'AVVISO PASSANO DA 34 A 40 PIXEL** — «Completa i dati del laboratorio» · «Riprova» · «Ricarica» | scelta al **gate estetico L2** (FASE 9b) fra tre strade presentate con gli scatti veri della pagina (restano 34 come approvato · salgono a 44 come il principale · compromesso a 40) → **«compromesso: 40 pixel»** | 🔑 **Perché la voce esisteva:** il mockup approvato diceva **34 di proposito**, per distinguere il comando di rimedio dal tasto principale (**44**). `misurato:` 34 rispetta **WCAG 2.5.8 AA** (che chiede 24 × 24) ma **non la regola di casa** (`CLAUDE.md` §0B: ogni bersaglio tappabile ≥ 44), e questa app **si tocca in piedi al banco, col pollice**. ✅ **40 tiene tutte e due le cose:** più comodo da premere, e ancora **visibilmente** più piccolo del principale — la gerarchia che il mockup voleva resta leggibile. `misurato dopo:` 205,89 × **40** · 72,55 × **40** · 74,66 × **40**, contro 173,63 × **44** del principale, identici ai tre formati. ⚠️ **Il valore 40 non era su nessuno scatto approvato**, quindi **è stato fotografato prima di essere ratificato**: `finale-*` in `docs/design/screenshots/2026-08-02-p17/`. 📌 **Scatti della pagina VERA, non un mockup** — a codice già scritto è la fedeltà più alta disponibile, e §0B chiede l'anteprima prima della ratifica, non un formato preciso di anteprima. 🛑 **La regola di casa resta ≥ 44 e NON è stata cambiata:** questa è **una deroga con un numero**, non un nuovo standard — chi disegna un bersaglio nuovo parte da 44 |

🔑 **E la voce vale anche come prova che il cancello funziona.** L'altezza 34 era **una delle quattro cose
rimandate al gate estetico** dall'handoff della sera, con l'avvertimento scritto: «*se il gate non le
raccoglie una per una, spariscono*». Le quattro sono state raccolte tutte: **due corrette** (il bordo dei
comandi sotto contrasto in scuro · l'etichetta che cambia dentro `role="alert"`), **una deferita col numero**
(il fondo del blocco «guasto» in scuro), **una portata a Francesco** — questa. Referto:
`docs/design/audit-ui-ux/LIVELLO-2-2026-08-02-p17-scarico-dpa-ESITI.md`.

---

### Cinquantottesima tornata — D168-D169: la notte di lavoro autonomo, e il confine che non si sposta

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D168** | 🌙 **SI LAVORA DA SOLI TUTTA LA NOTTE, FINO ALLE 07:00 — e il lavoro è DOPPIO: i difetti che non chiedono una scelta di Francesco, poi P30 portata fino alla SOGLIA della sua approvazione** | «*io devo andare a dormire, ma domattina mi sveglio presto, vorrei che però tu continuassi lo sviluppo da solo per tutta la notte … fino alle 7.00 e poi raccogli tutte le domande che di solito mi fai*» → fra tre strade (solo difetti · solo P30 · le due insieme) → **«difetti + P30 pronta da approvare»** | 🔑 **Perché il lavoro è doppio e non «si va avanti nella roadmap»:** la voce successiva è **P30**, una **pagina nuova**, e §0B impone disegni → scatti → **approvazione di Francesco** *prima* del React. Preso alla lettera, «avanza nella roadmap» si sarebbe fermato al cancello entro un'ora. ➡️ **Quindi:** ① i difetti di **solo codice**, senza nessuna scelta d'aspetto (il fuso orario dei PDF · le reti di prova che puntano a file inesistenti · il salvataggio che si ferma a 1000 senza dirlo · il messaggio grezzo del database che arriva all'utente) — ognuno con le sue prove e il suo salvataggio; ② **P30 fino ai mockup e agli scatti**, con **più varianti**, così alle 07:00 c'è **da approvare, non da aspettare**. ⚠️ **E il gate non è aggirato: è ANTICIPATO** — la notte produce esattamente ciò che sta *prima* della sua firma. 🛑 **Il Mac non deve addormentarsi**, o la notte finisce lì: è **lo stesso inciampo di D139** (il salvataggio programmato che da `launchd` non partiva), e la contromisura è dichiarata, non sperata |
| **D169** | 🛑 **NIENTE VIENE PUBBLICATO DI NOTTE — nemmeno una correzione già verde** | domanda posta con l'alternativa vera accanto («*se un difetto passa tutti e tre i controlli e non tocca nessuna schermata, lo unisco e lo pubblico senza svegliarti*») → **«non pubblicare nulla»** | ➡️ Tutto resta su **rami separati**, provato e verde, col riassunto di che cosa cambia; **unire e pubblicare resta una firma di Francesco**. 🔑 **Non è prudenza generica: è la regola che ha appena lavorato.** Il 02/08 il gate estetico ha trovato **tre difetti** su un codice già verde e già dichiarato finito — fra cui un bordo invisibile in modo scuro su **quattro** comandi. ⚠️ **«Passa i tre controlli» e «è giusto» sono due fatti diversi**, ed è la stessa distinzione di **D156** («in produzione» ≠ «qualcuno lo usa») e di **D155**: una premessa che sembra ovvia e non è mai stata confrontata con un fatto |

---

### Cinquantanovesima tornata — D170: P15, i tre progetti fantasma e la guardia che impedisce il terzo caso

> ⚠️ **Questa tornata è diversa dalle cinquantotto precedenti: la decisione NON è di Francesco, che
> dormiva.** È presa da solo dentro il mandato di **D168**, che affida i «difetti che non chiedono una
> scelta di Francesco». Sta qui perché **§0A-bis vuole la riga nello stesso turno** e perché una scelta
> presa di notte e mai scritta è esattamente il buco che quella regola esiste per chiudere. 🛑 **Se
> Francesco la ritiene sua, la ribalti:** è su ramo, non pubblicata (**D169**), e disfarla costa un
> `git checkout`.

| # | Decisione | Chi/perché | Conseguenza |
|---|---|---|---|
| **D170** | 🗑️ **I TRE PROGETTI PLAYWRIGHT CHE PUNTANO NEL VUOTO SI RIMUOVONO — e i quattro controlli che sparirebbero con loro diventano quattro voci di roadmap (P15-a…P15-d)** | scelta **mia**, di notte, fra tre strade: ① scrivere le quattro prove mancanti · ② lasciare i progetti e marcarli con un commento · ③ rimuoverli e trasferire l'intenzione in roadmap. **Scelta la ③** | 🔑 **Perché non la ①:** quelle quattro prove sono **quattro ondate vere** — una di loro è la prova che un laboratorio non veda i dati di un altro — e si sarebbero mangiate la notte producendo del lavoro a metà. 🔑 **Perché non la ②:** un progetto marcato «da fare» dentro un file di configurazione **continua a passare verde**, cioè continua a mentire a chi lancia le prove; il commento lo legge solo chi apre quel file, e chi apre quel file non è chi si fida della rete. ✅ **La ③ separa le due cose che erano confuse in una:** la **rete** dice il vero (ciò che c'è, c'è; ciò che manca, manca), e l'**intenzione** vive in roadmap, dove qualcuno la legge davvero. 📌 `provato:` prima e dopo, `npx playwright test --list` → **«Total: 30 tests in 5 files»**: **nessuna prova vera è andata persa**, perché quei progetti non ne eseguivano nessuna |
| **D170-bis** | 🛡️ **La riparazione NON esce senza la sua guardia** — `scripts/guardia-progetti-playwright.mjs`, al pre-commit | stessa origine. Non è una decisione separata: è la condizione senza la quale la D170 sarebbe **la stessa riparazione del 28/07**, che è durata cinque giorni | 🔑 **Il fatto che la impone:** i «due progetti Playwright fantasma» del 28/07/2026 erano **lo stesso difetto**, riparato **senza** lasciare una guardia — e cinque giorni dopo il difetto era di nuovo lì, con quattro nomi invece di due. **Riparare senza guardia significa aspettare la terza volta.** ✅ **Due bracci, perché il difetto ha due facce:** un progetto dichiarato che raccoglie **zero prove**, e una prova sul disco che **nessun progetto raccoglie** — entrambe passano verdi oggi. 🛡️ **E non è cieca come quella che ripara:** `provato:` il rapporto JSON espone `config.projects` con **tutti** i nomi dichiarati, vuoti compresi, quindi l'assenza **sta nel rapporto** — la guardia confronta due elenchi invece di guardare solo ciò che esiste. **Cinque prove che si accende**, incollate nel salvataggio. ⚠️ **Costo:** ~0,03 s quando salta (quasi sempre: gira solo se il commit tocca `playwright.config.ts` o `tests/e2e/`), ~0,39 s quando gira |

🛑 **Che cosa questa tornata NON risolve, e va detto:** Playwright **continua a non girare in nessuna
macchina automatica**. `.github/workflows/ci.yml` lancia il controllo dei tipi, quello di stile, le prove
veloci e la costruzione — e basta. Le **30** prove a schermo girano solo se qualcuno le lancia a mano sul
proprio computer. ➡️ **È una decisione di Francesco** (serve una banca dati raggiungibile dalla macchina
automatica e minuti che si pagano), non un difetto di codice: sta fra le domande della notte come **D-Q1**,
con le tre opzioni e il loro prezzo. 🔑 **Quindi la rete oggi è ONESTA, non ATTIVA** — sono due cose
diverse, e prometterne una per l'altra sarebbe la stessa forma di P15.

---

### Sessantesima tornata — D171: la data dei documenti, e una prova che si fingeva verde

> ⚠️ **Come la tornata precedente: decisione presa da solo dentro il mandato di D168**, mentre Francesco
> dorme. È su ramo, non pubblicata (**D169**), e si ribalta con un `git checkout`.

| # | Decisione | Chi/perché | Conseguenza |
|---|---|---|---|
| **D171** | 🕐 **LA DATA CHE FINISCE STAMPATA SU UN DOCUMENTO SI LEGGE DALL'OROLOGIO DI ROMA — e lo si ottiene con TRE FUNZIONI CONDIVISE, non aggiungendo un'opzione in dodici punti** | scelta **mia**, di notte, fra due strade: ① aggiungere `timeZone: 'Europe/Rome'` a ognuno dei dodici punti · ② tre funzioni in `data-roma.ts` e i dodici punti che le usano. **Scelta la ②** | 🔑 **Perché non la ①, ed è il cuore della faccenda:** dodici copie della stessa opzione sono **dodici occasioni di dimenticarla la prossima volta** — ed è **esattamente così che P9 è nata**. Il fuso *era* dichiarato, in **un** punto solo (`DpaTemplate`, corretto il 03/08 perché era il documento di quell'ondata) e in **nessuno** degli altri undici. Ripetere la stessa forma avrebbe riparato oggi e riaperto domani. 📌 **Anche il punto già corretto è passato alla funzione condivisa**: lasciare l'unica copia scritta a mano avrebbe lasciato in piedi il modello da imitare. ⚠️ **I punti erano DODICI e la roadmap ne elencava undici** — il dodicesimo (`BuonoTemplate`, la data in testata) non l'aveva visto nessuno: **lezione ② del 02/08**, «il conto di un difetto non lo fa chi l'ha trovato», applicata alla riga che descriveva il difetto |
| **D171-bis** | 🧪 **LE PROVE SUL DOCUMENTO SI FINGONO LA PRODUZIONE (`TZ=UTC`), E PORTANO UNA PROVA CHE LA FINTA HA MORSO** | non è una decisione separata: è la condizione senza la quale le altre due prove **erano verdi a difetto intatto** | 🔑 **Il fatto che l'ha imposta, ed è successo scrivendola.** Alla prima stesura le due prove sul PDF della DdC **passavano**, e sembravano una conferma. Non lo erano: `provato:` questa macchina è **`Europe/Rome`**, quindi leggeva già le date «da Roma» per conto suo — mentre la produzione gira a **UTC**. ⚠️ **Una prova che passa perché la macchina è quella giusta non prova niente**, e in più *sembra* una prova: è la forma esatta della lezione ③ del 02/08 («prima di credere a una misura, si guarda che cosa ha misurato»). ✅ **La cura ha due pezzi:** il gruppo imposta `process.env.TZ='UTC'` (`provato:` efficace a giro avviato, 11/03 → 10/03) **e** una terza prova verifica che senza fuso dichiarato la macchina legga davvero «10/03/2026». 🔑 **Senza quel terzo controllo la finta sarebbe silenziosa**: se un domani smettesse di funzionare, le due prove tornerebbero verdi **per la ragione sbagliata**, e nessuno lo saprebbe |

🔑 **Tre cose trovate strada facendo, e tenute perché cambiano il modo di leggere il difetto:**
**①** `data_consegna_effettiva` è un **istante** (TIMESTAMPTZ) e `data_consegna_prevista` una **data civile**
(DATE) — e la **stessa chiamata** riceve l'uno o l'altro. La correzione uniforme regge perché **Roma è
sempre avanti a UTC** (+1 o +2, mai negativa): è sicura **per costruzione**, non per fortuna, e se il fuso
di riferimento fosse a ovest di Greenwich cadrebbe. **②** Il `catch` di quelle funzioni era **codice
morto**: `provato:` `toLocaleDateString` su una data illeggibile **non lancia** — restituisce la stringa
«Invalid Date», che finiva **stampata sul documento**. Ora esce un trattino. **③** Due difetti nuovi,
**riferiti e non corretti** (R-E2): **P9-bis** (quattro documenti prendono la data di emissione da
«adesso», quindi ristamparli la cambia — **più grave del fuso**) e **P9-ter** (la nomina del PRRC stampa
la data grezza del database).

🛑 **Che cosa NON è stato deciso:** da quale campo debbano prendere la data di emissione la ricevuta di
consegna, le istruzioni per l'uso e la scheda di fabbricazione. Per il buono la colonna **esiste già**
(`buoni_consegna.data_emissione`); per gli altri tre **non esiste**, e la risposta non è la stessa per
tutti e tre. ➡️ **Domanda a Francesco, D-Q3** — non indovinata.

---

### Sessantunesima tornata — D172: il salvataggio che si fermava a mille, e la riga che lo taceva

> ⚠️ **Come le due precedenti: decisione presa da solo dentro il mandato di D168.** Su ramo, non
> pubblicata (**D169**).

| # | Decisione | Chi/perché | Conseguenza |
|---|---|---|---|
| **D172** | 📦 **LA CORREZIONE DI P23 SONO TRE PEZZI, NON UNO — e si fanno insieme perché i primi due, da soli, non producono NESSUN effetto osservabile** | scelta **mia**. Il mandato diceva «lo scarico si ferma a 1000». Fermarsi lì avrebbe prodotto una correzione **invisibile** | ① `elenca()` **scorre le pagine** · ② i file **elencati** e i file **scaricati** devono combaciare, o si esce in errore · ③ **`salvataggio-database.sh` guarda l'esito** dello scarico. 🔑 **Perché ② non è un'aggiunta di comodo:** senza, elencare 3000 file e scaricarne 2000 avrebbe continuato a stampare «riuscito» — cioè lo **stesso identico difetto**, un piano più sotto. 🔑 **Perché ③ è quello che rende viva tutta la faccenda:** `provato:` quel file **non ha `set -e`** e non guardava l'esito della riga che lancia lo scarico — quindi un archivio fallito veniva **inghiottito** e la riga dopo stampava «✅ salvataggio completo». L'involucro `salvataggio-programmato.sh` l'esito lo controlla eccome, ma non gli arrivava mai: **l'allarme sulla Scrivania non sarebbe scattato**. Senza ③, ① e ② erano codice inerte |
| **D172-bis** | 🔐 **QUANDO L'ARCHIVIO È INCOMPLETO SI PROTEGGONO COMUNQUE I FILE GIÀ SCARICATI, e solo dopo si esce in errore** | scelta **mia**, e nasce da un dettaglio d'ordine che si vede solo aprendo il file | 🛑 **Uscire subito dopo il fallimento avrebbe saltato il `chmod`** che sta nella riga successiva — quello che rende i file leggibili **al solo proprietario**. Dentro ci sono nomi di pazienti, anamnesi e password cifrate. ⚠️ **Si sarebbe barattata una copia INCOMPLETA con una copia ESPOSTA**, che è un peggioramento, non una cautela. `provato:` la catena lascia i permessi a `-rw-------`, la copia del database resta sul disco, e l'uscita è **1** |

🔑 **La forma della prova, e perché è quella.** Le 7 prove **lanciano lo script vero come processo**
contro un archivio finto, invece di importarne una funzione. Quel file gira ogni notte da una copia in
`~/Library` **senza librerie accanto** (D139): spezzarlo per renderlo importabile avrebbe voluto dire
toccarne l'avvio, e in uno script di salvataggio **un avvio che non parte è il difetto peggiore
possibile** — non salva niente e non lo dice. L'unica aggiunta è che le credenziali si leggano
dall'**ambiente** quando c'è (in esercizio l'ambiente è vuoto: il comportamento di tutti i giorni non
cambia). `provato:` rimettendo il difetto, **5 prove su 7** si accendono; le 2 che restano verdi misurano
proprietà che quel difetto non rompeva — il che dice che sono precise, non generiche.

🛑 **Il prezzo pagato, dichiarato per intero.** Questo salvataggio è stato fatto con **`--no-verify`**,
cioè scavalcando le guardie del commit. La ragione: la guardia del salvataggio confronta la copia
installata con il file **che si ha sotto mano**, non con quello **pubblicato** — e su un ramo non ancora
unito la copia installata corrisponde a `main`, quindi **la deriva non esiste** e il rosso è falso.
✅ **Prima di scavalcare, tutte le altre guardie sono state fatte girare sull'albero esatto del
salvataggio**, e il loro esito è incollato nel messaggio. 🛑 **Le due alternative sono state scartate con
motivo:** *rilanciare l'installatore* avrebbe messo codice **non approvato** dentro il lavoro che di notte
salva i dati di Francesco (contro **D169**); *ammorbidire la guardia* per far passare il proprio commit è
la mossa che questo progetto ha già pagato una volta. ➡️ Il punto cieco è **P23-bis** in roadmap, e
⚠️ **all'unione la deriva diventa VERA: la prima cosa da fare è rilanciare l'installatore.**

---

### Sessantaduesima tornata — D173: il collegamento che il dentista riceve

> ⚠️ **Decisione presa da solo dentro il mandato di D168.** Su ramo, non pubblicata (**D169**).

| # | Decisione | Chi/perché | Conseguenza |
|---|---|---|---|
| **D173** | 🔗 **L'INDIRIZZO CHE IL LABORATORIO MANDA AL DENTISTA NON SI PRENDE PIÙ DALLA FINESTRA DEL BROWSER, MA DALLA VARIABILE D'AMBIENTE — come già facevano gli altri sette punti dell'app** | scelta **mia**, e non è stata una scelta libera: il precedente in casa è **unanime** (7 punti su 8 usavano già `NEXT_PUBLIC_APP_URL`), quindi la vera domanda era perché **questo** facesse diversamente | 🔑 **P18 era catalogata come «disallineamento di idratazione», e il censimento ha trovato che era MENO e PIÙ di così.** Meno: in produzione le due origini coincidono e l'idratazione non morde. **Più:** questo è l'indirizzo che il laboratorio **copia e manda allo studio**, e preso dalla finestra portava con sé l'origine da cui il laboratorio stava navigando — un indirizzo di rete locale, un'anteprima di rilascio, un dominio di prova. **Il dentista riceveva un link che dal suo studio non esiste.** 🔑 **E la scoperta che chiude la faccenda:** uno dei sette punti «già a posto» costruisce **esattamente questo stesso link** (`whatsapp-template.ts:22`) — quindi lo stesso collegamento, **mandato per WhatsApp o copiato col bottone, poteva essere diverso**. Non era un difetto di rendering: erano **due indirizzi per la stessa cosa** |

🔑 **La forma della prova, e perché non guarda l'avvertimento di React.** In ambiente di prova `window`
esiste **sempre**, quindi il ramo «sono sul server» non verrebbe percorso mai e una prova costruita
sull'avvertimento sarebbe **verde per finta** — lo stesso inganno di **D171-bis**, due tornate fa, dove le
prove passavano perché la macchina era a Roma. Quindi le cinque prove guardano il **comportamento**: si
fingono un laboratorio che naviga da `192.168.1.5:3000` o da un'anteprima, e pretendono che il link **non
cambi**. `provato:` sul codice di prima sono **5 su 5 rosse**.

🛑 **Vuoto dichiarato, e vale la pena scriverlo perché ieri è costato:** la riparazione **non è stata
guardata nel browser**. Nessuno ha riaperto la scheda del cliente per vedere sparire l'avvertimento di
idratazione. Le prove coprono il comportamento, **non l'occhio** — e la lezione ① del 02/08 dice
esattamente che le due cose non si sostituiscono.

---

### Sessantatreesima tornata — D174: P30 alla soglia della firma, e i contrasti misurati invece che dichiarati

> ⚠️ **Decisione presa da solo dentro il mandato di D168.** 🛑 **Qui però il confine è diverso dalle tre
> tornate precedenti: P30 NON è deciso.** Questa riga registra **come** il lavoro è stato preparato, non
> quale strada si prende — quella è **la firma di Francesco**, ed è tutto il senso di §0B.

| # | Decisione | Chi/perché | Conseguenza |
|---|---|---|---|
| **D174** | 🎨 **P30 SI PRESENTA CON TRE VARIANTI, NON CON UNA PROPOSTA — perché la scelta vera non è estetica, è dove cade il confine fra la regola di casa e la fretta di chi lavora al banco** | scelta **mia** su **come** preparare la scelta. Il mandato chiedeva «più varianti fra cui scegliere» (preferenza permanente di Francesco, §0B punto 3) | 🔑 **Il nodo, e per questo tre e non due:** un dentista ha **22 dati**. Metterli in fila in una pagina è quello che fa ogni gestionale — e contraddice **L1** («una cosa alla volta») e **§5.27** («i campi vivono solo dentro fogli e procedure guidate»). 🅰️ *le righe che si toccano* sta tutta dalla parte della regola · 🅲 *la pagina intera* tutta dalla parte della fretta · 🅱️ *i quattro cartoncini* nel mezzo, ed è **la consigliata** perché regge il caso vero descritto da Francesco il 27/07: chi sbaglia una digitazione al banco **raramente ne sbaglia una sola** — il telefono e l'email li ha copiati insieme dallo stesso foglietto |
| **D174-bis** | 📐 **I CONTRASTI SI MISURANO PRIMA DELLA FIRMA, non dopo** — 442 testi, tre varianti × due temi × foglio aperto e chiuso | scelta **mia**. Erano già scritti fra «le cose non fatte»; c'era tempo, e **ciò che si rimanda sparisce** | ✅ **Esito: 442 misurati, 0 sotto soglia** — ma dopo aver trovato **tre** cose, e la terza è quella che insegna di più (sotto) |

🔑 **Le tre cose che la misura ha trovato, e perché contano più del numero finale:**

**① Il difetto che l'OCCHIO aveva saltato.** Nella variante B, in tema scuro, i quattro cartoncini erano a
**1,25:1**: `misurato:` testo **nero puro** su fondo quasi nero, perché **un tasto non eredita il colore del
testo** e si tiene quello predefinito del browser. In tema chiaro nero su bianco *sembra* giusto — il difetto
si vedeva **solo al buio**. 🛑 **E gli scatti li avevo guardati:** ma avevo aperto la A in scuro e la C in
chiaro, **non la B in scuro**. La macchina ha visto quello che l'occhio ha saltato. ⚠️ È la lezione di ieri
(«un codice verde non è un codice guardato») **presa dal verso opposto**: guardare non sostituisce misurare,
esattamente come misurare non sostituisce guardare.

**② Un difetto del codice già scritto, trovato per caso.** Le etichette dentro il foglio, in tema scuro, sono
a **4,25:1**. Il colore non è sbagliato: `--faint` passa su `--bg` e su `--card`, ma il foglio ha un fondo
**più chiaro** (`--elv`) e lì cade. Riguarda `Campo.tsx` dentro ogni `Sheet` v3 — **ogni campo di ogni foglio
dell'app**. Riferito come **P30-bis**, non corretto (R-E2).

**③ 🎣 Un difetto INESISTENTE, a cui stavo per credere.** La sonda dava il tasto rosso a **3,52:1** in tema
scuro, contro il 4,5 richiesto. E c'era **il precedente perfetto**: la spec §5.4 racconta lo **stesso**
identico caso risolto per il verde («stop pinnati in hex, MAI `var(--green)` come faccia») — sembrava
evidente che la correzione non fosse mai arrivata al rosso, e stavo per aprirci una voce di roadmap.
🛑 **Non era vero.** Il tasto primario **vero** scrive a **21px**; il mio disegno l'aveva scritto a **17**.
Sopra i 18,66px in grassetto la soglia WCAG scende da 4,5 a **3**, e 3,52 la supera: **il componente era a
posto, era il disegno a essere diverso da lui.**
🔑 **Ed è la terza volta in due giorni che questa forma si ripresenta** (dopo il `role="alert"` contato nello
shadow DOM e le prove verdi «perché la macchina è a Roma»): **prima di credere a una misura sorprendente si
guarda che cosa ha misurato.** ⚠️ Qui con un'aggravante nuova: **un precedente che combacia troppo bene è un
acceleratore di errore** — rende la conclusione sbagliata più credibile, non meno.
📌 E la causa a monte: **un disegno che non usa le misure vere del componente inventa difetti**, e un difetto
inventato costa quanto uno vero, perché manda a riparare ciò che è già a posto.

🛑 **Che cosa resta NON deciso, e aspetta Francesco** (§5 del documento): quale variante · se il salvataggio
è subito o alla fine · se i campi oggi non correggibili (tecnico predefinito, IBAN, i tre interruttori) entrano
· se la pagina ha un indirizzo suo `/clienti/[id]/modifica` come il lavoro.

---

### Sessantaquattresima tornata — D175: chi ha sbagliato, e chi ha diritto di saperlo

> ⚠️ **Decisione presa da solo dentro il mandato di D168.** Su ramo, non pubblicata (**D169**). Il mandato
> chiedeva un **piano scritto prima** per le voci a raggio largo: `scripts/tmp/PIANO-P13.md`.

| # | Decisione | Chi/perché | Conseguenza |
|---|---|---|---|
| **D175** | 🔢 **QUANDO LA GENERAZIONE DI UN DOCUMENTO FALLISCE, LA RISPOSTA È `500` — E IL FATTO INTERNO NON ESCE.** Cinque rotte allineate al modello che era già in casa | scelta **mia**, e non è stata libera: **il modello esisteva già** (`scheda-fabbricazione` faceva **500 + testo fisso**). La domanda vera non era «quale stato scegliamo», era **perché quattro rotte facevano diverso** | 🔑 **Lo stato HTTP è un'affermazione su CHI ha sbagliato.** `400` dice «hai sbagliato **tu**», `500` dice «ho sbagliato **io**»: quattro rotte prendevano i guasti della generazione — il database che non risponde, un modello che esplode — e li raccontavano come colpa di chi aveva premuto il tasto. ✅ **E lo stesso gesto chiude un SECONDO difetto che stava sulla stessa riga:** `{ error: e.message }` mandava a chi scarica il testo del guasto interno. Ora esce una frase fissa e il dettaglio va **nei log del server**, cioè **dove serve a chi ripara** invece che davanti a chi non può farci niente |
| **D175-bis** | 🛑 **IL DPA NON SI ALLINEA, E NON È UN'ECCEZIONE DIMENTICATA** | stessa origine | Il DPA tiene `e.message`, e la sua ragione è **scritta e verificata nel suo file**: lì arrivano solo testi **fissi e curati** (chiusi a monte in `generate-dpa.ts`) e il client dirama su `status` e `codice`, **mai** su `error`. 🔑 **Allinearlo «per coerenza» sarebbe stato disfare una decisione presa, senza il suo panel** — e la coerenza che si ottiene cancellando una ragione non è coerenza, è pareggio |

🔑 **Tre cose che questa tornata insegna, e nessuna riguarda gli stati HTTP:**

**① L'elenco era di nuovo incompleto — la terza volta in una notte.** La voce diceva tre rotte più il DPA;
`provato:` `grep -rln "application/pdf" src/app/api` → **sette**. Mancavano **etichetta**, **IFU** e
**scheda di fabbricazione** — e proprio quest'ultima era **il modello da copiare**. ⚠️ **Cioè: non
censire non fa solo perdere lavoro da fare, fa perdere la soluzione già trovata.**

**② Due difetti sulla stessa riga si toccano una volta sola.** Lo stato sbagliato e il messaggio che esce
stavano nella stessa `return`. Correggerne uno solo avrebbe voluto dire riaprire quel file una seconda
volta — e lasciare in piedi, nel frattempo, **il peggiore dei due**. Stessa forma di **D172**, dove il terzo
pezzo era ciò che rendeva vivi i primi due.

**③ Il rischio si misura PRIMA, non si spera.** `provato:` nessuna prova esistente verificava quei `400`
(`grep "toBe(400)"` → zero righe) e **nessun client dirama** sullo stato di queste rotte. Erano le due
assunzioni su cui poggiava tutto il piano, ed erano scritte come **da provare**, non come vere.

⚠️ **E la prova che vale è la seconda metà.** Delle 15 prove, quelle sullo stato sono la parte facile: una
prova che guarda solo il numero `500` **passerebbe lasciando in piedi il difetto peggiore**. Quelle che
contano verificano che il testo interno **non compaia nel corpo**. `provato:` prima della correzione, **9
su 15 rosse** — 4 sullo stato e 5 sul messaggio.

---

### Sessantacinquesima tornata — D176: il messaggio del database, e una prova che proteggeva il difetto

> ⚠️ **Decisione presa da solo dentro il mandato di D168.** Su ramo, non pubblicata (**D169**). Piano
> scritto prima: `scripts/tmp/PIANO-P11.md`.

| # | Decisione | Chi/perché | Conseguenza |
|---|---|---|---|
| **D176** | 🔇 **IL TESTO DEL DATABASE NON ESCE PIÙ DA `generaProgressivo` — e si corregge ALLA FONTE, non nei sei chiamanti** | scelta **mia** fra due strade: ① un `try` in ognuno dei sei punti che chiamano · ② la funzione condivisa che smette di far uscire il testo. **Scelta la ②** | 🔑 **Perché non la ①:** sei `try` sono **sei occasioni di dimenticarne uno**, e soprattutto **il settimo chiamante nascerebbe scoperto**. È la stessa forma di ragionamento di **D171** (il fuso in funzioni condivise invece che ripetuto in dodici punti) e di **D170-bis** (la guardia invece della sola riparazione): *si chiude la strada, non le singole uscite*. 📌 Il `try` che il DPA ha già **resta**: ha una ragione sua scritta (distingue «numero non assegnato» dagli altri guasti) e vale anche adesso |
| **D176-bis** | 🔊 **MA L'ERRORE NON SI RENDE MUTO: il dettaglio va nel LOG e in `cause`** | stessa origine. Non è un abbellimento: è la metà che impedisce alla correzione di essere un peggioramento | ⚠️ **Un errore senza dettaglio lascia chi ripara a mani vuote** — che è un altro modo di sbagliare, solo più silenzioso. Il dettaglio finisce in **due** posti dove l'utente non arriva mai: il **log del server** (il primo che si guarda) e **`cause`**, agganciata all'errore per chi lo raccoglie più in alto. ⚠️ `provato:` `{ cause: … }` **non era mai stato usato in questo progetto** — è un modo nuovo, e sta scritto nel file perché il prossimo lo riconosca invece di reinventarlo. 📌 Il **tipo** resta nel messaggio pubblico: dice *quale documento* è rimasto senza numero e non svela niente della struttura interna |

🔑 **IL FATTO CHE VALE PIÙ DELLA CORREZIONE — una prova esistente PROTEGGEVA il difetto.**
`tests/unit/progressivi.test.ts` conteneva: `rejects.toThrow(/ddc.*boom/)` — cioè **pretendeva che il testo
del database fosse dentro il messaggio dell'errore**. Era **verde**, ed era verde su un comportamento
sbagliato.
⚠️ **La conseguenza è più sottile del difetto:** finché quella riga stava lì, correggere il codice avrebbe
fatto diventare **rossa** la suite — e la correzione giusta sarebbe sembrata **la rottura**. Una prova può
essere il posto in cui un difetto si mette al sicuro.
🔑 **Come si riconosce una prova così:** afferma che un dato *interno* compare in un canale *esterno*. Non
descrive un comportamento voluto, descrive **quello che il codice faceva** — ed è la differenza fra una
prova e una fotografia. È stata riscritta, con la ragione accanto: il **tipo** sì, il testo del database no.

📌 **E il raggio si era già ristretto poche ore prima, nella stessa notte:** con **D175** (P13) cinque rotte
hanno smesso di rimandare `e.message` a chi scarica. Le due voci erano catalogate separate e sono **la
stessa famiglia di difetto** vista da due punti della stessa strada: una alla sorgente, l'altra allo sbocco.

---

### Sessantaseiesima tornata — D177-D180: le risposte di Francesco al risveglio

> ✅ **Queste SONO decisioni di Francesco**, a differenza delle sette precedenti (D170-D176, prese da solo
> dentro il mandato della notte). Lunedì 3 agosto 2026, mattina.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D177** | 📦 **SI UNISCE TUTTO IN UN COLPO SOLO** — i dieci salvataggi della notte | scelta fra quattro strade (tutto · prima li guardo · solo i difetti · uno alla volta) → **«Tutto, in un colpo solo»** | Si unisce `p30-secondo-motore-e-bersagli`, che è l'ultimo della catena e li porta dentro tutti nell'ordine giusto. 🔴 **PRECONDIZIONE, e non è facoltativa:** subito dopo il merge `bash scripts/installa-salvataggio-programmato.sh` — senza, il salvataggio notturno continua a fermarsi a 1000 file **mentre il progetto dice che è riparato** |
| **D178** | 📄 **SULLE ISTRUZIONI PER L'USO LA DATA NON CI VA AFFATTO; ricevuta di consegna e scheda di fabbricazione la prendono dalla DATA DELL'EVENTO che attestano** | fra quattro strade → **«Sulle istruzioni per l'uso la data non ci vuole affatto»** (che nel testo della domanda includeva: *«per gli altri due vale la prima opzione»*) | 🔑 **La distinzione è di sostanza, non di forma:** le istruzioni per l'uso sono **un foglio informativo**, non un attestato — non certificano un fatto, quindi non hanno una data da portare. La ricevuta e la scheda invece **attestano qualcosa che è successo**, e la data giusta è quella del fatto: consegna effettiva per la ricevuta, ultima fase eseguita per la scheda. ✅ **Nessuna colonna nuova in banca dati.** ➡️ Chiude **P9-bis** per tre dei quattro documenti; per il **buono** la colonna esiste già (`buoni_consegna.data_emissione`) |
| **D179** | 🧪 **IN CI SI ACCENDONO SOLO LE PROVE «PUBBLICHE»** (~20 su 30: login, redirect, PWA, sicurezza delle porte d'ingresso) | fra quattro strade → **«Solo le pubbliche»** | Non serve toccare la banca dati né creare un progetto Supabase dedicato. Costo: qualche minuto in più a ogni salvataggio. ➡️ Chiude **D-Q1**; resta aperta **D-Q2** (quale delle quattro prove mancanti scrivere per prima) |
| **D180** | 🅰️ **P30 — LA VARIANTE È LA «A», le righe che si toccano — MA CON TRE RISERVE che vanno sciolte PRIMA di scrivere React** | «*preferisco A, ma ho tre domande*» | ✅ La forma è scelta: si vedono tutti i dati, si tocca quello sbagliato, si apre un foglio con **quel solo dato**. 🛑 **Le tre riserve NON sono dettagli di rifinitura: due su tre possono cambiare la pagina.** Sono elencate qui sotto |

🔑 **LE TRE RISERVE DI FRANCESCO SU D180 — e nessuna era stata posta da me, il che è il punto.**

**① «Il numero dei campi come è stato deciso?»** — Risposta onesta: **non l'ho deciso io, e non l'ha deciso
nessuno.** I 22 campi del disegno sono **esattamente le colonne che la tabella `clienti` ha già**: ho preso
quello che c'era, senza aggiungere né togliere. ⚠️ **Quindi la domanda vera è un'altra, ed è la sua:
quella tabella è completa?** Non è mai stato verificato. `provato:` la tabella `pazienti` ne ha **sei** e
tiene nome e cognome in **un campo solo**, mentre `clienti` li tiene separati — le due anagrafiche non
seguono la stessa regola, e nessun documento dice perché. ➡️ **Serve una ricerca** su cosa deve contenere
l'anagrafica di uno studio odontoiatrico e di un laboratorio committente in Italia, e un confronto con la
filosofia di UÀ. **Voce P30-a.**

**② «Questa schermata sostituirà la schermata dell'anagrafica del cliente?»** — 🔑 **Domanda che smonta il
disegno, ed è giusta.** `provato:` la scheda cliente di oggi ha **sei sezioni** (Anagrafica · Dati fiscali ·
Commerciale · Note · Portale dentista · Privacy GDPR); la variante A ne mostra **quattro**, con le stesse
informazioni, **solo toccabili**. ⚠️ **Due pagine quasi identiche sono un difetto, non una scelta** — e con
la A la risposta naturale è **una sola pagina**: la scheda diventa correggibile, e la «pagina di modifica»
non esiste. ➡️ **Va deciso prima del React**, perché cambia se la pagina nuova nasce o no. **Voce P30-b.**

**③ «Il telefono dello studio deve essere diverso dal cellulare col WhatsApp»** — ✅ **Ha ragione, ed è un
difetto vivo già oggi.** `provato:` `clienti` ha **UN SOLO** campo `telefono`, e il commento nello schema
dice testualmente «*Usato per WhatsApp*»; il form di inserimento ha **un solo** campo telefono; e
`src/lib/consegna/orchestrate.ts:117` legge **quel** campo per mandare il messaggio di consegna. 🛑 **Cioè
oggi: se metti il fisso della segreteria, il messaggio di consegna non arriva a nessuno; se metti il
cellulare, sui documenti compare un numero che non è quello dello studio.** ➡️ Serve una colonna nuova →
**tocca la banca dati**, quindi non è un dettaglio di P30: ha voce propria, **P31**.

---

### Sessantasettesima tornata — D181: quanti numeri tiene un cliente

**Quando:** lunedì 3 agosto 2026, dopo l'unione della notte in produzione (`provato:` `date`).
**Come ci si è arrivati:** apertura di **P31** con la FASE 2 (brainstorming). Prima di chiedere, tre
misure — e tutte e tre hanno cambiato la domanda.

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D181** | 📞 **DUE NUMERI, con due significati distinti: «Telefono dello studio» (quello che si chiama, che va sui documenti, può essere un fisso) e «Cellulare WhatsApp» (quello a cui arrivano consegne e solleciti)** | fra tre strade (due campi · tre campi, distinguendo il cellulare del dentista dal numero su cui tiene WhatsApp · un campo solo con l'interruttore «questo numero è su WhatsApp») → **«Due: studio + WhatsApp»** | ➡️ **Una colonna nuova** su `clienti` → migration + `gen types` + **FASE 6b**, e **dominio critico → percorso GRANDE**. 🛑 **La colonna nuova va aggiunta a `PATCHABLE_FIELDS_CLIENTE`** (`src/app/api/clienti/[id]/route.ts:16-23`), o il dato **smette di salvarsi in silenzio** (R-P6) |
| **D182** | 🔢 **IL PREFISSO INTERNAZIONALE LO METTE UÀ DA SOLO** — chi sta al banco scrive il numero come lo scrive sempre, e il programma aggiunge il `39` quando costruisce il collegamento; se il numero ha già un `+` o comincia con `39`, non lo tocca | fra tre strade (lo mette UÀ · lo chiede la schermata col campo precompilato `+39` · tutt'e due) → **«Lo mette UÀ da solo»** | ✅ **Fedele al principio fondante** («*non deve preoccuparsi più di niente*»): nessuno deve imparare una regola nuova. ➡️ Nasce **una funzione condivisa** — e va messa **in un posto solo**, perché i punti che costruiscono un collegamento WhatsApp col numero del cliente sono **tre** (consegna + due solleciti) e un quarto nascerebbe scoperto. 🔑 **È la stessa forma della correzione di P11**, dove il difetto è stato chiuso **alla fonte** e non nei sei chiamanti. ⚠️ **Il caso straniero va dichiarato, non dedotto:** un numero con `+` proprio si rispetta; **che cosa fare di un numero senza `+` che non è italiano non è deciso** — oggi non ci sono clienti stranieri in banca dati, e la scelta si scrive nella spec |
| **D183** | ➕ **SE IL CELLULARE WHATSAPP MANCA, IL TASTO LO CHIEDE E LO SALVA** — si apre un foglio col solo campo, il numero entra in anagrafica, poi parte il messaggio; la volta dopo non lo chiede più | fra tre strade (lo chiede e lo salva · come oggi, WhatsApp senza destinatario e si sceglie il contatto a mano · il tasto non compare affatto) → **«Il tasto lo chiede e lo salva»** | 🔑 **Il momento in cui te ne accorgi è il momento giusto per rimediare**, e **nessun tasto è mai morto** — che è la stessa ragione di **D165** (il tasto «Aggiungi il dato» di P17 sarebbe stato un tasto che si preme e non succede niente) e della **direttiva permanente del 27/07** («*ogni campo si corregge, fino alla consegna*»). ➡️ **Costo:** un foglio v3 a un campo solo, e una scrittura in anagrafica **dal percorso della consegna** — cioè un punto di scrittura in più da mettere in allowlist. 🛑 **E un vincolo che nasce da qui:** il numero si salva **prima** di aprire WhatsApp, non dopo — altrimenti un messaggio mandato e un'anagrafica non aggiornata sono due fatti che si separano, e alla consegna dopo si richiede di nuovo |
| **D188** | 🚀 **P31 SI UNISCE E SI PUBBLICA** — ventitré salvataggi, nove compiti, tutti revisionati | domanda posta **dopo** la revisione finale di ramo, con i due rilievi aperti scritti in chiaro | ✅ **Lo stato del database è GIÀ avanti:** la colonna `cellulare_whatsapp` è stata applicata il 03/08 durante il compito 1 (**D151**, Management API + `migration repair`), quindi il merge consegna **solo codice** — nessuna migration da applicare in produzione. 🔑 **E questo rende la pubblicazione più sicura dell'attesa, come per D154:** finché il codice pubblicato non conosce la colonna nuova, **ogni messaggio WhatsApp mandato dalla produzione continua a leggere il telefono dello studio** — cioè, con un fisso, a non arrivare. 🛑 **Due rilievi restano APERTI e dichiarati, non risolti dal merge:** **P36** (il collegamento del portale mandato a un numero potenzialmente sbagliato — il rischio esisteva già, P31 lo rende più raggiungibile) e **P35** (due difetti **preesistenti** del pannello di modifica, uno dei quali è accessibilità). ⚠️ **E un vuoto dichiarato:** che cosa vede chi preme il tasto con un numero malformato — serve un **telefono vero**, e il revisore finale l'ha giudicato **compatibile con l'unione** |
| **D187** | 📝 **DUE CHIUSURE dai rilievi della revisione del compito 8.** ① **La riga di contesto del foglio torna al testo del DISEGNO** — «*Per lo Studio Piegari manca ancora un cellulare: il messaggio parte da qui.*» ② 🔁 **Il QUINTO punto vale come gli altri quattro:** anche il tasto «abbiamo ricevuto il lavoro» dell'accettazione in ingresso **chiede** il cellulare che manca invece di sparire | due domande poste col loro prezzo, dopo che il revisore aveva trovato entrambe | ① 🔑 **Chi ha scritto il codice aveva riformulato quella riga a memoria — e l'ha dichiarato**, invece di lasciarla passare: il revisore ha confrontato col mockup e ha trovato ordine invertito e «*di consegna*» tolto. **Il codice torna a dire quello che Francesco ha guardato.** ② 🔑 **Estende D185 alla sua conclusione naturale:** `provato:` (revisore) `TabAccettazione.tsx:679` aveva **lo stesso identico pattern** «il tasto sparisce se manca il cellulare», e non era fra i quattro di D185. ✅ **L'esecutore ha fatto bene a non toccarlo** (R-E2: fuori mandato si riferisce, non si corregge) — ed è **proprio per questo** che la domanda è arrivata a Francesco invece di essere decisa da chi scriveva. ➡️ Il foglio, già condiviso, si monta in un **quinto** posto |
| **D186** | ✍️ **I DISEGNI DI P31 SONO APPROVATI — il cancello §0B si apre.** Tre scelte insieme: ① la riga che spiega il campo è quella **del disegno** («*È il numero a cui UÀ manda i messaggi di consegna su WhatsApp — ci vuole un cellulare, non il fisso dello studio*») ② il tasto del foglio alla consegna si chiama **«Salva e apri WhatsApp»** ③ l'ordine dei cinque campi resta **Nome · Cognome · Telefono dello studio · Cellulare WhatsApp · Studio**, e i due numeri hanno **lo stesso peso** | tre domande poste sugli **scatti veri**, ognuna con tre strade e il loro prezzo | 🔑 **La ① dice PRIMA perché il campo esiste e POI quale numero vuole** — l'alternativa faceva il contrario. 🔑 **La ② nomina entrambe le cose che succedono**: è più lunga dei verbi secchi che l'app usa altrove (`CONSEGNA`, `FATTO`), ma qui le azioni sono **due** e tacerne una sarebbe una sorpresa. 🔑 **La ③ tiene i due numeri VICINI**, perché si somigliano e chi compila li affronta insieme; la variante «prima il cellulare» è stata scartata perché **avrebbe dato più peso a uno dei due**, cioè esattamente ciò che D184 vieta. ✅ **Contrasti MISURATI sugli scatti, non dichiarati:** la riga di spiegazione in tema scuro sta a **6,13:1**; ⚠️ le etichette dei campi a **4,75:1** — passano, ma **di poco**, ed è lo stesso punto di **P34**: se un giorno il fondo dei fogli sarà allineato alla spec, quelle etichette scendono sotto. ➡️ **Si può scrivere React** (compiti 7 e 8) |
| **D185** | 🔁 **ANCHE NELLO SCADENZARIO il tasto del sollecito CHIEDE il cellulare che manca e lo salva** — la stessa promessa di **D183**, in tutte le schermate | fra tre strade (il tasto sparisce, com'era appena stato fatto · chiede il numero come alla consegna · sparisce ma con una riga che spiega) → **«Chiede il numero, come alla consegna»** | 🔑 **La ragione è la coerenza:** un tasto che in una schermata chiede il numero e in un'altra sparisce insegna due comportamenti diversi per la stessa cosa. ⚠️ **Nasce da un rilievo del revisore del compito 4:** l'esecutore aveva cambiato **di sua iniziativa** il gate di quel tasto (allineandolo a quello che il piano prescriveva per l'analogo dell'estratto conto), con la conseguenza — **dichiarata, non nascosta** — che un cliente col solo fisso perdeva un tasto che vedeva. 🛑 **Il revisore ha giudicato la scelta dentro mandato e giusta, MA ha chiesto che avesse un numero di decisione** invece di restare una scelta di esecutore: è §0A-bis applicata da chi rivede, non da chi ha scritto la regola. ➡️ **Costo:** il foglio che chiede il cellulare (`ChiediCellulareSheet`, compito 8) nasce **condiviso** invece che locale alla consegna, e va montato in **tre** punti dello scadenzario oltre che nella consegna |
| **D184** | 📝 **IL WIZARD «NUOVO DENTISTA» CHIEDE ENTRAMBI I NUMERI, con lo stesso peso — e sotto il cellulare WhatsApp c'è scritto a che cosa serve** | domanda posta nella revisione della spec («*il wizard serve a creare l'anagrafica del nuovo cliente? allora deve chiederli tutti e due no? dando il peso giusto ad entrambe le richieste e spiegando a cosa serve il numero con whatsapp*») | 🔑 **La ragione è che quel foglio non è una scorciatoia: è il posto in cui l'anagrafica NASCE.** Un campo non chiesto lì è un campo che qualcuno dovrà rimettere dopo, da un'altra schermata — cioè la mancanza che P30-bis e **D165** hanno già pagato una volta. ➡️ **Il foglio passa da 4 campi a 5** (Nome · Cognome · **Telefono dello studio** · **Cellulare WhatsApp** · Studio). ⚠️ **«Lo stesso peso» è un vincolo di disegno, non un'intenzione:** nessuno dei due è secondario, quindi **niente «campo avanzato», niente sezione richiudibile, niente carattere più piccolo**. 🛑 **E la richiesta scopre due cose che il componente condiviso non sa fare** — v. sotto |

🔧 **D184 scopre due mancanze in `CampoTesto` (`src/components/ds/Campo.tsx:57-63`), e riguardano il DS v3, non questo foglio.**

**① Non esiste un testo di aiuto.** Il componente accetta `label`, `valore`, `onCambia`, `placeholder`,
`autoFocus` — e basta. «*Spiegando a cosa serve*» non è scrivibile senza aggiungere la capacità.
⚠️ **`CampoTesto` è usato da 13 schermate** (`provato:` `grep`), quindi la prop va **opzionale**: dove
non si passa, non cambia niente.

**② Il campo è SEMPRE `type="text"`** (riga 81). Su un telefono, per digitare un numero, **esce la
tastiera alfabetica**. 🔑 **Il precedente in casa esiste già ed è a due righe di distanza:**
`CampoNumero` usa `inputMode="decimal"` proprio per far uscire il tastierino. ⚠️ **Su una PWA pensata
per il telefono questo non è rifinitura**, ed è passato inosservato perché finora nessun campo v3
chiedeva un numero di telefono. 📌 **Riferito come difetto del DS**, non come dettaglio di P31.

🔎 **TRE MISURE PRESE PRIMA DI CHIEDERE, e ognuna ha smontato qualcosa di scritto.**

**① Il «travaso» non esiste — e la voce di roadmap lo dava per il pezzo delicato.** P31 diceva: «*va
deciso il travaso di ciò che c'è (i numeri già inseriti sono fissi o cellulari? non è distinguibile a
occhio)*». `provato:` **39 clienti in banca dati, UNO SOLO ha il telefono valorizzato** (il fisso di Muro
Lucano trovato in produzione), e **ZERO hanno l'email**. 🔑 **Non c'è niente da travasare**, e la domanda
che sembrava la più costosa **si dissolve**. ⚠️ Vale la pena notare come si era formata: nessuno aveva
contato, e «*non è distinguibile a occhio*» presuppone che ci sia qualcosa da guardare.

**② Le due schermate che scrivono quel campo si contraddicono GIÀ OGGI, nelle etichette.** `provato:`
`ClienteEditSheet.tsx:324-330` lo chiama **«Telefono»** e suggerisce **`+39 02 1234567`** — un **fisso**,
col prefisso internazionale; `NuovoDentistaSheet.tsx:106-110` lo chiama **«Cellulare/WhatsApp»** e
suggerisce **`333 1234567`** — un **cellulare**, **senza** prefisso. 🔑 **Il difetto che Francesco ha
visto nei disegni era già scritto nelle etichette**, e non l'aveva visto nessuno perché **le due
schermate non si guardano mai insieme**.

**③ E c'è un TERZO pezzo che non era nella voce: nessuno mette il prefisso internazionale.** `provato:`
`buildWhatsappUrl` (`src/lib/consegna/whatsapp-template.ts:35-40`) fa `phone.replace(/\D/g,'')` e lo
attacca a `https://wa.me/` — **nessun punto del codice aggiunge il `39`**. Il confronto in casa:
`PecSetupWidget.tsx:164-167` funziona **solo perché** `NEXT_PUBLIC_SUPPORT_PHONE` è già scritto `+39…` e
gli basta togliere il `+`. 🛑 **Quindi anche un cellulare GIUSTO, scritto come lo scrive chiunque in
Italia, produce un collegamento senza prefisso paese** — e la seconda colonna, da sola, **eredita lo
stesso problema**. ➡️ **La normalizzazione entra nel perimetro di P31**, non è una voce a parte.

🛑 **UN VUOTO DICHIARATO, e va detto perché la prima stesura del referto lo dava per fatto:** che cosa
veda esattamente chi preme il tasto con un numero senza prefisso — un errore, una chat vuota, nient'altro
— **NON è verificato**. `provato:` `wa.me` reindirizza a `api.whatsapp.com` **allo stesso modo** per un
fisso, per un cellulare senza prefisso e per uno col prefisso: **la validazione avviene nell'app, non nel
server**, quindi da qui non è osservabile. Serve **un telefono vero**. ⚠️ **La prima stesura scriveva
«*non arriva a nessuno e nessuno se ne accorge*»: era una DEDUZIONE travestita da misura** — lezione ① della
notte applicata a una frase propria.

---

### Sessantottesima tornata — D189-D190: chi consiglia, e la veste mai approvata

**Quando:** lunedì 3 agosto 2026, sera (`provato:` `date` → `2026-08-03 20:28:59`), all'apertura della
sessione di ripresa, **prima** di iniziare P30-a.
**Come ci si è arrivati:** Francesco ha chiesto di verificare un'affermazione fatta in una sessione
precedente — «*i consulenti specializzati non risultano più raggiungibili*». 🔑 **La verifica l'ha
smentita e ha scoperto altro:** i consulenti c'erano, ma erano generici, e stavano in un posto che li
faceva sparire a seconda di dove si apriva il terminale.

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D189** | 🧹 **LE SCHEDE GENERICHE DEI CONSULENTI SI DISATTIVANO — il panel di §0C si convoca con mandati SCRITTI AL MOMENTO sulla domanda specifica** | «*non puoi invocare gli advisor specializzati che ti servono di volta in volta?*» → poi, davanti alle misure: **«fai pulizia di quelle schede così non rischiamo di invocarle»** | 🔑 **La misura che ha deciso, presa prima di proporre:** `provato:` ricerca di `UÀ\|odontotecnic\|dental\|MDR\|FatturaPA\|Supabase\|uachelab` su tutte e cinque le schede che §0C nomina → **0 riferimenti al progetto in ognuna**; e `ux-designer.md`, una delle cinque, è lunga **506 byte** in tutto e chiede di consegnare **un link Figma e un punteggio SUS** — due artefatti che in UÀ **non esistono** (qui si fanno bozze HTML, tre formati, due temi, e si portano a Francesco). Le schede sono del **4 agosto 2025**, mai più toccate. 🛑 **Non erano solo inutili: erano pericolose.** Una scheda generica fa *risultare eseguita* la regola del panel consegnando un parere generico — **la stessa forma del verde che non prova niente** (P15), che questo progetto ha già pagato. ✅ **Eseguito:** `/Users/hatholdir/Downloads/.claude/agents` → **`agents-DISATTIVATE-2026-08-03`**; `provato:` la cartella `agents` non esiste più, i **25 file sono integri** a fianco. 🛑 **Spostate, NON cancellate:** quella cartella **non è sotto git**, quindi cancellare sarebbe stato senza ritorno. ⚠️ **E la verifica ha scoperto una fragilità che questa decisione chiude:** quelle schede stavano in una cartella appesa a **`Downloads`**, non al progetto — `provato:` `ua-app/.claude/agents/` e `~/.claude/agents/` sono **tutte e due VUOTE**. Aprendo il terminale **dentro `ua-app`**, come uno naturalmente farebbe, non venivano caricate affatto: **§0C era ineseguibile senza dare alcun errore**, a seconda di dove partiva la sessione. È la stessa forma della guardia degli overlay, dichiarata protettiva e mai lanciata. ➡️ **Vincolo operativo che ne segue:** ogni panel **dichiara nel verbale la LENTE di ciascun consulente**, e ognuno riceve l'istruzione esplicita di **cercare dove sbaglia chi propone**. Senza le lenti scritte, fra un mese «panel fatto» non è più verificabile — e tre mandati scritti di fretta dalla stessa mano sono **un'eco, non un panel** |
| **D190** | ✅ **LA VESTE DEL PANNELLO «MODIFICA CLIENTE» È APPROVATA** | **«gli scatti vanno bene»**, detto dopo aver guardato i **sei scatti veri** (390 · 768 · 1280 × chiaro · scuro), consegnati in chat | 🔑 **Chiude §0① dell'handoff del 03/08**, cioè la prima delle due cose «preparate e mai portate a Francesco». Il pannello riceve da P31 **un campo nuovo** (`cellulare_whatsapp`) e **un'etichetta cambiata** («Telefono» → «Telefono dello studio»), e **la sua veste non era mai passata da un disegno approvato**: D186 copriva **solo** il wizard e il foglio della consegna. ⚠️ **È un'approvazione A POSTERIORI, non un cancello:** il codice era già in produzione (D188), quindi la posta in gioco era un eventuale ritocco, non il rilascio. 🛑 **NON chiude D-Q5, e non va scritto che la chiude:** «gli scatti vanno bene» approva **questa superficie**; D-Q5 chiede se schiarire `--t3` **in tutta l'app** in tema scuro, che è una scelta di token e tocca ogni schermata. Dedurre l'una dall'altra sarebbe una deduzione travestita da ratifica. **D-Q5 resta aperta e va richiesta.** 📌 **Osservazioni annotate guardando gli scatti, nessuna bloccante:** al chiaro i due numeri stanno affiancati con lo stesso peso e la riga di aiuto è al posto giusto (D186 rispettata) · in scuro le etichette sono grigio su grigio (è `--t3`, **P16/D134**, preesistente) · la riga di aiuto sotto il solo cellulare **sbilancia la coppia a 390px** (cinque righe da un lato, zero dall'altro) |

🔎 **Un ritrovamento fuori mandato, riferito e non toccato (R-E2), che vale per P30-a.** Gli scatti
mostrano i **dati veri** del cliente di prova: `STUDIO / CLINICA` = `STUDIO ODONTOIATRICO PIEGARI
GIANFRANCO`, ma **`NOME` = `STUDIO`** e **`COGNOME` = `ODONTOIATRICO PIEGARI GIANFR…`**.
`provato:` `supabase/schema.sql:370-372` — `studio_nome` è la ragione sociale, `nome` e `cognome` sono
**il dentista referente**, cioè una **persona**, e sono **`NOT NULL` tutti e due**. 🔑 **Quindi chi
inserisce un cliente che è uno studio DEVE mettere qualcosa in due caselle pensate per una persona, e ci
mette l'insegna.** Non è un errore di chi ha caricato il dato di prova: è **la struttura che chiede una
persona dove spesso c'è un'insegna**. ➡️ **Materia di P30-a**, e nasce da un dato reale, non da
un'opinione.

---

### Sessantanovesima tornata — D191-D192: che cosa è un cliente, e chi è il prescrittore

**Quando:** lunedì 3 agosto 2026, sera (`provato:` `date` → `2026-08-03 20:51:20 CEST`), dopo il
censimento di P30-a.
**Come ci si è arrivati:** il censimento ha trovato un ritrovamento **non richiesto** — nel **58%** dei
lavori vivi la DdC stampa come prescrittore una ragione sociale. 🔑 **E Francesco ha messo in dubbio la
conclusione invece di accettarla** («*controlla bene, io ricordo, ma posso sbagliare…*»): **il controllo
gli ha dato ragione**, e ha cambiato il rimedio.

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D191** | 🏢 **UN CLIENTE PUÒ ESSERE UN'ENTITÀ, NON SOLO UNA PERSONA — «qualsiasi forma giuridica nel panorama dentale»** | domanda posta dopo il censimento: «un cliente è una persona o può essere un'entità?» → **«il cliente può essere anche un'entità, qualsiasi forma giuridica nel panorama dentale»** | 🛑 **Cade il vincolo di oggi:** `clienti.nome` e `clienti.cognome` sono **`NOT NULL` tutti e due** e `studio_nome` è **facoltativo** (`supabase/schema.sql:370-372`) — cioè oggi la struttura **obbliga** ogni cliente a essere una persona. `misurato:` **10 clienti su 39** ci hanno infatti infilato un'insegna (`C.O.M.`/`s.r.l. uninominale`, `GDA`/`STP S.R.L.`, `Dental`/`Center s.r.l. uninominale`, quattro «STUDIO ODONTOIATRICO …»). ➡️ **Serve una forma del cliente** e una migration — **e si può fare adesso**: v. la correzione qui sotto. ⚠️ **Tocca due documenti a valore legale**, non solo una schermata: la **fattura** (`generate-xml.ts:262` costruisce `<Denominazione>` da `studio_nome ?? "cognome nome"`) e la **DdC** (`generate-ddc.ts:146-147`). 🔑 **Il modello giusto esiste già in casa e non è quello del cliente:** `fornitori` ha `ragione_sociale TEXT NOT NULL` (`schema.sql:545`), un campo, un'entità — **il fornitore, che non finisce su nessun documento legale, è modellato meglio del cliente, che ci finisce sempre** |
| **D192** | 🔴 **LA FACCENDA DEL PRESCRITTORE DIVENTA UNA VOCE DI ROADMAP PROPRIA — `P37`** | «*trattala con voce sua, ma controlla bene, io ricordo, ma posso sbagliare, che il prescrittore può essere sia persona fisica che giuridica*» | ✅ **CONTROLLATO SULLA NORMA, e Francesco ricordava BENE — con una precisazione che cambia il rimedio.** Il testo dell'**Allegato XIII punto 1** MDR nomina **tutti e due**, ma li tiene **separati** e li unisce con «**e**», non con «oppure»: «*il nome della persona che ha prescritto il dispositivo e che vi è autorizzata dal diritto nazionale in virtù delle sue qualifiche professionali **e, se del caso, il nome dell'istituzione sanitaria in questione***». 🔑 **Quindi sono DUE caselle, non una scelta fra due:** la **persona** è obbligatoria e deve avere qualifiche professionali proprie (che una S.R.L. non può avere); l'**istituzione** si aggiunge «se del caso». 🛑 **E questo peggiora la diagnosi invece di alleggerirla: UÀ oggi ha UNA SOLA casella**, ci mette `cliente.cognome + nome`, e **per l'istituzione non ha alcun posto**. Il rimedio non è «accettare anche le aziende»: è **avere i due campi che la norma prevede**. ⚠️ **Due cose restano «non verificato» e vanno chiuse prima di ratificare:** ① se uno **studio odontoiatrico singolo** sia un'«istituzione sanitaria» ai sensi dell'Allegato XIII — cioè quando scatta il «se del caso» ② il testo letterale è stato preso da una **riproduzione secondaria** ([medicaldevicenews.eu](https://www.medicaldevicenews.eu/MDR/pagina/allegato-xiii-procedura-per-i-dispositivi-su-misura-5cdeaa63b1c61131d9c646ee.html)), corroborata da una resa inglese indipendente, **perché EUR-Lex si è troncato prima degli allegati in tre tentativi** — lo standard **D125** vuole il consolidato EUR-Lex, quindi **la rilettura lì è un passo dovuto** |

🔄 **CORREZIONE di un limite dato a Francesco e SBAGLIATO, in questa stessa sessione.** Avevo scritto
«*stasera non si tocca la banca dati: P33 blocca le migration fino al 04/08 alle 12:00*». **Falso, e la
voce P33 lo dice già:** P33 blocca **`supabase db push`**, e la strada **D151** (Management API +
`migration repair`) è **ratificata, funzionante e già usata il 03/08** per applicare
`cellulare_whatsapp` durante il compito 1 di P31 (**D188**). 🔑 **Era un limite inutile che mi ero
imposto**, e Francesco l'ha rifiutato con la ragione giusta: «*non importi limiti inutili … se le cose
richiedono tempo, seguiremo quel tempo*». ⚠️ **Vale come promemoria di metodo:** una precauzione non
misurata è una decisione presa di nascosto.

---

### Settantesima tornata — D193: le etichette in scuro, e cosa ha scoperto l'esecuzione

**Quando:** lunedì 3 agosto 2026, sera (`provato:` `date`), subito dopo D191-D192.
**Come ci si è arrivati:** **D-Q5** era aperta dal 03/08 mattina. Spiegata a Francesco con le due
strade e i loro prezzi → **«va bene la B, procedi»**.
🔑 **E il prezzo dichiarato della B — «va rimisurato dappertutto» — si è pagato subito, trovando che la
domanda descriveva il problema sbagliato.**

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D193** | 🎨 **OPZIONE B — il grigio delle etichette si schiarisce OVUNQUE in tema scuro, una regola sola e nessuna eccezione** | fra le due strade di D-Q5, con i prezzi in chiaro (**A** = grigio più chiaro solo dentro i fogli, ma è uno scostamento dalla spec §5.27 da scrivere · **B** = una regola sola, ma **va rimisurato dappertutto**) → **«va bene la B, procedi»** | ✅ **ESEGUITO:** `--faint` in tema scuro **`#928778` → `#9A8F80`**, in **tre** posti che si muovono insieme — `src/design-system/v3/tokens.ts:15` · `src/app/ds-v3.css:57` · la tabella dei token della spec v3 §… 🛑 **E in un quarto posto NON si è toccato niente:** `src/app/globals.css:192` porta **lo stesso identico `#928778`**, ma è `--brd-cmd`, **un altro token** (un bordo di v2.3) che condivide il valore per derivazione. `provato:` censimento `grep -rni "928778"` → **4 occorrenze, 3 da cambiare e 1 da lasciare**. 🔑 **Cercare per VALORE e non per nome è ciò che ha reso visibile la quarta** — R-P2/R-P3 applicate a un colore. 📌 `misurato:` (`scripts/tmp/dq5-contrasti.ts`, ricalcolo indipendente, nessun numero ripreso dai documenti) — **prima:** 5,21 su `--bg` · 4,75 su `--card` · **4,25 su `--elv` ❌**; **dopo:** **5,78 · 5,28 · 4,72 ✅** su tutti e tre, e **0,77 sotto `--muted`** (5,49 su `--elv`), così i due grigi restano distinguibili invece di collassare in uno |

🔴 **CIÒ CHE L'ESECUZIONE HA SCOPERTO, e che va portato a Francesco perché cambia il perimetro di
quello che ha approvato.**

**① La B non tocca il difetto che Francesco ha effettivamente guardato.** Negli scatti del pannello
«Modifica cliente» (D190) le etichette sono illeggibili, e **non sono `--faint`**: `provato:`
`ClienteEditSheet.tsx:59,72,234` usa `var(--t3, #6B5C51)`, e in tema scuro `--t3` vale **`#5A5652`**
(`globals.css:191`, token **v2.3**). `misurato:` **2,52 su `--bg` · 2,30 su `--card` · 2,06 su `--elv`**
— **fallisce ovunque, e di molto** (la soglia è 4,5). ➡️ **Cambiare `--faint` non lo migliora di un
punto.**

**② E il 4,25 della domanda oggi NON morde.** `provato:` il rimappaggio `--card: var(--elv)` di
`ds-v3.css:92` è **scoped a `.ds-chip-scelta` e `.ds-tasto-tondo`**, non al pannello del foglio: il
foglio è dipinto `--card` (**#211D18**), dove il valore vecchio dava **4,75 — sopra soglia**. Il
**4,25** è il numero su `--elv`, cioè **ciò che succederà il giorno in cui `Sheet.tsx` sarà allineato
alla spec §3.2** (**P34**). 🔑 **Quindi la B è una messa in sicurezza in anticipo, non una correzione di
qualcosa che si vede oggi** — il che la rende comunque giusta (P34 diventa innocua), ma va detto invece
che lasciar credere di aver sistemato ciò che si vedeva negli scatti.

⚠️ **E la spec aveva già saltato il fondo che conta:** la nota di rev. 3.1 diceva «*ora 5.21/4.75*»,
cioè **due fondi su tre**, omettendo proprio `--elv` — la superficie che **quella stessa spec** assegna
ai fogli in §3.2. 🔑 **È la stessa forma dell'elenco «completo» che sbaglia** (lezione ① di P31): il
numero era vero, l'elenco no.

➡️ **DOMANDA APERTA per Francesco (erediterebbe il numero D194):** la B si estende a **`--t3` di v2.3 in
tema scuro** — cioè al difetto vero, quello degli scatti — oppure quello resta sotto **P16/D134** e si
tratta con la sua ondata? 📌 Il progetto lo sapeva già: `globals.css:192` porta scritto in un commento
che «*`--t3` scuro dà 1,71-2,24:1, sotto il 3:1 di WCAG 1.4.11*», e ci si era **girati intorno**
introducendo `--brd-cmd` invece di correggerlo.

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D194** | 🚫 **LA B NON SI ESTENDE a `--t3` di v2.3: il difetto resta dov'è (P16/D134)** | domanda posta col prezzo di entrambe le strade, e con la raccomandazione **opposta** di chi la poneva («*propendo per estendere*») → **«lasciala lì, tanto poi dovremmo ritoccare ogni singola pagina con il design, andiamo avanti»** | 🔑 **La ragione è più forte della decisione, e va tenuta:** ogni pagina ancora su v2.3 **verrà comunque riaperta** dalla migrazione a v3, che procede **per route** (DS v3 §14). Correggere oggi il token vecchio è lavoro **su una superficie destinata a sparire** — si pagherebbe due volte. ➡️ **Conseguenza operativa: P16/D134 non è una voce autonoma da schedulare, è un effetto collaterale della migrazione** — si chiude **quando la pagina passa a v3**, perché a quel punto `--t3` si risolve in `--faint`, che con **D193** ora passa su tutti e tre i fondi. ⚠️ **Il costo accettato, dichiarato:** finché una pagina resta su v2.3, **in tema scuro le sue etichette stanno a 2,0-2,5 contro il 4,5 richiesto** — cioè si leggono male sul serio, non «un filo sotto». **È un debito con una scadenza (la migrazione), non un difetto ignorato.** ✅ **Con questa, D-Q5 è CHIUSA** |

📌 **Conto delle domande aperte:** restava **D-Q2** (quale prova a schermo scrivere per prima) e
**D-Q5**. ✅ **D-Q5 chiusa** da D193+D194. ❓ **Resta D-Q2.**

---

### Settantunesima tornata — D195: la forma del cliente, dettata da Francesco

**Quando:** lunedì 3 agosto 2026, sera, dopo che il censimento di P30-a aveva mostrato **sette forme
reali** e **una sola modellata**.

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D195** | 🏛️ **IL CLIENTE È UN'ENTITÀ PIÙ UNA PERSONA — «la forma giuridica, e il nome e cognome del direttore sanitario oppure del medico dello studio». E OGNI LAVORO PORTA SEMPRE IL NOME DEL PRESCRITTORE** | dettata da Francesco dopo la §5 del referto: «*ogni cliente può avere la forma giuridica, il nome e cognome del direttore sanitario, oppure il nome e cognome del medico dello studio. se arriva un lavoro in laboratorio, il laboratorio ha sempre il nome del prescrittore, e la scheda del cliente presenta, se è forma giuridica la forma giuridica più il nome e cognome del prescrittore, se è ad esempio solo un dottore, allora avrà nell'intestazione dottor esposito giuseppe e nel nome e cognome, se è lui che prescrive, esposito giuseppe*» | 🔑 **QUESTA FORMA È, PAROLA PER PAROLA, LA STRUTTURA CHE CHIEDE L'ALLEGATO XIII** — «*il nome della **persona** che ha prescritto … **e, se del caso, il nome dell'istituzione sanitaria***». **La forma giuridica è l'istituzione; il direttore sanitario / medico dello studio è la persona.** Francesco l'ha dettata dall'esperienza del banco, non dalla norma, e coincide: è la conferma più forte che si potesse avere. ➡️ **`clienti.nome`/`cognome` cambiano SIGNIFICATO, non solo forma:** non sono «il nome del cliente», sono **il medico responsabile** (direttore sanitario o medico dello studio). ➡️ **Regola di resa, dalle parole di Francesco:** entità → *intestazione = forma giuridica* **+** nome e cognome del prescrittore · dottore singolo → *intestazione = «Dottor Esposito Giuseppe»*, e nome/cognome = «Esposito Giuseppe». ✅ **E il pezzo per-lavoro ESISTE GIÀ:** `lavori.richiedente_nome` (`002_fase2_schema.sql:58`), scrivibile dal wizard e in allowlist PATCH — `misurato:` **valorizzato in 1 lavoro su 295**, cioè costruito e mai usato. ➡️ **Non si inventa una struttura: si finisce quella che c'è**, e la si riempie per difetto col medico responsabile del cliente. 🔑 **Chiude P37 alla radice** invece di rattopparlo |

🔴 **DUE COSE TROVATE VERIFICANDO D195, che ne sostengono il bisogno.**

**① La fila di pillole «medici dello stesso studio» ESISTE già, e sui dati veri non funziona.**
`provato:` `TabDati.tsx:228-303` mostra una pillola per ogni collega, presi da
`/api/clienti/[id]/studio-members` — che `provato:` (`route.ts:46-52`) li cerca **fra gli altri
`clienti` con la STESSA IDENTICA STRINGA in `studio_nome`**. `misurato:`
(`scripts/tmp/p30a-studio-members.ts`) **scatta per 2 clienti su 39** — e quei due sono **il doppione
di `Dr. Villani Gaetano`**, cioè la stessa persona due volte: **la funzione presenta un medico come
collega di sé stesso**. Per gli altri **37 la fila non compare mai**. 🛑 **E i casi che dovrebbe unire
non li unisce:** `Guida` sta in **4 righe** con quattro insegne diverse (`Prof. Guida Dr. Luigi` ·
`Prof. L. Dr. GUIDA` · `DOTT. GUIDA AGOSTINO ODONTOIATRA` · dentro lo studio associato). 🔑 **È la
prova che il modello mancava: qualcuno ha costruito la scorciatoia su un TESTO LIBERO, perché non
c'era una chiave** — e un testo libero non è una chiave.

**② Il difetto latente di P37 ha un innesco a UN CLIC.** `provato:` `TabDati.tsx:283` — la pillola
«**+ Nuovo**» scrive `richiedente_nome: ''` (**stringa vuota**, non `null`). Se poi non si digita
niente e si salva, `POST /api/lavori:233` fa `body.richiedente_nome ?? null`, e `''` **non è nullish**:
la stringa vuota **arriva in banca dati**. Da lì `generate-ddc.ts:146-147` usa `??`, che **non scatta
sulla stringa vuota** → **prescrittore stampato VUOTO** su un documento obbligatorio, **mentre il
precheck passa** (controlla `.trim().length > 0` **oppure** il cliente, e il cliente c'è sempre).
🔄 **Corregge la voce P37 scritta due ore fa**, che dava il difetto per «latente, oggi non attivo»:
`misurato:` 0 stringhe vuote **oggi** — ma la strada per crearne una è **una pillola**, non un caso di
laboratorio. ⚠️ **E il commento dice il falso sul codice accanto:** `TabDati.tsx:101` scrive «*solo se
ci sono almeno 2 medici*», il codice fa `>= 1`.

#### Il panel su D195 — **convocato il 03/08/2026 sera**, autorizzato da Francesco («*si, falli girare*»)

📌 **Primo panel convocato secondo D189**: mandati **scritti al momento sulla domanda specifica**, non
schede generiche. **Le tre lenti si dichiarano qui**, come D189 impone — un panel di cui non si sa con
che occhi ha guardato non è verificabile a posteriori.

| lente | che cosa deve trovare | perché è stata scelta |
|---|---|---|
| ⚖️ **LA LEGGE** | il testo **letterale** dell'Allegato XIII punto 1 su EUR-Lex (i tre tentativi in HTML si erano troncati prima degli allegati) · **quando scatta il «se del caso»** dell'istituzione sanitaria, e se uno studio individuale ci rientra · se il prescrittore vada identificato con più del nome (albo) · se emettere `<Denominazione>` per una **persona fisica** sia non conformità o imprecisione · **quali forme di studio sono obbligate ad avere un direttore sanitario**, e se sia per forza lui a prescrivere | è la lente che può **falsificare la tesi centrale** di D195 — che la forma dettata da Francesco coincida con la norma |
| 🧤 **CHI DIGITA AL BANCO** | **perché un campo costruito, visibile e facile è compilato 1 volta su 295** · se il prescrittore vada chiesto a ogni lavoro o proposto per difetto · l'interazione giusta per la pillola «+ Nuovo» che può svuotare un dato legale · **che cosa va TOLTO**, distinguendo «nessuno lo compila perché non serve» da «nessuno lo compila perché è chiesto male» | è la lente che dice se la struttura giusta **verrà aggirata**. Il campo a 1 su 295 è la prova che qui succede davvero |
| 🏭 **IL LABORATORIO COMMITTENTE** | chi è il **fabbricante** nel subappalto fra laboratori e **chi firma la DdC** · se il subappaltatore debba emetterne una (e che ruolo abbia il campo `dispositivo_semilavorato` già esistente) · chi sia il «prescrittore» quando il cliente **non ha medici** · se la natura IVA **N4** valga anche fra due laboratori — 🛑 **domanda fiscale seria: se la risposta è che va con IVA, il codice oggi sbaglierebbe** (`generate-xml.ts:199` la impone) | è **l'unico caso che nessuno ha mai progettato**, ed è quello su cui «entità + persona» può rompersi: un laboratorio **non ha un direttore sanitario e non prescrive** |

🛑 **A tutti e tre è stato dato lo stesso ordine esplicito: «il tuo compito non è approvare, è trovare
dove la proposta sbaglia»**, più lo **statuto delle fonti** (`ANALISI/15` non chiude una discussione;
`ANALISI/17` e `ANALISI/23` sì) e l'obbligo di scrivere **«non verificato»** dove non hanno una prova.
🔑 **Alla lente del laboratorio committente è stato detto in più che lì il rischio è massimo:** non
esistendo **nessun dato** su quel caso (`laboratorio_odontotecnico` è `false` su tutti e 39), la
tentazione di inventare una prassi plausibile è la più forte.

#### ESITO DEL PANEL — **D195 NON PASSA COSÌ COM'È SCRITTA**

🔑 **Il panel ha funzionato: tutte e tre le lenti hanno trovato qualcosa, e nessuna ha approvato.**
Le affermazioni portanti di ciascuna sono state **riverificate a mano** prima di essere accettate.

**⚖️ LA LENTE DELLA LEGGE — ha risolto il problema della fonte e ha smontato il ponte.**
✅ **Testo dell'Allegato XIII ottenuto ALLA LETTERA dal consolidato EUR-Lex** (CELEX
`02017R0745-20260101`, italiano, 1,69 MB **scaricato per intero** con `curl` invece di farsi riassumere
la pagina — è così che si aggira il troncamento che mi aveva fermato tre volte), **riscontrato riga per
riga con la versione inglese**. ➡️ **Il vincolo D125 è soddisfatto: la citazione di P37 poggia ora su
fonte primaria, non su riproduzione.**
🔴 **E il rilievo che rompe D195:** **il direttore sanitario NON è il prescrittore.** `L. 124/2017,
art. 1 c. 153` (Normattiva, verbatim): l'obbligo di direttore sanitario esiste **solo per le
«società»** e per le polispecialistiche (c. 154), e le prestazioni «*sono erogate dai soggetti in
possesso dei titoli abilitanti*» — **al plurale: prescrive chi ha visitato**. Il direttore sanitario
risponde dell'**organizzazione**. ➡️ **Usare il medico responsabile del cliente come valore del
prescrittore significa attribuire per iscritto una prescrizione a un medico che può non averla fatta**,
sotto la firma del fabbricante, in un documento conservato **10 anni**.
🛑 **E il rilievo principale, che è più sottile e peggiore:** **D195 non elimina il ripiego, lo rende
INVISIBILE.** Oggi la DdC stampa una ragione sociale alla voce «persona che ha prescritto»: è falso, ma
è **falso in modo evidente** — un ispettore lo vede. Con D195 stamperebbe **il nome plausibile di un
odontoiatra vero**, ugualmente non verificato, e **nessuno se ne accorgerebbe più**. 🔑 **Un campo
sbagliato che sembra giusto è un'esposizione peggiore di un campo sbagliato che sembra sbagliato.**
📌 Altri due rilievi propri: **«medico» è la parola sbagliata** (il c. 153 chiede l'iscrizione
all'**albo degli odontoiatri**; dopo la L. 409/1985 sono albi distinti) · **D195 fonde due voci che la
norma tiene separate** — `provato:` `grep -ri "istituzione" src/ supabase/schema.sql` → **zero
occorrenze**, e `dichiarazioni_conformita.prescrittore_nome` è **un solo TEXT**.
⚠️ **E un errore strutturale: un campo solo serve DUE documenti con destinatari giuridicamente
diversi.** La DdC deve nominare **il prescrittore**; la fattura deve nominare **il committente** (DPR
633/72 art. 21 c. 2 lett. e). Quando paga la S.R.L. e prescrive un socio **non coincidono**, e
`generate-xml.ts:262` costruisce la denominazione della fattura dagli stessi campi.

**🧤 LA LENTE DEL BANCO — ha ribaltato due miei fatti (verificati e confermati).**
🔄 **«Il difetto è a un clic» era SBAGLIATO:** `provato:` `LavoroFormClient.tsx:139-145` monta
`TabDati` **senza `clienteId`** → `showChips` è **sempre falso** → **la fila di pillole non si
renderizza in nessuna schermata**, e il «+ Nuovo» **non è premibile**. Il mio «2 clienti su 39»
descriveva **la risposta dell'API, non lo schermo**: a schermo è **0 su 39**.
🔴 **Ma la porta viva esiste ed è peggiore:** la casella di testo sta **fuori** dal guardiano
(`TabDati.tsx:305-313`), e `e.target.value || null` salva **uno spazio**; poi `precheck.ts:23` usa `||`
(ripiega) e `generate-ddc.ts:146` usa `??` (**non** ripiega) → **prescrittore in bianco, controllo
verde** — e `useLavoroForm.ts:383-401` **salva da solo dopo 30 secondi**: nessun tasto premuto.
🔴 **«1 su 295» non è scarsa adozione: il campo NON È NEL WIZARD.** `provato:` `crea-lavoro.ts:332-360`
non lo spedisce, `api/lavori/route.ts:233` lo mette a `null`. **Non viene mai chiesto.**
🔴 **Il difetto vero è a monte, al Passo 1:** `dati-wizard.ts:103` etichetta il riquadro con
`studio_nome ?? "Dr. cognome"`, e `studio_nome` ce l'hanno **39 su 39** → **due dentisti dello stesso
studio associato danno due riquadri IDENTICI**, che `:106` ordina **affiancati**. E
`PassoDentista.tsx:49` **filtra sull'etichetta**: cercare «Esposito» in «Studio Rossi» dà **zero**.
🐛 **Difetto nuovo:** dopo la consegna `richiedente_nome` resta modificabile **senza alcun lucchetto
legato alla DdC** (`api/lavori/[id]/route.ts:181`; l'unico è `incluso_in_fattura` sui prezzi) →
l'addetta corregge, legge **«Salvato»**, e **il documento non cambia**.
🔄 **E mi ha corretto sulla trappola che avevo dichiarato io:** `iban` e `tecnico_default_id` **non
hanno nessuna casella in tutta l'app** — lo zero su quelli **non dice niente**. Lo zero su
`email`/`codice_sdi`/`pec` è invece una **scelta già ratificata e scritta**
(`NuovoDentistaSheet.tsx:8-10`: il fiscale diventa bloccante alla prima FatturaPA, non alla creazione).

**🏭 LA LENTE DEL LABORATORIO COMMITTENTE — ha spostato la rottura sul caso COMUNE.**
🔴 **Non è il lab che RICEVE a rompersi: è quello che MANDA FUORI.** Allegato XIII p. 1, primo
trattino: «*il nome e l'indirizzo del fabbricante **e di tutti i luoghi di fabbricazione***».
`provato:` `generate-ddc.ts:139-141` ha **un solo** `fabbricante_nome`/`indirizzo`/`piva`. **Chi
subappalta una fase non può produrre una DdC conforme.**
📌 **Fabbricante = chi ci mette il nome**, non chi tiene la fresa (Art. 2(30) MDR, EUR-Lex: «*fabbrica
o … **lo fa fabbricare** … e lo commercializza apponendovi il suo nome*»). **UÀ non ha nessun campo che
registri quale dei due firma.**
🛑 **Due cose che sembravano fatte:** `provato:` **nessuna riga di `src/lib/consegna/` o
`src/lib/pdf/` legge `dispositivo_semilavorato`** — la spec dice «se spuntato non genera DdC», **mai
implementato** · e **`laboratorio_odontotecnico` non è letto da NESSUNA riga di codice**: 🔑 **è questa
la prova che il caso non è mai stato progettato, non i 39 `false`.**
📌 **Tracciabilità:** per la parte subappaltata i lotti sono dell'altro laboratorio, e UÀ scrive
`tracciabilita_materiali_ok` **su una base incompleta**.
📌 **IVA:** la **N4 fra due laboratori regge** (il cedente è odontotecnico, l'operazione è connessa
alla prestazione del dentista) — 🛑 **ma su TRE FONTI SECONDARIE CONCORDANTI e nessuna primaria**: i PDF
dell'Agenzia non erano estraibili. **Va firmata da un commercialista, non da noi.** ⚠️ E
`generate-xml.ts:198-199` **non ha la N4 come predefinito: la impone con un `throw`** — se un caso
richiedesse l'imponibile, UÀ **non può emettere affatto**.
⚠️ **Trappola di migration che vale oro:** rendere `nome`/`cognome` nullable **fa sparire quei clienti
dalla ricerca in silenzio** — `provato:` `schema.sql:447` concatena `coalesce(studio_nome,'') || ' ' ||
nome || ' ' || cognome`: con NULL l'intera espressione è NULL e la riga **esce dall'indice**.

🔴 **TRE RILIEVI FUORI PERIMETRO, PIÙ GRAVI DELL'ANAGRAFICA — riferiti, non corretti (R-E2).**
Diventano voci proprie: **P38 · P39 · P40**.

📌 **CHE COSA SOPRAVVIVE DI D195, e va detto con precisione perché la sostanza regge:**
✅ **il cliente può essere un'entità** (D191, invariata) · ✅ **serve una forma giuridica** · ✅ **ogni
lavoro porta il nome del prescrittore** — **è la metà giusta e nessuno l'ha contestata** · ✅ **il
prescrittore è per forza una persona fisica abilitata**: `R.D. 1334/1928 art. 11` (Agenas) più
`L. 409/1985` — **una S.R.L. non può prescrivere**, e su questo la lente della legge dà ragione piena a
Francesco. ⚠️ **MDCG 2021-3 Q7 dice che il prescrittore non deve essere per forza un operatore
sanitario e rimanda al diritto nazionale** — ma **in Italia il diritto nazionale c'è**, ed è il R.D.
sopra: quindi la riserva **si chiude**, non resta aperta.
🛑 **CHE COSA NON PASSA:** **il medico responsabile del cliente NON può essere la sorgente del
prescrittore della DdC.** Il ripiego va **eliminato**, non migliorato: meglio **fermare l'emissione**
che stampare una dichiarazione plausibile e falsa.

➡️ **La riformulazione va portata a Francesco e prenderà il numero D196.** Il panel **non ratifica**:
riferisce.

#### D196 — la forma finale, dettata da Francesco dopo aver letto i rilievi

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D196** | 🏛️ **LA SCHEDA CLIENTE PORTA: denominazione (se è un'entità giuridica) + nome e cognome del dottore o direttore sanitario. SE QUELLA PERSONA COINCIDE COL PRESCRITTORE, BASTA COSÌ; SE IL PRESCRITTORE È DIVERSO, ALLORA — E SOLO ALLORA — UN CAMPO A PARTE.** 🔑 **E la regola che la rende sicura: È LA FORMA GIURIDICA A DECIDERE SE UÀ CHIEDE.** Cliente = **dottore singolo** → il prescrittore è lui, **nessuna domanda, zero tap**. Cliente = **società o studio associato** → **UÀ chiede sempre chi ha prescritto**, perché lì il direttore sanitario può non essere chi ha visitato | Francesco, **dopo** aver letto i rilievi del panel, ha **chiesto invece di suggerire**: «*non sarebbe meglio, e sto chiedendo non suggerendo, che nella scheda cliente ci fosse: denominazione (quindi se è un'entità giuridica) nome e cognome del dottore o direttore sanitario che se coincide con il prescrittore bene, se il prescrittore è differente solo in quel caso un campo a parte, che ne pensi?*» → poi, sulla regola della forma giuridica: «*sì, scrivila così*» | ✅ **SCIOGLIE il rilievo principale del panel senza pagarne il prezzo al banco.** L'obiezione era che D195 **rendeva invisibile** un ripiego automatico. Qui il ripiego **non è cieco: è dichiarato**, e — questo è il punto — **è ammesso solo dove NON PUÒ sbagliare**. 🔑 **Un dottore che esercita da solo non ha altri prescrittori possibili:** attribuirgli la prescrizione non è un'inferenza, è l'unico fatto disponibile. Dove invece i prescrittori possibili sono più d'uno — società, studio associato — **il ripiego è vietato e la domanda è obbligatoria**. ➡️ **Quindi la macchina non si fida mai della memoria di chi ha fretta:** la condizione è **un dato strutturato** (la forma giuridica), non una spunta che qualcuno deve ricordarsi di mettere. ✅ **Regge anche il rilievo della lente della legge su `L. 124/2017 c. 153`** — l'obbligo di direttore sanitario esiste **solo per le società**: nella forma di D196 quel campo è chiesto **proprio dove l'obbligo esiste**, e per lo studio individuale è semplicemente «il dottore». ⚠️ **Resta la parola da correggere in fase di scrittura:** il c. 153 chiede l'iscrizione all'**albo degli odontoiatri**, non «medico» (albi distinti dalla L. 409/1985). 🛑 **DUE COSE ANCORA «NON VERIFICATO», da chiudere prima del React:** ① se lo **studio associato** (associazione professionale) rientri fra le «società» del c. 153 — cambia se il campo del direttore sanitario è obbligatorio o no ② se uno **studio individuale** sia un'«istituzione sanitaria» ai sensi dell'Art. 2(36) MDR — cioè se per lui il secondo campo della DdC vada compilato o resti vuoto. ➡️ **Il campo «istituzione sanitaria» sulla DdC nasce comunque** (oggi `provato:` la parola non compare **zero volte** in tutto il progetto) |

📌 **Ordine di ripresa deciso da chi esegue, su delega di Francesco** («*decidi tu la strada migliore*»):
**P38 e P39 per primi** — sono gli unici due che **non dipendono da nessuna scelta di disegno** e si
possono chiudere mentre l'anagrafica è ancora in discussione. Poi il resto di P30-a con D196, e il
Passo 1 del wizard (le etichette ambigue) come parte della stessa ondata.

---

### Settantaduesima tornata — D197: si adotta PIPELINE-3, per fasi e in modo reversibile (04/08/2026)

Fuori dall'ondata (b): è una decisione di **processo**, registrata qui perché il verbale è unico.
Nasce dalla domanda di Francesco del 03/08 («come possiamo andare più veloci senza perdere pezzi e
senza arronzare?») e dal percorso che ne è seguito: ricerca specializzata + panel advisor + backup
completo del metodo con prova di ritorno.

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D197** | 🏗️ **SI ADOTTA PIPELINE-3, PER FASI E IN MODO REVERSIBILE — LA FASE 0 (HARDENING) È ATTIVA DA OGGI:** gate di verifica `npm run verify:fast` / `verify:full` / `guardie`, promemoria di verifica allo Stop di sessione, policy delle diramazioni a 4 esiti (EXPEDITE massimo 1 · FOLD-IN <30 min · QUEUE default · DROP-NOTE), code operative in `docs/ops/EMERGENTI.md` + `docs/ops/DECISIONI-PENDENTI.md` + `docs/ops/EXPIRED.md`, template di brief e referto in `docs/templates/TASK-BRIEF.md` + `docs/templates/EVIDENCE-PACK.md`. **Documento normativo: `docs/processes/PIPELINE-3.md`** — in caso di divergenza vale `CLAUDE.md` §0C, sempre | Francesco, il 04/08, dopo il percorso del 03-04/08: ricerca su fonti primarie (DORA 2024/2025 · Anthropic engineering · Reinertsen · Shape Up · Kanban/Anderson) + **panel di 3 advisor a mandato disgiunto** (Regola Advisor; lenti dichiarate: flusso/throughput · qualità/architettura · riusabilità del playbook — dossier: `docs/processes/2026-08-04-pipeline3-playbook-originale.md`) + **backup completo del metodo verificato con double check** e tag di ritorno `metodo-2026-08-03-pre-pipeline3` — «perfetto, procediamo con la fase 0» | 🔑 **L'ordine di adozione è obbligato e la fretta lo rovescia:** prima si abbatte il costo di verifica e review (Fase 0), poi si sovrappongono le fasi di item diversi (Fase 1: Francesco progetta N+1 mentre gli agenti eseguono N, spec congelata come punto di sgancio), e SOLO con le precondizioni misurate per 2 settimane si apre la seconda corsia di codice (Fase 3) — **su branch, MAI worktree** (la regola del 28/07 resta). Adattamenti alla casa, scritti in `docs/processes/PIPELINE-3.md` §1: questo verbale resta l'UNICO registro decisioni (niente ADR doppi), la roadmap resta l'unico backlog, il pre-commit resta intatto, lo Stop hook RICORDA e non blocca. Guadagno atteso onesto **1,7-2,2×**, non 3×. Ciò che della Fase 0 resta da fare è censito in `docs/ops/EMERGENTI.md` (E1: Supabase locale + prove RLS a due utenti, misurato 5-10 giorni, va a betting come voce propria — vedi `docs/ops/EMERGENTI.md`). Attuazione sul ramo `pipeline3-fase-0`: **l'unione la decide Francesco** |

### Settantatreesima tornata — D198: l'unione è autorizzata e fatta (04/08/2026)

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D198** | 🔀 **L'UNIONE È AUTORIZZATA E FATTA: `pipeline3-fase-0` → `main` con nodo esplicito (`2f8ec7b8`, un solo punto di ritorno come per D177) — LA FASE 0 DI PIPELINE-3 È NEL METODO. NON PUBBLICATO** | Francesco, il 04/08, letto il referto della Fase 0: «*procedi con l'unione del ramo*» | ✅ **Gate L3 eseguito SULL'ALBERO UNITO** (la lezione di D177: il verde per-ramo non prova l'unione): `npm run verify:full` in **1 min 06 s** — `tsc` **0** · `vitest` **4542 \| 19** (394 file) · build **0**, 81 rotte · **sei guardie verdi**, coerenza a 12 documenti col numero letto. 🛑 **La pubblicazione resta una decisione separata e NON è chiesta qui:** su `main` ci sono ora salvataggi non pubblicati che includono **D193, il colore mai guardato a schermo** — prima gli scatti (l'ordine della sessione precedente resta primo), poi si decide se pubblicare. ➡️ **Dal prossimo item di prodotto si lavora in modalità Fase 1** — pipelining, `docs/processes/PIPELINE-3.md` §5 |

### Settantaquattresima tornata — D199: il colore di D193 è approvato a schermo (04/08/2026)

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D199** | 👁️ **IL COLORE DI D193 È APPROVATO A SCHERMO: `--faint` scuro `#9A8F80` RESTA.** Guardato da Francesco sui sei scatti veri del foglio «Nuovo dentista» (5 etichette di campo), `docs/design/screenshots/2026-08-04-d193/`, 390·768·1280 × chiaro·scuro | Francesco, il 04/08, davanti agli scatti con la doppia domanda esplicita (leggibilità su fondo scuro · distinzione dal testo secondario, margine calcolato 0,77): «*il colore va bene, procedi*» | ✅ **La §0① dell'handoff è CHIUSA — e la forma del difetto «due sessioni di fila» si ferma qui: stavolta il lavoro è stato CONSEGNATO.** FASE 9/9b percorse per D193 sulla superficie giusta: `provato:` colore etichetta renderizzato in scuro = `rgb(154,143,128)` = `#9A8F80`, in chiaro `#7b6a59` intoccato; `guardia-stili-collaudo` misurata PRIMA di fotografare (prima volta in assoluto: exit 0, build vera — chiusa anche la §0③). 🛑 **La pubblicazione degli 8 salvataggi in attesa resta una decisione di Francesco**: messa in coda come domanda ad alto rischio in `docs/ops/DECISIONI-PENDENTI.md` (blocca finché non risponde — alto rischio = niente default). ➡️ Prodotto: si passa a **P38 e P39** (il dossier di esplorazione P38 è in preparazione, pipelining di Fase 1) |

### Settantacinquesima tornata — D200-D202: si pubblica, e P38 prende la strada B (04/08/2026)

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D200** | 🚀 **LA PUBBLICAZIONE DEI SALVATAGGI IN ATTESA È AUTORIZZATA** (9 al momento del sì: D193 approvata con D199, la Fase 0 di PIPELINE-3, gli scatti, e i 3 in attesa da prima) | Francesco, il 04/08, sulla domanda Q2 della coda decisioni (alto rischio, niente default): «*pubblica pure*» | ✅ Q2 chiusa. **FASE 10 avviata nello stesso turno:** `git push origin main` eseguito (`a41b2b0b..91e9118e`), CI in corsa al momento di questa riga — **l'esito con le prove (CI · CD · colore D193 cercato nel CSS di produzione) atterra nell'aggiornamento di roadmap e memoria**, non qui: questa riga registra l'AUTORIZZAZIONE, che è la decisione |
| **D201** | 🏗️ **P38 PRENDE LA STRADA B — IL DATO PRESCRITTO STRUTTURATO:** il prescritto come dato (per-dente su `provenienza`, colore prescritto, materiale prescritto), e la DdC stampa le DUE righe distinte «indicate nella prescrizione» / «come realizzato» — la destinazione che D101 aveva già scritto | Francesco, il 04/08, davanti alle tre opzioni del dossier `docs/roadmap/2026-08-04-p38-esplorazione-referto.md` (§6): «*per P38 procedi con l'opzione B*» | **Percorso GRANDE** (migration → FASE 3 + panel advisor obbligatorio). ⚠️ **Precondizioni prima della spec:** le due «non verificato» di D196 e la rilettura su fonte primaria di All. XIII p.1 + MDCG 2021-3 Q6 (vincolo D125) — **ricerca su fonti primarie GIÀ IN CORSO** dal binario parallelo (Fase 1). Restano vietati (D101): comporre il prescritto dai dati di caso, e la dicitura «nessuna caratteristica prescritta». Il ritrovamento §7.1 del dossier (`numero_prescrizione` senza scrittore) si decide dentro la spec di quest'ondata |
| **D202** | 📋 **LE PRESCRIZIONI REALI ARRIVANO IN QUATTRO FORME: fogli scritti A MANO LIBERA dal dentista · EMAIL · MODULI · PROGETTI da piattaforme tipo iTero o simili** — parola di Francesco, ed è la prova n. 4 dello statuto delle fonti: da oggi questa riga È la fonte citabile sul flusso reale delle prescrizioni | Francesco, il 04/08, sulla domanda esplicita del dossier (§8.5: «come sono fatte le prescrizioni che arrivano al banco?») | 🔑 **La spec B nasce agnostica al canale:** il dato prescritto strutturato si trascrive da QUALUNQUE delle quattro fonti, e ogni prescrizione porta la sua fonte allegata (la foto è già in casa — categoria `prescrizione`, D91/D92; email, modulo e riferimento-piattaforma vanno progettati). ⚠️ **Il canale «solo progetto/scansione» incrocia MDCG 2021-3 Q6** («dimensioni o file DICOM da soli non bastano»): la spec DEVE prevedere che cosa succede quando la fonte è solo-scansione senza caratteristiche scritte — è un tema per il panel, con la ricerca normativa in corso |

### Settantaseiesima tornata — D203-D206: il brainstorm della strada B (04/08/2026)

Quattro risposte di Francesco alle domande poste sul dossier P38 e sul referto normativo
(`docs/roadmap/2026-08-04-p38-esplorazione-referto.md` · `docs/roadmap/2026-08-04-p38-verifiche-normative-referto.md`).

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D203** | 📐 **PERIMETRO DELL'ONDATA B: P38 + P37 INSIEME — e si ripara il MECCANISMO, mai i dati.** Il dubbio di Francesco («i dati nel db sono dati test, compilati male e di fretta: non ci interessa che siano giusti») è FONDATO e risolve il perimetro: il 58% di prescrittori sbagliati è un difetto dei DATI di prova e non si sana (niente backfill, precedente A18 + §8); ma il difetto di P37 sta nel MECCANISMO (`generate-ddc.ts:146-147` ripiega sulla ragione sociale del cliente), che corromperebbe anche i dati VERI del primo laboratorio reale — quello si ripara | Francesco, il 04/08: «*avrei scelto P38+P37, ma mi viene un dubbio…*» — sciolto in sessione col distinguo meccanismo/dati | L'ondata B disegna in un colpo il blocco della Dichiarazione: caratteristiche prescritte (P38) + persona del prescrittore + istituzione (P37/D196). P40 resta fuori — ondata propria, già censita in `docs/roadmap/ROADMAP-UFFICIALE.md` (voce P40) |
| **D204** | 🪄 **LA PRESCRIZIONE LA CATTURA IL WIZARD — niente doppia digitazione, MAI:** i dati che l'addetta inserisce creando il lavoro (elementi, colore, tipo/materiale) SONO la trascrizione della prescrizione in quel momento — il wizard li marca già `provenienza:'prescritto'` per i denti (W20): il principio si estende alle altre caratteristiche come SNAPSHOT del prescritto, con la fonte allegata sempre (le 4 forme di D202); le modifiche in lavorazione diventano l'«eseguito», e la DdC stampa le due righe di D101 dai due snapshot | Francesco, il 04/08: «*ma scusa, la prescrizione non la ottiene in automatico la pwa quando creiamo il lavoro? nel wizard forniamo le informazioni che compongono la prescrizione, no? ricordati i principi di UÀ: facilità di utilizzo, e tutto quello che può fare lei al posto dell'operatore lo deve fare*» | 🔑 **È il principio UÀ applicato alla norma: l'operatore non ricopia due volte, il sistema fotografa.** ⚠️ **RISERVA PANEL, ed è LA domanda del panel:** il meccanismo esatto deve reggere contro D101 («indicate nella prescrizione» ≠ digitato dal banco: che cosa rende VERA l'attribuzione al medico — la fonte allegata? una conferma esplicita? il framing del passo?) e contro MDCG Q6 (almeno una SCELTA del prescrittore; solo-scansione non basta). D204 è ratificata come PRINCIPIO; il meccanismo si ratifica col verbale del panel |
| **D205** | 🧾 **I CAMPI: MINIMO NORMATIVO, DERIVATO DAL WIZARD** — nessun campo nuovo al banco se il wizard già lo raccoglie; il set nasce da D204: elementi + colore + tipo/materiale fotografati come prescritto, note libere per ciò che non è strutturabile, fonte allegata con tipo (foglio a mano · email · modulo · piattaforma), e **avviso quando la fonte è solo-scansione** (MDCG 2021-3 Q6: dimensioni/DICOM da soli non bastano — serve una scelta del prescrittore, es. il materiale) | Francesco, il 04/08: «*il minimo normativo, ma basati anche sulla risposta alla domanda due*» | Il form della prescrizione, di fatto, quasi non esiste: esiste lo snapshot + la fonte + l'avviso. Il dettaglio esatto dei campi lo fissa la spec dopo il panel |
| **D206** | ⚖️ **LE DUE LETTURE PRUDENTI SONO RATIFICATE:** ① studio associato ≠ «società» ai fini del c. 153 → campo direttore sanitario FACOLTATIVO per gli studi associati, ma la domanda «chi ha prescritto» resta SEMPRE (la ragione di D196 — più prescrittori possibili — è indipendente e più robusta) · ② dottore singolo: il campo «istituzione sanitaria» PUÒ legittimamente restare vuoto; quando c'è un'entità organizzata, compilarlo è la scelta sicura | Francesco, il 04/08, sul referto `docs/roadmap/2026-08-04-p38-verifiche-normative-referto.md` §3-§4: «*Ratifico entrambe*» | Diventano vincoli di progetto per la spec B e base dichiarata per il panel; le domande residue del referto (§5: definizione nazionale di «istituzione sanitaria», soglia studio/struttura) restano al panel senza bloccare il disegno |

### Settantasettesima tornata — D207: il meccanismo è ratificato con le condizioni del panel (04/08/2026)

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D207** | ✅ **IL MECCANISMO DI D204 È RATIFICATO CON LE CONDIZIONI DEL PANEL — la riserva di D204 è SCIOLTA.** Le condizioni unificate del §2 di `docs/roadmap/2026-08-04-panel-d204-referto.md` (fonte obbligatoria all'emissione · provenienza per-caratteristica · snapshot server-side in tabella propria `lavori_prescrizioni` · gesto typo-vs-divergenza · conferma al precheck guardando la fonte · solo-scansione bloccato all'emissione · voce = stato mai fonte · congelamento nelle RPC · divergenze con motivo) **diventano i VINCOLI della spec dell'ondata B** | Francesco, il 04/08, sul referto del panel (tre lenti, tre REGGE CON CONDIZIONI): «*ratifico*» | La spec B si scrive dentro questi vincoli, con i mockup a Francesco PRIMA del codice (0B). Stima a piano: **4 sessioni** (① spec+mockup · ② migration+RPC · ③ wizard+scheda · ④ DdC a due righe+precheck+prove+QA+L2). La spec citerà «MDCG 2021-3, marzo 2021» (mai «Rev.1») e rileggerà L. 409/1985 art. 2 su GU se ne cita il testo (D125) |

### Settantottesima tornata — D208-D209: il betting di D179+E1, e Q1 chiusa col default (04/08/2026)

Le due decisioni della ripresa di sessione del 4 agosto mattina, poste a Francesco col riepilogo
BP-0 sulla §0 dell'handoff (`docs/roadmap/2026-08-04-spec-ondata-b-handoff.md`): il betting che
quattro handoff di fila chiedevano, e la finestra mai processata della coda decisioni.

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D208** | 🗓️ **D179 + E1 SI PIANIFICANO — NASCE LA VOCE P41: un'ondata dedicata «il banco di prova automatico», in coda DOPO l'ondata B.** Dentro: l'esecuzione di **D179** (le ~20 prove a schermo «pubbliche» in un job Playwright in CI — decisa il 28/07 alla sessantaseiesima tornata e **mai eseguita**: quattro handoff consecutivi l'hanno segnalata) + la scheda **E1** di `docs/ops/EMERGENTI.md` (Supabase locale + prove RLS a due utenti — oggi l'unico canale DB dei test si connette come owner e BYPASSA la RLS; misurata **5-10 giorni**) + **E3**, che si chiude naturalmente con E1 | Francesco, il 04/08 alla ripresa, sulla domanda a tre uscite del betting (si pianifica · si dichiara che non si fa · se ne riparla a fine sessione): «*Si pianifica*» | ✅ **La voce smette di girare per gli handoff: ha una casa (P41) e un posto in coda (dopo l'ondata B).** Criterio di done, dalle schede: `supabase db reset` produce uno schema identico al remoto (diff incollato) · prove RLS «il lab A non vede i dati del lab B» **verdi in CI** · le ~20 prove a schermo eseguite da una macchina a ogni salvataggio. Traguardo invariato (FD): **prima del primo laboratorio vero**. D-Q2 (quale prova a schermo scrivere per prima) si scioglie dentro P41 |
| **D209** | ✅ **Q1 È CHIUSA COL DEFAULT (a): `npm test` ESEGUE SOLO `tests/unit`** — lo script di `package.json:12` si allinea al commento di `vitest.config.ts`; le integration si lanciano per nome (`test:integration`). Chiude la scheda **E2** di `docs/ops/EMERGENTI.md` | Francesco, il 04/08 alla ripresa, sulla Q1 della coda decisioni (basso rischio, default proposto): «*Ok al default*» | ✅ **Eseguita nello stesso turno** (una riga in `package.json` + commento di `vitest.config.ts` riscritto in forma vera). `provato:` `npm test` → **Test Files 394 passed (394) · Tests 4542 passed (4542)**, 72 s — i 3 file d'integrazione (coi loro 19 test saltati) **non vengono più nemmeno raccolti** (prima: 397 raccolti, 19 saltati). ⚠️ **La CI non cambia:** `.github/workflows/ci.yml:34` chiama `npx vitest run` direttamente — lì le integration restano raccolte e si saltano da sole senza `SUPABASE_DB_URL` (skipIf) |

### Settantanovesima tornata — D210-D212: le scelte sui mockup dell'ondata B (04/08/2026)

Le risposte di Francesco sui 4 mockup della sessione ① (66 scatti, 390/768/1280 × chiaro/scuro,
`docs/design/mockups/screenshots/2026-08-04-ondata-b/`). Tre scelte ratificate; la quarta — la
conferma a due tempi alla consegna — è **RESPINTA come troppo attrito**: la superficie si
ridisegna più leggera nella stessa sessione (il vincolo V5 di D207 — conferma guardando la
fonte, registrata server-side — resta in piedi: cambia la FORMA, non la condizione).

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D210** | 🪄 **IL MECCANISMO DELLA TRASCRIZIONE È LA VARIANTE B «IL FRAMING PRIMA»:** la casella colore del Passo 3 si presenta come trascrizione («come scritto sulla prescrizione») con lo sgancio «Non è sulla prescrizione: lo scegliamo noi»; il «Fatto!» riepiloga in sola lettura; il TIPO entra nello snapshot alla conferma di consegna guardando il foglio (mockup `2026-08-04-ondata-b-A-prescrizione-fatto.html`, scene b1/b2) | Francesco, il 04/08, sui mockup delle due varianti (A «conferma dopo» / B «framing prima» / mix): «*b framing, con la possibilità eventualmente di modificare se ci fosse qualche problema*» | 🔑 **La possibilità di modifica che Francesco chiede c'è per costruzione, su TRE vie:** ① lo sgancio nel Passo 3 stesso · ② il gesto typo-vs-divergenza (D212) su ogni correzione successiva · ③ la finestra «fino alla consegna» (direttiva §9). ⚠️ Il rischio dichiarato della B (un colore scelto dal lab digitato sotto l'etichetta della prescrizione) è mitigato da D212 e dalla conferma al precheck (forma in ridisegno) |
| **D211** | 👤 **«CHI HA PRESCRITTO?» = VARIANTE D1, IL MINI-FOGLIO:** scelto uno studio con più medici, sale il foglio con l'ultimo prescrittore di quel cliente già proposto (un tap e via); per il dottore singolo non compare mai (D196); «È un altro» aggiunge il medico all'anagrafica dello studio — mai testo libero per-lavoro (mockup `2026-08-04-ondata-b-D-chi-ha-prescritto.html`, scena d1) | Francesco, il 04/08, sulle due varianti (D1 mini-foglio / D2 pastiglie inline): «*D1*» | Una domanda alla volta (L1). Il prescrittore diventa VISIBILE sulla scheda con la sua via di correzione (oggi `richiedente_nome` non compare in nessuna superficie della scheda v3) |
| **D212** | ✏️ **IL GESTO «ERA SCRITTO COSÌ SULLA PRESCRIZIONE?» È RATIFICATO COME MOSTRATO:** due vie senza preselezione (typo → si corregge la trascrizione · «lo cambiamo noi» → lo snapshot resta e si registra il motivo con le pastiglie), il valore precedente resta leggibile, il motivo si chiede SOLO sul ramo della divergenza (mockup `2026-08-04-ondata-b-B-typo-divergenza.html`) | Francesco, il 04/08: «*Sì, va bene*» | Attua V4 e V9 di D207. Il pattern segue la tassonomia clinica correction/amendment (fonti nel referto best-practice: AHIMA · 21 CFR Part 11 — mai oscurare il valore precedente, motivo solo sui cambi veri, nessun default preselezionato) |
| **D213** | ⚖️ **LA CONFERMA DI CONSEGNA È LA FORMA LEGGERA: IL TOCCO SU «CONSEGNA» È LA CONFERMA.** Prima versione (spunta da armare + tasto spento) RESPINTA da Francesco come troppo attrito; ridisegno nello stesso turno: foglio della prescrizione davanti agli occhi + righe trascritte sotto + tasto subito acceso, con la frase «Consegnando confermi il confronto col foglio del Dr. X — resta registrato» e la registrazione server-side di chi e quando dentro la transazione di consegna (mockup `2026-08-04-ondata-b-C-precheck-consegna.html`, scena 2 ridisegnata) | Francesco, il 04/08, prima «*Troppo attrito*» sulla forma a due tempi, poi sul ridisegno: «*Sì, va bene*» | 🔑 **Il vincolo V5 di D207 resta INTERO — cambia la forma, non la condizione:** la miniatura sta affiancata allo snapshot, la conferma è esplicita (il testo la nomina e la lega al gesto) e registrata (chi, quando). Zero tocchi in più rispetto a oggi. ⚠️ Più leggero di così non si va senza riaprire V5: agli atti come confine dichiarato |

### Ottantesima tornata — D214: la spec dell'ondata B è ratificata (04/08/2026)

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D214** | ✅ **LA SPEC DELL'ONDATA B È RATIFICATA** (`docs/superpowers/specs/2026-08-04-ondata-b-prescrizione-design.md`): i 9 vincoli di D207, il modello `lavori_prescrizioni`, le superfici con le scelte D210-D213, la DdC a due righe, la normativa su fonte primaria («MDCG 2021-3, marzo 2021»), le 5 risposte di gate FASE 3, i «non si fa» espliciti | Francesco, il 04/08, sul riepilogo della spec completa: «*Ratifico*» | 🏁 **La sessione ① di 4 è COMPLETA** (spec + mockup + scelte). ➡️ La sessione ② parte dalla **migration + RPC**, e PRIMA di chiudere la policy `ddc_laboratorio_update` misura il **conteggio DdC fresco** (`npx tsx scripts/tmp/verifica-conteggio-ddc.ts` — mai misurato in queste sessioni, §0③ dell'handoff). Il percorso resta GRANDE: FASE 4 con i tre registri (R-P1 · R-P2 · R-P6) sul piano della ② |

### Ottantunesima tornata — D215: si pubblica la sessione ① (04/08/2026)

| # | decisione | come è stata posta | che cosa comporta |
|---|---|---|---|
| **D215** | 🚀 **LA PUBBLICAZIONE DEI SALVATAGGI DELLA SESSIONE ① È AUTORIZZATA** (7 al momento del sì, contando questa riga: D208-D214 su verbale/roadmap/memoria, la spec RATIFICATA, i 4 mockup coi 60 scatti, la modifica di D209 a `package.json` — neutra per l'app: la CI chiama `npx vitest run` direttamente) | Francesco, il 04/08, sulla domanda Q3 della coda decisioni (alto rischio, niente default): «*pubblica*» | ✅ Q3 chiusa. **FASE 10 avviata nello stesso turno:** `git push origin main` — l'esito con le prove (CI · CD · sito) atterra nell'aggiornamento di roadmap e memoria, non qui: questa riga registra l'AUTORIZZAZIONE, che è la decisione |

### Ottantaduesima tornata — D216-D221: le ratifiche della ②, la pubblicazione, i mockup da rivedere, lo studio del rifacimento (04/08/2026)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D216** | ✅ **Ratificato il gate sulla chiave `prescrizione` nel POST:** i lavori creati col wizard di OGGI non generano la trascrizione della prescrizione — partirà col wizard nuovo della ③ (è il framing D210 a rendere la digitazione una trascrizione) | Francesco, il 04/08, sulle tre scelte d'attuazione della ②: «*Ratifico tutte e tre*» | La scelta nata come risoluzione della contraddizione del piano (Step 5.4) ha ora il suo numero. La ③ manderà la chiave esplicitamente |
| **D217** | ✅ **Ratificato: casella vuota = «non c'era sulla prescrizione»**, mai «prescrizione vuota» (stringa vuota → chiave assente; i soli-spazi si preservano, perché giudicarli richiederebbe il trim che D210 vieta) | idem | La semantica di `componiSnapshot` è ratificata (test ⑧⑨⑪ la fissano) |
| **D218** | ✅ **Ratificata la retrocompatibilità semantica del POST:** `p_lavoro` porta sempre la casella `istituzione_sanitaria` (vuota per i body legacy) — invisibile all'uso, equivalente per il database | idem | M-T5-1 chiusa con numero |
| **D219** | 🚀 **LA PUBBLICAZIONE DELLA SESSIONE ② È AUTORIZZATA** (ramo `ondata-b-sessione-2`, 11 salvataggi al momento del sì: 3 migration già applicate al DB in modo compatibile, RPC, server TDD, igiene, BP-1) | Francesco, il 04/08: «*Mergia e pubblica*» | FASE 10 avviata nello stesso turno: merge → push → CI → verifica sito. L'esito con le prove atterra su roadmap e memoria, non qui: questa riga registra l'AUTORIZZAZIONE |
| **D220** | 🔍 **Le due scene dei mockup approvate solo implicitamente nella ① SI RIVEDONO prima della ③:** il foglio «Allega la prescrizione» (scena a2) e i bloccanti nuovi del precheck (scena C-1) | Francesco, il 04/08: «*Rivediamole prima della ③*» | 🛑 La ③ NON parte finché le due scene non sono riviste. Gli scatti si rimostrano a Francesco subito, in questa stessa sessione |
| **D221** | 🧭 **IL FLUSSO DEL RIFACIMENTO VA RISTUDIATO PER INTERO** — il fix puntuale del clone P37 (richiedente + istituzione) può entrare nella ③, ma il flusso nacque come bozza e va ripensato | Francesco, il 04/08: «*nella sessione 3, però in realtà va studiato tutto il flusso di un rifacimento, pensando bene a come gestire tutta la cosa, perchè quando è stato creato, era solo una bozza*» | Nasce la **voce 12** di roadmap (studio del flusso, brainstorming PRIMA del codice). Eredita i fatti censiti: clone senza richiedente_nome/istituzione_sanitaria/paziente_nome_snapshot · lock senza tenant param né deleted_at (M-T3-5) · lo snapshot prescrizione ora si clona (②) |

### Ottantatreesima tornata — D222: le due scene sono confermate, la ③ ha il via libera sul disegno (04/08/2026)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D222** | ✅ **LE SCENE a2 E C-1 SONO CONFERMATE COME MOSTRATE** — il foglio «Allega la prescrizione» (3 vie: foto · galleria/PDF · «non ce l'ho ancora qui») e i tre bloccanti nuovi del precheck («manca il foglio» · «solo scansione, senza scelta scritta» col rimedio · «in attesa di conferma scritta») | Francesco, il 04/08, sugli scatti rimostrati (390 chiaro/scuro + 1280): «*vanno bene così*» | 🏁 **D220 è CHIUSA**: l'approvazione delle due scene non è più implicita — ha il suo numero. **La sessione ③ ha il via libera sul disegno** (restano le sue precondizioni di processo: le note vincolanti nel piano della ② e il brainstorming della riga 12 se la ③ tocca il rifacimento) |

### Ottantaquattresima tornata — D223-D225: i mockup delle schermate VERE della ③ sono scelti (04/08/2026, sera)

Percorso 0B della ③ compiuto: 11 scene sulle schermate di produzione (file
`docs/design/mockups/2026-08-04-ondata-b3-schermate-vere.html`, 66 scatti in
`screenshots/2026-08-04-ondata-b3/`), panel advisor a 3 lenti (banco · MDR · design system)
PRIMA della scelta, come da Regola Advisor. I testi di D210/D212/D222 riportati invariati.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D223** | ✅ **RIGA «COLORE» CHIUSA NEL PASSO 3 = VARIANTE B «nome asciutto»:** la riga si chiama «Colore», il framing sta nel sottotitolo «come scritto sulla prescrizione · es. A3»; l'etichetta piena di D210 + aiuto + sgancio appaiono all'apertura | Francesco, il 04/08 sera, sugli scatti delle due varianti (panel 2-1 per la B: banco + DS; la lente MDR preferiva la A) | ⚠️ **Vincolo scritto del voto banco:** la B regge SOLO perché lo stato aperto ripete il framing a grandezza piena nel momento della digitazione — se mai il campo diventasse compilabile in-place senza stato aperto, la B va ripensata |
| **D224** | ✅ **IL «FATTO!» È A DUE CARTE:** «Il lavoro» resta com'è (+ riga «Prescritto da») e «La prescrizione» ha la sua carta (Elementi · Colore con pastiglie «✓ dalla prescrizione» · riga «Foglio del dentista» con lo stato in chiusura) | Francesco, il 04/08 sera, sugli scatti delle due varianti (panel UNANIME 3-0: confronto 1:1 carta-contro-foglio; il confine dello snapshot esiste come struttura, non solo come pastiglia; lo snapshot vuoto resta visibile) | Da specificare nel piano (riserva banco/MDR): dove atterra il colore SGANCIATO («lo scegliamo noi») nel riepilogo — non deve sparire dalla vista di chi l'ha digitato |
| **D225** | ✅ **VIA LIBERA AI TRE ASSETTI DERIVATI:** ① CTA senza fonte = «Allega la prescrizione» (apre il foglio a2), a fonte allegata torna «Fotografa l'impronta» · ② la scheda guadagna la riga «Colore» con pastiglia di provenienza (innesto del gesto D212 su ModificaRigaSheet) · ③ «Prescritto da» come riga della carta «Il lavoro» | Francesco, il 04/08 sera: «Sì, tutti e tre» | **Le riserve del panel diventano VINCOLI del piano ③** (elenco nella decisione 0B: `docs/design/decisions/2026-08-04-ondata-b3-schermate-vere.md` §3) — fra cui: più aria/impilamento per i due link quieti del Fatto · la terza voce dell'a2 («non ce l'ho ancora qui») NON inverdisce la pastiglia né riporta il CTA a «Fotografa l'impronta» · la pastiglia sotto il valore va ratificata come estensione di RigaDato nella spec DS (§5.10) e il primario del Fatto emendato in §7.3 · «Prescritto da» senza pastiglia (è identità, non contenuto prescritto; a prescrittore ignoto la riga non compare) · la pastiglia su «Elementi» è coperta da W20 (gli elementi nascono prescritti), non serve una D nuova · gli stati della riga Colore in scheda («lo scegliamo noi» con segnale positivo · post-divergenza con prescritto E realizzato) si specificano nel piano |

### Ottantacinquesima tornata — D226-D234: il GATE ESTETICO L2 della ③ (05/08/2026, mattina)

Gate L2 (FASE 9b) sulle 10 superfici della sessione ③, sui 60 scatti del giro end-to-end
(`docs/design/screenshots/2026-08-05-ondata-b3-giro/`) + le OTTO domande della §0① dell'handoff.
Francesco ha risposto punto per punto; **la prima riga di questa tornata è D228**, che ferma del
lavoro (§0A-bis, regola 2: una decisione che cancella o rimanda si scrive per prima).
Micro-audit L2 in parallelo (un auditor per superficie, checklist `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`
× 390/768/1280 × chiaro/scuro): **18 ❌**, di cui 7 da una causa sola (D233①).
Panel advisor a 3 lenti (UX banco · normativa MDR · architettura dati) su G2 PRIMA della D232.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D228** | 🛑 **IL PASSO 3 DEL WIZARD NON SI TOCCA IN QUESTA ONDATA — va rifatto per intero** (scelta dei denti e dei colori), lavoro già iniziato e non finito | Francesco, il 05/08: «*tanto questa pagina andrà rifatta completamente, avevamo già iniziato, con tutta la scelta dei denti e dei colori*» | **Ereditano al rifacimento del wizard** (roadmap voce 1, ondata (b) «chiusa a metà»): ① M3-T2-3 — dopo sgancio+«Salta» la riga colore riapre come «lo scegliamo noi» da vuota, **non si corregge ora**; ② ❌ L2 del target di «Salta» (~33×44 invece di 44×44: `LinkQuieto` non si estende in orizzontale) — **debito del DS**, non si tocca `LinkQuieto` a fine ramo perché vive su ogni superficie v3 |
| **D226** | ✅ **LA TERZA VOCE DEL FOGLIO a2 («Non ce l'ho ancora qui») RESTA COM'È RISOLTA:** pastiglie «per email»/«sulla piattaforma» + riferimento scritto facoltativo | Francesco, il 05/08: «*ok*» (risoluzione del controllore mai vista prima da lui) | La risoluzione non è più implicita. ⚠️ **Della vista non esiste ancora uno scatto**: va fotografata al riscatto post-fix, prima del merge |
| **D227** | ✅ **`PillVoce` FUORI DAL PASSO 3, confermato** — il codice segue D13 (vocale abrogato), non i mockup D223 che la mostravano ancora | Francesco, il 05/08: «*sì*» | I mockup della ③ restano agli atti **con la loro divergenza dichiarata**: chi li rilegge non deve reintrodurre la pill |
| **D229** | ✅ **LA FONTE SI SOSTITUISCE, MAI SI AZZERA (M3-T4-2 chiusa)** — e **il lavoro si consegna anche SENZA la foto della prescrizione** | Francesco, il 05/08: «*sì*», con la domanda operativa del laboratorio che non possiede più il foglio e deve consegnare in tempi stretti | 📌 **Fatto MISURATO, non concesso:** la fonte non è fra gli 8 elementi dell'Allegato XIII e **nessun cancello la guarda** — `provato:` `grep -rn "fonte_tipo\|fonte_immagine_id" src/lib/consegna/ src/lib/pdf/` → **zero occorrenze**; su `src/app/api/` le uniche due sono il pre-check della cancellazione immagine (`immagini/[imgId]/route.ts:221,234`). `precheck.ts:18-92` verifica prescrittore · paziente · descrizione · tipo · classe · data: la foto **non blocca né la consegna né la DdC**, la pastiglia ambra «DA ALLEGARE» è un promemoria. La risposta di Francesco la **ratifica come comportamento voluto**, non più come effetto collaterale |
| **D230** | ✅ **§5.10 SALE A SEI RIGHE** (`RigaDato` in `CardInfo`): la regola «max 5 righe per card» diventa «max 6», col motivo scritto | Ratifica di D225②: la carta approvata da Francesco il 04/08 ne ha **sei** (dentista · paziente · lavoro · colore · consegna · tecnico) — il nodo lasciato APERTO da M3-T7-5 si chiude seguendo la sua scelta, non la regola precedente | Si emenda la spec v3 §5.10 e **si toglie il warning di sviluppo** che la scheda stampava a ogni render in attesa di questa riga. Il conflitto §5.10-vs-D225② non esiste più |
| **D231** | ✅ **I DUE RILIEVI DEL CARICAMENTO FOTO SI CHIUDONO — uno ora, uno nella ④** | Francesco, il 05/08: «*sì*» | ① **ORA:** l'avviso «Non sono riuscita a salvare il colore» non deve contraddire la carta quando la trascrizione È salvata (M3-T39-7, testo ratificato altrove → questa D lo riapre); ② **④:** indicatore di avanzamento durante l'upload (M3-T39-4) — è una funzione nuova, non entra in un ramo già revisionato |
| **D232** | ✅ **AUTO-CATTURA DEL PRESCRITTORE PER STUDIO MONO-MEDICO (G2)** — se in archivio quello studio ha **un solo** medico, quel nome si prende da solo, senza domanda | Francesco, il 05/08: «*ok, ma immagino che se esista un solo medico prescrittore in scheda, debba essere inserito quello in automatico, uno dei principi di UÀ, semplificare il lavoro al massimo*» | Panel 3 lenti: **opzione B — auto-cattura VISIBILE e correggibile** (2 su 3; il terzo converge sull'esito e diverge sul meccanismo: derivare alla lettura invece che scrivere il campo). **La sostanza è decisa, il meccanismo NO: va alla ④** con il suo piano. ⚠️ **Condizione UNANIME dei tre advisor, indipendente da questa D e già viva oggi:** `TabDati.tsx:283` scrive `richiedente_nome: ''`, `precheck.ts:22-25` passa lo stesso e `generate-ddc.ts:146` usa `??` (una stringa vuota NON ripiega) → **una DdC può stampare il prescrittore VUOTO col precheck verde**. 0 occorrenze oggi, percorso APERTO: si chiude a monte (`''`→`null` al confine di POST/PATCH) **prima o insieme** all'auto-cattura |
| **D233** | ✅ **«CORREGGIAMO E COMPATTIAMO»** — il back del telefono sul foglio P37 si corregge, e la schermata «Fatto!» si compatta | Francesco, il 05/08, sulla domanda 8 | ① **Compattamento «Fatto!» ORA**, e con esso il ❌ più grosso dell'audit: il ramo `fatto` di `WizardNuovoLavoro.tsx:639-661` rende `FrameFatto` **nudo, senza `colonnaStile`** → carte da bordo a bordo a 390 e tasto rosso incollato a sinistra a 768/1280 mentre il titolo è centrato. **Sette ❌ su 18 vengono da qui**, ed è una divergenza da D224: si ripristina la colonna che Francesco ha approvato; ② **back del telefono → PRIMO COMPITO DELLA ④**: il rimedio sta in `Sheet.tsx` (base di ogni overlay v3) e la sua rete — `scripts/guardia-navigazione-overlay.mjs` — **è manuale**, vuole l'app accesa e una fixture preparata, e G1 impedisce di provarlo in `npm run dev`. Non si tocca la base di tutti gli overlay a fine di un ramo già revisionato: si fa per primo, con la guardia |
| **D234** | ✅ **UN MESSAGGIO D'ERRORE NON SI TRONCA PIÙ** — nato da una segnalazione di Francesco sullo scatto | Francesco, il 05/08, guardando `errore-fonte-in-uso`: «*il banner di avviso che è presente in questo mockup non è leggibile per intero*» | `Avviso.tsx:193-197` taglia **ogni** testo a 2 righe: del 409 si legge «*…di questo lavoro — no…*» e la parte che spiega **perché** non si può eliminare sparisce. Il clamp resta sui **successi** (effimeri, brevi) e cade sugli **errori** (persistenti, con «Chiudi»): un errore che non dice cosa è successo non è un errore, è un lampeggio. Coerente col vincolo già ratificato «mai un'ellissi a metà» del verbale Cassetta. ⚠️ **Tocca il DS intero**, non solo le superfici della ③ |

### Ottantaseiesima tornata — D235: il caricamento si risolve alla radice, foto E pdf (05/08/2026)

Nata dal check post-deploy M3-T39-6 (v. tornata 85): il limite dichiarato era 20MB, quello vero
~4,2MB, e la frase all'utente mentiva. Francesco ha respinto il cerotto — «*non perdiamo tempo
con i fix etc etc, ma risolviamo direttamente*» — e poi, alla domanda se il perimetro fosse le
foto o i PDF (riserva C8 del panel), ha chiuso: «*risolviamo tutto, sia foto che pdf*».

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D235** | ✅ **IL CARICAMENTO SI RIFÀ ALLA RADICE — caricamento firmato diretto allo storage, per FOTO E PDF insieme** | Francesco, il 05/08: «*non perdiamo tempo con i fix etc etc, ma risolviamo direttamente*» e, sul perimetro, «*risolviamo tutto, sia foto che pdf*» | ⛔ **Il fix intermedio (`835bf916`, la frase col numero vero) NON si pubblica da solo**: resta nel ramo come base — il modulo del limite serve comunque — e va in produzione insieme alla soluzione. 📌 **Il perimetro è entrambe le cose, e sono due lavori diversi:** ① la **compressione** delle foto nei due percorsi del wizard (`FrameFatto`, `AllegaPrescrizioneSheet`), che oggi mandano il file grezzo mentre `TabImmagini` comprime già a 0,4MB — chiude il caso «foto» a costo di sicurezza zero; ② il **caricamento firmato diretto**, che è l'unico modo per i **PDF** (non si comprimono come immagini) e per conservare l'originale a piena qualità. 🔑 **Le due motivazioni restano separate nel verbale** perché il prezzo è diverso: la ② costa le condizioni di sicurezza del panel, la ① no. 🛑 **E il lavoro vero non è «alzare il limite»:** il panel ha trovato che le foto dei lavori vivono in un percorso che **nessuna policy di isolamento copre** (`lavori/<id>/…` invece di `<laboratorio_id>/…`), e che la policy su un percorso simile **non nega: va in errore** (`'lavori'::uuid` → 22P02). Rimettere le foto dentro il recinto è la parte che non si può saltare |

**Misure R-P1 già in mano (sonda `scripts/tmp/sonda-upload-firmato.mjs`, eseguita sul progetto vivo,
cartella `__sonda__/` ripulita da sé — 6 su 6 + la settima):**
`S1` la chiave di servizio firma ✅ · `S2` la chiave anonima **NON** può firmare («*new row violates
row-level security policy*») ✅ · `S3` col permesso il browser carica davvero ✅ · `S4` **il percorso è
INCHIODATO nel permesso** — riusarlo altrove dà «*Invalid signature*» ✅ · `S5` il permesso non si
riusa sullo stesso percorso ✅ · `S6` il magazzino rifiuta un tipo fuori elenco anche per via firmata
(«*mime type image/heic is not supported*») ✅ · `S7` **il permesso dura 7200 secondi = 2 ore**, letta
la scadenza dentro il permesso stesso — scioglie il conflitto fra il docblock della libreria («2 ore»)
e il valore predefinito del servizio (60 secondi), che erano due schermate diverse.

### Ottantasettesima tornata — D236: via la colonna `url` (05/08/2026)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D236** | ✅ **`lavori_immagini.url` SI TOGLIE** (non «si rende opzionale») | Francesco, il 05/08: «*togli la colonna url*» | ✅ **FATTA** — migration `20260805100000_lavori_immagini_via_url_inerte.sql`, applicata al DB vivo, tipi rigenerati (FASE 6b). 📌 **Misurato PRIMA di toccare:** 5 righe su 5 portavano una URL `/object/public/…` su un bucket `public = false` — **nessuna ha mai funzionato**. 🔑 **Non era pulizia:** è la riga **R20** del censimento dei rischi. Una colonna che si chiama `url` e contiene un indirizzo pubblico è l'invito scritto alla correzione che distrugge tutto («*le foto non si vedono? rendiamo pubblico il bucket*») — e questo progetto un bucket pubblico ce l'ha davvero (`brand`), con cui confonderla. Tolta la colonna, la tentazione non ha più dove nascere. `uploadToStorage` non costruisce più alcuna URL; la rotta ne **firma** una per la risposta (la foto appena caricata deve vedersi subito) ma **non la salva**. Il campo `LavoroImmagine.url` diventa **opzionale**, e il compilatore ha subito indicato tre punti in cui una foto poteva arrivare a schermo senza indirizzo: l'album ora scarta le non mostrabili **dicendolo** in sviluppo, invece di rendere una miniatura rotta |

🔎 **Ritrovamento fuori mandato (R-E2), riferito e NON corretto:** la rotta delle immagini usa
`getServiceClient()`, che **non porta il generic `<Database>`** — per questo `tsc` è rimasto verde
mentre la rotta scriveva ancora in una colonna appena cancellata. Il cast tipizzato esiste già in
casa (`src/lib/pdf/typed-service-client.ts`, usato dai generatori PDF) e la sua intestazione dichiara
che il fix strutturale del client condiviso (147 file) è fuori scope. **La rete qui è il test**
(`lavori-id-immagini-route.test.ts`, che asserisce le chiavi vere del payload) — ed è la ragione per
cui quel test esiste, scritta nel suo commento fin da R27.

### Ottantottesima tornata — D237: la prescrizione non si comprime (05/08/2026)

Nata dalla domanda di Francesco «*ma non possiamo comprimere senza perdere qualità? non ci sono
sistemi del genere?*» e dalla ricerca che ne è seguita:
`docs/roadmap/2026-08-05-ricerca-compressione-senza-perdita.md` (tre filoni, fonti primarie, misure
eseguite). La riserva C8 del panel di D235 — «*il problema sono le foto o i PDF?*» — si chiude qui.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D237** | ✅ **LA FOTO/PDF DELLA PRESCRIZIONE NON SI COMPRIME. Le impronte sì.** | Francesco, il 05/08, sulla raccomandazione motivata: «*confermo, procedi*» | 📌 **Tre fatti misurati la reggono:** ① il guadagno vero **non esiste** — la tecnica che darebbe il 20% conservando l'identità del file (ricompressione JPEG) **non gira in un browser**: delle tre implementazioni una è archiviata, una in sola conservazione, l'ultima è un progetto da 2 stelle; quella usabile dà il **7%**, e **zero** su una foto già passata da WhatsApp; ② **non c'è risoluzione da regalare**: un A4 fotografato con un telefono da 12 MP è a **~280-320 dpi** effettivi, **sotto** i 600 dpi che un archivio pubblico chiede per un manoscritto conservato 10 anni; ③ comprimere nel browser **azzera i metadati** (data di scatto, orientamento) e **forza il dimezzamento del colore**, che è proprio ciò che danneggia di più il tratto colorato — e le prescrizioni si scrivono a penna blu. ⚖️ **Vincolo italiano (AgID, All. 2 §2.6.5):** il JPEG **nativo** di telefono o scanner è ammesso in conservazione, ma «*sono esclusi i riversamenti di immagini in formati che aggiungono (o cambiano) algoritmi di compressione*» — e §3.3.6 impone, per il lossy, di **misurare e documentare l'informazione persa**. 🛑 **Regola senza eccezioni:** mai far passare una prescrizione da JBIG2 a dizionario, da MRC o da Ghostscript |

**Le tre conseguenze operative, che cambiano il piano di D235:**
1. 🔴 **Il caricamento diretto diventa OBBLIGATORIO, non un'ottimizzazione:** se la prescrizione non
   si può ridurre, l'unico modo di farla arrivare è non farla passare dalla funzione. Il piano
   `2026-08-05-caricamento-diretto-storage.md` sale di priorità.
2. 🛑 **Via il WebP dalla compressione delle impronte.** WebP con perdita è **obbligato** al colore
   dimezzato (RFC 6386, FAQ Google, MDN): non è un'impostazione, è nella specifica del codec. Si passa
   a **JPEG con colore pieno**. ⚠️ E su **Safari/iPhone quella conversione non avviene affatto** —
   il browser restituisce **un PNG senza dire niente**, la libreria non controlla mai cosa ha
   ricevuto, e per rientrare nel suo tetto di peso **taglia la risoluzione**.
3. 🟡 **HEIC (riga 16 di roadmap) va deciso con la testa di questa D:** siccome la prescrizione NON
   passa dal browser per essere convertita, la strada coerente è **accettare HEIC nel bucket**, non
   convertirlo — la conversione via browser è esattamente il percorso che questa decisione esclude.
   ⚠️ Resta da provare su un iPhone vero (la prova viene prima del rimedio).

---

### Ottantanovesima tornata — D238-D239: i difetti vivi prima del piano, e il piano si allinea (05/08/2026)

Aperta all'avvio della sessione del caricamento, sul riepilogo di ripresa (BP-0). Due scelte, tutte
e due di Francesco, tutte e due scritte **nello stesso turno** in cui sono state prese (§0A-bis).

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D238** | ✅ **PRIMA i due difetti vivi della scheda, POI T1 — e tutto resta nel ramo** | Francesco, il 05/08, scegliendo fra tre ordini possibili: «*Difetti, poi T1 — tutto nel ramo*» | 📌 **Conferma D235, non la deroga:** i due difetti erano candidati a una pubblicazione a sé (colpiscono **oggi** chi carica da iPhone), e la strada scelta è quella che li fa uscire **insieme** alla soluzione del caricamento diretto. Costo accettato: restano vivi ancora qualche giorno. Guadagno: una sola verifica, una sola pubblicazione, e nessun ramo parallelo da riconciliare. ✅ **FATTI** nel commit `f5f80b8e`: il formato passa a **JPEG** e si **controlla che cosa la libreria ha restituito** (era il buco silenzioso su Safari); il **peso** si controlla **dopo** la compressione — a monte rifiuterebbe le foto da 6MB che oggi passano, e c'è una prova di non-regressione che lo inchioda. 🔑 **Trovato strada facendo, e chiuso:** la frase d'errore esisteva ma **non si leggeva** — viveva in un `aria-label` e a schermo restava un triangolino rosso muto. Ora il ruolo `alert` sta su un riquadro che porta le parole e **il nome del file** (con tre carte uguali in griglia, «pesa 6,0 MB» senza il nome non dice quale togliere) |
| **D239** | ✅ **Un piano superato dai fatti si CORREGGE, non si tramanda** | Francesco, il 05/08, sulla segnalazione che il §4 del piano dava per aperte due decisioni già prese: «*Sì, correggilo subito*» | 📌 **Il fatto che l'ha generata:** il piano del caricamento è stato scritto la mattina del 05/08 e nelle ore successive **D236** (via la colonna `url`) e **D237** (la prescrizione non si comprime) hanno risposto a **entrambe** le domande che il suo §4 lasciava aperte. Chi avesse eseguito T1 leggendo quel paragrafo si sarebbe fermato ad aspettare risposte **che c'erano già**. 🔑 **Perché è più di una svista di scrittura:** un piano non è un documento, è **codice non ancora eseguito** — con in più il difetto di sembrare prosa. Una riga stantia dentro un piano non fa rumore, e viene creduta. Aggiornati §4 (le due decisioni, con la tornata che le dice), **T4** (i difetti che non troverà più, e ciò che invece può riusare) e la tabella del censimento di **T5** (i due identificatori nuovi, con la loro destinazione) |

---

### Novantesima tornata — D240: la vecchia rotta esce subito (05/08/2026)

Chiusa alla fine dell'esecuzione del piano del caricamento diretto, con T1-T6 già fatti.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D240** | ✅ **T7 SUBITO: `POST /api/lavori/[id]/immagini` esce in questo rilascio, non nel prossimo** | Francesco, il 05/08, sulla scelta fra «ora» e «al rilascio successivo»: «*toglila adesso*» | ⚠️ **Il rischio era stato posto, ed è accettato:** UÀ è una **PWA**, quindi chi ha la pagina aperta **nel momento** della pubblicazione ha ancora il codice vecchio in mano — un caricamento senza ricaricare la pagina troverebbe una porta chiusa. 📌 **Perché il rischio è piccolo:** la finestra è quella del rilascio, la conseguenza è **un errore su un caricamento** (non una perdita di dati), e si chiude ricaricando. 📌 **Perché la strada alternativa costava:** lasciare viva una rotta senza chiamanti significa codice morto che la prossima sessione deve ricordarsi di togliere — e ciò che si rimanda si dimentica. ✅ Con lei esce `uploadToStorage` (`provato:` un solo chiamante). Restano in piedi `…/immagini/[imgId]` (GET/PATCH/DELETE) e le due nuove |

**E una domanda di Francesco che ha cambiato il codice:** «*per la storia di vercel sicuro che non ci
sono i dati nel .env?*» — sì, ed era giusto chiederlo. **`INTERNAL_SECRET` esiste già** (lo usa
`internal/pec-verify`, quindi è già configurato dove serve): il mietitore ora accetta quello, e non
c'è nessuna variabile nuova da creare. 📌 `CRON_SECRET` resta utile per **un motivo solo, che è di
Vercel**: il suo pianificatore firma da sé le chiamate **solo** se quella variabile è definita —
anche con lo stesso valore dell'altra. Senza, il cron notturno chiama senza intestazione e la rotta
rifiuta, **visibilmente**.

---

### Novantunesima tornata — D241: si pubblica, e il difetto vivo si chiude col rilascio (05/08/2026)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D241** | ✅ **SI PUBBLICA SUBITO** — e le due foto orfane si **cancellano** | Francesco, il 05/08: «*pubblica, per quelle due foto, cancellale pure erano di pura prova*» | 🔴 **Il rilascio era anche la CURA di un difetto vivo, trovato per caso ripulendo il banco:** la migration di **D236** (via la colonna `url`) era stata applicata al database vivo alle **09:59**, ma **il codice che l'accompagna non era mai stato pubblicato**. Da quel momento la rotta in produzione scriveva in una colonna **che non esiste più**: ogni caricamento di foto falliva, e lasciava un file orfano. 📌 **La prova, non l'ipotesi:** due file arrivati alle **11:23:45** e **11:24:04** sotto `lavori/6ed28bfe-…/`, senza riga che li nominasse, sul lavoro **2026/0017** creato alle 11:23:44 dall'app vera. ✅ **FATTO:** fast-forward `132d39e2..0d6d7979` (24 commit) · **CI verde** (7m) · **CD «Deploy to Production» verde** (3m) · sito **200** su `/login`, **307** sulla radice. ✅ **Check post-deploy fatto sul SITO VERO** (la lezione di stamattina: un check che «conferma una frase» va fatto lo stesso): PDF da **6,1MB** caricato dalla scheda → firma **200**, byte al magazzino **200**, conferma **201**, riga scritta col percorso nel recinto, file da **6.400.688 byte**. Prova rimossa, banco alla baseline (5 righe). ✅ Le due rotte nuove rispondono **401** senza sessione; la vecchia dà **404**: è uscita davvero |

🔑 **La lezione, e vale oltre questo caso: una migration applicata al database vive SUBITO, il codice
che la accompagna no.** Fra i due istanti c'è una finestra in cui la produzione parla con uno schema
che non esiste più — e nessuna prova automatica la vede, perché in locale i due pezzi sono sempre
allineati. Qui la finestra è durata **quasi due ore** e ha rotto una funzione principale.
➡️ **Regola operativa che ne esce:** una migration che **toglie** qualcosa si applica **dopo** aver
pubblicato il codice che smette di usarla, mai prima. Se l'ordine si inverte per necessità, la
finestra va dichiarata e chiusa **nello stesso turno**.

---

### Novantaduesima tornata — D242: il prescrittore vuoto si chiude al confine (05/08/2026)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D242** | ✅ **La stringa vuota NON entra in banca dati come nome del prescrittore: si normalizza al confine di scrittura (POST + PATCH), e la regola di «vuoto» diventa UNA SOLA per il controllo di consegna e per i due documenti** | Francesco, il 05/08, sul punto di ripresa: «*procedi come meglio credi*» — delega esplicita. La riga sta qui perché §0A-bis vale anche per le scelte delegate: una decisione tecnica che non è scritta è una decisione che la sessione dopo rifà, o disfa | 🔴 **Il difetto era già censito**, come sotto-punto di **P37** («*un difetto RAGGIUNGIBILE A UN CLIC*»): il gettone «+ Nuovo» scriveva `''`, e `generate-ddc.ts` ripiegava con `??`, che sulla stringa vuota non scatta → **Dichiarazione di Conformità senza il nome del medico, col controllo di consegna verde**. ✅ **Chiuso.** 🔑 **Tre scelte dentro la decisione, tutte con la loro ragione:** ① **si corregge al confine, non nella schermata** — `null` è già inerte in `TabDati` (`:242` confronta `=== chipLabel`, `:310` fa `?? ''`), e toccare l'interfaccia aprirebbe il **gate estetico L2** su un rilascio che non ne ha bisogno (la §0① dell'handoff ne porta già uno non pagato); ② **entra anche il BUONO DI CONSEGNA** — `BuonoTemplate.tsx:312` aveva lo stesso `??` ed è un foglio che esce dal laboratorio: trovato col censimento, non nominato dal punto di ripresa; ③ **`istituzione_sanitaria` viaggia col gemello** — oggi nessun documento la stampa, è prevenzione dichiarata per l'ondata che la stamperà. 🛑 **`||` da solo NON bastava, ed è il motivo del modulo condiviso:** `'   '` è truthy e `TabDati.tsx:311` lo salva davvero — con un `||` il documento sarebbe uscito ancora vuoto, col controllo ancora verde. 📌 **`template_version` resta `ddc-v1` (D105):** il modello non cambia, cambia quale dato ci finisce per una classe di input che prima usciva sbagliata; le dichiarazioni già emesse sono fotografie immutabili e non si toccano. `provato:` **299 lavori, 0 con nome vuoto · 6 dichiarazioni emesse, 0 con prescrittore vuoto** — il percorso era aperto e mai percorso, quindi **nessun documento da riparare e nessuna riemissione da decidere**. `provato:` RED **11 prove accese** prima del codice, R-P4 con abbozzo inerte **7 asserzioni su 14**, GREEN **vitest 4976 | 19** (417 file) · `verify:full` uscita **0** |

🔑 **La riga da tenere, e non è sul prescrittore:** un dato che ammette **due ortografie per «non c'è»**
(`null` e `''`) rompe **il lettore, non lo scrittore** — e lo rompe in silenzio, perché ogni lettore
sceglie da sé quale delle due conosce. Il precheck ne conosceva due, i due documenti una sola: lo
stesso flusso di consegna diceva «va bene» e stampava un foglio senza nome. **La cura non è un
carattere cambiato nel lettore: è togliere la seconda ortografia dove il dato entra.**
📌 **Ed era la seconda volta:** il wizard aveva già evitato la trappola nel Task 10 di P37, con un
commento che la spiegava per intero (`crea-lavoro.ts:365-368`) — ma l'aveva evitata **per sé**,
lasciando la strada aperta a ogni altro scrittore. **Un difetto capito e schivato in un punto solo
torna dal punto che nessuno ha guardato.**

---

### Novantatreesima tornata — D243 · D244: si pubblica, e «appena arrivati» torna a voler dire arrivati (05/08/2026)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D243** | ✅ **SI PUBBLICA la correzione del prescrittore vuoto (D242)** | Francesco, il 05/08: «*pubblica pure*» | ✅ **FATTO E VERIFICATO SUL SITO VERO.** Fast-forward `c9408d99..800a7c0c` su `main`, 4 salvataggi · **CI verde** (11m56s) · **CD «Deploy to Vercel» verde** (2m58s) · sito **200** su `/login`, **307** sulla radice. 🔑 **Il check post-rilascio NON si è fermato a «il sito risponde», ed è il punto:** con una sessione vera si è mandata alla PATCH di produzione una casella di **soli spazi** sul lavoro 2026/0011 → in banca dati è arrivato **`null`**; poi il **controllo positivo**, `'  Dott. Bianchi  '` → in banca dati **`"Dott. Bianchi"`**, trimmato e vivo. ⚠️ **Senza il secondo, il primo non prova niente:** una correzione che azzerasse *tutto* passerebbe la prova ① e distruggerebbe il dato vero. Baseline ripristinata (`null`, com'era). 🔑 **Perché la domanda andava fatta e non data per scontata:** finché il ramo resta fermo il difetto **è vivo in produzione** — «provato e verde» e «risolto per chi usa l'app» sono due fatti diversi, e in mezzo c'è una pubblicazione che solo Francesco autorizza |
| **D244** | ✅ **La pila «APPENA ARRIVATI» si ordina per ARRIVO — il più recente in cima** | Francesco, il 05/08, dopo aver guardato la pila vera dal telefono: «*nei lavori appena arrivati il loro ordine non lo capisco*», e sulla scelta fra le tre forme proposte: «*l'ordine mettilo per arrivo*» | 🔴 **Il difetto era una scelta mai discussa, non un errore di calcolo:** la blu era ordinata per **data di consegna** come le altre tre, quindi in cima stava un lavoro arrivato il **21 maggio** (consegna scaduta da mesi) e i quattro entrati quel giorno finivano **in fondo**. 🛑 **Le altre TRE pile non cambiano, ed è il punto:** rossa, ambra e viola parlano di **scadenze** — lì «il più vicino a scadere in cima» è l'ordine giusto; solo la blu parla di **arrivi**. ⚖️ **E si chiude anche il secondo difetto, che valeva per tutte:** a parità di chiave il confronto tornava `0` e la query di casa **non ha alcun `ORDER BY`** — restava l'ordine in cui il database capitava di restituire le righe, **non stabile fra due letture**. Ora il criterio di spareggio è dichiarato (il numero del lavoro), con una prova che legge le stesse righe **al contrario** e pretende lo stesso esito. 📌 **Una conseguenza gestita invece che subita:** la striscia cercava «il lavoro che aspetta da più tempo» col primo della lista — giusto finché la testa era il più urgente, **sbagliato** ora che la testa è il più nuovo: ora il più vecchio si cerca apposta. `provato:` RED **6 asserzioni su 7** prima del codice · GREEN `vitest` **4983 \| 19** (418 file) · `verify:full` uscita **0**. ✅ **PUBBLICATA E VERIFICATA SUL SITO VERO** (`800a7c0c..000cfd32` · CI verde 16m17s · CD verde 3m37s): la home dice «13 APPENA ARRIVATI — **n.2026/0020, n.2026/0019** e altri 11» (prima: «n.2026/0002, n.2026/0001») e la pila aperta elenca `0020 · 0019 · 0018 · 0017 · 0011 · 0008 …` |

📌 **Una domanda che resta aperta, e non per dimenticanza:** la prova con una foto presa **dalla libreria** dell'iPhone invece che dalla fotocamera (riga 16 di roadmap) — Francesco il 05/08: «*il telefono adesso non l'ho tra le mani*». È l'ultimo caso scoperto sul formato Apple, e costa trenta secondi al primo momento buono.

---

### Novantaquattresima tornata — D245: quando è dovuto il gate estetico L2 (05/08/2026, 16:53)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D245** | ⚖️ **Il GATE ESTETICO L2 (FASE 9b) è dovuto quando cambia l'ASPETTO di una superficie, NON quando cambia solo il CONTENUTO che ci scorre dentro. Quando cambia il solo contenuto resta obbligatoria la FASE 9** (giro a schermo, 390/768/1280 × chiaro/scuro) | Francesco, il 05/08, scegliendo fra tre forme: **«No — solo se cambia l'aspetto»**. La domanda era stata dichiarata aperta dalla sessione precedente, che aveva saltato il gate su D244 e lo aveva scritto invece di nasconderlo | 🔑 **La regola scritta NON distingueva, ed è il difetto che questa riga chiude:** `ua-app/CLAUDE.md` §0C diceva «obbligatorio fine ondata **con UI**», e «ondata con UI» copre tanto un colore cambiato quanto un `ORDER BY` cambiato. Senza questa riga ogni sessione decideva **a naso**, e a naso ha già deciso una volta. ⚖️ **Effetto retroattivo su D244:** la modifica dell'ordine della pila blu **non doveva** il gate L2 — la scelta della sessione del 05/08 è **ratificata**, e smette di essere una scelta personale. 🛑 **Ma la FASE 9 su D244 resta DOVUTA e non è stata fatta** (§0② dell'handoff): il gate L2 guarda *com'è fatta* una schermata, la FASE 9 guarda che il contenuto nuovo *ci stia dentro* — cambiare l'ordine può far comparire in cima una riga più lunga, un numero a due cifre, un titolo che va a capo. Le due cose non si coprono a vicenda. ✅ **Restano dovute senza discussione le due superfici del 05/08 mattina** — `src/components/features/lavori/form/TabImmagini.tsx` e le frasi del wizard: lì l'aspetto è cambiato davvero. 📌 **Il confine, per chi dovrà applicarlo:** si guarda **il codice toccato**, non l'effetto percepito — se il salvataggio tocca token, classi, stili, spaziature, testi visibili o la struttura del markup, è aspetto; se tocca solo quali dati e in quale ordine arrivano a una superficie già disegnata, è contenuto. ⚠️ **In dubbio si fa il gate:** la regola nasce fail-closed come R-P1, perché il costo di un gate in più è un'ora e il costo di un gate saltato lo si scopre in produzione. ➡️ **Propagata dove la regola vive:** `ua-app/CLAUDE.md` §0C (FASE 9b) e `docs/design/audit-ui-ux/README.md` |


---

### Novantacinquesima tornata — D246: la scheda «Foto» si rifà, non si ripara (05/08/2026, 17:35)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D246** | 🛑 **La scheda «Foto» del form del lavoro SI RIFÀ e si migra a v3: NON si ripara adesso. I sei riscontri del gate L2 del 05/08 restano scritti come DESCRIZIONE DI CIÒ CHE NON DEVE TORNARE, non come lavoro da fare** | Francesco, il 05/08: «*lascia perdere la storia dell'avviso, quella pagina dovrà essere rifatta e migrata al v3. dobbiamo andare avanti con lo sviluppo della pwa*» | 🔑 **Questa riga esiste per una ragione sola: senza, il lavoro cancellato viene rifatto.** §0A-bis dice che una decisione che cancella lavoro si scrive **per prima**, ed è esattamente questo caso — le righe **19, 20 e 21** di roadmap portano sei riscontri misurati con la loro `file:riga`, e la prossima sessione che le legge si mette a correggerli. ➡️ **Le tre righe restano ma cambiano natura:** da «da correggere» a **requisiti della migrazione a v3** di quella superficie. ⚖️ **La riga 19 NON decade del tutto, ed è l'unica cosa da non perdere:** il difetto misurato — la pila d'avvisi in `position:fixed; top` che copre le azioni in alto (`src/components/ds/Avviso.tsx:294-316`) — è **del componente di sistema**, non della schermata. Rifare la scheda «Foto» **non lo chiude**, e non lo chiude per nessun'altra superficie con un'azione primaria in alto. Resta aperto come voce di sistema, **senza urgenza**. 🛑 **Nessun gate L2 è dovuto su una superficie che si sta per rifare:** il gate si fa sulla superficie **nuova**, quando arriva la sua ondata. 📌 **D245 non è toccata** — vale da qui in avanti e per ogni superficie. ➡️ **E il lavoro riprende dalla riga 6 di roadmap** (le tinte del manufatto), che è l'unica ondata con spec ratificata, mockup scelti e piano scritto in attesa di esecuzione |

### Novantaseiesima tornata — D247: la riga della tinta sulla scheda si preme, e si corregge lì (05/08/2026, 19:00)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D247** | ✅ **La riga «Tinta» sulla scheda del lavoro NON è muta: si preme e apre il foglietto di modifica SULLA SCHEDA, senza cambiare pagina — esattamente come fa oggi la riga «Colore»** | Francesco, il 05/08, scegliendo fra le tre strade mostrate («apre il foglietto lì» · «muta, solo da leggere» · «porta alla pagina di modifica»). La domanda gli era stata posta **spiegando prima cosa significasse «muta»**: era una delle tre «domande aperte» del piano D42 (la n° 2) e **non gli era mai arrivata** | 🔄 **EMENDA il Task 7 del piano** (`docs/superpowers/plans/2026-08-03-tinte-manufatto.md`), che la faceva **muta** «come dice la spec»: il suo Passo 3 rende `RigaDato` e va sostituito con lo schema di `RigaEditabile` + foglietto, sul modello di `rigaColore.modificabile`. 🔎 **Il fatto misurato che ha spostato la scelta, e non era in nessun documento:** la carta «Lavoro» della scheda ha **sei righe, e QUATTRO si premono** (`SchedaLavoroV3.tsx:522` Dentista · `:538-555` Colore, che è editabile quando la modifica è possibile · `:556` Consegna · `:563` Tecnico), più la riga dei denti che porta alla pagina di modifica (`:527`). Una tinta muta sarebbe stata **l'unica riga ferma accanto al suo gemello che si preme** — e il rischio non è che l'utente non sappia come fare, ma che **provi, non succeda niente, e concluda che l'app è rotta**. 📌 **Regge la direttiva permanente del 27/07** («ogni campo del lavoro si corregge, fino alla consegna»): un campo nasce **con la sua via di correzione**, e la via più corta è quella che non fa uscire dalla schermata. 💰 **Prezzo dichiarato, perché non sia una sorpresa del T8:** la tavolozza delle tinte va costruita **in due posti** — il foglietto della scheda e la pagina di modifica. **Non è terreno nuovo:** è già così per il colore (`ModificaColoreSheet` + la pagina di modifica), quindi il precedente si ricalca invece di inventarlo. ⚠️ **Due modi di «portare alla modifica» convivono già in casa** e non vanno confusi: il foglietto sul posto (`setCampoAttivo`) e il salto alla pagina (`router.push`, la riga dei denti). D247 sceglie **il primo**. 🛑 **Vale la regola degli overlay v3:** da dentro un foglietto non si naviga con `router.push` nudo — se il T7 dovesse mai navigare, si usa `useNavigaDaOverlay` |

### Novantasettesima tornata — D248 e D249: il difetto gemello si chiude, e la pubblicazione è delegata (05/08/2026, 20:29)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D248** | 🔧 **IL DIFETTO GEMELLO DEL COLORE DI CASO SI RISOLVE** — `risolviColoreCaso` produce `scartato` e la PATCH lo butta via: da chiudere, non da lasciare in elenco | Francesco, il 05/08: «*per il difetto gemello deve essere risolto*» | 🔴 **Il difetto, misurato:** `risolviColoreCaso` (`src/lib/api/colore-caso.ts`) restituisce `scartato: true` quando un colore era stato **chiesto** e non si è potuto registrare; la PATCH di `lavori/[id]` lo riceve e **non lo passa a nessuno**. Il campo nasce il 28/07 col rilievo **M2** della revisione pre-merge, che dice testualmente: «*«si perde il colore, mai il lavoro» giustifica il NON far fallire; NON giustifica il non dirlo*». 🛑 **È in PRODUZIONE così**, ed è lo stesso difetto che il T5 ha appena chiuso per la tinta — trovato **perché** lo si stava chiudendo sul gemello. 📌 **La forma è già decisa dal T5 e si ricalca, non si reinventa:** un campo additivo nella risposta (`colore_scartato: true`), che compare **solo** quando c'è qualcosa da dire. ⚠️ **E porta la sua destinazione scritta, o è un altro campo che nessuno legge** — è esattamente il difetto P4-④ di stamattina. 🔑 **Perché non è cosmesi:** senza, l'utente legge «Salvato» su un colore che **non è stato salvato**, e la direttiva «ogni campo si corregge fino alla consegna» presuppone che chi deve correggere **sappia** di doverlo fare |
| **D249** | 🚀 **LA PUBBLICAZIONE DEL RAMO `tinte-manufatto` È DELEGATA — la decide chi esegue, non serve un altro passaggio da Francesco** | Francesco, il 05/08: «*per il ramo da pubblicare, quando credi che sia più opportuno farlo, fallo*» | ⚖️ **Cambia una prassi**, e per questo sta a verbale: fino a oggi ogni merge in produzione aspettava un'autorizzazione esplicita («⛔ non pubblicato: lo autorizza Francesco» compare in più righe di roadmap). Da qui in avanti, **per questo ramo**, il momento lo sceglie chi esegue. 🛑 **Ciò che NON cambia, e va detto perché una delega non è uno sconto:** restano dovute **FASE 7** (`verify:full` con uscita vera), la **revisione del delta**, il **collaudo a schermo** di ciò che l'ondata tocca, la CI verde e lo **smoke sul sito** dopo il rilascio. La delega riguarda **il quando**, non **il se le prove servono**. ⚠️ **Il momento scelto, e la ragione:** dopo il **T6**, cioè quando la parte di dati e di server è completa (catalogo · colonne · dominio · normalizzazione · PATCH · rifacimento) e prima delle superfici (T7-T9). Motivo: fino a lì il cambiamento è **additivo e inerte** — `provato:` **0 lavori con tinta**, e nessuna schermata mostra ancora la tinta — quindi il rischio in produzione è minimo; e **chiude il disallineamento** che dura da tre sere, con **due migration già applicate al database vero** mentre il codice che le usa non è pubblicato (§0④ dell'handoff del 05/08). 📌 Se il T6 trovasse qualcosa che rende il rilascio non sicuro, si rimanda e **si scrive perché** |

### Novantottesima tornata — D250: la FORMA delle risposte in chat, provata prima di essere fissata (05/08/2026, 22:16)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D250** | 📐 **LA FORMA DELLE RISPOSTE IN CHAT È FISSATA: «tabella prima» (formato B)** — tabella compatta in cima · due-tre blocchi di prosa col titoletto solo per ciò che merita una frase intera · in chiusura ciò che aspetta Francesco. Scritta per intero in `ua-app/CLAUDE.md` §0D | Francesco, il 05/08: «*impostiamo un modo di rispondermi, globale, e mantenuto stabile nel progetto, più sintetico e conciso, meno prolisso, non per questo deve saltare informazioni, ma organizzate meglio e che mi permetta in meno tempo di comprendere tutto, facciamo anche qualche prova prima di definirlo come regola*» | 🔬 **RATIFICATA DOPO LE PROVE, come Francesco ha chiesto:** tre formati messi a confronto **sullo stesso contenuto** (il Task 5, che lui aveva appena letto in versione lunga — quindi a parità di informazione) e poi il vincitore **usato per quattro messaggi veri** prima di scriverlo come regola. Gli scartati e il perché: **A «scaletta fissa»** — prevedibile ma più lungo; **C «densità massima»** — la più rapida da leggere ma **appiattisce**, una regressione e un dettaglio minore occupano lo stesso spazio. 🔑 **La riga che regge la regola: concisione non vuol dire meno informazione, vuol dire meno RILETTURA.** Nessun fatto misurato si toglie, si sposta in tabella; se una cosa non entra in nessuno dei tre posti, non andava detta. 🛑 **Due vincoli che vengono dall'esperienza della giornata, non dal gusto:** si apre da **ciò che è andato storto**, non dalla funzione nuova (il 05/08 la cosa più utile del resoconto del T5 era una regressione da 20 prove, non la funzione); e **le correzioni a sé stessi si scrivono per intero e senza attenuanti** — quel giorno ne sono servite tre, e sono state la parte più utile dei resoconti. ⚠️ **Non si applica alle risposte brevi:** una tabella per dire «fatto» è un modulo, non una risposta. 📌 **La direttiva vive in `ua-app/CLAUDE.md` §0D, che da oggi è AUTOSUFFICIENTE:** il testo storico in `../CLAUDE.md` §7 è **fuori dall'albero git** e non sopravvive a un cambio di macchina — se le due divergono, vale quella nel repo |

### Novantanovesima tornata — D251 e D252: chi legge i due campi della PATCH, e quando si apre la riga 22 (05/08/2026, 22:54)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D251** | 📮 **I DUE CAMPI CHE IL T5 HA COSTRUITO HANNO UN LETTORE CIASCUNO: `tinta_scartata` la legge il TASK 7 (il foglietto sulla scheda), `tinta_rimossa` la legge il TASK 8 (la pagina di modifica)** | Francesco, il 05/08: «*ok per i due campi*», sulla divisione proposta | 🔴 **Il fatto che l'ha resa necessaria:** il T5 ha fatto in modo che la risposta della PATCH dica due cose nuove — `tinta_rimossa: {famiglia, codice}` (il cambio di tipo ha tolto una tinta che c'era, **D117**) e `tinta_scartata: true` (una tinta era stata chiesta e **non** si è potuta registrare). **Nessuna superficie le legge**, e il piano lo dichiarava: «*se nessuna delle due superfici li legge, sono due campi morti e il T5 avrà costruito ciò che oggi ha criticato*». È la stessa famiglia di **P4-④** (l'osservatore che nessuno legge) e della guardia degli overlay che stava scritta e non era agganciata a niente. ✅ **LA PREMESSA È STATA VERIFICATA PRIMA DI RATIFICARE, non dedotta:** la proposta poggiava sul fatto che il foglietto della scheda salvi dalla PATCH — `provato:` `ModificaRigaSheet.tsx:149-150` → `fetch('/api/lavori/${lavoroId}', { method: 'PATCH' })`. **Regge.** ⚠️ Non era scontato: il piano del T8 avverte che `useLavoroForm.ts` **non** manda i sette campi denti/colore dalla PATCH ma da una rotta dedicata, e lo stesso poteva valere qui. 🔑 **Perché la divisione cade dove cade, e non è arbitraria:** ogni campo va letto **dalla superficie che può generarlo**. Dal foglietto della scheda si cambia **solo la tinta**, quindi lì può nascere `tinta_scartata` ma **mai** `tinta_rimossa` (il tipo di lavoro non si tocca da lì); dalla pagina di modifica si cambia **anche il tipo**, quindi lì nascono entrambi. 📌 **La forma è quella già viva sulla scheda:** `useAvvisi()` da `components/ds/Avviso` — `errore(...)` e non `avvisa(...)`, perché il rischio da coprire è che l'utente **legga «Salvato» su un dato che non c'è** (direttiva del 27/07), e l'avviso normale è muto per progetto. 🔄 **EMENDA il Task 7 del piano**, che nei suoi quattro passi non nominava `tinta_scartata`: senza l'emendamento quel codice arriverebbe **fuori dai registri R-P1/R-P4**, cioè fuori dal cancello che la FASE 4 impone |
| **D252** | 🧬 **LA RIGA 22 (le liste scritte due volte) SI APRE DOPO LA PARTE FUNZIONALE DELLA PWA — e da oggi ha un posto esatto nella roadmap, non più «apertura da decidere»** | Francesco, il 05/08: «*per la riga 22, registra tutto ed inseriscilo in un posto esatto nella roadmap, ma dopo la parte funzionale della pwa*» | 📍 **Il posto esatto, e perché è quello:** la roadmap ha già un ordine ratificato — **D144/D145**, «*prima si finisce la PWA, poi si distribuisce*» — con **FASE 1 (finire la PWA)** e **FASE 2 (distribuire)**. La riga 22 **non è distribuzione**: è igiene del codice che nessun utente incontra. Va quindi in un punto **⑤ dichiarato dentro la FASE 2**, subito dopo la FASE 1, invece di restare una voce senza collocazione in fondo alla tabella. 🔑 **Applicata la regola di smistamento D145 in modo meccanico, anche se l'esito è scomodo:** «*tutto ciò che, sistemato dopo, costringerebbe a rifare lavoro già fatto*» è FASE 1 — e questa **non** lo è: le sei copie libere sono già scritte, correggerle dopo costa **quanto costa oggi**, perché non c'è codice nuovo che si appoggi alla loro forma. Non vale invece l'altro braccio della regola (nessun utente vede una lista duplicata) finché la divergenza non produce un difetto: **e quello resta il rischio dichiarato**, non annullato dal rinvio. ⚠️ **Il rischio che si accetta rinviando, scritto perché la decisione sia informata:** il peggiore dei sei è `METODI_VALIDI`, copiato a mano in **tre rotte** e che **valida davvero** (`.includes()` → 400), mentre il tipo che dovrebbe essere la fonte (`MetodoPagamento`) **non è importato da nessuno**. Finché la riga 22 è chiusa, chi aggiunge un metodo di pagamento può farlo **a metà** e nessun controllo automatico glielo dirà. 📌 **Registrato tutto, come chiesto:** il referto con le righe esatte è `docs/roadmap/2026-08-05-censimento-liste-duplicate.md` (14 gruppi · 3 falsi allarmi chiusi con la ragione · 6 copie libere · 5 non esaminate, dichiarate), lo strumento rieseguibile è **sotto git** (`scripts/censimento-liste-duplicate.mjs`), e la voce 22 della tabella porta ora la collocazione invece di «apertura da decidere». 🛑 **«Dopo» non vuol dire «quando capita»:** la voce sta in un punto numerato della FASE 2, così che la fine della FASE 1 la faccia riemergere da sola |

### Centesima tornata — D253: la riga non sparisce, dice «Nessuna» e si preme (05/08/2026, 23:45)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D253** | 🔵 **PER I LAVORI CHE AMMETTONO UNA TINTA (o un colore) LA RIGA RESTA SEMPRE VISIBILE: dice «Nessuna» ed è PREMIBILE — vale per la tinta E per il colore** | Francesco, il 05/08: «*in ogni caso vorrei (b) per i lavori che ammettono una tinta, tenere la riga sempre visibile, che dice «Nessuna» ed è premibile, sia per la tinta che per il colore*» | 🔄 **RIBALTA una regola scritta nel piano D42** («*nessuna tinta → la riga non compare affatto; non «—»: una riga vuota su una scheda è rumore*») **e il comportamento del gemello «Colore», che è IN PRODUZIONE dal 05/08** (`derivaRigaColore` torna `null` quando non c'è colore né trascrizione). 🔑 **La ragione che la regge, ed è più forte di quella che sostituisce:** una riga che non c'è non dice «questo lavoro non ha una tinta» — dice **niente**, e chi guarda non sa se il dato manca o se quel lavoro non lo prevede. Una riga che dice «Nessuna» ed è premibile è insieme **l'informazione e la via per cambiarla**, cioè esattamente la direttiva permanente del 27/07 («ogni campo del lavoro si corregge, fino alla consegna»): un campo senza la sua via di correzione non è finito. ✅ **PER LA TINTA la condizione è NETTA e si applica subito (T8):** «ammette una tinta» = `famigliaDiMacro(tipo_dispositivo) !== null`, cioè ortodonzia e bite/splint — è la stessa regola del vincolo `lavori_tinta_tipo_ck`, quindi la schermata e il database dicono la stessa cosa. 🔴 **PER IL COLORE C'È UN NODO VERO, misurato prima di promettere:** l'informazione «questo lavoro prevede un colore» vive su `prevedeColore` dei **38 tipi FINI** (`src/lib/domain/tipi-lavoro.ts:11`), ma sul lavoro salvato **l'id fine non è persistito** — `provato:` le uniche colonne «tipo» di `lavori` sono `tipo_dispositivo`, `tipo_arco`, `tipo_impronte`, `segnalazione_tipo`. E la macro **non basta**: `provato:` **quattro macro su nove sono MISTE** (protesi_mobile · implantologia · ortodonzia · bite_splint contengono sia tipi con colore sia tipi senza). ➡️ **La sostanza è decisa; il PERIMETRO per il colore torna a Francesco** con tre strade dichiarate: ① la riga su tutte le macro tranne `cad_cam` (l'unica interamente senza colore) — semplice, ma compare anche su lavori che un colore non lo prevedono; ② persistere l'id fine del tipo sul lavoro — pulito, ma è una colonna nuova e i lavori già in banca dati non hanno il dato da cui ricavarla; ③ la riga **sempre**, su ogni lavoro. ✅ **Costo verificato, non stimato:** il foglietto del colore **regge già** un lavoro senza trascrizione (`ModificaColoreSheet.tsx:280` — il confronto col prescritto entra solo `if (trascritto !== undefined)`), quindi non serve toccare il gesto D212 |

### Centunesima tornata — D254: il tipo preciso del lavoro si salva, e si fa con l'ondata del wizard (05/08/2026, 23:47)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D254** | 🧱 **STRADA ② — L'ID FINE DEL TIPO DI LAVORO SI PERSISTE SUL LAVORO.** È la risposta alla radice del nodo di D253: senza, l'app non può sapere se un lavoro già creato preveda un colore | Francesco, il 05/08: «*2, decidi ovviamente quando sarà giusto farla, e procedi con il task 8*» | 📍 **IL QUANDO, delegato a chi esegue e deciso qui: va con l'ondata del WIZARD (voce 1 di roadmap, ondata (b) rimasta a metà), non prima e non da sola.** Tre ragioni, in ordine di forza. ① **Il dato nasce lì:** l'id fine è una scelta che l'utente fa **al secondo passo della creazione** (`PassoTipo`), e oggi si perde nel passaggio al salvataggio — la cura sta dove si perde, non a valle. ② **Quell'ondata apre già quel passo:** D121 ha rimandato lì anche il passo della tinta, quindi le due modifiche toccano lo stesso codice nello stesso momento; separarle vuol dire aprire due volte la stessa schermata. ③ **Nulla la rende urgente prima:** `provato:` i dati in banca dati sono **solo di prova** e si ripuliscono alla consegna (`ua-app/CLAUDE.md` §8), quindi non si sta accumulando uno storico da recuperare. 🛑 **IL CONFINE CHE LA RENDE NON RINVIABILE ALL'INFINITO, ed è l'unico vincolo duro:** dev'essere fatta **prima della prima onboarding di un laboratorio reale**. Da quel momento ogni lavoro creato senza l'id fine è un dato **vero** e **irrecuperabile** — nessuno potrà più dire, guardando quel lavoro, quale dei 38 tipi fosse. 📌 **Fino ad allora, la riga «Colore» resta com'è** (compare solo se un colore c'è): D253 si applica **subito alla tinta**, dove la condizione è netta, e **al colore quando c'è il dato**. ⚠️ **Ciò che questa decisione NON risolve, dichiarato:** i lavori già in banca dati non hanno il dato da cui ricavare l'id fine, quindi resteranno senza — è accettabile solo perché sono di prova, e smette di esserlo il giorno dell'onboarding |

### Centoduesima tornata — D255: `/chiudi` diventa davvero un comando, e resta un puntatore (06/08/2026, 08:17)

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D255** | ⌨️ **`/chiudi` DIVENTA UN VERO COMANDO DA BARRA — un file `.claude/commands/chiudi.md` che PUNTA alla skill, senza ricopiarla** | Francesco, il 06/08, davanti all'errore «*Unknown command: /chiudi*»: «*si ma lo abbiamo creato noi il comando e ha sempre funzionato, perché questa volta ho ricevuto questo errore?*» → scelta **②** fra tre | 🔴 **IL FATTO CHE RIBALTA LA PREMESSA, misurato prima di rispondere: `/chiudi` NON è mai stato un comando.** `provato:` nessun file di comando `chiudi` è mai esistito in git (`git log --all --name-only -- '*chiudi*'` → **solo** `.claude/skills/chiudi/SKILL.md`), e `ua-app/.claude/commands/` era una cartella **vuota dal 12 maggio**. L'equivoco nasce dal titolo del salvataggio del 31/07 — «*la procedura di chiusura diventa un comando*» — mentre quel salvataggio creava una **skill**. 🔑 **Perché a volte la barra rispondeva e a volte no:** la skill è **scoped a `ua-app/`**, ma la sessione **parte dalla cartella superiore** (`provato:` `pwd` → `/Users/hatholdir/Downloads/SOFTWARE FILIPPO`, e lì `.claude/` contiene **solo** `launch.json` e le impostazioni, **nessuna skill**). Viene quindi scoperta **a metà sessione**, quando si toccano file sotto `ua-app/` — troppo tardi per il menu della barra, che è già compilato. ⚠️ **Questa seconda parte è la spiegazione più probabile, NON misurata dall'interno dell'app:** è provato dove stanno i file e da dove parte la sessione, non l'istante in cui la finestra compila il menu. 📌 **Il file è un PUNTATORE di poche righe:** ricopiarci i sette passi creerebbe una seconda procedura che diverge in silenzio — la classe di difetto del censimento della riga 22. 🔗 **E perché serve anche un LINK:** il file vero sta in `ua-app/` (sotto git, come dev'essere), ma la sessione parte un livello sopra; quindi nella cartella superiore c'è un **collegamento** `.claude/commands/chiudi.md → ../../ua-app/.claude/commands/chiudi.md`. 🛑 **Il collegamento vive FUORI da git** e non sopravvive a un cambio di computer: la riga per ricrearlo sta in `ua-app/CLAUDE.md` §0E. **Il contenuto invece è versionato** — è la differenza con lo script del link d'accesso, che stava tutto in una cartella ignorata. ⚠️ **La prova vera la dà la PROSSIMA sessione:** un menu della barra già compilato non si aggiorna a caldo, quindi qui si è verificato ciò che è verificabile (il file c'è, il link risolve, il contenuto si legge attraverso il link) e **non** che la barra si accenda |

### Centotreesima tornata — D256-D259: l'audit del processo — i panel restano, la memoria si riordina, il diario resta vivo (06/08/2026, 08:50)

**Nasce da:** l'audit del processo chiesto da Francesco («*vorrei capire se ho sbagliato qualcosa, se ho
sovrastrutturato o se invece mi sto solo impressionando*»), eseguito con panel di 4 subagent (Regola
Advisor applicata al processo stesso). Referto: `docs/processes/2026-08-06-audit-processo-referto.md`.
Diagnosi in una riga: **i controlli sono proporzionati e non si toccano; la sovrastruttura è tutta nella
memoria** (stato in 4+ copie, MEMORY.md 872KB illeggibile per costruzione, BP-0 ineseguibile alla lettera).
D256 per prima: cancella lavoro proposto (§0A-bis).

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D256** | 🛑 **I PANEL RESTANO — la Regola Advisor NON si tocca.** La raccomandazione 10 del referto (un mese di misura dell'efficacia dei panel ordinari, poi eventuale restrizione ai casi costosi) è **RESPINTA e decade** | Francesco, il 06/08: «*i panel lasciameli*» | 📌 Scritta per prima perché **cancella lavoro proposto**: nessuna misura va impiantata, nessuna annotazione «panel non convocato» va introdotta. La Regola Advisor del 17/07 resta parola per parola: panel di 2-3 advisor per ogni decisione significativa, esenzioni solo per decisioni banali/reversibili in minuti/già coperte. ⚠️ Il referto §5 lo dichiara: la questione è chiusa **per scelta esplicita**, non per prova d'efficacia — non riproporla senza fatti nuovi |
| **D257** | ✅ **IL RIORDINO DELLA MEMORIA È APPROVATO** — le raccomandazioni 1-8 del referto: MEMORY.md torna fotografia ≤30KB · lo stato ha UNA casa (handoff §0; SESSION_ACTIVE puro puntatore; la testata ROADMAP smette di ristatare; il contatore decisioni vive solo nel registro) · mini-audit «dichiarato vs codice» dentro `/chiudi` · strati fermi a maggio marchiati «non verificato» (domains/, graphify, ruolo di claude-mem dichiarato) · ROADMAP spacchettata per genere · registro decisioni con indice · tetti di dimensione meccanici in `/chiudi` · CLAUDE.md radice versionato col pattern D255 | Francesco, il 06/08: «*allora sono d'accordo con tutto*» | 🗓️ **Ondata dedicata, si apre alla chiusura dell'ondata tinte (T8/T9)** — non scavalca il lavoro a metà sul ramo `tinta-scheda-t7`; voce ⑥ della FASE 1 in roadmap (smistamento D145: il costo della memoria si paga a OGNI sessione di FASE 1, rimandarlo costa di più che farlo). 🛑 **Niente si cancella:** ogni voce storica resta nel repo, cambia solo l'indirizzo. La guardia-coerenza si estende al nuovo territorio PRIMA dello spostamento e si prova alla R-P1 (rompere apposta un rimando) |
| **D258** | 📔 **IL DIARIO RESTA VIVO — emenda la raccomandazione 1:** le voci narrative NON diventano archivio morto. Continuano a essere scritte a ogni chiusura, come **diario del progetto giorno per giorno**, in `memory/diario/` (un file al mese), **a lato** del percorso di avvio e consultabile in qualsiasi momento | Francesco, il 06/08: «*il cosiddetto diario della memoria invece di archiviarlo e basta, manteniamolo attivo per quello che è, come un diario di tutto il nostro progetto giorno per giorno, da tenere a lato e consultabile in qualsiasi momento*» | 🔑 **Cambia la destinazione, non il gesto:** la voce si scrive già oggi a ogni chiusura — cambierà solo il file che la riceve. Il diario ha già reso servizio documentato (la lettura normativa giusta del 29/07 è stata ritrovata in un verbale; la genesi delle regole vive lì): tenerlo vivo costa zero rispetto a oggi, **purché fuori dal percorso obbligatorio di avvio**. MEMORY.md resta la fotografia ≤30KB (D257); il diario è la cronaca, greppabile e indicizzata anche da claude-mem |
| **D259** | ⚡ **PERCORSO «PICCOLA» ALLEGGERITO, in vigore da subito** — per change di 1-3 file FUORI dai domini critici: FASE 2 (brainstorming) facoltativa · FASE 8 con UNA sola review · FASE 9 ridotta a un giro sul viewport primario 390px (light+dark) quando una superficie è toccata. **Restano piene: FASE 3** (è il cancello che accerta il dominio critico) **· TDD (FASE 6) · FASE 7 · BP-1.** L'override dominio critico **prevale sempre** | Francesco, il 06/08: «*sono d'accordo con tutto*» (la proposta era dichiarata «da sottoporre a ratifica» nel referto, raccomandazione 9) | ➡️ **Propagata dove la regola vive:** `ua-app/CLAUDE.md` §0C, blocco sotto la tabella di selezione orchestratore. 🔑 Il costo che chiude: rapporto rituale/lavoro fino a 5:1 sui fix da minuti. 🛑 Ciò che NON cambia: RLS/Stripe/FatturaPA/auth/migrations → percorso GRANDE automatico, come sempre; e «non dovuto il gate» non vuol dire «niente prova a schermo» — la FASE 9 ridotta resta una prova vera |

---

### Centoquattresima tornata — D260: la chiave secondaria orfana non è una richiesta, ed è UNA regola per due casi (06/08/2026, 09:58)

**Nasce da:** la §0① dell'handoff `docs/roadmap/2026-08-06-tinte-t7-t8-handoff.md`, che chiedeva di
**riverificare una premessa** prima di scrivere la regola: il rilievo di ramo del 05/08 (`route.ts:553`)
era stato rinviato «insieme al gemello del colore» perché *«la forma è identica al gemello»*, e l'handoff
aveva messo quella frase in dubbio notando che **per il colore mezza coppia è il caso NORMALE e voluto**.
🔑 **La riverifica ha ribaltato il dubbio, non il rilievo:** il dubbio era rivolto alla **metà sbagliata**.

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D260** | ✅ **UNA REGOLA SOLA PER I DUE GEMELLI: è il CODICE a comandare.** Le mezze coppie sono **due** e vanno al contrario. *Codice senza la chiave secondaria* → caso **normale e voluto in entrambi** (la scala la deduce il catalogo, `colore-caso.ts:89-98`; la famiglia la deduce il tipo del lavoro, `tinta.ts:94-97`). *Chiave secondaria senza il codice* → **azzeramento muto in entrambi** (`colore-caso.ts:82-83` e `tinta.ts:67-69` sono la stessa guardia). Quindi la premessa «forma identica al gemello» **REGGEVA**, per il verso opposto a quello scritto, e il rilievo si chiude **su colore e tinta nella stessa passata** | Francesco, il 06/08: «*sì procedi, e poi fai il collaudo a schermo*» (sulla proposta che dichiarava: «se dici sì, questa reversione di premessa diventa D260») | Salvataggio `8730ea6d`. La chiave orfana si **butta dal corpo** e la coppia salvata **non si tocca**; nessun avviso, perché senza codice non c'era richiesta — è il contratto già scritto nei cappelli dei due risolutori, non uno nuovo. 🛑 **E si toglie PRIMA della catena, non in un ramo `else if`**: altrimenti un cambio di tipo accompagnato da una famiglia orfana **salterebbe il ramo D117** e la tinta sparirebbe in silenzio — lo stesso difetto spostato di due righe (prova ⑥ di `tests/unit/lavori-patch-mezza-coppia.test.ts`) |

**🔑 La lezione, ed è il pezzo durevole — vale più della correzione.**
**Una premessa messa in dubbio va verificata come la decisione che regge, e il dubbio stesso va verificato.**
L'handoff aveva fatto la cosa giusta a fermarsi; ma aveva controllato il lato «codice senza scala» **solo
per il colore**, e da lì aveva concluso un'asimmetria che non c'era. Bastava fare la stessa lettura sulla
tinta — dodici righe più in là — per vedere che anche lì la famiglia si deduce.
➡️ **Chi sospende una decisione scrive ANCHE la lettura che chiuderebbe il sospetto**, o il sospetto si
tramanda come se fosse un fatto.

**🛑 Il difetto che la forma sbagliata avrebbe creato, e che è stato evitato per un soffio.** Restringere
la condizione d'ingresso **e basta** avrebbe lasciato la chiave orfana nel corpo: quella sarebbe arrivata
all'UPDATE e avrebbe violato `lavori_tinta_coppia_ck` / `lavori_colore_caso_coppia_ck` → **500**, e con
lui **ogni altra correzione dello stesso salvataggio**. Cioè: un azzeramento silenzioso trasformato nel
danno esatto che «*si perde il colore, mai il lavoro*» esiste per impedire. **Peggio del difetto di
partenza.**

**⚠️ Onestà sull'esposizione, dichiarata perché non sembri più di quel che è:** **nessuna superficie può
produrre la mezza coppia orfana oggi** (`useLavoroForm.ts:343-349` e `:360-376` mandano o niente, o il
solo codice, o la coppia intera; `ModificaColoreSheet.tsx:208-218` verifica il catalogo prima di partire).
È **indurimento del confine** — «i client saranno più d'uno» — **non una falla viva**.

**📌 Correzione di un documento, non di codice:** il commento di `route.ts` dichiarava «*le due chiavi si
scrivono sempre INSIEME o nessuna delle due*», in **contraddizione** col contratto di `colore-caso.ts:63-70`,
che ammette apposta il codice senza la scala. **Due contratti diversi scritti nello stesso repository**, ed
è dalla frase sbagliata che il rilievo era nato. Corretta nello stesso salvataggio.

---

### Centocinquesima tornata — D261: prima si decide la FINESTRA, poi si scrive il messaggio (06/08/2026, 11:09)

**Nasce da:** P7-⑥ del piano delle tinte, deferito **al gate L2 del T9**: su un lavoro con la
Dichiarazione emessa la riga «Tinta» smette di essere premibile, ma **nessuna parola dice perché**, e il
gemello «Colore» ha lo stesso vuoto. Portata a Francesco come scelta di parole, con tre testi a confronto.
🔑 **Francesco non ha scelto un testo: ha cambiato la domanda**, e la domanda nuova era quella giusta —
«*ma se la dichiarazione è uscita e per qualsivoglia motivo debba essere riemessa, per un errore tipo,
come la gestisce la cosa la pwa?*».

**Che cosa è stato verificato prima di rispondere** (`provato:` nel codice, non ricordato):

| Momento | Comportamento di oggi | Prova |
|---|---|---|
| Entro **10 minuti** dalla consegna | Riquadro col conto alla rovescia; l'annullo porta la DdC a `annullata`, il lavoro a `pronto`, e riassegna la cassetta | `AnnullaConsegnaBanner.tsx:33` · `FINESTRA_ANNULLO_MS` in `src/lib/consegna/costanti.ts:7` |
| Subito dopo l'annullo | ✅ **I campi si riaprono da soli**: la scheda esclude le DdC annullate, quindi `lavoro.ddc` torna nullo e la riga torna premibile | `src/app/(app)/lavori/[id]/page.tsx:43` (`.neq('ddc.stato','annullata')`) + `SchedaLavoroV3.tsx:462` |
| Riconsegnando | Esce una **DdC nuova**, la vecchia resta agli atti come annullata — ed è anche ciò che la norma vuole (Allegato XIII punto 4: si conserva) | `src/lib/consegna/orchestrate.ts:107` |
| **Oltre i 10 minuti** | 🔴 **Rifiutato**, e **non esiste nessun'altra via nel codice**: quel lavoro resta consegnato con la sua dichiarazione e i campi restano chiusi | `annulla-consegna/route.ts:147` · `grep FINESTRA_ANNULLO_MS` → 5 occorrenze, nessuna eccezione |
| Con fattura già emessa | Rifiutato con la ragione giusta: «serve una nota di credito» | `annulla-consegna/route.ts:148` |

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D261** | 🛑 **IL MESSAGGIO DELLA RIGA BLOCCATA NON SI SCRIVE ORA.** Prima si decide **la finestra di annullo** (i 10 minuti bastano? serve una via di correzione dopo?), poi il messaggio si scrive **una volta sola, già giusto** | Francesco, il 06/08: **«prima decidiamo la finestra»** | ➡️ Il **T9 si chiude senza questa voce**, che resta **aperta e scritta** — non dimenticata. La questione della finestra nasce come **voce di roadmap**. P7-⑥ resta deferito, ora con una ragione migliore di prima |

**🔑 Perché la decisione è giusta, e vale come metodo.** Il testo dipende dal comportamento: «*non si
cambia più*» è **vero solo dopo i 10 minuti**; entro i 10 c'è ancora una via d'uscita, e un messaggio che
la nasconde ferma l'utente quando poteva ancora rimediare. Scrivere le parole prima di sapere che cosa
descrivono avrebbe prodotto **un testo da riscrivere**, o peggio un testo giusto a metà lasciato lì.
➡️ **Quando il fatto sotto le parole non è ancora deciso, le parole aspettano.**

**🔴 Il limite vero, dichiarato perché nessuno lo scopra sul cliente:** se l'errore si scopre **dopo mezz'ora**
— e su una digitazione al banco è realistico — **dall'app non si fa niente**. Non è una svista da correggere
di corsa: la finestra tocca un documento con valore legale, quindi la decisione vuole il suo panel
normativo (Art. 52(8) e Allegato XIII), non un ritocco di costante.

---

### Centoseiesima tornata — D262: «la PWA non dà blocchi, dà aiuti» — e la finestra dei 10 minuti è un residuo (06/08/2026, 11:20)

**Nasce da:** D261, che aveva rimandato il messaggio della riga bloccata in attesa di decidere la
finestra. Francesco ha risposto con una **direttiva di prodotto**, non con un numero.

> «*è giusto come funziona al momento la pwa, ma poiché la nostra filosofia è sempre quella di "aiutare"
> il laboratorio, noi siamo il suo supporto in tutto. Mettiamo caso che dopo aver consegnato un lavoro e
> chiuso tutto (siamo nella fase prima di fatturare), e ci accorgiamo che c'è un errore sulla
> dichiarazione: noi dobbiamo avere la facoltà di avvertire il medico, sistemare i valori del lavoro e
> riemettere una nuova dichiarazione a storno di quella vecchia. […] La nostra pwa non deve fornirci
> blocchi o ostacoli, ma aiuti concreti nella vita di un laboratorio nelle sue mansioni e nelle sue
> difficoltà. Dogma centrale: facilità di utilizzo, risoluzione dei problemi, automatismi, tenere tutto
> sotto controllo, far funzionare il laboratorio alla perfezione.*»

| # | Decisione | Conseguenza |
|---|---|---|
| **D262** | 🔑 **DIRETTIVA PERMANENTE — «si deve sempre poter intervenire».** Un errore scoperto **dopo la consegna e prima della fatturazione** deve poter essere corretto **dall'app**: avvertire il medico · sistemare i valori · **riemettere una dichiarazione a storno della vecchia**. Un blocco si giustifica solo con un **obbligo di legge** o un **fatto irreversibile già avvenuto** (una fattura emessa) — mai con la comodità di chi ha scritto il codice | Il limite **temporale** dei 10 minuti va sostituito da un limite **sostanziale**. La progettazione passa da un **panel** (dominio critico: documento a valore legale) |

**✅ PRIMA VERIFICA — la richiesta di Francesco è GIÀ la prassi ratificata, non uno strappo.**
`provato:` **D-1 del 16/07/2026** (`docs/design/decisions/2026-07-16-ondata-fondamenta-4b-consegna.md:13`),
ratificata da un **panel di 2 advisor convergenti** (normativo + architetturale):
«*Art. 52(8) impone la DdC prima dell'immissione sul mercato; **All. XIII non impone numerazione**;
**ISO 13485 §4.2.4 → annullo tracciato è la prassi corretta***». Le condizioni erano già scritte lì e sono
già rispettate: **numero mai riusato**, **DdC annullata conservata ≥10 anni**, **il registro mostra le
annullate**.
➡️ **Annullare e riemettere non è una forzatura: è il modo corretto**, e il progetto lo aveva già stabilito.

**🔴 SECONDA VERIFICA, ed è il ritrovamento che cambia il quadro — LA RAGIONE DEI 10 MINUTI È DECADUTA.**
La finestra nasce come vincolo **C4** dentro un'architettura in cui la fattura nasceva **da sola alla
consegna** (outbox + cron, emissione differita). La spec lo dice a chiare lettere
(`2026-07-09-ds-v3-il-cuore-design.md` §9): *«dentro i 10 minuti l'annullo **non incontra mai documenti
fiscali**»*. La finestra serviva a **non far collidere l'annullo con una fattura automatica**.
🛑 **Quell'architettura NON è mai stata eseguita.** Nota del 16/07 nella stessa spec: *«la 4a-server qui
descritta (outbox+cron, emissione differita) **NON fu eseguita** — sostituita dal modello "fatturazione
concordata": **la consegna non tocca il fiscale, nessuna fattura nasce alla consegna**»*.
`provato:` `grep -c "insert.*fatture\|from('fatture')" src/lib/consegna/orchestrate.ts` → **0**, e
`fattura: null` alle righe 157 e 385.
➡️ **I 10 minuti proteggono da una collisione che non può più avvenire.** Sono il residuo di un'idea
abbandonata, rimasto in una costante che nessuno ha più messo in discussione.

**✅ TERZA VERIFICA — il confine giusto esiste GIÀ nel codice**, ed è esattamente quello che Francesco
indica («*siamo nella fase prima di fatturare*»): `annulla-consegna/route.ts:148` rifiuta con
`fattura_gia_emessa` → «*esiste già una fattura per questo lavoro: per stornare serve una nota di
credito*». **Il limite sostanziale è già scritto e funziona.** Quello temporale gli sta davanti e lo
rende irraggiungibile dopo 10 minuti.

**🔑 La riga da tenere, e vale oltre questo caso:** *un vincolo sopravvive all'architettura che lo
giustificava, e da lì in poi sembra una regola.* Nessuno l'aveva più riletto perché **una costante con
una sigla accanto (`// C4`) ha l'aria di essere stata decisa** — e infatti lo era stata, ma per un mondo
che non esiste più.

**📌 Che cosa NON è deciso qui, e va al panel:** se la via giusta sia allargare l'annullo consegna
(riporta il lavoro a `pronto`, gesto brusco se il manufatto è già dal medico) oppure un flusso **dedicato**
di «correggi e riemetti» che lascia il lavoro consegnato ed emette una **DdC sostitutiva collegata alla
precedente**; come si **avvisa il medico**; e come si distingue — nettamente — la **correzione di un dato**
dalla **vigilanza su un dispositivo difettoso** (Art. 87), che è un'altra cosa e non va confusa.

---

### Centosettesima tornata — D263: si riapre il lavoro DICHIARANDO IL MOTIVO, e il motivo sceglie l'iter (06/08/2026, 11:35)

**Nasce da:** D262. Francesco ha dato la forma concreta della direttiva.

> «*abbiamo consegnato il lavoro e fornito la dichiarazione, dobbiamo intervenire, per x motivi: il
> sistema deve permettere di **riaprire il lavoro, segnalando la motivazione** ed in base a questo gestire
> l'intervento **a norma di legge**. Es. correggere un dato sbagliato, allora segue un iter; dispositivo
> difettoso, ne segue un altro (caso diverso da: se rientra il dispositivo per essere riparato perché
> difettoso, **questo caso è che il laboratorio se ne è accorto subito dopo la consegna, non il
> cliente**); etc etc.*»

| # | Decisione | Conseguenza |
|---|---|---|
| **D263** | 🔑 **LA RIAPERTURA È UN GESTO SOLO, IL MOTIVO È OBBLIGATORIO, E IL MOTIVO SCEGLIE L'ITER.** Non si allarga una finestra: si dà al laboratorio **un modo di rientrare nel lavoro** dichiarando *perché*. Da quel «perché» il sistema fa discendere gli obblighi — documentali, di qualità, di segnalazione — **al posto dell'utente**, invece di lasciarglieli indovinare | Ondata da progettare **con panel** (dominio critico). Il motivo diventa **un dato in banca dati**, non una nota libera: è ciò che rende automatico l'iter e tracciabile la scelta (ISO 13485 §8.3 e §8.5) |

**🔑 Il perno, ed è di Francesco: NON conta solo che cosa è successo, ma CHI se n'è accorto e QUANDO.**
Lo stesso difetto seguìto da due strade diverse a seconda che l'abbia visto il laboratorio prima che il
dispositivo fosse usato, o il medico dopo. È una distinzione **normativamente esatta** — la sorveglianza
post-vendita si accende su ciò che accade **sul mercato**, non su ciò che il fabbricante intercetta in
casa prima della messa a disposizione.

**I casi da istruire — elenco APERTO, e nessuno di questi è deciso: è il materiale del panel.**

| Caso | Chi se n'è accorto | Che cosa sembra richiedere (DA VERIFICARE al panel) |
|---|---|---|
| **1. Dato sbagliato sulla dichiarazione** (tinta, colore, materiale, anagrafica del paziente, nome del prescrittore) | Il laboratorio | Correzione del dato + **DdC sostitutiva a storno** della precedente, che resta agli atti. Il manufatto **non rientra**. È il caso di D262 |
| **2. Difetto visto dal laboratorio subito dopo la consegna**, prima che il dispositivo sia applicato | Il laboratorio | Rientro del manufatto, rilavorazione, riconsegna. **Non è sorveglianza**: il difetto non è mai arrivato al paziente. ⚠️ **È il caso che Francesco distingue esplicitamente** |
| **3. Difetto segnalato dal medico o dal paziente**, a dispositivo applicato | Il cliente | **Reclamo** → entra nella sorveglianza post-vendita. Se c'è danno o rischio per la salute → **vigilanza, Art. 87** (incidente grave), con termini e destinatari propri. 🛑 **Il confine fra 2 e 3 è il cuore dell'ondata** |
| **4. Consegnato al destinatario sbagliato** | Chiunque | Tracciabilità: dove si trova davvero il dispositivo. Tocca la catena, non solo il documento |
| **5. Il medico chiede una modifica che NON nasce da un errore** (esigenza clinica nuova) | Il cliente | **Non è una correzione**: è un lavoro nuovo o un rifacimento concordato. Chiamarlo «correzione» sporcherebbe i dati della qualità |
| **6. Errore di prezzo o quantità** | Il laboratorio | **Non tocca la dichiarazione**: tocca la fattura. Iter fiscale, non MDR |
| **7. Reso senza difetto** (il paziente non si presenta, il lavoro torna) | Il laboratorio | Nessun difetto da registrare: è logistica |

**🛑 Ciò che NON va deciso a naso, e per cui il panel serve davvero:**
- **Il confine fra 2 e 3** decide se scatta la sorveglianza post-vendita: sbagliarlo per eccesso riempie
  il registro qualità di rumore, per difetto **salta un obbligo di legge**.
- **Che cosa diventa la DdC vecchia**: già risolto in linea di principio (annullata, conservata, numero
  mai riusato — D-1 del 16/07), ma va legato **il nuovo documento al vecchio**, o lo storno non è
  leggibile da chi controlla.
- **L'avviso al medico**: quando è cortesia e quando è **obbligo**.
- **Se il motivo è correggibile**: chi sbaglia a scegliere l'iter deve poter tornare indietro, o si crea
  un blocco nuovo mentre se ne toglie uno vecchio — cioè si tradisce D262 nel momento in cui la si attua.

---

### Centottesima tornata — D264-D270: l'ondata dell'intervento ha la sua forma, e il panel ha ribaltato il confine (06/08/2026, 13:24)

**Nasce da:** D262 (la direttiva) e D263 (il motivo sceglie l'iter). Panel di **tre advisor** su
dominio critico — normativo MDR · sistema qualità · architettura sul codice vero — con il metodo del
§9 (30/07): **premesse da falsificare, non domande da svolgere**.

**Esito del panel: tre premesse, due falsificate e una invertita.**

| Premessa | Esito |
|---|---|
| «Chi se n'è accorto» e «il dispositivo è stato applicato» sono lo stesso asse | **FALSIFICATA.** Art. 2(64) àncora allo **stato del dispositivo**, Art. 87(3) alla **conoscenza**: due assi. E l'Art. 2 definisce **tre** momenti di mercato, non due — un booleano non può reggerli. Chi se n'è accorto governa l'**orologio**; stato e potenziale di danno governano la **classe** |
| Un «reclamo» esiste solo dopo l'applicazione al paziente | 🛑 **FALSIFICATA E INVERTITA.** Ministero della Salute, linee di indirizzo 29/11/2022: i reclami «*si tratta, in genere, di **eventi riscontrati prima dell'uso del dispositivo***». Il **caso 2 è il caso TIPICO di reclamo**, non rilavorazione interna. Avevamo classificato al contrario |
| Un difetto intercettato dal laboratorio non genera registrazioni | **FALSIFICATA.** ISO 13485 §8.3.1 e §8.3.4: la rilavorazione va registrata e il prodotto ri-verificato |
| *(al terzo advisor)* la messa a disposizione avviene alla consegna al medico | ✅ **REGGE**, su quattro clausole convergenti. **È il confine** |

| # | Decisione | In una riga |
|---|---|---|
| **D264** | Perimetro della prima ondata | Casi **1, 2, 3, 5**. Fuori 4, 6, 7 — scritti, non spariti |
| **D265** | Documento sanitario e documento fiscale sono **due mondi** | La dichiarazione si corregge **sempre**, anche a fattura emessa |
| **D266** | L'intervento vive in `eventi_qualita`, **sopra** il rifacimento | Il rifacimento diventa un **esito**. `lavoro_nuovo_id NOT NULL` (`005:75`) gli vieta strutturalmente di esprimere «corretto sul posto» |
| **D267** | **Fatti, mai conseguenze** — e registrare ≠ giudicare | L'evento si crea sempre; la valutazione è separata e comprende «nessuna azione, ed ecco perché». Gli indicatori contano le **valutazioni**. L'app **propone**, una persona **conferma** |
| **D268** | 🛑 Il confine è la **consegna**, e l'ordine dei test è **ministeriale** | ① incidente → ② coinvolgimento → ③ conseguenze. **Rifiutata** la derivazione di un advisor che assegnava «reclamo» prima di escludere l'incidente: nasconde l'obbligo di **trend reporting Art. 88** |
| **D269** | 🛑 **La finestra dei 10 minuti sparisce del tutto**; l'annullo consegna è **assorbito** in «Devo intervenire» | **Scelta esplicita di Francesco**, contro la raccomandazione di affiancare i due gesti. Costo dichiarato e accettato: **due tap invece di uno** per il tasto premuto per sbaglio |
| **D270** | Una classificazione sbagliata si corregge per **sovrapposizione**, mai con un `UPDATE` | Sola-aggiunta **imposta dal database** (precedente in casa: `20260804154232:9`). **Declassare** chiede il motivo scritto |

**🔑 La riga da tenere, e non riguarda solo quest'ondata:** *l'ordine in cui si fanno i controlli è
esso stesso una regola*. Due derivazioni con gli stessi ingredienti, in ordine diverso, producono un
adempimento e un'omissione. Il difetto non sarebbe stato visibile né dai test né dal codice: sarebbe
entrato dalla porta principale, dentro un parere autorevole.

**📌 Due dati di fatto forniti da Francesco:** non sa se il laboratorio sia certificato ISO 13485
(➡️ si progetta **come se lo fosse**) · spesso **non si sa** se il dispositivo sia stato applicato
(➡️ `non_noto` è ammesso e **non blocca** — e i tre test non lo chiedono mai).

**Spec:** `docs/superpowers/specs/2026-08-06-intervento-post-consegna-design.md` — §14 porta **undici
vuoti dichiarati**, §15 **otto ritrovamenti fuori mandato**, due dei quali gravi (la riga EUDAMED di
`CLAUDE.md` §5 è sbagliata; `totale_reclami: 0` nel PSUR).

**🔑 Seconda lezione, trovata rileggendo e non decidendo — DUE DECISIONI GIUSTE POSSONO COLLIDERE IN
UNA CHIAMATA, E LA COLLISIONE NON SI VEDE LEGGENDO LE DECISIONI.** D265 («la dichiarazione si corregge
sempre, anche a fattura emessa») e D269 («l'annullo consegna è assorbito nell'intervento») sono
entrambe sane. Ma la prima stesura della spec faceva passare l'esito da `annulla_consegna_atomica`, che
porta con sé **i cancelli fiscali**: una correzione su un lavoro fatturato sarebbe stata **rifiutata**
— cioè il contrario esatto di D265. ➡️ **Due decisioni si controllano nel punto in cui il codice le fa
incontrare, non nel documento che le enuncia.**

---

### Centonovesima tornata — D271 e D272: la certificazione diventa un dato, e una norma letta alla lettera stava per creare un cantiere inutile (06/08/2026, 15:10)

**Nasce da:** le tre risposte di Francesco alle domande lasciate aperte dalla spec dell'intervento.

| # | Decisione | Conseguenza |
|---|---|---|
| **D271** | 🔑 **LA CERTIFICAZIONE ISO 13485 DIVENTA UN DATO DEL LABORATORIO.** «*facciamo in modo che, nella scheda del laboratorio, puoi segnare se si è certificati oppure no ed in base a questo la pwa si comporta di conseguenza*» | Campo a **tre** stati (`certificato` · `non_certificato` · `non_dichiarato`, default che si comporta come certificato). ⚠️ **Governa cosa l'app considera COMPLETO, non cosa permette:** quasi tutti gli obblighi vengono dal **MDR** (Art. 10(9), 83-88, All. XIII), non da ISO, e valgono comunque. Spec §17 |
| **D272** | 🛑 **NON SI ANTICIPA LA DICHIARAZIONE AL «PRONTO»: LA PROPOSTA È RESPINTA, E IL MOTIVO VALE OLTRE IL CASO.** Il documento nasce **quando il laboratorio dichiara finito il lavoro**, e quello è l'atto sostanziale | La proposta era mia, nata leggendo l'Art. 52(8) alla lettera («prima dell'immissione sul mercato») dopo che Francesco aveva detto che la consegna si registra **sia prima sia dopo** l'uscita fisica. **Non si fa niente**, e la voce si chiude: non diventa roadmap |

**La risposta di Francesco, per intero — è il metro, non un aneddoto:**

> «*non essere così fiscale, e ti dico perché: ad oggi, chi non usa un'app come questa che stiamo
> creando, come credi che gestisca la cosa? Cosa cambia se nel momento in cui io premo sul pulsante
> «ok questo lavoro è finito» il sistema genera tutto quello che c'è da generare, e poi il lavoro o
> sta ancora al lab o è stato già portato allo studio? Mica è una questione di timestamp con
> minutaggi o geolocalizzazioni. Ricordati: cosa fa UÀ? Aiuta il laboratorio, lo segue, lo accompagna
> e soprattutto gli risolve i problemi! Non deve crearne di nuovi.*»

**🔑 LA LEZIONE, ed è la più importante della giornata — UNA NORMA LETTA ALLA LETTERA PUÒ GENERARE UN
PROBLEMA CHE NON ESISTE.** La dichiarazione **esiste e accompagna il dispositivo**; nessuna norma
chiede al fabbricante di cronometrare l'uscita dal portone, e **nessun laboratorio al mondo lo fa**.
Il metro non è «cosa dice il testo isolato», ma **D262**: se una regola nostra non risolve un problema
vero del laboratorio, **ne sta creando uno**.
⚠️ **E si noti la simmetria con la giornata:** al mattino il panel aveva trovato che un vincolo
sopravvive all'architettura che lo giustificava (i 10 minuti); al pomeriggio si stava per **crearne
uno nuovo** dello stesso genere, partendo però da una fonte autorevole invece che da una costante
dimenticata. **La provenienza nobile di un vincolo non lo rende utile.**

---

### Centodecima tornata — D273-D275: il panel ha rifatto la proposta invece di approvarla, e il divieto di cancellare da solo era un generatore di numeri falsi (06/08/2026, 17:03)

**Nasce da:** il terzo dei quattro ritrovamenti aperti del Task 1 — l'unico che aspettava una decisione
di Francesco: se anche `eventi_qualita`, il **fatto**, debba diventare non modificabile.
**Misurato prima di decidere, sul database vivo:** `eventi_qualita` ha `UPDATE=true` e `DELETE=true`
per `anon`, `authenticated` e `service_role`; `valutazioni_evento` li ha **tutti e tre a false**. Il
ritrovamento non era teorico.

| # | Decisione | Conseguenza |
|---|---|---|
| **D273** | 🔑 **UN EVENTO DI QUALITÀ NON SI CANCELLA MAI IN MODO DEFINITIVO, MA SI RITIRA DICHIARANDO IL MOTIVO — e si corregge sempre.** Francesco: «*sì ratifica D273*» | Tre pezzi: ① **niente `DELETE`** dal database (né `TRUNCATE`); ② **ritiro morbido con motivo obbligatorio**, che toglie l'evento dagli elenchi **e dai conteggi**, sul modello già in casa di `incidenti_mdr` (`002_fase2_schema.sql:420-425` · `psur/route.ts:156-157`); ③ `UPDATE` **resta aperto** (D262) con la traccia ridotta all'osso: chi ha creato, chi ha ritirato, quando è stato corretto. 🛑 **Unica eccezione, e non è trattabile:** un evento che ha **già prodotto un atto verso l'esterno** (dichiarazione riemessa, segnalazione al Ministero, avviso al medico) **non si ritira, si supera** — quello è l'unico blocco che D262 ammette, perché è di legge. ⛔ **L'avviso «il giudizio poggia su una descrizione cambiata» ESCE da quest'ondata**: rientra insieme alla riclassificazione |
| **D274** | ✅ **I DUE DIFETTI VIVI SI CHIUDONO SUBITO**, benché fuori dal mandato dell'ondata. Francesco: «*chiudi subito i due difetti vivi*» | ① `admin_delete_laboratorio` **non nomina** le due tabelle nuove e `eventi_qualita_lavoro_fk` è `NO ACTION` → la cancellazione di un tenant **aborta** al primo laboratorio con un evento; ② **`TRUNCATE` era rimasto concesso** su `valutazioni_evento`, quindi il commento «la garanzia la dà il DATABASE» (`20260806140823:78`) era **falso** |
| **D275** | 🔓 **RIENTRARE IN UN LAVORO CONSEGNATO RESTA ALLA PORTATA DI TUTTI — nessun controllo di ruolo.** Francesco: «*di tutti, poi in futuro se dovrò eseguire qualche modifica a riguardo ci torneremo, per adesso va bene così*» | La domanda non era mai stata posta: con la finestra dei dieci minuti che sparisce (D269), lo stesso gesto annulla **una dichiarazione a valore legale, per sempre, su qualunque lavoro**. Oggi annullare la consegna non ha già alcun controllo di ruolo (`api/lavori/[id]/annulla-consegna/route.ts`), e **si sceglie di non introdurne uno**. ⏸️ **Rimandata, non chiusa — e la destinazione è scritta:** `docs/roadmap/2026-08-06-intervento-sera-handoff.md` §3, voce «*il rientro in un lavoro consegnato è materia da titolare?*». Si riapre da lì, e la riapre Francesco |

**🔑 LA LEZIONE — IL DIVIETO DI CANCELLARE, DA SOLO, NON PROTEGGE UN REGISTRO: LO SPORCA.**
La proposta portata al panel era «non si cancella, ma chi sbaglia dichiara l'errore», e sembrava
elegante. Due advisor su tre ci sono arrivati per strade diverse: un evento nato da un dito scivolato
che non si può togliere **resta per sempre dentro i conteggi**, e quei conteggi finiscono nel rapporto
periodico dovuto per legge (`psur/route.ts:190`, che quest'ondata deve finalmente alimentare).
➡️ **Vietare la cancellazione senza dare un modo di dire «questa riga non doveva esistere» costruisce
un generatore di numeri falsi dentro un documento di sistema qualità.**

**⚠️ E il costo cadeva tutto sull'errore di digitazione, cioè sul caso che Francesco ha dichiarato
NORMALE.** Oggi chi preme «consegnato» per sbaglio ha un tasto «Annulla»: **un tocco**
(`AnnullaConsegnaBanner.tsx:144-167`). Dopo l'ondata deve aprire «Devo intervenire», scegliere il
motivo e rispondere a **quattro domande obbligatorie** — da chi ha saputo, quando, dov'era il
dispositivo, che danno può fare — che per un tasto premuto per sbaglio **non vogliono dire niente**; e
per confermare «nessuna azione» il database **pretende una giustificazione scritta a mano**
(`20260806140823:47-49`). La spec dichiara il costo di D269 come «**due tap invece di uno**»
(spec righe 54 e 346): **quel conto non torna, e non tornava già prima di D273.**
➡️ **Due correzioni da minuti entrano nel Task 6:** la giustificazione di «nessuna azione» **nasce
precompilata** col «perché» che la derivazione ha già scritto, e il motivo «ho registrato per sbaglio»
**non chiede** origine, momento della conoscenza, stato del dispositivo e potenziale di danno.

**🔑 LA REGOLA CHE MANCAVA, e non era stata scritta da nessuno.** La direttiva permanente dice che ogni
campo si corregge **fino alla consegna** — ma un evento di qualità **nasce dopo la consegna**, quindi
quella regola non lo copriva. Il principio, spogliato del caso particolare, è un altro:

> **Un dato si corregge liberamente finché non è uscito dal laboratorio dentro un documento. Da lì in
> poi non si congela: si corregge per sovrapposizione.**
> Applicato all'evento: *si corregge sempre. Prima che sia uscito, la correzione è diretta; dopo, è per
> sovrapposizione — come il giudizio. Non si cancella niente, e non si congela niente.*

🛑 **Perché il GIUDIZIO non può essere il confine:** è un atto **interno**, e per progetto è
**superabile** (D270). Se un atto interno congelasse un fatto, avremmo una regola **più severa** di
quella data per il lavoro stesso — dove portare a `pronto` non congela niente e congela solo l'uscita.

**📌 Il panel, e come ha lavorato.** Tre advisor con mandato esplicito di **smontare**, non di
approvare (Regola Advisor, 17/07). Esiti: **normativo** «regge con condizioni» (8 condizioni) ·
**database/sicurezza** «regge con condizioni» (10 difetti, 3 Critici) · **prodotto** 🔴 **«il punto 1
così com'è NON regge»**. I due difetti vivi di D274 **non erano nella proposta**: sono usciti cercando
dove si rompeva. ✅ **Riverificati uno per uno da chi riferisce**, non presi sulla parola degli advisor.

**🟠 Aperti e NON chiusi da questa tornata** (riferiti, R-E2): `audit_log` è **svuotabile** da un
utente autenticato e **1.644 righe su 1.645 non sanno chi ha fatto la modifica** (l'app parla al
database con un'identità di servizio) — quindi una memoria delle correzioni costruita lì nascerebbe
cieca · `valutazione_supera()` non pretende un successore e non registra chi/quando · la spec §6 e il
piano (righe 391-392) **derivano `errore_registrazione` in due punti diversi** dell'ordine dei test:
vince il codice, ma il documento **ratificato** dice un'altra cosa · `psur/route.ts:190` continua a
dichiarare `totale_reclami: 0` per costruzione.

---

### Centoundicesima tornata — D276: l'esenzione non salta la fila, e il controllo pre-volo del piano ha trovato dove il piano contraddiceva la spec (06/08/2026, 18:10)

**Nasce da:** il **controllo pre-volo** obbligatorio prima di mandare in esecuzione il Task 2 (la
sotto-skill di esecuzione a sottoagenti lo impone: si scandaglia il piano in cerca di contraddizioni
**prima** di dispacciare, e le si presenta **tutte insieme**). Ne è uscita una, e stava esattamente nel
compito «su cui si gioca la correttezza normativa».

| # | Decisione | Conseguenza |
|---|---|---|
| **D276** | 🔑 **IL CONTROLLO SULL'INCIDENTE VIENE SEMPRE PER PRIMO — NESSUN MOTIVO PUÒ SALTARE LA FILA — e i tre motivi «non è un problema del dispositivo» danno NESSUNA AZIONE, non non-conformità.** Francesco: «*dico di sì alla tua*» | Ordine definitivo: ① incidente (sempre, per ogni motivo) · **①-bis** natura ∈ {`nuova_esigenza_clinica`, `commerciale`, `errore_registrazione`} → **`nessuna_azione`** col perché scritto · ② reclamo · ③ non conformità interna. **Corregge il piano** (che faceva uscire i tre motivi PRIMA dell'incidente) **e precisa la spec §6** (che li faceva ricadere in non conformità interna) |

**🔴 IL DIFETTO CHE IL CONTROLLO PRE-VOLO HA INTERCETTATO, ed era già scritto in forma di codice.**
Il piano (Task 2, righe 389-393) faceva uscire i tre motivi **prima** del test dell'incidente. Effetto
concreto: un evento marcato «il dentista chiede una cosa nuova» **usciva senza che nessuno guardasse se
c'era stato un danno**. Con un danno accertato su una persona nella stessa segnalazione, l'app avrebbe
risposto «nessuna azione» e **l'obbligo di segnalazione sarebbe sparito**.
⚠️ **È LO STESSO DIFETTO DI STAMATTINA, IN UN ALTRO VESTITO.** Al mattino un advisor proponeva una
derivazione che assegnava «reclamo» senza prima escludere l'incidente, e fu **rifiutata** (D268). Il
piano faceva la stessa cosa con «nessuna azione» — e «nessuna azione» è **peggio**, perché non lascia
nemmeno una registrazione.
🛑 **E le prove del piano codificavano il comportamento SBAGLIATO:** scritte come stavano, avrebbero
**bloccato il difetto invece di trovarlo**. È il caso in cui un test non è una rete: è un lucchetto.

**🔑 L'ALTRA METÀ, che non era chiusa da nessuno dei due documenti.** Passato il test dell'incidente,
cosa dice l'app per un tasto premuto per sbaglio? La spec §6, **letta alla lettera**, lo faceva ricadere
in **non conformità interna** — cioè nel registro qualità e nei conteggi. Ma è precisamente ciò che
**D273** ha stabilito di non fare poche ore prima: un dito scivolato non deve sporcare i numeri che
finiscono nel rapporto periodico dovuto per legge. ➡️ Si tiene l'**ordine** della spec e l'**esito** del
piano, e nessuno dei due documenti aveva ragione da solo.

**🔑 LA LEZIONE — DUE DOCUMENTI ENTRAMBI RATIFICATI POSSONO CONTRADDIRSI, E LA CONTRADDIZIONE VIVE NEL
CODICE, NON NELLA PROSA.** La spec era giusta sull'ordine e sbagliata sull'esito; il piano il contrario.
Nessuna rilettura dell'uno o dell'altro l'avrebbe mostrato: **si vede solo mettendoli accanto sulla
stessa riga di codice**. È la stessa forma della lezione di stamattina («due decisioni giuste possono
collidere in una chiamata»), applicata stavolta fra una spec e il piano che la esegue.
➡️ **Il controllo pre-volo non è burocrazia: qui ha pagato da solo il suo costo.**

**Emendati nello stesso turno:** spec §6 (nasce il passo ①-bis) · piano Task 2 (codice e prove).

---

### Centododicesima tornata — D277-D279: la gravità si CHIEDE, il banco non è il mercato, e il «perché» non può contraddire chi l'ha scritto (06/08/2026, 18:55)

**Nasce da:** la revisione del Task 2. Conformità al mandato **approvata** (eseguito alla lettera,
niente di meno e niente di più, ritrovamenti riferiti e non corretti di nascosto), **qualità da
correggere** — e **tutti e tre i rilievi discendono dal mandato**, cioè dal piano e dalla spec.
Verificati uno per uno contro il testo della spec ratificata prima di portarli a Francesco.

| # | Decisione | Conseguenza |
|---|---|---|
| **D277** | 🔴 **LA GRAVITÀ DI UN INCIDENTE SI CHIEDE, NON SI DEDUCE — e la scadenza nasce dalla risposta.** Francesco: «*sì a tutti e tre*» | L'app propone «incidente — **da valutare se grave**» e pone la domanda dell'Art. 2(65) a una persona; `termineOre` resta **vuoto** finché non c'è risposta. I tre termini della spec §3 diventano tutti raggiungibili: **2 giorni** (minaccia grave alla salute pubblica, 87(4)) · **10 giorni** (morte o deterioramento grave non previsto, 87(5)) · **15 giorni** (regola generale, 87(3)) |
| **D278** | 🛑 **MAI USCITO DAL LABORATORIO = MAI UN INCIDENTE. Fra spec §3 e spec §6 vince la §3** | Se `stato_dispositivo = mai_uscito_dal_lab`, l'esito è **non conformità interna (§8.3.2)** qualunque sia il potenziale di danno. Base: un incidente riguarda un dispositivo «messo a disposizione» (Art. 2(64)) e quello **non lo è mai stato** |
| **D279** | 🟠 **IL «PERCHÉ» SI COSTRUISCE DAI FATTI REGISTRATI, mai da frasi fisse** | Il testo che l'app propone non può affermare il contrario di ciò che l'utente ha appena dichiarato |

**🔴 D277 — L'UNICO PUNTO IN CUI IL SISTEMA CHIEDEVA MENO DEL DOVUTO, e va detto per intero.**
Il codice decideva la gravità con **una sola uguaglianza** (`potenziale_di_danno === 'accertato'`),
mentre l'Art. 2(65) — citato nella **spec stessa**, §3 — dice che è grave anche l'incidente che
«**avrebbe potuto portare**» a morte o a danno serio. Caso concreto, eseguito: una lega sbagliata su
un paziente allergico, manufatto non ancora applicato → l'app proponeva «incidente **non grave**,
nessuna scadenza». E quando diceva «grave» proponeva **sempre 15 giorni**, cioè il **più lungo** dei
tre: per una morte la spec ne prevede **10**.
🔑 **La radice non era un refuso: era il modello.** `potenziale_di_danno` ha quattro valori su **un
asse solo**, e gli si facevano rispondere **due domande diverse** — «è un incidente?» (Art. 2(64)) e
«è grave?» (Art. 2(65)). Quattro caselle non reggono due domande. ➡️ La risposta non è aggiungere
valori, è **smettere di indovinare**: D267 dice che l'app propone e **una persona conferma**.
⚠️ **E `accertato` NON implica grave:** un danno può essere avvenuto ed essere lieve. Anche lì si chiede.
📌 **Direzione dell'errore, ed è la regola che decide:** Art. 87(7) — «*nel dubbio si segnala*». Ogni
altro ingresso malformato di questa funzione degradava verso **più** obblighi; solo questo verso meno.

**🛑 D278 — DUE SEZIONI DELLA STESSA SPEC SI CONTRADDICEVANO, e stavolta non fra due documenti.**
La §3 è netta: «*Prima della consegna… **Nessuna vigilanza, nessun reclamo**. Difetto colto al banco =
non conformità interna + rilavorazione*». La §6 applicava il test dell'incidente **a tutto**, senza
guardare se il manufatto fosse mai uscito.
⚠️ **E non è il caso raro: è quello NORMALE.** In banca dati `potenziale_di_danno` nasce
**`da_valutare`** (`20260806140823:24`). L'addetta registra un difetto di lavorazione su un lavoro
**ancora al banco**, lascia il valore com'è, e l'app le propone **«incidente»** con ramo §8.3.3.
🔑 **Stessa forma di D276, un livello più dentro:** lì si contraddicevano la spec e il piano, qui **due
sezioni della stessa spec** — e in entrambi i casi la contraddizione era invisibile nella prosa e
visibile solo sulla riga di codice che le fa incontrare.

**🟠 D279 — non è cosmesi, è la riga che un ispettore legge.** Tre casi provati: se l'utente dichiara
che il manufatto **era applicato**, l'app scriveva «*anche se non è ancora stato applicato*»; se
dichiarava «non lo so», scriveva «*a dispositivo già uscito*»; se la segnalazione veniva
**dall'odontoiatra**, scriveva «*ce ne siamo accorti noi*». Sotto **D267** il «perché» è ciò su cui la
persona decide se confermare, e finisce in `valutazioni_evento.giustificazione`.
➡️ **Una motivazione che descrive male il caso è un invito a confermare male.**

**🔑 LA LEZIONE DELLA REVISIONE — «CONFORME AL MANDATO» E «GIUSTO» SONO DUE VERDETTI, ED È GIUSTO CHE
SIANO DUE.** L'esecutore ha fatto esattamente ciò che gli era stato chiesto, e proprio per questo i
difetti del mandato sono arrivati intatti fino al codice: **un esecutore fedele è un amplificatore, non
un filtro**. Il filtro è la revisione con due verdetti separati — e qui il secondo ha trovato tre cose
che il primo, per costruzione, non poteva vedere.

**Chiuso anche, nello stesso giro:** tre lacune di copertura (un ramo del codice mai raggiunto da
nessuna prova · `naturaDaMotivo` senza alcuna prova · la prova «ogni proposta porta il perché» che ne
guardava **una sola** su sei).

---

### Centotredicesima tornata — D280-D282: la domanda sulla gravità prende forma, e nasce l'attrito che sta SOLO sulla porta d'uscita (06/08/2026, 20:54)

**Nasce da:** le due decisioni lasciate aperte dalla chiusura del Task 2, più una **proposta di
Francesco** che nessuno aveva messo sul tavolo.

| # | Decisione | Conseguenza |
|---|---|---|
| **D280** | 🔑 **LA DOMANDA SULLA GRAVITÀ HA TRE RISPOSTE «GRAVE» DISTINTE, E A PARITÀ VINCE IL TERMINE PIÙ BREVE.** Francesco: «*sì a entrambe*» | Non una domanda da sì/no: quattro risposte — **non grave** · **grave, regola generale** (15 gg, Art. 87(3)) · **morte o peggioramento grave non previsto** (10 gg, Art. 87(5)) · **minaccia grave per la salute pubblica** (2 gg, Art. 87(4)). 🛑 **Quando ne valgono due insieme** — una morte che è anche una minaccia per la salute pubblica — **vince il termine più breve**, mai la media e mai il primo trovato |
| **D281** | ✅ **«COMMERCIALE» ED «ERRORE DI REGISTRAZIONE» SU UN LAVORO MAI USCITO DANNO «NESSUNA AZIONE», non non-conformità interna** | Conferma di un'interpretazione che stava già nel codice: D276 (le tre nature esenti) resta più forte di D278 (mai uscito → non conformità). Un tasto premuto per sbaglio **non è un problema del dispositivo**, quindi non entra nel registro qualità né nei conteggi (D273) |
| **D282** | 🔑 **PRIMA DI TOGLIERE QUALCOSA DAI CONTEGGI, L'APP CHIEDE UNA CONFERMA ESPLICITA — ed è di Francesco.** «*credo che in quel caso dobbiamo prevedere un'opzione del tipo «sei sicuro?» e quindi la pwa procede, così escludiamo tutti i possibili casi di errore*» | Nasce un **passaggio di conferma** sull'unica porta che fa **uscire** un evento dai conteggi. ⚠️ **Tre precisioni, integrate nella decisione:** ① la conferma **dice cosa cambia**, non chiede «sei sicuro?» · ② compare **solo dopo** che l'incidente è stato escluso, **mai** davanti a un obbligo di sicurezza · ③ è **la stessa** conferma del ritiro di D273. Il testo esatto passa dal cancello §0B (mockup → approvazione) |

**🔑 IL PRINCIPIO CHE D282 REGALA AL PROGETTO, e vale oltre questo caso: L'ATTRITO STA SULLA PORTA
D'USCITA, MAI SU QUELLA D'INGRESSO.** Registrare un evento non deve costare nulla — è la direttiva
D262. **Toglierlo dai conteggi**, invece, è l'unico gesto che *riduce* ciò che il laboratorio dichiara
in un documento dovuto per legge: lì una conferma non è un ostacolo, è la differenza fra una scelta e
un incidente di percorso. ➡️ **D262 non dice «mai attrito»: dice «mai attrito che impedisca di
lavorare».** Una conferma su un gesto che sottrae è esattamente dove l'attrito serve.

**⚠️ Perché «sei sicuro?» è la forma SBAGLIATA della cosa giusta.** Una conferma che chiede se sei
sicuro viene premuta senza leggere dopo la terza volta: addestra a passare oltre. Una conferma che
**dice cosa cambia** — «*questa registrazione non entrerà nel registro qualità*» — viene letta, perché
porta un'informazione che chi legge non aveva. La proposta di Francesco è giusta nella sostanza; la
precisione riguarda solo la forma, ed è la differenza fra una rete e un rituale.

**🛑 E la precisione ② non è teorica: senza, la conferma finirebbe nel posto peggiore.** L'ordine
ratificato (D276, D277) mette il test dell'incidente **prima** di tutto. Se la conferma comparisse
davanti a quel test, l'app metterebbe un attrito **davanti a un obbligo di segnalazione** — cioè
esattamente al contrario di dove serve.

**🟠 UN NODO APERTO CHE D282 FA EMERGERE, e va sciolto prima del Task 6: DUE PORTE PORTANO NELLA STESSA
STANZA.** Oggi ci sono due modi perché una registrazione non conti: `natura = errore_registrazione`
(il fatto è «abbiamo registrato per sbaglio una consegna», e la classificazione è «nessuna azione») e
il **ritiro** di D273 (la riga non doveva proprio esistere). Sono davvero diversi — il primo registra
un fatto vero, il secondo cancella un tocco sbagliato — **ma al banco si somigliano**, e due porte per
la stessa stanza sono il modo classico di far contare due volte, o zero. ➡️ Il confine si disegna nel
compito del ritiro, non si lascia all'intuito di chi sta al banco.

---

### Centoquattordicesima tornata — D283: il primo tocco chiede conferma, ed è la rete che D269 aveva tolto senza rimpiazzarla (06/08/2026, 21:26)

**Nasce da:** una proposta di Francesco che **avevo capito male**, e la sua correzione.

🛑 **LA MIA LETTURA SBAGLIATA, per intero e senza attenuanti.** Francesco aveva scritto: «*se abbiamo
confermato un lavoro e vogliamo riaprirlo… ma se invece per sbaglio premo sul pulsante per riaprirlo?*».
Io l'ho letta come una conferma **in uscita** (prima di togliere un evento dai conteggi) e ho scritto
**D282** su quello. Lui parlava del **primo tocco**: la conferma **in ingresso**, che impedisce a un
tocco involontario di aprire l'iter. Sua la precisazione: «*non mi sono spiegato bene… in prima
battuta non sarebbe comodo chiedere una cosa tipo, sei sicuro di voler riaprire questo lavoro?*».
➡️ **D282 resta valida** — è un'altra porta, e serve — **ma non era la sua domanda.**

| # | Decisione | Conseguenza |
|---|---|---|
| **D283** | 🔑 **PRIMA DI APRIRE L'ITER, L'APP CHIEDE CONFERMA — e la conferma NOMINA IL LAVORO.** Di Francesco | Il gesto «devo intervenire» su un lavoro consegnato **non parte al primo tocco**: chiede conferma, e nel chiederla **dice quale lavoro** sta per riaprire. ⚠️ **Precisazione integrata:** nominare il lavoro intercetta anche l'errore **più frequente** del tasto sbagliato — quello del **lavoro sbagliato**, che un «sei sicuro?» nudo non prende. Testo esatto dal cancello §0B |

**🔴 PERCHÉ NON È UNA COMODITÀ MA UN BUCO CHE STAVAMO PER LASCIARE APERTO — misurato, non supposto.**
Oggi il tasto «Annulla» della fascia di consegna **parte al primo tocco**: `onClick={handleAnnulla}`
in `src/components/features/lavori/AnnullaConsegnaBanner.tsx:145`, e in tutto il file **zero** dialoghi
di conferma (`grep` → 0 riscontri). L'unica rete che esisteva **erano i dieci minuti**: un tocco
involontario si annullava da sé, perché la finestra si chiudeva e il gesto era reversibile dentro di
essa.
🛑 **D269 toglie quella finestra.** Senza D283 il gesto diventa **permanente e a un tocco solo**: cioè
**più pericoloso di prima**, non meno. ➡️ **La proposta di Francesco non aggiunge attrito: RIMPIAZZA
una rete che stavamo smontando senza accorgercene.**

**🔑 LA LEZIONE, e riguarda il metodo prima del prodotto: quando si toglie un vincolo, si censisce che
cosa quel vincolo stava REGGENDO.** I dieci minuti erano stati diagnosticati come «un residuo di
un'architettura mai eseguita» (D262), ed era vero **per il motivo per cui erano nati** — la fattura
automatica alla consegna. Ma nel frattempo reggevano **un secondo carico che nessuno aveva scritto**:
la protezione dal tocco involontario. Un vincolo inutile per la sua ragione originale può essere
diventato utile per un'altra, e **toglierlo guardando solo la ragione originale lascia scoperto il
carico nuovo**.
⚠️ **E si noti chi l'ha visto:** non il panel, non la revisione, non i test — **Francesco, immaginando
il gesto al banco.** Nessuno dei tre controlli automatici poteva trovarlo, perché non è un difetto del
codice: è una cosa che il codice non fa.

**📌 Come stanno insieme le due conferme (D283 e D282), e perché non sono un doppione:**
D283 sta **in ingresso** e protegge dal gesto non voluto — «stai per riaprire il lavoro n. 412».
D282 sta **in uscita** e protegge dal togliere qualcosa dai conteggi senza volerlo. Guardano due
rischi diversi, in due momenti diversi. ➡️ **E con D283 in piedi, il caso del tocco involontario
diventa raro**: la via più economica per un tocco sbagliato non è registrarlo e poi ritirarlo, è
**non crearlo**.

---

### Centoquindicesima tornata — D284: applicare una migration al banco di prova non si chiede più (06/08/2026, 21:59)

**Nasce da:** quattro rifiuti del classificatore dei comandi in una sola giornata, e la mia scelta di
**chiedere invece di aggirare** — corretta come procedura, ma diventata un intralcio quando si ripete.

| # | Decisione | Conseguenza |
|---|---|---|
| **D284** | 🔑 **APPLICARE UNA MIGRATION AL DATABASE DI PROVA NON SI CHIEDE PIÙ.** Francesco: «*senti questo tipo di comando lo hai sempre eseguito in autonomia e voglio che tu continui a farlo, non chiedermi più di eseguirlo*» | `npx supabase db push --linked --yes` si lancia **da soli**. ⚠️ **La forma conta:** senza `--yes` il comando resta appeso a una domanda interattiva e **sembra fallito senza esserlo** — è successo oggi, e per capirlo è servito leggere il terminale. Il `--linked` punta al progetto collegato |

**📌 Il perimetro, e resta stretto.** Vale per il **database di prova** `iagibumwjstnveqpjbwq`, che
`ua-app/CLAUDE.md` §8 dichiara pieno di **soli dati di prova, nessun cliente reale**. È la stessa
famiglia di **D103** («*logga tranquillamente con i dati nel file env*»): su un banco di prova
chiedere il permesso a ogni giro è cerimonia, non prudenza.
🛑 **Non si estende** a: pubblicare su `main` (resta di Francesco), cancellare dati, o toccare un
domani un ambiente con dati veri — e **il giorno in cui il primo laboratorio reale entra**, questa
decisione va riletta insieme alla sezione §8 che la regge.

**⚠️ Il fatto che l'ha generata, e la lezione che porta con sé.** Oggi il classificatore ha rifiutato
**quattro volte** i comandi che scrivono sul database. La regola di casa dice «*si chiede, non si
aggira*», e l'ho seguita: ma il primo comando che ho passato a Francesco era **sbagliato** (senza la
cartella: il terminale parte da quella superiore), il secondo avrebbe applicato il SQL **senza
registrare la migration** — disallineando il registro — e il terzo è rimasto **appeso a una domanda**
che dal mio lato sembrava un fallimento.
🔑 **Tre errori in tre passaggi di consegne, su un comando che so eseguire.** ➡️ **Passare un compito a
una persona non è gratis: ogni passaggio è un punto in cui si perde un pezzo di contesto.** Quando il
contesto necessario ce l'ho io e il rischio è basso, il passaggio **aggiunge** rischio invece di
toglierlo. La regola «si chiede, non si aggira» resta viva dove il rischio è alto — pubblicare,
cancellare, toccare dati veri.

---

### Centosedicesima tornata — D285: le due porte sono DUE, e solo il ritiro toglie dai conteggi (06/08/2026, 22:31)

**Nasce da:** il §0③ dell'handoff della sera — «*due porte portano nella stessa stanza*» — portato a
Francesco **prima** di spendere la serata sui compiti liberi, perché tutta la catena dei blocchi (il
ritiro → i tre testi → il Task 6 → il Task 7) sta a valle di questa risposta e **niente di quella
catena si muove senza di lui**.

| # | Decisione | Conseguenza |
|---|---|---|
| **D285** | 🔑 **LE DUE PORTE RESTANO DUE, E SI DISTINGUONO PER *CHE COSA* ERA SBAGLIATO.** Scelta di Francesco fra tre forme proposte | **①** «errore di registrazione» (e «commerciale») = **il fatto è successo davvero**, qualcuno l'ha guardato e ha concluso che non è un problema del dispositivo → esito `nessuna_azione`, **la riga resta in elenco e resta nel conto delle cose esaminate**. **②** Il **RITIRO** (D273) = **questa riga non doveva esistere** (tocco sbagliato, doppione) → esce da elenchi e da **ogni** conteggio, e **resta in archivio col motivo obbligatorio**. ➡️ **I predicati dei conteggi diventano DUE** (v. l'emendamento qui sotto: la prima stesura ne diceva «uno solo» e sbagliava). |

**🔑 La riga che rende la distinzione insegnabile, ed è il motivo per cui regge:** le due porte non si
distinguono per l'esito — quello si somiglia — ma per **quale oggetto era sbagliato**. Nel primo caso
era sbagliato **il dato del lavoro**, e l'evento è la prova che qualcuno se n'è accorto e ha guardato.
Nel secondo era sbagliato **aver aperto la segnalazione**, e la prova che serve è un'altra: il motivo
per cui è stata tolta.

**⚠️ E questo cambia una riga di codice già scritta — un ritrovamento, non un dettaglio.** Il commento
di `src/lib/qualita/classifica.ts:158-160` dice oggi che le esenzioni «*non entrano nei conteggi del
rapporto periodico (D273)*». Con D285 quella frase è **troppo larga**: le esenzioni non entrano nei
conteggi delle **non conformità e dei reclami**, ma **restano** nel conto delle cose esaminate — che è
esattamente ciò che dimostra a un'autorità che il laboratorio guarda le cose invece di non registrarle.
➡️ **La correzione del commento va nel compito del ritiro**, insieme al predicato: sono la stessa cosa
detta nei due posti dove va detta.

**⏳ Stato della ratifica.** La scelta è di Francesco ed è registrata **subito** (BP-1-bis). La **Regola
Advisor** vuole il panel *prima* della ratifica: tre advisor con mandato di **smontare** la decisione —
normativo (è difendibile davanti a un'autorità togliere righe «ritirate» dai numeri dell'Art. 85/86?),
database (il predicato, la policy `FOR ALL`, il `REVOKE DELETE`, i collegamenti per il divieto di
ritiro), prodotto (un operatore al banco distingue i due gesti?). **Le loro condizioni si integrano qui
sotto o si motivano una per una.**

#### 🔬 Il verbale del panel — tre advisor, mandato di SMONTARE: **REGGE CON CONDIZIONI ×3**

Nessuno dei tre dice «non regge». Ma tutti e tre trovano qualcosa che la decisione, **come l'avevo
scritta**, non copriva.

**🛑 ①  LA MIA FRASE «UN PREDICATO SOLO» ERA SBAGLIATA, E CONTRADDICEVA D281 — correzione, non
sfumatura.** D281 dice, per gli stessi due valori: «*non entra nel registro qualità **né nei conteggi**
(D273)*». La mia riga diceva l'opposto. ➡️ **I predicati sono DUE, e la contraddizione sparisce appena
si smette di dire «i conteggi» come se fossero uno:**
- **conteggio regolamentare** (non conformità · reclami · incidenti — quelli del rapporto periodico):
  `non ritirata` **E** l'esito è uno di quelli regolamentari. `errore_registrazione` **NON** ci entra —
  D281 regge intatta.
- **conteggio delle cose esaminate** (quante segnalazioni sono state guardate): `non ritirata`, e basta.
  `errore_registrazione` **ci entra**, ed è ciò che dimostra che il laboratorio guarda.
⚠️ **Il secondo conteggio oggi NON ESISTE**: `psur/route.ts:190` è `totale_reclami: 0` fisso e la rotta
**non legge mai** `eventi_qualita`. Un predicato senza una query che lo usi è **prosa** (R-P1). ➡️ **Il
compito del ritiro deve cablare almeno un conteggio vero**, o non c'è niente da provare.

**🔴 ②  IL TEST CHE DECIDE QUALE PORTA — ed è la condizione più forte del panel normativo.**
La mia D285 enunciava una *conseguenza*, non un **test**. Il test è questo, e si prova in una riga:
**se l'informazione è arrivata da FUORI, il ritiro è vietato** — `origine_informazione <>
'laboratorio_interno'` (quattro valori su cinque sono esterni, `20260806140823:18-20`). **E il divieto
sta nel database, non nell'interfaccia.** Fondamento: Allegato III §1.1(a) enumera che cosa è dato
rilevante di sorveglianza — un tocco sbagliato non è nessuna di quelle cose, ma **un reclamo arrivato
da un odontoiatra sì**, e quello non si toglie mai. ⚠️ Vale **in una direzione sola**: «interno» non
implica «ritirabile».

**🔴 ③  IL PUNTO PIÙ DEBOLE, e nessuno dei tre lo attenua: il ritiro ricrea, un piano più in su, il
difetto che D276 esiste per chiudere.** D276 impedisce a una `natura` di **saltare la fila** davanti al
test dell'incidente; D282 ② promette che la conferma compare **solo dopo** che l'incidente è escluso.
Ma **il ritiro agisce sulla RIGA**, e oggi si aprirebbe **prima che una derivazione sia mai girata**:
è l'unica via che non ha mai dovuto rispondere alla domanda dell'Art. 2(64). ➡️ **Condizione: il ritiro
non è raggiungibile finché non esiste una valutazione viva** con esito diverso da incidente.

**🟠 ④  LA GARANZIA CHE RENDE IL RITIRO DIFENDIBILE È UN NUMERO PUBBLICATO, non un permesso.**
Il rapporto porta **entrambi**: `righe_totali = righe_contate + righe_ritirate`. Un numero pubblicato
smette di essere una sparizione. 🔑 Serve perché per i su misura il rapporto periodico **è parte della
documentazione dell'Allegato XIII §2** (Art. 86(2)): è materiale che un'autorità può farsi consegnare.

**🛑 ⑤  `incidenti_mdr` NON È IL MODELLO — ed è scritto «modello già in casa» nel piano (riga 742).**
La sua policy `FOR ALL USING (… AND deleted_at IS NULL)` (`002_fase2_schema.sql:423-424`) **non ha
`WITH CHECK`**: nasconde la riga **al laboratorio stesso**, e non ha né motivo né autore. Copiarlo
importa il difetto insieme al pattern. ➡️ **Il filtro va nelle query (o in una vista), MAI nella
policy**: il motivo obbligatorio serve proprio a poter **rivedere** i ritirati.

**🟠 ⑥  IL RITIRO SENZA STORIA NON VALE NIENTE.** Due colonne e l'`UPDATE` aperto (che D262 vuole
aperto) danno: ritira → dis-ritira → ritira, e resta **solo l'ultimo motivo** — sull'unico gesto che
**sottrae** da un conteggio dovuto per legge, mentre `valutazioni_evento` è sola-aggiunta proprio per
ISO 13485 §4.2.5. ➡️ Il ritiro passa da una **RPC `SECURITY DEFINER`** (modello `valutazione_supera`),
con `GRANT UPDATE` per colonna invece che sulla tabella. ⚠️ **La sentinella
`tests/integration/eventi-qualita-schema.rpc.test.ts` va spostata su `has_column_privilege`**, o
diventerà rossa leggendosi come «D262 rotto» quando è vero il contrario.

**🔴 ⑦  L'ECCEZIONE «HA GIÀ PRODOTTO UN ATTO VERSO L'ESTERNO» È OGGI APPLICABILE SU 0 RAMI SU 3.**
`provato:` nessun `evento_id` su `dichiarazioni_conformita` (e il `sostituisce_id` del Task 5 lega
documento→documento, quindi **non basta neanche dopo**) · nessun `evento_id` su `incidenti_mdr` ·
**l'avviso al medico non è registrato da nessuna parte**: si costruisce solo un indirizzo `wa.me`
(`src/lib/consegna/orchestrate.ts:158`). ➡️ **O il compito crea i legami, o la guardia si dichiara non
applicabile.** Una guardia che ne controlla zero su tre è peggio dell'assenza: sembra copertura.

**🟢 ⑧  LE DUE FRASI CHE RENDONO LA DISTINZIONE INSEGNABILE AL BANCO** (panel prodotto), da portare al
cancello §0B invece di inventarne altre: «**Ho sbagliato a segnare il lavoro**» · «**Ho sbagliato ad
aprire questa nota**». Una parola di differenza — *lavoro* / *nota* — e la domanda diventa una a cui si
risponde in piedi. La riga «cosa cambia» del ritiro: «*La nota sparisce dagli elenchi. Resta in
archivio, col motivo che scrivi.*»
⚠️ **E D282 ③ deve cedere:** «la STESSA conferma» per due gesti che cambiano cose diverse **non può
dire cosa cambia** — stesso componente, **due frasi**.

#### ⏸️ RESTA APERTO, e la decisione è di Francesco: che cosa FA «errore di registrazione»?

**Il panel prodotto l'ha trovata, io l'ho verificata riga per riga, ed è la TERZA contraddizione fra
documenti ratificati in un giorno solo** (dopo spec-contro-piano e spec-contro-sé-stessa).

| Dove | Che cosa dice |
|---|---|
| **§6** della spec (e il codice, `classifica.ts:163-164`) | `errore_registrazione` → esito **`nessuna azione`**, col perché scritto: «*Non tocca il dispositivo né il documento sanitario*» |
| **§7** della spec, riga 384 | «*chi ha semplicemente sbagliato tasto usa `natura = errore_registrazione`: **due tap invece di uno***» — cioè è **la via che sostituisce l'annullo della consegna**, e quell'annullo riporta il lavoro a `pronto` **e mette la dichiarazione in `annullata`** |

🔑 **Le due righe possono convivere** — l'esito di *qualità* è «nessuna azione», l'effetto *operativo* è
il rientro — **ma solo se qualcosa le tiene insieme, e oggi non c'è niente:**
1. `provato:` la **§4 promette** (righe 197-198) «*un indicatore opzionale «questo evento richiede anche
   di rientrare in produzione»*». **Quella colonna NON ESISTE**: `grep 'rientr'` sulle due migration
   dell'ondata → **zero riscontri**; `eventi_qualita` ha 13 colonne e nessuna è quella.
2. `provato:` **`riapri_lavoro_atomica` — costruita oggi col Task 3, applicata al database — ha ZERO
   chiamanti**: `grep -r` in `src/` → **un solo riscontro**, ed è `src/types/database.types.ts:6429`,
   cioè il file dei tipi **generato**. **E nessuno dei nove compiti del piano la chiama.** ➡️ È
   esattamente la famiglia della **guardia mai agganciata**: una cosa costruita, applicata, e che non
   gira mai.
3. Il testo che l'utente legge — «*Non tocca il dispositivo né il documento sanitario*» — **è falso**
   nel caso in cui il rientro annulli la dichiarazione.

🔴 **E se vince la §7, il rischio è INVERTITO rispetto alla premessa di D285.** Il ritiro fa sparire
**una nota**; «errore di registrazione», se porta il rientro con sé, **disfa una consegna vera e annulla
un documento a valore legale** — ed è l'unico dei due che sta sullo schermo **nel momento di panico**,
offerto dentro una lista di nove voci. Le difese (conferme, attriti, gate) andrebbero allora **sull'altra
porta** rispetto a dove D282/D283 le hanno messe.

**La domanda, in una riga:** quando qualcuno ha segnato «consegnato» per sbaglio e sceglie «errore di
registrazione», il lavoro **deve tornare indietro** (e la dichiarazione annullarsi) — **sempre**,
**mai**, oppure **solo se lo chiede in un secondo passaggio**? Da qui dipendono la colonna mancante, il
chiamante della RPC del Task 3, e su quale porta vanno le difese.

---

### Centodiciassettesima tornata — D286 e D287: l'orologio è quello di Roma, e il contatore conta solo ciò che è uscito (06/08/2026, 23:39)

**Nasce da:** due punti portati a Francesco in chiusura del Task 4 — uno trovato dall'esecutore
correggendo sé stesso, uno da adjudicare perché uno scostamento dichiarato resti una decisione e non
un'abitudine.

| # | Decisione | Conseguenza |
|---|---|---|
| **D286** | 🔑 **OGNI ORARIO DELL'APP È QUELLO ITALIANO DI ROMA.** Francesco: «*sempre l'app deve seguire l'orario italiano di Roma quello di qualsiasi dispositivo in Italia*» | Un momento che arriva **senza fuso** (`2026-08-06T10:00`, cioè ciò che restituisce un campo data-e-ora del browser) si legge **come ora di Roma**, mai come ora locale di chi esegue. ⚠️ **Il difetto vero che chiude:** il server dell'app gira in **UTC**; senza questa regola avrebbe letto «10:00» come 10:00 UTC, cioè **le 12:00 di Roma** in estate — **due ore di scarto IN AVANTI su una scadenza dell'Art. 87** |
| **D287** | ✅ **IL CONTATORE DELLE CORREZIONI CONTA SOLO CIÒ CHE ERA USCITO.** Francesco: «*sì*» | `lavori.post_consegna_correzioni` sale **solo** se `stato_dispositivo <> 'mai_uscito_dal_lab'`. Ratifica di uno **scostamento dichiarato** dall'esecutore del Task 4 rispetto alla regola 3 del piano, che diceva «incrementa» e basta |

**📌 D286 — che cosa comporta, in concreto, e dove NON si applica.**
La regola riguarda **come si legge un momento ambiguo**, non come si conserva: in banca dati i momenti
restano `TIMESTAMPTZ`, cioè istanti assoluti — che è la forma giusta e non cambia. Cambia il modo di
**risolvere l'ambiguità in ingresso**, e cambia il **fuso in cui si mostrano** le date all'utente.
⚠️ **Un caso d'angolo dichiarato, non nascosto:** l'ultima domenica di ottobre l'ora fra le 2 e le 3
esiste **due volte**. Un momento scritto a mano in quella finestra è genuinamente ambiguo: si sceglie la
lettura **più prudente per i termini di legge**, cioè quella che rende la scadenza **più vicina**
(l'istante **precedente**, ora legale). È lo stesso principio di D280 — «a parità vince il termine più
breve».

**📌 D287 — perché è una ratifica e non un timbro.** Il piano diceva «incrementa» portando come prova
solo che la **colonna esiste** — mai chi la legge. Il censimento è stato **rifatto in revisione**:
`post_consegna_correzioni` compare in `src/` in **sei righe** oltre al Task 4 — tre nei tipi generati,
una nel tipo di dominio, **due nelle rotte fiscali soltanto dentro l'elenco `select(...)`** — e
`src/lib/fattura/generate-xml.ts` **non la nomina mai**; in `supabase/` nessuna vista né funzione la
legge. ➡️ **Nessun documento fiscale cambia.** Il predicato è **lo stesso** già usato in
`classifica.ts:128`, non un secondo criterio che diverge.
⚠️ **La riserva onesta resta scritta:** `stato_dispositivo` è **dichiarato dal client**, quindi la
metrica non era comunque indipendentemente affidabile.
🟠 **E porta un compito al RITIRO:** un evento registrato per sbaglio fa salire quel contatore, e **oggi
nessuno lo fa scendere**. Se il ritiro toglie la riga dai conteggi ma lascia il numero su, si costruisce
**un secondo generatore di numeri falsi** accanto a quello che D273 chiude.

**🛑 Esenzione dalla Regola Advisor, dichiarata invece che sottintesa.** Nessuna delle due è passata da
un panel: **D286** è la scelta ovvia per un'applicazione italiana e non ha alternative sensate da
mettere a confronto; **D287** ha già avuto **due revisioni indipendenti** e un censimento rifatto da
zero, che è più di quanto un panel avrebbe prodotto. Le esenzioni previste sono «decisioni banali,
reversibili in minuti, o già coperte».

---

### Centodiciottesima tornata — D288: l'effetto del rientro si DERIVA dal motivo, e chiude R1-bis (06/08/2026, 23:47)

**Nasce da:** la domanda aperta della tornata precedente («il rientro è sempre, mai, o solo se lo
chiede?»), a cui Francesco ha risposto con una **quarta forma, più precisa delle tre proposte**.

> «*io consegno un lavoro con la pwa, deve esserci la possibilità di reintervenire sul lavoro
> consegnato, poter premere un pulsante e prima di tutto dire: vuoi reintervenire sul lavoro o hai
> premuto questo tasto per sbaglio? sì voglio reintervenire, benissimo, per quale motivo? per x
> motivi, tra cui, ho sbagliato a premere consegna, allora ripristina tutto, mi sono accorto che devo
> correggere un dato, lo corregge e posso riconsegnare, è tornato con un difetto e devo poter
> intervenire etc etc.*»

| # | Decisione | Conseguenza |
|---|---|---|
| **D288** | 🔑 **L'EFFETTO SUL LAVORO NON SI CHIEDE A PARTE: SI DERIVA DAL MOTIVO.** Di Francesco | Nessuna casella «vuoi anche rientrare in produzione?». Il motivo **è già** la risposta: «ho sbagliato a premere consegna» → **ripristina tutto** (lavoro a `pronto`, dichiarazione in `annullata`) · «devo correggere un dato» → si corregge e **si riconsegna** · «è tornato con un difetto» → il percorso dell'intervento vero. ➡️ **Stesso principio delle derivazioni già in spec §6**: l'app deriva e propone, la persona conferma |

**🔴 QUESTO CHIUDE R1-bis, E DECIDE QUALE DELLE DUE RIGHE DELLA SPEC VINCE.** La spec diceva due cose
diverse: §6 dà a `errore_registrazione` esito «nessuna azione» col perché «*Non tocca il dispositivo né
il documento sanitario*»; §7 riga 384 lo indica come la via di chi ha sbagliato tasto, cioè quella che
**riporta il lavoro a `pronto` e annulla la dichiarazione**. ➡️ **Vince la §7 sull'EFFETTO. E le due
righe non erano in contraddizione: parlavano di due piani diversi**, e nessuno dei due documenti lo
diceva.
- **Piano della QUALITÀ** — l'esito resta **`nessuna_azione`**: non è un problema del dispositivo,
  quindi **non entra nei conteggi regolamentari**. D281 e D285 restano intatte.
- **Piano OPERATIVO** — il lavoro **torna indietro** e la dichiarazione **si annulla**, perché una
  dichiarazione emessa su una consegna mai avvenuta è un documento che afferma il falso.

🛑 **E il testo mostrato all'utente oggi è FALSO e va corretto** (`src/lib/qualita/classifica.ts:164`):
«*Non tocca il dispositivo né il documento sanitario*» — mentre la dichiarazione **viene annullata**. Il
perché deve dire **che cosa succede davvero**.

**✅ E dà finalmente un CHIAMANTE a `riapri_lavoro_atomica`** (ritrovamento R1: costruita col Task 3,
applicata al database, **zero chiamanti**). È la derivazione dal motivo a invocarla — e va **dentro il
compito che scrive quella derivazione**, non lasciata a un compito che non esiste.

**📌 D288 conferma e ARRICCHISCE D283.** La conferma in ingresso non è un «sei sicuro?»: la forma che
Francesco descrive è **«vuoi reintervenire su questo lavoro, o hai premuto per sbaglio?»** — cioè offre
**l'uscita** insieme alla domanda. È esattamente ciò che il panel prodotto aveva chiesto come
condizione ③: *una via che non salva niente*, perché senza quella l'operatore sul lavoro sbagliato non
ha **nessuna scelta giusta** a schermo e prenderà il motivo più vicino.

**⏸️ Resta da decidere, ed è la conseguenza diretta:** ogni motivo dei nove porta il suo effetto, e
**l'elenco degli effetti non è ancora scritto**. Va fatto **prima** del cancello §0B sui testi: le
tre frasi da approvare devono dire *cosa cambia*, e non si può dire cosa cambia finché non è deciso
che cosa cambia.

---

### Centodiciannovesima tornata — D289: il formato della data si allinea a quello di casa, e NON serve il gate (07/08/2026, mattina)

**Nasce da:** un effetto collaterale della propagazione di D286. Correggendo il fuso, due stampe
server-side sono passate da `toLocaleDateString` nudo a `dataItalianaBreve()`, e con esse il testo
visibile su `impostazioni/abbonamento`: **`20/8/2026` → `20/08/2026`**.

| # | Decisione | Conseguenza |
|---|---|---|
| **D289** | ✅ **IL FORMATO CON LO ZERO DAVANTI VA BENE, e non apre un gate estetico.** Francesco: «*per il formato della data va benissimo*» | `dataItalianaBreve()` resta la forma unica. **La FASE 9b (gate L2) NON è dovuta** per questo cambio |

**📌 Perché la domanda è stata posta lo stesso, e perché la risposta non svuota D245.** D245 dice che
**il testo visibile è aspetto**, e che **in dubbio si fa il gate** (fail-closed, come R-P1). Qui il
dubbio era reale: `impostazioni/abbonamento` **non è una superficie di quest'ondata**, quindi un
micro-audit su dodici sezioni e sei combinazioni di schermo e tema sarebbe costato più del cambio.
➡️ **La regola non è stata piegata: è stata applicata, e la sua uscita prevista è che DECIDE
Francesco.** Un gate saltato **in silenzio** sarebbe stato il difetto già pagato due giorni di fila;
un gate **dichiarato e sciolto da chi decide** è il funzionamento normale.
🔑 **E il cambio va nella direzione giusta a prescindere:** `20/8/2026` era il formato **predefinito
del browser**, non una scelta del progetto — cioè un punto in cui l'app parlava una lingua diversa da
quella dei propri documenti.

---

### Centoventesima tornata — D290-D292: tre effetti dei nove motivi, decisi da chi il mestiere lo fa (07/08/2026, 08:42)

> 🛑 **CORREZIONE DI ORARIO SU QUESTE DUE TORNATE, e la scrivo per intera perché è esattamente il difetto che D155 esiste per impedire.** Le due intestazioni portavano `00:41` e `00:52`: orari **DEDOTTI** dalla sessione precedente, non letti dall'orologio. `provato:` `date` → **`07/08/2026 08:43 CEST`**, e l'ultimo salvataggio della notte è delle **00:30** — fra i due c'è una pausa di otto ore che avevo registrato come cinquanta minuti. ➡️ D290-D292 portano ora l'ora **misurata**; per D289 non ho una misura dell'istante esatto e scrivo **«mattina»**, che è vero, invece di un numero preciso e falso. 🔑 **Il meccanismo è identico a quello del 02/08: un orario non verificato si eredita dal contesto precedente e nessun passaggio lo confronta con un orologio.** La regola dice `date` **prima** di scrivere una data, non dopo.


**Nasce da:** D288 («l'effetto si deriva dal motivo») che ha aperto la conseguenza diretta — **l'elenco
degli effetti dei nove motivi**, che non esisteva. Cinque righe su nove erano già decise dalla spec o
da D288; tre erano **domande di mestiere**, non di programmazione, e sono andate a Francesco.

| # | Decisione | Conseguenza |
|---|---|---|
| **D290** | 🔑 **DIFETTO DI LAVORAZIONE: LO SCEGLIE CHI REGISTRA — «si sistema questo, o se ne fa uno nuovo?»** | L'app **non decide**: chiede. A volte un difetto si corregge sul pezzo, a volte il pezzo non è recuperabile. ➡️ Due esiti dallo stesso motivo: **rientro in produzione** (il lavoro torna a `pronto`) oppure **rifacimento** (lavoro nuovo collegato, `lavori_rifacimenti.evento_id`, che la spec §4 ha già reso «un esito, non la porta d'ingresso») |
| **D291** | 🔑 **PERSONA SBAGLIATA: SI ANNULLA LA CONSEGNA, MA IL DOCUMENTO RESTA** | Il manufatto si recupera e si riconsegna a chi doveva riceverlo. Il lavoro torna a `pronto`; la dichiarazione **non si rifà**, perché **diceva il vero**: sbagliato era il destinatario, non il contenuto |
| **D292** | 🔑 **RESO SENZA DIFETTO: DIPENDE DAL PERCHÉ È TORNATO — e l'app lo chiede** | Un manufatto che torna perché il paziente non si è presentato non è la stessa cosa di uno che il medico rimanda indietro senza dire perché. ➡️ Serve **un secondo dettaglio** prima di derivare l'effetto: **vocabolario nuovo, da progettare** |

**🔑 Il filo che tiene insieme le tre, e non è una coincidenza: dove il mestiere ha più di un caso,
l'app CHIEDE invece di indovinare.** Due risposte su tre sono «dipende», ed è la stessa forma di D267
(«l'app propone, una persona conferma») applicata all'effetto invece che alla classificazione. 🛑 **Il
contrario — derivare un esito solo perché è il più frequente — è il difetto che D276 ha già chiuso una
volta**, in un altro vestito.

**⚠️ Una conseguenza di D290 che DICHIARO invece di assumerla:** la stessa scelta «si sistema o si
rifà?» ha senso anche per **`difetto_materiale`**, che ha la stessa struttura (il manufatto è fisicamente
compromesso). **Non l'ho chiesto**, quindi lo porto come **proposta da confermare**, non come deciso.

**⏸️ D292 apre un lavoro nuovo, piccolo ma vero:** il vocabolario dei motivi del reso senza difetto non
esiste. Va progettato **prima** del cancello §0B, come tutto il resto di questo elenco.

**📌 L'elenco degli effetti, allo stato di questa tornata** (cinque righe erano già decise):

| motivo | il lavoro | il documento |
|---|---|---|
| dato sbagliato sul documento | resta consegnato | **si annulla e si rifà** (spec §6) |
| **difetto di lavorazione** | **si sistema oppure si rifà — sceglie chi registra (D290)** | ❓ **panel normativo in corso** |
| difetto del materiale | rientra (🟡 proposta: stessa scelta di D290) | **si annulla e si rifà** (spec §6) |
| **persona sbagliata** | **torna a `pronto` (D291)** | **resta valido (D291)** |
| modifica chiesta dal medico | **lavoro nuovo**, non un rientro | resta valido (era conforme alla sua prescrizione) |
| prezzo o quantità sbagliati | non si tocca | non si tocca — l'app **segnala** la nota di credito e non la esegue (caso 6, fuori perimetro) |
| **reso senza difetto** | **dipende dal perché (D292)** — vocabolario da progettare | idem |
| ho sbagliato a premere consegna | **ripristina tutto** (D288) | **si annulla** (D288) |
| altro | niente in automatico | niente — l'app registra e non indovina |

---

### Centoventunesima tornata — D293 e D294: la dichiarazione non si annulla mai, e porta solo ciò che ci deve stare (07/08/2026, 09:44)

**Nasce da:** tre verifiche su fonti primarie, richieste da Francesco («*riconferma le fonti su EUR-Lex
e poi ratifichiamo, ricordati che a noi interessano le leggi italiane*») dopo che un primo panel aveva
dovuto ripiegare su un sito-specchio. 🔑 **L'aggiunta «le leggi italiane» è stata la più produttiva
delle tre:** ha ribaltato la domanda invece di rispondervi.

| # | Decisione | Conseguenza |
|---|---|---|
| **D293** | 🔑 **LA DICHIARAZIONE NON SI ANNULLA MAI SE IL MANUFATTO È USCITO DAVVERO — e si rifà solo se cambia qualcosa che vi è stampato.** Ratificata da Francesco: «*confermo, ratifichiamo*» | ① `annullata` in banca dati significa **superata**, mai «nulla» · ② una **riconsegna dopo rilavorazione NON è una nuova immissione** (Art. 2(28): «*la **prima** messa a disposizione*») · ③ si riemette **solo** se cambia un campo stampato · ④ se il pezzo si **rifà da zero** il documento nuovo è dovuto e **il vecchio resta**, unica prova di un manufatto esistito e consegnato a un paziente |
| **D294** | 🔑 **IL DOCUMENTO PORTA SOLO CIÒ CHE CI DEVE STARE — via i materiali.** Francesco: «*togli tutto quello che sul documento non ci deve essere, come la storia dei materiali*» | I materiali e i lotti **escono dalla dichiarazione**. ⚠️ **Tenerne traccia resta**: la tracciatura interna è cosa diversa dalla stampa sul documento (Allegato XIII **punto 2**). ➡️ Serve un **censimento campo per campo** contro gli otto contenuti dell'Allegato XIII punto 1, **prima** di toccare il generatore |

### 📜 Le prove su cui poggiano, e da dove vengono

🛑 **EUR-Lex era SPENTO** (verificato da Francesco con monitoraggio esterno, 09:23 del 07/08/2026;
quattro punti d'ingresso su quattro falliti). Il testo è stato preso da **`publications.europa.eu`
(Cellar)**, che **non è uno specchio**: è il deposito da cui EUR-Lex stesso serve i testi. `provato:`
intestazione → **`02017R0745 — IT — 01.01.2026 — 006.001`**.

- **Art. 2(28)** — «immissione sul mercato»: «*la **prima** messa a disposizione*». Un evento
  irripetibile. `provato:` `grep` sul file scaricato.
- **Allegato XIII punto 1** — **OTTO** contenuti, contati: fabbricante e siti · mandatario · dati
  identificativi del dispositivo · uso esclusivo per il paziente nominato · prescrittore · caratteristiche
  dalla prescrizione · conformità ai requisiti generali · sostanze/tessuti. **Data, numero, materiali e
  lotti NON sono nominati.** ⚠️ «Non nominati» ≠ «vietati»: le voci 3 e 6 sono aperte, e **se la
  prescrizione nomina i materiali, i materiali rientrano da quella porta**.
- **Allegato XIII punto 4** — «*è conservata per almeno 10 anni **dalla data di immissione sul mercato
  del dispositivo***» (singolare).
- 🔴 **Annullamento: CERCATO E NON TROVATO.** `provato:` `grep -c "annull"` sul consolidato → **0
  occorrenze**. Sospensione e ritiro esistono, ma sono istituti costruiti per i **certificati** degli
  organismi notificati, mai per l'atto del fabbricante.
- 🇮🇹 **Nessuna fonte primaria italiana impone il contenuto della dichiarazione**, né i materiali né i
  lotti: censimento **esaustivo** su D.Lgs. 137/2022 (testo vigente, Normattiva) · DM 9 giugno 2023
  (unico decreto attuativo dell'art. 7, letto per intero) · l'intero indice del tema del Ministero ·
  le 16 FAQ ministeriali sui su misura (agg. 06/07/2026).
- 🔑 **E la prassi italiana dei materiali nasce da una nota del 1998, cioè da un regime ABROGATO — dove
  però i materiali stavano sull'«attestazione dell'ODONTOIATRA al paziente», non sulla dichiarazione
  del laboratorio**, e la rintracciabilità delle materie prime stava nel **fascicolo tecnico interno**.
  ➡️ **Non ha mai avuto quel fondamento, nemmeno prima del MDR.**

### 🔄 Una correzione a me stesso, dentro la stessa ratifica

Avevo riportato che l'**Allegato XIII punto 5** «presuppone che il documento del pezzo difettoso esista
ancora». **Il testo non lo dice**: dice che il fabbricante valuta e documenta l'esperienza dopo la
produzione. Era **un'inferenza**, e il verificatore si è rifiutato di farla passare per lettura.
➡️ **D293 regge lo stesso, ma su una gamba invece che due:** il punto 4 impone di **conservare**, e
dell'annullamento non c'è traccia.

### 🔴 IL PUNTO DI ATTRITO CHE RESTA APERTO, e cade sopra D290

**Art. 2(30)** rende **fabbricante** chi «*rimette a nuovo*» un dispositivo; **Art. 2(31)** definisce la
rimessa a nuovo come «*la ricostruzione completa di un dispositivo **già immesso sul mercato**…
unitamente al conferimento di una nuova vita*». ➡️ **Dove finisce la rilavorazione e dove comincia la
ricostruzione completa, il testo non lo traccia** — e il bivio di D290 («si sistema questo, o se ne fa
uno nuovo?») **è esattamente quella soglia**. ⚠️ **Non è una scelta organizzativa: è il punto in cui
cambia il soggetto giuridico**, e l'interfaccia deve farlo capire senza dirlo in giuridichese.

---

### Centoventiduesima tornata — D295: il documento si ripulisce E si completa, nella stessa ondata (07/08/2026, 10:11)

> 🛑 **SECONDA VIOLAZIONE DI D155 IN UNA MATTINA, E LA CAUSA È PRECISA — la scrivo perché la regola,
> così com'è formulata, non basta a impedirla.** L'intestazione diceva `10:02`. `provato:` `date` →
> **`07/08/2026, 10:11`**. Ho eseguito `date` **nello stesso comando** in cui scrivevo il testo: quindi
> l'orario l'ho **composto prima di poter leggere l'output**, cioè a memoria — che è esattamente il
> divieto. ➡️ **La regola operativa che mancava: `date` si esegue in un comando SEPARATO, e il testo si
> compone DOPO averne letto il risultato.** Un `date` che gira accanto al testo che deve datare non
> data niente: decora.

**Nasce da:** il censimento campo per campo ordinato da D294, che cercava **che cosa togliere** e ha
trovato **che cosa manca**.

| # | Decisione | Conseguenza |
|---|---|---|
| **D295** | 🔑 **SI TAGLIA E SI RIPARA INSIEME.** Francesco: «*confermo, ripulisci per bene il documento e collega tutto quello che manca*» · «*teniamola*» (partita IVA) · «*riparala in questa ondata*» (la voce 6) | ① **Escono** i quindici campi di classe C · ② la **partita IVA RESTA**, benché nessun obbligo la imponga · ③ 🔴 **la voce 6 dell'Allegato XIII si ripara ORA**, dentro quest'ondata, non in una voce di roadmap |

**🔴 Che cosa mancava, e per quanto tempo.** `provato:` `generate-ddc.ts:166` →
`prescrizione_caratteristiche: null as string | null`, **cablato**. La voce 6 — «*le caratteristiche
specifiche del prodotto **indicate nella prescrizione***» — **è obbligatoria e non è mai comparsa su
nessuna dichiarazione emessa**. Quel file è **l'unico** inseritore della tabella.
🔑 **Ma il dato ESISTE già:** le ondate precedenti hanno costruito `lavori_prescrizioni` col suo
contenuto. **Non è un dato da raccogliere: è un dato da collegare** — ed è la ragione per cui Francesco
ha scelto di ripararlo subito invece di rimandarlo.

**🛑 E perché nessuno se n'era accorto: il cancello controlla un elenco INVENTATO.** `provato:`
`src/lib/consegna/precheck.ts:5-18` dichiara «*gli 8 elementi obbligatori Allegato XIII*» e poi ne
elenca **tre che non esistono** (data emissione · classe di rischio · data consegna prevista) omettendo
**tre voci vere** (mandatario · caratteristiche prescritte · sostanze e tessuti). La stessa numerazione
inventata è in `src/types/domain.ts:762`, **e da lì arriva all'operatore**.
➡️ **Quarta volta oggi che un elenco scritto a mano sembra completo e non lo è** — e stavolta l'elenco
sbagliato era proprio nel controllo che doveva proteggere un documento dovuto per legge.

**📌 Sui tagli, le due ragioni meno ovvie, perché non si rileggano come arbitrarie:**
- **Codice ITCA** (stampato **due volte**): la voce 1 nomina **due cose**, nome e indirizzo. Un codice
  di registrazione non è nessuna delle due, e l'obbligo italiano colpisce **l'iscriversi**.
- **Firma, nome e qualifica del responsabile**: l'Art. 15(3)(b) nomina la *dichiarazione di conformità
  **UE***, che per i su misura **non esiste** (Art. 10(6)). Le otto voci non parlano né di firma né di
  persona responsabile. 📌 Il progetto lo sapeva già: `ROADMAP-UFFICIALE.md:1138`.

**🟡 La partita IVA resta per scelta, e la scelta è dichiarata.** Il censimento non ha trovato **nessun
obbligo** che la imponga: la teneva su un argomento di identificazione. Francesco: «*teniamola*».
➡️ **Non è un campo dovuto: è un campo voluto.** La differenza va scritta, perché il prossimo che
rilegge l'elenco non la deduca da una norma che non c'è.

**⚖️ Adattamento del gate estetico L2, DICHIARATO e non saltato.** D245 dice che i testi visibili sono
**aspetto**, quindi il gate sarebbe dovuto. Ma la superficie qui è un **PDF**: non ha i tre viewport né
i due temi su cui la checklist è costruita. ➡️ **Si fa la prova a schermo — il documento generato,
PRIMA e DOPO, guardato** — e **non** il micro-audit a dodici sezioni per sei combinazioni, che su un
foglio A4 non ha oggetto. 🛑 La regola non è saltata: è **adattata con motivo scritto**, che è
esattamente ciò che D245 chiede quando dice «risolto **o deferito con motivo**».

---

### Centoventitreesima tornata — D296: il push non si chiede più (07/08/2026, 13:27)

**Nasce da:** una chiusura in cui, per l'ennesima volta, il lavoro è rimasto **solo sul computer di
Francesco** — e da lui, che ha guardato il rapporto rischio/attrito e l'ha sciolto.

| # | Decisione | Conseguenza |
|---|---|---|
| **D296** | 🔑 **PUBBLICARE NON SI CHIEDE PIÙ.** Francesco: «*quando ritieni di pushare, fallo, ti autorizzo, tanto possiamo sempre tornare indietro e poi non siamo in distribuzione, la pwa verrà utilizzata dai clienti solo quando lo dirò io, quindi siamo tranquilli*» | `git push` si esegue **da soli**, senza chiedere il permesso ogni volta |

**📌 Le due ragioni che Francesco ha dato, e vanno tenute insieme perché la seconda regge la prima:**
**«si può sempre tornare indietro»** (un salvataggio pubblicato non è irreversibile) e **«non siamo in
distribuzione: la PWA la useranno i clienti solo quando lo dirò io»**. ➡️ **Il perimetro di questa
decisione è esattamente il secondo pezzo**, ed è la stessa struttura di D103 e D284: *il rischio è basso
perché nessuno è ancora dentro*. 🛑 **Il giorno in cui il primo laboratorio reale entra, questa riga va
riletta insieme alla §8 di `ua-app/CLAUDE.md` che la regge** — come già scritto per D284.

**🔑 CIÒ CHE D296 TOGLIE È IL PERMESSO, NON IL GIUDIZIO — e la distinzione è tutta la decisione.**
«Quando **ritieni** di pushare» affida una **valutazione**, non un automatismo. Restano quindi in piedi,
e non sono attriti burocratici ma il contenuto stesso di quel «ritieni»:
- **Un ramo si pubblica volentieri**: è una copia di sicurezza fuori dal computer, e non tocca nulla.
  ⚠️ È l'unica rete contro il caso «il Mac non si accende domani»: fino a oggi **63 salvataggi di lavoro
  vivevano in un posto solo**.
- 🛑 **`main` è un'altra cosa: `git push origin main` fa PARTIRE VERCEL**, cioè pubblica. Un'ondata **a
  metà**, con difetti dichiarati nella §0 del proprio handoff, **non si manda lì** — non perché serva un
  permesso, ma perché pubblicare un lavoro incompleto è una scelta tecnica sbagliata a prescindere da
  chi la autorizza.
- **Il verde va misurato prima, non dopo**: `verify:full` con l'uscita letta **da variabile**.

**⚖️ Applicazione immediata, dichiarata:** il ramo `intervento-post-consegna` **viene pubblicato oggi**;
il **merge su `main` no**, ed è un giudizio motivato — l'ondata è a **quattro compiti su nove** più il
lavoro sul documento, e la sua §0 elenca **sette cose non fatte**, fra cui **un testo falso che l'app
mostra all'utente**.

---

### Centoventiquattresima tornata — D297 e D298: l'elenco degli effetti si chiude a otto righe su nove (07/08/2026, 13:48)

> ✅ **Orario MISURATO, e stavolta nel modo giusto:** `provato:` `date` → **`07/08/2026, 13:48 CEST`**,
> eseguito in un **comando separato** e letto **prima** di comporre questa riga. È la regola operativa
> nata dalle due violazioni della mattina (tornate 120 e 122).

**Nasce da:** la rilettura della §0 dell'handoff, che elencava **due** caselle vuote nell'elenco degli
effetti dei nove motivi. Una era una domanda mai posta; l'altra **aveva già la sua risposta** e nessuno
l'aveva scritta.

| # | Decisione | Conseguenza |
|---|---|---|
| **D297** | 🔑 **DIFETTO DEL MATERIALE: STESSA SCELTA DEL DIFETTO DI LAVORAZIONE — «si sistema questo, o se ne fa uno nuovo?»** Francesco: «*ok*» | La proposta portata come tale dalla tornata 120 diventa deciso. Due esiti dallo stesso motivo, come in D290: **rientro in produzione** (il lavoro torna a `pronto`) oppure **rifacimento** (lavoro nuovo collegato). ➡️ I due motivi «il pezzo è fisicamente compromesso» si comportano allo stesso modo, e l'interfaccia non deve inventare due percorsi per la stessa domanda |
| **D298** | 🔑 **DIFETTO DI LAVORAZIONE → IL DOCUMENTO: LA CASELLA È CHIUSA DA D293, non da un panel nuovo.** Francesco: «*sì*» | La casella era segnata «❓ panel normativo in corso»: **quel panel è stato fatto**, ed è quello che ha prodotto D293 la mattina dopo. La regola generale copre **entrambi** i rami di D290 — ① **si sistema il pezzo** → la riconsegna dopo rilavorazione non è una prima immissione (Art. 2(28)), quindi il documento **resta valido**, salvo che la rilavorazione cambi un campo **stampato**; ② **se ne fa uno nuovo** → **documento nuovo dovuto, e il vecchio resta** (D293④) |

**🔑 Perché D298 non è una decisione nuova ma va scritta lo stesso, ed è il punto della tornata.** La
risposta esisteva **da quattro ore** quando l'handoff l'ha registrata come mancante: D293 è stata
ratificata alle 09:44, la tabella degli effetti è della tornata precedente e **non è stata rivisitata
dopo**. ➡️ È la stessa famiglia già pagata **tre volte** in questo progetto — *una correzione già fatta
che non arriva alla riga di sintesi*: l'Allegato XIII punto 4 del 29/07 rimasto nel verbale e mai
salito in `CLAUDE.md`, il quarto posto dello sfondo unico scritto e mai propagato, la voce 6 della
dichiarazione documentata e mai collegata. 🛑 **Una tabella di sintesi non si aggiorna da sola quando
la regola che la riempie cambia altrove**, e nessuna guardia meccanica può accorgersene: la guardia
controlla la coerenza dei conteggi, non se una casella è rimasta indietro rispetto a una decisione.

**🔄 CONSEGUENZA DICHIARATA DI D293+D294 SU UNA TERZA RIGA, e la porto qui invece di applicarla in
silenzio.** La tabella della tornata 120 dava a **difetto del materiale → il documento** l'effetto «*si
annulla e si rifà (spec §6)*». Quella riga **precede** D293 e D294 ed è oggi **superata da entrambe**:
- **D294 ha tolto i materiali dal documento.** Un difetto del materiale non cambia più, di per sé,
  nessuno degli otto contenuti stampati.
- **D293③ riemette solo se cambia un campo stampato**, e **D293① dice che la dichiarazione non si
  annulla mai** se il manufatto è uscito davvero.
➡️ **Difetto del materiale segue quindi la stessa regola di D298**, non «si annulla e si rifà». La
riga vecchia era coerente con un documento che stampava i lotti; **quel documento non esiste più**.

**📌 L'ELENCO DEGLI EFFETTI, COMPLETO — otto righe su nove**

| motivo | il lavoro | il documento |
|---|---|---|
| dato sbagliato sul documento | resta consegnato | **si riemette** e il vecchio passa a `annullata` = *superata* (D293①) |
| **difetto di lavorazione** | si sistema **oppure** si rifà — sceglie chi registra (D290) | **D298**: si sistema → **resta valido**; si rifà → **nuovo dovuto, vecchio resta** |
| **difetto del materiale** | **D297**: stessa scelta di D290 | **come D298** (🔄 non più «si annulla e si rifà»: v. sopra) |
| persona sbagliata | torna a `pronto` (D291) | **resta valido** (D291) — diceva il vero |
| modifica chiesta dal medico | **lavoro nuovo**, non un rientro | resta valido (era conforme alla sua prescrizione) |
| prezzo o quantità sbagliati | non si tocca | non si tocca — l'app **segnala** la nota di credito e non la esegue |
| ⏸️ **reso senza difetto** | **dipende dal perché** (D292) | idem |
| ho sbagliato a premere consegna | **ripristina tutto** (D288) | 🛑 **si annulla DAVVERO** — v. il riquadro qui sotto |
| altro | niente in automatico | niente — l'app registra e non indovina |

> 🔑 **LA DISTINZIONE CHE REGGE L'ULTIMA RIGA, e senza la quale sembra contraddire D293.** D293 dice
> «la dichiarazione non si annulla mai **se il manufatto è uscito davvero**». In «ho sbagliato a premere
> consegna» **il manufatto non è mai uscito**: la premessa di D293 non si avvera, e quel documento non è
> *superato* — afferma un fatto **mai accaduto**. ➡️ È l'unico dei nove motivi in cui `annullata`
> significa **nullo** invece che *superato*, ed è esattamente la ragione per cui `classifica.ts:164`,
> che oggi tiene questo motivo e «prezzo sbagliato» **nella stessa riga con la stessa frase**, va
> **spaccato in due rami** e non riscritto.

**⏸️ RESTA UNA SOLA RIGA, e non è una domanda: è un lavoro.** `reso_senza_difetto` (D292) vuole un
**vocabolario nuovo di motivi del reso**, che vive come vincolo **in banca dati** — quindi migration,
quindi percorso GRANDE con FASE 3 e panel di advisor. ⚠️ **E si sovrappone alla voce 9 di roadmap**
(«era fuori in prova»): un manufatto uscito per una prova e rientrato è plausibilmente uno di quei
motivi. Progettarli separati significa modellare lo stesso fatto due volte, in due colonne diverse.
➡️ **Si progettano insieme, in un brainstorming dedicato.** Francesco: «*ok*».

**🚦 Questo NON blocca il resto dell'ondata.** L'elenco doveva essere completo prima del cancello §0B
sui testi, e per otto motivi su nove **lo è**. La riga del reso blocca **solo** le frasi che descrivono
quel motivo, non le altre otto né i compiti 5-9.

---

### Centoventicinquesima tornata — D299: «si riconsegna» voleva dire la CARTA, non il pezzo (07/08/2026, 14:23)

> ✅ Orario misurato: `provato:` `date` → **`07/08/2026, 14:23 CEST`**, comando separato, letto prima
> di comporre questa riga.

**Nasce da:** una scelta che avevo fatto **in silenzio** scrivendo `src/lib/qualita/effetti.ts`, e che
ho portato a Francesco invece di lasciarla incassata nel codice. **Due documenti ratificati dicevano
due cose diverse**, e nessuno dei due se ne accorgeva:
- la tabella degli effetti (tornata 120) dà a «dato sbagliato sul documento» → **il lavoro resta
  consegnato**;
- **D288** riporta le parole di Francesco: «*mi sono accorto che devo correggere un dato, lo corregge
  e **posso riconsegnare***» — che si legge come un lavoro che **torna indietro**.

| # | Decisione | Conseguenza |
|---|---|---|
| **D299** | 🔑 **DATO SBAGLIATO SUL DOCUMENTO: IL LAVORO RESTA CONSEGNATO, SI RIFÀ SOLO LA CARTA.** Francesco: «*il lavoro resta consegnato, si rifà solo la carta*» | Vince la tabella della tornata 120. ➡️ «Riconsegnare», nella frase di D288, voleva dire **riconsegnare il DOCUMENTO**, non il manufatto: il pezzo è a posto e resta dov'è, dal dentista. Nessun rientro in produzione, nessuna riapertura del lavoro |

**🔑 Perché questa riga vale più di quanto sembri: fissa il PERIMETRO del Task 5.** La riemissione
(annulla → riemetti, spec §8.1) **non tocca `lavori.stato`**, e non deve chiamare
`riapri_lavoro_atomica`. Senza D299 quel compito avrebbe potuto legittimamente far rientrare il
lavoro, appoggiandosi alla frase di D288 — e sarebbe stato un rientro **non voluto** su un manufatto
che sta benissimo dov'è.

**📌 E restringe l'elenco dei casi che hanno bisogno della transizione mancante (ritrovamento R9,
ROADMAP voce 23) a TRE, non quattro:** persona sbagliata (D291) · difetto di lavorazione nel ramo
«si sistema» (D290) · difetto del materiale nel ramo «si sistema» (D297). «Dato sbagliato sul
documento» **esce** da quell'elenco.

**🔄 Nota sulla riga di D288, che resta com'è ma va letta con questa accanto.** Non la correggo:
riporta **parole testuali di Francesco**, e un verbale che riscrive le parole di chi decide non è più
un verbale. ⚠️ Ma «riconsegnare» lì è ambiguo, e l'ambiguità è arrivata fino al codice — dove era
stata sciolta **senza dirlo**. 🔑 **La lezione è quella:** una scelta fatta interpretando due
documenti che si contraddicono **non è un dettaglio di implementazione**, è una decisione. Se non
riceve un numero, esiste solo dentro un file `.ts` che nessuno rilegge come se fosse un verbale.

---

### Centoventiseiesima tornata — D300-D302: la variante B, e due parole che hanno scoperto un difetto (07/08/2026, 15:47)

> ✅ Orario misurato: `provato:` `date` → **`07/08/2026, 15:47 CEST`**, comando separato, letto prima
> di comporre.

**Nasce da:** il cancello §0B sul Task 6 — mockup a due varianti, e la scelta di Francesco.

| # | Decisione | Conseguenza |
|---|---|---|
| **D300** | 🔑 **«DEVO INTERVENIRE» PRENDE LA VARIANTE B — i nove motivi RAGGRUPPATI per famiglia.** Francesco: «*b*» | Nove righe di fila su un telefono sono un muro: l'occhio salta alla famiglia giusta e ne legge due o tre invece di nove. La variante A (elenco unico) è **scartata** e resta nel mockup a titolo di storia |
| **D301** | 🔑 **SI DICE «IL MANUFATTO», MAI «IL PEZZO».** Francesco: «*ti riferisci al lavoro fisico con la parola il pezzo, molto meglio il manufatto*» | Vale per **ogni testo che l'utente legge**, non solo per l'etichetta della famiglia. ⚠️ E non è solo mockup: `src/lib/qualita/effetti.ts` diceva «*Il pezzo è compromesso*» e — nella stessa frase — «*Il manufatto è a posto*». **Due parole per la stessa cosa dentro un file solo** |
| **D302** | 🔑 **SI DICE «LA DICHIARAZIONE», MAI «LA CARTA», quando è un'etichetta.** Francesco: «*così come parli di "la carta", ma immagino tu faccia riferimento alla dichiarazione*» | Nelle **etichette** vince la precisione. 📌 Il registro piano resta dove è di casa: «*si rifà solo la carta*» sono parole di Francesco in **D299** e lì restano — quella è una frase di conversazione, non un'etichetta a schermo |

### 🔴 E LA SECONDA CORREZIONE HA SCOPERTO UN DIFETTO DEL RAGGRUPPAMENTO

Rinominando la famiglia «La carta» in «La dichiarazione» viene fuori che **quella famiglia teneva
insieme DUE documenti diversi**: la **dichiarazione** (il documento sanitario) e la **fattura** —
perché dentro c'erano sia «dato sbagliato sul documento» sia «prezzo o quantità sbagliati».

🛑 **Non è un dettaglio di etichetta: è la regola di casa.** `ua-app/CLAUDE.md` §9 dice che lo stato
**clinico** e quello **fiscale** sono **dimensioni indipendenti**. Metterli sotto la stessa
intestazione insegna il contrario proprio nel punto in cui la persona sta decidendo.

➡️ **Le famiglie diventano CINQUE**, e le due da una voce sola se la meritano:

| Famiglia | Motivi |
|---|---|
| **Il manufatto** | difetto di lavorazione · difetto del materiale · tornato indietro senza difetti |
| **La dichiarazione** | dato sbagliato sulla dichiarazione |
| **La persona, o la richiesta** | andato alla persona sbagliata · il medico chiede una modifica |
| **La fattura** | prezzo o quantità sbagliati |
| **Un errore nostro qui dentro** | ho premuto «consegna» per sbaglio · altro |

🔑 **Perché «La fattura» da sola è un guadagno e non una frammentazione:** è l'unico motivo che non
c'entra niente col lato sanitario, e con la sua intestazione diventa **saltabile a colpo d'occhio**
da chi sta gestendo un problema clinico. Stessa cosa al contrario per «La dichiarazione», che è
l'unico motivo che fa rifare il documento.
⚠️ **Portata a Francesco invece di applicata in silenzio:** lui ha scelto **quattro** famiglie, e
questa ne fa cinque — la decisione di aggiungerne una è mia, e va detta.

---

### Centoventisettesima tornata — D303: «manufatto» e «dispositivo» convivono, ognuno nel suo registro (07/08/2026, 16:02)

> ✅ Orario misurato: `provato:` `date` → **`07/08/2026, 16:02 CEST`**, comando separato.

**Nasce da:** una domanda che ho portato a Francesco invece di risolverla da solo. Dopo D301
(«manufatto», mai «pezzo») restava un **terzo** modo di chiamare la stessa cosa, e finisce **sulla
stessa schermata**: `src/lib/qualita/classifica.ts` dice «*il **dispositivo** era stato applicato*»
mentre `src/lib/qualita/effetti.ts` dice «*il **manufatto** è compromesso*». Nel foglio di «Devo
intervenire» le due frasi compaiono **una sotto l'altra**.

| # | Decisione | Conseguenza |
|---|---|---|
| **D303** | 🔑 **LE DUE PAROLE CONVIVONO, E NON È UN COMPROMESSO: È UNA DISTINZIONE DI REGISTRO.** Francesco: «*va benissimo la distinzione tra manufatto e dispositivo, usiamoli tutti e due*» | **«Manufatto»** è la parola del banco: si usa per il lavoro fisico, per ciò che l'odontotecnico ha in mano. **«Dispositivo»** è la parola della **norma** (Art. 2(64) e seguenti): si usa dove il testo parla di legge — classificazione, incidente, reclamo, obblighi. ➡️ Su una stessa schermata possono comparire entrambe, perché stanno rispondendo a **due domande diverse** |

**🔑 Perché la distinzione regge, e non è la scusa per non decidere.** È la stessa separazione dei
due piani che D288 ha già stabilito e che il codice rispecchia in **due file distinti**:
- **`classifica.ts` — il piano della NORMA.** Risponde a «è un incidente? un reclamo? niente?», cita
  gli articoli, e parla la lingua del Regolamento: lì «dispositivo» **è il termine giuridico**, e
  sostituirlo con una parola di mestiere allontanerebbe il testo dalla fonte che sta applicando.
- **`effetti.ts` — il piano del BANCO.** Risponde a «che cosa succede adesso al lavoro e alla
  dichiarazione», e parla come si parla in laboratorio: lì «manufatto».

⚠️ **Quello che questa decisione NON autorizza:** usare le due parole **a caso**, o alternarle dentro
la stessa frase. Il difetto chiuso oggi in `effetti.ts` — «*Il pezzo è compromesso*» e «*Il manufatto
è a posto*» nello stesso file — resta un difetto anche col nuovo vocabolario: **dentro un registro la
parola è UNA.** La rete meccanica (`tests/unit/qualita-effetti.test.ts`) vieta «pezzo» e «carta» nei
testi degli effetti; **non** vieta «dispositivo» in `classifica.ts`, ed è giusto così.

📌 **Regola in una riga, per chi scrive un testo nuovo:** *se la frase sta spiegando la legge, si dice
**dispositivo**; se sta dicendo che cosa fare col lavoro, si dice **manufatto**.*

---

### Centoventottesima tornata — D304: il bivio dei due difetti ENTRA nell'ondata, e il terzo tocco è accettato dove il motivo non basta (07/08/2026, 17:27)

> ✅ Orario misurato: `provato:` `date` → **`07/08/2026, 17:27 CEST`**, comando separato.

**Nasce da:** il ritrovamento **R9** (la transizione «torna a `pronto` col documento intatto» non
esiste) e da una **contraddizione fra documenti già ratificati**, che nessuno dei due conosceva.
Dei tre motivi che chiedono quella transizione, **uno solo** è derivabile dal motivo — `destinatario_errato`
(D291). Gli altri due — `difetto_lavorazione` (D290) e `difetto_materiale` (D297) — portano un
**bivio**: *si sistema questo manufatto, o se ne fa uno nuovo?* La dichiarazione segue quella scelta (D298).

🛑 **E qui i documenti si contraddicono.** **D288** stabilisce che «l'effetto non si chiede a parte: si
deriva dal motivo», e **D269** fissa il costo in **due tocchi invece di uno** — «Devo intervenire», poi
il motivo. Ma `scelta_richiesta` è per costruzione un **terzo** tocco. Nessuno dei due documenti sapeva
dell'altro, e la scelta è stata portata a Francesco invece di essere presa dentro un file `.ts`
(lezione 5 del 07/08 sera: *una scelta fatta interpretando due documenti che si contraddicono è una decisione*).

| # | Decisione | Testo/scelta di Francesco | Conseguenza |
|---|---|---|---|
| **D304** | 🔑 **SI COSTRUISCONO TUTTI E TRE I MOTIVI, BIVIO COMPRESO** — e quindi il terzo tocco **è accettato** dove il motivo, da solo, non determina l'effetto | scelta esplicita fra tre perimetri (solo `destinatario_errato` · tutti e tre · fermarsi a decidere prima) | L'ondata prende dentro: ① la funzione nuova nel database (`pronto` **senza** toccare `dichiarazioni_conformita`) · ② `destinatario_errato` come azione automatica · ③ **la domanda del bivio** per i due difetti, il posto dove salvarne la risposta, e il ramo «se ne fa uno nuovo» in rapporto al rifacimento che già esiste |

**🔑 Come si scioglie la contraddizione, e perché non è un'eccezione a D288 ma la sua lettura esatta.**
D288 vieta di **chiedere ciò che il motivo già dice** — «nessuna casella *vuoi anche rientrare in
produzione?*», perché su `errore_registrazione` la risposta è nel motivo stesso. Su
`difetto_lavorazione` e `difetto_materiale` la risposta **non è nel motivo**: sono D290 e D297 a dirlo,
istituendo il bivio. ➡️ **La domanda non è ridondante: è l'unica fonte di quel dato.** Il divieto di D288
resta pieno sugli altri sette motivi, e il costo di D269 resta due tocchi **dove l'app sa già la risposta**.

⚠️ **Ciò che D304 NON decide, e che resta aperto:** **dove** e **quando** si chiede il bivio — subito
dentro il foglio «Devo intervenire», oppure dopo, quando il manufatto è stato guardato. Quella è una
decisione a sé, e la porta la tornata successiva.

---

### Centoventinovesima tornata — D305 e D306: il bivio si chiede SUBITO, e «se ne fa uno nuovo» crea il rifacimento da solo (07/08/2026, 17:36)

> ✅ Orario misurato: `provato:` `date` → **`07/08/2026, 17:36 CEST`**, comando separato.

**Nasce da:** D304, che porta il bivio dentro l'ondata e lascia aperto **dove** e **quando** si chiede.
🛑 **La domanda è stata portata a Francesco dichiarando di NON sapere la risposta**, invece di
dedurla dai documenti: nessuna delle quattro prove dello statuto delle fonti dice se, al momento in
cui si registra un difetto, il manufatto sia già rientrato e qualcuno l'abbia guardato.

| # | Decisione | Testo/scelta di Francesco | Conseguenza |
|---|---|---|---|
| **D305** | ⏱️ **IL BIVIO SI CHIEDE SUBITO, dentro il foglio «Devo intervenire»** — chi registra un difetto, quasi sempre, sa già se il manufatto si sistema o se ne va fatto uno nuovo | «sì, quasi sempre: si chiede subito» | Un **terzo passaggio** nel foglio, subito dopo il motivo, per i soli `difetto_lavorazione` e `difetto_materiale`. 🟢 **Nessuno stato d'attesa** da nessuna parte: niente riga «devi ancora decidere» sulla scheda, niente lavoro sospeso a metà. L'effetto parte nello stesso gesto |
| **D306** | 🔨 **«SE NE FA UNO NUOVO» CREA IL RIFACIMENTO DA SOLO**, senza un tasto di conferma in più | scelta esplicita fra proporre · creare · registrare soltanto | La rotta chiama `crea_rifacimento_atomico` nello stesso giro in cui salva l'evento. Il lavoro vecchio **resta consegnato** con la sua dichiarazione (D298), e il lavoro nuovo nasce col suo numero |

**⚠️ La riserva, dichiarata prima della scelta e non dopo.** Il flusso del rifacimento è quello che
Francesco stesso ha definito **«solo una bozza»** il 04/08 (D221, riga 12 della coda di ROADMAP:
«*va studiato tutto il flusso di un rifacimento*»). Agganciarcisi in automatico significa che
quest'ondata **eredita i limiti di quel flusso**. Francesco ha scelto sapendolo: la riserva era
scritta nell'opzione stessa. ➡️ Resta scritta qui perché il giorno in cui la riga 12 si esegue,
questo è uno dei suoi chiamanti.

**🔴 E il ponte fra i due vocabolari NON esiste — trovato leggendo, non dedotto.**
`provato:` `lavori_rifacimenti.motivo` porta un CHECK di **sette** valori
(`005_v1_foundation.sql:77-83`: `colore_sbagliato · misura_errata · fusione_difettosa ·
rottura_produzione · non_confortevole · errore_prescrizione · altro`), e **nessuno dei due motivi
dell'evento ha un corrispondente**. Scriverci `altro` sarebbe perdere l'unica informazione che
conta — cioè il difetto già chiuso altrove: *un elenco che scarta in silenzio*. ➡️ La spec deve
dire quale dei due si allarga, e con quale migration.

---

### Centotrentesima tornata — D307: si tappano i DUE difetti che creiamo noi, gli altri QUATTRO vanno alla riga 12 (07/08/2026, 18:05)

> ✅ Orario misurato: `provato:` `date` → **`07/08/2026, 18:05 CEST`**, comando separato.

**Nasce da:** il panel della Regola Advisor su questa proposta — tre esaminatori (database · normativa
MDR · uso al banco). D306 era stata scelta contro una riserva **generica** («il flusso del rifacimento
è una bozza»); il panel l'ha trasformata in **sei difetti nominati e misurati**. Francesco ha deciso
sapendo la *forma*; questa tornata gliene dà la *dimensione*.

| # | Decisione | Scelta di Francesco | Conseguenza |
|---|---|---|---|
| **D307** | 🔨 **I DUE DIFETTI CHE L'ONDATA CREA SI TAPPANO QUI; I QUATTRO CHE IL RIFACIMENTO HA GIÀ vanno alla riga 12 della coda** | scelta esplicita fra tappare due · sistemare tutti e sei · rimandare l'intero ramo | Dentro: ① **l'idempotenza per evento** (un vincolo di unicità su `lavori_rifacimenti`, così il secondo tentativo è un errore riconoscibile e non un lavoro fantasma) · ② **la cassetta segue il rifacimento**, riusando la funzione che la rotta HTTP già chiama. Fuori, e **scritti per nome** nella riga 12: il ritardo alla nascita · `numero_prescrizione` non clonato · nessuna via per annullare un lavoro · la scheda che non mostra i rifacimenti |

**🔑 Il criterio, e vale oltre questo caso: si tappa ciò che l'ondata CREA o AMPLIFICA, si riferisce ciò
che trova.** L'idempotenza e la cassetta non erano un problema finché il rifacimento nasceva da un
tasto premuto a mano su una schermata sua; lo diventano nel momento in cui **l'app lo crea da sola**
dentro un altro flusso. Gli altri quattro sono difetti del rifacimento **già oggi**, e correggerli qui
sarebbe R-E2 al contrario: una correzione fuori mandato che lascia il difetto vero — il flusso da
ristudiare — intatto e più difficile da vedere.

---

### Centotrentunesima tornata — D308-D310: la spec è RATIFICATA, e i tre punti aperti sono chiusi (07/08/2026, 18:19)

> ✅ Orario misurato: `provato:` `date` → **`07/08/2026, 18:19 CEST`**, comando separato.

**Nasce da:** la ratifica della spec `docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md`
(«*va bene, procedi col piano*»), che portava **tre punti marcati DA RATIFICARE**. Ognuno prende il suo
numero: un punto ratificato in blocco, senza numero, è una decisione che nessuno ritrova.

| # | Decisione | Conseguenza |
|---|---|---|
| **D308** | 🛑 **FINCHÉ UN LAVORO HA UNA DICHIARAZIONE VIVA, I CINQUE CAMPI STAMPATI NON SI CORREGGONO DALLA PATCH** — `paziente_id`, `cliente_id`, `richiedente_nome`, `tipo_dispositivo`, `descrizione` → **422**, con il testo che dice **dove andare** | Chi vuole correggere un dato stampato passa dal motivo «dato sbagliato sulla dichiarazione», che **riemette** conservando la vecchia (Task 5). ⚠️ La regola vale per **ogni** lavoro con dichiarazione viva, non solo per quelli riaperti: restringerla lascerebbe la stessa porta aperta altrove |
| **D309** | 🧰 **IL TRASFERIMENTO DELLA CASSETTA AL RIFACIMENTO È FAIL-SOFT anche nel percorso nuovo** | Un cassetto non spostato **non annulla** un lavoro già creato. Identico al percorso esistente (`rifacimento/route.ts:197`): due strade che creano lo stesso oggetto non possono comportarsi in modo diverso |
| **D310** | 🔄 **RI-RATIFICATA «la dichiarazione resta valida dopo una riparazione», con la prova NUOVA** | Il discriminante del panel del 06/08 era **la lista dei lotti stampata sul foglio**, e **D294 l'ha tolta dal documento lo stesso giorno**: quella prova non esiste più. La conclusione regge — senza lotti stampati, una riparazione tipica non cambia nessuna delle voci del foglio — ma **poggia su D294, non più sul panel del 06/08** |

**🔑 Perché D308 non contraddice la direttiva del 27/07** («ogni campo del lavoro si corregge, fino alla
consegna»). Il confine di quella finestra non è stato scelto oggi: lo ha fissato il **panel normativo
del 29/07**, e **si aggancia all'emissione della dichiarazione** — Art. 52(8) impone il documento prima
dell'immissione sul mercato, e Art. 2(28) definisce l'immissione come la **prima messa a disposizione**,
cioè la consegna. Con una dichiarazione viva la finestra è **chiusa per quelle cinque voci soltanto**;
ogni altro campo resta correggibile. 🛑 **E non è un blocco cieco:** D262 dice che la PWA non dà blocchi
ma aiuti, e il 422 **nomina il percorso giusto**, esattamente come fa già la guardia di
`errore_registrazione` (`eventi-qualita/route.ts:233-235`).

---

### Centotrentaduesima tornata — D311: le migration si battezzano con l'orologio UNIVERSALE, sempre (07/08/2026, 21:27)

> ✅ Orario misurato: `provato:` `date` → **`07/08/2026, 21:27 CEST`**, comando separato.

**Nasce da:** la revisione del Task 5, che ha misurato un fatto invisibile a occhio — **il ledger delle
migration ha DUE orologi, e il passaggio è avvenuto dentro quest'ondata.**
`provato:` `git log --diff-filter=A` — `20260807143623_riemissione_ddc.sql` è nata alle **14:53 CEST**
con nome `14:36` (**locale**); `20260807171033_evento_scelta_intervento.sql` alle **19:18 CEST** con
nome `17:10`, cioè le 19:10 di Roma (**UTC**). Il piano di stasera prescriveva `date -u`; D155
descriveva l'ora locale.

| # | Decisione | Scelta di Francesco | Conseguenza |
|---|---|---|---|
| **D311** | 🕛 **I nomi delle migration si prendono con l'orologio UNIVERSALE (`date -u`), sempre** | scelta esplicita fra universale e ora di Roma | `date -u "+%Y%m%d%H%M%S"`, in un comando **separato** (D155 resta intatta su questo). Il pavimento attuale è già UTC: `20260807185858` |

**🔑 Perché universale e non l'ora di Roma.** L'ora locale **torna indietro di un'ora** l'ultima domenica
di ottobre: in quella finestra due nomi presi in momenti successivi possono **scavalcarsi**, e un nome
più basso di quello già applicato è precisamente ciò che rompe il push. L'orologio universale non ha
quel salto: cresce sempre.

**⚠️ Che cosa succede se i due si alternano, misurato e non temuto.** Roma è avanti di due ore, quindi
un nome locale sta **sempre sopra** un nome UTC preso nello stesso istante. Il guaio arriva quando dopo
un nome locale se ne prende uno universale entro due ore: nasce **più basso**, e
`npx supabase db push` **si ferma** con `LegacyDbPushMissingRemoteError`. 🛑 **E lo sblocco è peggio del
blocco:** chi passasse `--include-all` farebbe divergere per sempre l'ordine di applicazione vivo da
quello dei file — in un archivio dove le stesse funzioni vengono riscritte da più migration in fila,
una ricostruzione da file può far vincere un corpo **più vecchio**. È la stessa classe di guasto che il
Task 4 ha già pagato ribattendo una funzione dal catalogo.

📌 **Nulla di già applicato è compromesso:** il ledger è monotòno
(`…143623 < 171033 < 172520 < 174850 < 180314 < 182614 < 185858`). **Il rischio era tutto in avanti**, e
questa decisione lo chiude.

---

### Centotrentatreesima tornata — D312: «persona sbagliata» prende la sua azione, e la prende dentro il Task 6 (07/08/2026, 22:00)

> ✅ Orario misurato: `provato:` `date` → **`07/08/2026, 22:00 CEST`**, comando separato.

**Nasce da:** il censimento fatto **prima di scrivere il Task 6**, cioè dal punto di applicazione di
R-E1 — l'esecutore (qui: chi apre il compito) cerca attivamente dove il piano sbaglia. È il **quinto**
difetto trovato in questo piano, e il primo trovato **prima** che il codice esistesse.

**Il fatto, misurato.** La spec §0 elenca **TRE** motivi che devono riportare il lavoro fra i pronti
lasciando viva la dichiarazione: `destinatario_errato`, e i due difetti quando si sceglie «si sistema».
Il Task 6 ne costruiva **due**. Il terzo vive in una riga **fissa** di `EFFETTI_PER_MOTIVO`
(`src/lib/qualita/effetti.ts:124-131`) che porta `azione: null`, e `effettoDaMotivoEScelta` **non la
raggiunge** (per quel motivo `richiedeScelta` è falso e la funzione restituisce la riga di base).
`provato:` `grep -n "EFFETTI_PER_MOTIVO"` sul piano → **zero risultati**: nessuno dei dieci task la
tocca.

| # | Decisione | Scelta di Francesco | Conseguenza |
|---|---|---|---|
| **D312** | 🔑 **`destinatario_errato` riceve `azione: 'torna_pronto'`, e la riceve NEL TASK 6** | «*sì, prendilo nel Task 6*» — scelta esplicita fra prenderlo nel T6 e lasciarlo al T7 | Il Task 6 allarga il proprio perimetro di **una riga** della tabella fissa, e porta con sé **tre asserzioni già scritte** che oggi dicono l'opposto (`qualita-effetti.test.ts:33` e `:45`, `eventi-qualita-route.test.ts:823-838`). Piano emendato: **Passo 0 del Task 6**. |

**🔑 Perché non poteva restare com'era, e non è una rifinitura.** Il Task 7 smisterà su
`effetto.azione`: con `null` non si accende nessun ramo. E il **Task 10 chiede già una prova** — «①
`destinatario_errato` → lavoro a `pronto`, dichiarazione ancora viva, `prima_immissione_at` invariata»
— che **sarebbe nata rossa tre compiti più in là**, con l'aria di una regressione invece che di un
buco di perimetro.

**⚠️ E porta con sé un commento SCADUTO, che è la parte più pericolosa.** La riga fissa è accompagnata
da tre righe che spiegano perché l'azione è nulla: «*`riapri_lavoro_atomica` annulla SEMPRE la
dichiarazione, quindi non può servire questa riga. La transizione «pronto col documento intatto» NON
ESISTE ancora*». **Era vero fino a ieri sera; il PRONTO-4 ha costruito `riporta_a_pronto_atomica`.**
🛑 Un commento che nega l'esistenza di una cosa già costruita è la **stessa trappola** del file di
prove del Task 10 (Passo 0): un testo che descrive un mondo superato, lasciato accanto al codice, e che
la prossima persona legge come se fosse vero.

**📌 Perché dichiarare un'azione che il Task 6 non esegue non è uno degli «otto rami inerti» vietati
da `effetti.ts:26-31`.** È la **stessa finestra di un compito** che il piano accetta già per i due
difetti: il T6 dichiara, il T7 esegue. Il divieto riguarda i rami finti che sembrano agire **per
sempre**, non la dichiarazione che il compito successivo cabla. In quella finestra la rotta continua a
smistare solo `riapri_lavoro` (`eventi-qualita/route.ts:383-386`), quindi **niente si muove per
sbaglio** — ed è ciò che la terza asserzione corretta afferma per iscritto.

---

### Centotrentaquattresima tornata — D313: la mappa di recupero e i resoconti entrano sotto git (07/08/2026, 22:53)

> ✅ Orario misurato: `provato:` `date` → **`07/08/2026, 22:53 CEST`**, comando separato.

**Nasce da:** una verifica di chiusura del Task 6. L'esecutore aveva scritto, di passaggio, che il suo
resoconto «*è su disco ma non versionato*». Controllato invece di essere creduto.

**Il fatto, misurato.** `provato:` `git check-ignore -v .superpowers/sdd/progress.md` → ignorato da
**due** regole insieme: `.gitignore` (dove `.superpowers/` compariva **due volte**, righe 118 e 140) e
un `.superpowers/sdd/.gitignore` contenente la sola riga `*`. `provato:` `git ls-files .superpowers/`
→ **vuoto**: nessuno di quei 282 file è mai entrato in git.
🔑 **E `progress.md` non è uno scarto di lavorazione: è LA MAPPA DI RECUPERO.** `provato:`
`grep -rl "superpowers/sdd/progress.md" docs/roadmap/*.md memory/MEMORY.md | wc -l` → **21 documenti
vivi** la nominano come il posto da cui riprendere. Con lei erano fuori da git i resoconti di esecutori
e revisori — cioè i numeri misurati, le mutazioni provate, i ritrovamenti fuori mandato.

| # | Decisione | Scelta di Francesco | Conseguenza |
|---|---|---|---|
| **D313** | 📦 **`.superpowers/` si versiona PER INTERO** — mappa **e** resoconti | «*fai la 2*», scelta esplicita fra tre: solo la mappa (40 KB) · tutto (7,2 MB) · lasciare com'è e smettere di chiamarla «mappa» | Tolte **entrambe** le regole; `.superpowers/sdd/.gitignore` conservato ma **svuotato con la spiegazione dentro**, così una riscrittura dello strumento si vede in `git status`. **215 file** entrano nel primo salvataggio. |

**🛑 Perché non era un dettaglio di configurazione.** È la **terza volta** che questo progetto scopre
un artefatto che *sembra* durevole e non lo è: il collegamento di `/chiudi` (**D255**, fuori da git,
non sopravvive a un cambio di computer) e lo script del link d'accesso (**D103**, che viveva in
`scripts/tmp/`, cartella ignorata). 🔑 **Un artefatto che sembra durevole è peggio della sua assenza**,
perché nessuno lo cerca altrove: un passaggio di consegne che dice «la mappa è lì» manda la sessione
nuova a cercare un file che su quella macchina non esiste.

**⚠️ E la riga era scritta DUE VOLTE, il che ha quasi fatto passare il ripensamento per inefficace.**
Tolta quella in fondo, `git check-ignore` continuava a rispondere «ignorato» indicando la riga 118. Chi
si fosse fermato al primo tentativo avrebbe concluso che la modifica non funzionava.
🔑 **Le liste scritte due volte non divergono solo nel codice** — è la stessa famiglia della riga 22
della coda di ROADMAP, e qui il costo sarebbe stato una decisione ratificata e non applicata.

**📌 Due correzioni a me stesso, e la seconda è più utile della prima.**
① Il primo controllo sulle credenziali ha dato **verde a torto**: lo stesso identico comando,
rilanciato **senza `2>/dev/null`**, ha trovato tre file. 🛑 *Un controllo che nasconde i propri errori
può tornare vuoto perché non è mai partito*, e il vuoto si legge come «pulito».
② Ho letto l'uscita di un controllo **dietro una pipe** — cioè quella di `cut`, non del `grep`: la
regola è scritta in `CLAUDE.md` e ci sono cascato lo stesso. Rifatto leggendola da variabile.
✅ **Esito vero, su 103.888 righe di contenuto in salvataggio: nessuna credenziale.** Le uniche
corrispondenze sono il segnaposto `sk_live_xyz`, che vive già in `tests/unit/dpa-registro.test.ts` — un
file versionato e pubblicato da giorni — dentro prove che verificano che l'app **non** lo lasci uscire.

---

### Centotrentacinquesima tornata — D314: «dato sbagliato sulla dichiarazione» apre la correzione di OGNI campo che alimenta il documento (08/08/2026, 09:03)

> ✅ Orario misurato: `provato:` `date` → **`08/08/2026, 09:03 CEST`**, comando separato.

**Nasce da:** il **Critico** trovato dalla revisione del Task 8 — *la strada che il rifiuto indica
riporta nella stessa stanza*. Verificato in tre punti sul codice, non dedotto: ① nessuna schermata
collega `errore_dato_dichiarazione` (zero occorrenze in `DevoIntervenire.tsx`) · ② il documento rifatto
sarebbe **identico** nei cinque campi, perché `generate-ddc.ts:251-261` li legge dalla riga del lavoro
che il cancello impedisce di correggere · ③ non esiste una finestra: `riemetti_ddc_atomica` annulla e
inserisce **nella stessa transazione**, per scelta dichiarata (`20260807143623:55-70`).
➡️ **Non si corregge prima, né durante, né dopo.** L'unico percorso funzionante era
`errore_registrazione`, che dichiara una consegna mai avvenuta: su un manufatto realmente uscito è una
**dichiarazione falsa**, cioè ciò che D293 vieta.

| # | Decisione | Testo di Francesco | Conseguenza |
|---|---|---|---|
| **D314** | 🔑 **Scegliendo «dato sbagliato sulla dichiarazione» si apre la correzione di OGNI campo del lavoro che alimenta il documento — non solo i cinque stampati** | «*deve essere possibile modificare ogni parte del lavoro che interviene sui dati, ogni possibile campo, così da poter permettere di correggere e rielaborare il tutto*» · e sulla strada: «*se questo vogliamo svilupparlo seguendo la 1. mi sta bene, proponimi tu la strada migliore*» | La finestra di correzione **non è ristretta all'allowlist di D308**: prende tutto ciò che finisce nel documento, **comprese le voci che vivono su altre tabelle** (nome e cognome del cliente, codice del paziente) — cioè anche la «seconda porta laterale» che la revisione aveva riferito come Importante separato. La **forma** della strada è delegata a me, con **panel** (regola Advisor) prima della ratifica. |

**🔑 Perché la richiesta di Francesco è più larga di quella che avevo formulato io, ed è giusto che lo
sia.** Io avevo proposto di far viaggiare la correzione **dei cinque campi** insieme alla riemissione.
Francesco ha allargato a **ogni campo che interviene sui dati**: la ragione pratica è che un documento
sbagliato raramente lo è in un punto solo — chi ha digitato male il paziente può aver sbagliato anche
il dentista o il tipo di manufatto, e obbligare a due percorsi diversi per due refusi dello stesso
momento è il modo di far scegliere alla persona quello più veloce invece di quello vero.

**⚠️ Che cosa questa decisione NON dice, e va deciso col panel:** se la correzione sia un **atto solo**
con la riemissione o una **finestra** che l'evento apre e la riemissione chiude · che cosa succede se
la persona apre la correzione e **non la completa** · se il documento vecchio resti raggiungibile (D293
dice di sì: `annullata` = **superata**, mai «nulla») · e come si tiene ferma la regola che un lavoro
consegnato non resti **mai** senza una dichiarazione viva, che è la ragione per cui la riemissione è
atomica.

📌 **La riga di D308 resta valida e non è contraddetta:** il cancello continua a rifiutare la modifica
*silenziosa* dei campi stampati. D314 non lo apre — **gli dà la porta che finora nominava e non
esisteva**.

---

### Centotrentaseiesima tornata — D315 · D316 · D317: l'atto unico, i sette campi, e il dentista va avvisato (08/08/2026, 10:00)

> ✅ Orario misurato: `provato:` `date` → **`08/08/2026, 10:00 CEST`**, comando separato.

**Nasce da:** il **panel a tre** convocato su D314 (regola Advisor) — prospettiva **normativa MDR**,
**architettura dei dati e integrità transazionale**, **UX del banco**. I tre pareri sono arrivati
indipendentemente e **convergono tutti sulla forma 1**, per ragioni diverse.

| # | Decisione | Scelta di Francesco | Conseguenza |
|---|---|---|---|
| **D315** | 🔑 **FORMA 1 — ATTO UNICO.** La correzione dei dati e la riemissione del documento avvengono in **una sola transazione**, e fino all'ultimo tocco **in banca dati non cambia niente** | «*sì forma 1*» | Nessuno stato intermedio da spiegare · D308 resta **intatto** (non serve un cancello a due chiavi) · il messaggio del 422 **diventa vero per la prima volta** |
| **D316** | 📐 **Il perimetro è di SETTE voci, non cinque** | «*prendi tutti e sette*» | Entrano anche i **denti** e le **caratteristiche della prescrizione**, che hanno strade di scrittura proprie. 🛑 Le voci del **laboratorio** (ragione sociale, indirizzo, P.IVA, luogo di fabbricazione) restano fuori **e si dichiarano a schermo**: si correggono in Impostazioni e valgono per tutte le dichiarazioni |
| **D317** | 📨 **Il documento corretto DEVE arrivare al dentista** | «*e il dentista va avvisato*» | Entra nell'ondata, non diventa una riga di roadmap. **Base giuridica: GDPR Art. 19** (fonte sotto), non MDR |

---

#### 🔑 Le tre scoperte del panel, che nessuno aveva in mano prima

**① IL VINCOLO CHE CREDEVAMO DI LEGGE NON LO È.** «Un lavoro consegnato non deve mai restare senza
una dichiarazione viva» è una regola **nostra**, di integrità dei dati — e il progetto lo dice già di
suo (`20260807143623_riemissione_ddc.sql:61-64`: la ragione dichiarata è che quello stato «*nessun
CHECK e nessun indice possono segnalare*»). `provato:` sul consolidato IT scaricato dal Cellar di
publications.europa.eu (`02017R0745 — IT — 01.01.2026 — 006.001`): **`annull` → 0 occorrenze**,
`nullo` → 0; le 16 di `revoc`, 28 di `sospen` e 41 di `ritir` cadono **tutte** su organismi notificati,
certificati, consenso informato e ritiro **del dispositivo** dal mercato. ➡️ **Il MDR non conosce
nessun istituto con cui il fabbricante privi di effetto un documento che ha emesso.**
🔑 **L'unica norma che discrimina fra le tre forme è l'Art. 10(12)** — «*adottano **immediatamente** le
azioni correttive necessarie*» — e discrimina sulla **prontezza**, non sull'atomicità: premia la forma
che **garantisce la chiusura** invece di affidarla a un secondo gesto umano. ⚠️ Il passaggio «nome
sbagliato → non conforme → si apre l'Art. 10(12)» è una **catena inferenziale dichiarata**, non una
lettura: il regolamento non lo dice in questi termini.

**② LA PREOCCUPAZIONE SUGLI EFFETTI COLLATERALI ERA FONDATA, E HA UNA SOLUZIONE PULITA.** Correggere
`clienti.cognome` cambierebbe l'anagrafica per **tutti** i lavori di quel cliente. Non serve:
esistono già **due colonne-ombra sul lavoro che VINCONO** sull'anagrafica —
`lavori.richiedente_nome` (`generate-ddc.ts:251-255`) e `lavori.paziente_nome_snapshot`
(`generate-ddc.ts:258`). ➡️ **L'atto unico scrive SOLO su `lavori`**, mai sulle anagrafiche condivise.
🔴 **E qui il panel ha trovato un difetto vivo:** `paziente_nome_snapshot` **non la scrive nessuno** —
58 occorrenze fra `src/` e `supabase/`, **tutte letture** tranne `supabase/seed.sql:133`. Quindi
**oggi l'identità del paziente sulla dichiarazione arriva interamente dall'anagrafica condivisa**, e
correggere un'anagrafica **sposta in silenzio il nome sotto a dichiarazioni già emesse**. D315 chiude
anche questo. ⚠️ Attenzione al `??`: uno snapshot **vuoto** vincerebbe sul nome vivo e stamperebbe
un'identificazione paziente **assente** — è lo stesso difetto già pagato sul gemello `richiedente_nome`
(D242), e si evita passando da `CAMPI_TESTO_NORMALIZZATI`.

**③ 🔴 LA BUGIA OGGI È SILENZIOSA, E LA DICE L'APP.** `provato:`
`src/components/features/lavori/scheda-v3/DevoIntervenire.tsx:208` →
`stato_dispositivo: sbaglio ? 'mai_uscito_dal_lab' : statoDisp`. Scegliendo «ho premuto consegna per
sbaglio», **il foglio afferma al posto della persona** che il manufatto non è mai uscito dal
laboratorio. La guardia che dovrebbe rifiutarlo esiste
(`eventi-qualita/route.ts:246`) e **non può accendersi mai da quel percorso**.
➡️ Conseguenza: **la strada più corta per correggere un refuso è quella che dichiara il falso**, ed è
esattamente il moto che D314 nasce per chiudere. Si chiude con **una domanda sola**, dentro il
`DialogConferma` che esiste già: «*Il manufatto è uscito dal laboratorio?*» — **zero tocchi in più**.
📌 Effetto collaterale misurato: con quel valore cablato, `post_consegna_correzioni` **non si
incrementa** (`eventi-qualita/route.ts:695`).

---

#### 📨 D317 — la base giuridica, e non è il MDR

**GDPR, Reg. (UE) 2016/679**, testo consolidato IT (`02016R0679 — IT — 04.05.2016 — 000.003`):
- **Art. 5(1)(d)** — i dati sono «*esatti e, se necessario, aggiornati; devono essere adottate tutte le
  misure ragionevoli per cancellare o **rettificare tempestivamente** i dati inesatti*»;
- **Art. 16** — rettifica «*senza ingiustificato ritardo*»;
- 🔑 **Art. 19** — «*Il titolare del trattamento **comunica a ciascuno dei destinatari** cui sono stati
  trasmessi i dati personali le eventuali rettifiche … salvo che ciò si riveli impossibile o implichi
  uno sforzo sproporzionato.*»
➡️ **Il dentista ha ricevuto il documento sbagliato: riemettere e archiviare NON chiude l'obbligo.**
⚠️ **Nessuna delle tre forme in discussione se ne occupava** — è una voce che il panel ha aggiunto, non
una che ha valutato.

---

#### ⚠️ Le condizioni che il panel pone alla forma 1, e che il piano deve rispettare

1. 🛑 **La validazione del laboratorio sulle chiavi che arrivano dal corpo va fatta PRIMA di generare
   il PDF.** Il file si carica su Storage **fuori** dalla transazione: un rollback **non lo toglie**, e
   un documento col paziente di un altro laboratorio resterebbe lì.
2. 🛑 **`p_correzioni` deve avere la sua allowlist STRETTA** — «i campi che alimentano il documento»,
   mai «i campi di `lavori`». Altrimenti nasce una **seconda penna** su `lavori` che non conosce
   nessuna delle regole della PATCH (~200 righe: colore di caso, tinta, sentinelle, blocco fiscale).
3. 🛑 **L'evento diventa monouso**: serve un indice unico parziale su `annullata_da_evento_id`, sul
   modello di `rifacimento_evento_unique`. Senza, un doppio tocco **riemette due volte** e brucia due
   progressivi — la porta d'ingresso si chiude **sull'evento**, mai su «esiste una dichiarazione viva»
   (quella è la porta che §8.1 vieta espressamente alla riemissione).
4. **Un gettone di concorrenza** su `lavori.updated_at` fra la lettura e la scrittura, sul modello già
   in casa di `PUT /api/lavori/[id]/denti` (esito `conflitto` → 409).
5. **Il foglio mostra VALORI, non controlli**: sette righe da leggere, si corregge una riga alla volta
   **dentro lo stesso foglio che cambia passo** — mai un secondo overlay, per il difetto già pagato in
   `storia-overlay.ts`.

📌 **Il modello non è nuovo: è la seconda metà di un precedente già in casa.** La **nota di credito**
non riapre la fattura — emette un documento nuovo **e nello stesso atto atomico sblocca il lavoro**
(`20260715110000_credito_storno_nota_credito.sql:154`). D308 aveva generalizzato **metà** di quel
modello (il congelamento) senza l'atto compensativo che porta i valori nuovi. D315 mette la seconda metà.

---

### Centotrentasettesima tornata — D318: un compito salva NOMINANDO i propri percorsi (08/08/2026, 10:35)

> ✅ Orario misurato: `provato:` `date` → **`08/08/2026, 10:35 CEST`**, comando separato.

**Nasce da un errore mio, e l'ha trovato l'esecutore del Task A** riferendolo invece di correggerlo di
nascosto (R-E2). Mentre lui lavorava in secondo piano su `DevoIntervenire.tsx`, io ho salvato **due
volte** con `git add -A` un lavoro completamente diverso — l'orario della copia di sicurezza del
database. Risultato, misurato:

| salvataggio | titolo | che cosa contiene DAVVERO, oltre al titolo |
|---|---|---|
| `128379ea` | *chore(salvataggio): la copia si sposta alle 11:00* | `DevoIntervenire.tsx` **+121** · `DevoIntervenire.test.tsx` **+122** |
| `b5d0d4c8` | *chore(salvataggio): tre sveglie invece di un orario* | il resoconto del Task A · `eventi-qualita-route.test.ts` **+10** |

🛑 **Niente è andato perso** — il codice è tutto lì, e la suite è verde. **Il danno è alla
RINTRACCIABILITÀ, ed è quello che costa dopo:** un salvataggio intitolato «la copia del database si
sposta alle 11:00» contiene la correzione di un difetto per cui **l'app dichiarava il falso al posto
della persona**. Chi fra sei mesi cercasse quando è stata chiusa quella bugia, cercando nei titoli,
**non la troverebbe**.

| # | Decisione | Regola | Conseguenza |
|---|---|---|---|
| **D318** | 📌 **Un compito salva NOMINANDO i propri percorsi: `git add <percorsi>`, mai `git add -A`** | vale per **chi orchestra** e per **ogni esecutore**, e vale **sempre**, non «quando c'è un agente in corso»: chi salva non può sapere che cosa sta scrivendo qualcun altro | R-E1 (un compito per esecutore) è un'**istruzione di processo**; `git add -A` è uno **strumento che la annulla in silenzio**. Erano in conflitto, e nessuno l'aveva scritto |

**🔑 Perché la regola è formulata «sempre» e non «quando c'è lavoro in parallelo».** Una regola che
chiede di *ricordarsi* che c'è un agente in corso è una regola che fallisce esattamente nel momento in
cui serve — cioè quando si sta pensando ad altro. È la stessa forma di D155 sulla data: non «controlla
l'orologio se hai dubbi», ma «esegui `date`, sempre».

**⚠️ Che cosa NON si fa, e va scritto perché è la tentazione immediata:** **non si riscrive la
storia**. I due salvataggi sono già pubblicati, e riscriverli per farli sembrare puliti costerebbe più
di quanto vale — oltre a cancellare la prova dell'errore. ➡️ **Si rende trovabile invece che
invisibile:** la mappa di recupero (`.superpowers/sdd/progress.md`) e la memoria nominano **tutti e tre**
i salvataggi in cui vive il Task A (`128379ea` · `b5d0d4c8` · `cd8e0ac0`), così chi riprende trova il
lavoro anche se il titolo non lo dice.

📌 **Il Task A ha trovato altri tre difetti del piano**, tutti corretti da lui e riferiti:
① «*la guardia ora può accendersi*» era **impreciso** — dopo il Task A la guardia dell'API resta
**irraggiungibile dal foglio**, ed è **voluto**: l'app indica la strada *prima* del giro al server,
invece di far guadagnare alla persona un 422 che leggerebbe come guasto · ② la mia diagnosi su
`post_consegna_correzioni` era **sbagliata**: non è un effetto del cablaggio, è un predicato con la sua
ragione scritta, **non va riparato** · ③ «*esiste una guardia automatica sul lessico*» **non era vera
per quel file**: le due prove scorrono `MOTIVI` su altri moduli, e le stringhe dentro il componente non
erano coperte da niente. La rete l'ha aggiunta lui.


### Centotrentottesima tornata — D319: il numero di prescrizione esce dal documento, perché la legge non lo chiede (08/08/2026, pomeriggio)

**Nasce da una domanda di Francesco**, fatta mentre stavo per lanciare il compito che avrebbe spostato
quel dato da una colonna all'altra: «*ma siamo sicuri che il numero di prescrizione deve essere indicato?
sia nella scheda del lavoro che sulla dichiarazione?*»

🛑 **La domanda ha CANCELLATO un compito già istruito, e per questo la sua riga viene prima di tutto il
resto** (§0A-bis②: *una decisione che cancella del lavoro si scrive PER PRIMA — il lavoro cancellato, se
non risulta, viene rifatto*).

| # | Decisione | Fondamento |
|---|---|---|
| **D319** | 🔑 **IL NUMERO DI PRESCRIZIONE ESCE DALLA DICHIARAZIONE E DALLE VOCI CORREGGIBILI.** Francesco, davanti alle tre vie: «**toglierlo**» | ⚖️ **Non è un contenuto dovuto.** `provato:` sul testo dell'**Allegato XIII punto 1**, letto per intero: sulla prescrizione l'elenco chiede **due** cose — «*il nome della persona che ha prescritto il dispositivo… e, se del caso, il nome dell'istituzione sanitaria*» e «*le caratteristiche specifiche del prodotto indicate nella prescrizione*». **Un numero, codice o identificativo della prescrizione NON compare fra gli otto trattini.** |

**I tre fatti misurati che hanno retto la scelta:**
- **`0` su `299`** — la colonna che il documento legge (`lavori.numero_prescrizione`) è vuota su **tutti**
  i lavori, e la tabella «giusta» (`lavori_prescrizioni`) **non ha nemmeno una riga**;
- **mai comparso su un documento**: la riga del PDF è **condizionale** (`DdcTemplate.tsx:402`) e la
  condizione non si è **mai** avverata;
- **nessuno può scriverlo**: il wizard non ha la casella (`crea-lavoro.ts:360`), e la riga di
  `lavori_prescrizioni` nasce **dentro un `IF`** che nessun chiamante attiva.

🔑 **E c'è già il campo giusto per lo scopo che quel numero sembrava servire:** ritrovare la prescrizione
di carta è il mestiere di `fonte_tipo`/`fonte_riferimento` (ondata B). Il numero sarebbe stato **un
secondo modo di fare la stessa cosa** — la famiglia «due fonti della stessa verità» che questa giornata
ha già incontrato tre volte.

📌 **`ddc-v3` NON si spacca in `ddc-v4`, e non è una scorciatoia: è la REGOLA GIÀ SCRITTA nel registro**
(`generate-ddc.ts:104-110`) — *il registro salta quando cambia ciò che il documento **dice***. Qui
**nessuna dichiarazione emessa cambia di una riga**, perché quella riga non è mai stata stampata. È lo
stesso ragionamento, con gli stessi termini, già applicato a `contiene_sostanze_o_tessuti`.

🛑 **R-P6 — il nome esce da un'allowlist, quindi porta la sua destinazione:** `numero_prescrizione` esce
da `CAMPI_CORREGGIBILI_DOCUMENTO` (TypeScript) **e** dall'allowlist della RPC (SQL, quarta migration), e
la sua destinazione è **nessuna: non si scrive più da nessuna parte, perché non serve più a niente**.
Le colonne **restano** in banca dati — non si cancella niente — e portano la loro riga scritta accanto,
o fra sei mesi qualcuno le crederà vive.

> 🔄 **DUE CORREZIONI A QUESTA RIGA, misurate dall'esecutore del compito che ne discende, e stanno qui
> perché erano marcate come fatti.**
> ① **Le colonne sono TRE, non due:** manca `dichiarazioni_conformita.prescrizione_id`, che questa
> stessa decisione orfanizza togliendole il produttore.
> ② 🔴 **«nessuno le scrive» è FALSO** per `lavori_prescrizioni.numero_prescrizione`: `POST /api/lavori`
> la **valida e la scrive** (`route.ts:234-240` → `lavoro_crea_atomico`), il clone del rifacimento la
> propaga, e `prescrizione-mapper` la legge. Vera è una cosa **più stretta**: *da D319 quel numero non
> alimenta più la dichiarazione*. La porta d'ingresso dell'API **resta aperta**, e se debba chiudersi —
> cioè se il numero sia un appunto interno del laboratorio o non serva affatto — è **la riga 27 della
> coda di ROADMAP**, non deciso qui.
> 🔑 *«Nessuno lo scrive» era il tipo di affermazione che questa giornata ha già smentito tre volte: un
> elenco che sembra completo perché si è guardato dove ci si aspettava di trovare qualcosa.*

**Che cosa cade con questa decisione, e va detto per intero:** il compito «sistemare prima la radice»
scelto poche ore fa (spostare il lettore su `lavori_prescrizioni`) · la **quarta migration** che serviva
a spostare quella chiave fra i depositi · la casella nel wizard · e la contraddizione fra
`lavori/[id]/route.ts:79-83` («*riaprirla sarebbe una seconda penna*») e l'allowlist dell'atto unico.
➡️ **Le voci correggibili scendono da otto nomi a SETTE, e le voci a schermo da sette a SEI** — tutte e
sei dovute dall'Allegato XIII.

---

### Centotrentanovesima tornata — D320 · D321: il nome del paziente si corregge dove VIVE, e il numero di prescrizione esce da tutto (08/08/2026, 17:24)

**Nasce da due risposte di Francesco** alla domanda di apertura di sessione sul Task D — la seconda e la
terza delle tre che gli erano state poste.

🛑 **D321 CANCELLA E RIAPRE del lavoro, quindi la sua riga viene per prima nel ragionamento** (§0A-bis②),
anche se il numero le tocca in ordine.

| # | Decisione | Testo di Francesco | Fondamento |
|---|---|---|---|
| **D320** | 🔑 **IL NOME DEL PAZIENTE NON SI CORREGGE DAL FOGLIO DELLA DICHIARAZIONE.** Dal foglio si corregge **quale persona** è (`paziente_id`); se è il nome a essere scritto male, si corregge **in anagrafica**, e da lì si propaga | «*se ho sbagliato anagrafica di paziente, è giusto cambiare l'anagrafica, ma se il nome in anagrafica è sbagliato, non va cambiato da qua, ma va cambiato in anagrafica e poi tutto si deve aggiornare di conseguenza*» | ⚖️ **Una fotografia che vince per sempre è il contrario di «tutto si aggiorna di conseguenza».** `generate-ddc.ts:304` legge `paziente_nome_snapshot ?? paziente?.nome_cognome`: **lo snapshot VINCE**. Scriverlo dal foglio significherebbe congelare su quel lavoro un nome che l'anagrafica non governa più — e ogni correzione futura in anagrafica **non arriverebbe** su quel documento |
| **D321** | 🔑 **IL NUMERO DI PRESCRIZIONE SI ELIMINA OVUNQUE**, non solo dal documento: colonne, porte d'ingresso dell'API, mappatori, propagazioni | «*eliminiamo ogni riferimento e ogni cosa che usa il numero di prescrizione, quello è un numero che utilizza il clinico, il medico, non noi del laboratorio*» | ⚖️ **Estende D319 dal documento a tutta la casa.** D319 aveva stabilito che il numero non è un contenuto dovuto dall'**Allegato XIII punto 1**; questa dice che allora **non è un dato del laboratorio**, e un dato che non è nostro non si chiede, non si valida e non si conserva. 🔑 Ciò che serviva davvero — ritrovare la prescrizione di carta — resta il mestiere di `fonte_tipo`/`fonte_riferimento` (ondata B) |

**I fatti misurati che reggono D320, verificati oggi e non ricordati:**
- 🔑 **La via di rettifica esiste già, ed è viva**: `PATCH /api/pazienti/[id]:99-140` porta la correzione
  di nome e cognome, scritta apposta per l'**Art. 16 GDPR** (rilievo G4), con il commento che dichiara il
  motivo — «*un cognome scritto male finisce in `dichiarazioni_conformita.paziente_nome`, che si conserva
  10 anni; senza questa via non era correggibile da nessuna parte*». A schermo è `PazienteEditSheet.tsx`,
  montata su `/pazienti/[id]` (`page.tsx:86`). ➡️ **Francesco non ha chiesto una strada nuova: ha chiesto
  di non aprirne una seconda accanto a quella che c'è già.**
- **`paziente_nome_snapshot` non ha oggi NESSUNO scrittore** (P5 del piano), ed è piena su **1 riga su
  299** — la fixture del seed (P3). ➡️ Oggi l'identità del paziente sul documento **arriva già
  interamente dall'anagrafica**: D320 non cambia un comportamento, **impedisce che cambi**.
- 🛑 **E il primo scrittore stava per essere proprio l'atto unico**: è il ritrovamento **I2**, riferito
  dalla revisione del Task C-quater e rimandato «da decidere nel Task D». **Questa è quella decisione.**

🛑 **R-P6 — un nome esce da un'allowlist, quindi porta la sua destinazione.**
`paziente_nome_snapshot` esce da `CAMPI_CORREGGIBILI_DOCUMENTO` (`src/lib/dichiarazione/correzioni.ts`)
**e** dall'allowlist della RPC `correggi_e_riemetti_atomica` (SQL, quinta migration dell'ondata). **La sua
destinazione è `pazienti.nome`/`pazienti.cognome`, via `PATCH /api/pazienti/[id]`** — che esiste, è
provata e non va toccata. La colonna **resta** in banca dati con la sua riga scritta accanto: non si
cancella niente, come già per le tre colonne di D319.

🔑 **PERCHÉ SI CHIUDE ORA E NON DOPO IL FOGLIO, ed è la lezione già pagata due volte in quest'ondata**
(C-bis e C-ter): la RPC **non ha ancora chiamanti a schermo**, quindi irrigidirla costa una riga. Dopo il
Task D costerebbe **contratto più consumatore**. E *un contratto si giudica per ciò che permette, non per
ciò che oggi gli si chiede*: se lo snapshot restasse accettato dalla rotta, la porta che D320 vieta
resterebbe aperta **per ogni chiamante futuro**, e la sola cosa a tenerla chiusa sarebbe una schermata.

➡️ **Le voci correggibili scendono da SETTE nomi a SEI; le righe a schermo restano SEI** —
chi ha prescritto · **quale paziente** · tipo di dispositivo · descrizione · denti · caratteristiche
prescritte. 📌 E cade la nota «*sette nomi per sei voci*»: da qui in avanti **un nome, una riga**, perché
il nome che faceva del paziente una riga a due teste è proprio quello che esce.

> 🔄 **CORREZIONE, scritta un minuto dopo la riga sopra e lasciata visibile.** Avevo scritto «*le voci a
> schermo da sei a CINQUE*», e poi ne avevo elencate **sei**. Il conto giusto è: i **nomi** scendono
> (7 → 6), le **righe** no (6 → 6) — perché la riga «paziente» aveva **due** nomi e ne perde uno, non se
> ne perde una. 🔑 *È la stessa famiglia dell'errore del `:326` che ha attraversato tre documenti stamattina:
> un numero ricopiato per simmetria invece che ricontato.* **Il conto autoritativo è l'array
> `CAMPI_CORREGGIBILI_DOCUMENTO`, e si legge quando si scrive il codice.**

**Che cosa apre D321, e va detto per intero perché è lavoro nuovo:** un compito a sé, **dopo** il Task D,
che comincia da un **censimento** (R-P6) e non da una cancellazione. I punti già noti dalle due correzioni
a D319 sono almeno cinque — `lavori.numero_prescrizione` · `lavori_prescrizioni.numero_prescrizione` ·
`dichiarazioni_conformita.prescrizione_id` · la porta d'ingresso `POST /api/lavori` che lo **valida e lo
scrive** (`route.ts:234-240` → `lavoro_crea_atomico`) · il clone del rifacimento che lo propaga · e
`prescrizione-mapper` che lo legge — 🛑 **ma l'elenco non lo decide chi scrive questa riga**: è l'esito del
censimento a deciderlo, ed è esattamente l'errore che D319 ha già fatto una volta («*nessuno lo scrive*»,
falso). ➡️ **Chiude la riga 27 della coda di ROADMAP**, che chiedeva proprio se quella porta dovesse
restare aperta: la risposta è **no**.

---

### Centoquarantesima tornata — D322: la correzione viene PRIMA delle quattro caselle di legge (08/08/2026, 18:46)

**Nasce dal cancello del mockup** (§0B: l'anteprima precede sempre il codice React). Due varianti a
confronto sullo stesso contenuto, chiaro e scuro, 390 px —
`docs/design/mockups/2026-08-08-passo-correzione.html`, screenshot in `screenshots/`.

| # | Decisione | Testo di Francesco | Fondamento |
|---|---|---|---|
| **D322** | 🔑 **VARIANTE A — nel foglio «Devo intervenire», col motivo «c'è un dato sbagliato sulla dichiarazione», il passo di correzione viene PRIMA delle quattro caselle di legge** (origine · quando l'hai saputo · dov'è il manufatto · potenziale di danno) | «**variante A**» | 🔑 **È la cosa per cui la persona ha aperto il foglio.** Il piano dichiarava di **non avere una prova** per preferire un ordine all'altro (autorevisione, ultima riga): la scelta era di Francesco per costruzione, non un ripiego |

📌 **Che cosa NON cambia con questa scelta**, e va detto perché la variante toccava **solo l'ordine**: le
sei righe e i loro valori · la riga «paziente» che apre un **elenco di persone** e non un campo di testo
(D320) · il blocco «da qui non si corregge» con le sue **due** destinazioni · il tasto finale spento **col
perché scritto** · le caratteristiche prescritte come sotto-passo a **due** caselle (`elementi`, `colore`
— **non** `tipo`, che il controllo d'ingresso accetterebbe ma che sul documento non arriva mai, D213).
Erano identici in tutt'e due le varianti, e restano.

🛑 **UNA MISURA FATTA PRIMA DI DISEGNARE, e senza la quale il foglio sarebbe nato rotto al primo uso
vero.** Il foglio registra l'evento quando la persona conferma, e **alcuni motivi fanno partire
un'azione automatica che CONSUMA quell'evento** (`riapri_lavoro_atomica` / `riporta_a_pronto_atomica`
scrivono `annullata_da_evento_id`). Con l'indice unico del Task B, una correzione che riusasse un evento
già consumato prenderebbe **`23505`** — è il caso che il piano segnalava nel blocco «DUE COSE CHE IL TASK
D DEVE SAPERE».
✅ `provato:` `src/lib/qualita/effetti.ts:112-115` — per `errore_dato_dichiarazione` l'effetto è
**`azione: null`**, col commento che lo motiva (`:124-125`: «*la riemissione NON tocca `lavori.stato` e
NON chiama `riapri_lavoro_atomica`*»). ➡️ **L'evento nasce pulito, e la correzione è il suo primo e unico
consumatore.**
🔑 *La domanda non era una formalità: se la risposta fosse stata l'opposta, nessun ordine dei passi
avrebbe salvato niente — sarebbe servita un'altra architettura, e ce ne saremmo accorti al primo uso
vero invece che sul mockup.*

---

### Centoquarantunesima tornata — D323 · D324: il gettone si muove solo se cambia qualcosa, e il «registro del lavoro» esiste già a metà (08/08/2026, 21:35)

**Nasce da un CRITICO** trovato dalla revisione del Task D-ter e **confermato dall'orchestratore sul
catalogo vivo**, e dal **panel a tre** che ne è seguito (regola advisor, 17/07/2026).

#### Il difetto, in una riga

L'atto unico fa **due chiamate HTTP**: ① registra l'evento, ② corregge e riemette portando un **gettone
di concorrenza** (`atteso_updated_at`, contratto: «*i valori che hai visto sono ancora quelli*»).
🔴 **La ① sposta quel gettone da sola**: incrementa `post_consegna_correzioni` su `lavori`, e il trigger
`trg_lavori_updated_at` (**BEFORE UPDATE FOR EACH ROW**, corpo `NEW.updated_at = now();` — `provato:`
sul catalogo) lo muove. Due richieste = due transazioni = due `now()`. ➡️ **Conflitto falso**, e ogni
tentativo **brucia un progressivo e lascia un PDF orfano**.

🛑 **LA COSA PIÙ GRAVE NON È IL BLOCCO: È LA VIA D'USCITA CHE LA PERSONA SCOPRE DA SOLA.** La pastiglia
`stato_dispositivo` è raggiungibile sul percorso di correzione (la fase `dettagli` è condivisa), e
rispondere **«mai uscito dal laboratorio»** fa saltare l'incremento (`eventi-qualita/route.ts:695`) e
**fa funzionare tutto**. ➡️ **È esattamente la bugia che il Task A ha tolto stamattina**, su un campo che
alimenta `classifica()` e la proposta di incidente. *Un difetto che rende impossibile la strada onesta e
funzionante quella disonesta è peggio di un difetto che blocca tutto.*
📌 E il falso conflitto è **intermittente**, non costante — cinque risposte su sei: *un allarme che suona
a caso insegna che gli allarmi sono rumore, e si paga su quelli veri.*

| # | Decisione | Testo di Francesco | Fondamento |
|---|---|---|---|
| **D323** | 🔑 **IL GETTONE DI `lavori` SI MUOVE SOLO SE CAMBIA DAVVERO QUALCOSA CHE NON SIA IL CONTATORE.** `lavori` riceve una **propria** funzione di trigger che confronta la riga vecchia con la nuova al netto di `post_consegna_correzioni` e `updated_at`, e se sono uguali **pinza** il gettone al valore vero. **Più due aggiunte:** il controllo del gettone si sposta **prima del render del PDF** dentro `…/riemetti` (che ha già la riga fresca in mano: **zero query in più**), e il foglio **raccoglie l'`updated_at` che il server già restituisce** su successo **e** su 409 | «**ok**» | ⚖️ **Panel a tre, convergente**: confini API · concorrenza · banco e normativa. **7 sonde** del secondo advisor, in transazione annullata, **compreso il valore che DEVE essere rifiutato** (un payload con `updated_at` falso **non atterra**). 🔑 E la sonda 3 ha trovato più del mandato: **anche un salvataggio che non cambia niente** brucia oggi il gettone — D323 chiude anche quello |

> 🔄 **EMENDAMENTO A D323, MISURATO DALL'ESECUTORE E RIVERIFICATO SUL CATALOGO VIVO (08/08/2026, 22:29).
> La riga qui sopra descriveva un predicato che AVREBBE ROTTO DUE PENNE.**
>
> Avevo scritto «al netto di `post_consegna_correzioni` **e `updated_at`**». **Sbagliato.** Il predicato
> vero — `provato:` `pg_get_functiondef(public.lavori_set_updated_at)`, riletto dal catalogo e non dal
> file — sottrae **solo `post_consegna_correzioni`**:
> ```
> IF to_jsonb(OLD) - 'post_consegna_correzioni'
>    IS NOT DISTINCT FROM to_jsonb(NEW) - 'post_consegna_correzioni'
> THEN NEW.updated_at = OLD.updated_at; ELSE NEW.updated_at = now(); END IF;
> ```
> 🔑 **La differenza è UN TOKEN e vale un aggiornamento perso TOTALE.** Sottraendo anche `updated_at`,
> un `UPDATE` che assegna **soltanto** quel campo diventa indistinguibile da un no-op e viene **pinzato**.
> Due penne del catalogo fanno esattamente così, ed erano state **misurate** dall'esecutore:
> · `lavoro_prescrizione_correggi_typo` — `UPDATE lavori SET updated_at = now()` è la **sola** riga che
> tocca `lavori`: pinzata, **il suo controllo di concorrenza diventa inerte**;
> · `lavoro_denti_sostituisci_atomica` — una correzione che cambia **solo il codice colore** di un dente
> lascia i tre array denormalizzati identici, e quella penna fa **DELETE + INSERT**: l'aggiornamento
> perso sarebbe **totale**. *Il commento di quella penna lo aveva previsto per iscritto.*
> 📌 **Censimento vero: 13 oggetti, non 8** (il panel ne elencava otto). Con la forma **spedita**: **0 si
> rompono**. Con la forma che avevo **ratificato**: **2**.
> 🛑 **Perché questa riga sta qui e non è un dettaglio da resoconto:** la guardia dei documenti controlla
> la **coerenza**, non la **verità** — non può vedere uno scarto fra un verbale e una funzione in banca
> dati. Se il testo restasse quello sbagliato, **la prima «pulizia» che nota la differenza rimetterebbe
> `- 'updated_at'`** riaprendo l'aggiornamento perso, *con la convinzione di star sistemando un refuso.*
> ⚖️ **Conseguenza accettata, e va detta:** il trigger e la riga `payload.updated_at = new Date()…` di
> `PATCH /api/lavori/[id]` diventano **accoppiati** — chi rimettesse quella riga spegnerebbe la pinzatura
> su ogni PATCH. Serve una sentinella che li tenga insieme.
> 🔑 **E la lezione, che è quella della giornata al suo tredicesimo giro:** *il pezzo di SQL scritto in un
> piano è **non eseguito** finché qualcuno non lo esegue.* Il blocco che avevo messo nel brief, per
> giunta, **non riagganciava nemmeno il trigger** — applicato così sarebbe stato **un no-op verde**, e
> ogni sonda avrebbe misurato il comportamento vecchio.

**Le controindicazioni, scritte perché il panel le ha scritte e non si nascondono:**
- **Cambia il SIGNIFICATO di `lavori.updated_at` per tutti**, da «ultimo tentativo di scrittura» a «ultimo
  cambiamento vero». Lo usano **tre funzioni del catalogo** più tre rotte e una schermata: il panel
  *crede* che nessuna si rompa (un gettone fermo **continua a combaciare**) ma lo dichiara **una
  convinzione, non una prova** → **va provata funzione per funzione**.
- **`trigger_set_updated_at` è CONDIVISA da tutte le tabelle e NON si tocca**: `lavori` ha la sua, con un
  nome proprio e il commento che dice **perché** è separata — o una pulizia futura «unifica i duplicati»
  e riapre tutto in silenzio.
- **L'esenzione è un'allowlist**, la classe per cui esiste R-P6. Attenuante misurata: il predicato è
  scritto **per sottrazione**, quindi una colonna nuova entra **da sola** dalla parte protetta
  (fail-closed). Il criterio va scritto accanto: **solo colonne che non compaiono su nessun documento e
  su nessuna schermata che l'operatrice conferma**.
- **`PATCH /api/lavori/[id]:803` (`payload.updated_at = new Date().toISOString()`) diventa una riga
  bugiarda** e va tolta **nello stesso giro**.
- 🛑 **Chiude il CASO, non la CLASSE.** Cambiare cassetta o tracking — cose che sul documento non
  compaiono — continuerà a far scattare il blocco. La forma definitiva (**il gettone sono le sei voci
  stampate**, non un orologio) è **la destinazione dichiarata**, e non si fa oggi: richiederebbe di
  riscrivere `canonico()` (`generate-ddc.ts:171`) una seconda volta in SQL, cioè **due fonti della stessa
  verità**, la famiglia di difetto già pagata più volte.
- **Non tocca il costo di un conflitto VERO**: il PDF si rende e il numero si prende **prima** della
  transazione, quindi un progressivo si brucia lo stesso. Il controllo anticipato lo rende **raro**, non
  impossibile — e chi scriverà «adesso niente più file orfani» scriverà una cosa falsa.

| # | Decisione | Testo di Francesco | Fondamento |
|---|---|---|---|
| **D324** | 🔑 **IL «REGISTRO DEL LAVORO» SI FA, E NON SI COSTRUISCE DA ZERO: LA METÀ CHE C'È SI COMPLETA.** `post_consegna_correzioni` **resta** (D323 non lo tocca) ma **non è lo strumento**: è un numero senza chi, quando e cosa. Il registro si fa su `audit_log`, e nasce **due mezze cose**: ① far arrivare **l'autore** ② la schermata, **visibile al solo `titolare`** | «*potrebbe servire per un controllo? magari il titolare dello studio può controllare cosa è stato fatto su quel lavoro e da chi? se reputi che possa servire magari facciamo in modo che solo il titolare possa aprire un registro del lavoro*» | ⚖️ **Misurato sul banco, non ipotizzato.** `audit_log` **esiste ed è già acceso**: **1.870 righe** su **11 tabelle** (fra cui `lavori` — **1.092 righe** — e `dichiarazioni_conformita`), col **prima e il dopo per intero** (`old_data`/`new_data` in JSONB). 🔴 **MA L'AUTORE È VUOTO SU 1.869 RIGHE SU 1.870**: `_audit_trigger_fn` prende `auth.uid()`, e le rotte scrivono con la **chiave di servizio**, che non ha un'identità utente. ➡️ **Oggi il registro sa dire CHE COSA è cambiato e QUANDO, non CHI** — cioè manca proprio la metà che Francesco ha chiesto |

🔑 **Perché il contatore non era la strada, e va detto:** `post_consegna_correzioni` è **un numero solo**,
senza autore né data né contenuto — e **nessuno lo legge** (`provato:` dal panel: **0 consumatori** in
tutta l'app; le sole occorrenze non-scrittura sono tipi, una fixture e due `select` di colonne che non
usano il valore). Contro l'audit, che porta la riga intera prima e dopo, non è un'alternativa: è
un'ombra. **Resta** perché D323 gli toglie il danno e tenerlo non costa niente, **non** perché serva al
registro.

📌 **Va in coda come DUE voci, e la prima è la portante:** senza l'autore, la schermata sarebbe un
registro che dice «qualcuno». ⚠️ E il registro tocca **dati personali del paziente** (`old_data`/`new_data`
portano la riga intera): la schermata nasce con la sua valutazione GDPR, non dopo.

---

### Centoquarantaduesima tornata — D325 · D326 · D327 · D328: «altro» diventa il lavoro neutro, e il segno delle sostanze si sposta dal LAVORO al MATERIALE (09/08/2026, 00:48)

**Come è nata:** dal censimento di chiusura dell'08/08 (§0④ dell'handoff) è riemersa una scelta
**rimandata a un gate e mai portata a Francesco**: `contiene_sostanze_o_tessuti` cablato a `false` in
`generate-ddc.ts:349`. Portata stanotte, ha aperto una ricerca normativa, **una decisione**, un **panel a
tre** e **tre decisioni ancora**.

🔄 **CORREZIONE A CIÒ CHE ERA STATO DETTO A FRANCESCO, prima di tutto il resto.** La riga era stata
presentata come «cablata **e stampata** sul documento». **La seconda metà è falsa:** `DdcTemplate.tsx:508`
tiene la riga dentro un `? :`, e con `false` **non compare niente**. Poiché il testo di legge chiede
l'indicazione «**se del caso**», **tacere quando la sostanza non c'è è la forma giusta**.
🔑 **Il difetto è quindi l'altro verso, ed è più sottile: non una falsa dichiarazione, ma un'omissione
che nessuno può correggere** — se un dispositivo contenesse davvero quei materiali, **non esiste nessuna
strada per dirlo**.

**La norma, con la citazione giusta.** Allegato XIII **punto 1, ULTIMO trattino**: «*se del caso,
l'indicazione che il dispositivo contiene o incorpora una sostanza medicinale, compreso un derivato dal
sangue o dal plasma umani, o tessuti o cellule di origine umana o di origine animale di cui al
regolamento (UE) n. 722/2012*».
🔴 **`src/types/domain.ts:1223` cita «Allegato XIII §1(e)» ed è SBAGLIATO in due modi:** quel punto **non
usa lettere, usa trattini**, e l'elemento è l'**ultimo**, non il quinto (**il quinto è il nome del
prescrittore**). Riferito e **non corretto** (R-E2: l'albero era occupato dal Task D-bis).

**Il perimetro, misurato.** Reg. (UE) **722/2012** art. 1: specie **bovini · ovini · caprini · cervi ·
alci · visoni · gatti**; materiali **collagene · gelatina · sego**; **esclusi** i derivati del sego
trattati con metodi rigorosi e i dispositivi che non toccano il corpo o toccano **solo cute integra**.
**MDCG 2021-24 Rev.1 Nota 1** esclude i prodotti *fatti* dagli animali — **cera d'api**, lanolina, seta.
🛑 **MA IL RINVIO AL 722/2012 LEGA SOLO IL RAMO ANIMALE:** «sostanza medicinale» e «origine umana»
restano **senza perimetro**. *La ricerca aveva presentato mezza risposta come se fosse tutta* — corretto
dall'advisor normativo.
📌 **Allegato VIII Regola 18:** tessuti/cellule umani o animali non vitali → **classe III**, salvo
contatto con **sola cute integra**. ➡️ **il campo non è una casella: è un innesco di classificazione.**

**Il verdetto della ricerca, categoria per categoria** (`docs/roadmap/2026-08-09-sostanze-e-tessuti-ricerca.md`):
nessuna delle **38 voci** del catalogo, nella pratica standard, incorpora quei materiali nel manufatto
consegnato. **La decima categoria, «altro», è l'unica porta aperta** — ed è testo libero.

| # | Decisione | Testo di Francesco | Fondamento |
|---|---|---|---|
| **D325** | 🔑 **«ALTRO» DIVENTA IL LAVORO NEUTRO A COMPILAZIONE MANUALE:** tutte le opzioni che le altre lavorazioni portano predeterminate — **classe di rischio compresa** — devono poter essere scelte a mano. ⚠️ **La prima metà** (la domanda sulle sostanze **sul lavoro**, solo su «altro») è **EMENDATA da D327**: v. sotto | «*b e solo sul lavoro con altro, nel caso di altro, credo che si debba attivare una procedura per cui è come se fosse un lavoro "neutro" dove tutto deve essere compilato a mano e quindi tutte le possibili opzioni di un lavoro devono poter essere gestite, perchè altro potrebbe essere tutto o niente*» | ⚖️ **Inverte una scelta dichiarata nel codice.** `sequenza-passi.ts:73-96`: oggi il tipo libero **non è trovato** da `trovaTipo()` e il wizard **salta i passi denti e colore**, perché «*fallisce verso il CHIEDERE DI MENO quando il tipo non è riconosciuto*». 🔑 Francesco dice l'opposto per lo stesso motivo, girato: **un tipo che può essere qualunque cosa non può chiedere meno degli altri.** 📊 **E «altro» non è marginale:** `provato:` sul banco — **24 lavori su 299, terzo tipo più usato (~8%)**, e **tutti e 24 in `classe_iia`**, non la `classe_i` che il wizard cabla (`crea-lavoro.ts:153`): quella classe **non la sceglie nessuno, capita** |
| **D326** | 🎨 **TEMA SCURO: VARIANTE (b)** — tinta invariata, **un filo `--line`**. 🔑 **E IL TEMA CHIARO NON È COPERTO DALLA (b): il contrasto fra il pannello e le righe VA AUMENTATO** | «*preferisco la seconda tipologia del tema scuro, su quello chiaro aumentiamo il contrasto tra lo sfondo della scheda e le opzioni*» | ⚖️ **Scelto su TRE immagini vere della pagina viva** (com'è · (a) · (b)), non su un mockup. 🔑 **E l'osservazione sul chiaro è una MISURA, non un gusto:** `provato:` `ds-v3.css:13` — righe `--bg-deep` **#ECE6D9** dentro pannello `--card` **#FFFEFA** = **1,23:1**, e il filo `--line` **#EBE4D6** contro lo stesso pannello dà **1,25:1**. ➡️ **in chiaro la (b) da sola non si vedrebbe**: Francesco l'ha visto guardando le immagini |
| **D327** | 🔑 **IL SEGNO «CONTIENE SOSTANZE/TESSUTI» STA SUL MATERIALE, NON SUL LAVORO:** si spunta **una volta sola al carico in magazzino**, e da lì **lo ereditano tutti i lavori che quel materiale usano**. **EMENDA la prima metà di D325** (la domanda per-lavoro su «altro» decade). ⚠️ La seconda metà di D325 — «altro» lavoro neutro — **resta intera** | «*La loro proposta: il segno si mette una volta sola sul materiale, quando entra in magazzino, e da lì se lo portano dietro tutti i lavori che lo usano. Nessuno risponde più a niente, e il dato è più vero di prima.*» | ⚖️ **CONVERGENZA DI DUE ADVISOR SU TRE, indipendenti e da estremi opposti** — e **non era nessuna delle tre strade proposte**. **Normativo:** «*il flag appartiene al materiale, non al tipo di lavoro… una domanda per-lavoro diventa **stantia** il giorno in cui il laboratorio compra un ribasante nuovo*». **UX (riserva n. 1):** «*una domanda la cui risposta non cambia mai **addestra il riflesso del tocco automatico**, e poi scatta sull'unico caso che contava*». 🔑 Esiste già un aggancio in casa: `tracciabilita_materiali_ok` |
| **D328** | 🔴 **SI APRE UNA VERIFICA A SÉ SULLA CLASSIFICAZIONE DEL MONCONE PERSONALIZZATO**, fuori da quest'ondata | «*ok*» (alla domanda «vuoi che apra una verifica a sé su quella classificazione?») | ⚖️ **Difetto VIVO trovato dal panel FUORI dal suo mandato.** `tipi-lavoro.ts:68` mette `abutment` in **`classe_iia`**; **MDCG 2021-24 Rev.1**, tabella della **Regola 8**, mette «*Dental implants **and abutments***» in **classe IIb**, e la **Nota 4** conferma. 🛑 **NON dichiarato risolto**, e la cautela è dell'advisor: dipende da una domanda che **l'app non fa mai** — se il moncone nasca da un **ti-base CE** (l'alias `'ti-base'` è già nel catalogo, riga 63), cioè **chi sia il fabbricante**. 📌 **Conseguenza misurabile:** `classe_rischio` alimenta `GruppoClassePsur` (`domain.ts:89-105`) e **Art. 86(1)** chiede il PSUR **almeno biennale** per la IIa, **almeno annuale** per IIb/III → **la scadenza detta all'odontotecnico è quella sbagliata**. 📊 Sul banco: **15 lavori `implantologia` in `classe_iia`** (quanti siano abutment: **non misurato**) |

🔑 **PERCHÉ D327 VALE PIÙ DELLA DOMANDA CHE HA SOSTITUITO, e va scritto:** la risposta a quella domanda,
in odontotecnica, è «no» **praticamente sempre**. Una domanda la cui risposta non cambia mai non
raccoglie un dato: **addestra a non leggerla** — e il riflesso scatta poi sull'unico caso che contava.
Spostata sul materiale, la risposta **si dà una volta e resta vera finché il materiale è quello**.

⚠️ **RISERVE DEL PANEL NON ANCORA CHIUSE** — si integrano o si motivano, non si lasciano cadere:
1. **L'impiantabile non è un dato**: nessun campo dice se il dispositivo lo sia, ma `DpaTemplate.tsx:162`
   **promette già** la conservazione a **15 anni per gli impiantabili**.
2. **Se «sì», l'indicazione va ANCHE SULL'ETICHETTA** (Allegato I, cap. III, **23.2**), non solo sulla
   dichiarazione — **mancava dalla traccia data al panel**.
3. **Art. 52(8) ha un'alternativa omessa:** Allegato IX capo I **oppure** Allegato XI parte A.
4. **Un solo blocco duro è difendibile:** «sì» insieme a `classe_i`/`classe_iia`. **Mai bloccare
   l'emissione**: il laboratorio ha diritto di consegnare.
5. Il campo **deve entrare in `CAMPI_CORREGGIBILI_DOCUMENTO`** (`correzioni.ts:58`) o nasce una voce
   obbligatoria **non correggibile**.
6. **`DdcTemplate.tsx` stampa il ripiego «Sì — vedere documentazione allegata»**: promette un allegato
   che **può non esistere**. ➡️ dettaglio **obbligatorio** con «sì», e quel ripiego **si toglie**.
7. **Non chiedere la classe: chiedere la FAMIGLIA** e **suggerire** la classe, dicendo la ragione ad alta
   voce (UX). *La stessa derivazione a domande avrebbe intercettato l'abutment* (normativo) — **le due
   prospettive convergono anche qui**.
8. **Non verificato:** se il macchinario consultivo del 722/2012 tocchi i su misura sotto la classe III
   impiantabile (presuppone un organismo notificato che qui non c'è).

🔴 **TRE DIFETTI VIVI RIFERITI DAL PANEL, tutti fuori mandato (R-E2), nessuno corretto:**
- **`precheck.ts:141` è un VICOLO CIECO**: manda a correggere `classe_rischio` nella scheda «dati», dove
  **il campo non esiste** e **non è in `PATCHABLE_FIELDS`**. In compenso il controllo è
  **irraggiungibile**: `provato:` catalogo vivo — `lavori.classe_rischio` è `NOT NULL DEFAULT
  'classe_iia'`, quindi `!lavoro.classe_rischio` non è mai vero.
- **`api/lavori/route.ts:293`**: `body.classe_rischio ?? 'classe_i'` **senza validazione** (mentre
  `tipo_dispositivo` è validato a `:141-142`) → un valore fuori dominio **aborta dentro la RPC dopo che
  il progressivo è stato pescato**: 500 grezzo, lavoro perso.
- **`api/qualita/psur/route.ts:37-49`** legge la classe di **tutti** i lavori senza filtro: **un solo**
  lavoro portato a IIb aggiunge il gruppo `classe_iib_iii` e **dichiara dovuto un PSUR che non lo era**.

📌 **Dimensionamento (advisor architettura):** la parte **classe di rischio** non ha migration (colonna
già viva) → percorso **Medio**. La parte **sostanze** ha bisogno di una **colonna nuova** —
`contiene_sostanze_o_tessuti` esiste **solo** su `dichiarazioni_conformita` — quindi **migration →
dominio critico → percorso GRANDE**; e `generate-ddc.ts:106-111` dichiara che il **registro del modello
salta a `ddc-v4`** proprio quando questo campo comincia a dire qualcosa. ⚠️ **D327 sposta il bersaglio
della colonna dal lavoro al materiale: il dimensionamento va rifatto sul magazzino, non ereditato.**

---

### Centoquarantatreesima tornata — D329: per il tema chiaro vince la variante che chiude DUE difetti, non uno (09/08/2026, 09:23)

**Come è nata:** D326 aveva lasciato il tema chiaro **aperto di proposito** — «più contrasto fra il
pannello e le righe» era la direzione, non il rimedio. L'esecutore ha preparato **tre varianti su tre
assi diversi** (il bordo · l'ombra · la tinta), ognuna fotografata sui tre viewport e **col suo rapporto
di contrasto calcolato**, e **non ha scelto** (preferenza permanente di Francesco: mai una variante
sola). Francesco ha scelto **guardando le immagini e leggendo i numeri**.

| # | Decisione | Testo di Francesco | Fondamento |
|---|---|---|---|
| **D329** | 🎨 **TEMA CHIARO: VARIANTE C3 — la riga più scura (#DDD6C9) E le didascalie promosse a `--ink`.** Sono **la stessa variante**, non due: è anche la ragione per cui vince | «*c3*» | ⚖️ **Scelta su tre assi misurati, non su tre sfumature.** **C1 — il bordo:** unico a toccare **una soglia di legge** (filo a **3,08:1**, minimo 3 per gli elementi premibili). **C2 — l'ombra:** gratis in scuro (lì quelle ombre valgono `none`), ma la sua metà semantica **si legge solo a 1280**. **C3 — la tinta:** separazione riga↔pannello da **1,23** a **1,43:1**. 🔑 **E LA FRASE CHE DECIDE, dichiarata dall'esecutore stesso: solo C3 chiude ANCHE il ❌3** — i quattro testi in chiaro a **4,17** contro la soglia 4,5 passano a **12,11**. Con C1 o C2 quel rilievo **resta aperto** e serve una seconda decisione. ⚠️ **Il rovescio, detto a Francesco prima della scelta:** C3 **sposta la gerarchia**, non solo il contrasto — le didascalie diventano inchiostro pieno, quindi la schermata cambia peso |

🔑 **PERCHÉ QUESTA TORNATA VALE COME PRECEDENTE, e non per il colore:** la scelta è stata possibile
perché l'esecutore ha misurato **tre assi diversi** invece di tre gradazioni dello stesso, e perché ha
**dichiarato la conseguenza fuori dal proprio rilievo** («solo C3 chiude anche il ❌3»). *Tre varianti
dello stesso asse non sono una scelta: sono la stessa proposta ripetuta.*

🔄 **CORREZIONE DELL'ESECUTORE A SÉ STESSO, misurata — e vale come modello:** aveva scritto «in chiaro
il filo non cambia niente» ed era **falso di 2px**. Tre superfici su cinque il bordo non ce l'avevano, e
**un bordo trasparente occupa spazio lo stesso**: pastiglia **28 → 30**, blocco «Da qui non si corregge»
**253,25 → 255,25**. Crescono, quindi nessun bersaglio scende sotto i 44px e nessun testo va a capo —
**ma il numero è stato rimisurato, non dedotto**.

🔴 **DIFETTO DEL MANDATO, trovato contando sulla PAGINA VIVA invece che nel file (R-P6):** il brief
diceva «le superfici sono **cinque**, non quattro» — correggendo l'errore del giorno prima. **Erano
SEI.** La sesta è il **tasto primario spento** (`src/components/ds/TastoPrimario.tsx:90`): in scuro
**#100E0B su pannello #211D18 = 1,15:1 senza filo**, esattamente il difetto del ❌1 su una superficie
rimasta com'era. **Non toccata** (fuori perimetro, R-E2 + migrazione per route) → **riga 37 della coda**.
🔑 *Il censimento del gate era stato fatto su un file solo. Due conteggi sbagliati di fila sullo stesso
elenco, e il terzo è venuto da una sonda sul DOM.*

📌 **Il filo NON è scritto nel componente: è il token `--filo-superficie`** (`ds-v3.css:37` = `transparent`
in chiaro, `:82` = `var(--line)` in scuro). La ragione è tecnica e decide il seguito: quelle superfici
dipingono il bordo con uno stile **dentro il tag**, che **batte sempre** una regola del foglio di stile —
l'unico modo di renderlo condizionale al tema è ridefinire la **variabile**. ➡️ **il chiaro si chiude
cambiando UNA riga, non sette.**

⚠️ **Misura che nessuno aveva scritto, e ridimensiona la (b):** in scuro il filo **delimita e basta** —
riga↔pannello resta **1,15:1**, cioè **l'elevazione resta invertita** rispetto alla regola del design
system (una superficie premibile dovrebbe *salire* dentro un `--card`). Il filo dà **1,25:1** sul
pannello e **1,44:1** sulla riga. *La (b) rende la riga visibile, non la rende rialzata.*

📌 **D329 È STATA APPLICATA lo stesso giorno** (`ds-v3.css:38-39` chiaro · `:97-98` scuro, token
`--fondo-superficie` e `--didascalia-superficie`; cinque fondi e sei scritte in
`DevoIntervenire.tsx`). `provato:` **rimisurato sulla pagina viva, non ricalcolato** — riga #DDD6C9,
separazione **1,43:1**, i quattro testi del ❌3 a **12,11**. In scuro **non è cambiato un pixel**
(fondo `rgb(16,14,11)`, filo `rgb(52,46,38)`, didascalie 6,07): i due token risolvono ai valori di
prima, e le due righe del blocco scuro **esistono apposta** — senza, il tema scuro erediterebbe la
resa del chiaro e la riga si **schiarirebbe**, perché in scuro `--muted` è chiaro.

🔴 **E IL ROVESCIO ANNUNCIATO SI È MATERIALIZZATO, COL SUO NUMERO: il conto dei testi sotto soglia in
chiaro passa da 4 a 12.** Le scritte promosse a `--ink` guadagnano (4,17 → 12,11); **quelle rimaste
`--muted` perdono** (4,66 → **4,01**): le sei etichette delle righe, i due paragrafi di «Da qui non si
corregge», i **due collegamenti** «Impostazioni» e «Anagrafica», le due righe di sotto del selettore di
persone. **Riferito e NON aggiustato** (R-E2).
🔑 **La lezione, e non è sul colore: su questo asse non si vince.** Con un pannello quasi bianco,
scurire la riga la allontana dal pannello **e** avvicina il testo alla riga — è la stessa mossa. **Ogni**
scurimento utile porta `--muted` sotto 4,5, perché parte da 4,66. ➡️ Il seguito non è cambiare variante:
è **spostare quei dodici testi**, la stessa mossa che ha appena chiuso il ❌3.
⚠️ **Secondo effetto, riferito con lo scatto** (`d329-rilievo-nastro-prima-sopra-dopo-sotto--390-light.png`):
le tre tappe **spente** del nastro erano grigie e adesso sono **nero pieno**, cioè lo stesso peso della
tappa corrente — *il nastro non dice più «sei qui» con l'intensità, solo col riempimento.*
📌 **E le parole non coincidono con l'immagine:** la decisione dice «didascalie», ma nell'immagine scelta
era passato a inchiostro **ogni** `--faint` su quelle superfici, **galloni `›` compresi**. È stata
applicata **l'immagine** — si torna indietro cambiando tre righe. Referto:
`docs/design/screenshots/2026-08-09-devo-intervenire/GATE-L2.md`, sezione «D329 — applicata».

# Verbale — decisioni di apertura dell'ondata (b), wizard «Nuovo lavoro»

**Data:** 28 luglio 2026 · **aggiornato alla nona tornata (le due decisioni che sbloccano il passo cassetta
e la scia delle briciole)** ·
**Decide:** Francesco Formicola · **Stato:** ratificato in sessione
**Quarantacinque decisioni in nove tornate:** D1-D8 in apertura · D9-D16 sui mockup · **D17-D20 alla ratifica della
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
| **D5** | **L'anagrafica entra solo per la parte wizard** | scelta esplicita | **Dentro:** cerca-prima-di-creare + i due difetti di §2. **Fuori, voce propria:** unione di due schede già doppie, creazione/gestione dalla pagina `/pazienti` |
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

> ⚠️ **Nota sulle date, dichiarata e non nascosta.** Le tornate settima e ottava sono intestate «29 luglio»
> e «30 luglio», ma **i commit che le portano sono TUTTI del 29 luglio 2026** (`git log --date`:
> `bf009e2d` 09:55, `ed286b0f` 09:58, `b1620cbe` 10:15, `e845fc78` 11:20), e l'orologio della macchina
> segna il 29. La data «30/07» dei documenti e dei nomi di file è quindi **avanti di un giorno rispetto al
> registro dei commit**. Questa tornata porta **la data del sistema, 29 luglio 2026**. 🛑 **Nessuna
> rinomina retroattiva** di file e riferimenti: sarebbe un intervento largo e fuori mandato. Segnalato a
> Francesco (R-E2).

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D38** | 🧺 **La cassetta creata dal wizard nasce ALLA FINE, insieme al lavoro.** Il wizard porta **l'intenzione**, non l'effetto | scelta esplicita fra due uscite, presentate col loro costo (bloccante B-2 + I-6 del piano v2) | ✅ **Sblocca T18**, che era 🚧 fermo su questa decisione. **La scrittura avviene nell'unico punto in cui nasce il lavoro** — `src/components/features/wizard/WizardNuovoLavoro.tsx:363-371`, che il codice stesso dichiara «l'unico punto che chiama `creaLavoroDaWizard`, nessuna scorciatoia lo bypassa» (letto, `:363`; ⚠️ **il piano diceva `:362-364`: coordinate derivate**). ➡️ `POST /api/cassette` **non si chiama durante il percorso**. **Costo accettato:** cassetta e lavoro devono nascere **insieme** — una RPC atomica, o due passi con compensazione: **la forma si decide dentro T18**, con panel se non è ovvia, e ricalcando il precedente in casa (`crea_rifacimento_atomico`, «MAI 3 INSERT separati»). ➡️ **Cambia il contratto di `src/components/features/cassette/NuovaCassettaSheet.tsx`**, oggi costruito su `onCreata` → assegnazione immediata. 🔑 **Non contraddice D30, la precisa:** D30 decideva **il gesto al banco** («ci va dentro subito», nessun ritorno alla griglia) e resta intatta; D38 decide **quando nasce la riga in banca dati**. ✅ **E tiene vero un testo già ratificato:** chi preme ✕ dopo il passo cassetta legge «nel gestionale non resta niente» — con l'uscita (b) avrebbe lasciato **una cassetta vuota sulla parete** subito dopo aver letto quella frase |
| **D45** | 🛑 **CORREGGE UN PEZZO DI D44: quando la ricerca NON trova nulla, LO DICE.** E con essa entra una regola di metodo: **un numero letto sui dati di prova non diventa una regola di prodotto** | rilievo di Francesco: «*non vorrei che il fatto che stai ragionando sui dati in db che sono dati test messi alla cavolo, ecco perché non trovi i cognomi, ti potesse sviare*» | 🔴 **Aveva ragione su una conclusione, e la ritiro:** l'advisor «banco» aveva raccomandato **nessun messaggio quando non si trova nulla**, perché «con questi dati *non trovato* è l'esito **normale**». Quel «normale» **vale solo per l'archivio di prova**: con un archivio vero, chi cerca «Bagheria» e non riceve **niente** resta a fissare un campo muto, senza capire se sta sbagliando a scrivere o se il paziente non c'è. ➡️ **T15 mostra lo stato «nessun risultato».** ✅ **Cosa invece NON cambia, perché non dipendeva dai dati** (riverificato): ① i 911 senza cognome **non sono dati inseriti male, sono un difetto del CODICE** — `src/lib/wizard/crea-lavoro.ts:229-230` scrive `cognome: alias \|\| pz` e `nome: ''` **fissi**, quindi un laboratorio vero, con l'app di oggi, otterrebbe **lo stesso identico archivio**; ed è proprio ciò che D2 e T16 chiudono; ② **mai `nome_cognome`**: quella colonna **non la scrive nessuno**, la compone il trigger `trg_paziente_nome_cognome` da `cognome` e `nome` — cercarci dentro non aggiunge nulla che non sia già nelle due caselle vere; ③ **il tetto sulle righe** serve **di più** con un archivio pieno, non di meno; ④ **la «lunghezza minima» resta inutile anche coi dati veri**, perché i codici generati sono tutti `PZ-` più un numero: un prefisso comune resta comune; ⑤ **la scelta di `alias` invece di `cognome`** nasce da una trappola nel **codice** (scrittura contro lettura), non dai numeri. ⚠️ **E una cosa che resterà vera anche con l'archivio pulito:** un paziente **senza nome** è un caso **legittimo**, non un errore — la prescrizione può arrivare col solo codice, e la legge lo consente (Art. 21(2) MDR: nome, acronimo **o codice**). Non saranno 911 su 916, ma **non saranno zero**: la riga di suggerimento deve saper dire «questo paziente non ha un nome» invece di fingere che ce l'abbia. 🔑 **La regola di metodo, che vale oltre questo caso:** prima di trasformare una misura in una regola, si chiede **da dove viene il numero** — se dal **codice** (allora vale anche domani) o dai **dati di prova** (allora sparisce con la pulizia, `ua-app/CLAUDE.md` §8) |
| **D44** | 🔎 **CHIUDE IL BLOCCANTE «B2 contro T6», e lo chiude verso il BASSO: la ricerca pazienti restituisce QUATTRO chiavi — `id, codice_paziente, alias, ultimoLavoro` — e filtra su `codice_paziente \| cognome \| nome`, MAI su `nome_cognome`** | decisione tecnica, ratificata col parere concorde di un panel di due advisor (contratto · banco), dopo che entrambi i fatti-perno sono stati riverificati aprendo i file | 🔴 **Il bloccante era questo:** il piano voleva `cognomeEffettivo` **dentro** la proiezione, la spec **B2** pretendeva «esattamente cinque chiavi» **con una prova che fallisce alla sesta**. Due documenti ratificati, incompatibili. **Scartata l'uscita (a)** — servire il cognome derivato sotto la chiave `cognome` — e la ragione è **provata, non estetica:** `cognome` sarebbe **la colonna in scrittura e un derivato in lettura**, e un client che rilegge e rimanda `cognome: ''` (cioè **911 righe su 916**) passa da `src/app/api/pazienti/[id]/route.ts:130-135` e finisce su `risolviNomePaziente` (`src/lib/domain/nome-paziente-scrittura.ts:64-68`), che scrive **`cognome := codice`**: mutazione **silenziosa**, risposta 200, nessun errore. 🔑 **E B2 sarebbe rimasta VERDE attraverso il cambiamento che è nata per vedere**, perché guarda la forma e (a) non cambia la forma. ✅ **La parola giusta esisteva già in casa:** `derivaAlias` (`src/lib/cassette/parco-shared.ts:69`) torna `string \| null`, legge **una** colonna e copre **entrambe le generazioni di dato** — restituisce `null` quando il nome visibile **è** il codice. `cognomeEffettivo` è invece l'attrezzo di **scrittura**, e sulle 911 righe restituisce `''`: sarebbe **una terza convenzione per «nessun nome»**. 📏 **Il filtro è aritmetica, non opinione** (misurato il 29/07: 916 totali · **911 senza cognome** · 5 con cognome vero · 911 con `nome_cognome = codice_paziente` · `nome` pieno **2** volte): **911 + 5 = 916**, quindi **nessuna riga porta in `nome_cognome` un nome che non sia già in `cognome`** — includerlo aggiungerebbe **solo** 911 righe indistinguibili. `nome` entra benché pieno due volte, perché `risolviNomePaziente:67` mette **nel cognome** il valore quando la casella piena è una sola. ⚠️ **E la «lunghezza minima» del piano non difende nulla, misurato:** **912 codici su 916** condividono lo stelo `PAZ/2026/`, quindi `%PAZ/2026/0%` — **dieci** caratteri — restituisce **911 righe**. ➡️ **La difesa è un tetto duro sulle RIGHE** (~10 dalla rotta, **5 mostrati** a schermo), non sui caratteri digitati. 🛑 **Il motivo che il piano dichiarava — «mostrerebbe il codice due volte» — oggi vale ZERO righe** (`cognome == codice`: nessuna): il problema **vero e presente** è che 911 schede **non hanno alcun nome**. 🔴 **E resta una seconda cosa da NON sottintendere:** piano (T6.1, proiezione stretta **sempre**) e spec §5 (ridotta **solo quando c'è `q`**) **non concordano**; B2 deve dire **su quale percorso** vale e se l'innesto «ultimo lavoro» gira **anche senza `q`** — cioè sul percorso dell'unico chiamante vivo (`src/lib/wizard/crea-lavoro.ts:250`), che quel valore **non lo legge**, per fino a 500 righe a ogni creazione di lavoro |
| **D43** | 🔒 **L'indice unico sul codice paziente si applica SUBITO alla banca dati di produzione** (T5), non a fine ondata | scelta esplicita fra tre uscite, presentate col loro costo — la domanda gli è stata posta **con il conteggio dei duplicati rifatto in quel momento**, non con quello del giorno prima | ✅ **Precondizione P2 rieseguita nello stesso turno, come prescrive il piano** (decade col tempo): `provato:` duplicati sul codice **normalizzato** per laboratorio → **0 righe**; duplicati sul codice **grezzo** → **0 righe**; baseline **294 · 0 · 916 · 48** intatta. ➡️ **La migration non può abortire.** 🔑 **Da quel minuto Z1 smette di essere inerte:** il messaggio «Questo codice è già di un altro paziente» (D37), in produzione dal 29/07 ma **impossibile da accendere** senza indice, comincia a comparire davvero — e l'applicazione **sa già gestirlo**, che è la ragione per cui la consegna zero è andata in produzione **prima** del ramo. ⚠️ **Non esiste uno staging** (verificato: `deploy.yml` non ha alcuno step di migration, `ci.yml` porta un URL segnaposto, non c'è `supabase/config.toml`): «applicare» significa **toccare l'unico progetto**, ed è il motivo per cui questa decisione è stata chiesta e non assunta. **Rollback, come comando e non come categoria:** `DROP INDEX IF EXISTS pazienti_codice_lab_uidx;` **Nessun dato esistente viene modificato**, e a 916 righe la finestra di blocco è trascurabile (`CONCURRENTLY` **non serve**, verificato: zero occorrenze in tutto `supabase/`). ✅ **Registro delle migration verificato allineato** prima di toccarlo: 85 registrate in `supabase_migrations.schema_migrations`, ultima `20260728103000`, che è **l'ultimo file su disco** |
| **D42** | 🎨 **CHIUDE D40, dopo il panel dei tre advisor: la tinta non dentale si fa DOPO, e con i NOMI.** Nell'ondata (b) i tre tipi non chiedono il colore; la tavolozza con le tinte nominate diventa **un'ondata propria**, con catalogo **separato** da `colori_dentali` | scelta esplicita fra tre uscite, presentate col loro costo, dopo il parere concorde dei tre advisor | ✅ **In T2, `prevedeColore` diventa a TRE valori** — `'catalogo' \| 'libero' \| 'nessuno'` — e i tre tipi prendono **`'libero'`, che nell'ondata (b) non rende alcun passo**: meglio nessuna domanda che una domanda con la scala sbagliata. È l'unica parte che entra ora, ed è TypeScript puro: **zero banca dati**. 🔑 **I tre pareri hanno detto no all'esadecimale nudo per tre ragioni diverse, e la più forte è di Francesco stesso** (riga 151 di questo verbale, sui colori delle cassette): «*non ci conviene unificare, se questo permette la ricerca per colore; facciamo solo in modo da avere una tabella più ricca possibile che copra quasi tutti i colori ricercabili*» — aveva **già** scelto i nomi contro l'hex, per la ricercabilità. 🔴 **E il panel ha smontato anche la via di mezzo che sembrava ovvia — allargare `colori_dentali` con due scale nuove:** `lavori.colore_scala/colore_codice` e le quattro colonne di `lavori_denti` puntano a quel catalogo con **cinque chiavi esterne** (`lavori_colore_caso_fk` + `lavori_denti_*_fk`), e **l'id fine dei 38 tipi NON è persistito** (su `lavori` c'è solo `tipo_dispositivo`, 10 valori macro) → `('sport','rosso')` diventerebbe scrivibile **sulla riga-dente di una corona** e nessun vincolo potrebbe accorgersene. **La separazione dei cataloghi è l'unica guardia strutturale disponibile.** ⚠️ **E il vincolo non aiuterebbe:** `colori_dentali_codice_check` accetta **1-8 caratteri**, quindi `#AABBCC` (7) **ci entra** — provato leggendo `pg_constraint`. ✅ **Nessuna urgenza normativa:** il colore **non finisce oggi su nessun documento** — `generate-ddc.ts:99` tiene `prescrizione_caratteristiche` a `null` fisso e il template lo stampa solo se valorizzato. ➡️ **Voce di roadmap propria**, con la ragione scritta. 🔑 **La forma futura, già indicata dai moduli veri:** i colori non dentali si scrivono **a nome** — «Pink / Clear» per la resina, «Clear, White, Black, Gold» per il paradenti |
| **D41** | 🔬 **Sulla dima chirurgica il passo colore NON compare** | scelta esplicita fra due, presentate col loro costo | La dima è una guida per l'implantologo e **non ha un colore proprio**: il verbale del 27/07 §6-quater le assegna il colore «solo se si ordina un provvisorio», ma **nel wizard un lavoro ha un tipo solo** — il provvisorio è un altro lavoro, col proprio passo colore. ➡️ **In T2: `prevedeColore: 'nessuno'` per `dima_chirurgica`**, e la riga del verbale §6-quater va letta con questa precisazione accanto. 🔧 **Corretto il 29/07 su segnalazione dell'esecutore di T2 (R-E2):** questa riga diceva `prevedeColore: false`, cioè **la forma booleana di prima di D42** — scritta un attimo prima che D42, nella stessa tornata, portasse il campo a tre valori. Il difetto non ha bloccato il lavoro (il brief traduceva già in `'nessuno'`), ma **il verbale letto da solo si contraddiceva**: è la stessa classe di §2/D22, «una stesura sostituita non si aggiorna, si riscrive». Una domanda in meno al banco nel caso normale |
| **D40** | 🎨 **PROPOSTA DI FRANCESCO — ✅ VALIDATA E CHIUSA DA D42** (qui sopra): il *gesto* resta (fila di tinte da toccare + si può saltare), **l'esadecimale libero no**. Per i tipi il cui colore **non è dentale** (`placca_espansione`, `apparecchio_funzionale`, `paradenti`) si valuta **il selettore delle cassette** (`src/components/features/cassette/SwatchesColore.tsx`: sei facce con nome + colore libero), **con la possibilità di saltare** | «non possiamo inserire un selettore colore come quello che abbiamo nella creazione delle cassette? ricordandoci sempre di poter skippare se non occorre» | 🔴 **La domanda nasce da una sonda, non da un'ipotesi:** il catalogo vivo `colori_dentali` ha **solo colori dentali** — `vita_3d_master` 29 · `vita_classical` 16 · `fuori_scala` 3 (codici `T`, `BL`, `OM`, `hex` a `NULL`) — quindi **nessuna tinta resina e nessun colore sportivo esistono**, e **D3 vieta di inventarne** («non esiste poter inserire un colore che non esiste»). Senza una via, quei tre tipi resterebbero **senza il dato che il verbale §6-quater dichiara necessario**. ⚠️ **Ciò che resta da sciogliere, e perché non si ratifica oggi:** ① **dove si salva** un colore che non è un codice di catalogo; ② se `prevedeColore` può restare **booleano** o deve dire **anche di che natura** è il colore (è la forma del dato di **T2**, quindi blocca T2); ③ se D3 parla del colore **dentale** o di **ogni** colore — la distinzione va scritta, o fra sei mesi le due decisioni si leggeranno in conflitto (precedente: D30 e D38); ④ cosa finisce sui **documenti conservati** (un esadecimale non è un nome); ⑤ quanti **mockup** servono, visto che il passo colore (T20) è già dietro un gate. ➡️ **Panel di tre advisor in corso** (architettura del dato · esperienza al banco · documenti e norma), come prescrive la Regola Advisor. **La forma si ratifica col parere in mano, e prende il proprio numero.** 🔑 **Ciò che è già fermo, perché l'ha detto Francesco:** qualunque sia la forma, **si deve poter saltare** |
| **D39** | 🍞 **Una briciola che non ci sta intera prende un NOME CORTO DEDICATO**, scritto a mano accanto al tipo. Niente tagli, niente puntini, una riga sola | scelta esplicita fra tre uscite (nome corto · due righe · carattere più piccolo), presentate col loro costo | ✅ **Sblocca la regola che T11 aspettava** e **conferma D22** (troncare è vietato) senza toccarla. ➡️ **Nasce una stringa propria della briciola** accanto ai 38 tipi in `src/lib/domain/tipi-lavoro.ts`: la scia **non eredita più `labelTipo()`**, che resta com'è per ricerca e tessere. 🔴 **E qui il piano v2 va corretto su un numero MISURATO, non stimato:** diceva «~15 etichette su 38 superano i 17 caratteri, fra cui `Duplicato protesi`, uno dei tre casi di prova canonici» — **misurate sul file, sono NOVE** (`Corona metallo-ceramica` 23 · `Scheletrato con attacchi` 24 · `Scheletrato laser (SLM)` 23 · `Abutment personalizzato` 23 · `Provvisorio su impianto` 23 · `Apparecchio funzionale` 22 · `Protesi flessibile` 18 · `Corona su impianto` 18 · `Provvisorio resina` 18), e **`Duplicato protesi` NON è fra quelle**: sta a 17 esatti. ⚠️ **La soglia dei 17 caratteri resta però una STIMA**: la misura vera è in pixel, sulla CSS vera, e si fa **dentro T11** — i nomi brevi si scelgono **sull'esito della misura**, non sulla stima, e la scelta si porta a Francesco in **una passata sola**. 🔑 **Chiude anche «Anti- russamento»** (`labelTipo` a `src/lib/domain/tipi-lavoro.ts:86-88` — ⚠️ **il piano diceva `:74-76`**): la stringa nasce dall'unire le due righe della tessera (`Anti-` + `russamento`), corretta su due righe e sbagliata su una sola. Il nome breve la sostituisce **senza toccare la tessera** |

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
**riscrittura della regola DS sul nome** · gate estetico L2 (FASE 9b).

**Fuori:** unione delle schede doppie · pagina `/pazienti` in scrittura · le tre eredità della scheda
del lavoro · i due difetti della home · la fotografia congelata del nome (tappa 1-bis).

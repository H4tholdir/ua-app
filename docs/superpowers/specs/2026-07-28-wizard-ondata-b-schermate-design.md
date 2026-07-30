# Spec — Ondata (b) del wizard «Nuovo lavoro»: le schermate

**Data:** 28 luglio 2026 · **Stato:** ✅ **RATIFICATA da Francesco** (28/07/2026, sera) · **Percorso: GRANDE** (v. §14, gate FASE 3)
**Verbale delle decisioni (D1-D20):** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`
⚠️ **La ratifica ha portato quattro emendamenti** — non è stata un «ok» secco: **D17** le briciole sono
toccabili e il ritorno conserva i passi · **D18** esce una via d'uscita esplicita, e l'abbandono volontario
azzera il salvataggio locale (più la correzione della freccia indietro, difetto contro la direttiva del
22/07) · **D19** la rete di ripresa 24h **resta com'è** · **D20** il testo d'aiuto dichiara che il codice si
può cambiare. Le quattro chiusure che la spec aveva preso da sé (§5 parametro `q`, §5 data dell'ultimo
lavoro, §6 predicato dell'indice, §7 bozza `v:1`) sono **ratificate**, con **una modifica su §5**: la data
dell'ultimo lavoro **si tiene**, non si degrada.
**Spec madre (già ratificata 27/07):** `docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md` — §5 e §12
**Mockup approvati:** `docs/design/mockups/2026-07-28-wizard-passo-paziente.html` (variante **A**) ·
`…-wizard-avanzamento-passi.html` (variante **3**).
⚠️ Per denti e colore i mockup del 27/07 sono approvati **nella forma ma non nella larghezza** — v. §15,
e non darli per chiusi. **Tre superfici non hanno ancora nessun mockup**: sempre §15.

> Questa spec **non ripete** la spec madre: la presuppone. Le sigle `W*n*` rimandano alle 23 decisioni
> del verbale del 27/07; le sigle `D*n*` alle **16** di oggi.

---

## 1. Perché esiste

L'ondata (a) ha reso denti e colore **un dato vero** (righe in `lavori_denti`), ma **a grafica invariata**:
il wizard di oggi chiede ancora tre cose — dentista, tipo, paziente — e tratta il resto come accessorio.
Restano aperti quattro difetti **verificati**, non ipotizzati:

1. **Il wizard non ritrova mai un paziente: ne crea uno nuovo quasi sempre.** Il codice proposto è
   `PZ-<max+1>` (`dati-wizard.ts:44-50`), e la ricerca del paziente esistente confronta **quel** codice
   (`crea-lavoro.ts:214`): il confronto non può quasi mai colpire. `pazienti` non è un'anagrafica, è un
   registro dei lavori — con **916 righe** su 294 lavori (baseline 28/07).
2. **Due caselle non arriverebbero a nulla.** `crea-lavoro.ts:229-230` manda `nome: ''` e
   `cognome: alias || pz`, **fissi nel codice**. È la riga che decide se D2 ha un effetto.
3. **Niente impedisce due pazienti con lo stesso codice.** `codice_paziente TEXT` nudo
   (`supabase/schema.sql:461`): nessun UNIQUE, nessun indice. E il numero si calcola **su tutto il
   laboratorio** (`dati-wizard.ts:106,128`) mentre la ricerca filtra **per dentista**
   (`crea-lavoro.ts:209`).
4. **Il conteggio dei passi mentirebbe.** `ProgressDots` presuppone 3 passi fissi
   (`src/components/ds/ProgressDots.tsx:43`, `aria-label="Passo N di 3"`), ma i passi variano col tipo.

---

## 2. Perimetro

**DENTRO** — wizard adattivo sui 38 tipi (W2) · **passo paziente rifatto** (§4) · **ricerca del paziente**
(§5) · **unicità del codice paziente** (§6) · **avanzamento a briciole, toccabili** (§3, §3.1 D17) ·
**via d'uscita esplicita dal wizard + correzione della freccia indietro** (§3.2, D18) · passo denti con
l'odontogramma v3 e le illustrazioni (W15/W18) · passo colore sui soli denti scelti (W19) · **passo foto
sempre presente** (D8) · cassetta come ultimo passo saltabile (W4) · **rimozione di «Dimmelo a voce»**
(D13) · **bozza portata a `v:2`** (§7) · **riscrittura della regola DS sul nome del paziente** (D7, già
fatta) · **FASE 9b, gate estetico L2**
· 🆕 **L'ALBUM DELLE FOTO SULLA SCHEDA DEL LAVORO** *(emendamento 30/07/2026 — **D60** ha spostato qui la
metà «guardare le foto» dell'ondata (c))*: carta con foto grande · **visore a tutto schermo** · categoria
**chiesta allo scatto** · **eliminazione** con conferma e traccia · la colonna `categoria` (migration).
🛑 **Questa riga mancava, e l'assenza non era innocua:** l'elenco qui sopra *sembrava* completo dal 28/07
mentre il perimetro era cresciuto il 29 — la stessa classe di difetto della voce 57 e del ruolo
`admin_sistema`. **Spec propria, che questa NON duplica:**
`docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md`.

**FUORI, tracciato:** unione di due schede doppie · pagina `/pazienti` in scrittura · le tre eredità della
**scheda del lavoro** (tendina 19/48, colore di caso non correggibile alla creazione, tre zone senza dente)
· i due difetti della **home** · la fotografia congelata `paziente_nome_snapshot` (tappa 1-bis, voce 5
della roadmap, panel normativo) · i 10 ritrovamenti del §6 del verbale.

---

## 3. L'avanzamento: le briciole (D10)

`ProgressDots` **esce dal wizard**. In testata, accanto al tasto indietro, compaiono le **scelte già
fatte**, in pastiglie: `Dr. Puleo` → poi `Dr. Puleo · Overdenture`.

🟡 **E allora il componente resta orfano — censimento eseguito, non assunto.** `ProgressDots` è usato in
**due posti soli**: il wizard (`WizardNuovoLavoro.tsx:29,422`) e la **vetrina** dei componenti
(`ds-v3-catalogo/page.tsx:31,80,1140-1144`). La sua seconda forma, `ProgressDotsStanze`, **è già morta**
(QA device D3, v. il commento in testa a `ProgressDots.tsx:12-29`). Tolto il wizard, **l'unico consumatore
vero sparisce**.
✅ **DECISO (D16, Francesco, 28/07): muore.** Il componente, la sua voce di catalogo
(`ds-v3-catalogo/page.tsx:31,80,1140-1144`), il suo test e **DS v3 §5.32** che lo documenta come testata del
wizard. Stessa regola applicata a «Dimmelo a voce» un'ora prima: *un componente senza consumatori non si
lascia in casa*.

- **Nessun conteggio**, quindi niente da smentire quando i passi cambiano.
- La riga è **informazione**, non decorazione: chi si distrae e torna sa cosa stava facendo.
- **Accessibilità:** l'etichetta letta dalla voce sintetica diventa il contenuto vero
  («Dr. Puleo, Overdenture»), non «Passo 2 di 3». Il contenitore resta **una sola** informazione
  (`role="img"` + `aria-label`, come oggi), non un elenco di elementi separati.
- **Vincolo di spazio:** la testata è alta 44 px e le pastiglie non devono mandare a capo. Nome studio e
  tipo si troncano con ellissi (max-width 150 px nel mockup) — **e la troncatura va misurata a 390 px**,
  non stimata.
### 3.1 — Le briciole sono toccabili, e cosa succede tornando (D17)

✅ **DECISO (D17, Francesco, 28/07, ratifica della spec):** ogni briciola è **toccabile** e riporta a quel
passo. Il mockup non le rendeva tali: **va aggiornato**.

**Il ritorno non distrugge niente.** «Lo stato dei passi già compilati resta immutato, così quando si
ritorna restano compilati come erano stati compilati» (parole di Francesco). Vale già oggi per la freccia
indietro (`WizardNuovoLavoro.tsx:226` cambia **solo** `passo`) e per il codice paziente
(`:258`, `s.pz || dati.prossimoPz` non sovrascrive mai un codice già digitato): **il precedente esiste, si
generalizza, non si inventa.**

**Il caso vero è l'altro: tornare indietro e CAMBIARE la risposta.** Allora i passi a valle possono non
avere più senso. Due situazioni concrete, entrambe reali:

| si cambia… | cosa perde senso | perché |
|---|---|---|
| **il tipo di lavoro** | denti e colore già scelti | i passi dipendono dal tipo (W2): da `overdenture` (li mostra tutti) a `anti_russamento` (non ne mostra nessuno) i dati restano senza un passo dove stare |
| **il dentista** | **il paziente scelto dall'archivio** | `pazienti.cliente_id` è NOT NULL (D11): una scheda **appartiene a uno studio**. Cambiato studio, quella scheda non è più valida — e il codice proposto va ricalcolato |

✅ **Comportamento scelto — variante (a):** UÀ avvisa **una volta sola e solo se qualcosa si perde davvero**
(«Così perdi i denti e il colore che avevi segnato. Vado?»). Se il cambio non toglie nulla, **nessun
avviso**. Scartate: **(b)** svuotare in silenzio — è la specie di difetto che questo progetto ha già pagato
(`api/lavori/[id]/route.ts:259-264`: dati scartati senza errore, e l'utente legge «Salvato»); **(c)**
conservare le vecchie risposte e rimetterle se si torna indietro — furbizia che il banco non chiede e che
raddoppia gli stati possibili.

🔑 **Conseguenza di progetto:** il calcolo «cosa si perde» **non è dell'interfaccia**. Nasce dalla stessa
funzione che decide la sequenza dei passi dal tipo (§8): *quali passi spariscono* e *quali di quelli
portavano un dato*. Una seconda lista scritta a mano sarebbe il difetto R1/R3 di nuovo.

### 3.2 — Uscire dal wizard (D18, D19)

🔴 **Verificato aprendo il file: oggi non esiste nessuna via d'uscita esplicita.** La testata porta **solo**
la freccia indietro (`WizardNuovoLavoro.tsx:421`): dal terzo passo si esce premendola tre volte, senza
conferma. Con sette passi diventa peggio.

🐛 **E la freccia, al primo passo, è un difetto vero:** `WizardNuovoLavoro.tsx:219-222` fa
`router.push('/dashboard')`. La **direttiva permanente del 22/07/2026** dice l'opposto: «indietro = pagina
precedente, OVUNQUE; `router.back()` con fallback a `/dashboard` **solo** se non c'è storia». Chi arriva
dall'elenco dei lavori e preme indietro finisce sulla home. **Dentro perimetro** (la testata si rifà
comunque) → si corregge qui.

✅ **DECISO (D18):** in testata compare una **via d'uscita esplicita**, con **conferma** («Lascio perdere
questo lavoro?»). **L'abbandono volontario azzera il salvataggio locale** (`azzeraStato()`), così la rete di
ripresa sopravvive **solo** all'interruzione **involontaria**.

✅ **DECISO (D19): la rete di ripresa resta com'è.** Non è una bozza nel gestionale — non esiste riga in
banca dati, non occupa un numero, non compare in nessun elenco: è `localStorage`, **24 ore scorrevoli
dall'ultima modifica**, legata a `userId`+`labId` (`persistenza.ts:26-79`), **una sola**, **senza foto**,
**non viaggia fra dispositivi**. Il modello di Francesco («o lo chiudi o abortisci, punto») **è già
rispettato dal gestionale**: la rete copre solo squillo/chiusura di sistema/tocco sbagliato. E con i passi
che passano da 3 a 7, **vale più di ieri, non meno**.
⚠️ Da progettare nel piano, non qui: **dove sta il tasto d'uscita** senza rubare spazio alle briciole a
390 px (§3, testata alta 44 px) e **se il gesto indietro del sistema** al primo passo debba chiedere la
stessa conferma.

---

## 3-bis. La larghezza sugli schermi grandi (D14)

Oggi il wizard è **una colonna da 480 px centrata a qualunque taglio** — `colonnaStile` in
`WizardNuovoLavoro.tsx:533-538`, e il commento in testa al file lo dichiara esplicitamente
(«full-screen a TUTTI i viewport»). La spec madre §5 prevede però, per i denti, **due arcate su tablet**
e **mappa e colore affiancati su desktop**.

**Ratificato (D14): le due cose convivono.**
- **Colonna stretta** (l'attuale) per i passi che fanno **una domanda semplice**: dentista, tipo, paziente,
  foto, cassetta. È dove il testo si legge meglio, ed è la forma pensata per il banco.
- **Larghezza piena** per **denti e colore**, dove lo spazio serve davvero.
- Il **salto di larghezza fra un passo e l'altro si accetta**, perché è il contenuto a chiederlo, e si
  rende morbido con la coreografia di passaggio (`coreografie.wizardAvanti`/`wizardIndietro`).

⚠️ **Da provare a schermo, non da assumere:** il passaggio stretto → largo e il **ritorno indietro**, che è
il caso in cui un cambio di larghezza si nota di più. Prova **B10** (§12).

---

## 4. Il passo paziente (D2, D9)

**Anatomia**, dall'alto: domanda · aiuto · `CODICE PAZIENTE` (precompilato) · `COGNOME` · `NOME` · nota ·
`Continua`.

- Il blocco **«Se vuoi, aggiungi» sparisce**: elemento e colore diventano passi propri, la foto diventa il
  passo di D8, e senza i «Salta» (D2) una riga chiusa sarebbe un bottone che non dice di essere un bottone.
- **Nessun campo con il cursore già dentro:** un `autoFocus` aprirebbe la tastiera e seppellirebbe il tasto
  «Continua».
- Più caselle nella stessa schermata **non violano «una cosa alla volta»**: rispondono tutte a **una**
  domanda. Precedente già v3 e già del wizard: `NuovoDentistaSheet.tsx:103-111` impila quattro campi.

**I testi a schermo** (sostituiscono la parola «alias», che al banco nessuno usa — voce aperta del verbale
27/07 §7.5):

| dove | testo |
|---|---|
| domanda | «Chi è il paziente?» |
| aiuto | «Il codice l'ho già scritto io — **puoi cambiarlo**. Il nome puoi aggiungerlo, o lasciar perdere.» ← **D20** |
| nota sotto le caselle | «Non serve il nome vero: va bene un soprannome, o niente. Se lo scrivi, lo ritrovi sulla targa della cassetta.» |
| paziente ritrovato | «Questo l'ho già in archivio: gli attacco il lavoro nuovo.» |

⚠️ **La frase sulla targa è vera e verificata** (`parco-shared.ts:69-75`, `Cassetta.tsx:696-702`). **Non** si
scrive «resta solo in laboratorio»: sarebbe falso, `EtichettaTemplate.tsx:117-124` stampa nome e cognome.

**Perché le caselle restano facoltative, e perché non si insiste.** Il laboratorio tratta i dati **per conto
del dentista** (responsabile ex Art. 28 GDPR: `DpaTemplate.tsx:3,120,164`; fonte `../ANALISI/17:778-781`).
Un campo che *invita* a digitare un nome mai ricevuto fa raccogliere al responsabile un dato che il titolare
non gli ha affidato. E il codice **basta**: l'Allegato XIII MDR identifica il paziente «mediante il nome,
**un acronimo o un codice numerico**» — tre alternative equivalenti.

---

## 5. La ricerca del paziente (D9, D11)

**Comportamento.** Mentre si scrive nella casella `COGNOME`, sotto compaiono i pazienti **dello studio già
scelto al primo passo** il cui cognome combacia. Ogni riga porta: cognome e nome · codice · data
dell'ultimo lavoro. Toccarne una **attacca il lavoro a quella scheda** e sostituisce le tre caselle con la
conferma («Ranucci Marta · PZ-0412»), con un modo esplicito per disfare («Non è lei? Cerca un altro
paziente»). Ignorare i suggerimenti e proseguire crea il paziente nuovo, come oggi.

**Portata: solo lo studio scelto.** `pazienti.cliente_id` è **NOT NULL** (`supabase/schema.sql:458`): un
paziente **appartiene a uno studio**. La stessa persona che arriva da due dentisti resta **due schede** —
due rapporti distinti, non un doppione da combattere. Ne segue che **la metà «dentista» di D6 decade**:
dentro un solo studio il dentista non disambigua nulla, restano nome proprio, codice e data.

**Contratto API.** Oggi `GET /api/pazienti?cliente_id=` restituisce **fino a 500 righe** con
`nome, cognome, nome_cognome, data_nascita, codice_fiscale, sesso, note`
(`src/app/api/pazienti/route.ts:31-36`).

🛑 **Quella proiezione non si manda al browser per una ricerca.** Serve una **proiezione stretta** — solo
`id, codice_paziente, cognome, nome` più la data dell'ultimo lavoro — perché la ricerca è una superficie che
si apre a ogni tasto premuto.

**✅ Scelta: (a) — parametro `q=` sull'endpoint esistente.** 🔧 **EMENDATA il 29/07 da D46 su UN punto:
la proiezione ridotta NON è condizionale — vale su ENTRAMBI i percorsi, con e senza `q`.** Questa riga
diceva «quando `q` è presente», e contraddiceva il piano (T6.1). Motivo dell'emendamento, misurato: in casa
non esiste **un solo** precedente di risposta che cambia forma col parametro (`api/clienti/route.ts:28-30`,
`api/fasi-produzione/ricerca/route.ts:34-36` applicano `q` come **solo filtro**), e l'innesto «ultimo
lavoro» sul percorso senza `q` costa **+911 buffer e +1,6 ms**, una volta per creazione di lavoro.
Nessun client si rompe (`crea-lavoro.ts:255` legge `codice_paziente` — ⚠️ **non `:213`**, coordinata
stantia riverificata il 29/07; il tipo che lo dichiara è `PazienteRiga` a `:159`, **due sole chiavi**), e
non nasce una seconda porta da proteggere allo stesso modo. Scartata **(b)** endpoint dedicato
`GET /api/pazienti/cerca`: due route sullo stesso dato sono due posti dove sbagliare il filtro di tenant.
⚠️ Il filtro `laboratorio_id = labId` e `.eq('cliente_id', …)` **non si toccano**: sono l'isolamento.

**La data dell'ultimo lavoro non esiste ancora come dato leggibile qui.** Va presa da `lavori` (max
`data_ingresso` o `updated_at` per `paziente_id`) — **una query in più, non un campo esistente**.

✅ **RATIFICATA con modifica (Francesco, 28/07): la data SI TIENE.** «Può essere un dato utile per
l'operatore che crea il lavoro.» 🛑 Cade quindi la licenza di degradare al solo codice che questa sezione
portava: **se costa, si ottimizza — non si toglie.** Il piano progetta la lettura **in una sola andata**
(aggregato per `paziente_id` sui candidati già filtrati, non una query per riga: N+1 su un campo che si
apre a ogni tasto premuto è il modo sicuro di renderlo lento) e **misura**. Se anche così non regge, non si
decide da soli: **si torna da Francesco con il numero in mano.**

---

## 6. Il codice paziente (D12)

**Resta modificabile**, e lo è già oggi: casella nel wizard · casella nella scheda paziente
(`PazienteEditSheet.tsx:182-184`) · campo nell'allowlist del server (`api/pazienti/[id]/route.ts:35`).
Coerente con la direttiva permanente «ogni campo del lavoro si corregge, fino alla consegna».

**Ma nessuno controlla che sia unico**, e questa ondata lo chiude su due piani:

1. **Nel database — la sede giusta.** Indice unico **parziale**, `WHERE codice_paziente IS NOT NULL`.
   🔑 **Mai globale:** un vincolo globale farebbe fallire l'inserimento di un laboratorio per colpa di un
   altro — un canale laterale fra tenant, cioè una fuga di informazione.

   **✅ Il conteggio è stato eseguito** (`scripts/tmp/sql.mjs`, 28/07, sola lettura):
   ```
   coppie_stesso_codice_studi_diversi: 0 · duplicati_dentro_lo_stesso_studio: 0
   pazienti_totali: 916 · archiviati: 0 · con_deleted_at: 0 · senza_codice: 1
   ```
   **Nessuna delle due chiavi possibili farebbe abortire la migration.** Quale scegliere **era** una
   decisione di dominio, non tecnica — ed è stata presa (D15, sotto la tabella):

   | chiave | tiene se… | rifiuta… |
   |---|---|---|
   | `(laboratorio_id, codice_paziente)` | il codice è di UÀ e vale per tutto il laboratorio — **è ciò che il generatore fa oggi**: `PZ-<max+1>` contato su tutto il lab | due studi che usassero **entrambi** una propria numerazione con lo stesso numero |
   | `(laboratorio_id, cliente_id, codice_paziente)` | il codice **viene dallo studio** — è ciò che dice il commento dello schema: «Codice assegnato **dallo studio** (es. "PAZ-001")» — e combacia con D11 | nulla di legittimo, ma lascia il codice **ambiguo dentro il laboratorio**, e quel codice finisce **sui documenti** |

   ✅ **DECISO (D15, Francesco, 28/07): il codice è sempre quello che propone UÀ** — nessun dentista porta
   una propria numerazione. → **chiave `(laboratorio_id, codice_paziente)`**, la più forte, e col conteggio
   in mano sappiamo che **oggi non rifiuta nulla**.
   ⚠️ **Ne segue una correzione documentale:** il commento di `supabase/schema.sql:461` («Codice assegnato
   **dallo studio**, es. "PAZ-001"») **non descrive più il sistema** e va allineato nella stessa migration —
   è la classe di difetto della voce 57: *un commento non si sbaglia, si scolla*.

   **Il predicato NON guarda lo stato del paziente.** Non `deleted_at IS NULL`, non `archiviato = false`:
   un codice già stampato su un'etichetta o su una Dichiarazione **resta impegnato** anche se il paziente
   viene archiviato. ⚠️ Nota per chi legge il codice: **le colonne di sparizione sono due** — `deleted_at`
   (schema) e `archiviato` (`002_fase2_schema.sql:118`), ed è **`archiviato`** quella che la lettura usa
   davvero (`api/pazienti/route.ts:33`). Oggi sono entrambe a zero righe: un disallineamento latente,
   riferito e non toccato.
2. **A schermo.** Se si scrive un codice già in uso, UÀ **lo dice** invece di attaccarsi in silenzio alla
   scheda sbagliata: «Questo codice è di Ranucci Marta. Vuoi il suo lavoro, o è un'altra persona?».
   🔑 Chiude anche il difetto della **bozza ferma**: una bozza di ieri riaperta oggi può portare un codice
   che nel frattempo qualcun altro si è preso.

⚠️ **Sui documenti già emessi il codice vecchio resta.** La Dichiarazione di Conformità congela (giusto:
Art. 10(8) MDR); etichetta e ricevuta leggono il dato vivo, quindi una ristampa esce col codice nuovo —
**ma l'etichetta già attaccata alla cassetta no**. Quando si cambia il codice di un paziente con lavori già
consegnati, va detto a schermo. (Superficie: scheda paziente → **fuori perimetro D1**, tracciato.)

---

## 7. La bozza del wizard: `v:1` → `v:2`

`persistenza.ts:12-24` salva `alias`, `elemento`, `colore` e un `passo` che oggi vale 1-3; `leggiStato:69`
accetta `parsed.v !== 1 → null`. Questa ondata **toglie quei campi e cambia il significato del numero di
passo**: una bozza di oggi, ripresa domani, si riverserebbe in un wizard con passi diversi.

**Decisione:** `v:2`, e la bozza `v:1` **si scarta in silenzio** (`leggiStato` già restituisce `null` per
una versione che non riconosce, e la chiave viene rimossa). Motivo: migrarla richiederebbe di indovinare a
quale passo nuovo corrisponda il vecchio «passo 3», e il costo di sbagliare (un lavoro creato con i dati di
un altro) è più alto del costo di ridigitare un wizard abbandonato da meno di 24 ore.
**Il nuovo `StatoSalvato` porta:** `v:2` · `salvatoA` · `userId` · `labId` · `passo` (indice nella sequenza
**calcolata**, non assoluto) · `cliente` · `tipo` · `pz` · `cognome` · `nome` · `pazienteIdScelto` · `denti`
· `colori`. ⚠️ La `foto` resta **fuori** (un `File` non è serializzabile): perdita accettata, come oggi.

🔑 **Il meccanismo di ripresa NON si tocca (D19):** cambia il **contenuto** del salvataggio, non la rete.
Restano identiche le 24 ore scorrevoli, la guardia `userId`+`labId` (dispositivo condiviso), l'unicità della
chiave, la chiusura non distruttiva dello sheet «Riprendo da dove eri?» e il fatto che **solo un gesto
esplicito cancella** (`RipresaSheet.tsx:16-24`). **D18 aggiunge il secondo gesto esplicito**: uscire dal
wizard con conferma azzera il salvataggio, esattamente come «Ricomincia da capo». ⚠️ Il testo dello sheet di
ripresa **è scritto sui tre passi di oggi** (`RipresaSheet.tsx:59-75`, «ti mancava il tipo», «ti mancava il
paziente»): con i passi variabili quelle frasi vanno rifatte, ed è un identificatore del censimento R-P6,
non un dettaglio.

---

## 8. Il wizard adattivo (W2, W17)

La sequenza: dentista → tipo → paziente → **[denti]** → **[colore]** → **foto** → **[cassetta]** → Fatto.

- **Quali domande compaiono lo decide il TIPO** (W2); **quando compaiono, si possono rimandare** con «Lo
  scrivo dopo» (W17). Sono **due leve distinte**.
- La tabella dei 38 tipi con «prevede denti / colore / arcata» **esiste già scritta** nel verbale del 27/07
  §6-quater (riga 352 e seguenti) ma **non è nel codice**: `TIPI_LAVORO` (`src/lib/domain/tipi-lavoro.ts`)
  porta oggi solo `id, tile, aliases, macro, classeRischio, giorniFallback` — **verificato**. Va estesa.
- **Casi di prova dell'adattività, già scritti nel verbale:** `anti_russamento` e `duplicato_protesi` non
  mostrano **nessuna** delle tre domande; `overdenture` le mostra tutte.
- **La foto NON è condizionale** (D8): è l'unica ragione per cui i due tipi qui sopra non restano senza
  fotocamera.

---

## 9. Denti, colore, cassetta — cosa vale già

**Denti** (W15, W18): odontogramma rifatto in v3, sagome ricavate dalle illustrazioni di Francesco (la
catena che le genera è in `scripts/design/`), una arcata alla volta su telefono, due arcate più fila su
tablet. Selezione = contorno che segue il dente; in scuro azzurra, mai grigia. `OdontogrammaFDI.tsx` (v2.3,
1054 righe) **muore come sostituzione**, non come rimozione.

**Colore** (W19 + D3): non si mostrano le arcate, si mostrano **solo i denti scelti**, raggruppati in
«Sopra»/«Sotto». Ricerca sempre presente, due scale in linguette.
🛑 **Il catalogo è chiuso** (D3): si sceglie da due liste, **un codice che il sistema non conosce non
esiste**. Nessuna validazione di «codice sconosciuto» da progettare, e nessun testo libero.
⚠️ L'elenco si legge dal **catalogo vivo** (`colori_dentali`, 48 codici), **mai** da una lista scritta a
mano: è esattamente lo scollamento che sulla scheda del lavoro produce oggi la casella vuota.

**Cassetta** (W4): ultimo passo, saltabile («il pacco non è ancora arrivato»); i lavori senza cassetta
devono restare visibili.

---

## 10. «Dimmelo a voce» esce (D13)

Censimento eseguito (R-P6) — **4 usi, 2 test, 1 regola**: `PassoDentista.tsx:29,93` ·
`PassoTipo.tsx:34,116` · `PassoPaziente.tsx:32,118` · `ds-v3-catalogo/page.tsx:41,78,1084-1088` ·
`tests/unit/ds-v3/componenti/PillVoce.test.tsx` (intero) · `tests/unit/PassoTipo.test.tsx:191` — **questo
fallisce subito** se si toglie il componente senza toccarlo · **DS v3 §5.15**, che oggi prescrive «PillVoce
sempre in fondo a ogni passo del wizard».
Il componente `src/components/ds/PillVoce.tsx` (254 righe) **si cancella**. Da verificare nel piano se
restano orfani la coreografia `motion.ts:56` e il token `pillVoce` di `v3/tokens.ts`: **un token orfano non
si lascia**, è la stessa specie delle dichiarazioni morte già rimosse tre volte.

---

## 11. I due scrittori da correggere

1. `crea-lavoro.ts:229-230` — `nome: ''`, `cognome: alias || pz` **fissi**. Diventano i valori digitati,
   passati **come sono**: la regola di scrittura vive già sul server
   (`api/pazienti/route.ts:110-124`, `cognomeEffettivo` poi `risolviNomePaziente`) e **non si riscrive**.
   🛑 Invarianti da non rompere: **mai `null`** (il trigger `sync_paziente_nome_cognome` compone solo se
   entrambi sono non-null, e `nome_cognome` è NOT NULL → 500 alla creazione); e **mai** lasciare il codice
   fuori da `nome_cognome` senza ripiego (la catena `??` di `precheck.ts:40-43` si ferma su `' '`, che non è
   nullish → lavoro **non consegnabile**).
2. Quando si sceglie un paziente esistente, il wizard manda il suo `id` e **non crea nulla**.

---

## 12. Le prove da scrivere PRIMA di dire «fatto»

| # | Rischio | Prova |
|---|---|---|
| **B1** | La ricerca mostra pazienti di un altro laboratorio | richiesta con `cliente_id` di un altro tenant → **404/lista vuota**, byte per byte identica a quella per un id inesistente (non enumerabile) |
| **B2** 🔧 **EMENDATA il 29/07 da D44, poi da D46 e D48** | La ricerca manda al browser dati che non servono | asserzione sulla **forma della risposta**: le chiavi sono esattamente **`id, codice_paziente, alias, ultimoLavoro`** — **quattro, non cinque** — e un test che fallisce se ne compare una quinta (per esempio `codice_fiscale`). 🔑 **D46 risponde alla domanda che questa prova non poneva — SU QUALE PERCORSO vale: ENTRAMBI**, con e senza `q`; `ultimoLavoro` è **sempre presente**, `null` quando il paziente non ha lavori (chiave **mai** omessa). 🛑 **E due requisiti sul MODO di scriverla, senza i quali passa a vuoto:** ① **il finto dev'essere GRASSO** — `tests/unit/helpers/supabase-chain-mock.ts` tiene `select` fra i metodi che lasciano passare, quindi un finto magro renderebbe questa prova verde **anche con `select('*')`**: è la stessa classe della finta infedele di T7; ② **si asserisce sul corpo HTTP parsato** (`Object.keys(riga).sort()`), e l'asserzione sulla stringa di `.select()` è **un'altra prova con un altro nome** (banda e dati che escono dal database, non ciò che arriva al browser) — confonderle è la prova tautologica di T4. 🆕 **E D48 ne aggiunge una terza, sorella:** si asserisce anche sul **predicato costruito**, perché con un filtro a testo libero il predicato è il **secondo canale** verso le colonne che la proiezione ha appena tolto, e nessuna prova lo guarda. 🔧 **Cosa è cambiato e perché:** `cognome` e `nome` **escono** e al loro posto entra **`alias: string \| null`**, prodotto da `derivaAlias` (`src/lib/cassette/parco-shared.ts:69`), che vale `null` quando il nome visibile **è** il codice. La stesura precedente («esattamente `id, codice_paziente, cognome, nome, ultimoLavoro`») era **incompatibile con T6 punto 2** del piano, che voleva un sesto campo derivato; e l'uscita che avrebbe salvato la forma — servire il cognome **già derivato** sotto la chiave `cognome` — è stata **scartata con prova**: renderebbe `cognome` una colonna in scrittura e un derivato in lettura, e un client che rimanda `cognome: ''` (911 righe su 916) fa scrivere **il codice dentro il cognome**, in silenzio. 🔑 **E questa prova sarebbe rimasta VERDE proprio attraverso quel cambiamento**, perché guarda la forma. Verbale: **D44** |
| **B3** | Due pazienti con lo stesso codice | INSERT che **deve** essere rifiutato dall'indice unico, con il messaggio incollato · e il **controllo positivo**: lo stesso codice in **due laboratori diversi** deve passare |
| **B4** | Due caselle che non arrivano a nulla | test che, dato cognome e nome digitati, il corpo spedito a `POST /api/pazienti` li porta **entrambi** — il difetto §1.2 riprodotto prima di correggerlo |
| **B5** | La bozza vecchia si riversa nel wizard nuovo | `leggiStato` su un payload `v:1` → `null` **e chiave rimossa** |
| **B6** | I passi mentono | per ogni tipo della tabella dei 38: la sequenza calcolata contiene esattamente i passi previsti — con i tre casi di prova del verbale (`anti_russamento`, `duplicato_protesi`, `overdenture`) |
| **B7** | Un componente ucciso sopravvive da qualche parte | grep di guardia: **zero** occorrenze di `PillVoce` **e di `ProgressDots`** in `src/` e `tests/` (D13, D16) — e la suite resta verde, cioè `tests/unit/PassoTipo.test.tsx:191` è stato tolto, non aggirato |
| **B8** | Bersagli sotto il minimo | Playwright a 390/768/1280 × chiaro/scuro: ogni dente ≥ 44×44, **tasto primario dentro il viewport con la tastiera aperta**, briciole non mandate a capo |
| **B9** | Il testo al 200% | ⚠️ controllo **mai eseguito davvero** (il mockup usava px fissi): va rifatto **sul device** |
| **B10** | Il salto di larghezza stordisce | passaggio colonna stretta → passo denti largo **e ritorno col tasto indietro**, guardato a 768 e 1280: nessun sobbalzo, nessun contenuto che si riposiziona due volte |
| **B11** | Tornare indietro cancella quello che avevi già scritto (D17) | dalla briciola si torna al passo e si riavanza: denti, colori, codice, cognome e nome sono **identici a prima** |
| **B12** | Cambiare il tipo perde dati **in silenzio** (D17) | cambio `overdenture` → `anti_russamento` **con denti già scelti** → l'avviso compare **una volta sola**; cambio fra due tipi che prevedono le stesse domande → **nessun avviso**. Il test fallisce sia se non avvisa mai, sia se avvisa sempre |
| **B13** | Cambiare dentista lascia attaccato un paziente di **un altro studio** (D17 + D11) | scelto un paziente dall'archivio, si torna alla briciola del dentista e si cambia studio → il paziente scelto è **rilasciato** e il codice **ricalcolato**; il corpo spedito alla creazione **non porta più** quell'identificativo |
| **B14** | L'uscita esplicita non cancella, o l'interruzione cancella (D18/D19) | uscita con conferma → chiave `localStorage` **rimossa**; smontaggio **senza** conferma (interruzione) → chiave **ancora lì**, e al rientro compare lo sheet di ripresa. Sono due asserzioni opposte: una sola non prova niente |
| **B15** | «Indietro» spara sulla home (difetto §3.2) | dal primo passo, arrivando da `/lavori` → si torna a **`/lavori`**; senza storia di navigazione → fallback a `/dashboard` |

---

## 13. Migration

Una sola, piccola: **indice unico parziale** su `(laboratorio_id, codice_paziente)`
`WHERE codice_paziente IS NOT NULL` (chiave decisa da D15, predicato motivato in §6), **più la correzione
del commento** di `supabase/schema.sql:461`, che dice «Codice assegnato **dallo studio**» e non è più vero.
**Reversibile** (`DROP INDEX`).

✅ **La precondizione è già verificata, non va rifatta:** conteggio eseguito il 28/07 in sola lettura
(`scripts/tmp/sql.mjs`) → **0 coppie duplicate**, con entrambe le chiavi possibili (§6 porta l'output).
⚠️ **Ma va riverificata se passa del tempo o se qualcuno crea lavori nel frattempo**: la migration aborta su
un duplicato, e una migration che aborta blocca il deploy e disallinea il ledger anche su dati di test.
FASE 6b (`supabase gen types` + `tsc --noEmit`) va eseguita comunque, anche se un indice non cambia i tipi
generati: costa 30 secondi e chiude il dubbio.

---

## 14. Gate FASE 3 — le cinque risposte

1. **Tenant isolation.** Non si toccano policy RLS. `pazienti` è già protetta da
   `laboratorio_id = public.current_lab_id()` (`schema.sql:487-493`), e la route filtra per `labId`. 🔑 Il
   punto di attenzione **non** è la lettura ma il **vincolo**: unico per laboratorio, mai globale (§6).
2. **Schema drift.** Sì: una migration (§13). FASE 6b prevista.
3. **Contratto API.** 🔧 **EMENDATO da D46:** la proiezione ridotta arriva **su entrambi i percorsi**, non
   solo con `q` — la risposta ha **una forma sola**, `id, codice_paziente, alias, ultimoLavoro`. Il
   chiamante non si rompe lo stesso, perché legge `id` e `codice_paziente` (`crea-lavoro.ts:255`,
   ⚠️ **non `:213`**). Il `POST /api/pazienti` non cambia forma: cambia **chi lo chiama e con quali valori**.
4. **Rollback.** UI: revert del commit. Migration: `DROP INDEX`. Dati: nessun backfill distruttivo — e
   comunque i dati in banca dati sono **di test** (`ua-app/CLAUDE.md` §8), quindi il rischio è sul
   *comportamento*, non sul *dato*.
5. **Dominio critico?** **Sì → percorso GRANDE**, per due ragioni indipendenti: c'è una **migration**
   (override esplicito della tabella di selezione) e si tocca il trattamento di **dati sanitari** con una
   deroga alla regola di pseudonimizzazione (D7).

---

## 15. Le superfici e il loro stato di approvazione visiva (§0B)

| superficie | mockup | stato |
|---|---|---|
| passo paziente + ricerca | `2026-07-28-wizard-passo-paziente.html` | ✅ **approvato** (variante A) — visto ai **tre tagli veri** (390/768/1280) in vista «schermo intero», chiaro e scuro |
| avanzamento dei passi | `2026-07-28-wizard-avanzamento-passi.html` | 🟡 **variante 3 approvata, ma il mockup è superato dalla ratifica**: non ha le briciole **toccabili** (D17 — servono stato premuto, area di tocco ≥ 44 px, ordine di lettura) né il **tasto d'uscita** in testata (D18). **Va riaperto**, ed è la superficie più stretta che abbiamo: 44 px di altezza, a 390 px di larghezza, con dentro indietro + briciole + uscita |
| passo denti / colore | mockup del 27/07 | 🟡 **approvato nella forma, larghezza DA RIVERIFICARE.** Verificato aprendo i file: `2026-07-27-arcata-ovale.html` nomina il taglio tablet/768 (5 riscontri), `2026-07-27-denti-colore-wizard.html` **non nomina né tablet né desktop** — e **D14 ha appena cambiato il comportamento della larghezza proprio su quella superficie**. ⚠️ `2026-07-27-denti-illustrazioni-vere.html` è **in `.gitignore`** (30 MB, voce 57-bis) e **vive solo su questo disco**: una sessione nuova non può riverificarlo, si rigenera con `scripts/design/` |
| **passo foto** | `2026-07-28-wizard-passo-foto-e-cassetta.html` §3 | ✅ **approvato — variante F2 (D23)**, «e PIÙ DI UNA»: rivedere, ingrandire, rifare, eliminare, aggiungere |
| **passo cassetta** | `2026-07-28-wizard-passo-foto-e-cassetta.html` §3 | ✅ **approvato — D24**: solo le libere, crea al volo, salta. Il lavoro entra subito (D30) |
| **avviso «codice già in uso»** | `2026-07-28-wizard-avviso-codice-gia-in-uso.html` §2 | ✅ **approvato — variante V1 (D25)**: sotto la casella, non ferma niente |
| **testata + uscita** | `2026-07-28-wizard-testata-uscita.html` §5 | ✅ **approvato — T2 (D21) + fila a pagine (D22, terza stesura)**. ⚠️ Rilievi aperti del panel 29/07: il taglio delle etichette lunghe, `role="img"` contro le briciole toccabili, il contatore a 34 px, il verso «avanti» mancante |

🔧 **AGGIORNATA IL 29/07/2026 — questa tabella diceva 🛑 «manca» per le prime tre superfici.** Non è più
vero da **prima che la spec fosse chiusa**: i tre mockup sono stati disegnati e le varianti **ratificate la
sera stessa** (D21-D25, quarta tornata del verbale), e ne esistono gli screenshot ai tre tagli in chiaro e
scuro. Un esecutore che leggesse questa tabella si fermerebbe a un gate che non esiste più.
| 🆕 **album foto · visore · menù ⋯ del visore · foglio della categoria** | — | 🔴 **MAI DISEGNATE.** Quattro superfici decise (D64 · D65 · D69 · D71) e mai messe su schermo: il confronto delle tre direzioni (`docs/design/mockups/2026-07-29-album-foto-tre-direzioni.html`) mostrava **la sola carta**, ed è su quello che è stata presa D64. Elenco e vincoli: `docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md` §12. 🛑 **Si mostrano DENTRO la schermata vera** (D58), 390/768/1280 × chiaro e scuro |

🔧 **AGGIORNATA IL 30/07/2026 — questa riga diceva «Restano dietro gate SOLO denti e colore», e da stamattina
è FALSA.** 🚧 **Dietro gate ci sono: denti e colore** (larghezza da riverificare, D14) **e le QUATTRO
superfici dell'album** (riga qui sopra). 🔑 **È lo stesso difetto corretto il 29/07 su questa stessa
tabella, rovesciato:** allora un esecutore si sarebbe fermato a un gate che non esisteva più, adesso
sarebbe passato **oltre quattro gate che esistono**. Una tabella che elenca gli sbarramenti è pericolosa
esattamente quanto è creduta completa.

---

## 16. ✅ Le due domande aperte — CHIUSE il 28/07

1. **D15 — il codice paziente è sempre quello che propone UÀ**: nessun dentista porta una propria
   numerazione. → chiave `(laboratorio_id, codice_paziente)` (§6), e **il commento di `schema.sql:461` va
   corretto nella stessa migration**: dice «assegnato dallo studio» e non è (più) vero.
2. **D16 — `ProgressDots` muore**: componente, voce di catalogo, test e **DS v3 §5.32** (§3).

**E la ratifica ne ha chiuse altre quattro, la sera del 28** (verbale, terza tornata):

3. **D17 — briciole toccabili**, ritorno che conserva, avviso **solo se qualcosa si perde** (§3.1). Era
   l'unica cosa che la spec rimandava al piano: **non è più aperta**.
4. **D18 — via d'uscita esplicita con conferma**, che azzera il salvataggio locale; più la correzione della
   freccia indietro, difetto contro la direttiva del 22/07 (§3.2).
5. **D19 — la rete di ripresa 24h resta com'è** (§3.2 e §7).
6. **D20 — l'aiuto dichiara che il codice si può cambiare** (§4).

---

## 17. Cosa NON è verificato

- **Quanto tornano davvero i pazienti allo stesso studio.** È il numero da cui dipende il valore di tutta
  la ricerca, e non lo sa nessuno: nessuna fonte, nessuna misura. Dichiarato, non stimato.
- ~~Se esistano coppie `(laboratorio_id, codice_paziente)` già duplicate~~ → **verificato il 28/07: zero**
  (§6 e §13). Resta vero solo il **decadimento**: se passano giorni e si creano lavori, si ricconta.
- **Il costo della query «ultimo lavoro»** per riga di suggerimento (§5).
- **Il testo primario dell'Allegato XIII** è stato letto tramite documentazione di progetto
  (`../ANALISI/`), non su EUR-Lex: la conclusione «il codice basta» regge su quella trascrizione.
- ~~**Il dato «912 pazienti su 915 senza nome»** citato altrove resta **non verificato**.~~
  ✅ **MISURATO il 29/07/2026, e la cifra approssimata era vicina ma non esatta.** Conteggio sulla banca
  dati vera: **916 pazienti · 911 senza cognome** (`cognome` nullo o di soli spazi) **· 5 con un cognome
  vero · 911 con `nome_cognome` uguale a `codice_paziente` · 1 senza codice**.
  🔑 **Non è un dettaglio statistico: decide la forma della ricerca.** Cercare nel solo cognome raggiunge
  **5 schede su 916**; cercare in `nome_cognome` ne restituirebbe **911 indistinguibili**, perché il nome
  visibile *è* il codice. ➡️ La colonna su cui si filtra va **dichiarata in T6**, non lasciata implicita.

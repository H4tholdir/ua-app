# Verbale del brainstorming — ripensamento del wizard «Nuovo lavoro»

**Data:** 27 luglio 2026 · **Stato:** IN CORSO (brainstorming BP-2 FASE 2, non ancora spec)
**Mockup:** `docs/design/mockups/2026-07-27-denti-colore-wizard.html` · `docs/design/mockups/2026-07-27-arcata-ovale.html`
**Screenshot:** `docs/design/mockups/screenshots/2026-07-27-denti-colore/`

> ⚠️ Questo è un verbale di lavoro, non una spec. Le decisioni qui sotto sono di Francesco e valgono;
> quello che non è deciso è marcato **APERTO**.

---

## 1. Decisioni ratificate da Francesco (27/07/2026)

| # | Decisione | Nota |
|---|---|---|
| **W1** | **Perimetro:** wizard adattivo + denti/colori per dente + assegnazione cassetta + prescrizione allegata. **Fuori** (mappati ora, costruiti dopo): arrivo automatico da email e dai portali scanner | Motivo: i portali dipendono da account/API di terzi e **non sono provabili** senza accesso reale — terrebbero fermo tutto il resto |
| **W2** | **Adattività:** «prevede denti / prevede colore» è **proprietà del tipo di lavoro**, ma **sempre forzabile** dall'operatore | Copre riparazioni e casi anomali senza rinunciare all'adattività. Coerente con la direttiva D10 «ogni campo si corregge fino alla consegna» |
| | 🔑 **W2 e W17 sono DUE LEVE DIVERSE, da non confondere nella spec:** **forzabile** = l'operatore può *aggiungere* denti/colore dove il tipo non li chiederebbe · **saltabile** = dove il tipo li chiede, l'operatore può *rimandare* («Lo scrivo dopo»). La prima riguarda il tipo, la seconda il singolo lavoro | |
| **W3** | **Colore nel wizard: uno per dente.** Le tre zone (collo · corpo · incisale) restano possibili **per dente**, ma si compilano nella scheda del lavoro, dove opera il ceramista | Al banco si copia la prescrizione, che porta un colore solo. Conferma esterna: iTero tiene Incisal/Body/Gingival **per dente** |
| **W4** | **Cassetta: ultimo passo del wizard, saltabile** («il pacco non è ancora arrivato»). I lavori senza cassetta devono essere visibili | Oggi il wizard **non** assegna cassetta (verificato in `crea-lavoro.ts`): si fa da pila, parete o scheda |
| **W5** | **Documenti: nel wizard solo la prescrizione** (foto o file). Radiografie, STL e resto → dalla scheda, dopo | ⚠️ **CORRETTO il 27/07 (v. §6-septies ⑩): la conservazione è di 10 anni, non 5** — i 5 anni erano del d.lgs. 46/1997, attuazione di una direttiva **abrogata**. I file dello scanner stanno sul computer, non sul telefono |
| **W6** | **Strada 1:** prima «quali denti», poi «di che colore». Due schermate, una domanda ciascuna | Rispetta L1. Strada «dipingi» **scartata** (v. §3) |
| **W7** | **Odontogramma ad arcata** (denti visti dall'alto, disposti come in bocca): **una arcata alla volta su telefono**, **ovale intero su tablet/desktop** | Misurato, v. §2. La scelta sopra/sotto **serve comunque** per i tipi senza singoli denti (W11) |
| **W8** | **Barra di ricerca** nella schermata del colore | Diventa indispensabile con W10 |
| **W9** | **Pressione prolungata su un colore → lo schermo si riempie di quella tinta**, con il codice sopra. Usabile da chiunque (front desk, tecnico, ceramista) | ⚠️ **Obbligatoria la dicitura «non è un campione di misura»** — v. §4 |
| **W10** | **Due scale colore:** VITA classical (19 voci già in codice) **+ VITA 3D-Master** (29 voci) ≈ 48 | Conseguenza: il colore non è più una stringa, è **(scala, codice)**. Le famiglie della 3D-Master si organizzano per luminosità → tinta → croma, non per lettera |
| **W11** | Per i tipi **senza singoli denti** (totale, parziale, scheletrato) la domanda **cambia forma**: tre bersagli grandi — sopra · sotto · tutt'e due. Per bite/dima/modello **non compare affatto** | Ratificato («ok per la storia dell'arcata») |
| **W12** | **Resa grafica dell'arcata: a colori, con la gengiva, il più naturale possibile.** Smalto avorio con solchi incisi, banda gengivale rosa sotto i denti, dente selezionato = **contorno spesso che segue la forma del dente** (mai un cerchio incollato sopra, mai annerire il dente) | Ratificato su mockup. In tema scuro: smalto spento e gengiva desaturata, mai gli stessi valori del chiaro |
| **W13** | **Tablet e desktop: due viste sincronizzate** — la mappa ad arcata *e* la fila ordinata. Toccare un dente in una accende l'altra. «Sfruttiamo meglio lo spazio, senza esagerare: serve sempre un po' d'aria» | Misurato: affiancarle su 768 px **non ci sta** (l'arcata scenderebbe a 39 px). Su tablet la fila va **sotto**; l'affiancamento resta possibile solo da 1280 px in su |
| **W14** | Su telefono resta **una arcata alla volta** (variante O5, preferita da Francesco) | «per i telefoni un'arcata alla volta va benissimo» |
| **W15** | **I denti NON si ridisegnano in SVG: si usano le illustrazioni di Francesco** (`docs/design/assets/arcate.png`, `strisciadenti.png`), con **sagome invisibili sovrapposte** per la selezione. Il disegno resta suo, la selezione è nostra | Proposta di Francesco: «non ti basta crearti delle maschere sui denti già disegnati?». Sì — ed è meglio: le mie sagome vettoriali non reggevano il confronto |

| **W16** | **Scheletrato: denti uno per uno.** «si può avere anche lo scheletrato per un solo dente» | Chiude il NON TROVATO della ricerca: risposto da Francesco, non dedotto |
| **W17** | **Quando la sezione dei denti C'È, si può sempre saltare** («Lo scrivo dopo»). ⚠️ **Non** vuol dire che compaia sempre: **è il tipo di lavoro a decidere se compare** — l'adattività di W2 resta piena | Chiarito da Francesco il 27/07 dopo una mia lettura sbagliata: «io intendevo nei casi in cui è prevista la sezione». **Conseguenza: la tabella dei tipi (§6-bis) NON è un di più — è la fonte che decide quando mostrare la domanda.** Per le riparazioni la sezione **c'è comunque**, perché una riparazione può essere la sostituzione di uno o più denti |
| **W18** | **In tema scuro la selezione non è grigia** (illeggibile) ma azzurra; **il numero del dente sta in una pastiglia chiara con testo scuro** e non segue il tema — il dente è bianco in entrambi i temi | Segnalato da Francesco sul mockup |
| **W19** | Nella schermata del colore **non si mostrano le arcate**: si mostrano **solo i denti scelti**, ritagliati dall'illustrazione e raggruppati in «Sopra» e «Sotto» | Nasce dalla domanda di Francesco: «se il lavoro prevede denti di entrambe le arcate, come viene gestita la cosa?». Con le arcate intere non ci sta, e comunque il colore riguarda i denti scelti, non la bocca |

### W15 — come sono state ricavate le maschere (27/07/2026)

**Non tracciate a mano: riconosciute automaticamente dall'immagine.**
`scripts/tmp/mappa-denti.py` isola i pixel di smalto (chiari e poco saturi, distinti dal rosa della gengiva),
li raggruppa in macchie connesse e ne calcola centro e ingombro; `assegna-fdi.py` ordina le macchie lungo
l'arcata con un angolo monotono e assegna i numeri FDI. Output in percentuali sull'immagine → **indipendente
dalla scala**, funziona a qualunque dimensione.

**Esiti verificati sovrapponendo i numeri all'immagine** (`scripts/tmp/verifica-mappa.png`, `verifica-striscia.png`):
- **`strisciadenti.png`: 32 denti su 32, corretti al primo colpo.** Nessuna correzione necessaria.
- **`arcate.png`: arcata superiore perfetta (16/16); arcata inferiore con 17 denti** — un incisivo di troppo.
  ⚠️ **Difetto dell'asset confermato da Francesco**, che sta rifacendo l'immagine (27/07).

**Due osservazioni sugli asset, da chiudere prima dell'implementazione:**
1. `arcate.png` pesa **2 MB** (1024×1536 RGBA) e `strisciadenti.png` **1 MB**: da convertire in WebP
   (~200 KB) prima di andare in produzione — l'utente tipo ha un telefono datato e una connessione lenta.
2. Nella striscia **la metà destra della riga superiore non è speculare alla sinistra**: il dente 11 è
   disegnato largo e piatto (incisivo centrale), il 21 stretto e appuntito. Da confermare se voluto.
3. ⚠️ **Licenza:** Francesco dichiara le illustrazioni come proprie (27/07). Nella stessa cartella erano
   presenti file con nomi da banca immagini; segnalato una volta, dichiarazione accettata, si procede.

---

## 2. Misure reali (browser, non stime) — vincolo di progetto: bersaglio ≥ 44×44 px

| Variante | Bersaglio | Fra denti vicini | Fra le due arcate | Ci sta in 660 px? | Esito |
|---|---|---|---|---|---|
| Tastiera numerica 8 colonne (390 px) | 44,25 px | — | — | non misurato | margine di **0,25 px** |
| Arcata ovale intera, telefono | 44 px | **36 px** | **18 px** | ✕ (900 px) | ✕ |
| Una arcata alla volta, telefono (O2) | 56 px | 48 px | — | ✕ **il tasto finisce 105 px sotto il bordo** | ✕ |
| **O5 — arcata singola, schermata ridisegnata** | **56 px** | **48 px** | — | **✓ (660 px, tasto visibile)** | **✓** |
| **Ovale intero, tablet 768 px** | **64 px** | **63 px** | **56 px** | ✓ (lì lo spazio c'è) | **✓** |
| «Dipingi» (una schermata sola) | 20 px | — | — | — | ✕ meno della metà del minimo |

🔴 **Il vincolo dominante NON era il bersaglio: era l'altezza.** Tutte le prime varianti spingevano il tasto
«Avanti» sotto il bordo — **lo stesso difetto trovato al collaudo del 26/07** (handoff §3). E i due vincoli
sono in tensione diretta: per avere 44 px fra denti vicini serve un'arcata alta **≥ 330 px** (misurato:
280 px → 41,8 px; 330 px → 47,6 px), che da sola occupa metà schermo.

**O5 li soddisfa entrambi**, togliendo il superfluo: identità dentro la testata, **niente riga «hai
scelto»** (i denti scelti si vedono già sull'arcata), tasto **ancorato in basso** — lo schema del pannello
dei clienti, che risolveva già questo problema. Nessuna invenzione: si copia il gemello.

**Due errori di metodo corretti in corsa, che spiegano i numeri:** (a) i denti erano distribuiti a passo
d'angolo costante — su una curva questo li ammucchia agli estremi; vanno distribuiti a **distanza costante
lungo l'arco**; (b) l'ovale era troppo tondo: un'arcata reale ha i lati quasi paralleli (superellisse,
esponente ≈ 2,6).

⚠️ **Controllo NON eseguito:** il gate «testo al 200%» della spec DS v3 §10.4. Il mockup usa misure fisse
in px, quindi ingrandire il font di root non muove nulla: il test è passato **senza misurare niente**.
Va rifatto sul device vero prima della ratifica.

---

## 3. Perché la strada «dipingi» è stata scartata

1. **Misura:** con la tavolozza in alto, ai denti restano 20 px — meno della metà del minimo.
2. **Una protesi totale ha un colore ma non ha denti FDI**: non si può dipingere su elementi che non
   esistono, servirebbe un secondo comando sulla stessa schermata → L1 violata due volte.
3. **Il trascinamento contraddice la grammatica dei gesti già ratificata** (DS §5.35: movimento > 8 px
   annulla la pressione, vince lo scorrimento).
4. **Insegna il gesto sbagliato:** il colore lo sceglie il dentista in studio; il laboratorio lo **riceve
   scritto**. Qui è un codice da trascrivere, non una tinta da accoppiare a vista.

---

## 4. Il colore a tutto schermo (W9) — cosa è e cosa non è

**Vale la pena farlo:** nessun software del settore mostra a schermo il colore che sta prescrivendo
(ricerca 27/07) — restano tutti codici in un menù a tendina. E i valori colorimetrici di ogni tacca VITA
sono **misurati e pubblicati liberamente** (Bayindir et al., *J Prosthet Dent* 2007;98:175-185), quindi si
può fare con i valori veri invece che con approssimazioni.

**Ma non è un campione di misura, e va scritto sullo schermo:**
- il colore reso dipende dal pannello, dalla calibrazione e dalla luce ambiente;
- **la ceramica è traslucida**: un campione pieno non può rappresentarla;
- una decisione clinica presa guardando il telefono è una decisione sbagliata su un dispositivo medico.

**Uso legittimo:** orientarsi sulla famiglia, confrontare due codici, accorgersi che la prescrizione dice
`A1` mentre la foto allegata mostra un dente scuro. **Uso illegittimo:** stabilire la tinta.

---

## 4-bis. 🔴 Il colore nella Dichiarazione di Conformità — verifica normativa chiusa (27/07/2026)

**Domanda:** il colore è obbligatorio nella dichiarazione per dispositivi su misura?

**Risposta: non in quanto colore — ma sì quando la prescrizione lo indica.** L'Allegato XIII, sezione 1,
elenca fra i contenuti obbligatori della dichiarazione:

> **«le caratteristiche specifiche del prodotto indicate nella prescrizione»**
> (EN: *«the specific characteristics of the product as indicated by the prescription»*)

Verificato su due fonti indipendenti: [medical-device-regulation.eu — Annex XIII](https://www.medical-device-regulation.eu/2019/08/14/annex-xiii/)
(testo inglese, elenco completo) e la resa italiana su [medicaldevicenews.eu](https://www.medicaldevicenews.eu/MDR/pagina/allegato-xiii-procedura-per-i-dispositivi-su-misura-5cdeaa63b1c61131d9c646ee.html).
Il testo **non nomina** shade, colore, dente o arcata: nomina la **categoria**.

**La catena che vincola UÀ, in tre passi:**
1. la dichiarazione deve riportare le caratteristiche specifiche **indicate nella prescrizione**;
2. per una corona, un ponte, una faccetta, **la prescrizione indica il colore** (è uno dei campi ricorrenti
   in ogni modello di prescrizione trovato — v. §8);
3. quindi per quei dispositivi **il colore è una caratteristica indicata nella prescrizione**, e la
   dichiarazione lo deve riportare. Oggi non lo riporta.

**Perché il dente sì e il colore no, oggi:** non c'è una ragione normativa — vengono dalla stessa riga
dell'Allegato XIII. È una dimenticanza di implementazione, non una scelta.

**⚠️ PRECISAZIONE (aggiunta dopo la terza tornata di ricerca — corregge la lettura iniziale):**
la DdC **non ha e non deve avere un campo strutturato «colore»**. Due modelli italiani di dichiarazione
costruiti su MDR sono stati aperti e letti — [Veneto GL MDR SNO](https://www.osservatoriobiomedicaleveneto.it/wp-content/uploads/2017/02/Documenti-accompagnatori-DMSM-1.pdf)
e [CNA SNO Odontotecnici](https://www.cnalariobrianza.it/sites/default/files/news/files/2021-05/guida%20dic%20mdr%20745.pdf):
**nessuno dei due ha un campo dente o colore.** Hanno un campo unico di **testo libero** —
`Caratteristiche specifiche indicate nella prescrizione` — e l'esempio del Veneto ci scrive dentro
`PROTESI FISSA IN METALCERAMICA / ELEMENTO A 34`.
➡️ Quindi l'obbligo si soddisfa **facendo comparire dente e colore nella descrizione**, non aggiungendo una
colonna. È una differenza di lavoro non piccola: cambia il template della DdC, non il suo schema.

**Conseguenze dirette sul modello dati** (queste, non l'estetica, decidono la forma):
- il colore per-dente **va congelato al momento della consegna**, come già si fa col nome del paziente
  (`paziente_nome_snapshot`): un documento a valore legale non può cambiare dopo l'emissione;
- la resa nel documento va **collassata** («13-23: A3»), altrimenti un lavoro monocromatico stampa sei righe
  identiche;
- ⚠️ **`ANALISI/17` §contenuto obbligatorio va annotata** con questa catena: oggi elenca «colore» fra gli 8
  elementi senza dire da dove discende, e messo così sembra un obbligo diretto che nel testo non c'è.

---

## 5. Che cosa esiste già in casa (verificato nel codice)

- **`OdontogrammaFDI.tsx`** (1048 righe) + `denti-fdi.ts`: odontogramma completo con sagome anatomiche,
  stati selezionato/mancante/impianto, menu a pressione prolungata. **È DS v2.3** (DM Sans, token vecchi) e
  **fallisce i gate**: hit-area 19-26 px di larghezza, numero FDI a 8 px (minimo di spec: 12,5). Il disegno
  dei denti si riusa; l'impianto no.
- **`TIPI_LAVORO`** (`src/lib/domain/tipi-lavoro.ts`): 38 tipi con macro-famiglia e classe di rischio. **Non
  contiene** l'informazione «prevede denti / prevede colore» → è quella da aggiungere per W2.
- **Schema `lavori`**: esistono già `da_portale`, `prescrizione_digitale_id`, `numero_prescrizione`,
  `impronta_digitale`, `file_stl_url`, `denti_impianti`, `denti_mancanti`, `arcata`, `tecnica_colore`.
  Esistono le tabelle `lavori_immagini`, `prescrizioni_digitali`, `lavoro_prove`, `cassette_lavori`.
- **Il colore vive in 4 colonne del lavoro intero** (`colore_dente`, `colore_collo`, `colore_corpo`,
  `colore_incisale`) — **è questo che rende W3 impossibile senza migration**. Lettori da censire prima di
  toccarle: `DdcTemplate.tsx`, `generate-ddc.ts`, `api/fatture/[id]/xml`, `api/fatture/batch`,
  `TabClinica.tsx`, `SchedaLavoroV3.tsx`, `RigaLavoroDenti.tsx`, `api/lavori/[id]/route.ts`.

---

## 6. Difetti in produzione da chiudere dentro questo lavoro

1. **Il dente «es. 2.6»** — il wizard suggerisce il formato con il punto (`PassoPaziente.tsx:85`), salva la
   stringa grezza (`crea-lavoro.ts:195`), ma l'odontogramma legge solo interi (`TabClinica.tsx:28`): il dente
   non si accende, il tecnico ne tocca un altro e **il lavoro ne dichiara due**. Nessuno se ne accorge: il
   precheck di consegna non nomina né denti né colore, e la DdC stampa il valore grezzo.
2. **Denti e colore sono salvati fail-soft** (`crea-lavoro.ts:187-203`): una PATCH separata dopo il POST che,
   se fallisce, perde il dato **in silenzio**. Se il wizard chiede dieci tocchi di dato clinico, quel dato
   **non può restare un accessorio**.
3. **Il tasto «Salta»** su una riga chiusa non fa nulla (`PassoPaziente.tsx:129-132`, col commento che lo
   ammette).
4. 🔴 **Il colore NON compare nella Dichiarazione di Conformità — ed è una lacuna vera.** Verificato:
   `DdcTemplate.tsx` non contiene nessuna occorrenza di «colore» — stampa solo i denti (`dentiFormatted`,
   righe 258-259 e 405-408). **Questa è la voce 3 della roadmap, e la ricerca normativa del 27/07 la chiude
   (v. §4-bis).**
5. **La fattura elettronica legge i colori dal vivo** dalla tabella `lavori`
   (`api/fatture/[id]/xml/route.ts:109-112`) — non da uno snapshot congelato.
   ⚠️ **NON è un vincolo di migrazione** (correzione, Francesco 27/07): i dati in DB sono **solo di test** e
   si ripuliscono alla consegna — `ua-app/CLAUDE.md` §8 lo dice già. La fedeltà del dato migrato **non conta**;
   contano schema, RLS e robustezza dell'applicazione. Resta invece vero come **fatto architetturale**: se
   domani il colore dovrà comparire in un documento emesso, la fonte va congelata (v. §4-bis).

---

## 6-bis. 🔑 La tabella dei tipi — parte VERIFICATA su moduli di prescrizione reali (27/07/2026)

Dodici moduli di prescrizione di laboratori veri, scaricati e letti (fonti in fondo alla riga). **Questa
parte non è un'ipotesi: è ciò che i moduli contengono davvero.**

| Dispositivo | Denti | Colore | Arcata | Prova |
|---|---|---|---|---|
| Corona singola (zirconia / e.max / metallo-ceramica) | **sì** | **sì** | no | `TOOTH #` + `SHADE` + `STUMP SHADE` |
| Ponte | **sì** | **sì** | no | idem, blocco condiviso |
| Faccetta | **sì** | **sì** | no | `Veneer` sotto `CASE TYPE / TOOTH` |
| Intarsio / onlay | **sì** | **sì** | no | `Inlay/Onlay`, stesso blocco |
| **Perno moncone** | **sì** | **sì** (a livello di caso) | no | ⚠️ **la mia ipotesi era sbagliata**: avevo detto «colore no» |
| **Abutment personalizzato** | **sì** | **NO** — nessun campo colore | no | ha solo il materiale: `Titanium / Zirconia / Gold Hue` |
| **Barra per overdenture** | **NO** | **sì, obbligatorio** | non trovato | ⚠️ **l'opposto della mia ipotesi**: niente denti, ma il colore è required |
| Corona su impianto | **sì** | **sì** | no | blocco `IMPLANT DESIGN` + chart + `SHADE` |
| Ponte su impianti | **sì** | **sì** | no | idem |
| **Toronto / full-arch** | **NO** | **sì** (`TOOTH SHADE` + `GINGIVA SHADE`) | **sì** | `Max / Mand` per riga di dispositivo |
| **Dima chirurgica** | **sì** (posizioni implantari) | **solo se si ordina un provvisorio** | **sì** | `Arch: Maxillary / Mandibular / Both` |
| **Modello 3D stampato** | no | no | **sì** | `Max Mand` sopra la riga `PRINTED MODEL` |

**🔑 La regola strutturale che ne esce, e vale come legge di progetto:**
> Sui moduli di protesi fissa **non esiste alcun controllo di arcata**: l'arcata è portata dall'odontogramma.
> Un selettore d'arcata esplicito compare **solo** su full-arch, dime chirurgiche e modelli stampati.
> **I dispositivi per-dente deducono l'arcata dai denti; solo i dispositivi per-arcata la chiedono.**

**Seconda regola verificata:** il *colore del moncone* (stump shade) **non è universale — dipende dal
materiale**: è richiesto per zirconia / e.max / metal-free, **non** per metallo-ceramica e fuso.

**Terza conferma:** denti e colore sono **indipendenti** — la barra ha il colore senza denti, l'abutment ha
i denti senza colore. Vanno modellati come due domande separate, mai come una coppia.

Fonti: [Trident](https://tridentlab.com/wp-content/uploads/2020/06/TDL_RxForm-March242020r2.pdf) ·
[Roe Fixed](https://www.roedentallab.com/hubfs/PDFs/Rx/fixed-rx.pdf) ·
[Roe Full-Arch](https://www.roedentallab.com/hubfs/PDFs/Rx/Full-Arch-Rx.pdf) ·
[Roe Guides](https://www.roedentallab.com/hubfs/PDFs/Rx/Surgical-Guides-Rx.pdf) ·
[DDS Ltd](https://www.ddsltdlab.com/assets/rx-form.pdf) ·
[PFD](https://pfddigital.com/wp-content/uploads/2024/02/RxForm.pdf) ·
[Peterson — barra](https://petersondentallab.com/wp-content/uploads/2021/09/Overdenture-Bar-Overdenture-Rx.pdf) ·
[ADL Hybrid](https://adldental.com/wp-content/uploads/2017/07/7525-Fixed-Hybrid-Rx-Form-V2-Print.pdf)

**Risposte di Francesco (27/07), da integrare:** scheletrato **con denti → il colore serve** · protesi totale
→ **la gengiva non ci interessa** (quindi il `GINGIVA SHADE` dei moduli americani non si adotta) ·
riparazioni → **dipende dalla richiesta del clinico, serve una soluzione apposta**.

**Seconda tornata di ricerca (27/07) — righe aggiunte, con prova:**

| Dispositivo | Denti | Colore | Arcata | Prova |
|---|---|---|---|---|
| Protesi parziale (resina / scheletrato) | dipende | **sì — DUE colori distinti**: denti *e* resina | **sì** | modulo ufficiale Wisconsin/Illinois: riga `Teeth:` separata da `Acrylic Colors:` |
| Protesi totale | non trovato | **sì** | **sì** | provata solo di rimbalzo dal modulo del parziale |
| Apparecchi ortodontici, contenzioni | dipende | colore **della resina**, non VITA | **sì** | `Acrylic Color: Pink / Clear / #___` |
| **Contenzione fissa incollata** | **sì** | no | **sì** | «*Indicate teeth to be bonded*» sopra lo schema `3 2 1 \| 1 2 3` |
| Bite / anti-russamento | non trovato | non trovato | **sì** | caselle `U \| L` |
| Mantenitori di spazio, Nance, pedo partial | dipende | no | **sì** | `Band & Loop (Unilateral)`, `Distal Shoe`, `Nance`… |
| **Corona pediatrica in zirconia** | **sì** (per tipo di dente) | **NO — tinta unica** | implicita | «*EZCrowns come in **one** esthetic, polychromatic shade*» |
| **Riparazione / ribasatura** | **NON TROVATO** | **NON TROVATO** | **NON TROVATO** | nessun modulo di *denture repair* aperto direttamente |

Altre due cose utili emerse dai moduli:
- **Denti e arcata stanno in un campo solo:** «*Indicate Teeth Number(s)/**Arch***» — coerente con la regola
  strutturale qui sopra.
- **Come si segnano i denti sulla carta:** «*Circle for single units, **bracket** for bridge and splinted
  units*» — il ponte si indica con una parentesi che abbraccia gli elementi, non con denti sciolti.
  ⚠️ Da valutare per la nostra mappa: oggi selezioneremmo 13-12-11 come tre denti separati, mentre sulla
  prescrizione sono **un ponte**. Il dato «sono un pezzo solo» oggi si perderebbe.

**Terza tornata (27/07) — riparazioni, apparecchi, e la fonte italiana:**

| Dispositivo | Denti | Colore | Arcata | Prova |
|---|---|---|---|---|
| **Riparazione di frattura** | **no** | **no** | no | `Fracture Repair` è una riga nuda, senza campi accanto |
| **Sostituire / aggiungere un dente** | **sì** | **sì** | sì | `Replace Teeth #`; su modulo AU: `Mark O to add to denture and X for immediate replacement` + griglia FDI + `Tooth Shade` |
| **Ribasatura / rebase** | **no** | **no** | dipende | `Reline` `Reline w/ Soft Liner` `Rebase Denture` — nessun campo denti/colore su quelle righe |
| Aggiunta gancio | no | no | no | `Add Clasp (clasp type)` |
| **Hawley / ortodonzia mobile** | dipende | **due colori distinti**: `Shade` (denti) **e** `Acrylic Shade: Pink / Other` | **sì** | `Arch*: Upper / Lower / Both` |
| Contenzione (DynaFlex) | **sì** | solo del pontic | **sì** | `*Indicate teeth to be bonded` |
| **Allineatori** | **sì** — per *escluderli* | no | **sì** | `Exclude teeth (mark below)`, `EI - Exclude from IPR`, `EA - Exclude from Attachments` |
| Espansori (RPE/Haas/Hyrax) | no | no | **sì** | `ARCH DEVELOPMENT … U / L` |
| **Bite / splint occlusale** | **no** | **no** | **sì** | `CHOOSE ARCH: UPPER / LOWER` + `CHOOSE DESIGN` |
| **Paradenti sportivo** | no | **sì, ma NON VITA** | **sì** | `MOUTHGUARD COLORS: Clear White Black Gold…` + `2 COLOR OPTION: Left / Right` |
| Anti-russamento (MAD) | **NON TROVATO** | **NON TROVATO** | **NON TROVATO** | nessun modulo di laboratorio dedicato, dopo quattro passate |

### 🇮🇹 La fonte italiana — un modulo di prescrizione di un laboratorio vero

[Prescrizione Odontolab Costa](https://www.odontolabcosta.it/Prescrizione.pdf) — **un modulo unico per ogni
dispositivo**, non uno per famiglia. Campi:
`griglia FDI 18…28 / 48…38` · **`COLORE` + `CAMPIONARIO`** · `BRUXISTA` ·
`ALTRI DISPOSITIVI PRESENTI E LORO MATERIALI COSTITUTIVI` ·
`PARTICOLARI PRECAUZIONI DA ADOTTARE NELLA FABBRICAZIONE` ·
`SI RICHIEDE PER IL PAZIENTE — COGNOME E NOME OVVERO CODICE FISCALE`.

**Tre conferme che valgono per il nostro progetto:**
1. **`CAMPIONARIO` accanto a `COLORE`** = si dichiara *quale scala* si sta usando. È esattamente la decisione
   W10 (colore = **scala + codice**, non una stringa sola), e qui è pratica italiana corrente.
2. **L'arcata NON è un campo del dispositivo**: `SUP`/`INF` compare solo sotto `MODELLI STUDIO`. Terza
   conferma indipendente della regola strutturale.
3. I campi `BRUXISTA`, `ALTRI DISPOSITIVI`, `PRECAUZIONI` esistono **già** nel nostro schema
   (`anamnesi_bruxismo`, `anamnesi_altri_dispositivi`, `anamnesi_precauzioni`): il modello dati era giusto.

⚠️ Il modulo **ortodontico** italiano ([Zanichelli, stessa famiglia di layout](https://online.scuola.zanichelli.it/fdg-files/pdf/M02_Ud09_Moduli_9342.pdf))
**non ha né griglia FDI né campo `COLORE`**: i denti entrano solo come testo libero dopo «su ____».
Conferma che per l'ortodonzia le due domande non si pongono.

🛑 **Resta NON TROVATO e va chiuso con Francesco:** lo **scheletrato** — se la prescrizione elenchi i denti
mancanti con la loro numerazione o solo l'arcata. (La risposta di Francesco del 27/07 dice che **se porta
denti il colore serve**; sui denti la domanda resta.)

---

## 6-ter. 🔴 I PAZIENTI PEDIATRICI — risposta completa (ricerca 27/07, domanda di Francesco)

**a) La numerazione dei decidui è confermata, e il codice è già giusto.** Quadranti **5-8** (5 = alto destro,
6 = alto sinistro, 7 = basso sinistro, 8 = basso destro), cinque posizioni per quadrante, **20 denti**:
55-51 · 61-65 · 85-81 · 71-75. Coincide esatta con `DENTI_DECIDUO` in `denti-fdi.ts`.
Fonti: [European Journal of Paediatric Dentistry](https://www.ejpd.eu/wp-content/uploads/pdf/EJPD_2015_2_15.pdf)
(«*5 through 8 for deciduous teeth*», «*the 20 primary teeth*») · conferma indipendente da
[Open Dental](https://opendental.com/manual/graphicaltoothchart.html) («*51-85 for primary teeth*»).

**b) 🛑 LA DENTIZIONE MISTA ESISTE, E VA MOSTRATA INSIEME — il nostro componente attuale è sbagliato.**
I denti da latte compaiono dal 7° mese e sono **sostituiti completamente entro i 12 anni**: fra gli 8 e i 12
il bambino ha **le due dentizioni insieme in bocca**. Open Dental non fa scegliere: ha un default
(permanente), uno stato **per singolo dente**, e un comando «*Set Mixed Dentition: change the tooth chart to
show a **combination** of primary and permanent teeth (**8-12 year olds**)*» —
[manuale](https://opendental.com/manual/missingteeth.html).
➡️ **Conseguenza diretta:** `OdontogrammaFDI.tsx` oggi ha due tasti «Adulto | Deciduo» che si escludono.
**Quel modello non regge la realtà.** La dentizione va per **dente**, non per schermata.

**c) 🔑 Il colore VITA NON è adatto ai denti da latte.** Studio Paravina et al., *Development of a model
shade guide for primary teeth* (Eur Arch Paediatr Dent, 2008, DOI 10.1007/BF03262613): «*Large disparities in
colour ranges and distribution between primary and permanent teeth make shade guides for permanent teeth
**unsuitable** for primary teeth applications*». Misurati 612 denti decidui su 102 pazienti: l'errore di
copertura della **Vitapan Classical** sui decidui è **4.2** contro 1.8-1.3 di una scala costruita apposta.

**d) Ma in pratica il problema quasi non si pone — ed è la parte che conta.** I lavori che si fanno davvero
sui bambini sono **ortodonzia** (dove il «colore» è quello della resina: `Pink / Clear / #___`, non VITA) e
la **corona pediatrica in zirconia**, che **non ha scelta di colore**: «*EZCrowns come in **one** esthetic,
polychromatic shade*» ([Sprig](https://sprigusa.com/products/ezcrowns/)).
➡️ **Quindi: sui bambini il colore VITA quasi non si chiede.** Non serve una seconda scala pediatrica; serve
che il wizard **non chieda un colore VITA dove non c'entra**, che è la stessa regola dell'adattività (W2).

**e)** Lo schema dentale stampato sui moduli ortodontici riporta **solo posizioni permanenti** (`8 7 6 5 4 3
2 1 | 1 2 3 4 5 6 7 8`), nessuna riga A-E per i decidui. [inferenza dal testo estratto: assenza nel PDF non
è prova assoluta di assenza sulla carta]

---

## 6-quater. 🔴 I 38 TIPI DEL CATALOGO — la tabella che il wizard deve leggere

Questa è la fonte che decide **quali domande compaiono** (W2 + W17 corretta). I 38 id sono quelli reali di
`src/lib/domain/tipi-lavoro.ts`, non un elenco inventato.

**Legenda della colonna «prova»:** ✅ = trovato su moduli di prescrizione veri (§6-bis) · ⭐ = deciso da
Francesco · ❓ = **mia proposta, da correggere** — sono le righe su cui serve la sua parola.

| id (catalogo) | Denti | Colore | Arcata | prova |
|---|---|---|---|---|
| `corona_zirconia` · `corona_disilicato` · `corona_metallo_ceramica` | **sì** | **sì** | dedotta | ✅ |
| `ponte_zirconia` | **sì** | **sì** | dedotta | ✅ |
| `faccetta` | **sì** | **sì** | dedotta | ✅ |
| `intarsio` | **sì** | **sì** | dedotta | ✅ |
| `perno_moncone` | **sì** | **sì** | dedotta | ✅ (smentiva la mia ipotesi) |
| `corona_impianto` · `ponte_impianti` | **sì** | **sì** | dedotta | ✅ |
| `toronto` | no | **sì** | **sì** | ✅ |
| `barra_overdenture` | **sì** | **no** | **sì** | ⭐ ⚠️ **diverge dai moduli USA** (v. nota sotto) |
| `abutment` | **sì** | **no** | dedotta | ✅ |
| `overdenture` | **sì** | **sì** | **sì** | ⭐ «*protesi rimovibile che si fissa a impianti o radici naturali*» — tutte e tre |
| `provvisorio_impianto` · `provvisorio_resina` · `provvisorio_cad` · `mockup` | **sì** | **sì** | dedotta | ✅ (fissa) |
| `protesi_totale` · `totale_digitale` | no | **sì** (denti del commercio; **gengiva NO**) | **sì** | ✅ + ⭐ |
| `parziale_resina` · `protesi_flessibile` | **sì** (quali mancano) | **sì** | **sì** | ✅ |
| `duplicato_protesi` | **no** | **no** | **no** | ⭐ «basta dire uguale» — si duplica un manufatto esistente, non si ridescrive |
| `scheletrato` · `scheletrato_attacchi` · `scheletrato_slm` · `scheletrato_peek` | **sì, uno per uno** | **sì se porta denti** | **sì** | ⭐ |
| `placca_espansione` · `apparecchio_funzionale` | no | resina, **non VITA** | **sì** | ✅ |
| `contenzione` | **sì** (quali incollare) | no | **sì** | ✅ |
| `allineatori` | **sì** (quali *escludere*) | no | **sì** | ✅ |
| `bite_michigan` · `bite_morbido` | no | no | **sì** | ✅ |
| `paradenti` | no | colore **sportivo**, non VITA | **sì** | ✅ |
| `anti_russamento` (MAD) | **no** | **no** | **no** | ⭐ «*mascherine che coinvolgono entrambe le arcate, quindi non va selezionato niente*» — l'unico tipo che non chiede nulla |
| `dima_chirurgica` | **sì** (siti implantari) | solo se si ordina un provvisorio | **sì** | ✅ |
| `modello_3d` | no | no | **sì** | ✅ |
| `riparazione` · `ribasatura` | **sì, ma saltabile** | **sì, ma saltabile** | dedotta | ⭐ |

✅ **TABELLA COMPLETA — tutte e 38 le righe chiuse** (27/07/2026): 24 da moduli di prescrizione veri,
14 da decisione esplicita di Francesco. Nessuna riga dedotta.

⚠️ **«Arcata: dedotta»** significa che NON si chiede: si ricava dai denti indicati (regola strutturale §6-bis).

### Note sulle righe decise da Francesco

- **`riparazione` / `ribasatura` — il caso che ha generato la regola W17.** «*Di solito si prevede solo una
  riparazione del manufatto, ma potrebbero esserci casi in cui la riparazione si intende la sostituzione di
  uno o più denti di un'arcata, quindi dipende dai casi*». Non essendo decidibile dal tipo, **la sezione si
  mostra e si può saltare**. È l'unico caso in cui il default è «mostra, ma probabilmente non serve».
- ⚠️ **`barra_overdenture` — divergenza dichiarata.** Il modulo americano
  [Peterson](https://petersondentallab.com/wp-content/uploads/2021/09/Overdenture-Bar-Overdenture-Rx.pdf)
  ha `Shade ______ (REQUIRED)` e **nessun campo denti**; Francesco dice l'opposto (denti e arcata sì, colore
  no). **Vale la decisione di Francesco** — Statuto delle fonti: la decisione esplicita è prova valida, e la
  prassi italiana può legittimamente differire da quella statunitense. Annotata perché, se un giorno il campo
  colore risultasse necessario, si sappia da dove viene il dubbio.
- **Due tipi su 38 non chiedono NULLA** — né denti, né colore, né arcata: `anti_russamento` (mascherina che
  coinvolge entrambe le arcate) e `duplicato_protesi` (si copia un manufatto esistente: «basta dire uguale»).
  Sono i **casi di prova del wizard adattivo**: se lì compare anche una sola domanda, l'adattività è rotta.
  All'estremo opposto sta `overdenture`, che le chiede tutte e tre.

---

## 7. Che cosa resta aperto — stato al 27/07/2026, sera

### ✅ CHIUSE stasera (erano aperte, non lo sono più)

| Era aperto | Chiuso da | Come |
|---|---|---|
| Tabella dei tipi — parte rimovibile/ortodonzia/riparazioni | ricerca + Francesco | §6-bis, tre tornate su moduli veri + le risposte di Francesco |
| Pazienti pediatrici | ricerca | §6-ter: FDI decidui confermati · **dentizione mista esiste** (8-12 anni) · VITA non adatta ai decidui ma **quasi mai serve** |
| Scheletrato: denti o solo arcata? | Francesco | **W16 — denti uno per uno** |
| Riparazioni: che forma dare? | Francesco | **W17 — la sezione c'è, ma con «Lo scrivo dopo»** |
| Il colore va nella DdC? | ricerca normativa | §4-bis: **sì, per via traversa** — «caratteristiche specifiche indicate nella prescrizione» |
| Le 4 colonne colore: vincolo di migrazione? | Francesco | **No**: dati di test, `ua-app/CLAUDE.md` §8 |

### 🔴 APERTE — vanno sciolte scrivendo la spec

1. **La forma del dato per-dente.** Lista di coppie (elemento, colore), resa **collassata** in lettura e sulla
   DdC («13-23: A3»). Vincoli già accertati: un colore deve poter esistere **senza denti** (protesi totale,
   barra) e denti **senza colore** (abutment); le tre zone (collo/corpo/incisale) devono restare possibili
   **per dente**; il dato va **congelabile alla consegna** (§4-bis).
2. **Il ponte non è «tre denti sciolti».** Sui moduli veri si segna con una parentesi che abbraccia gli
   elementi. Oggi lo perderemmo. Serve deciderlo: si modella o si rimanda?
3. **La dentizione mista nell'odontogramma.** Ratificato: **si decide per singolo dente**. Da progettare il
   gesto (pressione prolungata? un modo dedicato?) e cosa succede alle illustrazioni — le arcate che abbiamo
   sono **permanenti**; per i decidui servirebbe un secondo disegno o una variante.
4. **Ordine completo dei passi** e cosa mostrare al posto di «passo 2 di 3» quando i passi cambiano
   (la ricerca UX dice: mai un conteggio fisso).
5. **Il testo di aiuto** che sostituisce «alias» sul campo Cognome (§decisioni del 27/07 mattina).
6. **Il precheck di consegna.** «Lo scrivo dopo» ha senso solo se alla consegna qualcuno avvisa: è la **voce 2
   della coda**. Se non si fa, restano tocchi facoltativi senza conseguenza.
7. **Rifiniture note sui mockup:** i ritagli dei denti prendono un po' di gengiva intorno · sul desktop va
   verificato che la colonna del colore non venga schiacciata · le illustrazioni pesano 2 MB e 1 MB, da
   convertire in WebP · nella striscia il dente 11 e il 21 non sono speculari.
8. **Non verificato, costa poco:** l'ordine dente→colore sulle prescrizioni italiane vere (guardarne cinque).

---

## 6-quinquies. 🔎 Quattro scoperte del panel architetturale — verificate una per una (27/07/2026)

Il primo advisor del panel dati ha aperto il codice della Dichiarazione di Conformità. **Ho riverificato
personalmente tutte e quattro** prima di registrarle.

**① Il colore nella fattura è codice morto — il rischio fiscale è ZERO.**
`colore_dente/collo/corpo/incisale` compaiono nella `SELECT` di `api/fatture/[id]/xml/route.ts:109-115` e
`api/fatture/batch/route.ts:125-127`, ma **non sono usate in nessun punto della generazione FatturaPA**.
➡️ **Corregge una mia preoccupazione precedente**: avevo scritto che toccare quelle colonne avrebbe cambiato
l'XML di fatture emesse. Non è vero: non ci arrivano nemmeno. Vanno tolte dalla SELECT, è la prova più
economica che il perimetro fiscale non si tocca.

**② 🎁 Il posto giusto dove scrivere dente e colore ESISTE GIÀ, ed è vuoto.**
`dichiarazioni_conformita.prescrizione_caratteristiche TEXT` (migration `002_fase2_schema.sql:180`) è **già
renderizzata dal PDF** (`DdcTemplate.tsx:417-420`) e viene alimentata con **`null` fisso**
(`generate-ddc.ts:99` — verificato: `prescrizione_caratteristiche: null as string | null`).
➡️ **È esattamente il campo di testo libero dell'Allegato XIII di §4-bis.** Non dobbiamo inventare niente:
va riempito con la stringa collassata («Elementi 13-23, colore A3 — VITA classical»).

**③ Esiste anche `dichiarazioni_conformita.colore_dente`, mai scritta** (`database.types.ts:843`, assente
dall'oggetto costruito in `generate-ddc.ts:80-114`). Colonna morta **accanto** al campo giusto: o si valorizza
come companion strutturato, o si elimina. Lasciarla morta lì è lo stato peggiore dei tre.

**④ ⚠️ Il congelamento della DdC è NOMINALE — ma la protezione vera c'è, altrove.**
`generate-ddc.ts:97` **scrive** `denti_coinvolti` nello snapshot della dichiarazione; ma
`DdcTemplate.tsx:258` **legge `lavoro.denti_coinvolti`**, cioè il dato **vivo**, non lo snapshot appena
salvato. La fotografia si scatta e non si guarda.
🛑 **Precisazione doverosa, verificata:** questo **NON** significa che le dichiarazioni emesse cambino.
`generate-ddc.ts:41-50` fa short-circuit — se una DdC non annullata esiste già, restituisce il PDF salvato su
Storage **senza rigenerarlo**. Il documento emesso è immutabile di fatto.
➡️ Il difetto reale è che **l'immutabilità poggia su un solo meccanismo** (il file già su Storage) invece che
su due, e il campo congelato che esiste apposta non viene letto. Con il dato per-dente questa fragilità
diventa più costosa: va chiusa facendo leggere al template lo snapshot.

---

## 6-sexies. 🔎 Il panel API — tre errori trovati, due nel codice e uno nel verbale (27/07)

**⑤ 🔴 L'insieme dei denti validi NON è un intervallo.** Un `CHECK (fdi BETWEEN 11 AND 48)` accetterebbe
**19, 20, 29, 30, 39, 40** — che non esistono. La forma giusta è strutturale:

```sql
CHECK ( (fdi/10 BETWEEN 1 AND 4 AND fdi%10 BETWEEN 1 AND 8)     -- 32 permanenti
     OR (fdi/10 BETWEEN 5 AND 8 AND fdi%10 BETWEEN 1 AND 5) )   -- 20 decidui
```
**52 codici validi in tutto.** Con `fdi smallint` il difetto §6.1 diventa **irrappresentabile**: `'2.6'` non è
un intero, il database lo rifiuta invece di lasciarlo marcire fino alla DdC.

**⑥ 🔴 `DENTI_DECIDUO` ha i quadranti sbagliati — verificato.** `denti-fdi.ts:56` scrive
`{ numero: 55, …, quadrante: 1 }`: il dente 55 sta nel **quadrante 5**, non nell'1. Tutti e venti i decidui
portano quadranti 1-4 invece di 5-8. Oggi non fa danno perché adulto e deciduo non convivono mai sullo stesso
schermo; **con la dentizione mista (§6-ter b) il raggruppamento si romperebbe.** Il quadrante va **derivato da
`numero/10`**, non letto da quel campo.

**⑦ ⚠️ Correzione a W10 — mia imprecisione.** Avevo scritto «VITA classical, 19 voci già in codice».
`TabClinica.tsx:8-14` ha davvero 19 voci, ma **solo 16 sono VITA classical** (A1-A4, B1-B4, C1-C4, D2-D4):
`T`, `BL`, `OM` sono aggiunte fuori scala. Un vincolo costruito sui 16 codici classical **rifiuterebbe valori
che l'app stessa offre oggi**. Conseguenza sul modello: il colore vuole una **tabella di riferimento**
`(scala, codice)` — che è anche la casa naturale dei valori colorimetrici di W9.

**⑧ Manca un vincolo che serve:** su `lavori` **non esiste** un unique `(id, laboratorio_id)`. Serve per la
chiave esterna composita `(lavoro_id, laboratorio_id)`, senza la quale una riga potrebbe portare il
laboratorio B e un lavoro di A. Precedente in casa che dimostra che la cosa conta: `FK_FIELDS`,
`api/lavori/[id]/route.ts:294-319`.

**⑨ Buco collaterale:** `denti_mancanti` e `denti_impianti` passano oggi in PATCH **senza alcuna
validazione** (`route.ts:90-91`) — stessa classe del «2.6».

**Raccomandazioni forti del panel API, da portare nella spec:**
- **`PUT /api/lavori/[id]/denti`** con **sostituzione integrale** (idempotente; una selezione da 6 denti costa
  1 chiamata invece di 7) + precondizione `atteso_updated_at` → **409** se due persone lavorano sullo stesso
  lavoro. ⚠️ Il controllo di concorrenza **è un pattern nuovo per questo repo**: va deciso, non dato per casa.
- **`lavoro_crea_atomico(...)`** — una sola transazione per lavoro + denti. Motivo **normativo**, non di
  comodità: un colore perso in silenzio produce una DdC priva di un contenuto obbligatorio dell'Allegato XIII.
- ⚠️ **La foto della prescrizione non può restare «accessoria»**: se ha obbligo di conservazione 5 anni (W5),
  perderla in silenzio è la stessa classe di difetto.
- **`service_role` va nel `REVOKE`**: le default privileges di Supabase gli darebbero tutto, e in questo repo
  un `SET LOCAL ROLE service_role; DELETE` cross-tenant **è già stato riprodotto davvero** (nota E8 di
  `20260721090000_parete_cassette.sql`).

---

## 6-septies. 🔎 Il panel normativo — e il rischio che oggi non esiste ancora (27/07)

**⑩ ⚠️ CORREZIONE A W5 — la conservazione è 10 anni, non 5.** I 5 anni venivano dal **d.lgs. 46/1997,
Allegato VIII**, cioè l'attuazione della direttiva 93/42/CEE — **abrogata dal 26 maggio 2024**. Sotto MDR:
**Allegato XIII sezione 4**, letterale — «*La dichiarazione […] è conservata per un periodo di almeno **10
anni***» (15 se impiantabile). Fonte:
[OBV — conservazione della prescrizione](https://www.osservatoriobiomedicaleveneto.it/dispositivo-su-misura-vi-e-lobbligo-di-conservazione-della-prescrizione-in-originale/).
✅ **Il resto del progetto usava già 10 anni ovunque** (`supabase/schema.sql:479,1166,1269`, `DpaTemplate.tsx:149`):
**il verbale era l'unico punto disallineato.** Corretto.

**⑪ 🔴 TRAPPOLA nel collasso «13-23» — che è l'esempio che avevo usato io.** In numerazione FDI l'intervallo
13→23 **attraversa la linea mediana**: significa 13, 12, 11, 21, 22, 23 — **sei denti**. Un parser numerico
ingenuo espande da 13 a 23 e ne produce **undici**, quasi tutti inesistenti. La routine di collasso deve
conoscere le arcate, o enumerare quando l'intervallo scavalca la mezzeria. **È un vincolo testabile, non una
questione di stile.** Criterio di ammissibilità normativa: **nessuna perdita d'informazione** — si deve poter
ricostruire quale dente porta quale colore. «13-23: A3» passa; «A3 (6 elementi)» **no**.
Appoggio: MDCG 2021-3 Q6 nota 10 enumera le caratteristiche progettuali **per elemento** («*the number, type
and positions of fixation screws*») — l'analogo diretto di posizione+colore per dente.

**⑫ La immodificabilità della DdC NON è una regola MDR.** Non è nell'Allegato XIII né in MDCG 2021-3
(cercato su tutte e 8 le pagine). Discende dal **controllo delle registrazioni** del sistema qualità
(MDCG 2021-3 Q8 + ISO 13485 §4.2.5). Conseguenza pratica: il modello che UÀ già ha — stato `annullata`,
numero mai riusato — copre **un solo caso**, quello in cui il dispositivo non è ancora uscito. **Se l'errore
di colore si scopre dopo la consegna serve una riemissione correttiva** che richiami il numero superato, e
quel percorso **oggi non esiste**.
⚠️ Segnalato anche: la policy `ddc_laboratorio_update` (`supabase/schema.sql:1265-1267`) **consente UPDATE**
al tenant, malgrado il commento «snapshot immutabile» (`002_fase2_schema.sql:175`) — nessun trigger di
blocco trovato (verifica non esaustiva su tutti i `CREATE TRIGGER`).

**⑬ GDPR — il per-dente alza il profilo di rischio.** L'insieme {posizioni, mancanti, impianti, colore per
dente} **è una carta dentale**, cioè il documento canonico dell'identificazione forense: più righe = riga più
unica, e **`PZ-0231` regge peggio come pseudonimo** (Considerando 26: lo pseudonimizzato resta dato
personale). ✅ La pseudonimizzazione nella DdC resta legittima — Allegato XIII §1 ammette «*un nome, un
acronimo o un codice numerico*» (confermato MDCG 2021-3 Q9).
🔑 **E l'adattività di W2 diventa un controllo di legge, non solo comodità:** non chiedere il colore sui tipi
che non lo portano **è minimizzazione documentabile** (art. 5(1)(c)).

**⑭ 🔴 Difetto collaterale trovato, fuori perimetro ma da tracciare:** `RicevutaConsegnaTemplate.tsx:347`
dichiara **15 anni** «ai sensi del Reg. (UE) 2017/745» per un documento **non impiantabile**. Non è prudenza:
è limitazione della conservazione (art. 5(1)(e)) violata su dati dell'art. 9, con una base normativa
affermata che non regge. → voce di backlog propria.

---

### 🛑 ⑮ IL RISCHIO CHE OGGI NON ESISTE E CHE QUESTA MODIFICA CREEREBBE

> **La Dichiarazione di Conformità affermerebbe come «prescritto» un valore scritto dal laboratorio.**

L'Allegato XIII §1 chiede le caratteristiche **indicate nella prescrizione**. Ma **W3 stabilisce che le tre
zone (collo/corpo/incisale) le compila il ceramista, dopo, in laboratorio**, mentre il colore base si copia
dalla prescrizione al banco. **Una sola tabella, due provenienze diverse.**

Se la DdC stampa da lì sotto un'intestazione che giuridicamente significa «come prescritto», **il laboratorio
attribuisce al medico prescrittore dei valori propri**. E con la direttiva D10 (ogni campo correggibile fino
alla consegna) più le prove (`lavoro_prove`), ciò che finisce stampato è **l'ultimo valore digitato**, non
quello ricevuto. Si scoprirebbe solo confrontando l'immagine della prescrizione archiviata con la DdC
archiviata — e **nessun controllo li confronta**.

**Due rimedi possibili:**
- **(a) provenienza per valore:** ogni colore porta con sé se è `prescritto` o `eseguito`, e la DdC stampa
  solo i primi;
- **(b) regola secca:** solo il campo copiato dalla prescrizione alimenta la DdC; le zone del ceramista sono
  dati di produzione e non compaiono nel documento.

### ✅ **W20 — RATIFICATA DA FRANCESCO (27/07/2026): opzione (a), la provenienza.**

Ogni valore di colore porta con sé **da dove viene**: `prescritto` (copiato dalla prescrizione del medico) o
`eseguito` (scelto in laboratorio). **La Dichiarazione di Conformità stampa solo i valori `prescritto`** —
perché è ciò che la legge le fa affermare.

**Perché (a) e non (b):** (b) avrebbe buttato via il dato del ceramista, che serve al laboratorio anche se
non serve al documento. (a) lo conserva e lo tiene distinto. Il costo è una colonna in più e una regola da
non sbagliare mai; il guadagno è che **il documento non attribuisce più al prescrittore parole non sue**.

**Conseguenze operative da portare in spec:**
- il colore base copiato al banco nasce `prescritto`; le tre zone compilate dal ceramista nascono `eseguito`;
- **se l'operatore modifica un valore `prescritto`, quel valore non diventa `eseguito` per magia**: o resta
  prescritto (correzione di una trascrizione sbagliata) o va dichiarato — il caso va deciso nella spec, non
  lasciato all'implementazione;
- il precheck di consegna dovrà poter dire «questo colore non è mai stato prescritto» — è il gancio per la
  voce 2 della coda.

---

## 7-bis. 🚦 GATE FASE 3 — validazione architetturale (BP-2, `ua-app/CLAUDE.md` §0C)

REGOLA ZERO: non si procede senza risposta a tutte e cinque. Risposte date il 27/07/2026.

**1. Isolamento fra laboratori — tocca RLS o `current_lab_id()`?**
**SÌ.** La tabella nuova (denti+colore per lavoro) è dato clinico di un tenant: nasce con `laboratorio_id`
NOT NULL, RLS abilitata e policy che usa **`public.current_lab_id()`** — mai `auth.current_lab_id()`, che in
questo schema non esiste (`../CLAUDE.md` §6). Da provare con richieste ostili, come nell'ondata di ieri:
un lavoro di un altro laboratorio deve rispondere 404, non 200.

**2. Serve una migration? Va rigenerato `supabase gen types`?**
**SÌ a entrambe.** È il motivo per cui questo è percorso GRANDE. Dopo l'applicazione:
`npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`
+ `npx tsc --noEmit` — è la FASE 6b, obbligatoria.

⚠️ **RISERVA DEL PANEL, INTEGRATA (27/07).** Avevo scritto che la migration «non tocca le 4 colonne `colore_*`:
restano, e si decide dopo». **L'advisor architetturale ha dissentito, e ha ragione:** lasciare
`colore_collo/corpo/incisale` scrivibili da `TabClinica.tsx` mentre le stesse zone esistono per dente crea
**due sorgenti dello stesso fatto clinico dal primo giorno** — ed è la classe di difetto già pagata una volta
con `numero_cassetta`. *Additiva* non vuol dire *innocua*.
➡️ **Decisione corretta:** la migration resta additiva **e** nello stesso deploy le vecchie colonne diventano
**non scrivibili** (fuori da `PATCHABLE_FIELDS`, con la ragione scritta lì accanto come si fa per
`numero_cassetta` e `proposta_dentista`). Il rollback resta banale: si riammettono in allowlist.

**3. Il contratto delle API rompe client esistenti?**
**No — e il perimetro è più stretto di quanto temessi.** ✅ **Verificato (§6-quinquies ①): le colonne colore
NON arrivano alla FatturaPA** — compaiono solo in due `SELECT` e poi non vengono usate. Il raggio fiscale è
**zero**, non «da maneggiare con cura» come avevo scritto.
Oggi `PATCH /api/lavori/[id]` accetta `denti_coinvolti: string[]` e `colore_dente`; `TabClinica.tsx` è il suo
unico chiamante d'interfaccia. Il dato per-dente **non passa da lì**: vuole un endpoint suo, con allowlist
esplicita (`../CLAUDE.md` §9). ⚠️ Vincolo che resta: `crea-lavoro.ts` scrive denti e colore con una PATCH
**fail-soft** che perde il dato in silenzio (§6.2) — quella deve smettere di essere accessoria, o i tocchi
chiesti all'operatore si buttano. **Attenzione al peggioramento**: un endpoint per-dente *separato* aggiunge
una seconda chiamata fallibile, quindi la creazione va resa **atomica** (il repo ha già il pattern:
`crea_rifacimento_atomico`, `consegna_finalizza_atomica`).

**4. Rollback — come si annulla se va in produzione e fallisce?**
**Facile, perché la migration è additiva.** Si toglie la tabella nuova e si torna a leggere le 4 colonne, che
non sono state toccate. ⚠️ **Il vincolo vero non è il dato ma il documento**: se nel frattempo è stata emessa
una DdC che riporta il colore per dente, quella resta valida e va conservata — quindi la fotografia congelata
alla consegna (§4-bis) va scritta **fin dal primo giorno**, non aggiunta dopo. Sui dati: rischio basso, sono
di test (`ua-app/CLAUDE.md` §8).

**5. Dominio critico → percorso GRANDE?**
**SÌ, per due ragioni indipendenti:** tocca **migration + RLS**, ed è **materia MDR** (il dato finisce in un
documento a valore legale). Quindi: brainstorming → questo gate → **panel advisor** → spec → piano → mockup
approvati → TDD → FASE 6b → verifica → review → QA browser → gate estetico → deploy → BP-1.

➡️ **Gate SUPERATO.** Prossimo passo obbligato: **panel advisor sul MODELLO DATI** (non sulla UI: quello è già
stato fatto). Composizione giusta: `solution-architect` + `backend-api` + una lente normativa.

---

## 8. Fonti esterne usate (Statuto delle fonti)

- Prescrizione e conservazione 5 anni: Allegato XIII MDR 2017/745 — [Odontoiatria33](https://www.odontoiatria33.it/approfondimenti/20860/prescrizione-di-un-dispositivo-medico-su-misura-ecco-le-indicazioni.html), [OMCeO Messina](https://www.omceo.me.it/odontoiatri/leggi/dispositivi_misura.pdf)
- Numerazione denti FDI = **ISO 3950** — [FDI notation](https://en.wikipedia.org/wiki/FDI_World_Dental_Federation_notation)
- Scale VITA: classical 16 tinte (A3.5 compresa), 3D-Master 26+3 — [VITA Zahnfabrik](https://www.vita-zahnfabrik.com/en/Shade-determination/VITA-Tooth-shade-systems/VITA-SYSTEM-3D-MASTER-Precise-systematic-tooth-shades-119894,27568,256821.html)
- Valori colorimetrici per tacca — Bayindir et al., *J Prosthet Dent* 2007;98:175-185, [PMC2001247](https://pmc.ncbi.nlm.nih.gov/articles/PMC2001247/)
- «Default sul caso + override sul singolo dente»: [exocad DentalDB wiki](https://wiki.exocad.com/wiki/index.php/DentalDB_Application), [3Shape Unite](https://support.3shape.com/products-unite-software-how-to/how-change-shade-system-dental-desktop3shape-unite)
- Colore per riga di lavorazione, obbligatorio: LabStar (video ufficiale vendor), [Magic Touch / DLCPM](https://help.dlcpm.net/DLCPMOnline/add_products_to_a_case.htm)
- Odontogramma cliccabile in un gestionale italiano: [E-TERNA](https://e-terna.net/portfolio/gestionale-web-ordini-laboratori-odontotecnici/)
- Il mobile è terreno vuoto: [Open Dental — la schermata denti non è disponibile da telefono](https://www.opendental.com/manual/odtouchchart.html)
- Bersagli: [WCAG 2.2 SC 2.5.5 = 44×44](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), [Apple HIG](https://developer.apple.com/design/tips/)
- Passi variabili → non mostrare un conteggio fisso: [NN/g, ridurre il carico cognitivo nei moduli](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/)

⚠️ **Correzione a verbale:** ANSI/ADA **1054 non risulta pubblicato come norma** — esiste un *rapporto
tecnico* 2019 e a novembre 2025 era ancora fra le proposte; i documenti sono a pagamento, quindi **la
struttura dei suoi campi resta non verificata**. Non usarlo come autorità.

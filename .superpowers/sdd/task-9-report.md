# Task 9 — Il foglio «Devo intervenire»: il bivio, la pastiglia spenta, la schermata finale

**Ramo:** `intervento-post-consegna` · **9 agosto 2026** (`provato:` `date` → `Sun Aug 9 10:43:09 CEST 2026`)
**Mandato:** `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`, sezione «Task 9»

| cosa | esito |
|---|---|
| il difetto d'apertura | **chiuso**: `scelta_intervento` parte, e i due difetti non prendono più 422 |
| FASE 7 (`verify:full`) | **`VERIFY_EXIT=0`** — 5706 passate \| 68 saltate su 456 file (base 5685: **+21**) |
| FASE 9 | 72 scatti, 12 stati × 3 viewport × 2 temi, e **tre giri completi contro il banco vero** |
| GATE L2 | fatto, **due ❌ trovati e chiusi** — referto in coda a `docs/design/screenshots/2026-08-09-devo-intervenire/GATE-L2.md` |
| banco | **rimesso identico** (v. §④) |
| difetti nel piano/mandato | **nove**, elencati al §⑤ — uno dei quali rende il Passo 2 non costruibile com'è scritto |

---

## ① I passi, uno per uno

> 🛑 **Il mandato dice «cinque passi». Il piano ne ha SETTE** (Passo 1 → Passo 7, righe 1063-1138).
> Li ho fatti tutti e sette.

### Passo 1 — leggere il file per intero

**1837 righe, lette tutte.** Quello che il piano chiedeva di scrivere nel resoconto:

**Le fasi** (`type Fase`, `:112-120`) sono **nove**: `chiuso` · `domanda` · `motivo` · `domandaUscito` ·
`correzione` · `correzioneCampo` · `dettagli` · `proposta` · `esito`. È **un foglio solo che cambia
passo**, mai due overlay in fila — il riquadro in testa al file racconta il difetto misurato il 07/08
che ha imposto questa struttura.

**Chi chiama `ricomincia()`** — cinque punti, e ognuno vuol dire una cosa diversa:
`Sheet onChiudi` (`:865`, la chiusura del foglio) · «No, ho premuto per sbaglio» (`:878`) · «Ho capito»
sulla schermata finale · e non lo chiama `ricaricaERiprendi`, che è la sua gemella *conservativa*
(tiene le correzioni). `ricomincia` azzera tutto **tranne** `eventoDaRiusare`, ed è una riga assente
apposta.

**Come agisce il tasto «indietro» del telefono.** `Sheet`/`DialogConferma` registrano una voce in
`storia-overlay.ts`; alla pressione, `popstate` → `alPop` (`:101-118`) prende **solo il più alto**
della pila, ri-spinge l'entry per chi resta sotto, e chiama il suo `chiudi()`. Sul `Sheet` di questo
file `chiudi` **è** `ricomincia` → **un «indietro» dato dentro `dettagli` butta via tutto il modulo**.
🔑 **Ed è il motivo per cui il Passo 2 esiste**: qualunque cosa nuova NON deve aggiungere un altro
punto in cui quel gesto distrugge lavoro.
📌 La cosa che il mandato dava per chiusa — «`onChiudi` non si riproduce» — **è vera e l'ho
riverificata sul codice**, ma riguarda un caso **diverso**: la chiusura *programmatica*
(`esciOverlay` azzera `marcaEntry` **prima** di `history.back()`, `:163-166`, quindi `alPop` esce
alla prima riga). La pressione «indietro» **dell'utente** non passa da `esciOverlay`: passa da
`alPop`, e lì `ricomincia` parte davvero.

### Passo 2 — il bivio «come `DialogConferma` sopra il foglio»

🔴 **NON FATTO COM'È SCRITTO, e la ragione è misurabile sul componente di sistema.** Dettaglio
completo al §⑤-③. In sintesi: `DialogConferma` espone **due** callback, e `onAnnulla` è lo stesso
identico per il tasto sicuro, per **Esc** (`DialogConferma.tsx:87-92`), per il **tocco sullo scrim**
(`:83`) e per il **gesto «indietro»** (`:111`). I due rami del bivio **scrivono tutti e due** — uno
riporta il lavoro fra i pronti, l'altro fa nascere un lavoro con un progressivo bruciato. Mappandone
uno su `onAnnulla`, **un Esc dato per chiudere depositerebbe un evento nel registro di qualità e
sposterebbe un lavoro**.

➡️ **Il bivio è due `ChipScelta` in fondo al passo `dettagli`, subito prima del tasto.** La ragione
del Passo 2 è **soddisfatta meglio**: non aggiunge nessun passo, quindi non aggiunge **nessun** nuovo
punto in cui «indietro» distrugge lavoro. E il conto dei tocchi è **identico** — pastiglia + tasto
sono due, come tasto + opzione dentro un dialogo: nessun terzo tocco, che sarebbe contro D269
(`eventi-qualita/route.ts:440-447`, «*una conferma in più dopo il motivo sarebbe un terzo tap che
nessuna decisione autorizza*»).

### Passo 3 — l'affordance

Le due etichette **ratificate** stanno in `SCELTA_UI` (`src/lib/qualita/motivi-ui.ts`), non nel JSX:
«Si sistema questo manufatto» · «Se ne fa uno nuovo — nasce subito un lavoro nuovo».
E **il tasto finale non dice più «Continua»** su questi due motivi (`TASTO_SCELTA`):
«Registra e riportalo fra i pronti» · «Registra e fai il lavoro nuovo». 🔑 Così il ramo che *crea* non
ha il tasto più debole — che era il punto del passo.

**La conseguenza mostrata sotto le pastiglie non è scritta a mano**: è
`effettoDaMotivoEScelta(motivo, scelta).perche`, cioè **la stessa funzione con cui la rotta decide**.
Una prova lo sorveglia confrontando le due stringhe.

### Passo 4 — la combinazione impedita, non servita come vicolo cieco

`GruppoChip` ha ora `preclusa?: (v) => string | null`; `ChipScelta` ha `disabilitata?: boolean`
(additiva: nessuno dei 14 consumatori cambia resa). Su `destinatario_errato` la pastiglia
**«Mai uscito» è spenta** e la ragione si legge sotto il gruppo — col nome del motivo giusto **preso
da `MOTIVI_UI`**, non ricopiato (⚖️ D262: un rifiuto indica la strada).
🛑 **La guardia dell'API resta dov'era** (`eventi-qualita/route.ts:278-280`): è lì che sta il confine.

### Passo 5 — la schermata finale

- ① **ordine invertito**: in cima che cosa è successo al **lavoro**, sotto «Registrato». Provato con
  un confronto di posizione nel documento, non a occhio.
- ② **la via per aprire il lavoro nuovo**: `LinkQuieto` → `useNavigaDaOverlay`, **mai** `router.push`
  (una prova finge l'hook e verifica che `pushMock` resti a zero). **Senza `lavoro_nuovo` nella
  risposta il collegamento non si disegna**: un bersaglio morto è peggio della sua assenza.
- ③ i riquadri sono usciti dal JSX in linea e sono diventati `RiquadroEsitoAzione`, **perché ora
  servono su DUE passi** (v. §⑤-⑥).
- 🔄 **I due titoli del guasto cominciavano con «Ma»** — parola che si reggeva su «Registrato» sopra.
  Con l'inversione quel riquadro è il **primo** della schermata, e un «Ma» in cima non regge su
  niente: sono diventati «Il lavoro nuovo non è stato creato» e «Il lavoro non è tornato indietro».
  Il fatto che la registrazione sia salva lo porta già dentro il messaggio della rotta
  (`route.ts:510-514`).

### Passo 6 — FASE 9 · Passo 7 — salvataggio

Fatti. Dettaglio ai §④ e in coda al `GATE-L2.md`.

---

## ② I numeri di riga del piano — quali erano sbagliati

Il piano è del 07/08; da allora il file è passato da ~520 a **1837 righe**. Verificati **uno per uno**.

| citazione | dov'è davvero | esito |
|---|---|---|
| Passo 4 — «`:399-405`» per le pastiglie di «Mai uscito» | il `GruppoChip` di `STATI_DISPOSITIVO` è a **`:1092-1098`**; il componente a **`:1798-1821`**. A `:399-405` oggi c'è l'interfaccia `EsitoAzione` | ❌ **sbagliato** |
| Passo 5 — «`:492-513` li disegna solo se esiste `riapertura`» | i riquadri sono a **`:1244-1297`**, dentro `fase === 'esito'` (`:1224-1301`) | ❌ **sbagliato** |
| Passo 5 — il nome del campo, «`riapertura`» | il Task 7 lo ha rinominato **`esito_azione`**, e il piano stesso lo dice due righe dopo | ❌ **stantìo, e si contraddice** |
| Passo 2 — «`storia-overlay.ts:110-118`» | `alPop`, esattamente quelle righe | ✅ **giusto** |
| Il mandato — «`MOTIVI_CON_SCELTA` in `effetti.ts:229`» | esatto | ✅ **giusto** |
| Il mandato — «la guardia sta in `route.ts:257-270`» | il blocco del bivio è **`:257-268`** (`:259-262` è la riga che pretende la scelta) | ⚠️ **quasi** |
| Il mandato — «il file è a ~1800 righe» | **1837** | ✅ |
| Il mandato — «base 5685 passate \| 68 saltate su 456 file» | esatto: dopo il Task 9 sono **5706**, cioè +21 = le prove nuove | ✅ **misurato** |

---

## ③ R-P4 — le forme d'ingresso, e il conteggio

### Le forme d'ingresso, enumerate PRIMA delle asserzioni

Sono scritte per intero in testa al blocco nuovo di `tests/unit/DevoIntervenire.test.tsx`. In breve —

**Del CORPO che il foglio compone:** ① motivo del bivio + scelta valida → chiave presente col valore ·
② motivo del bivio + **nessuna** scelta → il corpo **non parte affatto** (tasto spento): è il modo in
cui «chiave assente su un motivo che la pretende» non può nascere da questa schermata · ③ motivo
**fuori** dal bivio → chiave **assente**, mai `null` (`null` esplicito prende 422, `route.ts:264-268`)
· ④ percorso corto (`errore_registrazione`) → assente · ⑤ atto unico
(`errore_dato_dichiarazione`) → assente · ⑥ **scelta fuori vocabolario → NON coperta, e perché**: le
due voci a schermo vengono da `SCELTA_UI`, che è un `Record<Scelta, …>` — una terza voce **non
compila**. Quel vocabolario lo sorveglia `tsc`, non una prova d'interfaccia.

**Della RISPOSTA che la schermata deve rendere:** `esito_azione` assente · `applicato` × due azioni ·
`applicato` **senza** `lavoro_nuovo` · `non_applicabile` × due azioni · `fallito` × due azioni ·
`fallito` **senza** `messaggio`. **Non coperta:** `azione: null` **con** `esito_azione` — la rotta non
la produce (`route.ts:455-462` popola il campo solo quando un'azione c'è).

### Il conteggio

**Prove toccate: 26** (21 nuove + 5 preesistenti modificate).

| momento | fallite su 80 | si accendono, su 26 toccate |
|---|---|---|
| **primo rosso** (nessun codice scritto) | 23 | 3 — ed erano **già verdi prima**: asseriscono un'assenza che oggi è vera |
| **abbozzo inerte** (i testi nuovi a schermo, niente collegato) | 20 | **3 su 26** |
| dopo aver **rafforzato** le due prove deboli | 22 | **1 su 26** |
| implementazione vera | **0** | 26 |

🔑 **Le tre che si accendevano sull'abbozzo, e che cosa ho fatto di ognuna.**
① «*all'apertura nessuna delle due è scelta*» — passava perché l'abbozzo disegnava due pastiglie
sempre spente: una prova che guarda **solo un valore d'apertura** non distingue «nessun default» da
«niente collegato». **Rafforzata**: ora preme le pastiglie e verifica che `aria-pressed` si sposti
dall'una all'altra.
② «*la conseguenza è quella di `effettoDaMotivoEScelta`*» — passava stampandone una **fissa**.
**Rafforzata**: il testo deve **cambiare** con la scelta, e quello dell'altro ramo deve **sparire**.
③ «*il bivio compare esattamente sui motivi di `MOTIVI_CON_SCELTA`*» — **lasciata così**, ed è
l'unica che si accende ancora: l'abbozzo implementava **davvero** il cancello `richiedeScelta`, quindi
il verde è meritato. Un verde legittimo su un abbozzo non è una prova debole: è una prova su una
riga di codice che l'abbozzo conteneva.

---

## ④ FASE 7 e FASE 9

### FASE 7

```
npm run verify:full > scripts/tmp/verify-task9-b.log 2>&1; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
→ VERIFY_EXIT=0
   Test Files  450 passed | 6 skipped (456)
        Tests  5706 passed | 68 skipped (5774)
```
`tsc --noEmit` 0 · `eslint --max-warnings 0` 0 · `next build` ok · le **sei guardie** verdi.

**E la guardia che NON è agganciata a niente l'ho lanciata a mano**, perché ho aggiunto una
navigazione da dentro un overlay (`CLAUDE.md` §9: «*chi tocca gli overlay v3 la lancia a mano*»):

```
npx tsx scripts/giro-guardia-overlay.ts
→ consegna dalla pila → completa i dati: destinazione raggiunta, profondità 4 → 4
→ menu ⋯ → ponte di modifica: destinazione raggiunta, profondità 4 → 4
→ indietro non conferma: dialogo via, sheet resta, 6 cassette intatte dopo il ricarico
→ album: tre strati — indietro annulla, la foto è ancora lì dopo il ricarico
✅ la guardia è uscita con 0 · ✅ la riga è tornata esattamente com'era
```
⚠️ **Misura i TRE punti che esistevano già, non il mio**: la via «Apri il lavoro nuovo» non è fra le
sue superfici. Quello che prova è che il **meccanismo** su cui mi sono appoggiato regge ancora.

### FASE 9 e il GATE L2

72 scatti in `docs/design/screenshots/2026-08-09-devo-intervenire/`, prefisso `task9-`: **12 stati ×
3 viewport × 2 temi**. Referto in coda a `GATE-L2.md`.

**Due ❌ trovati dagli scatti, tutti e due invisibili leggendo il codice, tutti e due CHIUSI:**
- **T9-1 — la pastiglia spenta spariva in tema chiaro.** Togliere l'ombra non basta: la pillola viva è
  `--card` e il **pannello del foglio è anch'esso `--card`** — restava solo il testo, sospeso. È la
  **quarta replica** dello stesso difetto in questo progetto, e le prime tre sono già scritte in
  `ds-v3.css` — ma tutte e tre sotto `[data-theme="dark"]`, che questo caso **non copre**. Rimedio:
  una pastiglia spenta resta una superficie, **incassata** (`--fondo-superficie`, il token di D329).
  Viva = sollevata, spenta = affondata, in tutti e due i temi.
- **T9-2 — la stessa frase due volte a 150 px di distanza.** Avevo riusato `DOMANDA_SCELTA` **anche**
  come motivo del tasto spento, credendo di rispettare «non scriverne una terza». Ma quella riga deve
  dire **che cosa manca**, non ri-porre la domanda. Ora: «Manca la scelta qui sopra.»

**Il giro completo sul banco vero, tre motivi (spec §0).** Non è una simulazione: per arrivare alla
schermata finale si scrive davvero.

| | prima | dopo i tre giri | dopo il ripristino |
|---|---|---|---|
| 2026/0005 — stato | `consegnato` | `pronto` | **`consegnato`** ✅ |
| `post_consegna_correzioni` | 9 | 12 | **9** ✅ |
| eventi di qualità | 0 | 3 | **0** ✅ |
| dichiarazioni vive | 1 (`DDC-2026-0003`) | **1, ancora `generata`** | 1 ✅ |
| lavoro nato dal rifacimento | — | **2026/0017** | cancellato ✅ |

🔑 **`scelta_intervento` è arrivata in banca dati** — `si_rifa` sul primo evento, `si_sistema` sul
secondo. È la colonna che questo foglio non aveva **mai** scritto.
🔑 **E `DDC-2026-0003` è rimasta `generata` dopo due ritorni fra i pronti**: D293 e l'Art. 21(2) MDR
misurati sul database, non dedotti dal codice.

**Come si è rimesso tutto com'era:** una transazione sola, riportata **per intero nel `GATE-L2.md`
§5** — e non in `scripts/tmp/`, che è ignorato da git: rimandare lì sarebbe rifare l'errore già
pagato con lo script del link d'accesso (⚖️ D103). Col testo ci sono le due trappole pagate (`lavori_rifacimenti.lavoro_originale_id`,
non `lavoro_origine_id`; e `lavori` non cade da sola — `lavori_denti`/`lavori_prescrizioni` la
trattengono con una FK composita).
🛑 **Ciò che NON si rimette indietro:** il progressivo bruciato fra 2026/0011 e 2026/0017. §8 di
`CLAUDE.md` dichiara questo banco pieno di soli dati di prova: rincorrere una sequenza sarebbe
spendere su un rischio che non c'è.

---

## ⑤ 🔴 Dove il piano e il mandato sbagliano — nove punti

**1. Il mandato dice «cinque passi». Il piano ne ha SETTE.** Chi si fermasse al quinto salterebbe
FASE 9 e il salvataggio.

**2. Il mandato dice che `motivi-ui.ts` «contiene GIÀ due formulazioni della domanda del bivio
(`:61` e `:66`)». Non sono due formulazioni: sono la STESSA STRINGA, alla lettera** —
`'Si sistema questo manufatto o se ne fa uno nuovo — scegli tu'`, scritta due volte. L'istruzione
«riusa quella, non scriverne una terza» faceva quindi credere a una **scelta** fra due varianti,
mentre il fatto era un **doppione**. 🔑 E il difetto vero era l'opposto di quello temuto: non
«scriverne una terza», ma che le **due copie esistenti** divergessero alla prima revisione. ➡️ Ora è
una costante sola, `DOMANDA_SCELTA`, usata in tre posti.

**3. 🔴 Il Passo 2 prescrive una cosa che non si può costruire in sicurezza.** «Il bivio come
`DialogConferma` sopra il foglio»: quel componente ha **due** callback, e `onAnnulla` è condiviso da
tasto sicuro + **Esc** + **scrim** + **gesto indietro**. Il bivio ha **due rami che scrivono
entrambi**. ➡️ Un Esc dato per chiudere depositerebbe un evento e sposterebbe un lavoro.
🔑 La differenza col percorso corto, che quel dialogo lo usa davvero (`DevoIntervenire.tsx:1322-1332`):
là il ramo di `onAnnulla` **non scrive niente**, ed è scritto nel suo costo dichiarato — che nello
stesso riquadro dichiara **fuori mandato** cambiare il contratto del componente di sistema.
📌 Il piano non poteva saperlo perché non ha aperto `DialogConferma.tsx`: è esattamente il caso R-P2,
«l'elenco dei file non lo decide l'autore».

**4. E la ragione dichiarata del Passo 2 è soddisfatta MEGLIO dalla forma che ho scelto.** Il piano
voleva il dialogo perché «*come fase, la pressione indietro butta via il modulo*». Due pastiglie
dentro `dettagli` **non aggiungono nessuna fase**, quindi non aggiungono **nessun** punto nuovo in cui
quel gesto distrugge lavoro. Il dialogo ne avrebbe protetto uno che non serviva creare.

**5. I numeri di riga del Passo 4 e del Passo 5 sono sbagliati**, e uno dei due nomi che il Passo 5
usa (`riapertura`) è morto dal Task 7. Tabella al §②.

**6. 🔴 Il piano non prevede la schermata `proposta`, e lì un guasto restava MUTO.** Il Passo 5 parla
solo della «schermata finale». Ma per i due difetti l'azione parte **insieme alla registrazione**
(`route.ts:455-462`) e la persona atterra su `proposta`, dove il riquadro «E sul lavoro» racconta al
**futuro** — «*nasce subito un lavoro nuovo*» — **anche quando non è nata**. Fra i due passi c'è una
valutazione da confermare: si confermerebbe credendo che il resto sia a posto. È la §8.1 vista
dall'altro lato — **fallire senza dirlo**, ed è la stessa famiglia del CRITICO che la revisione del
Task 7 ha trovato in questo stesso blocco.
➡️ `RiquadroEsitoAzione` si mostra **anche su `proposta`**, ma in modalità `soloImprevisti`: solo ciò
che **contraddice** la promessa. La riuscita la racconta già «E sul lavoro», e ripeterla sarebbe
rumore su una schermata che deve far prendere una decisione. Il modello è `RiquadroRiemissione`, che
vive sui due passi per la stessa ragione già scritta accanto.

**7. Il Passo 3 diagnostica bene e prescrive troppo.** «*Il ramo che brucia un progressivo avrebbe un
"Continua"*» è vero — ma il rimedio non richiede un dialogo: basta che **il tasto finale dica che cosa
fa**, ed è la regola di casa (⚖️ D322, «*il tasto finale dice quello che fa, mai "Salva"*»).

**8. La ricetta d'accesso del `GATE-L2.md` §7 porta a un 404, e la causa è la scorciatoia di D103.**
Il referto dice «*utenza `e2e-titolare@ua-test.local`*», ma D103 ammette di **omettere l'email**
ripiegando su `TEST_EMAIL` — che in `.env.local` vale `h4t@live.it`, cioè **un altro laboratorio**. La
scheda risponde 404 e sembra un difetto dell'app. Costo misurato oggi: un giro perso. Scritto in testa
al mio referto di gate perché è la prima cosa che farà chiunque riapra quella cartella.

**9. Il mandato dice «la guardia sta a `route.ts:257-270`»: il blocco è `:257-268`.** Minore, ma il
mandato chiedeva di verificarli tutti.

---

## ⑥ Ritrovamenti FUORI mandato — riferiti, non corretti (R-E2)

**1. `SCELTE` è duplicato.** La rotta tiene una copia privata del vocabolario del bivio a
`src/app/api/lavori/[id]/eventi-qualita/route.ts:115` (`const SCELTE = ['si_sistema','si_rifa']`). Ho
esportato `SCELTE` da `src/lib/qualita/effetti.ts` — dove vive il tipo `Scelta`, con
`satisfies readonly Scelta[]` — **perché il mio codice ne aveva bisogno**, e **non ho toccato la
rotta**. Restano due elenchi. Chi farà crescere il vocabolario deve ricordarsene: non c'è niente che
lo protegga.

**2. Cinque prove unitarie di questo file erano VERDI su un corpo che la rotta rifiuta.**
Premevano «Continua» su «Difetto di lavorazione» senza nessuna scelta e passavano, perché il `fetch`
è finto e non ha la guardia. Le ho corrette (sono nel mio mandato), **ma la classe di difetto è più
larga**: in questa suite nulla lega il corpo composto dal componente al contratto della rotta. Un
controllo che li confronti — anche solo passando il corpo alla validazione vera — non esiste.

**3. Le tre regole «superficie che sparisce» di `ds-v3.css` sono tutte sotto
`[data-theme="dark"]`.** Il caso **chiaro** non è coperto da nessuna, ed è il mio ❌T9-1. Non riguarda
solo `ChipScelta`: vale per **ogni premibile `--card` dentro un pannello `--card`** in tema chiaro. Il
commento in quel file dice già «*il difetto non è del componente ma del pattern*» — e la constatazione
vale su un tema in più di quanto la regola copra.

**4. Una `ChipScelta` disabilitata esce dall'ordine di tabulazione** (resa nativa di `disabled`). Chi
naviga da tastiera non ci arriva e **non ne legge il motivo dal focus**. La ragione è scritta sotto il
gruppo, quindi si legge comunque — ma non è la stessa cosa. Un `aria-disabled` senza `disabled`
sarebbe l'alternativa, e cambia il contratto di un componente di sistema: **non l'ho fatto**.

**5. Due trappole del ripristino, per chi rifarà un giro distruttivo:** la colonna è
`lavori_rifacimenti.lavoro_originale_id` (non `lavoro_origine_id`), e `lavori` **non cade da sola** —
`lavori_denti` e `lavori_prescrizioni` la trattengono con `lavori_denti_lavoro_fk`, una FK composita
`(id, laboratorio_id)`.

---

## ⑦ Che cosa NON ho fatto

- **Nessun `DialogConferma` per il bivio** — deviazione dichiarata dal Passo 2, motivo al §⑤-③.
- **Non ho toccato la copia privata di `SCELTE` nella rotta** (R-E2).
- **Non ho toccato `memory/MEMORY.md` né il verbale delle decisioni** — istruzione esplicita del
  mandato.
- **Non ho provato a schermo i rami `fallito` e `non_applicabile`**: solo prove unitarie. Servirebbe
  far fallire apposta una RPC.
- **Non ho misurato `:focus-visible` col Tab** sulle superfici nuove, né rifatto il giro
  `prefers-reduced-motion` (il ramo `SheetRidotto`).
- **Non ho rimesso indietro il progressivo dei lavori** consumato dai giri — v. §④.
- **Non ho aperto una decisione numerata** per le tre stringhe nuove (`SCELTA_UI`, `TASTO_SCELTA`,
  «Manca la scelta qui sopra.»): le prime due sono i testi **già ratificati** nel Passo 3 del piano,
  la terza è una riga di servizio nata da un ❌ del gate. Se Francesco vuole numerarle, il posto c'è.

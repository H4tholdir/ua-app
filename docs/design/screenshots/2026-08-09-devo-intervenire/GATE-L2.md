# Gate estetico L2 — «Devo intervenire»: il passo di correzione e la finestra del Task A (09/08/2026)

**Quando:** 9 agosto 2026, 00:05-00:35 (`provato:` `date` → `Sun Aug  9 00:33:44 CEST 2026`, letto dall'orologio, mai da un documento — D155).
**Perché ora:** il gate era dovuto **due volte** — uno arretrato dall'ondata «si deve sempre poter
intervenire», l'altro aggiunto dal **Task A** (la finestra «Il manufatto è uscito dal laboratorio?»).
**Framework:** `docs/design/audit-ui-ux/README.md` (Livello 2) · checklist
`docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` (12 sezioni).
**Superficie:** il foglio `DevoIntervenire` sulla scheda `/lavori/[id]` — la riga, la domanda d'ingresso,
i nove motivi, la finestra del Task A, il passo nuovo «Che cosa c'è di sbagliato?», i **sei** sotto-passi,
il blocco «Da qui non si corregge», il nastro del percorso, le quattro caselle e il riquadro del **409**.
**Perimetro:** 390 · 768 · 1280 × chiaro · scuro — **sei combinazioni, quindici passi ciascuna**, più un
giro a parte con `prefers-reduced-motion` (che in `Sheet` è un **ramo di codice diverso**, `SheetRidotto`).
**Banco:** build di produzione su `localhost:3020` · lavoro **2026/0005** (`cdfee91f-…`), consegnato, con
`DDC-2026-0003` viva · utenza `e2e-titolare@ua-test.local` (link d'accesso monouso, D103).

> 🔑 **La fixture è stata CREATA, e senza non c'era niente da guardare.** Su tutto il banco
> `lavori_prescrizioni` e `lavori_denti` avevano **zero righe**: due dei sei sotto-passi non erano
> raggiungibili (uscivano «preclusi») e il selettore di persone non aveva una seconda persona da
> mostrare. Il SQL sta al §7 — creazione **e** rimozione.

---

## 1. La prova che nessun test automatico può fare — e l'ipotesi del brief NON si riproduce

Il brief chiedeva di provare per prima una cosa sola: il foglio si chiude con `setFase('chiuso')` ma è
montato con `onChiudi={ricomincia}`, e `ricomincia` fa `setCorrezioni({})`. Se quel meccanismo fosse
vivo, **«Ricarica e riprendi» cancellerebbe proprio ciò che promette di tenere.**

`provato:` sul browser vero — si entra nel passo di correzione, si scrive
`DESCRIZIONE-SENTINELLA-D-BIS`, si fa invecchiare il gettone dal database, si preme «Correggi e rifai la
dichiarazione» (→ **409**), si preme «Ricarica e riprendi», si rientra:

| momento | esito |
|---|---|
| la correzione è a schermo prima del conflitto | ✅ sì |
| il riquadro del conflitto compare | ✅ sì |
| il foglio si è chiuso davvero | ✅ sì (`.ds-sheet` assente) |
| **la correzione è sopravvissuta al rientro** | ✅ **sì**, con la pastiglia «DA RIFARE» |

Scatti: `prova-onchiudi-1-digitata.png` · `-2-conflitto.png` · `-3-dopo-ricarica.png` · `-4-rientro.png`.

🔑 **Perché non morde, letto sul codice dopo averlo misurato:** `esciOverlay` azzera `marcaEntry`
**prima** di chiamare `history.back()` (`storia-overlay.ts:163-166`); quando il `popstate` arriva,
`alPop` esce alla prima riga (`if (!marcaEntry || pila.length === 0) return`) e `voce.chiudi()` — cioè
`ricomincia` — non parte mai. Il `router.refresh()` non rimonta il componente: lo stato locale regge.

---

## 2. I ❌, uno per uno, con la misura e l'esito

### ❌1 — In tema scuro le superfici premibili nuove **scendono** sotto il pannello

`provato:` sonda sul DOM del banco, 390 scuro, passo di correzione:

| cosa | valore risolto |
|---|---|
| pannello del foglio (`--card`) | `rgb(33, 29, 24)` — #211D18 |
| le cinque superfici nuove (`--bg-deep`) | `rgb(16, 14, 11)` — #100E0B |
| ciò che la regola vuole (`--elv`) | `rgb(43, 38, 32)` — #2B2620 |
| bordo · ombra sulle righe | **nessuno** · **nessuna** |

Le righe sono **più scure** del pannello che le contiene, senza filo né ombra: l'unica cosa che dice
«questa si preme» va nella direzione sbagliata. Contro la regola già registrata come esito di un gate L2
del 22/07 (`Sheet.tsx:499-501`) e contro il mockup approvato (`2026-08-08-passo-correzione.html:52` —
`.notte .riga{background:var(--elv)}`).

🔴 **E il rimedio scritto nel brief è SBAGLIATO — misurato, non discusso.** Il brief dice «*il mockup
approvato scrive `--elv` su tutte e quattro*». Applicato **senza condizione di tema**, in **chiaro**
`--elv` è definito come `var(--card)` (`ds-v3.css:13`): le sei righe prendono `rgb(255, 254, 250)`, cioè
**esattamente il colore del pannello**, e spariscono. Scatto: `variante-x-elv-sempre--390-light.png`.

**Due varianti, con i numeri di entrambe — e non ne scelgo nessuna (brief §5):**

| | che cosa fa | scuro | chiaro | contrasto di «DA QUI NON SI CORREGGE» |
|---|---|---|---|---|
| **(a)** | override **solo in scuro** → `--elv` + filo `--line`, sulla falsariga di `ds-v3.css:90` | ✅ righe rialzate col filo (`variante-a-elv-solo-scuro--390-dark.png`) | invariato | 6,07 → **4,72** in scuro; **4,17** in chiaro (invariato) |
| **(b)** | tinta invariata, un **filo** `--line` in tutti e due i temi | ⚠️ elevazione ancora invertita, ma il bordo si legge (`variante-b-filo--390-dark.png`) | filo appena percettibile | invariato (6,07 · **4,17**) |
| ~~(x)~~ | `--elv` senza condizione, come dice il brief | ✅ | 🔴 **righe invisibili** | 5,14 |

**ESITO: deferito, col motivo scritto.** Due rimedi plausibili → il brief §5 vieta di scegliere; e il
rimedio prescritto è **confutato** da una misura. La scelta è di Francesco.

### ❌2 — Le superfici nuove sono **CINQUE**, non quattro

Censimento di `--bg-deep` in `DevoIntervenire.tsx` (fatto sul file, non sulla memoria):

| riga | superficie | dell'ondata? |
|---|---|---|
| 1451 | `RigaVoce` — le sei righe del passo di correzione | ✅ Task D |
| 984 | il blocco «Da qui non si corregge» | ✅ Task D |
| 1343 | le pastiglie **spente** del nastro del percorso | ✅ Task D |
| 1670 | le righe del **selettore di persone** | ✅ Task D |
| 1714 | il riquadro «Elementi» del sotto-passo caratteristiche | ✅ Task D |
| 926 | i nove motivi | ⛔ preesistente (Task 6) — fuori dal gate |
| 1197 | il riquadro «E sul lavoro» | ⛔ preesistente (Task 6) — fuori dal gate |

Chi correggesse «tutte e quattro» ne lascerebbe indietro una.

### ❌3 — In tema **chiaro** quattro testi nuovi sono **sotto** la soglia WCAG AA

`provato:` `--faint` #7B6A59 su `--bg-deep` #ECE6D9 = **4,17** contro i 4,5 richiesti:

| testo | misura | dove |
|---|---|---|
| «Motivo» · «Le quattro caselle» · «Esito» | 4,17 · 12px/700 | pastiglie spente del nastro |
| «DA QUI NON SI CORREGGE» | 4,17 · 12,5px/800 | didascalia del blocco |

🛑 Non è «testo grande»: WCAG considera grande ≥ 18,66px in grassetto. Sono 12 e 12,5.
Rimedi possibili: `--muted` #6E6457 sullo stesso fondo → **4,66** (calcolato), oppure il fondo passa a
`--card` → **5,14** (misurato con la variante x). ⚠️ **La variante (a) del ❌1 NON lo tocca**, perché in
chiaro lascia `--bg-deep`: i due difetti vanno chiusi insieme o si chiude solo metà.

> ✅ **ESITO AGGIORNATO IL 09/08/2026 — CHIUSO da ⚖️ D329** (variante C3: riga più scura **e**
> didascalie a inchiostro pieno). `provato:` **rimisurato sulla pagina viva**, non ricalcolato — i
> quattro testi sono `rgb(29, 25, 19)` su `rgb(221, 214, 201)` = **12,11:1** (erano 4,17).
> 🔴 **MA IL DIFETTO NON SPARISCE DALLA SUPERFICIE: SI SPOSTA, E CRESCE.** Sulle stesse cinque
> superfici i testi `--muted` scendono da **4,66** a **4,01**, cioè sotto la soglia. Contati sulla
> pagina viva: **prima 4 testi sotto 4,5, adesso 12.** Dettaglio e scatti nella sezione «D329 —
> applicata», in fondo.
> ~~ESITO: deferito~~ (era: l'esito dipende da quale variante del ❌1 viene scelta).

### ❌4 — Il foglio **non torna in cima** quando cambia passo

È **UN foglio solo che cambia contenuto** (scelta dichiarata e pagata, v. il riquadro in testa a
`DevoIntervenire.tsx`): il nodo DOM resta lo stesso, quindi `scrollTop` **non si azzera da sé**.

`provato:` 390, la strada vera — si scorre l'elenco dei motivi col dito a 380px e si tocca una voce
**già in vista** (il browser non deve scorrere per raggiungerla):

| passo | scrollTop dopo il cambio | il titolo è in vista? |
|---|---|---|
| elenco motivi (scorso col dito) | 380 | no |
| → «Che cosa c'è di sbagliato?» | **380** | **no** |
| → sotto-passo «Caratteristiche prescritte» | **190** | **no** |

🔑 **La conseguenza è precisa, non generica:** il **nastro del percorso** — che il commento del codice
dichiara essere «*l'elemento con cui il mockup approvato DICE la variante A*» — è invisibile proprio nel
caso realistico, perché a 390 la voce «C'è un dato sbagliato sulla dichiarazione» sta a metà di un elenco
alto 1246px in una finestra da 776.
Scatti: `scorrimento2-1-motivo-scorso--390.png` · `scorrimento2-2-correzione-dopo--390.png` ·
`scorrimento2-3-sottopasso-dopo--390.png`.
Due varianti: **(i)** `Sheet` accetta una chiave di passo e azzera `scrollTop` quando cambia (il difetto
si chiude per **tutti** i fogli a passi); **(ii)** `DevoIntervenire` porta un `ref` in testa a ogni passo
e lo porta in vista (chiude solo questo foglio).
**ESITO: riferito, NON corretto** — è comportamento e tocca un componente del sistema (R-E2).

### ❌5 — L'odontogramma dentro un foglio v3, e la ragione del deferimento precedente **non vale più**

`provato:` sonda sul sotto-passo «Denti», 390:

| | chiaro | scuro |
|---|---|---|
| testi sotto 4,5 | **5 su 55** | **44 su 55** |
| il peggiore | 1,31 (pallino della legenda) | **3,44** — i numeri dei denti **selezionati**, #E8001A su #232018 |
| numeri dei denti | 4 (8px) | **4,45** (8px) |
| gettoni «Adulto» · «Deciduo» | **30 × 68** e **30 × 77** | idem |

🔴 **Il gate del 06/08 aveva deferito ESATTAMENTE questi due rilievi con la ragione «superficie legacy,
fuori ondata». Oggi quella ragione è falsa:** lo stesso componente è montato **dentro** la superficie
nuova dell'ondata, due volte (`DevoIntervenire.tsx:1701` e `:1728`).
Due varianti: **(α)** lo si accetta come **ponte legacy dichiarato**, con la ragione scritta accanto al
montaggio e una voce di roadmap che dice quando finisce; **(β)** si **deferiscono i due sotto-passi** che
lo montano finché non arriva l'ondata di migrazione dell'odontogramma.
⚠️ «Migrare il componente» **non è una variante**: DS v3 §14 dice che la migrazione è per **route**, mai
per componente.
**ESITO: deferito, col motivo.**

### ❌6 — Dopo un 409 la stessa frase compare **tre volte**, e l'avviso copre il foglio

`provato:` sullo schermo, `15-conflitto--390-light.png` e `prova-onchiudi-4-rientro.png`. La frase
«*Qualcun altro ha toccato questo lavoro mentre stavi correggendo…*» compare:
① nella card dell'avviso in cima · ② dentro il riquadro «Questo tentativo non è riuscito» · ③ come
`motivoDisabilitato` sotto il tasto spento.
E la card **non se ne va da sola**: gli avvisi di tipo errore non scadono mai (`Avviso.tsx:139`, per
D234) e il loro contenitore sta a `zIndex 1100`, sopra il foglio (1000). Dopo «Ricarica e riprendi» e il
rientro, **copre ancora il titolo del foglio e le prime due tappe del nastro**.
✅ **Ma una via d'uscita c'è, e va detto per non gonfiare il rilievo:** il contenitore ha
`pointer-events: none`, però **la card lo riaccende** (`auto`). `provato:` nel punto del «Chiudi»
`elementFromPoint` restituisce **il «Chiudi» stesso**, e premendolo la card sparisce (1 → 0). Il difetto
è di **lettura e di ripetizione**, non di prigionia: non serve ricaricare la pagina.
Due varianti: **(I)** sul 409 non chiamare `errore(...)` — il riquadro dice già la stessa cosa e **in
più** dice che cosa resta salvo; **(II)** tenere l'avviso e togliere il messaggio dal `motivoDisabilitato`.
**ESITO: riferito** — tocca il flusso, non le sole classi.

### ⚠️7 — Nella finestra del Task A la risposta che **annulla** il documento è quella grande e rossa

`04-taskA-uscito--390-light.png`. La domanda è un sì/no, ma le due risposte non hanno lo stesso peso:
«NO, È SEMPRE RIMASTO QUI» è il primario rosso in rilievo (è l'`etichettaDistruttiva`, e `primarioSopra`
la mette in cima); «Sì, è uscito» è un secondario quieto. La risposta col peso visivo è quella che
**riporta il lavoro fra i pronti e annulla la dichiarazione** (D293 · Art. 21(2) MDR) — cioè il difetto
che il Task A esisteva per chiudere, tornato per la porta della gerarchia visiva.
🔑 Non è un errore di token: il rosso in casa significa «attenzione», e il tasto è davvero quello
distruttivo. È una **decisione di gerarchia** — per esempio invertire l'ordine, o dare ai due lo stesso
peso perché sono due risposte a una domanda e non un'azione con il suo annulla.
**ESITO: riferito.**

---

## 3. Le 12 sezioni, sui quindici passi × sei combinazioni

| § | esito | misura |
|---|---|---|
| 1 Layout & allineamento | ⚠️ | tutto allineato, **ma** il passo nuovo può aprirsi già scorso (❌4) |
| 2 Proporzioni & spazio | ✅ 390/768 · ⚠️ 1280 | a 1280 il foglio resta una colonna da 480 al centro (stesso rilievo del gate 06/08, fuori ondata) |
| 3 Sovrapposizioni & z-index | ❌ | l'avviso d'errore (1100) copre il foglio (1000) e non scade (❌6) |
| 4 Tipografia | ✅ | Plus Jakarta Sans su tutto il foglio; nessun troncamento; il nome lungo «ROSSI MARIA CONCETTA ANTONIETTA» e la descrizione da 92 caratteri **vanno a capo dentro la riga**, non sfondano |
| 5 Colore, contrasto, tema | ❌ | ❌1 (elevazione invertita in scuro) · ❌3 (4,17 in chiaro) · ❌5 (odontogramma) |
| 6 Motion | ✅ | nessuna `duration`/easing inline nel codice toccato; il ramo `prefers-reduced-motion` rende gli stessi contenuti con le stesse misure — **misurato**, non dedotto |
| 7 Suono & haptic | N/A | il passo nuovo non introduce eventi sonori |
| 8 Touch target | ✅ nel foglio **e sulla riga della scheda** · ❌ nell'odontogramma | **tutti** i bersagli del foglio ≥ 44 (misurati con `getBoundingClientRect`, non col `minHeight` dichiarato): «Chiudi» 47,75 · «Torna all'elenco» 44 · righe 70,94-197,94 · pastiglie 48. ⚠️ **E la riga sulla scheda non sta nel foglio, quindi si misura a parte** (`DevoIntervenire.tsx:848` dichiara `minHeight: 52`): **100,5 × 350** a 390, **81 × 600** a 768, **81 × 632** a 1280 — in tutti e due i temi. 🔑 **Nessun 43,5 come il 06/08.** Sotto soglia solo «Adulto»/«Deciduo» a 30 (odontogramma) e la scorciatoia «Vai al contenuto» a 37 (preesistente, globale) |
| 9 Stati | ✅ | «Continua» spento **col motivo scritto**; il 409 spegne il tasto e offre la via d'uscita; il messaggio del server si mostra com'è scritto |
| 10 Responsive | ✅ | **nessuno scorrimento orizzontale di pagina** in nessuna delle 6 combinazioni × 15 passi. L'odontogramma a 390 sfora il suo riquadro di 18px ma **scorre dentro un contenitore `overflow-x: auto`**, non sfonda la pagina |
| 11 Accessibilità | ✅ con riserva | `role="dialog"` + `aria-modal`, titolo legato, trappola del focus, Esc; icone `aria-hidden`. **Non percorso col Tab su tutte e sei le combinazioni** (v. §6) |
| 12 Copy | ⚠️ | italiano corretto, nessun segnaposto; ma dopo un 409 la stessa frase è ripetuta **tre volte** (❌6) |

---

## 4. Quello che è andato BENE, e vale la pena scriverlo

- ✅ **Nessuno scorrimento orizzontale** su 90 combinazioni misurate.
- ✅ **Nessun bersaglio a 43,5.** Il difetto che il gate del 06/08 aveva trovato sulle righe della scheda
  non si ripete sulla superficie nuova.
- ✅ **Il 409 non brucia un progressivo.** Il controllo del gettone sta **prima** del render del PDF
  (`riemetti/route.ts:369`). `provato:` otto tentativi conclusi in 409 e le dichiarazioni del lavoro sono
  ancora **una sola**.
- ✅ **Le due navigazioni nuove** («Impostazioni», «Anagrafica») rispettano la regola di casa, misurate
  con lo stesso metro della guardia: destinazione raggiunta, `history.length` **invariata** (3 → 3: la
  destinazione ha preso il posto dell'entry dell'overlay, non le si è messa sopra), e la seconda
  pressione «indietro» **cambia qualcosa**.
- ✅ **Il ramo `prefers-reduced-motion`** (`SheetRidotto`, un percorso di codice a sé) non porta difetti
  in più: stessi testi, stessi contrasti, stessi bersagli.

---

## 5. La guardia sulla navigazione dentro gli overlay — **lanciata**, e verde

```
npx tsx scripts/giro-guardia-overlay.ts
```

```
consegna dalla pila → completa i dati: destinazione raggiunta, profondità 4 → 4, ritorno /lavori?pila=rossa poi /tutto-il-resto
menu ⋯ → ponte di modifica: destinazione raggiunta, profondità 4 → 4, ritorno /lavori/7dba9a57-… poi /tutto-il-resto
indietro non conferma: dialogo via, sheet resta, secondo indietro chiude lo sheet, 6 cassette intatte dopo il ricarico
album: tre strati — indietro chiude la tendina e lascia il visore aperto sotto
album: tre strati — indietro sulla conferma annulla: la foto è ancora lì dopo il ricarico
✅ navigare da un overlay: si arriva a destinazione, nessuna entry sepolta, nessuna pressione indietro morta, e indietro non conferma mai

=== la guardia è uscita con 0 ===
=== RIPRISTINO ===
✅ la riga è tornata esattamente com'era
```

🛑 **Verde non vuol dire coperto, e va detto:** i tre bracci della guardia sono **fissi** (consegna dalla
pila · menu ⋯ · album) e **nessuno passa dal passo di correzione**. Le due navigazioni che questa ondata
ha aggiunto sono fuori dalla sua portata — le ho misurate a parte (§4).

---

## 6. Che cosa NON è stato guardato

- **I passi `proposta` ed `esito` non sono stati raggiunti.** Ci si arriva solo **completando** l'atto
  unico, che riemette davvero il documento: brucia un progressivo e supera la dichiarazione viva. Non
  l'ho fatto. ⚠️ Quei due riquadri sono comunque **dichiarati incompleti e assegnati al Task 9** dal
  codice stesso (`DevoIntervenire.tsx:389-395`).
- **Il percorso corto fino in fondo** («No, è sempre rimasto qui»): riporta il lavoro fra i pronti e
  annulla la dichiarazione. La finestra del Task A è stata guardata; il tasto non è stato premuto.
- **Gli altri otto motivi.** Due di essi (`difetto_lavorazione`, `difetto_materiale`) oggi prendono 422:
  già censito e assegnato al **Task 9**, non diagnosticato qui.
- **`:focus-visible` percorso col Tab** su tutte e sei le combinazioni (§11 della checklist).
- **Suoni e haptic** (§7): non misurabili da un browser guidato; il passo nuovo non ne introduce.
- **Device vero** (touch, notch, safe-area): solo emulazione di viewport.
- Il giro **reduced-motion** è stato fatto a 390 sul passo di correzione e sull'odontogramma, non su
  tutti e quindici i passi.

---

## 7. La fixture: che cosa è stato creato sul banco, e come si toglie

Senza queste righe **due dei sei sotto-passi non erano raggiungibili** e il selettore di persone non
aveva nessuno da mostrare. `lavori_prescrizioni` e `lavori_denti` avevano **zero righe su tutto il banco**.

🛑 **Non si scrive con la chiave di servizio via supabase-js:** `lavori_denti` e `lavori_prescrizioni`
rispondono `permission denied for table` a `service_role` in scrittura. Si passa da `scripts/psql.mjs`.

```sql
-- CREA
insert into public.lavori_denti (lavoro_id, laboratorio_id, fdi, ruolo, provenienza, scala, codice) values
  ('cdfee91f-5952-4eb9-8114-f36e4344645d','00000000-0000-0000-0000-000000000001',14,'elemento','prescritto','vita_classical','A2'),
  ('cdfee91f-5952-4eb9-8114-f36e4344645d','00000000-0000-0000-0000-000000000001',15,'elemento','prescritto',null,null),
  ('cdfee91f-5952-4eb9-8114-f36e4344645d','00000000-0000-0000-0000-000000000001',16,'mancante','prescritto',null,null);

insert into public.lavori_prescrizioni (lavoro_id, laboratorio_id, contenuto, divergenze, fonte_tipo, fonte_riferimento, numero_prescrizione)
values ('cdfee91f-5952-4eb9-8114-f36e4344645d','00000000-0000-0000-0000-000000000001',
        '{"elementi":[14,15],"colore":"A2","materiale":"Disilicato di litio"}'::jsonb, '{}'::jsonb,
        'foglio','fixture gate L2 D-bis','PR-D-BIS-001');

insert into public.pazienti (id, laboratorio_id, cliente_id, nome_cognome, cognome, nome, codice_paziente, archiviato)
values ('dbb50000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000003','ROSSI MARIA CONCETTA ANTONIETTA','ROSSI','MARIA CONCETTA ANTONIETTA','D-BIS-0002',false);

-- TOGLIE
delete from public.lavori_denti where lavoro_id='cdfee91f-5952-4eb9-8114-f36e4344645d';
delete from public.lavori_prescrizioni where lavoro_id='cdfee91f-5952-4eb9-8114-f36e4344645d';
delete from public.pazienti where id='dbb50000-0000-4000-8000-000000000002';
```

⚠️ **Tre trappole pagate scrivendo la fixture**, perché non si ripaghino: `scala` deve essere
`vita_classical` (non `vita_classic` — c'è una FK su `colori_dentali`) · `fonte_tipo` accetta solo
`foglio|email|modulo|piattaforma` · e se `fonte_tipo` c'è, serve anche `fonte_riferimento` o
`fonte_immagine_id` (CHECK `lavori_prescrizioni_fonte_ck`).

**Residuo cancellato a fine gate:** gli **otto** `eventi_qualita` `errore_dato_dichiarazione` che i giri
hanno depositato sul lavoro 2026/0005 (che ne aveva **zero** prima). Nessuna dichiarazione è stata
riemessa: tutti gli otto tentativi si sono chiusi in 409 **prima** del render.

---

## 8. I file

| nome | cosa |
|---|---|
| `01-riga` … `15-conflitto`, `--<larghezza>-<tema>` | i quindici passi × sei combinazioni; il suffisso `-fondo` è lo stesso passo scorso fino in fondo, dove il pannello sfora |
| `prova-onchiudi-1…4` | la prova su `onChiudi` (§1) |
| `variante-0-comè` · `variante-a-elv-solo-scuro` · `variante-b-filo` · `variante-x-elv-sempre` | le due varianti del ❌1 **e la confutazione** del rimedio del brief, chiaro e scuro |
| `scorrimento2-1…3` | il ❌4, sulla strada vera |
| `misure-*` · `scorrimento-*` | le sonde di contrasto, bersagli e sforamento |

---

# D326 — applicata (9 agosto 2026, 01:11 · `provato:` `date` → `Sun Aug  9 01:11:35 CEST 2026`)

> ⚖️ **D326, Francesco, 09/08/2026:** «*preferisco la seconda tipologia del tema scuro, su quello
> chiaro aumentiamo il contrasto tra lo sfondo della scheda e le opzioni*»

**Metà decisa, metà no.** ① il tema **scuro** prende la variante **(b)** ed è **nel codice**.
② il tema **chiaro** ha **tre varianti** fotografate e misurate, **e nessuna scelta**: la scelta è di
Francesco.

---

## ① Il tema scuro — che cosa è cambiato

**Il filo NON è scritto nel componente: è un token.** `--filo-superficie` vale `transparent` in
chiaro e `var(--line)` in scuro.

| dove | che cosa |
|---|---|
| `src/app/ds-v3.css:37` | `--filo-superficie: transparent` (blocco `[data-ds="v3"]`, tema chiaro) |
| `src/app/ds-v3.css:82` | `--filo-superficie: var(--line)` (blocco `[data-theme="dark"]`) |
| `DevoIntervenire.tsx:988` | il blocco «Da qui non si corregge» — bordo **nuovo** |
| `DevoIntervenire.tsx:1352` | le pastiglie del nastro — bordo **nuovo** (quella accesa lo prende `--ink`, per non restare 2px più bassa) |
| `DevoIntervenire.tsx:1465` | `RigaVoce`, le sei righe del passo di correzione — `1px solid transparent` **→** `1px solid var(--filo-superficie)` |
| `DevoIntervenire.tsx:1687` | le righe del selettore di persone — il ramo «non scelta» passa da `transparent` al filo; `--ink` resta il segno «questa l'hai scelta» |
| `DevoIntervenire.tsx:1734` | il riquadro «Elementi» — bordo **nuovo** |

🔑 **Perché un token e non una regola CSS:** quelle cinque superfici dipingono il bordo con uno
`style` inline, e **uno style inline batte sempre una regola di foglio di stile** — un
`border-color` scritto in `ds-v3.css` non le avrebbe toccate. Si ridefinisce quindi la **variabile**
(stessa forma delle regole `.ds-medico-riga` / `.ds-via-d212` già in casa). Conseguenza utile: **il
tema chiaro si chiuderà cambiando UNA riga**, non sette.

### Prima e dopo, in scuro — e la misura di che cosa si è ottenuto

| | prima | dopo |
|---|---|---|
| scatto | `06-correzione--390-dark.png` | **`d326-dopo-correzione--390-dark.png`** (+ `--768-` e `--1280-dark`) |
| riga `--bg-deep` #100E0B ↔ pannello `--card` #211D18 | **1,15:1** | **1,15:1** (invariato) |
| bordo | **nessuno** | `1px` **#342E26** — `provato:` sonda sul DOM, `getComputedStyle().borderTopColor` = `rgb(52, 46, 38)` su tutte e cinque |
| bordo ↔ pannello | — | **1,25:1** |
| bordo ↔ riga | — | **1,44:1** |

Altri due scatti, perché due delle cinque superfici vivono in sotto-passi e **non si vedono dalla
schermata principale**: `d326-dopo-persone--390-dark.png` (selettore di persone) e
`d326-dopo-caratteristiche--390-dark.png` (riquadro «Elementi»).

### 🔄 CORREZIONE A ME STESSO — «in chiaro non cambia niente» era FALSO di 2px

Avevo scritto che il tema chiaro resta identico. **È vero per il colore, non per la geometria.** Due
delle cinque superfici (`:1465` e `:1687`) portavano già `1px solid transparent` e quindi non si
muovono di un pixel; **le altre tre (`:988`, `:1352`, `:1734`) il bordo non ce l'avevano**, e un bordo
trasparente **occupa comunque lo spazio**.

`provato:` misurato sul DOM a 390 chiaro, togliendo il bordo per rileggere il «prima»:

| superficie | prima | dopo |
|---|---|---|
| pastiglia spenta del nastro (`:1352`) | 60,91 × **28** | 62,91 × **30** |
| blocco «Da qui non si corregge» (`:988`) | 342 × **253,25** | 342 × **255,25** |
| `RigaVoce` (`:1465`) | 342 × **70,94** | 342 × **70,94** — invariata |

**+2px, e crescono: nessun bersaglio scende sotto soglia** (e le pastiglie del nastro non sono
premibili). La larghezza esterna dei blocchi non cambia — cambia di 2px quella **interna**, e
l'altezza è cresciuta di **esattamente 2**, cioè **nessun testo è andato a capo in più**. Il riquadro
«Elementi» (`:1734`) è lo stesso `div` con la stessa imbottitura di `:988`: **non l'ho misurato a
parte**.
🔑 **Perché lo scrivo invece di lasciarlo correre:** il referto qui sopra dichiara le righe a
**70,94** e le pastiglie a una misura precisa. Una misura del gate contraddetta da una riga scritta
dopo, nello stesso file, è esattamente il difetto che il commento riscritto in `DevoIntervenire.tsx:1435`
esiste per impedire.

🛑 **E va detto per intero: (b) NON raddrizza l'elevazione, la delimita soltanto.** La riga resta più
scura del pannello che la contiene — cioè il contrario della regola di §3.2 del design system. Era
l'esito dichiarato della variante (b) nel referto («*elevazione ancora invertita, ma il bordo si
legge*»), ma il numero non era mai stato scritto: **1,15:1**, identico a prima.

---

## ② Il tema chiaro — TRE varianti, TRE assi diversi, nessuna scelta

Il vincolo del brief è confermato dalla misura: **in chiaro la variante (b) da sola non si vedrebbe**
(filo `--line` #EBE4D6 contro pannello `--card` #FFFEFA = **1,25:1**). Per questo `--filo-superficie`
in chiaro vale `transparent`: il tema chiaro è **una decisione aperta**, non una dimenticanza.

🛑 **Le varianti NON sono nel codice.** Sono state iniettate sulla pagina viva e fotografate. Solo ①
è entrato nel repository.

| | asse | che cosa fa | separazione riga↔pannello | didascalie 12px sulla riga | scatti (390 · 768 · 1280) |
|---|---|---|---|---|---|
| **oggi** | — | `--bg-deep` nudo | **1,23:1** | `--faint` **4,17** ❌ AA | `d326-chiaro-c0-come--<w>-light.png` |
| **C1** | **il bordo** | `--filo-superficie: color-mix(in srgb, var(--muted) 65%, var(--line))` → **#9A9183** | 1,23 (invariata) **+ filo a 3,08:1** ✅ (WCAG 1.4.11 chiede 3:1) | invariate: **4,17** ❌ | `d326-chiaro-c1-filo--<w>-light.png` |
| **C2** | **la materia** | `--sh-press` sulle righe premibili, `--sh-card` sui due riquadri che non si premono | 1,23 (invariata) **+ banda d'ombra a 1,26:1** | invariate: **4,17** ❌ | `d326-chiaro-c2-ombra--<w>-light.png` |
| **C3** | **la tinta** | riga `color-mix(in srgb, var(--muted) 12%, var(--bg-deep))` → **#DDD6C9**, **e** didascalie da `--faint` a `--ink` | **1,43:1** ✅ la sola che alza davvero questo numero | `--ink` **12,11** ✅ AA | `d326-chiaro-c3-riga-scura--<w>-light.png` |

`provato:` i colori risolti sono stati riletti dal DOM, non dedotti — C1 `color(srgb 0.602941
0.567843 0.51549)` = #9A9183, C3 `color(srgb 0.866196 0.840784 0.789804)` = #DDD6C9. Il calcolatore
di contrasto (`scripts/tmp/contrasto.mjs`, usa e getta) è stato **tarato su quattro numeri
indipendenti già scritti in questo referto** — 1,23 · 1,25 · 4,17 · 4,66 — e li riproduce tutti e
quattro.

**Le tre cose da sapere prima di scegliere:**

1. 🔴 **C3 è l'unica che alza davvero la separazione, ed è anche l'unica che costa.** Alzarla oltre
   costa in fretta: a **20%** di `--muted` la separazione arriva solo a **1,58** mentre `--faint`
   scende a **3,25** e perfino `--muted` a **3,63** — tutti e due sotto AA. **È per questo che C3
   porta con sé il cambio di colore delle didascalie**: senza, a 12% le didascalie starebbero a
   **3,59**, cioè peggio di oggi. Il fondo del pannello è quasi bianco: scurire la riga allontana la
   riga dal pannello **e** avvicina il testo alla riga, nella stessa mossa.
2. ⚠️ **C3 non scurisce solo la riga: promuove le didascalie a inchiostro pieno.** A **12,11:1** una
   scritta da 12px in maiuscoletto pesa quanto il testo del corpo — cioè **cambia la gerarchia della
   schermata**, non solo il contrasto. È parte di ciò che si sceglie, e da un rapporto non si vede.
3. **C1 è l'unica che raggiunge una soglia di legge** (3:1 per il contorno di un elemento
   d'interfaccia, WCAG 1.4.11), e non tocca né la tinta né i testi.
4. **C2 è gratis in scuro**: `--sh-press` e `--sh-card` valgono `none` nel tema scuro, quindi non può
   entrare in conflitto con ①. In più dice **che cosa si preme**: l'ombra da premere va solo sulle
   righe, i due riquadri informativi prendono l'ombra da carta. 📌 **Quella metà si vede solo nello
   scatto a 1280** (`d326-chiaro-c2-ombra--1280-light.png`): a 390 il blocco «Da qui non si corregge»
   sta quasi tutto sotto il bordo dello schermo, e resta visibile solo «le righe hanno un'ombra».

📌 **768 e 1280 non aggiungono niente:** a tutte e tre le larghezze il foglio è la stessa colonna da
480 al centro, quindi le superfici sono identiche. Gli scatti ci sono lo stesso.

---

## 🔴 Dove il mandato di questo compito sbagliava — cinque cose, cercate apposta

1. 🛑 **Il brief separa ❌1 da ❌3, ma il referto dice che vanno chiusi INSIEME** (❌3: «*i due difetti
   vanno chiusi insieme o si chiude solo metà*»). Il mandato di oggi chiede tre varianti per il
   **contrasto fra pannello e righe** e non nomina mai i **quattro testi sotto la soglia WCAG**.
   Conseguenza concreta: **se Francesco sceglie C1 o C2, il ❌3 resta aperto** e servirà una seconda
   decisione. **Solo C3 lo chiude**, e lo chiude perché è costretta a farlo.
2. 🔴 **Le superfici `--bg-deep` dentro quel foglio sono SEI, non cinque — e la sesta non è in
   `DevoIntervenire.tsx`.** `provato:` sonda sul DOM del passo di correzione: **11** superfici con
   `var(--bg-deep)` dentro `.ds-sheet` (6 righe + 3 pastiglie spente + il blocco «Da qui non si
   corregge» + **il tasto primario SPENTO**). Il tasto è `TastoPrimario.tsx:90`
   (`background: disabled ? 'var(--bg-deep)' : …`): in scuro è **#100E0B su un pannello #211D18**,
   cioè **1,15:1 e senza filo** — esattamente il difetto del ❌1, su una superficie che resta com'era.
   🔑 **Il censimento del ❌2 era fatto su UN FILE**, e la regola di casa (R-P6) dice che l'elenco non
   lo decide l'autore. **Non l'ho toccato** (è un componente del design system: R-E2 + migrazione per
   route), lo riferisco.
3. **Il brief chiama tutte e cinque «superfici premibili». Tre non si premono:** il blocco «Da qui
   non si corregge» (988), le pastiglie spente del nastro (1352) e il riquadro «Elementi» (1734). Lì
   il filo **delimita**, non promette un tocco — per questo il token si chiama `--filo-superficie` e
   non `--filo-premibile`. Chi leggesse il brief alla lettera concluderebbe che in questo design
   system un filo significa «si preme», e non è così.
4. **La divergenza con le due superfici fuori perimetro è VISIBILE, anche se mai nella stessa
   schermata.** Le nove voci dei motivi (`:926`) restano senza filo: si vedono al passo **prima**
   (`03-motivo--390-dark.png`), le righe col filo al passo **dopo**
   (`d326-dopo-correzione--390-dark.png`). Non convivono a schermo, ma **si susseguono a due secondi
   di distanza dentro lo stesso foglio**. Il brief le dichiara «preesistenti, Task 6, fuori
   perimetro»: giusto come confine di lavoro, **ma non vuol dire che non si notino**. Stesso discorso
   per il riquadro «E sul lavoro» (`:1202`), che sta nel passo «dettagli».
5. **Il brief propone tre assi come se fossero equivalenti** («un filo più marcato, un'ombra, o una
   riga più scura»). **Misurati, non lo sono:** solo il filo arriva a una soglia di legge; l'ombra
   vale come banda **1,26:1**, cioè quasi quanto il filo `--line` che il brief stesso dà per
   invisibile (1,25); e la riga più scura paga in contrasto del testo più di quanto renda in
   separazione. Non è un errore del brief — è una cosa che si sapeva solo dopo aver misurato, e ora
   è scritta.

---

## FASE 7 — verde, e allineata alla base

```
npm run verify:full ; ESITO=$? ; echo "VERIFY_EXIT=$ESITO"
```

```
Test Files  450 passed | 6 skipped (456)
     Tests  5685 passed | 68 skipped (5753)
✓ Compiled successfully in 4.5s
VERIFY_EXIT=0
```

**Identica alla base dichiarata nel mandato** — 5685 passate · 68 saltate su 456 file, `tsc` senza
errori, `next build` a posto. In più `eslint --max-warnings 0` e le guardie di casa, che stanno
dentro `verify:full`.
⚠️ **`$?` letto da variabile e MAI dietro una pipe** (dietro una pipe leggerebbe l'ultimo comando —
errore già pagato due volte in questo progetto).
📌 **Nessun test asserisce su questi stili:** `tests/unit/DevoIntervenire.test.tsx` (1239 righe) non
nomina né `border` né `transparent`. Cercato prima di toccare il codice, non dopo.

---

## Che cosa NON è stato fatto

- **Il tema chiaro NON è stato scelto.** Tre varianti, nessuna nel codice: aspetta Francesco.
- **Le righe 926 (i nove motivi) e 1202 (il riquadro «E sul lavoro») NON sono state toccate**, né il
  tasto primario spento del punto 🔴2.
- **Nessuno degli altri rilievi del gate è stato chiuso:** ❌3 (WCAG), ❌4 (il foglio non torna in
  cima), ❌5 (odontogramma), ❌6 (la frase tre volte dopo il 409), ⚠️7 (la gerarchia della finestra
  del Task A) restano tutti aperti.
- **Il ramo `prefers-reduced-motion` non è stato rifotografato.** Il filo è uno stile fermo e non
  passa dal motore delle animazioni, quindi vale identico nei due rami — **ma non l'ho visto**.
- **La guardia della navigazione negli overlay non è stata rilanciata:** questo compito non tocca
  nessuna navigazione.
- **Il banco è stato lasciato ESATTAMENTE come l'ho trovato.** La fixture del §7 era **ancora in
  piedi** (3 denti, 1 prescrizione, la seconda persona): `provato:` contata prima e dopo, invariata.
  Nessun evento depositato (`eventi_qualita` = **0** prima e dopo), nessuna dichiarazione riemessa
  (**1**, la stessa). **Non ho creato né cancellato niente.**
- **Niente è stato pubblicato.**

---

# D329 — applicata (9 agosto 2026)

> ⚖️ **D329, Francesco, 09/08/2026:** «*c3*» — la variante **C3** del tema chiaro: **riga più scura**
> e **didascalie a inchiostro pieno**. Le due cose sono una variante sola.

## ① Che cosa è cambiato, e dove

Come per D326, non è scritto nel componente: sono **due token**.

| dove | chiaro | scuro |
|---|---|---|
| `src/app/ds-v3.css:38` · `:97` | `--fondo-superficie: color-mix(in srgb, var(--muted) 12%, var(--bg-deep))` | `var(--bg-deep)` |
| `src/app/ds-v3.css:39` · `:98` | `--didascalia-superficie: var(--ink)` | `var(--faint)` |

Consumati in `DevoIntervenire.tsx` — **cinque fondi** (`:991 · 1353 · 1475 · 1700 · 1751`) e **sei
scritte piccole** (`:996 · 1360 · 1421 · 1445 · 1493 · 1756`).

🔑 **Perché anche il tema scuro compare nella tabella.** Se le due righe del blocco scuro si
omettessero, il tema scuro **erediterebbe la resa del chiaro**: `--muted` in scuro è **chiaro**
(#A69B8C), quindi la riga si **schiarirebbe** invece di scurirsi, e le didascalie diventerebbero
#F2EEE7. Sarebbe una decisione mai presa, entrata per omissione.

## ② Prima e dopo in chiaro, coi numeri RIMISURATI sulla pagina viva

`provato:` sonda sul DOM del banco, 390 chiaro, passo di correzione. **Non sono i numeri calcolati in
anticipo: sono quelli letti da `getComputedStyle` dopo il cambiamento.**

| | prima | dopo |
|---|---|---|
| fondo della riga | `--bg-deep` **#ECE6D9** | **#DDD6C9** (`rgb(221, 214, 201)`) |
| riga ↔ pannello `--card` | **1,23:1** | **1,43:1** |
| le quattro scritte del ❌3 | `--faint` **4,17** ❌ | `--ink` **12,11** ✅ |
| altezza pastiglia del nastro | 62,91 × **30** | 62,91 × **30** — **invariata** |
| altezza riga del selettore | 342 × **71,5** | 342 × **71,5** — **invariata** |

📌 **I 2px non si ripetono, ed è stato ricontrollato invece che dedotto:** D326 aveva aggiunto un
bordo (che occupa spazio); D329 cambia **solo colori**, quindi la geometria non si muove. Misurato,
non supposto.

Scatti: **`d329-dopo-correzione--390-light.png`** (+ `--768-` e `--1280-light`) ·
`d329-dopo-persone--390-light.png` · `d329-dopo-caratteristiche--390-light.png`.
A 768 e 1280 non cambia nulla: il foglio è la stessa colonna da 480 al centro.

## ③ Il tema scuro NON è cambiato — verificato, non dichiarato

`provato:` stessa sonda, 390 scuro. **Tutti e tre i valori che D326 aveva fissato sono identici:**

| | dopo D326 | dopo D329 |
|---|---|---|
| fondo della riga | `rgb(16, 14, 11)` | `rgb(16, 14, 11)` |
| filo | `rgb(52, 46, 38)` 1px | `rgb(52, 46, 38)` 1px |
| didascalie | `--faint` `rgb(154, 143, 128)`, **6,07:1** | idem |
| pastiglia · riga persone | 62,91 × 30 · 342 × 71,5 | idem |

**Testi sotto soglia in scuro sulle cinque superfici: 0 su 30** (il passo di correzione).
Scatti di controllo: `d329-dopo-correzione--390-dark.png` e i due sotto-passi.

---

## 🔴 ④ IL DIFETTO NUOVO — c'è, è misurato, e NON l'ho aggiustato

### (a) Il conto dei testi sotto soglia in chiaro passa da 4 a 12

Scurire la riga allontana la riga dal pannello **e** avvicina il testo alla riga: è la stessa mossa.
Le scritte promosse a `--ink` guadagnano; **quelle rimaste `--muted` perdono.**

| testo | prima (su #ECE6D9) | dopo (su #DDD6C9) |
|---|---|---|
| le sei etichette delle righe («Chi ha prescritto», «Paziente»…) — 13px/700 | 4,66 ✅ | **4,01** ❌ |
| i due paragrafi di «Da qui non si corregge» — 14px | 4,66 ✅ | **4,01** ❌ |
| i due **collegamenti** «Impostazioni» e «Anagrafica» — 14,5px | 4,66 ✅ | **4,01** ❌ |
| le due righe di sotto del selettore di persone — 13px | 4,66 ✅ | **4,01** ❌ |

`provato:` sonda su **tutti** i testi delle cinque superfici — **10 su 30 sotto soglia** al passo di
correzione, **2 su 4** al selettore di persone, **più «COLORE»** nel sotto-passo caratteristiche (v. la correzione qui sotto). Prima erano 4 in tutto.
🛑 **Due dei dodici sono collegamenti** — l'unica via per andare in Impostazioni e in Anagrafica da
quel blocco.

🔄 **CORREZIONE: i testi sono TREDICI, non dodici — e il tredicesimo non è dello stesso tipo.**
Avevo contato solo il passo di correzione e il selettore di persone. Nel **sotto-passo
caratteristiche** c'è un'altra scritta sulla superficie nuova: la didascalia **«COLORE»** del campo di
testo, che è `--faint` 13px/800 e **NON è una delle mie sei**, perché vive in un componente condiviso
(`src/components/ds/Campo.tsx:28`). Sul fondo nuovo passa da **4,17** a **3,59**.
🔑 **La differenza conta:** i dodici **passavano** e adesso non passano; questo **non passava già** e
adesso passa peggio. ➡️ **E dice dov'è il confine del rimedio:** i sei punti che ho spostato a
inchiostro stanno tutti in `DevoIntervenire.tsx`; **una didascalia della stessa famiglia, ma disegnata
da un componente del design system, resta indietro.** Chi chiuderà i dodici deve decidere anche questa
— e quella è una superficie condivisa (R-E2 + migrazione per route), non una riga di questo foglio.

📌 **E due ❌ che compaiono nella mia stessa sonda NON sono di D329, per non farli cercare a nessuno:**
- Nel sotto-passo caratteristiche, **cinque** ❌ (i pallini della legenda a **1,31**, i numeri dei denti
  rossi a **4,00**) stanno su `rgb(228, 223, 217)` — **il fondo che l'odontogramma dipinge da sé**
  (`OdontogrammaFDI.tsx:537`, token **v2.3**), non sulla superficie che D329 tocca. Sono il **❌5** già
  agli atti, e **il numero 1,31 è identico a quello misurato prima di D329**.
- In tema scuro, l'unico ❌ del passo di correzione — la pastiglia «altra persona» a **1,00** — è un
  **artefatto della mia sonda**: quel gettone ha un fondo semitrasparente (`--purple-tint`,
  `rgba(185,139,232,.14)`) e il camminatore che risale la catena dei fondi lo ha preso per opaco,
  confrontando il colore con sé stesso. **Non è un difetto: è un numero che non vuol dire niente.**
🔑 **E non è la scelta di C3 a essere sbagliata: è che su questo asse non si vince.** Con `--card`
quasi bianco, **qualunque** scurimento della riga porta `--muted` sotto 4,5 — parte da 4,66, e il
primo passo utile lo sfonda. **Il rimedio non è cambiare variante, è spostare quei dodici testi**
(per esempio a `--ink`, che sullo stesso fondo dà **12,11**). **Non l'ho fatto: non è mio da
decidere** (R-E2), ed è la stessa mossa che ha appena chiuso il ❌3.

### (b) Il nastro del percorso non dice più «sei qui»

🖼️ **`d329-rilievo-nastro-prima-sopra-dopo-sotto--390-light.png`** — prima sopra, dopo sotto.
Le tre tappe **spente** erano grigie: si leggevano come «già fatte / non ancora». Adesso sono
**nero pieno**, cioè lo stesso peso del testo della tappa **corrente**. A distinguerle resta il solo
riempimento della pastiglia (chiara contro scura), non più l'intensità.
🔑 È esattamente il rischio che la variante portava con sé: **C3 sposta la gerarchia, non solo il
contrasto.** **Riferito, non aggiustato.**

### (c) Un dettaglio dell'immagine che le parole non dicevano

La decisione parla di «**didascalie**». Nell'immagine che Francesco ha scelto era passato a
inchiostro **ogni** `--faint` su quelle superfici — quindi anche i **galloni `›`** in fondo a ogni
riga e la freccia `→`. Ho applicato **l'immagine**, perché è l'immagine che è stata scelta, e lo
scrivo perché i due non coincidono. Se si volevano le sole didascalie, si torna indietro cambiando
**tre righe** (`:1421`, `:1445`, `:1493`) da `--didascalia-superficie` a `--faint`.

---

## ⑤ FASE 7

```
npm run verify:full ; ESITO=$? ; echo "VERIFY_EXIT=$ESITO"
```

```
Test Files  450 passed | 6 skipped (456)
     Tests  5685 passed | 68 skipped (5753)
✓ Compiled successfully in 6.0s
VERIFY_EXIT=0
```

🔄 **E il primo giro era ROSSO, per colpa mia.** Avevo messo un commento JSX (`{/* … */}`) **dentro**
un `{condizione && ( … )}`, dove non ci può stare: `tsc` ha dato **cinque errori di sintassi**,
`VERIFY_EXIT=2`. Corretto spostando il commento fuori dalla parentesi, e rilanciato per intero. Lo
scrivo perché un verde raccontato senza il rosso che l'ha preceduto è un verde più fragile di quel
che sembra.

🔄 **Seconda correzione a me stesso, e questa aveva prodotto NUMERI FALSI.** La prima sonda leggeva
`color-mix` come Chrome lo risolve — `color(srgb 0.866 0.840 0.789)`, cioè in scala **0-1** — e lo
trattava come 0-255: ogni fondo diventava quasi nero e i contrasti uscivano **1,19** invece di
**12,11**. Se avessi creduto a quella tabella avrei scritto che C3 rompe tutto. **Il numero l'ho
riconosciuto sbagliato perché non tornava con la previsione**, non perché me ne sono accorto a
schermo.

## ⑥ Che cosa resta fuori

- **Nessuno dei dodici testi a 4,01 è stato toccato**, né il nastro, né i galloni. Tutti **riferiti**.
- **Le righe 926 e 1205** (i nove motivi, il riquadro «E sul lavoro») restano `--bg-deep`: fuori
  perimetro, e adesso la differenza in chiaro è **di tinta**, non più solo di filo.
- **Il tasto primario spento** (`TastoPrimario.tsx:90`) resta `--bg-deep`: **in chiaro adesso è più
  chiaro delle righe** che gli stanno sopra, dove prima era uguale. Sesta superficie, sempre fuori
  mandato.
- **Gli altri rilievi del gate** — ❌4, ❌5, ❌6, ⚠️7 — restano aperti.
- **Il ramo `prefers-reduced-motion` non è stato rifotografato** (D329 non tocca il movimento).
- **Il banco è stato lasciato com'era:** fixture intatta, `eventi_qualita` 0 prima e dopo.

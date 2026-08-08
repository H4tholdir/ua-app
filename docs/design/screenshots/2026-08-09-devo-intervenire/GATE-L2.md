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
**ESITO: deferito, col motivo** — l'esito dipende da quale variante del ❌1 viene scelta.

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
| 8 Touch target | ✅ nel foglio · ❌ nell'odontogramma | **tutti** i bersagli del foglio ≥ 44 (misurati con `getBoundingClientRect`, non col `minHeight` dichiarato): «Chiudi» 47,75 · «Torna all'elenco» 44 · righe 70,94-197,94 · pastiglie 48. 🔑 **Nessun 43,5 come il 06/08.** Sotto soglia solo «Adulto»/«Deciduo» a 30 (odontogramma) e la scorciatoia «Vai al contenuto» a 37 (preesistente, globale) |
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

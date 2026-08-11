# RESOCONTO — Task D-bis: la prova a schermo e i due gate estetici arretrati

**Quando:** 9 agosto 2026, 00:05-00:40 (`provato:` `date` in un comando a sé → `Sun Aug  9 00:33:44 CEST 2026`).
**Ramo:** `intervento-post-consegna`, nessun worktree.
**Banco:** build di produzione su `localhost:3020` · lavoro **2026/0005** (`cdfee91f-…`), consegnato, con
`DDC-2026-0003` viva · utenza `e2e-titolare@ua-test.local` via link d'accesso monouso (D103).
**Artefatto gemello:** `docs/design/screenshots/2026-08-09-devo-intervenire/GATE-L2.md` (157 file:
90 scatti di matrice + le prove, le varianti e le sonde).

| cosa | esito |
|---|---|
| La prova su `onChiudi` | 🟢 **l'ipotesi del brief NON si riproduce** — le correzioni sopravvivono |
| Gate L2 (arretrato d'ondata **+** Task A) | **7 rilievi**: 6 ❌ e 1 ⚠️ — **0 corretti, 7 riferiti/deferiti col motivo** |
| Guardia sugli overlay | 🟢 **lanciata**, `la guardia è uscita con 0`, fixture ripristinata |
| Le due navigazioni nuove | 🟢 misurate a parte: la guardia **non le copre** |
| FASE 9 — 390·768·1280 × chiaro·scuro | 🟢 fatta su **15 passi × 6 combinazioni**, più il ramo reduced-motion |
| Codice cambiato | **nessuno** → nessuna FASE 7 dovuta (v. §4) |
| Dove il brief sbaglia | **7 punti**, uno dei quali romperebbe il tema chiaro se applicato |

---

## 1. FASE 9 — la prova a schermo

Un giro per combinazione, e ogni giro tocca **quindici passi**: la riga sulla scheda · la domanda
d'ingresso · i nove motivi · **la finestra del Task A** · l'elenco dei motivi con l'avviso azzurro D262 ·
il passo nuovo «Che cosa c'è di sbagliato?» · i **sei** sotto-passi · il passo con due correzioni scritte
davvero · le quattro caselle · **il riquadro del 409**. Dove il pannello sfora, un secondo scatto lo
mostra scorso fino in fondo (38 passi su 90 sforano: è un bottom sheet, se ne aspetta).

**Non è «si vede bene»: sono misure.** Per ogni passo la sonda registra l'altezza vera di ogni bersaglio
(`getBoundingClientRect`, mai il `minHeight` dichiarato — è così che il 06/08 si erano scoperti i 43,5),
il contrasto di ogni testo, il colore di fondo risolto e lo sforamento del pannello.

**Che cosa ho visto:**
- ✅ **Nessuno scorrimento orizzontale di pagina** in nessuna delle 90 combinazioni.
- ✅ **Il contenuto vero ci sta dentro.** Il nome più lungo del banco (creato apposta, «ROSSI MARIA
  CONCETTA ANTONIETTA») entra nella riga del selettore; una descrizione da 92 caratteri va a capo dentro
  la riga «vecchio → nuovo» e la fa crescere a 197px invece di sfondarla.
- ✅ **Tutti i bersagli del foglio ≥ 44px.** «Chiudi» 47,75 · «Torna all'elenco» 44,00 · righe 70,94 ·
  pastiglie 48. Sotto soglia **solo** «Adulto»/«Deciduo» a 30 (odontogramma, v. ❌5) e la scorciatoia
  globale «Vai al contenuto» a 37 (preesistente).
- ✅ **`prefers-reduced-motion` è un ramo di codice diverso** (`SheetRidotto`) e l'ho percorso: stessi
  testi, stessi contrasti, stessi bersagli, nessun difetto in più.
- ❌ **Il foglio non torna in cima quando cambia passo** (❌4 sotto): è il rilievo che solo un giro a
  schermo poteva dare.

---

## 2. 🔴 LA PROVA SU `onChiudi` — l'ipotesi del brief non si riproduce

Il brief chiedeva di provarla **prima di tutto**: il foglio si chiude con `setFase('chiuso')` ma è
montato con `onChiudi={ricomincia}`, e `ricomincia` fa `setCorrezioni({})`.

Per provarla serviva arrivare a un **409**, che è l'unica strada che accende «Ricarica e riprendi» — e il
brief non dice come. Ricetta trovata e usata: si carica la pagina, si entra nel passo di correzione, si
scrive, poi si fa **invecchiare il gettone dal database** (`update lavori set updated_at = now()`) e si
preme il tasto finale. La rotta controlla il gettone **prima** di rendere il PDF
(`riemetti/route.ts:369`), quindi il 409 **non brucia un progressivo**: otto tentativi, dichiarazioni
ancora una sola.

**Esito, sul browser vero:** ① la correzione è a schermo · ② il riquadro del conflitto compare ·
③ il foglio si chiude davvero · ④ **al rientro la correzione è ancora lì, con la pastiglia «DA RIFARE»**.
Scatti `prova-onchiudi-1…4`.

🔑 **Perché non morde** — letto sul codice *dopo* la misura, non prima: `esciOverlay` azzera `marcaEntry`
**prima** di chiamare `history.back()` (`storia-overlay.ts:163-166`), quindi quando il `popstate` arriva
`alPop` esce alla prima riga e `ricomincia` non parte mai. E `router.refresh()` **non rimonta** il
componente: lo stato locale regge, esattamente come il commento a `DevoIntervenire.tsx:497-504` sostiene.

🛑 **Non ho corretto niente qui, perché non c'era niente da correggere** — e l'avrei riferito comunque
(R-E2).

---

## 3. IL GATE L2 — sette rilievi, tutti riferiti o deferiti **col motivo**

Il dettaglio, con le misure e gli scatti, sta in `GATE-L2.md`. Qui l'elenco e l'esito.

| # | rilievo | esito |
|---|---|---|
| ❌1 | in **scuro** le cinque superfici premibili nuove sono `--bg-deep` #100E0B dentro un pannello `--card` #211D18: **più scure del pannello**, senza filo né ombra. Contro `Sheet.tsx:499-501` e contro il mockup approvato | **deferito** — due rimedi plausibili (§5 del brief vieta di scegliere) **e il rimedio scritto nel brief è confutato** |
| ❌2 | le superfici nuove su `--bg-deep` sono **cinque**, non quattro (1451 · 984 · 1343 · 1670 · 1714; preesistenti 926 e 1197) | **riferito** — chi ne corregge quattro ne lascia una |
| ❌3 | in **chiaro** quattro testi nuovi a **4,17** contro 4,5 (`--faint` su `--bg-deep`): le tre pastiglie spente del nastro e «DA QUI NON SI CORREGGE». Non sono testo grande (12 e 12,5px) | **deferito** — l'esito dipende da quale variante del ❌1 si sceglie |
| ❌4 | **il foglio non torna in cima quando cambia passo**: a 390, scorso l'elenco motivi a 380 e toccata una voce già in vista, il passo nuovo si apre ancora a 380 — titolo e **nastro del percorso fuori schermo** | **riferito, non corretto**: è comportamento, e il rimedio pulito tocca `Sheet` (R-E2) |
| ❌5 | l'**odontogramma** dentro il foglio v3: in scuro **44 testi su 55** sotto 4,5 (i denti selezionati a **3,44**), gettoni «Adulto»/«Deciduo» a **30px**. 🔴 La ragione con cui il gate del 06/08 li aveva deferiti — «*superficie legacy, fuori ondata*» — **oggi è falsa**: quel componente è dentro la superficie nuova | **deferito** — due varianti; «migrarlo» non è una variante (DS v3 §14) |
| ❌6 | dopo un 409 la **stessa frase compare tre volte** (avviso · riquadro · motivo del tasto spento) e l'avviso, che **non scade mai** (D234) e sta a z-index 1100 sopra il foglio (1000), **copre il titolo del foglio** anche dopo il rientro. ✅ **Una via d'uscita però c'è, misurata:** la card riaccende `pointer-events` e il suo «Chiudi» funziona (1 card → 0) — è un difetto di lettura, non di prigionia | **riferito** — tocca il flusso |
| ⚠️7 | nella finestra del **Task A** la risposta che **annulla il documento** è il primario rosso in rilievo; «Sì, è uscito» — quella che non registra niente — è un secondario quieto. Due risposte a un sì/no con pesi opposti, e il peso sta dalla parte pericolosa | **riferito** — è una decisione di gerarchia |

🛑 **Perché ZERO ❌ corretti, e non è una rinuncia.** Il brief dice due cose insieme: «le correzioni di
aspetto che il gate impone le fai» e «se un ❌ ha due rimedi plausibili, **non scegliere**: mostrali
entrambi». Qui il secondo vincolo vince su tutti e sette:
- ❌1 e ❌3 hanno **due varianti misurate** ciascuno, e il rimedio che il brief dava per ovvio **rompe il
  tema chiaro** (§4 qui sotto);
- ❌4, ❌6 e ⚠️7 sono **comportamento e decisioni**, non classi: R-E2 dice di riferirli;
- ❌5 è una scelta di convivenza fra design system, che DS v3 §14 riserva a un'ondata;
- ❌2 è un censimento, non un difetto da ritoccare.

Ogni deferimento porta il suo motivo scritto in `GATE-L2.md`: nessuno è un ❌ nascosto.

---

## 4. Che cosa ho cambiato — e perché **non** c'è una FASE 7

**Nessun file sorgente è stato toccato.** Le due varianti del ❌1 sono state provate iniettando CSS sulla
pagina viva (`page.addStyleTag`) e fotografate: Francesco sceglie su due immagini e due numeri, non su
due frasi. Quindi `tsc`, `vitest` e `next build` non hanno niente di nuovo da dire e **non li ho
rilanciati** — dichiarato qui invece di lasciarlo ambiguo. La base misurata resta quella dell'orchestratore:
**5685 passate | 68 saltate su 456 file**.

Cambiati, e sono tutti e tre fuori dal codice dell'applicazione:
- `.claude/launch.json` → aggiunta la configurazione **`ua-prod-3020`** (la build di produzione sulla
  porta che la guardia pretende: `giro-guardia-overlay.ts:81` cabla `BASE: http://localhost:3020`).
- `docs/design/screenshots/2026-08-09-devo-intervenire/` → gli scatti e il `GATE-L2.md`.
- questo resoconto.

**Sul banco** (dati di prova, §8 di `CLAUDE.md`): creata la fixture che rende raggiungibili due dei sei
sotto-passi — `lavori_prescrizioni` e `lavori_denti` avevano **zero righe su tutto il banco** — e una
seconda persona per il selettore. **Il SQL di creazione e quello di rimozione stanno nel `GATE-L2.md` §7**
(gli script vivono in `scripts/tmp/`, che è ignorata da git: una ricetta lasciata solo lì sarebbe persa).
La fixture è stata **lasciata in piedi**, perché il Task 9 lavorerà sulle stesse schermate.
Cancellati invece gli **otto** `eventi_qualita` che i giri hanno depositato sul lavoro di prova (che ne
aveva zero): nessuna dichiarazione è stata riemessa, `DDC-2026-0003` è ancora `generata`.

---

## 5. 🔴 DOVE QUESTO BRIEF SBAGLIA

**① Il rimedio prescritto per il ❌ delle tinte romperebbe il tema chiaro.** Il brief dice: «*Il mockup
approvato scrive `--elv` su tutte e quattro; il codice usa `--bg-deep`*». `provato:` in **chiaro**
`--elv` è definito come `var(--card)` (`ds-v3.css:13`), cioè lo stesso colore del pannello del foglio:
applicato senza condizione di tema, le sei righe prendono `rgb(255,254,250)` e **spariscono**
(`variante-x-elv-sempre--390-light.png`). Il difetto è **solo del tema scuro**, e il rimedio deve esserlo.

**② Il mockup non dice quello che il brief riporta.** `2026-08-08-passo-correzione.html` scrive
`--bg-deep` in chiaro e `--elv` **solo** sotto la classe `.notte` (righe 44-45, 51-52, 70-71, 99-100,
107-108) — e per giunta **ridefinisce `--bg-deep` in scuro come `#211D18`**, che non è il `#100E0B` del
CSS vero. Il mockup era coerente con sé stesso; è la traduzione in React che ha perso la condizione.

**③ Le superfici nuove sono cinque, non quattro.** Elenco al ❌2. Correggerne quattro ne lascia una
sbagliata, ed è la classe di errore che il commento a `DevoIntervenire.tsx:71-76` esiste per evitare.

**④ L'ipotesi su `onChiudi` non si riproduce** (§2). Non era una perdita di tempo: era la cosa giusta da
provare per prima, e adesso la risposta è misurata invece che dedotta.

**⑤ «Verde» non vuol dire «coperto»: la guardia NON tocca le due navigazioni nuove.** Il brief dice che è
dovuta «*proprio qui*» perché il passo nuovo aggiunge due navigazioni da dentro un overlay. Ma i tre
bracci della guardia sono **fissi** (consegna dalla pila · menu ⋯ · album) e nessuno passa dal passo di
correzione. Le ho misurate a parte, con lo stesso metro: destinazione raggiunta, `history.length`
invariata (3 → 3: la destinazione ha **sostituito** l'entry dell'overlay), seconda pressione «indietro»
non morta. **Verdi tutte e due** — ma per averlo saputo è servito un giro in più, non la guardia.

**⑥ Il brief nomina solo `lavori_prescrizioni`.** Anche **`lavori_denti` aveva zero righe su tutto il
banco**: senza quelle il sotto-passo dell'odontogramma esiste ma è vuoto, e il gate su un odontogramma
vuoto non prova niente — è lo stesso principio del «Glitter multicolore» del gate del 06/08.

**⑦ La base numerica.** Il brief (riga 129) dice `5659 | 68 su 454`; la correzione dell'orchestratore dice
`5685 | 68 su 456`. Non l'ho verificata: non ho toccato codice, quindi non ho rilanciato `verify:full`.

---

## 6. Ritrovamenti FUORI mandato (R-E2)

1. **La riga «Denti» stampa «—» mentre l'odontogramma mostra tre denti.** Il documento stampa la colonna
   denormalizzata `lavori.denti_coinvolti` (qui `null`), il sotto-passo modifica la tabella
   `lavori_denti`. Le due non si parlano sul lavoro di prova. **Non è aspetto: è dato.** Chi guarda la
   riga legge «nessun dente» su un lavoro che ne ha tre.
2. **`service_role` non può SCRIVERE su `lavori_denti` né su `lavori_prescrizioni` via PostgREST**
   (`permission denied for table`), pur potendole leggere. Chi scriverà un seed o una fixture con
   `supabase-js` ci sbatterà: si passa da `scripts/psql.mjs`.
3. **Tre trappole del ricambio della guardia**, che costano tempo a chi la rilancia:
   `giro-guardia-overlay.ts:81` **cabla** `BASE: http://localhost:3020` (non è sovrascrivibile) e **non**
   passa `UA_EMAIL`/`UA_PASSWORD`, quindi la guardia usa sempre `e2e-titolare@ua-test.local` e **mai**
   il `TEST_EMAIL` di `.env.local`; e il giro **collassa l'uscita 2** («incompleta») **in 1**, quindi
   l'esito vero si legge sulla riga `=== la guardia è uscita con N ===`, non sul codice del giro.
4. **Rumore in console su ogni pagina in locale:** `_vercel/speed-insights/script.js` risponde 404 e il
   browser rifiuta di eseguirlo. Preesistente, innocuo, ma sporca ogni diagnosi futura.
5. **Tre trappole della fixture**, scritte nel `GATE-L2.md` §7 perché non si ripaghino: la scala colore è
   `vita_classical` (non `vita_classic`, c'è una FK su `colori_dentali`); `fonte_tipo` accetta solo
   `foglio|email|modulo|piattaforma`; e con `fonte_tipo` serve anche `fonte_riferimento`.

---

## 7. CHE COSA NON HO FATTO — per intero

- 🛑 **I passi `proposta` ed `esito` NON sono stati raggiunti.** Ci si arriva solo **completando** l'atto
  unico, che riemette davvero il documento: brucia un progressivo e supera la dichiarazione viva del
  lavoro di prova. Ho scelto di non farlo. ⚠️ Vale la pena sapere che quei due riquadri sono **già
  dichiarati incompleti e assegnati al Task 9** dal codice stesso (`DevoIntervenire.tsx:389-395`), quindi
  guardarli oggi avrebbe fotografato qualcosa che sta per cambiare — ma **resta un buco del mio giro**,
  non una copertura.
- 🛑 **Il percorso corto non è stato premuto fino in fondo.** La finestra del Task A è stata guardata su
  tutte e sei le combinazioni, ma «No, è sempre rimasto qui» riporta il lavoro fra i pronti e annulla la
  dichiarazione: non l'ho premuto.
- **Gli altri otto motivi.** Solo `errore_dato_dichiarazione` è stato percorso. Due degli altri
  (`difetto_lavorazione`, `difetto_materiale`) prendono oggi un 422: già censito e assegnato al Task 9,
  **non** diagnosticato qui.
- **`:focus-visible` percorso col Tab** su tutte e sei le combinazioni (§11 della checklist): non fatto.
  Ruoli, `aria-modal`, titolo legato, trappola del focus ed Esc sì.
- **Suoni e haptic** (§7 della checklist): non misurabili da un browser guidato. Il passo nuovo non
  introduce eventi sonori, quindi la sezione è N/A — ma è una deduzione dal codice, non una prova.
- **Il giro `prefers-reduced-motion`** copre 390 sul passo di correzione e sull'odontogramma, **non** i
  quindici passi né gli altri due viewport.
- **Nessun collaudo su device vero** (touch fisico, notch, safe-area): solo emulazione di viewport.
- **Il gesto di swipe giù** per chiudere il foglio (che ha un ramo suo in `Sheet`, col `dragControls` sul
  grabber): non provato.
- **Le due varianti del ❌1 non sono state scritte nel codice**, solo simulate: chi le applica dovrà
  rifare la misura sul codice vero.

# Task 6 — IL MONTAGGIO: il promemoria arriva sulla scheda del lavoro

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna` · **BASE:** `b38beab1`
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md` — Task 6, righe 394-399.

---

## 0. 🔴 PRIMA DI TUTTO: IL TESTO DEL PIANO NON È IL TUO MANDATO, È UN TERZO DI ESSO

Il piano dedica a questo compito **due righe**. `provato:` righe 396-399, dicono solo «crea
`queries.ts`» e «la riga compare solo se esiste un avviso `da_comunicare`».

🛑 **Il compito vero è più grande, e la parte mancante è la sola ragione per cui esiste:**
`provato:` `grep -rn "AvvisoDentista" src/` → **una sola occorrenza fuori dal proprio file, ed è
un commento** (`src/components/ds/Campo.tsx:141`). Un componente di 1264 righe, con 56 prove verdi,
**non è agganciato a nessuna schermata: nessuno può aprirlo.**

**Questo brief è il mandato. Dove diverge dal piano, vince questo** — e ogni divergenza è motivata
qui sotto con la sua fonte.

---

## 1. Che cosa deve essere vero alla fine

Un lavoro la cui dichiarazione è stata **corretta e rifatta** ha in banca dati un avviso
`da_comunicare` (lo crea la RPC del Task 2, dentro la stessa transazione). Alla fine di questo
compito, **aprendo la scheda di quel lavoro**, l'odontotecnico vede il promemoria e può chiuderlo
nei due modi che il foglio già sa fare.

Tre file, e il terzo è quello che il piano non nomina:

| file | che cosa ci fai |
|---|---|
| `src/lib/avvisi/queries.ts` 🆕 | le **due letture** della tabella: `avvisiDaComunicare` · `archivioCliente` |
| `src/app/(app)/lavori/[id]/page.tsx` | la lettura lato server, dall'alto — **come `caricaTinteScheda`** |
| `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` | il **montaggio** di `AvvisoDentista`, con le sue otto proprietà |

---

## 2. Il censimento è il tuo primo passo (R-P2 · R-P6)

Il piano dichiara `SchedaLavoroV3.tsx` **NON letto** in fase di piano e assegna la lettura a te
(autorevisione del piano, riga 471). **Aprilo, e scrivi nel resoconto le righe che hai letto.**

Aperti già dall'orchestratore, e questi fatti sono `provato:` — non rifarli, ma **verificali se ti
sembrano falsi**:

- `src/app/(app)/lavori/[id]/page.tsx` (123 righe) — è un **componente server**, fa la **propria**
  query con `getServiceClient()`, non passa dalla rotta GET. La `select` a righe 24-38 embedda già
  `cliente:clienti(*)`, `paziente:pazienti(*)` e **`laboratorio:laboratori(nome, telefono)`**.
  A righe 97-101 chiama `caricaTinteScheda(svc, …)` e attacca l'esito su `lavoroDettaglio`:
  **è il pattern di casa per una lettura in più, ed è il tuo modello.**
- `SchedaLavoroV3.tsx:596` — il montaggio di `DevoIntervenire`, il foglio **gemello**. Guarda come
  è condizionato e come riceve i suoi dati.
- `SchedaLavoroV3.tsx:412` — `const pazienteTesto = lavoro.paziente_nome_snapshot ?? '—'`.
- `SchedaLavoroV3.tsx:144` — la firma: `props: { lavoro: LavoroDettaglio; ruolo?: string | null; apriConsegna?: boolean }`.
  **Il ruolo c'è già.** Ti servirà (§4.1).
- `src/types/domain.ts:548-576` — `LavoroDettaglio.cliente` è `Cliente` **pieno**, non un `Pick`:
  `portale_token` (riga 193) e `cellulare_whatsapp` (riga 176) sono **già nel tipo e già nel dato**.
  Nessun allargamento di tipo, nessun cast: se ti serve un cast, ti sei perso.
- `src/lib/lavori/tinta-scheda.ts:1-30` — il modello per `queries.ts`: modulo in `src/lib/`, riceve
  il client di servizio come parametro, **nessuna rotta nuova**.

**Il resto lo censisci tu**, e l'elenco dei file da aprire **non lo decide questo brief**: lo decide
ciò che trovi.

---

## 3. `src/lib/avvisi/queries.ts` — le due letture

```ts
avvisiDaComunicare(svc, { lavoroId, laboratorioId })   // → l'avviso aperto di QUEL lavoro
archivioCliente(svc, { clienteId, laboratorioId })     // → tutte le comunicazioni di QUEL cliente
```

La forma esatta dei parametri la scegli tu guardando `tinta-scheda.ts`; **queste tre cose invece
non sono negoziabili:**

1. 🛑 **`laboratorio_id` nel filtro, sempre ed esplicito.** Il client di servizio **scavalca RLS**:
   le politiche scritte nel Task 1 (`laboratorio_id = public.current_lab_id()`) **non ti proteggono
   qui**. L'isolamento fra laboratori, su questa strada, è la tua `.eq()` e nient'altro.
2. 🛑 **`stato = 'da_comunicare'`** per la prima, e il vocabolario si prende da
   `src/lib/avvisi/stati.ts` (Task 1: `STATI_AVVISO`, `STATI_CHIUSI`) — **mai una stringa scritta a
   mano**, che è come i due elenchi divergono.
3. 🔑 **Due letture della stessa tabella, nessuna terza fonte** (piano, riga 397).

**`archivioCliente` la usa il Task 9**, che apre `clienti/[id]/page.tsx` — un file dichiarato **NON
letto** (piano righe 42 e 450). ➡️ **Falla minimale: le righe di quel cliente, in ordine, e basta.**
Non inventare una forma per una pagina che nessuno ha ancora aperto; **scrivi nel commento che il
suo consumatore è il Task 9**, così chi la trova non la crede morta.

---

## 4. Il montaggio, e qui vivono le decisioni

### 4.1 🛑 CHI VEDE LA RIGA — e questo NON è nel piano

⚖️ **D342** ha ratificato un principio che ti riguarda direttamente:

> «**La visibilità è un SOTTOINSIEME del permesso: nessuno vede un promemoria che non può
> chiudere.** Non è un bicondizionale — si può mostrare *meno* di ciò che si permette, mai il
> contrario.»
> — `src/app/api/lavori/[id]/avviso/route.ts:53-55`

`provato:` l'elenco esiste **ed è esportato apposta**:
`RUOLI_CHIUSURA_AVVISO = ['titolare', 'tecnico', 'front_desk']`
(`src/app/api/lavori/[id]/avviso/route.ts:192`, con `puoChiudereAvviso()` a riga 195).
Il resoconto del Task 5-bis (riga 324) rimanda esplicitamente a te: «*`admin_sistema`: la visibilità
della riga è del **Task 6***».

➡️ **La riga si mostra solo ai ruoli di quell'elenco**, letto da lì — **mai riscritto qui**.
Un `admin_rete` che vedesse il promemoria toccherebbe un tasto che risponde **403**.

⚠️ `SchedaLavoroV3` riceve `ruolo?: string | null`: **facoltativo**. Decidi che cosa fa un ruolo
assente e **scrivi perché**. (Suggerimento, non ordine: fail-closed è la regola di casa.)

### 4.2 🛑 IL COMPONENTE **È** LA RIGA — non disegnargliene una intorno

`AvvisoDentista.tsx:150-151`: `type Passo = 'chiuso' | …` — «*`chiuso` è lo stato a riposo: **la riga
sulla scheda***». E righe 74-76: quando il foglio si chiude durante la finestra dei dieci secondi,
l'«Annulla» compare **al posto della riga**.

➡️ **Monta `AvvisoDentista` e lascia che disegni sé stesso.** Se `SchedaLavoroV3` disegnasse una
propria riga che apre il foglio, la via di fuga di ⚖️ D351 non avrebbe più dove comparire.

### 4.3 🛑 LA CONDIZIONE È UNA SOLA: esiste un avviso `da_comunicare`

Piano riga 398: «*compare **solo** se esiste un avviso `da_comunicare`; sparisce quando è chiuso*».

⚠️ **Non copiare la guardia del gemello.** `DevoIntervenire` è condizionato a
`lavoro.stato === 'consegnato'` (`SchedaLavoroV3.tsx:596`): quella condizione è sua e ha la sua
ragione. Qui una seconda condizione può solo **nascondere un promemoria che esiste** — e il senso di
tutta l'ondata è che quel promemoria **non si spenga da solo**.
(Il filtro per ruolo del §4.1 non è una seconda condizione sullo stesso asse: è chi guarda, non che
cosa c'è.)

### 4.4 Le otto proprietà — `AvvisoDentista.tsx:245-270`

| proprietà | da dove | perché
|---|---|---|
| `lavoroId` | `lavoro.id` | |
| `avvisoId` | dalla lettura del §3 | è l'avviso da chiudere |
| `numeroLavoro` | `lavoro.numero_lavoro` | **verificalo sul tipo** |
| `nomeStudio` | come lo mostra già la scheda | c'è già un `clienteDisplay()` in casa: **usalo, non riscriverlo** |
| `pazienteMostrato` | ⬇️ §4.5 | ⚖️ **D350** |
| `portalToken` | `lavoro.cliente.portale_token` | ⚖️ D348: non scade più, nessun ramo «scaduto» |
| `nomeLaboratorio` | `lavoro.laboratorio?.nome` | ⚖️ **D345** — la firma è un dato passato |
| `telefonoStudio` | ⬇️ §4.6 | 🔴 **il nome della proprietà mente** |

### 4.5 ⚖️ D350 — `pazienteMostrato`, e la deroga vive QUI

Il DS v3 §2.1 vuole i pazienti **pseudonimizzati** (`PZ-0231`). ⚖️ **D350** (09/08/2026, verbale
centocinquantesima tornata) è la **terza deroga**, e Francesco l'ha data con quattro parole: «*Sì,
come sulla parete*» — il foglio lo vede **solo chi è dentro il laboratorio**, e si apre nel momento
in cui si corregge una dichiarazione **già consegnata**, cioè quando l'odontotecnico deve essere
sicuro di non aver sbagliato persona.

➡️ **Passa il nome per esteso, e passa lo STESSO valore che la scheda sta già mostrando dietro il
foglio** — `pazienteTesto` (`SchedaLavoroV3.tsx:412`), non una seconda derivazione.

🔑 **Perché il punto è QUESTO punto:** la deroga vive in **una riga sola**, e da lì si revoca senza
toccare il componente. Scrivi il commento che lo dice, con il numero della decisione.

🛑 **E la deroga non si estende di un millimetro a WhatsApp:** il nome non entra nel messaggio, e la
difesa non è una regola scritta — è la **forma** di `buildAvvisoMessage`, che non ha nessun
parametro capace di riceverlo. Non aggiungergliene uno.

### 4.6 🔴 `telefonoStudio` — il nome dice «telefono», il valore giusto è un altro

`AvvisoDentista.tsx:268-269` documenta la proprietà come «`clienti.telefono`». **`provato:` è il
campo sbagliato**, e in casa la regola è scritta a chiare lettere:

> «*Cellulare per WhatsApp (P31, D182/D183): telefono può essere un fisso dello studio — chi manda
> WhatsApp legge **SEMPRE** questo campo, mai `telefono`, altrimenti il messaggio riparte su un
> fisso.*» — `src/types/domain.ts:174-176`

`provato:` **tutti** i chiamanti veri di `buildWhatsappUrl` passano `cellulare_whatsapp`
(scadenzario `EstrattoContoView.tsx:278` · `ScadenzarioList.tsx:134` · accettazione
`TabAccettazione.tsx:280` · consegna `orchestrate.ts:170,436`). **Zero** passano `telefono`.

➡️ **Passa `lavoro.cliente.cellulare_whatsapp`.**
➡️ **R-E2:** il commento fuorviante vive nel componente del Task 5, **fuori dal tuo mandato**:
**riferiscilo nel resoconto, non correggerlo di nascosto** — a meno che tu non lo giudichi un
difetto vivo, e allora spiega perché nel resoconto **prima** di toccarlo.

---

## 5. Le prove — e una forma è già nota come DEBOLE in questa casa

**TDD (FASE 6): la prova prima del codice**, e dopo il primo rosso l'abbozzo inerte col **conteggio
delle asserzioni che si accendono** (`N su M`, R-P4). Prima delle asserzioni, **enumera le forme
d'ingresso** (nessun avviso · un avviso aperto · un avviso già chiuso · un lavoro di un altro
laboratorio · ruolo assente · ruolo escluso), ognuna col suo caso o col suo «non coperta, perché».

🔴 **La forma debole, misurata in questo stesso repo** (ledger, ondata precedente):

> «*il finto rispondeva **per ordine di chiamata** e inghiottiva i filtri → le prove restavano verdi
> **con le letture invertite**.*»

Una prova unitaria con un client Supabase finto è quindi **una forma già smentita** proprio per ciò
che fa `queries.ts`: filtrare su `stato` e sul laboratorio.
🛑 **Chiediti, per ogni prova che scrivi: se tolgo il filtro, questa diventa rossa?** Se la risposta
è no, la prova non prova niente — e va riscritta, non spiegata.

Se la risposta giusta è una prova d'integrazione contro il banco vero, **scrivila**:
```bash
set -a && . ./.env.local; set +a && npx vitest run tests/integration/<file>.test.ts
```
⚠️ `verify:full` **non carica `.env.local`**: in locale quelle prove **si saltano** (sono 119 oggi),
in CI girano tutte. **Se scrivi una prova d'integrazione, lanciala a mano con la riga qui sopra e
incolla l'esito**, o non hai misurato niente.

**FASE 7, in chiusura:**
```bash
npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
```
🛑 **timeout 600000 ms** (ci mette più di due minuti) · **MAI dietro una pipe**: `$?` leggerebbe
l'ultimo comando della pipe, e un `VERIFY_EXIT=0` falso è già stato pagato in questo progetto.
📌 Riferimento del giorno: **5902 passate | 119 saltate su 465 file**, `tsc` 0, build ok.

---

## 6. I vincoli che non si discutono

- 🛑 **DS v3:** la scheda è una superficie **v3** (`data-ds="v3"`). Componenti **solo** da
  `src/components/ds/`, token da `src/design-system/v3/tokens.ts`, motion da
  `src/design-system/v3/motion.ts`. **Mai una `duration` inline.**
- 🛑 **Navigare da dentro un overlay v3: `useNavigaDaOverlay`, MAI `router.push`**
  (`ua-app/CLAUDE.md` §9).
- 🛑 **Indietro = pagina precedente**, ovunque.
- 🛑 **Ruoli: sono CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`.
  **MAI `admin` nudo.**
- 🛑 **GDPR:** nessun messaggio WhatsApp porta il nome del paziente.
- 🛑 **Nessun placeholder, nessun «lo aggiungiamo dopo».**
- 🛑 **Salvataggi:** `git status` **prima**, poi `git add <percorsi>` — **MAI `-A`**: l'albero è
  condiviso. Messaggi lunghi con `-F <file>` (con `-m` i backtick vengono **eseguiti**).
- ⛔ **`git push` ti verrà rifiutato: non provarci.** Pubblica l'orchestratore.
- 🛑 **Niente worktree.** Si lavora su questo ramo.
- 🛑 **`date` in un comando SEPARATO**, mai dedotta.
- ⚠️ **Nessuna migration in questo compito.** Se ti convinci che ne serva una, **fermati e riferisci**:
  è un cambio di perimetro, non un passo.

---

## 7. Come si chiude

1. **Salva** su questo ramo, con un messaggio in italiano nella forma di casa
   (`feat(avvisi): …`), e **metti l'hash vero nel resoconto** — non «il commit».
2. **Scrivi il resoconto** in `.superpowers/sdd/avviso-dentista-task-6-report.md`:
   le righe **lette** file per file · il conteggio R-P4 · le forme d'ingresso e la loro copertura ·
   l'esito **incollato** di `verify:full` letto da variabile · l'autorevisione ·
   **e una sezione «ciò che ho trovato fuori mandato»** (R-E2).
3. **Torna** solo: stato (`DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`), gli hash,
   una riga sull'esito delle prove, e i dubbi. **Il resto sta nel file.**

## 8. 🔑 E il tuo secondo mestiere: CERCA DOVE QUESTO BRIEF SBAGLIA

**R-E1.** In quest'ondata **otto task su otto hanno trovato un difetto nel piano**, e i tre migliori
sono venuti da esecutori che si sono **fermati sul confine** invece di tirare dritto.

**Dove guarderei per primo, e sono le mie ipotesi, non fatti:**
① il nome esatto di `numero_lavoro` sul tipo del lavoro · ② se `clienteDisplay()` sia davvero la
funzione giusta per `nomeStudio`, o se la scheda mostri lo studio in un altro modo · ③ se una scheda
possa avere **più di un** avviso aperto (il Task 2 ha provato che due riemissioni fanno **due**
avvisi: che cosa mostra la scheda allora? il piano **non lo dice**) · ④ se la lettura in più su una
pagina server già lenta debba andare dentro il `Promise.all` che c'è a righe 104-113.

🛑 **Un difetto fuori dal tuo mandato si RIFERISCE, non si corregge di nascosto** (R-E2): una
correzione silenziosa lascia il brief sbagliato per tutti i compiti che vengono dopo.
🛑 **E se qualcosa qui dentro ti sembra falso: fermati e chiedi.** Un brief non è una legge, è il
lavoro di qualcuno che può aver letto male — è già successo cinque volte in questa ondata.

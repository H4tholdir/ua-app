# Handoff — la sera del 06/08: tre compiti su nove, dodici decisioni, e un difetto che dormiva da prima

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 6 agosto 2026, sera (`provato:` `date` → `06/08/2026 22:14 CEST`).
**Stato:** ramo **`intervento-post-consegna`**, **NON pubblicato**, albero **pulito**.
⚠️ Il conteggio dei salvataggi **non si ricopia da qui**: `git rev-list --count main..HEAD`
(al momento della scrittura: 33). `main` è **intatto** e coincide con `origin/main` (`7427a680`).

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **uscita 0 letta da variabile e non da
pipe**, ore 22:14): tsc **0** · eslint **0** · `npm run build` ok · **sei guardie verdi** ·
`vitest` **5168 passate | 56 saltate** su **437 file**.
📈 **Riferimento di stamattina: 5069 | 19 su 429.** L'ondata ha aggiunto **+99 prove e +8 file** — e
stamattina il numero era **fermo da un giorno**, che era il difetto §0① dell'handoff precedente.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🟡 SEI COMPITI SU NOVE NON SONO FATTI
Fatti: **Task 1** (già ieri) · **Task 2** (il dizionario e i tre test) · **Task 3**
(`riapri_lavoro_atomica`). Restano: ④ le due rotte · ⑤ la riemissione annulla→riemetti · ⑥ «Devo
intervenire» sulla scheda · ⑦ la finestra dei 10 minuti sparisce · ⑧ il testo della riga bloccata ·
⑨ gate estetico L2.
🛑 **Il registro `.superpowers/sdd/progress.md` dice `complete` per 1, 2 e 3: NON si ri-eseguono.**

### ② 🔴 IL COMPITO NUOVO DI D273 NON HA ANCORA UN NUMERO NEL PIANO
D273 dice che un evento **non si cancella, si RITIRA dichiarando il motivo**. Quel lavoro esiste solo
come **descrizione** nella sezione «D273-D275 — cosa cambia nel piano», **non come compito numerato**
con i suoi passi. Chi riprende deve scriverlo prima di eseguirlo, e va **prima** del Task 6.
⚠️ **E porta con sé un vincolo che NON si può sciogliere da solo:** il `REVOKE DELETE` su
`eventi_qualita` **non è stato messo**, deliberatamente — da solo terrebbe dentro i conteggi ogni riga
nata da un tocco sbagliato. `provato:` una **sentinella** in
`tests/integration/eventi-qualita-schema.rpc.test.ts` asserisce oggi che il `DELETE` è ancora
concesso: **quando arriva il ritiro, quella prova si CAPOVOLGE**, non si cancella.

### ③ 🟠 TRE TESTI ASPETTANO IL CANCELLO §0B, E UNO ASPETTA UNA DECISIONE PRIMA ANCORA
Nessuno dei tre è stato disegnato: mockup → screenshot → approvazione di Francesco → poi React.
1. **Il testo della domanda sulla gravità** (D280): quattro risposte, tre delle quali «grave» con
   scadenze diverse (2 · 10 · 15 giorni), **e a parità vince il termine più breve**. Oggi in
   `src/lib/qualita/classifica.ts` la domanda è **una sola frase da sì/no**: chi risponde «sì» non
   capisce dal testo che deve anche dire **quale** dei tre casi.
2. **Il testo della conferma in uscita** (D282) — dice **cosa cambia**, mai «sei sicuro?».
3. **Il testo della conferma in ingresso** (D283) — **nomina il lavoro**.
🔴 **E prima di disegnarli va sciolto un nodo: DUE PORTE PORTANO NELLA STESSA STANZA.**
`natura = errore_registrazione` (il fatto è «abbiamo registrato per sbaglio») e il **ritiro** di D273
(«questa riga non doveva esistere») al banco si somigliano. Due porte per la stessa stanza sono il
modo classico per far contare una cosa **due volte, o zero**.

### ④ 🔴 IL TASK 7 NON PUÒ CHIUDERSI PRIMA CHE D283 SIA IN PIEDI
`provato:` `src/components/features/lavori/AnnullaConsegnaBanner.tsx:145` è `onClick={handleAnnulla}`
— **parte al primo tocco**, e in tutto il file ci sono **zero** dialoghi di conferma (`grep` → 0).
L'unica rete erano **i dieci minuti**, che il Task 7 rimuove. Chiudere il 7 prima del 6 lascia una
finestra in cui **un tocco involontario è irreversibile**.

### ⑤ 🔴🔴 QUATTRO PROVE ROTTE CHE NON C'ENTRANO CON L'ONDATA, E DORMIVANO DA PRIMA
`provato:` `tests/integration/annulla-effetti-storno-td04.rpc.test.ts` → **4 fallite | 1 passata**, e
**identiche** rilanciandole sul punto di partenza del ramo (`7427a680`). Non le ha rotte quest'ondata.
🔑 **Perché nessuno poteva accorgersene:** le prove di integrazione **si saltano da sole** senza
`SUPABASE_DB_URL` (`tests/integration/helpers/pg-client.ts:9`), **e in CI quella variabile non c'è**.
Girano solo se qualcuno le lancia a mano. ➡️ **È lo schema già pagato con la guardia della navigazione
mai agganciata: una prova che non gira NON è una prova.** Tocca il mondo **fiscale** (note di credito
TD04) → **voce di roadmap a sé, priorità alta**, non un compito di quest'ondata.

### ⑥ 🟠 DUE RITROVAMENTI DEL TASK 1 SONO ANCORA APERTI (dei quattro di ieri)
`provato:` `grep sostituisce_id` sulla migration di correzione → **nessuna riga**:
1. **`valutazioni_evento.sostituisce_id` è ancora una chiave esterna SEMPLICE** — quarto caso della
   famiglia cross-tenant. Serve prima `UNIQUE (id, laboratorio_id)` su `valutazioni_evento`.
2. **`valutazione_supera()` fa metà lavoro:** fra «supera la vecchia» e «inserisci la nuova» c'è una
   finestra a **zero valutazioni vive**, e la funzione non pretende un successore né registra chi/quando.
✅ Il terzo è **chiuso da D273**; il quarto (`TRUNCATE`) è chiuso **sulle due tabelle dell'ondata** da
D274, ma resta **preesistente su tutte le altre**.

### ⑦ 🟠 `audit_log` È SVUOTABILE E CIECO — e la memoria delle correzioni non potrà appoggiarsi lì
`provato:` `SET LOCAL ROLE authenticated; TRUNCATE public.audit_log` → **riesce** · **1.644 righe su
1.645 non hanno autore** (l'app parla al database con un'identità di servizio). Non toccato: serve
undici altre tabelle, e il suo problema vero è **una decisione a sé** che Francesco non ha mai avuto
davanti. Il «chi» va messo **nella riga**, come `emesso_da` (`20260804120000:47-59`).

### ⑧ 🟡 INVARIATI DALLA MATTINA
`provato:` `psur/route.ts:190` → `totale_reclami: 0, // Non ancora implementato` · **`CRON_SECRET`**
non definito su Vercel (`src/app/api/internal/orfani-storage/route.ts:52-55`: il cron resta manuale) ·
il **gate estetico L2 arretrato del wizard** (fermo da sei giorni) · i **cinque deferiti** del gate L2
delle tinte, di cui uno è una decisione (`/lavori/[id]/modifica` monta due design system) · **D253**
sul colore, che aspetta D254 · l'ordine della pila blu a 1280 · **riga 16** (`image/heic`) ·
il 12 contro 13 · il resto di **P37**.
⚠️ **Su «riga 16» una nota di onestà:** ho aperto `src/lib/storage/tipi-immagine.ts` e il file
**documenta la rimozione di `image/heic`** come già avvenuta il 05/08. Non ho ricostruito a cosa si
riferisca la voce di roadmap: **la porto avanti come ereditata e NON verificata**.

### ⑨ 🟠 IGIENE PEGGIORATA E DICHIARATA
`provato:` **33 rami locali** (invariato) · `.superpowers/sdd/` con **50 file** (erano 44 stamattina:
**+6** fra brief, referti e pacchetti di revisione). Rientra nel riordino **D257**, che resta da fare.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| 🔴 **Il difetto §0① di ieri è CHIUSO** | L'ondata ha le sue prove automatiche, e sono **due strati**: 19 asserzioni statiche (girano sempre) + 22 prove contro il database vero (si saltano da sole senza credenziali). Le **nove** verifiche manuali del Task 1 sono in suite **tutte e nove** |
| ✅ **D274 — i due difetti VIVI, chiusi e applicati** | ① la cancellazione di un laboratorio **abortiva** (`23503`) al primo tenant con un evento; ② `TRUNCATE` era rimasto concesso, quindi «la garanzia la dà il DATABASE» era **falso** |
| ✅ **Task 2** — il motore delle derivazioni | Tre giri di revisione: mandato ✅ **sempre**, qualità ❌ **due volte** |
| ✅ **Task 3** — `riapri_lavoro_atomica`, **applicata** | Zero cancelli fiscali nel corpo, `EXECUTE` al solo `service_role`, verificato **sul catalogo vivo** |
| ⚖️ **D273-D284, dodici decisioni in cinque tornate** | 110ª: D273-D275 · 111ª: D276 · 112ª: D277-D279 · 113ª: D280-D282 · 114ª: D283 · 115ª: D284 |
| 🔬 **Un panel di 3 advisor con mandato di SMONTARE** | Ha **rifatto** la proposta invece di approvarla: normativo «regge con 8 condizioni», database «il punto 2 non è realizzabile», prodotto 🔴 **«il punto 1 NON regge»** |
| 🔴 **Il controllo PRE-VOLO del piano ha pagato da solo il suo costo** | Ha trovato che il piano contraddiceva la spec **prima** di scrivere una riga, e proprio nel compito normativamente critico |

## 2. 🔑 Le lezioni — valgono per il codice futuro, non solo per quest'ondata

1. 🛑 **Vietare la cancellazione senza dare un modo di dire «questa riga non doveva esistere» costruisce
   un generatore di NUMERI FALSI.** Un evento nato da un dito scivolato che non si può togliere resta
   per sempre nei conteggi che finiscono in un documento dovuto per legge. ➡️ **Il divieto e il ritiro
   sono un pezzo solo**: chi ne mette uno senza l'altro peggiora la situazione.
2. 🔴 **Un esecutore fedele è un AMPLIFICATORE, non un filtro.** Nel Task 2 il mandato è stato eseguito
   alla lettera — e proprio per questo i difetti *del mandato* sono arrivati intatti fino al codice.
   ➡️ **Il filtro è la revisione a DUE verdetti separati** (conformità · qualità): il secondo ha visto
   tre cose che il primo, per costruzione, non poteva vedere.
3. 🔑 **Due documenti entrambi ratificati possono contraddirsi, e la contraddizione vive nel CODICE,
   non nella prosa.** Successo **due volte in un giorno**: spec contro piano (D276), e **spec contro sé
   stessa** (D278, §3 contro §6). ➡️ Nessuna rilettura le trova: **si vedono solo mettendole accanto
   sulla stessa riga di codice**.
4. 🛑 **Un ELENCO scritto a mano diventa MUTO il giorno in cui il vocabolario cresce** — e il modo in
   cui si rompe è spesso *l'opposto* di ciò che l'elenco proteggeva. ➡️ Dove esiste un **indice** o un
   **vincolo** che già definisce l'insieme, si usa **la sua stessa definizione** (`stato <> 'annullata'`),
   non una copia enumerata. Tre difetti di oggi appartengono a questa famiglia.
5. 🔴 **Quando si toglie un vincolo, si censisce che cosa quel vincolo stava REGGENDO.** I dieci minuti
   erano nati per la fattura automatica alla consegna (mai costruita) — ma nel frattempo reggevano un
   **secondo carico mai scritto**: la protezione dal tocco involontario. ⚠️ **Non l'hanno visto né il
   panel né la revisione né le 5168 prove: l'ha visto Francesco immaginando il gesto al banco.**
6. 🟠 **Un passaggio di consegne NON è gratis.** Quattro rifiuti del classificatore, la regola «si
   chiede, non si aggira» seguita — e **tre passaggi su tre hanno prodotto un errore** (comando senza
   la cartella · comando che non registra la migration · comando appeso a una domanda). ➡️ Dove il
   contesto ce l'ha chi esegue e il rischio è basso, il passaggio **aggiunge** rischio (**D284**).
7. 🟠 **Una prova che non gira non è una prova** (§0⑤). E **un documento che descrive il codice si
   scolla mentre lo si sistema**: correggendo due frasi false in un referto ne sono saltate fuori
   **altre due**, rese false dalle correzioni stesse.
8. ⚠️ **Un test può essere un LUCCHETTO invece che una rete.** Le prove del piano codificavano il
   comportamento sbagliato: avrebbero **bloccato** il difetto invece di trovarlo.

## 3. Che cosa resta aperto, in ordine

1. 🔴 **Scrivere il compito «l'evento si ritira»** (§0②) — va **prima** del Task 6, e porta con sé il
   `REVOKE DELETE` che oggi non c'è.
2. 🔴 **Sciogliere il nodo delle due porte** (§0③) e poi il **cancello §0B** sui tre testi.
3. 🟡 **Task 4** — le due rotte. ⚠️ **Precondizioni dichiarate**, scritte nel registro
   `.superpowers/sdd/progress.md`: il `p_laboratorio_id` deve venire dalla **sessione**, mai dal corpo
   della richiesta · l'eccezione del fail-closed arriverà a un operatore e va tradotta in un messaggio
   che dica **cosa fare** · `classifica(null)` (l'oggetto intero) lancia ancora `TypeError`, quindi va
   deciso **se la proposta si calcola prima o dopo il salvataggio** — da lì dipende se D262 regge.
4. 🔴 **Le 4 prove rotte del TD04** (§0⑤) — fuori ondata, priorità alta.
5. 🟠 **I due ritrovamenti del Task 1** (§0⑥) e **`audit_log`** (§0⑦).
6. 🟡 Il **gate L2 arretrato del wizard** e i cinque deferiti (§0⑧).
7. 🟠 Il **riordino D257** (§0⑨).
8. ⏸️ **Il rientro in un lavoro consegnato è materia da titolare?** — **destinazione di D275**, che l'ha
   **rimandata e non chiusa**. Oggi il gesto è alla portata di **chiunque** nel laboratorio
   (`src/app/api/lavori/[id]/annulla-consegna/route.ts`: nessun controllo di ruolo), ed è così **per
   scelta**. ⚠️ Ma con la finestra dei dieci minuti rimossa lo stesso gesto annullerà **una
   dichiarazione a valore legale, per sempre, su qualunque lavoro** — mentre nel progetto *chiudere una
   segnalazione* è già riservato al titolare. **La riapre Francesco, quando servirà.**

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. `docs/superpowers/plans/2026-08-06-intervento-post-consegna.md` — **le DUE sezioni di emendamenti in
   fondo** («D273-D275 — cosa cambia nel piano» e «D280-D283»), che cambiano i compiti 6 e 7.
3. `.superpowers/sdd/progress.md` — il registro: **Task 1, 2 e 3 sono `complete`**, e ci sono le
   **precondizioni dichiarate** per il Task 4.
4. La spec `docs/superpowers/specs/2026-08-06-intervento-post-consegna-design.md`, **§6 col riquadro
   D276 e quello D277/D278**.
5. Il verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, **tornate 110-115**.

## 5. Il minimo per non sbagliare

- ⚖️ **D284 — applicare una migration al banco NON si chiede più:**
  `cd "…/ua-app" && npx supabase db push --linked --yes`. 🛑 **`--yes` è obbligatorio**: senza, il
  comando resta **appeso a una domanda** e sembra fallito senza esserlo. `scripts/psql.mjs` esegue il
  SQL **ma NON registra la migration**. Perimetro: **solo il banco di prova**, mai la pubblicazione.
- **Worktree VIETATI.** Branch nel repo principale.
- **La data si legge dall'orologio** (`date`), mai dedotta.
- **L'uscita dietro una pipe è quella dell'ULTIMO comando**: `verify:full` si legge **da variabile**.
- **Per un'ASSENZA, un percorso alla volta**: un glob non quotato in zsh **aborta tutto il comando** —
  pagato di nuovo oggi.
- **Le prove di integrazione hanno bisogno delle credenziali**, o si saltano in silenzio:
  `set -a && . ./.env.local; set +a; npx vitest run tests/integration/…`.
  ⚠️ La forma `grep .env.local | cut` **viene rifiutata dal classificatore**: si usa `. ./.env.local`.
- 🛑 **La connessione `SUPABASE_DB_URL` è il PROPRIETARIO delle tabelle:** una prova sui permessi che
  non gira dentro `SET LOCAL ROLE service_role` **non prova niente** — sembra copertura ed è il
  contrario.
- **Le sonde sul database vivo** si modellano su `scripts/tmp/sonda-intervento-r-p1.mjs`; le prove di
  rifiuto girano in `BEGIN … ROLLBACK`, **mai** in una migration registrata. `scripts/tmp/` è ignorata
  da git: **gli spike non si committano**.
- ⚠️ **I nomi in `.superpowers/sdd/` NON sono distinti per ondata** — prefisso `intervento-`. Una
  collisione è già stata pagata il 05/08, e oggi `task-2-report.md` di un'altra ondata era **lì**.
- **MEMORY.md e ROADMAP non si aprono col lettore di file**: `sed -n '1,60p' … | cut -c1-260`.
- **Il banco è `ua-prod-3020`**, nel launch.json della **cartella superiore**. Utente **del
  laboratorio** (`h4t@live.it`): `francesco.formicola@live.it` è `admin_sistema` e finisce su `/admin/labs`.
- **Il push su `main` resta di Francesco.**

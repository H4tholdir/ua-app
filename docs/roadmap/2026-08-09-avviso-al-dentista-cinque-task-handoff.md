# Handoff — 09/08/2026 sera: l'avviso al dentista è costruito a metà, il disegno è approvato, e NESSUNO PUÒ ANCORA APRIRLO

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 9 agosto 2026, **22:28** (`provato:` `date`, in un comando **separato**).
**Stato:** ramo **`intervento-post-consegna`**, ✅ **PUBBLICATO**, albero **pulito**.
🔑 **`main` NON è stato toccato** ed è `7427a680`.
⚠️ Il conteggio dei salvataggi **non si ricopia da qui**: `git rev-list --count main..HEAD`
(alla scrittura: **249**). Zero salvataggi non pubblicati.
📬 **PR #1 resta IN BOZZA**, e va bene così: serve a **far girare la CI**, non a fare il merge.

📌 **MISURATO IN CHIUSURA** (`npm run verify:full`, uscita letta **da variabile e SENZA pipe**):
**`VERIFY_EXIT=0`** · `vitest` **5902 passate | 119 saltate** su **465 file** (456 passati, 9 saltati) ·
`tsc` 0 · build ok · **tutte le guardie verdi**.
📈 **Riferimento di apertura: 5725 | 84 su 458.** Oggi: **+177 prove e +7 file.**
🔴 **Le 119 saltate sono le prove d'integrazione**: `verify:full` **non carica `.env.local`**, quindi in
locale si saltano. **In CI girano tutte.** Per lanciarle a mano:
`set -a && . ./.env.local; set +a && npx vitest run`

⚖️ **DIECI DECISIONI: D342 → D351.** Totale: **351 in centocinquanta tornate.**
🗄️ **TRE migration nuove.** 🛑 **Pavimento: `20260809133546`** (era `20260808195344`).

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🔴 IL FOGLIO ESISTE E NESSUNO PUÒ APRIRLO — il Task 6 è il montaggio
`provato:` `grep -rn "AvvisoDentista" src/` → **una sola occorrenza fuori dal proprio file, e è un
commento** (`src/components/ds/Campo.tsx:141`). Il componente è costruito, revisionato, con 56 prove
verdi, **e non è agganciato a nessuna schermata.**
🔑 **E il Task 6 non è solo un montaggio: è il posto dove vivono DUE decisioni.** ⚖️ **D350** (il nome del
paziente) si applica passando `pazienteMostrato` — la deroga vive **lì, in un punto solo**, e da lì si
revoca senza toccare il foglio; e il **nome del laboratorio** per la firma arriva da
`lavoro.laboratorio?.nome`, che `provato:` la scheda **legge già** (`lavori/[id]/page.tsx:38`).

### ② 🔴 CINQUE TASK SU DIECI NON SONO FATTI, e il censimento è col codice
`provato:` uno per uno — **Task 6**: `src/lib/avvisi/` contiene **solo** `messaggio.ts` e `stati.ts`, il
modulo delle due letture **non esiste** · **Task 7**: `grep -c sAvvisoDentista src/lib/dashboard/striscia.ts`
→ **0** · **Task 8**: `grep -c avvis` su `portale/[token]/page.tsx` → **0**, e `view_avviso` in
`src/lib/portale/audit.ts` → **0** · **Task 9**: `Comunicazioni` in `clienti/[id]/page.tsx` → **0** ·
**Task 10** (prove d'integrazione e cancelli di chiusura): non iniziato.

### ③ 🔴 IL GATE ESTETICO L2 NON È STATO FATTO — e gli 89 scatti NON sono lui
`provato:` `docs/design/screenshots/2026-08-09-avviso-dentista/` contiene **89 file** e un `MISURE.md`:
è la **FASE 9** (prova a schermo con i contrasti misurati), **non** il gate **9b**, che è un micro-audit
contro le 12 sezioni di `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`.
⚠️ **Il gate è dovuto prima del merge** (D245: è cambiato l'**aspetto**), e sta nel **Task 10**.
🔑 **Perché la distinzione conta:** «ci sono gli scatti» è la frase con cui un gate si dà per fatto.

### ④ 🔴 IL MERGE SU `main` RESTA NO
La CI è verde, ma l'ondata **non è finita**: manca metà del Task E, che è **un obbligo di legge**
(GDPR Art. 19 — con la riserva ⑦ qui sotto sul suo fondamento).

### ⑤ 🟠 UNA DECISIONE DI FRANCESCO CHE NON GLI È STATA PORTATA, perché nasce DOPO la sua scelta
⚖️ **D351** («a voce» con un tocco) **ha rotto la parità dei tocchi di ⚖️ D335**: `provato:` dalla scheda,
WhatsApp costa **3** tocchi, «a voce» **2**. **Non è stata riequilibrata di nascosto** — l'unico modo
sarebbe togliere il passo del messaggio, cioè toccare ⚖️ **D334** (il testo è modificabile).
➡️ **È una domanda aperta per Francesco**, e la risposta cambia il foglio: va posta **prima** del gate L2.

### ⑥ 🔴 I MIEI ERRORI, e sono NOVE — tutti trovati da esecutori, da una guardia, o da Francesco
1. **Ho detto a Francesco che il push mi era bloccato. Falso:** il permesso `"Bash(git push*)"` era in
   `ua-app/.claude/settings.json` **da due giorni**. La causa non è mia distrazione: la sezione D296 del
   `CLAUDE.md` **apriva** con «IL CLASSIFICATORE BLOCCA `git push` LO STESSO» in grassetto, e la correzione
   stava **trenta righe sotto**. 🔑 **Corretta la riga in cima, e scritta la lezione: in un documento lungo
   vince ciò che si legge per primo, non ciò che è vero.**
2. **Le due sonde stavano in `scripts/tmp/`, che git IGNORA**, e **tre documenti vivi** le citavano come
   prova. Su una macchina nuova quei riferimenti sarebbero morti — e **la guardia non può vederlo**, perché
   i file esistono in locale. Ora sono in `scripts/sonde/`, versionate.
3. **«Riparazione di una riga»** sul difetto della cancellazione laboratorio: **numero non misurato**. La
   sonda si ferma alla **prima** chiave che scatta, quindi il DPA è il primo difetto, non l'unico.
4. **Il brief del Task 3 non l'avevo salvato** — stessa famiglia del punto 2: un documento che governa il
   lavoro e vive in un posto solo. L'ha notato l'esecutore.
5. **Una premessa del brief del Task 3 era falsa:** «*se esiste già un posto solo da cui si prende
   l'indirizzo dell'app, usa quello*». `provato:` **non esiste, sono dieci punti**, due dei quali lo danno
   per certo con `!` **sui percorsi che riportano un cliente dal pagamento** → riga **45**.
6. 🔴 **Un fatto FALSO su D345, in tre documenti vivi:** avevo scritto che «*ogni sollecito di pagamento si
   firma UÀ Lab*». `provato:` le due occorrenze stavano **entrambe** in `buildWhatsappMessage` (**la
   consegna**); **il sollecito non era firmato AFFATTO**. 🔑 **Il meccanismo è quello dei mandati sbagliati
   di ieri:** ho letto «due occorrenze in un file usato da quattro componenti» e ho attribuito la stringa
   **a tutti i chiamanti**. *Un grep dice dove sta una stringa, non chi la produce.*
7. **Il brief del Task 5-bis diceva «azzerando i DUE campi»: sono TRE** (anche `testo_inviato`), e la
   conseguenza è più grande dell'errore — un ritorno **cancellerebbe la prova ex Art. 5(2)** di che cosa fu
   detto al dentista.
8. **Nel mockup avevo definito i token dentro `[data-ds="v3"]` e non messo l'attributo su nessun elemento:**
   le variabili non si risolvevano. Trovato **prima** degli scatti, e corretto.
9. **Un riferimento pendente a un file che il Task 6 deve ancora creare**, in due documenti: **la guardia
   ha bloccato il commit**. È il caso in cui la rete meccanica ha funzionato al posto mio.

### ⑦ 🟠 LE RIGHE DI CODA APERTE OGGI — dalla 42 alla 51, DIECI nuove
**42** 🔴 `admin_delete_laboratorio` è **rotta oggi** (`23503` su `data_processing_agreements`, provato con
zero avvisi) · **43** la chiave dell'autore morde, e oggi salva solo l'**ordine** interno · **44** nove
difese senza prove + un commento che dichiara una protezione inesistente · **45** l'indirizzo dell'app in
**dieci** punti · **46** 🔴 `schema.sql:247` dichiara **quattro** ruoli su **cinque** · **47** `striscia.ts`
contraddice D342 su `admin_rete` · **48** 🔴 **il portale si migra intero a v3** (⚖️ D347, ondata a sé) ·
**49** 🔴 **il collegamento non scade più** (⚖️ D348: migration + comando in anagrafica + logica, **dominio
critico → panel**) · **50** i due difetti dei componenti **condivisi** (⚖️ D349) · **51** due messaggi che
escono **senza nessuna firma**, uno **a un dentista**.

### ⑧ 🟠 DUE RISERVE NORMATIVE APERTE, e vanno a panel insieme alla riga 35
① **Il fondamento potrebbe non essere l'Art. 19:** quell'articolo si aggancia alle rettifiche «*effettuate a
norma dell'articolo 16*», cioè **su richiesta dell'interessato**; se il laboratorio corregge **di propria
iniziativa**, il fondamento è **Art. 5(1)(d) + 5(2)**. L'esito pratico è identico, **l'etichetta no** — e
oggi quell'etichetta è scritta nel `COMMENT` della tabella. ② **«Chi» potrebbe non bastare per l'Art. 5(2):**
il registro andrebbe interrogabile **per PAZIENTE**, perché l'Art. 19 seconda frase impone al titolare di
poter dire all'interessato **quali** destinatari ha informato. 🛑 **Nessuna delle due è verificata su fonte
primaria.**

### ⑨ 🟡 INVARIATI dalle sessioni precedenti
La riga **35** (il **moncone** `classe_iia` contro MDCG 2021-24 Regola 8 → **la scadenza PSUR detta è
sbagliata**, panel obbligatorio) · la riga **34** (il segno delle sostanze sul materiale) · le righe
**36 · 37 · 38 · 41** · `contiene_sostanze_o_tessuti` ancora cablato a `false` (`generate-ddc.ts:349`) ·
i quattro rilievi estetici del gate del 09/08 mattina · `CRON_SECRET` · la terza copia dei nove campi.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| ✅ **Cinque task su dieci + tre fuori piano** | Task **1 · 2 · 3 · 4** (+**4-bis** ruoli, +**4-ter** firma) · **5** (+**5-bis** un tocco) |
| ✅ **La tabella degli avvisi e la RPC** | tre stati col loro `CHECK` · cinque chiavi · RLS · **`EXECUTE` solo a `service_role`** · l'avviso nasce **dentro** la transazione della riemissione |
| ✅ **La rotta che chiude un avviso** | `isSameOrigin` · il filtro `lavoro_id` **che il piano non chiedeva** · 409 sull'avviso già chiuso · aggiornamento **condizionato** |
| ✅ **Il foglio (variante A2)** | **872 righe** · una domanda, due strade di **peso identico** · **56 prove** |
| ✅ **Il primo campo multilinea del design system** | `CampoTestoLungo` — `provato:` non esisteva **nessuna** `<textarea>` in nessuna superficie v3 |
| 🎨 **Cancello §0B PASSATO** | mockup a **due superfici × tre varianti**, **sei scatti** 390/768/1280 × chiaro/scuro → ⚖️ D344 (**A2**) · D346 (**B1**) |
| ⚖️ **Dieci decisioni** (D342 → D351) | fra cui **una che un panel a tre ha RIBALTATO** e **due che nascono da un esecutore fermatosi sul confine** |
| 🔬 **Prove misurate, non stimate** | `5725 | 84` → **`5902 | 119`**, `VERIFY_EXIT=0` |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **UN GREP DICE DOVE STA UNA STRINGA, NON CHI LA PRODUCE.** È il mio errore ⑥: due occorrenze in un
   file usato da quattro componenti **non** vogliono dire che quei quattro la emettano. **Si guarda in
   quale funzione vive.**
2. 🛑 **IN UN DOCUMENTO LUNGO VINCE CIÒ CHE SI LEGGE PER PRIMO E IN GRASSETTO, NON CIÒ CHE È VERO.** Una
   correzione messa *dopo* l'affermazione che smentisce **non la sostituisce: la lascia in piedi.**
   ➡️ **Quando un fatto cambia si riscrive la riga in cima**, non si aggiunge una nota in fondo.
3. 🔑 **UNA PROVA SCRITTA PER ESSERE SMENTITA VALE PIÙ DI UNA CHE DESCRIVE.** Il Task 4 ha fissato «tutti
   possono chiudere» *perché* una decisione futura la facesse arrossire: tre ore dopo **è arrossita**, col
   messaggio giusto. Nominava i quattro ruoli **uno per uno** — se avesse controllato «una chiamata
   qualunque riesce», sarebbe rimasta verde.
4. 🛑 **UNA PROVA CHE DERIVA TUTTO DA CIÒ CHE PROVA NON PROVA NIENTE**, e il conteggio di R-P4 lo trova: un
   abbozzo scritto come **blocklist** superava 5 prove su 6 · una prova **ciclava sulla costante** che
   stava provando · e nel Task 5-bis **due prove sono rimaste verdi seguendo il tasto mentre si spostava**,
   perché lo cercavano con un **pezzo di frase** che combaciava anche con la riga.
5. 🛑 **UNA SONDA SBAGLIATA NON DICE «NON LO SO»: DICE UN NUMERO.** La prima misura dei contrasti del Task 5
   dava **15 falsi positivi** perché leggeva `background-color`, e i gradienti rispondono `transparent`.
   Corretta, **due testi erano davvero sotto soglia** — ed erano suoi.
6. 🔑 **IL CENSIMENTO PUÒ DECIDERE MEGLIO DEL MANDATO.** Avevo indicato la consegna come *il* precedente
   dell'annullo: aprendola, i meccanismi sono **due**, divisi per **reversibilità** — ciò che ha uno stato
   di ritorno si scrive e si rovescia, ciò che **non si disfa** si **differisce**. L'avviso sta sulla
   seconda metà **per costruzione**.
7. 🔑 **UN PANEL SERVE ANCHE A RIBALTARE UNA PROPOSTA, NON SOLO A CONFERMARLA.** Sui ruoli, **due advisor su
   tre, da direzioni opposte**, hanno portato lo stesso argomento: escludere il tecnico **peggiora la prova
   che vuole proteggere**, perché chi ha telefonato non può registrarlo e **registra un altro**.
8. 🔑 **UNA PRECAUZIONE DIVENTA UNA NECESSITÀ QUANDO LA MISURI.** «Escludi `admin_sistema` **per nome**» era
   un ragionamento; il vincolo vivo è `(ruolo='admin_sistema') OR (laboratorio_id IS NOT NULL)` — **una
   implicazione in una direzione sola** — e un `admin_sistema` **con** laboratorio è **legale**.
9. 🔑 **UN ESECUTORE CHE SI FERMA SUL CONFINE VALE UNA DECISIONE MIGLIORE.** Due domande di stasera nascono
   così: il nome del paziente (**terza deroga**, non istituita da solo) e il numero di tocchi di «a voce»
   (**un passo che il mockup non mostrava**).

## 3. Che cosa resta aperto, in ordine

1. 🔴 **Il Task 6** — il montaggio, dove vivono D350 e la firma. **§0①.**
2. 🔴 **I Task 7 · 8 · 9 · 10**, e il **10** porta il **gate estetico L2**, che è **dovuto prima del merge**.
3. 🟠 **La domanda a Francesco sulla parità dei tocchi** (§0⑤): va posta **prima** del gate.
4. 🔴 **Il moncone** (riga **35**) e le **due riserve normative** (§0⑧): **un panel solo**, sono lo stesso mestiere.
5. 🔴 **La riga 42** (`admin_delete_laboratorio` rotta **oggi**) e la **46** (`schema.sql` con quattro ruoli).
6. 🔴 **Le due ondate nuove**: il portale a v3 (**48**) e il collegamento che non scade (**49**).
7. 🟠 **La riga 51** — due messaggi senza firma, uno **a un dentista**.

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. Il **piano**: `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md` — **Task 6**, e le sezioni
   aggiornate con D344/D346/D348.
3. Le **revisioni**: `.superpowers/sdd/avviso-dentista-task-{1,2,3,4,4ter,5}-revisione.md` — portano ciò che
   resta **`non provato`**, task per task.
4. Il **verbale**, **centoquarantottesima → centocinquantesima** tornata (**D342 → D351**).
5. La **coda della roadmap**, righe **34-51**.

## 5. Il minimo per non sbagliare

- ✅ **IL PUSH DI UN RAMO SI ESEGUE, e funziona:** `provato:` due volte oggi. Il permesso è in
  `ua-app/.claude/settings.json`, **versionato**. 🛑 **Non dire più «lo strumento mi blocca»** — e se un
  giorno succede, **leggi quel file prima di dichiararti bloccato**.
  ⚠️ **Agli ESECUTORI il push viene rifiutato**: lo lancia l'orchestratore.
- 🛑 **`date` in un comando SEPARATO** · migration con l'orologio **universale**
  `date -u "+%Y%m%d%H%M%S"` (**D311**). **Pavimento: `20260809133546`.**
- 🛑 **`verify:full` si legge DA VARIABILE e SENZA PIPE**, timeout **600000 ms**. ⚠️ **Un `| head` maschera
  l'uscita**: il Task 4-bis ha misurato un `0` falso proprio così, **sulla prova che doveva dimostrare che
  un cancello si accende**.
- 🔴 **`verify:full` NON carica `.env.local`:** **119** prove d'integrazione si saltano. In CI girano tutte.
- ⚖️ **D284 — applicare una migration non si chiede:** `npx supabase db push --linked --yes`. **Dopo, FASE 6b.**
- 🛑 **Il file di migration NON è la prova: la verità è il catalogo vivo.** 🔴 **Costato oggi su un obbligo di
  legge:** il piano mandava a leggere una migration **superata quattro volte**, la cui allowlist portava
  ancora `paziente_nome_snapshot` e `numero_prescrizione` — **usciti con D319/D320 per ragione normativa**.
- 🛑 **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`** · **`now()` è costante in transazione** ·
  `scripts/psql.mjs` si collega **come proprietario**: una sonda sui permessi senza `SET LOCAL ROLE` non
  prova niente.
- 🛑 **I ruoli sono CINQUE**, e la fonte è il `CHECK` vivo — **non `schema.sql`, che ne dichiara quattro**
  (riga 46). In `src/` **non esiste** un elenco unico: c'è ora `RUOLI_CHIUSURA_AVVISO` per l'avviso.
- ⚖️ **D318 — `git add <percorsi>`, MAI `-A`**, e **`git status` PRIMA di salvare**: l'albero è condiviso con
  gli esecutori. Messaggi lunghi con **`-F <file>`** (con `-m` i backtick vengono **eseguiti**).
- 🛑 **Worktree VIETATI** · niente `rm -rf` fuori dalle aree temporanee (`/usr/bin/trash`) · temporanei in
  `scripts/tmp/` — **che git ignora: se un documento cita un file, quel file va in una cartella versionata**.
- ⚠️ **In `MEMORY.md` «voce N» è RISERVATA** alle sezioni: per la roadmap si scrive «**la riga N della coda**».
  **La guardia blocca il commit** — e oggi l'ha fatto, su un file che il Task 6 deve ancora creare.
- **MEMORY.md e ROADMAP non si aprono col lettore di file**: `sed -n '1,60p' … | cut -c1-260`.
- ⚖️ **D103 — l'accesso al banco non si chiede:** `npx tsx scripts/link-accesso.ts`.
  ⚠️ **La ricetta del §7 del `GATE-L2.md` porta a un 404** (`TEST_EMAIL` punta a un altro laboratorio).

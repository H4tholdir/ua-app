# RESOCONTO — Task 7 del piano «Torna a `pronto` col documento intatto»

**Ramo:** `intervento-post-consegna` · **Base:** `2ede802d` · **Data:** 7 agosto 2026
**Piano:** `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`, Task 7 (righe 831-985)
**Spec:** `docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md` §0 · §1 · §2 · §3 · §4
**Brief:** `.superpowers/sdd/pronto-task-7-brief.md`

---

## 1. Che cosa NON è andato, e che cosa ho trovato di sbagliato nel piano

Sei ritrovamenti. Il **primo e il secondo** avrebbero rotto la suite; il **terzo** avrebbe reso
verde un comando che non prova niente.

### ⓐ 🔴 `corpoValido` usava proprio uno dei due motivi del bivio — 40 prove si sarebbero rotte

`tests/unit/eventi-qualita-route.test.ts:90` (prima della modifica) fissava
`motivo: 'difetto_lavorazione'` come corpo «minimo valido». È **uno dei due motivi che dal Task 7
pretendono `scelta_intervento`**: da questa modifica in poi quel corpo non è più valido, e le
**~40 chiamate** che non indicano un motivo proprio (`corpoValido()` nudo o con un solo campo
sovrascritto) sarebbero uscite tutte **422**.

Né il piano né il brief lo dicono. **Il difetto vero non è il rosso di massa** — quello si vede
subito: è che un rosso di 40 prove non parla del difetto che ciascuna sorveglia, e la via più
rapida per farlo sparire (aggiungere una scelta al corpo predefinito) avrebbe fatto partire una
RPC vera dentro quaranta prove che non c'entrano niente, con l'esito `fallito` e i log del server
sporchi. Ho cambiato il **motivo** predefinito, non aggiunto un campo.

**Ripiego scelto:** `errore_dato_dichiarazione`, per tre proprietà **misurate, non supposte** —
① non apre nessun bivio; ② non porta nessuna azione automatica (`src/lib/qualita/effetti.ts:112-127`,
`azione: null`); ③ la sua natura derivata è `dato_documentale`, che **non** è fra le tre esenzioni di
`src/lib/qualita/classifica.ts:161-183`, quindi la proposta resta `reclamo` esattamente com'era con
`difetto_lavorazione`. Con `errore_prezzo_quantita` (natura `commerciale`) l'esito sarebbe diventato
`nessuna_azione` e due prove sul contratto della risposta avrebbero cambiato significato.

### ⓑ 🔴 …e la stessa fixture esisteva UNA SECONDA VOLTA, in un altro file — e lì il danno era peggiore

`tests/unit/istante-roma.test.ts:264` portava lo stesso `motivo: 'difetto_lavorazione'`.
`provato:` prima della correzione, `npx vitest run tests/unit/istante-roma.test.ts` →
`Tests 3 failed | 30 passed (33)`, tutte e tre `expected 422 to be 201`.

🛑 **Ma il guasto grosso non è nelle tre rosse: è nelle trenta verdi.** La guardia del bivio sta
**prima** della lettura di `conosciuto_il` nell'ordine della rotta, quindi tutte le prove di quel
file che si aspettano un **422** continuavano a passare — **per il motivo sbagliato**. Un intero
file di prove sull'orologio di Roma (D286, una data che fa partire termini di legge) avrebbe
smesso di misurare l'orologio di Roma restando verde. È la classe di difetto «un controllo che
torna verde perché non è mai partito», qui in forma silenziosa.

Non l'ho trovato con un ragionamento: l'ho trovato **lanciando più prove di quelle che il mio
mandato nominava**. È l'innesco di R-P2 (l'elenco dei file toccati non lo decide l'autore) applicato
alle prove.

### ⓒ 🔴 Il comando di verifica del piano (Passo 6) è VERDE e non prova niente

Il piano indica come cartella di prova `tests/unit/api/` e come verifica
`npx vitest run tests/unit/api`.

- `provato:` `ls tests/unit/api/` → `No such file or directory`. **Quella cartella non esiste.**
- `provato:` `npx vitest run tests/unit/api` → `Test Files 9 passed (9) · Tests 221 passed (221)`,
  uscita **0**. Vitest tratta l'argomento come un **frammento di nome di file**, non come una
  cartella: i nove file sono `tests/unit/api-fatture.test.ts`, `api-pazienti-*`, `api-prescrizione-*`,
  `api-prove.test.ts`…
- `provato:` `npx vitest run tests/unit/api --reporter=verbose | grep -c "eventi-qualita-route"` → **0**.
  **Il file di prova di questo task non è compreso.**

➡️ Chi avesse seguito il piano alla lettera avrebbe letto un verde su 221 prove **di altri task** e
dichiarato fatto. È peggio di «nessun file trovato», perché nessun file trovato si vede.
Ho scritto le prove dove stanno quelle dei vicini veri: `tests/unit/eventi-qualita-route.test.ts`,
che è anche il file nominato dal comando di verifica del mio brief.

### ⓓ Il censimento del rinominare, nel brief, si fermava al componente

Il brief (punto 5) nomina `DevoIntervenire.tsx:106` e `:492-513`. Manca
**`tests/unit/DevoIntervenire.test.tsx`**, che passa `riapertura` in **quattro** punti (`:105`,
`:178`, `:189`, `:200`). `tsc` **non** li vede: entrano da `fingiFetch(risposta: unknown)`.
Tre di quei quattro sono usciti rossi appena rinominato il campo nel componente — quindi il difetto
si sarebbe visto — ma vale la pena scriverlo: il censimento di un rinominare non si chiude
guardando dove il compilatore si lamenta.

### ⓔ Discrepanza minore nel brief

Il brief dice che l'intestazione del ciclo (righe ~771-784) recita «GLI ALTRI **OTTO** MOTIVI NON la
chiamano». Nel file c'era scritto «GLI ALTRI **SEI** MOTIVI» (già corretta dal Task 6). Dopo di me
sono **quattro**: escono anche i due difetti, che ora non sono più corpi validi senza scelta.

### ⓕ La riga ⑤ «non provata»: NON è uscita diversa, ma non è nemmeno provata come sembra

Il piano avvisa: «⑤ … è la riga che il piano dichiara non provata: se esce diversa, fermati e
riferisci». **Non esce diversa** — ma va detto con precisione che cosa è stato provato:

| che cosa | come | stato |
|---|---|---|
| la rotta **traduce** `esito:'non_consegnato'` in `{stato:'non_applicabile'}` | prova unitaria con RPC finta | ✅ provato |
| la RPC **risponde davvero** `non_consegnato` su un lavoro non consegnato | letto in `supabase/migrations/20260807182614_riporta_a_pronto_atomica.sql:73` — `IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito','non_consegnato')` | ✅ letto, non eseguito |
| il giro completo, dal 201 alla riga in banca dati | — | ❌ **non provato qui**: è il Task 10 |

In una prova unitaria il valore di ritorno della RPC **lo scelgo io**: un verde qui non dice niente
sul comportamento del database. L'ho scritto anche nel commento sopra la prova, perché fra tre
sessioni sembrerà una prova d'integrazione e non lo è.

---

## 2. I numeri R-P4 — e che cosa NON misurano

### Il conteggio

**31 su 37.**

- **37** = i casi di prova nuovi o cambiati (20 nel blocco nuovo del bivio, 10 nel blocco D288,
  3 fixture/ordinamento altrove, 4 in `DevoIntervenire.test.tsx`).
- **31** = quanti si accendono contro l'**abbozzo inerte**, cioè la rotta prima di questo task: il
  modulo si risolve, `effettoDaMotivoEScelta` esiste già dal Task 6, e la rotta esegue — semplicemente
  non smista le due azioni nuove e non conosce `scelta_intervento`. Non è il rosso da «modulo non trovato».

`provato:`

```
 Test Files  2 failed (2)
      Tests  31 failed | 104 passed (135)
```

### 🛑 Che cosa quel 31 NON misura — il secondo numero

**Sei dei 37 casi erano già verdi prima della modifica**, e vanno dichiarati perché un numero solo
li nasconderebbe:

| caso | perché non si accende | che cosa sorveglia comunque |
|---|---|---|
| `②-bis` `scelta_intervento: null` su motivo senza bivio → 201 | prima la rotta ignorava la chiave del tutto | che la guardia nuova **non** rifiuti `null` |
| «GLI ALTRI QUATTRO MOTIVI…» | quei quattro non avevano azione né prima né dopo | nessuna regressione dal cambio di fixture |
| «i DUE DIFETTI restano liberi su ogni stato» | prima la rotta non guardava affatto la coppia (motivo, stato) | che la guardia su `destinatario_errato` **non tracimi** sui difetti |
| «natura incoerente → 422 col messaggio della natura» | la guardia sulla natura esisteva già | l'**ordine** delle due guardie, che prima non era sorvegliato |
| «natura coerente col motivo derivabile → 201» | cambiato solo il motivo usato | nessuna regressione |
| `DevoIntervenire` «manda mai uscito» | guarda solo il corpo della richiesta | nessuna regressione |

➡️ Quindi: **31 casi misurano comportamento nuovo, 6 sono reti contro le regressioni** di questa
stessa modifica. Il secondo gruppo vale, ma non va contato come forza delle prove.

### Le forme d'ingresso censite per `scelta_intervento`

| forma | esito atteso | coperta? |
|---|---|---|
| chiave assente, motivo del bivio | 422 | ✅ caso ① (su **entrambi** i motivi) |
| `null`, motivo del bivio | 422 | ✅ caso ①-bis |
| stringa fuori vocabolario (`'forse'`) | 422 | ✅ caso ③ |
| numero (`7`) | 422 | ✅ caso ③-bis |
| array (`['si_sistema']`) | 422 | ✅ caso ③-bis |
| oggetto (`{scelta:'si_sistema'}`) | 422 | ✅ caso ③-bis |
| booleano (`true`) | 422 | ✅ caso ③-bis |
| valore valido, motivo **senza** bivio | 422 | ✅ caso ② |
| `null`, motivo senza bivio | 201, come l'assenza | ✅ caso ②-bis |
| `undefined` esplicito | — | ❌ **non coperta, perché** `JSON.stringify` cancella la chiave: al confine HTTP quel caso **è** «chiave assente», già coperto da ① |
| corpo non-JSON / `null` / array al posto dell'oggetto | 400, mai 500 | ✅ **già coperte** dalle prove d'ingresso esistenti: quel confine è a monte e non l'ho toccato |

Ogni caso di rifiuto porta il **valore che deve essere respinto** e — dove il messaggio è la parte
che conta — il testo atteso: `'si sistema questo manufatto'` per ①, `'nessuna scelta da fare'` per ②,
`'consegna'` per la guardia su `destinatario_errato`.

---

## 3. Le modifiche, file per file

### `src/lib/rifacimento/cassetta.ts` — **nuovo** (97 righe)

`trasferisciCassettaAlRifacimento` **estratta**, non riscritta: è lo stesso corpo che viveva in
`src/app/api/lavori/[id]/rifacimento/route.ts:57-102`, con il suo commento. Due copie sarebbero «le
liste scritte due volte» in forma di codice, e il difetto che ne uscirebbe è un tecnico che apre il
cassetto e lo trova vuoto a seconda del bottone premuto.

### `src/app/api/lavori/[id]/rifacimento/route.ts` — −84 righe

Tolta la copia locale (con `callRpcWithRetry`, che ora vive nel modulo condiviso); aggiunto
l'import (`:6`). La chiamata a `:115` è invariata. `tests/unit/rifacimento-route.test.ts` (516 righe)
resta verde senza toccarla: finge `getServiceClient`, quindi non vede da dove arriva l'helper.

### `src/app/api/lavori/[id]/eventi-qualita/route.ts` — +247/−… (il file cresce da 533 a ~660 righe)

| riga | che cosa |
|---|---|
| `:6-25` | import: `Motivo`, `effettoDaMotivoEScelta`, `richiedeScelta`, il tipo `Scelta`, `trasferisciCassettaAlRifacimento`. Via `effettoDaMotivo`, che non serve più |
| `:115` | `const SCELTE = ['si_sistema','si_rifa'] as const` — specchio del CHECK vivo |
| `:250-268` | **il bivio**: scelta obbligatoria sui due difetti, scelta di troppo rifiutata (mai uno scarto muto) |
| `:270-278` | **la guardia gemella**: `destinatario_errato` + `mai_uscito_dal_lab` → 422 |
| `:376` | `daScrivere.scelta_intervento = scelta`, **solo** quando non è `null` |
| `:434` | `effettoDaMotivoEScelta(motivo, scelta)` — l'effetto viaggia **già risolto** |
| `:438` | **Passo 4-bis**: `eventoId` preso dalla riga appena inserita, mai dal corpo |
| `:455-462` | lo smistamento a tre vie |
| `:479` | la risposta porta `esito_azione`, e `riapertura` **non** resta come sinonimo |
| `:500-508` | `type EsitoAzione` (era `Riapertura`) |
| `:527-535` | `CAVEAT_RIPRISTINO` — la chiave del caveat è **dichiarata per RPC**, non annusata dalla risposta |
| `:550-598` | `chiamaRipristino` (era `riapriLavoro`), che ora serve **entrambe** le gemelle |
| `:603-658` | `creaRifacimento`, con il 23505 tradotto e il trasferimento cassetta fail-soft |

**Perché la chiave del caveat è un parametro e non un annusare.** Una funzione che accettasse
`ddc_assente` **oppure** `ddc_viva` da entrambe le RPC risponderebbe `applicato` **senza nessuno dei
due campi** il giorno in cui una delle due cambiasse forma: perderebbe il caveat in silenzio, che è
proprio ciò che i caveat esistono per impedire. Dichiarata, una divergenza esce `false` — un avviso
in più, mai uno in meno.

**La guardia sul laboratorio nella lettura di riparazione del 23505.** `svc` è la chiave di
servizio, quindi senza RLS: `.eq('laboratorio_id', laboratorio_id)` non è ridondante con l'indice
unico, è la riga che tiene la lettura dentro il laboratorio di chi ha chiesto. C'è una prova che
ispeziona i filtri, non solo l'esito.

**Il nome della FK l'ho verificato, non copiato.** Il piano usa
`lavori_rifacimenti!lavori_rifacimenti_lavoro_nuovo_id_fkey`; `lavori_rifacimenti` ha **due** FK
verso `lavori`, quindi il suggerimento è obbligatorio. `provato:` `src/types/database.types.ts:3608`
— i tipi sono generati dal catalogo vivo e portano quel nome esatto.

### `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx` — +30/−… (solo il rinominare)

`interface Riapertura` → `interface EsitoAzione` (`:109-116`), col campo `dichiarazione_viva` e
`lavoro_nuovo` aggiunti al tipo; `riapertura?` → `esito_azione?` (`:122`); i cinque lettori a
`:508-528`. **Nient'altro.** In cima al tipo ho lasciato scritto, dichiarato e non nascosto, che i
riquadri disegnano ancora solo il caso della riapertura — vedi §6.

### `tests/unit/eventi-qualita-route.test.ts` — +543 righe

Fixture (`:90-118`), banco esteso con `lavori_rifacimenti` (`:169-190`), il ciclo dei motivi senza
azione ridotto a quattro, la prova D312 **cambiata** (non aggirata), e un blocco nuovo di **20 casi**
sul bivio e sulle due azioni.

### `tests/unit/istante-roma.test.ts` — +15/−3 · `tests/unit/DevoIntervenire.test.tsx` — +4/−4

Solo le due fixture e il rinominare. Nessuna asserzione tolta o indebolita.

---

## 4. Le verifiche, con l'output vero

```
$ cd ".../ua-app" && npx vitest run tests/unit/eventi-qualita-route.test.ts tests/unit/qualita-effetti.test.ts 2>&1 | tail -12

 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 Test Files  2 passed (2)
      Tests  139 passed (139)
   Start at  23:16:21
   Duration  874ms (transform 200ms, setup 259ms, import 222ms, tests 43ms, environment 948ms)
```

```
$ cd ".../ua-app" && npx tsc --noEmit > /tmp/tsc-t7.log 2>&1; echo "uscita=$?"
uscita=0
--- contenuto del log:
(fine)
```

**E — non richiesto dal brief, ma è il controllo che ha trovato ⓑ — l'intera suite unitaria:**

```
$ cd ".../ua-app" && npx vitest run tests/unit 2>&1 | tail -25

 Test Files  444 passed (444)
      Tests  5467 passed (5467)
   Duration  126.94s
```

⚠️ **`npx tsc --noEmit` non valida la firma degli handler di rotta** — quella la vede solo
`next build`. **Non ho cambiato la firma di nessun handler**: `POST(req: Request, { params }: RouteContext)`
è identica prima e dopo in entrambe le rotte toccate. `next build` resta comunque dovuto in FASE 7.

---

## 5. Fuori mandato — riferito, non corretto (R-E2)

### ⓐ `DevoIntervenire.tsx` dichiara ancora `azione: string | null`

`src/components/features/lavori/scheda-v3/DevoIntervenire.tsx:121`. La spec §4.3 dice, testualmente,
che allargare `AzioneAutomatica` non produce errori di compilazione lì perché il componente
ridichiara l'effetto con un tipo lasco, e che **«quel tipo lasco si stringe nella stessa modifica, o
il censimento è decorativo»**. La modifica che allarga l'unione era il **Task 6**, e non l'ha fatto.
**Non l'ho corretto**: il mio brief limita il mio tocco su quel file al rinominare, e stringere un
tipo è una modifica diversa. ➡️ Va al **Task 9**, che quel file lo riscrive comunque.

### ⓑ Il contatore `post_consegna_correzioni` si incrementa anche sul ramo che CREA un lavoro

`route.ts:464-470`. La regola è invariata dal Task 6 (si incrementa quando lo stato del dispositivo
non è `mai_uscito_dal_lab`, qualunque sia il motivo), ma da oggi due motivi in più fanno qualcosa —
e in particolare, su «se ne fa uno nuovo», si conta una *correzione post-consegna* sul lavoro
**vecchio**, che invece resta consegnato e a posto. Può essere giusto (una correzione c'è stata),
ma **nessuno l'ha deciso**, e non è nel mio mandato. Segnalato, non toccato.

### ⓒ 🔴 `.gitignore:89` (`*-report.*`) ingoia proprio i resoconti che D313 voleva salvare

`provato:` `git check-ignore -v .superpowers/sdd/pronto-task-7-report.md` →
`.gitignore:89:*-report.*`.

Il salvataggio è passato **senza questo file**: `git status` restava pulito e `git add -A` non lo
vedeva. D313 (07/08/2026) ha tolto `*` da `.superpowers/sdd/.gitignore` **proprio perché** «un
artefatto che SEMBRA durevole e non lo è è peggio della sua assenza, perché nessuno lo cerca
altrove» — ma la regola di radice, più larga e scritta per altro, riapre lo stesso buco per la
metà più utile dei documenti: i **resoconti**, cioè i numeri misurati e le prove.

📌 Non è un caso isolato: nell'indice c'è **un solo** file `*-report*`
(`task-6-report-ondata-b-sessione-3-PRESERVATO-2026-08-05.md`), e il nome «PRESERVATO» dice da sé
che qualcuno se n'era già accorto e aveva rimediato **a mano**, senza chiudere la causa.

➡️ **Ho forzato SOLO questo file** (`git add -f`), che è il minimo per rispettare il mio brief.
**Non ho toccato `.gitignore`**: una regola che vale per tutto il repository non si cambia dentro il
mandato di una rotta. La decisione — negazione mirata in `.superpowers/sdd/.gitignore`, oppure
restringere la riga 89 — va presa da chi orchestra, e prima del prossimo resoconto, o il Task 8
ripeterà lo stesso passaggio a mano.

### ⓓ La rotta HTTP del rifacimento resta con i suoi sette motivi

`src/app/api/lavori/[id]/rifacimento/route.ts:8-16` non accetta `difetto_lavorazione` e
`difetto_materiale`. La spec §4.1 lo dichiara deliberato («quei due non si scelgono a mano»). Lo
scrivo solo perché ora esistono **tre** allowlist sullo stesso campo — 9 in banca dati, 7 nella rotta
HTTP, 2 nella derivazione degli eventi — e chi legge una sola delle tre si sbaglia.

---

## 6. Autorevisione — dove il lavoro è debole, e che cosa deve sapere il Task 8/9

### 🔴 Da oggi, e fino al Task 9, DUE MOTIVI SU NOVE NON FUNZIONANO A SCHERMO

`DevoIntervenire.tsx` **non manda `scelta_intervento`** (il corpo che costruisce è a `:199-215`, e quella chiave non c'è). Da questo salvataggio in poi, scegliere «Difetto di lavorazione» o «Difetto
di materiale» nel foglio produce un **422** con il messaggio «Dicci come si procede…».

È **previsto** dal piano — il bivio a schermo è il Passo 2 del Task 9 — ma va detto in chiaro:

- 🛑 **questo ramo non va su `main` prima che il Task 9 sia dentro.** Il ramo si pubblica volentieri
  (è una copia di sicurezza); `main` fa partire Vercel, e un'ondata a metà lì non ci va (D296);
- la stessa cosa vale per la combinazione `destinatario_errato` + «Mai uscito dal laboratorio», che a
  schermo è **liberamente componibile** e ora prende un 422 a modulo compilato. Impedirla prima è il
  Passo 4 del Task 9. La guardia nell'API resta comunque: è lì che sta il confine.

### 🔑 Il canale di risposta esiste, ma nessuno lo disegna ancora

I riquadri di esito (`DevoIntervenire.tsx:508-528`) leggono **solo** `dichiarazione_assente` e dicono
«il lavoro è tornato fra i pronti» — che su un rifacimento è **falso**, e su un «torna pronto» col
documento vivo è **incompleto**. `dichiarazione_viva === false` e `lavoro_nuovo` **viaggiano nella
risposta e non arrivano a nessuno schermo**. Generalizzare il disegno e scrivere i sei testi è il
Task 9, Passo 5: l'ho lasciato dichiarato in testa al tipo, invece di farne metà.

### Dove le prove sono deboli

1. **Tutto quello che ho provato è unitario, con il database finto.** Le tre RPC rispondono ciò che
   decido io. Provano che la rotta **chiama la funzione giusta con gli argomenti giusti** e che
   **traduce** gli esiti; non provano nulla su che cosa faccia il database. Il Task 10 non è una
   formalità: è il primo momento in cui questa catena viene percorsa davvero.
2. **Non ho provato la concorrenza vera del 23505.** La prova ⑦ finge l'errore; il giro reale
   (due tocchi ravvicinati) non è mai stato eseguito.
3. **Nessuna prova a schermo (FASE 9).** Il mio mandato è la rotta; e il foglio, come detto sopra, è
   in uno stato intermedio dichiarato. La prova a schermo del giro completo è il Task 9, Passo 6 —
   e vale la lezione del 07/08: quindici prove verdi e il foglio che non si apriva mai.
4. **`next build` non l'ho lanciato** (né `verify:full`, per istruzione). Non ho cambiato firme di
   handler, ma il controllo resta dovuto.

### Che cosa il Task 8 deve sapere

Il Task 8 tocca `src/app/api/lavori/[id]/route.ts` (la PATCH, D308) e **non incrocia** nessuno dei
file che ho toccato. Due cose però lo riguardano:

- il ramo `torna_pronto` che ho appena cablato è **esattamente lo scenario che apre il buco della
  §1** della spec: un lavoro torna a `pronto` con la dichiarazione **viva**. Fino al Task 8 la PATCH
  non ha nessun cancello, quindi in questo momento la porta della §1 è **aperta e raggiungibile** —
  prima di oggi ci si arrivava solo con `errore_registrazione`, che la dichiarazione la annulla;
- `esito_azione.dichiarazione_viva === false` dice che su quel lavoro **non c'è** una dichiarazione
  viva: se il Task 8 aggancia il divieto all'esistenza di una dichiarazione viva, quello è lo stesso
  predicato, e conviene che sia scritto in un posto solo invece che in due.

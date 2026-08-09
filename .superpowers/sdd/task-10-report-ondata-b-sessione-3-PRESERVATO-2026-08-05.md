# Task 10 — Report: il mini-foglio «Chi ha prescritto?» (P37, D211)

**Quando:** 5 agosto 2026, notte (`provato:` `date` → `Wed Aug 5 01:55:52 CEST 2026`).
**Ramo:** `ondata-b-sessione-3` (repo principale, MAI worktree).
**Brief:** `.superpowers/sdd/task-10-brief.md`.

---

## 1. Cosa fa, in breve

Dopo il tile del Passo 1 del wizard «Nuovo lavoro», se il dentista scelto è un'**entità** (ha
`studio_nome`) e ha **almeno un collega** noto (`GET /api/clienti/[id]/studio-members`), sale un
mini-foglio («Chi ha prescritto?») sopra il Passo 1 — mai un passo nuovo, mai bloccante. Si sceglie
un medico, si aggiunge un collega nuovo («È un altro»), o si chiude senza scegliere: in tutti e tre i
casi il wizard avanza comunque al Passo 2, esattamente come oggi. La scelta produce `richiedente_nome`
(la persona) e `istituzione_sanitaria` (lo studio), che viaggiano nel POST `/api/lavori` (il server li
accetta già) e compaiono sul «Fatto!» nella riga «Prescritto da» (già scritta dall'ondata B ③, T3 —
qui si è solo chiuso il 🚧 che la lasciava sempre assente).

**Per un dottore singolo (senza `studio_nome`): zero domande, zero rete in più** — invariato al 100%.

---

## 2. Il gate — e la DEVIAZIONE dal piano, dichiarata (R-E1)

Il brief chiedeva il foglio «SOLO se il cliente ha `studio_nome`». Consultato l'advisor **prima** di
scrivere codice: aprire il foglio su ogni entità, a prescindere dai colleghi trovati, avrebbe reso
**il caso comune** (uno studio "di uno solo" — misurato in `scripts/tmp/p30a-studio-members.ts`, che
esiste apposta perché è il caso frequente) un foglio che chiede «Chi ha prescritto?» e non offre
risposte: la riga vuota che 0B-9 vieta, applicata a un'intera schermata.

**Decisione presa:** `sceltaDentista` interroga `studio-members` **prima** di aprire il foglio; lo
apre solo se la risposta ha **almeno un** elemento. Zero colleghi → si comporta come un dottore
singolo: nessuna domanda, `richiedente_nome` resta assente, e il ripiego server-side
(`generate-ddc.ts:146`, `lavoro.richiedente_nome ?? cliente.cognome+nome`) è già la risposta
corretta, perché quel cliente-riga porta comunque il nome della persona.

**Per non introdurre una `GET` in ogni test esistente che non la stubba:** il gate resta comunque
`studio_nome` (campo `studioNome`, ora su `DentistaWizard`, opzionale nel tipo — i fixture esistenti
non lo portano e restano "dottore singolo", invariati). Solo quando `studioNome` è valorizzato parte
la `GET /studio-members`; per un dottore singolo la funzione resta **sincrona**, zero rete, esattamente
come prima di questo task.

---

## 3. Copy — due scostamenti DICHIARATI dal mockup approvato (docs/design/mockups/2026-08-04-ondata-b-D-chi-ha-prescritto.html scena d1)

1. **Nessuna riga è evidenziata come "proposta"/"l'ultimo che ha prescritto qui" — non c'è un
   default, ogni riga è alla pari.** `studio-members` non porta un ordine per recenza né un
   conteggio di prescrizioni — solo `{id, nome, cognome, studio_nome}`. Un'evidenza verde senza il
   dato dietro sarebbe la bugia che l'intera ondata B esiste per chiudere. **Confermato con
   l'advisor prima di scrivere.** La «proposta dell'ultimo prescrittore» del brief/mockup è
   **dichiarata NON implementabile qui**: servirebbe una via server nuova (es. l'ultimo
   `richiedente_nome` valorizzato per quel cliente) che oggi non esiste — nessuna rotta trovata che
   la offra (censita: `GET /api/lavori` non filtra per `cliente_id` e non seleziona
   `richiedente_nome`). Fuori mandato inventare una rotta nuova (R-E2) — segnalato in §6. L'ORDINE
   di visualizzazione resta comunque quello di `studio-members` (`cognome` ascendente, deciso dalla
   rotta), ma senza alcuna evidenza visiva sulla prima riga.
2. **Il sottotitolo non dice "prescrivono"**: `studio-members` elenca chi RISULTA allo studio, non
   chi ha davvero prescritto. Testo reale: *"Da {studio} risultano N medici. Sulla Dichiarazione va il
   nome della persona, non dello studio."* — plurale/singolare corretto sul conteggio VERO.

---

## 4. «È un altro» — fallback dichiarato, non il riuso letterale di NuovoDentistaSheet

`NuovoDentistaSheet` calcola `label = studio_nome ?? Dr.Cognome`: se lo studio è SEMPRE preimpostato
(come qui), quella label collasserebbe sempre sul nome dello STUDIO, mai sulla persona — il dato
sbagliato per `richiedente_nome`. Il pattern non copre "aggiungi persona a studio esistente" senza
modifiche, quindi si è scelto il fallback che il brief stesso sanziona: un mini-form locale
(Nome+Cognome, stesso vincolo MDR "obbligatori") dentro `ChiHaPrescrittoSheet`, che POSTa allo stesso
endpoint `/api/clienti` con `studio_nome` preimpostato — il nuovo medico entra nello studio (stessa
riga DB, stesso raggruppamento futuro), e `richiedente_nome` è il nome appena digitato (`Cognome Nome`),
non una rilettura dal server.

**Formato del nome — divergenza dichiarata da `TabDati.tsx`:** quella superficie (già in produzione,
stesso concetto — medico richiedente da uno studio) scrive `${cognome} ${nome.charAt(0)}.` (abbreviato,
es. "Bianchi M.") quando si sceglie da una chip. Qui si usa il nome PER INTERO ("Bianchi Marta"): questo
foglio ha spazio per una riga intera, ed è il fallimento migliore su un documento a valore legale. **Le
due superfici scrivono lo stesso campo con convenzioni diverse — segnalato in §6, non corretto qui**
(fuori mandato: `TabDati.tsx` non è un file di questo task).

---

## 5. TDD (R-P4) — non strettamente RED-first; verificato con mutation test al posto del conteggio sequenziale, misurato due volte

**Deviazione dichiarata dal processo canonico:** la complessità del design (gate corretto, fetch
prima-o-dopo l'apertura del foglio, formato del nome, persistenza) ha richiesto una consultazione
advisor **prima** di fissare l'interfaccia dei componenti — a quel punto scrivere il codice e i test
in un solo passaggio coerente era più sicuro che un RED-first letterale su un'interfaccia che sapevo
già sarebbe cambiata. Per non perdere la garanzia che R-P4 esiste per dare (i test toccano davvero il
comportamento, non sono vacui), **dopo l'implementazione ho rotto DUE pezzi core nel codice vero** e
misurato quante asserzioni si accendono — la stessa cosa che un conteggio RED misura, letta al
contrario. Ogni mutazione misurata **due volte, stesso comando, zero righe toccate in mezzo**:

**Mutazione 1** — omissione delle chiavi vuote in `crea-lavoro.ts` (`...(richiedenteTrim ? {...} : {})`
→ sempre incluse, anche `''`):
```
npx vitest run tests/unit/crea-lavoro.test.ts tests/unit/WizardNuovoLavoro.test.tsx
Misura 1: 4 falliti su 73
Misura 2 (stesso comando, zero righe toccate in mezzo): 4 falliti su 73 — identico
```
I 4 rossi: le 2 prove dedicate «entrambi assenti» e «solo spazi» (§ omissione), 1 prova COLLATERALE
di `crea-lavoro.test.ts` preesistente («paziente NUOVO… → 3 fetch») che fa un `toEqual` esatto sul
corpo del POST — la becca come effetto collaterale, non era scritta per questo, e 1 prova di
`WizardNuovoLavoro.test.tsx` («Chiudi» il foglio SENZA scegliere → nessuna proprietà nel corpo). La
terza prova dedicata («entrambi valorizzati») resta verde sotto questa mutazione — misura il
percorso "valorizzato", che la mutazione non tocca; è la prova che il conteggio non è gonfiato.

**Mutazione 2** — il gate `if (!cliente.studioNome)` → `if (true)` (ogni cliente si comporta da
dottore singolo, il foglio non si apre mai):
```
npx vitest run tests/unit/WizardNuovoLavoro.test.tsx
Misura 1: 6 falliti su 40
Misura 2 (stesso comando, zero righe toccate in mezzo): 6 falliti su 40 — identico
```
I 6 rossi: «studio con più medici: il foglio sale», «scelta di un medico → payload+Prescritto da»,
«scelta di un medico, poi Esc», «si può riaprire il foglio una seconda volta», «Chiudi il foglio
SENZA scegliere», «È un altro» — ogni prova il cui percorso passa per l'apertura vera del foglio.
**«dottore singolo: zero rete»** e **«studio di uno solo → si comporta da dottore singolo»** restano
VERDI sotto questa mutazione per costruzione (si aspettano ENTRAMBI "nessun foglio", che è esattamente
ciò che la mutazione produce sempre) — non contano nel totale, ed è corretto che non contino.

Diff post-ripristino verificato identico all'originale via `cp` dal backup in scratchpad (`tsc` +
`vitest` tornati a 0/verde dopo ENTRAMBE le mutazioni, non solo l'ultima).

**Due verifiche aggiuntive richieste dall'advisor prima del commit** (concern non da codice letto,
ma da comportamento runtime non ancora esercitato): scelta di un medico seguita da un Esc "in coda"
(il prescrittore already-commesso non deve essere sovrascritto da una chiusura tardiva) e riapertura
del foglio una seconda volta nella STESSA sessione montata (non uno smontaggio+render fresco). **Le
scritte, girate, PASSANO al primo colpo contro il codice vero** — non un bug noto, un gap di verifica
richiuso: aggiunte come copertura di regressione permanente, senza modifiche al codice di produzione.

**Forme d'input enumerate per `richiedenteNome`/`istituzioneSanitaria` in `crea-lavoro.ts`:**
valorizzata-e-trimmata (✓ coperta), vuota (✓ coperta), solo-spazi (✓ coperta) — tipo sbagliato non
applicabile (firma TypeScript `string`, non opzionale: un `undefined` non compila, coerente con la
scelta "mai un valore di riposo diverso da stringa vuota", v. §7 sotto).

**Test nuovi, per file:**
- `tests/unit/ChiHaPrescrittoSheet.test.tsx` — **nuovo file**, 12 test (titolo dialog, righe medico,
  sottotitolo plurale/singolare, prova NEGATIVA "nessuna riga afferma di essere l'ultimo prescrittore",
  tap→onScelto, Chiudi→onChiudi senza onScelto, «È un altro» apre/valida/POST-ok/POST-fail, reset via
  remount).
- `tests/unit/WizardNuovoLavoro.test.tsx` — 10 test nuovi (dottore singolo zero-rete, foglio con più
  medici, studio-di-uno-solo si comporta da dottore singolo, scelta→payload+«Prescritto da», scelta
  poi Esc in coda non sovrascrive, riapertura del foglio nella stessa sessione, chiudi senza
  scegliere→avanza comunque senza campi, «È un altro»→collega+prescrittore, persistenza
  Riprendi→avanzamento→salvaStato, Riprendi da salvataggio SENZA le due chiavi non esplode).
- `tests/unit/crea-lavoro.test.ts` — 3 test nuovi (entrambi valorizzati, entrambi vuoti→chiavi
  omesse, solo-spazi→chiavi omesse) + 24 call-site esistenti aggiornati (nuovi campi obbligatori
  nella firma).
- `tests/unit/crea-lavoro-denti.test.ts` / `crea-lavoro-prescrizione.test.ts` — 1 call-site ciascuno
  aggiornato (stesso motivo).
- `tests/unit/wizard-persistenza.test.ts` — 2 test nuovi (roundtrip coi due campi, salvataggio
  pre-Task-10 senza le due chiavi resta leggibile con chiavi assenti).
- `tests/unit/dati-wizard.test.ts` — 1 test nuovo (`studioNome` passthrough grezzo) + 1 test esistente
  corretto (`toEqual` esatto sull'array, mancava il campo nuovo).
- `tests/unit/NuovoDentistaSheet.test.tsx` — 0 test nuovi, 2 asserzioni esistenti estese
  (`onCreato` ora porta anche `studioNome`).

---

## 6. Rilievi FUORI mandato (R-E2 — riferiti, non corretti)

1. **La fragilità nota di `studio-members` (confronto case-sensitive su `studio_nome`)** — consumata
   com'è, per istruzione esplicita del contesto. Non toccata.
2. **«Proposta dell'ultimo prescrittore»** — non implementabile senza una via server nuova (nessun
   endpoint oggi espone l'ultimo `richiedente_nome` per cliente). Il default cade sul primo membro
   restituito da `studio-members` (ordine `cognome` ascendente, deciso dalla rotta), SENZA
   evidenziarlo come "proposto" (v. §3.1) — un'evidenza senza il dato sarebbe la bugia che l'ondata
   esiste per chiudere.
3. **«È un altro» crea ulteriori righe `clienti`** che condividono lo stesso `studio_nome` — e quindi
   diventano tile AGGIUNTIVI del Passo 1, tutti con la STESSA label (`aggregaDatiWizard` non deduplica
   per `studio_nome`, mappa un tile per riga cliente). Questa feature **fa crescere** un difetto
   preesistente (tile duplicati per studio multi-medico) invece di introdurlo — segnalato, non
   corretto: `dati-wizard.ts`/`PassoDentista.tsx` non hanno mandato di deduplicare in questo task.
4. **Divergenza di formato con `TabDati.tsx`** — v. §4: due superfici scrivono `richiedente_nome` con
   convenzioni diverse (nome pieno qui, abbreviato là). Nessuna delle due è "sbagliata" isolatamente;
   la coerenza fra le due è un lavoro a parte.
5. **Il back del telefono/Esc/scrim sul foglio ora fa AVANZARE il wizard** (skip = "come oggi",
   contesto del brief punto 7) — sfiora la direttiva permanente "back = pagina precedente" (`../CLAUDE.md`
   §9): qui il "back" del foglio non torna indietro, salta la domanda e prosegue. È la lettura piana
   del brief («chiudi = nessun prescrittore, come oggi»), non un'interpretazione libera — ma la
   conseguenza va dichiarata, non taciuta: oggi non c'è modo di distinguere "Esc/scrim" da "il tasto
   Chiudi" per dare loro comportamenti diversi senza toccare `Sheet.tsx` (fuori mandato).
6. **Nessuna verifica visiva a browser (Playwright 3 viewport × 2 temi)** — il brief chiedeva
   esplicitamente solo `vitest` + `tsc`; non eseguita. Dichiarato perché non sparisca in silenzio
   (§9b della roadmap la richiede prima del merge dell'ondata, non di questo singolo task).

---

## 12. FIX-REVIEW (5 agosto 2026, notte — `provato:` `date` → `Wed Aug 5 02:31:23 CEST 2026`)

Il coordinatore ha adjudicato 1 CRITICAL + 3 IMPORTANT + 1 MINOR sulla prima consegna di questo
task. Tutti e cinque chiusi in questa sessione, stesso ramo, nessun commit intermedio.

### CRITICAL 1 — il foglio non poteva MAI offrire il medico appena toccato

**Il difetto:** `GET /api/clienti/[id]/studio-members` esclude per costruzione il cliente il cui
tile è stato tappato (`.neq('id', id)`, route.ts:50). Con due colleghi, chi toccava la riga di
Marta Bianchi vedeva solo Colombo — l'unica via per scegliere Marta come prescrittore era «È un
altro», che ne creava una riga `clienti` DUPLICATA.

**Fix:** `dati-wizard.ts` ora seleziona anche `nome` (mancava — il commento in testa al file lo
dichiarava esplicitamente) e lo porta fino a `DentistaWizard.nome`/`.cognome` (opzionali nel tipo,
valorizzati sempre da `aggregaDatiWizard`, stesso principio di `studioNome`). Il passthrough
attraversa `PassoDentista.onScegli` e `NuovoDentistaSheet.onCreato` fino a
`WizardNuovoLavoro.caricaStudioEApri`, che ANTEPONE il cliente toccato a `medici` (`[toccato,
...altri]`) prima di aprire il foglio — «Cognome Nome», stessa forma delle righe che arrivano da
`studio-members`, coerente col ripiego DdC (`generate-ddc.ts:146`).

**1b, stessa causa:** il sottotitolo del foglio conta `medici.length` — con `altri` soltanto,
sottostimava sempre di uno. Il fix di CRITICAL 1 lo corregge di riflesso (nessun secondo tocco a
`ChiHaPrescrittoSheet.tsx`): con toccato anteposto, `medici.length` è il totale vero.

### IMPORTANT 2 — istituzione_sanitaria scartata quando era NOTA

**Il difetto, due punti:** (a) `WizardNuovoLavoro.caricaStudioEApri`, ramo "zero colleghi" (studio
"di uno solo"): `cliente.studioNome` era in mano ma non arrivava mai a `caricaStudioEApri` (il
chiamante passava solo `{id, label}`); (b) `chiudiSheetPrescrittore` (chiudi senza scegliere):
`mediciPendenti[0].studio_nome` era in memoria (il primo elemento, dopo CRITICAL 1, è SEMPRE il
cliente toccato) ma non veniva letto.

**Fix:** in (a), `caricaStudioEApri` ora riceve anche `studioNome` (stesso allargamento di
CRITICAL 1) e lo passa come istituzione anche quando il foglio non apre. In (b),
`chiudiSheetPrescrittore` legge `mediciPendenti[0]?.studio_nome ?? ''`. In entrambi i casi
`richiedente_nome` resta '' (nessuna persona indicata) — SOLO l'istituzione parte, per D206
("l'istituzione è vera anche senza una persona scelta"). Il dottore singolo (nessuno studio)
resta invariato: entrambi i campi restano ''.

### IMPORTANT 3 — le righe medico sparivano in dark

**Il difetto:** `stileMedico` usa `background: var(--card)` + `boxShadow: var(--sh-press)`; in
dark `--sh-press` risolve a `none` (spec §3.2), e il pannello dello sheet è ANCH'ESSO `--card` —
la riga diventava indistinguibile dallo sfondo (restava solo il testo). Stesso difetto già chiuso
al gate L2 (22/07/2026) per `.ds-chip-scelta`/`.ds-tasto-tondo`, mai esteso a questo file nuovo.

**Fix:** stesso rimedio ratificato, stessa forma di regola. Classe-aggancio `ds-medico-riga` sul
bottone; in `ds-v3.css`, `[data-theme="dark"] [data-ds="v3"] .ds-sheet .ds-medico-riga { --card:
var(--elv); --sh-press: inset 0 1px 0 rgba(255,255,255,.06); }` — le variabili si rimappano, gli
style inline del componente restano intatti e risolvono i nuovi valori SOLO in questo contesto.

### IMPORTANT 5 — la fixture del percorso felice mostrava una risposta impossibile

**Il difetto:** `MEDICI` (mock di `studio-members`) includeva Bianchi Marta fra i "colleghi
trovati" per il tile "Studio Bianchi" — la SUA stessa riga. La rotta vera non può mai produrre
questa risposta (`.neq('id', id)`). È il meccanismo che ha lasciato passare CRITICAL 1: il test
del percorso felice non stava esercitando un percorso che il server può davvero produrre.

**Fix:** `MEDICI` ora contiene solo i COLLEGHI di Bianchi Marta (Colombo, Ferri) — commento nella
fixture che spiega perché, con riferimento esplicito a `.neq('id', id)`, route.ts:50.

### MINOR 7 — «È un altro» era una porta a senso unico

**Fix:** `LinkQuieto` «Torna all'elenco» accanto ad «Aggiungi allo studio» — `tornaAllElenco()`
azzera solo `vincolo` (un errore mostrato non deve ricomparire stantio) e torna alla lista;
nome/cognome digitati restano (nessuna ragione di buttarli se si riapre «È un altro» una seconda
volta).

### NON toccato (per istruzione esplicita)

- Il back del telefono/Esc/scrim sul foglio che fa avanzare il wizard invece di tornare indietro —
  R-E2 confermato, resta a registro (§6.5).
- Il feedback durante la `GET /studio-members` (nessuno spinner/stato di attesa sul tile mentre la
  chiamata è in volo) — minor a registro.

### Rilievo NUOVO trovato in questo giro (R-E2 — riferito, non corretto)

**Le righe medico di `ChiHaPrescrittoSheet.tsx` non portano l'anello focus-visible di legge**
(constraint 9, lo stesso pattern `:focus-visible { outline: 2px solid var(--blue) }` che
`TileScelta.tsx`/`RigaAgenda.tsx` portano con sé). Toccando comunque il file per IMPORTANT 3, si
sarebbe potuto aggiungere a costo marginale — non l'ho fatto: è fuori dai cinque punti adjudicati,
e R-E2 vieta la correzione silenziosa di un difetto fuori mandato. Segnalato qui per il prossimo
giro.

### TDD (R-P4) — 5 mutazioni sul codice vero, ognuna misurata due volte

| # | Mutazione | Misura 1 | Misura 2 | Identico? |
|---|-----------|----------|----------|-----------|
| CRITICAL 1 | `setMediciPendenti([toccato,...altri])` → `setMediciPendenti(altri)` | 6 falliti su 43 | 6 falliti su 43 | ✓ |
| IMPORTANT 2a | `caricaStudioEApri` (zero colleghi): `cliente.studioNome` → `''` | 1 fallito su 43 | 1 fallito su 43 | ✓ |
| IMPORTANT 2b | `chiudiSheetPrescrittore`: `mediciPendenti[0]?.studio_nome ?? ''` → `''` | 1 fallito su 43 | 1 fallito su 43 | ✓ |
| IMPORTANT 3 | rimossa `className="ds-medico-riga"` | 1 fallito su 14 | 1 fallito su 14 | ✓ |
| MINOR 7 | testo del link «Torna all'elenco» alterato | 1 fallito su 14 | 1 fallito su 14 | ✓ |

Ogni mutazione ripristinata via `cp` dal backup in scratchpad e riverificata (`diff` vuoto contro
l'originale) prima della mutazione successiva — mai due mutazioni sovrapposte nello stesso file.

**Test nuovi per file:**
- `tests/unit/WizardNuovoLavoro.test.tsx` — 3 nuovi (ordine "toccato prima", conteggio 1b,
  istituzione nota su studio-di-uno-solo) + 3 test esistenti aggiornati (contenuto MEDICI, «Chiudi
  senza scegliere» ora attende istituzione presente, «riapertura» verifica anche il toccato).
- `tests/unit/ChiHaPrescrittoSheet.test.tsx` — 2 nuovi (Torna all'elenco, classe-aggancio dark).
- `tests/unit/dati-wizard.test.ts` — 1 nuovo (passthrough nome/cognome) + fixture `clienti`/
  `soloClienti`/`clientiData` estese con `nome` (censimento R-P6: `RawCliente.nome` è ora
  obbligatorio nel tipo, ogni fixture della suite doveva portarlo) + 1 `toEqual` esatto corretto.
- `tests/unit/NuovoDentistaSheet.test.tsx` — 2 asserzioni esistenti estese (`onCreato` porta anche
  `nome`/`cognome`).

### Verifica finale

```
npx tsc --noEmit                                                          → 0 errori
npx vitest run <9 file toccati/coinvolti>                                 → 223/223 passati
npx vitest run (suite intera)                                             → 4854/4873 passati, 19 skip, 0 falliti
```

### File toccati (fix-review, in aggiunta a quelli del §9)

- `src/lib/wizard/dati-wizard.ts` — `nome` nella select; `RawCliente.nome` obbligatorio;
  `DentistaWizard.nome`/`.cognome` opzionali, valorizzati sempre.
- `src/components/features/wizard/PassoDentista.tsx` — `onScegli` porta anche `nome`/`cognome`.
- `src/components/features/wizard/NuovoDentistaSheet.tsx` — `onCreato` porta anche `nome`/`cognome`.
- `src/components/features/wizard/WizardNuovoLavoro.tsx` — `caricaStudioEApri` antepone il
  toccato; `sceltaDentista`/`dentistaCreato`/`CorpoWizard`/`RenderPasso` allargati; istituzione
  nota parte nei due rami "senza scelta".
- `src/components/features/wizard/ChiHaPrescrittoSheet.tsx` — classe `ds-medico-riga`; «Torna
  all'elenco»; commento di testa aggiornato (il cliente toccato ora arriva anteposto).
- `src/app/ds-v3.css` — regola dark per `.ds-sheet .ds-medico-riga` (stesso rimedio del gate L2).
- Test: `WizardNuovoLavoro.test.tsx`, `ChiHaPrescrittoSheet.test.tsx`, `dati-wizard.test.ts`,
  `NuovoDentistaSheet.test.tsx`.

### Commit

Ramo `ondata-b-sessione-3`, nessun worktree. `b983870e` — `fix(wizard): il foglio offre il medico
toccato — anteposto dal client, conteggio vero, istituzione quando è nota, righe visibili in dark`
+ corpo in italiano + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Pre-commit
verde (eslint `--max-warnings=0`, guardie DS/CSRF/coerenza/salvataggio automatico).

---

## 7. Decisioni di design non dettate dal brief, dichiarate

- **`richiedenteNome`/`istituzioneSanitaria` su `StatoWizard`: stringhe sempre, mai opzionali** —
  stesso pattern di `pz`/`alias`/`elemento`/`colore`, diverso da `coloreOrigine` (che HA un valore di
  riposo diverso da "vuoto": `'prescrizione'`). Qui "vuoto" È il valore di riposo, quindi niente
  opzionalità nel tipo runtime — SOLO in `StatoSalvato` (persistenza), dove l'opzionalità copre i
  salvataggi vecchi, non uno stato semantico.
- **`istituzione_sanitaria` letta da `medici[0].studio_nome`** (il valore grezzo della RIGA DB
  restituita da `studio-members`), mai da `cliente.label` — anche se sono la stessa stringa per
  costruzione quando il gate è vero, la label è un valore DERIVATO che potrebbe un giorno guadagnare
  una decorazione (es. un badge) e disallinearsi in silenzio da ciò che va sulla Dichiarazione.
- **`ChiHaPrescrittoSheet` non fa mai rete per il proprio `medici`**: arriva già caricato dal
  chiamante. La decisione "apro il foglio?" richiede il risultato della `GET` PRIMA di montare il
  foglio (v. §2) — spostare quella `GET` dentro il componente stesso avrebbe richiesto aprirlo sempre
  e poi richiuderlo se vuoto, un lampo visibile che il gate a monte evita.

---

## 8. Verifica finale

```
npx tsc --noEmit                                                          → 0 errori
npx vitest run <9 file toccati>                                           → 217/217 passati
npx vitest run (suite intera)                                             → 4848/4867 passati, 19 skip, 0 falliti
```

---

## 9. File toccati

- `src/components/features/wizard/ChiHaPrescrittoSheet.tsx` — **nuovo file**, il mini-foglio.
- `src/components/features/wizard/WizardNuovoLavoro.tsx` — `StatoWizard`/`STATO_INIZIALE` (+2 campi);
  stato del foglio (`clientePendente`/`mediciPendenti`/`sheetPrescrittoreAperto`/`chiavePrescrittore`);
  `avanzaConCliente`/`caricaStudioEApri`/`sceltaDentista`/`scelgoPrescrittore`/`chiudiSheetPrescrittore`
  (sostituiscono il vecchio `sceltaDentista` sincrono); `salvaStato`/`riprendi` (+2 chiavi, `?? ''` su
  `riprendi`); `StatoFatto`/`continuaPaziente`/render `FrameFatto` (`richiedenteNome` ora passata,
  chiuso il 🚧 T3); render `<ChiHaPrescrittoSheet>`; tipi `CorpoWizard`/`RenderPasso` allargati con
  `studioNome`.
- `src/components/features/wizard/PassoDentista.tsx` — `onScegli` porta anche `studioNome`.
- `src/components/features/wizard/NuovoDentistaSheet.tsx` — `onCreato` porta anche `studioNome`
  (passthrough grezzo dalla risposta server).
- `src/lib/wizard/dati-wizard.ts` — `DentistaWizard.studioNome` (opzionale nel tipo), valorizzato
  sempre da `aggregaDatiWizard`.
- `src/lib/wizard/crea-lavoro.ts` — `creaLavoroDaWizard` accetta `richiedenteNome`/
  `istituzioneSanitaria` (stringhe obbligatorie); corpo del POST le include SOLO trimmate e non vuote.
- `src/lib/wizard/persistenza.ts` — `StatoSalvato.richiedenteNome`/`istituzioneSanitaria` (opzionali,
  `v: 1` invariato).
- Test: `tests/unit/ChiHaPrescrittoSheet.test.tsx` (nuovo), `WizardNuovoLavoro.test.tsx`,
  `crea-lavoro.test.ts`, `crea-lavoro-denti.test.ts`, `crea-lavoro-prescrizione.test.ts`,
  `wizard-persistenza.test.ts`, `dati-wizard.test.ts`, `NuovoDentistaSheet.test.tsx`.

---

## 10. Self-review

- Gate verificato con mutation test reale sul codice vero (non solo lettura), v. §5.
- Nessuna riga afferma un dato che non possediamo (§3) — prova negativa esplicita in
  `ChiHaPrescrittoSheet.test.tsx`.
- `richiedente_nome`/`istituzione_sanitaria` MAI inviate come stringa vuota (verificato contro
  l'operatore `??` reale di `generate-ddc.ts:146`, non assunto) — mutation test lo conferma.
- Zero rete in più per il caso comune (dottore singolo): verificato con `expect(fetch).not.toHaveBeenCalled()`.
- Nessun file del server (`route.ts`) toccato — vincolo esplicito del contesto, rispettato.
- Tutti i punti dove il brief lasciava una scelta aperta sono dichiarati in §3/§4/§7, non decisi in
  silenzio.

---

## 11. Commit

Ramo `ondata-b-sessione-3`, nessun worktree. Un commit, `2a9cbcdd` —
`feat(wizard): il mini-foglio «Chi ha prescritto?» — P37 arriva dal Passo 1` + corpo in italiano +
trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Pre-commit verde (eslint
`--max-warnings=0`, guardia DS compliance, guardia CSRF, guardia coerenza documenti, guardia
salvataggio automatico).

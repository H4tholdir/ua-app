# Referto — «Il documento dice tutto il dovuto»: la voce 6, il luogo di fabbricazione, il cancello che mentiva

**Compito:** `intervento-task-doc-1` · **Decisione:** D295
**Ramo:** `intervento-post-consegna` · **Salvataggio:** `23cdadc4` — `fix(mdr): la voce 6 e il luogo di fabbricazione entrano nella dichiarazione (D295)`
**Data:** 07/08/2026 (`provato:` `date` → `Fri Aug  7 10:13:38 CEST 2026`)
**Nessun `git push`. Nessun worktree. Nessuna migration.**

---

## 0. In una tabella

| cosa | esito |
|---|---|
| **A** — voce 6 collegata a `lavori_prescrizioni` | fatto, e il filo mancava in **tre** punti, non uno |
| **B** — `luogo_fabbricazione` stampato | fatto — e il valore era un `DEFAULT` mai scritto |
| **C** — elenco del controllo riscritto sulla numerazione vera | fatto, **senza togliere nessun cancello** |
| Conteggio R-P4 | **24 asserzioni accese su 107** con l'abbozzo inerte |
| FASE 7 | `tsc` 0 errori · `vitest` **5327** passati · `next build` compilato |
| File toccati | 12 (10 modificati, 2 nuovi), 778 righe aggiunte |
| Ritrovamenti fuori mandato | **6**, riferiti e **non** corretti |

---

## 1. Le letture (R-P2)

Ogni percorso col suo esito. L'elenco **non** l'ho deciso io: è nato dal censimento
(«chi legge questo dato?», «chi lo scrive?»), non dai file che il brief nominava.

| file | esito |
|---|---|
| `src/lib/pdf/generate-ddc.ts` | **letto: righe 1-241 (intero)** |
| `src/lib/consegna/precheck.ts` | **letto: righe 1-114 (intero)** |
| `src/lib/domain/prescrizione-mapper.ts` | **letto: righe 1-292 (intero)** |
| `src/lib/domain/prescrizione-costanti.ts` | **letto: righe 1-93 (intero)** |
| `src/lib/prescrizione/componi-snapshot.ts` | **letto: righe 1-52 (intero)** |
| `src/types/domain.ts` | **letto: righe 420-545, 700-805** |
| `src/components/features/pdf/DdcTemplate.tsx` | **letto: righe 255-474** |
| `src/lib/consegna/orchestrate.ts` | **letto: righe 1-12, 180-290** |
| `src/app/api/lavori/[id]/precheck-consegna/route.ts` | **letto: righe 1-73 (intero)** |
| `src/components/features/wizard/FrameFatto.tsx` | **letto: righe 85-225** (qui viveva la funzione di casa) |
| `src/components/features/lavori/scheda-v3/RigaLavoroDenti.tsx` | **letto: righe 1-128 (intero)** |
| `src/lib/lavori/colore-riga-scheda.ts` | **letto: righe 1-172 (intero)** |
| `src/components/features/lavori/consegna-v3/FlussoConsegna.tsx` | **letto: righe 30-60, 85-200** |
| `src/components/ds/RigaBloccante.tsx` | **letto: righe 1-60** |
| `src/hooks/useLavoroForm.ts` | **letto: righe 1-210** |
| `supabase/schema.sql` | **letto: righe 1190-1290** (tabella `dichiarazioni_conformita`) |
| `supabase/migrations/20260804154232_…ddc_chiusura_update.sql` | **letto: intero** |
| `src/types/database.types.ts` | **letto: righe 890-960** (Row di `dichiarazioni_conformita`) |
| `tests/unit/generate-ddc.test.ts` | **letto: righe 1-120, 180-260, fondo** |
| `tests/unit/precheck.test.ts` | **letto: righe 1-180, fondo** |
| `tests/unit/ddc-pdf-content.test.ts` | **letto: righe 1-150** |
| `supabase/migrations/20260804150306_…lavori_prescrizioni.sql` | **NON letto** — la forma della tabella è arrivata dal mapper (che la cita riga per riga) e dai tipi generati, entrambi verificati contro `database.types.ts` |

---

## 2. A — La voce 6: **il filo mancava in tre punti, non in uno**

Il brief indicava un difetto: `generate-ddc.ts:166` cablato a `null`. Cercandolo, ne sono
emersi **tre in fila**, e correggerne uno solo non avrebbe cambiato niente sul foglio.

1. **`generate-ddc.ts:166`** — `prescrizione_caratteristiche: null as string | null`, cablato.
2. **`orchestrate.ts:187-195`** — la query della consegna **non chiedeva l'embed**
   `prescrizione:lavori_prescrizioni(*)`. Anche togliendo il cablaggio, `lavoro.prescrizione`
   sarebbe rimasto `undefined`: la correzione sarebbe stata *invisibile e verde*.
3. **`precheck-consegna/route.ts:45-51`** — stessa query, stessa mancanza. Il commento di
   testa promette «*stesso precheck del POST, divergenza impossibile per costruzione*»: vero
   per la funzione, **falso per l'ingresso**, che è ciò che conta.

Aggiunta anche la normalizzazione (`normalizzaPrescrizione`) subito dopo il caricamento in
entrambi: l'embed arriva come **array** (FK composita → `isOneToOne: false`), quindi passarlo
grezzo darebbe `contenuto` sempre `undefined` — di nuovo il difetto, travestito da correzione.

### La frase: quale funzione di casa ho riusato

Il brief chiedeva di **non scriverne una seconda che diverge**. Ho cercato per comportamento,
non per nome, e ho trovato **tre** candidate:

- `derivaRigaColore` (`colore-riga-scheda.ts`) — è la riga «Colore» della scheda; vuole
  `denti`/`caso`/`congelata` e restituisce uno stato di UI. **Non riusabile** per un testo.
- `labelDenti` (`RigaLavoroDenti.tsx:23-29`) — **non è la funzione giusta**: rende
  `denti_coinvolti`, cioè i denti **eseguiti**, non i **prescritti**, e porta una coda di
  interfaccia («*— apri l'odontogramma*»).
- ✅ **`etichettaDenti`** (`FrameFatto.tsx:182-184`) — **questa**. È la funzione che rende la
  carta «**La prescrizione**» del wizard (`FrameFatto.tsx:394-407`), cioè **proprio il
  contenuto di `lavori_prescrizioni` mostrato all'utente**, e prende già un `number[]`, la
  forma esatta di `contenuto.elementi`. Il suo commento dice perché esiste: «*mai «1
  elementi». Il singolare e il plurale sono la differenza fra una frase scritta da una persona
  e una scritta da un programma.*»

**L'ho spostata**, non ricopiata: da oggi vive in `src/lib/prescrizione/caratteristiche-prescritte.ts`
e `FrameFatto` la importa da lì. Due copie divergerebbero alla prima revisione — e quel giorno
la schermata dell'addetta e la carta legale direbbero due cose diverse sugli stessi denti,
senza che nessuna delle due sembri sbagliata.

**La composizione** usa il vocabolario che l'utente **vede già** in quella carta: le due righe
`Elementi` e `Colore`, unite dal punto mediano.

### 🔴 La frase esatta che finisce sul documento

Laboratorio **vero** (banco di prova), lavoro **vero** (`TEST-DdC-001`), render locale in sola
lettura — nessuna consegna, nessun progressivo bruciato, nessun caricamento:

```
PRIMA   ▸ Indirizzo: via Tempone Siepe Grande snc
        ▸ Luogo di fabbricazione: Italia
        ▸ Luogo emissione: Serre
        (nessuna riga «Caratteristiche prescritte» — non compariva affatto)

DOPO    ▸ Indirizzo: via Tempone Siepe Grande snc
        ▸ Luogo di fabbricazione: via Tempone Siepe Grande snc, Serre
        ▸ Luogo emissione: Serre
        ▸ Caratteristiche prescritte: Elementi: denti 21, 37, 38 · Colore: A3
```

⚠️ **Limite dichiarato, e non è piccolo:** `lavori_prescrizioni` è **VUOTA** nel banco di prova
— **0 righe contro 299 lavori** (misurato in sola lettura; la lettura funziona, non è un
problema di permessi: `dichiarazioni_conformita` risponde 6 e `lavori_denti` 3). Nessun lavoro
reale ha oggi una prescrizione trascritta. Il `contenuto` della prova è quindi **sintetico**,
nella forma esatta che `componiSnapshot` produce; **laboratorio, lavoro, indirizzo e render
del PDF sono reali**. È un limite del dato, non della correzione.

---

## 3. Come distinguo «nessuna prescrizione» da «prescrizione presente ma vuota»

I due vuoti **non sono lo stesso vuoto**, e la distinzione vive in due posti diversi apposta:

- **Sul documento** (`caratteristichePrescritte`) i due casi danno lo **stesso** risultato:
  campo vuoto. Ed è giusto — su una carta un vuoto è un vuoto, e scriverci «nessuna
  caratteristica» significherebbe affermare che il medico non ne ha indicate, cosa che il
  laboratorio **non sa**.
- **Prima di emettere** (`precheckMDR`) i due casi si separano, perché lì si può ancora
  rimediare. Il discriminante è **l'esistenza della riga**, non il suo contenuto:
  - `lavoro.prescrizione` **assente** → nessun avviso. La voce 6 dice «indicate **nella
    prescrizione**»: senza prescrizione non c'è nulla da riportare, e il campo resta vuoto
    **per diritto**. Avvisare qui griderebbe su ogni lavoro nato senza foglio del dentista —
    e un avviso che grida sempre è un avviso che nessuno legge più.
  - riga **presente** e `caratteristichePrescritte(...) === null` → **avviso**. È il difetto di
    oggi che si ripresenta. Copre anche il caso della riga legittima col **solo numero di
    prescrizione** (`componiSnapshot`, M-T3-3), che è proprio quello in cui la voce 6 esce
    vuota senza che nessuno se ne accorga.

⚠️ **Limite dichiarato:** se un chiamante non chiede l'embed, il controllo **tace**. Tace nella
direzione sicura (nessun falso allarme), ma tace anche su un lavoro che una prescrizione ce
l'ha. I due chiamanti veri ora l'embed lo chiedono entrambi.

---

## 4. B — Il luogo di fabbricazione: **da dove arrivava e cosa conteneva**

**Da nessuna parte.** `luogo_fabbricazione` esiste solo su `dichiarazioni_conformita`
(`supabase/schema.sql:1251`, `TEXT NOT NULL DEFAULT 'Italia'`), **nessuna riga di codice l'ha
mai scritta**, e il modello **non la stampava affatto**. Quindi:

> 🔴 **Ogni dichiarazione in archivio porta il letterale «Italia»** — che è un **paese**, non un
> indirizzo — mentre la voce 1 chiede «*il nome e **l'indirizzo** del fabbricante e di tutti i
> luoghi di fabbricazione*». È un **valore di comodo**, esattamente come il brief sospettava.

**Decisione presa da solo, e dichiarata:** per un laboratorio a **sede unica** — il caso di ogni
laboratorio che questa PWA serve oggi — il luogo di fabbricazione **coincide con l'indirizzo del
fabbricante**. Compongo `indirizzo, città` (con `trim`, perché una stringa di soli spazi supera
il `NOT NULL` ma non è un indirizzo per una persona) e ripiego su `'Italia'` quando entrambi
mancano: è il valore che quella colonna ha sempre avuto, quindi non peggiora nulla e non finge.

⚠️ **Il §1 mostra ora la stessa stringa sotto due etichette** (`Indirizzo:` e `Luogo di
fabbricazione:`). È **corretto**, non un doppione: la voce 1 chiede entrambe le informazioni, e
chi ispeziona deve poter **leggere** che coincidono invece di doverlo dedurre. L'ho scritto nel
codice perché non lo si scopra in revisione.

🛑 **Non confuso con `luogo_emissione`** (`lab.citta`), che resta dov'è: quello è dove il
documento è stato firmato.

---

## 5. C — Il cancello che mentiva

**Cosa ho cambiato:**

- **Il commento**, riscritto sull'Allegato XIII vero: le otto voci una per una, con **dove
  ognuna è garantita**. Ci sono anche le due che non hanno controllo e perché: la **2**
  (mandatario) **non è applicabile** a un fabbricante italiano che fabbrica in Italia (serve
  all'extra-UE, Art. 11) — l'assenza è la risposta giusta, non un buco; e le condizionali
  («*se del caso*») sono marcate come tali, perché pretenderle sempre è sbagliato quanto
  ignorarle.
- **La numerazione**, sui numeri veri: prescrittore **3 → 5**, dispositivo **5 → 3**, paziente
  **4** (l'unico già giusto).
- **`domain.ts`**, dove il commento diceva `// 1-8 (Allegato XIII MDR)` su una numerazione che
  l'Allegato non ha: tipo allargato a **`number | null`**, dove `null` dice onestamente
  «controllo d'integrità, non voce dell'Allegato».
- **Un avviso NON bloccante** per «prescrizione presente ma caratteristiche vuote», in un campo
  nuovo `avvisi?: string[]`.
- **Una rete** (`tests/unit/precheck.test.ts`) che fallisce se un numero fuori 1-8 rientra.

**Cosa ho lasciato stare, deliberatamente:**

- 🛑 **I due controlli non-voce restano, e restano bloccanti.** `classe_rischio` e
  `data_consegna_prevista` non sono voci dell'Allegato — ma `classe_rischio` è **`NOT NULL` su
  `dichiarazioni_conformita`** (`schema.sql:1231`): senza di lei l'emissione fallisce con un
  errore illeggibile. **Togliere un cancello perché il suo cartello era sbagliato sarebbe il
  contrario del rimedio**, ed «aggiungere» era il mandato, non «togliere».
- 🛑 **Non ho reso bloccante niente di nuovo.** L'avviso vive nel canale morbido e **non tocca
  `ok`**. Verificato che non aggiunge nemmeno un passaggio: il foglio di conferma in cui
  finisce **compare già oggi** a ogni consegna consegnabile (`FlussoConsegna.tsx:97` —
  `if (pre.consegnabile) setStato({ fase: 'dialog', warnings })`, incondizionato). Si aggiunge
  una riga a un foglio che c'era.
- **Perché un campo nuovo e non `mdr_campi_mancanti`:** quella lista porta **nomi di campo** e
  la rotta li completa con «*non registrato all'accettazione*»
  (`precheck-consegna/route.ts:62`). Infilarci l'avviso avrebbe prodotto una frase **falsa**.

### 📌 Proposta a Francesco (**non** eseguita)

L'avviso oggi **non blocca**. Se un lavoro nasce da una prescrizione digitale e le
caratteristiche prescritte restano vuote, il documento esce **legalmente incompleto** sulla voce
6. Renderlo bloccante è un cancello nuovo sulla consegna: **decisione tua**, la propongo qui e
non l'ho presa.

---

## 6. Il salto di versione: `ddc-v1` → **`ddc-v2`**

**Non era opzionale, ed è la cosa che ho quasi mancato.** Il registro accanto alla costante
(`generate-ddc.ts:34-55`) riserva il salto «*al primo cambiamento di sostanza — un contenuto
dell'Allegato XIII che entra, esce o cambia significato*» e **nomina fra i candidati proprio
«il luogo di fabbricazione mancante»**. Qui ne entrano **due**. Restare su `ddc-v1` avrebbe
significato due documenti che dicono cose diverse sotto la stessa etichetta — cioè svuotare
l'unica colonna che fra dieci anni permette di rileggere una dichiarazione sapendo come andava
letta. Registro aggiornato con la voce `ddc-v2` e le due voci che entrano.

⚠️ **Una prova esistente pretendeva `ddc-v1`** (`generate-ddc.test.ts:231`, «*il salto è
riservato a un cambiamento di SOSTANZA*»). L'ho cambiata **perché la sua premessa è decaduta**,
non perché desse fastidio, e nel test c'è scritto il perché.

📌 `payload_sha256` cambia per i **nuovi** documenti (due chiavi in più nell'impronta): è
corretto — dati diversi, impronta diversa. Le righe in archivio non sono toccate.

---

## 7. TDD — il conteggio R-P4

**Verificato due volte** (esecuzione con reporter JSON, conteggio riletto):

| file | abbozzo inerte | dopo |
|---|---|---|
| `caratteristiche-prescritte.test.ts` | **9** falliti su 13 | 0 su 13 |
| `precheck.test.ts` | **8** falliti su 15 | 0 su 15 |
| `generate-ddc.test.ts` | **6** falliti su 34 | 0 su **35** |
| `ddc-pdf-content.test.ts` | **1** fallito su 45 | 0 su 45 |
| **TOTALE** | **24 su 107** | **0 su 108** |

*(108 e non 107: la prova di giuntura del §7-bis è stata aggiunta **dopo** il conteggio.)*

### 🔴 Cosa mi ha insegnato quell'«1 su 45»

Delle mie quattro prove sul PDF, **tre erano già verdi con l'abbozzo inerte**. Non è un difetto
delle prove: è **la diagnosi del difetto originale**. Il modello sapeva già stampare la voce 6
(`DdcTemplate.tsx:442-447`) e bastava passargli il valore a mano perché tutto funzionasse. Era
il **generatore** a non passarglielo mai. **Due metà giuste e nessuno che provasse la
giuntura** — ed è esattamente lì che il difetto è vissuto per mesi.

Ho quindi aggiunto una prova che **parte da un lavoro e finisce sul testo del PDF**, rendendo
l'oggetto che il generatore ha **davvero** scritto (catturato dall'insert), non una fixture a
mano. La giuntura ora è dentro la prova, non fuori.

### Le forme d'ingresso enumerate (prima delle asserzioni)

| forma | coperta |
|---|---|
| lavoro **senza** prescrizione | ✅ |
| prescrizione presente, `contenuto` **vuoto** | ✅ |
| **solo colore** | ✅ |
| **solo elementi** | ✅ (con singolare **e** plurale) |
| **entrambi** | ✅ |
| `elementi: []` (chiave presente, array vuoto) | ✅ |
| `colore: ''` (stringa vuota) | ✅ |
| colore **come digitato** (`'a3,5 '`, D210) | ✅ |
| `tipo` presente (deve **non** entrare) | ✅ |
| ordine degli elementi non riordinato | ✅ |
| `luogo_fabbricazione` **vuoto** / **soli spazi** / **solo città** | ✅ |
| `contenuto` **malformato** (elementi non-numerici, colore non-stringa) | ⚠️ **coperta a monte, NON qui — e il buco residuo va detto.** Sulla strada vera la scarta `normalizzaPrescrizione` prima di arrivarmi, ed è **già provata** in `prescrizione-mapper.test.ts`; duplicarla creerebbe una seconda verità sulla stessa regola. 🛑 **Ma `caratteristichePrescritte` e `precheckMDR` sono funzioni pubbliche e pure:** chi le chiamasse con una riga grezza (una prova, un chiamante futuro) salterebbe quel filtro. Le guardie a runtime nel mio modulo (`Array.isArray`, `typeof`) esistono **apposta** per quel caso — **ma nessuna prova le accende**. Guardie presenti, rete assente: è un buco piccolo e dichiarato, non un buco chiuso. |
| più luoghi di fabbricazione | ❌ **non rappresentabile** — v. ritrovamento ⑤ |

---

## 8. FASE 7 — output reale

```
═══ 1/3 npx tsc --noEmit ═══
ESITO tsc: 0            (nessun errore stampato)

═══ 2/3 npx vitest run ═══
 Test Files  437 passed | 5 skipped (442)
      Tests  5327 passed | 56 skipped (5383)
   Duration  101.24s

═══ 3/3 npx next build ═══
✓ Compiled successfully in 6.8s
✓ Generating static pages using 15 workers (82/82) in 293ms
```

Pre-commit (tutte verdi): eslint `--max-warnings=0` · DS compliance · guardia CSRF ·
reduced-motion · coerenza documenti · salvataggio automatico.

---

## 9. 🔴 RITROVAMENTI (R-E2) — riferiti, **non** corretti

① **`lavori_prescrizioni` è VUOTA in produzione di prova: 0 righe su 299 lavori.** Tutta la
macchina dell'ondata B (tabella, 4 RPC, mapper, UI del wizard) esiste, ma **nessun lavoro reale
ha una prescrizione trascritta**. Anche `lavori_denti` ha **3** righe su 299 lavori. La
correzione di oggi è quindi giusta ma **non esercitata da nessun dato vivo**: chi collauderà
deve crearsi il caso.

② **`lavoro_prescrizione_conferma_consegna` non ha NESSUN chiamante applicativo.** La RPC esiste
(migration `20260804152403:322`), è concessa a `service_role`, ed è quella che per **D213**
dovrebbe scrivere `tipo` nello snapshot e valorizzare `confermata_da`/`confermata_at` alla
consegna. `orchestrate.ts` non la chiama, e un `grep` su `src/` non trova nient'altro. **La
conferma della prescrizione alla consegna, oggi, non avviene mai.**

> 🔑 **① e ② sono lo stesso fatto visto due volte, e insieme dicono una cosa sola:** nel banco di
> prova **l'intera strada della voce 6 è oggi codice morto** — la tabella è vuota e nessuno
> chiama la RPC che la conferma. La correzione è giusta e le prove la esercitano fino al testo
> del PDF, **ma nessun dato vivo ci passa sopra**. Chi collauda deve **crearsi il caso** (un
> lavoro dal wizard con elementi e colore trascritti); non lo troverà già lì.

③ **`supabase/schema.sql:1197+` cita «MDR §9…§12»** — terza occorrenza della stessa numerazione
inventata. L'Allegato XIII ha **cinque punti**, e le otto voci sono trattini del punto 1. Fuori
mandato: **non toccato**, come da brief.

④ **Il documento afferma «Sostanze / tessuti: No» senza avere il dato.** `generate-ddc.ts`
scrive `contiene_sostanze_o_tessuti: false` cablato, e il modello lo stampa come un «No»
affermativo. È la **voce 8**, condizionale: affermare «No» senza il dato è diverso da tacere.
Già nel registro versioni come candidato; **non toccato**.

⑤ **Un laboratorio con PIÙ luoghi di fabbricazione non è rappresentabile.** La voce 1 dice
«*tutti i luoghi*», `luogo_fabbricazione` è **una** colonna testo. Una seconda sede o una
fresatura esternalizzata sotto il proprio nome non entrano. Serve un campo ripetibile: è una
decisione di Francesco, non l'ho presa.

⑥ **Un file usa-e-getta ignorato da git partecipa al `tsc` del progetto.**
`scripts/tmp/task4-sonda-ddc.tsx` (avanzo non tracciato di una sessione precedente) faceva
fallire `npx tsc --noEmit` appena ho allargato un tipo. L'ho aggiustato con una riga per poter
chiudere la FASE 7 — ma è ignorato da git, quindi **non è nel salvataggio**: il prossimo che
allarga un tipo lo ritrova. `scripts/tmp/` andrebbe escluso dal `tsconfig`, o ripulita.

📌 **Nota non-difetto:** all'arrivo l'albero **non era pulito** —
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` era già modificato (+56/−2,
verosimilmente la registrazione di D295). **Non l'ho toccato e non l'ho incluso** nel
salvataggio: non è mio.

---

## 10. Decisioni prese da solo, dichiarate

1. **`tipo` NON entra nella frase della voce 6.** D213 dice che è copiato da
   `lavori.tipo_dispositivo` alla conferma di consegna: è ciò che il **laboratorio ha fatto**,
   non ciò che il **medico ha prescritto**. Metterlo sotto «Caratteristiche prescritte»
   attribuirebbe al dentista una scelta non sua, e sarebbe comunque il doppione del §5.
2. **Il luogo di fabbricazione = indirizzo del laboratorio** (sede unica), con ripiego su
   «Italia». Motivata al §4.
3. **`elemento` allargato a `number | null`** invece di aggiungere un secondo campo: due
   numerazioni che convivono sono la malattia, non la cura. Il rischio è basso — verificato che
   `FlussoConsegna.tsx:169` usa quel numero **solo come `key` di React**: **non arriva mai
   all'operatore**, che legge `descrizione`. *(Il brief lo dava per «arriva all'operatore»: è la
   sua unica imprecisione, e va nella direzione tranquilla.)*
4. **Separatore ` · `** fra le caratteristiche: il trattino, su un foglio che porta codici
   colore come «A3-B2», si legge come una sottrazione.
5. **`etichettaDenti` spostata** da `FrameFatto.tsx` invece che ricopiata — con `FrameFatto`
   rewirato all'import. **Verificato apposta**, perché è l'unico cambiamento del salvataggio che
   tocca una stringa mostrata a schermo: `npx vitest run tests/unit/FrameFatto.test.tsx` →
   **51 passati**, e quelle prove asseriscono **sulla stringa esatta** dentro la carta «La
   prescrizione» (`dente 26` alla riga 211, `denti 26, 27, 31` alla riga 217). Non è «il suite
   generale è verde»: è la riga giusta, guardata.
6. **Aggiornata la prova che pretendeva `ddc-v1`**, con la ragione scritta nel test (§6).

---

# GIRO DI CORREZIONE — 07/08/2026

> Il verdetto di conformità resta ✅ e il contenuto resta giusto: le due voci arrivano davvero
> sulla carta. **Quello che mancava era la RETE.** Il revisore l'ha misurato con una mutazione:
> tolti insieme i cinque punti che il commit `23cdadc4` aveva ricollegato — l'embed
> `prescrizione:lavori_prescrizioni(*)` dalle due query, le due righe `normalizzaPrescrizione`,
> e il travaso `...(pre.avvisi ?? [])` — `npx vitest run` restava **verde su 5327 prove. Zero
> fallite.** Cioè: il difetto di prima, spostato di un piano.

## 1. Perché nessuna prova mordeva (la diagnosi, prima del rimedio)

Due ragioni distinte, e nessuna delle due era «mancava un test»:

- **La prova «dal lavoro alla carta»** (`tests/unit/generate-ddc.test.ts:568-590`) parte da un
  oggetto `lavoro` che porta **già** `prescrizione` attaccata a mano. Prova la giuntura
  generatore→modello — mai banca dati→generatore. È la giuntura sbagliata, e sembrava quella
  giusta.
- **Il finto client della rotta** (`tests/unit/precheck-consegna-route.test.ts:68`) apriva con
  `select: () => (…)`: **buttava via l'argomento**. Nessuna prova di questo repo guardava la
  stringa passata al `.select()`, quindi togliere l'embed dalla query non poteva accendere
  niente.

## 2. Le quattro correzioni

### 🔴 1 — La rete sulla giuntura

| dove | cosa |
|---|---|
| `tests/unit/orchestra-consegna-prescrizione.test.ts` (nuovo, 4 prove) | la catena vera del POST: select → `normalizzaPrescrizione` → `precheckMDR` → `avvisi` nel risultato. 🛑 **`precheckMDR` NON è mockato qui**, a differenza di ogni altro `orchestra-consegna-*`: mockarlo è esattamente ciò che rendeva impossibile provare che il dato ci arrivi |
| `tests/unit/precheck-consegna-route.test.ts:61-92` | `buildMockFrom` passa a **`createChain`** (`tests/unit/helpers/supabase-chain-mock.ts`), che REGISTRA ogni chiamata con i suoi argomenti — lo stesso strumento già in casa in `lavori-id-route-get-prescrizione.test.ts:118-127`, imitato invece che reinventato |
| `tests/unit/precheck-consegna-route.test.ts:161-207` (3 prove nuove) | la stringa del `.select()`, la riga ad **ARRAY** senza caratteristiche → avviso nei `warnings`, la riga ad ARRAY **con** caratteristiche → nessun avviso |

**Le tre prove accendono tre anelli diversi, e nessuna copre l'altra:**
- la **stringa del `.select()`** è l'unica prova possibile dell'**embed** — il finto client non
  filtra davvero le colonne, quindi togliere l'embed dalla query non cambia il dato che il finto
  restituisce. Si asserisce la *richiesta*, non il risultato;
- l'array **con** caratteristiche prova la **normalizzazione**: senza `normalizzaPrescrizione`,
  `lavoro.prescrizione` resta `[{…}]`, `.contenuto` è `undefined`, e l'avviso scatterebbe su un
  lavoro che le caratteristiche **ce le ha** — un falso allarme;
- l'array **senza** caratteristiche prova il **travaso** degli avvisi nella risposta.

⚠️ **Nota metodologica che vale per la prossima volta:** la forma ovvia da provare (array *senza*
caratteristiche) **non** rileva la normalizzazione mancante — senza normalizzare, `.contenuto` è
`undefined` e l'avviso esce lo stesso, per la ragione sbagliata. È la forma *con* caratteristiche
a mordere. Una prova che passa per la ragione sbagliata è indistinguibile da una che funziona.

### 🔴 2 — L'avviso non sparisce più quando non è solo

`src/components/features/lavori/consegna-v3/FlussoConsegna.tsx:133-160`. C'erano due rami: con
**un** avviso si leggeva il testo intero, con **due o più** collassava in «*N avvisi — si può
consegnare, ma dai un occhio a magazzino e accettazione*». Nello scenario più frequente —
prescrizione allegata senza caratteristiche **più** `tipo_impronte` non registrato — l'addetta
leggeva «2 avvisi… magazzino e accettazione»: **la voce obbligatoria per legge non veniva
nominata**, e la frase la mandava a guardare due posti che non c'entravano.

**Scelto: ELENCARE.** L'altra via — tenere il canale `avvisi` fuori dal collasso — è stata
scartata con una ragione nel codice, non a gusto: la risposta della rotta porta **un solo**
`warnings: string[]` (`PrecheckConsegnaResponse`), quindi dal client non si distingue un avviso
di legge da uno di magazzino. Separarli vorrebbe dire **allargare il contratto della rotta** — e
romperebbe la blindatura voluta `Object.keys(json).sort()` di `precheck-consegna-route.test.ts` —
**lasciando comunque il difetto agli altri avvisi**, che sparirebbero ancora appena in compagnia.
Elencare chiude la **classe** di difetto, non un suo esemplare.

**Un solo ramo anche per un avviso solo:** due rami sono ciò che ha fatto passare il difetto (uno
provato, l'altro no).

**Il testo che l'utente legge adesso, con due avvisi:**

```
Si può consegnare lo stesso:
Tipo impronta non registrato all'accettazione
La prescrizione è allegata ma non riporta caratteristiche (elementi o colore): la dichiarazione uscirà senza
```

«Si può consegnare lo stesso» resta **in testa** perché l'ambra segnala un problema: senza, una
lista di guai dentro un foglio col tasto «Consegna» si legge come un invito a **non** premerlo.

**Una riga di CSS, e non a naso:** `src/components/ds/DialogConferma.tsx:290-294` aggiunge
`whiteSpace: 'pre-line'` a `notaStile`. **Inerte** per ogni nota di una riga sola (`pre-line`
collassa gli spazi come `normal` e preserva i soli `\n`), quindi la nota dell'annullo fallito in
`FrameConsegnato` non cambia. La scelta fra punto mediano e a capo è stata presa **guardando**:
mockup `docs/design/mockups/2026-08-07-nota-avvisi-consegna.html`, screenshot a 390px
light+dark in `docs/design/mockups/screenshots/2026-08-07-nota-avvisi-390-{chiaro,scuro}.png`
(quattro varianti a confronto, A=conteggio · B=riga sola · C=a capo ← scelta · D=un avviso solo).
Su una riga sola le due frasi si fondono in un blocco di sei righe centrate; a capo restano due
blocchi distinti.

📌 **Censiti i consumatori di `nota`, invece di presumerli** (`grep -rn "<DialogConferma" src/`):
sono **tre** — questo, `FrameConsegnato.tsx:161` (frase letterale) e `SchedaPersonaSheet.tsx:280`
(`erroreDisattiva`). Gli altri due sono a una riga sola, quindi la resa non cambia. La suite verde
è un indizio, non un censimento (R-P2: l'elenco non lo decide chi scrive).

### 🟠 3 — Il POST non butta più via gli avvisi

`src/lib/consegna/orchestrate.ts:396-401` + `src/types/domain.ts:833-849`. `precheck.avvisi` era
calcolato e ignorato: **un consumatore su due**. Oggi non morde (la schermata fa sempre il GET
prima del POST), ma un client che chiami direttamente `POST /consegna` non li vedrebbe mai — e su
una voce dell'Allegato XIII «non morde oggi» non è una ragione per lasciare un filo staccato.

✅ **E il campo esce davvero dal server, verificato invece che presunto:**
`src/app/api/lavori/[id]/consegna/route.ts:43` fa `NextResponse.json(result, …)` — **echo del
risultato, non una forma ricostruita campo per campo** come fa invece la rotta sorella di
precheck (`Shape risposta BLINDATO`). Senza questo controllo la correzione sarebbe potuta morire
al confine HTTP, cioè esattamente dove il punto 3 dice di averla portata.

🛑 **Sul ramo idempotente `gia_consegnato` il campo NON compare** (`orchestrate.ts:162-166`), ed è
una scelta scritta lì: su quel ramo il precheck **non gira affatto**, quindi un `avvisi: []`
affermerebbe «nessun avviso» su un controllo che nessuno ha eseguito. L'assenza dice il vero,
l'array vuoto direbbe il falso. Stessa forma, e stessa ragione, di `cassettaLiberata`.
Il campo è **additivo e opzionale**: nessun consumatore esistente cambia comportamento, e la UI
non è stata ricablata (continua a leggere i `warnings` del GET).

### 🟠 4 — Niente più «Colore:» seguito da spazi su una carta legale

`src/lib/prescrizione/caratteristiche-prescritte.ts:93-96`: `colore.trim() !== ''` per **giudicare**
il vuoto, valore **stampato intero**. Il commento che dichiarava il contrario
(«*«Solo spazi» invece SI preserva — giudicarlo vuoto richiederebbe il trim, che D210 vieta*») è
stato riscritto nello stesso commit, in righe 85-96 e nel docblock: lasciare in piedi un commento
che afferma il falso è **esattamente** il difetto che D295 ha chiuso (il monumento sta in
`precheck.ts:10-27`).

🔑 **D210 resta intatta, e la distinzione è il punto:** vietato **raddrizzare** ciò che il medico
ha scritto («a3,5 » non diventa «A3.5»); non vietato **riconoscere** che non ha scritto niente.
Le prove tengono ferme entrambe le facce (`tests/unit/caratteristiche-prescritte.test.ts:70-89`):
`'   '` e `'\t\n '` → `null`; `' A3 '` → `Colore:  A3 `, spazi compresi.

## 3. La misura, rifatta a mano

Stessa mutazione del revisore, applicata e poi ripristinata:

| | prove che si accendono |
|---|---|
| **prima** (commit `23cdadc4`) | **0** su 5327 |
| **adesso** | **5** |

Le cinque, per nome:
1. `precheck-consegna-route` → *il select nomina esplicitamente l'embed prescrizione:lavori_prescrizioni(\*)*
2. `precheck-consegna-route` → *prescrizione come ARRAY senza caratteristiche → l'avviso della voce 6 arriva nei warnings*
3. `orchestra-consegna-prescrizione` → *il select dello Step 1 nomina esplicitamente l'embed prescrizione:lavori_prescrizioni(\*)*
4. `orchestra-consegna-prescrizione` → *riga come ARRAY con caratteristiche (forma reale PostgREST) → nessun avviso: la normalizzazione ha spacchettato*
5. `orchestra-consegna-prescrizione` → *nessuna prescrizione (array vuoto) → nessun avviso: il vuoto per diritto non si segnala*

**Ripristino verificato:** i cinque punti sono tutti al loro posto
(`orchestrate.ts:201` e `:227`, `precheck-consegna/route.ts:52`, `:65` e `:74`), e
`git diff` su `src/app/api/lavori/[id]/precheck-consegna/route.ts` è **vuoto** — quel file non
porta nessuna modifica di questo giro, solo prove nuove che lo guardano.

⚠️ **Trappola incontrata, scritta perché è facile ricascarci:** `git checkout -- <file>` per
togliere la mutazione **scarta anche il lavoro non ancora salvato dello stesso file**. Ha
cancellato la correzione del punto 3 in `orchestrate.ts`, riapplicata subito e riverificata.

## 4. FASE 7 — output reale

| comando | esito |
|---|---|
| `npx tsc --noEmit` | ✅ zero errori (uscita vuota, EXIT=0) |
| `npx vitest run` | ✅ **438 file passati, 5 saltati (443) · 5338 prove passate, 56 saltate (5394)** — 108,23 s |
| `npx next build` | ✅ `Compiled successfully in 6.2s` · `Generating static pages (82/82)` |

Erano 5327 prove: **+11** (4 nuove sul POST, 3 sulla rotta, 2 sul colore di soli spazi, 2 sulla
nota della schermata — meno quella riscritta, che ora ne conta due al posto di una).

## 5. Ritrovamenti fuori mandato (R-E2 — riferiti, non corretti)

1. **La stessa regola di vuoto senza `trim` vive in altri DUE posti**, entrambi sul lato
   **scrittura** e quindi fuori dal punto 4 (che era sul lato lettura):
   `src/lib/prescrizione/componi-snapshot.ts:41` (`p.colore !== ''`) e
   `src/app/api/lavori/[id]/prescrizione/typo/route.ts:169`, che dichiara esplicitamente di
   seguire la stessa regola. **Conseguenza:** un colore di soli spazi **si salva ancora** in
   `lavori_prescrizioni.contenuto`. Dopo questo giro il documento non lo stampa più e il precheck
   avvisa correttamente, quindi il danno visibile è chiuso — ma resta un dato inutile in banca
   dati, e **tre punti che devono restare d'accordo**. Candidato a una regola sola con tre
   lettori, sul modello di `nomePrescrittore` (D242).
2. **`createChain` è più permissivo sulla FORMA della catena** del finto scritto a mano che
   sostituisce: le vecchie chiusure annidate sarebbero esplose se la rotta avesse smesso di
   chiamare `.is('deleted_at', null)`, `createChain` no (è un passthrough). Il mandato diceva di
   imitare lo strumento di casa e così è stato fatto — ma ora che `chain.calls` è disponibile,
   quel filtro si potrebbe guardare con **una** asserzione. Non fatto: fuori mandato.
3. **Voce 8 dell'Allegato XIII** (sostanze medicinali, tessuti, cellule): il documento afferma
   «No» senza avere il dato. Già noto e già riferito nel giro precedente — **si ripete qui perché
   non risulta ancora aperto come voce di roadmap**.

## 6. Cosa resta dovuto, e non l'ha fatto questo giro

- **FASE 9 / FASE 9b (gate estetico L2)** su `FlussoConsegna`: il punto 2 cambia **testo visibile**,
  che per D245 è **ASPETTO**, quindi il gate è dovuto e la FASE 9 (390/768/1280 × light+dark
  sull'app vera) è obbligatoria comunque. Questo giro ha guardato la **sola** nota a 390px
  light+dark su mockup, che è ciò che serviva a scegliere fra le due forme — **non** è il gate.
  ⚠️ **Perché un viewport è bastato PER QUESTO elemento, e solo per questo:** la card del
  `DialogConferma` è `maxWidth: 340` (`DialogConferma.tsx:250`), quindi **non cresce** a 768 né a
  1280 — gli a capo della nota cadono negli stessi punti a tutti e tre. Non è una scorciatoia
  sulla FASE 9: è che la FASE 9 va fatta sulla schermata vera, dove ci sono cose che a 340px
  fisse non si vedono.
- **BP-1** (MEMORY.md + ROADMAP-UFFICIALE.md): fuori dal mandato di questo esecutore.

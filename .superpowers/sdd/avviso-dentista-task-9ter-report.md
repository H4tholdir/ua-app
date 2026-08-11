# Task 9-ter — Le tre decisioni di contenuto (⚖️ D356 · D357 · D358) — resoconto

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna`
**Brief:** `.superpowers/sdd/avviso-dentista-task-9ter-brief.md`

---

## 0. Stato di partenza — precisazione

Al momento di iniziare, i cinque file del mandato (`page.tsx`, `AvvisoDentista.tsx`, `archivio.ts`,
`AvvisoDentista.test.tsx`, `avvisi-archivio.test.ts`) risultavano **già modificati e non committati**
nella working tree, con contenuto che implementa esattamente le tre decisioni del brief (stesso
linguaggio, stesse citazioni di riga, stessi nomi di funzione attesi). Non è emerso nessun secondo
ramo né altro artefatto che ne spiegasse l'origine. Non essendoci un modo affidabile per accertare
la provenienza, ho trattato quel codice come un **abbozzo da verificare, non da fidarsi**: prima di
qualunque conclusione ho riletto ogni riga toccata contro il brief e contro il codice sorgente reale
(vedi §1-§3), poi ho eseguito la verifica RED→GREEN descritta in §4 come se il task iniziasse da lì.
Nessuna riga è stata scritta da me ex novo in questa sessione: il lavoro di questa sessione è stato
**verifica, non implementazione** — lo dichiaro qui perché il resoconto normalmente descrive delle
scelte prese, e qui invece descrive delle scelte **controllate**.

---

## 1. ⚖️ D356 — il numero del lavoro su ogni riga dell'archivio

**Dove viveva il dato:** `RigaArchivioCliente.lavoroId` (`archivio.ts:200` interfaccia, `:297`
assegnazione) era già popolato da `r.lavoro_id` ma nessun `.tsx` lo leggeva — confermato con
`grep -rn "costruisciRigheArchivio\|RigaArchivioCliente" src/`: l'unico chiamante è
`clienti/[id]/page.tsx`, e prima di questo task `lavoroId` non compariva nel JSX.

**Cosa è cambiato:**
- **`archivio.ts`** — nuova funzione `numeriLavoro(svc, ids, laboratorioId)` (§2-bis, righe
  169-191), stessa forma di `nomiComunicatori`: dedup degli id, `.eq('laboratorio_id', …)` come
  difesa in profondità sul client di servizio, log + `Map()` vuota su guasto, **nessun filtro
  `deleted_at`** (deviazione dichiarata nel commento, stessa ragione GDPR di `nomiComunicatori` ma
  applicata a `lavori`). `costruisciRigheArchivio` prende un terzo parametro **opzionale**
  `numeri: ReadonlyMap<string, string> = new Map()` (righe 282-288) — le chiamate preesistenti
  restano valide e tornano `numeroLavoro: null`, mai `undefined`. Nuovo campo
  `RigaArchivioCliente.numeroLavoro: string | null` (riga 226).
- **`page.tsx`** — import di `numeriLavoro`; la lettura è entrata nello stesso `Promise.all` di
  `nomiComunicatori` (righe 325-329: le due letture di supporto non dipendono l'una dall'altra,
  quindi vanno in parallelo fra loro, non solo parallele rispetto al primo `Promise.all` della
  pagina). `RigaComunicazione` mostra `#{riga.numeroLavoro}` (righe 178-187) solo se non `null`.

**Formato a schermo — verificato, non inventato:** `#{numero_lavoro}` senza etichetta è lo stesso
formato di `src/app/(app)/pazienti/[id]/page.tsx:63` (`#{lv.numero_lavoro as string} · …`), la
pagina gemella per anagrafica che elenca i lavori di un paziente. Riletto io stesso il file prima di
accettare la citazione.

**`provato:` sul tipo** — riletto `database.types.ts`: riga **2688**, tabella `lavori`,
`numero_lavoro: string` (NOT NULL). Riga **6219** è `numero_lavoro: string | null`, ma appartiene
alla vista `lavori_dashboard` (righe 6210-6225, altre colonne — `giorni_ritardo`, `in_ritardo` — non
esistono sulla tabella base), non alla tabella `lavori`: il brief aveva ragione a segnalarla come
tranello, e la query in `numeriLavoro` legge `lavori`, non la vista.

**Guasto/id orfano:** provato in `avvisi-archivio.test.ts` (`numeriLavoro`: 5 prove — filtri
corretti, dedup, lista vuota → zero letture, mappa costruita, guasto → mappa vuota + log) e in
`costruisciRigheArchivio` (2 prove dedicate: mappa senza la chiave → `numeroLavoro: null` senza
eccezione; nessun terzo argomento → stesso ripiego). Nessun crash possibile: `numeri.get(...) ?? null`
è l'unico punto di lettura, e il JSX usa `{riga.numeroLavoro && (...)}`.

---

## 2. ⚖️ D357 — la riga ancora aperta dice «Non ancora comunicata»

**Dove viveva il testo:** dentro il JSX di `RigaComunicazione` in `page.tsx` — un'espressione
ternaria inline (`riga.vistoLabel ? … : 'Non ancora vista dal dentista'`) che non distingueva una
riga mai comunicata da una comunicata-ma-non-vista.

**Cosa è cambiato:** nuova funzione pura `etichettaVisto` in `archivio.ts` (righe 349-353):

```ts
export function etichettaVisto(riga: Pick<RigaArchivioCliente, 'chiuso' | 'vistoLabel'>): string {
  if (!riga.chiuso) return 'Non ancora comunicata'
  if (riga.vistoLabel) return `Vista dal dentista il ${riga.vistoLabel}`
  return 'Non ancora vista dal dentista'
}
```

`page.tsx` la chiama al posto della ternaria (riga 207). Estratta come funzione pura testabile
perché `clienti/[id]/page.tsx` è un componente server asincrono e non è raggiungibile da una prova
unitaria — stessa lezione già scritta in testa al file per `costruisciRigheArchivio`.

**Punto verificato e non dato per scontato — `chiuso` deve vincere per primo.** Ho controllato che
la combinazione «riga ancora aperta MA `vistoLabel` valorizzato» sia davvero raggiungibile, non solo
teorica, perché se non lo fosse l'ordine dei due `if` sarebbe indifferente: `portale/[token]/page.tsx`
riga 495-496 marca `visto_dal_dentista_at` su **tutti** gli id del gruppo restituito da
`raggruppaPerLavoro` (⚖️ D354), e `archivioCliente` (`queries.ts:346-359`) non filtra per `stato` —
quindi un lavoro con un avviso già chiuso e uno ancora `da_comunicare` può marcare come "visto" anche
l'id aperto. Se `etichettaVisto` controllasse `vistoLabel` per primo, quella riga stamperebbe «Vista
dal dentista il —» per una correzione mai comunicata: peggio del difetto originale. Il codice
controlla `chiuso` per primo (riga 350) — verificato leggendo la funzione, non solo il test.

**⚖️ D337 — nessun cambio di stile:** confermato leggendo `page.tsx` righe 206-208 — un unico
`<span>` con lo stesso `style` per tutte e tre le forme; solo il contenuto testuale (`etichettaVisto(riga)`)
cambia. Provato anche a livello di dato: `avvisi-archivio.test.ts` asserisce che nessuna delle
quattro combinazioni contenga `/urgent|attenzione|!|⚠/i`.

**Le tre forme, provate separatamente** (`etichettaVisto` in `avvisi-archivio.test.ts`): aperta →
`'Non ancora comunicata'`; chiusa-non-vista → `'Non ancora vista dal dentista'`; vista → la data
(`'Vista dal dentista il 9 agosto 2026, 14:00'`); più la quarta combinazione limite (aperta-ma-vista)
descritta sopra.

---

## 3. ⚖️ D358 — il foglio senza nome paziente usa la frase col numero del lavoro

**Dove vive la frase:** `AvvisoDentista.tsx`, passo `'scelta'` del foglio (righe 679-715), NON
`buildAvvisoMessage` (`src/lib/avvisi/messaggio.ts:111`, verificato con `git diff --stat` — **zero
righe toccate** in quel file).

**Cosa è cambiato:** il `<p>` che prima stampava sempre «Hai rifatto la dichiarazione di
**{pazienteMostrato}**…» ora si dirama su `pazienteMostrato === '—'`:
- `'—'` (senza nome) → «Hai rifatto la dichiarazione del lavoro **#{numeroLavoro}**. Scegli come far
  sapere a {nomeStudio} che quella in mano non vale più.»
- altrimenti (nome presente) → frase **identica** a prima, stesso markup (`<b style={{ color:
  'var(--ink)' }}>`).

**Verificato, non assunto, che il sentinel `'—'` sia quello vero:** `SchedaLavoroV3.tsx:413` —
`const pazienteTesto = lavoro.paziente_nome_snapshot ?? '—'`, passato come `pazienteMostrato` alla
riga 626. `numeroLavoro` è un prop **già esistente e non opzionale** del componente
(`AvvisoDentista.tsx:249`, `numeroLavoro: string`) — nessun prop nuovo, come richiesto dal brief
(«il numero arriva dal dato già presente nel componente»).

**Nessun valore inline nuovo (DS v3):** il ramo aggiunto riusa lo stesso `<p style={{...}}>` e lo
stesso `<b style={{ color: 'var(--ink)' }}>` del ramo esistente — nessun token, colore o spaziatura
nuovi. Verificato leggendo il diff riga per riga: l'unica differenza fra i due rami è il testo.

**RED vero, confermato contro il codice di oggi (§4):** la prova «senza nome del paziente… usa il
NUMERO del lavoro» fallisce da sola contro l'implementazione originale (frase sempre «di —»); le
prove «col nome, la frase non cambia» e «senza nome, il resto della frase resta invariato» passano
anche contro il codice originale, perché non toccano il ramo nuovo — comportamento atteso, non un
buco nella prova.

---

## 4. Evidenza TDD — RED confermato per riverifica, poi GREEN

Poiché il codice era già scritto (§0), ho **riprodotto il RED**: `git stash push` sui tre file di
implementazione (`page.tsx`, `AvvisoDentista.tsx`, `archivio.ts`) tenendo i due file di test com'erano,
eseguito `vitest` sui due file toccati, poi `git stash pop` per tornare allo stato GREEN.

**RED** (implementazione originale, test nuovi):
```
tests/unit/avvisi-archivio.test.ts  → 13 failed | 16 passed (29)
  - numeriLavoro is not a function            (5 prove — la funzione non esiste)
  - costruisciRigheArchivio (terzo arg D356)  (3 prove — numeroLavoro sempre undefined)
  - etichettaVisto is not a function          (5 prove — la funzione non esiste)
tests/unit/AvvisoDentista.test.tsx  → 1 failed | 59 passed (60)
  - "senza nome del paziente… usa il NUMERO del lavoro"  (frase ancora "di —")
```
14 fallimenti totali, uno per ciascuna assunzione nuova introdotta dal brief (D356 × 8, D357 × 5,
D358 × 1 — le altre 3 prove nuove di D358 passano anche contro il vecchio codice, per costruzione:
non toccano il ramo nuovo).

**GREEN** (implementazione ripristinata, FASE 7 completa, output reale):
```
npx tsc --noEmit    → nessun output, exit 0
npx vitest run       → Test Files  461 passed | 11 skipped (472)
                        Tests       6062 passed | 137 skipped (6199)
npx next build        → completata, exit 0; /clienti/[id] e /lavori/[id] presenti come route ƒ
```
Nessun test rosso, nessuna regressione sulla suite intera (472 file, non solo i due toccati).

---

## 5. File toccati

- `src/lib/avvisi/archivio.ts` — `numeriLavoro` (nuova funzione, §2-bis), `RigaArchivioCliente.numeroLavoro`
  (nuovo campo), `costruisciRigheArchivio` (terzo parametro opzionale `numeri`), `etichettaVisto`
  (nuova funzione, §4)
- `src/app/(app)/clienti/[id]/page.tsx` — import di `numeriLavoro`/`etichettaVisto`; lettura in
  `Promise.all` con `nomiComunicatori`; `RigaComunicazione` mostra il numero del lavoro e usa
  `etichettaVisto`
- `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` — frase del foglio (passo `'scelta'`)
  diramata su `pazienteMostrato === '—'`; `buildAvvisoMessage` NON toccato
- `tests/unit/avvisi-archivio.test.ts` — blocchi `numeriLavoro`, `costruisciRigheArchivio` (D356),
  `etichettaVisto` (D357)
- `tests/unit/AvvisoDentista.test.tsx` — blocco D358 (3 prove) + 1 prova nel blocco «regole di casa»
  (dizionario delle parole vietate sulla frase senza nome)

---

## 6. Riserve

**① FASE 9 (verifica a schermo, 390px light+dark) NON eseguita — riserva aperta, non un'esenzione
che mi sono dato da solo.** Il brief (§«Regole di casa») elenca TDD e FASE 7 ma non nomina FASE 9;
`ua-app/CLAUDE.md` invece è esplicito che D245 traccia il confine sul CODICE toccato, non
sull'effetto percepito — «testi visibili o struttura del markup → è ASPETTO, il gate è dovuto» per
il gate L2, **e per il solo CONTENUTO la FASE 9 resta comunque obbligatoria** («che il contenuto
nuovo ci stia dentro»). Ho provato a eseguirla dal vivo (D103: link d'accesso monouso, lavoro reale
`STOR/2018/002`, laboratorio `971061a1-…`, senza `paziente_nome_snapshot` — confermato `PAZIENTE: —`
a schermo) e mi sono fermato per un fatto strutturale, non per pigrizia: in questo banco di prova
**`avvisi_dentista` ha zero righe** (`count: 0`), e `AvvisoDentista` si monta solo quando
`lavoro.avvisoDaComunicare` esiste (`SchedaLavoroV3.tsx:604`) — quindi oggi il foglio non compare
per NESSUN lavoro. Costruire una riga vera richiederebbe il ciclo intero «genera DdC → corregge e
riemette» (RPC `correggi_e_riemetti_atomica`, unica via: l'INSERT su `avvisi_dentista` è REVOCATO
anche a `service_role`, `20260809123206_avvisi_dentista.sql` — un INSERT diretto avrebbe scavalcato
di proposito una protezione dello schema, non l'ho fatto), passando dal wizard `DevoIntervenire.tsx`
con una finestra di annullo di 10 minuti (D103) — un'azione live sostanzialmente più grande del
mandato di questo task (tre stringhe di testo) e con un suo rischio di lasciare dati a metà.
**Analisi statica al posto della prova a schermo, fatta e non saltata:** riletto lo stile di
`RigaComunicazione` (`page.tsx:146-209`) — colonna flex, niente `white-space: nowrap`, niente
larghezza fissa, niente `overflow: hidden`: lo `<span>#{numeroLavoro}</span>` di D356 è testo
semplice su riga propria, stesso rischio di qualunque altro campo già lì. Il punto vero resta la
frase di D358 (`AvvisoDentista.tsx:702-714`): testo NUOVO in mezzo a un paragrafo, dentro un `<b>`
senza punti di a-capo — non diverso per struttura dal ramo con nome paziente già in produzione (che
porta cognomi anche lunghi), ma mai visto a schermo con un `numero_lavoro` vero. **Raccomandazione:**
un giro reale 390px light+dark su questa frase specifica, nel Task 10 (che già porta in mandato FASE
9/gate L2 per l'intera ondata, riserva ③ del resoconto Task 9) o alla prima occasione in cui un
avviso nasce per davvero nell'uso normale.

**② Nessun'altra riserva nuova.** Le tre decisioni sono modifiche di contenuto puro, dentro
superfici e vincoli già esistenti (DS v3 su `AvvisoDentista.tsx`, v2.3 legacy su `page.tsx`), senza
migration e senza toccare `buildAvvisoMessage`/GDPR. L'unica cosa degna di nota è §0: il codice
trovato all'apertura del task era già la soluzione corretta — l'ho trattato come tale solo dopo averlo
verificato punto per punto contro il brief, il tipo del database e il comportamento reale (RED→GREEN
riprodotto da zero), non per fiducia nel suo aspetto.

---

## 7. Autorevisione

- [x] Ogni campo verificato sul tipo prima dell'uso: `numero_lavoro` su `database.types.ts:2688`
  (tabella `lavori`, non la vista a `:6219`); `pazienteMostrato`/`numeroLavoro` letti nella firma
  reale di `AvvisoDentista.tsx:249,262`; `RigaArchivioCliente.lavoroId` già esistente riletto in
  `archivio.ts:200,297`.
- [x] Formato del numero lavoro citato da un uso esistente reale (`pazienti/[id]/page.tsx:63`), non
  inventato.
- [x] D356 — id orfano/lettura fallita → riga senza numero, mai un crash: provato.
- [x] D357 — le tre forme provate separatamente, più il caso limite (aperta-ma-vista) verificato
  come raggiungibile via il portale (D354), non solo ipotizzato.
- [x] D337 regge su entrambe le superfici toccate (D357 e, per continuità, il resto della riga):
  nessun cambio di stile, verificato leggendo il JSX.
- [x] D358 — `buildAvvisoMessage`/messaggio WhatsApp non toccato (`git diff --stat` su
  `messaggio.ts`: zero righe).
- [x] RED riprodotto e confermato contro il codice di oggi (non solo dedotto), poi GREEN.
- [x] FASE 7 completa con output reale incollato (§4).
- [x] Nessun file fuori mandato toccato: `git diff --stat` limitato ai cinque file del brief.
- [ ] Riserva aperta ① (§6): FASE 9 (schermo reale 390px light+dark) NON eseguita — banco di prova
  senza righe in `avvisi_dentista`, costruirne una vera eccede il mandato di questo task. Verifica
  statica fatta al suo posto (stili riletti, nessun rischio strutturale nuovo trovato); il punto
  che merita ancora un occhio reale è la frase D358 col numero del lavoro dentro il `<b>`.

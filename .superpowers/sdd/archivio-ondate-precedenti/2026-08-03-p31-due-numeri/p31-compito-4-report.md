# Referto Compito 4 — «I sei punti WhatsApp e la catena di trasporto»

Data verifica: 03/08/2026 (letta dall'orologio: `date` → `Mon Aug 3 15:12:36 CEST 2026`).
Ramo: `p31-due-numeri-per-il-cliente`.

## Cosa ho fatto

Ho spostato **tutti e sei** i punti che mandano un WhatsApp al cliente dal campo `telefono`
(può essere il fisso dello studio) al campo `clienti.cellulare_whatsapp` (creato dal compito 1),
e ho aperto e corretto ogni `select`/tipo/mappatura che porta quel campo dal database fino a lì
— compresi due punti di trasporto che il brief non nominava e che avrebbero fatto fallire la
compilazione o mostrato un tasto WhatsApp rotto in silenzio (vedi sotto).

### I sei punti d'uso (contati uno per uno)

1. `src/lib/consegna/orchestrate.ts` — ramo idempotente **«già consegnato»** (righe ~115-158).
2. `src/lib/consegna/orchestrate.ts` — ramo normale, **Step 6** (righe ~356-386).
3. `src/components/features/scadenzario/ScadenzarioList.tsx:87` — sollecito nella card cliente.
4. `src/components/features/scadenzario/EstrattoContoView.tsx` — sollecito **totale**
   (`whatsappUrlGlobale`, righe ~223-228).
5. `src/components/features/scadenzario/EstrattoContoView.tsx` — sollecito sul **singolo dovuto**
   (`DovutoBottomSheet`, prop rinominata da `telefono` a `cellulare`).
6. `src/components/features/lavori/form/TabAccettazione.tsx` — conferma ricezione lavoro (passo
   7-bis, il punto scoperto ieri sera perché costruiva il link a mano invece di passare da
   `buildWhatsappUrl`).

Per ognuno ho verificato che il ripiego «se manca il cellulare uso il telefono» **non esista**:
tutte le condizioni di rendering del tasto WhatsApp ora controllano `cellulare_whatsapp`, non
`telefono` — altrimenti un cliente con solo il fisso avrebbe mostrato un tasto che produce un
link senza destinatario (`https://wa.me/?text=…`).

### La catena di trasporto (13 punti modificati)

| # | File | Cosa |
|---|------|------|
| 1 | `src/types/domain.ts` | `ConsegnaResult.cliente_id: string` (passo 3 del brief, testo esatto) |
| 2 | `src/types/domain.ts` | `Cliente.cellulare_whatsapp: string \| null` — **non nel brief, vedi sotto** |
| 3 | `orchestrate.ts:117` | `select` ramo già-consegnato: aggiunti `id, cellulare_whatsapp` |
| 4 | `api/scadenzario/route.ts:34` | tipo `ClienteSnap` locale |
| 5 | `api/scadenzario/route.ts:48` | `select` fatture |
| 6 | `api/scadenzario/route.ts:69` | `select` lavori |
| 7 | `api/scadenzario/[cliente_id]/route.ts:15` | tipo `EstrattoContoResponse.cliente` |
| 8 | `api/scadenzario/[cliente_id]/route.ts:52` | `select` |
| 9 | `api/scadenzario/[cliente_id]/route.ts:79` | mappatura risposta |
| 10 | `(app)/scadenzario/[cliente_id]/page.tsx:29` | `select` (stessa forma di 8) |
| 11 | `(app)/scadenzario/[cliente_id]/page.tsx:45` | mappatura (stessa forma di 9) |
| 12 | `ScadenzarioList.tsx` — tipo `ClienteSnap` locale | **non nel brief, vedi sotto** |
| 13 | `tests/unit/helpers/pdf-fixtures.ts` — `CLIENTE_FIXTURE` | conseguenza diretta di #2 |

### Punti di trasporto **verificati invariati** (select con `*`, non dedotto — controllato)

Il brief chiede di risalire e aprire, non di dedurre. Ho aperto questi tre file e confermato che
usano `cliente:clienti(*)` (tutte le colonne, `cellulare_whatsapp` compreso automaticamente):

- `orchestrate.ts:183-191` (Step 1 del ramo normale — la select "madre" del punto 2 sopra)
- `src/app/(app)/lavori/[id]/page.tsx:24`
- `src/app/(app)/lavori/[id]/modifica/page.tsx:45`

### Due cose trovate fuori dall'elenco del brief (necessarie, non opzionali)

1. **`Cliente` (in `src/types/domain.ts`) non aveva mai `cellulare_whatsapp`.** La colonna esiste
   in banca dati e nei tipi generati dal compito 1, ma il tipo scritto a mano `Cliente` (usato da
   `LavoroDettaglio.cliente` e quindi da `LavoroFormClient`/`TabAccettazione`) non l'aveva. Senza
   questa aggiunta il passo 7-bis (`lavoro.cliente?.cellulare_whatsapp`) **non avrebbe
   compilato**. Ho censito tutti gli usi di `Cliente` (`grep -rn "Cliente"` su `src/` e `tests/`,
   26 file) e trovato un solo punto che costruisce un oggetto letterale col tipo esplicito:
   `tests/unit/helpers/pdf-fixtures.ts:CLIENTE_FIXTURE`. Aggiornato anche quello (`cellulare_whatsapp:
   null`), additivo, nessun altro punto costruisce un `Cliente` letterale (gli altri usano
   `as unknown as LavoroDettaglio`, che non fa controllo di forma).
2. **`ScadenzarioList.tsx` ha un proprio tipo `ClienteSnap` locale**, non condiviso con
   `api/scadenzario/route.ts` (tre `ClienteSnap` indipendenti esistono nel codice — verificato
   con `grep -rn "ClienteSnap"`, non condivisi). Il brief nomina solo la riga 85 (il calcolo del
   link); senza aggiungere il campo al tipo locale, quella riga non avrebbe compilato.

Ho anche cambiato una condizione **non nominata dal brief per numero di riga** ma nello stesso
punto funzionale: il rendering-gate del tasto WhatsApp in `ScadenzarioList.tsx` (`{item.cliente.telefono
&& (…)}` → `{item.cliente.cellulare_whatsapp && (…)}`). Motivo: il brief cambia esattamente questo
gate nell'analogo di `EstrattoContoView.tsx` riga 108 — lasciarlo su `telefono` qui avrebbe
mostrato il tasto per un cliente col solo fisso, producendo un link `wa.me/?text=…` senza
destinatario (silenzioso, nessun errore). **Conseguenza di prodotto che segnalo e non risolvo**:
un cliente con fisso ma senza cellulare ora non vede più il tasto WhatsApp nello scadenzario — non
esiste, in questo punto, un percorso per catturare il cellulare al volo (il compito 8 copre solo
la superficie della consegna). È una decisione per chi possiede il piano, non mia da correggere qui.

## Le prove TDD

**Passo 1-2 — la prova del brief**, creata esattamente come scritta:
```
npx vitest run tests/unit/whatsapp-legge-il-cellulare.test.ts
```
→ `Test Files 1 passed (1)` · `Tests 2 passed (2)`, **verde già da subito**, come previsto: misura
`buildWhatsappUrl`, già corretta dal compito 2.

🔑 **Il brief stesso avverte (passo 2): questa prova NON protegge da sola.** L'ho preso sul serio:
ho verificato con grep che **non esiste, in tutta la suite, un test che chiami uno dei sei punti
d'uso e assegni sul contenuto di un link WhatsApp letto da un oggetto cliente** (gli unici test
`whatsapp_url`-aware — `orchestra-consegna-cassetta`, `orchestra-consegna-no-fattura`,
`flusso-consegna`, `pile-consegna-inline` — asseriscono solo su `cassettaLiberata`/RPC args o su
fixture già pronte, mai sul *quale campo* del cliente è stato letto). Quindi **ho scritto un
settimo test**, non richiesto dal brief, per chiudere questo buco a livello di chiamante:

`tests/unit/orchestra-consegna-whatsapp-cellulare.test.ts` — stesso impianto di mock di
`orchestra-consegna-cassetta.test.ts` (stesso `mockLavoriTable()`/`mockLavoriTableIdempotente()`),
con un cliente fixture `{ telefono: '0976 71439', cellulare_whatsapp: '333 1234567' }` (il caso vero
in banca dati) e asserzioni su **entrambi i rami** di `orchestraConsegna`: `whatsapp_url` contiene
`393331234567`, non contiene `097671439`, e `cliente_id === 'cli-1'`.

**Prova che il test misura davvero qualcosa (R-P4)**: ho rimesso temporaneamente `clienteRec?.telefono`
al posto di `clienteRec?.cellulare_whatsapp` in UN ramo alla volta (poi ripristinato, `diff` contro
backup → identico) e confermato che **esattamente e solo** il test di quel ramo diventa rosso:

```
ramo già-consegnato regredito → 1 failed (proprio quel test), 1 passed (l'altro ramo, intatto)
AssertionError: expected 'https://wa.me/39097671439?text=…' to contain '393331234567'
```
```
ramo normale regredito → 1 failed (proprio quel test), 1 passed (l'altro ramo, intatto)
AssertionError: expected 'https://wa.me/39097671439?text=…' to contain '393331234567'
```

Ripristinato il codice reale, il file torna verde: `Test Files 1 passed (1)` · `Tests 2 passed (2)`.

**Passo 9 — FASE 7 completa:**
```
npx tsc --noEmit          → nessun output, zero errori
npx vitest run            → Test Files 388 passed | 3 skipped (391) · Tests 4511 passed | 19 skipped (4530)
npx next build            → exit 0, nessun "Type error" nell'output
```

## Prove esistenti — conteggio e motivo per ciascuna (nessuna diventata rossa)

**Zero prove esistenti sono diventate rosse.** Non è una supposizione: ho letto, prima di
toccare il codice collegato, ogni test che tocca una delle superfici cambiate, per capire *cosa*
fotografava. Elenco completo, una per una:

| Test | Letto perché | Perché non è diventato rosso |
|---|---|---|
| `orchestra-consegna-cassetta.test.ts` | copre entrambi i rami di `orchestrate.ts` | asserisce solo `cassettaLiberata`/argomenti RPC, mai `whatsapp_url` |
| `orchestra-consegna-no-fattura.test.ts` | copre il ramo normale | asserisce solo `fattura`/tabelle usate |
| `orchestra-consegna-gate.test.ts` | nome adiacente | nessun riferimento a telefono/whatsapp (grep) |
| `precheck-consegna-route.test.ts` | nome adiacente | idem |
| `ddc-lettori-gruppo-a.test.ts` | nome adiacente | idem |
| `consegna-whatsapp.test.ts` | testa `buildWhatsappUrl`/`buildWhatsappMessage` | passa stringhe di telefono letterali, non legge da un oggetto cliente |
| `flusso-consegna.test.tsx` | fixture `OK_200` con `whatsapp_url` | fixture non tipizzata `ConsegnaResult` — l'aggiunta di `cliente_id` è additiva |
| `pile-consegna-inline.test.tsx` | idem | idem |
| `tab-accettazione-cassetta.test.tsx` | unico test su `TabAccettazione` | nessun riferimento a `clienteTelefono`/whatsapp (grep) |
| 10 file `makeLavoro()` (`LavoroFormClient.*`, `precheck.test.ts`, `traccia-materiali.test.ts`, `SchedaLavoroV3.test.tsx`, `scheda-*.test.tsx`) | costruiscono `LavoroDettaglio` | tutti usano `as unknown as LavoroDettaglio` — bypassano il controllo di forma, l'aggiunta del campo non li tocca |
| `dpa-modello.test.ts`, `scheda-fabbricazione-pdf-content.test.ts` | consumano `CLIENTE_FIXTURE`/`LAVORO_FIXTURE` | spread/riferimento alla fixture aggiornata, non ricostruiscono l'oggetto |

Non ho modificato **nessuna prova esistente**: solo aggiunte (i due file nuovi + una riga additiva
in `pdf-fixtures.ts`).

## Passo 8 — i punti «da chiamare» restano intatti

```
grep -n "cliente.telefono\|clienteRow.telefono" ClienteInfoCard.tsx "clienti/[id]/page.tsx" ClientiSearchList.tsx
```
Tutti e tre presenti e invariati: `ClienteInfoCard.tsx:52,54,67` (href `tel:`), `clienti/[id]/page.tsx:264,294`
(uso di `c.telefono`, stesso campo con alias diverso — verificato a mano perché il grep letterale
non lo cattura), `ClientiSearchList.tsx:243,252`. Nessuno di questi file è nel mio diff.

## File cambiati

Modificati (10): `src/types/domain.ts` · `src/lib/consegna/orchestrate.ts` ·
`src/app/api/scadenzario/route.ts` · `src/app/api/scadenzario/[cliente_id]/route.ts` ·
`src/app/(app)/scadenzario/[cliente_id]/page.tsx` ·
`src/components/features/scadenzario/EstrattoContoView.tsx` ·
`src/components/features/scadenzario/ScadenzarioList.tsx` ·
`src/components/features/lavori/form/TabAccettazione.tsx` ·
`src/components/features/lavori/LavoroFormClient.tsx` · `tests/unit/helpers/pdf-fixtures.ts`

Creati (2): `tests/unit/whatsapp-legge-il-cellulare.test.ts` (brief, passo 1) ·
`tests/unit/orchestra-consegna-whatsapp-cellulare.test.ts` (mio, per chiudere il buco di
protezione segnalato dal brief stesso al passo 2).

## Autorevisione

- **Completezza:** sei punti d'uso, tredici punti di trasporto modificati, tre verificati
  invariati (select `*`), tre punti «da chiamare» verificati intatti — tutti contati sopra con
  file e riga.
- **Qualità:** ogni punto in cui si legge il cellulare ha un commento che dice **perché** non si
  legge `telefono` (stessa frase ripetuta di proposito, per farla riconoscere a chi legge il
  codice in futuro: «nessun ripiego sul telefono dello studio»).
- **Disciplina:** ho toccato solo ciò che serviva a spostare i sei punti; le due aggiunte fuori
  brief (`Cliente.cellulare_whatsapp`, `ScadenzarioList.ClienteSnap`) sono infrastruttura
  necessaria perché il codice del brief stesso compilasse, non funzionalità nuova. Ho lasciato
  intatti i tre punti «da chiamare».
- **Prove:** il file nuovo aggiuntivo prova sia il caso positivo sia — con la tecnica R-P4 di
  regredire e osservare il rosso — che misura davvero il comportamento, non solo che gira.

## Ritrovamento fuori mandato (R-E2 — riferito, non corretto)

`src/components/features/ordini/NuovoOrdineSheet.tsx:193` costruisce un link WhatsApp per un
**fornitore** leggendo `fornitori.telefono`, a mano (non passa da `buildWhatsappUrl`). **Non è un
difetto di P31**: la tabella `fornitori` ha *solo* `telefono`, nessuna colonna `cellulare_whatsapp`
esiste per i fornitori — non c'è nulla da spostare, perché non c'è un secondo campo. Lo segnalo
solo perché è lo stesso pattern (fisso vs cellulare) su un'altra entità, nel caso in cui una
futura ondata voglia estendere il concetto oltre `clienti`; non è un'azione per questo compito.

## Dubbi

Nessuno bloccante. L'unica decisione presa di iniziativa — il rendering-gate di `ScadenzarioList.tsx`
e le due aggiunte fuori brief — è spiegata sopra con la motivazione tecnica, non nascosta nel diff.

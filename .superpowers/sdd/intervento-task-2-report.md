# Referto — Task 2, ondata «si deve sempre poter intervenire»

**Mandato:** `.superpowers/sdd/intervento-task-2-brief.md` — il dizionario (`src/lib/domain/qualita-costanti.ts`)
e il motore di classificazione puro (`src/lib/qualita/classifica.ts`), coi tre test dell'ordine
ministeriale (D268/D276), TDD vero, senza database.
**Rami letti:** `.superpowers/sdd/intervento-task-2-brief.md` (per intero) ·
`docs/superpowers/specs/2026-08-06-intervento-post-consegna-design.md` (per intera, §5 e §6 in
particolare) · `supabase/migrations/20260806140823_eventi_qualita.sql` (i sei vocabolari, alla
lettera) · `supabase/migrations/20260806142910_correzione_eventi_qualita_cross_tenant.sql` (per
verificare che NON tocchi i CHECK dei vocabolari — non li tocca) ·
`src/lib/domain/prescrizione-costanti.ts:53-58` (il caso 5 già modellato) ·
`tests/unit/eventi-qualita-schema.test.ts` (per capire come Task 1 verifica i CHECK, e per il grep
R-P6 sotto).
**Rami NON letti:** il resto della migration `20260806142910` (righe fuori dai CHECK, non
pertinenti al dizionario) · `docs/superpowers/plans/2026-08-06-intervento-post-consegna.md` è stato
consultato SOLO per il confine di mandato coi Task 3-5 (righe attorno a "Task 3", "Task 4", "422",
citate in RITROVAMENTI/autorevisione, non eseguite).

---

## 1. Passo 1 — le 11 prove, alla lettera del brief

File creato: `tests/unit/qualita-classifica.test.ts`, copiato **verbatim** dal blocco del brief
(righe 23-95 del brief). Nessuna riformulazione.

## 2. Passo 2 — il primo rosso, e il conteggio dello stub inerte (R-P4)

**Comando:**
```bash
npx vitest run tests/unit/qualita-classifica.test.ts
```

**Primo rosso — modulo assente (output reale):**
```
 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 ❯ tests/unit/qualita-classifica.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/qualita-classifica.test.ts [ tests/unit/qualita-classifica.test.ts ]
Error: Failed to resolve import "@/lib/qualita/classifica" from "tests/unit/qualita-classifica.test.ts". Does the file exist?
  Plugin: vite:import-analysis
...
 Test Files  1 failed (1)
      Tests  no tests
```
0 test eseguiti: un rosso da modulo mancante, come atteso — non prova ancora nulla sulle asserzioni.

**Poi lo stub inerte** (`src/lib/qualita/classifica.ts`), esattamente come indicato dal brief:
```typescript
export function classifica() { return { esito: 'nessuna_azione', perche: '', ramoIso: '8.3.2', termineOre: null } }
```

**Rilancio — output reale:**
```
 Tests  9 failed | 2 passed (11)
```

### 🔴 CONTEGGIO: **2 su 11**

Le due che si accendono per coincidenza col valore fisso dello stub, non perché provino qualcosa:

1. **`il difetto visto in casa PRIMA che esca è §8.3.2, non §8.3.3`** — asserisce solo
   `p.ramoIso === '8.3.2'`, e lo stub restituisce sempre `ramoIso: '8.3.2'`.
2. **`la richiesta clinica nuova NON è una non conformità`** — asserisce solo
   `p.esito === 'nessuna_azione'`, e lo stub restituisce sempre `esito: 'nessuna_azione'`.

Le altre 9 falliscono correttamente contro valori diversi da quelli fissi dello stub (`reclamo`,
`incidente`, `incidente_grave`, `non_conformita_interna`, `perche.length > 10`) — **prova che le 9
asserzioni misurano davvero un comportamento**, non un placeholder. Le 2 che si accendono sono un
falso positivo dichiarato, non un successo: nessuna delle due prova l'ordine ministeriale, provano
solo che quei due valori letterali coincidono.

## 3. Passo 3 — implementazione, alla lettera del brief

`src/lib/domain/qualita-costanti.ts` (🆕) — i sei vocabolari copiati **valore per valore, ordine per
ordine** dai CHECK di `supabase/migrations/20260806140823_eventi_qualita.sql`:

| Vocabolario | Righe migration | Voci |
|---|---|---|
| `motivo` → `Motivo` | `:10-13` | 9: `errore_dato_dichiarazione, difetto_lavorazione, difetto_materiale, destinatario_errato, modifica_clinica_richiesta, errore_prezzo_quantita, reso_senza_difetto, errore_registrazione, altro` |
| `natura` → `Natura` | `:15-17` | 7: `dato_documentale, difetto_fisico, identificazione_destinatario, nuova_esigenza_clinica, nessun_difetto, commerciale, errore_registrazione` |
| `origine_informazione` → `OrigineInformazione` | `:18-20` | 5: `laboratorio_interno, odontoiatra, paziente_tramite_medico, autorita_competente, altro_operatore` |
| `stato_dispositivo` → `StatoDispositivo` | `:22-23` | 4: `mai_uscito_dal_lab, consegnato_non_applicato, applicato, non_noto` |
| `potenziale_di_danno` → `PotenzialeDiDanno` | `:24-25` | 4: `nessuno, da_valutare, possibile, accertato` |
| `esito` → `Esito` (in `valutazioni_evento`) | `:38-40` | 5: `nessuna_azione, non_conformita_interna, reclamo, incidente, incidente_grave` |

Confrontati carattere per carattere col file di migration: **combaciano esattamente**, nessuna voce
in più o in meno.

`naturaDaMotivo()` implementa la tabella motivo→natura di spec §5 con un `Record` esaustivo
(TypeScript obbliga tutte le 8 chiavi non-`altro`; `altro` è gestito a parte con `return null`).

**Il riferimento al caso 5 (R-P2), verificato di persona:**
`src/lib/domain/prescrizione-costanti.ts:53-58` è
```typescript
export const MOTIVI_DIVERGENZA = [
  'richiesta_dentista',
  'esigenza_tecnica',
  'materiale_non_disponibile',
  'altro',
] as const
```
**Corrisponde esattamente** a quanto scritto nel brief e nella spec: `richiesta_dentista` è la prima
voce dell'array `MOTIVI_DIVERGENZA`, righe 53-58. Nessun disallineamento — il riferimento è esatto.
`qualita-costanti.ts` vi rimanda con un commento sulla voce `modifica_clinica_richiesta` della
mappa `NATURA_DA_MOTIVO`, senza duplicare il vocabolario.

`src/lib/qualita/classifica.ts` (🆕) — `classifica()` implementata **verbatim** dal blocco del
brief (righe 111-139), con `FattiEvento` e `Proposta` tipizzati sui vocabolari di
`qualita-costanti.ts` (non ridichiarati a mano).

## 4. Passo 4 — verde, e il censimento delle forme d'input (R-P4)

**Comando:**
```bash
npx vitest run tests/unit/qualita-classifica.test.ts
```
**Output reale:**
```
 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  18:17:51
   Duration  444ms
```
**11 su 11 verdi**, come atteso dal brief.

### Censimento delle forme d'input

`classifica()` e `naturaDaMotivo()` sono funzioni **pure e tipizzate**: non fanno validazione
runtime (nessun 422, nessun guard `isXxx`). Per disegno dell'ondata questo NON è un buco: la
validazione runtime del payload (motivo fuori vocabolario → 422) è mandato del **Task 4** (le due
rotte `src/app/api/lavori/[id]/eventi-qualita/route.ts` e
`src/app/api/eventi-qualita/[id]/valutazioni/route.ts`, che nel piano d'esecuzione
(`docs/superpowers/plans/2026-08-06-intervento-post-consegna.md`, sezione Task 4) hanno la prova
esplicita "rifiuta un motivo fuori vocabolario con 422" — stesso schema già in casa con
`isFonteTipo`/`isMotivoDivergenza` in `prescrizione-costanti.ts`). Le rotte validano **prima** di
costruire il `FattiEvento` e chiamare `classifica()`.

Per completare comunque il censimento richiesto (R-P4), ho scritto una **sonda usa-e-getta**
(`tests/unit/zz-probe-classifica.test.ts`, mai committata — cancellata dopo la corsa, come un
`transazione annullata` per il codice TS) che forza con `as never`/`as FattiEvento` gli input
malformati che TypeScript altrimenti impedirebbe. Risultati reali, uno per campo × quattro forme:

| Campo | Forma | Coperta da | Risultato empirico (sonda, non committata) |
|---|---|---|---|
| `potenzialeDiDanno` | fuori vocabolario (`'boh'`) | **non coperta**, perché nessuna delle 11 prove passa un valore fuori dai 4 ammessi — ma il ramo `① if (f.potenzialeDiDanno !== 'nessuno')` tratta qualunque valore ≠ `'nessuno'` come candidato incidente | `esito: 'incidente'` (fail-safe: tratta l'ignoto come "non nessuno", mai come "nessuno") |
| `potenzialeDiDanno` | campo assente (`undefined`) | non coperta, stesso motivo | `esito: 'incidente'` (identico: `undefined !== 'nessuno'` è vero) |
| `potenzialeDiDanno` | `null` | non coperta, stesso motivo | `esito: 'incidente'` |
| `potenzialeDiDanno` | tipo sbagliato (`42`, `[]`) | non coperta, stesso motivo | `esito: 'incidente'` in entrambi i casi |
| `natura` | fuori vocabolario / assente / `null` | non coperta — nessuna delle 11 prove passa una `natura` invalida; solo `nuova_esigenza_clinica`/`commerciale`/`errore_registrazione` sono controllati per uguaglianza esplicita in ①-bis | `esito: 'reclamo'` (fail-safe nell'altra direzione: un valore ignoto NON esce per «nessuna azione», cade nel percorso normale) |
| `origine` | fuori vocabolario / assente / `null` | non coperta — solo `'laboratorio_interno'` è controllato per uguaglianza in ② | `esito: 'reclamo'` (tratta l'ignoto come "non interno", cioè la classificazione con più obblighi, non meno) |
| `statoDispositivo` | fuori vocabolario / assente / `null` | non coperta — solo `'mai_uscito_dal_lab'` è controllato per uguaglianza nel calcolo di `uscito` | `esito: 'reclamo'` (tratta l'ignoto come "uscito dal lab", di nuovo verso più obblighi) |
| `f` (l'intero oggetto) | `null` | **non coperta, e qui la sonda ha trovato un comportamento diverso**: non c'è alcun fallback | `TypeError: Cannot read properties of null (reading 'potenzialeDiDanno')` — ECCEZIONE non gestita, non una `Proposta` |
| `f` | `{}` (oggetto vuoto) | non coperta | `esito: 'incidente'` (ricade nel caso "`potenzialeDiDanno` assente") |
| `naturaDaMotivo` | `'altro'` | **coperta solo dalla firma dichiarata**, nessuna delle 11 prove chiama `naturaDaMotivo` (tutte e 11 esercitano solo `classifica`) | `null`, esplicito, per contratto |
| `naturaDaMotivo` | fuori vocabolario (`'boh'`), `null`, `undefined` | **non coperta** — nessuna prova committata la esercita | `undefined` (il lookup sul `Record` non trova la chiave) — **viola silenziosamente la firma dichiarata `Natura \| null`**: chi forza il tipo con un cast riceve `undefined`, non `null`. Non è un rischio a runtime nel flusso previsto (Task 4 valida `Motivo` prima di chiamare), ma è un fatto vero sulla funzione e va scritto |

~~**Il fatto che conta, per chi scriverà il Task 4:** ogni forma malformata che `classifica()`
digerisce senza eccezione **degrada verso la classificazione più cautelativa, mai verso «nessuna
azione»** — `potenzialeDiDanno` ignoto → `incidente` (mai `nessuno`); `natura`/`origine`/
`statoDispositivo` ignoti → `reclamo` (mai l'esenzione ①-bis, che richiede un'uguaglianza esplicita
con una delle tre nature esenti). **L'unica eccezione è l'intero oggetto `null`, che non degrada:
esplode.**~~

### 🔄 CENSIMENTO AGGIORNATO (ri-revisione, 06/08/2026) — il paragrafo sopra era diventato FALSO in tre punti

**Perché è stato aggiornato:** la correzione D277-D279 (sessione successiva, stesso file, sezione
sotto) ha inserito nel percorso di `classifica()` due `switch` esaustivi-sul-tipo
(`descriviProvenienza`, `descriviStatoDispositivo`) e una destrutturazione (`esitoDaGravita`)
senza nessun ramo di riserva. Il paragrafo qui sopra descriveva il comportamento di UNA versione
di `classifica()` che, dopo quella correzione, non esiste più: tre dei suoi ingressi malformati
non degradano più, **esplodono**. La ri-revisione del Task 2 ha misurato il comportamento REALE
(sonda usa-e-getta, `tests/unit/zz-probe-ri-revisione.test.ts`, mai committata, cancellata dopo la
corsa — stesso protocollo della sonda originale) e questa sessione ha chiuso la regressione. La
tabella e il paragrafo che seguono sono le misure **DOPO** la chiusura, non prima.

| Campo | Forma | Comportamento misurato oggi (post ri-revisione) |
|---|---|---|
| `statoDispositivo` | fuori vocabolario / assente / `null` / tipo sbagliato | 🔄 **Regredito a `TypeError` dopo D277-D279, richiuso da questa sessione.** Oggi: `esito: 'reclamo'`, `perche` composto con un testo dedicato ("non sappiamo con certezza se il dispositivo fosse già uscito..."), MAI la parola `undefined` |
| `origine` | fuori vocabolario / assente / `null` | 🔄 **Regredito: restava `'reclamo'`, ma il `perche` conteneva la parola letterale `undefined`. Richiuso da questa sessione.** Oggi: `esito: 'reclamo'`, `perche` con un testo dedicato ("non sappiamo con certezza da dove sia arrivata la segnalazione"), MAI `undefined` |
| `rispostaGravita` | fuori vocabolario / `null` / tipo sbagliato | 🆕 **Riga NUOVA — questo parametro non esisteva nel Task 2 originale, è arrivato con D277.** Prima di questa sessione: `TypeError` alla destrutturazione. Oggi: `esito: 'incidente'`, `termineOre: null`, stessa domanda in chiaro di "nessuna risposta ancora data" (`isRispostaGravitaIncidente`, guardia nuova in `qualita-costanti.ts`) — MAI una gravità indovinata da un valore a caso (violerebbe D277) |
| `natura` | fuori vocabolario / assente / `null` | **Invariato, non toccato da questa sessione** — `esito: 'reclamo'` (fail-safe: un valore ignoto non esce mai per «nessuna azione») |
| `potenzialeDiDanno` | fuori vocabolario / assente / `null` / tipo sbagliato | **Invariato, non toccato da questa sessione** — `esito: 'incidente'` (fail-safe: qualunque valore ≠ `'nessuno'` è candidato incidente) |
| `f` (l'intero oggetto) | `null` | **Invariato, non toccato da questa sessione — resta l'unica eccezione reale**: `TypeError: Cannot read properties of null (reading 'statoDispositivo')` |
| `f` | `{}` (oggetto vuoto) | **Invariato** — `esito: 'incidente'` (ricade nel caso "tutti i campi assenti") |

**Il fatto che conta oggi, per chi scriverà il Task 4:** il paragrafo originale torna VERO, ma con
una condizione in più che prima non esisteva. Ogni forma malformata che `classifica()` digerisce
senza eccezione degrada verso la classificazione più cautelativa, mai verso «nessuna azione» —
questo vale ANCHE per `rispostaGravita`, che non era coperto nella prima stesura di questo referto
perché non esisteva ancora. **L'unica eccezione resta l'intero oggetto `null`**, non toccata da
questo mandato (fuori mandato: nessuna richiesta di chiuderla in questa sessione). A differenza
della prima stesura, però, la robustezza sui tre campi appena richiusi **non è più una proprietà
emergente della struttura a uguaglianze**: è una guardia scritta apposta
(`isRispostaGravitaIncidente`) più due rami di riserva espliciti nei `switch` di testo — perché la
correzione D277-D279 aveva rotto la proprietà emergente originale, e una proprietà rotta una volta
si protegge con codice, non si spera che regga di nuovo.

## 5. Passo 5 — verifica finale e salvataggio

**tsc (output reale):**
```bash
$ npx tsc --noEmit
$ echo $?
0
```
Nessun output, nessun errore — zero errori TypeScript su tutto il progetto.

**vitest, intera suite unit (output reale):**
```bash
$ npx vitest run tests/unit
 Test Files  431 passed (431)
      Tests  5099 passed (5099)
   Duration  40.46s
```
431 file di test, 5099 prove, tutte verdi (compresa la nuova `qualita-classifica.test.ts`, 11/11).

**next build (output reale):**
```bash
$ npx next build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 3.2s
  Running TypeScript ...
  Finished TypeScript in 11.2s ...
✓ Generating static pages using 15 workers (82/82) in 165ms
```
Build di produzione riuscita. (L'unico warning è preesistente e non correlato: la deprecazione
`middleware` → `proxy`.)

**Grep R-P6 — nessun dizionario parallelo (istruzione dell'advisor, eseguita prima del commit):**
```bash
$ grep -rn "errore_dato_dichiarazione\|non_conformita_interna\|consegnato_non_applicato\|nuova_esigenza_clinica" src tests scripts --include="*.ts" --include="*.tsx" | grep -v "qualita-costanti.ts\|qualita/classifica.ts\|qualita-classifica.test.ts"

tests/unit/eventi-qualita-schema.test.ts:54:      'errore_dato_dichiarazione', 'difetto_lavorazione', 'difetto_materiale',
tests/unit/eventi-qualita-schema.test.ts:64:    expect(voci).toEqual(['mai_uscito_dal_lab', 'consegnato_non_applicato', 'applicato', 'non_noto'])
tests/unit/eventi-qualita-schema.test.ts:106:      'nessuna_azione', 'non_conformita_interna', 'reclamo', 'incidente', 'incidente_grave',
```
**3 hit, tutti in `tests/unit/eventi-qualita-schema.test.ts` (Task 1)**~~ — e non sono una copia
indipendente: quel file estrae i valori dal testo della migration a runtime via regex
(`sqlTabelle.match(...)`), non li ridichiara. **Zero copie TS hardcoded al di fuori di
`qualita-costanti.ts`.**~~ Nessun `nuova_esigenza_clinica` fuori dai miei file: zero hit su quel
termine altrove.

### 🔄 CORRETTO (ri-revisione, 06/08/2026) — «zero copie TS hardcoded» era FALSO

Le tre righe grep **SONO** liste TypeScript scritte a mano (`tests/unit/eventi-qualita-schema.test.ts:53-57`
i nove motivi, `:64` i quattro stati, `:105-107` i cinque esiti) — verificabile a colpo d'occhio,
sono array-letterali `['errore_dato_dichiarazione', ...]` dentro `expect(voci).toEqual([...])`. La
frase «non li ridichiara» era imprecisa: il file **ridichiara eccome**, sul lato "atteso" del
confronto — l'errore era aver guardato solo il lato "estratto" (`sqlTabelle.match(...)`, quello sì
dinamico) e aver concluso per il file intero.

**La CONCLUSIONE, però, regge — e va spiegata bene, non cancellata.** Quelle tre liste sono il
lato *atteso* di un confronto contro il testo della migration, non un dizionario indipendente che
qualcun altro consulta: sono una **spia sulla migration** (Task 1), non sulla `qualita-costanti.ts`
di questo Task 2. La differenza conta perché decide COSA si accende quando qualcosa cambia:
- Se un domani si aggiunge una voce al `CHECK` della migration, `sqlTabelle.match(...)` la estrae,
  il confronto con la lista scritta a mano fallisce, **quel test diventa rosso**, e chi lo vede
  rosso aggiorna la lista in `eventi-qualita-schema.test.ts` per farlo tornare verde.
- Ma quell'aggiornamento **non tocca `qualita-costanti.ts`**: i due file non sono collegati da
  nessun import né da nessuna asserzione incrociata. `MOTIVI`/`NATURE`/ecc. in
  `qualita-costanti.ts` possono restare VECCHI, disallineati dalla migration vera, senza che
  **niente diventi rosso** — esattamente il buco già segnalato come RITROVAMENTO #1 di questo
  stesso referto («nessuna "spia" lega `qualita-costanti.ts` ai CHECK vivi del database»), qui
  confermato con una prova diretta invece che per deduzione.

Nessun `nuova_esigenza_clinica` fuori dai miei file: zero hit su quel termine altrove (questa parte
della verifica resta valida, non riguarda le tre liste sopra).

**Commit (git):**
```bash
git add src/lib/domain/qualita-costanti.ts src/lib/qualita/classifica.ts tests/unit/qualita-classifica.test.ts
git commit -m "feat(qualita): i tre test nell'ordine ministeriale, come funzione pura

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
Esito reale: `10c2da7b`, pre-commit hook verde (eslint --max-warnings=0, DS compliance, guardia
CSRF, guardia coerenza documenti, guardia salvataggio automatico), 3 file, 248 inserimenti.

⚠️ **Correzione a me stesso, fatta prima di chiudere.** Avevo previsto un secondo commit per
questo stesso referto. `git add .superpowers/sdd/intervento-task-2-report.md` è stato **rifiutato**:
`.superpowers/` è interamente in `.gitignore` (riga 140), e `git ls-files .superpowers/sdd/` non
traccia NESSUN file di quella cartella — nemmeno `intervento-task-1-report.md`. Il referto resta
quindi **solo su disco**, come tutti gli altri referti dell'ondata: non è un difetto, è la
convenzione del progetto per questa cartella. Non esiste un secondo commit.

---

## Autorevisione

- **Il brief è stato seguito alla lettera**: firme, tipi, valori del «perché», rami ISO, termini in
  ore — nessuna riformulazione. Ho verificato con carta e penna tutti gli 11 casi contro
  l'implementazione del brief prima di scriverla, e i risultati empirici (Passo 4) confermano.
- **Ho corretto due parole nel MIO commento JSDoc** (non nel codice del brief): la nota su
  `naturaDaMotivo` diceva «l'utente scelta fra le altre sei», italiano rotto e conteggio sbagliato
  (`natura` ha 7 valori, nessuno dei quali è `altro` — che è un valore di `motivo`, non di
  `natura`). Corretto in «l'utente la sceglie fra le sette». Questa non è una modifica al brief: è
  un commento che ho scritto io in questa sessione, in un file che ho creato io.
- **Non ho aggiunto guardie runtime** (`isMotivo`, `isNatura`, ecc.) benché il pattern esista già in
  `prescrizione-costanti.ts` (`isFonteTipo`, `isMotivoDivergenza`). Ho verificato (leggendo SOLO le
  righe di censimento del piano di esecuzione riguardanti il confine di mandato, non eseguendole)
  che il Task 4 porta già la prova "rifiuta un motivo fuori vocabolario con 422" sulle rotte, con lo
  stesso modello. Aggiungere guardie qui sarebbe uscito dall'interfaccia che il brief elenca
  ("Interfacce prodotte": solo `Natura`, `Esito`, `naturaDaMotivo`, `classifica`) — l'ho quindi
  lasciato al Task 4, che ha gli array `MOTIVI`/`NATURE`/ecc. già esportati e pronti da consumare
  (es. `(MOTIVI as readonly string[]).includes(v)`), senza bisogno di una quarta copia.
- **`naturaDaMotivo` non ha copertura nelle 11 prove committate** (tutte e 11 esercitano solo
  `classifica`). È coerente col brief, che specifica esattamente 11 prove — non ne ho aggiunta una
  dodicesima. La verifica della mappa motivo→natura è stata fatta a mano contro la tabella di spec
  §5 (Passo 3) e con la sonda usa-e-getta (Passo 4), non con una prova committata.
- **Nessuna guardia lega i sei vocabolari di `qualita-costanti.ts` al CHECK vivo del database**
  (a differenza di `prescrizione-costanti.ts`, che ha una "spia" dedicata,
  `tests/unit/prescrizione-costanti-spia-migration.test.ts`, perché — come quel file stesso
  documenta — `tsc` non vede le query). Questo è un vuoto dichiarato, non un difetto corretto in
  silenzio: va in RITROVAMENTI, perché toccare quella rete è una decisione che spetta a chi
  possiede il Task 1/il censimento complessivo dell'ondata, non a un compito che deve restare "un
  compito alla volta" (R-E1).
- **BP-1 (aggiornamento di `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md`) NON è stato
  eseguito.** Il mio mandato, come consegnato, è scopato esplicitamente ai cinque passi del brief +
  il referto in questa cartella; non menziona BP-1, e il git log di questa ondata mostra che gli
  aggiornamenti di memoria vivono in commit `docs(memoria):` separati e intercalati fra i task — non
  dentro il commit di un singolo task. Non l'ho fatto perché non è nel mio mandato dichiarato, non
  perché l'ho dimenticato: lo scrivo qui perché **BP-1 resta un passo dovuto da qualcuno**, e non
  deve sparire per il fatto che io non l'ho toccato.

---

## RITROVAMENTI (fuori mandato — riferiti, non corretti, R-E2)

1. 🟡 **Nessuna "spia" lega `qualita-costanti.ts` ai CHECK vivi del database.** Precedente in casa:
   `prescrizione-costanti.ts:6-15` spiega perché serve una spia dedicata (`tsc` non vede le query;
   i quattro fabbricanti del client Supabase creano il client senza il generico `<Database>`).
   Oggi i sei vocabolari di questo task sono allineati **a mano, verificati riga per riga** contro
   `20260806140823_eventi_qualita.sql`, ma nessun test automatico si accorgerebbe di una migration
   futura che aggiunge/rimuove una voce. Destinazione proposta: un file gemello,
   `tests/unit/qualita-costanti-spia-migration.test.ts` (stesso pattern di
   `prescrizione-costanti-spia-migration.test.ts`), oppure un'estensione di
   `tests/unit/eventi-qualita-schema.test.ts` (che già legge la stessa migration via regex) — non
   decido io quale dei due, è una scelta che compete a chi possiede la vista d'insieme dell'ondata.
2. ⚪ **`naturaDaMotivo` restituisce `undefined` (non `null`) su un `motivo` fuori dall'unione TS
   `Motivo`, se qualcuno forza il tipo con un cast** (`as never`, `as Motivo`) — violazione
   silenziosa della firma dichiarata `Natura | null`. Non è un rischio nel flusso previsto (il
   chiamante valida `Motivo` prima, per costruzione — vedi autorevisione), ma il fatto è vero e
   verificato empiricamente (sonda, Passo 4). Nessuna azione richiesta ora; da tenere a mente se il
   Task 4 (o un futuro consumatore) chiama `naturaDaMotivo` con un valore non ancora validato.
3. ⚪ **`classifica(null as any)` lancia un `TypeError` non gestito** invece di restituire una
   `Proposta` o un errore tipizzato. Coerente con la firma (`FattiEvento` non è nullable) e col
   fatto che la validazione dell'input vive nel Task 4, non qui — ma è un comportamento diverso da
   tutti gli altri campi malformati (che degradano verso una classificazione più cautelativa invece
   di esplodere), e chi scriverà la rotta del Task 4 deve saperlo: se costruisce l'oggetto
   `FattiEvento` con `Object.assign` o spread da un body parzialmente `null`, l'eccezione arriva da
   `classifica()`, non dalla rotta.

Nessuno dei tre punti sopra è stato toccato: nessuna migration, nessun altro task, nessuna "aggiunta
silenziosa" di guardie runtime nell'interfaccia che il brief ha già chiuso.

---

# CORREZIONI D277-D279 (06/08/2026, sessione di correzione post-revisione)

**Mandato:** applicare in un solo giro le tre decisioni ratificate da Francesco sulla revisione del
Task 2 (verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, centododicesima
tornata; commit dei soli documenti: `64191c21`) — D278 (mai uscito dal laboratorio ⇒ mai un
incidente), D277 (la gravità si chiede, non si deduce) e D279 (il perché si compone dai fatti
registrati) — più le tre lacune di copertura trovate dalla stessa revisione e il ritrovamento
sulla guardia di `naturaDaMotivo` (già segnalato come RITROVAMENTO #2 nella sezione sopra, di
questo stesso file, e ora chiuso).

**File toccati:** `src/lib/domain/qualita-costanti.ts` · `src/lib/qualita/classifica.ts` ·
`tests/unit/qualita-classifica.test.ts` (aggiornato) · `tests/unit/qualita-costanti.test.ts`
(🆕, non esisteva — nessuna prova precedente toccava `naturaDaMotivo`, coerente col
RITROVAMENTO #2 di sopra: le 11 prove originali esercitavano solo `classifica`).

## 1. Un punto di interpretazione risolto prima di scrivere codice

Il brief D278 elenca, fra i «qualunque sia», solo `potenzialeDiDanno` e `origine` — **non**
`natura`. Prima di implementare ho verificato con l'advisor se questo fosse un'omissione o una
scelta: la lettura corretta è che **è la lettera esatta della regola**. D278 è un vincolo di
*scope* sul passo ① («il passo ① si applica SOLO a un dispositivo uscito»), non una regola nuova:
basta aggiungere `uscito &&` alla condizione del passo ①, e le esenzioni di natura (①-bis, D276)
restano intoccate perché stanno DOPO, esattamente come stavano prima. Non c'è collisione fra D276 e
D278 perché, per un dispositivo mai uscito, il passo ① non produce mai un incidente (D278) — quindi
non c'è nessun incidente che l'esenzione di natura potrebbe nascondere (la preoccupazione che ha
generato D276). Verificato con un test dedicato (`una natura ESENTE (D276) resta nessuna azione
anche se il dispositivo non è mai uscito`).

## 2. Comandi e OUTPUT REALE

### 2a. Rosso genuino — `naturaDaMotivo`, PRIMA della guardia

Ho scritto `tests/unit/qualita-costanti.test.ts` (20 prove) e temporaneamente **rimesso in
stash** solo `src/lib/domain/qualita-costanti.ts` (`git stash push -- src/lib/domain/qualita-costanti.ts`)
per essere certo che il rosso fosse contro il codice ORIGINALE, non contro una modifica già scritta
a mente. Comando: `npx vitest run tests/unit/qualita-costanti.test.ts`

```
 FAIL  tests/unit/qualita-costanti.test.ts > ... > «constructor» NON risale al prototipo di Object: null, non una funzione
AssertionError: expected [Function: Object] to be null // Object.is equality
 FAIL  tests/unit/qualita-costanti.test.ts > ... > un array → null
AssertionError: expected 'difetto_fisico' to be null
 FAIL  tests/unit/qualita-costanti.test.ts > ... > un oggetto → null
AssertionError: expected undefined to be null
 FAIL  tests/unit/qualita-costanti.test.ts > ... > una stringa fuori vocabolario ("pippo") → null
AssertionError: expected undefined to be null
...
 Test Files  1 failed (1)
      Tests  11 failed | 9 passed (20)
```

`git stash pop` per riportare la guardia, rilancio:

```
 Test Files  1 passed (1)
      Tests  20 passed (20)
```

### 2b. Rosso genuino — `classifica`, PRIMA di D277/D278/D279

Ho scritto la versione estesa di `tests/unit/qualita-classifica.test.ts` (34 prove: le 11 originali,
di cui 2 aggiornate, più 23 nuove) e l'ho lanciata contro `classifica.ts` **non ancora toccato**.
Comando: `npx vitest run tests/unit/qualita-classifica.test.ts`

```
 FAIL  ... > il danno ACCERTATO è un incidente, ma la gravità si CHIEDE ...
AssertionError: expected 'incidente_grave' to be 'incidente'
 FAIL  ... > minaccia grave alla salute pubblica (Art. 87(4)): 2 giorni, non 15
AssertionError: expected 360 to be 48         // il vecchio codice ignorava la risposta e dava sempre 15gg
 FAIL  ... > CASO NORMALE (non il raro): mai uscito + danno ACCERTATO resta non conformità interna ...
AssertionError: expected 'incidente_grave' to be 'non_conformita_interna'
 FAIL  ... > dispositivo APPLICATO, segnalato dall'odontoiatra: il perché non nega che fosse applicato
AssertionError: expected '...per la norma è un reclamo, anche se non è ancora stato applicato.'
  not to contain 'non è ancora stato applicato'
 FAIL  ... > stato NON NOTO, visto dal laboratorio: il perché non afferma con certezza che fosse già uscito
AssertionError: expected 'Ce ne siamo accorti noi, a dispositivo già uscito.' not to contain 'a dispositivo già uscito'
 FAIL  ... > mai uscito dal laboratorio, segnalato dall'odontoiatra: il perché non dice "ce ne siamo accorti noi"
AssertionError: expected 'Ce ne siamo accorti noi, prima che uscisse.' not to match /^Ce ne siamo accorti noi/
 FAIL  ... > 'non_conformita_interna — §8.3.2 (D278...'
AssertionError: expected 'incidente_grave' to be 'non_conformita_interna'
 FAIL  ... > 'incidente_grave — minaccia salute pubblica' / 'morte o deterioramento' / 'regola generale' (×3)
AssertionError: expected 'incidente' to be 'incidente_grave'

 Test Files  1 failed (1)
      Tests  15 failed | 19 passed (34)
```

15 rosse su 15 attese (le 6 nuove D277 + le 2 D278 + le 3 D279 + le 3 di copertura del `perche` sui
rami nuovi + il caso `natura esente` + il gap `commerciale`), 19 verdi per coincidenza dove il
comportamento vecchio e quello nuovo combaciano già (es. i casi che non toccano mai uscito/gravità).

### 2c. Verde, dopo l'implementazione

```
npx vitest run tests/unit/qualita-classifica.test.ts tests/unit/qualita-costanti.test.ts
 Test Files  2 passed (2)
      Tests  54 passed (54)
```

### 2d. I tre comandi del mandato, per intero

```
$ npx tsc --noEmit
(nessun output — zero errori)

$ npx vitest run tests/unit
 Test Files  432 passed (432)
      Tests  5142 passed (5142)
   Duration  39.74s

$ npx next build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 3.1s
  Running TypeScript ...
  Finished TypeScript in 11.2s ...
✓ Generating static pages using 15 workers (82/82) in 162ms
(82 route compilate, incluse le nuove /qualita/*; nessun errore — solo il warning preesistente e
non pertinente sulla convenzione "middleware" → "proxy", non toccato da questo mandato)
```

## 3. Le due prove AGGIORNATE, e perché

- **`il danno ACCERTATO su persona è incidente GRAVE, con il termine dei 15 giorni`** →
  rinominata **`⚖️ D277 — il danno ACCERTATO è un incidente, ma la gravità si CHIEDE: senza
  risposta resta in attesa, termine vuoto`**. Cambiata perché D277 vieta di dedurre «grave» da
  `potenzialeDiDanno === 'accertato'`: la vecchia asserzione (`incidente_grave`, 15×24) è
  esattamente il comportamento che D277 chiude. La nuova asserisce `incidente` + `termineOre: null`
  e verifica che il `perche` porti la domanda dell'Art. 2(65) in chiaro (`toContain('?')`).
  **Non cancellata**: è affiancata da 3 prove nuove (una per ciascun termine di legge) più una che
  verifica che `accertato` + risposta esplicita `'non_grave'` resti `incidente` — il punto esatto
  che D277 richiede di non aggirare.
- **`🛑 «richiesta clinica nuova» NON scavalca il test dell'incidente: col danno accertato è
  incidente GRAVE`** → titolo aggiornato in **`... con la gravità confermata è incidente GRAVE`**,
  corpo aggiornato per passare `'grave_regola_generale'` come secondo argomento. Cambiata per lo
  stesso motivo della precedente, ma qui l'assunto originale (D276: una natura esente non scavalca
  il test dell'incidente) resta intatto e VERIFICATO fino in fondo — fino a `incidente_grave` con
  15×24 — solo con la risposta di gravità esplicitata invece che dedotta.

## 4. Una decisione presa contro la lettera del mio stesso mandato — e perché

Il mandato descrive una prova esistente da aggiornare come «il caso «mai uscito» col ramo 8.3.3».
**Non esiste, e non l'ho creata per farla combaciare.** Ho verificato con un grep (`mai_uscito_dal_lab`
su `tests/`, `src/`, e sul brief originale del Task 2): l'UNICA prova con `mai_uscito_dal_lab`
(riga 41, `il difetto visto in casa PRIMA che esce è §8.3.2, non §8.3.3`) usa `potenzialeDiDanno:
'nessuno'` (dal default di `base`) — con quell'ingresso il passo ① non si accende **né prima né
dopo** questa correzione, quindi quella prova non ha mai asserito, nemmeno per un istante, il ramo
8.3.3: è verde identica prima e dopo, e l'ho lasciata **intatta**, non toccata.
Ho consultato l'advisor su questo punto prima di agire: forzarla (per esempio cambiandole
`potenzialeDiDanno` in `'accertato'` per farla "sembrare" la prova descritta) avrebbe SOTTRATTO
l'unica copertura oggi esistente del caso «mai uscito + nessun danno» per inseguire una frase del
brief che non corrisponde a niente nel codice. Ho invece **aggiunto** una prova NUOVA
(`🛑 CASO NORMALE (non il raro): mai uscito + danno ACCERTATO resta non conformità interna, non
incidente grave`) che copre esattamente lo scenario mancante, e riferisco l'imprecisione del brief
qui sotto, in RITROVAMENTI, invece di far quadrare in silenzio una frase con un test che non le
corrisponde.

## 5. Le prove nuove, e cosa proteggono

**D278 (4 prove, descrizione §2 sopra):**
- caso normale (mai uscito + accertato, origine odontoiatra da `base`) → non conformità
  interna/8.3.2, non incidente grave — il difetto principale che D278 corregge.
- stessa cosa con `origine: 'laboratorio_interno'` esplicito → prova che «qualunque sia l'origine»
  vale nei due sensi (interna ed esterna), non solo nel default di `base`.
- con la risposta di gravità già fornita → resta non conformità interna: la domanda non si pone
  nemmeno, D278 vince prima che D277 abbia un ruolo.
- natura esente (`commerciale`) + mai uscito + accertato → `nessuna_azione`: prova che D278 non
  scavalca D276, come discusso al punto 1.

**D277 (6 prove):** i tre termini di legge (2/10/15 giorni) singolarmente; il caso senza risposta
(`incidente`, termine vuoto, domanda in chiaro); il caso `accertato` + risposta esplicita
`'non_grave'` (il punto per cui D277 esiste: un danno accertato può essere lieve).

**D279 (3 prove, una per riga della tabella del mandato):** applicato+odontoiatra (il perché non
nega l'applicazione); non_noto+laboratorio (il perché non afferma una certezza inesistente);
mai_uscito+odontoiatra (il perché non si attribuisce una scoperta che non è sua).

**Le tre lacune di copertura:**
1. `natura: 'commerciale'` con `potenzialeDiDanno: 'nessuno'` → `nessuna_azione` (prima nessuna
   prova ci arrivava senza essere intercettata al passo ①).
2. `tests/unit/qualita-costanti.test.ts`, 20 prove: le 8 coppie motivo→natura di spec §5, `altro`
   → `null`, e la guardia (§6 sotto).
3. `it.each` su 10 rami distinti (non 5: `nessuna_azione` e `non_conformita_interna` contano due
   rami ciascuno, con testo diverso) con doppia asserzione (`esito` + `perche.length > 10`), più
   una prova che i 10 testi non collassano tutti sulla stessa stringa.

## 6. Il ritrovamento della revisione — chiuso

~~`naturaDaMotivo` ora accetta `unknown` (non più `Motivo`) e applica la stessa guardia già in casa
in `prescrizione-costanti.ts:61-74`: `new Set<string>(MOTIVI)` + `typeof motivo === 'string'`,
prima di indicizzare l'oggetto.~~ Provato: `'constructor'`, `'toString'`, `'valueOf'`, `'__proto__'`
→ tutti `null` (prima: una funzione, una funzione, una funzione, un oggetto). Provato anche con
forme non-stringa (`42`, `null`, `undefined`, array, oggetto) e con stringhe fuori vocabolario
(`'pippo'`, `'ALTRO'`) → tutti `null`.
~~**Nota sul compromesso accettato:** allargare la firma da `Motivo` a `unknown` fa perdere il
restringimento a tempo di compilazione per i chiamanti futuri (oggi nessuno: verificato con grep,
zero call site fuori da questo file e dai test). Chi consumerà questa funzione da una rotta HTTP
(prossima Task) dovrà comunque validare il proprio confine — questa guardia protegge la funzione
in sé, non sostituisce la validazione del payload a monte.~~

### 🔄 CORRETTO (ri-revisione, 06/08/2026) — la firma allargata descritta sopra non esiste più

**Il paragrafo sopra descriveva un'API che questa stessa ri-revisione ha cambiato di nuovo.** La
ri-revisione del Task 2 ha trovato che allargare `naturaDaMotivo` a `unknown` risolveva il
prototipo ma **riapriva un problema diverso**: il `null` di ritorno tornava ad avere due
significati per chi chiama («è `altro`» oppure «è spazzatura»), esattamente il difetto che il
commento sopra la funzione dichiara chiuso alla riga successiva.

**Lo stato vero, oggi:** `naturaDaMotivo(motivo: Motivo): Natura | null` — firma STRETTA, come nel
mandato originale del Task 2. La guardia sul prototipo/sui tipi estranei **non vive più dentro
`naturaDaMotivo`**: è una funzione a parte, `isMotivo(v: unknown): v is Motivo`
(`src/lib/domain/qualita-costanti.ts`), stesso idioma `Set` + `typeof v === 'string'` di
`isFonteTipo`. Le prove sul prototipo (`'constructor'`, `'toString'`, `'valueOf'`, `'__proto__'`) e
sui tipi estranei citate sopra sono state **spostate** su `isMotivo`
(`tests/unit/qualita-costanti.test.ts`), non duplicate.

⚠️ **Conseguenza per chi chiamerà `naturaDaMotivo` con un valore non ancora validato (forzando il
tipo con un cast, es. `as Motivo`):** la funzione torna a comportarsi come ORIGINARIAMENTE
descritto in questo stesso referto, RITROVAMENTO #2 (prima stesura) — un `motivo` fuori
vocabolario, cast a forza, produce `undefined` (il lookup su `NATURA_DA_MOTIVO` non trova la
chiave), non `null`, violando silenziosamente la firma dichiarata. **Non è una regressione**: è la
conseguenza accettata della scelta "firma stretta + guardia separata" — chi ha solo un `unknown`
deve chiamare `isMotivo` PRIMA di `naturaDaMotivo`, mai forzare il cast per saltare la guardia. Il
RITROVAMENTO #2 (sezione «RITROVAMENTI», sopra in questo file) resta quindi **aperto quanto al
comportamento su cast forzato**, e **chiuso quanto al percorso raccomandato** (chiamare la guardia
prima).

## 7. Autorevisione

- **Ordine finale, riletto contro la spec:** `uscito && potenzialeDiDanno !== nessuno` (①,
  D276+D278+D277) → natura esente (①-bis, D276, invariato) → `uscito && origine !== lab` (②,
  invariato) → non conformità interna con ramo dipendente da `uscito` (③, invariato nella
  struttura, cambiato nei testi per D279). È lo stesso scheletro del codice originale con
  **una sola condizione aggiunta** (`uscito &&` sul passo ①) — non un riordino: gli altri tre passi
  già portavano `uscito` esattamente dove serviva.
- **`esitoDaGravita` e i due helper di testo (`descriviProvenienza`, `descriviStatoDispositivo`)
  non sono esportati**: restano dettaglio interno di `classifica.ts`, come lo stub inerte del
  Passo 2 del referto originale — nessuna interfaccia nuova oltre `RispostaGravitaIncidente`
  (che DEVE essere esportata, perché è il tipo del secondo parametro di `classifica`).
- **Ho scelto un secondo parametro, non un campo di `FattiEvento`**, per `rispostaGravita`: la
  spec §4 separa il fatto (`eventi_qualita`) dal giudizio (`valutazioni_evento`) come due tabelle
  distinte con owner diversi (chi registra l'evento non è chi valuta la gravità, e la gravità
  arriva più tardi). Un secondo parametro opzionale rispecchia quella separazione nel tipo della
  funzione stessa, invece di aggiungere alla lista dei "fatti" un campo che di fatto è un giudizio.
- **Il testo della domanda pendente (D277, nessuna risposta) contiene un punto interrogativo**
  verificato da una prova dedicata (`toContain('?')`) — è il modo scelto per rendere "la domanda in
  chiaro" testabile senza aggiungere un campo `domanda` separato a `Proposta`, che il mandato non
  richiede e che avrebbe allargato l'interfaccia oltre le tre correzioni chieste.
- **`RISPOSTE_GRAVITA_INCIDENTE` è un vocabolario NUOVO, non legato a nessun CHECK di banca dati**
  (l'ho scritto nel commento sopra l'export, in `qualita-costanti.ts`): a differenza dei sei
  vocabolari del Task 2 originale, qui non c'è una migration da copiare alla lettera, perché la
  colonna non esiste ancora. Corretto per il mandato di oggi (classificare in memoria, senza DB);
  chi aggancerà questo motore a `valutazioni_evento` dovrà decidere se e come questo vocabolario
  diventa un CHECK, e a quel punto servirà la stessa "spia" di migration già segnalata come
  RITROVAMENTO #1 sopra per gli altri sei.
- ~~**Non ho aggiunto una guardia runtime (`isRispostaGravitaIncidente`)** per il nuovo vocabolario,
  a differenza della guardia che HO aggiunto per `naturaDaMotivo`: quella era esplicitamente
  richiesta dal mandato di oggi (il ritrovamento della revisione); questa non lo è, e
  `rispostaGravita` in questa Task arriva sempre da un chiamante TypeScript (nessun confine HTTP
  in questo mandato) — aggiungerla ora sarebbe andare oltre il compito assegnato.~~
  🔄 **CORRETTO dalla sessione di ri-revisione successiva (06/08/2026, stessa data — sezione
  «CHIUSURA RILIEVI RI-REVISIONE» in fondo a questo file):** quella sessione HA aggiunto
  `isRispostaGravitaIncidente`, perché senza validazione a monte `rispostaGravita` arriva a
  `esitoDaGravita` anche NON da un chiamante TypeScript pulito (un cast forzato, un body JSON non
  ancora validato in un futuro Task 4) — e il `switch` di quella funzione, senza ramo di riserva,
  esplodeva con un `TypeError`. Quella riga era vera nel mandato di quella sessione, non lo è più
  in quello successivo: non la cancello, la marco.
- **BP-1 non eseguito**, per lo stesso motivo dichiarato nell'autorevisione del referto originale:
  il mandato di questa sessione di correzione è scopato al codice, alle prove e a questo referto.

## RITROVAMENTI aggiuntivi di questa sessione (fuori mandato — riferiti, non corretti, R-E2)

4. 🟡 **Il testo del mandato descrive una prova («il caso «mai uscito» col ramo 8.3.3») che non
   corrisponde a nessuna prova esistente nel repository.** Verificato con grep su `tests/`, `src/`
   e sul brief originale del Task 2 (`.superpowers/sdd/intervento-task-2-brief.md`): l'unica prova
   con `mai_uscito_dal_lab` usa `potenzialeDiDanno: 'nessuno'`, che non attraversa mai il passo ①
   né prima né dopo questa correzione. Non ho forzato quella prova per farla combaciare (punto 4
   sopra); ho aggiunto la prova mancante come nuova. Segnalo perché un lettore futuro del verbale
   di decisione potrebbe cercare quella prova specifica e non trovarla — non è un difetto di
   codice, è un'imprecisione di redazione nel testo che mi è stato consegnato.
5. ⚪ **`RISPOSTE_GRAVITA_INCIDENTE` non ha ancora una colonna in banca dati né una "spia" di
   migration.** È un vocabolario dichiarato `as const` in `qualita-costanti.ts` ma, a differenza
   dei sei vocabolari del Task 2, non esiste alcun CHECK vivo da cui copiarlo: qualunque Task
   futura decida di persistere la risposta di gravità dovrà crearne uno e, con quello, la spia
   equivalente a quella già segnalata (RITROVAMENTO #1) per gli altri sei. Non è un'azione per
   questa sessione — la colonna, letteralmente, non esiste.

---

# CHIUSURA RILIEVI RI-REVISIONE (06/08/2026 — sessione «ultimo giro di sistemazioni»)

**Mandato:** chiudere in un solo commit i rilievi della ri-revisione del Task 2 — due affermazioni
false nel referto (censimento del Passo 4, e la riga «zero copie TS hardcoded»), una regressione
introdotta dalla correzione D277-D279 (tre `switch`/una destrutturazione senza ramo di riserva, che
fanno esplodere `classifica()` su un ingresso imprevisto invece di degradare), e quattro imprecisioni
minori (`naturaDaMotivo` con firma allargata a `unknown` invece di stretta + guardia separata,
un'asserzione debole `toBeGreaterThan(1)`, l'intestazione «I SEI vocabolari» ora falsa perché sono
sette, il nome `morte_o_deterioramento_non_previsto` senza la parola «grave»).

**File toccati:** `src/lib/qualita/classifica.ts` · `src/lib/domain/qualita-costanti.ts` ·
`tests/unit/qualita-classifica.test.ts` · `tests/unit/qualita-costanti.test.ts` (interamente
ristrutturato) · questo referto.

## Cosa ho cambiato, e perché

**1. La regressione (🔴, priorità di chiusura).** Tre punti in `classifica.ts` restituivano
`undefined` invece di lanciare un errore leggibile o degradare, su un ingresso che il tipo
dichiarato esclude ma che arriva comunque a runtime (nessuna validazione a monte in questo
mandato):
- `descriviProvenienza` (switch su `OrigineInformazione`) e `descriviStatoDispositivo` (switch su
  `StatoDispositivo`) sono `switch` esaustivi-sul-TIPO ma senza `default`: un valore fuori
  vocabolario cade attraverso e la funzione restituisce `undefined`, che finiva letteralmente nel
  testo del `perche` come la parola "undefined". **Fix:** un ramo `default` in ciascuno dei due
  `switch`, con un testo che non afferma nulla che non sappiamo (stesso registro di `non_noto`,
  già in casa per `statoDispositivo`) e che non cambia l'esito (`uscito`/`② origine ≠ interno`
  restano calcolati con `!==`, già robusti per costruzione).
- La destrutturazione `const { esito, termineOre, perche } = esitoDaGravita(rispostaGravita)`
  (passo ①) presupponeva che il controllo `rispostaGravita === undefined` catturasse ogni
  ingresso "non ancora risposto". Un valore fuori vocabolario, `null`, o un numero supera quel
  controllo (non è `undefined`) e cade in `esitoDaGravita`, il cui `switch` non ha `default`:
  `TypeError` alla destrutturazione. **Fix:** guardia nuova `isRispostaGravitaIncidente` (stesso
  idioma `Set` + `typeof v === 'string'` di `isFonteTipo`, `src/lib/domain/prescrizione-costanti.ts:72-74`)
  al posto del solo confronto con `undefined`. Un valore non riconosciuto è trattato come "nessuna
  risposta valida ancora data" — la stessa domanda dell'Art. 2(65) resta aperta, `termineOre: null`.
  Non ho fatto indovinare una gravità dal valore corrotto: sarebbe esattamente la deduzione che
  D277 vieta.
  Ho scelto la **normalizzazione in ingresso** (una guardia al punto di chiamata) invece di
  aggiungere `default` anche dentro `esitoDaGravita`: con la guardia, quella funzione non riceve
  mai più un valore invalido, quindi un secondo ramo di riserva lì sarebbe morto (mai eseguibile) e
  avrebbe solo duplicato la decisione già presa dalla guardia.
  Le tre prove per ciascun cammino: `tests/unit/qualita-classifica.test.ts`, describe `classifica —
  ri-revisione: un ingresso imprevisto non fa mai esplodere la funzione` (10 prove: 4 su
  `statoDispositivo`, 3 su `rispostaGravita`, 2 su `origine`, più il conteggio testi sotto).

**2. Il censimento del Passo 4 e la riga «zero copie TS hardcoded» (🛑, blocco della chiusura).**
Corretti in sezioni dedicate sopra (subito dopo il Passo 4 originale, e subito dopo il grep R-P6),
col protocollo del progetto: testo vecchio in `~~strikethrough~~`, blocco `### 🔄 CORRETTO` con la
misura reale e la spiegazione del perché era falso. Non ho cancellato il testo originale — l'ho
marcato e ho scritto sopra cosa è cambiato, per chi legge la storia del referto.

**3. `naturaDaMotivo` — firma ristretta, guardia separata (🟠).** Riportata a
`naturaDaMotivo(motivo: Motivo): Natura | null`, com'era nel mandato originale del Task 2. La
guardia sul prototipo (`'constructor'`, `'toString'`, `'valueOf'`, `'__proto__'`) e sui tipi
estranei (numero, `null`, `undefined`, array, oggetto, stringa fuori vocabolario) è ora
`isMotivo(v: unknown): v is Motivo`, una funzione a parte — stesso modello di `isFonteTipo` in
`prescrizione-costanti.ts:72-74`. Le 11 prove che prima esercitavano `naturaDaMotivo` con quei
valori sono state **spostate**, non duplicate, su `isMotivo` (`tests/unit/qualita-costanti.test.ts`,
completamente ristrutturato: `naturaDaMotivo` ora testato solo con letterali validi di `Motivo`).
Aggiunta anche una `describe` diretta per `isRispostaGravitaIncidente` (9 prove: le 4 risposte
valide + 4 forme invalide), a sostegno del fix del punto 1.

**4. L'asserzione debole (🟠).** `tests/unit/qualita-classifica.test.ts`, describe «ogni ramo
raggiungibile»: `expect(testi.size).toBeGreaterThan(1)` → `expect(testi.size).toBe(10)`, misurato
con una corsa dedicata (i dieci `perche` dei dieci rami dell'`it.each` sono risultati tutti
distinti — nessuna collisione testuale).

**5. L'intestazione di `qualita-costanti.ts` (🟠).** «I SEI vocabolari … copiati alla lettera dai
CHECK vivi» → «I SETTE vocabolari … SEI copiati alla lettera … il SETTIMO
(`RISPOSTE_GRAVITA_INCIDENTE`) NON ha un CHECK corrispondente, per scelta dichiarata».

**6. Il nome che perdeva "grave" (🟠).** `morte_o_deterioramento_non_previsto` →
`morte_o_deterioramento_grave_non_previsto`, nei 4 punti dove compariva (`qualita-costanti.ts`,
`classifica.ts`, 2× `qualita-classifica.test.ts`); grep di conferma sotto.

## Comandi e OUTPUT REALE

**TDD — rosso genuino contro il codice PRIMA del fix**, sulle 10 nuove prove di regressione
(comando: `npx vitest run tests/unit/qualita-classifica.test.ts`, lanciato dopo aver scritto le
prove e PRIMA di toccare `classifica.ts`):
```
TypeError: Cannot read properties of undefined (reading 'charAt')
 ❯ primaLettera src/lib/qualita/classifica.ts:88:12
 ❯ classifica src/lib/qualita/classifica.ts:146:53
 ❯ tests/unit/qualita-classifica.test.ts:244:17
...
TypeError: Cannot destructure property 'esito' of 'esitoDaGravita(...)' as it is undefined.
 ❯ classifica src/lib/qualita/classifica.ts:130:13
 ❯ tests/unit/qualita-classifica.test.ts:258:17
...
AssertionError: expected 'undefined. Il dispositivo era stato a…' not to contain 'undefined'
Expected: "undefined"
Received: "undefined. Il dispositivo era stato applicato. Per la norma è un reclamo."
 ❯ tests/unit/qualita-classifica.test.ts:283:28
...
 Test Files  1 failed (1)
      Tests  9 failed | 34 passed (43)
```
9 rosse su 9 attese (4 statoDispositivo + 3 rispostaGravita + 2 origine) — rosso genuino, non
presunto: i tre `TypeError`/`AssertionError` sono esattamente i tre cammini della tabella del
mandato.

**TDD — rosso genuino su `isMotivo`/`isRispostaGravitaIncidente`** (comando:
`npx vitest run tests/unit/qualita-costanti.test.ts`, lanciato dopo aver riscritto il file di prove
e PRIMA di toccare `qualita-costanti.ts`):
```
TypeError: isMotivo is not a function
TypeError: isRispostaGravitaIncidente is not a function
 Test Files  1 failed (1)
      Tests  28 failed | 9 passed (37)
```
28 rosse (le due guardie non esistevano ancora), 9 verdi per coincidenza (`naturaDaMotivo` con
letterali validi funzionava già, firma `unknown` non ancora ristretta).

**Verde, dopo l'implementazione:**
```
$ npx vitest run tests/unit/qualita-classifica.test.ts tests/unit/qualita-costanti.test.ts
 Test Files  2 passed (2)
      Tests  80 passed (80)
```

**Sonda usa-e-getta, post-fix** (`tests/unit/zz-probe-ri-revisione.test.ts`, mai committata,
cancellata dopo la corsa — stesso protocollo della sonda originale del Passo 4): risultati incollati
nel censimento aggiornato sopra. Confermato empiricamente: i tre cammini richiusi non esplodono più
e il `perche` non contiene mai "undefined"; `natura`/`potenzialeDiDanno` (non toccati) si comportano
come documentato in origine; `f: null` (l'intero oggetto) resta l'unica eccezione che esplode,
invariata e fuori mandato.

**I tre comandi del mandato, per intero, ultima corsa:**
```
$ npx tsc --noEmit
(nessun output — exit 0)

$ npx vitest run tests/unit
 Test Files  432 passed (432)
      Tests  5168 passed (5168)
   Duration  153.97s

$ npx next build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 8.0s
  Running TypeScript ...
  Finished TypeScript in 15.6s ...
✓ Generating static pages using 15 workers (82/82) in 427ms
(unico warning: middleware → proxy, preesistente e non pertinente)
```

**Eslint (non richiesto esplicitamente dal mandato, ma è il gate del pre-commit — verificato prima
per non rischiare un commit rifiutato):**
```
$ npx eslint src/lib/domain/qualita-costanti.ts src/lib/qualita/classifica.ts \
    tests/unit/qualita-classifica.test.ts tests/unit/qualita-costanti.test.ts --max-warnings=0
(nessun output — 0 problemi)
```
Due warning iniziali (`no-unused-vars` su due destrutturazioni "assente" nei test di regressione)
chiusi con `// eslint-disable-next-line`, stesso pattern già in casa
(`tests/unit/decisione-fatturazione-riapertura.test.ts`).

**Grep di conferma sul rename (nessun residuo del nome vecchio):**
```
$ grep -rn "morte_o_deterioramento_non_previsto" --include="*.ts" . | grep -v node_modules
(zero hit)
$ grep -rn "morte_o_deterioramento_grave_non_previsto" --include="*.ts" . | grep -v node_modules
tests/unit/qualita-classifica.test.ts:50: ...
tests/unit/qualita-classifica.test.ts:200: ...
src/lib/qualita/classifica.ts:111: case 'morte_o_deterioramento_grave_non_previsto':
src/lib/domain/qualita-costanti.ts:159: 'morte_o_deterioramento_grave_non_previsto', ...
```
4 hit, tutti e soli i punti attesi.

## Autorevisione

- **Non ho toccato il testo della domanda sulla gravità** (`classifica.ts`, riga della domanda in
  chiaro nel ramo "nessuna risposta"): resta parola per parola quello che era, come richiesto —
  l'ho solo raggiunto anche da un cammino nuovo (ingresso imprevisto), non modificato.
- **Non ho introdotto nessun blocco.** I tre cammini richiusi restituiscono sempre una `Proposta`
  viva: nessun `throw`, nessun rifiuto, nessuna validazione-e-stop. D262 resta rispettato.
- **La direzione "più obblighi, mai meno" è verificata, non presunta**: per `statoDispositivo` e
  `origine` l'ESITO non è cambiato dal fix (era già `'reclamo'` prima della regressione, tornato
  `'reclamo'` dopo) — ho solo richiuso il canale di testo che esplodeva o mostrava "undefined". Per
  `rispostaGravita` (cammino nuovo, mai esistito prima di D277) ho scelto la "domanda in attesa"
  (`incidente`, termine vuoto) invece di indovinare una gravità specifica: è la lettura più
  conservativa disponibile SENZA dedurre — dedurre da un valore a caso avrebbe potuto sia
  sovrastimare sia sottostimare la gravità vera, mentre "in attesa" non chiude mai la porta a una
  risposta corretta successiva.
- **Ho scelto la normalizzazione in ingresso (guardia) per `rispostaGravita`, e i rami di riserva
  nel `switch` per `origine`/`statoDispositivo`** — due forme diverse per due situazioni diverse:
  il primo caso ha un punto di chiamata singolo e già isolato (il passo ①), i secondi sono
  richiamati da tre punti diversi (`:146`, `:157` e dintorni) componendo testo, dove un `default`
  locale è più diretto di una guardia doppia a monte.
- **Ho verificato con un grep dedicato che il rename non lasciasse residui** del nome vecchio (zero
  hit) e che i quattro punti nuovi corrispondano esattamente ai quattro attesi.
- **BP-1 (MEMORY.md / ROADMAP-UFFICIALE.md) non eseguito in questo commit**, per lo stesso confine
  dichiarato nelle due autorevisioni precedenti di questo stesso file: il mandato di questa sessione
  è scopato al codice, alle prove e a questo referto (che vive fuori da git, `.superpowers/` è in
  `.gitignore`). Lo scrivo qui perché resti un passo dovuto da qualcuno, non perché l'ho dimenticato.

## RITROVAMENTI fuori mandato di questa sessione (riferiti, non corretti, R-E2)

6. ⚪ **`isRispostaGravitaIncidente` non ha una "spia" di migration**, per lo stesso motivo già
   segnalato per `RISPOSTE_GRAVITA_INCIDENTE` (RITROVAMENTO #5, sopra): il vocabolario non ha
   ancora un CHECK di banca dati da cui derivare la spia. Nessuna azione in questa sessione.
7. ⚪ **`f: null` (l'intero oggetto passato a `classifica`) resta l'unica forma di ingresso
   malformato che esplode** invece di degradare — comportamento invariato, non toccato dal mandato
   di oggi (che elencava solo tre cammini: `statoDispositivo`, `rispostaGravita`, `origine`).
   Se un futuro Task 4 costruisce `FattiEvento` con uno spread da un body parzialmente `null`
   (`{ ...corpo }` dove `corpo` stesso è `null`), l'eccezione arriva da `classifica()`, non dalla
   rotta — stesso avviso già scritto come RITROVAMENTO #3 nella prima stesura di questo referto,
   qui confermato ancora vero dopo il fix di oggi.

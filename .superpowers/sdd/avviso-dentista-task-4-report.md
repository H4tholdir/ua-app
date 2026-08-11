# Resoconto del Task 4 — «L'avviso al dentista»

**Quando:** 09/08/2026, pomeriggio. **Ramo:** `intervento-post-consegna`.
**Perimetro rispettato:** solo `src/app/api/lavori/[id]/avviso/route.ts` e `tests/unit/api-avviso.test.ts`.
🛑 **Nessuna interfaccia, nessun componente, nessuna migration, nessun `GRANT` nuovo.** Le quattro colonne
concesse dal Task 1 sono bastate esattamente: non ho avuto bisogno di una quinta.

| cosa | esito |
|---|---|
| `verify:full` | **`VERIFY_EXIT=0`** · **5788 passate \| 119 saltate su 463 file** |
| Base misurata da me prima (non ricopiata) | **5762 passate \| 119 saltate su 462 file** |
| Le passate salgono, le saltate NO | **+26 passate**, saltate **119 → 119** ✅ (prove unitarie) |
| R-P4 contro l'abbozzo inerte | **26 `it` su 26 falliscono** (erano **25 su 26**: il conteggio ha trovato l'unica asserzione vacua) |
| Guardia dell'origine | `bash scripts/check-csrf.sh` → **`CSRF_EXIT=0`**, nessuna rotta scoperta |
| Salvataggi | **`31e395f1`** (rotta + prova) |
| Domande per Francesco | **una**, il perimetro per ruolo (§③) |

---

## ① I sette punti del mandato, uno per uno

### ① `context.userId` — il nome PRESUNTO era giusto, ma non tutto il resto

`letto:` `src/lib/supabase/lab-context.ts:12-20, 88-101`. **Il campo si chiama davvero `userId`**: questa
volta la presunzione del piano tiene. La forma vera è in §②.

🟠 **Ma due cose vicine NON sono come il piano le dà per scontate**, e le ho usate:
- `laboratorioId` è `string | null`, e il `null` è **legale** per `admin_sistema`. Non è un caso limite: è
  ciò che rende il perimetro **quattro ruoli e non cinque** (§③).
- `ruolo` è `string`, **non** un'unione dei cinque valori. Cioè `tsc` **non** protegge da un confronto con
  un ruolo inesistente: `context.ruolo === 'admin'` compilerebbe. È il motivo per cui un eventuale
  cancello di ruolo qui va scritto con l'elenco vero sotto gli occhi, e non a memoria.

### ② 🔴 Il perimetro per ruolo — applicato quello della rotta modello, e portato come domanda

Trattato per intero in **§③**. In breve: **nessun cancello di ruolo**, come la rotta modello *e* come la
rotta che gli avvisi li **crea**; perimetro effettivo di **quattro** ruoli; comportamento di oggi **fissato
da una prova** (`㉓`); **una** domanda per Francesco.

### ③ 🔴 Il 422 prima della banca dati — provato dove si vede

Trattato per intero in **§④**. In breve: la prova non si accontenta dello stato, mette in **coppia** «422»
e «il finto client non ha ricevuto **nessuna** chiamata», e porta il **controllo positivo** che sul
percorso riuscito quel finto client viene invece chiamato.

### ④ 🟠 «Chiuso» — usate le funzioni del Task 1, e l'elenco degli stati aperti è DERIVATO

Nessun confronto a mano, e nessun secondo elenco:
- la decisione del **409** passa da `chiudeIlPromemoria()` (con `isStatoAvviso()` davanti, perché la
  colonna arriva tipizzata `string`);
- il filtro dell'aggiornamento **non** contiene la stringa `'da_comunicare'`: contiene
  `STATI_AVVISO.filter((s) => !chiudeIlPromemoria(s))`. Il giorno in cui nascesse un quarto stato aperto,
  la rotta lo tratta come aperto **da sola**;
- la richiesta del testo **e** la sua scrittura passano dalla stessa funzione, `ammetteTestoInviato()`:
  due condizioni scritte a mano potrebbero divergere, e la divergenza uscirebbe come un `23514` al banco.

🔑 **E la prova non ricopia l'elenco nemmeno lei:** asserisce che il filtro è **esattamente il complemento
di `STATI_CHIUSI` dentro `STATI_AVVISO`**, calcolato nella prova stessa.

### ⑤ 🟠 Il testo: lunghezza, vuoto, soli spazi — deciso, non taciuto

| forma | esito | perché |
|---|---|---|
| `dall_app` senza `testo` | **422** | il `CHECK` lo rifiuterebbe con un `23514` illeggibile |
| `testo` non stringa | **422** | un numero in una colonna `text` non è un messaggio |
| `testo` vuoto o di **soli spazi** | **422** | il `CHECK` chiede solo `NOT NULL`: `''` **passerebbe**, e resterebbe in banca dati la prova di un avviso **senza avviso** |
| `testo` oltre **1000** caratteri | **422** | i route handler dell'App Router non limitano il corpo: senza tetto, 5 MB incollati finiscono in banca dati senza errore |
| `testo` di **esattamente** 1000 | **200** | prova dedicata: il limite non è a 999 |
| `a_voce` **con** `testo` | **422** | 🔴 **il piano non ne parla**, e scartarlo in silenzio farebbe credere di aver salvato la telefonata |
| `a_voce` con `testo: null` | **200** | `null` vale come assente, e la chiave **non** viene mandata |

**Il 1000 non è inventato:** è il valore di casa (`eventi-qualita/route.ts:78`, `valutazioni/route.ts:42`,
`rifacimento/route.ts:85`). Il margine è **misurato**: `buildAvvisoMessage` con un numero nella forma
maggioritaria (`STOR/2021/016`) e un gettone uuid produce **168 caratteri** — circa un sesto del tetto.
`provato:` `npx tsx -e "…buildAvvisoMessage…"` → `LUNGHEZZA= 168`.

🛑 **Il testo si registra COSÌ COM'È, senza `trim`.** ⚖️ D339 dice «il testo **mandato**», e cosa il
dentista ha ricevuto non lo decide questa rotta: il `trim` serve solo a **decidere se è vuoto**.

### ⑥ 🟠 La data — la mette l'orologio del processo Node, e il perché è scritto

**Scelta: `new Date().toISOString()` nel processo.** Non per comodità:
- da PostgREST **non si può mandare un'espressione SQL** in un `update`, quindi il `now()` del database
  vorrebbe dire un *trigger* o una funzione — cioè **una migration, fuori dal mandato**;
- `toISOString()` porta il fuso **dentro** il valore: il momento salvato è un istante, non una data
  ambigua (è la lezione di D286, `data-roma.ts`);
- l'avvertimento del mandato su `now()` costante in transazione **qui non morde**: si scrive **una riga**
  con **una** istruzione, non due righe nella stessa transazione come nel Task 2.

⚠️ **Limite dichiarato invece di nascosto:** `created_at` la mette il **database**, `comunicato_at` il
**processo**. Con orologi che divergono, la seconda può risultare di poco **anteriore** alla prima.
Nessuna lettura di quest'ondata ordina per `comunicato_at`, quindi oggi non rompe niente — **chi un giorno
lo farà deve saperlo**.

### ⑦ 🟠 La guardia dell'origine — messa, e verificata dalla guardia meccanica

`isSameOrigin` è la **prima riga** dell'handler. `provato:` `bash scripts/check-csrf.sh` →
**`CSRF_EXIT=0`**, «*ogni route mutante verifica l'origine, o è esclusa con una ragione scritta*». Nessuna
esclusione chiesta: qui l'autorizzazione **è** il cookie di sessione, cioè esattamente la credenziale
ambientale che un sito ostile potrebbe cavalcare. La prova `①` manda un'origine estranea e pretende **403
con la banca dati intatta**.

---

## ② La forma VERA di ciò che restituisce il contesto server

`src/lib/supabase/lab-context.ts:12-20` — `getFreshLabContext()` restituisce **`Promise<LabContext | null>`**,
e `LabContext` è:

```ts
export type LabContext = {
  userId: string
  email: string | null
  ruolo: string
  laboratorioId: string | null // null legale SOLO per admin_sistema
  nome: string | null
  cognome: string | null
  lab: { stato: string; trial_ends_at: string | null; nome: string } | null
}
```

Tre cose da tenere, oltre al nome:
1. **`userId` esiste e si chiama così** — la presunzione del piano regge, e con la correzione del Task 1
   (`comunicato_da → public.utenti(id)`) quel valore è scrivibile in quella colonna **per disegno**.
2. **`ruolo` è `string`**, non un'unione: nessuna protezione a compilazione su un ruolo scritto male.
3. **`laboratorioId` può essere `null`** e il commento del file dice *perché*: «*null legale SOLO per
   admin_sistema*». È la riga che decide il §③.

---

## ③ Il perimetro per ruolo applicato, e LA DOMANDA PER FRANCESCO

### Che cosa ho applicato

**Nessun cancello di ruolo.** Chiunque abbia una sessione valida, un `laboratorio_id` e un laboratorio
operativo può chiudere un avviso **del proprio laboratorio**.

**Perché questo e non un altro:**
- è ciò che fa la **rotta modello** indicata dal mandato (`eventi-qualita/route.ts`): `isSameOrigin` →
  `getFreshLabContext` → `laboratorioId` → `assertLabOperativo`, **e nessun controllo di ruolo**;
- ed è ciò che fa la rotta che gli avvisi li **crea** (`…/dichiarazione/riemetti/route.ts:77-85`,
  `letto:`): stesse quattro guardie, **nessun ruolo**. Sarebbe strano che chi ha potuto **rifare la
  dichiarazione** non possa poi dire di averlo comunicato;
- 🛑 e soprattutto: **il mandato vieta di inventare un perimetro in silenzio.** Un cancello scritto qui a
  naso sarebbe una decisione di prodotto presa da un esecutore.

📌 **Un cancello di ruolo esiste in casa** (`decisione-fatturazione/route.ts:27` → `titolare` +
`front_desk`; `segnala/route.ts:36` → `tecnico` + `titolare`), quindi la forma è nota e costa tre righe:
**non è un problema tecnico, è una decisione mancante.**

### 🔴 Il perimetro effettivo è di QUATTRO ruoli, non cinque — e il quinto non è una scelta

`admin_sistema` ha `laboratorio_id` **nullo per disegno** e cade sul `403` di `!context.laboratorioId`,
che sta **prima** della guardia del laboratorio (la quale invece lo farebbe passare:
`lab-guard.ts:50`, «*bypass totale*»). ➡️ **La sua esclusione è una CONSEGUENZA dell'ordine delle
guardie, non una decisione**, ed è identica in tutte le rotte di questa famiglia. Provata (`③`).

### 🔴 La conseguenza da guardare in faccia

Così **`tecnico` può chiudere un obbligo di legge** dichiarando «l'ho avvisato di persona» — mentre il
**Task 7 del piano** (riga 378) propone di **non mostrargli nemmeno il promemoria** nella striscia della
home. **Le due superfici direbbero cose diverse:** una gliela nasconde, l'altra gliela concede.

🛑 **Il comportamento di oggi è FISSATO DA UNA PROVA** (`㉓`, con `titolare · tecnico · front_desk ·
admin_rete`): se e quando il perimetro si stringerà, **quella prova deve arrossire**. È ciò che impedisce
a un cambio di permessi di passare inosservato.

### 📣 LA DOMANDA PER FRANCESCO — una sola, con una proposta da approvare o correggere

> **Chi, nel laboratorio, può segnare un avviso al dentista come «comunicato» — e in particolare: il
> tecnico può chiuderlo dichiarando «l'ho avvisato di persona»?**
>
> **La proposta:** `titolare` · `front_desk` · `admin_rete` **su entrambe le superfici** — cioè il
> promemoria nella striscia della home (Task 7) **e** la rotta che lo chiude (Task 4) — **escludendo
> `tecnico`**, perché non è lui a parlare col dentista. Così le due superfici dicono la stessa cosa.
>
> **Se invece va bene che chiunque nel laboratorio possa chiuderlo**, allora è il **Task 7** a dover
> cambiare: il promemoria va mostrato anche al tecnico, o gli si chiede di chiudere una cosa che non
> vede.
>
> ⚠️ **Non c'è una risposta neutra:** oggi le due metà sono disallineate, e una delle due va mossa.
> 📌 È **lo stesso tema** che il piano dichiara «*una proposta, non una decisione di Francesco*» al Task
> 7 (riga 419 ②): va portato **una volta sola**, e questa è quella volta.

---

## ④ Come ho provato che il 422 arriva PRIMA della banca dati

Il mandato ha ragione: *una prova che finge il client Supabase dimostra solo che la funzione restituisce
422*. Quindi la prova non guarda **solo** lo stato. Tre pezzi, e servono tutti e tre:

**① La coppia di asserzioni** (`⑪`). Non «422», ma «422 **e** il finto client non ha ricevuto **nessuna**
chiamata»:

```ts
expect(r.status).toBe(422)
expect(mockFrom).not.toHaveBeenCalled()
expect(b.catenaUpdate.chiamate).toHaveLength(0)
```

Da sola nessuna delle due proverebbe la cosa: la prima è verde anche se la rotta interroga il database e
**poi** risponde 422; la seconda è verde anche su una rotta che non fa niente. **È la coppia** a dire «ci
arriva senza aver provato a scrivere». La terza riga è più stretta ancora: non solo `from` non è stato
chiamato, ma **sulla catena dell'aggiornamento non è stato chiamato nulla**.

**② Il controllo positivo, che è la parte che mancherebbe a un lavoro fatto a metà** (`㉑`):

```ts
expect(mockFrom).toHaveBeenCalledWith('avvisi_dentista')
```

🔑 **Senza questa riga, tutti gli `not.toHaveBeenCalled()` del file potrebbero passare a vuoto** — un
finto client scollegato non viene chiamato **mai**, e ogni prova «non tocca la banca dati» diventa verde
per il motivo sbagliato. È la stessa famiglia della riga **38** della coda citata nel mandato: *cinque
prove verdi su un corpo che la rotta rifiuta*.

**③ L'estensione a TUTTE le forme che rifiutano, non solo a quella del piano.** `not.toHaveBeenCalled()`
è asserito su **tutte** le forme d'ingresso rifiutate: origine estranea, nessuna sessione, contesto senza
laboratorio, laboratorio sospeso, `id` di percorso storto, corpo non-JSON, chiave ignota, `avviso_id`
storto, `come` fuori vocabolario, `come: '__proto__'`, `dall_app` senza testo, testo vuoto/di soli
spazi/non stringa/troppo lungo, `a_voce` con testo. **Quindici forme, quindici volte la stessa asserzione.**

⚠️ **E il limite che resta, dichiarato:** questa è una prova **unitaria**, quindi dimostra che la rotta
**non chiama** il client — **non** che il `CHECK` in banca dati esista o morda. Quello lo ha provato il
Task 1 sul banco vero, e il giro completo sul banco è il **Task 10**.

---

## ⑤ Le forme d'input enumerate, e `N su M`

**Enumerate PRIMA delle asserzioni** e scritte nell'intestazione di `tests/unit/api-avviso.test.ts`:
**22 forme** (①-㉒), che nel file diventano **26 `it`** (alcune forme girano su più valori dentro un ciclo:
`⑧` prova otto `avviso_id` diversi, `⑨` sette `come`, `⑫`+`⑬` nove testi).

Le sei chieste dal mandato ci sono tutte — corpo non-JSON · `avviso_id` assente · `avviso_id` di un altro
laboratorio · `come` fuori vocabolario · `dall_app` senza testo · avviso già chiuso · testo vuoto · testo
enorme — **più nove che il mandato non chiedeva**: `avviso_id` di un **altro lavoro** dello stesso
laboratorio · `come: '__proto__'`/`constructor`/`toString` · chiave **ignota** nel corpo · `a_voce` **con**
testo · testo di **esattamente** 1000 · contesto **senza laboratorio** · laboratorio **sospeso** con la
guardia **vera** · stato **fuori vocabolario** → 409 fail-closed · errore del database → 500 senza il
testo di Postgres in faccia.

**🛑 Non coperte, e ognuna col suo perché** (scritte nel file, non solo qui):
- **gettone di concorrenza (`atteso_updated_at`): NON esiste per questo gesto.** L'aggiornamento è
  condizionato nella `WHERE` allo stato ancora aperto, quindi due richieste concorrenti **non possono
  vincere entrambe**: la seconda trova zero righe e legge 409. Mandare un gettone cade fra le chiavi
  ignote → 422.
- **che il testo sia DAVVERO partito su WhatsApp: l'app non lo può sapere** (⚖️ D331 — l'app propone,
  l'odontotecnico manda). Nessuna prova può affermarlo, e **la rotta non finge di saperlo**: registra che
  l'odontotecnico *dichiara* di averlo mandato.
- **la scadenza del gettone del portale:** riferita, non risolta qui — §⑧.
- **il perimetro per ruolo:** non è una copertura mancante, è una decisione mancante (§③). La prova `㉓`
  **fissa** il comportamento di oggi invece di tacerlo.

### `N su M` — **26 `it` su 26**, e come ci sono arrivato

**Unità dichiarata: `it` che FALLISCONO contro l'abbozzo inerte.** (I due task precedenti hanno usato due
unità diverse — «9 su 22» e «3 su 14 passano»: qui la conto una volta e la nomino.)

1. **Primo rosso: `Failed to resolve import "@/app/api/lavori/[id]/avviso/route"`.** ⛔ R-P4: questo rosso
   **non prova niente**, ed è esattamente il caso che la regola vieta di contare.
2. **Abbozzo inerte** — una rotta che risponde `200 { ok: true }` e non fa nient'altro (la forma di
   sbaglio più *innocente* possibile). Esito: **25 `it` su 26 falliscono, 1 passa.**
3. 🔴 **L'unico che passava era vacuo, e il conteggio l'ha trovato:** `㉓`, il perimetro per ruolo,
   asseriva solo `toBe(200)` — e una rotta che risponde sempre 200 lo soddisfa. **Un «200» da una rotta
   che non scrive niente non dimostra che il ruolo sia ammesso: dimostra che nessuno l'ha fermato.** È il
   difetto **N3** del Task 3, ricomparso.
4. **Rinforzato** con `expect(payloadDiUpdate(...).comunicato_da).toBe(USER_ID)`, cioè «e ha davvero
   scritto, con l'autore giusto». Nuovo esito: **26 `it` su 26 falliscono.**
5. Rotta vera → **26 su 26 verdi.**

🔑 **La lezione, di nuovo:** il conteggio non misura la copertura, misura la **forza**. Senza il passo 2
quella prova sarebbe finita in produzione verde e vuota.

---

## ⑥ I numeri misurati

**Base, misurata da me prima di toccare niente** (non ricopiata dal mandato):
`npx vitest run` → **`Test Files 453 passed | 9 skipped (462)` · `Tests 5762 passed | 119 skipped (5881)`**.
📌 Coincide con il `5762 | 119` su 462 del mandato — l'ho rifatta comunque.

**FASE 7, uscita letta da variabile, senza pipe, timeout 600000 ms:**

```
npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
→ VERIFY_EXIT=0
   Test Files  454 passed | 9 skipped (463)
        Tests  5788 passed | 119 skipped (5907)
   ✓ Compiled successfully in 6.5s
   ✅ DS compliance · ✅ Guardia CSRF · ✅ reduced-motion · ✅ coerenza documenti
   ✅ salvataggio installato · ✅ progetti Playwright
```

| | prima | dopo | atteso |
|---|---|---|---|
| passate | 5762 | **5788** (+26) | ✅ salgono di esattamente le mie 26 |
| **saltate** | 119 | **119** | ✅ **NON salgono** — sono prove unitarie, `verify:full` le esegue |
| file | 462 | 463 | ✅ +1 |

**Altre misure, tutte con l'uscita da variabile:**
- `npx tsc --noEmit` → **`TSC_EXIT=0`**
- `npx eslint <i due file> --max-warnings 0` → **`ESLINT_EXIT=0`**
- `bash scripts/check-csrf.sh` → **`CSRF_EXIT=0`**
- **il cancello di compilazione, rotto apposta** (R-P1: un vincolo si prova con un valore che DEVE essere
  rifiutato): togliendo la riga `a_voce` dalla mappa `come → stato`, `npx tsc --noEmit` →
  **`TSC_EXIT=1`** con
  `src/app/api/lavori/[id]/avviso/route.ts(111,7): error TS2322: Type 'true' is not assignable to type 'never'.`
  Poi rimesso, e riverificato a **0**.

**E il permesso per colonna, letto sul CATALOGO VIVO e non sulla migration** — è il fatto **portante** di
questa rotta, perché `service_role` aggira la RLS e quel permesso è l'unica cosa che limita davvero cosa si
può scrivere:

```
node scripts/psql.mjs -c "SELECT grantee, column_name FROM information_schema.column_privileges
  WHERE table_name='avvisi_dentista' AND privilege_type='UPDATE' ORDER BY grantee, column_name;"
→ 20 righe
  authenticated : comunicato_at · comunicato_da · stato · testo_inviato        (QUATTRO)
  service_role  : comunicato_at · comunicato_da · stato · testo_inviato        (QUATTRO)
  postgres      : tutte e dieci, visto_dal_dentista_at compreso                (il PROPRIETARIO)
```

✅ **Combacia con la migration `20260809124517`, e `visto_dal_dentista_at` NON compare per nessun ruolo
dell'app** — solo per `postgres`, che è il proprietario della tabella. Cioè le quattro chiavi che la rotta
scrive sono esattamente le quattro che il banco le concede, e **la ricevuta di lettura del dentista è
inarrivabile da qui anche volendo**. 🔑 `anon` **non compare affatto** in questo elenco: il `REVOKE UPDATE`
della stessa migration ha tenuto.

🔴 **Una correzione a me stesso, sulla misura di quest'ultima.** La **prima** volta ho letto l'uscita con
`npx tsc --noEmit 2>&1 | head -12; echo "TSC_EXIT=$?"` e ho ottenuto **`TSC_EXIT=0`** — cioè l'uscita di
`head`, **non** di `tsc`, su un file che **non compilava**. È esattamente il difetto che la regola di casa
«**da variabile, mai dietro una pipe**» esiste per impedire, e l'ho commesso sulla prova che serviva a
dimostrare che il cancello funziona. Rimisurato senza pipe: `1`. **Se non l'avessi rifatto avrei scritto
nel resoconto che il cancello non si accende, e avrei tolto il cancello.**

---

## ⑦ Che cosa resta `non provato`, col motivo

| cosa | perché non è provato qui |
|---|---|
| Che il `CHECK` `avviso_testo_solo_se_dall_app` **morda** davvero sui casi che la rotta previene | La prova è **unitaria**: finge il client, quindi non tocca Postgres. Il `CHECK` è stato provato sul banco dal **Task 1**; il giro vero è il **Task 10**. La rotta è la **prima** guardia, non l'unica. |
| Che l'aggiornamento condizionato regga una **corsa vera** fra due richieste concorrenti | Servono due connessioni e una transazione vera. L'argomento è solido (una sola istruzione `UPDATE … WHERE stato IN (aperti)`: Postgres serializza le due), **ma è un argomento, non una misura** → **Task 10**. |
| Che la **politica RLS di scrittura** funzioni fra laboratori diversi | Resta aperto dal Task 1 (voce 4 della sua revisione), e **questa rotta non la esercita**: scrive con `service_role`, che aggira la RLS. A tenere la scrittura dentro il laboratorio è il filtro `laboratorio_id`, **provato** (`⑯⑰`), non la politica. ⚠️ **Chi credesse che la RLS lo protegga qui si sbaglia.** |
| ~~Che le quattro colonne concesse siano esattamente quelle che serviva scrivere~~ | 🔄 **CHIUSO — era «riferito, non riverificato», ed è stato un mio buco: tutte le mie prove fingono il client, quindi NESSUNA di esse toccava il permesso vero.** Se il `GRANT` vivo fosse diverso dalla migration, la rotta prenderebbe un errore di permessi a runtime **e le 26 prove resterebbero verdi**. Interrogato il catalogo (v. sotto): **combacia**. |
| Che un avviso su un lavoro **cestinato** (`lavori.deleted_at`) debba restare chiudibile | Scelta **dichiarata**: la rotta non legge `lavori`, quindi lo chiude. L'obbligo GDPR non sparisce perché il lavoro è stato cestinato — ma **nessuno ha deciso** se il promemoria vada mostrato. È un rilievo per il Task 6, §⑧. |
| Che il testo registrato sia quello **davvero** ricevuto dal dentista | Impossibile da provare per costruzione (⚖️ D331). Dichiarato nel codice invece che sottinteso. |
| Che un guasto **passeggero** del database sulla lettura di disambiguazione non venga letto come «non esiste» | **Limite dichiarato, non chiuso.** Quella lettura scarta l'`error` (`const { data: esistente } = …`), quindi una banca dati momentaneamente irraggiungibile esce **404 «Avviso non trovato»** — cioè «il tuo avviso non c'è» quando la verità è «non sono riuscita a chiedere». **È l'idioma di casa** (la rotta modello fa lo stesso sulla lettura di `lavori`, `eventi-qualita/route.ts:348-356`), e cambiarlo qui creerebbe una rotta che si comporta diversamente dalle sorelle: **riferito, non corretto**. ⚠️ Sul percorso che **scrive** l'errore non è scartato: lì esce **500**. |

---

## ⑧ Ritrovamenti fuori mandato — riferiti, non corretti (R-E2)

**R1 🔴 Il piano non impone che l'avviso appartenga al lavoro dell'indirizzo.** Il contratto mette il
lavoro nel **percorso** e l'avviso nel **corpo**, e nessuna riga chiede che i due parlino dello stesso
lavoro. **Corretto dentro il mio mandato** (il filtro `lavoro_id` c'è, provato da `⑯⑰`), ma è un difetto
**del piano** e va detto: è la stessa famiglia già scritta nella rotta modello
(`eventi-qualita/route.ts:429-437`), dove però una FK composita fa da rete. **Qui nessuna FK difende:
senza quel filtro l'indirizzo mentirebbe.** ➡️ **Ogni rotta futura di quest'ondata che prenda un id nel
corpo e un id nel percorso ha lo stesso buco.**

**R2 ⚠️ La scadenza del gettone del portale — la rotta POTREBBE controllarla, ma NON DEVE.** (Rilievo
aperto dal Task 3.) Correggo una formulazione comoda: **non è vero che «non si può»** — l'avviso porta
`cliente_id`, quindi `clienti.portale_token_scade_at` è a una `join` di distanza. **La ragione è più
forte:**
1. per `come: 'a_voce'` **il gettone è irrilevante**: non c'è nessun collegamento in gioco;
2. per `come: 'dall_app'` il messaggio è **già stato mandato** quando questa rotta viene chiamata:
   rifiutare la registrazione **non richiama indietro il messaggio**, cancella solo la **prova** di averlo
   mandato. Cioè si perderebbe l'adempimento **e** il messaggio sarebbe partito comunque;
3. ➡️ **il posto giusto è dove il testo si COMPONE (Task 5)**, prima che una persona prema «manda»: lì un
   gettone scaduto si **rigenera** (la rotta esiste già:
   `clienti/[id]/rigenera-portale-token`). ⚠️ E `buildAvvisoMessage` **ha già** il ramo «senza gettone»
   (`messaggio.ts:107`) — ma non ha, e non può avere, un ramo «gettone **scaduto**»: riceve una stringa.

**R3 🟠 Un promemoria può sopravvivere al cestinamento del suo lavoro, e nessuno l'ha deciso.**
`lavoro_id` è `ON DELETE CASCADE`, che protegge dalla cancellazione **vera** — ma il prodotto usa il
**cestino** (`lavori.deleted_at`), che non fa scattare nessuna cascata. Quindi `avvisiDaComunicare()` del
**Task 6** può restituire un promemoria per un lavoro **che il laboratorio ha buttato**, e nessuna riga del
piano dice se mostrarlo. **Non l'ho toccato:** la mia rotta lo chiude comunque, ed è la direzione prudente
(un adempimento chiudibile è meglio di uno bloccato). **La decisione appartiene alla LETTURA, non alla
scrittura.**

**R4 🟠 Uno stato di abbonamento blocca la registrazione di un adempimento di legge.**
`assertLabOperativo(context, 'POST')` rifiuta le mutazioni per i laboratori `sospeso`, `scaduto` e in
prova scaduta. Cioè un laboratorio non in regola col pagamento **può** aver avvisato il dentista e **non
può registrarlo**. Vale per **ogni** mutazione dell'app, quindi non è un difetto di questa rotta e **non
l'ho aggirata** — ma su un obbligo GDPR Art. 19 la tensione va nominata: la prova che protegge il
laboratorio è proprio quella che non riesce a scrivere. **Da decidere una volta, per tutta la famiglia.**

**R5 🟠 `anon` ha ancora `SELECT` su `avvisi_dentista`** — aperto dalla revisione del Task 1 (§2①) e
**non chiuso da me**: la mia rotta non legge con la chiave anonima. Resta di chi tocca il portale
(Task 8).

**R6 🟠 `tests/unit/lab-guard-routes-enforce.test.ts` dice di provare «le route reali» ma ne campiona
DUE** (`clienti` GET e `cicli` POST) su **124** file di rotta — `provato:`
`find src/app/api -name "route.ts" | wc -l` → `124`, **la mia compresa**, cioè 123 prima di questo task.
📌 Il numero è rifatto: la prima misura veniva da un `grep` che aveva **stampato un avvertimento**
(`ugrep: warning: route.ts: No such file or directory`), e un conteggio uscito da un comando che si è
lamentato non è un conteggio. Non è una bugia — l'intestazione dichiara che
la matrice è coperta altrove — **ma un nome al plurale su un campione di due invita a credere che una
rotta nuova sia sorvegliata da lì.** La mia non lo è: la guardia del laboratorio, nel mio file, è provata
perché **non l'ho finta** (`③` e `④` fanno girare quella vera). ➡️ Chi scrive rotte nuove non conti su
quel file.

**R7 📌 La risposta è un sovrainsieme di quella dichiarata dal piano.** Il piano dice `200 { ok: true }`;
la rotta restituisce `{ ok: true, avviso: <la riga salvata> }`, così chi ha chiesto non deve rileggerla.
🛑 **Nessun campo calcolato e nessuna etichetta da mostrare:** il foglio non esiste ancora (dopo di me c'è
il **cancello §0B**), e inventare qui una parola da stampare sarebbe un contratto d'interfaccia preso di
striscio. **Dichiarato perché è uno scostamento dal piano, anche se compatibile.**

**R8 📌 `NEXT_PUBLIC_APP_URL` è ripetuto in otto punti** — già riferito dal Task 3, non toccato.

---

## ⑨ Il salvataggio

| | |
|---|---|
| **`31e395f1`** | `feat(avvisi): la rotta che segna un avviso come comunicato, e le sue guardie` — `src/app/api/lavori/[id]/avviso/route.ts` + `tests/unit/api-avviso.test.ts` (838 righe aggiunte) |
| questo resoconto | salvato con il commit che segue |

`git status --short` **prima** di salvare (albero condiviso): solo i miei due percorsi non tracciati.
`git add <percorsi>`, **mai `-A`** (⚖️ D318). Messaggio lungo con `-F`.
**Nessun `push`, nessun `main`, nessun worktree, nessuna migration, nessuna interfaccia.**
`main` intatta a `7427a680`.

---

## Che cosa passa al cancello §0B e al Task 5

1. 🛑 **Il pavimento delle migration è invariato: `20260809133546`** — questo task non ne ha scritte, e non
   ne ha avuto bisogno: le quattro colonne concesse dal Task 1 bastavano **esattamente**.
2. 📣 **La domanda per Francesco (§③) va fatta PRIMA del Task 7**, e conviene farla al cancello §0B: se il
   perimetro si stringe, cambiano **due** file (questa rotta e `striscia.ts`) e **due** prove.
3. **Il contratto vero da usare nel foglio:** `POST /api/lavori/<lavoro_id>/avviso` con
   `{ avviso_id, come: 'dall_app' | 'a_voce', testo? }`. 🛑 **Tre regole che il foglio deve rispettare, o
   prende un 422:** il `lavoro_id` dell'indirizzo deve essere **quello dell'avviso** · con `a_voce` **non
   si manda `testo`** (nemmeno vuoto: si **omette**, o si manda `null`) · **nessuna altra chiave** è
   ammessa nel corpo.
4. ⚠️ **La scadenza del gettone si controlla nel foglio, non nella rotta** (§⑧ R2), e lì si può
   **rigenerare** invece di rifiutare.
5. 📌 **La risposta porta già la riga salvata:** il foglio non ha bisogno di rileggere per aggiornarsi.

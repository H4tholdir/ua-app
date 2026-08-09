# Resoconto — Task 4-bis: ⚖️ D342 applicata alla rotta dell'avviso

**Data:** 09/08/2026 (`date` → `Sat Aug  9 ... CEST 2026`). **Ramo:** `intervento-post-consegna`.
**Perimetro toccato:** `src/app/api/lavori/[id]/avviso/route.ts` · `tests/unit/api-avviso.test.ts`.
**Non toccati, come da mandato:** `src/lib/dashboard/striscia.ts` (Task 7) · nessun componente · nessuna
migration · niente di visibile. Pavimento migration invariato.

| cosa | esito |
|---|---|
| la prova `㉓` (comportamento pre-D342) | 🔴 **ARROSSITA** — `expected 403 to be 200` su `admin_rete`. Provava ciò che dichiarava. |
| costante dei cinque ruoli già in casa? | ❌ **non esiste** — e `supabase/schema.sql` ne porta **quattro**, vecchi |
| cancello | allowlist esplicita esportata `RUOLI_CHIUSURA_AVVISO` = `titolare` · `tecnico` · `front_desk` |
| i cinque ruoli | 3 passano (200) · 2 prendono 403 **per nome** |
| `N su M` | **4 su 6** contro «nessun cancello» · **1 su 6** contro la blocklist · **3 su 6** contro il refuso `'admin'` · **2 su 6** contro un nome tolto |
| `VERIFY_EXIT` | **0** — `5793 passate | 119 saltate` (+5 netto, saltate invariate) |

---

## ① La prova `㉓` È ARROSSITA — e la misura è questa

Il Task 4 aveva scritto `㉓` per fissare il comportamento di allora (`titolare`, `tecnico`, `front_desk`,
`admin_rete` → 200) **proprio perché** una decisione futura dovesse farla fallire invece di passare
inosservata. La decisione è arrivata. **La prova ha fatto il suo lavoro.**

**Misurato col cancello vero collegato e la prova `㉓` INTATTA, non ritoccata:**

```
FAIL tests/unit/api-avviso.test.ts > … > ㉓ OGGI nessun ruolo è escluso: i quattro ruoli
     legati a un laboratorio chiudono l'avviso
AssertionError: ruolo admin_rete: expected 403 to be 200 // Object.is equality
- Expected   200
+ Received   403
 ❯ tests/unit/api-avviso.test.ts:493:42
   493|       expect(r.status, `ruolo ${ruolo}`).toBe(200)
 Test Files  1 failed (1)
      Tests  1 failed | 31 passed (32)
```

➡️ **Conclusione: la prova provava ciò che dichiarava, e il difetto non c'è.** Non era una prova
decorativa: nominava i quattro ruoli uno per uno, quindi il restringimento del perimetro **non poteva**
passare in silenzio. Se fosse rimasta verde, il difetto sarebbe stato lei e l'avrei riferito al posto del
lavoro di oggi.

📌 **Nota sull'ordine, perché conta per la validità della misura.** Non si può misurare «il comportamento
nuovo fa arrossire `㉓`» *prima* di scrivere il comportamento nuovo. La sequenza è stata: prove nuove
scritte **prima** del cancello (rosso che conta, §⑤) → cancello collegato → **misura di `㉓` intatta** (il
riquadro qui sopra) → solo dopo il ritiro di `㉓`.

**`㉓` è stata poi RITIRATA, non riscritta**, e al suo posto nel file resta una nota con la misura: un
numero che sparisce senza spiegazione si legge come una dimenticanza. Il perimetro per ruolo ora sta nel
blocco `㉔`-`㉙`.

---

## ② Una costante dei cinque ruoli NON esisteva — censimento, e cosa ho usato

**Censito `src/` per ogni forma dell'elenco** (`grep -rln "front_desk" src/` → **34 file**;
`grep -rn "admin_sistema" src/` → 35 occorrenze). **Nessuna costante e nessun tipo porta i cinque.** I tre
candidati, e perché nessuno serve:

| dove | cos'è | perché non è la fonte |
|---|---|---|
| `src/lib/invito/ruoli.ts:1` | `type RuoloInvito` | **QUATTRO**: manca `admin_sistema`. È il perimetro di *chi si può invitare*, non l'elenco dei ruoli |
| `src/lib/pdf/permessi-dpa.ts:12` | `RUOLI_EMISSIONE_DPA` | **TRE**: è un'allowlist di funzione, come la mia. Il suo commento nomina i cinque **in prosa**, non in codice |
| `src/types/database.types.ts` | `ruolo: string` | `ruolo` è `text` + CHECK, **non** un enum: dai tipi generati non arriva nessuna unione |

➡️ **Cosa ho usato.** Una allowlist nuova nella rotta, **esportata**:

```ts
export const RUOLI_CHIUSURA_AVVISO = ['titolare', 'tecnico', 'front_desk'] as const
```

**Esportata di proposito** — idioma di casa già provato (`PATCHABLE_FIELDS` in
`src/app/api/lavori/[id]/route.ts:211`, letta dalla sua prova in
`tests/unit/lavori-patch-sentinella-cassetta.test.ts:2`), quindi `next build` la accetta: verificato dal
`VERIFY_EXIT=0`, che contiene la build.

### Come ho evitato il refuso, dato che `tsc` NON protegge

**`tsc` non protegge, e l'ho misurato invece di dedurlo.** Messo `'admin'` nudo nell'allowlist:

```
npx tsc --noEmit; TSC=$?; echo "TSC_EXIT=$TSC"   →   TSC_EXIT=0      ← compila. Nessuna rete.
```

**A prenderlo è una prova** (`㉔`), che confronta l'allowlist con l'elenco vero. Con lo stesso refuso:

```
× ㉔ la allowlist contiene SOLO ruoli che esistono davvero…
  AssertionError: «admin» non è un ruolo di questo progetto:
                  expected [ 'titolare', 'tecnico', …(3) ] to include 'admin'
× ㉕ i TRE ammessi chiudono l'avviso…
  AssertionError: ruolo front_desk: expected 403 to be 200
× ㉙ un ruolo FUORI dai cinque è rifiutato…
  AssertionError: ruolo "admin": expected 200 to be 403
      Tests  3 failed | 28 passed (31)
```

(`㉕` si accende perché il refuso **prende il posto** di `front_desk`: un elenco di tre resta di tre, e chi
sparisce non lo dice nessuno. È la riga 22 della coda dei difetti — *un nome tolto da un'allowlist senza
destinazione è un dato che smette di salvarsi in silenzio*, R-P6.)

E l'elenco vero **non è ricordato, è letto dal banco** (`provato:`, catalogo vivo, 09/08/2026):

```
node scripts/psql.mjs -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
  WHERE conrelid='public.utenti'::regclass AND contype='c';"
→ utenti_ruolo_check │ CHECK ((ruolo = ANY (ARRAY['titolare','tecnico','front_desk',
                                                  'admin_rete','admin_sistema'])))
```

**E provato con valori che DEVONO essere rifiutati** (R-P1), ognuno in **transazione annullata**:

| sonda | esito misurato |
|---|---|
| `UPDATE utenti SET ruolo='admin'` | ❌ `23514 … violates check constraint "utenti_ruolo_check"` |
| `UPDATE utenti SET ruolo='front-desk'` (trattino) | ❌ `23514 … "utenti_ruolo_check"` |
| `UPDATE utenti SET laboratorio_id=NULL WHERE ruolo='titolare'` | ❌ `23514 … "utenti_lab_required_for_non_admin"` |

⚠️ **Il limite dichiarato:** una prova **unitaria** non può interrogare il banco, quindi i cinque nomi in
`api-avviso.test.ts` sono **una seconda copia** — dichiarata, con la misura accanto. Non è eliminabile
senza una costante condivisa, che sarebbe fuori dal mio perimetro (§⑧ R3).

---

## ③ Come ho provato che il 403 arriva PRIMA della banca dati

**La stessa coppia che il Task 4 ha usato per il 422** (`⑪`), perché da sola nessuna delle due asserzioni
prova la cosa: la prima è verde anche su una rotta che interroga il database e **poi** risponde 403; la
seconda è verde anche su una rotta che non fa niente.

```ts
expect(r.status).toBe(403)
expect(mockFrom).not.toHaveBeenCalled()          // nessuna tabella aperta
expect(b.catenaUpdate.chiamate).toHaveLength(0)  // e sulla catena dell'update, NULLA
```

Asserita su **tutte** le forme che il cancello rifiuta: `admin_rete` (`㉖`), `admin_sistema` con
laboratorio (`㉗`), e i sei ruoli fuori elenco di `㉙`. **Il controllo positivo che rende non-vacue queste
righe esiste già nel file** (`㉑`: `expect(mockFrom).toHaveBeenCalledWith('avvisi_dentista')`) — senza di
lui un finto client scollegato renderebbe verdi tutti i `not.toHaveBeenCalled()` del file.

**E una seconda asserzione che il solo stato non dà: la FRASE.** `㉖` e `㉗` controllano che il messaggio
parli del **ruolo** e che **non sia** `'Laboratorio non trovato'`. È ciò che distingue il cancello nuovo da
quello vecchio: se un giorno qualcuno rimettesse l'esclusione a carico di `!laboratorioId`, lo stato
resterebbe 403 e **solo la frase** cambierebbe.

### Dove sta il cancello, e perché esattamente lì

```
isSameOrigin → getFreshLabContext (401) → !laboratorioId (403) → ⚖️ D342 (403) → assertLabOperativo → …
```

- **Prima di `assertLabOperativo`**: un permesso negato per nome non deve poter essere anticipato dalla
  guardia dell'abbonamento — e per `admin_sistema` quella guardia fa comunque «bypass totale»
  (`lab-guard.ts:50`), quindi da lì nessun rifiuto arriverebbe.
- **DOPO `!context.laboratorioId`, e la ragione è misurata, non estetica.** Mettendolo prima, la prova
  `③` del file («un contesto senza laboratorio risponde 403») diventerebbe **vacua**: non raggiungerebbe
  più la guardia che dichiara di provare. E non si può riscriverla con un ruolo ammesso, perché
  **quello stato non esiste in banca dati**: `provato:` `UPDATE utenti SET laboratorio_id=NULL WHERE
  ruolo='titolare'` → ❌ `23514 … utenti_lab_required_for_non_admin`. **L'unico stato a laboratorio nullo
  che il banco ammette è `admin_sistema`**, quindi `③` deve restare così com'è.
- **Verificate entrambe le prove che potevano diventare vacue, invece di darle per buone:**
  `③` (`admin_sistema` + `laboratorioId: null`) → 403 sul controllo del laboratorio, **non arriva mai al
  cancello**: continua a provare la guardia di prima. `④` (laboratorio sospeso) sparge `...CONTESTO`, il cui
  `ruolo` è `titolare`, **che è nell'allowlist**: passa il cancello e continua a esercitare la guardia
  **vera** del laboratorio. Se `④` avesse portato un ruolo escluso sarebbe diventata di nascosto una prova
  del cancello.

---

## ④ I cinque ruoli, uno per uno

| ruolo | esito | come è costruito il caso | prova |
|---|---|---|---|
| `titolare` | ✅ **200** + `comunicato_da` scritto | contesto normale | `㉕` |
| `tecnico` | ✅ **200** + `comunicato_da` scritto | contesto normale | `㉕` |
| `front_desk` | ✅ **200** + `comunicato_da` scritto | contesto normale | `㉕` |
| `admin_rete` | ⛔ **403 per nome**, DB non toccato, frase sul ruolo | contesto normale | `㉖` `㉘` |
| `admin_sistema` | ⛔ **403 per nome**, DB non toccato, frase sul ruolo | **`laboratorioId: LAB_ID`** e `lab.stato: 'attivo'` | `㉗` `㉘` |

### Come ho costruito il caso di `admin_sistema` CON laboratorio, e perché è uno stato VERO

```ts
mockGetFreshLabContext.mockResolvedValue({ ...CONTESTO, ruolo: 'admin_sistema', laboratorioId: LAB_ID })
```

`laboratorioId` **valorizzato** e laboratorio **attivo**: così né il 403 di `!laboratorioId` né la guardia
del laboratorio possono scattare (quest'ultima, per `admin_sistema`, fa «bypass totale»). ➡️ **Se il 403
arriva, arriva SOLO dal cancello di D342.** Riusare il caso `③` avrebbe provato il 403 **vecchio**: una
prova verde per il motivo sbagliato, il difetto ⑦ del Task 1.

🔑 **E non è uno stato inventato per comodità della prova: il banco lo PERMETTE.** `provato:` in
transazione annullata —

```
BEGIN; UPDATE public.utenti SET laboratorio_id=(SELECT id FROM public.laboratori ORDER BY id LIMIT 1)
       WHERE ruolo='admin_sistema' RETURNING ruolo, laboratorio_id; ROLLBACK;
→ [2] UPDATE — 1 righe    admin_sistema │ 00000000-0000-0000-0000-000000000001     ← ACCETTATO
→ [3] ROLLBACK            (riverificato dopo: laboratorio_id ancora `null`)
```

Perché il vincolo è `CHECK ((ruolo = 'admin_sistema') OR (laboratorio_id IS NOT NULL))` — cioè
**un'implicazione in una direzione sola**: *laboratorio nullo ⟹ `admin_sistema`*, e **non** il converso.
➡️ **È la prova, sul banco vero, dell'argomento del verbale:** il giorno in cui a quell'utente si
valorizzasse il laboratorio, il 403 di `!laboratorioId` non scatterebbe più e senza il cancello per nome
passerebbe.

📌 **Stato di fatto oggi** (`provato:` `SELECT ruolo, count(*), count(laboratorio_id) … GROUP BY ruolo`):
un solo `admin_sistema`, con laboratorio **nullo**; `admin_rete` **non esiste affatto** in banca dati.
Cioè oggi il cancello non cambia il comportamento di nessun utente reale — **e proprio per questo doveva
essere scritto per nome**: non c'è un utente che avrebbe mostrato il buco.

---

## ⑤ `N su M` — tre conteggi, perché uno solo avrebbe mentito

**Unità dichiarata: `it` che FALLISCONO** (la stessa del Task 4). **M = 6**, le prove nuove del blocco
D342. Il primo rosso utile **non** è un `import` mancante (R-P4): la costante è stata scritta **giusta e
non collegata**, così il rosso viene dal comportamento.

🛑 **Tutte e quattro le righe sono RIMISURATE sull'albero finale**, dopo l'ultima modifica alle prove — v.
la correzione a me stesso in fondo a questo paragrafo.

| abbozzo | quante si accendono | quali | cosa compra quella riga |
|---|---|---|---|
| ① **nessun cancello** (costante presente, non collegata) | **4 su 6** | `㉖` `㉗` `㉘` `㉙` | che il cancello **esista** |
| ② **cancello scritto come BLOCKLIST** dei due esclusi (forma sbagliata *plausibile*) | **1 su 6** | `㉙` soltanto | che sia una **allowlist** |
| ③ **refuso `'admin'` nudo** nell'allowlist | **3 su 6** | `㉔` `㉕` `㉙` | che un membro **sbagliato** si veda — come elenco **e** come comportamento |
| ④ **`front_desk` tolto** dall'allowlist (un nome che sparisce in silenzio) | **2 su 6** | `㉔` `㉕` | che un membro **mancante** si veda, idem |
| cancello vero | **0 su 6** — tutte verdi | | |

Le tre asserzioni dell'abbozzo ③, per intero:

```
× ㉔  AssertionError: «admin» non è un ruolo di questo progetto:
                     expected [ 'titolare', 'tecnico', …(3) ] to include 'admin'
× ㉕  AssertionError: ruolo front_desk: expected 403 to be 200
× ㉙  AssertionError: ruolo "admin": expected 200 to be 403
      Tests  3 failed | 28 passed (31)
```

🔑 **Il conteggio ha cambiato il codice due volte, ed è per questo che si conta.**

**① L'abbozzo ② ha trovato che mancava una prova.** Contro «nessun cancello» si accendevano 4 asserzioni su
6, e sembrava abbastanza. Ma un cancello scritto **come blocklist** (`ruolo === 'admin_rete' || ruolo ===
'admin_sistema'`) — la forma sbagliata che uno scrive senza accorgersene — **superava cinque prove su
sei**. È una differenza che oggi non si vede e che morde il giorno in cui il `CHECK` guadagna un sesto
ruolo: quel ruolo potrebbe chiudere un adempimento di legge **senza che nessuno l'abbia deciso**.
➡️ Ho aggiunto `㉙` (un ruolo fuori dai cinque → 403), che è **la sola prova che distingue una allowlist da
una blocklist**. Contare contro l'assenza del cancello non l'avrebbe mai chiesta.

**② L'abbozzo ③ ha trovato che `㉕` era TAUTOLOGICA.** Come l'avevo scritta, `㉕` ciclava su
`RUOLI_CHIUSURA_AVVISO`, cioè prendeva l'input **dalla cosa sotto prova**: col refuso `'admin'` provava
`'admin'` e passava, e con `front_desk` **tolto** girava su due nomi e passava — la prova si **adattava** al
difetto invece di trovarlo. ➡️ Riscritta con i tre nomi **a mano**. Solo dopo, l'abbozzo ④ accende `㉕`
(`ruolo front_desk: expected 403 to be 200`).

🔴 **E una correzione a me stesso proprio su questa tabella, perché è la stessa classe di errore che il
resoconto denuncia.** La prima volta avevo scritto **«③ → 2 su 6 (`㉔` `㉙`)»**: era vero **quando l'ho
misurato**, cioè con la `㉕` **vecchia** — quella che ciclava sulla costante e col refuso provava `'admin'`
passando. Poi ho rinforzato `㉕`, **e non ho rifatto la misura**: la riga descriveva una suite che non
esisteva più. In un resoconto la cui unica autorità è «*il numero è misurato, non ricordato*», un numero
sopravvissuto alla cosa che misurava è il difetto peggiore che ci si possa lasciare dentro. **Tutte e
quattro le righe sono state rimisurate sull'albero finale** — ① e ② confermate identiche (i tre ammessi
prendono 200 in entrambi i casi, quindi la `㉕` nuova non le cambia), ③ **corretta da 2 a 3**, ④ era già
stata misurata dopo il rinforzo. 🔑 **La lezione, che vale oltre questa tabella:** una misura non è vera in
assoluto, è vera **di una versione**. Chi tocca ciò che ha misurato deve rimisurare, o cancellare il numero.

**Forme d'input enumerate per il cancello** (R-P4, prima delle asserzioni): i cinque ruoli veri · `'admin'`
nudo · `'front-desk'` col trattino · un ruolo futuro mai visto (`'apprendista'`) · stringa vuota · maiuscole
(`'Titolare'`, `'TITOLARE'`). **Non coperte, col perché:** `ruolo: null`/`undefined`/non-stringa — il tipo
`LabContext` dichiara `ruolo: string` e il `CHECK` in banca dati lo vieta con `NOT NULL`; il cancello
comunque **fallisce chiuso** su qualunque valore fuori elenco, che è il verso giusto.

---

## ⑥ I numeri misurati

**Base, rimisurata da me prima di toccare niente** (non ricopiata dal mandato):
`npx vitest run` → **`Test Files 454 passed | 9 skipped (463)`** · **`Tests 5788 passed | 119 skipped (5907)`**.
📌 Coincide col `5788 | 119` su 463 del mandato — rifatta comunque.

**FASE 7, uscita letta DA VARIABILE, mai dietro una pipe** (il Task 4 ha misurato un `0` falso proprio
così: era l'uscita di `head`):

```
npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
→ VERIFY_EXIT=0
   Test Files  454 passed | 9 skipped (463)
        Tests  5793 passed | 119 skipped (5912)
   ✓ Compiled successfully in 7.7s
   ✅ DS compliance OK (v2.3 legacy + v3)
   ✅ Guardia CSRF verde — ogni route mutante verifica l'origine
   ✅ reduced-motion · ✅ coerenza documenti · ✅ salvataggio installato
   ✅ 2 progetti Playwright dichiarati, 2 con prove
   ✅ verifica «full» registrata (.claude/state/ultima-verifica)
```

🔴 **Una correzione a me stesso, sulla validità di questa misura.** Il primo `verify:full` è tornato
`VERIFY_EXIT=0` — **ma le sue fasi `tsc`/`eslint`/`vitest` erano già passate quando ho aggiunto l'ultimo
commento alla rotta** (quello che spiega perché il cancello sta *dopo* il controllo del laboratorio). Un
verde su file che poi cambiano **non è il verde di quei file**, nemmeno se la modifica è un commento: è
esattamente la forma «l'ho misurato, ma non su questo». **Rimisurato per intero sull'albero finale** — il
riquadro qui sopra è la seconda misura, non la prima.

| | prima | dopo | atteso |
|---|---|---|---|
| passate | 5788 | **5793** | ✅ **+5**, e l'aritmetica torna: **−1** (`㉓` ritirata) **+6** (`㉔`-`㉙`) |
| **saltate** | 119 | **119** | ✅ **NON salgono** — sono prove unitarie, `verify:full` le esegue |
| file | 463 | 463 | ✅ invariati: nessun file di prova nuovo |
| il solo `api-avviso.test.ts` | 26 `it` | **31 `it`** | ✅ 26 − 1 + 6 |

**Altre misure, tutte con l'uscita da variabile:**
- `npx tsc --noEmit` → **`TSC_EXIT=0`**
- `npx eslint` sui due file `--max-warnings 0` → **`ESLINT_EXIT=0`**
- `tsc` **col refuso** `'admin'` nudo nell'allowlist → **`TSC_EXIT=0`**, cioè **nessuna protezione**: è la
  misura che giustifica la prova `㉔` (§②).

---

## ⑦ Che cosa resta `non provato`, col motivo

| cosa | perché non è provato qui |
|---|---|
| Che il cancello si comporti così **su una sessione vera**, con un utente `admin_sistema` a cui si sia valorizzato il laboratorio | Le prove **fingono** `getFreshLabContext`. Lo stato è provato **legale** sul banco (§④), ma nessun utente reale ce l'ha oggi: `admin_rete` non esiste affatto in banca dati e l'unico `admin_sistema` ha laboratorio nullo. Il giro vero è il **Task 10**. |
| Che i cinque nomi scritti nella prova siano ancora i cinque **il giorno in cui la prova gira** | Una prova unitaria non parla col banco. Il `CHECK` è letto **oggi** (09/08/2026) e la misura è incollata nel file; se domani nascesse un sesto ruolo, `㉔` **non** lo saprebbe — ma `㉙` garantisce che quel ruolo sia **rifiutato** finché qualcuno non lo scrive nell'allowlist. Il verso è fail-closed. |
| Che ⚖️ D342 sia rispettata **anche dalla striscia** della home | Fuori dal mio mandato (Task 7). `striscia.ts:270-274` oggi dà ad `admin_rete` gli stessi poteri del titolare: **letto, non toccato** (§⑧ R1). |
| Che il fondamento normativo dell'esclusione di `admin_sistema` sia l'**Art. 28(3)(a)** e non altro | Riportato dal verbale, **non riverificato da me** su fonte primaria: non è nel mio mandato e il verbale stesso lascia due questioni normative aperte a un panel. |
| Che «`front_desk`» sia una parola comprensibile a chi legge | **Non lo è**, ed è per questo che la frase del 403 **non** interpola `context.ruolo`: dice «*il tuo ruolo*», non l'identificativo di banca dati (`CLAUDE.md` §0D). Che la frase sia quella giusta per un'operatrice al banco è un giudizio di prodotto, non una misura. |

---

## ⑧ Ritrovamenti fuori mandato — riferiti, non corretti (R-E2)

**R1 🔴 `striscia.ts` contraddice D342 in due punti, e uno dei due il verbale non lo nomina.**
`src/lib/dashboard/striscia.ts:270-274` — `usaFiscali()` include **`admin_rete`** (`titolare ||
admin_rete || front_desk`) e `usaPagamenti()` è `titolare || admin_rete`. Il verbale cita la prima; la
seconda è la stessa famiglia. **Non toccato** (è il Task 7), ma va detto **come** si chiude: il Task 7
**importi `RUOLI_CHIUSURA_AVVISO`** invece di riscrivere i tre nomi. «La visibilità è un sottoinsieme del
permesso» regge solo se i due posti leggono **un elenco solo** — due copie di un elenco di permessi
divergono, ed è già successo in questa casa con `admin_sistema`.

**R2 🔴 `supabase/schema.sql:247` porta un `CHECK` VECCHIO di QUATTRO ruoli.**
`CHECK (ruolo IN ('titolare','tecnico','front_desk','admin_rete'))` — **senza `admin_sistema`**, che
`supabase/migrations/001_commercial_infra.sql:8` aggiunge e che il catalogo vivo conferma. ➡️ **Chiunque
costruisca un cancello di ruolo leggendo `schema.sql` costruisce un elenco di quattro**, ed è esattamente il
modo in cui `admin_sistema` è stato dimenticato la prima volta (`CLAUDE.md` §9). Non l'ho corretto: toccare
lo schema di riferimento è fuori dal mio perimetro e va deciso una volta per tutto il file (è un'istantanea
vecchia, non un errore isolato).

**R3 🟠 Non esiste un posto solo dove vivono i cinque ruoli, e adesso le copie sono TRE.**
`RuoloInvito` (quattro) · `RUOLI_EMISSIONE_DPA` (tre, con i cinque **in prosa** nel commento) · e ora
l'elenco nella mia prova. Ogni allowlist di funzione è giusta che stia vicino alla sua funzione — **ciò che
manca è l'elenco dei ruoli ESISTENTI**, contro cui confrontarle. Proposta, **non fatta**: un
`src/lib/auth/ruoli.ts` con i cinque e un `isRuolo()`, così ogni allowlist futura si valida contro quello
invece di ricopiarlo. Fuori dal mio perimetro (due file).

**R4 🟠 `RUOLI_PEC_SETUP` è duplicato in due rotte, riga per riga.**
`src/app/api/impostazioni/pec/route.ts:9` e `…/pec/start-verify/route.ts:10` portano entrambe
`const RUOLI_PEC_SETUP = ['titolare', 'admin_rete']`, **non esportato**, quindi due copie che possono
divergere. Trovato dal censimento, non toccato.

**R5 📌 Restano aperti i ritrovamenti del Task 4** (R2 gettone del portale · R3 promemoria su lavoro
cestinato · R4 abbonamento che blocca un adempimento di legge · R5 `anon` con `SELECT` · R6 la prova
`lab-guard-routes-enforce` che campiona due rotte su 124): **nessuno è mio, nessuno è stato toccato.**
⚠️ **R4 del Task 4 vale ancora e ora ha un fratello:** oggi un adempimento GDPR può essere bloccato da uno
stato di abbonamento **e** dal ruolo. La seconda è una decisione ratificata; la prima no.

---

## ⑨ Il salvataggio

| | |
|---|---|
| **`aa85fa5f`** | `feat(avvisi): D342 — chi chiude un avviso sta IN laboratorio, e i due esclusi lo sono PER NOME` — `src/app/api/lavori/[id]/avviso/route.ts` + `tests/unit/api-avviso.test.ts`, **2 file, +264 −34** |
| questo resoconto | salvato con il commit che segue |

`git status --short` **prima** di salvare (albero condiviso): solo i miei due percorsi modificati e il
resoconto non tracciato. `git add <percorsi>` — **mai `-A`** (⚖️ D318). Messaggio lungo con `-F`.
**Nessun `push`, nessun `main`, nessun worktree, nessuna migration, nessuna interfaccia.**
`main` intatta a `7427a680`. Il pre-commit ha girato: CSRF · reduced-motion · coerenza documenti ·
salvataggio, tutti verdi.

🔴 **Fuori dal mio mandato e NON fatto, da fare a livello di ondata: BP-1** (`MEMORY.md` + `ROADMAP`).
Il brief limita il perimetro a due file più questo resoconto e non nomina BP-1; **non me lo sono preso da
solo** (R-E2), ma va segnalato invece che taciuto: la rotta ha ora un cancello di permessi che prima non
aveva, ed è il genere di fatto che una sessione nuova deve trovare scritto.

<sub>Le sonde SQL sono girate **in transazione annullata** su `iagibumwjstnveqpjbwq` (banco di prova,
`CLAUDE.md` §8) e il ripristino è stato **riverificato** dopo (`admin_sistema.laboratorio_id` ancora
`null`). File delle sonde: nello scratchpad, **non committato** — R-P1 §8: gli spike sono usa e getta.</sub>

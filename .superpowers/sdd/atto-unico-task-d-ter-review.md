# REVISIONE — Task D-ter: i quattro rilievi della revisione del Task D

**Revisore indipendente** (non ho scritto io questo codice) · **Data:** 08/08/2026
**Ramo:** `intervento-post-consegna` · **Base:** `aa1ff3e5` · **Testa:** `01b62a0e` (due salvataggi)
**Mandato:** `.superpowers/sdd/atto-unico-task-d-ter-brief.md`
**Resoconto revisionato:** `.superpowers/sdd/atto-unico-task-d-ter-report.md`

---

## VERDETTO: **APPROVATO CON RILIEVI**

| cosa | esito |
|---|---|
| CRITICI | **1** — preesistente al Task D-ter, **non introdotto da questo diff**, ma smonta la premessa del suo §4 |
| IMPORTANTI | **3** |
| MINORI | **4** |
| Le cinque mutazioni del revisore, rifatte da me | **5 su 5 si accendono**, e **5 su 5 sull'asserzione giusta** |
| Mutazioni mie in tutto | **13** (11 accendono · **2 restano verdi**) |
| 🔴 Mutazioni NUOVE che restano VERDI | **2**, e **nessuna delle due è dichiarata** nel resoconto |
| FASE 7 rilanciata da me | v. §FASE 7 |
| Perimetro | **rispettato** — nessun contratto fermo toccato, tinte non toccate |

### Che cosa regge, e va detto per primo perché è la parte misurata

**La misura centrale del resoconto è vera, e l'ho rifatta io.** Le cinque mutazioni che il revisore
del Task D aveva visto restare verdi **adesso si accendono tutte e cinque**, e — la parte che
C-quater insegna a controllare — **ognuna si accende sull'asserzione giusta**, non per un effetto
collaterale. Nessuna prova nuova è decorazione: le altre mutazioni che ho fatto sui punti nuovi
(F1, il riquadro del conflitto, il riuso dell'evento, il tasto spento) accendono tutte.
**Il perimetro è rispettato:** `git diff --stat aa1ff3e5..01b62a0e` → **cinque file**, e nessuno dei
contratti fermi compare.

---

# CRITICI

## C1 — 🔴 IL GETTONE SI GUASTA DA SOLO FRA LE DUE CHIAMATE DELL'ATTO UNICO: il 409 non è «probabile», è **la norma**, e la causa non è F1

🛑 **Preesistente al Task D-ter — non l'ha introdotto questo diff.** Lo alzo a CRITICO lo stesso
perché **è la premessa su cui poggiano il rilievo ④ del brief e tutto il §4 del resoconto**, ed è
falsa: F1 non è la ragione per cui quel 409 arriva. La ragione è **una riga dentro la prima delle
due chiamate**, e arriva **sempre**.

**La catena, sei anelli, tutti letti sul codice:**

| # | fatto | prova |
|---|---|---|
| ① | `correggiERifai` chiama `depositaEvento(statoDisp)` e **subito dopo** manda `atteso_updated_at: voci.updatedAt` — lo stesso valore letto al montaggio | `DevoIntervenire.tsx:627` e `:647` |
| ② | la rotta degli eventi chiama `incrementaCorrezioni(...)` **sempre**, in fondo all'handler | `eventi-qualita/route.ts:464` |
| ③ | quella funzione fa `UPDATE lavori SET post_consegna_correzioni = n+1` — **salvo** `stato_dispositivo === 'mai_uscito_dal_lab'` | `eventi-qualita/route.ts:695`, `:707` |
| ④ | la colonna è `SMALLINT NOT NULL DEFAULT 0`, quindi il valore è **sempre** un numero e l'`UPDATE` **parte davvero** | `002_fase2_schema.sql:75` |
| ⑤ | `trg_lavori_updated_at` è **BEFORE UPDATE su `lavori`** e fa `NEW.updated_at = now()` | `schema.sql:985` + `schema.sql:58-66` — **e lo dice la migration dell'atto unico stessa**, `20260808093513:98` |
| ⑥ | la RPC confronta e risponde `conflitto` | `20260808093513:238-239` — `IF p_atteso_updated_at IS NOT NULL AND v_gettone IS DISTINCT FROM p_atteso_updated_at THEN RETURN json_build_object('esito','conflitto', …)` |

**E nessuno rinfresca il gettone in mezzo:** `accogliEvento` tocca solo lo stato locale di
`DevoIntervenire`; `daRinfrescare` **rimanda** il `router.refresh()` a `ricomincia()`
(`DevoIntervenire.tsx:503`); `voci` arriva dal padre come `vociDelDocumento(lavoro)` su
`lavoroLocale` (`SchedaLavoroV3.tsx:599`), che non si muove.

```
$ grep -n "post_consegna_correzioni" src/app/api/lavori/[id]/eventi-qualita/route.ts
464:  await incrementaCorrezioni(
707:      .update({ post_consegna_correzioni: valoreLetto + 1 })
$ grep -n "apply_updated_at_trigger('lavori')" supabase/schema.sql
985:SELECT apply_updated_at_trigger('lavori');
$ sed -n '58,66p' supabase/schema.sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at() … NEW.updated_at = now();
```

**E il gettone del corpo arriva alla RPC intatto, senza nessuna rilettura per strada** — è l'unico
buco che avrebbe salvato C1, e non c'è: `riemetti/route.ts:255` (`const atteso = attesoGrezzo`) →
`:361` (`atteso` passato alla RPC). Fra i due, nessun `select('updated_at')` su `lavori`.

⚠️ La migration dell'atto unico ragiona sullo stesso pericolo **un piano più sotto** (`:98-110`:
dentro **una** transazione `now()` è costante, quindi le penne annidate si passano il valore di
ritorno). Quel ragionamento è giusto e **non copre questo caso**: qui le chiamate sono **due
richieste HTTP separate**, e in mezzo c'è una transazione che ha già scritto.

➡️ **Conseguenza, in parole piane:** il foglio registra l'evento, quella registrazione **muove il
gettone del lavoro**, e un istante dopo il foglio manda il gettone **di prima**. La riemissione
prende **409**. Succede su **ogni** risposta diversa da «non è mai uscito dal laboratorio» — salvo
la corsa dichiarata al §8 di «cosa non ho verificato», che è l'unico caso in cui l'`UPDATE`
potrebbe non partire — e
`DevoIntervenire` si monta **solo su un lavoro `consegnato`** (`SchedaLavoroV3.tsx:595`), cioè su un
manufatto che è uscito. Il valore di partenza delle quattro caselle è
`'consegnato_non_applicato'` (`DevoIntervenire.tsx:429`), che **non** è l'esenzione.

🔑 **Perché è più grave di un 409:** ogni tentativo **rende e carica un PDF e brucia un
progressivo** — lo dichiara la rotta stessa (`riemetti/route.ts:384-390`: «*un file orfano e un
numero bruciato*»). E il messaggio che la persona legge è quello della rotta: «**Qualcun altro ha
toccato questo lavoro mentre stavi correggendo**». **Non è vero: è stata l'app, un decimo di
secondo prima.**

⚠️ **La rete non può vederlo**, ed è il motivo per cui nessuno l'ha trovato: le prove unitarie
fingono `fetch`, quindi il trigger di banca dati non esiste per loro. **Non è una mutazione che
resta verde: è un difetto che nessuna mutazione di questo file potrebbe accendere.**

📌 **Non chiedo all'esecutore del D-ter di ripararlo** (è fuori dal suo mandato, tocca la rotta degli
eventi o la RPC — contratti fermi). Chiedo che **la premessa smetta di essere scritta come vera**:
il §4 del resoconto e il rilievo ④ del brief attribuiscono a F1 una frequenza che appartiene a
questo. **E che il collaudo dal vivo del Task D-bis lo cerchi apposta**, perché è la prima cosa che
vedrà.

---

# IMPORTANTI

## I1 — 🔴 DUE MUTAZIONI NUOVE RESTANO VERDI, e sono la stessa famiglia del difetto del Task A, sulla stessa tabella che questo compito esisteva per completare

Il resoconto §1⑦ enumera il corpo dell'evento del percorso nuovo e nomina **quattro** forme:
`stato_dispositivo`, `motivo`, l'instradamento, `potenziale_di_danno`. **Il corpo ne ha due in più**
— `origine_informazione` e `conosciuto_il` (`DevoIntervenire.tsx:562-566`) — e **non compaiono nella
tabella, nemmeno come «non coperta, perché»**. Le ho sondate:

```
───────── MUTAZIONE: N1-origine_informazione-CABLATA-sul-percorso-nuovo ─────────
  origine_informazione: sbaglio ? 'laboratorio_interno' : origine,
→ origine_informazione: 'laboratorio_interno',
✅ file ripristinato
Tests  54 passed (54)
— PROVE ACCESE —
  (nessuna)

───────── MUTAZIONE: N2-conosciuto_il-CABLATO-a-adesso ─────────
  conosciuto_il: sbaglio ? adessoLocale() : conosciuto,
→ conosciuto_il: adessoLocale(),
✅ file ripristinato
Tests  54 passed (54)
— PROVE ACCESE —
  (nessuna)
```

🔑 **È letteralmente il difetto del Task A**, nella stessa forma di frase: *l'app afferma al posto
della persona*. Il riquadro in testa al file (`:522-533`) lo racconta per esteso su
`stato_dispositivo` — e le due righe accanto, che fanno esattamente la stessa cosa, non hanno
guardiano.

**E non sono due campi di contorno.** `origine_informazione` **decide la classificazione ISO**:

```
$ grep -n "origine" src/lib/qualita/classifica.ts
186:  if (uscito && f.origine !== 'laboratorio_interno')
189:      perche: `… Per la norma è un reclamo.`
199:      … `È una non conformità interna, con rilavorazione (ramo ISO 8.3.3).`
```

Cablare `'laboratorio_interno'` ribalta **reclamo → non conformità interna** su un manufatto uscito:
la persona risponde «me l'ha segnalato l'odontoiatra» e il registro scrive che l'ha trovato il
laboratorio. `conosciuto_il` è **la data in cui si è venuti a sapere**, cioè il punto da cui parte
ogni conteggio di vigilanza: cablarla ad «adesso» cancella una data dichiarata.

➡️ **Il rilievo ① non è chiuso.** È chiuso per le sei voci correggibili — quelle sì, misurate e
sorvegliate — e **riaperto identico sul corpo dell'evento**, che il resoconto stesso chiama «*non è
una voce, ed è la peggiore*». Il difetto del censimento non era «tre voci»: era **il metodo di
decidere quando l'elenco è finito**, e l'elenco è stato dichiarato finito una seconda volta senza
esserlo.

## I2 — 🔴 Al secondo tentativo la schermata RICHIEDE le quattro risposte e poi non le manda da nessuna parte

`ricomincia()` riazzera **tutte e quattro** le risposte ai valori di partenza
(`DevoIntervenire.tsx:496-499`): `setOrigine('laboratorio_interno')` ·
`setStatoDisp('consegnato_non_applicato')` · `setDanno('da_valutare')` ·
`setConosciuto(adessoLocale())` · `setUscitoDichiarato(false)`.

Riprendendo, la persona **rivede le quattro caselle vuote e le ricompila**. Ma `correggiERifai`
entra nel ramo del riuso (`:622-625`) e **`depositaEvento` non parte**: le risposte appena date
**non arrivano da nessuna parte**. A schermo c'è scritto una cosa, in banca dati ce n'è un'altra —
e nessun avviso lo dice.

🔑 **Il difetto non è il riuso dell'evento — quello è giusto**, e un doppione nel registro di
qualità sarebbe peggio. Il difetto è che **la schermata continua a chiedere quattro risposte che
non userà**, senza dirlo. È una promessa d'interfaccia non mantenuta: chi corregge «era già
applicato» al secondo giro crede di aver corretto un dato, e non ha corretto niente.

➡️ **La scelta va mostrata**: o le quattro caselle non si ripropongono quando c'è già una
registrazione, o il passo dice che le risposte registrate restano quelle. Oggi non fa né l'una né
l'altra cosa, e la persona non ha modo di accorgersene.

⚠️ **La forma d'input «*la persona risponde DIVERSAMENTE al secondo giro*» non è enumerata nel §1**,
ed è per questo che nessuna prova la guarda: `arrivaAlToccoFinale()` (righe 554-558) usa **i valori
di partenza in tutti e due i passaggi**, quindi le due risposte sono identiche e la differenza non
è osservabile. 📌 Nota, non accusa: la prova nuova asserisce **un evento per un fatto**, che è la
cosa giusta da asserire; il fatto che di riflesso fissi anche il non-rideposito è un effetto, non
un'intenzione.

📌 **Corollario, stessa riga:** `eventoDaRiusare` **si azzera solo alla riuscita**. Se dopo il 409 la
persona chiude, sceglie un motivo diverso (percorso corto) e più tardi torna su «c'è un dato
sbagliato», riusa **un evento vecchio** con le risposte di un'altra sessione. Anche questa forma
non è enumerata.

## I3 — 🔴 Il censimento di F1 è stato fatto sul confine scelto dall'autore (R-P2), il numero non torna, e la domanda era un'altra

Il resoconto §5 scrive: «*ho censito **tutte** le rotte sotto `src/app/api/lavori/` che aggiornano
la tabella `lavori`, non i file che qualcuno nominava… Sono otto*». **Il confine «sotto
`src/app/api/lavori/`» l'ha scelto l'autore**, ed è precisamente ciò che R-P2 vieta.

Rifatto da me su **tutto** `src/`, con un parser invece di un grep a occhio
(`.from('lavori')` seguito da `.update(` entro sei righe):

```
=== .from('lavori').update(...) — tutti i punti in src/ ===
  src/app/api/portale/[token]/fatturazione/[lavoro_id]/route.ts:59
  src/app/api/fatture/batch/route.ts:72
  src/app/api/fatture/batch/route.ts:82
  src/app/api/lavori/[id]/eventi-qualita/route.ts:706
  src/app/api/lavori/[id]/segnala/route.ts:77
  src/app/api/lavori/[id]/segnala/risolvi/route.ts:50
  src/app/api/lavori/[id]/route.ts:806
  src/app/api/lavori/[id]/decisione-fatturazione/route.ts:75
  src/lib/lavori/transizioni.ts:61
  src/lib/pdf/generate-buono.ts:63
  src/lib/consegna/orchestrate.ts:182
  src/lib/consegna/orchestrate.ts:266
  src/lib/consegna/orchestrate.ts:322
TOTALE punti: 13  ·  file distinti: 10
Sotto src/app/api/lavori/ : 5 file
```

**Cinque file sotto il confine dichiarato, non otto** — più `prove`, che aggiorna `lavori` da una
RPC e quindi è invisibile a qualunque ricerca su `.update(`: `provato:`
`20260717120000_n12_prove_atomiche.sql:74` → `UPDATE lavori SET stato = 'in_prova_esterna',
updated_at = now()`. **Sei penne, non otto.** Le due di troppo, aperte riga per riga:

- **`lavorazioni` NON aggiorna `lavori`.** `lavorazioni/route.ts:50-56` è una **lettura**
  (`.select('id, laboratorio_id, incluso_in_fattura')`, guardia di tenant); l'unico `.update(` del
  file, a `:72`, è un `deleted_at` su **un'altra tabella**.
- **`immagini/[imgId]` legge soltanto** — e su questo il resoconto ha ragione.

**E cinque penne stanno FUORI dal confine dichiarato**, fra cui `src/lib/consegna/orchestrate.ts`
con **tre** punti, `src/lib/lavori/transizioni.ts`, `src/app/api/fatture/batch/route.ts`.

🔑 **Ma il difetto più grosso non è il numero: è la domanda.** Il resoconto chiede *«questa rotta
alimenta lo specchio locale?»* e, quando la risposta è no, mette la spunta verde. **È il verso
sbagliato.** Non alimentare lo specchio è **il difetto**, non la garanzia: il gettone si guasta
comunque, e nessuno lo sa. La domanda giusta è *«che cosa muove `lavori.updated_at` fra il momento
in cui il foglio legge il gettone e quello in cui lo usa?»* — e con `trg_lavori_updated_at`
(BEFORE UPDATE, riga per riga) la risposta è **qualunque `UPDATE` su `lavori`, comprese quelle
dentro le RPC**, che nessuna ricerca su `.from('lavori').update(` può vedere.

➡️ Applicata così, quella domanda trova **C1** — che sta nell'elenco delle otto, alla voce
`eventi-qualita`, ed è stata spuntata di verde.

📌 **Ciò che resta vero:** la correzione di F1 in sé è **giusta e nel punto giusto**, e le mie
mutazioni N5/N6 lo confermano. Il rilievo è sul **censimento** e sulla conclusione «non ce ne sono
altre», non sulla riga di codice.

---

# MINORI

## m1 — La riga citata per la `PATCH` è **810**, non 809

`ModificaRigaSheet.tsx` (commento nuovo) e il resoconto §5 citano
`api/lavori/[id]/route.ts:809`. `provato:`

```
$ grep -n "select('id, numero_lavoro, stato, updated_at')" src/app/api/lavori/[id]/route.ts
810:    .select('id, numero_lavoro, stato, updated_at')
```

809 è `.eq('laboratorio_id', …)`. Il testo citato nel commento è giusto, il numero è avanti di uno.

## m2 — «così com'è digitata» è dichiarata coperta, ma l'input che la distingue non esiste

Il §1① mette ✅ sulla forma «*`string` non vuota, così com'è digitata*». Ho sondato la sola cosa che
distingue «com'è digitata» da «ripulita»:

```
───────── MUTAZIONE: N3-testo-TRIMMATO-invece-che-come-digitato ─────────
  return { valore: testo, mostrato: vivo }  →  return { valore: vivo, mostrato: vivo }
Tests  54 passed (54)
— PROVE ACCESE — (nessuna)
```

**Resta verde**, perché il valore di prova non ha spazi ai bordi. Lo classifico MINORE e non
IMPORTANTE perché **è una forma dichiarata coperta, non una taciuta**, e la conseguenza pratica
(mandare il testo ripulito) sarebbe innocua. Ma la spunta ✅ afferma più di quanto sia misurato.

## m3 — Il riquadro promette una ripresa che su un ramo si auto-sana e su un altro è un anello chiuso

«*riprendendo da qui non se ne registra una seconda*» è vero su tutti e sei. Ma «riprendere» **porta
a un esito diverso** a seconda del ramo, e i due estremi meritano di essere scritti:

- **`evento_gia_consumato`** (`riemetti/route.ts:423`): al secondo giro la porta d'idempotenza
  (`:275-315`) trova la dichiarazione annullata da quell'evento e **restituisce il successore con
  200** → la ripresa **si auto-sana**. Qui il titolo «Questo tentativo non è riuscito» è impreciso
  (il documento *è* stato rifatto), ma il giro dopo lo aggiusta.
- **`nessuna_dichiarazione_viva`** (`:412`): il riuso ripropone lo stesso evento sullo stesso stato
  → **stesso 409, all'infinito**. «Ricarica e riprendi» è un anello chiuso.

Il resoconto dichiara il limite solo per il ramo `:311`. Questi due no.

## m4 — «Ricarica e riprendi» butta anche le sei correzioni, e il testo non lo dice

`ricomincia()` fa `setCorrezioni({})` (`:500`). La persona che ha corretto quattro voci le riperde
tutte. Il riquadro rassicura sulla **registrazione** e tace sulle **correzioni** — che sono la cosa
che ha appena finito di digitare.

---

# GIÀ RIFERITI — confermati, una riga ciascuno come da mandato

- **G1** (il commento su `router.refresh()` a `DevoIntervenire.tsx:457-465`) ✅ **confermato**:
  `SchedaLavoroV3.tsx:188-191` risincronizza `lavoroLocale` *proprio perché* lo stato locale
  sopravvive — il meccanismo scritto è il contrario del vero.
- **I sei 409 indistinguibili** ✅ **confermati**, letti uno per uno: `:311` · `:394` · `:412` ·
  `:423` · `:427` · `:432`, nessun codice leggibile a macchina.
- **Le tinte `--elv`** e **l'odontogramma dentro il foglio** ✅ restano al gate L2 (Task D-bis):
  non li riapro.

---

# IL RILIEVO ② — verificato, e questa parte è **chiusa bene**

`git diff aa1ff3e5..01b62a0e --stat -- src/app/ds-v3.css` → **vuoto: il file dei token non è stato
toccato.** I valori che il commento nuovo cita sono quelli veri:

```
$ sed -n '50,52p' src/app/ds-v3.css
/* Dark — elevazione = superficie più chiara, MAI ombre (spec §3.2) */
[data-theme="dark"] [data-ds="v3"] {
  --bg: #171411; --bg-deep: #100E0B; --card: #211D18; --elv: #2B2620;
```

`--bg-deep` (`#100E0B`) è **più scuro** del `--card` (`#211D18`) e del fondo (`#171411`): il commento
adesso lo dice così. **E le tinte non sono state cambiate** — `var(--bg-deep)` è ancora su tutte e
quattro le superfici nuove (righe 816, 874, 1084, 1338), come deve essere: sono del gate L2.
✅ **Il confine è stato tenuto nel verso giusto**, e il commento nuovo dichiara apertamente «questa
tinta NON è verificata», che è esattamente ciò che serve a non spegnere il gate.

---

# LE MIE MUTAZIONI — 13, con l'asserzione che si accende

Banco mio, indipendente da quello dell'esecutore (il suo, `scripts/tmp/muta.mjs`, non è
committato): sostituisce **una** occorrenza, rifiuta il frammento non unico, lancia `vitest
--reporter=verbose`, stampa **il nome della prova e la riga di asserzione**, rimette il file e
**verifica il ripristino**. Albero pulito prima e dopo (`git status --short` → solo il `.diff` non
tracciato). **Base: 54 prove in `DevoIntervenire.test.tsx`, 13 in `ModificaRigaSheet.test.tsx`, 67
in tutto, tutte verdi.**

### A · Le cinque del revisore, rifatte da me — 5 su 5 si accendono, 5 su 5 sull'asserzione giusta

| # | mutazione | rossi | prova accesa | **asserzione** |
|---|---|---|---|---|
| R1 | `valore: scelto.id` → `scelto.mostrato` | **1** | *il paziente viaggia come UUID…* | `expected 'Maria Rossi' to be '99999999-…'` |
| R2 | `sotto.elementi = […].sort(…)` → `.map(String)` | **1** | *…«elementi» sono NUMERI* | `expected { elementi: [ '26', '27' ] } to deeply equal { elementi: [ 26, 27 ] }` |
| R3 | `valore: sotto` → `valore: fuso` | **2** | *…sotto-chiave cambiata…* · *…il solo colore…* | `expected { elementi:[26,27], colore:'A3' } to deeply equal { elementi:[26,27] }` · `expected { elementi:[26], colore:'B2' } to deeply equal { colore:'B2' }` |
| R4 | `valore: tipo` → `LABEL_MACRO[tipo]` | **1** | *…SLUG del vocabolario…* | `expected 'Protesi mobile' to be 'protesi_mobile'` |
| R5 | `depositaEvento(statoDisp)` → `depositaEvento('mai_uscito_dal_lab')` | **1** | *…lo stato è quello DICHIARATO…* | `expected 'mai_uscito_dal_lab' to be 'applicato'` |

✅ **La dichiarazione del resoconto («5 su 5 si accendono») regge alla riprova, e regge anche al
controllo più fine**: nessuna si accende per il motivo sbagliato.

### B · Le mie mutazioni nuove — 6 accendono, **2 restano verdi**

| # | mutazione | rossi | esito |
|---|---|---|---|
| N1 | `origine_informazione` **cablata** a `'laboratorio_interno'` | **0** | 🔴 **VERDE — v. I1** |
| N2 | `conosciuto_il` **cablato** a `adessoLocale()` | **0** | 🔴 **VERDE — v. I1** |
| N3 | il testo parte **ripulito** invece che com'è digitato | **0** | 🟡 verde, forma **dichiarata** coperta — v. m2 |
| N4 | il carico manda `voce.mostrato` invece di `voce.valore` | **5** | ✅ ben sorvegliata (paziente · tipo · denti · le due prescrizioni) |
| N5 | F1: gettone **riparsato** `new Date(...).toISOString()` (microsecondi troncati) | **1** | ✅ *il gettone di concorrenza torna dal SERVER* — `expected "vi.fn()" to be called with arguments` |
| N6 | F1: `onSalvato(patchLocale ?? patch)` (com'era prima) | **1** | ✅ stessa prova |
| N7 | tasto **riacceso** dopo il 409 (`disabled` senza `conflitto !== null`) | **2** | ✅ *il 409 si mostra com'è scritto* · *un secondo intervento registra un evento NUOVO* |
| N8 | `setEventoDaRiusare(evento)` **tolto** | **1** | ✅ *…la registrazione si RIUSA…* — `expected 2 to be 1` |

🔑 **La prova che l'esecutore dichiara «che porta i microsecondi» l'ho rotta apposta (N5) e si
accende.** Il valore `'2026-08-08T12:34:56.654321+00:00'` è scelto bene: `new Date(...)` lo tronca a
`.654Z` e la prova cade. **F1 è chiuso davvero**, e chiuso nel punto giusto — `ModificaRigaSheet.salva`,
l'unica via verso il backend, non una copia per ramo. **Il gettone viene dalla risposta** (`risposta.lavoro.updated_at`)
e **non viene riparsato**: `grep -n "new Date\|toISOString"` su quel file trova **una sola riga, la
:97**, che è `parseDataISO` per il campo data di consegna e non tocca il gettone.

---

# FASE 7 — rilanciata da me, sull'albero pulito a `01b62a0e`

`npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — righe **incollate** dal log:

```
 Test Files  448 passed | 6 skipped (454)
      Tests  5659 passed | 68 skipped (5727)
   Duration  37.87s (transform 12.83s, setup 100.52s, import 46.23s, tests 118.59s, environment 244.00s)
✓ Compiled successfully in 3.3s
✓ Generating static pages using 15 workers (82/82) in 166ms
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde — ogni route mutante verifica l'origine, o è esclusa con una ragione scritta
✅ reduced-motion: niente si sposta a preferenza accesa, tutto arriva a riposo, la molla resta a preferenza spenta
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto, e la rete di sicurezza è recente
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti: nessuna squadra vuota, nessuna prova orfana
✅ verifica «full» registrata (.claude/state/ultima-verifica)
VERIFY_EXIT=0
```

**Base 5649 | 68 su 454 → misurata da me 5659 | 68 su 454. +10, esattamente il numero dichiarato**
dal resoconto. `tsc`, `eslint --max-warnings 0`, `vitest`, `next build` e le sei guardie: tutti
verdi. Albero pulito prima e dopo.

⚠️ **E vale la pena dirlo: nessuna guardia vede C1, I1 o I2.** Il verde di questa sezione misura che
niente si è rotto, non che quello che c'è sia giusto.

---

# 🛑 CHE COSA NON HO VERIFICATO — per intero

1. **FASE 9 (390/768/1280, chiaro e scuro) e il GATE ESTETICO L2.** Fuori dal mio mandato.
   **Non ho aperto nessuna schermata**: tutto ciò che dico su testi e superfici viene dal codice.
   ⚠️ **Confermo la segnalazione dell'esecutore**: il riquadro del conflitto è **una superficie
   nuova con testo visibile nuovo**, quindi sotto D245 **il gate L2 gli è dovuto**. Ho verificato
   che non porta componenti nuovi (`git diff` sulle righe `import` → **nessuna riga**: `Esito` e
   `TastoSecondario` erano già nel file) e nessuna animazione inline.
2. **`scripts/guardia-navigazione-overlay.mjs`: non l'ho lanciata neanche io.** È la **quarta**
   volta che compare in un documento senza che nessuno l'abbia eseguita. Serve l'app accesa.
3. **Il banco vero.** Nessun accesso al database, nessuna riemissione provata dal vivo.
   🔴 **C1 è provato leggendo sei anelli di codice e SQL, non eseguendo il flusso.** È la cosa che
   più merita una controprova dal vivo, ed è la prima che il Task D-bis dovrebbe fare.
4. **Le 24 prove preesistenti** di `DevoIntervenire.test.tsx` e le 12 di `ModificaRigaSheet.test.tsx`:
   non le ho mutate.
5. **`perchePrecluso`** e le sei forme dichiarate «non coperta» dal §1: **non le ho sondate** —
   sono dichiarate, e una dichiarazione onesta non è un difetto.
6. **La RPC, `correzioni.ts`, `generate-ddc.ts`, `precheck.ts`** come contratti: letti **solo** nei
   punti che servivano a C1 e al giudizio sul 409. Non li ho revisionati.
7. **Il tema chiaro** e ogni giudizio di palette: non miei.
8. **Se la corsa di `incrementaCorrezioni`** (confronta-e-scambia, dichiarata nel suo commento)
   possa *non* far partire l'`UPDATE` in qualche caso reale: non l'ho misurato sul banco. Se non
   partisse, C1 non scatterebbe **in quel caso** — ma la lettura del codice dice che con
   `SMALLINT NOT NULL DEFAULT 0` parte sempre al primo tentativo.

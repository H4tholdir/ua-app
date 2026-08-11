# REVISIONE INDIPENDENTE — Task C-bis · L'irrigidimento di `p_nuova`

**Data:** 08/08/2026 · **Ramo:** `intervento-post-consegna` · **Oggetto:** `90c6bf88..aabfd385`
**Revisore:** agente indipendente, non l'esecutore. Nessuna riga di codice è stata corretta da me.

---

## VERDETTO

| cosa | esito |
|---|---|
| **verdetto** | 🟠 **APPROVATO CON RILIEVI** |
| C0 chiuso, e senza creare un difetto nuovo | ✅ **verificato da me**, sonde R1 + R3 |
| C1 chiuso, derivazione equivalente al TypeScript | ✅ **verificato da me** su **18** valori (l'esecutore ne dichiarava 10), espressione estratta **dal catalogo**, `diff` vuoto |
| il resto del corpo intatto | ✅ **verificato da me** — il `diff` Task B → catalogo vivo è **4 blocchi, tutti in aggiunta, zero righe tolte** |
| non-regressione | ✅ **17 asserzioni su 17**, col gettone vero arretrato di un'ora — ⚠️ ma con un punto cieco che ho smontato (§6) |
| rilievi CRITICI | **nessuno** |
| rilievi IMPORTANTI | **3** — di cui uno è un **buco più largo di come il resoconto lo descrive** |
| rilievi MINORI | **3** |
| correzioni a me stesso | **1**, scritta per intero in §11 (avevo citato una sonda che sotto la mia stessa regola alzerebbe) |

**Il perché in una frase:** le due porte del mandato sono chiuse davvero e il resto della funzione è
provatamente intatto, ma **il buco residuo sulla coppia `anno_ddc`+`progressivo_ddc` è simmetrico e il
resoconto lo descrive a metà**, proponendo una correzione «di una riga» che ne chiuderebbe **una sola
delle due direzioni**.

---

## 1. 🔴 DOMANDA 1 — C0 è chiuso davvero, e la chiusura non ha creato un difetto nuovo?

**Sì a entrambe, e l'ho misurato io.**

### 1a — Il rifiuto

`provato:` fixture del Task B costruita **dentro** una transazione annullata, `SET LOCAL ROLE
service_role`, **una sola invocazione**:

```
########## R1 — C0 rifiuto ##########
ERRORE P0001 atto unico: chiavi che la dichiarazione nuova NON accetta dal chiamante: {stato}
  — stato lo decide questa funzione (la nuova nasce «generata»), numero_ddc si deriva da anno_ddc+progressivo_ddc
USCITA=1
```

📌 E la guardia sta **prima** del `SELECT … FOR UPDATE` su `lavori` (si legge dalla posizione nel
`diff`: il blocco nuovo entra fra il controllo delle non-colonne e la forma delle penne), quindi una
chiamata rifiutata **non scrive niente**. Non serviva una sonda: si legge dall'ordine del corpo.

### 1b — L'ereditarietà, che è la parte che poteva rovinare tutto

L'esecutore riferisce che *rifiutare senza forzare* avrebbe fatto **ereditare** `stato` dalla vecchia.
**È vero, e l'ho misurato in due tempi nella stessa transazione** — prima l'assunzione da sola, poi la
funzione vera — su un banco in cui la vecchia è `firmata`, con data di firma, URL di firma e invio al
dentista già valorizzati:

```
########## R3 — firma azzerata / stato forzato ##########
[12] (a) IL ROSSO DELL'ASSUNZIONE — jsonb_populate_record DA SOLO, sulla stessa riga vecchia:
     a_stato_ereditato=firmata | a_firma_ereditata=true

[14] la funzione VERA:
     esito={"esito":"ok","nuova_id":"ed898c78-…","vecchia_id":"8f603ee9-…",
            "numero":"DDC-2099-999002","numero_superato":"SONDA-2099-0001", …}

[16] la riga NUOVA, campo per campo:
     b01_stato=generata          | b02_nasce_generata=true
     b03_firmata_at_nulla=true   | b04_firma_url_nulla=true
     b05_non_inviata=true        | b06_data_invio_nulla=true
     b07_causale_nulla=true      | b08_non_cancellata=true
     b09_filo=true               | b10_numero=DDC-2099-999002
     b11_vecchia=annullata
USCITA=0
```

🔑 **Il rosso (a) è la parte che conta**: senza di esso «`stato = generata`» sarebbe un'affermazione
non falsificabile. Con una vecchia `firmata`, `jsonb_populate_record` da solo **eredita davvero**
`'firmata'` e la data di firma — quindi il valore forzato dall'esecutore chiude un difetto **che si
sarebbe aperto** rifiutando e basta. La sua sonda ⑥ diceva il vero.

✅ **E i campi di firma sono azzerati per davvero** (b03-b06), insieme a causale d'annullo e
`deleted_at` (b07-b08). ⚠️ Quel blocco di azzeramenti è **codice preesistente del Task B**, non nuovo:
ciò che ho verificato è che **regge ancora sotto il nuovo `stato` forzato**, che è il rischio vero di
composizione. Regge.

---

## 2. 🔴 DOMANDA 2 — La derivazione di `numero_ddc` in SQL è equivalente a quella TypeScript?

**Sì. E l'ho riprovata con più valori di quelli dichiarati, senza riscrivere l'espressione a mano.**

🛑 **Il metodo, perché è ciò che rende la risposta credibile:** ho **estratto l'espressione dal
catalogo vivo** (`pg_get_functiondef`) e l'ho parametrizzata con una sola sostituzione meccanica
(`v_nuova.anno_ddc` → `t.a`, `v_nuova.progressivo_ddc` → `t.p`). Non l'ho ricopiata: una prova su
un'espressione ridigitata prova la mia digitazione, non il codice vivo.

```
ESPRESSIONE ESTRATTA DAL CATALOGO VIVO:
'DDC-' || v_nuova.anno_ddc::text || '-' ||
    lpad(v_nuova.progressivo_ddc::text,
         greatest(4, length(v_nuova.progressivo_ddc::text)), '0')
```

`provato:` 18 valori — `0,1,7,42,99,100,999,1000,1001,9999,10000,10001,99999,999002,2147483647,-1,-5,-999`
— contro `node -e` con `padStart(4,'0')`:

```
0           DDC-2099-0000        1000        DDC-2099-1000
1           DDC-2099-0001        1001        DDC-2099-1001
7           DDC-2099-0007        9999        DDC-2099-9999
42          DDC-2099-0042        10000       DDC-2099-10000   ← il confine
99          DDC-2099-0099        10001       DDC-2099-10001
100         DDC-2099-0100        99999       DDC-2099-99999
999         DDC-2099-0999        999002      DDC-2099-999002
2147483647  DDC-2099-2147483647  -1/-5/-999  identici in entrambi

=== diff ===
DIFF VUOTO — EQUIVALENTI su 18 valori
```

✅ **Confermata anche la trappola che l'esecutore ha trovato**, e non era nel brief:

```
naive_10000=1000 | naive_999002=9990 | naive_9999=9999
```

`lpad('10000',4,'0')` → `'1000'`. **Un numero di documento troncato e plausibile.** La forma
`greatest(4, length(…))` è la sola equivalente, ed è quella scritta. 🔑 L'equivalenza tiene **anche
sui valori assurdi** (i negativi producono la stessa stringa storta in tutti e due i sistemi): è il
criterio giusto — «stessa stringa», non «stringa sensata».

📌 **Il costo dichiarato è reale e va tenuto:** il formato del numero vive ora in **due** posti
(`src/lib/pdf/generate-ddc.ts:226` e la RPC). L'esecutore l'ha scritto nel `COMMENT` della funzione,
cioè dove lo legge chi la tocca, non solo nel resoconto. È la collocazione giusta.

---

## 3. 🔴 DOMANDA 3 — Il resto del corpo è rimasto intatto?

**Sì, e la prova è la più forte possibile: il `diff` non toglie NIENTE.**

`provato:` corpo del Task B (`git show 60cb4828^:supabase/migrations/20260808093513_correggi_e_riemetti_atomica.sql`)
contro il corpo **vivo** estratto da `pg_get_functiondef` — **quattro blocchi, tutti in aggiunta**:

| # | dove | che cosa aggiunge | righe tolte |
|---|---|---|---|
| ① | `DECLARE` | `c_nuova_vietate CONSTANT text[] := ARRAY['stato','numero_ddc'];` + commento | **0** |
| ② | dopo la guardia delle non-colonne | la guardia che ALZA su `stato`/`numero_ddc` | **0** |
| ③ | catena di override | `'stato', 'generata'` (+ virgola su `'updated_at', now()`) | **0** |
| ④ | prima dell'`INSERT` | `v_nuova.numero_ddc := 'DDC-' || …` | **0** |

**Nessuna delle otto cose che il mandato proteggeva compare nel `diff`, quindi nessuna è cambiata:**
ordine **annulla → correggi → inserisci** · fail-closed sull'annullo (`GET DIAGNOSTICS` + `RAISE`) ·
allowlist delle **otto** voci (`c_su_lavori` 6 + `c_su_penne` 2) · guardia di forma di
`denti_coinvolti` · pre-volo su paziente e prescrizione · chiamate alle **due penne** col gettone
passato avanti · prova dell'atterraggio su `lavori` · esiti gentili tutti prima della prima scrittura.

**E l'intestazione, letta dal catalogo:**
```
CREATE OR REPLACE FUNCTION public.correggi_e_riemetti_atomica(p_lavoro_id uuid, p_laboratorio_id uuid,
  p_evento_id uuid, p_correzioni jsonb, p_nuova jsonb, p_atteso_updated_at timestamp with time zone)
 RETURNS json | LANGUAGE plpgsql | SECURITY DEFINER | SET search_path TO 'public', 'pg_temp'
```
Stessa firma a sei argomenti, `SECURITY DEFINER` conservato, `search_path` conservato.

**ACL e ledger, dal catalogo — non dal file:**
```
proname=correggi_e_riemetti_atomica | prosecdef=true | owner=postgres
acl=postgres=X/postgres , service_role=X/postgres | cfg={"search_path=public, pg_temp"} | len_commento=2110

ledger: 20260808103515, 20260808093513, 20260807185858, …
```
✅ **Nessuna voce `PUBLIC`, `anon`, `authenticated`** — il `DROP`+`CREATE` ha rifatto l'ACL da zero e il
`REVOKE`/`GRANT` l'ha richiusa. Migration registrata, sopra il pavimento `20260808093513`.

📌 **E il file è una fonte fedele**, per questa funzione: `diff corpo_catalogo corpo_file` → **vuoto**.

---

## 4. 🟠 DOMANDA 4 — Il buco residuo su `anno_ddc`: reale, e quanto pesa

**Reale. E — questo è il rilievo che porto io — è più largo di come il resoconto lo descrive.**

### 4a — La sonda dell'esecutore si riproduce parola per parola

`provato:` vecchia a `anno_ddc = 2098, progressivo 998001`; `p_nuova = {'progressivo_ddc': 999005}`:
```
esito={"esito":"ok", …, "numero":"DDC-2098-999005", "numero_superato":"DDC-2098-998001", …}
DDC-2098-998001 | 2098 | 998001 | annullata
DDC-2098-999005 | 2098 | 999005 | generata     ← l'anno è quello VECCHIO
```
✅ La sua sonda ⑦ dice il vero.

### 4b — 🔴 MA IL ROVESCIO È ALTRETTANTO APERTO, e il resoconto non lo misura

`provato:` stesso banco, `p_nuova = {'anno_ddc': 2099}` **e niente altro**:
```
########## R7 — SOLO anno_ddc ##########
esito={"esito":"ok", …, "numero":"DDC-2099-998001", "numero_superato":"DDC-2098-998001", …}
DDC-2098-998001 | 2098 | 998001 | annullata
DDC-2099-998001 | 2099 | 998001 | generata     ← il PROGRESSIVO è quello VECCHIO
USCITA=0
```
🔴 **`esito: ok`**, e nasce una dichiarazione con un progressivo che **nessuno ha mai prenotato per il
2099**: `genera_progressivo(lab,'ddc',2099)` non l'ha emesso. La coppia `(lab, 2099, 998001)` è libera,
quindi **non collide con niente** — ed è la stessa classe di difetto di C1, sull'altra metà della coppia.

### 4c — E il caso «nessuna delle due» è invece SICURO

`provato:` `p_nuova` con solo una colonna di contenuto, né anno né progressivo:
```
########## R8 — NÉ anno NÉ progressivo ##########
ERRORE 23505 duplicate key value violates unique constraint
       "dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key"
```
✅ **Fallisce rumorosamente.** Ed è proprio questo che rende la regola giusta ovvia.

### 4d — E nessuna sonda verde poteva prenderlo

Il perché è **strutturale**, non una svista: la fixture vive nel 2099 e la non-regressione manda solo
`progressivo_ddc`, quindi l'anno ereditato **coincide per caso** con quello atteso. Prova incollata nel
rilievo **I1** (§9): spostando la sola vecchia al 2098, `a15` diventa **rossa**.

### 4e — Il giudizio

🛑 **La chiusura NON è «una riga» come dice il resoconto (§8D), o meglio: è una riga, ma non QUELLA.**
Il resoconto propone «*pretendere `anno_ddc` ogni volta che `p_nuova` porta `progressivo_ddc`*» — che
chiude 4a e **lascia aperto 4b**. La regola giusta è **o tutte e due, o nessuna delle due**: presenza
di `anno_ddc` e presenza di `progressivo_ddc` devono coincidere, e chi ne manda **una sola** viene
rifiutato. Costa comunque una sola `RAISE`, ma dev'essere l'`XOR`, non l'implicazione.

📌 **Da riconoscere all'esecutore:** `memory/MEMORY.md` voce 193 formula la conseguenza in modo
**più corretto del proprio resoconto** — «*il Task C deve mandare **sempre** la coppia*». È la regola
giusta. È il §8D del resoconto a essere asimmetrico.

📌 **Peso oggi: nullo. Peso domani: quello di C1.** `costruisciDichiarazione` manda entrambi
(`generate-ddc.ts:234-236`), quindi nessun chiamante di oggi ci inciampa — **ed è esattamente perché
nessuna prova lo troverebbe** che va chiuso adesso, mentre la funzione non ha ancora chiamanti.

---

## 5. 🟠 DOMANDA 5 — `riemetti_ddc_atomica`: ancora entrambi i buchi, e col chiamante vivo

**Confermato, e non l'ho letto: l'ho fatto succedere.**

`provato:` stessa fixture, `SET LOCAL ROLE service_role`, una invocazione:
```
########## R10 — riemetti_ddc_atomica: C0 + C1 ancora aperti? ##########
esito={"esito":"ok","nuova_id":"34c7cb8e-…","vecchia_id":"33d7f606-…",
       "numero":"GEMELLA-2099-0001","numero_superato":"SONDA-2099-0001"}

totali=2 | vive=0 | stato_lavoro=consegnato        ← LA STRADA GENTILE, ANCORA APERTA

SONDA-2099-0001   | 2099 | 999001 | annullata
GEMELLA-2099-0001 | 2099 | 999002 | annullata
```
🔴 **Un lavoro consegnato con zero dichiarazioni vive, `esito: ok`, dalla porta principale.** Ed è
passato anche `numero_ddc` arbitrario nella stessa chiamata: **tutti e due i buchi**.

**Il chiamante è vivo, ed è più vivo di come lo racconta il resoconto:**
- `src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts:144` → `riemettiDdC(…)`
- `src/lib/pdf/generate-ddc.ts:463` → `supabase.rpc('riemetti_ddc_atomica', { … p_nuova: riga })`
- `riga` = `{ ...ddc, … }` (`generate-ddc.ts:355`), e `ddc` porta **`numero_ddc`** (`:234`) **e**
  **`stato: 'generata'`** (`:323`).

🔑 **Quindi la porta di `stato` sulla gemella non è solo aperta: ci si passa a ogni riemissione**, oggi,
con un valore innocuo. Non è un difetto vivo — è una porta in **uso quotidiano** che nessuno sorveglia.

**Quanto è pericoloso:** il rischio non è che qualcuno la sfrutti oggi. È che **le due funzioni ora
sembrano gemelle e non lo sono**, e chi legge quella corretta concluda che anche l'altra lo sia.
L'esecutore l'ha scritto — nel `COMMENT` della funzione, nel resoconto §8A, in `MEMORY.md` e nella
roadmap. È la collocazione giusta e gliene va dato atto.

---

## 6. 🟠 DOMANDA 6 — La non-regressione tiene?

**Sì. 17 asserzioni su 17, e il gettone è quello vero.**

`provato:` il giro buono del Task B **meno `numero_ddc`** (chiave ora rifiutata: è il punto), con
`progressivo_ddc = 999002`, `p_atteso_updated_at` = `u0`, cioè l'`updated_at` **arretrato di un'ora**
dalla fixture — non `NULL`, non `now()`:

```
esito={"esito":"ok","nuova_id":"49cdf28c-…","vecchia_id":"2a4e07d9-…",
       "numero":"DDC-2099-999002","numero_superato":"SONDA-2099-0001", …}

a01_richiedente_nome=true        a10_prescr_elementi=true
a02_paziente_id=true             a11_vecchia_annullata=true
a03_paziente_nome_snapshot=true  a12_causale_scritta=true
a04_numero_prescrizione=true     a13_nuova_viva=true
a05_tipo_dispositivo=true        a14_filo_sostituisce=true
a06_descrizione=true             a15_numero_derivato_letterale=true   ← 'DDC-2099-999002' scritto a mano
a07_denti_tabella=true           a16_prefisso_non_ereditato=true
a08_denti_denormalizzati=true    a17_nuova_generata=true
a09_prescr_colore=true
```
✅ Le tre voci nuove (a15-a17) usano il valore atteso **letterale**, mai ricalcolato con l'espressione
in esame. Entrambe le penne sono esercitate (a07-a10).

⚠️ **Ma questa sonda ha un punto cieco, e l'ho trovato smontandola:** `p_nuova` manda **solo**
`progressivo_ddc`, mai `anno_ddc` — quindi l'anno del numero derivato è **ereditato**, e coincide con
quello atteso solo perché la fixture vive nel 2099. Spostando la vecchia al 2098 e lasciando **tutto
il resto identico**, `a15` diventa **rossa** (R5b, prova incollata in §9 · rilievo I1). ➡️ **La
non-regressione tiene**, ma
copre una metà sola della coppia: è la stessa cecità che ha lasciato passare il buco di I1.

**E `42501` con la chiave pubblica**, argomenti **costanti** e non di fixture, così un permesso
concesso avrebbe risposto `non_trovato` invece di un verde ambiguo:
```
########## R6 — SET LOCAL ROLE anon ##########
ERRORE 42501 permission denied for function correggi_e_riemetti_atomica
```

**Una forma che il resoconto dichiarava non coperta, e che ho coperto io:** `progressivo_ddc: null` →
```
ERRORE 23502 null value in column "numero_ddc" of relation "dichiarazioni_conformita" violates not-null constraint
```
✅ **Rumoroso e fail-closed** (`greatest()` con `NULL` annulla tutta la concatenazione). Vedi però M2.

---

## 7. 🔵 DOMANDA 7 — Il resoconto dice il vero?

**Nella sostanza sì: ogni affermazione tecnica che ho potuto riprovare si è riprodotta.** Ma
l'aritmetica di R-P4 non torna con i suoi stessi output, e una riga di §6 contraddice la §8C dello
stesso documento. Vedi i rilievi I3 e M1.

🛑 **Un limite che dichiaro invece di nasconderlo:** le **due sonde ROSSE** di §2 **non sono più
riproducibili** — l'oggetto vivo è già corretto, e non ho rifatto la funzione vecchia per riprovarle.
Le ho verificate **per via indiretta, due volte**:
1. il corpo del Task B (`git show`) **non contiene la guardia**: la porta era dimostrabilmente aperta;
2. la gemella `riemetti_ddc_atomica`, che ha la **costruzione identica**, riproduce **oggi** lo stesso
   rosso (§5: `totali=2 | vive=0` su lavoro `consegnato`).

---

## 8. 🔵 DOMANDA 8 — FASE 6b e FASE 7

**Verificate da me, non prese per buone.**

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > types-rigen.ts
GEN_EXIT=0
$ diff types-rigen.ts src/types/database.types.ts
DIFF_RIGHE=0            ← rigenerato BYTE-IDENTICO al file committato (6686 righe entrambi)

$ npx tsc --noEmit
TSC_EXIT=0   righe_output=0
```

✅ **Il diff vuoto è coerente e la spiegazione dell'esecutore regge**, e ora ha una prova in più: la
firma esposta ai tipi è
```
correggi_e_riemetti_atomica: { Args: { p_atteso_updated_at, p_correzioni, p_evento_id,
                                       p_laboratorio_id, p_lavoro_id, p_nuova }, Returns: Json }
```
— sei argomenti, `Returns: Json`. **È cambiato il corpo, che i tipi non descrivono.** Un diff vuoto qui
non è un passo saltato: è il risultato atteso, e lo si può dimostrare invece di dichiararlo.

📌 **Corroborazione indipendente:** `git diff --stat 90c6bf88..aabfd385` elenca **4 file** e
`src/types/database.types.ts` **non è fra questi** — coerente con «rigenerato identico», e coerente con
l'albero pulito.

✅ **`npm run verify:full` rieseguito da me** — esito in coda a questo documento (§12).

**BP-1:** `node scripts/guardia-coerenza-documenti.mjs` → **verde**, 5 documenti vivi, conteggi giusti,
nessun riferimento pendente. `memory/MEMORY.md` porta la **voce 193**, `docs/roadmap/ROADMAP-UFFICIALE.md`
l'**aggiornamento 99** e la voce 23 aggiornata. ✅ **Entrambi nominano i due buchi aperti**
(`riemetti_ddc_atomica` e `anno_ddc`): la correzione a sé stesso di §9 del resoconto è genuina, non
dichiarata e basta.

---

## 9. I RILIEVI

### 🔴 CRITICO — nessuno

### 🟠 IMPORTANTE

#### I1 — Il buco residuo sulla coppia è SIMMETRICO, e la correzione proposta ne chiude metà
`.superpowers/sdd/atto-unico-task-c-bis-report.md:421-423` (§8D) e
`supabase/migrations/20260808103515_atto_unico_p_nuova_irrigidita.sql:296-303`

> «*La chiusura è di una riga: **pretendere `anno_ddc` ogni volta che `p_nuova` porta
> `progressivo_ddc`**.*»

**Prova (sonda R7, mia, non nel resoconto):**
```
p_nuova = {'anno_ddc': 2099}   [vecchia: 2098 / 998001]
esito={"esito":"ok", …, "numero":"DDC-2099-998001", …}
DDC-2099-998001 | 2099 | 998001 | generata     ← progressivo EREDITATO, mai prenotato per il 2099
```
La regola proposta lascia passare questa chiamata. **La regola giusta è `XOR`**: se `p_nuova` porta
**una sola** delle due chiavi, si rifiuta. Che sia sicuro imporlo lo dimostra R8: mandarne **zero**
già fallisce rumorosamente (`23505` sull'indice unico), e l'unico chiamante legittimo
(`costruisciDichiarazione`, `generate-ddc.ts:234-236`) **le manda sempre tutte e due**.

##### 🔑 E c'è un motivo STRUTTURALE per cui nessuna sonda verde l'ha preso — l'ho misurato

La fixture del Task B ha la vecchia a `anno_ddc = 2099`, e la non-regressione manda **solo**
`progressivo_ddc`. L'anno ereditato **coincide per caso** con quello atteso, quindi
`a15_numero_derivato_letterale` è verde senza aver mai guardato l'anno.
`provato:` **la stessa identica sonda R5, con la sola vecchia spostata al 2098** (R5b):

```
esito={"esito":"ok", …, "numero":"DDC-2098-999002", "numero_superato":"SONDA-2098-0001", …}
a01…a14 = true   a15_numero_derivato_letterale=FALSE   a16=true   a17=true
```
🔴 **`a15` diventa rossa.** `a15`/`a16` discriminano la metà **progressivo** della coppia e **non
toccano mai** la metà **anno**. Ecco perché il buco è sopravvissuto a tutte e sette le sonde
dell'esecutore e alle mie: **nessuna faceva variare l'anno nel giro buono**. È anche la ragione per cui
R7 doveva essere una sonda a sé e non un'asserzione in più dentro R5.

#### I2 — `riemetti_ddc_atomica` porta entrambi i buchi, e la sua porta di `stato` è in uso quotidiano
`src/lib/pdf/generate-ddc.ts:463` · `:355` · `:323` · `:234` ·
`src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts:144`

Prova incollata in §5. Il resoconto lo riferisce correttamente (§8A) e non l'ha corretto: **R-E2
rispettata**. Il rilievo non è sull'esecutore — è sul fatto che **da oggi le due funzioni sembrano
gemelle e non lo sono**, e che il chiamante vivo **attraversa** la porta di `stato` a ogni riemissione.
Va in roadmap come voce con un numero, non come paragrafo in un resoconto: un resoconto scade con la
sessione.

#### I3 — Il brief e il piano dicono il falso su P16, e il resoconto lo marca «giusto»
brief §C0 · `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md` (tabella P16) ·
`.superpowers/sdd/atto-unico-task-c-bis-report.md:307-311`

Il brief: «*`costruisciDichiarazione` **non mette** `stato` fra le chiavi (P16)*». Il piano: «*No: …
`stato` non è fra le chiavi*».
**Falso.** `provato:` `src/lib/pdf/generate-ddc.ts:323` → `stato: 'generata' as const` dentro l'oggetto
`ddc`, e `:355` → `const riga = { ...ddc, … }`.

L'esecutore **se n'è accorto** — l'intestazione della migration scrive il contrario del brief
(«*`costruisciDichiarazione` mette `stato` fra le chiavi*») e la §8C ne trae la conseguenza giusta.
🛑 **Ma la §6 elenca «P16 e P17» fra «ciò che nel brief ho verificato ed è giusto»**: lo stesso
documento afferma e nega. Chi legge solo la §6 esce col fatto sbagliato — ed è **esattamente** il modo
in cui il resoconto del Task B aveva già fatto uscire il fatto sbagliato su `numero_ddc`, che è la
ragione per cui questo compito esiste.

📌 **La conseguenza non è cosmetica:** se `stato` **non** fosse fra le chiavi, C0 sarebbe difensivo
puro. Siccome **c'è**, la porta di `stato` sulla gemella è percorsa oggi — cioè I2 pesa più di quanto
il piano lasci credere.

### 🔵 MINORE

#### M1 — Il conteggio R-P4 «7 su 35» non si ricostruisce dagli output del resoconto
`.superpowers/sdd/atto-unico-task-c-bis-report.md:258-268`

Sommando le asserzioni **incollate**: ① 2 · ② 2 · ③ **17** (`a01`-`a17`) · ④ 1 · ⑤ **4** (`b01`-`b04`) ·
⑥ **6** (2 rosse + 4 verdi) = **32**, non 35. La tabella dichiara 18 · 5 · 7 per le stesse tre sonde:
**+1 ciascuna**, sistematico (verosimilmente la riga `esito` contata come asserzione).
🛑 E c'è una **contraddizione interna esplicita**: l'intestazione di §5③ (riga 178) dice «**17
asserzioni su 17**», la tabella R-P4 dice **18** per la stessa sonda; e «*le altre **16** sono
non-regressione*» dovrebbe essere **15** (17 − a15 − a16).
Non cambia la sostanza — la misura di forza resta onesta e bassa, che è il suo scopo — ma **R-P4 è la
misura di quanto una prova prova**: un ±1 lì è il posto peggiore dove averlo.

#### M2 — Il messaggio di `progressivo_ddc: null` nomina una colonna che il chiamante non ha toccato
Prova in §6: l'errore è `23502 … column "numero_ddc"`, mentre la chiave sbagliata era
`progressivo_ddc`. Fail-closed e rumoroso, quindi **non** un difetto di correttezza — ma chi lo legge
cerca il guasto nel posto sbagliato. Se il Task C-ter tocca comunque questa zona (v. raccomandazione),
è il momento in cui costa zero aggiungere una `RAISE` esplicita.

#### M3 — «6 sonde verdi» in tabella, sette in §5, «sette sonde SQL» in MEMORY
`report:9` vs `report:164-256` vs `MEMORY.md` voce 193. La ⑦ è arancione (ha trovato un buco), quindi
«6 verdi» è difendibile; ma tre conteggi diversi nello stesso salvataggio si contano a mano una volta.

### ✅ Ciò che ho verificato ed è GIUSTO nel resoconto
Il rosso di C0 e C1 (per via indiretta, §7) · la necessità di **rifiutare E forzare** (sonda ⑥
riprodotta) · la trappola di `lpad` con i suoi numeri esatti · l'equivalenza della derivazione ·
la sonda ⑦ parola per parola · l'assenza di chiamanti di `correggi_e_riemetti_atomica`
(`grep` → solo `database.types.ts:6320`) · ACL, `prosecdef`, `search_path`, ledger · il diff vuoto dei
tipi · `tsc` a zero · l'intatto del corpo · BP-1 fatto e non delegato.

---

## 10. 🛑 CHE COSA HO VERIFICATO IO E CHE COSA HO PRESO PER BUONO

### Verificato da me, con la prova incollata sopra
| # | cosa | come |
|---|---|---|
| 1 | corpo vivo == corpo del file di migration | `diff` catalogo ↔ file → **vuoto** |
| 2 | il resto del corpo è intatto | `diff` Task B ↔ catalogo: 4 blocchi, **zero righe tolte** |
| 3 | firma, `SECURITY DEFINER`, `search_path` | `pg_get_functiondef` |
| 4 | ACL senza `PUBLIC`/`anon`/`authenticated`, `prosecdef=true` | `proacl` · `prosecdef` |
| 5 | migration nel ledger, sopra il pavimento | `supabase_migrations.schema_migrations` |
| 6 | C0 rifiuta (R1) | `P0001`, transazione annullata, una invocazione |
| 7 | C1 rifiuta (R2) | `P0001`, idem |
| 8 | `stato` forzato **e** campi di firma azzerati, col rosso dell'assunzione (R3) | banco con vecchia `firmata` |
| 9 | derivazione equivalente su **18** valori (R4) | espressione **estratta dal catalogo**, non ridigitata |
| 10 | troncamento di `lpad` ingenuo | `lpad('10000',4,'0')` → `1000` |
| 11 | non-regressione 17/17, gettone vero arretrato (R5) | fixture Task B verbatim |
| 11b | 🆕 la stessa sonda su vecchia del 2098 → `a15` **rossa** (R5b) | dimostra il punto cieco sull'anno |
| 12 | `42501` con `SET LOCAL ROLE anon`, argomenti costanti (R6) | — |
| 13 | 🆕 `anno_ddc` da solo → numero incoerente, `ok` (R7) | **non nel resoconto** |
| 14 | sonda ⑦ dell'esecutore riprodotta (R7b) | `DDC-2098-999005` |
| 15 | 🆕 né anno né progressivo → `23505` rumoroso (R8) | **non nel resoconto** |
| 16 | 🆕 `progressivo_ddc: null` → `23502` rumoroso (R9) | forma che il resoconto dichiarava scoperta |
| 17 | 🆕 la gemella porta ancora **entrambi** i buchi (R10) | `totali=2 | vive=0` su `consegnato` |
| 18 | `riga` porta `stato` e `numero_ddc` | `generate-ddc.ts:323` · `:234` · `:355` |
| 19 | chiamanti: zero per la corretta, vivo per la gemella | `grep` + `route.ts:144` |
| 20 | tipi rigenerati **byte-identici**, `tsc` 0/0 | `gen types` + `diff` + `tsc` |
| 21 | BP-1 fatto, guardia di coerenza verde | `guardia-coerenza-documenti.mjs` |
| 22 | `npm run verify:full` | rieseguito da me — §12 |

### 🛑 Preso per buono, NON verificato
| cosa | perché, e quanto pesa |
|---|---|
| **Le due sonde ROSSE di §2, come esecuzioni** | L'oggetto vivo è già corretto: **non sono più riproducibili** e non ho ricreato la funzione vecchia. Verificate **per via indiretta due volte** (§7). ⚠️ È il buco più grande di questa revisione, e lo dichiaro. |
| Gli **UUID e i timestamp** incollati in §2 e §5 | Ho riprodotto i **comportamenti**, non quelle esecuzioni. Nessun peso. |
| Che l'esecutore abbia **eseguito** `npx supabase db push --linked --yes` e `gen types` | Ho verificato l'**esito** (ledger + file identico), non l'atto. Peso nullo: l'esito è ciò che conta. |
| I conteggi interni delle sonde ⑤ e ⑥ oltre a ciò che è incollato | Non ricostruibili — è il rilievo M1. |
| Che `verify:full` desse **5492 \| 68 su 451** al momento del suo salvataggio | Ho rieseguito **ora** (§12): il numero misurato è quello del mio giro, non del suo. |
| Il testo del `COMMENT` (2110 caratteri) letto per intero | Ho verificato **lunghezza** e presenza dal catalogo, e letto il testo dal file (identico al catalogo). |

---

## 11. 🎯 RACCOMANDAZIONE SUI PUNTI 4 E 5

### Punto 4 — `anno_ddc` → **CHIUDERE ORA, in una terza migration, PRIMA del Task C**

**Con la regola `XOR`, non con quella del resoconto.**

**Le tre ragioni, in ordine di forza:**
1. 🔑 **La finestra è aperta adesso e si chiude col Task C.** `correggi_e_riemetti_atomica` **non ha
   chiamanti** (verificato: solo `database.types.ts:6320`). Irrigidire un contratto senza consumatori
   costa una `RAISE`; irrigidirlo dopo che il Task C ha scritto la rotta significa modificare un
   contratto **e** il suo chiamante — cioè il doppio del lavoro e una revisione in più. **Questa
   ondata ha già pagato una volta** per aver spezzato il Task C in due proprio per non far scrivere a
   uno stesso esecutore il contratto e il suo consumatore.
2. **La correzione proposta è misuratamente insufficiente** (I1): chiuderebbe una direzione su due, e
   il rovescio resterebbe **muto** — nessun vincolo lo vede, esattamente come C1.
3. **Il Task C nascerebbe su un contratto che cambia sotto**: la sua allowlist e le sue prove
   andrebbero riscritte. Un contratto che si muove sotto un chiamante appena scritto è il difetto che
   questo piano nomina da solo come rischio numero uno.

**Che cosa scrivere, e nient'altro:** una migration nuova (pavimento `20260808103515`), `DROP` →
`CREATE` → `REVOKE` → `GRANT` → `COMMENT` come l'idioma di casa, con **una** guardia in più accanto a
`c_nuova_vietate`:

> se `(p_nuova ? 'anno_ddc') IS DISTINCT FROM (p_nuova ? 'progressivo_ddc')` → `RAISE`.

🛑 **Le sonde dovute, e la lista è precisa perché una di esse rovescia una mia stessa prova:**

| sonda | ingresso | atteso |
|---|---|---|
| a | `{'progressivo_ddc': N}` da solo | **`P0001`** |
| b | `{'anno_ddc': A}` da solo | **`P0001`** — è il verso che oggi passa (R7) |
| c | `{'anno_ddc': A, 'progressivo_ddc': N}` | **`ok`**, numero `DDC-A-N` |
| d | nessuna delle due | **`23505`** invariato (R8) |

🛑 **E QUI CORREGGO ME STESSO, perché la riga sbagliata sarebbe costata a chi esegue.** Avevo scritto
«*la coppia completa deve continuare a passare (**R5**)*». **Falso: R5 non manda `anno_ddc`** — manda
solo `progressivo_ddc` (come il giro buono del Task B, che mandava `numero_ddc`+`progressivo_ddc` e
neppure lui l'anno). Sotto la regola `XOR` **R5 così com'è ALZA**, e un esecutore che la lanciasse per
conferma leggerebbe un `P0001` senza sapere se ha rotto il contratto o se io ho citato male una sonda.
➡️ **R5 va aggiornata aggiungendo `'anno_ddc', 2099` a `p_nuova`**, e diventa la sonda **c**. Non è una
regressione della regola: l'unico chiamante legittimo manda tutte e due (`generate-ddc.ts:234-236`).

E **nient'altro si tocca**: non è l'occasione per chiudere la famiglia di §8B né C2.

### Punto 5 — `riemetti_ddc_atomica` → **CODA, ma come voce di roadmap con un numero**

**Non ora**, e la ragione è di rischio, non di comodo:

- Chiuderla **rompe il suo chiamante lo stesso giorno**: `riemettiDdC` passa `riga`, che porta
  `numero_ddc` (`generate-ddc.ts:234`) e `stato` (`:323`) — verificato. Diventerebbero due `P0001` su
  una rotta **pubblicata**. È un compito **con una rotta attaccata**, non una riga in più.
- Il Task C tocca la stessa famiglia di rotte
  (`src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts` si **estende**): è lì che il lavoro si
  paga una volta sola.

🛑 **Ma la coda è accettabile solo se la voce esiste dove il prossimo esecutore guarda.** Oggi
l'avvertimento vive nel `COMMENT` della funzione, nel resoconto §8A, in `MEMORY.md` 193 e
nell'aggiornamento 99 della roadmap — **buono, e più di quanto il mandato chiedesse**. Manca il passo
finale: **una voce numerata nella tabella della roadmap**, con la frase che conta scritta per intero —
«*le due funzioni sembrano gemelle e non lo sono; la gemella accetta `stato` e `numero_ddc` dal
chiamante, e il chiamante vivo gliene manda due su due*». Un «riferito» in un resoconto scade con la
sessione; una riga in roadmap no.

**Ordine consigliato:** `Task C-ter` (la riga `XOR`, con le quattro sonde a-d) → **Task C** (la rotta,
scritta su un contratto ormai fermo) → la gemella, nella stessa ondata della rotta o subito dopo.

### 📌 Una nota di consegna, per non lasciarla al silenzio

**Questo giudizio NON è stato salvato in git da me.** Il precedente della stessa ondata lo salva
(`4b4ce340 docs(atto-unico): il giudizio della revisione indipendente del Task B`), ma il mio mandato
chiedeva un giudizio scritto, non un salvataggio, e un revisore che tocca la storia del ramo che sta
giudicando è una cosa a sé. ➡️ **Il file è sul disco, non tracciato**: lo salva l'orchestratore, con
`git add .superpowers/sdd/atto-unico-task-c-bis-review.md` (D318: percorsi nominati, mai `git add -A`).

📌 Le mie sonde vivono in `scripts/tmp/rev/` — **ignorata da git**, quindi non sopravvive alla
sessione. La ricetta per rifarle è in §13.

---

## 12. FASE 7 — `verify:full` rieseguito dal revisore

🛑 **Non l'ho preso dal resoconto: l'ho rifatto.** `provato:` sul ramo, albero pulito, uscita letta
**da variabile**:

```
$ npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"

 Test Files  445 passed | 6 skipped (451)
      Tests  5492 passed | 68 skipped (5560)
✓ Compiled successfully in 10.8s
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde — ogni route mutante verifica l'origine, o è esclusa con una ragione scritta
✅ reduced-motion: niente si sposta a preferenza accesa, tutto arriva a riposo, la molla resta a preferenza spenta
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto, e la rete di sicurezza è recente
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti: nessuna squadra vuota, nessuna prova orfana
✅ verifica «full» registrata (.claude/state/ultima-verifica)
VERIFY_EXIT=0
```

✅ **Numero per numero identico a quello dichiarato dall'esecutore** — `5492 | 68` su `451`, sette
guardie verdi, uscita 0. **E il numero fermo è spiegato bene:** questo compito non tocca alcun file
TypeScript (l'unico fuori da `supabase/migrations/` è `src/types/database.types.ts`, rigenerato
identico — verificato da me in §8) e la RPC non ha chiamanti, quindi non esiste codice applicativo di
cui scrivere una prova. La rete di sicurezza di questo cambiamento sono le sonde SQL, che in CI non
girano. 🛑 **Le prove automatiche le deve al Task C**, quando la rotta avrà un contratto da rispettare:
è scritto nel resoconto ed è la promessa da riscuotere.

---

## 13. Come riprodurre le mie sonde

Vivono in `scripts/tmp/rev/` (ignorata da git, quindi **non sopravvive alla sessione**): fixture
`00-fixture.sql` presa **verbatim** dal Task B (`atto-unico-task-b-report.md` §3-ter, con
`updated_at` arretrato di un'ora e il `GRANT SELECT ON f, g TO service_role`), più un corpo per sonda.
Ricetta, **una invocazione per sonda**:

```bash
cd "…/ua-app"
set -a && . ./.env.local; set +a
cat scripts/tmp/rev/00-fixture.sql scripts/tmp/rev/r7-anno-solo.sql > /tmp/R7.sql
node scripts/psql.mjs /tmp/R7.sql          # o lo scaricatore grezzo scripts/tmp/rev-dump.mjs
```
🛑 Tutte in **transazione annullata** (`BEGIN` senza `COMMIT`), fixture creata **dentro**, e ogni sonda
sui permessi con `SET LOCAL ROLE` — `scripts/psql.mjs` si collega come `postgres`, cioè come
**proprietario**, e senza quel cambio di ruolo una sonda sui permessi non prova niente.

# Referto T3+T9 — il «Fatto!» a due carte col suo foglio a2

Ramo `ondata-b-sessione-3` · tre commit · 04/08/2026

| | |
|---|---|
| `6aae91a9` | `feat(wizard): il foglio a2 «La prescrizione del dentista» (D222) — tre vie, tipo dedotto dal gesto` |
| `e2e2ced3` | `feat(wizard): il «Fatto!» a due carte (D224) e il rosso che cambia mestiere` |
| `c28162cf` | `test(wizard): lo sgancio del colore attraversa DAVVERO il confine Passo 3 → «Fatto!»` |

---

## 1. Che cosa è stato costruito

### T3 — le due carte + il CTA che cambia mestiere

- **Carta «Il lavoro»** — Dentista · **Prescritto da** (solo se `richiedenteNome` ha del testo dopo
  il `trim`, adiacente sotto Dentista) · Lavoro · Paziente · **Colore** se è una scelta di
  laboratorio (`coloreOrigine === 'lab'`), **senza** pastiglia.
- **Carta «La prescrizione»** — **Elementi** se dei denti sono stati davvero registrati (pastiglia
  `✓ dalla prescrizione`, W20) · **Colore** se trascritto (stessa pastiglia) · **Foglio del
  dentista**, che chiude la carta con lo stato della fonte.
- Le didascalie stanno **fuori** dalle carte (mockup); ogni carta è una `<section
  aria-labelledby>`, cioè una `region` con nome accessibile — chi naviga a voce sente in quale delle
  due si trova, e i test possono dire *in quale carta* cercano «Colore».
- **CTA**: senza foglio allegato → `TastoPrimario` «Allega la prescrizione» (apre il foglio a2), con
  «Fotografa l'impronta» declassato a link quieto; con foglio allegato → il rosso torna «Fotografa
  l'impronta» e il quieto gemello sparisce.
- **D97 chiusa**: il tasto prometteva due cose e il dato ne registrava una. Le **tre copie della
  promessa** sono cambiate insieme — testo del tasto, `aria-label` dell'input (`:259`), `categoria`
  (`'prescrizione'` → `'impronta'`). Commento riscritto sul posto.

### T9 — il foglio a2

`Sheet` v3, testi D222 invariati alla lettera, tre vie con il **tipo di fonte sempre dedotto dal
gesto** (spec §4.2 — le quattro forme non compaiono mai a schermo):

| voce | input | categoria | `fonte_tipo` |
|---|---|---|---|
| Scatta una foto | `capture="environment"`, `accept="image/*"` | `prescrizione` | `foglio` |
| Dalla galleria o un PDF | `accept="image/*,application/pdf"`, **niente** `capture` | `prescrizione` | `modulo` se PDF, altrimenti `foglio` |
| Non ce l'ho ancora qui | — | — | `email` / `piattaforma` |

**Terza voce — risoluzione del controllore** (D222 fissa il nome della voce, non la forma del
seguito; dichiarata in testa al file): passo leggero *dentro lo stesso foglio*, due `ChipScelta`
«Per email» / «Dalla piattaforma» **senza preselezione**, `CampoTesto` facoltativo «Da dove
arriva?», `TastoSecondario` «Conferma» (mai un secondo rosso), più un quieto «Torna indietro».
A casella vuota parte un riferimento di riposo onesto — «Arriva per email» / «Arriva dalla
piattaforma» — perché la rotta pretende comunque un corpo e rifiuta la stringa vuota
(`fonte/route.ts:107-118`).

---

## 2. Gli stati enumerati (e dove ciascuno è provato)

**Il «Fatto!» — sei assi, incrociati nei test:**

| asse | valori |
|---|---|
| fonte | assente · riferimento-solo · immagine allegata |
| colore | trascritto · trascritto-e-scartato · sganciato · sganciato-e-scartato · vuoto · soli spazi |
| elementi | denti riconosciuti · metà riconosciuti · nessuno riconosciuto · casella vuota |
| richiedente | presente · assente · soli spazi |
| carta | 3 righe (minima) · 5 righe (piena) |
| foglio a2 | mai aperto · aperto · aperto→passo promessa→chiuso→riaperto |

**Il foglio a2 — i flussi:** ① foto (upload ok / upload ko / 201 senza id) · ② galleria
(immagine → `foglio`, PDF → `modulo`) · ③ promessa (email / piattaforma / testo pieno / testo
vuoto / soli spazi / nessun canale scelto) · esiti fonte (ok · 422 generico · **409
`fonte_congelata`** · corpo non-JSON · `fetch` che solleva).

**Le tre decisioni non ovvie, e il perché:**

1. **Il colore trascritto RESTA anche se è finito fuori catalogo.** Verificato leggendo il server,
   non dedotto: `componiSnapshot` (`componi-snapshot.ts:41`) compone lo snapshot dal testo grezzo,
   mentre a scartare è `risolviColoreCaso`, che tocca solo `lavori.colore_*`. Sono **due strade
   indipendenti**: si perde il colore del *lavoro*, mai la trascrizione.
2. **Il colore sganciato E scartato invece sparisce.** Lì non è stato salvato **niente** — nessuna
   trascrizione (il gate di `crea-lavoro.ts:343` non scatta con `'lab'`) e nessun colore di caso.
   Mostrarlo sarebbe stata la bugia esatta che questa ondata esiste per uccidere. Il vincolo «il
   valore digitato non sparisce» resta soddisfatto dall'avviso M2, che nomina la perdita **e** il
   rimedio. *(Vedi §5 per la tensione residua, riferita.)*
3. **Gli Elementi passano dalla stessa `mappaElementi` che ha deciso cosa mandare al server**, non
   da una seconda lettura della casella: ciò che non è stato capito lo racconta già l'avviso, e la
   carta non lo afferma.

---

## 3. TDD — la prova col conteggio (R-P4)

**Forme d'input enumerate prima delle asserzioni**, ognuna col suo caso: file immagine · file PDF ·
nessun file scelto · risposta `ok` con `{immagine:{id}}` · risposta `ok` **senza** id · risposta
non-`ok` con `{errore}` · risposta non-`ok` con `{errore, esito}` · corpo che non è JSON ·
`fetch` che solleva · stringa vuota · stringa di soli spazi · prop assente (`undefined`).
*Non coperte, e perché:* `fonte_tipo_non_valido` e `non_trovato` (rami del server che qui non sono
raggiungibili — il dizionario è importato, non ricopiato, e il lavoro è appena nato).

**Il giro:**

| passo | esito |
|---|---|
| ① rosso di partenza | FrameFatto 23 rossi su 47 · foglio a2: **file non collezionabile** (modulo assente) |
| ② abbozzo inerte (struttura senza comportamento) | 69 test raccolti, **35 rossi su 45 nuovi** |
| ③ verde | 69 su 69 |

**Il numero che conta: `35 su 45`.** Trentacinque dei quarantacinque test nuovi **non si accendono**
con la sola struttura — richiedono il comportamento. I dieci che passavano già sull'abbozzo sono
quelli d'anatomia e di testo (i testi D222, i tre nomi, il bersaglio da 56px): giusto che passino,
ed è giusto sapere che valgono meno.

**La prova che discrimina davvero** (contratto `{errore, esito?}`): il test del `409
fonte_congelata`. Se il codice leggesse `.error` — il dialetto dell'**altra** rotta, quella delle
immagini — l'`esito` non arriverebbe mai e il ramo specifico cadrebbe in quello generico **in
silenzio**. Quella asserzione cade; le altre no.

**Verifica finale, output reale:**

```
npx tsc --noEmit                     → 0 errori
npx vitest run tests/unit/FrameFatto tests/unit/AllegaPrescrizioneSheet
  tests/unit/WizardNuovoLavoro tests/unit/ds-v3/componenti/righe
                                     → Test Files 4 passed (4) · Tests 134 passed (134)
npx vitest run (INTERA suite)        → Test Files 403 passed | 3 skipped (406)
                                       Tests 4696 passed | 19 skipped (4715)
   (+ 1 prova di confine aggiunta dopo: 4 file → 135 passed)
npx eslint (i 6 file toccati)        → nessun rilievo
bash scripts/check-ds-compliance.sh  → ✅ DS compliance OK (v2.3 legacy + v3)
node scripts/guardia-reduced-motion.mjs → ✅ verde
```

`npx next build` non eseguito: nessun handler di rotta toccato (il brief lo esenta, e l'esenzione
regge — le due rotte chiamate esistevano già).

---

## 4. File toccati

| file | che cosa |
|---|---|
| `src/components/features/wizard/AllegaPrescrizioneSheet.tsx` | **nuovo** — il foglio a2 |
| `src/components/features/wizard/FrameFatto.tsx` | due carte · CTA che cambia mestiere · D97 chiusa · cappello riscritto |
| `src/components/features/wizard/WizardNuovoLavoro.tsx` | `StatoFatto` porta `elemento`/`colore`/`coloreOrigine` al «Fatto!» |
| `src/components/ds/CardInfo.tsx` | `RigaDato` guadagna `pastiglia` (estensione D224) |
| `tests/unit/AllegaPrescrizioneSheet.test.tsx` | **nuovo** — 22 test |
| `tests/unit/FrameFatto.test.tsx` | 23 test nuovi + i 3 riscritti da D97 |
| `tests/unit/ds-v3/componenti/righe.test.tsx` | 5 test per `pastiglia` |
| `tests/unit/WizardNuovoLavoro.test.tsx` | 1 test di confine: lo sgancio del colore arriva al «Fatto!» (§5) |

---

## 5. Auto-revisione — dove questo lavoro è discutibile

**Deviazioni dichiarate dal mockup (entrambe deliberate):**

1. **I link quieti sono impilati, non affiancati.** La scena 5 li mette in riga a `gap:28px`, e 28 è
   sotto i 44 che il vincolo 0B-3 pretende: copiare il mockup alla lettera lo avrebbe violato. Il
   brief vince sul mockup, l'ordine resta azione-prima-uscita-dopo.
2. **La pastiglia non è `nowrap`, benché il mockup lo sia.** È la lezione D96, misurata su
   `FoglioCategoria`: a text-zoom 200% (§13.3) una pastiglia che non va a capo esce dalla carta.

**Scelte di copy che il brief lasciava aperte** (`es.` = esempio, non testo vincolante):

- La riga fonte col solo riferimento porta **il riferimento come valore** e la pastiglia ambra **«Da
  allegare»** — la stessa parola verbatim del mockup — invece di un'unica pastiglia lunga «Segnata:
  arriva per email — da allegare». Ragione: rispetta la grammatica delle altre righe (valore sopra,
  targhetta sotto), tiene il testo del mockup dov'è, e fa vedere all'odontotecnico **quello che ha
  scritto lui**. Se si preferisce la formula del brief, è una riga sola da cambiare.
- La miniatura verde è il **glifo del documento** del mockup, non l'anteprima vera: una fonte può
  essere un PDF, che anteprima non ha. Dice «c'è»; il documento si apre dalla scheda.
- **Su `fonte_congelata` la frase della congelata vince anche sul percorso della foto**, e con essa
  si perde la metà utile dell'altro messaggio («la foto c'è, non rifotografare»). Precedenza
  deliberata: la congelata è il fatto dominante e dice *perché* il gesto non è servito. È l'unico
  ramo d'errore in cui due cose vere si contendono una riga sola.

**Una via che questa schermata NON offre, e non è una dimenticanza:** dallo stato verde non c'è modo
di **sostituire** un foglio sbagliato — restano solo «Fotografa l'impronta» e «Torna alla home».
È la scena 7 del mockup approvato, quindi si è rispettata; la rotta è un UPSERT e la sostituzione
sarebbe tecnicamente possibile. La via di correzione vive **sulla scheda del lavoro**, dov'è quella
di ogni altro campo (direttiva «ogni campo si corregge, fino alla consegna»).

**Quello che NON è stato fatto, e va detto:**

- **Nessuno scatto, nessun giro a banco.** Il mandato operativo di questo esecutore elencava TDD,
  `vitest`, `tsc`, commit e referto — non il collaudo visivo. I tre viewport (390/768/1280) × i due
  temi restano **da fare**, e sono materia del **gate estetico L2 (FASE 9b)** prima del merge
  dell'ondata.
- `scripts/guardia-navigazione-overlay.mjs` **non lanciata, e la ragione regge**: il foglio a2 non
  naviga da nessuna parte — chiude e riporta lo stato al genitore. La guardia sorveglia
  `router.push` da dentro un overlay, che qui non esiste. (Serve comunque app accesa, credenziali di
  banco e una fixture costruita a mano.)
- **BP-1 (memoria e roadmap) non toccate**: coerente con gli altri task di quest'ondata sul ramo, va
  fatto alla chiusura dell'ondata, non da un esecutore singolo.

**I due confini che `tsc` non sorveglia — e non sono lo stesso rischio.**
`FrameFatto` ha due prop facoltative, e la compilazione non può accorgersi se il punto di chiamata
smette di passarle. Le conseguenze però sono di due specie diverse, e vanno pesate diversamente:

1. 🔴 **`coloreOrigine` — una riga che MENTE.** Toglierla dal punto di chiamata rende
   `mostraColoreTrascritto` vero anche per un colore di laboratorio: la carta «La prescrizione»
   affermerebbe **«✓ dalla prescrizione» su un valore che il dentista non ha mai scritto**. È una
   provenienza falsa sulla superficie su cui si appoggia la Dichiarazione di Conformità.
   **Chiuso con una prova che attraversa il confine vero** (`WizardNuovoLavoro.test.tsx`, «lo
   sgancio del colore arriva fino al "Fatto!"»): guida il wizard fino al Passo 3, scrive il colore,
   sgancia, e controlla che la riga atterri in «Il lavoro» senza pastiglia.
   `provato:` tolto `coloreOrigine={fatto.coloreOrigine}` dal punto di chiamata →
   `npx tsc --noEmit` **muto** · `npx vitest run tests/unit/WizardNuovoLavoro` →
   `Tests 1 failed | 29 passed (30)`, e il rosso è esattamente quella prova. Ripristinato.
2. 🟡 **`richiedenteNome` — una riga che TACE.** Il wizard oggi non la manda affatto (arriva con
   T10): se un domani mandasse `richiedente_nome` al POST senza passarla qui, «Prescritto da»
   resterebbe semplicemente assente. È il prezzo, accettato, di preparare oggi una riga che T10
   accenderà. Il test «assente → riga assente» documenta il comportamento, non lo previene — e va
   bene: una riga che manca si vede, una riga che mente no.

---

## 6. R-E2 — ritrovamenti FUORI dal mandato, riferiti e non corretti

**① Il messaggio M2 e la carta si contraddicono sotto gli occhi dell'utente.**
Con colore **trascritto** e fuori catalogo (`'A3,5'`), la carta «La prescrizione» mostra
correttamente `A3,5 ✓ dalla prescrizione` — la trascrizione **è** stata scritta — mentre l'avviso
dice «Non sono riuscita a salvare **il colore**. Lo aggiungi dalla scheda.». Sono vere entrambe (si
è perso il colore *del lavoro*, non la trascrizione) ma dicono il contrario l'una dell'altra a chi
legge di fretta. Il testo vive in `messaggioAccessoriFalliti`
(`FrameFatto.tsx`, macchinario condiviso e ratificato da M2): correggerlo di nascosto avrebbe
cambiato una frase decisa altrove. **Rimedio suggerito:** distinguere l'accessorio in due — «il
colore del lavoro» quando la trascrizione c'è comunque — oppure riformulare in «Il colore non è nel
catalogo: lo correggi dalla scheda.»

**② `MenuVoce` (§5.34) non sa dire una riga secondaria quieta.**
La sua unica riga sotto il nome (`nota`) è `var(--red)`, perché nel menù ⋯ avvisa di un'azione
distruttiva. Il foglio a2 ha bisogno di tre sottotitoli **muti** (`--muted`), quindi le sue voci
sono disegnate a mano con l'anatomia §5.34 (min-height 56, icona Ø38 raggio 11, chevron `--faint`) e
la ragione scritta in testa al file. **Rimedio suggerito:** un `tono` sulla `nota` (o una prop
`sotto` neutra), da ratificare in spec insieme alla `pastiglia` di `RigaDato` con T7. Finché non
c'è, questa è una duplicazione **dichiarata**, non una svista.

**③ Il commento di `FrameFatto` era stale e nessuna macchina lo sapeva.**
Il cappello del file descriveva ancora «UN SOLO TastoPrimario ("Fotografa impronta e
prescrizione")». Rientrava nel mandato (era la quarta copia della promessa di D97) ed è stato
riscritto — si segnala perché è lo stesso schema del censimento: **le copie di una promessa non
stanno solo dove il piano le nomina.** Qui erano quattro, non tre: testo del tasto, `aria-label`,
`categoria`, **e il cappello del file**.

---

## 7. Fix round — 3 rilievi Important dalla review, 04/08/2026

Tre rilievi «Important» sono arrivati dalla review di T3+T9. Mandato: SOLO questi tre + i loro
test, nient'altro.

**Fix 1 — i due link quieti si sovrapponevano di 14px.**
`FrameFatto.tsx:583-594` (colonna dei due `LinkQuieto` sotto «Fatto!») usava `gap: spazio.sm` (12).
`LinkQuieto` ottiene il suo hit-box di 44px con `padding: '13px 0'` + `margin: '-13px 0'` (uguali e
contrari: si annullano nel layout visivo, ma il margin negativo MANGIA lo spazio del gap). Fra due
hit-box consecutivi la distanza reale è `gap - 13 - 13`: con `spazio.sm` dava **-14px**, cioè i due
bersagli da 44px **si sovrapponevano**, e il secondo elemento nel DOM vince il tap in caso di
click sull'area di sovrapposizione. Cambiato a `spazio.xxl` (44) → **18px d'aria vera**.
Test aggiornato (`FrameFatto.test.tsx`, vincolo 0B-3) per asserire anche `gap: '44px'`, non solo
`flexDirection`/ordine, con un commento sul perché (la geometria dei margini negativi).
`provato:` assertion flippata a `spazio.sm` → rosso reale (`- gap: 44px / + gap: 12px`), poi
ripristinata → verde. La prova discrimina davvero (R-P1).
⚠️ **Non re-screenshottato** a 390/768/1280 light+dark: è un cambio di 6 righe su un token già
approvato (D222/mockup), lo sposta di 32px in più senza toccare la forma. Il giro fotografico resta
materia del gate estetico L2 di fine ondata (FASE 9b), non di questo fix puntuale.

**Fix 2 — «Riprova» su 413/415 era un ciclo chiuso.**
`AllegaPrescrizioneSheet.tsx:208-211` (upload da ①/②) rispondeva alla stessa frase generica per
QUALSIASI non-ok della rotta `/api/lavori/[id]/immagini`. Letta la rotta vera
(`src/app/api/lavori/[id]/immagini/route.ts:12-19,71-83`): `ALLOWED_MIME` accetta SOLO
`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `application/pdf` (415 su
tutto il resto — niente TIFF, niente HEIF puro) e la soglia è **20MB esatti** (413 sopra). I due
input del foglio (`accept="image/*"` per la fotocamera, `accept="image/*,application/pdf"` per la
galleria) ammettono formati più larghi di quelli che la rotta accetta — 413/415 sono quindi
raggiungibili dal picker stesso, e «Riprova» sullo stesso file fallisce identico.
Aggiunta `fraseErroreImmagine(status)`: 413 → «Questo file è più grande di 20MB: scegline uno più
piccolo.»; 415 → «Formato non supportato: usa JPG, PNG, WEBP, GIF, HEIC o PDF.» (elenco completo di
`ALLOWED_MIME`, non solo i tre dell'esempio nel brief). Ogni altro status resta sulla frase
generica invariata. Due test nuovi (upload 413, upload 415), entrambi verificano la frase E che
`onFonte` non parta.
🔴 **R-E2 — stesso pattern, fuori mandato:** `FrameFatto.tsx:299-311` (voce «Fotografa l'impronta»,
STESSA rotta immagini) ha la frase generica identica (`errore('Non sono riuscita a salvare la
foto. Riprova.')` sia su `!res.ok` che sul `catch`), con lo stesso ciclo chiuso su 413/415. Il
mandato diceva esplicitamente «SOLO nel foglio nuovo»: riferito, non toccato.
⚠️ **Non verificato, segnalato per completezza:** il messaggio 413 cita 20MB perché è la soglia che
`route.ts:81` controlla — ma se la piattaforma di hosting (Vercel, Serverless Function) applica un
limite di corpo-richiesta più basso a monte (i piani Vercel storicamente limitano il body delle
Function a 4.5MB), un file fra 4.5MB e 20MB potrebbe ricevere un 413 **prima** che `route.ts` lo
veda, con un corpo di risposta non-JSON — e la frase «più grande di 20MB» sarebbe tecnicamente
imprecisa (il ciclo resterebbe comunque chiuso, ma il numero sbagliato). Nessun `bodySizeLimit` è
configurato in `next.config.ts`/`vercel.json` in questo repo. Non ho verificato il limite reale
della piattaforma in produzione: fuori mandato e fuori dal tempo di questo fix, riferito.

**Fix 3 — la chiave `prescrizione` non partiva coi soli elementi (emendamento T1, adjudicato dal
controllore).**
`crea-lavoro.ts:343` mandava la chiave `prescrizione` SOLO se il colore trascritto era non-vuoto.
Un lavoro con ELEMENTO digitato e SENZA colore non mandava la chiave → il gate del server
(`src/app/api/lavori/route.ts:220-245`, presenza della chiave) non creava alcuna riga in
`lavori_prescrizioni` → `contenuto.elementi` (l'artefatto W20 che la Dichiarazione di Conformità
leggerà) non atterrava mai, anche se i denti stessi erano già nel body (`body.denti`).
Cambiato a un OR: `denti.length > 0 || coloreTrascritto` (dove `coloreTrascritto = coloreOrigine
!== 'lab' && colore.trim() !== ''`, la condizione di prima). Quando la chiave parte SOLO per gli
elementi il corpo è `prescrizione: {}` — verificato leggendo `componiSnapshot`
(`src/lib/prescrizione/componi-snapshot.ts:32-46`): `elementi` si compone filtrando `body.denti`
per `provenienza==='prescritto'`, NON dal contenuto dell'oggetto `prescrizione`, quindi `{}` basta
e il gate M-T3-3 lo accetta (`contenuto` non vuoto se `elementi` non vuoto).
`provato:` letta la migration `lavori_prescrizioni`
(`supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql:8-16`) — `contenuto jsonb NOT
NULL DEFAULT '{}'` (schema-less, nessun CHECK su `colore`) e `numero_prescrizione text` (nullable) —
e la RPC `lavoro_crea_atomico` (`20260804152403_ondata_b_prescrizioni_rpc.sql:120-124`) —
`COALESCE(p_prescrizione->'contenuto', '{}'::jsonb)` e `p_prescrizione->>'numero_prescrizione'`
(NULL naturale se la chiave manca): un `{contenuto:{elementi:[26]}, numero_prescrizione:null}` non
viola nessun vincolo. Nessuna riga inventata, nessun rifiuto in banca dati.
Verificata la coerenza a schermo (nessun codice toccato, solo lettura): `FrameFatto.tsx:361`
(riga «Elementi», condizione `dentiPrescritti.length > 0`) e `:368` (riga «Colore»,
`mostraColoreTrascritto = !coloreSganciato && coloreDigitato !== ''`) sono **due condizioni
indipendenti** — lo stato «elementi sì, colore no» produce già, senza modifiche, la riga Elementi
con pastiglia e NESSUNA riga Colore.
Test: `crea-lavoro-prescrizione.test.ts`, nuovo blocco «emendamento T1» — (7) elemento senza colore
→ `prescrizione: {}` + `denti` nel body, nessun `colore_codice`; (8) elemento + colore sganciato
(`'lab'`) → `prescrizione: {}` (i denti fanno partire la chiave, il colore NO), `colore_codice`
viaggia comunque; (9) niente elemento (zero FDI validi, `'pippo'`) e niente colore → chiave
assente, come prima; (10) elemento + colore trascritto → `prescrizione: { colore }` (non `{}`),
guardia di non-regressione per il caso pieno. I 6 casi preesistenti (assente/prescrizione/lab/
vuoto/solo-spazi/fuori-catalogo) restano invariati e verdi.

**Verifica:** `npx vitest run tests/unit/crea-lavoro* tests/unit/FrameFatto*
tests/unit/AllegaPrescrizioneSheet* tests/unit/WizardNuovoLavoro*` → 167 passed. Suite intera
(`npx vitest run`, oltre il mandato del contratto ma necessaria: il Fix 3 cambia la FORMA di un
body uscente e altri file — `crea-lavoro-denti.test.ts`, `crea-lavoro.test.ts`,
`componi-snapshot.test.ts`, `api-prescrizione-typo.test.ts`, `lavori-post-prescrizione.test.ts` —
importano `creaLavoroDaWizard`/`componiSnapshot` senza rientrare nei quattro glob del contratto) →
**4708 passed | 19 skipped** (406 file, gli skip sono preesistenti, non di questo fix).
`npx tsc --noEmit` → pulito, zero errori.

File toccati (SOLO questi 6, come da mandato): `src/components/features/wizard/FrameFatto.tsx`,
`src/components/features/wizard/AllegaPrescrizioneSheet.tsx`, `src/lib/wizard/crea-lavoro.ts`,
`tests/unit/FrameFatto.test.tsx`, `tests/unit/AllegaPrescrizioneSheet.test.tsx`,
`tests/unit/crea-lavoro-prescrizione.test.ts`.

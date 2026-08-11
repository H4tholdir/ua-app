# REVISIONE — Task D: il foglio, il passo di correzione (D322, variante A)

**Revisore indipendente** (non ho scritto io questo codice) · **Data:** 08/08/2026
**Ramo:** `intervento-post-consegna` · **Base:** `e5544b81` · **Testa:** `80ba8ca9` (tre salvataggi)
**Mandato:** `.superpowers/sdd/atto-unico-task-d-brief.md` · **Resoconto revisionato:** `…-task-d-report.md`

---

## VERDETTO: **APPROVATO CON RILIEVI**

| cosa | esito |
|---|---|
| CRITICI | **0** |
| IMPORTANTI | **4** |
| MINORI | **3** |
| FASE 7 rilanciata da me | **5649 passate · 68 saltate · 448 su 454 file · `VERIFY_EXIT=0`** — identica al resoconto |
| Mutazioni mie | **14** (8 che accendono · 1 caccia alla decorazione · 5 sonde a zero rossi) |
| Decorazione trovata fra le 21 prove nuove | **nessuna** — 20 su 21 muoiono se si toglie la funzione |
| Buchi di copertura NON dichiarati | **3 voci su 6 senza nessuna asserzione sul carico** |
| Perimetro | **rispettato** — nessun contratto fermo toccato |

### Perché «nessun CRITICO», voce per voce — è la parte che verrà messa in dubbio

`provato:` `git diff --stat e5544b81..80ba8ca9` → **quattro file soli**: il resoconto,
`DevoIntervenire.tsx`, `SchedaLavoroV3.tsx` (una riga), `tests/unit/DevoIntervenire.test.tsx`.
`correzioni.ts`, la rotta `…/riemetti`, la RPC, `generate-ddc.ts`, `precheck.ts`,
`PATCH /api/pazienti/[id]`, `PazienteEditSheet` e il percorso di `errore_registrazione` **non
compaiono affatto**. Il rischio numero uno che il piano si attribuiva — un contratto fermo piegato
per far tornare il codice nuovo — **non si è verificato**.

- **Il gettone viaggia intatto.** `DevoIntervenire.tsx:602` manda `atteso_updated_at: voci.updatedAt`,
  la stringa così com'è; nessun `new Date`, nessun `.toISOString()` in tutto il percorso.
  Mutazione mia n° 1: riparsandolo, **1 prova diventa rossa**.
- **Le forme dei carichi sono giuste.** `denti_coinvolti` parte come oggetti `{fdi, ruolo, scala,
  codice, …}` (mutazioni n° 2 e 3, entrambe rosse); `prescrizione_caratteristiche.elementi` parte come
  `number[]` (`componi()`, riga 1386) e la penna lo accetta (`prescrizione-mapper.ts:233-239` tiene
  solo un array di numeri).
- **L'evento si tiene nello stato e si riusa.** `correggiERifai` legge `risposta` prima di depositare
  (riga 585); mutazione n° 4 (evento nuovo a ogni tentativo): **1 prova rossa**.
- **Niente si scrive prima del tocco finale**, e il tasto è spento davvero: `TastoPrimario` rende
  l'attributo `disabled` vero (`TastoPrimario.tsx:82`) e `handleClick` esce subito (`:49`), quindi
  **al passo delle quattro caselle non ci si arriva senza aver corretto**. L'unica chiamata prima del
  tocco è una **lettura** (`GET /api/pazienti`, riga 1342).
- **Un foglio solo**, mai un secondo overlay: `correzione` e `correzioneCampo` sono due fasi dentro lo
  stesso `Sheet`. **Si naviga solo con `useNavigaDaOverlay`** (righe 835 e 840), e la prova finge
  l'hook, non il router — che è l'unico modo di distinguerli in jsdom.
- **Nessuna animazione inline**: `git diff | grep -E "duration|ease|transition"` sulle righe aggiunte
  → **zero righe**.

---

# CRITICI

**Nessuno.**

---

# IMPORTANTI

## I1 — 🔴 «21 prove su 21» è vero, ma il censimento R-P4 è INCOMPLETO e non lo dichiara: TRE voci su SEI partono senza nessuna asserzione sul carico

Il resoconto (§3, §4) enumera le forme d'input e dichiara due caselle «non coperta, perché». **Ne
mancano altre tre, non dichiarate**, e sono proprio i carichi in uscita di tre delle sei voci.

Ho rotto il codice apposta in cinque punti che **avrebbero dovuto** accendere qualcosa. **Tutte e
cinque le volte: 45 prove su 45 verdi.**

| sonda (mutazione mia) | riga | esito |
|---|---|---|
| `paziente_id` manda **il nome mostrato** invece dell'UUID | 1367 | **45/45 verdi** |
| `prescrizione_caratteristiche.elementi` mandato come **`string[]`** invece di `number[]` | 1386 | **45/45 verdi** |
| `prescrizione_caratteristiche` manda **l'oggetto intero fuso** invece delle sole sotto-chiavi cambiate | 1390 | **45/45 verdi** |
| `tipo_dispositivo` manda **l'etichetta** («Protesi fissa») invece dello slug | 1364 | **45/45 verdi** |
| `stato_dispositivo` **ricablato** a `'mai_uscito_dal_lab'` sul percorso nuovo | 587 | **45/45 verdi** |

Comando, per una di esse:

```
$ muta.sh elementi-come-stringhe \
    "sotto.elementi = [...elementi].sort((a, b) => a - b)" \
    "sotto.elementi = [...elementi].sort((a, b) => a - b).map(String)"
───────── MUTAZIONE: elementi-come-stringhe ─────────
      Tests  45 passed (45)
— prove accese —
(nessuna)
```

**Due di queste meritano di essere nominate a parte.**

**(a) `elementi` come stringhe è ESATTAMENTE lo scostamento ① — l'affermazione più forte del
resoconto, e l'unica senza una prova che la regga.** Il §6① e il §7① dedicano circa trecento parole a
spiegare che un campo di testo lì avrebbe preso «**422 a ogni singolo invio**», che è un difetto del
mockup e non una preferenza, e che la prova unitaria sarebbe stata verde perché il rifiuto arriva dal
server. È tutto vero. E poi quel ritrovamento è stato chiuso con l'odontogramma **e con nessuna
asserzione**: rimettendo oggi le stringhe, la schermata torna a prendere 422 a ogni invio e la rete
non se ne accorge. *La cosa dichiarata più a voce alta è quella rimasta senza guardiano.*

**(b) `stato_dispositivo` ricablato non accende niente — ed è il difetto del Task A che rinasce sulla
strada nuova.** Il riquadro in testa al file (righe 24-34 e 487-501) racconta per esteso perché
cablare `mai_uscito_dal_lab` era grave: l'app **afferma al posto della persona** che il manufatto non
è mai uscito, e quel motivo **annulla** la dichiarazione (D293 · Art. 21(2) MDR). Il codice nuovo fa
la cosa giusta (`depositaEvento(statoDisp)`, riga 587). Ma **sul percorso della correzione non esiste
nessuna asserzione sul corpo dell'evento** — solo sul suo *conteggio* — quindi lo stesso difetto si
può riscrivere domani con la rete tutta verde.

**Il conto vero della copertura sui carichi:** `descrizione` ✅ · `richiedente_nome` ✅ ·
`denti_coinvolti` ✅ · `paziente_id` ❌ · `tipo_dispositivo` ❌ · `prescrizione_caratteristiche` ❌.
Due dei tre scoperti (`paziente_id`, `prescrizione_caratteristiche`) sono fra le **tre trappole che il
brief §3 nomina apposta**.

➡️ **Che cosa va corretto: il censimento, non il codice.** Il codice manda le forme giuste. Ma il
prossimo esecutore legge «21 su 21» e conclude che i carichi sono sorvegliati. Servono tre asserzioni
sul corpo (`paziente_id` = UUID · `elementi` = numeri · le sole sotto-chiavi cambiate) e una sul corpo
dell'evento del percorso nuovo, **oppure** quattro righe «non coperta, perché» nella tabella del §3.
Oggi non c'è né l'una né l'altra cosa.

---

## I2 — 🔴 In tema scuro le quattro superfici nuove vanno GIÙ invece che su, e il commento che lo giustifica dice una cosa FALSA

`DevoIntervenire.tsx:1247-1249` (commento nuovo, dentro `RigaVoce`):

> «In tema scuro una superficie premibile NON si dipinge del colore del pannello che la contiene:
> `--bg-deep` risolve a un tono **più chiaro** del `--card` del foglio, e la riga resta visibile.»

**È falso, e i numeri sono in casa.** `provato:` `src/app/ds-v3.css:52` —

```
[data-theme="dark"] [data-ds="v3"] {
  --bg: #171411; --bg-deep: #100E0B; --card: #211D18; --elv: #2B2620;
```

`--bg-deep` in scuro è **`#100E0B`**: più scuro del `--card` (`#211D18`) **e perfino del fondo pagina**
(`#171411`). La riga non «sale»: è **un buco scavato nel pannello**.

E la regola di casa è scritta due righe sopra, `ds-v3.css:50` — «*Dark — elevazione = superficie più
chiara, MAI ombre (spec §3.2)*» — e una terza volta in `Sheet.tsx:499-501`, dove è registrata come
**esito di un gate L2 già fatto il 22/07/2026**: «*in dark le facce dei componenti premibili DENTRO lo
sheet si rimappano su `--elv` + hairline, altrimenti sparirebbero sul pannello che è anch'esso
`--card`*». Il pannello del foglio è `--card` (`Sheet.tsx:508`).

**Il mockup approvato lo fa giusto, e su tutte e quattro le superfici nuove**, con un'istruzione
esplicita per il tema scuro: `.notte .riga{background:var(--elv)}` (riga 52 del mockup) ·
`.notte .fuori{…--elv}` (71) · `.notte .pers{…--elv}` (100) · `.notte .sottoc{…--elv}` (108). Il React
usa `var(--bg-deep)` su tutte e quattro (righe 826, 1250, 1469, 1513).

➡️ **Sono due cose, e vanno separate.**
- **Le tinte** le prenderà il gate estetico L2 del Task D-bis. Ma allora **gli scostamenti dal mockup
  sono SETTE, non sei**, e questo — come il nastro — non figura fra i dichiarati.
- 🛑 **Il commento no, quello il gate non lo vede.** Chi farà il D-bis lo legge e conclude che la cosa
  è stata considerata e va bene. Un commento sbagliato è peggio di un commento assente, perché viene
  *citato*. **Va corretto prima del D-bis, non insieme alle tinte.**

📌 Fuori dal mio mandato (R-E2): `var(--bg-deep)` è usato allo stesso modo anche nelle parti
preesistenti del file (i motivi, riga 768; i riquadri di `proposta`). Lo dico e non lo allargo.

---

## I3 — 🔴 Il 409 chiude il tasto, ma l'unica uscita cancella l'evento: **ogni ritentativo dopo la chiusura del foglio è un evento orfano in più**

La scelta di spegnere il tasto sul 409 è giusta e ben motivata (riga 448-452: la rotta rende e carica
il PDF *prima* della transazione, quindi ogni tocco in più brucia un progressivo). Ma la conseguenza
non è stata seguita fino in fondo:

1. 409 → `setConflitto(messaggio)` → il tasto è spento **e non si riaccende in nessun modo**;
2. dal passo `dettagli` **non c'è nessuna via per tornare all'elenco** (il passo rende le pastiglie e
   il tasto, e basta: nessun `TornaAllElenco`);
3. quindi l'unica uscita è chiudere il foglio → `onChiudi={ricomincia}` → `ricomincia()` azzera
   **`risposta`** insieme a tutto il resto (riga 467-472);
4. riaprendo e ritentando, `correggiERifai` trova `risposta === null` e **deposita un evento nuovo**.

➡️ **La porta d'idempotenza della rotta non salva:** restituisce il successore **dopo un successo**,
non dopo un conflitto. E la prova «il ritentativo RIUSA l'evento» sorveglia **solo** il ritentativo
dentro la stessa sessione del foglio.

🔑 **Perché non è un caso di scuola:** per **F1** — che l'esecutore stesso riferisce — il gettone
diventa stantìo dopo *qualunque* correzione fatta dal foglietto della scheda. Il 409 non è l'eccezione
su questa strada: **è l'esito probabile**. Cioè il percorso più frequente di fallimento è proprio
quello che produce un evento orfano per tentativo — l'esatta cosa che il Passo 6 del brief esiste per
impedire.

➡️ Non è una riga: tenere `risposta` viva attraverso `ricomincia()` è una decisione di progetto (per
quanto tempo? e se cambia il motivo?). **Va decisa, non improvvisata.**

---

## I4 — «Valore e gettone dalla STESSA lettura» è vero per costruzione solo a metà: la firma garantisce **lo stesso oggetto**, non **la stessa lettura**

Il resoconto §1 scrive: «*Con `vociDelDocumento(lavoro)` la firma lo impedisce: si entra con **un**
`lavoro` e si esce con tutto, gettone compreso*». La prima metà regge, la seconda no.

`provato:` `SchedaLavoroV3.tsx:171` — `const [lavoroLocale, setLavoroLocale] = useState(props.lavoro)`
e `:197` `const lavoro = lavoroLocale`. **Ciò che entra in `vociDelDocumento` non è la lettura del
server: è uno specchio locale, rattoppato campo per campo in cinque punti** (`:331`, `:349`, `:362`,
`:384`, `:502`). La firma impedisce a qualcuno di passare sei proprietà sciolte; **non** impedisce a un
`setLavoroLocale` di aggiornare un valore lasciando indietro il gettone — che è esattamente ciò che
`handleSalvato` fa (`:383-384`, `{...prev, ...patch}` senza `updated_at`), cioè **F1**.

**Ho cercato anche la direzione opposta — gettone fresco su valori vecchi, che è quella pericolosa
perché la guardia non potrebbe accendersi — e NON l'ho trovata:** `handleColoreSalvato` è l'unico punto
che scrive `updated_at` (`:508`) e aggiorna insieme la sola voce delle sei che tocca
(`prescrizione.contenuto.colore`, `:509-514`). **Oggi non esiste un percorso fail-open.** Lo scrivo
perché un risultato negativo cercato vale quanto uno positivo.

➡️ **Non conto questo come un difetto in più**: è **F1 visto dal lato del progetto**. Ma la riga del
resoconto va corretta, perché descrive una garanzia strutturale che non c'è: la coerenza è tenuta
dalla **disciplina di ogni punto di rattoppo**, non dalla firma.

---

# MINORI

## M1 — Nel passo «Elementi» il menù dell'odontogramma offre «Mancante» e «Impianto», che lì tolgono il dente invece di marcarlo

`OdontogrammaFDI` riceve `mancanti={[]} impianti={[]}` con setter vuoti (righe 1527-1530). Il
comportamento è **dichiarato** nel commento sopra («*segnare un dente come mancante o impianto qui vuol
dire toglierlo*») e il codice fa proprio quello: `handleMancante` (`OdontogrammaFDI.tsx:774-781`) chiama
`onSelezionati(newSelezionati)` — **reale, toglie il dente da `elementi`** — e poi
`onMancanti([...])` — **no-op**. A schermo il dente torna «normale».

➡️ La voce di menù dice una cosa e ne fa un'altra: chi la preme crede di aver marcato un dente e
l'ha invece cancellato dalla prescrizione. Per il gate del D-bis, insieme all'odontogramma.

## M2 — La pastiglia «Da rifare» è `var(--card)`, il mockup in scuro la vuole `--elv`

Riga 1233 contro `.notte .pastiglia{background:var(--elv)}` del mockup (riga 64). Stessa famiglia di
**I2**, gravità molto minore (in scuro `--card` sopra `--bg-deep` si vede comunque). Per il D-bis.

## M3 — «Nessuna chiamata al server» del Passo 5 è stata letta come «nessuna SCRITTURA»

Il brief scrive «*monta, correggi, smonta → **nessuna chiamata al server***»; il passo del paziente fa
un `GET /api/pazienti` a ogni ricerca (riga 1342) e la prova si intitola «nessuna **scrittura** sul
server». **La lettura dell'esecutore è quella giusta** — una ricerca non tocca niente, e senza non si
può scegliere una persona — ed è dichiarata in un commento (riga 1339-1341). Lo segno solo perché la
divergenza fra il testo del brief e il titolo della prova non è annotata fra gli scostamenti.

---

# LE MIE MUTAZIONI — che cosa ho rotto, e quante prove si sono accese

Metodo: un frammento sostituito alla volta in `DevoIntervenire.tsx` (rifiutando la sostituzione se il
frammento non è unico), `npx vitest run tests/unit/DevoIntervenire.test.tsx`, poi
`git checkout --` del file. **Base: 45 prove verdi su 45.** Albero riportato pulito a ogni giro
(`git status --short` finale: solo il `.diff` non tracciato).

### A · Le otto che si accendono — le cinque più insidiose del mandato sono le prime cinque

| # | mutazione | rossi | prove accese |
|---|---|---|---|
| 1 | `atteso_updated_at: voci.updatedAt` → `new Date(...).toISOString()` | **1** | *il gettone NON si riparsa* |
| 2 | i denti partono come **lista di stringhe** (difetto ③ del Task B) | **1** | *i denti viaggiano come OGGETTI* |
| 3 | i denti partono come `{fdi, ruolo}` **senza colore** | **1** | *i denti viaggiano come OGGETTI* (asserzioni su `scala`/`codice`) |
| 4 | `let evento = risposta` → `null` (evento nuovo a ogni tentativo) | **1** | *il ritentativo RIUSA l'evento* |
| 5 | `disabled={quanteCorrezioni === 0}` → `disabled={false}` | **2** | *tasto spento senza correzioni* · *rimessa al valore di prima* |
| 6 | tolto `if (res.status === 409) setConflitto(messaggio)` | **1** | *il 409 si mostra com'è scritto dalla rotta* |
| 7 | `messaggioDiErrore` butta via il testo del server | **2** | *il 409* · *il 422 col percorso dentro* |
| 8 | tolto il confronto col valore originale (`vivo === testoVivo(originaleTesto)`) | **1** | *rimessa al valore di prima NON è una correzione* |

**Otto su otto accendono, e ognuna accende esattamente ciò che deve.** Il conteggio del resoconto,
sulle mutazioni che ha scelto, **regge alla riprova**.

### B · La caccia alla decorazione — 20 prove nuove su 21 muoiono se si toglie la funzione

La prova che il mandato chiedeva: instradare **tutti** i motivi a `dettagli`, cioè rimettere la regola
vecchia (`setFase(m === 'errore_dato_dichiarazione' ? 'correzione' : 'dettagli')` → `setFase('dettagli')`).
L'esecutore aveva scartato questa mutazione perché «i rossi non sono attribuibili» — ma è proprio lo
strumento giusto per la domanda «*questa prova passerebbe anche con la regola vecchia?*».

```
      Tests  20 failed | 25 passed (45)
=== PROVE DEL BLOCCO TASK D RIMASTE VERDI ===
🛑 gli altri motivi vanno alle quattro caselle come prima
```

**L'aritmetica, perché è lei a reggere la conclusione:** 45 − 21 nuove = **24 vecchie**;
25 passate − 1 nuova sopravvissuta = **24 vecchie passate**; quindi **20 delle 21 nuove sono diventate
rosse**, e nessuna prova vecchia si è rotta. L'unica superstite è il **guardiano di regressione** sul
percorso non toccato, che è verde **per progetto**.

➡️ **Nessuna decorazione nel blocco nuovo.** La famiglia `queryByLabelText` che l'esecutore aveva
corretto da solo non ha sorelle: l'ho cercata e non c'è.

### C · Le cinque sonde a zero rossi

Sono la tabella di **I1**. Cinque mutazioni che avrebbero dovuto accendere qualcosa, **45/45 verdi**
tutte e cinque.

### D · Una mutazione scartata, e lo dico

Un sesto tentativo (`perchePrecluso` → sempre `null`) ha toccato **solo un commento** per un errore
mio nel frammento: non ha provato niente e **non lo conto**. `perchePrecluso` resta **dichiarato non
coperto dall'esecutore** (§3, ultima riga) e **non sondato indipendentemente da me**.

**Totale mutazioni valide: 14.**

---

# FEDELTÀ AL MOCKUP — i sei scostamenti dichiarati, più uno

| # | scostamento dichiarato | verificato? |
|---|---|---|
| ① | «Elementi» è l'odontogramma, non un campo di testo | ✅ **fondato, e la motivazione è esatta.** `domain.ts:450` → `elementi?: number[]`; `prescrizione-mapper.ts:233-239` scarta ciò che non è un array di numeri; `correzioni.ts:284-292` rifiuta lo scartato con «*Delle caratteristiche prescritte non si corregge «elementi»*». Un campo di testo lì avrebbe preso **422 a ogni invio**. ⚠️ Ma non è sorvegliato da nessuna prova — v. **I1** |
| ② | il tasto finale sta sul passo DOPO, sull'elenco c'è «Continua» | ✅ **fondato.** Sotto la variante A un tasto che dice «Correggi e rifai la dichiarazione» e poi apre quattro domande mentirebbe. Il gate del mockup (spento + il perché sotto) è conservato sull'elenco, riga 848-854 |
| ③ | l'elenco dei pazienti mostrerà quasi sempre il solo codice | ✅ coerente con `derivaAlias` (D44). Non verificato sul banco vero — non ho toccato il database |
| ④ | le due vie di fuga sono `LinkQuieto`, grigie invece che blu | ✅ **e la ragione tecnica regge, l'ho misurata:** `LinkQuieto.tsx:43-44` porta `minHeight: 44` e `padding: '13px 0'`. Il bersaglio da 44 px c'è davvero |
| ⑤ | il nastro c'è, ma solo sull'elenco (come nel mockup) | ✅ riga 800, reso solo in `fase === 'correzione'`, con `aria-current="step"` |
| ⑥ | la ricerca del paziente parte da due caratteri | ✅ riga 1337 · 1351 |
| **⑦** | **NON DICHIARATO — le tinte del tema scuro** | ❌ **v. I2.** Quattro superfici nuove su `--bg-deep` dove il mockup scrive `--elv`. È il secondo scostamento taciuto della giornata, dopo il nastro |

**Verifica in più che ho fatto e che il resoconto non chiedeva:** `vociDelDocumento` promette «*il
valore che il documento stampa*». Ho confrontato riga per riga con il generatore vero:
`prescrittoreMostrato` usa **la stessa funzione, con gli stessi due argomenti nello stesso ordine e la
stessa grafia «Cognome Nome»** di `generate-ddc.ts:271-274`; `pazienteMostrato` riproduce
**identico** il ripiego di `generate-ddc.ts:304`. ✅ La promessa è mantenuta. (Il generatore vive in
`src/lib/pdf/generate-ddc.ts`, non in `src/lib/dichiarazione/`.)

---

# FASE 7 — rilanciata da me, sull'albero pulito a `80ba8ca9`

```
$ npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
 Test Files  448 passed | 6 skipped (454)
      Tests  5649 passed | 68 skipped (5717)
   Duration  132.42s
✓ Compiled successfully in 7.1s
✓ Generating static pages using 15 workers (82/82)
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde
✅ reduced-motion: niente si sposta a preferenza accesa
✅ Coerenza verde
✅ 2 progetti dichiarati, 2 con prove
VERIFY_EXIT=0
```

**Base dichiarata 5628 | 68 su 454 → misurata da me 5649 | 68 su 454.** **+21**, esattamente il numero
dichiarato. `tsc`, `eslint --max-warnings 0`, `vitest`, `next build` e le sei guardie: **tutti verdi**.

⚠️ **La guardia DS non vede il difetto I2.** È verde e le tinte del tema scuro sono sbagliate lo
stesso: controlla che non ci siano colori inline, non che l'elevazione vada nel verso giusto.

---

# I TRE RITROVAMENTI GIÀ RIFERITI — confermati, in una riga ciascuno come da mandato

- **F1** ✅ **confermato**: `route.ts:810` restituisce `updated_at`, `ModificaRigaSheet.tsx:213` passa
  al padre il patch della richiesta e `SchedaLavoroV3.tsx:383-384` fonde solo quello — gettone stantìo,
  409 che dà la colpa a «qualcun altro». La ricetta giusta è già in casa a `:508`. **È anche la causa
  che rende I3 frequente invece che raro.**
- **F2** ✅ **confermato**: `correzioni.ts:75-79` mette `tipo_dispositivo` fra i tre testi liberi;
  nessun vocabolario prima del render del PDF.
- **F3** ✅ **confermato** e cosmetico.

**Non riaperti**, come da mandato: I3-del-brief · M1-del-brief · `Esc` con due ascoltatori · la riga 8
della RPC che dice «SETTE NOMI».

---

# 🛑 CHE COSA NON HO VERIFICATO — per intero

1. **FASE 9 (390/768/1280, chiaro e scuro) e il GATE ESTETICO L2**: fuori dal mio mandato, sono il
   Task D-bis. **Non ho aperto nessuna schermata.** Tutti i rilievi visivi qui sopra (I2, M1, M2)
   nascono dal **codice e dal mockup a confronto**, mai da un pixel guardato.
2. 🛑 **`scripts/guardia-navigazione-overlay.mjs`: NON l'ho lanciata nemmeno io.** L'esecutore dichiara
   di non averla lanciata e la ritiene dovuta (due vie di navigazione nuove da dentro un overlay). **Lo
   ripeto qui apposta**: se questa sezione tacesse, i due documenti letti insieme darebbero
   l'impressione che qualcuno l'abbia fatta. **Nessuno l'ha fatta.**
3. **Il banco vero**: nessun accesso al database, nessun lavoro consegnato, nessuna riemissione
   provata dal vivo. Tutto quello che dico sulle risposte della rotta viene dalla **lettura del suo
   codice**, non da una chiamata.
4. **Le viscere della rotta `…/riemetti` oltre ai punti che ho aperto** (il 422 sul gettone alle righe
   242-251, il 422 di `validaCorrezioni` a 258-260, il 409 a 384-396). Lo `switch` degli esiti della
   RPC, la porta d'idempotenza e il caricamento del PDF **non li ho letti riga per riga**: quando parlo
   dell'idempotenza in I3 mi baso sul commento della rotta e sul brief, non su una lettura mia.
5. **`perchePrecluso`** (le tre righe precluse: denti non caricati, prescrizione assente, studio
   assente): dichiarato non coperto dall'esecutore, **non sondato da me**.
6. **La RPC, `correzioni.ts`, `generate-ddc.ts` e `precheck.ts` come contratti**: li ho letti **solo**
   per verificare che il carico che parte da questa schermata sia quello che accettano. Non li ho
   revisionati, e non è il mio mandato.
7. **Le 24 prove preesistenti del file**: non le ho mutate. Le do per buone come le ha lasciate la
   revisione del Task 7.
8. **Il tema chiaro**: non l'ho esaminato. I2 riguarda **solo** il tema scuro — in chiaro `--bg-deep`
   (`#ECE6D9`) sotto `--card` (`#FFFEFA`) è nel verso giusto.

---

# COSA FARÀ FALLIRE IL TASK D-bis — l'elenco, in ordine

1. 🔴 **Le tinte del tema scuro (I2)** — quattro superfici. **Ed è già scritto in un commento del file
   che vanno bene**: chi arriva al gate lo leggerà. Il commento va corretto *prima*, o il gate parte
   con un'informazione falsa in mano.
2. 🔴 **L'odontogramma dentro il foglio** — candidato numero uno anche per l'esecutore: nato per
   `TabClinica`, a pagina intera, con token v2.3; a 390 px dentro un bottom sheet **due volte** (denti
   ed elementi). E porta con sé **M1**.
3. 🟡 **Il passo «Caratteristiche prescritte»** — odontogramma + campo colore + avviso: il più alto di
   tutti.
4. 🟡 **`scripts/guardia-navigazione-overlay.mjs`**, che nessuno dei due ha lanciato.

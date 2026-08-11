# REVISIONE INDIPENDENTE — Task 6 «L'elenco degli effetti impara il bivio»

**Salvataggio in esame:** `e6bf6e69` · **Contratto:** `190018ad` (piano emendato, D312) · **Ramo:** `intervento-post-consegna`
**Revisore:** non ha scritto questo codice. Ogni affermazione qui sotto porta l'output del comando che l'ha prodotta.
**Data della revisione:** 07/08/2026

---

## VERDETTO

| cosa | esito |
|---|---|
| **Critici** | **ZERO** — e non per assenza di controllo: v. §A, dove la domanda è stata posta al codice |
| Importanti | **3** |
| Minori | **4** |
| Note | **5** |
| Il mandato del Task 6 | **assolto** — i tre motivi della spec §0 producono `torna_pronto`, il bivio è giusto in tutte e quattro le combinazioni, la guardia D301/D302 morde davvero sui testi nuovi |
| `vitest` sui due file | `Test Files 2 passed (2)` · `Tests 116 passed (116)` |
| `tsc --noEmit` | `uscita=0`, log vuoto |
| Albero a fine revisione | pulito, `HEAD = e6bf6e69` (prova in §J) |

**In una riga:** il codice del Task 6 è corretto e le sue prove mordono; i tre Importanti sono tutti
**testi che dicono il falso** — un'intestazione di modulo scaduta nello stesso salvataggio che ne ha
uccisa un'altra, un'invariante rimasta cieca proprio dove il Passo 4 aveva aperto gli occhi alla sua
gemella, e una promessa a schermo senza canale di risposta.

---

## A. NESSUN CRITICO — e perché la domanda è stata posta, non saltata

Il candidato Critico c'era, ed era uno solo: **allargare `AzioneAutomatica` da uno a tre valori e dare
`torna_pronto` a `destinatario_errato` è pericoloso se qualcuno smista su «azione non nulla» invece che
sul valore.** In quel caso `destinatario_errato` finirebbe dentro `riapri_lavoro_atomica`, che **annulla
la dichiarazione incondizionatamente** — cioè esattamente il danno che la spec §1 e §2 esistono per
impedire, su una consegna realmente avvenuta.

**Non lo fa.** Il censimento (fatto da me, non ricopiato dal piano):

```
$ grep -rn "'riapri_lavoro'\|\"riapri_lavoro\"\|'torna_pronto'\|\"torna_pronto\"\|'crea_rifacimento'\|\"crea_rifacimento\"" src tests --include="*.ts" --include="*.tsx"
src/app/api/lavori/[id]/eventi-qualita/route.ts:384:    effetto.azione === 'riapri_lavoro'
tests/unit/eventi-qualita-route.test.ts:810:    expect(body.effetto.azione).toBe('riapri_lavoro')
tests/unit/eventi-qualita-route.test.ts:861:    expect(body.effetto.azione).toBe('torna_pronto')
tests/unit/eventi-qualita-route.test.ts:862:    expect(body.effetto.lavoro).toBe('torna_pronto')
```

**Un solo punto di smistamento in produzione, e confronta col letterale:**

```typescript
// src/app/api/lavori/[id]/eventi-qualita/route.ts:383-386
const riapertura =
  effetto.azione === 'riapri_lavoro'
    ? await riapriLavoro(svc, lavoro_id, context.laboratorioId, (evento as { id: string }).id)
    : undefined
```

**E nessun `switch` da nessuna parte:** `grep -rn "switch" src | grep -i "azione\|effetto\|motivo"` →
solo nomi di stile CSS (`switchRowStyle`) e `role="switch"`, zero costrutti `switch` sul dominio.
⚠️ **E niente smistamento su «azione non nulla»** — non da una ricerca a parte, ma **derivato dal
censimento di `.azione`**: `grep -rn "\.azione" src tests` restituisce ogni occorrenza del campo, e
lette una per una **l'unica in `src/` fuori dal modulo è `route.ts:384`**; tutte le altre sono omonimi
(`azione_correttiva` delle fasi, `azione` delle strisce e dell'audit del portale) o asserzioni di prova.

**Gli altri due consumatori del modulo, verificati uno per uno:**
- `src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts:129` legge `effettoDaMotivo(motivo).documento !== 'riemetti'` — **`.documento`, non `.azione`**. Prove verdi (16 su 16, incluse quelle che nominano `destinatario_errato` alle righe 174 e 183).
- `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx` importa `effettoDaMotivo` solo per stampare un testo (`:528`) e legge dalla risposta HTTP solo `effetto.perche` (`:468`) e `riapertura` (`:492-513`). **Non legge mai `azione`.**

⚠️ **L'unico effetto visibile in produzione oggi è un allargamento del payload:** la risposta della rotta
per `destinatario_errato` porta ora `effetto.azione: "torna_pronto"` dove prima portava `null`. Nessun
client se ne accorge, per la ragione detta sopra.

---

> 🔑 **GLI IMPORTANTI ① E ② SONO LA STESSA RADICE, e conviene leggerli insieme.** L'allargamento — il
> terzo motivo della spec §0 e i due esiti risolti del bivio — **è arrivato nel dato e non in ciò che il
> dato lo descrive**: ① è l'istanza dal lato delle *prove* (un'invariante che guarda ancora nove righe su
> tredici), ② dal lato della *prosa* (un'intestazione che conta ancora sette descrittori su nove).
> ➡️ **Si chiudono in una passata sola sul modulo e sul suo file di prove, non con due interventi.**

## B. IMPORTANTE ① — L'invariante gemella della guardia D301/D302 è rimasta cieca sui testi nuovi

**È lo stesso difetto che il Passo 4 è stato scritto per chiudere, lasciato in piedi sei righe più su,
nello stesso `describe`, nello stesso file.**

Il Passo 4 ha allargato l'ingresso della guardia delle parole da 9 a 13 testi, e ha fatto bene. Ma nello
stesso blocco vive **un'altra** invariante sui `perche`, e quella scorre ancora i soli `MOTIVI`:

```typescript
// tests/unit/qualita-effetti.test.ts:121-127
it('ogni riga porta un perché in parole comuni e la decisione che la regge', () => {
  for (const m of MOTIVI) {
    const e = effettoDaMotivo(m)
    expect(e.perche.length, m).toBeGreaterThan(40)
    expect(e.decisione, m).toMatch(/D\d+|spec §/)
  }
})
```

`effettoDaMotivo` = **la sola tabella fissa**. I due `perche` risolti e i due `decisione` risolti
(`${base.decisione} · D304 · D310` e `· D304 · D306`) **non sono esaminati da nessuna prova**.

**Che oggi vadano bene l'ho misurato io, chiamando il codice** (sonda usa-e-getta, poi cancellata):

```
difetto_lavorazione+si_sistema: len(perche)=157 decisione="D290 · D298 · D304 · D310"
difetto_lavorazione+si_rifa:    len(perche)=187 decisione="D290 · D298 · D304 · D306"
difetto_materiale+si_sistema:   len(perche)=157 decisione="D297 · D298 · D304 · D310"
difetto_materiale+si_rifa:      len(perche)=187 decisione="D297 · D298 · D304 · D306"
```

➡️ **Conseguenza vera, non temuta:** domani un `perche` risolto può diventare vuoto, o un `decisione`
può perdere il suo numero, e **niente si accende**. La frase che il Passo 4 usa per giustificarsi —
«*una prova che non guarda la cosa non è una prova che la cosa sia giusta*» — vale qui parola per parola.
**Il rimedio è di due righe:** far scorrere alla prova :121-127 lo stesso elenco a 13 voci già costruito
per la guardia delle parole, invece di ricostruirlo.

---

## C. IMPORTANTE ② — L'intestazione del modulo dice il falso, e lo dice DA QUESTO SALVATAGGIO

`src/lib/qualita/effetti.ts:26-33`, riscritta in `e6bf6e69`:

> «⚠️ DUE RIGHE SU NOVE HANNO UN'AZIONE AUTOMATICA — erano una fino al 07/08, e la seconda è
> `destinatario_errato` (⚖️ D312) … **Le altre sette NON sono abbozzi: sono descrittori. Dichiarano che
> cosa è stato deciso, e l'app non finge di eseguirlo.**»

**Due di quelle sette portano ora un'azione automatica** — dall'altra porta, quella che questo stesso
salvataggio ha costruito. Provato chiamando il codice:

```
difetto_lavorazione + si_sistema  | lavoro=torna_pronto | doc=resta_valido | azione=torna_pronto
difetto_lavorazione + si_rifa     | lavoro=lavoro_nuovo | doc=resta_valido | azione=crea_rifacimento
difetto_materiale   + si_sistema  | lavoro=torna_pronto | doc=resta_valido | azione=torna_pronto
difetto_materiale   + si_rifa     | lavoro=lavoro_nuovo | doc=resta_valido | azione=crea_rifacimento
```

🛑 **E il file si contraddice da solo a sessanta righe di distanza:** il commento sul campo `azione`
(`effetti.ts:84-85`), scritto nello stesso salvataggio, **lo dice giusto** — «*Oggi due righe su nove non
lo sono nella tabella fissa, **più i due esiti risolti del bivio (D304)***». L'intestazione no.

🔑 **Perché lo classifico Importante e non Minore.** È **la stessa famiglia** del difetto che D312 ① è
nata per uccidere: un commento che nega l'esistenza di una cosa costruita. Il salvataggio ha tolto quello
vecchio (`destinatario_errato`, «*la transizione NON ESISTE ancora*») e ne ha lasciato nascere uno nuovo
**nella stessa passata, nello stesso file, in cima**. È il posto che chiunque legge per primo.

**Stessa imprecisione, più lieve, nel titolo di una prova** — `tests/unit/qualita-effetti.test.ts:43`:
«*sono DUE i motivi con un'azione automatica, e **gli altri sette non fanno niente da soli** (D312)*».
Il titolo è vero se lo si legge circoscritto a `effettoDaMotivo`, falso se lo si legge come dice.

---

## D. IMPORTANTE ③ — La promessa a schermo non ha un canale di risposta (perimetro del Task 7)

**Domanda 6 del mandato: il `perche` di `destinatario_errato` è ancora coerente ora che l'azione è
automatica?** `git show e6bf6e69 -- src/lib/qualita/effetti.ts` mostra che **quel testo non è stato
toccato**: sono cambiati solo `azione` e il commento accanto.

Il testo (`effetti.ts:155`), stampato a schermo da `DevoIntervenire.tsx:468`:

> «Il manufatto è giusto: sbagliata è la persona a cui è andato. Si recupera e si riconsegna a chi doveva
> riceverlo. **Il lavoro torna fra quelli pronti**, e la dichiarazione resta valida perché diceva il vero.»

**Sul merito è coerente, e anzi lo è più di prima:** il testo descriveva già un esito automatico mentre
l'azione era `null`; ora l'azione c'è, e la frase e il dato dicono la stessa cosa. ✅ **Ed è coerente anche
con D308** (spec §1.1): «persona sbagliata» è il caso in cui la dichiarazione *nomina la persona giusta*,
quindi nessuno dei cinque campi stampati va corretto e il blocco della PATCH non dà fastidio.

🛑 **Ma il canale a schermo non c'è.** `DevoIntervenire.tsx:492-513` disegna i riquadri d'esito **solo**
per `risposta.riapertura`, che la rotta popola **solo** per `riapri_lavoro` (`route.ts:383-386`, §A).
Per `destinatario_errato`, oggi: la persona legge «il lavoro torna fra quelli pronti», **il lavoro non
torna**, e **nessun riquadro dice niente**. È testualmente ciò che la rotta stessa chiama, sessanta righe
più su, «una PROMESSA CHE NESSUNO MANTIENE» (`route.ts:186-187`).

⚠️ **Non è una regressione di questo salvataggio** — il testo prometteva già prima, con `azione: null`.
È **la finestra dichiarata** che il resoconto dell'esecutore ammette nella sua §6, e chiude al **Task 7**
(`esito_azione`) più **Task 10 Passo 1 ①**. La riporto qui perché la finestra ora ha una data di scadenza
e un posto preciso dove si vede: `DevoIntervenire.tsx:492`.

---

## E. Le risposte alle otto domande, con l'output

### 1 · I tre motivi della spec §0 producono tutti `azione: 'torna_pronto'`? — **SÌ**

Provato **chiamando il codice**, non leggendolo (sonda `vitest` usa-e-getta, poi cancellata):

```
spec§0 r1 destinatario_errato            | lavoro=torna_pronto | doc=resta_valido | azione=torna_pronto | dec=D291 · D312
spec§0 r2 difetto_lavorazione+si_sistema | lavoro=torna_pronto | doc=resta_valido | azione=torna_pronto | dec=D290 · D298 · D304 · D310
spec§0 r3 difetto_materiale+si_sistema   | lavoro=torna_pronto | doc=resta_valido | azione=torna_pronto | dec=D297 · D298 · D304 · D310
```

Tutti e tre: `lavoro='torna_pronto'`, `documento='resta_valido'`, `azione='torna_pronto'`. ✅

### 2 · Il bivio è giusto in tutte e QUATTRO le combinazioni? — **SÌ**, e i casi limite reggono

```
difetto_lavorazione + si_sistema  | lavoro=torna_pronto     | doc=resta_valido    | azione=torna_pronto
difetto_lavorazione + si_rifa     | lavoro=lavoro_nuovo     | doc=resta_valido    | azione=crea_rifacimento
difetto_materiale   + si_sistema  | lavoro=torna_pronto     | doc=resta_valido    | azione=torna_pronto
difetto_materiale   + si_rifa     | lavoro=lavoro_nuovo     | doc=resta_valido    | azione=crea_rifacimento
```

I casi limite, tutti chiamati davvero:

```
difetto_lavorazione + null            | lavoro=scelta_richiesta | doc=segue_la_scelta | azione=null
difetto_materiale   + null            | lavoro=scelta_richiesta | doc=segue_la_scelta | azione=null
errore_prezzo_quantita + si_rifa      | lavoro=resta_consegnato | doc=resta_valido    | azione=null
errore_registrazione   + si_sistema   | lavoro=ripristina_tutto | doc=annulla         | azione=riapri_lavoro
destinatario_errato    + si_rifa      | lavoro=torna_pronto     | doc=resta_valido    | azione=torna_pronto
constructor + si_rifa                 | lavoro=nessuno          | doc=nessuno         | azione=null
__proto__   + si_rifa                 | lavoro=nessuno          | doc=nessuno         | azione=null
toString    + si_sistema              | lavoro=nessuno          | doc=nessuno         | azione=null
difetto_lavorazione + "si_forse"      | lavoro=scelta_richiesta | doc=segue_la_scelta | azione=null
difetto_lavorazione + undefined       | lavoro=scelta_richiesta | doc=segue_la_scelta | azione=null
difetto_lavorazione + ""              | lavoro=scelta_richiesta | doc=segue_la_scelta | azione=null
difetto_materiale + "constructor"     | lavoro=scelta_richiesta | doc=segue_la_scelta | azione=null
typeof constructor.perche = string
richiedeScelta: {"difetto_lavorazione":true,"difetto_materiale":true,"destinatario_errato":false,"constructor":false}
MOTIVI_CON_SCELTA = ["difetto_lavorazione","difetto_materiale"]
```

- **`scelta` a `null`** → riga non risolta, nessuna azione. ✅
- **Scelta su un motivo che non l'ammette** → esattamente la riga del motivo, scelta ignorata. ✅ Anche su
  `errore_registrazione`, che **porta la sua azione e la conserva** (giusto: la scelta non deve poterla spegnere).
- **Chiavi del prototipo** (`constructor`, `__proto__`, `toString`) → riga neutra, `perche` è una stringa,
  mai una funzione risalita da `Object`. ✅ La guardia sta in `effettoDaMotivo` e `effettoDaMotivoEScelta`
  ci passa sempre per primo.
  ⚠️ **Nella riga `richiedeScelta:` qui sopra le chiavi stampate sono QUATTRO e non cinque, e non è un
  errore di copiatura:** ho sondato anche `__proto__`, ma in un letterale di oggetto quella chiave
  **imposta il prototipo** invece di creare una proprietà propria, quindi `JSON.stringify` non la mostra.
  Il suo esito si legge nella tabella sopra (`__proto__ + si_rifa → riga neutra, azione=null`).
- **Scelta fuori vocabolario** (`"si_forse"`, `""`, `undefined`, `"constructor"`) → **riga NON risolta,
  mai un ramo indovinato**. ✅ ⚠️ **Nessuna di queste quattro forme ha una prova nella suite** — v. Minore ③.

### 3 · La guardia D301/D302 vede DAVVERO i testi nuovi? — **SÌ. Rotta apposta due volte, e si è accesa due volte.**

🔑 **Ho iniettato nel testo che l'esecutore NON aveva rotto** (lui aveva usato `si_sistema`; io uso
`si_rifa`), così la prova è indipendente e non una ripetizione della sua.

**Iniezione ① — «pezzo» nel testo `si_rifa`:**

```
$ python3 …  # 'e il manufatto nuovo avrà la sua' → 'e il pezzo nuovo avrà la sua'
$ npx vitest run tests/unit/qualita-effetti.test.ts -t "D301/D302"

 × 🛑 D301/D302 — nessun testo dice «pezzo» o «carta»: si dice MANUFATTO e DICHIARAZIONE
AssertionError: difetto_lavorazione + si_rifa — «pezzo» è vietato (D301: si dice «manufatto»):
  expected 'se ne fa uno nuovo. nasce subito un l…' not to match /\bpezzo\b/
+ Received: "se ne fa uno nuovo. … e il pezzo nuovo avrà la sua quando lo consegnerai."
 Test Files  1 failed (1) · Tests  1 failed | 19 skipped (20)
```

**Iniezione ② — «carta» nel testo `si_sistema`** (l'altra parola vietata, l'altro testo):

```
AssertionError: difetto_lavorazione + si_sistema — «carta» è vietata nelle etichette (D302: si dice «dichiarazione»):
  expected 'si sistema questo manufatto. il lavor…' not to match /\bcarta\b/
+ Received: "si sistema questo manufatto. il lavoro torna fra quelli pronti e la carta resta valida: …"
```

🔑 **Il nome nell'errore è un esito RISOLTO in entrambi i casi** (`+ si_rifa`, `+ si_sistema`), non un
motivo della tabella fissa: è la prova che l'ingresso allargato è quello che ha visto la violazione, e
che vede **entrambi** i testi nuovi e **entrambe** le parole vietate.

**Ripristino, provato:**

```
$ git checkout -- src/lib/qualita/effetti.ts && git diff --stat
(nessun output = pulito)
```

Fatto **dopo ciascuna** delle due iniezioni, non una volta alla fine. E a fine revisione:
`diff` byte a byte contro una copia presa prima di tutto → **`RIPRISTINO IDENTICO AL BACKUP`**.

### 4 · Le tre asserzioni del Passo 0 sono state corrette tutte e tre, e dicono ora il vero? — **SÌ, tutte e tre**

Il testo di partenza, ripreso da `git show 190018ad:tests/unit/qualita-effetti.test.ts`:

```
31  it('è l\'UNICO dei nove con un\'azione automatica — gli altri otto non fanno niente da soli', …
33      expect(conAzione).toEqual(['errore_registrazione'])
…
42      // 🛑 E NON è automatica: `riapri_lavoro_atomica` annulla SEMPRE la
43      // dichiarazione (20260806210400:138-140), quindi non può servire questa
44      // riga. La transizione «pronto col documento intatto» NON ESISTE ancora.
45      expect(e.azione).toBeNull()
```

| # | dov'era | com'è ora | vera? |
|---|---|---|---|
| ① | `:33` `toEqual(['errore_registrazione'])`, titolo «è l'UNICO dei nove» | `:43-45` titolo «sono DUE», `toEqual(['destinatario_errato', 'errore_registrazione'])` | ✅ **e l'ORDINE è quello giusto**: `qualita-costanti.ts:20-30` mette `destinatario_errato` **quarto** e `errore_registrazione` **ottavo**, e `filter` conserva l'ordine di `MOTIVI` |
| ② | `:45` `toBeNull()` + tre righe di commento scaduto `:42-44` | `:62` `toBe('torna_pronto')`, commento sostituito | ✅ il commento nuovo dice il vero: `riapri_lavoro` non può servire, perché annulla sempre |
| ③ | `eventi-qualita-route.test.ts:823-838`, ciclo con `destinatario_errato` dentro | `:824-843` ciclo a **sei** motivi + `:845-866` prova dedicata | ✅ |

🛑 **La verifica che il mandato chiede espressamente:** la riga `expect(mockRpc).not.toHaveBeenCalled()`
su `destinatario_errato` **È RIMASTA**, ed è dentro la prova dedicata nuova:

```typescript
// tests/unit/eventi-qualita-route.test.ts:853-866
it('⚖️ D312 «persona sbagliata» porta l\'azione «torna_pronto», ma a questo task nessuna RPC parte', async () => {
  bancoEvento()
  const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo: 'destinatario_errato' })), paramsLavoro())
  expect(res.status).toBe(201)
  const body = await res.json()
  expect(body.effetto.azione).toBe('torna_pronto')
  expect(body.effetto.lavoro).toBe('torna_pronto')
  expect(mockRpc).not.toHaveBeenCalled()      // ← LA RIGA CHE DOVEVA RESTARE
  expect(body.riapertura).toBeUndefined()
})
```

E la riga è **vera**: la rotta smista solo `riapri_lavoro` (§A, `route.ts:384`).

### 5 · Qualcuno legge `azione` o `AzioneAutomatica` altrove e si rompe in silenzio? — **NO**

Censimento fatto da me, non ricopiato. Oltre a §A (letterali + assenza di `switch`):

```
$ grep -rn "effettoDaMotivo\|EFFETTI_PER_MOTIVO\|AzioneAutomatica\|MOTIVI_CON_SCELTA\|richiedeScelta\|effettoDaMotivoEScelta" src tests
src/app/api/lavori/[id]/eventi-qualita/route.ts:21,374
src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts:8,113,129,132     ← legge .documento
src/components/features/lavori/scheda-v3/DevoIntervenire.tsx:71,528       ← legge .perche
(+ il modulo stesso e i suoi due file di prove)
```

**Nessun altro consumatore. Nessun `switch`. Nessun `else` che ingoi i valori nuovi.**
Verificati verdi anche i vicini: `DevoIntervenire` · `riemissione-route` · `qualita-classifica` ·
`qualita-costanti` · `qualita-motivi-ui` · `eventi-qualita-schema` → **143 su 143**; `istante-roma`
(che importa la stessa rotta) → **33 su 33**.

⚠️ **Un omonimo che poteva sviare il censimento, e non l'ha fatto:**
`src/components/features/cassette/PareteClient.tsx:343` contiene `effetto.lavoro`, ma è un `effetto`
tutt'altro (patch delle cassette). **Non è un consumatore.**

✅ **Verificata anche una giuntura che nessuno mi aveva chiesto**, perché D312 poteva romperla:
`route.ts:182-193` vieta la sola natura `errore_registrazione` sotto motivo `altro`, con la ragione
«*le altre due esenzioni restano raggiungibili, perché **nessuna delle due porta un'azione automatica***».
Dopo D312 il **motivo** `destinatario_errato` un'azione ce l'ha — ma sotto motivo `altro` l'effetto
resta `effettoDaMotivo('altro')` = riga neutra, e in `classifica.ts` **un solo testo** promette il
ritorno fra i pronti (`:180`, quello di `errore_registrazione`). **Nessuna fuga.** Verificato, non assunto.

### 6 · Il `perche` di `destinatario_errato` è ancora coerente? — **SÌ nel merito, ma v. Importante ③**

Risposta completa in §D.

### 7 · Le prove misurano davvero? — **SÌ per le due che contano; una terza mutazione non la vede nessuno**

**Mutazione ① — `azione: 'torna_pronto'` → `'riapri_lavoro'` nel ramo `si_sistema`.**
**Perché ho scelto questa:** è **plausibile** (entrambi sono membri veri dell'unione, e il campo accanto
dice già `lavoro: 'torna_pronto'`, quindi l'occhio scivola) ed è **l'errore normativamente peggiore
scrivibile in questo file** — manderebbe un difetto «si sistema» dentro `riapri_lavoro_atomica`, che
annulla la dichiarazione di una consegna realmente avvenuta: il danno che la spec §1-§2 esiste per
impedire.

```
 × difetto_lavorazione + si_sistema → il lavoro torna pronto, la dichiarazione resta valida
AssertionError: expected 'riapri_lavoro' to be 'torna_pronto'
 Tests  1 failed | 115 passed (116)
```
✅ **Vista.** ⚠️ Ma da **una sola** prova — v. Minore ①.

**Mutazione ② — i corpi dei due rami scambiati** (`si_sistema` restituisce il carico di `si_rifa` e
viceversa). **Perché ho scelto questa:** è l'errore di copia-incolla classico, e sopravvive a `tsc`
perché entrambi i rami restituiscono un `Effetto` ben tipato.

```
 × difetto_lavorazione + si_sistema → …
 × difetto_materiale + si_rifa → …
AssertionError: expected 'lavoro_nuovo' to be 'torna_pronto'
AssertionError: expected 'torna_pronto' to be 'lavoro_nuovo'
 Tests  2 failed | 114 passed (116)
```
✅ **Vista da entrambe le prove della diagonale.**

**Mutazione ③ (di controllo) — tolto `!richiedeScelta(motivo)` dalla guardia**, cioè il cancello che
tiene `destinatario_errato` e gli altri fuori dal bivio:

```
 × una scelta su un motivo che non la ammette NON produce nessuna azione
 × una chiave del prototipo non risale a Object e non porta azioni
 × «persona sbagliata» porta ORA la sua azione, e la porta anche senza scelta (D291 · D312)
 Tests  3 failed | 113 passed (116)
```
✅ **Vista da tre prove**, fra cui quella di D312 — il cancello è davvero sorvegliato.

**🛑 Mutazione ④ — quella che NESSUNO vede.** Tolto ` || scelta === null` da `effetti.ts:246`:

```
$ npx vitest run tests/unit/qualita-effetti.test.ts tests/unit/eventi-qualita-route.test.ts
 Test Files  2 passed (2) · Tests  116 passed (116)
```

**Verde al 100%** — e anche la mia sonda a 4 prove resta verde. Il motivo è che la clausola è
**comportamentalmente ridondante**: senza di essa una `scelta` a `null` non entra in nessuno dei due `if`
e cade sul `return base` finale, con **risultato identico**. ➡️ Non è un difetto del codice (la clausola
dichiara l'intenzione e va tenuta), ma **la prova intitolata «senza scelta restituisce la riga NON
risolta» non misura il ritorno anticipato che il suo nome descrive**: misura la stessa caduta finale del
caso «scelta fuori vocabolario». **Il nome promette più di quanto la prova provi.**

Ripristino provato dopo **ciascuna** delle quattro mutazioni (`git diff --stat` vuoto ogni volta).

### 8 · I numeri del resoconto — **RICONTATI, e tornano tutti e due**

**Metodo:** ricostruito l'abbozzo inerte (`effettoDaMotivoEScelta = () => NEUTRO` **e**
`destinatario_errato.azione: null`, cioè lo stato prima del Passo 0 ① e del Passo 3), duplicato il file
di prove con `expect.soft(`, eseguito, poi **cancellato tutto**.

```
$ npx vitest run tests/unit/qualita-effetti-SOFT-temp.test.ts
 Test Files  1 failed (1)
      Tests  7 failed | 13 passed (20)
```

**Siti che si accendono — 13 distinti, identici uno per uno a quelli dichiarati nel resoconto:**
`:45` · `:62` · `:196` `:197` `:198` · `:203` `:204` `:205` · `:210` · `:216` · `:242` `:243` `:244`.

**Il conto, riga per riga — e il numeratore e il denominatore del ciclo D312 sono due cose diverse,
quindi vanno detti separati o il conto non si rifà:**

- **Denominatore (24).** Le sette prove del blocco nuovo portano 3+3+2+2+2+1 = **13** asserzioni scritte,
  **più il ciclo D312**, che è **3 asserzioni × 3 porte = 9 esecuzioni** → 13 + 9 = **22**. Più le **2**
  emendate da D312 fuori dal blocco (`:45` e `:62`) = **24**.
- **Numeratore (17).** Fuori dal ciclo si accendono **10** siti (`:45` `:62` `:196` `:197` `:198` `:203`
  `:204` `:205` `:210` `:216`). Dentro il ciclo: sulla **prima** porta (`effettoDaMotivo`) fallisce solo
  `:244`, perché la riga fissa dell'abbozzo porta ancora `null` mentre `lavoro` e `documento` sono già
  giusti; sulla **seconda** e sulla **terza** (l'abbozzo inerte, che dà la riga neutra) falliscono tutte e
  tre → 1 + 3 + 3 = **7 delle 9** esecuzioni. **10 + 7 = 17.**
- **Controprova:** 24 − 17 = **7** verdi contro l'abbozzo, e la scomposizione torna: prova 3 → 1 ·
  prova 4 → 1 · prova 5 (prototipo) → 2 · prova 6 (testo) → 1 · ciclo D312 → 2. **Totale 7.** ✓

| numero | dichiarato | ricontato | esito |
|---|---|---|---|
| R-P4 numero 1 | **17 su 24** | **17 su 24** | ✅ |
| R-P4 numero 2 (solo ramo nuovo: 3+3+1) | **6 su 7** | **6 su 7** — `:231`, la prova del testo, **non compare** fra i siti accesi | ✅ |
| «sette restano verdi» (24−17) | **7** | **7**, con la stessa scomposizione (1+1+2+1+2) | ✅ |

**E la sua autocorrezione è genuina:** il resoconto dichiara di aver scritto «quattro» in una prima
stesura e di averlo corretto in «sette». Il conto vero è **sette**.

**La scadenza del marchio `provato:` del Passo 0 — CONFERMATA:**

```
$ grep -c "EFFETTI_PER_MOTIVO" docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md
4
$ git show 83a899fd:docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md | grep -c "EFFETTI_PER_MOTIVO"
0
```

Le quattro occorrenze sono le righe **95, 631, 638, 641** — cioè **la voce di censimento e il testo del
Task 6 introdotti da D312 stesso**. ✅ **La lettura dell'esecutore è giusta in entrambe le metà:** il
marchio non è più riverificabile (R-P1), **ma non è un difetto di sostanza** — l'affermazione era vera
contro il piano di ieri sera, e la riscrittura che propone (`git show 83a899fd:…`) riproduce l'output
promesso. **Verificata: dà `0`.**

⚠️ **Verificata anche la coerenza interna del piano su questo punto**, che l'esecutore non aveva
controllato: la riga 95 indica `qualita-effetti.test.ts:33` e `:45`, il Passo 0 ② indica `:31-34` e
`:38-46`. **Non si contraddicono:** `:33` e `:45` sono esattamente le due asserzioni dentro quegli
intervalli, come mostra il file a `190018ad` riprodotto sopra.

---

## F. MINORI

### Minore ① — Delle quattro combinazioni, la suite ne asserisce solo la **diagonale**

`difetto_lavorazione + si_sistema` e `difetto_materiale + si_rifa` hanno le loro asserzioni su
`lavoro`/`documento`/`azione`. **`difetto_materiale + si_sistema` e `difetto_lavorazione + si_rifa` no**
— la guardia D301/D302 allargata li tocca, ma solo sul `perche`.

**Ho verificato che tutte e quattro sono giuste** (§E.2), e oggi la diagonale basta perché il ramo non
guarda il motivo. **Prova che il buco è vero:** la mutazione ① si accende su **una sola** prova. Il giorno
in cui qualcuno rendesse il ramo dipendente dal motivo — per esempio un `perche` diverso fra difetto di
lavorazione e di materiale, che è del tutto plausibile — **metà della matrice non sarebbe sorvegliata**.
Costa due righe: un ciclo su `MOTIVI_CON_SCELTA` invece di due motivi scritti a mano.

### Minore ② — `MOTIVI_CON_SCELTA` è una **tupla letterale**, non `readonly Motivo[]`

L'esecutore lo riferisce come difetto ② del piano, e ha ragione: le «Interfacce» del Task 6 annunciano
`readonly Motivo[]`, il blocco di codice del Passo 3 scrive `as const satisfies readonly Motivo[]`.
**Ha spedito la forma del blocco di codice**, ed è la scelta giusta (più informativa, assegnabile ovunque
serva un `readonly Motivo[]`, `tsc` verde). Verificato sull'output: `MOTIVI_CON_SCELTA =
["difetto_lavorazione","difetto_materiale"]`, tipo `readonly ['difetto_lavorazione','difetto_materiale']`.
**Chi esegue il Task 7 lo deve sapere** — un `.includes(x)` su quella tupla con `x: Motivo` non compila
senza l'ampliamento che il modulo fa già dentro `richiedeScelta`.

### Minore ③ — Le forme d'ingresso censite nel commento non hanno tutte una prova

`effetti.ts:231-238` censisce onestamente le forme (R-P4), **ma quattro di quelle censite non hanno una
prova propria**: `scelta` fuori vocabolario (`"si_forse"`), stringa vuota, `undefined`, e chiave del
prototipo passata come **scelta** anziché come motivo. **Le ho chiamate tutte io** (§E.2) e reggono tutte.
Il Task 7 consuma `richiedeScelta` per decidere il 422: se gli serve un comportamento su ingressi
sporchi, **se lo prova lui** — qui non è misurato.

### Minore ④ — `DevoIntervenire.tsx:105` ricopia il tipo della risposta, e lo allenta

```typescript
effetto: { lavoro: string; documento: string; azione: string | null; perche: string }
```

È una copia strutturale della `Effetto` del modulo, con `azione: string | null` invece di
`AzioneAutomatica | null`. ➡️ **`tsc` non controllerà mai i valori nuovi da quel lato.** Oggi è innocuo
(il componente stampa solo `perche`), ma è la superficie su cui un domani si romperebbe **in silenzio** —
ed è per questo che l'ho cercata, invece di fermarmi agli `import` del modulo.

---

## G. NOTE

**Nota ① — Il campo `effetto.lavoro` risponde a DUE domande, e sul ramo «si rifà» ne esprime una sola.**
⚠️ **Non è una divergenza fra spec e codice, e correggo qui una prima lettura mia che lo faceva sembrare
tale.** La riga 4 della spec §0 ha due colonne distinte — «il lavoro» (*resta consegnato*, cioè **questo**)
e «la dichiarazione» (*resta valida; **il lavoro nuovo** avrà la sua*) — mentre `Effetto` ha **un solo**
campo `lavoro`, e sul ramo «si rifà» il codice ci mette `'lavoro_nuovo'`, cioè la risposta alla domanda
**«che cosa nasce»**, non a **«che cosa succede a questo»**. Il tipo lo dichiara apertamente:
`EffettoLavoro`, letterale `lavoro_nuovo`, «*non è un rientro: serve un lavoro nuovo, con la sua
prescrizione*». È l'idioma già in casa — `modifica_clinica_richiesta` ha esattamente la stessa forma
(`lavoro_nuovo` + `resta_valido`) — il `perche` dice per esteso l'altra metà («*il lavoro di prima resta
consegnato con la sua dichiarazione*»), e la prova che il piano stesso detta asserisce `lavoro_nuovo`.
**Nessuno smista su `effetto.lavoro`** (censito: l'unico `effetto.lavoro` fuori dal modulo è l'omonimo di
`PareteClient.tsx:343`).
🛑 **La conseguenza per il Task 7 resta intera, ed è la parte utile:** non scrivere un ramo tipo
`effetto.lavoro === 'resta_consegnato'` per decidere se toccare `lavori.stato` — sul ramo «si rifà» quel
valore **non compare**, e il caso verrebbe mancato in silenzio.

**Nota ② — Un errore di conteggio preesistente è stato corretto in silenzio.** Il titolo vecchio del ciclo
diceva «GLI ALTRI **OTTO** MOTIVI» su un ciclo di **sette**. Ora dice «SEI» su sei — **vero**. È un
miglioramento, ma il resoconto lo descrive come «passa a sei motivi e cambia titolo» senza dire che il
titolo precedente era già sbagliato.

**Nota ③ — BP-1 rinviata: il rinvio è LEGITTIMO, verificato nel piano.**
```
$ awk '/^## Task 10/,0' …/2026-08-07-torna-a-pronto-documento-intatto.md | grep -n "BP-1"
42:- [ ] **Passo 4 — BP-1:** aggiorna `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md`
```
Il Task 10 Passo 4 esiste davvero e assegna BP-1. Il rinvio è dichiarato, non dimenticato. ✅

**Nota ④ — Il difetto ③ riferito dall'esecutore (guardia scritta prima del codice) è una deviazione
GIUSTA.** Il piano metteva l'allargamento della guardia al Passo 4, dopo i testi che sorveglia; lui l'ha
spostato al Passo 1. Aveva ragione, e la §E.3 lo dimostra: rompendola apposta si accende. Deviazione
dichiarata, non silenziosa. ✅ **Il conteggio `toHaveLength(13)` dentro la guardia è un'aggiunta sua e va
riconosciuta:** senza, uno `MOTIVI_CON_SCELTA` svuotato per sbaglio farebbe restringere l'ingresso in
silenzio e la prova tornerebbe verde perché non guarda più niente.

**Nota ⑤ — `.gitignore:53` (`*-temp.*`) rende INVISIBILE a `git status` un file di prova temporaneo.**
Me ne sono accorto durante questa revisione: il mio file usa-e-getta non compariva né in
`git status --short` né in `-uall`. ➡️ **Chi verifica «albero pulito» dopo un lavoro che ha usato file
temporanei deve cancellarli a mano e guardare con `ls`, non fidarsi di `git status`.** Fatto: §J.

---

## H. Che cosa deve sapere chi esegue il Task 7

1. **Lo smistamento oggi è `effetto.azione === 'riapri_lavoro'`** (`route.ts:383-386`). È un confronto con
   il letterale: **non** cablare i due valori nuovi con un `!== null`, o `destinatario_errato` finirebbe
   in `riapri_lavoro_atomica`, che annulla la dichiarazione **incondizionatamente**
   (`20260806210400:138-140`) su una consegna realmente avvenuta. È il danno della spec §1-§2.
2. **`destinatario_errato` NON passa da `effettoDaMotivoEScelta`.** La sua azione viene dalla riga fissa,
   e `effettoDaMotivoEScelta('destinatario_errato', qualunque_cosa)` restituisce sempre quella riga
   (verificato: anche con `si_rifa`). Smistare su `effetto.azione === 'torna_pronto'` **lo raccoglie**.
3. **`tests/unit/eventi-qualita-route.test.ts:863` asserisce `expect(mockRpc).not.toHaveBeenCalled()`
   proprio su `destinatario_errato`.** È il perimetro del Task 6 e **va CAMBIATA**, non aggirata: al
   Task 7 diventa «chiama `riporta_a_pronto_atomica`». Se resta com'è, il file diventa rosso con l'aria
   di una regressione. È scritto anche nel commento sopra la prova.
4. **L'intestazione del blocco (`:771-784`) va riletta insieme** — lo riferisce l'esecutore, ed è giusto.
5. **`MOTIVI_CON_SCELTA` è una tupla letterale** (Minore ②).
6. **`richiedeScelta` non ha prove proprie sugli ingressi sporchi** (Minore ③): se il 422 del T7 dipende
   dal suo comportamento su un motivo fuori vocabolario, quel comportamento se lo provi lui.
7. **`DevoIntervenire` non ha oggi nessun riquadro per `torna_pronto`** (Importante ③,
   `DevoIntervenire.tsx:492-513`): l'`esito_azione` che il Task 7 produce deve arrivare a schermo, o la
   promessa del testo resta senza risposta. E il tipo locale della risposta (`:105`) va allargato
   insieme, altrimenti `tsc` non aiuta (Minore ④).
8. **Non scrivere rami su `effetto.lavoro === 'resta_consegnato'`** per il caso «si rifà» (Nota ①).

---

## J. Verifiche di stato — a fine revisione

```
$ npx vitest run tests/unit/qualita-effetti.test.ts tests/unit/eventi-qualita-route.test.ts
 Test Files  2 passed (2)
      Tests  116 passed (116)

$ npx tsc --noEmit > /tmp/tsc-rev6.log 2>&1; echo "uscita=$?"; wc -l /tmp/tsc-rev6.log
uscita=0
       0 /tmp/tsc-rev6.log

$ diff …/effetti-BACKUP.ts src/lib/qualita/effetti.ts && echo "RIPRISTINO IDENTICO AL BACKUP"
RIPRISTINO IDENTICO AL BACKUP

$ ls tests/unit | grep -i "ZZ-review\|SOFT-temp"
(nessun residuo)

$ git status --short --untracked-files=all
(vuoto)

$ git log --oneline -1
e6bf6e69 feat(qualita): effettoDaMotivoEScelta — il bivio risolto, mai indovinato (D304), e «persona sbagliata» prende la sua azione (D312)
```

⚠️ **`npm run verify:full` NON è stato lanciato**, come chiesto dall'orchestratore.
🛑 **Nessuna correzione applicata.** Le quattro mutazioni e le due iniezioni sono state tutte ripristinate,
ognuna con la sua prova di ripristino.

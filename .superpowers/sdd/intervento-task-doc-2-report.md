# Referto — «Il documento porta solo ciò che ci deve stare»: i dodici tagli

**Compito:** `intervento-task-doc-2` · **Decisione:** D294 (+ D295 per ciò che resta)
**Ramo:** `intervento-post-consegna` · **Data:** 07/08/2026 (`provato:` `date` → `Fri Aug 7 11:46:20 CEST 2026`)
**Nessun `git push`. Nessun worktree. Nessuna migration. Nessuna colonna toccata.**

---

## 0. In una tabella

| cosa | esito |
|---|---|
| I dodici tagli (15 rimozioni: le righe 2, 4 e 6 ne portano due ciascuna) | **tutti applicati**, verificati su render reale |
| Prove **capovolte** | **14** casi di prova |
| Prove **nuove** | **9** casi di prova |
| Conteggio R-P4 | **24 casi di prova rossi su 89** con i sorgenti riportati allo stato pre-taglio |
| Asserzioni (`expect`) nel file delle prove | da **59** a **112** — **+53 NETTE** (v. §3: è un saldo, non «53 nuove») |
| FASE 7 | `tsc` 0 errori · `vitest` **5347** passate · `next build` compilato |
| Il foglio | da **2 pagine a 1**, da 6.419 a 3.933 byte |
| Ritrovamenti fuori mandato (R-E2) | **5**, riferiti e **non** corretti |
| Decisione presa da solo | **1** — il salto a `ddc-v3` |

---

## 1. I dodici tagli, uno per uno

⚠️ **I numeri di riga del brief sono sfasati di ~14 righe da riga 365 in poi**, perché il commit
`23cdadc4` di stamattina ha inserito il blocco `luogo_fabbricazione`. Qui sotto ci sono i numeri
**veri** al momento del taglio (file `src/components/features/pdf/DdcTemplate.tsx`).

| # | Che cosa | `file:riga` di partenza (reale) | Perché esce |
|---|---|---|---|
| 1 | **Materiali e lotti** (calcolo + riga resa) | `:276-284` e `:451-456` | Vengono dal consumo di magazzino, non dalla prescrizione: non sono la voce ⑥ |
| 2a | **Codice ITCA** in testata | `:308-310` | La voce ① nomina **due** cose, nome e indirizzo. L'obbligo italiano colpisce l'**iscriversi** |
| 2b | **Codice ITCA** nel §1 («Registro ITCA») | `:353-358` | Stessa ragione — era stampato **due volte** |
| 3 | **SRN EUDAMED** | `:359-364` | Il laboratorio non è registrato finché non segnala; e riceverebbe un **Actor ID, non un SRN** |
| 4a | **Luogo di emissione** nel §1 | `:380-383` | È la **città del laboratorio**, non un luogo di fabbricazione |
| 4b | **Luogo di emissione** sotto la firma | `:530-532` | Stessa ragione — anch'esso **due volte** |
| 5 | **Classe di rischio** (sezione §6 intera) | `:476-491` | Fuori dalle otto voci |
| 6a | **Norma di riferimento** | `:485-490` | La voce ⑦ chiede i requisiti **non** rispettati: una norma applicata è il contrario |
| 6b | **Norme armonizzate** (sezione §6-bis intera) | `:493-503` | Stessa ragione |
| 7 | **Rischi residui** (sezione §8 intera) | `:515-521` | Analisi del rischio (ISO 14971), non una deroga a un requisito |
| 8 | **«Sostanze / tessuti»** | `:463-470` | Stampava «No» da un `false` **cablato** che nessuno scrive: affermazione non sostenuta. La voce ⑧ è **condizionale** |
| 9 | **Firma, etichetta PRRC, nome e qualifica** | `:523-547` | Le otto voci non nominano né firma né responsabile. L'unica persona che il punto 1 nomina è il **prescrittore**, che resta |
| 10 | **Logo** | `:312-317` + `:259` (`logoUrl`) | Non è un contenuto — ed era una **lettura viva** che rende instabile una ristampa |
| 11 | **Piè di pagina** (testo + numero, `fixed`) | `:549-557` | Doppioni: base giuridica nel sottotitolo, numero in testa |
| 12 | **Metadati PDF** (title/author/subject/keywords/creator) | `:287-293` | Non visibili sul foglio |

**Orfani rimossi perché il taglio li ha creati** (non «cancellazione a catena»: senza, `eslint
--max-warnings=0` del pre-commit sarebbe rosso): l'import `Image`, l'import di tipo `ClasseRischio`,
la funzione `formatClasseRischio`, e le chiavi di stile `headerRight`, `logo`, `classeRischio`,
`firmaSection`, `firmaLeft`, `firmaRight`, `firmaLabel`, `firmaNome`, `firmaQualifica`,
`firmaImage`, `firmaLinea`, `pageFooter`, `footerText`.
**Restano** `rischiText` (la usa la nota sulla marcatura CE), `dentiText`, `conformitaBox`,
`conformitaText`.

🛑 **Non toccati, come da mandato:** il blocco `luogo_fabbricazione` con il suo commento D295
(`:365-379`) e la riga `prescrizione_caratteristiche` (`:457-462`). Il commento di D295 dice
«coincide con l'indirizzo del fabbricante **due righe sopra**»: dopo l'uscita di ITCA e SRN quella
frase è diventata **più** vera, non meno — quindi non l'ho riscritta.

---

## 2. Il confronto PRIMA / DOPO del foglio, sezione per sezione

Render **locale in sola lettura** — nessuna consegna, nessun insert, nessun upload, nessun
progressivo bruciato — su **laboratorio vero** e **lavoro vero** del banco di prova, con la strada
del compito precedente (`scripts/tmp/d294-foglio-prima-dopo.tsx`, usa e getta, non committato).

🔑 **Fixture MASSIMALE, ed è la cosa che rende il confronto onesto:** la fixture dei test lascia a
`null` `norme_json`, `rischi_residui_snapshot`, `srn_eudamed` e tiene `contiene_sostanze_o_tessuti`
a `false`. Con quella, quattro dei dodici blocchi non si sarebbero renderizzati **nemmeno prima**, e
il confronto avrebbe fatto sembrare il lavoro più piccolo di quello che è. Qui è valorizzato tutto.

| sezione | PRIMA | DOPO |
|---|---|---|
| **Testata** | nome · indirizzo · P.IVA · **Codice ITCA** · **logo** (a destra) | nome · indirizzo · P.IVA |
| **Titolo + base giuridica** | invariato | invariato |
| **Numero del documento** | `N. DDC-…` | invariato |
| **§1 Fabbricante** | ragione sociale · indirizzo · P.IVA · **Registro ITCA** · **SRN EUDAMED** · Luogo di fabbricazione · **Luogo emissione** | ragione sociale · indirizzo · P.IVA · Luogo di fabbricazione |
| **§2 Data di emissione** | invariato | invariato |
| **§3 Prescrittore** | invariato (nome + n. prescrizione) | invariato |
| **§4 Paziente** | invariato (paziente + uso esclusivo) | invariato |
| **§5 Dispositivo** | n. lavoro · tipo · descrizione · denti · **Materiali / Lotti** · Caratteristiche prescritte · **Sostanze / tessuti** · nota CE | n. lavoro · tipo · descrizione · denti · Caratteristiche prescritte · nota CE |
| **§6 Classificazione MDR** | **classe di rischio + norma di riferimento** | 🚫 **sezione eliminata** |
| **§6-bis Norme armonizzate** | **due norme elencate** | 🚫 **sezione eliminata** |
| **§7 → §6 Conformità** | titolo `§7`, testo | **titolo `§6`**, testo invariato |
| **§8 Rischi residui** | **testo dei rischi** | 🚫 **sezione eliminata** |
| **Blocco firma** | data (2ª volta) · **luogo emissione** (2ª volta) · **etichetta PRRC** · riga per firmare · **nome** · **qualifica** | 🚫 **blocco eliminato** |
| **Piè di pagina** (`fixed`, su ogni pagina) | testo di legge + numero | 🚫 **eliminato** |
| **Metadati del file** | `/Title` `/Author` `/Subject` `/Keywords` valorizzati da noi | 🚫 **le quattro chiavi sono ASSENTI dal file.** Restano `/Creator` e `/Producer`, che valgono entrambe `react-pdf`: le scrive la libreria, non noi (`provato:` risolvendo il riferimento indiretto nei byte del PDF reso) |
| **Pagine** | 🔴 **2** | ✅ **1** |
| **Peso** | 6.419 byte | 3.933 byte |

### 🔴 Il difetto di forma che nessuno aveva visto

Il foglio massimale **traboccava su una seconda pagina**, e ci restavano orfani `Serre` e
`Odontotecnico abilitato` — cioè un blocco firma **spezzato a metà** fra due fogli, col piè di
pagina ripetuto sotto entrambi. Una dichiarazione a valore legale che si spacca così è un difetto
che nessuna prova vedeva, perché nessuna guardava il foglio intero. Ora sta in una pagina.
La rete c'è: `expect(pagineMassimale).toBe(1)`, contata con `result.total` di PDFParse e **non**
cercando la marca «-- 2 of 2 --» nel testo (quella è una convenzione di stampa della libreria: legarci
una prova significa misurare lo strumento invece del documento).

### La numerazione, sistemata senza ridisegnare

Tolte due sezioni, il foglio saltava da §5 a §7 — «sembra incompleto» è la cosa peggiore che una
dichiarazione possa sembrare a chi la ispeziona. La conformità è passata da **§7 a §6**. Le sezioni
svuotate sono state tolte **con tutto il `<View>`**, titoletto bordato compreso: togliere le sole
righe avrebbe lasciato due titoli di sezione vuoti. Nessun testo rimasto è stato riscritto, nessuna
spaziatura ritoccata a mano: i margini erano già per sezione e si sono richiusi da soli.

---

## 3. Le prove — capovolte, non cancellate

**14 CAPOVOLTE in senso stretto** — cioè prove che asserivano la **presenza** di un campo tolto e
che oggi ne asseriscono l'**assenza**. Tutte in `tests/unit/ddc-pdf-content.test.ts`:

| prova, com'era | com'è adesso |
|---|---|
| `l'etichetta della firma porta l'accento` | il blocco firma non c'è più: né etichetta PRRC né riga per firmare |
| `§1 stampa codice ITCA` | il codice ITCA non compare, né in testata né nel §1 |
| `§1 stampa SRN EUDAMED quando presente` | non compare **nemmeno** quando il laboratorio ne ha uno |
| `§5 stampa nome materiale con lotto` | il nome del materiale non compare |
| `§5 stampa numero lotto` | il numero di lotto non compare |
| `§6 stampa classe di rischio` | la classe di rischio non compare |
| `§6 Classe IIa: nessun contenuto extra` | la sezione «Classificazione MDR» non esiste più, **nemmeno il titoletto** |
| `§8 stampa nome PRRC` | il nome del responsabile non compare |
| `§8 stampa qualifica PRRC` | la qualifica non compare |
| `§8 stampa luogo di emissione` | il luogo di **emissione** non compare, in nessuno dei due punti |
| `§6-bis stampa norme armonizzate quando presenti` | non compaiono **nemmeno** quando ce ne sono |
| `rende «Sì» quando contiene sostanze` | non stampa nulla **nemmeno sul ramo affermativo** |
| `title e subject portano l'accento (UTF-16BE)` | i quattro metadati **non sono più scritti**, e le **chiavi** `/Title` `/Subject` `/Keywords` non ci sono |
| `il titolo del §7 porta l'accento` | è il **§6**; e `§7`, `§8`, `§6-bis` non compaiono più da nessuna parte |

**+ 4 prove esistenti MODIFICATE in altro modo** (elencate a parte apposta: non sono
capovolgimenti, e sommarle alle 14 è il modo di far tornare un numero dopo averlo scritto):

| prova | che genere di modifica |
|---|---|
| `§1 non stampa SRN quando assente` | **resa vera**: era teatro (asseriva un'assenza su una fixture priva del campo). Ora asserisce che i due codici sono **nel dato** e **non sul foglio** |
| `§6-bis non compare quando norme_json è vuoto` | **resa vera**, stessa ragione: ora guarda il **titoletto** della sezione |
| `§2 … la data compare 2 volte` | **numero cambiato a 1** (la seconda era quella della firma) + commento riscritto |
| `§6 contiene riferimento ad Art. 52(8)` | **rinominata**: il nome affermava una localizzazione falsa (quella stringa vive nel sottotitolo, non nel §6) |
| `template_version è ddc-v2` (`generate-ddc.test.ts`) | → **`ddc-v3`**, v. §4 |

🛑 **Nessuna prova è stata cancellata.** Le due che sarebbero diventate **teatro** — asserivano
un'assenza su una fixture che il campo non ce l'aveva, quindi sarebbero rimaste verdi anche col
difetto in piedi — sono state **rese vere**: si rende con il campo **popolato** e si asserisce
l'assenza. È la differenza fra una prova che passa e una che morde.

⚠️ **Il +53 di asserzioni è un SALDO, non «53 asserzioni nuove»:** è la differenza fra le 112
chiamate `expect(` di oggi e le 59 di ieri, e quindi ha già sottratto le asserzioni positive che
vivevano dentro le prove capovolte e che sono state rimosse insieme a loro. Il numero è corretto;
la sua etichetta è «netto», e va detta.

**9 nuove:**

1. la **norma di riferimento** non compare (nessuna prova la guardava, benché il modello la stampasse)
2. i **rischi residui** non compaiono (il §8 non aveva **nessuna** prova positiva)
3. il **piè di pagina** non compare, e il numero del documento compare **esattamente una volta** (era due)
4. il «**No**» affermato senza dato non compare — il caso **reale**, non quello raro
5. **nessuna immagine** nel PDF con logo **e** firma valorizzati (si guardano i byte: `/Subtype /Image`, `/XObject` — `getText()` è cieco alle immagini)
6-9. il blocco **«il foglio massimale»**: ① porta le voci dell'Allegato XIII che gli spettano · ② porta i quattro appigli tenuti apposta, **partita IVA compresa, con scritto che è una scelta di Francesco e non un obbligo** · ③ non porta **nessuno** dei dodici tagli, su un foglio dove tutti avrebbero da stampare · ④ sta in **una pagina sola**

Il blocco massimale non è il doppione delle prove puntuali: quelle guardano **un** campo su una
fixture che lascia vuoti gli altri, e nessuna vede il foglio come lo vede una persona. È l'unica
rete che si accenderebbe se un tredicesimo campo rientrasse da una strada non sorvegliata.

### Il conteggio R-P4, misurato e **etichettato**

Sorgenti riportati allo stato pre-taglio (copia di sicurezza + `git checkout --`, poi ripristino
dalla copia — **non** `git stash`, per non incappare nella trappola già pagata dal compito
precedente), prove nella loro forma finale:

| | numero | che cosa è |
|---|---|---|
| **24** | **casi di prova** (`it`) che diventano rossi | non «asserzioni» |
| 89 | casi di prova totali nei due file misurati | |
| 112 | chiamate `expect(` nel file delle prove, contro **59** prima | **asserzioni**, +53 |

⚠️ **I due numeri si chiamano col loro nome apposta:** in quest'ondata un referto ha chiamato
«asserzioni» dei casi di prova. Un caso di prova si ferma alla prima asserzione che fallisce,
quindi «24 rossi» vuol dire 24 *casi*, non 24 *asserzioni accese*.

**Ripristino verificato:** i tagli sono tutti al loro posto (11 occorrenze del marchio `D294` nel
modello) e `VERSIONE_TEMPLATE_DDC = 'ddc-v3'`.

---

## 4. La decisione presa da solo: il salto a `ddc-v3`

**Il fatto:** il registro delle versioni accanto alla costante (`generate-ddc.ts`) riserva il salto
al «primo cambiamento di **sostanza** — un contenuto dell'Allegato XIII che entra, **esce** o cambia
significato», e **nomina fra i candidati proprio «il "Sostanze/tessuti: No" affermato senza dato»**,
che è il taglio n. 8. Qui **escono dodici blocchi**.

**Perché l'ho fatto benché il mandato dicesse «non aggiungere niente»:** non lasciarlo non
avrebbe *preservato* il perimetro, l'avrebbe **rotto**. Due documenti profondamente diversi
porterebbero la stessa etichetta `ddc-v2` — cioè si sarebbe **creato** il difetto che quella colonna
esiste per impedire. R-E2 copre i difetti che si **trovano**, non quelli che si **scrivono**.

**Come l'ho fatto, e come no:**
- ✅ **Voce nuova `ddc-v3`** nel registro, con i dodici blocchi elencati e la rinumerazione.
- 🛑 **`ddc-v2` NON è stato riscritto.** Sarebbe stato più «pulito» accorpare — le due modifiche sono
  dello stesso giorno e dello stesso ramo — ma **nessuno può provare che nessun documento porti già
  quell'etichetta**, e riusare un'etichetta emessa cambiandone il significato svuoterebbe l'intero
  registro. È anche il lavoro del compito precedente, che non si riscrive.
- ✅ **`payload_sha256` non cambia per il salto**, verificato invece che presunto: `template_version`
  è aggiunto **nell'insert**, non dentro `ddc`/`ddcConNorma`, quindi `improntaPayload` non lo vede.
  `pdf_sha256` cambia per i **nuovi** documenti perché i byte cambiano — ed è corretto.
- 🛑 **Nessuna riga in archivio è toccata.**

---

## 5. FASE 7 — output reale

```
═══ 1/3 npx tsc --noEmit ═══
ESITO tsc: 0            (nessun errore stampato)

═══ 2/3 npx vitest run ═══
 Test Files  438 passed | 5 skipped (443)
      Tests  5347 passed | 56 skipped (5403)

═══ 3/3 npx next build ═══
✓ Compiled successfully in 3.3s
✓ Generating static pages using 15 workers (82/82) in 168ms
```

Erano **5.338** prove all'arrivo: **+9**, tutte nuove (le 14 capovolte restano nello stesso numero di
casi). `npx eslint src/components/features/pdf/DdcTemplate.tsx --max-warnings=0` → 0.

---

## 6. 🔴 RITROVAMENTI (R-E2) — riferiti, **non** corretti

① **Colonne che oggi nessuno legge più.** Dopo questo taglio, `DdcTemplate` non legge più:
`fabbricante_itca`, `luogo_emissione`, `contiene_sostanze_o_tessuti`, `sostanze_tessuti_dettaglio`,
`classe_rischio`, `norma_riferimento`, `norme_json`, `rischi_residui_snapshot`, `prrc_nome`,
`prrc_qualifica`, `firma_ddc_storage_path`, `firma_ddc_sha256`. **Continuano tutte a essere scritte
a ogni emissione**, e va bene così — la fotografia della dichiarazione è anche un archivio, non solo
la sorgente di una stampa. 🛑 **Non ho cancellato niente**, come da mandato. Ma qualcuno dovrà
decidere, con calma, se `firma_ddc_sha256` (l'impronta d'integrità di una firma che non si stampa
più) e l'intera catena `hashFirmaDdc` abbiano ancora un senso: oggi si scarica un file da Storage e
se ne calcola l'hash **a ogni emissione**, per un'immagine che non finisce su nessun documento.

② **Il tipo `DdcTemplateProps` pretende ancora `classe_rischio`.**
`Pick<DichiarazioneConformita, 'tipo_dispositivo' | 'classe_rischio'>`: il commento di D102 ③ spiega
che quei campi sono obbligatori perché «senza, la dichiarazione non si stampa affatto» — ma
`classe_rischio` **non si stampa più**, quindi la ragione è decaduta. **Non l'ho ristretto**: è un
contratto di tipo dentro un monumento di dodici righe che non è mio, e restringerlo è una
riprogettazione che nessuno ha chiesto. Riferito.

③ **`schema.sql:1197+` cita «MDR §9…§12»** — numerazione inventata (l'Allegato XIII ha **cinque
punti**, e le otto voci sono trattini del punto 1). **Già riferito dal compito precedente e ancora
aperto**; si ripete perché ora è anche **incoerente col foglio**, che dopo la rinumerazione arriva
al §6.

④ **La descrizione di un lavoro del banco contiene il codice ITCA come testo libero**:
`TEST-DdC-001` ha `descrizione = "Corona in ceramica su elemento 21 — TEST DdC ITCA01051686"`,
quindi la stringa `ITCA01051686` **compare ancora sul foglio**, ma dentro la descrizione del
dispositivo — un dato digitato da una persona, non il campo `fabbricante_itca`. Non è un difetto
del taglio (le prove girano su fixture pulite); è un dato di prova sporco che potrebbe far credere
a un collaudatore che il taglio non abbia funzionato.

⑤ **`scripts/tmp/` partecipa ancora al `tsc` del progetto** — ritrovamento ⑥ del compito
precedente, **ancora aperto**. Vale anche per la mia sonda: l'ho scritta pulita apposta, ma il
prossimo che allarga un tipo ci ricasca. `scripts/tmp/` andrebbe escluso dal `tsconfig`.

---

## 7. Cosa NON ha fatto questo giro

- **FASE 9 / FASE 9b (gate estetico L2):** non dovuti. Il PDF non è una superficie dell'app: non ha
  viewport, non ha tema chiaro/scuro, non passa da `docs/design/audit-ui-ux/`. La prova a schermo
  qui è il **render del foglio**, ed è stata fatta e guardata (§2).
- **BP-1** (MEMORY.md + ROADMAP-UFFICIALE.md): fuori dal mandato di questo esecutore.
- **Il verbale di D294**: la ratifica è già scritta; questo referto ne è l'esecuzione.

---

# GIRO DI CORREZIONE — 07/08/2026, pomeriggio

**Verdetto ricevuto:** conformità ✅ (i dodici tagli sono giusti, nessuno degli otto contenuti
obbligatori è uscito) · qualità ❌ per **due Critici**. Mandato chiuso a sei punti; nessuno dei
dodici tagli è stato rimesso, tranne dove il punto 1 lo imponeva.
`provato:` `date` → `Fri Aug  7 12:18 CEST 2026`.

## In una tabella

| cosa | esito |
|---|---|
| 🔴 CRITICO 1 — la voce ⑧ non poteva più comparire | **ramo affermativo ripristinato**, prova capovolta in **4 casi** (2 affermativi, 2 di silenzio) |
| 🔴 CRITICO 2 — la rete sul piè di pagina era legata al testo | **2 prove nuove sulla FORMA**; mutazione misurata |
| 🟠 IMPORTANTE 1 — commento decaduto in `precheck.ts` | riscritto |
| 🟠 IMPORTANTE 2 — la firma scaricata a ogni consegna | `hashFirmaDdc` **tolta**; schermata di caricamento **riferita, non toccata** |
| 🟡 MINORE 1 — terza prova-teatro | resa vera; **provato per mutazione** che la vecchia forma restava verde |
| 🟡 MINORE 2 — due nomi falsi | prova rinominata (**nove**, non dodici) · `classe_rischio` tolta da `DdcTemplateProps` |
| FASE 7 | `tsc` **0** · `vitest` **5353** passate (443 file) · `next build` compilato |
| Casi di prova nei due file DdC | da **89** a **95** |

## 1. 🔴 CRITICO 1 — la voce ⑧ ha di nuovo una strada, e la prova la sorveglia in due versi

**Il difetto, come me l'hanno descritto ed è:** il mandato del mattino autorizzava a togliere il
«No» affermato senza il dato. Io ho tolto **l'intero blocco condizionale, ramo affermativo
compreso** — e ci ho messo sopra una prova verde intitolata «*non stampa nulla nemmeno sul ramo
affermativo*». Vicolo cieco su entrambi i lati: la strada chiusa, e il cartello che diceva che era
giusto così.

- **`src/components/features/pdf/DdcTemplate.tsx:478-505`** — riga della voce ⑧ **ripristinata,
  solo nel ramo affermativo**: con `contiene_sostanze_o_tessuti` vero il foglio stampa
  «Sostanze / tessuti» col dettaglio (o, se il dettaglio manca, «Sì — vedere documentazione
  allegata»). 🛑 **Il «No» NON è tornato**: con dato falso o assente il foglio tace.
- **`src/components/features/pdf/DdcTemplate.tsx:32-40`** — precisazione in testa al file: del
  taglio n. 8 è uscito **il solo «No» senza dato**, non la voce ⑧.
- **`tests/unit/ddc-pdf-content.test.ts:705-812`** — prova **capovolta, non cancellata**, e ora
  asserisce **le due metà**: ① dato affermativo **con** dettaglio → il documento lo **dichiara**
  (si asserisce il dettaglio, non solo l'etichetta: una prova ferma all'etichetta resterebbe verde
  su un modello che stampa il titoletto e butta il contenuto) · ② dato affermativo **senza**
  dettaglio → dichiara comunque il fatto · ③ `false` → **tace** · ④ **campo assente** → tace.
  Il caso ④ è nuovo e non è decorativo: `DdcTemplateProps.ddc` è un `Partial`, quindi «assente» è
  una forma d'ingresso raggiungibile e diversa da `false`.
- **`tests/unit/ddc-pdf-content.test.ts:1031-1042`** — sul **foglio massimale** (che ha il dato
  affermativo) la voce ⑧ è risalita fra ciò che **DEVE** esserci.
- **`src/lib/pdf/generate-ddc.ts:274-301`** — il `false` cablato **resta** (raccogliere il dato è
  un'altra ondata), ma il commento accanto **dice la verità**: la strada di stampa esiste, è
  provata in tutt'e due i versi, e **manca solo la raccolta**.
- **`src/lib/pdf/generate-ddc.ts:96-109`** — registro delle versioni corretto, e la decisione
  dichiarata invece che taciuta: **`ddc-v3` non si spacca**. Il registro salta quando cambia ciò che
  un documento **dice**; con il `false` ancora cablato **nessuna dichiarazione emessa cambia di una
  riga**. Il giorno in cui la raccolta arriverà, quello sarà `ddc-v4`.

**La prova che la voce ⑧ può di nuovo comparire, misurata:** scritte le prove PRIMA della
correzione, `vitest` su `ddc-pdf-content.test.ts` → **3 casi rossi su 59** (i due rami affermativi e
l'asserzione sul foglio massimale), con il testo estratto del PDF incollato nell'errore: nessuna
occorrenza di «Sostanze / tessuti». Applicata la riga al modello → **59 su 59 verdi**.

## 2. 🔴 CRITICO 2 — la rete guarda la forma, e la mutazione lo dimostra

**L'affermazione falsa era mia, e la riporto per intero:** «*Il conteggio è l'unica forma che si
accende anche se il piè di pagina tornasse con un testo diverso*». Il revisore l'ha **misurata** e
non regge: un piè di pagina `fixed` con testo diverso e senza numero passava indisturbato.

Che cosa rende un piè di pagina riconoscibile a prescindere da cosa ci sia scritto: **è un elemento
`fixed`** (cioè, per @react-pdf, «ripetimi su ogni pagina») e **si ripete su ogni pagina**. Le due
prove nuove provano quelle due cose.

- **`tests/unit/ddc-pdf-content.test.ts:585-604`** — nessun elemento dell'albero reso dal modello ha
  `fixed === true`. Si cammina l'albero degli elementi, non il testo.
- **`tests/unit/ddc-pdf-content.test.ts:606-647`** — su un foglio reso **a più pagine**, nessuna riga
  di testo compare su **tutte** le pagine. 🛑 Due dettagli che non sono dettagli: il riempimento è
  fatto di frasi **tutte diverse e numerate** (con un riempimento ripetitivo le righe impaginate
  sarebbero identiche fra loro e l'intersezione risulterebbe piena **senza nessun piè di pagina**),
  e `expect(result.total).toBeGreaterThanOrEqual(2)` è **un'asserzione, non una guardia**: se un
  giorno il foglio smettesse di spezzarsi, la prova deve diventare rossa, non passare in silenzio.
- **`tests/unit/ddc-pdf-content.test.ts:559-583`** — l'affermazione falsa è **riscritta nel commento**
  e sostituita dal fatto misurato. La prova sul testo resta, ma dichiara di essere solo quello.
- **In questo referto**: la riga della §3 («*3. il piè di pagina non compare, e il numero del
  documento compare esattamente una volta*») **non era falsa, era incompleta** — descriveva ciò che
  la prova faceva, non ciò che non faceva. La frase falsa viveva **solo nel commento della prova**,
  ed è quella che ho riscritto. Lo dico distinto per non fabbricare una colpa nel posto sbagliato.

**ESITO DELLA MUTAZIONE DI VERIFICA, che è la richiesta esplicita del mandato.** Rimesso nel modello
un piè di pagina `fixed` (`position: 'absolute'`, `bottom: 20`) con **testo diverso e senza numero**
— «Copia di cortesia per il richiedente — conservare con la prescrizione» — e rilanciati i due file:

```
× 🔴 nessun elemento del modello è `fixed`: la FORMA, non il testo
× 🔴 e su un foglio a PIÙ PAGINE nessun blocco di testo si ripete su tutte
  Tests  2 failed | 93 passed (95)
```

**Si accendono 2 casi di prova** (prima: **zero**). 📌 E si accendono **le due nuove**: la prova sul
testo e il conteggio del numero **restano verdi**, esattamente come il revisore aveva misurato — la
mutazione conferma sia il difetto sia il rimedio. Mutazione rimossa, file ripristinato da copia e
verificato (`grep -c MUTAZIONE` → **0**).

## 3. 🟠 IMPORTANTE 1 — il commento che si era guastato in quattro ore

**`src/lib/consegna/precheck.ts:45-63`.** Diceva ancora «*Oggi il documento afferma «No» senza avere
il dato: è un difetto noto… riferito e non corretto qui*» — corretto quattro ore dopo **dallo stesso
lavoro che aveva scritto quella riga**. Riscritto: la voce ⑧ non ha controllo qui **ed è la risposta
giusta** (è condizionale), il foglio **tace o dichiara** a seconda del dato, e ciò che resta aperto —
**la raccolta del dato, che non fa nessuno** — è scritto lì, perché è l'unico posto dove qualcuno lo
cercherà. 🔑 L'ironia era mia e la incasso: «*un commento che spiega una logica decaduta è il difetto
che questo progetto ha già pagato*».

⚠️ **Questo punto non ha una prova che fallisce prima, e lo dico invece di fabbricarne una**: un
commento non è eseguibile. Lo stesso vale per la rinomina della prova al punto 6.

## 4. 🟠 IMPORTANTE 2 — la firma non si scarica più a ogni consegna

- **`src/lib/pdf/generate-ddc.ts:13-42`** — `hashFirmaDdc` **tolta**, e al suo posto la ragione
  scritta per esteso. Faceva una `fetch` verso Storage e uno SHA-256 **a ogni emissione**, per
  un'immagine che **nessun modello rende più** (D294) e una colonna che **non ha nessun lettore**.
  Era l'unico punto in cui l'emissione di un documento a valore legale dipendeva dalla
  raggiungibilità di Storage.
- **`src/lib/pdf/generate-ddc.ts:8-11`** — via l'import `isPublicStorageUrl` (era la difesa anti-SSRF
  davanti a quella `fetch`). 🛑 **Non è un indebolimento**: è la scomparsa della superficie che
  difendeva. La validazione a scrittura in `PATCH /api/impostazioni` **resta** intatta.
- **`src/lib/pdf/generate-ddc.ts:309-316`** — `firma_ddc_sha256` scritta `null` **con la chiave
  esplicita**, così il payload dell'impronta mantiene la stessa forma. `firma_ddc_storage_path`
  **continua a essere scritta**: esce il lavoro, non il dato.
  📌 **Una conseguenza che vale la pena scrivere invece di lasciarla scoprire:** per un laboratorio
  **con la firma configurata** il `payload_sha256` di una dichiarazione emessa da oggi è **diverso**
  da quello che sarebbe stato ieri — in quel punto il payload portava un'impronta esadecimale e ora
  porta `null`. Non è un difetto: `payload_sha256` certifica *da quali dati* è nato *quel* documento,
  è per-documento e non è un invariante fra documenti. Per un laboratorio senza firma non cambia
  nulla. ✅ Verificato che nessuna prova fissi un'impronta letterale: tutte confrontano due valori
  calcolati o la forma (`/^[0-9a-f]{64}$/`).
- **`tests/unit/generate-ddc.test.ts:349-452`** — le quattro prove **capovolte, non cancellate**, più
  una quinta. La rete vera è **`expect(fetch).not.toHaveBeenCalled()` con la firma CONFIGURATA**:
  «l'hash è null» resterebbe verde anche se il download partisse e fallisse, cioè proprio sul lavoro
  che si vuole togliere. Riscritti anche i due commenti diventati falsi (l'anti-SSRF, e il
  «react-pdf fetcha comunque l'immagine» — oggi non la fetcha nessuno).
  **RED misurato prima della correzione:** 1 caso rosso su 36, con `fetch` chiamata 1 volta e l'URL
  della firma incollato nell'errore.
- ⚠️ **CONFINE RISPETTATO:** `src/app/(app)/impostazioni/page.tsx:375-392` continua a **offrire il
  caricamento** della firma, e l'allowlist di `PATCH /api/impostazioni` continua ad accettarla.
  **Non le ho toccate** — è una superficie che l'utente vede, e la decisione è di Francesco.
  **Riferita, non presa** (v. §R-E2 qui sotto).

## 5. 🟡 MINORE 1 — la terza prova-teatro, e la prova che era teatro

**`tests/unit/ddc-pdf-content.test.ts:470-508`.** Asseriva l'assenza del titoletto «Norme Armonizzate
Applicate» su un foglio reso da una fixture con `norme_json: null` — e nel modello pre-taglio quella
sezione era **già condizionale su quel campo**. Ora si rende **con `norme_json` popolato**, l'unico
foglio su cui quel titoletto potrebbe comparire. ⚠️ E si cerca in minuscolo: il titolo è reso in
maiuscolo da `textTransform`, quindi un'asserzione su `'§6-bis'` sarebbe passata comunque.

**Provato per mutazione, in due tempi.** Rimessa nel modello la sezione `§6-bis` identica al
pre-taglio: la forma NUOVA diventa **rossa**; e con la forma VECCHIA rimessa accanto come prova di
controllo, quella **resta VERDE** sotto la stessa mutazione (`3 failed | 57 passed (60)`). Era
teatro, e ora morde. Mutazione e prova di controllo rimosse.

## 6. 🟡 MINORE 2 — due nomi che affermavano un fatto falso

- **`tests/unit/ddc-pdf-content.test.ts:1067-1100`** — la prova si chiamava «*e NESSUNO dei dodici
  tagli*» e ne controllava **dieci**: il **logo** e i **metadati** non lasciano testo sul foglio
  (un'immagine è invisibile a `getText()`, i metadati vivono nel dizionario `/Info`) e non possono
  stare in una lista di stringhe — le loro reti esistono e guardano i BYTE. E da dieci sono scesi a
  **NOVE** in questo stesso giro, perché la voce ⑧ **non è più un taglio**: è risalita fra ciò che ci
  deve stare. La prova si chiama ora «*NESSUNO dei NOVE tagli che lasciano un testo*».
  ⚠️ **Nove tagli ma UNDICI righe nella lista, e sta scritto nel commento della prova** — o chi conta
  le righe crede che anche questo nome menta: i materiali ne portano due (nome e lotto: due stringhe
  da cercare, un taglio solo) e la ⑥ ne porta due (norma di riferimento e norme armonizzate, uscite
  insieme e per la stessa ragione).
- **`src/components/features/pdf/DdcTemplate.tsx:233-246`** — `DdcTemplateProps` non pretende più
  `classe_rischio`: il commento D102 accanto («senza questi campi la dichiarazione non si stampa
  affatto») era **vero per `tipo_dispositivo` e falso per l'altro**, dato che la classe di rischio
  non si stampa più. Un tipo che pretende un campo che non usa non è severo, è impreciso. 🛑 Il DATO
  non è toccato: colonna `NOT NULL`, scritta a ogni emissione, e il precheck continua a pretenderla.

## 7. FASE 7 — output reale

```
═══ 1/3 npx tsc --noEmit ═══
ESITO tsc: 0            (nessun errore stampato)

═══ 2/3 npx vitest run ═══
 Test Files  438 passed | 5 skipped (443)
      Tests  5353 passed | 56 skipped (5409)

═══ 3/3 npx next build ═══
✓ Compiled successfully in 2.9s
✓ Generating static pages using 15 workers (82/82) in 166ms
```

**5.347 → 5.353: +6 casi di prova.** Nei due file della Dichiarazione si passa da **89 a 95** casi.
`npx eslint` sui cinque file toccati, `--max-warnings=0` → **0**.

## 8. 🔴 RITROVAMENTI (R-E2) di questo giro — riferiti, **non** corretti

① **La schermata che offre il caricamento di una firma che nessun documento stampa.**
`src/app/(app)/impostazioni/page.tsx:375-392` mostra «Firma DdC» col link al file, e
`PATCH /api/impostazioni` continua ad accettare `firma_ddc_url` (allowlist a `route.ts:108`, con la
sua validazione a `:115-117`). Dopo D294 quel file **non finisce su nessun documento**: l'utente
carica una firma e non la vede comparire da nessuna parte. **Decisione di Francesco** — o si toglie
la voce dalle impostazioni, o si dichiara a schermo a che cosa serve ancora. Non toccata: è una
superficie visibile.

② **Due ritrovamenti del referto precedente ora sono DECISI, e la §6 sopra è da leggere con questa
riga accanto** — lasciarli aperti sarebbe lo stesso difetto dell'IMPORTANTE 1:
· §6 ① «*qualcuno dovrà decidere se `firma_ddc_sha256` e l'intera catena `hashFirmaDdc` abbiano
ancora un senso*» → **deciso e fatto**: la catena è tolta (§4 di questo giro). Il resto dell'elenco
di colonne non più lette resta valido e aperto.
· §6 ② «*il tipo `DdcTemplateProps` pretende ancora `classe_rischio` … non l'ho ristretto*» →
**ristretto** (§6 di questo giro).
I ritrovamenti ③ (`schema.sql` cita «MDR §9…§12», numerazione inventata), ④ (la descrizione di un
lavoro del banco contiene `ITCA01051686` come testo libero) e ⑤ (`scripts/tmp/` partecipa al `tsc`)
**restano aperti e non toccati**.

③ **`tests/unit/impostazioni-url-storage.test.ts` prova ancora la validazione di `firma_ddc_url`**,
ed è giusto che lo faccia finché la schermata esiste. Se il ritrovamento ① si chiuderà togliendo la
voce, quelle prove vanno con lei: segnalato perché non le trovi orfane dopo.

## 9. Cosa NON ha fatto questo giro

- **Nessuna migration, nessuna colonna toccata, nessun `git push`, nessun worktree.**
- **Nessuno dei dodici tagli rimesso**, tranne il ramo affermativo della voce ⑧, che il punto 1 del
  mandato imponeva.
- **FASE 9 / 9b:** non dovute (il PDF non è una superficie dell'app: niente viewport, niente tema).
  La prova a schermo qui è il render del foglio, ed è la suite di prove sul PDF vero.
- **BP-1** (MEMORY.md + ROADMAP-UFFICIALE.md): fuori dal mandato di questo esecutore.

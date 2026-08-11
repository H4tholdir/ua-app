# Brief — «Il documento porta solo ciò che ci deve stare»: i quindici tagli

**Per:** l'esecutore fresco di questo compito (R-E1: un compito solo, questo).
**Ramo:** `intervento-post-consegna`, già attivo. 🛑 **Worktree VIETATI.**
**Decisione che esegui:** **D294 + D295**, verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`,
tornate centoventunesima e centoventiduesima.

> Francesco: «*togli tutto quello che sul documento non ci deve essere, come la storia dei materiali*»
> · «*confermo, ripulisci per bene il documento*» · «*teniamola*» (la partita IVA).

🛑 **QUESTO COMPITO NON AGGIUNGE NIENTE.** La voce 6 e il luogo di fabbricazione sono **già stati
collegati** dal compito precedente (`23cdadc4`): **non toccarli**, non «migliorarli», non riscriverli.
Se ti sembra che qualcosa manchi ancora, **fermati e riferisci** (R-E2).

---

## 0. Che documento stai toccando, e perché la cura è alta

È la **dichiarazione ex Allegato XIII** del Reg. (UE) 2017/745: il foglio a **valore legale** che
accompagna ogni manufatto su misura, che il laboratorio deve **conservare dieci anni** e che
un'autorità può farsi consegnare. **Non è un modulo interno.**

**Il metro sono gli OTTO contenuti obbligatori** (Allegato XIII punto 1, verbatim dal consolidato
italiano — copia integrale in
`/private/tmp/claude-501/-Users-hatholdir-Downloads-SOFTWARE-FILIPPO/4fc8c1af-7ffb-4986-a92b-2d470cdddcbe/scratchpad/mdr_it.txt`):
fabbricante e **tutti i luoghi di fabbricazione** · mandatario · dati che identificano il dispositivo ·
uso esclusivo per il paziente nominato · prescrittore · **caratteristiche indicate nella prescrizione** ·
conformità ai requisiti generali (e, «se del caso», quelli **non** rispettati con motivazione) ·
«se del caso», sostanze/tessuti.

---

## 1. CHE COSA ESCE — l'elenco, e la ragione di ciascuno

| # | Campo | `file:riga` di partenza | Perché esce |
|---|---|---|---|
| 1 | **Materiali e lotti** | `DdcTemplate.tsx:277-284` e la sezione che li rende | Vengono dal **consumo di magazzino**, non dalla prescrizione: non sono la voce 6. Nessuna norma italiana li impone (censimento esaustivo). ⚠️ **Restano in banca dati** e **continuano a stamparsi su ricevuta di consegna ed etichetta**: dal documento escono, dal laboratorio no |
| 2 | **Codice ITCA — stampato DUE volte** | testata `:308-310` **e** §1 `:353-358` | La voce 1 nomina **due** cose, nome e indirizzo: un codice di registrazione non è nessuna delle due. L'obbligo italiano colpisce **l'iscriversi** |
| 3 | **SRN EUDAMED** | `:359-364` | Il laboratorio **non è registrato** finché non trasmette la prima segnalazione; e ciò che riceverebbe è un **Actor ID, non un SRN**: l'etichetta è sbagliata due volte |
| 4 | **Luogo di emissione — DUE volte** | `:365-368` e nel blocco firma | È la **città del laboratorio**, non un luogo di fabbricazione. 🛑 **NON confonderlo con `luogo_fabbricazione`, che il compito precedente ha appena AGGIUNTO e resta** |
| 5 | **Classe di rischio** | `:462-469` | Fuori dalle otto voci |
| 6 | **Norma di riferimento** e **norme armonizzate** | `:470-488` | La voce 7 chiede i requisiti **NON rispettati** con motivazione: una norma **applicata** è un'altra cosa |
| 7 | **Rischi residui** | `:501-506` | Analisi del rischio (ISO 14971), non una deroga a un requisito |
| 8 | **«Sostanze / tessuti: No»** | `:448-455` | 🔴 Stampato da un `false` **cablato** (`generate-ddc.ts:167`) che **nessuno scrive mai**: è un'**affermazione non sostenuta** su un documento legale. La voce 8 è **condizionale** — «se del caso» — quindi il silenzio è la forma giusta |
| 9 | **Firma, etichetta PRRC, nome e qualifica del responsabile** | `:515-530` | L'Art. 15(3)(b) nomina la *dichiarazione di conformità **UE***, che per i su misura **non esiste** (Art. 10(6)). Le otto voci non parlano né di firma né di responsabile. 📌 Il progetto lo sapeva già: `ROADMAP-UFFICIALE.md:1138` |
| 10 | **Logo** | `:313-316` | Non è un contenuto; ed è una **lettura viva** che rende instabile una ristampa |
| 11 | **Piè di pagina** (testo + numero) | `:535-541` | Doppioni |
| 12 | **Metadati PDF** | `:287-293` | Non visibili sul foglio |

🟡 **RESTANO, e la ragione va lasciata scritta dov'è:** data di emissione (**Art. 52(8)**, «prima
dell'immissione»: senza data non si dimostra) · numero del documento (chiave per ritrovarlo nei dieci
anni) · numero della prescrizione · titolo e base giuridica · nota sulla marcatura CE ·
**partita IVA — 🔑 tenuta per SCELTA di Francesco, non per obbligo: il censimento non ne ha trovato
nessuno. Scrivilo nel commento**, così il prossimo non la deduca da una norma che non c'è.

---

## 2. Le tre trappole di questo compito, dichiarate

1. 🔴 **Togliere dal FOGLIO non è togliere dal DATO.** Le colonne restano in tabella e i valori
   continuano a essere salvati: tu tocchi **che cosa si stampa**. Se ti viene voglia di cancellare una
   colonna, **fermati**: sarebbe una migration, ed è **vietata** qui.
2. 🔴 **`luogo_emissione` esce, `luogo_fabbricazione` RESTA.** Si somigliano nel nome e sono due cose
   diverse: il primo è la città del laboratorio, il secondo è un contenuto **obbligatorio** appena
   aggiunto. **Confonderli disfa il lavoro del compito precedente.**
3. 🟠 **Il documento non deve restare sfigurato.** Togliendo dodici blocchi restano buchi, sezioni vuote
   e numerazioni che saltano. **Guarda il risultato** e sistema la spaziatura e la numerazione delle
   sezioni — ma **senza ridisegnare** e senza toccare i testi che restano.

---

## 3. Le regole del progetto

- **TDD:** per ogni taglio, una prova che **fallisce prima** (cioè che asserisce l'assenza del campo dal
  documento reso) e passa dopo. 🛑 **Una prova che oggi asserisce la PRESENZA di un campo tolto non si
  cancella: si CAPOVOLGE.** Una prova cancellata è copertura persa in silenzio.
- **FASE 7 completa:** `npx tsc --noEmit` && `npx vitest run` && `npx next build`, output reale.
- **NESSUNA MIGRATION.** **Nessun `git push`.** Salva con `fix(mdr): …`.
- **R-E2:** difetti fuori mandato si **riferiscono**.
- ⚠️ Alcuni campi tolti potrebbero diventare **variabili non più usate** o **colonne mai più lette**:
  segnalale, **non** cancellarle a catena.

## 4. La prova che il lavoro è servito

🛑 **Genera il documento PRIMA e DOPO, e GUARDALO.** Non basta il verde: descrivi nel referto com'è
cambiato il foglio, sezione per sezione, e **allega o descrivi** ciò che hai visto. Se non riesci a
generare il PDF, **dillo** come limite dichiarato.
📌 Il compito precedente ha usato un render locale in sola lettura: guarda come ha fatto
(`.superpowers/sdd/intervento-task-doc-1-report.md`) e riusa quella strada.

## 5. Il referto

`.superpowers/sdd/intervento-task-doc-2-report.md` (prefisso `intervento-` obbligatorio).
Dentro: i dodici tagli uno per uno con `file:riga` · le prove capovolte · il confronto prima/dopo ·
l'output della FASE 7 · **RITROVAMENTI (R-E2)** · le decisioni prese da solo.
⚠️ **I numeri si misurano due volte, e si chiamano col loro nome:** in quest'ondata un referto ha
chiamato «asserzioni» dei **casi di prova** — numero giusto, etichetta sbagliata, e chi rilegge ci
inciampa.

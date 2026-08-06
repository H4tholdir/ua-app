# Spec — «Si deve sempre poter intervenire»: l'intervento dopo la consegna

**Stato:** 🟡 **SCRITTA — attende la revisione di Francesco** (il flusso brainstorming si chiude sulla
sua rilettura, non sull'approvazione delle sezioni in chat, che è già avvenuta).
**Quando:** 6 agosto 2026 (`provato:` `date` → `2026-08-06 13:24 CEST`).
**Decide:** Francesco Formicola.
**Nasce da:** **D262** (direttiva permanente: «la PWA non deve fornirci blocchi o ostacoli, ma aiuti
concreti») · **D263** (la riapertura è un gesto solo, il motivo è obbligatorio, e il motivo sceglie
l'iter) · i **sette casi** istruiti nella centosettesima tornata del verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md:2125-2166`.
**Panel:** tre advisor indipendenti — normativo MDR · sistema qualità (ISO 13485 / MDR Art. 10(9),
83-88) · architettura sul codice vero. Convocati secondo la Regola Advisor (`CLAUDE.md` §7, dominio
critico: documento a valore legale). **Tre premesse poste, tre esiti:** due falsificate, una
falsificata e *invertita*, una confermata — §2.
**Decisioni precedenti che vincolano:** **D-1 del 16/07** (annullo tracciato: numero mai riusato,
documento annullato conservato, registro che mostra le annullate) · **D261** (il messaggio della riga
bloccata si scrive dentro quest'ondata, «prima decidiamo la finestra») · **R-P1 / R-P2 / R-P6 / R-E1 /
R-E2** (regole di piano e di esecuzione) · **Statuto delle fonti** (`CLAUDE.md` §7).

---

## §0 Perché quest'ondata esiste (in una pagina)

Oggi, in produzione, l'unico modo di rientrare in un lavoro consegnato è **annullare la consegna**, e
quel gesto vive **dieci minuti**. Scaduti, `consegnato` non ha uscite: `TRANSIZIONI_CONSENTITE`
(`src/lib/lavori/transizioni.ts:8-16`) non ha `consegnato` fra le chiavi, e non esiste alcun override.

I sette casi che Francesco ha istruito emergono **da ore a settimane dopo**. Il gesto su cui D263
vuole appendere il motivo, oggi, **non è raggiungibile quando i casi accadono**.

La finestra dei dieci minuti, per giunta, è un **residuo**: nasceva come vincolo C4 per non far
collidere l'annullo con una fattura emessa **automaticamente** alla consegna. Quell'architettura non
fu mai eseguita (`provato:` 0 `insert` su `fatture` in `src/lib/consegna/orchestrate.ts`, e
`fattura: null` alle righe 157 e 385). Il limite protegge da una collisione **che non può avvenire**.

Il panel ha aggiunto la ragione più seria, che non era nel mandato: **il cancello di qualità e quello
commerciale sono oggi lo stesso cancello**, e dura dieci minuti. Un reclamo su un lavoro fatturato
otto mesi fa non ha modo di essere registrato — e se quell'evento è un incidente grave, **l'orologio
dell'Art. 87 corre lo stesso**. L'app ha un punto cieco strutturale esattamente dove le conseguenze
sono più alte.

---

## §1 Le decisioni di oggi — D264-D270 (centottesima tornata)

| # | Decisione | Conseguenza |
|---|---|---|
| **D264** | 🎯 **PERIMETRO DELLA PRIMA ONDATA: i casi 1, 2, 3 e 5.** Dato sbagliato sul documento · difetto visto dal laboratorio · difetto segnalato dal medico o dal paziente · richiesta clinica nuova che **non** è un errore | I casi **4** (destinatario sbagliato), **6** (prezzo/quantità) e **7** (reso senza difetto) restano scritti e **non spariscono**: §11. Il caso 5 entra **come uscita**, non come correzione — è ciò che impedisce a una richiesta nuova di finire nel conto delle non conformità |
| **D265** | 🔑 **IL DOCUMENTO SANITARIO E QUELLO FISCALE SONO DUE MONDI.** La dichiarazione si corregge **sempre**, anche a fattura emessa. La fattura resta intoccabile per conto suo | Un dato sanitario errato resta errato anche dopo l'incasso, e lasciarlo agli atti è peggio che correggerlo. Il rimedio fiscale (nota di credito) è il **caso 6**, fuori perimetro. `provato:` nessuna fonte, in nessuno dei tre referti, subordina un obbligo di qualità alla fatturazione |
| **D266** | 🔑 **L'INTERVENTO VIVE IN UN REGISTRO NUOVO — `eventi_qualita` — CHE STA SOPRA IL RIFACIMENTO E NON CAMBIA LO STATO DEL LAVORO.** Il rifacimento resta com'è e diventa **uno degli esiti possibili** | Due prove strutturali: (a) `lavori_rifacimenti.lavoro_nuovo_id` è `NOT NULL` (`005_v1_foundation.sql:75`) e `rifacimento_nuovo_unique` (`006:100-102`) impone un lavoro nuovo per ogni rifacimento — la tabella **non sa esprimere** «corretto sul posto, nessun lavoro nuovo», che è il caso 1; (b) nel caso 3 **non si vuole riaprire niente**: la consegna è avvenuta, il documento è valido, si vuole registrare un fatto **col lavoro intatto**. Il giunto è `lavori_rifacimenti.evento_id` **nullable** |
| **D267** | 🔑 **NELLE CASELLE SI SCRIVONO FATTI, MAI CONSEGUENZE — e REGISTRARE è un atto, GIUDICARE è un altro.** L'evento si crea sempre; la **valutazione** è separata, datata, attribuibile, con esito da lista chiusa che comprende «nessuna azione richiesta, e la giustificazione». Gli indicatori contano **le valutazioni**, non gli eventi | Scioglie il timore di Francesco senza compromessi: nulla resta non registrato e nulla sporca i numeri. È la forma che la norma prevede già — ISO 13485 §8.2.2 impone di documentare la giustificazione quando un reclamo **non** viene indagato, e MDCG 2023-3 p. 8 impone di registrare nel sistema qualità anche ciò che non è un incidente |
| **D268** | 🛑 **IL CONFINE NON È L'APPLICAZIONE AL PAZIENTE: È LA CONSEGNA. E l'ordine dei test è quello ministeriale** — ① criteri di incidente → ② coinvolgimento di paziente/utilizzatore/altra persona → ③ conseguenze sulla salute | Ribalta il caso 2: il difetto segnalato dal dentista **prima** dell'applicazione **è un reclamo**, ed è il caso *tipico*. E l'ordine è portante: una derivazione che assegna «reclamo» **senza prima** passare dal test dell'incidente **nasconde l'obbligo di trend reporting dell'Art. 88**, che vive sugli incidenti non gravi. §3 e §6 |
| **D269** | 🛑 **LA FINESTRA DEI DIECI MINUTI SPARISCE DEL TUTTO, E L'ANNULLO CONSEGNA È ASSORBITO IN «DEVO INTERVENIRE».** Un gesto solo per rientrare in un lavoro. **Il cancello di qualità non si chiude mai**; quello commerciale resta dov'è | Scelta esplicita di Francesco il 06/08, contro la raccomandazione di affiancare i due gesti (che era la mia). Il costo è dichiarato: chi ha solo sbagliato tasto fa **due tap invece di uno**, dichiarando il motivo `errore_registrazione`. Il guadagno è che non esistono più due porte con due regole diverse. §7 |
| **D270** | 🔑 **UNA CLASSIFICAZIONE SBAGLIATA SI CORREGGE PER SOVRAPPOSIZIONE, MAI CON UN `UPDATE` — e la sola-aggiunta la impone il DATABASE, non il codice** | ISO 13485 §4.2.5 richiede che **le modifiche a una registrazione restino identificabili**: una sovrascrittura non lo soddisfa. Il precedente è già in casa: `20260804154232_ondata_b_ddc_chiusura_update.sql:9` ha **rimosso la policy di UPDATE** sulla dichiarazione — l'immutabilità è struttura, non convenzione. **Declassare** (da reclamo a nessuna azione) richiede motivo obbligatorio: è il movimento che un ispettore guarda per primo |

---

## §2 Le tre premesse poste al panel — due falsificate, una invertita, una confermata

Il metodo è quello del §9 del verbale (30/07): al panel si danno **premesse da rompere**, non domande
da svolgere. Le fonti sono riprodotte con URL secondo lo Statuto (`CLAUDE.md` §7).

### P1 — «Chi se n'è accorto» e «il dispositivo è stato applicato» sono lo stesso asse → **FALSIFICATA**

La falsificazione è **nel testo**, su due ancoraggi diversi dello stesso regolamento:

- **Art. 2(64)** — `incident` = «*any malfunction or deterioration in the characteristics or performance
  of a device **made available on the market***…» → asse **STATO DEL DISPOSITIVO**.
- **Art. 87(3)** — «*not later than 15 days **after they become aware** of the incident*» → asse
  **CONOSCENZA**.
  https://www.medical-device-regulation.eu/2019/07/10/mdr-article-2-definitions/ ·
  https://www.medical-device-regulation.eu/2019/07/16/mdr-article-87-reporting-of-serious-incidents-and-field-safety-corrective-actions/

Peggio ancora per un booleano: l'Art. 2 definisce **tre momenti distinti**, non due — (27) *making
available*, (28) *placing on the market* («*the first making available*»), (29) *putting into service*.
Un solo campo `applicato` non può rappresentarne tre.

**Chi** ha inoltre una conseguenza giuridica propria in Italia: **D.Lgs 137/2022 art. 10 c. 6** — gli
operatori sanitari sono tenuti a segnalare i reclami al fabbricante, informandone contestualmente il
Ministero della salute. Se se ne accorge **il medico** nasce un dovere del medico; se se ne accorge
**il laboratorio**, quel dovere non nasce.

**Chi se n'è accorto governa l'OROLOGIO; stato del dispositivo e potenziale di danno governano la
CLASSE.** Fonderli significa sbagliare l'uno o l'altra.

Conferma indipendente dal secondo advisor: ISO 13485 separa **§8.3.2** (non conformità rilevata
*prima* della consegna) da **§8.3.3** (rilevata *dopo* la consegna o l'uso). **L'asse della norma è la
consegna**, non l'applicazione e non chi ha visto.

### P2 — Un «reclamo» esiste solo dopo l'applicazione al paziente → **FALSIFICATA, ed esattamente invertita**

Il MDR **non definisce `complaint` nell'Art. 2**. La definizione vincolante è quella della norma
tecnica, e — questo risolve il problema del paywall ISO — è **riprodotta verbatim in un documento
pubblico ufficiale italiano**: Ministero della Salute, *Linee di indirizzo per la segnalazione dei
reclami* (all. 1 alla circolare DGDMF del 29/11/2022):

> «*Il reclamo è definito nella norma tecnica EN ISO 13485:2016 come "comunicazione scritta, in formato
> elettronico o orale che dichiara carenze correlate a identità, qualità, durabilità, affidabilità,
> usabilità, sicurezza o prestazioni di un dispositivo medico…"*»

e, la frase che rovescia la premessa:

> «*In linea generale i RECLAMI non prevedono un coinvolgimento del paziente/utilizzatore o di un'altra
> persona e si tratta, in genere, di **eventi riscontrati prima dell'uso del dispositivo**.*»

https://www.fofi.it/circolari_news_comunicati/Ministero_salute_linee_indirizzo-segnalazione-reclami-dispositivi_%20medici.pdf

Riscontro europeo indipendente, per la stessa clausola ISO §3.4: **MDCG 2023-3 Rev.2** (gennaio 2025),
p. 8, che chiude la definizione con «*irrespective of the source of this information*».
https://health.ec.europa.eu/document/download/af1433fd-ed64-4c53-abc7-612a7f16f976_en?filename=mdcg_2023-3_en.pdf

➡️ **Un dispositivo restituito non applicato non è «comunque» un reclamo: è il caso tipico.** Il
**caso 2**, che avevamo classificato come rilavorazione interna, è un reclamo ogni volta che
l'informazione arriva **da fuori**.

**Due riproduzioni ufficiali indipendenti — una UE in inglese, una ministeriale in italiano — della
stessa clausola a pagamento.** È quanto di più vicino al testo primario si possa avere senza
acquistare la norma; nel resto del documento non ripeto «fonte secondaria» per questa clausola.

### P3 — Per un dispositivo su misura la messa a disposizione avviene alla consegna al medico → **REGGE**

Quattro clausole convergenti:

- **Art. 2(27)** — «*any supply of a device… for distribution, consumption or use on the Union market
  in the course of a commercial activity*».
- **Art. 52(8)** — i fabbricanti di dispositivi su misura seguono l'Allegato XIII e redigono la
  dichiarazione del §1 **prima di immettere tali dispositivi sul mercato**.
- **Allegato XIII §4** — conservazione «*per un periodo di almeno 10 anni **dalla data di immissione
  sul mercato del dispositivo***».
- **Art. 87(1)** — il dovere grava sui dispositivi «*made available on the Union market*».

➡️ **La sorveglianza post-market si accende alla consegna al medico.**

`provato:` il codice è già conforme all'Art. 52(8) su questo punto: la dichiarazione nasce allo
**Step 3** di `src/lib/consegna/orchestrate.ts:265-269`, e lo stato `consegnato` allo **Step 5**
(righe 300-312). Il documento esiste prima che il lavoro risulti consegnato.
⚠️ **Resta un rischio operativo, non di codice:** se il laboratorio consegna fisicamente il manufatto
e **poi** registra la consegna nell'app, la dichiarazione nasce dopo l'uscita reale. È una questione
di prassi, e va posta a Francesco — **non verificato** oggi.

---

## §3 Il confine, in forma operativa

**Prima della consegna** — il dispositivo non è mai stato «made available»: l'Art. 2(64) non può
applicarsi, e l'Allegato XIII §5 grava sull'esperienza acquisita nella **fase successiva alla
produzione**. Difetto colto al banco = **non conformità interna + rilavorazione** (ISO §8.3.2 e
§8.3.4). Nessuna vigilanza, nessun reclamo.

**Dopo la consegna** — i tre test del flowchart ministeriale, **in quest'ordine**:

1. **Soddisfa i criteri di incidente** (Art. 2(64)/(67))? → **SÌ = INCIDENTE**, e si valuta se **grave**
   (Art. 2(65): ha portato, **avrebbe potuto portare** o potrebbe portare a morte, deterioramento
   grave dello stato di salute, o grave minaccia per la salute pubblica).
2. Se NO → **ha coinvolto paziente / utilizzatore / altra persona?** → **NO = RECLAMO**.
3. Se SÌ → **ci sono state conseguenze sulla salute?** → **NO = RECLAMO** · **SÌ = INCIDENTE**.

**Due tubi diversi, e non vanno confusi:**
- i **reclami** *non* entrano nella rete nazionale di dispositivo-vigilanza; sono documentazione di
  sorveglianza post-market ex **Art. 83-86 e Allegato III**;
- gli **incidenti non gravi** alimentano il **trend reporting dell'Art. 88**.

🛑 **Perciò l'ordine dei test è portante.** Classificare come «reclamo» ciò che è un incidente
**nasconde un obbligo di segnalazione dell'andamento**. Una regola di derivazione che assegna
«reclamo» prima di aver escluso l'incidente è, letteralmente, il difetto che quest'ondata esiste per
prevenire. Questa spec adotta l'ordine ministeriale e **rifiuta** la derivazione alternativa proposta
dal secondo advisor, che invertiva i due passi.

**Nessuno dei tre test chiede se il dispositivo è stato applicato.** È la ragione per cui la risposta
di Francesco («spesso non lo sappiamo») **non blocca nulla**: `applicato` è un dato utile alla
biforcazione §8.3.2/§8.3.3, **non** un cancello della valutazione.

**Termini dell'Art. 87, e decorrono dalla CONOSCENZA:**

| § | Caso | Termine |
|---|---|---|
| 87(4) | Grave minaccia per la salute pubblica | «*immediately, and not later than **2 days***» |
| 87(5) | Morte / deterioramento grave non previsto | «*immediately… not later than **10 days***» |
| 87(3) | Incidente grave (regola generale) | «*not later than **15 days** after they become aware*» |
| 87(8) | FSCA | **prima** che l'azione correttiva sia intrapresa |
| 87(7) | **Dubbio** | «*it shall **nevertheless submit a report** within the timeframe required*» |

**Il momento zero:** MDCG 2023-3 Q15, p. 19 — la *awareness date* è il momento in cui il **primo
dipendente o rappresentante** dell'organizzazione riceve l'informazione. È questo il timestamp che
`eventi_qualita` deve registrare, e non è la data di creazione della riga.

**Art. 87(7) decide la direzione dell'errore di progetto:** nel dubbio si segnala. Un'app tarata per
il contrario è tarata contro una regola esplicita.

---

## §4 L'impianto — `eventi_qualita`, e perché non si chiama «riapertura»

**Il nome conta.** Chiamarlo `riaperture` ri-accoppia «registrare un fatto di qualità» a «cambiare lo
stato del lavoro» — e nel caso 3 non si vuole riaprire niente. L'oggetto è **`eventi_qualita`**:
agganciato al lavoro, **nessun cambio di stato richiesto**, con un indicatore *opzionale* «questo
evento richiede anche di rientrare in produzione».

```
lavori ──1:N──> eventi_qualita ──1:N──> valutazioni_evento   (append-only, l'ultima supera le altre)
                      │
                      └──0:1──< lavori_rifacimenti.evento_id (nullable)
```

- **`eventi_qualita`** — il **fatto**. Chi, quando, cosa, dove era il dispositivo, che conseguenze si
  vedono. Non porta classificazioni.
- **`valutazioni_evento`** — il **giudizio**. Datato, attribuibile, con esito da lista chiusa.
  Append-only: una classificazione sbagliata si supera con una riga nuova che punta alla precedente e
  ne dichiara il motivo (§9).
- **`lavori_rifacimenti`** resta intatta e acquisisce `evento_id` nullable: il rifacimento diventa
  **un esito**, non la porta d'ingresso.

**Perché non estendere `lavori_rifacimenti`** — `lavoro_nuovo_id NOT NULL` (`005:75`) e
`rifacimento_nuovo_unique` (`006:100-102`) vietano strutturalmente l'evento il cui esito è «corretto
sul posto». Per farcelo stare si smonterebbe il vincolo che oggi garantisce l'invariante «un
rifacimento = un lavoro nuovo»: danno silenzioso e permanente.

**Perché non riusare `incidenti_mdr`** — il suo vocabolario mescola **classe dell'evento** e **classe
della risposta** (l'azione correttiva di sicurezza è un'azione, non un tipo di evento) e contiene
`anomalia`, che non è un termine MDR. Ci si costruirebbe sopra un difetto anziché correggerlo.
`incidenti_mdr` **resta** ed è la destinazione degli eventi che superano il test dell'incidente.

**🛑 Il modello da non copiare** è `segnalazione_*` (`20260521000003:5-19`): cinque colonne appiattite
su `lavori` con un booleano `risolta`. Regge **una sola** segnalazione per volta e non ha storia — e
un lavoro si riapre più di una volta.

---

## §5 Gli assi — quattro fatti ortogonali, più il momento zero

Il `motivo` resta **piccolo e fattuale**; le conseguenze si derivano da colonne separate, compilate
nello stesso gesto.

⚠️ **Un campo solo, non due.** L'utente sceglie **`motivo`** — nove voci, nella lingua del laboratorio.
**`natura` non è un secondo campo da compilare: è una derivazione fissa di `motivo`**, e serve alle
regole del §6. Tenerli entrambi compilabili sarebbe la stessa duplicazione che stiamo correggendo.

| Motivo (lo sceglie l'utente) | Natura (derivata) |
|---|---|
| `errore_dato_dichiarazione` | `dato_documentale` |
| `difetto_lavorazione` · `difetto_materiale` | `difetto_fisico` |
| `destinatario_errato` | `identificazione_destinatario` |
| `modifica_clinica_richiesta` | `nuova_esigenza_clinica` |
| `errore_prezzo_quantita` | `commerciale` |
| `reso_senza_difetto` | `nessun_difetto` |
| `errore_registrazione` | `errore_registrazione` |
| `altro` (+ testo libero **obbligatorio**) | **si chiede**, non si indovina: l'utente sceglie la natura fra le precedenti |

| Asse | Valori | Test che governa |
|---|---|---|
| `motivo` → `natura` | vedi tabella sopra | «È una non conformità?». Tiene il **caso 5** fuori dal conto delle NC e il **caso 6** fuori dal sistema qualità. `errore_registrazione` è la voce che assorbe il vecchio annullo consegna (D269) |
| `origine_informazione` | `laboratorio_interno` · `odontoiatra` · `paziente_tramite_medico` · `autorita_competente` · `altro_operatore` | **Fa partire l'orologio** (MDCG 2023-3 Q15) e stabilisce se esiste una comunicazione allegante — cioè se può esserci un reclamo |
| `conosciuto_il` | timestamp | **Il momento zero dei termini 2/10/15 giorni.** Precompilato con «adesso», **modificabile**: la notizia può essere arrivata ieri al telefono |
| `stato_dispositivo` | `mai_uscito_dal_lab` · `consegnato_non_applicato` · `applicato` · `non_noto` | Biforcazione ISO §8.3.2 / §8.3.3 e test «uscito dal controllo». **Quattro valori, non un booleano.** `non_noto` è ammesso e **non blocca** — decisione di Francesco del 06/08 |
| `potenziale_di_danno` | `nessuno` · **`da_valutare` (default)** · `possibile` · `accertato` | Cancello Art. 2(64)/(65) e Art. 87. Un default `nessuno` sarebbe un generatore silenzioso di sotto-classificazione, contro l'Art. 87(7) |

**`altro` va monitorato:** se supera pochi punti percentuali, il vocabolario è sbagliato e si rivede.

**Riconciliazione con i tre vocabolari già esistenti — non si crea un dizionario parallelo:**

1. **`lavori_rifacimenti.motivo`** (`005:76-81`) resta dov'è, come motivo del **rifacimento
   produttivo**. Due sue voci sono il collasso in atto e vanno disambiguate tramite `natura`:
   `non_confortevole` copre sia il difetto (casi 2/3) sia la nuova esigenza clinica (caso 5), che sono
   iter opposti; `errore_prescrizione` copre sia «il dentista ha prescritto male» sia «noi abbiamo
   trascritto male».
2. **`incidenti_mdr.tipo`** sopravvive sull'asse MDR — `incidente` / `incidente_grave`. `reclamo`
   **non** entra qui: il reclamo è un **esito di valutazione**, perché nasce anche senza incidente.
   ⚠️ **Prima di qualunque migration va letto il CHECK vivo dal catalogo** (`pg_get_constraintdef`),
   non dal file: la tabella ha già subito DDL fuori banda (§15).
3. **Vocabolario divergenza prescritto/eseguito** (`src/lib/domain/prescrizione-costanti.ts:53-58`):
   `richiesta_dentista` **è già il caso 5**. `natura = nuova_esigenza_clinica` **non lo duplica**: vi
   **rimanda**, e serve solo a impedire che il caso 5 entri nel secchio sbagliato quando arriva dalla
   porta dell'intervento anziché da quella della prescrizione.

---

## §6 Le derivazioni — calcolate, proposte, confermate

L'app **propone** l'iter e **una persona conferma**. Non deposita in silenzio: sia il «determinare se
serve un'indagine, e giustificare in caso contrario» (§8.2.2) sia la valutazione del nesso causale
(Art. 87) sono giudizi che il Regolamento assegna **al fabbricante**. Un'app che se li prende si
assume un dovere che non può assolvere; un'app che precompila e chiede conferma fa esattamente ciò che
D263 chiede.

**Ordine di valutazione — ministeriale, non negoziabile (D268):**

```
① potenziale_di_danno ≠ nessuno            → candidato INCIDENTE → test Art. 2(65) gravità
                                              ├─ grave      → MIR Art. 87 (2/10/15 gg da conosciuto_il)
                                              └─ non grave  → incidenti_mdr + Art. 88 (andamento)
② altrimenti, origine ≠ laboratorio_interno
   e stato_dispositivo ≠ mai_uscito_dal_lab
   e natura ∉ {nuova_esigenza_clinica, commerciale, errore_registrazione}
                                            → RECLAMO (documentazione PMS, Art. 83-86)
③ altrimenti                                → NON CONFORMITÀ INTERNA (§8.3.2 o §8.3.3 secondo
                                              stato_dispositivo) + registrazione di rilavorazione
```

Derivazioni documentali, indipendenti dalle tre precedenti:

- **riemissione della dichiarazione** ⟸ dichiarazione già emessa **e** `natura ∈ {dato_documentale,
  difetto_materiale}`
- **nota di credito** ⟸ fattura già emessa **e** `natura = commerciale` → **fuori perimetro** (caso 6):
  l'app lo **segnala** e non lo esegue
- **avviso al medico** ⟸ §10
- **azione correttiva e preventiva (CAPA, §8.5.2): mai derivata da un evento singolo.** La
  proporzionalità agli effetti non si calcola su una riga sola: nasce dal riesame dell'accumulato

**Ogni esito è una proposta con la sua motivazione in chiaro** («questo sembra un reclamo perché il
dispositivo era uscito e la segnalazione arriva dall'odontoiatra»), e chi conferma lascia il nome.

---

## §7 I cancelli — uno solo si chiude

| Cancello | Regola | Fondamento |
|---|---|---|
| **Qualità** | 🟢 **Non si chiude mai.** Un evento di qualità si registra su qualunque lavoro, in qualunque stato, a qualunque distanza di tempo | Nessuna fonte, in nessuno dei tre referti, subordina un obbligo di qualità o di vigilanza alla fatturazione o al tempo trascorso. L'orologio dell'Art. 87 parte dalla **conoscenza** |
| **Documento sanitario** | 🟢 **Si corregge sempre** (D265), a fattura emessa compresa | L'Allegato XIII impone **conservazione**, non immodificabilità: §8 |
| **Commerciale** | 🔴 **Resta chiuso** a fattura emessa: si segnala il caso 6, non si esegue | Fatto irreversibile già avvenuto — l'unica giustificazione ammessa da D262 insieme all'obbligo di legge |
| **Tempo** | ⚫ **ABOLITO** (D269) | Residuo di un'architettura mai eseguita (§0) |

**Che cosa comporta l'abolizione, in concreto:**

- `FINESTRA_ANNULLO_MS` (`src/lib/consegna/costanti.ts:6`) e ogni sua copia **spariscono**;
- il banner con il conto alla rovescia (`AnnullaConsegnaBanner.tsx`) **sparisce**, e al suo posto la
  scheda del lavoro consegnato mostra **«Devo intervenire»**, sempre presente;
- `annulla_consegna_atomica` **non viene allargata**: il suo lavoro utile — riportare il lavoro a
  `pronto`, azzerare `conformato`/`data_conformazione`, mettere la dichiarazione in `annullata`
  (`20260710180000:102-116`) — diventa **uno degli esiti** dell'intervento, invocato quando l'esito lo
  richiede. ⚠️ La RPC ha un `RAISE` d'ingresso che vincola `p_finestra_ms` fra 1 secondo e 15 minuti
  (`:75-77`): **la firma cambia**, quindi rigenerazione dei tipi obbligatoria;
- chi ha semplicemente sbagliato tasto usa `natura = errore_registrazione`: **due tap invece di uno**.
  È il costo dichiarato di D269, accettato da Francesco.

---

## §8 Il documento — l'ordine è portante, e il nome è sbagliato

### 8.1 🛑 Prima si annulla, poi si riemette — o si fallisce dichiarando successo

`src/lib/pdf/generate-ddc.ts:100-104` **restituisce la dichiarazione esistente** se ne trova una non
annullata, e ritorna `{numero, url}` **come se l'avesse generata**. Se la riemissione non annullasse
prima, l'utente leggerebbe «riemessa» con in mano **il documento vecchio**: nessun errore, nessun
avviso. L'ordine inverso sbatte invece contro `ddc_lavoro_attiva_unique`
(`20260710090000:14-17`) con un `23505`.

➡️ **L'ordine è: annulla → riemetti.** È invisibile leggendo il TypeScript, e va **provato con un
test che fallisca se l'ordine si inverte** (R-P1: un vincolo si prova con un valore che DEVE essere
rifiutato).

### 8.2 Le due cose che mancano

- **`sostituisce_id`** sulla dichiarazione: oggi il legame fra la nuova e l'annullata si **deduce**
  dal lavoro comune. A un ispettore va **detto**, non fatto dedurre.
- **Il motivo dell'annullamento**: `annulla_consegna_atomica(p_lavoro_id, p_laboratorio_id,
  p_finestra_ms)` non prende alcuna causale (`src/types/database.types.ts:6022-6029`). Con
  `eventi_qualita` la causale esiste: si collega, non si duplica.

### 8.3 ⚠️ Ciò che credevamo legge e non lo è

**L'Allegato XIII §1 è un elenco di otto contenuti, e un numero di documento non è fra gli otto. Il §4
impone soltanto la conservazione.** «Numero mai riusato», «riferimento incrociato», «registro delle
annullate» (D-1 del 16/07) sono **politica interna**, non obbligo.

➡️ Reggono come buona pratica e **restano**. Ma sotto D262 **una regola che ci siamo dati da soli non
può giustificare un blocco**: l'app può vietare la **cancellazione**, mai la **correzione**.

### 8.4 Il nome — e la sola decisione di nome che è dentro il perimetro

**Art. 10(6):** l'obbligo di redigere una dichiarazione di conformità UE riguarda i dispositivi
«*other than custom-made*». **MDCG 2021-3 Q9:** «*in place of a declaration of conformity*», i
dispositivi su misura sono accompagnati da una **dichiarazione ex Allegato XIII**.

➡️ Chiamarla «Dichiarazione di conformità / DdC» nomina uno strumento che i su misura **non emettono**.
Rinominare la codebase è **un'ondata a sé** e non è questa (§15).

🎯 **Ma una decisione di nome cade dentro questo perimetro ed è dovuta:** il **testo nuovo** — il
messaggio della riga bloccata rimandato da **D261**, e la voce della riemissione — **si scrive con il
nome corretto**. In interfaccia: **«la dichiarazione»** (Allegato XIII), mai «dichiarazione di
conformità». Il debito di nome resta altrove; non lo si aggrava scrivendone di nuovo.

---

## §9 Correggere una classificazione senza perdere la traccia

**Mai un `UPDATE`.** Riga nuova in `valutazioni_evento` che **supera** la precedente:
`sostituisce_id` nullable, `classificato_da`, `classificato_il`, e `motivo_riclassificazione`
**obbligatorio quando `sostituisce_id` non è nullo**. La classificazione corrente è quella che nessuna
altra supera — indice unico parziale sulla riga viva, la forma è già in casa
(`ddc_lavoro_attiva_unique`).

**La sola-aggiunta si impone nel database** — revoca di `UPDATE`/`DELETE` o trigger che rifiuta — **non
nel codice applicativo**: una garanzia di sola-aggiunta garantita dall'applicazione non è una garanzia.
Precedente in casa: `20260804154232_ondata_b_ddc_chiusura_update.sql:9`.

**Asimmetria voluta:** registrare resta economico (D262); **declassare** chiede il motivo scritto.
Rendere il declassamento fluido quanto la prima registrazione è il modo in cui un principio di
usabilità corretto diventa un problema di evidenze.

**Conservazione — e un vincolo che il progetto non aveva:** Allegato XIII §4 richiama l'Allegato IX §8,
per cui la documentazione resta a disposizione delle autorità **anche se il fabbricante fallisce o
cessa l'attività** prima della scadenza del periodo. Questo **collide** con il ciclo di vita del
tenant (`trial → attivo → sospeso → scaduto → blacklist`): `scaduto` e `blacklist` **non possono**
significare documenti cancellati o inaccessibili. Fuori perimetro, ma **da mettere in programma** (§15).

---

## §10 L'avviso al medico

| Situazione | Natura | Fondamento |
|---|---|---|
| La correzione mira a **prevenire o ridurre il rischio di un incidente grave** | 🔴 **OBBLIGO.** È un'azione correttiva di sicurezza (FSCA): l'avviso al medico **è** l'avviso di sicurezza, atto giuridicamente nominato, e l'autorità va informata **prima** di agire | Art. 2(68)/(69) · Art. 87(1)(b) e (8) |
| Il dispositivo presenta un **rischio grave** | 🔴 **OBBLIGO verso le autorità** («*immediately*»), e l'avviso al medico è **strumentale** al ritiro | Art. 10(12) |
| Tutti gli altri casi | 🟢 **CORTESIA**, e la sceglie Francesco | Nessun dovere autonomo nominato. Nella fornitura diretta laboratorio→dentista **non c'è distributore**, e l'Art. 10(12) nomina gli operatori economici, non gli operatori sanitari |

**Asimmetria utile:** il medico ha un dovere di legge verso il laboratorio (D.Lgs 137/2022 art. 10
c. 6); il contrario non è scritto simmetricamente.

**Base legale del registro:** il fabbricante, **su richiesta del Ministero, mette a disposizione
tempestivamente dati e informazioni relativi ai reclami**. È l'unica ragione di legge per cui il
laboratorio deve poter **esibire lo storico** — e giustifica `eventi_qualita` meglio di qualunque
argomento di comodità.

**Il canale esiste già** (`src/lib/consegna/whatsapp-template.ts`): si collega, non si costruisce.

---

## §11 Perimetro (D264)

**DENTRO — casi 1, 2, 3, 5:**

| Caso | Perché dentro | Che cosa produce |
|---|---|---|
| **1 — dato sbagliato sul documento** | È l'unico che il sistema oggi **non sa esprimere affatto**, e la macchina di riemissione esiste già: massimo valore, minimo cantiere. È il caso di D262 | NC documentale + riemissione (§8). Reclamo **solo** se qualcuno ha segnalato. ⚠️ Se il dato errato ha **rilievo clinico** (materiale o lega su paziente allergico) è un candidato **incidente**: passa dai tre test come tutti |
| **2 — difetto visto dopo la consegna, prima dell'applicazione** | È il caso che il panel ha **ribaltato**: se la segnalazione arriva da fuori è un **reclamo**, non rilavorazione interna | NC §8.3.3 + **registrazione di rilavorazione §8.3.4 + ri-verifica** — non «niente da registrare» |
| **3 — difetto segnalato dal medico o dal paziente** | È la ragione per cui l'ondata esiste: l'unico con conseguenze di legge dirette | Tre test → reclamo o incidente → eventualmente MIR Art. 87 con i suoi termini |
| **5 — richiesta clinica nuova** | **Entra come uscita, non come correzione.** Dal banco è indistinguibile dal caso 2 (il pezzo torna, si rilavora, riparte): senza una voce propria finisce nel conto delle non conformità e lo falsa dal primo giorno | **Nessuna registrazione di qualità.** Rimanda al meccanismo divergenza esistente; è una prescrizione nuova o modificata → **nuova dichiarazione** |

**FUORI — e non spariscono:**

- **caso 4 (destinatario sbagliato)** — «identità» è testualmente nella definizione di reclamo, e il
  caso può arrivare fino all'azione correttiva di sicurezza se il disguido rivela un difetto sistemico
  di identificazione. Tocca la tracciabilità e **ha un asse privacy** (dato sanitario a un destinatario
  errato) che **non è stato istruito**: merita la sua ondata, non un angolo di questa;
- **caso 6 (prezzo/quantità)** — territorio nota di credito. ⚠️ Con un'eccezione da ricordare quando
  si aprirà: se è sbagliato il **numero di pezzi fisicamente consegnati**, allora c'è **anche** una NC
  di consegna;
- **caso 7 (reso senza difetto)** — logistica, **ma non a costo zero**: serve una registrazione di
  reso e disposizione, e un dispositivo su misura è «*intended for the sole use of a particular
  patient*» (Art. 2(3)), quindi non può andare a nessun altro.

---

## §12 Censimento dei file e degli oggetti (R-P2, R-P6)

**L'elenco non lo decide l'autore: lo decide il censimento.**

⚠️ **Statuto di questo elenco, per non spacciarlo per più di quel che è.** Il censimento è del **terzo
advisor**, che dichiara di averlo verificato sul repo. Chi scrive questa spec ha verificato **di
persona** soltanto: `orchestrate.ts:265-312`, `annulla-consegna/route.ts:120,146-149`,
`rifacimento/route.ts:8-18`, `RifacimentoButton.tsx:49-51`, `AnnullaConsegnaBanner.tsx:33`,
`generate-ddc.ts` (esistenza del ritorno anticipato), le due definizioni di `incidenti_mdr`, le colonne
di `dichiarazioni_conformita` e `lavori_rifacimenti` dai tipi generati, `transizioni.ts`, e l'assenza
del vocabolario morto in `src/`, `supabase/`, `tests/`, `scripts/`. **Tutto il resto è riferito.**
➡️ Per R-P2 **ogni riga di questa tabella va riaperta all'esecuzione**, e un riferimento che non
corrisponde **è esso stesso un ritrovamento**, non un errore di battitura da sistemare in silenzio.

🛑 **Istruzione che vale per tutto il censimento:** `annulla_consegna_atomica` è ridefinita in **quattro**
migration; l'ultima è `20260710180000:64-131`. Ma per la lezione già pagata a `20260728103000:41-50`
(il file `007` risulta applicato e **diverge** dalla funzione viva), **decide `pg_get_functiondef`, non
il file.**

| Oggetto | Perché è in elenco |
|---|---|
| `supabase/migrations/20260710180000_…:64-131` | ultima definizione di `annulla_consegna_atomica` — **verificare col catalogo** |
| `supabase/migrations/005_v1_foundation.sql:75-86` | `lavoro_nuovo_id NOT NULL` + i CHECK autoritativi su `motivo` / `rilevato_in` |
| `supabase/migrations/006_…:96-102` | `rifacimento_no_self_ref`, `rifacimento_nuovo_unique` — vincolano la forma del §4 |
| `supabase/migrations/20260710090000_…:14-17` | `ddc_lavoro_attiva_unique` — governa l'ordine annulla→riemetti |
| `supabase/migrations/20260804154232_…:9` | precedente della sola-aggiunta imposta dal database |
| `src/lib/consegna/costanti.ts:6` | `FINESTRA_ANNULLO_MS` — **sparisce** |
| `src/components/features/lavori/consegna-v3/FrameConsegnato.tsx:32` | ⚠️ **letterale nudo `10*60*1000`, non importato**: una copia che una ricerca sul nome della costante **non trova** |
| `src/components/features/lavori/AnnullaConsegnaBanner.tsx:33` | il conto alla rovescia — **sparisce** |
| `src/app/api/lavori/[id]/annulla-consegna/route.ts:120,146-149` | passaggio della finestra ed esito `finestra_scaduta` |
| `src/app/api/lavori/[id]/rifacimento/route.ts:8-18,157-173` | copia API dei due vocabolari |
| `src/components/features/lavori/RifacimentoButton.tsx:7-15,51` | terza copia dei motivi, **e la riga che non spedisce `rilevato_in`** (§13) |
| `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx:217,462,573` | elenco stati · riga bloccata (D261) · innesto del banner |
| `src/app/api/qualita/incidenti/route.ts:9` | copia API del CHECK di `incidenti_mdr.tipo` |
| `src/app/api/qualita/psur/route.ts:143-170,188-191` | i tre aggregati e `totale_reclami: 0` (§15) |
| `src/lib/pdf/generate-ddc.ts:100-104` | il ritorno silenzioso della dichiarazione vecchia |
| `src/lib/domain/prescrizione-costanti.ts:53-58` | `richiesta_dentista` — il caso 5 già modellato |
| `src/lib/lavori/transizioni.ts:8-16` | `consegnato` non ha uscite: va aperta quella dell'esito |
| `src/lib/consegna/whatsapp-template.ts` | canale d'avviso al medico, da collegare |
| `src/types/database.types.ts` | rigenerazione obbligatoria (firma RPC + tabelle nuove) |
| `tests/unit/consegna-costanti.test.ts:11-12` | **asserisce che la finestra sia 10 minuti**: serve una destinazione dichiarata, non una cancellazione muta |
| `tests/unit/annulla-consegna-route.test.ts:83,88` · `tests/unit/rifacimento-route.test.ts:229-234,498-509` · `tests/…/flusso-consegna.test.tsx:269` | prove che fissano finestra e vocabolari |

---

## §13 Gli errori da non fare — in ordine di costo

1. 🔴 **Riemettere la dichiarazione senza annullare prima.** Fallisce **verso l'aperto**: l'utente
   legge «riemessa» e ha in mano il documento vecchio (§8.1). Su un documento a valore legale è il
   modo peggiore di sbagliare.
2. 🔴 **Assegnare «reclamo» prima di aver escluso l'incidente.** Nasconde l'obbligo di trend reporting
   dell'Art. 88 (§3). È il difetto che quest'ondata esiste per prevenire, e sarebbe entrato dalla porta
   principale se avessimo adottato la derivazione del secondo advisor senza confrontarla col flowchart
   ministeriale.
3. 🔴 **Scrivere in `incidenti_mdr` un valore che il CHECK rifiuta.** **È già successo:**
   `007_rpc_rifacimento.sql:84-95` inseriva `tipo='non_conformita'`, valore **assente** dal vincolo. La
   funzione viva non lo fa più, ma con `incidenti_mdr` a **0 righe** nessuna prova sui dati lo
   smaschererebbe. Serve una prova che passi **un valore che DEVE essere rifiutato** (R-P1).
4. 🟡 **Estendere `lavori_rifacimenti`** invece di creare `eventi_qualita`: si smonta un'invariante
   sana per farci entrare un caso che non le appartiene (§4).
5. 🟡 **Rendere il declassamento fluido quanto la registrazione** (§9).
6. 🟡 **Un `applicato` a due valori obbligatorio**: costringerebbe a dichiarare il falso su un campo
   che alimenta un obbligo di legge. `non_noto` è ammesso (§5).

---

## §14 I vuoti dichiarati — «non verificato», e non si tira a indovinare

1. **EUR-Lex ha respinto gli accessi** (403/202, anti-bot) da due dei tre advisor. Il testo di articoli
   e allegati proviene da **due riproduzioni indipendenti in due lingue**, concordi clausola per
   clausola. I documenti MDCG e la circolare ministeriale sono **originali**. ➡️ **Diff contro il PDF
   della GUUE prima di considerare chiusa la parte normativa.**
2. **ISO 13485:2016 è a pagamento** e non è stato consultato in originale. §3.4 regge su **due
   riproduzioni ufficiali** (§2). §8.2.2, §8.3.1-8.3.4, §8.5.2, §4.2.4, §4.2.5 poggiano su almeno due
   fonti secondarie indipendenti concordi: **da riscontrare su copia acquistata** prima del piano.
   Una copia integrale circola in rete e **non è stata usata**: non è una fonte su cui costruire un
   argomento di conformità.
3. **Se il laboratorio sia certificato ISO 13485** — Francesco: «non lo so» (06/08). ➡️ **Si progetta
   come se lo fosse.** Da accertare: cambia il tono di metà del documento.
4. **La classe di rischio dei manufatti** (Annex VIII, caso per caso) decide se il rapporto periodico
   sia dovuto ex Art. 85 o Art. 86. **Non verificato.**
5. **Quali manufatti odontotecnici siano «impiantabili»** ex Art. 2(5) → **10 o 15 anni** di
   conservazione. **Non verificato**, e valgono cinque anni di differenza.
6. **Se un manufatto in prova restituito al laboratorio sia «made available»** (Art. 2(27)): nessuna
   fonte, **in nessuna delle due direzioni**. Non incide sul manufatto finito consegnato per la
   cementazione.
7. **Chi sia il «final user»** (Art. 2(29)) per una protesi dentaria — odontoiatra o paziente.
   **Non verificato.**
8. **Data di attivazione del modulo vigilanza di EUDAMED** e conferma di modulo MIR + PEC su fonte
   ministeriale diretta (salute.gov.it è dietro cookie-wall). **Non verificato.**
9. **La sanzione per gli obblighi di vigilanza** (D.Lgs 137/2022): il progetto cita l'art. 27 c. 13
   per la **registrazione**; quella per la vigilanza è un comma diverso e **non è stata verificata**.
10. **Se il laboratorio registri la consegna nell'app prima o dopo l'uscita fisica del manufatto**
    (§2, P3). È una domanda di prassi per Francesco. **Non verificato.**
11. **Tensione osservata e non risolta:** il diagramma ministeriale si apre con «*si è verificato un
    evento connesso all'**uso** di un dispositivo*», mentre i suoi stessi esempi di reclamo sono
    «prima dell'uso». Segnalata, non sciolta.

---

## §15 Ritrovamenti fuori mandato — riferiti, non toccati (R-E2)

Nessuno di questi appartiene a quest'ondata. Sono elencati perché **un difetto visto e non scritto è
un difetto perso**.

1. 🛑 **La riga su EUDAMED in `CLAUDE.md` §5 è sbagliata.** Dice «lab custom-made = **ESENTI**». MDCG
   2021-13 rev.1 Q2 esenta **solo** dalla registrazione come attore **prima dell'immissione sul
   mercato**; Q3 impone la registrazione quando si trasmette per la prima volta una segnalazione di
   incidente grave o di azione correttiva di sicurezza, **per dispositivi su misura di qualunque
   classe**. ➡️ **L'esenzione finisce esattamente nello scenario per cui quest'ondata esiste.** È
   un'istruzione permanente che insegna una falsità nel momento in cui costa di più: **la corregge
   Francesco**, non io.
2. 🛑 **`totale_reclami: 0` nel rapporto periodico** (`src/app/api/qualita/psur/route.ts:190`, commento
   «non ancora implementato»). Il rapporto è **dovuto per legge** e dichiara zero reclami **per
   costruzione** — lo dirà anche il giorno in cui i reclami ci saranno. Quest'ondata gli darebbe
   finalmente una fonte vera. **Va messo in programma con priorità**: un documento di sistema qualità
   che afferma un numero falso è peggio di un documento mancante.
3. 🟠 **`rilevato_in` non viene mai spedito dall'interfaccia.** `RifacimentoButton.tsx:51` invia
   `{motivo, note}`: ogni rifacimento nato dalla PWA ha `rilevato_in = NULL`. Il campo non è un secchio
   troppo pieno — **è spento**.
4. 🟠 **La divergenza del file `007`**, dichiarata il 28/07 (`20260728103000:41-50`), è **ancora
   aperta**: un file registrato come applicato che non corrisponde alla funzione viva.
5. 🟠 **`20260514_mdr_qualita.sql` è lettera morta.** Ridefinisce `incidenti_mdr` con colonne e
   vocabolario diversi (`malfunzionamento`, `evento_avverso`, `near_miss`, `reclamo`) sotto un
   `CREATE TABLE IF NOT EXISTS`: **no-op silenzioso**. `provato:` nessun uso di quel vocabolario in
   `src/`, `supabase/`, `tests/`, `scripts/` — **nessun difetto vivo**, ma chi la legge crede che
   esista un tipo `reclamo` che **non esiste da nessuna parte**.
6. 🟠 **`RifacimentoButton.tsx:5` importa i token v2.3** ma è montato dentro `SchedaLavoroV3` (:709),
   superficie **v3**: il DS §14 vieta di mischiare i due sistemi nella stessa pagina. Si aggiunge alla
   migrazione già nota di `/lavori/[id]/modifica`.
7. 🟠 **La conservazione sopravvive alla chiusura del laboratorio** (§9): collide con `scaduto` e
   `blacklist` del ciclo di vita del tenant.
8. 🟠 **Il nome «DdC» in tutta la codebase** (§8.4): rinomina da fare, ondata a sé.

---

## §16 Che cosa succede dopo questa spec

1. **Revisione di Francesco** su questo documento — è il cancello che chiude il brainstorming.
2. **Piano di esecuzione** (skill `writing-plans`) coi tre registri, un compito per volta a un
   esecutore fresco (R-E1).
3. **Approvazione visiva obbligatoria** prima di qualunque codice di interfaccia: mockup HTML in
   `docs/design/mockups/`, screenshot, assenso di Francesco. Riguarda «Devo intervenire», il foglio del
   motivo, e **il testo della riga bloccata rimandato da D261** — che ora ha la sua risposta: non «non
   si cambia più», ma **come si rientra**.

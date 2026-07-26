# Le parole di categoria — la verifica sul campo

**Data:** 26/07/2026
**Cosa è:** la ricerca che avevi chiesto per controllare se la lista di parole scritta a intuito
regge davanti ai nomi veri degli studi dentistici italiani.
**Cosa NON è:** una modifica. Qui non è stata toccata nemmeno una riga di codice né di test.
Questo documento è una proposta da leggere e correggere.
**Dove vive la lista:** `PAROLE_CATEGORIA_STUDIO` in `src/lib/domain/nome-studio.ts`.
**Verbale di riferimento:** `docs/design/decisions/2026-07-26-nomi-lunghi-variante6.md`.

---

## 0. La cosa più importante, in dieci righe

Ho raccolto **1.604 nomi veri e distinti** di studi dentistici italiani, da elenchi ufficiali e
directory di tutta Italia (Nord, Centro, Sud e Isole), più i **38 nomi veri che hai già in banca
dati**.

**La lista di parole è buona.** Delle parole che compaiono davvero all'inizio dei nomi lunghi,
il 61% è già in lista, e le prime cinque per frequenza ci sono tutte. Nessuna parola in lista si
è rivelata sbagliata o pericolosa. Le correzioni che propongo sono due parole, non due righe di
ripensamento.

**Ma ho trovato un difetto vero, e non è nella lista: è nella guardia.** Su sei nomi veri, la
cassetta oggi finirebbe per scrivere **«SRL UNIPERSONALE»**, **«STP S.R.L.»** o **«S.A.S. DI
GIUSEPPE SANNINO»** al posto del nome dello studio. Il controllo delle quattro lettere che
dovrebbe impedirlo non scatta, perché conta le lettere di tutto quello che resta e «SRL
UNIPERSONALE» ne ha sedici. La guardia è tarata sul numero giusto ma guarda nel posto sbagliato:
dovrebbe guardare la **prima parola** di quel che resta, non la lunghezza totale.

Questo è il punto §5.1. È l'unica cosa di questa ricerca che, secondo me, va sistemata prima di
andare in produzione — e a differenza della lista di parole **non è una riga di elenco, è una
modifica al codice**, quindi va ratificata da te e vuole prove nuove.

---

## 1. Metodo e fonti

### 1.1 Le fonti, una per una

| Fonte | Cosa è | Nomi usati | Accessibile? |
|---|---|---|---|
| [Lista centri odontoiatrici convenzionati American Express](https://icm.aexp-static.com/Internet/insurance/it-IT/products/PDFs/FILE-B-Lista-Centri-Odontoiatrici-Convenzionati.pdf) (giugno 2019) | elenco nazionale, 53 pagine, con la colonna «CLINICA/RAGIONE SOCIALE» | **1.057** | sì — estratto pagina per pagina, 1.357 righe lette |
| PagineGialle + MioDottore, 11 città del Nord | insegne come le scrive lo studio | **116** | sì, tranne una pagina |
| [EMAPI](https://www.emapi.it/wp-content/uploads/2020/10/REALE_Centri_Odontoiatrici_2.pdf) + [AXA](https://www.axa.it) + [Regione Umbria](https://www.regione.umbria.it) + odontino.it, Centro Italia | elenchi di convenzione e registro di accreditamento | **184** (su 544 estratti) | sì, tutte |
| Catene (DentalPro, Caredent, Primo), albi delle società tra professionisti di Roma e Monza, registro delle strutture accreditate di Trento e del Friuli, siti di studi con nome inglese | ragioni sociali formali e marchi | **128** | sì, con 8 eccezioni (§6.1) |
| Elenchi ASL delle strutture accreditate di **Napoli 1, Napoli 2 Nord, Caserta, Salerno**, open data della **Puglia**, ATS **Sardegna** | ragioni sociali del Sud e delle Isole — la parte del Paese dove sta il tuo laboratorio | **85** (di cui **22 campane**) | sì, la Sicilia no (§6.1) |
| **La tua banca dati di prova** (tabella `clienti`, colonna `studio_nome`) | i nomi che i tuoi laboratori hanno scritto davvero | **38** | sì, letta in sola lettura |
| | | **1.604 distinti** | |

Della banca dati: 18 nomi sono del laboratorio «Filippo Opromolla», 19 di «Lab Pepe», 1 della
fixture di collaudo. Non ho scritto niente sul database: solo letture.

### 1.2 Il conto che conta davvero

Le parole di categoria si toccano **solo** quando un nome non entra in due righe nemmeno a 9
punti. Su tutti gli altri nomi la lista non fa niente. Quindi una parola che compare in
quaranta nomi corti è irrilevante, e una che compare in tre nomi lunghi è decisiva.

Per separare i due gruppi ho usato **la lunghezza in caratteri come indizio**, tarato sulle due
misure vere che stanno già nel verbale (parete a 390px, colonna del nome 71,33px):
`STUDI MEDICI DI SANTI GIUSEPPE` = **30 caratteri, ci sta** a 9 punti; `CENTRO ODONTOIATRICO
SANTA MARIA` = **32 caratteri, non ci sta**. Ho quindi messo la linea a **31 caratteri**.

> **È un indizio, non una misura.** Un nome di 31 caratteri fatto di parole corte può entrare, e
> un nome di 25 caratteri con una parola lunghissima attaccata può non entrare nemmeno da solo
> (è il punto 4 della regola). Le percentuali qui sotto vanno lette con questa tolleranza: non
> ho rimisurato in browser, e lo dichiaro.

Dei 1.604 nomi, **600 stanno sopra i 31 caratteri**. È su quei 600 che tutto il resto ragiona.

---

## 2. Chi c'è in testa ai nomi — i numeri

### 2.1 La prima parola dei 600 nomi lunghi

| Prima parola | Quante volte | Su 600 | Già in lista? |
|---|---:|---:|---|
| studio | 224 | 37,3% | ✅ |
| centro | 94 | 15,7% | ✅ |
| **dental** | **23** | **3,8%** | ❌ — e §5.2 spiega perché deve restare fuori |
| ambulatorio | 19 | 3,2% | ✅ |
| poliambulatorio | 13 | 2,2% | ✅ |
| **dentista** | **6** | **1,0%** | ❌ — la propongo |
| studi | 5 | 0,8% | ✅ |
| cliniche | 4 | 0,7% | ✅ |
| dott. / dr. | 4 | 0,7% | ❌ — esclusione voluta, regge (§3.4) |
| servizi | 2 | 0,3% | ❌ — sono «Servizi di odontoiatria…» |
| st. / ctr. (abbreviato) | 2 | 0,3% | ❌ — §5.5 |
| odontoiatria | 2 | 0,3% | ✅ |
| tutti i cognomi e i marchi | il resto | ~33% | — |

**Il 61% dei nomi lunghi (366 su 600) comincia con una parola che è già in lista.** Questo è il
voto di fiducia principale: la lista scritta a intuito ha preso le parole giuste.

### 2.2 La seconda parola (quella che si toglie subito dopo)

| Seconda parola | Quante volte | Già in lista? |
|---|---:|---|
| dentistico | 114 | ✅ |
| odontoiatrico | 97 | ✅ |
| dott. / dr. / d.ssa | 50 | ❌ (voluto) |
| medico | 28 | ✅ |
| associato | 18 | ✅ |
| s.a.s. / s.r.l. / s.n.c. | 21 | ❌ — è la §5.1 |
| dentale | 12 | ✅ |
| dental | 11 | ❌ (§5.2) |

Le coppie più frequenti in testa ai nomi lunghi sono: **studio dentistico**, **studio
odontoiatrico**, **studio medico**, **studio associato**, **centro odontoiatrico**, **centro
dentale**, **centro dentistico**. Tutte già coperte.

### 2.3 La cosa che dipende dalla regione — e che ti riguarda

Non tutti gli elenchi scrivono i nomi allo stesso modo, e questo cambia tutto:

| Fonte | Nomi lunghi | Accorciati dalla lista di oggi | Nomi col generico **non** in testa |
|---|---:|---:|---:|
| Catene, albi società, registri di accreditamento del Nord | 81 | **83%** | 9% |
| **Sud e Isole (ASL Napoli/Caserta/Salerno, Puglia, Sardegna)** | 61 | **80%** | **8%** |
| Elenco nazionale delle convenzioni (ragioni sociali) | 252 | **62%** | 10% |
| Directory del Nord (insegne) | 69 | **62%** | 26% |
| Elenco convenzioni Centro Italia | 129 | **36%** | 59% |
| **La tua banca dati** | 8 | **38%** | **0%** |

L'elenco del Centro Italia scrive quasi tutto al rovescio: `BIONDI DOTT. RUGGERO STUDIO
ODONTOIATRICO`, cioè prima il cognome e la categoria in fondo. Su quei nomi la regola non può
fare nulla, per costruzione — è il caso peggiore, ed è utile averlo misurato.

**Ma è un modo di compilare tabulati, non il modo in cui scrivono i tuoi clienti.** Due prove:

1. Nei tuoi 38 nomi veri la parola di categoria sta **sempre in testa** quando c'è
   (`STUDIO ODONTOIATRICO SCIENGA FRANCO`), mai in fondo: **zero casi su otto** nomi lunghi.
2. Negli elenchi ufficiali di **Sud e Isole** — cioè la parte d'Italia dove sta il tuo
   laboratorio, e dove i tuoi 38 nomi provengono — la categoria sta in testa nell'**80%** dei
   nomi lunghi, il secondo risultato migliore di tutte le fonti. Il modo di scrivere del Centro
   Italia è di quella singola compagnia, non del Paese.

Quindi: **quanto la regola serve dipende da come i tuoi dentisti scrivono il proprio nome**, e
per come lo scrivono nel Sud la regola funziona 4 volte su 5. Se un domani ti arrivassero nomi
importati da un tabulato di convenzione stile Centro Italia, su quelli l'accorciamento non
farebbe niente e resterebbe la sfumatura di oggi — che è comunque il comportamento già in
produzione, non un peggioramento.

---

## 3. Verdetto parola per parola sulla lista di oggi

### 3.1 Le 25 parole che lavorano davvero — **tutte confermate**

Una misura sola, su tutti i 1.604 nomi: **quante volte quella parola viene effettivamente tolta
dalla testa di un nome**, in qualunque posizione della sequenza iniziale si trovi.

| Parola | Volte | | Parola | Volte |
|---|---:|---|---|---:|
| studio | 258 | | odontoiatrici | 5 |
| dentistico | 151 | | odontostomatologico | 5 |
| odontoiatrico | 147 | | specialistico | 5 |
| centro | 113 | | polispecialistico | 5 |
| associato | 67 | | cliniche | 4 |
| medico | 38 | | medici | 4 |
| ambulatorio | 20 | | centri | 3 |
| poliambulatorio | 14 | | dentistici | 3 |
| clinica | 11 | | associati | 3 |
| dentale | 11 | | dentali | 2 |
| studi | 7 | | medica | 1 |
| odontoiatrica | 6 | | specialistici | 1 |
| odontoiatria | 6 | | | |

Nessuna di queste ha prodotto, su 1.604 nomi, un caso in cui togliere la parola cancellasse
qualcosa che serviva a riconoscere lo studio. **Confermate tutte e 25.**

### 3.2 Le 24 parole che non si accendono mai — **da tenere comunque**

Queste, in 1.604 nomi reali, non sono mai state tolte da nessuno:

`ambulatori` · `poliambulatori` · `policlinico` · `policlinici` · `istituto` ·
`istituti` · `dentistica` · `dentistiche` · `odontoiatriche` · `odontostomatologica` ·
`odontostomatologici` · `odontostomatologiche` · `mediche` · `sanitario` · `sanitaria` ·
`sanitari` · `sanitarie` · `specialistica` · `specialistiche` ·
`polispecialistica` · `polispecialistici` · `polispecialistiche` · `associata` · `associate`

**Raccomandazione: lasciarle.** Sono la forma maschile/femminile/singolare/plurale di parole che
invece si accendono: costano zero (una parola che non compare non fa nulla) e coprono il caso
in cui il prossimo cliente scriva `CLINICA ODONTOIATRICA` invece di `CLINICO ODONTOIATRICO`.
Nel campione c'è già `ODONTOIATRICA GUIDONIA` — cioè la forma femminile in testa esiste
davvero — e `centri`, `specialistici`, `medica` si sono accese solo 3, 1 e 1 volta pur essendo
rarissime: la prova che le forme «inutili» a volte si svegliano. Togliere queste 24 parole non
farebbe guadagnare niente e potrebbe far perdere qualcosa.

Detto questo: **metà della lista è assicurazione, non lavoro.** È utile saperlo quando la
guardi e ti sembra lunga.

### 3.3 L'asimmetria `clinica`/`clinico` — **risolta: non è un problema**

Il verbale la segnalava come «da rivedere»: da `CENTRO CLINICO ROSSI` oggi resta `CLINICO ROSSI`.

Ho contato. Su 1.604 nomi veri:

| Parola | In testa | Da qualsiasi parte |
|---|---:|---:|
| clinica | 10 | 14 |
| cliniche | 4 | 8 |
| **clinico** | **0** | **1** |
| **clinici** | **0** | **0** |

`CENTRO CLINICO …` **non esiste** nel campione. L'unica volta che `clinico` compare in un nome
italiano vero è:

> `CCO CENTRO CLINICO ODONTOIATRICO STUDIO ASSOCIATO DR.M.PICCINATO E DR.C.PRALORAN`

e lì l'accorciamento si ferma comunque subito, perché il nome comincia con la sigla «CCO» che
non è una parola di categoria. Quindi l'asimmetria **non si accende nemmeno in quel caso**.

**Verdetto: l'asimmetria non costa niente. Puoi lasciarla così senza pensarci più.** Se ti
infastidisce come principio, aggiungere `clinico` e `clinici` è innocuo (non sono mai cognomi):
ma è cosmetica, non correzione.

### 3.4 I titoli (`dott.`, `dr.`, `prof.`) fuori dalla lista — **regge, con una nota**

L'esclusione tiene, ma la ragione vera è diversa da quella scritta nel verbale, e vale la pena
saperlo.

**Il fatto scomodo:** nella tua banca dati i titoli sono **la parola più frequente in testa ai
nomi**, non «studio». Su 38 nomi: `dott.` 6 volte, `dr.` 6, `prof.` 3, `dottoressa` 1 = **16 su
38, il 42%**. Contro 7 che cominciano con `studio`/`studi`. E per la stessa logica che ha messo
in lista «odontoiatrico» («su una parete di un laboratorio odontotecnico non distingue
nessuno»), «Dott.» distingue ancora meno: lo sono tutti.

**Perché l'esclusione regge comunque, tre ragioni misurate:**

1. **Guadagnano poco.** «Dr. » sono 4 caratteri, «DOTT. » sei. Sui tre soli nomi tuoi dove
   scatterebbe, due restano troppo lunghi anche dopo:
   | Nome | Oggi | Togliendo il titolo |
   |---|---:|---|
   | `Dr. Roberto Sisalli e D.ssa Laura Sisalli` | 41 car. | 37 car. — **ancora non entra** |
   | `DOTT. GUIDA AGOSTINO ODONTOIATRA` | 32 car. | 26 car. — entrerebbe |
   | `Prof. Dr. FRANCESCO M. FAZIO` | 28 car. | 18 car. — entra già oggi |
2. **Producono risultati storti.** `Prof. L. Dr. GUIDA` diventerebbe `L. Dr. GUIDA`: la sequenza
   si fermerebbe sull'iniziale «L.», che non è un titolo. Per farlo bene bisognerebbe togliere
   anche le iniziali sciolte — cioè un'altra regola, non una parola in più.
3. **In Italia, nazionalmente, sono rari in testa:** 43 su 1.604 = 2,7%. Il 42% della tua banca
   dati è un'abitudine di quei due laboratori, non della lingua.

**Verdetto: tenerli fuori.** Se un giorno cambiassi idea, va fatto assieme alla regola sulle
iniziali sciolte — e allora è codice, non lista.

### 3.5 La soglia delle 4 lettere — **il numero è giusto, il posto dove guarda è sbagliato**

Vedi §5.1: è il difetto principale di tutta la ricerca. In sintesi: 4 lettere sono la soglia
giusta, ma contate su **tutto** quello che resta invece che sulla **prima parola**, e per questo
non fermano «SRL UNIPERSONALE» (16 lettere).

### 3.6 Si toglie solo dalla testa — **confermato, ed è la scelta giusta**

Il campione dice che parole di categoria **in mezzo o in fondo esistono davvero**: su 600 nomi
lunghi, **132 (il 22%)** ne hanno una fuori dalla testa — dall'8% nel Sud fino al 59%
nell'elenco del Centro Italia. Esempi reali:

- `DOTT. GUIDA AGOSTINO ODONTOIATRA` ← la tua banca dati, categoria in fondo
- `Longo Studio Odontoiatrico Associato` ← Puglia, il caso più difficile: cognome primo
- `Revelli Dr. Ezio Dentista`, `Torta Dott. Ilaria Studio Dentistico`
- `MINGARDI DENTAL CENTER SRL`, `C.O.P. CENTRO ODONTOIATRICO PRATI S.R.L.`
- `STUDIO TOPPETTI ODONTOIATRI ASSOCIATI`, `Studio Partipilo S.r.l.`

**Ma toglierle sarebbe un disastro, non un miglioramento.** `MINGARDI DENTAL CENTER` diventerebbe
`MINGARDI SRL`; `Revelli Dr. Ezio Dentista` diventerebbe `Revelli Dr. Ezio` (che va bene) ma
`Ortodonzia Magni` diventerebbe `Magni`, e soprattutto il caso che chiude la questione:

> `Studio Dentistico Del Corso - DC Clinic`

Qui «Del Corso» **è il cognome**. Qualunque regola che frughi in mezzo al nome rischia di
amputare la parte che serve. **Togliere solo dalla testa, e solo di seguito, è la scelta
giusta: confermata.**

---

## 4. La lista PROPOSTA — pronta da incollare

Rispetto a oggi cambiano **due famiglie di parole**, tutte in aggiunta, nessuna in sottrazione.

```typescript
export const PAROLE_CATEGORIA_STUDIO: readonly string[] = [
  // — che tipo di luogo è —
  'studio', 'studi',
  'centro', 'centri',
  'ambulatorio', 'ambulatori',
  'poliambulatorio', 'poliambulatori',
  'clinica', 'cliniche',
  'policlinico', 'policlinici',
  'istituto', 'istituti',
  // — di che cosa si occupa —
  'dentistico', 'dentistica', 'dentistici', 'dentistiche',
  'dentale', 'dentali',
  'odontoiatrico', 'odontoiatrica', 'odontoiatrici', 'odontoiatriche',
  'odontoiatria',
  'odontostomatologico', 'odontostomatologica', 'odontostomatologici', 'odontostomatologiche',
  'stomatologico', 'stomatologica', 'stomatologici', 'stomatologiche',        // ← NUOVO
  'medico', 'medica', 'medici', 'mediche',
  'sanitario', 'sanitaria', 'sanitari', 'sanitarie',
  'specialistico', 'specialistica', 'specialistici', 'specialistiche',
  'polispecialistico', 'polispecialistica', 'polispecialistici', 'polispecialistiche',
  // — chi ci lavora —
  'dentista', 'dentisti',                                                     // ← NUOVO
  // — come è esercitato —
  'associato', 'associata', 'associati', 'associate',
]
```

### Perché queste due e non altre

| Aggiunta | Volte in testa | Perché è sicura | Cosa cambia su un nome vero |
|---|---:|---|---|
| `stomatologico` e famiglia | 3 | non è mai un cognome né un marchio; è lo stesso buco dell'asimmetria `clinico`, ma questo si accende davvero | `Centro Stomatologico Cenisio` → oggi «Stomatologico Cenisio», domani **«Cenisio»** |
| `dentista` / `dentisti` | 6 | non è mai un cognome; è la parola più generica che esista in questo campo | `Dentista Genova - CLINDENT` → oggi intero, domani **«Genova - CLINDENT»** |

**Effetto totale misurato:** 10 nomi su 1.604 cambiano esito, tutti in meglio o neutri, e il
numero di residui malfatti (§5.1 e §5.4) **non aumenta**: resta 9, esattamente come oggi. Anche
le collisioni restano identiche: 4 gruppi con la lista di oggi, 4 con quella proposta (§5.6).
**Sulla tua banca dati non cambia niente**: nessuno dei tuoi 38 nomi contiene queste
parole. È un'aggiunta di copertura per il futuro, non una correzione di un torto attuale.

> **Perché ho scartato una terza famiglia che avevo pronta.** Avevo messo anche
> `odontoprotesico`/-a/-i/-che. L'ho tolta dopo averla provata: compare **una volta sola** in
> 1.604 nomi, e in quell'unico caso peggiora invece di migliorare —
> `CENTRO ODONTOPROTESICO (S.R.L.) STUDIO DENTISTICO` passa da «ODONTOPROTESICO (S.R.L.) STUDIO
> DENTISTICO» a «(S.R.L.) STUDIO DENTISTICO», cioè crea un sesto caso del difetto §5.1 che
> ancora non è stato corretto. Aggiungerla adesso significherebbe introdurre una regressione
> nella finestra fra «incollo la lista» e «sistemo la guardia». **Questa aggiunta si può
> riconsiderare, ma solo DOPO la correzione del §5.1** — non prima.

### Cosa NON ho aggiunto, e perché

| Parola | Volte in testa | Perché resta fuori |
|---|---:|---|
| **`dental`** | **23** | è la parola generica non in lista più frequente in testa, e va lasciata fuori: v. §5.2 — 23 marchi reali si spaccherebbero |
| `center` / `centre` / `clinic` | rare, mai in testa | sempre dentro un marchio (`DC Clinic`, `Smile Center`, `Dental Implant Center`) |
| `smile` / `sorriso` | poche | sono marchi (`RESMILE`, `DR SMILE`, `IL GIUSTO SORRISO`, `Smile Gallery`) |
| `laboratorio` | 2 | e sono laboratori di analisi o odontotecnici, non studi |
| `odontoiatra` / `odontoiatri` | **0** in testa | compaiono solo in fondo, dove non si tocca |
| `clinico` / `clinici` | **0** | v. §3.3 — non si accendono mai |
| `st` / `std` / `ctr` / `amb` / `poliamb` (abbreviazioni) | 4 in tutto | v. §5.5 — rischio sigle, guadagno minimo |
| `di`, `del`, `della`, `dei`, `e` | 36 | v. §5.3 — sono quasi sempre cognomi |
| `il`, `la`, `le`, `lo` (articoli) | 13, di cui 5 cognomi | v. §5.3 — `LO GATTO`, `LO PRESTI`, `LA MARANGONI` sono cognomi |
| `dott`, `dr`, `prof` | 43 | v. §3.4 |

### I test: non se ne rompe nessuno

`tests/unit/nome-studio.test.ts` chiede tre cose alla lista, e la proposta le rispetta tutte:
contiene `studi`, `medici`, `centro`, `odontoiatrico`, `poliambulatorio` (riga 110) ✅ — non
contiene preposizioni né titoli (riga 115) ✅ — è tutta minuscola e senza accenti (riga 119) ✅.
Nessuna delle prove esistenti cambia esito.

---

## 5. I controesempi — la parte che vale il viaggio

### 5.1 🔴 Il difetto vero: la cassetta può scrivere «SRL UNIPERSONALE»

**Questo succede oggi, con la lista così com'è, su nomi veri. Non è un'ipotesi.**

| Nome vero a database | Cosa scriverebbe la cassetta oggi |
|---|---|
| `STUDI MEDICI ODONTOIATRICI SRL UNIPERSONALE` | **SRL UNIPERSONALE** |
| `CENTRO ODONTOIATRICO SPECIALISTICO S.R.L. UNIPERSONALE` | **S.R.L. UNIPERSONALE** |
| `CENTRO MEDICO ODONTOIATRICO STP S.R.L.` (Puglia) | **STP S.R.L.** |
| `CENTRO ODONTOIATRICO SAS DI GIANNINI AUGUSTO E C.` | **SAS DI GIANNINI AUGUSTO E C.** |
| `CENTRO DENTALE S.A.S. DI GIUSEPPE SANNINO & C.` | **S.A.S. DI GIUSEPPE SANNINO & C.** |
| `CENTRO DENTALE S.A.S. DI DE NICHILO GAETANO & C.` | **S.A.S. DI DE NICHILO GAETANO & C.** |

Nei primi tre il nome dello studio **scompare del tutto** e resta solo la sigla della società.
Il terzo viene dagli open data della Puglia, cioè da un registro pubblico ufficiale: non è un
caso di laboratorio, è come si chiama quella struttura.

**Perché la guardia non lo ferma.** La guardia dice: «quel che resta deve avere almeno 4
lettere, perché sotto le quattro restano solo le sigle tipo SRL». Giusto in principio. Ma conta
le lettere di **tutta** la parte che resta: «SRL UNIPERSONALE» ne ha 16, quindi passa liscia. La
guardia funziona solo quando la sigla è **l'ultima cosa** del nome (`Dental Center S.r.l.` →
«S.r.l.» = 3 lettere → bloccato, giusto), e smette di funzionare appena dopo la sigla c'è
qualcos'altro.

**La correzione, in parole:** guardare la **prima parola** di quel che resta, non la lunghezza
totale. Se la prima parola è una forma societaria (`srl`, `srls`, `sas`, `snc`, `spa`, `stp`,
`s.s.`, `società`, `unipersonale`, `uninominale`), qualcosa è andato storto e non si accorcia.

**Due modi di farlo, e la scelta è tua:**

| | Opzione A — **non accorciare** | Opzione B — **saltare anche la sigla e riprendere** |
|---|---|---|
| `CENTRO ODONTOIATRICO SAS DI GIANNINI AUGUSTO E C.` | resta intero, con la sfumatura | **DI GIANNINI AUGUSTO E C.** |
| `CENTRO DENTALE S.A.S. DI GIUSEPPE SANNINO & C.` | resta intero, con la sfumatura | **DI GIUSEPPE SANNINO & C.** |
| `CENTRO DENTALE S.A.S. DI DE NICHILO GAETANO & C.` | resta intero, con la sfumatura | **DI DE NICHILO GAETANO & C.** |
| `STUDI MEDICI ODONTOIATRICI SRL UNIPERSONALE` | resta intero, con la sfumatura | non resta niente → resta intero |
| `CENTRO ODONTOIATRICO SPECIALISTICO S.R.L. UNIPERSONALE` | resta intero, con la sfumatura | non resta niente → resta intero |
| `CENTRO MEDICO ODONTOIATRICO STP S.R.L.` | resta intero, con la sfumatura | non resta niente → resta intero |

**La mia raccomandazione: opzione B.** Su tre dei sei casi dà il nome giusto e corto; sugli
altri tre si comporta esattamente come l'opzione A. L'opzione A è più semplice e più coerente
con il principio già scritto («quando la guardia scatta non si perde nulla, si resta al
comportamento di oggi»), quindi se preferisci la strada prudente è difendibile — solo, su tre
nomi rinuncia a un risultato buono.

> **Attenzione, e per questo non l'ho fatto io:** questa non è una riga di elenco, è una
> modifica alla funzione `accorciaNomeStudio`. Va ratificata da te e va accompagnata da prove
> nuove in `tests/unit/nome-studio.test.ts` — almeno i sei nomi qui sopra.

### 5.2 🔴 «DENTAL» va lasciata fuori: 23 marchi reali si spaccherebbero

È la tentazione più forte di tutta la lista: `dental` è la parola generica non-in-lista più
frequente in testa ai nomi (23 volte su 600 nomi lunghi). E va lasciata fuori, perché **in
italiano «Dental» non è mai la categoria: è sempre la prima metà di un marchio.**

Cosa succederebbe, su nomi veri:

| Nome vero | Aggiungendo `dental` diventerebbe |
|---|---|
| `Dental Center s.r.l. uninominale` ← **è tuo, è nella tua banca dati** | **s.r.l. uninominale** 🔴 |
| `DENTAL DUE S.A.S. DI SUMMO DAVIDE & C.` | DUE S.A.S. DI SUMMO DAVIDE & C. |
| `DENTAL TIME S.N.C. DI SIMONAZZI LUCA E FIGINI MARCO` | TIME S.N.C. … |
| `DENTAL CAM S.A.S. DI ANDREA CAPELLI & C.` | CAM S.A.S. … |
| `Dental Riviera` | Riviera |
| `DENTAL SMILE S.R.L.S.` | SMILE S.R.L.S. |
| `DENTAL ACADEMY S.R.L.` | ACADEMY S.R.L. |
| `DENTAL CASSIOPEA S.R.L.` | CASSIOPEA S.R.L. |
| `DENTAL VICENZA S.R.L` | VICENZA S.R.L |
| `DENTAL FAMILY di Martinez Mesa dott.ssa Nubia` | (marchio registrato spezzato) |
| …e altri 13 uguali | |

Il primo della lista è nella **tua** banca dati e la conseguenza è la peggiore possibile: la
cassetta scriverebbe «s.r.l. uninominale».

**Verdetto: `dental` fuori. Definitivamente, e con la ragione scritta perché non torni la
tentazione.** Insieme a lei restano fuori `center`, `clinic`, `smile`, `dent`, `care`: sono i
mattoni con cui si costruiscono i marchi di questo settore, non le sue categorie.

Un ultimo dato per completezza: una quindicina di questi nomi con «Dental» in testa **superano
davvero i 31 caratteri** e quindi arriverebbero al passo 3 (il più lungo,
`DENTAL SERVICE-SERVIZI ODONTOIATRICI DI WASEWICZ & C. S.N.C.`, ne ha 60). Non è quindi vero che
aggiungere `dental` non farebbe niente: farebbe qualcosa, e quel qualcosa è **spaccare un
marchio**. Gli altri (`Top Dental Torino`, `SC Dental`, `Dental Riviera`) stanno sotto i 20
caratteri e il passo 3 non li raggiunge mai. In nessuno dei due gruppi c'è un guadagno.

### 5.3 🟡 Il «DI» che resta in testa: brutto, ma toglierlo è peggio

Su 370 accorciamenti nei nomi lunghi, **43 lasciano un residuo che comincia con una
preposizione** (il 12%):

- `STUDIO DENTISTICO DI MALCHIODI MASSIMILIANO` → **DI MALCHIODI MASSIMILIANO**
- `STUDIO ASSOCIATO DEI DOTT. CASSERO F. E FALIVENE G.` → **DEI DOTT. CASSERO F. E FALIVENE G.**
- `CENTRO DENTALE DEL DOTTOR FRANCESCO BORRELLI & C. S.A.S.` → **DEL DOTTOR FRANCESCO BORRELLI…**

Qui il «DI» è un genitivo avanzato dalla frase che abbiamo tagliato («lo studio **di**
Malchiodi»), e leggerlo da solo sulla cassetta è sgraziato. Verrebbe voglia di togliere anche
quello.

**Non si può, e questi due nomi veri lo dimostrano:**

| Nome vero | Se togliessimo anche la preposizione |
|---|---|
| `Studio Dentistico Di Gioia Martinetti` | **Gioia Martinetti** — «Di Gioia» è il cognome, amputato |
| `Studio Dentistico Del Corso - DC Clinic` | **Corso - DC Clinic** — «Del Corso» è il cognome, amputato |
| `STUDI MEDICI DI SANTI GIUSEPPE` ← **tuo** | **SANTI GIUSEPPE** — e il mockup che hai approvato dice «DI SANTI GIUSEPPE» |

Le due cose sono **indistinguibili da qualunque regola**: `STUDIO DENTISTICO DI SANTI GIUSEPPE`
può voler dire «lo studio di Giuseppe Santi» oppure «lo studio Di Santi Giuseppe», e non c'è
modo di sapere quale. Nel dubbio, la scelta già ratificata (tenere la preposizione) è quella
sicura: produce un risultato un po' goffo ma **mai sbagliato**, mentre l'altra a volte cancella
un cognome.

**Verdetto: confermata l'esclusione delle preposizioni.** Il costo è che su circa un
accorciamento su otto resta un «DI» in testa. Lo dichiariamo e lo accettiamo: è la lettura
un po' brutta contro il nome sbagliato, e vince la lettura brutta.

Nota a margine, e la proporzione dice tutto: nel campione i nomi che **cominciano** con una
particella o un articolo sono **49 su 1.604**, e **41 di quei 49 sono cognomi** (`DI SALVATORE`,
`LO FEUDO`, `LO GATTO`, `LO PRESTI`, `LA MARANGONI`, `DELLA GALA`, `DEL FRANCO`, `DI MURRO`,
`DI NARDO`, `DI DONATO`, `DE SANTIS`, `DE FILIPPIS`…). Solo 8 sono articoli veri
(`IL SORRISO`, `LE CLINICHE ODONTOIATRICHE`, `La Dental Clinic`, `i Mulini`, `il mulino…`).
Cinque su sei volte, quella parolina è un pezzo di cognome.

### 5.4 🟡 Un residuo può cominciare con un trattino

Tre nomi veri, e questo non era previsto da nessuno:

| Nome vero | Cosa resta oggi |
|---|---|
| `AMBULATORIO ODONTOIATRICO - CLINICA DEL SORRISO` (registro di Trento) | **- CLINICA DEL SORRISO** |
| `MEDICI & DENTISTI ASSOCIATI S.R.L.` | **& DENTISTI ASSOCIATI S.R.L.** |
| `STUDIO 2 V S.A.S. DI DOMENELLA SIMONE & C.` | **2 V S.A.S. DI DOMENELLA SIMONE & C.** |

Il motivo è tecnico e semplice: quando la funzione normalizza una parola butta via tutto ciò che
non è una lettera, quindi un trattino da solo diventa una parola vuota — che non è in lista, e la
sequenza si ferma lì lasciando il trattino in testa.

**Raccomandazione:** trattarlo insieme alla §5.1, nella stessa correzione — quando la prima
parola di quel che resta non contiene nemmeno una lettera, la si salta (o non si accorcia). È lo
stesso genere di sistemazione e conviene farla una volta sola. Anche questo è codice, non lista.

### 5.5 🟠 Le abbreviazioni: il tetto della regola

Il nome **più lungo di tutta la tua banca dati** è questo, e la lista non può farci niente:

> `St. Od.co Ass.to Dr. Guida Agostino Dr. Nunziata Christian` — **58 caratteri**

«St.» sta per Studio, «Od.co» per Odontoiatrico, «Ass.to» per Associato. Sono tre parole di
categoria in testa, scritte abbreviate, e la lista non le vede.

**Perché non le aggiungo:**

1. **Nazionalmente quasi non esistono.** Quattro ricerche indipendenti su fonti diverse hanno
   trovato in totale **quattro** abbreviazioni di categoria in testa su 1.604 nomi — lo 0,25%:
   `ST. DENTISTICO ASSOCIATO CECCHINI`, `POLIAMB. SPECIALISTICO CENTRO DENTISTICO SRL`,
   `Ctr Odontoiatria E Implantologia C.O.I. s.a.s.` (Caserta), più la tua. E sono quattro
   abbreviazioni **tutte diverse** (`St.`, `Poliamb.`, `Ctr`, `Od.co`): non c'è un modo standard
   da mettere in lista, ce n'è uno per scrivente. I registri ufficiali di Trento e del Friuli
   scrivono sempre `AMBULATORIO` per esteso.
2. **`st` è pericoloso.** La funzione confronta le parole dopo aver buttato la punteggiatura,
   quindi mettere `st` in lista significa tagliare anche una sigla `S.T.` in testa a un nome. Nel
   campione le sigle in testa abbondano (`C.O.P.`, `A.R.D.`, `M.S.D.`, `G.A.`, `RO.SA.`,
   `VI.EMME`, `Ge.La`, `GDA STP` che è tuo): tagliarne una vorrebbe dire cancellare il nome.
3. **E soprattutto: non basterebbe.** Anche togliendo tutte e tre le abbreviazioni, quel nome
   scende da 58 a **41 caratteri** — e 41 caratteri non entrano in due righe nemmeno a 9 punti.
   Resterebbe con la sfumatura comunque.

**Questo è il tetto onesto della regola: il nome che ne avrebbe più bisogno è anche quello che
non si può salvare.** Con quel nome la cassetta resta come oggi (punto 4: nome intero,
sfumatura), che non è un peggioramento — è solo il limite. Vale la pena saperlo prima di
aspettarsi che l'accorciamento risolva tutto.

C'è anche una variante più mite dello stesso problema: **l'abbreviazione in seconda posizione**,
che fa fermare la sequenza a metà del lavoro. Quattro casi veri:

| Nome vero | Cosa resta oggi |
|---|---|
| `CENTRO ODONTOSTOMAT. BAMONTE S.A.S DI ALESSANDRO VITI S.A.S.` (Napoli) | ODONTOSTOMAT. BAMONTE S.A.S… |
| `STUDIO ASS.TO ODONT.GORRIERI-PROIETTI` | ASS.TO ODONT.GORRIERI-PROIETTI |
| `Studio Ass.to di Odontoiatria d.ri Flavio e G.nni Nuzzo` | Ass.to di Odontoiatria d.ri… |
| `St. Od.co Ass.to Dr. Guida Agostino…` | (niente, si ferma subito) |

Anche qui la conclusione è la stessa: `assto` e `odontostomat` non sono mai cognomi e si
potrebbero aggiungere senza rischio, ma sono **quattro nomi su 1.604** e ogni abbreviazione è
scritta a modo suo. Non vale la lista. È il tipo di caso che si risolve scrivendo il nome per
esteso in anagrafica.

Se invece ti importa proprio di quel cliente, la strada giusta non è la lista: è **riscrivere il
nome per esteso in anagrafica** (`STUDIO ODONTOIATRICO ASSOCIATO DR. GUIDA…`), e allora la
regola lo prende e lo accorcia bene. Un tasto in più a te, zero rischio per tutti gli altri.

### 5.6 🟢 La paura delle collisioni: infondata

Il verbale dichiarava un costo: «più la lista è lunga, più due studi diversi rischiano di
diventare identici sulla parete (`STUDIO DENTISTICO ROSSI` e `CENTRO ODONTOIATRICO ROSSI` →
entrambi «ROSSI»)». Ho misurato.

- **Nei tuoi due laboratori: zero collisioni.** Con la lista di oggi e con quella proposta.
  «Filippo Opromolla» ha tre clienti che cominciano tutti con `STUDIO ODONTOIATRICO` e dopo
  l'accorciamento restano `SCIENGA FRANCO`, `PIEGARI GIANFRANCO`, `SICA FRANCESCO`:
  perfettamente distinti.
- **Su tutti i 1.604 nomi: quattro casi.** Identici con la lista di oggi e con quella proposta —
  l'aggiunta non ne crea nemmeno uno:

| I due nomi che collidono | Diventano |
|---|---|
| `CENTRO MEDICO LOMBARDO S.R.L.` + `CENTRO DENTISTICO LOMBARDO S.R.L.` | LOMBARDO S.R.L. |
| `Centri Dentistici Primo` + `Centri Medici Primo` | PRIMO |
| `Smile Center` + `STUDIO ASSOCIATO ODONTOIATRICO SMILE CENTER` | SMILE CENTER |
| `STUDI MEDICI DI SANTI GIUSEPPE` (tuo) + `DI SANTI GIUSEPPE` | DI SANTI GIUSEPPE |

**Ma nessuno dei quattro è un problema vero, e per tre ragioni diverse:**

1. **Le collisioni contano solo dentro la parete di uno stesso laboratorio**, non in tutta
   Italia. `LOMBARDO S.R.L.` sono due province diverse: non si incontreranno mai sulla stessa
   parete.
2. `Centri Dentistici Primo` e `Centri Medici Primo` sono **due marchi della stessa catena**
   (Caredent): che si leggano entrambi «PRIMO» è corretto, non sbagliato.
3. L'ultimo è la scoperta più bella di tutta la ricerca: `DI SANTI GIUSEPPE` **esiste davvero
   nell'elenco nazionale come entità registrata a sé**. Cioè, con ogni probabilità, è lo stesso
   dentista del tuo `STUDI MEDICI DI SANTI GIUSEPPE`, iscritto altrove col nome breve.
   L'accorciamento del mockup che hai approvato produce esattamente il nome con cui quel
   dentista è registrato in un elenco ufficiale indipendente. **È una conferma esterna della
   scelta.**

**Verdetto: il paragrafo «il costo che ci prendiamo» del verbale può essere ridimensionato — non
cancellato.** Il rischio esiste (4 gruppi su 1.604 = 0,25%), non si è materializzato in nessuno
dei tuoi due laboratori, non peggiora aggiungendo le due famiglie di parole, e in ogni caso si
corre solo sui nomi che non entrano nemmeno a 9 punti.

### 5.7 🟢 Casi ambigui che si risolvono da soli

- **`Centro Dentistico Primo`** — «Centro Dentistico» qui è un **marchio registrato** della
  catena Primo, non una categoria. Ma togliendolo resta «Primo a Putignano», che è comunque il
  nome giusto della sede. Non serve fare niente.
- **`Centri Dentistici Primo` → «Primo»** — cinque lettere, la guardia passa, e «Primo» è
  effettivamente come si chiama la catena. Va bene.
- **`ODONTOIATRICA GUIDONIA` → «GUIDONIA»** — aggettivo femminile in testa; la lista la prende
  già (è la ragione per cui vale la pena tenere le 24 forme «inutili» del §3.2).
- **`AMBULATORIO ODONTOIATRICO DI TRENTO` → «DI TRENTO»** — resta il genitivo, ma qui si legge
  benissimo perché è un toponimo. Nessun intervento.
- **`STUDIO ODONTOIATRICO` da solo (nella tua banca dati)** — sono solo parole di categoria: la
  guardia «non si svuota mai il nome» scatta correttamente e resta intero. Funziona.
- **`Iacobellis Tommaso`, `Losacco Rita`, `Roma Maurizio`, `Antonica Alessandra`** (Puglia) — sono
  studi il cui nome è solo un cognome e un nome, senza nessuna parola di categoria. La regola non
  li tocca e non deve toccarli: sono già corti e già identificanti. Vale la pena saperlo perché
  dice che una fetta dei nomi veri **non ha proprio niente da togliere**, e per quelli i due
  gradini di corpo (passo 2) sono l'unica cosa che lavora.

---

## 6. Cosa non sono riuscito a verificare

### 6.1 Fonti che non si sono aperte

| Fonte | Motivo |
|---|---|
| PagineGialle Bologna | HTTP 410 — pagina rimossa (Emilia-Romagna coperta via MioDottore) |
| Regione Marche, strutture accreditate (2 documenti) | certificato del sito non verificabile |
| Caredent, elenco cliniche | il dominio non risponde |
| Albo società tra professionisti di Torino | modulo di ricerca che non restituisce elenchi |
| Vitaldent Italia | il marchio non ha più un elenco centri (assorbito da DentalPro) |
| Ordine dei Medici di Roma, allegati 2026 | pagina esiste, allegati non pubblicati |
| Elenco strutture accreditate del Lazio (open data) | i collegamenti diretti ai file non erano ricavabili dalla pagina |
| Regione **Sicilia**, strutture accreditate | il server non risponde (timeout ripetuti) — **la Sicilia è l'unica regione grande completamente assente** |
| Regione Campania, elenco aggregato | HTTP 404 — la pagina non esiste più |
| ASL Benevento | reindirizzamento infinito |
| ASL Avellino | raggiunta, ma il suo unico allegato non contiene righe di odontoiatria |
| Calabria, Basilicata, Molise | non tentate (tempo) |

**Non ho compensato inventando nomi.** Dove una fonte non si apriva, ne ho cercata un'altra.

### 6.2 Limiti dichiarati dei dati

- **Non ho misurato niente in browser.** La linea dei 31 caratteri è tarata sulle due misure
  vere che stanno nel verbale, ma è un indizio. Se una singola parola dovesse decidersi su un
  caso al limite, quel caso va misurato nel mockup, non stimato.
- **Un pezzo dei nomi è passato attraverso un riassunto automatico** (le directory del Nord, del
  Centro e le catene): sono fedeli — i refusi delle fonti sono arrivati intatti, cosa che è una
  buona prova — ma non li ho confrontati carattere per carattere con l'HTML originale. L'elenco
  nazionale da 1.057 nomi, invece, l'ho estratto io direttamente dal documento, riga per riga.
- **Quando ho salvato i nomi ho semplificato alcuni accenti e simboli** per farli passare negli
  script: Arkè→Arke, Salò→Salo, Decò→Deco, Mirò→Miro, Nardò→Nardo, Società→Societa, il simbolo ®
  tolto, le virgolette interne a quattro nomi pugliesi tolte. Non cambia nessun conteggio
  (nessuna parola di categoria è coinvolta, e la funzione vera butta comunque via gli accenti),
  ma va detto.
- **L'elenco nazionale è del giugno 2019** ed è una lista di convenzioni assicurative: registra
  chi fattura, quindi i cognomi nudi sono sovrarappresentati rispetto a come uno studio si
  presenta su una targa. L'elenco di Napoli 1 è del 2015 e quello della Sardegna del 2017.
- **Il Sud c'è, ma è il Sud degli studi convenzionati con la ASL.** Gli 85 nomi vengono da
  elenchi di strutture accreditate: in Italia l'odontoiatria è quasi tutta privata, quindi la
  maggior parte degli studi non compare in questi registri. I nomi sono veri e le forme sono
  rappresentative, ma **non è un censimento**. In più: l'elenco di Salerno non ha la colonna
  della specialità, quindi ci si è dovuti affidare a una ricerca per parola chiave — e proprio
  quel campione dimostra che il filtro perde pezzi (`VALDENT`, `EMMECI`, `S. APOLLONIA`,
  `PANACEA` non contengono nessuna parola dentale e sono emersi solo dove la colonna c'era).
- **La Sicilia manca del tutto**, e con lei Calabria, Basilicata e Molise. La Campania è coperta
  con 22 nomi, che sono pochi in assoluto ma sono quelli giusti: la conferma vera arriva dai 38
  nomi della tua banca dati, che sono campani e scritti da odontotecnici, non da assicuratori.
- **Non ho verificato quanti clienti veri, in futuro, arriveranno da un tabulato di convenzione**
  invece che scritti a mano. È la variabile che decide se la regola serve all'80% dei nomi lunghi
  o al 36% (§2.3), e non si può sapere dai dati di oggi.

---

## 7. Riassunto operativo

**Cosa puoi decidere tu, da solo, cambiando una riga di elenco:**

1. ✅ **Confermare la lista di oggi** — 25 parole lavorano, 24 sono assicurazione, nessuna è
   sbagliata.
2. ✅ **Aggiungere due famiglie**: `stomatologico`/-a/-i/-che e `dentista`/`dentisti`. Il blocco
   pronto da incollare è al §4. Non rompe nessun test, non crea collisioni nuove.
3. ✅ **Lasciare `dental` fuori** — §5.2, 23 marchi reali dicono di sì.
4. ✅ **Lasciare i titoli fuori**, **le preposizioni fuori** e **gli articoli fuori** — §3.4 e
   §5.3: cinque volte su sei quella parolina è un pezzo di cognome.
5. ✅ **Non pensare più all'asimmetria `clinica`/`clinico`** — §3.3, non si accende mai.
6. ✅ **Ridimensionare (non cancellare) il paragrafo sulle collisioni** nel verbale — §5.6.

**Cosa invece va ratificato e implementato da qualcuno, perché è codice:**

7. 🔴 **La guardia sulla prima parola** (§5.1) — sei nomi veri dove oggi la cassetta
   scriverebbe «SRL UNIPERSONALE» o «STP S.R.L.». Serve la tua scelta fra opzione A e opzione B,
   e sei prove nuove nei test.
8. 🟡 **Il residuo che comincia con un trattino** (§5.4) — tre nomi veri, da sistemare nella
   stessa passata.
9. ⏸️ **Solo DOPO il punto 7**, si può riconsiderare `odontoprotesico` — v. il riquadro nel §4.

**Cosa va accettato come limite:**

9. 🟠 Un nome scritto tutto abbreviato (`St. Od.co Ass.to…`, 58 caratteri, il tuo cliente più
   lungo) **non si può salvare** con nessuna lista sicura, e nemmeno abbreviandolo entrerebbe.
   Resta al punto 4, come oggi. La via d'uscita, se serve, è riscrivere quel nome per esteso in
   anagrafica.

---

## 8. Note tecniche (per il repo)

- **Dove ho guardato:** `PAROLE_CATEGORIA_STUDIO`, `MIN_LETTERE_NOME_ACCORCIATO`,
  `accorciaNomeStudio`, `normalizzaParola`, `contaLettere` in `src/lib/domain/nome-studio.ts`;
  prove in `tests/unit/nome-studio.test.ts`.
- **Come ho letto la banca dati:** API REST di Supabase in sola lettura
  (`GET /rest/v1/clienti?select=studio_nome,…`) con le credenziali di `.env.local`. Nessuna
  scrittura. Il campo che finisce sulla cassetta è `clienti.studio_nome`, con ricaduta su
  `nome + cognome` quando è vuoto — v. `src/app/api/cassette/lavori-liberi/route.ts:115`. La
  ricaduta produce nomi di persona, che non hanno mai parole di categoria: è un'ulteriore
  ragione per cui la regola non si accende su tutta la parete.
- **Baseline della lista attuale:** ottenuta importando la funzione vera
  (`npx tsx -e "import { accorciaNomeStudio } …"`), non una copia.
- **Le varianti di lista** (aggiungere `dental`, aggiungere i titoli, `odontoprotesico`, la
  guardia nuova) sono state provate su una **copia in Python** della logica, in `scratchpad`, per
  non toccare il file di produzione nemmeno temporaneamente. La copia riproduce
  `normalizzaParola` (NFD, via i segni diacritici, via tutto ciò che non è `[a-z]`),
  `contaLettere` e la scansione della sequenza iniziale.
- **Fedeltà della copia: verificata, non assunta.** Ho fatto girare la funzione vera
  (`accorciaNomeStudio` importata da `src/lib/domain/nome-studio.ts` via `npx tsx`) e la copia
  Python sugli **stessi 1.604 nomi**, scritto i due esiti su file e confrontati riga per riga:
  **zero differenze**. Tutte le percentuali di questo documento reggono su quel confronto.
- **Estrazione del documento nazionale:** `pdfplumber` (`extract_tables`) e non
  `pdftotext -layout`, perché le colonne cambiano posizione da pagina a pagina e il taglio a
  larghezza fissa fondeva i record dei nomi che vanno a capo. 1.357 celle → 1.057 nomi distinti.
- **Non toccato:** nessun file di `src/`, nessun test, nessuna migration. `git status` mostra
  come unica aggiunta questo documento.

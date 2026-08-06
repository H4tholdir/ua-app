# Gate estetico L2 — le due superfici delle tinte (06/08/2026)

**Quando:** 6 agosto 2026, ore 08:14-08:31 (`provato:` `date`).
**Perché ora:** era **arretrato** dalla §0③ dell'handoff — la tavolozza era stata approvata **su mockup**
(D119) e **mai vista nel componente vero**. Aperto su richiesta esplicita di Francesco: «*sistemalo
adesso e apri il gate estetico*».
**Framework:** `docs/design/audit-ui-ux/README.md` (Livello 2) · checklist
`docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` (12 sezioni).
**Superfici:** ① la scheda `/lavori/[id]` · ② la pagina di modifica `/lavori/[id]/modifica`.
**Perimetro:** 390 · 768 · 1280 × chiaro · scuro.
**Banco:** `ua-prod-3020` (build di produzione), lavoro `2026/0008`, utenza `h4t@live.it`.

> 🔑 **Il lavoro di prova porta apposta «Glitter multicolore»**, il nome più lungo del catalogo: è il caso
> che sul mockup sfasava la riga ed è la ragione per cui esiste `grid-auto-rows`. Un gate fatto su
> «Rosso» non avrebbe provato niente.

---

## 1. I due difetti chiusi, con la misura prima e dopo

| # | Difetto | Prima | Dopo |
|---|---|---|---|
| **A** | **Un campo del modulo era IRRAGGIUNGIBILE.** Con l'avviso aperto la barra è alta **167px** e sta appesa a 72px dal fondo; il modulo non le riservava spazio. Scorrendo **fino in fondo** (227 su 227) l'ultimo campo — le **Note interne** — restava **sotto** la barra | `note_interne` 583→654, barra 606→772: **coperto** | ✅ `note_interne` finisce a **440**, barra a **606**: **nessun campo sotto la barra** |
| **B** | **Le righe premibili della scheda erano sotto la soglia dei 44px** della §8 — mezzo pixel, su **tutte e quattro**, «Modifica tinta» compresa. Invisibile a occhio, si vede solo misurando | **43,50px** | ✅ **44,00px**, tutte e quattro |

🔑 **Il difetto A è il motivo per cui questo gate valeva la pena**, e va detto con onestà: il collaudo
delle 07:56 aveva visto *un avviso che si sovrappone*, e la prima correzione (fondo pieno + riquadri nel
flusso della barra) aveva chiuso la **leggibilità** — i due testi non si mescolavano più. **Ma non la
copertura**: la barra è `sticky`, quindi galleggia comunque, e la misura fatta subito dopo l'ha
dimostrato invece di darlo per fatto. Senza rimisurare si sarebbe dichiarato chiuso un difetto che
lasciava un campo irraggiungibile.

🛑 **E la correzione di A non è un numero scritto a mano.** La barra cambia altezza da sola (tasto Salva
che compare, avviso, errore, entrambi): un `padding` fisso sarebbe giusto per una combinazione e
sbagliato per le altre — la stessa classe di difetto delle quote `72px`/`132px` appena tolte da lì. Si
misura la barra vera con un `ResizeObserver` e si riserva quello (`LavoroFormClient.tsx`).

---

## 2. La tavolozza: promossa, e il timore della §0③ non si è materializzato

`provato:` sonda sul DOM del banco, 390px — **18 caselle**, tutte:

| Misura | Esito |
|---|---|
| Altezza | **60px** per tutte e 18 — **un solo valore**, nessuna riga sfasata |
| Larghezza | 163,5px (2 colonne a 390) |
| Font | **Plus Jakarta Sans** su tutte |
| Nome accessibile | corretto su tutte (lette dall'albero di accessibilità, non dai pixel) |
| Touch target §8 | 60 × 163,5 — **ampiamente sopra** i 44 |

✅ **«Glitter multicolore» sta su una riga sola e non sfasa la griglia.** Era il timore dichiarato nella
§0③, ed è la voce per cui il gate era stato chiesto: **infondato, verificato**.
✅ **D253 si vede funzionare:** senza tinta la riga non sparisce — dice «Nessuna tinta» ed è premibile.
✅ **Dark = flat**, card leggermente più chiara del fondo, nessuna ombra sollevata (§5).

---

## 3. Le 12 sezioni, superficie per superficie

| § | Scheda `/lavori/[id]` | Pagina di modifica |
|---|---|---|
| 1 Layout & allineamento | ✅ | ✅ |
| 2 Proporzioni & spazio | ⚠️ a 1280 metà pagina resta vuota (v. §4-b) | ✅ |
| 3 Sovrapposizioni & z-index | ✅ | ✅ **dopo il fix A** (era ❌) |
| 4 Tipografia | ✅ solo Plus Jakarta Sans | ⚠️ **mista v3 + v2.3** (v. §4-a) |
| 5 Colore, contrasto, tema | ✅ 0 sotto soglia, chiaro e scuro | ⚠️ 39 testi a **4,38** contro 4,5 — tutti nell'odontogramma (v2.3) |
| 6 Motion | ✅ nessuna durata inline nel codice toccato | ✅ |
| 7 Suono & haptic | N/A (nessun evento nuovo) | N/A |
| 8 Touch target | ✅ **dopo il fix B** (era ❌ a 43,5) | ⚠️ «Adulto»/«Deciduo» a **30px** (odontogramma, v2.3) |
| 9 Stati | ✅ «CONSEGNA» disabilitato **col motivo scritto** sotto | ✅ avviso ≠ errore, e il salvataggio riuscito non si veste da errore |
| 10 Responsive | ✅ nessuno scorrimento orizzontale su 390/768/1280 | ✅ idem |
| 11 Accessibilità | ✅ nomi accessibili corretti; `role="status"` per l'avviso, `role="alert"` per l'errore | ✅ le 18 caselle hanno tutte il loro nome |
| 12 Copy | ✅ | ⚠️ «📦Pacchetto Consegna MDR»: emoji attaccata al testo |

---

## 4. I ⚠️ deferiti, **col motivo** — e nessuno è dentro la superficie dell'ondata

🛑 **R-E2:** quanto segue è stato **trovato dal gate e riferito**, non corretto di nascosto. Sono tutti
**fuori dalla superficie dell'ondata** (la tinta), e due di essi sono decisioni, non ritocchi.

**a) La pagina di modifica monta DUE design system insieme.** `provato:` 293 elementi ereditano **DM
Sans** dal `<body>` (v2.3), mentre la tavolozza nuova usa **Plus Jakarta Sans** (v3).
⚠️ **Non è un difetto da gate ed è importante non trattarlo come tale:** la regola di convivenza (DS v3
§14) dice che la migrazione è **per route, mai per componente**, e questa route **non è ancora stata
migrata**. Il DM Sans ereditato è quindi *atteso*. Ciò che il gate segnala è che la route è ormai
**mista** — ed è una **ondata di migrazione**, da decidere, non un ritocco da infilare qui.

**b) A 1280 la scheda lascia metà pagina vuota** (§2: «nessun vuoto sproporzionalmente eccessivo»). Vale
per la scheda intera, non per la tinta: è un ripensamento di layout desktop, non un fix di gate.

**c) L'odontogramma (v2.3):** 39 testi a **4,38** contro i 4,5 richiesti, e i due gettoni
«Adulto»/«Deciduo» a **30px** contro 44. Superficie legacy, fuori ondata.

**d) Barra laterale desktop:** le 5 voci a **43,3px**; «Tema» a **4,17** di contrasto.

**e) «📦Pacchetto Consegna MDR»**: manca lo spazio fra emoji e testo.

---

## 5. 🔴 Una correzione a me stesso, sullo strumento del gate

La prima versione della sonda ha dichiarato **«+ Nuovo lavoro» a 1,24 di contrasto** — un valore da
allarme rosso. **Era un falso positivo mio:** quel tasto è testo bianco su **gradiente rosso**, e la
sonda, non trovando un colore di fondo pieno, risaliva l'albero fino al pannello panna e confrontava
bianco su panna. Corretta: se incontra un gradiente lo dichiara **non misurabile** invece di inventare
un numero.
🔑 **Vale la pena scriverlo** perché un gate che riferisce rumore si smette di leggere — ed è il modo in
cui un controllo automatico diventa peggio di nessun controllo.

---

## 6. I file

| Cartella | Cosa |
|---|---|
| `gate-before/` | 6 scatti della scheda: 390 · 768 · 1280 × chiaro · scuro, **prima** dei fix |
| `gate-after/modifica-avviso-390-light.png` | La pagina di modifica con l'avviso aperto **dopo**: «PRIORITÀ» e «NOTE INTERNE» leggibili e raggiungibili |
| `d117-avviso-tinta-tolta-390-light.png` | Lo stesso momento **prima**: l'avviso stampato sopra «PRIORITÀ» |
| `scheda-foglietto-390-light.png` | Il foglietto della tinta sulla scheda (D247) |

# Spec — L'album delle foto sulla scheda del lavoro

**Data:** 30 luglio 2026 · **aggiornata la sera con le quattro varianti scelte (D76-D79)** ·
**Stato:** 🟡 **DA RATIFICARE** — ✅ **§0B soddisfatto**, §12 porta le quattro varianti approvate
**Decide:** Francesco Formicola · **Scrive:** coordinatore di sessione
**Nasce da:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **D57-D75**, con i panel
di §9 · punto di ripresa `docs/roadmap/2026-07-29-ondata-b-album-foto-handoff.md`
**Emenda:** `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` §5.33 (v. §8)
**Mockup (§0B, fatto):** `docs/design/mockups/2026-07-30-album-visore-categoria.html` + gli screenshot
390/768/1280 × chiaro/scuro in `docs/design/mockups/screenshots/`
**Precede:** la ratifica → il piano (`superpowers:writing-plans`, R-P1/R-P2/R-P6) → l'esecuzione a task
singoli (R-E1)

> ✅ **§0B è soddisfatto** (mockup → screenshot ai tre tagli × due temi → **quattro varianti scelte**,
> D76-D79): §12 non è più uno sbarramento. 🟡 **Restano DUE cose prima del codice**, ed entrambe sono nel
> piano, non qui: la **marca dell'overlay** di visore e tendina (§4.3, §16) e le **icone vere** al posto
> delle emoji segnaposto del foglio categoria (§12).

---

## 1. Perché esiste

Oggi, sulla scheda di un lavoro, le foto sono **un quadrato nero da 72 pixel senza intestazione**, appeso
fra la carta delle note e il tasto CONSEGNA — l'unico blocco della pagina **senza titolo** (catture reali:
`docs/design/screenshots/2026-07-29-foto-stato-attuale/`). Non si ingrandiscono, non si cancellano, e la
loro categoria è **indovinata dal codice** (`src/components/features/lavori/form/TabImmagini.tsx:198`:
`'impronta'` per tutto ciò che arriva dalla fotocamera, `'altro'` per tutto ciò che arriva dalla galleria).

**D57** ha fermato il primo disegno («*costruiamo la visualizzazione album*») e **D60** ha spostato qui la
metà «guardare le foto» dell'ondata (c). **D64** ha scelto la forma: **carta con foto grande + visore a
tutto schermo**. Questa spec la scrive.

🔑 **La ragione per cui la forma si disegna adesso e non dopo:** mettere una ✕ sulla striscia di oggi e
riprogettare l'album tre settimane più tardi significa disegnarla **due volte** e far imparare all'utente
**due interfacce**.

---

## 2. Perimetro

### Dentro
1. **La carta album** sulla scheda del lavoro e sulla modifica (D64, D56 — una superficie, due chiamanti).
2. **Il visore a tutto schermo**, con ingrandimento (D64) e il posto già previsto per la barra dell'editor
   (D66).
3. **La categoria chiesta allo scatto** (D65), correggibile da entrambe le superfici (D70), con l'elenco
   chiuso a sei voci (D72) e il comportamento del foglio chiuso senza scegliere (D74).
4. **L'ordine** delle foto: raggruppate per categoria (D68), gruppi in ordine cronologico (D71).
5. **L'eliminazione** con conferma (D55) e traccia (D63), sotto il menù ⋯ del visore (D69).
6. **La colonna `categoria`** e l'eliminazione della colonna `tipo` (D73) — migration.
7. **I due difetti misurati di `TabImmagini`** che l'album eredita: il doppione dopo il caricamento e il
   contatore che conta due volte (§7.4).

### Fuori, con la destinazione scritta
| cosa | dove va | perché |
|---|---|---|
| **ruota · ritaglia** (editor) | ondata (c), lavoro proprio con panel proprio | **D66**: in casa non esiste modo di sostituire i byte di un'immagine → ritagliare sarebbe «nuova foto + cancella l'originale», e con D61 quella cancellazione è **vera**: un ritaglio storto sarebbe definitivo |
| **allegati che non sono foto** (pdf, stl…) — come si allegano, conservano, rivedono | ondata propria da collocare | **D67**: apertura di Francesco, non ancora progettata |
| **condivisione** (WhatsApp · portale del dentista · chat interna) | stessa ondata di D67 | **D67**: mai discussa prima. La chat interna **non esiste** nel prodotto |
| **durata dei collegamenti firmati** | stessa ondata di D67 | **D75**: condividere non è accorciare una scadenza, è decidere **chi ha il permesso**. V. §11, che è un **vuoto dichiarato**, non un'omissione |
| migrazione a v3 della route `/lavori/[id]/modifica` | ondata propria | ~3.500 righe su 10 file. V. §10 |

### 🛑 Dipendenza di sequenza — non è un dettaglio di pianificazione
**D61 è ratificata ma NON implementata.** L'handler dichiara ancora per iscritto che il file non si tocca
(`src/app/api/lavori/[id]/immagini/[imgId]/route.ts:91-93`) e non esiste nessuna chiamata a
`storage.remove`. ➡️ **L'emendamento di T8 atterra PRIMA o INSIEME alla parte visibile dell'eliminazione.**
Altrimenti il giorno in cui l'album spedisce, il suo «Elimina foto» **dice il falso**: la riga sparisce, il
file resta.

---

## 3. La carta album (D64 · D68 · D71)

### 3.1 Anatomia
Una **carta** come le altre della scheda — quindi **con il suo titolo**, che è la prima cosa che oggi manca:

- **Intestazione:** «Foto» + il conteggio delle foto vive.
- **Foto grande:** la prima dell'ordine di §3.2, a circa **4,7×** la miniatura di oggi (D64).
- **Sotto la foto grande:** l'**etichetta della categoria** e il contatore **«1 di 4»**.
- **Striscia** delle altre foto sotto, scorrevole.
- Al **tocco sulla foto grande** si apre il **visore** (§4).

🔑 **Il contatore «1 di 4» si conta dalla POSIZIONE NELL'ELENCO**, mai da una colonna del database (D71).
La colonna `ordine` è oggi **ambigua** — lo schema dichiara `DEFAULT 1`
(`supabase/migrations/002_fase2_schema.sql:253`) e l'INSERT scrive `0`
(`src/app/api/lavori/[id]/immagini/route.ts:111`), quindi righe vecchie e nuove portano valori diversi per
dire la stessa cosa. **Questa spec non la ripara e non la usa.**

### 3.2 L'ordine, e perché non è SQL
**Le foto si raggruppano per categoria** (D68) e i gruppi stanno in **ordine cronologico** (D71):

```
impronta → pre_lavoro → colore → post_prova → rx → altro
```

🛑 **Non è esprimibile come `.order()` di PostgREST**, e la ragione va scritta perché è il punto in cui
qualcuno «semplificherebbe»: l'ordinamento alfabetico darebbe `altro, colore, impronta, post_prova,
pre_lavoro, rx` — cioè **`altro` davanti a tutto**, esattamente il contrario di D71.

➡️ **Si ordina in TypeScript, dopo la lettura.** Con 4-20 foto per lavoro il costo è nullo. Dentro il
gruppo, l'ordine è `created_at` crescente (la colonna **esiste**: `002_fase2_schema.sql:254`), con `id`
come spareggio.

✅ **Effetto voluto di D74 + D71 messi insieme:** `altro` è **l'ultimo** gruppo, quindi le foto la cui
categoria non è stata scelta **stanno in fondo e non occupano mai la foto grande**. Il difetto è contenuto
**per costruzione dell'ordine**, non per fortuna.

### 3.3 Che cosa NON tocca un documento conservato
`FATTO NORMATIVO` — **misurato, non dedotto:** nessuno dei dieci template PDF nomina `immagini`; i tre
generatori che la innestano (`src/lib/pdf/generate-ifu.ts:21`,
`src/lib/pdf/generate-ricevuta-consegna.ts:21`, `src/lib/pdf/generate-etichetta.ts:37`) passano l'oggetto
al template e **il template non la legge**. ➡️ **Un cambio d'ordine non può alterare un documento
conservato** (All. XIII p.4 MDR): questo resta un fatto d'interfaccia.

---

## 4. Il visore a tutto schermo (D64 · D66 · D69)

### 4.1 Che cos'è
Un **componente nuovo del sistema grafico** — in casa non esiste nulla di riusabile. Vive in
`src/components/ds/` (nuovo) e ha la sua sezione §5.x nella spec DS v3, **proposta prima di essere
scritta** (processo §13.1 punto 3 della spec v3).

- **Apertura:** tocco sulla foto grande della carta.
- **Contenuto:** la foto **alla sorgente, senza degradarla** — ⚠️ **vincolo di D66**, e non è estetica: la
  fedeltà del colore è uno dei tre motivi per cui quelle foto esistono. Nessun ridimensionamento, nessuna
  ricompressione in vista.
- **Scorrimento** fra le foto nell'ordine di §3.2.
- **Etichetta della categoria** visibile, e **toccabile per correggerla** (D70, §5.3).
- **Menù ⋯** in alto, con dentro «Elimina foto» (D69).
- **Il posto per la barra dell'editor è previsto ma vuoto** (D66) — è la ragione per cui questa forma è
  stata scelta invece della sola carta: col visore la superficie dell'editor **esiste già**, quindi non si
  disegna due volte.

### 4.2 Il velo
`v3/tokens.ts:40` ha **un solo** velo, `scrim: 'rgba(29,25,19,.35)'`, usato dietro `Sheet` e
`DialogConferma`. **Troppo trasparente per starci dietro una fotografia** (D64).

➡️ **Nasce un secondo velo nei token v3** (`materia`), più coprente. 🛑 **Deve stare lì e non nel
componente:** i valori `rgba` letterali dentro `src/components/ds/` sono vietati dal controllo pre-commit
(§13.2 della spec v3).

### 4.3 Il tasto «indietro» — tre strati, non uno
🔴 **Questo è il punto in cui il visore può nascere rotto**, e la regola è già stata pagata una volta:
`storia-overlay.ts:67` dichiara `type Marca = 'uaSheet' | 'uaDialog'` — **un'unione chiusa a due**, e il
visore non è nessuno dei due.

E D69 impila: **visore → menù ⋯ → conferma di eliminazione** (D55). Fino a **tre strati** — e con **D78**
il secondo è una **tendina**, cioè un componente che in casa non esiste e che **non ha già** il
comportamento di storia che un foglio v3 porta con sé (§9).

**La spec deve fissare, prima che si scriva una riga:**
1. **Quale marca** prende il visore — una terza (`uaVisore`, esplicita, tocca il modulo) o il riuso di
   `uaSheet`. 🟡 **Scelta ancora da fare**, v. §16.
2. **Il comportamento di «indietro» per tutti e tre gli strati**: chiude uno strato per volta, mai due, e
   mai la pagina finché resta uno strato aperto.
3. **La gerarchia di sovrapposizione** fra visore e la conferma che ci sta sopra — `Sheet` è a z-index
   1000: il visore va **sotto** la conferma, o la conferma sparisce dietro la foto.
4. **Navigare da dentro:** mai `router.push` nudo, sempre `useNavigaDaOverlay`
   (`src/components/ds/useNavigaDaOverlay.ts`).

⚠️ **La rete che controlla tutto questo è MANUALE:** `scripts/guardia-navigazione-overlay.mjs` va lanciata
a mano, le serve l'app accesa e un lavoro preparato apposta. **Chi tocca gli overlay v3 la lancia**, e il
piano deve dire **chi e quando**.

---

## 5. La categoria (D65 · D70 · D72 · D74)

### 5.1 Le sei voci, ratificate
`impronta` · `pre_lavoro` · `colore` · `post_prova` · `rx` · `altro`
(etichette: Impronta · Pre-lavoro · Guida colore · Post-prova · Radiografia · Altro).

🔑 **D72 ha chiuso un buco dello Statuto delle fonti:** queste sei voci **non erano mai state scelte da
Francesco** — le aveva scritte chi ha costruito il componente (`TabImmagini.tsx:15-22`) e stavano per
essere scolpite in un vincolo di banca dati. Ora sono **ratificate**, e l'elenco è **chiuso e uguale per
tutti i laboratori**: è ciò che rende legittimo un `CHECK` invece di una tabella di consultazione.

### 5.2 Si chiede allo scatto (D65)
- La domanda arriva **dopo** lo scatto — 🛑 **mai prima: non si blocca la fotocamera**.
- Le sei voci **a portata di pollice**.
- Per lo **scatto multiplo si chiede una volta per gruppo**, non foto per foto, o il tocco in più diventa
  sei.
- ⚠️ **È una deroga consapevole** al «percorso minimo a tre tocchi» (DS v3 §7.3), decisa da Francesco
  sapendo che il momento dello scatto è quello con le mani occupate.

### 5.3 Se il foglio si chiude senza scegliere (D74)
**La foto nasce `altro`.** Non è un errore: **niente avviso, niente suono d'errore**.

🔴 **Il costo, che va scritto e non addolcito: l'album non può distinguere «ho scelto Altro» da «non ho
risposto».** La deriva che D65 esiste per chiudere **non è eliminata, è ristretta** — prima l'app indovinava
**sempre**, adesso indovina **solo per chi non risponde**, e non su una categoria clinica ma sulla voce che
significa «nessuna delle precedenti».

➡️ **Conseguenza sul disegno del foglio:** deve rendere **evidente che una scelta è attesa**, o «Altro»
diventa la risposta normale invece dell'eccezione.

### 5.4 Si corregge da entrambi i posti (D70)
Dal **visore** (toccando l'etichetta) e dall'**album** (sotto la tessera).

🛑 **Vincolo non negoziabile, o la decisione si trasforma nel suo difetto: UNA SOLA funzione di scrittura**,
chiamata dalle due superfici. **Il precedente da NON ripetere è nello stesso file che stiamo riscrivendo**:
`TabImmagini.tsx:224-244` e `:247-260` sono **due** gestori quasi identici (`handleTipoChange` e
`handleTipoChangeDb`) che fanno la stessa `PATCH` per due strade diverse. **Si fondono.**

### 5.5 Il testo alternativo
`SchedaLavoroV3.tsx:316` passa oggi `alt: img.descrizione` — cioè uno screen reader legge **«pre_lavoro»**.
✅ **Correzione misurata:** `FotoStrip.tsx` ripiega su `'Foto del lavoro'` quando il valore manca, quindi
l'immagine non resta muta; ma il testo è **la sigla interna o un generico**.

➡️ **L'album spedisce con la mappa `categoria → etichetta`**, e il testo alternativo diventa l'etichetta
vera («Impronta»). 🛑 **La colonna nuova non si spedisce senza quella mappa**, o si peggiora
l'accessibilità mentre si migliora il dato.

---

## 6. L'eliminazione (D61 · D63 · D69 · D55 · D56)

- **Dove:** sotto il **menù ⋯ del visore** (D69) — il gesto distruttivo non sta mai accanto al gesto di
  scorrere, che nel visore è il gesto principale e continuo.
- **Il percorso completo:** menù → «Elimina foto» → **conferma** (D55). D69 non sostituisce la conferma, la
  affianca.
- **Su entrambe le superfici** (D56).
- **Il nome è «Elimina foto»**, mai «diritto all'oblio»: Art. 28(10) GDPR — il laboratorio è
  **responsabile**, il dentista **titolare**.
- **La cancellazione è fisica** (D61): riga **e** file. Ordine: **file prima, riga dopo**.
- **Una traccia** di chi cancella (D63, Art. 28(3)(h)): chi · quando · quale lavoro · quale
  `storage_path`. 🛑 **Mai l'immagine.**
- **La finestra resta** «fino alla consegna», con **409** a lavoro consegnato
  (`[imgId]/route.ts:142-147`, già implementato).

⚠️ **«Punto» non è letterale, e va detto a Francesco prima e non dopo:** la spec di progetto dichiara
**PITR 7 giorni**, e sulle URL già emesse resta una coda di cache fino a **~60 s** con lo Smart CDN attivo,
fino a **un'ora** senza (`cacheControl: '3600'` è il default della libreria, **mai scelto da noi** —
`src/lib/storage/upload.ts:20-25`).

---

## 7. Il dato (D73)

### 7.1 La migration — 🆕 file da creare
🛑 **File SEPARATO da quello della traccia di D63**: falliscono in modi diversi, e un file solo che si ferma
a metà disallinea il ledger per entrambe. Precedente in casa: **cinque file per un'ondata sola** —
`supabase/migrations/20260727120000_lavori_denti.sql` · `…120100_lavori_denti_tabella.sql` ·
`…120200_lavori_colore_caso.sql` · `…120250_lavori_denti_touch_dedup.sql` · `…120300_lavori_denti_rpc.sql`.

**L'ordine delle istruzioni non è stile — è ciò che impedisce alla migration di abortire:**

1. `ALTER TABLE lavori_immagini ADD COLUMN categoria TEXT;` — **nullable**, nessun vincolo ancora.
2. **Backfill TOTALE.** 🛑 **MAI un filtro `deleted_at`**: è l'abitudine di casa (la fa la RLS, la fanno
   tutti e otto i lettori) e qui le righe cancellate resterebbero nulle → **`SET NOT NULL` aborterebbe**.
   `CASE WHEN descrizione IN (<i sei>) THEN descrizione ELSE 'altro' END`, che è **totale per costruzione**
   — il rischio smette di dipendere da un dato che non è stato misurato (§15).
3. **`CHECK` DOPO il backfill.** Se lo si mette prima, valida **subito** le righe esistenti e aborta sul
   primo `descrizione` fuori elenco.
4. `SET NOT NULL`, **senza `DEFAULT`** (§7.2).
5. `DROP COLUMN tipo` (D73).
6. `COMMENT ON COLUMN` su `categoria` **e** su `descrizione` — quest'ultima per scrivere in banca dati che
   fino al 30/07/2026 ha ospitato impropriamente la categoria e che i valori vecchi non si leggono più così.

### 7.2 `NOT NULL` senza `DEFAULT` — la parte che conta
Con un ripiego (`'altro'`) il compilatore **tace**, e un domani uno scrittore che dimentica la categoria
passa inosservato — cioè **D65 riprodotta di una colonna più in là**.

Senza ripiego, `npx tsc --noEmit` **si accende sull'unico scrittore** (`immagini/route.ts:102`) e obbliga a
dirla. 🔑 **Il rosso di `tsc` dopo `gen types` è il RISULTATO ATTESO, non un incidente:** è la prova che il
ripiego non c'è. Chi esegue lo troverà scritto qui e non lo «riparerà» rimettendo un default.

⚠️ **Attenzione a non confondere §7.2 con §5.3:** il ripiego **non esiste nel database**; `'altro'` lo
scrive **il client**, esplicitamente, quando l'utente chiude il foglio. Sono due cose diverse e la
differenza è tutta la sicurezza di questo assetto.

### 7.3 `tipo` si elimina — perché, e cosa costa
Il panel si è **diviso** (verbale §D73). Ha vinto l'eliminazione, con due fatti riverificati:
① **`tipo` non è l'asse del formato** — dei suoi quattro valori
(`002_fase2_schema.sql:251-252`), **due (`rx`, `altro`) sono già due delle sei categorie**, e `'foto'`
dentro una tabella che si chiama `lavori_immagini` non dice nulla; ② **il formato è già derivabile** da
`storage_path` (`NOT NULL`, `:246`), che porta sempre l'estensione presa da un'allowlist **chiusa di sei**
(`immagini/route.ts:11-18`, percorso costruito a `:85`).
🔑 A rompere il pareggio è stata **W23** — parole di Francesco del 27/07: «*se serve usala sennò togli*».

**Raggio d'azione misurato:** `tipo` non è letta da nessuno (otto siti innestano `(*)`, nessuno la consuma;
**zero occorrenze** nei due test della tabella; l'unico `.tipo` in `TabImmagini.tsx:523` è lo **stato locale
del caricamento**). Si tolgono **tre righe**: `immagini/route.ts:110` che la pinna · `[imgId]/route.ts:10`
che la lascia **scrivibile dal browser** · `src/types/domain.ts:484`. Più `gen types`.

📌 **Fatto che l'ondata di D67 erediterà:** oggi un **PDF caricato sta in banca dati come `tipo='foto'` e
`descrizione='altro'` — entrambe le colonne mentono sulla stessa riga.**

### 7.4 I tre difetti che l'album eredita e chiude
1. **Il doppione dopo il caricamento.** A caricamento riuscito la foto viene aggiunta all'elenco di banca
   dati **e** resta nell'elenco locale (`TabImmagini.tsx:287` rende **tutte** le locali, comprese quelle
   già salite): la stessa foto compare **due volte**.
2. **Il contatore conta due volte:** `TabImmagini.tsx:117` somma le righe di banca dati **più** le locali
   già caricate.
3. **Il PDF reso come immagine.** `application/pdf` è accettato (`immagini/route.ts:17`, input a
   `TabImmagini.tsx:309`) e reso con un `<img>` (`:592`) → **tessera rotta**. 🛑 **La strada NON si chiude**
   (D67): l'album mostra una **tessera documento** con icona e nome, e al tocco apre il PDF invece del
   visore.

### 7.5 La validazione, o il 500 al posto del 422
`[imgId]/route.ts:60-66` passa i valori **grezzi** al database e `:80-86` restituisce **500** su errore. Con
un `CHECK` nuovo, una categoria inventata uscirebbe come **500 generico**.
➡️ **La rotta valida `categoria` contro la costante TypeScript** e risponde **422**.

### 7.6 La lista dei sei vive in TRE posti, non due
La migration (`CHECK`) · la costante TypeScript · la validazione della rotta. E `gen types` **non
restringe**: `categoria` esce come `string`, non come unione dei sei.

➡️ **La costante TypeScript è la fonte**, la rotta valida contro di lei, e **una prova-spia LEGGE la
migration** e verifica che le due liste coincidano. Senza, divergeranno in silenzio.

---

## 8. L'emendamento a DS v3 §5.33 — e i due difetti della stessa passata

**§5.33 dice oggi** (spec v3 `:280`): «`FotoStrip` — strip thumbnail orizzontale: thumb 72×72 · radius 12 ·
cornice interna 1px inset · max 1 riga scrollabile. **Fonte di verità visiva: `scheda-lavoro.html` classe
`.foto-strip`/`.foto-thumb`**».

**Va emendata su tre punti** (forma: la stessa già usata in casa — marca in linea «*(emendamento
30/07/2026, ondata (b) — Album foto)*», più la riga di revisione in testa alla spec):
1. **La striscia non è più sola lettura** e **diventa una carta** con foto grande + visore.
2. **La fonte di verità visiva si RIPUNTA** al mockup album approvato. 🛑 Lasciandola su
   `scheda-lavoro.html .foto-strip` la spec citerebbe **una fonte morta**.
3. **Nascono le §5.x dei componenti nuovi** (carta album, visore), proposte **prima** di scriverli.

⚠️ **Nella stessa passata si corregge un secondo difetto, già a verbale come R22:** la riga `:535` della
spec v3 prescrive un **worktree** per la migrazione, che `CLAUDE.md` **vieta senza eccezioni** (doppio
`package-lock.json` → 404 su tutte le route, difetto vero e pagato). Si aprono due modifiche allo stesso
documento **una volta sola**.

---

## 9. Dove vivono i componenti

| componente | dove | perché |
|---|---|---|
| carta album (variante A1) | `src/components/ds/` (🆕 da creare) | §13.1 p.3 della spec v3: i componenti condivisi stanno **solo** lì |
| visore (variante V1) | `src/components/ds/` (🆕 da creare) | idem, più §4.3 (marca dell'overlay) |
| foglio della categoria (variante C1) | `src/components/ds/` (🆕 da creare) | serve su entrambe le superfici |
| 🆕 **tendina del menù** (variante M2, **D78**) | `src/components/ds/` (🆕 da creare) | 🛑 **In casa NON esiste: l'app usa fogli, non tendine.** Nasce con la sua **§5.x proposta prima di essere scritta** — non si improvvisa dentro un task |

### 🛑 Quello che la scelta M2 impone, e che un foglio non avrebbe chiesto
**D78 è una scelta di Francesco e si esegue.** I due costi erano scritti nella domanda e restano veri,
quindi si **progettano** invece di scoprirli in esecuzione:
1. **La voce distruttiva sta IN FONDO alla tendina** — il punto più lontano dai tre puntini e **più vicino
   al pollice**, perché in alto a destra è la zona meno raggiungibile su un telefono grande ed è lì che
   finirebbe la voce che **cancella davvero** (D61). Resta rossa, staccata da una linea, con margine extra
   (§5.34).
2. **La tendina è uno STRATO, non un dettaglio grafico:** entra in `storia-overlay.ts` esattamente come un
   foglio, o «indietro» chiuderebbe **il visore** invece del menù. Da progettare con lei: chiusura toccando
   fuori · chiusura allo scorrimento · **raggiungibilità da tastiera e da lettore di schermo**, che un
   foglio v3 ha già e una tendina nuova **no**.

`src/components/ds/FotoStrip.tsx` **esiste già** ed è v3 puro (28 righe, legge solo `v3/tokens`): la carta
album **lo assorbe o lo sostituisce** — non gli si affianca un terzo componente foto.

---

## 10. 🛑 La regola sui token, e il ponte che la rende necessaria

**I componenti nuovi leggono SOLO `src/design-system/v3/tokens.ts`. Mai `form/styles.ts`.**

**Non è una preferenza di stile — è il fatto misurato che segue.** `src/app/ds-v3.css:236-255` contiene un
**ponte**: venti righe che rimappano i nomi v2.3 (`--t1`, `--t2`, `--sh-b`, `--sh-i`) ai valori v3. Ma è
agganciato alla classe **`.lavoro-form-v3`, che in tutto `src/` esiste in UN SOLO posto**
(`src/app/(app)/lavori/[id]/modifica/page.tsx:94`).

➡️ Un componente album che leggesse `raisedShadow` (`form/styles.ts:52-53`, cioè
`var(--sh-b, <ripiego v2.3>)`) **renderebbe diverso sulla scheda e in modifica**: ombra v3 in modifica,
ripiego v2.3 sulla scheda. **Stesso codice, due facce.**

⚠️ **E il motivo per cui nessuno se n'era accorto è a verbale come R21:** `scripts/check-ds-compliance.sh`
è rimasto la guardia v2.3 e **non controlla gli import legacy dentro una route v3**. Una regola dichiarata
e protetta da un controllo che non la guarda.

**Correzione da fare in `TabImmagini.tsx` — cinque righe, nel file che l'ondata riscrive comunque:**
`hapticLight/Success/Error` → `vibra(...)` di `v3/haptic.ts` · `soundError` → `suona('errore')` di
`v3/sound.ts` · `motionTokens.spring.snappy` → `molla.snappy` di `v3/motion.ts`.
✅ **Due dei quattro import sospettati NON sono violazioni** e vanno lasciati stare: `useReducedMotion` è
**ri-esportato da v3** (`v3/motion.ts:5`) e `raisedShadow` è una variabile CSS, non un valore v2.3 in
esecuzione. 🛑 **La route NON si migra qui** (§2, fuori perimetro).

---

## 11. 🟡 Vuoto dichiarato — la durata dei collegamenti alle foto (D75)

**Questa sezione esiste perché un'omissione e un vuoto dichiarato non sono la stessa cosa.**

**Il fatto:** una foto si vede tramite un **collegamento firmato che vale un'ora**
(`src/app/(app)/lavori/[id]/page.tsx:65` e `.../modifica/page.tsx:87`, `3600`), ed è **al portatore** — chi
ce l'ha entra **senza autenticarsi**. Il portale dei dentisti usa **300** e la PEC **60**; quei due numeri
sono **motivati per iscritto** (`docs/superpowers/specs/2026-07-05-b5-download-portale-e-signed-url-design.md:71`),
il 3600 è stato **copiato**.

⚠️ **Il gradiente è invertito, e la prima descrizione che ne era stata data era sbagliata:** dal portale le
foto **non passano mai** (`src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts:13` serve
solo `ddc` e `buono`). Quindi il dato più delicato — impronte e **radiografie**, dati sanitari — ha la
finestra **più lunga** e **non ha alternativa più corta da nessuna parte**.

**Decisione (D75):** si decide **nel lavoro sulla condivisione** (D67), perché condividere non è accorciare
una scadenza: è **decidere chi ha il permesso**. 🛑 **Una mitigazione da ~15 righe è stata presentata e
scartata consapevolmente** — sta scritto qui che l'uscita esisteva, non che non c'era.

### 🛑 La contropartita del rinvio — vincolo su questa ondata
**L'album e il visore non peggiorano l'esposizione in modo evitabile:**
- **nessun punto nuovo** che mostri, copi o esporti l'indirizzo firmato;
- **il numero di punti in cui quell'indirizzo compare non cresce** rispetto a oggi;
- se il visore carica le foto **su richiesta** invece che tutte insieme, deve gestire la **scadenza**
  (un'immagine chiesta dopo la scadenza non deve restare rotta in silenzio).

📌 **Da riprendere in D67 insieme a R20:** `src/lib/storage/upload.ts:31` costruisce una **public URL** e
`immagini/route.ts:107` la **persiste** in `lavori_immagini.url`. Oggi è inerte (bucket privato), ma è la
riga che invita la correzione catastrofica «rendiamo pubblico il bucket» — e il progetto **ha davvero** un
bucket pubblico con cui confonderla (`src/lib/utils/storage-url.ts:6-10`).

---

## 12. ✅ Le superfici e il loro stato di approvazione visiva (§0B)

**§0B è soddisfatto.** Mockup: `docs/design/mockups/2026-07-30-album-visore-categoria.html`, screenshot a
**390 / 768 / 1280** in **chiaro e scuro** in `docs/design/mockups/screenshots/2026-07-30-album-visore-categoria-*.png`
— e **dentro la schermata vera** (D58), non a frammenti.

| # | superficie | decisa da | variante scelta |
|---|---|---|---|
| 1 | **l'album con i gruppi** nell'ordine di D71 | D68, D71, D72 | ✅ **A1** — etichette sopra i blocchi (**D76**) |
| 2 | **il visore** a tutto schermo | D64, D66 | ✅ **V1** — controlli sempre visibili (**D77**) |
| 3 | **il menù ⋯ dentro il visore** | D69 | ✅ **M2** — tendina ancorata ai tre puntini (**D78**) |
| 4 | **il foglio della categoria allo scatto** (compreso lo scatto multiplo) | D65, D74 | ✅ **C1** — sei pastiglie su due colonne (**D79**) |

### 🔎 Tre cose che il disegno ha prodotto e che nessuna decisione poteva prevedere
1. 📏 **A 390 la pastiglia utile è 148,5 px e «Guida colore» — la più lunga delle sei — ANDAVA A CAPO**,
   sfalsando la griglia. Rientra a **15 px** di testo. 🔑 Stessa trappola dei nomi lunghi già pagata con le
   briciole del wizard (D39): **l'etichetta più lunga si misura, non si stima** — e se una voce cambierà
   nome, la misura va rifatta.
2. 🔴 **Il caso peggiore del visore è la radiografia**, ed è stato disegnato apposta (colonna V1-bis): su una
   foto scura le sfumature che reggono i controlli **spariscono**, e con loro il contrasto del testo bianco.
   ➡️ **Il contrasto dei controlli si prova sulla foto più scura**, mai su quella media.
3. 🛑 **Il testo della conferma è cambiato, e non è una rifinitura:** la stesura del 29/07 diceva «il file
   resta conservato». Con **D61** è **falso**. Testo in vigore: «Sparisce dalla scheda **e dall'archivio**:
   non si recupera. Resta annotato chi l'ha eliminata e quando.»

### 🛑 Il vincolo di D75 verificato sul disegno
**Nessuna variante mostra, copia o esporta l'indirizzo firmato della foto.** È il motivo per cui il menù
porta «**Salva sul telefono**» e **non** «Copia link»: la contropartita del rinvio (§11) è che questa
superficie **non peggiori l'esposizione in modo evitabile**, e una voce «copia link» l'avrebbe peggiorata
in un punto nuovo.

⚠️ **Nota su §0B, da portare in `ua-app/CLAUDE.md`:** la regola scritta chiede i **tre formati**, non
l'**intera schermata**. D58 aggiunge quella riga — senza, la prossima sessione rifarà frammenti in buona fede.

---

## 13. Gate FASE 3 — le cinque risposte

| # | domanda | risposta |
|---|---|---|
| 1 | **Isolamento fra laboratori:** tocca le RLS o `current_lab_id()`? | **No.** La policy `lav_img_lab` (`002_fase2_schema.sql:257-258`) filtra `laboratorio_id` + `deleted_at` e **non nomina** né `tipo` né `categoria`: aggiungere e togliere colonne non la altera. ⚠️ Le rotte usano il client di servizio e **scavalcano la RLS**: i tre `.eq()` restano l'unico controllo di appartenenza |
| 2 | **Schema drift:** serve migration? `gen types` va rieseguito? | **Sì a entrambe** (§7.1). FASE 6b obbligatoria: `gen types` + `tsc --noEmit`, **e il rosso su `immagini/route.ts:102` è atteso** (§7.2) |
| 3 | **Contratto API:** il cambio rompe client esistenti? | **Sì, in un punto controllato.** `tipo` sparisce da `LavoroImmagine` (`src/types/domain.ts:484`) e dall'allowlist `PATCH`. **Nessun lettore** in produzione (misurato, §7.3). 🛑 `tests/unit/lavori-immagini-deleted-embed.test.ts:37-45` asserisce il **grafema letterale** `immagini:lavori_immagini(*)` contando innesti e filtri: aggiungere una colonna va bene, **trasformare l'innesto in elenco esplicito romperebbe la guardia di T8** |
| 4 | **Rollback:** come si annulla? | La migration è in **un file suo** (§7.1). Inverso: `ALTER TABLE lavori_immagini DROP COLUMN categoria` + ricreare `tipo`. ✅ **I dati sono di TEST** (`ua-app/CLAUDE.md` §8): il valore migrato non va protetto, la **robustezza dell'applicazione** sì |
| 5 | **Dominio critico?** | **Sì → percorso GRANDE**, già in vigore per l'ondata (b). Migration + dati sanitari (Art. 9) |

---

## 14. Le prove da scrivere PRIMA di dire «fatto»

1. **L'ordine dei gruppi**, con un caso che **deve** fallire se qualcuno «semplifica» in `ORDER BY`
   alfabetico: un lavoro con una foto `altro` e una `impronta` → l'`impronta` è **prima**.
2. **La prova-spia sulla lista dei sei** (§7.6): legge la migration, confronta con la costante TypeScript,
   **rossa se divergono**.
3. **Il vincolo morde:** un `PATCH` con `categoria: 'pippo'` → **422**, non 500, e la riga **non cambia**.
   🛑 R-P1: un vincolo si prova con **un valore che DEVE essere rifiutato**, col messaggio incollato.
4. **`categoria` senza ripiego:** una `POST` che non la manda **fallisce** — e la prova è che `tsc` si
   accende, incollato nel rapporto.
5. **Una sola funzione di scrittura** (§5.4): un test che conta i punti da cui parte la `PATCH` della
   categoria e pretende **uno**.
6. **Il doppione** (§7.4): dopo un caricamento riuscito la foto compare **una** volta e il contatore dice
   **uno**.
7. **Il testo alternativo** (§5.5): una foto `pre_lavoro` ha `alt="Pre-lavoro"`, non `"pre_lavoro"`.
   ⚠️ `SchedaLavoroV3.test.tsx` passa oggi `immagini: []` → **copertura zero** su questo.
8. **Il tasto «indietro» a tre strati** (§4.3), a mano con
   `scripts/guardia-navigazione-overlay.mjs`: il piano dice **chi la lancia e quando**.

🛑 **E una riga che riguarda il PIANO, non questa spec, ma che sta qui perché è da qui che il piano si
scrive:** `ua-app/CLAUDE.md` §0C impone che **ogni piano di un'ondata con UI includa il GATE ESTETICO L2
(FASE 9b) come step finale**, prima del merge — micro-audit della sola superficie dell'ondata contro
`docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`, ai tre tagli in chiaro e scuro, con gli screenshot
prima/dopo. **L'album è una superficie nuova: il gate vale.**

---

## 15. Cosa NON è verificato — dichiarato

| # | cosa | perché non è stato chiuso |
|---|---|---|
| 1 | **Quante righe ha `lavori_immagini` oggi, e quali valori porta `descrizione`** | Il server MCP di Supabase **non è autenticato** in questa sessione. ✅ **Neutralizzato, non misurato:** il backfill di §7.1 è **totale per costruzione**, quindi la migration non può abortire per un valore inatteso |
| 2 | **Se esistano già righe-PDF in banca dati** | Il codice le **permette** (`immagini/route.ts:17`); che ce ne siano è ignoto. Riguarda D67 |
| 3 | **La gerarchia z-index** fra visore e conferma | Va provata sul mockup, non a tavolino (§4.3 p.3) |
| 4 | **Se il fornitore invalidi un collegamento firmato alla cancellazione dell'oggetto** | Prova: firmare 300 s → cancellare → richiedere a 0/30/90 s. Riguarda §6 e D75 |
| 5 | **Il menù contestuale di iOS su un'immagine a tutto schermo** | Si prova su device reale. Riguarda §11 |

---

## 16. 🟡 Le domande ancora aperte

| # | domanda | chi decide |
|---|---|---|
| 1 | **La marca dell'overlay** (§4.3): serve a **due** componenti nuovi, visore **e** tendina (D78) — terza marca `uaVisore` o riuso di `uaSheet`, e se la tendina ne vuole una sua | Decisione tecnica → panel se non è ovvia guardando il modulo. **Non si sceglie di nascosto dentro un task** |
| ~~2~~ | ~~I quattro mockup di §12~~ | ✅ **CHIUSA il 30/07** — D76 (album A1) · D77 (visore V1) · D78 (menù M2) · D79 (categoria C1) |
| 4 | 🆕 **Le icone vere delle sei categorie** — le emoji del mockup sono un **segnaposto dichiarato** | Francesco, sul disegno. Va nel piano come passo proprio |
| 3 | **Dove si colloca l'ondata di D67** (allegati + condivisione) nella roadmap | Francesco |

---

## 17. Ritrovamenti fuori mandato — già a verbale (R-E2)

Non si ripetono qui: stanno in **una sola sezione**, `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`
§6, con la loro destinazione — **R20** (public URL persistita) · **R21** (guardia DS ferma a v2.3) ·
**R22** (worktree in spec v3) · **R23** (percorsi storage che collidono) · **R24** (MIME dichiarato dal
client) · **R25** (cinque innesti mai letti) · **R26** (difesa asimmetrica fra `PATCH` e `DELETE`).

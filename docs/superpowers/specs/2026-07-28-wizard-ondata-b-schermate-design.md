# Spec — Ondata (b) del wizard «Nuovo lavoro»: le schermate

**Data:** 28 luglio 2026 · **Stato:** 🟡 **da ratificare** (Francesco) · **Percorso: GRANDE** (v. §14, gate FASE 3)
**Verbale delle decisioni (D1-D13):** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`
**Spec madre (già ratificata 27/07):** `docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md` — §5 e §12
**Mockup approvati:** `docs/design/mockups/2026-07-28-wizard-passo-paziente.html` (variante **A**) ·
`…-wizard-avanzamento-passi.html` (variante **3**) · e dal 27/07, per denti e colore:
`2026-07-27-{denti-colore-wizard,arcata-ovale,denti-illustrazioni-vere}.html`

> Questa spec **non ripete** la spec madre: la presuppone. Le sigle `W*n*` rimandano alle 23 decisioni
> del verbale del 27/07; le sigle `D*n*` alle 13 di oggi.

---

## 1. Perché esiste

L'ondata (a) ha reso denti e colore **un dato vero** (righe in `lavori_denti`), ma **a grafica invariata**:
il wizard di oggi chiede ancora tre cose — dentista, tipo, paziente — e tratta il resto come accessorio.
Restano aperti quattro difetti **verificati**, non ipotizzati:

1. **Il wizard non ritrova mai un paziente: ne crea uno nuovo quasi sempre.** Il codice proposto è
   `PZ-<max+1>` (`dati-wizard.ts:44-50`), e la ricerca del paziente esistente confronta **quel** codice
   (`crea-lavoro.ts:214`): il confronto non può quasi mai colpire. `pazienti` non è un'anagrafica, è un
   registro dei lavori — con **916 righe** su 294 lavori (baseline 28/07).
2. **Due caselle non arriverebbero a nulla.** `crea-lavoro.ts:229-230` manda `nome: ''` e
   `cognome: alias || pz`, **fissi nel codice**. È la riga che decide se D2 ha un effetto.
3. **Niente impedisce due pazienti con lo stesso codice.** `codice_paziente TEXT` nudo
   (`supabase/schema.sql:461`): nessun UNIQUE, nessun indice. E il numero si calcola **su tutto il
   laboratorio** (`dati-wizard.ts:106,128`) mentre la ricerca filtra **per dentista**
   (`crea-lavoro.ts:209`).
4. **Il conteggio dei passi mentirebbe.** `ProgressDots` presuppone 3 passi fissi
   (`src/components/ds/ProgressDots.tsx:43`, `aria-label="Passo N di 3"`), ma i passi variano col tipo.

---

## 2. Perimetro

**DENTRO** — wizard adattivo sui 38 tipi (W2) · **passo paziente rifatto** (§4) · **ricerca del paziente**
(§5) · **unicità del codice paziente** (§6) · **avanzamento a briciole** (§3) · passo denti con
l'odontogramma v3 e le illustrazioni (W15/W18) · passo colore sui soli denti scelti (W19) · **passo foto
sempre presente** (D8) · cassetta come ultimo passo saltabile (W4) · **rimozione di «Dimmelo a voce»**
(D13) · **bozza portata a `v:2`** (§7) · **riscrittura della regola DS sul nome del paziente** (D7, già
fatta) · **FASE 9b, gate estetico L2**.

**FUORI, tracciato:** unione di due schede doppie · pagina `/pazienti` in scrittura · le tre eredità della
**scheda del lavoro** (tendina 19/48, colore di caso non correggibile alla creazione, tre zone senza dente)
· i due difetti della **home** · la fotografia congelata `paziente_nome_snapshot` (tappa 1-bis, voce 5
della roadmap, panel normativo) · i 10 ritrovamenti del §6 del verbale.

---

## 3. L'avanzamento: le briciole (D10)

`ProgressDots` **esce dal wizard** (resta nel DS per altri usi). In testata, accanto al tasto indietro,
compaiono le **scelte già fatte**, in pastiglie: `Dr. Puleo` → poi `Dr. Puleo · Overdenture`.

- **Nessun conteggio**, quindi niente da smentire quando i passi cambiano.
- La riga è **informazione**, non decorazione: chi si distrae e torna sa cosa stava facendo.
- **Accessibilità:** l'etichetta letta dalla voce sintetica diventa il contenuto vero
  («Dr. Puleo, Overdenture»), non «Passo 2 di 3». Il contenitore resta **una sola** informazione
  (`role="img"` + `aria-label`, come oggi), non un elenco di elementi separati.
- **Vincolo di spazio:** la testata è alta 44 px e le pastiglie non devono mandare a capo. Nome studio e
  tipo si troncano con ellissi (max-width 150 px nel mockup) — **e la troncatura va misurata a 390 px**,
  non stimata.
- ⚠️ **Da decidere nel piano, non qui:** se le briciole siano **toccabili** per tornare a quel passo. Il
  mockup non le rende tali; renderle tali apre la questione «che fine fanno i passi successivi già
  compilati», che è una macchina a stati, non un dettaglio visivo.

---

## 3-bis. La larghezza sugli schermi grandi (D14)

Oggi il wizard è **una colonna da 480 px centrata a qualunque taglio** — `colonnaStile` in
`WizardNuovoLavoro.tsx:533-538`, e il commento in testa al file lo dichiara esplicitamente
(«full-screen a TUTTI i viewport»). La spec madre §5 prevede però, per i denti, **due arcate su tablet**
e **mappa e colore affiancati su desktop**.

**Ratificato (D14): le due cose convivono.**
- **Colonna stretta** (l'attuale) per i passi che fanno **una domanda semplice**: dentista, tipo, paziente,
  foto, cassetta. È dove il testo si legge meglio, ed è la forma pensata per il banco.
- **Larghezza piena** per **denti e colore**, dove lo spazio serve davvero.
- Il **salto di larghezza fra un passo e l'altro si accetta**, perché è il contenuto a chiederlo, e si
  rende morbido con la coreografia di passaggio (`coreografie.wizardAvanti`/`wizardIndietro`).

⚠️ **Da provare a schermo, non da assumere:** il passaggio stretto → largo e il **ritorno indietro**, che è
il caso in cui un cambio di larghezza si nota di più. Prova **B10** (§12).

---

## 4. Il passo paziente (D2, D9)

**Anatomia**, dall'alto: domanda · aiuto · `CODICE PAZIENTE` (precompilato) · `COGNOME` · `NOME` · nota ·
`Continua`.

- Il blocco **«Se vuoi, aggiungi» sparisce**: elemento e colore diventano passi propri, la foto diventa il
  passo di D8, e senza i «Salta» (D2) una riga chiusa sarebbe un bottone che non dice di essere un bottone.
- **Nessun campo con il cursore già dentro:** un `autoFocus` aprirebbe la tastiera e seppellirebbe il tasto
  «Continua».
- Più caselle nella stessa schermata **non violano «una cosa alla volta»**: rispondono tutte a **una**
  domanda. Precedente già v3 e già del wizard: `NuovoDentistaSheet.tsx:103-111` impila quattro campi.

**I testi a schermo** (sostituiscono la parola «alias», che al banco nessuno usa — voce aperta del verbale
27/07 §7.5):

| dove | testo |
|---|---|
| domanda | «Chi è il paziente?» |
| aiuto | «Il codice l'ho già scritto io. Il nome puoi aggiungerlo, o lasciar perdere.» |
| nota sotto le caselle | «Non serve il nome vero: va bene un soprannome, o niente. Se lo scrivi, lo ritrovi sulla targa della cassetta.» |
| paziente ritrovato | «Questo l'ho già in archivio: gli attacco il lavoro nuovo.» |

⚠️ **La frase sulla targa è vera e verificata** (`parco-shared.ts:69-75`, `Cassetta.tsx:696-702`). **Non** si
scrive «resta solo in laboratorio»: sarebbe falso, `EtichettaTemplate.tsx:117-124` stampa nome e cognome.

**Perché le caselle restano facoltative, e perché non si insiste.** Il laboratorio tratta i dati **per conto
del dentista** (responsabile ex Art. 28 GDPR: `DpaTemplate.tsx:3,120,164`; fonte `../ANALISI/17:778-781`).
Un campo che *invita* a digitare un nome mai ricevuto fa raccogliere al responsabile un dato che il titolare
non gli ha affidato. E il codice **basta**: l'Allegato XIII MDR identifica il paziente «mediante il nome,
**un acronimo o un codice numerico**» — tre alternative equivalenti.

---

## 5. La ricerca del paziente (D9, D11)

**Comportamento.** Mentre si scrive nella casella `COGNOME`, sotto compaiono i pazienti **dello studio già
scelto al primo passo** il cui cognome combacia. Ogni riga porta: cognome e nome · codice · data
dell'ultimo lavoro. Toccarne una **attacca il lavoro a quella scheda** e sostituisce le tre caselle con la
conferma («Ranucci Marta · PZ-0412»), con un modo esplicito per disfare («Non è lei? Cerca un altro
paziente»). Ignorare i suggerimenti e proseguire crea il paziente nuovo, come oggi.

**Portata: solo lo studio scelto.** `pazienti.cliente_id` è **NOT NULL** (`supabase/schema.sql:458`): un
paziente **appartiene a uno studio**. La stessa persona che arriva da due dentisti resta **due schede** —
due rapporti distinti, non un doppione da combattere. Ne segue che **la metà «dentista» di D6 decade**:
dentro un solo studio il dentista non disambigua nulla, restano nome proprio, codice e data.

**Contratto API.** Oggi `GET /api/pazienti?cliente_id=` restituisce **fino a 500 righe** con
`nome, cognome, nome_cognome, data_nascita, codice_fiscale, sesso, note`
(`src/app/api/pazienti/route.ts:31-36`).

🛑 **Quella proiezione non si manda al browser per una ricerca.** Serve una **proiezione stretta** — solo
`id, codice_paziente, cognome, nome` più la data dell'ultimo lavoro — perché la ricerca è una superficie che
si apre a ogni tasto premuto. Due strade, da scegliere nel piano con la prova in mano:
**(a)** parametro `q=` sull'endpoint esistente **con proiezione ridotta quando `q` è presente** (nessun
client rotto: `crea-lavoro.ts:213` legge `codice_paziente`, che resta); **(b)** endpoint dedicato
`GET /api/pazienti/cerca`. ⚠️ In entrambi i casi il filtro `laboratorio_id = labId` e
`.eq('cliente_id', …)` **non si toccano**: sono l'isolamento.

**La data dell'ultimo lavoro non esiste ancora come dato leggibile qui.** Va presa da `lavori` (max
`data_ingresso` o `updated_at` per `paziente_id`) — **una query in più, non un campo esistente**: il piano
la progetta, e se costa troppo si degrada mostrando solo il codice, **dichiarandolo**.

---

## 6. Il codice paziente (D12)

**Resta modificabile**, e lo è già oggi: casella nel wizard · casella nella scheda paziente
(`PazienteEditSheet.tsx:182-184`) · campo nell'allowlist del server (`api/pazienti/[id]/route.ts:35`).
Coerente con la direttiva permanente «ogni campo del lavoro si corregge, fino alla consegna».

**Ma nessuno controlla che sia unico**, e questa ondata lo chiude su due piani:

1. **Nel database — la sede giusta.** Indice unico **parziale** su `(laboratorio_id, codice_paziente)`,
   `WHERE codice_paziente IS NOT NULL AND deleted_at IS NULL`.
   🔑 **Unico per LABORATORIO, mai globale:** un vincolo globale farebbe fallire l'inserimento di un
   laboratorio per colpa di un altro — un canale laterale fra tenant, cioè una fuga di informazione.
   ⚠️ **Prima si conta**: se in banca dati esistono già coppie duplicate, la migration **aborta** — e una
   migration che aborta resta un problema anche su dati di test (blocca il deploy, disallinea il ledger).
   Il piano esegue il conteggio **prima** di scrivere la migration, e incolla il numero.
2. **A schermo.** Se si scrive un codice già in uso, UÀ **lo dice** invece di attaccarsi in silenzio alla
   scheda sbagliata: «Questo codice è di Ranucci Marta. Vuoi il suo lavoro, o è un'altra persona?».
   🔑 Chiude anche il difetto della **bozza ferma**: una bozza di ieri riaperta oggi può portare un codice
   che nel frattempo qualcun altro si è preso.

⚠️ **Sui documenti già emessi il codice vecchio resta.** La Dichiarazione di Conformità congela (giusto:
Art. 10(8) MDR); etichetta e ricevuta leggono il dato vivo, quindi una ristampa esce col codice nuovo —
**ma l'etichetta già attaccata alla cassetta no**. Quando si cambia il codice di un paziente con lavori già
consegnati, va detto a schermo. (Superficie: scheda paziente → **fuori perimetro D1**, tracciato.)

---

## 7. La bozza del wizard: `v:1` → `v:2`

`persistenza.ts:12-24` salva `alias`, `elemento`, `colore` e un `passo` che oggi vale 1-3; `leggiStato:69`
accetta `parsed.v !== 1 → null`. Questa ondata **toglie quei campi e cambia il significato del numero di
passo**: una bozza di oggi, ripresa domani, si riverserebbe in un wizard con passi diversi.

**Decisione:** `v:2`, e la bozza `v:1` **si scarta in silenzio** (`leggiStato` già restituisce `null` per
una versione che non riconosce, e la chiave viene rimossa). Motivo: migrarla richiederebbe di indovinare a
quale passo nuovo corrisponda il vecchio «passo 3», e il costo di sbagliare (un lavoro creato con i dati di
un altro) è più alto del costo di ridigitare un wizard abbandonato da meno di 24 ore.
**Il nuovo `StatoSalvato` porta:** `v:2` · `salvatoA` · `userId` · `labId` · `passo` (indice nella sequenza
**calcolata**, non assoluto) · `cliente` · `tipo` · `pz` · `cognome` · `nome` · `pazienteIdScelto` · `denti`
· `colori`. ⚠️ La `foto` resta **fuori** (un `File` non è serializzabile): perdita accettata, come oggi.

---

## 8. Il wizard adattivo (W2, W17)

La sequenza: dentista → tipo → paziente → **[denti]** → **[colore]** → **foto** → **[cassetta]** → Fatto.

- **Quali domande compaiono lo decide il TIPO** (W2); **quando compaiono, si possono rimandare** con «Lo
  scrivo dopo» (W17). Sono **due leve distinte**.
- La tabella dei 38 tipi con «prevede denti / colore / arcata» **esiste già scritta** nel verbale del 27/07
  §6-quater (riga 352 e seguenti) ma **non è nel codice**: `TIPI_LAVORO` (`src/lib/domain/tipi-lavoro.ts`)
  porta oggi solo `id, tile, aliases, macro, classeRischio, giorniFallback` — **verificato**. Va estesa.
- **Casi di prova dell'adattività, già scritti nel verbale:** `anti_russamento` e `duplicato_protesi` non
  mostrano **nessuna** delle tre domande; `overdenture` le mostra tutte.
- **La foto NON è condizionale** (D8): è l'unica ragione per cui i due tipi qui sopra non restano senza
  fotocamera.

---

## 9. Denti, colore, cassetta — cosa vale già

**Denti** (W15, W18): odontogramma rifatto in v3, sagome ricavate dalle illustrazioni di Francesco (la
catena che le genera è in `scripts/design/`), una arcata alla volta su telefono, due arcate più fila su
tablet. Selezione = contorno che segue il dente; in scuro azzurra, mai grigia. `OdontogrammaFDI.tsx` (v2.3,
1054 righe) **muore come sostituzione**, non come rimozione.

**Colore** (W19 + D3): non si mostrano le arcate, si mostrano **solo i denti scelti**, raggruppati in
«Sopra»/«Sotto». Ricerca sempre presente, due scale in linguette.
🛑 **Il catalogo è chiuso** (D3): si sceglie da due liste, **un codice che il sistema non conosce non
esiste**. Nessuna validazione di «codice sconosciuto» da progettare, e nessun testo libero.
⚠️ L'elenco si legge dal **catalogo vivo** (`colori_dentali`, 48 codici), **mai** da una lista scritta a
mano: è esattamente lo scollamento che sulla scheda del lavoro produce oggi la casella vuota.

**Cassetta** (W4): ultimo passo, saltabile («il pacco non è ancora arrivato»); i lavori senza cassetta
devono restare visibili.

---

## 10. «Dimmelo a voce» esce (D13)

Censimento eseguito (R-P6) — **4 usi, 2 test, 1 regola**: `PassoDentista.tsx:29,93` ·
`PassoTipo.tsx:34,116` · `PassoPaziente.tsx:32,118` · `ds-v3-catalogo/page.tsx:41,78,1084-1088` ·
`tests/unit/ds-v3/componenti/PillVoce.test.tsx` (intero) · `tests/unit/PassoTipo.test.tsx:191` — **questo
fallisce subito** se si toglie il componente senza toccarlo · **DS v3 §5.15**, che oggi prescrive «PillVoce
sempre in fondo a ogni passo del wizard».
Il componente `src/components/ds/PillVoce.tsx` (254 righe) **si cancella**. Da verificare nel piano se
restano orfani la coreografia `motion.ts:56` e il token `pillVoce` di `v3/tokens.ts`: **un token orfano non
si lascia**, è la stessa specie delle dichiarazioni morte già rimosse tre volte.

---

## 11. I due scrittori da correggere

1. `crea-lavoro.ts:229-230` — `nome: ''`, `cognome: alias || pz` **fissi**. Diventano i valori digitati,
   passati **come sono**: la regola di scrittura vive già sul server
   (`api/pazienti/route.ts:110-124`, `cognomeEffettivo` poi `risolviNomePaziente`) e **non si riscrive**.
   🛑 Invarianti da non rompere: **mai `null`** (il trigger `sync_paziente_nome_cognome` compone solo se
   entrambi sono non-null, e `nome_cognome` è NOT NULL → 500 alla creazione); e **mai** lasciare il codice
   fuori da `nome_cognome` senza ripiego (la catena `??` di `precheck.ts:40-43` si ferma su `' '`, che non è
   nullish → lavoro **non consegnabile**).
2. Quando si sceglie un paziente esistente, il wizard manda il suo `id` e **non crea nulla**.

---

## 12. Le prove da scrivere PRIMA di dire «fatto»

| # | Rischio | Prova |
|---|---|---|
| **B1** | La ricerca mostra pazienti di un altro laboratorio | richiesta con `cliente_id` di un altro tenant → **404/lista vuota**, byte per byte identica a quella per un id inesistente (non enumerabile) |
| **B2** | La ricerca manda al browser dati che non servono | asserzione sulla **forma della risposta**: le chiavi sono esattamente `id, codice_paziente, cognome, nome, ultimoLavoro` — un test che fallisce se qualcuno riaggiunge `codice_fiscale` |
| **B3** | Due pazienti con lo stesso codice | INSERT che **deve** essere rifiutato dall'indice unico, con il messaggio incollato · e il **controllo positivo**: lo stesso codice in **due laboratori diversi** deve passare |
| **B4** | Due caselle che non arrivano a nulla | test che, dato cognome e nome digitati, il corpo spedito a `POST /api/pazienti` li porta **entrambi** — il difetto §1.2 riprodotto prima di correggerlo |
| **B5** | La bozza vecchia si riversa nel wizard nuovo | `leggiStato` su un payload `v:1` → `null` **e chiave rimossa** |
| **B6** | I passi mentono | per ogni tipo della tabella dei 38: la sequenza calcolata contiene esattamente i passi previsti — con i tre casi di prova del verbale (`anti_russamento`, `duplicato_protesi`, `overdenture`) |
| **B7** | «Dimmelo a voce» sopravvive da qualche parte | grep di guardia: zero occorrenze di `PillVoce` in `src/` e `tests/` |
| **B8** | Bersagli sotto il minimo | Playwright a 390/768/1280 × chiaro/scuro: ogni dente ≥ 44×44, **tasto primario dentro il viewport con la tastiera aperta**, briciole non mandate a capo |
| **B9** | Il testo al 200% | ⚠️ controllo **mai eseguito davvero** (il mockup usava px fissi): va rifatto **sul device** |
| **B10** | Il salto di larghezza stordisce | passaggio colonna stretta → passo denti largo **e ritorno col tasto indietro**, guardato a 768 e 1280: nessun sobbalzo, nessun contenuto che si riposiziona due volte |

---

## 13. Migration

Una sola, piccola: **indice unico parziale** su `(laboratorio_id, codice_paziente)`.
**Reversibile** (`DROP INDEX`). **Precondizione da verificare prima di scriverla:** zero coppie duplicate in
banca dati — il conteggio si esegue e si incolla. FASE 6b (`supabase gen types` + `tsc --noEmit`) va
eseguita comunque, anche se un indice non cambia i tipi generati: costa 30 secondi e chiude il dubbio.

---

## 14. Gate FASE 3 — le cinque risposte

1. **Tenant isolation.** Non si toccano policy RLS. `pazienti` è già protetta da
   `laboratorio_id = public.current_lab_id()` (`schema.sql:487-493`), e la route filtra per `labId`. 🔑 Il
   punto di attenzione **non** è la lettura ma il **vincolo**: unico per laboratorio, mai globale (§6).
2. **Schema drift.** Sì: una migration (§13). FASE 6b prevista.
3. **Contratto API.** La proiezione ridotta arriva **solo** quando è presente `q`, quindi
   `crea-lavoro.ts:213` (che legge `codice_paziente`) non si rompe. Il `POST /api/pazienti` non cambia
   forma: cambia **chi lo chiama e con quali valori**.
4. **Rollback.** UI: revert del commit. Migration: `DROP INDEX`. Dati: nessun backfill distruttivo — e
   comunque i dati in banca dati sono **di test** (`ua-app/CLAUDE.md` §8), quindi il rischio è sul
   *comportamento*, non sul *dato*.
5. **Dominio critico?** **Sì → percorso GRANDE**, per due ragioni indipendenti: c'è una **migration**
   (override esplicito della tabella di selezione) e si tocca il trattamento di **dati sanitari** con una
   deroga alla regola di pseudonimizzazione (D7).

---

## 15. Le superfici e il loro stato di approvazione visiva (§0B)

| superficie | mockup | stato |
|---|---|---|
| passo paziente + ricerca | `2026-07-28-wizard-passo-paziente.html` | ✅ **approvato** (variante A) — visto ai **tre tagli veri** (390/768/1280) in vista «schermo intero», chiaro e scuro |
| avanzamento dei passi | `2026-07-28-wizard-avanzamento-passi.html` | ✅ **approvato** (variante 3) |
| passo denti / colore | mockup del 27/07 | ✅ approvato allora (W15, W18, W19) |
| **passo foto** | — | 🛑 **manca**: D8 lo rende un passo nuovo, e un passo nuovo vuole la sua anteprima |
| **passo cassetta** | — | 🛑 **manca** |
| **avviso «codice già in uso»** | — | 🛑 **manca** (§6) |

🛑 **Le tre superfici marcate non si scrivono in React prima del loro mockup approvato.** Il piano le mette
dietro un gate, non in coda.

---

## 16. Cosa NON è verificato

- **Quanto tornano davvero i pazienti allo stesso studio.** È il numero da cui dipende il valore di tutta
  la ricerca, e non lo sa nessuno: nessuna fonte, nessuna misura. Dichiarato, non stimato.
- **Se esistano coppie `(laboratorio_id, codice_paziente)` già duplicate** in banca dati: da contare prima
  della migration (§13).
- **Il costo della query «ultimo lavoro»** per riga di suggerimento (§5).
- **Il testo primario dell'Allegato XIII** è stato letto tramite documentazione di progetto
  (`../ANALISI/`), non su EUR-Lex: la conclusione «il codice basta» regge su quella trascrizione.
- **Il dato «912 pazienti su 915 senza nome»** citato altrove resta **non verificato**.

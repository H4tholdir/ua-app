# Spec — D42, le tinte del manufatto

**Stato:** ratificata da Francesco in sessione (D42 · **D109-D118**) · 🔄 **§5 emendata da D121 (03/08/2026):
il passo del wizard esce da questa ondata, restano due superfici**
**Verbale:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, tornate **35**, **36** e **38**
**Dimensione:** **GRANDE, con migration** → percorso BP-2 pieno (`ua-app/CLAUDE.md` §0C)
**Precede:** i mockup (§0B) → il piano (`writing-plans`, con R-P1 · R-P2 · R-P6) → il ramo

---

## 0. Che cos'è, in una riga

Tre tipi di lavoro su 38 hanno un colore che **non è dentale** — la resina di una placca ortodontica e
di un apparecchio funzionale, la mescola colorata di un paradenti sportivo. Oggi quel dato **non si può
registrare**: il catalogo dei colori contiene solo scale dentali, e D3 vieta di inventare un colore fuori
catalogo. Questa ondata gli dà una casa.

---

## 1. Il perimetro — che cosa NON è

🛑 Dichiarato prima del resto, perché è la parte che si allarga da sola.

| fuori | perché |
|---|---|
| **Il selettore del colore DENTALE per dente** (odontogramma, tre zone del ceramista) | È eredità aperta dell'ondata (b), non di questa. D112 la lascia dove è nata |
| **La tinta sulla Dichiarazione di Conformità** | **D101**: la norma non nomina il colore; la riga scoperta del documento è il «prescritto», che è la voce 9 di roadmap. Se un giorno si vorrà, serve un panel normativo |
| **La tendina della scheda che offre 19 codici su 48** | Difetto preesistente e censito (`TabClinica.tsx:8-14`): riguarda i colori **dentali**, non le tinte. Si tocca solo se il lavoro ci passa sopra, e allora si riferisce (R-E2) |
| **L'avviso alla consegna se la tinta manca** | Ha una **dipendenza dura** non risolta: l'avviso dovrebbe sapere che *quel tipo* prevede una tinta, e sul lavoro è salvata solo la categoria grossa, che mescola la placca (tinta sì) con la contenzione (tinta no). Voce 2 di roadmap |
| **Tinte multiple, effetti, stratificazione interno/esterno del paradenti** | **D109**: una tinta sola, da elenco. Non si prevede la molteplicità «per dopo» |
| **Tinte aggiunte dal singolo laboratorio** | **D110**: catalogo chiuso. Prezzo dichiarato e accettato |

---

## 2. Il censimento — che cosa c'è davvero, misurato aprendo i file

🔑 Tutto ciò che segue è stato **verificato aprendo il file il 03/08**, non ricordato. Tre riferimenti che
i documenti riportavano erano invecchiati dopo il rilascio degli accenti.

| fatto | dove | marchio |
|---|---|---|
| `colori_dentali` è un catalogo **pubblico in sola lettura**, senza `laboratorio_id` e **senza RLS**; PK `(scala, codice)`; 48 codici in tre scale; `hex` lasciato `NULL` **di proposito** | `supabase/migrations/20260727120000_lavori_denti.sql:11-25` | `provato:` letto |
| **Cinque** chiavi esterne vi puntano: `lavori.(colore_scala, colore_codice)`, `lavori_denti.(scala, codice)` e le **tre zone** collo/corpo/incisale | `…20260727120200_lavori_colore_caso.sql:16,30-32` · `…20260727120100_lavori_denti_tabella.sql:71` | `provato:` letto |
| Nel catalogo dei 38 tipi: **26** `catalogo`, **3** `libero`, **10** `nessuno` | `src/lib/domain/tipi-lavoro.ts` | `provato:` `grep -o … \| sort \| uniq -c` |
| I tre `libero` sono `placca_espansione`, `apparecchio_funzionale` (macro **`ortodonzia`**) e `paradenti` (macro **`bite_splint`**); tutti e tre `prevedeDenti: false`, `prevedeArcata: true`, `classe_i` | `src/lib/domain/tipi-lavoro.ts:70,71,76` | `provato:` letto |
| **Gli altri tipi delle due macro hanno `prevedeColore: 'nessuno'`** — `contenzione` e `allineatori` sotto `ortodonzia`; `bite_michigan`, `bite_morbido`, `anti_russamento` sotto `bite_splint` | `src/lib/domain/tipi-lavoro.ts:72-77` | `provato:` letto |
| `'libero'` **non apre nessun passo** oggi: confronto stretto `=== 'catalogo'`, con un commento che cita D42 per nome | `src/lib/wizard/sequenza-passi.ts:89` | `provato:` letto |
| Nel wizard **il passo del colore non esiste per nessun tipo**: la procedura finisce a `PassoPaziente`, dove il colore è **testo libero** (`colore: string`) | `src/components/features/wizard/WizardNuovoLavoro.tsx:533-544` · `PassoPaziente.tsx:41-42` | `provato:` letto |
| `tipo_dispositivo` **è già** in `PATCHABLE_FIELDS` — quindi il tipo si cambia dall'API | `src/app/api/lavori/[id]/route.ts:179` | `provato:` letto |
| `colore_scala`/`colore_codice` sono in allowlist **ma passano da un blocco di normalizzazione** dentro la PATCH, non arrivano grezze all'UPDATE | `src/app/api/lavori/[id]/route.ts:207-211` | `provato:` letto |
| Il rifacimento **clona già** il default di caso del colore | `crea_rifacimento_atomico`, `…20260728103000_rifacimento_clona_denti_colore.sql:68,116,138` | `provato:` letto |
| Entrambe le pagine del lavoro si dichiarano **v3** (`data-ds="v3"`), anche quella di modifica che dentro ha ancora moduli legacy | `src/app/(app)/lavori/[id]/page.tsx:73` · `…/modifica/page.tsx:94` | `provato:` letto |

### 🔑 Il fatto che corregge il panel del 28/07

Il panel dava per **impossibile** legare una tinta al tipo di lavoro, «perché l'id fine dei 38 tipi non è
persistito». Vero per l'id fine — **ma la divisione resina/sport cade esattamente sulla categoria grossa**,
che sul lavoro c'è:

- gli **unici** tipi `ortodonzia` con una tinta sono i due a resina;
- l'**unico** tipo `bite_splint` con una tinta è il paradenti.

Quindi il pericolo che il panel temeva — scrivere `('sport','rosso')` sulla riga-dente di una corona — si
può fermare **nel database**. È la lezione ⑥ («le affermazioni portanti di un panel si riverificano»)
applicata a un panel di casa.

⚠️ **Il prezzo, dichiarato due volte perché non si perda:** il vincolo resta **largo**. Sa dire «questa
tinta non c'entra con un lavoro di ortodonzia»; **non** sa dire «la contenzione non ha colore» — quella
resta una regola di schermo. E se un domani un tipo con tinta nascesse sotto un'altra categoria grossa,
la corrispondenza va rifatta: **è un accoppiamento, non una legge.**

---

## 3. Il catalogo `tinte_manufatto`

### 3.1 La forma

Catalogo **pubblico in sola lettura**, esattamente come `colori_dentali`: nessun `laboratorio_id`, nessuna
RLS, popolato dalla migration. **D110.**

| colonna | che cos'è |
|---|---|
| `famiglia` | `'resina_ortodontica'` oppure `'sport'`, con CHECK |
| `codice` | la chiave stabile, **mai mostrata** (`rosa`, `trasparente`, `glitter_argento`) |
| `nome` | l'etichetta italiana che si legge («Rosa», «Glitter argento») |
| `ordine` | il posto nell'elenco |
| `hex` | il pallino — **`NULL` dove un colore piatto mentirebbe** (D114) |

Chiave primaria `(famiglia, codice)`.

🔑 **Perché `codice` e `nome` sono due colonne e non una.** In `colori_dentali` il codice *è* il nome:
«A3» si scrive e si legge uguale, e una seconda colonna sarebbe un doppione. Qui no. Il `codice` è ciò
che resta scritto sul lavoro; se un giorno l'etichetta cambia («Rosa» → «Rosa intenso»), con due colonne
cambia solo ciò che si legge e **i lavori già salvati restano validi**. Con una sola colonna, rinominare
significherebbe rompere ogni lavoro che l'aveva scelta — su una scheda conservata dieci anni.

🔵 **`hex` nullable, e il vuoto è un'informazione.** Trasparente, glitter e perlato non hanno un colore
piatto: restano col solo nome. È la stessa scelta già scritta in `colori_dentali`, dove quella colonna è
vuota di proposito con la ragione accanto — *una tinta inventata su un dispositivo medico non è un
segnaposto innocuo.*

### 3.2 Il contenuto — **decisione di Francesco (D116), non ricerca**

🛑 **Lo statuto di queste due liste è diverso, e chi le legge deve poterlo distinguere.**

**`sport` — ricalca una gamma reale.** I nomi traducono i colori standard dei dischi **Erkoflex**
(Erkodent): [gamma pubblicata](https://glidewelldental.com/solutions/in-office-thermoforming/thermoforming-discs/erkoflex-thermoforming-discs).

> Trasparente · Bianco · Nero · Blu · Azzurro · Blu scuro · Rosso · Rosso scuro · Verde · Verde scuro ·
> Giallo · Arancione · Rosa · Lilla · Bordeaux · Oro · Argento *(17 voci)*

**`resina_ortodontica` — è una lista NOSTRA.** Le pagine Dentaurum descrivono le **famiglie** della gamma
Orthocryl — toni classici, neon, varianti glitter «Disco-Glimmer», bianco e nero, trasparente
([pagina prodotto](https://www.dentaurum.de/lp/ita/orthocryl.aspx)) — **ma non un elenco di nomi**. La
lista sotto non è di un fornitore: è stata proposta e **presa così da Francesco**, quindi vale come sua
decisione esplicita (quarta prova dello statuto delle fonti), **non** come gamma commerciale accertata.

> Trasparente · Rosa · Rosso · Blu · Azzurro · Verde · Giallo · Arancione · Viola · Bianco · Nero ·
> Glitter argento · Glitter oro · Glitter multicolore · Neon verde · Neon rosa · Neon arancione *(17 voci)*

**Senza pallino** (`hex NULL`): Trasparente in entrambe le famiglie, e i tre Glitter.

---

## 4. Il dato sul lavoro

### 4.1 Due colonne e tre vincoli

Su `lavori` nascono `tinta_famiglia` e `tinta_codice`. **D115.**

| vincolo | che cosa rifiuta |
|---|---|
| **la coppia** — `(tinta_famiglia IS NULL) = (tinta_codice IS NULL)` | mezza tinta: una famiglia senza codice o un codice senza famiglia. Stessa regola già in vigore per il colore di caso |
| **l'aggancio al catalogo** — FK composita `(tinta_famiglia, tinta_codice) → tinte_manufatto (famiglia, codice)` | una tinta che non esiste, anche se arriva dall'API e non dalla schermata |
| **la famiglia contro il tipo** — CHECK di riga su `tinta_famiglia` e `tipo_dispositivo` | una tinta sportiva su un lavoro di ortodonzia e viceversa. **È D111**, ed è possibile solo perché entrambe le colonne stanno sulla **stessa riga** |

La corrispondenza: `resina_ortodontica` ↔ `ortodonzia` · `sport` ↔ `bite_splint`. La forma resta permissiva
sul `NULL`: un lavoro senza tinta passa sempre, qualunque sia il tipo (**D113**).

`non eseguito` — il DDL vero lo scrive il piano, e lo **prova con un valore che DEVE essere rifiutato**
(§6).

### 4.2 Il rifacimento se la porta dietro

`crea_rifacimento_atomico` copia già `colore_scala`/`colore_codice` dal lavoro originale: la tinta segue
la stessa strada, nella stessa funzione.

🔑 **Non è una comodità, è la riparazione di un difetto già pagato:** nel collaudo dell'ondata (a) il
difetto più grave trovato è stato proprio il rifacimento che **perdeva denti e colore**. Un paradenti
rifatto deve nascere con la tinta dell'originale.

### 4.3 Entra nell'elenco dei campi correggibili

`tinta_famiglia` e `tinta_codice` entrano in `PATCHABLE_FIELDS`, **nello stesso lavoro in cui nascono**.

🛑 Non è burocrazia. La PATCH **scarta in silenzio** ogni chiave fuori allowlist — nessun errore, nessun
422: l'utente legge «Salvato» su un dato che non c'è. Sedici campi sono fuori con la motivazione «nessuno
li scrive nel form» (censimento del 27/07, `ua-app/CLAUDE.md` §9 — il numero va riconteggiato quando si
apre il file), ed è un buco che aspetta. Un campo nuovo che non entra lì **nasce già rotto**.

Le due chiavi passano per un **blocco di normalizzazione** dentro la PATCH — non arrivano grezze
all'UPDATE — con la stessa forma già in uso per il colore di caso.

### 4.4 Il cambio di tipo — **D117**

Se una PATCH cambia `tipo_dispositivo` verso una categoria incompatibile con la tinta presente:

1. il server **toglie la tinta** (entrambe le colonne a `NULL`) nella stessa scrittura;
2. la risposta **lo dichiara** con un campo dedicato;
3. la schermata lo dice all'utente: «ho tolto la tinta, non c'entrava col nuovo tipo».

🔑 **Perché serve, misurato:** `tipo_dispositivo` è già correggibile dall'API. Senza questo trattamento
il CHECK di §4.1 farebbe fallire una correzione **legittima**, e l'utente leggerebbe un errore grezzo del
database su un gesto che aveva ragione di fare.
🛑 **Il confine:** togliere sì, **in silenzio mai**. Una perdita non dichiarata è peggio di un salvataggio
fallito — è la classe di difetto che questo progetto ha già chiamato per nome.

---

## 5. Le tre superfici — **D118**

> 🔄 **EMENDATA il 03/08/2026 da D121 — per RINVIO, non per revoca.** Le superfici restano tre, ma **il
> passo del wizard esce da questa ondata**: nasce dentro l'ondata che costruisce le schermate del wizard,
> accanto a denti · colore · foto · cassetta. **D42 si chiude con due superfici** — pagina di modifica e
> scheda.
> 🔑 **Il fatto che l'ha imposto:** D112 e D118 davano per esistente un'impalcatura di passi a cui
> agganciarsi. Non esiste — `provato:` `WizardNuovoLavoro.tsx:50-59` → `passo: 1 | 2 | 3`, un numero; i
> moduli `src/lib/wizard/passi.ts` e `src/lib/wizard/sequenza-passi.ts` **li usano solo i loro test**. E la
> spec dell'ondata (b) §4 elimina il blocco «Se vuoi, aggiungi» del passo paziente, dove elemento e colore
> **diventano passi propri**: qualunque scorciatoia dentro quel blocco arrederebbe una stanza già
> condannata. Verbale: tornata **38**.

| superficie | che cosa fa | sistema grafico |
|---|---|---|
| **Passo del wizard** 🔄 **RINVIATO (D121)** | Compare **solo** per i tre tipi. Tavolozza semplice: niente denti, niente zone del ceramista. **Saltabile** (D113). **Non in questa ondata** | v3 |
| **Pagina di modifica** `/lavori/[id]/modifica` | Dove si **corregge**. Senza questa il campo non è finito (direttiva del 27/07) | La pagina si dichiara già `data-ds="v3"`: le parti nuove si scrivono con i componenti di `src/components/ds/`, **non** copiando lo stile dei moduli legacy accanto |
| **Scheda del lavoro** `/lavori/[id]` | Si **legge** e basta: al banco si apre il lavoro e si vede «Tinta: Rosa» | v3 |

🔑 **Il passo del wizard è il primo passo vero oltre i tre esistenti**, quindi porta con sé l'impalcatura —
entrata, ritorno, salto. Quell'impalcatura **servirà anche ai ~~26~~ 25 tipi con colore dentale**
(🔄 **numero corretto da D121**: `provato:` conteggio su `tipi-lavoro.ts` escludendo la riga 11, che è la
definizione del tipo e non un tipo di lavoro — **25** `'catalogo'` + **3** `'libero'` + **10** `'nessuno'`
= **38**), che sono
l'eredità aperta dell'ondata (b): non si costruisce per loro, ma si costruisce in modo che **regga anche
il loro caso** invece di dover essere rifatta.
🔄 **E proprio per questo D121 lo ha rinviato:** quell'impalcatura non è la coda di D42, è il corpo di
un'altra ondata — pallini a numero variabile (`ProgressDots.tsx:43` è cablato a tre), bozza a versione
nuova con un'etichetta **diversa da `v:2`, già prenotata** dalla spec dell'ondata (b) §7, testi della
ripresa riscritti (`RipresaSheet.tsx:59-75`) e il punto in cui nasce il lavoro spostato. Costruirla per un
passo solo la farebbe pagare due volte.

### 5.1 🛑 §0B senza sconti — i mockup prima del React

Prima di qualunque componente: mockup HTML in `docs/design/mockups/`, dati veri simulati, **più varianti
fra cui scegliere** (mai una sola — preferenza permanente), su **390 / 768 / 1280** e in **chiaro e scuro**,
con screenshot. Francesco sceglie, e solo dopo si scrive React.

**Domanda lasciata aperta APPOSTA per il mockup:** con 17 tinte per famiglia, la tavolozza su 390 px
diventa lunga. Almeno due strade — griglia di pastiglie col pallino, oppure elenco raggruppato per
famiglia di colore. Si portano **disegnate tutte e due**, non descritte.

**Gate estetico L2 (FASE 9b) obbligatorio** prima del merge: questa ondata tocca superfici con UI.

---

## 6. Come si prova

🔑 **La regola che governa tutto questo capitolo:** un vincolo si prova **con un valore che DEVE essere
rifiutato**, col messaggio d'errore incollato. Una migration che gira prova la sintassi, non il
comportamento.

| che cosa | come si prova |
|---|---|
| il vincolo di famiglia (D111) | tinta `sport` su un lavoro `ortodonzia` → **deve** essere rifiutata, errore incollato. E il caso simmetrico. Su transazione annullata, **mai** su una migration registrata |
| il vincolo di coppia | famiglia senza codice → rifiutata |
| l'aggancio al catalogo | tinta inesistente → rifiutata |
| il `NULL` resta ammesso (D113) | lavoro senza tinta di **qualunque** tipo → accettato. Senza questo, il vincolo potrebbe essere troppo stretto e nessuno se ne accorgerebbe |
| il cambio di tipo (D117) | PATCH che cambia il tipo su un lavoro con tinta → salvataggio **riuscito**, tinta a `NULL`, **e il campo che lo dichiara presente nella risposta**. Le tre asserzioni sono tre |
| il rifacimento | rifacimento di un paradenti con tinta → il nuovo lavoro **ha** la stessa tinta |
| il passo del wizard 🔄 **RINVIATO (D121)** | compare per i **tre** tipi e **non** compare per gli altri 35. L'asserzione negativa vale quanto quella positiva. **Si scrive nell'ondata delle schermate del wizard, non qui** |
| la correzione arriva in fondo | dopo la PATCH si **rilegge dalla banca dati**: che la risposta dica «ok» non prova che il dato ci sia (è esattamente il difetto dell'allowlist silenziosa) |
| l'errore che torna al client | **non** il messaggio grezzo del database. C'è una voce aperta su 76 punti che lo fanno: non se ne aggiunge un settantasettesimo |

**FASE 7 per intero, output incollato:** `tsc --noEmit` · `vitest run` · `next build`. I tre comandi sono
tre — `tsc` non vede la firma degli handler di rotta.
**FASE 6b dopo la migration:** `supabase gen types` + `tsc`. La CLI funziona da qui; il CI **non** applica
le migration, si fanno a mano.

---

## 7. Il gate architetturale (FASE 3)

| domanda | risposta |
|---|---|
| **Isolamento fra laboratori** | Il catalogo è **pubblico e senza RLS**, come `colori_dentali` — non contiene dati di nessuno. Le due colonne nuove stanno su `lavori`, già coperta dalle sue RLS: **nessuna policy nuova, nessuna toccata** |
| **Schema drift** | Sì, c'è una migration → `supabase gen types` + `tsc` **obbligatori** (FASE 6b) |
| **Contratto API** | **Additivo**: due chiavi nuove in allowlist e un campo nuovo, opzionale, nella risposta della PATCH. Nessun client esistente se ne accorge. ⚠️ L'unico cambio di **comportamento** è D117 — una PATCH che prima falliva ora riesce togliendo la tinta |
| **Come si annulla** | Il catalogo si svuota e le due colonne si eliminano: nessun altro dato ci passa attraverso. ⚠️ I lavori che avessero già una tinta la perderebbero — su dati veri sarebbe da pesare, sul banco di prova no |
| **Dominio critico?** | Non tocca RLS, Stripe, FatturaPA né l'accesso. **Ma c'è una migration**, e la dimensione (3-10 file, UI + dato + API) porta comunque al percorso **GRANDE** |

---

## 8. Domande aperte — dichiarate, non nascoste

1. **La forma della tavolozza a 390 px** — griglia o elenco raggruppato. Si decide **sul mockup**, non qui.
2. **Se un tipo con tinta nascesse sotto un'altra categoria grossa**, la corrispondenza famiglia↔macro di
   §4.1 va rifatta. Non è un problema oggi; è una nota per chi aggiungerà un tipo.
3. **La lista della resina non ha una fonte esterna** (D116): se un giorno si vorrà allinearla a una gamma
   commerciale vera, servirà il catalogo del fornitore, non una ricerca sul web.

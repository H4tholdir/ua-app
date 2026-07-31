# Handoff — l'uscita degli strati e le riparazioni della DdC sono in produzione

**Per:** la sessione nuova, a contesto pulito.
**Stato del ramo:** `main` = **`c0754abe`**, allineato con `origin` (zero commit da pubblicare), albero pulito.
CI verde, deploy Vercel `success`, https://uachelab.com risponde.
**Non c'è niente da riprendere a metà.**

⚠️ **Nota sulla data.** L'orologio della macchina dice **31 luglio**, i documenti del progetto **2-3 agosto**.
Il nome di questo file segue i documenti; dove una data non serviva non l'ho inventata. **Da controllare sul Mac.**

---

## 0. 🔴 CIÒ CHE NON È STATO VERIFICATO, e va detto per primo

**Che una Dichiarazione di Conformità NUOVA nasca davvero con le sue due impronte, in produzione, NON è
stato provato.**

`provato:` le due colonne si scrivono — `src/lib/pdf/generate-ddc.ts:170-172` le mette nell'`INSERT`, e sette
prove nuove in `tests/unit/generate-ddc.test.ts` girano contro il **generatore vero** (non una finta) e
misurano il payload dell'inserimento. **Ma la catena completa in produzione no**: le impronte si scrivono solo
quando si **emette** una dichiarazione, cioè **consegnando un lavoro**. Consegnare in produzione emette
documenti veri, consuma un numero progressivo e cambia lo stato del lavoro — non era dentro il «merge e
deploy» autorizzato, quindi **non l'ho fatto**.

➡️ **Prima cosa della prossima sessione, se Francesco è d'accordo:** consegnare un lavoro del banco su
uachelab.com, verificare sulla riga vera che `payload_sha256` e `template_version` non siano `NULL`, e poi
**annullare la consegna** (`annulla_consegna_atomica` riporta il lavoro a `pronto` e la DdC resta `annullata`
come storia — `20260710090000:11-12`). È un giro completo e reversibile.

🛑 **E c'è una seconda cosa non misurata, più vecchia:** il **primo braccio** di
`scripts/guardia-navigazione-overlay.mjs` non gira da giorni — gli serve la fixture `E2E-CAS-002` preparata a
mano in banca dati (ricetta nell'intestazione dello script). Gli altri tre bracci sono **verdi**, compreso
quello dell'album.

---

## 1. Che cosa è successo, in breve

| | |
|---|---|
| **D99 · D100** | **I quattro strati sopra la foto ESCONO.** Uscita **simmetrica** (`molla.smooth`) — che è ciò che §5.39 diceva già: **nessun emendamento alla spec**. Lo strato in uscita **smette di prendere i tocchi** (`StratoRadice.tsx`, `useIsPresent`), lo scorrimento si rilascia a uscita finita (`useScorrimentoBloccato.ts`). D99 = deroga a §0B: niente anteprima, scelta di Francesco |
| **Correzione di fonte** | La proposta era stata portata come «l'uscita più svelta è quello che fa l'iPhone». **Falso:** è di **Material Design** (225 ms contro 195). Apple è **simmetrica per costruzione**; `.asymmetric` esiste perché l'asimmetria è il caso da dichiarare |
| **Il difetto trovato dall'OCCHIO** | I numeri erano verdi su 6 combinazioni. Un fotogramma preso **a metà uscita** ha mostrato i comandi (✕, pastiglia, ⋯) e il piede **a piena opacità** sopra la pagina che riaffiorava. Causa: il visore è fatto di **quattro fratelli** e solo due avevano un `exit`. Rimedio: la dissolvenza sul **pannello**, che li porta via insieme |
| **Guardia dei documenti** | I numeri a parole si **costruiscono** da 0 a 999 (1107 grafie, era 108 e finiva a «cento» **mentre il verbale arrivava a cento**). E «dichiarato ma illeggibile» non si traveste più da «non dichiarato»: era un avviso che diceva il **falso** |
| **D101** | 🛑 **SCARTATA** la composizione delle «caratteristiche prescritte» dai campi di caso. Demolita da un **panel di tre** |
| **D102** | **Fatte** le riparazioni indipendenti dal modello in movimento: le due impronte del documento, il PDF che smette di leggere dati vivi, la fotografia dei denti spostata (**migration applicata**). La quarta è **decaduta con motivo scritto** |
| **Fonti italiane** | Ricerca **rifatta in italiano** su richiesta di Francesco: MDR versione IT · D.Lgs. 137/2022 artt. 7 e 27 · modello DdC del **GL MDR SNO Veneto** per odontotecnici |
| **Correzioni ai documenti** | `ANALISI/17` §1.3: gli elementi **2 e 6** presentavano una **glossa nostra come norma** (e il 6 lo limitava alla Classe IIa — limite **inesistente**). `ANALISI/17` §1.2 e `../CLAUDE.md` §5: il «€48.500» ora porta le due letture (−1/3 microimprese, ISTAT biennale) |

Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centodue** decisioni.
La prossima è **D103**.

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① Una misura verde non è un giudizio. Guarda il fotogramma.**
Sei combinazioni di formato e tema davano velo giusto, tocchi giusti, corpo sbloccato al momento giusto. Il
difetto — metà dei comandi che non se ne andava — **era invisibile a ogni numero che avevo scelto di
misurare**, perché nessuno di quei numeri guardava i comandi. L'ha trovato uno screenshot preso *durante*
l'animazione. 🔑 Quando l'oggetto è **visivo**, la misura dice se il meccanismo gira, non se la cosa è giusta.

**② Prima di dire «obbligatorio», leggi la norma nella lingua che si applica — e distingui il testo dalla tua
lettura.** La roadmap diceva «il colore manca dalla DdC, possibile lacuna normativa». Il colore manca davvero,
ma **la norma non lo nomina**: la riga che lo elencava fra i contenuti obbligatori era **nostra**, scritta in
un documento di analisi e poi letta come se fosse legge. Da lì stava per nascere del codice.
🛑 **La regola operativa:** quando un documento interno elenca «i contenuti obbligatori» di qualcosa, quella
lista è **una lettura** finché non porta il testo accanto. Scrivili sempre in due colonne: *norma* e *nostra
lettura*.

**③ Un contratto permissivo non è generosità: è la causa radice.**
Il PDF congelato leggeva dati vivi in quattro punti. Non per distrazione: il tipo diceva
`ddc: Partial<DichiarazioneConformita>` — **tutto facoltativo** — quindi il template non poteva fidarsi di
niente e si ripiegava sul lavoro. Rimettere i ripieghi avrebbe curato il sintomo. **Stringere il contratto
sposta il guasto dalla carta al compilatore**, che è l'unico posto dove costa poco.

**④ Le prove che scrivi vanno sospettate come il codice.** Tre delle mie erano difettose: due
**tautologiche** (`expect(undefined).not.toBe(...)` — verdi sul difetto vivo) e una **falsa** (pretendeva la
stessa impronta da due emissioni, ma il payload contiene la data: due emissioni sono due documenti).
🔑 **Il gesto che le ha prese:** contare quante asserzioni si accendono sul difetto vivo (R-P4) **e guardare
quali NON si accendono**. Sono quelle il problema.

**⑤ Un elenco a mano che protegge un documento che cresce finirà prima del documento.** È successo **quattro
volte** allo stesso elenco (a «trentatré», «quaranta», «sessanta», e ora a «cento» — con il verbale arrivato
esattamente a cento). Il difetto non era la lunghezza: era che **la lunghezza fosse una scelta**. Si genera,
non si elenca. E si controlla anche **come** la rete si spegne: qui, «illeggibile» finiva nello stesso ramo di
«assente» e produceva un avviso che **diceva il falso**.

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **La verifica dal vivo delle due impronte** (v. §0) e il **primo braccio** della guardia overlay | §0 |
| 🟠 **2** | **Il dato «PRESCRITTO» non esiste in banca dati.** Materiale prescritto, ancoraggio su impianto: non persistiti. C'è il seme — `lavori_denti.provenienza` (`prescritto`/`eseguito`). Serve per **due righe distinte** sulla DdC: «indicate nella prescrizione» e «come realizzato». **È l'ondata che D101 rimanda** | verbale D101 |
| 🟠 **3** | **Tre questioni normative aperte, riferite e mai decise:** ① **Art. 21(2) — la dichiarazione va messa a disposizione del PAZIENTE**, da noi arriva solo al portale del dentista (**da ratificare, non da ereditare**); ② si scrive il **nome completo del paziente** dove l'Allegato XIII ammette «un acronimo o un codice numerico» (`generate-ddc.ts:93`); ③ `prescrizioni_digitali` **non ha firma del prescrittore né numero d'albo** | verbale, in coda alla tornata 31 |
| 🟠 **4** | **`tipo_dispositivo` ha 10 valori macro, ma le bandierine `prevedeDenti`/`prevedeColore`/`prevedeArcata` vivono sui 38 tipi FINI** (`src/lib/domain/tipi-lavoro.ts:44-81`) e **l'id fine non è persistito**. **5 macro su 10 si contraddicono al loro interno** (22 tipi su 38): un avviso basato sul macro si accende su ogni `abutment` e tace su ogni `paradenti`. 🔑 **È la dipendenza dura della voce «avviso su dente/colore mancanti»**: senza l'id fine, nessun controllo sa che cosa è **legittimamente vuoto** | `tipi-lavoro.ts` |
| 🟡 **5** | **`Sheet` non usa `useScorrimentoBloccato`** — condiviso e in produzione, fuori mandato (R-E2). Candidato all'unificazione | `src/components/ds/Sheet.tsx:203-294` |
| 🟡 **6** | **`PATCHABLE_FIELDS` esclude 16 campi** con la motivazione «nessun writer nel form React attuale», che la direttiva del 27/07 dichiara **non essere una ragione**. Fra questi `arcata` (D102 ④ è decaduta proprio perché la correzione vera è questa, non il singolo campo) | `src/app/api/lavori/[id]/route.ts:54-63` |
| 🟡 **7** | `norma_riferimento` **non è persistita affatto**: iniettata al volo nel template ed esclusa dall'insert. Entra nell'impronta del payload ma non nella riga | `generate-ddc.ts:117-119` |
| 🟢 **8** | Dall'ondata (b): `/lavori/[id]/modifica` con la galleria vecchia (D98) · **tredici overlay** che promettono `aria-modal` senza mantenerlo · `MenuVoce` col chevron sulla distruttiva (F-6) · **R27** · **FM-8** · le cinque Minori di T9-bis | handoff del 02/08 |

⚠️ **Due commenti storici che NON sono stati toccati e che possono ingannare:**
`20260727120200:52-61` dice ancora che la fotografia dei denti sta su `lavori` — **è una migration storica, è
il registro di ciò che è successo e non si riscrive**; la nuova (`20260803090000`) spiega lo spostamento.
E `20260727120300:218` dice «la DdC legge `lavori.denti_coinvolti` fino all'ondata (c)»: resta **vero per il
generatore** (che da lì costruisce lo snapshot), **non più per il template**, che ora legge la fotografia.

---

## 4. Da dove ripartire

**La fonte è `docs/roadmap/ROADMAP-UFFICIALE.md`.** Dopo la §0, le voci pronte:

- **La voce nuova di oggi** (§3 riga 2): registrare ciò che il dentista **prescrive** davvero. È il
  prerequisito delle due righe sulla dichiarazione, ed è dove D101 rimanda.
- **Avviso alla consegna su dente/colore mancanti** — avviso, **mai blocco**. 🛑 **Ha la dipendenza dura di
  §3 riga 4:** senza l'id fine del tipo, l'avviso è rumore garantito.
- **Le tinte del manufatto** (D42) — ratificata «dopo l'ondata (b)», cioè adesso. 🛑 Catalogo separato con
  voci che hanno un NOME; niente esadecimale libero, niente scale nuove dentro `colori_dentali` (cinque
  chiavi esterne puntano lì). ⚠️ **D42 dice anche che tre tipi su 38** (`placca_espansione`,
  `apparecchio_funzionale`, `paradenti`) hanno un colore **non dentale** oggi non registrabile.
- **Allegati e condivisione** (D67) — ondata propria. Destinazione di **D75** e **R20**.

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/MEMORY.md` e `memory/SESSION_ACTIVE.md`, sempre per primi.
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa.
  Una decisione che **cancella del lavoro** si scrive **per prima** (oggi: D99 e D101).
- **REGOLA ADVISOR:** ogni decisione significativa passa da un **panel di 2-3** con mandato di **confutare**.
  🔑 **Oggi ha ripagato tutto il suo costo:** ha demolito una proposta che avrebbe scritto una **frase falsa**
  su un documento conservato dieci anni. E **le affermazioni portanti di un panel si riverificano a mano**:
  tre su tre reggevano, ma la verifica è il passo che rende il panel utilizzabile.
- **FASE 7 per intero, output incollato.** **Riferimento misurato oggi ad albero pulito:** `vitest`
  **370 | 3** file e **4267 | 19** prove · `tsc` **0** · `next build` ok.
- **FASE 6b:** dopo ogni migration, `supabase gen types` + `tsc`. 🔑 **La CLI Supabase FUNZIONA da qui**
  (`npx supabase migration list` / `db push --yes`): il CI **non** applica le migrazioni, si fanno a mano.
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
- **Il banco di prova:** `npx tsx scripts/seed-e2e.ts` (idempotente), utenza `e2e-titolare@ua-test.local`,
  password in `scripts/seed-e2e.ts`. ⚠️ Limite di tentativi ravvicinati di accesso: dopo qualche login di fila
  serve aspettare. **Il lavoro con una foto caricata oggi è `7dba9a57-15bc-400e-a36f-28440980556f`** — serve
  al quarto braccio della guardia overlay, che senza foto non misura.
- **Se tocchi gli overlay v3:** `node scripts/guardia-navigazione-overlay.mjs`, a mano, con
  `LAVORO_ID=<un lavoro CON foto>`.

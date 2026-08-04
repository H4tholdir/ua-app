# Spec ondata B — «La prescrizione la cattura il wizard» (P38 + P37)

**Stato:** 🟡 SCELTE INCISE (D210-D213, 04/08/2026) — in attesa della RATIFICA finale di Francesco.
**Quando:** 4 agosto 2026 (`provato:` `date` → `Tue Aug 4 08:31 CEST 2026`).
**Decide:** Francesco Formicola.
**Nasce da:** D201 (strada B) · D202 (le 4 forme) · D203 (perimetro P38+P37) · D204 (il wizard
fotografa) · D205 (minimo normativo) · D206 (le due letture prudenti) · **D207 (il meccanismo è
ratificato CON le condizioni del panel — le condizioni §2 del referto SONO i vincoli qui sotto)**.
**Referti a monte:** `docs/roadmap/2026-08-04-panel-d204-referto.md` ·
`docs/roadmap/2026-08-04-p38-esplorazione-referto.md` ·
`docs/roadmap/2026-08-04-p38-verifiche-normative-referto.md`.
**Decisioni precedenti che vincolano:** D101 (due righe, divieti) · D196 (forma giuridica) ·
W20 (provenienza denti) · W22 (niente blocco al banco) · D125 (fonte primaria) · direttiva §9
(«ogni campo si corregge fino alla consegna»).

---

## §0 Perché quest'ondata esiste (in una pagina)

**P38.** Ogni Dichiarazione di Conformità mai emessa ha il campo «caratteristiche prescritte»
vuoto — non per un dato mancante, ma per un `null` cablato nel codice. E non è un campo fra
tanti: l'Allegato XIII punto 1 del MDR lo chiede («le caratteristiche specifiche del prodotto
indicate nella prescrizione»), e l'Art. 2(3) fa di quelle caratteristiche **il presupposto
stesso** del dispositivo su misura — senza, viene meno l'esenzione dalla marcatura CE.

**P37.** Nel 58% dei lavori vivi la DdC stampa come prescrittore una **ragione sociale**, dove la
norma vuole una **persona** con qualifiche professionali («il nome della persona che ha prescritto
il dispositivo … e, se del caso, il nome dell'istituzione sanitaria in questione» — due caselle
unite da «e», non un'alternativa). Oggi UÀ ha una casella sola, e per l'istituzione non ha posto.

**Il principio che guida tutto (D204, parole di Francesco):** *«la prescrizione non la ottiene in
automatico la pwa quando creiamo il lavoro? nel wizard forniamo le informazioni che compongono la
prescrizione. Ricordati i principi di UÀ: facilità di utilizzo, e tutto quello che può fare lei al
posto dell'operatore lo deve fare.»* — L'addetta non ricopia due volte: **il sistema fotografa**
ciò che lei trascrive creando il lavoro, e quella fotografia è la trascrizione della prescrizione.

**Ciò che il panel ha aggiunto (D207):** l'attribuzione al medico è vera quando è
**falsificabile** — chiunque deve poter confrontare la trascrizione col documento del medico.
Quindi: fonte allegata sempre, provenienza per-caratteristica, snapshot separato dai dati vivi.

## §1 Perimetro (D203)

**Dentro:** il dato prescritto strutturato (P38) + i due campi del prescrittore (P37) + la DdC a
due righe (D101) + il precheck Q6 + la chiusura della policy `ddc_laboratorio_update`.
**Si ripara il MECCANISMO, mai i dati:** niente backfill (precedente A18; i dati in DB sono di
test — `ua-app/CLAUDE.md` §8). Il 58% di prescrittori sbagliati nei dati di prova non si sana.

**Fuori, con motivo scritto:**
- **P40** (copia al paziente · conservazione oltre cessazione · DPR 633/72 abrogato dal 2027) —
  ondata propria, già censita in roadmap.
- **Numero d'albo del prescrittore** — nessuna fonte lo impone sulla dichiarazione (referto
  normativo §5.3); semmai facoltativo sull'anagrafica, una volta sola, in un'ondata futura.
- **`prescrizioni_digitali`** (schema morto del portale inbound) — non si tocca né si riusa:
  quando il portale nascerà, una prescrizione digitale accettata DIVENTERÀ una fonte; il modello
  la accoglie senza migration distruttiva.
- **Il passo colore per i 3 tipi non-dentali** — è l'ondata «tinte del manufatto» (voce 6).

## §2 I vincoli (D207 — non negoziabili, uno per riga)

| # | Vincolo | Da dove |
|---|---|---|
| V1 | **Fonte obbligatoria all'emissione, mai al banco:** il precheck blocca la DdC senza fonte allegata in una delle 4 forme di D202 (foglio a mano · email · modulo · piattaforma). La creazione del lavoro NON si blocca mai (W22) | panel §2.1 |
| V2 | **Provenienza per-caratteristica:** gli elementi nascono `prescritto` (W20); il colore e il resto NO — d'ufficio niente è prescritto; ciò che l'addetta non ha letto dal documento resta FUORI dallo snapshot. Omissione ≠ dicitura (D101 vieta «nessuna caratteristica prescritta») | panel §2.2 |
| V3 | **Snapshot solo server-side**, composto nella stessa transazione della creazione, letto dalla generazione DdC. Il client non passa MAI testo MDR | panel §2.3 |
| V4 | **Gesto typo-vs-divergenza** su ogni modifica di un campo con snapshot: «Era scritto così sulla prescrizione?» → correggo la trascrizione (typo) / lo cambiamo noi (divergenza). Senza, un errore di battitura si congela come «parola del medico» per 10 anni | panel §2.4 |
| V5 | **Conferma al precheck guardando la fonte:** miniatura affiancata allo snapshot, conferma registrata server-side (chi, quando). Correzione in loco col pattern esistente | panel §2.5 |
| V6 | **Solo-scansione bloccato all'emissione:** creazione libera con avviso; DdC bloccata finché non c'è almeno UNA scelta scritta del prescrittore (MDCG 2021-3, marzo 2021, Q6 — la «Rev.1» NON esiste). Rimedio: conferma scritta del dentista = fonte aggiuntiva | panel §2.6 |
| V7 | **Prescrizione a voce/telefono = stato transitorio, mai fonte:** «in attesa di conferma scritta»; DdC bloccata finché la conferma non arriva (a quel punto è email/modulo) | panel §2.7 |
| V8 | **Congelamento all'emissione DENTRO le RPC** (non solo nell'API) · il rifacimento clona lo snapshot · fonte non cancellabile con DdC attiva · chiusura della policy `ddc_laboratorio_update` | panel §2.8 |
| V9 | **Divergenza prescritto/eseguito stampata col motivo:** quando l'eseguito diverge si registra motivo/assenso. La riga «eseguito» è trasparenza, non obbligo: MAI campo bloccante | panel §2.9 |

## §3 Il modello dati (raccomandazione panel §3 — da dettagliare in sessione ②)

**Tabella nuova `lavori_prescrizioni`** — la casa dello snapshot:
- Contenuto **JSONB deliberato**: la trascrizione fotografa ciò che il dentista ha scritto al
  momento T. **Nessuna FK verso i cataloghi** (colori, tipi): fedeltà > integrità referenziale,
  per questo solo dato. ⚠️ Il vincolo `UNIQUE(lavoro_id, fdi)` + DELETE&INSERT di
  `sostituisci_atomica` sui denti è ESATTAMENTE il motivo per cui lo snapshot vive in una tabella
  propria: la prima modifica in lavorazione avrebbe cancellato la trascrizione.
- `fonte_tipo` con CHECK sulle 4 forme di D202 + `fonte_immagine_id`/`fonte_riferimento` con
  CHECK «almeno uno» (a emissione: V1).
- `numero_prescrizione` facoltativo **trova casa qui**; la colonna su `lavori` riceve la sua
  ragione scritta (oggi: nessuno scrittore, escluso dalla PATCH allowlist senza ragione).
- FK composite anti cross-tenant · scritture SOLO via RPC dedicate · RLS con
  `public.current_lab_id()`.
- Il rifacimento **clona** lo snapshot (`crea_rifacimento_atomico`).

**P37 nella stessa ondata:**
- Due campi come da All. XIII: **persona obbligatoria** + **istituzione «se del caso»** (colonna
  nuova `istituzione_sanitaria`, nullable — D206 copre ogni esito delle domande residue).
- La domanda «chi ha prescritto» per studi associati/società: **selezione a un tap** con default
  sull'ultimo prescrittore di quel cliente — MAI testo libero per-lavoro.
- Dottore singolo: zero domande (D196); istituzione può legittimamente restare vuota (D206②).
- Studio associato: campo direttore sanitario FACOLTATIVO, domanda «chi ha prescritto» SEMPRE
  (D206① — la ragione di D196, più prescrittori possibili, è indipendente e più robusta).

**Igiene mentre si è lì:** i commenti di schema ancora su «Allegato IV» (dossier §7.3) si
correggono in questa ondata.

## §4 Le superfici UI — 🚧 varianti ai mockup (questa sessione)

> Regola 0B: mockup HTML in `docs/design/mockups/` → screenshot → scelta di Francesco → SOLO POI
> questa sezione si riempie con la variante scelta e la spec si ratifica.
> Vincolo UX del panel: **zero passi nuovi nel wizard, zero tap OBBLIGATORI aggiunti al banco.**

### §4.0 Lo stato di fatto (esplorazione 04/08 — ogni riga con la sua prova)

- **Il wizard di produzione è a 3 passi FISSI** (`WizardNuovoLavoro.tsx:51`, `passo: 1|2|3`) +
  la conclusione `FrameFatto` (non è un passo). La macchina adattiva a 7 passi
  (`passi.ts:51-59`, `sequenza-passi.ts:74-89`) è codice puro MAI cablato: nessun componente
  importa `sequenzaPassi`. ⚠️ **Questa spec disegna sul wizard REALE** e dichiara la
  compatibilità con l'adattivo (il riquadro prescrizione vive nel «Fatto!», che sopravvive
  identico al cablaggio dei passi adattivi).
- **Il CTA foto apre SOLO la fotocamera**: `FrameFatto.tsx:257-258` (`accept="image/*"` +
  `capture="environment"`) — niente galleria, niente PDF: **2 delle 4 forme di D202 oggi
  impossibili**. Precedente in casa per la via giusta: `TabImmagini.tsx:391` (Galleria,
  `accept="image/*,application/pdf"`). La ricerca UX conferma: `capture` sull'unico input è
  l'anti-pattern noto (su Android elimina galleria e PDF); la scelta a più vie si dà con un
  foglio proprio a 2 voci o omettendo `capture` (MDN; Apple Dev Forums).
- **La foto di FrameFatto nasce `categoria:'prescrizione'`** (`FrameFatto.tsx:185`, D97);
  quella del Passo 3 nasce `'impronta'` (`crea-lavoro.ts:401`).
- **Il colore è UN valore per caso, testo libero** nel Passo 3 (`PassoPaziente.tsx:91-98`,
  RigaOpzionale «es. A2»), normalizzato server-side (`crea-lavoro.ts:323`); fuori catalogo →
  scartato in silenzio come accessorio fallito.
- **Il wizard NON manda mai `richiedente_nome`** (il POST lo accetta a `route.ts:233`; 0 hit
  nel wizard): ogni lavoro da wizard nasce senza prescrittore — è la meccanica dell'«1 su 295».
- **Ogni PUT /denti riscrive tutto con `provenienza:'eseguito'`** (`useLavoroForm.ts:172`) —
  la conferma nel codice del perché lo snapshot vive in tabella propria (lente dati del panel).
- **Il pattern di correzione dalla scheda esiste**: `RigaEditabile` → `ModificaRigaSheet`
  (Sheet v3, PATCH con le sole chiavi pertinenti) — il gesto V4 si innesta LÌ.
- **Il precheck ha già la sua UI**: `FlussoConsegna` → GET precheck → `DialogConferma`
  (consegnabile, warnings come nota ambra) o Sheet «Prima di consegnare» con `RigaBloccante`
  per errore. Le superfici V1/V5/V6/V7 sono estensioni di QUESTO flusso.
- **`lavori_immagini.id` (UUID PK) è il bersaglio naturale di `fonte_immagine_id`**; il CHECK
  categoria include già `'prescrizione'` (provato: accetta `'prescrizione'`, rifiuta
  `'Prescrizione'`).
- **«Medici dello studio» esiste per convenzione**: GET `/api/clienti/[id]/studio-members`
  raggruppa i clienti per `studio_nome` uguale — l'embrione dell'anagrafica per P37 (fragile:
  confronto case-sensitive; le chip che lo consumano oggi sono irraggiungibili — R-E2).

### §4.1 Wizard — il framing della trascrizione — ✅ SCELTA: VARIANTE B (D210)

**«Il framing prima»** (parole di Francesco: «*b framing, con la possibilità eventualmente di
modificare se ci fosse qualche problema*»):
- La casella colore del Passo 3 si presenta come trascrizione — etichetta **«Colore — come
  scritto sulla prescrizione»** — con lo sgancio quieto **«Non è sulla prescrizione: lo
  scegliamo noi»** (LinkQuieto). Scrivere lì È trascrivere: il valore nasce `prescritto`.
  Con lo sgancio premuto, il valore nasce scelta-di-laboratorio e resta FUORI dallo snapshot.
- Il «Fatto!» mostra la card «La prescrizione» in **sola lettura**: elementi ✓ (W20), colore ✓
  se trascritto, e la riga della fonte con lo stato.
- **Il TIPO entra nello snapshot alla conferma di consegna** (D213): quando l'operatore
  conferma le righe guardando il foglio, la riga «Lavoro» è fra quelle confermate.
- **Le tre vie di modifica** (la richiesta esplicita di D210): ① lo sgancio nel Passo 3 ·
  ② il gesto typo-vs-divergenza (§4.3) su ogni correzione successiva · ③ la finestra «fino
  alla consegna» (direttiva §9).
- Fonte di verità visiva: `docs/design/mockups/2026-08-04-ondata-b-A-prescrizione-fatto.html`,
  scene **b1** e **b2** (+ scatti 390/768/1280 × 2 temi).
- ⚠️ Rischio dichiarato della B, agli atti in D210: un colore scelto dal lab digitato sotto
  l'etichetta della prescrizione — mitigato da ② e dalla conferma al precheck (§4.4).

### §4.2 Allega la fonte (foglio a scelta breve) — come mockup, scena a2

Il CTA del «Fatto!» apre un **foglio a 3 voci** (anatomia MenuVoce §5.34 dentro uno Sheet):
«Scatta una foto» (input `capture="environment"`, il caso più frequente resta a 2 tap) ·
«Dalla galleria o un PDF» (input `accept="image/*,application/pdf"` SENZA capture — il
precedente in casa è la via Galleria di `TabImmagini.tsx:391`) · terza voce quieta «Non ce
l'ho ancora qui» per email/piattaforma: registra il riferimento (V7 quando non c'è nulla di
scritto). Tipo-fonte dedotto dal gesto, mai domanda obbligatoria. Fonte visiva:
`2026-08-04-ondata-b-A-prescrizione-fatto.html`, scena **a2**.

### §4.3 Il gesto typo-vs-divergenza (V4) — ✅ RATIFICATO COME MOSTRATO (D212)

Sulla modifica di un campo CON snapshot (da `ModificaRigaSheet` o dal form modifica): foglio
«Era scritto così sulla prescrizione?» a DUE rami, nessun default preselezionato (pattern
EHR/Part 11: la scelta deve essere intenzionale, il valore precedente resta leggibile):
- «Sul foglio c'è scritto …» → lo snapshot si aggiorna (typo).
- «No: lo stiamo cambiando noi» → lo snapshot resta, l'eseguito cambia, e si chiede il motivo
  (pastiglie: richiesta del dentista · esigenza tecnica · materiale non disponibile · altro,
  con nota libera facoltativa) — V9. Solo questo ramo lo chiede.
Fonte visiva: `2026-08-04-ondata-b-B-typo-divergenza.html` (2 scene).

### §4.4 Il precheck arricchito (V1 · V5 · V6 · V7) — ✅ FORMA LEGGERA (D213)

- Bloccanti nuovi in «Prima di consegnare» (RigaBloccante §5.30): «Manca il foglio della
  prescrizione» (V1) · «C'è solo la scansione, senza una scelta scritta del dentista» con
  percorso di rimedio: conferma scritta → fonte aggiuntiva (V6) · «In attesa di conferma
  scritta» per la prescrizione a voce/telefono (V7, stato visibile anche sulla scheda).
- **La conferma di consegna, forma leggera (D213 — la due-tempi è stata respinta):** il
  foglio della prescrizione davanti agli occhi (pattern KFI: immagine sopra, ingrandibile;
  righe dello snapshot sotto) e **il tocco su CONSEGNA È la conferma** — tasto subito acceso,
  frase sotto: «Consegnando confermi il confronto col foglio del Dr. X — resta registrato».
  Registrazione server-side (chi, quando) nella stessa transazione della consegna (V5).
  Link quieto «Correggi una riga» → gesto §4.3. Zero tocchi in più rispetto a oggi.
  ⚠️ Confine dichiarato a verbale: più leggero di così riapre V5.
Fonte visiva: `2026-08-04-ondata-b-C-precheck-consegna.html` (2 scene).

### §4.5 P37 — «chi ha prescritto» (D196) — ✅ SCELTA: D1, IL MINI-FOGLIO (D211)

Solo quando il cliente è un'entità (studio/società): dopo il tile del Passo 1 sale il
mini-foglio «Chi ha prescritto?» con **l'ultimo prescrittore di quel cliente già proposto**
(un tap e via); gli altri medici sotto; «È un altro» aggiunge il medico all'anagrafica dello
studio (pattern NuovoDentistaSheet) — mai testo libero per-lavoro. Per il dottore singolo il
foglio non compare mai (D196). Il prescrittore diventa VISIBILE sulla scheda (oggi
`richiedente_nome` non compare da nessuna parte nella scheda v3) con la sua via di correzione
(direttiva §9). Fonte visiva: `2026-08-04-ondata-b-D-chi-ha-prescritto.html`, scena **d1**.

## §5 La DdC a due righe (D101)

- Riga «indicate nella prescrizione» ← snapshot `lavori_prescrizioni` (V3).
- Riga «come realizzato» ← dati vivi con `provenienza:'eseguito'` — scelta di trasparenza, mai
  bloccante (V9); quando diverge, si stampa col motivo/assenso registrato.
- MAI comporre il prescritto dai dati di caso · MAI «nessuna caratteristica prescritta» (D101).

## §6 La normativa citata (tutta su fonte primaria — referto verifiche)

- **All. XIII p.1, quinto e sesto trattino** (consolidato EUR-Lex CELEX `02017R0745-20260101`,
  IT, riscontrato EN — VERIFICATO): persona + istituzione «se del caso»; «le caratteristiche
  specifiche del prodotto indicate nella prescrizione».
- **Art. 2(3)**: la prescrizione scritta «che indichi … le caratteristiche specifiche di
  progettazione» è il presupposto del su misura.
- **MDCG 2021-3, marzo 2021** (MAI «Rev.1» — non esiste), **Q6**: minimo = nome/pseudonimo del
  paziente + almeno UNA caratteristica decisa dal prescrittore; dimensioni/DICOM da soli non
  bastano; impronte/modelli/dati 3D che ACCOMPAGNANO una prescrizione scritta SONO caratteristiche.
- **D206**: studio associato ≠ «società» c.153 (direttore sanitario facoltativo) · dottore
  singolo: istituzione può restare vuota.
- **L. 409/1985 art. 2**: ⚠️ se questa spec ne citerà il TESTO, rilettura su GU prima della
  ratifica (D125). Ad oggi la spec non lo cita testualmente.

## §7 FASE 3 — le 5 domande di gate (risposte)

| Domanda | Risposta |
|---|---|
| Tenant isolation | SÌ: tabella nuova con RLS `public.current_lab_id()` + FK composite anti cross-tenant. Percorso GRANDE |
| Schema drift | SÌ: migration (sessione ②) → `supabase gen types` + `tsc` (FASE 6b) |
| API contract | Le rotte esistenti NON cambiano payload; nascono RPC dedicate. Il POST wizard resta compatibile (lo snapshot si compone server-side nella stessa transazione) |
| Rollback | Migration additiva (tabella nuova + colonne nullable): rollback = drop; nessun dato esistente toccato (niente backfill). La chiusura della policy DdC è reversibile con una policy inversa |
| Dominio critico | SÌ (RLS + MDR) → percorso GRANDE, panel advisor: GIÀ FATTO (D207) |

## §8 Il piano delle 4 sessioni (stima panel §4)

| ① (questa) | ② | ③ | ④ |
|---|---|---|---|
| spec + mockup + scelta di Francesco | migration + RPC + server (⚠️ PRIMA: conteggio DdC fresco `npx tsx scripts/tmp/verifica-conteggio-ddc.ts`) | wizard + scheda col flusso di correzione | DdC a due righe + template + precheck Q6 + prove + QA 3 viewport + gate L2 |

## §9 Che cosa questa ondata NON fa (per non doverlo ridire)

- Niente backfill (A18 + dati di test §8).
- Niente numero d'albo.
- Niente riuso di `prescrizioni_digitali`.
- Niente blocco alla creazione (W22): tutti i blocchi vivono al precheck.
- Niente passo nuovo nel wizard.
- La riga «eseguito» non diventa mai campo bloccante (V9).

# Piano — Sessione ③ dell'ondata B: wizard + scheda col flusso di correzione

**Quando:** 4 agosto 2026, sera (`provato:` `date` → `Tue Aug 4 18:00:37 CEST 2026`).
**Stato:** FASE 4 — pronto per l'esecuzione R-E1 (un compito per esecutore fresco, review fra l'uno e l'altro).
**Vincolato da:** spec ondata B RATIFICATA (D214) · «Note VINCOLANTI per le sessioni ③ e ④» del piano ②
(`2026-08-04-ondata-b-sessione-2-migration-rpc.md:498-539`, le note 1-7) · decisione 0B
`docs/design/decisions/2026-08-04-ondata-b3-schermate-vere.md` (D223-D225 + i 9 vincoli §3) ·
D221 (rifacimento: SOLO il clone P37, niente ristudio del flusso).
**Mockup approvati:** `docs/design/mockups/2026-08-04-ondata-b3-schermate-vere.html` (11 scene, D223/D224).

## I tre registri (R-P1 · R-P2 · R-P6)

### Registro delle prove (R-P1)

**Sonda di questa sessione:** `scripts/tmp/sonda-b3-r-p1.mjs` — transazione annullata, 8/8 verdi,
`lavori_prescrizioni` = 0 righe prima e dopo (invariato). Output incollato:

```
✅ S1 allega_fonte via-legacy: esito=ok, riga CREATA con contenuto '{}' e fonte_tipo='foglio'
✅ S2 allega_fonte tutta-NULL: esito=ok e riga VUOTA creata — la RPC è permissiva: il 422 «almeno un corpo» DEVE stare nella route
✅ S3 divergenza dizionario APERTO: campo='pippo' → ok · campo=NULL → ok (2 divergenze): la chiusura M-T3-1 va fatta in route E in RPC
✅ S4 typo campo=pippo: esito='campo_non_valido' — il dizionario del typo morde in RPC
✅ S5 gettone typo: stantio → 'conflitto' (con updated_at corrente in risposta) · corrente → 'ok' + updated_at avanzato: la route DEVE trasportare il gettone
✅ S6 rimozione con null esplicito: esito=ok e la chiave 'colore' NON c'è più nel contenuto
✅ S7 DELETE immagine-fonte: rifiutato come atteso — 23503 ... viola "lavori_prescrizioni_fonte_img_fk"
✅ S8 lettura RLS: utente del lab → 1 riga · utente di un altro lab → 0: l'embed della scheda ha la via
```

🔑 **Prova pagata dal primo giro (S4/S5 rossi, poi verdi):** il gettone `updated_at` letto dal
driver Node come `Date` JS **perde i microsecondi** e produce `'conflitto'` spurio; passato come
**stringa** (`::text` → `::timestamptz`) il confronto regge. **Vincolo di piano: il gettone è una
stringa OPACA lungo tutta la catena** client → route → RPC → risposta → client. Mai `new Date()`.

**Prove ereditate dalla ② (non ripetute):** collaudo RPC 9/9 in transazione annullata · permessi
6/6 (EXECUTE solo service_role) · gate D216 con 422 provati · immutabilità DdC (UPDATE prima=1/dopo=0).

### Registro delle letture (R-P2)

Le letture di questa sessione stanno in DUE registri, entrambi con citazioni file:riga:
- **Censimento allegato:** `2026-08-04-ondata-b-sessione-3-censimento-r-p6.md` — 6 superfici,
  ~44 file letti (l'elenco «LETTURE (R-P2)» in coda a ogni superficie).
- **Letture dirette della sessione** (per i mockup): PassoPaziente.tsx:70-121,138-193,223-331 ·
  FrameFatto.tsx:174-359 · ModificaRigaSheet.tsx (intero) · SchedaLavoroV3.tsx:378-430,858-877 ·
  WizardNuovoLavoro.tsx:219-261,297-320,454-582 · tokens.ts (intero) · i 4 mockup ① (interi) ·
  sonda-lp-r-p1.mjs (intero, come modello).

### Censimento (R-P6)

**Il registro completo è il file allegato** (`…-censimento-r-p6.md`). Qui i fatti che VINCOLANO i
compiti — ognuno verificato con citazione nel registro:

1. **Il gate D216 lato server è COMPLETO** (`route.ts:211-245`): 422 su forme sbagliate già
   provati. Chi manda la chiave è il SOLO lavoro client (T1).
2. **P37 lato server è COMPLETO** (POST `route.ts:273-278`, PATCH allowlist `:186-189`, RPC vive
   che leggono `richiedente_nome`/`istituzione_sanitaria`): T10 è SOLO UI+payload. Un compito che
   «aggiunge la colonna all'allowlist» duplica lavoro fatto in ② — non esiste in questo piano.
3. **Le RPC dei gesti hanno nomi PREFISSATI**: `lavoro_prescrizione_allega_fonte` ·
   `lavoro_prescrizione_correggi_typo` · `lavoro_prescrizione_registra_divergenza` (i nomi corti
   delle note ② NON esistono in pg_proc — 0 hit). Firme nel registro, superficie 3.
4. **Nessuna route/UI chiama oggi quelle RPC** e `src/app/api/lavori/[id]/prescrizione/` NON
   esiste: T4 costruisce da zero. Le route nuove NON sono in `LAB_CONTEXT_ROUTE_ALLOWLIST` →
   `getFreshLabContext` + `isSameOrigin` (guardia CSRF).
5. **GET [id] non embedda `lavori_prescrizioni`** (`route.ts:303-315`) e `LavoroDettaglio` non ha
   il membro: senza T6 la card D224 e la riga Colore non hanno dati. La lettura È permessa
   (S8 verde; GRANT SELECT + RLS select per tenant, migration 20260804150306:73-74).
6. **TRAPPOLA D210:** `crea-lavoro.ts:323` normalizza il colore (trim+toUpperCase) in
   `coloreCodice`; la trascrizione usa la variabile **grezza** `colore`. Colore fuori catalogo:
   scartato dal CASO (`COLORE_SCARTATO`) ma resta TRASCRITTO nello snapshot (fedeltà al foglio).
7. **PERSISTENZA MUTA:** `salvaStato` (WizardNuovoLavoro.tsx:161-173) e `StatoSalvato`
   (persistenza.ts:12-24) enumerano le chiavi A MANO: ogni campo nuovo dello stato va aggiunto in
   TUTTI E TRE i posti (StatoWizard, salvaStato/riprendi, StatoSalvato) o si perde al reload
   senza errore. Campi nuovi OPZIONALI → i salvataggi `v:1` esistenti restano validi.
8. **DELETE immagini distrugge il file PRIMA della riga** (`[imgId]/route.ts:214` storage.remove,
   poi `:227` .delete()): col 23503 (S7) il file della fonte sarebbe GIÀ perso. Il pre-check
   «fonte in uso» sta PRIMA di storage.remove (T8). La cancellazione vive nell'album T12 della
   scheda (TendinaMenu → FoglioConferma → eliminaFotoCorrente), NON in TabImmagini.
9. **Il clone del rifacimento condivide `fonte_immagine_id`** (RPC :471-479): il 23503 può
   arrivare da un lavoro DIVERSO da quello dell'album — il messaggio ne tiene conto (T8).
10. **`Campo` è definito DUE volte** (ModificaRigaSheet.tsx:24 e SchedaLavoroV3.tsx:96):
    `'colore'` si aggiunge in entrambi (T7).
11. **4 valori di `fonte_tipo` e 4 motivi di divergenza NON hanno una costante condivisa** in
    src/ (esistono solo in SQL e nell'unione TS): T4 fonda la casa unica sul modello
    `categorie-foto.ts`, o il foglio a2 scrive la terza copia a mano.
12. **`registra_divergenza` non ha gettone** (non tocca `lavori.updated_at`): il gesto divergenza
    non può avere lock ottimistico — non promettergli un 409 che non esiste.
13. **`§5.15 PillVoce` è ABROGATA** (D13, spec DS:267-276) ma montata in PassoPaziente.tsx:117-119:
    T2 la rimuove per obbligo di spec. ⚠️ **I mockup D223 la mostrano ancora** (fedeltà allo stato
    attuale): la rimozione è deliberata, da dire a Francesco alla consegna.
14. **`studio-members` risponde un ARRAY NUDO** (route:42,59), confronto case-sensitive su
    `studio_nome` (:50, fragilità nota) — T10 lo consuma così com'è, senza estenderlo.
15. **`AccessorioFallito`/`EsitoCreazione`:** sei `toEqual` fissano l'esito PER INTERO
    (crea-lavoro.test.ts) — ogni proprietà nuova sull'esito le fa cadere: T1 le aggiorna.

## I compiti (atomici, un esecutore fresco ciascuno — R-E1)

Ordine di dipendenza: T1→T2→T3 (wizard) · T4→T5 (gesti+migration) · T6→T7 (scheda) · T8 (immagini)
· T9 (foglio a2, dopo T4) · T10 (P37 UI) · T11 (giro end-to-end + chiusura). T1-T3, T4-T5, T6-T7,
T8, T10 sono catene indipendenti fra loro; T9 dipende da T3+T4; T11 chiude tutto.

> Ogni blocco di codice qui sotto è `non eseguito` (R-P1 fail-closed): accanto c'è il comando con
> cui l'esecutore lo verifica. R-P4 su ogni compito con test: dopo il primo rosso, abbozzo inerte
> e CONTEGGIO delle asserzioni che si accendono (`N su M`), + enumerazione delle forme d'input.

### Task 1 — T1 · Il wizard manda la trascrizione e lo stato dello sgancio (client, no UI)
- `StatoWizard` (+`STATO_INIZIALE`, `salvaStato`, `riprendi`, `StatoSalvato` — fatto 7): nuovo
  campo OPZIONALE `coloreOrigine?: 'prescrizione' | 'lab'` (default `'prescrizione'`, D223: scrivere
  È trascrivere; lo sgancio lo mette a `'lab'`).
- `creaLavoroDaWizard`: nel body POST la chiave `prescrizione` (gate D216) SOLO se c'è qualcosa da
  trascrivere: `{ colore: <GREZZO, fatto 6>, numero_prescrizione? }` quando `coloreOrigine ===
  'prescrizione'` e colore non vuoto. `colore_codice` (caso) continua a viaggiare com'è, in
  entrambi gli esiti dello sgancio. Stringa vuota = assente (M-T5-4, ②).
- Aggiornare i sei `toEqual` (fatto 15).
- Verifica: `npx vitest run tests/unit/crea-lavoro*` + conteggio R-P4.

### Task 2 — T2 · Passo 3: framing D223 variante B + sgancio + stato sganciato (UI)
- `RigaOpzionale` colore: sottotitolo «come scritto sulla prescrizione · es. A3» (variante B — la
  riga resta gemella delle sorelle); stato APERTO: etichetta «Colore — come scritto sulla
  prescrizione» + aiuto («…vale come trascrizione…») + LinkQuieto «Non è sulla prescrizione: lo
  scegliamo noi»; stato SGANCIATO: etichetta «Colore — lo scegliamo noi» + aiuto + ritorno
  («In realtà è sulla prescrizione: torno a trascrivere»). Testi = mockup scene 2/3/4.
- Rimozione PillVoce (fatto 13) + import.
- ⚠️ Vincolo D223 a verbale: la B regge SOLO finché lo stato aperto ripete il framing pieno.
- Verifica: unit su PassoPaziente + scatti di confronto col mockup.

### Task 3 — T3 · FrameFatto: due carte (D224) + CTA che cambia mestiere
- Carta «Il lavoro»: righe attuali + «Prescritto da» SOLO se `richiedente_nome` presente (vincolo
  0B-9: mai riga vuota; adiacenza Dentista → Prescritto da) + il colore SGANCIATO atterra qui come
  riga senza pastiglia (vincolo 0B-2: il valore digitato non sparisce).
- Carta «La prescrizione»: Elementi (dai denti, tutti `prescritto` — W20, vincolo 0B-6) · Colore
  se trascritto · riga «Foglio del dentista» con stato (`Da allegare` ambra / `✓ Allegata · <forma>`
  verde con miniatura). Pastiglie `✓ dalla prescrizione` (estensione RigaDato — T7 la ratifica in
  spec).
- CTA: senza fonte «Allega la prescrizione» (apre T9); con fonte «Fotografa l'impronta».
  Aria-label `:259` aggiornata insieme (fatto censimento: copia nascosta) + commento D97 riscritto.
  Link quieti con più aria/impilati (vincolo 0B-3), ordine: azione a sinistra, uscita a destra.
- ⚠️ Vincolo 0B-4: il riferimento-promessa (terza voce a2) NON inverdisce la riga fonte e NON
  cambia il CTA: verde solo con allegato reale (immagine) o fonte con corpo vero.
- Verifica: unit FrameFatto + scatti.

### Task 4 — T4 · Le route dei gesti (`src/app/api/lavori/[id]/prescrizione/…`) — da zero
- Casa unica delle costanti (fatto 11): file NUOVO `prescrizione-costanti.ts` da creare in
  `src/lib/domain/` — `FONTE_TIPI`
  (foglio·email·modulo·piattaforma) · `CAMPI_TYPO` (elementi·colore·tipo) · `MOTIVI_DIVERGENZA`
  (richiesta_dentista·esigenza_tecnica·materiale_non_disponibile·altro), col commento-spia sul
  CHECK SQL (modello categorie-foto.ts).
- **fonte** (allega): 422 se nessun corpo (S2) · fonte_tipo dal dizionario · chiama
  `lavoro_prescrizione_allega_fonte` (service client, getFreshLabContext, isSameOrigin — fatto 4)
  · mappa esiti (`fonte_congelata` → 409 con frase; `non_trovato` → 404).
- **typo** (correggi): campo nel dizionario (422 prima della RPC) · gettone updated_at STRINGA
  OPACA end-to-end (prova S5) · `'null'` esplicito rimuove, chiave assente non tocca (nota ② 3,
  S6; mai derivare da undefined/JSON.stringify) · `conflitto` → 409 + updated_at corrente.
- **divergenza** (registra): campo nel dizionario ANCHE qui (S3: la RPC oggi accetta tutto) ·
  motivo dal dizionario · `p_utente` = context.userId · niente gettone (fatto 12).
- R-P4 sulle forme d'input di OGNI route: tipo sbagliato · chiave assente · null · array al posto
  di scalare · body non-JSON — ognuna col suo 422 o col suo «non coperta, perché».
- Verifica: `npx vitest run tests/unit/api-prescrizione*` (nuovi) + conteggio.

### Task 5 — T5 · Migration piccola: M-T3-1 + clone P37 (D221)
- `lavoro_prescrizione_registra_divergenza`: CREATE OR REPLACE **stessa firma** (lezione 2 della ②:
  firma diversa = overload; qui la firma NON cambia) con dizionario su `p_campo` → esito nuovo
  `campo_non_valido`. La sonda S3 diventa il collaudo: dopo la migration, `'pippo'` e NULL DEVONO
  essere rifiutati (valore-che-deve-fallire, in transazione annullata prima di registrare).
- `crea_rifacimento_atomico`: CREATE OR REPLACE stessa firma, la colonna-list del clone guadagna
  **`richiedente_nome` E `istituzione_sanitaria`** (censimento: mancano ENTRAMBE — D221 «solo il
  clone P37», niente altro: né lock né tenant param, che restano alla riga 12).
- FASE 6b OBBLIGATORIA: `npx supabase gen types` → `npx tsc --noEmit` → verifica RLS.

### Task 6 — T6 · La lettura per la scheda (server)
- GET [id]: embed `lavori_prescrizioni` (S8 prova la via RLS; oggi assente — fatto 5).
- `LavoroDettaglio` + membro opzionale `prescrizione?` · tipo `Divergenza`
  `{campo, motivo, nota, utente_id, registrata_at}` (nota ② 7) · `LavoroImmagine.categoria` →
  `CategoriaFoto` (ritrovamento ② ⑦).
- Verifica: tsc 0 + unit sul mapping.

### Task 7 — T7 · Scheda UI: riga Colore + pastiglia + gesto D212
- `Campo` += `'colore'` in ENTRAMBE le definizioni (fatto 10) · riga «Colore» in CardInfo con
  pastiglia di provenienza (RigaDato esteso DENTRO CardInfo.tsx — RigaDato.tsx NON esiste).
- Stati della riga (vincolo 0B-5): trascritto (pastiglia verde) · «lo scegliamo noi» (segnale
  POSITIVO quieto) · post-divergenza (prescritto E realizzato visibili).
- ModificaRigaSheet ramo colore → al Salva con valore diverso dal trascritto: foglio D212 (testi
  INVARIATI dal mockup B) → via typo → route typo (gettone!); via divergenza → motivo pastiglie →
  route divergenza. «Lascia stare» → nulla.
- Emendamenti spec DS v3 (vincoli 0B-7/8): §5.10 «RigaDato con pastiglia di provenienza» (scarsa:
  solo colore/elementi) · §7.3 primario del Fatto (una riga di emendamento con data e D-numero).
- Verifica: unit + scatti + guardia-navigazione-overlay A MANO se si toccano gli overlay v3
  (regola §9 di CLAUDE.md repo).

### Task 8 — T8 · Cancellazione immagini: il pre-check PRIMA della distruzione
- `[imgId]/route.ts`: PRIMA di `storage.remove` (`:214`), controllo «questa immagine è
  `fonte_immagine_id` di qualche `lavori_prescrizioni`?» → 409 «fonte in uso» SENZA toccare nulla
  (prova S7: la FK morde, ma morde DOPO — fatto 8). Mappare comunque 23503 sulla .delete()
  (cintura e bretelle). Messaggio distinto dal 409-consegnato (oggi unico generico —
  SchedaLavoroV3:270,290) e consapevole del clone (fatto 9: la fonte può essere di un rifacimento).
- Verifica: unit con mock che conta l'ORDINE delle chiamate (il pre-check deve stare prima).

### Task 9 — T9 · Il foglio a2 (UI + upload) — dopo T3+T4
- Sheet a 3 voci (testi INVARIATI D222): «Scatta una foto» (input capture) · «Dalla galleria o un
  PDF» (`accept="image/*,application/pdf"` SENZA capture — precedente TabImmagini:391) · «Non ce
  l'ho ancora qui» (fonte_tipo email/piattaforma + riferimento).
- Flussi: foto/galleria → POST immagini categoria `'prescrizione'` → route fonte con
  `fonte_immagine_id`; terza voce → route fonte con solo riferimento, e la UI resta AMBRA
  (vincolo 0B-4).
- Tipo-fonte dedotto dal gesto, mai domanda (spec §4.2).
- Verifica: unit + giro a banco.

### Task 10 — T10 · P37 UI: il mini-foglio «Chi ha prescritto?» (d1, D211)
- Dopo il tile del Passo 1 SOLO se il cliente è un'entità (ha `studio_nome`): ultimo prescrittore
  proposto (un tap), altri da `studio-members` (ARRAY NUDO — fatto 14), «È un altro» → pattern
  NuovoDentistaSheet. Dottore singolo: nessun foglio (D196).
- Payload: `richiedente_nome` (persona) + `istituzione_sanitaria` (ragione sociale dello studio,
  «se del caso» — D206). Il POST li accetta già (fatto 2); StatoWizard/persistenza come T1.
- Verifica: unit su quando il foglio compare/non compare.

### Task 11 — T11 · Il PRIMO giro end-to-end + chiusura
- 🔴 Handoff ② §0①: **nessun giro vero è mai stato percorso.** Sul banco di prova (porta 3020,
  accesso via `scripts/tmp/link-accesso.ts`, D103): wizard nuovo → lavoro creato → riga in
  `lavori_prescrizioni` verificata a DB → foglio a2 → fonte allegata → scheda con card e riga
  Colore → gesto typo e divergenza → cancellazione immagine-fonte rifiutata con la frase giusta.
- FASE 7: `npm run verify:full` (tsc 0 · vitest · build · guardie).
- FASE 9: 390/768/1280 × chiaro/scuro sulle superfici toccate. FASE 9b (gate L2) PRIMA del merge.
- BP-1 + handoff di chiusura (la §0 per prima).

## Mappa dei vincoli (dove muore ciascuno)

| Vincolo | Compito |
|---|---|
| Note ② — 1 (via allega-prima-del-typo) | T4 (la route typo mappa `senza_prescrizione` con la frase «prima allega il foglio»); S1 prova la via |
| Note ② — 2 (dizionario divergenza ANCHE in RPC) | T4 (route) + T5 (RPC) |
| Note ② — 3 (rimozione = `null` esplicito) | T4 (S6) |
| Note ② — 4 (FK immagine-fonte) | T8 (S7) |
| Note ② — 5 (riga vuota da NULL·NULL·NULL) | T4 (S2) |
| Note ② — 6 (chiavi ignote → valutare 422) | T1/T4: il contratto del wizard si fissa qui — 422 nelle route NUOVE; il POST lavori resta com'è (retrocompat D218) |
| Note ② — 7 (tipizzare divergenze) | T6 |
| 0B-1 (variante B col suo vincolo) | T2 |
| 0B-2 (colore sganciato visibile) | T3 |
| 0B-3 (aria fra i link quieti) | T3 |
| 0B-4 (la promessa non inverdisce) | T3 + T9 |
| 0B-5 (stati riga colore in scheda) | T7 |
| 0B-6 (Elementi coperti da W20) | T3 (nessuna D nuova) |
| 0B-7 (emendamento spec §7.3) | T7 |
| 0B-8 (pastiglia = estensione §5.10, scarsa) | T7 |
| 0B-9 (Prescritto da: senza pastiglia, mai vuota) | T3 |

## Fuori mandato — riferiti, NON corretti (R-E2)

1. **Citazioni stantie** (si correggono «con una riga» quando si apre il file per altro): handoff ②
   §0④ dice scarto-allowlist a `370-379` → vero: **382-387** (commento 378-381); `ua-app/CLAUDE.md`
   R-P6 cita `:259-264` → stesso blocco vero; commento migration 20260804152403:24-25 cita
   «route.ts:225» → la chiamata vera è `:264-265` (e già a 4 argomenti); commento route.ts:179 cita
   «SchedaLavoroV3.tsx:286» → oggi `:408`.
2. **`crea_rifacimento_atomico` senza filtro tenant nel lookup** (WHERE id = … senza laboratorio_id)
   e contratto anomalo (RAISE + json senza `esito`) — già censito M-T3-5 → **riga 12** della roadmap.
3. **`lavoro_prescrizione_conferma_consegna`** (quarta RPC): mandato della **④** (precheck/consegna).
4. **`ora_consegna` e `dispositivo_semilavorato` non clonati** dal rifacimento — riga 12.
5. **`istituzione_sanitaria` senza lettori** in src/ finché T3/T7 non la mostrano — si chiude da sé
   in questa sessione; la DdC la stampa nella ④.
6. **Tipi generati più larghi del dominio** (fonte_tipo `string|null`; Args di allega_fonte marcano
   NOT NULL parametri che accettano NULL): T4 non si tipizza sui generati per quei parametri.

## Self-review (fatto in scrittura)

- Ogni superficie di D223/D224/D225 ha il suo compito; ogni nota ② e vincolo 0B ha una riga nella
  mappa; il rifacimento entra SOLO come clone P37 (D221) — il resto è dichiarato fuori mandato.
- Nessun compito «aggiunge» cose che il censimento ha provato già esistere (gate D216, P37 server,
  allowlist): i duplicati sono stati cercati e non ci sono.
- I blocchi non hanno codice inventato: descrivono il CHE COSA coi riferimenti; il COME lo scrive
  l'esecutore sotto test (R-P4), col censimento allegato come mappa.

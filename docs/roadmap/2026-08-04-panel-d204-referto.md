# Referto del panel — D204: la prescrizione la cattura il wizard (ondata B, P38+P37)

**Per:** Francesco, per la ratifica del meccanismo (la riserva scritta in D204).
**Quando:** 4 agosto 2026. **Regola:** Regola Advisor (§0C), lenti dichiarate (D189), mandati disgiunti.
**Basi:** `docs/roadmap/2026-08-04-p38-esplorazione-referto.md` · `docs/roadmap/2026-08-04-p38-verifiche-normative-referto.md` · verbale D101, D195-D196, D200-D206, W20, W22.

---

## §0 L'esito in una riga

**Tre lenti su tre: REGGE CON CONDIZIONI — nessuna lente boccia, nessuna approva senza.**
Il principio di Francesco («niente doppia digitazione: il wizard fotografa») è confermato da tutte
e tre; le condizioni convergono su un punto solo, detto in tre modi diversi: **ciò che rende VERA
l'attribuzione al medico non è un checkbox né un'etichetta — è la FONTE ALLEGATA, confrontabile
con lo snapshot, più la separazione strutturale fra «trascritto» e «scelto dal laboratorio».**
La lente dati lo dice nel modo più netto: l'attribuzione è vera quando è **falsificabile** —
chiunque deve poter confrontare la trascrizione col documento del medico.

## §1 I tre verdetti

| Lente | Verdetto | Il cuore del parere |
|---|---|---|
| **Normativa MDR** | REGGE CON CONDIZIONI | Lo snapshot da wizard soddisfa «indicate nella prescrizione» SOLO se: fonte obbligatoria all'emissione, provenienza per-caratteristica (mai in blocco), conferma esplicita al precheck guardando la fonte, framing di trascrizione senza precompilazioni, solo-scansione bloccato all'emissione finché manca una scelta scritta del prescrittore, prescrizione a voce = stato transitorio mai fonte, fonte conservata 10 anni con la dichiarazione, congelamento all'emissione |
| **Operativa / UX front desk** | REGGE CON CONDIZIONI | Zero passi nuovi nel wizard e zero tap aggiunti al banco: il framing sta nelle etichette («come indicato dal dentista»), la fonte si allega col CTA foto esistente MA serve aprire galleria e PDF (oggi `capture="environment"` apre solo la fotocamera: email e piattaforma non si allegano — 2 delle 4 forme di D202 oggi impossibili); snapshot per-campo omissibile; **il gesto typo-vs-divergenza** («Era scritto così sulla prescrizione?» → correggo la trascrizione / lo cambiamo noi) mostrato solo quando i valori divergono; precheck con correzione in loco e miniatura della fonte accanto allo snapshot |
| **Dati / architettura** | REGGE CON CONDIZIONI | Serve una casa propria: tabella **`lavori_prescrizioni`** (snapshot JSONB scritto SOLO server-side nella stessa transazione della creazione, fonte con CHECK «almeno una», FK composite anti cross-tenant, scritture solo via RPC dedicate, clone nel rifacimento). ⚠️ **D204 come formulata oggi NON reggerebbe sui denti:** `UNIQUE(lavoro_id, fdi)` ammette una sola riga per dente e la sostituzione fa DELETE+INSERT — la prima modifica in lavorazione CANCELLEREBBE la trascrizione; lo snapshot separato risolve. La policy `ddc_laboratorio_update` (UPDATE aperto su uno «snapshot immutabile») si chiude in questa ondata; `numero_prescrizione` trova casa qui e la colonna su `lavori` riceve finalmente la sua ragione scritta |

## §2 Le condizioni, unificate (diventano vincoli di spec alla ratifica)

1. **Fonte obbligatoria all'emissione, mai al banco** (W22 salvo): il precheck blocca la DdC senza fonte allegata in una delle 4 forme di D202. È la fonte a rendere l'attribuzione difendibile.
2. **Provenienza per-caratteristica:** gli elementi nascono `prescritto` (già W20); il colore NO — d'ufficio niente è prescritto se non viene genuinamente dalla prescrizione; ciò che l'addetta non ha letto dal documento resta fuori dallo snapshot (omissione ≠ dicitura vietata da D101).
3. **Snapshot solo server-side,** composto nella stessa transazione della creazione e letto dalla generazione DdC (mai testo MDR dal client — il dubbio §8.6 del dossier muore qui).
4. **Il gesto typo-vs-divergenza** su ogni modifica di un campo con snapshot: senza, un errore di battitura si congela come «parola del medico» per 10 anni.
5. **Conferma al precheck guardando la fonte:** miniatura affiancata allo snapshot, conferma registrata server-side (chi, quando). Correzione in loco col pattern già esistente.
6. **Solo-scansione (iTero senza nulla di scritto):** creazione libera con avviso; emissione bloccata finché non c'è almeno UNA scelta scritta del prescrittore (MDCG 2021-3 Q6 — e la citazione corretta è «MDCG 2021-3, marzo 2021»: la Rev.1 non esiste). Percorso di rimedio: conferma scritta del dentista, che diventa fonte aggiuntiva. MAI «nessuna caratteristica prescritta».
7. **Prescrizione a voce/telefono:** stato «in attesa di conferma scritta», mai fonte; DdC bloccata finché la conferma scritta del prescrittore non arriva (a quel punto è email/modulo).
8. **Congelamento all'emissione** dentro le RPC (non solo nell'API), rifacimento che clona lo snapshot, fonte non cancellabile con DdC attiva, chiusura della policy `ddc_laboratorio_update`.
9. **Divergenza prescritto/eseguito stampata:** quando l'eseguito diverge, si registra il motivo/assenso — una difformità nero su bianco senza traccia dell'accordo è un rischio, non una trasparenza. La riga «eseguito» resta una scelta di trasparenza, non un obbligo normativo: mai trattarla come campo bloccante.

## §3 Decisioni di progetto raccomandate dal panel (per la spec)

- **Modello dati:** tabella `lavori_prescrizioni` con contenuto JSONB deliberato (la trascrizione fotografa ciò che il dentista ha scritto al momento T: nessuna FK verso i cataloghi — fedeltà > integrità referenziale, per questo solo dato) + `fonte_tipo` CHECK sulle 4 forme + `fonte_immagine_id`/`fonte_riferimento` con CHECK «almeno uno» + `numero_prescrizione` facoltativo.
- **P37 nella stessa ondata:** due campi come da All. XIII (persona obbligatoria + istituzione «se del caso», colonna nuova `istituzione_sanitaria` nullable — D206 copre ogni esito delle domande residue); la domanda «chi ha prescritto» per studi associati = selezione a un tap con default sull'ultimo prescrittore di quel cliente, mai testo libero per-lavoro; numero d'albo: NON in questa ondata (nessuna fonte lo impone; semmai facoltativo sull'anagrafica dentista, una volta sola).
- **Input da sistemare al banco:** galleria + PDF accettati per la fonte (≤3 tap da telefono); tipo-fonte dedotto dal gesto quando possibile, mai domanda obbligatoria.
- **`prescrizioni_digitali` (schema morto) non si tocca né si riusa:** quando il portale inbound nascerà, una prescrizione digitale accettata DIVENTERÀ una fonte — il modello lo accoglie senza migration distruttiva.
- **Igiene mentre si è lì:** commenti di schema ancora su «Allegato IV» (dossier §7.3) si correggono nella stessa ondata.

## §4 Stima e piano (dalla lente dati, la più informata sul costo)

**4 sessioni** per l'ondata B completa (P38+P37): ① spec + mockup (panel: fatto) · ② migration + RPC + server · ③ wizard + scheda col flusso di correzione · ④ generazione DdC a due righe + template + precheck Q6 + prove + QA 3 viewport + gate estetico L2. Il «2+» del dossier era senza P37 e senza il flusso di correzione.

## §5 Che cosa resta aperto per Francesco

1. **Ratifica del meccanismo condizionato** (scioglie la riserva di D204): le condizioni §2 diventano vincoli di spec.
2. Nessun'altra decisione richiesta ora: le domande residue dei referti sono coperte da D206 o rimandate con motivo scritto (L. 409/1985 art. 2 da rileggere su GU quando la spec ne citerà il testo — vincolo D125).

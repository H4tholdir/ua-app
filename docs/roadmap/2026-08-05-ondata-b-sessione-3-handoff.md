# Handoff — Sessione ③ dell'ondata B: wizard + scheda, GATE L2 FATTO, RESTA IL MERGE

**Per:** Francesco, e per la sessione che eseguirà il merge e aprirà la ④.
**Quando:** 5 agosto 2026 — codice e giro chiusi di notte; **gate L2 eseguito la mattina**
(`provato:` `date` → 05/08/2026, 06:25 CEST all'apertura).
**Stato:** ramo `ondata-b-sessione-3` · albero pulito ·
**NIENTE È PUBBLICATO**: su `main` restano **3 commit locali** e il ramo intero attende l'ok.
**Review finale di ramo: READY TO MERGE, zero Critical/Important** · **giro end-to-end 8/8** ·
**GATE ESTETICO L2 (FASE 9b): FATTO** — 18 ❌ trovati, **13 chiusi**, 5 deferiti col motivo.
📌 MISURATO DOPO I FIX (`provato:` `npm run verify:full`): tsc 0 · eslint 0 · vitest
**4857 passate | 19 saltate** (409 file | 3 saltati) · build ok · sei guardie verdi.
⚠️ **La review finale di ramo PRECEDE questi fix:** copre `cabfd3f0..b983870e`, e i due commit
del gate (`f584393a` codice · `a4a2f4cc` documenti) sono **dopo**. Prima del merge va rivisto
**il delta**, non tutto il ramo.

---

## 0. 🔴 CIÒ CHE RESTA DA FARE

### ① Il MERGE e la pubblicazione — li autorizza Francesco, e sono l'unica cosa che manca
Ordine: merge fast-forward su `main` → push → CI verde → smoke su uachelab.com →
**check M3-T39-6** (una foto grande sul deployment vivo: la frase «più grande di 20MB»
presuppone che il limite della piattaforma non sia più basso — provabile solo lì) → BP-1 finale.

### ② Le OTTO domande del gate HANNO RISPOSTA — D226-D234, tornata 85
Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`. In una riga ciascuna:
**D228** il Passo 3 non si tocca (va al rifacimento del wizard, e con lui M3-T2-3 e il target di
«Salta») · **D226** la terza voce dell'a2 resta com'è — e ora ha il suo scatto · **D227** niente
PillVoce · **D229** la fonte si sostituisce mai si azzera, **e il lavoro si consegna anche senza
la foto** (misurato: non è fra gli 8 elementi dell'Allegato XIII, nessun cancello la guarda) ·
**D230** §5.10 sale a sei righe · **D231** testo ora, avanzamento upload nella ④ · **D232**
auto-cattura del prescrittore: **sostanza decisa, meccanismo alla ④** · **D233** back del telefono
alla ④ + «Fatto!» compattato · **D234** un errore non si tronca più.

### ③ 🛑 UN PERCORSO APERTO OGGI, che nessuna delle otto chiude: la DdC col prescrittore VUOTO
Condizione **unanime** dei tre advisor del panel D232, e **indipendente** dall'auto-cattura:
`TabDati.tsx:283` scrive `richiedente_nome: ''`, `precheck.ts:22-25` passa lo stesso e
`generate-ddc.ts:146` usa `??` — che su una stringa vuota **non ripiega**. Esito: un documento a
valore legale può uscire **senza il nome del prescrittore, col precheck verde**. Zero occorrenze
oggi; il percorso c'è. Si chiude **a monte** (`''`→`null` al confine di POST/PATCH) nella ④,
**prima o insieme** all'auto-cattura.

### ④ I 5 ❌ deferiti dal gate, con la loro destinazione
① target di «Salta» ~33×44 (`LinkQuieto` non si estende in orizzontale) → **debito del DS**, non
si tocca a fine ramo: vive su ogni superficie v3 · ② M3-T2-3 (sgancio + «Salta») → rifacimento
del wizard (D228) · ③ il back del telefono su P37 → **primo compito della ④** (`Sheet.tsx`, base
di ogni overlay: la sua rete `scripts/guardia-navigazione-overlay.mjs` è **manuale**, vuole l'app
accesa e una fixture apposta, e G1 impedisce di provarlo in `npm run dev`) · ④ avanzamento
dell'upload (D231②) · ⑤ il «Fatto!» resta **più alto di uno schermo a 390**: il compattamento ha
tolto 30px misurati (1093 → 1063, piega a 844), ma per andare sotto servirebbe toccare il cerchio
Ø92 (verbatim del mockup) o il gap 44 fra i quieti (**vincolo di sicurezza** 0B-3) — due cose che
costano una decisione, non un ritocco.

### ⑤ Il collaudo di P37 si fa SOLO su build di produzione (G1) — invariato
In `npm run dev` StrictMode rimonta lo Sheet e l'entry di storia si mangia il foglio (~80ms).
**In build di produzione NON succede — provato.** Banco: `npm run build && PORT=3020 npm run start`.

## 1. Che cosa è successo (in tabella)

| Cosa | Esito |
|---|---|
| Mockup schermate VERE + panel 3 lenti + scelte Francesco | ✅ D223-D225 (tornata 84) — variante B · due carte · 3 derivati |
| FASE 4 coi tre registri | ✅ censimento 6 superfici (allegato al piano) · sonda R-P1 8/8 (gettone=STRINGA, pagato) · piano T1-T11 |
| T1-T2 wizard trascrizione + framing | ✅ coloreOrigine · persistenza nei 5 posti · PillVoce rimossa |
| T4-T5 route dei gesti + migration | ✅ 3 route ({errore,esito}) · dizionari chiusi in route E RPC · clone P37 · migration APPLICATA |
| T3+T9 Fatto due carte + foglio a2 | ✅ CTA che cambia mestiere · emendamento T1 (elementi-senza-colore) trovato dal revisore |
| T6-T7 lettura + scheda + D212 | ✅ embed+mapper con guardie (ValoreDizionario) · riga Colore 4 stati · registro MAI falso (Critical chiuso alla radice) |
| T8 cancellazione fail-closed | ✅ pre-check PRIMA dello storage · 23503 onesto · frasi clone-aware |
| T10 mini-foglio P37 | ✅ toccato anteposto (Critical: la rotta lo escludeva) · istituzione quando nota · dark fixato |
| Review finale di ramo | ✅ READY TO MERGE (fable) — 6 rischi trasversali verificati, triage completo dei 31 M3-* |
| Giro end-to-end (PRIMO) | ✅ 8/8 — riga DB vera, typo, divergenza, 409 fonte, baseline esatta · 60 scatti |

## 2. 🔑 Le lezioni della sessione

1. **Il numero R-P4 si misura, non si racconta:** TRE referti su cinque avevano il conteggio
   sbagliato (T1 invertito, T6 13/31 vs 14/32, T8 97/97 vs 88/88) — sempre scoperto dal revisore
   che ha RIESEGUITO la misura. I numeri dei referti si verificano, mai si credono (già lezione
   M-T3-6 della ②, ripagata tre volte).
2. **Le fixture si specchiano sulla ROTTA, non sulla forma:** il Critical di T10 (medico toccato
   mai offerto) è passato 4.848 test verdi perché il mock restituiva una risposta che la rotta
   vera non può produrre (.neq del toccato).
3. **Un numero di riga è un riferimento che si rompe da solo** (pagato TRE volte nel solo fix del
   T5): dove conta la durata, la maniglia è il TESTO. Ora scritto nel censimento.
4. **Il registro append-only si protegge PRIMA della porta, non dopo:** l'ordine PATCH→append e
   il catalogo all'ingresso rendono strutturale ciò che il messaggio d'errore rendeva solo
   dichiarato.
5. **Il gettone di concorrenza è una stringa opaca:** un Date JS perde i microsecondi e produce
   conflitti spurii — pagato dal primo giro rosso della sonda, scritto nel piano, retto in catena.

## 3. Che cosa resta aperto (oltre la §0)

**Debiti verso la ④** (consolidati dalla review finale): conferma_consegna (quarta RPC) + riapertura
`tipo` nella route typo · UI di scheda per la fonte (la frase di ripiego dell'a2 promette una via che
non esiste) · finestra non atomica typo/divergenza+PATCH (candidata RPC unica) · questione normativa
«trascrizione sbagliata su lavoro già divergente» · PATCH che azzera in silenzio il colore fuori
catalogo · NULLIF/'' su richiedente_nome a monte + unicità clienti/studio · proposta server
dell'ultimo prescrittore (D211) · popstate vs Chiudi in Sheet.tsx.
**Righe d'igiene post-merge:** le ~15 del triage (ledger `.superpowers/sdd/progress.md`, sezione
review finale). **Riga 12 roadmap** (rifacimento): eredita M3-T5-1/T5-3 + i preesistenti.

## 4. Da dove ripartire

1. **Gate L2 con Francesco**: scatti di `2026-08-05-ondata-b3-giro/` + le OTTO decisioni della §0①
   → checklist `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` sulle superfici della ③.
2. Ok di Francesco → merge fast-forward su main → push → CI/CD → smoke su uachelab.com →
   check M3-T39-6 (upload grande) → BP-1 finale.
3. Poi la ④ (DdC a due righe + precheck Q6) coi debiti del §3 e le note 8-10 del piano ②.

## 5. Il minimo per non sbagliare

- Collaudo P37: SOLO su build di produzione (G1). Banco: `npm run build && PORT=3020 npm run start`.
- Le route della prescrizione parlano `{errore, esito?}` — le altre 112 `{error}`. Mai `.error`
  sulle nuove.
- Il gettone updated_at: stringa opaca, mai `new Date()`.
- Ledger della sessione: `.superpowers/sdd/progress.md` (triage M3-* completo nella voce della
  review finale). Report del giro: `.superpowers/sdd/task-11-giro-report.md`.
- Il prossimo numero di decisione è **D226**; il conteggio vive in testa al verbale (225 in 84).

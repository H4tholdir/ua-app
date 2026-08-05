# Handoff — Sessione ③ dell'ondata B: wizard + scheda, CODICE COMPLETO E COLLAUDATO, NON MERGIATO

**Per:** Francesco, e per la sessione che eseguirà il gate L2 e (dopo l'ok) il merge.
**Quando:** 5 agosto 2026, notte (giro end-to-end e review finale chiusi dopo la mezzanotte).
**Stato:** ramo `ondata-b-sessione-3` = `e34dc71d` (29 commit da `cabfd3f0`) · albero pulito ·
**NIENTE È PUBBLICATO**: su `main` restano **3 commit locali** di questa sessione (mockup D223-D225 ·
recupero scatti P30/ondata-a · piano ③) e il ramo intero — 32 commit totali — attende l'ok.
**Review finale di ramo (modello capace): READY TO MERGE, zero Critical/Important** ·
**giro end-to-end 8/8** (il PRIMO mai percorso — `lavori_prescrizioni` 0→1→0, baseline esatta).
📌 MISURATO IN CHIUSURA (`provato:` `npm run verify:full` rilanciato al `/chiudi`): tsc 0 ·
eslint 0 · vitest **4854 passate | 19 saltate** (409 file | 3 saltati) · build ok · sei guardie
verdi · verifica «full» registrata.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, E VA FATTO PRIMA DEL MERGE

### ① Il GATE ESTETICO L2 (FASE 9b) non è stato eseguito — e ha in pancia OTTO decisioni di Francesco
Gli scatti ci sono (60 del giro in `docs/design/screenshots/2026-08-05-ondata-b3-giro/` + i 66 dei
mockup), la checklist L2 NON è stata percorsa. REGOLA ZERO: mai mergiare UI nuova senza L2.
**Le decisioni in lista per Francesco** (dal triage della review finale):
1. La voce ③ del foglio a2 («Non ce l'ho ancora qui»): pastiglie email/piattaforma + riferimento
   facoltativo — risoluzione del controllore MAI vista da Francesco.
2. La rimozione di PillVoce dal Passo 3 (obbligo di spec D13 — ma i mockup D223 la mostravano).
3. «Salta» dopo lo sgancio riapre «lo scegliamo noi» da vuota (M3-T2-3).
4. Una fonte si sostituisce ma non si azzera mai (M3-T4-2).
5. §5.10: 5 righe massime vs le 6 della card approvata — nodo APERTO scritto nella spec (M3-T7-5).
6. Upload senza avanzamento su rete mobile + testo M2 che contraddice la carta (M3-T39-4/7).
7. **G2 — P37 di fatto DORMIENTE:** il foglio «Chi ha prescritto?» chiede un'entità CON almeno un
   collega; nel dataset TUTTI i 18 clienti-entità sono mono-medico → il foglio non sale mai e
   `richiedente_nome` non nasce mai dal wizard. Candidata: auto-cattura per studio mono-medico
   (zero domande E il nome arriva). Con la D211 degradata (niente «ultimo prescrittore» — serve
   una via server, M3-T10-1) è la decisione più pesante della lista.
8. Il back del telefono sul foglio P37 AVANZA il wizard (M3-T10-2, contro la direttiva permanente;
   fix in Sheet.tsx) + WATCH: «Torna alla home» sopra la piega a 390 col gap 44.

### ② Merge e pubblicazione NON fatti — li autorizza Francesco (dopo il gate L2)
### ③ M3-T39-6 è provabile SOLO dopo il deploy
La frase «più grande di 20MB» presuppone che il limite body della piattaforma Vercel non sia più
basso: una foto grande sul deployment vivo lo prova in un minuto. Check post-deploy.
### ④ Il banco in DEV non collauda il foglio P37 (G1)
In `npm run dev` StrictMode rimonta lo Sheet e l'entry di storia si mangia il foglio (~80ms).
**In build di produzione NON succede — provato** (il giro è stato fatto su `npm run start`, porta
3020). Chi collauda P37 usa la build, o paga un'ora a cercare un fantasma.
### ⑤ Il verbale è fermo a D225 (tornata 84) — GIUSTO così
Nessuna decisione nuova di Francesco in questo tratto: le adjudicazioni del controllore vivono
nella decisione 0B, nel ledger e qui. Le OTTO decisioni della §0① genereranno D226+ al gate.

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

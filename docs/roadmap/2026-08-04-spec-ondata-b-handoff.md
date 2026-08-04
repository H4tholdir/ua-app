# Handoff — L'ondata B è pronta per la spec: D207 ratificata, vincoli fissati

**Per:** Francesco, e per la sessione nuova a contesto pulito (che scriverà la spec).
**Quando:** 4 agosto 2026, notte (`provato:` `date` a inizio sessione → `2026-08-04`).
**Stato:** `main` = `57fbf9a3` + il commit di questa chiusura · **albero pulito dopo il commit** ·
**tutto pubblicato** (il push di chiusura porta a 0 i «da pubblicare»).

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, E ANDAVA FATTO

### ① D179 resta aperta — ed è la QUARTA volta che un handoff la nomina
Le ~20 prove a schermo non girano in nessuna macchina automatica. `provato:` (audit di stanotte)
`.github/workflows/ci.yml` esegue tsc+eslint+vitest, nessun job Playwright. Oggi le prove a schermo
sono state fatte A MANO (scatti D193): il buco resta. **La voce non entra da sola: va a betting**
insieme a E1 — o si pianifica, o si dichiara che non si fa.

### ② E1 (Supabase locale + prove RLS) censita, misurata (5-10 giorni), NON iniziata
Scheda completa in `docs/ops/EMERGENTI.md` (E1). È il resto della Fase 0 di PIPELINE-3 (D197)
e il prerequisito per testare la RLS davvero. Aspetta il betting.

### ③ Il conteggio reale delle DdC non è mai stato misurato in queste sessioni
Il dossier P38 (§8.3) lo chiede prima della migration che chiude la policy
`ddc_laboratorio_update`: `npx tsx scripts/tmp/verifica-conteggio-ddc.ts`. I «3, tutte annullate»
vengono dai referti del 03/08, non da una query fresca. Da fare nella sessione ② dell'ondata B.

### ④ Q1 è in coda da stanotte senza risposta (basso rischio, default proposto)
`docs/ops/DECISIONI-PENDENTI.md` Q1: `npm test` contraddice il commento di `vitest.config.ts`.
Il default (a) può procedere alla prossima finestra se non vetato — ma nessuna finestra l'ha
ancora processato.

## 1. Che cosa è successo (la giornata intera, in tabella)

| Cosa | Esito | Dove |
|---|---|---|
| PIPELINE-3 Fase 0 (D197) + unione (D198) | ✅ nel metodo, gate verify:fast/full attivi | `docs/processes/PIPELINE-3.md` |
| Scatti D193 + guardia-stili-collaudo misurata (prima volta) | ✅ colore approvato (D199) | `docs/design/screenshots/2026-08-04-d193/` |
| Pubblicazione (D200) | ✅ CI+CD verdi, `#9a8f80` trovato nel CSS di produzione | verbale, tornata 75 |
| P38: dossier + strada B (D201) + 4 forme prescrizioni (D202) | ✅ | `docs/roadmap/2026-08-04-p38-esplorazione-referto.md` |
| Verifiche normative su fonte primaria | ✅ All. XIII p.1 e MDCG 2021-3 Q6 VERIFICATI; 2 letture prudenti ratificate (D206) | `docs/roadmap/2026-08-04-p38-verifiche-normative-referto.md` |
| Brainstorm B (D203-D205) | ✅ perimetro P38+P37 · la prescrizione la cattura il wizard · minimo normativo | verbale, tornata 76 |
| Panel su D204 (3 lenti disgiunte) | ✅ 3× REGGE CON CONDIZIONI | `docs/roadmap/2026-08-04-panel-d204-referto.md` |
| Ratifica del meccanismo (D207) | ✅ le condizioni §2 del referto panel = **vincoli della spec** | verbale, tornata 77 |

**FASE 7 misurata in chiusura** (`npm run verify:full`, 1 min 54 s): `tsc` **0** · `vitest`
**4542 passate | 19 saltate** (394 file | 3 saltati) · `next build` **0**, 81 rotte · **sei guardie
verdi** · guardia coerenza **verde** (leggere il NUMERO: dipende dalla catena, oggi oscilla 12-17).

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. **Il panel paga anche quando l'idea è giusta:** D204 era il principio corretto, ma la lente dati
   ha trovato che sui denti la prima modifica avrebbe CANCELLATO la trascrizione
   (`UNIQUE(lavoro_id,fdi)` + DELETE+INSERT in `sostituisci_atomica`). L'idea si ratifica, il
   meccanismo si verifica.
2. **«EUR-Lex si tronca» era lo strumento, non la fonte:** il consolidato completo con tutti gli
   allegati si scarica (HTML, ~1,7 MB). Le rinunce alla fonte primaria vanno ricontrollate
   periodicamente: il limite di ieri non è il limite di oggi.
3. **La citazione «MDCG 2021-3 Rev.1» non esiste:** è «MDCG 2021-3, marzo 2021». La spec la citerà
   più volte: usare la dicitura giusta da subito.
4. **Il metodo Fase 1 (pipelining) ha funzionato al primo giro:** scatti di D193 fatti mentre
   l'esplorazione P38 girava in parallelo; nessuna delle due code ha aspettato l'altra.

## 3. Che cosa resta aperto, in ordine di importanza

1. **La spec dell'ondata B** — il lavoro della prossima sessione (v. §4).
2. **D179** (prove a schermo in CI) e **E1** (Supabase locale + RLS) → betting.
3. **Conteggio DdC fresco** prima della migration di chiusura policy (sessione ② dell'ondata).
4. **Q1** in `docs/ops/DECISIONI-PENDENTI.md` (default proposto, mai processato).
5. **L. 409/1985 art. 2:** se la spec ne cita il testo, rilettura su GU prima della ratifica (D125).
6. **D-Q2** (quale prova a schermo scrivere per prima) — invariata.

## 4. Da dove ripartire

**Scrivere la spec dell'ondata B (P38+P37), sessione ① di 4.** Ingredienti, tutti pronti:
- **I vincoli:** §2 di `docs/roadmap/2026-08-04-panel-d204-referto.md` (ratificati con D207).
- **Il modello dati raccomandato:** §3 dello stesso referto (tabella `lavori_prescrizioni`,
  JSONB deliberato, fonte con CHECK, RPC dedicate, chiusura policy DdC, casa per
  `numero_prescrizione`).
- **Le decisioni:** D201-D207 (verbale, tornate 75-77) + D101, D196, W20, W22.
- **Il percorso:** FASE 4 (writing-plans coi tre registri R-P1/R-P2/R-P6) dopo la spec; PRIMA
  della spec i **mockup a Francesco** (workflow 0B: il wizard ha UI — varianti multiple,
  chiaro+scuro, mai una sola).
- Stima ratificata: 4 sessioni (① spec+mockup · ② migration+RPC · ③ wizard+scheda · ④ DdC+precheck+QA+L2).

## 5. Il minimo per non sbagliare

- La FASE 7 è UN comando: `npm run verify:fast` (quotidiano) · `npm run verify:full` (fine ondata, ~2 min).
- Le diramazioni seguono la tabella di `docs/processes/PIPELINE-3.md` §3 — mai «lo faccio al volo».
- Worktree VIETATI: branch nel repo principale (`git checkout -b`).
- Banco di prova: server su porta 3020 + `node scripts/guardia-stili-collaudo.mjs` PRIMA di
  fotografare; accesso via `scripts/tmp/link-accesso.ts` (D103), riscrivendo l'origine su localhost.
- La data si legge da `date` (D155). Il numero della guardia si legge, non solo il colore (P32).
- Il prossimo numero di decisione è **D208**; il conteggio vive in testa al verbale.

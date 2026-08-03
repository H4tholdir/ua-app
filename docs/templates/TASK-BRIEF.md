# TEMPLATE — Brief di compito (PIPELINE-3 §5, D197)

> Si copia per ogni compito affidato a un esecutore (subagent o sessione fresca) e si compila
> TUTTO: una sezione vuota è un mandato ambiguo. Formalizza la prassi SDD già in uso
> (`.superpowers/sdd/*-brief.md`) con R-E1/R-E2 dentro. L'esecutore è UNO e fresco (R-E1),
> e il brief gli chiede esplicitamente di cercare dove il piano sbaglia.

---

## Compito <N> — <titolo>

**Ondata/voce:** <P-nn / nome ondata> · **Piano:** `<percorso del piano>` · **Data:** <da `date`, mai dedotta>

### 1. Obiettivo
<Che cosa deve essere VERO alla fine, in 2-4 righe. Non «che cosa fare»: che cosa risulta.>

### 2. Territorio
- **File di competenza:** <elenco esplicito>
- **File VIETATI:** <hotspot che questo compito non tocca: migrations, design token, generatori PDF, …>
- **Fuori scope:** <ciò che NON è chiesto, detto esplicitamente>

### 3. Vincoli da rispettare
<Decisioni D-nnn rilevanti (verbale), spec approvate, regole §0C che mordono qui (R-P4 per il TDD, FASE 6b se c'è migration, …)>

### 4. Contratto di verifica
- **Comando pass/fail eseguibile dall'esecutore:** <es. `npx vitest run tests/unit/<file> && npx tsc --noEmit`>
- **Evidenza da incollare nel referto:** <output reale dei comandi, screenshot se UI, conteggi>
- Chiusura del blocco: `npm run verify:fast` verde.

### 5. Consegna
- Referto nel formato `docs/templates/EVIDENCE-PACK.md`, in `<percorso referto>`.
- **R-E2:** un difetto trovato FUORI dal territorio si RIFERISCE nel referto (sezione 5), non si
  corregge — e la sessione madre lo porta in `docs/ops/EMERGENTI.md` secondo la policy §3.
- **Cerca attivamente dove il piano sbaglia**: se un'assunzione non regge, fermati e riferisci
  (è il meccanismo che ha trovato 8 difetti su 8 nell'ondata (a)).

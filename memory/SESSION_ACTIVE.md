# Sessione attiva — nome e cognome paziente: SPEC RATIFICATA, zero codice (27/07/2026)

✅ **BP-2 completo fino a FASE 3 + panel 3×.** Spec confermata da Francesco:
`docs/superpowers/specs/2026-07-27-nome-cognome-paziente-design.md`. **Nessuna riga di codice**,
per scelta: il panel (1 conferma con riserve, **2 «da rivedere»**) ha trovato tre trappole che
`tsc` e i 3364 test non potevano vedere.

**La scoperta:** `pazienti.nome`/`cognome` **esistono già** e il trigger compone `COGNOME NOME` →
la **tappa 1 risolve la lamentela senza toccare `Cassetta.tsx`**. Niente migration, percorso Media.

**Tre cose da leggere prima di toccare `crea-lavoro.ts`** (handoff §3): il fallback
`cognome: alias || pz` è **portante** — toglierlo blocca le consegne (`precheck.ts:40-43`, `''` non
è nullish) · `nome: ''` mai `null` o muore la creazione del lavoro · cognome vuoto + nome pieno
scrive **«Pz-0042 Giuseppe»** in targa.

**Decisioni nuove:** D6 due caselle confermate · D7 due tappe · D8 il tecnico vede il nome
(→ allineare `ANALISI/17`) · **D9 correzione anche dalla scheda del lavoro → apre una tappa 1-bis
GRANDE** sulla fotografia congelata (rettifica GDPR vs immutabilità MDR).

🔑 **DIRETTIVA PERMANENTE NUOVA (D10):** «ogni campo del lavoro si corregge, **fino alla
consegna**» — incisa in `ua-app/CLAUDE.md` §9. Oggi rispettata a metà: `PATCHABLE_FIELDS` esclude
**16 campi** solo perché il form non li mostra. Modello da generalizzare: `LOCKED_PRICE_FIELDS`.

**PUNTO DI RIPRESA:** `docs/roadmap/2026-07-27-nome-cognome-paziente-execution-handoff.md` —
si riparte da **FASE 4 (writing-plans) sulla tappa 1**, non da un nuovo brainstorming.

⚠️ I numeri della scala (tappa 2) erano sbagliati: corpo paziente **11,5px** non 10, fascia **78**
non 72, e la misura va fatta sull'asse **orizzontale**. Dettaglio in MEMORY.md voce 49.

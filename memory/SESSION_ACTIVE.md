# Sessione attiva — ONDATA (b) APERTA: 16 decisioni ratificate, spec scritta senza domande aperte, ZERO codice (28/07/2026)

🛑 **PUNTO DI RIPRESA: la spec `docs/superpowers/specs/2026-07-28-wizard-ondata-b-schermate-design.md`**
(🟡 **da rileggere e ratificare**) + il verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`.

**Perimetro: il solo wizard** (D1). 🛑 **Il catalogo colori è CHIUSO** (D3): decade la «quinta eredità» e
la richiesta di panel — il panel era stato fatto e ha **falsificato entrambe le gambe** della premessa.
🆕 **`pazienti` diventa anagrafica**, ma solo lato wizard (D4/D5): si cerca prima di creare, **per cognome,
dentro il solo studio scelto** (D6/D11 — `pazienti.cliente_id` è NOT NULL: un paziente appartiene a uno
studio). **Variante A** ratificata sui mockup (la ricerca vive dentro la casella «Cognome», D9) ·
**avanzamento a briciole**, `ProgressDots` esce dal wizard (D10) · **passo foto sempre presente** (D8) ·
due caselle nome/cognome facoltative, **niente «Salta»** (D2) · **«Dimmelo a voce» esce del tutto**, 4 usi
+ 2 test + 1 regola DS (D13) · **stretto per le domande, largo per denti e colore** (D14) · deroga sul nome
paziente concessa e **regola DS riscritta** (D7).

🔴 **Verificati aprendo i file:** il wizard non ritrova mai un paziente · `crea-lavoro.ts:229-230` manda
`nome:''`/`cognome:alias||pz` **fissi** · **nessun vincolo di unicità** su `codice_paziente`.
**Chiuse a fine giornata:** **D15** il codice paziente è sempre quello di UÀ → indice unico
`(laboratorio_id, codice_paziente)`, **misurato prima di decidere: 0 duplicati su 916 pazienti** (e il
commento `schema.sql:461` «assegnato dallo studio» va corretto: non descrive più il sistema) · **D16**
`ProgressDots` **muore** (senza il wizard non ha consumatori).
**Prossimo:** rilettura della spec → piano (R-P1/R-P2/R-P6) → ramo (🛑 **mai worktree**) → codice.
⚠️ **Mancano 3 mockup prima del React:** passo foto · passo cassetta · avviso «codice già in uso».
🔑 Baseline DB invariata: **294 lavori · 0 denti · 916 pazienti · 48 colori** (nessuna scrittura oggi).

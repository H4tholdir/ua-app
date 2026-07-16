# Decisione design — Pagina /fatture/riconciliazioni (Task 15, ondata R1)

**Data:** 16/07/2026 · **Decisore:** Francesco Formicola
**Mockup:** `docs/design/mockups/2026-07-16-riconciliazioni.html`
**Screenshot:** `docs/design/mockups/screenshots/2026-07-16-riconciliazioni-{390,768,1280}-{light,dark}.png`

## Scelta: **Variante A — lista raggruppata (sezioni collassabili, contatore-first)** con revisione copy «da banco»

Variante B (inbox per gravità) scartata. Dopo la scelta, Francesco ha richiesto la
riscrittura integrale del linguaggio: «claim orfani», «SMTP stagnanti» ecc. sono gergo
software incomprensibile per un odontotecnico. Revisione approvata («ok procedi»).

## Copy approvato (mappa gergo → banco)
- Titolo pagina: **«Da sistemare»** + sottotitolo «Fatture e ricevute che hanno bisogno di te»
- Claim orfani → «Segnate come inviate, ma l'invio non risulta»
- SMTP stagnanti → «In attesa di risposta da troppo tempo»
- Stornate con TD04 rifiutato → «Note di credito rifiutate dallo Stato»
- Saldi negativi → «Conti clienti da sistemare»
- Parcheggiate/quarantena → «Ricevute da controllare a mano»
- Ogni gruppo ha una riga di aiuto in parole semplici; codici tecnici (TD04, EC02,
  identificativi, nomi file) SEMPRE come dettaglio secondario, mai come titolo;
  «TD04» sempre accompagnato da «nota di credito»; «SdI» espanso alla prima
  occorrenza («il sistema dell'Agenzia delle Entrate»), poi «lo Stato»; date parlate.
- Bottoni parlanti: «Sblocca e reinvia», «Conferma ricevuta», «Controlla e conferma»,
  «Vedi il conto», «Sì, procedi».
- Avviso quarantena (emendamento panel advisor): «Verifica firma non disponibile —
  controllo manuale obbligatorio».
- Sheet proposta upload: «Ecco cosa ho letto» con dati estratti (content-engagement,
  mai OK generico). Doppia conferma TD04 con effetti spiegati + spunta obbligatoria.
- Empty state: «Tutto a posto ✓».

## Note DS
Superficie **DS v2.3** (sezione Fatture non ancora migrata a v3; regola convivenza
per route). Il copy segue lo spirito della Legge L2 del DS v3 («parole del banco»)
pur restando visivamente v2.3 — migrerà a v3 con l'ondata «Le sezioni → Fatture».

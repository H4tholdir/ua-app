# Decision record — Ondata «Fondamenta residue + 4b Consegna»: decisioni ratificate

**Data:** 16 luglio 2026
**Decisore:** Francesco Formicola
**Spec:** `docs/superpowers/specs/2026-07-16-ds-v3-fondamenta-residue-4b-consegna-design.md` · figlia `2026-07-09-ds-v3-il-cuore-design.md` (sp.3 §8-9) · legge madre `2026-07-07-design-system-v3-una-cosa-alla-volta.md`
**Mockup-legge:** `docs/design/mockups/2026-07-09-il-cuore/consegna.html` (approvato Ondata 0) + `home.html` (`.nav-desk`) + `scheda-lavoro.html` (`.foto-strip`, `.menu-voce`) · `docs/design/mockups/2026-07-16-navdesk-tasto-varianti.html` (decisione D-4, variante A)
**Contesto:** brainstorming 16/07/2026 (3 sezioni + 2 panel advisor) — Fase F (5 componenti ds mancanti + check-ds esteso) e Fase C (migrazione flusso Consegna a v3, pagina intermedia muore). Percorso GRANDE (dominio MDR), server INTATTO salvo 1 route GET read-only.

## Decisioni ratificate (D-1…D-6)

| # | Decisione | Fondamento |
|---|-----------|-----------|
| D-1 | **Numerazione DdC resta a t=0** con annullo tracciato. La nota vincolante 09/07 «numero DdC al commit dei 10 minuti» è **SUPERATA** | Panel 2 advisor convergenti: parere normativo (Art. 52(8) impone la DdC *prima* dell'immissione sul mercato; All. XIII non impone numerazione; ISO 13485 §4.2.4 → annullo tracciato è la prassi corretta) + parere architetturale (numero+sha256 dentro il PDF; niente cron). Condizioni già rispettate: numero mai riusato, DdC annullata conservata ≥10 anni (15 se impiantabile), registro mostra le annullate |
| D-2 | **Il frame «Consegnato!» non elenca la fattura** (la consegna non la produce più: fatturazione concordata). Lista = DdC · Buono · WhatsApp. Sotto: riga quieta «La fatturazione si decide con il dentista» **senza link** (destinazione v2.3 fuori mappa IA §6.1; link rivalutato quando Fatture/Scadenzario migreranno, sp.4) | Ratifica esplicita 16/07 (2 domande separate) |
| D-3 | **Ruoli consegna: status quo** — tutti i ruoli del lab (titolare, tecnico, front_desk) possono consegnare. Documentato come decisione esplicita; la GET nuova replica esattamente l'authz del POST (mai più permissiva) | Ratifica esplicita 16/07 su segnalazione appsec (il POST non ha gate di ruolo) |
| D-4 | **NavDesk variante A**: il tasto «+ Nuovo lavoro» resta la variante fisica locale H52/16 (identica alla legge visiva `home.html` §12.3). NO riuso `TastoPrimario` (H fissa 70/60 + violazione «UNO per schermata» a 1280 dove c'è già CONSEGNA in `SchedaAnteprima`). Emendamento §5.35 che ratifica la variante locale | Decisione visiva su mockup `2026-07-16-navdesk-tasto-varianti.html` (3 varianti × 2 temi) |
| D-5 | **Approccio A**: flusso in-place, la route `/lavori/[id]/consegna` muore (redirect). 2 tocchi da scheda e pile | Ratifica esplicita 16/07 |
| D-6 | **Warning materiali non bloccanti dentro il DialogConferma** (nota ambra compatta), non in sheet separato: lo sheet «Consegna comunque» sarebbe l'interstitial vietato da sp.3 §8 e romperebbe i 2 tocchi. `MaterialiWarningSheet` muore | Raccomandazione netta advisor UX, sez. 2 approvata |

## Deviazioni ratificate dal mockup consegna (`consegna.html`, Frame 3)

1. **Riga fattura RIMOSSA dal frame «Consegnato!»** — la consegna non produce più la fattura (fatturazione concordata, D-2). Al suo posto: riga quieta statica «La fatturazione si decide con il dentista», **senza link** (stile proprio ~14.5/600 `--muted`, NON `LinkQuieto` — riservato alle vie di fuga §5.5), posizionata sotto la card, sopra il `TastoWhatsApp`.
2. **Voce WhatsApp «pronto da inviare» mai ✓** — la lista del frame recita «Messaggio WhatsApp — pronto da inviare» con tint neutra: MAI il check verde prima che l'invio sia realmente avvenuto (il tasto WhatsApp resta un'azione separata dell'utente, non un esito automatico).
3. **Annullo del frame = `LinkQuieto` + countdown** (fedele al Frame 3 del mockup, niente banner dentro il frame); la riga di trasparenza «Annullando, la DdC e il buono vengono annullati» vive nel `DialogConferma` dell'annullo (ordine standard: sicura sopra), non nel frame stesso. Il flusso annullo server (`annulla-consegna`, RPC, finestra 10 min) resta INTATTO.

## Riferimento mockup NavDesk

Decisione visiva D-4 (variante fisica locale del tasto «+ Nuovo lavoro») presa su `docs/design/mockups/2026-07-16-navdesk-tasto-varianti.html` — 3 varianti × 2 temi, variante A approvata. Emendamento corrispondente inciso in `2026-07-07-design-system-v3-una-cosa-alla-volta.md` §5.35 (v. sopra).

## Nota di superamento — decision record 09/07

La riga bucket C «Normativo: numero DdC assegnato al commit dei 10 minuti (mai a t=0)» in `docs/design/decisions/2026-07-09-il-cuore-mockups.md` è marcata **SUPERATA il 16/07/2026** da D-1 (v. nota appesa direttamente in quel file). Le altre due clausole della stessa riga (fase «FATTA» firmata dall'utente autenticato; logica «non fatturare» confinata ad annullo/reso) restano valide, invariate.

## Prossimo passo

Piano di esecuzione Fase F + Fase C via `superpowers:writing-plans`/SDD, derivato dalla spec `2026-07-16-ds-v3-fondamenta-residue-4b-consegna-design.md`.

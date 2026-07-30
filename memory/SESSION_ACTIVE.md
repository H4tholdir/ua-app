# Sessione attiva — ondata (b): il piano dell'album è scritto (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md`** — **13 task in
cinque blocchi**, con registro prove (P1-P20), registro letture (R-P2) e censimento (R-P6).
⚠️ Il ledger `.superpowers/sdd/progress.md` è **fuori dal repo git**: non può essere il punto di ripresa.
Spec **RATIFICATA**: `docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md`.
Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **settantanove decisioni**.

**Ramo `ondata-b-schermate`** — niente su `origin`. ✅ Otto task chiusi (T1-T8 dell'ondata).

➡️ **PROSSIMO: eseguire il piano, UN TASK PER SESSIONE/ESECUTORE FRESCO (R-E1)**, con revisione fra l'uno
e l'altro e il mandato esplicito di **cercare dove il piano sbaglia**. Ordine: **A (dato) → B (cancellazione)
→ C (componenti) → D (innesto) → E (chiusura)**. 🛑 **B deve atterrare prima di D-T12**, o «Elimina foto»
promette il falso.

🔑 **Il piano ha già chiuso una domanda aperta della spec con una prova (P14):** il **valore** della marca
degli overlay **non cambia nessun comportamento** in `storia-overlay.ts` (il gate è sull'**esistenza**), e
`type Marca` è un'unione **chiusa e non esportata** → **visore e tendina riusano `'uaSheet'`**, che tiene
anche verde `guardia-navigazione-overlay.mjs:97`.

🛑 **Tre trappole misurate che il piano porta scritte:** ① la finta dei test espone **solo `from`**, quindi
il primo `storage.remove` **romperà un test** per una ragione che non è un difetto (P12) · ② **due blocchi
dello scorrimento si incastrano**: blocca **solo** il visore, o il corpo resta bloccato per sempre (P16) ·
③ **Esc non è mediato dalla pila**: un solo Escape **collassa tutti e tre gli strati** (P18).

🔧 **Corretta oggi R21 nel verbale: la prima stesura era SBAGLIATA.** La guardia del design system **non**
è ferma a v2.3 — ha tre controlli veri su `src/components/ds` + `src/design-system/v3` ed è agganciata al
pre-commit. Il fatto vero è più stretto: **il perimetro non copre `src/components/features/**`**.

⚠️ **Scostamento dal mockup, dichiarato (S1):** la conferma è `DialogConferma` (card **centrata**), non il
foglio dal basso disegnato — è «l'UNICA card centrata ammessa dal design system, riservata alle conferme
distruttive». **Francesco lo deve sapere: la forma che vedrà è diversa dal mockup.**

# Decisione — «Salva il nome» / «Salva il colore» restano così (eccezione al dizionario §2.3)

**Data:** 26/07/2026 · **Decisore:** Francesco Formicola
**Superficie:** `src/components/features/cassette/CassettaSheet.tsx` — i due tasti della scheda cassetta
**Regola in deroga:** DS v3 §2.3, dizionario obbligatorio — `src/design-system/v3/dizionario.ts`,
voce `/\bsalva\b/i` → «Fatto ✓ (o salvataggio automatico silenzioso)»

## Come è emersa

La guardia del dizionario sulla superficie parete era stata cancellata insieme a
`tests/unit/stanza-parete.test.tsx` durante l'ondata e non era stata rimpiazzata: la review finale
(area test) l'ha trovata mancante e l'ha ripristinata. Ripristinata, la guardia ha segnalato che le
due etichette dei tasti della scheda cassetta contengono la parola vietata «salva». Il check
pre-commit non le vedeva perché greppa solo `src/components/ds/`, e `CassettaSheet.tsx` vive in
`src/components/features/`.

## Decisione

**Le due etichette restano «Salva il nome» e «Salva il colore».**

Motivo dichiarato dal principio già in vigore nel progetto: fa fede ciò che Francesco ha VISTO e
approvato negli screenshot ratificati — e i mockup della scheda cassetta mostravano queste parole.
La stessa adjudicazione era già stata applicata nell'ondata (caso `font-weight` 500 vs 600 della
fascia C): quando il testo di una regola e la resa ratificata divergono, **vince la resa ratificata**.

Non è quindi una violazione lasciata aperta: è un'eccezione decisa, con la sua ragione.

## Conseguenze operative

- Il dizionario **non** cambia: la regola generale resta valida per ogni altra superficie. Questa è
  un'eccezione puntuale su due etichette, non un ammorbidimento della §2.3.
- Chi in futuro ripassa il dizionario su questa superficie troverà il rimando qui e **non deve
  «correggere»** le due etichette: sono state guardate e tenute.
- Se un giorno la scheda cassetta viene ridisegnata e le etichette cambiano comunque, questa
  eccezione decade da sé — non c'è niente da smontare.

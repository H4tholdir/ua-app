# Final review fixes — DS v3 «Il cuore» Ondata 0

Anchor calendario: giovedì 9 luglio 2026 (10=ven, 11=sab, 13=lun, 14=mar, 16=gio).
Tutti i file sotto `docs/design/mockups/2026-07-09-il-cuore/`.

## 1 — (Critical) `.pill-fase` mancante in pila-aperta.html
- **Cosa:** la pill «FATTA ✓» del split-view 768 (scheda n.147) usava `.pill-fase` mai definita → rendeva come bottone nativo grigio.
- **Dove:** `pila-aperta.html` — aggiunto il blocco CSS `.pill-fase` (+ `:active`/`:focus-visible`) copiato VERBATIM da `scheda-lavoro.html` (H44 · gradiente verde #269950→--green · corsa 3px #14602C · testo 14.5/800 bianco). Corretto il commento di testata (§22-25): `.pill-fase` NON è in `_base.css`, è copiata più in basso nel `<style>`.
- **Verifica:** `pila-aperta-768-light.png` → pill verde 3D con testo bianco. ✓

## 2 — (§5.23) NotaDentista non conforme in scheda-lavoro.html
- **Cosa:** `.nota` rendeva card `--elv` + bolla-icona ambra + testo 16.5/600 `--ink`, contro §5.23 («barra verticale 3.5 --blue + testo 15/600 muted "[citazione]" — Dr. X»).
- **Dove:** `scheda-lavoro.html` — riscritto il blocco CSS `.nota`: `border-left: 3.5px solid var(--blue)`, niente background `--elv`, niente `.ic`; `.cit`/`.firma` 15/600 `--muted`. Rimossi i 5 span-icona `.ic` (chat-bubble) dalle 5 occorrenze (F1, F2, 768, 1280 + F5 «Provata in bocca»). Aggiunto commento di citazione §5.23. La rimozione di `--elv` risolve anche l'inversione in dark.
- **Verifica:** `scheda-lavoro-390-light.png` + `-dark.png` → barra blu, testo muted, nessuna card / nessuna bolla ambra, nessuna inversione dark. ✓

## 3 — (Calendario) date irrealistiche vs anchor
- `README.md` cast n.149: «consegna ven 11» → «ven 10» (+ annotazione).
- `pila-aperta.html` morph ambra: «il più vicino venerdì 11» → «venerdì 10» (+ annotazione).
- `scheda-lavoro.html` F3 sheet chip: «Lun 14» → «Lun 13» (+ annotazione).
- `scheda-lavoro.html` F5 fasi: «lun 7» → «mar 7», «mar 8» (×2) → «mer 8».
- `scheda-lavoro.html` F5 consegna: «Ven 11 · 10:00» → «Lun 13 · 10:00»; aggiornata l'annotazione «momento successivo» (n.145 deve essere più tardi del venerdì 10 di n.149 nella pila ambra).
- `home.html` («per venerdì», «Giovedì 9 luglio») e `wizard.html` («giovedì 16 luglio») già corretti → lasciati invariati.

## 4 — (§5.9) pill «In prova» fuori vocabolario in scheda-lavoro.html
- **Cosa:** la pill «IN PROVA» (F5, n.145) è fuori dal vocabolario chiuso e dalle estensioni ratificate.
- **Dove:** `scheda-lavoro.html` — aggiunta al commento di testata la nota «ESTENSIONE VOCABOLARIO PROPOSTA (§13.3): pill "IN PROVA" (fam. ambra) per lavori in prova esterna — da ratificare al gate Task 8». Pill mantenuta (necessaria per `in_prova_esterna`).

## 5 — (Minor) consegna.html dialog TastoPrimario H64 vs §5.1 H70
- **Cosa:** `.dialog .tasto-primario { height: 64px }` contro §5.1 «H70 non negoziabile».
- **Dove:** `consegna.html` — ripristinato a `height: 70px` (la card max-340 regge il 70 senza rompersi; verificato in `consegna-390-light.png`). Commento aggiornato.

## 6 — (Minor) consegna.html orologio «Fattura in preparazione» stroke-width
- **Cosa:** l'icona orologio della riga «Fattura · in preparazione» aveva `stroke-width="2"` contro il canone 1.7 (usato dall'orologio annullo F4).
- **Dove:** `consegna.html` — `stroke-width="2"` → `"1.7"`.

## 7 — (Minor, L3) home.html striscia alert: numero n.139 troncato
- **Cosa:** «La fattura di n.139 è stata scartata» si troncava perdendo n.139 (mobile e footer nav 240px).
- **Dove:** `home.html` — copy accorciata a «Fattura n.139 scartata» (numero in grassetto) in ENTRAMBE le occorrenze (striscia mobile + footer nav desktop), CTA «Sistemala ›» invariata. L'icona-triangolo esistente È il «⚠️» (non duplicato in testo). Annotazioni §2.2/L3 aggiunte. Variante serena invariata.

## Screenshot rigenerati
`pila-aperta` (6), `scheda-lavoro` (6), `consegna` (6), `home --short --no-scroll` (8, assert §3.3 no-scroll PASSATO — nessun ✗, exit 0).

---

# Final review fixes — Ondata A mini-triage (whole-branch review, 20/07/2026)

## 1 — (Important) giorni trial in giorni civili di Roma, non periodi di 24h
- **Cosa:** `src/app/(app)/dashboard/page.tsx` calcolava `giorniRimasti` con `Math.ceil((trial_ends_at_epoch - Date.now()) / 86_400_000)` — una sottrazione fra epoche assolute (periodi di 24h), mentre le copy di `sTrial` («finisce oggi/domani/dopodomani») parlano di giorno CIVILE. Nell'ULTIMO giorno di trial, con poche ore residue, il calcolo dava ancora `1` → «finisce domani» invece di «finisce oggi»; `0` («finisce oggi») era di fatto irraggiungibile prima che il redirect di layout (B15, stato `scaduto`) intercettasse l'utente.
- **Fix:** estratta una funzione pura `giorniCiviliRimasti(trialEndsAt: string, oggiRoma: Date): number` in `src/lib/dashboard/striscia.ts` (import di `adessoRoma` da `@/lib/utils/data-roma`). Confronta il giorno civile di Roma di `oggiRoma` (già wall-clock, tipicamente `adessoRoma()`) con quello di `trialEndsAt` convertito allo stesso modo, con `Math.round` sulla differenza in giorni interi e clamp a `>= 0`. `src/app/(app)/dashboard/page.tsx` ora chiama `adessoRoma()` una sola volta (riusata anche per l'eyebrow) e passa il risultato a `giorniCiviliRimasti`.
- **Test:** aggiunto `describe('giorniCiviliRimasti — …')` in `tests/unit/striscia-trial.test.ts` — 3 casi: fine oggi (qualsiasi ora dello stesso giorno civile) → `0`; fine domani a ridosso della mezzanotte in entrambe le direzioni → `1`; fine ieri → `0` per clamp. `npx vitest run tests/unit/striscia-trial.test.ts` → 8/8 passed.

## 2 — (Important) revoca invito silenziosa + unhandled rejection
- **Cosa:** `src/components/features/tecnici/InvitoPersonaSheet.tsx` — `revoca()` e `caricaInviti()` avevano `try/finally` senza `catch`: un fetch rifiutato (rete giù) diventava una unhandled promise rejection e, per `revoca()`, un fallimento silenzioso (nessun feedback, nessuna via per riprovare) — l'utente credeva l'invito revocato.
- **Fix:**
  - `revoca(id)`: aggiunto `catch` → `setErrore(MESSAGGIO_ERRORE_RETE)` su rigetto di rete; su `res.ok === false` legge `json.error` (fallback a un messaggio fisso) e lo mostra con `setErrore`. In ENTRAMBI i casi l'invito NON viene rimosso dalla lista (nessuna rimozione ottimistica pre-successo).
  - `caricaInviti()`: aggiunto `catch` che degrada in silenzio con `console.error` (è una lettura — nessun cambiamento UI, coerente con lo stile `leggi*` già in `striscia.ts`).
- **Test:** aggiunto `it('revoca fallita (DELETE → 500) → alert visibile, invito ancora in lista …')` in `tests/unit/invito-persona-sheet.test.tsx`. `npx vitest run tests/unit/invito-persona-sheet.test.tsx` → 7/7 passed.

## 3 — (Minor) doppio input durante il salvataggio in ConfermaCassettaSheet
- **Cosa:** `src/components/features/pile/ConfermaCassettaSheet.tsx` — durante `salvando` (PATCH in volo) il tasto primario era già disabilitato, ma la via di fuga «Conferma senza cassetta» (`LinkQuieto`, che non espone `disabled`) e le chip cassetta (`ChipScelta`, idem) restavano tappabili: un doppio tap poteva far partire un secondo `onConfermato` o cambiare la selezione sotto una richiesta già in corso.
- **Fix:** guard `if (salvando) return` in cima agli `onClick` di entrambe — chip cassetta e link «Conferma senza cassetta» — nessun cambio di API dei componenti DS.
- **Test:** aggiunto `it('durante il salvataggio, «Conferma senza cassetta» e le chip sono guardate — niente doppio input …')` in `tests/unit/conferma-cassetta-sheet.test.tsx` (fetch sospesa manualmente per simulare `salvando=true`, verifica che i tap guardati non chiamino `onConfermato` né cambino la selezione, poi risoluzione della fetch e verifica di UNA sola chiamata). `npx vitest run tests/unit/conferma-cassetta-sheet.test.tsx` → 5/5 passed.

## Verifica finale
- `npx vitest run tests/unit/striscia-trial.test.ts tests/unit/invito-persona-sheet.test.tsx tests/unit/conferma-cassetta-sheet.test.tsx` → **3 file, 20/20 test passed**.
- `npx tsc --noEmit` → nessun errore.
- `npx eslint` sui file toccati → nessun warning/errore.
- Full gate `npx vitest run` → **283 file passed, 3 skipped (286) · 2317 test passed, 19 skipped (2336)**.

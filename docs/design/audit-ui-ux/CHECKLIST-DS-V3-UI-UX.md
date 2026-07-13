# Checklist atomica UI/UX — Conformità DS v3

> Checklist riutilizzabile per Livello 1 (micro-pass), Livello 2 (gate di ondata) e Livello 3 (audit capillare). Ogni voce è **atomica e verificabile**. Per ogni superficie/elemento: passare tutte le sezioni sui **3 viewport (390 · 768 · 1280) × 2 temi (light · dark)**.

**Legenda esito:** ✅ conforme · ⚠️ da migliorare (Minor) · ❌ difetto (fixare) · N/A.

---

## 1. Layout & allineamento
- [ ] Elementi allineati a una griglia coerente (nessun disallineamento di 1-3px tra label/valore, header/contenuto).
- [ ] Header (back, titolo, azioni, avatar) allineati tra loro e coerenti con la colonna di contenuto (su desktop: header dentro/fuori la card in modo intenzionale, non casuale).
- [ ] Margini simmetrici; nessun elemento «attaccato» al bordo o otticamente storto.
- [ ] Ordinamento visivo = ordinamento logico (l'occhio segue il flusso previsto).

## 2. Proporzioni & spazio
- [ ] Larghezza contenuto adeguata al viewport (desktop: card centrata senza **spazio morto** eccessivo — valutare max-width, colonna affiancata, o contenuto che riempie).
- [ ] Spaziatura verticale dai token `spazio.*` (v3), ritmo coerente tra sezioni (no salti arbitrari).
- [ ] Densità: né soffocato né dispersivo; gerarchia di respiro tra blocchi.
- [ ] Rapporti dimensionali coerenti (bottoni, card, icone in scala tra loro).

## 3. Sovrapposizioni & z-index
- [ ] Nessun overlap indesiderato (avatar/⋯/back, bottom-nav vs contenuto, sheet vs FAB, tooltip/badge).
- [ ] Bottom-sheet e menu non coprono contenuto necessario; `safe-area` rispettata (notch/home indicator).
- [ ] Stacking corretto (dialog sopra overlay sopra contenuto), nessun click-through.

## 4. Tipografia & gerarchia
- [ ] Scala tipografica dai token `tipografia.*` (v3); nessuna dimensione inline arbitraria.
- [ ] Gerarchia chiara (titolo > label > valore > caption); peso/tracking coerenti.
- [ ] DM Sans ovunque (❌ MAI Inter). Line-height leggibile; nessun clip verticale (attenzione al line-height Tailwind ereditato su testi DS — bug noto sistemico).
- [ ] Troncamento/ellissi gestito su testi lunghi; nessun overflow orizzontale.

## 5. Colore, contrasto, tema
- [ ] Solo variabili/token v3 (`--bg/--sfc/--elv`, semantici, `ds-v3.css`); ❌ nessun hex hardcoded.
- [ ] Contrasto WCAG AA su TUTTO il testo (incl. `--faint`, pill, badge, testi su tint).
- [ ] Light **e** dark verificati: dark = flat (card leggermente più chiara del bg, no shadow raised); light = warm panna senza gloss.
- [ ] Colore mai unica fonte di stato (icona/testo di supporto sempre presenti).

## 6. Motion & micro-interazioni
- [ ] Animazioni SOLO da `src/design-system/v3/motion.ts`; ❌ nessun `duration`/easing/cubic-bezier inline.
- [ ] Feedback al tap/press coerente (molla `press`), stati hover/active/focus visibili.
- [ ] `prefers-reduced-motion` rispettato (nessuna animazione essenziale-solo-decorativa forzata).
- [ ] Nessuna animazione su ogni scroll; solo su eventi significativi.
- [ ] Transizioni di apertura/chiusura sheet/menu fluide, senza scatti o flash.

## 7. Suono & haptic
- [ ] Suoni da `src/lib/feedback/sounds.ts`, haptic da `src/lib/feedback/haptic.ts`; lazy init + preferenza utente; ❌ mai autoplay.
- [ ] Feedback sonoro/haptic presente sugli eventi chiave (conferma, successo, errore) e **coerente** tra superfici.
- [ ] Volume/intensità appropriati; nessun suono su azioni banali/ripetute.

## 8. Touch target & interazione
- [ ] Target tappabili ≥ **44×44px** (bottoni, righe editabili, chevron, icone-azione).
- [ ] Area di tap non ambigua (nessun bersaglio troppo vicino ad altro); hit-area coerente col visivo.
- [ ] Gesti (swipe/drag su sheet) fluidi e reversibili; nessun tap accidentale su elementi critici.

## 9. Stati (empty · loading · error · disabled)
- [ ] **Empty state** presente e utile (non pagina vuota); affordance per l'azione primaria (es. «aggiungi prima nota»).
- [ ] **Loading**: skeleton/spinner coerente, nessun layout shift (CLS) all'arrivo dati.
- [ ] **Error**: messaggio azionabile, mai stringa tecnica grezza; recovery chiaro (retry/rollback).
- [ ] **Disabled**: motivo sempre esplicito (callout), mai bottone morto senza spiegazione; contrasto disabled comunque leggibile.

## 10. Responsive (3 viewport)
- [ ] **390** (mobile): card-first, bottom-sheet, no scroll orizzontale, no-scroll dove richiesto.
- [ ] **768** (tablet): layout intermedio corretto (non «mobile stirato» né «desktop compresso»).
- [ ] **1280** (desktop): uso dello spazio intenzionale (card centrata / colonna / pannello), nessun vuoto sproporzionalmente eccessivo.
- [ ] Nessun elemento che rompe o si sovrappone ai breakpoint intermedi.

## 11. Accessibilità (oltre WCAG colore)
- [ ] Nomi accessibili corretti su ogni controllo (`aria-label` allineato al testo visibile — WCAG 2.5.3 label-in-name; evitare label che divergono dal visibile senza motivo).
- [ ] `:focus-visible` presente e visibile su TUTTI gli elementi interattivi (gap noto: bottoni inline-styled v3 senza ring).
- [ ] Ruoli/landmark corretti (dialog, alert, list); ordine di tabulazione logico; chiusura sheet con Esc.
- [ ] Icone decorative `aria-hidden`; contenuto informativo non solo iconico.

## 12. Copy & microcopy
- [ ] Testi in italiano corretto (accenti/diacritici), tono coerente col brand, nessun placeholder.
- [ ] Terminologia coerente tra superfici (stesse etichette per stessi concetti).
- [ ] Callout/errori concisi e umani; nessun gergo tecnico verso l'utente finale.

---

## Come registrare l'esito
Per ogni superficie audita, produrre una tabella `elemento × sezione → esito (✅/⚠️/❌)` con nota e `file:riga` del fix, + screenshot before/after in `docs/design/screenshots/<data>-<superficie>/`. I ❌ e ⚠️ diventano task di fix (Livello 1/2) o finding dell'audit (Livello 3).

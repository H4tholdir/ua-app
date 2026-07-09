# Decisione — PillVoce v2 «La pill di carta»
**Data:** 9 luglio 2026 · **Deciso da:** Francesco Formicola · **Stato:** APPROVATO

## Percorso
1. Al secondo giro di collaudo live del catalogo SP2, Francesco chiede di rivedere il pulsante PillVoce (il testo piace e resta) e segnala un glitch del testo alla pressione.
2. Diagnosi glitch: lo scale sull'intera pill alla pressione faceva tremare il testo → regola derivata: **mai scale sul contenuto testuale nei pressed** (solo translateY + ombre).
3. Mockup con due varianti: `docs/design/mockups/2026-07-09-pillvoce-v2-due-varianti.html` — **A «La pill di carta»** (materia dei tasti + cerchio mic rosso pieno) · **B «Il registratore»** (pill scura fisica + spia rossa).
4. **Francesco sceglie la A** («a»).

## Vincoli derivati
- Il mockup (classe `.pvA`, entrambi i temi + stato ascolto) è la fonte di verità visiva; spec §5.15 rev. 2 ne riporta i valori.
- Il cerchio rosso del mic usa il gradiente del TastoPrimario: grammatica «il rosso è dove nascono le cose». La regola «unico rosso della home» resta valida (PillVoce vive nel wizard).
- Pressed: MAI scale sul contenuto (anti-glitch, ora legge §5.15).

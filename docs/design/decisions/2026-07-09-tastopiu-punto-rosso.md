# Decisione — TastoPiu v3 «Il punto rosso»
**Data:** 9 luglio 2026 · **Deciso da:** Francesco Formicola · **Stato:** APPROVATO

## Percorso
1. Al collaudo live del catalogo SP2, Francesco rifiuta il TastoPiu originale (otturatore a gradiente radiale rosso §5.2 v1) e chiede un design **analogico**, portando come riferimento un pulsante fisico smart-home bianco (ghiera + cappello bombato + glifo grigio sottile + ombre morbide realistiche).
2. Prima implementazione della rev. §5.2 giudicata «non si avvicina nemmeno alla reference» → il controller produce un mockup HTML con iterazione visiva diretta: `docs/design/mockups/2026-07-09-tastopiu-v3-due-varianti.html` (+ screenshot in `screenshots/`).
3. Due varianti presentate: **A** fedele alla reference (bianco puro, glifo grigio) · **B «Il punto rosso»** (stessa materia, ghiera tono-su-tono che affiora dalla carta, glifo + rosso UÀ come unica firma rossa della home, pressed → red-dark).
4. **Francesco sceglie la B** («ovviamente riferimento b»).

## Vincoli derivati
- Il mockup (classe `.tpB`, entrambi i temi) è la **fonte di verità visiva**; la spec §5.2 rev. 2 ne riporta i valori.
- Il + rosso è l'unico rosso della home: nessun altro elemento della home può usare `--red` come decorazione.
- Pressed: affonda SOLO il cappello; la ghiera si assesta. Suono `tap` + haptic medium invariati.

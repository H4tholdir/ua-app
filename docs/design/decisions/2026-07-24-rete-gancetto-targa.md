# Decisione — Rete + gancetto + targa (gate §6.2, ondata redesign parete/home)

**Data:** 23-24/07/2026 · **Decisore:** Francesco Formicola · **Gate:** Task 6 del piano
`docs/superpowers/plans/2026-07-23-redesign-parete-home.md` (spec §2.1-§2.3, mockup obbligatorio §6.2)

## Ratifiche (mockup `2026-07-24-rete-gancetto-targa.html`, revisione finale P=44)

1. **Rete R3** — maglia QUADRATA FISSA sul muro: fili tondi con volume, nodi di saldatura,
   ombra morbida (SVG pattern in light; gradient flat in dark). A1/A2 (rev 1) e R1/R2 scartate
   («sembrano un quaderno a quadretti o mattonelle»); riferimento: foto espositore ferramenta.
2. **Passo maglia 44px** — scelto sul confronto 24/36/44 («24 troppo fitta»).
3. **Meccanica «griglia fissa + snap»** (richiesta esplicita di Francesco, rev 3): il muro è
   fisso e indipendente; le RIGHE sono quantizzate — `track = 4·P = 176px`, gancio a quota
   `wire-center = padding-top(24) − hook-above(14) = 10px`, garanzia `hook_n ≡ 10 (mod 44)`.
   Verifica empirica agli atti: scarto 0.0px, 3/4/6 colonne × light/dark.
   La meccanica precedente (rev 2, «il gancetto porta il suo filo») è BOCCIATA: al drag il
   filo seguirebbe il ghost. Al drag il muro resta fermo, si stacca solo la cassetta.
4. **Gancetto G2** (G1 scartato), senza filo proprio, con RESPIRO tra la miniatura del lavoro
   e la linguetta (direttiva 24/07: mai accavallare le due cose).
5. **Interno cassetta = produzione verbatim** (direttiva 24/07): cavità, miniature SVG
   `MiniaturaLavoro`, faccia, palette `--mat-*` — nessuna reinterpretazione nel mockup.
6. **Targa**: pill nome cassetta IN BASSO dentro il blocco colore (stile «C18», mai a cavallo
   del bordo); libera = pill outline vuota; contrasto AUTOMATICO per luminanza (scritta nera
   su facce chiare, chiara su scure); dentista + paziente con **alias che vince sul codice**;
   MAI numero lavoro/tipo in targa (la terza riga è morta — si apre la cassetta per il dettaglio).
7. **Tipografia (regola di coerenza)**: nome del CLINICO senza grassetto, nome del PAZIENTE
   in grassetto — sempre, ovunque.
8. **Nomi lunghi: T2** (riduzione progressiva del font con soglia minima, poi 2 righe). T1 scartata.
9. **Gemelle: O1** — nessun segno in targa (identiche by design); disambiguatore = ricerca per
   numero lavoro (pagliaio) + apertura cassetta. O2 (micro-riga data consegna) scartata.
10. **Suoni** (gate §6.4, chiuso il 23/07): coppie sintetiche A/B scartate; file forniti da
    Francesco (sgancio→`stacco.wav`, aggancio→`riaggancio.wav`, commit `ee4da5e`).

## Vincoli per i Task 8-10 (implementazione)

- Copiare VERBATIM la regola «GRIGLIA FISSA + SNAP» e le formule dal blocco CSS del mockup
  (P=44 · track=176 · hook-above=14 · wire-center=10 · `grid-auto-rows:176; row-gap:0;
  align-self:start`).
- ⚠️ Il passo del pattern SVG light è HARDCODED nella geometria del disegno: se P cambia, la
  geometria va riscalata (trappola scoperta il 24/07 — il primo confronto passi era identico
  proprio per questo). In produzione legare pattern e `--P` (SVG data-URI generato o valori
  accoppiati documentati).
- Clamp fluido del passo (`--passo-maglia` della shell): da tarare in Task 8 partendo dalla
  proposta `clamp(40px, 10.2cqw, 50px)` — con track sempre multiplo esatto del passo effettivo.
- Il clamp del testo lungo va su un wrapper INTERNO al tile — MAI `overflow:hidden` sul tile
  (taglierebbe il gancetto che sporge sopra il bordo).
- Il delta-altezza del tile non è più il valore canonico: nel muro la riga è FISSA a 176px e
  assorbe la crescita del contenuto.

## Storia

Rev 1 (A1/A2+G1/G2+targa v1) → appunti 23/07 (pill in basso, contrasto, no terza riga, T2)
→ Rev 2 (R1/R2/R3, filo-nel-gancetto) → bocciatura meccanica + «interno cambiato» →
Rev 3 (griglia fissa + snap, interno produzione, O1/O2) → ratifiche puntuali + confronto passi
→ **Rev finale P=44 (questo verbale)**.

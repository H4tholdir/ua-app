### Task 10 — la carta album entra sulla scheda, e la striscia esce da TUTTI e tre i siti

**File**
- Modifica: `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx:315-316`
- Modifica: `src/app/ds-v3-catalogo/page.tsx:1165-1170`
- Modifica: `tests/unit/ds-v3/componenti/FotoStrip.test.tsx`
- Elimina (o svuota): `src/components/ds/FotoStrip.tsx`

🔴 **`FotoStrip` ha TRE chiamanti, non uno**, e il terzo è una **pagina viva**: `provato:` `grep -rn
"FotoStrip" src/ tests/` → `SchedaLavoroV3.tsx:316` · **`src/app/ds-v3-catalogo/page.tsx:1166`** (il
catalogo del design system) · `tests/unit/ds-v3/componenti/FotoStrip.test.tsx`.
🛑 **Il file del catalogo NON compariva in nessun elenco prima del censimento.** Se resta indietro, il
catalogo mostra un componente che la spec dichiara superata.

- [ ] **Passo 1 — la prova PRIMA**, in `tests/unit/ds-v3/componenti/CartaAlbum.test.tsx` (🆕 da creare) o in un test della
  scheda: montando `SchedaLavoroV3` con due foto, **compare il titolo «Foto»** e **non** la striscia nuda.
  ⚠️ `tests/unit/SchedaLavoroV3.test.tsx` passa oggi `immagini: []`: **copertura zero** su questa zona.
  **Aggiungi il caso con le foto**, o la prova non tocca niente.
- [ ] **Passo 2 — l'innesto.** In `SchedaLavoroV3.tsx`, dentro `.scheda-col-main` (aperto a `:254`, chiuso
  a `:320`), **fra** il ternario `NotaLaboratorio`/`NotaLaboratorioVuota` (`:309-313`) e
  `CardFasiV3` (`:319`), sostituisci la riga `:316` con la carta album — passando `categoria` e
  `created_at`, che dal 🅃1 esistono sul tipo.
- [ ] **Passo 3 — il catalogo.** In `src/app/ds-v3-catalogo/page.tsx:1165-1170` la sezione `§5.33` diventa
  la carta album, e il commento «nel catalogo le thumb non caricano» **resta vero** e va tenuto.
- [ ] **Passo 4 — il test della striscia.** `FotoStrip.test.tsx` asserisce **72×72, radius 12, objectFit
  cover**: se il componente sparisce, il test **va riscritto sulla carta**, non cancellato in silenzio.
- [ ] **Passo 5** — `npx tsc --noEmit && npx vitest run && npx next build`. 🛑 **`next build` serve
  davvero:** `tsc` **non** valida la firma degli handler di rotta.
- [ ] **Passo 6** — salva.


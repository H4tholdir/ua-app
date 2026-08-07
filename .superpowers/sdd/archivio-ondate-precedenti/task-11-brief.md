### Task 11 — `TabImmagini`: la categoria si chiede, si scrive da un punto solo, e i due difetti si chiudono

**File:** modifica `src/components/features/lavori/form/TabImmagini.tsx` · crea/estendi il suo test

🔴 **T11 È LA RIPARAZIONE, non un abbellimento.** Da T3 (30/07) il server **pretende** `categoria` e
`TabImmagini.tsx:131` spedisce ancora `descrizione`: **ogni caricamento di foto riceve 422** finché questo
task non atterra. Sommato a **D81** (il codice pubblicato scrive una colonna che non esiste più), significa
che **la funzione «carica una foto» è ferma su entrambi i lati fino a qui.** ➡️ Chi esegue T11 lo sappia:
la sua prova più importante non è un'asserzione, è **caricare una foto e vederla salire**.

**Cosa cambia, con le righe** — tutto già censito (R-P6):

| riga oggi | cosa fa | cosa diventa |
|---|---|---|
| `:7-10` | importa **motion v2.3**, **haptic v2.3**, **sounds v2.3**, `./styles` | `vibra` da `v3/haptic`, `suona` da `v3/sound`, `molla` da `v3/motion`. ✅ **`useReducedMotion` NON si tocca**: `v3/motion.ts:5` lo **ri-esporta**, non è una violazione |
| `:13-22` | copia locale di `TipoFoto` e `TIPI_FOTO` | **spariscono** → si importa da `@/lib/domain/categorie-foto` (T2) |
| `:117` | `totalFotos` **conta doppio** | conta le foto vere, una volta |
| `:131` | `formData.append('descrizione', tipo)` | `formData.append('categoria', categoria)` |
| `:198` | **indovina** `'impronta'`/`'altro'` dalla sorgente | **sparisce**: la categoria la chiede `FoglioCategoria` (T9), **una volta per gruppo** |
| `:224-244` + `:247-260` | **due** gestori quasi identici | **UNA sola funzione di scrittura** (D70) |
| `:287` + `:407-555` | rende **tutte** le locali, anche quelle già salite → **doppione** | toglie la locale quando la vera arriva |
| `:634` | legge `img.descrizione` come categoria | legge `img.categoria` |

- [ ] **Passo 1 — le prove PRIMA**, e sono quattro che mordono: dopo un caricamento riuscito la foto
  compare **una volta** e il contatore dice **uno** · la `POST` porta il campo **`categoria`** (e **non**
  `descrizione`) · **esiste UN SOLO punto** da cui parte la `PATCH` della categoria (si conta, e si pretende
  **uno**) · un PDF caricato **non** viene reso con un `<img>` ma come **tessera documento**.
- [ ] **Passo 2** — rosso, abbozzo, `N su M`. — [ ] **Passo 3** — scrivi. — [ ] **Passo 4** — verde +
  mutazione: rimetti il secondo gestore → **atteso rosso** sulla prova del punto unico.
- [ ] **Passo 5** — salva. 🛑 **NON migrare la route a v3** (fuori perimetro, spec §2): questo task cambia
  **cinque righe di import** dentro un file che riscrive comunque, non la pagina.


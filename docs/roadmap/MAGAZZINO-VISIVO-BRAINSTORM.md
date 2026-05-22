# Magazzino Visivo UÀ — Brainstorming e Specifiche
**Versione:** 1.0 — 22/05/2026  
**Autore:** Claude Code (claude-sonnet-4-6[1m])  
**Contesto:** PWA UÀ v1.8.0 — 187 articoli magazzino lab odontotecnico

---

## 1. Analisi Mixel — Bar Virtuale

### Cos'è e come funziona

Mixel (iOS/Android, 4.8★, 250k+ download) è un'app ricette cocktail con una feature core chiamata "My Bar": l'utente compone un bar digitale selezionando gli ingredienti che possiede fisicamente, e l'app usa quella lista per filtrare le ricette fattibili. Il modello di interazione è **binario**: un ingrediente è presente o non presente — non c'è gestione di quantità, fill level, o scorte. Il meccanismo "press and hold per spostare sulla scaffalatura" è puramente cosmetico (riordino visivo), non un tracker di stock. Il fill-level slider appartiene a **BarShelf**, un'app diversa che non va confusa con Mixel.

### L'elemento differenziante: 600+ icone pixel art

Il vero segreto di Mixel è che ogni singolo ingrediente (su 600+) ha un'icona pixel art disegnata a mano. Questo trasforma una lista di checkbox in qualcosa che sembra un gioco, genera attaccamento emotivo, e rende la navigazione spaziale intuitiva: si riconosce la bottiglia di bourbon prima di leggere il nome. La "scaffalatura" visiva funziona perché l'occhio identifica l'oggetto visivamente, non alfabeticamente.

### Interazioni principali

- **Tap** su icona: toggle "ho / non ho" questo ingrediente; feedback visivo immediato (icona si illumina / si desatura)
- **Tap** su icona dettaglio: overlay con info ingrediente + ricette collegabili
- **Search** testuale: filtra la griglia di icone in tempo reale
- **Mixel Maximizer**: analizza il tuo bar e suggerisce l'ingrediente da comprare che sblocca il maggior numero di nuove ricette

### Come rappresenta disponibilità / assenza

La biforcazione visiva è netta: ingredienti **nel bar** = icona a piena opacità + sfondo colorato; ingredienti **non posseduti** = icona desaturata / ghosted + sfondo neutro. Nessun gradiente, nessuna percentuale.

### Cosa rende questo pattern adatto al nostro use-case

Tre principi trasferibili:
1. **Riconoscimento visivo batte lettura alfabetica** — in un laboratorio fisico l'odontotecnico conosce il "barattolo di ossido di zirconio Katana" più per aspetto/posizione che per codice.
2. **Stato visivo immediato** — in un'occhiata si capisce cosa c'è, cosa manca, senza leggere numeri.
3. **Gamification leggera** — un magazzino "che si svuota" è un feedback immediato sul consumo: psicologicamente più potente di una colonna "scorta_attuale".

**Differenza critica da Mixel:** UÀ ha `scorta_attuale / scorta_minima` — il problema è **graduato**, non binario. Il pattern iconico di Mixel deve essere esteso con un meccanismo visivo per la quantità. Questo è il nodo di design centrale attorno a cui si strutturano i tre concetti.

---

## 2. Concept Magazzino Visivo UÀ

### Il vincolo di scala: il problema delle 187 icone

Questo è il problema non eludibile. Mixel funziona perché ha 600 icone hand-crafted. Per UÀ ci sono tre strategie iconografiche, ognuna con costi e rese diverse:

| Strategia | Costo | Fedeltà | Scalabilità |
|-----------|-------|---------|-------------|
| **A. Icone per categoria** (8–12 SVG) | Nessuno | Bassa (generico) | Perfetta |
| **B. Foto prodotto** (foto reale scattata dall'utente) | Operativo (Filippo scatta le foto) | Alta (è proprio quella boccetta) | Ottima |
| **C. AI-gen icone** (set isometrico style-locked, genera 1 per articolo) | Computazionale + revisione | Media | Ottima |

I tre concetti seguenti si differenziano proprio per quale strategia iconografica adottano, e per come codificano la quantità graduata.

---

### Concetto A — "Scaffalatura per Zona Fisica"

**Logica:** Il laboratorio è uno spazio fisico con zone note: scaffale principale, frigorifero, armadietto materiali pericolosi. Invece di una griglia omogenea, il magazzino è organizzato in "stanze virtuali" che replicano la mappa fisica del laboratorio. L'utente non impara una nuova organizzazione: naviga dove sa già che stanno le cose.

**Strategia icone:** Categoria-level SVG (8 icone per 8 macro-categorie: resine, zirconio, leghe, impronte, disinfettanti, consumabili, dispositivi medici, altro). Ogni card mostra l'icona della categoria + nome prodotto + anello di fill colorato.

**Quantità graduata:** Ogni articolo è un "flacone" con un anello circolare di riempimento (SVG, no canvas). L'anello va da verde pieno (scorta_attuale ≥ scorta_minima × 1.5) a oro (attorno al minimo) a rosso pulsante (sotto scorta). Il numero esatto compare al centro dell'anello su tap.

**Interazione principale:** Scroll orizzontale tra zone (scaffale / frigo / armadietto), scroll verticale all'interno di ogni zona. Long-press su articolo: bottom sheet con dettaglio + pulsante scarico rapido.

**Pro:**
- Metafora cognitiva 0 — l'utente sa già dov'è fisicamente ogni materiale
- Nessun costo di produzione icone
- Zone fisiche creano confini naturali che evitano lo scroll infinito su 187 item
- Il badge MDR (dispositivo medico) si posiziona naturalmente nella zona "DM"

**Contro:**
- Richiede che ogni articolo abbia una "zona" assegnata (campo aggiuntivo DB o auto-derivato da categoria)
- 8 icone di categoria possono sembrarsi troppo generiche per distinguere rapidamente articoli simili (es: due tipi di zirconio diversi)
- L'organizzazione per zona fisica può diventare obsoleta se il lab si riorganizza

---

### Concetto B — "Grid Fotografica alla Sortly"

**Logica:** Ogni articolo ha una foto reale del prodotto (la boccetta, il sacchetto, il blister) scattata dall'utente con il telefono. La pagina /magazzino diventa una griglia di card fotografiche. Questo è il pattern usato da Sortly per inventari dentistici professionali.

**Strategia icone:** Photo-first. L'upload foto è parte del workflow di creazione/edit articolo. Fallback: placeholder warm panna con sigla categoria in DM Sans. Placeholder illustrativi NON generati AI.

**Quantità graduata:** Fill level come barra verticale sovrapposta all'immagine, sul lato sinistro della card (come il livello benzina). Tre stati: verde / oro / rosso. Numero scorta come badge sovrapposto in basso a destra.

**Interazione principale:** Tap su card → dettaglio. Swipe left su card → scarico rapido (-1 unità) con conferma haptic. Swipe right → riordino rapido (apre bottom sheet ordine). Pinch-to-zoom della griglia per passare da 2 a 3 colonne su mobile.

**Pro:**
- Massima riconoscibilità — è letteralmente il flacone che hai in mano
- Zero costo AI, zero costo di design: le foto le fa Filippo con l'iPhone
- Pattern consolidato per inventari professionali (Sortly, Method)
- Swipe actions veloci per flusso quotidiano (scarico / ordine) senza aprire dettaglio

**Contro:**
- Dipende dall'impegno dell'utente nel mantenere le foto aggiornate
- Con foto assenti o di bassa qualità l'interfaccia degrada
- Richiede storage Supabase per le immagini + gestione upload
- Non crea la sensazione "magica" del bar Mixel — è più funzionale che delightful

---

### Concetto C — "Vetrina Interattiva per Categoria" (RACCOMANDATO)

**Logica:** Una via di mezzo tra A e B che risolve sia il problema icone che quello della densità. Il magazzino è organizzato per categoria (non zona fisica). Ogni categoria occupa un "cassetto" espandibile con un header visivo. All'interno di ogni cassetto, gli articoli sono tile compatte con un glifo SVG di categoria + colore stato (non icona unica per articolo). Il dettaglio di un articolo specifico emerge in un bottom sheet ricco, non in una pagina nuova.

**Strategia icone:** 12 SVG di glifo per categoria (resina, zirconio, lega, impronta, disinfettante, consumabile, DM, altro × 4 varianti colore). Glifo + colore stato = spazio visivo informativo senza 187 illustrazioni diverse. Il colore dello sfondo della tile codifica lo stato scorta: verde-tenue / oro / rosso.

**Quantità graduata:** Doppio encoding — colore di sfondo della tile (semaforo) + micro-barra in fondo alla tile (proporzione scorta_attuale / scorta_minima). Al tap, il bottom sheet mostra il numero preciso + storico consumi + campo scarico rapido.

**Interazione principale:**
- La pagina /magazzino di default mostra **vista lista** (l'attuale MagazzinoSearchList — mantenuta)
- Un toggle floating in alto a destra switcha in **vista vetrina** (questo concetto)
- Nella vista vetrina, tap su categoria espande i tile
- Tap su tile: bottom sheet articolo (dettaglio + scarico + ordine)
- Long press su tile: menu contestuale rapido (scarico -1, scarico personalizzato, ordina)
- La barra di ricerca rimane sopra e filtra cross-categoria anche nella vista vetrina

**Pro:**
- Nessun costo di produzione (12 SVG, non 187)
- Funziona bene anche con 0 foto
- Le categorie collassate risolvono la densità: non si vedono 187 tile insieme
- La transizione lista ↔ vetrina è reversibile: nessuna regressione UX per chi preferisce la lista
- Il colore-stato è accessibile (mai solo colore: la barra + il badge numerico come secondo canale)
- Integrazione naturale con il badge MDR (dispositivo medico) come overlay sul tile
- Massima coerenza con il design system warm panna: la palette semaforo verde/oro/rosso è già semanticamente usata nell'app

**Contro:**
- 12 glifi SVG da disegnare (piccolo effort comunque)
- Il colore di sfondo tile richiede test di contrasto sul tema dark
- Meno "wow factor" fotografico rispetto al Concetto B
- Richiede statefulness lato client (quale categoria è espansa) — non bloccante

---

### Raccomandazione: Concetto C — "Vetrina Interattiva per Categoria"

**Motivazione:** È l'unico dei tre che risolve il vincolo di scala senza dipendenze operative esterne (niente foto da scattare, niente zone da assegnare). Preserva l'esperienza lista attuale come fallback. Il toggle lista/vetrina crea un'app che funziona per due profili: chi vuole fare ricerca rapida (lista + search) e chi vuole gestione visiva (vetrina). L'encoding doppio colore+barra garantisce accessibilità. Si costruisce incrementalmente: i 12 SVG glifo sono un task di design di 2–3 ore, il resto è puro sviluppo React.

---

## 3. Mockup ASCII

### Mobile 390px — Vista vetrina (Concetto C)

```
┌─────────────────────────────────────────┐
│ ← Magazzino               ☀ [≡lista ⊞] │  ← AppHeader + toggle vista
│   5 sotto scorta minima                  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🔍  Cerca articolo, codice...    × │ │  ← Search sticky
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠ 5 materiali sotto scorta         │ │  ← OrdinaBatchBanner (esistente)
│ │              [📦 Crea ordini ▶]    │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ▼  OSSIDI DI ZIRCONIO    (12 articoli)  │  ← header categoria espanso
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │  [◎ ZrO₂]│ │  [◎ ZrO₂]│ │  [◎ ZrO₂]│ │  ← tile: glifo + stato
│ │ ████░░░░ │ │ ████████ │ │ ░░░░░░░░ │ │  ← barra fill (8px h)
│ │ Katana A5│ │ Katana B │ │ BruxZir  │ │  ← nome (2 righe max)
│ │  3 / 5 bl│ │ 12 / 4 bl│ │  0 / 2 bl│ │  ← scorta/minima
│ └──────────┘ └──────────┘ └──────────┘ │
│   [rosso bg]  [verde bg]   [rosso bg]   │  ← colori sfondo tile
│                                          │
│ ┌──────────┐ ┌──────────┐               │
│ │  [◎ ZrO₂]│ │  [◎ ZrO₂]│   + 7 altri → │
│ │ ████████ │ │ ████░░░░ │               │
│ │ IPS e.max│ │ Vita VM9 │               │
│ └──────────┘ └──────────┘               │
│                                          │
│ ▶  RESINE               (23 articoli)   │  ← header categoria collassato
│ ▶  LEGHE METALLICHE     (18 articoli)   │
│ ▶  MATERIALI IMPRONTA   (15 articoli)   │
│ ▶  DISINFETTANTI        (11 articoli)   │
│ ▶  CONSUMABILI          (47 articoli)   │
│ ▶  DISPOSITIVI MEDICI   (31 articoli)   │
│ ▶  ALTRO                (30 articoli)   │
│                                          │
│           [+] Aggiungi articolo          │  ← FAB rosso #D90012
└─────────────────────────────────────────┘
```

**Legenda tile colori:**
- Sfondo `rgba(217,0,18,.09)` + barra rossa → sotto scorta minima
- Sfondo `rgba(212,168,67,.10)` + barra oro → tra minimo e minimo×1.5
- Sfondo `rgba(22,163,74,.08)` + barra verde → scorta ok

---

### Bottom sheet articolo (tap su tile)

```
┌─────────────────────────────────────────┐
│                                          │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                                          │  ← drag handle area
│ ┌─────────────────────────────────────┐ │
│ │ [◎ ZrO₂]  Katana Zirconia A5 HT    │ │
│ │            BIO Zirconia srl    [DM] │ │  ← badge MDR rosso outline
│ │                                     │ │
│ │    3               5                │ │
│ │  scorta          minimo             │ │
│ │  attuale         bl                 │ │
│ │                                     │ │
│ │  ████████░░░░░░░░░░░░   60%        │ │  ← barra larga
│ │                                     │ │
│ │  [  − 1 bl  ]   [ Scarico lib. ]   │ │  ← azioni rapide
│ │                                     │ │
│ │  ─────────────────────────────────  │ │
│ │  Codice:    ZR-KATA-A5-HT          │ │
│ │  Lotto:     —                      │ │
│ │  Scadenza:  —                      │ │
│ │  Costo/u:   €48.50                 │ │
│ │                                     │ │
│ │  [  Modifica  ]  [ Ordina al forn.]│ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

### Toggle lista / vetrina (header)

```
  lista attiva:    [≡] ⊞          vetrina attiva:   ≡ [⊞]
                   │ pill rosso                          │ pill rosso
```

---

## 4. Specifiche Tecniche

### 4.1 Componenti da creare

| Componente | File | Dipendenze |
|------------|------|------------|
| `MagazzinoVetrinaView` | `components/features/magazzino/MagazzinoVetrinaView.tsx` | `MagazzinoSearchList` (riuso) |
| `CategoriaSection` | `components/features/magazzino/CategoriaSection.tsx` | nessuna |
| `ArticoloTile` | `components/features/magazzino/ArticoloTile.tsx` | nessuna |
| `ArticoloBottomSheet` | `components/features/magazzino/ArticoloBottomSheet.tsx` | `Sheet` shadcn/ui |
| `StockFillBar` | `components/features/magazzino/StockFillBar.tsx` | nessuna |
| `CategoryGlyph` | `components/features/magazzino/CategoryGlyph.tsx` | SVG inline |
| `ToggleVista` | `components/features/magazzino/ToggleVista.tsx` | nessuna |

**Componenti modificati (non riscritti):**
- `MagazzinoSearchList.tsx` — aggiungere prop `vistaMode: 'lista' | 'vetrina'` + wrapper
- `magazzino/page.tsx` — aggiungere `MagazzinoVetrinaView` come alternativa condizionale

### 4.2 Struttura `CategoriaSection`

```typescript
interface CategoriaSectionProps {
  nomeCategoria: string
  articoli: ArticoloRow[]
  defaultExpanded?: boolean  // true solo per la prima categoria o se c'è alert
}
```

L'espansione/collasso è locale (useState), non URL-driven. La sezione con articoli sotto scorta si espande automaticamente.

### 4.3 Struttura `ArticoloTile`

```typescript
interface ArticoloTileProps {
  articolo: ArticoloRow
  onTap: (id: string) => void
  onLongPress: (id: string) => void
}

// Stato derivato (non prop)
type StockStatus = 'critico' | 'basso' | 'ok'
// critico:  scorta_attuale < scorta_minima
// basso:    scorta_attuale < scorta_minima * 1.5
// ok:       scorta_attuale >= scorta_minima * 1.5

// Fill percentage (cappato a 100)
const fillPct = Math.min(100, (articolo.scorta_attuale / articolo.scorta_minima) * 100)
```

### 4.4 Animazioni (token `motion.ts` — OBBLIGATORI)

| Evento | Animazione | Token |
|--------|-----------|-------|
| Espansione CategoriaSection | height 0→auto, opacity 0→1 | `t("normal", "enter")` |
| Collasso CategoriaSection | height auto→0, opacity 1→0 | `t("fast", "exit")` |
| Apparizione tile (stagger) | scale 0.92→1, opacity 0→1 | `t("normal", "enter")` + `staggerDelay(count)` |
| Tap tile (feedback) | scale 0.96→1 | `motionTokens.spring.snappy` |
| Long press | scale 0.93, background pulse | `t("instant")` |
| Bottom sheet open | translateY 100%→0 | `motionTokens.spring.soft` |
| Bottom sheet close | translateY 0→100% | `t("slow", "exit")` |
| StockFillBar fill | width 0→fillPct% | `t("slow", "enter")` — on first mount only |
| Toggle lista/vetrina | crossfade | `t("fast", "standard")` |

**Regola prefers-reduced-motion:** tutti i componenti con animazione non-istantanea usano `useReducedMotion()` da `motion.ts`. Se reduced: animazioni disabilitate, transizioni istantanee (`t("instant")`).

### 4.5 Interazioni touch mobile

| Gesto | Risultato |
|-------|-----------|
| Tap su tile | Apre `ArticoloBottomSheet` |
| Long press (400ms) | Menu contestuale: "Scarico -1" / "Scarico libero" / "Ordina" |
| Drag handle bottom sheet | Dismiss con soglia > 40% altezza sheet |
| Scroll verticale pagina | Fluido, no jank — virtualizzazione per categoria > 20 articoli |
| Pinch su griglia tile | Non implementato MVP — categorie collassate già risolvono la densità |

**Touch target:** ogni tile minimo 44×44px (WCAG AA). Su mobile 390px: layout a 3 colonne → tile ~117px width. Tile height: 96px fissi (garantisce 44px+ ampiamente).

### 4.6 CategoryGlyph — 12 SVG da creare

```
resine        → silhouette siringa/dispenser
zirconio      → forma esagonale (struttura cristallina)
leghe         → sagoma lingotto
impronte      → forma a U (portaimpronte)
disinfettanti → goccia + croce medica
consumabili   → matita / strumento generico
dispositivi_medici → cuore + crocetta MDR
cera          → candela stilizzata
ceramica      → ciotola
abrasivi      → disco rotante
materiali_inv → molecola generica
altro         → tre punti (···)
```

Stile: linea monocromatica 24×24px, stroke 1.5px, colore `var(--t2)` (grigio) su stato ok, `var(--primary)` su stato critico.

### 4.7 Integrazione nella pagina /magazzino esistente

La pagina `magazzino/page.tsx` è un Server Component — non cambia. La logica di vista è interamente client-side.

```
magazzino/page.tsx (Server)
  └── MagazzinoSearchList.tsx (Client — esistente, lista view)
        └── [nuovo] se vistaMode === 'vetrina':
              MagazzinoVetrinaView.tsx (Client)
                ├── ToggleVista (floating, top-right header)
                ├── OrdinaBatchBanner (esistente, invariato)
                ├── SearchBar (già in MagazzinoSearchList — rifattorizzare come sottocomponente)
                └── CategoriaSection[]
                      └── ArticoloTile[]
                            └── ArticoloBottomSheet (portale)
```

**Stato condiviso:** `vistaMode` (lista | vetrina) in `useState` dentro `MagazzinoSearchList` o wrapper. Nessun URL param, nessun server round-trip. Persiste in `localStorage` per ricordare la preferenza.

**Workflow 0B obbligatorio prima di implementare:**
1. Creare mockup HTML in `/tmp/magazzino-vetrina.html` con dati reali simulati (10 articoli, 3 categorie)
2. Screenshot Playwright del mockup su viewport 390×844
3. Approvazione Francesco → poi React
4. Durante implementazione: TypeScript strict, nessun `duration` inline

---

## 5. Feature List per la Roadmap

### MVP — Magazzino Visivo v1.0

Obiettivo: rendere leggibile lo stato del magazzino in 2 secondi senza toccare un numero.

- [ ] 12 SVG glifo per categoria (asset design)
- [ ] `CategoryGlyph.tsx` — componente SVG switch
- [ ] `StockFillBar.tsx` — barra stato scorta (critico/basso/ok)
- [ ] `ArticoloTile.tsx` — tile 3-colonne con glifo, nome, fill bar, colore sfondo
- [ ] `CategoriaSection.tsx` — accordion espandibile con header categoria
- [ ] `MagazzinoVetrinaView.tsx` — layout griglia + accordion
- [ ] `ToggleVista.tsx` — pill toggle lista/vetrina, con localStorage persistence
- [ ] `ArticoloBottomSheet.tsx` — sheet dettaglio: scorta, fill bar larga, azioni rapide, campi info
- [ ] Azione "Scarico -1" via PATCH `/api/magazzino/[id]` dal bottom sheet
- [ ] Long press menu contestuale (scarico / ordina)
- [ ] Badge MDR (`dispositivo_medico: true`) sul tile — overlay icona
- [ ] Auto-espansione categorie con articoli sotto scorta
- [ ] `useReducedMotion()` su tutti i componenti animati
- [ ] Dark mode: test contrasto tile su `--bg: #1A1916`
- [ ] Viewport 390px (primary), 768px (2→4 colonne), 1280px (sidebar + griglia)

### Fase 2 — Magazzino Avanzato

Obiettivo: rendere il magazzino il posto da cui si fa il 90% del lavoro operativo.

- [ ] Campo `zona_fisica` su tabella `magazzino` (migration Supabase): `scaffale | frigo | armadietto_pericolosi | altro`
- [ ] Vista per zona fisica (toggle aggiuntivo — Concetto A come opzione secondaria)
- [ ] Scarico rapido swipe-left direttamente dalla lista (senza aprire bottom sheet)
- [ ] Storico scarichi degli ultimi 30 giorni nel bottom sheet (da tabella `scarichi_magazzino`)
- [ ] Calcolo "durata stimata scorta" basato su media scarichi/settimana
- [ ] Smart reorder suggestion: articoli da comprare per sbloccare flussi produzione (analogo Mixel Maximizer)
- [ ] Barcode scanner via camera iPhone per identificare articolo e aprire bottom sheet
- [ ] Filtro rapido: "solo sotto scorta" / "solo dispositivi medici" / "solo frigo"
- [ ] Notifica push automatica quando scorta scende sotto minimo (trigger Supabase → service worker)

### Opzionale / V3

Obiettivo: differenziazione premium, solo se Filippo conferma interesse.

- [ ] Upload foto prodotto (foto reale del flacone) — Concetto B come skin alternativa
- [ ] AI scan immagine per riconoscimento automatico prodotto da foto (OCR codice + ricerca DB)
- [ ] Integrazione catalogo fornitori: suggerisce prodotti simili dal listino fornitore
- [ ] Report consumo per categoria/mese (grafico sparkline nel header categoria)
- [ ] Export CSV magazzino per audit MDR (già parzialmente in `/api/fatture/export` come pattern)
- [ ] Gestotelefono dual-thumb per aggiornamento quantità (simile slider BarShelf)
- [ ] QR code per ogni articolo → scansione apre dettaglio su qualsiasi device in lab

---

## Note di Implementazione

**Vincoli categorici (da CLAUDE.md):**
- Nessun `duration` inline — solo token da `src/design-system/motion.ts`
- Nessun tabella full-width su mobile — i tile a griglia rispettano questa regola
- Modal centrato mai su mobile per azioni — si usa bottom sheet (`ArticoloBottomSheet`)
- Touch target ≥ 44px — tile height 96px, larghe 117px su 390px

**Compatibilità con codice esistente:**
- `MagazzinoSearchList`, `OrdinaBatchBanner`, `MagazzinoDeleteButton` non vengono riscritti
- La pagina `magazzino/[id]/page.tsx` (dettaglio full-page) rimane invariata
- La vista vetrina è addizionale, non sostitutiva

**Categoria derivata automaticamente:**
Se `categoria` è null nel DB, usare `'altro'` come fallback per la CategoryGlyph. Non bloccare il render mai.

---

*Fonti ricerca Mixel utilizzate per questa analisi:*
- [Mixel — Cocktail Recipes App](https://www.mixelcocktails.com/)
- [Mixel su App Store](https://apps.apple.com/us/app/mixel-cocktail-recipes/id1280464759)
- [Mixel — DesignRush App Design Inspiration](https://www.designrush.com/best-designs/apps/mixel)
- [The 8 Best Smartphone Apps for Mixology](https://cocktail-society.com/barkeeping/best-apps-for-mixology-and-cocktails/)
- [Best Apps for Home Bar Inventory — Velvet Shelf 2026](https://velvetshelf.app/blog/best-app-home-bar-inventory-management)
- [Inventory App Design Guide — UXPin](https://www.uxpin.com/studio/blog/inventory-app-design/)
- [Dental Inventory Management Software — Sortly](https://www.sortly.com/industries/dental-inventory-management-software/)

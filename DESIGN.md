---
name: UÀ
description: PWA per laboratori odontotecnici italiani — neumorphism tattile, mobile-first, pochi tap
colors:
  stone-base: "#DDD8D3"
  stone-surface: "#E4DFD9"
  stone-elevated: "#EDEDEA"
  stone-pressed: "#D4CFC9"
  ink-primary: "#1C1916"
  ink-secondary: "#96918D"
  ink-muted: "#B8B3AE"
  red-action: "#D90012"
  red-action-dark: "#A80010"
  red-action-light: "#F01828"
  mint-success: "#3DCB5C"
  indigo-info: "#5A5FCC"
  gold-cta: "#D4A843"
  dark-base: "#1A1916"
  dark-surface: "#222019"
  dark-elevated: "#2C2A27"
  dark-text: "#F0EDE8"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontWeight: 400
    lineHeight: 1.1
  title:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  3xl: "22px"
  pill: "32px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.red-action}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  button-primary-hover:
    backgroundColor: "{colors.red-action-light}"
  button-primary-active:
    backgroundColor: "{colors.red-action-dark}"
  button-cta-gold:
    backgroundColor: "{colors.gold-cta}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  button-ghost:
    backgroundColor: "{colors.stone-surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  card:
    backgroundColor: "{colors.stone-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.stone-base}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
---

# Design System: UÀ

## 1. Overview

**Creative North Star: "Il Laboratorio nel Palmo della Mano"**

UÀ è la trasformazione del gestionale da scrivania a strumento che vive nel palmo. Come un tecnico che riconosce i suoi attrezzi senza guardarli, l'interfaccia deve rispondere con il peso e la resistenza della materia reale. Ogni bottone si preme come si preme un tasto fisico — lo senti scendere, senti quando ha fatto contatto, lo senti risalire. Le animazioni non sono decorazione: sono l'analogia sonoro-visiva di qualcosa che accade davvero.

Il sistema usa il **neumorphism** come linguaggio visivo: superfici in pietra calda (`#DDD8D3`) che sembrano ritagliate dallo stesso materiale, con ombre stratificate che emergono e si incassano. Gli elementi raised sembrano sollevati dalla superficie; gli input sembrano scavati dentro di essa. È la differenza tra un touchscreen che imita un foglio di carta e uno che imita un banco da lavoro.

Il rosso `#D90012` è la voce dell'azione — immediata, inequivocabile, italiana. Non è un accento timido: è il colore che dice "tocca qui e qualcosa succede". L'oro `#D4A843` è riservato ai momenti che meritano peso: conferme importanti, CTA principali, la stella del flusso.

**Key Characteristics:**
- Ogni superficie ha rilievo fisico percepibile tramite luce e ombra tintata
- Feedback al tocco immediato (80ms) con scale + shadow inset
- Dark mode: stesso neumorphismo, stessa fisica, toni carbonio caldi
- Zero elementi piatti senza profondità — ogni card, ogni bottone, ogni input deve vivere nello spazio
- Mobile-first: touch target minimo 52px, operazioni critiche in ≤3 tap

## 2. Colors: La Pietra e il Fuoco

Il colore di base è pietra naturale calda, non bianco neutro. Questa scelta radica l'interfaccia nel materiale — evoca il travertino, la ceramica, il gesso lavorato. Il rosso è fuoco: l'azione che accende il grigio della materia.

### Primary
- **Rosso Azione** (`#D90012`): Il colore primario dell'intera app. Pulsanti d'azione principali, stati attivi, CTA critici. Mai usato come tinta decorativa. La sua rarità parziale lo rende magnetico.
- **Rosso Hover** (`#F01828`): Stato hover/focus del rosso — leggermente più luminoso.
- **Rosso Pressed** (`#A80010`): Stato pressed — più scuro, conferma il contatto fisico.

### Secondary
- **Oro CTA** (`#D4A843`): Riservato alle azioni di maggior peso narrativo: conferma CONSEGNA, firma DdC, bottone primario onboarding. Usato con parsimonia — la sua rarità è il punto.
- **Menta Success** (`#3DCB5C`): Stato successo, badge completato, CONSEGNA completata. Solo per stati semanticamente positivi.
- **Indigo Info** (`#5A5FCC`): Informazioni secondarie, link, badge informativi.

### Neutral — La Pietra
- **Pietra Base** (`#DDD8D3`): Background dell'intera app. La "tavola" da cui emergono tutti gli elementi.
- **Pietra Surface** (`#E4DFD9`): Card, pannelli, contenitori rialzati. 7 punti più chiaro del base.
- **Pietra Elevated** (`#EDEDEA`): Elementi al secondo livello di elevazione, tooltip, popover.
- **Pietra Pressed** (`#D4CFC9`): Stato pressed delle superfici — più scuro del base, simula la pressione.
- **Inchiostro Primario** (`#1C1916`): Testo principale. Quasi-nero con calore marrone minimale.
- **Inchiostro Secondario** (`#96918D`): Label, didascalie, testo di supporto.
- **Inchiostro Muto** (`#B8B3AE`): Placeholder, testo disabilitato, hint.

### Dark Mode — Il Carbonio
- **Carbonio Base** (`#1A1916`): Background dark. Stesso calore del chiaro, invertito.
- **Carbonio Surface** (`#222019`): Card e contenitori in dark mode.
- **Carbonio Elevated** (`#2C2A27`): Secondo livello elevazione in dark.
- **Avorio Testo** (`#F0EDE8`): Testo su dark — caldo, non bianco puro.

### Named Rules
**The Stone Palette Rule.** Il background è sempre pietra calda (`#DDD8D3` / `#1A1916`). Mai bianco puro (`#FFFFFF`), mai nero puro (`#000000`), mai grigio neutro senza calore. Ogni neutro contiene calore marrone-rossiccio.

**The Red Scarcity Rule.** Il rosso occupa ≤20% della superficie visibile. È un segnale, non uno sfondo. Se tutto è rosso, niente è azione.

**The Gold Ceremony Rule.** L'oro `#D4A843` appare solo su azioni cerimoniali — CONSEGNA, firma, onboarding CTA principale. Mai come bordo decorativo o badge generico.

## 3. Typography

**Display Font:** Playfair Display (con Georgia, serif)
**Body/UI Font:** DM Sans (con system-ui, sans-serif)

**Character:** Playfair porta il peso editoriale dei numeri — i KPI e i totali diventano scultura tipografica. DM Sans è il workmate: leggibile a 16px su un display illuminato di luce da laboratorio, senza affaticare in sessioni lunghe.

### Hierarchy
- **Display** (Playfair, 300, 2.5rem–4rem, lh 1.0): Solo per numeri hero e KPI dashboard. Mai per titoli di sezione.
- **Headline** (Playfair, 400, 1.5rem–2rem, lh 1.1): Titoli di pagina. Massimo uno per schermata.
- **Title** (DM Sans, 600, 18px, lh 1.3): Header di card, label di sezione, nome lavoro nella lista.
- **Body** (DM Sans, 400, 16px, lh 1.5): Testo operativo. Lunghezza massima 65ch. Mai sotto 16px per testo leggibile in laboratorio con luce variabile.
- **Label** (DM Sans, 500, 13px, lh 1.4, ls +0.01em): Badge, chip, etichette form, didascalie.

### Named Rules
**The Two-Font Rule.** Solo DM Sans e Playfair Display. Zero altri font. Inter è proibita. Geist è proibita. Non esistono eccezioni.

**The Number Rule.** Qualsiasi numero che rappresenta una misura o un KPI visivo usa Playfair Display in weight 300 o 400. Un prezzo in DM Sans è un'occasione persa.

## 4. Elevation: La Fisica della Pietra

UÀ usa neumorphism strutturale, non decorativo. Ogni livello di elevazione è ottenuto attraverso ombre stratificate tintate nello stesso calore della pietra — non ombre nere generiche. Il sistema ha tre stati distinti, più l'affossamento per gli input.

### Shadow Vocabulary

**Card raised** (`--ua-sh-c`):
```
inset 0 1px 0 rgba(255,255,255,.88),
inset 0 -1px 2px rgba(0,0,0,.04),
-5px -5px 11px rgba(255,255,255,.72),
9px 12px 22px -4px rgba(148,128,118,.40),
3px 5px 10px -2px rgba(148,128,118,.22)
```
Usata su: card di lavoro, pannelli, contenitori statici.

**Button raised** (`--ua-sh-b`):
```
inset 0 1px 0 rgba(255,255,255,.90),
inset 0 -2px 3px rgba(0,0,0,.05),
-5px -5px 11px rgba(255,255,255,.78),
9px 13px 22px -4px rgba(148,128,118,.44),
3px 5px 9px -1px rgba(148,128,118,.26)
```
Usata su: bottoni, chip selezionabili, elementi interattivi resting.

**Pressed** (`--ua-sh-p`):
```
inset 3px 4px 8px rgba(148,128,118,.40),
inset -2px -2px 5px rgba(255,255,255,.52),
2px 2px 5px -2px rgba(148,128,118,.18)
```
Usata su: stato `:active` di qualsiasi elemento pressabile.

**Input inset** (`--ua-sh-i`):
```
inset 4px 4px 9px rgba(148,128,118,.32),
inset -3px -3px 7px rgba(255,255,255,.66)
```
Usata su: tutti i campi di input. Gli input sono SEMPRE affossati — fisicamente opposti ai bottoni.

### Named Rules
**The Physical Inversion Rule.** Bottoni e input sono fisicamente opposti: i bottoni escono dalla superficie (shadow esterna), gli input entrano dentro (shadow interna). Questo non è mai invertito. Un input raised o un bottone piatto non appartengono a questo sistema.

**The Tinted Shadow Rule.** Le ombre usano il calore della pietra (`rgba(148,128,118,...)`) e i highlight usano il bianco caldo (`rgba(255,255,255,...)`). Mai ombre con `rgba(0,0,0,...)` da soli — il nero puro rompe l'illusione del materiale. In dark mode, le ombre diventano nere (`rgba(0,0,0,...)`) perché la pietra è carbonio.

## 5. Components

### Buttons

Tattile e deciso — si sentono come interruttori fisici.

- **Shape:** Pillola (`32px` radius) per il primary; gently curved (`10px`) per i ghost
- **Primary (rosso):** Background `#D90012`, testo bianco, padding `14px 28px`, shadow `--ua-sh-b`. Active: shadow `--ua-sh-p` + `scale(0.94)` in 80ms.
- **CTA gold:** Background `#D4A843`, testo `#1C1916`. Identica fisica del primary. Riservata.
- **Ghost/secondary:** Background `{stone-surface}`, shadow `--ua-sh-c`, testo `{ink-primary}`.
- **Hover/Focus:** `scale(1.01)` + shadow leggermente amplificata. Nessun bordo outline — il focus è comunicato dal glow neumorphico.
- **Dimensioni minime:** 52px height, 52px width per qualsiasi elemento pressabile.

### Inputs / Campi

Gli opposti dei bottoni — scavati nella pietra.

- **Style:** Background `{stone-base}`, shadow `--ua-sh-i`, radius `10px`. Affossati, mai raised.
- **Focus:** Shadow `--ua-sh-i` + sottile border `1px solid {red-action}` in trasparenza `rgba(217,0,18,0.4)`.
- **Error:** Border `1px solid {red-action}` pieno + testo errore in rosso sotto.
- **Disabled:** Opacity `0.5`, shadow ridotta.
- **Placeholder:** Colore `{ink-muted}`.

### Cards / Contenitori

- **Corner Style:** Gently curved (14px radius, `--radius-xl`)
- **Background:** `{stone-surface}` (#E4DFD9)
- **Shadow Strategy:** `--ua-sh-c` — i layer di ombre fanno sembrare la card sollevata dalla pietra base
- **Border:** Nessun border. La profondità è data solo dalle ombre.
- **Internal Padding:** 16px (`{spacing.md}`) come minimo; 24px per card con contenuto ricco

### Navigation — BottomNavPill

La navigazione primaria è una pill galleggiante sul fondo dello schermo.

- **Shape:** Pill altamente arrotondata (`32px` radius o superiore), ombra `--ua-sh-b`
- **Background:** `{stone-elevated}` — leggermente più chiaro del background per sembrare sollevata
- **Active item:** Background `{red-action}`, testo/icona bianca
- **Inactive item:** Testo/icona `{ink-secondary}`
- **Transition:** L'indicatore active si sposta con spring `snappy` (stiffness 520, damping 36)
- **Min touch target:** 52px per ogni tab item

### ConsegnaButton (Componente Firma)

Il momento culminante dell'app — merita trattamento cerimoniale.

- **Shape:** Pill grande, padding generoso (`18px 48px`)
- **Background:** `{gold-cta}` (#D4A843), testo `{ink-primary}`
- **Shadow:** `--ua-sh-b` + glow caldo `0 0 20px rgba(212,168,67,0.35)` sull'hover
- **Active:** Scale `0.96` + shadow `--ua-sh-p` + haptic feedback medio
- **Success state:** Transizione a verde menta `{mint-success}` con animazione celebration (800ms)

### Chips / Badge

- **Style:** Raised leggero (`--ua-sh-c` ridotta), background `{stone-surface}`, radius `pill`
- **Selected/Active:** Background `{red-action}`, testo bianco
- **Filtro:** Badge con contatore usa background `{red-action}` come dot indicator

## 6. Do's and Don'ts

### Do:
- **Do** usare ombre stratificate tintate (`rgba(148,128,118,...)`) — mai ombre nere pure su superfici chiare
- **Do** affondar gli input dentro la superficie — sempre `--ua-sh-i`, mai raised
- **Do** limitare il rosso al ≤20% della superficie visibile — è un segnale, non uno sfondo
- **Do** usare Playfair Display per qualsiasi numero che rappresenta una misura KPI
- **Do** garantire touch target ≥52px per ogni elemento interattivo
- **Do** aggiungere feedback `scale(0.94)` + `--ua-sh-p` su ogni elemento pressabile entro 80ms
- **Do** animare solo `transform` e `opacity` — mai `width`, `height`, `left`, `top`
- **Do** rispettare `prefers-reduced-motion` su tutte le animazioni non-istantanee
- **Do** abbinare il feedback haptic ai momenti critici (CONSEGNA, firma DdC, conferma fattura)

### Don't:
- **Don't** usare `border-left: 3px solid` come accento colorato su card o list item — è il segnale più riconoscibile dell'AI slop. Usa background tint, icona leading, o niente.
- **Don't** usare `cubic-bezier(0.34, 1.56, 0.64, 1)` o qualsiasi easing bounce/elastico — si sentono fake. Usa exponential ease-out o spring fisici.
- **Don't** animare `width` o `height` — causa layout thrash. Usa `transform: scaleX()` o `grid-template-rows`.
- **Don't** usare Inter o qualsiasi font diverso da DM Sans e Playfair Display
- **Don't** usare gradient viola-blu — è il reflex fintech da evitare esplicitamente
- **Don't** usare bordi come decorazione — le ombre fanno il lavoro della profondità
- **Don't** creare elementi piatti senza nessuna ombra in questo sistema — ogni superficie deve vivere nello spazio
- **Don't** imitare DentalMaster: tabelle grigie dense, font sotto 14px, flussi a 10+ step
- **Don't** imitare il generic SaaS (Linear/Notion clone): tutto bianco, border-radius uniforme 16px, Inter font
- **Don't** usare `transition: all` — specifica sempre le proprietà esatte da animare
- **Don't** usare glassmorphism — non appartiene alla fisica della pietra; il vetro è freddo, la pietra è calda
- **Don't** mettere card dentro card — le nested cards sono sempre sbagliate

# UÀ — Design System v2.3
**Approvato:** 27/05/2026 — Francesco Formicola  
**Sostituisce:** Design System v2.2 (ANALISI/26_ua_design_system_completo.md — OBSOLETO)  
**Mockup interattivo:** `docs/design/mockups/2026-05-27-design-system-v2-3.html`

---

## REGOLA ZERO

Questo file è la **UNICA FONTE DI VERITÀ** per il design system di UÀ.  
**MAI** inventare valori CSS inline. **SEMPRE** usare i token qui definiti.

---

## 1. TOKEN COLORE — Light Mode

```css
/* Base surfaces */
--bg:  #DDD8D3;   /* warm panna — piano di lavoro */
--sfc: #E4DFD9;   /* surface elevata */
--elv: #EDEDEA;   /* elevation (hover states) */
--prs: #D4CFC9;   /* pressed / recessed */

/* Testo — WCAG verified */
--t1: #1C1916;    /* 12.4:1 su --bg → AAA */
--t2: #4A3D33;    /* 7.4:1 su --bg → AAA  (era #96918D: 2.2:1 ❌) */
--t3: #6B5C51;    /* 4.5:1 su --bg → AA   (era #B8B3AE: 1.5:1 ❌) */

/* Primary */
--primary: #D90012;   /* CTA, FAB, azioni principali — MAI come testo inline */
```

## 2. TOKEN COLORE — Dark Mode

```css
/* Base surfaces — stile admin (flat, zero shadows) */
--bg:  #1A1916;   /* body background */
--sfc: #232018;   /* card background (+1 stop sopra bg) */
--prs: #141210;   /* recessed / pressed */

/* Testo dark */
--t1: #F0EDE8;
--t2: #8A8580;
--t3: #5A5652;

/* Primary dark */
--primary: #E8001A;
```

## 3. COLORI SEMANTICI — Rainbow (stile admin)

Usati per stati operativi, KPI, badge. **MAI** come colori di sfondo primari.

```css
--c-blue:   #3B82F6;   /* info · trial · in-corso */
--c-green:  #22C55E;   /* success · attivo · pronto · consegnato */
--c-amber:  #F59E0B;   /* warning · sospeso · attenzione */
--c-orange: #F97316;   /* caution · rischio medio */
--c-red:    #EF4444;   /* danger · blacklist · scaduto */
--c-purple: #8B5CF6;   /* premium · speciale */
--success:  #3DCB5C;   /* toggle ON, connection status (da admin) */
```

**Semantica KPI dashboard:**
- "In ritardo" → `#EF4444` (red)
- "Da fatturare" → `#22C55E` (green)
- "In lavoraz." → `#3B82F6` (blue)
- "Urgente" badge → `#EF4444`
- "Pronto" badge → `#22C55E`
- "Sospeso" badge → `#F59E0B`

---

## 4. SISTEMA SHADOW — Light Mode

Regola matematica: shadow derivate da `hsl(30°)` warm del bg.  
**Shadow dark:** `#B8B0A8` (hsl 30°, 12%, 70% — −14L +4S da bg)  
**Shadow chiara:** `#F0EDEA` (hsl 30°, 5%, 95% — +11L −3S da bg)

**Regola scaling:** offset = ~5% dimensione elemento · blur = offset × 2

```css
/* Raised — card, button default */
--sh:
  rgba(255,255,255,.88) 0 1px 0 0 inset,
  rgba(0,0,0,.04) 0 -1px 2px 0 inset,
  rgba(255,255,255,.72) -5px -5px 11px,
  rgba(148,128,118,.40) 9px 12px 22px -4px,
  rgba(148,128,118,.22) 3px 5px 10px -2px;

/* Raised small — button, chip, KPI box */
--sh-sm:
  rgba(255,255,255,.90) 0 1px 0 0 inset,
  rgba(0,0,0,.05) 0 -2px 3px 0 inset,
  rgba(255,255,255,.78) -5px -5px 11px,
  rgba(148,128,118,.44) 9px 13px 22px -4px,
  rgba(148,128,118,.26) 3px 5px 9px -1px;

/* Inset — input field, campo ricerca, pressed state */
--sh-in:
  rgba(148,128,118,.32) 4px 4px 9px 0 inset,
  rgba(255,255,255,.66) -3px -3px 7px 0 inset;

/* Float — nav bar, modal, bottom sheet (massima elevazione) */
--sh-float:
  rgba(255,255,255,.72) -8px -8px 18px,
  rgba(148,128,118,.55) 10px 12px 24px -4px;
```

## 5. SISTEMA SHADOW — Dark Mode

**Nessuna shadow raised in dark** — depth tramite differenza di background.  
Cards: `var(--sfc) #232018` invece di `var(--bg) #1A1916`.

```css
--sh:     none;
--sh-sm:  none;

/* Inset dark */
--sh-in:
  rgba(4,3,2,.92) 4px 4px 9px 0 inset,
  rgba(40,37,32,.50) -3px -3px 7px 0 inset;

/* Float dark — nav, modal */
--sh-float:
  rgba(0,0,0,.70) 0 12px 28px,
  rgba(0,0,0,.40) 0 4px 8px;
```

**Card dark:** `background: var(--sfc)` + `border: 1px solid rgba(255,255,255,.05)`

---

## 6. TIPOGRAFIA

**Font body:** DM Sans (variable, opsz axis — `font-optical-sizing: auto`)  
**Font display KPI:** Playfair Display (weight 300, 38–48px)  
**MAI:** Inter · gradiente viola-blu · shadow cobalt

**Type scale — base 14px, ratio 1.2:**

| Livello | Size | Weight | Uso |
|---------|------|--------|-----|
| caption | 10px | 700 caps | Label, id, timestamp |
| body | 14px | 400 | Testo operativo default |
| title-sm | 17px | 600 | Numero lavoro, card title |
| title | 20px | 700 | Section heading |
| page | 24px | 700 | Page title |
| display | 30–48px | 300 | KPI numeri (Playfair) |

---

## 7. BUTTON VARIANTS

### A — FColombati Pill (azione principale / secondaria)

Struttura HTML obbligatoria:
```tsx
<button className="cta"> {/* o .ghost per secondario */}
  <div className="o">
    <div className="i">
      <span>Testo</span>
    </div>
  </div>
</button>
```

- `font-size: 16px` sul wrapper — **obbligatorio** per em scaling corretto
- Hover: il pulsante "atterra" sul piano (shadow collassa)
- Press: `clip-path` si restringe + shadow inset
- **Non usare** per CTA isolata grande → usare Push 3D

### B — Push 3D (CTA isolata, azioni principali di pagina)

Struttura HTML obbligatoria:
```tsx
<button className="push">
  <span className="ps"></span>  {/* shadow */}
  <span className="pe"></span>  {/* edge laterale */}
  <span className="pf">Testo</span>  {/* front */}
</button>
```

- Default: `translateY(-8px)` — sollevato 8px
- Hover: `translateY(-11px)` con spring
- Press: `translateY(-1px)` — quasi a piano, 34ms istantaneo
- Shadow blur: `filter: blur(2px)` sull'ombra
- **Non usare** in liste o form → usare FColombati

### C — Standard 3 stati (uso generico)

```tsx
<button className="btn btn-raised">Default</button>
<button className="btn btn-flat">Flat/hover</button>
<button className="btn btn-pressed">Pressed</button>
```

- Dark raised: background `var(--sfc)` — **zero border, zero glow**
- Dark hover: solo `background: #2A2720`

---

## 8. TASTO + CIRCOLARE

Due versioni fisiche ispirate a immagini di riferimento approvate:

### Bianco (light mode)
- Background: `#EFEEEB` (off-white warm)
- Ring inset: `rgba(82,72,62,.28) 0 0 0 1.5px inset`
- Corona esterna via `::before` con shadow warm
- Icona: `#ADADAD` (grigio medio)
- Press: `scale(0.92)` + inversione shadow

### Nero (dark mode)
- Background: `radial-gradient(circle at 35% 30%, #2E2C2A, #252320, #1E1C1A)`
- Bezel anello: `box-shadow: 0 0 0 7px #181614, 0 0 0 8px rgba(80,72,64,.25)`
- Highlight luce top-right sull'anello via `::before`
- Icona: `#4A4642` (quasi invisibile su dark — intenzionale)
- Press: `scale(0.93)` + cap scende nell'anello

### Rosso (CTA nav)
- Stesso sistema bezel+cap, adattato al rosso `#D90012`
- Bezel: `box-shadow: 0 0 0 7px #6A0008`
- Icona: `rgba(255,255,255,.85)`

**Taglie:** 80px (hero), 60px, 48px (nav large), 40px (nav small)

---

## 9. ANTI-PATTERN PERMANENTI

```
❌ MAI Inter (DM Sans ovunque)
❌ MAI gradiente viola-blu
❌ MAI #0F1E52 / #1B2D6B come background (solo nav pill active)
❌ MAI #E30613 invece di #D90012
❌ MAI rgba(255,255,255) > 0.32 nelle shadow light (crea glow glassy)
❌ MAI shadow esterna sul raised in dark mode (usa border sottile)
❌ MAI --t2 #96918D (contrasto 2.2:1 ❌) — usare #4A3D33
❌ MAI --t3 #B8B3AE (contrasto 1.5:1 ❌) — usare #6B5C51
❌ MAI --gold #D4A843 come testo (contrasto 1.6:1 ❌)
❌ MAI incavo button — rimossi dal design system
✅ Dark mode = flat admin style, card leggermente più chiara del bg
✅ KPI numbers = rainbow colors semantici
✅ Primary #D90012 = solo per CTA, MAI come testo inline
```

---

## 10. MOTION

Riferimento completo: `src/design-system/motion.ts`  
Tassonomia 4 categorie (micro, feedback, navigazione, storytelling) documentata nel file.

**Regola:** MAI `duration: 0.3` inline. SEMPRE token da `motion.ts`.

---

## 11. FILE DI RIFERIMENTO

| File | Contenuto |
|------|-----------|
| `docs/design/mockups/2026-05-27-design-system-v2-3.html` | Mockup interattivo completo con tutti i componenti |
| `src/design-system/tokens.ts` | Token CSS/TS per uso in React |
| `src/design-system/motion.ts` | Sistema animazioni completo |
| `ANALISI/30_design_system_v2_definitivo.md` | **DEPRECATO per UI** — mantenere solo per reference storica |

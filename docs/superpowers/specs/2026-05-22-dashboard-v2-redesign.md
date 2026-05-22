# Dashboard V2 Redesign — Spec

**Data:** 22 maggio 2026
**Versione target:** V1.9
**Autore:** Francesco Formicola (direzione) + Claude (spec)
**Status:** Approvato per implementazione

---

## 1. Obiettivo

Ridisegnare completamente la dashboard principale di UÀ per:

1. Rispondere alla domanda "cosa faccio ADESSO?" in modo inequivocabile per un odontotecnico non tech-savvy alla prima esperienza mobile
2. Separare vista Gestione (business KPI) da vista Produzione (lavori operativi)
3. Gestire il ruolo ibrido Titolare+Tecnico (titolare che lavora anche al banco)
4. Portare i KPI a essere filtri attivi cliccabili che navigano direttamente alla lista filtrata
5. Rendere la navigazione personalizzabile (drag&drop, pin, tooltip)
6. Allineare dark mode a DS v2.2 carbonio caldo (token da `admin.css` + `login globals.css`)

---

## 2. Design System — Token di riferimento

### Light mode (DS v2.2 warm panna)

```css
--bg:     #DDD8D3   /* pietra base */
--sfc:    #E4DFD9   /* surface card */
--elv:    #EDEDEA   /* elevated (nav pill) */
--prs:    #D4CFC9   /* pressed / role tabs bg */
--t1:     #1C1916   /* testo primario */
--t2:     #96918D   /* secondario */
--t3:     #B8B3AE   /* muto */
--primary:#D90012   /* rosso azione */
--gold:   #D4A843   /* gold cerimoniale */
--success:#3DCB5C
--info:   #5A5FCC
--sh-b:   inset 0 1px 0 rgba(255,255,255,.90),inset 0 -2px 3px rgba(0,0,0,.05),
          -5px -5px 11px rgba(255,255,255,.78),9px 13px 22px -4px rgba(148,128,118,.44)
--sh-c:   inset 0 1px 0 rgba(255,255,255,.88),inset 0 -1px 2px rgba(0,0,0,.04),
          -5px -5px 11px rgba(255,255,255,.72),9px 12px 22px -4px rgba(148,128,118,.40),
          3px 5px 10px -2px rgba(148,128,118,.22)
--sh-i:   inset 4px 4px 9px rgba(148,128,118,.32),inset -3px -3px 7px rgba(255,255,255,.66)
--sh-red: inset 0 1px 0 rgba(255,255,255,.25),inset 0 -2px 3px rgba(0,0,0,.22),
          0 6px 18px -2px rgba(180,0,0,.40),0 2px 6px rgba(180,0,0,.26)
--border: rgba(0,0,0,.06)
```

### Dark mode (carbonio caldo — identici a admin.css)

```css
--bg:     #1A1916   /* carbonio warm — NON #1E1E1E neutro */
--sfc:    #222019
--elv:    #2C2A27
--prs:    #121110
--t1:     #F0EDE8   /* avorio — NON #FFFFFF */
--t2:     #8A8580
--t3:     #555250
--primary:#E8001A   /* +9% luminosità per contrasto su bg scuro */
--success:#2ECC7A
--info:   #6A70E8
--sh-b:   inset 0 1px 0 rgba(255,255,255,.05),inset 0 -2px 3px rgba(0,0,0,.28),
          9px 13px 28px -4px rgba(0,0,0,.52),3px 5px 12px -1px rgba(0,0,0,.34)
--sh-c:   inset 0 1px 0 rgba(255,255,255,.055),inset 0 -1px 2px rgba(0,0,0,.22),
          -5px -5px 11px rgba(255,255,255,.018),
          9px 12px 28px -4px rgba(0,0,0,.60),3px 5px 12px -2px rgba(0,0,0,.38)
--sh-i:   inset 4px 4px 9px rgba(0,0,0,.60),inset -3px -3px 7px rgba(255,255,255,.04)
--sh-red: inset 0 1px 0 rgba(255,255,255,.12),inset 0 -2px 3px rgba(0,0,0,.32),
          0 6px 18px -2px rgba(232,0,26,.38),0 2px 6px rgba(232,0,26,.22)
--border: rgba(255,255,255,.06)    /* INVERTITO rispetto a light */
```

### Tipografia

- **KPI numeri**: Playfair Display, weight 300, 38–44px (NON DM Sans, NON <34px)
- **Titoli card/sezione**: DM Sans, 700, 14–15px
- **Testo operativo**: DM Sans, 400, 13–14px
- **Label/metadata**: DM Sans, 500–600, 10–11px
- **Touch target minimo**: 52px × 52px su ogni elemento interattivo

### Regole assolute dark mode

- MAI `border: 1px solid rgba(255,255,255,.08)` come sostituto delle ombre
- MAI sfondo neutro `#1E1E1E` — usare sempre `#1A1916` warm
- MAI testo `#CCC` o `#DDD` — usare `#F0EDE8` avorio
- Le ombre fanno tutto il lavoro di separazione tra livelli
- Il rosso in dark è `#E8001A` (non `#D90012`)

---

## 3. Architettura della Dashboard

### 3.1 Routing e ruoli

La pagina `/dashboard` rileva il ruolo dell'utente e sceglie la vista appropriata:

```typescript
// dashboard/page.tsx
const isTitolare = ruolo === 'titolare' || ruolo === 'admin_rete'
const tecnicoRow = await svc.from('tecnici')
  .select('id')
  .eq('utente_id', user.id)
  .eq('laboratorio_id', labId)
  .maybeSingle()
const isTecnico = ruolo === 'tecnico' || (isTitolare && !!tecnicoRow)
const tecnicoId = tecnicoRow?.id ?? null

// Routing:
if (isTitolare && isTecnico) → DashboardHybrid (Gestione + Produzione tabs)
if (isTitolare)              → DashboardTitolare (solo tab Gestione)
if (ruolo === 'tecnico')     → DashboardTecnico (solo vista Produzione)
if (ruolo === 'front_desk')  → DashboardFrontDesk (accettazione + consegne)
```

### 3.2 Struttura componenti

```
src/components/features/dashboard/
├── DashboardShell.tsx          ← NEW: wrapper con role-tabs se ibrido
├── DashboardTitolare.tsx       ← REWRITE: solo tab Gestione
├── DashboardTecnico.tsx        ← REWRITE: solo vista Produzione
├── DashboardHybrid.tsx         ← NEW: titolare+tecnico con 2 tab
├── DashboardFrontDesk.tsx      ← REWRITE: ottimizzato FD
├── SpotlightCard.tsx           ← NEW: card hero urgenza principale
├── KpiCard.tsx                 ← NEW: KPI cliccabile come filtro
├── TaskItem.tsx                ← NEW: voce task con progress bar reale
└── LavoroUrgente.tsx           ← EXISTING: aggiornare
```

---

## 4. Layout per Viewport

### 4.1 Mobile 390px

```
[HEADER]
  ← lab-name       sync-badge        avatar →
  (9px, uppercase)  (Aggiornato ora)  (30×30px, in header NON fixed)

[GREETING]
  venerdì 22 maggio (11px, --t2)
  Filippo (Playfair 22px, --t1)

[ROLE TABS — solo se ibrido]
  📊 Gestione | 🔧 Produzione
  (background: --prs, active: --elv + --sh-b)

[SPOTLIGHT CARD — full width, --sh-c]
  ⛔ Blocco attivo (eyebrow, 9.5px, --primary)
  Titolo problema (Playfair 17px)
  Cliente · #numero · orario (11px, --t2)
  [Risolvi subito →] (CTA rosso pill, --sh-red) | timestamp

[KPI GRID — 2×2]
  Ogni cella: --sfc, border-radius 15px, --sh-b
  Numero: Playfair 38px, colore semantico
  Chevron "›" angolo top-right: 12px, --t3
  Label: DM Sans 11px, 600, --t2
  Azione: "oggi →" / "fattura →", 9.5px, --t3
  Touch: tutta la card è tappabile (min 52px h)

[TASK LIST — section label + items]
  Section: "I miei lavori — per scadenza" (9px, 700, --t3)
  Item: --sfc, --sh-b, 13px radius
    Numero rank (Playfair 13px, --t3) | body | time
    Body: nome 13px 700, fase 10px --t2, progress bar 3px
    Progress: da lavori_fasi reali (% completamento)
    Time: ore 11px 700, data 9px --t3

[BOTTOM NAV PILL]
  --elv, border-radius 100px, --sh-b
  5 items: Oggi · Lavori · [+FAB] · Clienti · Altro
  Active: --prs, --sh-i, label in --primary 700
  Inactive: label --t2, icona --t2
  FAB "+": 46px circle, --elv, --sh-b, colore --primary
  Tooltip "Nuovo lavoro" sul "+": fisso (non solo hover)
  Tab "Altro" con 📌 pin badge se personalizzato
  Hint sotto: "Tieni premuto per personalizzare" (8px, --t3)
```

### 4.2 Tablet 768px

Differenze rispetto a mobile:
- KPI: 4 in riga (grid-template-columns: repeat(4, 1fr)), Playfair 42px
- Task: griglia 2 colonne
- Spotlight: font più grande (spot-title 18px)
- Nav: una voce aggiuntiva visibile (es. "Fatture")
- Padding orizzontale: 18px (vs 14px mobile)

### 4.3 Desktop 1280px

Layout 2 colonne (50/50):

```
Colonna sinistra: Produzione
  ← Header (lab-name + sync + avatar) full-width
  Spotlight compresso (orizzontale: eyebrow + title + CTA inline)
  Section "I miei lavori"
  Task list verticale (3+ task visibili)

Colonna destra: Gestione
  "Gestione Lab" label
  KPI 2×2: Playfair 44px
  Mini chart fatturato (bar chart semplice, 36px height)
  Section "Finanziario"
  Pagamenti scaduti (top 3)
  Section "Accessi rapidi" (4 shortcuts draggabili)

Nav pill: NASCOSTA su desktop (≥1024px via CSS .ua-bottom-nav { display:none })
Navigazione desktop: sidebar links o browser standard
```

---

## 5. Componenti Chiave

### 5.1 SpotlightCard

**Quando appare:** Se esiste almeno 1 tra: segnalazione_tipo non nulla + segnalazione_risolta=false, oppure lavoro con stato=in_ritardo e urgenza alta.

**Priorità:** segnalazione bloccante > in_ritardo urgente > in_ritardo normale

```typescript
interface SpotlightCardProps {
  tipo: 'blocco' | 'ritardo' | 'urgente'
  lavoro_id: string
  numero_lavoro: string
  cliente_display: string
  descrizione_problema: string
  data_consegna_prevista: string
  ora_consegna: string | null
  timestamp_segnalazione: string | null
}
```

**Se non ci sono urgenze:** SpotlightCard non viene renderizzata. Al suo posto: nessun placeholder — si mostra direttamente la KPI grid.

### 5.2 KpiCard (cliccabile come filtro)

```typescript
interface KpiCardProps {
  valore: number
  label: string
  azione: string          // "oggi →" | "fattura →" | "ordina →"
  colore: 'red' | 'blue' | 'gold' | 'green' | 'grey'
  href: string            // URL di navigazione con filtro pre-attivo
  // Esempi:
  // href="/lavori?filter=consegne-oggi"
  // href="/fatture"
  // href="/magazzino?filter=sotto-scorta"
  // href="/lavori?stato=in_ritardo"
}
```

**Affordance:** Chevron "›" angolo top-right. Tutta la card è un Link Next.js. Feedback pressed: `transform:scale(.95)` + `--sh-i` in 80ms.

**Numero zero:** valore=0 → colore --t2 (grigio muto), azione non mostrata. Non cliccabile se zero (pointer-events:none).

### 5.3 TaskItem

```typescript
interface TaskItemProps {
  rank: number
  id: string
  numero_lavoro: string
  cliente_display: string
  stato_fase_attuale: string | null  // da lavori_fasi
  completamento_perc: number         // calcolato reale, non hardcoded
  data_consegna_prevista: string
  ora_consegna: string | null
  colore_fase: 'gold' | 'green' | 'blue' | 'red'
}
```

**completamento_perc calcolato:**
```sql
-- In query getTecnicoDashboard / getLavoriTitolare:
SELECT
  l.id,
  COUNT(lf.id) FILTER (WHERE lf.eseguita_at IS NOT NULL) * 100 /
  NULLIF(COUNT(lf.id), 0) AS completamento_perc
FROM lavori l
LEFT JOIN lavori_fasi lf ON lf.lavoro_id = l.id
GROUP BY l.id
```

**Se nessuna fase:** fallback su stato → ricevuto=10%, in_lavorazione=40%, in_prova=70%, pronto=95%, consegnato=100%.

### 5.4 BottomNavPill — Personalizzazione

**Funzionalità da implementare subito (non future):**

1. **Tooltip sul "+":** `<span role="tooltip">` sempre visibile con testo "Nuovo lavoro". Non solo su hover — visibile permanentemente come piccolo badge sotto il pulsante su mobile.

2. **Drag & drop:**
   - Long press (500ms) su qualsiasi tab → entra in "edit mode"
   - In edit mode: outline tratteggiata sulla pill, handle drag su ogni item
   - Drag per riordinare i tab (escluso il FAB centrale che è fisso)
   - Rilascio → salva ordine in `localStorage` + `utenti.nav_preferences` (JSON)

3. **Pin/sostituzione tab:**
   - In edit mode: tap su un tab → mostra bottom sheet "Sostituisci con..."
   - Lista di tutte le pagine disponibili: Agenda, Tecnici, Qualità, Impostazioni, Magazzino, Analytics, Ordini
   - Selezione → tab sostituito, badge 📌 visibile
   - Persistenza: `localStorage` + DB `utenti.nav_preferences`

4. **Tab "Altro":**
   - Apre un bottom sheet con tutte le pagine non in nav principale
   - Sempre presente come fallback anche se personalizzi tutto

**Schema DB aggiuntivo:**
```sql
ALTER TABLE utenti ADD COLUMN IF NOT EXISTS nav_preferences JSONB DEFAULT NULL;
-- Esempio valore:
-- {"tabs": ["dashboard", "lavori", null, "clienti", "tecnici"], "pinned": ["tecnici"]}
```

### 5.5 Role Tabs (vista ibrida)

Visibili solo se `isTitolare && isTecnico`. Struttura:

```tsx
<div className="role-tabs">
  <button
    role="tab"
    aria-selected={activeView === 'gestione'}
    onClick={() => setActiveView('gestione')}
  >
    📊 Gestione
    <small>business</small>
  </button>
  <button
    role="tab"
    aria-selected={activeView === 'produzione'}
    onClick={() => setActiveView('produzione')}
  >
    🔧 Produzione
    <small>i miei lavori</small>
  </button>
</div>
```

**Persistenza:** `localStorage.setItem('ua-dashboard-view', activeView)` — ricorda l'ultima vista aperta.

**Default:** Apre sempre su Produzione (lavori operativi). Override da localStorage se l'utente ha cambiato esplicitamente tab nell'ultima sessione. La logica time-based è esclusa dallo scope — troppa complessità per il gain.

---

## 6. Sync Badge (sostituisce "LIVE")

Il badge "LIVE" attuale viene sostituito con un indicatore più informativo:

```tsx
<div className="sync-badge">
  <div className={`sync-dot ${isConnected ? 'connected' : 'disconnected'}`} />
  {isConnected
    ? lastUpdateSeconds < 60
      ? 'Aggiornato ora'
      : `${Math.floor(lastUpdateSeconds / 60)} min fa`
    : 'Offline'
  }
</div>
```

**Colori:**
- Connesso + aggiornato: dot verde `#3DCB5C`
- Connesso + stale (>5 min): dot arancione `--warning`
- Offline: dot rosso `--primary`, testo "Offline"

**Realtime:** il badge si aggiorna ogni 30s via `setInterval`. La connessione Realtime è gestita da `RealtimeProvider` esistente — il sync badge la legge via context.

---

## 7. Dark Mode — Applicazione

La dark mode attuale è parziale e usa token sbagliati (ombre piatte, sfondo neutro, testo grigio). Il redesign dashboard porta la dark mode corretta:

**Unico meccanismo:** `.dark` class su `<html>` (già gestito da `ThemeInitializer` + `useTheme`)

**Il toggle dark/light:** SOLO in `/impostazioni` — nessun riferimento nell'UI operativa.

**Nessun nuovo sistema:** usare esattamente i token `.dark {}` già in `globals.css` (righe 138-199), identici a `admin.css [data-theme="dark"]`.

**Cosa fare nel redesign:**
- Tutti i componenti della dashboard usano `var(--bg)`, `var(--sfc)`, `var(--sh-b)` etc. — i token CSS cascadano automaticamente da `.dark {}`
- Rimuovere qualsiasi colore hardcoded (`rgba(0,0,0,.06)` come border su dark, `#DDD` come testo)
- I divider usano `var(--border)` che è `rgba(0,0,0,.06)` in light e `rgba(255,255,255,.06)` in dark

---

## 8. Query dati — Modifiche necessarie

### 8.1 Nuova query: getLavoriConCompletamento

```typescript
// src/lib/dashboard/queries.ts — aggiungere
export async function getLavoriTecnicoOggi(
  svc: SupabaseClient,
  labId: string,
  tecnicoId: string
): Promise<TaskItemProps[]> {
  const oggi = oggiISO()
  const { data } = await svc
    .from('lavori')
    .select(`
      id, numero_lavoro, stato, priorita,
      descrizione, data_consegna_prevista, ora_consegna,
      clienti(nome, cognome, studio_nome),
      lavori_fasi(id, eseguita_at)   /* colonna reale: eseguita_at non null = completata */
    `)
    .eq('laboratorio_id', labId)
    .eq('tecnico_id', tecnicoId)
    .not('stato', 'in', '("consegnato","annullato")')
    .order('data_consegna_prevista', { ascending: true })
    .limit(20)

  return (data ?? []).map(l => {
    const fasi = l.lavori_fasi ?? []
    const completamento = fasi.length > 0
      ? Math.round(fasi.filter(f => f.eseguita_at !== null).length / fasi.length * 100)
      : statoToPerc(l.stato)
    return { ...l, completamento_perc: completamento }
  })
}

function statoToPerc(stato: StatoLavoro): number {
  const map: Record<StatoLavoro, number> = {
    ricevuto: 10, in_lavorazione: 40, in_prova: 60,
    in_prova_esterna: 65, pronto: 90, in_ritardo: 35,
    sospeso: 20, consegnato: 100, annullato: 0
  }
  return map[stato] ?? 0
}
```

### 8.2 Index Supabase da aggiungere (migration)

```sql
-- Per query tecnico dashboard
CREATE INDEX IF NOT EXISTS idx_lavori_tecnico_stato_data
  ON lavori(tecnico_id, stato, data_consegna_prevista)
  WHERE deleted_at IS NULL;

-- Per progress bar
CREATE INDEX IF NOT EXISTS idx_lavori_fasi_lavoro_completata
  ON lavori_fasi(lavoro_id) WHERE eseguita_at IS NOT NULL;
```

### 8.3 Filtro STOR/ — già applicato in V1.8.2

Il filtro `.not('numero_lavoro', 'ilike', 'STOR/%')` è già in produzione nella query `ritardoData` del dashboard/page.tsx.

---

## 9. Animazioni

Usare SOLO token da `src/design-system/motion.ts`. Proibito `duration: 0.3` inline.

- **Role tab switch:** `t('fast', 'enter')` — cambio istantaneo con fade-in del contenuto
- **KPI card pressed:** CSS `transition: transform .12s cubic-bezier(.2,0,0,1)` — NON motion per micro-interazione
- **Task list:** stagger entrance con delay crescente, `t('normal', 'enter')`
- **Spotlight card entrance:** `t('slow', 'enter')` — entra per prima con leggero ritardo
- **Nav edit mode:** spring `motionTokens.spring.snappy` per ordinamento drag

---

## 10. Accessibilità

- Role tabs: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- KPI cards: `aria-label="3 lavori da consegnare oggi, tap per vedere la lista"`
- Spotlight: `role="alert"` — annunciato immediatamente da screen reader
- Nav: `role="navigation"`, ogni item con `aria-current="page"` se attivo
- Progress bar: `role="progressbar"`, `aria-valuenow={completamento}`, `aria-label`
- Contrasto minimo WCAG AA su tutti gli elementi (verificare --t2 su --bg in dark)

---

## 11. Edge Cases

| Scenario | Comportamento |
|----------|--------------|
| Nessun blocco/urgenza | SpotlightCard non renderizzata — si va dritto ai KPI |
| KPI = 0 | Numero in --t2, nessun chevron, non cliccabile |
| Nessun lavoro tecnico oggi | Task list mostra empty state con CTA "Crea nuovo lavoro →" |
| Utente offline | Sync badge rosso "Offline", dati cached dall'ultima sessione |
| Nuovo utente (0 lavori) | Dashboard mostra onboarding card con "Crea il tuo primo lavoro" |
| Titolare senza `tecnici` record | Solo tab Gestione visibile (isTecnico=false) |
| Session expired | Redirect /login gestito da middleware esistente |

---

## 12. Fuori Scope

Non implementare in questo ciclo:
- Notifiche push dalla dashboard (già implementate altrove)
- Analytics avanzate (V2.0)
- Agenda integrata nella dashboard (V2.0)
- Widget fatturato real-time (V2.0)
- Puntualità % tecnico (richiede calcolo storico — V2.0)

---

## 13. File da creare/modificare

| File | Azione |
|------|--------|
| `src/app/(app)/dashboard/page.tsx` | Modificare routing ruoli, aggiungere rilevamento isTecnico |
| `src/components/features/dashboard/DashboardShell.tsx` | Creare: wrapper con role-tabs condizionale |
| `src/components/features/dashboard/DashboardTitolare.tsx` | Riscrivere: solo vista Gestione |
| `src/components/features/dashboard/DashboardTecnico.tsx` | Riscrivere: vista Produzione con data reale |
| `src/components/features/dashboard/DashboardHybrid.tsx` | Creare: componente ibrido con tab |
| `src/components/features/dashboard/DashboardFrontDesk.tsx` | Riscrivere: allineare al nuovo DS |
| `src/components/features/dashboard/SpotlightCard.tsx` | Creare |
| `src/components/features/dashboard/KpiCard.tsx` | Creare |
| `src/components/features/dashboard/TaskItem.tsx` | Creare |
| `src/components/layout/BottomNavPill.tsx` | Aggiungere: tooltip, drag&drop, pin |
| `src/lib/dashboard/queries.ts` | Aggiungere getLavoriTecnicoOggi, aggiornare getLavoriInRitardo |
| `src/app/globals.css` | Nessuna modifica (token dark già corretti in V1.8.2) |
| `supabase/migrations/` | Migration: index lavori+lavori_fasi, nav_preferences colonna |

---

*Spec completata e approvata da Francesco Formicola — 22 maggio 2026*

# Re-Audit — Prospettiva: Senior Product Designer (Design System v2.3)
**Data:** 2 luglio 2026 | **Versione app:** V1.9.3 (`main` post `63f93e5`) | **Claim in verifica:** "Design System v2.3 — implementazione completa al 100%" (MEMORY.md, 28/05/2026)

---

## Verdetto in una riga

**Il claim "100% compliance" è falso.** L'esecuzione sulle pagine ricostruite per V1.9 (Dashboard, Clienti, Fatture, Impostazioni, Magazzino) è genuinamente forte e migliorata rispetto al v2.2 — ma la pagina di **login** (la superficie a più alto traffico dell'app) porta ancora in produzione i due valori `--t2`/`--t3` che la spec v2.3 vieta esplicitamente per contrasto WCAG fallito, e il file `qualita/page.tsx` — citato in MEMORY.md come "fixato" — contiene ancora due violazioni dell'anti-pattern list v2.3 (gold-come-testo, cobalt non definito), invisibili allo script di enforcement automatico per limiti precisi del suo scope.

**Punteggio: 8.8/10** (precedente: 9.2/10 su DS v2.2 — vedi nota di comparabilità sotto)
**Conformità reale misurata: ~88%** (pesata; non 100%)

---

## Nota di comparabilità con l'audit precedente

Il punteggio non è direttamente confrontabile col 9.2/10 del 21/05/2026: quell'audit valutava conformità a DS **v2.2**, che non vietava ancora esplicitamente `--t2:#96918D` / `--t3:#B8B3AE` come pattern di progetto (li segnalava come problema WCAG generico, non come anti-pattern nominato). DS v2.3 ha reso quella regola esplicita e nominale ("❌ MAI --t2 #96918D / --t3 #B8B3AE"), e in questo senso la violazione sul login **non è una regressione introdotta ora** — è codice preesistente che *nessuno dei due audit* ha ancora scoperto, perché vive in un file (`globals.css`, tema scoped `.login-root[data-login-theme]`) con un prefisso variabile diverso (`--ua-t2`/`--ua-t3`) da quello che sia il grep manuale del 21/05 sia lo script di compliance automatico del 28/05 hanno cercato (`--t2`/`--t3` globali).

---

## Metodologia e limite operativo rilevante

1. **Analisi statica**: grep mirato su `src/` per hex hardcoded, shadow inline, `transition:` non-token, font non-DM-Sans, letto `globals.css` per intero (1427 righe) e lo script `scripts/check-ds-compliance.sh`.
2. **Verifica visiva Playwright** in produzione (https://uachelab.com), autenticato come `h4t@live.it` (titolare, lab Filippo), a 390/768/1280px, light/dark.

**Limite rilevante emerso durante l'audit**: la sessione di produzione condivisa è risultata **concorrentemente in uso da un processo E2E automatizzato** (login intercalati di `e2e-tecnico@ua-test.local`, `e2e-frontdesk@ua-test.local`, drift di navigazione verso `/lavori/nuovo`, sessioni scadute e ri-login ripetuti, un tab aperto su `chrome://password-manager/passwords`). Questo ha causato **perdita/sovrascrittura di alcuni screenshot** (stesso filename, contenuto diverso alla lettura finale) e ha impedito la copertura completa a 3 viewport × 2 temi su tutte le 8 pagine richieste. Ho verificato il contenuto reale di ogni PNG con `Read` **dopo** il salvataggio per garantire che le didascalie sotto corrispondano al file effettivo su disco, non a quanto pensavo di aver catturato.

**Copertura effettivamente ottenuta e verificata:**

| Pagina | 390 light | 390 dark | 768 | 1280 | Note |
|---|---|---|---|---|---|
| Login | ✅ | ❌ (perso) | — | ✅ (mostra un altro account e2e, non login pulito) | WCAG-fail confermato visivamente |
| Dashboard | ✅ | ✅ | ⚠️ perso (sovrascritto da Nuovo Lavoro) | ✅ dark | Rainbow KPI + Playfair + flat dark confermati |
| Qualità | ✅ | ❌ (3 tentativi persi per drift sessione) | ⚠️ perso | ⚠️ perso | Solo light confermato live; dark valutato da codice |
| Clienti | ✅ | ✅ | — | — | Pieno |
| Fatture | ✅ | ✅ | — | — | Pieno |
| Magazzino | ✅ | ⚠️ perso | — | — | |
| Impostazioni | ✅ | ✅ | — | — | Pieno |
| Portale | ❌ | ❌ | ❌ | ❌ | Nessun token sicuro reperibile senza disturbare la sessione live; valutato solo da codice |

Screenshot salvati in `docs/audit-2026-07-02/screenshots/05-designer/` (22 file; alcuni nomi non corrispondono al contenuto finale per il motivo sopra — usati comunque come evidenza, rietichettati correttamente nel testo sotto).

---

## 1. Login / Auth — VIOLAZIONE WCAG CONFERMATA VISIVAMENTE (nuova scoperta, non nei due audit precedenti)

**File:** `src/app/globals.css:239-268` (blocco `.login-root[data-login-theme="light"]`)

```css
--ua-t2:   #96918D;   /* 2.2:1 su bg — WCAG FAIL */
--ua-t3:   #B8B3AE;   /* 1.5:1 su bg — WCAG FAIL */
```

Questi sono **esattamente** i due valori che la Regola 9 della spec v2.3 vieta ("❌ MAI --t2 #96918D... ❌ MAI --t3 #B8B3AE"). Il blocco dark equivalente (righe 270-299) usa correttamente `#8A8580`/`#555250`, quindi **solo il light mode del login è compromesso**.

Impatto visivo confermato in `login-390-light.png`: il tagline "Il laboratorio più rapido, più semplice, più UÀ.", le etichette "EMAIL"/"PASSWORD", "Ricorda su questo dispositivo" e "Password dimenticata?" sono visibilmente sbiaditi sul fondo panna — leggibili ma sotto soglia AA per un utente con vista ridotta.

Queste variabili (`--ua-t2`, `--ua-t3`) sono usate anche in `.ua-tagline`, `.ua-flbl`, `.ua-plan-desc`, `.ua-rete-check`, `.ua-safe-text`, `.ua-page-sub` — cioè si propagano a **login, forgot-password, reset-password, billing, pagine blocked/sospeso**, non solo alla home page di accesso.

**Perché è sfuggito a entrambi gli audit e allo script**: `scripts/check-ds-compliance.sh` limita lo scope a `src/app/(app) src/app/billing src/components` e cerca solo in file `.tsx`/`.ts` — `src/app/globals.css` (dove vive questa dichiarazione) non è mai scansionato. Il grep manuale dell'audit del 21/05 cercava `#96918D`/`#B8B3AE` come fallback nei componenti pagina, non come dichiarazione di variabile scoped con prefisso diverso (`--ua-*` invece di `--*`).

**Severità:** Alta — impatta la primissima schermata vista da ogni utente, su una regola esplicitamente nominata come "MAI" nella fonte di verità.

---

## 2. `qualita/page.tsx` — I due problemi P1 dell'audit precedente sono risolti; ne sopravvivono due nuovi, non individuati dal gate

**Confronto diretto col fix dichiarato:**

| Violazione trovata il 21/05 | Stato oggi |
|---|---|
| `background: '#1B4FCC'` hardcoded ("Segnalato Ministero") | ✅ **Risolto** — ora `background: 'rgba(27,45,107,0.15)'` |
| `background: '#0A3D2E'` hardcoded ("Risolto") | ✅ **Risolto** — ora `background: 'rgba(22,163,74,0.15)'` |
| `background: '#3A1A1A'` per incidenti gravi | ✅ **Risolto** — ora `isGrave ? 'rgba(217,0,18,0.10)' : 'var(--surface, #E4DFD9)'` |
| Shadow alpha malformata (`}}40` su hex) | ✅ **Risolto** — ora usa `var(--t2, #4A3D33)` come base del boxShadow inset |

Il fix dichiarato in MEMORY.md per questo file è reale e verificato leggendo il sorgente riga per riga.

**Ma, nello stesso file, sopravvivono due violazioni dell'anti-pattern list v2.3:**

**a) Gold come testo (`qualita/page.tsx:21,293`)**
```typescript
const gravitaColor: Record<string, string> = {
  lieve: 'var(--gold, #D4A843)',   // ← usato poi come color: a riga 293
  ...
}
...
color: gravitaColor[inc.gravita] ?? 'var(--t1, #1C1916)',   // riga 293
```
Regola v2.3: "❌ MAI --gold #D4A843 come testo (contrasto 1.6:1 ❌)". Questo è esattamente quel pattern, applicato all'etichetta di gravità "lieve" negli incidenti MDR.

**Perché il gate non l'ha bloccato**: `check-ds-compliance.sh` cerca `color:.*var(--gold` sulla **stessa riga**. Qui il valore passa per un oggetto di lookup (`gravitaColor[inc.gravita]`) — la stringa letterale `var(--gold, ...)` e l'uso come `color:` sono su righe diverse. Un blind spot concreto e riproducibile del gate su qualunque colore mappato indirettamente.

**b) `--cobalt` non è mai definito in nessun file del progetto (`qualita/page.tsx:312`)**
```typescript
color: 'var(--cobalt, #1B2D6B)',   // badge "Segnalato Ministero"
```
Ho verificato con grep ricorsivo su tutto `src/` (incluso `admin.css`): **`--cobalt` non esiste come dichiarazione CSS in nessun punto della codebase.** Questo significa che il fallback `#1B2D6B` non è un fallback difensivo — è **il valore che renderizza sempre**, in ogni tema, in ogni pagina che lo referenzia (anche `LavoroCard.tsx:682`, `ToastNotifiche.tsx:26`, `OdontogrammaFDI.tsx` ×5). `#1B2D6B` è il valore esplicitamente vietato dalla regola "❌ MAI #0F1E52 / #1B2D6B come background (solo nav pill active)" — qui peraltro usato come colore di testo, non background, un uso ancora più fuori scope dell'eccezione dichiarata.

Non ho potuto verificare l'impatto visivo dal vivo perché il lab di test non ha incidenti MDR con `segnalato_ministero=true` o `gravita='lieve'` popolati (screenshot conferma stato vuoto: "Nessun incidente registrato"). L'analisi statica resta comunque conclusiva: la stringa CSS `color: #1B2D6B` è nel bundle di produzione e si applicherà non appena esiste un incidente con quel flag.

**Severità:** Media — bassa frequenza d'uso (richiede dati specifici), ma dimostra che il gate automatico ha punti ciechi strutturali, non occasionali.

---

## 3. Billing / pagine bloccate — hardcode diretto, fuori scope del gate

**File:** `src/app/globals.css` — classi `.ua-btn-gold` (869-896), `.ua-plan-card.active` (985-989), `.ua-plan-badge` (1027-1039), `.ua-rete-info-title` (1051-1057)

```css
.ua-btn-gold { background: #D4A843; ... }
.ua-btn-gold:active { background: #B8902E; }
.ua-plan-card.active { border-color: #D4A843; box-shadow: var(--ua-sh-b), 0 0 0 1px #D4A843; }
.ua-plan-badge { background: #D4A843; }
.ua-rete-info-title { color: #B8902E; }
```

Questi non sono fallback `var(..., #hex)` — sono hex letterali, in violazione diretta della REGOLA ZERO della spec ("MAI inventare valori CSS inline"). Non usati come testo su sfondo neutro (quindi non colpiscono la regola contrasto), ma bypassano comunque il sistema token. Fuori scope del compliance gate (che non tocca `.css`).

**Severità:** Bassa — impatto visivo nullo (il gold come CTA/badge di sfondo è coerente col resto del billing flow), ma è debito tecnico documentato in modo scorretto come "100% v2.3".

---

## 4. Componenti Dashboard V2 — transizioni CSS inline non-token

**File interessati:** `KpiCard.tsx:48`, `TaskItem.tsx`, `DashboardShell.tsx`, `DashboardTitolare.tsx`, `DashboardFrontDesk.tsx`, `SyncBadge.tsx`, `UserProfileSheet.tsx`, `src/app/admin/labs/[id]/lab-actions.tsx`

Esempio (`KpiCard.tsx:48`):
```typescript
transition: 'transform .12s cubic-bezier(.2,0,0,1), box-shadow .12s cubic-bezier(.2,0,0,1), background .12s',
```

L'audit precedente aveva verificato zero violazioni di motion policy, ma quel controllo copriva solo la sintassi Motion-JS (`transition={{ duration: ... }}`). Qui si tratta di stringhe CSS `transition:` con timing letterali (`.12s`), non `var(--tr)` né un token da `motion.ts` — la stessa regola ("MAI inventare duration") si applica, ed è violata proprio nei componenti nuovi che MEMORY.md cita come showcase della V1.9. L'effetto visivo è impercettibile (i valori sono ragionevoli e vicini a `--tr: 0.18s`), quindi è un'infrazione di igiene del design system più che un difetto visibile.

**Severità:** Bassa — nessun impatto percepibile, ma stessa famiglia di gap del gate: lo script controlla solo `shB:`/`shC:`/`shI:` object hardcoding, non `transition:` inline.

---

## 5. Cosa funziona bene (confermato visivamente, non solo dal codice)

**Rainbow semantic colors (KpiCard, StatoBadge)** — confermato in `dashboard-390-dark.png`/`dashboard-1280-dark.png`: "52 In ritardo" in ambra, "5 Da fatturare" in verde, "36.185€ crediti" in rosso, tutti leggibili e distinti su sfondo flat scuro. `StatoBadge.tsx` mappa correttamente ogni stato lavoro a `--c-blue/-amber/-orange/-green/-red` con background rgba coerente — implementazione pulita, nessuna hex literal fuori dai fallback var().

**Playfair Display sui KPI** — confermato: `fontFamily: 'Playfair Display, Georgia, serif'`, 38px/300 weight, esattamente come da spec (§6 tipografia). Applicato solo ai numeri KPI, mai al body text — corretto.

**Tasto+ fisico** — `.ua-tasto-plus` in `globals.css:1377-1426` implementa fedelmente la spec §8 (bezel, corona `::before`, stati `:active`/`[aria-current]`, variante dark con `radial-gradient`). Confermato visivamente in tutti gli screenshot con bottom nav, sia light che dark: il pulsante centrale rosso ha il rilievo fisico corretto in entrambi i temi.

**Dark mode flat (stile admin)** — confermato sistematicamente su Dashboard, Clienti, Fatture, Impostazioni, Magazzino: nessuna shadow raised visibile in dark, card leggermente più chiare del bg (`--sfc` su `--bg`), esattamente come da regola "✅ Dark mode = flat admin style". Nessuna delle pagine testate mostra shadow neumorfiche residue in dark.

**Empty states** — Fatture, Magazzino, Qualità: testo diretto, nessuna emoji mista (contrariamente a quanto flaggato nell'audit precedente su LavoroCard swipe actions, non ri-verificato qui ma non riscontrato nelle pagine testate), CTA chiare ("+ Aggiungi articolo", "Crea il primo lavoro →").

**Tipografia DM Sans** — confermato ovunque, incluso hardcoded `fontFamily: "'DM Sans', system-ui, sans-serif"` in `qualita/page.tsx` su ogni elemento di testo — verboso ma coerente, zero occorrenze di Inter trovate in tutto `src/` (il grep intercetta solo falsi positivi come "Internal"/"interval"/"Interessati").

---

## 6. Portale dentista — non verificato live, evidenza solo statica

`src/app/portale/[token]/page.tsx` contiene **34 occorrenze di hex hardcoded non-fallback** — il numero più alto di qualsiasi file della codebase. Non è stato possibile ottenere un token di portale valido senza interagire ulteriormente con la sessione condivisa (rischio di interferire con il processo E2E in corso). Questo file merita un audit dedicato di follow-up con un token isolato/dedicato, non condiviso con altre sessioni di test.

---

## Punteggio dettagliato

| Categoria | Punteggio | Nota |
|---|---|---|
| Design System Compliance (misurata, non dichiarata) | 86/100 | Login WCAG-fail + 2 violazioni sopravvissute in qualità, entrambe invisibili al gate |
| Typography | 100/100 | DM Sans + Playfair confermati ovunque |
| Shadows & Elevation | 96/100 | Dark flat perfetto sulle pagine testate; nessuna nuova issue |
| Rainbow semantic colors | 98/100 | KpiCard/StatoBadge implementazione pulita e confermata visivamente |
| Dark Mode | 90/100 | Ottimo su Dashboard/Clienti/Fatture/Impostazioni/Magazzino; qualità non verificabile live (dati vuoti + drift sessione); login dark è invece corretto (solo il light ha il bug) |
| Motion/Animazioni | 92/100 | Nuovo gap minore: transition CSS inline non-token in 7-8 file Dashboard V2 |
| Enforcement/Gate automatico | 70/100 | `check-ds-compliance.sh` ha 3 blind spot concreti e riproducibili: scope esclude `.css` e route fuori `(app)`, non rileva colori indiretti via lookup object, non rileva `--cobalt` non definito |
| Accessibilità (WCAG contrasto) | 75/100 | Violazione reale e visibile sul login; resto dell'app conforme |

**Punteggio complessivo: 8.8/10**

---

## Raccomandazioni prioritarie

**P0 — Immediato (rompe la promessa "100% v2.3" nel punto più visibile dell'app):**
1. `src/app/globals.css:245-246` — sostituire `--ua-t2:#96918D` → `#4A3D33`, `--ua-t3:#B8B3AE` → `#6B5C51` nel blocco `.login-root[data-login-theme="light"]`. Effort: 2 minuti. Impatto: fix WCAG su login/forgot-password/reset-password/billing/blocked in un colpo solo (variabili condivise).
2. `src/app/(app)/qualita/page.tsx:21` — sostituire `lieve: 'var(--gold, #D4A843)'` → `'var(--c-amber, #F59E0B)'` (coerente con l'uso già presente altrove nello stesso file per `moderata`/`azione_correttiva`).
3. `src/app/(app)/qualita/page.tsx:312` (+ `LavoroCard.tsx:682`, `ToastNotifiche.tsx:26`, `OdontogrammaFDI.tsx` ×5) — sostituire `var(--cobalt, #1B2D6B)` → `var(--c-blue, #3B82F6)` oppure definire `--cobalt` in `globals.css` se si vuole preservare il colore navy per "Segnalato Ministero" come categoria distinta dal blue rainbow generico.

**P1 — Prossimo sprint:**
4. Estendere `scripts/check-ds-compliance.sh`: aggiungere `src/app/globals.css` e le route fuori da `(app)` (login, billing, portale, richiedi) allo scope; aggiungere un controllo per variabili CSS referenziate ma mai dichiarate (`--cobalt`, `--gold-old`, ecc.) via confronto tra `grep -oh 'var(--[a-z-]*'` e le dichiarazioni effettive in `:root`/`.dark`.
5. `src/app/globals.css` billing block — sostituire i 5 hex letterali di `.ua-btn-gold`/`.ua-plan-card`/`.ua-plan-badge`/`.ua-rete-info-title` con `var(--gold, #D4A843)` (minimo, per rispettare la REGOLA ZERO anche se il valore resta invariato).
6. Audit dedicato di `portale/[token]/page.tsx` con token isolato (34 hex hardcoded, il file più denso della codebase).

**P2 — Igiene, non urgente:**
7. Migrare i `transition: '...Xs...'` inline nei componenti Dashboard V2 (KpiCard, TaskItem, DashboardShell, DashboardTitolare, DashboardFrontDesk, SyncBadge, UserProfileSheet) a `var(--tr)` o token `motion.ts`.
8. Valutare se le variabili "legacy" (`--gold`, `--amber`, `--info`, `--warning`, `--purple`, `--success:#16A34A`, `--urgente`) vadano deprecate esplicitamente o formalmente incluse in `tokens.ts` — oggi vivono solo in `globals.css` con un commento "legacy" che contraddice lo status di "unica fonte di verità" di `tokens.ts`.

---

## Conclusione

Il lavoro di rollout v2.3 sulle pagine ricostruite per V1.9 (Dashboard, Clienti, Fatture, Impostazioni, Magazzino) è di qualità alta e visivamente confermato in entrambi i temi: rainbow KPI, Playfair Display, tasto+ fisico e dark mode flat sono tutti implementati correttamente e coerenti con la spec. Il claim "100%", però, non regge alla verifica: sopravvive un bug WCAG reale e visibile sulla pagina più trafficata dell'app (login), e il file esplicitamente citato come "fixato" (`qualita/page.tsx`) porta ancora due violazioni dell'anti-pattern list — non per negligenza, ma per due limiti di scope precisi e riproducibili nello script di enforcement automatico, che vale la pena chiudere prima del prossimo giro di audit.

**Limite di questo audit da segnalare a Francesco**: la sessione di produzione condivisa con un processo E2E automatico in corso ha impedito la copertura fotografica completa a 3 viewport per `lavori` e `qualita` in dark mode, e ha reso impossibile un test live del portale dentista. Si raccomanda di eseguire il prossimo audit visivo con un ambiente/token isolato dal test E2E schedulato.

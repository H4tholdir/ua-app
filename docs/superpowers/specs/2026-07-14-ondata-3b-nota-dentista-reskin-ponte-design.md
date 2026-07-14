# Ondata 3b (slice) — Nota del dentista + reskin form ponte a v3 — Design

> **Data:** 2026-07-14 · **Owner:** Francesco · **Contesto:** DS v3 «Il cuore», chiusura deferiti della scheda lavoro (backlog O6a + O6j parziale).
> **Stato:** design approvato in brainstorming (2 review specializzate integrate: solution-architect + frontend-ui-builder).

---

## 0. Scope e decomposizione

«Ondata 3b» nel backlog raggruppava 4 pezzi eterogenei. Dopo brainstorming, lo scope di **questa** slice è deliberatamente ristretto a due pezzi a basso rischio, con gli altri deferiti come task dedicati:

| Pezzo | In questa slice? | Note |
|---|---|---|
| **P1 — `note_dentista`** (colonna + compilazione dal portale + display read-only) | ✅ SÌ | schema additivo + portale + scheda + buono |
| **P4 — reskin form ponte `/lavori/[id]/modifica` a v3** | ✅ SÌ | reskin, NON rebuild |
| **P3 — rebuild nativo dei flussi ⋯ pesanti** | ❌ DEFER (YAGNI) | flussi usati molto meno della scheda; il ponte reskinnato basta |
| **P2 — N4 fonte di verità del prezzo** | ❌ DEFER (task fiscale GRANDE dedicato) | bug fiscale reale (portale 322€ / fattura 112€), non bloccante su DB di test |
| **Chat portale WhatsApp** (dentista↔lab) | ❌ Feature futura | decisa il 07/07: vive SOLO nel portale, probabilmente su tabella `messaggi`. `note_dentista` è la «riga», non la chat, e non ci si sovrappone. |

**Perché questa slice:** hai scelto B per momentum + chiudere la cucitura visibile (form v2.3 dentro un flusso v3). Questa è la fetta più economica e a basso rischio che raggiunge quel goal e consegna valore utente (nota del dentista pulita e attribuita).

---

## 1. P1 — Nota del dentista

### 1.1 Problema attuale
`POST /api/portale/richiedi` (`src/app/api/portale/richiedi/route.ts`) crea un lavoro `ricevuto` e **stipa tutto in `lavori.note_interne`** come stringa pipe-delimited:

```
note_interne = "RICHIESTA_DENTISTA | Paz: MR-2026 | Note: colore A2"
```

- `RICHIESTA_DENTISTA` = marcatore d'origine — **DUE consumatori** (vedi §1.4);
- `Paz: MR-2026` = codice-paziente GDPR-safe (no PHI) fornito dal dentista; il lab lo usa per assegnare poi `paziente_id` (che resta `null` finché il lab non lo fa a mano);
- `Note: colore A2` = la vera nota clinica del dentista.

Nella scheda-vista v3 (`SchedaLavoroV3`), `note_interne` è mostrata come «Nota (laboratorio)» → per i lavori da portale il lab vede la stringa tecnica **mislabellata come nota propria**, e la nota del dentista non è né attribuita né separabile.

### 1.2 Modello dati — migration additiva su `lavori`
| Colonna | Tipo | Uso |
|---|---|---|
| `note_dentista` | `TEXT NULL` | nota clinica del dentista. Read-only nella scheda, attribuita al dentista (componente DS `NotaDentista`). |
| `da_portale` | `BOOLEAN NOT NULL DEFAULT false` | marca origine-portale. Sostituisce l'hack `note_interne LIKE 'RICHIESTA_DENTISTA%'` per rate-limit **e** attribuzione. |
| `paziente_codice_richiesta` | `TEXT NULL` | codice-paziente del dentista (oggi `Paz: X`). Visibile al lab finché non assegna `paziente_id`; resta come audit trail. |

**Invarianti:** additive, nullable/default → nessun impatto RLS (ereditano la policy di `lavori`); nessuna in `PATCHABLE_FIELDS` del lab (sono del dentista/di sistema, read-only per il laboratorio — coerente col pattern `proposta_dentista` D7). Nessuna bonifica del pregresso (DB di test).

**FASE 6b obbligatoria:** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → `npx tsc --noEmit`.

### 1.3 Flusso richiesta portale (write path)
`POST /api/portale/richiedi` dopo la migration:
- `note_dentista ← body.note` (trim, max 500);
- `da_portale ← true`;
- `paziente_codice_richiesta ← body.paziente_codice` (trim, max 40, no PHI);
- `note_interne` → **resta vuota/null** (libera per il lab);
- rate-limit: da `note_interne LIKE 'RICHIESTA_DENTISTA%'` a `WHERE da_portale = true AND created_at >= now()-24h` (max 10/24h per cliente). Falso-negativo sui legacy = innocuo (limite leggermente più permissivo, mai più restrittivo).

### 1.4 🔴 Consumatore #2 del marcatore (BLOCCANTE — nella stessa PR)
`src/hooks/useRealtimeNotifiche.ts` fa scattare la notifica realtime «nuovo lavoro dal dentista» **solo** se `nuovo.note_interne?.startsWith('RICHIESTA_DENTISTA')` (per ruoli `titolare`/`front_desk`). Svuotare `note_interne` senza aggiornare l'hook → **il lab smette silenziosamente di ricevere la notifica delle nuove richieste dal portale** (si rompe il cuore della feature).

**Fix:** cambiare la condizione in `payload.new.da_portale === true`. **Verificare esplicitamente** che `da_portale` sia presente nel payload dell'INSERT Supabase Realtime (per gli INSERT arriva la riga completa; le colonne `BOOLEAN DEFAULT false` appena aggiunte sono proprio dove capitano sorprese — controllo obbligatorio a runtime).

### 1.5 Display nella scheda (`SchedaLavoroV3`)
Il componente DS `NotaDentista` (già pronto) mostra `note_dentista` read-only, attribuita al dentista, **separata** dalla «Nota (laboratorio)» (`note_interne`, che resta tappabile/editabile dal lab). `NotaDentista` appare **solo se** `note_dentista` presente.

### 1.6 Buono di lavorazione (`BuonoTemplate`) — decisione Francesco: SÌ
`src/components/features/pdf/BuonoTemplate.tsx` stampa `note_interne` come «Note» sull'ordine di produzione. Dopo la migration `note_interne` è vuota per i lavori da portale → la nota clinica del dentista sparirebbe dal cartaceo d'officina. **Decisione:** il buono stampa `note_dentista` (attribuita al dentista) — informazione critica per il tecnico in reparto.
> Nota di scope confermata: la **DdC** (`DdcTemplate`) NON legge `note_interne` → il documento normativo resta pulito, nessun impatto MDR.

---

## 2. P4 — Reskin form ponte a v3 (reskin, NON rebuild)

### 2.1 La superficie
Dal menu ⋯ della scheda v3, 4 voci pesanti (Prezzi&lavorazioni/Dati clinici/Prove/Foto) navigano **a ponte** a `/lavori/[id]/modifica?tab=…`, che rende `LavoroFormClient` (form multi-tab v2.3) con prop `bridged` (sopprime CONSEGNA, tiene Salva). Fatti verificati: `LavoroFormClient` è usato **SOLO** dal ponte → reskin isolato, zero regressioni altrove. La pagina ponte wrappa già il form in `<div data-ds="v3">`.

### 2.2 Il vero problema (scoperto in review) — il punto di leva NON è `styles.ts`
`form/styles.ts` **consuma già CSS variables** (`var(--bg, #DDD8D3)`, `var(--t1, …)`, `raisedShadow = var(--sh-b, …)`): gli hex/gloss sono solo **fallback inattivi**. Le variabili sono definite in `globals.css` con valori v2.3. Conseguenza:
- `--bg` è ridefinita dallo scope v3 (`ds-v3.css`) → sfondo campi già vira. ✅
- `--t1/--t2` **NON** ridefinite dallo scope v3 (v3 usa `--ink/--muted/--faint`) → il form legge i testi v2.3 (in light quasi identico per fortuna).
- `--sh-b/--sh-i` **NON** ridefinite → risolvono ai valori v2.3 di `globals.css`: in light le gloss bandite dal Polish L1, **in dark shadow raised dove v3 vuole flat**. → **bug dark latente, mai visto (il form non è mai stato testato in dark).**

### 2.3 Leva corretta: aliasing di variabili sullo scope
Aggiungere in `ds-v3.css` un blocco su una classe dedicata (per non inquinare altri consumer), es. `[data-ds="v3"] .lavoro-form-v3 { … }`, che ridefinisce i nomi che il form già consuma:
- `--t1: var(--ink)` · `--t2: var(--muted)` · `--t3: var(--faint)`
- `--sh-b: var(--sh-card)` · `--sh-i:` inset v3 in light, `none`/inset leggero in dark
- bordo `rgba(0,0,0,.06)` di `inputBase` → `var(--line)`

Così colori+ombre virano per **tutti i tab in entrambi i temi in un blocco**, e il bug dark è auto-corretto. `LavoroFormClient` (o il wrapper del ponte) applica la classe `.lavoro-form-v3`.

### 2.4 Il vero lavoro: sweep del font (imperativo)
`fontFamily: 'DM Sans, sans-serif'` è un letterale che **batte per specificità** il `font-family` dello scope → il font NON vira da solo. È in `styles.ts` (5×) **e sparso inline nei tab** (TabAccettazione ~15, TabDati, TabDate, `LavoroFormShell` 3, TabProve, ecc. — decine). Sweep meccanico: sostituire ogni letterale con `var(--font-v3, …)` (o rimuovere le righe `fontFamily` inline e lasciar cascare lo scope). Questa è la parte laboriosa (non i colori).

### 2.5 Altri fix del reskin
- `LavoroFormShell`: barra tab **oro** → styling tab v3 (nessun oro, stato attivo/inattivo v3).
- `:focus-visible` ring (oggi `inputBase` ha `outline:none` → violazione WCAG 2.4.7). Richiede una classe scoped.
- touch target ≥44px (input a `padding:12px`+font 15px ≈ 43px → alzare).
- bordo dark (`rgba(0,0,0,.06)` quasi invisibile in dark → `var(--line)`).

### 2.6 Confini espliciti (per non sconfinare in P3)
NON cambiare struttura/markup del form; NON sostituire i field con i componenti DS v3; NON toccare la logica (field/autosave/salva/`bridged`). Solo estetica, al layer variabili+font+chrome. **Minimizzare il lavoro buttato** al futuro rebuild: agire su `ds-v3.css` (1 blocco) + sweep font + focus/border/tab; niente investimento *dentro* il markup dei tab.

---

## 3. Verifica, gate, isolamento

- **FASE 3 (arch):** migration additiva → nessun impatto RLS; API contract solo server-side (richiedi, hook realtime, display, buono) → nessun client esterno rotto; rollback = drop delle 3 colonne.
- **FASE 5 (isolamento):** worktree dedicato (`worktree-ondata-3b-nota-reskin`), copia `.env.local`, baseline test verificata.
- **FASE 6 (TDD):** vedi §4.
- **FASE 6b:** `gen types` + `tsc --noEmit` dopo la migration.
- **FASE 7:** `tsc --noEmit` + `vitest run` + `next build`, output reale.
- **FASE 9b — Gate estetico L2:** potato alle ~6 sezioni che un reskin può regredire (tipografia, colore/contrasto, elevazione/ombre, **parità dark**, focus states, touch target); **matrice dark × 3 viewport (390/768/1280) non negoziabile**; screenshot before/after **incluso dark** in `docs/design/screenshots/2026-07-14-ondata-3b/`.
- **QA browser:** lab E2E `00000000-0000-0000-0000-000000000001`, **MAI lab Filippo**; scenario: richiesta dal portale → verifica 3 colonne + `note_interne` vuota + notifica realtime arriva + `NotaDentista` nella scheda + buono con la nota; cleanup DB a baseline esatto.

---

## 4. TDD — casi di test

1. `POST /api/portale/richiedi` scrive `note_dentista`/`da_portale=true`/`paziente_codice_richiesta` e lascia `note_interne` null/vuota.
2. Rate-limit conta su `da_portale = true AND created_at` (≥10 → 429).
3. `useRealtimeNotifiche` fa scattare la notifica su `da_portale === true` (**regressione: prova a fallire senza il fix**, con `note_interne` vuota).
4. `SchedaLavoroV3` monta `NotaDentista` solo se `note_dentista` presente, separata dalla nota lab.
5. `BuonoTemplate` include `note_dentista` (content-check sul PDF).
6. `note_dentista`/`da_portale`/`paziente_codice_richiesta` **rifiutate** dalla PATCH-allowlist lavori (immutabili dal lab).

---

## 5. Inventario file (atteso)

**Dati/backend:**
- migration `supabase/migrations/<ts>_note_dentista_da_portale.sql` (3 colonne additive).
- `src/types/database.types.ts` (rigenerato, FASE 6b).
- `src/app/api/portale/richiedi/route.ts` (write path + rate-limit).
- `src/hooks/useRealtimeNotifiche.ts` (🔴 detection su `da_portale`).
- `src/app/api/lavori/[id]/route.ts` (verifica: le 3 colonne NON in allowlist).

**Frontend:**
- `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` (monta `NotaDentista` da `note_dentista`).
- `src/components/features/pdf/BuonoTemplate.tsx` (stampa `note_dentista`).
- `src/app/ds-v3.css` (blocco scoped `.lavoro-form-v3` — aliasing variabili).
- `src/components/features/lavori/form/styles.ts` (sweep font).
- `src/components/features/lavori/form/LavoroFormShell.tsx` + tab (sweep font + tab v3 + focus + classe `.lavoro-form-v3`).
- `src/app/(app)/lavori/[id]/modifica/page.tsx` / `LavoroFormClient.tsx` (applicare la classe `.lavoro-form-v3` al wrapper).

**BP-1 (fine lavoro):** MEMORY.md + ROADMAP-UFFICIALE.md.

---

## 6. Deferiti tracciati (non in questa slice)
- **P3** rebuild nativo flussi pesanti (YAGNI) → BACKLOG O6j.
- **P2/N4** fonte di verità del prezzo → task fiscale GRANDE dedicato → BACKLOG N4.
- **Chat portale** dentista↔lab (su `messaggi`) → feature futura.

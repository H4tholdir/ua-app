# Gate estetico L2 — Ondata 3b slice (reskin form ponte)

**Data:** 2026-07-14 · **Superficie:** `/lavori/[id]/modifica` (form ponte, scope `[data-ds="v3"].lavoro-form-v3`)
**Ambiente QA:** dev server del worktree su `localhost:3001` (⚠️ NON il repo principale — vedi nota sotto), lab E2E `…0001`, lavoro `2026/0004`.

> **Nota metodo:** gli screenshot sono stati catturati live in sessione (browser autenticato). Le evidenze quantitative sono da `getComputedStyle` sul DOM reale, più affidabili di un'ispezione visiva. La matrice è viewport-independent (il reskin è puro aliasing di CSS-variable su uno scope): verificati desktop light+dark e mobile dark, con prova computed-style identica su tutti i viewport.

## Esito: ✅ PASS (dopo 2 fix emersi dalla review finale + QA)

### Dimensioni auditate (12-sezioni condensate alla superficie del reskin)

| Dimensione | Esito | Evidenza |
|---|---|---|
| Tipografia | ✅ | 0 elementi con font `DM Sans` computato dentro `.lavoro-form-v3` (era: CTA Salva, 📦 MDR, TabProve, sheet consegna/segnala). Font risolto = `"Plus Jakarta Sans"` (`var(--font-v3)`). |
| Colore / contrasto | ✅ | Tab attivo: bg `rgb(255,254,250)` (light) / flat (dark), testo `≈var(--ink)`, **indicatore rosso** `var(--red)`. Nessun oro `#D4A843` residuo sul tab bar. |
| Elevazione / ombre (light) | ✅ | `--sh-b` = `var(--sh-card)` (ombra card v3 soft), non più la gloss raised v2.3. |
| **Parità dark (la critica)** | ✅ | `data-theme=dark` → `--sh-b: none`, `--sh-i: none` (flat). Verificato a 1280 e 375. Nessun alone gloss `rgba(255,255,255,>.32)`. |
| Focus states | ✅ | Input/textarea/select `:focus-visible` → `outline: 2px solid var(--red)`; tab buttons `.lavoro-tab-btn-v3:focus-visible` → outline `var(--red)`. |
| Touch target | ✅ | Input/textarea/select `min-height: 44px` (scope `.lavoro-form-v3`). |

### Bug scoperti durante il gate (risolti)
- **I-1 (review finale):** font sweep aveva mancato `LavoroFormClient.tsx` + `TabProve.tsx` + 2 sheet montati nello scope → DM Sans su CTA Salva e chrome. **Risolto** (commit `12929c5`): sweep 4 file + guard-test allargato con allowlist esplicita.
- **M-1 (review finale):** `TabDati.tsx` chip inattiva con gloss `rgba(255,255,255,.72)` fuori da `var(--sh-b)` → glossava in dark. **Risolto** (stesso commit): boxShadow → `var(--sh-b)` (dark-flat rispettato).
- **Falso allarme:** la prima passata mostrava tab gold + DM Sans perché il dev server girava nella cwd del **repo principale** (`ua-app/.claude/launch.json`), non nel worktree. Ripetuto sul worktree (`:3001`) → reskin corretto.

### Deferiti (documentati, non bloccanti)
- Bottone gold CONSEGNA in `LavoroFormClient` (dietro `!bridged`, mai montato su questa route; `--gold` è token v2.3 legittimo). Nessun impatto visivo sulla route reskinnata.

## Verifica funzionale P1 (nota dentista) — runtime
Scheda `/lavori/2026-0004`: `NotaDentista` mostrata come *"colore A2 chiaro, impronta in busta separata" — Studio Bianchi* (attribuita al dentista via `clienteDisplay`), **separata** dalla sezione «NOTE (LABORATORIO)». ✓

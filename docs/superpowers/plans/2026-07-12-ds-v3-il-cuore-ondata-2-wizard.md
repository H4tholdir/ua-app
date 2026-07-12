# DS v3 «Il cuore» — Ondata 2: Wizard nuovo lavoro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il form multi-tab di `/lavori/nuovo` col wizard v3 a 3 tocchi (dentista → tipo → «Fotografa impronta e prescrizione»), fedele al mockup `wizard.html` approvato, con la tassonomia granulare dei 38 tipi ratificata da Francesco al gate spec del 12/07 (spec §2.1).

**Architecture:** Route `/lavori/nuovo` riscritta (D3, architettura A): la RSC carica server-side dentisti+frequenze+prossimo PZ+tempi medi e monta il client component `WizardNuovoLavoro` coi passi come stato interno + localStorage 24h. Unica migration: macro `bite_splint` additivo al CHECK (D1-ter). Zero API nuove: il wizard compone `POST /api/lavori` + `PATCH /api/lavori/[id]` + `GET/POST /api/pazienti` + `POST /api/clienti` + `POST /api/lavori/[id]/immagini` (tutte esistenti). In-ondata anche B2 (validazione enum → 422) e B4 (consolidamento mappe label in `tipi-lavoro.ts`).

**Tech Stack:** Next.js 16 App Router (RSC + client components) · Supabase (`getServiceClient`) · Motion 12 (`molla` da `v3/motion.ts`) · Vitest + Testing Library (jsdom, test in `tests/unit/`).

## Global Constraints

- **Spec (APPROVATA, gate chiuso):** `docs/superpowers/specs/2026-07-12-ds-v3-il-cuore-ondata-2-wizard-design.md` — il §2.1 è il verbale delle decisioni di Francesco, vincolante. **Legge madre:** `2026-07-07-design-system-v3-una-cosa-alla-volta.md` v3.1 (§7.3 emendata al Task 1, §5.12/§5.13/§5.15/§5.16/§5.27/§5.31/§5.32).
- **Fonte di verità visiva:** SOLO `docs/design/mockups/2026-07-09-il-cuore/wizard.html` + `_base.css`. I valori CSS si copiano da lì, non si reinterpretano. Percorso minimo **3 tocchi** (deviazione B7-2 ratificata): tile dentista → tile tipo → TastoPrimario «Fotografa impronta e prescrizione». Il Passo 3 è interamente opzionale.
- **Tassonomia (spec §3):** il wizard scrive `tipo_dispositivo` = macro-slug (10 valori, CHECK a DB) · `descrizione` = label granulare · `classe_rischio` = default del tipo. Il testo libero («Descrivilo») produce SOLO `macro:'altro'` + descrizione, mai tipi nuovi, mai conteggi nel top-4.
- **Token only:** colori/ombre/raggi/tipografia da `src/design-system/v3/tokens.ts`; animazioni SOLO `molla`/`cssEase` da `src/design-system/v3/motion.ts`; suoni `suona()` da `v3/sound.ts` (solo post-mount), haptic `vibra()` da `v3/haptic.ts`. MAI hex inline.
- **Pattern pagina v3:** page-root con `data-ds="v3"` e `background: var(--bg)` dipinto INLINE sul root + elemento `.ds-grana` (pattern Ondata 1, vedi `src/app/(app)/tutto-il-resto/page.tsx`).
- **GDPR:** il default paziente è il codice `PZ-…`; l'alias (A8) è opt-in e non compare MAI nei messaggi WhatsApp né nelle pile.
- **Dizionario §2.3:** mai «dashboard», «form», «loading»… nel copy UI. Copy del wizard verbatim dal mockup.
- **A11y:** `aria-label` sui ProgressDots («Passo N di 3»), nomi accessibili sui tasti icona (‹ «Indietro»), focus-trap negli Sheet (già nel componente), touch target ≥44px, `prefers-reduced-motion` → crossfade 150ms (coreografie §8.3.3/§8.4).
- **Ruoli:** `titolare`, `tecnico`, `front_desk`, `admin_rete` (MAI `admin`).
- **FASE 3 (BP-2) — dichiarata in spec §12:** UNA migration additiva (Task 3, FASE 6b obbligatoria, apply SOLO con conferma esplicita di Francesco via `npx supabase db push` — MAI MCP `apply_migration`) · zero API nuove · nessun payload cambia per client esistenti · rollback = revert (CHECK a 10 valori innocuo anche orfano).
- **Worktree dedicato** (FASE 5): `ondata-2-wizard`. Copiare `.env.local` nel worktree. Prima di OGNI commit: `git rev-parse --show-toplevel` + `git branch --show-current` (lezione incidenti portale).
- **Commit format:** `feat(wizard): …` · `feat(db): …` · `feat(ds): …` · `docs(ds): …` — un commit per task minimo.
- **Verifica per task:** `npx vitest run` (baseline **1373 pass | 4 skipped**) + `npx tsc --noEmit`. FASE 7 completa (`npx next build` incluso) al Task 14.
- **QA finale** su lab E2E `00000000-0000-0000-0000-000000000001` — MAI il lab reale di Filippo/Francesco. Dev server del worktree con `PORT=3013 npm run dev` DENTRO il worktree (gotcha preview_start).
- **Firme dei componenti ds:** prima di invocare un componente di `src/components/ds/`, leggere la firma REALE nel file e l'uso nel catalogo `src/app/ds-v3-catalogo/page.tsx`. Firme già verificate per questo piano: `TileScelta{nome, sotto?, avatar?, glifo?, onClick}` · `TileNuovo{etichetta, onClick}` · `RigaCerca{totale, cosa, onApri}` · `CampoTesto{label, valore, onCambia, placeholder?, autoFocus?}` · `CampoData{label, valore: Date|null, onCambia:(v:Date)=>void, oggi?: Date}` · `Sheet{aperto, onChiudi, titolo?, children}` · `TastoPrimario{children, onClick?, disabled?, motivoDisabilitato?, type?}` · `TastoSecondario{children, onClick?, disabled?, type?}` · `TastoTondo{glifo, etichettaAria, onClick?}` · `LinkQuieto{children, onClick?, href?}` · `PillVoce{onTesto:(testo:string)=>void, etichetta?}` · `useAvvisi() → {avvisa, errore}` (dentro `AvvisiProvider`).
- **Carry-over di progetto:** `varV3('card')` mai `varV3('sfc')` · suoni solo post-mount · `minWidth: min-content` per colonne testo+pill.

## Decisioni di piano (derivate da spec approvata + mockup)

| # | Decisione | Fonte |
|---|---|---|
| W1 | **Ordine task: dominio → migration → wizard.** La tassonomia (Task 2) definisce il type esteso; la migration (Task 3) apre il CHECK PRIMA che qualunque UI possa scrivere `bite_splint`; solo dopo si consolidano le mappe (Task 4) e si costruisce la UI. | spec §4 |
| W2 | **`ChipScelta` si ESTRAE dalle pill interne di `CampoData`** (stessa anatomia §5.31): CampoData viene rifattorizzato per consumarla — un solo posto per l'anatomia, i test esistenti di CampoData restano verdi. | legge §5.31 «anatomia copiata verbatim» |
| W3 | **Lo stato del wizard vive in un solo client component** (`WizardNuovoLavoro`); i passi sono rami di render, la scivolata §8.3.3 è una coreografia Motion su `transform/opacity`. Nessuna sub-route, nessun searchParams (D3). | spec §5 |
| W4 | **La RSC risolve la cascata tempi-medi server-side**: al client arriva `giorniPerTipo: Record<tipoId, {giorni, daStoria}>` già risolto — il client non conosce la cascata. | spec §8 |
| W5 | **La ricerca dentisti è client-side** sulla lista completa `{id, label, count30}` caricata dalla RSC (lab tipico < 100 clienti; l'API `GET /api/clienti` resta non usata qui). Ricerca contains accent/case-insensitive condivisa con quella dei tipi (`normalizza()` in `tipi-lavoro.ts`). | spec §6.1 |
| W6 | **Foto: `<input type="file" accept="image/*" capture="environment">`** sia al Passo 3 sia nella CTA del Fatto (D2); upload multipart `FormData{file, descrizione:'impronta'|'prescrizione'}` a `POST /api/lavori/[id]/immagini` (già FormData-based, verificato). Su desktop degrada a file picker: accettato (spec §15). | spec D2 |
| W7 | **Convenzione date:** il wizard usa gli helper già esportati da `Campo.tsx` (`inizioGiorno`, `aggiungiGiorni`, `stessoGiorno`) e `Date` locale come le pile (nota O1b invariata — l'unificazione Rome è un task backlog, non si anticipa qui). | O1b |
| W8 | **`isV3MigratedRoute`**: `/lavori/nuovo` entra in `ROUTE_MIGRATE_V3` (match esatto). BottomNavPill e avatar si ritirano automaticamente (consumer già cablati, Ondata 1). | spec §5 |
| W9 | **Il vecchio form resta per la modifica:** si tocca SOLO `src/app/(app)/lavori/nuovo/page.tsx` (+ error/loading). `LavoroFormShell`/`TabDati` NON si cancellano (li usa `/lavori/[id]` fino a Ondata 3); `TabDati.TIPO_OPTIONS` migra all'import da `tipi-lavoro.ts` (B4). | spec §1 |

---

### Task 1: Emendamento legge madre §7.3 (docs)

**Files:**
- Modify: `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` (sezione §7.3, righe ~320-324; header versione)

**Interfaces:**
- Produces: la legge emendata che tutti i task successivi citano (§7.3 rev. 3.2).

- [ ] **Step 1: Emendare §7.3**

Sostituire il testo di §7.3 con (contenuti — adattare la prosa allo stile della legge, conservando i riferimenti di sezione):

- Passi: **1 Dentista → 2 Tipo lavoro → 3 Paziente e dettagli (tutto opzionale) → Fatto.** Percorso minimo **3 tocchi**: tile dentista → tile tipo → TastoPrimario «Fotografa impronta e prescrizione» (rev. 3.2 — il piano Ondata 0 ne contava 4 col chip «Va bene ✓», rimosso su advisor UX, deviazione B7-2 ratificata 12/07).
- Ogni passo: back + ProgressDots (§5.32) + domanda (token `question` 35/800) + hint + griglia/`RigaCerca` + PillVoce.
- **Passo 2 = tassonomia granulare** (spec Ondata 2 §3): i tile mostrano i TIPI GRANULARI (`tipi-lavoro.ts`, 38 voci in 10 famiglie macro, ordinati per frequenza 30gg del lab); la macro resta il dominio di `lavori.tipo_dispositivo`; `descrizione` = label granulare; classe di rischio default per tipo.
- "Fatto!": check grande + riepilogo + **consegna suggerita RISOLTA** (riga informativa + LinkQuieto «Cambia data» → sheet con ChipScelta §5.31 + CampoData §5.27) + TastoPrimario «Fotografa impronta e prescrizione» + LinkQuieto home. NIENTE chip di scelta sulla vista (L1: una decisione).
- Abbandono: stato in localStorage 24h; alla riapertura sheet «Riprendo da dove eri? / Ricomincia da capo» (frame 5 mockup).

Aggiornare l'header della legge («IN VIGORE — rev. 3.2») e la riga di changelog se presente.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md
git commit -m "docs(ds): emenda legge §7.3 — wizard 3 tocchi, consegna risolta, tassonomia granulare (rev. 3.2)"
```

---

### Task 2: Dominio — `bite_splint` nel type + tassonomia `tipi-lavoro.ts` (TDD)

**Files:**
- Modify: `src/types/domain.ts:203-212` (union `TipoDispositivo`: + `'bite_splint'` prima di `'altro'`)
- Create: `src/lib/domain/tipi-lavoro.ts`
- Test: `tests/unit/tipi-lavoro.test.ts`

**Interfaces:**
- Produces (consumate dai Task 4-12):
  - `type TipoLavoro = { id: string; tile: { riga1: string; riga2?: string }; aliases: string[]; macro: TipoDispositivo; classeRischio: ClasseRischio; giorniFallback: number }`
  - `const TIPI_LAVORO: TipoLavoro[]` (38 voci, ordine canonico = ordine tabella spec §3.2)
  - `const LABEL_MACRO: Record<TipoDispositivo, string>` (10 label italiane — B4, unica fonte)
  - `const MACRO_SLUGS: TipoDispositivo[]` (i 10 valori — per la validazione B2)
  - `const CANONICI_DAY1: string[]` = `['corona_zirconia', 'corona_impianto', 'riparazione', 'provvisorio_resina']` (A4)
  - `function labelTipo(t: TipoLavoro): string` → `riga2 ? \`${riga1} ${riga2}\` : riga1` (es. «Corona zirconia» — è la stringa che va in `descrizione` e su cui si contano le frequenze)
  - `function normalizza(s: string): string` (lowercase + strip accenti via `normalize('NFD')`)
  - `function cercaTipiLavoro(query: string): TipoLavoro[]` (contains su `labelTipo + aliases + LABEL_MACRO[macro]`, normalizzato)
  - `function trovaTipo(id: string): TipoLavoro | undefined`

- [ ] **Step 1: Estendere l'union `TipoDispositivo`**

In `src/types/domain.ts`, aggiungere `| 'bite_splint'` dopo `| 'riparazione'` (prima di `'altro'`). Solo type-level: nessun runtime tocca ancora il valore (il CHECK a DB si apre al Task 3).

- [ ] **Step 2: Scrivere i test falliti**

`tests/unit/tipi-lavoro.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  TIPI_LAVORO, LABEL_MACRO, MACRO_SLUGS, CANONICI_DAY1,
  labelTipo, cercaTipiLavoro, trovaTipo, normalizza,
} from '@/lib/domain/tipi-lavoro'

describe('tipi-lavoro — tassonomia ratificata (spec §3.2)', () => {
  it('ha esattamente 38 tipi con id unici', () => {
    expect(TIPI_LAVORO).toHaveLength(38)
    expect(new Set(TIPI_LAVORO.map(t => t.id)).size).toBe(38)
  })

  it('ogni macro usato esiste in LABEL_MACRO e in MACRO_SLUGS (10 valori)', () => {
    expect(MACRO_SLUGS).toHaveLength(10)
    expect(MACRO_SLUGS).toContain('bite_splint')
    for (const t of TIPI_LAVORO) {
      expect(MACRO_SLUGS).toContain(t.macro)
      expect(LABEL_MACRO[t.macro]).toBeTruthy()
    }
  })

  it('i 4 tipi bite_splint sono Classe I, la protesi fissa è IIa (verbale A1/A2)', () => {
    const bite = TIPI_LAVORO.filter(t => t.macro === 'bite_splint')
    expect(bite).toHaveLength(4)
    for (const t of bite) expect(t.classeRischio).toBe('classe_i')
    expect(trovaTipo('corona_zirconia')?.classeRischio).toBe('classe_iia')
    expect(trovaTipo('provvisorio_impianto')?.classeRischio).toBe('classe_i') // eccezione ratificata
  })

  it('CANONICI_DAY1 sono i 4 ratificati (A4) e sono id validi', () => {
    expect(CANONICI_DAY1).toEqual(['corona_zirconia', 'corona_impianto', 'riparazione', 'provvisorio_resina'])
    for (const id of CANONICI_DAY1) expect(trovaTipo(id)).toBeDefined()
  })

  it('labelTipo compone le due righe del tile', () => {
    expect(labelTipo(trovaTipo('corona_zirconia')!)).toBe('Corona zirconia')
    expect(labelTipo(trovaTipo('riparazione')!)).toBe('Riparazione')
  })

  it('cerca per alias di gergo, tollerante ad accenti e maiuscole', () => {
    expect(cercaTipiLavoro('cappetta').map(t => t.id)).toContain('corona_zirconia')
    expect(cercaTipiLavoro('EMAX').map(t => t.id)).toContain('corona_disilicato')
    expect(cercaTipiLavoro('pa.pa.').map(t => t.id)).toContain('parziale_resina')
    expect(cercaTipiLavoro('michigan').map(t => t.id)).toContain('bite_michigan')
    expect(normalizza('Zirconià')).toBe('zirconia')
  })

  it('cerca anche per label macro («scheletrato» trova tutta la famiglia)', () => {
    const ids = cercaTipiLavoro('scheletrato').map(t => t.id)
    expect(ids).toEqual(expect.arrayContaining(['scheletrato', 'scheletrato_attacchi', 'scheletrato_slm', 'scheletrato_peek']))
  })

  it('query vuota restituisce tutto in ordine canonico', () => {
    expect(cercaTipiLavoro('')).toEqual(TIPI_LAVORO)
  })
})
```

- [ ] **Step 3: Run test → FAIL** (`npx vitest run tests/unit/tipi-lavoro.test.ts` → modulo inesistente)

- [ ] **Step 4: Implementare `src/lib/domain/tipi-lavoro.ts`**

Client-safe (niente `server-only`): lo consumano RSC, client component e API. La tabella è VERBATIM dalla spec §3.2 (ratificata A1 — non modificare valori). Struttura:

```ts
import type { TipoDispositivo, ClasseRischio } from '@/types/domain'

export type TipoLavoro = {
  id: string
  tile: { riga1: string; riga2?: string }
  aliases: string[]
  macro: TipoDispositivo
  classeRischio: ClasseRischio
  giorniFallback: number
}

// B4 (gate spec): UNICA fonte delle label macro — TabDati, portale, rischi,
// DdcTemplate importano da qui (Task 4). 10 valori = CHECK a DB (Task 3).
export const LABEL_MACRO: Record<TipoDispositivo, string> = {
  protesi_fissa: 'Protesi fissa',
  protesi_mobile: 'Protesi mobile',
  implantologia: 'Implantologia',
  cad_cam: 'CAD/CAM',
  scheletrato: 'Scheletrato',
  ortodonzia: 'Ortodonzia',
  provvisorio: 'Provvisorio',
  riparazione: 'Riparazione',
  bite_splint: 'Bite / splint',
  altro: 'Altro',
}
export const MACRO_SLUGS = Object.keys(LABEL_MACRO) as TipoDispositivo[]

// Tabella RATIFICATA (spec §3.2, verbale §2.1-A1): 38 voci, ordine canonico.
export const TIPI_LAVORO: TipoLavoro[] = [
  { id: 'corona_zirconia', tile: { riga1: 'Corona', riga2: 'zirconia' }, aliases: ['cappetta', 'monolitica', 'zirconio'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 5 },
  { id: 'corona_disilicato', tile: { riga1: 'Corona', riga2: 'disilicato' }, aliases: ['emax', 'e.max', 'litio', 'pressata'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'corona_metallo_ceramica', tile: { riga1: 'Corona', riga2: 'metallo-ceramica' }, aliases: ['vmk', 'ceramica su metallo'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 7 },
  { id: 'ponte_zirconia', tile: { riga1: 'Ponte', riga2: 'zirconia' }, aliases: ['ponte monolitico'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'faccetta', tile: { riga1: 'Faccetta' }, aliases: ['veneer', 'faccette'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'intarsio', tile: { riga1: 'Intarsio', riga2: 'onlay' }, aliases: ['inlay', 'overlay'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 4 },
  { id: 'perno_moncone', tile: { riga1: 'Perno', riga2: 'moncone' }, aliases: ['perno fuso'], macro: 'protesi_fissa', classeRischio: 'classe_iia', giorniFallback: 3 },
  { id: 'protesi_totale', tile: { riga1: 'Protesi', riga2: 'totale' }, aliases: ['dentiera', 'completa'], macro: 'protesi_mobile', classeRischio: 'classe_iia', giorniFallback: 8 },
  { id: 'totale_digitale', tile: { riga1: 'Totale', riga2: 'digitale' }, aliases: ['totale fresata', 'stampata'], macro: 'protesi_mobile', classeRischio: 'classe_iia', giorniFallback: 5 },
  { id: 'parziale_resina', tile: { riga1: 'Parziale', riga2: 'resina' }, aliases: ['pa.pa.', 'parziale'], macro: 'protesi_mobile', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'protesi_flessibile', tile: { riga1: 'Protesi', riga2: 'flessibile' }, aliases: ['nylon', 'valplast', 'morbida'], macro: 'protesi_mobile', classeRischio: 'classe_iia', giorniFallback: 7 },
  { id: 'duplicato_protesi', tile: { riga1: 'Duplicato', riga2: 'protesi' }, aliases: ['riserva', 'duplicazione'], macro: 'protesi_mobile', classeRischio: 'classe_iia', giorniFallback: 4 },
  { id: 'scheletrato', tile: { riga1: 'Scheletrato' }, aliases: ['parziale metallo', 'cromo'], macro: 'scheletrato', classeRischio: 'classe_iia', giorniFallback: 8 },
  { id: 'scheletrato_attacchi', tile: { riga1: 'Scheletrato', riga2: 'con attacchi' }, aliases: ['attacchi di precisione', 'fresaggi'], macro: 'scheletrato', classeRischio: 'classe_iia', giorniFallback: 10 },
  { id: 'scheletrato_slm', tile: { riga1: 'Scheletrato', riga2: 'laser (SLM)' }, aliases: ['laser melting', 'sinterizzato'], macro: 'scheletrato', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'scheletrato_peek', tile: { riga1: 'Scheletrato', riga2: 'PEEK' }, aliases: ['biohpp', 'metal-free'], macro: 'scheletrato', classeRischio: 'classe_iia', giorniFallback: 8 },
  { id: 'corona_impianto', tile: { riga1: 'Corona', riga2: 'su impianto' }, aliases: ['avvitata', 'cementata', 'ti-base'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 6 },
  { id: 'ponte_impianti', tile: { riga1: 'Ponte', riga2: 'su impianti' }, aliases: ['ponte avvitato'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 8 },
  { id: 'toronto', tile: { riga1: 'Toronto', riga2: 'full-arch' }, aliases: ['toronto bridge', 'arcata completa'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 12 },
  { id: 'barra_overdenture', tile: { riga1: 'Barra', riga2: 'overdenture' }, aliases: ['barra fresata'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 10 },
  { id: 'overdenture', tile: { riga1: 'Overdenture' }, aliases: ['su locator', 'su sfere'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 10 },
  { id: 'abutment', tile: { riga1: 'Abutment', riga2: 'personalizzato' }, aliases: ['moncone custom'], macro: 'implantologia', classeRischio: 'classe_iia', giorniFallback: 4 },
  { id: 'provvisorio_impianto', tile: { riga1: 'Provvisorio', riga2: 'su impianto' }, aliases: ['carico immediato'], macro: 'implantologia', classeRischio: 'classe_i', giorniFallback: 3 },
  { id: 'placca_espansione', tile: { riga1: 'Placca', riga2: 'con vite' }, aliases: ['espansore mobile'], macro: 'ortodonzia', classeRischio: 'classe_i', giorniFallback: 7 },
  { id: 'apparecchio_funzionale', tile: { riga1: 'Apparecchio', riga2: 'funzionale' }, aliases: ['bionator', 'twin block', 'monoblocco'], macro: 'ortodonzia', classeRischio: 'classe_i', giorniFallback: 10 },
  { id: 'contenzione', tile: { riga1: 'Contenzione' }, aliases: ['hawley', 'retainer', 'splintaggio'], macro: 'ortodonzia', classeRischio: 'classe_i', giorniFallback: 4 },
  { id: 'allineatori', tile: { riga1: 'Allineatori' }, aliases: ['mascherine', 'aligner'], macro: 'ortodonzia', classeRischio: 'classe_i', giorniFallback: 14 },
  { id: 'bite_michigan', tile: { riga1: 'Bite', riga2: 'rigido' }, aliases: ['michigan', 'placca dura'], macro: 'bite_splint', classeRischio: 'classe_i', giorniFallback: 4 },
  { id: 'bite_morbido', tile: { riga1: 'Bite', riga2: 'morbido' }, aliases: ['resiliente', 'notturno'], macro: 'bite_splint', classeRischio: 'classe_i', giorniFallback: 3 },
  { id: 'paradenti', tile: { riga1: 'Paradenti', riga2: 'sport' }, aliases: ['sportivo', 'mouthguard'], macro: 'bite_splint', classeRischio: 'classe_i', giorniFallback: 4 },
  { id: 'anti_russamento', tile: { riga1: 'Anti-', riga2: 'russamento' }, aliases: ['mad', 'avanzamento mandibolare'], macro: 'bite_splint', classeRischio: 'classe_i', giorniFallback: 7 },
  { id: 'provvisorio_resina', tile: { riga1: 'Provvisorio', riga2: 'resina' }, aliases: ['pmma', 'provvisori'], macro: 'provvisorio', classeRischio: 'classe_i', giorniFallback: 2 },
  { id: 'provvisorio_cad', tile: { riga1: 'Provvisorio', riga2: 'CAD' }, aliases: ['fresato', 'stampato', 'shell'], macro: 'provvisorio', classeRischio: 'classe_i', giorniFallback: 2 },
  { id: 'mockup', tile: { riga1: 'Mock-up', riga2: 'estetico' }, aliases: ['prova estetica', 'wax-up'], macro: 'provvisorio', classeRischio: 'classe_i', giorniFallback: 4 },
  { id: 'dima_chirurgica', tile: { riga1: 'Dima', riga2: 'chirurgica' }, aliases: ['guida chirurgica', 'mascherina'], macro: 'cad_cam', classeRischio: 'classe_i', giorniFallback: 5 },
  { id: 'modello_3d', tile: { riga1: 'Modello', riga2: '3D' }, aliases: ['modello stampato'], macro: 'cad_cam', classeRischio: 'classe_i', giorniFallback: 2 },
  { id: 'riparazione', tile: { riga1: 'Riparazione' }, aliases: ['rottura', 'frattura', 'aggiunta gancio', 'aggiunta elemento', 'saldatura'], macro: 'riparazione', classeRischio: 'classe_iia', giorniFallback: 1 },
  { id: 'ribasatura', tile: { riga1: 'Ribasatura' }, aliases: ['ribaso', 'rebase'], macro: 'riparazione', classeRischio: 'classe_iia', giorniFallback: 2 },
]

export const CANONICI_DAY1 = ['corona_zirconia', 'corona_impianto', 'riparazione', 'provvisorio_resina']

export function labelTipo(t: TipoLavoro): string {
  return t.tile.riga2 ? `${t.tile.riga1} ${t.tile.riga2}` : t.tile.riga1
}

export function normalizza(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function trovaTipo(id: string): TipoLavoro | undefined {
  return TIPI_LAVORO.find(t => t.id === id)
}

export function cercaTipiLavoro(query: string): TipoLavoro[] {
  const q = normalizza(query.trim())
  if (!q) return TIPI_LAVORO
  return TIPI_LAVORO.filter(t => {
    const pagliaio = [labelTipo(t), ...t.aliases, LABEL_MACRO[t.macro]].map(normalizza).join(' ')
    return pagliaio.includes(q)
  })
}
```

Nota conteggio: 7 fissa + 5 mobile + 4 scheletrato + 7 implanto + 4 orto + 4 bite + 3 provvisori + 2 cad_cam + 2 riparazione = 38.

- [ ] **Step 5: Run test → PASS** + `npx tsc --noEmit` pulito + suite intera verde (l'union estesa non deve rompere nulla: `bite_splint` è solo un valore in più)

- [ ] **Step 6: Commit**

```bash
git add src/types/domain.ts src/lib/domain/tipi-lavoro.ts tests/unit/tipi-lavoro.test.ts
git commit -m "feat(domain): tassonomia granulare 38 tipi di lavoro + macro bite_splint (spec Ondata 2 §3)"
```

---

### Task 3: Migration `bite_splint` — GATE Francesco + FASE 6b

**Files:**
- Create: `supabase/migrations/20260712230000_lavori_tipo_dispositivo_bite_splint.sql`
- Modify (rigenerato): `src/types/database.types.ts`

**Interfaces:**
- Produces: CHECK a DB a 10 valori — da qui in poi `bite_splint` è scrivibile. I Task 4-12 lo assumono applicato.

- [ ] **Step 1: Verificare il nome reale del constraint sul DB live**

Via MCP Supabase `execute_sql` (sola lettura):

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.lavori'::regclass AND contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%tipo_dispositivo%';
```

Atteso: un solo constraint (nome presumibile `lavori_tipo_dispositivo_check`) con i 9 valori. Usare il NOME REALE restituito nel file di migration. Verificare anche che nessuna RLS policy citi `tipo_dispositivo` (`SELECT polname FROM pg_policy WHERE polrelid='public.lavori'::regclass` + ispezione).

- [ ] **Step 2: Scrivere la migration**

```sql
-- Ondata 2 (spec 2026-07-12 §4, decisione D1-ter): macro nuovo bite_splint.
-- Additiva: i 9 valori esistenti restano validi, la validazione passa per costruzione.
ALTER TABLE lavori DROP CONSTRAINT lavori_tipo_dispositivo_check;
ALTER TABLE lavori ADD CONSTRAINT lavori_tipo_dispositivo_check
  CHECK (tipo_dispositivo IN (
    'protesi_fissa','protesi_mobile','implantologia','cad_cam','scheletrato',
    'ortodonzia','provvisorio','riparazione','bite_splint','altro'
  ));
```

(Sostituire `lavori_tipo_dispositivo_check` col nome reale dello Step 1 se diverso.)

- [ ] **Step 3: GATE — apply con conferma esplicita di Francesco**

**FERMARSI e chiedere a Francesco.** Solo dopo il suo sì: `npx supabase db push` (history-correct — MAI MCP `apply_migration`). Post-apply, verificare con la stessa query dello Step 1 che il constraint elenchi 10 valori.

- [ ] **Step 4: FASE 6b — rigenerare i types**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
# rimuovere l'eventuale riga CLI in fondo al file
npx tsc --noEmit   # atteso: pulito
npx vitest run     # atteso: baseline verde
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260712230000_lavori_tipo_dispositivo_bite_splint.sql src/types/database.types.ts
git commit -m "feat(db): CHECK lavori.tipo_dispositivo a 10 valori — macro bite_splint (FASE 6b)"
```

---

### Task 4: B4 consolidamento mappe label + B2 validazione enum 422 (TDD)

**Files:**
- Modify: `src/components/features/lavori/form/TabDati.tsx:47-57` (TIPO_OPTIONS → derivata da `LABEL_MACRO`)
- Modify: `src/components/features/portale/RichiestaClientForm.tsx:10-20` (idem, conservando le label descrittive del portale SE diverse — vedi Step 3)
- Modify: `src/app/(app)/qualita/rischi/page.tsx:20-33` + `src/app/(app)/qualita/rischi/[id]/page.tsx:11-…` + `src/components/features/pdf/DdcTemplate.tsx:220-…` (le tre `formatTipoDispositivo` locali → import `LABEL_MACRO`)
- Modify: `src/app/api/lavori/route.ts` (POST: validazione `tipo_dispositivo`) + `src/app/api/lavori/[id]/route.ts` (PATCH: idem quando il campo è presente)
- Test: `tests/unit/api-lavori-tipo-validazione.test.ts`

**Interfaces:**
- Consumes: `LABEL_MACRO`, `MACRO_SLUGS` dal Task 2.
- Produces: POST/PATCH che rifiutano con 422 `{ error: 'tipo_dispositivo non valido' }` ogni valore fuori da `MACRO_SLUGS`.

- [ ] **Step 1: Test falliti per B2**

`tests/unit/api-lavori-tipo-validazione.test.ts` — seguire il pattern dei test API esistenti (es. `tests/unit/magazzino-route.test.ts`: mock di `getServerUserClient`/`getServiceClient` con `vi.mock`, chiamata diretta dell'handler con `Request`). Casi:

```ts
// POST con tipo_dispositivo: 'corona_zirconia' (un GRANULARE, non un macro!) → 422
// POST con tipo_dispositivo: 'bite_splint' → passa la validazione (arriva all'INSERT mockato)
// POST con tipo_dispositivo: 'xyz' → 422
// PATCH con body { tipo_dispositivo: 'xyz' } → 422
// PATCH senza tipo_dispositivo nel body → nessuna validazione scatta (campo assente ok)
```

Il primo caso è il guard-rail più importante: protegge dall'errore concettuale di mandare l'id granulare al posto del macro.

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implementare**

In `src/app/api/lavori/route.ts`, dopo la validazione obbligatori esistente (righe ~108-119):

```ts
import { MACRO_SLUGS } from '@/lib/domain/tipi-lavoro'
// …
if (!(MACRO_SLUGS as string[]).includes(body.tipo_dispositivo)) {
  return NextResponse.json({ error: 'tipo_dispositivo non valido' }, { status: 422 })
}
```

In `[id]/route.ts` (PATCH), dentro il filtro allowlist: se `payload.tipo_dispositivo !== undefined` e non è in `MACRO_SLUGS` → 422.

Consolidamento B4: in `TabDati.tsx` sostituire l'array hardcoded con `const TIPO_OPTIONS = MACRO_SLUGS.map(value => ({ value, label: LABEL_MACRO[value] }))`. Nelle due pagine rischi e in `DdcTemplate.tsx` sostituire il corpo delle `formatTipoDispositivo` locali con `LABEL_MACRO[tipo] ?? tipo`. In `RichiestaClientForm.tsx`: leggere le label attuali — se sono descrittive («Protesi fissa (corona, ponte)») CONSERVARLE come mappa di override locale ma derivare l'elenco delle chiavi da `MACRO_SLUGS` (aggiungendo la voce bite_splint con label coerente «Bite / splint (bruxismo, sport)»); se sono identiche alle standard, importare `LABEL_MACRO` direttamente.

- [ ] **Step 4: Run test → PASS** + suite intera + `npx tsc --noEmit` (i test esistenti su TabDati/rischi/DdC non devono muoversi: le label standard sono INVARIATE)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(lavori): validazione enum 422 su POST/PATCH + label macro consolidate in tipi-lavoro (B2+B4)"
```

---

### Task 5: `ChipScelta` + `ProgressDots` + refactor `CampoData` + catalogo (TDD)

**Files:**
- Create: `src/components/ds/ChipScelta.tsx` · `src/components/ds/ProgressDots.tsx`
- Modify: `src/components/ds/Campo.tsx` (le pill interne di `CampoData` → `ChipScelta`)
- Modify: `src/app/ds-v3-catalogo/page.tsx` (+2 sezioni — seguire la struttura delle sezioni esistenti)
- Test: `tests/unit/ChipScelta.test.tsx` · `tests/unit/ProgressDots.test.tsx`

**Interfaces:**
- Produces:
  - `ChipScelta{ children: ReactNode; selezionata: boolean; onClick: () => void }` — §5.31: min-height 48 · padding 0/20 · radius 999 · 16/700 · faccia `var(--card)`+`sombra press` da token · selezionata: `var(--green-tint)` + testo `var(--green)` + check ✓ 3px, SENZA ombra. `aria-pressed={selezionata}`. `vibra('selection')` al tap.
  - `ProgressDots{ passo: 1 | 2 | 3 }` — §5.32: 3 dot Ø11 gap 8 · upcoming `var(--line)` · fatti `var(--green)` · attivo width 30 `var(--red)`, transizione width 120ms `cssEase` (mockup `.dots .dot`, wizard.html:84-91). `aria-label="Passo {passo} di 3"`, `role="img"`.

- [ ] **Step 1: Test falliti** — render + asserzioni su `aria-pressed`/`aria-label`, check visibile solo se selezionata, dot attivo con width 30 (style inline), 2 fatti al passo 3. Pattern dei test: Testing Library `render` + `screen.getByRole`.

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implementare** — valori CSS VERBATIM da `wizard.html` (dots) e legge §5.31 (chip); stile componenti gemelli esistenti (`Pill.tsx`, `TastoSecondario.tsx`): motion.button + `molla.press`, classi scoped `<style>` per dark/focus-visible. Il check della chip: SVG inline stroke 3, `aria-hidden`.

- [ ] **Step 4: Refactor `CampoData` (W2)** — sostituire le pill interne (`ds-campo-data-pill` + `stilePill`) con `<ChipScelta selezionata={…} onClick={…}>Oggi</ChipScelta>` ecc. I test esistenti di CampoData devono restare verdi SENZA modifiche (se un selettore di test punta alla classe interna, aggiornare il selettore, non il comportamento).

- [ ] **Step 5: Catalogo** — aggiungere le sezioni «ChipScelta §5.31» e «ProgressDots §5.32» in `ds-v3-catalogo/page.tsx` con esempi (chip selezionata/no, dots ai 3 passi).

- [ ] **Step 6: Run tutto → PASS + tsc** e **Commit**

```bash
git add -A && git commit -m "feat(ds): ChipScelta §5.31 + ProgressDots §5.32, CampoData rifattorizzato, catalogo aggiornato"
```

---

### Task 6: Tempi medi — `src/lib/lavori/tempi-medi.ts` (TDD)

**Files:**
- Create: `src/lib/lavori/tempi-medi.ts`
- Test: `tests/unit/tempi-medi.test.ts`

**Interfaces:**
- Consumes: `TIPI_LAVORO`, `labelTipo`, `trovaTipo` (Task 2); helpers data `inizioGiorno`, `aggiungiGiorni` da `@/components/ds/Campo` (W7).
- Produces:
  - `type CampioneConsegna = { descrizione: string | null; tipo_dispositivo: string; data_ingresso: string; data_consegna_effettiva: string }`
  - `function calcolaGiorniPerTipo(campioni: CampioneConsegna[]): Record<string, { giorni: number; daStoria: boolean }>` — PURA: per ogni tipo della tassonomia applica la cascata spec §8: (a) media dei campioni con `descrizione === labelTipo(t)` se ≥ 5; (b) media dei campioni con `tipo_dispositivo === t.macro` se ≥ 5; (c) `t.giorniFallback`. Media arrotondata a intero ≥ 1.
  - `function dataSuggerita(giorni: number, oggi?: Date): Date` — `oggi + giorni`; se il risultato cade di domenica → +1 (lunedì).
  - `function fetchCampioniConsegna(svc: SupabaseClient, labId: string): Promise<CampioneConsegna[]>` — select `descrizione, tipo_dispositivo, data_ingresso, data_consegna_effettiva` da `lavori` where `laboratorio_id=labId`, `stato='consegnato'`, `data_consegna_effettiva not null`, `deleted_at is null`. **Fail-closed:** `.error` → `throw` (prassi post-Ondata 3).

- [ ] **Step 1: Test falliti** (funzioni pure — niente mock Supabase):

```ts
// cascata (a): 5 campioni 'Corona zirconia' con delta 4,4,6,6,5 → giorni 5, daStoria true
// cascata (b): 2 campioni granulari ma 6 campioni macro protesi_fissa → media macro, daStoria true
// cascata (c): zero campioni → giorniFallback (corona_zirconia → 5), daStoria false
// dataSuggerita: venerdì 10/07/2026 + 2 = domenica 12 → slitta a lunedì 13
// dataSuggerita: +5 da lunedì → sabato, resta sabato (solo la domenica slitta)
// media arrotondata: 4,5 → 5 (Math.round), mai < 1
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implementare** · **Step 4: Run → PASS + tsc**

- [ ] **Step 5: Commit** — `feat(lavori): tempi medi di consegna con cascata granulare→macro→fallback (spec §8)`

---

### Task 7: Dati server del wizard — `src/lib/wizard/dati-wizard.ts` (TDD)

**Files:**
- Create: `src/lib/wizard/dati-wizard.ts` (`import 'server-only'`)
- Test: `tests/unit/dati-wizard.test.ts`

**Interfaces:**
- Consumes: `TIPI_LAVORO`, `labelTipo`, `CANONICI_DAY1` (Task 2); `fetchCampioniConsegna`, `calcolaGiorniPerTipo` (Task 6).
- Produces (consumate dalla RSC del Task 8):

```ts
export type DentistaWizard = { id: string; label: string; count30: number }
export type DatiWizard = {
  dentisti: DentistaWizard[]                 // TUTTI, ordinati count30 desc poi label asc
  frequenzeTipi: Record<string, number>      // tipoId -> count 30gg (match descrizione === labelTipo)
  topTipi: string[]                          // 4 id: count>0 desc (tie: ordine canonico), riempiti con CANONICI_DAY1
  prossimoPz: string                         // 'PZ-0436' — max numerico dei PZ-\d+ del lab + 1, pad 4; 'PZ-0001' se nessuno
  giorniPerTipo: Record<string, { giorni: number; daStoria: boolean }>
}
export async function getDatiWizard(svc: SupabaseClient, labId: string): Promise<DatiWizard>
```

- [ ] **Step 1: Test falliti** — pattern mock del progetto (come `tests/unit/…` che mockano il service client con catene `.from().select().eq()` fittizie; vedere `pile-home` test per il fake builder). Casi:

```ts
// label dentista: studio_nome se presente, altrimenti 'Dr. Cognome' (coerente con pile-home-shared — verificare e riusare l'helper esistente se esportato)
// count30: solo lavori con data_ingresso >= oggi-30gg
// topTipi: 2 tipi con count>0 → completati con i primi 2 CANONICI_DAY1 non già presenti
// topTipi con count>0 ≥ 4 → i 4 più frequenti, tie-break ordine canonico
// prossimoPz: ['PZ-0435','PZ-0021','P-99','ALTRO'] → 'PZ-0436'; lista vuota → 'PZ-0001'
// fail-closed: .error su una query → throw
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implementare** (query: `clienti` id+nome+cognome+studio_nome attivi; `lavori` cliente_id+descrizione+data_ingresso ultimi 30gg; `pazienti` codice_paziente like 'PZ-%'; aggregazione in JS; riuso `fetchCampioniConsegna`+`calcolaGiorniPerTipo`) · **Step 4: PASS + tsc**

- [ ] **Step 5: Commit** — `feat(wizard): dati server (dentisti per frequenza, top tipi, prossimo PZ, tempi medi)`

---

### Task 8: Route riscritta + shell `WizardNuovoLavoro` + Passo 1 (dentisti)

**Files:**
- Rewrite: `src/app/(app)/lavori/nuovo/page.tsx` (RSC — il form v2.3 muore QUI; `error.tsx`/`loading.tsx` restano, verificarne la coerenza copy)
- Create: `src/components/features/wizard/WizardNuovoLavoro.tsx` (client, shell + coreografia passi)
- Create: `src/components/features/wizard/PassoDentista.tsx` (client)
- Modify: `src/lib/nav/route-migrate-v3.ts:10` (`ROUTE_MIGRATE_V3 = ['/dashboard', '/tutto-il-resto', '/lavori/nuovo']` + aggiornare il commento: `/lavori/nuovo` è v3 da Ondata 2)
- Test: `tests/unit/WizardNuovoLavoro.test.tsx` + modifica `tests/unit/route-migrate-v3.test.ts`

**Interfaces:**
- Consumes: `getDatiWizard` (Task 7), `ProgressDots` (Task 5), componenti ds (`TileScelta`, `TileNuovo`, `RigaCerca`, `TastoTondo`, `PillVoce`), `DatiWizard` types.
- Produces (per i Task 9-13):

```ts
// WizardNuovoLavoro.tsx — stato interno e contratto dei passi
export type TipoScelto = { kind: 'catalogo'; tipoId: string } | { kind: 'libero'; testo: string }
export type StatoWizard = {
  passo: 1 | 2 | 3
  cliente: { id: string; label: string } | null
  tipo: TipoScelto | null
  pz: string; alias: string; elemento: string; colore: string
  foto: File | null
}
export function WizardNuovoLavoro(props: { dati: DatiWizard }) // montato dalla RSC
// PassoDentista.tsx
export function PassoDentista(props: {
  dentisti: DentistaWizard[]
  onScegli: (d: { id: string; label: string }) => void
  onNuovoDentista: () => void   // apre lo sheet del Task 9
})
```

- [ ] **Step 1: Test falliti** — `WizardNuovoLavoro.test.tsx` (Testing Library, mock `next/navigation` come nei test esistenti):

```ts
// renderizza il Passo 1: domanda 'Per quale dentista?', hint, ProgressDots aria-label 'Passo 1 di 3'
// mostra al massimo 4 TileScelta dentista (i primi per count30) + TileNuovo + RigaCerca 'Cerca fra tutti i N dentisti…'
// tap su un tile dentista → avanza al Passo 2 (domanda 'Che lavoro è?')
// tap ‹ (Indietro) dal Passo 1 → router.push('/dashboard')
// RigaCerca aperta: digitando 'esp' la lista filtra (contains normalizzato); i risultati sono tile in lista
// PillVoce presente (mock Web Speech: window.webkitSpeechRecognition stub) e onTesto compila la ricerca
// route-migrate-v3.test.ts: isV3MigratedRoute('/lavori/nuovo') === true; ('/lavori/123') === false
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: RSC `page.tsx`** — pattern dashboard (auth → utente → labId, redirect /login), poi:

```tsx
import { getDatiWizard } from '@/lib/wizard/dati-wizard'
import { WizardNuovoLavoro } from '@/components/features/wizard/WizardNuovoLavoro'
export const dynamic = 'force-dynamic'
export default async function NuovoLavoroPage() {
  // …auth + labId come dashboard/page.tsx…
  const dati = await getDatiWizard(svc, labId)
  return <WizardNuovoLavoro dati={dati} />
}
```

- [ ] **Step 4: Shell client** — root `data-ds="v3"` + `background: var(--bg)` inline + `.ds-grana` + colonna `max-width: 480px` centrata `padding: 8px 24px 0` (mockup `.wz-frame`); full-screen a TUTTI i viewport (§12.2). Entrata: il wrapper monta con coreografia «sale come sheet» (`initial={{ y: '6%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}` con `molla.smooth`; reduced-motion → crossfade — pattern mounted-guard di progetto). Scivolata fra passi (§8.3.3): contenitore dei passi con `AnimatePresence mode="popLayout"`, passo entrante `x: '100%'→0`, uscente `x: 0→'-30%'` + `opacity .6` (molla `wizard` se presente in `v3/motion.ts`, altrimenti `smooth` — leggere il file), back = inverso (`direction` in stato). Testata: `TastoTondo{glifo:'‹', etichettaAria:'Indietro'}` + `ProgressDots{passo}` (gap 16, margin-bottom 22 — mockup `.wz-top`). Domanda `fontSize 35/800/-0.02em/lineHeight 1.08` + hint `15.5/600 var(--muted)` (mockup `.domanda`/`.hint`).
- Passo 1 (`PassoDentista`): griglia `grid 2 col gap 15 marginTop 22` (mockup `.tile-grid`); `TileScelta{nome: d.label, sotto: \`${d.count30} lavori · 30gg\`, avatar: iniziale}`; `TileNuovo{etichetta:'＋ Nuovo dentista'}` a piena larghezza (`gridColumn: '1 / -1'`); `RigaCerca{totale: dentisti.length, cosa:'dentisti', onApri}` → modalità ricerca: `CampoTesto` autoFocus + lista risultati come TileScelta full-width; `PillVoce{onTesto: setQueryRicerca}` in fondo (`marginTop 22`).
- `router.push('/dashboard')` sul back del Passo 1. Selezione dentista → `setStato({...s, cliente, passo: 2})`.

- [ ] **Step 5: Run → PASS + tsc + suite** (il test BottomNavPill.routes esistente deve già coprire il ritiro su route migrate — verificare che passi col predicato esteso)

- [ ] **Step 6: Commit** — `feat(wizard): route /lavori/nuovo riscritta v3 — shell, coreografia passi, Passo 1 dentisti`

---

### Task 9: Sheet «Nuovo dentista» (A7)

**Files:**
- Create: `src/components/features/wizard/NuovoDentistaSheet.tsx`
- Modify: `src/components/features/wizard/WizardNuovoLavoro.tsx` (montaggio + wiring `onNuovoDentista`)
- Test: `tests/unit/NuovoDentistaSheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet`, `CampoTesto`, `TastoPrimario`, `useAvvisi`.
- Produces: `NuovoDentistaSheet{ aperto: boolean; onChiudi: () => void; onCreato: (d: { id: string; label: string }) => void }` — al successo chiama `onCreato` (il wizard seleziona e avanza al Passo 2).

- [ ] **Step 1: Test falliti** (mock `fetch`):

```ts
// campi: Nome, Cognome (obbligatori), Cellulare/WhatsApp, Studio (opzionali) — SOLO questi 4 (A7)
// submit con nome/cognome vuoti → non chiama fetch, mostra il vincolo
// submit valido → POST /api/clienti body {nome, cognome, telefono?, studio_nome?} → onCreato({id, label})
// label = studio_nome se compilato, altrimenti `Dr. ${cognome}` (stessa regola del Task 7)
// errore rete/500 → useAvvisi().errore('Non sono riuscita a creare il dentista. Riprova.') e lo sheet resta aperto
// bottone disabled durante la chiamata (no doppio POST)
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implementare** (Sheet §5.16 con titolo «Nuovo dentista»; `credentials: 'same-origin'`; niente campi fiscali — spec A7) · **Step 4: PASS + tsc**

- [ ] **Step 5: Commit** — `feat(wizard): sheet Nuovo dentista a 3 campi (A7 — solo nome+cognome obbligatori)`

---

### Task 10: Passo 2 — tipi granulari + catalogo «Un altro tipo» + «Descrivilo»

**Files:**
- Create: `src/components/features/wizard/PassoTipo.tsx` + `src/components/features/wizard/CatalogoTipiSheet.tsx`
- Modify: `src/components/features/wizard/WizardNuovoLavoro.tsx` (ramo passo 2)
- Test: `tests/unit/PassoTipo.test.tsx`

**Interfaces:**
- Consumes: `TIPI_LAVORO`, `cercaTipiLavoro`, `labelTipo`, `LABEL_MACRO`, `trovaTipo` (Task 2); `dati.topTipi`, `dati.frequenzeTipi` (Task 7); `TileScelta`, `TileNuovo`, `RigaCerca`, `Sheet`, `CampoTesto`, `PillVoce`.
- Produces: `PassoTipo{ topTipi: string[]; frequenze: Record<string, number>; onScegli: (t: TipoScelto) => void }`.

- [ ] **Step 1: Test falliti:**

```ts
// 4 TileScelta dai topTipi: nome due-righe (riga1 grande + riga2), sotto `N · 30gg` solo se count>0
// glifo line-SVG per famiglia macro (aria-hidden), MAI emoji
// tap tile → onScegli({kind:'catalogo', tipoId})
// TileNuovo '＋ Un altro tipo' → apre CatalogoTipiSheet: lista COMPLETA raggruppata per famiglia (header = LABEL_MACRO)
// nel catalogo: RigaCerca in testa; 'cappetta' filtra a corona_zirconia (alias)
// in fondo al catalogo: 'Non lo trovi? Descrivilo' → CampoTesto → onScegli({kind:'libero', testo}) SOLO se testo non vuoto
// RigaCerca del passo: stessa cercaTipiLavoro; PillVoce compila la query
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implementare** — Tile due righe: `nome` di TileScelta riceve un ReactNode? NO: firma reale = `nome: string`. Comporre la label nel tile con `nome={t.tile.riga1}` e `sotto` a DUE righe non è previsto → **estendere `TileScelta` con prop opzionale `sotto2?: string`?** NO — la legge §5.12 fissa l'anatomia. Soluzione conforme: `nome={labelTipo(t)}` su una riga (il componente tronca con ellissi) e `sotto={count>0 ? `${count} · 30gg` : LABEL_MACRO[t.macro]}`. **DEVIAZIONE dal parere advisor (due righe visive)**: annotarla nel report del task per la review; se il reviewer o Francesco la boccia, estendere `TileScelta` con `nomeRiga2?: string` in un fix round (modifica additiva ammessa dal catalogo). Glifi: 4 line-SVG per famiglia (riusare i path del mockup wizard.html righe 311-328, stroke 1.7 currentColor, `color: var(--blue)` come `.tile-scelta .glifo`) in un file locale `glifi-famiglie.tsx` dentro `features/wizard/`.
- CatalogoTipiSheet: `Sheet{titolo: 'Tutti i tipi di lavoro'}` + gruppi per macro in ordine canonico + ricerca + riga finale «Non lo trovi? Descrivilo».

- [ ] **Step 4: PASS + tsc** · **Step 5: Commit** — `feat(wizard): Passo 2 tipi granulari per frequenza + catalogo completo + descrizione libera`

---

### Task 11: Passo 3 — paziente, alias, dettagli opzionali, foto

**Files:**
- Create: `src/components/features/wizard/PassoPaziente.tsx`
- Modify: `src/components/features/wizard/WizardNuovoLavoro.tsx` (ramo passo 3)
- Test: `tests/unit/PassoPaziente.test.tsx`

**Interfaces:**
- Consumes: `CampoTesto`, `LinkQuieto`, `TastoSecondario`, `PillVoce`; `dati.prossimoPz`.
- Produces: `PassoPaziente{ pz, alias, elemento, colore, foto, onCambia: (patch: Partial<StatoWizard>) => void, onContinua: () => void, inCreazione: boolean }`.

- [ ] **Step 1: Test falliti:**

```ts
// CampoTesto 'Codice paziente' precompilato con prossimoPz + nota GDPR 'UÀ propone il prossimo numero. Nessun nome, solo il codice (GDPR).'
// blocco 'SE VUOI, AGGIUNGI' (caption 12.5/800 maiuscola faint): righe Elemento (es. 2.6), Colore (es. A2), Nome o alias — ciascuna con LinkQuieto 'Salta'
// tap sulla riga → CampoTesto inline al posto della riga (autoFocus); 'Salta' la richiude vuota
// riga foto dashed 'Aggiungi la foto dell'impronta' → input file nascosto accept="image/*" capture="environment"; selezione → mostra il nome/thumb e onCambia({foto})
// 'Continua' = TastoSecondario (MAI rosso — fuori dal percorso minimo); con inCreazione true è disabled
// PillVoce compila il campo attivo (default: codice paziente)
```

- [ ] **Step 2: Run → FAIL** · **Step 3: Implementare** — righe opzionali: `padding 14/0`, separatore `1.5px var(--line)`, nome `17/700 var(--ink)`, esempio `14.5/600 var(--faint)` (mockup `.opz-riga`); riga foto: `border 2.5 dashed` + radius 18 + H64 (mockup `.foto-add`, stesso dashed di TileNuovo). L'`<input type="file">` è visually-hidden ma label-associato (a11y).

- [ ] **Step 4: PASS + tsc** · **Step 5: Commit** — `feat(wizard): Passo 3 paziente con alias opzionale (A8), dettagli e foto impronta`

---

### Task 12: Creazione + frame «Fatto!» (sequenza chiamate, fail-soft, Cambia data, CTA foto)

**Files:**
- Create: `src/lib/wizard/crea-lavoro.ts` (client-safe, orchestrazione fetch) + `src/components/features/wizard/FrameFatto.tsx` + `src/components/features/wizard/CambiaDataSheet.tsx`
- Modify: `src/components/features/wizard/WizardNuovoLavoro.tsx` (submit al «Continua», ramo fatto)
- Test: `tests/unit/crea-lavoro.test.ts` · `tests/unit/FrameFatto.test.tsx`

**Interfaces:**
- Consumes: `trovaTipo`, `labelTipo` (Task 2); `dataSuggerita` + `dati.giorniPerTipo` (Task 6/7); `CardInfo`/`RigaDato`, `TastoPrimario`, `LinkQuieto`, `ChipScelta`, `CampoData`, `Sheet`, `useAvvisi`, `suona`/`vibra`.
- Produces:

```ts
// crea-lavoro.ts — sequenza spec §7. Ritorna sempre l'esito parziale (fail-soft).
export type EsitoCreazione = {
  lavoro: { id: string; numero_lavoro: string } | null   // null = fallimento BLOCCANTE (passi 1-2)
  accessoriFalliti: Array<'dettagli' | 'foto'>            // fail-soft (passi 3-4)
}
export async function creaLavoroDaWizard(input: {
  cliente: { id: string }; tipo: TipoScelto
  pz: string; alias: string; elemento: string; colore: string; foto: File | null
  dataConsegna: Date
}): Promise<EsitoCreazione>
```

- [ ] **Step 1: Test falliti per `crea-lavoro.ts`** (mock `fetch` sequenziale):

```ts
// 1. GET /api/pazienti?cliente_id=X → se un paziente ha codice_paziente === pz, riusa il suo id (NESSUN POST pazienti)
// 2. altrimenti POST /api/pazienti {cliente_id, codice_paziente: pz, nome_cognome: alias || pz}
// 3. POST /api/lavori {cliente_id, paziente_id, tipo_dispositivo: macro, descrizione: labelTipo|testo libero, data_consegna_prevista: 'YYYY-MM-DD', classe_rischio}
//    - tipo libero: {tipo_dispositivo:'altro', descrizione: testo, classe_rischio:'classe_i'}
// 4. elemento/colore presenti → PATCH /api/lavori/[id] {denti_coinvolti: elemento.split(/[,\s]+/).filter(Boolean), colore_dente: colore}
// 5. foto presente → POST /api/lavori/[id]/immagini FormData{file, descrizione:'impronta'}
// fallimento a 1-3 → {lavoro: null, …} e NESSUNA chiamata successiva
// fallimento a 4 → prosegue col 5; esito {lavoro, accessoriFalliti:['dettagli']}
// fallimento a 5 → {lavoro, accessoriFalliti:['foto']}
// il POST pazienti fallito NON blocca: si tenta comunque il POST lavori SENZA paziente_id? NO — spec §7: paziente fa parte del percorso primario. Fallimento paziente = bloccante (si resta al Passo 3 con Avviso).
```

- [ ] **Step 2: Test `FrameFatto`:**

```ts
// check Ø92 tint verde + 'Fatto!' 35/800 + sub 'Il lavoro è nato. Lo trovi fra gli «Appena arrivati», da confermare.'
// card 'IL LAVORO': RigaDato Dentista/Lavoro/Paziente (valori dallo stato)
// card 'CONSEGNA SUGGERITA': daStoria → 'Pronta per <b>giovedì 16 luglio</b> — di solito ci mettete N giorni.'; fallback → '… — tempo tipico per questo lavoro: N giorni.'
// LinkQuieto 'Cambia data' → CambiaDataSheet (ChipScelta Oggi·Domani·suggerita + CampoData 'Scegli…') → conferma → PATCH /api/lavori/[id] {data_consegna_prevista} → la frase si aggiorna; errore → useAvvisi().errore, resta la suggerita
// TastoPrimario 'Fotografa impronta e prescrizione' (UNICO rosso del frame) → input capture → POST immagini FormData{file, descrizione:'prescrizione'} → avviso 'Foto salvata ✓' e si RESTA sul Fatto (ripetibile)
// LinkQuieto 'Torna alla home' → router.push('/dashboard')
// al mount: suona('fatta') + vibra (post-mount, mounted-guard)
// se accessoriFalliti non vuoto → useAvvisi().errore('Non sono riuscita a salvare …. Li aggiungi dalla scheda.')
```

- [ ] **Step 3: Run → FAIL** · **Step 4: Implementare** — Flusso (mockup, commento righe 28-33: «Il Passo 3 è tutto opzionale e non entra nel conteggio»): il Passo 3 SI ATTRAVERSA SEMPRE, precompilato; il suo «Continua» esegue `creaLavoroDaWizard` e porta al Fatto. I «3 tocchi» contati sono dentista + tipo + il TastoPrimario del Fatto — il «Continua» sul default non conta come decisione. Implementare esattamente così: nessuna scorciatoia che salti il Passo 3.
- Verificare PRIMA di implementare che `data_consegna_prevista` sia in `PATCHABLE_FIELDS` (`src/app/api/lavori/[id]/route.ts:60-…`): se NON c'è, fermarsi e segnalare alla sessione primaria (non estendere l'allowlist senza ratifica — dominio API).
- Formato data: `YYYY-MM-DD` locale (`toISOString().split('T')[0]` NO — usa il fuso UTC; comporre da `getFullYear/getMonth/getDate` con pad, coerente col resto del wizard W7).
- Frase consegna: giorno in italiano esteso («giovedì 16 luglio») — riusare `GIORNI`/`MESI` se esportati o duplicarli localmente (nota O1b invariata).

- [ ] **Step 5: Run → PASS + tsc + suite** · **Step 6: Commit** — `feat(wizard): creazione lavoro fail-soft + frame Fatto con consegna suggerita e Cambia data`

---

### Task 13: Persistenza abbandono 24h + sheet «Riprendo da dove eri?»

**Files:**
- Create: `src/lib/wizard/persistenza.ts` + `src/components/features/wizard/RipresaSheet.tsx`
- Modify: `src/components/features/wizard/WizardNuovoLavoro.tsx` (salvataggio a ogni cambiamento, ripristino al mount)
- Test: `tests/unit/wizard-persistenza.test.ts`

**Interfaces:**
- Consumes: `StatoWizard`, `TipoScelto` (Task 8).
- Produces:

```ts
export type StatoSalvato = {
  v: 1; salvatoA: number; userId: string; labId: string
  passo: 1 | 2 | 3
  cliente: { id: string; label: string } | null
  tipo: TipoScelto | null
  pz: string; alias: string; elemento: string; colore: string
  // NIENTE foto (File non serializzabile — perdita accettata, spec §9)
}
export const CHIAVE_WIZARD = 'ua:wizard-lavoro:v1'
export function salvaStato(s: StatoSalvato): void            // localStorage.setItem (try/catch silenzioso)
export function leggiStato(userId: string, labId: string, ora?: number): StatoSalvato | null
  // null se: assente, JSON rotto, v≠1, ora-salvatoA > 24h, userId/labId diversi (guardia dispositivo condiviso)
export function azzeraStato(): void
```

- [ ] **Step 1: Test falliti** (jsdom ha localStorage):

```ts
// roundtrip salva/leggi
// scaduto (salvatoA = ora - 25h) → null e la chiave viene rimossa
// userId diverso → null · labId diverso → null
// JSON corrotto → null senza throw
// azzeraStato rimuove la chiave
```

- [ ] **Step 2: Test integrazione nel wizard:**

```ts
// mount con stato salvato valido → RipresaSheet aperto: titolo 'Riprendo da dove eri?', body '<b>{tipo|Corona}</b> per il <b>{cliente.label}</b>, ti mancava il paziente.' (frase adattata al passo: passo 1 salvato → 'avevi appena iniziato'; passo 2 → 'ti mancava il tipo di lavoro'; passo 3 → 'ti mancava il paziente')
// 'Riprendi' (TastoPrimario) → stato ripristinato al passo salvato
// 'Ricomincia da capo' (LinkQuieto) → azzeraStato + passo 1 pulito
// creazione completata (Fatto) → azzeraStato
// ogni avanzamento/cambiamento → salvaStato (verificare con spy)
```

- [ ] **Step 3: Run → FAIL** · **Step 4: Implementare** (userId/labId: la RSC li passa come prop `contesto: {userId, labId}` a `WizardNuovoLavoro` — aggiungerla in Task 8 se non già presente, aggiornando quel test) · **Step 5: PASS + tsc + suite**

- [ ] **Step 6: Commit** — `feat(wizard): persistenza abbandono 24h + sheet Riprendo da dove eri (spec §9)`

---

### Task 14: Verifica finale FASE 7 + riconciliazione

**Files:**
- Modify: eventuali fix emersi · `memory/SESSION_ACTIVE.md` (dalla sessione primaria)

- [ ] **Step 1: FASE 7 completa nel worktree**

```bash
npx tsc --noEmit          # atteso: pulito
npx vitest run            # atteso: baseline 1373 + i nuovi, 0 fail
npx next build            # atteso: exit 0
bash scripts/check-ds-compliance.sh 2>/dev/null || true   # se esiste: zero violazioni nuove
```

- [ ] **Step 2: Controlli incrociati** — grep di guardia:

```bash
# nessun consumo diretto di label duplicate rimaste:
grep -rn "Protesi fissa" src --include="*.tsx" | grep -v tipi-lavoro   # atteso: solo override portale eventualmente ratificato
# il wizard non scrive mai id granulari in tipo_dispositivo:
grep -rn "tipo_dispositivo" src/components/features/wizard src/lib/wizard   # ispezione manuale: solo macro
# nessun hex inline nei file nuovi:
grep -rnE "#[0-9A-Fa-f]{3,6}" src/components/features/wizard src/lib/wizard src/components/ds/ChipScelta.tsx src/components/ds/ProgressDots.tsx   # atteso: vuoto
```

- [ ] **Step 3: Commit finale** — `chore(wizard): verifica finale Ondata 2 (tsc+vitest+build)`

---

## QA browser (sessione primaria, dopo la review finale — NON un task subagent)

Su lab E2E `00000000-0000-0000-0000-000000000001`, dev server `PORT=3013 npm run dev` NEL worktree, 3 viewport (390/768/1280) × 2 temi, screenshot in `docs/design/screenshots/2026-07-12-ondata-2/`:

1. Percorso minimo 3 tocchi: + dalla home → tile dentista → tile tipo → (Passo 3 precompilato) Continua → Fatto! → lavoro in pila blu con badge da confermare, `descrizione` = label granulare, `classe_rischio` corretta a DB, `numero_lavoro` progressivo.
2. Consegna suggerita: lab E2E senza storia → frase «tempo tipico» + giorniFallback; «Cambia data» → chip Domani → PATCH verificato a DB.
3. «Un altro tipo» → catalogo → ricerca «cappetta» → corona zirconia; «Descrivilo» → lavoro `altro` + testo.
4. Nuovo dentista dallo sheet → appare selezionato → lavoro creato per lui; verifica riga `clienti` a DB (solo 4 campi).
5. Alias paziente: creare con alias → `pazienti.nome_cognome` = alias, `codice_paziente` = PZ; senza alias → nome = codice. PZ proposto = max+1.
6. Foto: Passo 3 + CTA prescrizione → 2 righe `lavori_immagini` con descrizione impronta/prescrizione, file nel bucket `documenti`.
7. Fail-soft: simulare offline dopo la creazione (devtools) → Avviso, lavoro comunque nato.
8. Abbandono: compilare fino al passo 2, ricaricare → sheet «Riprendo da dove eri?»; «Ricomincia» azzera; stato di un altro utente non riappare (guardia).
9. Bite: creare «Bite rigido» → `tipo_dispositivo='bite_splint'` a DB; pagina rischi mostra «Bite / splint».
10. Enum 422: `curl` POST con `tipo_dispositivo:'corona_zirconia'` → 422.
11. BottomNavPill/avatar assenti su `/lavori/nuovo`; back del Passo 1 → home.
12. PillVoce (solo browser con Web Speech): dettare «corona zirconia» al Passo 2 → la ricerca si compila.
13. Cleanup a baseline ESATTO (lavori, pazienti, clienti, immagini nel bucket, progressivi non fiscali documentati se bruciati).

---

## Self-review del piano (eseguita)

1. **Copertura spec:** §1-§11 tutti mappati (§3→T2, §4→T3+T4, §5→T7/T8, §6→T8-T12, §7→T12, §8→T6, §9→T13, §10→T8 (PillVoce già completa, sola integrazione), §11→T5, §13 governance→T1+T14+QA). Il verbale §2.1 (A4 canonici, A7 sheet, A8 alias, B2, B4) è inciso nei task T7, T9, T11, T4.
2. **Placeholder:** nessun TBD; i punti a rischio deviazione (tile due-righe T10, PATCHABLE_FIELDS T12) sono ISTRUZIONI esplicite di verifica/segnalazione, non buchi.
3. **Coerenza firme:** `TipoScelto`/`StatoWizard` (T8) usati identici in T10-T13; `DatiWizard` (T7) consumato in T8; `labelTipo` unica fonte della stringa-descrizione (T2→T6→T7→T12).




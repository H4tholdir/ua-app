# Audit — Prospettiva: Ingegnere Software Senior (RE-AUDIT)
**Data:** 2 luglio 2026 | **Versione app:** V1.9.3 | **Stack:** Next.js 16.2.6 + React 19.2.4 + TS5 + Supabase + TailwindCSS v4

**Baseline precedente:** `docs/audit-2026-05-21/07-persona-software-engineer.md` — **7.2/10**, target dichiarato **9+/10**.

---

## Sommario Esecutivo

Dal 21 maggio a oggi il codebase è migliorato su alcuni assi (GSAP rimosso, CSRF ora completo su tutte le 35 route dinamiche `[id]`, `any` ridotti da 63 a 16, +16 test unitari inclusa una suite di content-validation MDR sul DdC), ma **il problema CRITICO segnalato nell'audit precedente non è stato risolto**: i PDF generator MDR continuano a usare `as any` per bypassare il type-checking sulle props JSX. È stato aggiunto solo un commento `// eslint-disable-next-line @typescript-eslint/no-explicit-any` sopra ogni occorrenza — questo silenzia il linter (spiega perché `eslint --max-warnings 0` oggi passa pulito) ma **non introduce alcuna validazione type-safe**: è una soppressione documentata del problema, non il fix (`validateDdcProps()`) raccomandato nell'audit precedente.

I due flussi critici esplicitamente citati per il re-audit — `orchestraConsegna` e lo Stripe webhook — **hanno ancora zero test**, e `vitest.config.ts` esclude ancora `src/app/api/stripe/**` e `src/app/api/auth/**` dalla coverage, invariato rispetto a maggio. Il workaround JS-side per `/ordini` (fetch separata di `magazzino`/`fornitori` + merge in memoria invece di un join Supabase) è **byte-identico** a due mesi fa.

**Score Tecnico complessivo: 7.6/10** (+0.4 vs 7.2/10 precedente — target 9+/10 non raggiunto)

Motivazione sintetica: 2 problemi risolti su 5 (CSRF, GSAP), 1 solo apparentemente mitigato ma nella sostanza irrisolto e anzi "istituzionalizzato" via lint-suppression (type safety PDF — il problema CRITICO), 2 completamente invariati (test coverage flussi critici, query N+1 /ordini). I miglioramenti reali su `tsc`/`vitest`/qualità generale impediscono un punteggio stazionario o in calo, ma l'assenza di progresso sul problema a più alto rischio normativo (documenti MDR) e sui test dei flussi che muovono denaro/consegne blocca l'avvicinamento al target 9+.

---

## 1. Verifica CI reale (output comandi, non stime)

### `npx tsc --noEmit`
```
(nessun output — 0 errori)
```
✅ **Invariato**: zero errori TypeScript, come a maggio.

### `npx vitest run`
```
 Test Files  17 passed (17)
      Tests  157 passed (157)
   Duration  2.60s
```
✅ **Migliorato**: 157 test (vs 141/136 dichiarati a maggio), 17 file di test in `tests/unit/`.

### `npx eslint src/ --ext .ts,.tsx --max-warnings 0`
```
(nessun output — exit code 0)
```
✅ Pulito, ma **con una riserva importante**: è pulito anche perché tutte le 16 occorrenze residue di `as any` nei PDF generator e nel modulo consegna sono ora precedute da `// eslint-disable-next-line @typescript-eslint/no-explicit-any`. Il comando non fallisce, ma il debito è stato reso invisibile al linter, non eliminato dal codice.

---

## 2. Stato dei 5 problemi noti (baseline maggio)

### 2.1 — CRITICA: `as any` nei generatori PDF — **NON RISOLTO** (mitigato solo a livello di linting)
**Conteggio esatto:** 11 righe di codice (12 cast, perché `generate-ddc.ts:45` ne contiene due sulla stessa riga) distribuite su **8 file** in `src/lib/pdf/`:
`generate-ddc.ts:45,63,73`, `generate-dpa.ts:49`, `generate-ifu.ts:42`, `generate-buono.ts:28`, `generate-etichetta.ts:61,81`, `generate-nomina-prrc.ts:24`, `generate-ricevuta-consegna.ts:42`, `generate-cedolino-tecnico.ts:127`.

Vanno distinti due tipi di cast, perché richiedono fix diversi:
- **Cast sul renderer** (il pattern CRITICO originale, 9 righe): `renderToBuffer(createElement(Template, props) as any)` — es. `generate-ddc.ts:73`:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buffer = await renderToBuffer(createElement(DdcTemplate, { lavoro, lab, ddc }) as any)
```
Presente in tutti e 8 i file (etichetta.ts ne ha due, una per funzione). Il fix corretto è tipizzare le props del componente ed eliminare il cast, come raccomandato a maggio (`validateDdcProps()` o equivalente).
- **Cast di accesso ai dati** (2 righe, bug diverso): `generate-ddc.ts:45` — `(lavoro.paziente as any)?.nome_cognome ?? (lavoro.paziente as any)?.codice_paziente` — e `generate-ddc.ts:63` — `(lab as any).testo_rischi_default`. Qui il cast serve ad accedere a un campo non presente nel tipo dichiarato della relazione Supabase; il fix è correggere il tipo della relazione (`LavoroDettaglio.paziente`, `Laboratorio`), non introdurre una funzione di validazione sulle props JSX.

Rispetto a maggio 2026 l'unica differenza sulle 9 righe di cast-renderer è l'aggiunta del commento di soppressione lint. **Non esiste** nessuna funzione `validateDdcProps()` o equivalente. Il rischio di compliance (documenti MDR — DdC, IFU, Etichette, Nomina PRRC — generati con shape dati non verificata a compile-time) è identico a due mesi fa.

**Nota positiva parziale non presente a maggio:** `tests/unit/ddc-pdf-content.test.ts` (378 righe) ora valida via `pdf-parse` che il PDF del DdC renderizzato contiene gli 8 elementi obbligatori dell'Allegato XIII MDR 2017/745. Questo è un test di **content correctness** con fixture valide — utile, ma non copre il caso che l'`as any` doveva prevenire (dati reali dal DB con shape inattesa che il cast nasconde al compilatore). Gli altri 7 PDF generator (DPA, IFU, Buono, Etichetta, Nomina PRRC, Ricevuta Consegna, Cedolino Tecnico) restano a **0% di test**.

**Verdetto:** Problema CRITICO ancora aperto. Priorità Sprint 1 raccomandata: sostituire i 9 cast-renderer `as any` nei PDF generator con interfacce props tipizzate + funzione di validazione che lancia eccezione su dati incompleti, come già indicato a maggio, e correggere separatamente i 2 cast di accesso dati (`ddc.ts:45,63`) tipizzando le relazioni.

### 2.2 — ALTA: 63 usi di `any` — **MIGLIORATO (base comparabile: 16 occorrenze `as any`)**, non eliminato
```
grep -rn "as any" src/ --include="*.ts" --include="*.tsx" → 16 righe
```
**Nota metodologica:** questo "16" conta specificamente le occorrenze `as any`. Il "63" della baseline di maggio non specificava il pattern grep esatto usato (probabilmente un superset che includeva anche `: any`, generics non vincolati, `@ts-ignore`); non è stato possibile riprodurre esattamente lo stesso conteggio. Un `grep -rn ": any\b"` oggi restituisce **0** occorrenze, quindi la riduzione è comunque reale su qualunque base di conteggio, ma il confronto numerico diretto 63→16 va letto come indicativo, non come misura sulla stessa metrica.

Le 16 righe sono concentrate in:
- 11 nei PDF generator, cioè 12 cast (vedi 2.1: 9 cast-renderer + 3 cast di accesso dati)
- 4 in `src/lib/consegna/orchestrate.ts:77,79,266` e `src/lib/consegna/precheck.ts:39` (dati `lavoro`/`cliente`/`paziente` castati per accedere a campi non nel tipo dichiarato)
- 1 in `src/design-system/motion.ts:315` (`(document as any).startViewTransition` — API sperimentale non ancora in `lib.dom.d.ts`, uso ragionevole)

Riduzione reale e positiva, ma il fatto che i 4 residui in `orchestrate.ts`/`precheck.ts` siano proprio nel cuore del flusso di consegna (il secondo flusso critico segnalato per questo re-audit) è preoccupante: lo stesso modulo che non ha test (§2.3) usa anche cast non sicuri sui dati di dominio.

### 2.3 — MEDIA: test coverage bassa su Stripe webhook / `orchestraConsegna` — **INVARIATO**
```bash
grep -rl "orchestraConsegna" --include="*.test.ts" src/ tests/   → nessun risultato
grep -rli "stripe.*webhook" --include="*.test.ts" src/ tests/    → nessun risultato
```
`src/lib/consegna/orchestrate.ts` (funzione `orchestraConsegna`, riga 9) e `src/app/api/stripe/webhook/route.ts` non hanno alcun test dedicato, in nessuno dei 17 file in `tests/unit/`.

`vitest.config.ts:19-22` esclude ancora dalla coverage:
```typescript
exclude: [
  'src/lib/supabase/**',
  'src/app/api/stripe/**',
  'src/app/api/auth/**',
],
```
Identico a maggio, carattere per carattere. Il rischio di idempotency-loop sul webhook Stripe (punto #4 dell'audit precedente) resta non verificato da test automatici.

**Nota:** esistono test correlati (`precheck.test.ts`, `precheck-mdr.test.ts`) che coprono `src/lib/consegna/precheck.ts`, ma non l'orchestratore stesso.

### 2.4 — MEDIA: query subquery-workaround in `/ordini` — **INVARIATO (byte-identico)**
`src/app/(app)/ordini/page.tsx:58-100`:
```typescript
// Carica ordini con join su magazzino e fornitori
const { data: ordiniData } = await svc.from('ordini_fornitori').select(`...`)...
// Arricchisci con nomi da magazzino e fornitori
const magazziniIds = [...new Set(ordiniData.map((o) => o.magazzino_id).filter(Boolean))]
const fornitoriIds = [...new Set(ordiniData.map((o) => o.fornitore_id).filter(Boolean))]
const [magazziniRes, fornitoriRes] = await Promise.all([...])
```
Stesso pattern a maggio: due query aggiuntive + merge in memoria invece di un `select` con relazioni embedded Supabase (`ordini_fornitori(...), magazzino(nome), fornitori(nome,telefono,email)`). Non è stato toccato. Impatto: 3 round-trip DB invece di 1 ogni volta che si carica `/ordini`; con `limit(200)` il costo è contenuto ma resta un pattern da correggere prima che il volume cresca.

### 2.5 — GSAP in package.json ma 0 import — **RISOLTO**
```bash
grep -n "gsap" package.json → nessun risultato
```
GSAP è stato completamente rimosso dalle dipendenze. `dependencies`/`devDependencies` non lo contengono più. Bundle waste eliminato.

---

## 3. Nuova ricognizione richiesta

### 3.1 CSRF su route dinamiche `[id]` — **RISOLTO / confermato completo**
```bash
find src/app/api -path "*\[id\]*route.ts" | wc -l   → 35 route trovate
# per ognuna con PATCH/DELETE/PUT: verificata presenza isSameOrigin
→ 0 route mancanti (loop completato su tutte le 35, nessun MISSING)
```
Verifica mirata sulle due route esplicitamente citate come sospette a maggio:
```bash
grep -l isSameOrigin "src/app/api/lavori/[id]/route.ts" "src/app/api/fatture/[id]/route.ts"
→ entrambe presenti
```
Il problema #3 (LOW-MEDIUM) dell'audit precedente è **chiuso**. Tutte le 35 route dinamiche mutative fanno il check `isSameOrigin()`.

### 3.2 RLS policy consistency
```bash
grep -rn "auth.current_lab_id" src/ supabase/ → 0 occorrenze applicative
```
`supabase/migrations/MANUAL_000_auth_helpers.sql:6` contiene solo un commento che documenta esplicitamente di NON usare `auth.current_lab_id()`. Naming coerente con la regola del progetto (`public.current_lab_id()`), nessuna regressione trovata.

### 3.3 Nuove vulnerabilità / debito da Design System v2.3
- `dangerouslySetInnerHTML` presente in un solo punto (`src/components/layout/ThemeInitializer.tsx:13`), con commento esplicito che documenta che il contenuto è una stringa statica (script di init tema), non input utente. Rischio nullo, correttamente annotato.
- Nessun uso di `eval()` / `new Function()` nel codebase applicativo.
- Nessun uso di `getServiceClient()` (service-role, bypassa RLS) in componenti `'use client'` — la separazione server/client per il service client resta corretta.
- Non individuato debito tecnico specifico introdotto dal Design System v2.3 lato type-safety o sicurezza; l'impatto v2.3 sembra confinato a token/CSS, coerente con quanto dichiarato nel CLAUDE.md di progetto.
- **Nota collaterale non richiesta ma rilevante:** esistono due git worktree paralleli non mergiati (`.claude/worktrees/plan-c-dashboard-rbac/`, `.claude/worktrees/dashboard-v2-rewrite/`) con copie proprie di `tests/unit/*`. Non impattano lo score (lavoro isolato, non in `src/` principale) ma vanno tracciati per evitare drift silenzioso tra branch.

### 3.4 Roadmap V1.9 — stato reale del codice per gli item "⏳"

| Item roadmap | Stato dichiarato | Stato codice reale |
|---|---|---|
| **Dettatura vocale (Web Speech API)** | ⏳ | **Non iniziato.** `grep -rn "SpeechRecognition\|webkitSpeechRecognition" src/` → 0 risultati. Nessuna UI, nessun hook. Stato roadmap accurato. |
| **Email template branding (Supabase)** | ⏳ **← PROSSIMO (S4)** | **Bozza pronta, non applicata.** `docs/email-templates-supabase.md` (27 righe) contiene già l'HTML branded per "Confirm Signup" e "Reset Password" con istruzioni per l'applicazione manuale sul dashboard Supabase Auth Templates. Manca solo il passo manuale di configurazione (non è un task di codice). Stato roadmap accurato. |
| **Logo + firma DdC** | ⏳ | **Codice già implementato, roadmap disallineata.** `src/components/features/pdf/DdcTemplate.tsx:246,294-296` renderizza `lab.logo_print_url ?? lab.logo_url` come `<Image>`; righe 465-472 renderizzano `ddc.firma_ddc_storage_path` come immagine firma con fallback a linea vuota. `src/app/api/impostazioni/route.ts:39,45,111` espone `logo_url`, `logo_print_url`, `firma_ddc_url`, `sfondo_ddc_url` nell'allowlist PATCH, e la UI in `src/app/(app)/impostazioni/page.tsx` li gestisce. **Unico pezzo mancante:** `generate-ddc.ts:60` ha `firma_ddc_sha256: null` hardcoded — l'hash di integrità della firma non è calcolato, quindi manca la parte di *evidenza di integrità* della firma digitale ai fini MDR, anche se il rendering visivo funziona. La roadmap dovrebbe essere aggiornata da ⏳ a "quasi completo — manca hash integrità" invece di "non iniziato". |

---

## 4. Confronto esplicito con la baseline (7.2 → 7.6, target 9+ non raggiunto)

| Area | Score maggio | Score luglio | Delta | Nota |
|---|---|---|---|---|
| Sicurezza API | 8/10 | 8.5/10 | +0.5 | CSRF ora confermato completo su tutte le 35 route `[id]` |
| Type Safety | 7/10 | 6.5/10 | -0.5 | `any` ridotti (base comparabile ~16, vedi §2.2) ma il CRITICO resta aperto e ora *mascherato* da `eslint-disable`, il che è peggio dal punto di vista della governance del debito (non più visibile a `eslint --max-warnings 0`) |
| Performance | 6.5/10 | 6.5/10 | = | GSAP rimosso (+), ma `/ordini` N+1-style invariato (=) |
| Test Coverage | 6/10 | 6.5/10 | +0.5 | 157 test (vs 141), nuova suite MDR content-validation sul DdC; ma i due flussi esplicitamente a rischio (Stripe webhook, `orchestraConsegna`) restano a 0% |
| Error Handling | 7.5/10 | 7.5/10 | = | Non verificato in dettaglio in questo giro, nessuna regressione riscontrata durante l'analisi |
| Code Organization | 8/10 | 8/10 | = | Non riverificato in profondità (fuori scope del re-audit puntuale) |
| Dependency Hygiene | 9/10 | 9/10 | = | GSAP rimosso, nessuna dipendenza obsoleta rilevata; nessuna CVE nota verificata in questo giro |
| DevOps/CI-CD | 8/10 | 8/10 | = | `tsc`/`vitest`/`eslint` tutti verdi con output reale (0 errori, 157/157 test, 0 warning); husky pre-commit presente; nessun controllo aggiuntivo di secrets-scanning trovato |

**Media 8 categorie: (8.5+6.5+6.5+6.5+7.5+8+9+8)/8 = 60.5/8 = 7.56 ≈ 7.6/10**

**Score Tecnico complessivo: 7.6/10** (+0.4 vs 7.2/10, calcolato sulla stessa media di 8 categorie della baseline)

Il target 9+/10 richiede, in ordine di priorità: (1) fix reale — non soppressione lint — degli 11 `as any` (12 cast) nei PDF MDR con validazione a runtime; (2) almeno una suite di test per `orchestraConsegna` e per il webhook Stripe (idempotency, retry, mapping evento→lab); (3) sostituzione del workaround `/ordini` con una singola query Supabase con relazioni embedded. Nessuno di questi tre blocchi è stato toccato nel periodo maggio→luglio nonostante fossero le raccomandazioni Sprint 1 esplicite dell'audit precedente.

---

## 5. Raccomandazioni aggiornate (invariate rispetto a maggio dove non risolte)

### Sprint 1 (ancora aperto)
1. **[CRITICO/COMPLIANCE]** Rimuovere i 9 cast-renderer `as any` nei PDF generator (`generate-ddc.ts:73`, `generate-dpa.ts:49`, `generate-ifu.ts:42`, `generate-buono.ts:28`, `generate-etichetta.ts:61,81`, `generate-nomina-prrc.ts:24`, `generate-ricevuta-consegna.ts:42`, `generate-cedolino-tecnico.ts:127`) — sostituire con interfacce tipizzate + funzione `validate*Props()` che lancia eccezione su dati incompleti. Il commento `eslint-disable` va rimosso insieme al cast, non lasciato come mitigazione permanente. Separatamente, correggere i 2 cast di accesso dati in `generate-ddc.ts:45,63` tipizzando correttamente le relazioni `paziente`/`lab`.
2. **[TESTING]** Aggiungere test per `orchestraConsegna` (`src/lib/consegna/orchestrate.ts`) e per `src/app/api/stripe/webhook/route.ts` (mock Stripe SDK, verifica idempotency su `stripe_events`, verifica comportamento su fallimento post-insert).
3. **[TYPING]** Sostituire i 4 `as any` in `orchestrate.ts`/`precheck.ts` con tipi di dominio corretti per `lavoro`/`cliente`/`paziente` — sono nello stesso modulo non testato, doppio rischio.
4. **[COMPLIANCE]** Calcolare `firma_ddc_sha256` in `generate-ddc.ts:60` invece di hardcodare `null` — completare l'evidenza di integrità della firma già renderizzata visivamente.

### Sprint 2
5. **[PERFORMANCE]** Sostituire il workaround JS-side in `src/app/(app)/ordini/page.tsx:58-100` con un singolo `select` Supabase con relazioni embedded (`fornitori(...)`, `magazzino(...)`).
6. **[DOCS/ROADMAP]** Aggiornare `ROADMAP-UFFICIALE.md` per "Logo + firma DdC": non è ⏳ non iniziato, il rendering è implementato — resta solo l'hash di integrità.
7. **[HYGIENE]** Rivedere se i due worktree paralleli (`plan-c-dashboard-rbac`, `dashboard-v2-rewrite`) sono ancora attivi o vanno chiusi/mergiati per evitare drift.

---

## Verdetto Finale

Progresso reale ma parziale. Due problemi della baseline sono genuinamente chiusi (GSAP, CSRF), uno è migliorato in quantità ma non nella sostanza (gli `any` critici nei PDF sono stati silenziati via lint-disable, non risolti — il rischio di compliance MDR segnalato a maggio è identico oggi), due sono completamente invariati (query `/ordini`, coverage test sui flussi critici Stripe/consegna). Il target 9+/10 richiede di affrontare esattamente i tre blocchi che sono rimasti fermi da maggio: type-safety reale sui PDF MDR, test sui flussi che muovono denaro e consegne, query `/ordini` corretta.

**Score Tecnico Complessivo: 7.6/10** (baseline 7.2/10, target 9+/10 — non raggiunto)

---

**Report generato il 2 luglio 2026 — re-audit di follow-up, solo analisi codice (no browser).**

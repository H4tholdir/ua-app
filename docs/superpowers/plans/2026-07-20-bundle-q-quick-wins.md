# Bundle Q — Quick wins §A/§O Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere 11 quick-win ratificati (A1, A3, A5, A6-res, A7, A8-push, A9, A12, A17-res, O1c-parti, O1f) in un worktree unico con TDD.

**Architecture:** Solo fix puntuali su file esistenti: 2 route API guadagnano un side-effect push fire-and-forget (helper `triggerPush*` esistenti), il resto sono fix client/asset. Nessuna migration, nessun contratto API modificato.

**Tech Stack:** Next.js 16 App Router, Supabase (service client), vitest + Testing Library, web-push già configurato.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-20-bundle-q-quick-wins-design.md` (ratificata; riserve advisor integrate).
- MAI nome paziente in payload push (GDPR Art. 9).
- I mock dei context nei test DEVONO includere `lab` (guard N13, vedi `tests/unit/` esistenti per il pattern).
- Animazioni/colori SOLO da token; superfici v2.3 restano v2.3, superfici v3 restano v3.
- Commit frequenti sul branch del worktree; MAI push finché la review finale non è passata.
- Comandi verifica: `npx vitest run <file>` per task, FASE 7 completa nel task finale.

---

### Task 0: Worktree

**Files:** nessuno (setup).

- [ ] **Step 1:** `git worktree add .claude/worktrees/bundle-q -b worktree-bundle-q-quick-wins` da `ua-app/`.
- [ ] **Step 2:** copiare `.env.local` nel worktree (gitignored, non ereditato — lezione B8): `cp .env.local .claude/worktrees/bundle-q/.env.local`
- [ ] **Step 3:** baseline: `npm install` se serve, poi `npx vitest run` → atteso: 2008 pass | 19 skipped (baseline 17/07). Annotare l'esito.

### Task 1: A5 — theme_color PWA

**Files:**
- Modify: `public/manifest.json:7-8`
- Modify: `public/offline.html:6` (+ CSS body)

Asset statici: niente unit test (nessun runtime da testare); la verifica è grep + build nel task finale.

- [ ] **Step 1:** in `manifest.json`: `"background_color": "#DDD8D3"` (bg light da `src/design-system/tokens.ts:8`), `"theme_color": "#D90012"`.
- [ ] **Step 2:** in `offline.html`: `<meta name="theme-color" content="#D90012">`; nel CSS: `body { background: #DDD8D3; color: #1C1916; ... }`, `p { color: #4A3D33; ... }`, `.retry { background: #D90012; color: #FFFFFF; ... }` (via il gold su blu, fuori palette).
- [ ] **Step 3:** verifica: `grep -rn "0F1E52\|D4A843" public/manifest.json public/offline.html` → atteso: nessun match.
- [ ] **Step 4:** commit `fix(pwa): theme_color e splash allineati al brand (#D90012 / panna) — A5`

### Task 2: A6-res — gold come testo in /qualita

**Files:**
- Modify: `src/app/(app)/qualita/page.tsx:25`

- [ ] **Step 1:** `lieve: 'var(--gold, #D4A843)'` → `lieve: 'var(--c-amber, #B45309)'` (fallback = valore di `--c-amber` in `globals.css`; verificarlo lì e usare quello esatto).
- [ ] **Step 2:** `bash scripts/check-ds-compliance.sh` → atteso: nessuna violazione gold-testo su questo file.
- [ ] **Step 3:** commit `fix(qualita): gravità lieve usa --c-amber, mai --gold come testo — A6`

### Task 3: A3 — guard prefill passkey

**Files:**
- Modify: `src/app/(auth)/login/login-form.tsx:~193` (blocco `savedEmail`)
- Test: `tests/unit/login-passkey-prefill.test.tsx` (nuovo)

- [ ] **Step 1 (RED):** test che monta `LoginForm` con `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable` mockata come promise controllabile e `localStorage.ua_passkey_email = 'salvata@lab.it'`; l'utente digita `mia@lab.it` nel campo email PRIMA di risolvere la promise; poi si risolve con `true`; atteso: il campo vale ancora `mia@lab.it`. Secondo caso: campo vuoto → dopo resolve vale `salvata@lab.it` e il flusso bio resta abilitato.
- [ ] **Step 2:** run → FAIL (il primo caso trova `salvata@lab.it`).
- [ ] **Step 3 (GREEN):**
```tsx
const savedEmail = localStorage.getItem(PASSKEY_EMAIL_KEY)
if (savedEmail) {
  // Non sovrascrivere un'email già digitata (race mount→promise, device condivisi — A3)
  setEmail(prev => (prev === '' ? savedEmail : prev))
  setHasSavedPasskey(true)
}
```
- [ ] **Step 4:** run → PASS. Verificare che i test N14 esistenti su login restino verdi (`npx vitest run tests/unit/ -t login` o file dedicati).
- [ ] **Step 5:** commit `fix(auth): il prefill passkey non sovrascrive l'email digitata — A3`

### Task 4: A9 — copy successo richiesta

**Files:**
- Modify: `src/components/features/portale/RichiestaClientForm.tsx:207,214`
- Test: aggiornare l'eventuale test esistente del form (cercare in `tests/unit/`); altrimenti aggiungere assert sul testo in `tests/unit/richiesta-client-form-copy.test.tsx`.

- [ ] **Step 1 (RED):** assert: la schermata successo contiene «la esaminerà e ti contatterà per la conferma» e NON contiene «ha ricevuto la tua richiesta».
- [ ] **Step 2 (GREEN):** riga 207-208: `Il laboratorio <strong>{labNome}</strong> la esaminerà e ti contatterà per la conferma.`; rimuovere il `<p>` a riga ~214 («Ti contatteranno per la conferma.») spostando il suo margine sul paragrafo precedente (`margin: '0 0 32px'`).
- [ ] **Step 3:** run → PASS · commit `fix(portale): copy successo richiesta senza contraddizione — A9`

### Task 5: A7 — link incrociati portale ↔ richiedi

**Files:**
- Modify: `src/app/portale/[token]/page.tsx` (header/zona azioni, accanto a «Condividi»)
- Modify: `src/components/features/portale/RichiestaClientForm.tsx` (schermata successo)
- Test: estendere `tests/unit/richiesta-client-form-copy.test.tsx` (link ritorno); portale page è RSC → verifica nel task finale via build + QA.

**Interfaces:** stesso `portale_token` per entrambe le route (verificato: `clienti.portale_token`). `RichiestaClientForm` riceve già il token (verificare nome prop nel file; se assente, derivarlo da `useParams()`).

- [ ] **Step 1 (RED):** test: schermata successo contiene un link con `href="/portale/<token>"` e testo «← Torna allo stato lavori».
- [ ] **Step 2 (GREEN, form):** nella schermata successo, sotto il bottone reset, aggiungere:
```tsx
<a href={`/portale/${token}`} style={{ display: 'inline-block', marginTop: '16px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--t1, #1C1916)', textDecoration: 'underline', minHeight: '44px', lineHeight: '44px' }}>
  ← Torna allo stato lavori
</a>
```
- [ ] **Step 3 (GREEN, portale):** in `portale/[token]/page.tsx` aggiungere accanto/sotto le azioni esistenti un link `href={`/richiedi/${token}`}` con testo «➕ Richiedi nuovo lavoro», stile copiato dal bottone/link esistente della stessa pagina (superficie neomorphic fuori-app; riusare le classi/style inline già presenti, touch ≥44px).
- [ ] **Step 4:** run test → PASS · commit `feat(portale): navigazione incrociata portale ↔ richiedi — A7`

### Task 6: A12 — a11y ClienteComboBox

**Files:**
- Modify: `src/components/features/clienti/ClienteComboBox.tsx` (props + input)
- Modify: `src/components/features/lavori/form/TabDati.tsx:113-119`
- Modify: `src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx:~174` (stesso pattern; verificare l'id dell'errore lì)
- Test: `tests/unit/cliente-combobox-a11y.test.tsx` (nuovo)

**Interfaces:** nuova prop opzionale `errorId?: string` su `ClienteComboBoxProps`.

- [ ] **Step 1 (RED):** test: render con `hasError` e `errorId="error-cliente_id"` → l'input ha `aria-invalid="true"` e `aria-describedby="error-cliente_id"`; senza `hasError` → nessuno dei due attributi.
- [ ] **Step 2 (GREEN):** aggiungere a `ClienteComboBoxProps` `errorId?: string`; sull'`<input>`:
```tsx
aria-invalid={hasError || undefined}
aria-describedby={hasError && errorId ? errorId : undefined}
```
- [ ] **Step 3:** in `TabDati.tsx` passare `errorId="error-cliente_id"` (lo span d'errore ha già quell'id, riga 122). In `ModificaRigaSheet.tsx` fare lo stesso con l'id del suo messaggio d'errore (aggiungere l'id allo span se manca).
- [ ] **Step 4:** run → PASS · commit `fix(a11y): aria-invalid/aria-describedby su ClienteComboBox — A12`

### Task 7: A17-res — hydration AnnullaConsegnaBanner

**Files:**
- Modify: `src/components/features/lavori/AnnullaConsegnaBanner.tsx:15-33`
- Test: `tests/unit/annulla-consegna-banner.test.tsx` (se esiste, estendere)

- [ ] **Step 1 (RED):** test: al primo render (pre-effect, usare fake timers) il componente NON mostra un countdown calcolato da `Date.now()` ma il placeholder; dopo il mount (act/effect) mostra mm:ss corretto per una `dataConsegnaEffettiva` nota.
- [ ] **Step 2 (GREEN):** stato iniziale `null` (= non ancora calcolato), calcolo nel `useEffect`:
```tsx
const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

useEffect(() => {
  const elapsed = Date.now() - new Date(dataConsegnaEffettiva).getTime()
  setSecondsLeft(Math.max(0, Math.floor((FINESTRA_ANNULLO_MS - elapsed) / 1000)))
}, [dataConsegnaEffettiva])
```
Il tick esistente parte solo quando `secondsLeft !== null`; render: `if (secondsLeft === null) return null` (il banner appare al mount, un frame dopo — niente mismatch SSR/client); `if (secondsLeft <= 0 || annullato) return null` resta.
- [ ] **Step 3:** run → PASS · commit `fix(lavori): countdown AnnullaConsegnaBanner fuori dal render iniziale — A17`

### Task 8: A1 — push su assegnazione tecnico

**Files:**
- Modify: `src/app/api/lavori/[id]/route.ts` (PATCH: select `existing` + trigger post-update)
- Test: estendere il test esistente della route PATCH lavori in `tests/unit/` (trovarlo con `grep -rl "api/lavori" tests/unit/`)

**Interfaces:** `triggerPushToUser(user_id, laboratorio_id, {title, body, url})` da `@/lib/notifications/trigger` (fire-and-forget, silent on error). NOTA: `tecnici.id ≠ utenti.id`? VERIFICARE: `triggerPushToUser` filtra `push_subscriptions.user_id`; controllare se `lavori.tecnico_id` referenzia `tecnici.id` e in tal caso risolvere lo `utenti.id` del tecnico (select su `tecnici` colonna user/utente) prima del trigger. Il pattern funzionante è in `prove/route.ts:225` — copiarne la risoluzione.

- [ ] **Step 1 (RED):** test: PATCH con `tecnico_id` nuovo → `triggerPushToUser` (mockato) chiamato una volta con body contenente il numero lavoro e MAI il nome paziente; PATCH senza cambio `tecnico_id` (stesso valore) o con `tecnico_id: null` → mai chiamato; errore del push (mock reject) → la risposta resta 200.
- [ ] **Step 2 (GREEN):** ampliare la select di `existing` (riga ~189): `.select('incluso_in_fattura, tecnico_id, numero_lavoro')`. Dopo l'update riuscito (riga ~268):
```ts
if (payload.tecnico_id && payload.tecnico_id !== existing.tecnico_id) {
  // fire-and-forget — mai bloccare la risposta (pattern prove/route.ts)
  void notificaAssegnazione(svc, payload.tecnico_id, context.laboratorioId, existing.numero_lavoro)
}
```
con `notificaAssegnazione` piccola funzione locale che risolve l'eventuale mapping tecnici→utenti e chiama `triggerPushToUser(..., { title: 'Nuovo lavoro assegnato', body: `Il lavoro n.${numero} è stato assegnato a te`, url: `/lavori/${id}` })`.
- [ ] **Step 3:** run → PASS (incluso il caso lab-guard: i mock context hanno già `lab`).
- [ ] **Step 4:** commit `feat(lavori): push al tecnico su assegnazione lavoro — A1`

### Task 9: A8 — push al lab su richiesta dal portale

**Files:**
- Modify: `src/app/api/portale/richiedi/route.ts` (dopo insert riuscito, prima del 201)
- Test: estendere il test esistente della route (`grep -rl "portale/richiedi" tests/unit/`)

**Interfaces:** `triggerPushByRole(laboratorio_id, ruolo, payload)` — una chiamata per `'titolare'` e una per `'front_desk'`.

- [ ] **Step 1 (RED):** test: POST valido → `triggerPushByRole` chiamato per titolare E front_desk, body con nome studio/dentista e tipo lavoro, MAI paziente/`paziente_codice_richiesta`; POST che fallisce l'insert → mai chiamato; push reject → risposta resta 201; POST oltre rate-limit (mock count ≥10) → 429 e mai chiamato.
- [ ] **Step 2 (GREEN):** dopo l'insert riuscito:
```ts
const pushPayload = {
  title: 'Nuova richiesta dal portale',
  body: `${nomeStudioODentista} ha richiesto: ${body.tipo_dispositivo} (n.${numero_lavoro})`,
  url: `/lavori/${lavoro.id}`,
}
void triggerPushByRole(labId, 'titolare', pushPayload)
void triggerPushByRole(labId, 'front_desk', pushPayload)
```
`nomeStudioODentista`: la route ha già i dati cliente della verifica token (ampliare la select del punto 3 con `studio_nome, nome, cognome` se non già presenti; usare `studio_nome ?? \`${nome} ${cognome}\``).
- [ ] **Step 3:** run → PASS · commit `feat(portale): push a titolare/front_desk su nuova richiesta — A8`

### Task 10: O1c — tre fix a11y v3

**Files:**
- Modify: `src/components/features/tutto-il-resto/TuttoIlResto.tsx:62`
- Modify: `src/components/features/pile/PilaAperta.tsx:85-86`
- Modify: `src/components/ds/CardLavoro.tsx` (guard dev)
- Test: estendere i test esistenti dei tre componenti (in `tests/unit/ds-v3/componenti/` e `tests/unit/`)

- [ ] **Step 1 (RED):** tre assert: (a) la card «Tutto il resto» ha `aria-label` = `"<nome>. <sub>"`; (b) con ricerca aperta esiste un bottone `aria-label="Chiudi ricerca"` che riporta a `RigaCerca` (dopo click il campo sparisce e riappare la riga); (c) `CardLavoro` con `conferma` E `onConsegna` insieme emette `console.warn` in dev (spy) e non in produzione (`vi.stubEnv('NODE_ENV','production')`).
- [ ] **Step 2 (GREEN a):** `aria-label={s.sub ? `${s.nome}. ${s.sub}` : s.nome}`.
- [ ] **Step 3 (GREEN b):** in `PilaAperta`, quando `cerca !== null`, affiancare a `CampoTesto` un `TastoTondo` (già importato) `glifo="×" etichettaAria="Chiudi ricerca" onClick={() => setCerca(null)}` in un wrapper flex `gap: 10, alignItems: 'center'` (il CampoTesto prende `flex: 1`).
- [ ] **Step 4 (GREEN c):** in `CardLavoro`, all'inizio del componente:
```tsx
if (process.env.NODE_ENV !== 'production' && conferma && onConsegna) {
  console.warn('CardLavoro: conferma e onConsegna sono mutuamente esclusivi — onConsegna ignorato')
}
```
(coerente con la precedenza già implementata a type-level; verificare quale variante vince nel file e allineare il messaggio).
- [ ] **Step 5:** run → PASS · commit `fix(a11y): sub udibile, chiusura ricerca, warn dev CardLavoro — O1c`

### Task 11: O1f — segnale «tecnico senza anagrafica»

**Files:**
- Modify: `src/lib/dashboard/striscia.ts` (input + 2 candidati + gerarchie)
- Modify: il chiamante che costruisce l'input striscia (trovarlo: `grep -rn "getStriscia\|StrisciaInput" src/lib/dashboard/ src/app/(app)/dashboard/`) per passare i nuovi campi
- Test: estendere `tests/unit/` del modulo striscia (`grep -rl "striscia" tests/unit/`)

**Interfaces:** estendere l'input `i` con `senzaAnagrafica?: boolean` (già calcolato da `getPerimetroHome`, va solo propagato) e `tecniciSenzaAnagrafica?: string[]` (nomi; nuova query lato titolare: utenti attivi `ruolo='tecnico'` non-deleted del lab senza riga `tecnici` — LEFT JOIN o due select confrontate, scoped `laboratorio_id`).

- [ ] **Step 1 (RED):** test: (a) input tecnico con `senzaAnagrafica: true` → striscia = segnale attenzione «Il tuo account non è ancora configurato — avvisa il titolare», che vince su s9 e anche su s2-s8 (pile comunque vuote in quel caso); (b) input titolare con `tecniciSenzaAnagrafica: ['Marco']` e nessun segnale s1-s7 attivo → «Account di Marco da completare» con azione verso `/tecnici`; con s1 attivo → vince s1; (c) input titolare senza tecnici scoperti → s8/s9 come oggi.
- [ ] **Step 2 (GREEN):**
```ts
const sTecAccount: Candidato = (i) => i.senzaAnagrafica
  ? { attenzione: true, forte: 'Il tuo account', testo: 'non è ancora configurato — avvisa il titolare', azione: null }
  : null
const sTitTecnici: Candidato = (i) => i.tecniciSenzaAnagrafica?.length
  ? { attenzione: true, forte: `Account di ${i.tecniciSenzaAnagrafica[0]}`, testo: 'da completare', azione: { etichetta: 'Apri ›', href: '/tecnici' } }
  : null
```
Gerarchie: `tecnico: [sTecAccount, s2, s3, s4, s6, s8, s9]` · `titolare/admin_rete: [s1..s7, sTitTecnici, s8, s9]` (front_desk invariato).
- [ ] **Step 3:** propagare i dati nel chiamante (perimetro già disponibile per il tecnico; per il titolare aggiungere la query al punto in cui si compone l'input striscia, stessa transazione di dati della home — Promise.all esistente).
- [ ] **Step 4:** run → PASS · commit `feat(dashboard): segnale striscia per tecnico senza anagrafica — O1f`

### Task 12: FASE 7 + riesame

- [ ] **Step 1:** `npx tsc --noEmit` → 0 errori.
- [ ] **Step 2:** `npx vitest run` → tutti verdi (baseline 2008+nuovi | 19 skipped).
- [ ] **Step 3:** `npx next build` → pulita.
- [ ] **Step 4:** `bash scripts/check-ds-compliance.sh` → pulito.
- [ ] **Step 5:** review finale whole-branch (superpowers:requesting-code-review), fix eventuali finding, poi STOP: QA browser (FASE 9, lab E2E `00000000-…-0001`), merge e deploy secondo processo.

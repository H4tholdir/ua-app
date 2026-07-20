# Bundle Q — Quick wins §A/§O (design)
**Data:** 20/07/2026 · **Origine:** censimento `docs/roadmap/2026-07-20-censimento-a-o.md` (ratificato da Francesco, ordine delegato e certificato) · **Panel §0C:** già eseguito sul triage (3× conferma con riserve, integrate qui)

## Perimetro

11 fix piccoli, nessuna migration, nessuna nuova pagina. Un worktree, TDD per item, deploy unico. Le route API toccate esistono già (guard N13 già presente); nessun contratto API cambia — solo side-effect additivi (push) e fix client.

**FASE 3 — validazione architetturale:** Tenant isolation: nessuna modifica RLS; push helpers scoped per `laboratorio_id` (verificato in `trigger.ts`). Schema drift: nessuna migration. API contract: invariato (side-effect push non cambia payload/status). Rollback: revert del merge, zero dati. Dominio critico: A3 tocca la superficie di login (solo guard UI client, nessuna logica auth) → trattato col rigore del percorso completo (worktree + TDD + review finale whole-branch).

## Design per item

### A1 — Push su assegnazione lavoro al tecnico
In `PATCH /api/lavori/[id]`: prima dell'update leggere il `tecnico_id` corrente (la route fa già un fetch di verifica); dopo update riuscito, se `tecnico_id` è cambiato ed è non-null → `triggerPushToUser(tecnico_id, laboratorio_id, payload)` fire-and-forget (pattern identico a `prove/route.ts:225`). Payload GDPR-safe: titolo «Nuovo lavoro assegnato», body con solo numero lavoro (MAI paziente). Nessun push su de-assegnazione (null).

### A3 — Guard prefill passkey (login)
`login-form.tsx` (~riga 191-196): il prefill da `localStorage.ua_passkey_email` non deve sovrascrivere input utente. Fix: `setEmail(prev => prev === '' ? savedEmail : prev)` (updater funzionale → immune alla race mount→promise). Nessun altro cambiamento alla logica N14.

### A5 — theme_color PWA
`public/manifest.json`: `theme_color` → `#D90012`; `background_color` → il bianco panna di sfondo light dell'app (valore esatto da `src/design-system/tokens.ts`, NON hardcodato a mano da altra fonte) — splash coerente col primo paint. `public/offline.html`: `<meta name="theme-color">` → `#D90012` e sfondo body allineato allo stesso panna.

### A6-residuo — Gold come testo in /qualita
`qualita/page.tsx:25`: `gravitaColor.lieve` da `var(--gold, #D4A843)` → `var(--c-amber)` (palette rainbow v2.3, contrasto conforme). Nessun altro uso del lookup cambia.

### A7 — Link incrociati portale ↔ richiedi
Stesso `portale_token` per entrambe le route (verificato). In `/portale/[token]`: CTA «➕ Richiedi nuovo lavoro» → `/richiedi/[token]`. In `RichiestaClientForm` (schermata successo): link «← Torna allo stato lavori» → `/portale/[token]` (il form riceve già il token). Stile: pattern esistenti della pagina (superficie fuori app, non DS v3).

### A8 — Push al lab su richiesta dal portale
In `POST /api/portale/richiedi`, dopo insert riuscito: `triggerPushByRole(lab_id, 'titolare', payload)` + `triggerPushByRole(lab_id, 'front_desk', payload)`, fire-and-forget. Payload: «Nuova richiesta dal portale» + nome studio/dentista e tipo lavoro — MAI nome paziente (Art. 9 GDPR, push via APNs/FCM). **Guard anti-flood (riserva advisor, route pubblica):** SODDISFATTA da quanto già esiste — la route ha già un rate-limit per cliente (max 10 richieste/24h → 429, `richiedi/route.ts` step 5) che bounda anche il push; nessuna guardia aggiuntiva (YAGNI). Il push parte solo dopo insert riuscito, quindi mai oltre quel tetto. La parte email Resend resta fuori (decisione separata, da prendere a breve).

### A9 — Copy schermata successo richiesta
`RichiestaClientForm.tsx:206,214`: un solo messaggio coerente: «Richiesta inviata! Il laboratorio {labNome} la esaminerà e ti contatterà per la conferma.» (rimosso «ha ricevuto» come stato compiuto; la conferma resta esplicitamente futura).

### A12 — A11y ClienteComboBox
`ClienteComboBox.tsx`: aggiungere `aria-invalid={hasError || undefined}` e `aria-describedby` verso l'id del messaggio d'errore, replicando il pattern degli altri campi dello stesso form (TabDati); se il messaggio d'errore non ha id, assegnarlo. Nessun cambiamento visivo.

### A17-residuo — AnnullaConsegnaBanner hydration
`AnnullaConsegnaBanner.tsx:15-18`: il calcolo `Date.now() - getTime()` esce dal render iniziale: stato iniziale neutro (countdown pieno o placeholder `--:--`), calcolo reale in `useEffect` al mount. Comportamento e scadenza invariati.

### O1c-parti — A11y follow-up v3
1. `TuttoIlResto.tsx:62`: `aria-label={s.sub ? `${s.nome}. ${s.sub}` : s.nome}` — il sub torna udibile agli screen reader.
2. `PilaAperta.tsx`: affordance per richiudere la ricerca aperta → bottone «×» (touch ≥44px, `aria-label="Chiudi ricerca"`) che fa `setCerca(null)`; visivamente minimale, coerente coi ghost-control della pagina v3.
3. `CardLavoro.tsx`: `console.warn` dev-only (`process.env.NODE_ENV !== 'production'`) quando conferma/onConsegna vengono esclusi.

### O1f — Segnale «tecnico senza anagrafica»
Due lati, dati già disponibili server-side:
1. **Lato tecnico:** in `striscia.ts`, quando `getPerimetroHome` risolve `senzaAnagrafica`, nuovo segnale (prioritario su s9 sereno): «Il tuo account non è ancora configurato — avvisa il titolare». Niente pile finte, nessun cambiamento al fail-closed.
2. **Lato titolare:** nella pipeline striscia del titolare, query leggera: utenti `ruolo='tecnico'` attivi non-deleted senza riga `tecnici` → segnale «Account di {nome} da completare» (nome utente = dato interno al lab, nessun problema GDPR). Posizione nella gerarchia segnali: sotto i segnali di consegna/pagamento, sopra il sereno s9.

## Testing
TDD per item: unit test per ogni fix con caso negativo (es. A1: nessun push se tecnico invariato/null; A8: push saltato oltre soglia, richiesta comunque 201; A3: input digitato non sovrascritto; O1f: precedenza segnali). I mock dei context includono `lab` (vincolo N13). FASE 7 completa (tsc + vitest + build) prima della review.

## Fuori scope esplicito
Email Resend per A8 (decisione separata) · gestione preferenze push (riserva UX registrata, candidata a sessione dedicata) · qualunque item dei bundle T/E o del mini-triage design.

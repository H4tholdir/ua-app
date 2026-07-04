# UÀ — Roadmap Ufficiale
**Ultimo aggiornamento:** 04 luglio 2026 — **S4 (Email template branding): HTML rebrand DS v2.3 finalizzato e committato (`01e915c`), applicazione su Supabase Dashboard resta manuale** (nessuna sessione Chrome/API disponibile per farlo da Claude). B9 risolto (`ea2a3a9`) — lista pazienti ora navigabile.
**Fonte di verità:** questo file + MEMORY.md + `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` + `docs/roadmap/FEATURES-E-FLUSSI-2026-07-02.md`

> ⚠️ Questo documento è la **fonte di verità unica** per le decisioni di roadmap.
> Aggiornarlo ad ogni sessione di lavoro.

---

## VERSIONE CORRENTE: V1.9.3 (in produzione) — RE-AUDIT 02/07/2026 COMPLETATO

Il re-audit dell'11 agenti (02/07/2026) ha verificato con codice + test live che **il claim "DS v2.3 compliant al 100%" era falso** (login WCAG-fail, violazioni residue in `qualita/page.tsx`, migrazione palette parziale). Ha inoltre trovato **2 blocker critici nuovi** non coperti dalla roadmap precedente: tracciabilità MDR materiali/lotti strutturalmente rotta, e dati contrastanti tra Dashboard e Scadenzario sui crediti clienti.

**Prima di procedere con qualunque item sotto, leggere `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`** — sostituisce come priorità operativa la sessione S4 originariamente pianificata qui sotto.

---

## 🎨 SESSIONE DESIGN — CHIUSA (28/05/2026)

### ✅ Design System v2.3 — Completato

**Cosa è stato fatto:**
- Spec completa `docs/superpowers/specs/2026-05-27-design-system-v2-3.md`
- Token CSS: t2/t3 WCAG-compliant, alias `--sfc`, rainbow vars `--c-*`
- Token TS: `src/design-system/tokens.ts` — importa da qui, mai inline
- Motion: `src/design-system/motion.ts` v2.1 — 4 categorie, frequency gate
- Enforcement: `scripts/check-ds-compliance.sh` + `.husky/pre-commit`

**Applicato su tutta la PWA:**
- ~70 file: fallback t2/t3 aggiornati
- ~33 file: gold-as-text → `var(--c-amber)`
- ~47 file: shadow inline → `var(--sh-b/c/i/red)` (dark mode ora funziona)
- 14 file: CSS transition timing → `var(--tr)`
- KpiCard, StatoBadge: rainbow semantic colors
- BottomNavPill: CTA → `.ua-tasto-plus` fisico con `::before` corona

**Escluse** (da non toccare): `src/app/(auth)/` · `src/app/admin/`

**Regola DS — OBBLIGATORIA per ogni nuova sessione:**
> Prima di scrivere qualsiasi UI → rispetta `docs/superpowers/specs/2026-05-27-design-system-v2-3.md`.
> Nessun colore/shadow/font/animazione inline. Tutto da token.

---

## 🚨 PROSSIMA SESSIONE → applicazione manuale S4, poi prossimo item backlog

**S4 (Email template branding) — HTML rebrand DS v2.3 pronto, applicazione manuale ancora da fare (04/07/2026, commit `01e915c`).** I 3 template Supabase Auth (Confirm Signup, Reset Password, Invite User) sono stati ridisegnati con palette Warm Panna, logo reale (`ua-logo-email.png`), link di fallback cliccabile/copiabile nascosto sotto spoiler `<details>` — approvati da Francesco in 2 round di feedback su mockup. HTML finale in `docs/email-templates-supabase.md`, decisione in `docs/design/decisions/2026-07-04-s4-email-templates-branding.md`. **Resta da fare:** incollare i 3 blocchi HTML su https://supabase.com/dashboard/project/iagibumwjstnveqpjbwq/auth/templates — non automatizzabile da Claude in questa sessione (nessuna sessione Chrome connessa, nessun tool MCP Supabase espone la config email di Auth). Dettaglio completo: `memory/MEMORY.md` §0.

**B9 è RISOLTO (chiuso 04/07/2026, merge `ea2a3a9`).** Lista pazienti (BUG #13, noto da settimane) ora navigabile: `PazientiSearchList.tsx` usava righe `<li><div>` statiche senza `Link`; la pagina di dettaglio `/pazienti/[id]` esisteva già e funzionava ma era irraggiungibile. Fix minimo (`<Link href>` + pattern flex/chevron gemello di `ClientiSearchList.tsx`), TDD, review "Ready to merge: Yes". Dettaglio completo: `memory/MEMORY.md` §0. Follow-up non bloccante aperto separatamente (`spawn_task task_8422a838`): migrare `PazientiSearchList` al layout `ua-list-grid` per coerenza responsive con `ClientiSearchList`.

**B8 è COMPLETO (5/5, chiuso 04/07/2026).** Tutte e 5 le route del backlog sono risolte e in produzione: magazzino/nuovo (1/5), listino/nuovo (2/5), qualita/rischi/[id] (3/5), rete/nuova (4/5), rete/[id] (5/5, merge `0c3e040`). Il link "Gestisci rete →" ora apre un dettaglio rete funzionante con rinomina, inviti lab-a-rete, rimozione membri e sezione admin. Dettaglio completo B8 (5/5): `memory/MEMORY.md` §0. **Prossima priorità: S4** (Email template branding, bozza HTML già pronta in `docs/email-templates-supabase.md`).

**A4 (Alto, non blocker) è chiuso definitivamente (03/07/2026, merge `4a36f89`).** Cache versioning automatico nel Service Worker: `public/sw.js` è diventato un file generato (gitignored) da `scripts/generate-sw.mjs`, con `CACHE_NAME` legato al build-id (git sha in produzione, `ua-dev` in sviluppo) invece del bump manuale `ua-v1→ua-v2`. Nessun TTL/pulizia cache aggiunto (decisione esplicita in brainstorming — il fix RSC di B2 aveva già eliminato la crescita illimitata). Spec: `docs/superpowers/specs/2026-07-03-a4-cache-versioning-design.md`. Piano: `docs/superpowers/plans/2026-07-03-a4-cache-versioning.md`. Dettaglio completo: `memory/MEMORY.md` §0.

**B7 (blocker critico) è risolto, mergiato su `main` (`fe81be6`) e deployato (03/07/2026).** Il titolare ora può invitare tecnico/front_desk/co-titolare direttamente dall'UI in `/tecnici`; fix incluso della RPC `accept_invite_atomic` che non creava la riga `tecnici` mancante, più un secondo fix di idempotenza (bug di duplicazione righe trovato dalla review finale verificando direttamente su Supabase live). Dettaglio completo: `memory/MEMORY.md` §0. Handoff strutturato per la prossima sessione: `memory/SESSION_ACTIVE.md`.

**B1 e B2 (i 2 blocker critici del re-audit 02/07) sono risolti, mergiati su `main` e deployati.** Da eseguire subito all'avvio della prossima sessione, PRIMA di S4 o di qualunque nuova feature:

```
Leggi docs/roadmap/BACKLOG-TECNICO-2026-07-02.md sezione BLOCKER.
Priorità: procedere con S4 (Email template branding, bozza già pronta in docs/email-templates-supabase.md).

~~B8 — 5 route CRUD che portavano a 404~~ — ✅ COMPLETO 04/07/2026 (magazzino/nuovo, listino/nuovo, qualita/rischi/[id], rete/nuova, rete/[id] tutte risolte e in produzione).
~~B9 — Lista pazienti non navigabile (BUG #13)~~ — ✅ RISOLTO 04/07/2026 (merge `ea2a3a9`).
```

**Storico B1/B2/B7 (per contesto, non richiede più azione):**
- B1 — Tracciabilità MDR materiali/lotti — ✅ RISOLTO 02/07 (commit `31cc47c`)
- B2 — Dashboard/Scadenzario dati contrastanti sui crediti clienti — ✅ RISOLTO e MERGIATO 03/07 (piano 16 task su worktree `b2-contabilita-clienti`, merge `05612ec`). Due round di bug trovati SOLO in verifica finale/review whole-branch (mai in review di singolo task) e corretti prima della chiusura: (1) Task 16 → `scadenzario/route.ts` non nettava `importo_pagato` sulle fatture con pagamento parziale (fix `cbc034b`); (2) review finale sull'intero branch → `scadenzario/route.ts` escludeva i lavori `fatturare`-non-inclusi che le altre superfici contano, e `getContabilitaCliente` non escludeva le fatture bozza (fix `ac48530`). Dettaglio completo in MEMORY.md §0.
- B7 — "Invita tecnico" irraggiungibile da UI — ✅ RISOLTO e MERGIATO 03/07 (piano 12 task su worktree `worktree-b7-invito-collaboratori`, merge `fe81be6`). Bug reale trovato SOLO dalla review finale whole-branch verificando direttamente su Supabase live (stesso pattern di B2: mai nelle review di singolo task): `accept_invite_atomic` duplicava la riga `tecnici` su re-invito+re-accettazione, corretto con una seconda migration (`WHERE NOT EXISTS`) prima del merge. QA e2e reale in browser eseguita post-merge. Dettaglio completo in MEMORY.md §0.
- **Follow-up collegati, risolti in sessione separata (commit `7fc181b`):** bug Service Worker PWA (cache RSC di `router.refresh()`, causava UI stale su tutta l'app dopo mutazioni — scoperto durante B2, backlog A4) + allineamento `BACKLOG-TECNICO-2026-07-02.md` (B2 ✅, A4 🔄 parziale, B7 ✅).

**Nota:** S4 Email template branding resta valida come task (bozza HTML già pronta, manca solo applicazione manuale su Supabase dashboard, 3h) ma non è la priorità — B8/B9 vengono prima.

---

## V1.9 — Completamento Pre-Collaudo
**Priorità:** Massima — da fare PRIMA che Filippo usi l'app seriamente.

| # | Feature | Priorità | Stima | Stato |
|---|---------|----------|-------|-------|
| DS | **Design System v2.3** | P0 | — | ⚠️ **Parziale, non 100%** (re-audit 02/07: login WCAG-fail, 2 violazioni residue in qualita/page.tsx, migrazione palette parziale — vedi backlog B12, A6, M6) |
| 1 | **Dettatura vocale** (Web Speech API) | P0 | 4h | ⏳ Confermato non iniziato (grep SpeechRecognition → 0 risultati) |
| 2 | **Email template branding** (Supabase) | P0 | 3h | ⏳ Bozza HTML pronta in `docs/email-templates-supabase.md`, manca solo applicazione manuale |
| 3 | **Rifacimenti UI** | P0 | 6h | ✅ Completato S2 (26/05/2026) |
| 4 | **Logo + firma DdC** | P0 | 4h | 🟡 **Quasi completo, non ⏳** — rendering già implementato in `DdcTemplate.tsx`; manca solo l'hash SHA-256 di integrità firma (backlog A18) |
| NEW | **2 Blocker critici da re-audit 02/07** (B1 materiali/lotti MDR, B2 dashboard/scadenzario) | 🔴 P0 | non stimato | ✅ Entrambi risolti — B1 (31cc47c, 02/07) · B2 (cbc034b, 03/07, dopo fix del bug residuo trovato in verifica finale), vedi sopra |
~~5 Magazzino visivo → spostato in V2.0~~ |

**Vedi `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` per altri 14 item Blocker, 18 Alto e 30 Medio non elencati qui per brevità.**

---

## V2.0 — Post-Collaudo Filippo
**Priorità:** Alta — sviluppare dopo le prime 2-3 settimane di uso reale
**Trigger:** Filippo usa l'app quotidianamente e dà feedback reali

| # | Feature | Priorità | Note |
|---|---------|----------|------|
| 1 | **Portale dentista V2** | P0 | Comunicazione bidirezionale, ordine lavoro dal portale, download DdC |
| 2 | **Analytics avanzate** | P0 | Top clienti, margine per tipo dispositivo, lead time, tasso rifacimento |
| 3 | **Multi-tier pricing avanzato** | P1 | listino_prezzi_tier con assegnazione per cliente. Ora 4 tier, serve 6+ |
| 4 | **Dettatura vocale avanzata (Whisper)** | P1 | Whisper API OpenAI per accuracy su termini tecnici italiani (~€0.006/min) |
| 5 | **Sezione Rete funzionale** | P1 | Dashboard multi-lab per admin_rete. Architettura: reti + reti_members già in DB |
| 6 | **WhatsApp Cloud API ufficiale** | P2 | Notifiche automatiche (Meta Business + 360dialog/Twilio). Ora solo deep links |
| 7 | **Allegati clinici avanzati** | P2 | Note vocali (audio), file STL scansioni, PDF prescrizione digitale |
| 8 | **Log WhatsApp (agenda_messaggi_clienti)** | P2 | Tracciamento ogni messaggio mandato: data, testo, esito |
| 9 | **Magazzino visivo** (Mixel-inspired) | P2 | Concept C: tile 3 col, 12 glifo SVG, fill-bar semaforo. Toggle lista↔vetrina. Vedi `MAGAZZINO-VISIVO-BRAINSTORM.md` |

---

## V2.1 — AI Assistant
**Priorità:** Alta business value — pricing già pianificato
**Modello:** Stripe metered billing €24,90/mese (1.000 msg) + scaglioni

| # | Feature | Note |
|---|---------|------|
| 1 | **Voce continua** (stile ChatGPT) | Web Speech API V1 → Whisper V2 |
| 2 | **Chat AI** per inserimento dati | "Crea lavoro per Dr. Rossi, corona ceramica urgente" |
| 3 | **TTS risposta** | Web Speech Synthesis gratuita |
| 4 | **Smart routing modelli** | 40% Haiku 4.5 + 60% Sonnet = blended ~€0.008/msg |
| 5 | **Billing metered Stripe** | €24,90/mese base + €11 ogni 1.000 msg extra |
| 6 | **Caching prompt** | 8.000 token system cached → riduce costo input a $0.0024/msg |

---

## V2.2 — Compliance Avanzata MDR
**Trigger:** Se Filippo cerca certificazione ISO 13485 o ha clienti PA

| # | Feature | Note |
|---|---------|------|
| 1 | **CAPA** (Corrective and Preventive Action) | Link a incidenti/non conformità. ISO 13485 |
| 2 | **Fascicolo Tecnico MDR** | 6 tab: specifiche, FMEA, valutazione clinica, test, DdC, PSUR |
| 3 | **PMCF follow-up automatico** | Reminder 6/12 mesi post-consegna. MDR Art. 83 obbligatorio |
| 4 | **Firma Digitale P7M** | Per FatturaPA alla PA (Regioni, ASL). Richiede AgID |
| 5 | **Nota di credito XML (TD04)** | Per correggere fatture già emesse |

---

## V3.0 — Platform Scale
**Trigger:** Secondo cliente + espansione

| # | Feature | Note |
|---|---------|------|
| 1 | **Migrazione DentalMaster completa** | 30 anni storico. FileMaker fp7 → UÀ. Import batch |
| 2 | **Prescrizione digitale dentista** | Form digitale dal portale con firma digitale |
| 3 | **SDI diretto** | Senza PEC. Richiede accordi HUB SDI accreditato |
| 4 | **Terzismo inter-lab** | Lavori in subappalto tra laboratori della rete |
| 5 | **Onboarding self-service** | Nuovo lab si iscrive, paga Stripe, riceve seed automatico |
| 6 | **API pubblica** | Per integratori CAD/CAM, software clinici |
| 7 | **CAD/CAM integration** | Import STL nativi, link scansione digitale in Tab Clinica |
| 8 | **White label** | Lab con marchio proprio |

---

## DECISIONI ARCHITETTURALI PERMANENTI

| Decisione | Rationale |
|-----------|-----------|
| WhatsApp: solo `wa.me` deep links | ToS Meta-compliant. Cloud API solo se serve V2 |
| Tecnici: disattiva (non cancella) | Storico lavori collegato. `lab_memberships.attivo=false` |
| Fatture: generate durante `orchestraConsegna` | `incluso_in_fattura` = discriminatore. No fatturazione separata |
| Pazienti: pseudonimizzazione GDPR | Solo `codice_paziente`, mai nome in WhatsApp/portale |
| Push notifications: lazy-init VAPID | No crash build CI se chiavi mancanti |
| Stack voice V1: Web Speech API nativa | Zero costi. Whisper solo per V2 se serve accuracy |

---

## VANTAGGI COMPETITIVI UNICI (non toccare)

| Vantaggio | vs Competitor |
|-----------|--------------|
| 1-tap CONSEGNA (DdC+Fattura+Stock) | DentalMaster = 6+ click |
| Mobile-first PWA | OrisLab, OdontoSoft, ODIX = solo desktop |
| WhatsApp nativo | Tutti = messaggistica interna |
| WebAuthn passkey (Touch ID) | Nessun competitor |
| SaaS multi-tenant zero IT | Nessun competitor |
| GDPR pseudonimizzazione nativa | DentalMaster = zero |
| Portale dentista senza login | Nessun competitor |
| Numero progressivo DdC nativo | DentalMaster non ce l'ha |

---

## MAGAZZINO VISIVO — Feature Brainstorm (V1.9)
*Da espandere dopo ricerca Mixel — vedi docs/roadmap/MAGAZZINO-VISIVO-BRAINSTORM.md*

---

## STACK DI ORCHESTRAZIONE

Il progetto usa 3 orchestratori in layers:

| Orchestratore | Layer | Quando | Installato |
|--------------|-------|--------|-----------|
| **Superpowers** | Esecuzione TDD + subagenti | Sempre | ✅ (marketplace Anthropic) |
| **gstack** (Garry Tan, YC) | Decisioni strategiche (23 specialisti simulati) | Feature media/grande | ✅ `~/.agents/skills/gstack` |
| **GSD** (Lex Christopherson) | Stabilità spec multi-sessione | Feature grande (10+ file) | ⚠️ Procedurale (no SKILL.md) |

Procedura completa: `docs/processes/WORKFLOW-STANDARD.md`

---

## CHANGELOG ROADMAP

| Data | Modifica | Chi |
|------|----------|-----|
| 22/05/2026 | Documento creato da riconciliazione 6 file HTML + sessioni di sviluppo | Francesco + Claude |
| 22/05/2026 | V1.9 aggiunta (dettatura vocale, email template, rifacimenti UI, logo DdC, magazzino visivo) | Francesco + Claude |
| 22/05/2026 | Magazzino visivo: Concept C selezionato (Mixel-inspired, tile+glifo+fill-bar) | Francesco + Claude |
| 22/05/2026 | Stack orchestratori documentato: Superpowers + gstack + GSD | Francesco + Claude |
| 25/05/2026 | V1.9.1: S1 fix residui completati — badge LIVE rimosso, preferenza_dashboard toggle, Da fatturare lista inline | Francesco + Claude |
| 26/05/2026 | S2 completato: RifacimentoButton bottom sheet 7 motivi, motion policy, mockup approvato | Francesco + Claude |
| 28/05/2026 | DS v2.3 brainstorming + approvazione: spec completa, tokens.ts, motion.ts v2.1, 4-cat taxonomy | Francesco + Claude |
| 28/05/2026 | DS v2.3 implementazione completa: compliance 100% su tutta la PWA, pre-commit guard attivo — V1.9.3 | Francesco + Claude |
| 05/06/2026 | Sessione design chiusa. Prossimo: S4 email template branding (Supabase) | Francesco + Claude |
| 02/07/2026 | Re-audit completo (11 agenti persona) dopo quasi un mese di inattività (zero commit dal 05/06). Score medio 7.29/10 (era 7.1). Claim "DS v2.3 100%" smentito. 2 blocker critici nuovi trovati (materiali/lotti MDR, dashboard/scadenzario disallineati). Prodotti `BACKLOG-TECNICO-2026-07-02.md` e `FEATURES-E-FLUSSI-2026-07-02.md` come nuova fonte di verità tecnica. | Francesco + Claude |
| 03/07/2026 | B2 risolto: Task 16 (verifica finale) aveva trovato un bug residuo in `src/app/api/scadenzario/route.ts` (non nettava `importo_pagato` sulle fatture con pagamento parziale/credito, disaccordo Scadenzario vs Dashboard/Contabilità cliente) e correttamente riportato BLOCKED — fix applicato (netta il residuo come già fanno le altre superfici), tsc/vitest/build verdi, ri-verificato con dati reali (commit `cbc034b`). Entrambi i 2 blocker critici del re-audit 02/07 sono ora risolti. | Francesco + Claude |
| 03/07/2026 | Review finale sull'intero branch B2 (26 commit) trova un secondo disaccordo tra superfici, invisibile a qualunque review di singolo task: Scadenzario escludeva i lavori "fatturare non ancora inclusi" che Dashboard/Contabilità cliente contano già, e `getContabilitaCliente` non escludeva le fatture in bozza. Chiesto a Francesco quale comportamento adottare (nessuna risposta nel timeout, applicata l'opzione raccomandata coerente con lo spec) — fix `ac48530`, re-review "Ready to merge: Yes". Branch mergiato fast-forward su `main` (`05612ec`) e pushato — deploy Vercel. **B2 chiuso.** | Francesco + Claude |
| 03/07/2026 | 2 follow-up B2 risolti in sessione separata (commit `7fc181b`): bug Service Worker PWA scoperto durante B2 (cachava le fetch RSC di `router.refresh()` nonostante `Cache-Control: no-cache` di Next, causando UI stale su tutta l'app dopo ogni mutazione — verificato dal vivo con Playwright, non solo lettura codice) + allineamento `BACKLOG-TECNICO-2026-07-02.md` (B2 ✅, A4 🔄 parziale). | Francesco + Claude |

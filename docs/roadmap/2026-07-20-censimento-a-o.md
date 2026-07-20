# Censimento §A + §O — stato reale su main (20/07/2026)

**Metodo:** 5 agenti di verifica read-only sul codice (HEAD `94d2072`), un item alla volta, evidenza file:riga. Panel advisor (Regola §0C): solution-architect + ux-designer + appsec-auditor → 3× CONFERMA CON RISERVE (integrate sotto).

## ✅ RATIFICA (Francesco, 20/07/2026)

Triage ratificato integralmente. Ordine ed eventuali calendarizzazioni delegate a Claude e qui **certificate**:

1. **Bundle Q** (quick wins) — subito, worktree dedicato.
2. **Bundle T** (tecnico: O1b → O1a, O4a, A18 + fix commento O4b) — dopo Q.
3. **Bundle E** (export A16) — dopo T.
4. **Mini-triage design** (A13 ponte, A14, O1h, O1i + conferma deferral A10/A11) — in coda, DOPO i bundle: si preparano i mockup (regola 0B) e si presentano a Francesco in un unico giro di approvazione, così l'attesa di feedback non blocca i bundle tecnici.
5. **Calendario deferral certificato:**
   - **A20** (audit actor_id, opzione (a)) → prima sessione dedicata DOPO la chiusura §A/§O, prima della sequenza (2) «funzioni attive» — gap di compliance attivo, non deve slittare oltre.
   - **O4b** (drift CHECK listino.categoria, migration) → stessa finestra di A20 (entrambe sessioni-DB brevi, dominio critico percorso Grande).
   - **A15** (analytics ricca) → sequenza (3) «design», come prima superficie della sessione analytics.
   - **O2** (redesign admin) → sequenza (3) «design», sessione dedicata separata come da richiesta originale di Francesco (12/07).
   - **A19** (CAD/STL) → V2, backlog roadmap.
   - **O4c** (dati fiscali prima fattura) → sp.4 fatture. O1d/O1e/O1g → monitor.
   - Promemoria password: risolto da Francesco, rimosso.

## §A — Tabella item → verdetto

| Item | Verdetto | Evidenza chiave | Effort | Proposta |
|---|---|---|---|---|
| A1 push assegnazione tecnico | DA-FARE | `api/lavori/[id]/route.ts` PATCH senza `triggerPush*`; pattern pronto in `prove/route.ts:225` | S | **Bundle Q** |
| A2 fallback offline | ✅ GIÀ-RISOLTO | `sw-template.js` navigate→`offline.html`; banner `SyncBadge.tsx` in AppHeader | — | chiudere |
| A3 autofill passkey sovrascrive input | DA-FARE | `login-form.tsx:191-196` `setEmail(saved)` senza guard `!email` (race al mount) | S | **Bundle Q** |
| A4 cache versioning | ✅ GIÀ-RISOLTO (03/07) | `generate-sw.mjs` build-id | — | chiudere |
| A5 theme_color | DA-FARE | `manifest.json:7-8` + `offline.html:6` `#0F1E52` vs `layout.tsx:22` `#D90012` | S | **Bundle Q** |
| A6 anti-pattern /qualita | PARZIALE | `--cobalt` risolto; resta gold-come-testo `qualita/page.tsx:25,287` | S | **Bundle Q** |
| A7 portale↔richiedi scollegati | DA-FARE | nessun link incrociato in `portale/[token]/page.tsx` né success `RichiestaClientForm` | S | **Bundle Q** |
| A8 notifica richiesta portale | PARZIALE | solo toast realtime (app aperta); Resend riusabile (`send-invito-email.ts`) | S push / M email | **Bundle Q (push)**, email = decisione |
| A9 copy contraddittoria richiesta | DA-FARE | `RichiestaClientForm.tsx:206,214` | S | **Bundle Q** |
| A10 CTA "+" sparisce allo scroll | DA-FARE (solo v2.3) | `BottomNavPill.tsx:432,467`; route v3 usano TastoPiu | S | **deferire** a ondate v3 (advisor UX) |
| A11 «MDR Allegato XIII» esposto | DA-FARE (solo modifica legacy) | `TabAccettazione.tsx:285,565`, montata solo da `/lavori/[id]/modifica` | S | **deferire** a ondata della superficie |
| A12 ClienteComboBox a11y | DA-FARE | `ClienteComboBox.tsx:177-202` no aria-invalid/describedby; vivo (TabDati, ModificaRigaSheet) | S | **Bundle Q** |
| A13 odontogramma nascosto | DA-FARE (peggiorato) | raggiungibile SOLO da modifica legacy; wizard v3 non lo include | M | **ponte minimo ora** (link), redesign in ondata |
| A14 cassetta non in card | DA-FARE | `numero_cassetta` a DB; card v3 vincolo §5.8 «4 righe» | M | **mini-triage design** con Francesco |
| A15 analytics superficiale | PARZIALE | 6 KPI + grafico 12 mesi ci sono; mancano margine/top clienti/% rifacimenti/lead time | L | **deferire CON data** (advisor UX) |
| A16 export CSV incompleto | DA-FARE | unico export = `fatture/export`; cedolino solo singolo PDF | M | **Bundle E** |
| A17 hydration #418 | PARZIALE (4/5 morti) | resta `AnnullaConsegnaBanner.tsx:15-18` (skew render, non UTC/Roma) | S-M | **Bundle Q** |
| A18 hash firma DdC | DA-FARE | `generate-ddc.ts:83` `firma_ddc_sha256: null`; `pdf_sha256` invece c'è | S-M | **Bundle T** + decisione backfill |
| A19 upload CAD/STL | DA-FARE (feature mai esistita) | `file_stl_url` letta solo da XML fatture, zero writer UI | L | **deferire** a V2 |
| A20 audit actor_id NULL | DA-FARE | trigger `auth.uid()` sotto service-role; nessun GUC/colonna dopo 02/07 | M-L | **deferire a sessione dedicata CON DATA** — opzione (a) created_by/updated_by (pattern cicli); gap compliance attivo da documentare |

## §O

| Item | Verdetto | Nota | Proposta |
|---|---|---|---|
| O1a test rami prose | DA-FARE | pillFase 0-branch, subAmbra inCima, subBlu ≥3, subViola fallback scoperti | **Bundle T** (dopo O1b) |
| O1b convenzione «oggi» | DA-FARE | `oggiISO()` UTC → 00:00-02:00 Roma = giorno sbagliato; `adessoRoma` duplicato dashboard/admin-live | **Bundle T** (per primo, test confine+DST) |
| O1c a11y follow-up | MISTO | inert admin ✅; aria-label TuttoIlResto:62, richiusura RigaCerca, console.warn CardLavoro DA-FARE | **Bundle Q** (parti S) |
| O1d audit line-height v3 | PARZIALE | solo `.ds-pila-num` fixato | monitor (gate L2 prossima ondata) |
| O1e flake test | MITIGATO | fake timers + cleanup presenti | monitor |
| O1f segnale tecnico senza anagrafica | DA-FARE | pile vuote + striscia serena = dead-end silenzioso | **promosso a Bundle Q** (advisor UX) — segnale minimo |
| O1g limit 500 pile | DA-FARE | truncation silenziosa spec-mandated | monitor |
| O1h back PilaAperta | DA-FARE | `PilaAperta.tsx:75` hardcoded `/dashboard` | mini-triage design |
| O1i profilo v3 (Esci/identità/trial) | DA-FARE ×3 | tutte assenti; superfici v3 → nessun lavoro buttato | mini-triage design (mockup 0B) |
| O2 redesign admin | CONFERMATO neomorphic v2.x | `admin.css` 57 shadow inset, no `data-ds` | sessione dedicata — **da calendarizzare** |
| O4a ClienteComboBox browser-client | DA-FARE | `getBrowserClient` + ilike; bypassa choke-point N13 (lab sospeso può leggere clienti) | **Bundle T** (parità funzionale prima dello swap) |
| O4b drift CHECK listino.categoria | DA-FARE (A TRE VIE) | listino 9v ≠ lavori 9v ≠ LABEL_MACRO 10v; commento in `tipi-lavoro.ts:12-13` FALSO | deferire (migration=Grande); **fix commento subito in T** |
| O4c dati fiscali prima fattura | DA-FARE | nessun mini-form/badge; hard-fail in `xml-helpers.ts:39` | deferire a sp.4 fatture |
| O4d bonifica classe_rischio | CHIUSO-PER-DECISIONE | nessuna migration, confermato | chiuso |

## Residui fuori scope (solo censiti)

B13 ✅, B16 ✅, B17 ✅, B22 ✅, N6 ✅ (doc), N7 ✅ — già chiusi. Restano aperti con destinazione già ratificata: N1 (audit multi-agente), N2 (migration post-sp.3), N3 (gate pre-utenti-reali). Nessuno critico da assorbire.

## Riserve advisor integrate nei bundle

1. **A8-push**: route portale non autenticata → rate-limit sul token + payload GDPR-safe (mai nome paziente — Art. 9, push via APNs/FCM extra-UE); se complica, sfilare dal bundle Q.
2. **Permesso push chiesto in contesto** (dopo prima assegnazione), non a tappeto; decisione email A8 da prendere a breve, non lasciare nel limbo.
3. **O1b prima di O1a**, con test espliciti di confine (23:59 UTC, 00:30 Roma, DST marzo/ottobre). Verificare che DdC/fatture NON condividano l'helper UTC.
4. **O4a**: verifica parità funzionale GET /api/clienti (ricerca/ordinamento) prima dello swap.
5. **A18**: decidere policy backfill DdC storici (o cut-off documentato) — 1 riga di decisione, non implementazione.
6. **A20**: opzione (a) confermata dal panel; actor sempre da identità server-side, mai da input client; nel frattempo nessuna nuova tabella/route critica senza created_by/updated_by.
7. **Bundle E**: escaping anti CSV-injection (`=`,`+`,`@` a inizio cella) + test scoping tenant.

## Bundle proposti (in attesa di ratifica)

- **Q — Quick wins** (Piccolo/Medio, 1 worktree): A1, A3, A5, A6-res, A7, A8-push, A9, A12, A17-res, O1c-parti, O1f. TDD, deploy unico.
- **T — Tecnico** (Medio, 1 worktree): O1b → O1a, O4a, A18, fix commento O4b.
- **E — Export** (Medio): A16.
- **Mini-triage design** con Francesco: A13 (ponte), A14, O1h, O1i (+ conferma deferral A10, A11).
- **Deferral**: A15 (con data), A19 (V2), A20 (sessione dedicata con data), O4b (migration dedicata), O4c (sp.4), O2 (sessione dedicata da calendarizzare), O1d/O1e/O1g (monitor).

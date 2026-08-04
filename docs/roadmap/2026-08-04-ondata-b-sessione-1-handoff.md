# Handoff — Sessione ① dell'ondata B: spec RATIFICATA, mockup scelti, tutto pubblicato

**Per:** Francesco, e per la sessione nuova a contesto pulito (la ② dell'ondata B: migration + RPC).
**Quando:** 4 agosto 2026, pomeriggio (`provato:` `date` a inizio sessione → `Tue Aug 4 08:31 CEST 2026`).
**Stato:** `main` = `5201e108` **+ il commit di questa chiusura** · albero pulito ·
`origin/main..main` = **0** prima di questa chiusura (D215: pubblicato con CI verde · CD verde ·
sito 200 — due giri completi, entrambi verdi).

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, E ANDAVA FATTO

### ① Il conteggio fresco delle DdC resta NON misurato — ereditato, e ora è un CANCELLO della ②
`provato:` in questa sessione nessuna query è stata eseguita su `dichiarazioni_conformita`.
I «3, tutte annullate» vengono ancora dai referti del 03/08. La spec lo scrive come **obbligo
d'apertura della sessione ②** (`§8`: `npx tsx scripts/tmp/verifica-conteggio-ddc.ts` PRIMA
della migration che chiude la policy `ddc_laboratorio_update`) — ma scriverlo non è misurarlo:
**se la sessione ② non parte da lì, ripete l'errore che questa §0 esiste per fermare.**

### ② Due scene dei mockup sono passate SENZA una domanda dedicata
Le 4 domande a Francesco coprivano meccanismo (D210), prescrittore (D211), gesto (D212) e
conferma di consegna (D213). **Il foglio «Allega la prescrizione» (scena a2) e i bloccanti
nuovi del precheck (scena C-1) sono stati approvati solo implicitamente**, dentro D210/D213.
I mockup ci sono: se Francesco vuole ridiscuterli, si fa PRIMA della sessione ③ (wizard+scheda),
non dopo.

### ③ I ritrovamenti R-E2 dell'esplorazione: censiti, ma il triage è parziale
Undici ritrovamenti (v. §3-bis). **Due sono diventati schede** (`docs/ops/EMERGENTI.md` E4 · E5);
gli altri nove vivono SOLO in questo handoff. Nessuno è stato verificato oltre la lettura che
l'ha trovato — in particolare **E4 (PATCH admin su colonne forse inesistenti) non è stato
provato sul DB vivo**.

## 1. Che cosa è successo (la giornata, in tabella)

| Cosa | Esito | Dove |
|---|---|---|
| Betting D179+E1 (quarta segnalazione) | ✅ **D208**: nasce la voce **11 · P41 «il banco di prova automatico»**, dopo l'ondata B; D-Q2 si scioglie lì | roadmap voce 11 · verbale t.78 |
| Q1 (`npm test` vs commento) | ✅ **D209**, eseguita e provata: `npm test` → 394 file (394) · 4542 test (4542), integration non più raccolte | `package.json:12` · verbale t.78 |
| Esplorazione per la spec | ✅ 6 lettori paralleli, fatti con `file:riga` in **spec §4.0** | spec §4.0 |
| Mockup 0B | ✅ 4 file · 60 scatti (390/768/1280 × chiaro/scuro) | `docs/design/mockups/2026-08-04-ondata-b-*` |
| Le 4 scelte di Francesco | ✅ **D210** variante B «framing prima» · **D211** mini-foglio D1 · **D212** gesto ratificato · **D213** conferma LEGGERA (la due-tempi RESPINTA e ridisegnata nello stesso turno) | verbale t.79 |
| Ratifica della spec | ✅ **D214** — sessione ① COMPLETA | spec (stato) · verbale t.80 |
| Pubblicazione | ✅ **D215**: push `d720fc10..0f19275a` + esito `5201e108` — CI verde (8m12s) · CD verde · sito 200 su `/login`; secondo giro anch'esso verde | verbale t.81 · roadmap (61) |

**FASE 7 misurata in chiusura** (`npm run verify:full`): `tsc` **0** · `vitest` **4542 passate |
19 saltate** (394 file passati | 3 saltati = 397) · build **Compiled successfully** — rotte
invariate rispetto alla mattina (81): `provato:` `git diff d720fc10..HEAD -- src/ supabase/` è
**vuoto** (oggi si è toccato solo `package.json:12` e documenti) · **sei guardie verdi** ·
guardia coerenza **verde a 5** (il numero si legge, P32).

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. **L'esplorazione prima del disegno ha cambiato il disegno.** Il wizard di produzione è a
   **3 passi FISSI** (`WizardNuovoLavoro.tsx:51`) — la macchina adattiva (`sequenzaPassi`) non è
   MAI stata cablata: nessun componente la importa. Chi disegna sull'«adattivo» disegna sul
   futuro, non sul presente. La spec B disegna sul wizard reale (il riquadro prescrizione vive
   nel «Fatto!», che sopravvive identico al cablaggio futuro).
2. **Un «no» di Francesco a metà giro vale più di due «sì».** La conferma a due tempi era
   difendibile sulla carta (attestation UX, evidenza sperimentale) ed è stata **respinta al
   primo sguardo** («troppo attrito»). Il ridisegno nello stesso turno — il tocco su CONSEGNA
   È la conferma — tiene il vincolo del panel (V5) e costa zero tocchi. **Il confine è a
   verbale (D213): più leggero di così riapre V5.**
3. **`capture="environment"` sull'unico input è un buco normativo, non un dettaglio UX:** con
   quello, 2 delle 4 forme reali delle prescrizioni (D202: email, piattaforma) **non si possono
   allegare affatto**. Il precedente giusto era già in casa (`TabImmagini.tsx:391`, via
   Galleria con `accept="image/*,application/pdf"`).
4. **I mockup si copiano dal codice vivo, non dalla spec e non dall'ultimo mockup:** P31
   portava ancora il `--faint` scuro pre-D193 (`#928778`); i mockup di oggi montano il valore
   vivo di `tokens.ts` (`#9A8F80`). Un mockup che copia un mockup propaga l'errore di ieri.

## 3. Che cosa resta aperto, in ordine di importanza

1. **Sessione ② — migration + RPC** (il lavoro): tabella `lavori_prescrizioni` (spec §3),
   colonne P37, chiusura policy `ddc_laboratorio_update` (`supabase/schema.sql:1292-1294` —
   oggi UPDATE tenant-scoped pieno: l'immutabilità è solo convenzione). **PRIMA: §0①.**
2. **FASE 4 per la ②** coi tre registri (R-P1 · R-P2 · R-P6) — percorso GRANDE (RLS+MDR).
3. **E4 · E5** di `docs/ops/EMERGENTI.md` (v. §0③) — E5 tocca la sessione ③ dell'ondata.
4. **P41** (D208): dopo l'ondata B.
5. **Igiene già promessa dalla spec** (§3): i commenti di schema ancora su «Allegato IV»
   (`supabase/schema.sql:878, :903, :919`) si correggono nella ②, «mentre si è lì».

### §3-bis — Gli 11 ritrovamenti R-E2 dell'esplorazione (una sezione sola, come da regola)

| # | Ritrovamento | Dove |
|---|---|---|
| 1 | PATCH admin labs su 5 colonne assenti dai tipi generati → **scheda E4** | `api/admin/labs/[id]/route.ts:8-10` |
| 2 | PATCH scheda senza gettone di concorrenza → **scheda E5** | `ModificaRigaSheet.tsx` (PATCH root) |
| 3 | RLS `lavori_immagini` usa `public.get_lab_id()`, non il canonico `current_lab_id()` — forse alias storico, **non verificato sul catalogo vivo** | `002_fase2_schema.sql:259-261` |
| 4 | Drift stato DdC: `'annullata'` manca da `schema.sql:1265-1266` e dalla union `domain.ts:574` (la migration 20260710090000 l'ha aggiunta solo nella CHECK) | `supabase/schema.sql` · `src/types/domain.ts` |
| 5 | Chips «medico richiedente» irraggiungibili: `LavoroFormClient` non passa `clienteId` a `TabDati` → `studioMembers` sempre vuoto; e commento/codice divergono (`>=1` vs «almeno 2») | `TabDati.tsx:82-102` |
| 6 | `richiedente_nome` scrivibile ma invisibile sulla scheda v3 (0 superfici di lettura) — **lo risolve l'ondata B stessa** (D211) | scheda-v3/ |
| 7 | PUT /denti: due 500 dove servirebbe 422 (timestamp malformato → 22007; coppia colore fuori catalogo → FK), già dichiarati nel codice | `api/lavori/[id]/denti/route.ts:100-127` |
| 8 | Riferimenti di riga stantii nei commenti (`useLavoroForm.ts:18` → route slittata; `route.ts:98` cita se stesso a righe vecchie) | due file |
| 9 | Divergenza dichiarata scheletrato*/prevedeColore (già riferita nel codice stesso) | `sequenza-passi.ts:81-88` |
| 10 | Due attributi tema negli strumenti di scatto: lo script generico `screenshot-mockups.mjs` imposta `data-theme`, i mockup recenti leggono `data-tema` → scatti dark identici ai light senza errore | `scripts/screenshot-mockups.mjs:36` |
| 11 | Il precheck elemento 3 passa anche con cliente parziale (solo cognome O solo nome) — coerente col fallback ma permissivo | `precheck.ts:22-25` |

## 4. Da dove ripartire

**Sessione ② di 4: migration + RPC.** In ordine:
1. `npx tsx scripts/tmp/verifica-conteggio-ddc.ts` → il numero si incolla nel piano (§0①).
2. FASE 4 (writing-plans) sul perimetro della ②: `lavori_prescrizioni` (spec §3 — JSONB
   deliberato, `fonte_tipo` CHECK 4 forme, CHECK «almeno una» fonte all'emissione,
   FK composite, RPC dedicate, clone nel rifacimento) · colonne P37 (`istituzione_sanitaria`
   nullable; la casa di `numero_prescrizione`) · chiusura `ddc_laboratorio_update`.
   Coi tre registri; il censimento R-P6 decide i file da aprire.
3. FASE 6b dopo la migration: `supabase gen types` + `tsc` + verifica RLS.
La ③ (wizard+scheda) e la ④ (DdC a due righe + precheck + QA + L2) seguono la stima di D207.

## 5. Il minimo per non sbagliare

- FASE 7 = UN comando: `npm run verify:fast` (quotidiano) · `verify:full` (fine ondata).
- Worktree VIETATI: branch nel repo (`git checkout -b`). Diramazioni: `PIPELINE-3.md` §3.
- La data si legge da `date` (D155). Il numero della guardia si legge (oggi 5 — P32).
- Banco di prova: porta 3020 + `guardia-stili-collaudo` PRIMA di fotografare; accesso via
  `scripts/tmp/link-accesso.ts` (D103).
- Citazioni: «MDCG 2021-3, marzo 2021» (mai «Rev.1») · L. 409/1985 art. 2 si rilegge su GU
  SOLO se un documento ne cita il testo (la spec non lo fa, dichiarato in §6).
- Scatti mockup: attributo `data-tema` (non `data-theme`), clip su `.scena` — v. §3-bis n.10.
- Il prossimo numero di decisione è **D216**; il conteggio vive in testa al verbale (215 in 81).

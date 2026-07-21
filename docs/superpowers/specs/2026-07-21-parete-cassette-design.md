# Spec di design — La Parete delle Cassette
**Data:** 21 luglio 2026 · **Stato:** rev.2 — **RATIFICATA da Francesco il 21/07/2026** (spec + decisione D-10). Panel advisor integrato (solution-architect + ux-designer + backend-api: 3× CONFERMATA CON RISERVE, tutte le riserve recepite sotto).
**Percorso:** GRANDE (nuova migration: tabella `cassette` + storico → override dominio critico BP-2 §0C)
**Fonti di verità:**
- Decisioni ratificate: `docs/design/decisions/2026-07-20-mini-triage-e-parete.md` (§«La Parete delle Cassette», 4 giri)
- Mockup visivo (fedeltà TOTALE): `docs/design/mockups/2026-07-20-parete-cassette-v2.html`
- Collocazione home: `docs/design/mockups/2026-07-20-parete-collocazione-home.html` (schematico, NON target visivo)
- DS v3.2: `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` (emendamenti due-stanze già incisi il 20/07: §3.3, §6.1, §7.1, §7.16)

---

## 1. Cosa è (in una frase)

La Parete è lo specchio digitale della parete fisica dei portalavori: una griglia di cassette
colorate per laboratorio, ognuna con nome e colore reali, che raccontano cosa contengono
(miniatura del tipo di lavoro + targa + n. + dentista), si liberano da sole alla consegna e
si trovano con la ricerca «che accende». Copy: «nell'ordine del tuo muro» — MAI «identica al
tuo muro» (le colonne cambiano col viewport; lo specchio è l'ordine di lettura, non la geometria).

## 2. Perimetro

**IN questa ondata:**
1. Migration: tabelle `cassette` + `cassette_lavori` + RPC atomiche + backfill (§4).
2. Route `/cassette` — pagina v3 standalone con parete, ricerca locale, sheet «Nuova cassetta», sheet cassetta (rinomina/colore/sposta/libera/butta via), drag & drop riordino (§5).
3. Home a due stanze su mobile (<1024): Pile ↔ Parete, scroll-snap + peek + dots; TastoPiù unico fisso (§6).
4. Preferenza per-utente «La tua home» in `utenti.nav_preferences` + UI interim in `/impostazioni` + deep-link `?stanza=` + voce «I lavori» condizionale in ☰ (§7).
5. Miniature per tipo di lavoro: componente ds nuovo + mappa catalogo→miniatura con fallback (§8).
6. Liberazione automatica alla consegna con racconto L5, riassegnazione all'annullo, trasferimento al rifacimento (D-10) + lettura auto-riparante (§9).
7. Integrazione conferma-cassetta «dal parco» + **migrazione di TabAccettazione** (secondo writer di `numero_cassetta` — censito dal panel) (§10).
8. Accesso globale: shortcut PWA manifest, voce «Le cassette» in Tutto il resto, voce NavDesk/rail (§11).
9. Emendamenti spec v3 (§13) + BP-1.

**FUORI (tracciato):**
- «Cerca» globale → sessione design dedicata (Punto 3 handoff). Questa ondata prepara SOLO lo storico. **Nota per quella sessione (dal panel):** i lavori consegnati PRIMA del 21/07 hanno `numero_cassetta` residuo su `lavori` e NESSUNA riga storico; «era in C12» dovrà unire le due fonti.
- Redesign odontogramma, ondate v3 B-G, ogni altra superficie.
- Realtime multi-utente sulla parete (V1 = refetch su `visibilitychange`/focus, §5.5; realtime a backlog).
- Migrazione di `/impostazioni` a v3 (la preferenza entra in stile v2.3 interim).
- Nudge di scopribilità dello swipe (StrisciaStato una tantum): si valuta DOPO il collaudo di Francesco se il peek non basta.

## 3. FASE 3 — Validazione architetturale (gate BP-2)

| Domanda | Risposta |
|---|---|
| **Tenant isolation** | Sì, toccata: 2 tabelle nuove con RLS SELECT-only lab-scoped (`public.current_lab_id()`) + REVOKE scritture dirette (§4.5); RPC SECURITY DEFINER con assert tenant INTERNI (§4.3); route con service client + `.eq('laboratorio_id', …)` ovunque. |
| **Schema drift** | Sì: migration nuova → FASE 6b obbligatoria (gen types + tsc + verifica RLS) + registrazione ledger. |
| **API contract** | Breaking controllato: `numero_cassetta` ESCE da `PATCHABLE_FIELDS` (route.ts:64). Client interni censiti dal panel: `ConfermaCassettaSheet` **e `TabAccettazione.tsx:239-249`** (via LavoroFormClient/wizard) — ENTRAMBI migrati nella stessa ondata (§10) + **test sentinella** stile invariante D7 (`numero_cassetta ∉ PATCHABLE_FIELDS`). Response di `annulla-consegna` estesa in modo additivo (§9.3). Nessun client esterno. |
| **Rollback** | Migration additiva pura. Rollback applicativo = revert deploy: l'app torna a scrivere `numero_cassetta` direttamente, le tabelle nuove restano inerti. Il **backfill è idempotente e ri-eseguibile** (ON CONFLICT sulla chiave normalizzata + esistenza riga viva): al re-rollout una migration di risync richiama la stessa logica. Nessun dato distrutto. |
| **Dominio critico** | Migration + RLS → percorso GRANDE (già deciso). Niente Stripe/FatturaPA/auth; la RPC fiscale `annulla_consegna_atomica` NON si tocca (§9.3). |

## 4. Modello dati (migration `20260721TTTTTT_parete_cassette.sql`)

### 4.1 Tabella `cassette`

```sql
CREATE TABLE cassette (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id uuid NOT NULL REFERENCES laboratori(id),
  nome           text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 20),
  colore         text NOT NULL DEFAULT 'bianca'
                 CHECK (colore IN ('bianca','azzurra','rossa','blu','verde','grigia')
                        OR colore ~ '^#[0-9A-F]{6}$'),
  posizione      integer NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz            -- soft-delete (mai DELETE fisico: lo storico punta qui)
);
CREATE UNIQUE INDEX cassette_nome_vivo_uidx
  ON cassette (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL;
CREATE INDEX cassette_lab_pos_idx
  ON cassette (laboratorio_id, posizione) WHERE deleted_at IS NULL;
```

- **`nome`**: unicità **case/spazi-insensitive** sui vivi (`lower(btrim())` — «C12», «c12», «C12␠»
  sono la stessa targa; il testo libero di ondata A lo impone). Il valore mostrato conserva il
  case dell'utente. Una cassetta buttata via può cedere il nome.
- **`colore`**: slug standard o hex `#RRGGBB` **normalizzato uppercase dalla route**. I 6 standard
  hanno i gradienti fissi del mockup; il custom genera la coppia chiaro/scuro via `color-mix`.
- **`posizione`**: intero lineare, nuova cassetta in coda (`max+1` senza lock: duplicato possibile
  sotto POST concorrenti — ACCETTATO e dichiarato; tie-break `ORDER BY posizione, created_at, id`;
  il riordino risana). NIENTE riga/colonna (D-3).
- **Niente colonna `stato`** (D-2, ratificata dal panel): occupata/libera è derivata dalla riga
  viva dello storico; la morte è `deleted_at`.

### 4.2 Storico `cassette_lavori` (verità dell'occupazione)

```sql
CREATE TABLE cassette_lavori (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id uuid NOT NULL REFERENCES laboratori(id),
  cassetta_id    uuid NOT NULL REFERENCES cassette(id),
  lavoro_id      uuid NOT NULL REFERENCES lavori(id),
  assegnato_at   timestamptz NOT NULL DEFAULT now(),
  liberato_at    timestamptz,
  liberato_per   text CHECK (liberato_per IN ('consegna','manuale','spostamento','annullo_lavoro','rifacimento')),
  CHECK ((liberato_at IS NULL) = (liberato_per IS NULL))
);
CREATE UNIQUE INDEX cassette_lavori_cassetta_viva_uidx ON cassette_lavori (cassetta_id) WHERE liberato_at IS NULL;
CREATE UNIQUE INDEX cassette_lavori_lavoro_vivo_uidx  ON cassette_lavori (lavoro_id)  WHERE liberato_at IS NULL;
-- per «Cerca» globale e annullo consegna (righe chiuse):
CREATE INDEX cassette_lavori_lab_lavoro_idx   ON cassette_lavori (laboratorio_id, lavoro_id, liberato_at);
CREATE INDEX cassette_lavori_lab_cassetta_idx ON cassette_lavori (laboratorio_id, cassetta_id, assegnato_at DESC);
```

- **Riga viva** (`liberato_at IS NULL`) = verità unica: 1 lavoro per cassetta e 1 cassetta per
  lavoro via indici unici parziali.
- **Trigger append-only** `cassette_lavori_guard()` (BEFORE UPDATE OR DELETE, `SET search_path =
  public, pg_temp` — testo esatto ratificato dal panel backend): DELETE vietato; UPDATE di riga
  già chiusa vietato; aggiornabili SOLO `liberato_at`+`liberato_per` (le colonne identitarie
  `IS DISTINCT FROM` → eccezione); la chiusura deve valorizzare `liberato_at`.

### 4.3 RPC (SECURITY DEFINER — l'UNICA penna)

Tutte con: `SET search_path = public, pg_temp` · `REVOKE EXECUTE FROM PUBLIC, anon,
authenticated` + `GRANT` solo `service_role` · **assert tenant interni** (ogni riga toccata
verificata `laboratorio_id = p_lab`; UUID dal client MAI fidati) · **esiti come json**
(`json_build_object('esito', …)` — pattern `annulla_consegna_atomica`), MAI eccezioni come
contratto; la route mappa esito→HTTP.

| RPC | Contratto |
|---|---|
| `cassetta_assegna_atomica(p_lab, p_lavoro, p_cassetta_id, p_nome, p_colore)` | In una transazione: (0) assert lavoro del lab, vivo, stato non chiuso; se `p_cassetta_id`: `SELECT … FOR UPDATE` su cassetta del lab viva → assente = esito `cassetta_non_trovata`; (1) se solo `p_nome`: get-or-create race-safe `INSERT … ON CONFLICT (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL DO UPDATE SET updated_at = now() RETURNING id` (nome trimmato; colore default `bianca`; posizione in coda); (2) **auto-riparazione**: se la riga viva della cassetta punta a un lavoro chiuso/soft-deleted → la chiude (`liberato_per='consegna'`) prima di valutare; (3) chiude l'eventuale riga viva del lavoro (`'spostamento'`); (4) INSERT riga viva — `unique_violation` catturata → esito `occupata` (409 in route); (5) `lavori.numero_cassetta = cassette.nome`. Ritorna `{esito:'ok', cassetta_id, nome}`. |
| `cassetta_libera_atomica(p_lab, p_lavoro, p_motivo)` | Chiude la riga viva del lavoro (se esiste) + `numero_cassetta = NULL`. Idempotente: nessuna riga viva → `{esito:'ok', nome:null}`. Ritorna il nome liberato (racconto L5). |
| `cassetta_rinomina_atomica(p_lab, p_cassetta_id, p_nome)` | FOR UPDATE; unicità normalizzata → esito `nome_occupato` (409); sync `lavori.numero_cassetta` del lavoro eventualmente contenuto. |
| `cassetta_elimina_atomica(p_lab, p_cassetta_id)` | FOR UPDATE sulla cassetta; riga viva presente → esito `occupata` (409); altrimenti `deleted_at = now()`. (Check-then-update in route = racy: VIETATO.) |
| `cassette_riordina(p_lab, p_ordine uuid[])` | Valida no-duplicati; id estranei/morti → esito `ordine_non_valido` (422). Un solo `UPDATE … FROM unnest(p_ordine) WITH ORDINALITY`. **Politica tollerante**: cassette vive non elencate (create da un collega nel frattempo) scivolano in coda conservando l'ordine relativo — niente 409. |
| `cassetta_riassegna_post_annullo(p_lab, p_lavoro)` | Trova l'ultima riga chiusa `liberato_per='consegna'` del lavoro; tenta la riapertura (nuova riga viva — l'unico parziale arbitra la race) + sync `numero_cassetta`. Esiti: `riassegnata` / `occupata_nel_frattempo` / `niente_da_riassegnare`. Fail-soft. |
| `utente_set_nav_pref(p_user, p_chiave, p_valore jsonb)` | Micro-RPC generica: allowlist chiavi (`home` con enum validato, `parete_intro_vista` solo `true`) + `nav_preferences = coalesce(nav_preferences,'{}'::jsonb) ∥ jsonb_build_object(p_chiave, p_valore)` — merge atomico non distruttivo (niente read-modify-write raceable). Solo self (la route passa `context.userId`). |

### 4.4 Backfill (stessa migration, idempotente)

Dai `lavori` **aperti** (stato NOT IN `consegnato, annullato`, `deleted_at IS NULL`) con
`numero_cassetta` non-NULL, per ogni lab:
1. **Normalizzazione**: `btrim`; stringhe vuote scartate; troncamento a 20 char; dedupe sulla
   chiave `lower(btrim())` (post-troncamento).
2. `INSERT` in `cassette` (colore `bianca`; **posizione natural-sort**: serie `^C\d+$` per
   `(substring(nome from 2))::int`, il resto alfabetico in coda) — `ON CONFLICT DO NOTHING`
   sulla chiave normalizzata (idempotenza).
3. Riga viva in `cassette_lavori` (`assegnato_at = lavori.updated_at`, approssimazione
   dichiarata), solo se non già esistente.
4. **Collisione** (stesso nome, 2+ lavori aperti): vince `updated_at` più recente; i perdenti →
   **`numero_cassetta = NULL`** (card e parete raccontano la stessa cosa: «senza cassetta»;
   si riassegna dal flusso nuovo). Lavori chiusi: nessuno storico retroattivo (cut-off 21/07,
   principio A18).
5. **Seed E2E**: `scripts/seed-e2e.ts` aggiornato perché gli scenari QA partano da una parete
   pulita e deterministica (il backfill gira anche sul lab E2E).

### 4.5 RLS (entrambe le tabelle — pattern `fatture_sdi_eventi`, ratificato dal panel)

`ENABLE ROW LEVEL SECURITY` · unica policy `FOR SELECT USING (laboratorio_id =
public.current_lab_id() AND …)` (per `cassette`: `AND deleted_at IS NULL`) · `REVOKE INSERT,
UPDATE, DELETE FROM anon, authenticated`. Scrive SOLO il service role via RPC — «una sola
penna» vera anche a DB (il pattern `FOR ALL` di `lavori_materiali` è stato scartato dal panel:
avrebbe permesso scritture dirette PostgREST bypassando la sync).

## 5. La pagina `/cassette` (v3, chrome pagina-lista)

- **Route**: `src/app/(app)/cassette/page.tsx` — server component `force-dynamic`, ruoli
  `titolare | admin_rete | tecnico | front_desk`, wrapper `[data-ds="v3"]` + `.ds-grana`.
  Query server: cassette vive per `posizione, created_at, id` + join riga viva → lavoro
  (numero, dentista, `tipo_dispositivo`, `descrizione`).
- **Lettura auto-riparante** (panel, D-5): la query server rileva righe vive il cui lavoro è
  chiuso/soft-deleted e le chiude via RPC libera (fire-and-forget, motivo `consegna`) — le
  cassette-fantasma del fail-soft guariscono alla prima lettura. Stessa guardia dentro la RPC
  assegna (§4.3 punto 2).
- **Chrome**: ‹ TastoTondo + titolo «Le cassette» + ☰; sotto, campo di ricerca inline (riga
  pillola del mockup).
- **Tray occupata** (fedeltà TOTALE al mockup): corpo gradiente, linguetta `::before`, cavità
  incassata con miniatura (§8), targa piena col nome (troncamento ~6 char + ellissi; SR legge
  il nome completo — regola A14), riga «n.144 · Bianchi». **Tap → scheda lavoro** (navigazione
  di pagina). Su **colore custom**: luminanza relativa > 0.55 → targa outline e testi scuri
  (regola già a mano nel mockup per bianca/azzurra, generalizzata).
- **Tray libera**: cavità vuota, targa outline, «libera» al 60%. **Tap → sheet cassetta** (§5.3).
- **Tray-nuova**: cella tratteggiata «+ Nuova cassetta» in coda → sheet §5.2.
- **5.1 Ricerca «che accende»**: filtro client su `nome ∥ n.numero ∥ dentista ∥ paziente ∥
  tipoLavoro` (stessa `normalizza` di `filtra-lavori-pila.ts`); match `.accesa` (anello blu 3px
  + elevazione, `snappy`), non-match `.spenta` (opacity .3 + desaturazione, **restano
  tappabili** — §8.2, mai `pointer-events:none`). Mai solo colore. `aria-live` con l'esito
  («1 cassetta accesa»). Zero match → tutte spente + riga quieta «Niente per “zirconia”» (L5).
- **5.2 Sheet «Nuova cassetta»**: nome PRECOMPILATO `C{maxN+1}` (sui nomi `^C\d+$` vivi), hint
  «suggerito · scrivi quello che vuoi»; swatches 6 standard + custom (conic → `<input
  type="color">`); CTA `Crea {nome}`. POST `/api/cassette`.
- **5.3 Sheet cassetta** (da tap su libera, o da long-press fermo su occupata — §5.4):
  rinomina · colore · **«Sposta il lavoro in…»** (solo occupata: chips libere, riuso della
  grammatica di ConfermaCassettaSheet → RPC assegna con `'spostamento'`) · **«Segna come
  libera»** (solo occupata: LinkQuieto + DialogConferma → RPC libera `'manuale'`; è la via
  d'uscita per il mondo fisico: il caso esce senza consegna) · **«Butta via»** (dizionario
  §2.3 — MAI «Elimina»; LinkQuieto rosso + DialogConferma «Butto via la cassetta C4?»;
  occupata → riga bloccante «Dentro c'è il n.144»; soft-delete via RPC). «Sposta» (▲▼
  posizione) come voce visibile di prim'ordine, non solo a11y (guanti: il long-press è il
  gesto meno affidabile del banco).
- **5.4 Griglia e drag & drop**: colonne fisse 3 (<768) / 4 (768-1279) / 6 (≥1280), ordine
  lineare invariante. **Semantica gesti (incisa in §5.35 DS):** tap = azione primaria (scheda
  lavoro / sheet); long-press 300ms = sollevamento drag; rilascio senza movimento (<8px) =
  apre lo sheet cassetta. Prima di aprire il drag: refetch dell'ordine corrente (riordino
  concorrente last-write-wins, mitigato). Al drop: POST `/api/cassette/riordino` (lista
  ordinata). Riordino `molla.smooth`; `aria-live` su «Sposta» ▲▼ («C12 spostata al posto 3»).
- **5.5 Freschezza**: refetch su `visibilitychange`/focus (pagina e stanza home) — senza
  realtime il 409 resta la guardia, ma la parete non deve mentire a chi la guarda da un'ora.

### API (pattern route completo N13: CSRF → `getFreshLabContext` → `laboratorioId` → `assertLabOperativo` → service client + `.eq('laboratorio_id', …)`; scritture = wrapper delle RPC §4.3)

| Endpoint | Cosa | Note |
|---|---|---|
| `POST /api/cassette` | crea `{nome?, colore?}` | nome assente → auto `C{n}`; hex normalizzato uppercase; 409 nome vivo duplicato; tutti i ruoli lab |
| `PATCH /api/cassette/[id]` | allowlist `{nome?, colore?}` | via RPC rinomina (sync denorm) |
| `DELETE /api/cassette/[id]` | butta via | via RPC elimina; 409 se occupata |
| `POST /api/cassette/riordino` | `{ordine: uuid[]}` | via RPC riordina; 422 su id estranei/duplicati |
| `POST /api/lavori/[id]/cassetta` | `{cassetta_id}` ∥ `{nome}` ∥ `null` | wrapper assegna/libera(`'manuale'`); 409 esito `occupata`; sostituisce il PATCH `numero_cassetta` |
| `PATCH /api/impostazioni/preferenze` | `{home}` enum | via micro-RPC, solo self (§7) |

## 6. Home a due stanze (mobile <1024 — HomeV3)

- **Pager a scroll-snap**: 2 stanze full-width (`scroll-snap-type: x mandatory`), swipe = scroll
  nativo. No-scroll VERTICALE resta legge in entrambe. `overscroll-behavior: contain` sul
  contenitore (niente pull-to-refresh a metà snap).
- **Peek**: **28px** fissi, bilaterale (dalla stanza Pile sbircia la Parete, e viceversa).
  Verifica al gate L2 che le subline delle pile a 390 reggano §5.7 (il dato essenziale non si
  tronca mai a metà).
- **TastoPiù e dots FUORI dal pager** (footer fisso, riserva ux M7 recepita): un solo TastoPiù,
  identico e immobile in entrambe le stanze — §3.3 regola 5 rafforzata, niente doppione visibile
  a metà snap. Dots = variante «stanze» di `ProgressDots` (attivo a pillola), tap-to-snap
  (`molla.smooth`; reduced-motion → salto), hit-area ≥44px ciascuno, semantica `tablist`
  completa (`role="tab"`, `aria-selected`; stanze = `tabpanel`; frecce ←→ da tastiera).
- **Stanza non attiva**: `inert` + `aria-hidden="true"` (aggiornati a fine snap); cambio da
  dot/tastiera sposta il focus sul primo elemento della stanza entrante.
- **Stanza Parete**: eyebrow «LE CASSETTE» + titolo **«La parete ›»** (affordance esplicita →
  `/cassette`), ☰ invariato, parete 3 colonne. **Cap anti-sfondamento (riserva ux B2):** mostra
  le prime N cassette per `posizione` (N derivato dal viewport, stessa logica scala
  device-corti §7.1) + tile finale «Tutte le cassette ›» → `/cassette`; MAI scroll interno,
  MAI tray sotto i 44px. Tap occupata → scheda lavoro; tap libera/nuova → `/cassette`
  (navigazione di pagina percepibile, non sheet — la home non è un editor, D-8). Miniature a
  ~22px: verifica leggibilità dedicata al gate L2; se illeggibili → solo targa + colore nella
  stanza home (fallback ratificato in anticipo).
- **Dati**: `dashboard/page.tsx` aggiunge al `Promise.all` la query cassette (campi minimi) +
  `nav_preferences`. Lab senza cassette → Vuoto ds («La tua parete è vuota» + CTA «Crea la
  prima cassetta» → `/cassette`).
- **Desktop (≥1024)**: NESSUNA stanza — voce «Le cassette» nel NavDesk (§11), HomeDesktop
  invariata (D-7).
- **Stanza iniziale**: dalla preferenza (§7); la posizione NON si persiste fra navigazioni.
- **Racconto backfill (una tantum, L5):** al primo ingresso post-migration, segnale quieto in
  StrisciaStato «UÀ ha creato {N} cassette dai tuoi lavori — colorale e mettile in ordine ›»
  (→ `/cassette`); dismissal per-utente in `nav_preferences.parete_intro_vista`. Precedenza
  sotto gli allarmi operativi e il trial (gerarchia §5.24).

## 7. Preferenza per-utente «La tua home»

- **Storage**: `utenti.nav_preferences` (Json, oggi inutilizzato). Shape:
  `{ "home": "due_stanze" | "pile" | "parete", "parete_intro_vista": bool }`; assente → `due_stanze`.
- **Effetto**: `due_stanze` = pager §6 · `pile` = solo stanza Pile · `parete` = solo stanza
  Parete. Letta server-side in `dashboard/page.tsx` — zero flash client.
- **Deep-link `?stanza=pile|parete`** su `/dashboard`: vince sulla preferenza per quella visita
  (pattern searchParams server-driven, ADR B6). È la garanzia che NESSUNA stanza è mai
  irraggiungibile.
- **Via alle Pile con `home:"parete"` (riserva ux B1):** in Tutto il resto compare la voce
  «I lavori» (`href:'/dashboard?stanza=pile'`, emoji 🦷→📋) SOLO quando la preferenza esclude
  le pile; simmetrica «La parete» non serve (già voce fissa «Le cassette»). Il NavDesk desktop
  ha già i 4 link pila.
- **UI**: riga «La tua home» in `/impostazioni` (sezione Aspetto), stile v2.3 (regola di
  convivenza §14). Radio 3 scelte, copy in voce UÀ: «Le due stanze — pile e parete» (default) ·
  «Solo le pile — che cosa urge» · «Solo la parete — dove stanno». Migra a v3 con F1.
- **API**: `PATCH /api/impostazioni/preferenze` — allowlist `{home}` enum (422 fuori enum),
  merge atomico via micro-RPC `utente_set_nav_pref` (§4.3), SEMPRE `context.userId` (mai
  cross-utente), guard N13 standard.

## 8. Miniature per tipo di lavoro

- **Componente ds nuovo**: `MiniaturaLavoro` (`src/components/ds/MiniaturaLavoro.tsx`) — SVG
  materici inline, palette FISSA da mockup (ceramica `#F8F2E6`/`#D9CDB6`, gengiva `#E89AA4`/
  `#C97783`, metallo `#B9BEC6`/`#8E959E`, resina traslucida tratteggiata). I 6 simboli approvati
  1:1 dal mockup (`mk-corona`, `mk-provvisorio`, `mk-impianto`, `mk-ponte`, `mk-totale`,
  `mk-scheletrato`).
- **Risoluzione a 3 livelli** (mappa pura `src/lib/domain/miniature-lavoro.ts`, testabile):
  1. **Granulare**: `descrizione` → `TIPI_LAVORO` via aliases (`trovaTipo`/`cercaTipiLavoro`).
  2. **Macro** `tipo_dispositivo`: `protesi_fissa→corona · provvisorio→provvisorio ·
     implantologia→impianto · protesi_mobile→totale · scheletrato→scheletrato · cad_cam→corona ·
     ortodonzia→NUOVA (allineatore) · bite_splint→NUOVA (mascherina) · riparazione→NUOVA
     (protesi con linea di frattura) · altro→generica`.
  3. **Fallback**: dente singolo avorio (NUOVA).
- **4 miniature NUOVE**: mockup HTML di sola legenda (estensione della legenda del mockup v2)
  da approvare al gate §0B PRIMA del componente React.

## 9. Ciclo di vita dell'occupazione

### 9.1 Liberazione alla consegna (L5)
- **Aggancio**: `orchestraConsegna` DOPO lo Step 5 riuscito (`orchestrate.ts:233-243`) →
  `cassetta_libera_atomica(lab, lavoro, 'consegna')`. **Vincolo d'ordine (panel R11): la
  liberazione resta DOPO la generazione del Buono (Step 4)** — `BuonoTemplate.tsx:341` stampa
  `numero_cassetta`; da incidere nel piano perché non venga «ottimizzato». `numero_cassetta`
  azzerato DALLA RPC, non dall'update di Step 5 (una sola penna).
- **Fail-soft** (D-5): la consegna non si annulla mai per la cassetta. Riparazione a 3 strati:
  (a) ramo idempotente `gia_consegnato` di orchestrate richiama la libera (retry gratuito);
  (b) lettura auto-riparante §5; (c) auto-riparazione nella RPC assegna §4.3.
- **Racconto**: la RPC ritorna il nome → riga `CardUAHaFatto` «UÀ ha liberato la cassetta C12»
  SOLO se davvero liberata (L5). Coreografia §8.3.4 invariata (entra nella cascata stagger).
- **Nota architetturale da incidere nel commento della RPC libera:** l'aggancio vive in
  orchestrate; se una futura ondata attiva la dormiente `consegna_finalizza_atomica` come
  percorso di consegna, la liberazione va portata anche lì.

### 9.2 Consegnati pre-cutoff
I `lavori` consegnati prima del 21/07 conservano il residuo `numero_cassetta` (mai azzerato,
nessuno storico). Nessun lettore attivo lo stampa post-consegna; annotato per «Cerca» globale (§2).

### 9.3 Annullo consegna
Nella route `annulla-consegna`, DOPO l'esito `ok` della RPC fiscale (che NON si tocca):
`cassetta_riassegna_post_annullo` (§4.3), fail-soft. Response estesa in modo additivo:
`{ ok, messaggio, cassetta?: { riassegnata: boolean, nome?: string } }` → banner annullo con
riga quieta «La C12 nel frattempo è occupata» quando `riassegnata:false` con nome.

### 9.4 Rifacimento (D-10 — RATIFICATA 21/07)
L'unico «annullo lavoro» reale è `crea_rifacimento_atomico` (007): il lavoro vecchio va in
`annullato` e ne nasce uno nuovo. **Fisicamente il caso resta quasi sempre nella stessa
cassetta.** Proposta (panel backend): **trasferimento** — chiudi riga viva del vecchio
(`liberato_per='rifacimento'`) + apri riga viva sul nuovo + sync `numero_cassetta` di entrambi,
in una RPC dedicata chiamata dalla route rifacimento DOPO l'esito ok (la RPC 007 NON si tocca —
pattern §9.3). Alternativa scartata: liberare (`annullo_lavoro`) racconterebbe il falso.
Il valore `annullo_lavoro` resta nell'enum per eventuali percorsi futuri di annullo secco.

## 10. Integrazione scrittura cassetta nei flussi esistenti

- **`ConfermaCassettaSheet`** (pila blu): chips «dal parco» — cassette vive LIBERE ordinate per
  uso recente (max 6); `derivaCassetteSuggerite` riscritta sul nuovo dato. Campo libero →
  auto-provision (§4.3). Scrittura → `POST /api/lavori/[id]/cassetta`. Via di fuga invariata
  (L6). Race 409 → riga bloccante «La C12 è appena stata occupata» + reload chips.
- **`TabAccettazione.tsx:239-249`** (riserva bloccante R1, writer censito dal panel): il campo
  cassetta ESCE dal form multi-tab — la cassetta si gestisce da conferma-arrivo, sheet cassetta
  e (per lo spostamento) `POST /api/lavori/[id]/cassetta`. Motivo: lasciare il campo con
  l'allowlist ridotta = perdita silenziosa del dato al salvataggio. Il form mostra la cassetta
  attuale read-only con link «Cambia dalla parete» SOLO se già assegnata (niente editor doppio).
- **Test sentinella** (modello invariante D7): `numero_cassetta ∉ PATCHABLE_FIELDS`, per sempre.

## 11. Accesso globale

| Superficie | Intervento |
|---|---|
| **Manifest PWA** (`public/manifest.json:32-52`) | 3ª shortcut `{ name: "Le cassette", url: "/cassette" }` + icona dedicata (maskable, stile esistente) |
| **Tutto il resto** (`src/lib/dashboard/tutto-il-resto.ts:66-73`) | voce `{ chiave:'cassette', emoji:'🗄️', nome:'Le cassette', sub:'{n} occupate · {m} libere', href:'/cassette' }` subito dopo «Dentisti»; + voce condizionale «I lavori» (§7) |
| **NavDesk** (`src/components/ds/NavDesk.tsx:86-91`) | voce «Le cassette» in `VOCI_ALTRE` (prima di Agenda); vale anche per HomeDesktop; aggiornare `ds-v3-catalogo` |
| **Chrome pagine-lista** | il ☰ porta a Tutto il resto che ora contiene la voce — nessun intervento aggiuntivo |

## 12. Motion · suoni · haptic · a11y

- **Molle SOLO da token**: snap stanze `smooth` · accensione ricerca `snappy` · riordino
  `smooth` · sheet = Sheet ds. NIENTE `bouncy` (riservata a FATTA/Consegnato!).
- **Suoni/haptic**: creazione cassetta → `tap` + `vibra('light')`; liberazione dentro la
  coreografia Consegnato! (`ua`). Palette §9.1 chiusa: zero suoni nuovi.
- **Reduced-motion**: snap → salto; accensione → anello senza elevazione animata; dissolvenze
  150ms (§8.4).
- **A11y**: tray = `<button>` con `aria-label` completo («Cassetta C12, occupata: lavoro n.144,
  Bianchi, corona» / «Cassetta C4, libera»); dots/tablist come §6; drag con «Sposta» ▲▼ di
  prim'ordine; touch ≥44px ovunque; acceso/spento mai solo colore (anello + opacità +
  `aria-current`); `aria-live` per esiti ricerca e riordino; text-zoom 200% in QA.
- **3 viewport × 2 temi**: 390 (3 col, due stanze) · 768 (4 col, due stanze — peek verificato
  anche qui) · 1280 (6 col su `/cassette`; home desktop invariata). Dark: tray flat, NIENTE
  shadow raised.

## 13. Emendamenti spec v3 (in blocco a fine implementazione)

Già incisi il 20/07 (non toccare): §3.3 regola 5 · §6.1 voce «Le cassette» · §7.1 nota due
stanze · §7.16 nota «La tua home». **Nuovi:**
- **§5.35 `Cassetta` (tray)** — anatomia, 6 colori + custom (con regola luminanza > 0.55 →
  targa/testi scuri), stati occupata/libera/accesa/spenta, troncamento targa, **semantica gesti
  tap/long-press/drag**, dark flat.
- **§5.36 `MiniaturaLavoro`** — palette materica, mappa a 3 livelli, regola «nuova miniatura
  solo con mockup di legenda approvato».
- **§5.32 `ProgressDots`** — variante «stanze» (pillola attiva, tap-to-snap, tablist, hit-area 44).
- **§7.1** — da nota a paragrafo: anatomia due stanze (pager, peek 28px, TastoPiù+dots fissi
  fuori dal pager, cap N + «Tutte le cassette ›», inert), stanza iniziale e preferenza,
  deep-link `?stanza=`.
- **§7.17 «Le cassette» (`/cassette`)** — nuova sezione pagina (chrome, ricerca che accende,
  sheet nuova/cassetta con Sposta/Libera/Butta via, drag, vuoto, freschezza on-focus).
- **§8.3.# coreografia «l'accensione»** — anello+elevazione `snappy`, spegnimento in dissolvenza.
- **§6.1** — voce condizionale «I lavori» con preferenza `parete`.
- Dizionario: «cassetta», «parete», «targa», «libera/occupata», «La tua home», «Butta via»
  (già §2.3) applicato alla cassetta.

## 14. Decisioni (esiti panel) — tutte ratificate 21/07

| # | Decisione | Esito panel |
|---|---|---|
| D-1 | Verità = riga viva `cassette_lavori`; `numero_cassetta` denormalizzato sincronizzato SOLO dalle RPC | ACCETTATA 3/3, condizioni recepite: TabAccettazione migrata (§10), REVOKE scritture dirette (§4.5), riconciliazione (§9.1) |
| D-2 | Niente colonna `stato` su `cassette` | ACCETTATA 3/3 |
| D-3 | `posizione` lineare + colonne 3/4/6 | ACCETTATA; copy «nell'ordine del tuo muro» (§1); riordino atomico via RPC (§4.3) |
| D-4 | Scritture SOLO via RPC SECURITY DEFINER | ACCETTATA; assert tenant interni + FOR UPDATE + esiti json (§4.3) |
| D-5 | Fail-soft liberazione in consegna | ACCETTATA con emendamento: riparazione a 3 strati (§9.1) |
| D-6 | Preferenza in `nav_preferences`, UI interim v2.3 | ACCETTATA; micro-RPC merge atomico (§4.3); voce «I lavori» condizionale (§7) |
| D-7 | Due stanze SOLO <1024 | ACCETTATA; gate L2 verifica peek anche a 768 |
| D-8 | Stanza Parete read-only-ish | ACCETTATA; tap libera/nuova = navigazione percepibile |
| D-9 | Backfill solo aperti, vince il più recente | ACCETTATA con emendamenti: normalizzazione, NULL sul perdente, natural sort, idempotenza (§4.4) |
| **D-10** | **Rifacimento = TRASFERIMENTO cassetta al lavoro nuovo** (§9.4) | **RATIFICATA da Francesco 21/07** — RPC `cassetta_trasferisci_rifacimento` nel piano Task 1, aggancio Task 9 |

## 15. QA e gate

- **Lab E2E** `00000000-…-0001` (MAI lab Filippo), seed aggiornato (§4.4.5). Scenari:
  crea/rinomina/colore/butta via (409 se occupata); assegna da conferma-cassetta (chip + nome
  nuovo normalizzato + fuga); 1-lavoro-per-cassetta (409 esito `occupata`); consegna →
  liberazione + racconto (e NIENTE racconto se senza cassetta); annullo → riassegnata vs
  occupata-nel-frattempo; rifacimento → trasferimento (se D-10 ratificata); «Segna come
  libera»; sposta-in; ricerca accende/spegne (tappabili); riordino persiste + politica
  tollerante; preferenza 3 modi + deep-link `?stanza=` + voce «I lavori»; backfill su fixture
  (collisioni, dedupe case/spazi); auto-riparazione cassetta-fantasma; **PWA iOS edge-swipe**
  (M1); text-zoom 200%.
- **Test contract-locked** (lista panel backend §4 recepita integralmente): sentinella
  PATCHABLE_FIELDS; esiti RPC assegna (occupata/cross-tenant/auto-provision/spostamento);
  idempotenza libera; trigger guard (4 casi); rinomina sync + 409; riordino set-validation;
  race elimina∥assegna; `derivaCassetteSuggerite` riscritta; backfill; contratto response
  annullo esteso.
- **FASE 6b**: gen types + tsc + verifica RLS post-migration. **FASE 7** completa.
- **GATE ESTETICO L2**: `/cassette`, stanza Parete (incluse miniature a 22px — fallback §6),
  peek/dots (390 E 768), sheet nuova/cassetta, ConfermaCassettaSheet, riga preferenza, parete
  «molto rossa» vs gerarchia TastoPiù — 390/768/1280 × light/dark, confronto diretto col
  mockup v2 (fedeltà TOTALE).

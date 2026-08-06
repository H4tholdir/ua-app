# Piano — «Si deve sempre poter intervenire» (D264-D271)

> **Per gli esecutori:** SOTTO-SKILL RICHIESTA — `superpowers:subagent-driven-development`
> (un compito per esecutore fresco, R-E1) oppure `superpowers:executing-plans`. I passi usano
> caselle (`- [ ]`).
> 🛑 **R-E2:** un difetto trovato **fuori dal proprio mandato si RIFERISCE** in fondo al proprio
> referto, **non si corregge**. Una correzione silenziosa lascia il piano sbagliato per tutti i
> compiti successivi.

**Spec:** `docs/superpowers/specs/2026-08-06-intervento-post-consegna-design.md` — **letta per intera
prima di ogni task**, non riassunta.

**Obiettivo:** dare al laboratorio **un modo di rientrare in un lavoro consegnato dichiarando il
motivo**, e far discendere da quel motivo gli obblighi documentali, di qualità e di segnalazione — al
posto dell'utente, e senza mai bloccarlo.

**Architettura:** nasce `eventi_qualita` (il **fatto**) con `valutazioni_evento` (il **giudizio**,
append-only, l'ultima supera le precedenti). Sta **sopra** il rifacimento, che diventa uno degli
esiti e resta intatto. La finestra dei dieci minuti sparisce; il cancello di qualità non si chiude
mai, quello commerciale resta dov'è.

**Stack:** Next.js 16 (App Router) · Supabase/PostgreSQL con RLS · TypeScript · Vitest · TailwindCSS
v4 · Motion 12 · Design System **v3** (la scheda lavoro è già v3).

---

## Vincoli globali — valgono per OGNI task

| Vincolo | Valore esatto |
|---|---|
| **Ordine dei test** | ① criteri di incidente → ② coinvolgimento → ③ conseguenze sulla salute. **Mai** assegnare `reclamo` prima di aver escluso l'incidente (D268, spec §3 e §6) |
| **Fatti, non conseguenze** | Nelle colonne dell'evento si scrivono fatti. Le classificazioni si **derivano** e si fanno **confermare** da una persona (D267) |
| **Nessun blocco nuovo** | Il cancello di qualità **non si chiude mai**. L'unico blocco ammesso è quello commerciale già esistente, e **non** deve toccare il documento sanitario (D262, D265) |
| **Sola-aggiunta dal database** | `valutazioni_evento` non si aggiorna e non si cancella: la garanzia la dà il **database** (revoca dei permessi), non il codice (D270) |
| 🔴 **`REVOKE` include SEMPRE `service_role`** | Aggiunto dopo il Task 1, dove mancava. `service_role` riceve `ALL` dalle *default privileges* di Supabase e ha **`bypassrls`**: revocare solo ad `anon, authenticated` **non protegge niente** contro il ruolo che l'app usa davvero. Nota «E8» in `20260721090000_parete_cassette.sql:126-139` |
| 🔴 **Chiavi esterne fra tabelle di tenant: COMPOSITE** | Aggiunto dopo il Task 1. Sempre `(x_id, laboratorio_id)` con `UNIQUE (id, laboratorio_id)` sulla tabella puntata: la RLS controlla **solo** la riga che si inserisce, non chi possiede la riga puntata. Pattern in casa: `20260727120000_lavori_denti.sql:8` · `20260804150306_…:50-54` |
| 🔎 **Il precedente si cerca per COMPORTAMENTO** | «Chi altro in questo repo protegge un riferimento fra tenant?», non «cerchiamo una tabella con un nome simile». È il controllo che avrebbe evitato i due difetti sopra |
| **Nome del documento** | Ogni testo **nuovo** dice **«la dichiarazione»**, mai «dichiarazione di conformità» (spec §8.4) |
| **Ruoli** | Sono **cinque**: `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. Mai `admin` nudo |
| **RLS** | `public.current_lab_id()`, **mai** `auth.current_lab_id()` |
| **Design System** | La scheda lavoro è **v3**: token da `src/design-system/v3/*`, componenti **solo** da `src/components/ds/`. Mai mischiare v2.3 e v3 nella stessa pagina |
| **Motion** | Mai `duration` inline. Solo `molla` da `@/design-system/v3/motion` |
| **Dopo ogni migration** | FASE 6b: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` poi `npx tsc --noEmit` |
| **Prima di dire «fatto»** | FASE 7: `npx tsc --noEmit` **e** `npx vitest run` **e** `npx next build`. Tutti e tre, output reale |

---

## Registro delle prove — R-P1

`provato:` `node scripts/tmp/sonda-intervento-r-p1.mjs` (06/08/2026, catalogo **vivo**, non i file).
Esito integrale in `scripts/tmp/sonda-intervento-esito.txt`. Lo spike è usa e getta e **non si
committa**.

| # | Assunzione | Esito |
|---|---|---|
| A1 | `incidenti_mdr_tipo_check` | **PROVATO**: `CHECK (tipo = ANY (ARRAY['anomalia','incidente','incidente_grave','azione_correttiva_sicurezza']))`. Il vocabolario di `20260514_mdr_qualita.sql` **non esiste** |
| A1 | `lavori_rifacimenti_motivo_check` | **PROVATO**: `colore_sbagliato · misura_errata · fusione_difettosa · rottura_produzione · non_confortevole · errore_prescrizione · altro` |
| A1 | `lavori_rifacimenti_rilevato_in_check` | **PROVATO**: `produzione · prova_1 · prova_2 · prova_3 · post_consegna` — **un solo valore post-consegna** |
| A1 | `rifacimento_nuovo_unique` | **PROVATO**: `UNIQUE (laboratorio_id, lavoro_nuovo_id)` |
| A2 | Il modello per l'append-only | **PROVATO**: `ddc_lavoro_attiva_unique` = `UNIQUE (laboratorio_id, lavoro_id) WHERE (stato <> 'annullata')`. **È la forma da copiare in `valutazioni_evento`** |
| A3 | `lavori_rifacimenti.lavoro_nuovo_id` | **PROVATO**: `uuid nullable=NO`. Conferma D266: la tabella **non può** esprimere «corretto sul posto» |
| A4 | `lavori.post_consegna_correzioni` | **PROVATO CHE ESISTE**: `smallint default 0`. Mai incrementata — la usa il Task 4 |
| A5 | Firma viva dell'annullo | **PROVATO**: `annulla_consegna_atomica(uuid,uuid,integer)`; il corpo contiene `p_finestra_ms`, **`fattura_gia_emessa` (due volte)**, `incluso_in_fattura`, `finestra_scaduta`. ⚠️ **Il range è 1s–15min** (`RAISE` alla riga 13-14 del corpo vivo): «finestra più lunga» non passa senza cambiare firma. **La collisione D265×D269 è provata, non supposta** |
| A5 | Il fail-closed sulla dichiarazione | **PROVATO**: righe 58-63 del corpo vivo — se dopo l'annullo restano DdC in stato incoerente, `RAISE EXCEPTION 'annullo: DdC in stato incoerente per lavoro %'`; se non ce n'è nessuna, `v_ddc_assente := true` e si prosegue segnalando. **Questa garanzia va conservata nella RPC nuova** |
| A6 | Quanti dati veri | **PROVATO**: `lavori_rifacimenti` **2** · `incidenti_mdr` **0** · `dichiarazioni_conformita` **6** · `fatture` **1** · `lavori` **299**. ➡️ **Nessun backfill da difendere** (e `CLAUDE.md` §8: dati tutti di prova). Il rigore va su schema/RLS/RPC |
| A6 | `rilevato_in` sui dati veri | **PROVATO**: `post_consegna=1 · (null)=1`. Coerente col ritrovamento «l'interfaccia non lo spedisce mai» |
| A7 | 🔴 **Prova di RIFIUTO** — `tipo='reclamo'` | **PROVATO CHE FALLISCE**: `new row for relation "incidenti_mdr" violates check constraint "incidenti_mdr_tipo_check"`. ➡️ Chi scrivesse «reclamo» in quella tabella romperebbe in produzione |
| A7 | 🔴 **Prova di RIFIUTO** — `tipo='non_conformita'` | **PROVATO CHE FALLISCE**, stesso vincolo. È **il valore del file `007`**: l'errore era reale |
| A7 | Controprova | **PROVATO**: `tipo='incidente_grave'` è **accettato** — il vincolo non rifiuta tutto, quindi le due prove sopra provano qualcosa |

**Tutto ciò che non è in questa tabella è `non eseguito`**, e ogni task porta il comando con cui il
suo esecutore lo verificherà.

---

## Registro delle letture — R-P2

L'elenco **non lo decide l'autore del piano**: esce dal censimento §12 della spec. Stato alla
scrittura del piano:

| Percorso | Stato |
|---|---|
| `src/lib/consegna/orchestrate.ts` | **letto**: righe 258-315 (ordine dichiarazione → stato) |
| `src/app/api/lavori/[id]/annulla-consegna/route.ts` | **letto**: righe 120, 146-149 |
| `src/app/api/lavori/[id]/rifacimento/route.ts` | **letto**: righe 8-18 |
| `src/components/features/lavori/RifacimentoButton.tsx` | **letto**: righe 49-51, 87-89 |
| `src/components/features/lavori/AnnullaConsegnaBanner.tsx` | **letto**: righe 5, 33, 146-166 |
| `annulla_consegna_atomica` | **letto dal CATALOGO VIVO** (`scripts/tmp/vivo-annulla_consegna_atomica.sql`) |
| `src/types/database.types.ts` | **letto**: `incidenti_mdr`, `dichiarazioni_conformita`, `lavori_rifacimenti` |
| `src/lib/lavori/transizioni.ts` | **letto**: righe 8-16 (`consegnato` non ha uscite) |
| `src/lib/pdf/generate-ddc.ts` | ⚠️ **NON letto** — solo l'esistenza del ritorno anticipato alle righe 100-104. **Task 5 lo apre per primo** |
| `src/components/features/lavori/consegna-v3/FrameConsegnato.tsx` | ⚠️ **NON letto** — il censimento segnala un letterale nudo `10*60*1000` alla riga 32. **Task 7 lo apre per primo** |
| `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` | ⚠️ **NON letto** (righe 217, 462, 573 riferite). **Task 6 e Task 8 lo aprono** |
| `src/app/api/qualita/incidenti/route.ts` · `psur/route.ts` | ⚠️ **NON letti**. Task 4 apre il primo |
| `src/lib/domain/prescrizione-costanti.ts` | ⚠️ **NON letto** (righe 53-58 riferite). **Task 2 lo apre** |
| `src/lib/consegna/whatsapp-template.ts` | ⚠️ **NON letto**. Fuori perimetro dei task 1-5 |

🛑 **Ogni task apre i propri file PRIMA di scrivere**, e se un riferimento non corrisponde **quello è
un ritrovamento** (R-E2), non un refuso da correggere in silenzio.

---

## Censimento degli identificatori — R-P6

**Nomi nuovi introdotti** (nessuno collide con un identificatore esistente — `provato:`
`grep -rn "eventi_qualita\|valutazioni_evento\|riapri_lavoro" src/ supabase/ tests/` → 0 riscontri):

`eventi_qualita` · `valutazioni_evento` · `riapri_lavoro_atomica` · `evento_id` ·
`origine_informazione` · `conosciuto_il` · `stato_dispositivo` · `potenziale_di_danno` ·
`sostituisce_id` · `motivo_riclassificazione` · `certificazione_iso13485`

**Nomi esistenti toccati, e la destinazione di ciascuno:**

| Identificatore | Oggi | Destinazione |
|---|---|---|
| `FINESTRA_ANNULLO_MS` | `src/lib/consegna/costanti.ts:6` | **RIMOSSO** (Task 7). La sua prova `tests/unit/consegna-costanti.test.ts:11-12` **non si cancella**: diventa la prova che la finestra non esiste più |
| `10 * 60 * 1000` (letterale nudo) | `FrameConsegnato.tsx:32` | **RIMOSSO** (Task 7) — copia che una ricerca sul nome della costante **non trova** |
| `annulla_consegna_atomica` | RPC viva | **RESTA IN VITA** finché il vecchio percorso non è rimosso; **muore col Task 7**. Non viene allargata (spec §7) |
| `esito: 'finestra_scaduta'` | `annulla-consegna/route.ts:146-149` | **RIMOSSO col percorso** (Task 7) |
| `lavori.post_consegna_correzioni` | esiste, `smallint default 0`, mai incrementata | **DIVENTA VIVA** (Task 4): la incrementa la creazione dell'evento |
| `lavori_rifacimenti.motivo` / `.rilevato_in` | invariati | **RESTANO**, come motivo del *rifacimento produttivo*. La qualificazione la porta l'evento (spec §5) |
| `incidenti_mdr.tipo` | 4 valori, `reclamo` **rifiutato** (A7) | **INVARIATO.** `reclamo` **non** entra qui: è un esito di valutazione |

---

## Struttura dei file

**Nuovi**
- `supabase/migrations/<ts>_eventi_qualita.sql` — le due tabelle, i vincoli, RLS, sola-aggiunta
- `supabase/migrations/<ts>_riapri_lavoro_atomica.sql` — la RPC nuova
- `src/lib/domain/qualita-costanti.ts` — vocabolari chiusi e mappa `motivo → natura` 🆕
- `src/lib/qualita/classifica.ts` — i tre test nell'ordine ministeriale, **funzione pura** 🆕
- `src/app/api/lavori/[id]/eventi-qualita/route.ts` — crea l'evento 🆕
- `src/app/api/eventi-qualita/[id]/valutazioni/route.ts` — deposita la valutazione 🆕
- `tests/unit/qualita-classifica.test.ts` · `tests/unit/eventi-qualita-route.test.ts` 🆕

**Modificati**
- `src/lib/consegna/costanti.ts` · `AnnullaConsegnaBanner.tsx` · `FrameConsegnato.tsx` ·
  `SchedaLavoroV3.tsx` · `src/lib/pdf/generate-ddc.ts` · `src/types/database.types.ts`

**La responsabilità è divisa così di proposito:** `qualita-costanti.ts` porta **solo dati** (nessuna
logica), `classifica.ts` **solo decisioni** (nessun accesso al database). È ciò che rende i tre test
provabili senza toccare Supabase, ed è il pezzo su cui si gioca la correttezza normativa.

---

## Task 1 — Le due tabelle, e la sola-aggiunta imposta dal database

**File**
- Crea: `supabase/migrations/<timestamp>_eventi_qualita.sql`
- Modifica: `src/types/database.types.ts` (rigenerato, mai a mano)

**Interfacce prodotte:** tabelle `public.eventi_qualita` e `public.valutazioni_evento`; colonne
`lavori_rifacimenti.evento_id` (nullable) e `laboratori.certificazione_iso13485`.

- [ ] **Passo 1 — apri i file del tuo mandato prima di scrivere (R-P2)**

Leggi `supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql` (il modello dell'indice
unico parziale) e `supabase/migrations/20260804154232_ondata_b_ddc_chiusura_update.sql` (il modello
della revoca di UPDATE). **Non copiare a memoria: apri.**

- [ ] **Passo 2 — scrivi la migration**

```sql
-- eventi_qualita — il FATTO. Non cambia lo stato del lavoro (D266).
CREATE TABLE IF NOT EXISTS public.eventi_qualita (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id       UUID NOT NULL REFERENCES public.laboratori(id) ON DELETE CASCADE,
  lavoro_id            UUID NOT NULL REFERENCES public.lavori(id),
  motivo               TEXT NOT NULL CHECK (motivo IN (
                         'errore_dato_dichiarazione','difetto_lavorazione','difetto_materiale',
                         'destinatario_errato','modifica_clinica_richiesta','errore_prezzo_quantita',
                         'reso_senza_difetto','errore_registrazione','altro')),
  motivo_libero        TEXT,
  natura               TEXT NOT NULL CHECK (natura IN (
                         'dato_documentale','difetto_fisico','identificazione_destinatario',
                         'nuova_esigenza_clinica','nessun_difetto','commerciale','errore_registrazione')),
  origine_informazione TEXT NOT NULL CHECK (origine_informazione IN (
                         'laboratorio_interno','odontoiatra','paziente_tramite_medico',
                         'autorita_competente','altro_operatore')),
  conosciuto_il        TIMESTAMPTZ NOT NULL,
  stato_dispositivo    TEXT NOT NULL CHECK (stato_dispositivo IN (
                         'mai_uscito_dal_lab','consegnato_non_applicato','applicato','non_noto')),
  potenziale_di_danno  TEXT NOT NULL DEFAULT 'da_valutare' CHECK (potenziale_di_danno IN (
                         'nessuno','da_valutare','possibile','accertato')),
  note                 TEXT,
  created_by           UUID REFERENCES public.utenti(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- «altro» senza testo è un buco che si scopre in audit, non al banco
  CONSTRAINT evento_altro_ha_testo CHECK (motivo <> 'altro' OR (motivo_libero IS NOT NULL AND length(btrim(motivo_libero)) > 0))
);

-- valutazioni_evento — il GIUDIZIO. Append-only: l'ultima supera le precedenti (D270).
CREATE TABLE IF NOT EXISTS public.valutazioni_evento (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id          UUID NOT NULL REFERENCES public.laboratori(id) ON DELETE CASCADE,
  evento_id               UUID NOT NULL REFERENCES public.eventi_qualita(id),
  esito                   TEXT NOT NULL CHECK (esito IN (
                            'nessuna_azione','non_conformita_interna','reclamo',
                            'incidente','incidente_grave')),
  giustificazione         TEXT,
  sostituisce_id          UUID REFERENCES public.valutazioni_evento(id),
  motivo_riclassificazione TEXT,
  superata                BOOLEAN NOT NULL DEFAULT false,
  classificato_da         UUID REFERENCES public.utenti(id) ON DELETE SET NULL,
  classificato_il         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- «nessuna azione» senza il perché è esattamente ciò che §8.2.2 vieta
  CONSTRAINT valutazione_nessuna_azione_giustificata
    CHECK (esito <> 'nessuna_azione' OR (giustificazione IS NOT NULL AND length(btrim(giustificazione)) > 0)),
  -- riclassificare senza dire perché è il movimento che un ispettore guarda per primo
  CONSTRAINT valutazione_riclassifica_motivata
    CHECK (sostituisce_id IS NULL OR (motivo_riclassificazione IS NOT NULL AND length(btrim(motivo_riclassificazione)) > 0)),
  CONSTRAINT valutazione_no_self_ref CHECK (id <> sostituisce_id)
);

-- Una sola valutazione VIVA per evento — stessa forma di ddc_lavoro_attiva_unique (provato A2)
CREATE UNIQUE INDEX IF NOT EXISTS valutazione_viva_unique
  ON public.valutazioni_evento (laboratorio_id, evento_id) WHERE (superata = false);

CREATE INDEX IF NOT EXISTS eventi_qualita_lavoro_idx ON public.eventi_qualita (laboratorio_id, lavoro_id);

-- Il giunto: il rifacimento diventa un ESITO, nullable (D266)
ALTER TABLE public.lavori_rifacimenti
  ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES public.eventi_qualita(id);

-- D271 — tre stati, e il default si comporta come «certificato» (spec §17.1)
ALTER TABLE public.laboratori
  ADD COLUMN IF NOT EXISTS certificazione_iso13485 TEXT NOT NULL DEFAULT 'non_dichiarato'
  CHECK (certificazione_iso13485 IN ('certificato','non_certificato','non_dichiarato'));

ALTER TABLE public.eventi_qualita     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valutazioni_evento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventi_qualita_lab" ON public.eventi_qualita
  FOR ALL USING (laboratorio_id = public.current_lab_id())
  WITH CHECK (laboratorio_id = public.current_lab_id());

-- 🛑 SOLA LETTURA + SOLA AGGIUNTA: nessun UPDATE, nessun DELETE. La garanzia la dà il DATABASE.
CREATE POLICY "valutazioni_evento_lab_select" ON public.valutazioni_evento
  FOR SELECT USING (laboratorio_id = public.current_lab_id());
CREATE POLICY "valutazioni_evento_lab_insert" ON public.valutazioni_evento
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

REVOKE UPDATE, DELETE ON public.valutazioni_evento FROM anon, authenticated;

COMMENT ON TABLE public.valutazioni_evento IS
  'Append-only (D270). Una classificazione sbagliata si supera con una riga nuova che punta alla '
  'precedente e ne dichiara il motivo; la vecchia si marca superata=true. MAI un UPDATE del giudizio: '
  'ISO 13485 §4.2.5 richiede che le modifiche a una registrazione restino identificabili.';
```

- [ ] **Passo 3 — applica e prova che i vincoli RIFIUTANO (R-P1)**

Le prove di rifiuto girano **in transazione annullata**, mai su una migration registrata:

```bash
node --input-type=module -e "
import {readFileSync} from 'node:fs'; import pg from 'pg';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(r=>r.includes('=')&&!r.trim().startsWith('#')).map(r=>[r.slice(0,r.indexOf('=')).trim(),r.slice(r.indexOf('=')+1).trim().replace(/^[\"']|[\"']\$/g,'')]));
const c=new pg.Client({connectionString:env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}}); await c.connect();
const lab=(await c.query('SELECT id FROM laboratori LIMIT 1')).rows[0].id;
const lav=(await c.query('SELECT id FROM lavori WHERE laboratorio_id=\$1 LIMIT 1',[lab])).rows[0].id;
for (const [nome,sql,par] of [
 ['motivo fuori vocabolario', \"INSERT INTO eventi_qualita (laboratorio_id,lavoro_id,motivo,natura,origine_informazione,conosciuto_il,stato_dispositivo) VALUES (\$1,\$2,'pippo','difetto_fisico','odontoiatra',now(),'applicato')\",[lab,lav]],
 ['altro senza testo',        \"INSERT INTO eventi_qualita (laboratorio_id,lavoro_id,motivo,natura,origine_informazione,conosciuto_il,stato_dispositivo) VALUES (\$1,\$2,'altro','difetto_fisico','odontoiatra',now(),'applicato')\",[lab,lav]],
]) { await c.query('BEGIN'); try { await c.query(sql,par); console.log('❌ ATTESO RIFIUTO, ACCETTATO:',nome);} catch(e){ console.log('✅ rifiutato',nome,'→',e.message.split('\n')[0]); } await c.query('ROLLBACK'); }
await c.end();"
```

**Atteso:** due righe `✅ rifiutato`. **Se una sola riga dice `❌`, il task NON è finito.**

- [ ] **Passo 4 — FASE 6b, obbligatoria**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

Atteso: `tsc` **0 errori**, e `eventi_qualita` presente in `database.types.ts`.

- [ ] **Passo 5 — salva**

```bash
git add supabase/migrations src/types/database.types.ts
git commit -m "feat(qualita): eventi_qualita e valutazioni_evento, con la sola-aggiunta imposta dal database"
```

---

## Task 2 — Il dizionario e i tre test, nell'ordine ministeriale

🔑 **È il task su cui si gioca la correttezza normativa dell'ondata.** Funzioni pure: nessun accesso
al database, quindi tutto provabile.

**File**
- Crea: `src/lib/domain/qualita-costanti.ts` · `src/lib/qualita/classifica.ts` 🆕
- Test: `tests/unit/qualita-classifica.test.ts` 🆕
- Leggi (R-P2): `src/lib/domain/prescrizione-costanti.ts:53-58` — `richiesta_dentista` **è già il
  caso 5**, e il nostro `nuova_esigenza_clinica` **vi rimanda, non lo duplica**

**Interfacce prodotte**
```typescript
export type Natura = 'dato_documentale' | 'difetto_fisico' | 'identificazione_destinatario'
  | 'nuova_esigenza_clinica' | 'nessun_difetto' | 'commerciale' | 'errore_registrazione'
export type Esito = 'nessuna_azione' | 'non_conformita_interna' | 'reclamo' | 'incidente' | 'incidente_grave'
export function naturaDaMotivo(motivo: Motivo): Natura | null   // null solo per 'altro'
export function classifica(f: FattiEvento): Proposta            // { esito, perche, ramoIso, termineOre }
```

- [ ] **Passo 1 — scrivi le prove che devono fallire**

```typescript
import { describe, it, expect } from 'vitest'
import { classifica } from '@/lib/qualita/classifica'

const base = {
  natura: 'difetto_fisico', origine: 'odontoiatra',
  statoDispositivo: 'applicato', potenzialeDiDanno: 'nessuno',
} as const

describe('classifica — ordine ministeriale (D268)', () => {
  it('il difetto segnalato dal dentista PRIMA dell applicazione è un RECLAMO, non lavoro interno', () => {
    // È il caso 2 ribaltato dal panel: il Ministero lo chiama il caso TIPICO di reclamo
    const p = classifica({ ...base, statoDispositivo: 'consegnato_non_applicato' })
    expect(p.esito).toBe('reclamo')
  })

  it('il danno POSSIBILE fa incidente ANCHE se il dispositivo non era applicato', () => {
    // Il test dell incidente viene PRIMA: invertirlo nasconderebbe l obbligo dell Art. 88
    const p = classifica({ ...base, statoDispositivo: 'consegnato_non_applicato', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })

  it('il danno ACCERTATO su persona è incidente GRAVE, con il termine dei 15 giorni', () => {
    const p = classifica({ ...base, potenzialeDiDanno: 'accertato' })
    expect(p.esito).toBe('incidente_grave')
    expect(p.termineOre).toBe(15 * 24)
  })

  it('«da valutare» NON scivola in reclamo: resta candidato incidente', () => {
    // Art. 87(7): nel dubbio si segnala. Un default prudente non deve essere aggirabile
    const p = classifica({ ...base, potenzialeDiDanno: 'da_valutare' })
    expect(p.esito).toBe('incidente')
  })

  it('il difetto visto DAL LABORATORIO, senza danno, è non conformità interna — non reclamo', () => {
    const p = classifica({ ...base, origine: 'laboratorio_interno', statoDispositivo: 'consegnato_non_applicato' })
    expect(p.esito).toBe('non_conformita_interna')
    expect(p.ramoIso).toBe('8.3.3')   // era già uscito dal controllo
  })

  it('il difetto visto in casa PRIMA che esca è §8.3.2, non §8.3.3', () => {
    const p = classifica({ ...base, origine: 'laboratorio_interno', statoDispositivo: 'mai_uscito_dal_lab' })
    expect(p.ramoIso).toBe('8.3.2')
  })

  it('la richiesta clinica nuova NON è una non conformità', () => {
    const p = classifica({ ...base, natura: 'nuova_esigenza_clinica', origine: 'odontoiatra' })
    expect(p.esito).toBe('nessuna_azione')
  })

  it('«non lo so» sullo stato del dispositivo non blocca e non declassa', () => {
    // Francesco, 06/08: «spesso non lo sappiamo». I tre test non chiedono mai se fosse applicato
    const p = classifica({ ...base, statoDispositivo: 'non_noto', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })

  it('ogni proposta porta il PERCHÉ in chiaro', () => {
    expect(classifica(base).perche.length).toBeGreaterThan(10)
  })
})
```

- [ ] **Passo 2 — falle fallire, e CONTA (R-P4)**

```bash
npx vitest run tests/unit/qualita-classifica.test.ts 🆕
```

Atteso: fallimento da modulo non trovato. **Poi metti un abbozzo inerte**
(`export function classifica() { return { esito: 'nessuna_azione', perche: '', ramoIso: '8.3.2', termineOre: null } }`)
e **rilancia**: scrivi nel referto **quante asserzioni si accendono** (`N su 9`). Un rosso da modulo
mancante non prova che le prove provino qualcosa.

- [ ] **Passo 3 — implementa, nell'ordine ministeriale**

```typescript
export function classifica(f: FattiEvento): Proposta {
  // Fuori dal sistema qualità: il caso 5 e il caso 6 (spec §6)
  if (f.natura === 'nuova_esigenza_clinica')
    return { esito: 'nessuna_azione', perche: 'Il medico chiede una cosa nuova: il dispositivo era conforme alla prescrizione con cui è stato fatto. Serve una prescrizione nuova, non una correzione.', ramoIso: null, termineOre: null }
  if (f.natura === 'commerciale' || f.natura === 'errore_registrazione')
    return { esito: 'nessuna_azione', perche: 'Non tocca il dispositivo né il documento sanitario.', ramoIso: null, termineOre: null }

  // ① IL TEST DELL'INCIDENTE VIENE PRIMA — invertirlo nasconde l'obbligo dell'Art. 88 (D268)
  if (f.potenzialeDiDanno !== 'nessuno') {
    if (f.potenzialeDiDanno === 'accertato')
      return { esito: 'incidente_grave', perche: 'Ci sono state conseguenze accertate sulla salute: va valutata la segnalazione all\'autorità.', ramoIso: '8.3.3', termineOre: 15 * 24 }
    return { esito: 'incidente', perche: 'C\'è un potenziale di danno da valutare: prima di parlare di reclamo va escluso l\'incidente.', ramoIso: '8.3.3', termineOre: null }
  }

  // ② e ③ — coinvolgimento, poi conseguenze (che qui sono già escluse)
  const uscito = f.statoDispositivo !== 'mai_uscito_dal_lab'
  if (uscito && f.origine !== 'laboratorio_interno')
    return { esito: 'reclamo', perche: 'Il dispositivo aveva lasciato il laboratorio e la segnalazione arriva da fuori: per la norma è un reclamo, anche se non è ancora stato applicato.', ramoIso: '8.3.3', termineOre: null }

  return { esito: 'non_conformita_interna', perche: uscito
    ? 'Ce ne siamo accorti noi, a dispositivo già uscito.'
    : 'Ce ne siamo accorti noi, prima che uscisse.', ramoIso: uscito ? '8.3.3' : '8.3.2', termineOre: null }
}
```

- [ ] **Passo 4 — verde, e censisci le forme d'input (R-P4)**

```bash
npx vitest run tests/unit/qualita-classifica.test.ts 🆕
```

Atteso: **9 passate**. Poi scrivi nel referto, per ognuna: valore fuori vocabolario · campo assente ·
`null` · tipo sbagliato → **coperta da quale prova, oppure «non coperta, perché»**.

- [ ] **Passo 5 — salva**

```bash
git add src/lib/domain/qualita-costanti.ts src/lib/qualita/classifica.ts tests/unit/qualita-classifica.test.ts 🆕
git commit -m "feat(qualita): i tre test nell'ordine ministeriale, come funzione pura"
```

---

## Task 3 — `riapri_lavoro_atomica`: la RPC nuova, senza i cancelli fiscali

🛑 **Il motivo per cui è nuova e non un allargamento** è provato in A5: `annulla_consegna_atomica`
porta `fattura_gia_emessa` **due volte** e `incluso_in_fattura`. Riusarla farebbe **rifiutare la
correzione di un dato su un lavoro fatturato**, cioè il contrario di D265.

**File**
- Crea: `supabase/migrations/<timestamp>_riapri_lavoro_atomica.sql`
- Leggi per primo (R-P2): `scripts/tmp/vivo-annulla_consegna_atomica.sql` — **il corpo vivo**, righe
  40-67, per portare via il ripristino e **il fail-closed sulla dichiarazione**, e lasciare i cancelli

- [ ] **Passo 1 — scrivi la RPC**

Conserva: ripristino a `pronto`, azzeramento di `conformato`/`data_conformazione`, annullamento della
dichiarazione, **e il fail-closed** (se restano dichiarazioni in stato incoerente → eccezione).
Lascia fuori: `p_finestra_ms`, `fattura_gia_emessa`, `incluso_in_fattura`.

```sql
CREATE OR REPLACE FUNCTION public.riapri_lavoro_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_lavoro RECORD; v_rows int; v_ddc_tot int; v_ddc_assente boolean := false;
BEGIN
  SELECT * INTO v_lavoro FROM lavori
   WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito','non_consegnato'); END IF;

  -- L'evento deve esistere e appartenere a questo lavoro: la riapertura non è mai senza motivo (D263)
  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito','evento_non_valido'); END IF;

  -- 🛑 NESSUN cancello fiscale qui: il documento sanitario si corregge sempre (D265).
  --    Il cancello commerciale vive a monte, dove si sceglie l'esito.
  UPDATE lavori SET stato='pronto', conformato=false, data_conformazione=NULL,
                    data_consegna_effettiva=NULL, consegna_completata_at=NULL
   WHERE id=p_lavoro_id AND laboratorio_id=p_laboratorio_id AND stato='consegnato';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'riapertura: ripristino lavoro fallito'; END IF;

  UPDATE dichiarazioni_conformita SET stato='annullata'
   WHERE lavoro_id=p_lavoro_id AND laboratorio_id=p_laboratorio_id
     AND stato IN ('bozza','generata','firmata','consegnata');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT count(*) INTO v_ddc_tot FROM dichiarazioni_conformita
     WHERE lavoro_id=p_lavoro_id AND laboratorio_id=p_laboratorio_id;
    IF v_ddc_tot = 0 THEN v_ddc_assente := true;   -- dato legacy: consenti, segnala
    ELSE RAISE EXCEPTION 'riapertura: dichiarazione in stato incoerente per lavoro %', p_lavoro_id;
    END IF;
  END IF;

  RETURN json_build_object('esito','ok','ddc_assente',v_ddc_assente);
END $$;

REVOKE EXECUTE ON FUNCTION public.riapri_lavoro_atomica(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.riapri_lavoro_atomica(uuid,uuid,uuid) TO service_role;
```

- [ ] **Passo 2 — prova che il cancello fiscale NON blocca più (è il senso di D265)**

Su un lavoro **con fattura emessa**, in transazione annullata: `riapri_lavoro_atomica` deve tornare
`esito='ok'`. **Se torna `fattura_gia_emessa`, hai riusato la funzione sbagliata.**
E prova che `p_evento_id` inesistente torna `evento_non_valido` — un vincolo si prova con ciò che
**deve** essere rifiutato.

- [ ] **Passo 3 — FASE 6b + salva** (rigenera i tipi, `npx tsc --noEmit`, poi commit)

---

## Task 4 — Le due rotte: crea l'evento, deposita la valutazione

**File**
- Crea: `src/app/api/lavori/[id]/eventi-qualita/route.ts` · 🆕
  `src/app/api/eventi-qualita/[id]/valutazioni/route.ts` 🆕
- Test: `tests/unit/eventi-qualita-route.test.ts` 🆕
- Leggi per primo (R-P2): `src/app/api/lavori/[id]/rifacimento/route.ts` (il modello di rotta con
  `isSameOrigin`, `getFreshLabContext`, `assertLabOperativo`) e `src/app/api/qualita/incidenti/route.ts`

**Regole non negoziabili di questo task**
1. `isSameOrigin` sempre (la guardia CSRF del pre-commit lo verifica).
2. La rotta **restituisce la proposta**, non deposita la classificazione: `POST` dell'evento torna
   `{ evento, proposta }`; è la seconda rotta a scrivere la valutazione **con l'utente che conferma**.
3. Incrementa `lavori.post_consegna_correzioni` (colonna provata esistente in A4, mai usata finora).
4. `conosciuto_il` arriva **dal client** ed è modificabile: è il momento zero dei termini di legge, e
   non è la data di creazione della riga.

- [ ] **Passo 1 — la prova che deve fallire**

```typescript
it('POST evento torna la PROPOSTA e non deposita la valutazione', async () => {
  const res = await POST(req({ motivo: 'difetto_lavorazione', origine_informazione: 'odontoiatra',
    stato_dispositivo: 'consegnato_non_applicato', conosciuto_il: '2026-08-06T09:00:00Z',
    potenziale_di_danno: 'nessuno' }), ctx)
  const body = await res.json()
  expect(res.status).toBe(201)
  expect(body.proposta.esito).toBe('reclamo')
  expect(body.valutazione).toBeUndefined()   // la firma è dell'utente, non dell'app
})

it('rifiuta un motivo fuori vocabolario con 422', async () => {
  const res = await POST(req({ motivo: 'pippo', origine_informazione: 'odontoiatra',
    stato_dispositivo: 'applicato', conosciuto_il: '2026-08-06T09:00:00Z' }), ctx)
  expect(res.status).toBe(422)
})

it('rifiuta una richiesta senza conosciuto_il: è il momento zero dei termini di legge', async () => {
  const res = await POST(req({ motivo: 'difetto_lavorazione', origine_informazione: 'odontoiatra',
    stato_dispositivo: 'applicato' }), ctx)
  expect(res.status).toBe(422)
})
```

- [ ] **Passo 2 — falle fallire** · **Passo 3 — implementa** · **Passo 4 — verde** ·
      **Passo 5 — FASE 7 completa** (`tsc` + `vitest run` + `next build`) · **Passo 6 — salva**

---

## Task 5 — La riemissione: prima si annulla, poi si riemette

🛑 **È il punto in cui l'ondata può fallire dichiarando successo.**

**File**
- Modifica: `src/lib/pdf/generate-ddc.ts` (aggiungi `sostituisce_id`)
- Migration: colonna `dichiarazioni_conformita.sostituisce_id UUID REFERENCES dichiarazioni_conformita(id)`
- Test: `tests/unit/riemissione-ordine.test.ts` 🆕
- 🔴 **Leggi PER PRIMO** (R-P2, mai letto finora): `src/lib/pdf/generate-ddc.ts` **per intero**, e in
  particolare le righe 85-105. Il censimento dice che restituisce la dichiarazione **esistente** se ne
  trova una non annullata, **ritornando `{numero, url}` come se l'avesse generata**. **Verifica se è
  vero**: se non lo è, quello è un ritrovamento e va riferito (R-E2), non corretto in silenzio.

- [ ] **Passo 1 — la prova che l'ordine è portante**

```typescript
it('riemettere senza annullare prima NON deve restituire il documento vecchio come nuovo', async () => {
  // provato A2: ddc_lavoro_attiva_unique = UNIQUE(laboratorio_id, lavoro_id) WHERE stato <> 'annullata'
  const primo = await generateDdC(lavoro)
  const secondo = await riemetti(lavoro, { annullaPrima: false })
  expect(secondo.numero).not.toBe(primo.numero)   // oggi FALLISCE: torna lo stesso numero
})

it('riemettere DOPO l annullo produce un documento nuovo che PUNTA al vecchio', async () => {
  const primo = await generateDdC(lavoro)
  const secondo = await riemetti(lavoro, { annullaPrima: true })
  expect(secondo.numero).not.toBe(primo.numero)
  expect(secondo.sostituisce_id).toBe(primo.id)   // senza il filo, lo storno non è leggibile
})
```

- [ ] **Passo 2-5** — falla fallire · implementa l'ordine `annulla → riemetti` · verde · salva.

---

## Task 6 — «Devo intervenire» sulla scheda (UI)

🛑 **Cancello del progetto, §0B — non si scrive React prima:** mockup HTML in
`docs/design/mockups/2026-08-06-devo-intervenire.html`, **almeno due varianti**, screenshot Playwright 🆕
in `docs/design/mockups/screenshots/`, **light + dark**, e **approvazione esplicita di Francesco**.
La decisione va scritta in `docs/design/decisions/`.

**Il dettaglio dei passi di questo task si scrive DOPO l'approvazione del mockup** — non è un
segnaposto: è la regola del progetto, che vieta di fissare il codice di un'interfaccia prima che la
forma sia scelta. Ciò che è già fissato e non si rinegozia:

- il tasto vive dove oggi muore il conto alla rovescia (`SchedaLavoroV3.tsx:573`, superficie **v3**);
- **un gesto solo** (D269), sempre disponibile su un lavoro consegnato;
- il foglio chiede **il motivo** e, in fila, le caselle della spec §5 — `non_noto` ammesso;
- `potenziale_di_danno` parte da **«da valutare»**, e l'interfaccia non deve rendere «nessuno» il
  percorso più rapido;
- la proposta si mostra **col suo perché** e con un tasto per **cambiarla**;
- bersagli ≥ 44px, tre viewport (390 · 768 · 1280), entrambi i temi.

---

## Task 7 — La finestra dei dieci minuti sparisce

**File** — dal censimento R-P6, e **ogni riga va riaperta** (R-P2):
`src/lib/consegna/costanti.ts:6` · `AnnullaConsegnaBanner.tsx` (il componente **sparisce**) ·
`FrameConsegnato.tsx:32` (⚠️ **letterale nudo `10*60*1000`**, che una ricerca sul nome della costante
non trova) · `annulla-consegna/route.ts` · `tests/unit/consegna-costanti.test.ts:11-12` ·
`tests/unit/annulla-consegna-route.test.ts:83,88` · `tests/…/flusso-consegna.test.tsx:269`

🛑 **La prova che asserisce «la finestra è 10 minuti» NON si cancella:** si trasforma nella prova che
la finestra **non esiste più** e che il rientro è sempre possibile. Una prova cancellata è copertura
persa in silenzio.

---

## Task 8 — Il testo della riga bloccata (D261, rimandato dal 06/08)

Le righe «Tinta» e «Colore» smettono di essere premibili a dichiarazione emessa
(`SchedaLavoroV3.tsx:462`) **senza dire perché**. Ora la risposta esiste, e non è «non si cambia più»:
è **come si rientra**.

- Il testo dice **dove si va**, non cosa è vietato — rimanda a «Devo intervenire».
- Usa **«la dichiarazione»**, mai «dichiarazione di conformità» (vincolo globale).
- Stesso cancello del Task 6: mockup → screenshot → approvazione, prima del React.

---

## Task 9 — Gate estetico L2 (FASE 9b) e chiusura

Obbligatorio: l'ondata **cambia l'aspetto** della scheda lavoro. Micro-audit contro
`docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` — 12 sezioni × 390/768/1280 × light/dark, ogni ❌
risolto **o deferito col motivo**, screenshot before/after in
`docs/design/screenshots/2026-08-XX-intervento/`.

Poi: **FASE 7 completa**, **BP-1** (memoria + roadmap + verbale), e il merge lo autorizza Francesco.

---

## Autorevisione del piano

**Copertura della spec** — §1 D264 → Task 2 (vocabolario) e 4 (rotte) · D265 → Task 3 (nessun cancello
fiscale nella RPC) · D266 → Task 1 · D267 → Task 1 (due tabelle) e 4 (la rotta non deposita) · D268 →
Task 2 · D269 → Task 7 · D270 → Task 1 (`valutazione_viva_unique` + revoca) · D271 → Task 1 (colonna).
§8 → Task 5 · §10 (avviso al medico) → **non ha un task: è nel Task 6**, come esito proposto dopo la
conferma, perché senza interfaccia non ha dove vivere. §17.2 (le due voci che toccano l'intervento) →
Task 4, nel calcolo di completezza della valutazione.

**Segnaposto:** nessun «TBD». Il Task 6 rimanda il proprio dettaglio **dopo il mockup**, ed è la regola
§0B del progetto, dichiarata come tale.

**Coerenza dei nomi:** `classifica()` · `naturaDaMotivo()` · `riapri_lavoro_atomica` · `evento_id` ·
`sostituisce_id` · `superata` — usati con lo stesso nome in tutti i task.

⚠️ **Un buco che dichiaro invece di nascondere:** i task 6-8 toccano `SchedaLavoroV3.tsx`, che **non è
stato letto** (registro R-P2). Il loro dettaglio va scritto **dopo** che il primo esecutore lo apre e
riferisce. Il piano non finge di sapere com'è fatto.

---

## 🔴 RITROVAMENTI ESEGUENDO — Task 1

**I due difetti Critici erano del PIANO, non di chi ha eseguito.** La migration copiava fedelmente il
testo scritto qui sopra, e quel testo era sbagliato in due punti. Peggio: **il progetto aveva già
pagato entrambe le lezioni e le aveva già risolte altrove.** Chi scrive il piano non aveva cercato il
precedente per **comportamento** (R-P3, assorbita da R-P2) — l'ha cercato per **nome**.

### ⛔ Due vincoli globali che MANCAVANO, e che valgono per OGNI task successivo

| Vincolo | Perché, e il precedente in casa |
|---|---|
| 🔴 **`REVOKE` deve includere `service_role`** | `service_role` riceve `ALL` dalle *default privileges* di Supabase e ha **`bypassrls`**: la RLS non lo ferma. `REVOKE … FROM anon, authenticated` **non protegge niente** contro il ruolo che l'applicazione usa davvero. Nota **«E8»** già scritta in `20260721090000_parete_cassette.sql:126-139`; correzione già applicata in `20260804150306_…:79` |
| 🔴 **Le chiavi esterne fra tabelle di tenant devono essere COMPOSITE** su `(x_id, laboratorio_id)`, con `UNIQUE (id, laboratorio_id)` sulla tabella puntata | La RLS controlla **solo** la colonna `laboratorio_id` della riga che si inserisce, **non** chi possiede la riga puntata: con una FK semplice il laboratorio A crea un evento sul lavoro del laboratorio B. Pattern già in casa, usato due volte: `20260727120000_lavori_denti.sql:8` e `20260804150306_…:50-54` |

🔑 **E le due cose erano collegate in un modo che nessuno dei due difetti mostrava da solo:** con
`valutazione_viva_unique` su `(laboratorio_id, evento_id)`, **due laboratori diversi potevano tenere
due valutazioni vive sullo stesso evento** — cioè il requisito «una sola valutazione viva per evento»
era violabile *pur essendo l'indice corretto*. Lo chiude la FK composita, a monte.

**Chiuso in** `supabase/migrations/20260806142910_correzione_eventi_qualita_cross_tenant.sql`, con
cinque famiglie di prove: seconda valutazione viva **rifiutata** · evento su lavoro di altro
laboratorio **rifiutato** · valutazione su evento di altro laboratorio **rifiutata** · valutazione
legittima **accettata** (controprova) · `UPDATE` diretto come `service_role` **rifiutato**, e la stessa
operazione via `valutazione_supera()` **riuscita**.

### 🟠 Aperti, riferiti e NON corretti (R-E2) — vanno raccolti da un task successivo

1. **`valutazioni_evento.sostituisce_id` è ancora una FK semplice** — quarto caso della stessa
   famiglia, che il piano non aveva elencato. Non è un fix da una riga: serve prima
   `UNIQUE (id, laboratorio_id)` su `valutazioni_evento`.
2. **`valutazione_supera()` copre metà dell'operazione.** La riclassificazione (§9 della spec) deve
   fare *supera la vecchia* **e** *inserisci la nuova*: fra le due chiamate esiste una finestra a
   **zero valutazioni vive**. ➡️ Il task che implementa la riclassificazione le esegua **in una sola
   transazione**, o in una sola funzione.
3. **`eventi_qualita` non ha alcun `REVOKE`**: un utente autenticato dello stesso laboratorio può
   modificare o cancellare il **fatto** via PostgREST. Il fatto è il fondamento della registrazione:
   va deciso se anche lui debba diventare non modificabile.
4. **`TRUNCATE` resta concesso ad `anon`/`authenticated`** su ogni tabella del progetto — pattern
   preesistente, non introdotto qui; esposizione teorica (PostgREST non lo emette).

### 🔑 La lezione, e non riguarda solo questa ondata

**Un piano che copia il testo di una spec può essere fedele e sbagliato allo stesso tempo.** Nessuna
rilettura del piano l'avrebbe trovato: i due difetti erano visibili solo **confrontando il piano con
ciò che il progetto aveva già imparato**. ➡️ Prima di scrivere un oggetto di database in un piano, si
cerca il precedente **per comportamento** («chi altro in questo repo protegge un riferimento fra
tenant?»), **non per nome**.

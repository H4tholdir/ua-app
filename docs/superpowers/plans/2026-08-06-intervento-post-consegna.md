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

  // ⚖️ D276 — le due prove che chiudono il difetto trovato dal controllo pre-volo.
  // Senza queste, l'uscita anticipata dei tre motivi tornerebbe senza far rumore.
  it('🛑 «richiesta clinica nuova» NON scavalca il test dell\'incidente: col danno accertato è incidente GRAVE', () => {
    const p = classifica({ ...base, natura: 'nuova_esigenza_clinica', potenzialeDiDanno: 'accertato' })
    expect(p.esito).toBe('incidente_grave')
    expect(p.termineOre).toBe(15 * 24)
  })

  it('🛑 «registrato per sbaglio» NON scavalca il test dell\'incidente', () => {
    const p = classifica({ ...base, natura: 'errore_registrazione', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })
})
```

- [ ] **Passo 2 — falle fallire, e CONTA (R-P4)**

```bash
npx vitest run tests/unit/qualita-classifica.test.ts 🆕
```

Atteso: fallimento da modulo non trovato. **Poi metti un abbozzo inerte**
(`export function classifica() { return { esito: 'nessuna_azione', perche: '', ramoIso: '8.3.2', termineOre: null } }`)
e **rilancia**: scrivi nel referto **quante asserzioni si accendono** (`N su 11`). Un rosso da modulo
mancante non prova che le prove provino qualcosa.

- [ ] **Passo 3 — implementa, nell'ordine ministeriale**

```typescript
export function classifica(f: FattiEvento): Proposta {
  // 🛑 D276 — NESSUN MOTIVO SALTA LA FILA. Il test dell'incidente sta PRIMA di ogni
  // esenzione: qui c'era l'uscita anticipata dei tre motivi «non è un problema del
  // dispositivo», e faceva sparire un danno accertato dietro un «nessuna azione».
  // ① IL TEST DELL'INCIDENTE VIENE PRIMA — invertirlo nasconde l'obbligo dell'Art. 88 (D268)
  if (f.potenzialeDiDanno !== 'nessuno') {
    if (f.potenzialeDiDanno === 'accertato')
      return { esito: 'incidente_grave', perche: 'Ci sono state conseguenze accertate sulla salute: va valutata la segnalazione all\'autorità.', ramoIso: '8.3.3', termineOre: 15 * 24 }
    return { esito: 'incidente', perche: 'C\'è un potenziale di danno da valutare: prima di parlare di reclamo va escluso l\'incidente.', ramoIso: '8.3.3', termineOre: null }
  }

  // ①-bis — SOLO ORA le esenzioni (D276): non sono problemi del dispositivo, quindi
  // non entrano nei conteggi del rapporto periodico (D273). Ma ci si arriva solo dopo
  // che l'incidente è stato escluso, mai prima.
  if (f.natura === 'nuova_esigenza_clinica')
    return { esito: 'nessuna_azione', perche: 'Il medico chiede una cosa nuova: il dispositivo era conforme alla prescrizione con cui è stato fatto. Serve una prescrizione nuova, non una correzione.', ramoIso: null, termineOre: null }
  if (f.natura === 'commerciale' || f.natura === 'errore_registrazione')
    return { esito: 'nessuna_azione', perche: 'Non tocca il dispositivo né il documento sanitario.', ramoIso: null, termineOre: null }

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

Atteso: **11 passate**. Poi scrivi nel referto, per ognuna: valore fuori vocabolario · campo assente ·
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

---

## ⚖️ D273-D275 — cosa cambia nel piano (centodecima tornata, 06/08/2026 17:03)

Il terzo ritrovamento aperto («va deciso se anche il **fatto** debba diventare non modificabile») è
stato portato a un **panel di tre advisor con mandato di smontare la proposta**. Esiti: normativo
«regge con condizioni» · database «regge con condizioni, il punto 2 non è realizzabile come scritto» ·
prodotto 🔴 **«il punto 1 così com'è NON regge»**.

### Il ritrovamento 3 è CHIUSO da D273 — ma non nella forma in cui era stato posto

| Era | È diventato |
|---|---|
| «il fatto diventa non modificabile?» | **No: si RITIRA.** Un evento non si cancella mai in modo definitivo, ma si ritira **dichiarando il motivo**, uscendo da elenchi **e conteggi** — modello già in casa: `incidenti_mdr` (`002_fase2_schema.sql:420-425` · `psur/route.ts:156-157`) |
| «bloccare l'`UPDATE`?» | **Mai.** `UPDATE` resta aperto (D262), con la traccia ridotta all'osso |
| «segnalare quando la correzione arriva sotto un giudizio» | ⛔ **FUORI da quest'ondata.** L'avviso non ha il gesto che lo risolve: la riclassificazione **non è fra i nove compiti** e i suoi pezzi sono rotti a metà (ritrovamenti 1 e 2) |

🛑 **IL VINCOLO CHE NASCE DA QUI, e vale per chiunque tocchi queste tabelle:** il `REVOKE DELETE` su
`eventi_qualita` **non si scrive da solo**. Va nella stessa migration del ritiro morbido. Da solo
tiene dentro i conteggi ogni riga nata da un tocco sbagliato, e quei conteggi finiscono nel rapporto
periodico dovuto per legge (`psur/route.ts:190`). ➡️ **In `tests/integration/eventi-qualita-schema.rpc.test.ts`
c'è una SENTINELLA** che oggi asserisce che il `DELETE` è ancora concesso: quando arriva il ritiro,
quella prova **si capovolge**, non si cancella.

### Compiti che cambiano

- **🆕 Compito nuovo — «l'evento si ritira»:** colonne di ritiro con motivo obbligatorio · `REVOKE DELETE`
  (insieme, mai prima) · esclusione da elenchi e conteggi · eccezione non trattabile: un evento che ha
  **già prodotto un atto verso l'esterno** (dichiarazione riemessa, segnalazione, avviso al medico)
  **non si ritira, si supera**.
- **Task 6 — due correzioni da minuti, e nascono da un conto che non torna.** La spec dichiara il costo
  di D269 come «due tap invece di uno» (righe 54 e 346). Misurato: per un tasto premuto per sbaglio
  servono **quattro domande obbligatorie** (`20260806140823:10-25`, tutte `NOT NULL`) **più una
  giustificazione scritta a mano** per confermare «nessuna azione» (`:47-49`). ➡️ ① la giustificazione
  **nasce precompilata** col «perché» che la derivazione ha già scritto; ② il motivo
  `errore_registrazione` **non chiede** origine, momento della conoscenza, stato del dispositivo e
  potenziale di danno.
- **Nessun controllo di ruolo si introduce** (D275): rientrare in un lavoro consegnato resta alla
  portata di tutti, come lo è già annullare la consegna oggi. ⏸️ Rimandata, non chiusa.

### ✅ D274 — i due difetti VIVI, chiusi in `20260806170700_d274_difetti_vivi_intervento.sql`

1. **`admin_delete_laboratorio` non nominava le due tabelle nuove** e `eventi_qualita_lavoro_fk` è
   `NO ACTION` → la cancellazione di un tenant **abortiva**. `provato:` `SQLSTATE 23503` prima della
   correzione, in transazione annullata. **Latente** (0 righe), sarebbe scattato al primo laboratorio vero.
   ⚠️ È **lo stesso passo falso già documentato tre righe sopra** nella stessa funzione (21/07 cassette,
   27/07 denti): il commento c'era, la lezione no.
2. **`TRUNCATE` era rimasto concesso** su `valutazioni_evento` → il commento «la garanzia la dà il
   DATABASE» (`20260806140823:78`) era **falso**. `provato:` `SET LOCAL ROLE authenticated; TRUNCATE` →
   **riuscito**. Chiuso con `REVOKE ALL` + `GRANT SELECT, INSERT` (forma di casa,
   `20260721090000:122-139`); su `eventi_qualita` si revoca **solo `TRUNCATE`**, per non rischiare di
   sbagliare il `GRANT` di ritorno su `UPDATE` e rompere D262 nella migration che lo cita.

### 🟠 Aperti dopo il panel, riferiti e NON toccati (R-E2)

1. **`audit_log` è svuotabile** da un utente autenticato (`provato:` `TRUNCATE` riuscito), e **1.644
   righe su 1.645 non sanno chi ha fatto la modifica** — l'app parla al database con un'identità di
   servizio. ➡️ Una memoria delle correzioni costruita lì **nascerebbe cieca**: il «chi» va messo nella
   riga, come `emesso_da` (`20260804120000:47-59`). Non toccato: serve la sua decisione.
2. **`valutazione_supera()`** non pretende un successore e non registra chi/quando → un evento può
   restare **senza alcun giudizio vivo**.
3. **La spec §6 e questo piano (righe 391-392) derivano `errore_registrazione` in due punti diversi**
   dell'ordine dei test. Vince il codice, ma il documento **ratificato** dice un'altra cosa.
4. **`psur/route.ts:190`** continua a dichiarare `totale_reclami: 0` per costruzione.
5. La policy `FOR ALL` su `eventi_qualita` annuncerà una porta murata quando arriverà il `REVOKE DELETE`:
   va spezzata in `SELECT` + `INSERT` + `UPDATE` **nello stesso compito del ritiro**.

---

## ⚖️ D280-D283 — altri quattro emendamenti al piano (06/08/2026 sera)

- **D280 — la domanda sulla gravità ha QUATTRO risposte, non due.** `non grave` · `grave, regola
  generale` (15 gg, Art. 87(3)) · `morte o peggioramento grave non previsto` (10 gg, Art. 87(5)) ·
  `minaccia grave per la salute pubblica` (2 gg, Art. 87(4)). 🛑 **A parità vince il TERMINE PIÙ
  BREVE** — mai la media, mai il primo trovato. Tocca il **Task 6** (il testo) e chi userà la proposta.
- **D281 — «commerciale» ed «errore di registrazione» su un lavoro mai uscito danno `nessuna_azione`**,
  non non-conformità: D276 resta più forte di D278. Già implementato nel Task 2, qui **confermato**.
- **D282 — prima di togliere qualcosa dai conteggi, conferma esplicita** che **dice cosa cambia**
  (mai «sei sicuro?»), **dopo** che l'incidente è stato escluso, e **la stessa** del ritiro di D273.
- 🔴 **D283 — IL PRIMO TOCCO CHIEDE CONFERMA, E LA CONFERMA NOMINA IL LAVORO.** Vincolo **nuovo per il
  Task 6**, e non è un abbellimento: `AnnullaConsegnaBanner.tsx:145` parte oggi **al primo tocco**
  (`onClick={handleAnnulla}`, zero dialoghi in tutto il file), e l'unica rete erano **i dieci minuti**
  che il **Task 7** sta per rimuovere. Senza D283 il gesto diventa **permanente e a un tocco solo**.
  ⚠️ **Il Task 7 non può essere chiuso prima che D283 sia in piedi**, o fra i due esiste una finestra
  in cui il tocco involontario è irreversibile.

🔑 **La lezione che vale oltre l'ondata: quando si toglie un vincolo, si censisce che cosa quel
vincolo stava REGGENDO.** I dieci minuti erano nati per la fattura automatica alla consegna
(architettura mai eseguita), ma nel frattempo reggevano **un secondo carico mai scritto**: la
protezione dal tocco involontario.

---

## 🔴 RITROVAMENTI ESEGUENDO — Task 4 (06/08/2026, sera)

🛑 **Stanno QUI, e non nel registro `.superpowers/sdd/`, per una ragione precisa: quella cartella è in
`.gitignore`.** Un ritrovamento scritto lì non sopravvive a un cambio di macchina — è lo stesso modo in
cui si è persa la guardia della navigazione. Chi esegue riferisce (R-E2); chi controlla lo **versiona**.

### 🔴 R1 — `riapri_lavoro_atomica` NON HA CHIAMANTI, E NESSUN COMPITO NE PRENDE UNO

`provato:` `grep -r riapri_lavoro_atomica src/ --include="*.ts" --include="*.tsx"` → **un solo
riscontro**, `src/types/database.types.ts:6429`, cioè il file dei tipi **generato**. Zero chiamanti veri.
E leggendo i nove compiti: il **Task 6** è interfaccia, il **Task 7** nomina `annulla-consegna/route.ts`
**senza dire** che debba passare alla RPC nuova, il **Task 4** (questo) non la tocca per mandato.
➡️ **L'ondata rischia di chiudersi con la funzione del Task 3 costruita, applicata al database e mai
eseguita.** È la famiglia della **guardia della navigazione mai agganciata**: una cosa che esiste, sembra
copertura, e non gira. **Il compito che la chiama va assegnato esplicitamente**, e la scelta dipende
dalla questione aperta qui sotto (R1-bis).

### 🔴 R1-bis — LA §4 PROMETTE UNA COLONNA CHE NON ESISTE, e da lì dipende chi chiama la RPC

`provato:` la spec §4 (righe 197-198) promette «*un indicatore opzionale «questo evento richiede anche
di rientrare in produzione»*»; `grep 'rientr'` sulle due migration dell'ondata → **zero riscontri**.
`eventi_qualita` ha **13 colonne** e nessuna è quella.
⚠️ **E la spec si contraddice su che cosa faccia `errore_registrazione`:** §6 (e `classifica.ts:163-164`)
gli dà esito **`nessuna azione`** col perché «*Non tocca il dispositivo né il documento sanitario*»;
§7 riga 384 lo indica come **la via di chi ha sbagliato tasto** — cioè il gesto che sostituisce l'annullo
della consegna, che riporta il lavoro a `pronto` **e annulla la dichiarazione**.
➡️ **Domanda aperta portata a Francesco** (verbale, centosedicesima tornata, sezione «⏸️ RESTA APERTO»):
il rientro è **sempre**, **mai**, o **solo se lo chiede**? Terza contraddizione fra documenti ratificati
in un giorno solo.

### 🔴 R2 — LA §17.2 È ASSEGNATA AL TASK 4, MA UN VINCOLO DEL TASK 1 LA RENDE IMPOSSIBILE

L'autorevisione del piano (riga 667) assegna §17.2 al Task 4, «nel calcolo di completezza della
valutazione». Ma `provato:` la spec §17.2 (riga 733) dice che per un laboratorio **`non_certificato`** la
giustificazione del reclamo non indagato è **«Proposta, e la sua assenza non rende la valutazione
incompleta»** — mentre il CHECK `valutazione_nessuna_azione_giustificata`
(`20260806140823_eventi_qualita.sql:47-49`) la **pretende sempre**, a livello di database, per ogni
esito `nessuna_azione`.
➡️ **Non è risolvibile dentro il Task 4** (nessuna migration in quel mandato): o si emenda la spec, o
serve una migration in un compito successivo. **Va deciso prima di dichiarare coperta la §17.2.**

### 🟠 Minori, riferiti e non toccati

- **R3** — il censimento aveva accertato che `post_consegna_correzioni` **esiste**, mai **chi la legge**:
  verificato ora dall'esecutore, i due siti fiscali la nominano solo nel `select` e `generate-xml.ts`
  non la legge → **nessun documento fiscale cambia** al variare di quel numero.
- **R4** — i due modelli di rotta indicati dal brief (`rifacimento/route.ts:190`,
  `qualita/incidenti/route.ts:109`) rispondono con `error.message` **grezzo**: il difetto che la
  precondizione ② vieta è **preesistente e vivo** nei modelli stessi.
- **R5** — `supabase-chain-mock.ts` non ha `insert`/`update`: ogni rotta che scrive si costruisce la
  propria finzione, e le finzioni divergono dalla rotta vera (difetto già pagato una volta).
- **R6** — `'pippo'` **non prova** l'ordine delle due guardie: solo `'constructor'` / `'__proto__'` lo
  fanno. Il test del piano (riga 550) usava `'pippo'`.
- **R7** — `ramoIso` e `termineOre`, prodotti da `classifica()`, non hanno colonne in
  `valutazioni_evento`: due dei quattro campi calcolati **non sono salvabili**.
- **R8** — `motivo = 'altro'` lascia al client la scelta della `natura`, quindi anche una via verso le
  tre esenzioni: D276 la delimita, ma la porta esiste.

### ✅ Revisione del Task 4 — verdetto di CONFORMITÀ: **conforme con rilievi, nessun Critico**

Dieci punti su dieci verificati con `file:riga` (guardia CSRF · `laboratorio_id` sempre dalla sessione ·
la prima rotta non scrive mai in `valutazioni_evento`, provato col `grep` e col finto client · la
seconda non riclassifica · `conosciuto_il` obbligatorio · l'ordine delle due guardie, e la prova lo
distingue davvero perché usa `'constructor'`/`'__proto__'` invece di `'pippo'` · nessun testo grezzo di
Postgres fuori dalle rotte · nessuna migration).

**Il conteggio R-P4 regge, ma va LETTO BENE, ed è una lezione riusabile.** «66 su 141» sottoconta **per
costruzione**: `vitest` ferma ogni caso alla **prima** asserzione rossa, quindi le altre non vengono
nemmeno valutate. Il numero che significa qualcosa è **66 casi su 66**. Il revisore ha ricostruito `M`
in modo indipendente (131 `expect(` meno 2 nell'helper più 6 chiamate contate due volte = 141) e tre
artefatti indipendenti concordano sul passaggio 63 → 66.

**⚖️ ADJUDICATO — lo scostamento dichiarato dall'esecutore (`post_consegna_correzioni`):** la regola 3
del piano diceva «incrementa», e l'esecutore incrementa **solo se il manufatto era uscito**
(`stato_dispositivo <> 'mai_uscito_dal_lab'`, lo stesso predicato di `classifica.ts:128`).
**Accettato**, e per una ragione misurata, non per fiducia: il censimento rifatto dal revisore trova
`post_consegna_correzioni` in **sei righe** oltre al Task 4 — tre nei tipi generati, una nel tipo di
dominio, due nelle rotte fiscali **solo dentro l'elenco `select(...)`** — e `generate-xml.ts` **non la
nomina mai**; in `supabase/` nessuna vista né funzione la legge. ➡️ **Accendere quell'incremento non
tocca nessun documento fiscale.** 🟡 **Ma la decisione resta dell'esecutore finché Francesco non la
ratifica** (rilievo M1): il codice è difendibile, la scelta va confermata.
⚠️ Riserva onesta del revisore: il predicato poggia su `stato_dispositivo`, che è **dichiarato dal
client** senza cancello di stato — la metrica non era comunque indipendentemente affidabile.

### 🔴 RILIEVO NUOVO, e va nel compito del RITIRO (non in questo)

**Un evento registrato per sbaglio incrementa `post_consegna_correzioni`, e oggi nessuno lo
decrementa.** ➡️ Se il ritiro toglie la riga dai conteggi ma lascia il contatore incrementato, si
costruisce **un secondo generatore di numeri falsi** accanto a quello che D273 chiude. **Il compito del
ritiro deve occuparsi anche di questo numero** — o dichiarare per iscritto perché no.

### ⚠️ Revisione del Task 4 — verdetto di QUALITÀ: **buona con rilievi, e un CRITICO trovato con una mutazione**

🔑 **La conferma che i due verdetti separati servono davvero: la conformità era ✅ su dieci punti su
dieci, e il difetto vero stava altrove.** Non nelle rotte — **nella rete di prove**.

**🔴 CRITICO — la proprietà più importante della rotta non era protetta da nessuna asserzione, e la
colpa era di una FIXTURE IMPOSSIBILE.** `tests/unit/eventi-qualita-route.test.ts:151` restituiva
**sempre** `potenziale_di_danno: 'nessuno'`, qualunque cosa fosse stata inserita. Ma la colonna è
`NOT NULL DEFAULT 'da_valutare'` (`20260806140823:24`): **un insert che omette la chiave non può tornare
`'nessuno'`. È una riga che Postgres non potrebbe mai produrre.**
`provato:` mutando `route.ts:263-268` — proposta calcolata sul valore **grezzo del client** invece che
sulla **riga salvata**, col ripiego a `'nessuno'` — **66 prove su 66 restavano verdi**.
🛑 **Lo scenario, in parole:** l'operatrice registra un evento **senza** dire il potenziale di danno; il
database salva «da valutare»; la proposta giusta è **incidente** (Art. 88), quella mutata è
**reclamo**. **L'obbligo sparisce, e nessuna prova se ne accorge.**
➡️ È la famiglia **già pagata** una volta: *una fixture che non specchia la rotta vera*. La fixture
deve fare **l'eco del payload** e applicare **il default del database** quando la chiave manca.

**🟠 Un test che era un LUCCHETTO VUOTO** (`test:574-579`): il titolo diceva «→ 500», la fixture
iniettava un codice che la rotta mappa a **422**, e l'asserzione era `toBeGreaterThanOrEqual(400)` —
passava con 400, 404, 409, 422 o 500 indifferentemente. `provato:` cancellando il ramo `23514` restavano
66/66 verdi.
**🟠 Nessun tetto di lunghezza** su `motivo_libero`, `note`, `giustificazione` — il modello di casa ne ha
uno (`rifacimento/route.ts:167-169`).
**🟡 La guardia di concorrenza non era coperta** (`route.ts:337`: togliendo il confronta-e-scambia,
66/66 verdi) · **🟡 `conosciuto_il` passava per `Date.parse` senza controllo di formato**: `'01/08/2026'`
verrebbe letto come **8 gennaio**, su un campo che fa partire **scadenze di legge**.

**⛔ Un rilievo NON si corregge, e la ragione è di casa:** un guasto transitorio del database esce come
«Lavoro non trovato» (`route.ts:211`, `valutazioni:101`). **È l'idioma già in uso**
(`rifacimento/route.ts:123-133`): correggerlo qui creerebbe **due dialetti** nello stesso repo. Resta
**debito trasversale riferito**, da chiudere ovunque insieme.

**✅ Quattro famiglie verificate SENZA difetto, con la prova** (non un «va tutto bene»): cross-tenant
(gli INSERT passano `laboratorio_id` dalla sessione, le FK composite sono soddisfatte, e la risposta è
**404 mai 403**) · nessun doppio default · **le chiavi pericolose sono RIFIUTATE, non ignorate** (niente
«salvato su un dato che non c'è») · il fail-soft sul contatore è giustificato e dichiarato.

### ✅ Giro di correzione del Task 4 — i sei rilievi chiusi (`aefeb4a0`, `d60ae140`)

**La prova che la correzione ha corretto davvero, ed è il pezzo che conta:** rifatta la stessa mutazione
del Critico (proposta calcolata sul valore grezzo del client invece che sulla riga salvata),
`expected 'reclamo' to be 'incidente'` → **1 asserzione rossa. Prima erano ZERO.** Altre due mutazioni
di controllo: rami `23503`/`23514` cancellati → **2 rosse** · confronta-e-scambia tolto → **1 rossa**.
Codice ripristinato, `git diff --stat -- src/app/api` **vuoto**.
Prove del file: **66 → 81**. La fixture ora fa **l'eco del payload** e applica il default del database
**solo alle chiavi assenti**.
⚠️ **Un dettaglio della fixture che vale come lezione:** il risultato pigro è stato applicato **solo** a
`eventi_qualita`. Su `lavori` no, perché lì il risultato dipende da **quanti accessi sono già
avvenuti**: risolverlo tardi avrebbe fatto rispondere alla pre-verifica con la riga dell'incremento.

**⚖️ UNA CORREZIONE CHE L'ESECUTORE HA FATTO A SÉ STESSO, e la riporto perché è la parte utile.**
Aveva scritto il controllo di formato della data in modo da rifiutare anche `2026-08-06T10:00` (senza
fuso). Ma **quella è ISO 8601 valida**, ed è esattamente ciò che restituisce un campo `datetime-local`
del browser: rifiutarla avrebbe **vincolato l'interfaccia del Task 6** a una scelta che non era nel suo
mandato. Annullata (`d60ae140`), col difetto del rilievo che resta chiuso.

### 🟠 Ritrovamenti del giro di correzione (R-E2), riferiti e NON corretti

1. **🔴 C-R4 — il fuso orario di `conosciuto_il`, e aspetta Francesco.** Senza fuso, JavaScript legge la
   data **nell'ora locale di chi esegue**: il server e il telefono danno **due istanti diversi**, e lo
   scarto si scarica **in avanti** su una scadenza dell'**Art. 87**. Chiuderla ora costa poco, ma è una
   decisione sul **contratto con l'interfaccia**, che il Task 6 non ha ancora.
2. **C-R1** — l'helper condiviso delle prove continua a non simulare le scritture (conferma di R5): ogni
   rotta che scrive si costruisce la propria finzione, e le finzioni **divergono dalla rotta vera**.
3. **C-R2** — il tetto di 1000 caratteri vive ormai in **tre file** senza una casa comune.
4. **C-R3** — il messaggio del 422 sulla data parla **a chi programma**, non all'operatrice: da
   riscrivere se il Task 6 mette una maschera d'inserimento.
5. **C-R5** — il referto dichiarava «sei prove» di `nessunTestoGrezzo`: ne sono **nove**. Corretto
   dall'esecutore dichiarandolo. **Quarta volta** che un numero di referto non regge alla misura.

---

## 🔴 RITROVAMENTO DI FRANCESCO — il vocabolario non ha una casella per «era fuori in PROVA»

**Nasce da una sua domanda** («*se invece quel lavoro è uscito in prova e poi rientrato, tutto il suo
flow ancora non lo abbiamo mai gestito vero?*»), e la risposta è **sì, il flusso delle prove è
costruito** — ma la domanda ha scoperto un buco **in quest'ondata**, non lì.

**✅ Quello che ESISTE già** (`provato:` lettura diretta): due stati del lavoro, `in_prova` e
`in_prova_esterna` (`005_v1_foundation.sql:34`) · la tabella **`lavoro_prove`** (`:42-57`) con numero
della prova, data di uscita, rientro previsto ed effettivo, **esito** da elenco chiuso
(`ok`/`modifiche`/`rifare`/`sospeso`), note del dentista e foto · due RPC **atomiche**
(`20260717120000_n12_prove_atomiche.sql:51` `manda_in_prova_atomico`, `:91`
`registra_rientro_atomico`) · la rotta `POST /api/lavori/[id]/prove` **con notifica al tecnico** al
rientro · e le schermate: `TabProve.tsx`, `LavoroTimeline.tsx`, `LavoroCard.tsx`, `StatoBadge.tsx`, e
**il portale del dentista** (`src/app/portale/[token]/page.tsx`).

**🔴 IL BUCO, ed è nel Task 1 già costruito e applicato al database.** `eventi_qualita.stato_dispositivo`
ha **quattro** caselle (`20260806140823_eventi_qualita.sql:23-25`): `mai_uscito_dal_lab` ·
`consegnato_non_applicato` · `applicato` · `non_noto`. **Nessuna descrive un manufatto uscito per una
prova e rientrato.** E quella casella non è un'etichetta: **è l'asse che decide se scatta il test
dell'incidente** — D278 ha reso il passo ① applicabile **solo a un dispositivo uscito**.
➡️ Oggi chi registra un evento su un lavoro che era in prova deve scegliere **una casella falsa**:
`mai_uscito_dal_lab` è **falso** (il manufatto era in bocca a un paziente), `consegnato_non_applicato`
è **falso** (non è stato consegnato), `applicato` è ambiguo (provato ≠ applicato in via definitiva).
Resta `non_noto`, che **non è una risposta: è una resa** — e per costruzione fa uscire l'evento dal
ramo della vigilanza.

**⚠️ E sotto c'è una domanda NORMATIVA che questa spec non ha mai posto — «non verificato».**
La spec §3 fissa il confine alla **consegna**, sulla base che l'immissione sul mercato è la prima
**messa a disposizione** (Art. 2(28)). Ma un dispositivo su misura **provato in bocca al paziente** e
poi rientrato: è già stato «messo a disposizione»? Il panel del 06/08 ha discusso *consegna contro
applicazione* — **la prova non è mai stata messa sul tavolo**. 🛑 Nessuna delle quattro prove ammesse
dallo statuto delle fonti copre oggi questa domanda: **va a un panel normativo prima di scrivere la
casella**, perché dalla risposta dipende se un evento in prova entra o no nella vigilanza.

📌 **Perimetro:** è un **quinto valore in un CHECK già applicato al database** più il ramo
corrispondente in `classifica.ts`. Non è un compito grande — ma è un compito **normativo**, e va prima
del cancello §0B sui testi, perché una delle domande a schermo è proprio «dov'era il manufatto?».

---

## 🔬 PANEL SULLA RIEMISSIONE DOPO UN RIENTRO — due pareri, e un RAMO MORTO nella spec ratificata

**Nasce da** D290 («si sistema o se ne fa uno nuovo? sceglie chi registra»), che ha lasciato aperta la
domanda: *dopo una rilavorazione, il documento va rifatto?* Due advisor con compiti diversi — uno sulla
norma, uno **sui campi realmente stampati**.

### 🔴 IL RITROVAMENTO PIÙ GRAVE — la derivazione della riemissione NON PUÒ MAI ACCENDERSI

`provato:` la spec §6 riga 340-341 dice: riemissione ⟸ dichiarazione emessa **e**
`natura ∈ {dato_documentale, difetto_materiale}`.
Ma **`difetto_materiale` NON è una natura: è un MOTIVO** (`src/lib/domain/qualita-costanti.ts:24`), e
mappa alla natura `difetto_fisico` (`:98`). Le nature ammesse dal CHECK **già applicato al database**
sono sette (`20260806140823_eventi_qualita.sql:15-17`) e `difetto_materiale` **non è fra queste**.
➡️ **La condizione è sempre falsa.** Se qualcuno implementasse la spec alla lettera, la riemissione
scatterebbe **solo** per `dato_documentale`, e **nessun difetto fisico la innescherebbe mai — in
silenzio.** È la famiglia già pagata: *un elenco scritto a mano che confronta due vocabolari diversi*.

### 📄 CHE COSA C'È DAVVERO NEL DOCUMENTO — e cambia la domanda

L'**Allegato XIII §1** elenca **otto** contenuti obbligatori: fabbricante e siti · mandatario · dati
identificativi del dispositivo · uso esclusivo per quel paziente · prescrittore · caratteristiche da
prescrizione · conformità ai requisiti generali · sostanze/tessuti. 🔑 **Non c'è la data. Non c'è il
numero. Non c'è il lotto. Non c'è il materiale.** Una rilavorazione **non tocca nessuno degli otto**.

**Ma l'app ne stampa di più**, e tre fatti misurati cambiano il quadro:
1. **Il documento NON è la fotografia che il progetto crede.** Restano **quattro letture vive**:
   logo · **`srn_eudamed`** (mai fotografato) · numero del lavoro · **materiali e lotti**
   (`DdcTemplate.tsx:277-284` legge `lavoro.materiali`).
2. 🔴 **`dichiarazioni_conformita.materiali_json` ESISTE e NESSUNO LA SCRIVE.** `provato:` `grep` su
   `src/` e `supabase/migrations/` → **zero riscontri** fuori dai tipi generati. ➡️ **In banca dati non
   esiste traccia di quali lotti furono dichiarati:** la conservazione decennale poggia **solo sui byte
   del PDF**.
3. 🔴 **`riapri_lavoro_atomica` non tocca `lavori_materiali`:** i lotti della prima consegna **restano
   attaccati** e i nuovi si sommano — crescita monotona, mai una ri-scelta. Il documento finirebbe per
   elencare **più materiali di quelli davvero usati**.

### ⚖️ LA RISPOSTA DEI DUE PARERI, e la regola che ne discende

- **La dichiarazione NON SI ANNULLA MAI, quando il dispositivo è uscito davvero.** L'obbligo
  dell'Allegato XIII **punto 4** è **conservare** («*è conservata per almeno 10 anni dalla data di
  immissione sul mercato **del dispositivo***»); **nessuna norma prevede di annullare**. E il **punto 5**
  (riesame dell'esperienza post-produzione) **presuppone** che il documento del pezzo difettoso esista
  ancora: è l'**input** del riesame. ➡️ In banca dati `annullata` deve voler dire **«superata»**, mai
  «nulla» — ed è già così (N superate + 1 viva).
  🔑 **E questo NON contraddice D288**: lì la consegna **non è mai avvenuta**, quindi non c'è stata
  immissione sul mercato e quel documento **non doveva esistere**. Sono due casi diversi, e la
  differenza è la stessa di D285: *è successo* contro *non doveva esistere*.
- **La riconsegna dopo una rilavorazione NON è una nuova immissione.** Art. 2(28): l'immissione è la
  **prima** messa a disposizione; ogni fornitura successiva è «messa a disposizione» (Art. 2(27)).
  L'Art. 52(8) impone la dichiarazione **prima** dell'immissione → **su un pezzo già consegnato non si
  riattiva**. ⚠️ Eccezione dichiarata: la **ricostruzione completa** dell'Art. 2(30) — che una sistemata
  al banco non è, **un rifacimento sì**.
- ➡️ **IL DISCRIMINANTE È UNO SOLO: LA LISTA DEI LOTTI.** Rilavorazione che **consuma materiale nuovo**
  → il documento in mano al paziente elenca lotti che non sono più quelli del dispositivo: **si
  riemette**. Rilavorazione che **non consuma nulla** (una rilucidatura) → due PDF identici con numeri
  diversi: **rumore, non tracciabilità**.

### 🛑 IL PUNTO DEBOLE, dichiarato dal panel stesso — NON RATIFICARE PRIMA DI CHIUDERLO

**Nessuna guida MDCG affronta la rilavorazione o la riconsegna di un su misura**: la ricerca su
MDCG 2021-3 per *repair/rework/remake* dà **zero occorrenze** riferite ai dispositivi su misura. La tesi
«la riconsegna non è nuova immissione» poggia **sulla sola parola «prima» dell'Art. 2(28)**.
⚠️ **E i testi verbatim vengono da un mirror** (`medical-device-regulation.eu`), **non dal CELEX
ufficiale**: EUR-Lex è andato in timeout **tre volte**. ➡️ **Vanno riconfermati sul PDF EUR-Lex prima
della ratifica** — è la stessa prudenza che il 03/08 ha corretto D125.

---

## ✅ RICONFERMA SU FONTE PRIMARIA — 07/08/2026, e EUR-Lex era SPENTO

**Nasce da:** la richiesta di Francesco («*riconferma le fonti su EUR-Lex e poi ratifichiamo, ricordati
che a noi interessano le leggi italiane*») dopo che il panel precedente aveva dovuto ripiegare su un
sito-specchio.

🛑 **`eur-lex.europa.eu` era GIÙ PER TUTTI** — non un problema di rete nostro: verificato da Francesco
con un servizio esterno di monitoraggio alle **09:23 del 07/08/2026**, e **quattro punti d'ingresso su
quattro** hanno fallito (handshake TLS completato, poi zero byte, su due percorsi di rete indipendenti).

✅ **Il testo è stato ottenuto lo stesso, e NON da uno specchio:** da **`publications.europa.eu`
(Cellar)**, che è il **deposito documentale dell'Ufficio delle pubblicazioni UE** — cioè la fonte da cui
EUR-Lex stesso serve i testi. **È fonte primaria.**
`provato:` intestazione del file scaricato → **`02017R0745 — IT — 01.01.2026 — 006.001`**, consolidato
fino al Reg. (UE) 2025/2457 del 26/11/2025. Allegati I-XVII tutti presenti, nessun troncamento.
Copia in chiaro: `scratchpad/mdr_it.txt` (630 KB).

### I verbatim che reggono la regola — e la controprova l'ho rifatta io sul file

| Punto | Verbatim (italiano ufficiale) | Esito |
|---|---|---|
| **Art. 2(28)** | «immissione sul mercato»: **la prima** messa a disposizione… | ✅ `provato:` `grep` sul file → presente. **La parola «prima» c'è** |
| **Art. 52(8)** | i fabbricanti di su misura «redigono la dichiarazione… **prima dell'immissione** di tali dispositivi sul mercato» | ✅ |
| **All. XIII punto 1** | **OTTO** contenuti, contati | ✅ e **data, numero, materiali e lotti NON sono nominati** |
| **All. XIII punto 4** | «è conservata per almeno 10 anni **dalla data di immissione sul mercato del dispositivo**» | ✅ `provato:` `grep` → presente. **Singolare**, e «ultimo dispositivo» ricorre **8 volte** nel Regolamento ma **mai** nell'Allegato XIII |
| **Annullamento** | — | 🔴 **CERCATO E NON TROVATO.** `provato:` `grep -c "annull"` sul consolidato → **0 occorrenze**. Sospensione e ritiro esistono, ma sono istituti costruiti per i **certificati** degli organismi notificati, mai per la dichiarazione del fabbricante |

### 🔄 DUE CORREZIONI a quanto avevo riportato prima

1. 🛑 **L'Allegato XIII punto 5 NON dice ciò che il panel precedente gli faceva dire.** Il testo è:
   «*Il fabbricante valuta e documenta l'esperienza acquisita nella fase successiva alla produzione…*».
   **Non dice** che la documentazione del dispositivo difettoso vada conservata: che lo *presupponga* è
   **un'inferenza**, e il verificatore si è rifiutato di farla. ➡️ **L'argomento resta in piedi lo
   stesso, ma su una gamba sola invece che due:** il punto 4 impone di **conservare**, e
   dell'annullamento non c'è traccia.
2. **«Ricondizionamento completo» non esiste in italiano.** `provato:` `grep -c` → **0**. Il termine è
   **«rimessa a nuovo»**, ed è il punto **31**, non il 30 (il 30 definisce il **fabbricante**).

### 🔴 IL VERO PUNTO DI ATTRITO, che nessuno aveva visto — e non è l'Art. 52

**Art. 2(30):** è **fabbricante** anche «*la persona… che… **rimette a nuovo** un dispositivo*».
**Art. 2(31):** «rimessa a nuovo» = «*la **ricostruzione completa** di un dispositivo **già immesso sul
mercato**… unitamente al **conferimento di una nuova vita** al dispositivo*».
➡️ **Il Regolamento contempla espressamente il caso di un dispositivo già sul mercato che viene
ricostruito, e la conseguenza è un fabbricante nuovo — quindi una dichiarazione nuova.**
🛑 **La domanda che decide tutto: DOVE FINISCE LA RILAVORAZIONE E DOVE COMINCIA LA RICOSTRUZIONE
COMPLETA? Nulla nel testo traccia quel confine** — e cade esattamente sopra D290 («si sistema questo o
se ne fa uno nuovo?»). ⚠️ Il «se ne fa uno nuovo» **non è una scelta di comodo: è la soglia oltre la
quale la norma cambia soggetto.**

### 🆕 Un articolo che non avevamo in elenco, e tocca l'ITALIA — **Art. 21(2)**

> «I dispositivi su misura sono muniti della dichiarazione di cui all'allegato XIII, punto 1, che è
> messa a disposizione di un determinato paziente o utilizzatore…». Secondo comma: «**Gli Stati membri
> possono stabilire** che il fabbricante di un dispositivo su misura debba presentare all'autorità
> competente un **elenco** dei dispositivi di questo tipo messi a disposizione nel loro territorio.»

➡️ **È la porta da cui entra un obbligo NAZIONALE**, ed è esattamente la domanda aperta all'advisor
italiano. Da collegare all'**ITCA**.

⚠️ **Quinta volta che un conteggio di referto non regge alla misura:** il verificatore scriveva «9
occorrenze» di *ultimo dispositivo*, ne ho contate **8**. Non cambia la conclusione — cambia la fiducia
da dare ai numeri non rimisurati.

---

## 🇮🇹 IL REFERTO ITALIANO — e la risposta ribalta la domanda

**Nasce da** Francesco: «*ricordati che a noi interessano le leggi italiane*». È stata l'aggiunta più
utile delle tre verifiche.

### 🔴 LA RISPOSTA IN UNA RIGA: i materiali sulla dichiarazione sono una SCELTA, non un obbligo

**Nessuna fonte primaria italiana impone il contenuto della dichiarazione ex Allegato XIII, e tantomeno
i materiali o i lotti.** Cercato in quattro luoghi, con censimento **esaustivo** e non a campione:
- **D.Lgs. 137/2022** — testo **vigente** su Normattiva al 07/08/2026. L'**art. 7** (l'unico articolo
  dedicato ai su misura) **rinvia** all'Allegato XIII e aggiunge **solo** obblighi di registrazione.
  L'**art. 15**, l'unico intitolato «tracciabilità», mette l'UDI in capo a **chi riceve** il dispositivo
  — non al fabbricante di su misura, che è comunque fuori dal sistema UDI.
- **DM 9 giugno 2023** — l'**unico** decreto attuativo dell'art. 7, letto per intero: sei articoli, e
  **zero righe** sul contenuto della dichiarazione.
- **Ministero della Salute** — enumerato l'**intero** indice del tema «Dispositivi medici» (~60 voci):
  i su misura hanno **tre** pagine, nessuna sul contenuto della dichiarazione.
- **FAQ ministeriali sui su misura** (agg. **06/07/2026**, l'URL che ha trovato Francesco): 16 domande,
  **nessuna** su materiali, lotti, contenuto o rilavorazione.

### 🔑 DA DOVE VIENE DAVVERO LA PRASSI — e non ha mai avuto quel fondamento

La consuetudine italiana nasce da una **nota del Ministero della Sanità del 1998** sui dispositivi
dentali su misura, cioè dal regime della **direttiva 93/42, ABROGATO** dal 28/09/2022
(D.Lgs. 137/2022 art. 32 c. 1). ⚠️ Documento **ministeriale nell'autore** ma reperito su hosting di
terzi: **NON PRIMARIO**.
🛑 **E anche là dentro i materiali NON stavano sulla dichiarazione del laboratorio.** Il fac-simile
ministeriale li metteva sull'**«attestazione rilasciata dall'odontoiatra all'assistito»** (Allegato
6-BIS: «*utilizzando i seguenti materiali…*»), mentre la **dichiarazione del fabbricante** (Allegato 6)
non li nominava; e la **rintracciabilità delle materie prime** stava nel **fascicolo tecnico interno**.
➡️ **Stampare i materiali sulla dichiarazione non ha mai avuto una base in un obbligo di contenuto,
nemmeno prima del MDR.** ⚠️ Resta vero che *tenerne traccia* è cosa diversa dallo *stamparli*: la
tracciatura interna è il plausibile contenuto dell'**Allegato XIII punto 2**.

### 🔄 DUE CORREZIONI ALLE ISTRUZIONI DEL PROGETTO, applicate in `CLAUDE.md` §6

1. 🔴 **LA VIGILANZA È CAMBIATA IL 1° MAGGIO 2026, e la nostra riga era ferma a prima.** Il **MIR
   7.3.1** per l'incidente grave si trasmette **esclusivamente dalla pagina *Manufacturer Incident
   Report* della piattaforma NSIS-Dispovigilance**, **non più via PEC** (circolari 21/04/2026 prot.
   34434 e 22/05/2026 prot. 44595; pagina del Ministero aggiornata il **22/07/2026**). La PEC
   dell'**Ufficio 5** resta viva per **FSCA/FSN** e per le **relazioni periodiche**.
   🔑 **Perché contava:** una PWA che dicesse «manda la segnalazione via PEC» manderebbe l'odontotecnico
   **sul canale sbagliato per l'unico caso che ha una scadenza di legge**.
2. ✅ **EUDAMED: ora c'è la LEGGE ITALIANA, non solo la guida.** `D.Lgs. 137/2022 art. 12 c. 2` obbliga
   alla registrazione i fabbricanti di su misura impiantabili di classe III **e quelli oggetto di
   segnalazioni ex artt. 87-88** — la stessa regola di MDCG 2021-13 Q3, ma in **norma primaria**.
3. 📌 **ITCA precisato:** la riduzione di **1/3 per le microimprese è AUTOMATICA** (art. 27 c. 48) —
   ciò che va verificato caso per caso è **se il laboratorio sia microimpresa**. Nessun decreto MEF di
   aggiornamento ISTAT risulta emanato: gli importi sono ancora **8.150-48.500**.

### 🕳️ Un vuoto che vale la pena conoscere

**L'art. 27 c. 7 sanziona la mancata conservazione della documentazione tecnica (All. II/III) e della
*dichiarazione di conformità UE* — due oggetti che il fabbricante di su misura NON produce.**
➡️ **Non esiste una sanzione italiana** per la mancata conservazione della dichiarazione ex Allegato
XIII. L'obbligo resta (è europeo), **manca la sanzione nazionale**.

### 📌 Cercato e NON trovato, dichiarato come tale

Nessuna norma italiana su: il contenuto della dichiarazione · l'obbligo di indicare materiali o lotti ·
**l'annullamento o la sostituzione** di una dichiarazione già emessa · **l'obbligo di riemettere dopo
una riparazione** · la qualificazione della riconsegna come nuova immissione. E il **decreto attuativo
dell'art. 7 c. 5** — quello sui «*soggetti che montano o adattano per un paziente specifico un
dispositivo già presente sul mercato*», che sarebbe **il più vicino al nostro caso** — **non risulta
emanato**.

---

## 🔴 CENSIMENTO D294 — cercavamo che cosa TOGLIERE dal documento, e abbiamo trovato che cosa MANCA

**Nasce da** D294 («*togli tutto quello che sul documento non ci deve essere*»). Il censimento campo per
campo contro gli **otto** contenuti dell'Allegato XIII punto 1 ha prodotto l'elenco richiesto — e **due
difetti che nessuno cercava, entrambi verificati riga per riga da chi controlla**.

### 🛑 ① LA VOCE 6 NON È MAI STATA SODDISFATTA — su NESSUNA dichiarazione mai emessa

`provato:` `src/lib/pdf/generate-ddc.ts:166` → `prescrizione_caratteristiche: null as string | null`.
**Cablato a `null`.** La riga «Caratteristiche prescritte» del modello (`DdcTemplate.tsx:442-447`) è
condizionale, quindi **non compare mai**. E `generate-ddc.ts:210` è **l'unico** inseritore della tabella
(verificato: nessun altro `insert`).
➡️ **La voce 6 dell'Allegato XIII — «*le caratteristiche specifiche del prodotto indicate nella
prescrizione*» — è OBBLIGATORIA, e manca da ogni documento prodotto finora.**
🔑 **E il dato oggi ESISTE**: le ondate precedenti hanno costruito `lavori_prescrizioni` col suo
contenuto (elementi, colore). **Il documento non lo usa.** Non è un dato da raccogliere: è un dato da
collegare.

### 🛑 ② IL CONTROLLO CHE DOVREBBE ACCORGERSENE HA UN ELENCO INVENTATO

`provato:` `src/lib/consegna/precheck.ts:5-18` dichiara di verificare «*gli 8 elementi obbligatori
Allegato XIII MDR 2017/745*» e poi elenca: **1** fabbricante · **2 data emissione** · **8 conformità** ·
**3** prescrittore · **4** paziente · **5** descrizione · **6 classe di rischio** · **7 data consegna
prevista**.
🛑 **Non è la numerazione dell'Allegato XIII. Non ci somiglia nemmeno.** Tre voci sono **inventate**
(data emissione · classe di rischio · data consegna prevista: nessuna delle tre è nell'Allegato) e **tre
voci vere mancano**: la **2** (mandatario), la **6** (caratteristiche prescritte) e la **8**
(sostanze/tessuti).
➡️ **Ecco perché il buco ① non è mai emerso: il cancello della consegna non poteva vederlo, perché
controlla un elenco che non è quello della norma.** ⚠️ La stessa numerazione inventata è in
`src/types/domain.ts:762`, **e da lì arriva all'operatore**. Terza occorrenza: i commenti di
`supabase/schema.sql:1197+` citano «MDR §9…§12», mentre **l'Allegato XIII ha CINQUE punti** e le otto
voci sono trattini del punto 1.
🔑 **È la famiglia già pagata tre volte oggi: un elenco scritto a mano che sembra completo e non lo è.**

### 🟢 ③ Un dato DOVUTO, presente in banca dati, e mai stampato

`luogo_fabbricazione` è **`NOT NULL`** (`supabase/schema.sql:1251`) e **non compare sul documento**,
mentre la voce **1** chiede «*il nome e l'indirizzo del fabbricante e di **tutti i luoghi di
fabbricazione***».

### 🟠 ④ Un'affermazione non sostenuta su un documento a valore legale

«Sostanze / tessuti: **No**» (`DdcTemplate.tsx:448-455`) è stampato da un `false` **cablato**
(`generate-ddc.ts:167`) che nessuno scrive mai. La voce 8 è **condizionale** («se del caso»): un «No»
affermato senza che nessuno l'abbia verificato è peggio del silenzio. **Toglierlo è più corretto, non
meno.**

### 📋 L'elenco secco — che cosa ESCE dal documento (classe C)

materiali e lotti · **codice ITCA, stampato DUE volte** · SRN EUDAMED · **luogo di emissione, due
volte** · classe di rischio · norma di riferimento · norme armonizzate · rischi residui · «Sostanze /
tessuti: No» · firma, etichetta e nome/qualifica del responsabile · logo · piè di pagina · metadati PDF.

**Le ragioni che reggono i tagli meno ovvi:**
- **ITCA** — la voce 1 nomina **due** cose, nome e indirizzo: un codice di registrazione non è nessuna
  delle due. L'obbligo italiano colpisce **l'iscriversi**, non il contenuto del foglio.
- **Norme e rischi residui** — la voce **7** chiede la dichiarazione di conformità **e**, «se del caso»,
  i requisiti **NON rispettati con motivazione**. Una norma **applicata** è un'altra cosa. ⚠️ Riserva:
  se un laboratorio scrivesse i propri rischi residui **come deroga a un requisito**, la voce 7 si
  accenderebbe — oggi è testo libero.
- **Firma e responsabile (PRRC)** — l'Art. 15(3)(b) nomina la *dichiarazione di conformità **UE***, che
  per i su misura **non esiste**. Le otto voci non parlano né di firma né di persona responsabile.
  📌 Il progetto lo sapeva già: `ROADMAP-UFFICIALE.md:1138`.
- **Luogo di emissione** — è la città del laboratorio, **non** un luogo di fabbricazione.

**Restano, con la loro ragione scritta (classe B):** data di emissione (**Art. 52(8)**: «prima
dell'immissione» — senza data non si dimostra) · numero del documento (chiave di reperimento per la
conservazione decennale, All. XIII p. 4) · numero della prescrizione (àncora al documento da cui deriva
la voce 6) · titolo e base giuridica · nota sulla marcatura CE · partita IVA (🟡 **riserva del
censimento: nessun obbligo trovato — se si vuole rigore pieno, è C**).

### ⚠️ Riserve dichiarate dal censimento

**Togliere i materiali NON ripara la voce 6: sono due lavori diversi.** · I materiali **restano** in
banca dati e **continuano a stamparsi** su ricevuta di consegna ed etichetta: dal documento escono, dal
laboratorio no. · `materiali_json` e `colore_dente` esistono in tabella e **nessuno li scrive**. ·
`prescrizione_id` legge una colonna **legacy** (`lavoro.numero_prescrizione`) mentre il numero canonico
è stato spostato su `lavori_prescrizioni`.

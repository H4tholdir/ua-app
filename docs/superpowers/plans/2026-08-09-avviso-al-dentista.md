# L'avviso al dentista — piano di implementazione

> **Per chi esegue:** SKILL RICHIESTA — `superpowers:subagent-driven-development` (consigliata) oppure `superpowers:executing-plans`, un task alla volta a un esecutore fresco (**R-E1**). I passi usano caselle `- [ ]`.

**Obiettivo:** quando una dichiarazione già consegnata viene corretta e rifatta, il laboratorio ha un promemoria che non si spegne da solo finché il dentista non è stato avvisato — e resta la prova di come e quando lo è stato.

**Architettura:** una tabella sola (`avvisi_dentista`) regge **due letture** — il promemoria (righe `da_comunicare` del laboratorio) e l'archivio nella scheda del dentista (tutte le righe di quel cliente). L'avviso nasce **dentro** la transazione della riemissione, così non può esistere una riemissione senza il suo promemoria. Il canale non si costruisce: WhatsApp è già un link `wa.me` che l'utente apre, e il portale traccia già gli accessi.

**Stack:** Next.js 16 (App Router) · Supabase/Postgres (RLS + RPC PL/pgSQL) · TypeScript · vitest · DS v3.

## Vincoli globali

- ⚖️ **D331** — nessun invio automatico: l'app **propone**, l'odontotecnico **manda**.
- ⚖️ **D332** — l'avviso vive nel **portale**; WhatsApp è la **spinta**. Non l'uno o l'altro.
- ⚖️ **D334** — su WhatsApp **solo il fatto**; il dettaglio **solo** nel portale; il testo è **modificabile** prima dell'invio.
- ⚖️ **D335** — il promemoria si chiude anche con «l'ho avvisato di persona», registrando **chi** e **quando**.
- ⚖️ **D336** — **il valore vecchio non si mostra mai**, da nessuna parte.
- ⚖️ **D338** — **si parte da zero**: nessun avviso retroattivo.
- ⚖️ **D339** — **si registra solo il testo mandato**; la bozza proposta **non** si conserva.
- 🛑 **GDPR:** i messaggi WhatsApp **non portano mai il nome del paziente** (`ua-app/CLAUDE.md` §9).
- 🛑 **Ruoli: sono CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. MAI `admin` nudo.
- 🛑 **RLS:** si usa `public.current_lab_id()`, **non** `auth.current_lab_id()`.
- 🛑 **Funzioni `SECURITY DEFINER`:** `DROP` → `CREATE` → `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` → `GRANT` a `service_role` → `COMMENT`. Il `REVOKE` è **portante**: dopo un `CREATE` fresco Postgres concede `EXECUTE` a `PUBLIC`.
- 🛑 **Migration:** il nome si prende con l'orologio **universale**, in un comando separato — `date -u "+%Y%m%d%H%M%S"` (⚖️ D311). **Pavimento: `20260808195344`.** Applicare non si chiede (⚖️ D284): `npx supabase db push --linked --yes`; **dopo è dovuta la FASE 6b** (`gen types` → `tsc`).
- 🛑 **Motion e componenti:** token da `src/design-system/v3/`, componenti **solo** da `src/components/ds/`. Mai `duration` inline.
- 🛑 **`git add <percorsi>`**, mai `-A`; messaggi lunghi con `-F <file>`. ⚠️ **Prima di salvare si guarda `git status`**: l'albero può essere condiviso.
- 📊 **Base delle prove all'apertura del piano:** `5725 passate | 84 saltate su 458 file` (`verify:full`), oppure **5809/5809 su 458 file** se le prove d'integrazione sono accese. **Si confronta col numero vero del giorno, non con questo.**

---

## Registro delle letture (R-P2)

| percorso | esito |
|---|---|
| `supabase/migrations/20260808093513_correggi_e_riemetti_atomica.sql` | `letto: righe 130-145 (firma a 6 parametri), 232-320 (corpo)` |
| `src/lib/pdf/generate-ddc.ts` | `letto: righe 630-660` — è **l'unico chiamante** della RPC (`provato:` `grep -rn "correggi_e_riemetti_atomica" src/` → 6 hit, 1 solo chiamante) |
| `src/lib/dashboard/striscia.ts` | `letto: righe 100-215` — candidati `s1…s8`, `LIVELLO1_PER_RUOLO`, `candidatiLivello1` |
| `src/app/portale/[token]/page.tsx` | `letto: righe 155-185, 272-400, 492-540` — 513 righe totali |
| `src/lib/portale/audit.ts` | `letto: righe 1-25` — `AzionePortale` è una union di stringhe |
| `src/lib/consegna/whatsapp-template.ts` | `letto: righe 1-40` |
| `src/lib/dichiarazione/correzioni.ts` | `letto: righe 50-75` — `CAMPI_CORREGGIBILI_DOCUMENTO`, **sei voci** |
| `src/app/(app)/clienti/[id]/page.tsx` | **NON letto** — 🛑 **il Task 9 lo apre come primo passo e ne scrive le righe nel resoconto** |
| `src/app/api/lavori/[id]/avviso/route.ts` | `letto: righe 180-383 (10/08 mattina, per il Task 4-quater)` — le guardie (183-225), il corpo (227-294), la scrittura (296-334), il ramo zero-righe (343-374), la risposta (376-383) |
| `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` | `letto: righe 513-531 (10/08 mattina)` — **unico chiamante vivo** della POST (`provato:` grep su `src/` → 1 file fuori dai test); legge `esito.avviso` |
| `supabase/migrations/20260809124517_avvisi_dentista_update_per_colonne.sql` | `letto: righe 25-67 (10/08 mattina, per il Task 8)` — l'UPDATE di `visto_dal_dentista_at` non è concesso a NESSUN ruolo dell'app, **deliberato**, e la strada prescritta è la SECURITY DEFINER (modello `valutazione_supera`). `provato:` catalogo vivo, `information_schema.column_privileges` → la colonna compare solo per `postgres` |
| `docs/design/mockups/2026-08-09-avviso-al-dentista.html` | `letto: righe 320-412 (10/08 mattina)` — la card B1 approvata (D346): numero lavoro · badge «Aggiornata» · paziente · frase delle voci · data · chip «Dichiarazione aggiornata» |

## Censimento degli identificatori (R-P6)

**Nomi nuovi introdotti da questo piano** — nessuno di essi esiste oggi (`provato:` `grep -rn` su `src/` e `supabase/` per ciascuno → 0 hit):
`avvisi_dentista` · `avviso_dentista_crea` · `StatoAvviso` · `da_comunicare` · `comunicato_dall_app` · `comunicato_a_voce` · `buildAvvisoMessage` · `view_avviso` · `sAvvisoDentista`

**Nomi esistenti che questo piano tocca, e la loro destinazione:**

| nome | oggi | dopo |
|---|---|---|
| `correggi_e_riemetti_atomica` | 6 parametri | **invariata la firma**; il corpo guadagna un `INSERT` (Task 2) |
| `AzionePortale` | ~~16~~ **17 valori** (🔄 contati male in fase di piano: il grep del revisore del Task 8 ne trova 17 prima della modifica) | **18**, con `view_avviso` (Task 8, fatto) |
| `LIVELLO1_PER_RUOLO` | 4 ruoli, candidati `s1…s7` | i tre ruoli che vedono i lavori guadagnano `sAvvisoDentista` (Task 7) |
| `CAMPI_CORREGGIBILI_DOCUMENTO` | 6 voci | **invariato** — è la fonte di `campi_corretti`, non cambia |
| filtro dell'UPDATE in `POST /api/lavori/[id]/avviso` | `.eq('id', avvisoId)` — chiude la sola riga indicata | chiude **tutte le righe aperte del lavoro** (⚖️ D354, Task 4-quater); il contratto verso il client resta `{ ok, avviso }` con la riga indicata |
| `avvisi_segna_visti` 🆕 (Task 8) | non esiste — `provato:` 10/08: grep su `src/`+`supabase/`+`tests/` → 0 hit; `pg_proc` su `%visto%`/`%segna%` → 6 righe, tutte `consegna`/`assegna`, nessuna collisione | funzione `SECURITY DEFINER`: `now()` su `visto_dal_dentista_at` **solo dove è NULL**, EXECUTE al solo `service_role` |

🛑 **Nessun nome viene tolto da un'allowlist in questo piano.**

---

## Struttura dei file

| file | responsabilità |
|---|---|
| `supabase/migrations/<ts>_avvisi_dentista.sql` | la tabella, il CHECK sui tre stati, gli indici, le politiche RLS |
| `supabase/migrations/<ts>_correggi_e_riemetti_con_avviso.sql` | la RPC riscritta: **stesso contratto**, un `INSERT` in più |
| `src/lib/avvisi/stati.ts` | il vocabolario dei tre stati — **una fonte sola** 🆕 |
| `src/lib/avvisi/messaggio.ts` | il testo proposto per WhatsApp e per il portale 🆕 |
| `src/lib/avvisi/queries.ts` | le due letture: promemoria del laboratorio · archivio di un cliente 🆕 |
| `src/app/api/lavori/[id]/avviso/route.ts` | `POST` — segna l'avviso come comunicato (dall'app o a voce) 🆕 |
| `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` | il foglio: testo modificabile + due tasti 🆕 |
| `src/lib/dashboard/striscia.ts` | un candidato nuovo |
| `src/app/portale/[token]/page.tsx` | la sezione «Avvisi» |
| `src/app/(app)/clienti/[id]/page.tsx` | la sezione «Comunicazioni» |

---

## Task 1 — La tabella, e le politiche che la proteggono

**File:**
- Crea: `supabase/migrations/<timestamp>_avvisi_dentista.sql`
- Crea: `src/lib/avvisi/stati.ts` 🆕 (da creare)
- Prova: `tests/integration/avvisi-dentista-schema.rpc.test.ts` 🆕 (da creare)

**Interfacce prodotte:** `StatoAvviso = 'da_comunicare' | 'comunicato_dall_app' | 'comunicato_a_voce'` · `STATI_AVVISO` (readonly array) · la tabella `public.avvisi_dentista`.

- [ ] **Passo 1 — prendi il timestamp, in un comando SEPARATO**

```bash
date -u "+%Y%m%d%H%M%S"
```
🛑 Usa **questo** output come nome. **Pavimento: `20260808195344`** — se esce un numero più basso, fermati e riferisci.

- [ ] **Passo 2 — scrivi la migration**

`non eseguito` — si verifica col Passo 4.

```sql
CREATE TABLE IF NOT EXISTS public.avvisi_dentista (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id        uuid NOT NULL REFERENCES public.laboratori(id) ON DELETE CASCADE,
  lavoro_id             uuid NOT NULL REFERENCES public.lavori(id) ON DELETE CASCADE,
  cliente_id            uuid NOT NULL REFERENCES public.clienti(id) ON DELETE RESTRICT,
  dichiarazione_id      uuid NOT NULL REFERENCES public.dichiarazioni_conformita(id) ON DELETE RESTRICT,
  stato                 text NOT NULL DEFAULT 'da_comunicare',
  campi_corretti        text[] NOT NULL DEFAULT '{}',
  testo_inviato         text,
  comunicato_at         timestamptz,
  comunicato_da         uuid REFERENCES auth.users(id),
  visto_dal_dentista_at timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT avviso_stato_vocabolario
    CHECK (stato IN ('da_comunicare','comunicato_dall_app','comunicato_a_voce')),
  CONSTRAINT avviso_comunicato_ha_autore_e_data
    CHECK (
      (stato = 'da_comunicare' AND comunicato_at IS NULL AND comunicato_da IS NULL)
      OR (stato <> 'da_comunicare' AND comunicato_at IS NOT NULL AND comunicato_da IS NOT NULL)
    ),
  CONSTRAINT avviso_testo_solo_se_dall_app
    CHECK (stato <> 'comunicato_dall_app' OR testo_inviato IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_avvisi_da_comunicare
  ON public.avvisi_dentista (laboratorio_id, created_at DESC)
  WHERE stato = 'da_comunicare';

CREATE INDEX IF NOT EXISTS idx_avvisi_per_cliente
  ON public.avvisi_dentista (cliente_id, created_at DESC);

ALTER TABLE public.avvisi_dentista ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS avvisi_lettura_lab ON public.avvisi_dentista;
CREATE POLICY avvisi_lettura_lab ON public.avvisi_dentista
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

DROP POLICY IF EXISTS avvisi_scrittura_lab ON public.avvisi_dentista;
CREATE POLICY avvisi_scrittura_lab ON public.avvisi_dentista
  FOR UPDATE USING (laboratorio_id = public.current_lab_id())
              WITH CHECK (laboratorio_id = public.current_lab_id());

COMMENT ON TABLE public.avvisi_dentista IS
  'GDPR Art. 19 + Art. 5(2): la comunicazione della rettifica al destinatario, '
  'e la prova che e'' avvenuta. Nasce dentro la transazione della riemissione '
  '(D317, D331-D339). Nessuno stato «annullato»: un avviso nasce da un fatto.';
```

🔑 **Perché NON c'è una politica di `INSERT`:** l'avviso nasce **solo** dentro `correggi_e_riemetti_atomica`, che è `SECURITY DEFINER`. Nessun chiamante applicativo deve poterne creare uno.
🔑 **Perché nessuno stato «annullato»:** ⚖️ spec §3.2 — un promemoria cancellabile è una casella da spuntare.

- [ ] **Passo 3 — il vocabolario in TypeScript**

```ts
// src/lib/avvisi/stati.ts
/** 🛑 Specchio del CHECK vivo (`avviso_stato_vocabolario`): un valore in più
 *  qui sarebbe un 23514 illeggibile a runtime invece di un 422. */
export const STATI_AVVISO = ['da_comunicare', 'comunicato_dall_app', 'comunicato_a_voce'] as const
export type StatoAvviso = (typeof STATI_AVVISO)[number]

/** I due stati che chiudono il promemoria. Non è `STATI_AVVISO.slice(1)`:
 *  due elenchi che si somigliano si accorciano per sbaglio. */
export const STATI_CHIUSI = ['comunicato_dall_app', 'comunicato_a_voce'] as const
```

- [ ] **Passo 4 — applica e prova che il vincolo RIFIUTA (R-P1)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```
Poi, in **transazione annullata**, prova un valore che **DEVE** essere rifiutato:
```bash
node scripts/psql.mjs -c "BEGIN; INSERT INTO public.avvisi_dentista (laboratorio_id, lavoro_id, cliente_id, dichiarazione_id, stato) VALUES ('00000000-0000-0000-0000-000000000001', gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'pippo'); ROLLBACK;"
```
**Atteso:** errore `23514` su `avviso_stato_vocabolario` (o `23503` su una chiave esterna, se arriva prima — in quel caso ripeti con id veri). **Incolla l'errore nel resoconto.**

- [ ] **Passo 5 — FASE 6b, dovuta**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit
```

- [ ] **Passo 6 — salva**

```bash
git status --short
git add supabase/migrations/<file>.sql src/lib/avvisi/stati.ts src/types/database.types.ts
git commit -m "feat(avvisi): la tabella degli avvisi al dentista, e i tre stati"
```

---

## Task 2 — L'avviso nasce DENTRO la transazione della riemissione

**File:**
- Crea: `supabase/migrations/<timestamp>_correggi_e_riemetti_con_avviso.sql`
- **Apri PRIMA:** `supabase/migrations/20260808093513_correggi_e_riemetti_atomica.sql` — 🛑 **e leggi il corpo VIVO dal catalogo, non il file** (`SELECT pg_get_functiondef('public.correggi_e_riemetti_atomica'::regproc)`): il file non è la verità.

**Interfacce:** la firma **non cambia** (6 parametri). Cambia il corpo.

- [ ] **Passo 1 — leggi il corpo vivo e incollalo nel resoconto**

```bash
node scripts/psql.mjs -c "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'correggi_e_riemetti_atomica';"
```

- [ ] **Passo 2 — la prova d'integrazione, PRIMA (TDD)**

🆕 (da creare) In `tests/integration/avvisi-dentista-schema.rpc.test.ts`, dentro `withRollback`:
① dopo una riemissione riuscita **esiste esattamente un avviso** `da_comunicare` per quel lavoro, con `campi_corretti` uguale alle chiavi di `p_correzioni`;
② se la riemissione **fallisce**, **nessun avviso resta** (è il punto di tutto: stessa transazione);
③ due riemissioni di fila sullo stesso lavoro → **due** avvisi, non uno aggiornato.

- [ ] **Passo 3 — lanciala e verifica che sia ROSSA**

```bash
set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-dentista-schema.rpc.test.ts
```
**Atteso:** rossa perché **la tabella è vuota**, non perché manca un modulo. ⛔ **R-P4:** se il rosso è «modulo non trovato», la prova non prova niente — sistemala prima. **Conta quante asserzioni si accendono e scrivi «N su M».**

- [ ] **Passo 4 — riscrivi la funzione**

🛑 **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`**, e il corpo è quello **vivo** del Passo 1 più questo blocco, **prima** del `RETURN`:

```sql
  INSERT INTO public.avvisi_dentista
    (laboratorio_id, lavoro_id, cliente_id, dichiarazione_id, campi_corretti)
  SELECT p_laboratorio_id, p_lavoro_id, l.cliente_id, v_nuova_ddc_id,
         ARRAY(SELECT jsonb_object_keys(p_correzioni))
    FROM public.lavori l
   WHERE l.id = p_lavoro_id AND l.laboratorio_id = p_laboratorio_id;
```
⚠️ `v_nuova_ddc_id` è il nome **presunto** della variabile che porta la dichiarazione nuova: **verificalo sul corpo vivo** e usa quello vero.

- [ ] **Passo 5 — applica, e verifica il corpo vivo E i permessi**

```bash
npx supabase db push --linked --yes
node scripts/psql.mjs -c "SELECT proacl FROM pg_proc WHERE proname = 'correggi_e_riemetti_atomica';"
```
**Atteso:** `EXECUTE` **solo** a `service_role`. 🛑 Se compaiono `anon` o `authenticated`, il `REVOKE` è saltato.

- [ ] **Passo 6 — la prova diventa verde, poi FASE 7**

```bash
npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
```
🛑 **timeout 600000 ms**, e **mai dietro una pipe**.

- [ ] **Passo 7 — salva**

---

## Task 3 — Il testo proposto, e la prova che non nomina mai il paziente

**File:** Crea `src/lib/avvisi/messaggio.ts` · Prova `tests/unit/avviso-messaggio.test.ts` — 🆕 (da creare) entrambi

**Interfacce prodotte:**
`buildAvvisoMessage({ numeroLavoro, portalToken }): string` · `descriviCampiCorretti(campi: readonly CampoCorreggibile[]): string[]`

- [ ] **Passo 1 — la prova, PRIMA**

```ts
it('il messaggio per WhatsApp non contiene mai il nome del paziente', () => {
  const testo = buildAvvisoMessage({ numeroLavoro: '2026/0042', portalToken: 'tok' })
  expect(testo).not.toContain('Mario')
  expect(testo).toContain('2026/0042')
  expect(testo).toContain('/portale/tok')
})
```
🔑 **La fixture deve portare un nome vero** anche se la funzione non lo riceve: è la prova che **la firma stessa** non gli dà modo di finire lì.

- [ ] **Passo 2 — verifica che sia rossa** · Atteso: «buildAvvisoMessage is not defined».

- [ ] **Passo 3 — scrivi il modulo**

```ts
// src/lib/avvisi/messaggio.ts
// GDPR — nessun dato personale: solo numero di lavoro + link al portale.
// Gemello di `src/lib/consegna/whatsapp-template.ts`, e per la stessa ragione.
import type { CampoCorreggibile } from '@/lib/dichiarazione/correzioni'

export function buildAvvisoMessage({ numeroLavoro, portalToken }: {
  numeroLavoro: string; portalToken: string
}): string {
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'}/portale/${portalToken}`
  return [
    `📄 La dichiarazione del lavoro #${numeroLavoro} è stata rifatta.`,
    ``,
    `Trovi quella aggiornata qui:`,
    url,
    ``,
    `— UÀ Lab`,
  ].join('\n')
}

/** ⚖️ D336 — il FATTO, mai il valore vecchio. */
const NOME_CAMPO: Record<CampoCorreggibile, string> = {
  richiedente_nome: 'il nome del dentista che ha prescritto',
  paziente_id: 'il paziente',
  tipo_dispositivo: 'il tipo di lavorazione',
  descrizione: 'la descrizione',
  denti_coinvolti: 'i denti indicati',
  prescrizione_caratteristiche: 'le caratteristiche prescritte',
}

export function descriviCampiCorretti(campi: readonly CampoCorreggibile[]): string[] {
  return campi.map((c) => NOME_CAMPO[c])
}
```
🛑 **`NOME_CAMPO` è un `Record` completo di proposito:** se un giorno `CAMPI_CORREGGIBILI_DOCUMENTO` guadagna una voce, **`tsc` si accende qui** invece di lasciare una descrizione vuota a schermo.

- [ ] **Passo 4 — verde** · **Passo 5 — salva**

---

## Task 4 — La rotta che segna l'avviso come comunicato

**File:** Crea `src/app/api/lavori/[id]/avviso/route.ts` · Prova `tests/unit/api-avviso.test.ts` — 🆕 (da creare) entrambi
**Apri PRIMA:** `src/app/api/lavori/[id]/eventi-qualita/route.ts` — è il modello di casa per guardie, `isSameOrigin`, `getFreshLabContext`, `assertLabOperativo`.

**Interfacce:** `POST /api/lavori/[id]/avviso` — corpo `{ avviso_id: string, come: 'dall_app' | 'a_voce', testo?: string }` → `200 { ok: true }`.

- [ ] **Passo 1 — enumera le FORME D'INPUT prima delle asserzioni (R-P4)**, e scrivi il caso o il «non coperta, perché» per ciascuna: corpo non-JSON · `avviso_id` assente · `avviso_id` di un altro laboratorio · `come` fuori vocabolario · `come: 'dall_app'` **senza** `testo` · avviso **già** chiuso.
- [ ] **Passo 2 — scrivi le prove, e verifica che siano rosse**
- [ ] **Passo 3 — la rotta.** Regole non negoziabili:
  - `isSameOrigin` · `getFreshLabContext` · `assertLabOperativo` — **come la rotta modello**;
  - **`comunicato_da` viene dal contesto server (`context.userId`), MAI dal corpo**;
  - `come: 'dall_app'` **senza** `testo` → **422** (il vincolo in banca dati lo rifiuterebbe con un `23514` illeggibile: la rotta lo prende prima, con una frase);
  - un avviso **già chiuso** → **409**, non un secondo aggiornamento silenzioso;
  - ⚖️ **D339: si scrive `testo_inviato`, e NON si conserva nessuna bozza.**
- [ ] **Passo 4 — verde** · **Passo 5 — FASE 7** · **Passo 6 — salva**

---

## 🎨 CANCELLO §0B — ✅ **PASSATO il 09/08/2026, 19:17**

- [x] **Mockup HTML**: `docs/design/mockups/2026-08-09-avviso-al-dentista.html` — due superfici, **tre varianti ciascuna**.
- [x] **Chiaro e scuro, 390 · 768 · 1280**: sei scatti in `docs/design/mockups/screenshots/2026-08-09-avviso-al-dentista/`.
- [x] **PIÙ VARIANTI**: tre per superficie.
- [x] **Approvazione di Francesco** → ⚖️ **D344 (foglio = A2)** · ⚖️ **D346 (portale = B1)**, verbale **centoquarantanovesima tornata**.

🔑 **Due difetti del mockup trovati MISURANDO, non guardando, e corretti prima di far scegliere:** il
messaggio proposto era **tagliato** (225px di contenuto in 176 visibili) · una data stava a **2,54:1**
contro 4,5. 📌 **Sonda sul DOM vivo:** nel foglio v3 **zero** testi sotto soglia nei due temi; l'unico
residuo è la riproduzione fedele di ciò che il portale fa **oggi**.

🔴 **E dalle risposte di Francesco sono nate QUATTRO decisioni oltre alla scelta delle varianti** —
D345 (la firma), D347 (il portale si migra intero), D348 (il collegamento non scade), D349 (i due
condivisi). **Due cambiano questo piano**, e sono qui sotto.

---

## Task 4-ter — 🔴 LA FIRMA DEI MESSAGGI (⚖️ D345) — **prima del Task 5**

**Nasce da una riga del mockup**, e non era un difetto del mockup: `provato:` `grep -rn "UÀ Lab" src/`
→ **TRE punti**, di cui **DUE in produzione** (`src/lib/consegna/whatsapp-template.ts:18,30`), usati da
**quattro** componenti veri — fra cui i **solleciti di pagamento**.

- [ ] **Nessun messaggio è firmato «UÀ Lab»: la firma è il NOME DEL LABORATORIO** (`laboratori.nome`).
- [ ] La firma **esce dal codice e diventa un dato passato**: cambia la firma di `buildAvvisoMessage`
      (oggi `{ numeroLavoro, portalToken }`) e delle funzioni di `whatsapp-template.ts`.
- [ ] 🛑 **Perimetro pieno, non solo l'avviso:** D345 dice «*ogni messaggio che inviamo*».
- [ ] ⚠️ **Tocca superfici in PRODUZIONE** (scadenzario, accettazione, consegna) → **FASE 3 obbligatoria**,
      percorso **Medio**: il censimento dei chiamanti **decide** l'elenco dei file, non l'autore del piano.

---

## Task 4-quater — ⚖️ D354: un atto chiude TUTTE le righe aperte del lavoro — **ripresa del 10/08, prima del Task 8**

**Nasce da:** ⚖️ **D354** (verbale, centocinquantatreesima tornata) — ratifica della proposta unanime del
panel a tre (referto: `docs/roadmap/2026-08-10-panel-due-avvisi-referto.md` §3 e §6). **Zero migration.**
**File:** `src/app/api/lavori/[id]/avviso/route.ts` (la scrittura e il ramo zero-righe, righe 296-383) ·
Prova `tests/unit/api-avviso.test.ts` (esistente, si estende).
**Apri PRIMA:** la rotta INTERA (383 righe) · `tests/unit/api-avviso.test.ts` — **censisci quali prove
presuppongono il filtro per id**: si aggiornano DICHIARANDOLO nel resoconto, non in silenzio ·
`src/lib/avvisi/stati.ts` (`STATI_APERTI`, `chiudeIlPromemoria`, `ammetteTestoInviato`).

**Il contratto verso il client NON cambia** — corpo `{ avviso_id, come, testo? }` → `200 { ok: true,
avviso }`, dove `avviso` resta **la riga indicata dal corpo** (unico chiamante vivo:
`AvvisoDentista.tsx:513-531`, legge `esito.avviso` — censimento del 10/08, v. registro R-P2).

**Che cosa cambia** (`non eseguito` — il quadro; il codice lo scrive l'esecutore sotto prova):
1. L'avviso indicato dal corpo si verifica **PRIMA** dell'aggiornamento, nel perimetro
   `laboratorio_id + lavoro_id`: assente → **404** · già chiuso → **409**. I due rami esistono già nel
   ramo zero-righe (righe 345-374): si **spostano davanti** alla scrittura. 🛑 **Senza questa verifica,
   un `avviso_id` di un ALTRO lavoro chiuderebbe comunque le righe di questo** — il corpo dichiarerebbe
   una cosa e l'atto ne farebbe un'altra.
2. L'UPDATE perde `.eq('id', avvisoId)`: il perimetro diventa `lavoro_id + laboratorio_id + stato IN
   STATI_APERTI` — **stessi tre valori su ogni riga** (`stato` · `comunicato_at` · `comunicato_da`
   [+ `testo_inviato`]). L'oggetto `daScrivere` è **uno**, quindi l'identità dei valori è per costruzione.
3. La risposta seleziona dalla lista aggiornata **la riga con `id === avviso_id`** — fail-closed se manca
   (appena verificata aperta: se non c'è più è la corsa con un collega, e il ramo zero-righe la copre).
4. Il ramo «zero righe aggiornate» resta **fail-closed** com'è oggi (righe 364-374).

- [ ] **Passo 1 — enumera le FORME della scrittura (R-P4)**, una prova per ciascuna:
  ① due righe aperte → un atto → **entrambe** chiuse, stessi tre valori · ② una aperta + una **già
  chiusa** → l'aperta si chiude, la chiusa **non si tocca** (né `comunicato_at` né `testo_inviato`
  riscritti) · ③ `avviso_id` fuori dal perimetro, con righe aperte nel lavoro → **404 e NESSUN update**
  (coppia: codice giusto **+** il finto client non riceve l'update) · ④ riga indicata già chiusa →
  **409 e NESSUN update** · ⑤ il giro di oggi a UNA riga aperta resta identico: 200, `avviso` = la riga.
- [ ] **Passo 2 — prove rosse**, poi abbozzo inerte e conteggio delle asserzioni che si accendono (`N su M`).
- [ ] **Passo 3 — la rotta.** I quattro punti del quadro; le guardie (origine · contesto · ruolo ·
  operativo, righe 183-225) **NON si toccano**.
- [ ] **Passo 4 — verde** · **Passo 5 — FASE 7** (`tsc` · `vitest` · `next build`) · **Passo 6 — salva**.

⚠️ **La prova del Task 2 («due riemissioni → due avvisi») deve restare verde e INTOCCATA**: le righe
continuano a nascere due (referto §6). ⚠️ Il caso di confine «portale aperto fra le due correzioni» è
**deciso-di-non-deciderlo** (referto §4): questo task **non** lo affronta e non lo anticipa.

---

## Task 5 — Il foglio dell'avviso

**File:** Crea `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` · Prova `tests/unit/AvvisoDentista.test.tsx` — 🆕 (da creare) entrambi
**Apri PRIMA:** `DevoIntervenire.tsx` — stesso posto, stessi token, e porta i difetti da non ripetere (`--fondo-superficie`, `--filo-superficie`, `--didascalia-superficie`).

🎨 **DISEGNO APPROVATO: la VARIANTE A2 «due strade pari»** — ⚖️ **D344**. Il mockup è la fonte:
`docs/design/mockups/2026-08-09-avviso-al-dentista.html`, colonna centrale della sezione A.

- [ ] **Passo 1 — una domanda sola:** «*Come avvisi il dentista?*», e **due righe di scelta con lo stesso
      peso visivo** (`--fondo-superficie`, `raggio.riga` 18, `minHeight` 60, gallone `›`): «*Glielo mando su
      WhatsApp*» e «*L'ho avvisato io, a voce*», ognuna con la sua riga di spiegazione.
      🛑 **Nessuna delle due è più invitante dell'altra: è il punto di D335, e la A2 è stata scelta per
      questo.** Sotto, la superficie «*Perché te lo chiedo*» che dice che il promemoria non si spegne da solo.
- [ ] **Passo 2 — solo se sceglie WhatsApp:** il testo **modificabile** (D334) e il tasto di invio.
      📌 **Costo accettato da Francesco: due tap invece di uno** per la strada normale.
- [ ] 🛑 **La firma del messaggio arriva dal Task 4-ter** (D345): il nome del laboratorio, **non** una
      costante scritta qui.
- [ ] ✅ **Il gettone del portale NON si rigenera più qui:** ⚖️ **D348** — non scade a tempo. Se il
      collegamento è spento perché la collaborazione è finita, **è un altro discorso** (riga di roadmap),
      non un ramo di questo foglio.
- [ ] 🛑 **Navigare da dentro l'overlay: `useNavigaDaOverlay`, MAI `router.push`** (`CLAUDE.md` §9).
- [ ] Componenti da `src/components/ds/`, motion da `src/design-system/v3/motion.ts`.
- [ ] Prove: il testo modificato **è quello spedito** · i bersagli ≥ 44px · il colore non è l'unica fonte di stato.

---

## Task 6 — Il promemoria sulla scheda del lavoro

**File:** Modifica `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` (righe da censire) · Crea `src/lib/avvisi/queries.ts` 🆕 (da creare)
- [ ] `avvisiDaComunicare(lavoroId)` e `archivioCliente(clienteId)` — **due letture della stessa tabella**, niente terza fonte.
- [ ] La riga compare **solo** se esiste un avviso `da_comunicare`; sparisce quando è chiuso.

---

## Task 7 — Il candidato nella striscia della home

**File:** Modifica `src/lib/dashboard/striscia.ts` · Prova `tests/unit/striscia.test.ts`
**Apri PRIMA:** `striscia.ts:100-215` — `s1…s8`, `LIVELLO1_PER_RUOLO`, `candidatiLivello1`.

- [ ] Il candidato, nella forma già in uso:
```ts
const sAvvisoDentista: Candidato = (i) => i.avvisoDaComunicare
  ? { attenzione: true, forte: `n.${i.avvisoDaComunicare.numero}`, testo: 'aspetta l\'avviso al dentista',
      azione: { etichetta: 'Apri ›', href: `/lavori/${i.avvisoDaComunicare.id}` } }
  : null
```
- [ ] 🛑 **L'ORDINE DELL'ARRAY È PORTANTE** (dichiarato a `striscia.ts:180-186`): decide **quale** allarme parla quando più d'uno è acceso. Metti `sAvvisoDentista` **dopo** i ritardi operativi e **prima** dei pagamenti, e **scrivi perché** nel commento.
- [ ] ~~**Perimetro per ruolo:** `titolare`, `admin_rete`, `front_desk`. **Non** `tecnico` — non è lui a comunicare col dentista.~~
      🔄 **DECISO IL 09/08/2026 — ⚖️ D342, e questa proposta È CADUTA: il perimetro è `titolare` · `tecnico` · `front_desk`.**
      **Esclusi `admin_rete` e `admin_sistema`, entrambi PER NOME.** Il tecnico **resta dentro**: un panel a tre ha
      portato da due direzioni indipendenti lo stesso argomento — se il tecnico ha telefonato e non può registrarlo,
      **registra un altro**, e la riga porta un nome che non corrisponde al fatto (*attribuzione falsa*: la modifica
      peggiora la prova che voleva proteggere). `admin_rete` **esce** perché non lavora in quel laboratorio.
      🔑 **E il principio che regge il legame fra questo task e il Task 4: la visibilità è un SOTTOINSIEME del
      permesso — nessuno vede un promemoria che non può chiudere.** Verbale: **centoquarantottesima tornata**.

---

## Task 8 — La sezione «Avvisi» nel portale

**File:** Modifica `src/app/portale/[token]/page.tsx` · `src/lib/portale/audit.ts:10`

🎨 **DISEGNO APPROVATO: la VARIANTE B1 «una sezione come le altre»** — ⚖️ **D346**. Gli avvisi in cima,
**sopra i lavori in corso**, con la **stessa card** che il dentista già conosce (`LavoroCard`), titolo
`«Avvisi dal laboratorio (N)»` nello stile dei titoli di sezione (13/700 maiuscolo, `+0.06em`, `#374151`).
🛑 **Si resta nello stile che il portale ha OGGI** — colori scritti a mano, DM Sans, nessun tema scuro —
perché ⚖️ **D347** ha deciso che quella pagina si migra **intera** al v3 in un'**ondata a sé**: portarci il
v3 da qui sarebbe una migrazione per componente, vietata (v3 §14).
⚠️ **Il dubbio scritto nel mockup resta aperto e passa a D347:** una card fra tante **si può scorrere via**,
e questa è l'unica che chiede di fare qualcosa.
📌 **Una parte nuova non eredita un difetto noto:** la didascalia della data va a `#6B7280` (**4,83:1**),
non al `#9CA3AF` che il portale usa altrove (**2,54:1**, misurato).

⚖️ **D354 (10/08, ratificata) — EREDITÀ VINCOLANTE, sostituisce «una card per avviso»:** la sezione mostra
**UNA card PER LAVORO** che abbia almeno un avviso; le voci sono l'**UNIONE** dei `campi_corretti` degli
avvisi di quel lavoro (`descriviCampiCorretti` sull'insieme unito) · la data mostrata è quella dell'avviso
**più recente** · la dichiarazione da scaricare è **l'ULTIMA** (il filtro `.neq('ddc.stato','annullata')`
esiste già nella pagina, riga ~357: si riusa quel pattern, non se ne inventa un altro).
📌 **Nessun filtro di stato sull'avviso:** il portale mostra l'avviso anche se il promemoria del laboratorio
è ancora aperto — la pagina offre GIÀ la dichiarazione nuova a prescindere, e nasconderlo mostrerebbe un
documento nuovo senza spiegazione. Il `COMMENT` sulla colonna lo anticipa: «*Non chiude il promemoria:
chiuderlo è un atto del laboratorio, non del destinatario*».

- [ ] La card mostra: **quale lavoro**, **quali voci** (unione, v. sopra), la **dichiarazione ultima** da scaricare.
- [ ] 🛑 ⚖️ **D336 — il valore vecchio non compare MAI.** Prova esplicita.
- [ ] `AzionePortale` guadagna `view_avviso`, e l'apertura scrive `visto_dal_dentista_at`.
- [ ] 🔴 **`visto_dal_dentista_at` NON si scrive con un UPDATE: serve una FUNZIONE `SECURITY DEFINER`** —
  `provato:` catalogo vivo (10/08): `information_schema.column_privileges` → l'UPDATE di quella colonna
  non è concesso a NESSUN ruolo dell'app (solo `postgres`); la migration `20260809124517` lo dichiara
  **deliberato** («il laboratorio non deve poter fabbricare la prova di essere stato letto») e **prescrive
  la strada**: funzione sul modello `valutazione_supera`, `DROP → CREATE → REVOKE EXECUTE FROM PUBLIC,
  anon, authenticated → GRANT a service_role → COMMENT`. Semantica: scrive `now()` **solo dove è NULL**
  (la ricevuta registra la PRIMA visione, non si riscrive) — su **tutte le righe mostrate** al momento
  dell'apertura. ➡️ **QUESTO TASK PORTA UNA MIGRATION**: nome con `date -u` in comando separato (⚖️ D311,
  pavimento `20260809133546`), applicazione in autonomia (⚖️ D284), poi **FASE 6b** (gen types → tsc).
- [ ] La lettura riusa `archivioCliente` (`src/lib/avvisi/queries.ts:346`) se il suo contratto basta —
  una query nuova si scrive solo se il riuso non regge, e la ragione va nel resoconto.
- [ ] ⚠️ Il caso di confine della ricevuta parziale (referto D354 §4: portale aperto FRA due correzioni)
  resta **deciso-di-non-deciderlo**: nessuna superficie lo distingue in questo task.
- [ ] ⚠️ Il portale è **una superficie usata da un'altra persona su un altro telefono**: FASE 9 anche lì —
  🔄 **accorpata al Task 10** (handoff 10/08 §0③: la fixture nasce solo dalla riemissione vera).

---

## Task 9 — La sezione «Comunicazioni» nella scheda del dentista (⚖️ D337)

**File:** Modifica `src/app/(app)/clienti/[id]/page.tsx` — 🛑 **NON LETTO in fase di piano: il primo passo è aprirlo e scriverne la struttura nel resoconto.**
- [ ] Per ogni comunicazione: **quando · come · chi · se e quando l'ha aperta**.
- [ ] 🛑 **È un ARCHIVIO, NON un allarme:** niente pastiglie rosse, niente contatori che chiamano.
- [ ] Legge `archivioCliente()` del Task 6 — **nessuna query nuova**.

---

## Task 10 — Le prove d'integrazione e i cancelli di chiusura

- [ ] Il giro completo **sul banco vero**: riemetti → nasce l'avviso → chiudilo nei due modi → verifica in banca dati. **Rimetti il banco com'era e scrivi come.**
- [ ] 🛑 **La prova che conta più delle altre:** il corpo che il foglio manda alla rotta **si giudica col contratto della rotta**, non con una finzione — v. riga **38** della coda e il modo già usato nel Task 10 dell'ondata precedente.
- [ ] **FASE 9**: 390 · 768 · 1280, chiaro e scuro, **app e portale**.
- [ ] **FASE 9b — gate estetico L2** (D245): superfici nuove → **dovuto**.
- [ ] **BP-1**: memoria, roadmap, verbale.

---

## Autorevisione del piano

**Copertura della spec:** §3.1 → T2, T4, T5 · §3.2 → T1 · §3.3 → T3 · §4 → T1, T2 · §5 → T5, T6, T7, T8, T9 · §6 (cosa non si fa) → vincoli globali · §7 → tutte chiuse · §8 → T10.

**Placeholder:** nessun «TBD». **Due punti dichiarati non letti** e assegnati come primo passo del loro task (T6 `SchedaLavoroV3.tsx`, T9 `clienti/[id]/page.tsx`) — R-P2 chiede che l'elenco non lo decida l'autore, non che l'autore legga tutto.

**Coerenza dei tipi:** `StatoAvviso` (T1) usato in T4 · `CampoCorreggibile` (esistente) in T3 · `buildAvvisoMessage` (T3) in T5 · `archivioCliente` (T6) in T9 · `descriviCampiCorretti` (T3) in T8.

🔴 **Dove questo piano può sbagliare, e va cercato dagli esecutori:** ① il nome `v_nuova_ddc_id` nel Task 2 è **presunto** ② il perimetro per ruolo del Task 7 è **una proposta**, non una decisione di Francesco ③ i tre `CHECK` del Task 1 non sono mai stati eseguiti insieme: il secondo e il terzo potrebbero rendere impossibile uno stato legittimo.

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

## Censimento degli identificatori (R-P6)

**Nomi nuovi introdotti da questo piano** — nessuno di essi esiste oggi (`provato:` `grep -rn` su `src/` e `supabase/` per ciascuno → 0 hit):
`avvisi_dentista` · `avviso_dentista_crea` · `StatoAvviso` · `da_comunicare` · `comunicato_dall_app` · `comunicato_a_voce` · `buildAvvisoMessage` · `view_avviso` · `sAvvisoDentista`

**Nomi esistenti che questo piano tocca, e la loro destinazione:**

| nome | oggi | dopo |
|---|---|---|
| `correggi_e_riemetti_atomica` | 6 parametri | **invariata la firma**; il corpo guadagna un `INSERT` (Task 2) |
| `AzionePortale` | 16 valori | **17**, con `view_avviso` (Task 8) |
| `LIVELLO1_PER_RUOLO` | 4 ruoli, candidati `s1…s7` | i tre ruoli che vedono i lavori guadagnano `sAvvisoDentista` (Task 7) |
| `CAMPI_CORREGGIBILI_DOCUMENTO` | 6 voci | **invariato** — è la fonte di `campi_corretti`, non cambia |

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

## 🎨 CANCELLO §0B — prima del Task 5 e del Task 8

- [ ] **Mockup HTML** in `docs/design/mockups/2026-08-XX-avviso-al-dentista.html` — **due superfici**: il foglio dell'avviso (app) e la sezione «Avvisi» (portale). 🆕 (da creare)
- [ ] **Chiaro e scuro, 390 · 768 · 1280**, screenshot in `docs/design/mockups/screenshots/`.
- [ ] 🛑 **PIÙ VARIANTI, mai una sola** — preferenza permanente di Francesco.
- [ ] **Approvazione esplicita di Francesco** → decisione scritta nel verbale **prima** di scrivere React.

---

## Task 5 — Il foglio dell'avviso

**File:** Crea `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` · Prova `tests/unit/AvvisoDentista.test.tsx` — 🆕 (da creare) entrambi
**Apri PRIMA:** `DevoIntervenire.tsx` — stesso posto, stessi token, e porta i difetti da non ripetere (`--fondo-superficie`, `--filo-superficie`, `--didascalia-superficie`).

- [ ] Testo **modificabile** (D334) · due tasti: «Mandalo su WhatsApp» e «L'ho avvisato di persona».
- [ ] 🛑 **Il tasto distruttivo non è il più invitante:** qui nessuno dei due distrugge, ma «a voce» **chiude un obbligo senza mandare niente** — non deve essere il più facile da premere per sbaglio.
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
- [ ] **Perimetro per ruolo:** `titolare`, `admin_rete`, `front_desk`. **Non** `tecnico` — non è lui a comunicare col dentista. **Se non sei d'accordo, riferisci invece di cambiare.**

---

## Task 8 — La sezione «Avvisi» nel portale

**File:** Modifica `src/app/portale/[token]/page.tsx` · `src/lib/portale/audit.ts:10`
- [ ] La sezione mostra: **quale lavoro**, **quali voci** sono cambiate (`descriviCampiCorretti`), la **dichiarazione nuova** da scaricare.
- [ ] 🛑 ⚖️ **D336 — il valore vecchio non compare MAI.** Prova esplicita.
- [ ] `AzionePortale` guadagna `view_avviso`, e l'apertura scrive `visto_dal_dentista_at`.
- [ ] ⚠️ Il portale è **una superficie usata da un'altra persona su un altro telefono**: FASE 9 anche lì.

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

# P31 — Due numeri per il cliente · Piano di implementazione

> **Per chi esegue:** SKILL RICHIESTA — `superpowers:subagent-driven-development` (consigliata) o
> `superpowers:executing-plans`. I passi usano caselle (`- [ ]`) per il tracciamento.
> 🛑 **R-E1: un compito a un esecutore fresco**, con revisione fra l'uno e l'altro, e nel brief
> l'istruzione esplicita di **cercare attivamente dove questo piano sbaglia**.
> 🛑 **R-E2: un difetto trovato FUORI dal proprio mandato si RIFERISCE, non si corregge di nascosto.**

**Spec:** `docs/superpowers/specs/2026-08-03-p31-due-numeri-per-il-cliente-design.md` (D181-D184)
**Obiettivo:** separare il **telefono dello studio** dal **cellulare WhatsApp**, e far sì che il
collegamento WhatsApp funzioni con un numero scritto come lo scrive chi sta al banco.
**Architettura:** una colonna nuova su `clienti`, una funzione di normalizzazione **in un posto solo**,
e i cinque punti che mandano WhatsApp spostati sul campo nuovo **nello stesso compito** della colonna.
**Stack:** Next.js 16 (App Router) · Supabase (Postgres + RLS) · TypeScript · Vitest · DS v3.

---

## Vincoli globali

- **Ruoli: CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. Mai `admin` nudo.
- **RLS:** `public.current_lab_id()`, **mai** `auth.current_lab_id()`.
- **Motion:** solo da token (`src/design-system/v3/motion.ts` per v3). Mai `duration` in linea.
- **Componenti:** superficie v3 → solo da `src/components/ds/`. **Mai** mischiare v3 e v2.3 nella stessa pagina.
- **Testo:** DS v3 §2.3 — niente gergo. «cellulare», «fisso», mai «numero di telefono mobile».
- **PATCH:** sempre **allowlist esplicita**, mai blocklist.
- **Commit:** `feat(ambito): …` / `fix(ambito): …`. Mai `--no-verify` senza motivo scritto nel messaggio.
- **Dopo ogni migration:** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → `npx tsc --noEmit` (**FASE 6b**).
- **FASE 7 a fine ondata:** `npx tsc --noEmit` · `npx vitest run` · `npx next build`. Tutti e tre.

---

## Registro delle letture (R-P2)

L'elenco **non l'ha deciso l'autore del piano**: nasce dal censimento §4 della spec.

| percorso | esito |
|---|---|
| `supabase/schema.sql` | **letto** righe 365-410 (tabella `clienti`) e 2400-2410 (vista) |
| `supabase/migrations/` | **letto** l'elenco + `MANUAL_000_auth_helpers.sql` righe 1-30 (stile) |
| `src/lib/consegna/whatsapp-template.ts` | **letto** intero (60 righe) |
| `src/lib/consegna/orchestrate.ts` | **letto** righe 105-150 e 350-372 |
| `src/app/api/clienti/route.ts` | **letto** righe 8-17 (`CAMPI_ELENCO`), 51, 81, 125 |
| `src/app/api/clienti/[id]/route.ts` | **letto** righe 16-23 (`PATCHABLE_FIELDS_CLIENTE`), 169-175 |
| `src/components/features/clienti/ClienteEditSheet.tsx` | **letto** righe 15, 83, 132, 318-335 |
| `src/components/features/wizard/NuovoDentistaSheet.tsx` | **letto** righe 44, 74, 95-125 |
| `src/components/ds/Campo.tsx` | **letto** righe 57-95 (`CampoTesto`) e l'inizio di `CampoNumero` |
| `src/types/domain.ts` | **letto** righe 618-647 (`ConsegnaResult`) |
| `src/components/features/lavori/consegna-v3/FrameConsegnato.tsx` | **letto** righe 95-140 |
| `src/components/features/scadenzario/EstrattoContoView.tsx` | **letto** righe 23-40, 215-235, 340-355 |
| `src/components/features/scadenzario/ScadenzarioList.tsx` | **letto** righe 75-95 |
| `src/app/api/scadenzario/route.ts` | **letto** righe 34, 48, 69 |
| `src/app/api/scadenzario/[cliente_id]/route.ts` | **letto** righe 15, 52, 79 |
| `src/app/(app)/scadenzario/[cliente_id]/page.tsx` | **letto** righe 29, 45 |
| `src/components/features/scadenzario/ClienteInfoCard.tsx` | **letto** righe 52-67 |
| `src/app/(app)/clienti/[id]/page.tsx` | **letto** righe 264, 294 |
| `src/components/features/clienti/ClientiSearchList.tsx` | **letto** righe 243-252 |
| `src/components/features/ordini/NuovoOrdineSheet.tsx` | **letto** riga 193 — **fuori perimetro**, riferito |
| `src/components/features/pec/PecSetupWidget.tsx` | **letto** righe 160-170 (il precedente del prefisso) |

---

## Struttura dei file

| file | responsabilità | compito |
|---|---|---|
| `supabase/migrations/20260803T####_p31_cellulare_whatsapp.sql` | **crea** — la colonna e i due commenti | 1 |
| `src/types/database.types.ts` | **rigenerato** — mai a mano | 1 |
| `src/lib/consegna/whatsapp-template.ts` | **modifica** — ospita `numeroPerWhatsapp` accanto a `buildWhatsappUrl` | 2 |
| `tests/unit/numero-per-whatsapp.test.ts` | **crea** — le forme del numero | 2 |
| `src/app/api/clienti/[id]/route.ts` | **modifica** — `PATCHABLE_FIELDS_CLIENTE` | 3 |
| `src/app/api/clienti/route.ts` | **modifica** — POST (creazione). `CAMPI_ELENCO` **NON** si tocca | 3 |
| `tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts` | **crea** — il vincolo dell'allowlist | 3 |
| `src/lib/consegna/orchestrate.ts` | **modifica** — 2 `select` + 2 chiamate + `cliente_id` nell'esito | 4 |
| `src/types/domain.ts` | **modifica** — `cliente_id` in `ConsegnaResult` | 4 |
| `src/app/api/scadenzario/route.ts` · `[cliente_id]/route.ts` · `(app)/scadenzario/[cliente_id]/page.tsx` | **modifica** — la catena di trasporto | 4 |
| `src/components/features/scadenzario/EstrattoContoView.tsx` · `ScadenzarioList.tsx` | **modifica** — 3 chiamate | 4 |
| `tests/unit/whatsapp-legge-il-cellulare.test.ts` | **crea** — i cinque punti leggono il campo giusto | 4 |
| `src/components/ds/Campo.tsx` | **modifica** — `aiuto?` e `inputMode?`, **entrambe opzionali** | 5 |
| `tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx` | **crea** | 5 |
| `docs/design/mockups/2026-08-03-p31-due-numeri.html` | **crea** — §0B | 6 |
| `src/components/features/clienti/ClienteEditSheet.tsx` | **modifica** — campo nuovo + etichetta corretta | 7 |
| `src/components/features/wizard/NuovoDentistaSheet.tsx` | **modifica** — da 4 a 5 campi (D184) | 7 |
| `src/components/features/lavori/consegna-v3/FrameConsegnato.tsx` | **modifica** — il tasto che chiede (D183) | 8 |
| `src/components/features/lavori/consegna-v3/ChiediCellulareSheet.tsx` | **crea** — il foglio a un campo | 8 |

---

# Compito 1 — La colonna

**File:**
- Crea: `supabase/migrations/<timestamp>_p31_cellulare_whatsapp.sql`
- Rigenera: `src/types/database.types.ts`
- Modifica: `supabase/schema.sql` (il commento della riga 372 dice il falso)

**Interfacce:**
- Produce: la colonna `clienti.cellulare_whatsapp` di tipo `TEXT` (annullabile), e il tipo generato
  `Database['public']['Tables']['clienti']['Row']['cellulare_whatsapp']: string | null`.

- [ ] **Passo 1 — Prendi il timestamp dall'orologio, non dall'ultimo file**

```bash
date -u "+%Y%m%dT%H%M%S"
```

🛑 **D155/§0F: la data si legge dall'orologio.** L'ultima migration si chiama `20260804120000_*` per la
vecchia deriva di date: **copiarne il numero manderebbe la migration nel futuro**.

- [ ] **Passo 2 — Scrivi la migration**

```sql
-- ============================================================
-- P31 — Il telefono dello studio e il cellulare WhatsApp sono
-- due dati diversi con lo stesso nome (D181, 03/08/2026).
--
-- `telefono` RESTA il numero dello studio: e' quello che si
-- chiama, quello che va sui documenti, e puo' essere un fisso.
-- provato: l'unico numero in banca dati e' un fisso (0976...),
--          quindi quella colonna si comporta gia' cosi'.
-- Nasce `cellulare_whatsapp`: dove arrivano consegna e solleciti.
--
-- Nessun backfill: cellulare_whatsapp nasce NULL per tutti, ed
-- e' corretto — nessuno l'ha mai inserito.
--
-- Nessun CHECK sul formato: un vincolo renderebbe NON SALVABILE
-- un numero scritto male, contro la direttiva permanente del
-- 27/07 («ogni campo si corregge, fino alla consegna»). La forma
-- si sistema quando si costruisce il link, non quando si salva.
-- ============================================================

ALTER TABLE public.clienti ADD COLUMN cellulare_whatsapp TEXT;

COMMENT ON COLUMN public.clienti.telefono IS
  'Telefono dello studio: si chiama, va sui documenti. Può essere un fisso. NON è il numero WhatsApp — v. cellulare_whatsapp (P31, D181).';

COMMENT ON COLUMN public.clienti.cellulare_whatsapp IS
  'Cellulare su cui il dentista riceve i messaggi (consegna, solleciti). Il prefisso internazionale lo aggiunge il codice, non l''utente (P31, D182).';
```

> 🔧 **CORRETTO il 03/08 dalla revisione del compito 1, e il difetto era di questo piano.** La prima
> stesura scriveva `Puo''` e `e''` dentro la stringa di `COMMENT ON`, credendo che l'accento andasse
> raddoppiato come l'apostrofo. **È falso:** in SQL due apici consecutivi valgono **un apostrofo
> letterale**, quindi `Puo''` finisce nel database come `Puo'`, non come `Può`. L'accento non ha
> bisogno di alcun escaping. `provato:` `supabase/migrations/20260803090000_*.sql` — stessa cartella,
> stesso giorno — usa l'accento **vero** non raddoppiato accanto a un apostrofo **correttamente**
> raddoppiato (`dell''emissione`). 🔑 **Solo l'apostrofo si raddoppia, mai la lettera accentata.**

`non eseguito` — verifica al passo 3.

- [ ] **Passo 3 — Applica e verifica che la colonna ci sia DAVVERO**

```bash
npx supabase migration up
```

Poi, **una sonda che non si accontenta del «riuscito»**:

```bash
npx tsx -e "
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
db.from('clienti').select('id, telefono, cellulare_whatsapp').limit(1)
  .then(({ data, error }) => { if (error) { console.error('ROSSO:', error.message); process.exit(1) } ; console.log('VERDE — la colonna risponde:', Object.keys(data![0])) })
"
```

Atteso: `VERDE — la colonna risponde: [ 'id', 'telefono', 'cellulare_whatsapp' ]`
🔑 **Una migration che gira non prova che la colonna sia interrogabile.** Questa lo prova.

- [ ] **Passo 4 — FASE 6b: rigenera i tipi**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
```

⚠️ Rimuovi l'eventuale messaggio della CLI in fondo al file (`../CLAUDE.md` §9).

- [ ] **Passo 5 — Verifica i tipi**

```bash
npx tsc --noEmit
```

Atteso: **0 errori**. Se ne compaiono, sono punti che leggono `clienti` con un tipo esatto: **si
riferiscono, non si correggono qui** (R-E2) — a meno che siano nel perimetro dei compiti 3-8.

- [ ] **Passo 6 — Allinea `supabase/schema.sql`**

Riga 372: il commento dice `-- Usato per WhatsApp`, **che da adesso è falso**.

```sql
  telefono          TEXT,               -- Telefono dello STUDIO: si chiama, va sui documenti. Puo' essere un fisso. NON e' WhatsApp (P31, D181)
  cellulare_whatsapp TEXT,              -- Cellulare per consegna e solleciti. Il prefisso lo mette il codice (P31, D182)
  email             TEXT,
```

- [ ] **Passo 7 — Salva**

```bash
git add supabase/migrations supabase/schema.sql src/types/database.types.ts
git commit -m "feat(db): P31 — nasce clienti.cellulare_whatsapp, e telefono torna a dire la verita'"
```

---

# Compito 2 — Il prefisso, in un posto solo

**File:**
- Modifica: `src/lib/consegna/whatsapp-template.ts` (aggiunta accanto a `buildWhatsappUrl`, riga 35)
- Crea: `tests/unit/numero-per-whatsapp.test.ts`

**Interfacce:**
- Produce: `export function numeroPerWhatsapp(grezzo: string | null | undefined): string | null`
  — restituisce **solo cifre in formato internazionale**, oppure `null` se non c'è un numero usabile.

- [ ] **Passo 1 — Scrivi le prove che falliscono**

```ts
// tests/unit/numero-per-whatsapp.test.ts
import { describe, it, expect } from 'vitest'
import { numeroPerWhatsapp } from '@/lib/consegna/whatsapp-template'

describe('numeroPerWhatsapp — prepara un numero per wa.me (P31, D182)', () => {
  it('il caso normale: cellulare italiano come lo scrive chiunque', () => {
    expect(numeroPerWhatsapp('333 1234567')).toBe('393331234567')
  })

  it("rispetta il + gia' presente", () => {
    expect(numeroPerWhatsapp('+39 333 1234567')).toBe('393331234567')
  })

  it('il fisso vero in banca dati', () => {
    expect(numeroPerWhatsapp('0976 71439')).toBe('39097671439')
  })

  it('un + straniero SI RISPETTA — non si italianizza', () => {
    expect(numeroPerWhatsapp('+33 6 12 34 56 78')).toBe('33612345678')
  })

  it('la forma internazionale con 00', () => {
    expect(numeroPerWhatsapp('00 39 333 1234567')).toBe('393331234567')
  })

  // 🔑 IL CASO CHE SMONTA «comincia per 39»: 391 e' un prefisso di
  //    cellulare italiano (Wind). 10 cifre -> e' NAZIONALE.
  it("un cellulare 391… senza prefisso e' NAZIONALE, non internazionale", () => {
    expect(numeroPerWhatsapp('391 2345678')).toBe('393912345678')
  })

  // ...e il verso opposto: 11 cifre che cominciano per 39 -> gia' internazionale
  it("un fisso gia' internazionale resta intatto", () => {
    expect(numeroPerWhatsapp('39 0976 71439')).toBe('39097671439')
  })

  it.each([null, undefined, '', '   ', '---', '()'])('senza un numero usabile da null: %s', (v) => {
    expect(numeroPerWhatsapp(v as string | null | undefined)).toBeNull()
  })
})
```

- [ ] **Passo 2 — Falle girare, devono fallire**

```bash
npx vitest run tests/unit/numero-per-whatsapp.test.ts
```

Atteso: **FAIL**, `numeroPerWhatsapp is not a function`.

- [ ] **Passo 3 — R-P4: abbozzo INERTE, e CONTA quante asserzioni si accendono**

Metti un abbozzo che non fa niente:

```ts
export function numeroPerWhatsapp(_grezzo: string | null | undefined): string | null {
  return null
}
```

```bash
npx vitest run tests/unit/numero-per-whatsapp.test.ts
```

**Scrivi il numero nel rapporto:** atteso **7 su 13** si accendono (le 6 del caso `null` passano già
con l'abbozzo — e questo è il punto: **un rosso da «funzione non trovata» non prova che le prove
provino qualcosa**).

- [ ] **Passo 4 — Scrivi la funzione**

```ts
/**
 * Prepara un numero per wa.me: solo cifre, in formato internazionale.
 *
 * 🔑 PERCHE' ESISTE (P31, D182). `buildWhatsappUrl` faceva solo
 * `replace(/\D/g,'')`, e NESSUN punto del programma aggiungeva il 39:
 * un cellulare italiano scritto come lo scrive chiunque («333 1234567»)
 * produceva un link senza prefisso paese.
 *
 * 🛑 LA SOGLIA DELLE 11 CIFRE non e' arbitraria: esiste un prefisso di
 * cellulare italiano che COMINCIA per 39 (391…, Wind), quindi
 * «comincia per 39» non basta a dire «e' gia' internazionale».
 * I numeri nazionali italiani non superano le 10 cifre, e i fissi
 * cominciano per 0, mai per 39.
 *
 * 🛑 COSA NON FA: non valida che il numero sia raggiungibile, non
 * distingue fisso da cellulare, non rifiuta niente. Prepara una stringa.
 * ⚠️ Un numero STRANIERO scritto SENZA il «+» viene trattato da
 * italiano: limitazione dichiarata (in banca dati non ci sono clienti
 * stranieri), e la strada e' chiedere il «+», non indovinare.
 */
export function numeroPerWhatsapp(grezzo: string | null | undefined): string | null {
  if (!grezzo) return null
  const conPiu = grezzo.trim().startsWith('+')
  const cifre = grezzo.replace(/\D/g, '')
  if (!cifre) return null

  if (conPiu) return cifre                                  // il paese e' dichiarato: si rispetta
  if (cifre.startsWith('00')) return cifre.slice(2)          // forma internazionale con 00
  if (cifre.startsWith('39') && cifre.length >= 11) return cifre  // gia' internazionale
  return `39${cifre}`                                        // nazionale italiano
}
```

- [ ] **Passo 5 — Verde**

```bash
npx vitest run tests/unit/numero-per-whatsapp.test.ts
```

Atteso: **13 passed**.

- [ ] **Passo 6 — `buildWhatsappUrl` usa la funzione nuova**

```ts
export function buildWhatsappUrl(message: string, phone?: string): string {
  const encoded = encodeURIComponent(message)
  const numero = numeroPerWhatsapp(phone)
  return numero ? `https://wa.me/${numero}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}
```

🔑 **Si corregge ALLA FONTE**, non nei cinque chiamanti — è la forma della correzione di **P11**.

- [ ] **Passo 7 — Tutta la suite, non solo il file nuovo**

```bash
npx vitest run
```

⚠️ **Prove esistenti su `buildWhatsappUrl` possono diventare rosse**, ed è **atteso**: pretendevano il
numero senza prefisso. 🛑 **Prima di cambiarne una, leggila:** se afferma «il link contiene il numero
com'era scritto», stava **fotografando** il comportamento vecchio (lezione ④ della notte). Aggiornala
al comportamento voluto e **scrivi nel commit quante ne hai toccate**.

- [ ] **Passo 8 — Salva**

```bash
git add src/lib/consegna/whatsapp-template.ts tests/unit/numero-per-whatsapp.test.ts
git commit -m "feat(whatsapp): P31 — il prefisso internazionale lo mette UA', in un posto solo"
```

---

# Compito 3 — Le due allowlist

**File:**
- Modifica: `src/app/api/clienti/[id]/route.ts:16-23`
- Modifica: `src/app/api/clienti/route.ts:125`
- Crea: `tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts`

**Interfacce:**
- Consuma: la colonna del compito 1.
- Produce: `PATCHABLE_FIELDS_CLIENTE` contiene `'cellulare_whatsapp'`; il POST accetta il campo.

- [ ] **Passo 1 — La prova del VINCOLO, che è il punto (R-P1)**

Una prova che il campo si salva è metà. **Serve la prova che un campo FUORI allowlist NON si salva** —
altrimenti non si sta provando l'allowlist, si sta provando che l'oggetto passa.

```ts
// tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts
import { describe, it, expect } from 'vitest'
import { PATCHABLE_FIELDS_CLIENTE } from '@/app/api/clienti/[id]/route'

describe('allowlist PATCH cliente (P31, R-P6)', () => {
  it('contiene il campo nuovo — senza, la rotta scarta la chiave SENZA errore', () => {
    expect(PATCHABLE_FIELDS_CLIENTE).toContain('cellulare_whatsapp')
  })

  it('contiene ancora il telefono dello studio', () => {
    expect(PATCHABLE_FIELDS_CLIENTE).toContain('telefono')
  })

  // 🔑 IL VALORE CHE DEVE ESSERE RIFIUTATO — senza questa riga la prova
  //    sopra passerebbe anche con un'allowlist che accetta tutto.
  it('NON contiene un campo che non deve essere modificabile dal browser', () => {
    expect(PATCHABLE_FIELDS_CLIENTE).not.toContain('portale_token')
    expect(PATCHABLE_FIELDS_CLIENTE).not.toContain('laboratorio_id')
    expect(PATCHABLE_FIELDS_CLIENTE).not.toContain('id')
  })
})
```

- [ ] **Passo 2 — Rosso**

```bash
npx vitest run tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts
```

Atteso: **1 fallita** (`toContain('cellulare_whatsapp')`), **2 passate**. 🔑 **Che le altre due passino
già è informazione**: dicono che l'allowlist era sana prima, quindi la rossa isola il cambiamento.

- [ ] **Passo 3 — Aggiungi il campo all'allowlist**

```ts
export const PATCHABLE_FIELDS_CLIENTE = [
  'studio_nome', 'nome', 'cognome', 'telefono', 'cellulare_whatsapp', 'email',
  'partita_iva', 'codice_fiscale', 'codice_sdi', 'pec',
  'indirizzo', 'cap', 'citta', 'provincia', 'paese',
  'listino_numero', 'sconto_percentuale', 'tecnico_default_id',
  'modalita_pagamento', 'non_soggetto_fe', 'fatturare_al_paziente',
  'laboratorio_odontotecnico', 'iban', 'note',
] as const
```

- [ ] **Passo 4 — La creazione (POST)**

`src/app/api/clienti/route.ts:125`, subito dopo `telefono`:

```ts
    telefono: body.telefono ?? null,
    cellulare_whatsapp: body.cellulare_whatsapp ?? null,
```

- [ ] **Passo 5 — `CAMPI_ELENCO` NON si tocca, e la ragione va scritta**

`src/app/api/clienti/route.ts:9-17` — **si aggiunge solo un commento**, nessun campo:

```ts
/** I campi che questo ELENCO può mostrare. Vive in un posto solo perché serve
 *  due volte — per chiedere al database e per rispondere al browser — e due
 *  copie divergerebbero.
 *  🛑 `portale_token` NON è qui, e non ci torna: v. il commento in `select`.
 *  🛑 `cellulare_whatsapp` NON è qui, ed è una SCELTA (P31, spec §4.4):
 *     l'elenco mostra UN numero sotto ogni studio, ed è quello da CHIAMARE.
 *     Due numeri in una riga d'elenco sono rumore su una schermata fatta per
 *     TROVARE un cliente, non per contattarlo. Il cellulare si vede sulla
 *     scheda. Se un giorno servisse qui, questa riga è il punto da cambiare. */
```

- [ ] **Passo 6 — Verde, e la suite intera**

```bash
npx vitest run tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts && npx vitest run && npx tsc --noEmit
```

- [ ] **Passo 7 — Salva**

```bash
git add src/app/api/clienti tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts
git commit -m "feat(api): P31 — il campo nuovo entra nelle allowlist, e quella dell'elenco porta la sua ragione"
```

---

# Compito 4 — I cinque punti WhatsApp e la catena di trasporto

🛑 **UN COMPITO SOLO, e non si spezza.** Se la colonna esiste e questi restano a leggere `telefono`, la
separazione vive nello schema e il difetto vive nel programma.

**File:**
- Modifica: `src/types/domain.ts:633-647` · `src/lib/consegna/orchestrate.ts` (`:117`, `:131`, `:353-357`, `:364`, e l'oggetto di ritorno) · `src/app/api/scadenzario/route.ts` (`:34`, `:48`, `:69`) · `src/app/api/scadenzario/[cliente_id]/route.ts` (`:15`, `:52`, `:79`) · `src/app/(app)/scadenzario/[cliente_id]/page.tsx` (`:29`, `:45`) · `src/components/features/scadenzario/EstrattoContoView.tsx` (`:27`, `:38`, `:224`, `:349`) · `src/components/features/scadenzario/ScadenzarioList.tsx` (`:85`)
- Crea: `tests/unit/whatsapp-legge-il-cellulare.test.ts`

**Interfacce:**
- Consuma: `numeroPerWhatsapp` (compito 2), la colonna (compito 1).
- Produce: `ConsegnaResult.cliente_id: string` — **usato dal compito 8**.

- [ ] **Passo 1 — Le prove: i cinque punti leggono il campo giusto**

```ts
// tests/unit/whatsapp-legge-il-cellulare.test.ts
import { describe, it, expect } from 'vitest'
import { buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'

describe('P31 — chi manda WhatsApp legge il CELLULARE, non il telefono dello studio', () => {
  // Il caso vero in banca dati: fisso nello studio, cellulare separato.
  const cliente = { telefono: '0976 71439', cellulare_whatsapp: '333 1234567' }

  it('il link si costruisce col cellulare, non col fisso', () => {
    const url = buildWhatsappUrl('ciao', cliente.cellulare_whatsapp)
    expect(url).toContain('wa.me/393331234567')
    expect(url).not.toContain('097671439')
  })

  it('senza cellulare il link resta SENZA destinatario, e non ripiega sul fisso', () => {
    const url = buildWhatsappUrl('ciao', undefined)
    expect(url).toBe('https://wa.me/?text=ciao')
    expect(url).not.toContain('097671439')
  })
})
```

🔑 **La seconda prova è quella che conta.** Un ripiego «se manca il cellulare uso il telefono» sembra
gentile ed è **esattamente il difetto di P31 rimesso dentro**: manderebbe di nuovo su un fisso.

- [ ] **Passo 2 — Rosso? No: verificare che sia VERDE, e capire perché**

```bash
npx vitest run tests/unit/whatsapp-legge-il-cellulare.test.ts
```

Atteso: **2 passate** già adesso. 🛑 **Questa prova NON protegge da sola** — misura
`buildWhatsappUrl`, che è già corretta dal compito 2. Serve come **rete contro il ripiego**, e la
protezione vera sono i passi 3-8: le prove esistenti sui chiamanti.

- [ ] **Passo 3 — `ConsegnaResult` porta l'id del cliente**

`src/types/domain.ts`, dentro `ConsegnaResult`, dopo `lavoro_id`:

```ts
export interface ConsegnaResult {
  ok: true;
  lavoro_id: string;
  /** Id del cliente a cui è andato il lavoro. Serve al tasto WhatsApp per
   *  salvare il cellulare quando manca (P31, D183): senza, la schermata
   *  della consegna non sa a chi salvarlo. Additivo — nessun consumatore
   *  preesistente si rompe. */
  cliente_id: string;
  numero_lavoro: string;
```

- [ ] **Passo 4 — `orchestrate.ts`, percorso «già consegnato» (righe ~115-152)**

La `select` di riga 117 e la lettura di riga 122-123:

```ts
      .select('numero_lavoro, buono_pdf_url, buono_numero, cliente:clienti(id, telefono, cellulare_whatsapp, cognome, portale_token)')
```

```ts
    const clienteRec = lavoro?.cliente as unknown as {
      id?: string
      cellulare_whatsapp?: string | null
      portale_token?: string | null
    } | null
    // P31: il messaggio va sul CELLULARE. Nessun ripiego sul telefono dello
    // studio: sarebbe il difetto di P31 rimesso dentro.
    const clienteCell = clienteRec?.cellulare_whatsapp ?? ''
    const portaleToken = clienteRec?.portale_token ?? ''
```

E la chiamata di riga 131:

```ts
    const waUrl = buildWhatsappUrl(waMessage, clienteCell || undefined)
```

Nell'oggetto di ritorno (riga ~145-152), accanto a `lavoro_id`:

```ts
      cliente_id: clienteRec?.id ?? '',
```

- [ ] **Passo 5 — `orchestrate.ts`, percorso normale (righe ~350-372)**

Stessa cosa. La `select` che carica `lavoro.cliente` va trovata **risalendo da riga 353** e deve
nominare `id` e `cellulare_whatsapp`.

```ts
    const clienteContattoRaw = lavoro.cliente as unknown as {
      id?: string | null
      cellulare_whatsapp?: string | null
      portale_token?: string | null
    } | null

    const clienteCell = clienteContattoRaw?.cellulare_whatsapp ?? ''
    const portaleToken = clienteContattoRaw?.portale_token ?? ''
```

```ts
    const waUrl = buildWhatsappUrl(waMessage, clienteCell || undefined)
```

E `cliente_id: clienteContattoRaw?.id ?? ''` nell'oggetto di ritorno.

🛑 **Se la `select` a monte non nomina `id` e `cellulare_whatsapp`, arrivano `undefined` e NON c'è
errore.** Aprire quella `select` e verificarla è parte del passo, non un extra.

- [ ] **Passo 6 — La catena di trasporto dello scadenzario (sei punti)**

`src/app/api/scadenzario/route.ts` — il tipo (`:34`) e **due** `select` (`:48`, `:69`):

```ts
    telefono: string | null
    cellulare_whatsapp: string | null
```

```ts
    .select('id, numero, data, totale, importo_pagato, stato_sdi, pagata, cliente:clienti(id, nome, cognome, studio_nome, telefono, cellulare_whatsapp)')
```

```ts
      cliente:clienti(id, nome, cognome, studio_nome, telefono, cellulare_whatsapp),
```

`src/app/api/scadenzario/[cliente_id]/route.ts` — il tipo (`:15`), la `select` (`:52`), la mappatura (`:79`):

```ts
    cellulare_whatsapp: string | null
```

```ts
    .select('id, nome, cognome, studio_nome, telefono, cellulare_whatsapp, indirizzo, cap, citta')
```

```ts
      cellulare_whatsapp: clienteRow.cellulare_whatsapp,
```

`src/app/(app)/scadenzario/[cliente_id]/page.tsx` — `select` (`:29`) e mappatura (`:45`): **identiche
alle due righe qui sopra**.

- [ ] **Passo 7 — I tre punti dello scadenzario**

`ScadenzarioList.tsx:85`:

```ts
  // P31: il sollecito va sul cellulare. Niente ripiego sul fisso dello studio.
  const whatsappUrl = buildWhatsappUrl(whatsappMsg, item.cliente.cellulare_whatsapp ?? undefined)
```

`EstrattoContoView.tsx:223-224` (sollecito globale):

```ts
  const whatsappUrlGlobale = dati.cliente.cellulare_whatsapp
    ? buildWhatsappUrl(whatsappMsgGlobale, dati.cliente.cellulare_whatsapp)
    : null
```

`EstrattoContoView.tsx` — **il punto che il primo censimento non aveva**: `DovutoBottomSheet`, definito
nello stesso file. Riga 27 (il tipo della prop), riga 33 (la firma), riga 38 (la chiamata), riga 108 (il
tasto), riga 349 (il passaggio). **Rinominare la prop da `telefono` a `cellulare`** rende impossibile
passarle il campo sbagliato:

```ts
// riga 27 — il tipo
  cellulare: string | null
// riga 33 — la firma
function DovutoBottomSheet({ dovuto, cellulare, studioNome, onClose, onRegistraPagamento }: BottomSheetProps) {
// riga 38 — la chiamata
  const whatsappUrl = (dovuto && cellulare && !dovuto.pagata) ? buildWhatsappUrl(whatsappMsg, cellulare) : ''
// riga 108 — il tasto
              {cellulare && !dovuto.pagata && (
// riga 349 — il passaggio
        cellulare={dati.cliente.cellulare_whatsapp}
```

🔑 **Il rinominare non è cosmesi:** una prop chiamata `telefono` che deve ricevere il cellulare è
esattamente il modo in cui P31 è nata.

- [ ] **Passo 8 — Verifica che i punti «da chiamare» NON siano stati toccati**

```bash
grep -n "cliente.telefono\|clienteRow.telefono" src/components/features/scadenzario/ClienteInfoCard.tsx "src/app/(app)/clienti/[id]/page.tsx" src/components/features/clienti/ClientiSearchList.tsx
```

Atteso: **le tre letture ci sono ancora**. 🔑 **Questa è la prova che il cambiamento è mirato**: se
sparissero, sarebbe stato sostituito ovunque invece che dove serve.

- [ ] **Passo 9 — FASE 7 parziale**

```bash
npx tsc --noEmit && npx vitest run && npx next build
```

⚠️ Prove esistenti sulla consegna e sullo scadenzario possono diventare rosse: **leggile prima di
toccarle** — una che pretende il telefono dello studio nel link WhatsApp **fotografava il difetto**.

- [ ] **Passo 10 — Salva**

```bash
git add src/types/domain.ts src/lib/consegna/orchestrate.ts src/app/api/scadenzario "src/app/(app)/scadenzario" src/components/features/scadenzario tests/unit/whatsapp-legge-il-cellulare.test.ts
git commit -m "feat(whatsapp): P31 — i cinque punti WhatsApp leggono il cellulare, e la catena di trasporto lo porta fin li'"
```

---

# Compito 5 — Il campo condiviso impara due cose

**File:**
- Modifica: `src/components/ds/Campo.tsx:57-95` (`CampoTesto`)
- Crea: `tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx`

**Interfacce:**
- Produce: `CampoTesto` accetta `aiuto?: string` e `inputMode?: 'tel'` — **entrambe opzionali**.

🛑 **`CampoTesto` è usato da 13 schermate.** Dove non si passa nulla, **non deve cambiare niente**.

- [ ] **Passo 1 — Le prove**

```tsx
// tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CampoTesto } from '@/components/ds/Campo'

describe('CampoTesto — aiuto e tastiera (P31, D184)', () => {
  it('senza aiuto non rende nessun testo in piu', () => {
    const { container } = render(<CampoTesto label="Nome" valore="" onCambia={() => {}} />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('con aiuto lo rende, e lo LEGA all-input per chi usa un lettore di schermo', () => {
    render(<CampoTesto label="Cellulare WhatsApp" valore="" onCambia={() => {}}
                       aiuto="Qui arrivano i messaggi di consegna. Dev'essere un cellulare, non il fisso." />)
    const input = screen.getByLabelText('Cellulare WhatsApp')
    const idAiuto = input.getAttribute('aria-describedby')
    expect(idAiuto).toBeTruthy()
    expect(document.getElementById(idAiuto!)?.textContent).toContain('cellulare')
  })

  it('senza inputMode resta come prima: nessun inputMode imposto', () => {
    render(<CampoTesto label="Nome" valore="" onCambia={() => {}} />)
    expect(screen.getByLabelText('Nome').getAttribute('inputmode')).toBeNull()
  })

  // 🔑 Su una PWA da telefono: per un numero deve uscire il tastierino,
  //    non la tastiera delle lettere.
  it('con inputMode tel chiede al telefono il tastierino', () => {
    render(<CampoTesto label="Telefono" valore="" onCambia={() => {}} inputMode="tel" />)
    expect(screen.getByLabelText('Telefono').getAttribute('inputmode')).toBe('tel')
  })
})
```

- [ ] **Passo 2 — Rosso**

```bash
npx vitest run tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx
```

Atteso: **2 fallite** (aiuto, inputMode), **2 passate** (i due casi «senza»). 🔑 **Le due che passano
sono la rete di non-regressione per le altre 13 schermate**, e passano *prima* del cambiamento: è
quello che le rende credibili.

- [ ] **Passo 3 — Il componente**

```tsx
export function CampoTesto(props: {
  label: string
  valore: string
  onCambia: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  /** Riga sotto il campo che spiega a che cosa serve (P31, D184). Legata
   *  all'input con `aria-describedby`. Opzionale: senza, non cambia niente
   *  per le 13 schermate che usavano questo campo prima. */
  aiuto?: string
  /** Tastiera da chiedere al telefono. `'tel'` fa uscire il tastierino
   *  numerico: su una PWA da telefono, per un numero, la tastiera delle
   *  lettere è un attrito reale. Stesso motivo per cui `CampoNumero` usa
   *  `inputMode="decimal"`. */
  inputMode?: 'tel'
}) {
  const { label, valore, onCambia, placeholder, autoFocus = false, aiuto, inputMode } = props
  const id = useId()
  const idAiuto = `${id}-aiuto`

  return (
    <div>
      <style>{`
        .ds-campo-testo:focus {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <label htmlFor={id} style={stileLabel}>
        {label}
      </label>
      <input
        id={id}
        className="ds-campo-testo"
        type="text"
        inputMode={inputMode}
        aria-describedby={aiuto ? idAiuto : undefined}
        value={valore}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onCambia(e.target.value)}
        style={stileCampo()}
      />
      {aiuto && (
        <p id={idAiuto} style={stileAiuto}>
          {aiuto}
        </p>
      )}
    </div>
  )
}
```

E lo stile, accanto a `stileLabel`:

```ts
/** L'aiuto sotto un campo. `--muted` e NON `--faint`: dentro un foglio in
 *  tema scuro `--faint` scende a 4,25:1, sotto il 4,5 che WCAG 1.4.3 chiede
 *  a un testo piccolo (è P30-bis, difetto già aperto — qui lo si evita, non
 *  lo si corregge). E non è un messaggio d'errore: mai un colore semantico. */
const stileAiuto: CSSProperties = {
  margin: '6px 0 0',
  fontSize: 13,
  lineHeight: 1.35,
  color: 'var(--muted)',
}
```

- [ ] **Passo 4 — Verde, e le 13 schermate non si accorgono di niente**

```bash
npx vitest run tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx && npx vitest run && npx tsc --noEmit
```

- [ ] **Passo 5 — Salva**

```bash
git add src/components/ds/Campo.tsx tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx
git commit -m "feat(ds): CampoTesto impara l'aiuto e la tastiera del telefono (P31, D184)"
```

---

# Compito 6 — I disegni, prima del React (§0B)

🛑 **Nessuna riga di React sulle schermate prima dell'approvazione di Francesco.**

**File:**
- Crea: `docs/design/mockups/2026-08-03-p31-due-numeri.html`
- Crea: `docs/design/mockups/screenshots/2026-08-03-p31/` (12 scatti)

- [ ] **Passo 1 — Il disegno, con dati veri simulati**

Due fogli, uno accanto all'altro:
- **il wizard «nuovo dentista»** con **cinque** campi (Nome · Cognome · Telefono dello studio ·
  Cellulare WhatsApp **con l'aiuto sotto** · Studio);
- **il foglio della consegna** che chiede il cellulare (compito 8), un campo solo.

🛑 **Copia le misure VERE dai componenti**, non a occhio: `CampoTesto` per il campo, `stileLabel` per
l'etichetta, `TastoPrimario` per il tasto. 🔑 **Un disegno che non copia le misure vere mente in due
direzioni** — inventa difetti che non ci sono e ne nasconde di veri (lezione ② della notte).

- [ ] **Passo 2 — Gli scatti: 3 formati × 2 temi × 2 fogli**

390 · 768 · 1280 px, chiaro **e** scuro. **12 scatti**, in
`docs/design/mockups/screenshots/2026-08-03-p31/`.

- [ ] **Passo 3 — Misura i contrasti, non dichiararli**

Ogni testo del disegno, col suo rapporto. ⚠️ **Attenzione all'aiuto in tema scuro:** `--muted` su
`--elv` deve stare **sopra 4,5**. Se una misura sorprende, **smontala prima di crederle** — il
componente vero potrebbe avere una dimensione diversa dal disegno (è successo tre volte in una notte).

- [ ] **Passo 4 — Porta gli scatti a Francesco e FERMATI**

Da approvare: il testo dell'aiuto · l'ordine dei cinque campi · che entrambi i numeri abbiano
**lo stesso peso** (D184: niente campo avanzato, niente sezione richiudibile, niente carattere più
piccolo).

- [ ] **Passo 5 — Scrivi la decisione**

`docs/design/decisions/` — variante scelta, testo approvato, scostamenti.

---

# Compito 7 — Le due schermate dell'anagrafica

⛔ **Non iniziare senza l'approvazione del compito 6.**

**File:**
- Modifica: `src/components/features/clienti/ClienteEditSheet.tsx` (`:15`, `:83`, `:132`, `:318-335`)
- Modifica: `src/components/features/wizard/NuovoDentistaSheet.tsx` (`:44`, `:74`, `:102-111`)

**Interfacce:**
- Consuma: `CampoTesto` con `aiuto` e `inputMode` (compito 5); l'allowlist (compito 3).

- [ ] **Passo 1 — Le prove sul wizard (D184)**

```tsx
// in tests/unit/NuovoDentistaSheet.test.tsx (il file esiste già)
it('D184 — chiede ENTRAMBI i numeri', () => {
  render(<NuovoDentistaSheet aperto onChiudi={() => {}} onCreato={() => {}} />)
  expect(screen.getByLabelText('Telefono dello studio')).toBeInTheDocument()
  expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
})

it('D184 — sotto il cellulare e scritto a che cosa serve', () => {
  render(<NuovoDentistaSheet aperto onChiudi={() => {}} onCreato={() => {}} />)
  const input = screen.getByLabelText('Cellulare WhatsApp')
  const idAiuto = input.getAttribute('aria-describedby')
  expect(document.getElementById(idAiuto!)?.textContent).toMatch(/consegna/i)
})

// 🔑 La prova che i due campi finiscono in DUE posti diversi: senza questa,
//    due campi che scrivono nella stessa colonna passerebbero.
it('i due numeri partono in due campi distinti del corpo della richiesta', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ id: 'x' }), { status: 201 }))
  render(<NuovoDentistaSheet aperto onChiudi={() => {}} onCreato={() => {}} />)
  await userEvent.type(screen.getByLabelText('Nome'), 'Mario')
  await userEvent.type(screen.getByLabelText('Cognome'), 'Rossi')
  await userEvent.type(screen.getByLabelText('Telefono dello studio'), '02 1234567')
  await userEvent.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
  await userEvent.click(screen.getByRole('button', { name: /crea dentista/i }))
  const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
  expect(body.telefono).toBe('02 1234567')
  expect(body.cellulare_whatsapp).toBe('333 1234567')
})
```

- [ ] **Passo 2 — Rosso**

```bash
npx vitest run tests/unit/NuovoDentistaSheet.test.tsx
```

Atteso: **3 fallite**. ⚠️ Prove esistenti che cercano «Cellulare/WhatsApp» diventano rosse: **è il
cambiamento voluto** — quella etichetta stava su un campo che scriveva in `telefono`.

- [ ] **Passo 3 — Il wizard, da 4 campi a 5**

```tsx
      <CampoTesto label="Nome" valore={nome} onCambia={setNome} placeholder="Mario" autoFocus />
      <CampoTesto label="Cognome" valore={cognome} onCambia={setCognome} placeholder="Rossi" />
      <CampoTesto
        label="Telefono dello studio"
        valore={telefonoStudio}
        onCambia={setTelefonoStudio}
        placeholder="02 1234567"
        inputMode="tel"
      />
      <CampoTesto
        label="Cellulare WhatsApp"
        valore={cellulare}
        onCambia={setCellulare}
        placeholder="333 1234567"
        inputMode="tel"
        aiuto="Qui arrivano i messaggi di consegna. Dev'essere un cellulare, non il fisso."
      />
      <CampoTesto label="Studio" valore={studio} onCambia={setStudio} placeholder="Studio Rossi" />
```

Gli stati (riga 44) e l'invio (riga 74):

```tsx
  const [telefonoStudio, setTelefonoStudio] = useState('')
  const [cellulare, setCellulare] = useState('')
```

```tsx
    if (telefonoStudio.trim()) body.telefono = telefonoStudio.trim()
    if (cellulare.trim()) body.cellulare_whatsapp = cellulare.trim()
```

🛑 **Entrambi restano facoltativi**: il vincolo di creazione è su nome e cognome, e questa ondata non
lo cambia.

- [ ] **Passo 4 — Il pannello di modifica**

Riga 15 (il tipo), 83 (lo stato iniziale), 132 (il salvataggio), 324-330 (i campi):

```tsx
  telefono: string | null
  cellulare_whatsapp: string | null
```

```tsx
    telefono: cliente.telefono ?? '',
    cellulare_whatsapp: cliente.cellulare_whatsapp ?? '',
```

```tsx
        telefono: form.telefono.trim() || null,
        cellulare_whatsapp: form.cellulare_whatsapp.trim() || null,
```

```tsx
                <FieldGroup label="Telefono dello studio">
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={set('telefono')}
                    placeholder="02 1234567"
                    style={inputStyle}
                  />
                </FieldGroup>
                <FieldGroup label="Cellulare WhatsApp">
                  <input
                    type="tel"
                    value={form.cellulare_whatsapp}
                    onChange={set('cellulare_whatsapp')}
                    placeholder="333 1234567"
                    style={inputStyle}
                  />
                </FieldGroup>
```

🛑 **L'esempio del telefono cambia da `+39 02 1234567` a `02 1234567`**: da D182 il prefisso lo mette
il programma, e suggerirlo insegnerebbe una regola che non serve più.
⚠️ **Questo pannello è v2.3, non v3** (usa `FieldGroup` e `inputStyle`, non `CampoTesto`): si resta su
v2.3, **mai** v3 per singolo componente. L'aiuto qui è una riga di testo con lo stile del file.

- [ ] **Passo 5 — Verde**

```bash
npx vitest run && npx tsc --noEmit
```

- [ ] **Passo 6 — Salva**

```bash
git add src/components/features/clienti/ClienteEditSheet.tsx src/components/features/wizard/NuovoDentistaSheet.tsx tests/unit/NuovoDentistaSheet.test.tsx
git commit -m "feat(clienti): P31 — le due schermate dell'anagrafica chiedono due numeri, e dicono a cosa servono"
```

---

# Compito 8 — Il tasto che chiede il numero (D183)

⛔ **Non iniziare senza l'approvazione del compito 6.**

**File:**
- Crea: `src/components/features/lavori/consegna-v3/ChiediCellulareSheet.tsx`
- Modifica: `src/components/features/lavori/consegna-v3/FrameConsegnato.tsx:123`
- Crea: `tests/unit/consegna-chiede-il-cellulare.test.tsx`

**Interfacce:**
- Consuma: `ConsegnaResult.cliente_id` (compito 4); `CampoTesto` con `aiuto`/`inputMode` (compito 5);
  `PATCH /api/clienti/[id]` con `cellulare_whatsapp` (compito 3).

- [ ] **Passo 1 — Le prove**

```tsx
// tests/unit/consegna-chiede-il-cellulare.test.tsx
describe('D183 — se il cellulare manca, il tasto lo chiede e lo salva', () => {
  it('col cellulare presente il tasto apre WhatsApp e NON chiede niente', async () => {
    render(<FrameConsegnato esito={{ ...esitoBase, whatsapp_url: 'https://wa.me/393331234567?text=x' }} />)
    await userEvent.click(screen.getByRole('link', { name: /invia messaggio whatsapp/i }))
    expect(screen.queryByLabelText('Cellulare WhatsApp')).not.toBeInTheDocument()
  })

  it('senza cellulare il tasto CI SIA LO STESSO e apra il foglio', async () => {
    render(<FrameConsegnato esito={{ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' }} />)
    const tasto = screen.getByRole('button', { name: /invia messaggio whatsapp/i })
    expect(tasto).toBeInTheDocument()
    await userEvent.click(tasto)
    expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
  })

  // 🔑 IL VINCOLO DI D183: si salva PRIMA di aprire WhatsApp.
  it('salva il numero PRIMA di aprire WhatsApp', async () => {
    const ordine: string[] = []
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      ordine.push('salvato'); return new Response('{}', { status: 200 })
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => { ordine.push('whatsapp'); return null })
    render(<FrameConsegnato esito={{ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' }} />)
    await userEvent.click(screen.getByRole('button', { name: /invia messaggio whatsapp/i }))
    await userEvent.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await userEvent.click(screen.getByRole('button', { name: /salva e invia/i }))
    expect(ordine).toEqual(['salvato', 'whatsapp'])
    expect(fetchSpy.mock.calls[0][0]).toContain(`/api/clienti/${esitoBase.cliente_id}`)
  })

  // 🔑 IL VALORE CHE DEVE ESSERE RIFIUTATO: se il salvataggio fallisce,
  //    WhatsApp NON si apre — o si separano i due fatti.
  it('se il salvataggio fallisce, WhatsApp NON si apre e lo dice', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<FrameConsegnato esito={{ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' }} />)
    await userEvent.click(screen.getByRole('button', { name: /invia messaggio whatsapp/i }))
    await userEvent.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await userEvent.click(screen.getByRole('button', { name: /salva e invia/i }))
    expect(openSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2 — Rosso**

```bash
npx vitest run tests/unit/consegna-chiede-il-cellulare.test.tsx
```

Atteso: **1 passata** (col cellulare, comportamento di oggi), **3 fallite**.

- [ ] **Passo 3 — Il foglio**

```tsx
// src/components/features/lavori/consegna-v3/ChiediCellulareSheet.tsx
'use client'
import { useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'

/**
 * D183 — alla consegna il cellulare WhatsApp può mancare. Il tasto non muore:
 * chiede il numero, lo salva in anagrafica, POI apre WhatsApp.
 *
 * 🛑 L'ORDINE È VINCOLANTE. Salvare dopo l'invio separa due fatti che devono
 * restare insieme: la consegna successiva richiederebbe lo stesso numero.
 */
export function ChiediCellulareSheet(props: {
  aperto: boolean
  clienteId: string
  onChiudi: () => void
  onSalvato: (cellulare: string) => void
}) {
  const { aperto, clienteId, onChiudi, onSalvato } = props
  const [cellulare, setCellulare] = useState('')
  const [invio, setInvio] = useState(false)
  const [guasto, setGuasto] = useState(false)

  async function salvaEInvia() {
    if (!cellulare.trim()) return
    setInvio(true); setGuasto(false)
    try {
      const res = await fetch(`/api/clienti/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellulare_whatsapp: cellulare.trim() }),
      })
      if (!res.ok) { setGuasto(true); setInvio(false); return }
      onSalvato(cellulare.trim())
    } catch {
      setGuasto(true); setInvio(false)
    }
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo="Manca il cellulare">
      <CampoTesto
        label="Cellulare WhatsApp"
        valore={cellulare}
        onCambia={setCellulare}
        placeholder="333 1234567"
        inputMode="tel"
        aiuto="Lo salvo nell'anagrafica del dentista: la prossima volta non te lo chiedo più."
        autoFocus
      />
      {guasto && (
        <p role="alert" style={{ margin: '10px 0 0', fontSize: 14.5, color: 'var(--red)' }}>
          Non sono riuscita a salvare il numero. Riprova.
        </p>
      )}
      <TastoPrimario onClick={salvaEInvia} disabled={invio || !cellulare.trim()}
                     motivoDisabilitato={invio ? 'Un attimo…' : 'Scrivi il cellulare'}>
        Salva e invia
      </TastoPrimario>
    </Sheet>
  )
}
```

⚠️ **Verifica le firme vere di `Sheet` e `TastoPrimario` prima di scrivere** (`src/components/ds/`): se
non combaciano, **si adatta questo codice**, non i componenti.

- [ ] **Passo 4 — `FrameConsegnato` sceglie fra tasto e foglio**

Riga 123. Il segnale che il cellulare manca è **nell'URL**: `https://wa.me/?text=…` senza cifre.

```tsx
const senzaDestinatario = esito.whatsapp_url.startsWith('https://wa.me/?')
```

```tsx
        <div style={{ marginTop: spazio.m, display: 'flex', justifyContent: 'center' }}>
          {senzaDestinatario ? (
            <TastoWhatsAppChiede onClick={() => setChiediAperto(true)} />
          ) : (
            <TastoWhatsApp waUrl={esito.whatsapp_url}>Invia messaggio WhatsApp</TastoWhatsApp>
          )}
        </div>
```

E il foglio, accanto a `DialogConferma`:

```tsx
      <ChiediCellulareSheet
        aperto={chiediAperto}
        clienteId={esito.cliente_id}
        onChiudi={() => setChiediAperto(false)}
        onSalvato={(cell) => {
          setChiediAperto(false)
          const numero = numeroPerWhatsapp(cell)
          const testo = esito.whatsapp_url.split('?text=')[1] ?? ''
          window.open(`https://wa.me/${numero}?text=${testo}`, '_blank', 'noopener,noreferrer')
        }}
      />
```

🛑 **`TastoWhatsApp` è un collegamento e rifiuta un `waUrl` che non comincia con `https://wa.me/`** (v.
il suo commento di sicurezza): per questo il caso «manca il numero» usa un **tasto**, non un
collegamento. Se `TastoWhatsAppChiede` non esiste, **si usa `TastoPrimario` con lo stesso testo** —
non si allenta il controllo di `TastoWhatsApp`.

- [ ] **Passo 5 — Verde, e FASE 7 intera**

```bash
npx vitest run tests/unit/consegna-chiede-il-cellulare.test.tsx && npx tsc --noEmit && npx vitest run && npx next build
```

- [ ] **Passo 6 — Salva**

```bash
git add src/components/features/lavori/consegna-v3 tests/unit/consegna-chiede-il-cellulare.test.tsx
git commit -m "feat(consegna): P31/D183 — il tasto WhatsApp chiede il cellulare che manca e lo salva PRIMA di inviare"
```

---

# Compito 9 — I cancelli, prima dell'unione

- [ ] **Passo 1 — FASE 7, tutti e tre**

```bash
npx tsc --noEmit && npx vitest run && npx next build
```

Incolla i tre esiti reali. ⚠️ `tsc` **non** valida le firme degli handler di rotta: solo `next build`
le vede.

- [ ] **Passo 2 — Le guardie**

```bash
node scripts/guardia-coerenza-documenti.mjs && node scripts/guardia-reduced-motion.mjs && bash scripts/check-csrf.sh && bash scripts/check-ds-compliance.sh && node scripts/guardia-progetti-playwright.mjs
```

🔑 **Guarda il NUMERO dei documenti vivi, non solo il colore** (P32: la guardia può uscire verde
avendo controllato niente).

- [ ] **Passo 3 — FASE 9: le schermate sui tre formati**

390 · 768 · 1280 px, chiaro e scuro: il wizard a 5 campi, il pannello di modifica, il foglio della
consegna. Bersagli tappabili **≥ 44 px**, misurati.

- [ ] **Passo 4 — FASE 9b: gate estetico L2**

`docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`, 12 sezioni × 3 formati × 2 temi, sulla **sola**
superficie di questa ondata. Ogni ❌ risolto o **deferito con motivo**. Scatti prima/dopo in
`docs/design/screenshots/2026-08-03-p31/`.

- [ ] **Passo 5 — Collaudo dal vivo (D103)**

Link monouso, e sul lavoro di prova: **il cliente senza cellulare** → il tasto chiede il numero → si
salva → l'anagrafica lo mostra. ⚠️ **Prima di consegnare per prova:** lo stato dev'essere
`pronto`/`in_ritardo` **e** non deve esistere una DdC con stato ≠ `annullata`, o il guard di idempotenza
restituisce la vecchia senza generare nulla. Finestra per annullare: **10 minuti**.

- [ ] **Passo 6 — Il vuoto dichiarato: provalo su un telefono vero**

🛑 **Spec §9.** Che cosa vede chi preme il tasto con un numero senza prefisso **non è mai stato
verificato** — la validazione avviene dentro WhatsApp, non sul server. **Con un telefono in mano si
chiude.** Se resta aperto, **si scrive che resta aperto**: non si dichiara provato ciò che non lo è.

- [ ] **Passo 7 — BP-1**

`memory/MEMORY.md` · `docs/roadmap/ROADMAP-UFFICIALE.md` (P31 → fatta) · `memory/SESSION_ACTIVE.md`.

---

## Autorevisione del piano

**Copertura della spec:** §3 → compito 1 · §4.1 → compiti 3 e 7 · §4.2 e §4.2-bis → compito 4 ·
§4.3 → compito 4 passo 8 (**si verifica che NON cambino**) · §4.4 → compito 3 passo 5 · §4.5 →
compiti 5, 6, 7 · §5 → compito 2 · §6 → compito 8 · §7 → prove dentro ogni compito + compito 9 ·
§8 → nulla da fare, per costruzione · §9 → compito 9 passo 6. **Nessuna sezione senza compito.**

**Segnaposto:** nessun «TBD», nessun «gestire i casi limite», nessun «come il compito N».

**Coerenza dei nomi:** `numeroPerWhatsapp` (compiti 2, 8) · `cellulare_whatsapp` (compiti 1, 3, 4, 7, 8)
· `ConsegnaResult.cliente_id` (compiti 4, 8) · `aiuto` e `inputMode` (compiti 5, 7, 8) ·
`ChiediCellulareSheet` (compito 8). **Un nome solo per cosa, in tutti i compiti.**

**Fuori perimetro, riferito e non corretto (R-E2):** `src/components/features/ordini/NuovoOrdineSheet.tsx:193`
costruisce un `wa.me` col telefono del **fornitore** senza prefisso — stesso difetto di §1③.
`provato:` **0 fornitori** in banca dati. **Merita una voce propria.**

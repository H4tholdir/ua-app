# Compito 4 — I SEI punti WhatsApp e la catena di trasporto

> **Questo è il tuo mandato completo.** I valori esatti (nomi, righe, codice) si usano **alla lettera**: sono stati verificati sul codice vero.

## Vincoli globali del progetto (valgono per ogni passo)

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

- [ ] **Passo 7-bis — 🆕 IL SESTO PUNTO, che il primo censimento non vedeva**

🛑 **Aggiunto il 03/08 dall'esecutore del compito 2 (R-E2).** `src/components/features/lavori/form/TabAccettazione.tsx:232`
manda un WhatsApp al cliente all'**accettazione in ingresso** («abbiamo ricevuto il lavoro»), ma
**costruisce il collegamento a mano** invece di usare `buildWhatsappUrl` — per questo il censimento
sulle chiamate a quella funzione non lo trovava.

`TabAccettazione.tsx:231-233` — oggi:

```tsx
  const whatsappUrl = clienteTelefono
    ? `https://wa.me/${clienteTelefono.replace(/\D/g, '')}?text=${encodeURIComponent(messaggioPreview)}`
    : ''
```

diventa:

```tsx
  // P31: passa dalla funzione condivisa, che aggiunge il prefisso internazionale
  // (D182). Costruire il link a mano qui era il motivo per cui questo punto non
  // compariva nel censimento delle chiamate a buildWhatsappUrl.
  const whatsappUrl = clienteCellulare
    ? buildWhatsappUrl(messaggioPreview, clienteCellulare)
    : ''
```

Rinomina la prop da `clienteTelefono` a `clienteCellulare` (tipo compreso), e in
`src/components/features/lavori/LavoroFormClient.tsx:152`:

```tsx
                  clienteCellulare={lavoro.cliente?.cellulare_whatsapp ?? null}
```

✅ **La catena di trasporto qui NON va toccata:** `provato:` `src/app/(app)/lavori/[id]/page.tsx:25` e
`.../modifica/page.tsx:46` caricano `cliente:clienti(*)` — **tutte** le colonne.

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

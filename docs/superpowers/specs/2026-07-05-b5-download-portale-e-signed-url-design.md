# B5 — Download DdC/Buono dal portale dentista + fix trasversale URL firmati

**Data:** 5 luglio 2026
**Stato:** approvato da Francesco, pronto per piano implementativo

## Contesto

Il backlog descrive B5 come "download DdC/Buono dal portale dentista strutturalmente impossibile": `ddc_signed_url`/`buono_signed_url` sono hardcoded a `null` in `src/app/api/portale/[token]/route.ts` e `src/app/portale/[token]/page.tsx`, mentre il messaggio WhatsApp (`whatsapp-template.ts`) promette esplicitamente "scarica i documenti".

Un'indagine approfondita (autorizzata esplicitamente da Francesco) ha rivelato che il problema è più profondo e più esteso del previsto, con quattro root cause distinte:

### A. Il messaggio WhatsApp non viene mai inviato
`orchestraConsegna()` calcola un link `wa.me` (campo `whatsapp_url` nel risultato `ConsegnaResult`) ma **nessun componente client lo legge mai** — verificato con ricerca su tutto il repo (codice e test). Sia `ConsegnaButton.tsx` (pagina `/lavori/[id]/consegna`) sia `handleConsegna` in `DashboardFrontDesk.tsx` chiamano `POST /api/lavori/[id]/consegna` e controllano solo `res.ok`, ignorando il body JSON. Questo è il gap più a monte: anche con un portale perfettamente funzionante, oggi nessuno lo manderebbe mai al dentista.

### B. Il portale non mostra alcuna UI di download
`LavoroCard` in `/portale/[token]/page.tsx` non renderizza mai un bottone/link per `ddc_signed_url`/`buono_signed_url`, indipendentemente dal loro valore — sono campi morti nel tipo, mai letti nel render.

### C. Le "public URL" salvate sono strutturalmente rotte
Il bucket Supabase `documenti` è **privato** (`public: false`, verificato via query diretta su `storage.buckets`). Verificato empiricamente con una richiesta HTTP reale contro un URL salvato in produzione: risposta `400 {"error":"Bucket not found"}`. `generate-ddc.ts` e `generate-buono.ts` chiamano entrambi `.getPublicUrl()` e salvano quell'URL rotto in `dichiarazioni_conformita.pdf_url` / `lavori.buono_pdf_url`. Questo rompe **oggi, in produzione**:
- Il bottone "Apri PDF DdC" in `TabDocumenti.tsx` (tab "Docs" della pagina lavoro)
- Le foto del lavoro in `TabImmagini.tsx` (`<img src={img.url}>`, verificato un URL reale → 400)

### D. Esiste già un precedente corretto
`src/lib/fattura/send-pec.ts` risolve lo stesso problema per l'XML FatturaPA con `createSignedUrl()` generato al momento dell'uso (60s di scadenza) — pattern da estrarre in un helper condiviso e riusare, non da reinventare.

### Scoperte aggiuntive (stessa categoria, zero impatto live, incluse su richiesta esplicita)
- `generateEtichetta()` (`src/lib/pdf/generate-etichetta.ts`, variante che persiste su Storage) non ha alcun chiamante in produzione — solo il proprio test unitario. Codice morto.
- `GET /api/portale/[token]/route.ts` non ha alcun consumer — la pagina SSR fa le proprie query dirette, duplicando la stessa logica. Codice morto.
- `fatture.xml_url` è salvato rotto (stesso bug C) ma non è mai renderizzato come link cliccabile — nessun bottone "Scarica XML" esiste oggi in `/fatture/[id]`.

## Principio architetturale

**Un URL firmato scade — non va mai salvato in DB.** Va generato **al momento dell'uso** (click/render), non alla generazione del PDF. Questo esclude la soluzione ovvia-ma-sbagliata di sostituire `getPublicUrl()` con `createSignedUrl()` nei generatori.

## Design

### 1. Helper condiviso

Nuovo `src/lib/storage/signed-url.ts`:

```typescript
export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds: number
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
```

`send-pec.ts` viene refattorizzato per usare questo helper al posto della chiamata inline esistente (comportamento invariato, solo estrazione).

### 2. Migration — unica di questo lavoro

`lavori.buono_storage_path TEXT NULL` — popolata da `generate-buono.ts` accanto a `buono_pdf_url`/`buono_numero`, stesso pattern già esistente per `dichiarazioni_conformita.storage_path_pdf`. Nessun'altra migration necessaria: `lavori_immagini.storage_path` e `fatture.xml_storage_path` esistono già e sono già popolate correttamente dai rispettivi flussi di upload.

### 3. Invio WhatsApp dopo consegna

- **`ConsegnaButton.tsx`** (pagina dedicata `/lavori/[id]/consegna`, azione singola e deliberata): al successo, legge `whatsapp_url` dal body JSON della risposta, lo salva in stato locale, mostra un secondo bottone "📱 Invia messaggio WhatsApp" sotto "✅ Consegnato!" — click esplicito che apre `wa.me` in una nuova tab.
- **`DashboardFrontDesk.tsx`** (`handleConsegna`, lista compatta di consegne multiple rapide): al successo, apertura automatica immediata (`window.open(whatsapp_url, '_blank')`) — coerente con la velocità richiesta dal flusso Front Desk, nessun click aggiuntivo per riga.

### 4. Download dal portale dentista

Nuova route `GET /api/portale/[token]/lavori/[lavoro_id]/[documento]` (`documento` ∈ `ddc` | `buono`):
1. Verifica token → cliente (stesso pattern di `route.ts` esistente)
2. Verifica che il lavoro appartenga a quel cliente **e** a quel laboratorio **e** `stato === 'consegnato'` (guard cross-tenant + cross-stato)
3. Legge `storage_path_pdf` (da `dichiarazioni_conformita`) o `buono_storage_path` (da `lavori`) a seconda di `documento`
4. Genera URL firmato con scadenza breve (5 minuti — sufficiente per il download immediato, minimizza la finestra di esposizione di un link non autenticato)
5. Redirect 307 all'URL firmato
6. Log su `portale_accessi` (stesso audit trail già esistente per le viste pagina), nuovo valore `azione`: `download_ddc` / `download_buono`

`LavoroCard` nella sezione "Ultimi consegnati" di `/portale/[token]/page.tsx` mostra i due link di download solo se il rispettivo storage path esiste (difensivo, per lavori storici che potrebbero non avere DdC/Buono generati).

### 5. Fix interni — stesso bug, stessa soluzione

- **`TabDocumenti.tsx`** ("Apri PDF DdC"): l'URL firmato viene generato **server-side in SSR**, al momento del render di `/lavori/[id]/page.tsx` — la query esistente già carica `dichiarazioni_conformita`, nessuna query aggiuntiva necessaria oltre alla chiamata `createSignedUrl()`.
- **`TabImmagini.tsx`** (foto lavoro): stesso principio — le foto vengono firmate in batch nella stessa SSR della pagina lavoro, sostituendo `img.url` con l'URL firmato prima di passare i dati al client component.

Scadenza per questi URL interni: 1 ora (pagina interna, sessione autenticata più lunga di un link portale pubblico).

### 6. Nuovo bottone "Scarica XML" in `/fatture/[id]`

Stesso pattern SSR-signing di `xml_storage_path` (colonna già esistente e già popolata da `generate-xml.ts`). Sostituisce il testo statico "✓ Generato" con un link cliccabile quando l'URL firmato è disponibile.

### 7. Pulizia (zero rischio, codice morto confermato)

- Elimina `generateEtichetta()` (`generate-etichetta.ts`) e il suo test dedicato (`generateEtichettaBuffer`, la variante realmente usata dalla route, resta invariata)
- Elimina `GET /api/portale/[token]/route.ts` (nessun consumer, la pagina SSR fa le proprie query dirette)

## Esplicitamente fuori scope

- Nessun cambiamento al contenuto/template dei PDF DdC/Buono stessi (fuori tema — B5 riguarda l'accesso ai file, non il loro contenuto)
- Nessuna modifica al flusso di generazione DdC/Buono oltre alla nuova colonna `buono_storage_path` — l'idempotenza su retry è già risolta da B13 (1/2), la type-safety dei generatori è già risolta da B4
- Nessuna modifica a retry/webhook Stripe — già completamente risolto da B13 (2/2)

Verificato: nessun altro item del backlog (B1-B20) copre questi tre punti — sono confini di scope per aree già risolte o estranee al bug, non lacune da colmare.

## Verifica

Per ogni componente: TDD (test scritto e visto fallire prima dell'implementazione), poi `tsc --noEmit` + `npx vitest run` (nessuna regressione sul baseline) + `next build` (route nel manifest). Migration applicata al DB live solo con conferma esplicita di Francesco, seguita da `supabase gen types` + `tsc --noEmit`.

QA browser raccomandata a fine piano (lab E2E isolato, mai il lab Filippo):
- Consegna reale da `/lavori/[id]/consegna` → bottone "Invia messaggio WhatsApp" appare e apre `wa.me` con il link portale corretto
- Consegna reale da Front Desk → nuova tab WhatsApp si apre automaticamente
- Portale dentista, lavoro consegnato con DdC/Buono generati → entrambi i link di download funzionano, PDF scaricato è quello corretto
- Portale, lavoro consegnato senza DdC/Buono (storico) → nessun link mostrato, nessun errore
- `/lavori/[id]` tab Docs → "Apri PDF DdC" apre il PDF correttamente (non più 400)
- `/lavori/[id]` tab Foto → foto del lavoro visibili (non più immagini rotte)
- `/fatture/[id]` → bottone "Scarica XML" funzionante quando XML generato

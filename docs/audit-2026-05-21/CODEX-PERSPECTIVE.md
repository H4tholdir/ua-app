# Prospettiva Tecnica Indipendente — Verifica 5 Aree Critiche
**Data:** 2026-05-21 | **Revisore:** Analisi Indipendente Post-Orchestratore

---

## Metodologia

Ho lavorato direttamente sul codice sorgente senza fare affidamento sui report precedenti. Per ogni area ho:
1. Letto i file sorgente citati dall'orchestratore con il Read tool
2. Eseguito grep mirati per trovare pattern specifici (import, isSameOrigin, as any, ecc.)
3. Analizzato la logica a runtime, non solo la sintassi superficiale
4. Controllato aree adiacenti non menzionate dall'orchestratore per dare contesto

**File letti direttamente:**
- `src/lib/pdf/generate-ddc.ts`, `generate-dpa.ts`, `generate-ifu.ts`, `generate-buono.ts`, `generate-etichetta.ts`, `generate-nomina-prrc.ts`, `generate-cedolino-tecnico.ts`, `generate-ricevuta-consegna.ts`
- `src/components/features/pdf/DdcTemplate.tsx` (parzialmente)
- `src/components/features/pdf/IFUTemplate.tsx` (estratto campi critici)
- `public/sw.js`
- `src/app/(app)/dashboard/page.tsx`
- `src/lib/dashboard/queries.ts`
- `src/app/api/lavori/[id]/route.ts`
- `src/app/api/fatture/[id]/route.ts`
- `src/app/api/clienti/[id]/route.ts`
- `src/app/api/lavori/[id]/segnala/risolvi/route.ts`
- `src/app/api/admin/labs/[id]/hard-delete/route.ts`
- `src/lib/utils/csrf.ts`
- `package.json`

**Comandi grep/find eseguiti:**
- Ricerca `import.*gsap`, `from 'gsap'` in tutto `src/` e `public/`
- Scansione di tutti i `route.ts` con `[id]` nel path per PATCH/PUT/DELETE + `isSameOrigin`
- Ricerca di `zod`, `validateProps`, `assertDefined` nei generatori PDF
- Conteggio delle chiamate `.from()` nei file dashboard

---

## Area 1: PDF Generator Type-Safety

### Findings dell'Orchestratore
L'orchestratore segnala `as any` nei `renderToBuffer()` calls in `generate-ddc.ts`, `generate-dpa.ts`, `generate-ifu.ts`. Classificazione: MEDIUM priority. Afferma che dati mancanti generano documenti PDF silenziosamente malformati senza errori TypeScript.

### Verifica Indipendente

Ho letto tutti e 8 i generatori PDF. Il pattern `as any` esiste e si ripete sistematicamente:

```typescript
// generate-ddc.ts riga 73
const buffer = await renderToBuffer(createElement(DdcTemplate, { lavoro, lab, ddc }) as any)

// generate-ifu.ts riga 42
return renderToBuffer(createElement(IFUTemplate, { lavoro: lavoro as unknown as LavoroDettaglio, lab }) as any)

// generate-dpa.ts riga 49
const buffer = await renderToBuffer(createElement(DpaTemplate, { dpa }) as any)
```

Il cast `as any` non è arbitrario — ha una causa tecnica precisa: `createElement()` di React restituisce `FunctionComponentElement<P>`, mentre `renderToBuffer()` di `@react-pdf/renderer` dichiara di accettare `ReactElement<DocumentProps>`. I tipi non sono compatibili a livello TypeScript anche quando il componente root è effettivamente un `<Document>`. Il commento in `generate-ddc.ts` riga 69-71 lo spiega esplicitamente.

**Tuttavia il problema segnalato è reale ma parzialmente diverso da come descritto.** Il cast `as any` applicato a `renderToBuffer()` non silenzierà un crash a runtime — se il template JSX tenta di renderizzare `undefined` come testo, `@react-pdf/renderer` lancerà un errore o produrrà stringa vuota, non un documento silenziosamente malformato. Il vero rischio è diverso:

1. **`(lavoro.paziente as any)?.nome_cognome` in `generate-ddc.ts` riga 45** — qui `as any` è usato per accedere a un campo (`nome_cognome`) che non esiste nel tipo `LavoroDettaglio.paziente`. Se il campo è assente a runtime, il fallback è `''` (stringa vuota), non un crash. Questo produce una DdC con `paziente_nome: ''` — campo vuoto nel documento MDR Allegato XIII §4 (identificazione paziente). Questo è un problema di compliance reale, non di type safety tecnica.

2. **`(lab as any).testo_rischi_default` in `generate-ddc.ts` riga 63** — accesso a campo non tipizzato del laboratorio. Se il campo non esiste, il valore è `undefined`, il fallback è `null`. Il documento MDR uscirà con campo "Rischi Residui" assente — accettabile solo se il laboratorio ha configurato i rischi specifici per tipo dispositivo.

3. **Nessuna validazione pre-render** — non esiste nessuna funzione `validateProps()`, nessun Zod schema, nessun type guard. Un `lavoro.tipo_dispositivo = undefined` entrerebbe nel template e produrrebbe un campo vuoto in modo silenzioso.

**In `generate-ifu.ts`** il cast `lavoro as unknown as LavoroDettaglio` maschera un disallineamento tra il tipo restituito dalla query Supabase (che include join annidati) e il tipo `LavoroDettaglio`. Il tipo a runtime potrebbe avere campi in più o in meno.

### Verdetto: CONFERMATO (ma con natura diversa da quanto descritto)

Il problema esiste. L'orchestratore ha ragione che c'è rischio per documenti MDR, ma la meccanica è leggermente diversa: non è che i dati mancanti "generano PDF silenziosamente malformati" in senso tecnico — è che campi critici per la compliance MDR (paziente, tipo_dispositivo, norma_riferimento) possono essere stringa vuota nel documento finale senza che alcun errore venga sollevato.

### Severità Reale: MEDIA (non CRITICA)

Abbasso di un livello rispetto all'orchestratore. Motivi:
- Il codice ha già fallback espliciti per i campi più critici (`?? ''`, `?? null`, `?? '—'`)
- `generate-ddc.ts` lancia `throw new Error('Laboratorio non trovato')` se il dato principale è assente
- Il problema reale è la mancanza di validazione pre-render per campo `paziente_nome` (Allegato XIII §4) — questo è MEDIUM, non CRITICA
- Nessuna vulnerabilità di sicurezza — solo rischio di compliance MDR su edge case

### Fix se necessario

Aggiungere una funzione di validazione minima prima di `renderToBuffer()` nei tre generator MDR (DdC, IFU, Etichetta):

```typescript
function assertDdcRequired(lavoro: LavoroDettaglio, ddc: DdcData): void {
  if (!ddc.paziente_nome?.trim()) {
    throw new Error(`DdC: paziente_nome obbligatorio (Allegato XIII §4) — lavoro ${lavoro.id}`)
  }
  if (!ddc.tipo_dispositivo?.trim()) {
    throw new Error(`DdC: tipo_dispositivo obbligatorio — lavoro ${lavoro.id}`)
  }
  if (!ddc.testo_conformita_snapshot?.trim()) {
    throw new Error(`DdC: testo_conformita obbligatorio — lavoro ${lavoro.id}`)
  }
}
```

Il fix del cast `as any` su `renderToBuffer()` è separato e richiede un type wrapper:
```typescript
function renderPdf(element: ReturnType<typeof createElement>): Promise<Buffer> {
  return renderToBuffer(element as React.ReactElement<import('@react-pdf/renderer').DocumentProps>)
}
```

Effort reale: 2-3 ore, non 4-5 come stima l'orchestratore.

---

## Area 2: Service Worker Navigate Intercept

### Findings dell'Orchestratore
SW non intercetta `request.mode === 'navigate'`. Il codice `return` alla riga 29-30 significa che le pagine SSR non hanno offline fallback. `CACHE_NAME = 'ua-v1'` statico causa versioning fragile. Priorità: ALTA.

### Verifica Indipendente

Ho letto l'intero `public/sw.js`. Il codice è breve e trasparente:

```javascript
// Riga 28-29 — effettivo
if (request.mode === 'navigate') return
```

Il comportamento a runtime di questo `return`: l'evento `fetch` non chiama `e.respondWith()`, il che significa che il browser gestisce la richiesta di navigazione normalmente (va a rete). Se offline, il browser mostra la sua pagina di errore nativa (Not Connected), NON `/offline.html`.

**Il `CACHE_NAME = 'ua-v1'` è confermato statico.** La funzione `activate` cancella le cache con nome diverso da `CACHE_NAME` — ma poiché il nome non cambia mai tra deploy, la pulizia non avviene mai. Ogni deploy Vercel aggiorna i bundle JS (`/_next/...`) ma il SW non invalida nulla perché:
1. I bundle `/_next/` sono esclusi dalla cache (riga 32: `if (url.pathname.startsWith('/_next/')) return`)
2. Le pagine navigate non sono cachate
3. Quindi la cache contiene solo `/offline.html` e `/manifest.json` — immutabili

**Implicazione pratica:** il versioning statico non causa stale content nel codebase attuale perché non si sta mettendo in cache nulla che possa diventare obsoleto. Il problema del versioning è latente — se in futuro si aggiungesse cache di asset statici, diventerebbe critico.

**Il commento nel codice è significativo:**
```javascript
// Non intercettare navigazione (SSR pages) — causava refresh loop su /dashboard
```
L'autore ha scelto consapevolmente di non intercettare la navigazione a causa di un bug reale (refresh loop), non per negligenza. Questo suggerisce che il fix non è banale come l'orchestratore implica.

**Offline experience attuale:** se un utente perde connessione mentre usa l'app, le pagine mostrano errore del browser nativo. Questo è certamente peggiorabile, ma l'app è un'applicazione gestionale B2B con dati real-time — avere pagine "stale" offline potrebbe essere problematico per i tecnici (potrebbero vedere stato vecchio di un lavoro e agire su di esso).

### Verdetto: CONFERMATO MA SEVERITÀ GONFIATA

Il problema tecnico è reale. Ma l'orchestratore non menziona il commento esplicativo nel codice che indica che la scelta è intenzionale (per evitare un refresh loop). Questo cambia la valutazione: non è un dimenticanza, è un compromesso deliberato che ha bisogno di una soluzione più attenta, non un semplice copy-paste di codice stale-while-revalidate.

### Severità Reale: BASSA (in questo contesto)

L'app è B2B gestionale con Next.js SSR. I dati in cache offline sarebbero comunque inaffidabili per decisioni operative su lavori in lavorazione. La mancanza di offline page è un friction UX, non un blocker per Filippo. Con solo `/offline.html` e `/manifest.json` in cache, il versioning statico non crea problemi oggi.

### Fix se necessario

Il fix corretto è più sofisticato di quanto suggerito dall'orchestratore. Serve una offline fallback che mostri UI informativa (non stale data):

```javascript
if (request.mode === 'navigate') {
  e.respondWith(
    fetch(request).catch(() =>
      caches.match('/offline.html').then(r => r ?? new Response('Offline', { status: 503 }))
    )
  )
  return
}
```

Questo non usa cache per la navigazione (evita il refresh loop), ma fornisce `/offline.html` come fallback quando la rete non è disponibile. Il versioning può restare `ua-v1` finché non si aggiungono asset statici alla precache.

---

## Area 3: Query N+1 nel Dashboard

### Findings dell'Orchestratore
Suggerisce di verificare se ogni KPI genera una query separata senza join, con possibile N+1. Priorità: MEDIA.

### Verifica Indipendente

Ho letto `src/lib/dashboard/queries.ts` (462 righe) e `src/app/(app)/dashboard/page.tsx` (257 righe) integralmente.

**Architettura effettiva per ruolo TITOLARE:**

Il dashboard usa una **cache materialized view** (`dashboard_kpi_cache`) con RPC `refresh_dashboard_cache` — un pattern molto intelligente. I KPI aggregati (consegne_oggi, lavori_in_ritardo, pronti_non_fatturati, ecc.) vengono calcolati una volta in Postgres e serviti da una singola tabella.

**Conteggio query reali per titolare (peggiore caso — cache stale):**
1. `utenti` — auth lookup (sequenziale, pre-conditionale)
2. `dashboard_kpi_cache` — check stale (sequenziale)
3. `refresh_dashboard_cache` RPC — solo se stale (sequenziale)
4. `dashboard_kpi_cache` — lettura KPI
5. `lavori` — pagamenti scaduti (con join `lavori_partitario` embedded)
6. `magazzino` — materiali esaurimento
7. `lavori` — in prova rientro
8. `lavori` — consegne oggi (con join `clienti` embedded)
9. `lavori` — in ritardo (con join `clienti` embedded)
10. `lavori` — segnalazioni (con join `utenti`, `clienti` embedded)
11. `laboratori` — nome lab + onboarding status

Query 4-11 vengono eseguite in `Promise.all()` (riga 101-107 del page.tsx). Il totale è 3 sequenziali + 4 parallele = latenza di 3 round trip, non 11.

**Il caso `getPagamentiScadutiTop` merita attenzione specifica:**

```typescript
const { data } = await svc
  .from('lavori')
  .select('id, prezzo_unitario, clienti!inner(...), lavori_partitario(importo)')
  .lt('data_consegna_prevista', cutoffISO)
  .gt('prezzo_unitario', 0)
```

Questo carica TUTTI i lavori scaduti (senza `LIMIT`) con i loro partitari, poi aggrega client-side in JavaScript con `Map`. Per un laboratorio con 500+ lavori storici, questo carica potenzialmente centinaia di righe con array `lavori_partitario` annidati. Non è un N+1 classico (non c'è un loop di fetch), ma è un **over-fetch aggregato client-side** — una query che dovrebbe essere una `GROUP BY` in SQL.

Stesso pattern in `getFrontDeskDashboard` per `insolutoData` (riga 411-419).

**Nessun loop di fetch trovato.** Non c'è alcun `.map(async item => svc.from(...))` che genererebbe N query per N lavori. L'orchestratore aveva ragione nell'area di interesse ma torto sul meccanismo specifico.

### Verdetto: PARZIALMENTE CORRETTO

Non ci sono query N+1 nel senso classico. C'è un over-fetch aggregato client-side in `getPagamentiScadutiTop` e `getFrontDeskDashboard.insolutoData`. Il problema reale è diverso: scalabilità degradata su laboratori con molti lavori storici, non N+1.

### Severità Reale: BASSA (per Filippo come primo utente)

Con un laboratorio piccolo (< 200 lavori/anno), l'over-fetch è irrilevante. Diventa MEDIA solo quando il lab supera 800-1000 lavori storici. L'architettura con `dashboard_kpi_cache` è intelligente e corretta.

### Fix se necessario (bassa urgenza)

Refactorare `getPagamentiScadutiTop` in RPC Postgres:

```sql
CREATE FUNCTION get_pagamenti_scaduti_top(p_lab_id UUID, p_limit INT DEFAULT 3)
RETURNS TABLE (cliente_id UUID, cliente_display TEXT, residuo NUMERIC) AS $$
  SELECT c.id, COALESCE(c.studio_nome, c.cognome || ' ' || c.nome),
         SUM(l.prezzo_unitario) - COALESCE(SUM(p.importo), 0)
  FROM lavori l
  JOIN clienti c ON c.id = l.cliente_id
  LEFT JOIN lavori_partitario p ON p.lavoro_id = l.id
  WHERE l.laboratorio_id = p_lab_id AND l.deleted_at IS NULL
    AND l.stato <> 'annullato' AND l.prezzo_unitario > 0
    AND l.data_consegna_prevista < NOW() - INTERVAL '30 days'
  GROUP BY c.id, c.studio_nome, c.nome, c.cognome
  HAVING SUM(l.prezzo_unitario) - COALESCE(SUM(p.importo), 0) > 0
  ORDER BY 3 DESC LIMIT p_limit;
$$ LANGUAGE sql STABLE;
```

---

## Area 4: CSRF Coverage sulle Route Dinamiche `[id]`

### Findings dell'Orchestratore
Verificare che le route PATCH/DELETE con `[id]` abbiano il check `isSameOrigin()`. Priorità: MEDIA.

### Verifica Indipendente

Ho eseguito una scansione sistematica di **tutti** i `route.ts` con `[id]` nel path che espongono metodi mutativi (PATCH, PUT, DELETE). Risultati completi:

**Route con CSRF copertura presente (CSRF_CALLS >= 2):**
- `api/lavori/[id]/route.ts` — PATCH coperto
- `api/fatture/[id]/route.ts` — PATCH coperto
- `api/clienti/[id]/route.ts` — PATCH coperto
- `api/ordini/[id]/route.ts` — PATCH coperto
- `api/listino/[id]/route.ts` — PATCH coperto
- `api/lavori/[id]/stato/route.ts` — PATCH coperto
- `api/lavori/[id]/fasi/[fase_id]/route.ts` — PATCH coperto
- `api/lavori/[id]/immagini/[imgId]/route.ts` — PATCH coperto
- `api/lavori/[id]/lavorazioni/route.ts` — PUT coperto
- `api/admin/labs/[id]/route.ts` — PATCH + DELETE coperti
- `api/admin/invites/[id]/route.ts` — DELETE coperto
- `api/admin/labs/[id]/stato/route.ts` — PATCH coperto

**Route SENZA `isSameOrigin()` su metodo mutativo:**

1. **`api/lavori/[id]/segnala/risolvi/route.ts`** — PATCH senza CSRF check
   - Azione: imposta `segnalazione_risolta = true` su un lavoro
   - Mitigazione presente: `getServerUserClient()` verifica sessione cookie, poi controlla `ruolo === 'titolare' || 'admin_rete'`, poi verifica che il lavoro appartenga al `laboratorio_id` dell'utente
   - Rischio CSRF reale: basso — richiede cookie di sessione valido + ruolo specifico. Un attacker CSRF potrebbe marcare una segnalazione come "risolta" solo se l'utente ha già una sessione autenticata con ruolo titolare

2. **`api/admin/labs/[id]/hard-delete/route.ts`** — DELETE con implementazione CSRF custom
   - Usa una versione non-standard: `!origin.includes(host.split(':')[0])`
   - Questa implementazione è **più debole** di `isSameOrigin()`: se `host = "uachelab.com:443"`, dopo `split(':')[0]` ottieni `"uachelab.com"`. Se un attacker controlla `attacker-uachelab.com`, `origin.includes("uachelab.com")` sarebbe TRUE — bypass del check
   - Mitigazione parziale: `ruolo !== 'admin_sistema'` (solo Francesco può usarlo), e richiede `confirm_nome` nel body
   - Rischio reale: molto basso data la doppia protezione (ruolo + conferma nome), ma la logica CSRF è tecnicamente difettosa

**`isSameOrigin()` in `src/lib/utils/csrf.ts` — analisi dell'implementazione:**

```typescript
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true  // ← ATTENZIONE
  const host = req.headers.get('host')
  if (!host) return false
  try {
    const { host: originHost } = new URL(origin)
    return originHost === host
  } catch {
    return false
  }
}
```

Il `if (!origin) return true` è l'unica area grigia: una richiesta cross-origin da browser moderni include sempre `Origin`. Le richieste senza `Origin` sono tipicamente server-to-server o strumenti come curl. Questa è una scelta consapevole e standard — non una vulnerabilità.

### Verdetto: PARZIALMENTE CORRETTO

L'orchestratore suggeriva di trovare "route che non hanno isSameOrigin()". Ne ho trovate 2, ma il rischio reale è molto più basso di quanto la segnalazione potesse suggerire. Il finding più interessante — non menzionato dall'orchestratore — è l'implementazione CSRF custom difettosa in `hard-delete` (substring check invece di host comparison).

### Severità Reale: BASSA

- `segnala/risolvi`: ruolo check + tenant isolation sono difese sufficienti per questa azione a basso impatto
- `hard-delete`: logicamente difettoso ma protetto da `ruolo === 'admin_sistema'` + `confirm_nome`

### Fix se necessario

1. Aggiungere `isSameOrigin()` a `segnala/risolvi/route.ts` (5 righe):
```typescript
import { isSameOrigin } from '@/lib/utils/csrf'
// In PATCH handler, prima di auth:
if (!isSameOrigin(_req)) {
  return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
}
```

2. Sostituire la CSRF logic custom in `hard-delete` con `isSameOrigin()`:
```typescript
import { isSameOrigin } from '@/lib/utils/csrf'
// Sostituire righe 9-13 con:
if (!isSameOrigin(req)) {
  return NextResponse.json({ error: 'CSRF' }, { status: 403 })
}
```

---

## Area 5: GSAP Unused Bundle

### Findings dell'Orchestratore
GSAP è in `package.json` ma zero import trovati. Pesa ~300KB minified. Rimuovere con `npm uninstall gsap`. "Negativa #1" nelle scoperte sorprendenti.

### Verifica Indipendente

**`package.json` contiene:**
- `gsap: ^3`
- `@gsap/react: ^2`

**Grep ricorsivo su tutto `src/` per qualsiasi occorrenza di "gsap":**
```
grep -r "gsap|@gsap/react" src/ --include="*.ts" --include="*.tsx"
# → Zero risultati
```

**Grep su `public/`:**
```
grep -r "gsap|@gsap" public/
# → Zero risultati
```

**Dimensione in `node_modules`:**
```
du -sh node_modules/gsap/  →  6.3 MB (su disco)
```

La dimensione su disco è 6.3MB — più grande di quanto stimato dall'orchestratore (~300KB). Il bundle minified di GSAP core è ~70KB gzipped, ma con CustomBounce, CustomEase, CSSPlugin il totale non compressa è ben maggiore. In bundle production Next.js, solo i moduli importati vengono inclusi — poiché GSAP non ha ALCUN import nel codice sorgente, **il tree-shaking di Next.js dovrebbe escluderlo completamente dal bundle produzione**.

**Verifica critica:** Next.js con webpack non include automaticamente `node_modules` non importati. Il package è installato ma se nessun file lo importa, non entra nel bundle. La dimensione ~300KB non è nel bundle dell'utente finale, ma occupa spazio in `node_modules` durante lo sviluppo e rallega leggermente i tempi di install CI/CD.

**Nota:** `@gsap/react` e `gsap` sono in `dependencies` (non `devDependencies`), quindi vengono installati anche in produzione. Non causano bundle bloat client, ma indicano una dipendenza dichiarata non usata che potrebbe confondere i collaboratori futuri.

### Verdetto: CONFERMATO come "dipendenza non usata", SMENTITO come "bundle bloat"

GSAP non è importato da nessuna parte. L'orchestratore ha ragione che va rimosso. Ma l'affermazione "pesa ~300KB nel bundle" è tecnicamente imprecisa: in un'app Next.js, un package non importato non entra nel bundle client grazie al tree-shaking. L'impatto reale è: sviluppo più lento (`npm install`), dipendenza confusa nel `package.json`, potenziale audit di sicurezza futuro.

### Severità Reale: BASSA (ma fix immediato, 1 minuto)

### Fix

```bash
npm uninstall gsap @gsap/react
```

Questo rimuove entrambi i pacchetti dal `package.json` e da `node_modules`. Non richiede modifiche al codice. Verificare con `npx tsc --noEmit` dopo la rimozione (già confermato zero import, quindi zero errori attesi).

---

## Findings Aggiuntivi

### A. `segnala/risolvi` — mancanza di isolamento tenant nel update finale

In `src/app/api/lavori/[id]/segnala/risolvi/route.ts` (riga 50-53):

```typescript
const { error } = await svc
  .from('lavori')
  .update({ segnalazione_risolta: true })
  .eq('id', id)  // ← MANCA .eq('laboratorio_id', utente.laboratorio_id)
```

Il check del tenant avviene nella query precedente (riga 37-42: verifica che il lavoro appartenga al lab), ma il comando `update` finale **non include il filtro `laboratorio_id`**. Se c'è una race condition (il lavoro viene trasferito o la RLS non è attiva per `service_role`), l'update potrebbe toccare un lavoro di un altro tenant. La `getServiceClient()` bypassa RLS per definizione.

Questo è un bug reale, non segnalato dall'orchestratore. Severità: BASSA (il check precedente mitiga la maggior parte dei casi), ma è una difesa-in-depth mancante.

**Fix immediato:**
```typescript
.update({ segnalazione_risolta: true })
.eq('id', id)
.eq('laboratorio_id', utente.laboratorio_id)  // aggiungere questa riga
```

### B. `dashboard_kpi_cache` — campo `tecnico_piu_saturo` parzialmente risolto

In `queries.ts` riga 113-114:
```typescript
tecnico_piu_saturo: row.tecnico_saturo_id
  ? { nome: '', sigla: null, lavori_attivi: row.tecnico_saturo_count ?? 0 }
  : null,
```

Il campo `nome` è hardcoded a stringa vuota `''`. Il nome del tecnico non viene caricato dalla cache — richiederebbe una query aggiuntiva a `tecnici`. La UI mostra un tecnico "saturo" senza nome, il che è inutile per il titolare. Questo è un gap funzionale minore non citato dall'orchestratore.

### C. `getPagamentiScadutiTop` — mancanza di LIMIT nella query

Come discusso in Area 3, la query sui lavori scaduti non ha `.limit()`. Per un lab ad alta produttività (800+ lavori/anno) che usa UÀ da 2+ anni, questa query potrebbe caricare 1000+ righe. Questo è il vero rischio di performance nella dashboard, non un N+1.

---

## Riepilogo

| Area | Orchestratore | Indipendente | Delta |
|------|--------------|-------------|-------|
| PDF Generator Type Safety | MEDIUM — `as any` genera PDF malformati silenziosamente | MEDIA — problema di compliance MDR su campi nullable, non crash silenzioso. Natura diversa ma rischio reale | Stesso livello, meccanica corretta |
| Service Worker Navigate | ALTA — SW non intercetta navigazione | BASSA — scelta intenzionale documentata nel codice. Fix non banale. Bundle versioning non crea problemi oggi | Orchestratore gonfia la severità |
| Query N+1 Dashboard | MEDIA — possibili N fetch separate | BASSA — architettura con cache materialized view è corretta. Over-fetch client-side in 2 funzioni, non N+1 | Orchestratore indica area giusta, meccanica sbagliata |
| CSRF Route Dinamiche | MEDIA — verificare copertura | BASSA — copertura quasi completa. 2 gap minori trovati (risolvi + hard-delete custom logic) | Orchestratore leggermente pessimista |
| GSAP Unused | BASSA — ~300KB bundle bloat | BASSA — non è bundle bloat (tree-shaking), ma dipendenza inutile da rimuovere | Bundle impact sopravvalutato, fix corretto |

**Finding aggiuntivo critico non citato dall'orchestratore:**
- `segnala/risolvi` manca di `.eq('laboratorio_id', ...)` nel comando update finale — tenant isolation difettosa su service_role client

---

## Score Tecnico Indipendente: 7.4/10

La valutazione dell'orchestratore (7.2/10 per dimensione tecnica) è sostanzialmente corretta. La mia analisi diretta del codice conferma un codebase produzione-ready con scelte architetturali solide:

**Punti di forza reali (verificati nel codice):**
- CSRF implementato coerentemente su quasi tutte le route mutative (12/14 routes con `[id]`)
- Tenant isolation con `laboratorio_id` presente nella stragrande maggioranza delle query
- Pattern di idempotency su DdC (gestione `23505` unique constraint violation)
- `Promise.all()` usato correttamente per query parallele
- Cache materialized view per dashboard KPI — scelta sofisticata
- Gestione esplicita degli `IMMUTABLE` fields nelle PATCH API (allowlist, non blocklist)

**Debiti tecnici reali (verificati nel codice):**
- Mancanza validazione pre-render nei generatori PDF MDR (3 ore di lavoro)
- Over-fetch senza LIMIT in `getPagamentiScadutiTop` (futuro problema di scalabilità)
- 2 route mutative senza CSRF check (`segnala/risolvi`, `hard-delete` con logica difettosa)
- Tenant isolation mancante nell'update finale di `segnala/risolvi`
- GSAP installato ma inutilizzato

Nessuno di questi è critico per il lancio con Filippo come primo utente. Il codebase è tecnicamente onesto — commenta le proprie limitazioni (`// causava refresh loop`), usa `eslint-disable` con spiegazione, non nasconde il debito tecnico.

---

*Report generato il 2026-05-21 da analisi indipendente diretta sul codice sorgente.*
*Metodologia: lettura file sorgente + grep sistematici, senza fiducia sui report precedenti.*

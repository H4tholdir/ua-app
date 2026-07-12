# ADR — Spike B6: architettura desktop route ↔ pannelli (`/dashboard` a 1280)
**Data:** 12 luglio 2026 · **Stato:** IN ATTESA DI RATIFICA (gate Francesco) · **Ondata:** 1 (Home + Pile)

## Contesto (B6)

A 1280 la home v3 diventa una nav a 3 pannelli (§12.3 spec madre «Una cosa alla volta»): nav 240px · lista pila 400px · scheda preview flessibile. Bisogna decidere COME la selezione (quale pila, quale lavoro) viaggia tra i pannelli. Vincolo di legge (§6.2 madre): «il gesto browser-back DEVE sempre funzionare (PWA history coerente)»; le route restano invariate e deep-linkabili (§2 spec «Il cuore»). I Task 7-9 dell'Ondata 1 consumano questa decisione; la scheda v3 (Ondata 3) entrerà nel pannello destro e il flusso consegna (Ondata 4b) dovrà funzionare dentro quel pannello.

## Metodo

Esperimento nel worktree su Next.js 16.2.6 (App Router, React 19.2.4): tre route di prova usa-e-getta sotto `/ds-v3-catalogo/spike-b6/{a,b,c}` (prefisso pubblico nel middleware — nessun bypass auth da rimuovere), layout 3 pannelli con lista scrollabile di 80 item, fetch simulato 30-50ms, contatore di render server-side + timestamp incorporati nell'HTML di ogni pannello. Misure con Playwright a viewport 1280×800: scrollTop del pannello lista prima/dopo ogni navigazione, sequenza back ×4, deep-link a freddo, `router.refresh()`. Le route di prova sono state cancellate: questo ADR è l'unico artefatto.

## Candidato A — `searchParams` server-driven (P2, candidata del piano)

Una sola `page.tsx` `force-dynamic` che legge `?pila=` (default `rossa`) e `?lavoro=`; ogni selezione è un `<Link>`; zero stato client duplicato.

**Evidenze misurate:**

| Prova | Risultato |
|---|---|
| Click `?lavoro=` via `<Link>` | Re-render server completo a ogni click (render #2→#3→#4, ~58-60ms con fetch simulato 50ms). Soft navigation: il documento NON si ricarica. |
| Scroll lista durante selezione lavoro | **Preservato**: scrollTop 600 → 600 dopo la navigazione (React riconcilia il DOM, il contenitore non viene rimontato; `window.scrollY` resta 0 — la home desktop è `h-screen`, lo scroll di pagina non entra in gioco) |
| Cambio `?pila=` | Re-render corretto; lo scrollTop resta 600 anche a lista cambiata → serve un reset esplicito dello scroll al cambio pila (vedi Note d'implementazione) |
| Back ×4 dopo `rossa → lavoro 18 → lavoro 22 → ambra → ambra-3` | **Ripercorre esattamente le selezioni** (URL e contenuto pannelli: `ambra` → `rossa&lavoro=22` → `rossa&lavoro=18` → iniziale). Servito dalla client router cache (i timestamp server NON cambiano): back istantaneo, zero roundtrip |
| Deep-link a freddo `?pila=blu&lavoro=blu-13` | Renderizza direttamente lo stato completo (pila blu + scheda blu-13) |
| `router.refresh()` con `?lavoro=` attivo (simula il post-server-action della consegna) | Nuovo render server (#1→#2), **URL invariato, scrollTop lista preservato (600), scheda intatta** |

**Costo strutturale:** 1 file (`page.tsx`). Costo runtime: ogni selezione ri-esegue l'intera page server-side (quindi `getPileHome()` a ogni click) — mitigabile con `React.cache()` per request e query leggere (già previsto: conteggi diretti, niente cache KPI).

## Candidato B — Parallel routes (`@nav` / `@lista` / `@scheda`)

Layout con 3 slot; ogni slot è una page `force-dynamic`; `@nav` NON legge `searchParams`, `@lista` legge solo `?pila=`, `@scheda` legge entrambi.

**Evidenze misurate:**

| Prova | Risultato |
|---|---|
| Costo di struttura | **5 file** per la stessa route (layout.tsx + page.tsx children + 3 `@slot/page.tsx`), +1 `default.tsx` per slot appena la route avesse sotto-navigazione (8 file). Slot invisibili nell'URL: complessità solo interna |
| Cambio SOLO `?lavoro=` | **NESSUN re-render parziale: tutti e 3 gli slot ri-renderizzano server-side** — anche `@nav` che non legge mai `searchParams` (nav render #1→#2→#3→#4 in perfetto lockstep con lista e scheda). Con page dinamiche il cambio di searchParams invalida tutti i segmenti page della route: il beneficio teorico del re-render parziale NON si materializza in questo caso d'uso |
| Back | Ripercorre le selezioni (stessa client router cache del candidato A) |

**Verdetto:** paga 5-8 file e una struttura più difficile da leggere per ottenere ESATTAMENTE il comportamento del candidato A. I parallel routes servono a route indipendenti per slot (es. modali intercettate), non a selezioni via searchParams.

## Candidato C — Master-detail client-only (stato in client component, niente URL)

`'use client'` con `useState` per pila/lavoro; le selezioni sono `onClick`.

**Evidenze misurate:**

| Prova | Risultato |
|---|---|
| 3 selezioni (`rossa-5 → ambra → ambra-9`) | URL immobile su `/…/c`; le selezioni non producono history entry |
| Back del browser dopo le selezioni | **ESCE dalla pagina** (torna alla route precedente) invece di ripercorrere le selezioni → **violazione diretta §6.2** |
| Reload | Selezione persa (`Nessun lavoro selezionato`); nessun deep-link possibile |

**Verdetto:** scartato, come atteso. Confermata sperimentalmente la violazione del vincolo di legge.

## Raccomandazione

**Confermare P2 — Candidato A: selezione via `searchParams` (`?pila=` default rossa, `?lavoro=` per la preview), navigazione via `<Link>`, re-render server, zero stato client duplicato.**

Motivazione dalle evidenze: A soddisfa tutti i vincoli misurati (scroll lista preservato, back che ripercorre le selezioni, deep-link, URL invariati) al costo strutturale minimo (1 page). B ottiene lo stesso identico comportamento a 5-8× il costo di struttura, senza il re-render parziale che era la sua unica ragione d'essere. C viola §6.2 in modo dimostrato.

### Impatto su Ondata 3 (scheda v3 nel pannello destro)

La scheda diventa un server component condiviso (`<SchedaLavoro id={…}>`): a 1280 lo renderizza `/dashboard` leggendo `?lavoro=`; su mobile lo renderizza `/lavori/[id]` come pagina piena. Stessa fonte dati, due montaggi — nessuna divergenza di stato possibile perché lo stato È l'URL. La preview nel pannello e la scheda piena restano entrambe deep-linkabili senza migrazione di route (vincolo §2 «Il cuore» rispettato).

### Impatto su Ondata 4b (consegna dentro il pannello)

Misurato con `router.refresh()`: il pattern server action → `revalidatePath('/dashboard')`/`refresh()` ri-renderizza pile, lista e scheda in un colpo solo **senza toccare l'URL e senza perdere lo scroll della lista**. La consegna in-pannello funziona quindi con l'orchestrazione server già decisa (Ondata 4a): nessuna sincronizzazione client aggiuntiva; dopo la consegna il lavoro sparisce dalla lista e i badge della nav si aggiornano nello stesso re-render.

### Note d'implementazione per i Task 7-9 (dalle misure)

1. **Reset scroll al cambio pila:** il DOM del contenitore lista sopravvive alla navigazione, quindi cambiando `?pila=` lo scrollTop resta quello vecchio → usare `key={pila}` sul contenitore scrollabile (rimonta e riparte da 0), mantenendolo stabile quando cambia solo `?lavoro=`.
2. **Back e scroll:** il back ripercorre le selezioni ma NON ripristina lo scrollTop del pannello interno (Next ripristina solo lo scroll di window). Accettabile: il vincolo §6.2 riguarda le selezioni, non lo scroll; la riga selezionata resta evidenziata (ring §12.3).
3. **Back e freschezza dati:** il back è servito dalla client router cache (payload RSC precedente, istantaneo ma potenzialmente stantio). Dopo mutazioni (consegna) la revalidation del punto 4b invalida la cache; nessun caso in cui il back mostri un lavoro consegnato come attivo dopo un refresh.
4. **Tastiera (↑↓, Invio, N, /):** un piccolo client component che fa `router.push` sugli STESSI URL dei `<Link>` — la history resta coerente per costruzione.

---

**Decisione: [X] — ratificata da Francesco il …**

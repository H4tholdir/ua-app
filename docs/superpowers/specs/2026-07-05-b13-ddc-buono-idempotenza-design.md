# B13 (1/2) — Idempotenza generazione DdC/Buono su retry di `orchestraConsegna`

**Data:** 05/07/2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione B13 ("Zero test su `orchestraConsegna`/Stripe webhook")
**Stato:** Design approvato, in attesa di piano implementativo
**Nota di scope:** B13 è stato diviso in 2 piani indipendenti. Questo documento copre solo il primo (idempotenza DdC/Buono). Il secondo (webhook Stripe: fallimento silenzioso + vincolo UNIQUE `stripe_subscription_id`) avrà uno spec separato.

## Contesto — come si è arrivati a questo scope

B13 nasce nel backlog come "zero test su `orchestraConsegna`/Stripe webhook". Un'esplorazione preliminare del codice (non solo lettura del backlog) ha rivelato punti di rischio reali non descritti nell'audit originale. Un primo giro di analisi aveva ipotizzato un problema critico — duplicazione di documenti legali (DdC) e doppio consumo di materiali dal magazzino su un retry dopo fallimento parziale. Una lettura riga-per-riga più approfondita di `traccia-materiali.ts`, `generate-ddc.ts` e `generate-buono.ts` ha **ridimensionato** questa ipotesi:

- **Materiali** (`traccia-materiali.ts:98`): già idempotenti. `magazziniGiaTracciati` è ricostruito da `lavoro.materiali` (ricaricato a ogni chiamata) e usato per saltare (`continue`) i materiali già tracciati per quel `magazzino_id`. Il ramo non-MDR (`scarichi_magazzino`) gestisce la ripetizione tramite il vincolo UNIQUE esistente + `continue` su errore `23505`. **Nessun fix necessario.**
- **DdC** (`generate-ddc.ts`): il *record* nel DB è già protetto dal vincolo `ddc_lavoro_unique UNIQUE (laboratorio_id, lavoro_id)` (migration `002_fase2_schema.sql:201`) — un secondo insert per lo stesso lavoro fallisce con `23505` e il codice (righe 111-122) recupera la riga esistente, restituendo il numero/URL corretti. **Ma** questo controllo avviene *dopo* aver già generato il PDF e caricato un nuovo file su Storage con un nuovo numero progressivo (righe 30, 83-85) — che restano orfani.
- **Buono** (`generate-buono.ts`): stesso problema del PDF orfano, ma senza nemmeno il recupero finale — la funzione aggiorna incondizionatamente `lavori.buono_pdf_url`/`buono_numero` (righe 51-55), sovrascrivendo per sempre i valori di un tentativo precedente riuscito.

**Severità reale (non quella ipotizzata inizialmente):** nessuna duplicazione di record legali nel DB, nessun doppio consumo di magazzino. Il problema è limitato a **file PDF orfani su Supabase Storage e numeri progressivi (DdC/Buono) sprecati** quando `orchestraConsegna` viene rieseguita dopo che uno dei due generatori PDF ha già avuto successo in un tentativo precedente e l'altro è fallito. Scenario raro (richiede un fallimento a metà flusso), non critico, ma facilmente prevenibile con un guard minimo.

## Design

### Guard di idempotenza in testa a ciascun generatore

Entrambe le funzioni ricevono un controllo "esiste già l'artefatto per questo lavoro?" **prima** di bruciare un progressivo o scrivere su Storage. Se sì, ritornano subito i valori esistenti — zero rigenerazione.

**`generateDdC(lavoro)`** — nuovo controllo in apertura di funzione, prima della riga `const progressivo = await generaProgressivo(...)`:

```typescript
const { data: existing } = await supabase
  .from('dichiarazioni_conformita')
  .select('numero_ddc, pdf_url')
  .eq('lavoro_id', lavoro.id)
  .maybeSingle()

if (existing) {
  return { numero: existing.numero_ddc, url: existing.pdf_url ?? '' }
}
```

Il recupero esistente su errore `23505` (righe 111-122) **resta invariato** — è la rete di sicurezza per la race condition residua che il guard iniziale non può chiudere (due richieste concorrenti che superano entrambe il controllo prima che la prima abbia scritto la riga).

**`generateBuono(lavoro)`** — stesso pattern, ma il dato esiste già su `lavoro` (caricato in Step 1 di `orchestraConsegna` con `select('*')`), quindi non serve nemmeno una query aggiuntiva:

```typescript
if (lavoro.buono_pdf_url) {
  return { numero: lavoro.buono_numero ?? '', url: lavoro.buono_pdf_url }
}
```

Da aggiungere in apertura di funzione, prima della riga `const progressivo = await generaProgressivo(...)`. **Verificato:** `LavoroDettaglio` (`src/types/domain.ts`) non espone oggi `buono_pdf_url`/`buono_numero` (i campi esistono nello schema DB — usati infatti da `generate-buono.ts` stesso in scrittura — ma mancano nel tipo applicativo). Vanno aggiunti come `buono_pdf_url: string | null` e `buono_numero: string | null` a `LavoroDettaglio` come parte di questo fix.

**Nessuna migration necessaria** — il vincolo `ddc_lavoro_unique` esiste già; il controllo sul Buono legge colonne già presenti su `lavori`.

## Test (TDD, RED→GREEN)

Zero test esistono oggi per `generateDdC`/`generateBuono` a livello di funzione (l'unico test PDF esistente, `ddc-pdf-content.test.ts`, testa solo il componente `DdcTemplate` con fixture inline, bypassando la funzione generatrice e Supabase).

1. **RED — riproduci il file orfano:** test che chiama `generateDdC()`/`generateBuono()` due volte di seguito per lo stesso `lavoro_id` (mock Supabase con `createChain()` + fixture esistenti `LAB_FIXTURE`/`LAVORO_FIXTURE`), verifica che la seconda chiamata NON esegua un secondo upload Storage né bruci un secondo progressivo (asserzione sul numero di chiamate mock a `.storage.upload`/`generaProgressivo`) — fallisce prima del fix (entrambe le chiamate generano).
2. **GREEN — dopo il guard:** stesso test, verifica che la seconda chiamata ritorni i valori della prima senza rigenerare.
3. **Regressione concorrenza (DdC):** test dedicato che simula il guard iniziale "non trovato" ma l'insert che fallisce con `23505` (race tra due richieste quasi simultanee) — verifica che il recupero esistente funzioni ancora come rete di sicurezza.

## File toccati

- `src/lib/pdf/generate-ddc.ts` (guard iniziale)
- `src/lib/pdf/generate-buono.ts` (guard iniziale)
- `src/types/domain.ts` (aggiunta `buono_pdf_url`/`buono_numero` a `LavoroDettaglio`)
- Nuovi test: `tests/unit/generate-ddc-idempotenza.test.ts`, `tests/unit/generate-buono-idempotenza.test.ts` (o estensione dei file di test esistenti per questi generatori, se già creati da B4)

## Verifica finale

`tsc --noEmit` + `vitest run` + `next build`. Nessuna migration → nessun gate FASE 6b. Nessuna QA browser approfondita necessaria (logica interna non osservabile in UI); se utile, verifica facoltativa via query diretta su Storage/`dichiarazioni_conformita` per un lavoro E2E dopo un retry simulato.

## Fuori scope (backlog separato)

- **B13 (2/2)** — fallimento silenzioso negli handler webhook Stripe (nessuno controlla `.success` di `transitionLabStato()`) + vincolo UNIQUE mancante su `stripe_subscription_id`. Spec dedicato separato, priorità più alta di questo (impatto economico reale sull'abbonamento SaaS, non solo file orfani).
- **Gap latente nel ramo non-MDR di `traccia-materiali.ts`** (segnalato ma non affrontato qui): se l'insert su `scarichi_magazzino` riesce ma la RPC `decrementa_scorta` fallisce subito dopo, un retry incontra `23505` sul primo insert e fa `continue` — la scorta non viene mai ridecrementata. Non bloccante, da valutare in un giro di hardening futuro.

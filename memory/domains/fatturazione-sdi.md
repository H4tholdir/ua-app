# Fatturazione Elettronica SDI
**Carica quando:** task tocca fatture, FatturaPA, SDI, PEC, progressivo, incluso_in_fattura, stato_sdi, riconciliazioni, ricevute SdI.

## File chiave
- `src/lib/fattura/generate-xml.ts` — genera XML FatturaPA 1.2, snapshot cliente immutabile, progressivo da RPC
- `src/lib/fattura/send-pec.ts` — SMTP PEC verso SDI, password da Vault via `get_pec_password`, guardia D-7 su UPDATE post-invio
- `src/lib/fattura/ricevute/parse-ricevuta-sdi.ts` — parser ricevute SdI XXE-safe con namespace pinning (R1b)
- `src/lib/fattura/ricevute/verifica-firma.ts` — verifica firma XAdES, oggi **sempre in fallback quarantena-all** (vedi sotto)
- `src/types/domain.ts` — `StatoSDI` (7 stati: draft → generata → smtp_inviata → pec_consegnata → ricevuta_sdi → accettata/rifiutata)
- `src/lib/db/progressivi.ts` — `generaProgressivo()` RPC atomica

## Invariante critica
**`incluso_in_fattura` è il discriminatore "già fatturato" — ortogonale a `stato_sdi` e a `lavori.stato`.**
Il progressivo SDI è assegnato dalla RPC atomica `genera_progressivo` e **non si ricalcola mai dopo la prima emissione**. Ricalcolare = SDI ha il vecchio progressivo, il secondo invio viene rifiutato.

## Regole operative
- Password PEC: MAI in chiaro nel DB — solo via `get_pec_vault_secret` con service_role
- Snapshot cliente (denominazione, PIVA, CF, indirizzo) copiati al momento della generazione: immutabili per legge
- Batch fatture: selezionare lavori unbilled → creare draft → generare XML → marcare `incluso_in_fattura`

## Macchina a stati `stato_sdi` (aggiornato R1, 16/07/2026)
Rank a monotonia stretta (mai regredire, tranne via override esplicito titolare):

| Stato | Rank |
|-------|------|
| `draft` | 0 |
| `generata` | 1 |
| `smtp_inviata` | 2 |
| `pec_consegnata` | 3 |
| `ricevuta_sdi` | 4 |
| `scaduta` | 5 |
| `accettata` / `rifiutata` | 6 |

**Chi scrive `stato_sdi` (writer unici — MAI update diretti altrove):**
- `generate-xml` route: `draft` → `generata`
- `send-pec`: → `smtp_inviata`, guardato da D-7 (`.eq('stato_sdi','generata')` sull'UPDATE post-invio, evita regressione `accettata`→`smtp_inviata`)
- RPC `applica_ricevuta_sdi`: transizioni post-invio (pec_consegnata/ricevuta_sdi/scaduta/accettata/rifiutata), forward-only per rank
- RPC `override_stato_sdi`: **solo `titolare`**, atomica, con guardia sorgente `mai_inviata` (non si può fare override se la fattura è già stata inviata a SdI — evita di scavalcare uno stato reale con uno dichiarato a mano)

## Tabella `fatture_sdi_eventi` (R1, append-only)
- RLS: **SELECT-only** per i client; guard trigger blocca UPDATE/DELETE anche per `service_role` — l'unico UPDATE ammesso è il completamento della riga proposta (transizione da evento "in attesa" a evento "applicato/quarantena", stesso id).
- Origini: upload manuale (`/api/pec/ricevute`), applicazione (`/api/pec/ricevute/[id]/applica`).
- Ogni ricevuta SdI caricata crea un evento; il ciclo di vita è two-step: upload → (eventualmente) applica.

## Fallback firma quarantena-all (spike XAdES, R1b)
La verifica firma XAdES è **sempre fallita** in produzione: i messaggi SdI reali usano la trasformazione `xmldsig-filter2`, non supportata da `xml-crypto` né `xadesjs`. Confermato da panel advisor 3/3. Documentato in `docs/superpowers/specs/2026-07-16-spike-xades-esito.md`.
**Conseguenze operative:**
- Tutte le ricevute caricate finiscono in **quarantena**, indipendentemente dal contenuto.
- L'unico modo di farle avanzare è **override manuale del titolare** (`stato-sdi-override`) oppure **riverifica** via `/api/pec/ricevute/[id]/applica` (che ritenta la stessa verifica, quindi tipicamente fallisce di nuovo finché il motore firma reale non è pronto).
- **Backlog aperto:** motore firma reale — prerequisiti: 2-3 ricevute SdI reali recenti + trust anchor di produzione, riconfermare `filter2` su SdI v1.8.1; piste: `xmlsec-wasm` in Node/Vercel, patch `filter2` con oracolo `xmlsec1` CLI, fallback microservizio EU-DSS; da completare anche gli eventi già in quarantena referenziati da override passati.
- **Cap «max eventi parcheggiati aperti»**: deliberatamente **NON implementato** — in fallback quarantena-all bloccherebbe l'uso legittimo del sistema. Da introdurre solo col motore firma reale.

## Gotcha operativi
- Contratto **N10** (invio PEC a SdI) intatto: `send-pec` resta l'unico writer di `smtp_inviata`.
- Dedup upload ricevute: per-lab via sha256 (stesso file caricato due volte nello stesso lab → rifiutato).
- Storage `ricevute-sdi/` prefix: riservato al `service_role` (migration `20260716120000`).
- Progressivi E2E consumati: `2026-0001`..`2026-0006`; i temporanei `9999xx` usati nei test transazionali live sono sempre rollbackati, non consumano numerazione reale.

## Endpoint R1 (16/07/2026)
| Route | Note |
|-------|------|
| `POST /api/pec/ricevute` | Upload ricevuta XML, cap 20/24h per lab, dedup sha256, quarantena fail-closed |
| `POST /api/pec/ricevute/[id]/applica` | Riverifica evento in quarantena e applica via RPC |
| `POST /api/fatture/[id]/stato-sdi-override` | Solo `titolare`, RPC `override_stato_sdi`, guardia `mai_inviata` |
| `POST /api/fatture/[id]/sblocca-claim` | Solo `titolare`, RPC `sblocca_claim_fattura` |

Pagina `/fatture/riconciliazioni` — «Da sistemare», 5 gruppi (`fetchPendenzeRiconciliazione`): stornate (escludono re-storno riuscito), parcheggiate (escludono fatture terminali), claim orfani (soglia 1h), stagnanti (CTA «Ho verificato sul portale» solo titolare).

## Issue nota (Codex — alta priorità)
Il batch fatture non ha claim atomico: due richieste concorrenti vedono gli stessi lavori unbilled, creano due fatture separate per gli stessi lavori. Da aggiungere `UPDATE SET incluso_in_fattura = true WHERE NOT incluso_in_fattura` transazionale prima di procedere.

## Issue nota (Codex — alta priorità)
`generaProgressivo()` viene chiamato prima di verificare se esiste già un draft — se la fattura viene rigenerata per un fix XML, il progressivo viene sovrascritto con uno nuovo. Da verificare l'esistenza del draft prima di chiamare la RPC.

## Minor triaged (backlog, da R1)
- Dedup race: violazione 23505 durante upload ricevuta può presentarsi come "duplicata" anche in race condition non malevole — da rivedere il messaggio d'errore.
- Error-handling sul fetch evento cross-route non uniforme.
- Contrasto `--t2`/`--t3` in dark mode è un problema sistemico (non specifico di questa ondata) — deferito.
- CTA override sul gruppo claim orfani: da valutare in mockup futuro.
- «Riprova lo storno» con più TD04 collegate mostra solo l'ultimo numero.
- Badge in `/fatture` esegue l'aggregazione completa per contare le pendenze — da sostituire con una COUNT dedicata.

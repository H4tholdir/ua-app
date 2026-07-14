# N4 — Fonte di verità del prezzo del lavoro — Design Spec

> **Data:** 2026-07-14 · **Owner:** Francesco · **Dominio:** fiscale (FatturaPA) → **percorso GRANDE** (BP-2)
> **Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` §N4
> **Input di design:** brainstorming + 3 advisor specializzati (advisor generale, solution-architect, backend-api).

---

## 1. Problema

Due fonti di prezzo indipendenti, **mai sincronizzate**:
- **Tutta la contabilità B2** (scadenzario, portale dentista, saldi, credito) usa `lavori.prezzo_unitario`.
- **La fattura** (XML + PDF cortesia, `src/lib/fattura/generate-xml.ts:103-106`) usa `sum(lavori_lavorazioni.importo)` se esistono righe, altrimenti `prezzo_unitario` come fallback.

Nessun writer li allinea: il PATCH lavori tocca `prezzo_unitario` senza toccare le righe; `PUT /api/lavori/[id]/lavorazioni` riscrive le righe senza toccare `prezzo_unitario`. **Sintomo dimostrato in QA Ondata 3:** portale/lista mostrano 322 €, la fattura esce a 112 €.

### Evidenza raccolta (chiude il punto cieco "quale valore è corretto")
- L'**unico** writer di `lavori_lavorazioni` è `PUT /api/lavori/[id]/lavorazioni` (soft-delete di tutte le righe attive + insert del set completo = **rimpiazzo integrale, mai parziale**). Nessuna pipeline di import nel codice. → **Le righe, quando esistono, sono autoritative per costruzione.** Il 322/112 era una **fixture di test incoerente** (i due valori impostati indipendentemente), non una semantica reale; i dati di test verranno comunque ripuliti prima della consegna.
- `lavori.prezzo_unitario` è in `LOCKED_PRICE_FIELDS` (`src/app/api/lavori/[id]/route.ts`): editabile via PATCH **finché non `incluso_in_fattura`**. Percorsi UI che lo editano: `LavoriInAttesaSection` (scadenzario), `BatchFatturaSection`. → il percorso di scrittura che la guard deve difendere **è reale**, non ipotetico.
- Le fatture **emesse** sono snapshot congelati: `generaFatturaPA` persiste `imponibile`/`totale`/`bollo`/`xml_storage_path`/`xml_hash_sha256`/`fatture_righe` + snapshot cliente nella riga `fatture` e archivia l'XML. **Nessun read path ri-deriva una fattura emessa dal `lavoro` vivo.** → cambiare la lettura non può alterare documenti storici.

---

## 2. Decisioni di design (approvate in brainstorming)

1. **Modello prezzo = IBRIDO:** `prezzoEffettivo = sum(righe.importo)` se esistono righe attive, altrimenti `prezzo_unitario`.
2. **Derivazione = helper di LETTURA unico** (no migration, no trigger DB, no denormalizzazione). Verità calcolata al momento della lettura.
3. **Write-path scope N4 = guard read-only sul totale** quando esistono righe (l'editor righe vero è rimandato a DS v3 sp.3), **con enforcement server** + eccezione di azzeramento.

---

## 3. Architettura

### 3.1 Helper unico — `src/lib/domain/prezzo-lavoro.ts` (CREATE)

Modulo neutro `domain/` (già ospita `tipi-lavoro.ts`, `cicli-produzione.ts`), upstream sia di `fattura` sia di `contabilita` — la regola è una proprietà del **lavoro**, non appartiene a nessuno dei due domini.

```
// firma canonica — pura, sincrona, definizione UNICA
prezzoEffettivoLavoro(l: {
  prezzo_unitario: number | null
  lavorazioni?: Array<{ importo: number | null }> | null
}): number
```

Regole vincolanti:
- Somma `importo` (totale-riga già calcolato), **NON** `prezzo_unitario × quantita`.
- **Rounding identico all'attuale `generate-xml.ts:104-106`** (somma di `importo` grezzi, nessun round per-riga) → non perturba i totali delle fatture già emesse e allinea contabilità e XML al centesimo.
- **Nessun loader async nell'helper.** Ogni chiamante possiede il proprio fetch ed embedda le righe. Il modulo esporta anche **un SELECT-fragment condiviso** per i consumer money-only.

Funzione gemella per la diagnostica (pura, non-throwing):
```
divergenzaPrezzo(l): { divergente: boolean, deltaCents: number }
// divergente sse esistono righe E prezzo_unitario>0 E |round(sum*100) - round(pu*100)| >= 1
```

### 3.2 Consumer dell'helper (refactor a definizione unica) — ENUMERAZIONE ESAUSTIVA

Ogni lettore di un **totale-lavoro** deve passare per l'helper (embeddando le righe). Lista completa (verificata sul codice):
- `src/lib/fattura/generate-xml.ts:104-106` — **refactor**: sostituire la copia inline. (Il batch `fatture/batch/route.ts:272` eredita — unico chokepoint di emissione.)
- `src/lib/contabilita/queries.ts` — `getContabilitaCliente` (residuo + `lavoriInAttesa.totale`), `getCreditoScadutoPerCliente`.
- `src/lib/contabilita/registra-pagamento.ts:70` — `importoDovuto` (aggiungere embed righe al `.single()`).
- **`src/app/api/portale/[token]/fatturazione/route.ts:79`** — `prezzo: Number(l.prezzo_unitario ?? 0)`: **è la superficie esterna del dentista, letteralmente il "322 €" del §1.** Oggi seleziona `prezzo_unitario` senza embed righe → diventa consumer dell'helper + SELECT-fragment. (Senza questo, la claim single-source è falsa al deploy.)
- **`src/app/api/scadenzario/route.ts:148`** — `calcolaResiduo(Number(l.prezzo_unitario ...))`.
- **`src/app/api/lavori/pronti-da-fatturare/route.ts:50`** — lista candidati batch fattura.
- Altri display lista che mostrano il totale di un lavoro (verificare con il tripwire §4).

**Reader di SNAPSHOT congelato — restano FUORI scope** (leggono i campi persistiti della fattura, mai il lavoro vivo): `src/app/(app)/fatture/page.tsx`, `fatture/[id]/page.tsx`, `src/components/features/pdf/FatturaCortesiaTemplate.tsx`, `src/app/api/fatture/[id]/xml/route.ts`. Il test di regressione §4 blinda che NON importino l'helper.

### 3.3 🔴 Bug di completezza da correggere nello stesso seam
Il prefiltro `.gt('prezzo_unitario', 0)` **a livello DB** = seconda codifica della regola. Con "righe vincono", un lavoro con `prezzo_unitario = 0/null` ma righe che sommano > 0 ha un **credito reale** ma **non viene mai fetchato** → sparisce da crediti / lavori-in-attesa. Esiste in **tre siti** (verificati):
- `src/lib/contabilita/queries.ts:93` (`getCreditoScadutoPerCliente`) e `:225` (`getContabilitaCliente`).
- **`src/app/api/scadenzario/route.ts:77`** — stesso filtro **+ duplica inline** la logica crediti di `getCreditoScadutoPerCliente` (residuo da `prezzo_unitario` grezzo). Divergenza strutturale.

**Fix:** rimuovere il filtro DB di positività e filtrare in codice su `prezzoEffettivoLavoro(l) > 0` dopo l'embed (o allargare il candidate set con `OR(prezzo_unitario>0, has-active-righe)`). **Inoltre** `scadenzario/route.ts` dovrebbe **chiamare `getCreditoScadutoPerCliente`** invece di duplicarla (elimina la terza copia della regola alla radice). Parte dello scope N4, non nota a margine.

### 3.4 Enforcement server della guard read-only (NECESSARIO)
La disabilitazione UI non basta per un importo fiscale: `PATCH /api/lavori/[id]` è autenticato ma qualunque client/integrazione futura potrebbe scrivere `prezzo_unitario` con righe presenti e reintrodurre la divergenza. **Due lock server indipendenti:**
1. `incluso_in_fattura` → tutti i `LOCKED_PRICE_FIELDS` congelati *(già esiste)*.
2. **righe attive presenti** → la PATCH **rifiuta `prezzo_unitario` (422** "prezzo gestito dalle righe di lavorazione"). Aggiungere un `count` di `lavori_lavorazioni where deleted_at is null` accanto al fetch `existing`. *(`listino_id`: bloccarlo è defense-in-depth — non guida il totale una volta che le righe vincono, il margine legge `lavori_lavorazioni.listino_id`; **valutare** in fase di piano se includerlo o lasciarlo al solo lock `incluso_in_fattura`.)*
   - **Carve-out (compone con la divergence guard):** consentire **l'azzeramento a `null`** di `prezzo_unitario` anche con righe presenti — è l'azione di riconciliazione finché non c'è l'editor righe (sp.3). Rifiuto solo dei valori non-null.

### 3.5 Divergence guard fiscale
`divergenzaPrezzo(lavoro)` (§3.1) è puro e calcolato a **read-time**: il **badge non bloccante è quindi già di per sé il segnale durevole e visibile**, ovunque il lavoro sia mostrato, senza log persistenti, colonne nuove o audit-sink. Emissione: **le righe vincono deterministicamente → il numero emesso NON cambia**; la guard protegge dal *fraintendimento*, non dal numero. Nessun `422` duro ora (con `prezzo_unitario` locked e righe non editabili via UI creerebbe un vicolo cieco). **Distinguere i due trigger di `generaFatturaPA`:**

- **Display / portale / scadenzario:** badge non bloccante ("verifica prezzo") quando `divergente` — il segnale durevole (read-time, persiste finché non si riconcilia azzerando `prezzo_unitario`).
- **Percorso OPERATORE (batch, `BatchFatturaSection` → `fatture/batch/route.ts`):** lista di riconciliazione **pre-emissione, per-lavoro** — i lavori divergenti sono evidenziati; l'operatore procede consapevolmente. È un pre-check UI, **nessun cambio di contratto** su `generaFatturaPA`.
- **Percorso AUTOMATICO senza operatore (ramo CONSEGNA, `generate-xml.ts` `else` senza `fatturaId`):** **procede** (numero corretto via righe) — non c'è nessuno a cui chiedere conferma. La divergenza resta **visibile via il badge sul lavoro** dopo l'emissione (segnale durevole read-time). Aggiungere un **log strutturato** best-effort per ops. Mai emissione bloccante qui.
- **Hard-block + conferma esplicita → DS v3 sp.3** (quando esiste una UI di riconciliazione righe). NON aggiungere un precheck batch separato lato server (drift): l'unico calcolo imponibile resta `generate-xml.ts:104`.
- **Tolleranza:** centesimi interi, `|deltaCents| >= 1` (mai epsilon float).

### 3.6 Assertion Natura IVA (assicurazione fiscale)
`generate-xml` hardcoda `<Natura>N4</Natura>` per riga e nel riepilogo. Se una `riga.natura_iva !== 'N4'`, verrebbe silenziosamente appiattita a N4 = errore fiscale. Custom-made è N4-esente quindi oggi tiene, ma aggiungere **assertion in emissione: tutte le righe attive `natura_iva === 'N4'`, altrimenti blocco**.

### 3.7 Fuori scope (esplicito — convertirli è un BUG)
- `src/lib/dashboard/queries.ts` — `getTitolareKpi` (margine, `:187-225`) e `getTecnicoDashboard` (compenso, `:328-350`) calcolano `prezzo_unitario × quantita × listino` a livello riga = **fatturato/margine analitico**, grandezza **diversa** dal totale fatturabile del lavoro. **NON convertire.**
- **Editor righe vero** (fix route PUT orfana + persistenza `TabLavorazioni`) = **DS v3 sp.3**.
- **Branded type `Euro`** (enforcement forte via tsc) = miglioria futura; in N4 si usa il grep-tripwire (vedi 4).

---

## 4. Strategia di test (TDD)

- **Helper puro** (`prezzo-lavoro.test.ts`): righe → somma; no righe → `prezzo_unitario`; `prezzo_unitario` null + no righe → 0; rounding identico a un caso reale di `generate-xml`.
- **`divergenzaPrezzo`**: divergente a `|Δ|≥1` cent; non divergente entro rounding; non divergente se no righe.
- **Consistenza contabilità==fattura**: un lavoro con righe → `getContabilitaCliente` e l'imponibile di `generate-xml` restituiscono lo **stesso** numero (il test di regressione del bug 322/112).
- **Completezza query (3.3)**: un lavoro con `prezzo_unitario=0/null` + righe>0 **compare** in crediti/lavori-in-attesa.
- **PATCH guard (3.4)**: con righe attive, PATCH `prezzo_unitario` non-null → 422; PATCH `prezzo_unitario:null` → accettato; senza righe → accettato come oggi; `incluso_in_fattura` → tutti i LOCKED rifiutati.
- **Natura N4 (3.6)**: emissione con riga `natura_iva!=='N4'` → blocco.
- **Regressione documenti storici**: test che asserisce che i read path delle fatture emesse (`fatture/page.tsx`, `fatture/[id]`, `/xml`) **non importano** `prezzoEffettivoLavoro` (leggono lo snapshot congelato).
- **Grep-tripwire (onesto, non garanzia):** test che segnala nuovi accessi grezzi a `lavori.prezzo_unitario` fuori dall'helper nei moduli-lettori target. **Scope: `src/lib/contabilita/**`, `src/lib/fattura/**`, e `src/app/api/**`** (route che leggono `lavori` — portale/scadenzario/pronti-da-fatturare: è lì che vive il bug, escluderle renderebbe il tripwire cieco proprio dove serve). Nota: `lavori_lavorazioni.prezzo_unitario` (prezzo unitario di riga) collide testualmente → allowlist mirata, etichettato come **tripwire** non enforcement. (Enforcement forte via branded type `Euro` = deferito, §7.)

---

## 5. Rollout & rollback

Solo codice (no migration) → rollback = Vercel "promote previous" / `git revert`. **Asimmetria:**
- Superfici read-only (dashboard, scadenzario, display, preview XML) = 100% reversibili.
- **`registra-pagamento` NON lo è:** conia righe `credito_clienti_movimenti` (tipo `eccedenza`) da `importoDovuto`, che persistono attraverso un rollback del codice.

**Sequenza:** landare prima i consumer read-only, poi `registra-pagamento` separatamente con scrutinio extra + **query di riconciliazione** (lavori dove `prezzoEffettivo ≠ prezzo_unitario`) per auditare eccedenze coniate nella finestra.

**Verifica pre-deploy (decide hot/cold):** contare i lavori prod con righe `lavori_lavorazioni` attive. Se ~0 → `importoDovuto` invariato per tutti i dati vivi = rollout "a freddo" in un colpo. Non assumerlo (dashboard KPI leggono già le righe): il numero decide la postura.

---

## 6. FASE 3 — Validazione architetturale (GATE BP-2)

- **Tenant isolation:** nessun tocco a RLS / `current_lab_id()`. L'helper è puro; le query mantengono i filtri `laboratorio_id` esistenti. Il fix 3.3 rimuove solo un filtro di *positività prezzo*, non un filtro tenant.
- **Schema drift:** **nessuna migration** → nessun `gen types`.
- **API contract:** la PATCH lavori aggiunge un rifiuto 422 per `prezzo_unitario` (e, se incluso in fase di piano, `listino_id`) con righe attive (carve-out: azzeramento a `null` consentito). Nuovo comportamento restrittivo — verificare che i client esistenti (`LavoriInAttesaSection`, `BatchFatturaSection`) non editino `prezzo_unitario` su lavori con righe (oggi le righe nascono solo da import → impatto reale ~0, ma il test lo blinda). Nessun altro cambio di contratto (la divergence guard è read-time/UI, non modifica la firma di `generaFatturaPA`).
- **Rollback:** §5 (read-only prima, `registra-pagamento` dopo, reconciliation query).
- **Dominio critico:** fiscale/FatturaPA → percorso GRANDE (questa spec + review specializzata + piano TDD + review per-task + review finale).

---

## 7. Deferiti (tracciati, NON in N4)
- **DS v3 sp.3:** editor righe nativo (fix PUT orfana + persistenza), UI di riconciliazione, hard-block emissione su divergenza, branded type `Euro` (enforcement forte via tsc).
- **Bollo nel "dovuto" (follow-up dopo N4, non introdotto da N4):** la contabilità calcola dovuto/residuo sull'imponibile **senza bollo** (`queries.ts:270`), mentre la fattura emessa persiste `totale` **con bollo €2** (>77,47€) → lo stesso lavoro salta di €2 passando da non-fatturato a fatturato. Stessa classe di problema (due grandezze non allineate), pre-esistente e fuori scope N4; tracciare come task successivo.
- **N5** (`generaFatturaPA` hardcoda TD01) resta task separato prerequisito delle note di credito TD04.

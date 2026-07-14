# Spec — Quick-win fiscali N6 + N7 (2026-07-14)

> Dominio **FatturaPA** → percorso GRANDE (BP-2). Due item indipendenti,
> stesso worktree, **commit separati**. N7 è codice + TDD; N6 è
> documentazione di un invariante (decisione: opzione C, vedi §2).

## 0. Contesto

Due follow-up emersi durante N4 (14/07/2026), tracciati in
`docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` §N6 e §N7. Nessuno dei due è
stato introdotto da N4: entrambi pre-esistenti. Sono raggruppati come
"quick-win fiscali" perché il contesto del prezzo/fattura è già caldo.

Sono **indipendenti**: N7 non ha decisioni aperte e può procedere subito a
piano/TDD; N6 è una decisione di rappresentazione già presa (§2).

---

## 1. N7 — Gate `stato_sdi` sulla route di generazione XML

### Problema
`POST /api/fatture/[id]/xml` legge `stato_sdi`
([xml/route.ts:65](../../../src/app/api/fatture/[id]/xml/route.ts)) ma **non lo
usa come gate**. Una seconda invocazione su una fattura già `generata`:

1. **Ri-deriva l'imponibile dal lavoro vivo** — `generaFatturaPA` chiama
   `prezzoEffettivoLavoro(lavoro)` al momento della chiamata
   ([generate-xml.ts:115](../../../src/lib/fattura/generate-xml.ts)). Se il
   lavoro è cambiato dopo la prima emissione (righe di lavorazione
   modificate), l'XML rigenerato **diverge** dal PDF/dato già comunicato,
   sovrascrivendo lo snapshot congelato.
2. **Brucia un progressivo SDI** — `generaProgressivo(..., 'sdi_invio')`
   ([generate-xml.ts:86](../../../src/lib/fattura/generate-xml.ts)) consuma un
   nuovo progressivo a **ogni** chiamata, prima di qualsiasi controllo.

### Fix
Gate **allowlist** nella route (coerente con la regola "PATCH allowlist, mai
blocklist" del CLAUDE.md §9): solo `stato_sdi === 'draft'` può procedere;
qualunque altro stato → **409 Conflict**.

**Posizione — critica:** il gate va nella **route**, subito dopo il check di
appartenenza fattura ([xml/route.ts:63-72](../../../src/app/api/fatture/[id]/xml/route.ts)),
**PRIMA** del loop `generaFatturaPA`. Motivi:
- `generaFatturaPA` è **condiviso** con il flusso Consegna auto-emit (ramo
  INSERT, senza `fatturaId`), che non ha una fattura esistente su cui fare
  gate: un gate dentro l'helper sarebbe sbagliato o richiederebbe plumbing
  condizionale.
- Mettere il gate nella route **prima** del loop evita il side-effect di
  bruciare il progressivo SDI (`generaProgressivo` è dentro `generaFatturaPA`).

`fatturaCheck` già seleziona `stato_sdi` (riga 65): nessuna query aggiuntiva.

### Contratto
```
POST /api/fatture/[id]/xml
  fattura.stato_sdi === 'draft'   → procede (comportamento attuale)
  fattura.stato_sdi !== 'draft'   → 409 { error: "Fattura già emessa (stato: <x>). Rigenerazione non consentita." }
```

Valore semantico: 409 (conflitto con lo stato corrente della risorsa), non
422 (che indicherebbe un payload malformato — qui il payload è valido, è lo
stato a impedire l'azione).

### Rischio reale
Basso: nessun percorso UI oggi invoca l'endpoint su una fattura già
`generata`. È una **blindatura** — chiude il buco prima che un client (o un
retry) lo apra.

### Rollback
Rimuovere il blocco di gate. Nessuna migration, nessun dato toccato.

---

## 2. N6 — "Bollo nel dovuto": decisione = C (documenta l'invariante)

### Problema
La contabilità (scadenzario, saldi, credito — tutti i consumer di
`prezzoEffettivoLavoro` in
[queries.ts](../../../src/lib/contabilita/queries.ts)) calcola dovuto/residuo
sull'**imponibile senza bollo**. La fattura persiste `fatture.totale =
imponibile + €2` quando l'imponibile supera 77,47€ (soglia esenzione bollo)
([generate-xml.ts:116-117](../../../src/lib/fattura/generate-xml.ts)). Lo stesso
lavoro "salta" di €2 passando da pre-fattura a fatturato.

### Decisione: C — accetta il salto, documentalo come intenzionale
**Motivazione fiscale (il decisore):** il bollo di €2 è un'imposta
**documentale** che nasce giuridicamente **con l'atto di emissione della
fattura**. Prima che la fattura esista, quell'obbligazione **non esiste
ancora**: il cliente pre-fattura deve davvero solo l'imponibile. Quindi C è la
rappresentazione *più veritiera*, non un compromesso.

Perché **non** A (anticipare il bollo pre-fattura):
- **Non è N4.** N4 erano due sorgenti scollegate che divergevano di importi
  arbitrari sull'intero prezzo. N6 è un delta singolo, deterministico, bounded
  (€2), con semantica chiara. Severità diversa.
- **Anticipare correttamente sarebbe fragile.** Il bollo esiste solo per i
  lavori *effettivamente fatturati*: un `non_fatturare` non avrà **mai** un
  bollo, un `in_attesa` è indeciso. A non è un banale "+2 quando imponibile >
  77,47€": andrebbe condizionato su `decisione_fatturazione === 'fatturare'`,
  più l'approssimazione per-lavoro (la soglia 77,47€ è **per-fattura**, la
  contabilità è **per-lavoro**). Logica condizionale in dominio fiscale per un
  guadagno solo estetico = più rischio che valore.
- **Il salto è mite in UI:** il lavoro non cambia numero sul posto, cambia
  bucket (da "lavori diretti/in attesa" a "fattura").

Perché **non** B: rimuovere il bollo dal `totale` fattura è **fiscalmente
invalido** — il bollo deve stare in `ImportoTotaleDocumento`. Scartata.

### Implementazione (documentazione, zero logica nuova)
Nessun cambiamento al calcolo. Si fissa l'invariante in modo durevole:

1. **Commento invariante** in
   [queries.ts](../../../src/lib/contabilita/queries.ts): un blocco che
   dichiara "la contabilità pre-fattura tiene il dovuto sull'imponibile senza
   bollo; il bollo di €2 (imponibile > 77,47€) matura con l'emissione della
   fattura ed entra in `fatture.totale` — differenza intenzionale, non un
   drift; decisione N6, spec 2026-07-14". Posizionato dove si calcola il
   residuo dei lavori (una volta, punto di verità della lettura).
2. **Invariante di test (opzionale, difensivo):** un test che documenta
   `totale_fattura === imponibile + bollo_atteso` e che
   `prezzoEffettivoLavoro` **non** include il bollo — a protezione della
   regola "il bollo non entra mai in `prezzoEffettivoLavoro`" (che alimenta
   l'imponibile XML e deve restare bollo-free). Se già coperto da test N4,
   basta un'asserzione mirata; altrimenti test nuovo minimale.
3. **BACKLOG §N6 → ✅ documentato** con rimando a questa spec.

### Vincolo permanente (da non violare)
`prezzoEffettivoLavoro` **non deve mai** includere il bollo: alimenta
l'imponibile XML ([generate-xml.ts:115](../../../src/lib/fattura/generate-xml.ts))
che deve restare senza bollo. Il bollo si calcola **una sola volta**, in
`generaFatturaPA`, come `imponibile > 77.47 ? 2.00 : 0`. Questo è già lo stato
del codice: N6-C lo **congela** e lo documenta.

---

## 3. Piano di verifica (FASE 7 — entrambi gli item)
- `npx tsc --noEmit` (0 errori)
- `npx vitest run` (suite verde + nuovi test N7)
- `npx next build`

## 4. QA
- N7: lab E2E `00000000-0000-0000-0000-000000000001`. Emettere una fattura
  (draft → generata), poi ri-invocare `POST /api/fatture/[id]/xml` → attesa
  **409**, progressivo SDI **non** incrementato, XML **non** rigenerato.
- N6: nessuna UI nuova; verifica documentale (commento presente, test verde).
  **Nessun** gate estetico L2 (nessuna superficie UI toccata).

## 5. Rollback complessivo
Entrambi gli item sono commit separati senza migration: `git revert` del
commit N7 o del commit N6 in modo indipendente. Nessun dato/schema toccato.

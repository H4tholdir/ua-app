# Draft a cavallo d'anno — rinumerazione all'emissione (variante d1) — Design

**Data:** 20 luglio 2026 · **Stato:** ratificato da Francesco (sessione 20/07 sera)
**Dominio:** FatturaPA → **percorso GRANDE §0C** (indipendentemente dal numero di file)
**Origine:** handoff 20/07 Punto 2; panel advisor 3× (fiscale/architettura/UX) agli atti nella sessione.

## Decisione ratificata

Francesco, 20/07: «nel caso in cui la bozza è creata a dicembre e richiesta di fatturare a gennaio, i dati della fattura devono essere sempre quelli di gennaio» + meccanica **d1**: «la bozza DIVENTA la fattura di gennaio» — all'emissione la bozza viene **rinumerata** (numero/serie/data dell'anno corrente) e la traccia dell'ex numero resta in `fatture.note`. Nessuna seconda riga, nessuna migration.

**Riserva advisor fiscale (documentata, non bloccante — decisione business di Francesco):** se l'operazione era effettuata a dicembre, la data di gennaio può configurare emissione tardiva (violazione formale €250–2.000, ravvedibile); il campo `note` conserva data e numero della bozza originaria proprio perché il commercialista possa valutare. Fonti nel parere panel (Circ. AdE 14/E 2019, Ris. 1/E 2013, art. 6 D.Lgs 471/97).

## Comportamento

In `generaFatturaPA` (src/lib/fattura/generate-xml.ts), ramo draft (`fatturaId` presente), al punto §2 dove oggi numero/anno/data sono CONGELATI sul draft:

- **Stesso anno** (`draft.anno === annoRoma(adesso)`): comportamento attuale INVARIATO (numero/progressivo/data del draft).
- **Anno precedente** (`draft.anno !== annoRoma(adesso)`): la bozza si rinumera nell'istante unico `adesso` già in scope:
  - `progressivoFattura = generaProgressivo(supabase, laboratorioId, 'fattura', anno)` (serie dell'anno corrente — stessa RPC atomica, unicità garantita)
  - `numero = `${anno}-${String(progressivoFattura).padStart(4, '0')}``
  - `dataFattura = oggiRomaISO(adesso)`
  - traccia per l'UPDATE §12: `exNumero = draft.numero`, `exData = draft.data`

Il XML e il PDF di cortesia usano le variabili `numero`/`dataFattura` valorizzate in §2 → **coerenza automatica** DB/XML/PDF (nessun secondo punto di verità). La serie `sdi_invio` usa già l'anno corrente: invariata.

**UPDATE §12 (solo nel caso rinumerato):** `xmlFields` include anche `numero`, `anno`, `progressivo`, `data` e `note`:
`note = (draft.note ? draft.note + '\n' : '') + 'Rinumerata all'emissione: sostituisce la bozza ' + exNumero + ' del ' + exData + ' (serie anno precedente).'`
Il vecchio numero resta bruciato nella serie chiusa (buco ammesso, Ris. 1/E 2013 — la nota lo motiva).

**Vale per TD01 e TD04** (qualunque draft caricato via `fatturaId`): per il TD04 rinumerato lo snapshot `collegata_numero`/`collegata_data`/`causale_storno` resta INTATTO (riferimento alla fattura stornata, non al numero della bozza).

**Percorsi reali coperti (tutti passano dal ramo `fatturaId`):** emissione via `POST /api/fatture/[id]/xml` di un draft creato con POST /api/fatture · resume TD04 (`nota-credito/route.ts` fase 2/retry) · micro-finestra batch a mezzanotte di capodanno (draft creato alle 23:59:59, `generaFatturaPA` invocato alle 00:00:01 Roma nella stessa richiesta). NB (verificato advisor): l'outbox NON esiste più (smontata con `20260710150000_ondata0_pulizia_outbox`); la RPC `outbox_prepara_draft` ricreata dalla migration date-fiscali del 20/07 è orfana (nessun caller, referenzia tabella droppata) — segnalata a backlog, fuori scope qui.

**Nota operativa (accettata, analoga all'esistente):** la rinumerazione consuma il progressivo nuovo PRIMA degli upload XML/PDF; se l'upload fallisce, il draft resta col numero vecchio e ogni retry brucia un progressivo della serie attiva (buco motivabile, stessa classe dell'esistente). La race di doppia chiamata concorrente su `/xml` (check-then-act su `stato_sdi`) è pre-esistente e resta fuori scope.

**Fuori scope:** guard 422 su POST /api/fatture (invariato) · UI (nessun caller client della route `/xml` oggi; la risposta della route restituisce già la fattura aggiornata col numero definitivo — quando la UI arriverà, mostrare il numero nuovo) · DELETE draft (non serve più: la bozza non resta mai orfana).

## Dettagli implementativi

1. **`DraftRow`** (generate-xml.ts §0): aggiungere `anno: number` e `note: string | null` alla select e al tipo.
2. **§2 ramo `fatturaId`:** sostituire l'assegnazione congelata con il branch stesso-anno/anno-precedente sopra. Variabili di traccia in scope per §12 (es. `let rinumerataDa: { exNumero: string; exData: string } | null = null`).
3. **§12:** se `rinumerataDa`, spread su `xmlFields` di `{ numero, anno, progressivo: progressivoFattura, data: dataFattura, note: <come sopra> }`. Il ramo INSERT (senza fatturaId) resta INTATTO.
4. Aggiornare il commento §2 («ramo draft: numero/anno/data restano CONGELATI — deliberato») che diventa falso: nuovo commento con il riferimento a questa spec.

## Test (TDD — `tests/unit/generate-xml-draft-nye.test.ts`, harness ricalcato sui test generate-xml esistenti)

1. **Draft stesso anno → congelato (regressione):** draft `anno=2026`, clock 15/06/2026 → l'UPDATE non contiene `numero`/`data`/`anno`/`note`; numero nel XML = numero draft.
2. **Draft anno precedente → rinumerato:** draft `numero='2026-0045'`, `anno=2026`, `data='2026-12-28'`, clock **2027-01-02 (via fake timers su istante UTC che è già 2027 a Roma)** → `generaProgressivo` chiamato con serie `'fattura'` e anno `2027`; UPDATE contiene `numero='2027-XXXX'`, `anno=2027`, `data='2027-01-02'`, `note` contenente `'sostituisce la bozza 2026-0045'`; il XML contiene numero e data nuovi.
3. **Capodanno Roma vs UTC:** clock `2026-12-31T23:30:00Z` (= 00:30 di capodanno a Roma) con draft `anno=2026` → RINUMERATO a 2027 (annoRoma decide, non l'anno UTC).
4. **TD04 draft anno precedente:** rinumerato come sopra E `collegata_numero`/`collegata_data` invariati nell'UPDATE/XML.
5. **Nota preesistente:** draft con `note='Nota esistente'` → nuova nota = `'Nota esistente\nRinumerata all'emissione: …'`. `exData` in formato ISO `YYYY-MM-DD` (com'è in `fatture.data`).
6. **Fixture esistenti da aggiornare (richiesto dall'advisor):** i mock draft in `generate-xml-td04.test.ts` (e ogni fixture del ramo fatturaId) NON hanno `anno`/`note` → col nuovo codice `draft.anno === undefined` farebbe scattare il ramo rinumerato silenziosamente. Aggiungere `anno: <anno del clock del test>` e `note: null` alle fixture; il mock `generaProgressivo` (`async () => 42`) diventa una spia per gli assert sull'anno richiesto. Dopo l'adeguamento fixture, i test esistenti devono restare verdi con gli assert INVARIATI.

## Gate FASE 3

- **Tenant isolation:** invariata (stesse query, stesso laboratorio_id).
- **Schema drift:** nessuna migration (`anno`, `note` esistono); nessun gen types.
- **API contract:** la risposta `/xml` può ora tornare un numero diverso da quello del draft — è IL comportamento richiesto; nessun client programmatico esistente dipende dal numero congelato (nessun caller UI della route).
- **Rollback:** revert del merge; le fatture già rinumerate restano valide (numero/data/XML coerenti tra loro).
- **Dominio critico:** FatturaPA → percorso GRANDE: spec (questa) + validazione advisor + piano + worktree + TDD + FASE 7 + review + conferma esplicita di Francesco prima del merge/deploy (da handoff: P2 fuori dalla ratifica T/E).

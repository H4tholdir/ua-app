# Spec — Nota di Credito TD04 (storno totale fattura) — v2 (post-review specialistica)

> Dominio **FatturaPA** → percorso GRANDE (BP-2). Feature multi-sessione.
> v1 rivista da 3 advisor specializzati (fiscale FatturaPA, DB/concorrenza, contabilità/credito) il 2026-07-14.
> Deriva da N5 (backlog): il vero lavoro non è "parametrizzare TD01" ma una capacità TD04 completa. Francesco: opzione B (feature completa).
> **Le sezioni marcate [R1]/[R2]/[R3] recepiscono i reviewer** (fiscale / DB / contabilità).

## 0. Decisioni prese (con Francesco)
- **Trigger:** azione «Emetti nota di credito» su `/fatture/[id]`.
- **Portata:** storno **totale** (no parziale nel MVP).
- **Effetto sul lavoro:** torna **ri-fatturabile** (solo lato decisione di fatturazione — NON clinico, vedi §4b).
- **Fatture pagate:** supportate → generano **credito cliente** (vedi §5, rifondato).

## 1. Contesto verificato (àncore reali)
- `generaFatturaPA` hardcoda `TD01` a generate-xml.ts:235 (XML), :305 (cortesia), :385 (insert). Deriva imponibile/righe/cliente dal **lavoro vivo** (:115, :133, :62) — lavoro-centrico.
- `tipo_documento` esiste end-to-end lato dati/lettura (union `domain.ts:674` include TD04; `POST /api/fatture:141` lo accetta; UI/PDF già etichettano «Nota di credito»). **Nessun writer imposta TD04 oggi.**
- Indice unico: `fatture_lavoro_attiva_unique ON fatture (laboratorio_id, lavoro_id) WHERE lavoro_id IS NOT NULL AND stato_sdi <> 'rifiutata'`.
- Filtro credito (queries.ts:138): scarta `eccedenza` senza `pagamento` attivo. Credito disponibile (saldo.ts:48): `eccedenze - applicazioni - rimborsi`.
- `annulla-consegna/route.ts:56` blocca con 409 «serve una nota di credito» → il caso d'uso.
- Union `StatoSDI` (domain.ts:655-663): `draft`/`generata`/`smtp_inviata`(«NON prova fiscale»)/`pec_consegnata`/`ricevuta_sdi`/`accettata`/`rifiutata`/`scaduta`.
- RPC atomiche pattern: `annulla_consegna_atomica` (imitare), `crea_rifacimento_atomico` (007).
- Gate N7 (mergiato): `POST /api/fatture/[id]/xml` → 409 se `stato_sdi != 'draft'`.

## 2. Modello dati (migration) [R2]
Nuove colonne `fatture`:
- `fattura_collegata_id uuid NULL REFERENCES fatture(id)` — solo sul TD04 → originale.
- `collegata_numero text NULL`, `collegata_data date NULL` — snapshot congelato (per `<DatiFattureCollegate>`).
- `causale_storno text NULL` — motivo (→ `<Causale>` + UI).
- `stornata_at timestamptz NULL` — sull'originale, quando un TD04 la storna.

Il TD04 porta **`lavoro_id = NULL`**.

**Indice:** DROP + CREATE **in-transaction** (NON `CONCURRENTLY`: non ammesso nella migration Supabase e aprirebbe una finestra senza unicità). `ADD COLUMN stornata_at` **prima** del CREATE. Nuovo predicato:
`... WHERE lavoro_id IS NOT NULL AND stato_sdi <> 'rifiutata' AND stornata_at IS NULL`
Il predicato rimuove righe (nessun nuovo 23505), nessun backfill.

**Backstop unico [R2-C1]:** `CREATE UNIQUE INDEX ON fatture (laboratorio_id, fattura_collegata_id) WHERE fattura_collegata_id IS NOT NULL AND stato_sdi <> 'rifiutata'` — un solo TD04 attivo per originale.

**CHECK constraint [R2-I2]** (aggiungere `NOT VALID` poi `VALIDATE`, evita ACCESS EXCLUSIVE lungo):
```sql
CHECK (
  (tipo_documento = 'TD04' AND fattura_collegata_id IS NOT NULL AND lavoro_id IS NULL
     AND collegata_numero IS NOT NULL AND collegata_data IS NOT NULL AND causale_storno IS NOT NULL)
  OR (tipo_documento <> 'TD04' AND fattura_collegata_id IS NULL)
)
```
Le righe esistenti (TD01, `fattura_collegata_id` NULL) soddisfano già il ramo 2.

## 3. Estensione `generaFatturaPA` — percorso TD04 dedicato [R1-C2][R2-I6]
**Non** un semplice `if`: percorso parallelo che legge **solo** dallo snapshot della riga TD04, mai dal lavoro (il TD04 ha `lavoro_id NULL`). Assertion difensiva: se `tipo_documento='TD04'` e si tenta di leggere `lavoro.lavorazioni` → throw (blindatura anti trappola-N7).
- `<TipoDocumento>TD04</TipoDocumento>`.
- **`<DatiFattureCollegate>`** [R1-I1]: figlio di `DatiGenerali`, **fratello di `DatiGeneraliDocumento`**, emesso **dopo** `</DatiGeneraliDocumento>` e **prima** di `</DatiGenerali>` (sequence XSD ordinata — posizione sbagliata = scarto SdI). Contenuto: `<IdDocumento>{collegata_numero}</IdDocumento><Data>{collegata_data}</Data>`.
- **`<Causale>`** [R1-I3]: opzionale XSD ma resa obbligatoria in UI; `String1_200Latin`, max 200 char per elemento, **ripetibile** → se > 200 char splittare in più `<Causale>`, mai troncare. Applicare `xe()`.
- **`<ImportoTotaleDocumento>`** e **`<DatiRiepilogo>`** [R1-I1]: positivi, coerenti; imponibile = `fatture.imponibile` congelato dell'originale; Natura N4, Imposta 0, RiferimentoNormativo invariato.
- **Riga sintetica unica**: `Storno integrale fattura n. {collegata_numero} del {collegata_data}`, importi positivi.
- `<Data>` documento = **oggi** (data emissione NC); la data originale vive **solo** in `DatiFattureCollegate/Data` [R1-M2].
- Cedente = laboratorio; cessionario = **snapshot cliente congelato del TD04** (copiato dall'originale, non `cliente` live) [R1-M3].
  > **Amendment 2026-07-15:** identità fiscale dallo snapshot; blocco Sede (comune/provincia/CAP) dal registro clienti a generation-time, come il percorso TD01 — lo snapshot non contiene i campi strutturali richiesti dall'XSD (Comune minLength=1). Decisione controller in esecuzione, da ratificare da Francesco.

## 4. RPC atomica `emetti_nota_credito_atomica(p_originale_id, p_causale, p_laboratorio_id)` [R2]
Ordine corretto (**claim → effetti atomici → XML fuori RPC**):

**0. Claim winner-takes-all [R2-C1]** (prima istruzione):
```sql
UPDATE fatture SET stornata_at = now()
 WHERE id = p_originale_id AND laboratorio_id = p_laboratorio_id
   AND stornata_at IS NULL AND tipo_documento = 'TD01'
   AND stato_sdi IN ('smtp_inviata','pec_consegnata','ricevuta_sdi','accettata','scaduta');  -- gate pragmatico, vedi §7.3
GET DIAGNOSTICS v_rows = ROW_COUNT;
IF v_rows = 0 THEN RETURN json_build_object('esito','non_stornabile'); END IF;
```
Solo il winner prosegue → nessun doppio TD04, nessun progressivo bruciato dal loser.

**1. Effetti atomici** (stessa transazione RPC): progressivo fattura (SQL nella RPC per minimizzare gap [R2-M3]) → insert draft TD04 (snapshot cliente/imponibile dall'originale, `fattura_collegata_id`, snapshot numero/data, causale, `lavoro_id NULL`) → credito cliente se pagata (§5) → reset lavoro (§4b).

**2. XML/PDF (fuori RPC, retryable)** [R2-I3]: `generaFatturaPA(td04Id)` genera+archivia (draft → generata). Resume idempotente: al retry **trova** il TD04 esistente per `fattura_collegata_id = originale AND stato_sdi IN ('draft','generata')` e riprende solo la generazione — mai secondo TD04, mai nuovo progressivo.

**Sicurezza [R2-I5]:** `SECURITY DEFINER SET search_path = public, pg_temp`, `REVOKE ALL FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE TO service_role`. `p_laboratorio_id` esplicito, filtrato in **ogni** statement (difesa in profondità oltre al pre-check di route).

### 4b. Reset lavoro — SOLO fiscale [R2-I1]
Insieme minimo: `incluso_in_fattura = false`, `decisione_fatturazione = 'in_attesa'`. **NIENTE altro** — NON toccare `stato`, `conformato`, `data_consegna_effettiva`, `dichiarazioni_conformita` (il dispositivo È consegnato, la DdC è un artefatto MDR reale). Copiare il reset dell'annullo = violazione MDR.

## 5. Fattura pagata → credito cliente — RIFONDATO [R3-C3/C4/I1]
**NON** usare `eccedenza` legata a un `pagamento_id` (sparirebbe se pagata con credito o se il pagamento viene poi sostituito/annullato). **Introdurre un tipo di movimento dedicato `storno`** in `credito_clienti_movimenti`:
- Importo = `importo_pagato` dell'originale, **senza** dipendenza da un `pagamento_id`.
- `calcolaCreditoDisponibile` (saldo.ts:48) lo somma come **+credito**: `eccedenze + storni - applicazioni - rimborsi`.
- `fetchMovimentiCreditoValidi` (queries.ts:138): il tipo `storno` **non** viene gateato sullo stato di un pagamento (il credito da storno è un fatto fiscale indipendente da come fu incassato l'originale).
- Segno confermato corretto (positivo = credito a favore cliente). Risolve C3, C4, I1 in un colpo.

## 6. AUDIT superfici di lettura — OBBLIGATORIO [R2-C2][R3]
La feature NON è completa senza toccare i lettori (altrimenti fatturato fantasma + clienti doppio-debitori).

**Gruppo A — Dovuti/Scadenzario/Credito** (aggiungere `stornata_at IS NULL` **E** `tipo_documento != 'TD04'`):
- `queries.ts` `getContabilitaCliente` (query fatture :189-196)
- `queries.ts` `getCreditoScadutoPerCliente` (:63-70) — copre Dashboard Titolare + `admin/labs/[id]/live` + widget Front Desk
- `src/app/api/scadenzario/route.ts` GET (:52-59)

**Gruppo B — Ricavo/Fatturato/Export** (il TD04 va trattato come **negativo nel mese di emissione**; **NON** aggiungere `stornata_at` — l'originale resta nel suo mese):
- `20260702185348_b2_contabilita_clienti.sql` `refresh_dashboard_cache` (`SUM(f.totale)` :299-315)
- `src/lib/dashboard/queries.ts` `getTrendMensile` (:375)
- `src/app/api/fatture/export/route.ts` (CSV commercialista — TD04 come nota di credito/negativo)

**Gruppo C — Re-fatturabilità portale** (aggiungere `AND stornata_at IS NULL` al filtro `fatture.lavoro_id`):
- `src/app/api/portale/[token]/fatturazione/route.ts` GET (:60-70)
- `src/app/api/portale/[token]/fatturazione/[lavoro_id]/route.ts` POST (gate 409 :39-52)
- Indice `fatture_lavoro_attiva_unique` → già coperto (§2). ✔ La route **batch** (writer TD01 lab-side) NON è rotta (si affida al 23505).

**Gruppo D — Modello credito** (§5): `fetchMovimentiCreditoValidi` + `calcolaCreditoDisponibile` → nuovo tipo `storno`.

**Gruppo E — Rendiconto pagamenti** (opzionale): `getPagamentiCliente` (:349) → valutare `stornata_at IS NULL` o etichettare stornata [R3-I2].

## 7. Punti aperti / decisioni
1. **Bollo TD04** [R1-I2]: default = rispecchia la regola dell'originale (imponibile > 77,47€ → €2). Shippable e **senza sanzione** (sovra-versare il bollo non è sanzionato; AdE flagga comunque in Elenco B). Punti fermi: il bollo dell'originale resta **assolto e non recuperabile** (mai importo negativo); se al cliente era stato addebitato €2 in rivalsa e il credito glielo restituisce, l'`ImportoTotaleDocumento` del TD04 deve includerlo per coerenza col credito concesso. **Flag commercialista.**
2. **Serie numerazione** [R1-#2]: **RISOLTO** — serie unica condivisa (`generaProgressivo('fattura')`) è legittima (Art. 21 c.2 DPR 633/72; Ris. 1/E 2013). Serie dedicata = polish opzionale.
3. **Gate `stato_sdi`** [R1-C1] — **DECISO (Francesco, gate pragmatico):** l'app oggi porta le fatture al massimo a `smtp_inviata` (PEC inviata a `sdi01@pec.fatturapa.it`); nessun writer avanza oltre (nessun tracking ricevute/notifiche SdI). Per non nascere dormiente, lo storno è **consentito da `smtp_inviata` in su**: `stato_sdi IN ('smtp_inviata','pec_consegnata','ricevuta_sdi','accettata','scaduta')`. **Vietato** su `draft`/`generata` (mai inviata → si elimina/rigenera) e `rifiutata` (non emessa). **Caveat documentato:** `smtp_inviata` non è prova di accettazione SdI; quando si aggiungerà il tracking ricevute PEC/notifiche SdI si potrà restringere il gate. (Fiscalmente il reviewer raccomandava solo gli stati SdI-accettati — deviazione consapevole per usabilità immediata, tracciata qui.)
4. **TD04 rifiutato da SdI** [R2-M2][R3-M1]: se il TD04 finisce `rifiutata`, l'originale è già `stornata_at`-set → serve consentire il ri-storno (azzerare `stornata_at` alla ricezione del rifiuto, o gate che ammette ri-storno se il TD04 esistente è `rifiutata`).

## 8. Verifica / QA
- FASE 6b (gen types + tsc dopo migration). FASE 7 (tsc+vitest+build). Content-check XML (TD04, DatiFattureCollegate in posizione corretta, Causale, ImportoTotaleDocumento/DatiRiepilogo, importi positivi). QA lab E2E: storno di fattura pagata / parzialmente pagata / non pagata + pagata-con-credito → verifica contabilità (no fatturato fantasma, no doppio debitore), credito cliente corretto, lavoro ri-fatturabile (lab + portale), no 23505, doppio-tap → un solo TD04.

## 9. Scope / decomposizione (multi-sessione)
Slice indicativo: (T1) migration + backstop + CHECK + gen types; (T2) generaFatturaPA percorso TD04 (XML completo); (T3) RPC atomica claim-first + reset fiscale; (T4) credito `storno` (modello + calcolo + filtro); (T5) AUDIT letture Gruppi A/B/C/E; (T6) API route; (T7) UI `/fatture/[id]` + gate estetico L2; (T8) resume/idempotenza + gate rifiutata. Deliverable oggi: **questa spec**. Build separato.

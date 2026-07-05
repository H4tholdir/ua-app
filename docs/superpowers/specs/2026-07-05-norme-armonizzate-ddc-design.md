# Norme armonizzate applicate — popolamento e rendering su DdC (MDR §7)

**Data:** 05/07/2026
**Origine:** scoperto durante B4 (`generate-ddc.ts` type-safety) — `dichiarazioni_conformita.norme_json` esiste nello schema ma non è mai popolato né renderizzato.
**Stato:** Design approvato, in attesa di piano implementativo

## Problema

`dichiarazioni_conformita.norme_json` (JSONB, `[{codice, titolo, anno}]`) è pensato per l'elenco delle normative armonizzate applicate al dispositivo, ma `generateDdC()` non lo valorizza mai (resta sempre `null`), e `DdcTemplate.tsx` non lo renderizza da nessuna parte — anche se venisse popolato, oggi non comparirebbe sul PDF.

## Analisi normativa (ANALISI/17)

L'elenco delle normative armonizzate applicate è un requisito del **Fascicolo Tecnico** (Art. 10(4) + Allegato II/III MDR 2017/745), non uno degli 8 elementi obbligatori della Dichiarazione di Conformità stessa (Allegato XIII §1). Gap reale ma non bloccante: `lavori.norma_riferimento` (singolare, già mostrato in §6 del DdC) copre già il caso comune (1-2 norme per dispositivo dentale). Decisione presa con Francesco: implementare comunque il fix completo, per consentire l'elenco di più norme applicate direttamente sulla DdC.

## Design

### Parte 1 — Schema (estensione minima, non nuova tabella)

`rischi_tipo_dispositivo` è già la lookup per-lab/per-tipo-dispositivo che alimenta la DdC (`rischi_residui_snapshot`). Decisione esplicita: estendere questa tabella invece di crearne una parallela `norme_tipo_dispositivo` — stessa RLS, stessa API, stesso editor, molto meno codice nuovo.

Migration additiva:
```sql
ALTER TABLE rischi_tipo_dispositivo
  ADD COLUMN norme_json JSONB NOT NULL DEFAULT '[]';
```
Nessun backfill necessario (default `'[]'` per le righe esistenti), nessuna nuova policy RLS (la tabella è già scoped su `laboratorio_id`).

Struttura di ogni elemento: `{codice: string, titolo: string, anno?: number}` — stessa forma già documentata nel commento SQL di `dichiarazioni_conformita.norme_json`.

### Parte 2 — API e UI (estensione dell'esistente)

**`PATCH /api/qualita/rischi/[id]`** (`src/app/api/qualita/rischi/[id]/route.ts`): la funzione di validazione `validaRischi` (righe 20-62) guadagna un validatore gemello per `norme_json` — array di oggetti con `codice`/`titolo` stringhe non vuote dopo trim, `anno` opzionale (se presente, intero). Nessun ID auto-generato (a differenza di `RischioItem`, non serve un identificatore `R01`/`R02` per le norme — l'array è ordinato per rilevanza, non referenziato altrove). Il salvataggio aggiorna `versione`/`data_ultima_revisione` esattamente come già avviene per `rischi_json`.

**`POST /api/qualita/rischi`** (`src/app/api/qualita/rischi/route.ts`): campo opzionale `norme_json` nell'upsert, default `[]` — stesso pattern degli altri campi opzionali già gestiti lì.

**`RischiEditor.tsx`**: nuova sezione "Norme armonizzate applicate" (card con lo stesso stile della sezione rischi), array di righe `{codice, titolo, anno?}` editabili con bottone "+ Aggiungi norma" — stesso `saving`/`error` state condiviso col salvataggio esistente, un solo bottone "Salva" per l'intero form (rischi + norme insieme, non due salvataggi separati).

### Parte 3 — `generate-ddc.ts` + rendering PDF

**Query estesa**: la select esistente su `rischi_tipo_dispositivo` (oggi `'rischi_residui'`) diventa `'rischi_residui, norme_json'`.

**Snapshot nell'insert**: `norme_json: rischiRow?.norme_json ?? []` aggiunto all'oggetto `ddc`. A differenza di `norma_riferimento` (colonna fantasma, esclusa dall'insert nel fix B4 — vedi `docs/superpowers/specs/2026-07-05-b4-pdf-generators-type-safety-design.md`), `norme_json` **è** una colonna reale su `dichiarazioni_conformita` — entra nell'oggetto base `ddc` inviato sia al DB sia al template, nessuno split necessario.

**Domain type** (`src/types/domain.ts`, interfaccia `DichiarazioneConformita`): campo mancante aggiunto:
```typescript
norme_json: Array<{ codice: string; titolo: string; anno?: number }> | null;
```
(stesso tipo di gap già trovato per `testo_rischi_default` durante B4 — un campo che esiste nello schema DB ma non era mai stato propagato al tipo applicativo.)

**Template (`DdcTemplate.tsx`)**: nuova sezione condizionale, subito dopo §6 — Classificazione MDR (dove già vive `ddc.norma_riferimento`, singolare), renderizzata solo se l'array non è vuoto:
```tsx
{ddc.norme_json && ddc.norme_json.length > 0 ? (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>§6-bis — Norme Armonizzate Applicate</Text>
    {ddc.norme_json.map((norma, i) => (
      <Text key={i} style={styles.value}>
        • {norma.codice} — {norma.titolo}{norma.anno ? ` (${norma.anno})` : ''}
      </Text>
    ))}
  </View>
) : null}
```
Placeholder di sezione scelto come "§6-bis" (non rinumera §7/§8 esistenti — i numeri di sezione non sono un requisito MDR letterale, sono etichette descrittive del template).

### Parte 4 — Test (TDD)

1. **`tests/unit/qualita-rischi-id-route.test.ts`**: nuovi casi RED→GREEN per la validazione `norme_json` (array non valido, `codice`/`titolo` vuoti, `anno` non numerico se presente) + un caso di successo con norme valorizzate e persistite.
2. **`POST /api/qualita/rischi`**: solo il campo opzionale aggiunto nell'upsert — nessuna nuova suite di test per l'intera rotta (oggi priva di test, gap preesistente fuori scope).
3. **`tests/unit/RischiEditor.test.tsx`**: nuovo caso che verifica il rendering della sezione "Norme armonizzate" e che il salvataggio includa `norme_json` nel payload PATCH.
4. **`tests/unit/generate-ddc.test.ts`**: 2 nuovi casi — norme presenti in `rischi_tipo_dispositivo` → finiscono nell'oggetto passato all'insert; nessuna riga trovata → fallback a `[]`.
5. **`tests/unit/ddc-pdf-content.test.ts`**: un caso con `norme_json` popolato nella fixture → il testo estratto dal PDF contiene `codice`/`titolo` delle norme; `DDC_FIXTURE` aggiorna il campo mancante (stesso pattern di `testo_rischi_default` in B4, Task 1).

## File toccati

- `supabase/migrations/<timestamp>_norme_armonizzate_ddc.sql` (nuovo)
- `src/types/database.types.ts` (rigenerato dopo la migration)
- `src/types/domain.ts` (campo `norme_json` su `DichiarazioneConformita`)
- `src/app/api/qualita/rischi/route.ts`, `src/app/api/qualita/rischi/[id]/route.ts`
- `src/components/features/qualita/RischiEditor.tsx`
- `src/lib/pdf/generate-ddc.ts`
- `src/components/features/pdf/DdcTemplate.tsx`
- `tests/unit/qualita-rischi-id-route.test.ts`, `tests/unit/RischiEditor.test.tsx`, `tests/unit/generate-ddc.test.ts`, `tests/unit/ddc-pdf-content.test.ts`

## Fuori scope

- Tabella separata `norme_tipo_dispositivo` (scartata, vedi Parte 1)
- Copertura test per `POST /api/qualita/rischi` nel suo complesso (gap preesistente, non introdotto da questo lavoro)
- Verifica/gating in `precheck-mdr.ts` sulla presenza di norme armonizzate (non è un requisito della DdC stessa, solo del Fascicolo Tecnico — nessuna azione)

## Effort

Stima: 3-4 ore (estensione di pattern esistenti su 7 file, 1 migration additiva, nessuna nuova infrastruttura).

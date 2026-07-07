# B20 — Differenziazione PSUR/PMS Report per classe di rischio del dispositivo

**Data:** 07/07/2026
**Stato:** design approvato in brainstorming, in attesa di review scritta finale
**Dominio:** critico (normativa MDR) — percorso GRANDE obbligatorio (CLAUDE.md §0C)

---

## 1. Contesto

`src/app/(app)/qualita/psur/page.tsx` e `src/app/api/qualita/psur/route.ts` trattano oggi l'obbligo di sorveglianza post-vendita come un unico documento generico "PSUR — MDR Art. 86", con un solo record annuale per laboratorio (`UNIQUE(laboratorio_id, anno_riferimento)` sulla tabella `psur`) e alert di scadenza annuale fisso, indipendentemente dai dispositivi realmente prodotti.

Il campo `classe_rischio` esiste già su `lavori` (e su `dichiarazioni_conformita`, `cicli_produzione`, `listino`) ma non è mai referenziato né dalla pagina né dalla route PSUR (verificato con grep, zero occorrenze).

## 2. Problema normativo

Verificato con ricerca a fonti primarie (testo consolidato EUR-Lex Reg. UE 2017/745 + **MDCG 2025-10**, dicembre 2025, guidance più recente specifica sui custom-made device; corroborato da MDCG 2022-21 e MDCG 2021-3):

- **L'esenzione dei dispositivi su misura (custom-made) riguarda solo la valutazione di conformità** (Art. 52(8), Capo V — marcatura CE, Allegato XIII invece dell'Allegato IV). **Non si estende alla sorveglianza post-vendita.** Art. 83(1): *"For each device, manufacturers shall plan, establish, document, implement, maintain and update a post-market surveillance system in a manner that is proportionate to the risk class."* MDCG 2025-10 §3.2, testualmente: *"The PMS requirements according to Article 83 MDR are applicable to all devices including Custom-Made Devices."*
- **Un laboratorio con dispositivi di classi diverse deve tenere DUE documenti distinti e coesistenti**, non un report unico: MDCG 2025-10 — *"For class I devices, the CMD manufacturer must establish a PMS report according to Article 85 MDR whereas, for classes IIa, IIb and III devices, a [...] PSUR [...] must be established. Both [...] should be part of the CMD documentation according to section 2 of Annex XIII MDR."*
- **Cadenze (Art. 86(1)):** Classe IIb/III → almeno annuale; Classe IIa → "quando necessario, almeno ogni 2 anni". **Classe I (Art. 85):** nessuna cadenza fissa, PMS Report aggiornato "quando necessario" — non si chiama "PSUR".
- **Raggruppamento:** Art. 86(1) ammette report "per dispositivo o, ove rilevante, per categoria/gruppo di dispositivi". MDCG 2025-10 nota 9 e MDCG 2021-3 indicano che per i custom-made il raggruppamento corretto segue "stesso uso previsto, materiali, processi, design" — non necessariamente coincidente con la sola classe di rischio.
- **Nessuna guida ufficiale specifica per piccoli laboratori odontotecnici** su soglie o template semplificati — punto esplicitamente non normato, trattato qui come estrapolazione applicativa.

## 3. Decisioni di design (approvate in brainstorming)

1. **Modello dati:** un record per **gruppo-classe** per anno per laboratorio (non un record unico con sezioni interne, non un solo documento "più stringente" che assorbe gli altri).
2. **Granularità dei gruppi — 3 gruppi:** `classe_i` (PMS Report), `classe_iia` (PSUR biennale), `classe_iib_iii` (PSUR annuale, IIb e III accorpate).
   > ⚠️ **Decisione da confermare esplicitamente in review:** accorpare IIb e III in un solo gruppo/documento è una **semplificazione pratica** (condividono la stessa cadenza annuale), non una lettura letterale di MDCG 2025-10/2021-3, che raggrupperebbe per uso previsto/materiali/processo/design, non per sola classe di rischio. Scelta dichiarata qui per restare implementabile con i dati oggi disponibili (`classe_rischio` è l'unico campo di categorizzazione strutturato); IIb e III restano comunque distinguibili nei dati sottostanti (`lavori.classe_rischio`) se in futuro servisse disaggregarle.
3. **Rilevamento gruppi attivi:** automatico dai `classe_rischio` distinti presenti tra i `lavori` del laboratorio — mostrare solo le sezioni pertinenti, non 3 slot fissi.
4. **Alert classe I (PMS Report):** nessuna scadenza/"mancante" (normativamente non esiste), solo promemoria soft (`alertLivello: 'info'`) se sono passati più di 365 giorni dall'ultimo.
5. **Dati esistenti:** tabella `psur` verificata vuota in produzione (`SELECT count(*) → 0`, incluso il lab E2E) — cutover pulito, nessun backfill necessario.

## 4. Architettura

### 4.1 Migration

Nuovo file `supabase/migrations/20260707_psur_gruppo_classe.sql`:

```sql
ALTER TABLE psur ADD COLUMN gruppo_classe TEXT NOT NULL
  CHECK (gruppo_classe IN ('classe_i', 'classe_iia', 'classe_iib_iii'));

ALTER TABLE psur DROP CONSTRAINT psur_laboratorio_id_anno_riferimento_key; -- nome verificato via pg_constraint il 07/07/2026: UNIQUE (laboratorio_id, anno_riferimento)
ALTER TABLE psur ADD CONSTRAINT psur_lab_anno_gruppo_key
  UNIQUE (laboratorio_id, anno_riferimento, gruppo_classe);
```

`NOT NULL` senza default è sicuro: tabella verificata a 0 righe (query diretta `SELECT count(*) FROM psur` sul DB live, incluso il lab E2E) il 07/07/2026 prima di scrivere questo spec. Da rieseguire un controllo immediatamente prima di applicare la migration (FASE 6b), nel caso sia stato scritto qualcosa nel frattempo.

Dopo l'applicazione: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` + `npx tsc --noEmit` (Migration Gate, CLAUDE.md FASE 6b).

### 4.2 Domain types (`src/types/domain.ts`)

- `type GruppoClassePsur = 'classe_i' | 'classe_iia' | 'classe_iib_iii'`
- `Psur.gruppo_classe: GruppoClassePsur` aggiunto all'interfaccia esistente
- `CLASSE_RISCHIO_TO_GRUPPO: Record<ClasseRischio, GruppoClassePsur>` — unica fonte di verità del mapping, usata sia dalla route (filtro aggregati) sia dalla UI (rilevamento gruppi):
  ```ts
  { classe_i: 'classe_i', classe_iia: 'classe_iia', classe_iib: 'classe_iib_iii', classe_iii: 'classe_iib_iii' }
  ```

### 4.3 Funzione pura `getStatoSorveglianza` (`src/lib/utils/sorveglianza-postvendita.ts`)

Stesso pattern di `isTrialExpiringSoon()` (B15) — logica di cadenza/alert non persistita, calcolata a runtime.

```ts
function getStatoSorveglianza(
  gruppoClasse: GruppoClassePsur,
  ultimaData: string | null,
  now?: Date
): {
  tipoDocumento: 'PMS Report' | 'PSUR'
  cadenzaLabel: string
  scaduto: boolean
  alertLivello: 'nessuno' | 'info' | 'urgente'
}
```

Matrice di comportamento (base della suite di test TDD, soglie in **giorni esatti** per evitare l'ambiguità di "mesi"):

| gruppo | ultimaData | tipoDocumento | scaduto | alertLivello |
|---|---|---|---|---|
| classe_i | `null` | PMS Report | false | `info` ("nessun PMS Report ancora creato") |
| classe_i | ≤365gg fa | PMS Report | false | `nessuno` |
| classe_i | >365gg fa | PMS Report | false (mai scaduto per classe I) | `info` (promemoria soft) |
| classe_iia | `null` | PSUR | **true** | `urgente` |
| classe_iia | ≤730gg fa | PSUR | false | `nessuno` |
| classe_iia | >730gg fa | PSUR | true | `urgente` |
| classe_iib_iii | `null` | PSUR | **true** | `urgente` |
| classe_iib_iii | ≤365gg fa | PSUR | false | `nessuno` |
| classe_iib_iii | >365gg fa | PSUR | true | `urgente` |

`ultimaData === null` (nessun report mai creato) è lo **stato di default per ogni laboratorio nuovo**, non un edge case: per i gruppi con cadenza fissa (IIa, IIb/III) equivale a "mai fatto quanto dovuto" → scaduto/urgente fin da subito.

### 4.4 Route API (`src/app/api/qualita/psur/route.ts`)

**GET** — estesa per ritornare:
```ts
{
  psurList: Psur[],  // include gruppo_classe
  gruppiRilevati: GruppoClassePsur[],  // da classe_rischio distinti in lavori, mappati
  nonClassificabili: number  // count di lavori con classe_rischio fuori dalle 4 attese
}
```

`lavori.classe_rischio` è `TEXT NOT NULL` a DB (non un vero enum — solo la union TS lo vincola) — qualunque valore imprevisto (vuoto, legacy, refuso) **non viene mai scartato in silenzio**: viene contato in `nonClassificabili` e segnalato in UI. Questo è il fail-closed richiesto per un dominio di sorveglianza post-vendita: un dispositivo che sparisse silenziosamente da ogni report violerebbe l'obbligo Art. 83 di sorveglianza proporzionata, esattamente la classe di bug (dato caricato e scartato) già vista in B5/B17.

**POST** — richiede `gruppo_classe` nel body:
- 400 se non è uno dei 3 valori ammessi
- Filtra gli aggregati (`lavori`, `lavori_fasi`, `incidenti_mdr`, rifacimenti) con `classe_rischio IN (...)` mappata dal gruppo (es. `classe_iib_iii` → `['classe_iib','classe_iii']`)
- Se l'aggregato risulta a zero (nessun lavoro di quella classe nel periodo), l'insert procede comunque: è uno **stato esplicito legittimo** ("nessuna attività per questa classe nel periodo"), non un errore né un caso da bloccare
- 409 su violazione del nuovo vincolo UNIQUE (stesso lab+anno+gruppo già esistente) — pattern già in uso
- 500 generico su errore Supabase nelle query di aggregazione (fail-closed, pattern B5/B10 già consolidato — mai esporre `error.message` grezzo)

### 4.5 UI (`qualita/psur/page.tsx`)

- Sezioni ordinate `classe_i` → `classe_iia` → `classe_iib_iii`, renderizzate solo per i gruppi in `gruppiRilevati`
- **Etichetta e cadenza SEMPRE lette da `getStatoSorveglianza().tipoDocumento`/`cadenzaLabel`** — le stringhe hardcoded attuali "PSUR"/"Art. 86" (righe ~73, 123) vengono rimosse. **Criterio di accettazione verificabile:** `grep -n "PSUR\|Art. 86" src/app/\(app\)/qualita/psur/page.tsx` non deve produrre match nella sezione `classe_i`.
- Banner visibile se `nonClassificabili > 0`: "N lavori non classificabili per classe di rischio — verificare i dati anagrafici".
- Bottone "Genera [tipoDocumento] per [anno]" per gruppo, disabilitato se esiste già un record per quell'anno+gruppo (pattern invariato).

## 5. FASE 3 — Validazione architetturale (gate BP-2, obbligatorio)

- **Tenant isolation:** nessuna nuova policy RLS necessaria — `gruppo_classe` è coperta dalla policy esistente su `psur` scoped a `laboratorio_id = current_lab_id()`.
- **Schema drift:** sì, migration presente → `supabase gen types` + `tsc --noEmit` obbligatori subito dopo l'apply (FASE 6b).
- **API contract:** la forma della risposta GET cambia (nuovi campi `gruppiRilevati`/`nonClassificabili`), ma ha un solo consumer interno (`qualita/psur/page.tsx`) — modificati nello stesso task, nessun client esterno rotto.
- **Dominio critico:** sì (MDR, Art. 83/85/86) → percorso GRANDE (GSD + Superpowers) automatico, confermato.

## 6. Rollback

**Non pulitamente reversibile una volta in uso.** Rimuovere `gruppo_classe` è banale finché esiste al più un record per lab-anno; ma ripristinare `UNIQUE(laboratorio_id, anno_riferimento)` **fallisce** nel momento in cui un laboratorio ha già più righe per lo stesso anno (il caso normale a regime, essendo l'intero scopo della modifica). Il rollback è sicuro solo **prima** che venga scritta la prima riga multi-gruppo; dopo, richiede prima una migration di collasso/eliminazione righe. Da tenere presente per qualunque decisione di rollback post-deploy — non scoprirlo in quel momento.

## 7. Testing

- Suite esaustiva su `getStatoSorveglianza` (10 casi della matrice §4.3, inclusi i confini esatti 365/730gg e `null`)
- Round-trip test su `CLASSE_RISCHIO_TO_GRUPPO` (tutte e 4 le classi mappate, nessuna esclusa)
- Route test: filtro corretto per gruppo/classe; nuovo edge case TDD per `classe_rischio` non mappata (mai scartata, sempre contata); 400 su gruppo invalido; 409 su duplicato lab+anno+gruppo; 500 fail-closed su errore Supabase
- Component test pagina: rendering condizionale delle sezioni per gruppo rilevato; assenza di stringhe "PSUR"/"Art. 86" hardcoded nella sezione classe_i (grep o snapshot test); banner `nonClassificabili` visibile solo quando >0

## 8. Scope esplicitamente escluso (follow-up futuri, non B20)

- Raggruppamento più fine per "uso previsto/materiali/processo/design" (MDCG 2025-10) invece che per sola classe di rischio — oggi non ci sono dati strutturati sufficienti (`classe_rischio` è l'unico campo di categorizzazione disponibile)
- Template/contenuto dettagliato del PDF PMS Report/PSUR (questo spec copre solo il modello dati/alert/UI di tracking, non un nuovo generatore PDF — verificare se serve in una sessione separata)
- Guida normativa dedicata a piccoli laboratori artigianali (non esiste una fonte MDCG specifica, verificato)

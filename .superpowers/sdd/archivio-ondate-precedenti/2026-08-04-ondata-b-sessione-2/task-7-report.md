# Task 7 — Report: «Igiene dichiarata» (Allegato XIII, stato annullata, indice parziale)

Branch: `ondata-b-sessione-2` (repo principale, MAI worktree). Nessuna migration: `schema.sql` è la
fotografia dello schema, non un file eseguito — correzioni SOLO testuali.

## 0. Riscopatura Task 4 (verifica preliminare)

Confermato PRIMA di iniziare: `supabase/schema.sql:1292-1300` porta già il commento con la
`CREATE POLICY "ddc_laboratorio_update"` di rollback (chiusura Task 4, commit `39a782d0`). Non
toccato, non rifatto.

## 1. Cosa è stato cambiato — prima/dopo

### 1.1 `supabase/schema.sql` — «Allegato IV» → «Allegato XIII» (3 righe)

I numeri di riga del censimento erano ancora esatti (verificato col testo, non solo col numero).

**Prima versione (sbagliata, corretta dopo un giro di self-review con l'advisor — vedi §3):** avevo
lasciato «12» a riga 878 e riusato la numerazione interna `§5`/`§6` a riga 903/919 come se fosse la
numerazione ufficiale dell'Allegato XIII. Entrambe sbagliate:
- riga 878 con «12» diventava un'affermazione FALSA appena affiancata ad «Allegato XIII» — la
  riga 1190 dello stesso file dichiara «**8** elementi obbligatori Allegato XIII punto 1», quindi
  «12 elementi... (Allegato XIII MDR)» si sarebbe auto-contraddetto nello stesso file, esattamente
  nel dominio che questo task esiste per ripulire;
- righe 903/919 con `§5`/`§6` implicavano una sotto-numerazione ufficiale dell'Allegato XIII che
  non esiste in quella forma (l'Allegato XIII è strutturato in punti 1-4; `§1`...`§12` è una
  numerazione INTERNA di questo progetto per le colonne di `dichiarazioni_conformita`, visibile ai
  commenti `-- MDR §N:` fra riga 1202 e 1246 — non un rimando ufficiale al testo di legge).

**Versione finale, applicata:**

| Riga | Prima (Allegato IV) | Dopo (Allegato XIII, corretto) |
|---|---|---|
| 878 | `-- Contiene i 12 elementi obbligatori per la DoC (Allegato IV MDR)` | `-- Contiene gli elementi obbligatori per la DoC (Allegato XIII MDR)` |
| 903 | `  -- Tipo e descrizione dispositivo (MDR Allegato IV §5)` | `  -- Tipo e descrizione dispositivo (MDR Allegato XIII p.1)` |
| 919 | `  -- MDR — Classificazione (Allegato IV §6 — classe rischio)` | `  -- MDR — Classificazione (Allegato XIII p.1 — classe rischio)` |

Il numero «12» è stato TOLTO invece che riscritto in «8»: la riga 1190 conta gli elementi del
punto 1 per la tabella `dichiarazioni_conformita` (un'entità diversa da `lavori`, dove vive la riga
878), quindi non avevo evidenza che «8» fosse il numero corretto anche per questo commento — fail
closed (R-P1): meglio non affermare una cifra che non riesco a verificare, piuttosto che sostituire
un numero falso con un altro non provato. Le righe 903/919 adottano la forma «(MDR Allegato XIII
p.1)» che il brief offre esplicitamente come esempio («dove il commento parla di contenuti della
DoC»), invece di inventare una sotto-numerazione ufficiale che l'Allegato XIII non ha.

Riga 1189 (già corretta) NON toccata. Verifica finale: `grep -n "Allegato IV" supabase/schema.sql`
→ **solo** la riga 1189 (la negazione corretta) rimane.

### 1.2 `supabase/schema.sql` — fotografia DdC allineata al DB vivo

**CHECK stato (riga 1265-1266)** — aggiunto `'annullata'`:
```
- CHECK (stato IN ('bozza','generata','firmata','consegnata')),
+ CHECK (stato IN ('bozza','generata','firmata','consegnata','annullata')),
```
Confermato che è l'unica occorrenza di quel pattern nel file (`grep -n
"bozza','generata','firmata','consegnata"` → 1 hit, quello appena modificato).

**Commento sopra la UNIQUE (riga 1275, ora 1275-1279)** — riscritto perché falso: diceva «Una DoC
per lavoro (relazione 1:1 per lo standard)», ma quella UNIQUE è su `(laboratorio_id, anno_ddc,
progressivo_ddc)` — il numero, non il lavoro. Nuovo testo:
```sql
  -- Backstop della numerazione: un numero (anno_ddc, progressivo_ddc) non si
  -- ripete per laboratorio. NON è questo il vincolo "una DdC per lavoro" —
  -- quello è l'indice parziale ddc_lavoro_attiva_unique (sotto, dopo gli
  -- indici), che ammette N annullate + 1 attiva per lavoro_id.
  UNIQUE (laboratorio_id, anno_ddc, progressivo_ddc)
```

**Indice parziale fotografato (dopo il blocco indici, ora righe 1313-1319)** — non esisteva prima
nella fotografia (lo schema.sql non è mai stato riallineato dopo la migration del 20260710090000):
```sql
-- Vincolo vero "una DdC per lavoro": indice UNIQUE parziale, non la UNIQUE
-- sopra su (anno_ddc, progressivo_ddc), che è solo il backstop del numero.
-- Ammette N annullate + 1 attiva per lavoro_id. Origine:
-- supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql:15-17.
CREATE UNIQUE INDEX ddc_lavoro_attiva_unique
  ON dichiarazioni_conformita (laboratorio_id, lavoro_id)
  WHERE stato <> 'annullata';
```
Testo dell'indice copiato dal contenuto reale della migration (letta prima di scrivere), con
`public.` tolto per coerenza con lo stile locale del file (nessun altro `CREATE TABLE`/`CREATE
INDEX` in questa sezione usa il prefisso schema).

### 1.3 `src/types/domain.ts:605` (era `:574` nel censimento — slittato dalle sessioni precedenti)

```
- stato: 'bozza' | 'generata' | 'firmata' | 'consegnata';
+ stato: 'bozza' | 'generata' | 'firmata' | 'consegnata' | 'annullata';
```
Unica occorrenza nel repo di quella union (`grep -rn "'bozza' | 'generata' | 'firmata' |
'consegnata'" src/ tests/` → 1 hit, quello modificato). Coerente col runtime:
`src/lib/pdf/generate-ddc.ts:102` e `:222` fanno già `.neq('stato', 'annullata')`.

### 1.4 `tests/unit/generate-ddc.test.ts:190-197` (conteggio riverificato)

Riverificato con lo script usa-e-getta indicato dal brief:
```
$ npx tsx scripts/tmp/verifica-conteggio-ddc.ts
=== TOTALE dichiarazioni_conformita in archivio: 6 ===
DDC-2026-0002  stato=generata   template_version=NULL     payload_sha256=NULL           created_at=2026-07-06
DDC-2026-0003  stato=generata   template_version=NULL     payload_sha256=NULL           created_at=2026-07-06
DDC-2026-0001  stato=annullata  template_version=NULL     payload_sha256=NULL           created_at=2026-07-22
DDC-2026-0002  stato=annullata  template_version=ddc-v1   payload_sha256=(valorizzato)  created_at=2026-07-31
DDC-2026-0003  stato=annullata  template_version=ddc-v1   payload_sha256=(valorizzato)  created_at=2026-08-01
DDC-2026-0004  stato=annullata  template_version=ddc-v1   payload_sha256=(valorizzato)  created_at=2026-08-03
Righe con template_version NON NULL: 3 su 6
```
Conferma esatta i numeri del brief: 6 in archivio, 2 `generata` pre-v1 (NULL, del 06/07), 4
`annullata` di cui 3 con `ddc-v1` + impronta valorizzata (la quarta, del 22/07, resta NULL — non
menzionata nel nuovo commento per non sovra-specificare oltre il dato richiesto). Commento
riscritto mantenendo lo stile (nota datata con fonte), asserzioni del test NON toccate.

## 2. Verifiche — output reale (rieseguite DOPO le correzioni di §3, testo finale)

```
$ npx tsc --noEmit
(nessun output — zero errori)

$ npx vitest run tests/unit/generate-ddc.test.ts
 Test Files  1 passed (1)
      Tests  23 passed (23)

$ node scripts/guardia-coerenza-documenti.mjs
=== Guardia coerenza documenti — 3 documenti vivi controllati ===
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
```

## 3. Self-review (giro con l'advisor PRIMA del commit)

L'advisor ha trovato due difetti reali nella prima stesura di §1.1 (dettaglio già integrato sopra,
non ripetuto qui):
1. avevo lasciato «12» a riga 878 dopo il cambio Allegato IV → XIII, creando un'affermazione nuova
   e falsa (contraddetta dalla riga 1190 dello stesso file, che dichiara 8 elementi per il punto 1
   dell'Allegato XIII sulla tabella `dichiarazioni_conformita`);
2. a righe 903/919 avevo riusato la numerazione interna `§5`/`§6` (quella delle colonne di
   `dichiarazioni_conformita`, righe 1202-1246) come se fosse la numerazione ufficiale
   dell'Allegato XIII, che invece è strutturato in punti 1-4, non in dodici paragrafi.

Corretti entrambi (§1.1), poi riverificato che nessun'altra riga del file assumesse i vecchi
riferimenti (§1.1, verifica finale grep) e rieseguito `tsc --noEmit` + il file di test (§2,
output identico: 0 errori, 23/23 PASS — le correzioni erano solo nei commenti, nessuna aspettativa
del test poteva cambiare).

- Diff finale (`git diff --stat`): 3 file, `src/types/domain.ts` (+1/-1), `supabase/schema.sql`
  (+21/-5), `tests/unit/generate-ddc.test.ts` (+7/-6). Nessun file fuori mandato toccato.
- `grep -n "Allegato IV" supabase/schema.sql` post-modifica → solo riga 1189 (corretta, non
  toccata). `grep -rn "Allegato IV" src/` → zero hit (nessuna occorrenza viva nel codice
  applicativo, mai c'era).
- Ampliare la union in `domain.ts` è un allargamento (widening): se qualche `switch`/narrowing
  esaustivo su `stato` esistesse altrove, `tsc --noEmit` l'avrebbe segnalato come errore di
  esaustività — non è successo (0 errori sull'intero repo).
- Blank-line prima della sezione successiva (`BUONI_CONSEGNA`) resta doppia dopo l'inserimento
  del nuovo indice, coerente con la convenzione a due righe vuote tra sezioni usata altrove nel
  file.

## 4. R-E2 — difetti trovati fuori dal mandato di questo task (SOLO segnalati, non corretti)

**4.1 — Contraddizione interna in uno spec doc.** `docs/superpowers/specs/2026-05-15-ua-spec-completo.md:369`
ha una riga di tabella «Numero DdC disponibile (progressivo) | Allegato IV §11 MDR» che contraddice
la riga 381 dello stesso file («DdC segue **Allegato XIII** (non Allegato IV che è per CE-marked
devices)»). Fuori mandato (non è uno dei quattro file assegnati); è documentazione di spec, non
schema/codice/test.

**4.2 — Stesso riferimento errato in codice-esempio dentro un piano storico.**
`docs/superpowers/plans/2026-05-15-plan-b-core-flows.md:907` porta `riferimento: 'Allegato IV §11
MDR — numerazione DdC obbligatoria'` dentro un blocco di codice TypeScript di esempio (validazione
pre-consegna). È un piano archiviato (`docs/superpowers/plans/`), non live: nessuna occorrenza di
«Allegato IV» esiste in `src/` (verificato, `grep -rn` → zero hit). Non corretto: fuori mandato.

**4.3 — Il percorso citato nel nuovo commento del test non è tracciato.** `scripts/tmp/` è in
`.gitignore` (righe 50 e 136; confermato con `git check-ignore -v`), quindi
`scripts/tmp/verifica-conteggio-ddc.ts` esiste su disco ma non entra nel commit: un lettore futuro
che apra il repo a quel percorso non lo trova. Il brief ordina esplicitamente questa citazione
("citare `scripts/tmp/verifica-conteggio-ddc.ts`"), quindi l'ho mantenuta — non è una scelta mia da
disfare — ma segnalo che è la stessa natura di riferimento «usa e getta» già presente nei task
precedenti (Task 4, §7 del suo report, script analoghi mai commitati): l'output reale della query è
comunque preservato qui in §1.4, non solo nel commento del test, così il numero resta verificabile
anche se lo script locale viene rigenerato o cancellato.

Nessun altro difetto trovato fuori mandato durante il lavoro di questo task.

## 5. Commit

`9e352972` — `docs(schema): fotografia DdC allineata (Allegato XIII, stato annullata, indice parziale) + union domain (ondata B ②)`

File: `supabase/schema.sql`, `src/types/domain.ts`, `tests/unit/generate-ddc.test.ts` (3 file
staccati per nome, verificato `git status --short` pre-commit — nient'altro incluso). Pre-commit
hook passato pulito: ESLint, guardia DS v2.3/v3, guardia CSRF, guardia coerenza documenti, guardia
salvataggio automatico — tutte verdi.

## Fix post-review

Il commit `9e352972` (sopra) aveva a sua volta introdotto DUE abbinamenti normativi nuovi e MAI
provati, in `supabase/schema.sql`, colati dentro le stesse righe corrette da «Allegato IV» ad
«Allegato XIII»: la riga 919 affermava che la classe di rischio è fra i contenuti dell'Allegato
XIII punto 1 (falso — la classificazione viene dalle regole dell'Allegato VIII, non dalla
dichiarazione di conformità), e la riga 903 portava un «p.1» interpretativo mai presente nella
forma usata altrove nel file (riga 878, «Allegato XIII MDR» senza «p.1»). Trovato dalla review,
corretto qui secondo lo statuto delle fonti del progetto (§7 di `../CLAUDE.md`): senza una delle
quattro prove ammesse, l'abbinamento si toglie, non si inventa una sostituzione diversa.

### Prima/dopo

| Riga | Prima (non provato) | Dopo (corretto) |
|---|---|---|
| 903 | `-- Tipo e descrizione dispositivo (MDR Allegato XIII p.1)` | `-- Tipo e descrizione dispositivo (Allegato XIII MDR)` |
| 919 | `-- MDR — Classificazione (Allegato XIII p.1 — classe rischio)` | `-- MDR — Classificazione (classe di rischio)` |

Riga 903: allineata alla stessa forma già usata a riga 878 (`Allegato XIII MDR`, senza «p.1»,
nessuna pretesa di citare il punto esatto). Riga 919: tolto ogni riferimento ad allegati — la
colonna serve alla classificazione interna del lavoro, e un abbinamento normativo richiederebbe
una fonte (Allegato VIII, non Allegato XIII) che questo task non porta. Righe 878 e 1189 NON
toccate (già corrette, fuori mandato di questa correzione).

### Verifiche eseguite (output reale)

```
$ npx tsc --noEmit
(nessun output — zero errori)

$ npx vitest run tests/unit/generate-ddc.test.ts
 Test Files  1 passed (1)
      Tests  23 passed (23)
```

### Commit

`16f71ab5` — `fix(schema): via gli abbinamenti Allegato XIII p.1 non provati dai commenti classificazione/tipo (review Task 7)`

File: solo `supabase/schema.sql` (2 righe di commento, `+2/-2`). Pre-commit hook passato pulito:
ESLint/lint-staged (nessun file JS/TS staged, skip), guardia DS v2.3/v3, guardia CSRF, guardia
coerenza documenti, guardia salvataggio automatico — tutte verdi.

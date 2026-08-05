# D42 — Le tinte del manufatto · Piano di attuazione
### ~~PARTE 1~~ → **l'ondata per intero** (D121, 03/08/2026: il passo del wizard esce e va alla sua ondata)

> **Per chi esegue:** SOTTO-SKILL RICHIESTA — `superpowers:subagent-driven-development` (consigliata) o
> `superpowers:executing-plans`, **un task alla volta a un esecutore fresco (R-E1)**, con revisione
> indipendente fra l'uno e l'altro e l'istruzione esplicita di **cercare dove questo piano sbaglia**.
> Un difetto trovato fuori dal proprio mandato si **riferisce**, non si corregge di nascosto (R-E2).

**Obiettivo:** dare una casa al colore **non dentale** dei tre tipi che ne hanno uno — placca con vite,
apparecchio funzionale, paradenti — con un catalogo separato, il vincolo nel database, e le due superfici
dove la tinta si legge e si corregge.

**Architettura:** catalogo pubblico in sola lettura `tinte_manufatto` (chiave `famiglia`+`codice`), due
colonne su `lavori` con chiave esterna composita, e tre vincoli di riga. La normalizzazione del valore
vive **nel server**, in un modulo unico chiamato dalla PATCH, sulla forma già collaudata di
`risolviColoreCaso`.

**Stack:** Postgres/Supabase · Next.js 16 App Router · TypeScript · Vitest · DS v3.

**Spec:** `docs/superpowers/specs/2026-08-03-tinte-manufatto-design.md` (D109-D120)
**Mockup approvato:** `docs/design/mockups/2026-08-03-tinte-manufatto-due-tavolozze.html` — **variante A**,
griglia di pastiglie, righe ad altezza fissa 60 (D119).

---

## 🛑 PERCHÉ IL PASSO DEL WIZARD NON STA QUI — ✅ **DECISO da D121, 03/08/2026**

> 🔄 **Questa sezione poneva una domanda. D121 le ha dato risposta: il passo del wizard NON si costruisce
> in questa ondata**, né agganciando l'impalcatura né bullonando un quarto passo numerato. Nasce dentro
> l'ondata che costruisce le schermate del wizard, accanto a denti · colore · foto · cassetta.
> **Quindi questo piano è D42 per intero, non «la parte 1»**, e non esiste una parte 2 da scrivere dopo.
> Verbale: tornata **38** · spec §5, emendata per rinvio.
> 🔑 **Il fatto che ha chiuso la domanda** (obiezione di Francesco, verificata sul documento): la spec
> ratificata dell'ondata (b) §4 dice «*il blocco "Se vuoi, aggiungi" sparisce: elemento e colore diventano
> passi propri, la foto diventa il passo di D8*». Le tre righe facoltative di oggi sono **già condannate
> dal progetto**: qualunque scorciatoia costruita dentro di loro andrebbe demolita con loro.

La spec (D112 · D118) chiedeva **tre** superfici: il passo del wizard, la pagina di modifica, la scheda in
sola lettura. **Le ultime due stanno qui. Il passo del wizard no**, e non per pigrizia:

`provato:` `grep -rn "sequenzaPassi\|SEQUENZA_CANONICA\|NomePasso\|passoSuccessivo\|passoPrecedente" src/ | grep -v "src/lib/wizard/"` → **nessun riscontro.**
`provato:` `WizardNuovoLavoro.tsx:50-59` → `passo: 1 | 2 | 3`, un **numero**.
`provato:` `persistenza.ts:12-24` → la bozza salvata porta `v: 1` e `passo: StatoWizard['passo']`, cioè lo stesso numero.

**Che cosa significa.** L'impalcatura dei passi adattivi (`NomePasso`, `SEQUENZA_CANONICA`,
`sequenzaPassi`, i quattro navigatori) **esiste, ha le sue prove, e non è agganciata a nessuna schermata**:
la usano solo i suoi test. Il wizard vero è ancora a **tre passi numerati** e si ferma al paziente.

**Quindi aggiungere «il passo della tinta» non è aggiungere un passo:** o si aggancia l'impalcatura
adattiva alla shell — che è il lavoro rimasto aperto dell'ondata (b), tocca la bozza salvata a 24 ore e va
in `v: 2` — oppure si bulloni un quarto passo numerato al modello vecchio, che poi andrà disfatto.
~~**È una decisione, e spetta a Francesco.**~~ ✅ **Presa: D121 — nessuna delle due, il passo va alla sua
ondata.** ⚠️ E il `v: 2` di quella riga sopra **è un'etichetta già prenotata**: la spec dell'ondata (b) §7
la assegna a un altro contenuto (`cognome`, `nome`, `pazienteIdScelto`, `denti`, `colori`). Chi costruirà
quel passo ne usi un'altra, o due bozze diverse si scambieranno per la stessa —
`persistenza.ts:69` è l'unica guardia di forma e guarda **solo** il numero di versione.

✅ **Questo piano è software funzionante da sé:** dopo l'ultimo task una tinta si registra, si vede, si
corregge, sopravvive a un rifacimento e non può essere sbagliata. Il wizard la aggiungerà alla creazione
quando arriverà la sua ondata; oggi la si mette dalla scheda, che è il posto che la direttiva del 27/07
rende comunque obbligatorio.

---

## Vincoli globali — valgono per OGNI task

- **Ruoli: sono CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. Mai `admin` nudo.
- **RLS:** `public.current_lab_id()`, **mai** `auth.current_lab_id()`.
- **Migration:** NON aggiungere `BEGIN;`/`COMMIT;` — il runner Supabase avvolge già la migration.
- **Le migration si applicano A MANO** (`npx supabase db push --yes`): il CI non le applica.
- **FASE 6b dopo ogni migration:** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` + `npx tsc --noEmit`.
- **Motion:** mai `duration` inline. Pagine v3 → `src/design-system/v3/motion.ts`.
- **Colori:** mai hex inline nei componenti. Token da `src/design-system/v3/tokens.ts`.
- **Le sonde girano su transazione ANNULLATA o schema usa-e-getta**, MAI su una migration registrata.
- **Salvataggio:** mai `git add -A`; messaggio in un file **fuori dal repo**, `git commit -F <file>`.
- **Ramo dedicato NEL REPO PRINCIPALE:** `git checkout -b tinte-manufatto`. 🛑 **Mai un git worktree.**

---

## R-P2 — Registro delle letture

L'elenco **non l'ha deciso l'autore del piano**: è l'esito del censimento R-P6 qui sotto.

| file | esito |
|---|---|
| `supabase/migrations/20260727120000_lavori_denti.sql` | **letto: righe 11-38** — forma del catalogo pubblico, `hex` nullable con la ragione |
| `supabase/migrations/20260727120100_lavori_denti_tabella.sql` | **letto: righe 1-80** — vincoli di coppia, FK composita, RLS |
| `supabase/migrations/20260727120200_lavori_colore_caso.sql` | **letto: righe 1-35** — le due colonne di caso su `lavori` e i loro vincoli |
| `supabase/migrations/20260728103000_rifacimento_clona_denti_colore.sql` | **letto: righe 8-35, 68, 103-138, 203** — `crea_rifacimento_atomico`, elenco colonne clonate |
| `src/lib/domain/tipi-lavoro.ts` | **letto: righe 1-45, 47-77** — i 38 tipi, `prevedeColore`, le macro |
| `src/lib/domain/colore-dente.ts` | **letto: righe 1-40, 55-80, 112, 135-153** — la coppia, `SCALA_DI_CODICE`, `idrataColoreScheda` |
| `src/lib/api/colore-caso.ts` | **letto: per intero (1-101)** — è la forma che `risolviTinta` ricalca |
| `src/app/api/lavori/[id]/route.ts` | **letto: righe 98-128, 178-215, 381-440** — allowlist, blocco di normalizzazione, ordine dei controlli |
| `src/lib/wizard/passi.ts` | **letto: righe 36-70** — `NomePasso`, `SEQUENZA_CANONICA` |
| `src/lib/wizard/sequenza-passi.ts` | **letto: righe 60-110** — il confronto stretto `=== 'catalogo'` che cita D42 |
| `src/lib/wizard/persistenza.ts` | **letto: righe 1-45** — `StatoSalvato`, `v: 1` |
| `src/components/features/wizard/WizardNuovoLavoro.tsx` | **letto: righe 50-90, 530-546** — `passo: 1|2|3`, il wizard finisce al paziente |
| `src/components/features/wizard/PassoPaziente.tsx` | **letto: righe 35-100** — il colore è **testo libero** |
| `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` | **letto: righe 398-440** — `CardInfo`, `RigaDato`, `RigaEditabile`, `RigaLavoroDenti` |
| `src/components/ds/CardInfo.tsx` | **letto: righe 27-45** — `RigaDato.valore` è un `ReactNode` |
| `src/components/features/lavori/scheda-v3/RigaLavoroDenti.tsx` | **letto: righe 31-39** — il pattern «riga che porta alla pagina di modifica» |
| `src/components/features/lavori/form/TabClinica.tsx` | **letto: righe 1-30** — l'elenco cablato dei 19 codici, e lo stile dei campi |
| `src/components/features/lavori/LavoroFormClient.tsx` | **letto: righe 42-57, 169** — `idrataColoreScheda`, il montaggio dei tab |
| `src/app/(app)/lavori/[id]/modifica/page.tsx` | **letto: riga 94** — la pagina si dichiara `data-ds="v3"` |
| `src/hooks/useLavoroForm.ts` | **NON letto** — l'esecutore del **Task 8** lo apre per primo: è lui che decide come il campo nuovo entra nel payload della PATCH, e questo piano **non** presume la sua forma |
| `src/app/api/lavori/route.ts` (POST) | **NON letto** — la creazione con tinta è **parte 2** (il wizard). L'esecutore del **Task 5** verifica che il POST **non** rompa: la tinta è nullable e nessuno la manda |
| `supabase/migrations/20260727120300_lavori_denti_rpc.sql` | **NON letto** — `lavoro_crea_atomico` non tocca la tinta in questa parte. Da aprire in parte 2 |

---

## R-P6 — Censimento degli identificatori

**Non solo le colonne.** Ogni nome che il cambiamento crea, tocca o toglie.

### Nomi NUOVI in banca dati
| identificatore | tipo | dove nasce |
|---|---|---|
| `tinte_manufatto` | tabella | Task 1 |
| `famiglia`, `codice`, `nome`, `ordine`, `hex` | colonne di `tinte_manufatto` | Task 1 |
| `'resina_ortodontica'`, `'sport'` | valori ammessi di `famiglia` | Task 1 |
| `tinte_manufatto_famiglia_ck` | CHECK | Task 1 |
| `tinte_manufatto_codice_ck` | CHECK (forma del codice) | Task 1 |
| `tinte_manufatto_hex_ck` | CHECK (forma dell'esadecimale) | Task 1 |
| `lavori.tinta_famiglia`, `lavori.tinta_codice` | colonne | Task 2 |
| `lavori_tinta_coppia_ck` | CHECK | Task 2 |
| `lavori_tinta_fk` | FOREIGN KEY composita | Task 2 |
| `lavori_tinta_tipo_ck` | CHECK famiglia↔categoria grossa | Task 2 |

### Nomi NUOVI nel codice
| identificatore | dove |
|---|---|
| `FamigliaTinta` (tipo), `FAMIGLIE_TINTA`, `macroDiFamiglia`, `famigliaDiMacro` — più `PER_MACRO`, che resta **privato** (non esportato) | `src/lib/domain/tinta.ts` (Task 3) 🆕 da creare |
| `TintaManufatto` (tipo riga di catalogo) | `src/lib/domain/tinta.ts` (Task 3) 🆕 da creare |
| `Tinta`, `NESSUNA_TINTA`, `risolviTinta` | `src/lib/api/tinta.ts` (Task 4) 🆕 da creare |
| `tinta_rimossa` | campo **opzionale** della risposta PATCH (Task 5) |
| `TavolozzaTinte` | componente (Task 8) |
| `RigaTinta` — **NON serve**: `RigaDato.valore` accetta già un `ReactNode` (`CardInfo.tsx:29`) | Task 7 |

### Nomi ESISTENTI che il cambiamento tocca
| identificatore | che cosa cambia | rischio se sbagliato |
|---|---|---|
| `PATCHABLE_FIELDS` (`src/app/api/lavori/[id]/route.ts:178`) | **+2 chiavi** | 🔴 senza questo la PATCH **scarta in silenzio**: l'utente legge «Salvato» su un dato che non c'è |
| `tipo_dispositivo` (già in allowlist, riga 179) | il suo cambio ora può **togliere** la tinta (D117) | 🔴 senza il trattamento, il CHECK fa fallire una correzione legittima con un errore grezzo |
| `crea_rifacimento_atomico` (elenco colonne dell'INSERT) | **+2 colonne** | 🔴 il rifacimento perderebbe la tinta — è **il difetto più grave del collaudo dell'ondata (a)**, ripetuto |
| `MACRO_SLUGS` / `LABEL_MACRO` (`tipi-lavoro.ts`) | **letti, non modificati** — la corrispondenza li usa | il piano NON aggiunge macro |
| `prevedeColore` (`tipi-lavoro.ts`) | **letto, non modificato** in parte 1 | il valore `'libero'` resta senza passo finché non arriva la parte 2 |
| `src/types/database.types.ts` | **rigenerato** (FASE 6b) | il file è generato: mai a mano |

### Nomi che NON si toccano, dichiarato
`colori_dentali` e le sue **cinque** chiavi esterne · `colore_scala`/`colore_codice` · `lavori_denti` e le
tre zone del ceramista · `risolviColoreCaso` (si **ricalca**, non si modifica) · `SEQUENZA_CANONICA` e
`NomePasso` (parte 2).

---

## R-P1 — Registro delle prove

🛑 **Fail-closed: un blocco senza marchio è NON provato.** Sotto, che cosa è stato **misurato scrivendo il
piano** e che cosa nasce da provare.

| assunzione | marchio |
|---|---|
| `colori_dentali` non ha RLS ed è un catalogo pubblico | `provato:` letto `20260727120000_lavori_denti.sql:11-12` |
| I tre tipi con tinta sono gli **unici** con tinta sotto le loro macro | `provato:` `grep "macro: 'ortodonzia'\|macro: 'bite_splint'" src/lib/domain/tipi-lavoro.ts` → 8 righe, 3 con `prevedeColore: 'libero'`, 5 con `'nessuno'` |
| `tipo_dispositivo` è già correggibile dall'API | `provato:` letto `route.ts:179` |
| `RigaDato.valore` accetta un nodo React | `provato:` letto `CardInfo.tsx:29` |
| L'impalcatura adattiva non è agganciata | `provato:` grep senza riscontri (v. sopra) |
| **Il CHECK famiglia↔macro rifiuta davvero l'abbinamento sbagliato** | 🔴 `non eseguito` — **si prova nel Task 2, con un valore che DEVE essere rifiutato** |
| **Il `NULL` resta ammesso su qualunque tipo** | 🔴 `non eseguito` — Task 2 |
| **La FK composita rifiuta una tinta inesistente** | 🔴 `non eseguito` — Task 2 |
| **`crea_rifacimento_atomico` porta la tinta** | 🔴 `non eseguito` — Task 6 |
| Tutto il codice TypeScript di questo piano | 🔴 `non eseguito` — nasce sotto test, Task per Task |

---

## Struttura dei file

**Creati**
- `supabase/migrations/20260803140000_tinte_manufatto.sql` — catalogo + contenuto 🆕 *(da creare)*
- `supabase/migrations/20260803140100_lavori_tinta.sql` — le due colonne e i tre vincoli 🆕 *(da creare)*
- `supabase/migrations/20260803140200_rifacimento_clona_tinta.sql` — la RPC estesa 🆕 *(da creare)*
- `src/lib/domain/tinta.ts` — famiglie, corrispondenza con le macro. **Nessun accesso al database.** 🆕 *(da creare)*
- `src/lib/api/tinta.ts` — `risolviTinta`, la normalizzazione **server-side** 🆕 *(da creare)*
- `src/components/features/lavori/TavolozzaTinte.tsx` — la griglia (variante A) 🆕 *(da creare)*
- `tests/unit/tinta-dominio.test.ts` · `tests/unit/tinta-risolvi.test.ts` · `tests/unit/tinte-patch.test.ts` · `tests/unit/TavolozzaTinte.test.tsx` 🆕 *(da creare)*

**Modificati**
- `src/app/api/lavori/[id]/route.ts` — allowlist, normalizzazione, D117
- `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` — la riga in sola lettura
- `src/components/features/lavori/form/TabClinica.tsx` — il campo di correzione
- `src/types/database.types.ts` — **generato**

🔑 **Perché `tinta.ts` è due file e non uno.** `domain/tinta.ts` è puro e lo importa anche il client (la
tavolozza deve sapere quali famiglie esistono); `api/tinta.ts` parla col database e vive **solo** nel
server. Metterli insieme trascinerebbe il client di servizio dentro un bundle di browser. È la stessa
divisione già in casa fra `domain/colore-dente.ts` e `api/colore-caso.ts`.

---

# Task 1 — Il catalogo `tinte_manufatto`

**File**
- Crea: `supabase/migrations/20260803140000_tinte_manufatto.sql` 🆕 *(da creare)*

**Interfacce**
- Produce: la tabella `tinte_manufatto (famiglia, codice, nome, ordine, hex)` con 34 righe (17+17).

- [ ] **Passo 1 — Sonda sull'ambiente, PRIMA di scrivere la migration**

Il piano assume che una tabella senza `laboratorio_id` e senza RLS sia leggibile dal client anonimo come
`colori_dentali`. **Si prova**, non si presume. Su transazione annullata:

```sql
BEGIN;
SELECT relrowsecurity FROM pg_class WHERE relname = 'colori_dentali';
SELECT grantee, privilege_type FROM information_schema.role_table_grants
 WHERE table_name = 'colori_dentali';
ROLLBACK;
```

Atteso: `relrowsecurity = false`, e i grant che il catalogo dentale ha davvero. **Il nuovo catalogo prende
gli stessi grant, letti — non quelli che sembrano giusti.** Incollare l'output nel rapporto del task.

- [ ] **Passo 2 — Scrivere la migration**

```sql
-- 20260803140000_tinte_manufatto.sql — D42, parte 1/3.
-- Spec 2026-08-03-tinte-manufatto-design §3. NON aggiungere BEGIN;/COMMIT;.
--
-- Catalogo PUBBLICO IN SOLA LETTURA, come colori_dentali: niente laboratorio_id,
-- niente RLS. D110 — un elenco solo per tutti, chiuso. Un laboratorio non può
-- aggiungere voci: il prezzo è dichiarato e accettato nella spec §3.2.
CREATE TABLE tinte_manufatto (
  famiglia text NOT NULL,
  codice   text NOT NULL,
  -- `codice` è la chiave STABILE e non si mostra mai; `nome` è l'etichetta che
  -- si legge. Sono due colonne di proposito (spec §3.1): il codice resta scritto
  -- sul lavoro e conservato, quindi rinominare l'etichetta non deve invalidare
  -- i lavori che l'avevano scelta. In colori_dentali non serviva: lì «A3» è
  -- insieme codice e nome.
  nome     text NOT NULL,
  ordine   smallint NOT NULL,
  -- 🔵 D114 — il pallino c'è SOLO dove è onesto. `hex` resta NULL su trasparente
  -- e sui glitter: un colore piatto lì direbbe una cosa falsa. È la stessa scelta
  -- già scritta in colori_dentali («una tinta inventata su un dispositivo medico
  -- non è un segnaposto innocuo»), applicata al caso opposto — lì mancava la
  -- fonte, qui manca il colore.
  hex      text,
  CONSTRAINT tinte_manufatto_famiglia_ck CHECK (famiglia IN ('resina_ortodontica','sport')),
  CONSTRAINT tinte_manufatto_codice_ck   CHECK (codice ~ '^[a-z0-9_]{2,24}$'),
  CONSTRAINT tinte_manufatto_hex_ck      CHECK (hex IS NULL OR hex ~ '^#[0-9A-Fa-f]{6}$'),
  PRIMARY KEY (famiglia, codice)
);

COMMENT ON TABLE tinte_manufatto IS
  'D42 — tinte NON dentali (resina ortodontica, sport). Catalogo pubblico chiuso: nessun laboratorio_id, nessuna RLS, come colori_dentali. `hex` NULL dove un colore piatto mentirebbe (trasparente, glitter).';

-- ── resina ortodontica (17) ────────────────────────────────────────────────
-- ⚠️ STATUTO DI QUESTA LISTA (D116): NON è la gamma di un fornitore. Le pagine
-- Dentaurum descrivono le FAMIGLIE di Orthocryl (classici, neon, glitter,
-- bianco/nero, trasparente) ma non un elenco di nomi. Questa lista è stata
-- proposta e presa così da Francesco: vale come sua decisione esplicita.
-- Non presentarla come gamma commerciale accertata.
INSERT INTO tinte_manufatto (famiglia, codice, nome, ordine, hex) VALUES
  ('resina_ortodontica','trasparente','Trasparente', 1, NULL),
  ('resina_ortodontica','rosa','Rosa',               2, '#E8548C'),
  ('resina_ortodontica','rosso','Rosso',             3, '#D90012'),
  ('resina_ortodontica','blu','Blu',                 4, '#1D5FBF'),
  ('resina_ortodontica','azzurro','Azzurro',         5, '#57A8E8'),
  ('resina_ortodontica','verde','Verde',             6, '#1B7F3B'),
  ('resina_ortodontica','giallo','Giallo',           7, '#F2C200'),
  ('resina_ortodontica','arancione','Arancione',     8, '#F07B10'),
  ('resina_ortodontica','viola','Viola',             9, '#7C3F9C'),
  ('resina_ortodontica','bianco','Bianco',          10, '#FFFFFF'),
  ('resina_ortodontica','nero','Nero',              11, '#1A1A1A'),
  ('resina_ortodontica','glitter_argento','Glitter argento',         12, NULL),
  ('resina_ortodontica','glitter_oro','Glitter oro',                 13, NULL),
  ('resina_ortodontica','glitter_multicolore','Glitter multicolore', 14, NULL),
  ('resina_ortodontica','neon_verde','Neon verde',         15, '#6EF23A'),
  ('resina_ortodontica','neon_rosa','Neon rosa',           16, '#FF3FA4'),
  ('resina_ortodontica','neon_arancione','Neon arancione', 17, '#FF7A1A');

-- ── sport (17) ─────────────────────────────────────────────────────────────
-- Questa lista RICALCA una gamma reale: i colori standard dei dischi Erkoflex
-- (Erkodent), tradotti. Fonte nella spec §3.2.
INSERT INTO tinte_manufatto (famiglia, codice, nome, ordine, hex) VALUES
  ('sport','trasparente','Trasparente',  1, NULL),
  ('sport','bianco','Bianco',            2, '#FFFFFF'),
  ('sport','nero','Nero',                3, '#1A1A1A'),
  ('sport','blu','Blu',                  4, '#1D5FBF'),
  ('sport','azzurro','Azzurro',          5, '#57A8E8'),
  ('sport','blu_scuro','Blu scuro',      6, '#10306B'),
  ('sport','rosso','Rosso',              7, '#D90012'),
  ('sport','rosso_scuro','Rosso scuro',  8, '#8C0A18'),
  ('sport','verde','Verde',              9, '#1B7F3B'),
  ('sport','verde_scuro','Verde scuro', 10, '#0C4A24'),
  ('sport','giallo','Giallo',           11, '#F2C200'),
  ('sport','arancione','Arancione',     12, '#F07B10'),
  ('sport','rosa','Rosa',               13, '#E8548C'),
  ('sport','lilla','Lilla',             14, '#B98BE8'),
  ('sport','bordeaux','Bordeaux',       15, '#6B1028'),
  ('sport','oro','Oro',                 16, '#C9A227'),
  ('sport','argento','Argento',         17, '#B8BCC0');
```

- [ ] **Passo 3 — Provare i vincoli con valori che DEVONO essere rifiutati** *(prima di applicare)*

Su schema usa-e-getta o transazione annullata, **tre inserimenti che devono fallire**, uno per vincolo.
Incollare **il messaggio d'errore di ciascuno**:

```sql
BEGIN;
-- ① famiglia inventata → deve fallire su tinte_manufatto_famiglia_ck
INSERT INTO tinte_manufatto VALUES ('pippo','rosso','Rosso',1,'#D90012');
ROLLBACK;

BEGIN;
-- ② codice con maiuscole/spazi → deve fallire su tinte_manufatto_codice_ck
INSERT INTO tinte_manufatto VALUES ('sport','Rosso Scuro','Rosso scuro',1,NULL);
ROLLBACK;

BEGIN;
-- ③ esadecimale malformato → deve fallire su tinte_manufatto_hex_ck
INSERT INTO tinte_manufatto VALUES ('sport','prova','Prova',1,'rosso');
ROLLBACK;

BEGIN;
-- ④ CONTROLLO POSITIVO — senza questo i tre sopra non provano che la tabella funzioni
INSERT INTO tinte_manufatto VALUES ('sport','prova','Prova',99,NULL);
SELECT count(*) FROM tinte_manufatto WHERE codice='prova';  -- atteso 1
ROLLBACK;
```

🔑 **Il controllo positivo non è un di più.** Tre rifiuti su una tabella che rifiuta *tutto* sarebbero tre
verdi che non dicono niente.

- [ ] **Passo 4 — Applicare e riverificare il conteggio**

```bash
npx supabase db push --yes
```

Poi, in sola lettura: `SELECT famiglia, count(*) FROM tinte_manufatto GROUP BY famiglia;` → atteso
`resina_ortodontica 17` e `sport 17`. Incollare l'output.

- [ ] **Passo 5 — FASE 6b**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

Rimuovere l'eventuale messaggio della CLI in fondo al file generato. Atteso: **0 errori**.

- [ ] **Passo 6 — Salvare**

```bash
git add supabase/migrations/20260803140000_tinte_manufatto.sql src/types/database.types.ts
git commit -F <messaggio-fuori-dal-repo>
```

---

# Task 2 — Le due colonne su `lavori` e i tre vincoli

**File**
- Crea: `supabase/migrations/20260803140100_lavori_tinta.sql` 🆕 *(da creare)*

**Interfacce**
- Consuma: `tinte_manufatto (famiglia, codice)` dal Task 1.
- Produce: `lavori.tinta_famiglia`, `lavori.tinta_codice` — entrambe `text` nullable.

- [ ] **Passo 1 — Sonda: la corrispondenza famiglia↔macro regge sui dati veri?**

Prima di scrivere un CHECK che lega le due cose, si guarda che cosa c'è già in casa. Sola lettura:

```sql
SELECT tipo_dispositivo, count(*) FROM lavori GROUP BY tipo_dispositivo ORDER BY 2 DESC;
```

Serve a sapere quanti lavori esistono per `ortodonzia` e `bite_splint`. **Atteso: nessun problema** — la
tinta nasce `NULL` ovunque e il CHECK ammette sempre il `NULL`. Se l'atteso non si verifica, **fermarsi e
riferire**: significa che il piano ha sbagliato una premessa.

- [ ] **Passo 2 — Scrivere la migration**

```sql
-- 20260803140100_lavori_tinta.sql — D42, parte 2/3.
-- Spec §4.1. NON aggiungere BEGIN;/COMMIT;.
ALTER TABLE lavori
  ADD COLUMN tinta_famiglia text,
  ADD COLUMN tinta_codice   text;

-- ① La coppia viaggia intera. Mezza tinta non è mezza tinta: è nessuna tinta.
--    Stessa regola di lavori_colore_caso_coppia_ck.
ALTER TABLE lavori
  ADD CONSTRAINT lavori_tinta_coppia_ck
    CHECK ((tinta_famiglia IS NULL) = (tinta_codice IS NULL));

-- ② La tinta, se c'è, deve esistere davvero nel catalogo — anche quando arriva
--    dall'API e non dalla schermata.
ALTER TABLE lavori
  ADD CONSTRAINT lavori_tinta_fk
    FOREIGN KEY (tinta_famiglia, tinta_codice) REFERENCES tinte_manufatto (famiglia, codice);

-- ③ D111 — LA FAMIGLIA CONTRO IL TIPO, e questo è il vincolo che il panel del
--    28/07 dava per impossibile.
--    Il panel diceva: «l'id fine dei 38 tipi non è persistito, quindi non si può
--    legare una tinta al tipo». Vero per l'id FINE. Ma la divisione resina/sport
--    cade esattamente sulla categoria GROSSA, che su questa riga c'è:
--      · gli unici tipi `ortodonzia` con una tinta sono placca_espansione e
--        apparecchio_funzionale (gli altri due hanno prevedeColore 'nessuno');
--      · l'unico tipo `bite_splint` con una tinta è paradenti (gli altri tre no).
--    (misurato su src/lib/domain/tipi-lavoro.ts:70-77)
--    Così `('sport','rosso')` sulla riga di una corona è IMPOSSIBILE, non
--    soltanto sconsigliato.
--
--    ⚠️ DUE LIMITI, dichiarati perché nessuno li scopra dopo:
--    (a) il vincolo è LARGO: sa dire «questa tinta non c'entra con l'ortodonzia»,
--        non «la contenzione non ha colore». Quella resta una regola di schermo.
--    (b) è un ACCOPPIAMENTO, non una legge: se un domani un tipo con tinta
--        nascesse sotto un'altra categoria grossa, questa CHECK va rifatta.
ALTER TABLE lavori
  ADD CONSTRAINT lavori_tinta_tipo_ck
    CHECK (
      tinta_famiglia IS NULL
      OR (tinta_famiglia = 'resina_ortodontica' AND tipo_dispositivo = 'ortodonzia')
      OR (tinta_famiglia = 'sport'              AND tipo_dispositivo = 'bite_splint')
    );

COMMENT ON COLUMN lavori.tinta_famiglia IS
  'D42 — famiglia della tinta non dentale. Legata a tipo_dispositivo da lavori_tinta_tipo_ck: accoppiamento, non legge (vedi commento nella migration).';
```

- [ ] **Passo 3 — Provare i vincoli con valori che DEVONO essere rifiutati**

🛑 **È il passo più importante del piano.** Un `ALTER TABLE` riuscito prova la sintassi, **non** il
comportamento. Su transazione annullata, prendendo un lavoro vero di ciascun tipo. Incollare **ogni**
messaggio d'errore:

```sql
-- ① tinta SPORT su un lavoro di ORTODONZIA → deve fallire su lavori_tinta_tipo_ck
BEGIN;
UPDATE lavori SET tinta_famiglia='sport', tinta_codice='rosso'
 WHERE tipo_dispositivo='ortodonzia' LIMIT 1;
ROLLBACK;

-- ② tinta di RESINA su un lavoro BITE → deve fallire, stesso vincolo, lato opposto
BEGIN;
UPDATE lavori SET tinta_famiglia='resina_ortodontica', tinta_codice='rosa'
 WHERE tipo_dispositivo='bite_splint' LIMIT 1;
ROLLBACK;

-- ③ tinta su una PROTESI FISSA → deve fallire (nessuna famiglia le corrisponde)
BEGIN;
UPDATE lavori SET tinta_famiglia='sport', tinta_codice='nero'
 WHERE tipo_dispositivo='protesi_fissa' LIMIT 1;
ROLLBACK;

-- ④ mezza coppia → deve fallire su lavori_tinta_coppia_ck
BEGIN;
UPDATE lavori SET tinta_famiglia='sport' WHERE tipo_dispositivo='bite_splint' LIMIT 1;
ROLLBACK;

-- ⑤ tinta inesistente → deve fallire su lavori_tinta_fk
BEGIN;
UPDATE lavori SET tinta_famiglia='sport', tinta_codice='rosa_fluo'
 WHERE tipo_dispositivo='bite_splint' LIMIT 1;
ROLLBACK;

-- ⑥ CONTROLLO POSITIVO A — l'abbinamento GIUSTO passa
BEGIN;
UPDATE lavori SET tinta_famiglia='sport', tinta_codice='rosso'
 WHERE tipo_dispositivo='bite_splint' LIMIT 1;
SELECT tinta_famiglia, tinta_codice FROM lavori WHERE tinta_codice IS NOT NULL;
ROLLBACK;

-- ⑦ CONTROLLO POSITIVO B — il NULL resta ammesso su QUALUNQUE tipo (D113)
BEGIN;
UPDATE lavori SET tinta_famiglia=NULL, tinta_codice=NULL WHERE tipo_dispositivo='protesi_fissa' LIMIT 1;
ROLLBACK;
```

🔑 **⑥ e ⑦ non sono di cortesia.** Senza ⑥ un vincolo che rifiuta *tutto* darebbe cinque verdi. Senza ⑦
un vincolo troppo stretto passerebbe inosservato finché qualcuno non prova a salvare una corona.

⚠️ Se `UPDATE … LIMIT 1` non è ammesso dal dialetto, usare
`WHERE id = (SELECT id FROM lavori WHERE tipo_dispositivo='…' LIMIT 1)`.

- [ ] **Passo 4 — Applicare, poi FASE 6b**

```bash
npx supabase db push --yes
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

Atteso: **0 errori**. `tinta_famiglia`/`tinta_codice` compaiono su `lavori` nel file generato.

- [ ] **Passo 5 — Salvare**

---

# Task 3 — Il dominio: famiglie e corrispondenza

**File**
- Crea: `src/lib/domain/tinta.ts` 🆕 *(da creare)*
- Test: `tests/unit/tinta-dominio.test.ts` 🆕 *(da creare)*

**Interfacce**
- Produce: `FamigliaTinta`, `FAMIGLIE_TINTA`, `TintaManufatto`, `famigliaDiMacro(macro)`, `macroDiFamiglia(famiglia)`.

- [ ] **Passo 1 — Scrivere la prova che fallisce**

```ts
import { describe, it, expect } from 'vitest'
import { FAMIGLIE_TINTA, famigliaDiMacro, macroDiFamiglia } from '@/lib/domain/tinta'
import { TIPI_LAVORO } from '@/lib/domain/tipi-lavoro'

describe('tinta — famiglie e corrispondenza con la categoria grossa', () => {
  it('le famiglie sono due', () => {
    expect(FAMIGLIE_TINTA).toEqual(['resina_ortodontica', 'sport'])
  })

  it('ortodonzia → resina, bite_splint → sport, tutto il resto → null', () => {
    expect(famigliaDiMacro('ortodonzia')).toBe('resina_ortodontica')
    expect(famigliaDiMacro('bite_splint')).toBe('sport')
    expect(famigliaDiMacro('protesi_fissa')).toBeNull()
    expect(famigliaDiMacro('altro')).toBeNull()
  })

  it('la corrispondenza è biunivoca', () => {
    expect(macroDiFamiglia('resina_ortodontica')).toBe('ortodonzia')
    expect(macroDiFamiglia('sport')).toBe('bite_splint')
  })

  // 🔑 LA PROVA CHE VALE PIÙ DELLE ALTRE, e che si accenderà da sola il giorno
  // in cui qualcuno aggiungerà un tipo con tinta sotto un'altra macro: è il
  // limite (b) scritto nella migration, trasformato in una rete.
  it('OGNI tipo con prevedeColore «libero» sta sotto una macro che ha una famiglia', () => {
    const liberi = TIPI_LAVORO.filter((t) => t.prevedeColore === 'libero')
    expect(liberi.length).toBeGreaterThan(0) // se un domani sparissero, questa prova va ripensata
    for (const t of liberi) {
      expect(famigliaDiMacro(t.macro), `il tipo ${t.id} non ha una famiglia di tinte`).not.toBeNull()
    }
  })

  it('nessun tipo con prevedeColore «catalogo» sta sotto una macro con famiglia di tinte', () => {
    const catalogo = TIPI_LAVORO.filter((t) => t.prevedeColore === 'catalogo')
    for (const t of catalogo) {
      expect(famigliaDiMacro(t.macro), `il tipo ${t.id} finirebbe sotto una tinta non dentale`).toBeNull()
    }
  })
})
```

- [ ] **Passo 2 — Eseguire: deve fallire**

Run: `npx vitest run tests/unit/tinta-dominio.test.ts`
Atteso: FAIL — `Cannot find module '@/lib/domain/tinta'`.

- [ ] **Passo 3 — R-P4: abbozzo INERTE e conteggio**

Prima dell'implementazione vera, un abbozzo che compila e non fa niente:

```ts
export const FAMIGLIE_TINTA = [] as const
export function famigliaDiMacro(_m: string) { return null }
export function macroDiFamiglia(_f: string) { return null }
```

Rieseguire e **CONTARE** quante asserzioni si accendono. Scrivere il numero nel rapporto (`N su M`). Se
una prova resta verde contro l'abbozzo inerte, **quella prova non prova niente** e va riscritta prima di
proseguire.

- [ ] **Passo 4 — Implementare**

```ts
// D42 — le famiglie delle tinte NON dentali e la loro corrispondenza con la
// categoria GROSSA del lavoro (`lavori.tipo_dispositivo`).
//
// 🔑 Questa corrispondenza è la stessa che vive nel CHECK `lavori_tinta_tipo_ck`
// (migration 20260803140100). Due copie della stessa regola sono la classe di
// difetto che questo progetto combatte: qui c'è perché il client deve sapere
// quali tinte mostrare, LÀ c'è perché il client si aggira. La rete che le tiene
// allineate è `tests/unit/tinta-dominio.test.ts`. 🆕 *(da creare)*
//
// ⚠️ È un ACCOPPIAMENTO, non una legge: se un tipo con tinta nascesse sotto
// un'altra macro, si cambiano ENTRAMBE. La prova «ogni tipo libero ha una
// famiglia» si accende da sola in quel caso.
import type { TipoDispositivo } from '@/types/domain'

export const FAMIGLIE_TINTA = ['resina_ortodontica', 'sport'] as const
export type FamigliaTinta = (typeof FAMIGLIE_TINTA)[number]

/** Una riga del catalogo `tinte_manufatto`. `hex` è NULL dove un colore piatto mentirebbe (D114). */
export type TintaManufatto = {
  famiglia: FamigliaTinta
  codice: string
  nome: string
  ordine: number
  hex: string | null
}

const PER_MACRO: Partial<Record<TipoDispositivo, FamigliaTinta>> = {
  ortodonzia: 'resina_ortodontica',
  bite_splint: 'sport',
}

/** La famiglia di tinte di una categoria grossa, oppure `null` se non ne ha. */
export function famigliaDiMacro(macro: string): FamigliaTinta | null {
  return PER_MACRO[macro as TipoDispositivo] ?? null
}

/** La categoria grossa di una famiglia. Biunivoca per costruzione. */
export function macroDiFamiglia(famiglia: string): TipoDispositivo | null {
  const trovata = (Object.entries(PER_MACRO) as Array<[TipoDispositivo, FamigliaTinta]>)
    .find(([, f]) => f === famiglia)
  return trovata ? trovata[0] : null
}
```

- [ ] **Passo 5 — Eseguire: deve passare**

Run: `npx vitest run tests/unit/tinta-dominio.test.ts` → **PASS**, tutte.

- [ ] **Passo 6 — Salvare**

---

# Task 4 — `risolviTinta`: la normalizzazione server-side

**File**
- Crea: `src/lib/api/tinta.ts` 🆕 *(da creare)*
- Test: `tests/unit/tinta-risolvi.test.ts` 🆕 *(da creare)*

**Interfacce**
- Consuma: `FamigliaTinta`, `famigliaDiMacro` (Task 3); la tabella `tinte_manufatto` (Task 1).
- Produce: `type Tinta = { tinta_famiglia: string | null; tinta_codice: string | null; scartata: boolean }`,
  `NESSUNA_TINTA`, `risolviTinta(svc, famigliaGrezza, codiceGrezzo, macroDelLavoro)`.

🔑 **Questa è una ricalcatura consapevole di `risolviColoreCaso`** (`src/lib/api/colore-caso.ts`, letto per
intero). Stessa forma, stessa regola dura — **si perde la tinta, non il lavoro** — e stesso `scartata` che
la dichiara. **Non si modifica `risolviColoreCaso`**: parla di un altro catalogo con altre chiavi.

- [ ] **Passo 1 — Le forme d'INPUT, enumerate prima delle asserzioni (R-P4)**

| forma | coperta da |
|---|---|
| `undefined` / `null` | «nessuna tinta», niente da segnalare |
| stringa vuota o di soli spazi | idem |
| tipo sbagliato (numero, oggetto, array) | **scartata = true** — qualcosa era stato chiesto |
| codice valido, famiglia assente | **si deduce dalla macro del lavoro** |
| codice valido, famiglia sbagliata per quella macro | **scartata** |
| codice inesistente | **scartata** |
| maiuscole / spazi ai bordi | normalizzati (`trim().toLowerCase()`) |
| catalogo irraggiungibile (errore del database) | **scartata**, mai un'eccezione |
| macro del lavoro senza famiglia (una corona) | **scartata**: nessuna tinta le compete |

- [ ] **Passo 2 — Scrivere le prove che falliscono**

```ts
import { describe, it, expect, vi } from 'vitest'
import { risolviTinta, NESSUNA_TINTA } from '@/lib/api/tinta'

// Finto client: risponde col catalogo di una sola famiglia, come fa PostgREST.
function svcFinto(righe: Array<{ famiglia: string; codice: string }>, errore = false) {
  return {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve(errore ? { data: null, error: { message: 'ko' } } : { data: righe, error: null }),
      }),
    }),
  } as never
}
const CATALOGO_SPORT = [{ famiglia: 'sport', codice: 'rosso' }, { famiglia: 'sport', codice: 'nero' }]

describe('risolviTinta', () => {
  it('undefined e null non sono una richiesta', async () => {
    expect(await risolviTinta(svcFinto([]), undefined, undefined, 'bite_splint')).toEqual(NESSUNA_TINTA)
    expect(await risolviTinta(svcFinto([]), null, null, 'bite_splint')).toEqual(NESSUNA_TINTA)
  })

  it('una casella vuota non è una richiesta', async () => {
    expect(await risolviTinta(svcFinto([]), 'sport', '   ', 'bite_splint')).toEqual(NESSUNA_TINTA)
  })

  it('un tipo sbagliato È una richiesta, e va dichiarata persa', async () => {
    const r = await risolviTinta(svcFinto([]), 'sport', 42 as never, 'bite_splint')
    expect(r.scartata).toBe(true)
    expect(r.tinta_codice).toBeNull()
  })

  it('normalizza maiuscole e spazi', async () => {
    const r = await risolviTinta(svcFinto(CATALOGO_SPORT), 'sport', '  ROSSO ', 'bite_splint')
    expect(r).toEqual({ tinta_famiglia: 'sport', tinta_codice: 'rosso', scartata: false })
  })

  it('deduce la famiglia dalla macro quando non è indicata', async () => {
    const r = await risolviTinta(svcFinto(CATALOGO_SPORT), null, 'rosso', 'bite_splint')
    expect(r.tinta_famiglia).toBe('sport')
  })

  it('scarta una famiglia che non c’entra con la macro', async () => {
    const r = await risolviTinta(svcFinto(CATALOGO_SPORT), 'resina_ortodontica', 'rosa', 'bite_splint')
    expect(r.scartata).toBe(true)
  })

  it('scarta un codice inesistente', async () => {
    const r = await risolviTinta(svcFinto(CATALOGO_SPORT), 'sport', 'rosa_fluo', 'bite_splint')
    expect(r.scartata).toBe(true)
  })

  it('scarta se la macro non ha famiglia di tinte — una corona non ha tinta', async () => {
    const r = await risolviTinta(svcFinto(CATALOGO_SPORT), 'sport', 'rosso', 'protesi_fissa')
    expect(r.scartata).toBe(true)
  })

  it('un catalogo irraggiungibile scarta, non lancia', async () => {
    const r = await risolviTinta(svcFinto([], true), 'sport', 'rosso', 'bite_splint')
    expect(r.scartata).toBe(true)
  })
})
```

- [ ] **Passo 3 — Eseguire: deve fallire.** Run: `npx vitest run tests/unit/tinta-risolvi.test.ts`

- [ ] **Passo 4 — R-P4: abbozzo inerte + conteggio**

```ts
export const NESSUNA_TINTA = { tinta_famiglia: null, tinta_codice: null, scartata: false }
export async function risolviTinta() { return NESSUNA_TINTA }
```

Contare le asserzioni che si accendono e **scrivere il numero**.

- [ ] **Passo 5 — Implementare**

```ts
import type { getServiceClient } from '@/lib/supabase/server-service'
import { famigliaDiMacro } from '@/lib/domain/tinta'

export type Tinta = {
  tinta_famiglia: string | null
  tinta_codice: string | null
  /** Una tinta era stata CHIESTA e non si è potuta registrare: si degrada E si dice. */
  scartata: boolean
}
export const NESSUNA_TINTA: Tinta = { tinta_famiglia: null, tinta_codice: null, scartata: false }
const TINTA_SCARTATA: Tinta = { tinta_famiglia: null, tinta_codice: null, scartata: true }

/**
 * La tinta del manufatto, normalizzata e confrontata col catalogo.
 *
 * 🛑 NON FALLISCE MAI: se il codice non si riconosce si perde LA TINTA, non il
 * lavoro (direttiva «ogni campo del lavoro si corregge»). ⚠️ Ma lo DICE, con
 * `scartata`: «si corregge dalla scheda» vale solo se chi deve correggere sa di
 * doverlo fare.
 *
 * 🔴 Vive nel SERVER, non nel client, per la stessa ragione misurata il 28/07
 * sul colore di caso: i vincoli mordono nel database, e una garanzia che
 * vivesse solo nel client non sarebbe una garanzia — i client saranno più d'uno.
 */
export async function risolviTinta(
  svc: ReturnType<typeof getServiceClient>,
  famigliaGrezza: unknown,
  codiceGrezzo: unknown,
  macroDelLavoro: string
): Promise<Tinta> {
  if (typeof codiceGrezzo !== 'string') {
    return codiceGrezzo === undefined || codiceGrezzo === null ? NESSUNA_TINTA : TINTA_SCARTATA
  }
  const codice = codiceGrezzo.trim().toLowerCase()
  if (codice.length === 0) return NESSUNA_TINTA

  // La famiglia ammessa la decide il TIPO del lavoro, non il body: è la stessa
  // regola del CHECK, applicata prima che il CHECK debba difendersi.
  const ammessa = famigliaDiMacro(macroDelLavoro)
  if (ammessa === null) return TINTA_SCARTATA

  const famiglia =
    typeof famigliaGrezza === 'string' && famigliaGrezza.trim().length > 0
      ? famigliaGrezza.trim().toLowerCase()
      : ammessa
  if (famiglia !== ammessa) return TINTA_SCARTATA

  const { data, error } = await svc
    .from('tinte_manufatto')
    .select('famiglia, codice')
    .eq('famiglia', ammessa)
  if (error || !data) return TINTA_SCARTATA

  const trovata = data.find((r) => r.codice === codice)
  if (!trovata) return TINTA_SCARTATA
  return { tinta_famiglia: trovata.famiglia, tinta_codice: trovata.codice, scartata: false }
}
```

- [ ] **Passo 6 — Eseguire: deve passare.** Poi salvare.

---

# Task 5 — La PATCH: allowlist, normalizzazione e D117

**File**
- Modifica: `src/app/api/lavori/[id]/route.ts` — allowlist a `:178-213`, blocco nuovo dopo quello del colore di caso a `:402-407`
- Test: `tests/unit/tinte-patch.test.ts` 🆕 *(da creare)*

**Interfacce**
- Consuma: `risolviTinta` (Task 4), `famigliaDiMacro` (Task 3).
- Produce: risposta PATCH con `tinta_rimossa?: { famiglia: string; codice: string }`.

- [ ] **Passo 1 — Scrivere le prove che falliscono**

Quattro fatti, quattro asserzioni distinte:

```ts
// ① le due chiavi sono in allowlist
import { PATCHABLE_FIELDS } from '@/app/api/lavori/[id]/route'
it('tinta_famiglia e tinta_codice sono correggibili', () => {
  expect(PATCHABLE_FIELDS).toContain('tinta_famiglia')
  expect(PATCHABLE_FIELDS).toContain('tinta_codice')
})
```

② una tinta valida su un lavoro compatibile arriva all'UPDATE normalizzata;
③ cambiando `tipo_dispositivo` verso una macro incompatibile, l'UPDATE porta **entrambe** le colonne a
`null` **e** la risposta contiene `tinta_rimossa`;
④ cambiando `tipo_dispositivo` verso una macro **compatibile** (bite → bite), la tinta **resta**.

🛑 **Le tre asserzioni di ③ sono tre e restano tre**: salvataggio riuscito · colonne a `null` ·
dichiarazione presente. Una sola delle tre passerebbe anche con un difetto.

⚠️ **Sui blocchi fratelli:** ogni `it` pulisce i propri finti (`vi.clearAllMocks()` in `beforeEach`). È il
difetto trovato tre volte nella sessione del 3 agosto — un test che legge il dato di un altro test e
funziona per coincidenza.

- [ ] **Passo 2 — Eseguire: deve fallire.**

- [ ] **Passo 3 — Aggiungere le due chiavi all'allowlist**

Dopo `'colore_codice',` (riga 211), **prima** di `...LOCKED_PRICE_FIELDS`:

```ts
  // GRUPPO D (D42) — la tinta del manufatto. Come il colore di caso, nessun
  // valore di queste due chiavi arriva all'UPDATE così com'è: il blocco «LA
  // TINTA DEL MANUFATTO» sotto le riscrive con la coppia normalizzata sul
  // catalogo, e le azzera se il tipo cambia e non le compete più (D117).
  'tinta_famiglia',
  'tinta_codice',
```

- [ ] **Passo 4 — Il blocco di normalizzazione**, subito **dopo** quello del colore di caso (`:407`) e
**prima** della validazione di `tipo_dispositivo`:

```ts
  // ═══ LA TINTA DEL MANUFATTO (D42) ══════════════════════════════════════════
  // Due cose in un blocco solo, perché dipendono dallo stesso fatto — quale
  // tipo avrà il lavoro DOPO questo salvataggio:
  //   (a) se il body porta una tinta, si normalizza sul catalogo;
  //   (b) D117 — se il tipo cambia e la tinta presente non gli compete più, la
  //       si TOGLIE e LO SI DICHIARA. Il salvataggio riesce: `tipo_dispositivo`
  //       è già correggibile (riga 179) e senza questo trattamento il CHECK
  //       `lavori_tinta_tipo_ck` farebbe fallire una correzione legittima con un
  //       errore grezzo del database.
  // 🛑 Togliere sì, in silenzio mai.
  const macroDopo = (payload.tipo_dispositivo ?? existing.tipo_dispositivo) as string
  let tintaRimossa: { famiglia: string; codice: string } | null = null

  if ('tinta_famiglia' in payload || 'tinta_codice' in payload) {
    const tinta = await risolviTinta(svc, payload.tinta_famiglia, payload.tinta_codice, macroDopo)
    payload.tinta_famiglia = tinta.tinta_famiglia
    payload.tinta_codice = tinta.tinta_codice
  } else if (
    existing.tinta_famiglia &&
    famigliaDiMacro(macroDopo) !== existing.tinta_famiglia
  ) {
    // Il body non nomina la tinta, ma il tipo cambia e la tinta esistente non
    // c'entra più: la si toglie NELLA STESSA scrittura.
    tintaRimossa = { famiglia: existing.tinta_famiglia as string, codice: existing.tinta_codice as string }
    payload.tinta_famiglia = null
    payload.tinta_codice = null
  }
```

⚠️ **L'esecutore verifica che `existing` porti davvero `tinta_famiglia`/`tinta_codice`.** Se la `select`
che costruisce `existing` è a colonne esplicite, vanno aggiunte — **e se non lo fa, il ramo (b) è codice
morto che passa i test coi finti e non funziona in produzione.** Aprire, non presumere.

- [ ] **Passo 5 — Dichiararlo nella risposta**, dove la PATCH costruisce il `NextResponse.json` finale:

```ts
      ...(tintaRimossa ? { tinta_rimossa: tintaRimossa } : {}),
```

Additivo: nessun client esistente se ne accorge.

- [ ] **Passo 6 — Eseguire: devono passare.** Poi salvare.

---

# Task 6 — Il rifacimento si porta dietro la tinta

**File**
- Crea: `supabase/migrations/20260803140200_rifacimento_clona_tinta.sql` 🆕 *(da creare)*

- [ ] **Passo 1 — Leggere la funzione viva, non il file**

```sql
SELECT prosrc FROM pg_proc WHERE proname = 'crea_rifacimento_atomico';
```

🔑 **Si legge dal catalogo, non dalla migration:** la funzione può essere stata riscritta da una migration
successiva. Incollare le righe dell'`INSERT INTO lavori (…)` nel rapporto.

- [ ] **Passo 2 — Riscrivere la funzione** con `CREATE OR REPLACE`, aggiungendo `tinta_famiglia,
tinta_codice` all'elenco delle colonne **e** `v_lavoro.tinta_famiglia, v_lavoro.tinta_codice` all'elenco
dei valori, **nella stessa posizione relativa** (le due liste si corrispondono per posizione: uno
scivolamento le disallinea in silenzio). Aggiornare il `COMMENT ON FUNCTION`.

- [ ] **Passo 3 — Provare che la tinta arriva davvero**

Su transazione annullata: mettere una tinta a un lavoro `bite_splint`, chiamare la RPC, leggere il lavoro
nuovo, `ROLLBACK`. Atteso: **stessa famiglia, stesso codice**. Incollare l'output.

🔑 Questa prova esiste perché **il difetto più grave del collaudo dell'ondata (a) era esattamente questo**:
il rifacimento perdeva denti e colore.

- [ ] **Passo 4 — Applicare, FASE 6b, salvare.**

---

# Task 7 — La riga sulla scheda (~~sola lettura~~ **si preme e si corregge lì — D247**)

> 🔄 **EMENDATO il 05/08/2026, 19:00 — D247.** Questo task era scritto **muto** («sola lettura», `RigaDato`)
> perché così diceva la spec, e il piano stesso lo dichiarava fra le sue **domande aperte** (la n° 2):
> «*se in collaudo risulta frustrante, è un emendamento di una riga*». **La domanda è stata portata a
> Francesco prima del collaudo, e ha scelto: la riga si preme e apre il foglietto SULLA SCHEDA**, come fa
> oggi la riga «Colore» — non si cambia pagina.
>
> 🔎 **Il fatto misurato che ha spostato la scelta, e non stava in nessun documento:** la carta «Lavoro»
> ha **sei righe, e QUATTRO si premono** (`provato:` `SchedaLavoroV3.tsx:522` Dentista · `:538-555` Colore
> (editabile quando la modifica è possibile) · `:556` Consegna · `:563` Tecnico), più la riga dei denti che
> **salta alla pagina di modifica** (`:527`). Una tinta muta sarebbe stata **l'unica riga ferma accanto al
> suo gemello che si preme**.
>
> ⚠️ **I due modi convivono già e NON si confondono:** il foglietto sul posto (`setCampoAttivo`) e il salto
> di pagina (`router.push`). **D247 sceglie il primo.**
>
> ✅ **RITROVAMENTO FUORI MANDATO — RIFERITO, POI CHIUSO SU AUTORIZZAZIONE DI FRANCESCO** (05/08, 19:25:
> «*si sistemalo adesso*»). Fatto **in un salvataggio suo, PRIMA del T7**, come dice la riga in fondo a
> questo blocco: rimettere in ordine e aggiungere un campo sono due lavori, e mescolati non si sa quale
> dei due ha rotto cosa. **L'esecutore del T7 trova già una definizione sola** (`provato:`
> `grep -rn "type Campo = " src/` → **1**, era 2) — `export type Campo` in `ModificaRigaSheet.tsx`,
> importata da `SchedaLavoroV3.tsx:76`.
> ✅ **Prova di efficacia, non dedotta:** aggiungendo `'tinta'` al punto unico, `tsc` dà **un solo errore, e
> è quello utile** — `TS2741`, «*Property 'tinta' is missing … but required in type `Record<Campo,
> string>`*», cioè «dài un titolo al campo nuovo». Il `TS2719` di disallineamento **non può più esistere:
> non ci sono più due tipi da disallineare.** `verify:full` uscita **0**; prove **invariate** (76/76 sui
> componenti toccati, rete intera **5002 | 19** su 420, identica alla baseline presa prima di toccare).
>
> 📜 **Il testo del ritrovamento, tenuto perché la misura vale oltre il caso:**
> l'elenco dei campi correggibili sul posto era **scritto due volte** —
> `SchedaLavoroV3.tsx:101` e `ModificaRigaSheet.tsx:30`, identici:
> `type Campo = 'consegna' | 'tecnico' | 'dentista' | 'note' | 'colore'`.
> **Aggiungere `'tinta'` vuol dire toccarne DUE.** `provato:` `grep -rn "type Campo = " src/` → **2 hit**.
>
> 🔬 **MISURATO nelle due direzioni il 05/08 alle 19:10** (la prima stesura di questa riga diceva che «una
> sola delle due non dà errore da tutti e due i lati»: **impreciso**, ed è stato corretto sull'esito vero).
> `provato:` aggiungendo `'tinta'` a un file solo e lanciando `tsc --noEmit`, poi ripristinando:
>
> | dove aggiungo `'tinta'` | esito | chi protesta |
> |---|---|---|
> | **solo** `SchedaLavoroV3.tsx:101` (chi chiama) | ❌ `TS2719` — «*Type 'Campo' is not assignable to type 'Campo'. **Two different types with this name exist, but they are unrelated**.*» | il **collegamento**: è il compilatore che descrive il difetto con parole sue |
> | **solo** `ModificaRigaSheet.tsx:30` (chi rende) | ❌ `TS2741` — «*Property 'tinta' is missing in type … but required in type `Record<Campo, string>`*» | ⚠️ **la tabella `TITOLI`, non il collegamento** |
>
> 🔑 **La riga da tenere: la seconda protesta è un COLPO DI FORTUNA, non una rete.** Arriva da
> `TITOLI: Record<Campo, string>` (`ModificaRigaSheet.tsx:32`), che per costruzione esige una chiave per
> ogni campo. Basterebbe un `Partial<Record<…>>`, o una tabella dei titoli scritta altrove, e l'aggiunta
> nel solo file che rende **passerebbe in silenzio**: un ramo capace di gestire la tinta che **nessun
> chiamante può raggiungere**. La protezione c'è **per come è fatta un'altra cosa**, non perché qualcuno
> l'abbia messa lì a difendere questo.
>
> 📌 **E la duplicazione è DICHIARATA, non distratta:** `SchedaLavoroV3.tsx:99-100` porta il commento
> «*L'elenco vive in DUE posti … i due si muovono insieme, o il foglio non sa che cosa rendere*». Qualcuno
> l'ha vista, l'ha scritta, e non l'ha chiusa. ⚠️ Nessuna ragione tecnica la regge: i due file stanno nella
> **stessa cartella** e `ModificaRigaSheet.tsx:22` importa già da `./ModificaColoreSheet`. La cura era
> **esportare il tipo da chi lo rende e importarlo in chi lo chiama** — due righe. ✅ **FATTA** (v. sopra).
>
> 🔑 **La lezione che vale oltre il caso, ed è nuova rispetto a quelle di ieri: una protezione che nasce
> per rimbalzo non è una protezione, è una coincidenza in servizio permanente.** `TITOLI` non è lì per
> difendere l'allineamento dei due elenchi: difende sé stesso, e per fortuna quel giorno bastava. È la
> variante «passiva» dell'interruttore che c'è e non fa niente (P4-④): lì un osservatore che nessuno
> leggeva, qui un guardiano che nessuno aveva assunto. ➡️ **Quando una rete regge, si chiede sempre
> PERCHÉ regge** — se la risposta non nomina la cosa che deve difendere, non è una rete.
>
> 🛑 **E vale la regola degli overlay v3:** da dentro un foglietto non si naviga con `router.push` nudo —
> se il T7 dovesse mai navigare, si usa `useNavigaDaOverlay` (`src/components/ds/useNavigaDaOverlay.ts`).
>
> ➡️ **Cosa cambia nei passi qui sotto:** il Passo 3 **non** rende `RigaDato` ma lo schema di `rigaColore`
> (`RigaEditabile` quando la tinta è correggibile → `onApri={() => setCampoAttivo('tinta')}`); serve un
> ramo `'tinta'` in `ModificaRigaSheet` con **la tavolozza** (la stessa del T8: **è il prezzo dichiarato di
> D247**, e non è terreno nuovo — `ModificaColoreSheet.tsx` è il precedente da ricalcare). La prova
> «nessuna tinta → la riga non compare affatto» **resta valida e invariata**.
> ⚠️ **Il gate estetico L2 diventa dovuto su questa superficie** (D245: cambia l'aspetto della carta), ed
> era già previsto dal T9.

**File**
- Modifica: `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` — dentro `<CardInfo>` (`:403-419`)

**Interfacce**
- Consuma: `lavoro.tinta_famiglia`, `lavoro.tinta_codice`; il `nome` e l'`hex` vanno letti dal catalogo
  **lato server** e passati giù — 🛑 **la scheda non interroga il catalogo dal client.**

- [ ] **Passo 1 — Decidere DOVE nasce il dato, aprendo il file**

`src/app/(app)/lavori/[id]/page.tsx` costruisce `lavoroDettaglio`. L'esecutore lo apre e aggiunge lì la
lettura della riga di catalogo (una `select` su `tinte_manufatto` filtrata sulla coppia), passando alla
scheda `{ nome, hex }`. **Se non c'è tinta, non si interroga niente.**

- [ ] **Passo 2 — La prova che fallisce**

Tre casi: tinta con pallino → la riga mostra nome **e** pastiglia colorata · tinta **senza** pallino
(`hex` nullo) → mostra **solo il nome**, nessun cerchietto · nessuna tinta → **la riga non compare
affatto** (non «— »: una riga vuota su una scheda è rumore).

- [ ] **Passo 3 — Il componente**, dentro `<CardInfo>` dopo `RigaLavoroDenti`:

```tsx
{tinta ? (
  <RigaDato
    chiave="Tinta"
    valore={
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spazio.s }}>
        {tinta.hex ? (
          <span
            aria-hidden
            style={{
              width: 22, height: 22, borderRadius: raggio.pill, background: tinta.hex,
              boxShadow: `inset 0 0 0 1px ${luce.line}`,
            }}
          />
        ) : null}
        {tinta.nome}
      </span>
    }
  />
) : null}
```

⚠️ `background: tinta.hex` è **un dato**, non un colore di marca: non viola la regola «mai hex inline»,
che riguarda i colori del sistema grafico. Scriverlo nel commento, o il prossimo revisore lo segnalerà.
🛑 **Il colore non è mai l'unica fonte d'informazione:** il nome c'è sempre, ed è per questo che la riga
funziona anche senza pallino.

- [ ] **Passo 4 — Eseguire, salvare.**

---

# Task 8 — Il campo sulla pagina di modifica, e la tavolozza

**File**
- Crea: `src/components/features/lavori/TavolozzaTinte.tsx` + `tests/unit/TavolozzaTinte.test.tsx` 🆕 *(da creare)*
- Modifica: `src/components/features/lavori/form/TabClinica.tsx`
- **Da aprire per primo:** `src/hooks/useLavoroForm.ts` — **NON letto** da questo piano

- [ ] **Passo 1 — Aprire `useLavoroForm.ts` e riferire**

È l'unico file del piano dichiarato **NON letto**: decide come un campo entra nel payload della PATCH.
L'esecutore lo apre **prima di scrivere**, e se la forma che trova contraddice questo task **si ferma e
riferisce** (R-E2) invece di adattare il piano di nascosto.

- [ ] **Passo 2 — La tavolozza, geometria dal mockup approvato (D119)**

Dal mockup, **verbatim**: griglia `1fr 1fr` a 390 e `1fr 1fr 1fr` da 768 · `gap: 8` (`spazio.s`) ·
**`grid-auto-rows: 60px`** · pastiglia `raggio.riga` (18), testo 14.5 peso 700, `line-height 1.15` ·
pallino 22 con anello interno · selezionata: `inset 0 0 0 2px var(--red)` su `--elv`.

🔴 **`grid-auto-rows` NON è un dettaglio:** con l'altezza libera «Glitter multicolore» va a capo e quella
sola pastiglia diventa più alta, sfasando la riga. Trovato **guardando lo scatto**, non prevedendolo.

In cima all'elenco, **«Nessuna tinta»** — è la via per toglierla (D113).

- [ ] **Passo 3 — Le prove**

Le 17 voci compaiono nell'ordine del catalogo · una voce con `hex` nullo **non** rende il pallino · la
scelta chiama il gestore con `(famiglia, codice)` · «Nessuna tinta» lo chiama con `(null, null)` · il
componente **non compare** se il tipo del lavoro non ha una famiglia.

- [ ] **Passo 4 — Il campo in `TabClinica`**, mostrato **solo** se `famigliaDiMacro(data.tipo_dispositivo)`
non è nullo. 🛑 **Non toccare l'elenco cablato dei 19 codici del colore dentale** (`TabClinica.tsx:8-14`):
è un difetto **preesistente e censito**, e correggerlo qui è fuori mandato — si riferisce.

- [ ] **Passo 5 — Eseguire, salvare.**

---

# Task 9 — Chiusura: FASE 7, collaudo, gate estetico

- [ ] **Passo 1 — FASE 7, tutti e tre, output incollato**

```bash
npx tsc --noEmit
npx vitest run
npx next build
```

`tsc` **non** vede la firma degli handler di rotta: i tre comandi sono tre.
**Riferimento di partenza:** `tsc` 0 · `vitest` 370|3 file e 4275|19 prove · build ok.

- [ ] **Passo 2 — FASE 9, nell'app vera** (D103, credenziali di `.env.local`, link monouso): su un lavoro
`paradenti` mettere una tinta dalla pagina di modifica, **rileggere dalla banca dati** che ci sia (non che
la risposta dica «ok»), vederla sulla scheda, poi cambiare il tipo in una corona e **verificare che
l'avviso compaia e la tinta sia sparita**. 390 · 768 · 1280, chiaro e scuro.

- [ ] **Passo 3 — FASE 9b, gate estetico L2** sulla sola superficie dell'ondata, contro
`docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`. Screenshot in `docs/design/screenshots/2026-08-03-tinte/`.

- [ ] **Passo 4 — FASE 11, BP-1:** `memory/MEMORY.md` + `docs/roadmap/ROADMAP-UFFICIALE.md`.

- [ ] **Passo 5 — Merge, push, CI verde, verifica su uachelab.com.**

---

## Domande aperte — dichiarate, non nascoste

1. ✅ **CHIUSA da D121 (03/08/2026) — «il passo del wizard aspetta il wizard».** ~~Il passo del wizard
   (parte 2): si aggancia l'impalcatura adattiva o si bullona un quarto passo numerato?~~ **Nessuna delle
   due: la parte 2 non si scrive.** Il passo della tinta nasce dentro l'ondata che costruisce le schermate
   del wizard, accanto a denti · colore · foto · cassetta. **Questo piano è D42 per intero**, non più «la
   parte 1». Verbale: tornata **38**; spec §5, emendata.
   🔑 **Perché:** la spec dell'ondata (b) §4 elimina il blocco «Se vuoi, aggiungi» del passo paziente
   (elemento e colore **diventano passi propri**), quindi ogni scorciatoia dentro quel blocco arreda una
   stanza condannata; e agganciare la macchina «solo un po'» costa comunque pallini a numero variabile,
   bozza a versione nuova — con un'etichetta **diversa da `v:2`, già prenotata** dalla spec (b) §7 —,
   testi della ripresa riscritti e il punto in cui nasce il lavoro spostato **due volte**.
2. ✅ **CHIUSA da D247 (05/08/2026, 19:00) — «si preme, e si corregge lì».** ~~La scheda: riga muta o riga
   che porta alla modifica? Il Task 7 la fa muta come dice la spec; se in collaudo risulta frustrante, è un
   emendamento di una riga.~~ **Non si è aspettato il collaudo: la domanda è stata portata a Francesco**,
   spiegandogli prima che cosa volesse dire «muta», e ha scelto il **foglietto sulla scheda** (né muta, né
   salto di pagina). Il Task 7 è **emendato in testa**; il prezzo — la tavolozza in due posti — è
   dichiarato lì. Verbale: **novantaseiesima tornata**.
   🔑 **Perché non ha aspettato:** una riga muta scritta e poi cambiata in collaudo è lavoro fatto due
   volte; e la domanda era già passata **due sessioni** senza arrivare a chi doveva rispondere.
3. 🟡 **`useLavoroForm.ts` non è stato letto.** È dichiarato, ed è l'innesco del primo passo del Task 8.

## Ritrovamenti preesistenti da NON correggere qui (R-E2)

- La tendina del colore dentale offre **19 codici su 48** (`TabClinica.tsx:8-14`).
- L'impalcatura dei passi adattivi **non è agganciata a niente**: la usano solo i suoi test.
- Nel wizard il colore è ancora **testo libero** (`PassoPaziente.tsx:41-42`).

---

## 🔎 RITROVAMENTI ESEGUENDO — Task 1 (05/08/2026, 17:40)

> Registrati qui e non corretti di nascosto (R-E2). Chi esegue i task successivi li legge **prima** di
> fidarsi del testo del piano: i tre sono difetti **del piano**, non del codice.

### 🔴 P1-① — Il piano avrebbe creato un catalogo SCRIVIBILE DA CHIUNQUE

Il blocco SQL del **Passo 2** non conteneva **né `REVOKE` né `GRANT`**. Il Passo 1 dava per scontato che
una tabella senza `laboratorio_id` e senza RLS fosse «leggibile dal client anonimo come `colori_dentali`»:
**due affermazioni, tutte e due false.**

`provato:` su transazione **annullata**, creando una tabella usa-e-getta in `public` e leggendone i grant:

```
anon          → DELETE · INSERT · REFERENCES · SELECT · TRIGGER · TRUNCATE · UPDATE
authenticated → (gli stessi sette)
service_role  → (gli stessi sette)
```

I privilegi predefiniti del progetto (`pg_default_acl`) concedono **`arwdDxtm`** — cioè **tutto** — a
`anon`, `authenticated` e `service_role` su **ogni** tabella nuova di `public`. E `tinte_manufatto` per
progetto **non ha RLS**: senza i `GRANT` giusti, l'unica barriera non esiste. Un visitatore con la chiave
pubblica — che viaggia nel bundle del browser — avrebbe potuto **inserire, modificare, cancellare e
troncare** il catalogo che decide la tinta di un dispositivo su misura.

`provato:` il gemello `colori_dentali` **non concede niente ad `anon`**: solo `authenticated=SELECT` e
`service_role=SELECT`, e le due righe che lo fanno stanno in `20260727120000_lavori_denti.sql:64-65`.

➡️ **Corretto dentro il mandato del Task 1** (la migration È il task): le due righe sono nel file, ricalcate
dal gemello e non reinventate. `provato:` dopo `db push`, i grant di `tinte_manufatto` sono
`authenticated=SELECT` · `service_role=SELECT` · `postgres` tutto, **niente `anon`**, e `relrowsecurity=false`.

🔑 **La riga da tenere: «senza RLS» non vuol dire «pubblica in lettura», vuol dire «protetta dai soli
GRANT».** Il piano ha confuso le due cose, e la confusione produceva una tabella aperta in scrittura.

### 🟠 P1-② — Il nome della migration era ANTERIORE all'ultima applicata

Il piano diceva `20260803140000_tinte_manufatto.sql`. `provato:`
`SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1` →
**`20260805113700`**. Una migration con un numero più basso è **fuori ordine**.
➡️ Il file porta l'orologio (**D155**): `20260805174000_tinte_manufatto.sql`.
⚠️ **Vale per i Task 2 e 6**, che nel piano portano nomi della stessa serie: vanno rinumerati anche loro.

### 🟡 P1-③ — Il Passo 3 non prova quello che dice, se eseguito com'è scritto

Le quattro sonde sono scritte come `BEGIN; … ROLLBACK;` separati, ma la tabella viene creata **dentro** la
prima transazione: annullata quella, le successive non hanno su cosa lavorare. E in una sola transazione il
primo `INSERT` che fallisce **annulla tutto il resto** (`current transaction is aborted, commands ignored`)
— `provato:` al primo tentativo, otto istruzioni su undici ignorate, con tre vincoli mai messi alla prova
e **tre verdi che non erano verdi**.
➡️ Si usano i **punti di ripristino** (`SAVEPOINT` + `ROLLBACK TO`) dentro un'unica transazione.

**Esito vero delle sonde, dopo la correzione** — ogni vincolo col valore che DEVE essere rifiutato:

| prova | esito | vincolo |
|---|---|---|
| famiglia `'pippo'` | ❌ rifiutata | `tinte_manufatto_famiglia_ck` |
| codice `'Rosso Scuro'` (maiuscole + spazio) | ❌ rifiutata | `tinte_manufatto_codice_ck` |
| hex `'rosso'` | ❌ rifiutata | `tinte_manufatto_hex_ck` |
| codice di **1** carattere | ❌ rifiutata | `tinte_manufatto_codice_ck` (il minimo è dove dice) |
| codice di **2** caratteri | ✅ accettata | il limite non è più stretto del dichiarato |
| **controllo positivo**: riga valida | ✅ accettata, `count = 1` | — |
| doppione stessa famiglia+codice | ❌ rifiutata | `tinte_manufatto_pkey` |
| stesso codice in **famiglia diversa** | ✅ accettata | la chiave è composita, come deve |

📌 **Esito dell'applicazione:** `resina_ortodontica 17` · `sport 17` · **5 righe senza pallino**
(trasparente ×2, glitter ×3, come vuole D114) · `tsc --noEmit` **0 errori** dopo la FASE 6b.

## 🔎 RITROVAMENTI ESEGUENDO — Task 2 (05/08/2026, 17:48)

### 🔴 P2-① — Quattro prove su sette del Passo 3 avrebbero toccato ZERO righe

Le sonde ② ④ ⑤ ⑥ del Passo 3 filtrano su `tipo_dispositivo='bite_splint'`. `provato:`
`SELECT tipo_dispositivo, count(*) FROM lavori GROUP BY 1` → **`bite_splint` NON compare**:
protesi_fissa 193 · provvisorio 56 · altro 24 · implantologia 16 · protesi_mobile 4 · scheletrato 2 ·
cad_cam 2 · riparazione 1 · **ortodonzia 1**. Zero bite.

Un `UPDATE … WHERE tipo_dispositivo='bite_splint'` su zero righe **riesce**: nessun vincolo viene
esercitato e la sonda stampa un verde. **Quattro prove su sette sarebbero state verdi senza provare
niente** — compreso il **controllo positivo ⑥**, cioè proprio quello che esiste per accorgersi di un
vincolo che rifiuta tutto.
➡️ **Rimedio:** dentro la transazione annullata si porta **una riga vera a `bite_splint`**
(`UPDATE lavori SET tipo_dispositivo='bite_splint' WHERE id = (SELECT id … 'protesi_fissa' … LIMIT 1)`),
poi si provano i vincoli su quella. Tutto muore col `ROLLBACK`.
🔑 **La riga da tenere: una prova che non tocca righe non è una prova che passa, è una prova che non è
avvenuta.** Il conteggio delle righe toccate va letto, non dato per scontato.

### 🟡 P2-② — Il piano provava UN SOLO LATO della coppia e UN SOLO controllo positivo

La sonda ④ prova `SET tinta_famiglia='sport'` senza codice, ma **non** il lato opposto
(`SET tinta_codice='rosso'` senza famiglia); e il controllo positivo ⑥ prova solo `sport` su `bite_splint`,
mai `resina_ortodontica` su `ortodonzia`. Un vincolo può essere sbilanciato e passare lo stesso.
➡️ Aggiunte entrambe. `provato:` il lato mancante della coppia scatta su `lavori_tinta_coppia_ck`, e il
secondo positivo (`resina_ortodontica`+`glitter_oro` su un lavoro `ortodonzia`) **passa**.

### 📌 `UPDATE … LIMIT 1` non esiste in Postgres

Il piano lo segnalava come dubbio: è confermato, si usa la forma
`WHERE id = (SELECT id FROM lavori WHERE … LIMIT 1)`.

**Esito vero delle otto sonde** (transazione annullata, con i tre vincoli creati dentro):

| prova | esito | vincolo |
|---|---|---|
| `sport` su un lavoro **ortodonzia** | ❌ rifiutata | `lavori_tinta_tipo_ck` |
| `resina_ortodontica` su un lavoro **bite_splint** | ❌ rifiutata | `lavori_tinta_tipo_ck` |
| `sport` su una **protesi fissa** | ❌ rifiutata | `lavori_tinta_tipo_ck` |
| mezza coppia — **solo famiglia** | ❌ rifiutata | `lavori_tinta_coppia_ck` |
| mezza coppia — **solo codice** 🆕 | ❌ rifiutata | `lavori_tinta_coppia_ck` |
| tinta inesistente (`rosa_fluo`) | ❌ rifiutata | `lavori_tinta_fk` |
| **positivo A**: `sport`+`rosso` su bite_splint | ✅ 1 riga, riletta | — |
| **positivo B** 🆕: `resina_ortodontica`+`glitter_oro` su ortodonzia | ✅ 1 riga, riletta | — |
| **positivo C**: `NULL` su protesi fissa | ✅ ammesso, 299 righe a NULL | D113 |

📌 **Dopo l'applicazione:** due colonne `text` nullable, tre vincoli presenti
(`lavori_tinta_coppia_ck`, `lavori_tinta_fk`, `lavori_tinta_tipo_ck`), **0 lavori con tinta** —
la colonna nasce vuota ovunque, come previsto. `tsc --noEmit` **0 errori** dopo la FASE 6b.

## 🔎 RITROVAMENTI ESEGUENDO — Task 3 (05/08/2026, 17:52)

### 📊 R-P4 — il conteggio, e la prova VACUA che ha scoperto

**Prima misura: 5 asserzioni su 8** si accendono contro l'abbozzo inerte. Tre restano verdi, e non sono
tutte uguali:

- **Due sono guardie NEGATIVE** («nessun tipo *catalogo* sotto una macro con tinte», «una famiglia
  inventata non ha macro»): chiedono che la risposta sia `null`, e l'abbozzo risponde `null` a tutto.
  **Non si riscrivono per farle accendere — sarebbe fingere.** Il loro valore è contro una regressione
  futura. Dichiarate con un commento nel file di prova, non nascoste.
- **La terza era VACUA, ed è un difetto vero della prova:** «le due funzioni si chiudono l'una
  sull'altra» cicla su `FAMIGLIE_TINTA`, che nell'abbozzo è **vuoto** → il corpo del ciclo **non gira
  neanche una volta** e la prova passa senza aver verificato niente.
  ➡️ Corretta con `expect(FAMIGLIE_TINTA.length).toBe(2)` prima del ciclo.
  🔑 **Un ciclo su un elenco vuoto non è una prova che passa: è una prova che non c'è.** È la stessa
  forma del difetto del Task 2 (un `UPDATE` su zero righe), trovata in un linguaggio diverso.

**Seconda misura, dopo la correzione: 6 su 8.**

### 🆕 Tre prove che il piano non aveva

Aggiunte perché il piano copriva solo il lato positivo della corrispondenza: ① una famiglia inventata
(e la stringa vuota) non ha alcuna macro; ② il giro di ritorno famiglia → macro → stessa famiglia;
③ l'elenco **atteso** dei tre tipi con `prevedeColore: 'libero'` (`placca_espansione`,
`apparecchio_funzionale`, `paradenti`), censito a mano su `tipi-lavoro.ts` e **non** copiato dal codice —
se un tipo entra o esce, la prova se ne accorge.

📌 **Esito:** `vitest tests/unit/tinta-dominio.test.ts` → **8 passate su 8** · `tsc --noEmit` **0 errori**.

## 🔎 RITROVAMENTI ESEGUENDO — Task 4 (05/08/2026, 18:40)

### 🔴 P4-① — Il piano puliva UN SOLO LATO, e il lato scoperto premiava il dato più rotto

Il Passo 1 del Task 4 elenca fra le forme d'input «*tipo sbagliato (numero, oggetto, array) → **scartata =
true** — qualcosa era stato chiesto*». **L'implementazione del Passo 5 applica quella guardia al solo
`codiceGrezzo`.** Per `famigliaGrezza` il controllo è `typeof famigliaGrezza === 'string'` dentro un
ternario: quando fallisce si cade nel ramo «non indicata» e la famiglia viene **dedotta dalla macro, in
silenzio**.

🔑 **Perché non è un cavillo, ed è la ragione per cui è stato chiuso invece che dichiarato:** ne usciva
un'asimmetria rovesciata. Con `codice='rosso'` su un `bite_splint`:

| famiglia in arrivo | esito col piano | giudizio |
|---|---|---|
| `'resina_ortodontica'` (stringa, sbagliata per quella macro) | **scartata** | giusto |
| `42` · `{…}` · `['sport']` (non è nemmeno una stringa) | **accettata**, famiglia dedotta | ⚠️ un dato *palesemente* rotto trattato meglio di uno *solo* sbagliato |

➡️ **Chiuso dentro il mandato** (il file È il task), con la regola già scritta nel gemello:
«*se un domani un codice comparisse in due scale, `trovate.length !== 1` lo scarta invece di tirare a
indovinare*» (`colore-caso.ts:63-70`). `undefined`/`null` restano «non indicata» e si deducono; **qualsiasi
altro tipo scarta**. Ragione incollata nel codice, non solo qui.
📌 È **la stessa forma di P2-②** («il piano provava un solo lato della coppia»), ricomparsa in un altro
linguaggio due task dopo. Se una regola ha due versi, i versi da provare sono due.

### 🔴 P4-② — Una prova del piano passava PER IL MOTIVO SBAGLIATO

```ts
it('scarta una famiglia che non c’entra con la macro', …
  risolviTinta(svcFinto(CATALOGO_SPORT), 'resina_ortodontica', 'rosa', 'bite_splint')
```

`'rosa'` **non sta in `CATALOGO_SPORT`**: la chiamata torna `scartata: true` anche se la regola
famiglia↔macro non esistesse affatto. La prova **non sa distinguere le due vie di rifiuto** — è la terza
comparsa in quest'ondata della prova che sembra verde e non ha verificato niente (un `UPDATE` su zero righe
nel T2, un ciclo su elenco vuoto nel T3).
➡️ **Resa discriminante col meccanismo, non col valore:** il disaccordo di famiglia esce **prima** della
query, quindi il finto client porta una **spia** e la prova asserisce `spia.consultato === 0` — *il catalogo
non è stato nemmeno interrogato*. Il codice usato è ora `'rosso'`, che **esiste** nel catalogo di prova: se
il rifiuto non arrivasse da quella regola, la tinta si salverebbe e la prova si accenderebbe.
📌 La stessa spia rende **positive** le due prove gemelle: `scarta un codice inesistente` asserisce
`consultato === 1` (è il catalogo a dire di no) e `una corona non ha tinta` asserisce `consultato === 0`.

### 🟡 P4-③ — Tre tipi sbagliati nominati, uno solo provato

Il Passo 1 nomina «numero, oggetto, array» e il Passo 2 prova solo `42`. R-P4 chiede che ogni forma
d'input censita abbia il suo caso **o** il suo «non coperta, perché».
➡️ Coperte tutte e tre, su **entrambi** i lati (codice e famiglia): sei casi in due cicli.

### 🟠 P4-④ — La spia aveva un occhio che nessuno leggeva (trovato in revisione, chiuso)

Il finto client registrava anche **il nome della tabella interrogata**, e **nessuna prova lo asseriva**: se
`risolviTinta` avesse chiesto `colori_dentali` invece di `tinte_manufatto`, **tutte e undici le prove
sarebbero rimaste verdi**. È la lezione ④ del 05/08 — «*un interruttore che c'è e non fa niente è peggio di
uno che manca*» (`immagini.length === 1 ? 'foto' : 'foto'`) — e la stessa famiglia della guardia sugli
overlay che stava scritta e non era agganciata a nulla.
➡️ Chiuso con `expect(spia.tabella).toBe('tinte_manufatto')` nella prova positiva.
✅ **E la riga nuova è stata provata falsificabile**, invece di essere data per buona: `provato:` puntando
di proposito l'implementazione a `colori_dentali` → `1 failed | 10 passed`,
`AssertionError: expected 'colori_dentali' to be 'tinte_manufatto'`. File ripristinato (`git diff --stat`
vuoto) e verde di nuovo a 11/11.
📌 Nello stesso passaggio: la normalizzazione era provata **solo sul codice**. Ora la prova manda
`'  SPORT '` **e** `'  ROSSO '` — una maiuscola di troppo sulla famiglia avrebbe fatto scartare una tinta
buona.

### 📊 R-P4 — il conteggio

**9 asserzioni su 11** si accendono contro l'abbozzo inerte (`provato:`
`vitest run tests/unit/tinta-risolvi.test.ts` → `11 tests | 9 failed`).
Le due verdi sono **guardie negative** — chiedono `NESSUNA_TINTA` e l'abbozzo risponde `NESSUNA_TINTA` a
tutto: non si riscrivono per farle accendere, sarebbe fingere. Dichiarate con un commento nel file, come
nel T3.

📌 **Esito:** `vitest tests/unit/tinta-risolvi.test.ts` → **11 passate su 11** · `tsc --noEmit` **0 errori** ·
`eslint` sui due file **0** · rete intera **5002 passate | 19 saltate** (420 file | 3 saltati), da
**4991 | 19** su 419 → **+11 prove, +1 file**, nessuna regressione.

### 📮 Da riferire al Task 5 (R-E2 — si riferisce, non si corregge qui)

Il terzo argomento di `risolviTinta` è la **categoria grossa** (`lavori.tipo_dispositivo`, 10 valori), e
decide da sola quale famiglia è ammessa. **La PATCH deve leggerla dalla riga in banca dati, mai dal body:**
se la prendesse dal corpo della richiesta, un client potrebbe dichiarare `bite_splint` su una corona e la
guardia si aprirebbe da sola — resterebbe solo il CHECK, cioè un 500 invece di uno scarto dichiarato.

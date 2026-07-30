# L'album delle foto sulla scheda del lavoro — piano di esecuzione

> **Per chi esegue:** SOTTO-SKILL RICHIESTA — `superpowers:subagent-driven-development`, **un esecutore
> fresco per task** (R-E1), con revisione fra l'uno e l'altro. I passi usano caselle `- [ ]`.
> 🛑 **R-E2:** un difetto trovato **fuori** dal proprio mandato si **riferisce**, non si corregge di nascosto.

**Obiettivo:** le foto di un lavoro diventano un **album** — carta con foto grande, visore a tutto schermo,
categoria chiesta allo scatto e correggibile, eliminazione **vera** — su entrambe le superfici del lavoro.

**Architettura:** la categoria smette di essere testo libero e diventa una colonna **vincolata**
(`categoria`), mentre la colonna `tipo` — che non è l'asse del formato e non la legge nessuno — **si
elimina**. L'ordine è **raggruppato per categoria** e si calcola **in TypeScript**, non in SQL. Le superfici
nuove sono **componenti `ds` v3 puri** che leggono **solo** `v3/tokens.ts`.

**Stack:** Next.js 16 (App Router) · Supabase (PostgREST + Storage) · TypeScript · Vitest ·
Design System v3.2 (rev. 3.3).

**Spec (RATIFICATA):** `docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md`
**Decisioni:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **D57-D79**
**Mockup approvato:** `docs/design/mockups/2026-07-30-album-visore-categoria.html`
**Ramo:** `ondata-b-schermate` (già aperto). 🛑 **MAI un git worktree in questo progetto.**

---

## Vincoli globali — valgono per OGNI task, non si ripetono

| # | vincolo | perché, in una riga |
|---|---|---|
| **G1** | I componenti nuovi stanno in `src/components/ds/` e leggono **SOLO** `src/design-system/v3/tokens.ts`. **MAI** `src/components/features/lavori/form/styles.ts` | il ponte CSS vive sulla classe `.lavoro-form-v3`, che in tutto `src/` esiste **in un posto solo** (`src/app/(app)/lavori/[id]/modifica/page.tsx:94`) → un componente che leggesse `--sh-b` **renderebbe diverso sulla scheda e in modifica** |
| **G2** | **Niente `rgba`/hex letterali** dentro `src/components/ds/` | vietato dal controllo pre-commit (spec v3 §13.2) |
| **G3** | **Nessuna durata/molla inventata**: solo da `src/design-system/v3/motion.ts` | `ua-app/CLAUDE.md` §4, regola assoluta |
| **G4** | **Tocco ≥ 44 px** su ogni elemento interattivo; **il colore non è mai l'unica fonte di stato** | DS v3 §12 |
| **G5** | **Nessun punto nuovo** che mostri, copi o esporti l'indirizzo firmato di una foto, e il numero di punti in cui compare **non cresce** | contropartita di **D75**: la durata dei collegamenti è rinviata all'ondata della condivisione, quindi questa superficie non deve peggiorarla |
| **G6** | Le sei categorie sono **esattamente** `impronta · pre_lavoro · colore · post_prova · rx · altro`, etichette `Impronta · Pre-lavoro · Guida colore · Post-prova · Radiografia · Altro` | **D72**, ratificate da Francesco. Elenco **chiuso**: una voce nuova costa un rilascio, non un'impostazione |
| **G7** | L'ordine dei gruppi è **`impronta → pre_lavoro → colore → post_prova → rx → altro`** | **D71**. 🛑 **Non è un ordinamento SQL**: l'alfabetico metterebbe `altro` davanti a tutto |
| **G8** | **Mai stampare righe di `pazienti`** (Art. 9): solo conteggi. Baseline DB: **294 · 0 · 916 · 48** | `ua-app/CLAUDE.md` |
| **G9** | Errori del database **mai** rimandati grezzi al client | regola G9 del progetto |
| **G10** | Salvataggi: `git commit -F <file> -- <percorsi>`, **mai `git add -A`**. ⚠️ `.gitignore` ignora `*.png` (serve `git add -f`), `.superpowers/sdd/` per intero e **`*-report.*`** | difetti veri, già pagati |

---

## Registro delle PROVE — R-P1

🛑 **Un blocco senza marchio è NON PROVATO.** Le prove qui sotto riguardano le **assunzioni sull'ambiente**
che il piano dà per buone. Il codice dei task nasce `non eseguito`, **con accanto il comando** che
l'esecutore userà per verificarlo.

| # | assunzione | esito |
|---|---|---|
| **P1** | «Il `CHECK` del database restringe il tipo TypeScript generato» → **FALSA** | `provato:` letto `src/types/database.types.ts:3015-3060` — `lavori_immagini.tipo` **ha** un `CHECK` a quattro valori e il tipo generato è **`tipo: string`**, non l'unione. ➡️ **La prova-spia di T2 è necessaria**, non decorativa |
| **P2** | «Una colonna `NOT NULL` **senza** `DEFAULT` diventa obbligatoria nell'`Insert` generato» → **VERA** | `provato:` stesso blocco — le colonne **con** ripiego escono opzionali (`tipo?: string`, `ordine?: number`, `created_at?: string`), quelle **senza** escono obbligatorie (`laboratorio_id: string`, `storage_path: string`, `url: string`). ➡️ **Il rosso di `tsc` previsto in T1 è un fatto, non una speranza** |
| **P3** | «`tsc --noEmit` è pulito **prima** di toccare qualcosa» → **VERO** | `provato:` `npx tsc --noEmit` → **uscita 0, nessun output**. ➡️ Ogni rosso dopo `gen types` è **causato dal cambiamento**, non preesistente |
| **P4** | «`tipo` non è letta da nessuno» → **VERA** | `provato:` `grep -rn "LavoroImmagine\|\.tipo" src/ tests/` — l'unico `.tipo` è `TabImmagini.tsx:523`, che è lo **stato locale del caricamento** (`FotoLocale.tipo`, `:31`), non la riga di banca dati. Zero riscontri nei due test della tabella |
| **P5** | «`FotoStrip` ha un solo chiamante» → **FALSA, e il file mancava dall'elenco** | `provato:` `grep -rn "FotoStrip" src/ tests/` → **tre** siti: `SchedaLavoroV3.tsx:316` · **`src/app/ds-v3-catalogo/page.tsx:1166`** (il catalogo del design system, pagina viva) · `tests/unit/ds-v3/componenti/FotoStrip.test.tsx`. ➡️ **T11 li tocca tutti e tre** |
| **P6** | «Il tipo di dominio ha `created_at`, che serve per ordinare dentro il gruppo» → **FALSA** | `provato:` letto `src/types/domain.ts:475-486` — `LavoroImmagine` ha `id, laboratorio_id, lavoro_id, url, storage_path, nome_file, descrizione, data_scatto, tipo, ordine`. **Niente `created_at`.** ➡️ T1 lo aggiunge, o l'ordine dentro il gruppo non è esprimibile |
| **P7** | «Esiste in casa una prova che legge una migration» → **VERA, ma col suo difetto noto** | `provato:` `tests/unit/colore-dente-idratazione.test.ts:21-33` legge `supabase/migrations/20260727120000_lavori_denti.sql` con una regex. 🛑 **Ma pretende un numero fisso (48)**, quindi **resterebbe verde se il catalogo crescesse** — è il rilievo **R3** del verbale. ➡️ **La spia di T2 confronta INSIEMI, non conteggi** |
| **P8** | «C'è un precedente di tabella di sola traccia» → **VERO** | `provato:` `supabase/migrations/001_commercial_infra.sql:85-97` — `lab_stato_log`: chiavi, `created_at`, RLS **abilitata** e **nessuna policy pubblica** («solo service role»). ➡️ È la forma che T5 ricalca |
| **P9** | Conteggio di riferimento della suite prima di toccare nulla | `provato:` `npx vitest run` → **`Test Files 358 passed | 3 skipped (361)` · `Tests 3850 passed | 19 skipped (3869)`**. ➡️ Ogni task confronta col **3850**, non con un numero ricordato |
| **P10** | «L'allowlist del `PATCH` è coperta da qualche prova» → **FALSA, ed è il buco che rende T3 pericoloso** | `provato:` `ALLOWED_PATCH_FIELDS` compare **solo** in `[imgId]/route.ts:10,11,62` e **mai** in un test; i tre test `PATCH` mandano tutti `{descrizione}` (`lavori-id-immagini-imgid-route.test.ts:326,333,339`) e asseriscono solo lo status. ➡️ **Aggiungere `categoria` all'allowlist NON accenderebbe nulla di rosso.** T3 scrive la prova che manca, prima del codice |
| **P11** | «Il `PATCH` valida i valori, non solo i nomi» → **FALSA** | `provato:` `[imgId]/route.ts:62-63` decide con `if (field in body)` e `:64` copia il valore **senza alcun controllo**. `{"ordine":"pippo"}` supera la guardia, il database rifiuta, e la rotta risponde **500** (`:85`) a un **errore del client**. ✅ **Nessun messaggio del database arriva al browser** (`:84` e `:163` finiscono in `console.error`): G9 è già rispettata, il difetto è **solo** lo status |
| **P12** | «Il punto d'innesto della cancellazione fisica è ovvio» → **NO, ed è preciso** | `provato:` la sequenza del `DELETE` è `CSRF :98` → auth `:102-105` → lab `:106-111` → guardia di esistenza `:117-128` → finestra sul lavoro `:131-140` → **409 `:142-147`** → mutazione `:153-160` → conteggio `:171-178` → 200 `:183`. ➡️ **`storage.remove` va DOPO la riga 147 e PRIMA della 153.** 🛑 **E rompe un test:** `lavori-id-immagini-imgid-route.test.ts:210` — il client finto (`:60-62`) espone **solo `from`**, quindi `svc.storage` è `undefined`. **T5 deve estendere la finta**, o il rosso sembrerà un difetto del codice |
| **P13** | «Il test-guardia degli otto siti tollera un elenco esplicito di colonne» → **NO** | `provato:` `lavori-immagini-deleted-embed.test.ts:41` conta con `/immagini:lavori_immagini\(\*\)/g` e `:43` pretende `> 0`. ➡️ **Sostituire `(*)` con un elenco di colonne fa FALLIRE il test**, anche col filtro corretto. 🛑 **Nessun task di questo piano tocca la grafia degli innesti** |
| **P14** | 🔑 **«Il VALORE della marca cambia il comportamento degli overlay» → FALSO, e chiude la domanda 1 di spec §16** | `provato:` in `storia-overlay.ts` il valore della marca **non è mai confrontato**: si scrive a `:88`, si rilegge con la stessa chiave a `:98`, si ri-spinge a `:116`, e il gate a `:131` è `if (!marcaEntry)` — sull'**esistenza**. Nessun `if (marca === …)` esiste. ⚠️ **E `type Marca` (`:67`) è un'unione chiusa NON esportata**: `entraOverlay('uaVisore', …)` **non compila**. ➡️ **DECISIONE: visore e tendina riusano `'uaSheet'`.** Costo zero, e **tiene verde** `scripts/guardia-navigazione-overlay.mjs:97`, che riconosce **solo** quelle due stringhe e registra un **guasto** se legge `marca: null` |
| **P15** | «Il modulo regge tre strati» → **SÌ, ed è una pila LIFO vera** | `provato:` `storia-overlay.ts:77` (`const pila: Voce[]`), `:123` (`push`), `:111` (`pop`). **Una sola entry di storia per l'INTERA pila** (`:78-79`): aprire il secondo overlay **non tocca** `marcaEntry`. Al back si chiude **solo il più alto** e l'entry si ri-spinge con la marca del nuovo capo (`:116`), **prima** di chiamare `chiudi()` (`:117`) |
| **P16** | 🛑 **«Il visore può bloccare lo scorrimento del corpo come fa `Sheet`» → NO: due blocchi si incastrano** | `provato:` `Sheet.tsx:248-253` si difende **solo dalla propria rientranza**. Un visore che bloccasse a sua volta catturerebbe `overflow:'hidden'` come «valore precedente» (`:249-252`) e alla chiusura lo **ripristinerebbe a hidden per sempre**. ➡️ **Regola: blocca SOLO lo strato più basso** (il visore). Tendina e conferma **non bloccano** |
| **P17** | «Lo z-index dà l'ordine degli strati» → **FALSO** | `provato:` esiste **un solo** valore, `zIndex: 1000`, sia su `Sheet.tsx:418` sia su `DialogConferma.tsx:182`; lo scrim non ha z-index (`Sheet.tsx:430-434`) e il pannello sta sopra **per ordine nel DOM**. Il dialog sta sopra lo sheet **per ordine di montaggio del portale**. Intervallo libero misurato: **302-999** (chrome v3 ≤ 60, legacy ≤ 301, avvisi 1100) e deve ospitare **due** livelli: visore < tendina < 1000 |
| **P18** | 🛑 **«Esc si comporta come il tasto indietro» → NO** | `provato:` `Sheet.tsx:158-165` e `DialogConferma.tsx:78-85` ascoltano **entrambi su `window`**: un solo Escape **collassa tutti gli strati insieme**, mentre il back ne chiude correttamente **uno solo** (`storia-overlay.ts:110-117`). Oggi la coppia sopravvive solo grazie a una guardia del compositore. ➡️ **Con tre strati va progettato**, o Esc chiude visore, tendina e conferma in un colpo |
| **P19** | «La conferma di eliminazione è un foglio dal basso, come nel mockup» → **da correggere** | `provato:` la conferma di casa è **`DialogConferma` (§5.17)**, non un foglio nuovo. ⚠️ **Ma non ha né gestione del focus né blocco dello scorrimento** (`DialogConferma.tsx:78-85`, solo Esc + `role`/`aria`), mentre `Sheet` sì (`Sheet.tsx:268-275`, `:241-264`). **Deviazione dal mockup dichiarata**, v. §«Scostamenti dal mockup» |
| **P20** | «Un overlay può essere montato dentro la pagina» → **NO** | `provato:` `src/app/ds-v3.css:1005-1011` impone il **portale su `document.body`** per qualunque overlay con z-index — il contenimento della shell della parete crea uno stacking context che lo intrappolerebbe |

---

## Registro delle LETTURE — R-P2

🛑 **L'elenco NON l'ha deciso l'autore del piano: è l'esito del censimento R-P6.** Ogni percorso porta
`letto` o `NON letto`. Le letture delegate sono state fatte con **domande falsificabili**, mai con un
riassunto.

| file | esito |
|---|---|
| `src/components/features/lavori/form/TabImmagini.tsx` | **letto: 1-692** (per intero, dal coordinatore) |
| `src/app/api/lavori/[id]/immagini/route.ts` | **letto: 1-121** (per intero) |
| `src/app/api/lavori/[id]/immagini/[imgId]/route.ts` | **letto: 1-190** (per intero, delegato — 9 domande falsificabili) |
| `supabase/migrations/002_fase2_schema.sql` | **letto: 242-263** (la tabella, le RLS, l'indice) |
| `src/types/domain.ts` | **letto: 475-486** (`LavoroImmagine`) |
| `src/types/database.types.ts` | **letto: 3015-3060** (`Row`/`Insert`/`Update`) |
| `src/app/(app)/lavori/[id]/page.tsx` | **letto: 25-80** (innesto, filtro, firma delle URL) |
| `src/app/(app)/lavori/[id]/modifica/page.tsx` | **letto: 45-100** |
| `src/components/ds/FotoStrip.tsx` | **letto: 1-28** (per intero) |
| `src/app/ds-v3-catalogo/page.tsx` | **letto: 1163-1178** (la sezione §5.33) |
| `src/app/ds-v3.css` | **letto: 230-262** (il ponte v2.3→v3) |
| `src/components/features/lavori/form/styles.ts` | **letto: 45-58** (`raisedShadow`, `insetShadow`) |
| `src/design-system/v3/tokens.ts` | **letto: 31-42** (`raggio`, `materia`) + **delegato per intero** |
| `src/components/ds/storia-overlay.ts` | **letto: 55-90** + **delegato per intero** |
| `tests/unit/lavori-immagini-deleted-embed.test.ts` | **letto: 26-49** (delegato: `FILES`, le due regex, le asserzioni) |
| `tests/unit/lavori-id-immagini-imgid-route.test.ts` | **letto: per intero** (delegato — 21 `it`, 28 casi) |
| `tests/unit/helpers/supabase-chain-mock.ts` | **letto: 23-27** (delegato: `createChain`, la lista passthrough) |
| `tests/unit/ds-v3/componenti/FotoStrip.test.tsx` | **letto: 1-33** (per intero) |
| `tests/unit/colore-dente-idratazione.test.ts` | **letto: 1-40** (il modello di prova che legge una migration) |
| `tests/unit/prezzo-tripwire.test.ts` | **letto: 1-26** (il modello di «spia onesta», coi limiti dichiarati) |
| `supabase/migrations/001_commercial_infra.sql` | **letto: 85-104** (`lab_stato_log`, forma della tabella di sola traccia) |
| `src/design-system/v3/{motion,haptic,sound}.ts` | **delegato per intero** |
| `src/components/ds/{Sheet,useNavigaDaOverlay}.tsx/.ts` | **delegato per intero** |
| `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` | **letto: 314-318** + **delegato per intero** |
| `src/components/features/lavori/LavoroFormClient.tsx` | **delegato per intero** |
| `scripts/guardia-navigazione-overlay.mjs` | **delegato (intestazione e bracci)** |

### 🔴 Quattro cose che la lettura ha trovato e che il piano NON avrebbe indovinato
1. **`ALLOWED_PATCH_FIELDS` non è coperta da NESSUNA prova** (P10) → aggiungere `categoria` non
   accenderebbe niente. **La prova si scrive prima del codice.**
2. **Il `PATCH` non valida i valori** (P11) e risponde **500** a un errore del client. ✅ Ma **non perde**
   messaggi del database: G9 è già rispettata: il difetto è **solo** lo status.
3. **La finta della catena Supabase espone solo `from`** (P12) → il primo `storage.remove` **romperà un
   test esistente** (`:210`) per una ragione che **non è un difetto del codice**. Va detto qui, o chi esegue
   perde mezz'ora.
4. **L'`update()` del `PATCH` è più debole del `DELETE`**: due `.eq()` invece di tre, **e senza**
   `.is('deleted_at', null)` **né conteggio delle righe** (`.single()` contro `deletedRows?.length`).
   ➡️ È **R26, più grande di come l'avevo registrato**: non è solo asimmetria, è la **corsa D52-a ancora
   aperta**. Il task che tocca quel file **la chiude, dichiarandolo nel mandato** (come D52, mai di nascosto).

---

## Censimento degli IDENTIFICATORI — R-P6

🛑 Non solo colonne: **ogni** simbolo esportato, nome di campo UI, membro di allowlist, chiave JSON.
**Ogni nome tolto porta la sua destinazione.**

### Colonne di `lavori_immagini`
| identificatore | oggi | destinazione |
|---|---|---|
| `tipo` | `TEXT NOT NULL DEFAULT 'foto' CHECK (tipo IN ('foto','scan','rx','altro'))` — `002_fase2_schema.sql:251-252`; pinnata a `'foto'` dall'INSERT (`immagini/route.ts:110`); **letta da nessuno** | 🗑️ **ELIMINATA** (T1). Non è l'asse del formato — due dei suoi quattro valori sono già due delle sei categorie. Il formato si deriva dall'estensione di `storage_path` |
| `categoria` | **non esiste** | 🆕 **CREATA** (T1): `TEXT NOT NULL` + `CHECK` sui sei di G6, **senza `DEFAULT`** |
| `descrizione` | testo libero; ci vive **impropriamente la categoria** (`TabImmagini.tsx:131,236,253`, letta a `:634`) | ✍️ **Smette di ospitare la categoria** (T3, T12). I valori vecchi restano, innocui. `COMMENT ON COLUMN` lo dichiara in banca dati |
| `ordine` | `SMALLINT NOT NULL DEFAULT 1` (`:253`) ma l'INSERT scrive **`0`** (`immagini/route.ts:111`) → **ambigua** | ⏸️ **NON si tocca e NON si usa.** Il piano non la ripara: l'ordine è per categoria (G7) e il contatore «n di m» si conta dalla **posizione nell'elenco** |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` (`:254`) — esiste in banca dati ma **manca dal tipo di dominio** | ✅ **Entra in `LavoroImmagine`** (T1): è la chiave d'ordine **dentro** il gruppo |

### Simboli TypeScript
| identificatore | dove | destinazione |
|---|---|---|
| `LavoroImmagine` | `src/types/domain.ts:475-486` · usato in `LavoroFormClient.tsx:9,74,128` · `TabImmagini.tsx:6,83,85,150` | ✏️ **T1**: `-tipo`, `+categoria`, `+created_at` |
| `TipoFoto` (locale) | `TabImmagini.tsx:13` · usato a `:31,121,198,225,248,525,637` | 🔄 **T2**: sostituito dal tipo esportato `CategoriaFoto`. La copia locale **sparisce** |
| `TIPI_FOTO` (locale) | `TabImmagini.tsx:15-22` · usato a `:543,634,655` | 🔄 **T2**: sostituito da `CATEGORIE_FOTO` in `src/lib/domain/`. La copia locale **sparisce** |
| `ALLOWED_PATCH_FIELDS` | `api/lavori/[id]/immagini/[imgId]/route.ts:10` — `['descrizione','tipo','ordine']` · usata a `:62` | ✏️ **T3**: `tipo` **esce** (la colonna non esiste più), `categoria` **entra** **con validazione dei valori** |
| `AllowedField` | stesso file `:11` | ✏️ segue `ALLOWED_PATCH_FIELDS` |
| `handleTipoChange` / `handleTipoChangeDb` | `TabImmagini.tsx:224-244` e `:247-260` — **due gestori quasi identici** | 🔗 **T12: si FONDONO in una sola funzione di scrittura** (D70) |
| `totalFotos` | `TabImmagini.tsx:117` — somma banca dati **+** locali già caricate → **conta doppio** | 🐞 **T12**, difetto chiuso |
| `foteDaRenderizzare` | `TabImmagini.tsx:287` — rende **tutte** le locali, comprese quelle già salite → **doppione** | 🐞 **T12**, difetto chiuso |
| `FotoStrip` | `src/components/ds/FotoStrip.tsx` · **tre** chiamanti (P5) | 🔄 **T11**: assorbita dalla carta album. Tutti e tre i siti si aggiornano |
| `handleAddImmagine` | `LavoroFormClient.tsx:128`, passata a `:204` | ➕ **T13**: gli si affianca il percorso di **rimozione** dallo stato, che **oggi non esiste** |
| 🆕 `CATEGORIE_FOTO`, `CategoriaFoto`, `etichettaCategoria`, `ordinaFotoPerCategoria` | — | **T2**, in `src/lib/domain/categorie-foto.ts` |
| 🆕 `CartaAlbum`, `VisoreFoto`, `TendinaMenu`, `FoglioCategoria` | — | **T7-T10**, in `src/components/ds/` |

### Chiavi JSON e campi di modulo
| chiave | dove | destinazione |
|---|---|---|
| `descrizione` (campo FormData del POST) | inviata da `TabImmagini.tsx:131`, letta a `immagini/route.ts:97-98` | 🔄 **T3**: diventa `categoria`, **obbligatoria** — un POST senza di lei è **422** |
| `immagine` (chiave della risposta 201) | `immagini/route.ts:120` | ⏸️ invariata |
| `{ descrizione: … }` (corpo del PATCH) | `TabImmagini.tsx:236,253` | 🔄 **T12**: diventa `{ categoria: … }` |

---

## Scostamenti dal mockup approvato — dichiarati, non silenziosi

🛑 Il mockup è stato approvato da Francesco (D76-D79). Dove il piano se ne discosta, **lo dice qui e la
ragione è di legge**, mai di comodo.

| # | il mockup mostra | il piano fa | perché |
|---|---|---|---|
| **S1** | la **conferma di eliminazione** come **foglio dal basso** | usa **`DialogConferma`** (§5.17), che è una **card centrata da 340** | `provato:` `src/components/ds/DialogConferma.tsx:3-9` — è **«l'UNICA card centrata ammessa dal design system, riservata alle conferme distruttive»**, ed è una **eccezione dichiarata** al divieto di modal centrati su mobile (§5.16). ➡️ Usare la casa costa **zero componenti nuovi** e rispetta la legge; disegnarne un altro la violerebbe. ⚠️ **La forma che Francesco vedrà è diversa da quella del mockup: va detto, non dedotto** |
| **S2** | le sei categorie con **emoji** | 🚧 **le emoji restano segnaposto** finché non ci sono le icone vere | il mockup **lo dichiara**. **T10 nasce con le emoji e una nota**, e le icone vere sono un passo suo (v. §Fuori perimetro) |

---

## Accessibilità — quello che i tre strati NON hanno gratis

🔴 Misurato, non assunto. **`Sheet` fa** (`Sheet.tsx`): `role="dialog"` + `aria-modal` + `aria-labelledby`
(`:343-346`) · `tabIndex={-1}` (`:347`) · **Esc** (`:158-165`) · **focus al contenitore e RITORNO
all'apritore** (`:268-275`) · **blocco dello scorrimento del corpo** con compensazione della barra
(`:241-264`) · **portale su `document.body`** (`:367`) · anti-clic-fantasma sullo scrim (`:155`).
**`Sheet` NON fa:** trappola del focus (nessun handler `Tab` in tutto il file), `inert`, `aria-hidden`
sulla pagina dietro. **`DialogConferma` non ha né focus né blocco dello scorrimento**: solo Esc e i ruoli.

➡️ **Conseguenze che i task devono rispettare:**
1. **Solo il visore blocca lo scorrimento** (P16). La tendina **non blocca**, o il corpo resta bloccato per
   sempre.
2. **Esc va mediato dalla pila** (P18), o un solo Escape chiude tutti e tre gli strati insieme mentre il
   tasto «indietro» ne chiude uno.
3. **La tendina deve rifare da zero** ciò che `Sheet` ha già: ruoli, Esc, focus e ritorno del focus,
   portale. È il **secondo** dei due costi di D78, e qui è misurato invece che previsto.

---

## Struttura dei file

**Da creare**
- `supabase/migrations/20260730150000_lavori_immagini_categoria.sql` — 🆕 la colonna, il backfill, il vincolo, il `DROP` di `tipo`
- `supabase/migrations/20260730150100_lavori_immagini_eliminazioni_log.sql` — 🆕 la traccia di D63
- `src/lib/domain/categorie-foto.ts` — 🆕 **unica fonte** dei sei valori, delle etichette, dell'ordine dei gruppi e della funzione d'ordinamento
- 🆕 **da creare:** `src/components/ds/CartaAlbum.tsx` · `src/components/ds/VisoreFoto.tsx` · `src/components/ds/TendinaMenu.tsx` · `src/components/ds/FoglioCategoria.tsx`
- `tests/unit/categorie-foto.test.ts` · `tests/unit/categorie-foto-spia-migration.test.ts` — 🆕
- 🆕 **da creare:** `tests/unit/ds-v3/componenti/CartaAlbum.test.tsx` · `tests/unit/ds-v3/componenti/VisoreFoto.test.tsx` · `tests/unit/ds-v3/componenti/TendinaMenu.test.tsx` · `tests/unit/ds-v3/componenti/FoglioCategoria.test.tsx`
- `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` — 🆕 la proposta delle §5.x (T6)

**Da modificare**
- `src/types/domain.ts:475-486` · `src/types/database.types.ts` (**generato**, mai a mano)
- `src/app/api/lavori/[id]/immagini/route.ts` (POST) · `.../[imgId]/route.ts` (PATCH + DELETE)
- `src/components/features/lavori/form/TabImmagini.tsx` · `src/components/features/lavori/LavoroFormClient.tsx`
- `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx:315-316` · `src/app/ds-v3-catalogo/page.tsx:1165-1170`
- `tests/unit/ds-v3/componenti/FotoStrip.test.tsx`

---

## I task, in blocchi

| blocco | task | che cosa consegna |
|---|---|---|
| **A — il dato** | T1 · T2 · T3 | la categoria diventa un dato che il database difende |
| **B — la cancellazione vera** | T4 | l'emendamento di T8 (D61 + D63): il file sparisce davvero, e resta la traccia |
| **C — i componenti** | T5 · T6 · T7 · T8 · T9 | le quattro superfici, in `ds/`, v3 pure |
| **D — l'innesto** | T10 · T11 · T12 | l'album entra sulle due superfici e il vecchio esce |
| **E — la chiusura** | T13 | FASE 7 · FASE 9 nel browser · **FASE 9b gate estetico L2** |

🛑 **L'ordine non è negoziabile fra A e D:** T11 tocca `TabImmagini`, che oggi scrive la categoria in
`descrizione`. Farlo prima di T1 significherebbe scrivere in una colonna che sta per cambiare.
🔑 **B può viaggiare in parallelo a C**, ma **deve atterrare prima di T12** (spec §2: altrimenti «Elimina
foto» dice il falso).

---

# BLOCCO A — il dato

### Task 1 — la colonna `categoria` nasce, `tipo` se ne va

**File**
- 🆕 da creare: `supabase/migrations/20260730150000_lavori_immagini_categoria.sql`
- Modifica: `src/types/database.types.ts` (**generato — mai a mano**)
- Modifica: `src/types/domain.ts:475-486`
- Modifica: `src/app/api/lavori/[id]/immagini/route.ts:102-112`

**Interfacce**
- **Produce:** la colonna `lavori_immagini.categoria` (`TEXT NOT NULL`, `CHECK` sui sei di **G6**, **senza
  `DEFAULT`**) · `LavoroImmagine` con `categoria: string` e `created_at: string`, **senza** `tipo`.
- **Consuma:** niente (è il primo task).

- [ ] **Passo 1 — scrivi la migration**

🛑 **L'ordine delle istruzioni è la parte che conta: è ciò che impedisce alla migration di abortire.**

```sql
-- 20260730150000_lavori_immagini_categoria.sql
-- D72 · D73 — la categoria della foto diventa un dato che il database difende,
-- e la colonna `tipo` se ne va.
--
-- Perché `tipo` si elimina e non si allarga (D73, panel di due advisor):
--   • non è l'asse del "formato": due dei suoi quattro valori (`rx`, `altro`)
--     sono già due delle sei CATEGORIE, e 'foto' dentro una tabella che si
--     chiama lavori_immagini non dice nulla;
--   • il formato è già derivabile da storage_path (NOT NULL) che porta sempre
--     l'estensione, presa da un'allowlist chiusa di sei
--     (api/lavori/[id]/immagini/route.ts:11-18);
--   • non la legge nessuno: otto siti innestano (*) e nessuno la consuma.
-- Pareggio del panel rotto da W23 (Francesco, 27/07): «se serve usala sennò togli».

-- 1. nullable, nessun vincolo ancora.
ALTER TABLE lavori_immagini ADD COLUMN IF NOT EXISTS categoria TEXT;

-- 2. backfill TOTALE.
-- 🛑 NESSUN filtro su deleted_at: è l'abitudine di casa (la fa la RLS, la fanno
--    tutti e otto i lettori) e QUI sarebbe un difetto — le righe cancellate
--    resterebbero NULL e il SET NOT NULL del passo 4 ABORTIREBBE.
-- 🛑 Il CASE è TOTALE per costruzione (ELSE 'altro'): il rischio smette di
--    dipendere dal contenuto di `descrizione`, che non è stato misurato
--    (server MCP non autenticato — v. spec §15 voce 1).
UPDATE lavori_immagini
SET categoria = CASE
      WHEN descrizione IN ('impronta','pre_lavoro','colore','post_prova','rx','altro')
        THEN descrizione
      ELSE 'altro'
    END
WHERE categoria IS NULL;

-- 3. il vincolo DOPO il backfill.
-- 🛑 Se venisse prima, validerebbe SUBITO le righe esistenti e aborterebbe sul
--    primo `descrizione` fuori elenco.
ALTER TABLE lavori_immagini
  ADD CONSTRAINT lavori_immagini_categoria_check
  CHECK (categoria IN ('impronta','pre_lavoro','colore','post_prova','rx','altro'));

-- 4. obbligatoria, SENZA DEFAULT.
-- 🔑 Con un ripiego il compilatore TACE e uno scrittore che dimentica la
--    categoria passa inosservato — cioè D65 riprodotta di una colonna più in là.
--    Senza, `gen types` la rende OBBLIGATORIA nell'Insert e `tsc` si accende
--    sull'unico scrittore. Provato: le colonne CON default escono opzionali
--    (`tipo?`, `ordine?`), quelle SENZA escono obbligatorie (`storage_path`).
ALTER TABLE lavori_immagini ALTER COLUMN categoria SET NOT NULL;

-- 5. via la colonna che mente.
ALTER TABLE lavori_immagini DROP COLUMN tipo;

COMMENT ON COLUMN lavori_immagini.categoria IS
  'Categoria fotografica, elenco CHIUSO ratificato da Francesco il 30/07/2026 (D72). Asse distinto dal formato del file, che si deriva dall''estensione di storage_path.';
COMMENT ON COLUMN lavori_immagini.descrizione IS
  'Testo libero. Fino al 30/07/2026 ha ospitato IMPROPRIAMENTE la categoria: i valori vecchi restano ma non si leggono più come categoria (D73).';
```

- [ ] **Passo 2 — applica e rigenera i tipi (FASE 6b)**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
```
⚠️ Se il file finisce con un messaggio della CLI, **toglilo**: è già successo.

- [ ] **Passo 3 — fai fallire `tsc`, e CONTA dove**

Esegui: `npx tsc --noEmit`
**Atteso — e questa previsione porta il suo marchio, `non eseguito`:** rosso su
`src/app/api/lavori/[id]/immagini/route.ts`, alla chiamata `.insert({…})` (`:102-112`), per **due**
ragioni insieme — `tipo` non esiste più nell'`Insert`, e `categoria` è **obbligatoria e manca**.

🛑 **Ciò che NON diventa rosso, e va cambiato a mano proprio per questo:** `src/types/domain.ts:475-486`.
`LavoroImmagine` è un tipo **scritto a mano**, non generato: nessun compilatore si lamenterà se resta
sbagliato. **Il passo 4 lo cambia deliberatamente.** *(Prima di aprire, incolla nel rapporto l'elenco vero
dei file rossi: se sono più di uno, il piano ha sbagliato una previsione e va detto — R-E2.)*

- [ ] **Passo 4 — allinea il tipo di dominio**

`src/types/domain.ts` — sostituisci il blocco `LavoroImmagine`:

```ts
export interface LavoroImmagine {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  url: string;
  storage_path: string;
  nome_file: string | null;
  descrizione: string | null;
  data_scatto: string | null;
  /** Categoria fotografica — elenco chiuso, D72. La fonte dei valori è
   *  src/lib/domain/categorie-foto.ts — mai una copia locale. */
  categoria: string;
  /** Serve a ordinare DENTRO il gruppo (D71). Esiste in banca dati da sempre
   *  (`002_fase2_schema.sql:254`) ma mancava da questo tipo. */
  created_at: string;
  ordine: number;
}
```

- [ ] **Passo 5 — chiudi il rosso nello scrittore**

`src/app/api/lavori/[id]/immagini/route.ts` — nell'`.insert({…})`: **togli** la riga `tipo: 'foto',`.
🛑 **NON aggiungere ancora `categoria`**: la scrive **T3**, insieme alla validazione. Per far compilare
adesso, e **solo** adesso, T1 la passa esplicita:

```ts
      descrizione: descrizioneValue,
      categoria: 'altro',   // ⚠️ PONTE DI T1, sostituito da T3 con il valore vero dal client
      ordine: 0,
```

- [ ] **Passo 6 — verde, e confronta col riferimento**

```bash
npx tsc --noEmit && npx vitest run
```
Atteso: `tsc` **0**, e **3850 passati | 19 saltati** — identico al riferimento P9. 🛑 **Un numero diverso
va spiegato prima di andare avanti**, non dopo. ⚠️ `vitest` non è deterministico: un solo rosso con durata
anomala su un file **non toccato** si isola (`.superpowers/sdd/diagnosi-flake-vitest.md:235`); la stessa
firma su un file **toccato** è un difetto tuo finché non provi il contrario.

- [ ] **Passo 7 — salva**

```bash
git add -f supabase/migrations/20260730150000_lavori_immagini_categoria.sql src/types/database.types.ts src/types/domain.ts "src/app/api/lavori/[id]/immagini/route.ts"
git commit -F <file-messaggio> -- supabase/migrations/20260730150000_lavori_immagini_categoria.sql src/types/database.types.ts src/types/domain.ts "src/app/api/lavori/[id]/immagini/route.ts"
```
🛑 Il messaggio va in un **file**, mai inline: i backtick nel messaggio **vengono eseguiti dalla shell**.

---

### Task 2 — l'unica fonte dei sei valori, e la spia che impedisce alla lista di sdoppiarsi

**File**
- 🆕 da creare: `src/lib/domain/categorie-foto.ts`
- 🆕 da creare: `tests/unit/categorie-foto.test.ts`
- 🆕 da creare: `tests/unit/categorie-foto-spia-migration.test.ts`

**Interfacce**
- **Consuma:** la migration di T1 (la legge come dato, non la importa).
- **Produce:** `CategoriaFoto` (unione dei sei) · `CATEGORIE_FOTO: readonly {valore, etichetta}[]` in
  **ordine D71** · `etichettaCategoria(v): string` · `ordinaFotoPerCategoria<T extends {categoria: string;
  created_at: string; id: string}>(foto: T[]): T[]` · `raggruppaPerCategoria<T>(foto: T[]):
  Array<{categoria: CategoriaFoto; etichetta: string; foto: T[]}>`.

- [ ] **Passo 1 — scrivi le prove PRIMA (RED)**

`tests/unit/categorie-foto.test.ts` (🆕 da creare):

```ts
import { describe, expect, it } from 'vitest'
import {
  CATEGORIE_FOTO,
  etichettaCategoria,
  ordinaFotoPerCategoria,
  raggruppaPerCategoria,
} from '@/lib/domain/categorie-foto'

const f = (id: string, categoria: string, created_at: string) => ({ id, categoria, created_at })

describe('categorie-foto — l\'elenco chiuso di D72 e l\'ordine di D71', () => {
  it('sei voci, nell\'ordine cronologico di D71 — MAI alfabetico', () => {
    expect(CATEGORIE_FOTO.map((c) => c.valore)).toEqual([
      'impronta', 'pre_lavoro', 'colore', 'post_prova', 'rx', 'altro',
    ])
  })

  it('le etichette sono quelle ratificate da Francesco', () => {
    expect(CATEGORIE_FOTO.map((c) => c.etichetta)).toEqual([
      'Impronta', 'Pre-lavoro', 'Guida colore', 'Post-prova', 'Radiografia', 'Altro',
    ])
  })

  it('etichettaCategoria ripiega sul valore grezzo se arriva un valore ignoto', () => {
    expect(etichettaCategoria('rx')).toBe('Radiografia')
    expect(etichettaCategoria('sconosciuta')).toBe('sconosciuta')
  })

  // 🛑 IL CASO CHE DEVE FALLIRE se qualcuno "semplifica" in ORDER BY alfabetico:
  // alfabeticamente `altro` verrebbe PRIMA di `impronta`.
  it('«altro» sta in FONDO, mai davanti — il caso che uccide l\'ordinamento alfabetico', () => {
    const dato = [f('a', 'altro', '2026-01-01'), f('b', 'impronta', '2026-06-01')]
    expect(ordinaFotoPerCategoria(dato).map((x) => x.id)).toEqual(['b', 'a'])
  })

  it('dentro il gruppo ordina per created_at crescente, con id come spareggio', () => {
    const dato = [
      f('tardi', 'impronta', '2026-06-02T10:00:00Z'),
      f('presto', 'impronta', '2026-06-01T10:00:00Z'),
      f('b', 'impronta', '2026-06-01T10:00:00Z'),
    ]
    expect(ordinaFotoPerCategoria(dato).map((x) => x.id)).toEqual(['b', 'presto', 'tardi'])
  })

  it('una categoria ignota non sparisce: finisce in fondo, dopo «altro»', () => {
    const dato = [f('x', 'categoria_del_futuro', '2026-01-01'), f('a', 'altro', '2026-01-01')]
    expect(ordinaFotoPerCategoria(dato).map((x) => x.id)).toEqual(['a', 'x'])
  })

  it('raggruppa saltando i gruppi vuoti, nell\'ordine di D71', () => {
    const dato = [f('r', 'rx', '2026-01-01'), f('i', 'impronta', '2026-01-01')]
    const gruppi = raggruppaPerCategoria(dato)
    expect(gruppi.map((g) => g.categoria)).toEqual(['impronta', 'rx'])
    expect(gruppi.map((g) => g.etichetta)).toEqual(['Impronta', 'Radiografia'])
    expect(gruppi[0].foto.map((x) => x.id)).toEqual(['i'])
  })

  it('elenco vuoto: nessun gruppo, nessuna eccezione', () => {
    expect(raggruppaPerCategoria([])).toEqual([])
    expect(ordinaFotoPerCategoria([])).toEqual([])
  })
})
```

`tests/unit/categorie-foto-spia-migration.test.ts` (🆕 da creare) — 🔑 **la spia, e la ragione della sua forma**:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { CATEGORIE_FOTO } from '@/lib/domain/categorie-foto'

// ═══════════════════════════════════════════════════════════════════════════
// SPIA — la lista dei sei valori vive in TRE posti: il CHECK della migration,
// questa costante TypeScript, e la validazione della rotta (T3).
//
// 🛑 SERVE perché il database NON restringe il tipo generato: `gen types`
//    produce `categoria: string`, non l'unione dei sei (provato su
//    `lavori_immagini.tipo`, che ha un CHECK identico ed esce `string`).
//    Senza questa prova, migration e codice divergono IN SILENZIO.
//
// 🔑 CONFRONTA INSIEMI, NON CONTEGGI, e la ragione è un difetto vero già
//    pagato: `colore-dente-idratazione.test.ts:21-33` legge una migration e
//    pretende esattamente 48 — quindi resterebbe VERDE se il catalogo
//    crescesse (rilievo R3 del verbale). Un confronto di insiemi si accende
//    sia se la migration cresce, sia se cresce il codice.
// ═══════════════════════════════════════════════════════════════════════════

const MIGRATION = 'supabase/migrations/20260730150000_lavori_immagini_categoria.sql'

function valoriDalCheck(): string[] {
  const sql = readFileSync(MIGRATION, 'utf-8')
  const m = sql.match(/CHECK \(categoria IN \(([^)]+)\)\)/)
  if (!m) throw new Error('CHECK su `categoria` non trovato nella migration: la spia non può provare nulla')
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

describe('spia — il CHECK della migration e la costante TypeScript non possono divergere', () => {
  it('gli INSIEMI coincidono, in entrambe le direzioni', () => {
    const daSql = new Set(valoriDalCheck())
    const daTs = new Set(CATEGORIE_FOTO.map((c) => c.valore))
    expect([...daTs].filter((v) => !daSql.has(v))).toEqual([])  // nel codice, non nel database
    expect([...daSql].filter((v) => !daTs.has(v))).toEqual([])  // nel database, non nel codice
  })

  it('la migration NON dà un valore di ripiego a `categoria` (D73)', () => {
    const sql = readFileSync(MIGRATION, 'utf-8')
    expect(sql).toMatch(/ALTER COLUMN categoria SET NOT NULL/)
    expect(sql).not.toMatch(/categoria[^;]*SET DEFAULT/)
  })

  it('il backfill NON filtra deleted_at — o SET NOT NULL aborterebbe', () => {
    const sql = readFileSync(MIGRATION, 'utf-8')
    const backfill = sql.slice(sql.indexOf('UPDATE lavori_immagini'), sql.indexOf('ADD CONSTRAINT'))
    expect(backfill).not.toMatch(/deleted_at/)
  })
})
```

- [ ] **Passo 2 — guarda il rosso, e CONTA (R-P4)**

Esegui (🆕 i due file li crea questo task): `npx vitest run tests/unit/categorie-foto.test.ts tests/unit/categorie-foto-spia-migration.test.ts`
Atteso: **rosso da «modulo non trovato»**, che **non prova niente**.
➡️ Metti un **abbozzo inerte** e riesegui:

```ts
// src/lib/domain/categorie-foto.ts — ABBOZZO INERTE, da buttare
export const CATEGORIE_FOTO = [] as const
export function etichettaCategoria(v: string): string { return v }
export function ordinaFotoPerCategoria<T>(foto: T[]): T[] { return foto }
export function raggruppaPerCategoria<T>(_foto: T[]): [] { return [] }
```
**Scrivi nel rapporto quante asserzioni si accendono, nella forma `N su M`**, e incolla l'abbozzo: un
`N su M` senza la forma dell'abbozzo **non è riproducibile, quindi non è una prova**.

- [ ] **Passo 3 — le forme d'input, enumerate prima delle asserzioni**

Scrivi nel rapporto quali forme sono coperte e quali no, **con il perché**: elenco vuoto ✅ · categoria
ignota ✅ · `created_at` uguale (spareggio su `id`) ✅ · `categoria` `null`/`undefined` → **non coperta,
perché il tipo la dichiara `string` e la colonna è `NOT NULL`: un `null` qui sarebbe un difetto di T1, non
di T2** · elenco enorme → non coperta, il costo è lineare e le foto per lavoro sono 4-20.

- [ ] **Passo 4 — scrivi il modulo**

```ts
// src/lib/domain/categorie-foto.ts
//
// UNICA FONTE dei sei valori di categoria foto (D72, elenco CHIUSO ratificato da
// Francesco il 30/07/2026) e del loro ordine di gruppo (D71, cronologico).
//
// 🛑 L'ordine NON è esprimibile come .order() di PostgREST: alfabeticamente
//    `altro` verrebbe PRIMA di tutto, cioè l'esatto contrario di D71. Si ordina
//    qui, dopo la lettura — con 4-20 foto per lavoro il costo è nullo.
// 🛑 Nessuna copia locale di questa lista. La copia che c'era
//    (`TabImmagini.tsx:13-22`) sparisce in T11.

export const CATEGORIE_FOTO = [
  { valore: 'impronta',   etichetta: 'Impronta' },
  { valore: 'pre_lavoro', etichetta: 'Pre-lavoro' },
  { valore: 'colore',     etichetta: 'Guida colore' },
  { valore: 'post_prova', etichetta: 'Post-prova' },
  { valore: 'rx',         etichetta: 'Radiografia' },
  { valore: 'altro',      etichetta: 'Altro' },
] as const

export type CategoriaFoto = (typeof CATEGORIE_FOTO)[number]['valore']

const POSIZIONE = new Map<string, number>(CATEGORIE_FOTO.map((c, i) => [c.valore, i]))

/** `true` se il valore è una delle sei. Usata dalla rotta per rispondere 422. */
export function isCategoriaFoto(v: unknown): v is CategoriaFoto {
  return typeof v === 'string' && POSIZIONE.has(v)
}

/** L'etichetta da mostrare. Ripiega sul valore grezzo: meglio una sigla che il vuoto. */
export function etichettaCategoria(valore: string): string {
  return CATEGORIE_FOTO.find((c) => c.valore === valore)?.etichetta ?? valore
}

type Ordinabile = { id: string; categoria: string; created_at: string }

/** Una categoria che non conosciamo finisce DOPO «altro», mai davanti: un dato
 *  inatteso non deve mai occupare la foto grande della carta. */
function rango(categoria: string): number {
  return POSIZIONE.get(categoria) ?? CATEGORIE_FOTO.length
}

export function ordinaFotoPerCategoria<T extends Ordinabile>(foto: T[]): T[] {
  return [...foto].sort(
    (a, b) =>
      rango(a.categoria) - rango(b.categoria) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  )
}

export function raggruppaPerCategoria<T extends Ordinabile>(
  foto: T[],
): Array<{ categoria: string; etichetta: string; foto: T[] }> {
  const ordinate = ordinaFotoPerCategoria(foto)
  const gruppi: Array<{ categoria: string; etichetta: string; foto: T[] }> = []
  for (const f of ordinate) {
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo && ultimo.categoria === f.categoria) ultimo.foto.push(f)
    else gruppi.push({ categoria: f.categoria, etichetta: etichettaCategoria(f.categoria), foto: [f] })
  }
  return gruppi
}
```

- [ ] **Passo 5 — verde, e la mutazione che deve UCCIDERE la prova**

```bash
npx vitest run tests/unit/categorie-foto.test.ts tests/unit/categorie-foto-spia-migration.test.ts   # 🆕 creati da questo task
```
Atteso: tutte verdi. **Poi prova che mordono**, e incolla gli esiti nel rapporto:
1. **M1** — riordina `CATEGORIE_FOTO` in ordine alfabetico → **atteso: rosse** le due prove dell'ordine.
2. **M2** — nella migration cambia `'post_prova'` in `'postprova'` → **atteso: rossa** la spia, in
   **entrambe** le direzioni.
3. **M3** — in `rango()` sostituisci `?? CATEGORIE_FOTO.length` con `?? -1` → **atteso: rossa** la prova
   della categoria ignota.
🛑 Rimetti tutto a posto dopo ogni mutazione, e **conta**: se una mutazione **non** uccide nulla, la prova
corrispondente è decorativa e va riscritta.

- [ ] **Passo 6 — salva**

```bash
git commit -F <file-messaggio> -- src/lib/domain/categorie-foto.ts tests/unit/categorie-foto.test.ts tests/unit/categorie-foto-spia-migration.test.ts
```

---

### Task 3 — le rotte scrivono e validano la categoria, e si chiude la corsa D52-a

**File**
- Modifica: `src/app/api/lavori/[id]/immagini/route.ts` (POST — `:96-112`)
- Modifica: `src/app/api/lavori/[id]/immagini/[imgId]/route.ts` (PATCH — `:10`, `:60-78`)
- Modifica: `tests/unit/lavori-id-immagini-imgid-route.test.ts`

**Interfacce**
- **Consuma:** `isCategoriaFoto`, `CATEGORIE_FOTO` da `@/lib/domain/categorie-foto` (T2).
- **Produce:** `POST /api/lavori/[id]/immagini` accetta il campo FormData **`categoria`** (obbligatorio,
  **422** se manca o è fuori elenco) · `PATCH …/[imgId]` accetta `categoria` **validata** (**422**, non 500).

🛑 **DENTRO IL MANDATO, dichiarato qui e non corretto di nascosto (come D52):** l'`update()` del `PATCH`
(`[imgId]/route.ts:75-76`) ha **due** `.eq()` invece di tre, **non** filtra `deleted_at` e **non** conta le
righe toccate — mentre il `DELETE` fa tutte e tre le cose (`:156-159`, `:171-178`). È **R26**, ed è la
**corsa D52-a ancora aperta**: fra la guardia e l'update, una cancellazione concorrente lascia il PATCH
rispondere **200 su un fantasma**. Da oggi quella cancellazione è **fisica** (T4), quindi il fantasma è una
riga che **non esiste più**. ➡️ **T3 la chiude.**

- [ ] **Passo 1 — le prove PRIMA (RED)**

Aggiungi in `tests/unit/lavori-id-immagini-imgid-route.test.ts`. ⚠️ **La forma della finta è quella di
casa** (`tests/unit/helpers/supabase-chain-mock.ts:23`), e `update` **si scrive a mano** perché non è nella
lista passthrough:

```ts
  // ── T3 · la validazione dei VALORI, che oggi non esiste ──────────────────
  // 🛑 Provato scrivendo il piano: `ALLOWED_PATCH_FIELDS` non è coperta da
  //    NESSUNA prova (i tre test PATCH mandano tutti {descrizione}), quindi
  //    aggiungere `categoria` all'allowlist NON accenderebbe nulla di rosso.
  //    Queste prove sono il rosso che mancava.
  it('PATCH con categoria fuori elenco → 422, e la riga NON viene toccata', async () => {
    const updateCalls: unknown[] = []
    let immaginiCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori_immagini') {
        immaginiCallCount += 1
        if (immaginiCallCount === 1) return existingChain
        return { update: (payload: unknown) => { updateCalls.push(payload); return updateChain } }
      }
      if (table === 'lavori') return lavoroChain
      throw new Error(`tabella inattesa nel mock: ${table}`)
    })

    const res = await PATCH(richiestaPatch({ categoria: 'pippo' }), ctx)
    expect(res.status).toBe(422)
    expect(updateCalls).toHaveLength(0)   // ← il controllo POSITIVO: non ha nemmeno provato a scrivere
  })

  it('PATCH con categoria valida → 200, e il payload porta esattamente quella chiave', async () => {
    const updateCalls: unknown[] = []
    let immaginiCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori_immagini') {
        immaginiCallCount += 1
        if (immaginiCallCount === 1) return existingChain
        return { update: (payload: unknown) => { updateCalls.push(payload); return updateChain } }
      }
      if (table === 'lavori') return lavoroChain
      throw new Error(`tabella inattesa nel mock: ${table}`)
    })

    const res = await PATCH(richiestaPatch({ categoria: 'rx' }), ctx)
    expect(res.status).toBe(200)
    expect(updateCalls).toEqual([{ categoria: 'rx' }])
  })

  it('R26 — l\'update filtra deleted_at e conta le righe, come fa il DELETE', async () => {
    // Il controllo NEGATIVO da solo non basterebbe: si asserisce sui filtri COSTRUITI,
    // perché con zero righe cancellate in banca un filtro inerte darebbe lo stesso esito.
    const eqChiamate: Array<[string, unknown]> = []
    const isChiamate: Array<[string, unknown]> = []
    // …costruzione della finta che registra .eq() e .is() sull'update…
    await PATCH(richiestaPatch({ categoria: 'rx' }), ctx)
    expect(eqChiamate.map(([col]) => col).sort()).toEqual(['id', 'laboratorio_id', 'lavoro_id'])
    expect(isChiamate).toContainEqual(['deleted_at', null])
  })
```

- [ ] **Passo 2 — guarda il rosso e conta**

Esegui: `npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts`
Atteso: le tre nuove **rosse** — la prima perché oggi esce **500** (non 422) e l'update **viene chiamato**;
la terza perché i filtri sono **due** e `deleted_at` non c'è. Scrivi `N su M` nel rapporto.

- [ ] **Passo 3 — il POST scrive la categoria vera**

`src/app/api/lavori/[id]/immagini/route.ts`, sostituisci il blocco `:96-99` e la riga-ponte di T1:

```ts
// La categoria si chiede allo SCATTO (D65) e arriva col caricamento.
// 🛑 Obbligatoria: la colonna è NOT NULL senza ripiego (D73), quindi qui non
//    si indovina. Se il foglio viene chiuso senza scegliere, è il CLIENT che
//    manda 'altro' esplicitamente (D74) — il server non decide al posto suo.
const categoriaGrezza = formData.get('categoria')
if (!isCategoriaFoto(categoriaGrezza)) {
  return NextResponse.json(
    { error: 'Categoria della foto mancante o non valida', motivo: 'categoria_non_valida' },
    { status: 422 },
  )
}

const descrizione = formData.get('descrizione')
const descrizioneValue = typeof descrizione === 'string' && descrizione ? descrizione : null
```
e nell'`.insert({…})`: `categoria: categoriaGrezza,` **al posto** della riga-ponte di T1.

🛑 **Il controllo va PRIMA del caricamento su Storage** (`:84-94`), o un rifiuto lascerebbe **un file
orfano** nell'archivio. *(Verificalo: se la lettura del FormData avviene dopo l'upload, sposta il blocco.)*

- [ ] **Passo 4 — il PATCH valida, e l'update si allinea al DELETE**

`src/app/api/lavori/[id]/immagini/[imgId]/route.ts`:

```ts
const ALLOWED_PATCH_FIELDS = ['descrizione', 'categoria', 'ordine'] as const
```
🔑 **`tipo` esce, e la sua destinazione è scritta: la colonna non esiste più** (T1). `descrizione` **resta**
patchabile ma **non è più la categoria** (D73).

Nel ciclo di costruzione del payload (`:62-66`), dopo la copia del valore:

```ts
  if (field === 'categoria' && !isCategoriaFoto(body[field])) {
    return NextResponse.json(
      { error: 'Categoria della foto non valida', motivo: 'categoria_non_valida' },
      { status: 422 },
    )
  }
```

E l'`update()` (`:72-78`) prende **la stessa forma del `DELETE`** — tre `.eq()`, il filtro su `deleted_at`,
e il conteggio delle righe invece di `.single()`:

```ts
  const { data: righe, error: updateError } = await svc
    .from('lavori_immagini')
    .update(patch)
    .eq('id', imgId)
    .eq('lavoro_id', lavoro_id)          // ← R26: mancava
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)              // ← R26: mancava. Con T4 la riga può essere sparita davvero
    .select()

  if (updateError) {
    console.error('PATCH …/immagini/[imgId] — aggiornamento fallito:', updateError.message)
    return NextResponse.json({ error: 'Non è stato possibile aggiornare la foto' }, { status: 500 })
  }
  const toccate = righe?.length ?? 0
  if (toccate === 0) return NextResponse.json({ error: 'Immagine non trovata' }, { status: 404 })
  if (toccate > 1) {
    console.error(`PATCH …/immagini/[imgId] — righe toccate inattese: ${toccate}`)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
  return NextResponse.json({ immagine: righe[0] })
```

- [ ] **Passo 5 — verde, e la mutazione che uccide**

```bash
npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts && npx tsc --noEmit && npx vitest run
```
Atteso: tutte verdi, `tsc` 0, e il totale **cresciuto** rispetto a 3850 di **esattamente** le prove nuove.
**Mutazioni da provare, con l'esito incollato:** togli il `422` → **atteso rosso** · rimetti due `.eq()` →
**atteso rosso** sulla prova R26 · togli `.is('deleted_at', null)` → **atteso rosso**.

- [ ] **Passo 6 — salva, e RIFERISCI**

Nel rapporto, sezione «fuori mandato» (R-E2): **il POST non ha un freno di frequenza** e **il tipo del file
è quello dichiarato dal client** (`route.ts:70-77`, R24) — 🛑 **non toccarli**, sono già a verbale con la
loro destinazione.

---

# BLOCCO B — la cancellazione diventa vera

### Task 4 — l'emendamento di T8: il file sparisce, e resta la traccia (D61 + D63)

**File**
- 🆕 da creare: `supabase/migrations/20260730150100_lavori_immagini_eliminazioni_log.sql`
- Modifica: `src/app/api/lavori/[id]/immagini/[imgId]/route.ts` (DELETE — `:91-93`, `:148-183`)
- Modifica: `tests/unit/lavori-id-immagini-imgid-route.test.ts` (**la finta va estesa**, v. passo 1)

**Interfacce**
- **Consuma:** niente da A (indipendente; può girare in parallelo).
- **Produce:** `DELETE …/[imgId]` che **toglie il file dall'archivio e poi la riga**, e scrive una riga in
  `lavori_immagini_eliminazioni`.

🛑 **Questo task NON tocca gli otto filtri `deleted_at` né la colonna:** li usano la RLS, l'indice parziale
e quattro migrazioni di cancellazione totale del laboratorio. **Restano.** Cambia **come** si cancella, non
**chi** legge.

- [ ] **Passo 1 — estendi la finta PRIMA di tutto, o il rosso mentirà**

🔴 **Provato scrivendo il piano:** il client finto dei test espone **solo `from`**
(`tests/unit/lavori-id-immagini-imgid-route.test.ts:60-62`), quindi la prima chiamata a `svc.storage`
**romperà** il test `:210` con un errore che **non è un difetto del codice**. Aggiungi alla finta:

```ts
    const removeCalls: string[][] = []
    const storageFinto = {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          expect(bucket).toBe('documenti')
          removeCalls.push(paths)
          return { data: paths.map((p) => ({ name: p })), error: null }
        },
      }),
    }
    // …e nel client finto, accanto a `from: mockFrom`: `storage: storageFinto`
```

- [ ] **Passo 2 — le prove PRIMA (RED)**

```ts
  it('D61 — toglie il FILE prima della riga, e nell\'ordine giusto', async () => {
    const ordine: string[] = []
    // storage.remove spinge 'file', l'update/delete della riga spinge 'riga'
    await DELETE(richiestaDelete(), ctx)
    expect(ordine).toEqual(['file', 'riga'])   // ← se si invertisse, una riga cancellata
                                               //   lascerebbe un file orfano irraggiungibile
  })

  it('D61 — il percorso passato a storage.remove è ESATTAMENTE lo storage_path della riga', async () => {
    await DELETE(richiestaDelete(), ctx)
    expect(removeCalls).toEqual([['lavori/LAV-1/1719000000000.webp']])
  })

  it('se il file non si toglie, la riga NON si cancella e la risposta è 500', async () => {
    // storage.remove restituisce { error }
    const res = await DELETE(richiestaDelete(), ctx)
    expect(res.status).toBe(500)
    expect(righeCancellate).toHaveLength(0)   // ← controllo POSITIVO: fail-closed
  })

  it('D63 — scrive UNA riga di traccia, e NON contiene l\'immagine', async () => {
    await DELETE(richiestaDelete(), ctx)
    expect(tracciaInserita).toHaveLength(1)
    expect(Object.keys(tracciaInserita[0]).sort()).toEqual(
      ['eliminata_da', 'laboratorio_id', 'lavori_immagine_id', 'lavoro_id', 'storage_path'].sort(),
    )
    expect(JSON.stringify(tracciaInserita[0])).not.toMatch(/base64|data:image|blob/)
  })

  it('la finestra regge: lavoro consegnato → 409, e NIENTE viene toccato', async () => {
    const res = await DELETE(richiestaDelete(), ctxConsegnato)
    expect(res.status).toBe(409)
    expect(removeCalls).toHaveLength(0)        // ← il 409 arriva PRIMA del file
    expect(righeCancellate).toHaveLength(0)
  })
```

- [ ] **Passo 3 — la migration della traccia**

Ricalca `lab_stato_log` (`supabase/migrations/001_commercial_infra.sql:85-97`): RLS **abilitata**,
**nessuna policy pubblica** — solo il ruolo di servizio.

```sql
-- 20260730150100_lavori_immagini_eliminazioni_log.sql
-- D63 — la rete di sicurezza della cancellazione FISICA: chi ha cancellato,
-- quando, quale lavoro, quale percorso. 🛑 MAI l'immagine.
-- Base: Art. 28(3)(h) GDPR — il responsabile mette a disposizione del titolare
-- «all information necessary to demonstrate compliance». Che questo richieda una
-- riga per cancellazione è INFERENZA DICHIARATA, non citazione.
CREATE TABLE IF NOT EXISTS lavori_immagini_eliminazioni (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id      UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id           UUID NOT NULL,
  lavori_immagine_id  UUID NOT NULL,
  storage_path        TEXT NOT NULL,
  eliminata_da        UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 🛑 Nessuna FK verso lavori_immagini: la riga di destinazione NON esiste più.
CREATE INDEX IF NOT EXISTS idx_lav_img_elim_lab ON lavori_immagini_eliminazioni(laboratorio_id, created_at DESC);
ALTER TABLE lavori_immagini_eliminazioni ENABLE ROW LEVEL SECURITY;
-- Nessuna policy pubblica — solo service role (stesso regime di lab_stato_log).
```

- [ ] **Passo 4 — l'handler**

Nel `DELETE`, **dopo la riga 147** (il 409) e **prima della 153** (la mutazione):

```ts
  // 4-bis. D61 — il file PRIMA, la riga DOPO. L'ordine non è di stile:
  // se cadesse la riga prima del file, resterebbe un file orfano che nessuna
  // query può più raggiungere; nell'ordine giusto, un file già tolto con la
  // riga ancora viva è un caso VISIBILE e ritentabile.
  const { error: erroreFile } = await svc.storage.from('documenti').remove([immagine.storage_path])
  if (erroreFile) {
    console.error('DELETE …/immagini/[imgId] — rimozione del file fallita:', erroreFile.message)
    return NextResponse.json({ error: 'Non è stato possibile eliminare la foto' }, { status: 500 })
  }
```
poi la mutazione diventa una cancellazione vera (`.delete()` al posto di `.update({deleted_at})`),
**mantenendo i tre `.eq()`, il filtro e il conteggio esatto-uno**; e subito dopo il conteggio:

```ts
  // D63 — la traccia. Fail-soft DICHIARATO: la foto è già sparita, e far
  // fallire la risposta ora non la riporterebbe indietro. L'errore si registra.
  const { error: erroreTraccia } = await svc.from('lavori_immagini_eliminazioni').insert({
    laboratorio_id, lavoro_id,
    lavori_immagine_id: imgId,
    storage_path: immagine.storage_path,
    eliminata_da: context.userId ?? null,
  })
  if (erroreTraccia) console.error('DELETE …/immagini/[imgId] — traccia non scritta:', erroreTraccia.message)
```
⚠️ **Verifica il nome vero del campo utente** in `getFreshLabContext()`: il piano scrive `context.userId`
**senza averlo aperto**. Se si chiama diversamente, **è un difetto del piano: riferiscilo** (R-E2).

- [ ] **Passo 5 — togli le due frasi che ora sono false**

`:91-93` («il file nello storage **NON** si tocca — conservazione deliberata») e `:180-181` («Il blob NON si
tocca») **dicono il contrario di quello che il codice fa**. Riscrivile citando **D61**.

- [ ] **Passo 6 — verde, mutazioni, salva**

```bash
npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts && npx tsc --noEmit && npx vitest run
```
**Mutazioni:** inverti file e riga → **atteso rosso** · togli il fail-closed sull'errore del file →
**atteso rosso** · togli l'insert della traccia → **atteso rosso**.

---

# BLOCCO C — i quattro componenti

> **Forma di casa, misurata su `FotoStrip.tsx`, `Vuoto.tsx`, `Avatar.tsx`, `DialogConferma.tsx` — vale per
> T6-T9 e non si ripete:** `'use client'` a **riga 1** · commento di testa `// DS v3 §5.xx — Nome: …` ·
> **props tipizzate INLINE** nell'oggetto della firma (**mai** `interface XProps`), destrutturate sulla riga
> dopo · import da `@/design-system/v3/tokens` **solo per misure e tipografia** · **i colori sono
> `var(--ink)`/`var(--muted)`/`var(--bg-deep)` inline**, mai dai token · `style` inline, non classi (le
> classi solo come ganci per ciò che l'inline non può fare) · stili lunghi estratti in
> `const nomeStile: CSSProperties` **in fondo al file** · stato vuoto come **prima riga di corpo**
> (`if (x.length === 0) return null`).
>
> 🛑 **Il controllo pre-commit gira su questo perimetro** (`scripts/check-ds-compliance.sh:49`,
> `V3_SCOPE="src/components/ds src/design-system/v3"`, agganciato a `.husky/pre-commit:6`): **4a** vieta
> hex a sei cifre e `rgba(` · **4b** vieta `duration: <numero>` e `ease: [` · **4d** controlla le parole.
> ⚠️ **Due buchi noti — non farci affidamento:** `#fff` (tre cifre) **passa**, e i colori nominali
> (`white`, `black`, `transparent`) **non sono cercati**. Passare il controllo **non prova** conformità.
>
> ⚠️ **`raggio` NON ha il 12** usato oggi dalla striscia (`FotoStrip.tsx:23`, numero letterale). I raggi
> disponibili sono `card 24, sheet 28, tile 22, riga 18, tasto 20, pill 999`. **Chi scrive la carta album
> sceglie e lo DICHIARA**: o `raggio.riga` (18, cambia la resa rispetto a oggi) o il 12 letterale
> (fuori token, come già è). 🛑 **Non inventare un token nuovo senza proporlo** (§13.1).
>
> ⚠️ **Movimento:** esistono cinque molle (`snappy · smooth · bouncy · press · wizard`) e otto coreografie,
> e **nessuna delle otto è per un overlay a tutto schermo o per lo sfogliare**. La casa usa **`molla.smooth`**
> per gli overlay (`DialogConferma.tsx:155,166` · `Sheet.tsx:338`): **si usa quella, e si dichiara che è una
> scelta, non un token già pronto.**
> 🛑 **«Riduci movimento»: si cambia la TRANSIZIONE, mai il bersaglio** (`v3/motion.ts:14-22`) — le chiavi
> restano in `animate`/`exit` con `istantaneo`. La guardia gira a **ogni commit**
> (`.husky/pre-commit:15`).
>
> ⚠️ **Suoni e vibrazione:** `vibra('selection' | 'light' | 'medium' | 'success' | 'error')` ·
> `suona('tap' | 'fatta' | 'ua' | 'errore' | 'arrivo' | 'stacco' | 'riaggancio')`. 🔑 **Regola incisa con
> quattro precedenti: un cambio di SELEZIONE fa `vibra('selection')` e MAI `suona()`**
> (`ChipScelta.tsx:34` · `Campo.tsx:251` · `Pila.tsx:52` · `StrisciaStato.tsx:154`).
> **Non esiste** un suono dedicato alla distruzione riuscita: la conferma la porta `TastoPrimario`
> (`suona('tap')` + `vibra('medium')`). **Non inventarne uno.**

### Task 5 — la proposta delle §5.x (documento, NON codice) — 🚪 GATE

**File**
- 🆕 da creare: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md`

🛑 **Nessuna riga di React in questo task.** La spec v3 §13.1 p.3 impone che una sezione §5.x si
**proponga prima** che il componente esista. Saltarlo significa scrivere quattro componenti e poi
descriverli, cioè il contrario del processo.

- [ ] **Passo 1** — scrivi le quattro sezioni nella forma delle §5.x esistenti (anatomia · misure · stati ·
  semantica dei gesti · accessibilità · fonte di verità visiva = il mockup del 30/07), per **`CartaAlbum`**,
  **`VisoreFoto`**, **`TendinaMenu`**, **`FoglioCategoria`**.
- [ ] **Passo 2** — dichiara in ognuna: i **token usati** (e il raggio scelto, con la ragione) · la
  **molla** (`molla.smooth`, dichiarata come scelta) · **vibrazione e suono** ammessi · il
  comportamento a **«Riduci movimento»**.
- [ ] **Passo 3** — **fermati e fai rivedere.** È un gate: T6-T9 non partono senza.

### Task 6 — `CartaAlbum`

**File:** 🆕 da creare — `src/components/ds/CartaAlbum.tsx` · 🆕 da creare `tests/unit/ds-v3/componenti/CartaAlbum.test.tsx`

**Interfacce**
- **Consuma:** `raggruppaPerCategoria`, `etichettaCategoria` (T2).
- **Produce:**
  `CartaAlbum(props: { foto: Array<{id: string; url: string; categoria: string; created_at: string; nome_file: string | null}>; indiceAperto?: number; onApri: (indice: number) => void })`

- [ ] **Passo 1 — le prove PRIMA**: la carta **ha un titolo** («Foto» — è il difetto n.1 di oggi) · mostra
  la **prima foto dell'ordine** come grande · il contatore dice **«1 di N»** e **N è il numero delle foto,
  non un valore di colonna** · i blocchi portano **l'etichetta del gruppo sopra** (variante **A1**, D76) ·
  i gruppi sono **nell'ordine D71** · **elenco vuoto → `return null`** · ogni miniatura è **toccabile ≥ 44
  px** e chiama `onApri` con **l'indice giusto nell'elenco ordinato**.
  🛑 **Una prova che deve fallire se qualcuno usa `ordine`:** due foto con `ordine` invertito rispetto a
  `created_at` → l'ordine mostrato segue **`created_at`**.
- [ ] **Passo 2** — rosso, abbozzo inerte, **conta `N su M`**.
- [ ] **Passo 3** — scrivi il componente nella forma di casa. **G1: nessun import da `form/styles.ts`.**
- [ ] **Passo 4** — verde. **Mutazione:** togli il titolo → **atteso rosso**; inverti l'ordine dei gruppi →
  **atteso rosso**.
- [ ] **Passo 5** — salva.

### Task 7 — `VisoreFoto`

**File:** 🆕 da creare — `src/components/ds/VisoreFoto.tsx` · 🆕 da creare `tests/unit/ds-v3/componenti/VisoreFoto.test.tsx`

**Interfacce**
- **Produce:** `VisoreFoto(props: { aperto: boolean; foto: […]; indice: number; onIndice: (i:number)=>void; onChiudi: () => void; azioni?: React.ReactNode })`

🔑 **Le decisioni tecniche, già prese con la prova in mano — non si riaprono dentro il task:**
- **Marca dell'overlay: `'uaSheet'`.** `provato:` il **valore** della marca non cambia **nessun**
  comportamento dentro `storia-overlay.ts` (si scrive a `:88`, si rilegge a `:98`, si ri-spinge a `:116`, e
  il gate a `:131` è `if (!marcaEntry)` — sull'**esistenza**). E `type Marca` (`:67`) è un'unione **chiusa e
  non esportata**: `'uaVisore'` **non compilerebbe**. Riusare `'uaSheet'` tiene anche verde
  `scripts/guardia-navigazione-overlay.mjs:97`, che riconosce **solo** quelle due stringhe.
- **Il visore È lo strato più basso dei tre → è l'UNICO che blocca lo scorrimento del corpo.**
  `provato:` `Sheet.tsx:248-253` si difende solo dalla **propria** rientranza: un secondo blocco
  catturerebbe `overflow:'hidden'` come «valore precedente» e lo **ripristinerebbe a hidden per sempre**.
- **Portale su `document.body`** — obbligatorio (`src/app/ds-v3.css:1005-1011`).
- **z-index: nell'intervallo libero misurato 302-999**, con **visore < tendina < 1000**.

- [ ] **Passo 1 — le prove PRIMA:** si registra con `entraOverlay('uaSheet', …)` all'apertura e chiama
  `esciOverlay` allo smontaggio · **blocca e SBLOCCA** lo scorrimento del corpo (il caso che morde:
  aprire, chiudere, e `document.body.style.overflow` **torna al valore di prima**, non a `hidden`) ·
  `role="dialog"` + `aria-modal` + etichetta · **Esc chiude** · il **focus torna all'apritore** ·
  scorrere cambia `indice` e chiama `onIndice` · **a «Riduci movimento» accesa nulla resta fuori schermo**.
- [ ] **Passo 2** — rosso, abbozzo, `N su M`.
- [ ] **Passo 3** — scrivi il componente. Modello dell'aggancio alla storia, **verbatim da `Sheet.tsx:180-198`**:

```tsx
  const onChiudiRef = useRef(onChiudi)
  useEffect(() => { onChiudiRef.current = onChiudi }, [onChiudi])

  useEffect(() => {
    if (!aperto) return
    const token = entraOverlay('uaSheet', () => onChiudiRef.current())
    return () => esciOverlay(token)
  }, [aperto])
```
🛑 **La dipendenza è SOLO `aperto`** — è il motivo per cui `chiudi` rilegge un ref.
- [ ] **Passo 4** — verde. **Mutazione:** togli `esciOverlay` dalla pulizia → **atteso rosso**; togli lo
  sblocco dello scorrimento → **atteso rosso**.
- [ ] **Passo 5** — salva.

### Task 8 — `TendinaMenu` (D78)

**File:** 🆕 da creare — `src/components/ds/TendinaMenu.tsx` · 🆕 da creare `tests/unit/ds-v3/componenti/TendinaMenu.test.tsx`

🛑 **Questo componente esiste perché Francesco ha scelto M2 contro la raccomandazione, e i suoi due costi
erano dichiarati.** Qui si pagano, e vanno pagati **per intero**:
1. **La voce distruttiva sta IN FONDO** — il punto più lontano dai tre puntini e **più vicino al pollice**.
   Rossa, staccata da una linea, con margine extra (§5.34).
2. **La tendina deve RIFARE da zero ciò che `Sheet` ha già** (misurato): `role="menu"` + voci
   `role="menuitem"` · **Esc** · **focus alla prima voce** all'apertura e **ritorno all'apritore** alla
   chiusura · **portale su `document.body`** · chiusura toccando fuori · chiusura allo scorrimento.
   🛑 **NON blocca lo scorrimento del corpo** (lo fa già il visore, P16).
3. **Si registra in `storia-overlay.ts` con `'uaSheet'`**, o «indietro» chiuderebbe **il visore** invece del
   menù.

- [ ] **Passo 1 — le prove PRIMA**, con quella che morde davvero: **la voce distruttiva è l'ULTIMA**
  (`getAllByRole('menuitem')` → l'ultima ha il testo distruttivo), oltre a Esc, focus, ritorno del focus,
  chiusura toccando fuori, e **il corpo NON viene bloccato**.
- [ ] **Passo 2** — rosso, abbozzo, `N su M`. — [ ] **Passo 3** — scrivi. — [ ] **Passo 4** — verde +
  mutazione (sposta la voce distruttiva in cima → **atteso rosso**). — [ ] **Passo 5** — salva.

### Task 9 — `FoglioCategoria` (C1)

**File:** 🆕 da creare — `src/components/ds/FoglioCategoria.tsx` · 🆕 da creare `tests/unit/ds-v3/componenti/FoglioCategoria.test.tsx`

**Interfacce**
- **Produce:** `FoglioCategoria(props: { aperto: boolean; quante: number; anteprime: string[]; onScegli: (c: CategoriaFoto) => void; onChiudi: () => void })`

- [ ] **Passo 1 — le prove PRIMA:** sei pastiglie, **una per categoria**, **nell'ordine D71** · ognuna
  **≥ 44 px** · con `quante > 1` il testo dice che **la scelta vale per tutte** (D65, scatto multiplo) ·
  **chiudere senza scegliere chiama `onScegli('altro')`, NON `onChiudi` a mani vuote** (D74: la foto deve
  nascere con una categoria) · scegliere fa **`vibra('selection')` e NON `suona()`**.
  📏 **E la prova che nasce da una misura fatta sul mockup:** l'etichetta più lunga («Guida colore»)
  **non va a capo** a 390 — la pastiglia utile è **148,5 px** e il testo rientra a **15 px**.
- [ ] **Passo 2** — rosso, abbozzo, `N su M`. — [ ] **Passo 3** — scrivi (🚧 **emoji segnaposto**, con la
  nota: le icone vere sono un passo suo). — [ ] **Passo 4** — verde + mutazione (porta il testo a 15,5 px
  → **atteso rosso** sulla prova della larghezza). — [ ] **Passo 5** — salva.

---

# BLOCCO D — l'innesto sulle due superfici

### Task 10 — la carta album entra sulla scheda, e la striscia esce da TUTTI e tre i siti

**File**
- Modifica: `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx:315-316`
- Modifica: `src/app/ds-v3-catalogo/page.tsx:1165-1170`
- Modifica: `tests/unit/ds-v3/componenti/FotoStrip.test.tsx`
- Elimina (o svuota): `src/components/ds/FotoStrip.tsx`

🔴 **`FotoStrip` ha TRE chiamanti, non uno**, e il terzo è una **pagina viva**: `provato:` `grep -rn
"FotoStrip" src/ tests/` → `SchedaLavoroV3.tsx:316` · **`src/app/ds-v3-catalogo/page.tsx:1166`** (il
catalogo del design system) · `tests/unit/ds-v3/componenti/FotoStrip.test.tsx`.
🛑 **Il file del catalogo NON compariva in nessun elenco prima del censimento.** Se resta indietro, il
catalogo mostra un componente che la spec dichiara superata.

- [ ] **Passo 1 — la prova PRIMA**, in `tests/unit/ds-v3/componenti/CartaAlbum.test.tsx` (🆕 da creare) o in un test della
  scheda: montando `SchedaLavoroV3` con due foto, **compare il titolo «Foto»** e **non** la striscia nuda.
  ⚠️ `tests/unit/SchedaLavoroV3.test.tsx` passa oggi `immagini: []`: **copertura zero** su questa zona.
  **Aggiungi il caso con le foto**, o la prova non tocca niente.
- [ ] **Passo 2 — l'innesto.** In `SchedaLavoroV3.tsx`, dentro `.scheda-col-main` (aperto a `:254`, chiuso
  a `:320`), **fra** il ternario `NotaLaboratorio`/`NotaLaboratorioVuota` (`:309-313`) e
  `CardFasiV3` (`:319`), sostituisci la riga `:316` con la carta album — passando `categoria` e
  `created_at`, che dal 🅃1 esistono sul tipo.
- [ ] **Passo 3 — il catalogo.** In `src/app/ds-v3-catalogo/page.tsx:1165-1170` la sezione `§5.33` diventa
  la carta album, e il commento «nel catalogo le thumb non caricano» **resta vero** e va tenuto.
- [ ] **Passo 4 — il test della striscia.** `FotoStrip.test.tsx` asserisce **72×72, radius 12, objectFit
  cover**: se il componente sparisce, il test **va riscritto sulla carta**, non cancellato in silenzio.
- [ ] **Passo 5** — `npx tsc --noEmit && npx vitest run && npx next build`. 🛑 **`next build` serve
  davvero:** `tsc` **non** valida la firma degli handler di rotta.
- [ ] **Passo 6** — salva.

### Task 11 — `TabImmagini`: la categoria si chiede, si scrive da un punto solo, e i due difetti si chiudono

**File:** modifica `src/components/features/lavori/form/TabImmagini.tsx` · crea/estendi il suo test

**Cosa cambia, con le righe** — tutto già censito (R-P6):

| riga oggi | cosa fa | cosa diventa |
|---|---|---|
| `:7-10` | importa **motion v2.3**, **haptic v2.3**, **sounds v2.3**, `./styles` | `vibra` da `v3/haptic`, `suona` da `v3/sound`, `molla` da `v3/motion`. ✅ **`useReducedMotion` NON si tocca**: `v3/motion.ts:5` lo **ri-esporta**, non è una violazione |
| `:13-22` | copia locale di `TipoFoto` e `TIPI_FOTO` | **spariscono** → si importa da `@/lib/domain/categorie-foto` (T2) |
| `:117` | `totalFotos` **conta doppio** | conta le foto vere, una volta |
| `:131` | `formData.append('descrizione', tipo)` | `formData.append('categoria', categoria)` |
| `:198` | **indovina** `'impronta'`/`'altro'` dalla sorgente | **sparisce**: la categoria la chiede `FoglioCategoria` (T9), **una volta per gruppo** |
| `:224-244` + `:247-260` | **due** gestori quasi identici | **UNA sola funzione di scrittura** (D70) |
| `:287` + `:407-555` | rende **tutte** le locali, anche quelle già salite → **doppione** | toglie la locale quando la vera arriva |
| `:634` | legge `img.descrizione` come categoria | legge `img.categoria` |

- [ ] **Passo 1 — le prove PRIMA**, e sono quattro che mordono: dopo un caricamento riuscito la foto
  compare **una volta** e il contatore dice **uno** · la `POST` porta il campo **`categoria`** (e **non**
  `descrizione`) · **esiste UN SOLO punto** da cui parte la `PATCH` della categoria (si conta, e si pretende
  **uno**) · un PDF caricato **non** viene reso con un `<img>` ma come **tessera documento**.
- [ ] **Passo 2** — rosso, abbozzo, `N su M`. — [ ] **Passo 3** — scrivi. — [ ] **Passo 4** — verde +
  mutazione: rimetti il secondo gestore → **atteso rosso** sulla prova del punto unico.
- [ ] **Passo 5** — salva. 🛑 **NON migrare la route a v3** (fuori perimetro, spec §2): questo task cambia
  **cinque righe di import** dentro un file che riscrive comunque, non la pagina.

### Task 12 — l'eliminazione dal visore, e la foto sparisce anche dallo schermo

**File:** modifica `VisoreFoto` (aggancia menù e conferma) · `LavoroFormClient.tsx:128` ·
`SchedaLavoroV3.tsx` · test

🛑 **Dipendenza dura: T4 dev'essere atterrato.** Altrimenti l'interfaccia promette una cancellazione che il
server non fa (spec §2).

- [ ] **Passo 1 — le prove PRIMA:** menù → «Elimina foto» → **conferma** → `DELETE` chiamata **una volta** ·
  **annullare non chiama niente** (il controllo positivo che manca sempre) · a conferma riuscita la foto
  **sparisce dall'elenco a schermo** · su lavoro **consegnato** l'azione **non è offerta** (🔑 il server
  risponde 409 a `[imgId]/route.ts:142-147`: la carta **non deve offrire un gesto che fallisce solo dopo il
  tocco**) · **Esc chiude UNO strato**, non tutti e tre.
- [ ] **Passo 2 — la conferma è `DialogConferma`, non un foglio nuovo** (scostamento **S1**, dichiarato):
  è «l'UNICA card centrata ammessa dal design system, riservata alle conferme distruttive»
  (`DialogConferma.tsx:3-9`). Il testo dice che sparisce **anche dall'archivio** — 🛑 la frase del 29/07
  («il file resta conservato») è **falsa** dopo D61. ⚠️ **Mai scrivere «elimina definitivamente»**:
  `src/design-system/v3/dizionario.ts:25` lo vieta.
- [ ] **Passo 3 — la rimozione dallo stato, che oggi NON esiste.** `provato:` in tutto
  `src/components/features/lavori/` `setImmagini` compare **due volte sole** — la dichiarazione
  (`LavoroFormClient.tsx:74`) e l'append (`:129`). Nessun `onRemove`. **Va creato**, gemello di
  `handleAddImmagine`. Sulla **scheda** (componente server a monte) serve invece un aggiornamento della
  pagina: **prima si chiude il visore, poi si aggiorna** — e da dentro un overlay **mai `router.push`**,
  si passa da `useNavigaDaOverlay` (`src/components/ds/useNavigaDaOverlay.ts:36`).
- [ ] **Passo 4 — Esc mediato dalla pila.** `provato:` `Sheet.tsx:158-165` e `DialogConferma.tsx:78-85`
  ascoltano **entrambi su `window`**: oggi un solo Escape **collassa tutti gli strati**, mentre il back ne
  chiude uno (`storia-overlay.ts:110-117`). Con **tre** strati va risolto qui. **Se la soluzione tocca
  `storia-overlay.ts` o `Sheet.tsx`, è FUORI mandato: si riferisce** (R-E2) e si sceglie la via che resta
  dentro il visore.
- [ ] **Passo 5** — verde + mutazione: fai chiamare la `DELETE` anche da «Annulla» → **atteso rosso**.
- [ ] **Passo 6** — salva.

---

# BLOCCO E — la chiusura

### Task 13 — FASE 7, FASE 9 nel browser, e il GATE ESTETICO L2

- [ ] **Passo 1 — FASE 7, i tre comandi con l'output vero incollato**

```bash
npx tsc --noEmit && npx vitest run && npx next build
```
🛑 **Sono tre e nessuno sostituisce l'altro:** `tsc` **non** valida la firma degli handler di rotta, solo
`next build` la vede. Atteso: `tsc` 0 · vitest **> 3850** (il riferimento P9) · build con
`ƒ /api/lavori/[id]/immagini/[imgId]` in tabella.

- [ ] **Passo 2 — la guardia degli overlay, a MANO** — è l'unica rete del tasto «indietro» e **non è
  agganciata al commit**:

```bash
node scripts/guardia-navigazione-overlay.mjs
```
⚠️ Le serve una **build di produzione già in esecuzione su `:3020`** (🛑 **non** `npm run dev`, che è 3000),
le credenziali (`UA_EMAIL` · `UA_PASSWORD` · `LAVORO_ID`) e una **fixture che il seed standard non crea** —
ricetta SQL nell'intestazione dello script. **Uscita 2 = fixture mancante**, non difetto: se esce 2, la
prova **non è stata fatta** e va detto così.
🛑 **E va aggiunto un braccio per il visore**, o la guardia non guarda proprio la superficie nuova.
⚠️ Se il visore fosse lo strato **più basso** di un braccio, `guardia-navigazione-overlay.mjs:97` — che
riconosce **solo** `'uaSheet'` e `'uaDialog'` — darebbe **rosso falso**: con la marca `'uaSheet'` scelta in
T7 **non succede**, ed è una delle ragioni della scelta.

- [ ] **Passo 3 — FASE 9, nel browser vero:** **390 · 768 · 1280** × **chiaro e scuro**, sulle **due**
  superfici (scheda e modifica). Prove: caricare una foto e scegliere la categoria · caricarne **tre insieme**
  (una scelta per il gruppo) · **chiudere il foglio senza scegliere** → nasce «Altro» e sta **in fondo** ·
  aprire il visore e scorrere · **correggere la categoria da entrambi i posti** · eliminare con conferma e
  con annulla · **il tasto «indietro» del telefono su tutti e tre gli strati**.
  🛑 **Riporta la banca dati alla baseline: 294 · 0 · 916 · 48.** E **mai stampare righe di `pazienti`**.

- [ ] **Passo 4 — GATE ESTETICO L2 (FASE 9b), obbligatorio prima del merge**

Micro-audit della **sola** superficie dell'ondata contro
`docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` (12 sezioni × 390/768/1280 × chiaro/scuro). Ogni ❌
risolto **o deferito con il motivo scritto**. Screenshot prima/dopo in
`docs/design/screenshots/2026-07-30-album-foto/`. ⚠️ `.gitignore` ignora `*.png`: serve `git add -f`.

- [ ] **Passo 5 — BP-1**: `memory/MEMORY.md` + `docs/roadmap/ROADMAP-UFFICIALE.md`. **Non si chiude senza.**

---

## Fuori perimetro — con la destinazione scritta

| cosa | dove va |
|---|---|
| **le icone vere** delle sei categorie (le emoji sono segnaposto **dichiarato**) | passo suo, con mockup e approvazione §0B |
| **ruota · ritaglia** (editor) | ondata (c) — **D66** |
| **allegati non-foto** e la **condivisione** | settima riga di roadmap — **D67** |
| **durata dei collegamenti firmati** | stessa riga — **D75**, e §11 della spec è il vuoto dichiarato |
| **R20** public URL persistita · **R23** percorsi che collidono · **R24** MIME del client | roadmap, già a verbale |
| **R21** allargare il perimetro della guardia DS oltre `ds/` | roadmap, già a verbale |
| **migrazione a v3** della route `/lavori/[id]/modifica` (~3.500 righe) | ondata propria — spec §10 |
| **DPA** da correggere (**D62**) · **TOK-1** e **CLI-1** prima della pubblicazione (**D53**) | chiusura dell'ondata (b), **non** di questo piano |

---

## Ripasso del piano contro la spec — fatto

| sezione della spec | task che la implementa |
|---|---|
| §3 la carta album (D64·D68·D71) | **T2** (l'ordine) · **T6** (la carta) · **T10** (l'innesto) |
| §4 il visore (D64·D66·D69) + gli strati | **T7** · **T8** · **T12** (Esc e conferma) |
| §5 la categoria (D65·D70·D72·D74) | **T2** · **T9** · **T11** |
| §5.5 il testo alternativo dall'etichetta | **T6** (la carta lo produce) · **T10** |
| §6 l'eliminazione (D61·D63·D69·D55·D56) | **T4** (il motore) · **T12** (il gesto) |
| §7 il dato (D73) | **T1** · **T2** · **T3** |
| §7.4 i tre difetti ereditati | **T11** (doppione, contatore) · **T11** (il PDF) |
| §7.5 la validazione, 422 invece di 500 | **T3** |
| §7.6 la lista in tre posti | **T2** (la spia) · **T3** (la rotta valida contro la costante) |
| §8 l'emendamento a DS v3 §5.33 | ✅ **già fatto** il 30/07 (rev. 3.3) — **T5** aggiunge le §5.x nuove |
| §9 dove vivono i componenti | **T5** (proposta) · **T6-T9** |
| §10 la regola sui token | **G1**, e **T11** per i cinque import |
| §11 il vuoto dichiarato sui collegamenti | **G5**, verificato in **T13** passo 4 |
| §12 le quattro varianti approvate | **T6** (A1) · **T7** (V1) · **T8** (M2) · **T9** (C1) |
| §13 gate FASE 3 | **T1** (migration + `gen types`) · **T13** (build) |
| §14 le otto prove | distribuite: 1→T2 · 2→T2 · 3→T3 · 4→T1 · 5→T11 · 6→T11 · 7→T6 · 8→T13 |
| §16 marca dell'overlay | ✅ **CHIUSA nel piano con la prova (P14): `'uaSheet'`** |
| §16 icone vere | 🚧 fuori perimetro, destinazione scritta |

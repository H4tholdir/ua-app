# Censimento — le liste scritte più volte nel codice

**Quando:** 5 agosto 2026, sera (`provato:` `date` → `2026-08-05 19:30 CEST`).
**Perché esiste:** Francesco, dopo la chiusura della duplicazione di `type Campo`: «*esistono altri
problemi simili a questo che abbiamo risolto nella pwa?*»
**Come si rifà:** `node scripts/censimento-liste-duplicate.mjs src` — lo strumento è **sotto git**
(non in `scripts/tmp/`, che è ignorato), perché un censimento che nessuno può rieseguire diventa
un'affermazione invece di una misura.

> 🛑 **QUESTO DOCUMENTO NON AUTORIZZA NESSUNA CORREZIONE.** È la risposta a una domanda. Le correzioni
> toccano permessi e validazione fiscale: per la tabella di BP-2 è **percorso GRANDE**, cioè ondata
> propria con piano proprio. La decisione di aprirla è di Francesco.

---

## 0. La risposta in tre righe

`provato:` su **635 file** di `src/`: **14 gruppi** portano la stessa lista in più file.
Di questi, **3 sono falsi allarmi** (chiusi qui sotto con la ragione, per non riaprirli),
**6 sono copie libere vere** — dove se le copie divergono **non se ne accorge nessuno** — e
**5 non sono stati esaminati uno per uno** e restano dichiarati tali.
🔑 **Il difetto `type Campo` chiuso oggi non era un caso isolato: era un esemplare.**

## 1. Il criterio, e non è un'opinione

Un elenco scritto due volte **non è di per sé un difetto**. Diventa difetto quando **la divergenza è
silenziosa**. La prova meccanica, sull'array che gira davvero:

| forma | esito se le due copie divergono |
|---|---|
| `const VALID_STATES: LaboStatoValue[] = [...]` | ❌ **errore di compilazione** — l'annotazione lega l'array alla union |
| `const METODI_VALIDI = [...]` | 🔇 **niente**, e il buco non si vede |

⚠️ **E c'è un terzo caso, il più insidioso, trovato oggi:** una protezione che nasce **per rimbalzo**.
`type Campo` sembrava difeso, ma a protestare era `TITOLI: Record<Campo, string>` — che difende **sé
stesso**, non l'allineamento. Bastava un `Partial<Record<…>>` e un ramo irraggiungibile sarebbe passato
in silenzio. ➡️ **Quando una rete regge, si chiede PERCHÉ regge:** se la risposta non nomina la cosa che
deve difendere, non è una rete.

## 2. I falsi allarmi, chiusi con la ragione (NON riaprirli)

| caso | perché NON è un difetto |
|---|---|
| **I ruoli, e `schema.sql` che ne dichiara QUATTRO** (`schema.sql:246-247`) | Sembra il caso peggiore possibile — un permesso con un elenco incompleto — e **non lo è.** `provato:` `001_commercial_infra.sql:5-8` **allarga il CHECK a CINQUE** col commento «*Aggiungi ruolo admin_sistema a utenti*»; `schema.sql` si dichiara da sé «*Generato da 23_ua_database_schema.md*», cioè è la **fotografia di partenza mai rigenerata**. La banca dati ha cinque ruoli, il codice è coerente (`admin_sistema` in **25 file**), e `CLAUDE.md` già dice che la fonte autoritativa è il CHECK vivo. 📌 Resta vero che **`schema.sql` è una fotografia vecchia**: chi lo legge come riferimento sbaglia. Sta qui perché non venga «riscoperto» ogni volta |
| **`PageProps` (5 file) · `RouteContext` (33 file)** | Non è una regola in molte copie: ogni file descrive **i propri** parametri, e sono **diversi** (`{id}`, `{token}`, `{token, lavoro_id}`…). Boilerplate di Next.js. **Escluderli, o l'elenco diventa rumore** |
| **`VALID_ROLES: RuoloInvito[]`** (`api/admin/invite/route.ts:11`) · **`VALID_STATES: LaboStatoValue[]`** (`api/admin/labs/[id]/stato/route.ts:10`) | **Ridondanza protetta, non copia:** portano l'annotazione del tipo importato, quindi divergere è un errore di compilazione. ✅ **Sono il modello da imitare** |

## 3. Le copie libere vere

Ordine per conseguenza, non per numero di copie.

| # | lista | dove | perché conta |
|---|---|---|---|
| **1** 🔴 | `METODI_VALIDI` = contanti · bonifico · pos · assegno · altro | `api/pagamenti/route.ts:8` · `api/pagamenti/[id]/route.ts:8` · `api/clienti/[id]/credito/rimborsa/route.ts:9` — **tre copie a mano**, nessuna annotata | **Il peggiore, e per un motivo che non è il numero:** `provato:` la lista **valida davvero** (`METODI_VALIDI.includes(metodo)` → **400**, `pagamenti/route.ts:47-48`), e il tipo che dovrebbe essere la fonte — `MetodoPagamento` (`types/domain.ts:787`) — **non è importato da nessuno**: `provato:` `grep -rl MetodoPagamento src/` → **1 solo file, quello che lo definisce**. C'è un cartello che nessuno guarda e tre copie che fanno il lavoro vero |
| **2** 🔴 | stati SDI ammessi = pec_consegnata · accettata · rifiutata | `api/fatture/[id]/stato-sdi-override/route.ts:36` (array) · `components/features/fatture/OverrideStatoSheet.tsx:41` (union nuda) | **Fiscale.** Le due non si conoscono: il foglio può offrire uno stato che la rotta rifiuta, o viceversa |
| **3** 🔴 | ciclo di vita del laboratorio = trial · attivo · sospeso · scaduto · blacklist | `lib/stripe/state-machine.ts:4` (la fonte) · `api/admin/labs/[id]/stato/route.ts:10` ✅ **protetta** · `app/admin/labs/[id]/lab-actions.tsx:6` 🔴 **copia libera** | Su tre posti **due sono già fatti bene**: la terza si allinea copiando il modo, non inventandolo |
| **4** 🟡 | `DECISIONI_VALIDE` = in_attesa · fatturare · non_fatturare | `lib/contabilita/decisione-fatturazione.ts:1` · `types/domain.ts:255` | Contabile |
| **5** 🟡 | `PILE_VALIDE` = rossa · ambra · viola · blu | `(app)/dashboard/page.tsx:15` · `(app)/lavori/page.tsx:11` · `lib/lavori/urgenza.ts:10` (union `Pila`) — **tre posti** | Presentazione, ma tre copie |
| **6** 🟠 | `type Ruolo` a **quattro** valori | `lib/notifications/trigger.ts:4` | ⚠️ **NON è un difetto da correggere: è una RAGIONE che manca.** `provato:` la funzione filtra su `laboratorio_id` **e** `ruolo` (`:22-23`), e `admin_sistema` è **precisamente il ruolo senza laboratorio** (`20260517000003_utenti_laboratorio_id_nullable_for_admin.sql`). Quattro è **giusto**. ➡️ Si scrive il perché lì, come vuole la direttiva sulle allowlist («*un campo fuori dall'allowlist deve avere una RAGIONE, e la ragione va scritta lì*»). **Correggerlo sarebbe il difetto** |

## 4. 🛑 Ciò che NON è stato esaminato, dichiarato

Compaiono nell'uscita dello strumento e **non sono stati aperti uno per uno**: nessuno di questi è stato
giudicato, né innocuo né difettoso.

- `MESI_IT` (2) · `GIORNI` (2) — *a occhio* dati di presentazione, **non verificato**
- `RUOLI_PEC_SETUP` (2) · `RUOLI_AMMESSI`/`RUOLI_INVIO_PEC` (2) · `RuoloInvito`/`RUOLI_INVITABILI_DA_TITOLARE` (2) — **toccano permessi: da guardare per primi** se l'ondata si apre
- `ArcataType`/`ArcataFdi` (2) · `ORDINE`/`StanzaHome` (2) · `ORDINE_GRUPPI`/`GruppoClassePsur` (2)
- I quattro **tipi identici con lo stesso nome** trovati dal primo braccio: `ClienteRow` · `ArticoloRow` ·
  `PazienteRow` · `Lab`, ognuno in **2 file** (una pagina e il suo componente). Forma di dati, non regola:
  **impatto diverso, va valutato a parte**

## 5. Cosa si propone (e chi decide)

**Una riga di roadmap propria**, non una coda di questa sessione. Le correzioni ① ② ③ toccano
**validazione e fiscale** → percorso **GRANDE** per la tabella di BP-2 (piano, TDD, review), e la ⑥ non è
una correzione ma **una riga di commento**.
📌 **Il modello esiste già in casa** e non va inventato: `VALID_ROLES: RuoloInvito[]` — un solo posto
dichiara, gli altri annotano e importano.
🔑 **Il valore non è togliere sei doppioni: è che dopo, chi aggiunge un metodo di pagamento o uno stato
non può più farlo a metà senza che il computer glielo dica.**

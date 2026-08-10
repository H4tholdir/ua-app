# Task 9 — LA SEZIONE «COMUNICAZIONI» NELLA SCHEDA DEL DENTISTA (⚖️ D337 · D352)

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna` (già attivo — NON crearne un altro, MAI un worktree)
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md` — sezione «Task 9».
**BASE:** `cb200cee`. **Zero migration attese.**

---

## 0. Dove sta questo compito

Il dentista ora vede gli avvisi nel suo portale (Task 8). Questo task costruisce il **rovescio, lato
laboratorio**: nella scheda del cliente (`/clienti/[id]`), l'**archivio** di ciò che gli è stato
comunicato — la prova, consultabile, di «quando · come · chi · e se l'ha aperta».

⚖️ **D337: è un ARCHIVIO, NON un allarme.** Niente pastiglie rosse, niente contatori che chiamano,
niente urgenza. La sollecitazione ad agire vive già su scheda e striscia; qui si CONSULTA.

## 1. Il mandato (dal piano)

**File:** Modifica `src/app/(app)/clienti/[id]/page.tsx` — 🛑 **MAI LETTO in fase di piano: il tuo
PRIMO passo è aprirlo INTERO e scriverne la struttura nel resoconto** (righe, sezioni esistenti, come
carica i dati, che stile usa). Più: `src/lib/avvisi/queries.ts` e `src/lib/avvisi/ruoli.ts` (v. §2) ·
prove nuove.

- [ ] Per ogni comunicazione: **quando** (`comunicato_at`) · **come** (dall'app / a voce, dal vocabolario
  di `stati.ts`) · **chi** (`comunicato_da` → nome leggibile: guarda il modello di casa
  `leggiTecniciSenzaAnagrafica` citato in `queries.ts`) · **se e quando l'ha aperta**
  (`visto_dal_dentista_at` — da stamattina il portale la scrive davvero, Task 8).
- [ ] Le righe ancora `da_comunicare` si mostrano per quello che sono (in archivio la prova c'è già),
  ma **senza nessun segnale d'allarme** (D337): niente rosso, niente badge che chiama. La forma la
  scegli guardando lo stile della pagina; motivala nel resoconto.
- [ ] 🛑 ⚖️ **D336 — il valore vecchio non compare MAI.** Le voci si descrivono con
  `descriviCampiCorretti` (nomi dei campi), mai con valori.
- [ ] Legge **`archivioCliente()`** — **nessuna query nuova** sulla tabella (una lettura di supporto per
  i nomi di chi ha comunicato è ammessa se serve, col modello di casa).
- [ ] Zero migration. Zero v3 (v. §3).

## 2. 🔴 IL CANCELLO D352 — e l'interazione nuova col Task 8, nata STAMATTINA

⚖️ **D352 (ratificata):** l'archivio lo vedono **`titolare` · `tecnico` · `front_desk`** — esclusi
`admin_rete` e `admin_sistema` **PER NOME**. L'elenco coincide con quello di D342 (la chiusura
dell'avviso) **ma per una strada diversa**: là il cancello discende dal permesso di AGIRE; qui non c'è
niente da chiudere — discende da **chi è nel perimetro del titolare del trattamento**. Sola lettura.

🛑 **Per questo NON si riusa l'export di D342 in `ruoli.ts`: si aggiunge una costante NUOVA nello
stesso file** (es. `RUOLI_ARCHIVIO_CLIENTE`), col commento che cita D352 e il PERCHÉ non è un alias:
due decisioni che oggi coincidono possono divergere domani, e un alias le salderebbe in silenzio.

⚠️ **L'interazione nuova, che l'handoff di stanotte non poteva sapere:** da stamattina
`archivioCliente` ha **DUE chiamanti** con due autorità diverse —
1. il **portale** (`src/app/portale/[token]/page.tsx`, Task 8): autorità = **il token**, nessun ruolo
   utente. È già sul ramo e NON deve rompersi.
2. la **scheda cliente** (questo task): autorità = **il ruolo** (D352).

➡️ **Il cancello D352 vive in `src/lib/avvisi/` (non nella pagina: una superficie futura non deve
poterlo dimenticare), ma NON può essere un blocco nudo dentro `archivioCliente`.** Il modello di casa è
quello del Task 7 (`striscia.ts`): **la lettura/il ruolo si PROPAGA dal chiamante**, con sentinelle, e
il ripiego è **fail-closed** (ruolo assente o fuori elenco → archivio vuoto/negato, MAI «passa»).
La forma esatta (wrapper `archivioClientePerLaboratorio`, parametro discriminato, due entry point…)
**la scegli tu dopo aver letto i due chiamanti veri** — e la motivi nel resoconto.
🛑 Qualunque forma scegli: **il chiamante del portale resta com'è o cambia in modo provato** (le sue
prove del Task 8 devono restare verdi), e **il cancello si prova PER INVERSIONE e per lato**
(lezioni Task 6 e 7, sotto).

## 3. Stile della pagina

`/clienti/[id]` **NON è fra le pagine migrate a v3** → è una superficie **v2.3 legacy**: token da
`src/design-system/tokens.ts`, motion da `src/design-system/motion.ts` (MAI `duration` inline), niente
import da `design-system/v3/` né da `components/ds/`. **MAI mischiare i due sistemi nella stessa
pagina** (v3 §14). In pratica: segui lo stile che la pagina ha, che leggerai al primo passo.
Anti-pattern: niente tabella full-width su mobile (card), massimo rispetto di ciò che la pagina già fa.

## 4. Le prove (R-P4 — enumera PRIMA le forme)

- **Il cancello, per inversione e per lato** (lezione Task 6: una prova che sorveglia l'esistenza non
  sorveglia il verso; lezione Task 7: i lati si provano SEPARATI): ① ciascuno dei tre ruoli ammessi
  vede l'archivio (la spia giusta guarda **se il banco è stato interrogato**, non solo il valore di
  ritorno — per «escluso» e «vuoto» il ritorno è identico) · ② `admin_rete` NON vede, e il banco NON
  è stato interrogato · ③ `admin_sistema` NON vede, idem · ④ ruolo assente/imprevisto → fail-closed.
- **L'archivio:** ⑤ cliente con due comunicazioni chiuse (una dall'app con testo, una a voce) → quando ·
  come · chi · vista/non vista · ⑥ riga `da_comunicare` → si mostra senza allarme · ⑦ archivio vuoto →
  la sezione non urla (comportamento scelto e dichiarato) · ⑧ D336: mai un valore vecchio.
- **Il portale non si rompe:** ⑨ le prove del Task 8 restano verdi (`avvisi-portale.test.ts`), e se
  tocchi la firma di `archivioCliente` lo dichiari e provi il chiamante del portale.
- Dopo il primo rosso: abbozzo inerte e **conteggio `N su M`** nel resoconto.

## 5. Trappole note

- 🛑 Gli snippet dei piani hanno già portato **due errori di campo**: ogni campo si verifica sul TIPO
  (`database.types.ts`, `AvvisoRiga` in `queries.ts:54`) prima di usarlo.
- `page.tsx` di clienti è un server component MAI letto: **non assumere niente** della sua struttura —
  potrebbe avere tab, sezioni, o un pattern dati tutto suo. Prima leggi, poi progetta.
- Il cancello D342 in `ruoli.ts` ha già un nome: NON riusarlo per D352 (v. §2). La rotta ri-esporta
  per compatibilità: non toccare quella catena.
- `tsc` non vede `server-only`: la FASE 7 chiede anche `next build` per questo.
- FASE 9 (browser) e gate estetico L2: **accorpati al Task 10** — NON farli qui.
- 🛑 Un difetto fuori mandato si RIFERISCE (R-E2), non si corregge.

## 6. Regole di casa (vincolanti)

- Directory `/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app`, ramo già attivo.
- TDD RED→GREEN; iterando lancia i file di prova toccati; suite intera UNA volta prima del commit.
- FASE 7: `npx tsc --noEmit` · `npx vitest run` · `npx next build`, output reale.
- 🛑 `git status` PRIMA · `git add <percorsi>`, MAI `-A` · messaggi lunghi `-F <file>` fuori repo ·
  **NIENTE push**.
- Commit: `feat(avvisi): …`.

## 7. Il resoconto

Completo in `.superpowers/sdd/avviso-dentista-task-9-report.md`: la STRUTTURA di `clienti/[id]/page.tsx`
(righe citate — è il primo mandato) · la forma scelta per il cancello e il perché · evidenza TDD
(RED, `N su M`, GREEN) · file toccati · autorevisione · riserve. Poi rispondi con SOLO (max 15 righe):
**Status** · commit · una riga sui test · la forma del cancello in una riga · riserve · percorso del resoconto.

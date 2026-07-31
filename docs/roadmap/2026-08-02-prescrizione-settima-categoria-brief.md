# Brief — la prescrizione diventa la settima categoria (D91)

**Per:** la sessione nuova, a contesto pulito. **Ramo:** `ondata-b-schermate` (già aperto —
🛑 **mai un git worktree in questo progetto**: porta un secondo `package-lock.json` e l'app risponde 404 su
**tutte** le route. `git checkout -b` e basta, se mai servisse).
**Decisione che lo genera:** **D91** — `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`,
ventottesima tornata. **Parole di Francesco:** «*mi sono dimenticato la prescrizione, dobbiamo aggiungerla
alle categorie*».
**Da dove viene:** `docs/roadmap/2026-08-01-t11-referto.md` §1 — è lì che la perdita è stata vista.

> 🔑 **Questo lavoro nasce da una dimenticanza del progetto, non da un errore di esecuzione.** La
> prescrizione è il documento con cui il lavoro **nasce**, e fino a ieri finiva in «Altro» insieme a tutto
> il resto. T11-bis l'ha instradata su `'altro'` **due ore prima** di questa decisione, come ripiego
> dichiarato: quel codice **non è una scelta ponderata da rispettare**, è ciò che questo lavoro sostituisce.

---

## 1. Le quattro cose da decidere con Francesco PRIMA di scrivere codice

Nessuna è tecnica, tutte cambiano il risultato. **Non indovinarle.**

1. **Il nome a schermo.** «Prescrizione»? «Ricetta»? Il dizionario del design system (§2.3) chiede le parole
   del banco, non quelle del software.
2. **Dove sta nell'ordine.** L'ordine delle categorie è **cronologico** (D71): impronta → pre-lavoro →
   guida colore → post-prova → radiografia → altro. La prescrizione **arriva prima di tutto**, quindi il
   posto naturale è **in testa** — ma è una scelta di Francesco, e l'ordine decide anche **quale foto
   finisce grande sulla carta dell'album** (la prima del primo gruppo).
3. **L'emoji segnaposto.** Le sei attuali sono 🦷 🔧 🎨 ✨ 🩻 📄. Sono un **segnaposto dichiarato** (le
   icone vere sono un passo suo), ma quella nuova va scelta lo stesso — e 📄 è già di «Altro».
4. 🔴 **La griglia diventa dispari.** Il foglio che chiede «che foto è?» ha **sei pastiglie su due colonne**:
   con sette, l'ultima resta **spaiata**. Va deciso come: l'ultima a tutta larghezza, un buco, o un ordine
   che metta la spaiata in un punto che non stona. **È l'unica delle quattro che si vede a colpo d'occhio**,
   e va guardata su un mockup prima del codice (§0B), non dopo.

---

## 2. Il censimento — fatto il 01/08, `provato:` con `grep`

**I tre posti dove l'elenco vive davvero, e che si muovono INSIEME:**

| dove | che cos'è |
|---|---|
| `supabase/migrations/20260730150000_lavori_immagini_categoria.sql:40` | il **vincolo in banca dati**: `CHECK (categoria IN ('impronta','pre_lavoro','colore','post_prova','rx','altro'))` |
| `src/lib/domain/categorie-foto.ts:17-24` | l'**elenco unico** di dominio (valore + etichetta) e, con esso, l'ordine di D71 |
| `tests/unit/categorie-foto-spia-migration.test.ts` | 🛡️ **la spia**, ed è l'**unica rete meccanica** che impedisce ai due di divergere: su questo repo i tipi **non entrano dentro le query** (rilievo R27), quindi il compilatore non vedrebbe la differenza |

🛑 **Serve una migration nuova**, non una modifica di quella vecchia: il vincolo va sostituito
(`DROP CONSTRAINT` + `ADD CONSTRAINT`). ⚠️ **E il gate FASE 6b è obbligatorio** appena la migration esiste:
rigenerare i tipi, poi `npx tsc --noEmit`.

**Chi consuma l'elenco e va riletto (`grep -rln "CATEGORIE_FOTO\|CategoriaFoto" src/ tests/`) — tredici file:**
`src/app/api/lavori/[id]/immagini/route.ts` · `.../[imgId]/route.ts` · `src/components/ds/FoglioCategoria.tsx` ·
`src/components/features/lavori/form/TabImmagini.tsx` · `src/components/features/wizard/FrameFatto.tsx` ·
`src/lib/wizard/crea-lavoro.ts` · `src/lib/domain/categorie-foto.ts` · e i sei file di prova
(`categorie-foto.test.ts` · `categorie-foto-spia-migration.test.ts` · `FoglioCategoria.test.tsx` ·
`FrameFatto.test.tsx` · `crea-lavoro.test.ts` · `lavori-id-immagini-route.test.ts`).

🔑 **Due punti che il compilatore ti segnala da solo, ed è voluto:**
- `src/components/ds/FoglioCategoria.tsx` tiene le emoji in un **`Record<CategoriaFoto, string>`**: con una
  categoria in più **quel file non compila** finché non ha la sua. È la rete progettata apposta contro la
  copia locale che diverge in silenzio.
- `src/components/features/wizard/FrameFatto.tsx:170` e `src/lib/wizard/crea-lavoro.ts:393` sono i due punti
  che T11-bis ha instradato: **il primo torna alla prescrizione**, il secondo resta `'impronta'`.

**Le prove che contano «sei» e diventeranno rosse — è giusto che lo diventino:**
`tests/unit/ds-v3/componenti/FoglioCategoria.test.tsx` — `:145` («sono SEI…»), `:370`
(`toHaveLength(6)`, gli elementi raggiungibili col `Tab`), `:431` (`toHaveLength(6)`).
🛑 **Non aggiornarle a occhio da 6 a 7:** quella a `:145` confronta l'elenco reso con l'elenco importato, ed
è **la prova che l'ordine di D71 è rispettato**. Deve continuare a mordere.

---

## 3. Come si lavora (il minimo indispensabile — il resto è in `ua-app/CLAUDE.md`)

- **BP-0 prima di tutto:** `memory/MEMORY.md` e `memory/SESSION_ACTIVE.md`.
- **§0B per l'UI:** mockup prima del codice, e **approvazione di Francesco** sulla griglia dispari (§1 p.4).
- **TDD**, e dopo il primo rosso **abbozzo inerte + conteggio `N su M`**: in questa ondata quel conteggio ha
  trovato **due prove finte e un numero gonfiato** che nessuna verifica automatica vedeva.
- **FASE 7 per intero, con l'output vero incollato:** `npx tsc --noEmit` · `npx vitest run` ·
  `npx next build`. **Riferimento misurato il 01/08 ad albero pulito:** `vitest` **368 | 3** file e
  **4207 | 19** prove · `tsc` **0** · build ok.
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio> -- <percorsi>` col messaggio **fuori
  dal repo**. ⚠️ **Trappola pagata ieri:** `git commit -- <percorso>` committa il contenuto **del disco** per
  quel percorso — se hai fatto un `git rm --cached`, lo **annulla**.
- **BP-1 alla fine:** memoria e roadmap, sempre.

---

## 4. Che cos'altro resta aperto sul ramo (non è questo lavoro, ma vive accanto)

**Restano due task del piano dell'album:** `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md`
→ **T12** (l'eliminazione dal visore: monta visore, tendina e conferma sulla scheda) e **T13** (la chiusura:
FASE 7, collaudo nel browser, **gate estetico L2**).

🛑 **E il ramo NON può andare in produzione prima di T12:** sulla scheda ci sono **due bottoni veri che non
aprono niente** — «⤢ Apri» (che **vibra** al tocco) e la pastiglia della categoria.

🚦 **Quattro cose che T13 deve portare, e nessuna gira in `vitest`:** il caricamento di una foto **vera**
contro il server vivo · `FoglioCategoria` a **text-zoom 200%** su 390 e 768 (§5.41 la chiama «la prova di
questo componente», §13.3 la rende requisito di **rilascio**) · `scripts/guardia-navigazione-overlay.mjs`,
che nessun task da T6 in poi ha potuto lanciare (⚠️ **cieca** a `TendinaMenu`) · gli **screenshot**
390/768/1280 × chiaro/scuro, con dentro **il contrasto di «Annulla» in scuro** (`TastoSecondario` e il
pannello di `FoglioConferma` userebbero **lo stesso `var(--elv)`**).

⚠️ **Una decisione d'ondata che non si prende per un componente solo:** **nessuno** dei quattro strati nuovi
anima l'uscita (nessuno monta `AnimatePresence`), quindi tutti spariscono di taglio. Si decide **insieme**,
al gate estetico L2.

⚠️ **Da sistemare prima del merge:** `docs/roadmap/ROADMAP-UFFICIALE.md` descrive ancora l'ondata (b) come
«*da pianificare*», mentre è eseguita fino a T11-bis · e **undici** file di `.superpowers/` sono tracciati in
git contro il `.gitignore` (i due di ieri sono già usciti).

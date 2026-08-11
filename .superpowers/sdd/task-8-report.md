# Task 8 — Report: cancellazione immagini, il pre-check PRIMA della distruzione

**Quando:** 5 agosto 2026, notte (`provato:` `date` → `Wed Aug 5 01:11:37 CEST 2026`).
**Ramo:** `ondata-b-sessione-3` (repo principale, MAI worktree).
**Brief:** `.superpowers/sdd/task-8-brief.md`.

**Fix di revisione post-commit `e632db29` (stessa notte):** il coordinatore ha respinto la concern
§6.3 come FUORI mandato — il pre-check non fail-closed sul proprio errore è il mandato, non un
di più. Corretto: `if (erroreFonte)` → 500 onesto, nessun tocco a storage/riga. Mutation test sul
codice vero: 2/73 falliti (esattamente le due prove nuove). tsc 0 errori, suite intera 4820/4839
(19 skip, 0 falliti). Commit `28a7891b`.

---

## 1. Il pericolo, e il fix

`DELETE /api/lavori/[id]/immagini/[imgId]` toglieva il file dallo Storage (D61, ordine deliberato
file-poi-riga) **prima** di scoprire che la riga era la `fonte_immagine_id` di una prescrizione —
la FK `lavori_prescrizioni_fonte_img_fk` (NO ACTION) morde con **23503** solo alla `.delete()`
della riga, cioè dopo che il file era già distrutto e non ripristinabile (sonda S7).

**Fix:** un pre-check nuovo (punto 3 dell'handler, tra la finestra sullo stato e `storage.remove`)
chiede «questa immagine è `fonte_immagine_id` di qualche riga di `lavori_prescrizioni`?» **senza
filtrare su `lavoro_id`** — il rifacimento clona `fonte_immagine_id` per intero (RPC
`crea_rifacimento_atomico` → `20260804152403_ondata_b_prescrizioni_rpc.sql:465-476`), quindi la
fonte può essere la prescrizione di un ALTRO lavoro (un rifacimento di questo). Se trova una riga,
risponde **409 senza toccare nulla**, con un messaggio diverso a seconda che la riga trovata sia di
QUESTO lavoro o di un ALTRO (rifacimento) — mai lo stesso testo per due fatti diversi.

**Cintura e bretelle:** il 23503 sulla `.delete()` finale resta mappato su un 409 dedicato, che
dichiara onestamente che il file è già perso (copre la corsa: una prescrizione allegata proprio
fra il pre-check e la mutazione).

**Prova verificata che il messaggio non mente (rilievo dell'advisor, chiuso leggendo il codice, non
per inferenza):** l'unico scrittore che porta `fonte_immagine_id` da NULL a un valore è
`lavoro_prescrizione_allega_fonte`, chiamato SOLO da `POST /api/lavori/[id]/prescrizione/fonte`
(`prescrizione/fonte/route.ts:150-155`), che impone `img.lavoro_id === id` — la fonte, alla
nascita, appartiene sempre al lavoro a cui si allega. `authenticated` non ha `EXECUTE` su quella
RPC (`20260804152403:512`, REVOKE), quindi non c'è via che scavalchi la guardia dal client.
L'unico altro scrittore, `crea_rifacimento_atomico`, non assegna una fonte nuova: la **clona** per
intero da `lavori_prescrizioni` del lavoro che sta rifacendo. Per induzione, ogni riga con
`fonte_immagine_id = X` appartiene o al lavoro che possiede davvero l'immagine X, o a un lavoro
nato da un rifacimento (diretto o a catena) di quello — mai a un lavoro estraneo. Le due frasi del
409 sono quindi vere per costruzione, non per fiducia nel client.

I tre messaggi (fonte di questo lavoro · fonte di un rifacimento · file perso sul 23503) vivono in
**un'unica casa**, `src/lib/domain/immagini-eliminazione-messaggi.ts` (modello:
`prescrizione-costanti.ts`), importata dalla rotta E da entrambi i file di test — una frase
incollata a mano in tre posti sarebbe rimasta verde anche se la rotta avesse cambiato parola.

**Lato client (`SchedaLavoroV3.tsx`, `eliminaFotoCorrente`):** prima un unico messaggio generico
per ogni `!res.ok`. Ora, solo sul 409, legge il corpo `{ error }` (verificato: questa rotta usa
sempre la chiave inglese, non `errore` come alcune rotte più recenti) e mostra la frase del
server; `.catch(() => ({}))` copre sia un corpo non-JSON sia un 409 senza corpo leggibile,
ricadendo sul generico. Effetto collaterale dichiarato e testato: anche il 409 «lavoro consegnato»
(oggi irraggiungibile dall'interfaccia normale — la voce di menù è omessa quando `stato ===
'consegnato'`, ma resta un caso di corsa) ora mostra la sua vera frase invece del generico.

---

## 2. TDD (R-P4) — misurato due volte, su entrambi i lati

**Server** (`tests/unit/lavori-id-immagini-imgid-route.test.ts`): 7 test nuovi + 1 esistente
aggiornato (l'assert sull'ordine di D61 doveva includere `'precheck'`). Contro il route.ts NON
modificato — che qui *è* l'abbozzo inerte, perché il codice preesistente già non fa niente di
quello che le prove nuove pretendono, non serve fabbricarne uno apposta:

```
npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts
Misura 1: 6 falliti su 71
Misura 2 (stesso comando, zero righe toccate in mezzo): 6 falliti su 71 — identico, deterministico
```

I 6 rossi erano esattamente le prove che dipendono dal codice nuovo (ordine, forma della query,
fonte-di-questo-lavoro, fonte-di-un-altro-lavoro, catena di rifacimenti, 23503 onesto); la settima
prova nuova («non-fonte → cancellazione intatta») era verde da subito, perché misura che il
comportamento vecchio resti intatto, non il codice nuovo.

**Client** (`tests/unit/scheda-v3/scheda-album-elimina.test.tsx`): 4 test nuovi + 1 esistente
rinforzato (il test sul 500 ora fissa anche il testo esatto, per provare che il 500 resta muto
mentre solo il 409 parla). Contro `eliminaFotoCorrente` non modificata:

```
npx vitest run tests/unit/scheda-v3/scheda-album-elimina.test.tsx
Misura 1: 2 falliti su 14
Misura 2 (stesso comando, zero righe toccate in mezzo): 2 falliti su 14 — identico
```

**Mutation test sulla spia dell'ordine (item dell'advisor, non nel mandato originale ma la
verifica che il claim centrale del task effettivamente richiedeva):** spostato il pre-check DOPO
`storage.remove` nel codice VERO (backup in scratchpad, poi ripristinato via `cp`), cioè
esattamente il difetto che T8 chiude:

```
npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts
4 falliti su 71: la spia sull'ordine, le DUE prove "NULLA toccato"
(removeCalls passa da 0 a 1 in entrambe), e la prova D61 sull'ordine.
```

La spia morde davvero, non solo sulla carta. Diff post-ripristino verificato identico
all'originale (tsc + vitest tornati a 0/verde).

---

## 3. Verifica finale

```
npx tsc --noEmit                                    → 0 errori
npx eslint <5 file toccati>                          → 0 problemi
npx vitest run <3 file toccati>                      → 97/97 passati
npx vitest run (suite intera)                        → 4818 passati, 19 skipped, 0 falliti
```

Firma dell'handler **invariata** (`DELETE(req: Request, { params }: RouteContext)`): per
istruzione esplicita del brief, `next build` non è stato eseguito — non applicabile a un cambio
che non tocca la firma né aggiunge export dalla route.

---

## 4. File toccati

- `src/app/api/lavori/[id]/immagini/[imgId]/route.ts` — pre-check (nuovo punto 3) + mappatura
  23503 sulla `.delete()` (punto 5); rinumerati i commenti dei punti successivi (4→8).
- `src/lib/domain/immagini-eliminazione-messaggi.ts` — **nuovo file**, casa unica dei 3 messaggi +
  2 costanti `motivo`.
- `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` — `eliminaFotoCorrente` legge
  `{ error }` sul 409, generico altrove.
- `tests/unit/lavori-id-immagini-imgid-route.test.ts` — `mockDelete` esteso con `fonteResult` +
  finta strumentata di `lavori_prescrizioni`; describe `T8` (7 test); 1 test D61 aggiornato;
  ledger COPERTE/NON-COPERTE e verbale mutazioni estesi.
- `tests/unit/scheda-v3/scheda-album-elimina.test.tsx` — 4 test nuovi (409 questo-lavoro, 409
  rifacimento, 409 consegnato con la sua frase, 409 corpo illeggibile); 1 test 500 rinforzato.

---


> 🔄 CORREZIONE DEL CONTROLLORE (su rilievo del revisore): le righe qui sotto che dichiarano
> il pre-check «fail-open sulla query» sono STANTIE — scritte prima del commit 28a7891b,
> che ha chiuso esattamente quel buco (fail-closed, route.ts:244-250, con prova di
> mutazione 2/73). Vale il §0 del report. Anche i conteggi «97/97» e «4818» qui sotto
> sono pre-secondo-commit: i numeri misurati dal revisore sono 88/88 (due file) e
> 4820/4839 suite.

## 5. Self-review

- Ordine confermato con mutation test reale (non solo lettura del codice), v. §2.
- Verità del messaggio «di un rifacimento» confermata leggendo l'RPC di clonazione e il REVOKE
  EXECUTE, non assunta dal solo lato TypeScript (v. §1).
- Nessuna copia a mano delle frasi fra rotta e test (casa unica importata su 3 fronti).
- `getServiceClient()` non è generico su `<Database>` (nota R27 già in casa, vista in
  `prescrizione/fonte/route.ts`): `righeFonte` è tipizzato largo, coerente col resto del file
  (`existing`, `lavoro` sono già così) — nessuna incoerenza introdotta.
- Il pre-check non legge l'`error` della propria query (fail-open sulla query stessa, MAI
  fail-open sul dato: la `.delete()` a valle chiude comunque con la mappatura 23503) — dichiarato
  nel ledger NON COPERTE del file di test, non lasciato in silenzio.
- Nessun gate di ruolo aggiunto (D-3 resta valido: non ce l'ha nemmeno la consegna).

---

## 6. Rilievi FUORI mandato (R-E2 — riferiti, non corretti)

1. **BP-1 (MEMORY.md / ROADMAP-UFFICIALE.md) NON eseguito a questo livello** — per lo stesso
   motivo dichiarato nel Task 2: l'orchestratore di sessione possiede il bookkeeping a livello di
   ondata. Dichiarato qui perché non sparisca in silenzio.
2. **Nessuna verifica visiva a browser** — il brief di questo task chiedeva solo `vitest`+`tsc`;
   nessuna UI nuova è nata (solo un messaggio di testo dentro un componente `Avviso` già
   esistente), quindi nessun nuovo stato visivo da fotografare ai 3 viewport.
3. **La query del pre-check non controlla `.error`** — v. §5, già dichiarato lì e nel ledger dei
   test come «fail-open sulla query, fail-closed sul dato».

---

## 7. Commit

Ramo `ondata-b-sessione-3`, nessun worktree. Un commit, formato
`fix(api): la fonte della prescrizione non si distrugge — pre-check prima dello storage + 23503
onesto` + corpo in italiano + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (SHA
nel messaggio finale all'orchestratore).

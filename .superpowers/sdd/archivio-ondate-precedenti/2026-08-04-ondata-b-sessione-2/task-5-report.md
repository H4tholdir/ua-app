# Task 5 — Server: composizione snapshot + POST/PATCH (TDD) — REPORT

Data: 2026-08-04 (verificata con `date`) · Branch: `ondata-b-sessione-2` · Esecutore: fresco (R-E1)

## Cosa è stato fatto

1. **`src/lib/prescrizione/componi-snapshot.ts`** (nuovo) — funzione pura `componiSnapshot(denti, p?)`
   con l'interfaccia esatta del contratto del brief. Semantica implementata: chiave presente =
   trascritta (V2); colore COME DIGITATO, mai trim/uppercase (D210 — unica eccezione la stringa
   VUOTA, che non è una trascrizione; «solo spazi» si preserva perché giudicarlo vuoto sarebbe un
   trim); `elementi` = solo provenienza `'prescritto'` (default se assente, W20), in ordine
   d'ingresso; `tipo` mai presente (D213); ritorno `null` = niente di prescritto → nessuna riga;
   `contenuto {}` con numero = riga legittima (M-T3-3).
2. **POST `src/app/api/lavori/route.ts`** — accetta `body.istituzione_sanitaria` (→ `p_lavoro`,
   pattern `?? null` come ogni facoltativo del blocco) e `body.prescrizione` (validata: oggetto,
   `colore`/`numero_prescrizione` stringhe se presenti → altrimenti 422, RPC mai chiamata).
   `p_prescrizione` entra negli args RPC **solo se lo snapshot non è null**, con spread
   condizionale: **chiave assente, mai `null`** (M-T3-2: `'null'::jsonb IS NOT NULL` è vero e la
   RPC inserirebbe una riga fantasma).
3. **PATCH `src/app/api/lavori/[id]/route.ts`** — `'istituzione_sanitaria'` in `PATCHABLE_FIELDS`
   dopo `'richiedente_nome'`; nel commento-ragioni `numero_prescrizione` è USCITO dall'elenco
   «senza ragione» e ha la sua riga: «vive su lavori_prescrizioni, scrittura via RPC dedicate
   (ondata B, spec §3)» + nota anti-seconda-penna (classe `numero_cassetta`).
4. **`src/types/domain.ts`** — `istituzione_sanitaria: string | null` su `Lavoro` (dopo
   `richiedente_email`) + interfaccia `LavoroPrescrizione` che rispecchia la tabella
   (13 colonne, `fonte_tipo` union `'foglio'|'email'|'modulo'|'piattaforma'|null`,
   `contenuto: Record<string, unknown>`, `divergenze: unknown[]`).
5. **`tests/unit/helpers/pdf-fixtures.ts`** — allineata la fixture `LavoroDettaglio` al campo
   nuovo obbligatorio (`istituzione_sanitaria: null`); era l'unico rosso di `tsc`.

## TDD Evidence

### componiSnapshot (Step 5.1–5.3)
- **RED** — `npx vitest run tests/unit/componi-snapshot.test.ts` →
  `Failed to resolve import "@/lib/prescrizione/componi-snapshot"` · `Test Files 1 failed | Tests no tests`.
- **R-P4 (abbozzo inerte `return null`)** — **11 su 14** test si accendono.
  Le 3 verdi sono ESATTAMENTE i casi che attendono `null` (①⑤⑪), cioè il valore che l'abbozzo
  restituisce — coerente, nessun test morto.
- **GREEN** — `Test Files 1 passed | Tests 14 passed (14)`.

### Route POST (Step 5.4)
- **RED** (la route non modificata È l'abbozzo inerte del caso «modifica») —
  `npx vitest run tests/unit/lavori-post-prescrizione.test.ts` → **9 su 10** falliscono.
  L'unica verde (③: prescrizione `{}` senza denti → chiave omessa) è la sola parte già vera oggi.
- **GREEN** — 6 file della route POST insieme (prescrizione + atomico + colore-catalogo + ciclo +
  tipo-validazione + due-porte): `Test Files 6 passed | Tests 75 passed (75)` →
  retro-compatibilità verificata anche contro TUTTI i test preesistenti, non solo il caso nuovo.

### Route PATCH (Step 5.5)
- **RED** — `tests/unit/lavori-patch-istituzione-sanitaria.test.ts` → 2 su 2 falliscono.
- **GREEN** — 7 file PATCH insieme (nuovo + sentinelle denti/cassetta/D7 + nota-dentista +
  prezzo-guard + colore-caso): `Test Files 7 passed | Tests 29 passed (29)`.

### Verifica finale (Step 5.7)
- `npx tsc --noEmit` → **zero errori** (dopo l'allineamento della fixture PDF).
- `npx vitest run` → **`Test Files 397 passed | 3 skipped (400) · Tests 4568 passed | 19 skipped`**
  (skip preesistenti, non di questo task).

## Forme d'input enumerate (R-P4)

**componiSnapshot** (testata in `tests/unit/componi-snapshot.test.ts`, tabella in testa al file):
①–⑮ ognuna col suo caso (vuoto→null; default provenienza; prescritto/eseguito; tutti eseguiti;
colore " a3 " fedele; colore assente/""/" "; solo numero; numero ""/" 123 "; `tipo` mai;
eseguito+colore senza chiave `elementi`; ordine d'ingresso).
**Non coperte, con perché:** ⑯ fdi duplicati e ⑰ fdi non-numero — l'unico chiamante passa la
lista già validata da `validaDenti`, che li rifiuta con 422 (denti-validazione.ts:139-141);
⑱ `p` non-oggetto — firma tipata, coperta ALLA PORTA (route, 422).

**Route POST** (testata in `tests/unit/lavori-post-prescrizione.test.ts`, tabella in testa):
① body legacy con denti → chiamata identica (chiave assente); ② prescrizione completa fedele
(W20+D210, deep-equal che prova anche l'assenza di `tipo`); ③ `{}` senza denti → omessa;
④ `{}` con denti → elementi; ⑤ istituzione_sanitaria fedele; ⑥⑦⑧ prescrizione
stringa/array/null → 422; ⑨⑩ colore/numero non-stringa → 422.
**Non coperta, con perché:** ⑫ body non-JSON/null/array alla radice — guardia già esistente e già
provata in `lavori-post-atomico.test.ts` (400 prima di ogni lettura).

## File cambiati

- `src/lib/prescrizione/componi-snapshot.ts` (nuovo)
- `tests/unit/componi-snapshot.test.ts` (nuovo)
- `src/app/api/lavori/route.ts` (POST)
- `tests/unit/lavori-post-prescrizione.test.ts` (nuovo)
- `src/app/api/lavori/[id]/route.ts` (PATCH: allowlist + commento-ragioni)
- `tests/unit/lavori-patch-istituzione-sanitaria.test.ts` (nuovo)
- `src/types/domain.ts` (`Lavoro.istituzione_sanitaria` + `LavoroPrescrizione`)
- `tests/unit/helpers/pdf-fixtures.ts` (fixture allineata al tipo)

## Dove il piano sbagliava (R-E2 — riferito, non corretto di nascosto)

**① Contraddizione interna allo Step 5.4 — RISOLTA QUI, a favore della retro-compatibilità.**
La formula letterale del piano («comporre `p_prescrizione = componiSnapshot(denti,
body.prescrizione)`», senza condizioni) CONTRADDICE il test di retro-compatibilità ordinato nello
stesso step: un body legacy CON denti (il wizard di oggi manda `provenienza:'prescritto'`)
comporrebbe uno snapshot non-null → `p_prescrizione` presente → chiamata NON identica, e una riga
di `lavori_prescrizioni` per ogni lavoro creato dal giorno del deploy del server, PRIMA che il
wizard nuovo esista. Ho risolto col **gate sulla presenza della chiave `prescrizione`**: la
trascrizione nasce solo se il client la dichiara (anche `{}` basta: gli elementi prescritti
entrano — forma ④). È l'unica lettura che soddisfa insieme il test di retro-compatibilità, la
guardia M-T3-2 e la semantica W20 per il wizard futuro. Se il piano intendeva invece la
composizione INCONDIZIONATA (riga con `elementi` anche per i body legacy), va deciso
esplicitamente e il gate si toglie — la scelta è documentata nel commento della route e nel test ①.

**② Fuori mandato, trovato di passaggio:** l'aggiunta di `istituzione_sanitaria` come campo
OBBLIGATORIO su `Lavoro` ha acceso `tests/unit/helpers/pdf-fixtures.ts` (fixture `LavoroDettaglio`
incompleta). L'ho allineata (1 riga, `istituzione_sanitaria: null`) perché senza `tsc` non passa e
il task non si chiude — segnalo comunque che il piano non censiva quel file (R-P2/R-P6: il
censimento degli identificatori non aveva incluso i costruttori di `Lavoro` nei test).

**③ Nota per l'orchestratore (BP-1):** il body del POST /api/lavori ha due campi nuovi
(`prescrizione`, `istituzione_sanitaria`) — da riflettere in MEMORY.md §7 (API routes) alla
chiusura di sessione, insieme al resto dell'ondata.

## Self-review

- La guardia M-T3-2 è provata da DUE test (① e ③) con `Object.keys(args).sort()` — non un
  `not.toHaveProperty`, che passerebbe anche con la chiave a `undefined` per ragioni sbagliate.
- Il deep-equal di ② prova fedeltà (spazi+minuscole), esclusione degli `eseguito` e assenza di
  `tipo` in un colpo solo.
- `istituzione_sanitaria: null` sempre presente in `p_lavoro` segue il pattern `?? null` di ogni
  facoltativo del blocco; per la RPC (`->>`) è indistinguibile dalla chiave assente — documentato
  nel test ① e nel commento della route.
- Nessuna modifica a migration, RPC, memoria o roadmap (fuori mandato).
- I 19 test skipped della suite erano skipped anche prima del task.

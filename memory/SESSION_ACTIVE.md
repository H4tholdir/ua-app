# Sessione attiva — ondata (a) del wizard: 8 task su 13 (27/07/2026, notte)

🛑 **Branch `ondata-a-denti-colore`**, repo principale. **Niente in produzione.**
Piano: `docs/superpowers/plans/2026-07-27-wizard-ondata-a-dato-e-api.md`.

**CHIUSI (la parte «database e API» è FINITA):** T1 dominio FDI 52 codici + quadranti decidui · T2
precedenza colore · T3 `colori_dentali` (48) + unique · T4 `lavori_denti` · T5 colonne di caso + snapshot +
`DROP COLUMN` + purga tenant · T6 FASE 6b · T7 le due RPC atomiche · **T8 `PUT /api/lavori/[id]/denti`**.
Suite **3453 verdi** · tsc 0 · eslint 0 · `next build` ok · DB pulito (294 lavori, 0 denti).

**RESTANO — è la parte che tocca il codice vivo dell'app:** T9 POST atomico · T10 sentinelle ·
T11 wizard · T12 form del lavoro · T13 prove di isolamento + FASE 7 + BP-1.
🛑 **T10, T11 e T12 vanno nello STESSO deploy:** appena i 7 campi escono dall'allowlist, i due scrittori
odierni smettono di salvare **in silenzio**.

🔑 `node scripts/tmp/sql.mjs "<query>"` · `npx supabase db push --yes`.

🔴 **OTTO task, OTTO difetti veri nel piano.** I più gravi: T7 **il piano non girava sul suo stesso esempio**
(`array_agg` su zero righe dà NULL, colonne NOT NULL) · T5 funzione trigger **già esistente**, era la 35ª
copia · T4 tre colonne accettavano **qualunque stringa** su un dato della DdC · T1 i denti da latte
**sparivano** (0 su 20) · T8 quattro casi che davano **500 invece di 422** — l'opposto dello scopo del task.

🟡 **Per il T9:** `lavoro_crea_atomico` **non** verifica `cliente_id`/`paziente_id`/`tecnico_id`/`ciclo_id`
contro `p_lab` (FK semplici). La guardia vive in `FK_FIELDS_INSERT` **nella route**: il T9 deve tenerla.
🟡 **Per il T11:** il colore del wizard è **testo libero** e il catalogo è case-sensitive (`A3` sì, `a3` no):
normalizzare e confrontare col catalogo, **mai far fallire la creazione del lavoro** per un colore sbagliato.
🟡 **Noto e non chiuso:** una coppia `(scala, codice)` valida ma inesistente in catalogo torna **500** dal
`PUT /denti` (servirebbe leggere `colori_dentali` dalla route).
🟡 `npx tsc --noEmit` **non** valida la firma degli handler di rotta: serve `npx next build`.

**PROSSIMO: Task 9** — `POST /api/lavori` passa da `lavoro_crea_atomico`.

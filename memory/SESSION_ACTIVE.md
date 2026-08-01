# Sessione attiva — il contratto ai dentisti riscritto (D125-D126)

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-03-panel-dpa-referto.md`** — il referto del panel, con l'Allegato
XIII verbatim e gli otto ritrovamenti fuori mandato.

✅ **Fatto oggi:** **D123** (il documento segue il lavoro finché il lavoro è aperto) · **D124** (si parte dal
contratto ai dentisti, panel allargato) · **D125** (emendata la base normativa ratificata: il termine di
10/15 anni sta nell'**Allegato XIII punto 4 da solo** e riguarda la **dichiarazione**) · **D126** (riscritto
**tutto** il testo del contratto: quattro citazioni, conservazione, **tre affermazioni di sicurezza false**,
sub-responsabili con UÀ dichiarata, cinque clausole Art. 28, Art. 7 nuovo sui ruoli).

📌 **Misurato a mano:** `tsc` **0** · `vitest` **371 | 3** file e **4292 | 19** prove · `next build` **0** ·
`tests/unit/dpa-pdf-content.test.ts` **17 su 17**, nate rosse **15 su 17**.
🏁 **E PROVATO IN PRODUZIONE, non solo in prova:** contratto scaricato da `uachelab.com` per un cliente vero
del banco (link monouso, D103) → **18 controlli su 18 verdi**. ⚠️ **Il primo scarico dava 17 divergenze su
18: il rilascio non era ancora passato.** Ci sono voluti **~5 minuti** dal `push`. 🔑 «Pubblicato» e «in
produzione» non sono la stessa cosa, e l'unico modo di saperlo è **andare a scaricare il documento**.

🔴 **Cosa resta, in ordine:** la parte **(b)** della riga 10 — il contratto **dimostrabile** (persistenza,
versione, numero progressivo: **con migration**) · le righe **12-20** di «I documenti che escono dal
laboratorio», otto ritrovamenti del panel · **D42** (piano pronto, 9 task, R-E1) · il round 2 dell'audit.

✅ **Chiusa la domanda sul contenitore `documenti`** (Francesco ha autorizzato l'accesso al database vero):
è **privato** — `"public": false`, e l'indirizzo pubblico dà **400 «Bucket not found»**. **Nessuna
esposizione.** Il difetto resta ma cambia natura: `getPublicUrl` scrive in banca dati un indirizzo che non
funzionerà mai, dentro un campo chiamato `signed_url` che firmato non è (riga 16).

🚀 `main` = **`98a5b5a3`**, **pubblicato**; `uachelab.com` → **307 verso `/login`, che dà 200**.
📎 Verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`: **centoventisei** decisioni in
**quarantadue** tornate; la prossima è **D127**.

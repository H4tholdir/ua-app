# Revisione finale di ramo — `intervento-post-consegna` (298 commit, due ondate)

**Quando:** 11 agosto 2026, 00:45-01:20 (`provato:` `date`, comando separato; la sessione è iniziata il 10).
**Come:** tre revisori indipendenti in parallelo, ciascuno su una fetta del diff di codice
(`7427a680..HEAD`, solo `src/` + `supabase/` + config — i documenti e gli scatti non si rivedono):
**A** banca dati (314 KB) · **B** server (397 KB) · **C** superfici (337 KB). Ogni task del ramo era
già passato dal suo cancello di revisione: qui si è cercato SOLO ciò che nessuna revisione
task-scoped poteva vedere — integrazione fra task e ondate, pattern sistemici. Pacchetti:
`.superpowers/sdd/review-finale-{A-banca,B-server,C-superfici,prove}.diff`.

## Il verdetto, in una riga

**PRONTO AL MERGE CON RISERVE A CODA: zero Critical su 298 commit; un Important chiuso SUBITO
(`04974871`); due Important strutturali di banca dati → righe 58 · 59 della coda (ondate proprie,
non bloccanti per i revisori); tutti i rilievi minori possono viaggiare.**

## Area C — superfici: PRONTA AL MERGE

Le regole trasversali TENGONO, verificate una per una: niente `router.push` nudo da overlay (tutti i
punti usano `useNavigaDaOverlay`) · niente duration inline nuove · nessuna mescolanza v3/v2.3 per
route · ⚖️ D336 tiene su ogni superficie (l'archivio mostra solo i NOMI dei campi; il portale legge
lo snapshot fresco e MINIMIZZATO) · GDPR pulito (`buildAvvisoMessage` non ha un parametro paziente) ·
ogni «oggi» con fuso dichiarato (lezione Roma/UTC) · il cancello di ruolo vive DENTRO la lettura su
tutte e quattro le superfici. Tre minori (proposta stantìa fino a chiusura del foglio · corsa di
secondi sul refresh · audit con insert diretto = M-T8-2): tutti a coda di pulizia.

## Area B — server: PRONTA CON RISERVE → la riserva è CHIUSA

- 🔴 **Important, CHIUSO in sessione (`04974871`):** la rotta `riemetti` non aveva l'allowlist di
  chiavi — una chiave storpiata dal client faceva scivolare IN SILENZIO sulla riemissione senza
  correzioni (200 «rifatta» col documento ancora sbagliato). Ora: `evento_id` · `correzioni` ·
  `atteso_updated_at`, ogni chiave fuori elenco → 422 che la nomina; 3 prove nuove; il chiamante
  vivo censito manda esattamente le tre. Anche il docstring pre-D354 di `queries.ts` riscritto al
  suo posto.
- Verificati puliti: coerenza D342/D352 coi consumatori veri · `avvisi_segna_visti` chiamata giusta ·
  fail-closed coerente. Minor: la copia privata di `SCELTE` in eventi-qualita (famiglia riga 22).

## Area A — banca dati: PRONTA CON RISERVE → righe 58 · 59 della coda

- 🟠 **Riga 58:** un avviso GIÀ CHIUSO resta riscrivibile (autore, data, testo) e riapribile dai
  ruoli col GRANT delle quattro colonne: manca il vincolo di transizione one-way. La prova ex Art.
  5(2) è alterabile da dentro il tenant. Rimedio: trigger one-way o RPC di chiusura (modello
  `valutazioni_evento`).
- 🟠 **Riga 59:** `comunicato_da` è una FK semplice a `utenti(id)`: la chiusura può essere attribuita
  a un utente di UN ALTRO laboratorio. Serve la FK composita anti cross-tenant (modello
  `20260806142910`) — ma su `utenti` manca `UNIQUE(id, laboratorio_id)` (sondato sul catalogo):
  ondata propria.
- Sonde sul catalogo vivo tutte coerenti: ACL delle 10 funzioni a posto, nessuna migration riapre un
  REVOKE, ledger allineato all'ultimo file, corpo vivo della RPC = ultima migration.

## Il triage dei rilievi minori (M-T*)

**Chiusi nel ramo:** M-T6-1 (D358) · M-T9-1 (dal giro vivo, resta senza prova unitaria) · M-T9-2
(D356) · M-T9-3 (D357). **Possono viaggiare, con destinazione «ondata di pulizia»:** M-T6-4/5/6 ·
M-T7-1…6 (il 7-3 per primo: il modo del guasto è severo) · M-T4q-1/2/3 · M-T8-1/2 · M-T9t-1.
Nessuno blocca il merge per nessuno dei tre revisori.

## Che cosa resta a Francesco

Il **merge su `main`** (= pubblicazione su Vercel, D296: il permesso c'è, il giudizio è la sostanza):
il ramo è verde in CI, gate L2 passato, revisione finale passata. Le righe 58 · 59 sono aperte e
dichiarate: mergiarle così è una scelta legittima (nessun percorso pubblico le sfrutta; servono
attori interni o un difetto di rotta), rimandarle a prima del merge è l'alternativa prudente.

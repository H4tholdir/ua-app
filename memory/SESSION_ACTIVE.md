# Sessione attiva — ONDATA (a): COLLAUDO SUPERATO. Resta solo il merge (28/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-28-collaudo-ondata-a-referto.md`** — lì c'è l'esito del
collaudo e cosa resta. L'handoff precedente (`...-ondata-a-chiusura-handoff.md`) resta valido per il
contesto, ma la FASE 9 è **chiusa**.
🛑 **Branch `ondata-a-denti-colore`**, 74 commit avanti a `main`. **NIENTE IN PRODUZIONE.**
🛑 **Il merge lo autorizza Francesco.**

✅ **FASE 9 fatta: 5 prove su 5 passate**, nell'app vera, ogni esito verificato **anche** in banca
dati. Il colore arriva e si ritrova · `A3,5` mostra l'avviso e il lavoro nasce lo stesso · azzerare il
colore lo toglie da tutti i posti e non riappare · **il rifacimento eredita denti e colore** (era G1)
· due salvataggi di fila senza conflitto. **3 viewport × 2 temi; la frase nuova a 390px non si
tronca.** **DB riportato alla baseline esatta: 294 · 0 · 916 · 48.**

🔴 **UN DIFETTO NUOVO, DELL'ONDATA, trovato DOPO le cinque prove — decide Francesco se correggerlo
prima del merge (è UNA RIGA):** le tre frasi dell'ondata **non arrivano all'utente**, che legge solo
«⚠ Errore — riprova». Passano da `setSaveError` (`useLavoroForm.ts:141,162,279`) e
`LavoroFormClient.tsx:357` le mostra sotto **`saveError && !isDirty`** — ma dopo un salvataggio
fallito il form **è** ancora modificato. **Nessun dato si perde, si perde il perché.** Provato per la
frase delle zone; per le altre due è inferenza dal codice. Referto §4.0.
🛡️ **Aggiunta la prova che mancava: il controllo di conflitto SCATTA** (`atteso_updated_at` vecchio →
**409**, e nulla scritto). La prova 5 mostrava solo che **non** scatta a sproposito.

⚠️ **Due rilievi PREESISTENTI, riferiti e non toccati** (diff vuoto sui file coinvolti): idratazione
disallineata su `LinguettaCassette`/`StanzePager`; a **1280×800** due campi colore coperti dalla
fascia in fondo finché non si scorre → **ondata (b)**.
🔴 **Confermati dal vivo tre difetti già censiti del rifacimento:** `incidenti_mdr` resta vuota ·
route e funzione non concordano sugli stati · l'originale non viene annullato.

🛑 **LE MIGRATION SONO GIÀ SUL DATABASE VIVO**, `DROP COLUMN` compreso: un `revert` riporta indietro
il codice, non lo schema.
🔑 Collaudo entrato con l'utente **sintetico** `e2e-titolare@ua-test.local` (credenziale versionata
nel repo, non di una persona) — **dichiarato**.

**RESTA: merge → push → CI verde → verificare `uachelab.com` → BP-1 finale** (voce 58/59 di
`MEMORY.md` da «sul ramo» a «in produzione», voce 1 della ROADMAP chiusa).

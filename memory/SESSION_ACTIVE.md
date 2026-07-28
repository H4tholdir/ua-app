# Sessione attiva — ONDATA (b): SPEC RATIFICATA + LE QUATTRO ANTEPRIME SCRITTE, ZERO codice (28/07/2026, sera)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-28-ondata-b-piano-handoff.md`** (aggiornato due volte oggi).
Spec ✅ **RATIFICATA** · verbale a **tre tornate** (D1-D8, D9-D16, **D17-D20**).

**La ratifica (D17-D20):** briciole **toccabili**, il ritorno conserva, avviso **solo se qualcosa si perde** ·
**via d'uscita esplicita con conferma** che azzera il salvataggio locale, **più la correzione della freccia
indietro** (`WizardNuovoLavoro.tsx:219-222` fa `router.push('/dashboard')`, contro la direttiva del 22/07) ·
**rete di ripresa 24h invariata** (non è una bozza nel gestionale: `localStorage`, `persistenza.ts:26-79`) ·
l'aiuto dice «puoi cambiarlo». **Data dell'ultimo lavoro: SI TIENE** — se costa si ottimizza, non si degrada.

**Le quattro anteprime (🟡 DA APPROVARE, niente React prima):** `2026-07-28-wizard-testata-uscita.html`
(T1/T2/T3 · O1/O2/O3/**O4** · le due conferme) · `…-passo-foto-e-cassetta.html` (F1/F2/F3 · K1/K2) ·
`…-avviso-codice-gia-in-uso.html` (V1/V2 · due inneschi). **44 screenshot** `ob-*.png`, 390/768/1280 ×
chiaro/scuro.

🔴 **Due difetti trovati MISURANDO, non leggendo:** ① `text-overflow: ellipsis` **non funziona dentro un
flex** — le briciole si tagliavano a metà lettera (vale identico in React: pastiglia = blocco, non flex);
② a 390 px con l'uscita in testata restano **230 px**: due briciole intere ci stanno (208), **tre no** (302) —
da qui **O4**, la testata su due righe, l'unica che non taglia niente.
🆕 **R11 fuori mandato:** il colore delle **28 cassette** è scritto in due modi (8 esadecimale, 20 a parole) →
una griglia ingenua ne colora 8 su 28.

**Prossimo:** approvazione delle varianti → piano (R-P1/R-P2/R-P6) → ramo (🛑 **mai worktree**).
🔑 Baseline DB invariata: **294 lavori · 0 denti · 916 pazienti · 48 colori** (solo letture).

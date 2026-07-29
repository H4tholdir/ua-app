# Sessione attiva — CONSEGNA ZERO in esecuzione sul ramo `consegna-zero-pazienti` (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-consegna-zero-piano.md`.**
Sfondo: `docs/roadmap/2026-07-30-ondata-b-consegna-zero-handoff.md` + piano v2 §0.

**Ordine: Z3 → Z2 → Z1**, un esecutore fresco per task (**D35**), revisione fra l'uno e l'altro, e nel
brief di ognuno l'istruzione di **cercare dove il piano si sente sicuro**.

✅ **Due sonde eseguite (sola lettura, baseline intatta 294 · 0 · 916 · 48):**
- **Z-P1:** su `pazienti` **nessun indice unico** sul codice esiste oggi (4 indici; l'unico UNIQUE è la
  chiave primaria su `id`) → 🔑 **Z1 nasce INERTE**: nel rapporto si scrive «consegnato e inerte», MAI
  «verificato in produzione».
- **Z-P2:** 0 codici con spazi · 0 minuscoli · 0 stringhe vuote (i 911 «fuori formato» sono
  `PAZ/2026/nnnn`, che il generatore ignora giustamente) → **nessuna ripulitura una tantum**.

🆕 **Due buchi del piano v2, trovati leggendo e messi a verbale:** `PazienteEditSheet.tsx` è un **secondo
chiamante** del PATCH e scrive il codice a mano (il piano non lo nominava) · il **mockup ratificato NON
copre lo schermo di Z1** (vuole nome, ultimo lavoro e primo codice libero: tutti e tre arrivano da T7/T15).

✅ **D35** (esecutori freschi) e **D36** (i due testi dell'avviso; «È lei: usa la sua scheda» **rimandata**
a T7+T15) ratificate — ottava tornata. Conteggio aggiornato: **36 decisioni in otto tornate**.

⚠️ **FASE 6b NON si applica**: nessuna migration in questa consegna (l'indice unico è **T5**, dentro il
ramo dell'ondata, che si apre solo **dopo** che questa consegna è in produzione).

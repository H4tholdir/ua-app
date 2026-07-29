# Sessione attiva — D38 e D39 ratificate, il ramo dell'ondata (b) si apre (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-ondata-b-apertura-handoff.md`.**
Poi il piano: **`docs/roadmap/2026-07-29-ondata-b-piano-v2.md`**, e si legge **§0 per prima**.

✅ **Le due decisioni di prodotto sono CHIUSE** (verbale, **nona tornata**, conteggio a **trentanove**):
- **D38** — la cassetta del wizard nasce **alla fine, insieme al lavoro**. `POST /api/cassette` **non** si
  chiama nel percorso; la forma dell'atomicità si decide **in T18**, ora sbloccato. D30 resta intatta.
- **D39** — briciola troppo lunga → **nome corto dedicato**; la scia non eredita `labelTipo()`.
  📏 Le etichette oltre 17 caratteri sono **NOVE**, non «~15»; `Duplicato protesi` **non** è fra quelle.
  La misura in **pixel** si fa dentro **T11**, e i nomi brevi si scelgono dopo la misura.

🔴 **Resta il bloccante B2-vs-T6** — è **architetturale, va a panel**, e **non ferma T1-T4**.
Le altre code pesano ognuna su un task solo: **P2**→T5 (stesso giorno) · **mockup**→T19/T20 · **B7**→T13.

⚠️ **Date:** i documenti «30 luglio» stanno su commit **del 29**. Dichiarato nel verbale, **niente rinomine**.

**Database toccato SOLO in lettura. Baseline: 294 · 0 · 916 · 48.**

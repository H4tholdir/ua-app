# Sessione attiva — 09/08/2026

🚪 **PUNTO DI RIPRESA: portare a Francesco i DODICI testi a 4,01.** Sezione «D329 — applicata» in
fondo a `docs/design/screenshots/2026-08-09-devo-intervenire/GATE-L2.md`.

🎨 **⚖️ D326 + D329 APPLICATE.** Tre token, tutti con la stessa forma (chiaro/scuro in `ds-v3.css`,
perché uno stile inline batte sempre una regola CSS): `--filo-superficie` (`:37`/`:96`),
`--fondo-superficie` (`:38`/`:97`), `--didascalia-superficie` (`:39`/`:98`). Consumati da cinque
superfici e sei scritte in `DevoIntervenire.tsx`.

✅ **Il ❌3 è chiuso**, rimisurato dal vivo: **4,17 → 12,11**. Riga #DDD6C9, separazione **1,43:1**.
🌗 **In scuro non è cambiato un pixel** rispetto a D326 (b).

🔴 **MA il difetto si è spostato e cresciuto: i testi sotto soglia in chiaro passano da 4 a 13**
(`--muted` 4,66 → **4,01**: sei etichette di riga, due paragrafi, **due collegamenti**, due righe del
selettore) — **più un tredicesimo che non passava già e ora passa peggio**, la didascalia «COLORE» (`--faint` 4,17 → **3,59**), che vive in `src/components/ds/Campo.tsx:28`, componente **condiviso**. **Riferito, non aggiustato** (R-E2). Su questo asse non si vince: ogni scurimento utile
porta `--muted` sotto 4,5. ⚠️ E il nastro non dice più «sei qui» con l'intensità
(`d329-rilievo-nastro-prima-sopra-dopo-sotto--390-light.png`).

📌 `verify:full` → **`VERIFY_EXIT=0`** · **5685 | 68 su 456** · `tsc` 0 · build ok. Banco invariato.

🌿 Ramo `intervento-post-consegna`, `main` intatto a `7427a680`.

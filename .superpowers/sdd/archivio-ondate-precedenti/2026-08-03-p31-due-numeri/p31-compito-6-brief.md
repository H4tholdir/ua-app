# Compito 6 — I disegni, prima del React (§0B)

> **Questo è il tuo mandato completo.** I valori esatti (nomi, righe, codice) si usano **alla lettera**: sono stati verificati sul codice vero.

## Vincoli globali del progetto (valgono per ogni passo)

- **Ruoli: CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. Mai `admin` nudo.
- **RLS:** `public.current_lab_id()`, **mai** `auth.current_lab_id()`.
- **Motion:** solo da token (`src/design-system/v3/motion.ts` per v3). Mai `duration` in linea.
- **Componenti:** superficie v3 → solo da `src/components/ds/`. **Mai** mischiare v3 e v2.3 nella stessa pagina.
- **Testo:** DS v3 §2.3 — niente gergo. «cellulare», «fisso», mai «numero di telefono mobile».
- **PATCH:** sempre **allowlist esplicita**, mai blocklist.
- **Commit:** `feat(ambito): …` / `fix(ambito): …`. Mai `--no-verify` senza motivo scritto nel messaggio.
- **Dopo ogni migration:** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → `npx tsc --noEmit` (**FASE 6b**).
- **FASE 7 a fine ondata:** `npx tsc --noEmit` · `npx vitest run` · `npx next build`. Tutti e tre.

---


🛑 **Nessuna riga di React sulle schermate prima dell'approvazione di Francesco.**

**File:**
- Crea: `docs/design/mockups/2026-08-03-p31-due-numeri.html`
- Crea: `docs/design/mockups/screenshots/2026-08-03-p31/` (12 scatti)

- [ ] **Passo 1 — Il disegno, con dati veri simulati**

Due fogli, uno accanto all'altro:
- **il wizard «nuovo dentista»** con **cinque** campi (Nome · Cognome · Telefono dello studio ·
  Cellulare WhatsApp **con l'aiuto sotto** · Studio);
- **il foglio della consegna** che chiede il cellulare (compito 8), un campo solo.

🛑 **Copia le misure VERE dai componenti**, non a occhio: `CampoTesto` per il campo, `stileLabel` per
l'etichetta, `TastoPrimario` per il tasto. 🔑 **Un disegno che non copia le misure vere mente in due
direzioni** — inventa difetti che non ci sono e ne nasconde di veri (lezione ② della notte).

- [ ] **Passo 2 — Gli scatti: 3 formati × 2 temi × 2 fogli**

390 · 768 · 1280 px, chiaro **e** scuro. **12 scatti**, in
`docs/design/mockups/screenshots/2026-08-03-p31/`.

- [ ] **Passo 3 — Misura i contrasti, non dichiararli**

Ogni testo del disegno, col suo rapporto. ⚠️ **Attenzione all'aiuto in tema scuro:** `--muted` su
`--elv` deve stare **sopra 4,5**. Se una misura sorprende, **smontala prima di crederle** — il
componente vero potrebbe avere una dimensione diversa dal disegno (è successo tre volte in una notte).

- [ ] **Passo 4 — Porta gli scatti a Francesco e FERMATI**

Da approvare: il testo dell'aiuto · l'ordine dei cinque campi · che entrambi i numeri abbiano
**lo stesso peso** (D184: niente campo avanzato, niente sezione richiudibile, niente carattere più
piccolo).

- [ ] **Passo 5 — Scrivi la decisione**

`docs/design/decisions/` — variante scelta, testo approvato, scostamenti.

---

# Compito 9 — I cancelli, prima dell'unione

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


- [ ] **Passo 1 — FASE 7, tutti e tre**

```bash
npx tsc --noEmit && npx vitest run && npx next build
```

Incolla i tre esiti reali. ⚠️ `tsc` **non** valida le firme degli handler di rotta: solo `next build`
le vede.

- [ ] **Passo 2 — Le guardie**

```bash
node scripts/guardia-coerenza-documenti.mjs && node scripts/guardia-reduced-motion.mjs && bash scripts/check-csrf.sh && bash scripts/check-ds-compliance.sh && node scripts/guardia-progetti-playwright.mjs
```

🔑 **Guarda il NUMERO dei documenti vivi, non solo il colore** (P32: la guardia può uscire verde
avendo controllato niente).

- [ ] **Passo 3 — FASE 9: le schermate sui tre formati**

390 · 768 · 1280 px, chiaro e scuro: il wizard a 5 campi, il pannello di modifica, il foglio della
consegna. Bersagli tappabili **≥ 44 px**, misurati.

- [ ] **Passo 4 — FASE 9b: gate estetico L2**

`docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`, 12 sezioni × 3 formati × 2 temi, sulla **sola**
superficie di questa ondata. Ogni ❌ risolto o **deferito con motivo**. Scatti prima/dopo in
`docs/design/screenshots/2026-08-03-p31/`.

- [ ] **Passo 5 — Collaudo dal vivo (D103)**

Link monouso, e sul lavoro di prova: **il cliente senza cellulare** → il tasto chiede il numero → si
salva → l'anagrafica lo mostra. ⚠️ **Prima di consegnare per prova:** lo stato dev'essere
`pronto`/`in_ritardo` **e** non deve esistere una DdC con stato ≠ `annullata`, o il guard di idempotenza
restituisce la vecchia senza generare nulla. Finestra per annullare: **10 minuti**.

- [ ] **Passo 6 — Il vuoto dichiarato: provalo su un telefono vero**

🛑 **Spec §9.** Che cosa vede chi preme il tasto con un numero senza prefisso **non è mai stato
verificato** — la validazione avviene dentro WhatsApp, non sul server. **Con un telefono in mano si
chiude.** Se resta aperto, **si scrive che resta aperto**: non si dichiara provato ciò che non lo è.

- [ ] **Passo 7 — BP-1**

`memory/MEMORY.md` · `docs/roadmap/ROADMAP-UFFICIALE.md` (P31 → fatta) · `memory/SESSION_ACTIVE.md`.

---

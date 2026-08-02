# Sessione attiva — P17: il codice è scritto e verde, ma nessuno ha ancora GUARDATO la pagina

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-02-sera-p17-codice-completo-handoff.md`** — leggilo per intero.
📅 **Secondo handoff del 2 agosto**, dopo `2026-08-02-p7-in-produzione-e-la-deriva-delle-date-handoff.md`.
⚠️ Si chiama «sera» perché ordinato per nome `p17` finirebbe **prima** di `p7` (`1` < `7`).

🛑 **NON siamo su `main`.** Ramo **`p17-scarico-che-fallisce`** = **`299043ed`**, albero pulito,
**15 salvataggi da pubblicare**. ✅ **Niente di P17 è in produzione**, ed è voluto (**D166**).

🔴 **La §0 in una riga: P17 NON È FINITA — il gate estetico (FASE 9b) e il collaudo dal vivo NON sono stati
fatti.** `provato:` nessuna cartella scatti per P17. 🛑 **Il ramo non si unisce senza**: su questa stessa
superficie quel cancello è già stato saltato una volta. E **quattro rilievi** sono stati rimandati proprio a
quel gate (bordo `--t3` ×3 · altezza 34px · fondo scuro del «guasto» · «Ricarico…» in `role="alert"`): **se il
gate non li raccoglie uno per uno, spariscono.**

🔨 **Fatto: P17 scritta per intero** — codice d'errore su unione chiusa · `BloccoAvviso` riusabile (non sa di
DPA) · `ScaricaDpaButton` che **conserva il nome del file** · la pagina legge ruolo e dati del laboratorio, e
la riga «ultima emissione» dice **tre** cose invece di due. **5 esecutori freschi (R-E1), 17 difetti del piano
trovati, nessuno arrivato al codice.**

✍️ **Undici decisioni, D156-D166.** 🛑 **D156: nessuno usa questa PWA finché non si distribuisce** → la frase
falsa di `DpaTemplate.tsx:210` è **FASE 2** (P19-d), non più FASE 1. **«In produzione» ≠ «qualcuno lo usa».**
🆕 **Due voci nuove: P29** (una parola, due colori: `amber` nei token ≠ `--amber` nel CSS) · **P30** (la scheda
del dentista **non ha una pagina di modifica** — un tasto approvato sarebbe stato morto, **D165**).

📌 `tsc` **0** · `vitest` **4439 | 19** (379 file) · `next build` **0** · due guardie verdi — misurati in
chiusura. 📎 **166** decisioni in **56** tornate; la prossima è **D167**.

⏭️ **PRIMA COSA: il Task 5 del piano** `docs/superpowers/plans/2026-08-02-p17-scarico-dpa.md` — collaudo dal
vivo → FASE 9b → BP-1 → merge **solo se Francesco autorizza**.

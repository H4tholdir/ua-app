# Sessione attiva — 🌙 la notte autonoma (D168) è FINITA

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-03-notte-autonoma-referto.md`** — per intero, e la **§0 per prima**.

🛑 **`main` NON è stato toccato:** resta a **`89541135`**. Tutto vive su **NOVE salvataggi** in una catena di
rami, **nessuno pubblicato** (**D169**). ➡️ Unire **`p30-secondo-motore-e-bersagli`** (l'ultimo) li porta
dentro tutti nell'ordine giusto.

🔴 **LA COSA DA NON PERDERE — appena P23 entra in `main`, PRIMA di tutto il resto:**
`bash scripts/installa-salvataggio-programmato.sh`
Senza, il salvataggio notturno continua a fermarsi a 1000 file **mentre il progetto dice che è riparato**.

✅ **Fatte:** P15 · P9 · P23 · P18 · P13 · P11, tutte con FASE 7 intera.
🟡 **P30 alla soglia della firma:** 3 varianti · 58 scatti · 442 contrasti misurati · bersagli verificati sui
tre motori · **ZERO righe di React**.
🔴 **La revisione (FASE 8) ha trovato DUE difetti dentro P23**, a lavoro già verde: si perdevano **600 file
in silenzio** con un archivio che ne restituisce meno del massimo.

📌 `tsc` **0** · `vitest` **4490 passate | 19 saltate** (384 file) · `next build` **0**.
❓ **Cinque domande** per Francesco: `scripts/tmp/NOTTE-D168-DOMANDE.md` (la principale è **D-Q4**, quale variante).
📎 **176** decisioni in **65** tornate; la prossima è **D177**. ⚠️ D170-D176 sono **mie**, non di Francesco.

# Sessione attiva — UÀ

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-08-05-caricamento-diretto-storage.md`, da T7**
— che però **è una scelta di Francesco**, non un compito meccanico (v. in fondo).

**Il caricamento diretto è FATTO e IN USO: T1-T6 su T7.** I file non passano più dalla funzione:
il muro dei ~4,2MB non lo incontrano nemmeno, il tetto è quello del magazzino (50MB).

- **D238** — i due difetti vivi chiusi: via il **WebP → JPEG** e si **controlla il tipo ricevuto**
  (su Safari/iPhone la conversione non avveniva e tornava un PNG in silenzio); **controllo di peso**
  in `TabImmagini`, **dopo** la compressione.
- **D239** — il §4 del piano dava per aperte D236 e D237, già decise: allineato.
- **L'errore si dice con l'Avviso §5.18**, non con un riquadro inventato (Francesco: «*stile AI
  slop, usiamo le regole del nostro design system*»).
- **T1** — percorso `<laboratorio_id>/lavori/<lavoro_id>/<uuid>.<ext>`, 5 file spostati e verificati.
- **T2** — la policy **nega** invece di esplodere; erano **OTTO**, non quattro.
- **T3** — le due rotte, con **C1** (nove forme di percorso rifiutate) e **C2** (peso e tipo letti
  dal magazzino).
- **T4+T5** — i client passano al corridoio nuovo, e i tetti si sdoppiano per corridoio.
- **T6** — il mietitore degli orfani: rotta interna + Vercel Cron (4:20 di notte).

🔎 **Il revisore ha trovato TRE cose, tutte fondate, tutte chiuse:**
① i client erano **QUATTRO** (`crea-lavoro.ts`), non tre: sarebbe rimasto solo sul corridoio vecchio
e T7 l'avrebbe rotto in silenzio · ② **HEIC era diventato una regressione mia**: il bucket non lo
accetta (misurato) e col corridoio diretto il rifiuto costava un viaggio da 50MB su rete mobile,
proprio sulla prescrizione che non si comprime — tolto dall'elenco, più una **guardia** che
confronta le due liste in entrambe le direzioni · ③ T6 non era rimandabile al dopo-merge (la
promessa del DPA ai clienti).

⚠️ **UNA COSA SERVE DA FRANCESCO PRIMA DELLA PUBBLICAZIONE:** la variabile **`CRON_SECRET`** su
Vercel. Senza, il mietitore risponde 503 e il cron fallisce — di proposito: una porta senza
serratura non si lascia socchiusa.

📌 **Misurato** (`npm run verify:full`): tsc 0 · eslint 0 · vitest **4976 passate | 19 saltate**
(416 file) · build ok · sei guardie verdi. Ramo `fix-limite-caricamento`, **20 commit non
pubblicati**.
⚠️ **La prova che manca:** il comportamento su un **iPhone vero** (formato HEIC).

➡️ **T7 — togliere la vecchia rotta — È UNA SCELTA:** i quattro client sono passati e
`uploadToStorage` ha un solo chiamante (quella rotta), quindi tecnicamente si può togliere subito.
🛑 Ma questa è una **PWA**: chi ha la pagina aperta durante la pubblicazione ha ancora il codice
vecchio in mano, e un caricamento senza ricaricare la pagina troverebbe un 404. Le due strade:
toglierla **ora** (semplice, rischio piccolo e circoscritto al momento del rilascio) o **al
rilascio successivo** (la rotta resta viva e inutilizzata per qualche giorno).

📎 **239 decisioni in 89 tornate; la prossima è D240.**

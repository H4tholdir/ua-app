# Decisioni ratificate — Mini-triage design + Parete delle Cassette
**Data:** 20 luglio 2026 (4 giri di approvazione in un'unica sessione) · **Ratifica:** Francesco
**Mockup:** `docs/design/mockups/2026-07-20-*.html` + screenshot 390/768/1280 × light/dark
**Advisor:** panel ux-designer + solution-architect (2 tornate: mini-triage + eliminazione Le pile) — verdetti integrati

## Mini-triage (tutte definitive)

| Punto | Decisione |
|---|---|
| **A13 ponte odontogramma** | Variante A: denti come **sub-valore della riga «Lavoro»** in CardInfo (chip FDI + ›, resta nelle 5 righe §5.10; molti denti → max 4 chip + «+N»; zero denti → nessun sub-valore). Tap riga (hit-area ≥44, label esplicita) → `/lavori/[id]/modifica?tab=clinica`. Odontogramma NON ridisegnato ora (ondata bridge dedicata, confermata a Francesco). |
| **A14 cassetta in card** | Variante A **«co-identità»**: targa fisica «CASSETTA C12» in riga 1, gemella del blocco lavoro (21/800 su --bg-deep + inset --line). Assente → blocco assente. Estendere catena `getPileHome`→`LavoroPila`→`CardLavoro`. Troncamento ~6 char + ellissi; SR legge «Cassetta C12». |
| **Conferma-arrivo** | ENTRA nell'ondata. Variante A: sheet «In che cassetta lo metti?» con **chips cassette recenti/libere + campo** per nuova; via di fuga «Conferma senza cassetta». |
| **Ricerca per-pila** | In ondata: RigaCerca di PilaAperta matcha anche `numero_cassetta` (targa match accesa in blu). |
| **Ricerca globale «Cerca»** | Rotta ratificata: fra TUTTI i lavori anche consegnati/archivio («era in C12» → richiede storico cassetta↔lavoro), match numero/cassetta/dentista/paziente/tipo, gruppi «Adesso in laboratorio»/«Consegnati». Casa: `/lavori` liberato. **Progettazione fine in sessione design dedicata** post-implementazione mini-triage. |
| **O1h back pila** | CHIUSO a costo zero: con «Le pile» eliminata la provenienza è unica (home) → l'attuale `push('/dashboard')` è già corretto. Nessun contatore. |
| **«Le pile» (/lavori nudo)** | **ELIMINATA**: `if (!pila) redirect('/dashboard')` + delete `LePile.tsx`+test; ripuntare i 4 chiamanti legacy (BottomNavPill tab Lavori → rimuovere/ripuntare, SchedaNavRail:28, SchedaLavoroV3:239, fatture:248 → /dashboard). NON togliere il match `'/lavori'` da `route-migrate-v3.ts:24`. |
| **O1i ×3** | 1A: «Esci» LinkQuieto in fondo a Tutto il resto, identità come riga non-tappabile sopra, DialogConferma pre-logout. 2A: riga identità (Avatar Ø32 + nome + lab) + «Esci» inline nel footer NavDesk. 3A: segnale trial in StrisciaStato — ambra + CTA «Attiva ›» sempre, rosso ≤3 giorni; precedenza: allarmi operativi > trial > sereni; scaduto/sospeso = redirect esistenti (B15 rispettata). |
| **Cedolini batch** | 2A: `/tecnici` migra INTERA a v3 come **«Persone»** — card «I cedolini · Luglio 2026 · Scarica (CSV)» in testa (RBAC titolare/rete, TastoSecondario H58); righe con Avatar §5.14, «Tecnico» (dizionario), PRRC ✓; scheda persona = **Sheet v3** (NESSUNA route nuova); UI invito rifatta, `/api/tecnici/invite` NON si tocca; mese vuoto → avviso. |
| **Export CSV lavori** | Riga «I tuoi dati — Scarica tutti i lavori (CSV)» in «Il mio laboratorio» → nasce con **ondata F1** (advisor). Interim: API via URL. MAI `getFullYear()` client. |
| **Deferral** | A10 e A11 confermati → ondate delle rispettive superfici. |
| **Calendario ondate v3** | Ratificato e inciso in ROADMAP (A→G + trasversale bridge + milestone ritiro chrome legacy). |

## La Parete delle Cassette (spec-input ratificato, 4 giri)

- **Direzione artistica: A materica** (fedeltà TOTALE all'estetica di `parete-cassette-v2.html` — il mock collocazione era schematico, NON è il target visivo).
- **Griglia = specchio della parete fisica** (drag & drop per replicare il muro). **1 lavoro per cassetta.**
- **Colori**: 6 standard portalavori + **selettore libero** per cassetta. **Nomi ibridi**: precompilato auto (C1..Cn) + rinomina/nome libero.
- **Miniature per tipo di lavoro** nelle occupate (famiglia approvata: corona · provvisorio resina tratteggiato · corona su impianto · ponte · protesi totale · scheletrato; materiali-colore: ceramica avorio, gengiva rosa, metallo grigio; si estende a tutto il catalogo tipi in spec).
- **Stati**: occupata (miniatura + targa piena + n.+dentista) / libera (cavità vuota + targa a contorno).
- **Tap occupata → scheda lavoro.** **Liberazione automatica alla consegna** con racconto L5 («UÀ ha liberato C12»); storico conservato.
- **Ricerca**: qualsiasi cosa inerente (nome, lavoro, dentista, paziente, tipo) — la giusta **si accende** (anello+elevazione, L3), le altre si spengono.
- **Collocazione: HOME A DUE STANZE** (Pile ↔ Parete, swipe + dots + peek, TastoPiù in entrambe — emendamento §3.3/§7.1) **+ personalizzazione PER UTENTE**: «La tua home» = solo Pile / solo Parete / due stanze (default due stanze).
- **Raggiungibilità globale** (senza passare dalla home): route propria `/cassette` + shortcut PWA nel manifest + voce «Le cassette» in Tutto il resto (☰) + voce nel NavDesk e nelle rail desktop + ☰ nel chrome v3 standard delle pagine-lista (nasce con ondata A/B).
- **Requisito dati nuovo**: tabella cassette (nome, colore, posizione griglia, stato) + storico cassetta↔lavoro (serve anche a «Cerca» globale).
- **Percorso**: feature a sé, percorso formale completo (brainstorm ✓ → spec → panel advisor → piano → TDD). Sostituisce «parco cassette V2».

## Emendamenti spec v3 da incidere (in blocco, alla prima implementazione)
§5.8 targa-cassetta in riga 1 · §5.5 LinkQuieto esteso ad azioni rare quiete · §5.24 segnale trial ambra + gerarchia precedenza · §5.9 pill PRRC ✓ · §7.2/§6.1/§6.2 morte «Le pile» + back pila /dashboard · §7.16 riga «I tuoi dati» + preferenza «La tua home» · §3.3/§7.1 home a due stanze · §6.1 voce «Le cassette».

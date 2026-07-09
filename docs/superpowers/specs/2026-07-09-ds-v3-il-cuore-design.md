# DS v3 — Sotto-progetto 3 «Il cuore» — Spec di design

**Data:** 9 luglio 2026 · **Stato:** approvata da Francesco (brainstorming 09/07, blocco A + fix B + C1–C4)
**Legge madre:** `2026-07-07-design-system-v3-una-cosa-alla-volta.md` (§7.1–7.5, §14.3) — questa spec la attua e, dove indicato, la estende formalmente (§13.3 legge madre).
**Fondazione:** sessione decisionale a 3 advisor (UX di dominio · ricerca best practice 2024-26 · fattibilità dati nel codebase) — 09/07/2026.

---

## 1. Scopo e perimetro

Migrare a DS v3 le cinque superfici del «cuore»: **Home, pile aperte, wizard nuovo lavoro, scheda lavoro, flusso Consegna** — più la pagina **☰ «Tutto il resto»** (necessaria alla navigazione della home).

**Gate di chiusura (§14.3):** QA 3 viewport × 2 temi + collaudo Filippo (task-sentinella in §13).

**Muore in questo sotto-progetto:**
- Le 4 dashboard per ruolo (`DashboardTitolare/Tecnico/FrontDesk/Hybrid` + shell/KPI collegati)
- La BottomNavPill sulle pagine migrate
- La pagina intermedia `/lavori/[id]/consegna`
- Il form multi-tab `LavoroFormShell` (creazione E modifica)
- Le tab-filtro della lista `/lavori`

**Nasce:** Home v3 unica · 3 pagine-pila · wizard `/lavori/nuovo` · scheda lavoro v3 con modifica a sheet · flusso Consegna in-scheda · pagina ☰ «Tutto il resto».

**Route:** invariate (nessuna migrazione URL). Ogni pagina migrata si avvolge in `data-ds="v3"` con `background: var(--bg)` dipinto inline sul page-root (pattern catalogo; gotcha portali risolto nel sotto-progetto 2). Le sezioni non migrate restano v2.3 ai loro URL: è la convivenza per pagina prevista dalla legge §14, non un ponte.

---

## 2. Decisioni ratificate (09/07/2026, Francesco)

| # | Decisione | Origine |
|---|---|---|
| A1 | Home strutturalmente identica per tutti i ruoli; cambia solo il perimetro dati | 3 advisor convergenti |
| A2 | Mappatura stati→pile «le pile sono luoghi, non stati» (§4) | Advisor UX |
| A3 | Consegna: muore la pagina intermedia; precheck come eccezione (sheet), conferma come DialogConferma | Advisor UX + Baymard/ServiceTitan |
| A4 | La pila blu è la coda dei lavori incompleti nati dal wizard | Advisor UX + best practice «incompleti nella coda principale» |
| A5 | StrisciaStato a gerarchia fissa, una riga alla volta (§6) | Advisor UX |
| A6 | Wizard senza modifiche API: il client sintetizza `descrizione` e `data_consegna_prevista` | Fattibilità |
| C1 | Wizard a passi confermato (l'evidenza pro-form-compatto vale per conversione one-shot, non per gesto quotidiano a bersagli grandi) | Francesco |
| C2 | KPI titolare fuori dalla home; «I conti» e «Il mio compenso» → **sotto-progetto 4** (tracciati in §11) | Francesco |
| C3 | Il form multi-tab muore ORA: modifica per-riga via sheet + flussi ⋯ dedicati, nessun residuo v2.3 sulla scheda | Francesco (principio «niente ponti») |
| C4 | Annullo consegna 10 minuti + emissione fiscale trattenuta dentro la finestra | Francesco (dominio fiscale, sì esplicito) |
| B1-B3 | Fix server autorizzati (§10) | Francesco |

---

## 3. Home (`/dashboard`)

### 3.1 Contenuto (tutti i ruoli)
Eyebrow data + saluto orario (5-12 Buongiorno · 12-18 Buon pomeriggio · 18+ Buonasera) + ☰ · StrisciaStato · 3 Pile · TastoPiu. **Nient'altro, per legge** (§7.1 madre): nessun KPI, nessun banner.

### 3.2 Perimetri per ruolo
| Ruolo | Perimetro pile | StrisciaStato |
|---|---|---|
| `titolare` / `admin_rete` | tutto il lab | gerarchia completa (§6) |
| `tecnico` | solo i lavori assegnati a lui | senza segnali fiscali/pagamenti |
| `front_desk` | tutto il lab | parte dai segnali operativi (consegne/prove/arrivi) |
| ibrido (titolare+tecnico) | perimetro titolare | gerarchia titolare |

Il ruolo si legge come oggi in `dashboard/page.tsx` (server-side); il dispatch alle 4 dashboard viene sostituito da un'unica composizione con perimetro parametrico.

### 3.3 Vincolo no-scroll e variante device corti
La home non scrolla mai. Calibrata su 844×390. **Variante corta (viewport height ≤ 700px): numero display delle pile 52→44, gap compressi secondo una scala definita nel mockup di Ondata 0** — decisa ora, non improvvisata in QA.

### 3.4 Viewport
- **390:** colonna singola come da §7.1 madre.
- **768:** colonna singola centrata max 480 (le pile NON si affiancano — §12.2 madre).
- **1280:** la home come pagina sparisce → **nav a 3 pannelli** (§12.3 madre): nav 240px `--bg-deep` con badge numerici delle pile (Oggi / Sul banco / Appena arrivati / … sezioni), «+ Nuovo lavoro» (TastoPrimario H 52) in cima, footer StrisciaStato. Pannello lista 400px + pannello scheda. Tastiera: ↑↓ lista, Invio apre, `N` nuovo, `/` cerca.

### 3.5 Dati
Nuova funzione `getPileHome()` in `src/lib/dashboard/queries.ts` (server-side, `getServiceClient()`), riusando i pattern esistenti (`getFrontDeskDashboard()` copre già consegne-oggi e arrivi-oggi; `lavori.ora_consegna` ordina la pila rossa e alimenta il sub «il più vicino alle 16:00»). Nessuna API nuova. La cache KPI (`dashboard_kpi_cache`) NON serve alla home v3 (conteggi diretti, query leggere); resta viva per «I conti» (sotto-progetto 4).

---

## 4. Mappatura stati → pile (decisione di legge)

Principio: **le pile sono luoghi, non stati.** Rossa = deve uscire oggi · Ambra = in laboratorio · Blu = da confermare.

| Stato lavoro | Pila | Note UI |
|---|---|---|
| `ricevuto` non confermato | **Blu** | CTA «Conferma» sulla card (wizard di conferma: data proposta + minimi MDR) |
| `ricevuto` confermato, `in_lavorazione` | **Ambra** | ordinata per urgenza (data/ora consegna) |
| `pronto`, consegna ≤ oggi | **Rossa** | primo elemento porta TastoConsegnaInline |
| `pronto`, consegna futura | **Ambra** | pill `PRONTA ✓`; sale in rossa la mattina del giorno di consegna |
| `in_ritardo` + pronto | **Rossa**, in cima | PillTempo negativa: `DA IERI` / `−2 GIORNI` |
| `in_ritardo` + non pronto | **Ambra**, in cima | PillTempo rossa + segnale StrisciaStato |
| `sospeso` | **Ambra**, in fondo | pill **`FERMO`** (estensione vocabolario, v. sotto); StrisciaStato dopo 5 giorni («n.132 è fermo da 6 giorni») |
| `in_prova`, `in_prova_esterna` | **Fuori dalla home** | vivono in Agenda (RITIRO) + StrisciaStato il giorno del rientro; azione «È tornata» (v. §4.2) |
| `consegnato`, `annullato` | **Fuori** | ricerca, scheda dentista, Fatture |

- «Da consegnare oggi» significa **«va gestito oggi»**: i ritardi di ieri stanno in cima alla rossa, mai invisibili.
- **Estensione formale del vocabolario §5.9 madre:** si aggiungono `FERMO` (sospeso) e le PillTempo negative `DA IERI` / `−N GIORNI`. Registrate qui come revisione di legge (procedura §13.3 madre); il dizionario `src/design-system/v3/dizionario.ts` va esteso di conseguenza.
- **Nota modello dati (non in scope):** `in_ritardo` come *stato* è una condizione temporale ortogonale travestita da fase; la UI v3 lo risolve per sostanza. La deprecazione a livello dati è tracciata in §11.

### 4.1 Pila aperta (liste)
- Morph card→header (§8.3.1 madre; reduced-motion: crossfade 150ms). Titolo colore-famiglia + sub coi numeri utili.
- CardLavoro ordinate per urgenza (data+ora consegna asc; ritardi in cima). Max 4 righe per card (§5.8 madre).
- **RigaCerca in cima se la pila contiene >15 lavori.**
- Pila blu: card con CTA «Conferma».
- 768: lista pannello sinistro 360px + scheda a destra. 1280: pannello lista 400px, selezione inset ring 2.5 `--red`.

### 4.2 Azione «È tornata» (prove esterne)
Dalla scheda lavoro (e dall'Agenda quando migrerà), un lavoro `in_prova`/`in_prova_esterna` mostra TastoSecondario «È tornata» → stato torna `in_lavorazione` (transizione già esistente via PATCH stato) → il lavoro riappare in ambra. Senza questa azione le prove esterne diventano lavori persi.

---

## 5. Wizard «Nuovo lavoro» (`/lavori/nuovo`)

- **Passi:** 1 Dentista → 2 Tipo lavoro → 3 Paziente e dettagli (tutto opzionale, «Salta») → **Fatto!** Un lavoro DEVE nascere in 4 tocchi (§7.3 madre). Full-screen a tutti i viewport (L1).
- Morph dal TastoPiu (§8.3.2 madre) · progress dots · domanda token `question` 35/800 · PillVoce in ogni passo.
- **Passo 1:** TileScelta dentisti ordinati per frequenza (COUNT lavori ultimi 30 giorni, calcolo server-side in pagina) — max 4 tile + TileNuovo + RigaCerca.
- **Passo 2:** TileScelta tipi lavoro per frequenza (stessa logica su `tipo_dispositivo`).
- **Fatto!:** check grande + riepilogo + **consegna suggerita** con chip «Va bene ✓ / Decido dopo» + primario **«Fotografa impronta e prescrizione»** (la prescrizione è la scorciatoia MDR più potente: al banco la carta c'è già) + LinkQuieto home.
- **Consegna suggerita:** media server-side di `data_consegna_effettiva − data_ingresso` per `tipo_dispositivo` (lavori `consegnato` del lab). **Fallback:** se < 5 lavori consegnati per quel tipo → default hardcoded per tipo (tabella costanti in `src/lib/lavori/tempi-medi.ts`, valori proposti nel piano e validati con Francesco).
- **Nessuna modifica API:** il client sintetizza `descrizione` (= etichetta tipo dispositivo) e `data_consegna_prevista` (= suggerita; «Decido dopo» = suggerita comunque salvata, il lavoro nasce in pila blu dove la conferma la fissa). La route applica i suoi default (`stato:'ricevuto'`, `da_conformare:true`, …).
- **Persistenza abbandono:** stato wizard in localStorage 24h; alla riapertura del +: «Riprendo da dove eri? / Ricomincia».
- **PillVoce:** presente per legge in ogni passo; aspettativa calibrata — la voce compila testo libero e cerca dentista/tipo per nome, mostra cosa ha capito e chiede conferma. Progressive enhancement, mai percorso obbligato (evidenza JMIR: voice su dati strutturati non regge da sola).
- Il lavoro nato dal wizard entra in **pila blu** con badge «da confermare»; StrisciaStato incalza dopo 24h («3 lavori aspettano la prescrizione»).

---

## 6. StrisciaStato — gerarchia (una riga alla volta, tap = azione)

Priorità fissa; risolta una riga appare la successiva; **mai rotazione automatica**. `aria-live="polite"`.

| # | Segnale | Dato (verificato) | Ruoli |
|---|---|---|---|
| 1 | Fattura scartata da SDI | `fatture.stato_sdi ∈ {scartata, mancata_consegna}` (+ valori runtime del codice fattura, non solo CHECK schema) | titolare, front_desk |
| 2 | Consegna di oggi non pronta / lavoro in ritardo | pile + stati | tutti |
| 3 | Prova che rientra oggi / prova scaduta | stati `in_prova`/`in_prova_esterna` + date prova (campi tab Prove e/o `appuntamenti.lavoro_id` — fonte esatta fissata nel piano dopo verifica campi) | tutti |
| 4 | Arrivati da confermare > 24h | pila blu + `created_at` | tutti |
| 5 | Materiale rosso | `getMaterialiEsaurimento()` / RPC `articoli_sotto_scorta_minima` | titolare, front_desk |
| 6 | Lavoro fermo da ≥ 5 giorni | `sospeso` + timestamp | tutti |
| 7 | Pagamento scaduto | query pagamenti esistente (dashboard titolare) | solo titolare |
| 8 | Racconto automazioni («Stanotte ho preparato 2 DdC ✓») | eventi consegna/DdC | tutti |
| 9 | Tutto a posto ✓ | default | tutti |

**Escluso dalla v1:** «DdC da firmare» — il campo `firmata_at` esiste ma nessun flusso lo scrive; il workflow firma è tracciato in §11. Le segnalazioni non risolte (`lavori.segnalazione_*`) entrano nel segnale 2 quando riguardano lavori delle pile.

---

## 7. Scheda lavoro (`/lavori/[id]`)

- **Header:** TastoTondo back · `n.147` + PillStato · TastoTondo ⋯. Nient'altro.
- **Corpo:** CardInfo (4-5 RigheDato: dentista, paziente PZ, lavoro, consegna data+ora, tecnico) · NotaDentista (se esiste) · strip foto orizzontale (thumbnail 72, radius 12, max 1 riga) se presenti · CardFasi (RigheFase, una sola FATTA attiva) · **TastoPrimario CONSEGNA** (attivo solo con tutte le fasi fatte E stato `pronto`/`in_ritardo`; altrimenti presente ma disabled — MAI nascosto — con callout «Completa il controllo finale per consegnare», §5.1 madre).
- **Banner annullo** (se consegnato da <10 min): riga con countdown + LinkQuieto «Aspetta, annulla la consegna» (§9).

### 7.1 Modifica v3 (C3 — il form multi-tab muore)
- **Tap su una RigaDato → Sheet con quella sola domanda** (input §5.27 madre): data/ora consegna (CampoData + scelte rapide), tecnico assegnato (TileScelta), dentista (TileScelta + cerca), note. Salvataggio ottimistico via PATCH esistente (allowlist già in vigore), riconciliazione + Avviso su errore (L6).
- **Menu ⋯:** Prezzi e lavorazioni · Dati clinici · Prove · Foto · Documenti · Butta via (DialogConferma con oggetto esplicito). Ogni voce = flusso v3 dedicato (sheet o pagina piena `data-ds=v3`), che riusa le API esistenti dei tab attuali. **Nessun residuo v2.3 sulla scheda.**
- ⚠️ MDR: i dati clinici/di fase restano read-only nella scheda; si modificano SOLO nei flussi dedicati (§7.4 madre). I flussi ⋯ ereditano le validazioni server esistenti — nessun cambiamento alle API.
- 768/1280: la scheda vive nel pannello destro; sheet → pannello laterale 420px (§12.2 madre).

---

## 8. Flusso Consegna (sacro)

```
TastoPrimario CONSEGNA (scheda) ──┐
TastoConsegnaInline (pila rossa) ─┴→ precheck GET /precheck-materiali
    ├─ verde → DialogConferma «Corona n.147 al Dr. Esposito?» (dentista+numero in evidenza massima)
    │       → POST consegna → skeleton ≤3s → Consegnato! (coreografia §8.3.4 madre, picco sul suono ua)
    │       → CardUAHaFatto (SOLO cose realmente avvenute) + WhatsApp verde esplicito (mai auto-popup)
    │       → LinkQuieto «Aspetta, annulla la consegna» con countdown 10 min
    └─ rosso → Sheet «Prima di consegnare» con i SOLI bloccanti, ciascuno tappabile per risolvere
```

- Il TastoConsegnaInline appare **solo** su lavori `pronto`/`in_ritardo` e apre **sempre** la DialogConferma — mai orchestrazione diretta (2 tocchi distinti = consegna accidentale quasi impossibile; il rischio vero — card sbagliata — si mitiga con dentista+numero giganti nel dialog).
- Blocchi solo per requisiti normativi/verificabili (MDR, materiali); mai «Sei sicuro?» generici (Baymard/NN-g).
- Dopo l'invio a SDI l'annullo non c'è più: il LinkQuieto sparisce e l'eventuale richiesta spiega il limite (nota di credito).

---

## 9. Annullo consegna — 10 minuti + emissione trattenuta (C4)

- Finestra 5→**10 minuti**: `annulla-consegna/route.ts:6` + `AnnullaConsegnaBanner.tsx:6` (le due costanti convergono in una costante condivisa unica, es. `src/lib/consegna/costanti.ts`).
- **La fattura draft NON nasce più durante l'orchestrazione:** l'emissione fiscale è differita alla scadenza della finestra (job/cron o check lazy al primo accesso utile — decisione tecnica nel piano). Dentro i 10 minuti l'annullo non incontra mai documenti fiscali; la CardUAHaFatto dice «Fattura in preparazione» finché la finestra è aperta (L5: solo cose realmente avvenute).
- L'annullo ripulisce tutto ciò che l'orchestrazione ha prodotto (stato, DdC, tracciabilità già gestita) — con la fattura differita non resta nulla di fiscale da ripulire (chiude il gap B3).
- **Precondizione:** verifica sul DB reale della CHECK su `dichiarazioni_conformita.stato` (il codice scrive `'annullata'`, lo schema-snapshot ammette solo bozza/generata/firmata/consegnata — anomalia B2). Se la CHECK è stretta → migration correttiva PRIMA di toccare l'annullo (FASE 6b obbligatoria).

---

## 10. Modifiche server autorizzate (uniche — tutto il resto è UI)

| Fix | Cosa | Dove |
|---|---|---|
| B1 | Gate stato `pronto`/`in_ritardo` replicato server-side | `orchestraConsegna()` (`src/lib/consegna/orchestrate.ts`) — oggi il gate vive solo nella pagina |
| B2 | Verifica CHECK `dichiarazioni_conformita.stato` vs valore `'annullata'` | DB reale; eventuale migration correttiva |
| B3+C4 | Finestra 10 min + emissione fiscale differita post-finestra | route annulla-consegna, orchestrate.ts, banner |

Dominio critico (fiscale + consegna MDR) → percorso Grande BP-2, FASE 3 dichiarata, review rafforzata sull'ondata 4.

---

## 11. Fuori scope — tracciato (da riportare in ROADMAP)

| Voce | Destinazione |
|---|---|
| **«I conti»** — pagina KPI titolare v3 (margine, pagamenti scaduti, da fatturare; riusa `dashboard_kpi_cache`) | **Sotto-progetto 4** |
| **«Il mio compenso»** — vista tecnico (oggi in DashboardTecnico) | **Sotto-progetto 4** |
| Workflow firma DdC (`firmata_at` mai scritto) + segnale StrisciaStato «DdC da firmare» | Backlog dedicato |
| Deprecazione di `in_ritardo` come stato (condizione temporale, non fase) | Backlog dedicato (modello dati) |
| Migrazione Agenda (dove vivono le prove esterne come RITIRO) | Sotto-progetto 4 (l'azione «È tornata» nasce ora nella scheda) |

Nota: tra la sostituzione della dashboard (questo sotto-progetto) e il sotto-progetto 4, i KPI titolare non hanno una casa. Accettato esplicitamente da Francesco (09/07): la PWA non è distribuita, niente ponti.

---

## 12. Ondate di lavoro

| Ondata | Contenuto | Gate |
|---|---|---|
| **0 — Mockup** | 7 schermate (Home 390/768/1280 + variante corta · Pila aperta · Wizard 4 frame · Scheda lavoro · Sheet modifica · Consegna: dialog/sheet-bloccanti/Consegnato! · Tutto il resto) × 2 temi, in `docs/design/mockups/` | **approvazione Francesco schermata per schermata** |
| 1 — Home + pile | home, 3 pile, StrisciaStato, ☰ Tutto il resto | review + QA 3×2 |
| 2 — Wizard | wizard completo + tempi medi + persistenza 24h | review + QA 3×2 |
| 3 — Scheda lavoro | scheda + modifica sheet + flussi ⋯ + «È tornata» | review + QA 3×2 |
| 4 — Consegna | dialog/sheet + celebrazione + fix B1-B3/C4 | review rafforzata (dominio critico) + QA 3×2 |
| Gate finale | §14.3: QA complessiva + **collaudo Filippo** | v. §13 |

Worktree dedicato, TDD via `superpowers:subagent-driven-development`, workflow BP-2 percorso Grande. Carry-over obbligatori dal sotto-progetto 2: `minWidth: min-content` per colonne testo+pill · `suoniAttivi()` solo post-mount · sempre `varV3('card')`, mai `varV3('sfc')` · pattern "tab" nel dizionario · spec §9.1 estesa al `tap.wav` dei tasti fisici.

---

## 13. Collaudo Filippo (gate §14.3) — task-sentinella misurati

1. Nuovo lavoro reale in **≤ 4 tocchi** (dentista → tipo → conferma → fatto).
2. Consegna di un lavoro pronto in **≤ 3 tocchi dalla home** (pila rossa → TastoConsegnaInline → conferma).
3. «Dov'è il lavoro in prova dal Dr. X?» — risposta in **≤ 10s**; se esita > 5s sul *concetto* (non sulla UI), il buco delle prove va risolto in home, non in Agenda → riapertura decisione §4.
4. SUS breve a fine sessione.

---

## 14. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Regressione percepita dal titolare (KPI spariti dalla home) | Segnali *azionabili* (pagamento scaduto, fattura scartata, materiale rosso) vivono nella StrisciaStato; i contemplativi arrivano con «I conti» (sp. 4). Decisione esplicita di Francesco. |
| Pila ambra affollata (40+ lavori) | ordinamento per urgenza + RigaCerca in cima >15; il sub della pila mostra il prossimo vincolo, mai un riassunto |
| Consegna accidentale dalla lista | TastoConsegnaInline → sempre DialogConferma; solo primo elemento; dentista+numero giganti |
| Emissione differita: lavoro consegnato ma fattura mai emessa (crash/abbandono) | il meccanismo di differimento DEVE essere persistente e ripristinabile (non solo setTimeout in-process) — vincolo per il piano, FASE 3 |
| Home no-scroll rotta su device corti | variante corta definita in Ondata 0 (§3.3) |
| Web Speech instabile | PillVoce progressive enhancement, tastiera sempre primaria |

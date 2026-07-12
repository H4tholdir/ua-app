# DS v3 «Il cuore» — Ondata 2 «Wizard nuovo lavoro» — Spec di design

**Data:** 12 luglio 2026 (sera)
**Decisore:** Francesco Formicola
**Stato:** in revisione (gate spec)
**Fonti di verità:** legge madre `2026-07-07-design-system-v3-una-cosa-alla-volta.md` (v3.1, §7.3/§5.12-5.16/§5.27/§5.31/§5.32) · spec figlia `2026-07-09-ds-v3-il-cuore-design.md` §5 · mockup approvato `docs/design/mockups/2026-07-09-il-cuore/wizard.html` (fonte visiva) · decision record `docs/design/decisions/2026-07-09-il-cuore-mockups.md` (deviazione B7-2 ratificata: 3 tocchi, consegna risolta)

---

## 1. Scopo e perimetro

**Nasce:**
- Wizard «Nuovo lavoro» a 3 tocchi su `/lavori/nuovo` (route riscritta, full-screen a tutti i viewport — L1).
- Tassonomia granulare «tipi di lavoro» (`src/lib/domain/tipi-lavoro.ts`, ~38 tipi → 10 macro-slug).
- Macro-tipo nuovo `bite_splint` (unica migration dell'ondata).
- Componenti DS `ChipScelta` (§5.31) e `ProgressDots` (§5.32) + catalogo aggiornato.
- Tempi medi di consegna (`src/lib/lavori/tempi-medi.ts`: media reale + cascata di fallback).
- Persistenza abbandono 24h + sheet «Riprendo da dove eri?».
- Fotocamera in-wizard (foto impronta al Passo 3 e CTA finale «Fotografa impronta e prescrizione») — decisione D2.
- Sheet «Nuovo dentista» minimale nel Passo 1.

**Muore:** la pagina `/lavori/nuovo` v2.3 (form multi-tab in modalità creazione, `DISABLED_TABS` inclusi). `LavoroFormShell`/`TabDati` restano SOLO per la modifica su `/lavori/[id]` (muoiono in Ondata 3).

**Non cambia:** `POST /api/lavori` e ogni altra API (A6 rafforzato: il wizard usa POST lavori + PATCH lavori + POST pazienti + POST clienti + POST immagini, tutti esistenti) · Home/pile/StrisciaStato (il segnale 24h esiste già: `striscia.ts` s4 «aspetta conferma da ieri» → pila blu) · il lavoro nato entra in pila blu «da confermare» per costruzione (`stato:'ricevuto'`, A4).

---

## 2. Decisioni ratificate (12/07/2026, Francesco)

| # | Decisione | Origine |
|---|---|---|
| D1 | Ricerca approfondita con advisor specializzati sui tipi di dispositivi 2026 (eseguita: advisor odontotecnico + advisor UX quick-entry + explorer vincoli interni, 3 report convergenti) | Francesco |
| D1-bis | **Tassonomia granulare** come costante applicativa: tile = tipi granulari; `lavori.tipo_dispositivo` = macro-slug (CHECK intatto); `descrizione` = label granulare; `classe_rischio` = default per tipo; alias di gergo in ricerca | Francesco su sintesi 3 advisor |
| D1-ter | **Nuovo macro `bite_splint`** (migration additiva al CHECK + FASE 6b) — la famiglia bite/splint mancava dai 9 macro-tipi | Francesco |
| D2 | CTA «Fotografa impronta e prescrizione» = **fotocamera in-wizard** (input capture + `POST /api/lavori/[id]/immagini`), mai atterraggio sulla scheda v2.3 | Francesco |
| D3 | **Architettura A**: route `/lavori/nuovo` riscritta — RSC carica i dati, client component coi passi come stato interno + localStorage | Francesco |

Restano vincolanti dalla spec figlia: A4 (pila blu), A6 (zero API nuove), C1 (wizard a passi), B7-2 (percorso minimo 3 tocchi, consegna suggerita risolta senza chip), B4 (la data la decide il lab: suggerimento + «Cambia data»).

---

## 3. Tassonomia «tipi di lavoro» — `src/lib/domain/tipi-lavoro.ts`

### 3.1 Struttura

```ts
export type TipoLavoro = {
  id: string                    // slug granulare stabile, es. 'corona_zirconia'
  tile: { riga1: string; riga2?: string }  // due righe visive (sostantivo grande + qualificatore)
  aliases: string[]             // gergo di banco per la ricerca
  macro: TipoDispositivo        // uno dei 10 macro-slug → lavori.tipo_dispositivo
  classeRischio: ClasseRischio  // default MDR per tipo
  giorniFallback: number        // fallback tempi medi (v. §8)
}
```

Regole (dai 3 advisor, convergenti):
- **Il wizard scrive:** `tipo_dispositivo` = `macro` (il CHECK a DB sui macro-slug resta il gate; il join normativo `rischi_tipo_dispositivo`/DdC resta chiavato sui macro — `generate-ddc.ts:35-38` intatto) · `descrizione` = label granulare («Corona zirconia») · `classe_rischio` = `classeRischio`.
- **Ricerca** (`RigaCerca` e catalogo «Un altro tipo»): contains accent/case-insensitive su `riga1+riga2 + aliases + label macro`. Con ~38 voci + alias il contains basta (advisor UX: fuzzy solo oltre ~50 voci).
- **Il testo libero non genera mai tipi**: in fondo al catalogo «Non lo trovi? **Descrivilo**» → `macro:'altro'` + descrizione libera; non entra nel conteggio del top-4 (advisor UX: le frequenze non si inquinano).
- **Tile a due righe** (advisor UX): sostantivo grande + qualificatore piccolo t2 — mai la macro-categoria come testo sul tile.

### 3.2 Lista completa (DA VALIDARE al gate spec — Francesco può potare/aggiungere)

| id | Tile (riga1 / riga2) | Macro | Classe | GG | Alias principali |
|---|---|---|---|---|---|
| corona_zirconia | Corona / zirconia | protesi_fissa | IIa | 5 | cappetta, monolitica, zirconio |
| corona_disilicato | Corona / disilicato | protesi_fissa | IIa | 6 | emax, e.max, litio, pressata |
| corona_metallo_ceramica | Corona / metallo-ceramica | protesi_fissa | IIa | 7 | vmk, ceramica su metallo |
| ponte_zirconia | Ponte / zirconia | protesi_fissa | IIa | 6 | ponte monolitico |
| faccetta | Faccetta | protesi_fissa | IIa | 6 | veneer, faccette |
| intarsio | Intarsio / onlay | protesi_fissa | IIa | 4 | inlay, overlay |
| perno_moncone | Perno / moncone | protesi_fissa | IIa | 3 | perno fuso |
| protesi_totale | Protesi / totale | protesi_mobile | IIa | 8 | dentiera, completa |
| totale_digitale | Totale / digitale | protesi_mobile | IIa | 5 | totale fresata, stampata |
| parziale_resina | Parziale / resina | protesi_mobile | IIa | 6 | pa.pa., parziale |
| protesi_flessibile | Protesi / flessibile | protesi_mobile | IIa | 7 | nylon, valplast, morbida |
| duplicato_protesi | Duplicato / protesi | protesi_mobile | IIa | 4 | riserva, duplicazione |
| scheletrato | Scheletrato | scheletrato | IIa | 8 | parziale metallo, cromo |
| scheletrato_attacchi | Scheletrato / con attacchi | scheletrato | IIa | 10 | attacchi di precisione, fresaggi |
| scheletrato_slm | Scheletrato / laser (SLM) | scheletrato | IIa | 6 | laser melting, sinterizzato |
| scheletrato_peek | Scheletrato / PEEK | scheletrato | IIa | 8 | biohpp, metal-free |
| corona_impianto | Corona / su impianto | implantologia | IIa | 6 | avvitata, cementata, ti-base |
| ponte_impianti | Ponte / su impianti | implantologia | IIa | 8 | ponte avvitato |
| toronto | Toronto / full-arch | implantologia | IIa | 12 | toronto bridge, arcata completa |
| barra_overdenture | Barra / overdenture | implantologia | IIa | 10 | barra fresata |
| overdenture | Overdenture | implantologia | IIa | 10 | su locator, su sfere |
| abutment | Abutment / personalizzato | implantologia | IIa | 4 | moncone custom |
| provvisorio_impianto | Provvisorio / su impianto | implantologia | I | 3 | carico immediato |
| placca_espansione | Placca / con vite | ortodonzia | I | 7 | espansore mobile |
| apparecchio_funzionale | Apparecchio / funzionale | ortodonzia | I | 10 | bionator, twin block, monoblocco |
| contenzione | Contenzione | ortodonzia | I | 4 | hawley, retainer, splintaggio |
| allineatori | Allineatori | ortodonzia | I | 14 | mascherine, aligner |
| bite_michigan | Bite / rigido | bite_splint | I | 4 | michigan, placca dura |
| bite_morbido | Bite / morbido | bite_splint | I | 3 | resiliente, notturno |
| paradenti | Paradenti / sport | bite_splint | I | 4 | sportivo, mouthguard |
| anti_russamento | Anti- / russamento | bite_splint | I | 7 | mad, avanzamento mandibolare |
| provvisorio_resina | Provvisorio / resina | provvisorio | I | 2 | pmma, provvisori |
| provvisorio_cad | Provvisorio / CAD | provvisorio | I | 2 | fresato, stampato, shell |
| mockup | Mock-up / estetico | provvisorio | I | 4 | prova estetica, wax-up |
| dima_chirurgica | Dima / chirurgica | cad_cam | I | 5 | guida chirurgica, mascherina |
| modello_3d | Modello / 3D | cad_cam | I | 2 | modello stampato |
| riparazione | Riparazione | riparazione | IIa | 1 | rottura, frattura, aggiunta gancio, aggiunta elemento, saldatura |
| ribasatura | Ribasatura | riparazione | IIa | 2 | ribaso, rebase |

Note: classi da Allegato VIII Regola 5 (uso prolungato in cavità orale → IIa; temporaneo/rimovibile breve → I); riparazione/ribasatura ereditano IIa dal dispositivo su cui intervengono — **classi e giorni sono proposte da validare con Francesco**. Le voci accessorie (aggiunta elemento/gancio, saldatura) vivono come alias di `riparazione`, non come tile autonome.

### 3.3 Frequenze e top-4 del Passo 2 (e Passo 1)

- **Conteggio:** `COUNT` dei lavori del lab negli ultimi 30 giorni per `descrizione` = label granulare (match esatto — i lavori nati dal wizard matchano per costruzione). I lavori legacy non matchano: accettato, il top-4 converge con l'uso.
- **Riempimento:** se i tipi con count > 0 sono < 4, si completa con i canonici quotidiani (corona_zirconia, modello_3d, riparazione, provvisorio_resina).
- **Stabilità (advisor UX):** ordinamento per count desc, tie-break su ordine canonico della costante; il conteggio usa la finestra a granularità di giorno (stabile nell'arco della giornata). Isteresi avanzata/posizioni sticky → backlog.
- **Passo 1 dentisti:** stessa logica su `cliente_id` (COUNT 30gg), sub «N lavori · 30gg», top-4 + TileNuovo + RigaCerca sulla lista completa caricata server-side.

---

## 4. Migration `bite_splint` (unica dell'ondata — FASE 6b obbligatoria)

- `ALTER TABLE lavori DROP CONSTRAINT <check tipo_dispositivo> / ADD CONSTRAINT` con i 10 valori (i 9 attuali + `bite_splint`). Additiva: nessun dato esistente da migrare.
- Post-apply: `supabase gen types` + `tsc --noEmit` (FASE 6b) + verifica che nessuna RLS policy citi il CHECK (non risulta, da riverificare in piano).
- **Superfici label da estendere di +1 voce** («Bite / splint»): `TipoDispositivo` in `src/types/domain.ts` · `TIPO_OPTIONS` in `TabDati.tsx` (form di modifica, resta vivo fino a Ondata 3) · `TIPO_OPTIONS` portale `RichiestaClientForm.tsx` · `formatTipoDispositivo` in `qualita/rischi/page.tsx`, `qualita/rischi/[id]/page.tsx`, `DdcTemplate.tsx`.
- `rischi_tipo_dispositivo`: nessuna riga automatica — è per-lab e l'editor esistente già crea la riga al primo uso (pattern invariato).
- `listino.categoria` (CHECK con set diverso) NON si tocca: backlog.
- **Rollback:** revert del codice; il CHECK a 10 valori è innocuo anche senza codice che lo usa (si restringe solo quando non esistono più lavori `bite_splint`).

---

## 5. Architettura (D3 — approccio A)

- **RSC `src/app/(app)/lavori/nuovo/page.tsx` riscritta** (pattern Ondata 1: server carica, client compone). Carica in parallelo, scoped al lab:
  1. dentisti: lista completa `{id, label}` + count 30gg (top-4 derivato);
  2. frequenze tipi (count 30gg per descrizione, v. §3.3);
  3. prossimo codice PZ: max numerico dei `codice_paziente` a formato `PZ-\d+` del lab + 1, zero-padded a 4 (`PZ-0001` se nessuno);
  4. tempi medi per tipo (v. §8).
- **Client `WizardNuovoLavoro`** (`src/components/features/wizard/`): passi come stato interno (nessuna sub-route/searchParams), coreografia §8.3.3 (scivolata orizzontale, molla `wizard`, il passo precedente resta al 30% dietro; reduced-motion: crossfade 150ms). Entrata «sale come sheet» (§8.3.2 approssimata: il morph vero dal TastoPiù attraverso una navigazione di route non è realizzabile — ratifica implicita in D3). Wrapper `data-ds="v3"`, full-screen, max 480 centrato a 768/1280 (§12.2: L1 non si negozia col viewport).
- `isV3MigratedRoute` += `/lavori/nuovo` (match esatto, come le altre voci).
- Back del Passo 1 (TastoTondo ‹): torna alla home; lo stato resta salvato (v. §9).

---

## 6. I 5 frame (fonte visiva: `wizard.html`)

1. **Passo 1 «Per quale dentista?»** — ProgressDots (1/3) + domanda 35/800 + hint · TileScelta ×4 (avatar Ø60 iniziali su neutro, sub «N lavori · 30gg») + TileNuovo «＋ Nuovo dentista» + RigaCerca «Cerca fra tutti i N dentisti…» (risultati come TileScelta in lista, §5.13) + PillVoce. TileNuovo → **Sheet nuovo dentista**: CampoTesto nome + cognome (obbligatori per `POST /api/clienti`), studio e telefono opzionali; al salvataggio il nuovo dentista è selezionato e si avanza.
2. **Passo 2 «Che lavoro è?»** — dots (2/3, primo verde) · TileScelta ×4 per frequenza (glifo line-SVG §4.4 per famiglia macro — i glifi definitivi per-tipo sono backlog; MAI emoji) + «＋ Un altro tipo» → **catalogo completo** (lista raggruppata per famiglia + stessa ricerca + in fondo «Non lo trovi? Descrivilo» → `altro`+testo) + RigaCerca + PillVoce.
3. **Passo 3 «Chi è il paziente?»** — dots (3/3) · CampoTesto «Codice paziente» precompilato col prossimo PZ + nota GDPR («Nessun nome, solo il codice») · blocco «Se vuoi, aggiungi»: righe Elemento (es. 2.6 → `denti_coinvolti`, parse su virgole/spazi) e Colore (es. A2 → `colore_dente`) con «Salta» LinkQuieto, tap sulla riga → CampoTesto inline · riga dashed «Aggiungi la foto dell'impronta» (input capture, File in memoria) · TastoSecondario «Continua» (avanzamento NON rosso — fuori dal percorso minimo) · PillVoce.
4. **«Fatto!»** — check Ø92 verde + «Il lavoro è nato. Lo trovi fra gli “Appena arrivati”, da confermare.» · card riepilogo (RigaDato: Dentista / Lavoro=label granulare / Paziente) · card «Consegna suggerita» RISOLTA: «Pronta per **giovedì 16 luglio** — di solito ci mettete N giorni.» (fallback senza storia: «— tempo tipico per questo lavoro: N giorni.») + LinkQuieto «Cambia data» → **Sheet data** con **ChipScelta** rapide (Oggi · Domani · ‹suggerita› · Scegli…) + CampoData §5.27 → `PATCH /api/lavori/[id]` · TastoPrimario «Fotografa impronta e prescrizione» (D2: camera → upload → Avviso conferma, si resta sul Fatto; ripetibile) · LinkQuieto «Torna alla home». Suono `fatta` + vibrazione al mount del frame.
5. **Ripresa abbandono** — al mount della route con stato salvato < 24h: Sheet «Riprendo da dove eri?» con riassunto dinamico («**Corona** per il **Dr. Esposito**, ti mancava il paziente.») + TastoPrimario «Riprendi» + LinkQuieto «Ricomincia da capo» (che azzera lo stato).

I 3 tocchi del percorso minimo: tile dentista → tile tipo → «Fotografa impronta e prescrizione» (o «Torna alla home»). Il Passo 3 è interamente opzionale: «Continua» crea il lavoro col PZ proposto.

---

## 7. Sequenza di creazione (al «Continua» del Passo 3)

1. **Paziente:** lookup fra i pazienti del cliente (`GET /api/pazienti?cliente_id=`) — se il codice esiste si riusa `paziente_id`, altrimenti `POST /api/pazienti` `{cliente_id, codice_paziente, nome_cognome: codice}` (GDPR: mai nomi).
2. **Lavoro:** `POST /api/lavori` `{cliente_id, paziente_id, tipo_dispositivo: macro, descrizione: label granulare (o testo libero se «Descrivilo»), data_consegna_prevista: suggerita, classe_rischio}` — la route applica i suoi default (`stato:'ricevuto'`, `da_conformare:true`, numero via RPC).
3. **Dettagli opzionali:** se elemento/colore → `PATCH /api/lavori/[id]` `{denti_coinvolti, colore_dente}` (già in `PATCHABLE_FIELDS`).
4. **Foto Passo 3:** se presente → `POST /api/lavori/[id]/immagini`.

**Error handling (L6):** fallimento ai passi 1-2 → si resta sul Passo 3, Avviso errore persistente («Non sono riuscita a creare il lavoro. Controlla la connessione e riprova»), stato conservato, submit ri-tentabile (bottone disabled durante la chiamata — mai doppio POST). Fallimento ai passi 3-4 (accessori) → il lavoro È nato: si mostra Fatto! + Avviso «Non sono riuscita a salvare ‹dettagli/foto› — li aggiungi dalla scheda» (fail-soft, niente rollback). Il «Cambia data» che fallisce → Avviso errore, la suggerita resta.

---

## 8. Consegna suggerita — `src/lib/lavori/tempi-medi.ts`

- **Cascata:** (a) media di `data_consegna_effettiva − data_ingresso` sui lavori `consegnato` del lab con `descrizione` = label granulare, se ≥ 5 campioni; (b) altrimenti media sul macro `tipo_dispositivo`, se ≥ 5; (c) altrimenti `giorniFallback` della costante (§3.2).
- Data proposta = oggi + N giorni; se cade di **domenica → slitta a lunedì**.
- Copy: con storia reale «di solito ci mettete N giorni», col fallback «tempo tipico per questo lavoro: N giorni» (L5: mai fingere una statistica che non c'è).
- Calcolo interamente server-side nella page (nessuna API nuova).

---

## 9. Persistenza abbandono (localStorage, 24h)

- Chiave `ua:wizard-lavoro:v1` — payload `{ salvatoA, userId, labId, passo, cliente: {id,label}, tipoId, descrizioneCustom?, pz, elemento?, colore? }`. La **foto non si persiste** (File in memoria; perdita accettata e documentata).
- Guardie: `salvatoA` > 24h → si scarta; `userId`/`labId` diversi dall'utente corrente → si scarta (dispositivo condiviso). Il contenuto è comunque privo di dati personali (solo codici).
- Si scrive a ogni avanzamento/modifica di campo; si azzera su Fatto! e su «Ricomincia da capo».

---

## 10. PillVoce — scope Ondata 2

Componente già completo (§5.15, `onTesto`). Integrazione: il trascritto **compila la ricerca del passo corrente** (Passo 1: cerca dentista; Passo 2: cerca tipo — con gli alias di gergo la voce «corona zirconia» matcha) mostrando il testo capito nel campo e i risultati come tile — la conferma è il tap sul risultato (§5.15: mostra cosa ha capito e chiede conferma). Al Passo 3 compila il campo attivo (default: codice paziente). Progressive enhancement: se l'API non c'è, la pill non esiste. NLP multi-campo («corona per Esposito, consegna giovedì») → fuori scope, backlog.

---

## 11. Componenti nuovi

- **`ChipScelta`** (`src/components/ds/ChipScelta.tsx`, §5.31): min-height 48 · pill · 16/700 · `--card`+`--sh-press` · selezionata `--green-tint`+`--green`+check, senza ombra. Usata nello Sheet data (§6.4).
- **`ProgressDots`** (`src/components/ds/ProgressDots.tsx`, §5.32): Ø11 · gap 8 · upcoming `--line` · fatti `--green` · attivo 30px `--red` (unico rosso dei passi di scelta oltre al CerchioMic). `aria-label` «Passo N di 3».
- Entrambi entrano nel catalogo `/ds-v3-catalogo` (+2 sezioni) con test.

---

## 12. Validazione architetturale (FASE 3 BP-2)

| Domanda | Risposta |
|---|---|
| Tenant isolation / RLS | Nessuna modifica a RLS o `current_lab_id()`. Le query della page seguono il pattern Ondata 1 (scoping esplicito per `laboratorio_id`); le API usate hanno già i tenant-check FK. |
| Schema drift | SÌ: migration additiva CHECK `bite_splint` → FASE 6b obbligatoria (gen types + tsc), apply via `db push` con conferma esplicita di Francesco. |
| API contract | Nessun payload modificato. `bite_splint` passa nelle API esistenti (nessuna validazione applicativa dell'enum — il CHECK a DB è il gate). Client esterni: nessuno (PWA unica). |
| Rollback | UI: revert dei commit (la route torna al form v2.3). Migration: additiva e innocua anche orfana; restringimento solo quando non esistono lavori `bite_splint`. |
| Dominio critico | Migration presente → **percorso GRANDE** (già previsto: worktree dedicato, SDD, review per task + finale). Non tocca RLS/Stripe/FatturaPA/auth. |

---

## 13. Governance e gate

- **Emendamento legge madre §7.3** (primo task, come da prassi Ondata 1): percorso minimo **3 tocchi** (deviazione B7-2 ratificata — chip «Va bene ✓/Decido dopo» rimossi, consegna suggerita risolta + «Cambia data»), nota tassonomia granulare (tile = tipo granulare, la macro resta il dominio di `tipo_dispositivo`), frame 5 ripresa. §5.31/§5.32 restano invariate (già in legge).
- Workflow: worktree dedicato · SDD (`superpowers:subagent-driven-development`) · TDD · review per task + review finale whole-branch · QA browser 3 viewport × 2 temi su lab E2E (`00000000-…-0001`, MAI lab Filippo) · FASE 7 completa (tsc + vitest + build) · BP-1 a fine ondata.
- Carry-over di progetto: `varV3('card')` mai `varV3('sfc')` · suoni solo post-mount · motion SOLO da `v3/motion.ts` · `git rev-parse --show-toplevel` prima di ogni commit dei subagent.

---

## 14. Fuori scope → backlog (BACKLOG-TECNICO)

| Voce | Nota |
|---|---|
| Consolidamento delle 4-6 mappe label `tipo_dispositivo` sparse in un modulo unico | rilevato dall'explorer; oggi si aggiunge solo la voce `bite_splint` a ciascuna |
| `listino.categoria` + `bite_splint` (CHECK con set diverso: +`materiale`, −`provvisorio`) | allineamento in sessione dedicata |
| Isteresi/posizioni sticky avanzate del top-4 | v1: finestra 30gg a granularità giorno |
| Pipeline «promozione» dei testi liberi ricorrenti a tipi ufficiali | sensore dei gap di tassonomia (advisor UX) |
| NLP voce multi-campo | la voce v1 compila la ricerca del passo |
| Glifi line-SVG definitivi per-tipo (`src/design-system/glifi/`) | v1: glifo per famiglia macro |

---

## 15. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Migration CHECK su `lavori` (tabella calda) | additiva; l'`ADD CONSTRAINT` valida le righe esistenti (tutte già nei 9 valori — la validazione passa per costruzione), tabella di dimensioni contenute, lock breve; gate apply di Francesco via `db push` |
| Top-4 vuoto il primo giorno | riempimento coi canonici quotidiani (§3.3) |
| Camera su desktop | `input capture` degrada a file picker nativo — accettato |
| localStorage su dispositivo condiviso | guardia `userId`/`labId` + contenuto senza dati personali |
| Doppia creazione su retry | bottone disabled durante submit; il POST è unico e la route genera il numero via RPC race-safe |
| Lista 38 tipi sbagliata per il campo | tabella §3.2 esplicitamente DA VALIDARE da Francesco al gate spec (classi e giorni inclusi) |

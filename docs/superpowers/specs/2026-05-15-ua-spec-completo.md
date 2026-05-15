# UÀ — Specifica Completa di Prodotto
**Versione:** 1.1 — 2026-05-15 (post review Codex + Advisor)  
**Autore:** Francesco Formicola  
**Stato:** APPROVATO — pronto per implementation plan  
**Fonti:** Sessione brainstorming 14-15 maggio 2026 · Analisi DentalMaster (60 screenshot) · Ricerca competitor (OrisLab Q, OdontoSoft, ODIX, PrimoLab, Crownbeam) · Review Codex (CTO + MDR/Legale + SaaS) · Advisor review · Conferma Filippo Opromolla (anchor client)

---

## 0. Decisioni Architetturali — Già Prese (non riaprire)

| Decisione | Scelta | Motivazione |
|---|---|---|
| AI Assistant | **V2** — dopo stabilità V1 | Rischio MDR + reputazionale troppo alto senza base provata |
| Pricing base | **~€4X/mese** (piano già definito) | Piano pre-esistente confermato |
| AI add-on | **€24.90/mese** (in V2) | Margine 69-81%, scaglioni Stripe |
| Import dati | **Manuale/sartoriale** · una tantum | Servizio premium per lab, prezzo per sistema |
| Start tutti | **Da zero** · info import nell'app | Semplifica V1, import come revenue separata |
| Design system | **Clay Haptimorphism** (approvato) | DM Sans, #EDEAE6/#D90012, ombre calde dual-layer |
| Navigation | **A2 Floating Pill** (approvato) | FAB rosso 52px, scroll-hide, 5 tab |
| Card lavoro | **Card C timeline** (approvato) | 3 livelli disclosure, badge urgenza |

---

## 1. Visione del Prodotto

**UÀ** è la PWA SaaS mobile-first per laboratori odontotecnici italiani che automatizza tutto il "dopo" — la consegna, la conformità MDR, la fattura, l'archivio. Dal telefono. In pochi tap.

**Principio fondante:** dal momento in cui un odontotecnico inizia a usare UÀ, non deve preoccuparsi più di niente. Tutto automatico. Tutto dal telefono. In pochissimi tap.

**Posizionamento:** non competiamo su feature count con OrisLab Q. Competiamo su velocità, semplicità e zero attrito. Un tecnico di 55 anni che non ha mai usato un gestionale completa la prima consegna in meno di 60 secondi.

**Cliente anchor:** Filippo Opromolla · Serre (SA) · P.IVA 03508740655 · ITCA01051686  
**Secondo cliente:** Arturo Pepe · Angri (SA) · P.IVA 02330640653 · ITCA01050077

---

## 2. Stack Tecnologico (già implementato)

- **Frontend:** Next.js 16 · TailwindCSS · shadcn/ui · Motion/GSAP · Rive
- **Backend:** Supabase (PostgreSQL 15 + Auth + Storage + RLS)
- **Billing:** Stripe (subscriptions + webhooks + Customer Portal)
- **Deploy:** Vercel (CI/CD da GitHub Actions)
- **Auth:** WebAuthn passkey (Touch ID/Face ID) + email/password
- **PDF:** react-pdf (DdC + Buono consegna)
- **XML:** FatturaPA v1.2 generata server-side
- **Email transazionale:** PEC SMTP configurata per lab (credenziali vault Supabase)

---

## 3. Architettura Multi-tenant

- **RLS** su ogni tabella: `auth.current_lab_id()` · mai `auth.uid()` diretto
- **Ruoli RBAC:** `titolare`, `tecnico`, `front_desk`, `admin_rete`, `prrc`, `admin_app`
- **Tenant lifecycle:** trial → attivo → sospeso → scaduto · gestito da RLS + Stripe webhooks
- **Admin panel** `/admin`: solo Francesco · crea lab · gestisce stato · whitelist/blacklist

---

## 4. Modello di Servizio e Pricing

### 4.1 Piani SaaS — Pricing definitivo (già in produzione su Stripe)

| Piano | Mensile | Annuale | Risparmio |
|---|---|---|---|
| **Laboratorio** | **€49/mese** | **€490/anno** (= €41/mese) | €98 (-17%) |
| **Rete** PRO | **€149/mese** | **€1.490/anno** (= €124/mese) | €298 (-17%) |

**Stripe price IDs già configurati:**
- Lab monthly: `price_1TWCfaRsMhN7mg7YVt0UfeNB`
- Lab yearly: `price_1TWCfbRsMhN7mg7Y7Ejl1k5w`
- Rete monthly: `price_1TWCfbRsMhN7mg7YDXKFJkdN`
- Rete yearly: `price_1TWCfcRsMhN7mg7YBZSz1gId`

**Piano Laboratorio:** singolo lab · utenti illimitati · tutti i moduli operativi
**Piano Rete PRO:** più laboratori · admin panel centralizzato · report aggregati · fatturazione unica rete · contratto dedicato

**Trial:** 30 giorni gratuiti (default piano Lab)
**Start:** tutti i laboratori partono da zero (nessun dato pre-caricato)

**Billing page già implementata** (`/billing`) con 3 stati: `trial_expired` (piano selector + confetti oro), `expired` (rinnovo), `sospeso` (pagamento fallito).  
⚠️ La billing page richiede redesign con Clay Haptimorphism e va allineata ai nuovi flow (AI add-on, import service info).

### 4.2 Servizio Import Dati (una tantum)
- **Natura:** servizio manuale/sartoriale · non automatizzato
- **Come funziona:** Francesco (o team) esegue l'import manualmente per ogni lab che lo richiede
- **Prezzi per sistema di origine (da definire):**
  - DentalMaster Advanced (.US8 / FileMaker): €TBD
  - OdontoSoft: €TBD
  - ODIX: €TBD
  - PrimoLab: €TBD
  - Excel/CSV generico: €TBD (più basso)
- **Cosa si importa:** clienti/dentisti + listino lavorazioni (non storico lavori per default)
- **Info nell'app:** sezione "Importa da altro software" nell'onboarding wizard e nelle impostazioni

### 4.3 Setup iniziale e onboarding
- **Da valutare:** se assorbire il costo di onboarding assistito o fatturarlo (setup fee €TBD)
- **Criterio:** il LTV di un lab (~€4X × 36 mesi = ~€1.500+) giustifica un setup gratuito per i primi 20 lab
- **Dopo:** setup fee da definire quando la base è stabile

### 4.4 AI Assistant (V2 — non in scope V1)
- **Prezzo:** €24.90/mese add-on
- **Fair use:** 1.000 messaggi/mese inclusi
- **Extra:** +€11/ogni 1.000 messaggi aggiuntivi (Stripe metered)
- **Piano annuale:** €199/anno
- **Nota legale V2:** tutti i tool IA devono essere "trascrittori" (registrano ciò che l'utente dice) non "decisori" — per evitare classificazione MDR come software medico

---

## 5. Macchina a Stati del Lavoro

```
ricevuto → in_lavorazione → in_prova_esterna ⇄ in_lavorazione → pronto → consegnato
                ↓
          sospeso (da qualsiasi stato · in attesa istruzioni)
          annullato (motivo obbligatorio · se rifacimento: motivo='rifacimento' + parent_lavoro_id)
```

> ⚠️ FIX BLOCCANTE [1] — Stato clinico e stato fiscale sono dimensioni ORTOGONALI:
> - `lavori.stato` = stato clinico/logistico del dispositivo (indipendente dalla fattura)
> - `fatture.stato_sdi` = stato fiscale (indipendente dalla consegna)
> - `in_consegna_parziale` NON è uno stato del lavoro — è una combinazione: `stato=consegnato AND fattura.stato_sdi=scartata`
> - UI: banner rosso visibile quando `stato=consegnato AND fattura.stato_sdi IN ('scartata','errore')` con CTA "Correggi e reinvia FatturaPA"
> - Nessun nuovo enum → solo logica UI + query

> ⚠️ FIX [5] — Rifacimento da prova: il lavoro originale passa a `annullato` con `motivo=rifacimento`.
> - Foreign key bidirezionale: `lavori_rifacimenti.lavoro_originale_id ↔ lavoro_nuovo_id`
> - Il lavoro originale NON viene modificato/sovrascritto: la sua DdC (se già generata) rimane nell'archivio Storage come documento immutabile

**Enforcement:** CHECK constraint PostgreSQL sull'enum + transizioni validate lato API server. Transizioni non valide → errore 422. V2: tabella `lavoro_eventi` append-only per audit completo.

---

## 6. Flow Operativi — V1 Completo

### Flow 1 — Nuovo Lavoro (~60 secondi)
**Chi:** titolare · front_desk · tecnico

| Step | Azione | Campi | Auto |
|---|---|---|---|
| 1 | Apre form (tap FAB rosso) | — | — |
| 2 | Seleziona dentista | `cliente_id*` · nome · studio | tier prezzo |
| 3 | Inserisce paziente | `nome*` · 🎤 voce | codice GDPR |
| 4 | Tipo dispositivo (8 tile) | `tipo*`: fissa/mobile/implanto/CAD/schel/orto/riparazione/provvisori | — |
| 5 | Lavorazioni dal listino | `lavorazione_id*` · `qty*` · colore? · calo_grammi? · note? | prezzo da tier |
| 6 | Data consegna | `data*` · quick: oggi/domani/+3/+7 | — |
| 7 | Tecnico assegnato | `tecnico_id?` · reparto? | — |
| 8 | Allegati | foto? · STL? · nota vocale? | — |
| 9 | Note | note? · 🎤 voce | — |
| 10 | **CREA** | — | numero progressivo · push tecnico |

**Output:** lavoro creato · stato: ricevuto · numero 2026/XXXX

### Flow 2 — Tracking Produzione
**Chi:** tecnico assegnato

| Step | Azione |
|---|---|
| 1 | Dashboard → lavori assegnati a me · ordinati per urgenza |
| 2 | Apre lavoro → Tab "Fasi" |
| 3 | Segna fase completata: `fase_id*` · `tecnico_id AUTO` · `timestamp AUTO` · nota? · foto? |
| 4 | Segnala urgenza: tipo problema + nota vocale → push titolare |
| AUTO | 100% fasi → stato: pronto · push titolare/front_desk |

### Flow 3 — PROVE / Try-in
**Chi:** titolare · front_desk  
**Frequenza:** 20-40% lavori · 60-80% su mobile e implantare (da verificare con Filippo)

| Step | Azione | Campi |
|---|---|---|
| 1 | Manda in prova | `numero_prova*` · `data_prevista_rientro*` · istruzioni? |
| AUTO | Stato → in_prova_esterna | WhatsApp al dentista (template GDPR-safe) |
| 2 | Dentista fa la prova fisicamente | — |
| 3 | Registra rientro | `esito*` (OK/modifiche/rifare/sospeso) · note? · foto? · nuova_data? |
| AUTO | Routing per esito | OK→in_lavorazione · rifare→Flow 5 · sospeso→attesa |
| AUTO | Storico prove nel fascicolo | timeline prove con date e esiti |

**DB nuovo:** tabella `lavoro_prove` (id, lavoro_id, numero_prova, data_uscita, data_rientro_prevista, data_rientro_effettiva, esito, note_dentista, foto_url, created_by)

### Flow 4 — CONSEGNA GUIDATA (hero)
**Chi:** titolare · front_desk · stato lavoro: "pronto"

> ⚠️ Nota V1: si chiama "Consegna Guidata" non "1-tap magico" fino a stabilità dimostrata

| Step | Azione |
|---|---|
| 1 | Lavoro in stato "pronto" · tap → schermata Consegna |
| 2 | Riepilogo: dentista · paziente · lavorazioni · importo · data |
| AUTO | Precheck MDR (12 validazioni): ITCA · materiali+lotto · paziente · tipo dispositivo · lavorazioni · dentista P.IVA · data · numero DdC · prescrizione · conformità fornitore materiali · non conformità assenti · firma lab |
| 3 | Tap "CONSEGNA" (+ Touch ID opzionale) |
| AUTO | Genera in parallelo: DdC PDF (Allegato XIII) · Buono consegna PDF · FatturaPA XML v1.2 |
| AUTO | Upload Storage (10 anni) · PEC → SDI · WhatsApp link (template GDPR-safe, no dati clinici) |
| AUTO | Stato: consegnato · lock idempotenza · `consegna_in_corso` durante processo |
| 4 | Animazione successo + suono · bottom sheet: WhatsApp / Scarica DdC / Buono / Chiudi |

**Gestione failure:** se PEC fallisce → retry automatico 3 volte → alert titolare · stato rimane in_consegna_parziale fino a conferma PEC.

**WhatsApp template GDPR-safe:** "Lavoro #2026/0094 pronto. Clicca per i dettagli: [link portale token]" — nessun dato paziente/clinico nel messaggio.

### Flow 5 — Rifacimento / Non Conformità
**Chi:** titolare · tecnico

| Step | Azione | Campi |
|---|---|---|
| 1 | Rileva non conformità | `motivo*` · `quando_rilevato*` · foto? · costo_interno? |
| AUTO | Crea lavoro rifacimento | is_rifacimento=true · originale_id · pre-compilato |
| AUTO | Registra in incidenti_mdr | alimenta PSUR · alert PRRC se grave |

**Motivi:** colore sbagliato / misura errata / fusione difettosa / rottura / non confortevole (paziente) / errore prescrizione dentista / altro (testo libero)

**DB nuovo:** tabella `lavori_rifacimenti` (id, lavoro_originale_id, lavoro_nuovo_id, motivo, rilevato_in, costo_interno, created_by)

### Flow 6 — Fatturazione + SDI
**Chi:** auto alla CONSEGNA · manuale da /fatture

| Step | Azione |
|---|---|
| AUTO | Calcola: listino × tier cliente · bollo €2 se >€77,47 (con flag override) · natura N4 default (override manuale possibile) |
| AUTO | Tipo documento: TD01 default · TD02/TD04 manuale |
| AUTO | Genera XML FatturaPA v1.2 · nome: IT+CF+progressivo.xml |
| AUTO | Invia via PEC a sdi01@pec.fatturapa.it · stato_sdi: inviata |
| AUTO | Traccia 8 stati SDI · push se scartata/errore |
| 1 | Registra pagamento: data* · modalità* · importo_parziale? · riferimento? |

### Flow 7 — Scadenzario / Partitario
**Chi:** titolare (vista quotidiana)

- Auto-popolato ad ogni fattura emessa
- Dashboard OGGI sezione "Pagamenti scaduti"
- Estratto conto per cliente (storico fatture · pagamenti · saldo)
- Sollecito WhatsApp pre-compilato (template GDPR-safe: "Gentile Dott. X, ricordo fattura #N di €Y scaduta il Z" — no dati clinici)

### Flow 8 — Magazzino + Tracciabilità MDR
**Chi:** titolare · tecnico

| Step | Azione | Campi |
|---|---|---|
| 1 | Ricevimento materiale | articolo* · n_lotto* · data_scadenza* · qty* · fornitore? |
| AUTO | Alert scorta minima → dashboard OGGI |
| 2 | Consumo (V1: manuale; V2: auto da listino_materiali_auto) | — |
| 3 | Ordine fornitore | fornitore* · articoli+qty* · invio WhatsApp/email |

**DB nuovo (V2):** `listino_materiali_auto` · `ordini_fornitori`

### Flow 9 — Portale Dentista
**Chi:** dentista (esterno · no login)

1. Lab genera link token da scheda cliente (scade 30gg)
2. Condivide via WhatsApp (template GDPR-safe)
3. Dentista vede lavori aperti (stato · data · tipo · paziente codificato GDPR)
4. Scarica DdC PDF (accesso loggato per MDR)
5. Lascia feedback PMCF → alimenta PSUR automaticamente

### Flow 10 — Dashboard "OGGI" (3 versioni RBAC)
**Killer feature — primo schermo aperto ogni mattina**

**Titolare:** ritardi · consegne oggi · prove fuori (atteso rientro) · materiali mancanti · pagamenti scaduti (€tot) · fatturato mese vs prec.

**Tecnico:** miei lavori urgenti/ritardo · assegnati a me oggi · fasi da completare · miei in prova

**Front desk:** consegne di oggi (con dentista + orario) · ritiri attesi · in prova (rientro oggi) · da contattare (pagamenti)

### Flow 11 — Onboarding Nuovo Lab (wizard 6 step)
**Chi:** Francesco (crea) → titolare (completa)

1. Francesco crea lab da /admin → stato: trial
2. Email invito → titolare registra con passkey
3. Wizard step 1-3: dati lab (P.IVA, ITCA, indirizzo, codice ATECO 32.50.10) + logo + firma DdC
4. Wizard step 4-6: nomina PRRC + credenziali PEC SMTP + Stripe (trial 30gg attivo)
5. **Info import dati:** schermata dedicata "Vuoi importare da altro software? Richiedi il servizio →"
6. Lab operativo → dashboard pronta

### Flow 12 — PSUR + Incidenti + Rischi MDR
**Chi:** PRRC

- Dati accumulati automaticamente da ogni DdC + PMCF + incidente
- Segnalazione incidente: tipo · gravità · dispositivo · paziente pseudonimizzato
- PSUR PDF generato automaticamente (annuale)
- Reminder 30gg prima scadenza

---

## 7. Gap DB da Risolvere (V1 — TUTTI BLOCCANTI)

### Migration da creare (priorità assoluta)

```sql
-- 1. FIX BLOCCANTE: Form lavori/nuovo
-- Il campo cliente_id è già NOT NULL nella tabella lavori
-- Fix è nel frontend (aggiungere campo al form), non nel DB

-- 2. Colonne mancanti
ALTER TABLE fatture ADD COLUMN stato_sdi VARCHAR(20) DEFAULT 'draft';
ALTER TABLE fatture ADD COLUMN progressivo_invio INTEGER;
ALTER TABLE fatture ADD COLUMN progressivo_file VARCHAR(10);
ALTER TABLE fatture ADD COLUMN nome_file_xml TEXT;
ALTER TABLE fatture ADD COLUMN data_invio_sdi TIMESTAMPTZ;
ALTER TABLE fatture ADD COLUMN tipo_documento VARCHAR(4) DEFAULT 'TD01';

ALTER TABLE lavori_lavorazioni ADD COLUMN calo DECIMAL(8,3);
ALTER TABLE lavori_lavorazioni ADD COLUMN maggiorazione DECIMAL(5,2);
ALTER TABLE lavori_lavorazioni ADD COLUMN sconto DECIMAL(5,2);

ALTER TABLE lavori ADD COLUMN stato_fisico VARCHAR(30); -- in_lab, al_forno, al_cad, alla_ceramica, in_finitura

ALTER TABLE laboratori ADD COLUMN logo_url TEXT;
ALTER TABLE laboratori ADD COLUMN logo_print_url TEXT;
ALTER TABLE laboratori ADD COLUMN firma_ddc_url TEXT;
ALTER TABLE laboratori ADD COLUMN sfondo_ddc_url TEXT;

ALTER TABLE clienti ADD COLUMN prezzo_tier SMALLINT DEFAULT 1;

-- 3. Nuova tabella: macchina a stati
-- Aggiungere in_prova_esterna, sospeso, rifacimento, annullato all'enum stato lavori

-- 4. Nuove tabelle
CREATE TABLE lavoro_prove (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id),
  lavoro_id UUID NOT NULL REFERENCES lavori(id),
  numero_prova SMALLINT NOT NULL DEFAULT 1,
  data_uscita DATE NOT NULL,
  data_rientro_prevista DATE,
  data_rientro_effettiva DATE,
  esito VARCHAR(20), -- ok, modifiche, rifare, sospeso
  note_dentista TEXT,
  foto_url TEXT,
  created_by UUID REFERENCES utenti(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lavori_rifacimenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id),
  lavoro_originale_id UUID NOT NULL REFERENCES lavori(id),
  lavoro_nuovo_id UUID NOT NULL REFERENCES lavori(id),
  motivo VARCHAR(50) NOT NULL,
  rilevato_in VARCHAR(30), -- produzione, prova_1, prova_2, post_consegna
  costo_interno DECIMAL(10,2),
  created_by UUID REFERENCES utenti(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE listino_prezzi_tier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id),
  lavorazione_id UUID NOT NULL REFERENCES listino(id),
  tier SMALLINT NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 10),
  prezzo DECIMAL(10,2) NOT NULL,
  -- FIX BLOCCANTE [4]: laboratorio_id nel constraint per isolamento multi-tenant
  UNIQUE (laboratorio_id, lavorazione_id, tier)
);
```

---

## 8. Precheck MDR Consegna — 12 Validazioni

Per ogni consegna, verificare (con riferimento normativo):

| # | Campo | Riferimento | Blocca se |
|---|---|---|---|
| 1 | ITCA laboratorio presente | Reg. Min. Salute | mancante |
| 2 | Materiali con n° lotto associato | Art. 10(8) MDR | almeno 1 materiale senza lotto |
| 3 | Paziente identificabile (codice GDPR) | GDPR Art. 9 | mancante |
| 4 | Tipo dispositivo specificato | Allegato XIII §1 | mancante |
| 5 | Almeno 1 lavorazione associata | Allegato XIII §1 | nessuna lavorazione |
| 6 | Dentista/prescrivente con P.IVA o CF | Art. 2(1)(w) MDR | mancante |
| 7 | Data consegna coerente | — | nel futuro (consegna anticipata) |
| 8 | Numero DdC disponibile (progressivo) | Allegato IV §11 MDR | generazione fallita |
| 9 | Prescrizione ricevuta (flag) | Art. 2(1)(w) MDR | non confermata |
| 10 | Conformità fornitore materiali (flag) | Allegato I GSPR | non confermata |
| 11 | Nessuna non-conformità aperta | Sistema qualità | NC aperta non chiusa |
| 12 | Firma laboratorio configurata | Allegato XIII | logo/firma mancanti in impostazioni |

---

## 9. Compliance Normativa

### MDR 2017/745
- Protesi dentali = dispositivi medici su misura · Art. 2(3)
- DdC segue **Allegato XIII** (non Allegato IV che è per CE-marked devices)
- **8 elementi obbligatori** Allegato XIII (non 12 — quelli sono per CE-marked)
- PRRC nominato: `nomine_prrc` table (già implementata)
- PSUR annuale: `psur` table (già implementata)
- PMCF: feedback dentista via portale → alimenta PSUR
- Registro ITCA Ministero Salute: OBBLIGATORIO · sanzione €48.500 se assente
- Tracciabilità materiali: lotto su ogni DdC (obbligatorio)
- Conservazione documenti: 10 anni (impianti 15 anni)
- Non conformità: registrate in `incidenti_mdr` · contate nel PSUR

### FatturaPA
- Natura IVA: **N4** (Art. 10 n.18 DPR 633/72) — default protesi dentali
- Bollo: €2,00 se imponibile > €77,47 con IVA 0%
- Tipo documento: TD01 default · override manuale possibile (TD02, TD04)
- ProgressivoInvio: già gestito da `genera_progressivo(tipo='sdi_invio')` ✅
- Invio V1: PEC a sdi01@pec.fatturapa.it · V2: SdICoop SOAP
- Codice ATECO: 32.50.10 (aggiornato da 32.50.20)

### GDPR
- Pseudonimizzazione pazienti: codice GDPR generato automaticamente
- WhatsApp template: NO dati identificativi paziente (solo numero lavoro + link portale)
- Storage: dati sanitari EU-only · Supabase Frankfurt region
- Retention: 10 anni per MDR · override possibile per impianti (15 anni)
- Portale dentista: accessi loggati in `portale_accessi` table ✅

---

## 10. Design System (Approvato — Non Riaprire)

- **Stile:** Clay Haptimorphism (non neumorphism)
- **Sfondo:** `#EDEAE6` · Surface: `#F4F1EE` · Elevated: `#F9F7F5`
- **Testo:** `#1A1714` (primario) · `#6B6460` (secondario) · `#9C9490` (terziario)
- **Rosso brand:** `#D90012`
- **Ombre dual-layer:**
  ```css
  --sh-raised: -2px -2px 6px rgba(255,252,250,0.85), 3px 3px 8px rgba(168,150,140,0.28), 6px 6px 16px rgba(140,120,110,0.14);
  --sh-inset:  inset 2px 2px 5px rgba(168,150,140,0.22), inset -2px -2px 5px rgba(255,252,250,0.7);
  ```
- **Font:** DM Sans (tutto UI) · Playfair Display (SOLO numeri hero KPI)
- **Motion:** da `src/design-system/motion.ts` — mai hardcodare
- **Suoni:** success.mp3 · click.mp3 · snap.mp3 · chime.mp3

---

## 11. Servizio Import Dati — Info nell'App

### Dove mostrarlo
1. **Onboarding wizard** (step 5): "Hai dati in un altro software? Richiedici il servizio di import."
2. **Impostazioni → Importa Dati**: pagina dedicata con lista sistemi supportati e form richiesta
3. **Dashboard primo accesso**: banner one-time "Vuoi importare i tuoi clienti e listino da [DentalMaster/altro]?"

### Copy
```
Importa i tuoi dati da DentalMaster, OdontoSoft o altro sistema.
Ci occupiamo noi di tutto: estraiamo clienti, listino lavorazioni e — se necessario — lo storico lavori.
Servizio su richiesta · una tantum · preventivo gratuito.
→ [Richiedi import]
```

### Form richiesta
- Sistema di origine (dropdown)
- Dati da importare: clienti · listino · storico lavori · magazzino
- Upload file export (se disponibile)
- Note libere

---

## 12. V1 Go-Live — Cosa Deve Essere Pronto

### Bloccanti assoluti (senza questi non si lancia)
- [ ] Fix bug: `cliente_id` nel form `/lavori/nuovo`
- [ ] Migration: `fatture.stato_sdi` + `fatture.progressivo_invio` + `lavori_lavorazioni.calo`
- [ ] Creazione tabelle: `lavoro_prove` + `lavori_rifacimenti` + `listino_prezzi_tier`
- [ ] Enum `lavori.stato`: aggiungere `in_prova_esterna` · `sospeso` · `rifacimento` · `annullato`
- [ ] PEC SMTP configurata con Filippo (credenziali vault Supabase)
- [ ] Email templates Supabase: rebrand da "Supabase Auth" a "UÀ" (Reset + Invite)
- [ ] WhatsApp template GDPR-safe (no dati paziente nel messaggio)
- [ ] Laboratori: aggiungere campi `logo_url` + `firma_ddc_url`
- [ ] Precheck MDR espanso a 12 validazioni

### Funzionalità V1 complete
- [ ] Flow PROVE/Try-in (nuovo)
- [ ] Scadenzario UI (DB già pronto: `lavori_partitario`)
- [ ] Dashboard OGGI RBAC-aware (3 versioni)
- [ ] UI redesign Clay Haptimorphism su tutte le schermate
- [ ] Navigazione A2 Floating Pill implementata
- [ ] Consegna "Guidata" con precheck 12 validazioni
- [ ] Pagine dettaglio mancanti: `/pazienti/[id]` · `/magazzino/[id]` · `/fatture/[id]`
- [ ] Info servizio import nell'onboarding e impostazioni
- [ ] Backup automatico + banner rassicurazione ("backup ogni 6h")

---

## 13. V2 Espansione (dopo 20 lab attivi in produzione)

- AI Assistant "U" · Claude Sonnet 4 · 24 tool · voice continuous · tool come "trascrittori"
- Disclaimer MDR esplicito nel ToS AI
- Offline PWA (IndexedDB queue + sync)
- Ordini fornitori completi (`ordini_fornitori` table)
- Listino materiali auto-scarico (`listino_materiali_auto` table)
- Stato fisico lavoro in lab (campo `stato_fisico`)
- Tabella `lavoro_eventi` append-only per audit completo
- Import DentalMaster storico completo
- Analytics avanzate (statistiche multi-dimensionali)
- Firma digitale DdC

---

## 14. Vantaggi Competitivi da Proteggere

| Vantaggio | vs Competitor | Azione |
|---|---|---|
| **Consegna Guidata** | DM = 6+ click · altri = multi-step | Precheck robusto + UX infallibile |
| **WebAuthn passkey** | Nessun competitor | Non rimuovere mai |
| **WhatsApp nativo** | DM = messaging interno inusato | Template GDPR-safe · link portale |
| **SaaS zero-IT** | DM/ODIX = installazione per-PC | Onboarding wizard < 10 minuti |
| **PWA mobile-first** | Tutti desktop-first | Touch target 52px · voce · offline V2 |
| **Backup automatico** | DM ha avuto 4 crash documentati | Banner visibile · email conferma backup |

---

## 15. Misure di Sicurezza Obbligatorie

1. **RLS su ogni tabella** — nessuna eccezione · test RLS negativi su tutte
2. **No service role client-side** — mai esposto al browser
3. **WhatsApp template GDPR** — no nome paziente · no tipo dispositivo · solo numero lavoro + link
4. **AI tools V2** — nessun tool usa service role · allowlist per modalità autonoma · log completo
5. **Idempotenza consegna** — chiave unica `lab_id + lavoro_id + tipo_documento` · unique index DB
6. **PEC SMTP** — credenziali solo in Supabase Vault · mai in env plain text

---

---

## 16. Policy V1 — Issue Risolte Post-Review

### [2] Precheck MDR — Flag booleani con audit minimo
Validazioni 9 e 10 ("prescrizione ricevuta", "conformità fornitore") richiedono in V1:
- `set_by UUID` (chi ha spuntato il flag)
- `timestamp` (quando)
- V2: allegato/link evidenza + audit log immutabile

### [6] Backup e Disaster Recovery
- Piano Supabase: **Pro** (PITR 7 giorni + backup giornaliero)
- Export S3 giornaliero come secondo livello
- RPO target: 6 ore · RTO target: 2 ore (best-effort V1)
- Dichiarato nel ToS: "backup automatico, nessun SLA formale in V1"
- Comunicato nell'app con banner rassicurante (vantaggio vs DentalMaster che ha avuto 4 crash)

### [8] SLA V1
- Best-effort · supporto WhatsApp diretto Francesco · no garanzia uptime contrattuale
- Finestre manutenzione: comunicate 24h prima via email
- V2: SLA formale quando base ≥20 lab paganti

### [9] Sospensione Abbonamento + Retention MDR
- Lab sospeso/scaduto: blocco operazioni commerciali + read-only completo
- Dati MDR e PSUR: conservati 10 anni (impianti 15 anni) · export disponibile in ogni stato
- Cancellazione dati: solo dopo scadenza retention legale + richiesta scritta
- Dichiarato nel contratto di servizio

### [10] FIX BLOCCANTE — DPA per Import Sartoriale
L'import sartoriale coinvolge dati pazienti (GDPR Art. 9 — categoria speciale):
- **DPA (Data Processing Agreement)** firmato prima di qualsiasi import
- Ruoli privacy: Francesco = Responsabile del Trattamento · Lab = Titolare
- Accessi nominativi, logging, minimizzazione dati durante import
- Cifratura file sorgenti · cancellazione file entro 24h post-import
- Preferire formato pseudonimizzato (nomi pazienti → codici) anche nel file di import

### [A] Sicurezza Credenziali PEC (Advisor)
- PEC SMTP: Supabase Vault + cifratura applicativa con chiave per-lab
- Accessi vault loggati · nessun service role esposto al browser
- Idempotenza PEC: Message-ID deterministico `{lab_id}-{lavoro_id}-{timestamp_hash}`
- Prima di ogni retry: verifica via ricevuta PEC se messaggio già consegnato
- Senza idempotenza: 3 retry = 3 FatturaPA inviate a SDI → disastro fiscale

### [B] Validazione DdC PDF (Advisor)
- Test E2E che genera DdC reale e verifica presenza degli 8 elementi Allegato XIII
- Parsing del PDF generato per confermare: ITCA · lotto materiali · paziente · firma · data · numero progressivo · tipo dispositivo · dichiarazione conformità
- Eseguito in CI ad ogni modifica del template react-pdf

---

## 17. Pricing Completo — Confermato

| Bundle | Mensile | Annuale |
|---|---|---|
| Lab | €49 | €490 (= €41/mese) |
| Lab + AI (V2) | €73.90 | €689 (€490+€199) |
| Rete PRO | €149 | €1.490 (= €124/mese) |
| Rete PRO + AI (V2) | €173.90 | €1.689 (€1.490+€199) |

Stripe: 4 price ID già configurati in produzione (vedi §4.1). AI add-on: Stripe metered billing configurato in V2.

---

---

## 18. Criteri di Release — Quando Filippo può testare

**Decisione (2026-05-15):** Filippo testa solo quando la PWA è **completa e solida**. Nessun "MVP parziale" per raccogliere feedback. Il prodotto arriva a Filippo già testato da noi.

### Checklist Release Go/No-Go

**Funzionale (tutti i piani A-E completati):**
- [ ] Piano A: tutti i bloccanti DB risolti, bug cliente_id fixato, email brandate, WhatsApp GDPR-safe
- [ ] Piano B: flow PROVE + Rifacimento + Consegna 12 precheck + Scadenzario operativi
- [ ] Piano C: Dashboard OGGI RBAC con dati reali per tutti e 3 i ruoli
- [ ] Piano D: UI Clay Haptimorphism approvata su TUTTE le schermate (mockup → screenshot → ✓ Francesco)
- [ ] Piano E: suite test completa green (unit + E2E + RLS cross-tenant)

**Qualità:**
- [ ] Zero errori TypeScript (`tsc --noEmit` clean)
- [ ] Zero linting warnings (`npx eslint .` clean)
- [ ] Tutti i test E2E passano in CI (GitHub Actions verde)
- [ ] Test E2E coprono: crea lavoro, tracking fasi, prova, consegna, rifacimento, scadenzario
- [ ] Test RLS: utente Lab A non vede mai dati Lab B (verificato con 2 sessioni autenticate)
- [ ] Consegna guidata testata con dati reali Filippo (DdC genera correttamente con ITCA reale)

**Performance:**
- [ ] Dashboard si carica in <2 secondi su rete mobile 4G
- [ ] Consegna guiadata genera 3 PDF in <3 secondi
- [ ] Form nuovo lavoro risponde al touch in <100ms

**Sicurezza:**
- [ ] PEC SMTP credenziali Filippo configurate e testate con invio reale
- [ ] Email di test reset password e invite arrivano con branding UÀ corretto
- [ ] Nessun dato paziente in link WhatsApp generati (verificato con test unitario)

**Contenuto:**
- [ ] Lab Filippo e Lab Arturo nel DB con tutti i dati reali (P.IVA, ITCA, indirizzo)
- [ ] Listino Filippo importato (72 lavorazioni da DentalMaster)
- [ ] Almeno 5 clienti (dentisti) importati per Filippo
- [ ] Template DdC testato con un lavoro reale di Filippo

**Solo quando TUTTE le checkbox sono verdi → Filippo accede.**

---

*Spec v1.1 completata il 2026-05-15 — post review Codex (10 issue) + Advisor (3 issue aggiuntive).*  
*14 issue totali identificate: 4 bloccanti risolte, 6 derubricate con policy V1, 4 rimaste V2.*  
*Criteri di release aggiunti: Filippo testa solo quando tutto è completo e verde.*

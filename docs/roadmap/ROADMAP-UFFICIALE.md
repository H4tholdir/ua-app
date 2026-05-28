# UÀ — Roadmap Ufficiale
**Ultimo aggiornamento:** 28 maggio 2026
**Fonte di verità:** questo file + MEMORY.md + docs di pianificazione HTML

> ⚠️ Questo documento è la **fonte di verità unica** per le decisioni di roadmap.
> Aggiornarlo ad ogni sessione di lavoro.

---

## VERSIONE CORRENTE: V1.9.3 (in produzione)

V1.9.3 — Design System v2.3 implementazione completa (28/05/2026). Vedere MEMORY.md per dettaglio.

---

## ✅ Design System v2.3 — COMPLETATO (28/05/2026)

**Tutti i token DS v2.3 applicati all'intera PWA. Pre-commit guard attivo.**

- Spec: `docs/superpowers/specs/2026-05-27-design-system-v2-3.md`
- Token TS: `src/design-system/tokens.ts`
- Enforcement: `scripts/check-ds-compliance.sh` + `.husky/pre-commit`
- Pagine escluse: `src/app/(auth)/` (login/reset) e `src/app/admin/` (pannello admin)

---

## V1.9 — Completamento Pre-Collaudo
**Priorità:** Massima — da fare PRIMA che Filippo usi l'app seriamente.
**Stima:** 2-3 giorni di sviluppo

| # | Feature | Priorità | Stima | Stato |
|---|---------|----------|-------|-------|
| 1 | **Dettatura vocale** (Web Speech API) | P0 | 4h | ⏳ |
| 2 | **Email template branding** | P0 | 3h | ⏳ **← PROSSIMO** |
| 3 | **Rifacimenti UI** | P0 | 6h | ✅ Completato S2 |
| 4 | **Logo + firma DdC** | P0 | 4h | ⏳ |
~~5 Magazzino visivo → spostato in V2.0~~ |

---

## V2.0 — Post-Collaudo Filippo
**Priorità:** Alta — sviluppare dopo le prime 2-3 settimane di uso reale
**Trigger:** Filippo usa l'app quotidianamente e dà feedback reali

| # | Feature | Priorità | Note |
|---|---------|----------|------|
| 1 | **Portale dentista V2** | P0 | Comunicazione bidirezionale, ordine lavoro dal portale, download DdC |
| 2 | **Analytics avanzate** | P0 | Top clienti, margine per tipo dispositivo, lead time, tasso rifacimento |
| 3 | **Multi-tier pricing avanzato** | P1 | listino_prezzi_tier con assegnazione per cliente. Ora 4 tier, serve 6+ |
| 4 | **Dettatura vocale avanzata (Whisper)** | P1 | Whisper API OpenAI per accuracy su termini tecnici italiani (~€0.006/min) |
| 5 | **Sezione Rete funzionale** | P1 | Dashboard multi-lab per admin_rete. Architettura: reti + reti_members già in DB |
| 6 | **WhatsApp Cloud API ufficiale** | P2 | Notifiche automatiche (Meta Business + 360dialog/Twilio). Ora solo deep links |
| 7 | **Allegati clinici avanzati** | P2 | Note vocali (audio), file STL scansioni, PDF prescrizione digitale |
| 8 | **Log WhatsApp (agenda_messaggi_clienti)** | P2 | Tracciamento ogni messaggio mandato: data, testo, esito |
| 9 | **Magazzino visivo** (Mixel-inspired) | P2 | Concept C: tile 3 col, 12 glifo SVG, fill-bar semaforo. Toggle lista↔vetrina. Vedi `MAGAZZINO-VISIVO-BRAINSTORM.md` |

---

## V2.1 — AI Assistant
**Priorità:** Alta business value — pricing già pianificato
**Modello:** Stripe metered billing €24,90/mese (1.000 msg) + scaglioni

| # | Feature | Note |
|---|---------|------|
| 1 | **Voce continua** (stile ChatGPT) | Web Speech API V1 → Whisper V2 |
| 2 | **Chat AI** per inserimento dati | "Crea lavoro per Dr. Rossi, corona ceramica urgente" |
| 3 | **TTS risposta** | Web Speech Synthesis gratuita |
| 4 | **Smart routing modelli** | 40% Haiku 4.5 + 60% Sonnet = blended ~€0.008/msg |
| 5 | **Billing metered Stripe** | €24,90/mese base + €11 ogni 1.000 msg extra |
| 6 | **Caching prompt** | 8.000 token system cached → riduce costo input a $0.0024/msg |

---

## V2.2 — Compliance Avanzata MDR
**Trigger:** Se Filippo cerca certificazione ISO 13485 o ha clienti PA

| # | Feature | Note |
|---|---------|------|
| 1 | **CAPA** (Corrective and Preventive Action) | Link a incidenti/non conformità. ISO 13485 |
| 2 | **Fascicolo Tecnico MDR** | 6 tab: specifiche, FMEA, valutazione clinica, test, DdC, PSUR |
| 3 | **PMCF follow-up automatico** | Reminder 6/12 mesi post-consegna. MDR Art. 83 obbligatorio |
| 4 | **Firma Digitale P7M** | Per FatturaPA alla PA (Regioni, ASL). Richiede AgID |
| 5 | **Nota di credito XML (TD04)** | Per correggere fatture già emesse |

---

## V3.0 — Platform Scale
**Trigger:** Secondo cliente + espansione

| # | Feature | Note |
|---|---------|------|
| 1 | **Migrazione DentalMaster completa** | 30 anni storico. FileMaker fp7 → UÀ. Import batch |
| 2 | **Prescrizione digitale dentista** | Form digitale dal portale con firma digitale |
| 3 | **SDI diretto** | Senza PEC. Richiede accordi HUB SDI accreditato |
| 4 | **Terzismo inter-lab** | Lavori in subappalto tra laboratori della rete |
| 5 | **Onboarding self-service** | Nuovo lab si iscrive, paga Stripe, riceve seed automatico |
| 6 | **API pubblica** | Per integratori CAD/CAM, software clinici |
| 7 | **CAD/CAM integration** | Import STL nativi, link scansione digitale in Tab Clinica |
| 8 | **White label** | Lab con marchio proprio |

---

## DECISIONI ARCHITETTURALI PERMANENTI

| Decisione | Rationale |
|-----------|-----------|
| WhatsApp: solo `wa.me` deep links | ToS Meta-compliant. Cloud API solo se serve V2 |
| Tecnici: disattiva (non cancella) | Storico lavori collegato. `lab_memberships.attivo=false` |
| Fatture: generate durante `orchestraConsegna` | `incluso_in_fattura` = discriminatore. No fatturazione separata |
| Pazienti: pseudonimizzazione GDPR | Solo `codice_paziente`, mai nome in WhatsApp/portale |
| Push notifications: lazy-init VAPID | No crash build CI se chiavi mancanti |
| Stack voice V1: Web Speech API nativa | Zero costi. Whisper solo per V2 se serve accuracy |

---

## VANTAGGI COMPETITIVI UNICI (non toccare)

| Vantaggio | vs Competitor |
|-----------|--------------|
| 1-tap CONSEGNA (DdC+Fattura+Stock) | DentalMaster = 6+ click |
| Mobile-first PWA | OrisLab, OdontoSoft, ODIX = solo desktop |
| WhatsApp nativo | Tutti = messaggistica interna |
| WebAuthn passkey (Touch ID) | Nessun competitor |
| SaaS multi-tenant zero IT | Nessun competitor |
| GDPR pseudonimizzazione nativa | DentalMaster = zero |
| Portale dentista senza login | Nessun competitor |
| Numero progressivo DdC nativo | DentalMaster non ce l'ha |

---

## MAGAZZINO VISIVO — Feature Brainstorm (V1.9)
*Da espandere dopo ricerca Mixel — vedi docs/roadmap/MAGAZZINO-VISIVO-BRAINSTORM.md*

---

## STACK DI ORCHESTRAZIONE

Il progetto usa 3 orchestratori in layers:

| Orchestratore | Layer | Quando | Installato |
|--------------|-------|--------|-----------|
| **Superpowers** | Esecuzione TDD + subagenti | Sempre | ✅ (marketplace Anthropic) |
| **gstack** (Garry Tan, YC) | Decisioni strategiche (23 specialisti simulati) | Feature media/grande | ✅ `~/.agents/skills/gstack` |
| **GSD** (Lex Christopherson) | Stabilità spec multi-sessione | Feature grande (10+ file) | ⚠️ Procedurale (no SKILL.md) |

Procedura completa: `docs/processes/WORKFLOW-STANDARD.md`

---

## CHANGELOG ROADMAP

| Data | Modifica | Chi |
|------|----------|-----|
| 22/05/2026 | Documento creato da riconciliazione 6 file HTML + sessioni di sviluppo | Francesco + Claude |
| 22/05/2026 | V1.9 aggiunta (dettatura vocale, email template, rifacimenti UI, logo DdC, magazzino visivo) | Francesco + Claude |
| 22/05/2026 | Magazzino visivo: Concept C selezionato (Mixel-inspired, tile+glifo+fill-bar) | Francesco + Claude |
| 22/05/2026 | Stack orchestratori documentato: Superpowers + gstack + GSD | Francesco + Claude |
| 25/05/2026 | V1.9.1: S1 fix residui completati — badge LIVE rimosso, preferenza_dashboard toggle, Da fatturare lista inline | Francesco + Claude |

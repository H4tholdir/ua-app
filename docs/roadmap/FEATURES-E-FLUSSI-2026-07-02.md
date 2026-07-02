# UÀ — Inventario Completo Feature e Flussi
**Generato:** 2 luglio 2026 · Versione app: V1.9.3 (main, DS v2.3) · Fonte: struttura codice reale + 11 report di re-audit (`docs/audit-2026-07-02/`)
**Compagno di questo documento:** `BACKLOG-TECNICO-2026-07-02.md` (tutti i bug/gap con priorità). Qui sotto ogni feature marcata ⚠️/❌ rimanda all'ID del backlog tra parentesi.

Legenda stato: ✅ funzionante e verificato · ⚠️ parziale/con bug noto · ❌ mancante o rotto · 🚧 in roadmap, non iniziato

---

## 1. Panoramica moduli (16 moduli applicativi + auth + admin + portale pubblico)

| Modulo | Route base | Ruoli | Stato sintetico |
|---|---|---|---|
| Dashboard | `/dashboard` | Titolare, Tecnico, Front Desk (viste diverse) | ⚠️ funzionale ma hydration bug (A17) + dati scadenzario non riconciliati (B2) |
| Lavori | `/lavori`, `/lavori/nuovo`, `/lavori/[id]`, `/lavori/[id]/consegna` | Tutti | ⚠️ core solido, ma materiali/lotti MDR rotti (B1), cicli produzione non generano fasi per lavori nuovi (B3) |
| Clienti | `/clienti`, `/clienti/[id]` | Titolare, Front Desk | ⚠️ CRUD quasi completo, manca DELETE (M23) |
| Pazienti | `/pazienti`, `/pazienti/[id]` | Titolare, Front Desk | ❌ lista non navigabile, dettaglio irraggiungibile (B9) |
| Listino | `/listino` | Titolare | ⚠️ R/U/D ok, CREATE rotto (B8) |
| Magazzino | `/magazzino`, `/magazzino/[id]` | Titolare, Front Desk | ⚠️ CREATE rotto (B8), UPDATE assente da UI (M24) |
| Fatture | `/fatture`, `/fatture/[id]` | Titolare | ⚠️ lista + export CSV + batch ok, dettaglio senza azioni (M25) |
| Ordini | `/ordini` | Front Desk, Titolare | ⚠️ CREATE bloccato da API fornitori mancante (B10), query interna rotta ma mitigata (B16) |
| Agenda | `/agenda` | Tutti | ⚠️ solo lettura, zero navigazione verso lavori collegati (M26) |
| Qualità (MDR) | `/qualita`, `/qualita/incidenti`, `/qualita/psur`, `/qualita/rischi` | Titolare | ⚠️ incidenti/PSUR funzionano ma poco scopribili (M21), UPDATE rischi rotto (B8) |
| Scadenzario | `/scadenzario`, `/scadenzario/[cliente_id]` | Titolare | ❌ dati non allineati con dashboard (B2) — era il modulo migliore a maggio |
| Tecnici | `/tecnici`, `/tecnici/[id]/produttivita` | Titolare | ⚠️ gestione tecnici ok, invito completamente irraggiungibile (B7) |
| Rete (multi-lab) | `/rete` | Titolare/admin_rete | ❌ CTA principali portano a 404 (B8) — feature V2.0 ancora skeleton |
| Analytics | `/analytics` | Titolare | ⚠️ superficiale, solo 1 grafico aggiunto (A15) |
| Impostazioni | `/impostazioni`, `/impostazioni/pec`, `/impostazioni/profilo`, `/impostazioni/abbonamento` | Titolare | ⚠️ solide, ma bug banner trial/attivo (B15) |
| Onboarding | `/onboarding` | Nuovo titolare | ✅ wizard 6 step con skip espliciti su ITCA/PEC |
| Portale dentista (pubblico) | `/portale/[token]`, `/richiedi/[token]` | Dentista esterno (no login) | ⚠️ visualizzazione stato + richiesta funzionano, download documenti impossibile (B5), disconnessi tra loro (A7) |
| Auth | `/login`, `/invite/[token]`, forgot/reset password | Tutti | ⚠️ funzionale, bug autofill email su device condivisi (A3) |
| Admin (Francesco) | `/admin/labs` | admin_sistema | Non auditato in questo giro (fuori scope persona) |

---

## 2. Dettaglio per modulo

### 2.1 Lavori — il cuore del sistema
- **Creazione:** form monopagina con 2 step visibili (Dati, Accettazione MDR) — **semplificato rispetto a maggio** (era 9 tab, 7 bloccate). Validazione con auto-focus e messaggi specifici per campo. ✅
- **Odontogramma FDI:** SVG interattivo, tocco su singolo dente — presente ma isolato in TabClinica, raggiungibile solo dopo la creazione, nessun hint (A13). ⚠️
- **Tracciamento prove (1ª-4ª con esiti):** già solido dal 15/05 (numero_prova, esiti ok/modifiche/rifare/sospeso, date uscita/rientro) — **supera DentalMaster** (4 slot fissi vs iterazioni illimitate in UÀ). ✅
- **Fasi di produzione:** funzionano per i 277 lavori storici importati, ma **non vengono mai generate per lavori nuovi** (B3) — il tab "Produzione" è un vicolo cieco per l'operatività quotidiana futura. ❌
- **Materiali "da impiegare":** campo assente nel form; tracciabilità lotti strutturalmente rotta a valle (B1). ❌
- **Cassetta:** dato in DB, mai mostrato in lista (A14). ⚠️
- **Consegna atomica:** DdC + fattura + scarico materiali in un'unica azione — architettura solida, **soft-block + hard-block MDR ora implementati** (risolto rispetto a maggio, dettagliato in Flow Front Desk). ✅
- **Rifacimento:** RPC atomica `crea_rifacimento_atomico()`, bottom sheet con 7 motivi — completato a S2 (26/05). ✅
- **Urgenza:** badge pill "↑ Urgente"/"⚡ Extra urgente" visibili in lista. ✅
- **Cassetta/cicli produzione DentalMaster (136 protocolli importati):** disponibili come dati storici, non riutilizzabili operativamente per nuovi lavori (B3).

### 2.2 Clienti / Pazienti
- Clienti: CRUD quasi completo (manca DELETE, M23), DPA GDPR Art.28 generabile, token portale per condivisione.
- Pazienti: pseudonimizzazione GDPR corretta (solo `codice_paziente`), ma **la lista non porta al dettaglio** (B9) — funzionalità R/U/D presente ma invisibile all'utente.

### 2.3 Listino
- 4 tier prezzi, compenso tecnico ora visibile inline (fix di maggio confermato ✅). CREATE da UI rotto (B8), READ/UPDATE/DELETE funzionanti.

### 2.4 Magazzino
- Lotti, scorta minima, alert. CREATE da UI rotto (B8, redirect silenzioso), UPDATE assente da UI pur con API funzionante (M24).

### 2.5 Fatture
- Generate automaticamente in `orchestraConsegna`. **Fatturazione batch e export CSV per il commercialista ora implementati e funzionanti end-to-end** (miglioramento reale di questo periodo). ✅ Dettaglio fattura singola senza azioni (niente download PDF/XML, niente segna-pagata — M25). ⚠️

### 2.6 Ordini (fornitori)
- CRUD presente ma **CREATE bloccato**: l'endpoint fornitori manca, quindi il select fornitore è sempre vuoto (B10). Query interna con subquery non supportata, mitigata da fallback JS (B16).

### 2.7 Agenda
- Vista read-only, nessuna azione, nessun link verso il lavoro collegato (M26).

### 2.8 Qualità / MDR
- Incidenti: form creazione funzionante e validato, ma **irraggiungibile da qualsiasi punto della UI** (M21) — solo URL diretto.
- PSUR: CRUD funzionante.
- Rischi: lista ok, **modifica rotta** (404, B8).
- Nomina PRRC: presente.

### 2.9 Scadenzario
- Era il modulo con il punteggio più alto a maggio (9/10). Oggi **mostra dati incoerenti con la dashboard** sugli stessi crediti clienti (B2) — regressione più grave del periodo.

### 2.10 Tecnici
- Gestione, produttività, disattivazione (mai cancellazione) funzionanti. **Invito tecnico completamente irraggiungibile** (B7).

### 2.11 Rete (multi-lab, V2.0)
- Solo skeleton: le due CTA principali ("Crea rete", "Gestisci rete") portano a **404** (B8). Architettura DB (`reti`, `reti_members`) già pronta secondo roadmap, ma UI non funzionale.

### 2.12 Analytics
- Solo 6 KPI statici + 1 grafico "fatturato 12 mesi" aggiunto in questo periodo. Mancano margine, top-clienti, % rifacimenti, lead time (A15) — tutti già richiesti a maggio.

### 2.13 Impostazioni
- Dati laboratorio, PEC (con verifica email), profilo, abbonamento Stripe. Bug banner trial/attivo contraddittorio (B15). Marchio: upload logo/firma **solo visualizzazione**, nessun form di caricamento nella UI attuale (nota Odontotecnico) — il rendering nei PDF funziona già se i campi sono valorizzati via altra via.

### 2.14 Onboarding
- Wizard 6 step con skip espliciti su ITCA e PEC (miglioramento di questo periodo). Tasso di abbandono reale non ri-testabile (account già onboardato).

### 2.15 Portale dentista (pubblico, senza login)
- **Visualizzazione stato lavori:** funzionante, PHI minimizzata correttamente. ✅
- **Richiesta nuovo lavoro (`/richiedi/[token]`):** funzionante end-to-end, verificato con una richiesta reale in produzione (arriva via Supabase Realtime al laboratorio) — **ma preesisteva già a maggio**, non è un progresso di questo periodo. ✅
- **Download DdC/Buono:** strutturalmente impossibile, campi hardcoded a `null` (B5) — contraddice la promessa esplicita del messaggio WhatsApp. ❌
- **Navigazione incrociata portale↔richiedi:** assente (A7).
- **Notifiche proattive:** assenti in entrambe le direzioni (A8).
- **Aggiornamento in tempo reale:** assente lato dentista (solo lato laboratorio); il dentista deve ricaricare manualmente la pagina.

### 2.16 Design System v2.3
- Applicato con qualità alta su Dashboard, Clienti, Fatture, Impostazioni, Magazzino (rainbow KPI, Playfair Display, tasto+ fisico, dark mode flat) — **confermato visivamente**, non solo dichiarato. ✅
- **Claim "100% compliance" non verificato:** login WCAG-fail (B12), 2 violazioni residue in `qualita/page.tsx` (A6), migrazione palette solo parziale su molte pagine business (M6), colore bandito renderizzato su ogni card lavoro (B11).

---

## 3. Flussi per ruolo — cosa funziona end-to-end oggi

### 3.1 Titolare (Filippo)
| Flusso | Tap (oggi) | Stato |
|---|---|---|
| Vedere il fatturato del mese | 2-3 tap (dietro tab "Gestione business" + eventuale prompt biometrico) | ⚠️ funziona ma nascosto (M20) |
| Creare un lavoro completo | 7 tap | ✅ migliorato da maggio (era 8) |
| Trovare lavori pronti da fatturare | 2-3 tap (chip dashboard) | ✅ molto migliorato (era 6+) |
| Gestire scadenzario/solleciti | 1 tap ma **dati rotti** | ❌ regressione critica (B2) |
| Invitare un nuovo tecnico | irraggiungibile da UI | ❌ (B7) |
| Fatturazione batch + export commercialista | 2-3 tap, funzionante end-to-end | ✅ nuovo, funzionante |
| Vedere margine/redditività | solo in dashboard (a livello di codice, non verificato su dati reali), assente in Analytics | ⚠️ (A15) |

### 3.2 Tecnico
| Flusso | Stato |
|---|---|
| Dashboard "cosa fare oggi" (hero compenso, KPI urgenti) | ✅ invariato, punto di forza |
| Segnare fase completata / gestire prova | ✅ funzionante, ma nessuna CTA quando tutte le fasi sono complete (M12) |
| Ricevere notifica su rientro prova | ✅ **nuovo, funzionante** — push reale via VAPID |
| Ricevere notifica su nuova assegnazione lavoro | ❌ non collegata (A1) |
| Capire il significato delle transizioni di stato | ❌ nessun tooltip, componente già pronto ma non usato (M13) |
| Lavorare offline/rete lenta | ❌ errore nativo browser, nessun fallback (A2) |
| Login su device condiviso (tablet laboratorio) | ⚠️ bug autofill email tra account diversi (A3) |

### 3.3 Front Desk (Sara)
| Flusso | Stato |
|---|---|
| Accettazione lavoro con checklist MDR | ✅ **entrambi i fix critici di maggio applicati**: opzione "Non dichiarato" disinfettante + soft/hard-block MDR alla consegna, più rigoroso del richiesto |
| Upload foto impronta | ✅ upload concorrente (migliorato) |
| Consegna con dati MDR incompleti | ❌ ora bloccata correttamente (era il gap più critico di maggio, risolto) |
| Gestione ordini/magazzino | ⚠️ creazione ordine bloccata da fornitori mancanti (B10) |
| KPI fine giornata (accettati/consegnati oggi) | ❌ ancora assente (M18) |
| Haptic feedback su consegna riuscita | ❌ solo audio, non tattile (M17) |

### 3.4 Dentista esterno (cliente del laboratorio, via portale)
| Flusso | Stato |
|---|---|
| Vedere stato dei propri lavori | ✅ funzionante, PHI minimizzata |
| Richiedere un nuovo lavoro | ✅ funzionante end-to-end (preesistente) |
| Ricevere conferma della richiesta | ⚠️ solo a schermo nella sessione corrente, nessuna email (A8) |
| Scaricare la Dichiarazione di Conformità | ❌ strutturalmente impossibile (B5) — contraddice il messaggio WhatsApp del laboratorio |
| Passare da "vedi stato" a "fai una richiesta" senza un secondo link | ❌ portale e richiesta sono disconnessi (A7) |
| Sapere se il lavoro è "davvero partito" senza telefonare | ❌ stato generico "ricevuto", nessuna distinzione da lavoro inserito manualmente |

---

## 4. Confronto sintetico con DentalMaster (aggiornato al 02/07/2026)

Riferimento: `ANALISI/15_dentalmaster_funzionalita_complete.md` (analisi originale) + osservazioni dirette degli 11 agenti di questo re-audit.

**UÀ supera chiaramente DentalMaster su:**
- Mobile-first PWA (DentalMaster è desktop-only)
- Tracciamento prove iterate (illimitate vs 4 slot fissi)
- Soft/hard-block MDR alla consegna (DentalMaster non ha alcun blocco)
- WhatsApp nativo, fatturazione elettronica integrata, dashboard multi-ruolo RBAC
- WebAuthn passkey (nessun competitor italiano/internazionale analizzato ce l'ha)

**UÀ è ancora indietro rispetto a DentalMaster su:**
- Tracciabilità materiali/lotti nella Dichiarazione di Conformità: DentalMaster la fa manualmente ma la fa (vedi PDF reale in ANALISI/15 §8.5: "ZIRCONIA:2500090046, CERAMICA:15C0229"); UÀ oggi genera sempre una sezione vuota (B1) — **è un regresso funzionale su un punto specifico, non un semplice gap di modernità**.
- Cicli di produzione riutilizzabili come protocolli operativi: DentalMaster ha 136 protocolli attivi e utilizzabili; UÀ li ha importati come dati storici ma non li rigenera per lavori nuovi (B3).

**Nuovo dal confronto competitivo di mercato (vedi ricerca separata):** nessun competitor italiano (OrisLab Q, OdontoSoft, ODIX, X-Odonto) offre automazioni AI, WhatsApp Business nativo o un'architettura PWA-first — su questi assi UÀ resta unica sul mercato italiano. OdontoSoft è il competitor più vicino per portale dentista multi-ruolo e notifiche push native.

---

## 5. Come leggere questo documento insieme al backlog

Ogni ⚠️/❌ qui sopra ha un ID (es. B1, A5, M12) che rimanda alla scheda dettagliata con file:riga, causa e fix in `BACKLOG-TECNICO-2026-07-02.md`. Usa questo documento per capire **cosa esiste e come si comporta**; usa il backlog per sapere **esattamente cosa cambiare nel codice**.

# UÀ — Sistema di Memoria: Analisi e Architettura
**Data:** 22 maggio 2026 | **Versione:** 1.0

---

## 1. Diagnosi del Problema

### Il problema non è la cattura — è l'iniezione

Claude **non ha memoria nativa cross-sessione**. Ogni sessione inizia da zero.
I tre layer di memoria esistenti funzionano, ma nessuno inietta il contesto automaticamente
all'inizio di una nuova conversazione.

**Evidenza concreta:**

| Layer | Stato attuale | Funziona? |
|-------|--------------|-----------|
| MEMORY.md | Aggiornato manualmente, a volte dimenticato | Cattura: sì. Iniezione: solo se BP-0 viene eseguita |
| claude-mem | 51+ osservazioni registrate (17 mag → 22 mag 2026) | Cattura: sì, automatica. Iniezione: **mai** |
| graphify | Grafo 2140 nodi, aggiornato a ogni `git commit` | Cattura: sì. Iniezione: solo su query esplicita |

claude-mem sta registrando tutto: decisioni architetturali, bug fix, stati delle feature,
audit, deploy. Le osservazioni esistono nel database — Claude semplicemente non le vede
a meno che qualcuno non le carichi esplicitamente nel contesto.

### Il bug nell'hook attuale

Il `SessionStart` hook in `~/.claude/settings.json` è configurato con `"async": true`:

```json
"SessionStart": [{
  "hooks": [{
    "type": "command",
    "command": "bash /Users/hatholdir/.claude/auto-update-all.sh",
    "async": true   // ← QUESTO è il problema
  }]
}]
```

Un hook `async: true` gira in background. Il suo output **non viene mai iniettato**
come `additionalContext` nella sessione. Anche se lo script stampasse il contenuto di
MEMORY.md, arriverebbe troppo tardi o verrebbe ignorato.

Il `UserPromptSubmit` hook emette solo testo statico:
```
"MEMORY CHECK OBBLIGATORIO (BP-0): Prima di iniziare qualsiasi lavoro, leggi memory/MEMORY.md..."
```
Questo ricorda a Claude di andare a cercare il contesto, ma non lo carica. Claude deve
fare un tool call separato — e se lo salta (per fretta, per contesto lungo, per task
che sembra semplice), il contesto va perso.

---

## 2. Architettura Proposta

### 2.1 Tre livelli con responsabilità distinte

```
memory/
├── PINNED.md        ← EVERGREEN — non ruota mai, contiene solo
│                       decisioni permanenti, V2 backlog, anti-pattern
├── MEMORY.md        ← STATO CORRENTE — sprint attivo, azioni aperte
└── sessions/        ← ARCHIVIO — una entry per sessione significativa
    └── 2026-05-22.md
```

**PINNED.md** — Il documento che non si tocca quasi mai:
- Decisioni architetturali critiche (RLS, invite flow, rifacimento atomico, ecc.)
- Anti-pattern permanenti (MAI Inter, MAI gradiente viola-blu, MAI `redirect` nel layout)
- Backlog V2 (feature non implementate intenzionalmente)
- Credenziali/ID di riferimento (lab Filippo UUID, Stripe price IDs, ecc.)

**MEMORY.md** — Lo stato dello sprint corrente:
- Versione attuale + changelog recente
- Azioni aperte urgenti
- Bug noti non ancora fixati
- Prossimi task

**sessions/** — Archivio automatico:
- Creato automaticamente a fine sessione da Claude
- Permette di recuperare il contesto di una sessione specifica se serve

### 2.2 Hook UserPromptSubmit — iniezione reale del contesto

Sostituire l'hook attuale in `~/.claude/settings.json` con uno che inietta il contenuto
reale, non solo un reminder:

```json
"UserPromptSubmit": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "node /Users/hatholdir/.claude/hooks/inject-ua-context.js",
        "timeout": 8
      }
    ]
  }
]
```

Il file `/Users/hatholdir/.claude/hooks/inject-ua-context.js`:

```javascript
#!/usr/bin/env node
// inject-ua-context.js — inietta contesto UÀ a ogni prompt
// Output: JSON con hookSpecificOutput.additionalContext
// Requisito: sincrono, max 8 secondi

const fs = require('fs');
const path = require('path');

const MEMORY_PATH = '/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/memory/MEMORY.md';
const PINNED_PATH = '/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/memory/PINNED.md';

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function buildContext() {
  const parts = [];

  // 1. PINNED.md — sempre presente se esiste
  const pinned = readFile(PINNED_PATH);
  if (pinned) {
    parts.push('=== DECISIONI PERMANENTI (PINNED.md) ===');
    parts.push(pinned.slice(0, 3000)); // max 3k chars
  }

  // 2. MEMORY.md — sezione 0 (stato) + sezione delle azioni aperte
  const memory = readFile(MEMORY_PATH);
  if (memory) {
    parts.push('\n=== STATO PROGETTO (MEMORY.md) ===');
    // Estrai solo fino alla sezione 3 (le prime ~80 righe di solito)
    const lines = memory.split('\n');
    const cutoff = lines.findIndex(
      (l, i) => i > 20 && l.startsWith('## 3.')
    );
    const excerpt = cutoff > 0
      ? lines.slice(0, cutoff).join('\n')
      : lines.slice(0, 80).join('\n');
    parts.push(excerpt);
  }

  return parts.join('\n\n');
}

const context = buildContext();

if (context) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: context
    }
  }));
} else {
  // Output vuoto = nessun contesto iniettato, sessione continua normalmente
  process.exit(0);
}
```

**Perché funziona:**
- È sincrono (nessun `async: true`)
- L'output JSON con `additionalContext` viene iniettato come context prima che Claude
  elabori il prompt
- Legge solo file locali — nessuna dipendenza da MCP o rete
- Fallisce silenziosamente se i file non esistono

**Nota su claude-mem:** claude-mem non ha un CLI (`claude-mem --help` restituisce
"not found"). L'interrogazione delle osservazioni è possibile solo via MCP tools
dall'interno di una sessione Claude. Non può essere automatizzata in uno script shell.
Questo significa che le osservazioni di claude-mem sono accessibili come secondo
livello — Claude le interroga quando serve, ma non vengono pre-caricate automaticamente.

---

## 3. Procedure Operative

### 3.1 All'inizio di ogni sessione

Con il nuovo hook, il contesto viene iniettato automaticamente. Non serve fare nulla.

Se si vuole approfondire il contesto storico (sessioni precedenti, decisioni architetturali
specifiche), Claude può interrogare claude-mem esplicitamente:

```
"Cerca nelle osservazioni claude-mem: [argomento]"
```

### 3.2 Durante la sessione

Nessuna procedura obbligatoria. claude-mem registra automaticamente le osservazioni
(titolo, fatti, file letti, file modificati) tramite il plugin haiku.

### 3.3 A fine sessione

**Obbligatorio (5 minuti):**

1. Aggiornare `memory/MEMORY.md` con:
   - Nuova versione e data
   - Azioni completate rimosse dal backlog
   - Nuove azioni aperte aggiunte
   - Bug fix e decisioni architetturali documentate

2. Se la sessione ha prodotto decisioni **permanenti** (nuovi pattern, nuovi anti-pattern,
   nuovi ID di sistema), aggiornare `memory/PINNED.md`.

**Opzionale:**
Salvare un riassunto della sessione in `memory/sessions/YYYY-MM-DD.md`.

**Commit format per fine sessione:**
```
chore(memory): update MEMORY.md v1.8.0 — collaudo Filippo, PEC aperta
```

---

## 4. Template per le Osservazioni claude-mem

claude-mem genera osservazioni automaticamente. Quando si vuole aggiungere
manualmente un'osservazione critica (decisione architetturale, gotcha, fix non ovvio):

```
/observation_add con:

title: "Descrizione breve e cercabile"
subtitle: "Impatto concreto di questa decisione"
facts: [
  "Fatto 1 — specifico e verificabile",
  "Fatto 2 — con codice o path se rilevante",
  "Fatto 3 — conseguenza pratica"
]
narrative: "Spiegazione del PERCHÉ questa decisione esiste.
  Cosa non funzionava prima. Cosa succede se si sbaglia."
concepts: ["gotcha", "how-it-works", "problem-solution"]
project: "SOFTWARE FILIPPO"
```

**Esempi di osservazioni ad alto valore:**
- Ogni volta che si trova un `// ← NON usare X, usa Y` nel codice
- Ogni volta che una migration fallisce per un motivo non ovvio
- Ogni volta che un pattern del design system viene violato e poi corretto
- Ogni decisione che ha richiesto più di 30 minuti per essere raggiunta

---

## 5. PINNED.md — Da Creare Subito

Il file `memory/PINNED.md` non esiste ancora. Va creato con il contenuto evergreen
estratto da MEMORY.md (sezioni 5, 6, 9) e da CLAUDE.md.

Contenuto minimo:

```markdown
# UÀ — Decisioni Permanenti (PINNED)
Queste informazioni NON cambiano tra sprint. Aggiornare solo
quando cambia l'architettura fondamentale.

## Decisioni Architetturali Critiche
- RLS: public.current_lab_id() — NON auth.current_lab_id()
- Invite flow: token custom /invite/[token] — NON inviteUserByEmail Supabase
- Tecnici: NON si cancellano — lab_memberships.attivo = false
- Rifacimento: RPC atomica crea_rifacimento_atomico() — MAI 3 INSERT separati
- Onboarding: NO redirect('/onboarding') nel layout — solo banner dashboard
- PATCH API: sempre allowlist esplicita, mai blocklist
- WhatsApp: deep links wa.me — MAI open-wa (ToS violation)
- Fatture: generate durante orchestraConsegna. incluso_in_fattura = discriminatore
- PEC Vault: upsert_pec_vault_secret + get_pec_vault_secret solo service_role
- Push: VAPID keys in .env.local, tabella push_subscriptions, SW ua-v2
- ESLint CI: --max-warnings 0 (zero warning = zero compromessi)
- no-unescaped-entities: OFF per pdf/** (templates PDF React)

## Anti-Pattern Permanenti (Design)
- MAI Inter → DM Sans per tutto il testo UI
- MAI gradiente viola-blu
- MAI #0F1E52 / #1B2D6B come background (solo cobalt per nav pill active)
- MAI shadow cobalt/haptimorphic
- MAI duration: 0.3 inline → usare src/design-system/motion.ts
- MAI tabella full-width su mobile → card + accordion
- MAI modal centrato su mobile → bottom sheet
- MAI più di 3 KPI above the fold su mobile

## Normativa (non toccare senza leggere ANALISI/17)
- DdC MDR: Art. 52(8) + Allegato XIII (NON Allegato IV)
- FatturaPA: natura N4 · bollo €2 se > €77,47
- EUDAMED: lab custom-made = ESENTI (MDCG 2021-13 Rev.1)
- ITCA: OBBLIGATORIO (campo laboratori.codice_itca, sanzione €48.500)

## ID di Sistema
- Supabase project: iagibumwjstnveqpjbwq
- Lab Filippo: 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c · ITCA01051686 · Serre SA
- Lab Arturo Pepe (test): 314cd040-0893-4e9d-9ad8-786e4eefd75f
- Stripe Lab monthly: price_1TWCfaRsMhN7mg7YVt0UfeNB
- Stripe Lab yearly: price_1TWCfbRsMhN7mg7Y7Ejl1k5w
- Stripe Rete monthly: price_1TWCfbRsMhN7mg7YDXKFJkdN
- Stripe Rete yearly: price_1TWCfcRsMhN7mg7YBZSz1gId

## Backlog V2 (feature NON implementate intenzionalmente)
- Sezione /rete multi-lab (architettura multi-tenant da progettare)
- PMCF follow-up automatico (email automation avanzata)
- STS XML export (solo se fattura diretta al paziente)
- Firma digitale P7M (richiede integrazione AgID)
- CAPA ISO 13485 (solo se Filippo richiede certificazione)
- SDI diretto (richiede accordi con HUB SDI)
- WhatsApp Cloud API ufficiale (deep links wa.me già sufficienti)
- Nota di credito XML TD04 (raro, gestibile manualmente)
```

---

## 6. Riepilogo — Cosa Cambia Dopo Questo Documento

| Cosa | Prima | Dopo |
|------|-------|------|
| Contesto all'avvio sessione | Nessuno (async hook, nessun inject) | Automatico via UserPromptSubmit hook sincrono |
| Decisioni permanenti | Sparse in MEMORY.md + CLAUDE.md | Centralizzate in PINNED.md |
| Stato sprint | MEMORY.md (a volte dimenticato) | MEMORY.md (più snello, rotante) |
| Osservazioni claude-mem | Catturate ma mai consultate | Catturate + consultabili su richiesta |
| graphify | Aggiornato a ogni commit, usato poco | Invariato — disponibile per query semantiche sul codice |
| Sforzo di Francesco | Ricordare di ricordare a Claude | Aggiornare MEMORY.md a fine sprint |

**Il problema fondamentale (Claude inizia ogni sessione da zero) non cambia** — è un
limite architetturale del LLM. Quello che cambia è che il contesto critico arriva
automaticamente, senza che Francesco debba ricordarsi di fornirlo.

---

## 7. Passi Immediati

1. **Creare `memory/PINNED.md`** con il contenuto della sezione 5 di questo documento
2. **Creare `/Users/hatholdir/.claude/hooks/inject-ua-context.js`** con il codice
   della sezione 2.2
3. **Aggiornare `~/.claude/settings.json`**: sostituire l'hook `UserPromptSubmit`
   statico con quello che punta allo script
4. **Snellire `memory/MEMORY.md`**: spostare il contenuto evergreen (sezioni 5, 6, 9)
   in PINNED.md; MEMORY.md deve contenere solo lo stato corrente (versione, azioni aperte)
5. **Testare**: aprire nuova sessione Claude Code nel progetto ua-app e verificare
   che il contesto venga iniettato senza bisogno di chiedere

**Tempo stimato: 20 minuti.**

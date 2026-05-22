# Prossima Sessione — Piano Operativo
**Data prevista:** appena Francesco vuole
**Contesto:** Sessione nuova e pulita. Il hook inject-ua-context.js fornirà automaticamente PINNED.md + MEMORY.md.

---

## Obiettivo Sessione

Ri-auditare la PWA UÀ con lo stesso framework multi-agente della sessione precedente (21/05/2026), usando il nuovo workflow BP-0+BP-1+BP-2+gstack+Superpowers, per:
1. Misurare i miglioramenti reali (score pre vs post)
2. Identificare i problemi che Francesco ha notato esplorando la PWA
3. Definire il piano esatto di fix per V1.9

---

## Come Iniziare la Sessione

Francesco: apri una nuova sessione Claude Code e scrivi semplicemente:

```
Facciamo il re-audit della PWA UÀ. Stesso framework di prima: 
11 agenti specializzati in parallelo, poi orchestratore, poi Codex adversarial.
Prima però dimmi cosa hai notato esplorando la PWA — voglio catturare 
i problemi reali che hai visto tu prima di fare l'audit automatizzato.
```

Il hook inietterà automaticamente tutto il contesto (PINNED.md + MEMORY.md con la tabella score precedenti).

---

## Struttura della Sessione

### Fase 1: Input di Francesco (10 min)
Francesco descrive cosa ha notato esplorando la PWA:
- Problemi grafici specifici
- Flussi che non funzionano
- Cose che sembrano strane o poco chiare

Questi input vengono catturati come "findings di un utente reale" e alimentano l'audit.

### Fase 2: Re-Audit Multi-Agente (parallelo, ~20 min)
Stessi 11 agenti della sessione precedente, con:
- I report dei fix già applicati come contesto
- Le osservazioni di Francesco come input aggiuntivo
- Score confrontati con i precedenti

Agenti da ridispacciare:
1. Odontotecnico esperto (target: 8.5+)
2. Titolare laboratorio (target: 8.5+)
3. Dentista esterno (target: 6.5+)
4. PWA Engineer (target: 9+)
5. Designer UI (target: 9.5+)
6. UX Expert (target: 8.5+)
7. Software Engineer (target: 9+)
8. Flow Titolare (target: 8+)
9. Flow Tecnico (target: 8.5+)
10. Flow Front Desk (target: 9+)
11. Sistematico 31 pagine (target: 9+)

### Fase 3: Orchestratore + Codex Adversarial
Sintesi dei report → piano prioritizzato → Codex adversarial review

### Fase 4: Piano V1.9 definitivo
Sulla base dei risultati, lista precisa e ordinata delle cose da fare.

### Fase 5: Implementazione con nuovo workflow
Per ogni fix: FASE 0 (BP-0) → FASE 1 (goal) → FASE 2 (brainstorm) → ... → FASE 11 (BP-1)

---

## Score Precedenti vs Target

| Agente | Score 21/05 | Target V1.9 | Fix già applicati |
|--------|-------------|-------------|-------------------|
| Odontotecnico | 7.5 | 8.5+ | Prove UI, BOM, disinfettante |
| Titolare | 6.5 | 8.5+ | Batch fatture, margini, CSV |
| Dentista | 5.0 | 6.5+ | Portale share, push trigger |
| PWA Engineer | 7.8 | 9+ | Splash, push, viewport-fit |
| Designer UI | 9.2 | 9.5+ | Dark mode 27 file |
| UX Expert | 6.8 | 8.5+ | Wizard, validation, empty states |
| Software Eng. | 7.2 | 9+ | GSAP, security, error bounds |
| Flow Titolare | 6.5 | 8+ | Batch, margini, refresh |
| Flow Tecnico | 7.5 | 8.5+ | Push rientro prova |
| Flow Front Desk | 7.8 | 9+ | Disinfettante, CRUD |
| Sistematico | 7.3 | 9+ | Skeletons, error.tsx, DELETE |
| **MEDIA** | **7.1** | **8.8+** | |

---

## Note per il nuovo Claude

- **BP-0**: MEMORY.md e PINNED.md già iniettati automaticamente dall'hook — non c'è bisogno di rileggerli a mano
- **BP-2**: per ogni fix usa il workflow 11 fasi in CLAUDE.md
- **gstack**: installato in `~/.agents/skills/gstack` — usare `/gstack plan-eng-review` prima di ogni fix architetturale
- **Audit docs**: i 13 report precedenti sono in `docs/audit-2026-05-21/`
- **Comparazione**: usa questi report come baseline per i nuovi

---

*Documento creato 22/05/2026 — da leggere all'inizio della prossima sessione*

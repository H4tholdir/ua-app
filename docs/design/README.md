# UÀ — Design Permanente

**REGOLA ASSOLUTA:** Tutte le decisioni di design e i mockup HTML vanno qui.
**MAI /tmp/** — i file in /tmp vengono cancellati e le decisioni si perdono.

---

## Struttura

```
docs/design/
├── mockups/          ← file HTML dei mockup approvati (da aprire nel browser)
│   └── YYYY-MM-DD-nome-feature.html
├── decisions/        ← decisioni testuali e changelog visivi
│   └── YYYY-MM-DD-nome-feature.md
└── README.md         ← questo file
```

## Workflow obbligatorio per ogni UI

1. Crea mockup in `docs/design/mockups/YYYY-MM-DD-nome.html`
2. Screenshot con Playwright → salva in `docs/design/mockups/screenshots/`
3. Approvazione Francesco → scrivi decisione in `docs/design/decisions/YYYY-MM-DD-nome.md`
4. Implementa React fedele al mockup approvato
5. Screenshot finale → aggiungi a `decisions/` come "before/after"

**Non chiudere mai un task di design senza che le decisioni siano qui.**

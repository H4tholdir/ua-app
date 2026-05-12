# UÀ — Regole di Organizzazione del Progetto
## Lezioni da Archibald: mai più il caos

---

## Il Problema Archibald

Il progetto Archibald ha accumulato:
- 200+ screenshot di debug nella root (`agenda-desktop-01.png`, `wizard-final.png`, ecc.)
- 30+ log file (`backend-fresh-start.log`, `frontend-syncbars.log`, ecc.)
- File di analisi sparsi (`*.md` di debug in root)
- File checkpoint (`*-checkpoint.log`)
- Test scripts in root (`test-01-delivery-picker.png`, ecc.)

**Risultato:** repo illeggibile, git history inquinato, impossibile trovare i file importanti.

---

## Regola 1: Zero File Temporanei in Root

```
❌ VIETATO in root o in src/:
  screenshot-debug.png
  test-result.json
  analysis-temp.md
  backend-fix.log
  checkpoint.log

✅ DOVE METTERE:
  /tmp/                    ← sistema OS (cancellati al reboot)
  scripts/tmp/             ← script temporanei (in .gitignore)
  docs/                    ← documentazione permanente
```

---

## Regola 2: Screenshot Solo in public/

```
✅ Screenshot legittimi:
  public/screenshots/          ← screenshot per il marketplace PWA
  public/icons/                ← icone app
  public/animations/           ← .riv, .lottie

❌ MAI screenshot di debug/sviluppo in git
```

---

## Regola 3: Log Mai in Git

```
❌ VIETATO committare:
  *.log, *.log.*, logs/

✅ Log durante sviluppo:
  Console del terminale (non salvare su file)
  .claude-flow/logs/        ← Ruflo li gestisce (in .gitignore)
```

---

## Regola 4: Un File, Una Responsabilità

```
src/components/features/    ← UN componente per file
src/hooks/                  ← UN hook per file
src/lib/                    ← utility condivise
src/design-system/          ← SOLO tokens, mai componenti qui
```

**Niente file "utils.ts" monolitici con 500 funzioni.**

---

## Regola 5: Documenti di Analisi Fuori dal Repo

```
Analisi → ../ANALISI/*.md          ← FUORI dal repo ua-app
Docs tecnici → docs/*.md           ← DENTRO il repo, pochi file

docs/
  PROJECT_ORGANIZATION.md         ← questo file
  SETUP.md                        ← come avviare il progetto
  ARCHITECTURE.md                 ← decisioni architetturali
  API.md                          ← endpoint Supabase/Edge
  DEPLOYMENT.md                   ← come fare deploy
```

---

## Regola 6: Branches

```
main          ← produzione — solo da PR
develop       ← staging — merge delle feature
feature/X     ← nuova feature (es. feature/lavori-crud)
fix/X         ← bug fix (es. fix/rls-dashboard)
chore/X       ← cleanup, deps (es. chore/update-motion)
```

**Niente commit diretti su main.**

---

## Regola 7: Commit Discipline

```
✅ BUONO:
  feat(lavori): add ConsegnaButton with Rive state machine
  fix(db): correct progressivo_ddc unique constraint
  chore(motion): centralize duration tokens

❌ CATTIVO:
  fix
  update
  wip
  test commit
  aggiunto roba
```

---

## Regola 8: Ruflo Workflows (non reinventare)

```
Nuovo feature:
  1. ruflo task create "Feature: [nome]"
  2. Lavora con Claude Code nel contesto del task
  3. ruflo task complete

Debug:
  1. Usa /systematic-debugging skill
  2. Documenta fix in commit message
  3. Non lasciare file di debug in giro
```

---

## Regola 9: Aggiornamento CLAUDE.md

**Dopo ogni sessione di sviluppo significativa:**
```
/revise-claude-md    ← usa questa skill per aggiornare CLAUDE.md
```

I CLAUDE.md devono restare sincronizzati con lo stato reale del progetto.

---

## Regola 10: Review Prima del Merge

```
Prima di merge su main:
  1. /code-review    ← skill code review
  2. /security-review ← solo se tocchi auth/db/api
  3. Test: npm test
  4. Build: npm run build (deve passare senza errori)
```

---

## Struttura Finale del Repo

```
ua-app/
├── .claude/               ← Ruflo + skills + hooks
├── .claude-flow/          ← Ruflo runtime (in .gitignore)
├── docs/                  ← docs tecniche (max 5-6 file)
├── public/                ← assets statici (non screenshot debug)
├── scripts/               ← script utility
│   └── tmp/               ← temp scripts (in .gitignore)
├── src/                   ← tutto il codice
│   ├── app/
│   ├── components/
│   ├── design-system/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── supabase/              ← migrazioni DB
├── tests/                 ← test file
├── .env.example           ← template env (MAI .env.local in git)
├── .gitignore             ← pulito e completo
├── CLAUDE.md              ← istruzioni per Claude Code
├── next.config.js
├── package.json
└── tailwind.config.js
```
